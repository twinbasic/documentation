// Running and debugging, tested against eight entries in BUGS-TO-REPORT.md:
//
//   "F6 does not find the procedure when the caret is right of the column where the procedure's
//   End line ends, or on that End line" (bugs/f6-procedure-not-found)
//   "After a stop at a breakpoint, Step Out does not stop in the procedure's caller"
//   (bugs/step-out-after-breakpoint)
//   "The Variables panel's edit box cuts a String at an apostrophe, and leaving it sets the
//   variable to the part before" (bugs/variables-edit-apostrophe)
//   "After an edit in the Variables panel, a Double or Date row shows a wrong value until the next
//   refresh" (bugs/variables-edit-stale-display)
//   "Hovering over a Sub call while paused runs the Sub" (bugs/hover-runs-sub)
//   "Search Online does not encode the error text: an & in it cuts the search short"
//   (bugs/search-online-unencoded)
//   "An edit at the run-time error panel prints Aborting, and the rest of the program runs"
//   (bugs/edit-at-error-panel-runs-on)
//   "A compile error at F5 is reported as a codegen error to report, at the caller's line"
//   (bugs/compile-error-reported-as-codegen)
//
// The project in probes/debugging has a Sub Main that calls Direct, then Locals, whose locals are
// of several types, then Fails, which raises an error whose description holds an &, and then
// prints "main end"; and a Function Answer that nothing calls, for F6. The tests find its lines
// by their @ marks.
//
// THE IDE SAVES ITS OPTIONS AND PANEL LAYOUT IN THE USER'S OWN REGISTRY (HKCU\Software\VB and VBA
// Program Settings\twinBASIC_IDE\IDESettings). So, as soon as the project is open, the page's
// hostAppObject is replaced by a proxy whose SaveIDESetting, ChangeWindowSetting and recent-list
// calls do nothing, as memory.test.mjs does. NO TEST OPENS A BROWSER: the error panel's Search
// Online calls root.Shell with a "cmd.exe /c start" command line, so root.Shell is replaced by a
// recorder at the same time, and before() fails, before any run, if the recorder is not in place.
// Nothing here reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order. The edits the last tests make (a letter typed at the end
// of the @EDIT comment, a line that does not compile in Direct) are not undone. Each test states
// what BETA 1005 does; the tests named "control" pass whether or not the defects are fixed. If
// another fails after an IDE update, the IDE has changed: update the entry in BUGS-TO-REPORT.md, or
// its report in bugs/filed/, the callout on the page of docs/IDE/Debugging/ that carries it, and
// then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import {
  click,
  clickAt,
  openFile,
  pressKey,
  setCursor,
  typeText,
  waitFor,
  waitForEditAnswer,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "debugging");
const FILE = "/DebuggingProbe/Sources/Startup.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
// The 1-based line of a mark, and the 1-based column of a word on it (inside the word).
const at = (mark) => {
  const n = SOURCE.findIndex((l) => new RegExp(`@${mark}\\b`).test(l)) + 1;
  assert.ok(n > 0, `no line marked @${mark}`);
  return n;
};
const columnOf = (line, word) => SOURCE[line - 1].indexOf(word) + 2;
const MAIN = SOURCE.findIndex((l) => l.includes("Public Sub Main()")) + 1;
const CALL_DIRECT = at("CALLDIRECT");
const M2 = at("M2");
const DIRECT = at("DIRECT");
// Direct's End Sub, which carries no comment: where it ends matters to F6.
const DIRECT_END = SOURCE.findIndex((l, i) => i >= DIRECT && l.trim() === "End Sub") + 1;
const ANSWER = at("ANSWER");
const LOCALS = SOURCE.findIndex((l) => l.includes("Public Sub Locals()")) + 1;
const BUMP = at("BUMP");
const LOCALS_END = at("LOCALSEND");
const RAISE = at("RAISE");
const EDIT = at("EDIT");

const ABORTING = "[EDIT & CONTINUE] not yet supported.  Aborting.";
const NOT_FOUND = "RunCodeUnderCursor: failed to identify the procedure at the cursor position.";

