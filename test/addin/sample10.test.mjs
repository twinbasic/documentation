// Sample 10, the WaynesWorld add-in that ships with the IDE, operated end to
// end: its toolbar buttons, its tool window, a message box answered twice, a
// notification and a DEBUG CONSOLE line. One of the two scenarios that finish
// Stage 1 of WIP.HelpAddin.md.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { consoleMark, loadedAddins, readConsole } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { answerMessageBox, click, messageBoxes, notifications, toolWindow,
         waitFor } from "../../scripts/lib/tb-operate.mjs";

const HOST = path.join(path.dirname(fileURLToPath(import.meta.url)), "host");
const W = "WaynesWindowData";          // the id Sample 10 gives ToolWindows.Add
const lane = addinLane();

// The message box on top, with its text trimmed, or undefined.
async function topBox(c) {
  const b = (await messageBoxes(c)).at(-1);
  return b && { ...b, text: b.text.trim() };
}
const noBoxes = (c) => waitFor(c, async (c) => (await messageBoxes(c)).length === 0);

describe("Sample 10: WaynesWorld", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c;
  before(async () => {
    await lane.addSample("Sample 10");
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the compiler loads the add-in, which reports the project", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("WaynesWorld AddIn"), `loaded: ${JSON.stringify(names)}`);
    const lines = ((await readConsole(c)) ?? "").split("\n").filter((l) => l.startsWith("[WaynesWorldAddin]"));
    assert.equal(lines.length, 5, `its OnProjectLoaded lines: ${JSON.stringify(lines)}`);
    assert.ok(lines.includes("[WaynesWorldAddin] ProjectName: AddinHost"), JSON.stringify(lines));
  });

  test("its image button shows a message box", async () => {
    await click(c, "addinButton-TestImageButton");
    const box = await waitFor(c, topBox);
    assert.deepEqual(box, { title: "News alert...", text: "You clicked the image button!", buttons: ["OK"] });
    await answerMessageBox(c, "OK");
    assert.ok(await noBoxes(c), "the message box did not close");
  });

  test("its other button opens its tool window", async () => {
    await click(c, "addinButton-ShowToolWindow");
    const w = await waitFor(c, async (c) => { const t = await toolWindow(c, W); return t?.visible && t; });
    assert.ok(w, "the tool window did not appear");
    assert.match(w.text, /11\. ShowMessageBox/);
  });

  test("a three-button message box, answered with its second button", async () => {
    await click(c, { toolWindow: W, css: "#myButton11" });
    const first = await waitFor(c, topBox);
    assert.deepEqual(first, { title: "Choose an option", text: "Hello there from WaynesWorldAddIn!",
                              buttons: ["button1", "button2", "button3"] });
    await answerMessageBox(c, "button2");
    // The add-in's call returns the button's index, and it answers with a second box.
    const second = await waitFor(c, async (c) => { const b = await topBox(c); return b?.title === "option" && b; });
    assert.deepEqual(second, { title: "option", text: "you selected button2", buttons: ["ok"] });
    await answerMessageBox(c, "ok");
    assert.ok(await noBoxes(c), "a message box is still open");
  });

  test("a notification", async () => {
    await click(c, { toolWindow: W, css: "#myButton10" });
    const shown = await waitFor(c, async (c) => (await notifications(c)).find((t) => t.trim() === "Hello there from WaynesWorldAddIn!"));
    assert.ok(shown, `notifications: ${JSON.stringify(await notifications(c))}`);
  });

  test("a DEBUG CONSOLE line", async () => {
    const mark = await consoleMark(c);
    await click(c, { toolWindow: W, css: "#myButton7" });
    const text = await waitFor(c, async (c) => ((await readConsole(c, { since: mark })) ?? "").trim());
    assert.equal(text, "Hello there from WaynesWorldAddIn!");
  });
});
