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
// Exit: 0 clean, 1 a sample does not compile, 2 the harness failed.
//
// ------------------------------------------------------------------ why
//
// A ```tb fence is something check_code_regions.mjs protects the CONTENTS of
// and nothing ever evaluates. Two samples that do not compile shipped that way:
// WinNativeCommonCtls/ListView's flagship example passes an icon key in a slot
// the same package's prose says raises 35613, and Core/Event's first sample was
// a Sub with no name. Every gate was green over both.
//
// This is the tool that asks the compiler. It is NEVER part of build.bat,
// check.bat, test.bat or either CI workflow, for three reasons that are not
// going to change: an IDE cold start is 8-11 s where a whole site build is ~4 s;
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
//   * a generated module must not share a name with the project, or
//     [RunAfterBuild]'s call becomes ambiguous and the IDE reports it at
//     EXECUTION time, so the build is green and nothing runs.
//
// `Sub Main` is not one of them, though it was once listed as one. The template
// brings a Main, and a sample may bring its own beside it: two `Public Sub
// Main`s in different modules compile (measured, BETA 983), which is how the
// WinServicesLib `Module Startup` samples build as written.
//
// And one that does not: a sample can take the compiler down. twinBASIC runs it
// in-process with user code, and a two-line syntax skeleton in Attributes.md
// crashes it outright (BUGS-TO-REPORT.md). In a batch that costs every other
// sample its result, so a crash bisects: O(log n) extra builds, paid only on
// failure.

import { spawn } from "node:child_process";
import {
  cpSync, existsSync, mkdirSync, promises as fs, readdirSync, readFileSync, rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BODY_SLOTS, CONCAT_KEY, HIDDEN_MARKER, MARKER, RUN_MARKER, SLOTS, classify,
  collectFences, concatFences, moduleName, parseInfo, partOf, resourcePath, wrapFence,
} from "./lib/tb-fences.mjs";
import { buildNumber, compilerExe, findIde, runCompiler } from "./lib/tb-install.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(REPO, "docs");
const TEMPLATES = path.join(REPO, "test", "example-projects");

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };

const MODE_CENSUS = flag("census");
const MODE_PROPOSE = flag("propose");
const MODE_REPORT = opt("report", null);
const APPLY = flag("apply");
const VERBOSE = flag("verbose");
const AS_JSON = flag("json");
const only = opt("only", null) ? new RegExp(opt("only", null)) : null;
const jobs = Math.max(1, Number(opt("jobs", 4)));
const basePort = Number(opt("port", 9480));
const batchSize = Math.max(1, Number(opt("batch", 120)));

if (flag("help")) {
  console.log(`usage: node scripts/check_examples.mjs [options]

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
  --keep           leave the generated projects on disk and say where
  --verbose        also print warnings, not only errors
  --json           one JSON object instead of a report`);
  process.exit(0);
}

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

/**
 * Which template a template is a delta of.
 *
 * A template used to be a whole exported tree, and five of them meant five
 * copies of a stage set that is mostly the same list -- which is the
 * duplication WIP.ExamplesBuild.md predicted would bite once a third appeared.
 * A template named here holds only the files that DIFFER from its base:
 * `vb-private` is a Settings with one reference rewritten, `cef` and
 * `webview2` are one stage file each.
 *
 * The relation lives in the tool rather than in the tree on purpose. The
 * alternative was a marker file in the template directory, and a template
 * directory is an exported twinBASIC project that the compiler's `import` verb
 * has to accept -- so a stray file there is a thing to test rather than a thing
 * to declare.
 */
const TEMPLATE_BASE = {
  "vb-private": "console",
  "cc-private": "packages",
  "wnc-private": "packages",
  "cef-private": "cef",
  implicit: "console",
  cef: "packages",
  webview2: "packages",
};

/** A template and everything it inherits from, base first. */
function templateChain(name) {
  const chain = [];
  for (let n = name, guard = 0; n; n = TEMPLATE_BASE[n]) {
    if (guard++ > 8) throw new Error(`template inheritance cycle at ${name}`);
    chain.unshift(n);
  }
  return chain;
}

/** Does this template resolve to a project with a Settings anywhere in its chain? */
function templateResolves(name) {
  if (!existsSync(path.join(TEMPLATES, name))) return false;
  return templateChain(name).some((n) => existsSync(path.join(TEMPLATES, n, "Settings")));
}

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
    id: fence.id, rel: fence.rel, line: fence.line, message, detail,
    // The slot and template are carried rather than described, so `--report`
    // groups on fields instead of parsing them back out of the message.
    slot: fence.slot, project: fence.project, ...extra,
  });

/**
 * Join every `concat_group` into one fence before anything else looks at them.
 *
 * Done here rather than in the batcher because the members are unclassifiable
 * apart -- each half of a split `Class` is an unclosed block -- so the join has
 * to happen before `classify`, not after. Members keep their identity through
 * `concatParts`, which is what turns a diagnostic back into a page line.
 */
function joinConcatGroups(fences) {
  const groups = new Map();
  const out = [];
  for (const fence of fences) {
    const name = fence.keys.get(CONCAT_KEY);
    if (!name) { out.push(fence); continue; }
    // A group is its page's own, the way hidden context is. Keyed by name
    // alone, two pages that picked the same name would be stitched into one
    // unit -- a class opened on one page and closed on another -- and nothing
    // would say so, because the join happens before anything is classified.
    const key = `${fence.rel}\u0000${name}`;
    if (!groups.has(key)) { groups.set(key, []); out.push({ concatPlaceholder: key }); }
    groups.get(key).push(fence);
  }
  return out.flatMap((f) => {
    if (!f.concatPlaceholder) return [f];
    const parts = groups.get(f.concatPlaceholder)
      .sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
    return [concatFences(parts)];
  });
}

