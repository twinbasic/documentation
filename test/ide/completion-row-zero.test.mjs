// The completion list asks the compiler for the type of each row it draws, by the row's lazy
// index, and its test of that index is false for 0: the row with index 0 is never asked for, and
// shows no type. Which row that is depends on the compile, so the list here is short enough that
// every row is drawn.
//
// The test not named `control` asserts bugs/completion-row-zero-no-type. If it fails after an IDE
// update, the IDE has changed: remove the NOTE under The completion list in
// docs/IDE/Code/IntelliSense.md and the entry in BUGS-TO-REPORT.md, the row's request in
// scripts/shoot_docs.mjs (`askForRowZero`), and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { openFile, pressKey, setCursor, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "completion-lazy");
const FILE = "/CompletionLazyProbe/Sources/Startup.twin";
const LINE = 14;
const LIST = "debugConsoleEntryIntellisenseList";
const NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

// Each row: its name, its lazy index, whether it was asked for or answered, its type.
const ROWS_JS = `(${LIST}.dataNodesDATA || []).map((o) => ({ name: o.l, i: o.i, asked: !!o.requestedData, answered: !!o.gotData, type: o.type }))`;
// The text drawn on the row of this name.
const drawn = (name) => `[...document.querySelectorAll(".debugConsoleEntryIntellisenseBox .listitem")]
  .find((r) => r.innerText.trim().startsWith(${JSON.stringify(name)}))?.innerText.replace(/\\s+/g, " ").trim()`;

scenario("the completion list's row with lazy index 0", (lane) => {
  let c;
  let rows;
  const zero = () => rows.find((r) => r.i === 0);

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: LINE, column: 1 });
    await setCursor(c, LINE, 1);
    await typeText(c, "        Things");
    await sleep(1500);
    await pressKey(c, "Escape");
    await sleep(400);
    await typeText(c, ".");
    const done = await waitFor(
      c,
      async () => {
        rows = await c.evaluate(ROWS_JS);
        const others = rows.filter((r) => NAMES.includes(r.name) && r.i !== 0);
        return others.length === NAMES.length - 1 && others.every((r) => r.answered);
      },
      { timeout: 30 * 1000 },
    );
    assert.ok(done, `the rows were not answered: ${JSON.stringify(rows)}`);
    await sleep(1500);
    rows = await c.evaluate(ROWS_JS);
  });

  test("control: every other row of the list shows its type", async () => {
    for (const r of rows.filter((x) => NAMES.includes(x.name) && x.i !== 0)) {
      assert.equal(r.type, "Long", r.name);
      assert.match(await c.evaluate(drawn(r.name)), /variable ?Long$/);
    }
  });

  test("the row with lazy index 0 is never asked for, and shows no type", async () => {
    assert.ok(zero(), `no row has index 0: ${JSON.stringify(rows)}`);
    assert.equal(zero().asked, false);
    assert.equal(zero().answered, false);
    assert.match(await c.evaluate(drawn(zero().name)), /variable$/);
  });

  test("control: asked for that row, the compiler gives its type", async () => {
    const x = rows.indexOf(zero());
    const reply = await c.evaluate(
      `new Promise((done) => lspSocket.request("textDocument/lazyCompletion", { lazyRequestId: ${LIST}.lazyRequestId, requests: [{ x: ${x}, i: 0 }] }, (e) => done(e.results)))`,
      { awaitPromise: true },
    );
    assert.equal(reply.length, 1);
    assert.equal(reply[0].x, x);
    assert.equal(reply[0].type, "Long");
  });
});
