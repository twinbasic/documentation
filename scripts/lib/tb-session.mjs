// One IDE for many projects: the first is opened as the IDE starts, and each
// later one through the page's own File > Open Project, so a tool that compiles
// project after project pays an IDE start once rather than once a project.
//
// The switch is the page's `openProject()`, with `hostAppObject` replaced for
// that one call by an object whose OpenProject answers with the path: the real
// one opens a native file dialog, which nobody can answer on a private desktop.
// openProject() then runs `closeProjectSafely`, which ends the old project's
// compiler and loads the new project in a new one. Calling `root.loadProject`
// over CDP is NOT a switch: it skips the close, and the tree keeps the old
// project (WIP.Harness.md, "One project per IDE"). Nothing here enables CDP's
// Debugger domain either: the page holds about 90 `debugger;` statements.
//
// What a reused IDE carries from one project to the next, and what this undoes
// before each switch (BETA 1010, each measured):
//
//   * Safe Mode. A compiler crash loop sets the build box to `nocompile`, and
//     the page's loadProject keeps that target: every project opened after it
//     reads as a crash. The remedy (owner): close the project, set the box to
//     win32 with no project open, then open the next one. A project that put the
//     IDE into Safe Mode is never opened again in that IDE (it crashes back into
//     it); a bisect half is another project and may be.
//   * TRACE-MODE. Any NATIVE EXCEPTION turns on `g_TraceMode` for the IDE's
//     session, and each new compiler starts with it, so a later crash prints a
//     thread dump where a fresh IDE prints two "[IDE] auto-activated TRACE-MODE"
//     lines. It is set back to false, which is the Help menu's toggle without
//     its restart (the switch restarts the compiler).
//   * A changed project's "Save now?" box, which closeProjectSafely opens; it is
//     answered Discard Changes. No harness project is edited, so it is not
//     expected.
//
// The harness's own state on the page and the connection is reset by its
// owners: keepClears starts a new record on each call (tb-ide-console.mjs), and
// compileProject reads `c.dialogs` from a mark it takes after the switch.
//
// A reused IDE is given up, and the next project starts a new one, when a
// switch fails (the page does not answer, the IDE has ended, openProject() did
// not ask for a path), and after a project that ended in a harness fault (2) or
// a compile that never settled (3). compileProject builds such a project once
// more in a new IDE before it believes the result. A compiler crash (4) is
// recovered in place: the project is closed and the box set back to win32.
//
// The decisions are written against a driver, so that the probes can drive a
// session through a page that is a plain object (test/example-batches.test.mjs).

import { attachIde, launchIde, shutdownIdeAsync, sleep } from "./tb-ide.mjs";
import { click } from "./tb-click.mjs";
import { timing } from "./tb-timings.mjs";

// What a switch needs to know about the page, in one evaluate.
const STATE_JS = `JSON.stringify({
  p: typeof projectFilePath === "undefined" ? null : projectFilePath || null,
  closing: typeof isClosingProject !== "undefined" && !!isClosingProject,
  dirty: typeof projectIsDirty !== "undefined" && !!projectIsDirty,
  target: typeof buildConfigSelector !== "undefined" && buildConfigSelector ? buildConfigSelector.value : null,
  trace: typeof g_TraceMode !== "undefined" && g_TraceMode === true,
})`;

// openProject() with the host's file dialog answered by `path`. openProject asks
// for the path synchronously, as its first act, so hostAppObject is the real one
// again before this evaluate returns. `asked` is how many times it asked: 0 means
// this IDE has no such path, and the switch did nothing.
const switchJs = (path) => `(() => {
  if (typeof openProject !== "function" || typeof hostAppObject === "undefined") return JSON.stringify({ asked: 0 });
  const dirty = typeof projectIsDirty !== "undefined" && !!projectIsDirty;
  const real = hostAppObject;
  let asked = 0;
  hostAppObject = { OpenProject: () => { asked++; return Promise.resolve(${JSON.stringify(path)}); } };
  try { openProject(); } finally { hostAppObject = real; }
  return JSON.stringify({ asked: asked, dirty: dirty });
})()`;

// The modal box closeProjectSafely opens for a changed project.
const DISCARD = { css: ".modalDialogContainer .msgBoxButton", text: "Discard Changes", last: true };

/** The real IDE, for a session that is not a probe's. */
export const IDE_DRIVER = {
  launch: (o) => launchIde(o),
  attach: (port) => attachIde(port),
  shutdown: (handle) => shutdownIdeAsync(handle),
  alive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  },
  state: async (c) => JSON.parse(await c.evaluate(STATE_JS)),
  switchTo: async (c, project) => JSON.parse(await c.evaluate(switchJs(project))),
  closeProject: (c) =>
    c.evaluate(`typeof executeIdeCommand === "function" ? executeIdeCommand("tbProject_Close") : closeProjectSafely()`),
  resetTarget: (c) =>
    c.evaluate(`cancelAllModalDialogs(); buildConfigSelector.value = "win32"; buildConfigSelector.onchange()`),
  traceOff: (c) => c.evaluate("g_TraceMode = false"),
  discard: (c) => click(c, DISCARD),
  sleep,
};

