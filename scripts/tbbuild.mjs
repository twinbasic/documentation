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
import { attachIde, compileOutcome, launchIde, shutdownIde, summaryLine,
         waitForCompile, wantShow } from "./lib/tb-ide.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i < 0 ? d : args[i + 1]; };
const proj = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

// An install path is a home directory, so it is never hardcoded here: pass
// --ide, set TB_IDE, or let tb-install find the newest BETA on the Desktop,
// which is where the IDE's own zip tells people to unpack it.
const IDE = findIde(opt("ide", undefined));
const port = Number(opt("port", 9333));
const timeout = Number(opt("timeout", 180)) * 1000;
const asJson = flag("json");
const keep = flag("keep");
const show = wantShow({ show: flag("show"), hide: flag("hide") });

if (!proj || flag("help")) {
  console.error("usage: node scripts/tbbuild.mjs <project.twinproj> " +
    "[--ide <twinBASIC.exe>] [--port N] [--timeout S] [--json] [--keep] " +
    "[--show|--hide]");
  process.exit(2);
}
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
function shutdown() {
  if (!ide || keep) return;
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
  ide = await launchIde({ exe: IDE, project: proj, port, show });
} catch (e) {
  die(2, e.message);
}

const c = await attachIde(port);
if (!c) die(2, "the IDE never exposed a debug port");

const dialogs = [];
c.on((m) => {
  if (m.method === "Page.javascriptDialogOpening") dialogs.push(m.params.message);
});

const outcome = compileOutcome(await waitForCompile(c, { project: proj, timeout }), { name: proj });
if (!outcome.ok) die(outcome.code, outcome.message);
const { rows, counts } = outcome;

// The IDE's pid is reported so a caller can clean up precisely. It matters most
// under --keep, where this process leaves the IDE running and something else has
// to end it: killing by image name instead takes out every concurrent run's IDE,
// and the user's own open IDE with it.
if (asJson) {
  console.log(JSON.stringify({
    project: proj,
    errors: counts[0], warnings: counts[1], hints: counts[2], infos: counts[3],
    idePid: ide?.pid ?? null, kept: keep,
    diagnostics: rows, dialogs,
  }, null, 2));
} else {
  for (const r of rows) console.log(r);
  console.log(summaryLine(counts));
  if (dialogs.length) console.log("dialogs:", JSON.stringify(dialogs));
  // Only under --keep, where the pid is still alive and therefore actionable.
  if (keep && ide?.pid) console.log(`ide-pid: ${ide.pid}`);
}

c.close();
shutdown();
process.exit(counts[0] > 0 ? 1 : 0);
