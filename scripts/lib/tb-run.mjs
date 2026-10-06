// Run the open project's [RunAfterBuild] Sub in an IDE and capture what it
// wrote to the DEBUG CONSOLE: the capture tbrun.mjs makes, as a function, so
// that check_examples' `check_run` batches make it the same way.
//
// The caller has attached a connection to an IDE whose project compiled clean.
// This presses the Build button, which runs the [RunAfterBuild] Sub once the exe
// is built, and reads the console until the run is over. tbrun.mjs's comment
// "seven things it gets right" says why each step is the way it is: the build
// button needs real pointer events, the console is read from its backing array
// and not the pane, and the Sub is expected to start with Debug.Cls, whose clear
// erases the IDE's build log and could erase a failure with it -- so each clear's
// erasure is kept (keepClears) and read back.

import { BUILD_FAILED, pressBuild } from "./tb-ide.mjs";
import { keepClears, keptClears, readConsole } from "./tb-ide-console.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The console's text as lines: blank lines trimmed off both ends, and nothing
 * else done. Reading the backing array rather than the pane means the header,
 * the `>` input prompt and the timestamp column never arrive in the first place.
 * Given `raw`, the same console read with its timestamps, it returns the same
 * entries from that instead, since a line holding a timestamp is never blank.
 */
export function strip(text, raw = null) {
  if (!text) return [];
  const lines = (s) => s.split("\n").map((l) => l.replace(/\r$/, ""));
  const out = lines(text);
  let from = 0,
    to = out.length;
  while (from < to && !out[from].trim()) from++;
  while (to > from && !out[to - 1].trim()) to--;
  return (raw === null ? out : lines(raw)).slice(from, to);
}

/**
 * Press Build and read the console until the run is over.
 *
 * The run is over when `done(lines)` says so, when the console has stopped
 * changing for `quietMs` after the first line, or at `timeoutMs`. A caller whose
 * Sub ends with a marker line passes a `done` that looks for it; one that cannot
 * says `() => false` and relies on the quiet period.
 *
 * It throws, with a message that says why, when the IDE has no
 * `clearDebugConsole()` to wrap or no console to read, or the Build button
 * cannot be pressed, or the page no longer holds what the clears erased.
 *
 * @param {object} c  a tb-cdp connection, the project compiled clean
 * @param {object} o
 * @param {(lines: string[]) => boolean} [o.done]
 * @param {number} o.quietMs
 * @param {number} o.timeoutMs
 * @returns {Promise<{captured: string[], last: string, erased: string[], timedOut: boolean}>}
 *   `captured` is the console after the run; `last` the same, unsplit; `erased`
 *   every line a clear removed, oldest first; `timedOut` is true when the wait
 *   ended at `timeoutMs`
 */
export async function captureRun(c, { done = () => false, quietMs, timeoutMs }) {
  // Keep what each clear erases, for the check after the run.
  if (!(await keepClears(c))) {
    throw new Error(
      "no clearDebugConsole() in this IDE -- a probe's Debug.Cls could erase a " +
        "failure unseen. Refusing rather than returning what it left as complete.",
    );
  }
  // A real press/release pair; element.click() is ignored.
  await pressBuild(c);

  const started = Date.now();
  let last = "",
    lastChange = Date.now(),
    seen = false,
    timedOut = true;
  while (Date.now() - started < timeoutMs) {
    await sleep(400);
    const now = await readConsole(c);
    if (now === null) {
      throw new Error(
        "no debugConsoleContent.dataNodes in this IDE -- the DEBUG CONSOLE " +
          "was never created, or this build moved it. Refusing rather than " +
          "falling back to scraping the pane, which silently truncates.",
      );
    }
    if (now !== last) {
      last = now;
      lastChange = Date.now();
      const lines = strip(now);
      if (lines.length) seen = true;
      if (done(lines)) {
        timedOut = false;
        break;
      }
    } else if (seen && Date.now() - lastChange > quietMs) {
      timedOut = false;
      break;
    }
  }
  const captured = strip(last);
  const kept = await keptClears(c);
  if (!kept) {
    throw new Error(
      "the IDE page no longer holds what the DEBUG CONSOLE's clears erased, so " +
        "a failure they erased cannot be ruled out",
    );
  }
  return { captured, last, erased: kept.flatMap((text) => text.split("\n")), timedOut };
}

/**
 * What a capture says about the build and the start of the run, apart from the
 * Sub's own output.
 *
 * A build that fails after a clean compile never runs the Sub, and leaves the
 * IDE's own build log in the console: the Sub's first statement is Debug.Cls,
 * which would have erased it, so its survival means the capture is not the
 * Sub's output. A [RunAfterBuild] Sub that fails code generation leaves the log
 * too: the build succeeds, and then nothing in the Sub runs. A procedure the Sub
 * calls that fails code generation is reported straight after the "[BUILD]
 * Executing '<project>.<module>.<Sub>'..." line, before the Sub's first
 * statement, so its Debug.Cls erases the report and the Sub stops where it calls
 * that procedure (measured, BETA 983). A failure line among what the clears
 * erased counts only after the last Executing line: before it is the build's own
 * log, which ended in success or the Sub would not have run.
 *
 * @param {string[]} captured  from captureRun
 * @param {string[]} erased    from captureRun
 * @returns {{started: number, buildFailed: string | undefined, lost: string | undefined}}
 *   `started` is the index in `erased` of the last Executing line, or -1;
 *   `buildFailed` the first failure line left in the console; `lost` the first
 *   failure line a clear erased after the run started
 */
export function checkCapture(captured, erased) {
  const started = erased.findLastIndex((l) => /^\[BUILD\] Executing '/.test(l));
  return {
    started,
    buildFailed: captured.find((l) => BUILD_FAILED.test(l)),
    lost: started < 0 ? undefined : erased.slice(started + 1).find((l) => BUILD_FAILED.test(l)),
  };
}
