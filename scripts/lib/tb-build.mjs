// Compile a packed .twinproj in the twinBASIC IDE and return what it said.
//
// This is the whole of `scripts/tbbuild.mjs` minus its command line, so a tool
// that builds many projects (check_examples, sweep_attributes) calls it directly
// and gets a result it does not have to parse: the diagnostics as an array, the
// files the compiler died parsing as an array, and the exit code tbbuild would
// have had. Starting `tbbuild` as a subprocess would mean every caller reading
// its JSON and stderr back with its own copy of the parse.
//
// What it does not do is what a caller owns:
//
//   * It never exits the process, and it throws only for a fault of its own
//     (an unexpected exception); a build that fails comes back as a result.
//   * It never tidies the registry. The IDE writes its project state as it
//     runs (not its settings or recent list: launchIde gives it IDE_FLAGS), and
//     `startTidy` / `finishTidy` (lib/tb-registry.mjs) put that back once EVERY
//     IDE of a run has gone; a call that tidied would do it in the middle of
//     the other lanes' builds.
//   * It does not check that the project or the IDE exists. The command line
//     refuses those with a usage error; a caller with a bad path gets code 3
//     after the timeout, exactly as tbbuild does. Nor does it read the project
//     file: the command line does, with checkProject (lib/tb-project.mjs), and a
//     caller that passes a file the IDE cannot read gets the deadline's answer,
//     which can be a clean compile with no rows. Every caller here packs its own
//     projects, which are always readable.
//
// It always ends its IDE before it returns, unless `keep` is set, or unless the
// IDE is a session's (tb-session.mjs), which opens project after project in one
// IDE and ends it itself. Node holds the IDE's launcher in a job of its own
// (launchIde), so an IDE also goes when the process does -- a run that is
// stopped leaves none of its lanes' IDEs behind.
//
// Concurrency: calls are independent and can run at once, each IDE on a slot (a private
// desktop, from tbbroker) and a DevTools port of its own, in different slots when the
// callers pass theirs. A caller that passes its slot with `keep` hands it to the kept IDE
// (`slot.handTo(result.idePid)`), so that the slot is held for as long as the IDE runs. It
// ends its IDE with shutdownIdeAsync, because shutdownIde's blocking wait
// (up to five seconds) would freeze every other call's CDP timers; whatever is
// thrown inside the IDE or CDP code from an event callback is the process's, not
// one call's, so a tool that runs many calls installs a handler through
// exitOnCrash's cleanup (see sweep_attributes.mjs's `salvage`).

import path from "node:path";
import {
  TARGETS,
  attachIde,
  buildProject,
  compileOutcome,
  launchIde,
  llvmLicence,
  setBuildTarget,
  shutdownIdeAsync,
  waitForCompile,
} from "./tb-ide.mjs";
import { buildTimeoutMessage, captureRun, checkCapture } from "./tb-run.mjs";
import { timing } from "./tb-timings.mjs";

