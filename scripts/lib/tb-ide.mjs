// Starting a twinBASIC IDE, reaching it over CDP, reading what it shows,
// building the project it has open, and ending it. The mechanics
// scripts/tbbuild.mjs and scripts/tbrun.mjs share, and the ones the add-in
// harness in WIP.HelpAddin.md (Stage 1) is built on.
//
// Each function here was once inline in one of those two scripts, and the
// comments that explain it moved with it. See WIP.Harness.md, "Compiling a
// twinBASIC project without the IDE in front of you", for the history.

import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attach } from "./tb-cdp.mjs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The IDE echoes projectFilePath back with whichever separators it was given.
export const normPath = (p) => p.split("\\").join("/").toLowerCase();

/**
 * Whether the IDE goes on the user's desktop or on a private one.
 *
 * Hidden by default so an unattended run cannot take the keyboard, but the
 * private desktop also hides a wedged IDE from the person debugging it -- so
 * the choice is a switch, and TBBUILD_SHOW makes it a session-wide one rather
 * than something to remember on every invocation.
 */
export function wantShow({ show = false, hide = false } = {}) {
  return show ||
    (!hide && !!process.env.TBBUILD_SHOW &&
      !["0", "false", "no", ""].includes(process.env.TBBUILD_SHOW.toLowerCase()));
}

/**
 * Kill a process and everything it started.
 *
 * An IDE showing a modal dialog ignores a normal close, and the launcher is
 * not the process that holds the compiler, so kill the tree and force it.
 * A tree kill misses a process started while it runs -- a compiler the IDE is
 * restarting after a crash, for one -- and the job tb-launch.ps1 puts the IDE
 * in is what ends those.
 */
export function killTree(pid) {
  try { execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); }
  catch { /* already gone */ }
}

/**
 * Start the IDE on one project, with a DevTools port open.
 *
 * The project goes on the command line, so the IDE opens it as its own first
 * act and no startup state has to be raced.
 *
 * Two things about that are easy to get wrong. `parseCommandLine()` in
 * ide/main2.js splits the command line on " " and pushes every token, so a
 * TRAILING SPACE becomes an empty second argument and the IDE refuses the
 * launch with "Bad command line syntax." PowerShell's Start-Process appends
 * exactly that space; spawn with an argv array does not. And loading the
 * project afterwards through root.loadProject works but lets the IDE's
 * no-project startup run first, which flashes the splash and the New/Open
 * Project dialog on screen before the load replaces them.
 *
 * By default the IDE goes on a private Windows desktop, where it cannot take
 * the keyboard away from whatever you are doing. It has to be a desktop and
 * not a window style: the IDE calls HostForceFocus() from its own
 * window.onload, so `start /min` was tried and does not help. It compiles
 * there exactly as it does on screen. `show` opts out, for watching it work
 * or for diagnosing the harness itself.
 *
 * @param {object} o
 * @param {string} o.exe      twinBASIC.exe
 * @param {string} o.project  the .twinproj to open; resolved here
 * @param {number} o.port     DevTools port; also keys the WebView2 profile
 *                            folder and the private desktop's name
 * @param {boolean} [o.show]  on the user's desktop instead of a private one
 * @param {boolean} [o.keep]  the IDE is to outlive this Node process
 * @param {object} [o.env]    extra environment for the IDE
 * @returns {Promise<{pid: number, launcher: import("node:child_process").ChildProcess | null}>}
 *   `pid` is the IDE's own. Throws when a hidden launch fails.
 */
