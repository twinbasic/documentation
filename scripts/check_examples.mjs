#!/usr/bin/env node
// Gate: every documentation code sample marked `check_build` compiles.
//
//     node scripts/check_examples.mjs                    # the gate
//     node scripts/check_examples.mjs --only "^Reference/Core"
//     node scripts/check_examples.mjs --census           # classify every tb fence
//     node scripts/check_examples.mjs --propose          # compile unmarked ones too
//     node scripts/check_examples.mjs --propose --apply  # ...and mark the ones that pass
//     node scripts/check_examples.mjs --report survey.json  # group a saved survey
//
// Exit: 0 clean, 1 a sample does not compile (or, for a `check_run` sample, does not
// run as the page says), 2 the harness could not run (a refused command line, no IDE,
// or a crash).
//
// A `check_run` sample is a statement sample that is built and run: its batch gets one
// generated [RunAfterBuild] Sub that calls each sample in turn between marker lines,
// and the lines the run writes to the DEBUG CONSOLE are attributed to samples by
// those markers (lib/example-run.mjs; the capture is lib/tb-run.mjs).
//
// ------------------------------------------------------------------ why
//
// A ```tb fence is something check_code_regions.mjs protects the CONTENTS of
// and nothing ever evaluates. A sample that does not compile -- an icon key
// passed in a slot the same package's prose says raises 35613, or a Sub with
// no name -- passes every other gate.
//
// This is the tool that asks the compiler. It is NEVER part of build.bat,
// check.bat, test.bat or either CI workflow, for three reasons that are not
// going to change: an IDE cold start is 6-8 s where a whole site build is ~4 s;
// `npm install` has to remain sufficient to build the docs, and a twinBASIC
// install is not on that path; and CI has no Windows box, no private desktop
// and no CDP-reachable WebView2. It is `examples.bat`, run by a person, the same
// deal sweep_a11y.mjs already makes.
//
// ------------------------------------------------------------- opt-in, and why
//
// 1,124 `tb` fences under docs/, and a quarter of them are not programs: a
// statement run with an elision in it, a syntax skeleton, an `If` with no `End
// If`. A gate demanding that every fence compile would need hundreds of
// opt-outs on day one, and a list of hundreds of exceptions is a list nobody
// maintains. So a sample says it is complete by carrying `check_build` in its
// fence info string, and everything else is left alone -- which makes the
// marker the thing to get right, not the harness.
//
// ------------------------------------------------------- how a batch is built
//
// IDE cost is flat in project size -- what is paid for is startup, not
// compilation -- so samples are packed many to a project. Measured on this
// corpus: 1,082 auto-wrapped fences over 16 projects, four concurrent lanes,
// 36.6 s wall including packing. One project per sample would be over three
// hours.
//
// Three collision rules fall out of putting unrelated samples in one
// compilation unit, and each is a real hazard rather than a precaution:
//
//   * one generated `Module tbx_<hash>` per fence, hashed from its id;
//   * everything generated is Private -- eleven pages declare a `MyString`;
//   * a generated module must not be named like the project, in any letter
//     case: up to BETA 997 the IDE then skips the [RunAfterBuild] Sub, even one
//     in another module, and reports nothing, so the build is green and nothing
//     runs (twinbasic/twinbasic#2494; BETA 1005 runs it).
//
// `Sub Main` is not one of them, though it was once listed as one. The template
// brings a Main, and a sample may bring its own beside it: two `Public Sub
// Main`s in different modules compile (measured, BETA 983), which is how the
// WinServicesLib `Module Startup` samples build as written. That holds for a
// compile; a build refuses two Mains, and two [DllExport]s of one name, and a
// project with an error at all, so --build and --llvm batch around those three.
//
// And one that does not: a sample can take the compiler down. twinBASIC runs it
// in-process with user code, and a two-line syntax skeleton in Attributes.md
// crashes it outright (twinbasic/twinbasic#2453). In a batch that costs every other
// sample its result, so a crash is isolated, paid for only on failure: the
// sample tbbuild names as the one the compiler died parsing is built on its own
// and the rest without it, a crash that names none bisects, O(log n) builds, and
// one that needs several samples at once is reported with all of them.

import { cpSync, mkdirSync, promises as fs, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  CliError,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../lib/cli.mjs";
import { mapLines } from "../lib/markdown.mjs";
import {
  CLASS_SLOTS,
  CONCAT_KEY,
  HIDDEN_MARKER,
  MARKER,
  RUN_MARKER,
  SLOTS,
  classify,
  collectFences,
  moduleName,
  partOf,
  resourcePath,
  wrapFence,
} from "./lib/tb-fences.mjs";
import {
  CANARIES,
  CANARY_FILES,
  DEFAULT_BATCH,
  DEFAULT_JOBS,
  canaryProblem,
  crashedIn,
  diagKind,
  joinConcatGroups,
  makeBatches,
  runBatch,
  runProbes,
  sectionOf,
  templateChain,
  templateResolves,
  unresolvedName,
} from "./lib/example-batches.mjs";
import {
  RUN_DONE,
  RUN_FILE,
  RUN_TAG,
  dispatcherText,
  expectedOutput,
  isRunFence,
  judgeOutput,
  parseRun,
  partitionRun,
  runRefusal,
} from "./lib/example-run.mjs";
import { compileProject } from "./lib/tb-build.mjs";
import { wantShow } from "./lib/tb-ide.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";
import { packTree } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";

const TEMPLATES = path.join(REPO_ROOT, "test", "example-projects");

// ---------------------------------------------------------------- arguments

const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        only: { type: "string" },
        report: { type: "string" },
        jobs: { type: "string" },
        port: { type: "string" },
        batch: { type: "string" },
        ide: { type: "string" },
        census: { type: "boolean", default: false },
        propose: { type: "boolean", default: false },
        apply: { type: "boolean", default: false },
        verbose: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
        build: { type: "boolean", default: false },
        llvm: { type: "boolean", default: false },
        show: { type: "boolean", default: false },
        hide: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  { format: (err) => `check_examples: ${err.message}` },
);

