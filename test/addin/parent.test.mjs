// P21 in WIP.HelpAddin.md, measured: what reading the Parent of the virtual
// file system's root folder (Host.FileSystem.RootFolder, twinbasic:/) does. The
// documentation (FileSystemItem.md, Folder.md) says it is Nothing, and an
// add-in that tested `item.Parent Is Nothing` on the root crashed the compiler.
//
// The ParentProbe add-in (probes/parent) runs one case when the project loads,
// the one the environment variable TB_P21_CASE names (the harness gives an IDE
// its environment, and the add-in reads it with Environ$, P10). Each case gets
// an IDE of its own, because a crash ends the compiler's process, the add-in's
// too. The add-in prints "[P21] <case> <step>" before and after each step, so
// the last line printed shows the step the compiler died in. The IDE restarts a
// crashed compiler three times, and the add-in runs again in each, so the lines
// are read per run of the add-in.
//
//   a  Dim o As Object = RootFolder.Parent, then "read"
//   b  (a), then o Is Nothing
//   c  RootFolder.Parent Is Nothing in one expression
//   d  TypeName(RootFolder.Parent)
//   e  Dim f As Folder = RootFolder.Parent, then "read"
//   f  the control: the project folder's Parent, printed by its Path
//
// Each test states what BETA 983, 995 and 997 do, which is the same: the
// compiler crashes in cases a to e, at the read of the root's Parent, before
// anything is done with the value, and not in the control, f, where the
// parent is the root. So the lane passes while the bug is there. If a test
// fails after an IDE update, the IDE has changed: update P21 in WIP.HelpAddin.md, the Parent
// section of FileSystemItem.md, the entry in BUGS-TO-REPORT.md
// and the reproducer in bugs/, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "parent");

// The environment variable the add-in reads to pick its case.
const CASE_ENV = "TB_P21_CASE";

// The runs of the add-in in a stretch of the console: each starts at a
// "[P21] <case> start" line, and holds the lines after it. A crashed compiler
// is restarted, and the add-in runs again in the new one.
function runsOf(lines, which) {
  const runs = [];
  for (const l of lines) {
    const m = /^\[P21\] (\S+) (.*)$/.exec(l);
    if (!m || m[1] !== which) continue;
    if (m[2] === "start") runs.push([]);
    if (runs.length) runs.at(-1).push(m[2]);
  }
  return runs;
}

scenario("P21: what reading the Parent of the file system's root does", (lane) => {
  before(async () => {
    await lane.addAddin(PROBE);
  });

  // Open the host project with the add-in set to a case. Returns what it
  // printed, in runs, and whether the compiler crashed. The lane throws about
  // a crash twice: from open, which refuses a project whose compile has not
  // settled, and from closeProject, which reports the crash it finds; both
  // are expected here, and any other failure is not.
  //
  // An IDE now and then starts and prints nothing, and the lane waits out its
  // timeout (2 of 28 runs on BETA 983 to 997, never twice running): that run
  // says nothing about the case, so it is repeated once.
  async function observe(which) {
    const first = await observeOnce(which);
    return first.runs.length > 0 ? first : observeOnce(which);
  }

  async function observeOnce(which) {
    let crashed = false;
    let opened = null; // what open threw, if it did
    const note = (e) => {
      if (/compiler crashed|Safe Mode|restarted \d+x/.test(e.message)) crashed = true;
      else throw e;
    };
    try {
      await lane.open(HOST, { env: { [CASE_ENV]: which }, timeout: 60 * 1000 });
    } catch (e) {
      opened = e.message.split("\n")[0];
    }
    let lines = [];
    try {
      // A case that does not crash prints its last line as the project loads;
      // one that crashes has printed what it will by the time the lane gives up.
      if (lane.c) lines = await linesSince(lane.c);
    } finally {
      try {
        await lane.closeProject();
      } catch (e) {
        note(e);
      }
    }
    return { crashed, opened, runs: runsOf(lines, which), all: lines.filter((l) => l.startsWith("[P21]")) };
  }

  // What each case does in the build under test: whether the compiler crashes,
  // and the lines each run of the add-in prints. A crashing case prints its
  // "start" and the line before the step, and nothing after: the step is the
  // read of Parent, or the expression that holds it.
  const CRASH = (step) => ({ crashed: true, run: ["start", step] });
  const EXPECT = {
    none: { crashed: false, run: ["start", "done"], runs: 1, title: "the control that reads nothing" },
    a: { ...CRASH("before Parent"), title: "Dim o As Object = RootFolder.Parent crashes at the read" },
    b: { ...CRASH("before Parent"), title: "the same, then o Is Nothing: crashes at the read, so before the test" },
    c: { ...CRASH("before Is Nothing"), title: "RootFolder.Parent Is Nothing in one expression crashes" },
    d: { ...CRASH("before TypeName"), title: "TypeName(RootFolder.Parent) crashes" },
    e: { ...CRASH("before Parent"), title: "Dim f As Folder = RootFolder.Parent crashes at the read" },
    f: {
      crashed: false,
      run: ["start", "before Parent", "read", "Path = twinbasic:/", "done"],
      runs: 1,
      title: "the project folder's Parent reads, and is the file system's root",
    },
  };

  for (const which of Object.keys(EXPECT)) {
    test(`case ${which}: ${EXPECT[which].title}`, async (t) => {
      const want = EXPECT[which];
      const r = await observe(which);
      t.diagnostic(`case ${which}: ${r.crashed ? "CRASHED" : "no crash"}, ${r.runs.length} run(s), open: ${r.opened}`);
      for (const l of r.all) t.diagnostic(l);
      assert.equal(r.crashed, want.crashed, `crashed: ${r.opened}`);
      // The IDE restarts a crashed compiler, and the add-in runs again in each
      // one, so every run stops at the same step.
      assert.ok(r.runs.length > 0, "the add-in printed nothing");
      if (want.runs) assert.equal(r.runs.length, want.runs);
      for (const run of r.runs) assert.deepEqual(run, want.run);
    });
  }
});
