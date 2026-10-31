// Phase 7 WRITE OFFLINE: mirror the rendered _site/ tree into
// _site-offline/, rewriting every URL so the tree opens cleanly under
// file:// with no HTTP server. See builder/PLAN-7.md for the full spec
// and docs/_plugins/offlinify.rb for the canonical Jekyll reference.
//
// One entry point: writeOffline(staticFiles, site, destRoot,
// { auxStats, sitePaths, onlineSitePaths }). The render workers derive each
// page's offline HTML and write it during their flush, so writeOffline writes
// the rest: the patched just-the-docs.js, the redirect
// stubs, the static files and the theme assets. sitePaths is the set
// the caller built with buildSitePathsSync (offline-rewrite.mjs), which
// holds the pure-compute rewrite helpers; onlineSitePaths is the online
// tree's, which a link to a file only the website holds is resolved against.
//
// Internal sections:
//
//   §A  Top-level orchestration
//   §B  Site-paths set (enumerateVendoredThemeAssets)
//   §G  just-the-docs.js patches
//   §H  Static-file pass + theme-asset pass

import { promises as fs } from "node:fs";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";

import { WRITE_LIMIT, mkdirRec, runLimited, safeWrite, writeFileMkdirp } from "./write.mjs";

import {
  offlineExcluded,
  deriveOfflineCss,
  deriveOfflineRedirect,
  fileDirSegsFromRel,
  posixDirname,
  rewriteHtml,
  warnMisses,
  websiteOf,
} from "./offline-rewrite.mjs";
import { NAV_SCRIPT_REL, navScript, renderFullNav } from "./template.mjs";
import { normalizeBaseurl } from "./url.mjs";
import { posix } from "./paths.mjs";

const OFFLINE_SUFFIX = "-offline";
const LIMIT = WRITE_LIMIT;

const _builderDir = path.dirname(fileURLToPath(import.meta.url));

// Minimal lap timer, used only when --profile-offline is set. A
// private copy rather than an import from tbdocs.mjs, which would be
// a cyclic import (tbdocs.mjs imports this file).
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
      return laps.map((l) => `${l.label}=${l.ms}ms`).join(" ");
    },
  };
}

// ---------------------------------------------------------------------------
// §A  Top-level orchestration
// ---------------------------------------------------------------------------

