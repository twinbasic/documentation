// The debugger at a run-time error, measured: what F8, Ignore (Resume Next)
// and Stop do once the error panel is open, operated as a person does --- real
// key presses and clicks on the panel's buttons. The project in
// probes/debugger fails on every pass of a loop in FillTable, which Main
// calls, and prints a line before and after each step, so the DEBUG CONSOLE
// shows how far it got.
//
// Each test states what BETA 983 and 995 do. If one fails after an IDE update,
// the IDE has changed: update the Traps on docs/IDE/Menu/Debug.md and the two
// debugger entries in BUGS-TO-REPORT.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "debugger");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
// The failing line, 1-based as the IDE counts it.
const FAILS = SOURCE.findIndex((l) => l.includes("' FAILS")) + 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// What the debugger shows: whether it is paused and running, the line it is
// paused on, and the error panel's buttons, which are there only at an error.
const STATE_JS = `(() => ({
  paused: !!context.atBreakpoint.value,
  running: !!context.codeExecuting.value,
  line: activeDebuggingLine,
  panel: [...document.querySelectorAll(".errorWidgetButton")].map((b) => b.textContent.trim()),
}))()`;
const PANEL = ["Try Again (Resume)", "Ignore (Resume Next)", "Stop", "Search Online"];
const atError = { paused: true, running: true, line: FAILS, panel: PANEL };

scenario("the debugger at a run-time error", (lane) => {
  let c;
  let mark;
  const state = () => c.evaluate(STATE_JS);
  const printed = () => linesSince(c, mark);
  const button = (text) => click(c, { css: ".errorWidgetButton", text });

  // Start a run from the editor, as F5 does, and wait for the panel.
  async function runToError() {
    mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(await waitFor(c, async () => (await state()).panel.length, { timeout: 60 * 1000 }), "no error panel");
    assert.deepEqual(await state(), atError);
  }
  // Wait out a command: the IDE answers within a second; three is generous.
  const settle = () => sleep(3000);
  // End a run that is still going, so the next test starts from a stopped IDE.
  async function stopIfRunning() {
    if ((await state()).running) {
      await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
      assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    }
  }

  before(async () => {
    c = await lane.open(PROJECT);
  });

  test("F8 on the failing line runs it again: the error recurs and the mark stays", async () => {
    await runToError();
    await pressKey(c, "F8");
    await settle();
    assert.deepEqual(await state(), atError);
    assert.deepEqual(await printed(), ["Executing 'Main'...", "main start", "loop 0"]);
    await stopIfRunning();
  });

  test("after F8 there, Ignore stops on the next line instead of running on", async () => {
    await runToError();
    await pressKey(c, "F8");
    await settle();
    await button("Ignore (Resume Next)");
    await settle();
    assert.deepEqual(await state(), { paused: true, running: true, line: FAILS + 1, panel: [] });
    assert.ok(!(await printed()).includes("after fail 0"), "Ignore ran on past the next line");
    // One F5 then runs on, to the error on the loop's next pass: the step
    // that was left waiting is used up by one stop.
    await pressKey(c, "F5");
    await settle();
    assert.deepEqual(await state(), atError);
    assert.deepEqual((await printed()).slice(-2), ["after fail 0", "loop 1"]);
    await stopIfRunning();
  });

  test("Ignore with no step first runs on, to the next pass's error", async () => {
    await runToError();
    await button("Ignore (Resume Next)");
    await settle();
    assert.deepEqual(await state(), atError);
    assert.deepEqual((await printed()).slice(-2), ["after fail 0", "loop 1"]);
    await stopIfRunning();
  });

  test("the panel's Stop ends only the failing procedure: Main goes on", async () => {
    await runToError();
    await button("Stop");
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    const lines = await printed();
    assert.ok(lines.includes("main after call"), "Main no longer goes on after Stop");
    assert.ok(!lines.includes("fill end"));
  });

  // main.js binds the toolbar's stopIcon and the Run menu's End to this command.
  test("the Stop command, as the toolbar and Run > End give it, does the same", async () => {
    await runToError();
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    assert.ok((await printed()).includes("main after call"), "Main no longer goes on after Stop");
  });

  test("Stop at an ordinary break ends the whole run", async () => {
    await runToError();
    await pressKey(c, "F8");
    await settle();
    await button("Ignore (Resume Next)");
    await settle();
    assert.deepEqual((await state()).panel, [], "not at an ordinary break");
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    const lines = await printed();
    assert.ok(!lines.includes("main after call"), "Main went on after Stop at a break");
    assert.ok(lines.includes("aborted"), "no 'aborted' line");
  });
});
