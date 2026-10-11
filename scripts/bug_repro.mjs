#!/usr/bin/env node
// Reproducer projects for the entries of BUGS-TO-REPORT.md, under bugs/<slug>/.
//
//     node scripts/bug_repro.mjs new <slug> "<entry title>" [--with-vb6] [--with-images]
//     node scripts/bug_repro.mjs pack <slug>
//     node scripts/bug_repro.mjs compile|build|run <slug> [options]
//     node scripts/bug_repro.mjs vb6 <slug> [--vb6 <VB6.EXE>] [--timeout S] [--keep]
//     node scripts/bug_repro.mjs verify [slug ...] [options]
//     node scripts/bug_repro.mjs file <slug> <issue> [--existing]
//     node scripts/bug_repro.mjs file --marked
//
// What a reproducer is, and where it lives, is the preamble of BUGS-TO-REPORT.md
// ("Reproducer projects"). A reproducer is bugs/<slug>/ while its entry is queued
// and bugs/filed/<slug>/ once the entry has been filed upstream: a filed bug is not
// a fixed one, and its reproducer is what says when it is. This tool keeps the
// three files in step -- the source
// tree, the packed .twinproj and the zip for the GitHub issue -- and puts a
// reproducer in front of the compiler, through scripts/tbbuild.mjs and
// scripts/tbrun.mjs, so that an entry can say what it saw and a later beta can be
// asked whether it still does.
//
// bugs/<slug>/repro.json says how to ask. `verify` reads it for every reproducer:
// the mode (compile, build, run, test, cli, lane, probe or manual), the target, and
// what a reproduction looks like (`expect`). Its keys are listed by loadRepro() below,
// and the contributor-facing description is docs/Documentation/Tools-Defects.md. A test
// reproducer holds the issue's regression tests, [TestCase] Subs and compile cases,
// and is judged by the PASS and FAIL lines `tbrun --tests` prints for them. A lane
// reproducer names a lane of test/ide or test/addin and the tests in it that pass
// while the bug is there; a probe reproducer names a script under scripts/ that
// verify runs and judges by `expect`. Only a manual one needs a person.
//
// Exit codes: 0 done, 1 a finding, 2 the tool could not do its job, 3 and up its
// own -- see USAGE. tbbuild's and tbrun's exit codes are mapped into that table by
// TBBUILD_EXIT and TBRUN_EXIT, and are what `expect.exit` in repro.json is
// compared with, unmapped.
//
// ---------------------------------------------------------------- why this
//
// An entry in BUGS-TO-REPORT.md owes a reader a project that shows the bug. By
// hand, that is an impexp import and a zip, and then a build to see that the bug
// is still there; this does the first two the same way every time and the third
// without a person at the IDE. `verify` is the reason the file exists: an entry
// that no longer reproduces on the newest beta is one to retire or to re-check.
//
// `verify` is never run by a wrapper, a gate or CI. It needs a twinBASIC install,
// and Windows with a private desktop, as examples.bat does. For a filed bug,
// `NO LONGER REPRODUCES` is the signal that a fix has been released.
//
// ------------------------------------------------------------- what it relies on
//
//  1. THE ZIP IS WRITTEN IN NODE (scripts/lib/zip.mjs). Compress-Archive is
//     PowerShell and 7-Zip is not on PATH; Git Bash's `tar -a` writes a tar
//     archive under the .zip name and exits 0. Each entry's time is its file's
//     own, so packing an unchanged source tree twice writes the same zip. A
//     reproducer that has a VB6 project beside the twinBASIC one, in
//     bugs/<slug>/vb6/, gets a second zip, <slug>-vb6.zip, of that folder's
//     sources, written the same way; `vb6` builds the project in a temp copy
//     (scripts/lib/vb6.mjs, runRepro), runs its exe on a private desktop, as
//     tbrun --exe does, and prints the out.txt it writes. VB6.EXE
//     is only ever started from there, with an argument array and no shell.
//     A graphical defect carries pictures: repro.json's `images` names them, the
//     PngDump modules (test/repro-templates/png/) save each as <name>.png in the
//     folder BUGREPRO_IMAGES names, `run` and `vb6` keep them in
//     bugs/<slug>/images/ as <name>-tb.png and <name>-vb6.png, and
//     <name>-compare.png (lib/repro-images.mjs, lib/png.mjs) shows both and their
//     difference. `verify` can judge by them (expect.imagesDiffer), and stages its
//     pictures in the temp folder, so it never changes the tree.
//  2. THE PACK IS impexp RUN IN PROCESS (packTree, scripts/lib/tb-project.mjs).
//     It throws where the command line would have refused, and returns the
//     counts the command line prints, which `pack` prints as it does.
//  3. AN IDE THAT RUNS MANY REPRODUCERS OWNS THE REGISTRY TIDY ONCE. Under
//     `verify` this process calls startTidy for every lane, so the tbbuild and
//     tbrun children (which find TB_REGISTRY_OWNER set) leave the registry alone,
//     and nothing a lane that finishes first puts back is another's entry. The
//     lanes use ports base, base+1, ..., which key the work folders tbbuild and
//     tbrun use, as in check_examples.
//  4. `run` STAGES A COPY, never the tree: it adds Sources/TbRunProbe.twin, a
//     module whose [RunAfterBuild] Sub clears the console and calls Main. With
//     --exe that module is left out, because tbrun runs Sub Main in the built exe
//     itself.
//  5. `cli` MODE RUNS THE COMPILER EXECUTABLE (bin\twinBASIC_win32.exe) with
//     stdin from the null device and a time limit, on the packed project, and
//     compares its exit code and output. Paths are given backslashed and in full:
//     `export` prefixes \\?\ to its project path, and cannot find a folder named
//     with forward slashes (WIP.Harness.md, "Getting at the `.twin` sources").
//  6. EACH `cli` COMMAND RUNS ON A PRIVATE DESKTOP, in a kill-on-close job, as
//     the IDE does (scripts/lib/tb-launch.ps1), with its output in files. The
//     compiler opens a modal message box for a damaged project and waits on it
//     for ever; on the user's desktop that box is theirs to close, and on a
//     private one nobody could. The launcher reads each box (title, text) and
//     presses OK, and the output the reproducer's `expect` is matched against
//     starts with one `dialog: <title>: <text>` line per box. `attach` files
//     are copied into the command's temp folder, so {tmp}/<attach path> is a
//     copy a command may damage further.
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CliError,
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  withUsageError,
} from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { keptIdeLines, killTree, launchOnDesktop, summaryLine, TARGETS } from "./lib/tb-ide.mjs";
import {
  BETA_FILE,
  IMAGES_DIR,
  IMAGES_ENV,
  ImageError,
  PNG_TEMPLATES,
  PNGDUMP_BAS,
  PNGDUMP_TWIN,
  collectImages,
  compareWithKept,
  copyImageTemplates,
  embedProblems,
  imageFile,
  imageSourceCheck,
  imageZipEntries,
  imagesDifferProblems,
  imagesKeyProblem,
  writeComparison,
} from "./lib/repro-images.mjs";
import { buildNumber, compilerExe, findIde } from "./lib/tb-install.mjs";
import { packTree } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";
import {
  NO_VB6,
  REPRO_OUT,
  REPRO_PROJECT,
  findVb6,
  oneLine,
  reproFiles,
  reproProblem,
  reproZipFiles,
  runRepro,
} from "./lib/vb6.mjs";
import { fileEntry, zipFiles } from "./lib/zip.mjs";

let tidy = null;
exitOnCrash(() => finishTidy(tidy));

