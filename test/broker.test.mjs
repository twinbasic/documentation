// Tests for tbbroker (scripts/broker/, WIP.Broker.md) and its Node client, scripts/lib/tb-broker.mjs.
// They need a built broker and Windows, and are skipped without them: set TBBROKER_EXE to the exe
// that `node scripts/tbbuild.mjs scripts/broker/tbbroker.twinproj --build` prints, or that
// `node scripts/tbbroker.mjs install` installed. Each test file run starts brokers of its own on
// pipes and desktop names of its own (tbt<pid>-...), never the user's broker, and stops them.

import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { BrokerError, connectBroker, pipePath } from "../scripts/lib/tb-broker.mjs";
import { killTree, launchOnDesktop, sleep } from "../scripts/lib/tb-ide.mjs";

const EXE = process.env.TBBROKER_EXE;
let skip = false;
if (process.platform !== "win32") skip = "the broker is a Windows program";
else if (!EXE) skip = "set TBBROKER_EXE to a built tbbroker exe to test the broker";
else if (!fs.existsSync(EXE)) skip = `no file at TBBROKER_EXE (${EXE})`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), "tbbroker-test-"));
let serial = 0;

// A broker of the test's own: its pipe, its desktops' prefix, its log.
function names(extra = {}) {
  serial++;
  const pipe = `tbtest-${process.pid}-${serial}`;
  const prefix = `tbt${process.pid}x${serial}-`;
  const log = path.join(work, `broker-${serial}.log`);
  return { pipe, prefix, log, args: ["--prefix", prefix, "--log", log, ...(extra.args ?? [])] };
}

