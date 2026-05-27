# PLAN-6: Phase 6 — AUXILIARIES (`redirects.mjs`, `sitemap.mjs`, `search.mjs`)

Detailed implementation plan for the sixth phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the architecture overview),
[PLAN-1.md](PLAN-1.md) (DISCOVER), [PLAN-2.md](PLAN-2.md) (COMPUTE),
[PLAN-3.md](PLAN-3.md) (RENDER), [PLAN-4.md](PLAN-4.md) (TEMPLATE), and
[PLAN-5.md](PLAN-5.md) (WRITE ONLINE).

The AUXILIARIES phase has one job: emit the **secondary files that
support discovery and navigation** -- `sitemap.xml`, `robots.txt`, the
`redirect_from` stub HTML pages, and `assets/js/search-data.json`.
These don't render any page content; they index it, route to it, or
expose it to crawlers. Each substep is mechanical -- iterate a list,
produce a string, write a file -- but each replaces a non-trivial
chunk of Jekyll machinery (`jekyll-redirect-from`, `jekyll-sitemap`,
the just-the-docs `zzzz-search-data.json` Liquid template).

Target: **~80-120 ms wall time** for the full auxiliary set on the
current Windows dev machine. ~290 redirect stub writes dominate (the
sitemap and search-data are one file each), but stubs are tiny (~400
bytes) and parallelise; the search-data string-build is the only
non-trivial CPU work. The Jekyll equivalents collectively cost
~1.5-2 s of build time (redirect-from Generator, sitemap Liquid pass,
search-data Liquid pass).

## Status: shipped

Implementation: [paths.mjs](paths.mjs), [redirects.mjs](redirects.mjs),
[sitemap.mjs](sitemap.mjs), [search.mjs](search.mjs); orchestrator
extension in [index.mjs](index.mjs); acceptance harness in
`verify-phase6.mjs` (retired Phase 10); set-aware sitemap diff utility
in `_sitemap_diff.mjs` (retired Phase 10). The shared `paths.mjs`
helper was lifted out of `discover.mjs` so the permalink → output-
filename rule has one source of truth; `seo.mjs` exports its
`absoluteUrl` and `stripHtml`; `write.mjs` exports its `mkdirRec`,
`runLimited`, `writeFileMkdirp`, and `WRITE_LIMIT`. No new
dependencies. Verify harness: 25 checks, all green; per-entry search
content matches Jekyll byte-for-byte modulo [accepted-divergences.mjs](accepted-divergences.mjs)
(one entry on `Reference/Attributes.md` -- a hidden secondary
divergence surfaced by Phase 6's search-content scan, see
[FUTURE-WORK.md](FUTURE-WORK.md) item 1).

Phase 5 shipped before Phase 6 because the write substrate
(concurrency limiter, mkdir helper, error wrapping) had to exist
first; Phase 6 reuses it via the shared imports described in §3.

---

## 1. Inputs

### From Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 5

The `{ pages, staticFiles, site, destRoot }` the orchestrator carries
after Phase 5. Phase 6 reads:

| Field | Why Phase 6 reads it |
|---|---|
| `page.permalink` | Canonical URL. Source for sitemap `<loc>`, redirect target, search-data `url` / `relUrl`. |
| `page.destPath` | Output path relative to `destRoot`. Used by redirects to detect collisions with already-written page files. |
| `page.frontmatter.title` | Required to be in the search index. Drives the search-data `doc` field. |
| `page.frontmatter.redirect_from` | List (or string) of paths that should redirect to this page's permalink. |
| `page.frontmatter.sitemap` | When `false`, the page is excluded from the sitemap. Currently only `book.html` sets this. |
| `page.frontmatter.search_exclude` | When `true`, the page is excluded from the search index. Not currently set on any page; supported for forward-compat with upstream just-the-docs. |
| `page.renderedContent` | The Phase 3 body fragment (markdown → HTML, with heading IDs from the kramdown slug emit). The search index splits this on heading tags to extract per-section entries. **Not** `page.html` -- that's the full layouted document, which would force the search splitter to step over the chrome. Confirmed by [template.mjs](template.mjs): Phase 4 reads `page.renderedContent` and writes `page.html` but does not mutate `renderedContent`. |
| `site.config.url` | Origin for absolute URLs in sitemap entries and redirect stubs. Currently `"https://docs.twinbasic.com"`. |
| `site.config.baseurl` | Empty on this site; the URL helpers (from `seo.mjs`) handle non-empty cases. |
| `destRoot` | Absolute path where everything writes to. Already exists on disk after Phase 5. |

Phase 6 does NOT read `page.navPath`, `page.breadcrumbs`,
`page.children`, `page.navLevels`, `page.seo*`, `site.navTree`,
`site.bookData`, or `site.buildInfo` -- the auxiliary outputs are
independent of every per-page derivation Phase 2-4 produced.

`staticFiles[]` is unused by Phase 6. The jekyll-sitemap gem's
template includes a static-file loop (for `.htm` / `.html` / `.xhtml`
/ `.pdf` static assets), but there are zero such files in this
project's source tree -- §5.2-D2 spells out why we don't port the
loop.

### From the source tree

Nothing. Phase 6 reads only the in-memory `{ pages, site }` state and
writes to `destRoot/`.

### From Phase 5's already-written outputs

Nothing. Phase 6 could read the rendered HTML files Phase 5 just
wrote (to extract search sections from the canonical on-disk output),
but the in-memory `page.renderedContent` is cheaper to access and is
the exact same content the search template wants. The disk-read path
is rejected in §7.D5.

---

## 2. Outputs

Phase 6 writes four kinds of files into `destRoot/`. All four were
also produced by Jekyll; tbdocs aims for byte-identity on three of
them (redirect stubs, sitemap, robots.txt) and functional equivalence
on the fourth (search-data.json -- the ordering and inter-entry
whitespace differ harmlessly).

### Redirect stubs

One HTML file per `redirect_from` entry across all pages. Currently
**~290 entries** spread across 161 source pages (some declare
multiple aliases). The exact destination path depends on the
`redirect_from` value:

| `redirect_from` value | Destination path |
|---|---|
| `/tB/Core/Day` (no trailing slash, no extension) | `tB/Core/Day.html` |
| `/tB/Core/Day/` (trailing slash) | `tB/Core/Day/index.html` |
| `/tB/Core/Day.html` (explicit extension) | `tB/Core/Day.html` |
| `tB/Core/Day` (no leading slash -- not used on this site, defensive) | `tB/Core/Day.html` |

Each stub is the same ~400-byte fragment:

```html
<!DOCTYPE html>
<html lang="en-US">
  <meta charset="utf-8">
  <title>Redirecting&hellip;</title>
  <link rel="canonical" href="https://docs.twinbasic.com/tB/Modules/DateTime/Day">
  <script>location="https://docs.twinbasic.com/tB/Modules/DateTime/Day"</script>
  <meta http-equiv="refresh" content="0; url=https://docs.twinbasic.com/tB/Modules/DateTime/Day">
  <meta name="robots" content="noindex">
  <h1>Redirecting&hellip;</h1>
  <a href="https://docs.twinbasic.com/tB/Modules/DateTime/Day">Click here if you are not redirected.</a>
</html>
```

The target URL is always absolute (`<site.config.url><page.permalink>`).
Phase 7 (offline) rewrites these to page-relative in `_site-offline/`;
the canonical online output uses absolute URLs so that crawlers and
external inbound links resolve correctly regardless of which host
serves the file.

### `sitemap.xml`

One file at `destRoot/sitemap.xml`. UTF-8 XML, the sitemap.org 0.9
schema, one `<url><loc>...</loc></url>` per non-excluded page. Format
mirrors jekyll-sitemap's minified output (no inter-element
whitespace beyond what the template's static newlines force).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://docs.twinbasic.com/</loc>
</url>
<url>
<loc>https://docs.twinbasic.com/FAQ</loc>
</url>
...
</urlset>
```

Currently **836 entries** (838 pages total -- 838 minus `book.html`
[has `sitemap: false`] minus `404.html` [jekyll-sitemap special-cases
it]).

No `<lastmod>` element. jekyll-sitemap emits it only when the page's
frontmatter sets `last_modified_at` or `date`, neither of which is
set on any page in this tree.

### `robots.txt`

One file at `destRoot/robots.txt` with one line:

```
Sitemap: https://docs.twinbasic.com/sitemap.xml
```

Emitted by the same module that emits the sitemap; it's a
jekyll-sitemap gem feature, not a standalone plugin. Not in any
source folder, so we generate it from scratch on every build.

### `assets/js/search-data.json`

One JSON file at `destRoot/assets/js/search-data.json` holding the
lunr index input. **~2,587 entries** on the current tree (~2.8 MB
file). Each entry is one heading-bounded section of a page; pages
with N visible headings produce up to N+1 entries (one for the
title-prefix prose plus one per heading).

The exact shape per entry:

```json
"42": {
    "doc": "Page Title",
    "title": "Section Title (or page title for the prefix entry)",
    "content": "Sanitised body text with `.` / `|` separators between blocks",
    "url": "/canonical/permalink#section-id",
    
    "relUrl": "/canonical/permalink#section-id"
  }
