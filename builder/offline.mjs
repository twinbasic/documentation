// Phase 7 WRITE OFFLINE: mirror the rendered _site/ tree into
// _site-offline/, rewriting every URL so the tree opens cleanly under
// file:// with no HTTP server. See builder/PLAN-7.md for the full spec
// and docs/_plugins/offlinify.rb for the canonical Jekyll reference.
//
// One entry point: writeOffline(pages, staticFiles, site, destRoot,
// { auxStats }). Pure-compute derive helpers are in offline-rewrite.mjs
// and re-exported from here for `_diff.mjs` / `_triage.mjs` backward
// compatibility.
//
// Internal sections:
//
//   §A  Top-level orchestration
//   §B  Site-paths set (buildSitePaths async + enumerateVendoredThemeAssets)
//   §G  just-the-docs.js patches + search-data.js wrapper
//   §H  Static-file pass + theme-asset pass
//   §I  Re-export surface for diff tools (from offline-rewrite.mjs)

import { promises as fs } from "node:fs";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";

import {
  WRITE_LIMIT,
  isUnderProject,
  mkdirRec,
  runLimited,
  safeWrite,
  writeFileMkdirp,
} from "./write.mjs";

import {
  offlineExcluded,
  normalizeBaseurl,
  posixDirname,
  sliceNavBlock,
  deriveOfflinePage,
  deriveOfflinePageCached,
  deriveOfflineCss,
  deriveOfflineRedirect,
} from "./offline-rewrite.mjs";

// ---------------------------------------------------------------------------
// §I  Re-export surface for diff tools (from offline-rewrite.mjs)
// ---------------------------------------------------------------------------

export {
  buildSitePathsSync,
  offlineExcluded,
  fnmatchPathname,
  normalizeBaseurl,
  posixDirname,
  fileDirSegsFromRel,
  sliceNavBlock,
  NAV_OPEN_RE,
  NAV_CLOSE,
  NAV_PLACEHOLDER,
  deriveOfflinePageCached,
  deriveOfflinePage,
  deriveOfflineCss,
  deriveOfflineRedirect,
  stripSeo,
  rewriteHtml,
  injectSearchSetup,
  rewriteCss,
  computeRelative,
  resolveRaw,
  buildSegs,
  decode,
  computeRelUrl,
  getPageCache,
  escapeRegExp,
  PATH_SAFE_RE,
  PATH_SAFE_CHAR_RE,
  SEO_BLOCK_RE,
  TITLE_RE,
  HTML_COMBINED_RE,
  JTD_SCRIPT_TAG_RE,
  CSS_URL_RE,
} from "./offline-rewrite.mjs";

const OFFLINE_SUFFIX = "-offline";
const LIMIT = WRITE_LIMIT;

const _builderDir = path.dirname(fileURLToPath(import.meta.url));

// Local copy of tbdocs.mjs's makeTimer (PLAN-9 §7.D13). Avoids a
// cyclic import; the verify harnesses and diff tools import
// offline.mjs without going through tbdocs.mjs's main() side effects.
function makeTimer() {
  const laps = [];
  let last = Date.now();
  return {
    lap(label) {
      const now = Date.now();
      laps.push({ label, ms: now - last });
      last = now;
    },
    summary() {
      return laps.map(l => `${l.label}=${l.ms}ms`).join(" ");
    },
  };
}

// ---------------------------------------------------------------------------
// §A  Top-level orchestration
// ---------------------------------------------------------------------------

