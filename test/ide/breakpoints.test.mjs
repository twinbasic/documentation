// Breakpoints across a compiler restart, and what an edit's answer and a save do
// to a breakpoint set just before them. The toolbar's Restart the compiler keeps
// the breakpoints as they were, whether they were removed with Debug > Clear All
// Breakpoints or with F9, and whether or not the project was saved in between.
// The project in probes/breakpoints prints three lines from Main and stops on the
// second, marked BREAK, only when a breakpoint is set there. Each test sets and
// clears breakpoints as a person does (F9, Ctrl+Shift+F9, Ctrl+S), restarts the
// compiler with the toolbar's button, reads the margin and runs Main.
//
// The tests at the end are tested against two entries in BUGS-TO-REPORT.md:
//
//   "A breakpoint set just after an edit loses its glyph, and the next breakpoint
//   set in that file removes it" (bugs/f9-after-edit-loses-glyph)
//   "A save right after F9 writes the breakpoints as they were before that F9"
//   (bugs/save-overtakes-breakpoint-change)
//
// Neither defect needs a race against the clock here. The first happens when the
// compiler's answer to an edit reaches the page after F9, so HOLD_ANSWER_JS keeps
// that answer in the page, F9 is pressed, and the answer is delivered: it is the
// compiler's own, made before the breakpoint reached it. The second happens when
// the save command runs before the timer that sends F9's change, so both run in
// one task of the page, where the timer cannot come between them.
//
// Each test states what BETA 1034 does; the tests named "control" pass whether or
// not the defects are fixed. If another fails after an IDE update, the IDE has
// changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the
// callout on docs/IDE/Debugging/Breakpoints-and-Stepping.md, and then this file.
//
// Each edit is one character at the end of the first line, a comment, taken out
// again with Backspace before the test ends, so no line moves and the file is
// as it was. Nothing here reaches SaveSetting, so lanes.mjs names no settings.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import {
  editorText,
  openFile,
  pressKey,
  restartCompiler,
  setCursor,
  waitFor,
  waitForEditAnswer,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "breakpoints");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
// The breakpoint's line, 1-based as the IDE counts it.
const BREAK = SOURCE.findIndex((l) => l.includes("' BREAK")) + 1;
// The line before it, the other place a test sets a breakpoint.
const OTHER = BREAK - 1;
const FILE = "/BreakpointsProbe/Sources/Startup.twin";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The lines the margin shows a breakpoint on, in the open file.
const GLYPHS_JS = `editor.getModel().getAllDecorations()
  .filter((d) => (d.options.glyphMarginClassName || "").includes("breakpointActiveGlyph"))
  .map((d) => d.range.startLineNumber).sort((a, b) => a - b)`;
const STATE_JS = `({ paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value,
  line: activeDebuggingLine })`;
// Keeps the compiler's answer to the next change that carries text in the page until
// window.__heldAnswer, which it sets when the answer arrives, is called.
const HOLD_ANSWER_JS = `(() => {
  const real = lspSocket.request;
  window.__heldAnswer = null;
  lspSocket.request = function (method, params, done) {
    if (method !== "textDocument/didChangeV2" || params.contentChanges === null) return real.apply(this, arguments);
    lspSocket.request = real;
    return real.call(this, method, params, (answer) => {
      window.__heldAnswer = () => done(answer);
    });
  };
})()`;

