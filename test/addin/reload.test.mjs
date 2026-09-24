// P9 in WIP.HelpAddin.md, measured: whether a compiler restart loads an add-in
// again from its file, and so whether an add-in can be rebuilt and loaded
// again without ending the IDE. The ReloadProbe add-in (probes/reload) is built
// twice, once as it is (build A) and once with its BUILD constant changed to
// "B". Build A is loaded; while the IDE runs, its file is renamed aside, the
// compiler is restarted with no add-in in its place, then build B is put there
// under the same name and the compiler is restarted again. Each build puts a
// toolbar button, two tool windows and a Shift+F1 shortcut in the IDE, all
// named after the build, so what is left of build A can be told from build B.
// Each also records in a file whether its Class_Terminate runs: the page ends
// the compiler with taskkill /F (forceTerminate in main.js), so it cannot.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P8 and P9 in WIP.HelpAddin.md, what the tbIDE
// package page (docs/Reference/Built-In/tbIDE/index.md) says a compiler
// restart does, and ToolWindows.Add's id on the ToolWindows page, and then
// this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { copyFileSync, cpSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { removeTree } from "../../scripts/lib/tb-ide-copy.mjs";
import { compilerPid, consoleMark, loadedAddins, readConsole, sleep } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "reload");
const lane = addinLane();

// The probe's lines since a mark, as "<build> loaded in <pid>" and "<build> key".
const probeSince = async (c, mark) => ((await readConsole(c, { since: mark })) ?? "").split("\n")
  .map((l) => /^\[ReloadProbe\] build ([AB]) (loaded in \d+|key)$/.exec(l.trim())).filter(Boolean)
  .map(([, build, what]) => `${build} ${what}`);

// What the add-ins have put in the page: toolbar buttons, shortcuts and tool
// windows. A tool window has a body, where the add-in's elements go, and an
// "empty body" the page shows in its place when the add-in is gone.
const IDE_STATE_JS = `(() => ({
  buttons: [...document.querySelectorAll("#rootMenu2 [id^='addinButton-']")]
    .map((b) => ({ id: b.id, title: b.title })),
  shortcuts: Object.keys(addinKeys).sort(),
  windows: Object.entries(toolWindowsById).map(([id, w]) => ({
    id, title: w.titleElement.textContent,
    body: w.bodyElement.style.display, text: w.bodyElement.textContent,
    empty: w.emptyBodyElement.style.display, emptyText: w.emptyBodyElement.textContent,
  })).sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0)),
}))()`;
const ideState = (c) => c.evaluate(IDE_STATE_JS);

// Press Shift+F1 and return what fired, once the probe has had time to say.
// The pause first keeps the press from pairing with an earlier one (keys.test.mjs).
async function pressShiftF1(c) {
  await sleep(600);
  const mark = await consoleMark(c);
  await pressKey(c, "F1", { shift: true });
  await sleep(1500);
  return (await probeSince(c, mark)).filter((l) => l.endsWith(" key"));
}

