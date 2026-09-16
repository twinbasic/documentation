// Automated accessibility check for the built site.
//
// Scans sample pages using puppeteer + axe-core against the WCAG 2.2 AA
// ruleset.  Covers all major content patterns: homepage, deep reference
// page, table-heavy page, SVG diagrams, admonitions, and the 404 page.
//
// Two details matter for the results to mean anything:
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
// Usage:  node scripts/check_a11y.mjs [--root-dir DIR] [--theme light|dark|both]
//                                     [--viewport desktop|mobile|both]
//
// Requires `build.bat` to have produced an up-to-date _site-offline/.

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const args = process.argv.slice(2);
let rootDir = "docs/_site-offline";
let themeArg = "both";
let viewportArg = "both";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root-dir" && args[i + 1]) rootDir = args[++i];
  else if (args[i] === "--theme" && args[i + 1]) themeArg = args[++i];
  else if (args[i] === "--viewport" && args[i + 1]) viewportArg = args[++i];
}
rootDir = resolve(rootDir);

const THEMES = themeArg === "both" ? ["light", "dark"] : [themeArg];

// Fixed sizes keep the media queries -- and therefore which elements are laid
// out and visible to axe -- the same from run to run.
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 375, height: 812 },
};
const VIEWPORT_NAMES =
  viewportArg === "both" ? Object.keys(VIEWPORTS) : [viewportArg];

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

async function checkPage(page, filePath, theme) {
  const url = pathToFileURL(join(rootDir, filePath)).href;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // theme-toggle.js reads localStorage, which is unavailable on file://
  // origins.  Set the data-theme attribute it would have set instead (an
  // explicit override; its declarations are identical to the no-JS
  // prefers-color-scheme path, so this exercises the same dark palette).
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);

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

  for (const viewport of VIEWPORT_NAMES) {
    await page.setViewport(VIEWPORTS[viewport]);
    for (const theme of THEMES) {
      for (const filePath of pages) {
        const label = `${filePath} [${theme}, ${viewport}]`;
        const results = await checkPage(page, filePath, theme);

        const violations = results.violations;
        const incomplete = results.incomplete;

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
      }
    }
  }

  await browser.close();

  console.log(
    `\n${pages.length} pages x ${THEMES.length} theme(s) x ` +
      `${VIEWPORT_NAMES.length} viewport(s) checked: ` +
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
