// Automated accessibility check for the built site.
//
// Scans sample pages using puppeteer + axe-core against WCAG 2.0, 2.1 and
// 2.2 at Level A + AA, plus the heading-order best-practice rule.
//
// The sample is eleven pages out of ~1,160, so which eleven decides what this
// script can possibly report.  They are no longer chosen by hand: the list in
// lib/axe-scan.mjs is derived to cover every markup construct the site uses,
// and `scripts/pick_a11y_sample.mjs --check` fails check.bat when the site
// grows one the sample has no page for.  That guard exists because the previous
// hand-picked six covered none of the site's tables, images, disclosure widgets
// or video cards, and reported a clean pass while a full-site sweep found six
// violation classes on 54 pages.  See sweep_a11y.mjs for the survey that
// found them.
//
// Three details matter for the results to mean anything:
//
//   * The scan runs against docs/_site-offline, not docs/_site.  The online
//     tree references its assets with root-absolute URLs (/assets/css/...),
//     which resolve to nothing under file://, so every page loads unstyled
//     and every colour-contrast result is a meaningless black-on-white pass.
//     The offline tree uses relative asset paths and renders for real.
//
//   * Each page is scanned in both themes and at both a desktop and a phone
//     viewport.  Dark mode has its own palette (the dark-theme mixin in
//     just-the-docs-dark.scss / _sass/custom/_theme.scss, applied via
//     [data-theme=dark]), so a light-mode pass says nothing about it; and
//     defects such as horizontally scrolling code blocks only appear once the
//     layout is narrow enough to overflow.
//
//   * The search index is blocked during the scan (see BLOCKED_REQUESTS in
//     lib/axe-scan.mjs).  It is inert for auditing purposes but dominated the
//     run time.
//
// The page list, viewports, themes, blocked requests and axe run options all
// live in lib/axe-scan.mjs, shared with check_a11y_fingerprint.mjs (the
// correctness gate) and perf/ab-axe.mjs (the cost-attribution rig).  They have
// to stay in step or the gate stops gating what this script runs.
//
// The scan runs a PATCHED axe bundle -- see AXE_PATCHES below.
//
// Usage:  node scripts/check_a11y.mjs [--root-dir DIR] [--theme light|dark|both]
//                                     [--viewport desktop|mobile|both]
//                                     [--stock-axe]
//
// Requires `build.bat` to have produced an up-to-date _site-offline/.

import { resolve } from "node:path";
import {
  axeVersion,
  DEFAULT_ROOT_DIR,
  THEMES,
  VIEWPORTS,
  AXE_RUN_OPTIONS,
  SAMPLE_PAGES,
  buildMatrix,
  launchBrowser,
  newAuditPage,
  readAxeSource,
  runMatrix,
} from "./lib/axe-scan.mjs";

const args = process.argv.slice(2);
let rootDir = DEFAULT_ROOT_DIR;
let themeArg = "both";
let viewportArg = "both";
let stockAxe = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (args[i] === "--theme" && args[i + 1]) themeArg = args[++i];
  else if (args[i] === "--viewport" && args[i + 1]) viewportArg = args[++i];
  else if (args[i] === "--stock-axe") stockAxe = true;
}
rootDir = resolve(rootDir);

const themes = themeArg === "both" ? THEMES : [themeArg];
const viewports =
  viewportArg === "both" ? Object.keys(VIEWPORTS) : [viewportArg];

