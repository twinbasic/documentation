// The form and report designers, tested against eighteen entries in BUGS-TO-REPORT.md:
//
//   "Horizontal and Vertical Spacing move the controls with no undo step and without marking the
//   form changed" (bugs/form-spacing-not-recorded)
//   "Make Same Size marks the form changed, but Save keeps the old sizes unless another change
//   follows" (bugs/form-same-size-not-saved)
//   "Arrow keys in the designer's zoom box also move the selected controls"
//   (bugs/form-zoom-box-arrows-move)
//   "Lock Controls does not mark the form changed, so a lock made on its own is lost when the
//   designer is closed" (bugs/form-lock-not-saved)
//   "Align > Center (Horizontal) and Center (Vertical) centre the controls on the selection's left
//   or top edge, not on its centre" (bugs/form-align-center-edge)
//   "Center In Container puts a control off centre when the designer is zoomed"
//   (bugs/form-center-in-container-zoom)
//   "On a CustomControls form, PROPERTIES shows a control's position in twips but takes a typed
//   value in pixels" (bugs/customcontrols-properties-twips)
//   "Escape and then a pointer move over the form mark the form changed, with an undo step that
//   changes nothing" (bugs/form-escape-marks-changed)
//   "Ctrl+A does nothing in a PROPERTIES box" (bugs/properties-ctrl-a)
//   "Alt+arrow in the form designer also opens the IDE's menu bar" (bugs/form-alt-arrow-menu)
//   "Renaming a control to another control's name asks the control-array question twice"
//   (bugs/form-array-question-twice)
//   "Add Windows Form accepts a name that is not an identifier" (bugs/add-form-bad-name)
//   "View > Zoom Out stops at 50 %, though the zoom box offers 25 %" (bugs/form-zoom-out-floor)
//   "The History entry for a change in a designer reads [line: undefined]"
//   (bugs/history-form-line-undefined)
//   "Shift+F7 does not switch from a form's code to its designer when a folder in its path has
//   .twin in its name" (bugs/form-switch-twin-folder)
//   "With a report open, a floating Toolbox lists every form control"
//   (bugs/report-floating-toolbox)
//   "A package's read-only designer file opens an empty tab besides the notice that it cannot be
//   opened" (bugs/readonly-designer-empty-tab)
//   "A form file with bad JSON opens an empty designer that takes no edit"
//   (bugs/form-bad-json-empty-designer)
//
// The lane opens three projects, one after the other. probes/forms has frmMain (Label1, Text1,
// Command1, Check1, Frame1 holding Text2, and the control array Command2(0) and Command2(1)), two
// copies of it, frmSizes and frmSaved, for the tests that save, and frmDeep in the folder
// Sources/v1.twin.forms. probes/forms-badjson has frmBad, whose JSON has a doubled comma, so it
// does not compile (TB5246, TB5247), which the lane accepts for that project only.
// probes/forms-custom is a copy of test/shots/customcontrols, a CustomControls form.
//
// A designer is driven with real input: clicks, Shift+clicks and keys through CDP, the Format and
// View menus clicked open. A test that needs frmMain as the file holds it closes its tab,
// answering Discard Changes, and opens it again: the designer then starts with no undo steps.
// Positions are what the designer holds in pixels; the lane's private desktop is at 150 %, so a
// position the designer rounds to a device pixel reads 54.67 for 55, and an arrow key moves a
// control 0.667 px. The page's currentDPI is set to its devicePixelRatio first, as the trials
// that found these defects did.
//
// THE IDE IS STARTED WITH --no-save-ide-settings and --no-update-recent-files (IDE_FLAGS in
// scripts/lib/tb-ide.mjs), so it writes none of its options or panel layout to the user's own
// registry (HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE\IDESettings). The flags do not
// guard the Window key or the removals from the recent list. So, as soon as each project is open,
// the page's hostAppObject is replaced by a proxy whose ChangeWindowSetting and RemoveRecentsList
// calls do nothing, as debugging.test.mjs does; the tests float the HISTORY and TOOLBOX panels.
// Nothing here copies to the clipboard or reaches SaveSetting, so lanes.mjs names no settings.
//
// The tests share the lane's IDE in order. Each test states what BETA 1005 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the
// IDE has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the
// callout on the page of docs/IDE/Forms/ or docs/IDE/Reports/ that carries it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { compileOutcome, sleep, waitForCompile } from "../../scripts/lib/tb-ide.mjs";
import {
  editorText,
  notifications,
  openFile,
  pressKey,
  setCursor,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { unpackProject } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "forms");
const BAD = path.join(HERE, "probes", "forms-badjson");
const CUSTOM = path.join(HERE, "probes", "forms-custom");
const SRC = (file) => `/FormsProbe/Sources/${file}`;
const G = "getCurrentFormEditorGlobals()";
const J = JSON.stringify;

// Blocks every call the flags do not guard that writes the user's registry, and makes the designer's DPI the page's.
const GUARD_JS = `(() => {
  if (!window.__guarded) {
    window.__guarded = true;
    const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
    hostAppObject = new Proxy(hostAppObject, {
      get(target, key) {
        if (blocked.has(key)) return async () => undefined;
        return Reflect.get(target, key);
      },
    });
  }
  currentDPI = window.devicePixelRatio;
  return true;
})()`;

// Records the type of every message the active designer sends to the IDE (onChanged,
// onSignificantChange, ownerUndo...), once per designer.
const HOOK_JS = `(() => {
  const g = ${G};
  if (!g || g.__hooked) return !!g;
  g.__hooked = true;
  window.__msgs = [];
  const real = g.vscode.postMessage.bind(g.vscode);
  g.vscode.postMessage = (m) => { window.__msgs.push(m && m.type); return real(m); };
  return true;
})()`;