const USAGE = `usage: node scripts/bug_repro.mjs <command> [slug ...] [--ide <twinBASIC.exe>] [--port N] [--arch win32|win64] [--timeout S] [--llvm] [--exe] [--jobs N] [--keep] [--show|--hide] [--template <name>] [--with-vb6] [--with-images] [--vb6 <VB6.EXE>] [--existing] [--marked] [-h, --help]

Reproducer projects for the entries of BUGS-TO-REPORT.md, under bugs/<slug>/, or
under bugs/filed/<slug>/ once the entry has been filed upstream.
<slug> is kebab-case: lowercase letters and digits joined by single hyphens, and
is never "filed".

A reproducer may also have a VB6 project in vb6/, to show what VB6 does. It holds
sources only (Probe.vbp and its .bas, .cls, .frm and .ctl files, with their
.frx and .ctx), builds Probe.exe, and writes what it finds to out.txt beside the
exe, handling every error itself.

A graphical defect also carries pictures. repro.json's "images" lists their names; the
PngDump modules (PngDump.twin in src/Sources/, PngDump.bas in vb6/) save each as <name>.png
in the folder named by the BUGREPRO_IMAGES environment variable, which run and vb6 set. They
are kept in images/ as <name>-tb.png (run) and <name>-vb6.png (vb6), and when both exist
<name>-compare.png shows twinBASIC, VB6 and their difference: the picture for the issue.

Commands:
  new <slug> "<title>"  create bugs/<slug>/src/ from the console template, with a
                        project of the slug's name and a Startup module, and
                        bugs/<slug>/repro.json with "mode": "manual"; with
                        --template, from that template's Settings and Sources;
                        with --with-vb6, also bugs/<slug>/vb6/, from the VB6
                        template under test/repro-templates/vb6/; with
                        --with-images, also the PngDump modules from
                        test/repro-templates/png/, and "images": ["main"] in repro.json
  pack <slug>           pack src/ into <slug>.twinproj with scripts/impexp.mjs, and
                        write <slug>.zip, the file a GitHub issue accepts, with the
                        files repro.json's "attach" names and the files of images/;
                        when vb6/ exists, also write <slug>-vb6.zip, holding its
                        source files only; print the -compare.png pictures that go
                        into the issue
  compile <slug>        pack, then compile the project in the IDE (tbbuild) and
                        print its diagnostics
  build <slug>          pack, then compile and build it (tbbuild --build)
  run <slug>            run a copy of src/ whose [RunAfterBuild] probe calls Sub
                        Main, and print what it writes to the DEBUG CONSOLE (tbrun);
                        with "images" in repro.json, keep each picture as
                        images/<name>-tb.png. A reproducer of mode test is run
                        with tbrun --tests instead: a PASS or FAIL line for each
                        of its test cases and compile cases
  vb6 <slug>            build vb6/ with VB6 in a copy under the temp folder (never
                        in the repository), run Probe.exe on a private desktop,
                        and print out.txt. A project may have forms. A project
                        that calls MsgBox or InputBox is refused. Needs VB6; no IDE.
                        With "images" in repro.json, keep each picture as
                        images/<name>-vb6.png
  verify [slug ...]     run what each repro.json says, for the named reproducers or
                        all of bugs/* and bugs/filed/*, and report per reproducer
                        whether it reproduces; a filed one is labelled with its
                        issue, and one that no longer reproduces is probably fixed.
                        Needs a twinBASIC install; run by a person only. A run-mode
                        reproducer with expect.imagesDiffer compares its fresh
                        pictures (kept in the temp folder) with images/<name>-vb6.png.
                        A lane reproducer ("lane": "ide:<lane>" or "addin:<lane>")
                        reproduces when every test it names passes; its lanes run
                        last, through ide_test or addin_test. A probe reproducer
                        runs node <script> <args...> and is judged by its expect.
                        A test reproducer runs tbrun --tests on src/, and is
                        judged by its expect: the PASS and FAIL lines it prints
  file <slug> <issue>  move the entry whose reproducer is <slug> out of
                        BUGS-TO-REPORT.md into bugs/filed/<slug>/REPORT.md, move
                        bugs/<slug>/ to bugs/filed/<slug>/, and record the issue in
                        its repro.json
  file --marked         do that for every entry that carries a mark line under its
                        title: *FILED #<n>*, *CAPTURED IN EXISTING #<n>* or
                        *CAPTURED IN \\#<n>*. If any entry cannot be filed, none is

Options:
  --ide <path>      twinBASIC.exe (default: $TB_IDE, else the newest
                    twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>        DevTools port to start the IDE on (default 9440); with verify
                    the first of the lanes' ports
  --arch <target>   win32 or win64 (default win32); compile, build and run
  --timeout <secs>  as tbbuild's and tbrun's; with a cli reproducer, the time
                    limit on each command of the compiler executable, which runs
                    on a private desktop, and whose dialog boxes are read and
                    closed (default 120); with vb6, the limit on Probe.exe
                    (default 30)
  --llvm            build with LLVM; build and run
  --exe             run also runs the built exe and prints what it writes; run
  --jobs <n>        reproducers to run at once, on ports base, base+1, ... (default
                    1); verify
  --keep            leave the IDE running; its pid is printed; compile, build, run.
                    With vb6, keep the work folder and print where it is
  --show, --hide    show the IDE on the desktop, or keep it on a private one
                    (default: hidden, unless TBBUILD_SHOW is set)
  --template <name> new: the project to start from, console (the default) or a
                    folder of test/repro-templates/, such as webview2-form
  --with-vb6        new: also create vb6/ from the VB6 template
  --with-images     new: also copy the PngDump modules, and list "main" under images
  --vb6 <path>      vb6: VB6.EXE (default: $VB6_EXE, else VB98\\VB6.EXE under
                    Program Files (x86) or Program Files)
  --existing        file: the issue was already open, and covers this bug; recorded
                    as "existing" in repro.json
  --marked          file: take the issue and the slug from the entries' marks
  -h, --help        print this text and exit

Exit codes:
  0  done: a project that compiled, built or ran as it should; with verify, every
     reproducer that can be run on its own still reproduces; with file, filed
  1  a finding: the project has errors, or its build failed after a clean compile,
     or, with run on a reproducer of mode test, a case failed;
     with vb6, VB6 refused the project; with verify, at least one reproducer no
     longer reproduces
  2  a refused command line (a slug that is not kebab-case or is "filed", a
     reproducer that does not exist or is in both bugs/ and bugs/filed/, an option
     that does not apply to the command), a repro.json that is not valid, no IDE (or,
     with vb6, no VB6), a project that could not be packed, a harness that failed,
     or a crash; with vb6, a reproducer with no vb6/ folder, a VB6 project that has
     no Probe.vbp or calls MsgBox or InputBox, or VB6 failing to build it; with
     verify, a lane's harness failed; with file, an entry that is missing,
     ambiguous or marked unreadably, or a bugs/filed/<slug> that is already there
     (nothing is changed)
  3  new: bugs/<slug> or bugs/filed/<slug> already exists
  4  the compile never settled
  5  the project crashes the compiler
  6  run, vb6: the probe printed nothing (vb6: no out.txt, or an empty one)
  7  run: the probe ended before it returned
  8  run --exe, vb6: the exe exited with a code other than 0, or was still running
     after --timeout, or the event log records that the exe faulted, or it opened
     a box; vb6: or the VB runtime logged an error for it
  9  run, vb6: a picture that repro.json's "images" names was not written, or could
     not be read`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

// What each command takes besides -h; anything else given is refused.
const APPLIES = {
  new: ["template", "withVb6", "withImages"],
  pack: [],
  compile: ["ide", "port", "arch", "timeout", "keep", "show", "hide"],
  build: ["ide", "port", "arch", "timeout", "keep", "show", "hide", "llvm"],
  run: ["ide", "port", "arch", "timeout", "keep", "show", "hide", "llvm", "exe"],
  vb6: ["vb6", "timeout", "keep"],
  verify: ["ide", "port", "timeout", "jobs", "show", "hide"],
  file: ["existing", "marked"],
};
// parseCli keys an option by its camelCase name (`--with-vb6` is `withVb6`).
const FLAG = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// The folder under bugs/ that holds the reproducers of filed entries, so not a slug.
const FILED = "filed";

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        ide: { type: "string" },
        port: { type: "string" },
        arch: { type: "string" },
        timeout: { type: "string" },
        jobs: { type: "string" },
        llvm: { type: "boolean", default: false },
        exe: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
        show: { type: "boolean", default: false },
        hide: { type: "boolean", default: false },
        template: { type: "string" },
        "with-vb6": { type: "boolean", default: false },
        "with-images": { type: "boolean", default: false },
        vb6: { type: "string" },
        existing: { type: "boolean", default: false },
        marked: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: Infinity },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const [command, ...args] = positionals;
if (!command) die(2, USAGE);

// Everything on the command line is read before anything starts.
const { port, arch, timeout, jobs, template, slugs, title, issue } = withUsageError(() => {
  if (!(command in APPLIES)) throw new CliError("unknown-command", `unknown command: ${command}`);
  for (const key of Object.keys(values)) {
    if (key === "help" || !values[key] || APPLIES[command].includes(key)) continue;
    throw new CliError("inapplicable", `${FLAG(key)} does not apply to ${command}`, { option: FLAG(key) });
  }
  if (values.show && values.hide) {
    throw new CliError("conflict", "--show and --hide cannot be given together", { options: ["--show", "--hide"] });
  }
  const read = {
    port: numberOption(values.port ?? "9440", { option: "--port", integer: true, min: 1, max: 65535 }),
    arch: values.arch === undefined ? undefined : choiceOption(values.arch, { option: "--arch", choices: TARGETS }),
    timeout: values.timeout === undefined ? undefined : numberOption(values.timeout, { option: "--timeout", above: 0 }),
    jobs: numberOption(values.jobs ?? "1", { option: "--jobs", integer: true, min: 1 }),
    template:
      values.template === undefined || values.template === "console"
        ? null
        : choiceOption(values.template, { option: "--template", choices: ["console", ...reproTemplates()] }),
  };
  if (read.port + read.jobs - 1 > 65535) {
    throw new CliError("bad-number", `--port ${read.port} with --jobs ${read.jobs} runs past port 65535`);
  }
  const named = command === "verify" ? args : args.slice(0, 1);
  let issue;
  if (command === "file") {
    // file <slug> <issue>, or file --marked, which takes both from the entries.
    if (values.marked) {
      if (args.length) {
        throw new CliError("unexpected-positional", "--marked takes no slug or issue", { arg: args[0] });
      }
      if (values.existing) {
        throw new CliError("conflict", "--existing does not apply with --marked: an entry's mark says it", {
          options: ["--existing", "--marked"],
        });
      }
      named.length = 0;
    } else {
      if (args.length < 2) {
        throw new CliError("missing-positional", "file needs a slug and an issue number: file <slug> <issue>");
      }
      if (args.length > 2)
        throw new CliError("unexpected-positional", `unexpected argument: ${args[2]}`, { arg: args[2] });
      if (!/^[1-9]\d*$/.test(args[1])) {
        throw new CliError("bad-number", `the issue number expects a whole number of at least 1, got: ${args[1]}`, {
          value: args[1],
        });
      }
      issue = Number(args[1]);
    }
  } else if (command !== "verify") {
    // verify takes any number of slugs, none meaning every reproducer under bugs/.
    if (!args.length) {
      throw new CliError("missing-positional", `${command} needs a slug`);
    } else if (command === "new" && args.length !== 2) {
      throw new CliError("missing-positional", `new needs a slug and the entry's title, quoted: new <slug> "<title>"`);
    } else if (command !== "new" && args.length > 1) {
      throw new CliError("unexpected-positional", `unexpected argument: ${args[1]}`, { arg: args[1] });
    }
  }
  for (const slug of named) {
    if (!SLUG.test(slug)) {
      throw new CliError(
        "bad-slug",
        `not a valid slug: ${slug} (lowercase letters and digits joined by single hyphens, such as my-bug)`,
      );
    }
    if (slug === FILED) {
      throw new CliError("bad-slug", `not a valid slug: ${slug} (it is the folder the filed reproducers are moved to)`);
    }
  }
  if (command === "new" && !args[1].trim()) throw new CliError("empty-value", "the entry's title is empty");
  return { ...read, slugs: named, title: command === "new" ? args[1] : undefined, issue };
}, usageError);

// ------------------------------------------------------------------ the files

// BUG_REPRO_BUGS names another folder to hold the reproducers, so that test/png.test.mjs can run
// `new` and `verify` over fixtures without touching bugs/. Nothing else sets it.
const BUGS = process.env.BUG_REPRO_BUGS ? path.resolve(process.env.BUG_REPRO_BUGS) : path.join(REPO_ROOT, "bugs");
const TEMPLATE = path.join(REPO_ROOT, "test", "example-projects", "console", "Settings");

// The templates new --template takes besides console: each folder of
// test/repro-templates/ that holds a Settings file and a Sources/ folder. A
// function rather than a constant, since the command line is read above.
function reproTemplatesDir() {
  return path.join(REPO_ROOT, "test", "repro-templates");
}
function reproTemplates() {
  const dir = reproTemplatesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => existsSync(path.join(dir, n, "Settings")) && existsSync(path.join(dir, n, "Sources")))
    .sort();
}
const TBBUILD = path.join(REPO_ROOT, "scripts", "tbbuild.mjs");
const TBRUN = path.join(REPO_ROOT, "scripts", "tbrun.mjs");

const FILED_DIR = path.join(BUGS, FILED);
const QUEUE = path.join(REPO_ROOT, "BUGS-TO-REPORT.md");

