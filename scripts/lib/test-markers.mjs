// The markers that tie a page's statements to the programs that check them, one grammar for
// every page under docs/:
//
//     <!-- test: bug lset-variant-destination-types, sample lset-boolean -->
//     > [!WARNING] BETA 1034
//
// A marker on the line directly above a callout marks that callout. Anywhere else it opens a
// region, which `<!-- /test -->` closes: the prose between them is what its items check. Regions
// do not nest, and a callout inside one is marked by it. Markers inside a fence or an indented
// code block are text, not markers.
//
// The items, separated by commas:
//
//   Fixture.Sub          a [TestCase] of the section's package test project
//   compile <Name>       a compile case of that project
//   probe <id>           a scenario of that project's probe/ harness
//   bug <slug>           a reproducer, bugs/<slug>/ or bugs/filed/<slug>/, which
//                        `bug_repro.mjs verify` runs; it holds while the bug reproduces
//   lane <suite>:<lane>  a lane of test/ide/lanes.mjs (ide) or test/addin/lanes.mjs (addin);
//                        it holds while every test of the lane passes
//   sample <id>          a tb fence under docs/ with `id=<id>`, built by examples.bat: a
//                        `check_run` sample, a `probe` the reader never sees, or a `check_build`
//                        one; it holds while examples.bat finds nothing wrong with it
//   errors <name>        the run-time error data errors/<name>.yml, which `errors.mjs run` checks
//   llvm <mode>          a mode of the LLVM claims probe, test/llvm/run.mjs
//   none -- <reason>     nothing a program can check: a person checks it again
//
// The first three belong to a contributed package's section, which has a test project
// (scripts/check_package_tests.mjs checks them); the rest may be used on any page
// (scripts/check_callout_evidence.mjs checks them). scripts/recheck_callouts.mjs runs what the
// markers of the callouts labelled with an older twinBASIC build name, and moves each label to
// the new build or lists the callout for a person.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseCalloutLabel } from "../../lib/callout-labels.mjs";
import { blockRegions } from "../../lib/markdown.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

// A callout's first line, indented or not; its type and its label.
const CALLOUT_RE = /^[ \t]*>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([^\n]*)$/;
// A marker, `<!-- test: <item>, <item> -->`, on a line of its own; and the end of a region.
const MARKER_RE = /^[ \t]*<!--[ \t]*test:[ \t]*(.*?)[ \t]*-->[ \t]*$/;
const END_RE = /^[ \t]*<!--[ \t]*\/test[ \t]*-->[ \t]*$/;
// The run-time error data's section, which scripts/errors.mjs write generates with its callouts:
// its opening comment names the data file, and the data is the callouts' evidence.
const ERRORS_OPEN_RE = /^<!--[ \t]*errors:[^\n]*?\berrors\/([\w.-]+)\.yml\b[^\n]*-->[ \t]*$/;
const ERRORS_CLOSE_RE = /^<!--[ \t]*\/errors[ \t]*-->[ \t]*$/;

/** The item kinds that name a case of a contributed package's test project. */
export const PACKAGE_KINDS = new Set(["case", "compile", "probe"]);

/** The lane suites: the runner a `lane` item's lanes run in, and the file that lists them. */
export const SUITES = {
  ide: { tool: "scripts/ide_test.mjs", lanes: "test/ide/lanes.mjs" },
  addin: { tool: "scripts/addin_test.mjs", lanes: "test/addin/lanes.mjs" },
};

/**
 * The markers and callouts of a page, outside fences and indented code.
 *
 * @param {string} text
 * @returns {{callouts: {line: number, kind: string, label: object, marked: boolean,
 *              evidence: object[] | null, markerLine: number | null, errors: string | null}[],
 *            markers: {line: number, items: object[], region: boolean}[], problems: string[]}}
 *   `label` is parseCalloutLabel's reading of the rest of the callout's first line. `evidence`
 *   holds the items of its marker or of the region it is in, and `markerLine` that marker's line;
 *   `errors` names the data file of the generated errors section it is in (`VBA.Strings` for
 *   errors/VBA.Strings.yml), whose data is its evidence. `markers` holds every marker, a
 *   callout's and a region's alike; `items` parses one (parseMarker). `problems` names a region
 *   not closed, a region opened inside another and a close with no region.
 */
export function markersOf(text) {
  const lines = text.split(/\r\n?|\n/);
  const inCode = [];
  for (const r of blockRegions(text)) {
    if (r.type === "html_block") continue;
    for (let i = r.start; i < r.end; i++) inCode[i] = true;
  }
  const callouts = [];
  const markers = [];
  const problems = [];
  let open = null; // the region's marker
  let errors = null; // the data file of the errors section the line is in
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const e = ERRORS_OPEN_RE.exec(lines[i]);
    if (e) {
      errors = e[1];
      continue;
    }
    if (ERRORS_CLOSE_RE.test(lines[i])) {
      errors = null;
      continue;
    }
    const m = MARKER_RE.exec(lines[i]);
    if (m) {
      const own = CALLOUT_RE.test(lines[i + 1] ?? "") && !inCode[i + 1];
      const marker = { line: i + 1, items: parseMarker(m[1]), region: !own };
      markers.push(marker);
      if (own) continue; // a callout's own marker
      if (open !== null) problems.push(`line ${i + 1}: a region opens inside the region of line ${open.line}`);
      open = marker;
      continue;
    }
    if (END_RE.test(lines[i])) {
      if (open === null) problems.push(`line ${i + 1}: <!-- /test --> closes no region`);
      open = null;
      continue;
    }
    const c = CALLOUT_RE.exec(lines[i]);
    if (!c) continue;
    const above = MARKER_RE.test(lines[i - 1] ?? "") && !inCode[i - 1] ? markers.at(-1) : null;
    const by = above ?? open;
    callouts.push({
      line: i + 1,
      kind: c[1],
      label: parseCalloutLabel(c[2]),
      marked: by !== null,
      evidence: by?.items ?? null,
      markerLine: by?.line ?? null,
      errors,
    });
  }
  if (open !== null) problems.push(`line ${open.line}: the region is not closed with <!-- /test -->`);
  return { callouts, markers, problems };
}