function select(fences) {
  const chosen = [];
  for (const fence of joinConcatGroups(fences)) {
    if (only && !only.test(fence.rel)) continue;

    // A mistyped marker is a finding in every mode, including --census. It is
    // the one thing here that fails silently otherwise: an unrecognised token
    // in an info string renders identically to no token at all, so a sample
    // marked `check_bild` would never be compiled and nothing would say so.
    if (fence.bad.length) {
      addFinding(fence, `unrecognised fence markup: ${fence.bad.join(" ")}`,
        `known flags: ${MARKER}, ${RUN_MARKER}, ${HIDDEN_MARKER}; keys: slot=${SLOTS.join("|")}, ` +
        `inherits=, project=, projname=, id=, expect-error=, resource=, inert=, ${CONCAT_KEY}=`);
      continue;
    }

    // A resource fence is a FILE the project needs, not a sample: it is never
    // compiled, never counted, and travels with the samples that read it. The
    // path is checked here because a bad one would otherwise be written
    // somewhere outside the staged project.
    if (fence.isResource) {
      const rel = resourcePath(fence.keys.get("resource"));
      if (!rel) {
        addFinding(fence, `resource= is not a path inside the project: ${fence.keys.get("resource")}`,
          "it must be project-relative, with no drive letter and no `..` segment");
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
      addFinding(fence, `inert=${fence.keys.get("inert")} and \`${MARKER}\` contradict each other`,
        "a fence is either not a program, or one this compiles -- not both");
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
    fence.inferred = inferred;
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

    if (MODE_CENSUS) { chosen.push(fence); continue; }
    if (fence.inert) continue;

    if (!slot) {
      // Marked but unclassifiable is a finding; unmarked and unclassifiable is
      // just a fragment, which is the normal state of most of the corpus.
      if (marked) {
        addFinding(fence, `marked \`${MARKER}\` but its shape could not be inferred: ${inferred.reason}`,
          `state one explicitly: slot=${SLOTS.join(" | slot=")}`);
      }
      continue;
    }
    if (!templateResolves(fence.project)) {
      addFinding(fence, `no such template project: ${fence.project}`,
        `templates live in test/example-projects/: ${readdirSync(TEMPLATES).join(", ")}`);
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
      addFinding(inRun[0], `projname=${name} is incomplete: ${inRun.length} of ${list.length} samples are in this run`,
        "unmarked or excluded: " + unmarked.map(where).join(", "));
    }
    if (cut.length) {
      addFinding(inRun[0],
        `projname=${name} is cut by --only: ${inRun.length} of ${list.length} samples are in this run`,
        "left out: " + cut.map(where).join(", ") +
        " -- a group is compiled as one project, so these results are not a full run's",
        { advisory: true });
    }
    const templates = new Set(inRun.map((f) => f.project));
    if (templates.size > 1) {
      addFinding(inRun[0], `projname=${name} asks for more than one template: ${[...templates].join(", ")}`,
        "one group is one project, so it is one template");
    }
  }
}

// ------------------------------------------------------------------- batching
//
// A batch is a project. Two samples may not land in one when they would declare
// the same name at project scope -- `Class MyClass` appears on four pages -- so
// the packer keeps the names each open batch has already taken and puts a
// colliding sample in the next batch that has room for it.

function makeBatches(fences) {
  // A `hidden` fence is not a unit of its own: it is the PAGE's context, and
  // it joins every project that holds a sample from that page. So a page can
  // carry the declarations its samples assume -- the class its prose describes
  // but never lists, an API Declare -- instead of those living in a template
  // stage set shared with six hundred unrelated pages.
  //
  // Keyed by page AND template, because the same page can send samples to two
  // templates and a hidden block compiled into the wrong one would fail for a
  // reason that has nothing to do with the page.
  //
  // A `resource` fence travels the same way and for the same reason -- it is a
  // file the page's samples read at compile time, not a unit of its own.
  const hiddenByPage = new Map();
  const visible = [];
  for (const f of fences) {
    if (!f.flags.has(HIDDEN_MARKER) && !f.isResource) { visible.push(f); continue; }
    const key = `${f.project}\u0000${f.rel}`;
    if (!hiddenByPage.has(key)) hiddenByPage.set(key, []);
    hiddenByPage.get(key).push(f);
  }
  const hiddenFor = (project, rel) => hiddenByPage.get(`${project}\u0000${rel}`) ?? [];

  const byProject = new Map();
  for (const f of visible) {
    if (!byProject.has(f.project)) byProject.set(f.project, []);
    byProject.get(f.project).push(f);
  }
  // Samples sharing a `projname` are placed as ONE unit, because they are one
  // program: the Assert tutorial defines PadLeft in one fence and tests it in
  // the next three, and any of those alone is not a sample anybody wrote.
  //
  // Nothing groups by accident. An ungrouped sample is its own unit, so a
  // sample can never quietly come to depend on a neighbour that a later edit
  // moves to another project -- which is exactly how the survey and the gate
  // came to disagree about the same tutorial, one run finding PadLeft in the
  // batch and the other not.
  const unit = (f) => (f.keys.get("projname") ? `@${f.keys.get("projname")}` : `#${f.id}`);
  // Fill the lanes rather than the batches. Filling each batch to --batch
  // before opening another one put 120, 55, 4 and 3 samples on four lanes, and
  // a lane's cost is ~8 s of IDE startup plus a compile that is nearly free --
  // so the run takes as long as its biggest batch whatever the others do.
  // ...but not below a floor, or a three-sample run starts three IDEs to save
  // nothing: the wall time of one batch is IDE startup either way, and the
  // extra instances only compete for the box.
  const target = Math.min(batchSize, Math.max(16, Math.ceil(fences.length / jobs)));
  const batches = [];
  for (const [project, list] of byProject) {
    // Units, in first-appearance order, so the layout is a function of the
    // selection and nothing else.
    const units = new Map();
    for (const fence of list) {
      const key = unit(fence);
      if (!units.has(key)) units.set(key, []);
      units.get(key).push(fence);
    }

    const open = [];
    for (const [key, members] of units) {
      // Only the slots that put declarations at container scope export
      // anything. A `sub` or `method` sample's declarations are inside a
      // Private Sub and cannot collide with anything.
      const nameOf = (f) =>
        (BODY_SLOTS.has(f.slot) ? [] : (f.inferred?.names ?? [])).map((n) => n.toLowerCase());
      const pages = new Set(members.map((f) => f.rel));
      const names = members.flatMap(nameOf);
      // What the unit's pages' hidden context would ADD to a batch. It is kept
      // apart from the unit's own names because it is charged per PAGE, not per
      // unit: a page's hidden block is copied into a batch once, so two samples
      // from one page do not collide over it. Folding the two together made
      // every page with hidden context split into one batch per sample -- each
      // costing a whole IDE start -- because the second sample "clashed" with
      // the context the first had just brought.
      const hiddenNamesFor = (rel) => hiddenFor(project, rel).flatMap(nameOf);

      // A GROUP GETS ITS OWN PROJECT, and nothing else joins it. Togetherness
      // alone would leave a group's result depending on whichever unrelated
      // samples happened to share the batch -- so the guarantee is the one the
      // author can actually reason about: what compiles is what they grouped,
      // plus the template. It costs one project per group, and groups are
      // written by hand, so there are never many.
      if (key.startsWith("@")) {
        const own = new Set(names);
        for (const rel of pages) for (const n of hiddenNamesFor(rel)) own.add(n);
        batches.push({
          project, fences: [...members], names: own, pages, group: key.slice(1),
        });
        continue;
      }

      let placed = false;
      for (const batch of open) {
        if (batch.fences.length >= target) continue;
        if (names.some((n) => batch.names.has(n))) continue;
        // Only the pages this batch does not already carry bring new context.
        const newPages = [...pages].filter((rel) => !batch.pages.has(rel));
        const incoming = newPages.flatMap(hiddenNamesFor);
        if (incoming.some((n) => batch.names.has(n))) continue;
        batch.fences.push(...members);
        for (const n of names) batch.names.add(n);
        for (const n of incoming) batch.names.add(n);
        for (const rel of newPages) batch.pages.add(rel);
        placed = true;
        break;
      }
      if (placed) continue;
      const own = new Set(names);
      for (const rel of pages) for (const n of hiddenNamesFor(rel)) own.add(n);
      const batch = { project, fences: [...members], names: own, pages };
      open.push(batch);
      batches.push(batch);
    }
  }
  // Every batch now takes the hidden context of every page it draws from. Done
  // last so the placement above decides layout and this only adds to it.
  for (const batch of batches) {
    for (const rel of batch.pages ?? []) batch.fences.push(...hiddenFor(batch.project, rel));
  }
  return batches;
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

  const settingsPath = path.join(dir, "Settings");
  const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  const name = `DocSamples${index}`;
  settings["project.name"] = name;
  // Keyed per batch: two projects sharing an id confuse the IDE's recents list.
  settings["project.id"] =
    `{7B247500-0000-4000-9000-7B2475${String(index).padStart(6, "0")}}`;
  // An explicit file, never the ${SourcePath} template. That template opens a
  // native Save dialog on build, and on tbbuild's private desktop the dialog is
  // invisible and unreachable -- so the build never happens while the WebView2
  // renderer stays responsive and every health check says the IDE is fine.
  settings["project.buildPath"] = path.join(dir, `${name}.exe`).split("/").join("\\");
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
    writeFileSync(path.join(dir, "Sources", `${mod}.twin`),
      text.replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n"), "utf8");
    map.set(`${mod}.twin`, { fence, offset });
  }

  const proj = path.join(work, `b${index}.twinproj`);
  // Pure Windows paths: the compiler prefixes \\?\, which does not accept
  // forward slashes, and a mixed path fails with "input twinproj file does not
  // exist" rather than with anything about separators.
  const pack = runCompiler(COMPILER,
    ["import", proj.split("/").join("\\"), dir.split("/").join("\\"), "--overwrite"]);
  // import's exit code does not say whether it worked -- 0 on the failures it
  // reports, 999 on a tree holding an embedded package, which a resource= fence
  // staged under Packages/ would make -- so runCompiler reads the output.
  if (!pack.done) throw new Error(`packing failed${pack.why}:\n${pack.tail}`);
  return { proj, dir, map };
}

// ------------------------------------------------------------------- building

const IDE = findIde(opt("ide", undefined));
const COMPILER = IDE ? compilerExe(IDE) : null;

// The registry tidy for the whole run (lib/tb-registry.mjs): taken in main()
// before the first lane starts, finished once the last one has ended -- and
// by the top-level catch, if main() dies in between.
let tidy = null;

/** Build one staged batch; returns per-fence errors, or a crash marker. */
async function buildStaged(staged, port) {
  const args = [path.join(REPO, "scripts", "tbbuild.mjs"), staged.proj,
    "--port", String(port), "--json"];
  if (IDE) args.push("--ide", IDE);
  if (flag("show")) args.push("--show");
  if (flag("hide")) args.push("--hide");

  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  const code = await new Promise((r) => child.on("exit", r));

  if (code === 4) return { crashed: true, detail: err.trim() };
  if (code !== 0 && code !== 1) {
    throw new Error(`tbbuild exited ${code} on ${staged.proj}\n${err.trim() || out.trim()}`);
  }
  let result;
  try { result = JSON.parse(out); }
  catch { throw new Error(`tbbuild produced no JSON on ${staged.proj}\n${err.trim()}`); }

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
  for (const row of result.diagnostics ?? []) {
    const m = /^\{(\w+)\}\s+(\S+)\s+\[(\d+),(\d+)\]:\s*(.*)$/.exec(row);
    if (!m) { unreadable.push(row); continue; }
    const [, severity, file, lineRaw, , message] = m;
    if (severity !== "ERROR" && !VERBOSE) continue;
    const base = file.split("/").pop();
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
  return { perFence, unreadable, unattributed };
}

/**
 * Halve a batch WITHOUT cutting through anything that has to stay together.
 *
 * The unit is what `makeBatches` made it: a `projname` group is one program, and
 * a page's `hidden` context travels with every sample from that page. Halving
 * the fence array instead would take a group's definitions away from its tests
 * and then report the tests -- an isolation run that manufactures the failure it
 * claims to have found. The hidden fences sit at the END of `batch.fences`, so a
 * plain slice loses them for one half outright.
 *
 * Returns null when there is one unit left, which is the leaf: the smallest
 * thing that can be blamed.
 */
function splitBatch(batch) {
  // Hidden fences and resource files are page context: they follow the samples
  // rather than being split between them.
  const travels = (f) => f.flags.has(HIDDEN_MARKER) || f.isResource;
  const hidden = batch.fences.filter(travels);
  const units = new Map();
  for (const f of batch.fences) {
    if (travels(f)) continue;
    const key = f.keys.get("projname") ? `@${f.keys.get("projname")}` : `#${f.id}`;
    if (!units.has(key)) units.set(key, []);
    units.get(key).push(f);
  }
  const list = [...units.values()];
  if (list.length < 2) return null;
  const half = Math.ceil(list.length / 2);
  return [list.slice(0, half), list.slice(half)].map((part) => {
    const fences = part.flat();
    const pages = new Set(fences.map((f) => f.rel));
    return { ...batch, fences: [...fences, ...hidden.filter((h) => pages.has(h.rel))], pages };
  });
}

/** The visible samples of a leaf batch, and how to describe it in a finding. */
function leafOf(batch) {
  const visible = batch.fences.filter((f) => !f.flags.has(HIDDEN_MARKER) && !f.isResource);
  const rest = visible.length > 1
    ? ` -- one of the ${visible.length} samples in group \`${batch.group ?? "?"}\`, ` +
      "which is compiled as one program and cannot be split further"
    : "";
  return { rep: visible[0] ?? batch.fences[0], ids: visible.map((f) => f.id), rest };
}

// The stage index is in every diagnostic's path, so two builds of one template
// produce rows that differ by a number. Compared without this, a template's own
// fault is never recognised as its own and every batch bisects to the bottom.
const sameRow = (row) => row.replace(/[/\\]DocSamples\d+[/\\]/, "/");

/**
 * Does this template emit that diagnostic with NO samples in it?
 *
 * One build per template, memoised and shared across lanes, asked before any
 * splitting. Without it the two cases are indistinguishable at the leaf: a
 * sample that provoked a diagnostic inside a package source, and a template that
 * emits it unprompted. Guessing the first would bisect every batch to a single
 * sample -- hundreds of IDE starts -- and then blame an arbitrary one.
 */
const templateOwnRows = new Map();
function ownRowsOf(project, port, work) {
  if (!templateOwnRows.has(project)) {
    templateOwnRows.set(project, (async () => {
      const staged = stageBatch({ project, fences: [] }, work);
      const result = await buildStaged(staged, port);
      if (!flag("keep")) rmSync(staged.dir, { recursive: true, force: true });
      const rows = result.crashed
        ? [`the ${project} template crashes the compiler with no samples in it`]
        : [...(result.unattributed ?? []), ...(result.unreadable ?? [])];
      if (rows.length) {
        say(`  note: template \`${project}\` does not build clean on its own; ` +
          `${rows.length} row(s) are its own, not any sample's`);
      }
      return new Set(rows.map(sameRow));
    })());
  }
  return templateOwnRows.get(project);
}

/**
 * Build a batch, isolating a crash or an unattributable diagnostic.
 *
 * Both are attributed by halving until one unit is left. A crash is a compiler
 * bug as well as a finding, and BUGS-TO-REPORT.md is where one goes. An
 * unattributable diagnostic is the subtler of the two: the sample that caused it
 * may have no diagnostic of its own at all -- a generic instantiated with a type
 * the project does not have reports inside the PACKAGE's source, against the
 * generic's own type parameter -- so before this the sample was counted as
 * compiling while the run failed with a row naming no page.
 */
async function runBatch(batch, port, work) {
  const staged = stageBatch(batch, work);
  const result = await buildStaged(staged, port);
  if (!flag("keep")) rmSync(staged.dir, { recursive: true, force: true });

  // A function, not a shared object: spreading one would hand every caller the
  // same arrays, and a recursion that pushes into them is a bug waiting.
  const blank = () => ({
    perFence: new Map(), templateFaults: [], crashed: [], blamed: [], blamedRows: new Map(),
  });
  const split = async (why) => {
    const parts = splitBatch(batch);
    if (!parts) return null;
    say(`  ${why} in ${batch.fences.length} sample(s) [${batch.project}]: splitting to find it`);
    const merged = blank();
    for (const part of parts) {
      const sub = await runBatch(part, port, work);
      for (const [k, v] of sub.perFence ?? []) merged.perFence.set(k, v);
      for (const [k, v] of sub.blamedRows ?? []) merged.blamedRows.set(k, v);
      merged.templateFaults.push(...(sub.templateFaults ?? []));
      merged.crashed.push(...(sub.crashed ?? []));
      merged.blamed.push(...(sub.blamed ?? []));
    }
    return merged;
  };

  if (result.crashed) {
    const deeper = await split("a compiler crash");
    if (deeper) return deeper;
    const { rep, ids, rest } = leafOf(batch);
    addFinding(rep, "crashes the twinBASIC compiler" + rest,
      "the compiler dies parsing this sample; record it in BUGS-TO-REPORT.md");
    // Named back to the caller, because a crashed sample produced no
    // diagnostics and would otherwise be counted as one that compiled -- the
    // same false-clean shape tbbuild's own crash check exists to close.
    return { ...blank(), crashed: ids };
  }

  const unreadable = result.unreadable ?? [];
  const rows = [...new Set((result.unattributed ?? []).map(sameRow))];
  if (!rows.length) {
    return { perFence: result.perFence, templateFaults: unreadable, crashed: [], blamed: [] };
  }

  const own = await ownRowsOf(batch.project, port, work);
  const mine = rows.filter((r) => !own.has(r));
  if (!mine.length) {
    // Every row is the template's own. Reported as a template fault, which is
    // what it is, and no sample is blamed for it.
    return { perFence: result.perFence, templateFaults: [...rows, ...unreadable], crashed: [], blamed: [] };
  }

  const deeper = await split("a diagnostic outside every sample");
  if (deeper) return { ...deeper, templateFaults: [...deeper.templateFaults, ...unreadable] };

  // Blamed, not passed: the whole point is that such a sample can produce no
  // diagnostic of its own, so counting it as compiling is the false clean. The
  // rows go back to `main` rather than straight into a finding, so a sample with
  // errors of its own as well reads as one finding instead of two.
  const { rep, ids, rest } = leafOf(batch);
  return {
    perFence: result.perFence, templateFaults: unreadable, crashed: [], blamed: ids,
    blamedRows: new Map([[rep.id, { rows: mine, rest }]]),
  };
}

/** Run every batch across `jobs` lanes, each with its own port and workspace. */
async function runAll(batches, work) {
  const queue = [...batches];
  const results = [];
  const lanes = Array.from({ length: Math.min(jobs, queue.length) }, async (_, lane) => {
    // A lane owns its port AND its workspace. Two IDEs pointed at one source
    // tree both wedge and neither ever returns -- distinct ports are not
    // enough, which cost two runs to learn.
    const laneWork = path.join(work, `lane${lane}`);
    mkdirSync(laneWork, { recursive: true });
    while (queue.length) {
      const batch = queue.shift();
      process.stderr.write(`  building ${batch.fences.length} sample(s) [${batch.project}] on lane ${lane}\n`);
      results.push(await runBatch(batch, basePort + lane, laneWork));
    }
  });
  await Promise.all(lanes);
  return results;
}

// --------------------------------------------------------------------- census

/**
 * The bucket a page counts towards in a census or a survey report.
 *
 * A package is the unit the work is actually organised by, and it sits one level
 * deeper than `Reference/` -- `Reference/Default/VB`, `Reference/Built-In/CEF`.
 * Bucketing by the first two segments instead would put all thirteen packages in
 * one row called `Reference/Built-In` and hide exactly what the report is for.
 * A page directly under a section is its own bucket, because `Attributes.md`
 * carrying twelve is a fact about that page rather than about `Reference/`.
 */
function sectionOf(rel) {
  const parts = rel.split(/[\\/]/);
  if (parts[0] === "Reference" && (parts[1] === "Default" || parts[1] === "Built-In")) {
    return parts.slice(0, 3).join("/");
  }
  if (parts[0] === "Reference") return parts.slice(0, 2).join("/");
  return parts.slice(0, 2).join("/");
}

/** `n  key` lines, biggest first. */
function tallyLines(map, limit = Infinity) {
  return [...map].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
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
  say(`${total} tb fence(s) in ${new Set(fences.map((f) => f.rel)).size} page(s), ` +
    `${marked} marked \`${MARKER}\`\n`);
  say("  slot      count   share");
  for (const slot of [...SLOTS, "fragment"]) {
    const n = tally.get(slot) ?? 0;
    say(`  ${slot.padEnd(9)} ${String(n).padStart(5)}   ${(n / total * 100).toFixed(1)}%`);
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
  say(`\n  undecided -- ${left.length} classifiable sample(s) that are neither ` +
    `marked nor inert, in ${byPage.size} page(s), by section:`);
  for (const line of tallyLines(bySection)) say(line);
  say("\n  ...and the pages holding the most of them:");
  for (const line of tallyLines(byPage, 10)) say(line);
}

// --------------------------------------------------------------------- report

/**
 * A diagnostic's KIND: its code, with the identifiers taken out.
 *
 * `TB5079 Unrecognized symbol 'WebView'` and `... 'Host'` are one kind and 162
 * of them are one answer; left un-generalised they are 130 rows of one. The
 * identifier is not lost -- it is what the unresolved-name tally counts.
 */
function diagKind(message) {
  const flat = String(message ?? "").replace(/'[^']*'/g, "'...'").trim();
  return flat.length > 72 ? flat.slice(0, 69) + "..." : flat;
}

/** The name a diagnostic says it could not resolve, or null. */
function unresolvedName(message) {
  const m = /Unrecognized (?:datatype symbol|symbol|member|token)\s+'([^']+)'/
    .exec(String(message ?? ""));
  return m ? m[1] : null;
}

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
  say(`\nsurvey: ${survey.selected ?? "?"} sample(s), ${survey.passed ?? "?"} compile, ` +
    `${findings.length} finding(s)` + (advisory ? `, ${advisory} advisory` : ""));
  if (!findings.length) return;

  const kinds = new Map(), sections = new Map(), names = new Map();
  const wrappers = new Map(), pages = new Map();
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
    const file = path.join(DOCS, rel);
    const src = await fs.readFile(file, "utf8");
    const lines = src.split("\n");
    for (const fence of list) {
      const i = fence.line - 1;
      const line = lines[i];
      const cr = line.endsWith("\r") ? "\r" : "";
      const body = cr ? line.slice(0, -1) : line;
      // The blockquote markers are part of the line for a fence inside an
      // admonition, which is where several samples live -- `> ```tb`. Refusing
      // those would leave a sample unmarkable for a reason that has nothing to
      // do with the sample.
      if (!/^[ \t]*(?:>[ \t]*)*(`{3,}|~{3,})tb[ \t]*$/.test(body)) {
        addFinding(fence, "could not mark: the fence line is not what was parsed",
          `line ${fence.line} reads ${JSON.stringify(body)}`);
        continue;
      }
      lines[i] = `${body} ${MARKER}${cr}`;
      count++;
    }
    await fs.writeFile(file, lines.join("\n"), "utf8");
  }
  return count;
}

// --------------------------------------------------------------------- probes
//
// The probes ride along inside the normal run rather than behind a flag nobody
// remembers. A green line saying "every marked sample compiles" is otherwise
// indistinguishable from a gate that has stopped selecting any.

const CLASSIFIER_PROBES = [
  ["a whole Class", "Class Foo\n    Public Sub Bar()\n    End Sub\nEnd Class\n", "file"],
  ["a whole procedure", "Private Sub Foo()\n    Debug.Print 1\nEnd Sub\n", "module"],
  ["a Declare", "Public Declare PtrSafe Function Beep Lib \"kernel32\" (ByVal a As Long) As Long\n", "module"],
  ["loose statements", "Dim x As Long\nx = 1\nDebug.Print x\n", "sub"],
  ["declarations only", "Dim MyString As String\n", "sub"],
  // An Interface body holds PROTOTYPES: a Sub line in one has no End Sub, and a
  // classifier that pushes it as a block reads the whole fence as unbalanced.
  // Seven fences in this corpus are that shape.
  ["an Interface of prototypes", "Interface IFoo\n    Sub Bar()\n    Function Baz() As Long\nEnd Interface\n", "file"],
  // Four UDTs in the shipped packages declare a field called `Type As Long`.
  ["a Type whose field is called Type", "Public Type Rec\n    Type As Long\nEnd Type\n", "module"],
  ["a single-line procedure", "Sub Foo(): End Sub\n", "module"],
  ["an elision", "Dim x As Long\n...\nDebug.Print x\n", null],
  // Microsoft's spaced form, which the VBA-derived pages inherited.
  ["a spaced elision", "ReDim X(10)\n. . .\nReDim Preserve X(15)\n", null],
  // ...but a With-block member line is dots and code, not dots alone.
  ["a With member line", "With Label1\n    .Caption = \"hi\"\nEnd With\n", "sub"],
  ["an unclosed If", "If x Then\n    Debug.Print 1\n", null],
  ["an End with no opener", "    Debug.Print 1\nEnd Sub\n", null],
  ["a continuation line", "Dim a As Long, _\n    b As Long\n", "sub"],
  ["an apostrophe inside a string", "Debug.Print \"it's here ' not a comment\"\n", "sub"],
  // The Class row. `Me` is the whole signal, so the three ways it can be a
  // false positive are probes: this corpus prints the word, and a member may
  // be called Me. Getting one of these wrong wraps an ordinary Module sample
  // in a Class, which fails with a diagnostic about the wrapper -- a report
  // pointing at code that is correct.
  ["a procedure using Me", "Private Sub Form_Load()\n    Me.Caption = \"x\"\nEnd Sub\n", "class"],
  ["loose statements using Me", "Me.Print \"hello\"\n", "method"],
  ["Me inside a string literal", "Debug.Print \"Use Me instead\"\n", "sub"],
  ["Me as somebody's member", "Debug.Print foo.Me\n", "sub"],
  ["Me inside a comment", "Dim x As Long    ' Me is fine here\n", "sub"],
  ["Meridian is not Me", "Dim Meridian As Long\nMeridian = 1\n", "sub"],
  // WithEvents is the other Class signal. A standard module may not declare
  // one, so a fence that does is code-behind even with no `Me` in it -- which
  // is the whole WinNamedPipesLib reference, where the field IS the subject.
  ["a WithEvents field", "Private WithEvents srv As Foo\nPrivate Sub srv_Ping()\nEnd Sub\n", "class"],
  // Neither of these is legal in a standard module either.
  ["a top-level Implements", "Implements IFoo\nPrivate Sub IFoo_Bar()\nEnd Sub\n", "class"],
  ["a top-level Inherits", "Inherits Form\nPrivate Sub Form_Load()\nEnd Sub\n", "class"],
  // An access modifier is a container-scope declaration, never a statement.
  // Reference/Core/Public.md's own samples were wrapped in a Sub, where
  // `Public` is a syntax error -- on the page documenting the keyword.
  ["a Public field", "Public NumberOfEmployees As Integer\n", "module"],
  ["a Private field", "Private X As New Collection\n", "module"],
  ["a Private Const", "Private Const Answer As Long = 42\n", "module"],
  // ...but Static IS legal in a procedure, so it stays a statement.
  ["a Static local", "Static Accumulate As Long\nAccumulate = 1\n", "sub"],
  // A Deftype is module-level only, and asked directly the compiler accepts it
  // there -- so the wrong container was the whole of `Unrecognized symbol
  // 'DefInt'` on the page that documents it.
  ["a Deftype", "DefInt A-Z\nDim TaxRate As Double\n", "module"],
  ["Default is a modifier, not a Deftype", "Default Property Get Item() As Long\nEnd Property\n", "module"],
  // ...but only at container scope. Inside a Class the fence brings its own.
  ["WithEvents inside a whole Class", "Class C\n    Private WithEvents srv As Foo\nEnd Class\n", "file"],
];

const INFO_PROBES = [
  ["bare language", "tb", (p) => !p.flags.size && !p.bad.length],
  ["the marker", `tb ${MARKER}`, (p) => p.flags.has(MARKER) && !p.bad.length],
  [`${RUN_MARKER} implies ${MARKER}`, `tb ${RUN_MARKER}`,
    (p) => p.flags.has(MARKER) && p.flags.has(RUN_MARKER)],
  ["a key", `tb ${MARKER} slot=module`, (p) => p.keys.get("slot") === "module"],
  ["a group name", `tb ${MARKER} projname=padleft`, (p) => p.keys.get("projname") === "padleft"],
  ["a typo is refused", "tb check_bild", (p) => p.bad.length === 1 && !p.flags.has(MARKER)],
  ["an inert reason", `tb inert=skeleton`, (p) => p.keys.get("inert") === "skeleton" && !p.bad.length],
  ["an unknown inert reason is refused", `tb inert=because`, (p) => p.bad.length === 1 && !p.keys.has("inert")],
  ["a bare inert is refused", "tb inert", (p) => p.bad.length === 1],
  ["an unknown key is refused", `tb ${MARKER} mode=x`, (p) => p.bad.length === 1],
  ["a bad slot is refused", `tb ${MARKER} slot=banana`, (p) => p.bad.length === 1],
  ["a base class", `tb ${MARKER} inherits=Form`, (p) => p.keys.get("inherits") === "Form"],
  [`${HIDDEN_MARKER} implies ${MARKER}`, `tb ${HIDDEN_MARKER}`,
    (p) => p.flags.has(MARKER) && p.flags.has(HIDDEN_MARKER)],
  ["another language is untouched", "js", (p) => p.lang === "js"],
];

async function runProbes() {
  const failures = [];
  for (const [name, src, want] of CLASSIFIER_PROBES) {
    const got = classify(src).slot;
    if (got !== want) failures.push(`classifier: ${name} -> ${got}, want ${want}`);
  }
  for (const [name, info, ok] of INFO_PROBES) {
    if (!ok(parseInfo(info))) failures.push(`info string: ${name}`);
  }

  // The line arithmetic, which is what turns a diagnostic into a place in a
  // page. Off by one here and every report points at the wrong line, plausibly.
  //
  // Each slot wraps the sample in a different number of lines, and each
  // compensates with a different offset -- so the answer must come out the SAME
  // for all three. A fence opening at page line 10 has `Dim b` on page line 12
  // whatever is generated around it.
  const fence = { rel: "X.md", line: 10, id: "X.md#1", content: "Dim a\nDim b\nDim c\n" };
  for (const slot of SLOTS) {
    // With and without a base: `Inherits` is a generated line like any other,
    // so it shifts the arithmetic, and a base is exactly the case an author
    // reaches for when a sample is already hard to place.
    for (const base of [null, "Form"]) {
      const { text, offset } = wrapFence(fence, slot, "tbx_probe", base);
      const genLine = text.split("\n").findIndex((l) => l.trim() === "Dim b") + 1;
      const pageLine = fence.line + genLine - offset;
      if (pageLine !== 12) {
        failures.push(`line map: ${slot}${base ? " inherits " + base : ""} -> ${pageLine}, want 12`);
      }
    }
  }

  // The container a slot generates, and that a base reaches the source only
  // where a Class is generated -- `Module X / Inherits Form` is not a thing.
  for (const [slot, want] of [["module", "Module"], ["sub", "Module"],
    ["class", "Class"], ["method", "Class"]]) {
    const { text } = wrapFence(fence, slot, "tbx_probe", "Form");
    if (!text.includes(`${want} tbx_probe`)) failures.push(`wrapper: ${slot} is not a ${want}`);
    const inherits = text.includes("Inherits Form");
    if (inherits !== (want === "Class")) {
      failures.push(`wrapper: ${slot} ${inherits ? "emitted" : "dropped"} Inherits`);
    }
  }

  // The batcher, because a grouping that silently stops holding produces a
  // green run whose samples were compiled apart -- the same disagreement
  // between two runs that the `projname` key exists to end. A group stays
  // whole AND stays alone; an ungrouped sample never lands in it.
  const fake = (id, group, names = [], opts = {}) => ({
    id, rel: opts.rel ?? "X.md", line: 1,
    slot: names.length ? "module" : "sub", project: "console",
    keys: new Map(group ? [["projname", group]] : []),
    flags: new Set(opts.hidden ? [HIDDEN_MARKER, MARKER] : [MARKER]),
    inferred: { names },
  });
  const batched = makeBatches([
    fake("a", "g"), fake("b", null), fake("c", "g"), fake("d", "g"),
  ].map((f) => ({ ...f, project: "console" })));
  const groupBatch = batched.find((b) => b.fences.some((f) => f.id === "a"));
  if (!["a", "c", "d"].every((id) => groupBatch?.fences.some((f) => f.id === id))) {
    failures.push("batching: a projname group was split across projects");
  }
  if (groupBatch?.fences.some((f) => f.id === "b")) {
    failures.push("batching: an ungrouped sample joined a group's project ahead of the group");
  }
  // And a collision still separates two units that would clash.
  const clash = makeBatches([fake("p", null, ["MyClass"]), fake("q", null, ["MyClass"])]);
  if (clash.length !== 2) failures.push("batching: two samples declaring one name shared a project");

  // A hidden fence is the PAGE's context: it joins every batch holding a
  // sample from that page, and is never a unit of its own. Both halves are
  // probed, because the failure modes differ -- a hidden block that does not
  // travel leaves its page's samples failing on the very declarations it
  // exists to supply, while one that becomes its own unit is compiled alone,
  // passes, and helps nobody.
  const withHidden = makeBatches([
    fake("h1", null, ["Ctx"], { hidden: true, rel: "P.md" }),
    fake("v1", null, [], { rel: "P.md" }),
    fake("v2", null, [], { rel: "Q.md" }),
  ]);
  const hostsHidden = withHidden.filter((b) => b.fences.some((f) => f.id === "h1"));
  if (hostsHidden.length !== 1 || !hostsHidden[0].fences.some((f) => f.id === "v1")) {
    failures.push("batching: a hidden fence did not travel with its page's sample");
  }
  if (withHidden.some((b) => b.fences.length === 1 && b.fences[0].id === "h1")) {
    failures.push("batching: a hidden fence became a unit of its own");
  }
  // Two samples from ONE page must still share a batch. They both carry that
  // page's hidden context, and charging it twice made every such page split
  // into one project per sample.
  const samePage = makeBatches([
    fake("s1", null, [], { rel: "S.md" }),
    fake("s2", null, [], { rel: "S.md" }),
    fake("hs", null, ["Ctx"], { hidden: true, rel: "S.md" }),
  ]);
  if (samePage.length !== 1) {
    failures.push("batching: one page's hidden context split its own samples apart");
  }
  // Its names have to be counted, or two pages whose hidden blocks declare the
  // same type land in one project and collide.
  const hiddenClash = makeBatches([
    fake("h2", null, ["Ctx"], { hidden: true, rel: "A.md" }),
    fake("a1", null, [], { rel: "A.md" }),
    fake("h3", null, ["Ctx"], { hidden: true, rel: "B.md" }),
    fake("b1", null, [], { rel: "B.md" }),
  ]);
  if (hiddenClash.some((b) => b.fences.some((f) => f.id === "a1") &&
                              b.fences.some((f) => f.id === "b1"))) {
    failures.push("batching: two pages whose hidden context collides shared a project");
  }

  // An isolation split must not cut through a unit. Both halves of that are
  // probed because both manufacture a failure: a group cut apart loses the
  // definitions its tests need, and a page's hidden context left in the other
  // half takes away the declarations it exists to supply -- and the hidden
  // fences sit at the END of batch.fences, where a plain slice drops them.
  const soleGroup = makeBatches([fake("g1", "g"), fake("g2", "g")])[0];
  if (splitBatch(soleGroup) !== null) failures.push("split: a projname group was cut in half");
  const mixed = makeBatches([
    fake("m1", null, [], { rel: "M.md" }),
    fake("m2", null, [], { rel: "N.md" }),
    fake("mh", null, ["Ctx"], { hidden: true, rel: "M.md" }),
  ])[0];
  const halves = splitBatch(mixed) ?? [];
  if (halves.length !== 2) failures.push("split: a two-unit batch did not split");
  const withM1 = halves.find((b) => b.fences.some((f) => f.id === "m1"));
  const withM2 = halves.find((b) => b.fences.some((f) => f.id === "m2"));
  if (!withM1?.fences.some((f) => f.id === "mh")) {
    failures.push("split: a page's hidden context did not travel with its sample");
  }
  if (withM2?.fences.some((f) => f.id === "mh")) {
    failures.push("split: a page's hidden context followed a page that never asked for it");
  }
  // Two builds of one template differ only by the stage index in every path, and
  // a template's own fault is recognised by comparing those rows.
  const row = (n) => `{ERROR} /DocSamples${n}/Packages/P/Sources/S.twin [10,20]: TB5079 x`;
  if (sameRow(row(7)) !== sameRow(row(12))) {
    failures.push("split: one template's rows from two builds do not compare equal");
  }

  // A joined unit has to classify as the construct its halves make, and a
  // diagnostic in either half has to come back to THAT half's page line. Getting
  // the second right is the whole difficulty: an off-by-one here points every
  // finding in the second fence at the wrong line, plausibly.
  const half1 = { rel: "P.md", line: 10, id: "P.md#1", content: "Class Thing\n    Public A As Long\n" };
  const half2 = { rel: "P.md", line: 30, id: "P.md#2", content: "    Public B As Long\nEnd Class\n" };
  const joined = concatFences([half1, half2]);
  if (classify(joined.content).slot !== "file") {
    failures.push("concat: two halves of a Class did not join into a whole one");
  }
  for (const [bodyLine, wantRel, wantPage] of [
    [1, "P.md", 11],    // `Class Thing`      -- first line of the first fence
    [2, "P.md", 12],    // `Public A As Long`
    [3, "P.md", 31],    // `Public B As Long` -- first line of the SECOND fence
    [4, "P.md", 32],    // `End Class`
  ]) {
    const got = partOf(joined.concatParts, bodyLine);
    if (!got || got.fence.rel !== wantRel || got.pageLine !== wantPage) {
      failures.push(`concat: body line ${bodyLine} -> ${got?.pageLine}, want ${wantPage}`);
    }
  }
  if (partOf(joined.concatParts, 99)) failures.push("concat: a line past the end found a part");
  // A hidden header and footer around a visible method: the unit is the
  // method's sample, not page context that only travels with other samples.
  const hide = (f) => ({ ...f, flags: new Set([HIDDEN_MARKER, MARKER]) });
  const method = { rel: "P.md", line: 20, id: "P.md#2", flags: new Set([MARKER]),
    content: "    Sub Paint()\n    End Sub\n" };
  const around = concatFences([hide(half1), method,
    hide({ rel: "P.md", line: 40, id: "P.md#3", content: "End Class\n" })]);
  if (around.id !== "P.md#2" || around.flags.has(HIDDEN_MARKER)) {
    failures.push("concat: a hidden header made the visible part's sample into page context");
  }
  // Two pages that chose the same group name are two units.
  const member = (rel) => ({ rel, line: 1, id: `${rel}#1`, flags: new Set([MARKER]),
    keys: new Map([[CONCAT_KEY, "same-name"]]), content: "Sub S()\nEnd Sub\n" });
  if (joinConcatGroups([member("A.md"), member("B.md")]).length !== 2) {
    failures.push("concat: two pages' groups of one name were joined into one unit");
  }
  if (!parseInfo(`tb ${CONCAT_KEY}=widget`).flags.has(MARKER)) {
    failures.push(`concat: ${CONCAT_KEY} does not imply ${MARKER}`);
  }

  // A resource path is written into a staged project, so a path that climbs out
  // of it would write somewhere on the machine. Every refusal here is a path
  // that must never reach `writeFileSync`.
  for (const [raw, want] of [
    ["/Resources/MESSAGETABLE/Strings.json", "Resources/MESSAGETABLE/Strings.json"],
    ["Resources\\Sub\\file.json", "Resources/Sub/file.json"],
    ["./Resources/./file.json", "Resources/file.json"],
    ["../outside.json", null],
    ["Resources/../../outside.json", null],
    ["C:/Windows/system32/evil.json", null],
    ["//server/share/file.json", null],
    ["   ", null],
  ]) {
    const got = resourcePath(raw);
    if (got !== want) failures.push(`resource path: ${JSON.stringify(raw)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
  // ...and a resource fence is collected whatever language it carries, while an
  // ordinary fence in that language is not.
  if (!parseInfo("json resource=/Resources/x.json").keys.has("resource")) {
    failures.push("resource: the key is not read off a non-tb fence");
  }
  if (parseInfo("json resource=/Resources/x.json").bad.length) {
    failures.push("resource: the key is refused as unknown markup");
  }

  // The report's own arithmetic. A survey is only read through this grouping, so
  // a section that buckets wrong or a kind that fails to generalise moves the
  // numbers a decision is made on.
  for (const [rel, want] of [
    ["Reference/Default/VB/Form/index.md", "Reference/Default/VB"],
    ["Reference/Built-In/CEF/CefBrowser.md", "Reference/Built-In/CEF"],
    ["Reference/Core/Dim.md", "Reference/Core"],
    ["Reference/Attributes.md", "Reference/Attributes.md"],
    ["Tutorials/CustomControls/Painting.md", "Tutorials/CustomControls"],
  ]) {
    const got = sectionOf(rel);
    if (got !== want) failures.push(`section: ${rel} -> ${got}, want ${want}`);
  }
  if (diagKind("TB5079 Unrecognized symbol 'WebView'") !== "TB5079 Unrecognized symbol '...'") {
    failures.push("report: a diagnostic kind keeps the identifier, so every row is one of one");
  }
  if (unresolvedName("TB5079 Unrecognized datatype symbol 'ControlsSection'") !== "ControlsSection") {
    failures.push("report: the unresolved name was not read out of the diagnostic");
  }
  if (unresolvedName("TB5214 Only allowed inside a With block") !== null) {
    failures.push("report: a diagnostic naming nothing produced a name anyway");
  }

  // The markup must be invisible to the site. Verified against the REAL
  // pipeline -- createMarkdownIt plus the highlighter -- because a bare
  // markdown-it is a different renderer, which is the mistake WIP.md's
  // "Source dashes" section records paying for.
  const { createMarkdownIt, initHighlighter, applyPreRenderRewrites, maskCodeRegions } =
    await import("../builder/render.mjs");
  const highlighter = await initHighlighter();
  const md = createMarkdownIt({ highlighter, linkTables: null, baseurl: "", staticFiles: new Set() });
  const plain = "```tb\nDim x As Long\n```\n";
  const marked = "```tb " + MARKER + " slot=sub id=probe\nDim x As Long\n```\n";
  if (md.render(plain) !== md.render(marked)) failures.push("markup: the marker reaches the HTML");
  // A hidden fence must reach NO reader. Checked against the real renderer,
  // because everything downstream -- the search index, the offline mirror, the
  // PDF book -- reads the string this produces, so nothing else has to know.
  const hidden = "```tb " + HIDDEN_MARKER + "\nDim secret As Long\n```\n";
  if (md.render(hidden).trim() !== "") failures.push("markup: a hidden fence reaches the HTML");
  // ...and the word has to stand alone: an id that merely contains it, or a
  // fence in another language, must still publish.
  const notHidden = "```tb " + MARKER + " id=hidden-thing\nDim x As Long\n```\n";
  if (md.render(notHidden).trim() === "") failures.push("markup: `hidden` matched inside a value");
  const masked = maskCodeRegions(marked);
  if (masked.masked.includes("Dim x As Long")) failures.push("markup: maskCodeRegions stops hiding the body");
  if (masked.restore(masked.masked) !== marked) failures.push("markup: the mask does not round-trip");
  if (applyPreRenderRewrites(marked) !== marked) failures.push("markup: a pre-render rewrite alters it");

  if (failures.length) {
    for (const f of failures) say(`FAIL  probe: ${f}`);
    return false;
  }
  // 10 line-map (5 slots x 2 bases) + 4 wrapper container + 7 batching
  // + 5 splitting + 9 concat + 10 resource + 8 report + 6 markup.
  say(`ok    ${CLASSIFIER_PROBES.length + INFO_PROBES.length + 59} probes: ` +
    `classifier, markup, line mapping, batching, splitting, concat, resources and the report`);
  return true;
}

// ----------------------------------------------------------------------- main

async function main() {
  if (!await runProbes()) process.exit(2);

  // Reads a survey and nothing else -- no compiler, and not even the docs tree,
  // since the JSON already holds every page and line it names.
  if (MODE_REPORT) {
    let survey;
    try { survey = JSON.parse(readFileSync(MODE_REPORT, "utf8")); }
    catch (e) { console.error(`check_examples: cannot read ${MODE_REPORT}: ${e.message}`); process.exit(2); }
    summarise(survey);
    process.exit(0);
  }

  const fences = await collectFences(DOCS);
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
    console.error("no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
      "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
    process.exit(2);
  }
  if (!existsSync(COMPILER)) {
    console.error(`no compiler beside the IDE at ${COMPILER}`);
    process.exit(2);
  }

  if (!selected.length) {
    reportFindings();
    say(`check_examples: no sample is marked \`${MARKER}\`` +
      (only ? " in the selected pages" : "") + " -- nothing to compile");
    process.exit(findings.some((f) => !f.advisory) ? 1 : 0);
  }

  const batches = makeBatches(selected);
  const work = path.join(tmpdir(), "tbexamples", String(basePort));
  try {
    rmSync(work, { recursive: true, force: true });
  } catch (e) {
    // A run whose node process died mid-batch leaves its lane IDEs running on
    // their private desktops, holding the projects they opened here. Nothing
    // on screen says so, and the bare EPERM names a folder, not a cause.
    if (e.code !== "EPERM" && e.code !== "EBUSY") throw e;
    console.error(`check_examples: cannot clear ${work} (${e.code}).\n` +
      "  An earlier run on this --port probably died with its IDEs still open: look for\n" +
      "  twinBASIC.exe processes whose command line names a project under that folder,\n" +
      "  stop them, and run again -- or pass a different --port.");
    process.exit(2);
  }
  mkdirSync(work, { recursive: true });

  const staged = selected.length - samples.length;
  say(`check_examples: ${samples.length} sample(s) from ` +
    `${new Set(samples.map((f) => f.rel)).size} page(s) in ${batches.length} project(s), ` +
    `${Math.min(jobs, batches.length)} lane(s), BETA ${buildNumber(IDE) ?? "?"}` +
    (staged ? `, ${staged} staged file(s)` : ""));

  // Said out loud rather than passed over in silence: a sample asking to be RUN
  // is only being compiled today, and a reader of this output would otherwise
  // have no way to tell which of the two happened.
  const wantRun = selected.filter((f) => f.flags.has(RUN_MARKER)).length;
  if (wantRun) {
    say(`  note: ${wantRun} sample(s) ask for \`${RUN_MARKER}\`; execution is not ` +
      `implemented yet, so they were compiled only`);
  }

  // Every lane's IDE records its projects in the user's recent list and saved
  // project state (lib/tb-registry.mjs). This process owns the tidying for all
  // of them: the tbbuild children see TB_REGISTRY_OWNER and leave the registry
  // alone, because each restoring its own snapshot would put back whatever the
  // registry held when that lane happened to start. Everything is under `work`,
  // so one sweep by that folder at the end takes the lot -- and the sweep here
  // at the start takes whatever a run on this --port left when it died.
  tidy = startTidy({ prefixes: [work] });

  const t0 = Date.now();
  let results;
  try { results = await runAll(batches, work); }
  catch (e) { console.error(`check_examples: ${e.message}`); finishTidy(tidy); process.exit(2); }
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
    if (fence.isResource) continue;              // a staged file, not a sample
    if (crashed.has(fence.id)) continue;         // reported already, and never a pass
    const diags = (errorsById.get(fence.id) ?? []).filter((d) => d.severity === "ERROR");

    // A sample whose error landed in a package's own source. It comes first
    // because an `expect-error` cannot be judged against it: the diagnostic the
    // sample provoked is not on any line of the sample.
    const blame = blamedRows.get(fence.id);
    if (blame) {
      findings.push({
        id: fence.id, rel: fence.rel, line: fence.line,
        advisory: MODE_PROPOSE && !fence.marked,
        slot: fence.slot, project: fence.project, marked: fence.marked,
        message: "a diagnostic landed outside this sample, in a package or " +
          `template source (${fence.slot}, ${fence.project})${blame.rest}`,
        detail: blame.rows.join("  |  "),
        diagnostics: diags,
      });
      continue;
    }

    const expect = fence.keys.get("expect-error");
    if (expect !== undefined) {
      if (!diags.length) {
        addFinding(fence, "expected not to compile, but it did",
          expect ? `expected ${expect}` : undefined);
      } else if (expect && !diags.some((d) => d.message.includes(expect))) {
        addFinding(fence, `expected ${expect}, got: ${diags.map((d) => d.message).join("; ")}`);
      } else {
        passed.push(fence);
      }
      continue;
    }
    // A sample blamed as part of a group carries no rows of its own -- the
    // finding above names the group -- but it is still not a pass.
    if (!diags.length) {
      if (!blamed.has(fence.id)) passed.push(fence);
      continue;
    }
    findings.push({
      id: fence.id, rel: fence.rel, line: fence.line,
      // A sample that has not been marked has not claimed anything, so under
      // --propose its errors are information rather than a failure -- that mode
      // is a survey and must not exit 1 for doing its job.
      advisory: MODE_PROPOSE && !fence.marked,
      slot: fence.slot, project: fence.project, marked: fence.marked,
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
    say(`\n${passed.length} of ${samples.length} sample(s) compile; ` +
      `${unmarked.length} of them are not yet marked \`${MARKER}\``);
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
    say(`\ncheck_examples: ${samples.length} sample(s), ${passed.length} compile, ` +
      `${real} finding(s), ${secs}s` + (real ? "" : " -- clean"));
  }
  if (flag("keep")) say(`generated projects kept in ${work}`);
  else rmSync(work, { recursive: true, force: true });

  process.exit(real ? 1 : 0);
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

main().catch((err) => { console.error(err); finishTidy(tidy); process.exit(2); });
