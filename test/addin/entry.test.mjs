// P14 in WIP.HelpAddin.md, measured: what the linker exports an add-in's entry
// point as, and which names the compiler's loader accepts. The EntryProbe
// add-in (probes/entry) declares tbCreateCompilerAddin, as the tbIDE package
// says to. It is built once, and four copies of it go in the lane's copy of the
// install, the one name the DLL exports patched in each: tbCreateCompilerAddin,
// _v2, _v3 as the linker wrote it, and _v4, which no IDE knows. Each copy that
// loads prints the file it was loaded from.
//
// The loader was read first, in the compiler's own code (bin\twinBASIC_win32.dll
// and _win64.dll): it asks GetProcAddress for tbCreateCompilerAddin, then _v2,
// then _v3, calls the first it finds with the Host as its one argument, and
// asks what that returns for IAddInV1. The linker renames a [DllExport]
// function called tbCreateCompilerAddin to tbCreateCompilerAddin_v3. This lane
// checks both by what they do.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P14 in WIP.HelpAddin.md, the entry point's NOTE on
// the tbIDE package page (docs/Reference/Built-In/tbIDE/index.md) and the
// messages on the Add Ins page (docs/IDE/AddIns/index.md), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dllInfo } from "../../scripts/lib/tb-addin.mjs";
import { loadedAddins, readConsole, sleep } from "../../scripts/lib/tb-ide.mjs";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "entry");
const lane = addinLane();

// The copies, and the name each one exports.
const COPIES = {
  "EntryV1.dll": "tbCreateCompilerAddin",
  "EntryV2.dll": "tbCreateCompilerAddin_v2",
  "EntryV3.dll": "tbCreateCompilerAddin_v3",
  "EntryV4.dll": "tbCreateCompilerAddin_v4",
};

// The DLL with its one export renamed. A name no longer than the linker's
// fits in its place, and NULs fill the rest; the export table has one name, so
// its order, which GetProcAddress relies on, cannot change.
function renameExport(dll, name) {
  const [e, ...more] = dllInfo(dll).exports;
  assert.equal(more.length, 0, "the add-in exports more than one name");
  assert.ok(name.length <= e.name.length, `"${name}" is longer than "${e.name}"`);
  const b = readFileSync(dll);
  b.fill(0, e.offset, e.offset + e.name.length);
  b.write(name, e.offset, "latin1");
  return b;
}

// The files the probe printed that it was loaded from, by name.
const loadedFrom = async (c) => ((await readConsole(c)) ?? "").split("\n")
  .map((l) => /^\[EntryProbe\] loaded from (.+)$/.exec(l.trim())).filter(Boolean)
  .map((m) => path.basename(m[1])).sort();

describe("P14: the add-in entry point", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, built;
  before(async () => {
    built = await lane.buildAddin(PROBE);
    const dir = path.join(lane.work, "entry");
    mkdirSync(dir, { recursive: true });
    for (const [file, name] of Object.entries(COPIES)) {
      writeFileSync(path.join(dir, file), renameExport(built.dll, name));
      lane.placeAddin(path.join(dir, file));
      assert.deepEqual(dllInfo(path.join(dir, file)).exports.map((e) => e.name), [name]);
    }
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("the linker exports tbCreateCompilerAddin as tbCreateCompilerAddin_v3, and under no other name", () => {
    assert.deepEqual(dllInfo(built.dll).exports.map((e) => e.name), ["tbCreateCompilerAddin_v3"]);
  });

  test("the loader takes tbCreateCompilerAddin, _v2 and _v3 alike", async () => {
    assert.ok(await waitFor(c, async (c) => (await loadedFrom(c)).length >= 3), "fewer than three copies loaded");
    await sleep(1000);
    assert.deepEqual(await loadedFrom(c), ["EntryV1.dll", "EntryV2.dll", "EntryV3.dll"]);
    assert.deepEqual((await loadedAddins(c)).map((a) => a.name).filter((n) => n === "EntryProbe AddIn").length, 3);
  });

  test("a DLL with none of them is refused as built for a newer IDE, and listed as Unknown Addin", async () => {
    const lines = ((await readConsole(c)) ?? "").split("\n").map((l) => l.trim());
    assert.ok(lines.includes("[EntryV4.dll] Failed to load addin.  Entry point not found.  " +
                             "Addin may have been compiled for a newer version of the twinBASIC IDE."),
              `no such line in the DEBUG CONSOLE:\n${lines.filter((l) => l.includes("EntryV4")).join("\n")}`);
    assert.deepEqual((await loadedAddins(c)).map((a) => a.name).sort(),
                     ["EntryProbe AddIn", "EntryProbe AddIn", "EntryProbe AddIn", "Unknown Addin"]);
  });
});
