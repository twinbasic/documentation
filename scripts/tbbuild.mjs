#!/usr/bin/env node
// Compile a .twinproj and print its diagnostics, without driving the IDE by hand.
//
//     node scripts/tbbuild.mjs <project.twinproj> [options]
//
//       --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
//                         %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --port <n>        DevTools port to start the IDE on (default 9333)
//       --arch <target>   win32 or win64 (default win32): the target to
//                         compile for. #If Win64 and LongPtr's size change
//                         what compiles, and a project opens in whatever
//                         target the IDE remembers for its path, so the
//                         target is set on every run, win32 included.
//       --timeout <secs>  give up waiting for the compile (default 180)
//       --json            emit one JSON object instead of text
//       --keep            leave the IDE running afterwards. The IDE's pid is
//                         then printed as `ide-pid: N` (and is always in --json
//                         as `idePid`), because whoever inherits a kept IDE has
//                         to be able to end that one rather than every IDE on
//                         the machine.
//       --show / --hide   put the IDE on your desktop where you can watch it,
//                         or on a private one where it cannot take focus.
//                         Default: hidden, unless TBBUILD_SHOW is set --
//                         export that for a session you are watching.
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
// That is all this is. The mechanics -- starting the IDE, attaching, waiting
// for the compile, reading the diagnostics -- live in scripts/lib/tb-ide.mjs,
// which scripts/tbrun.mjs shares; this file is the command line around them.
//
// The diagnostics come from the IDE's own "copy compilation error report"
// walk, minus the clipboard write, so the text is exactly what that command
// would give a human.
//
// Written for the Reference/Attributes.md applicability probes -- see
// scripts/gen_attribute_probes.mjs -- but it does not know anything about
// them. See WIP.Harness.md, "Compiling a twinBASIC project without the IDE in
// front of you".
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { findIde } from "./lib/tb-install.mjs";
import { TARGETS, attachIde, compileOutcome, launchIde, setBuildTarget, shutdownIde,
         summaryLine, waitForCompile, wantShow } from "./lib/tb-ide.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i < 0 ? d : args[i + 1]; };

function usage(why) {
  if (why) console.error(why);
  console.error("usage: node scripts/tbbuild.mjs <project.twinproj> " +
    "[--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--timeout S] [--json] " +
    "[--keep] [--show|--hide]");
  process.exit(2);
}

// Every flag that TAKES A VALUE is named here, as in tbrun. The token after
// one is its value, never the project; the token after any other flag can be
// the project, as in `--keep proj`. One given last, or followed by another
// flag, has no value, and is refused rather than read as undefined.
const VALUE_FLAGS = ["ide", "port", "arch", "timeout"];
const takesValue = (a) => a?.startsWith("--") && VALUE_FLAGS.includes(a.slice(2));
const bare = args.find((a, i) =>
  takesValue(a) && (args[i + 1] === undefined || /^-./.test(args[i + 1])));
if (bare) usage(`${bare} needs a value`);
const proj = args.find((a, i) => !a.startsWith("--") && !takesValue(args[i - 1]));

// A number that is not positive, or a port that is not whole, is refused too.
// Anything Number() cannot read is NaN, and a NaN timeout ends
// waitForCompile's loop before its first pass, which then reports that the IDE
// never opened the project.
function positive(n, d, { whole = false } = {}) {
  const v = Number(opt(n, d));
  if (!(v > 0) || (whole && !Number.isInteger(v))) {
    usage(`--${n} takes a positive ${whole ? "whole " : ""}number`);
  }
  return v;
}

// An install path is a home directory, so it is never hardcoded here: pass
// --ide, set TB_IDE, or let tb-install find the newest BETA on the Desktop,
// which is where the IDE's own zip tells people to unpack it.
const IDE = findIde(opt("ide", undefined));
const port = positive("port", 9333, { whole: true });
const arch = opt("arch", TARGETS[0]);
const timeout = positive("timeout", 180) * 1000;
const asJson = flag("json");
const keep = flag("keep");
const show = wantShow({ show: flag("show"), hide: flag("hide") });

