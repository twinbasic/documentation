// DevTools ports for the IDEs a run starts, claimed so that two runs never
// share one.
//
// A run that starts an IDE on a port another IDE already holds would attach to
// that IDE and operate it, so launchIde refuses a port something listens on.
// Checking first is not enough when two runs start together: each finds the
// port free, and the slower one is refused once the faster one's IDE is up.
// So a port is claimed with a lock file before it is checked.
//
// The lock is %TEMP%\tb-ports\<port>.lock and holds the claiming process's pid.
// A lock whose process has ended is stale and is taken over; the run removes
// its own when it exits. A port a process outside these tools listens on has no
// lock, which is why each claimed port is also checked by binding it.
//
// Runs claim one at a time: a claim holds the folder %TEMP%\tb-ports\claiming,
// which creating either makes or fails on, for the milliseconds it takes. Lock
// files alone race: a lock is created empty and its pid written after, and a
// run that reads it in between takes it for stale, removes it and claims the
// same port.

import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { portTaken, sleep } from "./tb-ide.mjs";
import { alive } from "./tb-registry.mjs";

const LOCKS = path.join(tmpdir(), "tb-ports");
const CLAIMING = path.join(LOCKS, "claiming");
// A claim takes milliseconds, so a claiming folder this old was left by a run
// that ended during its claim.
const CLAIMING_STALE_MS = 10_000;
const claimed = new Set();
let releaseOnExit = false;

const lockFile = (port) => path.join(LOCKS, `${port}.lock`);

// Runs `fn` while no other run is claiming.
async function oneAtATime(fn) {
  for (;;) {
    try {
      mkdirSync(CLAIMING);
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    try {
      if (Date.now() - statSync(CLAIMING).mtimeMs > CLAIMING_STALE_MS)
        rmSync(CLAIMING, { recursive: true, force: true });
    } catch {
      // removed since
    }
    await sleep(10);
  }
  try {
    return await fn();
  } finally {
    rmSync(CLAIMING, { recursive: true, force: true });
  }
}

// Writes the port's lock for this process; false when a live process holds it.
// Called only inside oneAtATime.
function lock(port) {
  let pid = 0;
  try {
    pid = Number(readFileSync(lockFile(port), "utf8"));
  } catch {
    // no lock
  }
  if (pid && pid !== process.pid && alive(pid)) return false;
  writeFileSync(lockFile(port), String(process.pid));
  return true;
}

function unlock(port) {
  claimed.delete(port);
  try {
    // Only this process's own lock: one another run took over is left alone.
    if (Number(readFileSync(lockFile(port), "utf8")) === process.pid) rmSync(lockFile(port), { force: true });
  } catch {
    // already gone
  }
}

/**
 * Claim `count` ports, the first free ones from `from` upwards, for as long as
 * this process runs. A port is free when no live process of these tools has
 * claimed it and nothing listens on it.
 *
 * @param {number} count
 * @param {object} o
 * @param {number} o.from    the first port to try
 * @param {number} [o.tries] how many ports to try before giving up (default 200)
 * @returns {Promise<number[]>} in ascending order. Throws when fewer than
 *   `count` free ports are found.
 */
export async function claimPorts(count, { from, tries = 200 }) {
  mkdirSync(LOCKS, { recursive: true });
  if (!releaseOnExit) {
    releaseOnExit = true;
    process.on("exit", () => {
      for (const port of [...claimed]) unlock(port);
    });
  }
  return oneAtATime(async () => {
    const ports = [];
    for (let port = from; ports.length < count && port < from + tries && port <= 65535; port++) {
      if (claimed.has(port) || !lock(port)) continue;
      claimed.add(port);
      if (await portTaken(port)) {
        unlock(port);
        continue;
      }
      ports.push(port);
    }
    if (ports.length < count) {
      for (const port of ports) unlock(port);
      throw new Error(
        `found ${ports.length} free DevTools port(s) of the ${count} needed in ${from}-${from + tries - 1}: ` +
          "the rest are claimed by another run or in use. Pass a different --port.",
      );
    }
    return ports;
  });
}
