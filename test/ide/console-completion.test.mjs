// Completions in the DEBUG CONSOLE. The project in probes/console-completion
// stops at a breakpoint on the line marked BREAK, with total and items, locals of
// Main, in scope. Ctrl+Space after tot opens the console's list with total in it
// when tot starts the line, after leading spaces, as a Sub call's argument (Touch
// tot) and after ? with no space (?tot); after ? and a space (? tot), the
// console's usual form, after Debug.Print, after Call (Call Tou) and on the right
// of an assignment (total = to), no list opens. A dot after ? and a space opens
// the list: ? items. offers the Collection's members. With no program running,
// Mai offers Main and ? Mai opens no list.
//
// Each line is put in the console's input with the caret at its end, and
// Ctrl+Space pressed, as a person presses it; the list is read once the answer
// for that Ctrl+Space has come. The IDE closes the console's list 100 ms after
// the code editor loses the focus, so the focus moves to the console before the
// first Ctrl+Space, and each test checks that the console has it before and
// after: a list closed by a change of focus never reads as no list.
//
// Each test states what BETA 995 does. If one fails after an IDE update, the IDE
// has changed: update the entry "The Debug Console offers no completion for a name
// typed after `?` and a space" in BUGS-TO-REPORT.md, or its report in bugs/filed/,
// and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { afterReveal, openFile, pressKey, setCursor, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "console-completion");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const BREAK = SOURCE.findIndex((l) => l.includes("' BREAK")) + 1;
const FILE = "/ConsoleCompletionProbe/Sources/Startup.twin";

const STATE_JS = `({ paused: !!context.atBreakpoint.value, line: activeDebuggingLine })`;
const FOCUSED_JS = "document.activeElement === debugConsoleEntry";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

scenario("completions in the Debug Console", (lane) => {
  let c;

  // Moves the focus to the console's input, waits for the code editor to let it
  // go, and then for the close of the list that the editor's loss of the focus
  // starts, 100 ms later.
  async function focusConsole() {
    await c.evaluate("debugConsoleEntry.focus()");
    assert.ok(
      await waitFor(c, () => c.evaluate("!context.focusedTextEditorInput.value")),
      "the code editor kept the focus",
    );
    await sleep(300);
  }

  // The names the console's list offers for `text`, or null when no list opens.
  async function complete(text) {
    assert.ok(await c.evaluate(FOCUSED_JS), "the console's input does not have the focus");
    await c.evaluate(`(() => {
      debugConsoleEntry.value = ${JSON.stringify(text)};
      debugConsoleEntry.selectionStart = debugConsoleEntry.selectionEnd = debugConsoleEntry.value.length;
    })()`);
    const asked = await c.evaluate("debugConsoleIntellisenseRequestId");
    await pressKey(c, " ", { ctrl: true });
    assert.ok(
      await waitFor(c, () =>
        c.evaluate(`debugConsoleIntellisenseRequestId > ${asked} && debugIntellisenseIsInvalidated === false`),
      ),
      `the console had no answer for ${JSON.stringify(text)}`,
    );
    const { focused, names } = await c.evaluate(`({ focused: ${FOCUSED_JS},
      names: context.activeDebugConsoleIntellisense.value
        ? debugConsoleEntryIntellisenseList.dataNodesDATA.map((x) => x.l) : null })`);
    assert.ok(focused, `the console's input lost the focus after ${JSON.stringify(text)}`);
    return names;
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: BREAK, column: 9 });
    await setCursor(c, BREAK, 9);
    await pressKey(c, "F9");
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    assert.ok(
      await waitFor(c, async () => {
        const s = await c.evaluate(STATE_JS);
        return s.paused && s.line === BREAK;
      }),
      "the run did not stop at the breakpoint",
    );
    await afterReveal(c);
    await focusConsole();
  });

  test("?tot, with no space, offers total", async () => {
    assert.ok((await complete("?tot"))?.includes("total"));
  });

  test("tot at the start of the line offers total", async () => {
    assert.ok((await complete("tot"))?.includes("total"));
  });

  test("tot after leading spaces offers total", async () => {
    assert.ok((await complete("   tot"))?.includes("total"));
  });

  test("the argument of a Sub call offers total", async () => {
    assert.ok((await complete("Touch tot"))?.includes("total"));
  });

  test("? tot, with a space, opens no list", async () => {
    assert.equal(await complete("? tot"), null);
  });

  test("Debug.Print tot opens no list", async () => {
    assert.equal(await complete("Debug.Print tot"), null);
  });

  test("Call Tou and total = to open no list", async () => {
    assert.equal(await complete("Call Tou"), null);
    assert.equal(await complete("total = to"), null);
  });

  test("? items. offers the members of the Collection", async () => {
    const names = await complete("? items.");
    assert.ok(names?.includes("Add") && names.includes("Count"));
  });

  test("with no program running, Mai offers Main and ? Mai opens no list", async () => {
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await c.evaluate("context.codeExecuting.value"))), "the run did not stop");
    await focusConsole();
    assert.ok((await complete("Mai"))?.includes("Main"));
    assert.equal(await complete("? Mai"), null);
  });
});