/**
 * @param {object} o
 * @param {string} o.project   the packed .twinproj
 * @param {string} o.ide       twinBASIC.exe
 * @param {object} [o.slot]    the slot (leaseSlot in tb-ide.mjs) the caller holds, whose
 *   desktop the IDE goes on; by default the IDE gets one of its own (launchIde)
 * @param {number} [o.port]    DevTools port to start the IDE on; by default one Windows picks
 * @param {string} [o.arch]    win32 or win64 (default win32): the target to compile for
 * @param {number} [o.timeout] ms for the compile phase, from the project reported open
 *   to the compile settled (default waitForCompile's: test/harness.json's `compile`)
 * @param {boolean} [o.show]   on the user's desktop instead of a private one
 * @param {boolean} [o.keep]   leave the IDE running, and report its pid
 * @param {boolean} [o.build]  after a compile with no errors, build the project
 *   as the toolbar's Build button does. The project's settings decide what is
 *   built and how: the caller stages them (lib/tb-project.mjs), because a
 *   project opened in place has the template's build path, whose Save dialog
 *   a private desktop hides
 * @param {boolean} [o.llvm]   refuse a licence that does not compile user code
 *   with LLVM. It checks the licence and changes no setting; the project's
 *   own `compiler.buildOptions` is what asks for LLVM
 * @param {boolean} [o.followRun] whether the project has a [RunAfterBuild] Sub whose compile
 *   the build follows after the link (buildProject); unknown by default
 * @param {import("./tb-session.mjs").IdeSession} [o.session]  the IDE to open the project
 *   in, by a switch when it holds one already (tb-session.mjs), in place of a new IDE
 *   for this call; the session owns the IDE, so it is left running, and `slot`,
 *   `port`, `show` and `keep` are the session's business. A project opened by a
 *   switch that ends in a harness fault (2), or that the IDE never reported open (3),
 *   is built once more in a new IDE, and that result is the one returned: a reused
 *   IDE's fault is never reported as the project's. A compile that met its limit
 *   after the project opened is the project's (WinReg's batches meet it in a new IDE
 *   too), and is not built again
 * @param {number} [o.buildTimeout] ms for the build, from the press to its end (default:
 *   test/harness.json's `build`); with `run`, to [BUILD] Executing
 * @param {{done?: (lines: string[]) => boolean, runMs?: number, quietMs?: number} | null} [o.run]
 *   after a clean compile, build the project and run its [RunAfterBuild] Sub
 *   and capture what it writes (captureRun in lib/tb-run.mjs), in place of
 *   `build`'s own wait, which ends before the Sub's output has arrived. The
 *   Sub is expected to start with Debug.Cls. The capture is returned as `run`
 * @returns {Promise<{
 *   code: number, message: string, rows: string[], counts: number[], dialogs: string[],
 *   openedIn: string | null, arch: string, idePid: number | null, kept: boolean, crashFiles: string[],
 *   built: string | null, buildLog: string[],
 *   run?: {captured: string[], last: string, erased: string[], timedOut: boolean},
 * }>} `code` is tbbuild's exit code: 0 clean, 1 the project has errors, 2 the IDE
 *   could not be started or attached or the licence refuses LLVM, 3 the compile
 *   never settled (or met the `compile` limit), 4 the project crashes the
 *   compiler, 5 the build failed after a clean compile: a failure line, an LLVM
 *   refusal anywhere in the log (an exe linked or not), or the `build` limit
 *   (with `run`, also a Sub that failed code generation, or a failure a
 *   Debug.Cls erased after the run started). `message` is what tbbuild
 *   prints on stderr for 2 to 5 and is empty otherwise: for 5 the failing line
 *   of the log. `counts` is errors, warnings, hints, infos. `crashFiles` names,
 *   for 4, the files the compiler died parsing. `built` is the file a
 *   successful build wrote, and `buildLog` the console from the build's first
 *   line on. `how` is "cold" or, with a session, "switch"; `opened` is false when
 *   the IDE never reported the project open; `retried` is the message of a reused
 *   IDE's result that sent the project to a new IDE.
 */
export async function compileProject(o) {
  const r = await compileOnce(o);
  const reusedFault = r.code === 2 || (r.code === 3 && r.opened === false);
  if (!o.session || r.how !== "switch" || !reusedFault) return r;
  // session.after has ended that IDE, so this opens a new one.
  return { ...(await compileOnce(o)), retried: r.message };
}