/**
 * The items of a marker, each an object with one key: { case: "Fixture.Sub" }, { compile },
 * { probe }, { bug }, { lane: "ide:<lane>" }, { sample }, { errors }, { llvm } or { none }, and
 * { bad: "text" } for one the grammar does not know.
 */
export function parseMarker(text) {
  const none = /^none[ \t]*(?:--|:)?[ \t]*(.*)$/.exec(text);
  if (none) return [none[1].trim() ? { none: none[1].trim() } : { bad: "none needs a reason" }];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (/^\w+\.\w+$/.test(s)) return { case: s };
      const m = /^(compile|probe|bug|lane|sample|errors|llvm)[ \t]+(\S+)$/.exec(s);
      if (!m) return { bad: s };
      const [, kind, value] = m;
      const shape = {
        compile: /^\w+$/,
        probe: /^[\w,.-]+$/,
        bug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        lane: /^(?:ide|addin):[\w.-]+$/,
        sample: /^[\w.-]+$/,
        errors: /^[\w.-]+$/,
        llvm: /^[\w-]+$/,
      }[kind];
      return shape.test(value) ? { [kind]: value } : { bad: s };
    });
}

/** An item's kind, the one key of its object. */
export const kindOf = (item) => Object.keys(item)[0];

/** An item as a marker writes it. */
export function itemText(item) {
  const kind = kindOf(item);
  if (kind === "case") return item.case;
  if (kind === "none") return `none -- ${item.none}`;
  return `${kind} ${item[kind]}`;
}

// ---------------------------------------------------------------- what exists

/**
 * What the items outside a package's test project can name, read once from the repository: the
 * reproducers, the lanes of each suite, the explicit fence ids of docs/ with the fences, the error
 * data files and the LLVM probe's modes.
 *
 * @param {{fences: object[]}} o  `fences`: tb-fences' collectFences(docs), whose explicit ids
 *   (`id=` in the info string) a `sample` item may name
 */
export async function evidenceIndex({ fences, root = REPO_ROOT }) {
  const dirs = (dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];
  const bugs = new Map();
  for (const slug of dirs(path.join(root, "bugs"))) {
    if (existsSync(path.join(root, "bugs", slug, "repro.json"))) bugs.set(slug, { filed: false });
  }
  for (const slug of dirs(path.join(root, "bugs", "filed"))) {
    if (existsSync(path.join(root, "bugs", "filed", slug, "repro.json"))) bugs.set(slug, { filed: true });
  }
  const lanes = new Set();
  for (const [suite, { lanes: file }] of Object.entries(SUITES)) {
    const list = (await import(pathToFileURL(path.join(root, file)).href)).default;
    for (const l of list) lanes.add(`${suite}:${l.name ?? path.basename(l.file, ".test.mjs")}`);
  }
  const samples = new Map();
  for (const f of fences) {
    if (!f.keys?.has("id")) continue;
    const id = f.keys.get("id");
    if (!samples.has(id)) samples.set(id, []);
    samples.get(id).push(f);
  }
  const errorsDir = path.join(root, "errors");
  const errors = new Set(
    existsSync(errorsDir)
      ? readdirSync(errorsDir)
          .filter((f) => f.endsWith(".yml") && f !== "messages.yml")
          .map((f) => f.slice(0, -4))
      : [],
  );
  const llvmFile = path.join(root, "test", "llvm", "expect.json");
  const llvm = new Set(existsSync(llvmFile) ? Object.keys(JSON.parse(readFileSync(llvmFile, "utf8")).modes ?? {}) : []);
  return { bugs, lanes, samples, errors, llvm };
}

/**
 * What is wrong with an item outside a package's test project, or null when it names something
 * that exists. A package item (case, compile, probe) is the package gate's to check: null here.
 *
 * @param {object} item
 * @param {object} index  evidenceIndex's
 */
export function itemProblem(item, index) {
  const kind = kindOf(item);
  const value = item[kind];
  switch (kind) {
    case "bad":
      return `"${value}" is not an item: Fixture.Sub, compile <Name>, probe <id>, bug <slug>, lane <suite>:<lane>, sample <id>, errors <name>, llvm <mode> or none -- <reason>`;
    case "bug":
      return index.bugs.has(value) ? null : `no reproducer bugs/${value}/ or bugs/filed/${value}/ with a repro.json`;
    case "lane":
      return index.lanes.has(value) ? null : `no lane ${value} in ${SUITES[value.split(":")[0]].lanes}`;
    case "sample": {
      const found = index.samples.get(value) ?? [];
      if (!found.length) return `no tb fence with id=${value} under docs/`;
      if (found.length > 1)
        return `id=${value} is on ${found.length} fences: ${found.map((f) => `${f.rel} line ${f.line}`).join(", ")}`;
      const [f] = found;
      if (!f.flags.has("check_build") || f.flags.has("hidden"))
        return `the fence with id=${value} (${f.rel} line ${f.line}) is not built as a sample of its own: mark it check_build, check_run or probe`;
      return null;
    }
    case "errors":
      return index.errors.has(value) ? null : `no error data errors/${value}.yml`;
    case "llvm":
      return index.llvm.has(value)
        ? null
        : `no mode ${value} in test/llvm/expect.json (it has ${[...index.llvm].join(", ")})`;
    default:
      return null;
  }
}
