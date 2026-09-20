// Correctness gate for changes to the accessibility scan.
//
// axe is the correctness oracle for the site, which makes it a dangerous
// thing to optimise: a change can make axe see *less* and still report a
// clean pass.  This nearly happened once -- blocking just-the-docs.js during
// the scan looked like a 130 ms win and quietly dropped the colour-contrast
// node count on Select-Case from 54 to 2.
//
// So: run the full page x theme x viewport matrix twice, once under each of
// two named schemes (see SCHEMES in lib/axe-scan.mjs), and diff the results
// audit by audit.
//
//   * violations -- identical sorted `ruleId:nodeCount`
//   * incomplete -- identical sorted `ruleId` SET, node counts excluded
//
// The relaxation on `incomplete` is required, not sloppiness.  resultTypes
// truncates each excluded group's `nodes` to `[nodes[0]]` rather than dropping
// the group, so a ruleId:nodeCount fingerprint would read `:1` everywhere and
// silently stop discriminating.
//
// Both schemes run in ONE process against ONE build.  Comparing across a
// rebuild produces false diffs: the BuildInfo page embeds the build's own
// Gantt chart, so its SVG <text> nodes change every build and show up in the
// contrast results.
//
// KNOWN BLIND SPOT: this compares a candidate against a baseline produced by
// that same scheme's element set.  It cannot detect a change that stops
// auditing elements entirely -- a rule that never runs simply produces no
// entry.  Any change touching *which DOM is walked* (viewport, visibility,
// request blocking) has to be argued from source, not from this gate.  That is
// why PLAN-axe-perf.md strikes the viewport half of H4.
//
// Usage:
//   node scripts/check_a11y_fingerprint.mjs --candidate no-html
//   node scripts/check_a11y_fingerprint.mjs --baseline production --candidate config-only
//   node scripts/check_a11y_fingerprint.mjs --list
//
// Options:
//   --baseline SCHEME   default: production
//   --candidate SCHEME  default: production (a self-test; must always pass)
//   --root-dir DIR      default: docs/_site-offline
//   --theme / --viewport / --pages   narrow the matrix (for quick iteration;
//                                    a real gate run uses the full
//                                    SAMPLE_PAGES x 2 themes x 2 viewports)
//   --patches NAME,NAME apply source patches to the CANDIDATE bundle
//   --json FILE         write both fingerprint lists + the diff
//   --list              print the scheme registry and exit
//
// Git Bash on Windows rewrites a leading-slash argument into a Windows path,
// so `--pages /404.html` arrives as C:/Program Files/Git/404.html.  Prefix with
// MSYS_NO_PATHCONV=1, or use PowerShell / cmd, where it passes through intact.
//
// Requires `build.bat` to have produced an up-to-date _site-offline/.
// Exit codes: 0 identical, 1 fingerprints differ, 2 harness error.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_ROOT_DIR,
  SAMPLE_PAGES,
  SCHEMES,
  THEMES,
  VIEWPORTS,
  axeVersion,
  buildMatrix,
  fingerprint,
  getScheme,
  launchBrowser,
  newAuditPage,
  readAxeSource,
  runMatrix,
  SOURCE_PATCHES,
} from "./lib/axe-scan.mjs";