// Source patches applied to the axe bundle before injection.
//
// plain-color-fields replaces Color2's six WeakMap-emulated `#private` fields
// with plain own properties.  axe-core ships only a Babel-downleveled bundle,
// so every `new Color2()` otherwise runs fourteen weak-collection operations
// before any colour maths -- and colour-contrast, which is ~60 % of an audit
// and the source of its super-linear growth in page size, constructs enormous
// numbers of them.  Measured at -26 % across a ten-page set spanning the site's
// real size range, and -30 % on the large pages that dominate a widened scan.
// See builder/PLAN-axe-perf.md.
//
// Two obligations come with this, and they are not optional:
//
//   1. Every axe-core upgrade must re-run BOTH
//      `node scripts/check_a11y_fingerprint.mjs --patches plain-color-fields`
//      and `node scripts/check_axe_patch_equiv.mjs`.  The first checks axe
//      still finds the same things; the second checks the colour maths still
//      produces the same numbers, which the first cannot see (it compares
//      `incomplete` as a rule-id set).
//   2. If a result ever looks wrong, re-run with --stock-axe before doing
//      anything else.  That injects the unmodified bundle and tells you in one
//      command whether the patch is implicated.
//
// The patch asserts an exact occurrence count at each substitution point, so an
// upgrade that moves the code throws here rather than silently reverting to the
// slow path.  If that happens, --stock-axe keeps the scan working while the
// patch is re-derived.
const AXE_PATCHES = stockAxe ? [] : ["plain-color-fields"];

async function main() {
  console.log(
    AXE_PATCHES.length
      ? `axe-core ${axeVersion()} + ${AXE_PATCHES.join(", ")}`
      : `axe-core ${axeVersion()} (stock)`
  );

  const browser = await launchBrowser();
  const page = await newAuditPage(browser);

  let totalViolations = 0;
  let totalIncomplete = 0;
  const stateCoverage = [];

  const matrix = buildMatrix({ pages: SAMPLE_PAGES, themes, viewports });

  await runMatrix(page, {
    rootDir,
    matrix,
    // Patches require the unminified bundle.  That costs ~6 ms more per page
    // to inject (22 -> 28 ms), against seconds saved on the audit itself.
    axeSource: readAxeSource({
      minified: AXE_PATCHES.length === 0,
      patches: AXE_PATCHES,
    }),
    runOptions: AXE_RUN_OPTIONS,
    onAudit({ label, results, state, stateResult }) {
      if (state) stateCoverage.push(`${state} exposed ${stateResult} link(s)`);
      const { violations, incomplete } = results;

      if (violations.length > 0 || incomplete.length > 0) {
        console.log(`\n== ${label} ==`);

        for (const v of violations) {
          console.log(
            `  VIOLATION [${v.impact}] ${v.id}: ${v.help} (${v.helpUrl})`
          );
          for (const node of v.nodes.slice(0, 3)) {
            console.log(`    ${node.html.slice(0, 120)}`);
          }
          if (v.nodes.length > 3) {
            console.log(`    ... and ${v.nodes.length - 3} more`);
          }
        }

        for (const inc of incomplete) {
          console.log(`  INCOMPLETE [${inc.impact}] ${inc.id}: ${inc.help}`);
          for (const node of inc.nodes.slice(0, 2)) {
            console.log(`    ${node.html.slice(0, 120)}`);
          }
        }

        totalViolations += violations.length;
        totalIncomplete += incomplete.length;
      } else {
        console.log(`  OK  ${label}`);
      }
    },
  });

  await browser.close();

  // matrix.length is no longer pages x themes x viewports: STATE_AUDITS adds
  // entries that re-audit a page in a non-default state, so count the two
  // kinds separately rather than dividing and reporting a wrong page count.
  const stateAudits = matrix.filter((e) => e.state).length;
  const pageAudits = matrix.length - stateAudits;
  const pageCount = pageAudits / (themes.length * viewports.length);

  // Report what the state audits actually exposed, not just that they ran.
  // A count here that drops to nothing is the signal that a state has stopped
  // covering anything -- though PAGE_STATES throws before it gets that far.
  for (const line of [...new Set(stateCoverage)]) console.log(`\nstate: ${line}`);
  console.log(
    `\n${pageCount} pages x ${themes.length} theme(s) x ` +
      `${viewports.length} viewport(s)` +
      (stateAudits ? ` + ${stateAudits} state audit(s)` : "") +
      ` checked: ` +
      `${totalViolations} violation(s), ${totalIncomplete} incomplete check(s)`
  );

  if (totalViolations > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
