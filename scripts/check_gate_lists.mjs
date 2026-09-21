#!/usr/bin/env node
// Verify that check.bat and test.bat still match Tools.md's two gate lists,
// and that no developer page states a gate count that disagrees with them.
//
//     node scripts/check_gate_lists.mjs
//     node scripts/check_gate_lists.mjs --verbose
//     node scripts/check_gate_lists.mjs --self-test
//
// ---------------------------------------------------------------- why
//
// This gate exists because the thing it checks has now rotted three times, and
// the last two were a fix decaying rather than a fresh mistake.
//
// Round 2 of the use-case evaluation found `test.bat` documented as three
// gates when it had four. That was fixed in Tools.md. Building.md's parallel
// copy of the same sentence was not touched, a fifth gate landed, and round 3
// found Building.md naming three of five -- and asserting, as the stated
// reason for skipping test.bat on a docs-only edit, that "none of them reads a
// page of documentation". check_code_regions.mjs reads all 906 of them. The
// same round found Extending.md -- the page written to guide adding a gate --
// claiming check.bat runs six, listing two test.bat gates among them, and
// never mentioning test.bat at all.
//
// Six wrong numbers and two wrong lists across three pages, none of which
// broke a link, failed a gate, or read any differently from a right one. That
// is the same argument `{{tbdocs:...}}` already won for page counts, and the
// remedy here is the same in spirit: stop asserting by hand what can be
// derived from the artifact.
//
// -------------------------------------------------------------- the design
//
// **One page owns the lists and the others cite it.** Tools.md carries the two
// numbered lists; Building.md and Extending.md link to its entries instead of
// restating them.
//
// **That convention is not self-enforcing, and the first version of this gate
// assumed it was.** Its header used to end "if a third page starts restating
// them, this gate will not notice -- which is the argument for not letting
// one." Building.md was already that third page and README.md a fourth, both
// wrong, in the same commit that shipped the gate green. Round 4 found three
// evaluators tripping over one of them independently. A gate scoped to one
// page is a guard against one file, not against a class -- so the prose sweep
// below reads README.md and every page under docs/Documentation/ and checks
// every gate count they state, wherever it is stated.
//
// **The batch file is the source of truth, not the documentation.** A gate
// that compared the two pages against each other would be satisfied by two
// pages that agree and are both wrong.
//
// **It checks order as well as membership.** Both wrappers document their
// steps as numbered lists with a stated reason for the order (cheapest first,
// so a five-second failure does not wait on a twenty-second scan), so a
// reordering that the prose no longer matches is a real defect.
//
// ------------------------------------------------- what the sweep does not see
//
// Stated plainly, because a gate whose limits are not written down gets read
// as covering more than it does.
//
// **An ordinal.** "check_code_regions.mjs is the fifth" sat two paragraphs
// from "Five gates" and is not reported; a rule for ordinals would have to
// decide whether "the fifth of six" is wrong, and it usually is not. In
// practice the section total above it fires and a reader fixing that one is
// looking straight at this one.
//
// **A count in a wrapper section that is a subset claim.** Only the *first*
// bare `N gates` in a wrapper's own section is read as its total, because
// later ones ("two of them read docs/") are legitimate. The cost is the other
// way round: a section that opens with a subset claim is reported. That is
// deliberate rather than tolerated -- the remedy is to delete the number, and
// the failure message says so, because a subset count restated in prose is
// the same thing that drifted three times.
//
// **Anything outside README.md and docs/Documentation/.** builder/*.md are
// design notes and frozen audit snapshots, and rewriting one to match a later
// change destroys the only thing it is for.
//
// Exit codes: 0 clean, 1 a list or a stated count disagrees, 2 the gate could
// not run.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TOOLS_MD = "docs/Documentation/Tools.md";

// The wrappers this gate covers, and the heading each one is documented under.
// book.bat and build.bat are deliberately absent: neither runs a list of gates,
// so there is nothing here to drift.
const WRAPPERS = [
  { bat: "check.bat", heading: "### check.bat" },
  { bat: "test.bat", heading: "### test.bat" },
];

