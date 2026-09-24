// Build a twinBASIC probe and capture what it writes to the DEBUG CONSOLE.
//
//     node scripts/tbrun.mjs <source-dir> [options]
//
//       --port <n>        DevTools port to start the IDE on (default 9346)
//       --arch <target>   win32 or win64 (default win32): the target to build
//                         for, and so the process the probe runs in -- a win64
//                         probe runs in the IDE's 64-bit compiler
//       --timeout <secs>  give up waiting for console output (default 120)
//       --quiet <ms>      output is complete after this long with no change
//                         (default 2500)
//       --json            emit one JSON object instead of text
//       --raw             do not strip the console's timestamp column
//       --keep            leave the IDE running afterwards (implies --no-reap)
//       --no-reap         do not harvest automation servers the probe left behind
//       --reap-images     comma-separated image names to harvest
//                         (default: the Office suite -- see REAP_IMAGES)
//       --show / --hide   as tbbuild's
//
// Exit: 0 captured output, 1 the project has compile errors, 2 the harness
// failed -- a build that fails after a clean compile included, since the probe
// never runs -- 3 the build produced no console output before the timeout.
//
// ---------------------------------------------------------------- why
//
// tbbuild.mjs answers "does this compile". It cannot answer "what does this
// print", and some questions only runtime can settle -- the one that prompted
// this script was the width of a Debug.Print print zone, which no shipped
// source demonstrates and no amount of reading the documentation established.
// (14 characters, and positive numbers carry a leading sign space, so values
// land at columns 1, 15, 29 rather than 0, 14, 28. Measured with this.)
//
// The mechanism is the [RunAfterBuild] attribute: a Sub marked with it runs in
// the IDE once the exe is built, so anything it writes with Debug.Print lands
// in the IDE's DEBUG CONSOLE, where this script reads it back over CDP.
//
// It starts and reads the IDE through scripts/lib/tb-ide.mjs, the same code
// tbbuild uses, rather than by running tbbuild as a child process. As a child
// it was handed neither --ide nor the IDE this script had packed with, so the
// two could be different installs, and the pid it had to kill came back as a
// line of text to parse.
//
// ----------------------------------------------- seven things it gets right
//
// Each of these cost an hour when the probe was first done by hand.
//
//  1. THE BUILD PATH MUST BE IN AN EXPLICIT FOLDER. A project whose
//     `project.buildPath` is still the default `${SourcePath}\Build\...`
//     template opens a native Save dialog on the build -- and because the
//     IDE runs on a private desktop, that dialog is invisible, takes no
//     input, and the build simply never happens. Nothing reports it: the
//     WebView2 renderer stays responsive, so even a CDP health check says the
//     IDE is fine. This script therefore owns the tree and pins buildPath to
//     its own out folder before importing, which makes the trap unreachable
//     (lib/tb-project.mjs, shared with the add-in harness). The file name is
//     the IDE's own `${ProjectName}_${Architecture}.${FileExtension}`, so it
//     says what was built: measured on BETA 983, those variables in an
//     explicit folder open no dialog, and give ArchProbe_win32.exe and
//     ArchProbe_win64.exe.
//  2. A JAVASCRIPT .click() ON THE BUILD BUTTON DOES NOTHING. `#buildIcon` is
//     a plain DIV wired through the IDE's own pointer handling; it needs real
//     CDP Input.dispatchMouseEvent presses at its centre (tb-ide's
//     clickCenter).
//  3. READ THE CONSOLE'S BACKING ARRAY, NOT THE PANE. The DEBUG CONSOLE is a
//     virtualised list view: only the rows that fit are in the DOM, so an
//     `.innerText` scrape of it returns the tail of a long probe and looks
//     exactly like a complete capture. Measured against the old reader: a
//     probe printing 120 lines came back with 11. tb-ide's readConsole reads
//     `debugConsoleContent.dataNodes`, the whole log, and explains the rest.
//  4. START THE PROBE WITH Debug.Cls. The DEBUG CONSOLE is also where the IDE
//     writes its own build log, and the linker writes there after the build --
//     so without a clear, a probe's output comes back interleaved with
//     [LINKER] lines. The script warns when a probe omits it.
//  5. QUIET-PERIOD, NOT A MARKER. Waiting for a sentinel string means every
//     probe has to print one and the script has to know it. Waiting for the
//     console to stop changing works for any probe.
//  6. EVERY RUN OWNS ITS OWN WORKSPACE AND KILLS ONLY ITS OWN IDE. Both were
//     shared, and both broke concurrency in ways that looked like something
//     else. The staging directory was a fixed %TEMP%/tbrun/src, so a second
//     run rmSync'd the first one's tree out from under it -- observed as an
//     EPERM from a script that had touched no such path. Worse, shutdown was
//     `taskkill /F /T /IM twinBASIC.exe`, which is machine-wide: it ended
//     every concurrent run's IDE, and the IDE you had open yourself. The work
//     directory and the project.id are now keyed to --port, and the IDE is
//     killed by the pid its launch returned.
//  7. A COM SERVER THE PROBE STARTED IS NOT A CHILD OF ANYTHING WE OWN.
//     CreateObject("Excel.Application") is activated by DCOM, so the EXCEL.EXE
//     that appears has svchost.exe for a parent -- measured. No tree kill can
//     reach it, and a probe that throws before app.Quit leaves it running
//     forever. Harvesting it therefore has to be a before/after diff, which is
//     a blunt enough instrument to need the guard rails in reapOrphans().

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, statSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compilerExe, findIde } from "./lib/tb-install.mjs";
import { TARGETS, attachIde, clickCenter, compileOutcome, killTree, launchIde, readConsole,
         setBuildTarget, shutdownIde, summaryLine, waitForCompile, wantShow } from "./lib/tb-ide.mjs";
