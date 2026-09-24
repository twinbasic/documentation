// P7 in WIP.HelpAddin.md, measured: which compiler a project opens with, which
// add-in folders each compiler loads, and what a switch of build target does.
// The ArchProbe add-in (probes/arch) is built for win32 and for win64, and each
// build goes in both add-in folders of its bitness: the lane's copy of the
// install's, as ArchProbe.dll, and the lane's own APPDATA's, as
// ArchProbeUser.dll. Every copy that loads prints one line: the bitness it was
// built for, the executable of the process it runs in, and its own file.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P7 in WIP.HelpAddin.md and the Add Ins page
// (docs/IDE/AddIns/index.md), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dllInfo } from "../../scripts/lib/tb-addin.mjs";
import { compilerPid, consoleMark, loadedAddins, normPath, readConsole, sleep } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "arch");
const lane = addinLane();

// What the copies of the probe printed since a mark, sorted by file.
const loadsSince = async (c, mark) => ((await readConsole(c, { since: mark })) ?? "").split("\n")
  .map((l) => /^\[ArchProbe\] (\d+)-bit \| (.+) \| (.+)$/.exec(l.trim())).filter(Boolean)
  .map(([, bits, process, file]) => ({ bits: Number(bits), process: path.basename(process), file: normPath(file) }))
  .sort((a, b) => a.file.localeCompare(b.file));

// Wait for two copies to report, then a moment longer for any third.
async function waitLoads(c, mark) {
  const two = await waitFor(c, async (c) => (await loadsSince(c, mark)).length >= 2, { timeout: 30 * 1000 });
  assert.ok(two, `the probe did not load twice: ${JSON.stringify(await loadsSince(c, mark))}`);
  await sleep(1000);
  return loadsSince(c, mark);
}

describe("P7: build targets and add-in folders", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, built;
  // Where each copy of the probe goes, by bitness, as loadsSince reports files.
  const where = {};
  before(async () => {
    built = { win32: await lane.buildAddin(PROBE), win64: await lane.buildAddin(PROBE, { arch: "win64" }) };
    for (const arch of ["win32", "win64"]) {
      const user = path.join(lane.appdataDir(), "twinBASIC", "addins", arch);
      mkdirSync(user, { recursive: true });
      copyFileSync(built[arch].dll, path.join(user, "ArchProbeUser.dll"));
      where[arch] = [lane.placeAddin(built[arch].dll, { arch, name: "ArchProbe.dll" }),
                     path.join(user, "ArchProbeUser.dll")].map(normPath).sort();
    }
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the builds are a 32-bit and a 64-bit DLL, each exporting tbCreateCompilerAddin_v3 alone", () => {
    for (const arch of ["win32", "win64"]) {
      const info = dllInfo(built[arch].dll);
      assert.equal(info.arch, arch);
      assert.deepEqual(info.exports.map((e) => e.name), ["tbCreateCompilerAddin_v3"]);
    }
  });

  test("a project the IDE has no target for opens in win32, and its compiler loads both win32 folders alone", async () => {
    assert.equal(await c.evaluate("buildConfigSelector.value"), "win32");
    assert.deepEqual(await waitLoads(c, null), where.win32.map((file) =>
      ({ bits: 32, process: "twinBASIC_win32_noDEP.exe", file })));
    assert.deepEqual((await loadedAddins(c)).map((a) => a.name), ["ArchProbe AddIn", "ArchProbe AddIn"]);
  });

  test("switching to win64 restarts the compiler as a 64-bit process, which loads both win64 folders alone", async () => {
    const before = await compilerPid(c);
    const mark = await consoleMark(c);
    const pid = await lane.setBuildTarget("win64");
    assert.notEqual(pid, before);
    assert.deepEqual(await waitLoads(c, mark), where.win64.map((file) =>
      ({ bits: 64, process: "twinBASIC_win64_noDEP.exe", file })));
    assert.deepEqual((await loadedAddins(c)).map((a) => a.name), ["ArchProbe AddIn", "ArchProbe AddIn"]);
  });

  test("switching back to win32 loads both win32 folders again", async () => {
    const mark = await consoleMark(c);
    await lane.setBuildTarget("win32");
    assert.deepEqual(await waitLoads(c, mark), where.win32.map((file) =>
      ({ bits: 32, process: "twinBASIC_win32_noDEP.exe", file })));
  });
});