// Tools.md spells step counts as words, which is house style for a small
// number in prose. Only as far as we could plausibly grow.
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/**
 * The gate scripts a batch file invokes, in order.
 *
 * Matches a `node scripts/<name>.mjs` invocation at the start of a line. The
 * wrappers chain with `@if errorlevel`, not `&&`, so one invocation per line
 * holds -- and a continuation or a commented line (`@rem`, `rem`) must not
 * count, which anchoring at the line start gives for free.
 */
function gatesFromBat(src) {
  const out = [];
  for (const line of src.split(/\r?\n/)) {
    const m = /^\s*(?:@)?node\s+scripts[\\/]([A-Za-z0-9_]+\.mjs)/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/** The body of a `### <name>` section: up to the next heading of any level. */
function sectionBody(md, heading) {
  const lines = md.split(/\r?\n/);
    const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,6}\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * The gate scripts a documented numbered list names, in order.
 *
 * Deliberately narrow: an ordered-list item whose text opens with a link to
 * `scripts/<name>.mjs`. Prose elsewhere in the section may mention a script
 * without being a claim about the list -- Tools.md's check.bat entry names
 * test.bat in its opening paragraph, and that is a cross-reference, not a step.
 */
function gatesFromDoc(body) {
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^\s*\d+\.\s+\[`scripts[\\/]([A-Za-z0-9_]+\.mjs)/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/**
 * Every multi-command run of gate scripts spelled out anywhere in the
 * developer documentation, as {file, line, gates}.
 *
 * Tools.md's numbered lists are one way to restate a wrapper; a command block
 * is the other, and Building.md has two of them for a good reason -- they are
 * the POSIX equivalents of the `.bat` files, which is the whole point of that
 * section. So they are checked rather than forbidden.
 *
 * **`&&` is what makes a run a claim about a wrapper**, and requiring it is
 * not a detail. Consecutive `node scripts/...` lines are far more often a
 * list of a single script's usage forms -- `check_links_diff.mjs` has three
 * such blocks, `impexp.mjs` another -- and reading those as a wrapper
 * sequence produced eight false findings on the first run. A wrapper's POSIX
 * equivalent is a single shell command chained with `&&`, so every line after
 * the first begins with it; a usage block never does.
 */
function commandRuns(src, file) {
  const runs = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.gates.length > 1 && cur.chained) runs.push(cur);
    cur = null;
  };
  src.split(/\r?\n/).forEach((line, i) => {
    const m = /^\s*(&&\s*)?node\s+scripts[\\/]([A-Za-z0-9_]+\.mjs)/.exec(line);
    if (!m) { flush(); return; }
    if (!cur) cur = { file, line: i + 1, gates: [], chained: true };
    else if (!m[1]) cur.chained = false;
    cur.gates.push(m[2]);
  });
  flush();
  return runs;
}

/** The count a section claims in prose, as a number, or null if it makes none. */
function statedCount(body) {
  // `steps?` because a one-gate wrapper would correctly write "One step".
  const m = new RegExp(`\\b(${NUMBER_WORDS.join("|")})\\s+steps?\\b`, "i").exec(body);
  return m ? NUMBER_WORDS.indexOf(m[1].toLowerCase()) : null;
}

// ------------------------------------------------------- the prose sweep
//
// Everything above reads Tools.md's two numbered lists. Everything below
// reads what the other developer pages *say* about those lists, because that
// is where the drift actually went both times it recurred.
//
// Four shapes, and each one is a site the round-4 review found wrong:
//
//   possessive     "two of `check.bat`'s four steps"
//   verb           "`test.bat` is six more"    "`check.bat` runs six further gates"
//   line-initial   "check.bat     # six more gates"    "| `check.bat` | four scripts |"
//   section total  a wrapper's own section opening "Five gates that ..."
//
// The fourth is the one a per-line scan cannot see, and it is the one that
// went wrong most often: `Building.md` states the count in a section whose
// only mention of the wrapper is the command line under the heading. So the
// sweep is per section, and a section's subject wrapper is the one named in
// its heading or on the command line directly beneath it.

const NUM = `(?:${NUMBER_WORDS.join("|")}|\\d+)`;
const WRAP = "`?(check|test)\\.bat`?";
// Deliberately not `checks?`: "two implementations of one check" is ordinary
// English about the link checker and appears twice in the corpus.
const NOUN = "(?:gates?|steps?|scripts?)";
const QUAL = "(?:more|further|other|separate|cheaper|local|remaining)\\s+";
// "`test.bat` is six more" names no noun at all, and that sentence is one of
// the seven sites. Where the wrapper is already named, a bare qualifier is
// enough; BARE below is not given the same latitude, because "one more is
// worth knowing about" is ordinary prose.
const TAIL = `(?:(?:${QUAL})?${NOUN}|more\\b|further\\b)`;

const POSSESSIVE = new RegExp(`${WRAP}'s\\s+(?:own\\s+)?(${NUM})\\b`, "gi");
// An explicit verb, not proximity. `Tools.md` narrates the defects this gate
// exists for -- "found `test.bat` documented as three gates when it had four"
// -- and a proximity rule reports that true sentence as a false one.
const VERBAL = new RegExp(`${WRAP}\\s+(?:is|are|runs?|has|have|adds)\\s+(${NUM})\\s+${TAIL}`, "gi");
// Line-initial, so a table cell or a command comment counts and a mention in
// the middle of a paragraph does not.
//
// Two steps rather than one regex, and that is not a style choice. Written as
// `^...WRAP\b[^\n]{0,80}?\b(NUM)\s+TAIL` it is what recheck calls polynomial
// degree 3: the lazy gap and the count can divide the same text. Nothing in
// this file is a regex *literal*, so check_regex_safety.mjs cannot see it --
// its documented blind spot -- and a gate that goes quadratic-and-worse on a
// long table row is exactly the shape that file exists to refuse. Anchoring
// the wrapper first and searching a bounded slice of what follows leaves no
// division to try.
// One character class rather than `^[ \t]*(?:\|[ \t]*)?`, which recheck rates
// polynomial degree 2 -- two groups that can each consume the same leading
// space. Nothing here needs to tell an indent from a table pipe.
const LINE_HEAD = new RegExp(`^[ \\t|]*${WRAP}\\b`, "i");
const COUNT_ON_LINE = new RegExp(`\\b(${NUM})\\s+${TAIL}`, "gi");
const LINE_WINDOW = 80;
const BARE = new RegExp(`\\b(${NUM})\\s+(?:${QUAL})?${NOUN}\\b`, "gi");
const ANAPHORA = new RegExp(`\\bof the\\s+(${NUM})\\b`, "gi");

const asNumber = (w) => {
  const i = NUMBER_WORDS.indexOf(String(w).toLowerCase());
  return i === -1 ? Number(w) : i;
};

/** Split markdown into sections: a heading and everything up to the next one. */
function splitSections(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let cur = { heading: "(top of file)", start: 1, lines: [] };
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      out.push(cur);
      cur = { heading: lines[i].trim(), start: i + 1, lines: [] };
    }
    cur.lines.push(lines[i]);
  }
  out.push(cur);
  return out;
}

/**
 * The wrapper a section is *about*, or null.
 *
 * Its heading (`### check.bat`), else the first command line under it -- which
 * is how Building.md marks its wrapper sections, and the reason a per-line
 * scan of that file finds nothing.
 */
function subjectWrapper(sec) {
  const h = /\b(check|test)\.bat\b/.exec(sec.heading);
  if (h) return h[1];
  for (const line of sec.lines.slice(1)) {
    if (!line.trim()) continue;
    // A kramdown attribute block (`{: #tests-of-the-toolchain }`) sits between
    // the heading and the command under it. Skipping it is not a detail: that
    // one line is what stopped this rule seeing Building.md's own section, and
    // Building.md's own section is the defect the rule was written for.
    if (/^\{:/.test(line.trim())) continue;
    if (!/^(?: {4}|\t|```|~~~)/.test(line)) return null;   // prose, not a command
    const m = /^[ \t`~]*(check|test)\.bat\b/.exec(line);
    if (m) return m[1];
    if (!/^(?:```|~~~)/.test(line)) return null;
  }
  return null;
}

/**
 * Every gate count a page states, as {file, line, wrapper, count, quote}.
 *
 * @param {string} src   the page
 * @param {string} file  its repo-relative path, for the report
 */
function proseClaims(src, file) {
  const claims = [];
  const at = (sec, body, idx) => sec.start + body.slice(0, idx).split("\n").length - 1;
  const push = (sec, body, m, wrapper, raw, rule) => claims.push({
    file, line: at(sec, body, m.index), wrapper: `${wrapper}.bat`,
    count: asNumber(raw), quote: m[0].trim().replace(/\s+/g, " ").slice(0, 80), rule,
  });

  for (const sec of splitSections(src)) {
    const body = sec.lines.join("\n");
    for (const m of body.matchAll(POSSESSIVE)) push(sec, body, m, m[1], m[2], "possessive");
    for (const m of body.matchAll(VERBAL))     push(sec, body, m, m[1], m[2], "verb");

    sec.lines.forEach((line, i) => {
      const head = LINE_HEAD.exec(line);
      if (!head) return;
      const rest = line.slice(head[0].length, head[0].length + LINE_WINDOW);
      for (const m of rest.matchAll(COUNT_ON_LINE)) {
        claims.push({
          file, line: sec.start + i, wrapper: `${head[1]}.bat`, count: asNumber(m[1]),
          quote: line.trim().replace(/\s+/g, " ").slice(0, 80), rule: "line",
        });
      }
    });

    const subject = subjectWrapper(sec);
    if (!subject) continue;

    // Only the FIRST bare count in a wrapper's own section is read as that
    // wrapper's total. Later ones are subset claims -- "two of them read
    // docs/", "why one gate does read your pages" -- and both are legitimate
    // sentences the wrapper sections actually contain.
    const [total] = [...body.matchAll(BARE)];
    if (!total) continue;
    push(sec, body, total, subject, total[1], "section total");

    // "Four of the five cannot be affected", "Another of the five" -- a
    // back-reference to the total just stated, and the shape a grep for
    // "five gates" misses. Only counted when it matches that total, so
    // "the first of the three" elsewhere is not a claim about a wrapper.
    for (const m of body.matchAll(ANAPHORA)) {
      if (asNumber(m[1]) !== asNumber(total[1])) continue;
      push(sec, body, m, subject, m[1], "back-reference");
    }
  }

  // The rules overlap by design; report one finding per site.
  const seen = new Set();
  return claims.filter((c) => {
    const key = `${c.line}:${c.wrapper}:${c.count}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Findings for one page, given the real gate counts. */
function proseFindings(src, file, counts) {
  const out = [];
  for (const c of proseClaims(src, file)) {
    const actual = counts.get(c.wrapper);
    if (actual === undefined || c.count === actual) continue;
    out.push(
      `${c.file}:${c.line}: says ${c.wrapper} runs ${c.count}; it runs ${actual}.\n` +
      `    ${c.rule}: "${c.quote}"`,
    );
  }
  return out;
}

/**
 * Compare one wrapper against its documentation.
 * @returns {string[]} findings, empty when they agree
 */
function compareWrapper({ bat, heading }, batSrc, toolsMd) {
  const actual = gatesFromBat(batSrc);
  const findings = [];

  if (actual.length === 0) {
    return [`${bat}: no \`node scripts/*.mjs\` invocation found -- has the wrapper's shape changed?`];
  }

  const body = sectionBody(toolsMd, heading);
  if (body === null) {
    return [`${TOOLS_MD}: no \`${heading}\` section -- the gate lists have no documented home.`];
  }

  const documented = gatesFromDoc(body);
  if (documented.join("\0") !== actual.join("\0")) {
    findings.push(
      `${bat}: documented list does not match the wrapper.\n` +
      `    ${bat}   : ${actual.join(", ")}\n` +
      `    ${TOOLS_MD}: ${documented.join(", ") || "(none found)"}`,
    );
  }

  // A stated count that disagrees with its own list is the exact shape round 3
  // found three times, so it is worth reporting separately from the membership
  // failure -- the two have different fixes.
  const stated = statedCount(body);
  if (stated === null) {
    findings.push(
      `${bat}: the \`${heading}\` section states no step count. ` +
      `It should, so that this gate can check it.`,
    );
  } else if (stated !== actual.length) {
    findings.push(
      `${bat}: documented as "${NUMBER_WORDS[stated]} steps", but the wrapper runs ${actual.length}.`,
    );
  }

  return findings;
}

// ------------------------------------------------------------- self-test
//
// The probes ride along in the normal run rather than hiding behind a flag,
// for the reason this repository keeps relearning: on a healthy tree a gate
// that has stopped detecting prints exactly what a working one prints. Each
// probe is a defect that actually shipped.

const PROBES = [
  {
    name: "a wrapper gaining a gate the docs do not list",
    bat: "node scripts/a.mjs\nnode scripts/b.mjs\n",
    doc: "### x.bat\n\nOne step:\n\n1. [`scripts/a.mjs`](#a) --- does a thing.\n\n### next\n",
  },
  {
    name: "the docs naming a gate the wrapper does not run",
    bat: "node scripts/a.mjs\n",
    doc: "### x.bat\n\nTwo steps:\n\n1. [`scripts/a.mjs`](#a) --- a.\n2. [`scripts/zz.mjs`](#zz) --- not run.\n\n### next\n",
  },
  {
    name: "a reordering the prose no longer matches",
    bat: "node scripts/b.mjs\nnode scripts/a.mjs\n",
    doc: "### x.bat\n\nTwo steps:\n\n1. [`scripts/a.mjs`](#a) --- a.\n2. [`scripts/b.mjs`](#b) --- b.\n\n### next\n",
  },
  {
    // Building.md's real defect: the right scripts, the wrong number.
    name: "a stated count that disagrees with its own list",
    bat: "node scripts/a.mjs\nnode scripts/b.mjs\n",
    doc: "### x.bat\n\nThree steps:\n\n1. [`scripts/a.mjs`](#a) --- a.\n2. [`scripts/b.mjs`](#b) --- b.\n\n### next\n",
  },
  {
    name: "a section that states no count at all",
    bat: "node scripts/a.mjs\n",
    doc: "### x.bat\n\nIt runs:\n\n1. [`scripts/a.mjs`](#a) --- a.\n\n### next\n",
  },
];

// Must NOT fire: a section whose prose mentions another wrapper's gate outside
// the numbered list, which is what Tools.md's real entries do.
const NEGATIVE = {
  name: "a cross-reference in prose is not a step",
  bat: "node scripts/a.mjs\n",
  doc: "### x.bat\n\nTests of the toolchain are [`scripts/zz.mjs`](#zz), not these. One step:\n\n" +
       "1. [`scripts/a.mjs`](#a) --- a.\n\n### next\n",
};

// Probes for the prose sweep. Every positive is a sentence that was on a
// published page at 4f97bac, against the counts that were true at the time
// (check.bat four, test.bat six).
const REAL_COUNTS = new Map([["check.bat", 4], ["test.bat", 6]]);

const PROSE_PROBES = [
  {
    name: "README's command block understating check.bat",
    md: "## Building the site\n\n```\nnpm ci        # once\ncheck.bat     # six more gates, from the publish allowlist to the accessibility scan\n```\n",
  },
  {
    name: "a table row restating a wrapper's step count",
    md: "| Wrapper | Runs |\n|---|---|\n| `check.bat` | six scripts in a fixed order, below |\n",
  },
  {
    name: "a wrapper named with an explicit verb",
    md: "`test.bat` is four more, in the same cheapest-first order:\n",
  },
  {
    name: "a possessive count in another page's prose",
    md: "Chromium is needed for two of `check.bat`'s five steps and one of `test.bat`'s four.\n",
  },
  {
    // Building.md:248 exactly. No line in this section names the wrapper
    // except the command under the heading, which is why a per-line grep
    // found four of seven sites and called the sweep thorough.
    name: "a section total stated under a bare heading",
    md: "## Tests of the toolchain\n\n    test.bat\n\nFive gates that test the build system rather than the site.\n",
  },
  {
    name: "a back-reference to a wrong total",
    md: "## Tests of the toolchain\n\n    test.bat\n\nSeven gates test the build system.\n\nFour of the seven cannot be affected by an edit confined to `docs/`.\n",
  },
  {
    name: "a count in the sub-page list of an index page",
    md: "`build.bat` produces three output trees; `check.bat` runs six further gates, from the publish allowlist to the accessibility scan.\n",
  },
];

const PROSE_NEGATIVES = [
  {
    name: "a correct possessive is not a finding",
    md: "Chromium is needed for two of `check.bat`'s four steps and one of `test.bat`'s six.\n",
  },
  {
    // Tools.md narrates this gate's own history, including the numbers that
    // were wrong. A proximity rule reported the true sentence as a false one.
    name: "a past wrong number, quoted as history",
    md: "Round 2 found `test.bat` documented as three gates when it had four, and that was fixed here.\n",
  },
  {
    name: "a subset claim after a correct total",
    md: "## Tests of the toolchain\n\n    test.bat\n\nSix steps, each stopping the run if it fails.\n\nTwo gates do read `docs/`, and that is why one gate can fail on a content edit.\n",
  },
  {
    name: "a count in a section with no wrapper subject",
    md: "### scripts/check_a11y.mjs\n\n    node scripts/check_a11y.mjs\n\nThree cheaper gates run first and stop the run if they fail.\n",
  },
  {
    name: "a POSIX command block is not a count",
    md: "    node scripts/check_publish_policy.mjs \\\n      && node scripts/check_gate_lists.mjs\n",
  },
];

function selfTest() {
  const results = [];
  for (const p of PROBES) {
    const found = compareWrapper({ bat: "x.bat", heading: "### x.bat" }, p.bat, p.doc);
    results.push([found.length > 0, p.name]);
  }
  const neg = compareWrapper({ bat: "x.bat", heading: "### x.bat" }, NEGATIVE.bat, NEGATIVE.doc);
  results.push([neg.length === 0, NEGATIVE.name]);

  for (const p of PROSE_PROBES) {
    results.push([proseFindings(p.md, "<probe>", REAL_COUNTS).length > 0, `prose: ${p.name}`]);
  }
  for (const p of PROSE_NEGATIVES) {
    results.push([proseFindings(p.md, "<probe>", REAL_COUNTS).length === 0, `prose: ${p.name}`]);
  }
  return results;
}

// ------------------------------------------------------------------ main

async function main(argv) {
  const verbose = argv.includes("--verbose");
  const onlySelfTest = argv.includes("--self-test");

  const probes = selfTest();
  const probesFailed = probes.filter(([ok]) => !ok);
  for (const [ok, name] of probes) {
    if (!ok) console.error(`  FAIL  probe: ${name}`);
    else if (verbose || onlySelfTest) console.log(`  ok    probe: ${name}`);
  }
  if (!verbose && !onlySelfTest && !probesFailed.length) {
    console.log(`ok    ${probes.length} probes: a wrong gate list is detected`);
  }
  if (onlySelfTest) {
    console.log(
      probesFailed.length
        ? `check_gate_lists: ${probesFailed.length} of ${probes.length} probes failed`
        : `check_gate_lists: ${probes.length} probes, all pass`,
    );
    return probesFailed.length ? 1 : 0;
  }

  const toolsMd = await readFile(path.join(REPO, TOOLS_MD), "utf8");
  const findings = [];
  const wrapperGates = new Map();
  for (const w of WRAPPERS) {
    const batSrc = await readFile(path.join(REPO, w.bat), "utf8");
    wrapperGates.set(w.bat, gatesFromBat(batSrc));
    const found = compareWrapper(w, batSrc, toolsMd);
    findings.push(...found);
    if (verbose && !found.length) {
      console.log(`  ok    ${w.bat}: ${gatesFromBat(batSrc).join(", ")}`);
    }
  }

  // Command blocks and stated counts anywhere a developer page can carry
  // them. Building.md restates both wrappers as POSIX command blocks, which
  // is legitimate and is exactly the kind of second copy that drifted last
  // time; README.md is here because three of round 4's findings were on it
  // and nothing had ever read it.
  const docsDir = path.join(REPO, "docs/Documentation");
  const wanted = [...wrapperGates.values()].map((g) => g.join("\0"));
  const counts = new Map([...wrapperGates].map(([bat, g]) => [bat, g.length]));
  const rels = [
    "README.md",
    ...(await readdir(docsDir)).filter((n) => n.endsWith(".md"))
      .map((n) => `docs/Documentation/${n}`),
  ];
  let claimsSeen = 0;
  for (const rel of rels) {
    const src = await readFile(path.join(REPO, rel), "utf8");
    for (const run of commandRuns(src, rel)) {
      if (wanted.includes(run.gates.join("\0"))) {
        if (verbose) console.log(`  ok    ${rel}:${run.line}: matches a wrapper`);
        continue;
      }
      findings.push(
        `${rel}:${run.line}: a run of ${run.gates.length} gate scripts matches no wrapper.\n` +
        `    documented : ${run.gates.join(", ")}\n` +
        [...wrapperGates].map(([b, g]) => `    ${b.padEnd(11)}: ${g.join(", ")}`).join("\n"),
      );
    }
    for (const c of proseClaims(src, rel)) {
      claimsSeen++;
      if (verbose) console.log(`  ok    ${rel}:${c.line}: ${c.wrapper} = ${c.count} (${c.rule})`);
    }
    findings.push(...proseFindings(src, rel, counts));
  }

  for (const f of findings) console.error(`  FAIL  ${f}`);

  // Reported separately: a failed probe means this gate has stopped detecting,
  // which is a different problem from a documented list having drifted, and
  // printing "0 disagreements" beside a non-zero exit helps nobody.
  if (probesFailed.length) {
    console.error(
      `\ncheck_gate_lists: ${probesFailed.length} of ${probes.length} self-test probes failed.\n` +
      `  The gate itself is not detecting what it claims to; fix that before trusting a pass.`,
    );
    return 1;
  }
  if (findings.length) {
    console.error(
      `\ncheck_gate_lists: ${findings.length} disagreement(s) with the wrappers.\n` +
      `  ${TOOLS_MD} owns these lists; every other page cites it rather than restating it.\n` +
      `  Fix the list there -- and where a page states a count in prose, prefer deleting the\n` +
      `  number over correcting it. The command block or the linked list carries it already.`,
    );
    return 1;
  }

  console.log(
    `check_gate_lists: ${WRAPPERS.map((w) => `${w.bat} (${wrapperGates.get(w.bat).length})`).join(" + ")} ` +
    `match ${TOOLS_MD}; ${claimsSeen} stated count(s) across ${rels.length} pages agree -- clean`,
  );
  return 0;
}

main(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((err) => { console.error(err); process.exitCode = 2; });
