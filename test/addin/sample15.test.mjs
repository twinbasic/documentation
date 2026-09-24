// Sample 15, the Global Search add-in that ships with the IDE, operated end to
// end: its toolbar button, a search typed into its tool window, a click on one
// match, and an option that it saves with SaveSetting. One of the two
// scenarios that finish Stage 1 of WIP.HelpAddin.md.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadedAddins } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { click, editorState, toolWindow, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { savedSettings } from "../../scripts/lib/tb-registry.mjs";

const HOST = path.join(path.dirname(fileURLToPath(import.meta.url)), "host");
const W = "GlobalSearchAddInData";     // the id Sample 15 gives ToolWindows.Add
const lane = addinLane();

// The search's results, read from the list view's data rather than its rows,
// since a list view draws only the rows that fit. One entry per file, sorted by
// path: its match count as the add-in words it, and each match's line of text
// with the [line,column] label the add-in puts beside it.
const results = (c) => c.evaluate(`(() => {
  const w = toolWindowsById[${JSON.stringify(W)}];
  const e = w && w.bodyElement.querySelector("#resultsList");
  const lv = e && e.listview;
  if (!lv) return null;
  const d = document.createElement("div");
  return lv.dataNodes.slice(0, lv.itemCount).map((html) => {
    d.innerHTML = html;
    return {
      path: d.querySelector(".colPath").textContent,
      count: d.querySelector(".colMatchCount").textContent,
      matches: [...d.querySelectorAll(".colMatchOuter")].map((m) =>
        [m.querySelector(".colMatch").textContent, m.querySelector(".lineInfo").textContent]),
    };
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
})()`);

const matchCount = (r) => r.reduce((n, f) => n + f.matches.length, 0);

// The option boxes, by id, checked or not.
const options = (c) => c.evaluate(`Object.fromEntries([...toolWindowsById[${JSON.stringify(W)}]
  .bodyElement.querySelectorAll("input[type=checkbox]")].map((e) => [e.id, e.checked]))`);

describe("Sample 15: Global Search", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c;
  before(async () => {
    await lane.addSample("Sample 15");
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the compiler loads the add-in", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.ok(names.includes("GlobalSearchAddIn AddIn"), `loaded: ${JSON.stringify(names)}`);
  });

  test("its toolbar button opens its tool window, with every option off", async () => {
    await click(c, "addinButton-GlobalSearchAddInButton");
    const w = await waitFor(c, async (c) => { const t = await toolWindow(c, W); return t?.visible && t; });
    assert.ok(w, "the tool window did not appear");
    assert.equal(w.title, "GLOBAL SEARCH");
    // Off, because the runner deleted the add-in's saved settings before the lane started.
    assert.deepEqual(await options(c), {
      searchBarInsidePackages: false, searchBarMatchCase: false,
      searchBarMatchWholeWordOnly: false, searchBarExcludeComments: false,
    });
  });

  test("a typed search lists every match in both files", async () => {
    await click(c, { toolWindow: W, css: "#searchBarInput" });
    await typeText(c, "needle");
    // The add-in searches a second after the last key-up, and adds one file's
    // entry at a time.
    const found = await waitFor(c, async (c) => { const r = await results(c); return r?.length === 2 && r; });
    assert.deepEqual(found, [
      { path: "twinbasic:/AddinHost/Sources/Haystack.twin", count: "5 matches", matches: [
        ["' A haystack with a needle in it.", "[2,25]"],
        ["Public Function FindTheNeedle(ByVal n As Long) As Long", "[3,28]"],
        ["Dim needleCount As Long", "[4,13]"],
        ["needleCount = n * 2", "[5,9]"],
        ["Return needleCount", "[6,16]"],
      ] },
      { path: "twinbasic:/AddinHost/Sources/Main.twin", count: "4 matches", matches: [
        ["Dim needle As Long", "[3,13]"],
        ["needle = FindTheNeedle(3)", "[4,9]"],
        ["needle = FindTheNeedle(3)", "[4,25]"],
        ["Debug.Print needle", "[5,21]"],
      ] },
    ]);
  });

  test("a click on a match opens its file at its line and column", async () => {
    // The line itself: its [line,col] label is outside the element that
    // carries the handler, and a click there opens the file's first match.
    await click(c, { toolWindow: W, css: ".colMatch", text: "Dim needleCount As Long" });
    const ed = await waitFor(c, async (c) => {
      const e = await editorState(c);
      return e?.file === "/AddinHost/Sources/Haystack.twin" && e;
    });
    assert.ok(ed, "Haystack.twin did not open in the code editor");
    assert.deepEqual([ed.line, ed.column, ed.lineText.trim()], [4, 13, "Dim needleCount As Long"]);
  });

  test("Match case narrows the search, and the add-in saves the option", async () => {
    await click(c, { toolWindow: W, css: "#searchBarMatchCase" });
    const found = await waitFor(c, async (c) => { const r = await results(c); return r?.length === 2 && matchCount(r) === 7 && r; });
    assert.ok(found, `the results did not narrow to 7 matches: ${JSON.stringify(await results(c))}`);
    assert.deepEqual(found.map((f) => f.count), ["4 matches", "3 matches"]);
    assert.ok(!found.some((f) => f.matches.some(([line]) => line.includes("FindTheNeedle(ByVal"))),
              "FindTheNeedle's declaration still matched");
    assert.deepEqual(savedSettings("GlobalSearchAddIn"), { Settings: {
      insidePackages: "FALSE", matchCase: "TRUE", matchWholeWord: "FALSE", excludeComments: "FALSE",
    } });
  });
});
