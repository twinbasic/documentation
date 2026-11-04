// What Start does in a project with no Main, which is where the Samples page sends a reader
// (docs/IDE/Starting/Samples.md, Before you run a sample), and a defect in a sample's own code.
//
// Each test states what BETA 1034 does, and a test not named `control` asserts a defect:
//   "Start with no Main writes a compile error that gives no reason"
//     bugs/start-no-main-error-text
//   "a DLL whose Settings names no startup object shows (none) in Project Settings, and Start runs Main"
//     bugs/dll-startup-default-runs-main
//   "Sample 22's Uninstall button of service 1 registers the event log of service 2"
//     bugs/sample22-event-log-wrong-button
// If one fails after an IDE update, the IDE has changed: update the NOTEs under What Start runs
// in docs/IDE/Debugging/Running.md, the entry in BUGS-TO-REPORT.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep, waitForCompile } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince } from "../../scripts/lib/tb-ide-console.mjs";
import { click, openFile, pressKey, setCursor, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { unpackProject } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "startup-object");
const FILE = "/StartupObjectProbe/Sources/Startup.twin";
const CLEARED = "[DEBUGGER] global variables have been cleared";
const NO_OBJECT = "[DEBUGGER] No startup object set";
const STARTUP_SELECT = `document.querySelector('.tbps-optionRow[data-option-id="project.startupObject"] select')`;

scenario("what Start does with no Main", (lane) => {
  let c = null;

  // A copy of the probe with these settings: an undefined one is left out of the file.
  function variant(name, settings) {
    const dir = path.join(lane.work, "variants", name);
    cpSync(PROJECT, dir, { recursive: true });
    const file = path.join(dir, "Settings");
    const s = JSON.parse(readFileSync(file, "utf8"));
    for (const [k, v] of Object.entries(settings)) {
      if (v === undefined) delete s[k];
      else s[k] = v;
    }
    writeFileSync(file, JSON.stringify(s, null, "\t"));
    return dir;
  }
  async function open(name, settings) {
    if (c) await lane.closeProject();
    c = await lane.open(variant(name, settings));
  }
  // Presses Start, and returns what the console wrote until the run was over.
  async function start() {
    const mark = await consoleMark(c);
    await c.evaluate(`executeIdeCommand("tbDebug_StartOrContinue")`);
    const over = await waitFor(
      c,
      async () => {
        const lines = await linesSince(c, mark);
        return lines.includes(CLEARED) || lines.includes(NO_OBJECT);
      },
      { timeout: 60 * 1000 },
    );
    assert.ok(over, "Start wrote nothing that ends a run");
    return linesSince(c, mark);
  }

  test("control: a DLL whose Settings says (none) writes that it has no startup object", async () => {
    await open("dll-none", { "project.buildType": "ActiveX DLL", "project.startupObject": "(none)" });
    assert.deepEqual(await start(), [NO_OBJECT]);
  });

  test("Start with no Main writes a compile error that gives no reason", async () => {
    await open("exe-submain", { "project.buildType": "Standard EXE", "project.startupObject": "Sub Main" });
    assert.deepEqual(await start(), ["Executing 'Main'...", "(compile error: Main)", CLEARED]);
  });

  test("control: F6 on a procedure it cannot call says why", async () => {
    await openFile(c, FILE, { line: 5, column: 9 });
    await setCursor(c, 5, 9);
    await sleep(400);
    const mark = await consoleMark(c);
    await pressKey(c, "F6");
    const said = await waitFor(c, async () => (await linesSince(c, mark)).length >= 2, { timeout: 20 * 1000 });
    assert.ok(said, "F6 wrote nothing");
    assert.equal((await linesSince(c, mark))[1], "(compile error: Too few arguments, expected 1 in call to 'Greet')");
  });

  test("a DLL whose Settings names no startup object shows (none) in Project Settings, and Start runs Main", async () => {
    await open("dll-unset", { "project.buildType": "ActiveX DLL", "project.startupObject": undefined });
    await c.evaluate(`executeIdeCommand("tbProject_ShowSettings")`);
    assert.ok(
      await waitFor(c, () => c.evaluate(`!!${STARTUP_SELECT}`), { timeout: 20 * 1000 }),
      "no Startup Object row",
    );
    assert.equal(await c.evaluate(`${STARTUP_SELECT}.value`), "Default: (none)");
    await click(c, { css: ".modalTitleBarCloseBtn" });
    assert.ok(await waitFor(c, () => c.evaluate(`!${STARTUP_SELECT}`)), "Project Settings is still open");
    assert.deepEqual(await start(), ["Executing 'Main'...", "(compile error: Main)", CLEARED]);
  });

  test("control: (none) chosen in Project Settings has Start say that there is no startup object", async () => {
    await c.evaluate(`executeIdeCommand("tbProject_ShowSettings")`);
    assert.ok(
      await waitFor(c, () => c.evaluate(`!!${STARTUP_SELECT}`), { timeout: 20 * 1000 }),
      "no Startup Object row",
    );
    await c.evaluate(`(() => {
      const s = ${STARTUP_SELECT};
      s.selectedIndex = [...s.options].findIndex((o) => o.value === "(none)");
      s.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await click(c, { css: "#SAVEBTN" });
    assert.ok(
      await waitFor(c, () => c.evaluate(`!${STARTUP_SELECT}`), { timeout: 20 * 1000 }),
      "Project Settings is still open",
    );
    await sleep(2000);
    await waitForCompile(c, { project: lane.project });
    assert.deepEqual(await start(), [NO_OBJECT]);
  });

  test("Sample 22's Uninstall button of service 1 registers the event log of service 2", (t) => {
    const projects = path.join(path.dirname(path.resolve(lane.ide)), "projects");
    let folders = [];
    try {
      folders = readdirSync(projects).filter((f) => /^Sample 22\./.test(f));
    } catch {
      // A patched copy of an install has no projects folder.
    }
    if (!folders.length) return t.skip("this install has no Sample 22");
    const tree = path.join(lane.work, "sample22");
    mkdirSync(tree, { recursive: true });
    unpackProject(path.join(projects, folders[0], "projectName.twinproj"), tree);
    const text = readFileSync(path.join(tree, "Sources", "FORMS", "MainForm.twin"), "utf8").replace(/\r\n/g, "\n");
    const body = (name) => {
      const at = text.indexOf(`Private Sub ${name}()`);
      assert.notEqual(at, -1, `no ${name}`);
      return text.slice(at, text.indexOf("End Sub", at));
    };
    assert.match(body("btnInstall001_Click"), /RegisterEventLog\("Application\\TBSERVICE001"\)/);
    assert.match(body("btnUninstall001_Click"), /RegisterEventLog\("Application\\TBSERVICE002"\)/);
    assert.doesNotMatch(body("btnInstall002_Click"), /RegisterEventLog/);
    rmSync(tree, { recursive: true, force: true });
  });
});
