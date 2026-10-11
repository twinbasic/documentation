// The Find / Replace panel, tested against five entries in BUGS-TO-REPORT.md:
//
//   "Find with Whole Word Only never finds a match at the very start of the file"
//   (bugs/find-whole-word-file-start)
//   "Find with Regular Expressions finds nothing when the pattern holds a capital letter"
//   (bugs/find-regex-capital-letter)
//   "A regular-expression match that spans a line break is shown as an empty selection, and Find
//   Next does not move past it" (bugs/find-regex-line-break)
//   "The Find / Replace panel's *Invalid RegExp:* alert leaves out the reason"
//   (bugs/find-regex-alert-reason)
//   "After a search in Selected Text, the scope stays on a greyed Selected Text, and Find Next stops
//   at once" (bugs/find-scope-stuck-selected-text)
//
// The project in probes/code-find holds one file, Finder.twin, whose first word, Module, is at
// line 1, column 1. Each test starts the search from a place it sets, with the options it needs
// set by clicking their boxes, and records what each press of Find Next gives: the selection, an
// IDE message box (answered No when it has a No, else OK) or a javascript alert.
//
// THE IDE SAVES ITS OPTIONS IN THE USER'S OWN REGISTRY (HKCU\Software\VB and VBA Program
// Settings\twinBASIC_IDE\IDESettings), the Find What history and the panel's place among them. So,
// as soon as the project is open, the page's hostAppObject is replaced by a proxy whose
// SaveIDESetting, ChangeWindowSetting and recent-list calls do nothing, as customising.test.mjs
// does. Nothing here reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order. Each test states what BETA 1005 does; the tests named
// "control" pass whether or not the defects are fixed. If another fails after an IDE update, the
// IDE has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the
// callout on the page of docs/IDE/Code/ that carries it, and then this file.
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
  editorState,
  messageBoxes,
  openFile,
  pressKey,
  select,
  setCursor,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "code-find");
const FILE = "/CodeFindProbe/Sources/Finder.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Finder.twin"), "utf8").split(/\r?\n/);
const lineOf = (text) => {
  const n = SOURCE.findIndex((l) => l.includes(text)) + 1;
  assert.ok(n > 0, `Finder.twin has no line holding ${JSON.stringify(text)}`);
  return n;
};
const END_MODULE = lineOf("End Module");
const FIRST_END_SUB = lineOf("End Sub");
const MAIN_DIM = lineOf("Dim total As Long");
const MAIN_PRINT = lineOf('Debug.Print "total is "');
const SECOND_PRINT = lineOf('Debug.Print "second"');

const SEARCHED = "The specified region has been searched.";
const END_OF_SCOPE = "End of search scope has been reached; do you want to continue from the beginning?";
const isBox = (x, text) => typeof x === "string" && x.startsWith("BOX ") && x.includes(text);