// Where a reproducer is: bugs/<slug>/ while its entry is queued, bugs/filed/<slug>/
// once it is filed. A slug in neither is taken to be a queued one, which is where
// `new` makes it and what a refusal names; a slug in both is an error.
const where = (slug) => {
  const queued = path.join(BUGS, slug);
  const filed = path.join(FILED_DIR, slug);
  const isFiled = existsSync(filed);
  if (isFiled && existsSync(queued)) {
    throw new Fail(`${rel(queued)} and ${rel(filed)} both exist: a reproducer is in one or the other`);
  }
  const dir = isFiled ? filed : queued;
  return {
    filed: isFiled,
    dir,
    src: path.join(dir, "src"),
    repro: path.join(dir, "repro.json"),
    twinproj: path.join(dir, `${slug}.twinproj`),
    zip: path.join(dir, `${slug}.zip`),
    vb6: path.join(dir, "vb6"),
    vb6zip: path.join(dir, `${slug}-vb6.zip`),
  };
};
const rel = (file) => path.relative(REPO_ROOT, file).replaceAll("\\", "/");

/** A failure the command (or one verify lane) reports and ends on, with the exit code it means. */
class Fail extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

const crlf = (lines) => lines.join("\r\n");
const STARTUP = crlf(["Module Startup", "", "    Public Sub Main()", "    End Sub", "", "End Module", ""]);
// The probe that runs Main inside the IDE. The harness starts the IDE with
// WEBVIEW2_USER_DATA_FOLDER and WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
// (tb-ide.mjs), so that it can be driven over DevTools, and code run in the IDE
// inherits them. WebView2 lets them override what a WebView2 control asks for,
// so a reproducer's control would join the IDE's own browser with other options
// and fail to start (8007139F, ERROR_INVALID_STATE; measured, BETA 995). The
// probe clears both for the length of Main, and an IDE started by hand has
// neither.
const PROBE = crlf([
  "Module TbRunProbe",
  '    Private Declare PtrSafe Function SetEnvironmentVariableW Lib "kernel32" ( _',
  "        ByVal lpName As LongPtr, ByVal lpValue As LongPtr) As Long",
  "    [RunAfterBuild]",
  "    Public Sub RunRepro()",
  "        Debug.Cls",
  '        Dim folder As String = Environ$("WEBVIEW2_USER_DATA_FOLDER")',
  '        Dim args As String = Environ$("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS")',
  '        SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), 0',
  '        SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), 0',
  "        Main",
  '        If Len(folder) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_USER_DATA_FOLDER"), StrPtr(folder)',
  '        If Len(args) Then SetEnvironmentVariableW StrPtr("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"), StrPtr(args)',
  "    End Sub",
  "End Module",
  "",
]);

// kebab-case to PascalCase, for the project's name. A name that begins with a
// digit is not an identifier, so it is given a word to start with.
function pascal(slug) {
  const name = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
  return (/^\d/.test(name) ? `Repro${name}` : name).slice(0, 60);
}

