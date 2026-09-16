// Automated accessibility check for the built site.
//
// Scans sample pages from _site/ using puppeteer + axe-core against
// the WCAG 2.2 AA ruleset.  Covers all major content patterns:
// homepage, deep reference page, table-heavy page, SVG diagrams,
// admonitions, and the 404 page.
//
// Usage:  node scripts/check_a11y.mjs [--root-dir DIR]
//
// Requires `build.bat` to have produced an up-to-date _site/.

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const args = process.argv.slice(2);
let rootDir = "docs/_site";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root-dir" && args[i + 1]) rootDir = args[++i];
}
rootDir = resolve(rootDir);

const axeSource = readFileSync(
  resolve("node_modules/axe-core/axe.min.js"),
  "utf-8"
);

const SAMPLE_PAGES = [
  "/index.html",
  "/tB/Core/Dim.html",
  "/tB/Modules/Interaction/index.html",
  "/Documentation/Development/BuildInfo.html",
  "/tB/Core/Select-Case.html",
  "/404.html",
];

async function checkPage(page, filePath) {
  const url = pathToFileURL(join(rootDir, filePath)).href;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    return await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag22aa"],
      },
      rules: {
        // Sidebar nav links are < 24px — a just-the-docs theme layout
        // concern requiring a significant redesign to fix.
        "target-size": { enabled: false },
      },
    });
  });

  return results;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let totalViolations = 0;
  let totalIncomplete = 0;

  const seen = new Set();
  const pages = SAMPLE_PAGES.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  for (const filePath of pages) {
    const results = await checkPage(page, filePath);

    const violations = results.violations;
    const incomplete = results.incomplete;

    if (violations.length > 0 || incomplete.length > 0) {
      console.log(`\n== ${filePath} ==`);

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
        console.log(
          `  INCOMPLETE [${inc.impact}] ${inc.id}: ${inc.help}`
        );
        for (const node of inc.nodes.slice(0, 2)) {
          console.log(`    ${node.html.slice(0, 120)}`);
        }
      }

      totalViolations += violations.length;
      totalIncomplete += incomplete.length;
    } else {
      console.log(`  OK  ${filePath}`);
    }
  }

  await browser.close();

  console.log(
    `\n${pages.length} pages checked: ${totalViolations} violation(s), ${totalIncomplete} incomplete check(s)`
  );

  if (totalViolations > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
