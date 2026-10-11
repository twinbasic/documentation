// Watches on a variable of a user-defined type. The project in probes/watches
// stops at a breakpoint on the line marked BREAK on each of its loop's two passes,
// with p, of a Private Type of the module, in scope. A watch on p shows it as
// VARIABLES does, a watch on p.X shows the field, and both are shown again at the
// next stop. ? p in the console fails with a codegen error and writes a linker
// error to the DEBUG CONSOLE. The watches are added with the page's
// addNewWatchExpression, which the WATCHES panel's own input calls.
//
// Each test states what BETA 1005 does. If one fails after an IDE update, the IDE
// has changed: for ? p, update the report "A watch on a variable of a user-defined
// type fails with a codegen error, and the Debug Console reports a linker error at
// every stop" in bugs/filed/udt-watch-codegen-error/ and its follow-up, "`? p` in
// the Debug Console, where `p` is a user-defined type, fails with a codegen error
// and a linker error" (bugs/console-print-udt-linker-error/), and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { openFile, pressKey, setCursor, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "watches");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const BREAK = SOURCE.findIndex((l) => l.includes("' BREAK")) + 1;
const FILE = "/WatchesProbe/Sources/Startup.twin";

const LINKER = "[LINKER] compilation (codegen) error detected in 'Startup.{temp_procedure}' at line #1";
const CODEGEN = "(compile error: codegen error; check for compilation errors)";
const STATE_JS = `({ paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value,
  line: activeDebuggingLine })`;
// Each watch's row as the WATCHES panel renders it: its value and its type.
const WATCHES_JS = `Object.fromEntries(Object.entries(watchPanel.tree.rootFolder.entries)
  .map(([name, e]) => [name, e.customRenderData ? [e.customRenderData.result, e.customRenderData.type] : null]))`;

scenario("watches on a user-defined type", (lane) => {
  let c;
  let mark;
  const state = () => c.evaluate(STATE_JS);
  const watches = () => c.evaluate(WATCHES_JS);
  const printed = () => linesSince(c, mark);
  const linkerErrors = async () => (await printed()).filter((l) => l.includes(LINKER)).length;

  // F5 to the breakpoint's first hit.
  async function toBreakpoint() {
    const was = await c.evaluate("activeDebuggingFrameId || 0");
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(
      await waitFor(c, async () => {
        const s = await state();
        return s.paused && s.line === BREAK && (await c.evaluate("activeDebuggingFrameId || 0")) !== was;
      }),
      "the run did not stop at the breakpoint",
    );
  }
  // A line typed into the DEBUG CONSOLE and entered, as a person does.
  async function enter(text) {
    await c.evaluate("debugConsoleEntry.focus()");
    await typeText(c, text);
    await pressKey(c, "Enter");
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: BREAK, column: 13 });
    await setCursor(c, BREAK, 13);
    await pressKey(c, "F9");
    mark = await consoleMark(c);
    await toBreakpoint();
  });

  test("a watch on p shows it as VARIABLES does", async () => {
    await c.evaluate(`addNewWatchExpression("p")`);
    assert.ok(await waitFor(c, async () => (await watches()).p), "the watch on p was not evaluated");
    assert.deepEqual((await watches()).p, ["{user defined type, 8 bytes}", "Point"]);
    assert.equal(await linkerErrors(), 0);
  });

  test("a watch on p.X works", async () => {
    await c.evaluate(`addNewWatchExpression("p.X")`);
    assert.ok(await waitFor(c, async () => (await watches())["p.X"]), "the watch on p.X was not evaluated");
    assert.deepEqual((await watches())["p.X"], ["7", "Long"]);
  });

  // The stack frame keeps its id from one pass of the loop to the next, so the
  // next stop is known by a watch on the loop's counter.
  test("the next stop shows the watches again", async () => {
    await c.evaluate(`addNewWatchExpression("i")`);
    assert.ok(await waitFor(c, async () => (await watches()).i?.[0] === "1"), "the watch on i is not 1");
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(
      await waitFor(c, async () => {
        const s = await state();
        return s.paused && s.line === BREAK && (await watches()).i?.[0] === "2";
      }),
      "the run did not stop at the breakpoint on the second pass",
    );
    assert.deepEqual((await watches()).p, ["{user defined type, 8 bytes}", "Point"]);
    assert.deepEqual((await watches())["p.X"], ["7", "Long"]);
    assert.equal(await linkerErrors(), 0);
  });

  test("? p in the DEBUG CONSOLE fails with a codegen error, and the console reports a linker error", async () => {
    await c.evaluate(`executeIdeCommand("tbWatches_Clear")`);
    const before = await linkerErrors();
    await enter("? p");
    assert.ok(await waitFor(c, async () => (await linkerErrors()) === before + 1), "no linker error for ? p");
    assert.ok(
      await waitFor(c, async () => (await printed()).some((l) => l.includes(CODEGEN))),
      "the console did not print the error",
    );
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
  });
});
