// Pure-compute offline URL-rewrite helpers --- no node:fs, worker-safe.
// Extracted from offline.mjs (Phase I of PLAN-scheduler-offline.md).
// cpu-worker.mjs (Phase III) will import these to run the per-page
// offline rewrite inside render workers, in parallel across CPUs.
//
// Sections:
//
//   §B  Site-paths set  (buildSitePathsSync, offlineExcluded,
//                        fnmatchPathname)
//   §C  URL resolution   (computeRelative, resolveRaw, computeRelUrl,
//                         buildSegs, decode, fileDirSegsFromRel,
//                         posixDirname, normalizeBaseurl, escapeRegExp,
//                         getPageCache)
//   §D  HTML rewrite     (stripSeo, rewriteHtml, injectSearchSetup,
//                         sliceNavBlock, NAV_OPEN_RE, NAV_CLOSE,
//                         NAV_PLACEHOLDER, deriveOfflinePageCached,
//                         deriveOfflinePage, SEO_BLOCK_RE, TITLE_RE,
//                         HTML_COMBINED_RE, JTD_SCRIPT_TAG_RE)
//   §E  CSS rewrite      (rewriteCss, CSS_URL_RE, deriveOfflineCss)
//   §F  Redirect-stub    (deriveOfflineRedirect)

// ---------------------------------------------------------------------------
// §B  Site-paths set
// ---------------------------------------------------------------------------

// Synchronous version of buildSitePaths. Takes an explicit themeAssetRels
// array (from enumerateVendoredThemeAssets in offline.mjs) instead of
// walking _site/assets/ --- so it can run before the output tree exists.
export function buildSitePathsSync(pages, staticFiles, excludePatterns, stubs, themeAssetRels) {
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
  for (const rel of themeAssetRels) {
    if (offlineExcluded(rel, excludePatterns)) continue;
    paths.add("/" + rel);
  }
  return paths;
}

// §6.5  offlineExcluded -- File.fnmatch(..., FNM_PATHNAME) semantics:
// `*` does NOT cross `/`, `**` does.
export function offlineExcluded(rel, patterns) {
  if (!patterns.length) return false;
  return patterns.some(pat => fnmatchPathname(pat, rel));
}

