// Build a twinBASIC probe and capture what it writes to the DEBUG CONSOLE.
//
//     node scripts/tbrun.mjs <source-dir> [options]
//
//       --port <n>        DevTools port to start the IDE on (default 9346)
//       --timeout <secs>  give up waiting for console output (default 120)
//       --quiet <ms>      output is complete after this long with no change
//                         (default 2500)
//       --json            emit one JSON object instead of text
//       --raw             do not strip the console's timestamp column
//       --keep            leave the IDE running afterwards
//       --show / --hide   passthrough to tbbuild
//
// Exit: 0 captured output, 1 the project has compile errors, 2 the harness
// failed, 3 the build produced no console output before the timeout.
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
// ------------------------------------------------- five things it gets right
//
// Each of these cost an hour when the probe was first done by hand.
//
//  1. THE BUILD PATH MUST BE AN EXPLICIT FILE. A project whose
//     `project.buildPath` is still the default `${SourcePath}\Build\...`
//     template opens a native Save dialog on the build -- and because tbbuild
//     runs the IDE on a private desktop, that dialog is invisible, takes no
//     input, and the build simply never happens. Nothing reports it: the
//     WebView2 renderer stays responsive, so even a CDP health check says the
//     IDE is fine. This script therefore owns the tree and pins buildPath to a
//     concrete file before importing, which makes the trap unreachable.
//  2. A JAVASCRIPT .click() ON THE BUILD BUTTON DOES NOTHING. `#buildIcon` is
//     a plain DIV wired through the IDE's own pointer handling; it needs real
//     CDP Input.dispatchMouseEvent presses at its centre.
//  3. THE CONSOLE INTERLEAVES A TIMESTAMP LINE per output line, because the
//     pane's "Show Timestamps" option is on by default. Those lines are the
//     pane's, not the program's, and are stripped unless --raw.
//  4. START THE PROBE WITH Debug.Cls. The DEBUG CONSOLE is also where the IDE
//     writes its own build log, and the linker writes there after the build --
//     so without a clear, a probe's output comes back interleaved with
//     [LINKER] lines. The script warns when a probe omits it.
//  5. QUIET-PERIOD, NOT A MARKER. Waiting for a sentinel string means every
//     probe has to print one and the script has to know it. Waiting for the
//     console to stop changing works for any probe.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync,
         cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attach } from "./lib/tb-cdp.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const die = (code, msg) => { console.error(msg); process.exit(code); };

const positional = argv.filter((a, i) =>
  !a.startsWith("--") && !(i > 0 && ["port", "timeout", "quiet", "ide"].includes(argv[i - 1]?.replace(/^--/, ""))));

