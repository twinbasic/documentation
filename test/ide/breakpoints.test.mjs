// Breakpoints across a compiler restart: the toolbar's Restart the compiler
// undoes Debug > Clear All Breakpoints, unless the project was saved in between,
// while a breakpoint removed with F9 stays removed. The project in
// probes/breakpoints prints three lines from Main and stops on the second, marked
// BREAK, only when a breakpoint is set there. Each test sets and clears
// breakpoints as a person does (F9, Ctrl+Shift+F9, Ctrl+S), restarts the compiler
// with the toolbar's button, reads the margin and runs Main.
//
// Each test states what BETA 995 does. If one fails after an IDE update, the IDE
// has changed: update the entry "Clear All Breakpoints is undone by restarting the
// compiler, unless the project was saved in between" in BUGS-TO-REPORT.md, or its
// report in bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { openFile, pressKey, restartCompiler, setCursor, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "breakpoints");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
// The breakpoint's line, 1-based as the IDE counts it.
const BREAK = SOURCE.findIndex((l) => l.includes("' BREAK")) + 1;
const FILE = "/BreakpointsProbe/Sources/Startup.twin";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The lines the margin shows a breakpoint on, in the open file.
const GLYPHS_JS = `editor.getModel().getAllDecorations()
  .filter((d) => (d.options.glyphMarginClassName || "").includes("breakpointActiveGlyph"))
  .map((d) => d.range.startLineNumber)`;
const STATE_JS = `({ paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value,
  line: activeDebuggingLine })`;

scenario("breakpoints across a compiler restart", (lane) => {
  let c;
  const glyphs = () => c.evaluate(GLYPHS_JS);
  const state = () => c.evaluate(STATE_JS);

  // F9 on the BREAK line; the margin changes at once.
  async function toggle() {
    const was = (await glyphs()).includes(BREAK);
    await setCursor(c, BREAK, 9);
    await pressKey(c, "F9");
    assert.ok(await waitFor(c, async () => (await glyphs()).includes(BREAK) !== was), "F9 changed nothing");
  }
  async function clearAll() {
    await pressKey(c, "F9", { ctrl: true, shift: true });
    assert.ok(await waitFor(c, async () => !(await glyphs()).length), "Clear All Breakpoints left a breakpoint");
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

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: BREAK, column: 9 });
  });

  test("Clear All Breakpoints is undone by a restart: the breakpoint is back, and the run stops at it", async () => {
    await toggle();
    await clearAll();
    assert.deepEqual(await restart(), [BREAK]);
    assert.equal(await run(), "stopped");
    // Leave no breakpoint for the next test.
    await toggle();
    assert.deepEqual(await glyphs(), []);
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
});
