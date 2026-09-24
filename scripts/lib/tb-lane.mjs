// One lane of the add-in test runner, as the scenario file running in it sees
// it. WIP.HelpAddin.md, Stage 1 item 7.
//
// scripts/addin_test.mjs runs every scenario file in a node:test process of
// its own, and hands it its lane in TB_ADDIN_LANE: a DevTools port, a work
// folder inside the temp folder, and the install to copy. The lane makes its
// own copy of that install (tb-ide-copy.mjs), builds the add-ins its scenarios
// test into the copy's addins\win32, and opens projects in the copy, one IDE at
// a time. The runner owns the registry for the whole run and puts it back once
// every lane has ended; a lane never tidies.
//
// Every IDE a lane starts has an APPDATA of its own, <work>\appdata. The
// compiler also loads the add-ins in %APPDATA%\twinBASIC\addins\<arch>, as the
// IDE's environment expands %APPDATA% (P6 in WIP.HelpAddin.md), so without it
// every add-in the user keeps there would load into every test IDE. The lane
// checks each IDE's add-ins folder (checkAddinsRoot in tb-ide.mjs) rather than
// trusting that it did.
//
// A scenario file reads, in outline:
//
//     const lane = addinLane();
//     describe("...", { skip: lane ? false : "run it with addin-test.bat" }, () => {
//       let c;
//       before(async () => {
//         await lane.addSample("Sample 15");
//         c = await lane.open(HOST);
//       });
//       after(() => lane.close());
//       test("...", async () => { ...tb-operate.mjs calls on c... });
//     });
//
// Outside the runner addinLane() returns null and the suite is skipped, so a
// bare `node --test` never starts an IDE.

import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { buildAddin } from "./tb-addin.mjs";
import { addAddin, makeIdeCopy, removeIdeCopy } from "./tb-ide-copy.mjs";
import { attachIde, awaitCrashName, checkAddinsRoot, compileOutcome, compilerPid, launchIde, readCrash,
         setBuildTarget, shutdownIde, summaryLine, waitForCompile } from "./tb-ide.mjs";
import { compilerExe, runCompiler } from "./tb-install.mjs";
import { restartCompiler } from "./tb-operate.mjs";
import { laneProjectId, stageProject } from "./tb-project.mjs";

/** The environment variable the runner hands a lane to its scenario file in. */
export const LANE_ENV = "TB_ADDIN_LANE";

/** The lane this process runs in, or null outside the runner. */
export function addinLane() {
  const raw = process.env[LANE_ENV];
  return raw ? new Lane(JSON.parse(raw)) : null;
}

const winPath = (p) => path.resolve(p).split("/").join("\\");

export class Lane {
  /**
   * @param {object} o
   * @param {string} o.name     the lane's name, for messages
   * @param {number} o.port     its DevTools port
   * @param {string} o.work     its work folder, inside the temp folder
   * @param {string} o.ide      the install's twinBASIC.exe, which the lane copies
   * @param {boolean} [o.show]  IDEs on the user's desktop instead of a private one
   */
  constructor({ name, port, work, ide, show = false }) {
    Object.assign(this, { name, port, work, ide, show });
    this.exe = null;       // the lane's copy of the install, made on first use
    this.run = null;       // the open IDE, from launchIde
    this.c = null;         // the connection to it
    this.src = null;       // the tree it has open, and the .twinproj staged from it
    this.project = null;
    this.builds = 0;
    // The APPDATA every IDE of the lane is started with; the IDE makes
    // twinBASIC\{addins\win32,addins\win64,packages,themes,locale} in it.
    this.appdata = path.join(work, "appdata");
  }

  // The lane's copy of the install, made the first time anything needs it. A
  // lane never starts the install itself: its compiler would load the add-ins
  // in the install's own addins folders.
  copy() {
    if (!this.exe) this.exe = makeIdeCopy({ ide: this.ide, dest: path.join(this.work, "ide") });
    return this.exe;
  }

  // The lane's APPDATA, made the first time an IDE needs it.
  appdataDir() {
    mkdirSync(this.appdata, { recursive: true });
    return this.appdata;
  }