scenario("breakpoints across a compiler restart", (lane) => {
  let c;
  const glyphs = () => c.evaluate(GLYPHS_JS);
  const state = () => c.evaluate(STATE_JS);

  // F9 on the BREAK line; the margin changes at once. Each change is given a
  // second before the next key, as a person's pace gives it: a save straight after
  // F9 is the defect the last tests of this file are about, not these.
  async function toggle() {
    const was = (await glyphs()).includes(BREAK);
    await setCursor(c, BREAK, 9);
    await pressKey(c, "F9");
    assert.ok(await waitFor(c, async () => (await glyphs()).includes(BREAK) !== was), "F9 changed nothing");
    await sleep(1000);
  }
  async function clearAll() {
    await pressKey(c, "F9", { ctrl: true, shift: true });
    assert.ok(await waitFor(c, async () => !(await glyphs()).length), "Clear All Breakpoints left a breakpoint");
    await sleep(1000);
  }
  async function save() {
    await pressKey(c, "s", { ctrl: true });
    assert.ok(await waitFor(c, () => c.evaluate("!projectIsDirty")), "the project was not saved");
  }
  // The toolbar's Restart the compiler, then the margin once the IDE has asked
  // the new compiler for the open file's breakpoints.
  async function restart() {
    await restartCompiler(c, { project: lane.project });
    await sleep(1500);
    return glyphs();
  }
  // Run Main, as F5 does: "stopped" at the breakpoint, or "ran" to its end.
  async function run() {
    const mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    const how = await waitFor(
      c,
      async () => {
        if ((await state()).paused) return "stopped";
        return (await linesSince(c, mark)).includes("main end") ? "ran" : null;
      },
      { timeout: 30 * 1000 },
    );
    assert.ok(how, "the run neither stopped nor ended");
    if (how === "stopped") {
      assert.equal((await state()).line, BREAK);
      await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
      assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    }
    return how;
  }
  // Run Main to its end, going on from each stop: the lines it stopped on.
  async function stops() {
    const mark = await consoleMark(c);
    const lines = [];
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    for (;;) {
      // Each line stops the run once, so a stop on another line is the next stop.
      const how = await waitFor(
        c,
        async () => {
          const now = await state();
          if (now.paused && now.line !== lines.at(-1)) return "stopped";
          return (await linesSince(c, mark)).includes("main end") ? "ran" : null;
        },
        { timeout: 30 * 1000 },
      );
      assert.ok(how, "the run neither stopped nor ended");
      if (how === "ran") break;
      lines.push((await state()).line);
      await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    }
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not end");
    return lines;
  }
  // No breakpoint in the compiler, in the margin or in the saved project.
  async function noBreakpoints() {
    await pressKey(c, "F9", { ctrl: true, shift: true });
    await sleep(1000);
    assert.deepEqual(await glyphs(), [], "Clear All Breakpoints left a breakpoint");
    await save();
  }
  // F9 on a line, once the compiler has answered it.
  async function f9(line) {
    await setCursor(c, line, 9);
    await pressKey(c, "F9");
    assert.ok(await waitForEditAnswer(c), "the compiler never answered F9");
  }
  // One character at the end of the comment on line 1. `heldBack` keeps its answer in the page.
  async function edit({ heldBack = false } = {}) {
    if (heldBack) await c.evaluate(HOLD_ANSWER_JS);
    await setCursor(c, 1, SOURCE[0].length + 1);
    await pressKey(c, "x");
    if (heldBack) assert.ok(await waitFor(c, () => c.evaluate("!!window.__heldAnswer")), "the edit was not answered");
    else assert.ok(await waitForEditAnswer(c), "the compiler never answered the edit");
  }
  const deliverAnswer = () => c.evaluate("window.__heldAnswer()");
  async function undoEdit() {
    await setCursor(c, 1, SOURCE[0].length + 2);
    await pressKey(c, "Backspace");
    assert.ok(await waitForEditAnswer(c), "the compiler never answered the Backspace");
    assert.equal((await editorText(c)).split(/\r?\n/)[0], SOURCE[0], "the first line is not as it was");
  }
  // What F9 and Ctrl+S run, in one task of the page. F9's change is sent from a timer, and a
  // timer cannot fire inside a task, so the save goes first.
  const f9AndSave = async (line) => {
    await setCursor(c, line, 9);
    await c.evaluate(`(() => {
      executeIdeCommand("tbDebug_ToggleBreakpoint");
      executeIdeCommand("tbProject_SaveAllChanges");
    })()`);
    assert.ok(await waitFor(c, () => c.evaluate("!projectIsDirty")), "the project was not saved");
    assert.ok(await waitForEditAnswer(c), "the compiler never answered F9");
  };

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: BREAK, column: 9 });
  });

  test("Clear All Breakpoints stays in force across a restart: no breakpoint, and the run goes to its end", async () => {
    await toggle();
    await clearAll();
    assert.deepEqual(await restart(), []);
    assert.equal(await run(), "ran");
  });

  test("a breakpoint removed with F9 stays removed across a restart", async () => {
    await toggle();
    await toggle();
    assert.deepEqual(await restart(), []);
    assert.equal(await run(), "ran");
  });

  test("saving after Clear All Breakpoints keeps them cleared across a restart", async () => {
    await toggle();
    await clearAll();
    await save();
    assert.deepEqual(await restart(), []);
    assert.equal(await run(), "ran");
  });

  test("a breakpoint saved with the project survives a restart", async () => {
    await toggle();
    await save();
    assert.deepEqual(await restart(), [BREAK]);
    assert.equal(await run(), "stopped");
  });

  // ---------------- bugs/f9-after-edit-loses-glyph

  test("control: a breakpoint set once the compiler has answered an edit keeps its glyph, and the next one leaves it set", async () => {
    await noBreakpoints();
    await edit();
    await f9(BREAK);
    assert.deepEqual(await glyphs(), [BREAK]);
    await f9(OTHER);
    assert.deepEqual(await glyphs(), [OTHER, BREAK]);
    assert.deepEqual(await stops(), [OTHER, BREAK]);
    await undoEdit();
  });

  // The compiler has BREAK, and the answer to the next edit gives the page its list.
  test("a breakpoint set before the compiler has answered an edit loses its glyph when the answer arrives, the run still stops there, and the next edit brings the glyph back", async () => {
    await noBreakpoints();
    await edit({ heldBack: true });
    await f9(BREAK);
    assert.deepEqual(await glyphs(), [BREAK], "F9 drew no glyph");
    await deliverAnswer();
    assert.deepEqual(await glyphs(), [], "the glyph is still there");
    assert.deepEqual(await stops(), [BREAK]);
    await undoEdit();
    assert.deepEqual(await glyphs(), [BREAK]);
  });

  test("the next breakpoint set in that file removes the one that lost its glyph", async () => {
    await noBreakpoints();
    await edit({ heldBack: true });
    await f9(BREAK);
    await deliverAnswer();
    assert.deepEqual(await glyphs(), [], "the glyph is still there");
    await f9(OTHER);
    assert.deepEqual(await glyphs(), [OTHER]);
    assert.deepEqual(await stops(), [OTHER]);
    await undoEdit();
    assert.deepEqual(await glyphs(), [OTHER]);
  });

  test("a breakpoint cleared before the compiler has answered an edit gets its glyph back, though the run does not stop there, and the next edit takes the glyph away", async () => {
    await noBreakpoints();
    await f9(BREAK);
    await edit({ heldBack: true });
    await f9(BREAK);
    assert.deepEqual(await glyphs(), [], "F9 did not clear the glyph");
    await deliverAnswer();
    assert.deepEqual(await glyphs(), [BREAK], "the glyph did not come back");
    assert.deepEqual(await stops(), []);
    await undoEdit();
    assert.deepEqual(await glyphs(), []);
  });

  // ---------------- bugs/save-overtakes-breakpoint-change

  test("control: a breakpoint cleared once the compiler has answered it, and then saved, stays cleared across a restart", async () => {
    await noBreakpoints();
    await f9(BREAK);
    await f9(BREAK);
    await save();
    assert.deepEqual(await restart(), []);
    assert.deepEqual(await stops(), []);
  });

  test("F9 that clears a breakpoint, with Ctrl+S before its change is sent, saves the breakpoint: the margin is empty and the run does not stop, and after a restart it is back and stops the run", async () => {
    await noBreakpoints();
    await f9(BREAK);
    await f9AndSave(BREAK);
    assert.deepEqual(await glyphs(), []);
    assert.deepEqual(await stops(), []);
    assert.deepEqual(await restart(), [BREAK]);
    assert.deepEqual(await stops(), [BREAK]);
  });

  test("F9 that sets a breakpoint, with Ctrl+S before its change is sent, does not save it: after a restart it is gone", async () => {
    await noBreakpoints();
    await f9AndSave(BREAK);
    assert.deepEqual(await glyphs(), [BREAK]);
    assert.deepEqual(await stops(), [BREAK]);
    assert.deepEqual(await restart(), []);
    assert.deepEqual(await stops(), []);
  });
});
