// Starting a twinBASIC IDE, reaching it over CDP, reading its build state,
// building the project it has open, and ending it. The mechanics
// scripts/tbbuild.mjs and scripts/tbrun.mjs share, and the ones the add-in
// harness in WIP.HelpAddin.md (Stage 1) is built on. Reading its DEBUG CONSOLE
// is tb-ide-console.mjs, and asking about its add-ins tb-ide-addins.mjs.
//
// Each function here was once inline in one of those two scripts, and the
// comments that explain it moved with it. See WIP.Harness.md, "Compiling a
// twinBASIC project without the IDE in front of you", for the history.

import { execFile, execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attach } from "./tb-cdp.mjs";
import { click, pagePicture } from "./tb-click.mjs";
import { consoleMark, keepClears, keptClears, linesSince, readConsole } from "./tb-ide-console.mjs";
import { watchCompiles } from "./tb-wire.mjs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The IDE echoes projectFilePath back with whichever separators it was given.
export const normPath = (p) => p.split("\\").join("/").toLowerCase();

/**
 * The environment variable that tells an add-in it is under test. While it is
 * set, an add-in does nothing outside the IDE: it prints each such action to
 * the DEBUG CONSOLE instead, as `open <url>` for a URL it would have opened in
 * a browser (WIP.HelpAddin.md, Stage 1 item 6). A browser started from an IDE
 * on a private desktop would open where nobody can see it and outlive the run.
 *
 * launchIde sets it to "1" for every IDE the harness starts, tbbuild's and
 * tbrun's included: any of them can load an add-in the user has installed,
 * and none has anybody watching it. Measured on BETA 983 (P10): it reaches the
 * compiler, twinBASIC_win32_noDEP.exe, which the IDE starts as its own child,
 * and every add-in that compiler loads, including after the compiler restarts.
 */
export const ADDIN_TEST_ENV = "TB_ADDIN_TEST";

/**
 * Whether the IDE goes on the user's desktop or on a private one.
 *
 * Hidden by default so an unattended run cannot take the keyboard, but the
 * private desktop also hides a wedged IDE from the person debugging it -- so
 * the choice is a switch, and TBBUILD_SHOW makes it a session-wide one rather
 * than something to remember on every invocation.
 */
export function wantShow({ show = false, hide = false } = {}) {
  return (
    show ||
    (!hide && !!process.env.TBBUILD_SHOW && !["0", "false", "no", ""].includes(process.env.TBBUILD_SHOW.toLowerCase()))
  );
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
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    /* already gone */
  }
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
 * @param {string} [o.project]  the .twinproj to open; resolved here. Without one
 *                            the IDE starts as from its icon: the splash, then
 *                            the New / Open Project dialog, every menu in its
 *                            no-project state
 * @param {number} o.port     DevTools port; also keys the WebView2 profile
 *                            folder and the private desktop's name
 * @param {boolean} [o.show]  on the user's desktop instead of a private one
 * @param {boolean} [o.keep]  the IDE is to outlive this Node process
 * A port something already listens on is refused. The harness attaches to
 * whatever page answers on its port, so if another IDE already holds it, that
 * IDE is the one the harness would read and operate --- and other sessions on
 * the same machine run this harness too, on ports of their own choosing.
 * An IDE ended a moment ago
 * holds its port a little longer than it lives: 13 and 16 ms after
 * shutdownIde, and once two seconds. So the port gets ten seconds to come
 * free before the launch is refused. The refusal names the process listening
 * on the port, or, when none is, the error the bind got: Windows refuses a
 * port it has reserved with EACCES.
 *
 * @param {object} [o.env]    extra environment for the IDE. ADDIN_TEST_ENV is
 *                            set to "1" unless this names it; a value of
 *                            undefined leaves a variable out altogether
 * @param {string} [o.browserArgs]  more WebView2 browser arguments, after the
 *                            DevTools ones, e.g. "--force-device-scale-factor=1"
 *                            to lay the page out at 100% whatever the display's
 *                            scaling
 * @returns {Promise<{pid: number, launcher: import("node:child_process").ChildProcess | null}>}
 *   `pid` is the IDE's own. Throws when the port is taken, or when the launch
 *   fails.
 */
export async function launchIde({ exe, project, port, show = false, keep = false, env = {}, browserArgs = "" }) {
  const waitFrom = Date.now();
  for (;;) {
    const code = await portTaken(port);
    if (!code) break;
    if (Date.now() - waitFrom > 10 * 1000) {
      const holder = portListeners(port);
      throw new Error(
        holder
          ? `DevTools port ${port} is in use: ${holder} listens on it. Another IDE has it, perhaps ` +
              "one another session started, and this one could be mistaken for it. Pass a different --port."
          : `DevTools port ${port} cannot be bound (${code}), though nothing listens on it: Windows ` +
              "may have reserved it (netsh int ipv4 show excludedportrange protocol=tcp). Pass a " +
              "different --port.",
      );
    }
    await sleep(100);
  }
  const exeWin = exe.split("/").join("\\");
  const target = project ? path.resolve(project).split("/").join("\\") : "";
  // Each IDE has a temp folder of its own, emptied at each launch on its port.
  // Builds sharing one fail now and then with `[TYPELIB] failed to finalize
  // typelibrary.  Disk error?`: 0 in 192 with a folder per IDE, 8 in 192 with
  // one for all eight at once (BETA 995).
  const ideTemp = path.join(process.env.TEMP, `tbbuild-tmp-${port}`);
  try {
    rmSync(ideTemp, { recursive: true, force: true });
  } catch {
    // a file still held open: the IDE gets the folder as it is
  }
  mkdirSync(ideTemp, { recursive: true });
  // Node leaves out of a child's environment any variable whose value is
  // undefined, so `env` can remove one as well as set it.
  const fullEnv = {
    ...process.env,
    TEMP: ideTemp,
    TMP: ideTemp,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: [`--remote-debugging-port=${port}`, "--remote-allow-origins=*", browserArgs]
      .filter(Boolean)
      .join(" "),
    WEBVIEW2_USER_DATA_FOLDER: `${process.env.TEMP}/tbbuild-wv2-${port}`,
    [ADDIN_TEST_ENV]: "1",
    ...env,
  };

  if (show) {
    const child = spawn(exeWin, target ? [target] : [], { detached: true, stdio: "ignore", env: fullEnv });
    // A spawn that fails is reported by an 'error' event, not a throw, and an
    // 'error' nothing listens for ends this process with exit 1, which tbbuild
    // and tbrun define as compile errors. 'spawn' says the IDE started.
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", (e) => reject(new Error(`could not start the IDE: ${e.message}`)));
    });
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
  try {
    const { pid, launcher } = await launchOnDesktop({
      exe: exeWin,
      arg: target,
      desktop: `tbbuild-${port}`,
      job: !keep,
      env: fullEnv,
    });
    return { pid, launcher };
  } catch (e) {
    throw new Error(
      `could not start the IDE on a private desktop:\n${e.message}\n(--show runs it on your own desktop instead)`,
    );
  }
}

