// Typing just after a file opens at a line. For 700 ms after the code editor
// opens a file at a line and column (Find in Files, Go To Definition, an
// add-in's Editors.Open), the IDE puts the cursor back at that place whenever
// the compiler's decorations for the document arrive, and every edit brings new
// decorations, which start the 700 ms again (main.js, parseDocumentDecorations
// ends with if(performance.now()-revealedLineTime<700){revealLineInEditor(...)}).
// Typing that starts inside the window and goes on without a 0.7 s pause puts
// each character at the opened position: with Haystack.twin opened at 4:9, the
// cursor moved to 3:1 and "xyz" typed a key every 150 ms, "x" goes in at 3:1
// and "y" and "z" both at 4:9, as "zy". Filed as twinbasic/twinbasic#2447; the
// reproducer is bugs/filed/typing-after-open-reversed.
//
// This file opens the file through the page's openEditors.openFile, the call
// Find in Files makes, and places the cursor itself, because openFile and
// setCursor in scripts/lib/tb-operate.mjs wait out the 700 ms (afterReveal) and
// so hide the defect from every other lane.
//
// The first test states what BETA 997 does. If it fails after an IDE update and
// line 3 reads "xyz" in order, the defect is fixed: retire the entry, remove the
// wait from afterReveal and this file, as the comment in
// bugs/filed/typing-after-open-reversed/REPORT.md says. The control must hold
// on every build.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { before, test } from "node:test";
import { afterReveal, editorText, typeText } from "../../scripts/lib/tb-operate.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "typing-after-open");
const FILE = "twinbasic:/TypingAfterOpenProbe/Sources/Haystack.twin";
const OTHER = "twinbasic:/TypingAfterOpenProbe/Sources/Main.twin";

const KEY_DELAY = 150;

scenario("typing just after a file opens at a line", (lane) => {
  let c;
  let original;

  // Opens `file` at a line and column as Find in Files does, without waiting
  // for the IDE to stop revealing. Resolves once the IDE reports the file open,
  // and returns the performance.now() of the page at that moment.
  const open = (file, line, column) =>
    c.evaluate(
      `new Promise((resolve, reject) => {
        const node = fs.tree.resolvePath(${JSON.stringify(file)});
        if (!node) return reject(new Error("the project has no file ${file}"));
        setTimeout(() => reject(new Error("the IDE did not report ${file} open within 10 s")), 10000);
        openEditors.openFile(node, false, false, false, ${line}, ${column}, undefined,
                             () => resolve(performance.now()));
      })`,
      { awaitPromise: true },
    );

  // Puts the cursor at 3:1 of the code editor and gives it the focus, as a
  // person does by clicking there.
  const cursorTo = (line, column) =>
    c.evaluate(`(() => { editor.setPosition({ lineNumber: ${line}, column: ${column} }); editor.focus(); })()`);

  // Opens Haystack.twin at 4:9, waits until `after` milliseconds have passed
  // since the IDE reported it open, moves the cursor to 3:1 and types xyz a key
  // every 150 ms; returns the lines 3 and 4 as they read when the IDE has
  // stopped moving the cursor.
  async function typeAfterOpen(after) {
    // Start from another tab, so that the open is the one that makes
    // Haystack.twin the tab shown.
    await open(OTHER, 1, 1);
    assert.ok(await afterReveal(c), "the IDE was still revealing lines 10 s after Main.twin opened");
    const t0 = await open(FILE, 4, 9);
    const wait = after - ((await c.evaluate("performance.now()")) - t0);
    if (wait > 0) await sleep(wait);
    await cursorTo(3, 1);
    await typeText(c, "xyz", { delay: KEY_DELAY });
    assert.ok(await afterReveal(c), "the IDE was still revealing lines 10 s after the typing");
    await sleep(300);
    const lines = (await editorText(c)).split(/\r?\n/);
    // Put the file's own text back for the next test.
    await c.evaluate(`editor.getModel().setValue(${JSON.stringify(original)})`);
    assert.equal(await editorText(c), original, "the file's text was not put back");
    await sleep(300);
    return { line3: lines[2], line4: lines[3], head: lines.slice(0, 5) };
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await open(FILE, 1, 1);
    assert.ok(await afterReveal(c), "the IDE was still revealing lines 10 s after Haystack.twin opened");
    original = await editorText(c);
    assert.match(
      original.split(/\r?\n/)[3],
      /^ {8}Dim needleCount As Long$/,
      "line 4 of Haystack.twin is not as expected",
    );
  });

  test("typing begun 0.3 s after a file opens at a line is reordered by the re-reveal", async () => {
    const { line3, line4, head } = await typeAfterOpen(300);
    const shown = JSON.stringify(head);
    assert.ok(line3.startsWith("x") && !line3.startsWith("xy"), `line 3 reads ${JSON.stringify(line3)}: ${shown}`);
    assert.equal(line4, "        zyDim needleCount As Long", `lines 1 to 5 read ${shown}`);
  });

  test("the same typing begun 1 s after the file opens puts xyz at the start of the line in order", async () => {
    const { line3, line4, head } = await typeAfterOpen(1000);
    const shown = JSON.stringify(head);
    assert.ok(line3.startsWith("xyz    Public Function"), `line 3 reads ${JSON.stringify(line3)}: ${shown}`);
    assert.equal(line4, "        Dim needleCount As Long", `lines 1 to 5 read ${shown}`);
  });
});
