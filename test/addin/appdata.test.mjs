// P6 in WIP.HelpAddin.md, measured: the compiler also loads the add-ins in
// %APPDATA%\twinBASIC\addins\<arch>, and which folder that is. The AppDataProbe
// add-in (probes/appdata) prints the file it was loaded from and the APPDATA of
// the compiler's process.
//
// It goes in the add-ins folder of the APPDATA the lane gives every IDE it
// starts, inside the lane's own folder (tb-lane.mjs); never in the user's own
// %APPDATA%\twinBASIC\addins, where every IDE the user starts would load it.
// That private APPDATA is what keeps the user's add-ins out of every other
// lane, and these tests are what it rests on.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P6 in WIP.HelpAddin.md and the lanes' APPDATA in
// scripts/lib/tb-lane.mjs, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { addinsRoot, consoleMark, loadedAddins, normPath, readConsole } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { click, waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "appdata");
const lane = addinLane();

// What the probe printed since a mark, without its prefix.
const probeLines = async (c, mark) => ((await readConsole(c, { since: mark })) ?? "").split("\n")
  .map((l) => l.trim()).filter((l) => l.startsWith("[AppDataProbe] ")).map((l) => l.slice(15));
const same = (a, b) => normPath(path.resolve(a)) === normPath(path.resolve(b));

describe("P6: add-ins in %APPDATA%\\twinBASIC\\addins", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, dll;
  before(async () => {
    const built = await lane.buildAddin(PROBE);
    const dir = path.join(lane.appdataDir(), "twinBASIC", "addins", "win32");
    mkdirSync(dir, { recursive: true });
    dll = path.join(dir, path.basename(built.dll));
    copyFileSync(built.dll, dll);
    // A second copy in addins itself, where the FAQ once said add-ins go.
    copyFileSync(built.dll, path.join(dir, "..", "AppDataProbeInAddins.dll"));
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the page makes the add-ins' root by expanding %APPDATA% in the IDE's environment, and fills it", async () => {
    assert.equal(await addinsRoot(c), `${path.join(lane.appdata, "twinBASIC")}\\`);
    assert.deepEqual(readdirSync(path.join(lane.appdata, "twinBASIC")).sort(),
                     ["addins", "locale", "packages", "themes"]);
    assert.deepEqual(readdirSync(path.join(lane.appdata, "twinBASIC", "addins"), { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name).sort(), ["win32", "win64"]);
  });

  test("the compiler loads the add-in in its addins\\win32, not the copy in addins itself", async () => {
    const names = (await loadedAddins(c)).map((a) => a.name);
    assert.deepEqual(names, ["AppDataProbe AddIn"]);
    const lines = await waitFor(c, async (c) => { const l = await probeLines(c, null); return l.length >= 2 && l; });
    assert.ok(lines, "the add-in printed nothing");
    assert.deepEqual(lines.length, 2, `loaded more than once: ${JSON.stringify(lines)}`);
    assert.ok(same(lines[0].replace(/^loaded from /, ""), dll), lines[0]);
    assert.ok(same(lines[1].replace(/^APPDATA /, ""), lane.appdata), lines[1]);
    // The copy's own add-in folders are empty, so nothing else could have loaded it.
    const own = path.join(path.dirname(lane.copy()), "addins");
    assert.deepEqual(readdirSync(own, { recursive: true }).sort(), ["win32", "win64"]);
  });

  test("the compiler loads from the folder the page sends it, not from its own %APPDATA%", async () => {
    // Point the page's commonFolderRootPath at a second folder holding the
    // same add-in, and restart the compiler: the page sends it again with
    // RequestLoadAddins, while the new compiler inherits the old APPDATA.
    const second = path.join(lane.work, "appdata2", "twinBASIC");
    mkdirSync(path.join(second, "addins", "win32"), { recursive: true });
    const dll2 = path.join(second, "addins", "win32", path.basename(dll));
    copyFileSync(dll, dll2);
    const pid = await c.evaluate("g_CurrentCompilerProcessId");
    await c.evaluate(`commonFolderRootPath = ${JSON.stringify(`${second}\\`)}`);
    const mark = await consoleMark(c);
    await click(c, "restartIcon");
    assert.ok(await waitFor(c, async (c) => { const p = await c.evaluate("g_CurrentCompilerProcessId"); return p && p !== pid; },
                            { timeout: 30000 }), "the compiler did not restart");
    const lines = await waitFor(c, async (c) => { const l = await probeLines(c, mark); return l.length >= 2 && l; },
                                { timeout: 30000 });
    assert.ok(lines, "the restarted compiler's add-in printed nothing");
    assert.ok(same(lines[0].replace(/^loaded from /, ""), dll2), lines[0]);
    assert.ok(same(lines[1].replace(/^APPDATA /, ""), lane.appdata), lines[1]);
  });
});