/**
 * One argument as it goes into a Windows command line, quoted the way the C
 * runtime reads it back (and Node writes it): an argument with a space, a tab or
 * a quote, or an empty one, is wrapped in quotes; the backslashes before a quote,
 * and at the end of a wrapped argument, are doubled. `C:\out\` stays `C:\out\`,
 * and `C:\my out\` becomes `"C:\my out\\"`, which is what keeps the closing quote
 * from being escaped.
 */
export function quoteArg(a) {
  if (a !== "" && !/[\s"]/.test(a)) return a;
  return `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`;
}

// What powershell runs for launchOnDesktop: the script in TBBUILD_SCRIPT, taken
// out of the environment first.
const BOOTSTRAP = "$s = $env:TBBUILD_SCRIPT; Remove-Item Env:TBBUILD_SCRIPT; & ([scriptblock]::Create($s))";

/**
 * Start a program on a private desktop, inside a kill-on-close job, through
 * lib/tb-launch.ps1. launchIde starts the IDE this way, and tbrun's --exe the
 * probe's exe, so that neither can show a window on the user's desktop.
 *
 * @param {object} o
 * @param {string} o.exe      the program, a Windows path
 * @param {string} [o.arg]    its one argument; none when empty
 * @param {string} o.desktop  the private desktop's name
 * @param {boolean} [o.job]   false for no job, for a program that is to outlive
 *                            this Node process
 * @param {object} o.env      its whole environment
 * @param {string[]} [o.args] more arguments, after `arg`, for a program that takes
 *                            several; quoted as the C runtime reads them
 * @param {string} [o.stdout] a file path: the program's standard output goes there
 * @param {string} [o.stderr] the same for standard error. With either, the program's
 *                            standard input is the null device, and an output left
 *                            out goes to the null device
 * @param {"close"} [o.dialogs] look for dialog boxes the program (or anything in its
 *                            job) opens on the desktop, record each, and close it
 *                            by pressing OK, so that the program can go on
 * @returns {Promise<{pid: number, launcher: import("node:child_process").ChildProcess, exited: Promise<number | null>, finished: Promise<{code: number | null, dialogs: {title: string, text: string}[]}>}>}
 *   `exited` settles with the program's exit code when it ends, or null when
 *   the launcher ended without one -- killed, or failed. `finished` settles at
 *   the same time with that code and the dialogs recorded, in the order they
 *   opened (empty without `dialogs`). Throws, with the launcher's error, when
 *   the program did not start.
 */
export async function launchOnDesktop({ exe, arg = "", args, desktop, job = true, env, stdout, stderr, dialogs }) {
  const script = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "tb-launch.ps1"), "utf8");
  // -EncodedCommand is UTF-16 in base64, 2.7 characters to each of the script's,
  // and a command line stops at 32,767: the script outgrew that at about 12,000
  // characters (ENAMETOOLONG). So the script travels in an environment variable,
  // which stops at 32,767 characters of its own, and the command is a bootstrap
  // that takes it out of the environment, so that the program it launches does
  // not inherit it, and runs it.
  if (script.length > 30000) {
    throw new Error(`tb-launch.ps1 is ${script.length} characters, and an environment variable stops at 32,767`);
  }
  const ps = spawn(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(BOOTSTRAP, "utf16le").toString("base64")],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      // An option left out removes the variable, so that one in the caller's
      // environment cannot switch it on.
      env: {
        ...env,
        TBBUILD_SCRIPT: script,
        TBBUILD_EXE: exe,
        TBBUILD_ARG: arg,
        TBBUILD_ARGS: args?.length ? args.map(quoteArg).join(" ") : undefined,
        TBBUILD_DESKTOP: desktop,
        TBBUILD_JOB: job ? "1" : "0",
        TBBUILD_STDOUT: stdout || undefined,
        TBBUILD_STDERR: stderr || undefined,
        TBBUILD_DIALOGS: dialogs || undefined,
      },
    },
  );
  let err = "",
    out = "";
  ps.stderr.on("data", (d) => {
    err += d;
  });
  ps.stdout.on("data", (d) => {
    out += d;
  });
  // "close" rather than "exit": the exit line can still be in the pipe at "exit".
  const ended = new Promise((res) => ps.on("close", res));
  const pid = await new Promise((res) => {
    ps.stdout.on("data", () => {
      const m = /^\s*(\d+)\s*$/m.exec(out);
      if (m) res(Number(m[1]));
    });
    ended.then(() => res(null));
  });
  if (!pid) throw new Error(err.trim());
  const finished = ended.then(() => {
    const m = /^exit (-?\d+)\s*$/m.exec(out);
    const found = [];
    for (const d of out.matchAll(/^dialog ([A-Za-z0-9+/=]+)\s*$/gm)) {
      try {
        const { title, text } = JSON.parse(Buffer.from(d[1], "base64").toString("utf8"));
        found.push({ title: String(title ?? ""), text: String(text ?? "") });
      } catch {
        // a line the launcher did not finish writing
      }
    }
    return { code: m ? Number(m[1]) : null, dialogs: found };
  });
  const exited = finished.then((f) => f.code);
  return { pid, launcher: ps, exited, finished };
}

