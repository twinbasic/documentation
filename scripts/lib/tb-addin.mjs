// Building a twinBASIC IDE add-in for a test, which WIP.HelpAddin.md (Stage 1,
// item 4) calls "build, then load".
//
// An add-in is a Standard DLL, and the compiler loads every DLL in its
// install's addins\win32 or addins\win64 folder as it starts, and in the same
// folders under %APPDATA%\twinBASIC (P6 in WIP.HelpAddin.md). A test builds the
// add-in with the lane's private copy of the IDE (tb-ide-copy.mjs), ends that
// IDE, puts the DLL into the copy's addins folder with addAddin, and starts the
// copy again on the project it tests with. That IDE's compiler loads the add-in
// as it starts, and loadedAddins in tb-ide.mjs asks it which add-ins it loaded.
// One project per IDE, as everywhere in this harness.
//
// The DLL is built into the lane's work folder, not straight into the addins
// folder that the shipped add-in samples' own buildPath names. The IDE that
// builds is the lane's copy too, so on a rebuild its compiler would have the
// previous build loaded from that very folder while the linker tried to
// replace it.
//
// For win32 or win64, set on every build as tbrun's --arch is: a project path
// the IDE has no memory of opens in win32, and setBuildTarget in tb-ide.mjs
// switches it. Each compiler loads the add-ins of its own bitness alone, from
// addins\win32 or addins\win64, and a switch of target restarts the compiler
// in the other one, which then loads the other folder (P7 in WIP.HelpAddin.md).
// So a shipped add-in needs a build of each, and a test puts each build in the
// folder of its bitness.

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { compilerExe } from "./tb-install.mjs";
import { attachIde, buildProject, checkAddinsRoot, compileOutcome, launchIde, normPath,
         setBuildTarget, shutdownIde, summaryLine, TARGETS, waitForCompile } from "./tb-ide.mjs";
import { laneProjectId, stageProject } from "./tb-project.mjs";

// The PE machine types of the two targets.
const MACHINES = { 0x14c: "win32", 0x8664: "win64" };

/**
 * What a DLL's PE headers say: the target its machine type is (`arch`, null
 * for any other machine) and the names it exports, each with the file offset
 * of its name, where a test can patch it.
 *
 * The linker exports a function named tbCreateCompilerAddin as
 * tbCreateCompilerAddin_v3 and under no other name, and the compiler's loader
 * looks for tbCreateCompilerAddin, then _v2, then _v3 (P14 in
 * WIP.HelpAddin.md), so what a DLL exports says whether an IDE can load it.
 *
 * @param {string} file
 * @returns {{arch: string | null, machine: number, exports: {name: string, offset: number}[]}}
 * @throws when the file is not a PE image
 */
export function dllInfo(file) {
  const b = readFileSync(file);
  const fail = (why) => { throw new Error(`${file} is not a DLL: ${why}`); };
  if (b.length < 64 || b.toString("latin1", 0, 2) !== "MZ") fail("no MZ header");
  const pe = b.readUInt32LE(0x3c);
  if (pe + 24 > b.length || b.toString("latin1", pe, pe + 4) !== "PE\0\0") fail("no PE header");
  const machine = b.readUInt16LE(pe + 4);
  const sections = b.readUInt16LE(pe + 6);
  const opt = pe + 24;
  const magic = b.readUInt16LE(opt);
  if (magic !== 0x10b && magic !== 0x20b) fail(`optional header magic 0x${magic.toString(16)}`);
  // Data directory 0 is the export table: its RVA, then its size.
  const exportRva = b.readUInt32LE(opt + (magic === 0x10b ? 96 : 112));
  const table = opt + b.readUInt16LE(pe + 20);
  const offsetOf = (rva) => {
    for (let i = 0; i < sections; i++) {
      const s = table + 40 * i;
      const va = b.readUInt32LE(s + 12), size = Math.max(b.readUInt32LE(s + 8), b.readUInt32LE(s + 16));
      if (rva >= va && rva < va + size) return rva - va + b.readUInt32LE(s + 20);
    }
    return fail(`RVA 0x${rva.toString(16)} is in no section`);
  };
  const exports = [];
  if (exportRva) {
    const dir = offsetOf(exportRva);
    const names = offsetOf(b.readUInt32LE(dir + 32));
    for (let i = 0, n = b.readUInt32LE(dir + 24); i < n; i++) {
      const offset = offsetOf(b.readUInt32LE(names + 4 * i));
      exports.push({ name: b.toString("latin1", offset, b.indexOf(0, offset)), offset });
    }
  }
  return { arch: MACHINES[machine] ?? null, machine, exports };
}

// An error carrying tbbuild's exit codes: 1 the project has compile errors,
// 2 the harness failed, 3 the compile never settled, 4 the compiler crashed.
function failure(exitCode, message) {
  return Object.assign(new Error(message), { exitCode });
}

