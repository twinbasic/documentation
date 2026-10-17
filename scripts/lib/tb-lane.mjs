// One lane of the add-in test runner, as the scenario file running in it sees
// it. WIP.HelpAddin.md, Stage 1 item 7.
//
// scripts/addin_test.mjs runs every scenario file in a node:test process of
// its own, and hands it its lane in TB_ADDIN_LANE: a slot from tbbroker (a
// private desktop, and the number its project ids are keyed to; the runner holds
// it for as long as the process runs), a work folder inside the temp folder, and
// the install to copy. Each IDE's DevTools port is one Windows picks (launchIde),
// so `lane.port` is the open IDE's. A lane made outside the runner leases a slot
// of its own the first time it needs one, and gives it back on close(). The lane makes its
// own copy of that install (tb-ide-copy.mjs), builds the add-ins its scenarios
// test into the copy's addins\win32, and opens projects in the copy, one IDE at
// a time. The runner owns the registry for the whole run and puts it back once
// every lane has ended; a lane never tidies.
//
// Every IDE a lane starts has an APPDATA of its own, <work>\appdata. The
// compiler also loads the add-ins in %APPDATA%\twinBASIC\addins\<arch>, as the
// IDE's environment expands %APPDATA% (P6 in WIP.HelpAddin.md), so without it
// every add-in the user keeps there would load into every test IDE. The lane
// checks each IDE's add-ins folder (checkAddinsRoot in tb-ide-addins.mjs) rather than
// trusting that it did.
//
// A scenario file gets its lane through scenario() in test/addin/scenario.mjs,
// which shows the outline of one. Outside the runner addinLane() returns null
// and the scenario is skipped, so a bare `node --test` never starts an IDE.
//
// Every IDE a runner's lane opens has a page of PAGE, 1600 by 1000 CSS pixels,
// from the moment the lane attaches to it, whatever the window's size. The IDE
// opens its window at the geometry the user's own IDE last left in the registry
// (the Window key, which the harness puts back but never sets), so without it
// the page is whatever the user's window makes it: 800 by 600 for a 1200 by
// 900 window at 150%, where a tool window floats over the toolbar's buttons and
// most of the code editor, which the scenarios click and hover, and a scenario
// passes on one machine and fails on another. A lane in lanes.mjs can name
// another size with `page` (null for the window's own), and Lane.open takes one
// for a single IDE; fixPageSize changes it while the IDE is open. A Lane made
// outside the runner (try_help_addin, shoot_docs) leaves the page alone unless
// it is given a `page`.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { buildAddin } from "./tb-addin.mjs";
import { addAddin, makeIdeCopy, removeIdeCopy } from "./tb-ide-copy.mjs";
import {
  attachIde,
  awaitCrashName,
  compileOutcome,
  compilerPid,
  launchIde,
  leaseSlot,
  readCrash,
  setBuildTarget,
  shutdownIdeAsync,
  summaryLine,
  waitForCompile,
} from "./tb-ide.mjs";
import { checkAddinsRoot } from "./tb-ide-addins.mjs";
import { restartCompiler } from "./tb-operate.mjs";
import { laneProjectId, stageProject, unpackProject } from "./tb-project.mjs";

/** The environment variable the runner hands a lane to its scenario file in. */
export const LANE_ENV = "TB_ADDIN_LANE";

/** The size a runner's lane gives each IDE's page, in CSS pixels (see the top of this file). */
export const PAGE = Object.freeze({ width: 1600, height: 1000 });

/**
 * Give the IDE's page `size`, whatever the window's size, at the display's own
 * density (Emulation.setDeviceMetricsOverride with deviceScaleFactor 0). A tool
 * window first shown after this is centred in it. The size holds until it is
 * changed again or the connection closes.
 *
 * @param {object} c  the connection, Lane.open's
 * @param {{ width: number, height: number }} [size]  PAGE by default
 */