// Runs tb-launch.ps1 in its window mode (TBBUILD_WINDOWS) on a private desktop and returns
// the one line of JSON it prints; throws with its error.
function onDesktopWindows(desktop, vars) {
  const script = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "tb-launch.ps1"), "utf8");
  return new Promise((resolve, reject) => {
    const ps = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(BOOTSTRAP, "utf16le").toString("base64")],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: { ...process.env, TBBUILD_SCRIPT: script, TBBUILD_DESKTOP: desktop, ...vars },
      },
    );
    let out = "",
      err = "";
    ps.stdout.on("data", (d) => {
      out += d;
    });
    ps.stderr.on("data", (d) => {
      err += d;
    });
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code) {
        reject(new Error(`the windows of desktop ${desktop}: ${err.trim() || `exit ${code}`}`));
        return;
      }
      try {
        resolve(JSON.parse(out.trim()));
      } catch {
        reject(new Error(`the windows of desktop ${desktop}: no JSON in ${JSON.stringify(out.slice(0, 200))}`));
      }
    });
  });
}

/**
 * The windows on a private desktop that launchOnDesktop (or launchIde, whose desktop is
 * `tbbuild-<port>`) made and still holds open: every top-level window, and with `children`
 * the child windows of each visible one, as tb-launch.ps1 describes them. A desktop is the
 * process's own, so every window on it is the program's or a process it started.
 *
 * @param {string} desktop
 * @param {object} [o]
 * @param {boolean} [o.children]
 * @returns {Promise<{hwnd: number, depth: number, class: string, title: string, pid: number, exe: string, visible: boolean, style: number, exStyle: number, owner: number, dpi: number, rect: number[]}[]>}
 *   `rect` is [left, top, right, bottom] in physical pixels; `depth` 1 for a child
 */
export function desktopWindows(desktop, { children = false } = {}) {
  return onDesktopWindows(desktop, { TBBUILD_WINDOWS: "list", TBBUILD_CHILDREN: children ? "1" : "0" });
}

/**
 * A picture of one window on a private desktop, written as a PNG file: PrintWindow, which
 * draws a window whether or not its desktop is the one on screen, with PW_RENDERFULLCONTENT
 * by default (`flags` 2), the only way it holds what a WebView2 draws. Its frame is as the
 * system draws it and its size the window's in physical pixels, at the desktop's DPI.
 *
 * The picture is not a page's, so the visible-text check of shoot_docs does not cover it:
 * `texts` holds the window's title and its child windows' texts, which the caller searches
 * for the Windows user name. Text a window draws itself (a WebView2's page, an owner-drawn
 * control) is not among them.
 *
 * @param {string} desktop
 * @param {number} hwnd   from desktopWindows
 * @param {string} file   the PNG file to write
 * @param {object} [o]
 * The picture includes the invisible resize borders of a Windows 10 frame: `frame` is the
 * visible frame in it (DWMWA_EXTENDED_FRAME_BOUNDS) and `client` the client area, each
 * [left, top, right, bottom] in the picture's pixels. With PW_CLIENTONLY (1) the client area
 * is drawn at the picture's top left. `layered` is a layered window's [colour key as a
 * COLORREF, alpha, LWA_ flags], else null: PW_RENDERFULLCONTENT draws the key colour's pixels
 * black and every pixel opaque, and flags 1 draws them in the key colour.
 *
 * @param {number} [o.flags]  PrintWindow's flags (default 2)
 * @returns {Promise<{width: number, height: number, dpi: number, frame: number[], client: number[], layered: number[] | null, texts: string[]}>}
 */
export function captureWindow(desktop, hwnd, file, { flags = 2 } = {}) {
  return onDesktopWindows(desktop, {
    TBBUILD_WINDOWS: "capture",
    TBBUILD_HWND: String(hwnd),
    TBBUILD_FLAGS: String(flags),
    TBBUILD_FILE: path.resolve(file),
  });
}

/**
 * What a tool prints under --keep: the kept IDE's pid, and the commands that end
 * it with every process it started (/T takes the compiler and the rest of its
 * tree), in each shell's spelling; Git Bash would read /PID as a path.
 */
export function keptIdeLines(pid) {
  return [
    `ide-pid: ${pid}`,
    "to end the IDE and every process it started:",
    `  cmd or PowerShell:  taskkill /PID ${pid} /T /F`,
    `  Git Bash:           taskkill //PID ${pid} //T //F`,
  ];
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
  try {
    ide.launcher?.kill();
  } catch {
    /* already gone */
  }
  waitForExit(ide.pid, 5000);
}

/**
 * shutdownIde without blocking the event loop, for a caller that ends an IDE
 * while other work is going on in the same process. shutdownIde's `taskkill` and
 * its wait each hold the process still, up to five seconds for the wait, and
 * with four builds at once that is four lanes' CDP timers running out while
 * their answers sit unread in a socket. The sync version stays for the paths
 * that end in process.exit(), where nothing else is waiting.
 */