import { laneProjectId, stageProject } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const die = (code, msg) => { console.error(msg); process.exit(code); };

// Every flag that TAKES A VALUE has to be named here, or its value is mistaken
// for the source directory.
const VALUE_FLAGS = ["port", "arch", "timeout", "quiet", "ide", "reap-images"];
const positional = argv.filter((a, i) =>
  !a.startsWith("--") && !(i > 0 && VALUE_FLAGS.includes(argv[i - 1]?.replace(/^--/, ""))));
const arch = opt("arch", TARGETS[0]);

if (!positional.length || flag("help") || !TARGETS.includes(arch)) {
  die(2, "usage: node scripts/tbrun.mjs <source-dir> [--port N] [--arch win32|win64] " +
         "[--timeout S] [--quiet MS] [--json] [--raw] [--keep] [--no-reap] " +
         "[--reap-images a,b] [--show|--hide]");
}

const srcDir = path.resolve(positional[0]);
if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
  die(2, `not a directory: ${srcDir}\n` +
         `tbrun takes an exported source tree (the folder holding Sources/ and Settings), ` +
         `because it has to pin the build path before packing. Export one with:\n` +
         `  twinBASIC_win32.exe export <project.twinproj> <dir>\\ --overwrite`);
}

const settingsPath = path.join(srcDir, "Settings");
if (!existsSync(settingsPath)) die(2, `no Settings file in ${srcDir}`);

const port = Number(opt("port", 9346));
const timeoutMs = Number(opt("timeout", 120)) * 1000;
const quietMs = Number(opt("quiet", 2500));

// Images a probe can leave behind through COM activation. Office is the set that
// prompted this; --reap-images replaces the list for anything else. Only out-of-
// process (LocalServer32) servers can outlive the probe at all -- an in-process
// one dies with it -- so this list is short by nature rather than by omission.
const REAP_IMAGES = [
  "excel", "winword", "powerpnt", "msaccess", "outlook",
  "onenote", "mspub", "visio", "winproj",
];

// ---------------------------------------------------------------- the IDE

