// Project Explorer and Project Settings: the defects that lose nothing, tested against these
// entries in BUGS-TO-REPORT.md:
//
//   "Project Explorer's object view opens no menu on a right click" (bugs/objectview-no-menu)
//   "The object view's Rename and Delete commands only show an alert naming the command"
//   (bugs/objectview-rename-delete-alert)
//   "A letter typed in the object view opens its search box with > before the letter"
//   (bugs/objectview-search-prefix)
//   "Shift+double-click on a form in the object view opens the designer, not the code"
//   (bugs/objectview-shift-double-click)
//   "Space does not open or close a folder in Project Explorer" (bugs/tree-space-folder)
//   "Typing in Project Explorer does not filter the tree" (bugs/tree-type-to-filter)
//   "Ctrl+A in Project Explorer raises a page error" (bugs/tree-ctrl-a-error)
//   "Right Arrow on an open folder selects its first entry in the compiler's order, not the first
//   row shown" (bugs/tree-right-arrow-order)
//   "Down Arrow past the last row of Project Explorer selects a hidden Settings node, and Enter
//   there raises a page error" (bugs/tree-down-hidden-settings)
//   "Delete with nothing selected asks to delete the selected items" (bugs/tree-delete-nothing)
//   "Renaming a file to its own name, or changing only its case, is refused as an invalid name"
//   (bugs/rename-same-name-invalid)
//   "Paste of a file with no extension, in a folder whose name holds a dot, creates nothing"
//   (bugs/paste-dotted-folder)
//   "Add Other File or Paste on Packages says it cannot create files in the root resources folder"
//   (bugs/packages-resources-message)
//   "Dragging a file onto Packages raises a page error" (bugs/drag-onto-packages-error)
//   "An imported type library is listed in Enabled Libraries as [LINKED-PACKAGE]"
//   (bugs/imported-typelib-linked-package)
//   "After a change to the references only, the X of Project Settings closes it without asking,
//   and the change is lost" (bugs/settings-references-close-no-question)
//
// The lane opens test/ide/probes/projects (the project ProjectsProbe; projects-kit.mjs says what
// the page's guard does) once, and the tests share it in order. None of them saves; what they
// add (MyFile, a type library's copy) does not stop the project compiling.
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
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";
import { J, P, projectKit } from "./projects-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "projects");

// The open Settings editor's working copy of the project's settings.
const CONFIG_JS = `[...document.querySelectorAll("*")].find((e) => e.globalVars?.configData)?.globalVars`;
// The object view's rows shown, by their text, with where to click them.
const OBJ_ROW_JS = (name) => `(() => {
  const e = [...document.querySelectorAll(".objListRow")].filter((e) => e.getBoundingClientRect().height && e.offsetParent)
    .find((e) => e.querySelector(".objListText")?.textContent.trim() === ${J(name)});
  if (!e) return null;
  const r = e.querySelector(".objListText").getBoundingClientRect();
  return { x: r.x + Math.min(r.width / 2, 25), y: r.y + r.height / 2 };
})()`;
const FILE_MODE_JS = `(() => { const f = context.fileMode; return f && typeof f === "object" ? (f.val ?? f.value) : f; })()`;

