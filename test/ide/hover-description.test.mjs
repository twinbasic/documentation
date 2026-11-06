// The hover of a member that has a [Description]. The compiler's answer to textDocument/hover
// holds the text twice for what it calls a field, a member of a Type and a variable of a Class,
// and once for everything else, and the code editor's popup draws what it is given.
//
// The tests not named `control` assert bugs/description-field-hover-twice. If they fail after an
// IDE update, the compiler has changed: remove the entry in BUGS-TO-REPORT.md and the callout it
// names, and then this file and probes/hover-description.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { openFile, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "hover-description");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const FILE = "/HoverDescriptionProbe/Sources/Startup.twin";
const URI = `twinbasic:${FILE}`;

// The place of `word` on the line that holds `text`, 1-based.
function place(text, word) {
  const i = SOURCE.findIndex((s) => s.includes(text));
  assert.ok(i >= 0, `no line holds ${text}`);
  const column = SOURCE[i].indexOf(word, SOURCE[i].indexOf(text));
  return { line: i + 1, column: column + 1 + Math.floor(word.length / 2) };
}

const POPUP_JS = `(() => {
  const h = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 4);
  return h ? h.innerText.replace(/\\xa0/g, " ").replace(/\\s+/g, " ").trim() : null;
})()`;

scenario("the hover of a member with a [Description]", (lane) => {
  let c;

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: 1, column: 1 });
    const answered = await waitFor(c, async () => /Pair/.test((await answer("p.A = 1", "p")) ?? ""), {
      timeout: 30 * 1000,
    });
    assert.ok(answered, "the compiler gave no hover");
  });

  // What the compiler answers for the word.
  async function answer(text, word) {
    const { line, column } = place(text, word);
    const reply = await c.evaluate(
      `new Promise((done) => lspSocket.request("textDocument/hover", { textDocument: { uri: ${JSON.stringify(URI)} }, position: { line: ${line - 1}, character: ${column - 1} } }, done))`,
      { awaitPromise: true, timeout: 20000 },
    );
    return reply?.result?.contents?.value ?? null;
  }

  // Rests the pointer on the word, and returns the text of the popup.
  async function popup(text, word) {
    const { line, column } = place(text, word);
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
    const shown = await waitFor(c, () => c.evaluate(POPUP_JS), { timeout: 8000, interval: 100 });
    await sleep(300);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5, button: "none", buttons: 0 });
    await sleep(500);
    return shown;
  }

  test("control: a Const shows its description once", async () => {
    assert.match(await answer("x = Limit", "Limit"), /a constant$/);
    assert.doesNotMatch(await answer("x = Limit", "Limit"), /a constanta constant/);
  });

  test("control: a variable of a Module shows its description once", async () => {
    assert.match(await answer("Total = 3", "Total"), /a module variable$/);
    assert.doesNotMatch(await answer("Total = 3", "Total"), /a module variablea module variable/);
  });

  test("a Type field with [Description] on its line shows the text twice", async () => {
    assert.match(await answer("p.A = 1", "A"), /same linesame line$/);
    assert.match(await popup("p.A = 1", "A"), /same linesame line/);
  });

  test("a Type field with [Description] on the line above shows the text twice", async () => {
    assert.match(await answer("p.B = 2", "B"), /own lineown line$/);
  });

  test("a variable of a Class shows the text twice", async () => {
    assert.match(await answer("Count = 1", "Count"), /a class variablea class variable$/);
  });
});