describe("P9: loading an add-in again without ending the IDE", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, buildA, buildB, dest, openedIn, recordFile;
  // What the probe's Class_Terminate handlers wrote, a line each.
  const recorded = () => (existsSync(recordFile) ? readFileSync(recordFile, "utf8") : "")
    .split(/\r?\n/).filter(Boolean);
  before(async () => {
    recordFile = path.join(lane.work, "reload-record.txt");
    buildA = await lane.buildAddin(PROBE);
    const treeB = path.join(lane.work, "reload-b");
    cpSync(PROBE, treeB, { recursive: true });
    const source = path.join(treeB, "Sources", "MainModule.twin");
    const text = readFileSync(source, "utf8");
    const changed = text.replace('Public Const BUILD As String = "A"', 'Public Const BUILD As String = "B"');
    assert.notEqual(changed, text, "the probe no longer declares BUILD the way this scenario changes it");
    writeFileSync(source, changed, "utf8");
    buildB = await lane.buildAddin(treeB);
    dest = lane.placeAddin(buildA.dll);
    const t0 = Date.now();
    c = await lane.open(HOST, { env: { TB_RELOAD_FILE: recordFile } });
    openedIn = Date.now() - t0;
  });
  after(() => lane?.close());

  test("build A loads, and adds its button, its two windows and its shortcut", async (t) => {
    t.diagnostic(`a new IDE opened the project and its compile settled in ${openedIn} ms`);
    assert.deepEqual(await probeSince(c, null), [`A loaded in ${await compilerPid(c)}`]);
    const state = await ideState(c);
    assert.deepEqual(state.buttons, [{ id: "addinButton-ReloadProbe", title: "Reload probe A" }]);
    assert.deepEqual(state.shortcuts, ["{shift}f1"]);
    assert.deepEqual(state.windows.map((w) => [w.title, w.body, w.text, w.empty]), [
      ["Reload probe A", "block", "build A", "none"],
      ["Reload probe, no id, A", "block", "build A", "none"],
    ]);
    // A window given no id is filed under "", which every such window shares
    // (the last test of panes.test.mjs).
    assert.deepEqual(state.windows.map((w) => w.id), ["ReloadProbeWindow", ""]);
    assert.deepEqual(await pressShiftF1(c), ["A key"]);
    // The object it dropped as it loaded shows that a Class_Terminate that
    // runs reaches the file.
    assert.deepEqual(recorded(), ["build A control terminated"]);
  });

  test("P8: while it is loaded its file cannot be overwritten or deleted, but can be renamed", () => {
    const refused = (e) => ["EBUSY", "EIO", "EPERM"].includes(e.code);
    assert.throws(() => copyFileSync(buildB.dll, dest), refused);
    assert.throws(() => unlinkSync(dest), refused);
    renameSync(dest, `${dest}.old`);
  });

  test("a restart with the file gone loads nothing, and takes away the button and the shortcut but not the windows", async (t) => {
    const t0 = Date.now();
    await lane.restartCompiler();
    t.diagnostic(`the restart's compile settled in ${Date.now() - t0} ms`);
    assert.deepEqual(await loadedAddins(c), []);
    const state = await ideState(c);
    assert.deepEqual(state.buttons, []);
    assert.deepEqual(state.shortcuts, []);
    // Each window stays where it was, with build A's elements in its hidden
    // body and the page's own text in its place.
    assert.deepEqual(state.windows.map((w) => [w.title, w.body, w.text, w.empty, w.emptyText]), [
      ["Reload probe A", "none", "build A", "flex", "(currently unavailable)"],
      ["Reload probe, no id, A", "none", "build A", "flex", "(currently unavailable)"],
    ]);
    assert.deepEqual(await pressShiftF1(c), []);
    // The compiler that held the renamed file has ended, so it can go.
    removeTree(`${dest}.old`, { timeout: 2000 });
  });

  test("the restart killed build A's compiler, so its Class_Terminate never ran", () => {
    assert.deepEqual(recorded(), ["build A control terminated"]);
  });

  test("a restart with build B in its place loads build B, which fills both windows again in place", async (t) => {
    lane.placeAddin(buildB.dll);
    const mark = await consoleMark(c);
    const t0 = Date.now();
    const restart = lane.restartCompiler();
    restart.catch(() => { /* awaited below; a failure then fails the test */ });
    const loaded = await waitFor(c, async (c) => (await probeSince(c, mark)).length > 0,
                                 { timeout: 60 * 1000, interval: 100 });
    const ms = Date.now() - t0;
    await restart;
    t.diagnostic(`build B printed its first line ${ms} ms after the restart button was clicked`);
    assert.ok(loaded, "build B never loaded");
    assert.deepEqual(await probeSince(c, mark), [`B loaded in ${await compilerPid(c)}`]);
    assert.deepEqual(recorded(), ["build A control terminated", "build B control terminated"]);
    assert.deepEqual((await loadedAddins(c)).map((a) => a.name), ["ReloadProbe AddIn"]);
    const state = await ideState(c);
    assert.deepEqual(state.buttons, [{ id: "addinButton-ReloadProbe", title: "Reload probe B" }]);
    assert.deepEqual(state.shortcuts, ["{shift}f1"]);
    // ToolWindows.Add of an id the page has already empties that window and
    // returns it, and shows it again, so build B has the two windows build A
    // had, not two more.
    assert.deepEqual(state.windows.map((w) => [w.id, w.title, w.body, w.text, w.empty]), [
      ["ReloadProbeWindow", "Reload probe B", "block", "build B", "none"],
      ["", "Reload probe, no id, B", "block", "build B", "none"],
    ]);
    assert.deepEqual(await pressShiftF1(c), ["B key"]);
  });
});
