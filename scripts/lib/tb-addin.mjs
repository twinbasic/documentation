// Building a twinBASIC IDE add-in for a test, which WIP.HelpAddin.md (Stage 1,
// item 4) calls "build, then load".
//
// An add-in is a Standard DLL, and the compiler loads every DLL in its
// install's addins\win32 or addins\win64 folder as it starts. A test builds the
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
// win32 only. A project path the IDE has no memory of opens in its first
// build target, win32, whose compiler is twinBASIC_win32_noDEP.exe and loads
// add-ins from addins\win32; the registry tidy deletes any memory the lane's
// paths have. A win64 project gets twinBASIC_win64_noDEP.exe, opened that way
// or switched to (setBuildTarget in tb-ide.mjs); which add-in folder a
// switched compiler loads is the rest of P7.

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { compilerExe } from "./tb-install.mjs";
import { attachIde, buildProject, compileOutcome, launchIde, normPath, shutdownIde,
         summaryLine, waitForCompile } from "./tb-ide.mjs";
import { laneProjectId, stageProject } from "./tb-project.mjs";

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
 * @param {string} [o.arch]    the build target; "win32" is the only one yet
 * @param {boolean} [o.show]   on the user's desktop instead of a private one
 * @param {number} [o.timeout] milliseconds for the compile to settle, and again
 *                             for the build (default 180000)
 * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
 *   `diagnostics` holds the warnings, hints and infos; `log` is the build log
 * @throws an Error with an `exitCode` (see failure above); a compile error's
 *   message lists every diagnostic
 */
export async function buildAddin({ ide, src, work, port, arch = "win32", show = false,
                                   timeout = 180 * 1000 }) {
  if (arch !== "win32") {
    throw failure(2, `cannot build an add-in for ${arch} yet: which compiler loads a ${arch} ` +
                     "add-in is P7 in WIP.HelpAddin.md");
  }
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

  const run = await launchIde({ exe: ide, project, port, show });
  let built;
  try {
    const c = await attachIde(port);
    if (!c) throw failure(2, "the IDE never exposed a debug port");
    try {
      const outcome = compileOutcome(await waitForCompile(c, { project, timeout }), { name: project });
      if (!outcome.ok) throw failure(outcome.code, outcome.message);
      if (outcome.counts[0] > 0) {
        throw failure(1, [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
      }
      const target = await c.evaluate(
        "typeof buildConfigSelector === 'undefined' ? null : buildConfigSelector.value");
      if (target !== arch) {
        throw failure(2, `the IDE opened the add-in to build for ${target}, not ${arch}. It ` +
          "remembers a target for each project path, in IDESettings' targetArchitectureMemory; " +
          `the run's registry tidy deletes the entries under ${work}.`);
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
  // The linker's word, checked against the file: a DLL starts with "MZ".
  let head = "";
  try { head = readFileSync(dll).subarray(0, 2).toString("latin1"); } catch { /* reported below */ }
  if (head !== "MZ") throw failure(2, `the linker reported ${dll}, but it is missing or not a DLL`);
  return { dll, arch, diagnostics: built.diagnostics, log: built.log };
}
