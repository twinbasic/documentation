// The link checker's pure core: extraction, resolution, the cross-file
// checks and the reporters. Everything here works on strings and an
// existence oracle -- nothing reads the filesystem, nothing walks a
// directory, nothing knows where the HTML came from.
//
// Two front ends share it:
//
//   scripts/check_links.mjs   reads HTML off disk and stats the disk.
//                             Works against any tree, including one this
//                             build did not produce.
//   builder/ (--check)        hands it the HTML the build already has in
//                             worker memory, and an index built from the
//                             build's own output records.
//
// The module lives in builder/ rather than scripts/lib/ and the
// dependency runs script -> builder, never the reverse. Extraction runs
// on worker threads in the build's hot path; importing across into
// scripts/ would drag the checks' dependency tree onto every lane's cold
// boot. (scripts/lib/axe-scan.mjs stays where it is for the same reason
// read the other way -- it owns puppeteer, which must never enter the
// build graph.)
//
// htmlparser2 is a static import here and this module is loaded
// dynamically by the worker, so a build without --check never pays its
// ~23 ms import.

import * as fs from "node:fs";
import * as path from "node:path";
import { Parser } from "htmlparser2";

// ── Extraction ──────────────────────────────────────────────────────

// tag -> [attr, ...]. SAX walker dispatches on tag name; for each
// matching attr present on that tag, the value becomes one or more
// link references. Covers the standard set of HTML link-bearing
// attributes (href / src / srcset / longdesc / formaction / action /
// data / cite / poster).
const LINK_ATTR_TABLE = new Map([
  ["a",          ["href"]],
  ["area",       ["href"]],
  ["base",       ["href"]],
  ["link",       ["href"]],
  ["img",        ["src", "longdesc", "srcset"]],
  ["script",     ["src"]],
  ["iframe",     ["src"]],
  ["frame",      ["src"]],
  ["embed",      ["src"]],
  ["source",     ["src", "srcset"]],
  ["audio",      ["src"]],
  ["video",      ["src", "poster"]],
  ["track",      ["src"]],
  ["input",      ["src", "formaction"]],
  ["button",     ["formaction"]],
  ["form",       ["action"]],
  ["object",     ["data"]],
  ["blockquote", ["cite"]],
  ["q",          ["cite"]],
  ["del",        ["cite"]],
  ["ins",        ["cite"]],
]);

const SRCSET_ATTRS = new Set(["srcset"]);

// HTML5 void elements. htmlparser2 emits an *implied* close for each of
// these the moment the open tag ends, so --check-html has to let them
// through or it would report every <img> and <meta> on the site.
const HTML5_VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input",
  "link","meta","param","source","track","wbr",
]);

// Inside SVG and MathML, `<path/>` is ordinary markup and htmlparser2
// reports its close as implied (there is no explicit end tag to match).
// Everything inside these is skipped by --check-html; the close of the
// <svg> or <math> element itself is still checked, so an unclosed one
// is caught.
const FOREIGN_ROOTS = new Set(["svg", "math"]);

function* splitSrcset(value) {
  // `URL [descriptor], URL [descriptor], ...`. Descriptors cannot
  // contain commas, so a comma split is safe; each part's first
  // whitespace-separated token is the URL.
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const ws = trimmed.search(/\s/);
    const url = ws < 0 ? trimmed : trimmed.slice(0, ws);
    if (url) yield url;
  }
}