// ---- CLI ------------------------------------------------------------------
let baselineLabel = "production";
let candidateLabel = "production";
let rootDir = DEFAULT_ROOT_DIR;
let themeArg = "both";
let viewportArg = "both";
let pagesArg = null;
let jsonOut = null;
let unminified = false;
let patchesArg = "";

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--baseline" && args[i + 1]) baselineLabel = args[++i];
  else if (a === "--candidate" && args[i + 1]) candidateLabel = args[++i];
  else if (a === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (a === "--theme" && args[i + 1]) themeArg = args[++i];
  else if (a === "--viewport" && args[i + 1]) viewportArg = args[++i];
  else if (a === "--pages" && args[i + 1]) pagesArg = args[++i].split(",");
  else if (a === "--json" && args[i + 1]) jsonOut = args[++i];
  else if (a === "--unminified") unminified = true;
  else if (a === "--patches" && args[i + 1]) patchesArg = args[++i];
  else if (a === "--list") {
    console.log(`axe-core ${axeVersion()}\n`);
    console.log("patches:");
    for (const [label, p] of Object.entries(SOURCE_PATCHES)) {
      console.log(`  ${label.padEnd(24)} ${p.describe}`);
    }
    console.log("");
    console.log("schemes:");
    for (const label of Object.keys(SCHEMES)) {
      const s = getScheme(label);
      const flag = s.gates === false ? "  [does not gate]" : "";
      const p = s.patches.length ? `  (+${s.patches.join(", ")})` : "  (stock)";
      console.log(`  ${label.padEnd(20)} ${s.describe}${flag}${p}`);
    }
    process.exit(0);
  } else if (a === "-h" || a === "--help") {
    console.log(
      "usage: node scripts/check_a11y_fingerprint.mjs [--baseline SCHEME] " +
        "[--candidate SCHEME] [--root-dir DIR] [--theme T] [--viewport V] " +
        "[--pages P,P] [--json FILE] [--unminified] [--list]"
    );
    process.exit(0);
  } else {
    console.error(`unknown arg: ${a}`);
    process.exit(2);
  }
}

const baseline = getScheme(baselineLabel);
const candidate = getScheme(candidateLabel);
rootDir = resolve(rootDir);

const matrix = buildMatrix({
  pages: pagesArg ?? SAMPLE_PAGES,
  themes: themeArg === "both" ? THEMES : [themeArg],
  viewports: viewportArg === "both" ? Object.keys(VIEWPORTS) : [viewportArg],
});

// ---- Diff -----------------------------------------------------------------
// Fingerprints are opaque strings by design (cheap to compare, stable to
// sort).  When one differs, re-derive the structured difference from the raw
// results so the operator sees which rule moved rather than two long strings.

function violationCounts(results) {
  const m = new Map();
  for (const g of results.violations) m.set(g.id, g.nodes.length);
  return m;
}

function explainMismatch(base, cand) {
  const lines = [];

  const bv = violationCounts(base.results);
  const cv = violationCounts(cand.results);
  for (const id of new Set([...bv.keys(), ...cv.keys()].sort())) {
    const b = bv.get(id);
    const c = cv.get(id);
    if (b === c) continue;
    if (b === undefined) lines.push(`    violation ${id}: absent -> ${c} node(s)`);
    else if (c === undefined) lines.push(`    violation ${id}: ${b} node(s) -> absent`);
    else lines.push(`    violation ${id}: ${b} -> ${c} node(s)`);
  }

  const bi = new Set(base.results.incomplete.map((g) => g.id));
  const ci = new Set(cand.results.incomplete.map((g) => g.id));
  for (const id of [...bi].sort()) {
    if (!ci.has(id)) lines.push(`    incomplete ${id}: present -> absent`);
  }
  for (const id of [...ci].sort()) {
    if (!bi.has(id)) lines.push(`    incomplete ${id}: absent -> present`);
  }

  return lines;
}

// ---- Run ------------------------------------------------------------------
async function runScheme(page, scheme, axeSource) {
  const t0 = Date.now();
  const audits = await runMatrix(page, {
    rootDir,
    matrix,
    axeSource,
    configure: scheme.configure,
    runOptions: scheme.runOptions,
  });
  return { audits, wallMs: Date.now() - t0 };
}

