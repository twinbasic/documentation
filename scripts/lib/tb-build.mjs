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
//   * It never tidies the registry. The IDE writes its recent list and project
//     state as it runs, and `startTidy` / `finishTidy` (lib/tb-registry.mjs)
//     put them back once EVERY IDE of a run has gone; a call that tidied would
//     do it in the middle of the other lanes' builds.
//   * It does not check that the project or the IDE exists. The command line
//     refuses those with a usage error; a caller with a bad path gets code 3
//     after the timeout, exactly as tbbuild does.
//
// It always ends its IDE before it returns, unless `keep` is set. Node holds the
// IDE's launcher in a job of its own (launchIde), so an IDE also goes when the
// process does -- a run that is stopped leaves none of its lanes' IDEs behind.
//
// Concurrency: calls on different ports are independent and can run at once. It
// ends its IDE with shutdownIdeAsync, because shutdownIde's blocking wait
// (up to five seconds) would freeze every other call's CDP timers; whatever is
// thrown inside the IDE or CDP code from an event callback is the process's, not
// one call's, so a tool that runs many calls installs a handler through
// exitOnCrash's cleanup (see sweep_attributes.mjs's `salvage`).

import { COMPILE_TIMEOUT, TARGETS, attachIde, compileOutcome, launchIde, setBuildTarget, shutdownIdeAsync,
         waitForCompile } from "./tb-ide.mjs";

/**
 * @param {object} o
 * @param {string} o.project   the packed .twinproj
 * @param {string} o.ide       twinBASIC.exe
 * @param {number} [o.port]    DevTools port to start the IDE on (default 9333)
 * @param {string} [o.arch]    win32 or win64 (default win32): the target to compile for
 * @param {number} [o.timeout] ms to wait for the compile (default COMPILE_TIMEOUT)
 * @param {boolean} [o.show]   on the user's desktop instead of a private one
 * @param {boolean} [o.keep]   leave the IDE running, and report its pid
 * @returns {Promise<{
 *   code: number, message: string, rows: string[], counts: number[], dialogs: string[],
 *   openedIn: string | null, arch: string, idePid: number | null, kept: boolean, crashFiles: string[],
 * }>} `code` is tbbuild's exit code: 0 clean, 1 the project has errors, 2 the IDE
 *   could not be started or attached, 3 the compile never settled, 4 the project
 *   crashes the compiler. `message` is what tbbuild prints on stderr for 2, 3
 *   and 4 and is empty otherwise. `counts` is errors, warnings, hints, infos.
 *   `crashFiles` names, for 4, the files the compiler died parsing.
 */
export async function compileProject({ project, ide, port = 9333, arch = TARGETS[0], timeout = COMPILE_TIMEOUT,
                                     show = false, keep = false }) {
  let handle = null;
  let c = null;
  const result = (code, fields = {}) => ({
    code, message: "", rows: [], counts: [0, 0, 0, 0], dialogs: c ? c.dialogs.map((d) => d.message) : [],
    openedIn: null, arch, idePid: handle?.pid ?? null, kept: keep, crashFiles: [], ...fields,
  });
  try {
    try {
      handle = await launchIde({ exe: ide, project, port, show, keep });
    } catch (e) {
      return result(2, { message: e.message });
    }
    c = await attachIde(port);
    if (!c) return result(2, { message: "the IDE never exposed a debug port" });

    let outcome = compileOutcome(await waitForCompile(c, { project, timeout }), { name: project });
    if (!outcome.ok) return result(outcome.code, { message: outcome.message, crashFiles: outcome.crashFiles ?? [] });

    // Set on every run, win32 included, and what is reported is the compile under
    // it: see setBuildTarget. Switching restarts the compiler, which compiles the
    // project again, so a run that switches takes a few seconds longer.
    let openedIn;
    try {
      const target = await setBuildTarget(c, arch, { project, timeout });
      openedIn = target.from;
      if (target.waited) {
        outcome = compileOutcome(target.waited, { name: project });
        if (!outcome.ok) return result(outcome.code, { message: outcome.message, crashFiles: outcome.crashFiles ?? [] });
      }
    } catch (e) {
      return result(2, { message: e.message });
    }
    return result(outcome.counts[0] > 0 ? 1 : 0, { rows: outcome.rows, counts: outcome.counts, openedIn });
  } finally {
    // A close that threw must not skip ending the IDE, or mask what was thrown.
    try { c?.close(); } catch { /* the IDE is about to be ended */ }
    if (!keep) await shutdownIdeAsync(handle);
  }
}