// Rewrites the string value of one key of the template's Settings. A key the
// template does not have is an error, because it means the template changed.
function setKey(text, key, value, file = TEMPLATE) {
  const re = new RegExp(`("${key.replaceAll(".", "\\.")}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(text)) throw new Fail(`${rel(file)} has no "${key}" to set`);
  return text.replace(re, (_, head) => `${head}${JSON.stringify(value)}`);
}

// The VB6 project `new --with-vb6` starts a reproducer's vb6/ from: Probe.vbp and
// Module1.bas, whose Sub Main opens out.txt, prints one line under an error handler
// and closes. It has no Settings and Sources, so it is never one of the templates
// `--template` takes.
const VB6_TEMPLATE = path.join(REPO_ROOT, "test", "repro-templates", "vb6");

// `template` is null for the console template, else a folder of
// test/repro-templates/, whose Sources/ are copied as they are. `withVb6` also
// makes vb6/.
function newReproducer(slug, entryTitle, template = null, withVb6 = false, withImages = false) {
  for (const dir of [path.join(BUGS, slug), path.join(FILED_DIR, slug)]) {
    if (existsSync(dir)) throw new Fail(`${rel(dir)} already exists`, 3);
  }
  const p = where(slug);
  const from = template ? path.join(reproTemplatesDir(), template, "Settings") : TEMPLATE;
  if (!existsSync(from)) throw new Fail(`no template project at ${rel(from)}`);
  if (withVb6 && !existsSync(path.join(VB6_TEMPLATE, `${REPRO_PROJECT}.vbp`))) {
    throw new Fail(`no VB6 template project at ${rel(VB6_TEMPLATE)}`);
  }
  for (const file of withImages ? [PNGDUMP_TWIN, ...(withVb6 ? [PNGDUMP_BAS] : [])] : []) {
    if (!existsSync(path.join(PNG_TEMPLATES, file)))
      throw new Fail(`no picture module at ${rel(PNG_TEMPLATES)}/${file}`);
  }
  const name = pascal(slug);
  const vb6Note = withVb6 ? " and vb6/" : "";
  let settings = readFileSync(from, "utf8");
  settings = setKey(settings, "project.name", name, from);
  settings = setKey(settings, "project.appTitle", name, from);
  settings = setKey(settings, "project.description", `Reproduces: ${entryTitle}`, from);
  settings = setKey(settings, "project.id", `{${randomUUID().toUpperCase()}}`, from);
  mkdirSync(p.src, { recursive: true });
  writeFileSync(path.join(p.src, "Settings"), settings);
  if (template) {
    cpSync(path.join(reproTemplatesDir(), template, "Sources"), path.join(p.src, "Sources"), { recursive: true });
  } else {
    mkdirSync(path.join(p.src, "Sources"), { recursive: true });
    writeFileSync(path.join(p.src, "Sources", "Startup.twin"), STARTUP);
  }
  const steps = "Describe what a person does to see the bug, or set mode to compile, build, run or cli.";
  const repro = { mode: "manual", steps, ...(withImages ? { images: ["main"] } : {}) };
  writeFileSync(p.repro, `${JSON.stringify(repro, null, 2)}\n`);
  if (withVb6) cpSync(VB6_TEMPLATE, p.vb6, { recursive: true });
  if (withImages) copyImageTemplates(p.dir, { withVb6 });
  console.log(
    `created ${rel(p.dir)}/ (project ${name}${template ? `, from template ${template}` : ""}): ` +
      `edit src/Sources${vb6Note}, then pack; repro.json is manual until set`,
  );
  if (withImages) {
    console.log(
      `pictures: src/Sources/${PNGDUMP_TWIN}${withVb6 ? ` and vb6/${PNGDUMP_BAS}` : ""} save what a surface shows; ` +
        `call PngDump.Surface Form1, "main" (or PngDump.Window for a control with no hDC), then run${withVb6 ? " and vb6" : ""}`,
    );
  }
}

// ------------------------------------------------------------------------ pack

// Packs src/ into the .twinproj with impexp, in process, then zips it with the
// files repro.json's `attach` names; with a vb6/ folder, also zips its sources
// into <slug>-vb6.zip. Returns what impexp's command line prints for an import,
// then what was zipped, which the caller prints or not.
function pack(slug) {
  const p = where(slug);
  if (!existsSync(path.join(p.src, "Settings"))) throw new Fail(`no ${rel(p.src)}/Settings: nothing to pack`);
  const repro = existsSync(p.repro) ? loadRepro(slug) : {};
  const attach = repro.attach ?? [];
  let counts;
  try {
    counts = packTree(p.twinproj, p.src);
  } catch (e) {
    throw new Fail(e.message);
  }
  const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  const said = `${[
    `importing into "${p.twinproj}" from "${p.src}"...`,
    ...counts.skipped.map((s) => `  skipped ${s.rel} (${s.why})`),
    ...counts.added.map((a) => `  added ${a} (an empty folder the IDE expects)`),
    `  ${plural(counts.files, "file")}, ${plural(counts.folders, "folder")}, ${counts.size} bytes`,
    "... DONE",
  ].join("\n")}\n`;
  const pictures = imageZipEntries(p.dir);
  const files = [
    fileEntry(`${slug}.twinproj`, p.twinproj),
    ...attach.map((a) => fileEntry(a, path.join(p.dir, a))),
    ...pictures,
  ];
  writeFileSync(p.zip, zipFiles(files));
  const withs = [...attach, ...(pictures.length ? [`${pictures.length} files of ${IMAGES_DIR}/`] : [])];
  const also = withs.length ? `, with ${withs.join(", ")}` : "";
  let packed = `${said}packed ${rel(p.twinproj)} and ${rel(p.zip)}${also}`;
  // The pictures that go into the issue itself, beside the zip that holds the rest.
  for (const name of repro.images ?? []) {
    const compare = imageFile(path.join(p.dir, IMAGES_DIR), name, "compare");
    packed += existsSync(compare)
      ? `\npicture for the issue: ${rel(compare)}`
      : `\nno ${rel(compare)} yet: it is written when run has made ${name}-tb.png and vb6 has made ${name}-vb6.png`;
  }
  if (repro.images?.length)
    for (const problem of reportEmbedProblems(slug, repro.images)) packed += `\nwarning: ${problem}`;
  if (existsSync(p.vb6)) {
    const problem = vb6Problem(slug);
    if (problem) throw new Fail(`${rel(p.vb6)}/ ${problem}`);
    const sources = reproZipFiles(p.vb6);
    writeFileSync(p.vb6zip, zipFiles(sources));
    const { others } = reproFiles(p.vb6);
    packed += `\npacked ${rel(p.vb6zip)} (${sources.length} source files${others.length ? `; left out: ${others.join(", ")}` : ""})`;
  }
  return packed;
}

// ------------------------------------------------------------ repro.json

const MODES = ["compile", "build", "run", "test", "cli", "lane", "probe", "manual"];
// The warnings loadRepro has printed, so that a reproducer read by several commands warns once.
const warned = new Set();
// What `expect` may hold in each mode. A lane reproducer has no `expect`: its tests are what it expects.
const EXPECT_KEYS = {
  compile: ["exit", "diagnostics", "noDiagnostics"],
  build: ["exit", "message"],
  run: ["exit", "output", "absent", "imagesDiffer"],
  cli: ["exit", "output", "absent"],
  probe: ["exit", "output", "absent"],
  test: ["exit", "output", "absent"],
};

// The suites a lane reproducer names, as "<suite>:<lane>": the runner, and the
// lanes it has, by the name its --only matches and its report prints.
const SUITES = {
  ide: { tool: "scripts/ide_test.mjs", lanes: "test/ide/lanes.mjs" },
  addin: { tool: "scripts/addin_test.mjs", lanes: "test/addin/lanes.mjs" },
};
const laneNames = {};
for (const [suite, { lanes }] of Object.entries(SUITES)) {
  const list = (await import(pathToFileURL(path.join(REPO_ROOT, lanes)).href)).default;
  laneNames[suite] = list.map((l) => l.name ?? path.basename(l.file, ".test.mjs"));
}

/**
 * Reads and strictly checks bugs/<slug>/repro.json. A fault is a Fail that names
 * the file and the key. Returns the file's content with each regular expression
 * compiled (`expect.output` as RegExp objects, `expect.message` as one).
 *
 * `makingPictures` is for `run` and `vb6`, which make the pictures: the VB6 picture that
 * `expect.imagesDiffer` compares with need not be there yet, since `vb6` is what writes it.
 */
function loadRepro(slug, { makingPictures = false } = {}) {
  const file = where(slug).repro;
  const name = rel(file);
  const bad = (key, why) => {
    throw new Fail(`${name}: ${key ? `"${key}" ` : ""}${why}`);
  };
  if (!existsSync(file)) throw new Fail(`${name}: no such file`);
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return bad("", `is not valid JSON: ${e.message}`);
  }
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(json)) return bad("", "must be a JSON object");
  const keys = [
    "mode",
    "arch",
    "llvm",
    "exe",
    "expect",
    "cli",
    "lane",
    "tests",
    "probe",
    "steps",
    "attach",
    "images",
    "issue",
    "existing",
  ];
  for (const key of Object.keys(json)) if (!keys.includes(key)) bad(key, "is not a key repro.json has");
  if (!MODES.includes(json.mode)) bad("mode", `must be one of ${MODES.join(", ")}`);
  const { mode } = json;
  // A cli, lane, probe or manual reproducer may have no project of its own: a cli
  // one can name the files an installation ships by {ide}, and a lane or a probe
  // brings its own.
  const p = where(slug);
  const hasSrc = existsSync(path.join(p.src, "Settings"));
  if (!hasSrc && !["cli", "lane", "probe", "manual"].includes(mode))
    bad("mode", `${mode} needs a project, and there is no ${rel(p.src)}/Settings`);
  if ("attach" in json) {
    if (!hasSrc) bad("attach", `goes into ${slug}.zip, which pack writes only from ${rel(p.src)}/`);
    const own = [`${slug}.twinproj`, `${slug}.zip`, `${slug}-vb6.zip`, "repro.json", "REPORT.md"];
    if (!Array.isArray(json.attach) || !json.attach.length) {
      bad("attach", "must be a list of paths, relative to the reproducer's folder");
    }
    json.attach.forEach((a, i) => {
      const key = `attach[${i}]`;
      if (typeof a !== "string" || !a) bad(key, "must be a path, relative to the reproducer's folder");
      if (a.includes("\\") || path.posix.isAbsolute(a) || a.split("/").some((s) => s === ".." || s === "." || !s)) {
        bad(key, "must be a relative path with forward slashes, inside the reproducer's folder");
      }
      if (own.includes(a)) bad(key, `names ${a}, which is not an attachment`);
      if (a.startsWith("vb6/")) bad(key, `names ${a}, which goes into ${slug}-vb6.zip with the rest of vb6/`);
      if (a.startsWith(`${IMAGES_DIR}/`))
        bad(key, `names ${a}, which goes into ${slug}.zip with the rest of ${IMAGES_DIR}/`);
      if (json.attach.indexOf(a) !== i) bad(key, `names ${a} twice`);
      const file = path.join(p.dir, a);
      if (!existsSync(file) || !statSync(file).isFile()) bad(key, `names ${a}, which is not a file in ${rel(p.dir)}/`);
    });
  }
  // A VB6 project in vb6/ is packed into <slug>-vb6.zip and is built by `vb6`; it has no key
  // of its own, and is checked here so that a broken one is found whatever the command.
  if (existsSync(p.vb6)) {
    const why = vb6Problem(slug);
    if (why) throw new Fail(`${rel(p.vb6)}/ ${why}`);
  }
  // `images` names the pictures a run and a vb6 build keep in images/. The modules that draw them
  // must be in the project, which is an error; a copy that has drifted from the template only warns.
  if ("images" in json) {
    if (!["run", "manual"].includes(mode)) bad("images", "applies to the run and manual modes only");
    if (!hasSrc) bad("images", `names pictures that ${rel(p.src)}/Settings should draw, and it is not there`);
    const problem = imagesKeyProblem(json.images);
    if (problem) bad(problem.key, problem.why);
    const { errors, warnings } = imageSourceCheck(p.dir);
    if (errors.length) bad("images", errors.join("; "));
    for (const warning of warnings) {
      const said = `warning: ${name}: ${warning}`;
      if (!warned.has(said)) console.error(said);
      warned.add(said);
    }
  }
  if ("issue" in json && !(Number.isInteger(json.issue) && json.issue > 0)) {
    bad("issue", "must be a positive whole number, the number of a twinbasic/twinbasic issue");
  }
  if ("existing" in json) {
    if (typeof json.existing !== "boolean") bad("existing", "must be true or false");
    if (!("issue" in json)) bad("existing", "applies with issue only");
  }
  if ("arch" in json && !TARGETS.includes(json.arch)) bad("arch", `must be ${TARGETS.join(" or ")}`);
  if ("llvm" in json && typeof json.llvm !== "boolean") bad("llvm", "must be true or false");
  if (json.llvm && !["build", "run"].includes(mode)) bad("llvm", "applies to the build and run modes only");
  if ("exe" in json && typeof json.exe !== "boolean") bad("exe", "must be true or false");
  if (json.exe && mode !== "run") bad("exe", "applies to the run mode only");
  if ("steps" in json && typeof json.steps !== "string") bad("steps", "must be a string");
  if (mode === "cli") {
    // One command, a list of arguments, or several, a list of such lists.
    const isArgs = (v) => Array.isArray(v) && v.length && v.every((a) => typeof a === "string");
    const commands = Array.isArray(json.cli) && json.cli.every(Array.isArray) ? json.cli : [json.cli];
    if (!commands.length || !commands.every(isArgs)) {
      bad("cli", "must be a list of strings, the compiler executable's arguments, or a list of such lists");
    }
    if (!hasSrc) {
      for (const arg of commands.flat()) {
        const name = /\{(project|src)\}/.exec(arg)?.[0];
        if (name) bad("cli", `names ${name}, and there is no ${rel(p.src)}/Settings to make it from`);
      }
    }
  } else if ("cli" in json) bad("cli", "applies to the cli mode only");
  if (mode === "lane") {
    const [suite, lane, ...rest] = typeof json.lane === "string" ? json.lane.split(":") : [];
    if (!SUITES[suite] || !lane || rest.length) {
      bad("lane", `must be "<suite>:<lane>", the suite one of ${Object.keys(SUITES).join(", ")}`);
    }
    if (!laneNames[suite].includes(lane)) bad("lane", `names ${lane}, which is not a lane of ${SUITES[suite].lanes}`);
    const isTests =
      Array.isArray(json.tests) && json.tests.length && json.tests.every((t) => typeof t === "string" && t);
    if (!isTests) bad("tests", "must be a list of the lane's test names, each of which passes while the bug is there");
  } else {
    if ("lane" in json) bad("lane", "applies to the lane mode only");
    if ("tests" in json) bad("tests", "applies to the lane mode only");
  }
  if (mode === "probe") {
    const [script, ...args] = Array.isArray(json.probe) ? json.probe : [];
    if (
      typeof script !== "string" ||
      !/^scripts\/[\w.-]+\.mjs$/.test(script) ||
      !args.every((a) => typeof a === "string")
    ) {
      bad("probe", "must be a list: a script under scripts/ (scripts/<name>.mjs), then its arguments");
    }
    if (!existsSync(path.join(REPO_ROOT, script))) bad("probe", `names ${script}, which is not there`);
  } else if ("probe" in json) bad("probe", "applies to the probe mode only");

  const out = { ...json, expect: undefined };
  if (mode === "manual" || mode === "lane") {
    if ("expect" in json) bad("expect", `does not apply to the ${mode} mode`);
    return out;
  }
  if (!isObject(json.expect)) bad("expect", "is required, an object, for every mode but lane and manual");
  const e = json.expect;
  for (const key of Object.keys(e)) {
    if (!["exit", "diagnostics", "noDiagnostics", "output", "absent", "message", "imagesDiffer"].includes(key)) {
      bad(`expect.${key}`, "is not a key expect has");
    }
    if (!EXPECT_KEYS[mode].includes(key)) bad(`expect.${key}`, `does not apply to the ${mode} mode`);
  }
  if ("exit" in e && !Number.isInteger(e.exit)) bad("expect.exit", "must be a whole number");
  if ("diagnostics" in e && !(Array.isArray(e.diagnostics) && e.diagnostics.every((d) => typeof d === "string"))) {
    bad("expect.diagnostics", "must be a list of strings, diagnostic codes");
  }
  if ("noDiagnostics" in e && typeof e.noDiagnostics !== "boolean")
    bad("expect.noDiagnostics", "must be true or false");
  const regex = (key, text) => {
    if (typeof text !== "string") bad(key, "must be a string, a regular expression");
    try {
      return new RegExp(text, "m");
    } catch (err) {
      return bad(key, `is not a regular expression: ${err.message}`);
    }
  };
  const expect = { ...e };
  for (const key of ["output", "absent"]) {
    if (!(key in e)) continue;
    if (!Array.isArray(e[key])) bad(`expect.${key}`, "must be a list of regular expressions");
    expect[key] = e[key].map((text, i) => regex(`expect.${key}[${i}]`, text));
  }
  if ("message" in e) expect.message = regex("expect.message", e.message);
  if ("imagesDiffer" in e) {
    if (typeof e.imagesDiffer !== "boolean") bad("expect.imagesDiffer", "must be true or false");
    if (!("images" in json)) bad("expect.imagesDiffer", "needs an images list in repro.json, which names the pictures");
    for (const picture of makingPictures ? [] : json.images) {
      const kept = imageFile(path.join(p.dir, IMAGES_DIR), picture, "vb6");
      if (!existsSync(kept)) {
        bad("expect.imagesDiffer", `needs ${rel(kept)}, the VB6 picture to compare with: vb6 makes it`);
      }
    }
  }
  if (!Object.keys(e).length) bad("expect", "is empty: say what a reproduction looks like");
  out.expect = expect;
  return out;
}

/** Why bugs/<slug>/vb6/ cannot be packed or built, or null: it is not a folder, has no Probe.vbp, or calls MsgBox or InputBox. */
function vb6Problem(slug) {
  const { vb6 } = where(slug);
  if (!statSync(vb6).isDirectory()) return "is not a folder";
  return reproProblem(vb6);
}

// --------------------------------------------------------- running the tools

function findTools(ide) {
  const exe = findIde(ide);
  if (!exe || !existsSync(exe)) {
    throw new Fail(
      (exe ? `no twinBASIC IDE at ${exe}: ` : "no twinBASIC IDE found: ") +
        "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
    );
  }
  return exe;
}

// A tool run as a child, with its output collected. A tool that outlives its
// time limit is ended with its process tree, by pid.
function runNode(scriptArgs, limitMs, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, scriptArgs, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (d) => {
      stdout += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d) => {
      stderr += d;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    }, limitMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: `${stderr}${e.message}`, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

// The limit on a child: its own timeout, and then time for it to end the IDE.
const limitFor = (secs, own) => ((secs ?? own) + 240) * 1000;

const ideFlags = (o) => [
  ...(o.ide ? ["--ide", o.ide] : []),
  "--port",
  String(o.port),
  ...(o.arch ? ["--arch", o.arch] : []),
  ...(o.timeout !== undefined ? ["--timeout", String(o.timeout)] : []),
  ...(o.show ? ["--show"] : []),
  ...(o.hide ? ["--hide"] : []),
  ...(o.keep ? ["--keep"] : []),
];

/** tbbuild on the packed project: `build` adds --build, or --llvm, which implies it. */
async function compileOrBuild(slug, o) {
  const p = where(slug);
  const flags = [...ideFlags(o), ...(o.llvm ? ["--llvm"] : o.build ? ["--build"] : [])];
  const r = await runNode([TBBUILD, p.twinproj, "--json", ...flags], limitFor(o.timeout, 180));
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // a failure before the report: its words are on stderr
  }
  return { ...r, json, message: r.stderr.trim(), output: r.stdout };
}

/**
 * tbrun on a staged copy of src/, with the probe module added unless --exe runs Sub Main in the exe.
 *
 * With `o.images`, the names of the pictures the probe draws, an empty folder beside the stage is
 * named in BUGREPRO_IMAGES in tbrun's environment, which the IDE and, under --exe, the exe inherit
 * from it (launchIde and runExe both start from process.env). The result's `imagesDir` is that
 * folder, which the caller removes; it is beside the stage, not in it, because the stage is
 * the project and is imported whole.
 */
async function runProbe(slug, o) {
  const p = where(slug);
  const stage = path.join(tmpdir(), "bugrepro", String(o.port), slug);
  const imagesDir = o.images ? `${stage}.images` : null;
  rmSync(stage, { recursive: true, force: true });
  if (imagesDir) {
    rmSync(imagesDir, { recursive: true, force: true });
    mkdirSync(imagesDir, { recursive: true });
  }
  try {
    cpSync(p.src, stage, { recursive: true });
    mkdirSync(path.join(stage, "Sources"), { recursive: true });
    if (!o.exe) writeFileSync(path.join(stage, "Sources", "TbRunProbe.twin"), PROBE);
    // Always --allow-name-clash: on a build before 1005 tbrun refuses a probe whose module holds a
    // procedure named like the module, because those builds then do not run the [RunAfterBuild]
    // Sub, and a reproducer exists to show a defect such as that one, so it must still run.
    const flags = [...ideFlags(o), "--allow-name-clash", ...(o.llvm ? ["--llvm"] : []), ...(o.exe ? ["--exe"] : [])];
    const env = imagesDir ? { [IMAGES_ENV]: imagesDir } : {};
    const r = await runNode([TBRUN, stage, ...flags], limitFor(o.timeout, 120), env);
    return { ...r, json: null, message: r.stderr.trim(), output: r.stdout, imagesDir };
  } catch (e) {
    if (imagesDir) rmSync(imagesDir, { recursive: true, force: true });
    throw e;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/**
 * tbrun --tests on src/ itself: tbrun stages its own copy, and adds nothing to it, so
 * no copy is made here. It prints a PASS or FAIL line for each of the project's test
 * cases and compile cases (scripts/lib/tb-tests.mjs).
 */
async function runTests(slug, o) {
  const flags = [...ideFlags(o), "--tests"];
  const r = await runNode([TBRUN, where(slug).src, ...flags], limitFor(o.timeout, 120));
  return { ...r, json: null, message: r.stderr.trim(), output: r.stdout };
}

/** The mode in a reproducer's repro.json, read without checking the rest, or null. */
function reproMode(slug) {
  try {
    return JSON.parse(readFileSync(where(slug).repro, "utf8").replace(/^\u{FEFF}/u, "")).mode ?? null;
  } catch {
    return null;
  }
}

/**
 * The names under "images" in a reproducer's repro.json, checked as loadRepro checks them, or
 * null when it has none. A repro.json that cannot be read is not this function's to report: the
 * commands that need the rest of it say so.
 */
function reproImages(slug) {
  const { repro } = where(slug);
  if (!existsSync(repro)) return null;
  try {
    if (!("images" in JSON.parse(readFileSync(repro, "utf8").replace(/^\u{FEFF}/u, "")))) return null;
  } catch {
    return null;
  }
  return loadRepro(slug, { makingPictures: true }).images;
}

/**
 * After `run`: keeps each picture the probe wrote as images/<name>-tb.png, notes the beta that drew it
 * for the comparison's label, and writes <name>-compare.png where the VB6 picture is already there.
 * Prints a line a picture. Returns 0, or 9 when a picture is missing or cannot be read.
 */
function keepRunImages(slug, names, fromDir, ide) {
  const dir = path.join(where(slug).dir, IMAGES_DIR);
  const { found, missing } = collectImages(fromDir, dir, names, "tb");
  const beta = buildNumber(findIde(ide));
  if (found.length) {
    if (beta) writeFileSync(path.join(dir, BETA_FILE), `${beta}\n`);
    else rmSync(path.join(dir, BETA_FILE), { force: true });
  }
  let code = 0;
  for (const name of missing) {
    console.error(
      `image ${name}: the probe wrote no ${name}.png: call PngDump.Surface or PngDump.Window with that name`,
    );
    code = 9;
  }
  for (const name of found) {
    console.log(`image ${name}: kept as ${rel(imageFile(dir, name, "tb"))}`);
    try {
      const compared = writeComparison(dir, name, beta);
      if (compared) console.log(`${compared.line} (${rel(compared.file)})`);
    } catch (e) {
      if (!(e instanceof ImageError)) throw e;
      console.error(`image ${name}: ${e.message}`);
      code = 9;
    }
  }
  return code;
}

/**
 * The compiler executable, as a cli repro.json says: one command, or several in
 * turn in the one temp folder. Their output is joined, and their exit code is
 * the one they all gave, or the codes joined by commas when they differ.
 *
 * Each command runs on a private desktop, in a kill-on-close job, with its
 * standard output and error in files (launchOnDesktop). The compiler opens a
 * modal message box for some inputs, a damaged project among them, and waits for
 * it to be closed: on the user's own desktop that is a box to dismiss by hand, on
 * a private one nobody sees it. So the launcher records every dialog box the
 * command opens and presses its OK button, which lets the command go on. A
 * command's output is one `dialog: <title>: <text>` line per box, in the order
 * they opened, then its standard output, then its standard error.
 */
async function runCli(slug, repro, o) {
  const ide = findTools(o.ide);
  const exe = compilerExe(ide);
  if (!existsSync(exe)) throw new Fail(`no compiler beside the IDE at ${exe}`);
  const scratch = mkdtempSync(path.join(tmpdir(), "bugrepro-cli-"));
  try {
    // Copies, so a command that writes its project or its folder (an import, an
    // export --overwrite) never touches the committed reproducer. A reproducer
    // with no src/ has neither, and loadRepro refused {project} and {src} for it.
    const p = where(slug);
    const project = path.join(scratch, path.basename(p.twinproj));
    const src = path.join(scratch, "src");
    if (existsSync(path.join(p.src, "Settings"))) {
      copyFileSync(p.twinproj, project);
      cpSync(p.src, src, { recursive: true });
    }
    // The attachments, at their own relative paths: {tmp}/<attach path> is a copy.
    for (const a of repro.attach ?? []) {
      const to = path.join(scratch, ...a.split("/"));
      mkdirSync(path.dirname(to), { recursive: true });
      copyFileSync(path.join(p.dir, a), to);
    }
    const commands = repro.cli.every(Array.isArray) ? repro.cli : [repro.cli];
    const limit = (o.timeout ?? 120) * 1000;
    const codes = [];
    let stdout = "";
    let stderr = "";
    let output = "";
    for (const [n, command] of commands.entries()) {
      const argv = command.map((a) =>
        a
          .replaceAll("{project}", project)
          .replaceAll("{src}", src)
          .replaceAll("{tmp}", scratch)
          .replaceAll("{ide}", path.resolve(path.dirname(ide))),
      );
      // The scratch folder is deleted at the end, and holds these files.
      const outFile = path.join(scratch, `.cli-${n}.out`);
      const errFile = path.join(scratch, `.cli-${n}.err`);
      let run;
      try {
        run = await launchOnDesktop({
          exe,
          args: argv,
          desktop: `bugrepro-cli-${process.pid}`,
          env: process.env,
          stdout: outFile,
          stderr: errFile,
          dialogs: "close",
        });
      } catch (e) {
        throw new Fail(`could not run the compiler executable on a private desktop: ${e.message}`);
      }
      let timer;
      const timedOut = await Promise.race([
        run.exited.then(() => false),
        new Promise((r) => {
          timer = setTimeout(() => r(true), limit);
        }),
      ]);
      clearTimeout(timer);
      if (timedOut) {
        // By pid with its tree; the launcher's end closes the job, which takes whatever the kill missed.
        killTree(run.pid);
        run.launcher.kill();
      }
      const { code, dialogs } = await run.finished;
      if (timedOut) {
        const boxes = dialogs.length ? `; it opened ${dialogs.map((d) => `"${d.title}"`).join(", ")}` : "";
        throw new Fail(`the compiler executable ran past ${limit / 1000} s${boxes}`);
      }
      const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
      const said = dialogs.map((d) => `dialog: ${d.title}: ${d.text.replace(/\s*\r?\n\s*/g, " ")}\n`).join("");
      codes.push(code);
      stdout += read(outFile);
      stderr += read(errFile);
      output += `${said}${read(outFile)}${read(errFile)}`;
    }
    const code = codes.every((c) => c === codes[0]) ? codes[0] : codes.join(",");
    return { code, stdout, stderr, json: null, message: "", output };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// tbbuild's and tbrun's exit codes in this tool's table.
const TBBUILD_EXIT = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5, 5: 1 };
const TBRUN_EXIT = { 0: 0, 1: 1, 2: 2, 3: 6, 4: 5, 5: 7, 6: 8, 7: 1 };
const mapped = (table, code) => table[code] ?? 2;

// ------------------------------------------------------------------- printing

function printBuild(r) {
  const j = r.json;
  if (j) {
    if (j.arch && j.arch !== TARGETS[0]) console.log(`target: ${j.arch}`);
    for (const row of j.diagnostics ?? []) console.log(row);
    console.log(summaryLine([j.errors, j.warnings, j.hints, j.infos]));
    // The build log is the finding when the build failed; on success it is noise.
    if (r.code === 5) for (const line of j.buildLog ?? []) console.log(line);
    if (j.built) console.log(`built: ${j.built}`);
    if (j.dialogs?.length) console.log("dialogs:", JSON.stringify(j.dialogs));
    if (j.kept && j.idePid) for (const l of keptIdeLines(j.idePid)) console.log(l);
  } else if (r.stdout.trim()) process.stdout.write(r.stdout);
  if (r.stderr.trim()) process.stderr.write(r.stderr.endsWith("\n") ? r.stderr : `${r.stderr}\n`);
}

function printRun(r) {
  if (r.stdout) process.stdout.write(r.stdout.endsWith("\n") ? r.stdout : `${r.stdout}\n`);
  if (r.stderr.trim()) process.stderr.write(r.stderr.endsWith("\n") ? r.stderr : `${r.stderr}\n`);
}

/**
 * `vb6 <slug>`: builds bugs/<slug>/vb6/ in a copy under the temp folder, runs
 * Probe.exe and prints the out.txt it wrote. Returns the exit code.
 */
async function runVb6(slug) {
  requireReproducer(slug, { project: false });
  const p = where(slug);
  if (!existsSync(p.vb6)) throw new Fail(`${rel(p.dir)}/ has no vb6/ folder: nothing to build`);
  const why = vb6Problem(slug);
  if (why) throw new Fail(`${rel(p.vb6)}/ ${why}`);
  const exe = findVb6(values.vb6);
  if (!exe) throw new Fail(values.vb6 ? `no such file: ${values.vb6}\n${NO_VB6}` : NO_VB6);
  // The pictures Probe.exe draws are written to a folder of ours, named in BUGREPRO_IMAGES.
  const names = reproImages(slug);
  const imagesDir = names ? mkdtempSync(path.join(tmpdir(), "bugrepro-vb6-images-")) : null;
  try {
    return await buildAndRunVb6(slug, exe, names, imagesDir);
  } finally {
    if (imagesDir) rmSync(imagesDir, { recursive: true, force: true });
  }
}

async function buildAndRunVb6(slug, exe, names, imagesDir) {
  const p = where(slug);
  let r;
  try {
    r = await runRepro(exe, p.vb6, {
      timeoutMs: (timeout ?? 30) * 1000,
      keep: values.keep,
      env: imagesDir ? { [IMAGES_ENV]: imagesDir } : {},
    });
  } catch (e) {
    throw new Fail(`vb6: ${e.message}`);
  }
  if (values.keep) console.error(`vb6: work folder kept in ${r.work}`);
  if (!r.built) {
    process.stderr.write(`${r.log.trim() || "VB6 did not build the project, and wrote no log"}\n`);
    return 1;
  }
  for (const line of r.lines) console.log(line);
  if (r.timedOut) {
    console.error(`vb6: ${REPRO_PROJECT}.exe was still running after ${timeout ?? 30} s and was ended`);
    return 8;
  }
  // A VB6 exe that faults exits with code 0; the event log's record is what says it faulted.
  if (r.fault) {
    const { code, module, offset } = r.fault;
    console.error(
      `vb6: ${REPRO_PROJECT}.exe ended with exception 0x${code} in ${module} at offset 0x${offset} ` +
        `(the Application event log's record; its exit code was ${r.status})`,
    );
    return 8;
  }
  // An unhandled error opens a box in an exe built without Unattended Execution, which the
  // launcher closes, and is logged by the VB runtime in one built with it; both exit 0.
  if (r.dialogs.length || r.logged.length) {
    for (const d of r.dialogs)
      console.error(`vb6: ${REPRO_PROJECT}.exe opened a box, closed: ${oneLine(`${d.title}: ${d.text}`)}`);
    for (const m of r.logged) console.error(`vb6: the VB runtime logged for ${REPRO_PROJECT}.exe: ${oneLine(m)}`);
    return 8;
  }
  if (!r.lines.length) {
    console.error(`vb6: ${REPRO_PROJECT}.exe wrote no ${REPRO_OUT}, or an empty one`);
    return 6;
  }
  if (r.status !== 0) {
    console.error(`vb6: ${REPRO_PROJECT}.exe exited with code ${r.status}`);
    return 8;
  }
  return names ? keepVb6Images(slug, names, imagesDir) : 0;
}