export async function writeOffline(pages, staticFiles, site, destRoot, { auxStats, profileOffline = false, precomputed = false, sitePaths } = {}) {
  if (!destRoot) {
    throw new Error("writeOffline requires a destRoot");
  }

  const stubs = auxStats?.redirects?.stubs ?? [];
  const state = await buildOfflineState(pages, staticFiles, site, destRoot, { stubs, sitePaths });
  const deps = {
    ...state,
    offlineRoot: destRoot + OFFLINE_SUFFIX,
    counters: {
      html: 0,
      css: 0,
      redirects: 0,
      statics: 0,
      assets: 0,
      excluded: 0,
      unresolved: 0,
    },
  };

  const subT = profileOffline ? makeTimer() : null;

  await setupOfflineDest(deps.offlineRoot);
  subT?.lap("setup");

  const jtdSrc = path.join(destRoot, "assets/js/just-the-docs.js");
  const jtdDest = path.join(deps.offlineRoot, "assets/js/just-the-docs.js");
  const jtdPatches = await patchJustTheDocsJs(jtdSrc, jtdDest);
  subT?.lap("jtdPatch");
  await writeSearchDataJs(
    path.join(deps.offlineRoot, "assets/js/search-data.js"),
    auxStats?.search?.json ?? null,
  );
  subT?.lap("searchDataJs");

  // PLAN-9 §5.7: per-branch timing. The five Promise.all branches
  // overlap, so each branch's reported duration is the await time
  // inside its own .then() callback; they sum to more than the
  // wall-clock total. The "(concurrent)" suffix is informational only
  // -- the sequential laps above are the source of truth for total.
  //
  // Construct the branch promise array under the same subT lap that
  // covers Promise.all: each writeOfflinePages/etc. call runs its
  // synchronous prefix (e.g. nav-block cache pre-pass) immediately,
  // before any await happens. Folding that work into the same lap as
  // the parallel await keeps the timing report honest.
  if (subT) {
    const t0Pages = Date.now();
    let dPages = 0, dRedirects = 0, dStatics = 0, dThemes = 0;
    const branches = [
      writeOfflinePages(pages, deps, { precomputed }).then(() => { dPages = Date.now() - t0Pages; }),
      writeOfflineRedirects(auxStats?.redirects?.stubs ?? [], deps).then(() => { dRedirects = Date.now() - t0Pages; }),
      copyOfflineStatics(staticFiles, deps).then(() => { dStatics = Date.now() - t0Pages; }),
      copyOfflineThemeAssets(deps).then(() => { dThemes = Date.now() - t0Pages; }),
    ];
    await Promise.all(branches);
    subT.lap("parallel");
    console.log(`  offline.pages (concurrent): ${dPages} ms`);
    console.log(`  offline.redirects (concurrent): ${dRedirects} ms`);
    console.log(`  offline.statics (concurrent): ${dStatics} ms`);
    console.log(`  offline.themeAssets (concurrent): ${dThemes} ms`);
  } else {
    await Promise.all([
      writeOfflinePages(pages, deps, { precomputed }),
      writeOfflineRedirects(auxStats?.redirects?.stubs ?? [], deps),
      copyOfflineStatics(staticFiles, deps),
      copyOfflineThemeAssets(deps),
    ]);
  }

  return { ...deps.counters, jtdPatches, subT };
}

// Pure-compute state assembly. Shared by the writer (writeOffline) and
// the diff tools (`_diff.mjs --offline`, `_triage.mjs auditOffline`).
// Reads destRoot/assets/ to seed the URL resolver's site-paths Set with
// the theme files Phase 5 copied -- those don't live in staticFiles[].
// `stubs` (optional) is the redirect-stub list from Phase 6; their
// destinations land in sitePaths so a page-relative link like
// `LBound` resolves through the stub at `tB/Core/LBound.html`.
export async function buildOfflineState(pages, staticFiles, site, destRoot, { stubs = [], sitePaths } = {}) {
  const excludePatterns = Array.isArray(site.config?.offline_exclude)
    ? site.config.offline_exclude.map(String)
    : [];
  return {
    destRoot,
    sitePaths: sitePaths ?? await buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs),
    caches: {
      rawResolution: new Map(),
      seg: new Map(),
      result: new Map(),
    },
    baseurl: normalizeBaseurl(site.config?.baseurl),
    siteUrl: String(site.config?.url ?? "").replace(/\/+$/, ""),
    excludePatterns,
  };
}

