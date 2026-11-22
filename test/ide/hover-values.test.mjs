// What the debugger's hover shows for a value, BETA 1045: the hexadecimal it adds after
// an integral value ("improved: debug hover over an integral value also now shows the hex
// value alongside the decimal"), and a member of a With block ("fixed: many cases where
// hovering over a With block dot-accessor element would fail during debugging").
//
// It opens test/ide/probes/hover-values, stops at the @STOP line inside the With block,
// and hovers over each variable on the Debug.Print line after it, and over .Value and
// .Label on the @STOP line.
//
// BETA 1045 adds the hexadecimal for Byte, Integer, Long and LongLong values, and for a
// Variant holding one, as the unsigned value in the type's width, with & after it from
// &H8000 to &HFFFF and ^ from &H80000000 to &HFFFFFFFF: an Integer of -1 shows &HFFFF&,
// which as a literal is the Long 65535. A Boolean shows no hexadecimal.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the IDE has
// changed: update docs/IDE/Debugging/Inspecting.md (Hover), and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { openFile, pressKey, setCursor, waitFor, waitForEditAnswer } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "hover-values");
const FILE = "/HoverValuesProbe/Sources/Startup.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const STOP = SOURCE.findIndex((l) => /@STOP\b/.test(l)) + 1;
const PRINT = SOURCE.findIndex((l) => l.includes("Debug.Print b,")) + 1;
// The column of a whole word on a line, past `after`, counted from 1, plus one so the
// pointer is inside the word.
function columnOf(line, word, after = "Print") {
  const text = SOURCE[line - 1];
  const from = text.indexOf(after) + after.length;
  const m = new RegExp(`(?<![\\w.])${word.replace(".", "\\.")}\\b`).exec(text.slice(from));
  assert.ok(m, `no ${word} on line ${line}`);
  return from + m.index + 2;
}

const STATE_JS = `({ paused: !!context.atBreakpoint.value, running: !!context.codeExecuting.value, line: activeDebuggingLine })`;
const HOVER_JS = `(() => {
  const h = [...document.querySelectorAll(".monaco-hover")].find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 4);
  return h ? h.innerText.replace(/\\xa0/g, " ").replace(/\\n{2,}/g, "\\n").trim() : null;
})()`;
const GLYPHS_JS = `editor.getModel().getAllDecorations().filter((d) => /breakpointActiveGlyph/.test(d.options.glyphMarginClassName || "")).map((d) => d.range.startLineNumber)`;

scenario("debug hover values", (lane) => {
  let c;
  const state = () => c.evaluate(STATE_JS);

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

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: STOP, column: 1 });
    assert.ok(await waitForEditAnswer(c), "the compiler never answered");
    await setCursor(c, STOP, 9);
    await pressKey(c, "F9");
    assert.ok(await waitFor(c, async () => (await c.evaluate(GLYPHS_JS)).includes(STOP)), "no breakpoint");
    const mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    const paused = await waitFor(c, async () => (await state()).paused, { timeout: 60 * 1000, interval: 150 });
    assert.ok(
      paused,
      `the run did not stop: ${JSON.stringify({ state: await state(), glyphs: await c.evaluate(GLYPHS_JS), console: await linesSince(c, mark) })}`,
    );
    assert.equal((await state()).line, STOP);
    await sleep(1000);
    await openFile(c, FILE, { line: STOP, column: 1 });
  });

  const CASES = [
    ["b", "b:   255  (&HFF)"],
    ["i1", "i1:   1  (&H1)"],
    ["iNeg", "iNeg:   -1  (&HFFFF&)"],
    ["lBig", "lBig:   32768  (&H8000&)"],
    ["lNeg", "lNeg:   -1  (&HFFFFFFFF^)"],
    ["llNeg", "llNeg:   -1  (&HFFFFFFFFFFFFFFFF)"],
    ["f", "f:   True"],
    ["d", "d:   1.5"],
    ["v", "v:   300  (&H12C)"],
  ];
  for (const [name, want] of CASES) {
    test(`hovering over ${name} shows ${JSON.stringify(want)}`, async (t) => {
      const got = await hover(PRINT, columnOf(PRINT, name));
      t.diagnostic(JSON.stringify(got));
      assert.equal(got, want);
    });
  }

  test("inside With t, hovering over .Value evaluates t.Value, shown as .Value", async (t) => {
    const got = await hover(STOP, columnOf(STOP, ".Value"));
    t.diagnostic(JSON.stringify(got));
    assert.equal(got, ".Value:   6  (&H6)");
  });

  test("inside With t, hovering over .Label evaluates t.Label", async (t) => {
    const got = await hover(STOP, columnOf(STOP, ".Label"));
    t.diagnostic(JSON.stringify(got));
    assert.equal(got, '.Label:   "six"');
  });

  test("the run is stopped at the end", async () => {
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await state()).running, { timeout: 30 * 1000 }), "the run did not stop");
  });
});