// Blocks every call that writes the user's registry, and records every command line the page
// passes to root.Shell instead of running it (see the top of this file).
const GUARD_JS = `(() => {
  if (!window.__guarded) {
    window.__guarded = true;
    const blocked = new Set(["SaveIDESetting", "ChangeWindowSetting", "AddRecentsList", "RemoveRecentsList"]);
    hostAppObject = new Proxy(hostAppObject, {
      get(target, key) {
        if (blocked.has(key)) return async () => undefined;
        return Reflect.get(target, key);
      },
    });
    window.__shell = [];
    const recorder = function (command) { window.__shell.push(String(command)); return Promise.resolve(0); };
    recorder.__tbRecorder = true;
    root.Shell = recorder;
  }
  return !!(root.Shell && root.Shell.__tbRecorder);
})()`;

// Whether it is paused and running, the line it is paused on, and the error panel's text.
const STATE_JS = `(() => {
  const w = document.querySelector(".errorWidget");
  return {
    paused: !!context.atBreakpoint.value,
    running: !!context.codeExecuting.value,
    line: activeDebuggingLine,
    panel: w ? w.innerText : null,
  };
})()`;

// A row of the Variables panel's Locals: its value as shown, and where to click on it.
const ROW_JS = (name) => `(() => {
  const locals = Object.values(variablesPanel.tree.rootFolder.entries).find((e) => e.name === "Locals");
  const row = locals && Object.values(locals.entries || {}).find((e) => e.name === ${JSON.stringify(name)});
  if (!row || !row.innerDiv) return null;
  row.innerDiv.scrollIntoView({ block: "center" });
  const q = row.innerDiv.getBoundingClientRect();
  return { value: row.customRenderData.value, x: q.x + q.width * 0.6, y: q.y + Math.min(q.height, 20) / 2 };
})()`;
const EDIT_BOX_JS = `(() => { const e = document.getElementById("renameInput"); return e ? e.value : null; })()`;
const HOVER_JS = `(() => {
  const h = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 4);
  return h ? h.innerText.replace(/\\xa0/g, " ").replace(/\\n{2,}/g, "\\n").trim() : null;
})()`;
const GLYPHS_JS = `editor.getModel().getAllDecorations().filter((d) => /breakpointActiveGlyph/.test(d.options.glyphMarginClassName || "")).map((d) => d.range.startLineNumber)`;