// §5.1  setupOfflineDest -- wipe-contents (not directory itself; see
// PLAN-7 §7.D1) then ensure the root exists.
async function setupOfflineDest(offlineRoot) {
  if (!isUnderProject(offlineRoot)) {
    throw new Error(`refusing to clean ${offlineRoot}: not under the project tree`);
  }
  if (existsSync(offlineRoot)) {
    const entries = await fs.readdir(offlineRoot);
    await Promise.all(entries.map(name =>
      fs.rm(path.join(offlineRoot, name), { recursive: true, force: true }),
    ));
  } else {
    await fs.mkdir(offlineRoot, { recursive: true });
  }
}

// §5.2  writeOfflinePages -- per-page strip + rewrite + inject.
//
// PLAN-9 §5.3 (B7) nav-block cache: the just-the-docs sidebar in
// `<nav id="site-nav">...</nav>` is byte-identical across every page
// site-wide before rewrite (template.mjs's renderSidebar takes only
// `site`, not `page`; the per-page active highlight lives in a
// separate `<style id="jtd-nav-activation">` block emitted in
// <head>, not as inline class attributes on the nav anchors). The
// HTML rewrite pass spends ~200 ms per build re-running the per-
// match callback over that ~80kB block on each of 837 pages. The
// cache stashes the pre/post-rewrite nav slices once per
// **destination** dir (the URL rewrite is keyed by `fileSegs`,
// derived from `page.destPath`) and the per-page rewriter
// substitutes them in instead of re-scanning.
//
// Asserted-premise design (§7.D11): each subsequent page checks that
// its pre-rewrite nav block matches the cached `input` byte-for-byte.
// On miss we fall back to the full rewrite with a warning -- the
// cache is purely an optimisation, never a correctness dependency.
async function writeOfflinePages(pages, deps, { precomputed = false } = {}) {
  const { offlineRoot } = deps;

  if (precomputed) {
    const writable = pages.filter(p => p.offlineHtml !== undefined);
    await runLimited(writable, LIMIT, async (page) => {
      const dest = path.join(offlineRoot, page.destPath);
      await writeFileMkdirp(dest, page.offlineHtml);
      deps.counters.html += 1;
      deps.counters.unresolved += page.offlineMisses ?? 0;
    });
    return;
  }

  const writable = pages.filter(p => p.html !== undefined);

  // Pre-pass: group pages by destination dir, render the first page
  // in each group through deriveOfflinePage, and stash the
  // pre-rewrite/post-rewrite nav slices on deps.navCache.
  const byDir = new Map();
  for (const p of writable) {
    const destDir = posixDirname(p.destPath);
    let g = byDir.get(destDir);
    if (!g) { g = []; byDir.set(destDir, g); }
    g.push(p);
  }
  const navCache = new Map();
  for (const [destDir, group] of byDir) {
    const first = group[0];
    const input = sliceNavBlock(first.html);
    if (input === null) continue;
    const { html: rendered } = deriveOfflinePage(first, deps);
    const output = sliceNavBlock(rendered);
    if (output === null) continue;
    navCache.set(destDir, { input, output });
  }
  deps.navCache = navCache;

  await runLimited(writable, LIMIT, async (page) => {
    const { html, misses } = deriveOfflinePageCached(page, deps);
    const dest = path.join(offlineRoot, page.destPath);
    await writeFileMkdirp(dest, html);
    deps.counters.html += 1;
    deps.counters.unresolved += misses;
  });
}

// §5.3  writeOfflineRedirects -- rewrite the four <site.url><path>
// occurrences in each stub.
async function writeOfflineRedirects(stubs, deps) {
  const { offlineRoot } = deps;
  await runLimited(stubs, LIMIT, async (s) => {
    const html = deriveOfflineRedirect(s, deps);
    await writeFileMkdirp(path.join(offlineRoot, s.destPath), html);
    deps.counters.redirects += 1;
  });
}

