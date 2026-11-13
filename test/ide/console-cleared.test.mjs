// The DEBUG CONSOLE emptied a second time when the first project opens. Opening a project empties
// the console on purpose (clearDebugConsole). On BETA 1042 the console's list (createListView) also
// starts with its useCachedItemHeights unset, and setUseCachedItemHeights, which came with the
// Smoother Scrolling option, empties the list whenever the value it is given differs from the one it
// holds. The first resyncDebugPanelOptions, as the project's saved console options are applied,
// gives it false, which differs from unset: the list is emptied again, after the IDE's own clear,
// and whatever was written in between is lost -- an add-in's output as the project loads, among it.
// It happens once per IDE: after it the value is false, and a later project's open, or toggling
// Show Timestamps, empties nothing but what clearDebugConsole does.
//
// The IDE starts with no project. Every emptying of the console's list is recorded, with whether
// clearDebugConsole asked for it and what it erased, and clearDebugConsole writes a marker line just
// after it runs, standing in for output that comes after the IDE's own clear. The probe project is
// opened through File > Open Project (the page's openProject(), its file dialog answered with the
// path, as tb-session.mjs switches), and the record is read back.
//
// Each test states what BETA 1042 does. If one fails after an IDE update, the IDE has changed:
// update the entry "The DEBUG CONSOLE is emptied twice as the first project opens, so output written
// in between, an add-in's included, is lost" in BUGS-TO-REPORT.md, or its report in bugs/filed/, and
// then this file. bugs/console-cleared-at-open/fix.js is the fix, tested on a patched copy. Every
// other tool's IDE has the same fix made in its page (IDE_FIXES, scripts/lib/tb-defaults.mjs); this
// lane leaves it out (`unfixed`), and goes with it when the entry is retired.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readConsole } from "../../scripts/lib/tb-ide-console.mjs";
import { waitForCompile } from "../../scripts/lib/tb-ide.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { packTree } from "../../scripts/lib/tb-project.mjs";
import { IDE_DRIVER } from "../../scripts/lib/tb-session.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, "probes", "console-cleared");
const MARK = "CONSOLE PROBE: written just after the IDE's own clear";
const AFTER = "CONSOLE PROBE: written after the project opened";

const READY_JS = `typeof openProject === "function" && typeof debugOutputLine === "function" &&
  typeof clearDebugConsole === "function" && typeof debugConsoleContent !== "undefined" && !!debugConsoleContent`;
const FLAG_JS = `(() => { const v = debugConsoleContent.useCachedItemHeights;
  return v === undefined ? "unset" : String(v); })()`;
const LOADED_JS = "context.projectLoaded.value === true";

// Records every emptying of the console's list in window.__tbListClears: { meant, erased }, where
// meant says clearDebugConsole asked for it and erased is the text of each entry it took. After each
// clearDebugConsole, the marker line is written, as output that follows the IDE's own clear.
const WATCH_JS = `(() => {
  const list = debugConsoleContent;
  if (list.__tbWatched) return true;
  window.__tbListClears = [];
  let meant = false;
  const text = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };
  const clear = list.clear;
  list.clear = function () {
    window.__tbListClears.push({ meant, erased: list.dataNodes.map(text) });
    return clear.apply(this, arguments);
  };
  const ownClear = clearDebugConsole;
  clearDebugConsole = function () {
    meant = true;
    try { return ownClear.apply(this, arguments); }
    finally { meant = false; debugOutputLine(${JSON.stringify(MARK)}, "debugConsoleCompilerInfoText"); }
  };
  list.__tbWatched = true;
  return true;
})()`;
const CLEARS_JS = "window.__tbListClears";

scenario("the DEBUG CONSOLE when a project opens", (lane) => {
  let c;
  let second;
  let flagBefore;
  let flagAfter;
  let firstOpen;

  // Packs the probe into the lane's work folder as <name>.twinproj.
  function pack(name) {
    const dir = path.join(lane.work, "console-cleared");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${name}.twinproj`);
    packTree(file, PROBE);
    return file;
  }

  // Opens `project` through File > Open Project, waits for its compile to settle, and returns the
  // emptyings of the console's list that the open made.
  async function open(project) {
    const before = (await c.evaluate(CLEARS_JS)).length;
    const r = await IDE_DRIVER.switchTo(c, project);
    assert.equal(r.asked, 1, "File > Open Project did not ask for the project's path");
    await waitForCompile(c, { project });
    assert.ok(await waitFor(c, () => c.evaluate(LOADED_JS)), "the project never loaded");
    return (await c.evaluate(CLEARS_JS)).slice(before);
  }

  before(async () => {
    // Every other tool's IDE has this defect fixed in its page (IDE_FIXES, tb-defaults.mjs); this
    // lane states it, so its IDE is left as the build is.
    c = await lane.openNoProject({ unfixed: ["console-cleared-at-open"] });
    assert.deepEqual(await c.evaluate("window.__tbDefaults.fixes"), [], "the page fixed the defect it tests");
    assert.ok(await waitFor(c, () => c.evaluate(READY_JS)), "the page never became ready");
    await c.evaluate("cancelAllModalDialogs()");
    const first = pack("ConsoleClearedProbe");
    second = pack("ConsoleClearedProbe2");
    assert.ok(await c.evaluate(WATCH_JS), "the console could not be watched");
    flagBefore = await c.evaluate(FLAG_JS);
    firstOpen = await open(first);
    flagAfter = await c.evaluate(FLAG_JS);
  });

  test("the first project to open empties the console twice, and the second erases what followed the first", () => {
    assert.equal(flagBefore, "unset", "the console's list did not start with its cached-heights flag unset");
    assert.equal(flagAfter, "false", "opening the project did not set the flag");
    const meant = firstOpen.findIndex((x) => x.meant);
    assert.ok(meant >= 0, "the open did not run the IDE's own clear");
    const later = firstOpen.slice(meant + 1).filter((x) => !x.meant);
    assert.ok(later.length > 0, "nothing emptied the console after the IDE's own clear");
    // Each entry is recorded with its timestamp in front of its text.
    assert.ok(
      later.some((x) => x.erased.some((line) => line.endsWith(MARK))),
      `the emptying after the IDE's own clear did not erase the line written just after it: ${JSON.stringify(firstOpen)}`,
    );
  });

  test("control: a line written after the project opened stays when Show Timestamps is toggled twice", async () => {
    await c.evaluate(`debugOutputLine(${JSON.stringify(AFTER)}, "debugConsoleCompilerInfoText")`);
    await c.evaluate(`executeIdeCommand("tbDebugConsole_ToggleShowTimestamps")`);
    await c.evaluate(`executeIdeCommand("tbDebugConsole_ToggleShowTimestamps")`);
    assert.ok(((await readConsole(c)) ?? "").includes(AFTER), "toggling Show Timestamps erased the line");
  });

  test("control: a second project's open empties the console only by the IDE's own clear", async () => {
    const clears = await open(second);
    assert.ok(
      clears.some((x) => x.meant),
      "the second open did not run the IDE's own clear",
    );
    assert.deepEqual(
      clears.filter((x) => !x.meant).map((x) => x.erased),
      [],
      "the second open emptied the console by something else as well",
    );
    assert.ok(((await readConsole(c)) ?? "").includes(MARK), "the line written after the IDE's own clear is gone");
  });
});