// One install packs the tree and builds it. --ide, then TB_IDE, then the
// newest BETA on the Desktop, as for every other tool here.
const ide = findIde(opt("ide", undefined));
if (!ide || !existsSync(ide)) {
  die(2, "no twinBASIC IDE found. Pass --ide <twinBASIC.exe> or set TB_IDE.");
}
const COMPILER = compilerExe(ide);
if (!existsSync(COMPILER)) die(2, `no compiler beside the IDE at ${COMPILER}`);

// ------------------------------------------------- pin the build output (1)

// (6) The workspace is keyed to --port, which is already the thing that has to
// differ between concurrent runs -- the IDE's DevTools port, its WebView2 user
// data folder and its private desktop are all keyed to it in tb-ide. Sharing
// one %TEMP%/tbrun/src meant the second run deleted the first one's tree.
const runKey = String(port);
const work = path.join(tmpdir(), "tbrun", runKey);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

// Staged into a temp copy rather than edited in place, with buildPath pinned to
// the run's own out folder and a project.id keyed to the port
// (lib/tb-project.mjs). The file is named as the IDE's own template names it,
// so the build type and the target are in the name (1).
const stage = path.join(work, "src");
const outDir = path.join(work, "out");
mkdirSync(outDir, { recursive: true });
const buildPath = path.join(outDir, "${ProjectName}_${Architecture}.${FileExtension}");
const projPath = path.join(work, "tbrun-probe.twinproj");

const sourceText = (() => {
  const dir = path.join(srcDir, "Sources");
  if (!existsSync(dir)) return "";
  return readdirSync(dir).filter((f) => f.endsWith(".twin"))
    .map((f) => readFileSync(path.join(dir, f), "utf8")).join(String.fromCharCode(10));
})();
const hasHook = /\[RunAfterBuild\]/i.test(sourceText);
const hasCls = /Debug\s*\.\s*Cls/i.test(sourceText);
// The console also carries the IDE's own build log, and the linker writes to it
// AFTER the build -- so a probe that does not clear the console first comes back
// with its output mixed into [LINKER] chatter. Debug.Cls as the probe's first
// statement is what makes the capture clean, and it is cheap to check for.
if (!hasHook) {
  console.error("warning: no [RunAfterBuild] in Sources/*.twin -- nothing of yours will " +
                "run after the build, so you will capture the IDE's build log and nothing else.");
} else if (!hasCls) {
  console.error("warning: the probe does not call Debug.Cls -- the IDE's build log will be " +
                "mixed into the captured output. Make Debug.Cls the first statement.");
}

// ------------------------------------------------------------------- pack