// §5.4  copyOfflineStatics -- mirror staticFiles[] minus offline_exclude.
async function copyOfflineStatics(staticFiles, deps) {
  const { offlineRoot, excludePatterns, counters } = deps;
  await runLimited(staticFiles, LIMIT, async (file) => {
    const destRel = file.destRel.replaceAll("\\", "/");
    if (offlineExcluded(destRel, excludePatterns)) {
      counters.excluded += 1;
      return;
    }
    const dest = path.join(offlineRoot, file.destRel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(file.srcPath, dest));
    counters.statics += 1;
  });
}

// §5.5  copyOfflineThemeAssets -- mirror _site/assets/, rewrite CSS,
// skip the patched JTD JS (step [3] already wrote it).
async function copyOfflineThemeAssets(deps) {
  const { destRoot, offlineRoot, counters } = deps;
  const themeRoot = path.join(destRoot, "assets");
  if (!existsSync(themeRoot)) return;

  const themeEntries = await collectThemeFiles(themeRoot);

  await runLimited(themeEntries, LIMIT, async (e) => {
    if (e.isJtdJs) return;
    const relAsset = "assets/" + e.relUnderAssets;
    if (offlineExcluded(relAsset, deps.excludePatterns)) return;
    const dest = path.join(offlineRoot, "assets", e.relUnderAssets);
    if (e.isCss) {
      const cssIn = await fs.readFile(e.srcAbs, "utf8");
      const relRel = path.posix.join("assets", e.relUnderAssets);
      const { css, misses } = deriveOfflineCss(cssIn, relRel, deps);
      await writeFileMkdirp(dest, css);
      counters.css += 1;
      counters.unresolved += misses;
    } else {
      await mkdirRec(path.dirname(dest));
      await safeWrite(dest, () => fs.copyFile(e.srcAbs, dest));
      counters.assets += 1;
    }
  });
}

// ---------------------------------------------------------------------------
// §B  Site-paths set
// ---------------------------------------------------------------------------

