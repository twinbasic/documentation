// Gate: every callout labelled with a twinBASIC build names what checks it, and every marker
// names something that exists.
//
// A callout labelled `BETA <n>` states what that build does, so a new build sends it back to be
// checked. The program that checks it is named in an HTML comment on the line above it:
//
//     <!-- test: bug lset-variant-destination-types, sample lset-boolean -->
//     > [!WARNING] BETA 1034
//
// or by a region around it (scripts/lib/test-markers.mjs has the grammar). The callouts of a
// generated Common Errors section need none: errors/<name>.yml is theirs, as the section's opening
// comment says. scripts/recheck_callouts.mjs runs what the markers name on a new build, and moves
// each label or lists the callout for a person.
//
// It checks that:
//   * every callout labelled BETA <n> outside a generated errors section is marked;
//   * every item of every marker under docs/ parses, and each one outside a contributed
//     package's test project names something that exists: a reproducer under bugs/, a lane, one
//     tb fence with that id built as a sample, a file of errors/, a mode of the LLVM probe;
//   * a page outside a contributed package's section names no package test case, and a region
//     outside those sections is closed and does not nest (check_package_tests.mjs checks the
//     sections' own regions and cases);
//   * no page has the old `<!-- bug: <slug> -->` comment, which no tool read;
//   * every fence marked `probe`, which the reader never sees, is named by some marker.
// It reads only the sources and needs no twinBASIC install.
//
//     node scripts/check_callout_evidence.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { compileOnlyNames, packageTestNames } from "../lib/package-tests.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import { createProbes } from "./lib/gate-probes.mjs";
import { checkKey, packageCases, readVerify, relabelLine, sampleStatus, verdictOf } from "./lib/recheck.mjs";
import { collectFences, PROBE_MARKER } from "./lib/tb-fences.mjs";
import { evidenceIndex, itemProblem, kindOf, markersOf, PACKAGE_KINDS, parseMarker } from "./lib/test-markers.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_callout_evidence.mjs [-h, --help]

Checks that every callout labelled BETA <n> names, in an HTML comment on the
line above it or a region around it, what checks it, and that every
<!-- test: ... --> marker under docs/ names a reproducer, lane, sample, error
data file or LLVM probe mode that exists. The callouts of a generated Common
Errors section are checked by their data and need no marker.

  -h, --help  print this text and exit

Exit codes:
  0  every probe passed, and every labelled callout and marker is in order
  1  a probe failed, or a callout or marker is not in order
  2  the gate could not run: a refused command line, or a crash`;

if (
  withUsageError(() =>
    parseCli(process.argv.slice(2), {
      options: { help: { type: "boolean", short: "h" } },
      stopAt: ["help"],
    }),
  ).values.help
)
  printHelpAndExit(USAGE);

const { check, report } = createProbes("check_callout_evidence", "see scripts/lib/test-markers.mjs");

// ---------------------------------------------------------------- probes

{
  const page = [
    "Text.",
    "<!-- test: bug some-bug, lane ide:forms -->",
    "> [!WARNING] BETA 1034",
    "> Wrong.",
    "",
    "> [!NOTE] BETA 1034",
    "> Unmarked.",
    "",
    "```md",
    "<!-- test: bug in-a-fence -->",
    "> [!NOTE] BETA 1034",
    "```",
    "",
    "    <!-- test: bug indented-code -->",
    "    > [!NOTE] BETA 1034",
    "",
    "<!-- test: sample s1 -->",
    "A paragraph the sample checks.",
    "",
    "> [!IMPORTANT] BETA 1034",
    "> Inside the region.",
    "<!-- /test -->",
    "",
    "<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->",
    "> [!NOTE] BETA 1034",
    "> Generated.",
    "<!-- /errors -->",
  ].join("\r\n");
  const { callouts: c, markers: mk, problems } = markersOf(page);
  check(
    "a marker or callout in a fence or in indented code is text",
    c.length === 4 && mk.length === 2 && problems.length === 0,
    JSON.stringify({ c, mk, problems }),
  );
  check(
    "a marker on the line above a callout marks it with its items, and its label is read",
    c[0].marked &&
      c[0].markerLine === 2 &&
      JSON.stringify(c[0].evidence) === JSON.stringify([{ bug: "some-bug" }, { lane: "ide:forms" }]) &&
      c[0].label.items[0]?.kind === "beta" &&
      mk[0].region === false,
    JSON.stringify(c[0]),
  );
  check("a callout with no marker above it and no region around it is not marked", !c[1].marked, JSON.stringify(c[1]));
  check(
    "a callout of any type inside a region is marked by the region's items",
    c[2].kind === "IMPORTANT" && c[2].marked && c[2].evidence?.[0]?.sample === "s1" && mk[1].region,
    JSON.stringify([c[2], mk[1]]),
  );
  check(
    "a callout of a generated errors section names its data file",
    c[3].errors === "VBA.Strings" && !c[3].marked && c[0].errors === null,
    JSON.stringify(c[3]),
  );
}

