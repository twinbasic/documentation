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
//       --keep            leave the IDE running afterwards, and print its pid
//                         (implies --no-reap)
//       --no-reap         do not harvest automation servers the probe left behind
//       --reap-images     comma-separated image names to harvest
//                         (default: the Office suite -- see REAP_IMAGES)
//       --show / --hide   as tbbuild's
//       --llvm            compile the whole project with LLVM: the same as
//                         --compiler-options +llvm
//       --compiler-options <s>  the project's compiler options, for the run
//                         and for the exe (compiler.debugOptions and
//                         compiler.buildOptions); an option string with +llvm
//                         is refused on a Community or Personal licence
//       --exe             run the built exe as well, on a private desktop, and
//                         capture what it writes with TbRun.Out and its exit code
//
// Exit: 0 captured output, 1 the project has compile errors, 2 the harness
// could not run (a refused command line included), a compile never settled, or
// it crashed -- a build that fails after a clean compile included, and a
// [RunAfterBuild] Sub that fails code generation, since the probe never runs,
// and a procedure the probe calls that fails it, since the probe stops at the
// call -- 3 no output: the build produced none in the console before the
// timeout, or the probe ran and printed none after its last Debug.Cls -- 4 the
// compiler crashed, or restarted twice, while compiling the project -- 5 the
// probe ended before it returned, its output printed all the same -- 6 with
// --exe, the exe exited with a code other than 0, or was still running after
// --timeout; its output and exit code printed all the same.
//
// ---------------------------------------------------------------- why
//
// tbbuild.mjs answers "does this compile". It cannot answer "what does this
// print", and some questions only runtime can settle -- the one that prompted
// this script was the width of a Debug.Print print zone, which no shipped
// source demonstrates and no amount of reading the documentation establishes.
// (14 characters, and positive numbers carry a leading sign space, so values
// land at columns 1, 15, 29 rather than 0, 14, 28.)
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
//     CDP Input.dispatchMouseEvent presses at its centre (tb-click's click,
//     which also checks that nothing covers it).
//  3. READ THE CONSOLE'S BACKING ARRAY, NOT THE PANE. The DEBUG CONSOLE is a
//     virtualised list view: only the rows that fit are in the DOM, so an
//     `.innerText` scrape of it returns the tail of a long probe and looks
//     exactly like a complete capture. Measured against the old reader: a
//     probe printing 120 lines came back with 11. tb-ide's readConsole reads
//     `debugConsoleContent.dataNodes`, the whole log, and explains the rest.
//  4. START THE PROBE WITH Debug.Cls. The DEBUG CONSOLE is also where the IDE
//     writes its own build log, and the linker writes there after the build --
//     so without a clear, a probe's output comes back interleaved with
//     [LINKER] lines. The script warns when a probe omits it. The clear can
//     erase a failure as well: a procedure the probe calls that fails code
//     generation is reported before the probe's first statement runs. So the
//     script wraps the page's clearDebugConsole() before the build, keeps
//     what each clear erases, and looks there too (tb-ide's keepClears).
//  5. QUIET-PERIOD, AND A MARKER THE PROBE NEVER WRITES. The run is over when
//     the console stops changing, which works for any probe. But a probe that
//     stops early also stops changing the console: End does, and so does an
//     error raised in LLVM-compiled code with no handler, which ends the run
//     without a word (measured, BETA 995). So the staged copy calls the
//     probe's Sub from a wrapper that prints a sentinel once it returns
//     (lib/tb-probe.mjs). Its absence is exit 5; its arrival ends the wait
//     without the quiet period. Only the IDE's line about forms still loaded
//     may follow it (sentinelIndex).
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
import { existsSync, readFileSync, mkdirSync, statSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
import { click } from "./lib/tb-click.mjs";
import { compilerExe, findIde } from "./lib/tb-install.mjs";
import {
  BUILD_FAILED,
  COMPILE_TIMEOUT,
  TARGETS,
  attachIde,
  compileOutcome,
  keptIdeLines,
  killTree,
  launchIde,
  launchOnDesktop,
  llvmLicence,
  setBuildTarget,
  shutdownIde,
  summaryLine,
  waitForCompile,
  wantShow,
} from "./lib/tb-ide.mjs";
import { keepClears, keptClears, readConsole } from "./lib/tb-ide-console.mjs";
import { sentinelIndex, wrapProbe } from "./lib/tb-probe.mjs";
import { laneProjectId, stageProject } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/tbrun.mjs <source-dir> [--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--timeout S] [--quiet MS] [--json] [--raw] [--keep] [--no-reap] [--reap-images a,b] [--show|--hide] [--llvm | --compiler-options S] [--exe] [-h, --help]

Builds an exported twinBASIC source tree in the IDE, runs it, and prints what it
writes to the DEBUG CONSOLE.

  --ide <path>        as tbbuild's
  --port <n>          DevTools port to start the IDE on (default 9346)
  --arch <target>     win32 or win64 (default win32)
  --timeout <secs>    give up waiting for console output (default 120)
  --quiet <ms>        output is complete after this long with no change
                      (default 2500)
  --json              emit one JSON object instead of text
  --raw               do not strip the console's timestamp column
  --keep              leave the IDE running afterwards, and print its pid
                      (implies --no-reap)
  --no-reap           do not harvest automation servers the probe left behind
  --reap-images a,b   comma-separated image names to harvest (default: the
                      Office suite)
  --show, --hide      as tbbuild's
  --llvm              compile the whole project with LLVM, as
                      --compiler-options +llvm
  --compiler-options <s>
                      the project's compiler options, for the run and the exe;
                      +llvm is refused on a Community or Personal licence
  --exe               also run the built exe on a private desktop, and print
                      what it writes with TbRun.Out and its exit code
  -h, --help          print this text and exit

Exit codes:
  0  the probe ran and its output was captured
  1  the project has compile errors; the diagnostics are printed
  2  a refused command line (a source folder that is missing or has no Settings file
     included), no IDE or compiler, an IDE that did not start, a compile that never
     settled, a build that failed after a clean compile, a probe that never ran or
     stopped at a procedure that failed code generation, an --llvm run on a
     Community or Personal licence, an --exe run with no exe built, or a crash
  3  no output: the console held none before the timeout, or the probe printed none
     after its last Debug.Cls
  4  the compiler crashed, or restarted twice, while compiling the project
  5  the probe ended before it returned (End, or an error that ended the run); what
     it printed is printed all the same
  6  --exe: the exe exited with a code other than 0, or was still running after
     --timeout and was ended; its output and exit code are printed all the same`;

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        port: { type: "string" },
        arch: { type: "string" },
        timeout: { type: "string" },
        quiet: { type: "string" },
        ide: { type: "string" },
        "reap-images": { type: "string" },
        "compiler-options": { type: "string" },
        llvm: { type: "boolean", default: false },
        exe: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        raw: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
        "no-reap": { type: "boolean", default: false },
        show: { type: "boolean", default: false },
        hide: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: 1 },
      stopAt: ["help"],
    }),
  { format: (err) => `${err.message}\n${USAGE}` },
);
if (values.help) printHelpAndExit(USAGE);

// The values are read before anything starts.
const { port, arch, timeoutMs, quietMs } = withUsageError(
  () => {
    refuseTogether(values, ["show", "hide"]);
    refuseTogether(values, ["llvm", "compiler-options"]);
    return {
      port: numberOption(values.port ?? "9346", { option: "--port", integer: true, min: 1, max: 65535 }),
      arch: choiceOption(values.arch ?? TARGETS[0], { option: "--arch", choices: TARGETS }),
      timeoutMs: numberOption(values.timeout ?? "120", { option: "--timeout", above: 0 }) * 1000,
      quietMs: numberOption(values.quiet ?? "2500", { option: "--quiet", integer: true, min: 0 }),
    };
  },
  { format: (err) => `${err.message}\n${USAGE}` },
);

if (!positionals.length) die(2, USAGE);

const srcDir = path.resolve(positionals[0]);
if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
  die(
    2,
    `not a directory: ${srcDir}\n` +
      `tbrun takes an exported source tree (the folder holding Sources/ and Settings), ` +
      `because it has to pin the build path before packing. Export one with:\n` +
      `  twinBASIC_win32.exe export <project.twinproj> <dir>\\ --overwrite`,
  );
}

const settingsPath = path.join(srcDir, "Settings");
if (!existsSync(settingsPath)) die(2, `no Settings file in ${srcDir}`);

// Images a probe can leave behind through COM activation. Office is the set that
// prompted this; --reap-images replaces the list for anything else. Only out-of-
// process (LocalServer32) servers can outlive the probe at all -- an in-process
// one dies with it -- so this list is short by nature rather than by omission.
const REAP_IMAGES = ["excel", "winword", "powerpnt", "msaccess", "outlook", "onenote", "mspub", "visio", "winproj"];

// ---------------------------------------------------------------- the IDE

// One install packs the tree and builds it. --ide, then TB_IDE, then the
// newest BETA on the Desktop, as for every other tool here.
const ide = findIde(values.ide || undefined);
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
  return readdirSync(dir)
    .filter((f) => f.endsWith(".twin"))
    .map((f) => readFileSync(path.join(dir, f), "utf8"))
    .join(String.fromCharCode(10));
})();
const hasHook = /\[RunAfterBuild\]/i.test(sourceText);
const hasCls = /Debug\s*\.\s*Cls/i.test(sourceText);
// The console also carries the IDE's own build log, and the linker writes to it
// AFTER the build -- so a probe that does not clear the console first comes back
// with its output mixed into [LINKER] chatter. Debug.Cls as the probe's first
// statement is what makes the capture clean, and it is cheap to check for.
if (!hasHook) {
  console.error(
    "warning: no [RunAfterBuild] in Sources/*.twin -- nothing of yours will " +
      "run after the build, so you will capture the IDE's build log and nothing else.",
  );
} else if (!hasCls) {
  console.error(
    "warning: the probe does not call Debug.Cls -- the IDE's build log will be " +
      "mixed into the captured output. Make Debug.Cls the first statement.",
  );
}

// ------------------------------------------------------------------- pack

// A packing failure is the harness's, exit 2.
// The project's compiler options: compiler.debugOptions are what the
// [RunAfterBuild] run is compiled with, and compiler.buildOptions what the exe
// is -- measured on BETA 995, where +llvm in the build options alone left the
// run's Debug.Assert evaluated and its loop at the speed of the default.
const compilerOptions = values.llvm ? "+llvm" : values["compiler-options"];
let wasTemplate = false,
  projectName = "",
  usesLlvm = false,
  wrap = null;
try {
  const staged = stageProject({
    src: srcDir,
    stage,
    project: projPath,
    compiler: COMPILER,
    settings: {
      "project.buildPath": buildPath,
      "project.id": laneProjectId(0, port),
      ...(compilerOptions === undefined
        ? {}
        : { "compiler.debugOptions": compilerOptions, "compiler.buildOptions": compilerOptions }),
    },
    prepare: (dir) => {
      const sources = path.join(dir, "Sources");
      const files = existsSync(sources)
        ? readdirSync(sources)
            .filter((f) => f.endsWith(".twin"))
            .map((name) => ({ name, text: readFileSync(path.join(sources, name), "utf8") }))
        : [];
      wrap = wrapProbe(files);
      for (const f of wrap.files) writeFileSync(path.join(sources, f.name), f.text, "utf8");
    },
  });
  wasTemplate = /\$\{/.test(staged.original["project.buildPath"] ?? "");
  projectName = String(staged.settings["project.name"] ?? "");
  // Any LLVM in the run: the project's options, or a procedure's own.
  usesLlvm =
    /\+llvm\b/i.test(
      `${staged.settings["compiler.debugOptions"] ?? ""} ${staged.settings["compiler.buildOptions"] ?? ""}`,
    ) || /\[\s*CompilerOptions\s*\(\s*"[^"]*\+llvm/i.test(sourceText);
} catch (e) {
  die(2, e.message);
}
if (hasHook && !wrap.wrapped) {
  console.error(
    `warning: ${wrap.why} -- so a probe that ends before it returns cannot be told from one that finished.`,
  );
}

// What the build wrote: the IDE expands the template, so the name is looked for
// rather than assumed -- ${FileExtension} follows the build type -- and the
// binary is told from anything written beside it by its "MZ" header.
function builtFile() {
  const stem = `${projectName}_${arch}.`.toLowerCase();
  for (const f of readdirSync(outDir).filter((n) => n.toLowerCase().startsWith(stem))) {
    const file = path.join(outDir, f);
    try {
      if (readFileSync(file).subarray(0, 2).toString("latin1") === "MZ") return file;
    } catch {
      /* gone */
    }
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
const tidy = values.keep ? null : startTidy({ prefixes: [work] });

let ideRun = null;
// A failure before the console is read: said on stdout, as it was when this
// phase was tbbuild's output relayed, and ended with tbbuild's meaning of 1
// (compile errors) or 4 (the compiler crashed), and 2 for anything else.
function failBuild(code, text) {
  process.stdout.write(text + "\n");
  shutdown();
  process.exit(code);
}

try {
  ideRun = await launchIde({
    exe: ide,
    project: projPath,
    port,
    keep: values.keep,
    show: wantShow({ show: values.show, hide: values.hide }),
  });
} catch (e) {
  failBuild(2, e.message);
}

const cdp = await attachIde(port);
if (!cdp) failBuild(2, "the IDE never exposed a debug port");

let outcome = compileOutcome(await waitForCompile(cdp, { project: projPath, timeout: COMPILE_TIMEOUT }), {
  name: projPath,
});
if (!outcome.ok) failBuild(outcome.code === 4 ? 4 : 2, outcome.message);

// The target, set on every run, win32 included (setBuildTarget says why). The
// probe runs in the compiler that builds it, so under win64 it runs in the
// IDE's 64-bit compiler, twinBASIC_win64_noDEP.exe, as a 64-bit process:
// measured on BETA 983 with LenB of a LongPtr, ProcessorArchitecture(),
// PROCESSOR_ARCHITECTURE, IsWow64Process and the module path of the process.
try {
  const target = await setBuildTarget(cdp, arch, { project: projPath, timeout: COMPILE_TIMEOUT });
  // Only a target the IDE remembered is worth a word: a new path opens in win32.
  if (target.from !== TARGETS[0]) {
    console.error(`note: the IDE remembered ${target.from} for this path; the probe is built for ${arch}`);
  }
  if (target.waited) {
    outcome = compileOutcome(target.waited, { name: projPath });
    if (!outcome.ok) failBuild(outcome.code === 4 ? 4 : 2, outcome.message);
  }
} catch (e) {
  failBuild(2, e.message);
}
if (outcome.counts[0] > 0) {
  failBuild(1, [...outcome.rows, summaryLine(outcome.counts)].join("\n"));
}

// The licence, for a run with LLVM in it: llvmLicence says why a Community or
// Personal one measures nothing.
let licence = null;
if (usesLlvm) {
  const found = await llvmLicence(cdp);
  licence = found.licence;
  if (found.refusal) failBuild(2, `tbrun: ${found.refusal}`);
}

// --------------------------------------------- build the exe, read the console

let captured = null,
  shown = null,
  erased = null,
  failure = null;
try {
  // (4) Keep what each clear erases, for the check after the run.
  if (!(await keepClears(cdp))) {
    throw new Error(
      "no clearDebugConsole() in this IDE -- a probe's Debug.Cls could erase a " +
        "failure unseen. Refusing rather than returning what it left as complete.",
    );
  }
  // (2) a real press/release pair; element.click() is ignored.
  await click(cdp, "buildIcon");

  // (5) settle on the sentinel, or else a quiet period.
  const started = Date.now();
  let last = "",
    lastChange = Date.now(),
    seen = false;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 400));
    const now = await readConsole(cdp);
    if (now === null) {
      throw new Error(
        "no debugConsoleContent.dataNodes in this IDE -- the DEBUG CONSOLE " +
          "was never created, or this build moved it. Refusing rather than " +
          "falling back to scraping the pane, which silently truncates.",
      );
    }
    if (now !== last) {
      last = now;
      lastChange = Date.now();
      const lines = strip(now);
      if (lines.length) seen = true;
      if (wrap.wrapped && sentinelIndex(lines) >= 0) break;
    } else if (seen && Date.now() - lastChange > quietMs) break;
  }
  captured = strip(last);
  // --raw changes what is printed, never what is checked. BUILD_FAILED needs a
  // line that starts where the console's text does, and a line holding only a
  // timestamp is never blank, so every check reads without the column; under
  // --raw the lines printed are the same entries, read again with it.
  shown = values.raw ? strip(last, await readConsole(cdp, { timestamps: true })) : captured;
  const kept = await keptClears(cdp);
  if (!kept) {
    throw new Error(
      "the IDE page no longer holds what the DEBUG CONSOLE's clears erased, so " +
        "a failure they erased cannot be ruled out",
    );
  }
  erased = kept.flatMap((text) => text.split("\n"));
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
// typelibrary` build would exit 0. A [RunAfterBuild] Sub
// that fails code generation leaves the log too: the build succeeds, and then
// nothing in the Sub runs, Debug.Cls included. BUILD_FAILED is buildProject's
// list of failure lines, the code-generation one among them.
if (captured.some((l) => BUILD_FAILED.test(l))) {
  die(
    2,
    "tbrun: the build or the probe's code generation failed, so the probe never ran. " +
      "The console holds the IDE's build log, not the probe's output:\n" +
      shown.map((l) => `  ${l}`).join("\n"),
  );
}
// A procedure the probe calls that fails code generation is reported straight
// after the "[BUILD] Executing '<project>.<module>.<Sub>'..." line, before the
// probe's first statement runs. So Debug.Cls erases the report, the probe stops
// where it calls that procedure, and the console holds only what it printed
// before then -- which tbrun returned as the whole output, exit 0 (measured,
// BETA 983). A failure line among what the clears erased counts only after the
// last Executing line: before it is the build's own log, which ended in success
// or the probe would not have run.
const started = erased.findLastIndex((l) => /^\[BUILD\] Executing '/.test(l));
const lost = started < 0 ? undefined : erased.slice(started + 1).find((l) => BUILD_FAILED.test(l));
if (lost) {
  die(
    2,
    "tbrun: the probe's Debug.Cls erased a failure the IDE reported as the probe started:\n" +
      `  ${lost}\n` +
      "What the probe printed, which stops where it called the procedure that failed:\n" +
      (shown.length ? shown.map((l) => `  ${l}`).join("\n") : "  (nothing)"),
  );
}
// (5) The wrapper's sentinel says the probe returned. It is the wrapper's line,
// not the probe's, so it is never printed. The IDE's own lines after it stay:
// one says the probe left a form loaded.
const at = wrap.wrapped ? sentinelIndex(captured) : -1;
const returned = wrap.wrapped ? at >= 0 : null;
if (returned) {
  // Without --raw, shown is captured itself.
  if (shown !== captured) shown.splice(at, 1);
  captured.splice(at, 1);
}
// A probe that ran leaves its Executing line among what its Debug.Cls erased,
// so an empty console then means it printed nothing after its last clear, not
// that it never ran.
const printed = returned ? at : captured.length;
if (!printed && started >= 0 && returned !== false) {
  die(3, `tbrun: the probe ran (${erased[started]}) but printed nothing after its last Debug.Cls.`);
}
if (!captured.length && started < 0) {
  die(
    3,
    "tbrun: the build produced no console output before the timeout.\n" +
      (hasHook
        ? "  The [RunAfterBuild] Sub may not have run -- check the IDE for a modal."
        : "  There is no [RunAfterBuild] Sub to produce any.") +
      (wasTemplate ? "" : "\n  buildPath was already explicit, so a Save dialog is unlikely."),
  );
}

const exeRun = values.exe ? await runExe() : null;

if (values.json) {
  console.log(
    JSON.stringify(
      { exe: builtFile(), arch, lines: shown, returned, licence, exeRun, idePid: ideRun?.pid ?? null, reaped },
      null,
      2,
    ),
  );
} else {
  for (const l of shown) console.log(l);
  if (exeRun) {
    console.log(`--- exe: ${exeRun.timedOut ? "still running after --timeout, ended" : `exit ${exeRun.exitCode}`}`);
    for (const l of exeRun.lines) console.log(l);
  }
  // Only under --keep, where the pid is still alive and therefore actionable.
  if (values.keep && ideRun?.pid) for (const l of keptIdeLines(ideRun.pid)) console.log(l);
}
if (returned === false) {
  die(
    5,
    `tbrun: the probe ended before it returned${started >= 0 ? "" : ", and the run's start was not seen"}: ` +
      "End, or an error that ended the run without a report -- as one raised with no handler in " +
      "LLVM-compiled code does. Or it was still running, silent, after --quiet ms; raise --quiet for a slow probe.",
  );
}
if (exeRun?.timedOut) die(6, `tbrun: the exe was still running after --timeout, and was ended.`);
if (exeRun && exeRun.exitCode !== 0) die(6, `tbrun: the exe exited with code ${exeRun.exitCode}.`);
// Explicitly: under --keep the launcher, and the pipes to it, live as long as the
// IDE, and would keep this process waiting for it.
process.exit(0);

// ------------------------------------------------------------------ helpers

// Trim blank lines off both ends. That is all this has to do: reading
// dataNodes rather than the pane means the header, the ">" input prompt and
// the timestamp column never arrive in the first place. Given `raw`,
// the same console read with its timestamps, it returns the same entries from
// that instead, since a line holding a timestamp is never blank.
function strip(text, raw = null) {
  if (!text) return [];
  const lines = (s) => s.split("\n").map((l) => l.replace(/\r$/, ""));
  const out = lines(text);
  let from = 0,
    to = out.length;
  while (from < to && !out[from].trim()) from++;
  while (to > from && !out[to - 1].trim()) to--;
  return (raw === null ? out : lines(raw)).slice(from, to);
}

// --exe: the built exe, started as the IDE is, on a private desktop and inside
// a kill-on-close job, so a window it opens -- a MsgBox -- is on no desktop
// anyone uses, and nothing it starts outlives it. It inherits no handles, and
// Debug.Print writes nothing in an exe, so what it printed is what TbRun.Out
// appended to the file TBRUN_OUT names.
async function runExe() {
  const file = builtFile();
  if (!file || !/\.exe$/i.test(file)) {
    die(2, `tbrun: --exe, but the build wrote no exe to ${outDir}${file ? ` (it wrote ${path.basename(file)})` : ""}`);
  }
  const outFile = path.join(work, "exe-out.txt");
  rmSync(outFile, { force: true });
  let run;
  try {
    run = await launchOnDesktop({
      exe: file,
      desktop: `tbrun-exe-${port}`,
      env: { ...process.env, TBRUN_OUT: outFile },
    });
  } catch (e) {
    die(2, `tbrun: could not start the exe on a private desktop: ${e.message}`);
  }
  let timer;
  const timedOut = await Promise.race([
    run.exited.then(() => false),
    new Promise((r) => {
      timer = setTimeout(() => r(true), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (timedOut) {
    killTree(run.pid);
    run.launcher.kill();
  }
  const exitCode = await run.exited;
  const text = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  return { file, exitCode: timedOut ? null : exitCode, timedOut, lines: strip(text) };
}

// (6) End OUR IDE by pid, never by image name. The tree kill takes the probe exe
// and anything it spawned with CreateProcess; what it cannot take is a COM
// server, which is what reapOrphans is for.
function shutdown() {
  if (values.keep) return null; // the IDE is the caller's problem now
  shutdownIde(ideRun);
  finishTidy(tidy);
  return values.noReap ? null : reapOrphans();
}

// Identity is pid + start time, because a pid alone is reused and a run that
// reaped a recycled pid would be killing a stranger.
function snapshotProcesses() {
  const ps =
    "Get-Process | Select-Object Id, ProcessName, " +
    "@{n='Start';e={try{$_.StartTime.ToFileTimeUtc()}catch{0}}}, " +
    "@{n='Win';e={$_.MainWindowTitle}} | ConvertTo-Json -Compress";
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
    const parsed = JSON.parse(out);
    return new Map((Array.isArray(parsed) ? parsed : [parsed]).map((p) => [`${p.Id}:${p.Start}`, p]));
  } catch {
    return null; // reaping degrades to off, never to guessing
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

  const images = new Set(
    (values.reapImages || "")
      .split(",")
      .map((s) =>
        s
          .trim()
          .toLowerCase()
          .replace(/\.exe$/, ""),
      )
      .filter(Boolean),
  );
  const wanted = images.size ? images : new Set(REAP_IMAGES);

  const killed = [],
    skipped = [];
  for (const [key, p] of after) {
    if (processesBefore.has(key)) continue;
    if (!wanted.has(String(p.ProcessName).toLowerCase())) continue;
    if (p.Win && String(p.Win).trim()) {
      skipped.push(p);
      continue;
    }
    killTree(p.Id);
    killed.push({ pid: p.Id, image: p.ProcessName });
  }

  for (const p of skipped) {
    console.error(
      `note: ${p.ProcessName} (pid ${p.Id}) started during this run but has a ` +
        `window open, so it was left alone -- close it yourself if it is a leak.`,
    );
  }
  if (killed.length) {
    console.error("reaped: " + killed.map((k) => `${k.image} (pid ${k.pid})`).join(", "));
  }
  return killed;
}