const ID_JS = `(p) => p.Name + (p.Index >= 0 ? "(" + p.Index + ")" : "")`;
// Every control of the active designer as the surface holds it, by name and index.
const SURFACE_JS = `(() => {
  const g = ${G}; if (!g) return null; const id = ${ID_JS}; const out = {};
  for (const x of g.allControls || []) { const p = x.properties || {}; out[id(p)] = { L: p.Left, T: p.Top, W: p.Width, H: p.Height }; }
  return out;
})()`;
// Every control as the designer's form state holds it (what Save writes), and the locked list.
const STATE_JS = `(() => {
  const g = ${G}; if (!g) return null; const id = ${ID_JS}; const out = {};
  const f = g.state.item.form;
  const walk = (o) => { for (const x of o._children || []) { out[id(x)] = { L: x.Left, T: x.Top, W: x.Width, H: x.Height }; walk(x); } };
  walk(f[0]);
  return { controls: out, locked: (f[0].__IDEOptions || {}).lockedControls || [] };
})()`;
const SELECTED_JS = `(() => { const g = ${G}; const id = ${ID_JS}; return (g.selectedControls || []).map((x) => x === g.designer ? "(form)" : id(x.properties)); })()`;
const AT_JS = (id) => `(() => {
  const g = ${G}; const id = ${ID_JS};
  const x = (g.allControls || []).find((x) => id(x.properties) === ${J(id)});
  if (!x) return null;
  const r = x.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;
const TABS_JS = `[...document.querySelectorAll("#codePanelTabs > .tabItem")].map((t) => ({
  name: t.innerText.trim(), selected: t.classList.contains("tabItemSelected"), dirty: !!t.querySelector(".circleIconSmall"),
}))`;
const MENU_OPEN_JS = `(() => { const m = document.querySelector("#contextMenu"); return !!m && m.getBoundingClientRect().width > 0; })()`;
const MENU_ITEMS_JS = (
  sub,
) => `[...document.querySelectorAll(${J(sub ? "#contextMenuSUB > *" : "#contextMenu > *")})].map((e) => {
  const r = e.getBoundingClientRect();
  return { cls: String(e.className), text: e.innerText.replace(/\\s+/g, " ").trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
}).filter((i) => i.w)`;
const BOXES_JS = `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => ({
  text: m.innerText.replace(/\\s+/g, " ").trim(),
  buttons: [...m.querySelectorAll(".msgBoxButton, button")].map((b) => b.textContent.trim()).filter(Boolean),
}))`;
// The PROPERTIES rows shown: name and the value in its box.
const PROPS_JS = `[...document.querySelectorAll(".propertyName")].filter((e) => e.getBoundingClientRect().height).map((n) => {
  const v = n.nextElementSibling; const i = v && v.querySelector("input, select, textarea");
  return { name: n.textContent.trim(), value: i ? (i.type === "checkbox" ? i.checked : i.value) : v ? v.innerText.trim() : null };
})`;
const PROP_BOX_JS = (name) => `(() => {
  const n = [...document.querySelectorAll(".propertyName")].find((e) => e.getBoundingClientRect().height && e.textContent.trim() === ${J(name)});
  const e = n && n.nextElementSibling && (n.nextElementSibling.querySelector("input, select, textarea") || n.nextElementSibling);
  if (!e) return null;
  e.scrollIntoView({ block: "center" });
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;
const TOOLS_JS = (scope) => `[...document.querySelectorAll(${J(`${scope} .toolboxItemOuter`)})]
  .filter((e) => e.getBoundingClientRect().width).map((e) => {
    const r = e.getBoundingClientRect();
    return { name: (e.title || e.innerText || "").trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })`;
const HISTORY_ROWS_JS = `(() => {
  const p = document.querySelector('.floatingPanel[id="HISTORY"]');
  if (!p) return null;
  return [...p.querySelectorAll(".treeItemInner")].filter((e) => e.getBoundingClientRect().width).map((e) => {
    const q = e.getBoundingClientRect();
    return { text: e.innerText.replace(/\\s+/g, " ").trim(), x: q.x + Math.min(60, q.width / 2), y: q.y + q.height / 2 };
  });
})()`;
const TOOLTIP_JS = `(() => { const t = document.querySelector("#hoverTooltip"); return t && t.classList.contains("visibleTooltip") ? t.innerText : null; })()`;

const near = (a, b, tolerance = 1) => Math.abs(Number(a) - Number(b)) <= tolerance;
const THREE = ["Command1", "Check1", "Command2(0)"];
const pick = (all, ids) => Object.fromEntries(ids.map((id) => [id, all[id]]));

scenario("designing forms and reports", (lane) => {
  let c;

  // ---------------------------------------------------------------- input

  const mods = ({ alt, ctrl, shift } = {}) => (alt ? 1 : 0) | (ctrl ? 2 : 0) | (shift ? 8 : 0);
  async function clickAt(x, y, { clickCount = 1, ...m } = {}) {
    const modifiers = mods(m);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, modifiers });
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount, modifiers });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount, modifiers });
    await sleep(250);
  }
  async function doubleClickAt(x, y) {
    await clickAt(x, y);
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 2 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 2 });
    await sleep(400);
  }
  const moveTo = (x, y) => c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

  // ---------------------------------------------------------------- reading the designer

  const surface = () => c.evaluate(SURFACE_JS);
  const formState = () => c.evaluate(STATE_JS);
  const selected = () => c.evaluate(SELECTED_JS);
  const tabs = () => c.evaluate(TABS_JS);
  const tab = async (name) => (await tabs()).find((t) => t.name === name) ?? null;
  const menuOpen = () => c.evaluate(MENU_OPEN_JS);
  const boxes = () => c.evaluate(BOXES_JS);
  const props = () => c.evaluate(PROPS_JS);
  const prop = async (name) => (await props()).find((r) => r.name === name)?.value;
  const zoom = () => c.evaluate("zoomSelect.value");
  // The designer's messages since the last call, the selection changes left out.
  const messages = () => c.evaluate("(window.__msgs || []).splice(0).filter((m) => m !== 'onChangedSelection')");

  async function clickControl(id, m = {}) {
    const p = await c.evaluate(AT_JS(id));
    assert.ok(p, `the designer has no control ${id}`);
    await clickAt(p.x, p.y, m);
  }
  // A click on an empty part of the form, near its bottom-right corner: the designer has the focus.
  async function clickForm() {
    const r = await c.evaluate(
      `(() => { const r = ${G}.designer.getBoundingClientRect(); return { x: r.x + r.width * 0.97, y: r.y + r.height * 0.97 }; })()`,
    );
    await clickAt(r.x, r.y);
  }
  async function select(...ids) {
    await clickForm();
    for (const [i, id] of ids.entries()) await clickControl(id, i ? { shift: true } : {});
    await sleep(300);
    assert.deepEqual(await selected(), ids);
  }
  async function answer(caption) {
    const r = await c.evaluate(`(() => {
      const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
      const m = ms[ms.length - 1];
      const b = m && [...m.querySelectorAll(".msgBoxButton, button")].find((e) => e.textContent.trim() === ${J(caption)} && e.getBoundingClientRect().width);
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(r, `no box with a ${caption} button`);
    await clickAt(r.x, r.y);
    await sleep(500);
  }

  // ---------------------------------------------------------------- menus

  const menuItems = (sub = false) => c.evaluate(MENU_ITEMS_JS(sub));
  async function closeMenus() {
    if (await menuOpen()) {
      await pressKey(c, "Escape");
      await sleep(300);
    }
  }
  // Clicks a menu of the IDE's menu bar open, then the item, then the item of its submenu.
  async function choose(menu, item, sub = null) {
    const r = await c.evaluate(
      `(() => { const q = document.getElementById("rootMenu${menu}").getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`,
    );
    await clickAt(r.x, r.y);
    await sleep(400);
    const items = await menuItems();
    const it = items.find((i) => i.text.startsWith(item));
    if (!it || /Disabled/.test(it.cls)) {
      await closeMenus();
      assert.fail(`${menu} > ${item} is ${it ? "greyed" : "missing"}: ${items.map((i) => i.text).join(" | ")}`);
    }
    await moveTo(it.x, it.y);
    await clickAt(it.x, it.y);
    await sleep(sub ? 400 : 600);
    if (!sub) return;
    const subs = await menuItems(true);
    const s = subs.find((i) => i.text.startsWith(sub));
    if (!s || /Disabled/.test(s.cls)) {
      await closeMenus();
      assert.fail(`${menu} > ${item} > ${sub} is ${s ? "greyed" : "missing"}: ${subs.map((i) => i.text).join(" | ")}`);
    }
    await clickAt(s.x, s.y);
    await sleep(600);
  }

  // ---------------------------------------------------------------- designers and tabs

  async function waitForDesigner() {
    const ok = await waitFor(
      c,
      () =>
        c.evaluate(
          `(() => { const g = ${G}; return !!g && g.gotInitialFormData === true && (!g.resyncOverlay || g.resyncOverlay.style.visibility !== "visible"); })()`,
        ),
      { timeout: 30 * 1000, interval: 150 },
    );
    assert.ok(ok, "the designer never showed its form");
    await sleep(800);
    assert.equal(await c.evaluate(HOOK_JS), true);
    await messages();
  }
  // Opens a file as a double-click in Project Explorer does, without waiting for it to report
  // itself open (a read-only designer file never does).
  const openNode = (file) =>
    c.evaluate(`(() => {
      const node = fs.tree.resolvePath(${J(`twinbasic:${file}`)});
      if (!node) return false;
      openEditors.openFile(node, false, false, false, 1, 1);
      return true;
    })()`);
  async function openDesigner(file) {
    assert.ok(await openNode(file), `the project has no file ${file}`);
    await waitForDesigner();
  }
  // Where a tab's close icon is, or the tab itself when it has none.
  const TAB_CLOSE_JS = (name) => `(() => {
    const t = [...document.querySelectorAll("#codePanelTabs > .tabItem")].find((t) => t.innerText.trim() === ${J(name)});
    if (!t) return null;
    const x = t.querySelector(".codicon-close");
    const r = (x || t).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, icon: !!x };
  })()`;
  // Closes a tab with its close icon, or a middle click on a tab with none; answers a question
  // about unsaved changes with `reply`, and returns the question's buttons, or null when nothing
  // was asked.
  async function closeTab(name, reply = "Discard Changes") {
    const x = await c.evaluate(TAB_CLOSE_JS(name));
    if (!x) return null;
    if (x.icon) await clickAt(x.x, x.y);
    else {
      await moveTo(x.x, x.y);
      await c.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: x.x,
        y: x.y,
        button: "middle",
        clickCount: 1,
      });
      await c.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: x.x,
        y: x.y,
        button: "middle",
        clickCount: 1,
      });
    }
    await sleep(800);
    const asked = await boxes();
    if (asked.length) await answer(reply);
    await sleep(400);
    assert.equal(await tab(name), null, `the tab ${name} is still open`);
    return asked.length ? asked[0].buttons : null;
  }
  // The form as its file holds it, in a designer with no undo steps.
  async function fresh(file = "frmMain.tbform") {
    await closeMenus();
    await closeTab(file);
    await openDesigner(SRC(file));
    assert.equal(await zoom(), "1", "the designer did not open at 100 %");
  }

  // ---------------------------------------------------------------- PROPERTIES

  // Types a value into a PROPERTIES box as a person does: a click in the box, End and Backspaces
  // to clear it (Ctrl+A does nothing there), the value, Enter.
  async function setProp(name, value) {
    const r = await c.evaluate(PROP_BOX_JS(name));
    assert.ok(r, `PROPERTIES has no row ${name}`);
    await clickAt(r.x, r.y);
    await pressKey(c, "End");
    for (let i = 0; i < 30; i++) await pressKey(c, "Backspace");
    await typeText(c, String(value));
    await pressKey(c, "Enter");
    await sleep(800);
  }

  // ---------------------------------------------------------------- a project of the lane's

  async function openProject(src, check = null) {
    if (c) await lane.closeProject();
    if (check) lane.checkCompile = check;
    try {
      c = await lane.open(src);
    } finally {
      delete lane.checkCompile;
    }
    assert.equal(await c.evaluate(GUARD_JS), true);
  }

  before(async () => {
    await openProject(PROJECT);
  });

  // ---------------------------------------------------------------- History (bugs/history-form-line-undefined)

  // The tooltip of each row of the HISTORY panel, floated, as the pointer resting on it shows it.
  async function historyTooltips() {
    await c.evaluate(`executeIdeCommand("tbHistory_ShowPanel")`);
    const rows = await waitFor(c, async () => {
      const r = await c.evaluate(HISTORY_ROWS_JS);
      return r?.length ? r : null;
    });
    assert.ok(rows, "the HISTORY panel shows no row");
    const tips = [];
    for (const r of rows) {
      await moveTo(r.x - 2, r.y);
      await moveTo(r.x, r.y);
      tips.push(
        (await waitFor(c, () => c.evaluate(TOOLTIP_JS), { timeout: 5000, interval: 100 })) ??
          `(no tooltip on ${r.text})`,
      );
      await moveTo(2, 2);
      await sleep(300);
    }
    await c.evaluate(`executeIdeCommand("tbHistory_HidePanel")`);
    await sleep(500);
    return tips;
  }

  test("the History entry for a change in a designer reads [line: undefined] in its tooltip", async (t) => {
    await fresh();
    await clickControl("Command1");
    await pressKey(c, "ArrowRight");
    await sleep(1200);
    const tips = await historyTooltips();
    t.diagnostic(J(tips));
    assert.ok(
      tips.some((tip) => tip.startsWith(`${SRC("frmMain.tbform")} [line: undefined]`)),
      "no tooltip reads frmMain.tbform [line: undefined]",
    );
  });

  // The IDE adds an entry for an edit in a code file only inside a procedure: here Sub Main, on the
  // line `frmMain.Show`, at whose end a comment is typed.
  test("control: the History entry for an edit in a procedure names the line in its tooltip", async (t) => {
    const line = 5;
    await openFile(c, SRC("Startup.twin"), { line, column: 1 });
    await setCursor(c, line, (await c.evaluate(`editor.getModel().getLineMaxColumn(${line})`)) || 1);
    await typeText(c, " 'x");
    await sleep(2500);
    const tips = await historyTooltips();
    t.diagnostic(J(tips));
    assert.ok(
      tips.some((tip) => tip.startsWith(`${SRC("Startup.twin")} [line: ${line}]`)),
      `no tooltip reads Startup.twin [line: ${line}]`,
    );
  });

  // ---------------------------------------------------------------- Align > Center (bugs/form-align-center-edge)

  // Command1 10,50 100x30; Check1 140,55 100x24; Command2(0) 250,110 100x30.
  test("control: Align > Left puts the selected controls' left edges on the leftmost one", async () => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Align", "Left");
    const s = await surface();
    for (const id of THREE) assert.ok(near(s[id].L, 10), `${id} is at Left ${s[id].L}`);
  });

  test("Align > Center (Horizontal) centres every selected control on the leftmost left edge", async (t) => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Align", "Center (Horizontal)");
    const s = pick(await surface(), THREE);
    t.diagnostic(J(s));
    // The selection spans 10 to 350, whose centre is 180: each would be at Left 130.
    for (const id of THREE) assert.ok(near(s[id].L + s[id].W / 2, 10), `${id}'s centre is at ${s[id].L + s[id].W / 2}`);
  });

  test("Align > Center (Vertical) centres every selected control on the topmost top edge", async (t) => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Align", "Center (Vertical)");
    const s = pick(await surface(), THREE);
    t.diagnostic(J(s));
    // The selection spans 50 to 140, whose centre is 95.
    for (const id of THREE) assert.ok(near(s[id].T + s[id].H / 2, 50), `${id}'s centre is at ${s[id].T + s[id].H / 2}`);
  });

  // ---------------------------------------------------------------- Center In Container (bugs/form-center-in-container-zoom)

  // Frame1 is 200 x 130; Text2 in it is 120 x 24 at 20,30. Centred, it is at Left 40, Top 53.
  test("control: at 100 %, Center In Container centres a control in its Frame", async (t) => {
    await fresh();
    await select("Text2");
    await choose("Format", "Center In Container (Horizontally)");
    await select("Text2");
    await choose("Format", "Center In Container (Vertically)");
    const s = (await surface()).Text2;
    t.diagnostic(J(s));
    assert.ok(near(s.L, 40) && near(s.T, 53), `Text2 is at ${s.L},${s.T}`);
  });

  test("at 50 %, Center In Container puts a control in a Frame off centre", async (t) => {
    await fresh();
    await clickForm();
    await choose("View", "Zoom Out");
    await choose("View", "Zoom Out");
    assert.equal(await zoom(), "0.5");
    await select("Text2");
    await choose("Format", "Center In Container (Horizontally)");
    await select("Text2");
    await choose("Format", "Center In Container (Vertically)");
    const s = (await surface()).Text2;
    t.diagnostic(J(s));
    await clickForm();
    await choose("View", "Zoom In");
    await choose("View", "Zoom In");
    assert.equal(await zoom(), "1");
    assert.ok(near(s.L, -10) && near(s.T, 20.5), `Text2 is at ${s.L},${s.T}, not at 40,53 and not at -10,20.5`);
  });

  // ---------------------------------------------------------------- Spacing (bugs/form-spacing-not-recorded)

  test("control: Align > Left sends a change, makes an undo step, marks the form changed and reaches the form's state", async () => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Align", "Left");
    await sleep(1500);
    assert.deepEqual(await messages(), ["onChanged", "onSignificantChange"]);
    assert.equal((await tab("frmMain.tbform")).dirty, true);
    assert.ok(near((await formState()).controls.Check1.L, 10));
    await pressKey(c, "z", { ctrl: true });
    await sleep(800);
    assert.ok(near((await surface()).Check1.L, 140), "Ctrl+Z did not undo it");
  });

  test("Horizontal Spacing > Remove moves the controls but sends no change, makes no undo step and leaves the form's state and the tab as they were", async (t) => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Horizontal Spacing", "Remove");
    await sleep(1500);
    const moved = pick(await surface(), THREE);
    const state = pick((await formState()).controls, THREE);
    t.diagnostic(J({ moved, state }));
    assert.ok(near(moved.Check1.L, 110) && near(moved["Command2(0)"].L, 210), "the controls did not move");
    assert.ok(near(state.Check1.L, 140) && near(state["Command2(0)"].L, 250), "the form's state moved");
    assert.deepEqual(await messages(), []);
    assert.equal((await tab("frmMain.tbform")).dirty, false);
    await pressKey(c, "z", { ctrl: true });
    await sleep(800);
    assert.ok(near((await surface()).Check1.L, 110), "Ctrl+Z undid the move");
  });

  test("after Vertical Spacing > Remove, closing the designer asks nothing, and the form opens again with the old positions", async (t) => {
    await fresh();
    await select(...THREE);
    await choose("Format", "Vertical Spacing", "Remove");
    await sleep(1500);
    const moved = pick(await surface(), THREE);
    t.diagnostic(J(moved));
    assert.ok(near(moved.Check1.T, 80) && near(moved["Command2(0)"].T, 104), "the controls did not move");
    assert.equal(await closeTab("frmMain.tbform"), null, "closing asked about saving");
    await openDesigner(SRC("frmMain.tbform"));
    const s = await surface();
    assert.ok(
      near(s.Check1.T, 55) && near(s["Command2(0)"].T, 110),
      `reopened at ${s.Check1.T} and ${s["Command2(0)"].T}`,
    );
  });

  // ---------------------------------------------------------------- Make Same Size (bugs/form-same-size-not-saved)

  test("Make Same Size > Height (Shortest) marks the form changed, but the form's state keeps the old heights, and Save writes them", async (t) => {
    await fresh("frmSizes.tbform");
    await select(...THREE);
    await choose("Format", "Make Same Size", "Height (Shortest)");
    await sleep(1500);
    const made = pick(await surface(), THREE);
    const state = pick((await formState()).controls, THREE);
    t.diagnostic(J({ made, state }));
    assert.ok(near(made.Command1.H, 24), "Command1 was not made 24 high");
    assert.equal((await tab("frmSizes.tbform")).dirty, true);
    assert.ok(near(state.Command1.H, 30), "the form's state has the new height");
    // Straight after the menu: a click on the form first would itself save the new heights.
    await pressKey(c, "s", { ctrl: true });
    await sleep(1500);
    t.diagnostic(`asked on close: ${J(await closeTab("frmSizes.tbform"))}`);
    await openDesigner(SRC("frmSizes.tbform"));
    const s = await surface();
    assert.ok(near(s.Command1.H, 30) && near(s["Command2(0)"].H, 30), `reopened ${s.Command1.H} high`);
  });

  test("control: Make Same Size followed by another change is saved", async () => {
    await fresh("frmSaved.tbform");
    await select(...THREE);
    await choose("Format", "Make Same Size", "Height (Shortest)");
    await clickControl("Label1");
    await pressKey(c, "ArrowDown");
    await sleep(1200);
    await pressKey(c, "s", { ctrl: true });
    await sleep(1500);
    await closeTab("frmSaved.tbform", "Save");
    await openDesigner(SRC("frmSaved.tbform"));
    const s = await surface();
    assert.ok(near(s.Command1.H, 24) && near(s["Command2(0)"].H, 24), `reopened ${s.Command1.H} high`);
  });

  // ---------------------------------------------------------------- Lock Controls (bugs/form-lock-not-saved)

  test("Lock Controls on its own does not mark the form changed: closing asks nothing, and the lock is gone when the form is opened again", async (t) => {
    await fresh();
    await clickControl("Command1");
    await choose("Format", "Lock Controls");
    await sleep(1000);
    assert.deepEqual(await c.evaluate(`${G}.lockedControls`), ["Command1"]);
    assert.equal((await tab("frmMain.tbform")).dirty, false);
    assert.deepEqual((await formState()).locked, []);
    t.diagnostic(`messages: ${J(await messages())}`);
    assert.equal(await closeTab("frmMain.tbform"), null, "closing asked about saving");
    await openDesigner(SRC("frmMain.tbform"));
    assert.deepEqual(await c.evaluate(`${G}.lockedControls`), []);
  });

  test("control: Lock Controls followed by another change is saved", async () => {
    await fresh("frmSaved.tbform");
    await clickControl("Command1");
    await choose("Format", "Lock Controls");
    await clickControl("Label1");
    await pressKey(c, "ArrowDown");
    await sleep(1200);
    await pressKey(c, "s", { ctrl: true });
    await sleep(1500);
    await closeTab("frmSaved.tbform", "Save");
    await openDesigner(SRC("frmSaved.tbform"));
    assert.deepEqual(await c.evaluate(`${G}.lockedControls`), ["Command1"]);
  });

  // ---------------------------------------------------------------- the zoom box (bugs/form-zoom-box-arrows-move)

  test("Up Arrow in the zoom box zooms out and also moves the selected control up, as a change to the form", async (t) => {
    await fresh();
    await clickControl("Command1");
    await c.evaluate("zoomSelect.focus()");
    await pressKey(c, "ArrowUp");
    await pressKey(c, "ArrowUp");
    await sleep(1500);
    const z = await zoom();
    const s = (await surface()).Command1;
    const state = (await formState()).controls.Command1;
    const sent = await messages();
    t.diagnostic(J({ zoom: z, surface: s, state, sent }));
    await clickForm();
    await choose("View", "Zoom In");
    await choose("View", "Zoom In");
    assert.equal(z, "0.5");
    assert.ok(s.T < 50 && state.T < 50, `Command1 is at Top ${s.T}`);
    assert.equal((await tab("frmMain.tbform")).dirty, true);
    assert.equal(sent.filter((m) => m === "onSignificantChange").length, 2);
  });

  // ---------------------------------------------------------------- Zoom Out (bugs/form-zoom-out-floor)

  test("View > Zoom Out goes 100 %, 75 %, 50 % and then stays at 50 %, though the zoom box offers 25 %", async () => {
    await fresh();
    await clickForm();
    const steps = [];
    for (let i = 0; i < 4; i++) {
      await choose("View", "Zoom Out");
      steps.push(await zoom());
    }
    const offered = await c.evaluate("[...zoomSelect.options].map((o) => o.value)");
    await choose("View", "Zoom In");
    await choose("View", "Zoom In");
    assert.ok(offered.includes("0.25"), `the box offers ${J(offered)}`);
    assert.deepEqual(steps, ["0.75", "0.5", "0.5", "0.5"]);
  });

  test("control: View > Zoom In goes up one step from 50 %", async () => {
    await fresh();
    await clickForm();
    await choose("View", "Zoom Out");
    await choose("View", "Zoom Out");
    assert.equal(await zoom(), "0.5");
    await choose("View", "Zoom In");
    assert.equal(await zoom(), "0.75");
    await choose("View", "Zoom In");
    assert.equal(await zoom(), "1");
  });

  // ---------------------------------------------------------------- Escape (bugs/form-escape-marks-changed)

  test("control: a click on one control and then on another leaves the form unchanged", async () => {
    await fresh();
    await clickControl("Command1");
    await clickControl("Text1");
    await sleep(1000);
    assert.deepEqual(await messages(), []);
    assert.equal((await tab("frmMain.tbform")).dirty, false);
  });

  // Not every try does it: in the lane's first four runs, two tries in seven did not, with the
  // designer focused and no menu open. Each try is in a freshly opened designer, and a test passes
  // on the first try that does it, out of TRIES; all five miss it about once in five hundred runs.
  const TRIES = 5;
  async function escapeThenMove() {
    await clickControl("Command1");
    await pressKey(c, "Escape");
    await sleep(600);
    assert.deepEqual(await selected(), ["(form)"]);
    const r = await c.evaluate(
      `(() => { const r = ${G}.designer.getBoundingClientRect(); return { x: r.right - 100, y: r.bottom - 50 }; })()`,
    );
    await moveTo(r.x, r.y);
    await sleep(1000);
  }

  // What the surface shows is compared, not the form's state: the change writes the surface into
  // the state, so a position the surface rounds to a device pixel (Check1's Top 55, shown 54.67)
  // changes there.
  test("Escape, which selects the form, and then a pointer move over it mark the form changed with no control moved", async (t) => {
    const tries = [];
    for (let i = 0; i < TRIES; i++) {
      await fresh();
      const before = await surface();
      const stateBefore = (await formState()).controls;
      await escapeThenMove();
      const sent = await messages();
      const dirty = (await tab("frmMain.tbform")).dirty;
      const same = J(await surface()) === J(before);
      const stateAfter = (await formState()).controls;
      const rewritten = Object.keys(stateAfter).filter((id) => J(stateAfter[id]) !== J(stateBefore[id]));
      tries.push({
        sent,
        dirty,
        same,
        rewritten: Object.fromEntries(rewritten.map((id) => [id, [stateBefore[id], stateAfter[id]]])),
      });
      if (dirty && sent.includes("onSignificantChange") && same) break;
    }
    t.diagnostic(J(tries));
    assert.ok(
      tries.some((x) => x.dirty && x.sent.includes("onSignificantChange") && x.same),
      "no try marked the form changed",
    );
  });

  test("the change that Escape and a pointer move make is an undo step that changes nothing", async (t) => {
    const tries = [];
    for (let i = 0; i < TRIES; i++) {
      await fresh();
      await clickControl("Command1");
      await pressKey(c, "ArrowRight");
      await sleep(800);
      const moved = (await surface()).Command1.L;
      await messages();
      await escapeThenMove();
      const sent = await messages();
      // The designer still has the focus: a click on the form here could make a step of its own.
      await pressKey(c, "z", { ctrl: true });
      await sleep(800);
      const undone = (await surface()).Command1.L;
      tries.push({ moved, sent, undone });
      if (sent.includes("onSignificantChange") && near(undone, moved, 0.01)) break;
    }
    t.diagnostic(J(tries));
    // The arrow press moved Command1 from 10 to 10.67; the first Ctrl+Z leaves it there.
    assert.ok(
      tries.some((x) => x.moved > 10.5 && x.sent.includes("onSignificantChange") && near(x.undone, x.moved, 0.01)),
      "Ctrl+Z undid the arrow press at once",
    );
  });

  // ---------------------------------------------------------------- Ctrl+A (bugs/properties-ctrl-a)

  test("control: Ctrl+A with the designer focused selects every control", async () => {
    await fresh();
    await clickForm();
    await pressKey(c, "a", { ctrl: true });
    await sleep(600);
    assert.deepEqual([...(await selected())].sort(), [
      "Check1",
      "Command1",
      "Command2(0)",
      "Command2(1)",
      "Frame1",
      "Label1",
      "Text1",
      "Text2",
    ]);
  });

  test("Ctrl+A in a PROPERTIES box selects nothing", async () => {
    await fresh();
    await clickControl("Command1");
    const r = await c.evaluate(PROP_BOX_JS("Caption"));
    await clickAt(r.x, r.y);
    await pressKey(c, "End");
    await pressKey(c, "a", { ctrl: true });
    await sleep(400);
    const box = await c.evaluate(
      `(() => { const a = document.activeElement; return a && "selectionStart" in a ? { value: a.value, start: a.selectionStart, end: a.selectionEnd } : null; })()`,
    );
    await pressKey(c, "Escape");
    assert.deepEqual(box, { value: "Command1", start: 8, end: 8 });
    assert.deepEqual(await selected(), ["Command1"]);
  });

  // ---------------------------------------------------------------- Alt+arrow (bugs/form-alt-arrow-menu)

  test("control: Alt+Left aligns the selected controls' left edges", async () => {
    await fresh();
    await select("Command1", "Check1");
    await pressKey(c, "ArrowLeft", { alt: true });
    await sleep(900);
    await closeMenus();
    assert.ok(near((await surface()).Check1.L, 10));
  });

  test("Alt+Left in the designer also opens the IDE's menu bar", async () => {
    await fresh();
    await select("Command1", "Check1");
    await pressKey(c, "ArrowLeft", { alt: true });
    await sleep(900);
    const open = await menuOpen();
    await closeMenus();
    assert.equal(open, true);
  });

  // ---------------------------------------------------------------- the control-array question (bugs/form-array-question-twice)

  const QUESTION = (name) => `A control already exists with the name '${name}'. Do you want to create a control array?`;

  test("control: renaming a control to another's name and answering NO asks once and keeps the name", async () => {
    await fresh();
    await clickControl("Check1");
    await setProp("Name", "Text1");
    const asked = await boxes();
    assert.equal(asked.length, 1);
    assert.ok(asked[0].text.includes(QUESTION("Text1")), asked[0].text);
    await answer("NO");
    await sleep(800);
    assert.deepEqual(await boxes(), []);
    assert.equal(await prop("Name"), "Check1");
  });

  test("renaming Label1 to Check1 asks the control-array question twice: the first YES makes Check1 an array, the second renames Label1", async (t) => {
    await fresh();
    await clickControl("Label1");
    await setProp("Name", "Check1");
    assert.ok((await boxes())[0]?.text.includes(QUESTION("Check1")), "no question");
    await answer("YES");
    await sleep(1500);
    const between = { boxes: (await boxes()).map((b) => b.text), names: Object.keys(await surface()) };
    t.diagnostic(J(between));
    assert.ok(between.boxes[0]?.includes(QUESTION("Check1")), "the question was not asked again");
    assert.ok(between.names.includes("Check1(0)") && between.names.includes("Label1"));
    await answer("YES");
    await sleep(1500);
    const names = Object.keys(await surface());
    assert.ok(names.includes("Check1(1)") && !names.includes("Label1"), J(names));
  });

  // ---------------------------------------------------------------- units: the control for bugs/customcontrols-properties-twips

  test("control: on a form of the VB package, PROPERTIES shows a control's Left in twips and takes a typed value in twips", async () => {
    await fresh();
    await clickControl("Command1");
    assert.equal(await prop("Left"), "150");
    await setProp("Left", "450");
    assert.ok(near((await surface()).Command1.L, 30));
    assert.equal(await prop("Left"), "450");
  });

  // ---------------------------------------------------------------- Shift+F7 (bugs/form-switch-twin-folder)

  const NOT_A_FORM = "Unable to switch form design mode: this document is not part of a form";
  const selectedTab = async () => (await tabs()).find((x) => x.selected)?.name ?? null;

  test("Shift+F7 in the code of a form in the folder v1.twin.forms says the document is not part of a form", async () => {
    await openFile(c, SRC("v1.twin.forms/frmDeep.twin"), { line: 4, column: 1 });
    await setCursor(c, 4, 1);
    await pressKey(c, "F7", { shift: true });
    assert.ok(await waitFor(c, async () => (await notifications(c)).includes(NOT_A_FORM)), "no notification");
    assert.equal(await selectedTab(), "frmDeep.twin");
    assert.equal(await tab("frmDeep.tbform"), null);
  });

  // From a designer, the toolbar's Switch Between Form And Code button's command.
  test("control: Shift+F7 switches from a form's code to its designer, and the switch from frmDeep's designer opens its code", async () => {
    await openFile(c, SRC("frmMain.twin"), { line: 4, column: 1 });
    await setCursor(c, 4, 1);
    await pressKey(c, "F7", { shift: true });
    assert.ok(
      await waitFor(c, async () => (await selectedTab()) === "frmMain.tbform"),
      "frmMain's designer did not open",
    );
    await closeTab("frmDeep.twin");
    await openDesigner(SRC("v1.twin.forms/frmDeep.tbform"));
    await c.evaluate(`executeIdeCommand("tbEditor_SwitchToggleFormDesignCode")`);
    assert.ok(await waitFor(c, async () => (await selectedTab()) === "frmDeep.twin"), "frmDeep's code did not open");
  });

  // ---------------------------------------------------------------- a package's designer file (bugs/readonly-designer-empty-tab)

  test("a package's read-only designer file opens an empty tab of its name besides the notice that it cannot be opened", async (t) => {
    const file = "/FormsProbe/Packages/VB/Sources/DESIGNERS/tbObjectDesigner_PROPERTYPAGE.tbppage";
    assert.ok(await openNode(file), `the project has no file ${file}`);
    const notes = await waitFor(c, async () => {
      const n = await notifications(c);
      return n.includes("Can't open designer for a read-only document.") ? n : null;
    });
    assert.ok(notes, "no notification");
    await sleep(1000);
    const name = "tbObjectDesigner_PROPERTYPAGE.tbppage";
    const opened = await tab(name);
    const close = await c.evaluate(TAB_CLOSE_JS(name));
    t.diagnostic(J({ opened, close }));
    assert.equal(opened?.selected, true);
    // The tab has no close icon; a middle click closes it.
    assert.equal(close.icon, false);
    await closeTab(name);
  });

  // ---------------------------------------------------------------- Add (bugs/add-form-bad-name)

  // Add Windows Form, as the Project Explorer's Add menu does; the name box offers MyForm.tbform
  // with MyForm selected, and the form goes into Sources.
  async function addForm(name) {
    await closeMenus();
    await c.evaluate(`executeIdeCommand("tbFileSystem_AddWindowsForm")`);
    const offered = await waitFor(c, () =>
      c.evaluate(
        `(() => { const a = document.activeElement; return a && a.tagName === "INPUT" && /\\.tbform$/.test(a.value) ? a.value : null; })()`,
      ),
    );
    assert.ok(offered, "no name box");
    await typeText(c, name);
    await pressKey(c, "Enter");
    assert.ok(await waitFor(c, () => tab(`${name}.tbform`), { timeout: 20 * 1000 }), `no tab ${name}.tbform`);
    await waitForDesigner();
  }

  // The folder Add puts a file in follows what Project Explorer has selected, so the file is
  // looked for in the whole project.
  async function codeOf(fileName) {
    const found = await c.evaluate(`(() => {
      const out = [];
      const walk = (n, p) => { for (const v of Object.values(n.entries || {})) { const q = p + "/" + v.name; if (v.name === ${J(fileName)}) out.push(q); walk(v, q); } };
      walk(fs.tree.resolvePath("twinbasic:/FormsProbe"), "/FormsProbe");
      return out;
    })()`);
    assert.equal(found.length, 1, `${fileName} is at ${J(found)}`);
    await openFile(c, found[0]);
    return { file: found[0], code: await editorText(c) };
  }

  test("control: Add Windows Form named My Form writes Class [My Form]", async (t) => {
    await addForm("My Form");
    const { file, code } = await codeOf("My Form.twin");
    t.diagnostic(file);
    assert.match(code, /^Class \[My Form\]$/m);
  });

  test("Add Windows Form accepts the name 1bad, which is not an identifier, and writes Class 1bad, which does not compile", async (t) => {
    await addForm("1bad");
    assert.deepEqual(await boxes(), []);
    const { file, code } = await codeOf("1bad.twin");
    assert.match(code, /^Class 1bad$/m);
    const outcome = compileOutcome(await waitForCompile(c, { project: lane.project, timeout: 60 * 1000 }), {
      name: "the forms probe",
    });
    t.diagnostic(J(outcome.rows ?? outcome.message));
    assert.ok(outcome.ok, outcome.message);
    assert.deepEqual(outcome.rows, [`{ERROR} ${file} [4,7]: TB5174 Invalid number format`]);
  });

  // ---------------------------------------------------------------- a report (bugs/report-floating-toolbox)

  test("control: with a report open, the docked Toolbox lists the report's seven tools", async () => {
    await closeMenus();
    await c.evaluate(`executeIdeCommand("tbFileSystem_AddWindowsReport")`);
    assert.ok(
      await waitFor(c, () =>
        c.evaluate(
          `(() => { const a = document.activeElement; return a && a.tagName === "INPUT" && /\\.tbreport$/.test(a.value); })()`,
        ),
      ),
      "no name box",
    );
    await pressKey(c, "Enter");
    assert.ok(await waitFor(c, () => tab("MyReport.tbreport"), { timeout: 20 * 1000 }), "no tab MyReport.tbreport");
    await waitForDesigner();
    const docked = (await c.evaluate(TOOLS_JS("#bodyInner"))).map((x) => x.name);
    assert.deepEqual(docked, ["Pointer", "Label", "Shape", "Line", "Image", "CheckMark", "QRCode"]);
  });

  test("with a report open, a floating Toolbox lists every tool of a form", async (t) => {
    await c.evaluate(`executeIdeCommand("tbToolbox_HidePanel")`);
    await sleep(800);
    await c.evaluate(`executeIdeCommand("tbToolbox_ShowPanel")`);
    await sleep(1500);
    const floating = (await c.evaluate(TOOLS_JS('.floatingPanel[id="TOOLBOX"]'))).map((x) => x.name);
    t.diagnostic(J(floating));
    assert.equal(await selectedTab(), "MyReport.tbreport");
    for (const tool of ["TextBox", "CommandButton", "Frame", "Timer", "MultiFrame"]) {
      assert.ok(floating.includes(tool), `the floating Toolbox has no ${tool}`);
    }
    assert.equal(floating.filter((x) => x !== "Add component...").length, 24);
  });

  // ---------------------------------------------------------------- bad JSON (bugs/form-bad-json-empty-designer)

  // The project does not compile, on purpose: its only errors are the two frmBad gives.
  function badJsonCompiles(waited) {
    const outcome = compileOutcome(waited, { name: "probes/forms-badjson" });
    if (!outcome.ok) throw new Error(`probes/forms-badjson: ${outcome.message}`);
    const codes = outcome.rows.map((r) => /TB\d+/.exec(r)?.[0]).sort();
    if (J(codes) !== J(["TB5246", "TB5247"])) throw new Error(`probes/forms-badjson: ${outcome.rows.join("; ")}`);
  }

  test("a form file with bad JSON opens an empty designer that adds no control, and Save leaves the file as it was", async (t) => {
    await openProject(BAD, badJsonCompiles);
    const file = "/FormsBadJson/Sources/frmBad.tbform";
    assert.ok(await openNode(file));
    const notes = await waitFor(c, async () => {
      const n = await notifications(c);
      return n.includes("ERROR: bad JSON encountered when parsing tbform") ? n : null;
    });
    assert.ok(notes, "no notification");
    await sleep(2000);
    assert.equal((await tab("frmBad.tbform"))?.selected, true);
    assert.deepEqual(await surface(), {});
    assert.deepEqual(await props(), []);
    const tool = (await c.evaluate(TOOLS_JS("#bodyInner"))).find((x) => x.name === "CommandButton");
    assert.ok(tool, "the Toolbox has no CommandButton");
    await doubleClickAt(tool.x, tool.y);
    await sleep(1500);
    assert.deepEqual(await surface(), {});
    assert.equal((await tab("frmBad.tbform")).dirty, false);
    await pressKey(c, "s", { ctrl: true });
    await sleep(2500);
    const out = path.join(lane.work, "forms-badjson-saved");
    unpackProject(lane.project, out);
    const flat = (s) => s.replace(/\s+/g, "");
    const saved = readFileSync(path.join(out, "Sources", "frmBad.tbform"), "utf8");
    t.diagnostic(saved.slice(0, 120));
    assert.equal(flat(saved), flat(readFileSync(path.join(BAD, "Sources", "frmBad.tbform"), "utf8")));
  });

  // ---------------------------------------------------------------- CustomControls (bugs/customcontrols-properties-twips)

  test("on a CustomControls form, PROPERTIES shows a control's Left in twips but takes a typed value in pixels", async () => {
    await openProject(CUSTOM);
    await openDesigner("/CustomControlsDemo/Sources/frmCustom.tbform");
    await clickControl("MyButton1");
    assert.ok(near((await surface()).MyButton1.L, 20));
    assert.equal(await prop("Left"), "300");
    await setProp("Left", "40");
    assert.ok(near((await surface()).MyButton1.L, 40), "the typed 40 was not taken as pixels");
    assert.equal(await prop("Left"), "600");
  });
});
