// Keys in the code and in the Quick Find widget, tested against two entries in BUGS-TO-REPORT.md:
//
//   "Alt+A and Alt+R run the Find / Replace panel's Replace All and Replace from the code and from
//   Quick Find, with the panel closed" (bugs/find-panel-keys-outside-panel)
//   "Enter in Quick Find's replace box adds a line break to the replacement"
//   (bugs/quick-find-enter-in-replace-box)
//
// The IDE takes every key on the page before the editor sees it (globalKeyDown in main.js) and runs
// every command bound to it whose context holds. tbFindReplace_ReplaceNext (Alt+R) and
// tbFindReplace_ReplaceAll (Alt+A) have the context "focusedFindReplace || focusedEditor", and
// focusedEditor holds whenever the focus is anywhere in the code editor's panel, Quick Find
// included. So both run the panel's own search, with the text the panel holds, even when the
// panel is closed; and Alt+A, which is also Select All Matches, then selects nothing.
//
// The project in probes/quick-find-keys holds Fruit.twin, with apple and banana four times each.
// The first test is a control: with the panel never used, Alt+A in the code selects every apple.
// Then the panel is used once, as a person searches: Ctrl+F with the caret on banana, which puts
// banana in Find What and empties Replace With, and Esc, which closes the floating panel. Every
// test after that starts from the file's own text.
//
// THE IDE IS STARTED WITH --no-save-ide-settings and --no-update-recent-files (IDE_FLAGS in
// scripts/lib/tb-ide.mjs), and the calls those flags do not guard are blocked as soon as the
// project is open, as code-find.test.mjs does. Nothing here reaches SaveSetting, so lanes.mjs names
// no settings for this lane.
//
// Each test states what BETA 1042 does; the test named "control" passes whether or not the defects
// are fixed. If another fails after an IDE update, the IDE has changed: update the entry in
// BUGS-TO-REPORT.md, or its report in bugs/filed/, the callouts in docs/IDE/Code/Finding.md that
// carry it, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import {
  answerMessageBox,
  clickAt,
  editorText,
  messageBoxes,
  openFile,
  pressKey,
  setCursor,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "quick-find-keys");
const FILE = "/QuickFindKeysProbe/Sources/Fruit.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Fruit.twin"), "utf8").replace(/\r\n/g, "\n");
const LINES = SOURCE.split("\n");
const place = (word, line) => {
  const n = LINES.findIndex((l) => l.includes(line)) + 1;
  assert.ok(n > 0, `Fruit.twin has no line holding ${JSON.stringify(line)}`);
  return { line: n, column: LINES[n - 1].indexOf(word) + 2 };
};
const APPLE = place("apple", "Dim apple As Long"); // the caret inside apple
const BANANA = place("banana", "Dim banana As Long"); // the caret inside banana
const count = (text, word) => text.match(new RegExp(word, "g"))?.length ?? 0;
const APPLES = count(SOURCE, "apple");
const BANANAS = count(SOURCE, "banana");

