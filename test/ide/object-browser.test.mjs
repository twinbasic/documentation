// The Object Browser, tested for what docs/IDE/Code/Object-Browser.md says, for the View menu's
// entry (docs/IDE/Menu/View.md), for what Editor.md says of F2 and Rename Symbol, and against one
// entry in BUGS-TO-REPORT.md:
//
//   "In the Object Browser, Tab moves the focus from the search box to Aa and no further"
//   (bugs/object-browser-tab-stops)
//
// The project in probes/object-browser has two files: Helpers.twin, a module with a constant, a
// global variable, an Enum, a Type, a Declare, the function Twice, a Private Sub and Sub Main, and
// Shapes.twin, with the class Shape (a Private field, an Event, a Property Get and Let, a Function
// and a Sub) and the class Circle, which Inherits Shape and adds a field and a Function.
//
// The Object Browser keeps its settings in the IDE setting OBJECT_BROWSER, which the IDE reads at
// each opening and writes at each change. The lane's IDE writes none of its settings
// (--no-save-ide-settings, IDE_FLAGS in scripts/lib/tb-ide.mjs) and is answered "no saved value"
// for this one (BLANKED_KEYS in scripts/lib/tb-defaults.mjs). So the page's host object is
// replaced by a proxy that keeps OBJECT_BROWSER in the page, which the test of what is remembered
// reads back; the same proxy blocks the two calls the flags do not guard that write the user's
// registry, ChangeWindowSetting and RemoveRecentsList, as code-editor.test.mjs does. The defaults
// hook answers OBJECT_BROWSER from its accessor on window.hostAppObject, so the property is
// replaced rather than assigned. THE USER'S CLIPBOARD IS NEVER TOUCHED: the Object Browser's copy
// button calls navigator.clipboard.writeText, which is replaced by a recorder first. Nothing here
// reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order, and each opens an Object Browser of its own. Each test
// states what BETA 1034 does; the test named "control" passes whether or not the defect is fixed.
// If another fails after an IDE update, the IDE has changed: update the entry in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, the pages above, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import {
  afterReveal,
  clickAt,
  openFile,
  pressKey,
  select,
  setCursor,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "object-browser");
const SOURCES = "/ObjectBrowserProbe/Sources/";
const HELPERS = `${SOURCES}Helpers.twin`;
const SHAPES = `${SOURCES}Shapes.twin`;
const read = (name) => readFileSync(path.join(PROJECT, "Sources", name), "utf8").split(/\r?\n/);
const HELPERS_SRC = read("Helpers.twin");
const SHAPES_SRC = read("Shapes.twin");
const lineIn = (src, text) => {
  const n = src.findIndex((l) => l.includes(text)) + 1;
  assert.ok(n > 0, `no line holding ${JSON.stringify(text)}`);
  return n;
};
const TWICE = lineIn(HELPERS_SRC, "Public Function Twice(");
const SHAPE = lineIn(SHAPES_SRC, "Class Shape");
const AREA = lineIn(SHAPES_SRC, "Public Function Area(");
const DESCRIBE = lineIn(SHAPES_SRC, "Public Sub Describe(");
const CIRCLE = lineIn(SHAPES_SRC, "Class Circle");
const CIRCUMFERENCE = lineIn(SHAPES_SRC, "Public Function Circumference(");
const J = JSON.stringify;

