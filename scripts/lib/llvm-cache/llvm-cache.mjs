// A lease on twinBASIC's LLVM cache server: a tool that builds with LLVM acquires one and releases it; the library starts the server when none answers.
//
//   import { acquireLlvmCache } from "./llvm-cache.mjs";
//   const lease = await acquireLlvmCache({ install: "C:/.../twinBASIC_IDE_BETA_1010", threads: 4 });
//   try { ...builds... } finally { await lease.release(); }
//   // lease: { pipe, serverPid, started, release() }
//
// How it works (r19a; facts marked "997, v5" were probed on BETA 997's server, see probe.mjs and README.md):
//   - The server (<install>\bin\twinBASIC_win64.exe --threads=<n> --keepalive=0 --cache=1) registers on a machine-wide pipe whose name is read
//     from the install's twinBASIC_win64.dll (else _win32.dll) as UTF-16 text, never written down here.
//   - It counts its clients itself. A client registers by writing 36 bytes to the pipe (two GUIDs and a pid, little endian) and reading a
//     4-byte reply (the server's pid). The server counts the registered PROCESSES, not the connections (997, v5): with --keepalive=0 it ends
//     15 s after the last registered process has ended. There is no counter and no daemon here.
//   - acquire: if no pipe answers, start the server (under a lock the kernel frees when its holder dies, so that two acquirers start one),
//     wait for the pipe, then register a holder process of the lease's own. release: ends the holder (see "the holder" below).
//   - The server is started from the calling process, detached, hidden, stdio ignored, never through a launcher that puts it in a job.
//   - Any server on the install's pipe is used, whatever install it runs from: the pipe name defines the protocol (the user, 2026-10-17).
//     `ownInstallOnly` refuses one of another install.
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const PIPE_PREFIX = "twinBASIC.LLVMCache.Registration.v";

// ---- the pipe's name ------------------------------------------------------------------------------------------------------

/** `\\.\pipe\twinBASIC.LLVMCache.Registration.v<n>` from the install's compiler DLL (win64, else win32); throws when neither holds it
 * (.code "NO_CACHE_SERVER": the install predates the LLVM cache server, as BETA 957 and 974 do) or neither exists (.code "NOT_AN_INSTALL"). */
export function pipeNameFromInstall(install) {
  const needle = Buffer.from(PIPE_PREFIX, "utf16le");
  let read = 0;
  for (const dll of ["twinBASIC_win64.dll", "twinBASIC_win32.dll"]) {
    let data;
    try {
      data = fs.readFileSync(path.join(install, "bin", dll));
    } catch {
      continue;
    }
    read++;
    for (let at = data.indexOf(needle); at >= 0; at = data.indexOf(needle, at + 1)) {
      let digits = "";
      for (let i = at + needle.length; i + 1 < data.length && data[i + 1] === 0 && data[i] >= 48 && data[i] <= 57; i += 2) digits += String.fromCharCode(data[i]);
      if (digits) return `\\\\.\\pipe\\${PIPE_PREFIX}${digits}`;
    }
  }
  if (!read) throw Object.assign(new Error(`not a twinBASIC install: neither bin\\twinBASIC_win64.dll nor bin\\twinBASIC_win32.dll in ${install}`), { code: "NOT_AN_INSTALL" });
  throw Object.assign(new Error(`${install} has no LLVM cache server: its compiler DLLs name no cache pipe (it predates the LLVM cache)`), { code: "NO_CACHE_SERVER" });
}

/** Does the pipe exist? Lists \\.\pipe\ (connects to nothing, so it costs the server no client). */
export function pipeExists(pipe) {
  const name = pipe.slice("\\\\.\\pipe\\".length).toLowerCase();
  try {
    return fs.readdirSync("\\\\.\\pipe\\").some((n) => n.toLowerCase() === name);
  } catch {
    return false;
  }
}

// ---- the servers that run ---------------------------------------------------------------------------------------------------

/** Every twinBASIC_win64.exe whose command line holds --cache=1: { pid, ppid, exe, cmd }. */
export function listCacheServers() {
  const script = `Get-CimInstance Win32_Process -Filter "Name='twinBASIC_win64.exe'" | Where-Object { $_.CommandLine -match '--cache=1' } | ForEach-Object { "$($_.ProcessId)|$($_.ParentProcessId)|$($_.ExecutablePath)|$($_.CommandLine)" }`;
  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 30000 }, (err, out, errOut) => {
      if (err || errOut.trim()) return reject(new Error(`could not list the cache servers: ${(errOut || err.message).trim().slice(0, 300)}`));
      resolve(
        out
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [pid, ppid, exe, ...cmd] = l.split("|");
            return { pid: Number(pid), ppid: Number(ppid), exe, cmd: cmd.join("|") };
          }),
      );
    });
  });
}