// A packing failure is the harness's, exit 2.
let wasTemplate = false, projectName = "";
try {
  const staged = stageProject({
    src: srcDir, stage, project: projPath, compiler: COMPILER,
    settings: { "project.buildPath": buildPath, "project.id": laneProjectId(0, port) },
  });
  wasTemplate = /\$\{/.test(staged.original["project.buildPath"] ?? "");
  projectName = String(staged.settings["project.name"] ?? "");
} catch (e) {
  die(2, e.message);
}

// What the build wrote: the IDE expands the template, so the name is looked for
// rather than assumed -- ${FileExtension} follows the build type -- and the
// binary is told from anything written beside it by its "MZ" header.
function builtFile() {
  const stem = `${projectName}_${arch}.`.toLowerCase();
  for (const f of readdirSync(outDir).filter((n) => n.toLowerCase().startsWith(stem))) {
    const file = path.join(outDir, f);
    try { if (readFileSync(file).subarray(0, 2).toString("latin1") === "MZ") return file; } catch { /* gone */ }
  }
  return null;
}

// ---------------------------------------------------------------- compile

// (7) Taken before the IDE starts, so anything in it is somebody else's and is
// never a candidate for harvesting. Cheap enough to be unconditional (~0.4 s
// against a ~10 s run) and skipping it under --no-reap would only make the two
// paths differ in a way nobody would remember.
const processesBefore = snapshotProcesses();

// Everything this run opens is under `work`, so the IDE's registry entries for
// it -- its recent list and its saved project state, see lib/tb-registry.mjs --
// are swept by that folder once the IDE has exited, along with any an earlier
// run on this port left behind. Not under --keep: a kept IDE is still writing.
const tidy = flag("keep") ? null : startTidy({ prefixes: [work] });

let ideRun = null;
// A failure before the console is read: said on stdout, as it was when this
// phase was tbbuild's output relayed, and ended with tbbuild's meaning of 1
// (compile errors) or 2 (anything else).
function failBuild(code, text) {
  process.stdout.write(text + "\n");
  shutdown();
  process.exit(code);
}

try {
  ideRun = await launchIde({
    exe: ide, project: projPath, port, keep: flag("keep"),
    show: wantShow({ show: flag("show"), hide: flag("hide") }),
  });
} catch (e) {
  failBuild(2, e.message);
}

const cdp = await attachIde(port);
if (!cdp) failBuild(2, "the IDE never exposed a debug port");

let outcome = compileOutcome(
  await waitForCompile(cdp, { project: projPath, timeout: 180 * 1000 }), { name: projPath });
if (!outcome.ok) failBuild(2, outcome.message);

// The target, set on every run, win32 included (setBuildTarget says why). The
// probe runs in the compiler that builds it, so under win64 it runs in the
// IDE's 64-bit compiler, twinBASIC_win64_noDEP.exe, as a 64-bit process:
// measured on BETA 983 with LenB of a LongPtr, ProcessorArchitecture(),
// PROCESSOR_ARCHITECTURE, IsWow64Process and the module path of the process.
try {
  const target = await setBuildTarget(cdp, arch, { project: projPath, timeout: 180 * 1000 });
  // Only a target the IDE remembered is worth a word: a new path opens in win32.
  if (target.from !== TARGETS[0]) {
    console.error(`note: the IDE remembered ${target.from} for this path; the probe is built for ${arch}`);
  }
  if (target.waited) {
    outcome = compileOutcome(target.waited, { name: projPath });
    if (!outcome.ok) failBuild(2, outcome.message);
  }
} catch (e) {
  failBuild(2, e.message);
}
if (outcome.counts[0] > 0) {
  failBuild(1, [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
}

// --------------------------------------------- build the exe, read the console

let captured = null, failure = null;
try {
  // (2) a real press/release pair; element.click() is ignored.
  if (!await clickCenter(cdp, "buildIcon")) {
    throw new Error("no #buildIcon in the IDE page -- did the project load?");
  }

  // (5) settle on a quiet period rather than a sentinel.
  const started = Date.now();
  let last = "", lastChange = Date.now(), seen = false;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    const now = await readConsole(cdp, { timestamps: flag("raw") });
    if (now === null) {
      throw new Error("no debugConsoleContent.dataNodes in this IDE -- the DEBUG CONSOLE " +
                      "was never created, or this build moved it. Refusing rather than " +
                      "falling back to scraping the pane, which silently truncates.");
    }
    if (now !== last) { last = now; lastChange = Date.now(); if (strip(now).length) seen = true; }
    else if (seen && Date.now() - lastChange > quietMs) break;
  }
  captured = strip(last);
  cdp.close();
} catch (e) {
  failure = e.message;
}

const reaped = shutdown();

if (failure) die(2, `tbrun: ${failure}`);
// A build that fails after a clean compile never runs the probe, and leaves the
// IDE's own build log in the console. The probe's first statement is Debug.Cls,
// which would have erased that log, so its survival means the capture is not the
// probe's output. Returned as output, a `[TYPELIB] failed to finalize
// typelibrary` build exited 0 twice in round 8's fix pass.
if (captured.some((l) => /^\[(BUILD\]\s+failed|LINKER\]\s+FAILED)\b/i.test(l))) {
  die(2, "tbrun: the build failed, so the probe never ran. The console holds the IDE's " +
         `build log, not the probe's output:\n${captured.map((l) => `  ${l}`).join("\n")}`);
}
if (!captured.length) {
  die(3, "tbrun: the build produced no console output before the timeout.\n" +
         (hasHook ? "  The [RunAfterBuild] Sub may not have run -- check the IDE for a modal."
                  : "  There is no [RunAfterBuild] Sub to produce any.") +
         (wasTemplate ? "" : "\n  buildPath was already explicit, so a Save dialog is unlikely."));
}

if (flag("json")) {
  console.log(JSON.stringify({ exe: builtFile(), arch, lines: captured, idePid: ideRun?.pid ?? null,
                               reaped }, null, 2));
} else {
  for (const l of captured) console.log(l);
}

// ------------------------------------------------------------------ helpers

// Trim blank lines off both ends. That is all this has to do now: reading
// dataNodes rather than the pane means the header, the ">" input prompt and
// the timestamp column never arrive in the first place, so the three filters
// that used to live here are gone along with the guesswork in them.
function strip(text) {
  if (!text) return [];
  const out = text.split("\n").map((l) => l.replace(/\r$/, ""));
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

// (6) End OUR IDE by pid, never by image name. The tree kill takes the probe exe
// and anything it spawned with CreateProcess; what it cannot take is a COM
// server, which is what reapOrphans is for.
function shutdown() {
  if (flag("keep")) return null;          // the IDE is the caller's problem now
  shutdownIde(ideRun);
  finishTidy(tidy);
  return flag("no-reap") ? null : reapOrphans();
}

// Identity is pid + start time, because a pid alone is reused and a run that
// reaped a recycled pid would be killing a stranger.
function snapshotProcesses() {
  const ps = "Get-Process | Select-Object Id, ProcessName, " +
    "@{n='Start';e={try{$_.StartTime.ToFileTimeUtc()}catch{0}}}, " +
    "@{n='Win';e={$_.MainWindowTitle}} | ConvertTo-Json -Compress";
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps],
                             { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
                               maxBuffer: 32 * 1024 * 1024 });
    const parsed = JSON.parse(out);
    return new Map((Array.isArray(parsed) ? parsed : [parsed])
      .map((p) => [`${p.Id}:${p.Start}`, p]));
  } catch {
    return null;                          // reaping degrades to off, never to guessing
  }
}