export function fnmatchPathname(pattern, str) {
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
export const PATH_SAFE_RE = /[^A-Za-z0-9\-_.~!$&'()*+,;=:@]/;
export const PATH_SAFE_CHAR_RE = /^[A-Za-z0-9\-_.~!$&'()*+,;=:@]$/;

// §6.3  computeRelative -- absolute URL → page-relative URL.
export function computeRelative(raw, fileSegs, sitePaths, caches, baseurl) {
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
export function resolveRaw(raw, sitePaths, baseurl) {
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
export function computeRelUrl(raw, fileSegs, sitePaths) {
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
export function buildSegs(sitePath) {
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
export function decode(s) {
  return s.replace(/(?:%[0-9A-Fa-f]{2})+/g, (m) => {
    const bytes = new Uint8Array(m.length / 3);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(m.slice(i * 3 + 1, i * 3 + 3), 16);
    }
    return new TextDecoder("utf-8").decode(bytes);
  });
}

// §6.11  fileDirSegsFromRel
export function fileDirSegsFromRel(rel) {
  const normalised = rel.replaceAll("\\", "/");
  const dir = posixDirname(normalised);
  if (dir === "." || dir === "") return [];
  return dir.split("/");
}

export function posixDirname(rel) {
  const normalised = rel.replaceAll("\\", "/");
  const idx = normalised.lastIndexOf("/");
  return idx === -1 ? "." : normalised.slice(0, idx);
}

// §6.12  normalizeBaseurl
export function normalizeBaseurl(raw) {
  let baseurl = String(raw ?? "").replace(/\/+$/, "");
  if (baseurl && !baseurl.startsWith("/")) baseurl = "/" + baseurl;
  return baseurl;
}

// §6.13  escapeRegExp
export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Hoist the per-file-dir inner cache so the per-match cost is one
// map lookup.
export function getPageCache(resultCache, fileDir) {
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

export const SEO_BLOCK_RE = /<!-- Begin Jekyll SEO tag.*?<!-- End Jekyll SEO tag -->/s;
export const TITLE_RE = /<title>.*?<\/title>/s;

// §6.2  stripSeo -- drop the jekyll-seo-tag block, keep its <title>.
export function stripSeo(html) {
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
export const HTML_COMBINED_RE = /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|\b(href|src)=(["'])(\/(?!\/)[^"']*|(?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\2/g;

// §6.6  rewriteHtml -- single regex pass over the HTML.
export function rewriteHtml(html, fileDir, fileSegs, sitePaths, caches, baseurl) {
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

export const JTD_SCRIPT_TAG_RE = /<script\s+src="([^"]*)just-the-docs\.js"/;

// §6.8  injectSearchSetup -- two <script> tags before the just-the-docs.js
// tag carry the per-page relative site-root and the lunr-index data load.
export function injectSearchSetup(html, fileSegs) {
  return html.replace(JTD_SCRIPT_TAG_RE, (match, prefix) => {
    const siteRoot = fileSegs.length === 0 ? "" : "../".repeat(fileSegs.length);
    return `<script>window.OFFLINE_SITE_ROOT="${siteRoot}";</script>\n` +
      `<script src="${prefix}search-data.js"></script>` +
      match;
  });
}

export const NAV_OPEN_RE = /<nav aria-label="Main" id="site-nav"[^>]*>/;
export const NAV_CLOSE = "</nav>";

// Slice the sidebar nav block out of an HTML page. Returns the literal
// `<nav ...>...</nav>` substring, or null if the page doesn't carry
// the expected sidebar shape (in which case the cache entry is skipped
// for the source dir and subsequent pages fall back to the full path).
export function sliceNavBlock(html) {
  const m = html.match(NAV_OPEN_RE);
  if (!m) return null;
  const start = m.index;
  const end = html.indexOf(NAV_CLOSE, start);
  if (end === -1) return null;
  return html.slice(start, end + NAV_CLOSE.length);
}

// Placeholder spliced in place of the cached input nav while
// deriveOfflinePage runs. An HTML comment so it never collides with
// the three alternatives in HTML_COMBINED_RE (<code> / <pre> /
// href|src=), the SEO-block regex (different prefix), the JTD script
// tag regex (different prefix), or any other rewrite step.
export const NAV_PLACEHOLDER = "<!--TBDOCS_NAV_CACHE_-->";

// Cache-consulting wrapper around deriveOfflinePage. On hit:
// substitutes the cached input slice with a placeholder, runs the
// rewrite over the ~80kB-smaller string, splices the cached output
// back in. On miss (no cache entry for the source dir OR the input
// slice doesn't match byte-for-byte): falls back to the full
// rewrite with a warning.
export function deriveOfflinePageCached(page, deps) {
  const destDir = posixDirname(page.destPath);
  const cached = deps.navCache?.get(destDir);
  if (!cached) return deriveOfflinePage(page, deps);

  const idx = page.html.indexOf(cached.input);
  if (idx === -1) {
    console.warn(
      `offline nav cache miss for ${page.srcRel}: ` +
      `nav block doesn't match first page in ${destDir}; ` +
      `falling back to full rewrite`,
    );
    return deriveOfflinePage(page, deps);
  }

  const stubbed = page.html.slice(0, idx) + NAV_PLACEHOLDER +
                  page.html.slice(idx + cached.input.length);
  const stubbedPage = { ...page, html: stubbed };
  const { html: stubbedOut, misses } = deriveOfflinePage(stubbedPage, deps);
  const out = stubbedOut.replace(NAV_PLACEHOLDER, cached.output);
  return { html: out, misses };
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

// ---------------------------------------------------------------------------
// §E  CSS rewrite pipeline
// ---------------------------------------------------------------------------

export const CSS_URL_RE = /url\(\s*(["']?)(\/(?!\/)[^"'()\s]*)\1\s*\)/g;

// §6.7  rewriteCss -- url(/...) → page-relative.
export function rewriteCss(css, fileDir, fileSegs, sitePaths, caches, baseurl) {
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

// ---------------------------------------------------------------------------
// §F  Redirect-stub rewrite
// ---------------------------------------------------------------------------

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
