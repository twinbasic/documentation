// Phase 7 WRITE OFFLINE: mirror the rendered _site/ tree into
// _site-offline/, rewriting every URL so the tree opens cleanly under
// file:// with no HTTP server. See builder/PLAN-7.md for the full spec
// and docs/_plugins/offlinify.rb for the canonical Jekyll reference.
//
// One entry point: writeOffline(pages, staticFiles, site, destRoot,
// { auxStats }). Pure-compute derive helpers (buildOfflineState +
// derive*) are also exported for `_diff.mjs` / `_triage.mjs` to reuse
// without writing anything to disk.
//
// Internal sections:
//
//   §A  Top-level orchestration
//   §B  Site-paths set
//   §C  URL resolution           (computeRelative, computeRelUrl,
//                                  resolveRaw, buildSegs, decode)
//   §D  HTML rewrite pipeline    (stripSeo, rewriteHtml,
//                                  injectSearchSetup)
//   §E  CSS rewrite pipeline     (rewriteCss)
//   §F  Redirect-stub rewrite
//   §G  just-the-docs.js patches + search-data.js wrapper
//   §H  Static-file pass + theme-asset pass
//   §I  Pure-compute derive helpers (re-export surface for diff tools)

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  WRITE_LIMIT,
  isUnderProject,
  mkdirRec,
  runLimited,
  safeWrite,
  writeFileMkdirp,
} from "./write.mjs";

const OFFLINE_SUFFIX = "-offline";
const LIMIT = WRITE_LIMIT;

// ---------------------------------------------------------------------------
// §A  Top-level orchestration
// ---------------------------------------------------------------------------

export async function writeOffline(pages, staticFiles, site, destRoot, { auxStats } = {}) {
  if (!destRoot) {
    throw new Error("writeOffline requires a destRoot");
  }

  const stubs = auxStats?.redirects?.stubs ?? [];
  const state = await buildOfflineState(pages, staticFiles, site, destRoot, { stubs });
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

  await setupOfflineDest(deps.offlineRoot);

  const jtdSrc = path.join(destRoot, "assets/js/just-the-docs.js");
  const jtdDest = path.join(deps.offlineRoot, "assets/js/just-the-docs.js");
  const jtdPatches = await patchJustTheDocsJs(jtdSrc, jtdDest);
  await writeSearchDataJs(
    path.join(deps.offlineRoot, "assets/js/search-data.js"),
    auxStats?.search?.json ?? null,
  );

  await Promise.all([
    writeOfflinePages(pages, deps),
    writeOfflineRedirects(auxStats?.redirects?.stubs ?? [], deps),
    copyOfflineStatics(staticFiles, deps),
    copyOfflineThemeAssets(deps),
    copyOfflineSearchData(auxStats?.search?.json ?? null, deps),
  ]);

  return { ...deps.counters, jtdPatches };
}