export async function launchIde({ exe, project, port, show = false, keep = false, env = {} }) {
  const exeWin = exe.split("/").join("\\");
  const target = path.resolve(project).split("/").join("\\");
  const fullEnv = {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
      `--remote-debugging-port=${port} --remote-allow-origins=*`,
    WEBVIEW2_USER_DATA_FOLDER: `${process.env.TEMP}/tbbuild-wv2-${port}`,
    ...env,
  };

  if (show) {
    const child = spawn(exeWin, [target], { detached: true, stdio: "ignore", env: fullEnv });
    child.unref();
    return { pid: child.pid, launcher: null };
  }

  // lib/tb-launch.ps1 does the Win32 calls Node cannot -- CreateDesktop,
  // CreateProcess with STARTUPINFO.lpDesktop, and a job object that ends every
  // process the IDE starts once the launcher's handle to it closes. It is
  // passed as -EncodedCommand rather than run as a file, so no execution
  // policy is involved; its inputs arrive as environment variables, so there is
  // no argument quoting to get wrong.
  //
  // How long the launcher lives is how long the IDE lives, and Node decides
  // that. Node puts the children it spawns into a kill-on-close job of its
  // own, so when this process ends -- finished, crashed, or stopped with
  // Ctrl+C -- the launcher ends too, the launcher's job closes, and the IDE
  // goes with it. That is what a run wants: before the job, a run that died
  // left its IDEs open on desktops nobody could see.
  //
  // A kept IDE is the exception, and under `keep` the launcher makes no job:
  // the IDE then escapes Node's job the way every process the launcher
  // starts does, and lives until somebody closes it. Both of the other ways
  // were measured and fail. With the job, a --keep IDE was gone before
  // anything could attach to it, because the launcher died with tbbuild and
  // took the job with it. With the launcher detached from Node instead,
  // PowerShell exited at once, without a pid and without a word on stderr.
  const script = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "tb-launch.ps1"), "utf8");
  const ps = spawn("powershell", [
    "-NoProfile", "-NonInteractive",
    "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64"),
  ], {
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    env: {
      ...fullEnv, TBBUILD_EXE: exeWin, TBBUILD_ARG: target, TBBUILD_DESKTOP: `tbbuild-${port}`,
      TBBUILD_JOB: keep ? "0" : "1",
    },
  });
  let err = "";
  ps.stderr.on("data", (d) => { err += d; });
  const pid = await new Promise((res) => {
    let buf = "";
    ps.stdout.on("data", (d) => {
      buf += d;
      const m = /^\s*(\d+)\s*$/m.exec(buf);
      if (m) res(Number(m[1]));
    });
    ps.on("exit", () => res(null));
  });
  if (!pid) {
    throw new Error(`could not start the IDE on a private desktop:\n${err.trim()}\n` +
      "(--show runs it on your own desktop instead)");
  }
  return { pid, launcher: ps };
}

/**
 * End an IDE started by launchIde, and the launcher holding its desktop, and
 * wait until the IDE's process is gone.
 *
 * The wait is for whatever runs next. The IDE writes its recent list and
 * project state to the registry while it runs, and taskkill only asks for the
 * end of a process: tidying the registry before the process has actually gone
 * could lose to one last write. It is normally over in well under a second,
 * and it gives up after five.
 */
export function shutdownIde(ide) {
  if (!ide) return;
  killTree(ide.pid);
  // The launcher holds the private desktop open and the only handle to the
  // IDE's job. It exits once the IDE does, but do not wait on that: killing it
  // closes the job, which ends anything the tree kill missed.
  try { ide.launcher?.kill(); } catch { /* already gone */ }
  waitForExit(ide.pid, 5000);
}

/**
 * Block until a process has exited, or the time runs out.
 *
 * Synchronous on purpose: shutdown runs on paths that end in process.exit().
 *
 * @returns {boolean} true if the process is gone
 */
export function waitForExit(pid, timeoutMs) {
  const until = Date.now() + timeoutMs;
  const cell = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < until) {
    // Signal 0 tests whether the process exists; it throws once it does not.
    try { process.kill(pid, 0); } catch { return true; }
    Atomics.wait(cell, 0, 0, 100);
  }
  return false;
}

/** Attach to the IDE's page once its DevTools port answers; null if it never does. */
export async function attachIde(port, { tries = 60 } = {}) {
  for (let i = 0; i < tries; i++) {
    await sleep(1000);
    try { return await attach(port); } catch { /* still starting */ }
  }
  return null;
}

