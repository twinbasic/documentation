// Probes behind llvm-cache.mjs (r19a). Everything here runs against BETA 997's install (pipe v5) and refuses any other pipe:
// the v6 server belongs to other runs. Servers it starts are ended by pid, and only those whose image is under that install's bin.
//
//   node probe.mjs q1|q2|q3|q4|all          logs to <LR_LOG_DIR, else the current folder>/llvm-cache-<q>.log
//   LR_INSTALL=<install> overrides the install (still must be a v5 pipe)
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireLlvmCache, isOwnServer, listCacheServers, pipeExists, pipeNameFromInstall, registerClient } from "./llvm-cache.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const INSTALL = process.env.LR_INSTALL ?? `${process.env.USERPROFILE}\\Desktop\\twinBASIC_IDE_BETA_997`;
const PIPE = pipeNameFromInstall(INSTALL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
};
const scrub = (s) => String(s).split(os.userInfo().username).join("<user>");

let logFile = null;
const log = (...a) => {
  const line = scrub(`[${new Date().toISOString().slice(11, 23)}] ${a.join(" ")}`);
  console.log(line);
  if (logFile) fs.appendFileSync(logFile, `${line}\n`);
};

function startRaw(threads = 1) {
  const c = spawn(path.join(INSTALL, "bin", "twinBASIC_win64.exe"), [`--threads=${threads}`, "--keepalive=0", "--cache=1"], { detached: true, stdio: "ignore", windowsHide: true });
  c.unref();
  return c.pid;
}
async function waitPipe(ms = 10000) {
  const t0 = Date.now();
  while (!pipeExists(PIPE)) {
    if (Date.now() - t0 > ms) throw new Error("pipe did not appear");
    await sleep(50);
  }
}
/** ms until pid is gone, or null at maxMs. */
async function waitDeath(pid, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (!alive(pid)) return Date.now() - t0;
    await sleep(250);
  }
  return null;
}
const ours = async () => (await listCacheServers()).filter((s) => isOwnServer(s, INSTALL));
async function cleanup(why) {
  for (const s of await ours()) {
    try {
      process.kill(s.pid);
      log(`cleanup (${why}): ended server ${s.pid} by pid`);
    } catch {}
  }
  await sleep(300);
}
async function guard() {
  if (!/\.v5$/.test(PIPE)) throw new Error(`refusing: ${PIPE} is not a v5 pipe`);
  const all = await listCacheServers();
  const foreign = all.filter((s) => !isOwnServer(s, INSTALL));
  const mine = all.filter((s) => isOwnServer(s, INSTALL));
  if (mine.length) log(`note: ${mine.length} server(s) of the 997 install already run (${mine.map((s) => s.pid)}); ended before the probe`);
  await cleanup("start");
  if (pipeExists(PIPE)) throw new Error(`${PIPE} exists although no 997 server runs (foreign: ${foreign.map((s) => s.pid)})`);
}

