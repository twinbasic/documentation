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

import { secondsText, timeoutMs } from "./harness-settings.mjs";
import { BUILD_FAILED, LLVM_REFUSAL, pressBuild } from "./tb-ide.mjs";
import { keepClears, keptClears, readConsole } from "./tb-ide-console.mjs";
import { timing, timingsOn } from "./tb-timings.mjs";

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
 * Three limits, each a phase of test/harness.md. The build runs from the press
 * to `[BUILD] Executing '...'`, within `buildMs`; a build that writes a failure
 * line and no Executing line ends two seconds after it. From Executing the run
 * is over when `done(lines)` says so, when the console has not changed for
 * `quietMs` counted from the later of Executing and its last change (a run that
 * prints nothing ends too), or at `runMs` after Executing. A caller whose Sub
 * ends with a marker line passes a `done` that looks for it; one that cannot
 * says `() => false` and relies on the quiet period.
 *
 * It throws, with a message that says why, when the IDE has no
 * `clearDebugConsole()` to wrap or no console to read, or the Build button
 * cannot be pressed, or the page no longer holds what the clears erased.
 *
 * @param {object} c  a tb-cdp connection, the project compiled clean
 * @param {object} [o]
 * @param {(lines: string[]) => boolean} [o.done]
 * @param {number} [o.buildMs]  default: test/harness.json's `build` (TB_BUILD_TIMEOUT)
 * @param {number} [o.runMs]    default: its `compilerRun` (TB_COMPILER_RUN_TIMEOUT)
 * @param {number} [o.quietMs]  default: its `compilerRunQuiet` (TB_COMPILER_RUN_QUIET)
 * @returns {Promise<{captured: string[], last: string, erased: string[], timedOut: boolean,
 *   ended: "done" | "quiet" | "failed" | "build-timeout" | "run-timeout", limitMs: number | null}>}
 *   `captured` is the console after the run; `last` the same, unsplit; `erased`
 *   every line a clear removed, oldest first; `timedOut` is true when the wait
 *   ended at a limit, `ended` says how it ended, and `limitMs` is the limit that
 *   ended it
 */
