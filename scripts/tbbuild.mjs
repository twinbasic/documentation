#!/usr/bin/env node
// Compile a .twinproj and print its diagnostics, without driving the IDE by hand.
//
//     node scripts/tbbuild.mjs <project.twinproj> [options]
//
//       --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
//                         %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --port <n>        DevTools port to start the IDE on (default: one Windows picks)
//       --arch <target>   win32 or win64 (default win32): the target to
//                         compile for. #If Win64 and LongPtr's size change
//                         what compiles, and a project opens in whatever
//                         target the IDE remembers for its path, so the
//                         target is set on every run, win32 included.
//       --compile-timeout <secs>, --timeout <secs>
//                         the compile phase's limit, from the project reported
//                         open to the compile settled (default: test/harness.json's
//                         compile, or TB_COMPILE_TIMEOUT)
//       --build-timeout <secs>  the build's limit, from the press to its end
//                         (default: its build, or TB_BUILD_TIMEOUT)
//       --build           after a compile with no errors, build the project, as
//                         the toolbar's Build button does, and report the
//                         build log. The project is exported and packed again
//                         first, with an explicit build path in a private
//                         folder, so the given .twinproj is never changed
//       --llvm            build with LLVM: --build, with the project's compiler
//                         options set to +llvm. Refused on a Community or
//                         Personal licence, which would build with the default
//                         compiler
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
// refused command line, or a project file that cannot be read, included) or
// crashed, 3 the compile never settled, 4 the project crashes the compiler,
// 5 the build failed after a clean compile (an LLVM refusal in its log, an exe
// linked or not, and the build's limit included).
//
// ---------------------------------------------------------------- why this
//
// twinBASIC cannot compile from a command line. The compiler executable's
// whole surface is six verbs -- export, import, settings, licence, changelog,
// readme -- and none builds; the IDE executable does take `--buildAndExit32`
// and `--buildAndExit64`, but those write nothing to stdout or stderr, exit 0
// when the error is in code nothing calls, and do not exit at all for an error
// the build reaches.
//
// The IDE's user interface, though, is a WebView2 page, and WebView2 honours
// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS. So the IDE can be started with a
// Chrome DevTools port, driven over CDP, and its DIAGNOSTICS pane read out.
// That is all this is. The build itself -- start the IDE, attach, wait for the
// compile, read the diagnostics, end the IDE -- is compileProject in
// scripts/lib/tb-build.mjs, over the mechanics in scripts/lib/tb-ide.mjs that
// scripts/tbrun.mjs also uses; this file is the command line around it, and
// what a command line owns: the checks on its input, the registry tidy, and the
// printing.
//
// The diagnostics come from the IDE's own "copy compilation error report"
// walk, minus the clipboard write, so the text is exactly what that command
// would give a human.
//
// Written for the Reference/Attributes.md applicability probes -- see
// scripts/gen_attribute_probes.mjs -- but it does not know anything about
// them. See WIP.Harness.md, "Compiling a twinBASIC project without the IDE in
// front of you".
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  withUsageError,
} from "../lib/cli.mjs";
import { findIde, unsupportedIde } from "./lib/tb-install.mjs";
import { compileProject } from "./lib/tb-build.mjs";
import { HarnessError, optionSeconds, timeoutMs } from "./lib/harness-settings.mjs";
import { keptIdeLines, leaseSlot, TARGETS, summaryLine, wantShow } from "./lib/tb-ide.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { asksForLlvm, holdLlvmCache, leaseReport } from "./lib/tb-llvm-cache.mjs";
import { checkProject, laneProjectId, stageProject, unpackProject } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/tbbuild.mjs <project.twinproj> [--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--compile-timeout S] [--build-timeout S] [--build | --llvm] [--json] [--keep] [--show|--hide] [-h, --help]

