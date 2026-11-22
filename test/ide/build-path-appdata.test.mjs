// ${AppData} in Build Output Path, new in BETA 1045: which folder it names.
// The lane gives every IDE an APPDATA of its own (<work>\appdata), so the path
// ${AppData}\..\Local\Temp\<dir>\... lands in the lane's work folder when the
// compiler takes ${AppData} from its environment, and under the real
// %LOCALAPPDATA%\Temp when it asks Windows for the user's Roaming folder.
// Both are under the temp folder, so neither answer writes anywhere a run may
// not; the folder under the real Temp is deleted afterwards.
//
// BETA 1045 takes the user's Roaming folder from Windows: the environment's
// APPDATA has no effect on ${AppData}.
//
// Each test states what BETA 1045 does. If one fails after an IDE update, the
// IDE has changed: update docs/IDE/Building/Build-Output.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { scenario } from "../addin/scenario.mjs";
import { guard, J, press, variant } from "./building-kit.mjs";

const EXE = "BuildProbeExe";
const DIR = `tbappdata-${process.pid}`;
const APPDATA_PATH = `\${AppData}\\..\\Local\\Temp\\${DIR}\\\${ProjectName}.\${FileExtension}`;

scenario("Build path ${AppData}", (lane) => {
  let c;
  let r;
  const exeDir = path.join(lane.work, "exe");
  const inLane = path.join(lane.work, "Local", "Temp", DIR);
  const roaming = path.join(os.homedir(), "AppData", "Roaming");
  const inUser = path.join(roaming, "..", "Local", "Temp", DIR);

  before(async () => {
    const src = variant("building-exe", path.join(lane.work, "src-exe"));
    c = await lane.open(src, { folder: exeDir, buildPath: APPDATA_PATH });
    await guard(c);
  });

  after(() => {
    if (existsSync(inUser)) rmSync(inUser, { recursive: true, force: true });
  });

  test("${AppData} in Build Output Path is the user's Roaming folder, whatever APPDATA the IDE was started with", async () => {
    r = await press(c, "build");
    const line = `[LINKER] SUCCESS created output file '${roaming}\\..\\Local\\Temp\\${DIR}\\${EXE}.exe'`;
    assert.ok(r.lines.includes(line), J(r.lines));
    assert.deepEqual(readdirSync(inUser), [`${EXE}.exe`]);
  });

  test("control: nothing is written under the APPDATA the IDE was started with", () => {
    assert.ok(!existsSync(inLane), `written to ${inLane}: ${J(r?.lines ?? [])}`);
  });
});
