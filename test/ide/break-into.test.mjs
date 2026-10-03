// Break Into Code while the program is in DoEvents. The project in
// probes/break-into loops on DoEvents alone, so a break lands there every time,
// and stops inside the VB package's IdleMessageLoopBreakpoint, above Main. F5
// from there stops again at once, in Main, on the line after DoEvents, where a
// line in the DEBUG CONSOLE works. At the first stop, though, anything evaluated,
// a line in the DEBUG CONSOLE or a watch, ends the program with a native access
// violation, and the IDE stays in break mode: the yellow arrow stays on the
// package's line, and Stop and the step commands stay enabled.
//
// The lane fails at its close when the DEBUG CONSOLE holds a NATIVE EXCEPTION
// line (tb-lane.mjs), so a test that has asserted the crash clears the console,
// and then restarts the compiler, which is what puts the IDE right again.
//
// Each test states what BETA 995 does. If one fails after an IDE update, the IDE
// has changed: update the entry "After Break Into Code stops in DoEvents,
// evaluating anything ends the program with an access violation" in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { editorState, pressKey, restartCompiler, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "break-into");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
// The line after DoEvents, 1-based as the IDE counts it.
const LOOP = SOURCE.findIndex((l) => l.trim() === "Loop") + 1;
const STARTUP_FILE = "/BreakIntoProbe/Sources/Startup.twin";
const PACKAGE_FILE = "/BreakIntoProbe/Packages/VB/Sources/SUPPORT/IdleMessageLoopBreak.twin";
const CRASH = /NATIVE EXCEPTION: ACCESS_VIOLATION/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The debugger's state, the CALL STACK's procedures, the lines the editor marks
// as the one stopped on, and whether the toolbar's Stop and Break are enabled.
const STATE_JS = `(() => {
  const frames = liveStackTraceInfo[activeDebuggingThreadId];
  const enabled = (id) => !document.getElementById(id).classList.contains("disabledCommand");
  return {
    paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value, line: activeDebuggingLine,
    stack: Array.isArray(frames) ? frames.map((f) => f.name) : null,
    marked: editor.getModel().getAllDecorations()
      .filter((d) => (d.options.className || "").includes("activeDebugLineClass"))
      .map((d) => d.range.startLineNumber),
    stop: enabled("stopIcon"), pause: enabled("pauseIcon"),
  };
})()`;

scenario("Break Into Code in a DoEvents loop", (lane) => {
  let c;
  let mark;
  const state = () => c.evaluate(STATE_JS);
  const file = async () => (await editorState(c))?.file;
  const printed = () => linesSince(c, mark);

  // F5, a second of the loop, then Break Into Code, as Ctrl+Break gives it.
  async function breakIn() {
    mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(await waitFor(c, async () => (await state()).running), "the run did not start");
    await sleep(1000);
    await c.evaluate(`executeIdeCommand("tbDebug_BreakInto")`);
    assert.ok(await waitFor(c, async () => (await state()).paused), "the break did not stop the run");
    assert.ok(await waitFor(c, async () => (await file()) === PACKAGE_FILE), "the package's file did not open");
  }
  // A line typed into the DEBUG CONSOLE and entered, as a person does.
  async function enter(text) {
    await c.evaluate("debugConsoleEntry.focus()");
    await typeText(c, text);
    await pressKey(c, "Enter");
  }
  // The access violation, the end of the program, and break mode kept. The
  // console says it twice: as the run's result, and as the native exception's
  // report, which names the module and offset.
  async function crashed() {
    const crashLines = async () => (await printed()).filter((l) => CRASH.test(l)).length;
    assert.ok(await waitFor(c, async () => (await crashLines()) === 2), "no access violation");
    assert.ok(await waitFor(c, async () => !(await state()).running), "the program did not end");
    const s = await state();
    assert.equal(s.paused, true);
    assert.equal(await file(), PACKAGE_FILE);
    assert.deepEqual(s.marked, [s.line]);
    assert.equal(s.stop, true);
    assert.equal(s.pause, false);
    await c.evaluate(`executeIdeCommand("tbDebugConsole_Clear")`);
    await restartCompiler(c, { project: lane.project });
  }

  before(async () => {
    c = await lane.open(PROJECT);
  });

  test("the break stops in IdleMessageLoopBreakpoint; F5 stops again in Main, where the console works", async () => {
    await breakIn();
    assert.deepEqual((await state()).stack, ["IdleMessageLoopBreakpoint", "Main"]);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(
      await waitFor(c, async () => (await file()) === STARTUP_FILE && (await state()).line === LOOP),
      "F5 did not stop again in Main",
    );
    const s = await state();
    assert.equal(s.paused, true);
    assert.deepEqual(s.stack, ["Main"]);
    await enter("? 1");
    assert.ok(await waitFor(c, async () => (await printed()).includes("1")), "? 1 printed nothing");
    assert.ok(!(await printed()).some((l) => CRASH.test(l)));
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
  });

  test("? 1 in the DEBUG CONSOLE at the first stop ends the program with an access violation", async () => {
    await breakIn();
    await enter("? 1");
    await crashed();
  });

  test("so does a watch, which the IDE evaluates at the stop", async () => {
    await c.evaluate(`addNewWatchExpression("1 + 1")`);
    await breakIn();
    await crashed();
    await c.evaluate(`executeIdeCommand("tbWatches_Clear")`);
  });
});