  /**
   * Export one of the install's sample projects and return the exported tree.
   * The install is only read. The name is the folder's up to its dot: "Sample
   * 15" is "Sample 15.    twinBASIC IDE Addin (GlobalSearch)", and never
   * "Sample 1a." or "Sample 150.".
   */
  exportSample(sample) {
    const projects = path.join(path.dirname(path.resolve(this.ide)), "projects");
    const dirs = readdirSync(projects).filter((d) => d.startsWith(`${sample}.`));
    if (dirs.length !== 1) {
      throw new Error(`${projects} has ${dirs.length} folders named "${sample}.", where one was expected`);
    }
    const dir = path.join(projects, dirs[0]);
    const files = readdirSync(dir).filter((f) => /\.twinproj$/i.test(f));
    if (files.length !== 1) throw new Error(`${dir} holds ${files.length} .twinproj files, not one`);
    const out = path.join(this.work, "samples", sample.replace(/[^A-Za-z0-9]+/g, "-"));
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    // export wants backslashes, a full path to the project and a trailing
    // separator on the folder (WIP.md, Driving the twinBASIC compiler).
    const r = runCompiler(compilerExe(this.copy()),
      ["export", winPath(path.join(dir, files[0])), `${winPath(out)}\\`, "--overwrite"]);
    if (!r.done) throw new Error(`exporting ${sample} failed${r.why}:\n${r.tail}`);
    return out;
  }

  /**
   * Build an add-in from its exported tree with the lane's copy, and leave the
   * DLL in the lane's work folder: no IDE the lane opens loads it until it is
   * put somewhere that IDE's compiler looks. addAddin puts it in the copy's own
   * addins\<arch>, and placeAddin puts a built DLL there.
   *
   * @param {string} src
   * @param {object} [o]
   * @param {string} [o.arch]  the build target, "win32" (the default) or "win64"
   * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
   *   buildAddin's result; it throws, with an exitCode, when the add-in does not build
   */
  async buildAddin(src, { arch = "win32" } = {}) {
    if (this.run) throw new Error(`lane ${this.name}: close the open project before building an add-in`);
    return buildAddin({ ide: this.copy(), src, work: path.join(this.work, `addin${++this.builds}`),
                        port: this.port, arch, show: this.show, appdata: this.appdataDir() });
  }

  /**
   * Build an add-in from its exported tree and put it in the copy's
   * addins\<arch>, so that every IDE the lane opens after this with a compiler
   * of that bitness loads it.
   *
   * @param {string} src
   * @param {object} [o]
   * @param {string} [o.arch]  as for buildAddin
   * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
   *   as buildAddin
   */
  async addAddin(src, { arch = "win32" } = {}) {
    const built = await this.buildAddin(src, { arch });
    this.placeAddin(built.dll, { arch });
    return built;
  }

  /**
   * Put a DLL in the copy's addins\<arch> folder, replacing a file of the same
   * name, and return where it now is. Refused anywhere but a copy this lane
   * made (addAddin in tb-ide-copy.mjs), and refused while an IDE of the copy
   * holds a file of that name: a compiler holds every add-in it loaded (P8).
   *
   * @param {string} dll
   * @param {object} [o]
   * @param {string} [o.arch]  "win32" (the default) or "win64": which compiler loads it
   * @param {string} [o.name]  the file name to give it; by default its own
   */
  placeAddin(dll, { arch = "win32", name } = {}) {
    return addAddin(this.copy(), dll, arch, name);
  }

  /** exportSample, then addAddin. */
  addSample(sample) {
    return this.addAddin(this.exportSample(sample));
  }

  /**
   * Open a project in the lane's copy and wait for its compile to settle: the
   * tree is staged and packed as tbrun stages a probe (tb-project.mjs), with
   * its build path pinned inside the work folder, and started on the lane's
   * port. Refuses a project that does not compile, since a scenario on it
   * would be testing something else.
   *
   * The IDE is started with the lane's own APPDATA (see the top of this file),
   * and refused afterwards if it did not load its add-ins from there.
   *
   * @param {string} src        an exported tree: the folder holding Settings and Sources
   * @param {object} [o]
   * @param {number} [o.timeout]  milliseconds for the compile to settle (default 180000)
   * @param {object} [o.env]      extra environment for the IDE, as launchIde takes it.
   *                              An add-in reads it with Environ$, since it runs in the
   *                              compiler's process, which the IDE starts (P10)
   * @returns {Promise<object>} the connection (attachIde's), which the tb-operate.mjs calls take
   */
  async open(src, { timeout = 180 * 1000, env = {} } = {}) {
    if (this.run) throw new Error(`lane ${this.name} has a project open already: one IDE at a time`);
    const exe = this.copy();
    const project = path.join(this.work, "project.twinproj");
    stageProject({
      src, stage: path.join(this.work, "project-src"), project, compiler: compilerExe(exe),
      settings: (original) => ({
        "project.buildPath": path.join(this.work, "out", `${original["project.name"]}.exe`),
        "project.id": laneProjectId(2, this.port),
      }),
    });
    const appdata = this.appdataDir();
    this.run = await launchIde({ exe, project, port: this.port, show: this.show,
                                 env: { APPDATA: appdata, ...env } });
    Object.assign(this, { src, project });
    this.c = await attachIde(this.port);
    if (!this.c) throw new Error(`lane ${this.name}: the IDE never exposed a debug port`);
    this.checkCompile(await waitForCompile(this.c, { project, timeout }), src);
    // Checked against whatever APPDATA the IDE was given: `env` can name another.
    const given = "APPDATA" in env ? env.APPDATA : appdata;
    if (typeof given === "string") {
      await checkAddinsRoot(this.c, given)
        .catch((e) => { throw new Error(`lane ${this.name}: ${e.message}`); });
    }
    return this.c;
  }

