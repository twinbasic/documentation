#!/usr/bin/env node
// Gate: every documentation code sample marked `check_build` compiles.
//
//     node scripts/check_examples.mjs                    # the gate
//     node scripts/check_examples.mjs --only "^Reference/Core"
//     node scripts/check_examples.mjs --census           # classify every tb fence
//     node scripts/check_examples.mjs --propose          # compile unmarked ones too
//     node scripts/check_examples.mjs --propose --apply  # ...and mark the ones that pass
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
// 1,116 `tb` fences under docs/, and a third of them are not programs: a
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
// Four collision rules fall out of putting unrelated samples in one compilation
// unit, and each is a real hazard rather than a precaution:
//
//   * one generated `Module tbx_<hash>` per fence, hashed from its id;
//   * everything generated is Private -- eleven pages declare a `MyString`;
//   * `Sub Main` comes from the template, never from a sample;
//   * a generated module must not share a name with the project, or
//     [RunAfterBuild]'s call becomes ambiguous and the IDE reports it at
//     EXECUTION time, so the build is green and nothing runs.
//
// And one that does not: a sample can take the compiler down. twinBASIC runs it
// in-process with user code, and a two-line syntax skeleton in Attributes.md
// crashes it outright (BUGS-TO-REPORT.md). In a batch that costs every other
// sample its result, so a crash bisects: O(log n) extra builds, paid only on
// failure.

import { execFileSync, spawn } from "node:child_process";
import {
  cpSync, existsSync, mkdirSync, promises as fs, readdirSync, readFileSync, rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BODY_SLOTS, MARKER, RUN_MARKER, SLOTS, classify, collectFences, moduleName, parseInfo,
  wrapFence,
} from "./lib/tb-fences.mjs";
import { buildNumber, compilerExe, findIde } from "./lib/tb-install.mjs";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(REPO, "docs");
const TEMPLATES = path.join(REPO, "test", "example-projects");

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };

const MODE_CENSUS = flag("census");
const MODE_PROPOSE = flag("propose");
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
  if (/^Reference\/Built-In\//.test(rel)) return "packages";
  // A tutorial about a package needs that package. Most are a folder named
  // after one; Testing-with-Assert is a single file, so it is named here.
  if (/^Tutorials\/(CEF|WebView2|CustomControls)\//.test(rel)) return "packages";
  if (/^Tutorials\/Testing-with-Assert\.md$/.test(rel)) return "packages";
  // `console` stays the default, and it is the stricter environment on purpose:
  // a Core or VBA sample should compile in a project that references only what
  // every project references, which is what a reader will have.
  return "console";
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
const addFinding = (fence, message, detail) =>
  findings.push({ id: fence.id, rel: fence.rel, line: fence.line, message, detail });

function select(fences) {
  const chosen = [];
  for (const fence of fences) {
    if (only && !only.test(fence.rel)) continue;

    // A mistyped marker is a finding in every mode, including --census. It is
    // the one thing here that fails silently otherwise: an unrecognised token
    // in an info string renders identically to no token at all, so a sample
    // marked `check_bild` would never be compiled and nothing would say so.
    if (fence.bad.length) {
      addFinding(fence, `unrecognised fence markup: ${fence.bad.join(" ")}`,
        `known flags: ${MARKER}, ${RUN_MARKER}; keys: slot=${SLOTS.join("|")}, ` +
        `inherits=, project=, projname=, id=, expect-error=`);
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

    if (MODE_CENSUS) { chosen.push(fence); continue; }

    if (!slot) {
      // Marked but unclassifiable is a finding; unmarked and unclassifiable is
      // just a fragment, which is the normal state of most of the corpus.
      if (marked) {
        addFinding(fence, `marked \`${MARKER}\` but its shape could not be inferred: ${inferred.reason}`,
          `state one explicitly: slot=${SLOTS.join(" | slot=")}`);
      }
      continue;
    }
    if (!existsSync(path.join(TEMPLATES, fence.project, "Settings"))) {
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
    if (!name || (only && !only.test(f.rel))) continue;
    if (!members.has(name)) members.set(name, []);
    members.get(name).push(f);
  }
  const chosen = new Set(selected.map((f) => f.id));
  for (const [name, list] of members) {
    const inRun = list.filter((f) => chosen.has(f.id));
    if (!inRun.length) continue;
    if (inRun.length !== list.length) {
      const missing = list.filter((f) => !chosen.has(f.id));
      addFinding(inRun[0], `projname=${name} is incomplete: ${inRun.length} of ${list.length} samples are in this run`,
        "unmarked or excluded: " + missing.map((f) => `docs/${f.rel}:${f.line}`).join(", "));
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
  const byProject = new Map();
  for (const f of fences) {
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
      const names = members.flatMap((f) =>
        (BODY_SLOTS.has(f.slot) ? [] : (f.inferred?.names ?? [])).map((n) => n.toLowerCase()));

      // A GROUP GETS ITS OWN PROJECT, and nothing else joins it. Togetherness
      // alone would leave a group's result depending on whichever unrelated
      // samples happened to share the batch -- so the guarantee is the one the
      // author can actually reason about: what compiles is what they grouped,
      // plus the template. It costs one project per group, and groups are
      // written by hand, so there are never many.
      if (key.startsWith("@")) {
        batches.push({ project, fences: [...members], names: new Set(names), group: key.slice(1) });
        continue;
      }

      let placed = false;
      for (const batch of open) {
        if (batch.fences.length >= target) continue;
        if (names.some((n) => batch.names.has(n))) continue;
        batch.fences.push(...members);
        for (const n of names) batch.names.add(n);
        placed = true;
        break;
      }
      if (placed) continue;
      const batch = { project, fences: [...members], names: new Set(names) };
      open.push(batch);
      batches.push(batch);
    }
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
  cpSync(path.join(TEMPLATES, batch.project), dir, { recursive: true });

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
  const packed = execFileSync(COMPILER,
    ["import", proj.split("/").join("\\"), dir.split("/").join("\\"), "--overwrite"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  // import exits 0 whether it worked or not, so the output is the only test.
  if (!/\.\.\. DONE\s*$/.test(packed.trim())) {
    throw new Error(`packing failed:\n${packed.trim().split("\n").slice(-3).join("\n")}`);
  }
  return { proj, dir, map };
}

// ------------------------------------------------------------------- building

const IDE = findIde(opt("ide", undefined));
const COMPILER = IDE ? compilerExe(IDE) : null;

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
  // Anything that cannot be pinned to a sample: a diagnostic against one of the
  // template's own files, which would otherwise read as every sample failing at
  // once, and a row in a shape this does not parse. Both are reported as
  // themselves rather than folded into the findings.
  const templateFaults = [];
  for (const row of result.diagnostics ?? []) {
    const m = /^\{(\w+)\}\s+(\S+)\s+\[(\d+),(\d+)\]:\s*(.*)$/.exec(row);
    if (!m) { templateFaults.push(row); continue; }
    const [, severity, file, lineRaw, , message] = m;
    if (severity !== "ERROR" && !VERBOSE) continue;
    const base = file.split("/").pop();
    const entry = staged.map.get(base);
    if (!entry) {
      if (severity === "ERROR") templateFaults.push(row);
      continue;
    }
    const genLine = Number(lineRaw);
    const pageLine = entry.fence.line + genLine - entry.offset;
    if (!perFence.has(entry.fence.id)) perFence.set(entry.fence.id, []);
    perFence.get(entry.fence.id).push({ severity, pageLine, message });
  }
  return { perFence, templateFaults };
}

/**
 * Build a batch, bisecting on a compiler crash.
 *
 * A crash is attributed to a single sample by halving until one is left. That
 * sample is a finding in its own right -- it is also a compiler bug, and
 * BUGS-TO-REPORT.md is where one goes.
 */
async function runBatch(batch, port, work) {
  const staged = stageBatch(batch, work);
  const result = await buildStaged(staged, port);
  if (!flag("keep")) rmSync(staged.dir, { recursive: true, force: true });

  if (!result.crashed) return result;

  if (batch.fences.length === 1) {
    const fence = batch.fences[0];
    addFinding(fence, "crashes the twinBASIC compiler",
      "the compiler dies parsing this sample; record it in BUGS-TO-REPORT.md");
    // Named back to the caller, because a crashed sample produced no
    // diagnostics and would otherwise be counted as one that compiled -- the
    // same false-clean shape tbbuild's own crash check exists to close.
    return { perFence: new Map(), templateFaults: [], crashed: [fence.id] };
  }
  const half = Math.ceil(batch.fences.length / 2);
  const parts = [
    { ...batch, fences: batch.fences.slice(0, half) },
    { ...batch, fences: batch.fences.slice(half) },
  ];
  const merged = { perFence: new Map(), templateFaults: [], crashed: [] };
  for (const part of parts) {
    const sub = await runBatch(part, port, work);
    for (const [k, v] of sub.perFence ?? []) merged.perFence.set(k, v);
    merged.templateFaults.push(...(sub.templateFaults ?? []));
    merged.crashed.push(...(sub.crashed ?? []));
  }
  return merged;
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
];

const INFO_PROBES = [
  ["bare language", "tb", (p) => !p.flags.size && !p.bad.length],
  ["the marker", `tb ${MARKER}`, (p) => p.flags.has(MARKER) && !p.bad.length],
  [`${RUN_MARKER} implies ${MARKER}`, `tb ${RUN_MARKER}`,
    (p) => p.flags.has(MARKER) && p.flags.has(RUN_MARKER)],
  ["a key", `tb ${MARKER} slot=module`, (p) => p.keys.get("slot") === "module"],
  ["a group name", `tb ${MARKER} projname=padleft`, (p) => p.keys.get("projname") === "padleft"],
  ["a typo is refused", "tb check_bild", (p) => p.bad.length === 1 && !p.flags.has(MARKER)],
  ["an unknown key is refused", `tb ${MARKER} mode=x`, (p) => p.bad.length === 1],
  ["a bad slot is refused", `tb ${MARKER} slot=banana`, (p) => p.bad.length === 1],
  ["a base class", `tb ${MARKER} inherits=Form`, (p) => p.keys.get("inherits") === "Form"],
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
  const fake = (id, group, names = []) => ({
    id, rel: "X.md", line: 1, slot: names.length ? "module" : "sub", project: "console",
    keys: new Map(group ? [["projname", group]] : []), inferred: { names },
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
  const masked = maskCodeRegions(marked);
  if (masked.masked.includes("Dim x As Long")) failures.push("markup: maskCodeRegions stops hiding the body");
  if (masked.restore(masked.masked) !== marked) failures.push("markup: the mask does not round-trip");
  if (applyPreRenderRewrites(marked) !== marked) failures.push("markup: a pre-render rewrite alters it");

  if (failures.length) {
    for (const f of failures) say(`FAIL  probe: ${f}`);
    return false;
  }
  // 10 line-map (5 slots x 2 bases) + 4 wrapper container + 3 batching + 4 markup.
  say(`ok    ${CLASSIFIER_PROBES.length + INFO_PROBES.length + 21} probes: ` +
    `classifier, markup, line mapping and batching`);
  return true;
}

// ----------------------------------------------------------------------- main

async function main() {
  if (!await runProbes()) process.exit(2);

  const fences = await collectFences(DOCS);
  const selected = select(fences);
  checkGroups(fences, selected);

  if (MODE_CENSUS) {
    census(selected);
    reportFindings();
    process.exit(findings.length ? 1 : 0);
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
    process.exit(findings.length ? 1 : 0);
  }

  const batches = makeBatches(selected);
  const work = path.join(tmpdir(), "tbexamples", String(basePort));
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  say(`check_examples: ${selected.length} sample(s) from ` +
    `${new Set(selected.map((f) => f.rel)).size} page(s) in ${batches.length} project(s), ` +
    `${Math.min(jobs, batches.length)} lane(s), BETA ${buildNumber(IDE) ?? "?"}`);

  // Said out loud rather than passed over in silence: a sample asking to be RUN
  // is only being compiled today, and a reader of this output would otherwise
  // have no way to tell which of the two happened.
  const wantRun = selected.filter((f) => f.flags.has(RUN_MARKER)).length;
  if (wantRun) {
    say(`  note: ${wantRun} sample(s) ask for \`${RUN_MARKER}\`; execution is not ` +
      `implemented yet, so they were compiled only`);
  }

  const t0 = Date.now();
  let results;
  try { results = await runAll(batches, work); }
  catch (e) { console.error(`check_examples: ${e.message}`); process.exit(2); }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const errorsById = new Map();
  const templateFaults = [];
  const crashed = new Set();
  for (const r of results) {
    for (const [id, list] of r.perFence ?? []) errorsById.set(id, list);
    templateFaults.push(...(r.templateFaults ?? []));
    for (const id of r.crashed ?? []) crashed.add(id);
  }

  const passed = [];
  for (const fence of selected) {
    if (crashed.has(fence.id)) continue;         // reported already, and never a pass
    const diags = (errorsById.get(fence.id) ?? []).filter((d) => d.severity === "ERROR");
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
    if (!diags.length) { passed.push(fence); continue; }
    findings.push({
      id: fence.id, rel: fence.rel, line: fence.line,
      // A sample that has not been marked has not claimed anything, so under
      // --propose its errors are information rather than a failure -- that mode
      // is a survey and must not exit 1 for doing its job.
      advisory: MODE_PROPOSE && !fence.marked,
      message: `does not compile (${fence.slot}${fence.slotStated ? "" : ", inferred"}, ${fence.project})`,
      diagnostics: diags,
    });
  }

  if (templateFaults.length) {
    say("\nFAIL  diagnostics that belong to no sample -- a fault in the template");
    say("      project, or a row in a shape this tool cannot read:");
    for (const row of [...new Set(templateFaults)].slice(0, 10)) say(`        ${row}`);
  }

  if (MODE_PROPOSE) {
    const unmarked = passed.filter((f) => !f.marked);
    say(`\n${passed.length} of ${selected.length} sample(s) compile; ` +
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
    console.log(JSON.stringify({ selected: selected.length, passed: passed.length, findings }, null, 2));
  } else {
    reportFindings();
    say(`\ncheck_examples: ${selected.length} sample(s), ${passed.length} compile, ` +
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
      say(`        docs/${f.rel}:${d.pageLine}: ${d.message}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(2); });
