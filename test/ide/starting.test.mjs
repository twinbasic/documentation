// Starting a project: the New / Open Project dialog, opening projects and importing a VB6 project,
// tested against thirteen entries in BUGS-TO-REPORT.md:
//
//   "The next project opened after a DEP / LAA reload and New Project Options takes the earlier
//   project's whole Settings, silently" (bugs/open-takes-earlier-settings)
//   "A recovered project is not marked changed, and Save overwrites the damaged file with what was
//   recovered" (bugs/recovered-project-save-overwrites)
//   "A resource whose type is a string imports with an empty name, and the build then ends in an
//   access violation" (bugs/res-string-type-empty-name)
//   "After New Project Options, the first open of a saved project with LAA off fails with MISMATCHED
//   LAA OR DEP AWARENESS" (bugs/laa-mismatch-after-new-project)
//   "A project damaged inside its Settings shows the bad file format box again after every OK"
//   (bugs/damaged-settings-box-loop)
//   "In the New / Open Project dialog, Enter on a button Tab highlighted also opens the selected
//   item" (bugs/new-project-enter-acts-twice)
//   "Import from VBP... and Import from folder... close the open project before their picker opens"
//   (bugs/import-card-closes-project-first)
//   "The Project Name box filters keys, not text, so a pasted name keeps a space or a dot"
//   (bugs/project-name-paste-unfiltered)
//   "The New / Open Project dialog has keyboard dead ends" (bugs/new-project-keyboard-dead-ends)
//   "--no-save-ide-settings does not guard three settings, and is read after the first-run
//   questions" (bugs/no-save-flag-unguarded-saves)
//   "A Recent path holding # shows cut in two" (bugs/recent-path-hash-cut)
//   "New / Open Project search rows show the internal path" (bugs/front-page-search-internal-paths)
//   "Two search words in one line of a row lose the first mark" (bugs/front-page-search-one-mark)
//
// Three IDEs, one after the other. The first has every test but three, each from a page of its own
// (fresh in starting-kit.mjs reloads the page, so its variables start again and no project is open).
// The second has the resource tests: a build that crashes leaves TRACE-MODE on for that IDE. The
// third has the test of the box that never ends, which then ends that IDE by its pid.
//
// A native picker never opens: the guard (starting-kit.mjs) answers every one from the page. The
// compiler's own boxes are native, on the lane's private desktop, and are found and pressed there.
// THE RECENT LIST IS WRITTEN BY NOTHING HERE: --no-update-recent-files stays on, and every recent
// call is answered in the page. No save reaches the registry: the guard records and drops every
// SaveIDESetting, in front of the defaults hook. Every project opened, damaged, saved or built is in
// the lane's work folder, and nothing reaches SaveSetting, so lanes.mjs names no settings.
//
// The tests share the lane's IDE in order. Each test states what BETA 1034 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the IDE
// has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the callout on
// the page of docs/IDE/Starting/ that carries it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { clickAt, pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { unpackProject } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";
import { menu, press } from "./building-kit.mjs";
import { fileResources, fileSettings, fileSources, J, layout, sleep, startingKit } from "./starting-kit.mjs";

const ID = (n) => `{5B000000-0000-4000-8000-00000000000${n}}`;
const SOURCES = ["MainMod.twin", "Second.twin", "Third.twin", "Thing.twin"];
const B = (t) => Buffer.from(t);
const BAD_FORMAT = "WARNING: failed to deserialize file system.  Some files might be lost or truncated.";
const RECENTS = "C:\\dev\\C#\\app.twinproj?C:\\Projects\\Alpha.twinproj?C:\\Projects\\Beta.twinproj";

