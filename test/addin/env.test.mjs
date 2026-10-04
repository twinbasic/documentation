// P10 in WIP.HelpAddin.md, measured: whether the environment variable the
// harness sets, TB_ADDIN_TEST (ADDIN_TEST_ENV in scripts/lib/tb-ide.mjs),
// reaches an add-in. The EnvProbe add-in (probes/env) prints, as its project
// loads, the variable as Environ$ and as GetEnvironmentVariableW read it, and
// the id of the process it runs in.
//
// The rule that an add-in under test prints `open <url>` instead of opening a
// browser (WIP.md, "Testing an IDE add-in") depends on this: an IDE starts the
// compiler, the compiler loads the add-in into its own process, and the
// variable has to survive both steps and a compiler restart. Nothing else in the
// lanes guards it. The last test is the control: an IDE started with the
// variable left out reports it unset, so the first two read what the harness set
// and not something the machine had.
//
// Each test states what BETA 983 and 995 do. If one fails after an IDE update, the
// IDE has changed: update P10 in WIP.HelpAddin.md, the paragraph under "An
// add-in under test opens nothing" in WIP.Harness.md, and every add-in that
// checks the variable (they would open a real browser), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADDIN_TEST_ENV, compilerPid } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "env");

// What the probe printed since a mark, as { environ, win32, pid } for each line.
async function probeSince(c, mark) {
  return (await linesSince(c, mark, { prefix: "[EnvProbe] " })).map((l) => {
    const m = /^Environ=(.*) GetEnvironmentVariableW=(.*) pid=(\d+)$/.exec(l);
    assert.ok(m, `not a line of the probe's: ${JSON.stringify(l)}`);
    return { environ: m[1], win32: m[2], pid: Number(m[3]) };
  });
}

// The probe's lines since a mark, once it has printed one.
async function waitForProbe(c, mark) {
  const lines = await waitFor(
    c,
    async (c) => {
      const l = await probeSince(c, mark);
      return l.length > 0 && l;
    },
    { timeout: 30000 },
  );
  assert.ok(lines, "the add-in printed nothing");
  return lines;
}

scenario("P10: the environment variable the harness sets reaches an add-in", (lane) => {
  let c, firstPid;
  before(async () => {
    assert.equal(ADDIN_TEST_ENV, "TB_ADDIN_TEST", "the probe reads the name this file expects");
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
  });

  test("an IDE the harness starts passes it to the add-in, in the compiler's process", async (t) => {
    const lines = await waitForProbe(c, null);
    assert.equal(lines.length, 1, `loaded more than once: ${JSON.stringify(lines)}`);
    // Environ$ and the Win32 call read the same variable.
    assert.deepEqual(lines[0].environ, "1");
    assert.deepEqual(lines[0].win32, "1");
    // The add-in runs in the compiler, a child of the IDE, not in the IDE.
    firstPid = await compilerPid(c);
    assert.equal(lines[0].pid, firstPid);
    t.diagnostic(`TB_ADDIN_TEST was 1 in compiler process ${firstPid}`);
  });

  test("a compiler restarted with the toolbar's button is a new process, and the add-in it loads reads it too", async (t) => {
    const mark = await consoleMark(c);
    const newPid = await lane.restartCompiler();
    const lines = await waitForProbe(c, mark);
    assert.equal(lines.length, 1, `loaded more than once: ${JSON.stringify(lines)}`);
    assert.deepEqual(lines[0].environ, "1");
    assert.deepEqual(lines[0].win32, "1");
    assert.notEqual(lines[0].pid, firstPid, "the restart did not start a new process");
    assert.equal(lines[0].pid, newPid);
    assert.equal(await compilerPid(c), newPid);
    t.diagnostic(`TB_ADDIN_TEST was 1 in compiler process ${lines[0].pid}, after ${firstPid}`);
  });

  // The control. The probe prints nothing that opens anything, so an IDE started
  // without the variable is safe to run.
  test("an IDE started with the variable left out reports it unset", async () => {
    await lane.closeProject();
    c = await lane.open(HOST, { env: { [ADDIN_TEST_ENV]: undefined } });
    const lines = await waitForProbe(c, null);
    assert.deepEqual(lines.length, 1, `loaded more than once: ${JSON.stringify(lines)}`);
    assert.deepEqual(lines[0].environ, "");
    assert.deepEqual(lines[0].win32, "(unset)");
    assert.equal(lines[0].pid, await compilerPid(c));
  });
});