// §6.1  buildSitePaths -- the URL resolver's "is the target real" Set.
// Combines pages, staticFiles, and the theme tree Phase 5 copied to
// <destRoot>/assets/ (which is not present in staticFiles[]).
// Filters on the same signal Phase 5 uses to decide what to write
// (`layout: book-combined` is the only skip case), not on whether
// `page.html` happens to be populated -- the diff tools call this
// without running templatePhase first.
async function buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs = []) {
  const paths = new Set();
  for (const p of pages) {
    if (p.frontmatter?.layout === "book-combined") continue;
    const rel = p.destPath.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  for (const s of staticFiles) {
    const rel = s.destRel.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  for (const stub of stubs) {
    const rel = stub.destPath.replaceAll("\\", "/");
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  const themeRoot = path.join(destRoot, "assets");
  if (existsSync(themeRoot)) {
    const themeFiles = await collectThemeFiles(themeRoot);
    for (const f of themeFiles) {
      const rel = "assets/" + f.relUnderAssets;
      if (offlineExcluded(rel, excludePatterns)) continue;
      paths.add("/" + rel);
    }
  }
  return paths;
}

// Synchronous walk of builder/vendor/just-the-docs/assets/. Returns
// paths like ["assets/js/just-the-docs.js",
// "assets/js/vendor/lunr.min.js"] for use as the themeAssetRels
// argument to buildSitePathsSync. Lives here (not offline-rewrite.mjs)
// to keep the worker-imported module free of node:fs dependencies.
export function enumerateVendoredThemeAssets() {
  const assetsRoot = path.join(_builderDir, "vendor/just-the-docs/assets");
  const out = [];
  function walk(rel) {
    for (const entry of readdirSync(path.join(assetsRoot, rel), { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : path.posix.join(rel, entry.name);
      if (entry.isDirectory()) {
        walk(childRel);
      } else {
        out.push("assets/" + childRel);
      }
    }
  }
  walk("");
  return out;
}

// ---------------------------------------------------------------------------
// §G  just-the-docs.js patches + search-data.js wrapper
// ---------------------------------------------------------------------------

// The "Patched by _plugins/offlinify.rb" comment strings are kept
// verbatim from the Ruby Offlinify constants so the patched JS is
// byte-identical to Jekyll's _site-offline/assets/js/just-the-docs.js.
// Don't rename to "offline.mjs" without first updating the byte-parity
// matrix in PLAN-7 §10.
const JTD_NAVLINK_REPLACEMENT = `function navLink() {
  // Patched by _plugins/offlinify.rb for file:// compatibility.
  // Compare resolved a.href against window.location.href so the
  // active link resolves correctly under both http(s):// and file://.
  var here = window.location.href.split('#')[0].split('?')[0];
  var links = document.getElementById('site-nav').querySelectorAll('a.nav-list-link');
  for (var i = 0; i < links.length; i++) {
    if (links[i].href === here) return links[i];
  }
  return null;
}`;

const JTD_INITSEARCH_FN_REPLACEMENT = `function initSearch() {
  // Patched by _plugins/offlinify.rb for file:// compatibility.
  // The upstream version fires XMLHttpRequest for search-data.json,
  // which browsers block under file://. We instead read the index
  // from a global the offline copy preloads via <script src=>.
  var docs = window.SEARCH_DATA;
  if (!docs) {
    console.log('Offlinify: window.SEARCH_DATA not found; ensure search-data.js loads before just-the-docs.js');
    return;
  }
  // Rebuild each doc.url from doc.relUrl (no baseurl prefix) so
  // search-result clicks land on the right file regardless of
  // whatever baseurl the site was built with. Upstream sets
  // \`link.href = doc.url\`, so this is the value users navigate
  // to.
  var siteRoot = window.OFFLINE_SITE_ROOT || '';
  for (var i in docs) {
    var rel = docs[i].relUrl;
    if (typeof rel === 'string' && rel.charAt(0) === '/') {
      var hash = '';
      var hashIdx = rel.indexOf('#');
      if (hashIdx !== -1) {
        hash = rel.slice(hashIdx);
        rel = rel.slice(0, hashIdx);
      }
      rel = rel.slice(1); // strip leading /
      if (rel.endsWith('/')) {
        rel = rel + 'index.html';
      } else {
        var lastSlash = rel.lastIndexOf('/');
        var lastSeg = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
        if (lastSeg.indexOf('.') === -1) rel = rel + '.html';
      }
      docs[i].url = siteRoot + rel + hash;
    }
  }

  lunr.tokenizer.separator = /[\\s\\-\\/]+/;

  var index = lunr(function(){
    this.ref('id');
    this.field('title', { boost: 200 });
    this.field('content', { boost: 2 });
    this.field('relUrl');
    this.metadataWhitelist = ['position'];

    for (var i in docs) {
      this.add({
        id: i,
        title: docs[i].title,
        content: docs[i].content,
        relUrl: docs[i].relUrl
      });
    }
  });

  searchLoaded(index, docs);
}`;

// §6.9  patchJustTheDocsJs -- regex-substitute navLink() + initSearch().
async function patchJustTheDocsJs(srcPath, destPath) {
  let src;
  try {
    src = await fs.readFile(srcPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`offline: ${srcPath} not found; skipping just-the-docs.js patch`);
      return [];
    }
    throw err;
  }

  const { js, patches, warnings } = deriveOfflineJtdJs(src);
  for (const w of warnings) console.warn(w);
  await writeFileMkdirp(destPath, js);
  return patches;
}

// Pure-compute: apply the navLink + initSearch patches to a
// just-the-docs.js source string. Returns `{ js, patches, warnings }`.
// `warnings` is an array of warning lines for any patch that couldn't
// be located -- the caller decides whether to log them.
//
// Phase 11 (B11): parses just-the-docs.js with acorn, walks for
// FunctionDeclaration nodes named `navLink` / `initSearch`, and
// replaces them by string-slicing at the node ranges -- so the
// non-patched regions stay byte-identical to the upstream source.
// Survives cosmetic upstream edits (variable renames, whitespace
// changes inside the function body) that would have broken anchored
// regex matches.
//
// `just-the-docs.js` is a vendored asset in `builder/assets/js/`; it
// only changes when the operator deliberately re-extracts after a
// gem bump. A parse error here means that re-extraction landed
// something acorn can't read -- fix it at the time, no defensive
// fallback shimmed in.
export function deriveOfflineJtdJs(src) {
  const ast = acorn.parse(src, {
    ecmaVersion: "latest",
    sourceType: "script",
    ranges: true,
  });

  const edits = [];
  acornWalk.simple(ast, {
    FunctionDeclaration(node) {
      if (!node.id) return;
      if (node.id.name === "navLink") {
        edits.push({ start: node.start, end: node.end, replacement: JTD_NAVLINK_REPLACEMENT, label: "navLink()" });
      } else if (node.id.name === "initSearch") {
        edits.push({ start: node.start, end: node.end, replacement: JTD_INITSEARCH_FN_REPLACEMENT, label: "initSearch()" });
      }
    },
  });

  // Apply edits right-to-left so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  // Patch list in source order for nicer log output.
  const patches = edits
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((e) => e.label);

  const warnings = [];
  const found = new Set(patches);
  if (!found.has("navLink()")) {
    warnings.push(
      "offline: AST walk found no navLink() declaration in just-the-docs.js -- " +
      "nav-active detection will be broken under file://.",
    );
  }
  if (!found.has("initSearch()")) {
    warnings.push(
      "offline: AST walk found no initSearch() declaration in just-the-docs.js -- " +
      "offline search will not work.",
    );
  }
  return { js: out, patches, warnings };
}

// §6.10  writeSearchDataJs -- wrap the JSON as a window.SEARCH_DATA
// assignment so a <script src=> can load it under file://.
async function writeSearchDataJs(destPath, jsonBytes) {
  if (jsonBytes == null) return 0;
  const js = deriveOfflineSearchDataJs(jsonBytes);
  await writeFileMkdirp(destPath, js);
  return js.length;
}

// Pure-compute: wrap the search-data.json bytes as a JS global so a
// <script src=> can load them under file://. Re-stringifies the parsed
// JSON without indentation (Phase 11 B10) -- the offline tree's
// search-data.js is consumed only by the lunr runtime, which doesn't
// care about formatting; minification shaves ~1.1 MB off the offline
// asset footprint. The online search-data.json keeps its pretty-printed
// shape (Phase 6 unchanged).
export function deriveOfflineSearchDataJs(jsonBytes) {
  const minified = JSON.stringify(JSON.parse(jsonBytes));
  return `window.SEARCH_DATA = ${minified};\n`;
}

// ---------------------------------------------------------------------------
// §H  Theme-asset walker
// ---------------------------------------------------------------------------

// §6.14  collectThemeFiles -- recursively walk _site/assets/.
async function collectThemeFiles(themeRoot) {
  const out = [];
  async function walk(relPath) {
    const dirents = await fs.readdir(
      path.join(themeRoot, relPath), { withFileTypes: true },
    );
    for (const d of dirents) {
      const childRel = relPath === "" ? d.name : path.posix.join(relPath, d.name);
      if (d.isDirectory()) {
        await walk(childRel);
      } else if (d.isFile()) {
        out.push({
          relUnderAssets: childRel,
          srcAbs: path.join(themeRoot, childRel),
          isCss: childRel.endsWith(".css"),
          isJtdJs: childRel === "js/just-the-docs.js",
        });
      }
    }
  }
  await walk("");
  return out;
}