/**
 * After `vb6`: keeps each picture Probe.exe wrote as images/<name>-vb6.png, and writes
 * <name>-compare.png where the twinBASIC picture is already there, labelled with the beta that
 * `run` recorded. Prints a line a picture. Returns 0, or 9 when a picture is missing or unreadable.
 */
function keepVb6Images(slug, names, fromDir) {
  const dir = path.join(where(slug).dir, IMAGES_DIR);
  const { found, missing } = collectImages(fromDir, dir, names, "vb6");
  let code = 0;
  for (const name of missing) {
    console.error(
      `image ${name}: Probe.exe wrote no ${name}.png: call PngDump.Surface or PngDump.Window with that name`,
    );
    code = 9;
  }
  for (const name of found) {
    console.log(`image ${name}: kept as ${rel(imageFile(dir, name, "vb6"))}`);
    try {
      const compared = writeComparison(dir, name);
      if (compared) console.log(`${compared.line} (${rel(compared.file)})`);
    } catch (e) {
      if (!(e instanceof ImageError)) throw e;
      console.error(`image ${name}: ${e.message}`);
      code = 9;
    }
  }
  return code;
}

// A reproducer is a folder with src/Settings; for verify, one with a repro.json
// will do, since a cli reproducer may name only files an installation ships.
const requireReproducer = (slug, { project = true } = {}) => {
  const p = where(slug);
  if (existsSync(path.join(p.src, "Settings"))) return;
  if (!project && existsSync(p.repro)) return;
  throw new Fail(`no such reproducer: ${rel(p.dir)} (no src/Settings${project ? "" : " and no repro.json"})`);
};