// Counts and rows are read in ONE evaluate. Read separately they raced: a run
// reported two diagnostics beside a zero error count, because the background
// compile finished between the two calls.
//
// `crash` reads the DEBUG CONSOLE, and it is not an extra: the status-bar watch
// in waitForCompile MISSES a compiler crash, which is the worst failure the
// harness has, because a crashed compile reports zero of everything and exits 0.
// Measured on a 275-file project -- twice, reproducibly -- against quarters of
// the same project that reported 129, 0, 294 and 448 errors. The IDE writes
// "NATIVE EXCEPTION: ACCESS_VIOLATION" and "restarting from MEMORY" to the
// console, restarts the compiler three times, and then leaves the status at
// OPERATIONAL with the counters at zero, which is byte-identical to a clean
// build. The status does flap to UNAVAILABLE on the way, but the whole
// crash-restart cycle takes about 1.3 s and the loop samples at 1 Hz, so
// `drops` never reaches its threshold. The console is the only record that
// cannot be missed by sampling: nothing removes an entry from it.
const BUILD_STATE_JS = `JSON.stringify({
  st: document.getElementById("compilerStatus")?.textContent ?? "",
  e: document.getElementById("errorCount")?.textContent ?? "",
  w: document.getElementById("warningCount")?.textContent ?? "",
  h: document.getElementById("hintCount")?.textContent ?? "",
  i: document.getElementById("infoCount")?.textContent ?? "",
  p: typeof projectFilePath !== "undefined" ? projectFilePath : null,
  crash: (() => {
    if (typeof debugConsoleContent === "undefined" || !debugConsoleContent ||
        !debugConsoleContent.dataNodes) return null;
    let n = 0; const files = [];
    for (const entry of debugConsoleContent.dataNodes) {
      if (entry.indexOf("NATIVE EXCEPTION") >= 0) n++;
      const m = /ParsingFileStart, ([^<\\s]+)/.exec(entry);
      if (m && files.indexOf(m[1]) < 0) files.push(m[1]);
    }
    return n ? { n: n, files: files } : null;
  })(),
  rows: (() => {
    const out = [];
    if (typeof problemsPanel === "undefined" || !problemsPanel) return out;
    const d = problemsPanel.tree.view.data;
    if (typeof PROBLEMSPANEL_CUSTOMPROPERTY_TYPE === "undefined") {
      // Older/newer IDE without the constants: fall back to the IDE's own
      // helper, with its "errors only" flag OFF so warnings still appear.
      let t = 1;
      while (true) {
        t = d.getNextVisibleNode2(t, false, true);
        if (!t) break;
        const n = generateCopyPasteTextForProblem(d.generateNodeInfo(t), false);
        if (n) out.push(n);
      }
      return out;
    }
    // The panel hides hints and info by default (hideGroup3/hideGroup4 are
    // true), so they are not in the walk at all. Clear all four, walk, and put
    // them back -- this whole function is one synchronous evaluate, so the IDE
    // never renders the intermediate state.
    const saved = [d.hideGroup1, d.hideGroup2, d.hideGroup3, d.hideGroup4];
    d.hideGroup1 = d.hideGroup2 = d.hideGroup3 = d.hideGroup4 = false;
    try {
      // LSP DiagnosticSeverity: 1 Error, 2 Warning, 3 Information, 4 Hint --
      // which is what the compiler's language socket speaks. 3 and 4 are the
      // opposite way round from the status bar's hint-then-info column order,
      // and guessing from that order got them backwards. No backticks in any
      // comment here: this block is inside a template literal, and one
      // truncates the whole evaluate string. Measured by forcing
      // TB0013 into project.warnings.hints (status bar "2 hint(s)", severity 4)
      // and then into .info (status bar "2 info", severity 3).
      const LABEL = { 1: "{ERROR}", 2: "{WARNING}", 3: "{INFO}", 4: "{HINT}" };
      let t = 1;
      while (true) {
        t = d.getNextVisibleNode2(t, false, true);
        if (!t) break;
        const o = d.generateNodeInfo(t);
        if (!o) continue;
        // Type 0 is the per-file header row, which carries no diagnostic.
        if (o.getCustomData(PROBLEMSPANEL_CUSTOMPROPERTY_TYPE)
            !== PROBLEMSPANEL_CUSTOMPROPERTY_TYPE1_DIAGNOSTIC) continue;
        const url = o.getParentNodeInfo
          ? (o.getParentNodeInfo() || {}).getCustomData(
              PROBLEMSPANEL_CUSTOMPROPERTY_TYPE0_FILEHEADER_URL) : "";
        const sev = o.getCustomData(PROBLEMSPANEL_CUSTOMPROPERTY_TYPE1_DIAGNOSTIC_SEVERITY);
        const ln = o.getCustomData(PROBLEMSPANEL_CUSTOMPROPERTY_TYPE1_DIAGNOSTIC_LINENUM);
        const ch = o.getCustomData(PROBLEMSPANEL_CUSTOMPROPERTY_TYPE1_DIAGNOSTIC_CHARNUM);
        out.push((LABEL[sev] || ("{SEVERITY" + sev + "}")) + " " + (url || "") +
          " [" + (ln + 1) + "," + (ch + 1) + "]: " + o.getCaption());
      }
    } finally {
      d.hideGroup1 = saved[0]; d.hideGroup2 = saved[1];
      d.hideGroup3 = saved[2]; d.hideGroup4 = saved[3];
    }
    return out;
  })() })`;