async function compileOnce({
  project,
  ide,
  slot = null,
  port = null,
  arch = TARGETS[0],
  timeout,
  show = false,
  keep = false,
  build = false,
  llvm = false,
  buildTimeout,
  followRun,
  run = null,
  session = null,
}) {
  let handle = null;
  let c = null;
  // With a session: how the project was opened, and where this project's dialogs begin.
  let how = "cold";
  let dialogsFrom = 0;
  let ended = 2;
  const t0 = Date.now();
  const result = (code, fields = {}) => {
    ended = code;
    timing("project", {
      project: path.resolve(project),
      code,
      arch,
      llvm,
      build,
      run: !!run,
      how,
      ms: Date.now() - t0,
    });
    return outcomeOf(code, fields);
  };
  const outcomeOf = (code, fields) => ({
    code,
    message: "",
    rows: [],
    counts: [0, 0, 0, 0],
    dialogs: c ? c.dialogs.slice(dialogsFrom).map((d) => d.message) : [],
    openedIn: null,
    arch,
    idePid: handle?.pid ?? null,
    kept: keep,
    crashFiles: [],
    built: null,
    buildLog: [],
    how,
    ...fields,
  });
  try {
    if (session) {
      try {
        ({ c, handle, how } = await session.open(project));
      } catch (e) {
        return result(2, { message: e.message });
      }
      dialogsFrom = c.dialogs.length;
    } else {
      try {
        handle = await launchIde({ exe: ide, project, slot, port, show, keep });
      } catch (e) {
        return result(2, { message: e.message });
      }
      c = await attachIde(handle.port);
      if (!c) return result(2, { message: "the IDE never exposed a debug port" });
    }

    const waited = await waitForCompile(c, { project, timeout });
    let outcome = compileOutcome(waited, { name: project });
    if (!outcome.ok) {
      return result(outcome.code, {
        message: outcome.message,
        crashFiles: outcome.crashFiles ?? [],
        opened: waited.loaded,
      });
    }

    // Set on every run, win32 included, and what is reported is the compile under
    // it: see setBuildTarget. Switching restarts the compiler, which compiles the
    // project again, so a run that switches takes a few seconds longer.
    let openedIn;
    try {
      const target = await setBuildTarget(c, arch, { project, timeout });
      openedIn = target.from;
      if (target.waited) {
        outcome = compileOutcome(target.waited, { name: project });
        if (!outcome.ok)
          return result(outcome.code, { message: outcome.message, crashFiles: outcome.crashFiles ?? [] });
      }
    } catch (e) {
      return result(2, { message: e.message });
    }
    const found = { rows: outcome.rows, counts: outcome.counts, openedIn };

    // The licence is read once the compile has settled, which is when the IDE
    // knows it. A project that is to be built with LLVM on a licence that does
    // not compile user code with LLVM would build with the default compiler and
    // say nothing, so it is refused whatever the compile found.
    if (llvm) {
      const { refusal } = await llvmLicence(c);
      if (refusal) return result(2, { ...found, message: refusal });
    }
    if (outcome.counts[0] > 0) return result(1, found);

    // The IDE does not build a project it flags with errors, so a build is asked
    // of a clean compile only. A warning does not stop one.
    if (!build && !run) return result(0, found);
    // A run builds, and reads the console after the project's [RunAfterBuild]
    // Sub has run, which buildProject returns too early to see.
    if (run) {
      let capture;
      try {
        capture = await captureRun(c, { buildMs: buildTimeout, ...run });
      } catch (e) {
        return result(2, { ...found, message: e.message });
      }
      const { buildFailed, lost } = checkCapture(capture.captured, capture.erased);
      const failure = buildFailed ?? lost ?? buildTimeoutMessage(capture);
      if (failure !== undefined) {
        return result(5, { ...found, message: failure, buildLog: capture.captured, run: capture });
      }
      return result(0, { ...found, run: capture });
    }
    const built = await buildProject(c, { timeout: buildTimeout, followRun });
    if (!built.ok) return result(5, { ...found, message: built.message, buildLog: built.log });
    return result(0, { ...found, built: built.file, buildLog: built.log });
  } finally {
    if (session) {
      // The session's IDE: kept for the next project, recovered, or ended (IdeSession.after).
      await session.after(ended);
    } else {
      // A close that threw must not skip ending the IDE, or mask what was thrown.
      try {
        c?.close();
      } catch {
        /* the IDE is about to be ended */
      }
      if (!keep) await shutdownIdeAsync(handle);
    }
  }
}