export async function shutdownIdeAsync(ide) {
  if (!ide) return;
  await new Promise((resolve) => {
    execFile("taskkill", ["/PID", String(ide.pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
  try {
    ide.launcher?.kill();
  } catch {
    /* already gone */
  }
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    try {
      process.kill(ide.pid, 0);
    } catch {
      return;
    }
    await sleep(100);
  }
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
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    Atomics.wait(cell, 0, 0, 100);
  }
  return false;
}

/**
 * Attach to the IDE's page once its DevTools port answers; null if it never does.
 *
 * The connection records and dismisses every javascript dialog the page opens,
 * in `c.dialogs` as `{type, message, at}`. The IDE calls `alert()` from 37
 * places in BETA 983, and never `confirm()` or `prompt()`. An alert blocks the
 * page until it is answered, which on a private desktop nobody can do: every
 * later call on the connection would time out. An alert is accepted, since it has only the
 * one button; a confirm or a prompt, which only an add-in could open, is
 * cancelled. CDP reports dialogs only once `Page.enable` has been sent, and
 * until this function sent it, `tbbuild`'s list of dialogs could never fill.
 *
 * **A dialog that opened before this attached cannot be answered.** Measured:
 * `Page.enable` got no answer while it was open, the new connection was told
 * of no dialog, and `Page.handleJavaScriptDialog` replied "No dialog is
 * showing" while the page stayed blocked. The IDE's own candidates are its
 * "IDE startup failure" alert and "Bad command line syntax.", which
 * launchIde's single argument never provokes. Such a page is marked
 * `c.pageBlocked`, and waitForCompile passes that on, so the failure names the
 * likely cause; `--show` puts the dialog where a person can read it.
 *
 * `c.wire` follows the page's compiles from its own traffic, through CDP's
 * Network domain (tb-wire.mjs), so that waitForCompile can tell when a compile
 * has ended without waiting for the status bar to stay still. A page that did
 * not answer `Page.enable` would not answer `Network.enable` either, and it
 * gets none.
 */
export async function attachIde(port, { tries = 60 } = {}) {
  for (let i = 0; i < tries; i++) {
    await sleep(1000);
    let c;
    try {
      c = await attach(port);
    } catch {
      continue;
    } // still starting
    c.dialogs = [];
    c.pageBlocked = false;
    c.on((m) => {
      if (m.method !== "Page.javascriptDialogOpening") return;
      const { type, message } = m.params;
      c.dialogs.push({ type, message, at: Date.now() });
      c.send("Page.handleJavaScriptDialog", { accept: type === "alert" || type === "beforeunload" }).catch(() => {
        /* already answered, or the page is gone */
      });
    });
    try {
      await c.send("Page.enable");
    } catch {
      c.pageBlocked = true;
    }
    c.wire = null;
    if (!c.pageBlocked) {
      const wire = watchCompiles(c);
      try {
        await c.send("Network.enable");
        c.wire = wire;
      } catch {
        /* waitForCompile falls back to the status bar alone */
      }
    }
    return c;
  }
  return null;
}

// Whether something already listens on a loopback port. A DevTools server
// binds 127.0.0.1, so binding it ourselves for a moment is the test. Resolves
// to the bind's error code, or null when the port is free: a port Windows has
// reserved refuses the bind with EACCES though nothing listens on it.
export const portTaken = (port) =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", (e) => resolve(e.code ?? "an error"));
    s.once("listening", () => s.close(() => resolve(null)));
    s.listen(port, "127.0.0.1");
  });

// The processes listening on a port launchIde was refused, for its message,
// as netstat and tasklist name them: "pid 1234 (name.exe)". Null when none
// does. When netstat itself fails, that is said instead.
function portListeners(port) {
  const opts = { encoding: "utf8", windowsHide: true, timeout: 10 * 1000 };
  let pids;
  try {
    pids = [
      ...new Set(
        execFileSync("netstat", ["-ano", "-p", "TCP"], opts)
          .split(/\r?\n/)
          .map((l) => l.trim().split(/\s+/))
          .filter((f) => f[3] === "LISTENING" && f[1]?.endsWith(`:${port}`))
          .map((f) => f[4]),
      ),
    ];
  } catch (e) {
    return `a process netstat could not name (${e.code ?? e.message.split("\n")[0]})`;
  }
  if (!pids.length) return null;
  return pids
    .map((pid) => {
      try {
        const row = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], opts).trim();
        const image = /^"([^"]+)"/.exec(row)?.[1];
        return image ? `pid ${pid} (${image})` : `pid ${pid}`;
      } catch {
        return `pid ${pid}`;
      }
    })
    .join(" and ");
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
const CRASH_JS = `(() => {
    if (typeof debugConsoleContent === "undefined" || !debugConsoleContent ||
        !debugConsoleContent.dataNodes) return null;
    let n = 0; const files = [];
    for (const entry of debugConsoleContent.dataNodes) {
      if (entry.indexOf("NATIVE EXCEPTION") >= 0) n++;
      const m = /ParsingFileStart, ([^<\\s]+)/.exec(entry);
      if (m && files.indexOf(m[1]) < 0) files.push(m[1]);
    }
    return n ? { n: n, files: files } : null;
  })()`;