// How long a close may take before the IDE is given up: measured at 0.22 to 0.34 s.
const CLOSE_MS = 10 * 1000;

export class IdeSession {
  /**
   * @param {object} o
   * @param {string} o.ide          twinBASIC.exe
   * @param {object} [o.slot]       the slot (leaseSlot) every IDE of the session goes on
   * @param {boolean} [o.show]      on the user's desktop instead of a private one
   * @param {boolean} [o.fresh]     a new IDE for every project: the session only launches and ends
   * @param {(line: string) => void} [o.note]  says why an IDE was given up
   * @param {object} [o.driver]     IDE_DRIVER, or a probe's
   */
  constructor({ ide, slot = null, show = false, fresh = false, note = () => {}, driver = IDE_DRIVER }) {
    Object.assign(this, { ide, slot, show, fresh, note, driver });
    this.handle = null;
    this.c = null;
    // Counts, for a run's summary: IDEs started, and projects opened by a switch.
    this.starts = 0;
    this.switches = 0;
  }

  get live() {
    return this.handle !== null;
  }

  /**
   * Open `project`: in a new IDE, or by a switch in the one the session holds.
   * @returns {Promise<{c: object, handle: object, how: "cold" | "switch"}>}
   * @throws {Error} when a new IDE cannot be started or attached, with the message compileProject reports as exit 2
   */
  async open(project) {
    if (this.live && this.fresh) await this.end();
    if (!this.live) return this.#cold(project);
    if (!this.driver.alive(this.handle.pid)) {
      await this.end("the IDE has ended");
      return this.#cold(project);
    }
    const t0 = Date.now();
    let reset = {};
    try {
      reset = await this.#reset();
      const r = await this.driver.switchTo(this.c, project);
      if (!r.asked) throw new Error("openProject() did not ask for a path");
      if (r.dirty) await this.driver.discard(this.c);
      this.switches++;
      timing("switch", { project, ms: Date.now() - t0, dirty: !!r.dirty, ...reset });
      return { c: this.c, handle: this.handle, how: "switch" };
    } catch (e) {
      await this.end(`a switch failed (${e.message})`);
      return this.#cold(project);
    }
  }

  /**
   * What the project's result means for the IDE: given up after a harness fault
   * or a compile that never settled, recovered in place after a compiler crash,
   * kept otherwise. Never throws.
   * @param {number} code  compileProject's
   */
  async after(code) {
    if (!this.live) return;
    if (this.fresh) return this.end();
    if (code === 2 || code === 3) return this.end(`its last project ended with exit ${code}`);
    if (code !== 4) return;
    // The crashed project is closed now, so that its compiler stops restarting,
    // and is never opened again in this IDE.
    try {
      await this.#close();
      await this.#reset();
    } catch (e) {
      await this.end(`the crashed project did not close (${e.message})`);
    }
  }

  /** End the IDE, by its pid; the next open starts a new one. Never throws. */
  async end(why = "") {
    const { handle, c } = this;
    this.handle = null;
    this.c = null;
    if (!handle) return;
    if (why) this.note(`  starting a new IDE: ${why}`);
    try {
      c?.close();
    } catch {
      /* the IDE is about to be ended */
    }
    try {
      await this.driver.shutdown(handle);
    } catch {
      /* gone already */
    }
  }

  async #cold(project) {
    const handle = await this.driver.launch({ exe: this.ide, project, slot: this.slot, show: this.show });
    const c = await this.driver.attach(handle.port);
    if (!c) {
      await this.driver.shutdown(handle);
      throw new Error("the IDE never exposed a debug port");
    }
    this.handle = handle;
    this.c = c;
    this.starts++;
    return { c, handle, how: "cold" };
  }

  // Close the project the page holds, and wait for the close to finish.
  async #close() {
    let s = await this.driver.state(this.c);
    if (!s.p) return;
    await this.driver.closeProject(this.c);
    if (s.dirty) await this.driver.discard(this.c);
    const until = Date.now() + CLOSE_MS;
    for (;;) {
      s = await this.driver.state(this.c);
      if (!s.p && !s.closing) return;
      if (Date.now() > until) throw new Error(`the project was still open ${CLOSE_MS / 1000} s after File > Close`);
      await this.driver.sleep(100);
    }
  }

  // Undo what a project leaves in the page: Safe Mode and TRACE-MODE.
  async #reset() {
    const s = await this.driver.state(this.c);
    const out = { safeMode: s.target === "nocompile", trace: s.trace };
    if (out.safeMode) {
      await this.#close();
      await this.driver.resetTarget(this.c);
    }
    if (s.trace) await this.driver.traceOff(this.c);
    return out;
  }
}