async function main() {
  console.log(`axe-core ${axeVersion()}   root ${rootDir}`);
  console.log(`baseline   ${baseline.label}  -- ${baseline.describe}`);
  console.log(`candidate  ${candidate.label}  -- ${candidate.describe}`);
  if (candidate.gates === false) {
    console.log(
      `\n  NOTE: "${candidate.label}" is an ablation, not a landing candidate.\n` +
        `  It is expected to change the findings; the diff below is the point.`
    );
  }
  console.log(`matrix     ${matrix.length} audits\n`);

  // Two ways a patch reaches a side, and they answer different questions.
  //
  // With no --patches, each side runs ITS OWN scheme's patch list.  Every
  // scheme inherits DEFAULT_PATCHES, so the bundle is held fixed and the diff
  // isolates the config change -- and --baseline production --candidate
  // production is a genuine A/A over the bundle that ships.
  //
  // With --patches, the flag overrides both sides explicitly: stock on the
  // baseline, the named patches on the candidate.  That is the axe-upgrade
  // obligation -- does the patched bundle still see what the stock one sees --
  // and it would be a no-op if both sides kept their scheme's list.
  const patchIds = patchesArg
    ? patchesArg.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const basePatches = patchIds.length ? [] : baseline.patches;
  const candPatches = patchIds.length ? patchIds : candidate.patches;
  const sourceFor = (patches) =>
    readAxeSource({
      minified: !unminified && patches.length === 0,
      patches,
    });
  const baseSource = sourceFor(basePatches);
  const candSource =
    candPatches.join(",") === basePatches.join(",")
      ? baseSource
      : sourceFor(candPatches);
  if (patchIds.length) {
    console.log(`patches    ${patchIds.join(", ")}  (candidate side only)`);
  } else if (basePatches.length || candPatches.length) {
    console.log(
      `patches    baseline ${basePatches.join(", ") || "(stock)"}  ` +
        `candidate ${candPatches.join(", ") || "(stock)"}`
    );
  }
  const browser = await launchBrowser();
  const page = await newAuditPage(browser);

  let base, cand;
  try {
    process.stdout.write(`running baseline  ... `);
    base = await runScheme(page, baseline, baseSource);
    console.log(`${base.wallMs} ms`);

    process.stdout.write(`running candidate ... `);
    cand = await runScheme(page, candidate, candSource);
    console.log(`${cand.wallMs} ms`);
  } finally {
    await browser.close();
  }

  // Wall clock here is indicative only -- unpinned, single run, and the
  // schemes do not run under identical machine state.  perf/ab-axe.mjs is the
  // measurement tool; this number exists so an obviously-inert candidate is
  // visible without a second command.
  const delta = base.wallMs - cand.wallMs;
  const pct = ((delta / base.wallMs) * 100).toFixed(1);
  console.log(
    `\nwall clock ${base.wallMs} -> ${cand.wallMs} ms (${delta >= 0 ? "-" : "+"}${Math.abs(delta)} ms, ${pct} %)` +
      `  [indicative only -- unpinned single run; use perf/ab-axe.mjs to measure]`
  );

  const baseFps = base.audits.map(fingerprint);
  const candFps = cand.audits.map(fingerprint);

  let mismatches = 0;
  console.log("");
  for (let i = 0; i < baseFps.length; i++) {
    if (baseFps[i] === candFps[i]) continue;
    mismatches++;
    console.log(`  MISMATCH ${matrix[i].label}`);
    for (const line of explainMismatch(base.audits[i], cand.audits[i])) {
      console.log(line);
    }
  }

  if (jsonOut) {
    writeFileSync(
      resolve(jsonOut),
      JSON.stringify(
        {
          axeCore: axeVersion(),
          rootDir,
          baseline: { label: baseline.label, fingerprints: baseFps, wallMs: base.wallMs },
          candidate: { label: candidate.label, fingerprints: candFps, wallMs: cand.wallMs },
          mismatches,
        },
        null,
        2
      )
    );
    console.log(`\nwrote ${resolve(jsonOut)}`);
  }

  if (mismatches === 0) {
    console.log(`  ${matrix.length}/${matrix.length} audits identical -- gate PASSES`);
    process.exit(0);
  }
  console.log(
    `\n  ${mismatches}/${matrix.length} audits differ -- gate FAILS` +
      (candidate.gates === false ? " (expected for an ablation scheme)" : "")
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
