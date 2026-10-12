// Add > Import... of a file over a file of the same name, tested against the entry in
// BUGS-TO-REPORT.md "Importing a file over a file of the same name crashes the compiler, and when
// that file is open, the next save writes the old text back" (bugs/import-over-open-file). The
// crash comes whether or not the file is open in a tab; only an open file keeps its old text.
//
// A lane of its own, because the import crashes the compiler: the other Project Explorer lanes
// (projects.test.mjs, projects-loss.test.mjs) cannot be taken down with it. It opens
// test/ide/probes/projects (projects-kit.mjs says what the page's guard does) once. The file
// imported is written into the lane's work folder, and the save writes the lane's own copy of the
// project.
//
// The lane fails at its close when the DEBUG CONSOLE holds a NATIVE EXCEPTION line
// (tb-lane.mjs), so the test that has asserted the crash clears the console; the IDE has already
// restarted the compiler by then.
//
// Each test states what BETA 1005 does; the test named "control" passes whether or not the defect
// is fixed. If another fails after an IDE update, the IDE has changed: update the entry in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, the callout on the page of docs/IDE/Projects/
// that carries it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { scenario } from "../addin/scenario.mjs";
import { diskText, J, P, projectKit } from "./projects-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "projects");
const CRASH = /NATIVE EXCEPTION: ACCESS_VIOLATION/;

scenario("Project Explorer: importing over an open file", (lane) => {
  let c;
  // The console's lines from the control's import, which the next test reads.
  let closedImport = null;
  const k = projectKit(() => c);
  const disk = (rel) => diskText(lane.project, rel);

  // A file to import, named `name`, in a folder of its own in the lane's work folder.
  function importable(folder, name, text) {
    const dir = path.join(lane.work, folder);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    writeFileSync(file, text);
    return file;
  }
  // Add > Import... of `file` on a row; the console's lines until the compiler restarted.
  async function importFile(at, file) {
    await k.setAnswer("OpenFiles", file);
    const m = await k.mark();
    await k.addVia(at, "Import...");
    const lines = await k.waitForLine(m, /restarting from FILE/, { timeout: 30 * 1000 });
    await sleep(3000);
    return [...lines, ...(await k.printed(m)).slice(lines.length)];
  }

  before(async () => {
    c = await lane.open(PROJECT);
    assert.equal(await k.guard(), true);
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
  });

  test("control: Add > Import... of a file over one that is not open replaces it in the IDE and on disk", async (t) => {
    const file = importable(
      "imp1",
      "Thing.twin",
      "Class Thing\r\n    ' IMPORTED Thing\r\n    Public Value As Long = 21\r\nEnd Class\r\n",
    );
    closedImport = await importFile(P("Sources/Helpers/Util.twin"), file);
    t.diagnostic(J(closedImport));
    assert.match(await k.ideText(P("Sources/Helpers/Thing.twin")), /IMPORTED Thing/);
    assert.match(disk("Sources/Helpers/Thing.twin"), /IMPORTED Thing/);
  });

  test("Add > Import... of a file over one that is not open crashes the compiler too", async () => {
    assert.ok(closedImport, "the control did not run");
    assert.ok(
      closedImport.some((l) => CRASH.test(l)),
      "no access violation in the console",
    );
    await k.run("tbDebugConsole_Clear");
  });

  test("Add > Import... of a file over one open in a tab crashes the compiler, leaves the old text in the tab, and the next save writes it back over the import", async (t) => {
    await k.doubleClickNode(P("Sources/Helpers/Util.twin"));
    await sleep(1200);
    assert.ok(
      (await k.tabs()).some((x) => x.name === "Util.twin" && x.selected),
      "Util.twin did not open",
    );
    const file = importable("imp2", "Util.twin", "Module Util\r\n    ' IMPORTED Util\r\nEnd Module\r\n");
    const lines = await importFile(P("Sources/Helpers/Util.twin"), file);
    t.diagnostic(J(lines));
    assert.ok(
      lines.some((l) => CRASH.test(l)),
      "no access violation in the console",
    );
    assert.deepEqual(await k.boxes(), [], "something was asked");
    assert.match(disk("Sources/Helpers/Util.twin"), /IMPORTED Util/);
    const ide = await k.ideText(P("Sources/Helpers/Util.twin"));
    assert.doesNotMatch(ide, /IMPORTED Util/);
    assert.match(ide, /UtilTwice/);
    // An edit in the tab, then Ctrl+S.
    await k.doubleClickNode(P("Sources/Helpers/Util.twin"));
    await sleep(800);
    await k.key("End", { ctrl: true });
    await k.key("Enter");
    await k.type("' LATER");
    await sleep(800);
    const m = await k.mark();
    await k.key("s", { ctrl: true });
    await k.waitForLine(m, k.SAVED);
    const saved = disk("Sources/Helpers/Util.twin");
    t.diagnostic(J(saved));
    assert.match(saved, /UtilTwice/);
    assert.match(saved, /' LATER/);
    assert.doesNotMatch(saved, /IMPORTED Util/);
    // The crash is asserted: the lane's close is not to fail on it.
    await k.run("tbDebugConsole_Clear");
  });
});