export async function captureRun(
  c,
  {
    done = () => false,
    buildMs = timeoutMs("build"),
    runMs = timeoutMs("compilerRun"),
    quietMs = timeoutMs("compilerRunQuiet"),
  } = {},
) {
  // Keep what each clear erases, for the check after the run.
  if (!(await keepClears(c))) {
    throw new Error(
      "no clearDebugConsole() in this IDE -- a probe's Debug.Cls could erase a " +
        "failure unseen. Refusing rather than returning what it left as complete.",
    );
  }
  // A real press/release pair; element.click() is ignored.
  const pressed = Date.now();
  await pressBuild(c);

  const started = Date.now();
  let last = "",
    lastChange = Date.now(),
    failedAt = null,
    ended = null,
    limitMs = null;
  // When the build's first line, its link line and the Sub's Executing line were
  // first seen, in the console or in what a clear erased. `exec` ends the build
  // phase and starts the run's; the other two are for tb-timings.mjs only.
  const marks = { start: null, linked: null, exec: null };
  const markLines = async (now) => {
    if (marks.exec !== null && !timingsOn) return;
    const text = [...((await keptClears(c).catch(() => null)) ?? []), now].join("\n");
    const at = Date.now();
    if (marks.start === null && text.includes("[BUILD] Starting...")) marks.start = at;
    if (marks.linked === null && /\[LINKER\] SUCCESS created output file/.test(text)) marks.linked = at;
    if (marks.exec === null && /\[BUILD\] Executing '/.test(text)) marks.exec = at;
    if (marks.exec === null && failedAt === null && text.split("\n").some((l) => BUILD_FAILED.test(l.trim()))) {
      failedAt = at;
    }
  };
  for (;;) {
    // A poll never sleeps past the active limit, so a short one is met as given.
    const due =
      marks.exec === null
        ? started + buildMs
        : Math.min(marks.exec + runMs, Math.max(marks.exec, lastChange) + quietMs + 1);
    await sleep(Math.min(400, Math.max(0, due - Date.now())));
    // As buildProject does: a build not seen to reach Executing by its limit has met it.
    if (marks.exec === null && Date.now() - started >= buildMs) {
      ended = "build-timeout";
      limitMs = buildMs;
      break;
    }
    const now = await readConsole(c);
    if (now === null) {
      throw new Error(
        "no debugConsoleContent.dataNodes in this IDE -- the DEBUG CONSOLE " +
          "was never created, or this build moved it. Refusing rather than " +
          "falling back to scraping the pane, which silently truncates.",
      );
    }
    const at = Date.now();
    if (now !== last) {
      last = now;
      lastChange = at;
      await markLines(now);
      if (marks.exec !== null && done(strip(now))) {
        ended = "done";
        break;
      }
    }
    if (marks.exec === null) {
      // The build: it ends with Executing, or fails, or meets its limit.
      if (failedAt !== null && at - failedAt > 2000) {
        ended = "failed";
        break;
      }
      if (at - started >= buildMs) {
        ended = "build-timeout";
        limitMs = buildMs;
        break;
      }
      continue;
    }
    // The run, from Executing.
    if (at - Math.max(marks.exec, lastChange) > quietMs) {
      ended = "quiet";
      break;
    }
    if (at - marks.exec >= runMs) {
      ended = "run-timeout";
      limitMs = runMs;
      break;
    }
  }
  const timedOut = limitMs !== null;
  const rel = (at, from) => (at === null || from === null ? null : at - from);
  timing(
    "run",
    {
      ended,
      quietMs,
      buildLimitMs: buildMs,
      runLimitMs: runMs,
      pressMs: started - pressed,
      startMs: rel(marks.start, started),
      buildMs: rel(marks.linked, marks.start),
      toExecMs: rel(marks.exec, marks.linked),
      runMs: rel(lastChange, marks.exec),
      lastChangeMs: lastChange - started,
      waitMs: Date.now() - started,
    },
    c,
  );
  const captured = strip(last);
  const kept = await keptClears(c);
  if (!kept) {
    throw new Error(
      "the IDE page no longer holds what the DEBUG CONSOLE's clears erased, so " +
        "a failure they erased cannot be ruled out",
    );
  }
  return { captured, last, erased: kept.flatMap((text) => text.split("\n")), timedOut, ended, limitMs };
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
 * that procedure (measured). A failure line among what the clears erased counts
 * after the last Executing line; before it is the build's own log, which ended in
 * success or the Sub would not have run -- except for an LLVM refusal
 * (LLVM_REFUSAL), which fails the build wherever it is, an exe linked or not
 * (test/harness.md).
 *
 * @param {string[]} captured  from captureRun
 * @param {string[]} erased    from captureRun
 * @returns {{started: number, buildFailed: string | undefined, lost: string | undefined}}
 *   `started` is the index in `erased` of the last Executing line, or -1;
 *   `buildFailed` the first failure line left in the console; `lost` the first
 *   failure line a clear erased after the run started, or else the first LLVM
 *   refusal a clear erased anywhere
 */
export function checkCapture(captured, erased) {
  const started = erased.findLastIndex((l) => /^\[BUILD\] Executing '/.test(l));
  const after = started < 0 ? undefined : erased.slice(started + 1).find((l) => BUILD_FAILED.test(l));
  return {
    started,
    buildFailed: captured.find((l) => BUILD_FAILED.test(l)),
    lost: after ?? erased.find((l) => LLVM_REFUSAL.test(l)),
  };
}

/**
 * The message of a capture whose build met its limit (`build-timeout`), or
 * undefined. That is a failed build, reported as a timeout; a run that meets its
 * own limit is a run that never returned, which the caller judges from what it printed.
 * @param {{ended: string, limitMs: number | null}} capture  from captureRun
 */
export function buildTimeoutMessage(capture) {
  if (capture.ended !== "build-timeout") return undefined;
  return (
    `timeout: the build did not reach [BUILD] Executing within ${secondsText(capture.limitMs)} of the press ` +
    "(test/harness.json's build; --build-timeout or TB_BUILD_TIMEOUT overrides it)"
  );
}
