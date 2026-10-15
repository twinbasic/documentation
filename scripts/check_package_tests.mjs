// Gate: every NOTE and WARNING of a contributed package's section is tied to the test cases
// behind it, and every package test project is in order.
//
// A contributed package's test project (test/package-tests/<Package>/, README there) holds a
// case for each claim the section's callouts make. A callout names its cases in an HTML comment
// on the line above it:
//
//     <!-- test: FileSystemTools.GetRelativePath_LongBase, compile NoWin64 -->
//     > [!WARNING]
//
// with `Fixture.Sub` for a [TestCase], `compile <Name>` for a compile case, `probe <id>` for a
// scenario of the package's probe/ harness, or `none -- <reason>` for a callout no program can
// check. This gate reads only the sources: the section's pages, the project's files and the
// template that names the package's version. It needs no twinBASIC install; running the cases is
// scripts/package_tests.mjs.
//
// For a package with a test project it checks that:
//   * every callout of the section's pages has a marker, and every item of it names something
//     that exists;
//   * every case is named by some marker, a compile case of the compile/ project included;
//   * compile/, when there is one, holds compile cases only;
//   * every [TestCase] Sub starts with Expect.Begin and ends with Expect.Done, and every
//     [TestCase] can be called;
//   * expect.json is for the version the section documents (its indexed_from, which the sample
//     template references) and names only cases that exist;
//   * RunAll.twin is what scripts/package_tests.mjs would write;
//   * the project does not carry its own copy of Expect.twin.
// A section listed in PENDING has no test project yet and is not checked; one listed there that
// has one, or one not listed that has none, fails the gate, so the list only shrinks.
//
// Probes of the gate's own reading (markers, RunAll, expect.json, verdicts) run first, on inputs
// built here, so the gate means the same against a tree with no test project at all.
//
//     node scripts/check_package_tests.mjs

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { parseFrontmatter } from "../lib/frontmatter.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import {
  COMPILE_DIR,
  compileSources,
  EXPECT_FILE,
  EXPECT_JSON,
  packageTestNames,
  packageVersion,
  RUNALL_FILE,
  templateSettings,
  testSources,
} from "../lib/package-tests.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { createProbes } from "./lib/gate-probes.mjs";
import { findCases, judgeCompiles } from "./lib/tb-tests.mjs";
import {
  expectationFor,
  expectFrom,
  judge,
  malformedCases,
  markersOf,
  outcomeOf,
  parseMarker,
  projectCases,
  runAllText,
} from "./lib/package-test-cases.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_package_tests.mjs [-h, --help]

Checks that every NOTE and WARNING of a contributed package's section names the
test cases behind it, and that each package test project under
test/package-tests/ is in order: its cases named, well formed, in expect.json
for the documented version, and in its generated RunAll module.

  -h, --help  print this text and exit

Exit codes:
  0  every probe passed and every test project is in order
  1  a probe failed, or a section or test project is not in order
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

// The contributed sections that have no test project yet. Each package's project removes it
// from here; the gate fails on a name here with a project, and on a section neither here nor
// with one.
const PENDING = new Set([
  "ArrayListLib",
  "TBMANLIB",
  "TBMANLIB_ConsoleComponents",
  "TBMANLIB_Dialog",
  "TBMANLIB_Xml",
  "VBA_JSON",
  "WinReg",
]);

const DOCS = path.join(REPO_ROOT, "docs");
const SECTIONS = path.join(DOCS, "Reference", "Contributed");
const ROOT = path.join(REPO_ROOT, "test", "package-tests");
const TEMPLATES = path.join(REPO_ROOT, "test", "example-projects");

const { check, report } = createProbes("check_package_tests", "see test/package-tests/README.md");

// ---------------------------------------------------------------- probes