scenario("running and debugging", (lane) => {
  let c;
  const state = () => c.evaluate(STATE_JS);

  // Wait for the run to stop or to end. The IDE's counters dip to 0 while a stop's events are
  // handled, so an end is confirmed by a second look.
  async function settled({ timeout = 60 * 1000 } = {}) {
    return waitFor(
      c,
      async () => {
        const s = await state();
        if (s.paused) return "paused";
        if (s.running) return false;
        await sleep(1500);
        const again = await state();
        return again.paused ? "paused" : again.running ? false : "ended";
      },
      { timeout, interval: 150 },
    );
  }
  // Wait for the run to end, confirmed by a second look; false if it is still going.
  async function ended({ timeout = 30 * 1000 } = {}) {
    return !!(await waitFor(
      c,
      async () => {
        if ((await state()).running) return false;
        await sleep(1500);
        return !(await state()).running;
      },
      { timeout, interval: 150 },
    ));
  }
  async function run() {
    const mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    return mark;
  }
  async function stopIfRunning() {
    if ((await state()).running) {
      await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
      assert.ok(await waitFor(c, async () => !(await state()).running, { timeout: 30 * 1000 }), "the run did not stop");
      await sleep(1000);
    }
  }
  // F9 on each line, with the caret there, after Ctrl+Shift+F9 has cleared any others.
  async function breakpointsOn(...lines) {
    await openFile(c, FILE, { line: lines[0] ?? 1, column: 1 });
    if ((await c.evaluate(GLYPHS_JS)).length) {
      await pressKey(c, "F9", { ctrl: true, shift: true });
      assert.ok(await waitFor(c, async () => !(await c.evaluate(GLYPHS_JS)).length), "a breakpoint is left");
    }
    for (const line of lines) {
      assert.ok(await waitForEditAnswer(c), "the compiler never answered the last edit");
      await setCursor(c, line, 9);
      await pressKey(c, "F9");
      assert.ok(await waitFor(c, async () => (await c.evaluate(GLYPHS_JS)).includes(line)), `no breakpoint on ${line}`);
      await sleep(500);
    }
  }
  // A line typed into the DEBUG CONSOLE with Enter; what it printed, the line itself first.
  async function consoleLine(text) {
    const mark = await consoleMark(c);
    await c.evaluate(`(() => { const i = debugConsoleEntry; i.focus(); i.value = ${JSON.stringify(text)}; })()`);
    await pressKey(c, "Enter");
    await sleep(1500);
    return (await linesSince(c, mark)).filter((l) => !l.startsWith("(time taken"));
  }
  const row = (name) => c.evaluate(ROW_JS(name));
  async function doubleClickRow(name) {
    const r = await row(name);
    assert.ok(r, `the Variables panel has no row ${name}`);
    await clickAt(c, r.x, r.y);
    await clickAt(c, r.x, r.y, { clickCount: 2 });
    assert.ok(await waitFor(c, async () => (await c.evaluate(EDIT_BOX_JS)) !== null), `no edit box for ${name}`);
    // A key pressed before the box has the focus is lost.
    const focused = () => c.evaluate(`document.activeElement?.id === "renameInput"`);
    assert.ok(await waitFor(c, focused), `the edit box for ${name} never takes the focus`);
  }
  // Paused at the breakpoint on the @LOCALSEND line, in Locals.
  async function pausedInLocals() {
    const s = await state();
    if (s.paused && s.line === LOCALS_END && !s.panel) return;
    await stopIfRunning();
    await breakpointsOn(LOCALS_END);
    await run();
    assert.equal(await settled(), "paused", "the run did not stop at the breakpoint");
    assert.equal((await state()).line, LOCALS_END);
    await sleep(1000);
  }
  // Paused at the error panel on the @RAISE line, with no breakpoint on the way.
  async function atErrorPanel() {
    await stopIfRunning();
    await breakpointsOn();
    const mark = await run();
    assert.equal(await settled(), "paused", "the run did not stop at the error");
    const s = await state();
    assert.equal(s.line, RAISE);
    assert.ok(s.panel, "no error panel");
    await sleep(1000);
    return mark;
  }
  // Types a letter at the end of the @EDIT comment line, as a person editing the code does.
  async function typeInComment() {
    await openFile(c, FILE, { line: EDIT, column: 1 });
    await setCursor(c, EDIT, (await c.evaluate(`editor.getModel().getLineMaxColumn(${EDIT})`)) || 1);
    await typeText(c, "x");
  }

  before(async () => {
    c = await lane.open(PROJECT);
    assert.equal(await c.evaluate(GUARD_JS), true, "root.Shell could not be replaced: no test may click Search Online");
  });

  // ------------------------------------------------------------------ F6 (bugs/f6-procedure-not-found)

  async function f6(line, column) {
    await stopIfRunning();
    await breakpointsOn();
    await openFile(c, FILE, { line, column });
    await setCursor(c, line, column);
    const mark = await consoleMark(c);
    await pressKey(c, "F6");
    await sleep(2500);
    await settled();
    return linesSince(c, mark);
  }

  // Direct's End Sub ends at column 12 (after "End Sub" at 5), Answer's End Function at 17.
  const END_SUB_AFTER = SOURCE[DIRECT_END - 1].length + 1;
  const ANSWER_END = SOURCE.findIndex((l, i) => i >= ANSWER && l.trim() === "End Function");
  const END_FUNCTION_AFTER = SOURCE[ANSWER_END].length + 1;

  test("control: F6 on a line of a procedure, left of the column where its End line ends, runs the procedure", async () => {
    let lines = await f6(DIRECT, END_SUB_AFTER - 1);
    assert.deepEqual(lines.slice(0, 2), ["Executing 'DebuggingProbe.Startup.Direct'...", "in direct"]);
    lines = await f6(ANSWER, END_FUNCTION_AFTER - 1);
    assert.deepEqual(lines.slice(0, 1), ["Executing 'DebuggingProbe.Startup.Answer'..."]);
  });

  test("F6 on a line of a procedure, at or right of the column where its End line ends, does not find the procedure", async () => {
    assert.deepEqual(await f6(DIRECT, END_SUB_AFTER), [NOT_FOUND]);
    assert.deepEqual(await f6(ANSWER, END_FUNCTION_AFTER), [NOT_FOUND]);
  });

  test("F6 on an End Sub line does not find the procedure, at any column", async () => {
    assert.deepEqual(await f6(DIRECT_END, 1), [NOT_FOUND]);
    assert.deepEqual(await f6(DIRECT_END, 5), [NOT_FOUND]);
  });

  // ------------------------------------------------------------------ Step Out (bugs/step-out-after-breakpoint)

  test("control: after F8 into a procedure from a breakpoint in its caller, Step Out stops in the caller", async () => {
    await stopIfRunning();
    await breakpointsOn(CALL_DIRECT);
    await run();
    assert.equal(await settled(), "paused");
    assert.equal((await state()).line, CALL_DIRECT);
    await c.evaluate(`executeIdeCommand("tbDebug_StepInto")`);
    await sleep(2000);
    assert.equal(await settled(), "paused");
    const into = (await state()).line;
    assert.ok(into >= DIRECT - 1 && into <= DIRECT_END, `F8 stopped on ${into}, not in Direct`);
    await c.evaluate(`executeIdeCommand("tbDebug_StepOut")`);
    await sleep(2000);
    assert.equal(await settled(), "paused");
    assert.equal((await state()).line, M2);
    await stopIfRunning();
  });

  test("after a stop at a breakpoint in a procedure, Step Out does not stop in its caller: the run goes on", async (t) => {
    await stopIfRunning();
    await breakpointsOn(DIRECT);
    const mark = await run();
    assert.equal(await settled(), "paused");
    assert.equal((await state()).line, DIRECT);
    await c.evaluate(`executeIdeCommand("tbDebug_StepOut")`);
    await sleep(2000);
    assert.equal(await settled(), "paused");
    const s = await state();
    const lines = await linesSince(c, mark);
    t.diagnostic(`stopped on ${s.line}; printed ${JSON.stringify(lines)}`);
    // It runs on, past the rest of Main's calls, to the error in Fails.
    assert.equal(s.line, RAISE);
    assert.ok(s.panel, "no error panel");
    assert.ok(lines.includes("m2") && lines.includes("m3"), "Main's lines after the call did not run");
    await stopIfRunning();
  });

  test("after a stop at a breakpoint in a procedure, F8 off its End Sub does not stop in its caller, but in the next procedure the caller calls", async (t) => {
    await stopIfRunning();
    await breakpointsOn(DIRECT);
    const mark = await run();
    assert.equal(await settled(), "paused");
    assert.equal((await state()).line, DIRECT);
    await c.evaluate(`executeIdeCommand("tbDebug_StepInto")`);
    await sleep(2000);
    assert.equal(await settled(), "paused");
    assert.equal((await state()).line, DIRECT_END, "F8 did not stop on End Sub");
    await c.evaluate(`executeIdeCommand("tbDebug_StepInto")`);
    await sleep(2000);
    assert.equal(await settled(), "paused");
    const s = await state();
    const lines = await linesSince(c, mark);
    t.diagnostic(`stopped on ${s.line}; printed ${JSON.stringify(lines)}`);
    assert.equal(s.line, LOCALS);
    assert.ok(lines.includes("m2"), "Main's line after the call did not run");
    await stopIfRunning();
  });

  // ------------------------------------------------------------------ Variables (bugs/variables-edit-apostrophe)

  test("control: Escape in the Variables edit box leaves a String with an apostrophe as it was", async () => {
    await pausedInLocals();
    assert.deepEqual(await consoleLine(`s = "it's"`), [`s = "it's"`]);
    assert.equal((await row("s")).value, `"it's"`);
    await doubleClickRow("s");
    await pressKey(c, "Escape");
    await sleep(1500);
    assert.equal((await row("s")).value, `"it's"`);
    assert.deepEqual(await consoleLine("? s"), ["? s", "it's"]);
  });

  test("the Variables edit box holds a String only up to an apostrophe, and Enter sets the variable to the empty string", async () => {
    await pausedInLocals();
    await consoleLine(`s = "it's"`);
    await doubleClickRow("s");
    assert.equal(await c.evaluate(EDIT_BOX_JS), `"it`);
    await pressKey(c, "Enter");
    await sleep(1500);
    assert.equal((await row("s")).value, `""`);
    assert.deepEqual(await consoleLine("? s"), ["? s", ""]);
  });

  test("a click away from the Variables edit box, with nothing typed, sets a String with an apostrophe to the empty string", async () => {
    await pausedInLocals();
    await consoleLine(`s = "it's"`);
    await doubleClickRow("s");
    const other = await row("n");
    await clickAt(c, other.x, other.y);
    await sleep(1500);
    assert.equal(await c.evaluate(EDIT_BOX_JS), null, "the edit box is still open");
    assert.equal((await row("s")).value, `""`);
    assert.deepEqual(await consoleLine("? s"), ["? s", ""]);
  });

  // ------------------------------------------------------------------ Variables (bugs/variables-edit-stale-display)

  // Double-click the row, type the value over the box's text, Enter; the row two seconds later,
  // what ? prints, and the row after that console line.
  async function editValue(name, text) {
    await pausedInLocals();
    await doubleClickRow(name);
    // The box can lose the first keys typed while it takes the focus, so the text is typed until
    // the box holds it: what is under test is what Enter does with it.
    let typed = false;
    for (let attempt = 0; attempt < 3 && !typed; attempt++) {
      await c.evaluate(`document.getElementById("renameInput").select()`);
      await typeText(c, text);
      typed = await waitFor(c, async () => (await c.evaluate(EDIT_BOX_JS)) === text, { timeout: 1000 });
    }
    assert.ok(typed, `the edit box for ${name} does not hold ${text}`);
    await pressKey(c, "Enter");
    await sleep(2000);
    const shown = (await row(name)).value;
    const printed = await consoleLine(`? ${name}`);
    await sleep(500);
    return { shown, printed: printed.slice(1), after: (await row(name)).value };
  }

  test("control: a Long edited in the Variables panel shows its new value at once", async () => {
    assert.deepEqual(await editValue("n", "9"), { shown: "9", printed: ["9"], after: "9" });
  });

  test("a Double edited in the Variables panel shows 0 until the next refresh, while the variable holds the value", async () => {
    assert.deepEqual(await editValue("d", "7.25"), { shown: "0", printed: ["7.25"], after: "7.25" });
  });

  test("a Date edited in the Variables panel shows #12:00:00 AM# until the next refresh, while the variable holds the value", async () => {
    assert.deepEqual(await editValue("dt", "#1/2/2020#"), {
      shown: "#12:00:00 AM#",
      printed: ["1/2/2020"],
      after: "#1/2/2020#",
    });
  });

  // ------------------------------------------------------------------ hover (bugs/hover-runs-sub)

  // Moves the pointer away, then onto a word of the code, and returns the hover's text.
  async function hover(line, column) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5, button: "none", buttons: 0 });
    await sleep(700);
    const p = await c.evaluate(`(() => {
      editor.revealLineInCenterIfOutsideViewport(${line});
      const v = editor.getScrolledVisiblePosition({ lineNumber: ${line}, column: ${column} });
      const r = editor.getDomNode().getBoundingClientRect();
      return v ? { x: r.x + v.left + 2, y: r.y + v.top + v.height / 2 } : null;
    })()`);
    assert.ok(p, `line ${line} is not on screen`);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y, button: "none", buttons: 0 });
    const text = await waitFor(c, () => c.evaluate(HOVER_JS), { timeout: 5000, interval: 100 });
    await sleep(800);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5, button: "none", buttons: 0 });
    await sleep(500);
    return text;
  }

  test("control: hovering over a variable while paused shows its value", async () => {
    await pausedInLocals();
    await openFile(c, FILE, { line: LOCALS_END, column: 1 });
    assert.equal(await hover(LOCALS_END, columnOf(LOCALS_END, "Value")), "t.Value:   6");
    assert.deepEqual(await consoleLine("? t.Value"), ["? t.Value", "6"]);
  });

  test("hovering over a Sub call while paused runs the Sub", async () => {
    await pausedInLocals();
    await openFile(c, FILE, { line: BUMP, column: 1 });
    const before = (await consoleLine("? t.Value"))[1];
    assert.equal(await hover(BUMP, columnOf(BUMP, "Bump")), "t.Bump:   0");
    const after = (await consoleLine("? t.Value"))[1];
    assert.equal(Number(after), Number(before) + 1, `t.Value went from ${before} to ${after}`);
  });

  // ------------------------------------------------------------------ an edit while paused (bugs/edit-at-error-panel-runs-on)

  test("control: an edit at a breakpoint aborts the run: the rest of Main does not run", async (t) => {
    await pausedInLocals();
    const mark = await consoleMark(c);
    await typeInComment();
    assert.ok(await ended(), "the run did not end");
    const lines = await linesSince(c, mark);
    t.diagnostic(JSON.stringify(lines));
    assert.ok(lines.includes(ABORTING), "no Aborting line");
    assert.ok(lines.includes("aborted"), "no aborted line");
    assert.ok(!lines.includes("m3") && !lines.includes("main end"), "Main went on");
  });

  // ------------------------------------------------------------------ Search Online (bugs/search-online-unencoded)

  test("Search Online passes the error's text into the search URL unencoded, so an & in it ends the query", async () => {
    await atErrorPanel();
    // Checked again just before the click: the click must never reach the real root.Shell.
    assert.equal(await c.evaluate(`!!(root.Shell && root.Shell.__tbRecorder)`), true, "root.Shell is not the recorder");
    await c.evaluate(`window.__shell.length = 0`);
    await click(c, { css: ".errorWidgetButton", text: "Search Online" });
    await sleep(1000);
    assert.deepEqual(await c.evaluate(`window.__shell`), [
      'cmd.exe /c start "link" "https://www.google.com/search?q=twinBASIC VB6 Run-time error 5 (00000005) Fails with A & B"',
    ]);
    await stopIfRunning();
  });

  // ------------------------------------------------------------------ an edit at the error panel

  test("an edit at the error panel prints Aborting, and then the rest of Main runs", async (t) => {
    await atErrorPanel();
    const mark = await consoleMark(c);
    await typeInComment();
    assert.ok(await ended(), "the run did not end");
    const lines = await linesSince(c, mark);
    t.diagnostic(JSON.stringify(lines));
    assert.equal(lines[0], ABORTING);
    assert.ok(lines.includes("main end"), "the rest of Main did not run");
    assert.ok(!lines.includes("after raise"), "the rest of Fails ran");
    assert.ok(!lines.includes("aborted"));
  });

  // ------------------------------------------------------------------ a compile error at F5 (bugs/compile-error-reported-as-codegen)

  test("a compile error in a procedure Main calls is reported at F5 as a codegen error to report, at Main's call", async (t) => {
    await stopIfRunning();
    await breakpointsOn();
    await openFile(c, FILE, { line: DIRECT_END, column: 1 });
    await c.evaluate(
      `editor.executeEdits("tests", [{ range: new monaco.Range(${DIRECT_END}, 1, ${DIRECT_END}, 1), text: "        x = = 1\\n" }])`,
    );
    // The compiler reports the line before F5.
    const marked = await waitFor(
      c,
      () =>
        c.evaluate(
          `monaco.editor.getModelMarkers({ resource: editor.getModel().uri }).filter((m) => m.severity === monaco.MarkerSeverity.Error).length`,
        ),
      { timeout: 30 * 1000 },
    );
    t.diagnostic(`errors marked: ${marked}`);
    const mark = await run();
    assert.equal(await settled(), "paused");
    const s = await state();
    const lines = await linesSince(c, mark);
    t.diagnostic(JSON.stringify({ line: s.line, panel: s.panel, lines }));
    assert.equal(s.line, MAIN);
    assert.ok(
      s.panel?.includes(
        `COMPILATION (CODEGEN) ERROR AT LINE #${CALL_DIRECT}.  PLEASE REPORT THIS ERROR TO https://git.io/JMh6S`,
      ),
      `the panel reads ${JSON.stringify(s.panel)}`,
    );
    assert.ok(
      lines.includes(`[LINKER] compilation (codegen) error detected in 'Startup.Main' at line #${CALL_DIRECT}`),
      "no LINKER line",
    );
    assert.ok(!lines.includes("m1"), "Main ran");
    await stopIfRunning();
  });
});
