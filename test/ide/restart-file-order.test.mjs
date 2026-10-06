// The order of a project's files, across a compiler restart, Save and a switch of the build target. The
// project in probes/restart-file-order has a Startup module that calls the form FormF and a procedure of
// its own, and two classes, ClsX and ClsY, that nothing references. Every procedure returns a constant of
// its own, so the layout of a build is the order of those constants' four bytes in the exe's .text
// section: X1 Y1 F1 S1 when the project's files come in the order ClsX, ClsY, and Y1 X1 F1 S1 when they
// come in the other. Only the classes that the referenced form keeps move; the form's F1 and Startup's S1
// stay in the order that Main calls them.
//
// The IDE reverses the order of the project's files each time the compiler restarts and each time the
// build target changes, and Save writes the reversed order to the file. So the same unchanged project
// builds to exes with their code in another order: the first build is laid out as the opened file is, the
// build after a restart in the reverse, and the build after a second restart as the first again.
//
// After a Save, a restart or a switch loads the file Save wrote, which is reversed already, so a switch
// after the Save would show the Save and not the switch. The switch has a scenario of its own, on the
// project opened afresh.
//
// The IDE falls into Safe Mode after four unexpected compiler restarts within a minute: the build box
// (buildConfigSelector) then says nocompile, and a build builds nothing. Whether the restart button
// counts is not known, so the lane leaves SPACING between one restart or switch and the next, and checks
// the box before each build.
//
// Each test states what BETA 997 does. If one fails after an IDE update, the IDE has changed: update the
// entry "The IDE reverses the order of a project's files at each compiler restart, target switch and
// Save, and the code of a build follows that order" in BUGS-TO-REPORT.md, or its report in bugs/filed/,
// and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readProject } from "../../scripts/impexp.mjs";
import { buildProject } from "../../scripts/lib/tb-ide.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "restart-file-order");

// The constant each procedure returns: X1 in ClsX, Y1 in ClsY, F1 in FormF and S1 in Startup.
const MARKERS = { X1: 0x5a120001, Y1: 0x5a130001, F1: 0x5a0f0001, S1: 0x5a110001 };
// The two layouts a build has. The file lists ClsX before ClsY, so a build laid out in the file's
// order has X1 before Y1.
const FILE_ORDER = "X1 Y1 F1 S1";
const OTHER_ORDER = "Y1 X1 F1 S1";

// The least time between one restart or switch and the next.
const SPACING = 21 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The bytes of the .text section of an exe, 32-bit or 64-bit.
function textSection(exe) {
  const pe = exe.readUInt32LE(0x3c);
  assert.equal(exe.readUInt32LE(pe), 0x4550, "the build is not a PE file");
  const sections = exe.readUInt16LE(pe + 6);
  const optionalHeader = exe.readUInt16LE(pe + 20);
  for (let i = 0; i < sections; i++) {
    const at = pe + 24 + optionalHeader + 40 * i;
    if (exe.toString("latin1", at, at + 8).split("\0")[0] === ".text") {
      const start = exe.readUInt32LE(at + 20);
      return exe.subarray(start, start + exe.readUInt32LE(at + 16));
    }
  }
  return assert.fail("the build has no .text section");
}

// The markers of a build, in the order their code sits in the exe's .text section. Two builds of
// one order also differ in other bytes on win32, so the layout is read from the markers and never
// from a hash of the section.
function layout(file) {
  const text = textSection(readFileSync(file));
  const found = Object.entries(MARKERS).map(([name, value]) => {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32LE(value);
    return { name, at: text.indexOf(bytes) };
  });
  const missing = found.filter((m) => m.at < 0).map((m) => m.name);
  assert.deepEqual(missing, [], `${file} holds no code for ${missing.join(", ")}`);
  return found
    .sort((a, b) => a.at - b.at)
    .map((m) => m.name)
    .join(" ");
}

// The paths of a project file's entries in the order the file holds them, a folder before its own
// entries.
function entries(folder, prefix = "") {
  return folder.children.flatMap((e) => {
    const name = prefix + e.name;
    return e.kind === "directory" ? [`${name}/`, ...entries(e, `${name}/`)] : [name];
  });
}

// The tree with the entries of every folder in the opposite order.
function reversed(folder) {
  return { ...folder, children: folder.children.map((e) => (e.kind === "directory" ? reversed(e) : e)).reverse() };
}

// What a scenario does in its IDE: `spaced` waits until SPACING has passed since the last restart or
// switch, and `build` builds the project, which must be in `arch`, and returns the layout of the exe.
function session(c) {
  let lastReload = 0; // when the compiler was last restarted, or the build target last switched
  return {
    async spaced() {
      const wait = lastReload + SPACING - Date.now();
      if (wait > 0) await sleep(wait);
      lastReload = Date.now();
    },
    // A build box that says nocompile is Safe Mode.
    async build(arch) {
      const target = await c.evaluate("buildConfigSelector.value");
      assert.equal(target, arch, `the build box says ${target}, not ${arch}`);
      const built = await buildProject(c);
      assert.ok(built.ok, `the build did not finish: ${built.message}`);
      return layout(built.file);
    },
  };
}

scenario("the order of a project's files across compiler restarts and Save", (lane) => {
  let c;
  let ide;
  let opened; // the project file as the IDE opened it
  let first; // the layout of the build before any restart

  before(async () => {
    c = await lane.open(PROJECT);
    ide = session(c);
    opened = readProject(lane.project);
    first = await ide.build("win32");
    assert.equal(first, FILE_ORDER, "the first build is not laid out in the order of the project's files");
  });

  test("after a compiler restart, a build lays the code out in the reverse order of the build before it", async () => {
    await ide.spaced();
    await lane.restartCompiler();
    const second = await ide.build("win32");
    assert.equal(
      second,
      OTHER_ORDER,
      `the build before the restart is laid out ${first}, the build after it ${second}`,
    );
  });

  test("after a second restart, a build lays the code out in the order of the first build again", async () => {
    await ide.spaced();
    await lane.restartCompiler();
    const third = await ide.build("win32");
    assert.equal(third, first, `the first build is laid out ${first}, the build after two restarts ${third}`);
  });

  test("Save writes the project's files in the reverse of the order they were opened in", async () => {
    const was = readFileSync(lane.project);
    await c.evaluate(`executeIdeCommand("tbProject_SaveAllChanges")`);
    let saved = null;
    const written = await waitFor(
      c,
      async () => {
        try {
          if (readFileSync(lane.project).equals(was)) return false;
          saved = readProject(lane.project);
          return true;
        } catch {
          return false; // the IDE is still writing the file
        }
      },
      { timeout: 30 * 1000 },
    );
    assert.ok(written, "Save did not change the project file");
    assert.deepEqual(
      entries(saved),
      entries(reversed(opened)),
      "Save did not write the project's files in the reverse of the order they were opened in",
    );
  });
});

scenario("the order of a project's files across a switch of the build target", (lane) => {
  let c;
  let ide;
  let first; // the layout of the build for win32, before the switch

  before(async () => {
    c = await lane.open(PROJECT);
    ide = session(c);
    first = await ide.build("win32");
    assert.equal(first, FILE_ORDER, "the first build is not laid out in the order of the project's files");
  });

  test("after a switch to win64, a build lays the code out in the reverse order of the build before it", async () => {
    await ide.spaced();
    await lane.setBuildTarget("win64");
    const switched = await ide.build("win64");
    assert.equal(
      switched,
      OTHER_ORDER,
      `the build for win32 is laid out ${first}, the build after the switch to win64 ${switched}`,
    );
  });
});
