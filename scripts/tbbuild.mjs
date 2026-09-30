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
// Exit codes: 0 clean, 1 the project has errors, 2 the harness could not run (a
// refused command line included) or crashed, 3 the compile never settled,
// 4 the project crashes the compiler.
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
import { choiceOption, exitOnCrash, numberOption, parseCli, printHelpAndExit, refuseTogether, withUsageError } from "../lib/cli.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { COMPILE_TIMEOUT, TARGETS, attachIde, compileOutcome, launchIde, setBuildTarget, shutdownIde,
         summaryLine, waitForCompile, wantShow } from "./lib/tb-ide.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/tbbuild.mjs <project.twinproj> [--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--timeout S] [--json] [--keep] [--show|--hide] [-h, --help]

Compiles a packed .twinproj in the twinBASIC IDE and prints its diagnostics.

  --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
                    twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>        DevTools port to start the IDE on (default 9333)
  --arch <target>   win32 or win64 (default win32)
  --timeout <secs>  give up waiting for the compile (default 180)
  --json            emit one JSON object instead of text
  --keep            leave the IDE running; its pid is printed as \`ide-pid: N\`
  --show, --hide    show the IDE on the desktop, or keep it on a private one
                    (default: hidden, unless TBBUILD_SHOW is set)
  -h, --help        print this text and exit

Exit codes:
  0  the project compiled without errors
  1  the project has errors
  2  a refused command line (a path that is not a .twinproj included), no IDE, an IDE
     that did not start or expose a debug port, or a crash
  3  the compile never settled: the IDE did not report the project open, or its
     diagnostics did not match its status bar
  4  the project crashes the compiler`;

function usage() {
  console.error(USAGE);
  process.exit(2);
}

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values, positionals } = withUsageError(
  () => parseCli(process.argv.slice(2), {
    options: {
      ide: { type: "string" },
      port: { type: "string" },
      arch: { type: "string" },
      timeout: { type: "string" },
      json: { type: "boolean", default: false },
      keep: { type: "boolean", default: false },
      show: { type: "boolean", default: false },
      hide: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    positionals: { min: 0, max: 1 },
    stopAt: ["help"],
  }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

// The values are read before anything starts. A NaN timeout would end
// waitForCompile's loop before its first pass, which then reports that the IDE
// never opened the project.
const { port, arch, timeout } = withUsageError(() => {
  refuseTogether(values, ["show", "hide"]);
  return {
    port: numberOption(values.port ?? "9333", { option: "--port", integer: true, min: 1, max: 65535 }),
    arch: choiceOption(values.arch ?? TARGETS[0], { option: "--arch", choices: TARGETS }),
    timeout: numberOption(values.timeout ?? String(COMPILE_TIMEOUT / 1000), { option: "--timeout", above: 0 }) * 1000,
  };
}, usageError);

// An install path is a home directory, so it is never hardcoded here: pass
// --ide, set TB_IDE, or let tb-install find the newest BETA on the Desktop,
// which is where the IDE's own zip tells people to unpack it.
const IDE = findIde(values.ide);
const asJson = values.json;
const keep = values.keep;
const show = wantShow({ show: values.show, hide: values.hide });

const proj = positionals[0];
if (!proj) usage();
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
// A named IDE that is not there is refused here, naming the path, as tbrun and
// addin_test refuse it, rather than left for the launch to fail on.
if (!IDE || !existsSync(IDE)) {
  console.error((IDE ? `no twinBASIC IDE at ${IDE}: ` : "no twinBASIC IDE found: ") +
    "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
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
