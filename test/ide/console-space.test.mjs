// A space typed in the DEBUG CONSOLE while its IntelliSense list is open. The
// project in probes/console-space stops at a breakpoint on the line marked BREAK,
// with total, items and obj, locals of Main, in scope. A space typed while the
// list is open accepts the list's first entry and is lost, unless the word typed
// is that entry in full and not a procedure. The console's list holds no
// keywords, so a keyword that starts a longer name is replaced by that name.
// Typed key by key, Print total becomes Printertotal, Call Touch(total) becomes
// CallByDispId(Touch(total)) and Set obj = items becomes SetAttr(obj = items),
// and the console refuses all three. total = 6, ? total and Debug.Print total
// type as they are, and Escape before the space keeps it: Print total typed that
// way prints 5. With no program running, Print 1 + 1 becomes Printer1 + 1.
//
// Each line is typed one key at a time, and after each key the lane waits for the
// console's answer to it, as a person typing at an ordinary speed sees the list:
// in the IDE's default IntelliSense mode, MODERN, the console asks for the list
// after every key. The IDE closes the console's list 100 ms after the code editor
// loses the focus, so the focus moves to the console before the first line, and
// each test checks that the console has it before and after.
//
// Each test states what BETA 995 does. If one fails after an IDE update, the IDE
// has changed: update the entry "A space typed in the Debug Console accepts the
// IntelliSense list's selection, so `Print x` becomes `Printerx`" in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { afterReveal, openFile, pressKey, setCursor, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "console-space");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const BREAK = SOURCE.findIndex((l) => l.includes("' BREAK")) + 1;
const FILE = "/ConsoleSpaceProbe/Sources/Startup.twin";

const STATE_JS = `({ paused: !!context.atBreakpoint.value, line: activeDebuggingLine })`;
const FOCUSED_JS = "document.activeElement === debugConsoleEntry";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

scenario("a space in the Debug Console", (lane) => {
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

  // Empties the console's input, types `keys` into it one key at a time, and
  // returns what it then holds. "Escape" stands for the Escape key; any other
  // string is typed character by character, and after each character that asks
  // for the list the lane waits for the console's answer to it. A key that asks
  // raises the request count as it is released, and the answer clears the
  // invalidated flag that the request set; a few keys, such as ? and +, never ask.
  async function type(...keys) {
    assert.ok(await c.evaluate(FOCUSED_JS), "the console's input does not have the focus");
    await pressKey(c, "Escape");
    await c.evaluate(`debugConsoleEntry.value = ""`);
    for (const k of keys) {
      if (k === "Escape") {
        await pressKey(c, "Escape");
        continue;
      }
      for (const ch of k) {
        const asked = await c.evaluate("debugConsoleIntellisenseRequestId");
        await typeText(c, ch);
        if (await c.evaluate(`debugConsoleIntellisenseRequestId > ${asked}`)) {
          assert.ok(
            await waitFor(c, () => c.evaluate("debugIntellisenseIsInvalidated === false"), { interval: 20 }),
            `the console had no answer for ${JSON.stringify(ch)} in ${JSON.stringify(keys.join(""))}`,
          );
        }
        await sleep(50);
      }
    }
    const { focused, value } = await c.evaluate(`({ focused: ${FOCUSED_JS}, value: debugConsoleEntry.value })`);
    assert.ok(focused, `the console's input lost the focus in ${JSON.stringify(keys.join(""))}`);
    return value;
  }

  // Enters what the console's input holds, and waits for a line the console
  // prints that satisfies `found`. False when none comes.
  async function enter(found) {
    const mark = await consoleMark(c);
    await pressKey(c, "Enter");
    return !!(await waitFor(c, async () => (await linesSince(c, mark)).some(found)));
  }
  const refused = (l) => l.startsWith("(compile error:");

  before(async () => {
    c = await lane.open(PROJECT);
    assert.equal(
      await c.evaluate(`liveIDEOptions["intellisenseMode"]`),
      "MODERN",
      "the IDE's IntelliSense mode is not its default, MODERN, in which the console asks after every key",
    );
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

  test("Print total becomes Printertotal, which the console refuses", async () => {
    assert.equal(await type("Print total"), "Printertotal");
    assert.ok(
      await enter((l) => l === "(compile error: Unrecognized symbol 'Printertotal')"),
      "the console did not refuse it",
    );
  });

  test("Escape before the space keeps it, and Print total prints 5", async () => {
    assert.equal(await type("Print", "Escape", " total"), "Print total");
    assert.ok(await enter((l) => l === "5"), "Print total did not print 5");
  });

  test("Call Touch(total) becomes CallByDispId(Touch(total)), which the console refuses", async () => {
    assert.equal(await type("Call Touch(total)"), "CallByDispId(Touch(total))");
    assert.ok(await enter(refused), "the console did not refuse it");
  });

  test("Set obj = items becomes SetAttr(obj = items), which the console refuses", async () => {
    assert.equal(await type("Set obj = items"), "SetAttr(obj = items)");
    assert.ok(await enter(refused), "the console did not refuse it");
  });

  test("a space after a whole variable name is kept: total = 6", async () => {
    assert.equal(await type("total = 6"), "total = 6");
  });

  test("? total and Debug.Print total type as they are", async () => {
    assert.equal(await type("? total"), "? total");
    assert.equal(await type("Debug.Print total"), "Debug.Print total");
  });

  test("with no program running, Print 1 + 1 becomes Printer1 + 1", async () => {
    await pressKey(c, "Escape");
    await c.evaluate(`executeIdeCommand("tbDebug_Stop")`);
    assert.ok(await waitFor(c, async () => !(await c.evaluate("context.codeExecuting.value"))), "the run did not stop");
    await focusConsole();
    assert.equal(await type("Print 1 + 1"), "Printer1 + 1");
  });
});