// A COM server started by the probe has svchost.exe for a parent (measured), so
// there is no ancestry to walk and this has to be a before/after diff. Three
// guard rails, because a diff over a live machine is a blunt instrument:
//
//   - it must be NEW -- present now, absent from the pre-launch snapshot;
//   - its image must be on REAP_IMAGES, so an unrelated process that happened
//     to start during the run is never a candidate;
//   - it must have NO main window, which is what separates a server the probe
//     activated from the copy of Excel the user opened to look at a spreadsheet.
//
// Anything new and on the list but WINDOWED is reported and left alone. That is
// the case where the evidence is ambiguous, and killing it could discard
// somebody's unsaved work.
//
// Known limit: two concurrent runs both driving Excel cannot tell their servers
// apart, so whichever finishes first harvests both. Pass --no-reap for that and
// sweep once at the end of the batch.
function reapOrphans() {
  if (!processesBefore) return null;
  const after = snapshotProcesses();
  if (!after) return null;

  const images = new Set((opt("reap-images", "") || "")
    .split(",").map((s) => s.trim().toLowerCase().replace(/\.exe$/, "")).filter(Boolean));
  const wanted = images.size ? images : new Set(REAP_IMAGES);

  const killed = [], skipped = [];
  for (const [key, p] of after) {
    if (processesBefore.has(key)) continue;
    if (!wanted.has(String(p.ProcessName).toLowerCase())) continue;
    if (p.Win && String(p.Win).trim()) { skipped.push(p); continue; }
    killTree(p.Id);
    killed.push({ pid: p.Id, image: p.ProcessName });
  }

  for (const p of skipped) {
    console.error(`note: ${p.ProcessName} (pid ${p.Id}) started during this run but has a ` +
                  `window open, so it was left alone -- close it yourself if it is a leak.`);
  }
  if (killed.length) {
    console.error("reaped: " + killed.map((k) => `${k.image} (pid ${k.pid})`).join(", "));
  }
  return killed;
}