```

Key order matches the upstream just-the-docs template byte-for-byte
(`doc`, `title`, `content`, `url`, blank line, `relUrl`) so the
client-side `initSearch()` reader in `just-the-docs.js` works without
modification.

`url` and `relUrl` are identical on this site because `site.config.baseurl`
is empty. If a future deployment sets `baseurl`, `url` would gain
the prefix and `relUrl` would not -- but the format keeps both
fields so the client doesn't need to know.

The numeric IDs (`"0"`, `"1"`, `"42"`) are a contiguous 0-indexed
sequence over the deterministic page+section iteration order.
lunr consumes them as opaque keys (the `id` field is set to the
same string in the `lunr(...)` builder block in `just-the-docs.js`).

---

## 3. Module split

Three production substep modules plus one shared paths helper. The
orchestrator wires them together.

```
builder/
  paths.mjs       18 lines. permalinkToDestPath(permalink) -- shared
                  between discover.mjs (Phase 1) and redirects.mjs
                  (Phase 6). Single source of truth for the
                  "/path/" → "path/index.html" rule.
  redirects.mjs   97 lines. Iterates pages with frontmatter.redirect_from,
                  generates one HTML stub per entry, writes to destRoot
                  via the Phase 5 concurrency limiter. Throws on
                  collision (§7.D2).
  sitemap.mjs     87 lines. Filters pages, builds the sitemap.xml
                  string, writes it plus robots.txt to destRoot. Also
                  exports `deriveSitemapUrls` and `extractSitemapUrls`
                  so triage / set-diff tools can compare URL sets
                  without writing anything to disk.
  search.mjs     158 lines. Splits each page's renderedContent into
                  heading-bounded sections, sanitises with Ruby-strict
                  whitespace semantics, builds the search-data.json
                  string, writes it to destRoot/assets/js/.
  index.mjs       extended with one Promise.all block (~10 lines)
                  that calls all three substeps in parallel after
                  writePhase. Skipped under --dry-run.
```

Plus the tooling additions:

```
builder/
  verify-phase6.mjs   ~290 lines. 25 acceptance checks per §10.
  _sitemap_diff.mjs   ~80 lines. File-vs-file URL set comparator,
                      uses extractSitemapUrls from sitemap.mjs.
  _triage.mjs         updated. Adds in-memory sitemap URL-set diff
                      against _site/sitemap.xml as a top-line
                      "Sitemap: MATCH/DIFFER" report alongside the
                      per-page Phase 4 diff.
  FUTURE-WORK.md      new. Registry of follow-up tasks. Entry 1
                      documents the hidden secondary divergence on
                      Reference/Attributes.md that Phase 6's search-
                      content scan surfaced.
  accepted-divergences.mjs   updated. Adds a third bucket
                      ("markdown-parsing") plus the Reference/
                      Attributes.md TestFixture entry under it.
```

### Why three modules, not one (`auxiliaries.mjs`)

The three substeps share inputs and the destination root but
otherwise have nothing in common:

- **Redirects** loops over `frontmatter.redirect_from` entries and
  emits N tiny files in parallel.
- **Sitemap** filters and sorts the page list, builds one string,
  writes one file.
- **Search** parses heading-split body content per page, builds one
  large JSON string, writes one file.

Each has its own correctness-critical helpers (the redirect-from
permalink → destination-path translator, the sitemap permalink →
absolute-URL XML-escape pipeline, the search content sanitiser /
heading splitter). Folding them into one module would either bloat
one file past 500 lines or force a `switch (kind)` dispatch with
nothing meaningful in common.

The split also matches the implementation order strategy: each
substep can ship and be verified independently before the next
starts, with `verify-phase6.mjs` adding checks per substep.

### Why no shared `auxiliaries-state.mjs`

Phase 2's `nav.mjs` bundles six substeps that share intermediate
state (`titled`, `byTitle`, `byParentTitle`, `orderedChildren`,
etc.). Phase 6 has nothing to share: each substep's inputs are
independent slices of `pages[]`, and none builds an intermediate
structure another consumes. No state module needed.

### Reuse from prior phases

- **`absoluteUrl(input, config)`** -- the URL absolutiser from
  Phase 2's `seo.mjs`. Used by redirects (for the target URL) and
  sitemap (for `<loc>`). Already handles the `baseurl + permalink`
  case and the already-absolute pass-through. Re-export it from
  `seo.mjs` or move to a shared `urls.mjs` helper -- §7.D8 picks the
  re-export path.
- **The write helpers** from Phase 5's `write.mjs` -- specifically
  the `mkdir -p`-then-`writeFile` pattern and the concurrency
  limiter. Re-export `writeFileMkdirp(path, content)` from
  `write.mjs` so `redirects.mjs` (which writes ~290 small files in
  parallel) doesn't have to re-implement the limiter or the
  parent-directory ensurement.

If `write.mjs` doesn't currently export those helpers (it owns the
write-pages loop, the asset-tree copy, and the static-file copy
internally), Phase 6's first step is a non-functional refactor of
`write.mjs` that lifts them to module-level exports. The shipped
write.mjs already has `mkdirp` and a concurrency limiter -- the
extraction should be ~20 lines of edits with zero behaviour change.

---

## 4. Pipeline ordering within Phase 6

All three substeps are independent. They read disjoint slices of
`pages[]` (or in the case of redirect-from, a slice that's
disjoint-by-purpose -- the destination paths don't collide with any
page-written-by-Phase-5 path, see §7.D2) and write to disjoint
destinations. They can run in parallel.

```
writePhase(pages, staticFiles)         // Phase 5 -- destRoot now exists
   │
   ▼
Promise.all([
  writeRedirects(pages, site, destRoot),
  writeSitemap(pages, site, destRoot),
  writeSearchData(pages, site, destRoot),
])
   │
   ▼
{ pages, staticFiles, site, destRoot }  // Phase 7+ chains in here
```

The fan-out is `Promise.all` rather than three sequential calls
because:

- Each substep's CPU work is independent (no shared mutable state).
- Each substep's I/O work is small (one or a few hundred file
  writes) -- they fit comfortably inside Node's libuv pool when
  interleaved.
- Wall-time is dominated by the search-data string-build (~30-50 ms
  CPU); running it in parallel with the sitemap (~5 ms) and the
  ~290 redirect writes (~50 ms wall, mostly I/O) means Phase 6
  totals ~80-100 ms instead of ~120-150 ms sequential.

The three substeps must run **after** Phase 5 (destRoot must exist
and have the page tree under it -- the redirect-from collision
check in §7.D2 reads the on-disk state). They must run **before**
Phase 7 (offlinify), which reads sitemap.xml, robots.txt, the
redirect stubs, and search-data.json (the offlinify pass rewrites
them, generates the JS-wrapped `search-data.js`, and decides per
the `offline_exclude` config what to skip).

---

## 5. Per-substep specifications

### 5.1. Redirects (`redirects.mjs`)

**Purpose.** Emit one HTML stub per `redirect_from` entry. Each stub
performs a triple redirect: a `<script>location=...</script>` JS
hop, a `<meta http-equiv="refresh">` static-HTML hop (works without
JS), and a visible `<a>` link as the last-resort fallback (works
without JS or meta-refresh). The `<link rel="canonical">` and
`<meta name="robots" content="noindex">` tell crawlers which URL is
the real one and not to index the stub.

**Algorithm** (port of `jekyll-redirect-from`'s `Generator`,
extended with the §7.D2 collision pre-check):

```js
export async function writeRedirects(pages, site, destRoot) {
  const config = site.config;

  // §7.D2: build the set of every real page's destPath so a bad
  // redirect_from entry that would overwrite a page surfaces with
  // a named error rather than silently clobbering.
  const pageDestPaths = new Map();
  for (const p of pages) {
    if (p.html !== undefined) pageDestPaths.set(p.destPath, p);
  }

  const stubs = [];
  const seen = new Map();
  for (const page of pages) {
    const from = page.frontmatter?.redirect_from;
    if (from == null) continue;

    const fromList = Array.isArray(from) ? from : [from];
    const target = absoluteUrl(page.permalink, config);

    for (const fromPath of fromList) {
      if (typeof fromPath !== "string" || fromPath === "") continue;
      const destPath = permalinkToDestPath(fromPath);

      // Real page would be overwritten.
      const colliding = pageDestPaths.get(destPath);
      if (colliding) {
        throw new Error(
          `redirect_from collision in ${page.srcRel}: entry "${fromPath}" → ` +
          `${destPath} would overwrite ${colliding.srcRel} (permalink ${colliding.permalink}).`,
        );
      }

      // Another page already declared the same redirect target.
      const previous = seen.get(destPath);
      if (previous && previous.srcRel !== page.srcRel) {
        throw new Error(
          `redirect_from collision: ${page.srcRel} declares "${fromPath}" but ` +
          `${previous.srcRel} already declared the same destination ${destPath}.`,
        );
      }
      seen.set(destPath, page);

      stubs.push({ destPath, html: renderRedirectStub(target) });
    }
  }

  await runLimited(stubs, WRITE_LIMIT, async (s) => {
    await writeFileMkdirp(path.join(destRoot, s.destPath), s.html);
  });

  return { written: stubs.length };
}
```

Where:

- `permalinkToDestPath(fromPath)` is the shared helper in
  `paths.mjs` (§6.1), used both here and by `discover.mjs` for the
  page-output path derivation. The rules: strip a leading `/`;
  empty → `index.html`; trailing slash → append `index.html`;
  recognised HTML-ish extension (`.html` / `.htm` / `.xml`) →
  kept as-is; otherwise → append `.html`.
- `renderRedirectStub(target)` emits the 11-line template fragment
  in §2.Redirect-stubs, with the four `{{ page.redirect.to }}`
  positions all filled with the same absolute URL.
- `runLimited(stubs, WRITE_LIMIT, ...)` is the Phase 5 concurrency
  limiter, re-exported from `write.mjs` (`WRITE_LIMIT = 64`).
  Throttles the parallel `fs.writeFile` calls so Windows doesn't
  exhaust file handles on the ~290-stub burst (§7.D12).

**Edge cases:**

- Page with `redirect_from` as a string (not a list) → wrap in
  `[from]` and proceed. The Ruby plugin handles both shapes too.
  Currently every page on this site uses the list form, but the
  defensive branch costs nothing.
- Page with `redirect_from: []` (empty list) → no writes; the loop
  is a no-op for that page.
- Page with `redirect_from` containing a duplicate of an existing
  page's permalink → §7.D2 spells out the collision-detection
  rule. The Ruby plugin silently overwrites; tbdocs should warn
  (or throw) on the conflict to prevent confusion.
- Page with no `redirect_from` field → the `continue` at the top
  of the loop skips it.

**Performance.** ~290 writes at ~400 bytes each = ~120 KB total.
With the Phase 5 concurrency limiter capping at 64 concurrent
writes, this finishes in ~50 ms on the dev machine -- about the
time it takes Node to issue the underlying `fs.writeFile` calls.
The HTML-string build is a single template-literal substitution per
stub; CPU is negligible.

### 5.2. Sitemap (`sitemap.mjs`)

**Purpose.** Emit `sitemap.xml` and `robots.txt`, both of which
jekyll-sitemap injects into Jekyll's `site.pages` array during the
`Generator` phase. They are NOT pages in the source tree; we
synthesise them at write time.

**Algorithm** (port of `jekyll-sitemap`'s template + gem code):

```js
export async function writeSitemap(pages, site, destRoot) {
  const config = site.config;

  // Derive the URL set once; share it with triage tools via the
  // exported deriveSitemapUrls helper (see §3 + the _triage.mjs
  // integration in _triage.mjs).
  const sitemapUrls = [...deriveSitemapUrls(pages, site)].sort();
  const xml = renderSitemapXml(sitemapUrls);

  // §7.D10 robots.txt shadow check: if a source page has staked the
  // /robots.txt permalink we step aside. Defensive -- no page does on
  // this site.
  const sourceHasRobots = pages.some(p => p.permalink === "/robots.txt");
  const writes = [writeFileMkdirp(path.join(destRoot, "sitemap.xml"), xml)];
  if (!sourceHasRobots) {
    writes.push(writeFileMkdirp(path.join(destRoot, "robots.txt"), renderRobotsTxt(config)));
  }
  await Promise.all(writes);

  return { entries: sitemapUrls.length, robots: !sourceHasRobots };
}

