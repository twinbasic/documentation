// Project Explorer: the defects that lose work or save it unasked, tested against these entries
// in BUGS-TO-REPORT.md:
//
//   "Delete on the project's row deletes every file, and the next save writes an empty project"
//   (bugs/delete-project-row)
//   "Dragging a folder onto a row inside it nests it without end, and the next save writes a
//   project the IDE cannot open" (bugs/drag-folder-into-itself)
//   "Cut, then Paste onto Resources or Packages, deletes the file and creates it nowhere"
//   (bugs/cut-paste-refused-folder)
//   "Importing a project's file over one with unsaved edits replaces it with no question, and the
//   edits are lost" (bugs/import-project-overwrites)
//   "Delete of a file with unsaved edits does not mention them" (bugs/delete-unsaved-no-warning)
//   "Import of a file saves the project, with every unsaved editor" (bugs/import-file-saves)
//   "Cancel in the Import from twinproj box saves the project and restarts the compiler"
//   (bugs/import-cancel-saves)
//   "Renaming the project saves it, with every unsaved editor" (bugs/rename-project-saves)
//   "Add WinNativeForms package saves the project unasked" (bugs/package-needed-saves)
//   "Nothing stops dragging Sources into another folder" (bugs/drag-special-folder)
//   "Delete on a References entry removes the row but not the reference"
//   (bugs/delete-reference-row)
//   "An Export Path without exportPathIsV2 gets the project's name appended with no separator"
//   (bugs/export-path-v1-no-separator)
//
// Each test, or a control and its test together, opens test/ide/probes/projects afresh (a
// variant of it for two), since most of them change the project or save it; the save writes the
// lane's own copy, in its work folder. projects-kit.mjs says what the page's guard does. A
// project file a test leaves damaged is read with impexp's readProject, and never opened.
//
// Each test states what BETA 1005 does; the tests named "control" pass whether or not the defects
// are fixed. If another fails after an IDE update, the IDE has changed: update the entry in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, the callout on the page of docs/IDE/Projects/
// that carries it, and then this file.
//
// Nothing here reaches SaveSetting, so lanes.mjs names no settings.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  attachIde,
  compileOutcome,
  launchIde,
  shutdownIdeAsync,
  sleep,
  waitForCompile,
} from "../../scripts/lib/tb-ide.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { packTree } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";
import { diskFiles, diskText, J, P, projectKit } from "./projects-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "projects");
const IMPORT = path.join(HERE, "probes", "projects-import");