// Pure-compute state assembly. Shared by the writer (writeOffline) and
// the diff tools (`_diff.mjs --offline`, `_triage.mjs auditOffline`).
// Reads destRoot/assets/ to seed the URL resolver's site-paths Set with
// the theme files Phase 5 copied -- those don't live in staticFiles[].
// `stubs` (optional) is the redirect-stub list from Phase 6; their
// destinations land in sitePaths so a page-relative link like
// `LBound` resolves through the stub at `tB/Core/LBound.html`.
export async function buildOfflineState(pages, staticFiles, site, destRoot, { stubs = [] } = {}) {
  const excludePatterns = Array.isArray(site.config?.offline_exclude)
    ? site.config.offline_exclude.map(String)
    : [];
  return {
    destRoot,
    sitePaths: await buildSitePaths(pages, staticFiles, destRoot, excludePatterns, stubs),
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
async function writeOfflinePages(pages, deps) {
  const { offlineRoot } = deps;
  const writable = pages.filter(p => p.html !== undefined);

  await runLimited(writable, LIMIT, async (page) => {
    const { html, misses } = deriveOfflinePage(page, deps);
    const dest = path.join(offlineRoot, page.destPath);
    await writeFileMkdirp(dest, html);
    deps.counters.html += 1;
    deps.counters.unresolved += misses;
  });
}

// Pure-compute: apply strip + URL rewrite + script injection to a
// single rendered page. Returns `{ html, misses }`. The page must
// have `page.html !== undefined`. The state's caches are mutated for
// per-build reuse; pass a fresh state if cache pollution across pages
// is a concern (see _diff.mjs's per-call buildOfflineState).
export function deriveOfflinePage(page, state) {
  const { sitePaths, caches, baseurl } = state;
  const fileDir = posixDirname(page.destPath);
  const fileSegs = fileDirSegsFromRel(page.destPath);
  let html = page.html;
  html = stripSeo(html);
  const { rewritten, misses } = rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl);
  html = rewritten;
  html = injectSearchSetup(html, fileSegs);
  return { html, misses };
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

// Pure-compute: rewrite the absolute <site.url>/<path> URLs in a single
// redirect stub. Returns the rewritten HTML. With no site.url configured,
// returns the stub verbatim.
export function deriveOfflineRedirect(stub, state) {
  const { sitePaths, caches, baseurl, siteUrl } = state;
  if (!siteUrl) return stub.html;

  const siteUrlEsc = escapeRegExp(siteUrl);
  const prefixRe = new RegExp(`${siteUrlEsc}(/[^"' >]*)`, "g");

  const fileDir = posixDirname(stub.destPath);
  const fileSegs = fileDirSegsFromRel(stub.destPath);
  const pageCache = getPageCache(caches.result, fileDir);

  return stub.html.replace(prefixRe, (match, raw) => {
    let rel = pageCache.get(raw);
    if (rel === undefined) {
      rel = computeRelative(raw, fileSegs, sitePaths, caches, baseurl);
      pageCache.set(raw, rel);
    }
    return rel ?? match;
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

// Pure-compute: rewrite `url(/...)` references in a single CSS file.
// `themeRel` is the file's path relative to <destRoot>/ (e.g.
// "assets/css/just-the-docs-combined.css"). Returns `{ css, misses }`.
export function deriveOfflineCss(cssIn, themeRel, state) {
  const { sitePaths, caches, baseurl } = state;
  const fileDir = posixDirname(themeRel);
  const fileSegs = fileDirSegsFromRel(themeRel);
  const { rewritten, misses } = rewriteCss(cssIn, fileDir, fileSegs, sitePaths, caches, baseurl);
  return { css: rewritten, misses };
}

// §5.6  copyOfflineSearchData -- verbatim copy of search-data.json.
async function copyOfflineSearchData(jsonBytes, deps) {
  if (jsonBytes == null) return;
  const dest = path.join(deps.offlineRoot, "assets/js/search-data.json");
  await writeFileMkdirp(dest, jsonBytes);
  deps.counters.assets += 1;
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
  // Defensive: the search-data.json Phase 6 writes isn't in pages[]
  // or staticFiles[]; add it so a stray link from somewhere resolves
  // instead of becoming an unresolved miss.
  paths.add("/assets/js/search-data.json");
  return paths;
}

// §6.5  offlineExcluded -- File.fnmatch(..., FNM_PATHNAME) semantics:
// `*` does NOT cross `/`, `**` does.
function offlineExcluded(rel, patterns) {
  if (!patterns.length) return false;
  return patterns.some(pat => fnmatchPathname(pat, rel));
}

function fnmatchPathname(pattern, str) {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") { re += ".*"; i++; }
      else { re += "[^/]*"; }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|[]{}\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re).test(str);
}

// ---------------------------------------------------------------------------
// §C  URL resolution
// ---------------------------------------------------------------------------

// Chars safe in a URL path segment (RFC 3986 unreserved + sub-delims that
// don't need encoding in a path).
const PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/;
const PATH_SAFE_CHAR_RE = /^[A-Za-z0-9\-_.~!$&'()*+,;=:@]$/;

// §6.3  computeRelative -- absolute URL → page-relative URL.
function computeRelative(raw, fileSegs, sitePaths, caches, baseurl) {
  let resolved = caches.rawResolution.get(raw);
  if (resolved === undefined) {
    resolved = resolveRaw(raw, sitePaths, baseurl);
    caches.rawResolution.set(raw, resolved);
  }
  const [sep, tail, sitePath] = resolved;
  if (sitePath === null) return null;

  let segCacheEntry = caches.seg.get(sitePath);
  if (segCacheEntry === undefined) {
    segCacheEntry = buildSegs(sitePath);
    caches.seg.set(sitePath, segCacheEntry);
  }
  const [decodedSegs, encodedSegs] = segCacheEntry;

  let common = 0;
  const fsLen = fileSegs.length;
  const tsLen = decodedSegs.length;
  while (common < fsLen && common < tsLen && fileSegs[common] === decodedSegs[common]) {
    common++;
  }

  const ascend = "../".repeat(fsLen - common);
  const descend = encodedSegs.slice(common).join("/");
  let rel = ascend + descend;
  if (rel === "") rel = "./";
  return rel + sep + tail;
}

// File-dir-independent half of computeRelative.
function resolveRaw(raw, sitePaths, baseurl) {
  const splitIdx = raw.search(/[?#]/);
  const pathPart = splitIdx === -1 ? raw : raw.slice(0, splitIdx);
  const sep = splitIdx === -1 ? "" : raw[splitIdx];
  const tail = splitIdx === -1 ? "" : raw.slice(splitIdx + 1);
  let fsPath = decode(pathPart);

  if (baseurl) {
    if (fsPath === baseurl) fsPath = "/";
    else if (fsPath.startsWith(baseurl + "/")) fsPath = fsPath.slice(baseurl.length);
  }

  let candidates;
  if (fsPath.endsWith("/")) {
    candidates = [fsPath, fsPath + "index.html"];
  } else if (fsPath.includes(".")) {
    candidates = [fsPath, fsPath + "/index.html"];
  } else {
    candidates = [fsPath, fsPath + ".html", fsPath + "/index.html"];
  }
  let sitePath = null;
  for (const c of candidates) {
    if (sitePaths.has(c)) { sitePath = c; break; }
  }
  return [sep, tail, sitePath];
}

// §6.4  computeRelUrl -- page-relative URL → page-relative URL with the
// .html / /index.html / "" suffix that makes it resolve under file://.
function computeRelUrl(raw, fileSegs, sitePaths) {
  const splitIdx = raw.search(/[?#]/);
  const pathPart = splitIdx === -1 ? raw : raw.slice(0, splitIdx);
  const sep = splitIdx === -1 ? "" : raw[splitIdx];
  const tail = splitIdx === -1 ? "" : raw.slice(splitIdx + 1);
  if (pathPart === "") return null;

  const decoded = decode(pathPart);
  const trailingSlash = decoded.endsWith("/");
  const stack = [...fileSegs];
  for (const seg of decoded.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }

  let probePath = "/" + stack.join("/");
  if (trailingSlash && !probePath.endsWith("/")) probePath += "/";

  let candidates;
  if (probePath.endsWith("/")) {
    candidates = [["", probePath], ["index.html", probePath + "index.html"]];
  } else if (probePath.includes(".")) {
    candidates = [["", probePath], ["/index.html", probePath + "/index.html"]];
  } else {
    candidates = [["", probePath], [".html", probePath + ".html"], ["/index.html", probePath + "/index.html"]];
  }

  for (const [suffix, full] of candidates) {
    if (sitePaths.has(full)) return pathPart + suffix + sep + tail;
  }
  return null;
}

// Cached decoded/encoded segments for a site-rooted path.
function buildSegs(sitePath) {
  const decoded = sitePath.slice(1).split("/");
  const encoded = decoded.map(seg => {
    if (!PATH_SAFE_RE.test(seg)) return seg;
    // Encode per UTF-8 byte so non-ASCII characters in future content
    // round-trip correctly.
    const bytes = new TextEncoder().encode(seg);
    let out = "";
    for (const b of bytes) {
      if (b < 0x80 && PATH_SAFE_CHAR_RE.test(String.fromCharCode(b))) {
        out += String.fromCharCode(b);
      } else {
        out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
      }
    }
    return out;
  });
  return [decoded, encoded];
}

// Percent-decode a URL path (sequences of %XX bytes interpreted as UTF-8).
function decode(s) {
  return s.replace(/(?:%[0-9A-Fa-f]{2})+/g, (m) => {
    const bytes = new Uint8Array(m.length / 3);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(m.slice(i * 3 + 1, i * 3 + 3), 16);
    }
    return new TextDecoder("utf-8").decode(bytes);
  });
}

// §6.11  fileDirSegsFromRel
function fileDirSegsFromRel(rel) {
  const normalised = rel.replaceAll("\\", "/");
  const dir = posixDirname(normalised);
  if (dir === "." || dir === "") return [];
  return dir.split("/");
}

function posixDirname(rel) {
  const normalised = rel.replaceAll("\\", "/");
  const idx = normalised.lastIndexOf("/");
  return idx === -1 ? "." : normalised.slice(0, idx);
}

// §6.12  normalizeBaseurl
function normalizeBaseurl(raw) {
  let baseurl = String(raw ?? "").replace(/\/+$/, "");
  if (baseurl && !baseurl.startsWith("/")) baseurl = "/" + baseurl;
  return baseurl;
}

// §6.13  escapeRegExp
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Hoist the per-file-dir inner cache so the per-match cost is one
// map lookup.
function getPageCache(resultCache, fileDir) {
  let pageCache = resultCache.get(fileDir);
  if (!pageCache) {
    pageCache = new Map();
    resultCache.set(fileDir, pageCache);
  }
  return pageCache;
}

// ---------------------------------------------------------------------------
// §D  HTML rewrite pipeline
// ---------------------------------------------------------------------------

const SEO_BLOCK_RE = /<!-- Begin Jekyll SEO tag.*?<!-- End Jekyll SEO tag -->/s;
const TITLE_RE = /<title>.*?<\/title>/s;

// §6.2  stripSeo -- drop the jekyll-seo-tag block, keep its <title>.
function stripSeo(html) {
  if (!html.includes("<!-- Begin Jekyll SEO tag")) return html;
  return html.replace(SEO_BLOCK_RE, (block) => {
    const titleMatch = block.match(TITLE_RE);
    return titleMatch ? titleMatch[0] : "";
  });
}

// Combined regex: three top-level alternatives -- <code> block, <pre>
// block, or a real href|src attribute carrying either an absolute or
// page-relative URL. The code/pre alternatives consume their bodies
// atomically so href/src matches inside code samples are skipped.
const HTML_COMBINED_RE = /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|\b(href|src)=(["'])(\/(?!\/)[^"']*|(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2/g;

// §6.6  rewriteHtml -- single regex pass over the HTML.
function rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl) {
  let misses = 0;
  const pageCache = getPageCache(caches.result, fileDir);

  const rewritten = html.replace(HTML_COMBINED_RE, (match, attrName, quote, rawUrl) => {
    if (attrName === undefined) {
      // <code> or <pre> block; leave verbatim.
      return match;
    }
    let rel = pageCache.get(rawUrl);
    if (rel === undefined) {
      rel = rawUrl.startsWith("/")
        ? computeRelative(rawUrl, fileSegs, sitePaths, caches, baseurl)
        : computeRelUrl(rawUrl, fileSegs, sitePaths);
      pageCache.set(rawUrl, rel);
    }
    if (rel === null) {
      misses++;
      return match;
    }
    if (rel === rawUrl) {
      // File already correct at the relative path (rare).
      return match;
    }
    return `${attrName}=${quote}${rel}${quote}`;
  });

  return { rewritten, misses };
}

const JTD_SCRIPT_TAG_RE = /<script\s+src="([^"]*)just-the-docs\.js"/;

// §6.8  injectSearchSetup -- two <script> tags before the just-the-docs.js
// tag carry the per-page relative site-root and the lunr-index data load.
function injectSearchSetup(html, fileSegs) {
  return html.replace(JTD_SCRIPT_TAG_RE, (match, prefix) => {
    const siteRoot = fileSegs.length === 0 ? "" : "../".repeat(fileSegs.length);
    return `<script>window.OFFLINE_SITE_ROOT="${siteRoot}";</script>\n` +
      `<script src="${prefix}search-data.js"></script>` +
      match;
  });
}

// ---------------------------------------------------------------------------
// §E  CSS rewrite pipeline
// ---------------------------------------------------------------------------

const CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/g;

// §6.7  rewriteCss -- url(/...) → page-relative.
function rewriteCss(css, fileDir, fileSegs, sitePaths, caches, baseurl) {
  let misses = 0;
  const pageCache = getPageCache(caches.result, fileDir);

  const rewritten = css.replace(CSS_URL_RE, (match, quote, rawUrl) => {
    let rel = pageCache.get(rawUrl);
    if (rel === undefined) {
      rel = computeRelative(rawUrl, fileSegs, sitePaths, caches, baseurl);
      pageCache.set(rawUrl, rel);
    }
    if (rel === null) {
      misses++;
      return match;
    }
    return `url(${quote}${rel}${quote})`;
  });

  return { rewritten, misses };
}

// ---------------------------------------------------------------------------
// §G  just-the-docs.js patches + search-data.js wrapper
// ---------------------------------------------------------------------------

const JTD_NAVLINK_RE = /function navLink\(\) \{[\s\S]*?return null; \/\/ avoids `undefined`\s*\}/;
const JTD_INITSEARCH_FN_RE = /function initSearch\(\) \{[\s\S]*?request\.send\(\);\s*\}/;

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
export function deriveOfflineJtdJs(src) {
  let out = src;
  const patches = [];
  const warnings = [];

  let next = out.replace(JTD_NAVLINK_RE, JTD_NAVLINK_REPLACEMENT);
  if (next !== out) {
    patches.push("navLink()");
    out = next;
  } else {
    warnings.push(
      "offline: could not locate navLink() in just-the-docs.js -- " +
      "nav-active detection will be broken under file://. Update " +
      "JTD_NAVLINK_RE in builder/offline.mjs.",
    );
  }

  next = out.replace(JTD_INITSEARCH_FN_RE, JTD_INITSEARCH_FN_REPLACEMENT);
  if (next !== out) {
    patches.push("initSearch()");
    out = next;
  } else {
    warnings.push(
      "offline: could not locate initSearch() in just-the-docs.js -- " +
      "offline search will not work. Update JTD_INITSEARCH_FN_RE in " +
      "builder/offline.mjs.",
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
// <script src=> can load them under file://.
export function deriveOfflineSearchDataJs(jsonBytes) {
  return `window.SEARCH_DATA = ${jsonBytes};\n`;
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