// ---- children ----------------------------------------------------------------------------------------------------------------
async function child() {
  const [, , , kind, a1, a2] = process.argv;
  if (kind === "acquire") {
    const t0 = Date.now();
    const lease = await acquireLlvmCache({ install: INSTALL, threads: 1 });
    console.log(`acquired started=${lease.started} serverpid=${lease.serverPid} pid=${process.pid} after=${Date.now() - t0}ms`);
    await sleep(Number(a1));
    await lease.release();
    console.log(`released pid=${process.pid}`);
    process.exit(0);
  } else if (kind === "spawn") {
    const pid = startRaw();
    await waitPipe();
    console.log(`serverpid=${pid} (node detached spawn)`);
    process.exit(0);
  } else if (kind === "cim") {
    const exe = path.join(INSTALL, "bin", "twinBASIC_win64.exe");
    const cmd = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='"${exe}" --threads=1 --keepalive=0 --cache=1'} | ForEach-Object { $_.ProcessId }`;
    const out = await new Promise((res) => execFile("powershell.exe", ["-NoProfile", "-Command", cmd], { windowsHide: true }, (e, o) => res(o.trim())));
    await waitPipe();
    console.log(`serverpid=${out} (Win32_Process.Create)`);
    process.exit(0);
  }
}

function runPs(args) {
  return new Promise((res) => execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(here, "jobtest.ps1"), ...args], { windowsHide: true, timeout: 120000 }, (e, o, er) => res(o + er)));
}
function runChild(kind, ...args) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", kind, ...args], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let out = "";
    c.stdout.on("data", (d) => (out += d));
    c.stderr.on("data", (d) => (out += d));
    c.on("exit", (code) => res({ code, out: out.trim(), pid: c.pid }));
    c.pid && (runChild.last = c);
  });
}

// ---- Q1 ----------------------------------------------------------------------------------------------------------------------
async function q1() {
  log("Q1 (997, v5): what does the server count as a client, the open connection or the pid in the message?");
  // 1a: own pid stays alive, the connection is closed after 2 s
  await guard();
  let pid = startRaw();
  await waitPipe();
  let reg = await registerClient(PIPE, process.pid);
  log(`1a: server ${pid} started, registered with pid ${process.pid} (alive for the whole test); reply pid ${reg.serverPid}`);
  await sleep(2000);
  reg.socket.destroy();
  const t1 = Date.now();
  log("1a: connection closed at t=0, my pid stays alive; waiting for the server to end (max 45 s)");
  let d = await waitDeath(pid, 45000);
  log(`1a: server ${d === null ? "STILL ALIVE after 45 s" : `ended ${d} ms after the connection closed`}`);
  await cleanup("1a");
  // 1b: a short-lived pid, the connection stays open
  await guard();
  pid = startRaw();
  await waitPipe();
  const c = spawn(process.execPath, ["-e", "setTimeout(()=>{},3000)"], { stdio: "ignore", windowsHide: true });
  reg = await registerClient(PIPE, c.pid);
  const t0 = Date.now();
  log(`1b: server ${pid} started, registered with the pid ${c.pid} of a child that ends in 3 s, connection kept open here; reply pid ${reg.serverPid}`);
  await new Promise((r) => c.once("exit", r));
  log(`1b: the registered pid ended ${Date.now() - t0} ms after registering; connection still open (destroyed: ${reg.socket.destroyed})`);
  const te = Date.now();
  d = await waitDeath(pid, 45000);
  log(`1b: server ${d === null ? "STILL ALIVE 45 s after the pid ended (connection open)" : `ended ${Date.now() - te} ms after the registered pid ended`}`);
  reg.socket.destroy();
  await cleanup("1b");
  // 1c: no client at all
  await guard();
  pid = startRaw();
  await waitPipe();
  log(`1c: server ${pid} started, no client ever; waiting 25 s`);
  d = await waitDeath(pid, 25000);
  log(`1c: server ${d === null ? "alive after 25 s (a server with no client never ends)" : `ended after ${d} ms`}`);
  await cleanup("1c");
  void t1;
}

// ---- Q2 ----------------------------------------------------------------------------------------------------------------------
async function q2() {
  log("Q2 (997, v5): jobs.");
  log("this process's job:", (await runPs(["-Mode", "info"])).trim().replace(/\r?\n/g, " | "));
  for (const kind of ["spawn", "cim"]) {
    await guard();
    log(`--- server started inside a kill-on-close job without breakaway, by a Node child: ${kind === "spawn" ? "child_process.spawn detached" : "Win32_Process.Create via PowerShell"}`);
    const out = await runPs(["-Mode", "run", "-Node", process.execPath, "-Script", fileURLToPath(import.meta.url), "-ChildArgs", `--child ${kind}`]);
    log(out.trim().replace(/\r?\n/g, "\n    "));
    await cleanup(`q2 ${kind}`);
  }
  // does a detached server outlive the Node that started it? (outside a job of mine; the job of this tool is the caller's)
  await guard();
  const r = await runChild("spawn");
  const pid = Number(/serverpid=(\d+)/.exec(r.out)?.[1]);
  log(`plain child that started a detached server and exited: ${r.out}; server alive after the child ended: ${alive(pid)}`);
  await sleep(2000);
  log(`    2 s later: ${alive(pid)}`);
  await cleanup("q2 plain");
}

// ---- Q3 ----------------------------------------------------------------------------------------------------------------------
async function q3() {
  log("Q3 (997, v5): concurrent acquires and releases.");
  await guard();
  const a = runChild("acquire", "9000");
  const b = runChild("acquire", "13000");
  await sleep(6000);
  const during = await ours();
  log(`during both leases: ${during.length} server(s) of the install run: ${during.map((s) => s.pid)}`);
  const [ra, rb] = await Promise.all([a, b]);
  const tEnd = Date.now();
  log(`A: ${ra.out.replace(/\r?\n/g, " / ")}`);
  log(`B: ${rb.out.replace(/\r?\n/g, " / ")}`);
  const pid = during[0]?.pid;
  const d = pid && (await waitDeath(pid, 45000));
  log(`both released/ended; server ${pid} ${d === null ? "STILL ALIVE after 45 s" : `ended ${Date.now() - tEnd} ms after the second holder ended`}`);
  await cleanup("q3a");

  log("--- a holder killed by pid");
  await guard();
  const k = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", "acquire", "600000"], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  let out = "";
  k.stdout.on("data", (x) => (out += x));
  while (!out.includes("acquired")) await sleep(100);
  const sp = Number(/serverpid=(\d+)/.exec(out)[1]);
  log(`holder ${k.pid}: ${out.trim()}; server ${sp} alive: ${alive(sp)}`);
  await sleep(1000);
  process.kill(k.pid);
  const tk = Date.now();
  log(`killed holder ${k.pid} by pid; server alive right after: ${alive(sp)}`);
  const d2 = await waitDeath(sp, 45000);
  log(`server ${d2 === null ? "STILL ALIVE after 45 s" : `ended ${Date.now() - tk} ms after the holder was killed`}`);
  await cleanup("q3b");

  log("--- a second acquire after the first lease is released, within the keepalive: the same server");
  await guard();
  const l1 = await acquireLlvmCache({ install: INSTALL, threads: 1 });
  log(`lease 1: started=${l1.started} serverPid=${l1.serverPid}`);
  await l1.release();
  await sleep(3000);
  const l2 = await acquireLlvmCache({ install: INSTALL, threads: 1 });
  log(`lease 2 (3 s after release 1): started=${l2.started} serverPid=${l2.serverPid} same=${l1.serverPid === l2.serverPid}`);
  await l2.release();
  const t2 = Date.now();
  const d3 = await waitDeath(l2.serverPid, 45000);
  log(`in-process release (this process stays alive): server ${d3 === null ? "STILL ALIVE after 45 s" : `ended ${Date.now() - t2} ms after release`}`);
  await cleanup("q3c");
}

// ---- Q4 ----------------------------------------------------------------------------------------------------------------------
async function q4() {
  log("Q4 (997, v5): a server of another install.");
  await guard();
  const lease = await acquireLlvmCache({ install: INSTALL, threads: 1 });
  log(`lease on the 997 server: started=${lease.started} pid=${lease.serverPid}`);
  const fake = path.join(process.env.TEMP, "lr-r19a-fake");
  fs.rmSync(fake, { recursive: true, force: true });
  fs.mkdirSync(path.join(fake, "bin"), { recursive: true });
  const src = path.join(INSTALL, "bin", "twinBASIC_win64.dll");
  try {
    fs.linkSync(src, path.join(fake, "bin", "twinBASIC_win64.dll"));
  } catch {
    fs.copyFileSync(src, path.join(fake, "bin", "twinBASIC_win64.dll"));
  }
  log(`fake install ${fake.replace(process.env.TEMP, "%TEMP%")}: only bin\\twinBASIC_win64.dll, so the same pipe ${PIPE.split("\\").pop()} and an exe path that is not the running server's`);
  try {
    const l = await acquireLlvmCache({ install: fake, ownInstallOnly: true });
    log(`UNEXPECTED: acquired from the fake install, started=${l.started}`);
    await l.release();
  } catch (e) {
    log(`refused as expected: code=${e.code}: ${scrub(e.message).replace(process.env.TEMP, "%TEMP%")}`);
  }
  const l2 = await acquireLlvmCache({ install: fake });
  log(`default (any server on the pipe): started=${l2.started} serverPid=${l2.serverPid} same server=${l2.serverPid === lease.serverPid}`);
  await l2.release();
  await lease.release();
  await cleanup("q4");
  fs.rmSync(fake, { recursive: true, force: true });
}

// ---- main --------------------------------------------------------------------------------------------------------------------
if (process.argv[2] === "--child") {
  await child();
} else {
  const which = process.argv[2] ?? "all";
  const table = { q1, q2, q3, q4 };
  for (const q of which === "all" ? Object.keys(table) : [which]) {
    logFile = path.join(process.env.LR_LOG_DIR ?? process.cwd(), `llvm-cache-${q}.log`);
    fs.writeFileSync(logFile, "");
    try {
      await table[q]();
    } catch (e) {
      log(`FAILED: ${e.stack}`);
      await cleanup("failure").catch(() => {});
      process.exitCode = 1;
    }
  }
}