/** One sample of the status bar, the diagnostics and the crash record, as a JSON string. */
export const readBuildState = (c) => c.evaluate(BUILD_STATE_JS);

/**
 * Wait for the project to open and its compile to settle.
 *
 * twinBASIC runs the compiler in the same process as user code, so a project
 * can take it down; the IDE then restarts it, three times, before giving up.
 * Watching the status leave OPERATIONAL after it has reached it turns that
 * from a silent two-minute wait into a reported result -- but only when the
 * sampling happens to catch it, which is why BUILD_STATE_JS reads the console
 * too, and that is what actually decides a crash.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} o
 * @param {string} o.project          the project the IDE was started on. It is
 *   resolved before comparing, because the IDE echoes the resolved path it was
 *   given: compared as typed, a relative path never matched, and the IDE was
 *   never reported open.
 * @param {number} o.timeout          milliseconds
 * @returns {Promise<{loaded: boolean, crash: object | null, drops: number, last: string | null}>}
 *   `last` is the final sample, as the JSON string readBuildState returned
 */
export async function waitForCompile(c, { project, timeout }) {
  const want = normPath(path.resolve(project));
  const t0 = Date.now();
  let last = null, stable = 0, loaded = false, seenUp = false, drops = 0, crash = null;
  while (Date.now() - t0 < timeout) {
    await sleep(1000);
    let s;
    try { s = await readBuildState(c); } catch { continue; }
    const v = JSON.parse(s);
    if (!loaded) { if (v.p && normPath(v.p) === want) loaded = true; else continue; }
    if (v.crash) {
      // The IDE's FIRST exception line carries no thread dump; the file being
      // parsed is only named in the dump that comes with the restart about a
      // second later. Catching the crash on sight and reporting it without that
      // name is a correct result nobody can act on, so give the IDE one more
      // moment and take whatever it has then.
      crash = v.crash;
      if (!crash.files?.length) {
        await sleep(2000);
        try { crash = JSON.parse(await readBuildState(c)).crash ?? crash; } catch { /* keep what we have */ }
      }
      break;
    }
    const up = v.st === "tB Services: OPERATIONAL";
    if (up) seenUp = true; else if (seenUp && ++drops >= 2) break;
    if (up && s === last) { if (++stable >= 5) break; } else stable = 0;
    last = s;
  }
  return { loaded, crash, drops, last };
}

/**
 * Turn what waitForCompile saw into diagnostics, or into the reason there are none.
 *
 * @param {object} waited      waitForCompile's result
 * @param {object} o
 * @param {string} o.name      the project as the caller should name it in a message
 * @returns {{ok: true, rows: string[], counts: number[]} | {ok: false, code: number, message: string}}
 *   `counts` is errors, warnings, hints, infos. `code` is 4 for a compiler
 *   crash and 3 for a compile that never settled.
 */