// Keeps OBJECT_BROWSER in the page, blocks the registry writes the flags do not guard, and
// records every copy (see the top of this file).
const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  window.__obSetting = "";
  window.__copies = [];
  const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
  const mine = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      const m = Reflect.get(target, key);
      if (key === "GetIDESetting") return (...a) => (String(a[0]) === "OBJECT_BROWSER" ? Promise.resolve(window.__obSetting) : m(...a));
      if (key === "SaveIDESetting")
        return (...a) => {
          if (String(a[0]) !== "OBJECT_BROWSER") return m(...a);
          window.__obSetting = String(a[1]);
        };
      return m;
    },
  });
  Object.defineProperty(window, "hostAppObject", { configurable: true, enumerable: true, get: () => mine, set: () => {} });
  navigator.clipboard.writeText = (t) => { window.__copies.push(String(t)); return Promise.resolve(); };
  navigator.clipboard.write = () => { window.__copies.push("(clipboard.write)"); return Promise.resolve(); };
})()`;

// The open Object Browser as a person sees it, or null when none is open. A row is its glyph,
// its name, and the text at its right (a component's library, an inherited member's base type,
// a result's kind), with * before the selected one.
const STATE_JS = `(() => {
  const ob = window.__twinBasicObjectBrowser;
  if (!ob) return null;
  const root = ob.element;
  const rows = (label) => {
    const b = root.querySelector('.tbob-listbox[aria-label="' + label + '"]');
    if (!b || !b.getBoundingClientRect().width) return null;
    return [...b.querySelectorAll(".tbob-item")].map((r) =>
      (r.classList.contains("tbob-active") ? "*" : "") +
      r.querySelector(".tbob-glyph").textContent + " " +
      r.querySelector(".tbob-itemname, .tbob-resultpath").textContent +
      (r.querySelector(".tbob-origin, .tbob-resultkind") ? " (" + r.querySelector(".tbob-origin, .tbob-resultkind").textContent + ")" : "") +
      (getComputedStyle(r).fontStyle === "italic" ? " italic" : ""));
  };
  const a = document.activeElement;
  return {
    library: root.querySelector("select").selectedOptions[0].text,
    libraries: [...root.querySelector("select").options].map((o) => o.text),
    search: root.querySelector("input[type=search]").value,
    matchCase: root.querySelector(".tbob-searchcase").getAttribute("aria-pressed") === "true",
    view: root.querySelector(".tbob-viewbutton[aria-pressed=true]").textContent,
    components: rows("Components"),
    members: rows("Members"),
    results: rows("Search results"),
    counts: [...root.querySelectorAll(".tbob-count")].filter((e) => e.getBoundingClientRect().width).map((e) => e.textContent),
    componentsWidth: Math.round(root.querySelector(".tbob-listpane").getBoundingClientRect().width),
    description: root.querySelector(".tbob-description").innerText.replace(/\\s+/g, " ").trim(),
    goToDefinition: getComputedStyle(document.getElementById("obGoToDefinition")).visibility,
    focus: a === root.querySelector("input[type=search]") ? "search" : a.getAttribute("aria-label") || a.tagName,
  };
})()`;

// Where a row is, scrolled into view, by its name: a component's or member's own name, or a
// result's full name.
const ROW_JS = (label, name) => `(() => {
  const b = window.__twinBasicObjectBrowser.element.querySelector('.tbob-listbox[aria-label=${J(label)}]');
  const r = [...b.querySelectorAll(".tbob-item")].find((e) => e.querySelector(".tbob-itemname, .tbob-resultpath").textContent === ${J(name)});
  if (!r) return null;
  r.scrollIntoView({ block: "nearest" });
  const q = r.getBoundingClientRect();
  return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
})()`;

// Where the nth shown element a selector finds is.
const AT_JS = (css, n) => `(() => {
  const e = [...document.querySelectorAll(${J(css)})].filter((x) => x.getBoundingClientRect().width)[${n}];
  if (!e) return null;
  const q = e.getBoundingClientRect();
  return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
})()`;

// The code editor: the caret, whether it is read-only, and whether it has the focus.
const EDITOR_JS = `(() => {
  const p = editor.getPosition();
  return {
    line: p.lineNumber,
    column: p.column,
    readOnly: editor.getOption(monaco.editor.EditorOption.readOnly),
    focused: editor.hasTextFocus(),
  };
})()`;

scenario("object-browser", (lane) => {
  let c = null;
  const state = () => c.evaluate(STATE_JS);
  const isOpen = () => c.evaluate("!!window.__twinBasicObjectBrowser");
  const editorNow = () => c.evaluate(EDITOR_JS);

  async function clickRow(label, name, { clickCount = 1 } = {}) {
    const p = await c.evaluate(ROW_JS(label, name));
    assert.ok(p, `the ${label} list has no row ${name}`);
    await clickAt(c, p.x, p.y, { clickCount });
    await sleep(300);
  }
  async function clickOn(css, n = 0) {
    const p = await c.evaluate(AT_JS(css, n));
    assert.ok(p, `nothing shown at ${css} (${n})`);
    await clickAt(c, p.x, p.y);
    await sleep(300);
  }
  async function waitOpen(open = true) {
    const ok = await waitFor(c, async () => (await isOpen()) === open, { timeout: 15 * 1000, interval: 100 });
    assert.ok(ok, open ? "the Object Browser did not open" : "the Object Browser did not close");
    await sleep(300);
  }
  // A fresh Object Browser, opened by F2 from the code editor with nothing selected, in Browse.
  async function fresh() {
    if (await isOpen()) {
      await pressKey(c, "Escape");
      await waitOpen(false);
    }
    await openFile(c, HELPERS, { line: 1, column: 1 });
    await afterReveal(c);
    await c.evaluate("editor.focus()");
    await setCursor(c, 1, 1);
    await pressKey(c, "F2");
    await waitOpen();
    if ((await state()).view !== "Browse") await clickOn(".tbob-dialog .tbob-viewbutton", 0);
  }
  async function search(text) {
    await clickOn(".tbob-dialog input[type=search]");
    await pressKey(c, "a", { ctrl: true });
    await pressKey(c, "Backspace");
    if (text) await typeText(c, text);
    await sleep(300);
  }
  async function setLibrary(text) {
    const p = await c.evaluate(`(() => {
      const s = window.__twinBasicObjectBrowser.element.querySelector("select");
      const o = [...s.options].find((x) => x.text === ${J(text)});
      if (!o) return false;
      s.value = o.value;
      s.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    assert.ok(p, `the Project / Library box has no ${text}`);
    await sleep(300);
  }
  // Ticks or clears a box in the open filter list, by the setting it stands for.
  async function clickOption(setting) {
    const p = await c.evaluate(`(() => {
      const i = [...document.querySelectorAll(".tbob-filtermenu:not([hidden]) input")].find((x) => x.dataset.setting === ${J(setting)} || x.value === ${J(setting)});
      if (!i) return null;
      const q = i.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(p, `the open list has no box for ${setting}`);
    await clickAt(c, p.x, p.y);
    await sleep(300);
  }
  const openList = () =>
    c.evaluate(
      `[...document.querySelectorAll(".tbob-filtermenu")].filter((m) => !m.hidden).map((m) => m.innerText.replace(/\\s+/g, " ").trim()).join(" | ")`,
    );
  const MEMBER_FILTER = ".tbob-dialog .tbob-filterbutton:not(.tbob-sortbutton)";

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, HELPERS, { line: 1, column: 1 });
    await afterReveal(c);
    await c.evaluate(GUARD_JS);
  });

  test("View has Object Browser, enabled with a project open, with the key F2, and it opens the Object Browser on the project", async (t) => {
    await c.evaluate("editor.focus()");
    await setCursor(c, 1, 1);
    await clickOn("#rootMenuView");
    const items = await c.evaluate(
      `[...document.querySelectorAll("#contextMenu > *")].map((e) => ({ text: e.innerText.replace(/\\s+/g, " ").trim(), disabled: /disabled/i.test(e.className) })).filter((e) => e.text)`,
    );
    t.diagnostic(J(items));
    const item = items.find((i) => i.text.startsWith("Object Browser"));
    assert.ok(item, "View has no Object Browser");
    assert.equal(item.text, "Object Browser F2");
    assert.equal(item.disabled, false);
    const at = await c.evaluate(
      `(() => { const e = [...document.querySelectorAll("#contextMenu > *")].find((x) => x.innerText.trim().startsWith("Object Browser")); const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`,
    );
    await clickAt(c, at.x, at.y);
    await waitOpen();
    const title = await c.evaluate(
      `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => m.querySelector(".modalTitleBar").innerText.trim())`,
    );
    const s = await state();
    t.diagnostic(J({ title, s }));
    assert.deepEqual(title, ["Object Browser"]);
    assert.equal(s.library, "ObjectBrowserProbe (project)");
    assert.deepEqual(s.libraries, [
      "<All Libraries>",
      "ObjectBrowserProbe (project)",
      "AppGlobalClassProject",
      "VB",
      "VBRUN",
      "VBA",
      "stdole",
    ]);
    assert.equal(s.search, "");
    assert.equal(s.view, "Browse");
    assert.equal(s.focus, "search");
  });

  test("F2 in the code editor opens the Object Browser with the selected text as its search; Rename Symbol's box stays hidden", async (t) => {
    await pressKey(c, "Escape");
    await waitOpen(false);
    await openFile(c, HELPERS, { line: TWICE, column: 1 });
    await afterReveal(c);
    const col = HELPERS_SRC[TWICE - 1].indexOf("Twice") + 1;
    await select(c, { startLine: TWICE, startColumn: col, endLine: TWICE, endColumn: col + 5 });
    await pressKey(c, "F2");
    await waitOpen();
    const s = await state();
    const rename = await c.evaluate(
      `[...document.querySelectorAll(".rename-box")].map((e) => getComputedStyle(e).display)`,
    );
    t.diagnostic(J({ s, rename }));
    assert.equal(s.search, "Twice");
    assert.deepEqual(s.components, ["*M Helpers"]);
    assert.deepEqual(s.members, ["ƒ Twice"]);
    assert.ok(
      rename.every((d) => d === "none"),
      `the rename box shows: ${J(rename)}`,
    );
  });

  test("F2 with only a caret in the code opens it with an empty search", async (t) => {
    await pressKey(c, "Escape");
    await waitOpen(false);
    await c.evaluate("editor.focus()");
    await setCursor(c, TWICE, HELPERS_SRC[TWICE - 1].indexOf("Twice") + 3);
    await pressKey(c, "F2");
    await waitOpen();
    const s = await state();
    t.diagnostic(J(s));
    assert.equal(s.search, "");
  });

  // BETA 1010 opened Monaco's rename box here, with the focus in it; BETA 1034 opens nothing.
  test("the editor's right-click menu still shows F2 against Rename Symbol, and choosing it opens no box and changes nothing", async (t) => {
    await pressKey(c, "Escape");
    await waitOpen(false);
    const before = await c.evaluate("editor.getModel().getValue()");
    const p = await c.evaluate(`(() => {
      const r = editor.getDomNode().getBoundingClientRect();
      const q = editor.getScrolledVisiblePosition({ lineNumber: ${TWICE}, column: ${HELPERS_SRC[TWICE - 1].indexOf("Twice") + 3} });
      return { x: r.x + q.left + 2, y: r.y + q.top + q.height / 2 };
    })()`);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await c.send("Input.dispatchMouseEvent", {
        type,
        x: p.x,
        y: p.y,
        button: type === "mouseMoved" ? "none" : "right",
        buttons: type === "mousePressed" ? 2 : 0,
        clickCount: 1,
      });
    }
    await sleep(500);
    const items = await c.evaluate(
      `[...document.querySelectorAll("#contextMenu > *")].map((e) => e.innerText.replace(/\\s+/g, " ").trim()).filter(Boolean)`,
    );
    t.diagnostic(J(items));
    assert.ok(items.includes("Rename Symbol F2"), J(items));
    const item = await c.evaluate(`(() => {
      const e = [...document.querySelectorAll("#contextMenu > *")].find((x) => x.innerText.replace(/\\s+/g, " ").trim() === "Rename Symbol F2");
      const q = e.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    await clickAt(c, item.x, item.y);
    await sleep(2000);
    const after = await c.evaluate(`(() => ({
      box: [...document.querySelectorAll(".rename-box")].some((b) => getComputedStyle(b).display !== "none"),
      focus: editor.hasTextFocus(),
      text: editor.getModel().getValue(),
    }))()`);
    t.diagnostic(J({ box: after.box, focus: after.focus }));
    assert.equal(after.box, false, "Rename Symbol opened its box");
    assert.equal(after.focus, true, "the code lost the focus");
    assert.equal(after.text, before, "the code changed");
  });

  test("Components lists the project's classes, modules, enums and types; a class's members include what it inherits, in italics with the base class's name", async (t) => {
    await fresh();
    const s = await state();
    t.diagnostic(J(s));
    assert.deepEqual(s.components, ["*C Circle", "E Colour", "M Helpers", "T Point", "C Shape"]);
    assert.deepEqual(s.members, [
      "ƒ Area (Shape) italic",
      "⚡ Changed (Shape) italic",
      "ƒ Circumference",
      "S Describe (Shape) italic",
      "P Name (Shape) italic",
      "F Radius",
    ]);
    assert.deepEqual(s.counts, ["5 items", "6 items"]);
    assert.ok(s.description.startsWith("Class Circle Public ObjectBrowserProbe Inherits: Shape"), s.description);
    await clickRow("Components", "Helpers");
    const h = await state();
    t.diagnostic(J(h.members));
    assert.deepEqual(h.members, ["K BigValue", "G Counter", "ƒ GetTickCount", "S Main", "ƒ Twice"]);
    await clickRow("Components", "Colour");
    assert.deepEqual((await state()).members, ["# Blue", "# Green", "# Red"]);
    await clickRow("Components", "Point");
    const p = await state();
    assert.deepEqual(p.members, ["V X", "V Y"]);
    assert.ok(p.description.includes("Declared in module: Helpers"), p.description);
  });

  test("the description shows the kind, the declaration and the file and line it is on", async (t) => {
    await fresh();
    await clickRow("Components", "Helpers");
    await clickRow("Members", "Twice");
    const s = await state();
    t.diagnostic(s.description);
    assert.equal(
      s.description,
      `Function Twice Public ObjectBrowserProbe · Helpers ObjectBrowserProbe.Helpers.Twice(ByVal n As Long) As Long Source: ${HELPERS} (line ${TWICE})`,
    );
    assert.equal(s.goToDefinition, "visible");
    await clickRow("Components", "Shape");
    await clickRow("Members", "Name");
    const n = await state();
    t.diagnostic(n.description);
    assert.ok(n.description.startsWith("Property Name Public Read / Write ObjectBrowserProbe · Shape"), n.description);
    await clickRow("Components", "Circle");
    await clickRow("Members", "Area");
    const a = await state();
    t.diagnostic(a.description);
    assert.ok(a.description.includes("Inherited from Shape"), a.description);
    assert.ok(a.description.endsWith(`Source: ${SHAPES} (line ${AREA})`), a.description);
  });

  test("Private members show only with Show private members; inherited ones go without Show inherited members", async (t) => {
    await fresh();
    await clickRow("Components", "Shape");
    assert.ok(!(await state()).members.some((m) => m.includes("mName")));
    await clickOn(MEMBER_FILTER, 1);
    const list = await openList();
    t.diagnostic(list);
    assert.ok(
      list.startsWith(
        "Show member types Display options Show inherited members Show private members Symbol types All None",
      ),
      list,
    );
    await clickOption("showNonPublic");
    const s = await state();
    t.diagnostic(J(s.members));
    assert.ok(s.members.includes("F mName"), J(s.members));
    await clickOption("showNonPublic");
    await clickOption("showInherited");
    await pressKey(c, "Escape");
    await sleep(300);
    assert.equal(await isOpen(), true, "Escape in the filter list closed the Object Browser");
    await clickRow("Components", "Circle");
    const i = await state();
    t.diagnostic(J(i.members));
    assert.deepEqual(i.members, ["ƒ Circumference", "F Radius"]);
    await clickOn(MEMBER_FILTER, 1);
    await clickOption("showInherited");
    await pressKey(c, "Escape");
    await sleep(300);
  });

  test("Sort members: Declaration order lists them in the order of the code", async (t) => {
    await fresh();
    await clickRow("Components", "Shape");
    await clickOn(".tbob-dialog .tbob-sortbutton", 1);
    t.diagnostic(await openList());
    await clickOption("declared");
    const s = await state();
    t.diagnostic(J(s.members));
    assert.deepEqual(s.members, ["⚡ Changed", "P Name", "ƒ Area", "S Describe"]);
    await clickOption("alphabetical");
    await pressKey(c, "Escape");
    await sleep(300);
  });

  test("the search matches any part of a name, ignoring case unless Aa is pressed", async (t) => {
    await fresh();
    await search("twice");
    const s = await state();
    assert.deepEqual(s.components, ["*M Helpers"]);
    assert.deepEqual(s.members, ["ƒ Twice"]);
    await search("ir");
    const ir = await state();
    t.diagnostic(J(ir));
    assert.deepEqual(ir.components, ["*C Circle"]);
    await search("twice");
    await clickOn(".tbob-dialog .tbob-searchcase");
    const cs = await state();
    t.diagnostic(J(cs));
    assert.equal(cs.matchCase, true);
    assert.deepEqual(cs.components, []);
    assert.equal(cs.focus, "search");
    await clickOn(".tbob-dialog .tbob-searchcase");
  });

  test("a dot in the search takes the part before it as the component: Shape. lists Shape's members, and Strings.Left finds VBA's under <All Libraries>", async (t) => {
    await fresh();
    await search("Shape.");
    const s = await state();
    t.diagnostic(J(s));
    assert.deepEqual(s.components, ["*C Shape"]);
    assert.deepEqual(s.members, ["ƒ Area", "⚡ Changed", "S Describe", "P Name"]);
    await search("Strings.Left");
    assert.deepEqual((await state()).components, []);
    await setLibrary("<All Libraries>");
    const all = await state();
    t.diagnostic(J(all));
    assert.deepEqual(all.components, ["*M Strings (VBA)"]);
    assert.deepEqual(all.members, ["ƒ Left", "ƒ Left$", "ƒ LeftB", "ƒ LeftB$"]);
  });

  test("Results lists every component and member in one list, with its full name and its kind", async (t) => {
    await fresh();
    await clickOn(".tbob-dialog .tbob-viewbutton", 1);
    await waitFor(c, async () => (await state()).results?.length > 0, { timeout: 15 * 1000 });
    const s = await state();
    t.diagnostic(J(s));
    assert.equal(s.view, "Results");
    assert.equal(s.components, null);
    for (const r of [
      "C ObjectBrowserProbe.Circle (Class)",
      "ƒ ObjectBrowserProbe.Circle.Area (Function) italic",
      "M ObjectBrowserProbe.Helpers (Module)",
      "ƒ ObjectBrowserProbe.Helpers.GetTickCount (Declare)",
      "# ObjectBrowserProbe.Colour.Green (Enum member)",
    ])
      assert.ok(
        s.results.some((x) => x.replace(/^\*/, "") === r),
        `no result ${r}`,
      );
    await search("Name");
    const n = await state();
    t.diagnostic(J(n.results));
    assert.deepEqual(n.results, [
      "*P ObjectBrowserProbe.Circle.Name (Property) italic",
      "P ObjectBrowserProbe.Shape.Name (Property)",
    ]);
    await search("Circum");
    await clickRow("Search results", "ObjectBrowserProbe.Circle.Circumference", { clickCount: 2 });
    await waitOpen(false);
    const e = await editorNow();
    t.diagnostic(J(e));
    assert.equal(e.line, CIRCUMFERENCE);
    await fresh();
    await clickOn(".tbob-dialog .tbob-viewbutton", 0);
  });

  test("in a list, Down, Up, Home, End and the first letters of a name move the selection", async (t) => {
    await fresh();
    await clickRow("Components", "Circle");
    const now = async () => (await state()).components.find((r) => r.startsWith("*"));
    await pressKey(c, "ArrowDown");
    assert.equal(await now(), "*E Colour");
    await pressKey(c, "End");
    assert.equal(await now(), "*C Shape");
    await pressKey(c, "ArrowUp");
    assert.equal(await now(), "*T Point");
    await pressKey(c, "Home");
    assert.equal(await now(), "*C Circle");
    await pressKey(c, "s");
    assert.equal(await now(), "*C Shape");
    await pressKey(c, "h");
    assert.equal(await now(), "*C Shape", "s then h, within a second, is the prefix sh");
    await sleep(1200);
    await pressKey(c, "c");
    assert.equal(await now(), "*C Circle");
    await pressKey(c, "c");
    t.diagnostic(await now());
    assert.equal(await now(), "*E Colour", "c again goes on to the next name starting with c");
  });

  test("Enter in a list, a double-click and Go to Definition close the browser and put the caret at the start of the declaration", async (t) => {
    await fresh();
    await clickRow("Components", "Circle");
    await pressKey(c, "Enter");
    await waitOpen(false);
    let e = await editorNow();
    t.diagnostic(J(e));
    assert.deepEqual([e.line, e.column, e.readOnly], [CIRCLE, 1, false]);
    await fresh();
    await clickRow("Components", "Circle");
    await clickRow("Members", "Describe", { clickCount: 2 });
    await waitOpen(false);
    e = await editorNow();
    t.diagnostic(J(e));
    assert.equal(e.line, DESCRIBE, "an inherited member goes to the base class's declaration");
    await fresh();
    await clickRow("Components", "Shape");
    await clickRow("Members", "Area");
    await clickOn("#obGoToDefinition");
    await waitOpen(false);
    e = await editorNow();
    assert.equal(e.line, AREA, "Go to Definition goes to the selected member");
    await fresh();
    await clickRow("Components", "Shape");
    await clickRow("Members", "Area");
    await clickRow("Components", "Shape", { clickCount: 2 });
    await waitOpen(false);
    e = await editorNow();
    assert.equal(e.line, SHAPE, "a double-click on a component goes to the component");
  });

  test("Go to Definition on a library's member opens its package's file, read-only", async (t) => {
    await fresh();
    await setLibrary("VBA");
    await search("Strings.Left");
    await clickRow("Members", "Left");
    const s = await state();
    t.diagnostic(s.description.slice(0, 300));
    assert.ok(s.description.startsWith("Declare Function Left Public VBA · Strings"), s.description);
    const source = s.description.match(/Source: (\S+) \(line (\d+)\)$/);
    assert.ok(source, s.description);
    assert.ok(source[1].endsWith("/VBA/Sources/Strings.twin"), source[1]);
    await clickOn("#obGoToDefinition");
    await waitOpen(false);
    const e = await editorNow();
    t.diagnostic(J(e));
    assert.equal(e.line, Number(source[2]));
    assert.equal(e.readOnly, true);
  });

  test("a type library's item goes to the IDE's read-only text of the library", async (t) => {
    await fresh();
    await setLibrary("stdole");
    const s = await state();
    t.diagnostic(J(s));
    const source = s.description.match(/Source: (\S+) \(line (\d+)\)$/);
    assert.ok(source, s.description);
    assert.equal(source[1], "/ObjectBrowserProbe/References/stdole");
    await clickRow("Components", "DISPPARAMS");
    await pressKey(c, "Enter");
    await waitOpen(false);
    const e = await editorNow();
    const text = await c.evaluate(
      `(() => { const m = editor.getModel(); return { lines: m.getLineCount(), here: m.getLineContent(editor.getPosition().lineNumber), head: m.getValue().slice(0, 300), uri: m.uri.toString(), tab: [...document.querySelectorAll(".tab, .editorTab")].filter((x) => /active|selected/.test(x.className)).map((x) => x.innerText.trim()) }; })()`,
    );
    t.diagnostic(J({ e, text }));
    assert.equal(e.line, Number(source[2]));
    assert.equal(e.readOnly, true);
  });

  test("Back and Forward step through what was selected", async (t) => {
    await fresh();
    await clickRow("Components", "Shape");
    await clickRow("Members", "Describe");
    await clickRow("Components", "Helpers");
    const sel = async () => {
      const s = await state();
      return [s.components.find((r) => r.startsWith("*")), s.members.find((r) => r.startsWith("*")) ?? null];
    };
    await clickOn(".tbob-dialog .tbob-iconbutton", 0);
    assert.deepEqual(await sel(), ["*C Shape", "*S Describe"]);
    await clickOn(".tbob-dialog .tbob-iconbutton", 0);
    assert.deepEqual(await sel(), ["*C Shape", null]);
    await clickOn(".tbob-dialog .tbob-iconbutton", 1);
    t.diagnostic(J(await sel()));
    assert.deepEqual(await sel(), ["*C Shape", "*S Describe"]);
  });

  test("the copy button copies the declaration of what is selected", async (t) => {
    await fresh();
    await c.evaluate("window.__copies.length = 0");
    await clickRow("Components", "Helpers");
    await clickRow("Members", "Twice");
    await clickOn(".tbob-dialog .tbob-desc-copy");
    await clickRow("Components", "Shape");
    await clickRow("Members", "Name");
    await clickOn(".tbob-dialog .tbob-desc-copy");
    await clickRow("Components", "Helpers");
    await clickOn(".tbob-dialog .tbob-desc-copy");
    const copies = await c.evaluate("window.__copies");
    t.diagnostic(J(copies));
    assert.deepEqual(copies, [
      "ObjectBrowserProbe.Helpers.Twice(ByVal n As Long) As Long",
      "ObjectBrowserProbe._Shape.Name() As String\nObjectBrowserProbe._Shape.Name(ByVal value As String)",
      "ObjectBrowserProbe.Helpers",
    ]);
  });

  test("Escape, Close and the title bar's X close the browser, and the focus goes back to the code", async () => {
    await fresh();
    await pressKey(c, "Escape");
    await waitOpen(false);
    assert.equal((await editorNow()).focused, true);
    await fresh();
    await clickOn(".modalDialogContainer .msgBoxButton:not(#obGoToDefinition)");
    await waitOpen(false);
    assert.equal((await editorNow()).focused, true);
    await fresh();
    await clickOn(".modalDialogContainer .modalTitleBarCloseBtn");
    await waitOpen(false);
    assert.equal((await editorNow()).focused, true);
  });

  test("the view, Aa, the filters, the sorts and the panes' sizes are remembered; the library and the search are not", async (t) => {
    await fresh();
    await clickOn(".tbob-dialog .tbob-viewbutton", 1);
    await clickOn(".tbob-dialog .tbob-searchcase");
    await search("Circ");
    await setLibrary("<All Libraries>");
    await clickOn(".tbob-dialog .tbob-viewbutton", 0);
    const before = (await state()).componentsWidth;
    const bar = await c.evaluate(AT_JS(".tbob-dialog .tbob-splitter", 0));
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: bar.x, y: bar.y });
    await c.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: bar.x,
      y: bar.y,
      button: "left",
      buttons: 1,
      clickCount: 1,
    });
    for (let dx = 20; dx <= 120; dx += 20) {
      await c.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: bar.x + dx,
        y: bar.y,
        button: "left",
        buttons: 1,
      });
    }
    await c.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: bar.x + 120,
      y: bar.y,
      button: "left",
      buttons: 0,
      clickCount: 1,
    });
    await sleep(300);
    const dragged = (await state()).componentsWidth;
    await clickOn(".tbob-dialog .tbob-viewbutton", 1);
    await pressKey(c, "Escape");
    await waitOpen(false);
    const saved = JSON.parse(await c.evaluate("window.__obSetting"));
    t.diagnostic(J({ before, dragged, saved }));
    assert.ok(dragged > before + 100, `the drag did not widen Components: ${before} then ${dragged}`);
    assert.equal(saved.viewMode, "results");
    assert.equal(saved.exactMatch, true);
    await c.evaluate("editor.focus()");
    await setCursor(c, 1, 1);
    await pressKey(c, "F2");
    await waitOpen();
    const s = await state();
    t.diagnostic(J(s));
    assert.equal(s.view, "Results");
    assert.equal(s.matchCase, true);
    assert.equal(s.library, "ObjectBrowserProbe (project)");
    assert.equal(s.search, "");
    await clickOn(".tbob-dialog .tbob-viewbutton", 0);
    const reopened = (await state()).componentsWidth;
    assert.ok(Math.abs(reopened - dragged) <= 2, `Components is ${reopened} px wide again, not ${dragged}`);
    await clickOn(".tbob-dialog .tbob-searchcase");
    await c.evaluate(`window.__obSetting = ""`);
  });

  test("Tab moves the focus from the search box to Aa and no further; Shift+Tab to Project / Library, then to the copy button, and no further", async (t) => {
    await fresh();
    const where = async () =>
      c.evaluate(`(() => {
        const a = document.activeElement;
        return a.matches("input[type=search]") ? "search" : a.classList.contains("tbob-searchcase") ? "Aa" : a.tagName === "SELECT" ? "Project / Library" : a.getAttribute("aria-label") || a.tagName;
      })()`);
    const seen = [];
    for (let i = 0; i < 4; i++) {
      await pressKey(c, "Tab");
      seen.push(await where());
    }
    await clickOn(".tbob-dialog input[type=search]");
    for (let i = 0; i < 3; i++) {
      await pressKey(c, "Tab", { shift: true });
      seen.push(await where());
    }
    t.diagnostic(J(seen));
    assert.deepEqual(seen, [
      "Aa",
      "Aa",
      "Aa",
      "Aa",
      "Project / Library",
      "Copy selection or declaration",
      "Copy selection or declaration",
    ]);
  });

  test("control: a click on a list gives it the focus, and the keys then move in it", async () => {
    await fresh();
    await clickRow("Components", "Helpers");
    assert.equal((await state()).focus, "Components");
    await pressKey(c, "ArrowDown");
    assert.ok((await state()).components.includes("*T Point"));
    await pressKey(c, "Escape");
    await waitOpen(false);
  });
});