// --------------------------------------------------------------------- verify

// Whether a run reproduces what repro.json expects: the problems, none if it does.
function mismatches(repro, r) {
  const e = repro.expect;
  const problems = [];
  if ("exit" in e && r.code !== e.exit) problems.push(`expected exit ${e.exit}, got ${r.code}`);
  if (e.diagnostics) {
    const rows = (r.json?.diagnostics ?? []).join("\n");
    for (const code of e.diagnostics) if (!rows.includes(code)) problems.push(`${code} was not reported`);
  }
  if (e.noDiagnostics) {
    const j = r.json;
    const total = j ? j.errors + j.warnings + j.hints + j.infos : null;
    if (total === null) problems.push("there is no report to read");
    else if (total) problems.push(`expected no diagnostics, got ${total}`);
  }
  for (const re of e.output ?? []) if (!re.test(r.output)) problems.push(`the output does not match /${re.source}/`);
  for (const re of e.absent ?? []) if (re.test(r.output)) problems.push(`the output matches /${re.source}/`);
  if (e.message && !e.message.test(r.message)) problems.push(`the message does not match /${e.message.source}/`);
  if ("imagesDiffer" in e) problems.push(...imagesDifferProblems(e.imagesDiffer, r.images ?? []));
  return problems;
}

// One reproducer: pack it, run what repro.json says, judge the result.
async function verifyOne(slug, repro, lane) {
  if (repro.mode === "manual") return { slug, status: "manual", detail: repro.steps ?? "(no steps recorded)" };
  const o = { ide: values.ide, port: lane, arch: repro.arch, timeout, show: values.show, hide: values.hide };
  // The pictures of a run that is judged by them are staged in the temp folder, and never kept in the tree.
  let imagesDir = null;
  try {
    if (repro.mode !== "probe" && existsSync(path.join(where(slug).src, "Settings"))) pack(slug);
    let r;
    let table;
    if (repro.mode === "cli") r = await runCli(slug, repro, o);
    else if (repro.mode === "probe") r = await runProbeScript(repro);
    else if (repro.mode === "test") {
      r = await runTests(slug, o);
      table = TBRUN_EXIT;
    } else if (repro.mode === "run") {
      const judged = "imagesDiffer" in repro.expect;
      r = await runProbe(slug, { ...o, llvm: repro.llvm, exe: repro.exe, images: judged ? repro.images : null });
      imagesDir = r.imagesDir;
      table = TBRUN_EXIT;
    } else {
      r = await compileOrBuild(slug, { ...o, build: repro.mode === "build", llvm: repro.llvm });
      table = TBBUILD_EXIT;
    }
    const wanted = repro.expect.exit;
    if (r.timedOut) return { slug, status: "harness", detail: "the tool outlived its time limit and was ended" };
    // Exit 2 is the tool's own failure, and tbbuild's 3 a compile that never
    // settled: neither says anything about the bug unless the file expects it.
    const failed = table && (r.code === 2 || (table === TBBUILD_EXIT && r.code === 3)) && r.code !== wanted;
    if (failed || r.code === null) {
      const said = (r.message || r.stdout || "no output").trim().split("\n").slice(-3).join(" | ");
      return { slug, status: "harness", detail: `exit ${r.code}: ${said}` };
    }
    if (imagesDir) {
      try {
        r = { ...r, images: compareWithKept(imagesDir, path.join(where(slug).dir, IMAGES_DIR), repro.images) };
      } catch (e) {
        if (!(e instanceof ImageError)) throw e;
        return { slug, status: "harness", detail: e.message };
      }
    }
    const problems = mismatches(repro, r);
    return problems.length
      ? { slug, status: "no-longer", detail: problems.join("; ") }
      : { slug, status: "reproduces", detail: `${repro.mode} exit ${r.code}` };
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    return { slug, status: "harness", detail: e.message.split("\n").join(" | ") };
  } finally {
    if (imagesDir) rmSync(imagesDir, { recursive: true, force: true });
  }
}

// A probe reproducer: the script, run with node from the repository's root, with
// --ide passed on when verify was given one. It starts what it needs itself, ends
// it, and must end on its own; what it prints is judged by `expect`.
function runProbeScript(repro) {
  const [script, ...args] = repro.probe;
  const argv = [path.join(REPO_ROOT, script), ...args, ...(values.ide ? ["--ide", values.ide] : [])];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, argv, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });
    child.on("error", (e) => resolve({ code: null, output, message: `could not start ${script}: ${e.message}` }));
    child.on("close", (code) => resolve({ code, output, stdout: output }));
  });
}

// The spec reporter's marks for a test that passed and one that failed.
const PASSED = "\u{2714}";
const FAILED = "\u{2716}";

/**
 * Runs the lanes that lane reproducers name, each suite's once through its own
 * runner, and judges each reproducer by its tests: it reproduces when every one
 * passed. Returns one result per slug, as verifyOne does.
 */