function run(args) {
  return new Promise((resolve) => {
    execFile(EXE, args, { windowsHide: true, timeout: 30 * 1000 }, (e, stdout, stderr) => {
      resolve({ code: e ? (e.code ?? 1) : 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function startOne(extra) {
  const n = names(extra);
  const r = await run(["start", "--pipe", n.pipe, ...n.args]);
  assert.equal(r.code, 0, r.stderr);
  const b = await connectBroker({ pipe: n.pipe, start: false, client: "broker.test" });
  return { ...n, b };
}

async function stopOne({ pipe }) {
  await run(["stop", "--pipe", pipe]);
}

// Polls until `check` returns something truthy, or fails after `ms`.
async function until(check, ms = 5000, what = "the condition") {
  const end = Date.now() + ms;
  for (;;) {
    const v = await check();
    if (v) return v;
    if (Date.now() > end) assert.fail(`${what} did not hold within ${ms} ms`);
    await sleep(50);
  }
}

const slotState = async (b, slot) => (await b.status()).slots.find((s) => s.slot === slot)?.state;

// A process that runs until it is killed, and has no window.
function sleeper() {
  const p = spawn(process.execPath, ["-e", "setTimeout(() => {}, 120000)"], { stdio: "ignore", windowsHide: true });
  return p;
}

describe("tbbroker", { skip }, () => {
  after(() => {
    fs.rmSync(work, { recursive: true, force: true });
  });

  describe("starting and stopping", () => {
    test("start starts one broker, a second start finds it, and --serve on its pipe refuses", async () => {
      const n = names();
      const first = await run(["start", "--pipe", n.pipe, ...n.args]);
      assert.equal(first.code, 0, first.stderr);
      assert.match(first.stdout, /running at .*, pid \d+/);
      const second = await run(["start", "--pipe", n.pipe, ...n.args]);
      assert.equal(second.code, 0, second.stderr);
      assert.match(second.stdout, /running at/);
      assert.doesNotMatch(second.stdout, /pid/);
      const serve = await run(["--serve", "--pipe", n.pipe, ...n.args]);
      assert.equal(serve.code, 3);
      const status = await run(["status", "--pipe", n.pipe]);
      assert.equal(status.code, 0);
      const s = JSON.parse(status.stdout);
      assert.equal(s.ok, true);
      assert.equal(s.broker.pipe, pipePath(n.pipe));
      assert.equal(s.broker.prefix, n.prefix);
      const stop = await run(["stop", "--pipe", n.pipe]);
      assert.equal(stop.code, 0);
      await until(async () => (await run(["status", "--pipe", n.pipe])).code === 4, 5000, "the broker ending");
    });

    test("status and stop with no broker exit 4", async () => {
      const n = names();
      assert.equal((await run(["status", "--pipe", n.pipe])).code, 4);
      assert.equal((await run(["stop", "--pipe", n.pipe])).code, 4);
    });

    test("a mistake in the command line exits 2", async () => {
      assert.equal((await run(["--max", "0"])).code, 2);
      assert.equal((await run(["--ports", "100-200"])).code, 2);
      assert.equal((await run(["--frob"])).code, 2);
      assert.equal((await run(["status", "stop"])).code, 2);
    });

    test("the client starts the broker when nothing answers", async () => {
      const n = names();
      const b = await connectBroker({ pipe: n.pipe, exe: EXE, args: n.args, client: "broker.test" });
      try {
        const s = await b.status();
        assert.equal(s.broker.prefix, n.prefix);
        assert.equal(s.broker.pid, b.brokerPid);
        assert.ok(s.connections.some((c) => c.client === "broker.test" && c.pid === process.pid));
      } finally {
        await b.stop();
        b.close();
      }
    });
  });

  describe("leases", () => {
    let one;
    before(async () => {
      one = await startOne({ args: ["--max", "3", "--ports", "48190-48192"] });
    });
    after(async () => {
      one?.b.close();
      if (one) await stopOne(one);
    });

    test("a lease is the lowest free slot and its desktop, made once and handed out again", async () => {
      const { b, prefix } = one;
      const a = await b.lease({ tag: "first" });
      assert.equal(a.slot, 1);
      assert.equal(a.desktop, `${prefix}1`);
      assert.equal(a.port, 0);
      const c = await b.lease({ tag: "second" });
      assert.equal(c.slot, 2);
      const s = await b.status();
      assert.deepEqual(
        s.leases.map((l) => [l.lease, l.slot, l.tag, l.connected, l.client]),
        [
          [a.lease, 1, "first", true, process.pid],
          [c.lease, 2, "second", true, process.pid],
        ],
      );
      await b.release(a.lease);
      await b.release(c.lease);
      assert.equal(await slotState(b, 1), "free");
      const again = await b.lease();
      assert.equal(again.desktop, `${prefix}1`, "the same desktop again, not a new one");
      await b.release(again.lease);
    });

    test("a lease ends when its connection closes", async () => {
      const other = await connectBroker({ pipe: one.pipe, start: false });
      const l = await other.lease({ tag: "closing" });
      assert.equal(await slotState(one.b, l.slot), "leased");
      other.close();
      await until(async () => (await slotState(one.b, l.slot)) === "free", 3000, "the slot coming free");
    });

    test("a held process keeps the lease after its connection has gone, until it ends", async () => {
      const other = await connectBroker({ pipe: one.pipe, start: false });
      const p = sleeper();
      try {
        const l = await other.lease({ tag: "held" });
        await other.hold(l.lease, p.pid);
        other.close();
        await sleep(1000);
        const s = await one.b.status();
        const held = s.leases.find((x) => x.lease === l.lease);
        assert.ok(held, "the lease outlives its connection");
        assert.equal(held.connected, false);
        assert.deepEqual(held.holds, [p.pid]);
        p.kill();
        await until(async () => (await slotState(one.b, l.slot)) === "free", 3000, "the slot coming free");
      } finally {
        p.kill();
      }
    });

    test("release ends the lease only once its held processes have ended", async () => {
      const { b } = one;
      const p = sleeper();
      try {
        const l = await b.lease();
        await b.hold(l.lease, p.pid);
        await b.release(l.lease);
        await sleep(600);
        assert.equal(await slotState(b, l.slot), "leased");
        p.kill();
        await until(async () => (await slotState(b, l.slot)) === "free", 3000, "the slot coming free");
      } finally {
        p.kill();
      }
    });

    test("hold and release refuse what is not the connection's, and a process that is not there", async () => {
      const { b } = one;
      const l = await b.lease();
      const other = await connectBroker({ pipe: one.pipe, start: false });
      try {
        await assert.rejects(
          other.hold(l.lease, process.pid),
          (e) => e instanceof BrokerError && e.code === "not-yours",
        );
        await assert.rejects(other.release(l.lease), (e) => e.code === "not-yours");
        await assert.rejects(b.hold(999999, process.pid), (e) => e.code === "no-lease");
        await assert.rejects(b.hold(l.lease, 4), (e) => e.code === "no-process");
        const p = sleeper();
        const pid = p.pid;
        p.kill();
        await new Promise((r) => p.once("exit", r));
        await assert.rejects(b.hold(l.lease, pid), (e) => e.code === "no-process");
      } finally {
        other.close();
        await b.release(l.lease);
      }
    });

    test("with every slot taken a lease fails with full, or waits its turn", async () => {
      const { b } = one;
      const taken = [await b.lease(), await b.lease(), await b.lease()];
      await assert.rejects(b.lease(), (e) => e.code === "full");
      const other = await connectBroker({ pipe: one.pipe, start: false });
      try {
        let got = null;
        const waiting = other.lease({ wait: true, tag: "waiter" }).then((r) => {
          got = r;
          return r;
        });
        await sleep(600);
        assert.equal(got, null);
        assert.equal((await b.status()).waiting, 1);
        await b.release(taken[1].lease);
        const r = await waiting;
        assert.equal(r.slot, taken[1].slot);
        await other.release(r.lease);
      } finally {
        other.close();
        await b.release(taken[0].lease);
        await b.release(taken[2].lease);
      }
    });

    test("a port is a free one of the range: leased ones and ones something listens on are skipped", async () => {
      const { b } = one;
      const server = net.createServer();
      await new Promise((r) => server.listen(48190, "127.0.0.1", r));
      try {
        const a = await b.lease({ port: true });
        assert.equal(a.port, 48191);
        const c = await b.lease({ port: true });
        assert.equal(c.port, 48192);
        await assert.rejects(b.lease({ port: true }), (e) => e.code === "no-port");
        await b.release(a.lease);
        await b.release(c.lease);
      } finally {
        server.close();
      }
    });

    test("a request it cannot read is answered, and the id comes back as it was sent", async () => {
      const socket = net.connect(pipePath(one.pipe));
      await new Promise((r) => socket.once("connect", r));
      const lines = [];
      socket.setEncoding("utf8");
      let buffered = "";
      socket.on("data", (t) => {
        buffered += t;
        let nl = buffered.indexOf("\n");
        while (nl >= 0) {
          lines.push(JSON.parse(buffered.slice(0, nl)));
          buffered = buffered.slice(nl + 1);
          nl = buffered.indexOf("\n");
        }
      });
      socket.write('not json\n{"op":"frob","id":"a-b"}\n{"id":{"x":[1,2]},"op":"hello"}\r\n{"op":"hold","id":7}\n');
      await until(() => lines.length === 4, 3000, "four replies");
      socket.destroy();
      assert.equal(lines[0].ok, false);
      assert.equal(lines[0].error, "bad-request");
      assert.deepEqual([lines[1].id, lines[1].error], ["a-b", "unknown-op"]);
      assert.deepEqual(lines[2].id, { x: [1, 2] });
      assert.equal(lines[2].ok, true);
      assert.deepEqual([lines[3].id, lines[3].error], [7, "bad-request"]);
    });
  });

  describe("desktops", () => {
    test("a desktop whose lease ends with a window still on it is not handed out until the window goes", async () => {
      const one = await startOne({ args: ["--max", "2"] });
      let pad = null;
      try {
        const l = await one.b.lease({ tag: "dirty" });
        pad = await launchOnDesktop({
          exe: "C:\\Windows\\System32\\notepad.exe",
          desktop: l.desktop,
          env: process.env,
        });
        await until(
          async () => (await one.b.status()).slots.find((s) => s.slot === l.slot).windows > 0,
          10000,
          "notepad's window",
        );
        await one.b.release(l.lease);
        assert.equal(await slotState(one.b, l.slot), "dirty");
        const next = await one.b.lease();
        assert.notEqual(next.slot, l.slot, "not the dirty one");
        killTree(pad.pid);
        pad.launcher.kill();
        await until(async () => (await slotState(one.b, l.slot)) === "free", 10000, "the desktop coming free");
        await one.b.release(next.lease);
      } finally {
        if (pad) killTree(pad.pid);
        one.b.close();
        await stopOne(one);
      }
    });

    test("a broker started while a desktop of its pool is still in use holds it and waits for it to empty", async () => {
      const n = names({ args: ["--max", "2"] });
      let pad = null;
      try {
        assert.equal((await run(["start", "--pipe", n.pipe, ...n.args])).code, 0);
        const b1 = await connectBroker({ pipe: n.pipe, start: false });
        const l = await b1.lease();
        pad = await launchOnDesktop({
          exe: "C:\\Windows\\System32\\notepad.exe",
          desktop: l.desktop,
          env: process.env,
        });
        await sleep(1500);
        await b1.stop();
        b1.close();
        await until(async () => (await run(["status", "--pipe", n.pipe])).code === 4, 5000, "the first broker ending");
        assert.equal((await run(["start", "--pipe", n.pipe, ...n.args])).code, 0);
        const b2 = await connectBroker({ pipe: n.pipe, start: false });
        try {
          assert.equal(await slotState(b2, l.slot), "dirty");
          const next = await b2.lease();
          assert.notEqual(next.slot, l.slot);
          killTree(pad.pid);
          pad.launcher.kill();
          await until(async () => (await slotState(b2, l.slot)) === "free", 10000, "the desktop coming free");
          await b2.stop();
        } finally {
          b2.close();
        }
      } finally {
        if (pad) killTree(pad.pid);
        await run(["stop", "--pipe", n.pipe]);
      }
    });
  });
});