Compiles a packed .twinproj in the twinBASIC IDE and prints its diagnostics.
With --build or --llvm it then builds the project.

  --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
                    twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>        DevTools port to start the IDE on (default: one Windows
                    picks, so runs at once never meet on a port)
  --arch <target>   win32 or win64 (default win32)
  --compile-timeout <secs>, --timeout <secs>
                    the compile's limit, from the project reported open to the
                    compile settled (default: test/harness.json's compile, or
                    TB_COMPILE_TIMEOUT)
  --build-timeout <secs>
                    the build's limit, from the press to its end (default: its
                    build, or TB_BUILD_TIMEOUT)
  --build           after a compile with no errors, build the project and print
                    \`built: <file>\`; the project is exported and packed again
                    with a build path in a private folder, and the given file is
                    not changed
  --llvm            build with LLVM, as --build with the project's compiler
                    options set to +llvm; refused on a Community or Personal
                    licence. Without it, --build is the control for an --llvm run
  --json            emit one JSON object instead of text
  --keep            leave the IDE running; its pid is printed as \`ide-pid: N\`,
                    with the taskkill command that ends it
  --show, --hide    show the IDE on the desktop, or keep it on a private one
                    (default: hidden, unless TBBUILD_SHOW is set)
  -h, --help        print this text and exit

Exit codes:
  0  the project compiled without errors
  1  the project has errors
  2  a refused command line (a path that is not a .twinproj included), a project file
     that cannot be read (empty, cut short or not a project at all), no IDE, an IDE
     that did not start or expose a debug port, a project that could not be exported
     or packed, an --llvm run on a Community or Personal licence, test/harness.json
     missing or malformed, a TB_<PHASE> variable that is not a number of seconds
     greater than 0, or a crash
  3  the compile never settled: the IDE did not report the project open in time, the
     compile met its limit, or its diagnostics did not match its status bar
  4  the project crashes the compiler
  5  the build failed after a clean compile, an LLVM refusal in its log or the
     build's limit included, an exe linked or not; the build log is printed on
     stdout and the failing line on stderr`;

function usage() {
  console.error(USAGE);
  process.exit(2);
}

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        port: { type: "string" },
        arch: { type: "string" },
        timeout: { type: "string" },
        "compile-timeout": { type: "string" },
        "build-timeout": { type: "string" },
        build: { type: "boolean", default: false },
        llvm: { type: "boolean", default: false },
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
const { port, arch, compileSeconds, buildSeconds } = withUsageError(() => {
  refuseTogether(values, ["show", "hide"]);
  refuseTogether(values, ["compile-timeout", "timeout"]);
  return {
    port:
      values.port === undefined
        ? null
        : numberOption(values.port, { option: "--port", integer: true, min: 1, max: 65535 }),
    arch: choiceOption(values.arch ?? TARGETS[0], { option: "--arch", choices: TARGETS }),
    compileSeconds: optionSeconds(values, ["compile-timeout", "timeout"]),
    buildSeconds: optionSeconds(values, ["build-timeout"]),
  };
}, usageError);

// The limits: the option, else the TB_<PHASE> variable, else test/harness.json,
// whose faults are exit 2 (lib/harness-settings.mjs, test/harness.md).
let timeout, buildTimeout;
try {
  timeout = timeoutMs("compile", compileSeconds);
  buildTimeout = timeoutMs("build", buildSeconds);
} catch (e) {
  if (!(e instanceof HarnessError)) throw e;
  die(2, e.message);
}

