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
import { attachIde, compileOutcome, launchIde, readCrash, shutdownIde, summaryLine,
         waitForCompile } from "./tb-ide.mjs";
import { compilerExe, runCompiler } from "./tb-install.mjs";
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
    this.builds = 0;
  }

  // The lane's copy of the install, made the first time anything needs it. A
  // lane never starts the install itself: its compiler would load the add-ins
  // in the install's own addins folders.
  copy() {
    if (!this.exe) this.exe = makeIdeCopy({ ide: this.ide, dest: path.join(this.work, "ide") });
    return this.exe;
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
   * Build an add-in from its exported tree and put it in the copy's
   * addins\win32, so that every IDE the lane opens after this loads it.
   *
   * @returns {Promise<{dll: string, arch: string, diagnostics: string[], log: string[]}>}
   *   buildAddin's result; it throws, with an exitCode, when the add-in does not build
   */
  async addAddin(src) {
    if (this.run) throw new Error(`lane ${this.name}: close the open project before building an add-in`);
    const exe = this.copy();
    const built = await buildAddin({ ide: exe, src, work: path.join(this.work, `addin${++this.builds}`),
                                     port: this.port, show: this.show });
    addAddin(exe, built.dll, "win32");
    return built;
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
   * @param {string} src        an exported tree: the folder holding Settings and Sources
   * @param {object} [o]
   * @param {number} [o.timeout]  milliseconds for the compile to settle (default 180000)
   * @returns {Promise<object>} the connection (attachIde's), which the tb-operate.mjs calls take
   */
  async open(src, { timeout = 180 * 1000 } = {}) {
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
    this.run = await launchIde({ exe, project, port: this.port, show: this.show });
    this.c = await attachIde(this.port);
    if (!this.c) throw new Error(`lane ${this.name}: the IDE never exposed a debug port`);
    const outcome = compileOutcome(await waitForCompile(this.c, { project, timeout }), { name: project });
    if (!outcome.ok) throw new Error(`lane ${this.name}: ${outcome.message}`);
    if (outcome.counts[0] > 0) {
      throw new Error(`lane ${this.name}: ${src} does not compile\n` +
                      [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
    }
    return this.c;
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
        crash = await readCrash(c).catch(() => null);
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