const BUILD_STATE_JS = `JSON.stringify({
  st: document.getElementById("compilerStatus")?.textContent ?? "",
  e: document.getElementById("errorCount")?.textContent ?? "",
  w: document.getElementById("warningCount")?.textContent ?? "",
  h: document.getElementById("hintCount")?.textContent ?? "",
  i: document.getElementById("infoCount")?.textContent ?? "",
  p: typeof projectFilePath !== "undefined" ? projectFilePath : null,
  // Safe Mode: the IDE sets the build box to nocompile itself after four
  // compiler restarts in a minute, and the compiler it then starts compiles
  // nothing, so the status and the counts stand still as a settled compile does.
  safe: typeof buildConfigSelector !== "undefined" && !!buildConfigSelector &&
    buildConfigSelector.value === "nocompile",
  // The files waitForCompile waits for c.wire to see: every .twin file outside
  // References (1) and Packages (7), which the compiler reports none for.
  src: (() => {
    if (typeof fs === "undefined" || !fs || !fs.tree || !fs.tree.rootFolder) return null;
    const root = fs.tree.rootFolder;
    if (!root.entries || !Object.keys(root.entries).length) return null;
    const out = [];
    root.enumerateContent(true, (n) => {
      if (n.isFolder) return n.specialItemId === 1 || n.specialItemId === 7 ? -2 : true;
      if (String(n.name).toLowerCase().endsWith(".twin")) out.push("twinbasic:" + n.getFullPath());
      return true;
    });
    return out;
  })(),
  crash: ${CRASH_JS},
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
 * Whether the compiler has crashed since the DEBUG CONSOLE was last cleared:
 * null, or `{ n, files }` --- how many "NATIVE EXCEPTION" entries, and the files
 * the thread dumps name as being parsed. An add-in runs inside the compiler's
 * process, so a crash ends whatever it was doing, and a scenario that saw one
 * has not tested what it meant to.
 */
export const readCrash = (c) => c.evaluate(CRASH_JS);

/**
 * Wait for a crash record to name the file being parsed, and return it as it
 * then stands: named, or as it was if no name came within `timeout` ms.
 *
 * The IDE's FIRST exception entry carries no thread dump, and the dump is what
 * names the file. Only a compiler started in TRACE-MODE writes one, and the
 * IDE switches that on in answer to the first exception, so the name arrives
 * with the SECOND crash, once the restarted compiler reaches the same file.
 * Reporting the crash without that name is a correct result nobody can act on.
 *
 * Poll, not a fixed sleep. Against the crash fixture the second crash came 1.6
 * to 1.9 s after the first on an idle machine, but up to 3.0 s with four IDEs
 * compiling at once, as check_examples runs them; replayed over those runs,
 * one re-read after a fixed 2 s missed the name 31% of the time. Five seconds
 * covers the slowest one measured with 2 s to spare.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {{n: number, files: string[]}} crash  a record readCrash returned
 */
export async function awaitCrashName(c, crash, { timeout = 5000 } = {}) {
  const until = Date.now() + timeout;
  while (!crash.files?.length && Date.now() < until) {
    await sleep(250);
    try {
      crash = (await readCrash(c)) ?? crash;
    } catch {
      /* keep what we have */
    }
  }
  return crash;
}

/**
 * How long, in milliseconds, the harness gives a compile to settle when its
 * caller names no time of its own. tbbuild's header states it in seconds.
 */
export const COMPILE_TIMEOUT = 180 * 1000;

// How long a compile that the wire saw end must stay the latest one before
// waitForCompile believes it. Every keystroke starts a compile a few ms after
// it, so a wait that begins just after an edit could otherwise take the compile
// before the edit's for the answer.
const EARLY_QUIET_MS = 300;

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
 * The wait ends when the sample has stood still for five seconds, or sooner
 * when `c.wire` has seen the compile end and the sample agrees with it: the
 * same counts, and a row for each. A compile the wire had already seen end
 * when the wait began does not count. A wait that follows an action --- an
 * Apply, an edit --- could otherwise begin before the action's compile and
 * take the one before it, so it waits for a newer compile, or for the sample
 * to stand still.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} o
 * @param {string} o.project          the project the IDE was started on. It is
 *   resolved before comparing, because the IDE echoes the resolved path it was
 *   given: compared as typed, a relative path never matched, and the IDE was
 *   never reported open.
 * @param {number} o.timeout          milliseconds
 * @returns {Promise<{loaded: boolean, crash: object | null, safe: boolean, drops: number,
 *                    last: string | null, blocked: boolean, early: boolean}>}
 *   `safe` is true when the IDE had fallen into Safe Mode; `last` is the final sample, as the JSON string readBuildState returned;
 *   `blocked` is attachIde's `pageBlocked`; `early` is true when `c.wire` saw
 *   the compile end and the sample agreed with it, and false when the sample
 *   stood still for five seconds instead
 */
export async function waitForCompile(c, { project, timeout }) {
  const want = normPath(path.resolve(project));
  const t0 = Date.now();
  const wire = c.wire ?? null;
  const before = wire?.mark();
  let last = null,
    stableSince = 0,
    loaded = false,
    seenUp = false,
    drops = 0,
    crash = null,
    safe = false,
    agreed = null,
    early = false;
  // Samples come once a second, as they always have, and only those count a
  // drop of the status: a sample taken early, because the wire saw a compile
  // end, could otherwise count one flap twice. Standing still is measured in
  // time, not in samples, for the same reason.
  let due = t0 + 1000;
  let next = due;
  while (Date.now() - t0 < timeout) {
    const ms = Math.max(0, next - Date.now());
    await (wire ? wire.changed(ms) : sleep(ms));
    const now = Date.now();
    const scheduled = now >= due;
    if (scheduled) due = now + 1000;
    next = due;
    let s;
    try {
      s = await readBuildState(c);
    } catch {
      continue;
    }
    const v = JSON.parse(s);
    if (!loaded) {
      if (v.p && normPath(v.p) === want) loaded = true;
      else continue;
    }
    if (v.crash) {
      // Caught on sight, but reported with the file the compiler died parsing,
      // which only a later crash names -- see awaitCrashName.
      crash = await awaitCrashName(c, v.crash);
      break;
    }
    if (v.safe) {
      safe = true;
      last = s;
      break;
    }
    const up = v.st === "tB Services: OPERATIONAL";
    if (up) seenUp = true;
    else if (seenUp && scheduled && ++drops >= 2) break;
    if (wire) {
      // The wire's compile ends with its last source file, and the sample must
      // show the same counts before it is believed: the page draws a little
      // behind its traffic. Then the compile must still be the latest after
      // EARLY_QUIET_MS, since each keystroke starts a compile of its own.
      wire.expect(v.src);
      let w = up ? wire.check(v.src) : null;
      if (w && before.done && w.seq <= before.seq) w = null;
      const counts = [v.e, v.w, v.h, v.i].map(Number);
      const total = w ? w.counts.reduce((a, b) => a + b, 0) : -1;
      if (w && w.counts.every((n, k) => n === counts[k]) && v.rows.length === total) {
        if (agreed?.seq !== w.seq) agreed = { seq: w.seq, at: now };
        else if (now - agreed.at >= EARLY_QUIET_MS) {
          last = s;
          early = true;
          break;
        }
        next = Math.min(next, agreed.at + EARLY_QUIET_MS);
      } else {
        agreed = null;
        if (w && now - w.at < 2000) next = Math.min(next, now + 50);
      }
    }
    if (!up || s !== last) stableSince = now;
    else if (now - stableSince >= 5000) break;
    last = s;
  }
  return { loaded, crash, safe, drops, last, blocked: !!c.pageBlocked, early };
}

/**
 * Turn what waitForCompile saw into diagnostics, or into the reason there are none.
 *
 * @param {object} waited      waitForCompile's result
 * @param {object} o
 * @param {string} o.name      the project as the caller should name it in a message
 * @returns {{ok: true, rows: string[], counts: number[]}
 *   | {ok: false, code: number, message: string, crashFiles?: string[]}}
 *   `counts` is errors, warnings, hints, infos. `code` is 4 for a compiler
 *   crash and 3 for a compile that never settled. For a crash `crashFiles` names,
 *   as the array `message` prints on its `last parsing:` line, the files the
 *   compiler died parsing.
 */
export function compileOutcome({ loaded, crash, safe, drops, last, blocked }, { name }) {
  // A crash is reported by the file the compiler died parsing, because in a batch
  // of generated probes that name is the whole answer: it says which sample to
  // take out, and a caller bisecting the batch has somewhere to start.
  if (crash) {
    return {
      ok: false,
      code: 4,
      message:
        `the compiler crashed ${crash.n}x -- this project takes it down` +
        (crash.files?.length ? `\nlast parsing: ${crash.files.join(", ")}` : "") +
        "\n(read the IDE's DEBUG CONSOLE with --keep for the exception detail)",
      crashFiles: crash.files ?? [],
    };
  }
  if (safe) {
    return {
      ok: false,
      code: 4,
      message:
        "the compiler crashed in a loop and the IDE fell into Safe Mode -- this project takes it down" +
        "\n(read the IDE's DEBUG CONSOLE with --keep for the exception detail)",
    };
  }
  if (drops >= 2) {
    return {
      ok: false,
      code: 4,
      message: `the compiler restarted ${drops}x -- this project crashes it\nlast status: ${last}`,
    };
  }
  if (!loaded) {
    return {
      ok: false,
      code: 3,
      message:
        `the IDE never reported ${name} as open` +
        (blocked
          ? "\nIts page did not answer when the harness attached. A dialog it opened before then " +
            "is the likely cause, and one cannot be answered over CDP; --show puts it on screen."
          : ""),
    };
  }

  const final = JSON.parse(last ?? "{}");
  const rows = (final.rows ?? []).map((r) =>
    r
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
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
      ok: false,
      code: 3,
      message: `unsettled: ${rows.length} rows against ${counts.join("/")} in the status bar`,
    };
  }
  return { ok: true, rows, counts };
}

/** The last line of a diagnostics report. */
export const summaryLine = (counts) =>
  `--- ${counts[0]} error(s), ${counts[1]} warning(s), ${counts[2]} hint(s), ${counts[3]} info`;

/** The build targets the toolbar's build configuration box offers, besides safe mode. */
export const TARGETS = ["win32", "win64"];

// The box, and the pid of the compiler the page is talking to: switching the
// target restarts the compiler, and a new pid is how to tell that it has.
const TARGET_JS = `(() => {
  if (typeof buildConfigSelector === "undefined" || !buildConfigSelector) return null;
  return JSON.stringify({
    value: buildConfigSelector.value,
    options: Array.from(buildConfigSelector.options, (o) => o.value),
    pid: typeof g_CurrentCompilerProcessId === "undefined" ? null : g_CurrentCompilerProcessId,
  });
})()`;

/**
 * Make the project's build target `arch`, win32 or win64, and wait for the
 * compile under it to settle.
 *
 * A project opens in the target the IDE remembers for its path
 * (IDESettings\targetArchitectureMemory, which lib/tb-registry.mjs tidies),
 * and in win32, the box's first option, when it remembers none. So a caller
 * that means a target sets it, even win32: otherwise an entry somebody left
 * decides the build, and nothing says so.
 *
 * The switch is the IDE's own tbBuild_SwitchToWin64 and tbBuild_SwitchToWin32
 * commands: set the box, call its onchange. That handler,
 * changedActiveBuildConfig, saves the target for the project's path and calls
 * restartCompilerSafely, which kills the compiler; the new one is the target's
 * own, twinBASIC_win64_noDEP.exe for win64, and it compiles the project again.
 * Measured on BETA 983: the status bar stays OPERATIONAL for about 250 ms
 * after the switch, and is down for about a second after that until the new
 * compiler's pid appears. waitForCompile started straight away can count that
 * as the compiler going down twice and report a crash, so the restart is waited
 * for by the pid, not by the clock.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {string} arch               "win32" or "win64"
 * @param {object} o                  as for waitForCompile
 * @returns {Promise<{from: string, waited: object | null}>} `from` is the target
 *   the project opened in; `waited` is waitForCompile's result for the compile
 *   under `arch`, or null when the project was in `arch` already
 */
export async function setBuildTarget(c, arch, { project, timeout }) {
  const read = async () => JSON.parse((await c.evaluate(TARGET_JS)) ?? "null");
  const before = await read();
  if (!before) throw new Error("this IDE has no build configuration box (buildConfigSelector)");
  if (!before.options.includes(arch)) {
    throw new Error(`the build configuration box offers ${before.options.join(", ")}, not ${arch}`);
  }
  if (before.value === arch) return { from: before.value, waited: null };
  if (!before.pid) throw new Error("the IDE has no compiler process to restart for another target");
  await c.evaluate(`buildConfigSelector.value = ${JSON.stringify(arch)}; buildConfigSelector.onchange()`);
  await awaitNewCompiler(c, before.pid, { why: `switching the build target to ${arch}` });
  const now = await read();
  if (now?.value !== arch) throw new Error(`the build target went back to ${now?.value} after the switch`);
  return { from: before.value, waited: await waitForCompile(c, { project, timeout }) };
}

/** The process id of the compiler the page is talking to, or null while there is none. */
export const compilerPid = (c) =>
  c.evaluate("typeof g_CurrentCompilerProcessId === 'undefined' ? null : g_CurrentCompilerProcessId || null");

/**
 * Wait until the page is talking to a compiler other than the one whose
 * process id was `before`, and return the new one's id.
 *
 * Whatever restarts the compiler --- a switch of build target, the toolbar's
 * restart button --- ends its process and starts another, so a new id is the
 * sign that it has happened. The status bar is not: it stays OPERATIONAL for
 * about 250 ms after a switch (see setBuildTarget).
 *
 * @param {object} c                  a tb-cdp connection
 * @param {number} before             the id of the compiler being replaced
 * @param {object} [o]
 * @param {string} [o.why]            what restarted it, for the message
 * @param {number} [o.timeout]        milliseconds (default 60000)
 */
export async function awaitNewCompiler(c, before, { why = "restarting it", timeout = 60 * 1000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    await sleep(250);
    let pid = null;
    try {
      pid = await compilerPid(c);
    } catch {
      /* the page is busy with the restart */
    }
    if (pid && pid !== before) return pid;
    if (Date.now() - t0 > timeout) {
      throw new Error(`the compiler did not restart within ${timeout / 1000} s of ${why}`);
    }
  }
}

// The build log, in the compiler's own words (its strings, BETA 983). A build
// writes "[BUILD] Starting..." to the DEBUG CONSOLE, and a binary ends with
// "[LINKER] SUCCESS created output file '<path>'" or with one of some twenty
// failure lines: "[LINKER] FAILED ...", "[BUILD] FAILED ...", "[BUILD] ERROR
// ...", "[BUILD] failed" and "[LINKER] compilation (codegen) error ...".
// A package writes "[BUILD] Creating TWINPACK file '<path>'" and then
// "[BUILD] successful." (BETA 995); it fails with "[BUILD] FAILED to create
// output file", "[BUILD] FAILED to write to output file" or "[BUILD] failed".
// The success line is matched whole: "[BUILD] successfully built Fusion server
// file" is another line.
const BUILD_START = "[BUILD] Starting...";
const BUILD_OK = /^\[LINKER\] SUCCESS created output file '(.+)'$/;
const PACKAGE_FILE = /^\[BUILD\] Creating TWINPACK file '(.+)'$/;
const PACKAGE_OK = "[BUILD] successful.";
// The last is LLVM's refusal of a procedure, which has no bracketed prefix:
// "LLVM compilation error in 'Probe.Stopper': Unable to compile due to use of
// datatype that is not yet supported for LLVM compilation" (BETA 983).
export const BUILD_FAILED =
  /^\[(?:LINKER|BUILD)\] (?:FAILED|ERROR|failed)\b|^\[LINKER\] compilation \(codegen\) error|^LLVM compilation error in /;
// A compiler that crashes while building -- measured under LLVM, BETA 995 --
// writes "<n> <time> NATIVE EXCEPTION: ..." and then restarts, and the build
// never reports again. The line carries the console's own prefix, so it is not
// anchored.
const BUILD_CRASHED = /\bNATIVE EXCEPTION:/;

/**
 * Whether the IDE's licence lets a project compile user code with LLVM.
 *
 * A Community licence ignores the LLVM settings and a Personal one applies them
 * only to the built-in packages (docs/LLVM/Getting-Started.md), so on either an
 * LLVM run measures the default compiler and says nothing. The status bar's
 * compilerLicence holds one of four "<NAME> EDITION" strings once the IDE knows
 * (ide/main.js, BETA 995), and "tB Licence: ..." until then, so it is polled.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} [o]
 * @param {number} [o.timeout]        milliseconds to wait for the licence (default 15000)
 * @returns {Promise<{licence: string | null, refusal: string | null}>} `refusal`
 *   is null when LLVM may be used, and otherwise the sentence saying why not
 */
export async function llvmLicence(c, { timeout = 15 * 1000 } = {}) {
  let licence = null;
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    licence = await c
      .evaluate("typeof compilerLicence === 'undefined' || !compilerLicence ? null : compilerLicence.innerText")
      .catch(() => null);
    if (/ EDITION$/.test(licence ?? "")) break;
    licence = null;
    await sleep(250);
  }
  if (!licence)
    return { licence, refusal: "the IDE never showed its licence, so an LLVM run could not be checked for one." };
  if (/^(?:COMMUNITY|PERSONAL) /.test(licence)) {
    return {
      licence,
      refusal:
        `this IDE has a ${licence.toLowerCase()} licence, which does not compile user code with LLVM, ` +
        "so the run would measure the default compiler. An LLVM run needs a Professional or Ultimate licence.",
    };
  }
  return { licence, refusal: null };
}

/**
 * The console's lines since `mark`, with what any clear since then erased put
 * back in front: the first clear's record from the mark's entry count on, each
 * later record whole, then the console as it is. `clearsBefore` is how many
 * clears were on record at the mark, or null when no record is kept.
 */
async function buildLines(c, mark, clearsBefore) {
  const kept = clearsBefore === null ? [] : ((await keptClears(c)) ?? []).slice(clearsBefore);
  if (!kept.length) return linesSince(c, mark);
  const split = (text) => text.split("\n").map((l) => l.trim());
  return [...split(kept[0]).slice(mark.n), ...kept.slice(1).flatMap(split), ...split((await readConsole(c)) ?? "")];
}

/**
 * Press the toolbar's Build button once the IDE will take the press.
 *
 * Two things in the IDE's page (ide/main.js) make an early press fail. The
 * licence: tbBuild_Start waits about five seconds for `licenceIsSet`, which is
 * reset on every connection to the compiler and set when the compiler answers
 * the key's validation, and then writes "[BUILD] failed due to licence error"
 * and builds nothing. And #appOverlay: a transparent element over the whole
 * page, shown while `lockUICount` is above zero, which a modal dialog raises --
 * the "Compiling..." and project-loading progress dialogs among them -- and an
 * open menu; the click then finds the button's centre covered. So this waits
 * up to `timeout` for the licence to be set and the overlay to be down. A
 * licence still not set then throws, with a picture of the page; an overlay
 * still up is left to click, whose error names what covers the button and
 * saves a picture. An IDE without either global is taken to be ready.
 *
 * @param {object} c  a tb-cdp connection
 * @param {object} [o]
 * @param {number} [o.timeout]  milliseconds (default 60000)
 */
export async function pressBuild(c, { timeout = 60 * 1000 } = {}) {
  const until = Date.now() + timeout;
  let state;
  for (;;) {
    state = await c.evaluate(`({
      licence: typeof licenceIsSet === "undefined" || licenceIsSet === true,
      unlocked: typeof lockUICount === "undefined" || !(lockUICount > 0),
    })`);
    if ((state.licence && state.unlocked) || Date.now() >= until) break;
    await sleep(100);
  }
  if (!state.licence) {
    throw new Error(
      `cannot build: the compiler had not answered the licence key's validation after ` +
        `${Math.round(timeout / 1000)} s (licenceIsSet is still false)${await pagePicture(c)}`,
    );
  }
  await click(c, "buildIcon");
}