// Filter + URL-derive in one place; exported so `_triage.mjs` can
// derive the URL set without running Phase 6's file writes.
export function deriveSitemapUrls(pages, site) {
  const config = site.config;
  return new Set(
    pages
      .filter(p => p.frontmatter?.sitemap !== false)
      .filter(p => p.permalink !== "/404.html")
      .map(p => sitemapUrlFor(p, config)),
  );
}

// Parse `<loc>...</loc>` URL values out of an on-disk sitemap.xml.
// Exported for the file-vs-file `_sitemap_diff.mjs` and the in-memory-
// vs-file `_triage.mjs` comparators.
const LOC_RE = /<loc>([^<]+)<\/loc>/g;
export function extractSitemapUrls(xml) {
  const out = new Set();
  for (const m of xml.matchAll(LOC_RE)) out.add(m[1]);
  return out;
}

function sitemapUrlFor(page, config) {
  // jekyll-sitemap's `doc.url | replace:'/index.html','/' | absolute_url`.
  let url = String(page.permalink);
  if (url.endsWith("/index.html")) {
    url = url.slice(0, -"index.html".length);
  }
  return xmlEscape(absoluteUrl(url, config));
}

function renderSitemapXml(urls) {
  // Match jekyll-sitemap's minified output: a `\n` after each `>`
  // followed by element start, no inter-element indent.
  const entries = urls.map(u => `<url>\n<loc>${u}</loc>\n</url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</urlset>\n`;
}

function renderRobotsTxt(config) {
  // Leading slash on the path so absoluteUrl produces "<site>/sitemap.xml"
  // rather than a relative URL.
  return `Sitemap: ${absoluteUrl("/sitemap.xml", config)}\n`;
}
```

Where:

- `xmlEscape(s)` is the kramdown / jekyll-sitemap `xml_escape`
  function: replaces `&`, `<`, `>`, `"`, `'` with the corresponding
  XML entities. No URL on this site currently contains any of these
  characters (all permalinks are ASCII-only, no query strings), so
  the escape is a defensive no-op in practice. Worth implementing
  anyway -- a future page with `&` in its permalink would otherwise
  produce an invalid sitemap.
- The page filter excludes `book.html` via `frontmatter.sitemap ===
  false` and `404.html` via the URL match. The Ruby template uses a
  hardcoded `doc.url != "/404.html"` check for the second case.
- The sort step uses default ASCII string comparison. This produces
  a stable, easy-to-diff output. jekyll-sitemap doesn't sort -- its
  output reflects `site.html_pages`'s iteration order, which depends
  on Jekyll's filesystem reader. The two orders differ; the
  acceptance check in §10 compares the SETS of URLs, not the
  ordering. See §7.D3.

**Edge cases:**

- Page with `permalink: /` (the homepage) → already ends in `/` but
  not `/index.html`. The `endsWith("/index.html")` strip is a
  no-op. `absoluteUrl("/", config)` returns `"https://docs.twinbasic.com/"`,
  which is the right entry. (jekyll-sitemap emits the same form.)
- Page with `permalink: /404.html` → filtered out by the URL match,
  matching jekyll-sitemap's hardcoded special case. Note that
  `404.html`'s frontmatter does NOT set `sitemap: false` -- the
  rule is solely the URL filter, and any future page that lands at
  the `/404.html` URL would inherit the exclusion (unlikely, but
  the behaviour matches Jekyll).
- Page with `permalink: /book.html` → filtered out by `sitemap:
  false`. The `endsWith("/index.html")` strip and the
  `/404.html` filter never see it.
- A future static `.html` / `.pdf` file added under `docs/` →
  jekyll-sitemap's template has a `static_files` loop that would
  include it. There are zero such files in the current tree (per
  PLAN-1 § Exclude rules, the only `.html` files with frontmatter
  become pages; nothing else has `.html` / `.pdf` outside `_*`
  dirs). §7.D6 covers why we don't port the loop.

**Performance.** One file write of ~190 KB (836 entries × ~70 bytes
average each) plus one ~50-byte file. Total Phase 6 sub-cost: ~5 ms
on the dev machine.

### 5.3. Search index (`search.mjs`)

**Purpose.** Emit `assets/js/search-data.json`, the lunr index
input. The client-side `initSearch()` function in
`just-the-docs.js` `XMLHttpRequest`s this file at page load,
parses the JSON, feeds the entries into a `lunr()` builder, and
exposes the resulting index to the search UI. Per-entry: the page
title (`doc`), the section title (`title`), the section body
content (`content`), the section URL (`url`), and the
baseurl-relative URL (`relUrl`).

**Why split per heading.** Treating each page as one search target
returns whole-page matches that can't focus the reader on the
relevant section. The just-the-docs convention is to split by
heading level (default `h2`, configurable up to `h6`) so a query
that hits inside a sub-section navigates straight there via the
URL fragment. The split level is fixed at 2 on this site (no
`site.search.heading_level` is configured).

**Algorithm** (port of `_includes/lunr/custom-index.js` +
`assets/js/zzzz-search-data.json`):

1. **Collect entries** over `pages[]` in deterministic order:
   - Filter: `frontmatter.title` is non-empty AND `frontmatter.search_exclude !== true`.
   - For each surviving page, split its `renderedContent` into
     sections (see step 2).
2. **Split one page into sections:**
   - Take `page.renderedContent` (the body fragment from Phase 3,
     with heading IDs intact -- `<h2 id="some-id">Some
     Heading</h2>` shape).
   - Replace every `<h2`..`<h<heading_level>` open tag with `<h1`
     and the matching close tags with `</h1`. The site's
     `heading_level` is the upstream default of 2, so this is a
     single substitution `h2` ↔ `h1`. Skip the loop entirely when
     `heading_level === 2`; it's still cheap with one iteration.
   - Split the (now uniformly-h1-headed) string on `<h1`. The
     first element of the split is the prose that precedes any
     heading (the page intro); each subsequent element is one
     section, starting just after the `<h1` of its opening tag.
   - For each section element, further split on `</h1>` to
     separate the heading-tag-and-text from the body content. The
     first half holds attributes + text; the second half is the
     body.
   - Extract the heading text: take the first half, replace the
     first `>` with `<h1>` (so `id="x">Foo` becomes `id="x"<h1>Foo`),
     split on `<h1>`, take the second element, strip HTML tags. This
     dance is what the upstream Liquid template does; it survives
     headings with or without attributes.
   - Extract the section id: split the first half on `id="`. If
     the split has exactly two elements (i.e. an id was present),
     split the second element on `"`, take its first element --
     that's the id. URL becomes `page.permalink + "#" + id`. If no
     id, the URL stays as `page.permalink` (rare on this site --
     anchor-headings injection in Phase 4 adds an id to every
     heading, but Phase 6 reads `page.renderedContent` from Phase
     3, where headings already have ids from the kramdown slug
     emit).
3. **Detect the "title-prefix" case:**
   - If the first section's extracted heading text equals
     `page.frontmatter.title` AND the prose-before-any-heading
     (`parts[0]`) is empty, set a `titleFound` flag.
   - This handles the convention where a page's first content is
     its own `# Title`. The prefix entry is omitted in that case
     (the section entry covers the same content).
4. **Emit per-section entries:**
   - For each section: `{ doc: page.frontmatter.title, title:
     extracted-heading, content: sanitised-body, url: section-url,
     relUrl: section-url-without-baseurl }`.
5. **Emit the title-prefix entry (only if `titleFound` was false):**
   - `{ doc: page.frontmatter.title, title: page.frontmatter.title,
     content: sanitised(parts[0]), url: page.permalink, relUrl:
     page.permalink }`.

**Content sanitisation** (the Liquid filter chain that runs on each
section body):

```js
function sanitiseContent(html) {
  // 14 replaces to insert separators between block boundaries.
  // The ordering matches the upstream template; some adjacent
  // patterns would overlap if not applied in this exact order.
  let s = String(html ?? "")
    .replaceAll("</h",  " . </h")
    .replaceAll("<hr",  " . <hr")
    .replaceAll("</p",  " . </p")
    .replaceAll("<ul",  " . <ul")
    .replaceAll("</ul", " . </ul")
    .replaceAll("<ol",  " . <ol")
    .replaceAll("</ol", " . </ol")
    .replaceAll("</tr", " . </tr")
    .replaceAll("<li",  " | <li")
    .replaceAll("</li", " | </li")
    .replaceAll("</td", " | </td")
    .replaceAll("<td",  " | <td")
    .replaceAll("</th", " | </th")
    .replaceAll("<th",  " | <th");
  s = stripHtml(s);                         // drop tags, keep text + entities
  s = s.replaceAll("Table of contents", "");
  // Jekyll's normalize_whitespace = collapse runs of `\s` + strip,
  // with Ruby's `\s` semantics: [\t\n\v\f\r ] -- ASCII-only.
  // JS's `\s` regex AND `String.prototype.trim` both include
  // NO-BREAK SPACE ( , the `&nbsp;` codepoint), which would
  // collapse the nbsp-indented syntax blocks kramdown emits inside
  // blockquote / definition-list source (e.g. tB/Core/Class). The
  // ASCII-only regex + custom strip mirror Ruby exactly.
  s = s.replace(/[\t\n\v\f\r ]+/g, " ");
  s = stripAsciiWhitespace(s);
  s = s
    .replaceAll(". . .", ".")
    .replaceAll(". .",   ".")
    .replaceAll("| |",   "|");
  return s + " ";                           // append: ' ' from the template
}

function stripAsciiWhitespace(s) {
  let start = 0;
  let end = s.length;
  while (start < end && isAsciiWs(s.charCodeAt(start))) start++;
  while (end > start && isAsciiWs(s.charCodeAt(end - 1))) end--;
  return s.slice(start, end);
}
function isAsciiWs(code) {
  return code === 0x20 || (code >= 0x09 && code <= 0x0d);
}
```

The trailing-space append at the end is load-bearing: the
just-the-docs Liquid template does `| append: ' '`, and the JSON
output ends each `content` string with a single space. Matching
that keeps the JSON byte-identical to Jekyll's (modulo the
inter-entry whitespace differences noted in §7.D4).

