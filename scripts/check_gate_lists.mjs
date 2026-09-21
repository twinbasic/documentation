#!/usr/bin/env node
// Verify that Tools.md's two gate lists still match check.bat and test.bat.
//
//     node scripts/check_gate_lists.mjs
//     node scripts/check_gate_lists.mjs --verbose
//     node scripts/check_gate_lists.mjs --self-test
//
// ---------------------------------------------------------------- why
//
// This gate exists because the thing it checks has now rotted twice, and the
// second time was a fix decaying rather than a fresh mistake.
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
// **One page owns the lists and the others cite it.** That decision is what
// makes this gate cheap: it has one place to check rather than three, because
// Building.md and Extending.md now link to Tools.md's entries instead of
// restating them. If a third page starts restating them, this gate will not
// notice -- which is the argument for not letting it.
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
// Exit codes: 0 clean, 1 a list disagrees, 2 the gate could not run.

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

function selfTest() {
  const results = [];
  for (const p of PROBES) {
    const found = compareWrapper({ bat: "x.bat", heading: "### x.bat" }, p.bat, p.doc);
    results.push([found.length > 0, p.name]);
  }
  const neg = compareWrapper({ bat: "x.bat", heading: "### x.bat" }, NEGATIVE.bat, NEGATIVE.doc);
  results.push([neg.length === 0, NEGATIVE.name]);
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

  // Command blocks anywhere under docs/Documentation/. Building.md restates
  // both wrappers as POSIX command blocks, which is legitimate and is exactly
  // the kind of second copy that drifted last time.
  const docsDir = path.join(REPO, "docs/Documentation");
  const wanted = [...wrapperGates.values()].map((g) => g.join("\0"));
  for (const name of (await readdir(docsDir)).filter((n) => n.endsWith(".md"))) {
    const rel = `docs/Documentation/${name}`;
    const src = await readFile(path.join(docsDir, name), "utf8");
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
      `\ncheck_gate_lists: ${findings.length} disagreement(s) between the wrappers and ${TOOLS_MD}.\n` +
      `  ${TOOLS_MD} owns these lists; Building.md and Extending.md cite it rather than\n` +
      `  restating it. Fix the list there, and check nothing else grew a copy.`,
    );
    return 1;
  }

  console.log(
    `check_gate_lists: ${WRAPPERS.map((w) => w.bat).join(" + ")} match ${TOOLS_MD} -- clean`,
  );
  return 0;
}

main(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((err) => { console.error(err); process.exitCode = 2; });