/**
 * Build the open project, as the toolbar's Build button does, and wait for the
 * build log to say how it went.
 *
 * A binary, an EXE or a DLL, has succeeded when its log shows the linker's
 * SUCCESS line, and a package when its log names the TWINPACK file and then
 * says the build was successful.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} [o]
 * @param {number} [o.timeout]        milliseconds (default 120000)
 * @returns {Promise<{ok: boolean, file?: string, message?: string, log: string[]}>}
 *   `file` is the path the log says the build created; `log` is the console
 *   from the build's first line on
 */
export async function buildProject(c, { timeout = 120 * 1000 } = {}) {
  const mark = await consoleMark(c);
  if (!mark) {
    return {
      ok: false,
      log: [],
      message: "no debugConsoleContent.dataNodes in this IDE, " + "so the build log cannot be read",
    };
  }
  // A [RunAfterBuild] procedure runs during the build, and its Debug.Cls would
  // erase the log being read; what each clear erases is kept, and the clears
  // already on record before this build are not this build's.
  const keeping = await keepClears(c).catch(() => false);
  const clearsBefore = keeping ? ((await keptClears(c)) ?? []).length : 0;
  try {
    await pressBuild(c);
  } catch (e) {
    return { ok: false, log: [], message: e.message };
  }
  const t0 = Date.now();
  let log = [],
    failedAt = 0;
  while (Date.now() - t0 < timeout) {
    await sleep(250);
    const lines = await buildLines(c, mark, keeping ? clearsBefore : null);
    const start = lines.indexOf(BUILD_START);
    if (start < 0) continue;
    log = lines.slice(start);
    const ok = log.map((l) => BUILD_OK.exec(l)).find(Boolean);
    if (ok) return { ok: true, file: ok[1], log };
    const pkg = log.findIndex((l) => PACKAGE_FILE.test(l));
    if (pkg >= 0 && log.includes(PACKAGE_OK, pkg)) return { ok: true, file: PACKAGE_FILE.exec(log[pkg])[1], log };
    // Not every such line need end the build -- the strings include "[BUILD]
    // failed to use project.iconForm setting", and whether a build goes on
    // after that one has not been seen -- so one decides only after two
    // seconds with no success line after it.
    const failed = (l) => BUILD_FAILED.test(l) || BUILD_CRASHED.test(l);
    if (!failedAt && log.some(failed)) failedAt = Date.now();
    if (failedAt && Date.now() - failedAt > 2000) {
      return { ok: false, message: log.find(failed), log };
    }
  }
  return {
    ok: false,
    log,
    message: log.length
      ? `the build started and reported nothing for ${timeout / 1000} s`
      : `the build did not start in ${timeout / 1000} s -- is a dialog open? A template ` +
        "buildPath opens a Save dialog, which the private desktop hides",
  };
}