// Blocks every call the flags do not guard that writes the user's registry (see the top of this file).
const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
})()`;

const F = "findReplacePanel._this";
const QUICK = `editor.getContribution("editor.contrib.findController")`;
const WIDGET = `editor.getDomNode().querySelector(".find-widget")`;

// The Find / Replace panel, Quick Find and the editor's selections.
const STATE_JS = `(() => {
  const s = ${QUICK}.getState();
  const w = ${WIDGET};
  const a = document.activeElement;
  const p = typeof findReplacePanel === "object" ? ${F} : undefined;
  return {
    panelShown: !!p && p.sectionHeader.getBoundingClientRect().height > 0,
    panelFind: p ? p.findWhatInput.value : null,
    panelReplace: p ? p.replaceWithInput.value : null,
    quickOpen: !!w && w.classList.contains("visible"),
    quickFocus: !w || !w.contains(a) ? "elsewhere" : a.closest(".replace-part") ? "replace" : a.closest(".find-part") ? "find" : "widget",
    search: s.searchString,
    replace: s.replaceString,
    selections: editor.getSelections().map((r) => editor.getModel().getValueInRange(r)),
  };
})()`;

const centreOf = (expr) => `(() => {
  const e = ${expr};
  if (!e) return null;
  const q = e.getBoundingClientRect();
  return q.width && q.height ? { x: q.x + q.width / 2, y: q.y + q.height / 2 } : null;
})()`;

scenario("keys of the Find / Replace panel outside it, and Enter in Quick Find's replace box", (lane) => {
  let c;
  const state = () => c.evaluate(STATE_JS);
  const text = async () => (await editorText(c)).replace(/\r\n/g, "\n");

  async function until(check, what) {
    if (await waitFor(c, async () => check(await state()), { timeout: 5000, interval: 100 })) return;
    assert.fail(`${what}: ${JSON.stringify(await state())}`);
  }

  // The message boxes now shown, each answered: their text, white space folded.
  async function takeBoxes() {
    const boxes = await messageBoxes(c);
    for (const b of boxes) {
      await answerMessageBox(c, b.buttons.includes("No") ? "No" : b.buttons[0]);
      await sleep(300);
    }
    return boxes.map((b) => b.text.replace(/\s+/g, " ").trim());
  }

  // Fruit.twin in the editor with its own text, Quick Find closed, and the caret at `at`.
  async function startAt(at) {
    await openFile(c, FILE);
    if ((await state()).quickOpen) {
      await c.evaluate(`${QUICK}.closeFindWidget()`);
      await until((s) => !s.quickOpen, "Quick Find did not close");
    }
    if ((await text()) !== SOURCE) {
      await c.evaluate(`editor.getModel().setValue(${JSON.stringify(SOURCE)})`);
      await sleep(400);
    }
    await setCursor(c, at.line, at.column);
  }

  // Empties the box that has the focus with End and Backspace: Ctrl+A does not select its text.
  async function emptyBox(field) {
    const n = (await state())[field].length;
    await pressKey(c, "End");
    for (let i = 0; i < n; i++) await pressKey(c, "Backspace");
    await until((s) => s[field] === "", `the ${field} box of Quick Find was not emptied`);
  }

  // Quick Replace (Alt+H) from line 1, column 1, with apple to find and pear to replace it with,
  // and the focus in `where`, "find" or "replace".
  async function quickReplace(where) {
    await startAt({ line: 1, column: 1 });
    await pressKey(c, "h", { alt: true });
    await until(
      (s) => s.quickOpen && s.quickFocus !== "elsewhere",
      "Alt+H did not show Quick Find with the focus in it",
    );
    // Alt+H puts the focus in the replace box when the box to find already holds text
    if ((await state()).quickFocus === "replace") await pressKey(c, "Tab", { shift: true });
    await until((s) => s.quickFocus === "find", "the focus is not in the box to find");
    await emptyBox("search");
    await typeText(c, "apple");
    await pressKey(c, "Tab");
    await until((s) => s.quickFocus === "replace", "Tab did not move the focus to the replace box");
    await emptyBox("replace");
    await typeText(c, "pear");
    await until((s) => s.search === "apple" && s.replace === "pear", "Quick Find does not hold apple and pear");
    if (where === "find") {
      await pressKey(c, "Tab", { shift: true });
      await until((s) => s.quickFocus === "find", "Shift+Tab did not move the focus back to the box to find");
    }
    c.dialogs.splice(0);
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await c.evaluate(GUARD_JS);
    await openFile(c, FILE);
  });

  test("control: with the Find / Replace panel never used, Alt+A in the code selects every match of the word at the caret", async (t) => {
    await startAt(APPLE);
    await pressKey(c, "a", { alt: true });
    await sleep(800);
    const s = await state();
    const boxes = await takeBoxes();
    t.diagnostic(`${JSON.stringify(s.selections)} ${JSON.stringify(boxes)}`);
    assert.deepEqual(boxes, []);
    assert.equal(await text(), SOURCE, "Alt+A changed the code");
    assert.deepEqual(s.selections, Array(APPLES).fill("apple"));
  });

  test("Ctrl+F on banana and Esc leave the panel closed with banana in Find What and Replace With empty", async (t) => {
    await startAt(BANANA);
    await pressKey(c, "f", { ctrl: true });
    await until((s) => s.panelShown && s.panelFind === "banana", "Ctrl+F did not show the panel with banana");
    await sleep(400);
    await pressKey(c, "Escape");
    await until((s) => !s.panelShown, "Esc did not close the panel");
    const s = await state();
    t.diagnostic(JSON.stringify(s));
    assert.equal(s.panelFind, "banana");
    assert.equal(s.panelReplace, "");
  });

  test("with the panel closed, Alt+A in the code deletes every banana, the panel's Replace All, and selects no apple", async (t) => {
    await startAt(APPLE);
    await pressKey(c, "a", { alt: true });
    await sleep(800);
    const s = await state();
    const boxes = await takeBoxes();
    t.diagnostic(`${JSON.stringify(s.selections)} ${JSON.stringify(boxes)}`);
    assert.deepEqual(boxes, [`The specified region has been searched. ${BANANAS} replacements were made.`]);
    // the IDE tidies the lines it changed (Dim  As Long becomes Dim As Long), so words are counted
    const after = await text();
    assert.equal(count(after, "banana"), 0, "a banana is left");
    assert.equal(count(after, "apple"), APPLES, "an apple went");
    assert.equal(s.selections.length, 1, "Alt+A gave more than one cursor");
  });

  test("control: with the panel closed, Ctrl+Shift+L in the code selects every apple and replaces nothing", async (t) => {
    await startAt(APPLE);
    await pressKey(c, "L", { ctrl: true });
    await sleep(800);
    const s = await state();
    const boxes = await takeBoxes();
    t.diagnostic(`${JSON.stringify(s.selections)} ${JSON.stringify(boxes)}`);
    assert.deepEqual(boxes, []);
    assert.equal(await text(), SOURCE, "Ctrl+Shift+L changed the code");
    assert.deepEqual(s.selections, Array(APPLES).fill("apple"));
  });

  test("with the panel closed, Alt+R in the code selects the next banana, and a second Alt+R deletes it", async (t) => {
    await startAt(APPLE);
    await pressKey(c, "r", { alt: true });
    await sleep(700);
    const first = await state();
    await pressKey(c, "r", { alt: true });
    await sleep(700);
    const after = await text();
    t.diagnostic(`${JSON.stringify(first.selections)}; ${count(after, "banana")} banana left`);
    assert.deepEqual(first.selections, ["banana"]);
    assert.deepEqual(await takeBoxes(), []);
    assert.equal(count(after, "banana"), BANANAS - 1, "the second Alt+R did not delete one banana");
    assert.equal(count(after, "apple"), APPLES);
  });

  test("in Quick Find with apple and pear, Alt+R twice deletes a banana and replaces no apple", async (t) => {
    await quickReplace("find");
    await pressKey(c, "r", { alt: true });
    await sleep(700);
    const first = await state();
    await pressKey(c, "r", { alt: true });
    await sleep(700);
    const after = await text();
    t.diagnostic(`${JSON.stringify(first.selections)}; ${count(after, "banana")} banana left`);
    assert.deepEqual(first.selections, ["banana"]);
    assert.deepEqual(await takeBoxes(), []);
    assert.equal(count(after, "banana"), BANANAS - 1, "Alt+R did not delete one banana");
    assert.equal(count(after, "apple"), APPLES, "Alt+R replaced an apple");
    assert.equal(count(after, "pear"), 0);
  });

  test("in Quick Find with apple and pear, Alt+A deletes every banana and replaces no apple", async (t) => {
    await quickReplace("find");
    await pressKey(c, "a", { alt: true });
    await sleep(800);
    const boxes = await takeBoxes();
    t.diagnostic(JSON.stringify(boxes));
    assert.deepEqual(boxes, [`The specified region has been searched. ${BANANAS} replacements were made.`]);
    const after = await text();
    assert.equal(count(after, "banana"), 0, "a banana is left");
    assert.equal(count(after, "apple"), APPLES, "an apple was replaced");
    assert.equal(count(after, "pear"), 0);
  });

  test("Enter in Quick Find's replace box adds a line break to the replacement, which Replace All writes into the code", async (t) => {
    await quickReplace("replace");
    const height = `${WIDGET}.querySelector(".replace-part .input").getBoundingClientRect().height`;
    const before = await c.evaluate(height);
    await pressKey(c, "Enter");
    await until((s) => s.replace === "pear\n", "Enter did not add a line break to the replacement");
    const grown = await c.evaluate(height);
    t.diagnostic(`the replace box ${before} px high, then ${grown} px`);
    assert.ok(grown > before, "the replace box did not grow to a second line");
    assert.equal(await text(), SOURCE, "Enter replaced");
    const at = await c.evaluate(centreOf(`${WIDGET}.querySelector(".codicon-find-replace-all")`));
    assert.ok(at, "the Replace All button of Quick Find is not on screen");
    await clickAt(c, at.x, at.y);
    await sleep(700);
    const after = await text();
    t.diagnostic(JSON.stringify(after.split("\n").slice(APPLE.line - 1, APPLE.line + 1)));
    assert.equal(count(after, "apple"), 0, "an apple is left");
    assert.equal(count(after, "pear\n"), APPLES, "not every apple became pear and a line break");
    assert.equal(after.split("\n").length, LINES.length + APPLES, "the code did not gain a line for each apple");
    await pressKey(c, "Escape");
  });
});
