#!/usr/bin/env node
// Gate: every page's Errors section is what the run-time error data under errors/
// writes, and the data is in order.
//
//     node scripts/check_errors.mjs
//
// The data (errors/*.yml, its format in WIP.Errors.md) lists the cases that raise each
// error a documented procedure raises; scripts/errors.mjs run measures them in
// twinBASIC and VB6, and scripts/errors.mjs write writes each page's section between
// <!-- errors: ... --> and <!-- /errors -->. This gate needs neither runtime. It checks
// that:
//   * every data file and errors/messages.yml reads, with no unknown key, and every
//     error number the data names has its message;
//   * a row that differs from VB6 names its reproducer under bugs/, or says pending;
//   * every page the data names exists, in one data file only, and its section is
//     what write would make of it, or absent when the data gives it none;
//   * no page under docs/ has a section the data does not name.
// It starts with probes of the library on inputs of its own.
//
// Exit codes:
//   0  all pass
//   1  a probe or the corpus failed
//   2  the gate could not run: a refused command line, or a crash

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  caseAtLine,
  dataFiles,
  findSection,
  loadDataFile,
  loadMessages,
  pageLevel,
  pagePath,
  probeCases,
  probeModule,
  readData,
  readProbeOutput,
  renderSection,
  spliceSection,
} from "./lib/errors-data.mjs";
import { createProbes } from "./lib/gate-probes.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/check_errors.mjs [-h, --help]

Checks that every page's Errors section is what scripts/errors.mjs write makes
of the data under errors/, and that the data is in order. Needs no twinBASIC or
VB6; measuring the data is scripts/errors.mjs run.

  -h, --help  print this text and exit

Exit codes:
  0  all pass
  1  a probe or the corpus failed
  2  the gate could not run: a refused command line, or a crash`;

if (
  withUsageError(() =>
    parseCli(process.argv.slice(2), { options: { help: { type: "boolean", short: "h" } }, stopAt: ["help"] }),
  ).values.help
)
  printHelpAndExit(USAGE);

const { check, report } = createProbes(
  "check_errors",
  "run node scripts/errors.mjs write for a stale section; the data's format is in WIP.Errors.md",
);

// ------------------------------------------------------------------ probes

const data = (doc) => {
  const problems = [];
  const read = readData(yaml.load(doc), "probe.yml", problems);
  return { ...read, name: "probe.yml", problems };
};
const sample = data(`
beta: 1010
pages:
  A/B.md:
    rows:
      - error: 5
        when: "*x* is negative"
        cases: [F(-1), { decl: Dim X() As Long, run: "ReDim X(1)\\nX(2) = 1" }]
      - error: 9
        when: the index | is out
        vb6: 5
        bug: pending
        cases: [G(1)]
    quiet: [F(1)]
`);
const messages = new Map([
  [5, "Invalid procedure call or argument"],
  [9, "Subscript out of range"],
]);
check(
  "a sample reads with only the problem it has",
  sample.problems.length === 1 && /without \|/.test(sample.problems[0]),
  sample.problems.join("\n"),
);
check(
  "unknown keys, a missing when and vb6 without bug are refused",
  data(`
beta: 1
pages:
  A.md:
    rows:
      - { error: 5, cases: [x], vb6: 9, colour: red }
