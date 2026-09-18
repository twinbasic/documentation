// Automated accessibility check for the built site.
//
// Scans sample pages using puppeteer + axe-core against WCAG 2.0, 2.1 and
// 2.2 at Level A + AA, plus the heading-order best-practice rule.  Covers
// all major content patterns: homepage, deep reference page, table-heavy
// page, SVG diagrams, admonitions, and the 404 page.
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
// Usage:  node scripts/check_a11y.mjs [--root-dir DIR] [--theme light|dark|both]
//                                     [--viewport desktop|mobile|both]
//
// Requires `build.bat` to have produced an up-to-date _site-offline/.

import { resolve } from "node:path";
import {
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
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (args[i] === "--theme" && args[i + 1]) themeArg = args[++i];
  else if (args[i] === "--viewport" && args[i + 1]) viewportArg = args[++i];
}
rootDir = resolve(rootDir);

const themes = themeArg === "both" ? THEMES : [themeArg];
const viewports =
  viewportArg === "both" ? Object.keys(VIEWPORTS) : [viewportArg];

async function main() {
  const browser = await launchBrowser();
  const page = await newAuditPage(browser);

  let totalViolations = 0;
  let totalIncomplete = 0;

  const matrix = buildMatrix({ pages: SAMPLE_PAGES, themes, viewports });

  await runMatrix(page, {
    rootDir,
    matrix,
    axeSource: readAxeSource(),
    runOptions: AXE_RUN_OPTIONS,
    onAudit({ label, results }) {
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

  const pageCount = matrix.length / (themes.length * viewports.length);
  console.log(
    `\n${pageCount} pages x ${themes.length} theme(s) x ` +
      `${viewports.length} viewport(s) checked: ` +
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