// One pass per document: extract every outgoing link AND every fragment-
// target id/name in a single parse. The Python original makes two
// passes (extract_links over all files, then extract_fragment_ids over
// the dedup'd fragment-target file set), but the per-file re-parse cost
// for the second pass outweighs the savings from skipping the ~25 % of
// files that no one links to with a fragment. captureIds=false is kept
// for completeness; the CLI always passes true when --include-fragments
// is on, which it always is in our use.
//
// forbidPrefixes is an array of string prefixes; any extracted link
// whose value starts with one of them, and whose tail past the prefix
// is non-empty and not just '/', is collected into the returned
// `forbidden` list. The bare prefix and prefix/ are exempt
// (intentional "go to live site" links).
//
// checkOpts: optional integrity-check flags object. When present, the
// SAX parse also collects:
//   checkHtml   -- tags the parser had to close for the document
//                  (htmlErrors); see the onclosetag handler
//   checkA11y   -- img missing alt, empty anchors, empty href (a11yErrors)
//   checkIds    -- duplicate id attributes on the same page (dupIds)
//   checkRemoteAssets -- <img src> pointing off-box (remoteAssets)
//   checkCanonical -- capture <link rel="canonical" href="..."> (canonicalHref)
//   captureRedirectStub -- detect <meta http-equiv="refresh"> (isRedirectStub)
export function extractFromHtml(html, captureIds, forbidPrefixes, checkOpts) {
  const links = [];
  const ids = captureIds ? new Set() : null;
  const hasForbid = forbidPrefixes && forbidPrefixes.length > 0;
  const forbidden = hasForbid ? [] : null;
  const checkForbid = hasForbid ? (url) => {
    for (const prefix of forbidPrefixes) {
      if (!url.startsWith(prefix)) continue;
      const tail = url.slice(prefix.length);
      if (tail === "" || tail === "/") return;
      forbidden.push({ prefix, url });
      return;
    }
  } : null;

  // Integrity state -- only allocated when requested.
  const doHtml      = checkOpts?.checkHtml  ?? false;
  const doA11y      = checkOpts?.checkA11y  ?? false;
  const doIds       = checkOpts?.checkIds   ?? false;
  const doCanonical = checkOpts?.checkCanonical ?? false;
  const doStub      = checkOpts?.captureRedirectStub ?? false;
  const doRemote    = checkOpts?.checkRemoteAssets ?? false;

  const htmlErrors = doHtml ? [] : null;
  let foreignDepth = 0;   // inside <svg>/<math>
  let atEof = false;      // set just before parser.end(), see below
  const a11yErrors = doA11y ? [] : null;
  const idMap      = doIds  ? new Map() : null;
  const remoteAssets = doRemote ? [] : null;

  // a11y anchor-tracking state.
  let inAnchor        = false;
  let anchorHasText   = false;
  let anchorHasChild  = false;  // any element child (img, svg, span, ...)
  let isRedirectStub  = false;
  let canonicalHref   = null;

  const handlers = {
    onopentag(name, attribs) {
      // ── existing: capture ids ──────────────────────────────────
      if (captureIds) {
        const id = attribs.id;
        if (id) ids.add(id);
        if (name === "a") {
          const nm = attribs.name;
          if (nm) ids.add(nm);
        }
      }
      // ── existing: extract links ────────────────────────────────
      const attrs = LINK_ATTR_TABLE.get(name);
      if (attrs) {
        for (const a of attrs) {
          const v = attribs[a];
          if (!v) continue;
          if (SRCSET_ATTRS.has(a)) {
            for (const u of splitSrcset(v)) {
              links.push(u);
              if (checkForbid) checkForbid(u);
            }
          } else {
            links.push(v);
            if (checkForbid) checkForbid(v);
          }
        }
      }

      // ── check-html: track foreign content ──────────────────────
      if (doHtml && FOREIGN_ROOTS.has(name)) foreignDepth++;

      // ── check-ids: count id attributes ────────────────────────
      if (idMap && attribs.id) {
        idMap.set(attribs.id, (idMap.get(attribs.id) ?? 0) + 1);
      }

      // ── check-remote-assets ────────────────────────────────────
      // An <img> whose src resolves off-box. Remote images cost a
      // network round trip on every page view, break the offline
      // mirror, and hard-fail the PDF book: book/lib/paged.browser.js
      // dropped async image loading, so an image that has not finished
      // loading when paged.js runs throws rather than degrading.
      if (doRemote && name === "img") {
        const src = attribs.src ?? "";
        if (/^(?:https?:)?\/\//i.test(src)) {
          remoteAssets.push({ tag: name, src });
        }
      }

      // ── check-a11y ─────────────────────────────────────────────
      if (doA11y) {
        // img without alt attribute (alt="" is valid for decorative images)
        if (name === "img" && !("alt" in attribs)) {
          a11yErrors.push({ type: "img-missing-alt", src: attribs.src ?? "" });
        }
        // empty href
        if (attribs.href === "") {
          a11yErrors.push({ type: "empty-href", tag: name });
        }
        // track anchor content for empty-anchor check
        if (name === "a") {
          inAnchor      = true;
          anchorHasText  = false;
          anchorHasChild = false;
        } else if (inAnchor) {
          anchorHasChild = true;  // any child element -- link carries content
        }
      }

      // ── redirect stub detection ────────────────────────────────
      if (doStub && name === "meta" &&
          (attribs["http-equiv"] ?? "").toLowerCase() === "refresh") {
        isRedirectStub = true;
      }

      // ── canonical URL capture ─────────────────────────────────
      if (doCanonical && name === "link" &&
          (attribs.rel ?? "").toLowerCase() === "canonical" &&
          attribs.href) {
        canonicalHref = attribs.href;
      }
    },
  };

  if (doA11y) {
    handlers.ontext = function(text) {
      if (inAnchor && text.trim()) anchorHasText = true;
    };
  }

  if (doHtml || doA11y) {
    // `isImplied` is htmlparser2's own answer to the question this
    // check is asking: false means the document contained a matching
    // end tag, true means the parser had to synthesise one. An earlier
    // version tracked its own tag stack and could never report
    // anything, because the parser had already repaired every
    // imbalance before the callback ran -- verified against ten
    // malformed shapes, all of which came back clean.
    //
    // Three implied closes are legitimate and filtered out: void
    // elements, anything inside <svg>/<math>, and self-closing tags
    // (which only occur in foreign content, so the same filter covers
    // them). What is left is an element the document opened and did not
    // close -- either at all, or before something else closed around it.
    //
    // A stray `</section>` with nothing open is still not reported:
    // htmlparser2 drops close tags for elements that were never opened
    // without telling anyone, so catching those would need tokenizer
    // access. They are also the harmless case -- the rendered DOM is
    // unaffected.
    handlers.onclosetag = function(name, isImplied) {
      if (doHtml) {
        if (FOREIGN_ROOTS.has(name)) foreignDepth--;
        if (isImplied && !HTML5_VOID_ELEMENTS.has(name) && foreignDepth === 0) {
          htmlErrors.push({
            type: atEof ? "unclosed-tag" : "closed-early",
            tag: name,
          });
        }
      }
      // check-a11y: end-of-anchor check
      if (doA11y && name === "a" && inAnchor) {
        if (!anchorHasText && !anchorHasChild) {
          a11yErrors.push({ type: "empty-anchor" });
        }
        inAnchor = false;
      }
    };
  }

  const parser = new Parser(handlers);
  parser.write(html);
  // Everything still open when the document runs out is closed during
  // end(), so this flag is what separates "never closed" from "closed
  // early by something else". write() takes the whole document in one
  // go, so it never emits an end-of-input close itself.
  atEof = true;
  parser.end();

  // Collect duplicate IDs.
  const dupIds = idMap ? [] : null;
  if (idMap) {
    for (const [id, count] of idMap) {
      if (count > 1) dupIds.push({ id, count });
    }
  }

  return { links, ids, forbidden, htmlErrors, a11yErrors, dupIds, remoteAssets, isRedirectStub, canonicalHref };
}