The Ruby-vs-JS whitespace divergence was Phase 6's most subtle
correctness issue: with JS's default `\s` and `.trim()` the
sanitiser silently lost the ` `-driven indentation across ~24
syntax-doc pages (`tB/Core/Class`, `Sub`, `For-Next`, etc.) before
the ASCII-only port landed. Both passes use the same character
class so the fix is consistent across the collapse and strip
phases.

**Per-entry JSON shape** (matching the upstream template
character-for-character including the blank line where the empty
`lunr/custom-data.json` include used to render):

```
"<i>": {
    "doc": <jsonify(page.frontmatter.title)>,
    "title": <jsonify(section-title)>,
    "content": <jsonify(sanitised-content)>,
    "url": "<url>",
    
    "relUrl": "<relUrl>"
  }
```

Where:

- `jsonify(x)` is `JSON.stringify(x)` (Node's built-in
  matches Jekyll's `jsonify` semantics for strings: escapes `"`,
  `\`, control chars; emits `null` for null/undefined; emits
  numbers as numbers, booleans as booleans). Titles and content
  are always strings on this site.
- `<url>` and `<relUrl>` are emitted via direct string substitution
  -- the upstream template emits `"{{ url | relative_url }}"` for
  `url` and `"{{ url }}"` for `relUrl`. The `relative_url` filter
  URL-encodes spaces (`Form Designer` → `Form%20Designer`); the
  bare interpolation does not. tbdocs mirrors this asymmetry: a
  small `encodeSpaces` helper rewrites space → `%20` on the `url`
  field only, leaving `relUrl` as the raw permalink. On this site
  the one page with a space in its permalink
  (`/Tutorials/CustomControls/Form Designer`) is the sole observable
  case; the helper is a no-op on everything else. Other unsafe
  characters don't appear in permalinks here, so `encodeSpaces`
  rather than `encodeURI` keeps the output byte-aligned with
  Jekyll's `Addressable::URI` normalisation without over-encoding
  the `#` fragment delimiter.
- The blank line between `"url"` and `"relUrl"` is what the empty
  `_includes/lunr/custom-data.json` template renders as. Matching
  it preserves byte-parity. The just-the-docs.js reader doesn't
  care about whitespace.

**File-level wrap:**

```
{
"0": { ... },"1": { ... },"2": { ... },...,"N-1": { ... }
}
```

The entries are concatenated with `","` between them (no
inter-entry newline -- the upstream template uses `{%- unless i ==
0 -%},{%- endunless -%}` which emits only a comma with no
surrounding whitespace).

**Filter / ordering rules:**

- **Ordering by page:** iterate `pages[]` in `srcRel`-ascending
  order (Phase 1's sort guarantees this). Within a page, sections
  emit in their original document order (split index ascending).
  This is deterministic and easy to verify by diff against itself.
  Note this is NOT Jekyll's iteration order -- Jekyll uses
  `site.html_pages` which reflects filesystem read order, which is
  OS-dependent. §7.D4 covers why byte-parity with Jekyll's output
  isn't a Phase 6 goal.
- **Filter `frontmatter.title`:** the search template uses `{% if
  page.title and page.search_exclude != true %}`. Pages without a
  title (404.html, book.html) are skipped. Pages with empty-string
  title would also be skipped (Liquid treats `""` as falsy).
- **Filter `frontmatter.search_exclude`:** support but don't expect
  to fire on this site. No page currently sets it.
- **Counter ID `i`:** a single 0-indexed counter across all
  entries for all pages. Matches the upstream template -- it's
  what lunr uses as the document ref.

**Edge cases:**

- Page with no headings at all (rare but legal) → `parts.length
  === 1` (just the prefix), `titleFound` stays false, one prefix
  entry emitted with `content = sanitise(parts[0])` and `url =
  page.permalink`.
- Page where the first heading text differs from `page.title`
  (most reference pages: title is "Day", first heading is "Day"
  by convention -- they match, prefix is suppressed) → if they
  don't match, the prefix entry is emitted with the prose before
  the first heading. This is correct: that prose is content the
  reader should be able to search.
- Page with `<h1>` in source body (after kramdown rendering): the
  split step's regex looks for `<h1` as the OPEN tag prefix. A
  literal `<h1>` somewhere in the body would split there too. No
  page on this site has a `# H1` after its title heading, so this
  doesn't currently fire; if a future page did, the split would
  produce an extra section, which is the correct behaviour
  (matches Jekyll).
- Heading text with markup (e.g. `<h2>Use <code>Day</code></h2>`)
  → the `stripHtml` step turns `Use <code>Day</code>` into `Use
  Day`. The upstream template's `| strip_html` does the same.
- Section body with embedded `<pre>` / `<code>` containing
  `</h1>` literal text (extremely unlikely but possible) → the
  splitter would treat the literal as a closing tag. Same
  behaviour as the upstream template. Not a concern in practice.
- Page with `heading_level: 6` configured site-wide → the
  `h2..h6 → h1` substitution runs 5 iterations. Currently the
  config doesn't set `site.search.heading_level`, so the default
  of 2 applies and only `h2 → h1` runs.

**Performance.** Splitting 838 pages × ~3 sections per page average
= ~2,587 section entries. Per-section work is regex replace +
string concat. On the dev machine: ~30-50 ms CPU + one 2.8 MB
file write (~5-10 ms). Total Phase 6 sub-cost: ~40-60 ms.

---

## 6. Shared helpers

### 6.1. `redirectDestPath(fromPath)`

Same algorithm as PLAN-1 §4's `computeDestPath`. Lift into a shared
helper to avoid divergence; the Phase 1 and Phase 6 callers both
need to convert a permalink-shaped URL into an output filename.

```js
export function permalinkToDestPath(permalink) {
  let p = permalink.startsWith("/") ? permalink.slice(1) : permalink;
  if (p === "") return "index.html";
  if (p.endsWith("/")) return p + "index.html";
  const last = p.split("/").pop();
  if (/\.(html?|xml)$/i.test(last)) return p;
  return p + ".html";
}
```

Originally lived inside `discover.mjs` as the non-exported
`computeDestPath`. Shipped Phase 6 lifted it into a new top-level
`paths.mjs` module that both `discover.mjs` and `redirects.mjs`
import from. Single source of truth, zero behaviour change to
Phase 1's tests.

### 6.2. `absoluteUrl(input, config)`

Lives in `seo.mjs` (per PLAN-2 §5.7 / §D9), already exported.
`redirects.mjs` and `sitemap.mjs` both import it. The function
handles:
- Already-absolute input (`https://...`): pass through.
- Path input (`/tB/Core/Day`): prepend `(baseurl ?? "") + url`.
- Path input without leading slash (`assets/js/foo.js`): prepend
  `/`, then proceed.

Side note: Node's `URL` parser inside `absoluteUrl` auto-encodes
unsafe characters like spaces, so the function returns properly
URL-encoded output even when given a permalink with a space. The
search-data `url` field still needs the `encodeSpaces` helper
because there's no `new URL(...)` step in that path -- it
interpolates the permalink straight into the JSON string.

### 6.3. `xmlEscape(s)`

New helper, lives in `sitemap.mjs` (no other caller in Phase 6):

```js
function xmlEscape(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

Matches Liquid's `xml_escape` filter (which Jekyll re-exports from
the `cgi` stdlib). No special handling for already-escaped entities --
sitemap URLs are URL-escaped at the page-permalink layer, so by the
time they reach `xmlEscape` they should contain no entities.

### 6.4. `stripHtml(s)`

Lives inside `seo.mjs` (factored out of the inline
`renderTitle` pipeline during Phase 6 prep), exported for Phase 6:

```js
// seo.mjs
export function stripHtml(s) {
  return String(s ?? "")
    .replace(STRIP_HTML_BLOCKS, "")   // <script>, <!-- -->, <style>
    .replace(STRIP_HTML_TAGS, "");    // any other <tag>
}
```

The constants `STRIP_HTML_BLOCKS` and `STRIP_HTML_TAGS` stay
private to `seo.mjs`.

### 6.5. `writeFileMkdirp(path, content)`

A small wrapper that:

1. `await mkdirRec(dirname(path))` (uses the per-build mkdir cache
   Phase 5 already maintains, so a single recursive `fs.mkdir` per
   unique directory).
2. `await safeWrite(path, () => fs.writeFile(path, content))` (the
   `safeWrite` wrapper from Phase 5 stamps the destination path
   onto thrown errors for easier debugging).

Lifted from `write.mjs`'s previously inline pattern into a
module-level export as part of Phase 6's groundwork. `mkdirRec`,
`runLimited`, and `WRITE_LIMIT` were exported in the same pass.

### 6.6. `renderRedirectStub(targetAbsoluteUrl)`

New helper, lives in `redirects.mjs`. Template-literal substitution:

```js
function renderRedirectStub(target) {
  return `<!DOCTYPE html>
<html lang="en-US">
  <meta charset="utf-8">
  <title>Redirecting&hellip;</title>
  <link rel="canonical" href="${target}">
  <script>location="${target}"</script>
  <meta http-equiv="refresh" content="0; url=${target}">
  <meta name="robots" content="noindex">
  <h1>Redirecting&hellip;</h1>
  <a href="${target}">Click here if you are not redirected.</a>
</html>
`;
}
```

Note: `target` is HTML-context-safe only if the permalink contains
no `<`, `>`, `"`, `&`, `'`. Every permalink on this site is
ASCII-clean and contains none of those. A future page with an
unusual permalink would need `target` HTML-escaped before
interpolation. Defensive HTML-escape via a shared helper is
recommended.

---

## 7. Design decisions and assumptions

### D1. Phase 6 owns search-data.json (not Phase 5)

PLAN.md's Phase 5 description has a stale line listing search-data
under "Phase 5". PLAN-5 §1 corrects this: "What Phase 5 does NOT
do: Generate `sitemap.xml`, `robots.txt`, or
`assets/js/search-data.json` (Phase 6)". This document follows
PLAN-5's positioning. The next edit of PLAN.md should remove the
stale line from Phase 5's bullet list.

### D2. Redirect-stub collision detection

A `redirect_from` entry that resolves to the same destination as an
already-written page file would silently overwrite. The Ruby plugin
runs at Generator priority and overwrites Jekyll's not-yet-written
pages too; the order isn't deterministic.

tbdocs should detect and prevent this. Two strategies:

1. **Detect at compute time** (recommended): in Phase 6, build a
   `Set<destPath>` from `pages[]` upfront, then check each
   redirect-from's resolved destPath against the set before
   writing. Throw on collision with a message naming both the page
   that owns the destPath and the page that declared the
   colliding `redirect_from`. Cost: one Set construction
   (~838 entries) + one lookup per redirect (~290).
2. **Detect at write time**: use `fs.writeFile` with the `wx`
   flag (write-exclusive) on the redirect-stub writes. Throw if
   the file exists. Same end result, less informative error
   message.

Strategy 1 is what shipped -- the error message names both the
declaring page and the page it would overwrite, pointing the
human at the fix-able artefact. The shipped implementation also
catches the "two different pages declared the same redirect_from"
case via a parallel `seen: Map<destPath, page>` check.

Currently no such collision exists on the production tree (the
acceptance harness in §10 verifies via a synthetic clash). If one
is ever introduced intentionally (e.g. a page being moved and its
old URL becoming a redirect), the human author should remove the
page first; the collision check enforces that order.

### D3. Sitemap entries are sorted alphabetically

jekyll-sitemap doesn't sort -- its output follows Jekyll's internal
`site.html_pages` iteration order, which depends on filesystem
read order (OS-dependent and unstable across machines). tbdocs
sorts alphabetically by absolute URL for two reasons:

- **Diff stability.** A re-run on the same source tree produces
  byte-identical sitemap.xml output. Without sorting, a diff would
  show a moving "expected" order.
- **Acceptance check simplicity.** §10's check compares the SET of
  URLs against Jekyll's set; with both sorted, a `diff -u` of the
  two files shows exactly the URL deltas (if any).

The sitemap.org spec doesn't require an order; crawlers consume it
as a set.

### D4. File-level byte-parity is not the goal, but per-entry parity is

Jekyll's `search-data.json` reflects `site.html_pages` iteration
order, which is filesystem-dependent (OS, locale, build order).
tbdocs uses `srcRel`-ascending order (deterministic, matches Phase 1's
`pages[]` ordering). A `diff` of the two files surfaces only the
ordering difference -- noise, not signal.

The acceptance check in §10 therefore drops file-level byte
comparison and verifies parity at the **entry** level. Strict, no
tolerance:

- Entry count matches exactly.
- The SET of `(doc, title, url, relUrl)` quadruples matches exactly
  (same elements, same multiplicities, no extras, no missing).
- Each entry's `content` field is byte-identical to the
  corresponding Jekyll entry **except** for entries on pages listed
  in `accepted-divergences.mjs`, where the divergence is documented
  and signed off. A new unaccepted content divergence fails the
  harness.
- The numeric IDs are a contiguous 0-indexed sequence (lunr's only
  requirement on the ref field; renumbering is fine).

The client-side reader doesn't care about JSON-key ordering -- lunr
indexes content and returns matches by relevance, not by JSON
position. The "set parity + per-entry content parity" rule captures
everything that affects the reader without conflating it with the
filesystem-iteration-order noise.

### D5. Search index reads `page.renderedContent` (in-memory)

Two candidate inputs for the search-data splitter:

1. **`page.renderedContent`** (in-memory Phase 3 output). Body
   fragment with heading IDs, no layout, no anchor `<a>` injection.
   What Jekyll's `page.content` is at the point the search
   template runs.
2. **The on-disk `page.html`** Phase 5 wrote. Full layouted
   document; the search splitter would have to find the
   main-content `<div>` and split inside it (more error-prone --
   the chrome would contribute false-positive `<h2>` matches from
   the breadcrumb / aux-link surface).

Option 1 wins on every axis: cheaper, correct, matches the
upstream template's input. The `template.mjs` confirmation in §1
("Phase 4 reads `page.renderedContent` and writes `page.html` but
does not mutate `renderedContent`") makes this safe.

### D6. `static_files` sitemap loop is not ported

jekyll-sitemap's template iterates `site.static_files` for entries
with extensions in `%w(.htm .html .xhtml .pdf)`. On this site,
zero static files match (the only `.html` files in the source tree
are `404.html` and `book.html`, both of which have frontmatter and
become pages, not static files). The loop would emit zero entries
either way.

Not porting saves ~10 lines of code and one filter pass. If a
future contributor adds a `.pdf` or `.html` static file that
should be in the sitemap, the omission will surface as an absent
URL; the fix is to add it back. The acceptance check in §10 should
assert the static-file count remains zero so the regression is
caught.

### D7. `redirects.json` is not generated

`_config.yml` has `redirect_from: json: false`, which disables
jekyll-redirect-from's `redirects.json` output (the alternative
manifest file that lists every from/to pair as JSON, for clients
that want to consume the redirect map programmatically).

The config is honoured: tbdocs doesn't emit `redirects.json`
either. No flag is needed on the tbdocs side -- the file simply
isn't in our output. If a future deployment wants it, the
implementer would lift the per-page redirect-from loop into a
single JSON-stringify pass after the stub writes.

### D8. `seo.mjs` exports its URL helpers

Phase 2 left `absoluteUrl` and the HTML-strip helpers as private
functions inside `seo.mjs`. Phase 6 needs them. Two options:

1. **Re-export from `seo.mjs`** (recommended). One line per
   helper. Zero behaviour change. Maintains the convention that
   each module owns its primitives.
2. **Extract to a new `urls.mjs` module**. Cleaner separation but
   forces a bigger refactor; SEO and sitemap now both import from
   the new module.

Option 1 wins on minimum-change. If a third caller appears later,
option 2's refactor is mechanical (move the functions, update the
two import sites).

### D9. No `<lastmod>` in sitemap

jekyll-sitemap emits `<lastmod>` only when the page's frontmatter
declares `last_modified_at` or `date`. No page on this site sets
either. The output omits `<lastmod>` for every URL.

tbdocs mirrors this exactly: if `frontmatter.last_modified_at` or
`frontmatter.date` is unset (the universal case), no `<lastmod>`
emits. A future page that sets one would gain a `<lastmod>` entry
without further code changes. (For this rule to fire, the
implementer must parse the value the same way jekyll-sitemap does
-- a YAML `Date` for `date`, or a `Time`/`Date` for
`last_modified_at` -- and format with `date_to_xmlschema`. The
helper isn't needed in Phase 6's initial cut; defer until the
first page actually wants it.)

### D10. Robots.txt is generated when no source page shadows it

jekyll-sitemap's gem code checks `file_exists?("robots.txt")` over
`site.pages + site.static_files` and emits the generated robots.txt
only when no source file shadows it. The current source tree has
no `robots.txt`; the generated one always ships.

tbdocs's shipped sitemap.mjs implements the simpler half of this
rule: it checks `pages[]` for any page with `permalink: /robots.txt`
and emits the generated `robots.txt` when no match. A `staticFiles[]`
check (for an asset literally named `robots.txt` somewhere under the
source tree) is deferred -- no such file exists on this site, and
threading `staticFiles` through the substep signature for a
forward-compat check that never fires today felt premature. If a
future contributor adds either a `permalink: /robots.txt` page or a
literal `docs/robots.txt` static asset, the relevant branch is one-
line to extend in `writeSitemap` (and the verify harness already
guards against the obvious collisions).

### D11. Phase 6 runs in parallel

The orchestrator wraps the three substep calls in `Promise.all` to
overlap I/O and CPU. The three are independent (no shared mutable
state). On the dev machine the wall-time win is ~30-40 ms vs.
sequential.

If the `Promise.all` approach surfaces ordering issues in
acceptance (it shouldn't -- the outputs go to different files), a
sequential fallback is one keyword change.

### D12. Phase 6 reuses Phase 5's concurrency limiter

The ~290 redirect-stub writes need throttling on Windows (file
handle exhaustion at higher concurrency). Phase 5's limiter
(`runLimited`) and the `WRITE_LIMIT = 64` cap were both lifted to
module-level exports of `write.mjs` so `redirects.mjs` reuses them
directly. No new dependency; the `p-limit` fallback was avoided.

### D13. `book.html` is excluded from every Phase 6 output

`book.html` has:
- `frontmatter.title` = absent → excluded from search index (the
  template's `{% if page.title %}` filter).
- `frontmatter.sitemap` = `false` → excluded from sitemap.
- `frontmatter.redirect_from` = absent → no redirect stub.

No special-case needed in Phase 6 -- the per-substep filters
already handle it. (The orchestrator's other writes also skip
book.html: Phase 5's writer skips it because `page.html` is
undefined for book.html; Phase 8 will handle book.html separately
for the PDF tree.)

### D14. 404.html is excluded from sitemap only

`404.html` has:
- `frontmatter.title` = absent → excluded from search index.
- `frontmatter.sitemap` = absent → would be included by default,
  but jekyll-sitemap special-cases the URL `/404.html`. tbdocs
  matches.
- `frontmatter.redirect_from` = absent → no redirect stub.

The URL-based filter is more brittle than a frontmatter flag, but
it's what jekyll-sitemap does, and matching it keeps byte-parity
on the sitemap content. A future 404 page with a different
permalink would need either a `sitemap: false` flag or an updated
filter. Note in §10's verification check.

---

## 8. Edge cases

### Redirects

| Case | Handling |
|---|---|
| Page with `redirect_from` as a single string | Treated as a one-element list. Both shapes accepted. |
| Page with `redirect_from` containing a duplicate (same path listed twice) | Both writes target the same destPath; the second overwrites the first with identical content. Harmless. (No page on this site does this.) |
| Two different pages declaring the same `redirect_from` value | Detected as a collision in §7.D2's pre-check. The build aborts with a message naming both source pages. |
| Page with `redirect_from` value matching another page's `permalink` | Detected as a collision in §7.D2 (the redirect stub's destPath would overwrite a real page). Build aborts. |
| Page with `redirect_from` value matching its own `permalink` | The redirect would point to itself -- a redirect loop. Detected as a collision (the stub's destPath equals the page's destPath). Build aborts. |
| Page with `redirect_to: ...` in frontmatter | Not used on this site (grep confirms zero hits). The jekyll-redirect-from gem supports it (the page itself becomes a redirect stub); tbdocs doesn't port the feature. If a future page sets it, raise an error pointing at the page so it gets added explicitly. |
| `redirect_from` value with trailing slash | `permalinkToDestPath` (§6.1) maps it to `<path>/index.html`. The stub file lives at that nested location; the URL the visitor entered (`/foo/`) is served from there by GitHub Pages. |
| `redirect_from` value with explicit `.html` | `permalinkToDestPath` leaves it as `<path>.html`. (No page does this on this site.) |
| `redirect_from` value lacking a leading `/` | `permalinkToDestPath` strips the leading slash check (no-op) and proceeds. The destPath is the same. (No page does this; defensive.) |

### Sitemap

| Case | Handling |
|---|---|
| Page with `permalink: /` | `endsWith("/index.html")` is false → no strip. `absoluteUrl("/", config)` → `https://docs.twinbasic.com/`. One entry. |
| Page with `permalink: /Foo/` | No strip (doesn't end in `index.html`). `absoluteUrl` returns `https://docs.twinbasic.com/Foo/`. |
| Page with `permalink: /Foo/index.html` | Strip → `/Foo/`. `absoluteUrl` returns `https://docs.twinbasic.com/Foo/`. (No page on this site uses this form; the rule covers Jekyll's defaulting case.) |
| Page with `sitemap: false` | Excluded. (`book.html` is the only one.) |
| Page with `permalink: /404.html` | Excluded by the URL match. |
| Page whose permalink contains a `&` or `<` (hypothetical) | `xmlEscape` quotes them in `<loc>`. No such page exists. |
| Empty `pages[]` (degenerate) | The sitemap renders with no `<url>` entries. Valid sitemap.xml. |

### Search

| Case | Handling |
|---|---|
| Page with no `title` (`book.html`, `404.html`) | Skipped at the filter step. |
| Page with `search_exclude: true` | Skipped. (No page sets this currently.) |
| Page with `renderedContent` containing no `<h2>` (or higher up to `heading_level`) | `parts.length === 1` (just the prefix). `titleFound` stays false. One entry emitted using the page title and the full prefix as content. |
| Page where the first heading's text equals the page title AND `parts[0]` is empty | `titleFound = true`. Prefix entry suppressed. The section entry covers it. |
| Page where the first heading's text equals the page title but `parts[0]` is non-empty (preamble before the heading) | `titleFound` stays false. Prefix entry emitted with the preamble; section entry also emitted. The preamble is searchable. |
| Heading with no `id` attribute | URL stays as `page.permalink` (no fragment). The section is still searchable. Anchor-headings in Phase 4 adds ids to every heading, but Phase 6 reads renderedContent from Phase 3, where kramdown's slug emit already produces an id for every heading -- so this branch effectively doesn't fire on this site. |
| Heading text with embedded inline HTML (`<code>`, `<em>`, etc.) | `stripHtml` strips the tags from the title extract; the section's `title` field holds the text-only version. Matches the upstream template (`| strip_html`). |
| Section body with literal `</h1>` text in a `<pre>` / `<code>` block | The splitter treats it as a closing tag boundary. Produces extra sections -- matches the upstream template's behaviour (which has the same blind-split limitation). Not currently triggered by any page. |
| `heading_level` config set to 6 | The h2..h6 → h1 substitution runs 5 iterations. Sections include subsections at every level. Currently not configured; default 2 applies. |

---

## 9. What's NOT in Phase 6

These belong in later phases. Listed so the implementer doesn't get
tempted.

- **`search-data.js` (the JS-wrapped form of search-data.json)** --
  Phase 7's offlinify pass produces this for `_site-offline/`. It
  wraps the JSON content in `window.SEARCH_DATA = ...;` so the
  offline copy can load the index via `<script src=>` (which works
  on `file://`) instead of `XMLHttpRequest` (which doesn't). Phase
  6 only produces the plain JSON.
- **URL rewriting in redirect stubs for the offline tree** --
  Phase 7's offlinify pass rewrites each stub's four occurrences
  of the absolute target URL to a page-relative path. Phase 6's
  stubs always use absolute URLs.
- **Sitemap / robots.txt rewriting for the offline tree** -- Phase
  7's offlinify pass excludes `sitemap.xml` and `robots.txt`
  entirely from `_site-offline/` (per the `offline_exclude:` list
  in `_config.yml`). Phase 6 produces them; Phase 7 declines to
  copy them.
- **`book.html` rendering** -- Phase 8 (`book.mjs` renderer half +
  `pdf.mjs`) assembles `book.html` for the PDF tree. Phase 6
  doesn't touch it.
- **lunr index pre-compilation** -- the upstream just-the-docs has
  an alternative path (`custom-index.js`) that builds the lunr
  index at site-build time so the client doesn't have to. Not
  used on this site; not ported. The plain-JSON path is what
  ships.
- **Page-level link rewriting** -- already done by Phase 3's
  markdown-it pipeline (`[X](Y.md)` → `[X](/perm-of-Y)`). Phase 6
  consumes the rendered output as-is.

---

## 10. Verification

### Acceptance checklist for "Phase 6 is done"

1. After Phase 6 runs on the production tree:
   - `destRoot/sitemap.xml` exists, parses as well-formed XML.
   - `destRoot/robots.txt` exists, contains the single
     `Sitemap: https://docs.twinbasic.com/sitemap.xml` line.
   - `destRoot/assets/js/search-data.json` exists, parses as
     valid JSON.
   - ~290 redirect stubs exist at the destinations derived from
     `redirect_from` values across `pages[]`.
2. **Redirect parity:**
   - Stub count equals the total number of `redirect_from`
     entries across all pages (sum of list lengths for pages with
     list-form, plus 1 for string-form pages -- currently ~290).
   - For 5 spot-checked stubs (e.g. `tB/Core/Day.html`,
     `tB/Modules/TextEncodingConstants.html`): file content is
     byte-identical to Jekyll's output (after Jekyll's
     `bundle exec jekyll build`).
   - The collision-detection in §7.D2 fires when a fabricated
     `redirect_from` entry targets an existing page's permalink
     (test by temporarily adding `redirect_from: [/FAQ]` to any
     page and verifying the build aborts with a clear message).
3. **Sitemap parity:**
   - Entry count equals Jekyll's sitemap entry count -- currently
     836 (verify by `grep -c "<loc>"` on both files).
   - The SET of URLs (sorted) matches Jekyll's (sorted) byte-for-byte.
   - `book.html` URL absent (`sitemap: false` filter).
   - `404.html` URL absent (URL-match filter).
   - Homepage URL present as `https://docs.twinbasic.com/`.
   - Every other entry uses an absolute URL with the
     `https://docs.twinbasic.com` origin.
4. **Robots.txt parity:**
   - File is exactly `Sitemap: https://docs.twinbasic.com/sitemap.xml\n`
     (48 bytes). Byte-identical to Jekyll's output.
5. **Search index parity (strict):**
   - Entry count is **exactly** equal to Jekyll's. On the current
     tree that's 2,587. No tolerance band -- every divergence
     matters; a missing or extra entry is a defect.
   - The SET of `(doc, title, url, relUrl)` quadruples is the
     same as Jekyll's, byte-for-byte. No missing, no extra. Order
     and JSON-key numbering may differ (§7.D4).
   - Each entry's `content` field is byte-identical to Jekyll's
     **for every page not listed in `accepted-divergences.mjs`**.
     Pages already in that list may have one or more documented
     per-section content divergences; the verify harness records
     them as "accepted" and counts them so a category drop is
     visible, but does not fail on them. If a new content
     divergence appears on a page that is **not** accepted, the
     harness fails -- the cure is to either fix the underlying
     renderer divergence or add a documented entry to
     `accepted-divergences.mjs` (with a category, a precise note,
     and -- if its discovery was non-obvious -- a follow-up entry
     in [FUTURE-WORK.md](FUTURE-WORK.md)).
   - `book.html` and `404.html` have zero entries.
   - The JSON parses; `Object.keys(parsed)` is `["0", "1", ...,
     "N-1"]` contiguous.
   - The client-side `initSearch()` in `just-the-docs.js`
     successfully loads the index in a browser (load
     `destRoot/index.html` and type into the search box).
6. **Cross-substep:**
   - No file written by Phase 6 collides with a file written by
     Phase 5 (verify by listing the Phase-6-written paths and
     confirming each is either `sitemap.xml`, `robots.txt`,
     `assets/js/search-data.json`, or a redirect-stub path that
     doesn't appear in `pages[].destPath`).

### Verification harness

`verify-phase6.mjs` (~290 lines) extends the `verify-phase5.mjs`
pattern. It:

1. Runs `discover()` through `writePhase()` (Phases 1-5) into a
   scratch destination (`docs/_site-verify/`).
2. Runs Phase 6's three substeps with timing capture.
3. Asserts the items above. Where Jekyll output exists (in
   `docs/_site/`), diff against it as the parity reference. Where
   it doesn't, assert structural properties.
4. For the redirect-collision case: build a synthetic copy of
   `pages[]` with a deliberately colliding `redirect_from` (a known
   page's permalink fabricated onto another page's frontmatter),
   call `writeRedirects` with it, assert the call throws with a
   `/collision|conflict|overwrite/i` message. Cleans up the
   collision scratch tree on the way out.
5. Prints `OK <check>` / `FAIL: <reason>` per check, per-substep
   timings up front, `WARN` if total Phase 6 wall-time exceeds 300
   ms (3x the target).
6. Cleans up `docs/_site-verify/` and exits non-zero on any failure.

Total checks: 25 (7 redirects -- 1 count + 5 byte-checked stubs +
1 collision detection; 6 sitemap -- count + 2 set-diff + homepage
+ no-404 + no-book; 1 robots; 7 search -- count + key contiguity
+ no-book + no-404 + 2 set-diff + 1 per-entry-content; 3 cross-
substep collision; 1 perf line). Last green run: ~139 ms Phase 6
wall-time on the dev machine; 2586 byte-matching search entries +
1 accepted divergence on `Reference/Attributes.md`.

### Byte-for-byte parity matrix

| Output | Target | Notes |
|---|---|---|
| Each redirect stub HTML | byte-identical to Jekyll | Same template, same absolute URLs, no Jekyll-injected `<meta name="generator">` to strip. |
| `sitemap.xml` | byte-identical after sorting both | URL set must match exactly; tbdocs sorts alphabetically, Jekyll uses filesystem order. Compare via `sort -u`. |
| `robots.txt` | byte-identical (48 bytes) | Trivially the same. |
| `search-data.json` | set-strict + per-entry content byte-strict | The SET of `(doc, title, url, relUrl)` quadruples matches Jekyll's exactly; entry count matches exactly. IDs are renumbered (lunr's only requirement is contiguity from 0). Each entry's `content` matches Jekyll's byte-for-byte EXCEPT for entries on pages listed in `accepted-divergences.mjs`. There is no tolerance band -- a new content divergence on an unaccepted page is a defect, not noise. |

### Performance smoke check

From the repo root:

```sh
node builder/index.mjs                # one-line per-phase timings
cd builder && node verify-phase6.mjs  # 25-check harness + timings
```

Measured wall time on the dev machine (Windows 10, current
hardware, full pipeline through Phase 6):

| Substep | Target | Measured | Notes |
|---|---|---|---|
| Redirects (~290 stubs) | <60 ms | folded into parallel total | I/O-dominated; Phase 5's concurrency limiter caps at 64 in-flight writes. |
| Sitemap (build + 2 file writes) | <10 ms | folded into parallel total | One ~190 KB XML build + two writes. |
| Search (split + sanitise + build + 1 write) | <70 ms | folded into parallel total | ~2,587-section split + sanitise + 2.8 MB JSON build + one write. CPU-bound. |
| **Phase 6 total (parallel)** | <100 ms | 139-262 ms across runs | Wall-time = max(substeps) ≈ search substep, plus Node's I/O scheduling on Windows. |
| **Phase 6 soft cap** | 300 ms | -- | `verify-phase6.mjs` warns if exceeded; treat as a regression flag, not a build break. |

Phase 6's parallel total runs higher than the projected target on
Windows -- the search-data CPU pass and the ~290-stub I/O pass
overlap less perfectly than the projection assumed (Node's libuv
write pool serialises more on NTFS than the projection's mental
model of one big linux-style epoll loop). It's still well under
the soft cap and ~5-10x faster than the Jekyll equivalents
(jekyll-redirect-from ~500 ms, jekyll-sitemap ~150 ms via Liquid,
just-the-docs search-data Liquid ~800 ms). Reducing further would
need either pre-serialising fewer writes or a real bench against
the search substep's regex pass -- defer until Phase 7+ overall
timings show this is a blocker.

---

## 11. Dependencies needed for this phase only

Cumulative dependencies after Phase 6:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0"
  }
}
```

New in Phase 6: **nothing**. The substeps use only Node stdlib
(`node:fs`, `node:path`) plus the already-imported helpers from
`seo.mjs` and `write.mjs`.

The `lunr` dependency listed in PLAN.md is **not** needed by Phase
6. lunr runs client-side; Phase 6 only produces the JSON the
client feeds into lunr. The dependency would only be needed if
tbdocs precompiled the index (the `custom-index.js` path discussed
in §9), which it doesn't.

PLAN.md should be updated to remove `lunr` from the dependency
list -- it's a phantom dependency carried over from an earlier
draft that planned server-side index compilation. Defer the change
to the PLAN.md edit pass that accompanies the Phase 6 landing.

---

## 12. File layout after Phase 6

```
<repo root>/
  builder/
    PLAN.md                    — architecture overview
    PLAN-1.md                  — Phase 1 spec (shipped)
    PLAN-2.md                  — Phase 2 spec (shipped)
    PLAN-3.md                  — Phase 3 spec (shipped)
    PLAN-4.md                  — Phase 4 spec (shipped)
    PLAN-5.md                  — Phase 5 spec (shipped)
    PLAN-6.md                  — this file (Phase 6 shipped)
    FUTURE-WORK.md             — NEW: follow-up registry (entry 1 = Reference/Attributes.md secondary divergence)
    package.json               — unchanged (no new deps)
    discover.mjs               — Phase 1 (imports permalinkToDestPath from paths.mjs)
    nav.mjs                    — Phase 2 nav
    seo.mjs                    — Phase 2 SEO (exports absoluteUrl, stripHtml)
    book.mjs                   — Phase 2 book loader + resolver
    build-info.mjs             — Phase 2 build-info
    render.mjs                 — Phase 3
    highlight.mjs              — Phase 3 highlight
    template.mjs               — Phase 4
    compress.mjs               — Phase 4 compress
    write.mjs                  — Phase 5 (exports writeFileMkdirp, mkdirRec, runLimited, WRITE_LIMIT)
    paths.mjs                  — NEW: permalinkToDestPath shared between
                                 discover.mjs and redirects.mjs (§6.1)
    redirects.mjs              — NEW: §5.1 (with §7.D2 collision detection)
    sitemap.mjs                — NEW: §5.2 + §6.3 (also exports
                                 deriveSitemapUrls + extractSitemapUrls for
                                 triage tools)
    search.mjs                 — NEW: §5.3
    accepted-divergences.mjs   — updated: third bucket ("markdown-parsing")
                                 + Reference/Attributes.md (TestFixture) entry
    index.mjs                  — orchestrator extended (see below)
    verify-phase1.mjs          — Phase 1 harness (retired Phase 10)
    verify-phase2.mjs          — Phase 2 harness (retired Phase 10)
    verify-phase3.mjs          — Phase 3 harness (retired Phase 10)
    verify-phase4.mjs          — Phase 4 harness (retired Phase 10)
    verify-phase5.mjs          — Phase 5 harness (retired Phase 10)
    verify-phase6.mjs          — NEW: §10 acceptance harness (25 checks) (retired Phase 10)
    _diff.mjs                  — first-divergence single-page diff (unchanged)
    _diff_all.mjs              — per-bucket divergence audit (unchanged)
    _triage.mjs                — updated: top-line "Sitemap: MATCH/DIFFER"
                                 from in-memory deriveSitemapUrls vs on-disk
                                 _site/sitemap.xml
    _sitemap_diff.mjs          — NEW: file-vs-file sitemap URL set diff
    _spot.mjs                  — single-page output dump (unchanged)
  docs/                        — unchanged
```

### Extended `index.mjs` orchestrator

The Phase 6 addition to the orchestrator is a single `Promise.all`
block after `writePhase`:

```js
import { writeRedirects } from "./redirects.mjs";
import { writeSitemap }   from "./sitemap.mjs";
import { writeSearchData } from "./search.mjs";

// ... existing main() body up through writePhase ...
const writeStats = await writePhase(pages, staticFiles, { destRoot, dryRun });
t.lap("write");

let auxStats = null;
if (!dryRun) {
  const [redirectStats, sitemapStats, searchStats] = await Promise.all([
    writeRedirects(pages, site, destRoot),
    writeSitemap(pages, site, destRoot),
    writeSearchData(pages, site, destRoot),
  ]);
  auxStats = { redirects: redirectStats, sitemap: sitemapStats, search: searchStats };
}
t.lap("auxiliaries");

console.log(`Phase 1+2+3+4+5+6 done: ${pages.length} pages, ${staticFiles.length} static files`);
console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
            `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
            `-> ${destRoot}`);
if (auxStats) {
  console.log(`  aux:   ${auxStats.redirects.written} redirect stubs, ` +
              `${auxStats.sitemap.entries} sitemap entries, ` +
              `${auxStats.search.entries} search-index entries`);
}
console.log(t.summary());
```

`--dry-run` semantics: as with Phase 5, the dry-run flag skips
the Phase 6 substeps entirely (they're guarded by `if (!dryRun)`).
The compute work could be split out from the writes for a more
representative dry-run timing, but the current substep APIs are
write-coupled and Phase 6 is fast enough that the separation
hasn't paid off yet.

### Refactor: `paths.mjs`

Tiny new module (~15 lines) lifting `permalinkToDestPath` out of
`discover.mjs`. `discover.mjs` imports and re-exports for
backwards-compat or just imports; `redirects.mjs` imports. Single
source of truth.

```js
// paths.mjs
export function permalinkToDestPath(permalink) {
  let p = permalink.startsWith("/") ? permalink.slice(1) : permalink;
  if (p === "") return "index.html";
  if (p.endsWith("/")) return p + "index.html";
  const last = p.split("/").pop();
  if (/\.(html?|xml)$/i.test(last)) return p;
  return p + ".html";
}
```

### Refactor: `seo.mjs` exports

`absoluteUrl` was already exported by Phase 2's seo.mjs.
`stripHtml` (factored out of the inline `renderTitle` pipeline) is
now also exported. Phase 2's tests (`verify-phase2.mjs`) continue
to pass.

### Refactor: `write.mjs` exports

`mkdirRec`, `runLimited`, and `writeFileMkdirp` are now module-
level exports; `WRITE_LIMIT` exports the concurrency cap so
Phase 6 substeps share the same limit. Zero behaviour change to
Phase 5; `verify-phase5.mjs` still green.

---

## 13. What "done" Phase 6 actually enabled

The online site tree at `destRoot/` is **functionally complete**
after Phase 6:

- Every page is in the sitemap (so Google can crawl it). 836
  entries on the current tree, set-identical to Jekyll's.
- Every redirect resolves (so old URLs keep working). 290 stubs,
  byte-identical to Jekyll's.
- The search index loads (so the in-page search box works). 2,587
  entries, set-identical to Jekyll's, per-entry content byte-
  identical modulo one annotated accepted-divergence.
- Robots.txt points crawlers at the sitemap. Byte-identical.

The next session can implement Phase 7 (`offline.mjs`), which
takes the now-complete `destRoot/` tree as its sole input,
duplicates it into `_site-offline/`, and rewrites URLs to be
page-relative. Phase 7's offlinify pass reads the sitemap,
robots.txt, and search-data.json that Phase 6 produced (and
either copies them, transforms them, or skips them per the
`offline_exclude` config).

Phase 8 (`book.mjs` renderer + `pdf.mjs`) reads `bookData` (Phase
2) and the rendered page bodies (Phase 3) directly -- it doesn't
depend on Phase 6's outputs.

That clean handoff is the whole point of having an auxiliaries
phase as a standalone step.

### Carried into FUTURE-WORK.md

Phase 6's strict per-entry search-content scan surfaced one
divergence that the Phase 3/4 first-divergence tooling had been
masking: `Reference/Attributes.md` carries a kramdown-vs-markdown-
it strong-asterisk parse divergence at line 629, in addition to
the already-known JSON syntax-highlighting divergence the page was
accepted for. Logged as
[FUTURE-WORK.md](FUTURE-WORK.md) entry 1, with a multi-divergence
audit tool proposal that would find similar hidden secondaries on
other accepted pages. The shipped `accepted-divergences.mjs`
carries a second entry for `Reference/Attributes.md` under the new
`markdown-parsing` bucket; the verify harness reads the path Set
and counts the divergence as "accepted" rather than "failed".