const USAGE = `usage: node scripts/check_examples.mjs [options]

Compiles the documentation's own twinBASIC code samples, every tb fence marked
\`${MARKER}\`, and reports the ones the compiler refuses. A statement sample
(slot=sub) marked \`${RUN_MARKER}\` is also built and run, in every mode, and what it prints
is compared with what the page says it prints: the trailing comment on a Debug.Print
line, or the comment lines under a \`' Output:\` line. A sample that raises an error,
does not return, or prints something else is a finding; one that calls MsgBox or
InputBox, or contains End, or is not slot=sub, is refused without being built.

  --only <regex>   restrict to pages whose path matches
  --census         classify every tb fence and print the table; no compiler
  --propose        treat every classifiable fence as marked, and say which pass
  --apply          with --propose, add \`${MARKER}\` to the fences that passed
  --report <file>  group the findings of a saved \`--propose --json\` survey by
                   diagnostic, section, undeclared symbol and page; no compiler
  --jobs <n>       concurrent IDE lanes (default 4)
  --port <n>       base DevTools port (default 9480)
  --batch <n>      samples per generated project (default 120)
  --ide <path>     twinBASIC.exe (default: $TB_IDE, else the newest on the Desktop)
  --build          also build each project that compiles without errors; a project
                   whose build fails is cut down to the samples that fail it
  --llvm           build with LLVM (implies --build); needs a Professional or
                   Ultimate licence, and --build alone is its control
  --keep           leave the generated projects on disk and say where
  --show, --hide   as tbbuild's
  --verbose        also print warnings, not only errors
  --json           one JSON object instead of a report
  -h, --help       print this text and exit

Exit codes:
  0  every marked sample compiles, or none is marked; --report always, and --propose
     when it found only unmarked samples that fail (advisory)
  1  a marked sample does not compile, a marker is misused, a template does not
     compile, the compiler crashed on a project, --build or --llvm found a sample
     that fails the build, or a \`${RUN_MARKER}\` sample raised an error, did not return or
     printed something other than the page says; the report names each
  2  the harness could not run: a refused command line, a failed self-test probe, no
     IDE, an unreadable --report file, a work folder it could not clear,
     an --llvm run on a Community or Personal licence, or a crash`;

if (values.help) printHelpAndExit(USAGE);

// The values are read before anything runs. --report, --census and --propose
// are three modes of one run, and --apply is a part of --propose.
const { only, jobs, basePort, batchSize } = withUsageError(
  () => {
    refuseTogether(values, ["report", "census", "propose"]);
    refuseTogether(values, ["show", "hide"]);
    if (values.apply && !values.propose)
      throw new CliError("conflict", "--apply needs --propose", { option: "--apply" });
    const jobs = numberOption(values.jobs ?? String(DEFAULT_JOBS), { option: "--jobs", integer: true, min: 1 });
    const basePort = numberOption(values.port ?? "9480", { option: "--port", integer: true, min: 1, max: 65535 });
    // Lane i builds on port basePort + i (runAll).
    if (basePort + jobs - 1 > 65535) {
      throw new CliError(
        "conflict",
        `--port ${basePort} with --jobs ${jobs} needs ports up to ${basePort + jobs - 1}, past 65535`,
        { option: "--port" },
      );
    }
    return {
      only: values.only ? regexOption(values.only, { option: "--only" }) : null,
      jobs,
      basePort,
      batchSize: numberOption(values.batch ?? String(DEFAULT_BATCH), { option: "--batch", integer: true, min: 1 }),
    };
  },
  { format: (err) => `check_examples: ${err.message}` },
);