export const fixPageSize = (c, size = PAGE) =>
  c.send("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 0, mobile: false });

/** The lane this process runs in, or null outside the runner. Its page is PAGE unless the runner names another. */
export function addinLane() {
  const raw = process.env[LANE_ENV];
  return raw ? new Lane({ page: PAGE, ...JSON.parse(raw) }) : null;
}

export class Lane {
  /**
   * @param {object} o
   * @param {string} o.name     the lane's name, for messages
   * @param {number} [o.slot]   its slot's number, when the runner holds the slot for it
   * @param {string} [o.desktop]  that slot's desktop
   * @param {string} o.work     its work folder, inside the temp folder
   * @param {string} o.ide      the install's twinBASIC.exe, which the lane copies
   * @param {boolean} [o.show]  IDEs on the user's desktop instead of a private one
   * @param {string} [o.browserArgs]  more WebView2 browser arguments for every IDE
   *   the lane opens, as launchIde takes them
   * @param {{ width: number, height: number } | null} [o.page]  the size each IDE's
   *   page is given as the lane attaches to it (fixPageSize); null, the default,
   *   leaves the window's own. addinLane gives a runner's lane PAGE
   */
  constructor({ name, slot = null, desktop = null, work, ide, show = false, browserArgs = "", page = null }) {
    Object.assign(this, { name, slot, desktop, work, ide, show, browserArgs, page });
    this.port = null; // the open IDE's DevTools port
    this.lease = null; // the slot, as launchIde takes it (leased())
    this.exe = null; // the lane's copy of the install, made on first use
    this.run = null; // the open IDE, from launchIde
    this.c = null; // the connection to it
    this.src = null; // the tree it has open, and the .twinproj staged from it
    this.project = null;
    this.builds = 0;
    // The APPDATA every IDE of the lane is started with; the IDE makes
    // twinBASIC\{addins\win32,addins\win64,packages,themes,locale} in it.
    this.appdata = path.join(work, "appdata");
  }

  // The lane's slot: the runner's, or one leased the first time an IDE needs it,
  // held until close().
  async leased() {
    if (!this.lease) {
      const none = async () => {};
      this.lease = this.slot
        ? { slot: this.slot, desktop: this.desktop, port: 0, handTo: none, release: none }
        : await leaseSlot({ tag: `lane ${this.name}` });
      this.slot = this.lease.slot;
      this.desktop = this.lease.desktop;
    }
    return this.lease;
  }

  // The lane's copy of the install, made the first time anything needs it. A
  // lane never starts the install itself: its compiler would load the add-ins
  // in the install's own addins folders.
  copy() {
    if (!this.exe) this.exe = makeIdeCopy({ ide: this.ide, dest: path.join(this.work, "ide") });
    return this.exe;
  }

  // The install's projects folder -- New Project's templates and the samples,
  // which makeIdeCopy leaves out (29 MB) -- copied into the lane's copy, for an
  // IDE that is to show them.
  includeProjects() {
    const dest = path.join(path.dirname(this.copy()), "projects");
    if (!existsSync(dest))
      cpSync(path.join(path.dirname(path.resolve(this.ide)), "projects"), dest, { recursive: true });
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
    // The folder is the lane's own, and removed first, since unpackProject
    // refuses a folder that holds files the project does not.
    rmSync(out, { recursive: true, force: true });
    try {
      unpackProject(path.join(dir, files[0]), out);
    } catch (e) {
      throw new Error(`exporting ${sample} failed:\n${e.message}`);
    }
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
   * @param {boolean} [o.show]  build on the user's desktop; by default where the
   *   lane opens its IDEs
   * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
   *   buildAddin's result; it throws, with an exitCode, when the add-in does not build
   */
  async buildAddin(src, { arch = "win32", show = this.show } = {}) {
    if (this.run) throw new Error(`lane ${this.name}: close the open project before building an add-in`);
    return buildAddin({
      ide: this.copy(),
      src,
      work: path.join(this.work, `addin${++this.builds}`),
      slot: await this.leased(),
      arch,
      show,
      appdata: this.appdataDir(),
    });
  }

  /**
   * Build an add-in from its exported tree and put it in the copy's
   * addins\<arch>, so that every IDE the lane opens after this with a compiler
   * of that bitness loads it.
   *
   * @param {string} src
   * @param {object} [o]
   * @param {string} [o.arch]  as for buildAddin
   * @param {boolean} [o.show]  as for buildAddin
   * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
   *   as buildAddin
   */
  async addAddin(src, { arch = "win32", show = this.show } = {}) {
    const built = await this.buildAddin(src, { arch, show });
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
   * desktop. Refuses a project that does not compile, since a scenario on it
   * would be testing something else.
   *
   * The IDE is started with the lane's own APPDATA (see the top of this file),
   * and refused afterwards if it did not load its add-ins from there.
   *
   * @param {string} src        an exported tree: the folder holding Settings and Sources
   * @param {object} [o]
   * @param {number} [o.timeout]  milliseconds for the compile phase (default waitForCompile's: test/harness.json's compile)
   * @param {object} [o.env]      extra environment for the IDE, as launchIde takes it.
   *                              An add-in reads it with Environ$, since it runs in the
   *                              compiler's process, which the IDE starts (P10)
   * @param {string} [o.folder]   the folder the .twinproj is staged in (default the work
   *                              folder); give a folder of its own to a scenario that
   *                              writes into the project's folder
   * @param {string} [o.buildPath]  the project's build path (default <work>\out\<name>.exe),
   *                              for a build whose output path is shown
   * @param {string[]} [o.flags]  the IDE's command-line flags, as launchIde takes them
   *                              (default IDE_FLAGS)
   * @param {{ width: number, height: number } | null} [o.page]  the page's size for this
   *                              IDE (default the lane's `page`); null leaves the window's own
   * @returns {Promise<object>} the connection (attachIde's), which the tb-operate.mjs calls take
   */
  async open(src, { timeout, env = {}, folder = this.work, buildPath = null, flags, page = this.page } = {}) {
    if (this.run) throw new Error(`lane ${this.name} has a project open already: one IDE at a time`);
    const exe = this.copy();
    const slot = await this.leased();
    mkdirSync(folder, { recursive: true });
    const project = path.join(folder, "project.twinproj");
    stageProject({
      src,
      stage: path.join(this.work, "project-src"),
      project,
      settings: (original) => ({
        "project.buildPath": buildPath ?? path.join(this.work, "out", `${original["project.name"]}.exe`),
        "project.id": laneProjectId(2, slot.slot),
      }),
    });
    const appdata = this.appdataDir();
    this.run = await launchIde({
      exe,
      project,
      slot,
      show: this.show,
      env: { APPDATA: appdata, ...env },
      browserArgs: this.browserArgs,
      flags,
    });
    Object.assign(this, { src, project, port: this.run.port });
    this.c = await attachIde(this.port);
    if (!this.c) throw new Error(`lane ${this.name}: the IDE never exposed a debug port`);
    if (page) await fixPageSize(this.c, page);
    this.checkCompile(await waitForCompile(this.c, { project, timeout }), src);
    // Checked against whatever APPDATA the IDE was given: `env` can name another.
    const given = "APPDATA" in env ? env.APPDATA : appdata;
    if (typeof given === "string") {
      await checkAddinsRoot(this.c, given).catch((e) => {
        throw new Error(`lane ${this.name}: ${e.message}`);
      });
    }
    return this.c;
  }

  /**
   * Start the lane's copy with no project, as from its icon: the splash, then
   * the New / Open Project dialog, every menu in its no-project state. There is
   * no compile to wait for; the caller waits for what it needs.
   *
   * @param {object} [o]
   * @param {object} [o.env]  extra environment for the IDE, as for open
   * @param {{ width: number, height: number } | null} [o.page]  as for open
   * @returns {Promise<object>} the connection (attachIde's)
   */
  async openNoProject({ env = {}, page = this.page } = {}) {
    if (this.run) throw new Error(`lane ${this.name} has an IDE open already: one IDE at a time`);
    const exe = this.copy();
    this.run = await launchIde({
      exe,
      slot: await this.leased(),
      show: this.show,
      env: { APPDATA: this.appdataDir(), ...env },
      browserArgs: this.browserArgs,
    });
    Object.assign(this, { src: null, project: null, port: this.run.port });
    this.c = await attachIde(this.port);
    if (!this.c) throw new Error(`lane ${this.name}: the IDE never exposed a debug port`);
    if (page) await fixPageSize(this.c, page);
    return this.c;
  }

  // Throw unless what waitForCompile saw is a compile that settled with no
  // errors: a scenario on a project that does not compile would be testing
  // something else.
  checkCompile(waited, what) {
    const outcome = compileOutcome(waited, { name: this.project });
    if (!outcome.ok) throw new Error(`lane ${this.name}: ${outcome.message}`);
    if (outcome.counts[0] > 0) {
      throw new Error(
        `lane ${this.name}: ${what} does not compile\n` + [...outcome.rows, summaryLine(outcome.counts)].join("\n"),
      );
    }
  }

  /**
   * Restart the open IDE's compiler with the toolbar's button (restartCompiler
   * in tb-operate.mjs), and wait for the new one to compile the project. The
   * new compiler loads the add-ins from their folders again (P9).
   *
   * @returns {Promise<number>} the new compiler's process id
   */
  async restartCompiler({ timeout } = {}) {
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
   * target for the project's path, which an IDE started with IDE_FLAGS does not
   * save.
   *
   * @returns {Promise<number>} the process id of the compiler now running
   */
  async setBuildTarget(arch, { timeout } = {}) {
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
    let crash = null,
      dialogs = [];
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
      // not shutdownIde: its taskkill and its wait stop the process for a lane that
      // is not the only thing the process runs (shoot_docs runs several)
      await shutdownIdeAsync(run);
    }
    const problems = [];
    if (crash)
      problems.push(
        `the compiler crashed ${crash.n}x` + (crash.files?.length ? `, parsing ${crash.files.join(", ")}` : ""),
      );
    if (dialogs.length) {
      problems.push(
        `the IDE opened ${dialogs.length} javascript dialog(s): ` +
          dialogs.map((d) => `${d.type} ${JSON.stringify(d.message)}`).join("; "),
      );
    }
    if (problems.length) throw new Error(`lane ${this.name}: ${problems.join("; ")}`);
  }

  /** closeProject, then delete the lane's copy of the install and give back a slot of its own. For scenario(). */
  async close() {
    try {
      await this.closeProject();
    } finally {
      if (this.exe && existsSync(this.exe)) removeIdeCopy(this.exe);
      this.exe = null;
      await this.lease?.release();
      this.lease = null;
    }
  }
}
