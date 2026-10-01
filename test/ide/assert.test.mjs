// The debugger at a failed assertion, measured: what Stop does when the error
// panel opens for an error the Assert package raised. The project in
// probes/assert has Main call a test whose one assertion fails, and prints a
// line before and after the assertion and after the call, as the runner in
// docs/Tutorials/Testing-with-Assert.md does.
//
// Each test states what BETA 983 and 995 do. If one fails after an IDE update, the
// IDE has changed: update the NOTE under "Running the tests" in
// Testing-with-Assert.md and the "Stop at a run-time error" entry in
// BUGS-TO-REPORT.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "assert");

// Whether the debugger is running, and the error panel's buttons, which are
// there only at an error.
const STATE_JS = `(() => ({
  running: !!context.codeExecuting.value,
  panel: [...document.querySelectorAll(".errorWidgetButton")].map((b) => b.textContent.trim()),
}))()`;
const BEFORE = ["Executing 'Main'...", "main start", "test start"];
const AFTER = ["test after assert", "All PadLeft tests passed."];

scenario("the debugger at a failed assertion", (lane) => {
  let c;
  let mark;
  const state = () => c.evaluate(STATE_JS);
  const printed = () => linesSince(c, mark);

  // Start a run from the editor, as F5 does, and wait for the panel.
  async function runToFailure() {
    mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(await waitFor(c, async () => (await state()).panel.length, { timeout: 60 * 1000 }), "no error panel");
    assert.deepEqual(await printed(), BEFORE);
  }
  async function stopped() {
    assert.ok(await waitFor(c, async () => !(await state()).running), "the run did not stop");
    // The program's lines, without the time taken and the debugger's own line.
    return (await printed()).slice(0, BEFORE.length + AFTER.length);
  }

  before(async () => {
    c = await lane.open(PROJECT);
  });

  test("the panel's Stop ends only the assertion: the test and the runner go on", async () => {
    await runToFailure();
    await click(c, { css: ".errorWidgetButton", text: "Stop" });
    assert.deepEqual(await stopped(), [...BEFORE, ...AFTER]);
  });

  // main.js binds the toolbar's stopIcon and the Run menu's End to this command.
  test("the Stop command, as the toolbar and Run > End give it, does the same", async () => {
    await runToFailure();
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.deepEqual(await stopped(), [...BEFORE, ...AFTER]);
  });
});