const MODE_CENSUS = values.census;
const MODE_PROPOSE = values.propose;
const MODE_REPORT = values.report ?? null;
const APPLY = values.apply;
const VERBOSE = values.verbose;
const AS_JSON = values.json;
const LLVM = values.llvm;
// --llvm is a build, so the one switch the rest of the file reads is BUILD.
const BUILD = values.build || LLVM;
// The procedure a [DllExport] attribute is on, for a run that builds.
const DLL_EXPORT_NAME = /\[\s*DllExport\b[^\]]*\][\s_]*(?:(?:Public|Private|Friend)\s+)?(?:Function|Sub)\s+(\w+)/gi;
// A sample's own `Sub Main`, which a class body may not hold and a build has to
// keep apart from the template's.
const DECLARES_MAIN = /^[ \t]*(?:(?:Public|Private|Friend)[ \t]+)?Sub[ \t]+Main[ \t]*\(/im;

// What a run that builds could say about each sample. A project whose compile has
// errors is not built (the IDE refuses one), so its samples are compiled and
// nothing more; a sample is counted as unbuilt only if no build of any project
// that held it, a smaller one from isolating a larger included, ever ran.
const builtIds = new Set();
const unbuiltIds = new Set();

// A page's template, when its fence does not name one. Inferred from the path
// because the package a sample needs is what the page is ABOUT -- stating
// project= on all 263 Reference/Built-In fences would be markup that only ever
// repeats the directory name above it.
function defaultProject(rel) {
  // The two browser packages come first, because each brings a stage set whose
  // `WebView` is its own control type. Both tutorials tell the reader to drop a
  // control on a form and name it `WebView` -- one a CefBrowser, one a WebView2
  // -- so the pages cannot share a project, and the split is by path because
  // the control a page means is what the page is about.
  if (/^(Tutorials|Reference\/Built-In)\/CEF\//.test(rel)) return "cef";
  if (/^(Tutorials|Reference\/Built-In)\/WebView2\//.test(rel)) return "webview2";
  if (/^Reference\/Built-In\//.test(rel)) return "packages";
  // A tutorial about a package needs that package. Most are a folder named
  // after one; Testing-with-Assert is a single file, so it is named here.
  if (/^Tutorials\/CustomControls\//.test(rel)) return "packages";
  if (/^Tutorials\/Testing-with-Assert\.md$/.test(rel)) return "packages";
  // `console` stays the default, and it is the stricter environment on purpose:
  // a Core or VBA sample should compile in a project that references only what
  // every project references, which is what a reader will have.
  return "console";
}

// Which template a template is a delta of, the chain of them, and whether a
// name resolves to a project: lib/example-batches.mjs (TEMPLATE_BASE,
// templateChain, templateResolves), where the probes read them.

// What `inherits=` does to a slot that was inferred for a Module container. A
// sample naming a base is class code-behind whatever the classifier thought,
// and `Me` may well not appear in the excerpt that proves it.
const PROMOTE_TO_CLASS = { module: "class", sub: "method" };

// A report line. Under --json it goes to stderr, so the payload is the only
// thing on stdout and a caller can pipe it straight into a parser -- which the
// first --json run could not, because the probe line and the batch progress
// were sitting in front of it.
const say = (...a) => (AS_JSON ? console.error(...a) : console.log(...a));

// ------------------------------------------------------------------ selection

const findings = [];
const addFinding = (fence, message, detail, extra = {}) =>
  findings.push({
    id: fence.id,
    rel: fence.rel,
    line: fence.line,
    message,
    detail,
    // The slot and template are carried rather than described, so `--report`
    // groups on fields instead of parsing them back out of the message.
    slot: fence.slot,
    project: fence.project,
    ...extra,
  });

function select(fences) {
  const chosen = [];
  for (const fence of joinConcatGroups(fences)) {
    if (only && !only.test(fence.rel)) continue;

    // A mistyped marker is a finding in every mode, including --census. It is
    // the one thing here that fails silently otherwise: an unrecognised token
    // in an info string renders identically to no token at all, so a sample
    // marked `check_bild` would never be compiled and nothing would say so.
    if (fence.bad.length) {
      addFinding(
        fence,
        `unrecognised fence markup: ${fence.bad.join(" ")}`,
        `known flags: ${MARKER}, ${RUN_MARKER}, ${HIDDEN_MARKER}; keys: slot=${SLOTS.join("|")}, ` +
          `inherits=, project=, projname=, id=, expect-error=, resource=, inert=, ${CONCAT_KEY}=`,
      );
      continue;
    }

    // A resource fence is a FILE the project needs, not a sample: it is never
    // compiled, never counted, and travels with the samples that read it. The
    // path is checked here because a bad one would otherwise be written
    // somewhere outside the staged project.
    if (fence.isResource) {
      const rel = resourcePath(fence.keys.get("resource"));
      if (!rel) {
        addFinding(
          fence,
          `resource= is not a path inside the project: ${fence.keys.get("resource")}`,
          "it must be project-relative, with no drive letter and no `..` segment",
        );
        continue;
      }
      fence.resourceRel = rel;
      fence.project = fence.keys.get("project") ?? defaultProject(fence.rel);
      chosen.push(fence);
      continue;
    }

    // `inert=<reason>` and `check_build` are contradictory claims about the same
    // fence, and the wrong one would win silently.
    if (fence.keys.has("inert") && fence.flags.has(MARKER)) {
      addFinding(
        fence,
        `inert=${fence.keys.get("inert")} and \`${MARKER}\` contradict each other`,
        "a fence is either not a program, or one this compiles -- not both",
      );
      continue;
    }

    const marked = fence.flags.has(MARKER);
    if (!marked && !MODE_PROPOSE && !MODE_CENSUS) continue;

    const inferred = classify(fence.content);
    const stated = fence.keys.get("slot");
    let slot = stated ?? inferred.slot;
    // `inherits=` names what the sample is code-behind OF, so it settles the
    // container on its own: saying both it and slot=class would be the same
    // fact written twice, and the pair could then disagree.
    fence.base = fence.keys.get("inherits") ?? null;
    if (fence.base && slot) slot = PROMOTE_TO_CLASS[slot] ?? slot;
    // A [DllExport] name is the exe's, whatever module declares it, and a build
    // refuses two ("[LINKER] FAILED duplicate [DLLExport] functions detected"),
    // which a compile accepts. Counted among the names, it keeps two samples
    // exporting one name out of one project, as a clash of names does.
    const exported = BUILD ? [...fence.content.matchAll(DLL_EXPORT_NAME)].map((m) => `[DllExport] ${m[1]}`) : [];
    fence.inferred = exported.length ? { ...inferred, names: [...(inferred.names ?? []), ...exported] } : inferred;
    fence.slot = slot;
    fence.slotStated = Boolean(stated);
    fence.project = fence.keys.get("project") ?? defaultProject(fence.rel);
    fence.marked = marked;
    // `inert=<reason>` is a decision already taken: this fence is not a program
    // and nobody is coming back to it. It is classified like any other -- the
    // census still says what shape it is -- and then goes no further: never
    // compiled, never proposed, so a survey stops re-reporting the settled
    // hundred on every pass. It is still counted, under its reason, because a
    // census that cannot tell "settled" from "not looked at yet" cannot say
    // what the backlog is.
    fence.inert = fence.keys.get("inert") ?? null;

    if (MODE_CENSUS) {
      chosen.push(fence);
      continue;
    }
    if (fence.inert) continue;

    if (!slot) {
      // Marked but unclassifiable is a finding; unmarked and unclassifiable is
      // just a fragment, which is the normal state of most of the corpus.
      if (marked) {
        addFinding(
          fence,
          `marked \`${MARKER}\` but its shape could not be inferred: ${inferred.reason}`,
          `state one explicitly: slot=${SLOTS.join(" | slot=")}`,
        );
      }
      continue;
    }
    if (!templateResolves(TEMPLATES, fence.project)) {
      addFinding(
        fence,
        `no such template project: ${fence.project}`,
        `templates live in test/example-projects/: ${readdirSync(TEMPLATES).join(", ")}`,
      );
      continue;
    }
    // A fence that asks to be RUN has to be one that can be: a statement
    // sample, with nothing in it that waits for a person or ends the run.
    const refusal = runRefusal(fence);
    if (refusal) {
      addFinding(fence, refusal.message, refusal.detail);
      continue;
    }
    // A class body with a `Sub Main` in it is no program: that Main is a method
    // of the class, never the startup object. It is usually two files written
    // as one fence, a class and the module that starts it.
    if (CLASS_SLOTS.has(slot) && DECLARES_MAIN.test(fence.content)) {
      if (marked) {
        addFinding(
          fence,
          `declares \`Sub Main\` in a class (${slot}${fence.base ? `, inherits=${fence.base}` : stated ? "" : ", inferred"}), where it is never the startup object`,
          "put the startup Main in a fence of its own, which a module slot holds",
        );
      }
      continue;
    }
    chosen.push(fence);
  }
  return chosen;
}

/**
 * A `projname` group has to be whole, and has to agree about its template.
 *
 * Marking three of a group's four samples is the failure this exists to name.
 * The three are compiled without the one that defines what they use, and the
 * errors that come back describe a missing symbol rather than a missing
 * marker -- which sends the reader to the sample that is fine.
 */
function checkGroups(all, selected) {
  const members = new Map();
  for (const f of all) {
    const name = f.keys.get("projname");
    if (!name) continue;
    if (!members.has(name)) members.set(name, []);
    members.get(name).push(f);
  }
  const chosen = new Set(selected.map((f) => f.id));
  const where = (f) => `docs/${f.rel}:${f.line}`;
  for (const [name, list] of members) {
    const inRun = list.filter((f) => chosen.has(f.id));
    if (!inRun.length) continue;
    const missing = list.filter((f) => !chosen.has(f.id));
    // A member `--only` left out is the caller's own doing, so it is advisory --
    // but never silent. The group is one program: the half in the run compiles
    // without the half that declares what it uses, and the errors name a missing
    // symbol rather than a narrowed run. WinServicesLib's four-page group was
    // read as a real failure that way, `--only` having taken the page that
    // declares MyService while the ones instantiating
    // `ServiceCreator(Of MyService)` stayed.
    const cut = only ? missing.filter((f) => !only.test(f.rel)) : [];
    const unmarked = missing.filter((f) => !cut.includes(f));
    if (unmarked.length) {
      addFinding(
        inRun[0],
        `projname=${name} is incomplete: ${inRun.length} of ${list.length} samples are in this run`,
        "unmarked or excluded: " + unmarked.map(where).join(", "),
      );
    }
    if (cut.length) {
      addFinding(
        inRun[0],
        `projname=${name} is cut by --only: ${inRun.length} of ${list.length} samples are in this run`,
        "left out: " +
          cut.map(where).join(", ") +
          " -- a group is compiled as one project, so these results are not a full run's",
        { advisory: true },
      );
    }
    const templates = new Set(inRun.map((f) => f.project));
    if (templates.size > 1) {
      addFinding(
        inRun[0],
        `projname=${name} asks for more than one template: ${[...templates].join(", ")}`,
        "one group is one project, so it is one template",
      );
    }
  }
}

// ------------------------------------------------------------------ generation

let stageCounter = 0;

/** Stage a batch into its own tree, pack it, and return the .twinproj path. */
function stageBatch(batch, work) {
  const index = stageCounter++;
  const dir = path.join(work, `b${index}`);
  rmSync(dir, { recursive: true, force: true });
  // Base first, then each delta over it: a file the delta carries replaces the
  // base's copy of the same name, and everything else is inherited.
  for (const name of templateChain(batch.project)) {
    cpSync(path.join(TEMPLATES, name), dir, { recursive: true });
  }
  // The sample brings the project's Main (see makeBatches' `alone`).
  if (batch.noMain) rmSync(path.join(dir, "Sources", "tbxMain.twin"), { force: true });

  const settingsPath = path.join(dir, "Settings");
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  const name = `DocSamples${index}`;
  settings["project.name"] = name;
  // Keyed per batch: two projects sharing an id confuse the IDE's recents list.
  settings["project.id"] = `{7B247500-0000-4000-9000-7B2475${String(index).padStart(6, "0")}}`;
  // An explicit file, never the ${SourcePath} template. That template opens a
  // native Save dialog on build, and on tbbuild's private desktop the dialog is
  // invisible and unreachable -- so the build never happens while the WebView2
  // renderer stays responsive and every health check says the IDE is fine.
  settings["project.buildPath"] = path.join(dir, `${name}.exe`).split("/").join("\\");
  // The run's compiler options and the exe's alike, as tbrun's --llvm sets them.
  if (LLVM) {
    settings["compiler.debugOptions"] = "+llvm";
    settings["compiler.buildOptions"] = "+llvm";
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, "\t") + "\n", "utf8");

  const map = new Map();
  for (const fence of batch.fences) {
    // A resource fence is written where the project expects to find it, not
    // compiled. `import` packs a Resources/ tree into the .twinproj and the
    // compile-time attributes read it from there -- measured against
    // [PopulateFrom], which populates an Enum's members while compiling.
    if (fence.isResource) {
      const dest = path.join(dir, ...fence.resourceRel.split("/"));
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, fence.content.replace(/\r\n?/g, "\n"), "utf8");
      continue;
    }
    const mod = moduleName(fence.id);
    const { text, offset } = wrapFence(fence, fence.slot, mod, fence.base);
    // CRLF, as the IDE writes .twin files.
    writeFileSync(
      path.join(dir, "Sources", `${mod}.twin`),
      text.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n"),
      "utf8",
    );
    map.set(`${mod}.twin`, { fence, offset });
  }
  // The canaries go in every batch, an empty one included: a template's own
  // rows are worked out from one (see ownRowsOf), and its canaries draw theirs.
  for (const c of CANARIES) {
    writeFileSync(path.join(dir, "Sources", c.file), c.text.replace(/\n/g, "\r\n"), "utf8");
  }
  // A run batch gets the one [RunAfterBuild] Sub a project may have, calling
  // each run sample's body in turn. The members of a group that are not run
  // samples are staged above and get no call.
  const runs = batch.run ? batch.fences.filter(isRunFence) : [];
  if (runs.length) {
    writeFileSync(
      path.join(dir, "Sources", RUN_FILE),
      dispatcherText(runs.map((f) => moduleName(f.id))).replace(/\n/g, "\r\n"),
      "utf8",
    );
  }

  const proj = path.join(work, `b${index}.twinproj`);
  // The batch is packed in process by impexp (tb-project's packTree), which
  // also packs a tree holding an embedded package, as a resource= fence staged
  // under Packages/ makes.
  packTree(proj, dir);
  return { proj, dir, map, runs };
}

// ------------------------------------------------------------------- building

const IDE = findIde(values.ide);

// The registry tidy for the whole run (lib/tb-registry.mjs): taken in main()
// before the first lane starts, finished once the last one has ended -- and
// by main()'s catch around the lanes, or by `die`, if the run dies in
// between.
let tidy = null;

// How a run batch's wait ends (see buildStaged), in milliseconds.
const RUN_QUIET_MS = 8000;
const RUN_TIMEOUT_MS = 180000;

// What each run sample did, by fence id, from the last build of a project that
// held it: its share of the lines the dispatcher wrote, and the sample that
// began and did not return, if there was one. A later build of a smaller
// project replaces an earlier one's entry, as it does for `builtIds`.
const runById = new Map();

/**
 * What is wrong with a run's capture as a whole, or null: the dispatcher wrote
 * no marker, or stopped with every sample that began returned and some never
 * reached. (A sample that began and did not return is the finding of that
 * sample, not a fault of the capture.)
 */
function runProblem(staged, cap) {
  const parsed = parseRun(cap.captured, staged.runs.length);
  if (parsed.done) return null;
  if (!parsed.began) {
    return (
      `the run wrote no ${RUN_TAG} line${cap.timedOut ? " before the timeout" : ""}, so the dispatcher never ran` +
      (cap.captured.length ? `; the console held: ${cap.captured.slice(0, 3).join(" | ")}` : "")
    );
  }
  if (!parsed.items.some((i) => i.began && !i.ended)) {
    return "the run stopped before the dispatcher finished, with no sample left unreturned";
  }
  return null;
}

function recordRun(staged, cap) {
  const parsed = parseRun(cap.captured, staged.runs.length);
  const culprit = staged.runs[parsed.items.findIndex((i) => i.began && !i.ended)] ?? null;
  for (const [i, fence] of staged.runs.entries()) {
    runById.set(fence.id, { ...parsed.items[i], culprit, done: parsed.done });
  }
}

/** Build one staged batch; returns per-fence errors, or a crash marker. */
async function buildStaged(staged, port) {
  // A run batch is built and its [RunAfterBuild] Sub is run, in every mode. The
  // run is over when the dispatcher says it is done, or when the console has
  // been quiet for RUN_QUIET_MS: long enough to outlast a pause in an LLVM
  // build's log, since a quiet period that ends inside one reads as a run that
  // never started.
  const run = staged.runs.length
    ? { done: (lines) => lines.some((l) => l.trim() === RUN_DONE), quietMs: RUN_QUIET_MS, timeoutMs: RUN_TIMEOUT_MS }
    : null;
  const compile = () =>
    compileProject({
      project: staged.proj,
      ide: IDE,
      port,
      show: wantShow({ show: values.show, hide: values.hide }),
      build: BUILD || !!run,
      llvm: LLVM,
      run,
    });
  let r = await compile();
  // A run that wrote no marker at all, or stopped without finishing and without
  // a sample that began and did not return, is read again once: nothing says
  // which sample is to blame, and the IDE can read the console early.
  const lost = (res) => (res.code === 0 && run ? runProblem(staged, res.run) : null);
  if (lost(r)) r = await compile();
  if (lost(r)) throw new Error(`${lost(r)} (${staged.proj})`);

  if (r.code === 4) return { crashed: true, detail: r.message, named: crashedIn(r.crashFiles, staged.map) };
  // A build that failed after a clean compile is isolated as a crash is: nothing
  // names a sample, so it is cut down by halving. `named` is empty for that.
  if (r.code === 5) return { crashed: true, buildFailed: true, named: new Set(), detail: r.message };
  if (r.code !== 0 && r.code !== 1) {
    throw new Error(`tbbuild exited ${r.code} on ${staged.proj}\n${r.message}`);
  }
  if (run && r.code === 0) recordRun(staged, r.run);
  if (BUILD || run) {
    for (const entry of staged.map.values()) (r.code === 0 ? builtIds : unbuiltIds).add(entry.fence.id);
    const first = r.rows.find((row) => row.startsWith("{ERROR}"));
    if (r.code === 1) say(`  not built: ${path.basename(staged.proj)} has errors, the first ${first}`);
  }
  const result = { diagnostics: r.rows };

  const perFence = new Map();
  // A row in a shape this does not parse. Nothing in it names a file, so no
  // amount of splitting the batch would find its cause; it is reported as
  // itself.
  const unreadable = [];
  // An ERROR against a file that is not one of this batch's generated samples:
  // the template's own source, or -- the case that cost this comment -- a
  // source inside a referenced PACKAGE. `runBatch` isolates one of those to the
  // sample that caused it, because it usually has one.
  const unattributed = [];
  // What each canary drew, at any severity. Their rows are taken out here,
  // before anything else reads them: a canary's diagnostic is expected, and one
  // left in could read as a diagnostic in a file that is no sample.
  const drawn = new Map();
  for (const row of result.diagnostics ?? []) {
    const m = /^\{(\w+)\}\s+(\S+)\s+\[(\d+),(\d+)\]:\s*(.*)$/.exec(row);
    if (!m) {
      unreadable.push(row);
      continue;
    }
    const [, severity, file, lineRaw, , message] = m;
    const base = file.split(/[\\/]/).pop();
    if (CANARY_FILES.has(base.toLowerCase())) {
      if (!drawn.has(base.toLowerCase())) drawn.set(base.toLowerCase(), []);
      drawn.get(base.toLowerCase()).push(message);
      continue;
    }
    if (severity !== "ERROR" && !VERBOSE) continue;
    const entry = staged.map.get(base);
    if (!entry) {
      if (severity === "ERROR") unattributed.push(row);
      continue;
    }
    const genLine = Number(lineRaw);
    // `genLine - offset` is the 1-based line within the fence's own body. For a
    // joined unit that body spans several fences, so the part decides both the
    // page line and which fence the finding belongs to.
    const bodyLine = genLine - entry.offset;
    const part = entry.fence.concatParts ? partOf(entry.fence.concatParts, bodyLine) : null;
    const owner = part ? part.fence : entry.fence;
    const pageLine = part ? part.pageLine : entry.fence.line + bodyLine;
    if (!perFence.has(entry.fence.id)) perFence.set(entry.fence.id, []);
    perFence.get(entry.fence.id).push({ severity, pageLine, message, rel: owner.rel });
  }
  return { perFence, unreadable, unattributed, canaryProblem: canaryProblem(drawn) };
}

/**
 * A lane: where a batch is built, and where what isolating it finds goes.
 *
 * This one stages each batch into the lane's own workspace and builds it on the
 * lane's port. The probes hand `runBatch` a fake, whose builds crash on sets of
 * samples a probe chooses -- which is how isolation is tested without an IDE,
 * and without a crash that needs two real samples to happen.
 */
function laneOf(port, work) {
  return {
    async build(batch) {
      const staged = stageBatch(batch, work);
      const result = await buildStaged(staged, port);
      if (!values.keep) rmSync(staged.dir, { recursive: true, force: true });
      return result;
    },
    finding: addFinding,
    note: say,
    llvm: LLVM,
  };
}

/** Run every batch across `jobs` lanes, each with its own port and workspace. */
async function runAll(batches, work) {
  const queue = [...batches];
  const results = [];
  const lanes = Array.from({ length: Math.min(jobs, queue.length) }, async (_, i) => {
    // A lane owns its port AND its workspace. Two IDEs pointed at one source
    // tree both wedge and neither ever returns -- distinct ports are not
    // enough, which cost two runs to learn.
    const laneWork = path.join(work, `lane${i}`);
    mkdirSync(laneWork, { recursive: true });
    const lane = laneOf(basePort + i, laneWork);
    while (queue.length) {
      const batch = queue.shift();
      process.stderr.write(`  building ${batch.fences.length} sample(s) [${batch.project}] on lane ${i}\n`);
      results.push(await runBatch(batch, lane));
    }
  });
  await Promise.all(lanes);
  return results;
}

// --------------------------------------------------------------------- census

/** `n  key` lines, biggest first. */
function tallyLines(map, limit = Infinity) {
  return [...map]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([k, n]) => `    ${String(n).padStart(4)}  ${k}`);
}

function census(fences) {
  const tally = new Map();
  const reasons = new Map();
  for (const f of fences) {
    const key = f.slot ?? "fragment";
    tally.set(key, (tally.get(key) ?? 0) + 1);
    if (!f.slot) {
      const why = (f.inferred.reason ?? "?").split(" ").slice(0, 2).join(" ");
      reasons.set(why, (reasons.get(why) ?? 0) + 1);
    }
  }
  const total = fences.length;
  const marked = fences.filter((f) => f.marked).length;
  say(
    `${total} tb fence(s) in ${new Set(fences.map((f) => f.rel)).size} page(s), ` + `${marked} marked \`${MARKER}\`\n`,
  );
  say("  slot      count   share");
  for (const slot of [...SLOTS, "fragment"]) {
    const n = tally.get(slot) ?? 0;
    say(`  ${slot.padEnd(9)} ${String(n).padStart(5)}   ${((n / total) * 100).toFixed(1)}%`);
  }
  if (reasons.size) {
    say("\n  why a fragment is a fragment:");
    for (const [why, n] of [...reasons].sort((a, b) => b[1] - a[1])) {
      say(`    ${String(n).padStart(4)}  ${why}`);
    }
  }
  const byProject = new Map();
  for (const f of fences) byProject.set(f.project, (byProject.get(f.project) ?? 0) + 1);
  say("\n  template a fence would use:");
  for (const [p, n] of byProject) say(`    ${String(n).padStart(4)}  ${p}`);

  // What has been settled, and by whose judgement. An inert fence is not a
  // program and is not coming back; the reason is recorded so that "settled"
  // can be read apart from "nobody has looked".
  const inert = fences.filter((f) => f.inert);
  if (inert.length) {
    const byReason = new Map();
    for (const f of inert) byReason.set(f.inert, (byReason.get(f.inert) ?? 0) + 1);
    say(`\n  inert -- ${inert.length} fence(s) that are not programs, by reason:`);
    for (const line of tallyLines(byReason)) say(line);
  }

  // Where the unmarked work is. This half needs no compiler, so it belongs here
  // rather than in a survey: a classifiable fence with no marker and no `inert`
  // reason is one nobody has decided about yet, and the census is what says how
  // much of that there is and which packages hold it. What it deliberately does
  // NOT claim is that any of them would compile -- only `--propose` knows that.
  const left = fences.filter((f) => f.slot && !f.marked && !f.inert);
  if (!left.length) return;
  const bySection = new Map();
  const byPage = new Map();
  for (const f of left) {
    bySection.set(sectionOf(f.rel), (bySection.get(sectionOf(f.rel)) ?? 0) + 1);
    byPage.set(f.rel, (byPage.get(f.rel) ?? 0) + 1);
  }
  say(
    `\n  undecided -- ${left.length} classifiable sample(s) that are neither ` +
      `marked nor inert, in ${byPage.size} page(s), by section:`,
  );
  for (const line of tallyLines(bySection)) say(line);
  say("\n  ...and the pages holding the most of them:");
  for (const line of tallyLines(byPage, 10)) say(line);
}

// --------------------------------------------------------------------- report

/**
 * Group a survey's findings: which diagnostic, which section, which name.
 *
 * This is the "where is the next lever" question, and it was answered by hand
 * three times over this arc -- each time by a throwaway script, and once by one
 * whose regex the shell had eaten (WIP.ExamplesBuild.md records the 444
 * unclassifiable fences that were really 32). It reads a saved `--propose
 * --json` survey rather than compiling, so the expensive run happens once and
 * the grouping is the part that can be iterated on.
 */
function summarise(survey) {
  const findings = survey.findings ?? [];
  const advisory = findings.filter((f) => f.advisory).length;
  say(
    `\nsurvey: ${survey.selected ?? "?"} sample(s), ${survey.passed ?? "?"} compile, ` +
      `${findings.length} finding(s)` +
      (advisory ? `, ${advisory} advisory` : ""),
  );
  if (!findings.length) return;

  const kinds = new Map(),
    sections = new Map(),
    names = new Map();
  const wrappers = new Map(),
    pages = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const f of findings) {
    // The FIRST diagnostic only. A sample with four of them has one cause and
    // three consequences -- a missing opener surfaces as a mismatch further
    // down, never where it happened -- so counting them all would weight the
    // loudest sample highest rather than the commonest cause.
    const first = (f.diagnostics ?? [])[0]?.message ?? f.message;
    bump(kinds, diagKind(first));
    bump(sections, sectionOf(f.rel));
    bump(pages, f.rel);
    bump(wrappers, `${f.slot ?? "?"} in ${f.project ?? "?"}`);
    const name = unresolvedName(first);
    if (name) bump(names, name);
  }

  say("\n  by first diagnostic:");
  for (const line of tallyLines(kinds, 12)) say(line);
  say("\n  by section:");
  for (const line of tallyLines(sections, 15)) say(line);
  if (names.size) {
    const once = [...names.values()].filter((n) => n === 1).length;
    // The shape of this tail is the whole decision. A name used 65 times is a
    // stage-set entry or a template, and one lever fixes all of them; a tail of
    // names used once is editorial work, page by page, and no lever reaches it.
    say(`\n  names that did not resolve -- ${names.size} distinct, ${once} used once:`);
    for (const line of tallyLines(names, 12)) say(line);
  }
  say("\n  wrapper the tool chose:");
  for (const line of tallyLines(wrappers, 8)) say(line);
  say("\n  pages holding the most:");
  for (const line of tallyLines(pages, 10)) say(line);
}

// ---------------------------------------------------------------------- apply

/**
 * Add the marker to fences that passed, in place.
 *
 * Only ever ADDS the bare flag, only to a fence that compiled in this very run,
 * and never to one that already carries markup -- so a re-run is a no-op and a
 * hand-written `slot=` or `expect-error=` is never rewritten by a machine.
 */
async function applyMarkers(passed) {
  const byFile = new Map();
  for (const fence of passed) {
    if (fence.marked || fence.info !== "tb") continue;
    if (!byFile.has(fence.rel)) byFile.set(fence.rel, []);
    byFile.get(fence.rel).push(fence);
  }
  let count = 0;
  for (const [rel, list] of byFile) {
    const file = path.join(DOCS_DIR, rel);
    const src = await fs.readFile(file, "utf8");
    // Lines are counted as the parse that found the fences counts them, and
    // each keeps its own ending.
    const at = new Map(list.map((fence) => [fence.line - 1, fence]));
    const out = mapLines(src, (body, i) => {
      const fence = at.get(i);
      if (!fence) return body;
      // The blockquote markers are part of the line for a fence inside an
      // admonition, which is where several samples live -- `> ```tb`. Refusing
      // those would leave a sample unmarkable for a reason that has nothing to
      // do with the sample.
      if (!/^[ \t]*(?:>[ \t]*)*(`{3,}|~{3,})tb[ \t]*$/.test(body)) {
        addFinding(
          fence,
          "could not mark: the fence line is not what was parsed",
          `line ${fence.line} reads ${JSON.stringify(body)}`,
        );
        return body;
      }
      count++;
      return `${body} ${MARKER}`;
    });
    await fs.writeFile(file, out, "utf8");
  }
  return count;
}

// ----------------------------------------------------------------------- main

async function main() {
  if (!(await runProbes(say))) process.exit(2);

  // Reads a survey and nothing else -- no compiler, and not even the docs tree,
  // since the JSON already holds every page and line it names.
  if (MODE_REPORT) {
    let survey;
    try {
      survey = JSON.parse(readFileSync(MODE_REPORT, "utf8"));
    } catch (e) {
      console.error(`check_examples: cannot read ${MODE_REPORT}: ${e.message}`);
      process.exit(2);
    }
    summarise(survey);
    process.exit(0);
  }

  const fences = await collectFences(DOCS_DIR);
  const selected = select(fences);
  checkGroups(fences, selected);
  // Everything that counts as a sample. A resource fence is selected -- it has
  // to be staged -- but it is a file, so it is not censused, not counted and
  // never reported as passing.
  const samples = selected.filter((f) => !f.isResource);

  if (MODE_CENSUS) {
    census(samples);
    reportFindings();
    // Advisory findings are survey results, so they print and do not fail: a
    // census narrowed with --only says what the narrowing cost and still exits 0.
    process.exit(findings.some((f) => !f.advisory) ? 1 : 0);
  }

  if (!IDE) {
    console.error(
      "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
        "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
    );
    process.exit(2);
  }

  if (!selected.length) {
    reportFindings();
    say(
      `check_examples: no sample is marked \`${MARKER}\`` +
        (only ? " in the selected pages" : "") +
        " -- nothing to compile",
    );
    process.exit(findings.some((f) => !f.advisory) ? 1 : 0);
  }

  // A project with an error is not built, and an `expect-error` sample is one on
  // purpose; batched with the rest it would leave every sample beside it unbuilt.
  // So a run that builds batches those samples apart, each with its page's
  // hidden blocks, which the rest of the page keeps as well.
  const expectsError = (f) => f.keys.has("expect-error");
  // A build binds the startup object, and fails on a template Main beside a
  // sample's own ("'Main' is ambiguous"), which a compile accepts; so a run that
  // builds gives such a unit a project of its own without the template's.
  const alone = BUILD ? (members) => members.some((f) => DECLARES_MAIN.test(f.content)) : null;
  // A `check_run` sample is built apart from everything else, whatever the mode,
  // since only a build runs [RunAfterBuild]: its batches get a dispatcher and
  // are built and run. A `projname` group holding one goes there whole.
  const { run: runList, rest: restList } = partitionRun(selected);
  const errorPages = new Set(restList.filter(expectsError).map((f) => f.rel));
  const hiddenOfErrorPage = (f) => f.flags.has(HIDDEN_MARKER) && errorPages.has(f.rel);
  const restBatches = BUILD
    ? [
        ...makeBatches(
          restList.filter((f) => !expectsError(f)),
          { batchSize, jobs, alone },
        ),
        ...(errorPages.size
          ? makeBatches(
              restList.filter((f) => expectsError(f) || hiddenOfErrorPage(f)),
              { batchSize, jobs, alone },
            )
          : []),
      ]
    : makeBatches(restList, { batchSize, jobs });
  // A run that builds always keeps a unit with its own `Sub Main` apart, as above.
  const runBatches = makeBatches(runList, {
    batchSize,
    jobs,
    alone: (members) => members.some((f) => DECLARES_MAIN.test(f.content)),
  }).map((b) => ({ ...b, run: true }));
  const batches = [...restBatches, ...runBatches];
  const work = path.join(tmpdir(), "tbexamples", String(basePort));
  try {
    rmSync(work, { recursive: true, force: true });
  } catch (e) {
    // Something still holds a project here: an IDE on a private desktop, where
    // nothing on screen says so, and the bare EPERM names a folder, not a cause.
    // A run that dies no longer leaves one -- each IDE runs inside its
    // launcher's job, which ends when the run does (WIP.Harness.md, "The IDE
    // runs inside a job") -- so the likely owner is an IDE from a run of the
    // harness from before that, or a compiler orphaned by one.
    if (e.code !== "EPERM" && e.code !== "EBUSY") throw e;
    console.error(
      `check_examples: cannot clear ${work} (${e.code}).\n` +
        "  An IDE from an earlier run on this --port still has it open: look for\n" +
        "  twinBASIC.exe processes whose command line names a project under that folder,\n" +
        "  and for twinBASIC_win32_noDEP.exe compilers whose parent has gone. Stop them,\n" +
        "  and run again -- or pass a different --port.",
    );
    process.exit(2);
  }
  mkdirSync(work, { recursive: true });

  const staged = selected.length - samples.length;
  say(
    `check_examples: ${samples.length} sample(s) from ` +
      `${new Set(samples.map((f) => f.rel)).size} page(s) in ${batches.length} project(s), ` +
      `${Math.min(jobs, batches.length)} lane(s), BETA ${buildNumber(IDE) ?? "?"}` +
      (staged ? `, ${staged} staged file(s)` : ""),
  );

  const wantRun = selected.filter(isRunFence).length;
  if (wantRun) {
    say(`  ${wantRun} sample(s) marked \`${RUN_MARKER}\` are built and run, in ${runBatches.length} project(s)`);
  }

  // Every lane's IDE records its projects in the user's recent list and saved
  // project state (lib/tb-registry.mjs). This process owns the tidying for all
  // of them: compileProject never tidies, because each build restoring its own
  // snapshot would put back whatever the registry held when that lane happened
  // to start. Everything is under `work`,
  // so one sweep by that folder at the end takes the lot -- and the sweep here
  // at the start takes whatever a run on this --port left when it died.
  tidy = startTidy({ prefixes: [work] });

  const t0 = Date.now();
  let results;
  try {
    results = await runAll(batches, work);
  } catch (e) {
    console.error(`check_examples: ${e.message}`);
    finishTidy(tidy);
    process.exit(2);
  }
  finishTidy(tidy);
  tidy = null;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const errorsById = new Map();
  const templateFaults = [];
  const crashed = new Set();
  const blamed = new Set();
  const blamedRows = new Map();
  for (const r of results) {
    for (const [id, list] of r.perFence ?? []) errorsById.set(id, list);
    for (const [id, info] of r.blamedRows ?? []) blamedRows.set(id, info);
    templateFaults.push(...(r.templateFaults ?? []));
    for (const id of r.crashed ?? []) crashed.add(id);
    for (const id of r.blamed ?? []) blamed.add(id);
  }

  const passed = [];
  for (const fence of selected) {
    if (fence.isResource) continue; // a staged file, not a sample
    if (crashed.has(fence.id)) continue; // reported already, and never a pass
    const diags = (errorsById.get(fence.id) ?? []).filter((d) => d.severity === "ERROR");

    // A sample whose error landed in a package's own source. It comes first
    // because an `expect-error` cannot be judged against it: the diagnostic the
    // sample provoked is not on any line of the sample.
    const blame = blamedRows.get(fence.id);
    if (blame) {
      findings.push({
        id: fence.id,
        rel: fence.rel,
        line: fence.line,
        advisory: MODE_PROPOSE && !fence.marked,
        slot: fence.slot,
        project: fence.project,
        marked: fence.marked,
        message:
          "a diagnostic landed outside this sample, in a package or " +
          `template source (${fence.slot}, ${fence.project})${blame.rest}`,
        detail: blame.rows.join("  |  "),
        diagnostics: diags,
      });
      continue;
    }

    const expect = fence.keys.get("expect-error");
    if (expect !== undefined) {
      if (!diags.length) {
        addFinding(fence, "expected not to compile, but it did", expect ? `expected ${expect}` : undefined);
      } else if (expect && !diags.some((d) => d.message.includes(expect))) {
        addFinding(fence, `expected ${expect}, got: ${diags.map((d) => d.message).join("; ")}`);
      } else {
        passed.push(fence);
      }
      continue;
    }
    // A sample blamed as part of a group, or with the samples it takes the
    // compiler down together with, carries no rows of its own -- one finding
    // names the rest -- but it is still not a pass.
    if (!diags.length) {
      if (!blamed.has(fence.id)) {
        passed.push(fence);
        if (isRunFence(fence)) judgeRun(fence);
      }
      continue;
    }
    findings.push({
      id: fence.id,
      rel: fence.rel,
      line: fence.line,
      // A sample that has not been marked has not claimed anything, so under
      // --propose its errors are information rather than a failure -- that mode
      // is a survey and must not exit 1 for doing its job.
      advisory: MODE_PROPOSE && !fence.marked,
      slot: fence.slot,
      project: fence.project,
      marked: fence.marked,
      message: `does not compile (${fence.slot}${fence.slotStated ? "" : ", inferred"}, ${fence.project})`,
      diagnostics: diags,
    });
  }

  if (templateFaults.length) {
    say("\nFAIL  diagnostics no sample can be blamed for -- rows the template");
    say("      produces with nothing in it, or rows in a shape this cannot read:");
    for (const row of [...new Set(templateFaults)].slice(0, 10)) say(`        ${row}`);
  }

  if (MODE_PROPOSE) {
    const unmarked = passed.filter((f) => !f.marked);
    say(
      `\n${passed.length} of ${samples.length} sample(s) compile; ` +
        `${unmarked.length} of them are not yet marked \`${MARKER}\``,
    );
    const byPage = new Map();
    for (const f of unmarked) byPage.set(f.rel, (byPage.get(f.rel) ?? 0) + 1);
    for (const [rel, n] of [...byPage].sort()) {
      say(`  ${String(n).padStart(3)}  ${rel}`);
    }
    if (APPLY) {
      const n = await applyMarkers(unmarked);
      say(`\nmarked ${n} fence(s) in place -- read the diff, then re-run without --propose`);
    }
  }

  // A broken template fails the run. It is not a finding against any one page,
  // so it would otherwise print and be ignored -- which is the worst outcome,
  // because a template that does not compile makes every sample in it fail.
  const real = findings.filter((f) => !f.advisory).length + (templateFaults.length ? 1 : 0);
  if (AS_JSON) {
    console.log(JSON.stringify({ selected: samples.length, passed: passed.length, findings }, null, 2));
  } else {
    reportFindings();
    // The same grouping `--report` prints, from the run that just produced it:
    // a survey read page by page is 277 notes, and the question a survey is run
    // to answer is which of them share a cause.
    if (MODE_PROPOSE) {
      summarise({ selected: samples.length, passed: passed.length, findings });
    }
    say(
      `\ncheck_examples: ${samples.length} sample(s), ${passed.length} compile, ` +
        `${real} finding(s), ${secs}s` +
        (real ? "" : " -- clean"),
    );
    if (wantRun) {
      say(
        `${runStats.ran} run sample(s) ran, ${runStats.matched} without a finding` +
          (runStats.unrun ? `, ${runStats.unrun} compiled but not run` : ""),
      );
      for (const note of runNotes) say(note);
    }
    // A project with errors is never built, so the build asked nothing of these.
    if (BUILD) {
      const unbuilt = samples.filter((f) => unbuiltIds.has(f.id) && !builtIds.has(f.id)).length;
      if (unbuilt) say(`${unbuilt} sample(s) in batches with errors were compiled but not built`);
    }
  }
  if (values.keep) say(`generated projects kept in ${work}`);
  else rmSync(work, { recursive: true, force: true });

  process.exit(real ? 1 : 0);
}

// What the run samples did, for the summary line.
const runStats = { ran: 0, matched: 0, unrun: 0 };
const runNotes = [];

/**
 * Compare one run sample's output with what its text says it prints, and report
 * what it raised or did not return. A sample that raised an error is reported
 * for that alone: what it printed before it stopped is not its output.
 */
function judgeRun(fence) {
  const out = runById.get(fence.id);
  const where = (f) => `docs/${f.rel}:${f.line}`;
  if (!out) {
    // Compiled clean, but its project had errors elsewhere, so nothing in it was built.
    runStats.unrun++;
    return;
  }
  if (!out.began) {
    runStats.unrun++;
    runNotes.push(
      `  note: ${where(fence)} (${fence.id}) was not run: ` +
        (out.culprit ? `${where(out.culprit)} did not return` : "the run ended before it"),
    );
    return;
  }
  runStats.ran++;
  const before = findings.length;
  if (!out.ended) {
    addFinding(
      fence,
      "did not return",
      "the run saw this sample begin and never saw it end: a loop that does not finish, or a call that never comes back",
    );
  } else if (out.error) {
    addFinding(fence, `raised error ${out.error.number}: ${out.error.description}`);
  } else {
    for (const p of judgeOutput(expectedOutput(fence), out.output)) {
      addFinding(fence, p.message, p.detail, p.line ? { line: p.line } : {});
    }
  }
  if (findings.length === before) runStats.matched++;
}

function reportFindings() {
  if (!findings.length) return;
  say("");
  for (const f of findings) {
    // An advisory finding is a survey result, not a failure, and it is labelled
    // as one so a --propose run cannot be misread as a red gate.
    say(`${f.advisory ? "note" : "FAIL"}  docs/${f.rel}:${f.line}  (${f.id})`);
    say(`        ${f.message}`);
    if (f.detail) say(`        ${f.detail}`);
    for (const d of f.diagnostics ?? []) {
      say(`        docs/${d.rel ?? f.rel}:${d.pageLine}: ${d.message}`);
    }
  }
}

// Whatever escapes main() -- a throw inside an event handler, a rejection
// nothing awaits -- still puts the registry back, and the run exits 2.
function die(err) {
  console.error(err);
  finishTidy(tidy);
  process.exit(2);
}
process.on("uncaughtException", die);
process.on("unhandledRejection", die);
main().catch(die);