const norm = (p) => path.resolve(p).toLowerCase();
const serverExeOf = (install) => path.join(install, "bin", "twinBASIC_win64.exe");
/** The registration pipe a listed server serves (lower case), read from the install its image belongs to; "" when that cannot be read. */
export function serverPipe(s) {
  try {
    return pipeNameFromInstall(path.dirname(path.dirname(s.exe))).toLowerCase();
  } catch {
    return "";
  }
}
export const isOwnServer = (s, install) => norm(s.exe ?? "") === norm(serverExeOf(install));

// ---- registering as a client -------------------------------------------------------------------------------------------------

/**
 * Registers `pid` as a client on `pipe` and resolves { socket, serverPid } with the connection left open. Rejects with err.code ENOENT when no
 * pipe answers. `pid` defaults to this process's.
 */
export function registerClient(pipe, pid = process.pid, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(pipe);
    const chunks = [];
    let got = 0;
    let done = false;
    const fail = (e) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      reject(e);
    };
    const timer = setTimeout(() => fail(Object.assign(new Error(`the server did not answer the registration within ${timeoutMs} ms`), { code: "ETIMEDOUT" })), timeoutMs);
    socket.on("error", fail);
    socket.on("close", () => fail(Object.assign(new Error("the pipe closed before the server answered"), { code: "ECLOSED" })));
    socket.on("connect", () => {
      const msg = Buffer.alloc(36);
      randomBytes(32).copy(msg, 0);
      msg.writeUInt32LE(pid >>> 0, 32);
      socket.write(msg);
    });
    socket.on("data", (d) => {
      chunks.push(d);
      got += d.length;
      if (got >= 4 && !done) {
        done = true;
        clearTimeout(timer);
        socket.removeAllListeners("close");
        socket.on("error", () => {});
        resolve({ socket, serverPid: Buffer.concat(chunks).readUInt32LE(0) });
      }
    });
  });
}

// ---- the lock ----------------------------------------------------------------------------------------------------------------

/** The start lock's pipe name for a registration pipe: `\\.\pipe\tbtools.llvm-cache.start-lock.v<n>`, n the digits of the pipe's version.
 * The name is shared with tblaunch's CacheServer.twin (r20a): whoever starts a server holds this pipe (first instance) while it does. */
export function startLockName(pipe) {
  const n = /(\d+)$/.exec(pipe)?.[1];
  if (!n) throw new Error(`no pipe version in ${pipe}`);
  return `\\\\.\\pipe\\tbtools.llvm-cache.start-lock.v${n}`;
}