  // Throw unless what waitForCompile saw is a compile that settled with no
  // errors: a scenario on a project that does not compile would be testing
  // something else.
  checkCompile(waited, what) {
    const outcome = compileOutcome(waited, { name: this.project });
    if (!outcome.ok) throw new Error(`lane ${this.name}: ${outcome.message}`);
    if (outcome.counts[0] > 0) {
      throw new Error(`lane ${this.name}: ${what} does not compile\n` +
                      [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
    }
  }

  /**
   * Restart the open IDE's compiler with the toolbar's button (restartCompiler
   * in tb-operate.mjs), and wait for the new one to compile the project. The
   * new compiler loads the add-ins from their folders again (P9).
   *
   * @returns {Promise<number>} the new compiler's process id
   */
  async restartCompiler({ timeout = 180 * 1000 } = {}) {
    if (!this.c) throw new Error(`lane ${this.name} has no project open`);
    const { pid, waited } = await restartCompiler(this.c, { project: this.project, timeout });
    this.checkCompile(waited, `${this.src}, after the restart,`);
    return pid;
  }

  /**
   * Switch the open project's build target to "win32" or "win64", as Ctrl+F2
   * and Ctrl+F1 do (setBuildTarget in tb-ide.mjs), and wait for the compile
   * under it. A switch restarts the compiler in the target's bitness, and the
   * new one loads the add-ins in addins\<arch> (P7). The IDE remembers the
   * target for the project's path, which the runner's registry tidy deletes.
   *
   * @returns {Promise<number>} the process id of the compiler now running
   */
  async setBuildTarget(arch, { timeout = 180 * 1000 } = {}) {
    if (!this.c) throw new Error(`lane ${this.name} has no project open`);
    const { waited } = await setBuildTarget(this.c, arch, { project: this.project, timeout });
    if (waited) this.checkCompile(waited, `${this.src}, built for ${arch},`);
    return compilerPid(this.c);
  }

  /**
   * End the open IDE, if there is one. Throws afterwards when the compiler
   * crashed while it ran, since an add-in runs inside the compiler and a
   * scenario that saw a crash has not tested what it meant to; and when a
   * javascript dialog opened that the scenario did not take out of
   * `c.dialogs`, since the IDE opens one only on an error path.
   */
  async closeProject() {
    const { c, run } = this;
    this.c = this.run = null;
    let crash = null, dialogs = [];
    try {
      if (c) {
        // A crash the scenario ended soon after has not named its file yet:
        // only a later crash does, so it gets the wait waitForCompile gives one.
        crash = await readCrash(c).catch(() => null);
        if (crash) crash = await awaitCrashName(c, crash);
        dialogs = c.dialogs;
        c.close();
      }
    } finally {
      shutdownIde(run);
    }
    const problems = [];
    if (crash) problems.push(`the compiler crashed ${crash.n}x` +
                             (crash.files?.length ? `, parsing ${crash.files.join(", ")}` : ""));
    if (dialogs.length) {
      problems.push(`the IDE opened ${dialogs.length} javascript dialog(s): ` +
                    dialogs.map((d) => `${d.type} ${JSON.stringify(d.message)}`).join("; "));
    }
    if (problems.length) throw new Error(`lane ${this.name}: ${problems.join("; ")}`);
  }

  /** closeProject, then delete the lane's copy of the install. For after(). */
  async close() {
    try {
      await this.closeProject();
    } finally {
      if (this.exe && existsSync(this.exe)) removeIdeCopy(this.exe);
      this.exe = null;
    }
  }
}
