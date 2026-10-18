// The code editor and the panels used while writing code, tested against seven entries in
// BUGS-TO-REPORT.md:
//
//   "Format Selection from a continuation line fails with *IDE startup failure*, and closes an IDE
//   that was opened with its project" (bugs/format-selection-continuation)
//   "The Diagnostics panel's Copy and Copy All put HTML in the text, and label an info or a hint
//   {WARNING}" (bugs/diagnostics-copy-html)
//   "The Outline panel lists a file's modules and classes but none of their members"
//   (bugs/outline-no-members)
//   "Go To Definition, Ctrl+Up and Ctrl+Down put the caret on the line after a declaration"
//   (bugs/definition-line-after)
//   "Escape does not remove the extra cursors" (bugs/escape-keeps-cursors)
//   "An editor tab opened after the compiler has reported its file is not tinted for the file's
//   warnings or errors" (bugs/tab-tint-opened-later)
//   "Shift+F10 opens the code editor's context menu at the top-left corner of the IDE window, not
//   at the caret" (bugs/shift-f10-menu-corner)
//
// The project in probes/code-editor has two files: Editing.twin, whose Subs Continued and Plain
// are left unindented for Format Selection, and Helpers.twin, with the function Twice and two
// diagnostics, the info TB0012 and the warning TB0018, which its Settings set to those levels.
//
// The first test closes the IDE (the defect), and starts the lane's next IDE on the project. The
// lane opens the project on the IDE's command line, as a .twinproj opened from Explorer is; an IDE
// started from its icon prints the same failure in the DEBUG CONSOLE instead and stays open, which
// is not tested here.
//
// THE IDE IS STARTED WITH --no-save-ide-settings and --no-update-recent-files (IDE_FLAGS in
// scripts/lib/tb-ide.mjs), so it writes none of its options to the user's own registry (HKCU\Software\VB
// and VBA Program Settings\twinBASIC_IDE\IDESettings). The flags do not guard the Window key or the
// removals from the recent list. So, as soon as the project is open, the page's hostAppObject is
// replaced by a proxy whose ChangeWindowSetting and RemoveRecentsList calls do nothing, as
// customising.test.mjs does. THE USER'S CLIPBOARD IS NEVER TOUCHED: the
// Diagnostics panel copies with navigator.clipboard.writeText, which in the IDE's WebView2 writes
// the Windows clipboard, so that and the host's copyClipboardIDE request are replaced by recorders
// first. Nothing here reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order. Each test states what BETA 1010 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the
// IDE has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the
// callout on the page of docs/IDE/Code/ that carries it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import {
  answerMessageBox,
  clickAt,
  editorState,
  messageBoxes,
  openFile,
  pressKey,
  select,
  setCursor,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "code-editor");
const SOURCES = "/CodeEditorProbe/Sources/";
const EDITING = `${SOURCES}Editing.twin`;
const HELPERS = `${SOURCES}Helpers.twin`;
const read = (name) => readFileSync(path.join(PROJECT, "Sources", name), "utf8").split(/\r?\n/);
const EDITING_SRC = read("Editing.twin");
const HELPERS_SRC = read("Helpers.twin");
const lineIn = (src, text, from = 1) => {
  const n = src.findIndex((l, i) => i >= from - 1 && l.includes(text)) + 1;
  assert.ok(n > 0, `no line holding ${JSON.stringify(text)}`);
  return n;
};
const MAIN = lineIn(EDITING_SRC, "Public Sub Main()");
const MAIN_DIM = lineIn(EDITING_SRC, "Dim total As Long");
const MAIN_CALL = lineIn(EDITING_SRC, "total = Helpers.Twice(3)");
const MAIN_PRINT = lineIn(EDITING_SRC, "Debug.Print total");
const CONTINUED = lineIn(EDITING_SRC, "Public Sub Continued()");
const CONTINUATION = lineIn(EDITING_SRC, "b As Long");
const PLAIN = lineIn(EDITING_SRC, "Public Sub Plain()");
const PLAIN_SELECT = lineIn(EDITING_SRC, "Select Case c");
const PLAIN_END_SELECT = lineIn(EDITING_SRC, "End Select", PLAIN);
const TWICE = lineIn(HELPERS_SRC, "Public Function Twice(");
const BIG_VALUE = lineIn(HELPERS_SRC, "Public Const BigValue");
const NARROWING = lineIn(HELPERS_SRC, "narrow = Twice(2)");