/**
 * Build an add-in from its exported source tree.
 *
 * The run's registry tidy is the caller's: hold a startTidy({ prefixes: [work] })
 * from lib/tb-registry.mjs around this and the IDEs that follow it.
 *
 * @param {object} o
 * @param {string} o.ide       the twinBASIC.exe to build with: the lane's copy
 * @param {string} o.src       the add-in's exported tree, holding Settings and Sources
 * @param {string} o.work      the lane's work folder; the staged tree, the
 *                             .twinproj and out\<project name>.dll go in it
 * @param {number} o.port      the lane's DevTools port
 * @param {string} [o.arch]    the build target, "win32" (the default) or "win64"
 * @param {boolean} [o.show]   on the user's desktop instead of a private one
 * @param {string} [o.appdata] a folder to start the IDE with as its APPDATA. Its
 *                             compiler then loads the add-ins under
 *                             <appdata>\twinBASIC\addins rather than the user's
 *                             own (P6), which checkAddinsRoot confirms
 * @param {number} [o.timeout] milliseconds for the compile to settle, and again
 *                             for the build (default 180000)
 * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
 *   `diagnostics` holds the warnings, hints and infos; `log` is the build log
 * @throws an Error with an `exitCode` (see failure above); a compile error's
 *   message lists every diagnostic
 */
export async function buildAddin({ ide, src, work, port, arch = "win32", show = false, appdata,
                                   timeout = 180 * 1000 }) {
  if (!TARGETS.includes(arch)) throw failure(2, `no such build target: "${arch}"`);
  const project = path.join(work, "addin.twinproj");
  mkdirSync(path.join(work, "out"), { recursive: true });
  let dll;
  let staged;
  try {
    staged = stageProject({
      src, stage: path.join(work, "addin-src"), project, compiler: compilerExe(ide),
      settings: (original) => {
        dll = path.join(work, "out", `${original["project.name"]}.dll`);
        return { "project.buildPath": dll, "project.id": laneProjectId(1, port) };
      },
    });
  } catch (e) {
    throw failure(2, e.message);
  }
  const type = staged.original["project.buildType"];
  if (type !== "Standard DLL") {
    throw failure(2, `${src} builds a ${type ?? "project of no stated type"}, and an add-in ` +
                     "is a Standard DLL");
  }

  const run = await launchIde({ exe: ide, project, port, show,
                                env: appdata ? { APPDATA: appdata } : {} });
  let built;
  try {
    const c = await attachIde(port);
    if (!c) throw failure(2, "the IDE never exposed a debug port");
    try {
      let outcome = compileOutcome(await waitForCompile(c, { project, timeout }), { name: project });
      if (!outcome.ok) throw failure(outcome.code, outcome.message);
      if (appdata) await checkAddinsRoot(c, appdata).catch((e) => { throw failure(2, e.message); });
      // Set even for win32, the target a path with no memory opens in: an entry
      // the tidy missed would otherwise decide the build without a word. The
      // switch restarts the compiler, which compiles the add-in again.
      let switched;
      try {
        switched = await setBuildTarget(c, arch, { project, timeout });
      } catch (e) {
        throw failure(2, e.message);
      }
      if (switched.waited) {
        outcome = compileOutcome(switched.waited, { name: project });
        if (!outcome.ok) throw failure(outcome.code, outcome.message);
      }
      if (outcome.counts[0] > 0) {
        throw failure(1, [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
      }
      built = await buildProject(c, { timeout });
      built.diagnostics = outcome.rows;
    } finally {
      c.close();
    }
  } finally {
    shutdownIde(run);
  }

  if (!built.ok) throw failure(2, `the add-in did not build: ${built.message}\n${built.log.join("\n")}`);
  if (normPath(built.file) !== normPath(dll)) {
    throw failure(2, `the linker created ${built.file}, not ${dll}`);
  }
  // The linker's word, checked against the file: a DLL for the target asked
  // for, which no IDE loads unless it exports one of the loader's names.
  let info;
  try {
    info = dllInfo(dll);
  } catch (e) {
    throw failure(2, `the linker reported ${dll}, but it is missing or not a DLL: ${e.message}`);
  }
  if (info.arch !== arch) {
    throw failure(2, `the linker built ${dll} for machine 0x${info.machine.toString(16)}, not for ${arch}`);
  }
  if (!info.exports.some((e) => /^tbCreateCompilerAddin(_v[23])?$/.test(e.name))) {
    throw failure(2, `${dll} exports ${info.exports.map((e) => e.name).join(", ") || "nothing"}, ` +
                     "and no IDE loads it without tbCreateCompilerAddin, _v2 or _v3");
  }
  return { dll, arch, diagnostics: built.diagnostics, log: built.log };
}
