// P1 and P2 in WIP.HelpAddin.md, measured rather than read off the IDE's
// code: which add-in keyboard shortcuts fire, and what F1 does in the code
// editor. The KeysProbe add-in (probes/keys) registers eight key strings and
// prints "[KeysProbe] fired <key string>" to the DEBUG CONSOLE when one fires.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P1 and P2 in WIP.HelpAddin.md, the NOTE on
// docs/Reference/Built-In/tbIDE/KeyboardShortcuts.md and the entry in
// BUGS-TO-REPORT.md, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, loadedAddins, readConsole, sleep } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { editorState, editorText, openFile, pressKey, setCursor, waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "keys");
const lane = addinLane();

// The DEBUG CONSOLE's lines since a mark, and the key strings the probe says
// fired in them, in order.
const linesSince = async (c, mark) =>
  ((await readConsole(c, { since: mark })) ?? "").split("\n").map((l) => l.trim());
const firedSince = async (c, mark) => (await linesSince(c, mark))
  .map((l) => /^\[KeysProbe\] fired (.+)$/.exec(l)).filter(Boolean).map((m) => m[1]);

// Wait for the probe to report `key`, and return everything it reported.
const waitFired = (c, mark, key) =>
  waitFor(c, async (c) => { const f = await firedSince(c, mark); return f.includes(key) && f; },
          { timeout: 5000 });

// Press keys with nothing focused, then q, whose shortcut always fires, and
// return what fired before q. Once q's line is back, every key pressed before
// it has been matched, so a key that fired nothing by then fires nothing.
//
// The pause first takes the press past the 500 ms in which the IDE pairs a
// key-up with the last recorded key-down of the same key, so that no press
// counts towards the one after it: that pairing is exactly what the last P1
// test measures.
async function pressThenQ(c, presses) {
  await sleep(600);
  const mark = await consoleMark(c);
  for (const [key, mods] of presses) await pressKey(c, key, mods);
  await pressKey(c, "q");
  assert.ok(await waitFired(c, mark, "q"), "q's shortcut did not fire: is the add-in still loaded?");
  // The callbacks run in the compiler's process, and nothing says in what order.
  await sleep(300);
  return (await firedSince(c, mark)).filter((k) => k !== "q");
}
const pressAlone = (c, key, mods) => pressThenQ(c, [[key, mods]]);

const blurAll = (c) => c.evaluate(`(() => {
  if (document.activeElement) document.activeElement.blur();
  return document.activeElement === document.body;
})()`);
const menuOpen = (c) => c.evaluate("typeof currentMenuDescriptor !== 'undefined' && !!currentMenuDescriptor");
// Monaco binds F1 to its command palette.
const paletteOpen = (c) => c.evaluate(`[...document.querySelectorAll(".quick-input-widget")]
  .some((e) => getComputedStyle(e).display !== "none")`);

describe("P1 and P2: add-in keyboard shortcuts", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c;
  before(async () => {
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the add-in loads and registers its shortcuts, lowercased", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("KeysProbe AddIn"), `loaded: ${JSON.stringify(names)}`);
    assert.ok(await waitFor(c, async (c) => ((await readConsole(c)) ?? "").includes("[KeysProbe] registered")),
              "the add-in never printed that it had registered its shortcuts");
    assert.deepEqual((await c.evaluate("Object.keys(addinKeys)")).sort(),
                     ["d", "f1", "q", "{alt}f", "{ctrl}d", "{ctrl}{shift}d", "{shift}d", "{shift}f1"]);
    assert.ok(await blurAll(c), "the focus stayed on an element");
  });

  test("P1: plain, Shift and function keys fire", async () => {
    assert.deepEqual(await pressAlone(c, "d"), ["d"]);
    assert.deepEqual(await pressAlone(c, "D"), ["{shift}d"]);
    assert.deepEqual(await pressAlone(c, "F1"), ["f1"]);
    assert.deepEqual(await pressAlone(c, "F1", { shift: true }), ["{shift}f1"]);
  });

  test("P1: Ctrl and Alt keys do not fire", async () => {
    assert.deepEqual(await pressAlone(c, "d", { ctrl: true, shift: true }), []);
    assert.deepEqual(await pressAlone(c, "d", { ctrl: true }), []);
    assert.deepEqual(await pressAlone(c, "f", { alt: true }), []);
    assert.equal(await menuOpen(c), false, "Alt+F opened a menu");
  });

  test("P1: a Ctrl or Alt key fires when the same key was pressed alone just before", async () => {
    assert.deepEqual(await pressThenQ(c, [["d"], ["d", { ctrl: true }], ["d", { ctrl: true, shift: true }],
                                          ["f"], ["f", { alt: true }]]),
                     ["d", "{ctrl}d", "{ctrl}{shift}d", "{alt}f"]);
  });

  test("P2: in the code editor F1 fires and types nothing, and a plain letter fires and types", async () => {
    await openFile(c, "/AddinHost/Sources/Main.twin", { line: 3, column: 9 });
    await setCursor(c, 3, 9);
    const ed = await editorState(c);
    assert.ok(ed?.focused, `the code editor does not have the focus: ${JSON.stringify(ed)}`);
    const text = await editorText(c);
    let mark = await consoleMark(c);
    await pressKey(c, "F1");
    assert.deepEqual(await waitFired(c, mark, "f1"), ["f1"]);
    assert.equal(await editorText(c), text, "F1 changed the file");
    assert.equal(await paletteOpen(c), false, "F1 opened Monaco's command palette");
    // So an add-in shortcut on a plain letter fires as the user types code.
    mark = await consoleMark(c);
    await pressKey(c, "d");
    assert.deepEqual(await waitFired(c, mark, "d"), ["d"]);
    assert.equal((await editorText(c)).split(/\r?\n/)[2], "        dDim needle As Long");
    await c.evaluate(`editor.getModel().setValue(${JSON.stringify(text)})`);
  });

  test("P2: F1 while signature help shows toggles it, the IDE reports a failure, and the add-in fires", async () => {
    // Inside FindTheNeedle's parentheses. Typing the call instead would work
    // as well, since setCursor waits out the time in which the IDE can put the
    // cursor back where openFile put it (afterReveal in tb-operate.mjs).
    await setCursor(c, 4, 32);
    await pressKey(c, " ", { ctrl: true });
    assert.ok(await waitFor(c, (c) => c.evaluate("context.activeSignatureHelp.value === true")),
              "Ctrl+Space inside FindTheNeedle( did not show signature help");
    const expanded = await c.evaluate("sigHelpIsExpanded");
    const mark = await consoleMark(c);
    await pressKey(c, "F1");
    const fired = await waitFired(c, mark, "f1");
    await sleep(300);
    const lines = (await linesSince(c, mark)).filter(Boolean);
    assert.deepEqual(fired, ["f1"]);
    assert.equal(await c.evaluate("sigHelpIsExpanded"), !expanded, "F1 did not toggle signature help");
    // toggleSigHelp() dereferences the event it is not given (BUGS-TO-REPORT.md).
    assert.ok(lines.includes('command failed: "tbHelp_ToggleExpandSignatureHelp"'),
              `the IDE no longer reports the toggle failing: ${JSON.stringify(lines)}`);
    await pressKey(c, "Escape");
  });
});
