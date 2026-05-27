// One-off verification harness for the PLAN-1.md §9 acceptance checklist.
// Not part of the build; run ad-hoc as `node builder/verify-phase1.mjs`.

import path from "node:path";
import process from "node:process";
import { discover } from "./discover.mjs";

const REQUIRED_PAGE_FIELDS = [
  "srcPath", "srcRel", "ext", "frontmatter", "rawContent",
  "permalink", "destPath", "layoutDefault", "imageScope",
];

const EXPECT_STATIC_INCLUDES = [
  "favicon.png",
  "CNAME",
  "render-book.mjs",
];

const EXPECT_STATIC_GLOBS = [
  /^Features\/.*\/Images\/.*\.(png|svg)$/i,
  /^Tutorials\/.*\/Images\/.*\.(png|svg)$/i,
  /^lib\/.*\.mjs$/,
  /^assets\/images\/mmd\/.*\.(svg|mmd)$/,
];

const FORBID_STATIC = [
  /^_/,
  /\/_/,
  /^assets\/css\//,
  /^assets\/js\//,
  /\.bat$/,
  /^Gemfile/,
  /^_config\.yml$/,
];

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function passed(msg) {
  console.log(`OK   ${msg}`);
}

async function main() {
  const srcRoot = path.resolve(process.cwd(), "docs");
  const t0 = Date.now();
  const { pages, staticFiles } = await discover(srcRoot);
  console.log(`discover ran in ${Date.now() - t0} ms`);
  console.log(`pages=${pages.length} staticFiles=${staticFiles.length}\n`);

  // §9.1
  assert(Array.isArray(pages) && Array.isArray(staticFiles),
    "result has pages[] and staticFiles[]") && passed("result shape");

  // §9.2 -- 838 = 836 .md + 404.html + book.html
  assert(pages.length === 838, `pages.length is 838 (got ${pages.length})`) &&
    passed(`pages.length === 838`);

  // §9.3 -- every page has required fields
  let missingField = null;
  for (const p of pages) {
    for (const f of REQUIRED_PAGE_FIELDS) {
      if (!(f in p)) { missingField = `${p.srcRel}: missing ${f}`; break; }
    }
    if (missingField) break;
  }
  assert(!missingField, `all pages have required fields (${missingField})`) &&
    passed("all pages have 9 required fields");

  // §9.4 -- permalink and destPath shape
  let badLink = null;
  for (const p of pages) {
    if (!p.permalink.startsWith("/")) {
      badLink = `${p.srcRel}: permalink "${p.permalink}" does not start with /`;
      break;
    }
    if (!p.destPath || !/\.(html?|xml)$/i.test(p.destPath)) {
      badLink = `${p.srcRel}: destPath "${p.destPath}" not html-ish`;
      break;
    }
  }
  assert(!badLink, `permalink/destPath well-formed (${badLink})`) &&
    passed("permalink starts with / and destPath ends in .html/.htm/.xml");

  // §9.5 -- no destPath collisions
  const destSeen = new Map();
  let destDup = null;
  for (const p of pages) {
    const prev = destSeen.get(p.destPath);
    if (prev) { destDup = `${prev} and ${p.srcRel} both map to ${p.destPath}`; break; }
    destSeen.set(p.destPath, p.srcRel);
  }
  assert(!destDup, `no destPath collisions (${destDup})`) &&
    passed("no duplicate destPath");

  // §9.6 -- no permalink collisions
  const linkSeen = new Map();
  let linkDup = null;
  for (const p of pages) {
    const prev = linkSeen.get(p.permalink);
    if (prev) { linkDup = `${prev} and ${p.srcRel} both claim ${p.permalink}`; break; }
    linkSeen.set(p.permalink, p.srcRel);
  }
  assert(!linkDup, `no permalink collisions (${linkDup})`) &&
    passed("no duplicate permalink");

  // §9.7 -- staticFiles must contain ...
  const staticRels = new Set(staticFiles.map(s => s.srcRel));
  for (const want of EXPECT_STATIC_INCLUDES) {
    assert(staticRels.has(want), `staticFiles contains ${want}`) &&
      passed(`staticFiles contains ${want}`);
  }
  for (const pat of EXPECT_STATIC_GLOBS) {
    const hits = [...staticRels].filter(s => pat.test(s));
    assert(hits.length > 0, `staticFiles has at least one match for ${pat} (got ${hits.length})`) &&
      passed(`staticFiles has ${hits.length} match(es) for ${pat}`);
  }

  // §9.8 -- staticFiles must NOT contain ...
  for (const pat of FORBID_STATIC) {
    const hits = [...staticRels].filter(s => pat.test(s));
    assert(hits.length === 0, `staticFiles forbids ${pat} (got ${hits.length}: ${hits.slice(0, 3).join(", ")})`) &&
      passed(`staticFiles excludes ${pat}`);
  }

  // Spot-check fixtures from §9 "Recommended test fixtures"
  const byRel = new Map(pages.map(p => [p.srcRel, p]));

  const cases = [
    {
      rel: "Reference/Core/Const.md",
      expect: p => p.destPath === "tB/Core/Const.html" &&
                   p.frontmatter.vba_attribution === true &&
                   typeof p.frontmatter.parent === "string" &&
                   p.permalink === "/tB/Core/Const",
    },
    {
      rel: "Features/Advanced/index.md",
      expect: p => p.destPath === "Features/Advanced/index.html",
    },
    {
      rel: "index.md",
      expect: p => p.destPath === "index.html" &&
                   p.permalink === "/" &&
                   p.layoutDefault === false,
    },
    {
      rel: "404.html",
      expect: p => p.destPath === "404.html" && p.ext === ".html",
    },
    {
      rel: "book.html",
      expect: p => p.frontmatter.sitemap === false && p.destPath === "book.html",
    },
    {
      rel: "Features/Compiler-IDE/CodeLens.md",
      expect: p => p.permalink === "/Features/Compiler-IDE/CodeLens.html",
    },
    {
      rel: "Reference/Core/Concat.md",
      expect: p => p.frontmatter.title === "&, &=",
    },
  ];

  for (const c of cases) {
    const p = byRel.get(c.rel);
    if (!assert(!!p, `fixture present: ${c.rel}`)) continue;
    assert(c.expect(p), `fixture asserts: ${c.rel}`) &&
      passed(`fixture ${c.rel}`);
  }

  // _plugins/html-compress.md must NOT be in either output.
  assert(!byRel.has("_plugins/html-compress.md"),
    "_plugins/html-compress.md not in pages") &&
    passed("excluded: _plugins/html-compress.md (pages)");
  assert(!staticRels.has("_plugins/html-compress.md"),
    "_plugins/html-compress.md not in staticFiles") &&
    passed("excluded: _plugins/html-compress.md (static)");

  // assets/css/print.css must NOT be in either output.
  assert(!staticRels.has("assets/css/print.css"),
    "assets/css/print.css not in staticFiles") &&
    passed("excluded: assets/css/print.css");

  // determinism: pages sorted by basename (matches Jekyll's
  // `site.pages.sort_by!(&:name)`), staticFiles by full srcRel
  // (matches Jekyll's `site.static_files.sort_by!(&:relative_path)`).
  const bn = (s) => s.slice(s.lastIndexOf("/") + 1);
  for (let i = 1; i < pages.length; i++) {
    if (bn(pages[i].srcRel) < bn(pages[i-1].srcRel)) {
      assert(false, `pages not sorted by basename at index ${i}: ${pages[i-1].srcRel} vs ${pages[i].srcRel}`);
      break;
    }
  }
  for (let i = 1; i < staticFiles.length; i++) {
    if (staticFiles[i].srcRel <= staticFiles[i-1].srcRel) {
      assert(false, `staticFiles not sorted at index ${i}`);
      break;
    }
  }
  passed("pages sorted by basename; staticFiles sorted by srcRel");

  if (process.exitCode) {
    console.log("\nFAILED");
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