export function compileOutcome({ loaded, crash, drops, last }, { name }) {
  // A crash is reported by the file the compiler died parsing, because in a batch
  // of generated probes that name is the whole answer: it says which sample to
  // take out, and a caller bisecting the batch has somewhere to start.
  if (crash) {
    return {
      ok: false, code: 4,
      message: `the compiler crashed ${crash.n}x -- this project takes it down` +
        (crash.files?.length ? `\nlast parsing: ${crash.files.join(", ")}` : "") +
        "\n(read the IDE's DEBUG CONSOLE with --keep for the exception detail)",
    };
  }
  if (drops >= 2) {
    return {
      ok: false, code: 4,
      message: `the compiler restarted ${drops}x -- this project crashes it\nlast status: ${last}`,
    };
  }
  if (!loaded) return { ok: false, code: 3, message: `the IDE never reported ${name} as open` };

  const final = JSON.parse(last ?? "{}");
  const rows = (final.rows ?? []).map((r) =>
    r.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  const counts = ["e", "w", "h", "i"].map((k) => Number(final[k] ?? 0));

  // A row count that disagrees with the status bar means the compile was still
  // moving when the sample was taken. Refuse rather than report either number.
  //
  // This invariant was unsatisfiable for two years on any project with a warning.
  // The walk passed the IDE's copy helper its "errors only" flag -- the helper is
  // `if (t && severity !== 1) return;` -- and the panel hides hints and info by
  // default, so `rows` could only ever hold errors while `counts` held all four.
  // A project with 0 errors and 2 warnings read as "0 rows against 0/2/0/0" and
  // exited 3, which looks exactly like a compile that never settled. The walk
  // now reads severity from the panel's own node data instead, so the two
  // sides count the same things and a real race is again the only way to trip it.
  if (counts.reduce((a, b) => a + b, 0) !== rows.length) {
    return {
      ok: false, code: 3,
      message: `unsettled: ${rows.length} rows against ${counts.join("/")} in the status bar`,
    };
  }
  return { ok: true, rows, counts };
}

/** The last line of a diagnostics report. */
export const summaryLine = (counts) =>
  `--- ${counts[0]} error(s), ${counts[1]} warning(s), ${counts[2]} hint(s), ${counts[3]} info`;

// Read the DEBUG CONSOLE's BACKING ARRAY, never the pane. `debugConsoleContent`
// is a createListView(), which renders only the rows that fit -- so an
// `.innerText` scrape returned the last ~11 lines of any longer probe and gave
// no sign that it had. `dataNodes` is the complete log: addItem() appends at
// `itemCount` and nothing in main.js ever removes an entry, so the array holds
// every line written since the last clear().
//
// The walk below is the IDE's own `tbDebugConsole_ClipboardCopyAll`, minus the
// clipboard write -- the same borrow BUILD_STATE_JS makes for the diagnostics
// report. Each entry is `<span class=COLOR><span class=ts>TIME</span>TEXT</span>`,
// so slicing past the first `</span>` drops the timestamp, which is what the
// IDE's own two Copy All variants differ by. Note that the timestamp is always
// present in the data: the pane's "Show Timestamps" option only sets a
// `--timestampsDisplay` CSS variable, so it cannot change what is read here.
//
// Two deliberate departures from the IDE's version:
//
//   * DECODE WITH textContent ON OUR OWN DETACHED NODE, not the IDE's
//     HTMLToTEXT. That helper reads `.innerText` off a shared `hiddenDiv`, and
//     it preserves runs of spaces only because `initMisc()` creates that div
//     with no parent -- an element that is not rendered has innerText ===
//     textContent. Attach it in some future build and every padded value a
//     probe prints starts collapsing silently. Probes measure things like
//     Debug.Print zone widths and Partition's space-padded labels, so that is
//     the one thing this reader must not get wrong.
//   * TOLERATE A MISSING TIMESTAMP SPAN. indexOf returns -1 when there is
//     none, and the IDE's `substr(i + 7)` would then quietly eat six
//     characters of real output. No current addItem() path omits it; the guard
//     costs a comparison and removes a silent-corruption mode.
const consoleJs = (withTimestamps, from) => `(() => {
  if (typeof debugConsoleContent === "undefined" || !debugConsoleContent ||
      !debugConsoleContent.dataNodes) return null;
  const decode = (html) => {
    const d = document.createElement("div");   // never attached; see above
    d.innerHTML = html;
    return d.textContent;
  };
  return debugConsoleContent.dataNodes.slice(${from}).map(n => {
    const i = n.indexOf("</span>");
    if (i < 0) return decode(n);
    return decode(${withTimestamps}
      ? n.substr(0, i + 7) + " " + n.substr(i + 7)
      : n.substr(i + 7));
  }).join("\\n");
})()`;

/**
 * The whole DEBUG CONSOLE as text, one line per entry; null when this IDE has
 * no `debugConsoleContent.dataNodes` to read.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} [o]
 * @param {boolean} [o.timestamps]    keep each entry's timestamp column
 * @param {number} [o.from]           start at this entry instead of the first
 */
export const readConsole = (c, { timestamps = false, from = 0 } = {}) =>
  c.evaluate(consoleJs(timestamps, Number(from)));

// Where the console stands: how many entries it holds, and its first entry as
// stored, timestamp and all. Nothing removes an entry but a clear, so entries
// read later from index `n` on are new -- unless the first entry has changed or
// the count has fallen, which means the console was cleared in between and all
// of it is new.
const CONSOLE_MARK_JS = `(() => {
  const d = typeof debugConsoleContent === "undefined" || !debugConsoleContent
    ? null : debugConsoleContent.dataNodes;
  return d ? { n: d.length, first: d.length ? d[0] : null } : null;
})()`;

// The build log, in the compiler's own words (its strings, BETA 983). A build
// writes "[BUILD] Starting..." to the DEBUG CONSOLE, and a binary ends with
// "[LINKER] SUCCESS created output file '<path>'" or with one of some twenty
// failure lines: "[LINKER] FAILED ...", "[BUILD] FAILED ...", "[BUILD] ERROR
// ...", "[BUILD] failed" and "[LINKER] compilation (codegen) error ...".
const BUILD_START = "[BUILD] Starting...";
const BUILD_OK = /^\[LINKER\] SUCCESS created output file '(.+)'$/;
const BUILD_FAILED = /^\[(?:LINKER|BUILD)\] (?:FAILED|ERROR|failed)\b|^\[LINKER\] compilation \(codegen\) error/;

/**
 * Build the open project, as the toolbar's Build button does, and wait for the
 * build log to say how it went.
 *
 * Only a binary is recognised, an EXE or a DLL, whose log ends with the
 * linker's SUCCESS line. What a package build writes has not been looked at,
 * and one would end in the timeout.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} [o]
 * @param {number} [o.timeout]        milliseconds (default 120000)
 * @returns {Promise<{ok: boolean, file?: string, message?: string, log: string[]}>}
 *   `file` is the path the linker says it created; `log` is the console from
 *   the build's first line on
 */
export async function buildProject(c, { timeout = 120 * 1000 } = {}) {
  const mark = await c.evaluate(CONSOLE_MARK_JS);
  if (!mark) {
    return { ok: false, log: [], message: "no debugConsoleContent.dataNodes in this IDE, " +
      "so the build log cannot be read" };
  }
  if (!await clickCenter(c, "buildIcon")) {
    return { ok: false, log: [], message: "no #buildIcon in the IDE page -- did the project load?" };
  }
  const t0 = Date.now();
  let log = [], failedAt = 0;
  while (Date.now() - t0 < timeout) {
    await sleep(250);
    const now = await c.evaluate(CONSOLE_MARK_JS);
    const cleared = !now || now.n < mark.n || (mark.n > 0 && now.first !== mark.first);
    const text = await readConsole(c, { from: cleared ? 0 : mark.n });
    const lines = text ? text.split("\n").map((l) => l.trim()) : [];
    const start = lines.indexOf(BUILD_START);
    if (start < 0) continue;
    log = lines.slice(start);
    const ok = log.map((l) => BUILD_OK.exec(l)).find(Boolean);
    if (ok) return { ok: true, file: ok[1], log };
    // Not every such line need end the build -- the strings include "[BUILD]
    // failed to use project.iconForm setting", and whether a build goes on
    // after that one has not been seen -- so one decides only after two
    // seconds with no success line after it.
    if (!failedAt && log.some((l) => BUILD_FAILED.test(l))) failedAt = Date.now();
    if (failedAt && Date.now() - failedAt > 2000) {
      return { ok: false, message: log.find((l) => BUILD_FAILED.test(l)), log };
    }
  }
  return {
    ok: false, log,
    message: log.length
      ? `the build started and reported nothing for ${timeout / 1000} s`
      : `the build did not start in ${timeout / 1000} s -- is a dialog open? A template ` +
        "buildPath opens a Save dialog, which the private desktop hides",
  };
}

/**
 * The add-ins the IDE's compiler has loaded, as the Add-Ins menu lists them:
 * an array of objects with at least a `name`. Empty when none loaded.
 *
 * The page asks the compiler over its root socket (`RequestAddinsStateList`),
 * so this is the compiler's own answer rather than anything inferred from
 * files on disk. Add-ins load as the compiler starts, so ask once the project
 * has opened.
 *
 * A DLL the compiler found but could not load is listed too, as
 * "Unknown Addin", so look for the name you expect rather than counting. The
 * DEBUG CONSOLE says what went wrong, in a line that starts with the file's
 * name in brackets: "[x.dll] Failed to load addin.  LoadLibrary() failed."
 */
export const loadedAddins = (c) => c.evaluate(
  "new Promise((resolve) => root.getAddinsList(resolve))", { awaitPromise: true });

/**
 * Click the centre of the element with this id, with a real press and release.
 *
 * A JavaScript .click() on the IDE's own controls does nothing: `#buildIcon`,
 * for one, is a plain DIV wired through the IDE's pointer handling, and only
 * CDP Input.dispatchMouseEvent presses at its centre reach it.
 *
 * @returns {Promise<boolean>} false when there is no such element, or it has no size
 */
export async function clickCenter(c, id) {
  const rect = await c.evaluate(`(() => {
    const b = document.getElementById(${JSON.stringify(id)});
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
  })()`);
  if (!rect || !rect.w) return false;
  for (const type of ["mousePressed", "mouseReleased"]) {
    await c.send("Input.dispatchMouseEvent",
                 { type, x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  }
  return true;
}
