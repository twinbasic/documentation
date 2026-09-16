// Automated accessibility check for the built site.
//
// Scans sample pages using puppeteer + axe-core against the WCAG 2.2 AA
// ruleset.  Covers all major content patterns: homepage, deep reference
// page, table-heavy page, SVG diagrams, admonitions, and the 404 page.
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
//   * The search index is blocked during the scan (see BLOCKED_REQUESTS).
//     It is inert for auditing purposes but dominated the run time.
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

// Requests aborted for the duration of the scan.
//
// Every page in the offline tree pulls in the ~3.2 MB search index
// (assets/js/search-data.js) plus lunr. Loading and parsing it dominated
// the run -- 18.9 s of a 27.1 s scan across the 24 page/theme/viewport
// combinations -- and contributes nothing to the audit: it populates
// window.store for the search box, it does not alter the DOM axe walks.
// Aborting both cuts the scan to ~9.1 s (-66 %) with byte-identical
// results; every rule id and node count, violations and incomplete
// alike, matched the unblocked scan on all 24 combinations.
//
// just-the-docs.js is deliberately NOT blocked. It installs the search
// combobox ARIA (role=listbox, aria-activedescendant) added by Phase 2.1
// of builder/PLAN-a11y.md, and blocking it makes axe see *less* -- the
// colour-contrast node count on Select-Case drops 54 -> 2 -- which would
// silently mask coverage for ~130 ms.
const BLOCKED_REQUESTS = [/search-data\.js/, /lunr\.min\.js/];

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
    });
  });

  return results;
}

async function main() {
  // --no-sandbox: GitHub's ubuntu-24.04 runners carry the AppArmor
  // restriction on unprivileged user namespaces, which Chrome's sandbox
  // needs -- without this the launch fails in CI. --disable-dev-shm-usage
  // avoids crashes where /dev/shm is small (containers). Neither touches
  // layout or computed style, so axe sees exactly what it sees locally;
  // book/render-book.mjs passes the same pair for the same reason.
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (BLOCKED_REQUESTS.some((re) => re.test(req.url()))) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });

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