{
  // The compiler counts a lone CR as a line end (BETA 1005), so a compile case
  // is numbered the same whichever of the three ends the lines above it.
  const body = ["Module M", "    Sub S()", "        x = 1 ' CASE C1: TB5079", "    End Sub", "End Module"];
  const lines = (eol) => findCases([{ name: "M.twin", text: body.join(eol) }]).compiles.map((c) => c.line);
  const mixed = findCases([{ name: "M.twin", text: `${body[0]}\r${body[1]}\r\n${body.slice(2).join("\n")}` }]);
  check(
    "a compile case is on the same line after CRLF, LF, a lone CR or a mix of them",
    [lines("\r\n"), lines("\n"), lines("\r"), mixed.compiles.map((c) => c.line)].every((l) => l.join() === "3"),
    JSON.stringify([lines("\r\n"), lines("\n"), lines("\r"), mixed.compiles]),
  );
  const [judged] = judgeCompiles(mixed.compiles, ["{ERROR} /P/Sources/M.twin [3,9]: TB5079 Unrecognized symbol 'x'"]);
  check("a compile case is judged by the diagnostic on its line", judged?.pass === true, JSON.stringify(judged));
}

{
  const page = [
    "Text.",
    "<!-- test: A.One, compile NoWin64 -->",
    "> [!WARNING]",
    "> Wrong.",
    "",
    "> [!NOTE]",
    "> Unmarked.",
    "",
    "```md",
    "> [!NOTE]",
    "```",
    "  <!-- test: none -- needs a person at the dialog -->",
    "  > [!NOTE]",
    "",
    "<!-- test: B.Two -->",
    "A paragraph the case checks.",
    "",
    "> [!NOTE]",
    "> Inside the region.",
    "<!-- /test -->",
  ].join("\n");
  const { callouts: c, markers: mk, problems } = markersOf(page);
  check("a callout in a fence is not a callout", c.length === 4, JSON.stringify(c));
  check(
    "a marker on the line above a callout is read, item by item, and marks it",
    c[0]?.kind === "WARNING" &&
      c[0].marked &&
      JSON.stringify(mk[0]?.items) === JSON.stringify([{ case: "A.One" }, { compile: "NoWin64" }]),
    JSON.stringify([c[0], mk[0]]),
  );
  check(
    "a callout with no marker above and no region around it is not marked",
    c[1]?.marked === false,
    JSON.stringify(c[1]),
  );
  check(
    "an indented callout and its marker are read, and none keeps its reason",
    c[2]?.marked && mk[1]?.items?.[0]?.none === "needs a person at the dialog",
    JSON.stringify([c[2], mk[1]]),
  );
  check(
    "a marker above a paragraph opens a region, which marks a callout inside it and closes cleanly",
    c[3]?.marked && JSON.stringify(mk[2]?.items) === JSON.stringify([{ case: "B.Two" }]) && problems.length === 0,
    JSON.stringify({ c3: c[3], mk2: mk[2], problems }),
  );
  const bad = markersOf(
    [
      "<!-- test: A.B -->",
      "Text.",
      "<!-- test: A.C -->",
      "More.",
      "<!-- /test -->",
      "<!-- /test -->",
      "<!-- test: A.D -->",
      "Open.",
    ].join("\n"),
  ).problems;
  check(
    "a region inside a region, a close with no region and a region left open are each reported",
    bad.length === 3 &&
      bad.some((p) => p.includes("inside")) &&
      bad.some((p) => p.includes("closes no")) &&
      bad.some((p) => p.includes("not closed")),
    bad.join("\n"),
  );
  check(
    "an item the marker grammar does not know is bad, and none without a reason is bad",
    parseMarker("A.B, whatever")[1].bad === "whatever" &&
      parseMarker("none").length === 1 &&
      !!parseMarker("none")[0].bad,
    JSON.stringify([parseMarker("A.B, whatever"), parseMarker("none")]),
  );
}