`).problems.length === 3,
);
check("a page with nothing to probe is refused", data("beta: 1\npages:\n  A.md: {}\n").problems.length === 1);

const page = sample.pages[0];
page.rows[1].when = "the index is out";
const section = renderSection(page, { name: "probe.yml", beta: 1010, messages, level: "###" });
check(
  "the section has the table and the VB6 note",
  section
    .join("\n")
    .includes(
      "| 5 (`&H5`), *Invalid procedure call or argument* | *x* is negative |\n| 9 (`&H9`), *Subscript out of range* | the index is out |\n\n> [!NOTE] BETA 1010\n> When the index is out, VB6 raises error 5 (`&H5`), *Invalid procedure call or argument*, instead.",
    ),
);
check("a page with only quiet cases gets no section", renderSection({ rows: [], quiet: [1] }, { messages }) === null);

const doc = "# T\n\ntext\n\n```tb\n### Example\n<!-- errors: x -->\n```\n\n### Example\n\ncode\n\n### See Also\n";
const added = spliceSection(doc, section);
check(
  "a new section goes before the Example heading, not one in a fence",
  added.indexOf("### Errors") < added.lastIndexOf("### Example") &&
    added.indexOf("### Errors") > added.indexOf("```\n\n"),
);
check("writing it again changes nothing", spliceSection(added, section) === added);
check("removing it gives the page back", spliceSection(added, null) === doc);
check("a marker in a fence is not one", findSection(doc).section === null);
check("CRLF stays CRLF", spliceSection(doc.replace(/\n/g, "\r\n"), section) === added.replace(/\n/g, "\r\n"));
check("an unclosed section is reported", findSection("<!-- errors: x -->\n### Errors\n").problems.length === 1);
check(
  "the level follows the page's Example heading",
  pageLevel(doc) === "###" && pageLevel("# T\n## See Also\n") === "##",
);

const cases = probeCases([sample], "tb");
const vb6Cases = probeCases([sample], "vb6");
check(
  "cases carry what each runtime expects",
  cases.map((c) => c.expect).join() === "5,5,9,0" && vb6Cases[2].expect === 5,
);
for (const dialect of ["tb", "vb6"]) {
  const mod = probeModule(cases, dialect);
  const lines = mod.text.split("\r\n");
  check(
    `${dialect}: each case's span is its own Sub`,
    mod.spans.every((s) => lines[s.from - 1] === `Private Sub C${s.id}()` && lines[s.to - 1] === "End Sub") &&
      caseAtLine(mod.spans, mod.spans[1].from + 3) === 2,
  );
}
const out = readProbeOutput(["case 1 5 Invalid procedure call or argument", "setup 2 9 x", "done"]);
check("probe output reads", out.done && out.seen.get(1).number === 5 && out.seen.get(2).setup);

// ------------------------------------------------------------------ the corpus

const { messages: known, problems: messageProblems } = loadMessages();
const files = dataFiles().map((n) => loadDataFile(n));
check("errors/ holds data", files.length > 0);
const problems = [...messageProblems, ...files.flatMap((f) => f.problems)];
const owner = new Map();
for (const f of files) {
  for (const p of f.pages) {
    if (owner.has(p.page)) problems.push(`${f.name}: ${p.page} is in ${owner.get(p.page)} too`);
    owner.set(p.page, f.name);
    for (const r of p.rows) {
      for (const n of [r.error, r.vb6]) {
        if (n !== undefined && n !== 0 && !known.has(n))
          problems.push(`${f.name}: ${p.page}: no message for ${n} in messages.yml`);
      }
      const slug = r.bug;
      if (
        slug &&
        slug !== "pending" &&
        ![
          ["bugs", slug],
          ["bugs", "filed", slug],
        ].some((s) => existsSync(path.join(REPO_ROOT, ...s)))
      ) {
        problems.push(`${f.name}: ${p.page}: no reproducer bugs/${slug}`);
      }
    }
  }
}
check("the data is in order", problems.length === 0, problems.join("\n"));

const stale = [];
for (const f of files) {
  for (const p of f.pages) {
    const file = pagePath(p.page);
    if (!existsSync(file)) {
      stale.push(`docs/${p.page}: no such page (${f.name})`);
      continue;
    }
    const text = readFileSync(file, "utf8");
    const marks = findSection(text).problems;
    if (marks.length) {
      stale.push(...marks.map((m) => `docs/${p.page}: ${m}`));
      continue;
    }
    const want = renderSection(p, { name: f.name, beta: f.beta, messages: known, level: pageLevel(text) });
    if (spliceSection(text, want) !== text) stale.push(`docs/${p.page}: the section is not what ${f.name} writes`);
  }
}
for (const rel of await markdownFiles(DOCS_DIR)) {
  if (owner.has(rel)) continue;
  const { section: at, problems: marks } = findSection(readFileSync(path.join(DOCS_DIR, rel), "utf8"));
  if (at || marks.length) stale.push(`docs/${rel}: an errors section that no data file names`);
}
check("every section is what the data writes", stale.length === 0, stale.join("\n"));

process.exit(report());