// ── URL-path helpers ────────────────────────────────────────────────

// Derive the canonical URL path for an HTML file given its path
// relative to the site root (forward slashes). Strips the .html
// extension for parity with pages that have explicit permalinks.
//   "index.html"                     -> "/"
//   "tB/Core/Const.html"             -> "/tB/Core/Const"
//   "tB/Packages/VB/CheckBox/index.html" -> "/tB/Packages/VB/CheckBox/"
export function deriveUrlPath(relPath) {
  const fwd = relPath.replace(/\\/g, "/");
  if (fwd === "index.html") return "/";
  if (fwd.endsWith("/index.html")) return "/" + fwd.slice(0, -"index.html".length);
  if (fwd.endsWith(".html")) return "/" + fwd.slice(0, -".html".length);
  return "/" + fwd;
}

// Strip a trailing .html so sitemap/search URLs from pages without
// explicit permalink (which keep the .html extension) compare equal
// to deriveUrlPath output. Idempotent on already-clean paths.
function stripHtmlSuffix(p) {
  return p.endsWith(".html") ? p.slice(0, -".html".length) : p;
}

// URL-decode (sitemap entries percent-encode spaces and Unicode;
// deriveUrlPath produces literal characters from the filename).
function decodePath(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

// Coerce a base-path arg into the canonical '/prefix' form (leading
// slash, no trailing slash). Empty input maps to empty string.
export function normalizeBasePath(s) {
  if (!s) return "";
  let v = s.trim().replace(/\/+$/, "");
  if (!v) return "";
  if (!v.startsWith("/")) v = "/" + v;
  return v;
}

// Lop a base-path prefix off an absolute URL path, if it matches.
//
//   '/twinBASIC-docs/foo'    -> '/foo'     (prefix + /...)
//   '/twinBASIC-docs'        -> '/'        (bare prefix, treat as root)
//   '/twinBASIC-docs-other'  -> unchanged  (only strip on '/' or end)
//   '/foo'                   -> unchanged  (no prefix match)
export function stripBasePath(pathStr, basePath) {
  if (!basePath) return pathStr;
  if (pathStr === basePath) return "/";
  if (pathStr.startsWith(basePath + "/")) return pathStr.slice(basePath.length);
  return pathStr;
}

// True when basePath is set and pathStr is a root-absolute URL that
// is NOT within the basePath. On a real subpath deploy such a URL
// would resolve outside the deployment and 404, even though it may
// still find a file on disk under --root-dir. The resolver flags
// these so they're reported as broken rather than silently resolving.
export function isOutsideBasePath(pathStr, basePath) {
  if (!basePath) return false;
  if (!pathStr.startsWith("/")) return false;
  if (pathStr === basePath) return false;
  if (pathStr.startsWith(basePath + "/")) return false;
  return true;
}

// Sentinel target for off-base-path URLs. Angle brackets keep it
// from colliding with any real on-disk path on Windows or POSIX.
export const OUTSIDE_BASEPATH_MARKER = "<<<outside-base-path>>>";

// ── Resolution ──────────────────────────────────────────────────────

// Resolve href -> [normalizedTargetStr, isDirLink, fragment].
// Returns null for schemes/netlocs we skip. Uses only string ops (no
// filesystem syscalls).
//
// isDirLink captures whether the URL ended in '/' before normalization.
// path.normalize strips trailing slashes, but the distinction matters
// for resolution: 'foo/' must resolve as a directory (try index files),
// while 'foo' falls through to fallback extensions ('foo.html') if no
// file/dir 'foo' exists.
//
// basePath is an absolute-URL prefix to strip before resolving against
// rootStr -- e.g. '/twinBASIC-docs' to handle a Jekyll --baseurl build.
// Only applied to absolute URLs; relative paths are unaffected.
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/;

export function resolve(href, sourceDir, sourcePath, rootStr, basePath) {
  let pathPart, frag;
  const hashIdx = href.indexOf("#");
  if (hashIdx >= 0) {
    pathPart = href.slice(0, hashIdx);
    frag = href.slice(hashIdx + 1);
  } else {
    pathPart = href;
    frag = null;
  }
  if (!pathPart) {
    return [sourcePath, false, frag];
  }

  // Cheap scheme/netloc check. Matches Python's urlparse heuristic:
  // a colon in the first 16 chars OR a leading "//" triggers the URL
  // path; if there is a real scheme or netloc, the link is skipped.
  const colon = pathPart.indexOf(":");
  if (pathPart.startsWith("//")) return null;
  if (colon >= 0 && colon < 16 && SCHEME_RE.test(pathPart)) return null;
  let pathStr = pathPart;

  if (pathStr.indexOf("%") >= 0) {
    try { pathStr = decodeURIComponent(pathStr); } catch { /* keep raw */ }
  }

  const isDirLink = pathStr.endsWith("/") || pathStr.endsWith("/.");

  let target;
  if (pathStr.startsWith("/")) {
    if (isOutsideBasePath(pathStr, basePath)) {
      // Browser-semantics check: would 404 on a subpath deploy. Return
      // a sentinel target so the existing "broken" pipeline picks it
      // up; the reporter detects the marker to emit a clearer reason.
      target = OUTSIDE_BASEPATH_MARKER + pathStr;
    } else {
      const stripped = stripBasePath(pathStr, basePath);
      target = path.normalize(path.join(rootStr, stripped.replace(/^\/+/, "")));
    }
  } else {
    target = path.normalize(path.join(sourceDir, pathStr));
  }
  return [target, isDirLink, frag];
}

// ── Existence oracle ────────────────────────────────────────────────
//
// checkPath() asks two questions of the world -- is this a file, is this
// a directory -- and layers fallback extensions and index files on top.
// An oracle answers those two questions in whatever coordinate space
// resolve() produced. FsOracle is the filesystem; Phase 2 adds one
// backed by the build's own output records.

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

export const ABSENT = 0, FILE = 1, DIRECTORY = 2;

export function FsOracle() {
  return {
    isFile(p) { const s = statSafe(p); return s !== null && s.isFile(); },
    // Both questions off one stat, since checkPath always wants to know
    // which of the two a target is. Keeping it on the interface lets an
    // index-backed oracle answer in one lookup too.
    stat(p)   {
      const s = statSafe(p);
      if (s === null) return ABSENT;
      return s.isFile() ? FILE : (s.isDirectory() ? DIRECTORY : ABSENT);
    },
  };
}

// An index of one output tree: the files it receives, plus every
// directory those files imply.
//
// Keys are built the way resolve() builds targets -- path.normalize over
// path.join(rootStr, ...) -- and with the *same* rootStr string, because
// runCheck deliberately keeps --root-dir in its caller-supplied shape.
// Get that wrong and lookups miss silently, which is why
// check_links_diff.mjs carries the `online-abs` case: the same tree with
// a relative and an absolute root must reach identical findings.
//
// Directories are derived rather than listed. Every directory in a
// freshly prepared output tree exists because something was written into
// it -- prepareDestinations() wipes all three roots before the build
// writes a byte, so nothing survives from a previous run and the derived
// set is complete, not an approximation.
export function buildTreeIndex(rootStr, relFiles) {
  const base = indexKey(rootStr === "" ? "." : rootStr);
  const files = new Set();
  const dirs = new Set();
  for (const rel of relFiles) {
    const abs = indexKey(path.join(base, rel));
    files.add(abs);
    let d = path.dirname(abs);
    while (!dirs.has(d)) {
      dirs.add(d);
      const parent = path.dirname(d);
      if (parent === d) break;
      d = parent;
    }
  }
  return { files, dirs, root: base };
}

// Canonical form for an index key. Two things a Set lookup needs that
// statSync() shrugs off, both found by check_links_diff.mjs rather than
// by reasoning:
//
//   * path.normalize() *preserves* a trailing separator, so a
//     directory-shaped link ('/Features/') resolves to a target string
//     ending in one while the index holds the bare path.
//   * resolve() returns the source path untouched for a bare '#' link,
//     so that target carries whatever separators the caller's argv had
//     -- forward slashes, where the index is built with native ones.
function indexKey(p) {
  let k = path.normalize(p);
  while (k.length > 1 && (k.endsWith(path.sep) || k.endsWith("/"))) {
    const trimmed = k.slice(0, -1);
    if (trimmed.endsWith(":")) break;   // a drive root, C:\ -- leave it
    k = trimmed;
  }
  return k;
}

export function IndexOracle(treeIndex) {
  const { files, dirs } = treeIndex;
  return {
    isFile(p) { return files.has(indexKey(p)); },
    stat(p) {
      const k = indexKey(p);
      return files.has(k) ? FILE : (dirs.has(k) ? DIRECTORY : ABSENT);
    },
  };
}

// Resolve a URL path string to an on-disk file by the same rules
// GitHub Pages applies at request time.
//
// A trailing-slash URL ('foo/') must resolve as a directory: try each
// indexFile in order, with '.' meaning 'accept the directory itself'.
// Fallback extensions never apply to dir-shaped links.
//
// A non-slash URL ('foo') tries the path as a file first, then as a dir
// (same index-file logic), then falls back to fallback extensions.
export function checkPath(targetStr, isDirLink, fallbackExts, indexFiles, oracle) {
  const kind = oracle.stat(targetStr);
  if (isDirLink) {
    if (kind !== DIRECTORY) return null;
    for (const idx of indexFiles) {
      if (idx === ".") return targetStr;
      const cand = path.join(targetStr, idx);
      if (oracle.isFile(cand)) return cand;
    }
    return null;
  }
  if (kind === FILE) return targetStr;
  if (kind === DIRECTORY) {
    for (const idx of indexFiles) {
      if (idx === ".") return targetStr;
      const cand = path.join(targetStr, idx);
      if (oracle.isFile(cand)) return cand;
    }
    return null;
  }
  for (const ext of fallbackExts) {
    const cand = targetStr + "." + ext;
    if (oracle.isFile(cand)) return cand;
  }
  return null;
}

// Resolve a batch of link occurrences and report which of them break.
//
// `occurrences` is the flat [srcPath, srcDir, href, ...] triple array.
// Everything is deduped twice over: once by (srcDir, href), because the
// same nav and footer links repeat across hundreds of pages from the
// same directory, and once by (target, isDir, frag), because 'foo' and
// 'foo#bar' share a path lookup.
//
// Fragments are settled against `localIds`, a Map<resolvedTarget,
// Set<id>>. With `deferFragments` the caller is telling us localIds is
// only partial -- a fragment whose target is absent comes back in
// `pendingFragments` for a later join rather than being reported broken.
// That is what lets a build worker settle same-page fragments (92 % of
// them) without leaving its lane.
export function resolveOccurrences(occurrences, oracle, {
  rootStr, basePath, fallbackExts, indexFiles,
  includeFragments, localIds, deferFragments = false, caches = null,
}) {
  // Memoize resolution by (sourceDir, href). Nested Map<srcDir,
  // Map<href, resolved>> avoids the per-occurrence composite-key
  // string allocation that a flat Map<srcDir+sep+href, _> would cost
  // (~793k of them on this site).
  //
  // A caller that runs this repeatedly over slices of one tree hands in
  // its own caches and keeps them across calls. That matters a great
  // deal: the build checks in 160 chunks of ~6 pages, and with
  // per-chunk caches the (srcDir, href) reuse that makes this pass
  // cheap -- the same nav and footer links on every page -- almost
  // entirely disappears. Measured, hoisting them is worth roughly 3x on
  // the resolve stage.
  const resolutionCache = caches?.resolution ?? new Map();
  const pathCache       = caches?.path       ?? new Map();
  // Same trick on the dedup side: Map<target, Map<isDirFrag, entry>>.
  // The inner key is a short string built from (isDir + (frag || ""))
  // -- no fresh allocation per occurrence beyond what JS would have
  // done anyway.
  const uniqueByTarget = new Map();
  const uniqueEntries = []; // flat list in insertion order for later loops

  // Stage timings, kept because check_links.mjs -v prints them and
  // they are how this pipeline's cost was attributed in the first place.
  const t0 = performance.now();

  for (let oi = 0; oi < occurrences.length; oi += 3) {
    const src = occurrences[oi], srcDir = occurrences[oi + 1], href = occurrences[oi + 2];
    let r;
    // A link with nothing before the '#' resolves to the *source page*,
    // so its result is not a function of (srcDir, href) and must not go
    // through the cache -- two pages in one directory would otherwise
    // share an entry and the second page's fragments would be checked
    // against the first page's ids. Harmless on this site, where the
    // same-page anchors are chrome that every page carries, but wrong,
    // and it blocks hoisting the cache across chunks. These are 2 % of
    // occurrences; resolving them uncached costs nothing.
    if (href === "" || href.charCodeAt(0) === 35 /* # */) {
      r = resolve(href, srcDir, src, rootStr, basePath);
    } else {
      let dirCache = resolutionCache.get(srcDir);
      if (!dirCache) { dirCache = new Map(); resolutionCache.set(srcDir, dirCache); }
      if (dirCache.has(href)) {
        r = dirCache.get(href);
      } else {
        r = resolve(href, srcDir, src, rootStr, basePath);
        dirCache.set(href, r);
      }
    }
    if (r === null) continue;
    const target = r[0], isDir = r[1], frag = r[2];
    let inner = uniqueByTarget.get(target);
    if (!inner) { inner = new Map(); uniqueByTarget.set(target, inner); }
    const innerKey = (isDir ? "1" : "0") + (frag === null ? "" : frag);
    let entry = inner.get(innerKey);
    if (!entry) {
      entry = { target, isDir, frag, resolved: undefined, sources: [] };
      inner.set(innerKey, entry);
      uniqueEntries.push(entry);
    }
    entry.sources.push(src, href);
  }

  const tResolve = performance.now();

  // De-dup (target, isDir) for existence checks: the inner-Map structure
  // already groups by target, so the per-target dir-flag check is at
  // most two lookups.
  for (const [target, inner] of uniqueByTarget) {
    let resolvedFile, resolvedDir;
    let computedFile = false, computedDir = false;
    for (const entry of inner.values()) {
      if (entry.isDir) {
        if (!computedDir) {
          resolvedDir = cachedCheckPath(pathCache, target, true, fallbackExts, indexFiles, oracle);
          computedDir = true;
        }
        entry.resolved = resolvedDir;
      } else {
        if (!computedFile) {
          resolvedFile = cachedCheckPath(pathCache, target, false, fallbackExts, indexFiles, oracle);
          computedFile = true;
        }
        entry.resolved = resolvedFile;
      }
    }
  }

  const tCheckPaths = performance.now();

  const fragmentTargets = new Set();
  if (includeFragments) {
    for (const entry of uniqueEntries) {
      if (entry.frag && entry.resolved) fragmentTargets.add(entry.resolved);
    }
  }

  const tFragments = performance.now();

  const broken = [];            // (src, href, reason) triples flattened
  const pendingFragments = [];  // { target, frag, sources } for the join
  // One key per *entry* that broke, so a chunked run can count unique
  // breakages globally: the same dead link on 400 pages is one finding,
  // and per-chunk counts would otherwise sum it 400 times.
  const brokenKeys = [];
  let brokenUniqueCount = 0;

  for (const entry of uniqueEntries) {
    if (entry.resolved === null) {
      brokenUniqueCount++;
      brokenKeys.push(entryKey(entry));
      const reason = entry.target.startsWith(OUTSIDE_BASEPATH_MARKER)
        ? `outside --base-path '${basePath}' (would 404 on subpath deploy)`
        : "target not found";
      const srcs = entry.sources;
      for (let i = 0; i < srcs.length; i += 2) broken.push(srcs[i], srcs[i + 1], reason);
      continue;
    }
    if (entry.frag && includeFragments) {
      // A resolved target may be a file nobody scanned (a directly
      // referenced asset that isn't *.html), in which case it has no
      // captured id set; treat as empty so the fragment check fails.
      const ids = localIds ? localIds.get(entry.resolved) : null;
      if (ids === undefined && deferFragments) {
        pendingFragments.push({
          target: entry.resolved, frag: entry.frag,
          isDir: entry.isDir, sources: entry.sources,
        });
        continue;
      }
      if (!ids || !ids.has(entry.frag)) {
        brokenUniqueCount++;
        brokenKeys.push(entryKey(entry));
        const reason = `fragment #${entry.frag} not found`;
        const srcs = entry.sources;
        for (let i = 0; i < srcs.length; i += 2) broken.push(srcs[i], srcs[i + 1], reason);
      }
    }
  }

  return {
    broken, brokenUniqueCount, brokenKeys, pendingFragments,
    uniqueCount: uniqueEntries.length,
    fragmentTargets,
    stages: {
      resolve:    tResolve - t0,
      checkPaths: tCheckPaths - tResolve,
      fragments:  tFragments - tCheckPaths,
      report:     performance.now() - tFragments,
    },
  };
}

// Nested Map<target, Map<isDir, resolved>>, same shape and for the same
// reason as the resolution cache: a chunked caller keeps it across calls
// so a target that 400 pages link to is looked up once per tree, not
// once per chunk. Within one call it is redundant with uniqueByTarget --
// the win is entirely cross-call.
function cachedCheckPath(pathCache, target, isDir, fallbackExts, indexFiles, oracle) {
  let byDir = pathCache.get(target);
  if (!byDir) { byDir = new Map(); pathCache.set(target, byDir); }
  if (byDir.has(isDir)) return byDir.get(isDir);
  const r = checkPath(target, isDir, fallbackExts, indexFiles, oracle);
  byDir.set(isDir, r);
  return r;
}

function entryKey(entry) {
  return `${entry.target} ${entry.isDir ? 1 : 0} ${entry.frag ?? ""}`;
}

// Settle the fragment references a chunked run could not decide locally.
// `idsByTarget` must be complete by the time this runs. Chunks overlap
// -- the same cross-page reference can come back from several of them --
// so the keys dedupe on the caller's side.
export function settleFragments(pendingFragments, idsByTarget) {
  const broken = [];
  const brokenKeys = [];
  let brokenUniqueCount = 0;
  for (const p of pendingFragments) {
    const ids = idsByTarget.get(p.target);
    if (ids && ids.has(p.frag)) continue;
    brokenUniqueCount++;
    brokenKeys.push(`${p.target} ${p.isDir ? 1 : 0} ${p.frag}`);
    const reason = `fragment #${p.frag} not found`;
    for (let i = 0; i < p.sources.length; i += 2) {
      broken.push(p.sources[i], p.sources[i + 1], reason);
    }
  }
  return { broken, brokenUniqueCount, brokenKeys };
}

// ── Cross-file checks ───────────────────────────────────────────────
//
// All three take content the caller already has plus a list of
// tree-relative POSIX paths, already filtered of redirect stubs. The
// EXCLUDE set is part of each check's definition and stays here.

const EXCLUDE = new Set(["book.html", "404.html"]);

// Every page (except the exclusions) should appear in sitemap.xml.
export function checkSitemap(xml, relFiles, basePath) {
  // Extract <loc> paths, stripping the scheme+host prefix, any
  // --base-path prefix (e.g. '/twinBASIC-docs' from a GitHub Pages
  // subpath deploy), and trailing .html (tbdocs uses .html for pages
  // without an explicit permalink; pages with permalinks omit it).
  const sitemapPaths = new Set();
  let siteRoot = null;
  for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const url = m[1].trim();
    if (!siteRoot) {
      const m2 = url.match(/^(https?:\/\/[^/]+)/);
      if (m2) siteRoot = m2[1];
    }
    const p = siteRoot ? url.slice(siteRoot.length) : url;
    sitemapPaths.add(stripHtmlSuffix(decodePath(stripBasePath(p || "/", basePath))));
  }

  const issues = [];
  for (const rel of relFiles) {
    if (EXCLUDE.has(path.posix.basename(rel))) continue;
    const urlPath = deriveUrlPath(rel);
    if (!sitemapPaths.has(urlPath)) issues.push(`${rel}: sitemap-missing: ${urlPath}`);
  }
  return issues;
}

