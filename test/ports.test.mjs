// Unit tests for scripts/lib/tb-ports.mjs, which claims the DevTools ports a
// run's IDEs use so that two runs never share one.
//
// The harness runs that claim ports need a twinBASIC install, so they run only
// by hand; claiming a port needs none. Four child processes claim at once, from
// a range where one port is listened on, one holds a stale lock and one a live
// lock, and their claims are checked against the ports that were free.
//
// Runs with a bare `node --test test/ports.test.mjs`: no tree, no IDE.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { claimPorts } from "../scripts/lib/tb-ports.mjs";

const MODULE = pathToFileURL(path.join(import.meta.dirname, "../scripts/lib/tb-ports.mjs")).href;
const LOCKS = path.join(tmpdir(), "tb-ports");
const BASE = 19560;
const CHILDREN = 4;
const lockFile = (port) => path.join(LOCKS, `${port}.lock`);

// A child claims three ports, prints them, and holds them until its standard
// input closes, so that every child claims while the others hold theirs.
const CHILD = `
  const { claimPorts } = await import(${JSON.stringify(MODULE)});
  console.log(JSON.stringify(await claimPorts(3, { from: ${BASE} })));
  process.stdin.resume();
  process.stdin.on("end", () => process.exit(0));
`;

// Starts a child; resolves to its ports once it has claimed them, and to
// `release`, which ends it and resolves when it has exited.
function claimInChild() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", CHILD]);
    const exited = new Promise((r) => child.on("close", r));
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
      if (out.includes("\n"))
        resolve({
          ports: JSON.parse(out),
          release: () => {
            child.stdin.end();
            return exited;
          },
        });
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", reject);
    exited.then((code) => reject(new Error(`child exit ${code} before claiming: ${err}`)));
  });
}

describe("claimPorts", () => {
  const server = net.createServer();

  before(async () => {
    // BASE+1 is listened on, BASE+2 has the lock of a process that has ended,
    // BASE+3 has the lock of this live process.
    await new Promise((resolve) => server.listen(BASE + 1, "127.0.0.1", resolve));
    mkdirSync(LOCKS, { recursive: true });
    const ended = spawnSync(process.execPath, ["-e", ""]).pid;
    writeFileSync(lockFile(BASE + 2), String(ended));
    writeFileSync(lockFile(BASE + 3), String(process.pid));
  });

  after(() => {
    server.close();
    // BASE+2's lock is gone unless the test failed.
    for (const port of [BASE + 2, BASE + 3]) rmSync(lockFile(port), { force: true });
  });

  test("runs at once get disjoint ports, passing over a port in use and a live lock", async () => {
    const claims = await Promise.all(Array.from({ length: CHILDREN }, claimInChild));
    await Promise.all(claims.map((c) => c.release()));
    const all = claims.flatMap((c) => c.ports);
    for (const c of claims) assert.equal(c.ports.length, 3);
    const free = [BASE, BASE + 2, ...Array.from({ length: 3 * CHILDREN - 2 }, (_, i) => BASE + 4 + i)];
    assert.deepEqual(
      all.sort((x, y) => x - y),
      free,
      "the free ports, each once, BASE+2's stale lock taken over",
    );
    for (const port of all) assert.ok(!existsSync(lockFile(port)), `the lock on ${port} is removed at exit`);
    assert.ok(existsSync(lockFile(BASE + 3)), "a live process's lock is left alone");
  });

  test("too few free ports is refused, and the ports found are let go", async () => {
    await assert.rejects(claimPorts(2, { from: BASE, tries: 2 }), /found 1 free DevTools port\(s\) of the 2 needed/);
    assert.ok(!existsSync(lockFile(BASE)), "the one port found is unlocked again");
    assert.ok(!existsSync(lockFile(BASE + 1)), "the port in use is not left locked");
  });

  test("a claim left unfinished by a run that ended is taken over", async () => {
    const claiming = path.join(LOCKS, "claiming");
    mkdirSync(claiming);
    const old = new Date(Date.now() - 60_000);
    utimesSync(claiming, old, old);
    const [port] = await claimPorts(1, { from: BASE });
    assert.equal(port, BASE);
    assert.ok(!existsSync(claiming), "the claiming folder is removed after the claim");
  });
});