export async function writeOffline(
  staticFiles,
  site,
  destRoot,
  { auxStats, profileOffline = false, sitePaths, onlineSitePaths = null, check = false } = {},
) {
  if (!destRoot) {
    throw new Error("writeOffline requires a destRoot");
  }

  const state = buildOfflineState(site, destRoot, sitePaths, onlineSitePaths);
  // Project-owned theme assets (head-nav.css, print.css, theme-toggle.js)
  // live under docs/assets/ and ride the static-file copy path -- but the
  // online pass also copies them into <destRoot>/assets/, so they show up
  // AGAIN when copyOfflineThemeAssets walks that tree. Both branches run
  // concurrently under the Promise.all below, so without this set the two
  // writers race on the same destination and Windows fails the second open
  // with EBUSY. Claiming them for the statics branch keeps a single writer
  // per path.
  const staticDestRels = new Set((staticFiles ?? []).map((f) => posix(f.destRel)));
  const deps = {
    ...state,
    staticDestRels,
    checkStubs: check ? [] : null,
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

  const jtdSrc = path.join(destRoot, "assets/js/just-the-docs.js");
  const jtdDest = path.join(deps.offlineRoot, "assets/js/just-the-docs.js");
  const jtdPatches = await patchJustTheDocsJs(jtdSrc, jtdDest);
  subT?.lap("jtdPatch");
  await writeOfflineNavJs(site, deps);
  subT?.lap("navJs");

  // PLAN-9 §5.7: per-branch timing. The three Promise.all branches
  // overlap, so each branch's reported duration is the await time
  // inside its own .then() callback; they sum to more than the
  // wall-clock total. The "(concurrent)" suffix is informational only
  // -- the sequential laps above are the source of truth for total.
  //
  // Construct the branch promise array under the same subT lap that
  // covers Promise.all: each branch call runs its synchronous prefix
  // immediately, before any await happens. Folding that work into the
  // same lap as the parallel await keeps the timing report honest.
  // Offline page HTML is already on disk from per-worker flush.
  // Only redirect stubs, static files, and theme assets are written here.
  if (subT) {
    const t0Pages = Date.now();
    let dRedirects = 0,
      dStatics = 0,
      dThemes = 0;
    const branches = [
      writeOfflineRedirects(auxStats?.redirects?.stubs ?? [], deps).then(() => {
        dRedirects = Date.now() - t0Pages;
      }),
      copyOfflineStatics(staticFiles, deps).then(() => {
        dStatics = Date.now() - t0Pages;
      }),
      copyOfflineThemeAssets(deps).then(() => {
        dThemes = Date.now() - t0Pages;
      }),
    ];
    await Promise.all(branches);
    subT.lap("parallel");
    console.log(`  offline.redirects (concurrent): ${dRedirects} ms`);
    console.log(`  offline.statics (concurrent): ${dStatics} ms`);
    console.log(`  offline.themeAssets (concurrent): ${dThemes} ms`);
  } else {
    await Promise.all([
      writeOfflineRedirects(auxStats?.redirects?.stubs ?? [], deps),
      copyOfflineStatics(staticFiles, deps),
      copyOfflineThemeAssets(deps),
    ]);
  }

  return { ...deps.counters, jtdPatches, subT, checkStubs: deps.checkStubs };
}

// The state the URL rewrite reads: the site-paths Set, the online tree's
// (`website`, for the files only the website holds), the resolution caches,
// and the base URL and exclusions from the site config.
function buildOfflineState(site, destRoot, sitePaths, onlineSitePaths) {
  const excludePatterns = Array.isArray(site.config?.offline_exclude) ? site.config.offline_exclude.map(String) : [];
  return {
    destRoot,
    sitePaths,
    website: websiteOf(site.config, onlineSitePaths),
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

// §5.3  writeOfflineRedirects -- rewrite the four <site.url><path>
// occurrences in each stub.
async function writeOfflineRedirects(stubs, deps) {
  const { offlineRoot } = deps;
  await runLimited(stubs, LIMIT, async (s) => {
    const html = deriveOfflineRedirect(s, deps);
    // --check: the rewritten stub only exists here. The link check
    // needs it -- 290 stubs carry 580 link occurrences, and skipping
    // them would make the fused pass check strictly less than the
    // standalone script does.
    if (deps.checkStubs) deps.checkStubs.push({ destPath: s.destPath, html });
    await writeFileMkdirp(path.join(offlineRoot, s.destPath), html);
    deps.counters.redirects += 1;
  });
}

// §5.4  copyOfflineStatics -- mirror staticFiles[] minus offline_exclude.
async function copyOfflineStatics(staticFiles, deps) {
  const { offlineRoot, excludePatterns, counters } = deps;
  await runLimited(staticFiles, LIMIT, async (file) => {
    const destRel = posix(file.destRel);
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
  const { destRoot, offlineRoot, counters, staticDestRels } = deps;
  const themeRoot = path.join(destRoot, "assets");
  if (!existsSync(themeRoot)) return;

  const themeEntries = await collectThemeFiles(themeRoot);

  await runLimited(themeEntries, LIMIT, async (e) => {
    if (e.isJtdJs) return;
    if (e.isCombinedCss) return;
    const relAsset = "assets/" + e.relUnderAssets;
    // Already written by copyOfflineStatics -- see staticDestRels above.
    if (staticDestRels?.has(relAsset)) return;
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
// §G  just-the-docs.js patches (the search index's script, search-index.js,
// is written by the searchIndex task: builder/search-index.mjs)
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
  // Patched by _plugins/offlinify.rb for file:// compatibility, and for the
  // lazy load of the pre-built index (WIP.Search.md, "The pre-built index"):
  // initSearch() only defines how to load the index -- loadIndex() below --
  // and hands that to searchLoaded(), which wires up the search box right
  // away but doesn't call loadIndex() until the first keystroke. The online
  // copy fetches search-index.json, which browsers block under file://; here
  // it is a script that sets window.SEARCH_INDEX (search-index.js, the
  // entries and their index in one), added to the page then, so a page never
  // searched from loads nothing for it.
  function loadIndex(onSuccess, onError) {
    if (window.SEARCH_INDEX) {
      setTimeout(build, 0);
      return;
    }
    var script = document.createElement('script');
    script.src = (window.OFFLINE_SITE_ROOT || '') + 'assets/js/search-index.js';
    script.onload = function() { setTimeout(build, 0); };
    script.onerror = function() {
      // Removed, so that the next keystroke's retry adds it again.
      document.head.removeChild(script);
      console.log('Offlinify: search-index.js did not load');
      onError();
    };
    document.head.appendChild(script);

    function build() {
      try {
        var data = window.SEARCH_INDEX;
        var docs = data && data.docs;
        if (!docs || !data.index) {
          console.log('Offlinify: search-index.js set no index');
          onError();
          return;
        }
        // Rebuild each doc.url from doc.relUrl (no baseurl prefix) so
        // search-result clicks land on the right file regardless of
        // whatever baseurl the site was built with. Upstream sets
        // \`link.href = doc.url\`, so this is the value users navigate
        // to. Reading from doc.relUrl each time (not doc.url) keeps this
        // idempotent, since a failed load can retry and run it again.
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
        // The online copy's lunr patches and lunr.Index.load
        // (indexFromData()).
        onSuccess(indexFromData(data), docs);
      } catch (e) {
        console.log('Error loading search index: ' + e);
        onError();
      }
    }
  }

  searchLoaded(loadIndex);
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
        edits.push({
          start: node.start,
          end: node.end,
          replacement: JTD_INITSEARCH_FN_REPLACEMENT,
          label: "initSearch()",
        });
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
      "offline: AST walk found no initSearch() declaration in just-the-docs.js -- " + "offline search will not work.",
    );
  }
  return { js: out, patches, warnings };
}

// The offline nav.js: the whole tree with its links made relative as a
// page at the root has them. The script puts the page's OFFLINE_SITE_ROOT
// in front of each.
async function writeOfflineNavJs(site, deps) {
  const { rewritten, misses, missed } = rewriteHtml(
    renderFullNav(site),
    posixDirname("index.html"),
    fileDirSegsFromRel("index.html"),
    deps.sitePaths,
    deps.caches,
    deps.baseurl,
    deps.website,
  );
  if (misses) warnMisses(NAV_SCRIPT_REL, misses, missed);
  deps.counters.unresolved += misses;
  await writeFileMkdirp(path.join(deps.offlineRoot, NAV_SCRIPT_REL), navScript(rewritten));
}

// ---------------------------------------------------------------------------
// §H  Theme-asset walker
// ---------------------------------------------------------------------------

// §6.14  collectThemeFiles -- recursively walk _site/assets/.
async function collectThemeFiles(themeRoot) {
  const out = [];
  async function walk(relPath) {
    const dirents = await fs.readdir(path.join(themeRoot, relPath), { withFileTypes: true });
    for (const d of dirents) {
      const childRel = relPath === "" ? d.name : path.posix.join(relPath, d.name);
      if (d.isDirectory()) {
        await walk(childRel);
      } else if (d.isFile()) {
        out.push({
          relUnderAssets: childRel,
          srcAbs: path.join(themeRoot, childRel),
          isCss: childRel.endsWith(".css"),
          isCombinedCss: childRel === "css/just-the-docs-combined.css",
          isJtdJs: childRel === "js/just-the-docs.js",
        });
      }
    }
  }
  await walk("");
  return out;
}