// Every page (except the exclusions) should have at least one entry in
// search-data.json whose url matches the page's canonical path.
export function checkSearch(searchData, relFiles, basePath) {
  // Strip fragment part, --base-path prefix, and .html suffix; some
  // pages without explicit permalink keep .html; URLs are
  // percent-encoded for spaces / Unicode.
  const searchPageUrls = new Set(
    Object.values(searchData).map(e => stripHtmlSuffix(decodePath(stripBasePath((e.url ?? "").split("#")[0], basePath))))
  );

  const issues = [];
  for (const rel of relFiles) {
    if (EXCLUDE.has(path.posix.basename(rel))) continue;
    const urlPath = deriveUrlPath(rel);
    if (!searchPageUrls.has(urlPath)) issues.push(`${rel}: search-missing: ${urlPath}`);
  }
  return issues;
}

// Every page's <link rel="canonical" href="..."> must match the page's
// own deployment URL: `--base-path` + file-derived URL path.
//
// Catches both the "canonical missing baseurl" bug (canonical would 404
// on a subpath deploy) and the inverse "canonical includes baseurl on a
// root deploy". Ignores the canonical's scheme+host (the URL may
// legitimately point at a different host than the one hosting the file).
//
// `canonicalByRel` is a Map<relPath, canonicalHref>, stubs already
// filtered out.
export function checkCanonical(canonicalByRel, basePath) {
  const issues = [];
  for (const [rel, canonical] of canonicalByRel) {
    if (EXCLUDE.has(path.posix.basename(rel))) continue;
    const expected = (basePath || "") + deriveUrlPath(rel);

    let canonicalPath;
    try {
      const u = new URL(canonical, "https://placeholder.invalid/");
      canonicalPath = u.pathname;
    } catch {
      issues.push(`${rel}: canonical-malformed: '${canonical}'`);
      continue;
    }
    // Decode percent-encoded segments before comparison (deriveUrlPath
    // emits literal characters from the filename).
    canonicalPath = decodePath(canonicalPath);

    if (canonicalPath !== expected) {
      issues.push(`${rel}: canonical-mismatch: '${canonicalPath}' (expected '${expected}')`);
    }
  }
  return issues;
}