{
  const expect = {
    cases: {
      "F.Hangs": { hangs: true },
      "F.Fails": { fails: "1 of 1 checks failed: x: expected 1, got 2" },
      "F.Only64": { win32: "pass", win64: { fails: "boom" } },
    },
  };
  const text = runAllText({
    pkg: "Pkg",
    version: "1.2.3.4",
    tests: [
      { fixture: "F", name: "Passes" },
      { fixture: "F", name: "Hangs" },
    ],
    expect,
  });
  check(
    "RunAll calls a case and judges what it left, and skips one that never returns",
    text.includes('        F.Passes\n        Expect.EndCase "F.Passes", Err.Number, Err.Description') &&
      text.includes('Expect.Skip "F.Hangs", "it does not return in version 1.2.3.4"') &&
      !text.includes("        F.Hangs\n"),
    text,
  );
  check(
    "expect.json: an unnamed case passes, an entry may differ by architecture",
    expectationFor(expect, "F.Passes", "win32").kind === "pass" &&
      expectationFor(expect, "F.Only64", "win32").kind === "pass" &&
      expectationFor(expect, "F.Only64", "win64").detail === "boom",
  );
  const assertion = outcomeOf({
    pass: false,
    detail: "ASSERTION FAILED: 1 of 1 checks failed: x: expected 1, got 2 (line 12)",
  });
  check(
    "a failure is judged without its line and the assertion prefix",
    judge(expectationFor(expect, "F.Fails", "win32"), assertion) === "documented",
    JSON.stringify(assertion),
  );
  check(
    "a case expected to fail that passes is fixed; one that fails otherwise is changed",
    judge(expectationFor(expect, "F.Fails", "win32"), { kind: "pass", detail: "" }) === "fixed" &&
      judge(expectationFor(expect, "F.Fails", "win32"), { kind: "fail", detail: "other" }) === "changed" &&
      judge(
        { kind: "pass", detail: "" },
        outcomeOf({ pass: false, detail: "no answer from the compiler after 20 s" }),
      ) === "changed",
  );
  const next = expectFrom({
    version: "1.2.3.4",
    names: ["F.Passes", "F.Only64"],
    outcomes: new Map([
      ["F.Passes", { win32: { kind: "pass" }, win64: { kind: "pass" } }],
      ["F.Only64", { win32: { kind: "pass" } }],
    ]),
    previous: expect,
  });
  check(
    "expect.json from a run of one architecture keeps the other's entry, and leaves out a case that passes",
    JSON.stringify(next) ===
      JSON.stringify({ version: "1.2.3.4", cases: { "F.Only64": { win32: "pass", win64: { fails: "boom" } } } }),
    JSON.stringify(next),
  );
  const files = [
    {
      name: "F.twin",
      text: "[TestFixture]\nModule F\n[TestCase]\nSub Good()\n  Expect.Begin\n  x = 1\n  Expect.Done ' end\nEnd Sub\n[TestCase]\nSub Bad()\n  x = 1\nEnd Sub\nEnd Module\n",
    },
  ];
  const bad = malformedCases(files, projectCases(files).tests);
  check(
    "a case that does not start with Expect.Begin and end with Expect.Done is reported, a comment after Done is not",
    bad.length === 2 && bad.every((b) => b.includes("F.Bad")),
    bad.join("\n"),
  );
}

// ---------------------------------------------------------------- the corpus

const problems = [];
const allPages = await markdownFiles(SECTIONS);
const sections = allPages.filter((rel) => /^[^/]+\/index\.md$/.test(rel)).map((rel) => rel.split("/")[0]);
const projects = packageTestNames(ROOT);

for (const name of projects) {
  if (!sections.includes(name))
    problems.push(`test/package-tests/${name}: no section docs/Reference/Contributed/${name}/`);
}
if (existsSync(path.join(ROOT, EXPECT_FILE)) === false) problems.push(`test/package-tests/${EXPECT_FILE} is missing`);

let covered = 0;
for (const pkg of sections) {
  const has = projects.includes(pkg);
  if (PENDING.has(pkg)) {
    if (has) problems.push(`${pkg} has a test project: remove it from PENDING in scripts/check_package_tests.mjs`);
    continue;
  }
  if (!has) {
    problems.push(`${pkg}: no test project under test/package-tests/${pkg}/, and not in PENDING`);
    continue;
  }
  covered++;
  problems.push(...checkPackage(pkg).map((p) => `${pkg}: ${p}`));
}
for (const name of PENDING) {
  if (!sections.includes(name)) problems.push(`PENDING names ${name}, which has no section`);
}

check(
  `every contributed section's callouts name their cases (${covered} with a test project, ${PENDING.size} pending)`,
  problems.length === 0,
  problems.join("\n"),
);

process.exit(report());

// ---------------------------------------------------------------- one package