async function verifyLanes(slugs, repros) {
  const results = [];
  for (const [suite, { tool }] of Object.entries(SUITES)) {
    const mine = slugs.filter((s) => repros.get(s).lane.split(":")[0] === suite);
    if (!mine.length) continue;
    const lanes = [...new Set(mine.map((s) => repros.get(s).lane.split(":")[1]))];
    const argv = [path.join(REPO_ROOT, tool), "--only", `^(${lanes.join("|")})$`];
    if (values.ide) argv.push("--ide", values.ide);
    if (values.show) argv.push("--show");
    if (values.hide) argv.push("--hide");
    console.log(`running ${tool} for ${lanes.join(", ")}`);
    // The runner owns the registry for its lanes. verify's own tidy has ended by
    // now, and the variable it left would make the runner refuse to start.
    const env = { ...process.env };
    delete env.TB_REGISTRY_OWNER;
    const r = await new Promise((resolve) => {
      const child = spawn(process.execPath, argv, {
        cwd: REPO_ROOT,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      let out = "";
      child.stdout.on("data", (d) => {
        out += d;
      });
      child.stderr.on("data", (d) => {
        out += d;
      });
      child.on("error", (e) => resolve({ code: null, out: `${out}\ncould not start ${tool}: ${e.message}` }));
      child.on("close", (code) => resolve({ code, out }));
    });
    // Kept whole, for a result that needs reading: the runner's report is long.
    const log = path.join(tmpdir(), "bugrepro", `verify-${suite}.log`);
    mkdirSync(path.dirname(log), { recursive: true });
    writeFileSync(log, r.out);
    const lines = r.out.split(/\r?\n/);
    // A lane's report is the block from its "--- <name> (port <n>): ..." line to the next lane's.
    const block = (lane) => {
      const start = lines.findIndex((l) => l.startsWith(`--- ${lane} (port `));
      if (start < 0) return null;
      const end = lines.findIndex((l, i) => i > start && l.startsWith("--- "));
      return lines.slice(start, end < 0 ? lines.length : end);
    };
    // The runner's 2 is its harness failing, and 3 the registry or a work folder
    // not put back: either leaves no verdict to trust.
    const broken = r.code === null || r.code >= 2;
    const said = r.out.trim().split("\n").slice(-3).join(" | ");
    for (const slug of mine) {
      const repro = repros.get(slug);
      const lane = repro.lane.split(":")[1];
      const report = block(lane);
      const res = (status, detail) =>
        results.push({ slug, status, detail: status === "reproduces" ? detail : `${detail} (see ${log})` });
      if (broken) {
        res("harness", `${tool} exit ${r.code}: ${said}`);
        continue;
      }
      if (!report) {
        res("harness", `${tool} printed no report for the lane ${lane}`);
        continue;
      }
      const mark = (test) => {
        const found = report
          .map((l) => l.trimStart())
          .filter((l) => l.startsWith(`${PASSED} ${test} (`) || l.startsWith(`${FAILED} ${test} (`));
        if (!found.length) return null;
        return found.some((l) => l.startsWith(FAILED)) ? "failed" : "passed";
      };
      const marks = repro.tests.map((test) => ({ test, mark: mark(test) }));
      const missing = marks.filter((m) => !m.mark);
      const failed = marks.filter((m) => m.mark === "failed");
      if (missing.length)
        res("harness", `the lane ${lane} did not report ${missing.map((m) => `"${m.test}"`).join(", ")}`);
      else if (failed.length) res("no-longer", `${repro.lane}: failed ${failed.map((m) => `"${m.test}"`).join(", ")}`);
      else res("reproduces", `${repro.lane}: ${marks.length} test${marks.length === 1 ? "" : "s"} passed`);
    }
  }
  return results;
}

const LABEL = {
  reproduces: "reproduces",
  "no-longer": "NO LONGER REPRODUCES",
  manual: "manual",
  harness: "harness failed",
};

async function verify() {
  let all = slugs;
  if (!all.length) {
    // bugs/<slug>/ and bugs/filed/<slug>/. A slug in both is listed twice, and
    // requireReproducer refuses it below.
    const under = (dir) =>
      existsSync(dir)
        ? readdirSyncDirs(dir).filter((s) => SLUG.test(s) && existsSync(path.join(dir, s, "repro.json")))
        : [];
    all = [...under(BUGS).filter((s) => s !== FILED), ...under(FILED_DIR)];
  }
  if (!all.length) {
    console.log("no reproducers: nothing under bugs/ has a repro.json");
    return 0;
  }
  // Every file is read before anything starts: a fault in one is the person's to
  // fix, and not a reason to have run the others.
  const repros = new Map();
  for (const slug of all) {
    requireReproducer(slug, { project: false });
    repros.set(slug, loadRepro(slug));
  }
  const automatic = all.filter((s) => ["compile", "build", "run", "test"].includes(repros.get(s).mode));
  const lanes = Math.min(jobs, Math.max(all.length, 1));
  if (automatic.length || all.some((s) => repros.get(s).mode === "cli")) findTools(values.ide);
  if (automatic.length) {
    const ports = Array.from({ length: lanes }, (_, i) => port + i);
    tidy = startTidy({
      paths: automatic.map((s) => where(s).twinproj),
      prefixes: ports.flatMap((n) => [
        path.join(tmpdir(), "tbbuild", String(n)),
        path.join(tmpdir(), "tbrun", String(n)),
      ]),
    });
  }
  const results = [];
  const report = (res) => {
    const repro = repros.get(res.slug);
    res.filed = where(res.slug).filed;
    results.push(res);
    console.log(
      `${res.slug}${filedLabel(res.filed, repro)}: ${LABEL[res.status]}${res.detail ? ` -- ${res.detail}` : ""}`,
    );
  };
  // Lane reproducers run last, through their suites' runners, which take their
  // lanes' ports and own the registry while they run.
  const byLane = all.filter((s) => repros.get(s).mode === "lane");
  const queue = all.filter((s) => !byLane.includes(s));
  const lane = async (index) => {
    while (queue.length) {
      const slug = queue.shift();
      report(await verifyOne(slug, repros.get(slug), port + index));
    }
  };
  try {
    await Promise.all(Array.from({ length: lanes }, (_, i) => lane(i)));
  } finally {
    finishTidy(tidy);
    tidy = null;
  }
  for (const res of await verifyLanes(byLane, repros)) report(res);
  const count = (status, filed = false) => results.filter((r) => r.status === status && r.filed === filed).length;
  const summary = (filed) =>
    `${count("reproduces", filed)} reproduce, ${count("no-longer", filed)} no longer reproduce, ` +
    `${count("manual", filed)} manual, ${count("harness", filed)} harness failed`;
  console.log(summary(false));
  const anyFiled = results.some((r) => r.filed);
  if (anyFiled) {
    console.log(`filed: ${summary(true)}`);
    if (count("no-longer", true)) {
      console.log("filed bugs that no longer reproduce are probably fixed");
    }
  }
  const total = (status) => count(status) + count(status, true);
  return total("harness") ? 2 : total("no-longer") ? 1 : 0;
}

// A filed reproducer's result line says so, and names its issue.
function filedLabel(filed, repro) {
  if (!filed) return "";
  if (!repro.issue) return " (filed)";
  return ` (filed #${repro.issue}${repro.existing ? ", existing" : ""})`;
}

function readdirSyncDirs(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// ----------------------------------------------------------------------- file

// BUGS-TO-REPORT.md is a preamble, a `---` line, and then entries separated by
// `---` lines. An entry runs from its `## ` title to the line before the next
// `---` (or to the end of the file). The file is handled as lines that keep their
// own endings, so what is not changed is written back byte for byte.
const bare = (line) => line.replace(/\r?\n$/, "");
const FILED_MARK = /^\*FILED #([1-9]\d*)\*$/;
const CAPTURED_MARK = /^\*CAPTURED IN (?:EXISTING )?\\?#([1-9]\d*)\*$/;
const TWINPROJ_NAME = /`([a-z0-9]+(?:-[a-z0-9]+)*)\.twinproj`/g;
const BUGS_FOLDER = /\bbugs\/([a-z0-9]+(?:-[a-z0-9]+)*)\//g;
const issueUrl = (n) => `https://github.com/twinbasic/twinbasic/issues/${n}`;

/** The queue file's lines and entries: each entry's index range and title. */
function parseQueue(text) {
  const lines = text.split(/(?<=\n)/);
  const seps = [];
  lines.forEach((line, i) => {
    if (bare(line) === "---") seps.push(i);
  });
  if (!seps.length) throw new Fail(`${rel(QUEUE)} has no "---" line after its preamble`);
  const entries = seps.map((sep, k) => {
    const end = k + 1 < seps.length ? seps[k + 1] : lines.length;
    let from = sep + 1;
    while (from < end && bare(lines[from]) === "") from++;
    let to = end;
    while (to > from && bare(lines[to - 1]) === "") to--;
    if (from >= end || !bare(lines[from]).startsWith("## ")) {
      throw new Fail(`${rel(QUEUE)}: the entry after line ${sep + 1} does not begin with a "## " title`);
    }
    return { k, sep, end, from, to, title: bare(lines[from]) };
  });
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.title)) throw new Fail(`${rel(QUEUE)}: two entries have the title ${e.title}`);
    seen.add(e.title);
  }
  return { lines, entries, eol: text.includes("\r\n") ? "\r\n" : "\n" };
}

/** The index of the first line under an entry's title that is not blank, or -1. */
function lineUnderTitle(lines, entry) {
  let i = entry.from + 1;
  while (i < entry.to && bare(lines[i]) === "") i++;
  return i < entry.to ? i : -1;
}

/**
 * The mark line under an entry's title: null if it has none, `{ bad }` if it cannot
 * be read, else its index, issue and whether it is "existing". A `*DEFERRED ...*`
 * line is the owner's note that the entry is held on purpose: it is not a mark
 * `file --marked` acts on, and is skipped without a word.
 */
function markOf(lines, entry) {
  const i = lineUnderTitle(lines, entry);
  if (i < 0) return null;
  const line = bare(lines[i]).trimEnd();
  if (!/^\*(FILED|CAPTURED)/.test(line)) return null;
  const filed = FILED_MARK.exec(line);
  const captured = CAPTURED_MARK.exec(line);
  const m = filed ?? captured;
  return m ? { index: i, issue: Number(m[1]), existing: !filed } : { bad: line };
}

/**
 * The entries whose body names `<slug>.twinproj`. An entry whose reproducer is not
 * an attachment (it names two files in the installation instead) has no such name,
 * and says which reproducer is its own only in its closing comment, as bugs/<slug>/:
 * when no entry names the project, the entries that name that folder are the answer.
 */
function entriesNaming(queue, slug) {
  const naming = (needle) =>
    queue.entries.filter((e) => queue.lines.slice(e.from, e.to).some((line) => line.includes(needle)));
  const byProject = naming(`\`${slug}.twinproj\``);
  return byProject.length ? byProject : naming(`bugs/${slug}/`);
}

