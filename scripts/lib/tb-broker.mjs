// The client side of tbbroker (scripts/broker/, WIP.Broker.md): the twinBASIC program that hands
// out private desktops, slots and ports to every tool that starts an IDE or a program, and takes
// them back when the processes using them end.
//
// One connection per process is enough, and is what a lease is tied to: a lease ends once its
// connection has closed (or released it) and every process held for it has ended. So keep the
// Broker for as long as the process runs; the socket is unref'd while no request is in flight,
// so it never keeps Node alive by itself.
//
// A client that cannot open the pipe starts the broker: it runs `tbbroker start`, which starts
// the broker detached, out of this process's job and tree, waits until the pipe answers and
// exits; then the client connects again, for up to 5 s while the pipe has no instance free
// (openPipeRetrying).

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

/** The pipe a broker serves when it is started with no --pipe. */
export const DEFAULT_PIPE = `\\\\.\\pipe\\tbbroker-${process.env.USERNAME ?? ""}`;

/** What `pipe` names as a full pipe path: a bare name is put under \\.\pipe\. */
export const pipePath = (pipe) => (/^\\\\\.\\pipe\\/i.test(pipe) ? pipe : `\\\\.\\pipe\\${pipe}`);

/**
 * The broker's exe: TBBROKER_EXE, else the installed one, %LOCALAPPDATA%\tbbroker\tbbroker.exe
 * (`node scripts/tbbroker.mjs install` puts it there).
 */
export function brokerExe() {
  if (process.env.TBBROKER_EXE) return process.env.TBBROKER_EXE;
  return path.join(process.env.LOCALAPPDATA ?? "", "tbbroker", "tbbroker.exe");
}

/** An error the broker answered with: `code` is its error member, e.g. "full" or "no-process". */
export class BrokerError extends Error {
  constructor(code, message) {
    super(`tbbroker: ${message} (${code})`);
    this.code = code;
  }
}

function openPipe(pipe) {
  return new Promise((resolve, reject) => {
    const s = net.connect(pipe);
    s.once("connect", () => {
      s.removeAllListeners("error");
      resolve(s);
    });
    s.once("error", reject);
  });
}

// After `tbbroker start`, the pipe can be briefly without an instance waiting for a client
// (ENOENT), or have none free (EBUSY), when several clients start the broker at once: one
// that found no broker connects again, at a random short interval, for up to `ms`.
async function openPipeRetrying(pipe, ms = 5000) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      return await openPipe(pipe);
    } catch (e) {
      if ((e.code !== "ENOENT" && e.code !== "EBUSY") || Date.now() > until) throw e;
      await new Promise((r) => setTimeout(r, 50 + Math.floor(Math.random() * 100)));
    }
  }
}

/**
 * Start the broker unless it runs, with `tbbroker start`; resolves once the pipe answers.
 * `args` are the broker's options (--pipe, --prefix, --max, --ports, --log).
 */
export function startBroker({ exe = brokerExe(), args = [] } = {}) {
  if (!existsSync(exe)) {
    return Promise.reject(
      new Error(`no tbbroker at ${exe}: run \`node scripts/tbbroker.mjs install\`, or set TBBROKER_EXE`),
    );
  }
  return new Promise((resolve, reject) => {
    execFile(exe, ["start", ...args], { windowsHide: true, timeout: 30 * 1000 }, (e, stdout, stderr) => {
      if (e) reject(new Error(`tbbroker start failed: ${(stderr || e.message).trim()}`));
      else resolve(stdout.trim());
    });
  });
}

/**
 * Connect to the broker, starting it first when nothing answers on the pipe.
 *
 * @param {object} [o]
 * @param {string} [o.pipe]    the pipe (default DEFAULT_PIPE)
 * @param {string} [o.client]  a name for this client, shown by status
 * @param {boolean} [o.start]  start the broker when it does not answer (default true)
 * @param {string} [o.exe]     the broker's exe (default brokerExe())
 * @param {string[]} [o.args]  the broker's options when it has to be started; --pipe is added
 * @returns {Promise<Broker>}
 */
export async function connectBroker({ pipe = DEFAULT_PIPE, client, start = true, exe, args = [] } = {}) {
  const full = pipePath(pipe);
  let socket;
  try {
    socket = await openPipe(full);
  } catch (e) {
    if (!start || (e.code !== "ENOENT" && e.code !== "EBUSY")) throw e;
    await startBroker({ exe, args: ["--pipe", full, ...args] });
    socket = await openPipeRetrying(full);
  }
  const b = new Broker(socket, full);
  const hello = await b.request({ op: "hello", client: client ?? path.basename(process.argv[1] ?? "node") });
  b.brokerPid = hello.pid;
  b.protocol = hello.protocol;
  if (hello.protocol !== 1) {
    b.close();
    throw new Error(`tbbroker speaks protocol ${hello.protocol}; this client speaks 1`);
  }
  return b;
}

/** One connection to the broker. Each method sends one request and resolves with its reply. */
export class Broker {
  constructor(socket, pipe) {
    this.pipe = pipe;
    this.socket = socket;
    this.pending = new Map();
    this.nextId = 1;
    this.closed = false;
    /** Called once with an Error when the broker goes away while this connection is open. */
    this.onLost = null;
    let buffered = "";
    socket.setEncoding("utf8");
    socket.on("data", (text) => {
      buffered += text;
      for (let nl = buffered.indexOf("\n"); nl >= 0; nl = buffered.indexOf("\n")) {
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 1);
        if (line.trim()) this.#answer(line);
      }
    });
    const lost = (e) => {
      if (this.closed) return;
      this.closed = true;
      const err = new Error(`tbbroker: the connection to ${pipe} was lost${e ? `: ${e.message}` : ""}`);
      for (const { reject } of this.pending.values()) reject(err);
      this.pending.clear();
      this.onLost?.(err);
    };
    socket.on("error", lost);
    socket.on("close", () => lost());
    socket.unref();
  }

  #answer(line) {
    let reply;
    try {
      reply = JSON.parse(line);
    } catch {
      return;
    }
    const waiter = this.pending.get(reply.id);
    if (!waiter) return;
    this.pending.delete(reply.id);
    if (this.pending.size === 0) this.socket.unref();
    if (reply.ok) waiter.resolve(reply);
    else waiter.reject(new BrokerError(reply.error, reply.message));
  }

  /** Send a request object (its `id` is set here) and resolve with the reply. */
  request(req) {
    if (this.closed) return Promise.reject(new Error(`tbbroker: the connection to ${this.pipe} is closed`));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.ref();
      this.socket.write(`${JSON.stringify({ ...req, id })}\n`);
    });
  }

  /**
   * A slot: `{lease, slot, desktop, port}`. `port` asks for a port as well (0 when not asked);
   * `wait` waits for a slot when all are taken instead of failing with code "full".
   */
  lease({ port = false, tag = "", wait = false } = {}) {
    return this.request({ op: "lease", port, tag, wait });
  }

  /** Keep the lease for as long as process `pid` runs, whatever becomes of this connection. */
  hold(lease, pid) {
    return this.request({ op: "hold", lease, pid });
  }

  /** This connection no longer keeps the lease; it ends once the processes held for it have. */
  release(lease) {
    return this.request({ op: "release", lease });
  }

  status() {
    return this.request({ op: "status" });
  }

  /** End the broker. Its desktops go with it, and every lease is void. */
  stop() {
    return this.request({ op: "stop" });
  }

  /** Close the connection: every lease it took and has not handed to a held process ends. */
  close() {
    this.closed = true;
    this.socket.end();
    this.socket.destroy();
  }
}