if (!proj || flag("help") || !TARGETS.includes(arch)) usage();
// Refuse anything that is not a .twinproj, rather than discovering it two
// minutes later. A source directory is the tempting mistake -- it is what
// `tbrun` takes -- and handing one to the IDE does not fail: the IDE starts,
// the renderer answers CDP normally, and nothing ever reports the project as
// open, so this exits 3 ("the compile never settled") after the full timeout
// and reads like a wedged IDE. Pack the tree first, or use tbrun, which packs
// it for you.
if (proj && !/\.twinproj$/i.test(proj)) {
  console.error(`not a .twinproj: ${proj}\n` +
    (existsSync(proj) && statSync(proj).isDirectory()
      ? "  That is a source tree. tbbuild takes a packed project; scripts/tbrun.mjs\n" +
        "  takes a source tree, and packs it for you."
      : "  tbbuild takes a packed project file."));
  process.exit(2);
}
// A path that merely ENDS in .twinproj gets the same treatment, because the
// IDE's behaviour is identical: it launches, the renderer answers CDP, and
// the project is never reported open. Checking the extension alone still left
// a typo'd or deleted path costing the full timeout.
if (proj && !existsSync(proj)) {
  console.error(`no such project: ${proj}`);
  process.exit(2);
}
if (!IDE) {
  console.error("no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
    "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
  process.exit(2);
}

let ide;
let tidy = null;
// Tidies whether or not an IDE was started, as tbrun does: `ide` is unset when
// the launch failed, and shutdownIde then has nothing to end. A failed launch
// has written nothing to the registry so far, since tb-launch.ps1 never lets
// the IDE run on a path that prints no pid, but the tidy does not rely on that.
function shutdown() {
  if (keep) return;
  shutdownIde(ide);
  finishTidy(tidy);
}

function die(code, msg) {
  if (msg) console.error(msg);
  shutdown();
  process.exit(code);
}

// The IDE puts the project at the top of the user's recent list and saves
// state for it -- see lib/tb-registry.mjs, and WIP.Harness.md for the numbers.
// Both go back as they were once the IDE has exited: an entry the run created
// is deleted, and the user's own project, if this was one, gets its old state
// back. Not under --keep, because a kept IDE is still writing; and not when
// check_examples started this process, because it tidies once for every lane.
if (!keep) tidy = startTidy({ paths: [path.resolve(proj)] });

try {
  ide = await launchIde({ exe: IDE, project: proj, port, show, keep });
} catch (e) {
  die(2, e.message);
}

const c = await attachIde(port);
if (!c) die(2, "the IDE never exposed a debug port");

// Every alert the IDE opens is recorded and dismissed by the connection
// (attachIde), and reported with the diagnostics.
const dialogs = c.dialogs;

let outcome = compileOutcome(await waitForCompile(c, { project: proj, timeout }), { name: proj });
if (!outcome.ok) die(outcome.code, outcome.message);

// Set on every run, win32 included, and what is reported is the compile under
// it: see setBuildTarget. Switching restarts the compiler, which compiles the
// project again, so a run that switches takes a few seconds longer.
let openedIn;
try {
  const target = await setBuildTarget(c, arch, { project: proj, timeout });
  openedIn = target.from;
  if (target.waited) {
    outcome = compileOutcome(target.waited, { name: proj });
    if (!outcome.ok) die(outcome.code, outcome.message);
  }
} catch (e) {
  die(2, e.message);
}
const { rows, counts } = outcome;

// The IDE's pid is reported so a caller can clean up precisely. It matters most
// under --keep, where this process leaves the IDE running and something else has
// to end it: killing by image name instead takes out every concurrent run's IDE,
// and the user's own open IDE with it.
if (asJson) {
  console.log(JSON.stringify({
    project: proj, arch, openedIn,
    errors: counts[0], warnings: counts[1], hints: counts[2], infos: counts[3],
    idePid: ide?.pid ?? null, kept: keep,
    diagnostics: rows, dialogs: dialogs.map((d) => d.message),
  }, null, 2));
} else {
  // Said only when either target is not the default, so the usual report is
  // unchanged, and the summary stays the last line. A project opens in win32
  // unless the IDE remembered another target for its path.
  if (arch !== TARGETS[0] || openedIn !== TARGETS[0]) {
    console.log(`target: ${arch}` +
      (openedIn !== TARGETS[0] ? ` (the IDE remembered ${openedIn} for this project)` : ""));
  }
  for (const r of rows) console.log(r);
  console.log(summaryLine(counts));
  if (dialogs.length) console.log("dialogs:", JSON.stringify(dialogs.map((d) => d.message)));
  // Only under --keep, where the pid is still alive and therefore actionable.
  if (keep && ide?.pid) console.log(`ide-pid: ${ide.pid}`);
}

c.close();
shutdown();
process.exit(counts[0] > 0 ? 1 : 0);