scenario("Project Explorer and Project Settings", (lane) => {
  let c;
  const k = projectKit(() => c);

  before(async () => {
    c = await lane.open(PROJECT);
    assert.equal(await k.guard(), true);
  });

  // ---------------------------------------------------------------- the object view

  const fileMode = () => c.evaluate(FILE_MODE_JS);
  // The header's Toggle file view button, clicked until the view is the one wanted.
  async function view(files) {
    if ((await fileMode()) === files) return;
    const r = await c.evaluate(`(() => {
      const b = [...document.querySelectorAll(".sectionHeader [title^='Toggle file view']")].find((e) => e.getBoundingClientRect().width);
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, "no Toggle file view button");
    await k.clickAt(r.x, r.y);
    assert.ok(await waitFor(c, async () => (await fileMode()) === files), "the view did not change");
    if (!files) {
      const listed = await waitFor(c, () => c.evaluate(OBJ_ROW_JS("Startup")), { timeout: 15 * 1000 });
      assert.ok(listed, "the object view lists no Startup");
      await sleep(500);
    }
  }
  async function objRow(name) {
    const r = await c.evaluate(OBJ_ROW_JS(name));
    assert.ok(r, `the object view shows no row ${name}`);
    return r;
  }

  test("control: a right click on a row of the file view opens its menu", async () => {
    await view(true);
    const items = await k.rightNode(P("Sources/Startup.twin"));
    await k.closeMenus();
    assert.ok(
      items.some((i) => i.text.startsWith("Rename")),
      `the menu holds ${items.map((i) => i.text).join(" | ")}`,
    );
  });

  test("in the object view, a right click on an object, a form or a group opens no menu", async () => {
    await view(false);
    for (const name of ["Startup", "frmMain", "Modules"]) {
      const r = await objRow(name);
      await k.clickAt(r.x, r.y, { button: "right" });
      await sleep(500);
      assert.equal(await k.menuOpen(), false, `a right click on ${name} opened a menu`);
    }
  });

  test("the object view's Rename and Delete commands only show an alert naming the command", async () => {
    await view(false);
    c.dialogs.length = 0;
    for (const id of ["tbProjectExplorer_ObjectList_RenameSelected", "tbProjectExplorer_ObjectList_DeleteSelected"]) {
      await k.run(id);
      await sleep(600);
    }
    const seen = c.dialogs.splice(0).map((d) => `${d.type}: ${d.message}`);
    assert.deepEqual(seen, [
      "alert: tbProjectExplorer_ObjectList_RenameSelected",
      "alert: tbProjectExplorer_ObjectList_DeleteSelected",
    ]);
  });

  test("control: in the object view, a double-click on a module opens its code", async () => {
    await view(false);
    const r = await objRow("Legacy");
    await k.doubleClickAt(r.x, r.y);
    assert.ok(
      await waitFor(c, async () => (await k.tabs()).some((t) => t.name === "Legacy.bas" && t.selected)),
      `the tabs are ${J(await k.tabs())}`,
    );
  });

  test("Shift+double-click on a form in the object view opens its designer, not its code", async (t) => {
    await view(false);
    const r = await objRow("frmMain");
    await k.doubleClickAt(r.x, r.y, { shift: true });
    await sleep(2500);
    const tabs = await k.tabs();
    t.diagnostic(J(tabs));
    assert.ok(
      tabs.some((x) => x.name === "frmMain.tbform" && x.selected),
      "the designer frmMain.tbform is not the selected tab",
    );
    assert.ok(!tabs.some((x) => x.name === "frmMain.twin"), "frmMain.twin was opened");
  });

  test("in the object view, a letter typed with a row selected opens the search box holding > and the letter", async () => {
    await view(false);
    const r = await objRow("Startup");
    await k.clickAt(r.x, r.y);
    await k.key("u");
    await sleep(1500);
    const s = await c.evaluate(
      `(() => { const b = fs.searchBarEntry; return b ? { value: b.value, focused: document.activeElement === b } : null; })()`,
    );
    await k.key("Escape");
    await sleep(800);
    assert.deepEqual(s, { value: ">u", focused: true });
  });

  // ---------------------------------------------------------------- tree keys

  test("Space on a selected folder neither closes nor opens it", async () => {
    await view(true);
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.clickNode(P("Sources/Helpers/Thing.twin"));
    await k.key("ArrowLeft");
    await sleep(300);
    assert.deepEqual(await k.selection(), [P("Sources/Helpers")]);
    await k.key(" ");
    await sleep(500);
    const helpers = (await k.rows({ all: true })).find((r) => r.path === P("Sources/Helpers"));
    assert.equal(helpers.collapsed, false, "Space closed the folder");
    assert.deepEqual(await k.selection(), [P("Sources/Helpers")]);
  });

  test("typing letters in the file view does not filter the tree", async (t) => {
    await view(true);
    await k.clickNode(P("Sources/Startup.twin"));
    await c.evaluate(`(() => {
      window.__keys = [];
      for (const type of ["keydown", "keypress", "keyup"]) document.addEventListener(type, (e) => window.__keys.push(type + ":" + e.key), true);
      return true;
    })()`);
    const before = (await k.rows()).length;
    await k.type("ti");
    await sleep(500);
    const filter = await c.evaluate(`(() => { const f = fs.tree.filterText; return f ? f.innerText : null; })()`);
    const after = (await k.rows()).length;
    t.diagnostic(J(await c.evaluate("window.__keys")));
    await k.key("Escape");
    assert.equal(filter || "", "", `the filter reads ${J(filter)}`);
    assert.equal(after, before, "the tree shows another number of rows");
  });

  test("Right Arrow on an open folder selects its first entry in the compiler's order, not the first row shown", async (t) => {
    await view(true);
    await k.expand(P("Sources"));
    // A click on the row of a file open in a tab puts the focus in its editor, so the rows the
    // key tests click are of files not open.
    await k.clickNode(P("Sources/Startup.twin"));
    await k.key("ArrowLeft");
    await sleep(300);
    assert.deepEqual(await k.selection(), [P("Sources")]);
    const first = (await k.rows()).find((r) => r.path.startsWith(`${P("Sources")}/`))?.path;
    await k.key("ArrowRight");
    await sleep(300);
    const sel = await k.selection();
    t.diagnostic(J({ first, sel }));
    assert.equal(first, P("Sources/Helpers"));
    assert.equal(sel.length, 1);
    assert.ok(sel[0].startsWith(`${P("Sources")}/`), `Right selected ${sel[0]}`);
    assert.notEqual(sel[0], first, "Right selected the first row shown");
  });

  test("control: Enter on a file in the file view opens it in a tab", async () => {
    await view(true);
    await k.expand(P("Sources"));
    await k.clickNode(P("Sources/Helpers/Util.twin"));
    await k.key("Enter");
    assert.ok(
      await waitFor(c, async () => (await k.tabs()).some((t) => t.name === "Util.twin" && t.selected)),
      `the tabs are ${J(await k.tabs())}`,
    );
  });

  test("with nothing selected, Delete asks to delete the selected items, and Delete deletes nothing", async () => {
    await view(true);
    await k.clickNode(P("Sources/Startup.twin"));
    await k.key("Escape");
    await sleep(300);
    assert.deepEqual(await k.selection(), []);
    await k.key("Delete");
    const box = await k.waitForBox(/Are you sure/);
    assert.ok(box, "no box");
    assert.match(box.text, /Are you sure you want to delete the selected items\?/);
    await k.answer("Delete");
    await sleep(1500);
    assert.equal(await k.exists(P("Sources/Startup.twin")), true);
    assert.deepEqual(await k.boxes(), []);
  });

  // The page error of each of the next two tests is thrown in the tree's key handler; they come
  // after the tests that need the tree's keys.
  test("Ctrl+A in the file view selects every row shown and raises a page TypeError", async (t) => {
    await view(true);
    await k.clickNode(P("Sources/Startup.twin"));
    await k.errors();
    await k.key("a", { ctrl: true });
    await sleep(500);
    const errors = await k.errors();
    const shown = (await k.rows()).length;
    const selected = (await k.selection()).length;
    t.diagnostic(J(errors));
    await k.key("Escape");
    assert.equal(selected, shown, `${selected} of ${shown} rows selected`);
    assert.ok(
      errors.some((e) => /Cannot read properties of undefined \(reading 'style'\)/.test(e)),
      `the page errors were ${J(errors)}`,
    );
  });

  test("Down Arrow on the last row selects the hidden Settings node, and Enter there raises a page TypeError", async (t) => {
    await view(true);
    const shown = await k.rows();
    const last = shown[shown.length - 1].path;
    await k.clickNode(last);
    await k.errors();
    const tabsBefore = (await k.tabs()).length;
    await k.key("ArrowDown");
    await sleep(300);
    const sel = await k.selection();
    const highlighted = await c.evaluate(
      `[...document.querySelectorAll(".treeItemInner.selectedItem, .treeItem.selected, .treeItemSelected")].filter((e) => e.getBoundingClientRect().height).length`,
    );
    await k.key("Enter");
    await sleep(1000);
    const errors = await k.errors();
    t.diagnostic(J({ last, sel, highlighted, errors }));
    assert.deepEqual(sel, [P("Settings")]);
    assert.equal(await c.evaluate(`!!fs.tree.resolvePath("twinbasic:${P("Settings")}").domObject`), false);
    assert.ok(
      errors.some((e) => /reading 'ondblclick'/.test(e)),
      `the page errors were ${J(errors)}`,
    );
    assert.equal((await k.tabs()).length, tabsBefore, "Enter opened a tab");
  });

  // ---------------------------------------------------------------- rename

  async function rename(p, text) {
    await k.clickNode(p);
    await k.key("F2");
    assert.ok(await waitFor(c, () => c.evaluate(`!!document.getElementById("renameInput")`)), "no rename box");
    if (text !== null) {
      await k.key("a", { ctrl: true });
      await k.type(text);
    }
    await k.key("Enter");
    await sleep(1500);
  }

  // Thing.twin, which no test here opens: F2 with the focus in an editor is the editor's.
  test("control: F2 and a new name renames a file", async () => {
    await view(true);
    await k.expand(P("Sources"));
    await k.expand(P("Sources/Helpers"));
    await k.msgs();
    await rename(P("Sources/Helpers/Thing.twin"), "Thing2.twin");
    assert.equal(await k.exists(P("Sources/Helpers/Thing2.twin")), true);
    assert.equal(await k.exists(P("Sources/Helpers/Thing.twin")), false);
    assert.deepEqual(await k.msgs(), []);
  });

  test("F2 and Enter with the name unchanged, or changed only in case, is refused as an invalid name", async () => {
    await view(true);
    await k.msgs();
    await rename(P("Sources/Helpers/Thing2.twin"), null);
    await rename(P("Sources/Helpers/Thing2.twin"), "thing2.twin");
    const said = await k.msgs();
    const name = await c.evaluate(`fs.tree.resolvePath("twinbasic:${P("Sources/Helpers/Thing2.twin")}").name`);
    assert.deepEqual(said, [
      "Cannot rename: the new name entered is invalid.",
      "Cannot rename: the new name entered is invalid.",
    ]);
    assert.equal(name, "Thing2.twin");
  });

  // ---------------------------------------------------------------- copy and paste

  test("control: Copy and Paste of a file makes a copy named '<name> copy' beside it", async () => {
    await view(true);
    await k.expand(P("Resources"));
    await k.expand(P("Resources/CUSTOM"));
    await k.clickNode(P("Resources/CUSTOM/notes.txt"));
    await k.key("c", { ctrl: true });
    await sleep(300);
    await k.key("v", { ctrl: true });
    assert.ok(await waitFor(c, () => k.exists(P("Resources/CUSTOM/notes copy.txt"))), "no notes copy.txt");
    await k.clickNode(P("Resources/CUSTOM/notes copy.txt"));
    await k.key("Delete");
    assert.ok(await k.waitForBox(/Are you sure/), "no box");
    await k.answer("Delete");
    assert.ok(await waitFor(c, async () => !(await k.exists(P("Resources/CUSTOM/notes copy.txt")))), "the copy stays");
  });

  test("Copy and Paste of a file with no extension in a folder whose name holds a dot creates nothing and says nothing", async (t) => {
    await view(true);
    await k.expand(P("Miscellaneous"));
    await k.expand(P("Miscellaneous/v1.2"));
    const before = (await k.rows({ all: true })).map((r) => r.path);
    await k.msgs();
    await k.clickNode(P("Miscellaneous/v1.2/datafile"));
    await k.key("c", { ctrl: true });
    await sleep(300);
    const clip = await k.clip();
    await k.key("v", { ctrl: true });
    await sleep(2000);
    const after = (await k.rows({ all: true })).map((r) => r.path);
    t.diagnostic(J(clip));
    assert.deepEqual(clip, [`text/html: twinbasic/uris;${P("Miscellaneous/v1.2/datafile")}`]);
    assert.deepEqual(
      after.filter((p) => !before.includes(p)),
      [],
    );
    assert.deepEqual(await k.msgs(), []);
    assert.deepEqual(await k.boxes(), []);
  });

  // ---------------------------------------------------------------- Packages

  async function addOtherFile(p) {
    await k.addVia(p, "Add Other File");
    const box = await waitFor(c, () => c.evaluate(`document.getElementById("renameInput")?.value ?? null`), {
      timeout: 3000,
    });
    if (box !== null) {
      await k.key("Enter");
      await sleep(1200);
    }
    return box;
  }

  test("control: Add > Add Other File on a folder of Resources creates the file there", async () => {
    await view(true);
    await k.expand(P("Resources"));
    await k.expand(P("Resources/CUSTOM"));
    await k.msgs();
    const box = await addOtherFile(P("Resources/CUSTOM"));
    assert.equal(box, "MyFile");
    assert.equal(await k.exists(P("Resources/CUSTOM/MyFile")), true);
    assert.deepEqual(await k.msgs(), []);
  });

  test("Add Other File on Packages, and Paste on Packages, each say they cannot create files inside the root resources folder", async (t) => {
    await view(true);
    await k.msgs();
    const box = await addOtherFile(P("Packages"));
    t.diagnostic(`name box: ${J(box)}`);
    const added = await k.msgs();
    await k.expand(P("Resources/CUSTOM"));
    await k.clickNode(P("Resources/CUSTOM/notes.txt"));
    await k.key("c", { ctrl: true });
    await sleep(300);
    await k.clickNode(P("Packages"));
    await k.key("v", { ctrl: true });
    await sleep(1500);
    const pasted = await k.msgs();
    const children = (await k.rows({ all: true }))
      .filter((r) => r.path.split("/").length === 4 && r.path.startsWith(`${P("Packages")}/`))
      .map((r) => r.name);
    t.diagnostic(J({ added, pasted, children }));
    assert.deepEqual(added, ["cannot create files inside the root resources folder"]);
    assert.deepEqual(pasted, ["cannot create files inside the root resources folder"]);
    assert.ok(!children.includes("MyFile") && !children.includes("notes.txt"), `Packages holds ${children}`);
  });

  test("dragging a file onto Packages moves nothing and raises a page RangeError", async (t) => {
    await view(true);
    await k.expand(P("Sources"));
    await k.errors();
    const { zone } = await k.drag(P("Sources/Legacy.bas"), P("Packages"));
    const errors = await k.errors();
    t.diagnostic(J({ zone, errors }));
    assert.equal(await k.exists(P("Sources/Legacy.bas")), true);
    assert.equal(await k.exists(P("Packages/Legacy.bas")), false);
    assert.ok(
      errors.some((e) => /Invalid DataView length 8/.test(e)),
      `the page errors were ${J(errors)}`,
    );
  });

  // ---------------------------------------------------------------- Project Settings

  async function openSettings({ references = false } = {}) {
    if (references) {
      await k.clickNode(P("Sources/Startup.twin"));
      await k.key("t", { ctrl: true });
    } else await k.run("tbProject_ShowSettings");
    assert.ok(await waitFor(c, () => c.evaluate(`!!${CONFIG_JS}`), { timeout: 20 * 1000 }), "no Settings editor");
    await sleep(2500);
  }
  const settingsOpen = () => c.evaluate(`!!${CONFIG_JS}`);
  // Clicks a text of the open box, such as a tab's name or a button drawn as a div.
  async function clickText(text) {
    const r = await c.evaluate(`(() => {
      const e = [...document.querySelectorAll(".modalDialogContainer *")]
        .filter((e) => e.getBoundingClientRect().width && e.children.length === 0 && e.textContent.trim() === ${J(text)}).pop();
      if (!e) return null;
      e.scrollIntoView({ block: "nearest" });
      const q = e.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, `no ${text} in the box`);
    await k.clickAt(r.x, r.y);
    await sleep(1000);
  }
  async function closeX() {
    const r = await c.evaluate(`(() => {
      const b = [...document.querySelectorAll(".modalTitleBarCloseBtn")].filter((e) => e.getBoundingClientRect().width).pop();
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, "the box has no X");
    await k.clickAt(r.x, r.y);
    await sleep(1200);
  }
  // A reference row's tick box, found by the row's text.
  const TICK_JS = (re) => `(() => {
    const row = [...document.querySelectorAll(".referencesListRow")].find((r) => r.getBoundingClientRect().width && ${re}.test(r.textContent));
    if (!row) return null;
    row.scrollIntoView({ block: "center" });
    const q = row.querySelector(".referencesListColEnabled").getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
  })()`;
  const settingsFile = () => k.ideText(P("Settings")).then((t) => JSON.parse(t));

  test("control: after a change to the description, the title bar's X asks to close without saving", async () => {
    await openSettings();
    const r = await c.evaluate(`(() => {
      const i = [...document.querySelectorAll("input")].find((e) => e.value.startsWith("test/ide/projects.test.mjs"));
      if (!i) return null;
      i.scrollIntoView({ block: "center" });
      const q = i.getBoundingClientRect();
      return { x: q.x + q.width - 10, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, "no description box");
    await k.clickAt(r.x, r.y);
    await k.key("End");
    await k.type(" X");
    await sleep(600);
    await closeX();
    const box = await k.waitForBox(/Close without saving\?/, { timeout: 3000 });
    assert.ok(box, `nothing was asked: ${J(await k.boxes())}`);
    await k.answer("Yes, close");
    await sleep(800);
    assert.equal(await settingsOpen(), false);
  });

  test("after a change to the references only, the title bar's X closes Project Settings without asking, and the change is lost", async () => {
    await openSettings({ references: true });
    const tick = await c.evaluate(TICK_JS("/Scripting Runtime/"));
    assert.ok(tick, "no Microsoft Scripting Runtime row");
    await k.clickAt(tick.x, tick.y);
    await sleep(1000);
    assert.equal(
      await c.evaluate(`document.getElementById("SAVEBTN").className.includes("disabled")`),
      false,
      "Apply Changes is not enabled after the untick",
    );
    await closeX();
    assert.deepEqual(await k.boxes(), [], "something was asked");
    assert.equal(await settingsOpen(), false, "Project Settings is still open");
    const refs = (await settingsFile())["project.references"].map((r) => r.name);
    assert.ok(refs.includes("Microsoft Scripting Runtime"), `the references are ${J(refs)}`);
  });

  test("a type library imported on Available COM References is listed in Enabled Libraries as [LINKED-PACKAGE]", async (t) => {
    await openSettings({ references: true });
    await clickText("Available COM References");
    await k.setAnswer("OpenTypeLibrary", "C:\\Windows\\SysWOW64\\msdatsrc.tlb");
    await clickText("Import from file...");
    await sleep(4000);
    const calls = await k.hostCalls();
    await clickText("Enabled Libraries");
    await sleep(1000);
    const rows = await c.evaluate(
      `[...document.querySelectorAll(".referencesListRow")].filter((r) => r.getBoundingClientRect().height && /Data Source/.test(r.innerText)).map((r) => r.innerText.replace(/\\s+/g, " ").trim())`,
    );
    const ref = await c.evaluate(
      `${CONFIG_JS}.configData["project.references"].filter((r) => /msdatsrc/i.test(r.path32 || "")).map((r) => r.name)`,
    );
    t.diagnostic(J({ calls: calls.map((x) => x[0]), rows, ref }));
    await k.answer("Cancel");
    await sleep(800);
    assert.deepEqual(ref, ["[IMPORTED] Microsoft Data Source Interfaces for ActiveX Data Binding Type Library"]);
    assert.equal(rows.length, 1, `the rows are ${J(rows)}`);
    assert.match(rows[0], /^\[LINKED-PACKAGE\] Microsoft Data Source Interfaces/);
  });
});