scenario("Starting a project", (lane) => {
  const k = startingKit(lane);

  // A saved project with LAA off, as the Standard EXE template's file is: the IDE starts with LAA on,
  // so opening this one reloads it.
  const old = (name = "Old") =>
    k.project(name, { "project.name": "OldProbe", "project.appTitle": "Old title", "project.id": ID(1) });
  // One with LAA on, which puts the IDE back as it started.
  const newer = () =>
    k.project("Newer", {
      "project.name": "NewerProbe",
      "project.appTitle": "Newer title",
      "project.id": ID(2),
      "project.largeAddressAware": true,
    });
  // The project that is opened last. Everything a test looks at differs from the earlier projects'.
  const target = (name = "Target") =>
    k.project(name, {
      "project.name": "TargetProbe",
      "project.appTitle": "Target title",
      "project.description": "Target description",
      "project.buildPath": "${SourcePath}\\Target.exe",
      "project.id": ID(3),
      "project.largeAddressAware": true,
    });
  const assertOwnSettings = async () => {
    const st = await k.settings();
    assert.equal(st["project.name"], "TargetProbe");
    assert.equal(st["project.appTitle"], "Target title");
    assert.equal(st["project.id"], ID(3));
  };

  before(async () => {
    lane.includeProjects();
    await k.startIde();
  });

  // ------------------------------------------------------------- N2

  test("after a DEP / LAA reload and then New Project Options, the next project opened takes the earlier project's whole Settings, silently, and Ctrl+S writes them into its file", async () => {
    await k.noProject();
    await k.open(old());
    assert.deepEqual(await k.flags(), { use: true, last: null, laa: false });
    await k.open(newer());
    assert.deepEqual(await k.flags(), { use: true, last: null, laa: true });
    await k.newProject("Zzz");
    assert.deepEqual(await k.flags(), { use: true, last: "Zzz", laa: true });
    const file = target();
    const bytes = readFileSync(file);
    await k.open(file);
    const st = await k.settings();
    assert.equal(st["project.name"], "Zzz");
    assert.equal(st["project.appTitle"], "Zzz");
    assert.notEqual(st["project.id"], ID(3));
    assert.notEqual(st["project.buildPath"], "${SourcePath}\\Target.exe");
    assert.equal(st["project.startupObject"], "Form1");
    assert.equal(st["project.references"].length, 3);
    const s = await k.state();
    assert.equal(s.title, "Target.twinproj");
    assert.equal(s.dirty, false);
    assert.deepEqual(s.root, ["zzz"]);
    assert.deepEqual(await k.box(), []);
    assert.deepEqual((await k.sources()).sort(), [...SOURCES].sort(), "the sources are the opened project's");
    assert.ok(readFileSync(file).equals(bytes), "opening changed the file");
    await k.saveAndWait(file);
    const saved = fileSettings(file);
    assert.equal(saved["project.name"], "Zzz");
    assert.equal(saved["project.appTitle"], "Zzz");
    assert.equal(saved["project.startupObject"], "Form1");
    assert.notEqual(saved["project.id"], ID(3));
    assert.notEqual(saved["project.description"], "Target description");
  });

  test("control: the next open after that one is right, and New Project Options has to come again to repeat it", async () => {
    await k.close();
    await k.open(target("TargetAgain"));
    await assertOwnSettings();
    assert.deepEqual(await k.flags(), { use: false, last: null, laa: true });
  });

  test("the same steps by an import: a project with LAA off, Import from VBP..., then any project, and closing without a save leaves its file as it was", async () => {
    await k.noProject();
    await k.open(old());
    await k.close();
    await k.importVbp(k.vbp("n2-vbp"), "Zzz");
    assert.deepEqual(await k.flags(), { use: true, last: "Zzz", laa: true });
    assert.match((await k.close()).join(), /You've made changes to this project/);
    const file = target("TargetImport");
    const bytes = readFileSync(file);
    await k.open(file);
    const st = await k.settings();
    assert.equal(st["project.name"], "Zzz");
    assert.equal(st["project.appTitle"], "Probe");
    assert.equal(st["project.startupObject"], "Sub Main");
    assert.equal((await k.state()).title, "TargetImport.twinproj");
    assert.deepEqual(await k.close(), [], "closing asked something");
    assert.ok(readFileSync(file).equals(bytes), "closing changed the file");
  });

  test("control: New Project Options alone, with no reload before it, leaves the next project its own Settings", async () => {
    await k.noProject();
    await k.newProject("Zzz");
    await k.close();
    await k.open(target("TargetDialogOnly"));
    await assertOwnSettings();
    assert.deepEqual(await k.flags(), { use: false, last: "Zzz", laa: true });
  });

  test("control: a reload alone, with no New Project Options, opens a project with LAA off and leaves the next project its own Settings", async () => {
    await k.noProject();
    const file = old("OldAlone");
    await k.open(file);
    assert.equal((await k.settings())["project.name"], "OldProbe");
    await k.open(target("TargetReloadOnly"));
    await assertOwnSettings();
  });

  test("control: a new project made while the IDE runs with LAA off reloads, which uses up the earlier Settings, and the next project keeps its own", async () => {
    await k.noProject();
    await k.open(old("OldThenNew"));
    await k.newProject("Zzz");
    assert.deepEqual(await k.flags(), { use: false, last: null, laa: true });
    await k.open(target("TargetStuck"));
    await assertOwnSettings();
  });

  // ------------------------------------------------------------- N4

  test("with New Project Options first and no reload yet, opening a saved project with LAA off fails with MISMATCHED LAA OR DEP AWARENESS, and a second open works", async () => {
    await k.noProject();
    await k.newProject("Zzz");
    await k.close();
    const file = old("OldMismatch");
    const bytes = readFileSync(file);
    await k.setAnswer("OpenProject", file);
    await k.cmd("tbProject_Open");
    const shown = await waitFor(k.c, async () => (await k.box()).find((b) => /MISMATCHED/.test(b)) ?? null, {
      timeout: 20 * 1000,
    });
    assert.match(shown, /Failed to load the project \(error code MISMATCHED LAA OR DEP AWARENESS\)/);
    assert.match(shown, /\{Remove It\/Keep It\}$/);
    await k.button("Keep It");
    await sleep(500);
    const s = await k.state();
    assert.equal(s.loaded, false);
    assert.equal(s.services, "UNAVAILABLE");
    assert.ok(readFileSync(file).equals(bytes), "the failed open changed the file");
    await k.open(file);
    assert.equal((await k.settings())["project.name"], "OldProbe");
  });

  // ------------------------------------------------------------- N1

  const cut = async () => {
    const m = await k.masterBytes();
    const lay = layout(m);
    const at = (n) => lay.find((e) => e.file && e.full.endsWith(n));
    const middle = (e) => e.contentAt + Math.floor(e.len / 2);
    return {
      master: m,
      settings: at("Settings"),
      // Cut inside the second source: Settings is read, every source is lost.
      inSources: m.subarray(0, middle(at("Second.twin"))),
      // Cut inside the resource after Sources: every source is kept, the resource is lost.
      inResources: m.subarray(0, middle(at("#201"))),
      // Cut before the first entry: nothing is read.
      atFirstEntry: m.subarray(0, at("Settings").start),
    };
  };
  // A project whose Settings could not be read has LAA off, so it reloads, and the box shows twice.
  const assertBoxes = (seen, count = 1) => {
    assert.equal(seen.length, count, J(seen));
    for (const b of seen) {
      assert.equal(b.title, "bad file format");
      assert.deepEqual(b.texts, [BAD_FORMAT]);
      assert.deepEqual(
        b.buttons.map((x) => x.text),
        ["OK"],
      );
    }
  };

  test("a project cut inside its Sources tree opens with every source gone and is not marked changed, and Ctrl+S overwrites the damaged file with no question", async () => {
    const { inSources } = await cut();
    const file = k.damaged("n1-ctrl-s", inSources);
    await k.noProject();
    assertBoxes(await k.openDamaged(file));
    const s = await k.state();
    assert.equal(s.title, "Damaged.twinproj");
    assert.equal(s.dirty, false);
    assert.deepEqual(await k.sources(), []);
    assert.equal((await k.settings())["project.name"], "Throwaway");
    await k.events();
    await k.saveAndWait(file);
    assert.deepEqual(await k.events(), [], "the save asked something");
    assert.deepEqual(await k.box(), []);
    assert.ok(statSync(file).size !== inSources.length, "the file was not written");
    assert.deepEqual(fileSources(file), []);
    await k.close();
  });

  test("a project cut at its first entry opens as RECOVERED_PROJECT, and Ctrl+S overwrites the file with that empty project", async () => {
    const { atFirstEntry } = await cut();
    const file = k.damaged("n1-first", atFirstEntry);
    await k.noProject();
    assertBoxes(await k.openDamaged(file), 2);
    const s = await k.state();
    assert.equal(s.dirty, false);
    assert.deepEqual(s.root, ["recovered_project"]);
    await k.saveAndWait(file);
    assert.deepEqual(fileSources(file), []);
    assert.equal(fileSettings(file)["project.name"], "RECOVERED_PROJECT");
    await k.close();
  });

  test("Add > Import... in a project cut after its sources overwrites the damaged file, with nothing pressed that says Save", async () => {
    const { inResources } = await cut();
    const file = k.damaged("n1-import", inResources);
    const note = path.join(k.folder("n1-import"), "note.txt");
    writeFileSync(note, "a note\r\n");
    await k.noProject();
    assertBoxes(await k.openDamaged(file));
    assert.deepEqual((await k.sources()).sort(), [...SOURCES].sort());
    await k.setAnswer("OpenFiles", note);
    await k.c.evaluate(`fs.tree.selectedItems = [fs.tree.resolvePath("twinbasic:/Throwaway/Sources")], true`);
    await k.events();
    await k.c.evaluate("importFile(), true");
    await waitFor(k.c, () => statSync(file).size !== inResources.length, { timeout: 15 * 1000, interval: 100 });
    assert.deepEqual(await k.box(), []);
    assert.deepEqual(await k.events(), ["dialog OpenFiles"]);
    assert.deepEqual(fileResources(file), []);
    assert.ok(fileSources(file).includes("Second.twin"));
    await k.close();
  });

  test("a change in Project Settings that restarts the compiler overwrites the damaged file, with nothing pressed that says Save", async () => {
    const { inSources } = await cut();
    const file = k.damaged("n1-settings", inSources);
    await k.noProject();
    assertBoxes(await k.openDamaged(file));
    await k.cmd("tbProject_ShowSettings");
    const CONFIG = `[...document.querySelectorAll("*")].find((e) => e.globalVars?.configData)?.globalVars`;
    assert.ok(await waitFor(k.c, () => k.c.evaluate(`!!${CONFIG}`), { timeout: 20 * 1000 }), "no Project Settings");
    await sleep(2500);
    const section = await k.c.evaluate(
      `(() => { const e = [...document.querySelectorAll(".modalDialogContainer *")].filter((x) => x.children.length === 0 && x.getBoundingClientRect().width && /^Library References/.test(x.textContent.trim())).pop(); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`,
    );
    assert.ok(section, "no Library References");
    await clickAt(k.c, section.x, section.y);
    await sleep(1200);
    const tick = await k.c.evaluate(
      `(() => { const row = [...document.querySelectorAll(".referencesListRow")].find((r) => r.getBoundingClientRect().height && /OLE Automation/.test(r.innerText)); if (!row) return null; row.scrollIntoView({ block: "center" }); const q = row.querySelector(".referencesListColEnabled").getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`,
    );
    assert.ok(tick, "no OLE Automation row");
    await clickAt(k.c, tick.x, tick.y);
    await sleep(700);
    await k.clickInModal("Apply Changes", "*");
    const ok = await waitFor(k.c, () => statSync(file).size !== inSources.length, {
      timeout: 15 * 1000,
      interval: 100,
    });
    assert.ok(ok, "the file was not written");
    await k.waitReady();
    assert.deepEqual(fileSources(file), []);
    assert.equal(fileSettings(file)["project.references"].length, 0);
    await k.close();
  });

  test("control: closing a recovered project leaves the damaged file as it was, and Save Project As to a new name keeps it too", async () => {
    const { inSources } = await cut();
    const file = k.damaged("n1-control", inSources);
    await k.noProject();
    assertBoxes(await k.openDamaged(file));
    assert.deepEqual(await k.close(), [], "closing asked something");
    assert.ok(readFileSync(file).equals(inSources), "closing changed the file");
    assertBoxes(await k.openDamaged(file));
    const other = path.join(path.dirname(file), "NewName.twinproj");
    await k.setAnswer("SaveProjectAs", other);
    await k.cmd("tbProject_SaveAs");
    await waitFor(k.c, () => existsSync(other), { timeout: 10 * 1000, interval: 100 });
    await sleep(800);
    assert.ok(readFileSync(file).equals(inSources), "Save As changed the damaged file");
    assert.equal(fileSettings(other)["project.name"], "Throwaway");
    await k.close();
  });

  // ------------------------------------------------------------- D13

  const tabs = async (n) => {
    for (let i = 0; i < n; i++) await k.key("Tab");
  };
  const plainSaved = (name) =>
    k.project(name, { "project.name": "MyProject", "project.largeAddressAware": true, "project.id": ID(4) });

  test("with the highlight moved to Open by Tab, Enter runs the open twice", async () => {
    await k.fresh({ blockOpen: true });
    await tabs(3);
    assert.deepEqual((await k.dialog()).hilite, ["Open"]);
    await k.events();
    await k.key("Enter");
    await sleep(300);
    assert.deepEqual(await k.events(), ["open $\\_Standard EXE", "open $\\_Standard EXE"]);
  });

  test("with the highlight moved to Browse... by Tab, Enter opens the picker and the selected item", async () => {
    await k.fresh({ blockOpen: true });
    await tabs(2);
    assert.deepEqual((await k.dialog()).hilite, ["Browse..."]);
    await k.events();
    await k.key("Enter");
    await sleep(300);
    assert.deepEqual(await k.events(), ["dialog OpenProject", "open $\\_Standard EXE"]);
  });

  test("with the highlight moved to Cancel by Tab, Enter closes a saved project with no question and opens the selected card", async () => {
    await k.noProject();
    const file = plainSaved("Saved");
    await k.open(file);
    await k.cmd("tbProject_New");
    await k.waitStartDialog(8000);
    await tabs(4);
    assert.deepEqual((await k.dialog()).hilite, ["Cancel"]);
    await k.key("Enter");
    await k.waitOptions();
    const s = await k.state();
    assert.equal(s.loaded, false);
    assert.equal(s.file, null);
    await k.button("Cancel");
    await sleep(1200);
    const after = await k.state();
    assert.equal(after.loaded, false);
    assert.equal(after.services, "UNAVAILABLE");
    assert.deepEqual(await k.box(), []);
  });

  test("control: Esc, and a click on Cancel, close the dialog and keep the project", async () => {
    await k.noProject();
    await k.open(plainSaved("SavedControl"));
    await k.cmd("tbProject_New");
    await k.waitStartDialog(8000);
    await tabs(4);
    await k.key("Escape");
    await sleep(600);
    assert.equal((await k.state()).loaded, true);
    assert.equal(await k.dialog(), null);
    await k.cmd("tbProject_New");
    await k.waitStartDialog(8000);
    await k.button("Cancel");
    await sleep(600);
    assert.equal((await k.state()).loaded, true);
    assert.equal(await k.dialog(), null);
  });

  test("Enter on a focused card opens the selected card, not the focused one", async () => {
    await k.fresh({ blockOpen: true });
    await k.clickItem(/^ActiveX DLL/);
    const p = await k.c.evaluate(
      `(() => { const r = document.querySelector("#fp2root .fp2-search").getBoundingClientRect(); return { x: r.x + 50, y: r.y + r.height / 2 }; })()`,
    );
    await clickAt(k.c, p.x, p.y);
    await sleep(150);
    await k.key("Tab");
    const d = await k.dialog();
    assert.equal(d.selected, "ActiveX DLL");
    assert.equal(d.focus, "card:Standard EXE");
    await k.events();
    await k.key("Enter");
    await sleep(300);
    assert.deepEqual(await k.events(), ["open $\\_ActiveX DLL"]);
  });

  // ------------------------------------------------------------- D4

  const closedFirst = (events, picker) => {
    assert.ok(events.indexOf("call closeProjectNow") >= 0, J(events));
    assert.ok(events.indexOf("call closeProjectNow") < events.indexOf(`dialog ${picker}`), J(events));
  };
  const assertNothingLeft = async () => {
    const s = await k.state();
    assert.equal(s.loaded, false);
    assert.equal(s.services, "UNAVAILABLE");
    assert.equal(await k.dialog(), null);
    assert.deepEqual(await k.box(), []);
  };

  test("Import from VBP... closes the open project before its picker opens, and cancelling the picker leaves no project and no dialog", async () => {
    await k.noProject();
    await k.open(plainSaved("SavedVbp"));
    await menu(k.c, "File", "New Project...");
    await k.waitStartDialog(8000);
    await k.events();
    await k.dblItem(/^Import from VBP/);
    await sleep(1500);
    closedFirst(await k.events(), "OpenProjectVBP");
    await assertNothingLeft();
  });

  test("Import from folder... closes the open project before its picker opens, and cancelling the picker leaves no project and no dialog", async () => {
    await k.noProject();
    await k.open(plainSaved("SavedFolder"));
    await menu(k.c, "File", "New Project...");
    await k.waitStartDialog(8000);
    await k.events();
    await k.dblItem(/^Import from folder/);
    await sleep(1500);
    closedFirst(await k.events(), "ChooseFolder");
    await assertNothingLeft();
  });

  test("control: File > Open Project... cancelled, and Browse... cancelled, keep the project", async () => {
    await k.noProject();
    await k.open(plainSaved("SavedOpen"));
    await k.events();
    await k.setAnswer("OpenProject", "");
    await menu(k.c, "File", "Open Project...");
    await sleep(800);
    assert.deepEqual(await k.events(), ["dialog OpenProject"]);
    assert.equal((await k.state()).loaded, true);
    await menu(k.c, "File", "New Project...");
    await k.waitStartDialog(8000);
    await k.button("Browse...");
    await sleep(800);
    assert.deepEqual(await k.events(), ["dialog OpenProject"]);
    assert.equal((await k.state()).loaded, true);
  });

  // ------------------------------------------------------------- D7

  test("control: the Project Name box takes out of typed text what a project name cannot hold", async () => {
    await k.fresh();
    await k.dblItem(/^Standard EXE$/);
    await k.waitOptions();
    await k.typeName("My Project.x_1");
    assert.equal(await k.nameBox(), "MyProjectx_1");
    await k.typeName("_lead");
    assert.equal(await k.nameBox(), "lead");
  });

  test("a name pasted into Project Name keeps its space and its dot, and becomes the project's name, title and root folder; it builds with no diagnostic", async () => {
    await k.selectName();
    await k.c.send("Input.insertText", { text: "My Project.x" });
    await sleep(150);
    assert.equal(await k.nameBox(), "My Project.x");
    await k.button("Continue");
    await sleep(400);
    await k.waitReady();
    const st = await k.settings();
    assert.equal(st["project.name"], "My Project.x");
    assert.equal(st["project.description"], "My Project.x");
    assert.equal(st["project.appTitle"], "My Project.x");
    assert.deepEqual((await k.state()).root, ["my project.x"]);
    const saved = path.join(k.folder("d7"), "Named.twinproj");
    await k.setAnswer("SaveProjectAs", saved);
    await pressKey(k.c, "s", { ctrl: true });
    await waitFor(k.c, () => existsSync(saved), { timeout: 10 * 1000, interval: 100 });
    await sleep(1500);
    const r = await press(k.c, "build");
    assert.ok(
      existsSync(path.join(k.folder("d7"), "Build", "My Project.x_win32.exe")),
      `no exe: ${r.lines.slice(-4).join(" | ")}`,
    );
  });

  // ------------------------------------------------------------- D19

  test("Up and Down do nothing in the search box, which has the focus when the dialog opens", async () => {
    await k.fresh({ blockOpen: true });
    const d = await k.dialog();
    assert.equal(d.focus, "search");
    assert.equal(d.selected, "Standard EXE");
    await k.key("ArrowDown");
    await k.key("ArrowDown");
    await k.key("ArrowUp");
    const after = await k.dialog();
    assert.equal(after.selected, "Standard EXE");
    assert.equal(after.focus, "search");
  });

  test("control: Tab, then the arrows, move the selected item in New", async () => {
    await k.key("Tab");
    await k.key("ArrowDown");
    await k.key("ArrowDown");
    const d = await k.dialog();
    assert.equal(d.selected, "ActiveX DLL");
    assert.equal(d.focus, "card:Standard EXE");
  });

  test("no key reaches the rail: Tab and the arrows leave the section as it was", async () => {
    await k.fresh({ blockOpen: true });
    for (const name of ["Tab", "ArrowDown", "ArrowLeft", "Tab", "Tab", "ArrowUp", "ArrowRight", "Tab", "ArrowLeft"]) {
      await k.key(name);
      assert.equal((await k.dialog()).rail, "New", `after ${name}`);
    }
  });

  test("in Recent, Tab sends the focus out of the dialog, and the keyboard does nothing until a click", async () => {
    await k.fresh({ blockOpen: true, recents: RECENTS });
    await k.button("Cancel");
    await k.cmd("tbProject_OpenRecent");
    await k.waitStartDialog(8000);
    const d = await k.dialog();
    assert.equal(d.rail, "Recent");
    assert.equal(d.focus, "search");
    await k.key("Tab");
    assert.equal((await k.dialog()).focus, "body");
    await k.key("Tab");
    assert.equal((await k.dialog()).focus, "DIV.sectionHeader");
    await k.events();
    for (const name of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) {
      await k.key(name);
      const now = await k.dialog();
      assert.ok(now, `${name} closed the dialog`);
      assert.equal(now.selected, d.selected, `after ${name}`);
    }
    assert.deepEqual(await k.events(), []);
    const blank = await k.c.evaluate(
      `(() => { const r = document.querySelector("#fp2root .fp2-sectionDesc").getBoundingClientRect(); return { x: r.x + r.width - 8, y: r.y + r.height / 2 }; })()`,
    );
    await clickAt(k.c, blank.x, blank.y);
    await sleep(150);
    await k.key("ArrowDown");
    assert.notEqual((await k.dialog()).selected, d.selected, "a click did not give the keyboard back");
  });

  // ------------------------------------------------------------- the flags

  test("with --no-save-ide-settings, closing the New / Open Project dialog calls SaveIDESetting for NEWFRONTPAGE all the same", async () => {
    await k.fresh();
    assert.equal(await k.c.evaluate("g_DontSaveIdeSettings"), true);
    await k.saves();
    await k.button("Cancel");
    await sleep(300);
    assert.deepEqual(await k.saves(), [["NEWFRONTPAGE", '{"section":"new"}']]);
  });

  test("with --no-save-ide-settings, a change in the Object Browser calls SaveIDESetting for OBJECT_BROWSER all the same", async () => {
    await k.open(plainSaved("SavedBrowser"));
    await k.cmd("tbShowObjectBrowser");
    await waitFor(k.c, () => k.c.evaluate("!!window.__twinBasicObjectBrowser"), { timeout: 10 * 1000 });
    await sleep(500);
    await k.saves();
    const p = await k.c.evaluate(
      `(() => { const b = window.__twinBasicObjectBrowser.element.querySelector(".tbob-viewbutton[aria-pressed=false]"); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
    );
    await clickAt(k.c, p.x, p.y);
    await sleep(500);
    assert.deepEqual([...new Set((await k.saves()).map((s) => s[0]))], ["OBJECT_BROWSER"]);
  });

  test("with --no-save-ide-settings, saving the publisher's details calls SaveIDESetting for PUBLISHER all the same", async () => {
    await k.fresh({ settings: { PUBLISHER: "" } });
    await k.saves();
    await k.c.evaluate(
      `(async () => {
        packagePublisherName = "TestPublisher"; packagePublisherPassword = ""; packagePublisherRememberPassword = false;
        await new Promise((r) => savePublisherInfo(r));
      })()`,
      { awaitPromise: true },
    );
    assert.deepEqual(await k.saves(), [["PUBLISHER", "(value not kept)"]]);
  });

  test("control: with --no-save-ide-settings, a build target chosen for a saved project is not saved", async () => {
    await k.noProject();
    await k.open(plainSaved("SavedTarget"));
    await k.saves();
    await k.c.evaluate(`(() => { buildConfigSelector.value = "win64"; buildConfigSelector.onchange(); })()`);
    await sleep(800);
    await k.waitReady();
    assert.deepEqual(await k.saves(), []);
  });

  test("--no-save-ide-settings is read only after the first-run questions: the licence answers are saved with it on the command line", async () => {
    await k.fresh({ settings: { GENERAL: "", LICENCEAGREEMENTV3: "", ALLOWERRORREPORTINGV3: "" } }, { wait: false });
    await waitFor(k.c, async () => (await k.modals()).some((t) => t.includes("Licence Agreement")), {
      timeout: 20 * 1000,
    });
    assert.equal(await k.c.evaluate("g_DontSaveIdeSettings"), false);
    await k.saves();
    await k.button("I AGREE");
    await waitFor(k.c, async () => (await k.modals()).some((t) => t.includes("Automatic Error Reporting")), {
      timeout: 10 * 1000,
    });
    const saved = await k.saves();
    assert.deepEqual(
      saved.map((s) => s[0]),
      ["LICENCEAGREEMENTV3", "ALLOWERRORREPORTINGV3"],
    );
    assert.match(saved[0][1], /^AGREED_/);
    assert.match(saved[1][1], /^DISAGREED_/);
    await k.button("NO");
    await waitFor(k.c, async () => (await k.modals()).some((t) => t.includes("IDE Options")), { timeout: 10 * 1000 });
    assert.equal(await k.c.evaluate("g_DontSaveIdeSettings"), false);
    await k.key("Escape");
    await k.waitStartDialog(20 * 1000);
    assert.equal(await k.c.evaluate("g_DontSaveIdeSettings"), true);
  });

  // ------------------------------------------------------------- D16, D17, D18

  test("a Recent path with a # shows cut in two, at the #, and opens from the whole path", async () => {
    await k.fresh({ blockOpen: true, recents: RECENTS });
    await k.section("Recent");
    await sleep(200);
    assert.deepEqual((await k.items())[0], ["C:\\dev\\C | \\app.twinproj", "C:\\dev\\C#\\app.twinproj"]);
    await k.events();
    await k.button("Open");
    assert.deepEqual(await k.events(), ["open C:\\dev\\C#\\app.twinproj"]);
  });

  test("control: a Recent path with no # shows whole", async () => {
    assert.deepEqual((await k.items())[1], ["C:\\Projects\\Alpha.twinproj", "C:\\Projects\\Alpha.twinproj"]);
  });

  const search = async (text) => {
    await k.c.evaluate(
      `(() => { const i = document.querySelector("#fp2root .fp2-search"); i.focus(); i.select(); })()`,
    );
    await k.key("Backspace");
    await typeText(k.c, text);
    await sleep(250);
    return k.searchRows();
  };

  test("search rows of the IDE's own items show the internal path, and $ alone for an import card", async () => {
    await k.fresh();
    assert.deepEqual(await search("sample 10"), [["twinBASIC IDE Addin", "$\\Sample <<10>>.    twinBASIC IDE Addin"]]);
    assert.deepEqual(await search("vbp"), [["Import from <<VBP>>...", "$"]]);
    assert.equal((await search("$")).length, 34);
  });

  test("control: a search row of a Recent project shows its path, marked", async () => {
    await k.fresh({ recents: RECENTS });
    assert.deepEqual(await search("alpha"), [["C:\\Projects\\<<Alpha>>.twinproj"]]);
  });

  test("two search words in one line of a row lose the first mark", async () => {
    await k.fresh();
    const rows = await search("standard console");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].at(-1), "$\\_Standard EXE#(<<Console>> App)");
  });

  test("control: search words in different lines of a row are each marked", async () => {
    const rows = await search("standard console");
    assert.deepEqual(rows[0].slice(0, 2), ["<<Standard>> EXE", "(<<Console>> App)"]);
  });

  // ------------------------------------------------------------- N3, an IDE of its own

  test("control: a .res of numeric types imports with its ids and builds", async () => {
    await lane.closeProject();
    await k.startIde();
    await k.button("Cancel");
    await sleep(300);
    await k.importVbp(
      k.vbp("res-numeric", [
        [10, 201, B("rcdata numeric id")],
        [10, "RCNAMED", B("rcdata string id")],
        [300, 301, B("numeric type, numeric id")],
      ]),
    );
    const rows = (await k.resources()).map((r) => `${r[0]}/${r[1]}`);
    for (const r of ["RCDATA/#201", "RCDATA/RCNAMED", "#300/#301"]) assert.ok(rows.includes(r), J(rows));
    const saved = path.join(k.folder("res-numeric/out"), "ProbeRes.twinproj");
    await k.setAnswer("SaveProjectAs", saved);
    await pressKey(k.c, "s", { ctrl: true });
    await waitFor(k.c, () => existsSync(saved), { timeout: 10 * 1000, interval: 100 });
    await sleep(1500);
    await press(k.c, "build");
    assert.ok(existsSync(path.join(path.dirname(saved), "Probe.exe")), "no exe");
    await k.close();
  });

  test("a .res resource whose type is a string imports with an empty name, one blank 0-byte row for all of them, and a Standard EXE then ends its build in ACCESS_VIOLATION with no exe", async () => {
    const vbp = k.vbp("res-named", [
      ["CUSTOM", 101, B("custom data")],
      ["CUSTOM", 102, B("second custom data")],
      ["CUSTOM", "NAMEDRES", B("custom type, string id")],
      [10, 201, B("rcdata numeric id")],
    ]);
    await k.importVbp(vbp);
    const rows = (await k.resources()).filter((r) => r[0] === "CUSTOM");
    assert.deepEqual(rows, [["CUSTOM", "", ""]]);
    assert.equal(await k.readFile("Resources/CUSTOM/"), "", "the IDE reads the row as 0 bytes");
    assert.match(await k.readFile("Sources/__IMPORT_LOG.md"), /IMPORT FINISHED WITH 0 ERRORS\/WARNINGS/);
    const saved = path.join(k.folder("res-named/out"), "ProbeRes.twinproj");
    await k.setAnswer("SaveProjectAs", saved);
    await pressKey(k.c, "s", { ctrl: true });
    await waitFor(k.c, () => existsSync(saved), { timeout: 10 * 1000, interval: 100 });
    await sleep(1500);
    assert.deepEqual(
      fileResources(saved)
        .filter((r) => r[0].startsWith("CUSTOM"))
        .map((r) => r[0]),
      ["CUSTOM/<EMPTY>", "CUSTOM/<EMPTY>", "CUSTOM/<EMPTY>"],
      "the file holds each one under an empty name",
    );
    assert.throws(() => unpackProject(saved, path.join(lane.work, "res-unpacked")), /cannot be written safely/);
    const r = await press(k.c, "build");
    assert.ok(
      r.lines.some((l) => /NATIVE EXCEPTION: ACCESS_VIOLATION/.test(l)),
      J(r.lines),
    );
    assert.equal(existsSync(path.join(path.dirname(saved), "Probe.exe")), false, "an exe was written");
    // The crash is asserted: the lane's close is not to fail on it.
    await k.cmd("tbDebugConsole_Clear");
  });

  // ------------------------------------------------------------- D20, an IDE of its own

  test("a project damaged inside its Settings entry shows the bad file format box again after every OK", {
    timeout: 150 * 1000,
  }, async () => {
    const LIMIT = 6;
    const { master, settings } = await cut();
    const file = k.damaged("d20", master.subarray(0, settings.contentAt + Math.floor(settings.len / 2)));
    const bytes = readFileSync(file);
    await lane.closeProject();
    await k.startIde();
    await k.button("Cancel");
    await sleep(300);
    await k.setAnswer("OpenProject", file);
    await k.cmd("tbProject_Open");
    for (let n = 1; n <= LIMIT; n++) {
      const shown = await waitFor(k.c, async () => (await k.nativeBoxes())[0] ?? null, {
        timeout: 20 * 1000,
        interval: 200,
      });
      assert.ok(shown, `box ${n} did not come`);
      assert.equal(shown.title, "bad file format");
      await k.pressNative();
    }
    await waitFor(k.c, async () => (await k.nativeBoxes()).length > 0, { timeout: 20 * 1000, interval: 200 });
    const page = await k.c.evaluate(
      `({ lock: lockUICount, loaded: context.projectLoaded.value, boxes: [...document.querySelectorAll(".modalDialogContainer .modalTitleBar")].filter((m) => m.getBoundingClientRect().width).map((m) => m.innerText.trim()) })`,
    );
    assert.equal(page.loaded, false);
    assert.ok(page.lock > 0, J(page));
    assert.deepEqual(page.boxes, ["Please wait..."]);
    assert.ok(readFileSync(file).equals(bytes), "the file changed");
    // It cannot end by itself: the IDE is ended by its pid.
    await lane.closeProject();
  });
});
