// A file missing from the install, tested against three entries in BUGS-TO-REPORT.md:
//
//   "With bin\twinBASIC_ide_win32.dll missing, the box names bin\twinBASIC_win64.dll"
//   (bugs/launcher-box-names-wrong-file)
//   "With bin\twinBASIC_win32.dll missing, a box titled shutdown names no file"
//   (bugs/missing-dll-box-names-no-file)
//   "With the compiler variant the IDE starts missing, the page goes quiet after one host box"
//   (bugs/missing-compiler-silent-stop)
//
// A lane of its own, apart from troubleshooting.test.mjs, because each test wants an IDE start of its
// own with a file gone. EVERY FILE IS GONE FROM THE LANE'S OWN COPY OF THE INSTALL (Lane.copy, under
// the lane's work folder; `without` in troubleshooting-kit.mjs refuses any other path) and only for
// that test. No Desktop install is touched.
//
// In the first two tests and the control the host stops before it has a page, so nothing here reaches
// the defaults hook, and none is needed; it has IDE_FLAGS all the same. The boxes are native, on the
// lane's private desktop: each is read and closed there by BM_CLICK, with a limit on every wait. The
// last test's IDE has a page, and the guard (starting-kit.mjs) is in front of it, as in every IDE of
// the chapter's lanes.
//
// Each test states what BETA 1034 does; the test named "control" passes whether or not the defects
// are fixed. If another fails after an IDE update, the IDE has changed: update the entry in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, the callout in
// docs/IDE/Troubleshooting/Missing-Files.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { test } from "node:test";
import { scenario } from "../addin/scenario.mjs";
import { sleep, troubleshootingKit } from "./troubleshooting-kit.mjs";

const LINK = "See https://twinbasic.com/missing";
const NOT_INITIALIZED = [
  "COMPILER: Not initialized",
  "FS: Not initialized",
  "LSP: Not initialized",
  "DEBUGGER: Not initialized",
];

scenario("Files missing from the install", (lane) => {
  const k = troubleshootingKit(lane);

  test("with bin\\twinBASIC_ide_win32.dll missing, the box names bin\\twinBASIC_win64.dll, which is there", {
    timeout: 60 * 1000,
  }, async () => {
    assert.ok(k.inCopy("bin/twinBASIC_win64.dll"));
    const { box, ended } = await k.without(["bin/twinBASIC_ide_win32.dll"], () => k.stoppedStart());
    assert.equal(box.title, "twinBASIC Compiler");
    assert.equal(
      box.text,
      `ERROR: failed to load the twinBASIC DLL:\n    bin\\twinBASIC_win64.dll\n\nThe file could not be found.  ${LINK} \n\nThe application will now exit.`,
    );
    assert.deepEqual(
      box.buttons.map((b) => b.text),
      ["OK"],
    );
    assert.equal(ended, true, "the process went on after OK");
  });

  test("with bin\\twinBASIC_win32.dll missing, a box titled shutdown names no file and gives no link", {
    timeout: 60 * 1000,
  }, async () => {
    const { box, ended } = await k.without(["bin/twinBASIC_win32.dll"], () => k.stoppedStart());
    assert.equal(box.title, "shutdown");
    assert.equal(box.text, "Run-time error '-353703418'\n\nUnable to load DLL");
    assert.equal(ended, true, "the process went on after OK");
  });

  test("control: with bin\\twinBASIC_win32.exe and its variants missing, the box names the file and gives the link", {
    timeout: 60 * 1000,
  }, async () => {
    const gone = ["", "_noDEP", "_LAA", "_noDEP_LAA"]
      .map((v) => `bin/twinBASIC_win32${v}.exe`)
      .filter((f) => k.inCopy(f));
    assert.ok(gone.length >= 2, "the copy has no variants");
    const { box, ended } = await k.without(gone, () => k.stoppedStart());
    assert.equal(box.title, "twinBASIC IDE");
    assert.equal(
      box.text,
      `ERROR: failed to load the twinBASIC EXE:\n    \\bin\\twinBASIC_win32.exe\n\nThe file could not be found.  ${LINK}\n\nThe application will now exit.`,
    );
    assert.equal(ended, true, "the process went on after OK");
  });

  test("with the compiler variant the IDE starts missing, the page goes quiet after one host box: no retry, no line in the console, no message", {
    timeout: 120 * 1000,
  }, async () => {
    await k.without(["bin/twinBASIC_win32_noDEP_LAA.exe"], async () => {
      await k.startIde();
      await k.noProject();
      const m = await k.mark();
      await k.setAnswer("OpenProject", k.probe("Quiet"));
      await k.cmd("tbProject_Open");
      const box = await k.nativeBox(30 * 1000);
      assert.equal(box.title, "twinBASIC IDE");
      assert.equal(
        box.text,
        `ERROR: failed to load the twinBASIC EXE:\n    \\bin\\twinBASIC_win32_noDEP_LAA.exe\n\nThe file could not be found.  ${LINK}\n\nPlease close the IDE, and restore any missing files.`,
      );
      await k.pressBox(box);
      await sleep(12 * 1000);
      assert.deepEqual(await k.nativeBoxes(), [], "the box came again");
      assert.deepEqual(await k.modals(), [], "the page shows something");
      const s = await k.services();
      assert.equal(s.badge, "tB Services: UNAVAILABLE");
      assert.deepEqual(s.tip, NOT_INITIALIZED);
      assert.ok(!(await k.pid()), "a compiler started");
      assert.equal((await k.state()).loaded, false);
      assert.deepEqual(await k.since(m), []);
      assert.deepEqual(
        (await k.events()).filter((e) => e.startsWith("msgBox")),
        [],
      );
      await lane.closeProject();
    });
  });
});