function checkPackage(pkg) {
  const out = [];
  const dir = path.join(ROOT, pkg);
  const landing = readFileSync(path.join(SECTIONS, pkg, "index.md"), "utf8");
  const indexedFrom = String(parseFrontmatter(landing).data?.indexed_from ?? "");
  let version;
  try {
    version = packageVersion(templateSettings(TEMPLATES, pkg), pkg);
  } catch (e) {
    return [e.message];
  }
  if (version !== indexedFrom)
    out.push(`the sample template references ${version}, the section documents ${indexedFrom}`);

  if (existsSync(path.join(dir, "Sources", EXPECT_FILE)))
    out.push(`Sources/${EXPECT_FILE} is a copy: the shared one is used`);
  const files = testSources(ROOT, pkg);
  const { tests, compiles: own, problems: callable } = projectCases(files);
  out.push(...callable, ...malformedCases(files, tests));
  const compileProject = projectCases(compileSources(ROOT, pkg));
  out.push(...compileProject.problems.map((p) => `${COMPILE_DIR}/: ${p}`));
  if (compileProject.tests.length) out.push(`${COMPILE_DIR}/ holds a [TestCase]: it holds compile cases only`);
  const compiles = [...own, ...compileProject.compiles];
  for (const c of compileProject.compiles)
    if (own.some((x) => x.name === c.name)) out.push(`two compile cases are named ${c.name}`);

  const expectFile = path.join(dir, EXPECT_JSON);
  let expect = { cases: {} };
  if (!existsSync(expectFile)) out.push(`${EXPECT_JSON} is missing`);
  else {
    try {
      expect = JSON.parse(readFileSync(expectFile, "utf8"));
    } catch (e) {
      out.push(`${EXPECT_JSON}: ${e.message}`);
    }
    if (expect.version !== version)
      out.push(`${EXPECT_JSON} is for version ${expect.version}, the section documents ${version}`);
    if (
      expect.arches !== undefined &&
      (!Array.isArray(expect.arches) ||
        !expect.arches.length ||
        expect.arches.some((a) => !["win32", "win64"].includes(a)))
    )
      out.push(`${EXPECT_JSON}: arches is a non-empty list of win32 and win64, or absent for both`);
  }
  const caseNames = new Set([...tests.map((t) => `${t.fixture}.${t.name}`), ...compiles.map((c) => c.name)]);
  for (const name of Object.keys(expect.cases ?? {})) {
    if (!caseNames.has(name)) out.push(`${EXPECT_JSON} names ${name}, which is not a case`);
    try {
      expectationFor(expect, name, "win32");
      expectationFor(expect, name, "win64");
    } catch (e) {
      out.push(e.message);
    }
  }

  const runAll = files.find((f) => f.name === RUNALL_FILE)?.text ?? null;
  if (runAll !== runAllText({ pkg, version, tests, expect })) {
    out.push(
      `Sources/${RUNALL_FILE} is ${runAll === null ? "missing" : "out of date"}: run node scripts/package_tests.mjs ${pkg}`,
    );
  }

  const named = new Set();
  const hasProbe = existsSync(path.join(dir, "probe"));
  for (const rel of sectionPages(pkg)) {
    const text = readFileSync(path.join(SECTIONS, pkg, rel), "utf8");
    const { callouts, markers, problems: regionProblems } = markersOf(text);
    out.push(...regionProblems.map((p) => `${rel} ${p}`));
    for (const c of callouts) {
      if (!c.marked)
        out.push(
          `${rel} line ${c.line}: the ${c.kind} has no <!-- test: ... --> marker on the line above, nor a region around it`,
        );
    }
    for (const mk of markers) {
      const where = `${rel} line ${mk.line}`;
      if (!mk.items.length) out.push(`${where}: the marker names nothing`);
      for (const item of mk.items) {
        if (item.bad)
          out.push(
            `${where}: the marker's item "${item.bad}" is not Fixture.Sub, compile <Name>, probe <id> or none -- <reason>`,
          );
        else if (item.case && !tests.some((t) => `${t.fixture}.${t.name}` === item.case))
          out.push(`${where}: no [TestCase] ${item.case}`);
        else if (item.compile && !compiles.some((x) => x.name === item.compile))
          out.push(`${where}: no compile case ${item.compile}`);
        else if (item.probe && !hasProbe)
          out.push(`${where}: names probe ${item.probe}, and the project has no probe/ folder`);
        if (item.case) named.add(item.case);
        if (item.compile) named.add(item.compile);
      }
    }
  }
  for (const name of caseNames) if (!named.has(name)) out.push(`the case ${name} is named by no marker of the section`);
  return out;
}

// The section's pages, relative to its folder.
function sectionPages(pkg) {
  const prefix = `${pkg}/`;
  return allPages.filter((rel) => rel.startsWith(prefix)).map((rel) => rel.slice(prefix.length));
}