{
  const items = parseMarker(
    "bug a-b, lane addin:help, sample x.y-1, errors VBA.Math, llvm win64-llvm, F.S, compile C, probe p1, bug Bad_Slug, lane web:x, wat",
  );
  check(
    "every kind of item is read, and a malformed one is bad",
    JSON.stringify(items) ===
      JSON.stringify([
        { bug: "a-b" },
        { lane: "addin:help" },
        { sample: "x.y-1" },
        { errors: "VBA.Math" },
        { llvm: "win64-llvm" },
        { case: "F.S" },
        { compile: "C" },
        { probe: "p1" },
        { bad: "bug Bad_Slug" },
        { bad: "lane web:x" },
        { bad: "wat" },
      ]),
    JSON.stringify(items),
  );
  check(
    "none keeps its reason and stands alone, and none without a reason is bad",
    parseMarker("none -- a person, bug x")[0].none === "a person, bug x" && !!parseMarker("none")[0].bad,
    JSON.stringify([parseMarker("none -- a person, bug x"), parseMarker("none")]),
  );
  const fence = (rel, line, info) => ({
    rel,
    line,
    flags: new Set(info.split(" ").filter((w) => !w.includes("="))),
    keys: new Map(info.split(" ").flatMap((w) => (w.includes("=") ? [w.split("=")] : []))),
  });
  const index = {
    bugs: new Map([["a-b", { filed: false }]]),
    lanes: new Set(["ide:forms"]),
    samples: new Map([
      ["ok", [fence("A.md", 3, "check_build check_run id=ok")]],
      ["ctx", [fence("A.md", 9, "check_build hidden id=ctx")]],
      ["two", [fence("A.md", 12, "check_build id=two"), fence("B.md", 4, "check_build id=two")]],
    ]),
    errors: new Set(["VBA.Math"]),
    llvm: new Set(["win32"]),
  };
  const verdicts = [
    { bug: "a-b" },
    { bug: "c-d" },
    { lane: "ide:forms" },
    { lane: "addin:nope" },
    { sample: "ok" },
    { sample: "ctx" },
    { sample: "two" },
    { sample: "none-such" },
    { errors: "VBA.Math" },
    { errors: "VBA.Nope" },
    { llvm: "win32" },
    { llvm: "win99" },
    { case: "F.S" },
  ].map((i) => itemProblem(i, index));
  check(
    "an item that names nothing that exists, a fence that is context or two fences with one id is a problem",
    verdicts.map((v) => (v ? "x" : ".")).join("") === ".x.x.xxx.x.x.",
    JSON.stringify(verdicts, null, 1),
  );
}

// recheck_callouts.mjs's reading of the tools' reports, and its relabelling.
{
  const read = readVerify(
    [
      "running scripts/ide_test.mjs for forms",
      "a-bug (filed #2482): reproduces -- run exit 0",
      "b-bug: NO LONGER REPRODUCES -- compile: TB5079 gone",
      "c-bug: manual",
      "d-bug (filed): harness failed -- tbrun exit 2",
      "3 reproduce, 1 no longer reproduce, 0 manual, 0 harness failed",
    ].join("\r\n"),
  );
  check(
    "a reproducer's line from bug_repro verify gives its status, a filed one's included",
    [...read].map(([s, r]) => `${s}=${r.status}`).join(" ") === "a-bug=holds b-bug=changed c-bug=hand d-bug=error",
    JSON.stringify([...read]),
  );
  const report = {
    findings: [{ id: "p@win64", message: "raised error 53" }],
    ids: { passed: ["s", "p", "p@win64", "u"], unrun: ["u"] },
  };
  const status = (ids) => sampleStatus(report, ids).status;
  check(
    "a sample holds when each of its runs passed with no finding, and not when one has one, was not built or not run",
    status(["s"]) === "holds" &&
      status(["p", "p@win64"]) === "changed" &&
      status(["q"]) === "error" &&
      status(["u"]) === "error" &&
      sampleStatus(null, ["s"]).status === "error",
    JSON.stringify([["s"], ["p", "p@win64"], ["q"], ["u"]].map((ids) => sampleStatus(report, ids))),
  );
  const cases = packageCases(
    {
      packages: [
        {
          package: "Pkg",
          cases: [
            { name: "F.A", arch: "win32", verdict: "documented" },
            { name: "F.A", arch: "win64", verdict: "documented" },
            { name: "F.B", arch: "win32", verdict: "documented" },
            { name: "F.B", arch: "win64", verdict: "fixed" },
          ],
        },
      ],
    },
    "Pkg",
  );
  check(
    "a package case holds when it is as documented on every architecture",
    cases("F.A").status === "holds" && cases("F.B").status === "changed" && cases("F.C").status === "error",
    JSON.stringify([cases("F.A"), cases("F.B"), cases("F.C")]),
  );
  check(
    "a callout takes the worst status of its items, and none is no verdict to relabel on",
    verdictOf(["holds", "holds"]) === "holds" &&
      verdictOf(["holds", "hand"]) === "hand" &&
      verdictOf(["hand", "error", "holds"]) === "error" &&
      verdictOf(["error", "changed"]) === "changed" &&
      verdictOf([]) === "error",
  );
  check(
    "a package's cases are one check, a probe of it another, and the rest are named by their item",
    checkKey({ case: "F.A" }, "Pkg") === "package Pkg" &&
      checkKey({ compile: "C" }, "Pkg") === "package Pkg" &&
      checkKey({ probe: "c26" }, "Pkg") === "probe Pkg:c26" &&
      checkKey({ bug: "a-b" }, null) === "bug a-b" &&
      checkKey({ none: "why" }, null) === "none",
  );
  check(
    "relabelling moves the build, keeps the package version and the indent, and leaves since BETA and other lines alone",
    relabelLine("> [!WARNING] BETA 1034", 1035) === "> [!WARNING] BETA 1035" &&
      relabelLine("  > [!NOTE] 1.0.0.4, BETA 1010", 1035) === "  > [!NOTE] 1.0.0.4, BETA 1035" &&
      relabelLine("> [!NOTE] since BETA 984", 1035) === null &&
      relabelLine("> Some BETA 1034 text.", 1035) === null,
    JSON.stringify([
      relabelLine("> [!WARNING] BETA 1034", 1035),
      relabelLine("  > [!NOTE] 1.0.0.4, BETA 1010", 1035),
      relabelLine("> [!NOTE] since BETA 984", 1035),
    ]),
  );
}