/** Holds a named pipe as a lock: a second holder gets EADDRINUSE, and the kernel frees it when its holder dies. */
export async function takeLock(name, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    const server = net.createServer();
    const got = await new Promise((resolve) => {
      server.once("error", (e) => resolve(e));
      server.listen(name, () => resolve(null));
    });
    if (!got) return { release: () => new Promise((r) => server.close(() => r())) };
    server.close();
    if (got.code !== "EADDRINUSE") throw got;
    if (Date.now() - t0 > timeoutMs) throw new Error(`the LLVM cache start lock ${name} was not freed within ${timeoutMs} ms`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

// ---- starting the server -----------------------------------------------------------------------------------------------------

/**
 * Starts <install>\bin\twinBASIC_win64.exe --threads=<n> --keepalive=0 --cache=1, detached, hidden, with no inherited stdio. Resolves its pid.
 * (Node's detached spawn does not ask for CREATE_BREAKAWAY_FROM_JOB: a caller inside a job without breakaway still has the server in that job.)
 */
function startServer(install, threads) {
  const exe = serverExeOf(install);
  if (!fs.existsSync(exe)) throw new Error(`no such file: ${exe}`);
  const child = spawn(exe, [`--threads=${threads}`, "--keepalive=0", "--cache=1"], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  return child;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- the holder (what release() ends) -------------------------------------------------------------------------------------------
// Question 1 (997, v5, llvm-cache-q1.log): the server counts the PROCESS whose pid is in the registration message, not the connection.
// Closing the connection with the registered process alive did not end the server in 45 s; a connection left open while the registered
// process ended ended the server 15.1 s later. So "close the handle" cannot release a lease. Each lease therefore registers the pid of a
// small holder process of its own (an idle node child), and release() ends the holder. The holder reads its stdin and exits at its end,
// which the kernel delivers when the leasing process dies, however it dies: a killed tool releases its lease after all.
function startHolder() {
  const code = "process.stdin.on('end',()=>process.exit(0));process.stdin.on('close',()=>process.exit(0));process.stdin.on('error',()=>process.exit(0));process.stdin.resume();setInterval(()=>{},1e6)";
  const h = spawn(process.execPath, ["-e", code], { stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
  h.unref();
  h.stdin.unref?.();
  h.stdin.on("error", () => {});
  return h;
}

/**
 * Acquires a lease on the LLVM cache server of `install`, starting one when none answers.
 *   install       the twinBASIC install folder (holds twinBASIC.exe and bin\)
 *   threads       the server's --threads when this call starts it (default 4)
 *   ownInstallOnly  refuse a server that runs from another install (default false: any server on the pipe is used), with an Error
 *                   whose .code is "FOREIGN_SERVER"
 *   log           (message) => void
 * Resolves { pipe, serverPid, started, release() }; `started` is true when this call started the server.
 */
export async function acquireLlvmCache({ install, threads = 4, ownInstallOnly = false, log = () => {}, startTimeoutMs = 15000, lockTimeoutMs = 60000 } = {}) {
  if (!install) throw new Error("acquireLlvmCache: install is required");
  const pipe = pipeNameFromInstall(install);
  const lockName = startLockName(pipe);

  const refuseForeign = async () => {
    if (!ownInstallOnly) return;
    const servers = await listCacheServers();
    // only servers of this pipe: a v6 server of another build is no concern of a v5 install
    const foreign = servers.filter((s) => !isOwnServer(s, install) && serverPipe(s) === pipe.toLowerCase());
    if (foreign.length) {
      throw Object.assign(new Error(`an LLVM cache server of another install is running on ${pipe}: ${foreign.map((s) => `${s.pid} ${s.exe}`).join("; ")} (ownInstallOnly is set)`), { code: "FOREIGN_SERVER", servers: foreign });
    }
  };

  // registers a holder process of its own; the lease ends when the holder does
  const register = async () => {
    const holder = startHolder();
    await new Promise((resolve, reject) => {
      holder.once("spawn", resolve);
      holder.once("error", reject);
    });
    try {
      const reg = await registerClient(pipe, holder.pid);
      return { ...reg, holder };
    } catch (e) {
      holder.kill();
      throw e;
    }
  };
  const lease = (reg, started) => {
    let released = false;
    return {
      pipe,
      serverPid: reg.serverPid,
      holderPid: reg.holder.pid,
      started,
      /** Ends the holder at once and waits for nothing: for a `process.on("exit")` handler, where an async release cannot finish. */
      releaseSync: () => {
        if (released) return;
        released = true;
        reg.socket.destroy();
        reg.holder.kill();
      },
      release: async () => {
        if (released) return;
        released = true;
        const gone = new Promise((r) => (reg.holder.exitCode !== null ? r() : reg.holder.once("exit", r)));
        reg.holder.ref(); // an unreferenced child does not keep the event loop alive until its exit is seen
        reg.socket.destroy();
        reg.holder.kill();
        await gone;
      },
    };
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    // fast path: a server answers
    if (pipeExists(pipe)) {
      await refuseForeign();
      try {
        const reg = await register();
        log(`registered with the server on ${pipe} (pid ${reg.serverPid})`);
        return lease(reg, false);
      } catch (e) {
        if (e.code !== "ENOENT" && e.code !== "ECLOSED") throw e;
        log(`registration failed (${e.code}); trying again`);
      }
    }
    // slow path: nobody answers; one acquirer at a time checks again and starts
    const lock = await takeLock(lockName, lockTimeoutMs);
    try {
      let started = false;
      if (!pipeExists(pipe)) {
        const child = startServer(install, threads);
        started = true;
        const t0 = Date.now();
        let exited = false;
        child.once("exit", () => (exited = true));
        while (!pipeExists(pipe)) {
          if (exited) throw new Error(`the server ended before it registered on ${pipe}`);
          if (Date.now() - t0 > startTimeoutMs) {
            try {
              process.kill(child.pid);
            } catch {}
            throw new Error(`${pipe} did not appear within ${startTimeoutMs} ms of starting the server (pid ${child.pid})`);
          }
          await sleep(50);
        }
        log(`started the server (pid ${child.pid}) in ${Date.now() - t0} ms`);
      } else {
        await refuseForeign();
      }
      const reg = await register();
      return lease(reg, started);
    } catch (e) {
      if (e.code === "ENOENT" || e.code === "ECLOSED") continue;
      throw e;
    } finally {
      await lock.release();
    }
  }
  throw new Error(`could not register with an LLVM cache server on ${pipe}`);
}