/** The reproducers (folders under bugs/) an entry names: by `<slug>.twinproj`, else by bugs/<slug>/ in its comment. */
function reproducersNamed(queue, entry) {
  const found = (re) => {
    const names = new Set();
    for (const line of queue.lines.slice(entry.from, entry.to)) {
      for (const m of line.matchAll(re)) if (m[1] !== FILED && existsSync(path.join(BUGS, m[1]))) names.add(m[1]);
    }
    return names;
  };
  const byProject = found(TWINPROJ_NAME);
  return byProject.size ? byProject : found(BUGS_FOLDER);
}

/** The lines of an entry as the report holds them: its title down, without its mark line and the blank after it. */
function reportLines(queue, entry) {
  const body = queue.lines.slice(entry.from, entry.to).map(bare);
  const mark = markOf(queue.lines, entry);
  // A filing mark goes, and so does a DEFERRED line when an entry is filed by hand.
  const at = mark && !mark.bad ? mark.index : lineUnderTitle(queue.lines, entry);
  const drop = at >= 0 && (mark ? !mark.bad : /^\*DEFERRED\b/.test(bare(queue.lines[at])));
  if (drop) body.splice(at - entry.from, body[at - entry.from + 1] === "" ? 2 : 1);
  return body;
}

/** The file's lines without the entry and one `---` beside it, so one `---` still divides the entries either side. */
function withoutEntry(queue, entry) {
  const out = queue.lines.slice();
  if (entry.end < out.length) {
    // the blank line, the entry, the blank line and the `---` after it
    out.splice(entry.sep + 1, entry.end - entry.sep);
  } else {
    // the last entry: its own `---` goes too, unless it is the preamble's
    out.splice(entry.k === 0 ? entry.sep + 1 : entry.sep);
    while (out.length > 1 && bare(out[out.length - 1]) === "") out.pop();
    if (out.length && !/\n$/.test(out[out.length - 1])) out[out.length - 1] += queue.eol;
  }
  return out.join("");
}

/**
 * Everything filing `slug` as `issue` needs, checked, and nothing written: the
 * report, the file's text without the entry, and the paths. `original` is the
 * file as read, which says whether exactly one entry names the slug; `text` is
 * what is left of it after the entries filed before this one.
 */
function prepareFiling(slug, issue, existing, original, text) {
  const queued = path.join(BUGS, slug);
  const filed = path.join(FILED_DIR, slug);
  if (existsSync(filed)) throw new Fail(`${rel(filed)} already exists`);
  if (!existsSync(queued)) throw new Fail(`no such reproducer: ${rel(queued)}`);
  loadRepro(slug);
  const named = entriesNaming(original, slug);
  if (named.length !== 1) {
    const what = named.length ? `${named.length} entries name` : "no entry names";
    throw new Fail(`${what} \`${slug}.twinproj\` in ${rel(QUEUE)}${named.map((e) => `\n  ${e.title}`).join("")}`);
  }
  const current = parseQueue(text);
  const entry = current.entries.find((e) => e.title === named[0].title);
  const head = existing
    ? `Covered by the existing issue [twinbasic/twinbasic#${issue}](${issueUrl(issue)}).`
    : `Filed as [twinbasic/twinbasic#${issue}](${issueUrl(issue)}).`;
  // REPORT.md sits beside the pictures it embeds, so their paths lose bugs/<slug>/.
  const lines = reportLines(current, entry).map((line) => line.replaceAll(`](bugs/${slug}/images/`, "](images/"));
  const report = `${[head, "", ...lines].join(current.eol)}${current.eol}`;
  return { slug, issue, existing, queued, filed, report, text: withoutEntry(current, entry), title: entry.title };
}

/**
 * What keeps a reproducer's pictures out of its report: its entry in the queue file, or the
 * REPORT.md of a filed one, must embed each `<name>-compare.png` (lib/repro-images.mjs's
 * embedProblems). Each line names the report.
 */
function reportEmbedProblems(slug, names) {
  const p = where(slug);
  const imagesDir = path.join(p.dir, IMAGES_DIR);
  const report = path.join(p.dir, "REPORT.md");
  if (existsSync(report)) {
    return embedProblems(readFileSync(report, "utf8"), p.dir, imagesDir, names).map((x) => `${rel(report)}: ${x}`);
  }
  const { queue } = readQueue();
  const named = entriesNaming(queue, slug);
  if (named.length !== 1) {
    const what = named.length ? `${named.length} entries name` : "no entry names";
    return [`${rel(QUEUE)}: ${what} ${slug}, so whether it shows its pictures is not known`];
  }
  const text = queue.lines.slice(named[0].from, named[0].to).join("");
  return embedProblems(text, REPO_ROOT, imagesDir, names).map((x) => `${rel(QUEUE)}, ${named[0].title}: ${x}`);
}

/** Moves the reproducer, writes REPORT.md and repro.json's issue, and rewrites the queue file. */
function carryOutFiling(plan) {
  mkdirSync(FILED_DIR, { recursive: true });
  renameSync(plan.queued, plan.filed);
  writeFileSync(path.join(plan.filed, "REPORT.md"), plan.report);
  const file = path.join(plan.filed, "repro.json");
  const raw = readFileSync(file, "utf8");
  const json = JSON.parse(raw.replace(/^\u{FEFF}/u, ""));
  json.issue = plan.issue;
  if (plan.existing) json.existing = true;
  else delete json.existing;
  const out = `${JSON.stringify(json, null, 2)}\n`;
  writeFileSync(file, raw.includes("\r\n") ? out.replaceAll("\n", "\r\n") : out);
  writeFileSync(QUEUE, plan.text);
}

const filingLine = (plan) =>
  `filed ${plan.slug} as ${plan.existing ? "existing issue " : "issue "}#${plan.issue}: ${rel(plan.queued)} -> ${rel(plan.filed)}/ with REPORT.md`;

function readQueue() {
  if (!existsSync(QUEUE)) throw new Fail(`no ${rel(QUEUE)}`);
  const text = readFileSync(QUEUE, "utf8");
  return { text, queue: parseQueue(text) };
}

/** `file <slug> <issue> [--existing]` */
function fileOne(slug, issueNumber, existing) {
  const queued = path.join(BUGS, slug);
  const filed = path.join(FILED_DIR, slug);
  if (existsSync(filed)) throw new Fail(`${rel(filed)} already exists`);
  if (!existsSync(queued)) throw new Fail(`no such reproducer: ${rel(queued)}`);
  const { text, queue } = readQueue();
  const plan = prepareFiling(slug, issueNumber, existing, queue, text);
  carryOutFiling(plan);
  console.log(filingLine(plan));
}

/** `file --marked`: every marked entry, or none of them. */
function fileMarked() {
  const { text, queue } = readQueue();
  const problems = [];
  const wanted = [];
  for (const entry of queue.entries) {
    const mark = markOf(queue.lines, entry);
    if (!mark) continue;
    if (mark.bad) {
      problems.push(`${entry.title}\n  the mark cannot be read: ${mark.bad}`);
      continue;
    }
    const names = reproducersNamed(queue, entry);
    if (names.size !== 1) {
      const what = names.size
        ? `names ${names.size} reproducers: ${[...names].join(", ")}`
        : "names no reproducer under bugs/";
      problems.push(`${entry.title}\n  the entry ${what}, as \`<slug>.twinproj\` or bugs/<slug>/`);
      continue;
    }
    wanted.push({ slug: [...names][0], ...mark });
  }
  const plans = [];
  let left = text;
  for (const w of wanted) {
    try {
      const plan = prepareFiling(w.slug, w.issue, w.existing, queue, left);
      left = plan.text;
      plans.push(plan);
    } catch (e) {
      if (!(e instanceof Fail)) throw e;
      problems.push(`${w.slug}\n  ${e.message.split("\n").join("\n  ")}`);
    }
  }
  if (problems.length) {
    throw new Fail(
      `nothing was filed: ${problems.length} marked ${problems.length === 1 ? "entry" : "entries"} cannot be filed\n${problems.join("\n")}`,
    );
  }
  if (!plans.length) {
    console.log(`no entry in ${rel(QUEUE)} carries a mark line`);
    return;
  }
  for (const plan of plans) {
    carryOutFiling(plan);
    console.log(filingLine(plan));
  }
  console.log(`${plans.length} filed; ${parseQueue(left).entries.length} left in ${rel(QUEUE)}`);
}

// ----------------------------------------------------------------------- main

async function main() {
  const [slug] = slugs;
  const o = {
    ide: values.ide,
    port,
    arch,
    timeout,
    show: values.show,
    hide: values.hide,
    keep: values.keep,
    llvm: values.llvm,
    exe: values.exe,
  };
  switch (command) {
    case "new":
      newReproducer(slug, title, template, values.withVb6, values.withImages);
      return 0;
    case "vb6":
      return runVb6(slug);
    case "pack":
      requireReproducer(slug);
      console.log(pack(slug));
      return 0;
    case "file":
      if (values.marked) fileMarked();
      else fileOne(slug, issue, values.existing);
      return 0;
    case "compile":
    case "build": {
      requireReproducer(slug);
      findTools(o.ide);
      console.log(pack(slug));
      const r = await compileOrBuild(slug, { ...o, build: command === "build" });
      printBuild(r);
      if (r.timedOut) throw new Fail("tbbuild outlived its time limit and was ended");
      return mapped(TBBUILD_EXIT, r.code);
    }
    case "run": {
      requireReproducer(slug);
      findTools(o.ide);
      if (reproMode(slug) === "test") {
        if (o.exe || o.llvm)
          throw new Fail(`${o.exe ? "--exe" : "--llvm"} does not apply to a reproducer of mode test`);
        const r = await runTests(slug, o);
        printRun(r);
        if (r.timedOut) throw new Fail("tbrun outlived its time limit and was ended");
        return mapped(TBRUN_EXIT, r.code);
      }
      const names = reproImages(slug);
      const r = await runProbe(slug, { ...o, images: names });
      try {
        printRun(r);
        if (r.timedOut) throw new Fail("tbrun outlived its time limit and was ended");
        const code = mapped(TBRUN_EXIT, r.code);
        // A probe that did not finish has no pictures worth keeping, and its own exit code is the finding.
        return names && code === 0 ? keepRunImages(slug, names, r.imagesDir, o.ide) : code;
      } finally {
        if (r.imagesDir) rmSync(r.imagesDir, { recursive: true, force: true });
      }
    }
    default:
      return verify();
  }
}

try {
  process.exit(await main());
} catch (e) {
  if (!(e instanceof Fail)) throw e;
  finishTidy(tidy);
  die(e.code, e.message);
}
