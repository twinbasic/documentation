// A tall hover that reaches past the code editor's bottom edge. The IDE makes the
// code editor with fixedOverflowWidgets, so Monaco draws a hover outside the
// editor, and a long one, such as the hover over Collection on line 3 of
// probes/hover-past-editor, reaches past the editor's bottom edge. The IDE's dock
// lies over that part of the hover: the dock resizer along the editor's bottom
// edge (DIV.dockElementResizer, z-index 1000, 6 px tall) and, beneath it, the
// dock's drop target (DIV.dockGroupVerticalDockPointBottom). Both are
// transparent, so the hover shows, but they take the mouse. When the mouse slides
// down inside the hover and reaches them, the page gets a mouseout from the hover
// to the resizer; Monaco's ModesHoverController._onEditorMouseLeave sees a
// relatedTarget that is not inside the hover and hides it, although the mouse is
// still over the hover. A style that gives the hover a z-index above the dock's
// shows it stays: that is the control, with the hover well above the dock as the
// other.
//
// The mouse is moved with Input.dispatchMouseEvent in steps of 1 px, from 12 px
// above the editor's bottom edge to 12 px below it: a larger step jumps over the
// 6 px resizer and never shows the defect. The hover is shown after the IDE's
// delay, a second.
//
// The test that asserts the defect states what BETA 997 does. If it fails after
// an IDE update because the hover stays, the defect is fixed: update the entry "A
// tall hover in the code editor disappears when the mouse slides down it onto the
// dock's resizer" in BUGS-TO-REPORT.md, or its report in bugs/filed/, remove the
// workaround in add-in/Resources/SCRIPTS/hoverhelp.js, and then this file. The
// other tests must hold on every build.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { afterReveal, openFile, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { hoverText, mouseAway, restMouse } from "../addin/hover.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "hover-past-editor");
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Startup.twin"), "utf8").split(/\r?\n/);
const LINE = SOURCE.findIndex((l) => l.includes("' HOVER")) + 1;
const COLUMN = SOURCE[LINE - 1].indexOf("Collection") + 4;
const FILE = "/HoverPastEditorProbe/Sources/Startup.twin";
const SHOWS = "Collection";

// Where the hover is drawn, and the code editor's bottom edge.
const BOX_JS = `(() => {
  const h = [...document.querySelectorAll(".monaco-hover")]
    .find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0);
  if (!h) return null;
  const r = h.getBoundingClientRect(), e = editor.getDomNode().getBoundingClientRect();
  return { left: r.left, top: r.top, bottom: r.bottom, editor: e.bottom };
})()`;

// What the page has at a point.
const AT_JS = (x, y) => `(() => {
  const e = document.elementFromPoint(${x}, ${y});
  return e ? e.tagName + "." + e.className : null;
})()`;

scenario("a tall hover and the dock's resizer", (lane) => {
  let c;

  // Shows the hover over Collection and returns where it is drawn.
  async function showHover() {
    await restMouse(c, LINE, COLUMN);
    assert.ok(
      await waitFor(c, async (c) => (await hoverText(c))?.includes(SHOWS)),
      `no hover over ${SHOWS}: ${JSON.stringify(await hoverText(c))}`,
    );
    return c.evaluate(BOX_JS);
  }

  // Moves the mouse down x from y0 to y1 in steps of 1 px. Returns the first y
  // at which no hover shows, or null when it shows at every step.
  async function slide(x, y0, y1) {
    for (let y = y0; y <= y1; y++) {
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await sleep(20);
      if (!(await hoverText(c))?.includes(SHOWS)) return y;
    }
    return null;
  }

  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: LINE, column: COLUMN });
    await afterReveal(c);
  });

  test("the hover over Collection reaches past the code editor's bottom edge", async () => {
    const box = await showHover();
    assert.ok(box, "the hover went");
    assert.ok(
      box.bottom > box.editor + 12,
      `the hover does not reach 12 px past the editor's bottom edge: ${JSON.stringify(box)}`,
    );
    await mouseAway(c);
  });

  test("control: the mouse slides down the hover above the dock and it stays", async () => {
    const box = await showHover();
    const x = Math.round(box.left + 40);
    const from = Math.max(Math.round(box.top) + 20, Math.round(box.editor) - 80);
    const gone = await slide(x, from, Math.round(box.editor) - 20);
    assert.equal(gone, null, `the hover went at ${x},${gone}, the editor's bottom at ${box.editor}`);
    await mouseAway(c);
  });

  test("control: with the hover above the dock in z-order the mouse slides past the editor's bottom and it stays", async () => {
    await c.evaluate(`(() => {
      const s = document.createElement("style");
      s.id = "hoverPastEditorZ";
      s.textContent = ".monaco-editor .monaco-hover { z-index: 100000 !important; }";
      document.head.append(s);
    })()`);
    try {
      const box = await showHover();
      const x = Math.round(box.left + 40);
      const gone = await slide(x, Math.round(box.editor) - 12, Math.round(box.editor) + 12);
      assert.equal(gone, null, `the hover went at ${x},${gone}, the editor's bottom at ${box.editor}`);
    } finally {
      await c.evaluate(`document.getElementById("hoverPastEditorZ")?.remove()`);
      await mouseAway(c);
    }
  });

  test("the hover disappears when the mouse slides down it onto the dock's resizer, though the mouse is still over the hover", async (t) => {
    const box = await showHover();
    assert.ok(box.bottom > box.editor + 12, `the hover does not reach past the editor: ${JSON.stringify(box)}`);
    const x = Math.round(box.left + 40);
    const gone = await slide(x, Math.round(box.editor) - 12, Math.round(box.editor) + 12);
    assert.notEqual(gone, null, "the hover stayed at every step, so the defect is not there: see this file's header");
    const at = await c.evaluate(AT_JS(x, gone));
    t.diagnostic(`the hover went at ${x},${gone} over ${at}; its box ${JSON.stringify(box)}`);
    assert.ok(gone < box.bottom, `the hover went at ${gone}, below its bottom edge at ${box.bottom}`);
    assert.match(
      at ?? "",
      /dockElementResizer|dockGroupVerticalDockPoint/,
      `the hover went at ${x},${gone} where the page has ${at}, the editor's bottom at ${box.editor}`,
    );
    await mouseAway(c);
  });
});
