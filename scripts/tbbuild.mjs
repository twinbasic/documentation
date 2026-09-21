#!/usr/bin/env node
// Compile a .twinproj and print its diagnostics, without driving the IDE by hand.
//
//     node scripts/tbbuild.mjs <project.twinproj> [options]
//
//       --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
//                         %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --port <n>        DevTools port to start the IDE on (default 9333)
//       --timeout <secs>  give up waiting for the compile (default 180)
//       --json            emit one JSON object instead of text
//       --keep            leave the IDE running afterwards
//       --show            put the IDE on your desktop, where you can watch it
//                         (default: a private desktop, so it cannot take focus)
//
// Exit codes: 0 clean, 1 the project has errors, 2 the harness failed,
// 3 the compile never settled, 4 the project crashes the compiler.
//
// ---------------------------------------------------------------- why this
//
// twinBASIC cannot compile from a command line. The compiler executable's
// whole surface is six verbs -- export, import, settings, licence, changelog,
// readme -- and none builds; the IDE executable does take `--buildAndExit32`
// and `--buildAndExit64`, but those write nothing to stdout or stderr, exit 0
// on a project the IDE flags, and do not exit at all when the build fails.
//
// The IDE's user interface, though, is a WebView2 page, and WebView2 honours
// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS. So the IDE can be started with a
// Chrome DevTools port, driven over CDP, and its DIAGNOSTICS pane read out.
// That is all this is.
//
// The diagnostics come from the IDE's own "copy compilation error report"
// walk, minus the clipboard write, so the text is exactly what that command
// would give a human.
//
// Written for the Reference/Attributes.md applicability probes -- see
// scripts/gen_attribute_probes.mjs -- but it does not know anything about
// them. See WIP.md, "Compiling a twinBASIC project without the IDE in front
// of you".
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attach } from "./lib/tb-cdp.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i < 0 ? d : args[i + 1]; };
const proj = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

// An install path is a home directory, so it is never hardcoded here: pass
// --ide, set TB_IDE, or let this find the newest BETA on the Desktop, which is
// where the IDE's own zip tells people to unpack it.
function findIDE() {
  const home = process.env.USERPROFILE;
  if (!home) return undefined;
  const desktop = path.join(home, "Desktop");
  let best;
  try {
    for (const name of readdirSync(desktop)) {
      const m = /^twinBASIC_IDE_BETA_(\d+)$/.exec(name);
      if (!m) continue;
      const exe = path.join(desktop, name, "twinBASIC.exe");
      if (!existsSync(exe)) continue;
      const build = Number(m[1]);
      if (!best || build > best.build) best = { build, exe };
    }
  } catch { /* no Desktop, or unreadable */ }
  return best?.exe;
}

const IDE = opt("ide", process.env.TB_IDE ?? findIDE());
const port = Number(opt("port", 9333));
const timeout = Number(opt("timeout", 180)) * 1000;
const asJson = flag("json");
const keep = flag("keep");
const show = flag("show");