// Blocks every call the flags do not guard that writes the user's registry, and records every copy instead of letting it
// reach the Windows clipboard (see the top of this file).
const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
  window.__copies = [];
  navigator.clipboard.writeText = (t) => { window.__copies.push(String(t)); return Promise.resolve(); };
  navigator.clipboard.write = () => { window.__copies.push("(clipboard.write)"); return Promise.resolve(); };
  const request = debugSocket.request.bind(debugSocket);
  debugSocket.request = function (method, params, cb, ...rest) {
    if (method === "copyClipboardIDE") { window.__copies.push(String(params && params.text)); if (cb) cb({ body: {} }); return; }
    return request(method, params, cb, ...rest);
  };
})()`;

const lines = (c, from, to) =>
  c.evaluate(`Array.from({ length: ${to - from + 1} }, (_, i) => editor.getModel().getLineContent(${from} + i))`);
const selections = (c) =>
  c.evaluate(`editor.getSelections().map((s) => s.positionLineNumber + ":" + s.positionColumn)`);

// The screen point of a line and column of the code editor.
const pointAt = (c, line, column) =>
  c.evaluate(`(() => {
    editor.revealPositionInCenterIfOutsideViewport({ lineNumber: ${line}, column: ${column} });
    const p = editor.getScrolledVisiblePosition({ lineNumber: ${line}, column: ${column} });
    const r = editor.getDomNode().getBoundingClientRect();
    return p ? { x: r.x + p.left + 2, y: r.y + p.top + p.height / 2 } : null;
  })()`);

scenario("the code editor and its panels", (lane) => {
  let c;

  // A right-click with real mouse events.
  async function rightClick(x, y) {
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await c.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" ? "none" : "right",
        buttons: type === "mousePressed" ? 2 : 0,
        clickCount: 1,
      });
    }
    await sleep(500);
  }

  // Clicks the item of the open context menu that reads `label`.
  async function pickMenuItem(label) {
    const at = await c.evaluate(`(() => {
      const it = [...document.querySelectorAll("#contextMenu > *")].find((e) => e.innerText.replace(/\\s+/g, " ").trim() === ${JSON.stringify(label)} && e.getBoundingClientRect().width);
      if (!it) return null;
      const q = it.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(at, `the context menu has no item ${label}`);
    await clickAt(c, at.x, at.y);
    await sleep(500);
  }

  // The rows of the Diagnostics panel: their text and where to click them.
  const problemRows = () =>
    c.evaluate(`[...(problemsPanel.tree.sectionHeader.parentNode).querySelectorAll(".problemNodeItem")]
      .map((e) => { const r = e.getBoundingClientRect(); return { text: e.innerText.replace(/\\s+/g, " ").trim(), x: r.x + 60, y: r.y + r.height / 2, shown: !!(r.width && r.height) }; })
      .filter((r) => r.shown)`);

  // Starts the lane's IDE on the project, with its page guarded, and opens Editing.twin.
  async function start() {
    c = await lane.open(PROJECT);
    await c.evaluate(GUARD_JS);
    await openFile(c, EDITING, { line: MAIN, column: 1 });
  }

  const running = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  // Selects the continuation line of Continued and the line after it, chooses Edit > Format
  // Selection, and returns the alert that opens, or null.
  async function formatFromContinuation() {
    c.dialogs.length = 0;
    await select(c, { startLine: CONTINUATION, startColumn: 1, endLine: CONTINUATION + 1, endColumn: 999 });
    await c.evaluate(`executeIdeCommand("tbEditor_FormatSelection")`);
    return waitFor(c, () => c.dialogs.find((d) => d.type === "alert"), { timeout: 5000 });
  }

  const checkAlert = (alert) => {
    assert.ok(alert, "Format Selection opened no alert");
    assert.match(alert.message, /^IDE startup failure \(BETA twinBASIC IDE BETA \d+\):/);
    assert.match(alert.message, /Assignment to constant variable\./);
    assert.match(alert.message, /provideDocumentRangeFormattingEdits/);
  };

  before(start);

  test("Format Selection on a selection that starts on a continuation line opens an IDE startup failure alert, and the IDE then closes", async (t) => {
    const pid = lane.run.pid;
    const alert = await formatFromContinuation();
    t.diagnostic(JSON.stringify(alert?.message.split("\n").slice(0, 4).join(" / ")));
    checkAlert(alert);
    const ended = await waitFor(null, () => !running(pid), { timeout: 15 * 1000, interval: 250 });
    assert.ok(ended, "the IDE was still running 15 s after the alert");
    // The IDE has gone: the lane's next IDE is started on the same project.
    c.dialogs.length = 0;
    await lane.closeProject();
    await start();
  });

  // start() opens Editing.twin only, so Helpers.twin, which has the warning TB0018, has no tab yet.
  const HELPERS_NODE = `fs.tree.resolvePath(${JSON.stringify(`twinbasic:${HELPERS}`)})`;
  const helpersTint = () =>
    c.evaluate(`(() => {
      const n = ${HELPERS_NODE};
      const tab = n.openEditorNode && n.openEditorNode.tabElement;
      return { row: n.treeItemClass || "", warnings: n.cachedDiagnostics_warningCount || 0, tab: tab ? tab.className : null };
    })()`);

  test("a tab opened on a file the compiler has already reported stays untinted, while its Project Explorer row is tinted", async (t) => {
    const reported = await waitFor(
      c,
      async () => {
        const s = await helpersTint();
        return s.row === "warning" ? s : null;
      },
      { timeout: 30 * 1000 },
    );
    t.diagnostic(`before the tab opens: ${JSON.stringify(reported ?? (await helpersTint()))}`);
    assert.ok(reported, "the Project Explorer row of Helpers.twin is not tinted for its warning");
    assert.equal(reported.tab, null, "Helpers.twin has a tab already");
    await openFile(c, HELPERS, { line: 1, column: 1 });
    await sleep(3000);
    const now = await helpersTint();
    t.diagnostic(`3 s after the tab opened: ${JSON.stringify(now)}`);
    assert.ok(now.tab, "Helpers.twin has no tab");
    assert.ok(now.tab.includes("tabItem"), `not a tab: ${now.tab}`);
    assert.doesNotMatch(now.tab, /\b(warning|error)\b/, "the tab is tinted");
    assert.equal(now.row, "warning", "the Project Explorer row is no longer tinted");
  });

  test("control: after an edit to the file and its undo, the compiler reports it again and its tab is tinted", async (t) => {
    await openFile(c, HELPERS, { line: 1, column: 1 });
    const original = await c.evaluate("editor.getModel().getValue()");
    const version = await c.evaluate("editor.getModel().getAlternativeVersionId()");
    await c.evaluate(
      `editor.executeEdits("code-editor.test", [{ range: new monaco.Range(1, editor.getModel().getLineMaxColumn(1), 1, editor.getModel().getLineMaxColumn(1)), text: " " }])`,
    );
    const tinted = await waitFor(
      c,
      async () => {
        const s = await helpersTint();
        return /\bwarning\b/.test(s.tab ?? "") ? s : null;
      },
      { timeout: 15 * 1000, interval: 100 },
    );
    const undone = await c.evaluate(`(() => {
      const m = editor.getModel();
      for (let i = 0; i < 20 && m.getAlternativeVersionId() !== ${version} && m.canUndo(); i++) editor.trigger("code-editor.test", "undo");
      return m.getAlternativeVersionId() === ${version};
    })()`);
    t.diagnostic(`after the edit: ${JSON.stringify(tinted ?? (await helpersTint()))}`);
    assert.ok(undone, "the edit could not be undone");
    assert.equal(await c.evaluate("editor.getModel().getValue()"), original);
    assert.ok(tinted, "the tab of Helpers.twin was not tinted after the edit");
  });

  // The open context menu's place, or null when none is open.
  const menuRect = () =>
    c.evaluate(`(() => {
      const m = document.getElementById("contextMenu");
      const r = m && m.getBoundingClientRect();
      return r && r.width && m.children.length ? { x: r.x, y: r.y, items: [...m.children].map((e) => e.innerText.replace(/\\s+/g, " ").trim()).filter(Boolean) } : null;
    })()`);
  async function closeMenu() {
    await pressKey(c, "Escape");
    assert.ok(await waitFor(c, async () => !(await menuRect())), "the context menu stayed open after Escape");
  }

  test("control: a right-click in the code opens the editor's menu at the pointer", async (t) => {
    await openFile(c, EDITING, { line: MAIN_PRINT, column: 9 });
    const at = await pointAt(c, MAIN_PRINT, 9);
    assert.ok(at, "the line is not on screen");
    await rightClick(at.x, at.y);
    const menu = await menuRect();
    t.diagnostic(`clicked at ${Math.round(at.x)},${Math.round(at.y)}; the menu: ${JSON.stringify(menu)}`);
    assert.ok(menu, "no menu opened");
    assert.match(menu.items[0], /^Go To Definition\b/);
    assert.ok(Math.abs(menu.x - at.x) < 30 && Math.abs(menu.y - at.y) < 30, "the menu is not at the pointer");
    await closeMenu();
  });

  test("Shift+F10 opens the editor's menu at the top-left corner of the IDE window, not at the caret", async (t) => {
    await setCursor(c, MAIN_PRINT, 9);
    const caret = await pointAt(c, MAIN_PRINT, 9);
    assert.equal(await menuRect(), null, "a menu is open already");
    await pressKey(c, "F10", { shift: true });
    const menu = await waitFor(c, menuRect, { timeout: 5000 });
    t.diagnostic(`the caret at ${Math.round(caret.x)},${Math.round(caret.y)}; the menu: ${JSON.stringify(menu)}`);
    assert.ok(menu, "Shift+F10 opened no menu");
    assert.match(menu.items[0], /^Go To Definition\b/);
    assert.ok(caret.x > 100 && caret.y > 100, "the caret is too near the corner to tell");
    assert.deepEqual([Math.round(menu.x), Math.round(menu.y)], [0, 0]);
    await closeMenu();
  });

  test("Escape leaves the two cursors that Ctrl+Alt+Down added", async (t) => {
    await openFile(c, EDITING, { line: MAIN_DIM, column: 9 });
    await setCursor(c, MAIN_DIM, 9);
    await pressKey(c, "ArrowDown", { ctrl: true, alt: true });
    await pressKey(c, "ArrowDown", { ctrl: true, alt: true });
    await sleep(300);
    const added = await selections(c);
    t.diagnostic(`after Ctrl+Alt+Down twice: ${JSON.stringify(added)}`);
    assert.equal(added.length, 3, "Ctrl+Alt+Down twice did not give three cursors");
    await pressKey(c, "Escape");
    await sleep(300);
    assert.deepEqual(await selections(c), added, "the first Escape changed the cursors");
    await pressKey(c, "Escape");
    await sleep(300);
    assert.deepEqual(await selections(c), added, "the second Escape changed the cursors");
  });

  test("control: a click in the code goes back to one cursor", async () => {
    assert.ok((await selections(c)).length > 1, "there are not several cursors to start from");
    const at = await pointAt(c, MAIN_PRINT, 9);
    assert.ok(at, "the line is not on screen");
    await clickAt(c, at.x, at.y);
    await sleep(300);
    assert.deepEqual(await selections(c), [`${MAIN_PRINT}:9`]);
  });

  test("control: Go To Definition on a local variable puts the caret on its Dim line", async () => {
    const col = EDITING_SRC[MAIN_PRINT - 1].indexOf("total") + 2;
    await setCursor(c, MAIN_PRINT, col);
    await pressKey(c, "F12");
    const s = await waitFor(c, async () => {
      const e = await editorState(c);
      return e.line !== MAIN_PRINT ? e : null;
    });
    assert.ok(s, "F12 did not move the caret");
    assert.equal(s.file, EDITING);
    assert.equal(s.line, MAIN_DIM);
  });

  test("Go To Definition on a function in another module puts the caret on the line after its declaration", async (t) => {
    await openFile(c, EDITING, { line: MAIN_CALL, column: 1 });
    const col = EDITING_SRC[MAIN_CALL - 1].indexOf("Twice") + 2;
    await setCursor(c, MAIN_CALL, col);
    await pressKey(c, "F12");
    const s = await waitFor(c, async () => {
      const e = await editorState(c);
      return e.file === HELPERS ? e : null;
    });
    assert.ok(s, "F12 did not open Helpers.twin");
    await sleep(800);
    const e = await editorState(c);
    t.diagnostic(
      `Twice is declared on line ${TWICE}; the caret is at ${e.line}:${e.column}, ${JSON.stringify(e.lineText)}`,
    );
    assert.equal(e.line, TWICE + 1);
  });

  test("Ctrl+Down puts the caret on the line after the next procedure's declaration, and Ctrl+Up on the line after its own procedure's", async (t) => {
    await openFile(c, EDITING, { line: MAIN_DIM, column: 1 });
    await setCursor(c, MAIN_DIM, 1);
    await pressKey(c, "ArrowDown", { ctrl: true });
    await sleep(500);
    const down = await editorState(c);
    t.diagnostic(`Continued is declared on line ${CONTINUED}; Ctrl+Down put the caret at ${down.line}:${down.column}`);
    assert.equal(down.line, CONTINUED + 1);
    await setCursor(c, PLAIN + 2, 1);
    await pressKey(c, "ArrowUp", { ctrl: true });
    await sleep(500);
    const up = await editorState(c);
    t.diagnostic(
      `Plain is declared on line ${PLAIN}; Ctrl+Up from line ${PLAIN + 2} put the caret at ${up.line}:${up.column}`,
    );
    assert.equal(up.line, PLAIN + 1);
  });

  test("the Diagnostics panel's Copy puts the code in a <span>, and Copy All labels the info {WARNING}", async (t) => {
    await c.evaluate(`executeIdeCommand("tbProblems_ShowPanel"); executeIdeCommand("tbProblems_TurnShowInfosOn")`);
    const rows = await waitFor(
      c,
      async () => {
        const r = await problemRows();
        return r.some((x) => x.text.startsWith("TB0018")) && r.some((x) => x.text.startsWith("TB0012")) ? r : null;
      },
      { timeout: 30 * 1000 },
    );
    assert.ok(rows, `the Diagnostics panel does not show TB0018 and TB0012: ${JSON.stringify(await problemRows())}`);
    const warning = rows.find((x) => x.text.startsWith("TB0018"));

    await c.evaluate("window.__copies.length = 0");
    await rightClick(warning.x, warning.y);
    await pickMenuItem("Copy");
    const copy = await c.evaluate("window.__copies.splice(0)");
    t.diagnostic(`Copy: ${JSON.stringify(copy)}`);
    assert.equal(copy.length, 1, "Copy copied nothing, or more than once");
    assert.match(
      copy[0],
      new RegExp(
        `^\\{WARNING\\} ${HELPERS.replace(/\//g, "\\/")} \\[${NARROWING},\\d+\\]: <span>TB0018</span>implicit narrowing`,
      ),
    );

    await rightClick(warning.x, warning.y);
    await pickMenuItem("Copy All");
    const all = await c.evaluate("window.__copies.splice(0)");
    t.diagnostic(`Copy All: ${JSON.stringify(all)}`);
    assert.equal(all.length, 1, "Copy All copied nothing, or more than once");
    assert.match(all[0], /^twinBASIC \(twinBASIC IDE BETA \d+\) compilation error report:\r\n/);
    assert.match(
      all[0],
      new RegExp(` \\{WARNING\\} ${HELPERS.replace(/\//g, "\\/")} \\[${BIG_VALUE},\\d+\\]: <span>TB0012</span>`),
    );
    assert.match(all[0], / <span>TB0018<\/span>/);
  });

  test("the Outline lists the module Editing and none of its procedures", async (t) => {
    await c.evaluate(`executeIdeCommand("tbOutline_ShowPanel")`);
    await openFile(c, HELPERS);
    await openFile(c, EDITING);
    const symbols = await waitFor(
      c,
      async () => {
        const s = await c.evaluate(
          `outlinePanel && outlinePanel.cachedSymbols ? JSON.stringify(outlinePanel.cachedSymbols.map((s) => ({ name: s.name, children: (s.children || []).map((k) => k.name) }))) : null`,
        );
        return s && s.includes('"Editing"') ? JSON.parse(s) : null;
      },
      { timeout: 15 * 1000 },
    );
    await sleep(500);
    const text = await c.evaluate(`outlinePanel.tree.sectionHeader.parentNode.innerText.replace(/\\s+/g, " ").trim()`);
    t.diagnostic(`symbols: ${JSON.stringify(symbols)}; panel: ${JSON.stringify(text)}`);
    assert.ok(symbols, "the Outline never had the symbols of Editing.twin");
    assert.deepEqual(symbols, [{ name: "Editing", children: [] }]);
    for (const name of ["Main", "Continued", "Plain"]) {
      assert.ok(!text.includes(name), `the Outline shows ${name}: ${JSON.stringify(text)}`);
    }
  });

  test("control: Format Selection re-indents a selection that starts on a Select Case line", async (t) => {
    c.dialogs.length = 0;
    await select(c, { startLine: PLAIN_SELECT, startColumn: 1, endLine: PLAIN_END_SELECT, endColumn: 999 });
    await c.evaluate(`executeIdeCommand("tbEditor_FormatSelection")`);
    const want = ["        Select Case c", "            Case 1", "                c = 2", "        End Select"];
    const got = await waitFor(c, async () => {
      const l = await lines(c, PLAIN_SELECT, PLAIN_END_SELECT);
      return l.join("|") === want.join("|") ? l : null;
    });
    t.diagnostic(JSON.stringify(await lines(c, PLAIN_SELECT, PLAIN_END_SELECT)));
    assert.ok(got, "Format Selection did not re-indent the four lines");
    assert.deepEqual(c.dialogs.splice(0), [], "Format Selection opened an alert");
  });

  // The control above has left the project with unsaved changes.
  test("with unsaved changes, the same Format Selection changes nothing, and the IDE asks to save them before it closes", async (t) => {
    const pid = lane.run.pid;
    const original = await lines(c, CONTINUATION - 1, CONTINUATION + 1);
    const alert = await formatFromContinuation();
    checkAlert(alert);
    const box = await waitFor(c, async () => (await messageBoxes(c)).pop());
    t.diagnostic(`the box: ${JSON.stringify(box)}`);
    assert.ok(box, "no message box opened after the alert");
    assert.equal(box.text.trim(), "You've made changes to this project. Save now?");
    assert.deepEqual(box.buttons, ["Save", "Discard Changes", "Cancel"]);
    await answerMessageBox(c, "Cancel");
    await sleep(1500);
    assert.ok(running(pid), "Cancel did not keep the IDE running");
    assert.deepEqual(await messageBoxes(c), [], "the box stayed open after Cancel");
    assert.deepEqual(
      await lines(c, CONTINUATION - 1, CONTINUATION + 1),
      original,
      "Format Selection changed the lines",
    );
    c.dialogs.length = 0;
  });
});