scenario("Project Explorer: lost work and unasked saves", (lane) => {
  let c;
  const k = projectKit(() => c);

  // The project as the fixture holds it, in a new IDE.
  async function fresh(src = PROJECT) {
    if (c) {
      c.dialogs.length = 0;
      await lane.closeProject();
    }
    c = await lane.open(src);
    assert.equal(await k.guard(), true);
  }
  // A copy of the fixture in the work folder, changed by `change(folder)`.
  function variant(name, change) {
    const dir = path.join(lane.work, "variants", name);
    rmSync(dir, { recursive: true, force: true });
    cpSync(PROJECT, dir, { recursive: true });
    change(dir);
    return dir;
  }
  function editSettings(dir, change) {
    const file = path.join(dir, "Settings");
    const s = JSON.parse(readFileSync(file, "utf8"));
    change(s);
    writeFileSync(file, JSON.stringify(s, null, "\t"));
  }
  const save = async () => {
    const m = await k.mark();
    await k.key("s", { ctrl: true });
    return k.waitForLine(m, k.SAVED);
  };
  const disk = (rel) => diskText(lane.project, rel);

  before(async () => {
    await fresh();
  });

  // ---------------------------------------------------------------- Delete on the project row

  test("control: Delete on Sources shows the box, and Delete deletes nothing", async () => {
    await k.clickNode(P("Sources"));
    await k.key("Delete");
    const box = await k.waitForBox(/Are you sure/);
    assert.ok(box, "no box");
    await k.answer("Delete");
    await sleep(2000);
    assert.equal(await k.exists(P("Sources/Startup.twin")), true);
  });

  test("Delete on the project's row, after a box that reads like a file's, empties the tree, and Ctrl+S writes a project holding no file", async (t) => {
    const m = await k.mark();
    await k.clickNode(P());
    await k.key("Delete");
    const box = await k.waitForBox(/Are you sure/);
    assert.ok(box, "no box");
    assert.match(
      box.text,
      /Are you sure you want to delete '\/ProjectsProbe'\? You will not be able to undo this operation\./,
    );
    await k.answer("Delete");
    await sleep(4000);
    const rows = await c.evaluate(`fs.tree.sectionRoot.querySelectorAll(".treeItem").length`);
    const lines = await k.printed(m);
    t.diagnostic(J({ rows, lines }));
    assert.equal(rows, 0, "the tree still shows rows");
    assert.equal(await k.exists(P("Sources/Startup.twin")), false);
    assert.ok(
      lines.some((l) =>
        /IDE internal error: Uncaught TypeError: Cannot read properties of undefined \(reading 'parentNode'\)/.test(l),
      ),
      "no IDE internal error in the console",
    );
    const saved = await save();
    assert.ok(
      saved.some((l) => k.SAVED.test(l)),
      `the save printed ${J(saved)}`,
    );
    assert.deepEqual(diskFiles(lane.project), { files: [] });
    t.diagnostic(`the project file is ${statSync(lane.project).size} bytes`);
  });

  // ---------------------------------------------------------------- dragging a folder into itself

  test("control: dragging a file onto a folder moves it there", async () => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    const { zone } = await k.drag(P("Sources/Legacy.bas"), P("Sources/Helpers"));
    assert.equal(zone, true, "the folder was not marked as a drop target");
    assert.equal(await k.exists(P("Sources/Helpers/Legacy.bas")), true);
    assert.equal(await k.exists(P("Sources/Legacy.bas")), false);
  });

  // The IDE started on a copy of the project file, as when it is opened from Explorer: what it
  // shows `ms` after it was started. The IDE is ended by its pid either way.
  async function openWithTimeout(file, ms) {
    const t0 = Date.now();
    c.dialogs.length = 0;
    await lane.closeProject();
    c = null;
    const copy = path.join(lane.work, "reopened", "project.twinproj");
    mkdirSync(path.dirname(copy), { recursive: true });
    copyFileSync(file, copy);
    const run = await launchIde({
      exe: lane.copy(),
      project: copy,
      port: lane.port,
      show: lane.show,
      env: { APPDATA: lane.appdataDir() },
    });
    let c2 = null;
    try {
      c2 = await attachIde(lane.port);
      assert.ok(c2, "the IDE never exposed a debug port");
      const outcome = compileOutcome(await waitForCompile(c2, { project: copy, timeout: ms }), { name: copy });
      await sleep(Math.max(0, ms - (Date.now() - t0)));
      const shown = await c2.evaluate(
        `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => m.innerText.replace(/\\s+/g, " ").trim())`,
      );
      const rows = await c2
        .evaluate(`fs.tree.sectionRoot.querySelectorAll(".treeItem").length`)
        .catch((e) => e.message);
      return { outcome: outcome.ok ? "reported open" : outcome.message, shown, rows };
    } finally {
      c2?.close();
      await shutdownIdeAsync(run);
    }
  }

  test("dragging a folder onto a file inside it nests it without end, with no message, and Ctrl+S writes a project file the IDE cannot open", async (t) => {
    const size = statSync(lane.project).size;
    const m = await k.mark();
    await k.msgs();
    await k.drag(P("Sources/Helpers"), P("Sources/Helpers/Thing.twin"));
    await sleep(1500);
    const depth = await c.evaluate(`(() => {
      let n = fs.tree.resolvePath("twinbasic:${P("Sources/Helpers")}"); let d = 0;
      while (n && n.entries && n.entries["helpers"] && d < 50) { n = n.entries["helpers"]; d++; }
      return d;
    })()`);
    const said = { msgs: await k.msgs(), boxes: await k.boxes() };
    t.diagnostic(J({ depth, said }));
    assert.equal(depth, 50, `Helpers holds Helpers ${depth} deep`);
    assert.deepEqual(said, { msgs: [], boxes: [] });
    await k.key("s", { ctrl: true });
    const lines = await k.waitForLine(m, /Maximum call stack size exceeded/);
    t.diagnostic(J(lines));
    assert.ok(
      lines.some((l) => k.SAVED.test(l)),
      "the save printed no [DONE]",
    );
    assert.ok(
      lines.some((l) => /IDE internal error: Uncaught RangeError: Maximum call stack size exceeded/.test(l)),
      "no RangeError in the console",
    );
    const after = statSync(lane.project).size;
    t.diagnostic(J({ size, after }));
    assert.ok(after > size * 5, `the project file went from ${size} to ${after} bytes`);
    // Opened again, the project stays behind the progress box.
    const opened = await openWithTimeout(lane.project, 45 * 1000);
    t.diagnostic(J(opened));
    assert.ok(
      opened.shown.some((s) => /^Please wait\.\.\. \d/.test(s)),
      `45 s after the start the IDE shows ${J(opened.shown)}`,
    );
  });

  // ---------------------------------------------------------------- Cut and Paste onto a refused folder

  test("control: Cut, then Paste onto a folder of Resources, moves the file", async () => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.expand(P("Resources"));
    await k.clickNode(P("Sources/Helpers/Thing.twin"));
    await k.key("x", { ctrl: true });
    await sleep(300);
    await k.clickNode(P("Resources/CUSTOM"));
    await k.key("v", { ctrl: true });
    assert.ok(await waitFor(c, () => k.exists(P("Resources/CUSTOM/Thing.twin"))), "Thing.twin is not in CUSTOM");
    assert.ok(
      await waitFor(c, async () => !(await k.exists(P("Sources/Helpers/Thing.twin")))),
      "Thing.twin is still in Helpers",
    );
  });

  test("Cut, then Paste onto Resources, deletes the file and creates it nowhere, and Ctrl+S saves the project without it", async (t) => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.msgs();
    await k.clickNode(P("Sources/Helpers/Util.twin"));
    await k.key("x", { ctrl: true });
    await sleep(300);
    await k.clickNode(P("Resources"));
    await k.key("v", { ctrl: true });
    await sleep(3000);
    const said = await k.msgs();
    const found = await c.evaluate(`(() => {
      const hits = [];
      const walk = (f) => { for (const n in f.entries || {}) { const e = f.entries[n]; if (/util\\.twin/i.test(e.name)) hits.push(e.getFullPath()); if (e.isFolder) walk(e); } };
      walk(fs.tree.rootFolder);
      return hits;
    })()`);
    t.diagnostic(J({ said, found }));
    assert.deepEqual(said, ["cannot create files inside the root resources folder"]);
    assert.deepEqual(found, []);
    await save();
    const files = diskFiles(lane.project).files;
    assert.ok(files.includes("Sources/Helpers/Thing.twin"), `the project holds ${J(files)}`);
    assert.ok(!files.some((f) => /Util\.twin$/i.test(f)), "the project holds a Util.twin");
  });

  // ---------------------------------------------------------------- importing a project

  // Add > Import... of the packed probes/projects-import; returns the Import from twinproj box.
  async function importProject(at) {
    const file = path.join(lane.work, "ProjectsImport.twinproj");
    packTree(file, IMPORT);
    await k.setAnswer("OpenFiles", file);
    await k.addVia(at, "Import...");
    const box = await k.waitForBox(/Import from twinproj/, { timeout: 20 * 1000 });
    assert.ok(box, "no Import from twinproj box");
    await sleep(1500);
    return box;
  }

  test("importing a project's file over one with unsaved edits replaces it with no question, closes its tab, and the edits are lost", async (t) => {
    await fresh();
    await k.expand(P("Sources"));
    await k.editFile(P("Sources/Startup.twin"), "' UNSAVED EDIT");
    await importProject(P("Sources/Startup.twin"));
    const tick = await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).pop();
      const r = [...m.querySelectorAll(".objListImportItem")].find((r) => r.querySelector(".objListText2")?.textContent.trim() === "Startup.twin");
      const b = r && r.querySelector("#checkMark")?.getBoundingClientRect();
      return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
    })()`);
    assert.ok(tick, "the box lists no Startup.twin");
    await k.clickAt(tick.x, tick.y);
    await sleep(500);
    const m = await k.mark();
    await k.answer("Import");
    const lines = await k.waitForLine(m, /restarting from FILE/, { timeout: 30 * 1000 });
    await sleep(2000);
    const asked = await k.questions();
    const tabs = await k.tabs();
    const ide = await k.ideText(P("Sources/Startup.twin"));
    t.diagnostic(J({ lines, asked, tabs }));
    assert.deepEqual(asked, [], "something was asked");
    assert.ok(!tabs.some((x) => x.name === "Startup.twin"), "Startup.twin's tab is still open");
    assert.match(ide, /IMPORTED VERSION/);
    assert.doesNotMatch(ide, /UNSAVED EDIT/);
    const saved = disk("Sources/Startup.twin");
    assert.match(saved, /IMPORTED VERSION/);
    assert.doesNotMatch(saved, /UNSAVED EDIT/);
  });

  test("Cancel in the Import from twinproj box saves the project, with another file's unsaved edit, and restarts the compiler", async (t) => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.editFile(P("Sources/Helpers/Util.twin"), "' UNSAVED UTIL");
    assert.doesNotMatch(disk("Sources/Helpers/Util.twin"), /UNSAVED UTIL/);
    await importProject(P("Sources/Startup.twin"));
    const m = await k.mark();
    await k.answer("Cancel");
    const lines = await k.waitForLine(m, /restarting from FILE/, { timeout: 30 * 1000 });
    t.diagnostic(J(lines));
    assert.ok(
      lines.some((l) => k.SAVED.test(l)),
      "the project was not saved",
    );
    assert.ok(
      lines.some((l) => /restarting from FILE/.test(l)),
      "the compiler was not restarted",
    );
    assert.match(disk("Sources/Helpers/Util.twin"), /UNSAVED UTIL/);
    assert.equal(disk("Sources/NewMod.twin"), null, "NewMod.twin was imported");
  });

  // ---------------------------------------------------------------- importing a file

  test("Add > Import... of a file imports it and saves the project, with another file's unsaved edit", async (t) => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.editFile(P("Sources/Helpers/Thing.twin"), "' UNSAVED THING");
    const dir = path.join(lane.work, "imp");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "extra.txt"), "a file to import\r\n");
    await k.setAnswer("OpenFiles", path.join(dir, "extra.txt"));
    await k.hostCalls();
    const m = await k.mark();
    await k.addVia(P("Sources/Helpers/Util.twin"), "Import...");
    const lines = await k.waitForLine(m, k.SAVED, { timeout: 30 * 1000 });
    await sleep(1500);
    const calls = (await k.hostCalls()).map((x) => x[0]);
    t.diagnostic(J({ lines, calls }));
    assert.equal(await k.exists(P("Sources/Helpers/extra.txt")), true);
    assert.ok(
      lines.some((l) => k.SAVED.test(l)),
      "the project was not saved",
    );
    assert.deepEqual(await k.questions(), [], "something was asked");
    assert.deepEqual(calls, ["OpenFiles"]);
    assert.match(disk("Sources/Helpers/Thing.twin"), /UNSAVED THING/);
  });

  // ---------------------------------------------------------------- Delete with unsaved edits

  test("control: renaming a file with unsaved edits is refused, naming the editor to close", async () => {
    await fresh();
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.editFile(P("Sources/Helpers/Util.twin"), "' UNSAVED UTIL");
    await k.clickNode(P("Sources/Helpers/Util.twin"));
    await k.key("F2");
    assert.ok(await waitFor(c, () => c.evaluate(`!!document.getElementById("renameInput")`)), "no rename box");
    await k.key("a", { ctrl: true });
    await k.type("Util2.twin");
    await k.key("Enter");
    const box = await k.waitForBox(/Rename\/Move failed/);
    assert.ok(box, "nothing was said");
    assert.match(box.text, /Please close the following editors that are preventing the operation:/);
    await k.answer("OK");
    assert.equal(await k.exists(P("Sources/Helpers/Util.twin")), true);
  });

  test("Delete of a file with unsaved edits asks as for any file, and its tab closes with the edits", async () => {
    // Util.twin still holds the control's unsaved edit.
    assert.equal((await k.tabs()).find((x) => x.name === "Util.twin")?.dirty, true);
    await k.clickNode(P("Sources/Helpers/Util.twin"));
    await k.key("Delete");
    const box = await k.waitForBox(/Are you sure/);
    assert.ok(box, "no box");
    assert.equal(
      box.text,
      `twinBASIC Are you sure you want to delete '${P("Sources/Helpers/Util.twin")}'? You will not be able to undo this operation. Delete Cancel`,
    );
    await k.answer("Delete");
    await sleep(1500);
    assert.equal(await k.exists(P("Sources/Helpers/Util.twin")), false);
    assert.ok(!(await k.tabs()).some((x) => x.name === "Util.twin"), "the tab is still open");
    assert.deepEqual(await k.boxes(), []);
  });

  // ---------------------------------------------------------------- renaming the project

  test("renaming the project's row saves the project, with an unsaved edit in another file", async (t) => {
    await fresh();
    await k.expand(P("Sources"));
    await k.editFile(P("Sources/Startup.twin"), "' UNSAVED START");
    await k.clickNode(P());
    await k.key("F2");
    assert.ok(await waitFor(c, () => c.evaluate(`!!document.getElementById("renameInput")`)), "no rename box");
    await k.key("a", { ctrl: true });
    await k.type("ProjRenamed");
    const m = await k.mark();
    await k.key("Enter");
    const lines = await k.waitForLine(m, k.SAVED);
    await sleep(1000);
    t.diagnostic(J(lines));
    assert.ok(
      lines.some((l) => k.SAVED.test(l)),
      "the project was not saved",
    );
    assert.deepEqual(await k.questions(), [], "something was asked");
    assert.match(disk("Sources/Startup.twin"), /UNSAVED START/);
    assert.equal(JSON.parse(disk("Settings"))["project.name"], "ProjRenamed");
  });

  // ---------------------------------------------------------------- Package needed

  test("Add WinNativeForms package, in the Package needed box, saves the project unasked", async (t) => {
    const src = variant("noforms", (dir) => {
      for (const f of ["frmMain.tbform", "frmMain.twin"]) rmSync(path.join(dir, "Sources", f));
      const startup = path.join(dir, "Sources", "Startup.twin");
      writeFileSync(startup, readFileSync(startup, "utf8").replace(/\r?\n\s*frmMain\.Show/, ""));
      editSettings(dir, (s) => {
        s["project.references"] = s["project.references"].filter((r) => !r.isCompilerPackage);
      });
    });
    await fresh(src);
    const before = JSON.parse(disk("Settings"))["project.references"].map((r) => r.name);
    await k.addVia(P("Sources"), "Add Windows Form");
    const box = await k.waitForBox(/Package needed: WinNativeForms/);
    assert.ok(box, `no Package needed box: ${J(await k.boxes())}`);
    assert.doesNotMatch(box.text, /sav/i);
    const m = await k.mark();
    await k.answer("Add WinNativeForms package");
    const lines = await k.waitForLine(m, /restarting from FILE/, { timeout: 30 * 1000 });
    t.diagnostic(J({ before, lines }));
    assert.ok(
      lines.some((l) => k.SAVED.test(l)),
      "the project was not saved",
    );
    const after = JSON.parse(disk("Settings"))["project.references"].map((r) => r.name);
    assert.ok(!before.includes("WinNativeForms"));
    assert.ok(after.includes("WinNativeForms"), `the saved references are ${J(after)}`);
  });

  // ---------------------------------------------------------------- the special folders

  test("control: renaming Sources is refused: Cannot rename: permission denied.", async () => {
    await fresh();
    await k.msgs();
    await k.clickNode(P("Sources"));
    await k.key("F2");
    assert.ok(await waitFor(c, () => c.evaluate(`!!document.getElementById("renameInput")`)), "no rename box");
    await k.key("a", { ctrl: true });
    await k.type("Src");
    await k.key("Enter");
    await sleep(1500);
    assert.deepEqual(await k.msgs(), ["Cannot rename: permission denied."]);
    assert.equal(await k.exists(P("Sources")), true);
  });

  test("dragging Sources onto Miscellaneous moves it there with no message, and Ctrl+S saves it there", async (t) => {
    await k.msgs();
    const { zone } = await k.drag(P("Sources"), P("Miscellaneous"));
    const said = { msgs: await k.msgs(), boxes: await k.boxes() };
    t.diagnostic(J({ zone, said }));
    assert.equal(await k.exists(P("Miscellaneous/Sources/Startup.twin")), true);
    assert.deepEqual(said, { msgs: [], boxes: [] });
    await save();
    const files = diskFiles(lane.project).files;
    assert.ok(files.includes("Miscellaneous/Sources/Startup.twin"), `the project holds ${J(files)}`);
    assert.ok(!files.includes("Sources/Startup.twin"));
  });

  // ---------------------------------------------------------------- References

  test("Delete on a References entry removes the row, but the reference stays, before and after Ctrl+S", async (t) => {
    await fresh();
    await k.expand(P("References"));
    const entry = (await k.rows()).find((r) => r.path.startsWith(`${P("References")}/Scripting`))?.path;
    assert.ok(entry, "References lists no Scripting entry");
    const items = await k.rightNode(entry);
    await k.closeMenus();
    const greyed = items.filter((i) => /Disabled/.test(i.cls)).map((i) => i.text.split(" ")[0]);
    t.diagnostic(J({ entry, greyed }));
    assert.ok(greyed.includes("Delete"), "the menu's Delete is not greyed");
    await k.clickNode(entry);
    await k.key("Delete");
    assert.ok(await k.waitForBox(/Are you sure/), "no box");
    await k.answer("Delete");
    await sleep(2000);
    assert.equal(await k.exists(entry), false, "the row is still there");
    const refs = () => JSON.parse(disk("Settings"))["project.references"].map((r) => r.name);
    const inIde = JSON.parse(await k.ideText(P("Settings")))["project.references"].map((r) => r.name);
    assert.ok(inIde.includes("Microsoft Scripting Runtime"), `the IDE's references are ${J(inIde)}`);
    await save();
    assert.ok(refs().includes("Microsoft Scripting Runtime"), `the saved references are ${J(refs())}`);
  });

  // ---------------------------------------------------------------- Export Path

  async function exportNow() {
    const m = await k.mark();
    await k.key("e", { ctrl: true });
    const lines = await k.waitForLine(m, /\[EXPORT\] (COMPLETED|export failed)/, { timeout: 60 * 1000 });
    assert.ok(
      lines.some((l) => /\[EXPORT\] COMPLETED/.test(l)),
      `the export printed ${J(lines)}`,
    );
    assert.deepEqual(
      (await k.hostCalls()).filter((x) => x[0] === "ChooseFolder"),
      [],
      "the export asked for a folder",
    );
  }

  test("control: with exportPathIsV2, Export Project writes into the Export Path's folder", async () => {
    const src = variant("export-v2", (dir) =>
      editSettings(dir, (s) => {
        s["project.exportPath"] = "${SourcePath}\\exp3";
        s["project.exportPathIsV2"] = true;
      }),
    );
    await fresh(src);
    await exportNow();
    assert.equal(existsSync(path.join(lane.work, "exp3", "Settings")), true);
  });

  test("without exportPathIsV2, Export Project writes into the Export Path with the project's name appended and no separator", async () => {
    const src = variant("export-v1", (dir) =>
      editSettings(dir, (s) => {
        s["project.exportPath"] = "${SourcePath}\\exp2";
        delete s["project.exportPathIsV2"];
      }),
    );
    await fresh(src);
    await exportNow();
    assert.equal(existsSync(path.join(lane.work, "exp2ProjectsProbe", "Settings")), true);
    assert.equal(existsSync(path.join(lane.work, "exp2")), false);
  });
});