if (!proj || flag("help")) {
  console.error("usage: node scripts/tbbuild.mjs <project.twinproj> " +
    "[--ide <twinBASIC.exe>] [--port N] [--timeout S] [--json] [--keep] [--show]");
  process.exit(2);
}
if (!IDE) {
  console.error("no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
    "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The IDE echoes projectFilePath back with whichever separators it was given.
const norm = (p) => p.split("\\").join("/").toLowerCase();

// An IDE showing a modal dialog ignores a normal close, and the launcher is
// not the process that holds the compiler, so kill the tree and force it.
function killTree(pid) {
  try { execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" }); }
  catch { /* already gone */ }
}


let child;
function shutdown() {
  if (!child || keep) return;
  killTree(child.pid);
  // The launcher holds the private desktop open; it exits once the IDE does,
  // but do not wait on that.
  try { child.launcher?.kill(); } catch { /* already gone */ }
}

function die(code, msg) {
  if (msg) console.error(msg);
  shutdown();
  process.exit(code);
}

// The project goes on the command line, so the IDE opens it as its own first
// act and no startup state has to be raced.
//
// Two things about that are easy to get wrong. `parseCommandLine()` in
// ide/main.js splits the command line on " " and pushes every token, so a
// TRAILING SPACE becomes an empty second argument and the IDE refuses the
// launch with "Bad command line syntax." PowerShell's Start-Process appends
// exactly that space; spawn with an argv array does not. And loading the
// project afterwards through root.loadProject works but lets the IDE's
// no-project startup run first, which flashes the splash and the New/Open
// Project dialog on screen before the load replaces them.
//
// By default the IDE goes on a private Windows desktop, where it cannot take
// the keyboard away from whatever you are doing. It has to be a desktop and
// not a window style: the IDE calls HostForceFocus() from its own
// window.onload, so `start /min` was tried and does not help. It compiles
// there exactly as it does on screen. `--show` opts out, for watching it work
// or for diagnosing the harness itself.
const exe = IDE.split("/").join("\\");
const target = path.resolve(proj).split("/").join("\\");
const env = {
  ...process.env,
  WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
    `--remote-debugging-port=${port} --remote-allow-origins=*`,
  WEBVIEW2_USER_DATA_FOLDER: `${process.env.TEMP}/tbbuild-wv2-${port}`,
};

if (show) {
  child = spawn(exe, [target], { detached: true, stdio: "ignore", env });
  child.unref();
} else {
  // lib/tb-launch.ps1 does the two Win32 calls Node cannot -- CreateDesktop
  // and CreateProcess with STARTUPINFO.lpDesktop. It is passed as
  // -EncodedCommand rather than run as a file, so no execution policy is
  // involved; its inputs arrive as environment variables, so there is no
  // argument quoting to get wrong. The launcher holds the desktop handle open
  // and so must outlive the IDE, hence no unref.
  const script = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "tb-launch.ps1"), "utf8");
  const ps = spawn("powershell", [
    "-NoProfile", "-NonInteractive",
    "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64"),
  ], {
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    env: { ...env, TBBUILD_EXE: exe, TBBUILD_ARG: target, TBBUILD_DESKTOP: `tbbuild-${port}` },
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
  if (!pid) die(2, `could not start the IDE on a private desktop:\n${err.trim()}\n` +
    "(--show runs it on your own desktop instead)");
  child = { pid, launcher: ps };
}

let c;
for (let i = 0; i < 60 && !c; i++) {
  await sleep(1000);
  try { c = await attach(port); } catch { /* still starting */ }
}
if (!c) die(2, "the IDE never exposed a debug port");

const dialogs = [];
c.on((m) => {
  if (m.method === "Page.javascriptDialogOpening") dialogs.push(m.params.message);
});

// Counts and rows are read in ONE evaluate. Read separately they raced: a run
// reported two diagnostics beside a zero error count, because the background
// compile finished between the two calls.
const probe = () => c.evaluate(`JSON.stringify({
  st: document.getElementById("compilerStatus")?.textContent ?? "",
  e: document.getElementById("errorCount")?.textContent ?? "",
  w: document.getElementById("warningCount")?.textContent ?? "",
  h: document.getElementById("hintCount")?.textContent ?? "",
  i: document.getElementById("infoCount")?.textContent ?? "",
  p: typeof projectFilePath !== "undefined" ? projectFilePath : null,
  rows: (() => {
    let out = [], t = 1;
    if (typeof problemsPanel === "undefined" || !problemsPanel) return out;
    while (true) {
      t = problemsPanel.tree.view.data.getNextVisibleNode2(t, false, true);
      if (!t) break;
      const o = problemsPanel.tree.view.data.generateNodeInfo(t);
      const n = generateCopyPasteTextForProblem(o, true);
      if (n) out.push(n);
    }
    return out;
  })() })`);

// twinBASIC runs the compiler in the same process as user code, so a project
// can take it down; the IDE then restarts it, three times, before giving up.
// Watching the status leave OPERATIONAL after it has reached it turns that
// from a silent two-minute wait into a reported result.
const t0 = Date.now();
let last = null, stable = 0, loaded = false, seenUp = false, drops = 0;
while (Date.now() - t0 < timeout) {
  await sleep(1000);
  let s;
  try { s = await probe(); } catch { continue; }
  const v = JSON.parse(s);
  if (!loaded) { if (v.p && norm(v.p) === norm(proj)) loaded = true; else continue; }
  const up = v.st === "tB Services: OPERATIONAL";
  if (up) seenUp = true; else if (seenUp && ++drops >= 2) break;
  if (up && s === last) { if (++stable >= 5) break; } else stable = 0;
  last = s;
}

if (drops >= 2) {
  die(4, `the compiler restarted ${drops}x -- this project crashes it\nlast status: ${last}`);
}
if (!loaded) die(3, `the IDE never reported ${proj} as open`);

const final = JSON.parse(last ?? "{}");
const rows = (final.rows ?? []).map((r) =>
  r.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
const counts = ["e", "w", "h", "i"].map((k) => Number(final[k] ?? 0));

// A row count that disagrees with the status bar means the compile was still
// moving when the sample was taken. Refuse rather than report either number.
if (counts.reduce((a, b) => a + b, 0) !== rows.length) {
  die(3, `unsettled: ${rows.length} rows against ${counts.join("/")} in the status bar`);
}

if (asJson) {
  console.log(JSON.stringify({
    project: proj,
    errors: counts[0], warnings: counts[1], hints: counts[2], infos: counts[3],
    diagnostics: rows, dialogs,
  }, null, 2));
} else {
  for (const r of rows) console.log(r);
  console.log(`--- ${counts[0]} error(s), ${counts[1]} warning(s), ` +
    `${counts[2]} hint(s), ${counts[3]} info`);
  if (dialogs.length) console.log("dialogs:", JSON.stringify(dialogs));
}

c.close();
shutdown();
process.exit(counts[0] > 0 ? 1 : 0);