// ── Reporters ───────────────────────────────────────────────────────

// Merge broken + forbidden into a single per-source report so a file
// with both kinds of issue appears in one block, with the BROKEN /
// FORBIDDEN labels distinguishing them. Labels are padded to the wider
// of the two so href columns line up. Returns "" when there is nothing
// to say.
export function formatLinkReport(broken, forbiddenBySource) {
  if (!broken.length && !(forbiddenBySource && forbiddenBySource.size)) return "";

  const bySource = new Map();
  for (let i = 0; i < broken.length; i += 3) {
    const src = broken[i], href = broken[i + 1], reason = broken[i + 2];
    let set = bySource.get(src);
    if (!set) { set = new Set(); bySource.set(src, set); }
    set.add("E\0" + href + "\0" + reason);
  }
  if (forbiddenBySource) {
    for (const [src, fhits] of forbiddenBySource) {
      let set = bySource.get(src);
      if (!set) { set = new Set(); bySource.set(src, set); }
      for (const fh of fhits) {
        set.add(`F\0${fh.url}\0forbidden prefix '${fh.prefix}'`);
      }
    }
  }

  const lines = [];
  for (const src of [...bySource.keys()].sort()) {
    lines.push("");
    lines.push(`${src}:`);
    for (const item of [...bySource.get(src)].sort()) {
      const j1 = item.indexOf("\0");
      const j2 = item.indexOf("\0", j1 + 1);
      const kind = item.slice(0, j1);
      const href = item.slice(j1 + 1, j2);
      const reason = item.slice(j2 + 1);
      const label = kind === "F" ? "FORBIDDEN" : "BROKEN   ";
      lines.push(`  ${label}  ${href} -- ${reason}`);
    }
  }
  lines.push("");
  return lines.join("\n") + "\n";
}