// An install path is a home directory, so it is never hardcoded here: pass
// --ide, set TB_IDE, or let tb-install find the newest BETA on the Desktop,
// which is where the IDE's own zip tells people to unpack it.
const IDE = findIde(values.ide);
const asJson = values.json;
const keep = values.keep;
// --llvm is a build, so the one switch the rest of the file reads is `build`.
const llvm = values.llvm;
const build = values.build || llvm;
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
  console.error(
    `not a .twinproj: ${proj}\n` +
      (existsSync(proj) && statSync(proj).isDirectory()
        ? "  That is a source tree. tbbuild takes a packed project; scripts/tbrun.mjs\n" +
          "  takes a source tree, and packs it for you."
        : "  tbbuild takes a packed project file."),
  );
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
// A file that exists and is not a project is refused here too, from its
// container. The IDE does not fail on one: it opens a message box that nobody can
// see or answer on a private desktop, and the run goes on to the timeout, where
// it comes out clean -- or never settled, when the IDE never reports the project
// open. Reading the container first makes it an exit 2 in a moment, naming the
// file and what is wrong with it.
try {
  checkProject(proj);
} catch (e) {
  die(2, e.message);
}
// An IDE older than the build the flags need (tb-install's MIN_BUILD) is refused
// here, before anything is started, and a named IDE that is not there is refused
// naming the path, as tbrun and addin_test refuse it, rather than left for the
// launch to fail on.
if (unsupportedIde(IDE)) {
  console.error(unsupportedIde(IDE));
  process.exit(2);
}
if (!IDE || !existsSync(IDE)) {
  console.error(
    (IDE ? `no twinBASIC IDE at ${IDE}: ` : "no twinBASIC IDE found: ") +
      "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
  process.exit(2);
}

let tidy = null;

// The IDE saves state for the project it opens (the recent list and its
// settings are not written: launchIde gives it IDE_FLAGS) -- see
// lib/tb-registry.mjs, and WIP.Harness.md for the numbers. It goes back as it
// was once the IDE has exited: an entry the run created is deleted, and the
// user's own project, if this was one, gets its old state back. Not under
// --keep, because a kept IDE is still writing; and not when
// another process owns the tidy (startTidy then returns null), as a tool that
// runs many builds does for every lane.
// A build stages the project first, so what the IDE opens, and so what the tidy
// sweeps, is the folder under the temp directory and not the given path.
let target = path.resolve(proj);
let work = null;
let usesLlvm = false;
// Whether the staged project has a [RunAfterBuild] Sub, whose compile the build follows
// after the link (buildProject); unknown for a run that does not build.
let followRun;
// The text of every .twin file under dir, in its subfolders too.
function twinText(dir) {
  if (!existsSync(dir)) return "";
  return readdirSync(dir, { recursive: true })
    .filter((rel) => rel.toLowerCase().endsWith(".twin"))
    .map((rel) => readFileSync(path.join(dir, rel), "utf8"))
    .join("\n");
}
// The run's slot (tbbroker, WIP.Broker.md): the private desktop its IDE goes on, and the
// number its work folder and project id are keyed to, which no other run on the machine
// holds while this one does.
let slot;
try {
  slot = await leaseSlot({ tag: `tbbuild ${path.basename(proj)}` });
} catch (e) {
  die(2, e.message);
}
if (build) {
  // Keyed to the slot, as tbrun's is.
  work = path.join(tmpdir(), "tbbuild", String(slot.slot));
  rmSync(work, { recursive: true, force: true });
  const out = path.join(work, "out");
  mkdirSync(out, { recursive: true });
  target = path.join(work, "tbbuild-probe.twinproj");
  // The IDE opens a project in place, and a build writes where the project's
  // buildPath says. The packed project's is the template's, whose Save dialog a
  // private desktop hides, so the project is exported, given an explicit file and
  // a project id of its own, and packed again (lib/tb-project.mjs). Both
  // directions run in process, through impexp, and the folder it exports into
  // is new: the work folder was emptied above.
  const src = path.join(work, "src");
  try {
    unpackProject(path.resolve(proj), src);
  } catch (e) {
    removeWork(work, null);
    die(2, `exporting ${proj} failed:\n${e.message}`);
  }
  // Under --llvm the options are the run's and the exe's alike, as tbrun's are.
  try {
    const staged = stageProject({
      src,
      stage: path.join(work, "stage"),
      project: target,
      settings: {
        "project.buildPath": path.join(out, "${ProjectName}_${Architecture}.${FileExtension}"),
        "project.id": laneProjectId(3, slot.slot),
        ...(llvm ? { "compiler.debugOptions": "+llvm", "compiler.buildOptions": "+llvm" } : {}),
      },
    });
    // A build is what generates LLVM code, so only a build asks for LLVM: under
    // --llvm, or because the project's own options or a procedure's do.
    const sources = twinText(path.join(src, "Sources"));
    usesLlvm = llvm || asksForLlvm(staged.settings, sources);
    followRun = /\[\s*RunAfterBuild\b/i.test(sources);
  } catch (e) {
    removeWork(work, null);
    die(2, e.message);
  }
}
// A build with LLVM in it holds a lease on the LLVM cache server from before its
// IDE starts until that IDE has ended, so the server is never one its IDE's
// compiler starts in the IDE's job, which would end with it and take the cache
// from every other run on the machine (lib/tb-llvm-cache.mjs). A kept IDE's
// lease ends with this process.
let llvmLease = null;
if (usesLlvm) {
  try {
    llvmLease = await holdLlvmCache(IDE);
  } catch (e) {
    removeWork(work, null);
    die(2, e.message);
  }
}
if (!keep) tidy = startTidy(work ? { prefixes: [work] } : { paths: [target] });

// The staged copy is of no use once the run is over, and neither is anything in
// the work folder after a run that built nothing. A build that succeeded keeps
// its out\ folder, which holds the exe that "built:" names; the next run in this
// slot replaces it. One that cannot be removed is reported and left.
function removeWork(dir, built) {
  try {
    if (!built) {
      removeTree(dir);
      return;
    }
    for (const name of readdirSync(dir)) {
      if (name !== "out") removeTree(path.join(dir, name));
    }
  } catch (e) {
    console.error(`could not remove ${dir}: ${e.code ?? e.message}`);
  }
}

// compileProject ends its IDE before it returns, unless --keep, so the tidy comes
// after the IDE has gone. Tidies whether or not an IDE was started, as tbrun
// does: a failed launch has written nothing to the registry so far, since
// tb-launch.ps1 never lets the IDE run on a path that prints no pid, but the
// tidy does not rely on that.
let r;
try {
  r = await compileProject({
    project: work ? target : proj,
    ide: IDE,
    slot,
    port,
    arch,
    timeout,
    buildTimeout,
    followRun,
    show,
    keep,
    build,
    llvm,
  });
  // A kept IDE keeps the slot after this run has ended, until it is closed.
  if (keep && r.idePid) await slot.handTo(r.idePid);
} finally {
  // compileProject has ended the IDE, unless --keep.
  if (!keep) await llvmLease?.release();
  finishTidy(tidy);
  // After the tidy, which names paths under the work folder, and with the IDE
  // gone. Not under --keep: that IDE still has the staged project open.
  if (work && !keep) removeWork(work, r?.built);
}

if (r.code >= 2) {
  // A failed build reports the log it read, on stdout, as the diagnostics are.
  if (r.code === 5) {
    if (asJson) console.log(JSON.stringify(jsonReport(r), null, 2));
    else for (const line of r.buildLog) console.log(line);
  }
  if (r.message) console.error(r.message);
  process.exit(r.code);
}
const { rows, counts, dialogs, openedIn } = r;

// The IDE's pid is reported so a caller can clean up precisely. It matters most
// under --keep, where this process leaves the IDE running and something else has
// to end it: killing by image name instead takes out every concurrent run's IDE,
// and the user's own open IDE with it.
function jsonReport(res) {
  return {
    project: proj,
    arch,
    openedIn: res.openedIn,
    errors: res.counts[0],
    warnings: res.counts[1],
    hints: res.counts[2],
    infos: res.counts[3],
    idePid: res.idePid,
    kept: keep,
    diagnostics: res.rows,
    dialogs: res.dialogs,
    built: res.built,
    buildLog: res.buildLog,
    llvmCache: leaseReport(llvmLease),
  };
}
if (asJson) {
  console.log(JSON.stringify(jsonReport(r), null, 2));
} else {
  // Said only when either target is not the default, so the usual report is
  // unchanged, and the summary stays the last line. A project opens in win32
  // unless the IDE remembered another target for its path.
  if (arch !== TARGETS[0] || openedIn !== TARGETS[0]) {
    console.log(
      `target: ${arch}` + (openedIn !== TARGETS[0] ? ` (the IDE remembered ${openedIn} for this project)` : ""),
    );
  }
  for (const row of rows) console.log(row);
  console.log(summaryLine(counts));
  if (r.built) console.log(`built: ${r.built}`);
  if (dialogs.length) console.log("dialogs:", JSON.stringify(dialogs));
  // Only under --keep, where the pid is still alive and therefore actionable.
  if (keep && r.idePid) for (const l of keptIdeLines(r.idePid)) console.log(l);
}

process.exit(r.code);