// Blocks every call that writes the user's registry (see the top of this file).
const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  const blocked = new Set(["SaveIDESetting", "ChangeWindowSetting", "AddRecentsList", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
})()`;

const F = "findReplacePanel._this";
const ROOT = `${F}.sectionHeader.parentNode`;
const BOXES = {
  whole: "findWholeWordGroupInput",
  mcase: "findMatchCaseGroupInput",
  pattern: "findUsePatternMatchingInput",
  regex: "findUseRegExpInput",
  file: "findScopeFileButton",
  selected: "findScopeSelectedTextButton",
};

// Each option and scope as "x" (ticked) or "-", with "(off)" when it is greyed.
const PANEL_JS = `(() => {
  const t = ${F};
  const st = (e) => (e.checked ? "x" : "-") + (e.disabled ? "(off)" : "");
  return { find: t.findWhatInput.value, ${Object.entries(BOXES)
    .map(([k, v]) => `${k}: st(t.${v})`)
    .join(", ")} };
})()`;

// The centre of an element of the page, or null when it has no size.
const centreOf = (expr) => `(() => {
  const e = ${expr};
  if (!e) return null;
  const q = e.getBoundingClientRect();
  return q.width && q.height ? { x: q.x + q.width / 2, y: q.y + q.height / 2 } : null;
})()`;

// A button of the panel by its caption.
const button = (caption) =>
  `[...${ROOT}.querySelectorAll("input[type=button], button, div, span")].find((b) => ((b.value || "") === ${JSON.stringify(caption)} || (b.children.length === 0 && b.textContent.trim() === ${JSON.stringify(caption)})) && b.getBoundingClientRect().width)`;

scenario("the Find / Replace panel", (lane) => {
  let c;

  const panel = () => c.evaluate(PANEL_JS);

  async function clickElement(expr, what) {
    const at = await c.evaluate(centreOf(expr));
    assert.ok(at, `${what} is not on screen`);
    await clickAt(c, at.x, at.y);
    await sleep(300);
  }

  // Ticks or clears an option of the panel, by clicking it, until it reads as wanted: ticking Match
  // Case clears Regular Expressions and the reverse, so each is set by what it reads now.
  async function setOption(key, want) {
    if ((await panel())[key].startsWith("x") !== want) await clickElement(`${F}.${BOXES[key]}`, `the box ${key}`);
    assert.equal((await panel())[key].startsWith("x"), want, `the box ${key} did not change`);
  }

  async function setOptions(want) {
    for (const k of ["whole", "mcase", "pattern", "regex"]) await setOption(k, !!want[k]);
  }

  // Types into Find What, replacing what it holds.
  async function setFind(text) {
    await clickElement(`${F}.findWhatInput`, "Find What");
    await pressKey(c, "a", { ctrl: true });
    await typeText(c, text);
    assert.equal((await panel()).find, text, "Find What does not hold what was typed");
  }

  // Presses Find Next `n` times. Each press gives "<line>:<col>-<line>:<col> <selected text>", "BOX
  // <text>" for a message box, which is then answered, or "ALERT <message>" for a javascript alert.
  async function findNext(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      await clickElement(button("Find Next"), "the Find Next button");
      await sleep(800);
      const alerts = c.dialogs.splice(0);
      for (const d of alerts) out.push(`ALERT ${d.message}`);
      const boxes = await messageBoxes(c);
      if (boxes.length) {
        const top = boxes[boxes.length - 1];
        out.push(`BOX ${top.text.replace(/\s+/g, " ").trim()}`);
        await answerMessageBox(c, top.buttons.includes("No") ? "No" : top.buttons[0]);
        await sleep(400);
        continue;
      }
      if (alerts.length) continue;
      const s = await editorState(c);
      out.push(
        `${s.selection.startLine}:${s.selection.startColumn}-${s.selection.endLine}:${s.selection.endColumn} ${s.selectedText}`,
      );
    }
    return out;
  }

  // A point in the code editor on `line`, right of its text, that no floating panel covers.
  async function pointOnLine(line) {
    const at = await c.evaluate(`(() => {
      editor.revealLineInCenter(${line});
      const p = editor.getScrolledVisiblePosition({ lineNumber: ${line}, column: 1 });
      const r = editor.getDomNode().getBoundingClientRect();
      const lines = editor.getDomNode().querySelector(".view-lines");
      if (!p) return null;
      const y = r.y + p.top + p.height / 2;
      for (let x = r.right - 40; x > r.x + 200; x -= 20) {
        const e = document.elementFromPoint(x, y);
        if (e && lines.contains(e)) return { x, y };
      }
      return null;
    })()`);
    assert.ok(at, `no point on line ${line} of the code editor is clear of the panel`);
    return at;
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await c.evaluate(GUARD_JS);
    await openFile(c, FILE, { line: MAIN_DIM, column: 13 });
    await setCursor(c, MAIN_DIM, 13);
    await pressKey(c, "f", { ctrl: true });
    assert.ok(
      await waitFor(c, () =>
        c.evaluate(`typeof findReplacePanel === "object" && !!${F} && !!(${centreOf(`${F}.findWhatInput`)})`),
      ),
      "Ctrl+F did not show the Find / Replace panel",
    );
    await sleep(500);
    const p = await panel();
    assert.equal(p.file, "x", `Ctrl+F did not tick Current File: ${JSON.stringify(p)}`);
  });

  test("control: without Whole Word Only, Find Next finds Module at line 1, column 1 after End Module", async (t) => {
    await setOptions({});
    await setFind("Module");
    await setCursor(c, 2, 1);
    const r = await findNext(2);
    t.diagnostic(JSON.stringify(r));
    assert.deepEqual(r, [`${END_MODULE}:5-${END_MODULE}:11 Module`, "1:1-1:7 Module"]);
  });

  test("with Whole Word Only, Find Next never finds Module at line 1, column 1", async (t) => {
    await setOptions({ whole: true });
    await setFind("Module");
    await setCursor(c, 2, 1);
    const r = await findNext(3);
    t.diagnostic(JSON.stringify(r));
    assert.equal(r[0], `${END_MODULE}:5-${END_MODULE}:11 Module`, "the first press did not find End Module");
    assert.ok(isBox(r[1], SEARCHED), "the second press did not end the search");
    assert.ok(!r.some((x) => x.startsWith("1:1-")), `a press found line 1, column 1: ${JSON.stringify(r)}`);
  });

  test("control: a regular expression in lower case, or with the i flag, finds End Sub", async (t) => {
    await setOptions({ regex: true });
    for (const re of ["/end sub/", "/End Sub/i"]) {
      await setFind(re);
      await setCursor(c, 1, 1);
      const r = await findNext(1);
      t.diagnostic(`${re}: ${JSON.stringify(r)}`);
      assert.deepEqual(r, [`${FIRST_END_SUB}:5-${FIRST_END_SUB}:12 End Sub`], `${re} did not find End Sub`);
    }
  });

  test("a regular expression with a capital letter, /End Sub/, finds nothing", async (t) => {
    await setOptions({ regex: true });
    const p = await panel();
    assert.equal(p.mcase, "-", "Match Case is ticked with Regular Expressions");
    await setFind("/End Sub/");
    await setCursor(c, 1, 1);
    const r = await findNext(1);
    t.diagnostic(JSON.stringify(r));
    assert.equal(r.length, 1);
    assert.ok(isBox(r[0], SEARCHED), `/End Sub/ found something: ${JSON.stringify(r)}`);
  });

  test("a match of /^\\s+end sub$/, which spans a line break, is an empty selection, and Find Next stays on it", async (t) => {
    await setOptions({ regex: true });
    await setFind("/^\\s+end sub$/");
    await setCursor(c, 1, 1);
    const r = await findNext(2);
    t.diagnostic(JSON.stringify(r));
    const before = FIRST_END_SUB - 1;
    const end = SOURCE[before - 1].length + 1;
    const empty = `${before}:${end}-${before}:${end} `;
    assert.deepEqual(r, [empty, empty]);
  });

  test("the alert for an invalid regular expression, /(/, reads only Invalid RegExp:", async (t) => {
    await setOptions({ regex: true });
    await setFind("/(/");
    await setCursor(c, 1, 1);
    const r = await findNext(1);
    t.diagnostic(JSON.stringify(r));
    assert.deepEqual(r, ["ALERT Invalid RegExp:"]);
  });

  test("after a search in Selected Text and a click in the code, Selected Text stays ticked but greyed, and Find Next stops at once", async (t) => {
    await setOptions({});
    await select(c, { startLine: MAIN_DIM, startColumn: 1, endLine: MAIN_PRINT, endColumn: 999 });
    await pressKey(c, "f", { ctrl: true });
    await sleep(500);
    await setFind("total");
    let p = await panel();
    t.diagnostic(`with the selection: ${JSON.stringify(p)}`);
    assert.equal(p.selected, "x", `a selection over three lines did not tick Selected Text: ${JSON.stringify(p)}`);
    const first = await findNext(1);
    t.diagnostic(`in the selection: ${JSON.stringify(first)}`);
    assert.match(
      first[0],
      new RegExp(`^${MAIN_DIM}:\\d+-${MAIN_DIM}:\\d+ total$`),
      "Find Next did not find total in the selection",
    );

    const at = await pointOnLine(SECOND_PRINT);
    await clickAt(c, at.x, at.y);
    await sleep(600);
    const s = await editorState(c);
    assert.equal(s.line, SECOND_PRINT, "the click did not put the caret on the line clicked");
    p = await panel();
    t.diagnostic(`after the click: ${JSON.stringify(p)}`);
    assert.equal(p.selected, "x(off)", `Selected Text is not ticked and greyed: ${JSON.stringify(p)}`);
    assert.equal(p.file, "-", `Current File is ticked: ${JSON.stringify(p)}`);
    const r = await findNext(1);
    t.diagnostic(`Find Next: ${JSON.stringify(r)}`);
    assert.equal(r.length, 1);
    assert.ok(isBox(r[0], END_OF_SCOPE), `Find Next did not stop at once: ${JSON.stringify(r)}`);
  });
});