// ---------------------------------------------------------------- the corpus

const problems = [];
const pages = await markdownFiles(DOCS_DIR);
const fences = await collectFences(DOCS_DIR);
const index = await evidenceIndex({ fences });
const projects = new Set(packageTestNames(path.join(REPO_ROOT, "test", "package-tests")));
// A package that does not compile has compile cases and no project; the package gate checks those.
const compileOnly = new Set(compileOnlyNames(path.join(REPO_ROOT, "test", "package-tests")));
const OLD_BUG = /^[ \t]*<!--[ \t]*bug:[ \t]*([a-z0-9-]+)[ \t]*-->[ \t]*$/m;

const named = new Set();
let labelled = 0;
let marked = 0;
let generated = 0;
for (const rel of pages) {
  const text = readFileSync(path.join(DOCS_DIR, rel), "utf8");
  const section = /^Reference\/Contributed\/([^/]+)\//.exec(rel)?.[1] ?? null;
  // The package gate checks a section with a test project: its regions and its package items.
  const packageGate = section !== null && projects.has(section);
  const { callouts, markers, problems: regions } = markersOf(text);
  if (!packageGate) problems.push(...regions.map((p) => `${rel} ${p}`));
  const old = OLD_BUG.exec(text);
  if (old) {
    const line = text.slice(0, old.index).split("\n").length;
    problems.push(`${rel} line ${line}: <!-- bug: ${old[1]} --> is not a marker: write <!-- test: bug ${old[1]} -->`);
  }
  for (const c of callouts) {
    if (!c.label.items.some((i) => i.kind === "beta")) continue;
    labelled++;
    if (c.errors) {
      generated++;
      continue;
    }
    if (c.marked) marked++;
    else
      problems.push(
        `${rel} line ${c.line}: the ${c.kind} labelled ${c.label.items.map((i) => i.text).join(", ")} names nothing that checks it: put <!-- test: ... --> on the line above it`,
      );
  }
  for (const mk of markers) {
    const where = `${rel} line ${mk.line}`;
    if (!mk.items.length && !packageGate) problems.push(`${where}: the marker names nothing`);
    for (const item of mk.items) {
      const kind = kindOf(item);
      if (kind === "sample") named.add(item.sample);
      if (PACKAGE_KINDS.has(kind)) {
        if (section === null) problems.push(`${where}: ${kind} items name a contributed package's test cases`);
        else if (!packageGate && !(kind === "compile" && compileOnly.has(section)))
          problems.push(`${where}: ${section} has no test project for a ${kind} item to name`);
        continue;
      }
      const problem = itemProblem(item, index);
      if (problem) problems.push(`${where}: ${problem}`);
    }
  }
}
for (const f of fences) {
  if (!f.flags.has(PROBE_MARKER)) continue;
  const id = f.keys.get("id");
  if (!id) problems.push(`${f.rel} line ${f.line}: a probe has an id=, which a marker names`);
  else if (!named.has(id))
    problems.push(`${f.rel} line ${f.line}: no marker names the probe ${id}: <!-- test: sample ${id} -->`);
}

check(
  `every labelled callout names what checks it (${labelled} labelled BETA <n>: ${marked} marked, ${generated} in errors sections), and every marker names what exists`,
  problems.length === 0,
  problems.join("\n"),
);

process.exitCode = report();