// The findings strings both front ends diff are deliberately terse --
// see buildFindings / findingsFor. The report adds the part a reader
// needs to know what to do about it.
const HTML_ERROR_HINT = {
  "unclosed-tag":
    "the document never closed it",
  "closed-early":
    "something else closed around it, so the parser closed it first " +
    "(usually invalid nesting, e.g. a <div> inside a <p>)",
};

// Per-file html / a11y / ids / remote-asset findings. Returns
// { text, count }; text is "" when there is nothing to say.
export function formatIntegrityReport(integrityByFile) {
  const lines = [];
  let count = 0;
  if (integrityByFile && integrityByFile.size > 0) {
    for (const src of [...integrityByFile.keys()].sort()) {
      const { htmlErrors, a11yErrors, dupIds, remoteAssets } = integrityByFile.get(src);
      for (const e of htmlErrors ?? []) {
        lines.push(`${src}: html-${e.type}: <${e.tag}> -- ${HTML_ERROR_HINT[e.type]}`);
        count++;
      }
      for (const e of a11yErrors ?? []) {
        if (e.type === "img-missing-alt") {
          lines.push(`${src}: a11y-img-missing-alt: src=${e.src}`);
        } else if (e.type === "empty-anchor") {
          lines.push(`${src}: a11y-empty-anchor`);
        } else if (e.type === "empty-href") {
          lines.push(`${src}: a11y-empty-href: <${e.tag}>`);
        }
        count++;
      }
      for (const e of dupIds ?? []) {
        lines.push(`${src}: duplicate-id: '${e.id}' appears ${e.count} times`);
        count++;
      }
      for (const e of remoteAssets ?? []) {
        lines.push(`${src}: remote-asset: <${e.tag} src="${e.src}"> -- vendor it under the section's Images/ folder`);
        count++;
      }
    }
  }
  return { text: lines.length ? "\n" + lines.join("\n") + "\n" : "", count };
}