if (!positional.length || flag("help")) {
  die(2, "usage: node scripts/tbrun.mjs <source-dir> [--port N] [--timeout S] " +
         "[--quiet MS] [--json] [--raw] [--keep] [--show|--hide]");
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

// ---------------------------------------------------------------- the IDE

function findIde() {
  const explicit = opt("ide", process.env.TB_IDE);
  if (explicit) return explicit;
  const desk = path.join(process.env.USERPROFILE ?? "", "Desktop");
  const dirs = existsSync(desk)
    ? readdirSync(desk).filter((d) => /^twinBASIC_IDE_BETA_\d+$/.test(d))
    : [];
  if (!dirs.length) return null;
  dirs.sort((a, b) => Number(a.match(/\d+$/)[0]) - Number(b.match(/\d+$/)[0]));
  return path.join(desk, dirs[dirs.length - 1], "twinBASIC.exe");
}

const ide = findIde();
if (!ide || !existsSync(ide)) {
  die(2, "no twinBASIC IDE found. Pass --ide <twinBASIC.exe> or set TB_IDE.");
}
const compilerExe = path.join(path.dirname(ide), "bin", "twinBASIC_win32.exe");
if (!existsSync(compilerExe)) die(2, `no compiler beside the IDE at ${compilerExe}`);

// ------------------------------------------------- pin the build output (1)

const work = path.join(tmpdir(), "tbrun");
mkdirSync(work, { recursive: true });

// Staged into a temp copy rather than edited in place. Pinning buildPath is what
// makes the invisible Save dialog unreachable, but it is still a change to the
// caller's project, and a probe harness that rewrites the tree you pointed it at
// is one you stop trusting with a real project.
const stage = path.join(work, "src");
rmSync(stage, { recursive: true, force: true });
cpSync(srcDir, stage, { recursive: true });
const stagedSettings = path.join(stage, "Settings");
const exePath = path.join(work, "tbrun-probe.exe");
const projPath = path.join(work, "tbrun-probe.twinproj");

const settings = JSON.parse(readFileSync(stagedSettings, "utf8"));
const wasTemplate = /\$\{/.test(settings["project.buildPath"] ?? "");
settings["project.buildPath"] = exePath;
// Two probes sharing a project.id confuse the IDE's recents list.
settings["project.id"] = "{7B247000-0000-4000-9000-7B2470000001}";
writeFileSync(stagedSettings, JSON.stringify(settings, null, "\t"), "utf8");

const sourceText = (() => {
  const dir = path.join(stage, "Sources");
  if (!existsSync(dir)) return "";
  return readdirSync(dir).filter((f) => f.endsWith(".twin"))
    .map((f) => readFileSync(path.join(dir, f), "utf8")).join(String.fromCharCode(10));
})();
const hasHook = /\[RunAfterBuild\]/i.test(sourceText);
const hasCls = /Debug\s*\.\s*Cls/i.test(sourceText);
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

// import's exit code is 0 whether it worked or not, so test the output.
const packed = execFileSync(compilerExe, ["import", projPath, stage, "--overwrite"],
                            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
if (!/\.\.\. DONE\s*$/.test(packed.trim())) {
  die(2, `packing failed:\n${packed.trim().split("\n").slice(-3).join("\n")}`);
}

// ------------------------------------------------------ compile, via tbbuild

const here = path.dirname(fileURLToPath(import.meta.url));
const passthrough = ["--keep", "--port", String(port)];
if (flag("show")) passthrough.push("--show");
if (flag("hide")) passthrough.push("--hide");

const build = spawn(process.execPath, [path.join(here, "tbbuild.mjs"), projPath, ...passthrough],
                    { stdio: ["ignore", "pipe", "pipe"] });
let buildOut = "";
build.stdout.on("data", (d) => { buildOut += d; });
build.stderr.on("data", (d) => { buildOut += d; });
const buildCode = await new Promise((res) => build.on("exit", res));

if (buildCode !== 0) {
  process.stdout.write(buildOut);
  killIde();
  process.exit(buildCode === 1 ? 1 : 2);
}

// --------------------------------------------- build the exe, read the console

const CONSOLE_JS = `(() => {
  const tw = [...document.querySelectorAll(".toolWindowContainer")]
    .find(e => /DEBUG CONSOLE/i.test(e.textContent || ""));
  return tw ? (tw.innerText || "") : null;
})()`;

let captured = null, failure = null;
try {
  const cdp = await attach(port);

  const rect = await cdp.evaluate(`(() => {
    const b = document.getElementById("buildIcon");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
  })()`);
  if (!rect || !rect.w) throw new Error("no #buildIcon in the IDE page -- did the project load?");

  // (2) a real press/release pair; element.click() is ignored.
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent",
                   { type, x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  }

  // (4) settle on a quiet period rather than a sentinel.
  const started = Date.now();
  let last = "", lastChange = Date.now(), seen = false;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    const now = await cdp.evaluate(CONSOLE_JS);
    if (now === null) throw new Error("the DEBUG CONSOLE pane is not open in this IDE");
    if (now !== last) { last = now; lastChange = Date.now(); if (strip(now).length) seen = true; }
    else if (seen && Date.now() - lastChange > quietMs) break;
  }
  captured = strip(last);
  cdp.close();
} catch (e) {
  failure = e.message;
}

if (!flag("keep")) killIde();

if (failure) die(2, `tbrun: ${failure}`);
if (!captured.length) {
  die(3, "tbrun: the build produced no console output before the timeout.\n" +
         (hasHook ? "  The [RunAfterBuild] Sub may not have run -- check the IDE for a modal."
                  : "  There is no [RunAfterBuild] Sub to produce any.") +
         (wasTemplate ? "" : "\n  buildPath was already explicit, so a Save dialog is unlikely."));
}

if (flag("json")) {
  console.log(JSON.stringify({ exe: exePath, lines: captured }, null, 2));
} else {
  for (const l of captured) console.log(l);
}

// ------------------------------------------------------------------ helpers

// (3) drop the pane's own chrome: the header, the input prompt, and the
// timestamp line the console emits beside every output line.
function strip(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const out = [];
  for (const raw of lines) {
    const l = raw.replace(/\r$/, "");
    if (/^DEBUG CONSOLE$/.test(l.trim())) continue;
    if (l.trim() === ">") continue;
    if (!flag("raw") && /^\s*\d{2}:\d{2}:\d{2}\.\d+\s*$/.test(l)) continue;
    out.push(l);
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function killIde() {
  for (const image of ["twinBASIC.exe", "twinBASIC_win32.exe", "twinBASIC_win32_noDEP.exe"]) {
    try { execFileSync("taskkill", ["/F", "/T", "/IM", image], { stdio: "ignore" }); } catch {}
  }
}
