---
title: Pipeline Stages
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Pipeline-Stages
---

# Pipeline Stages
{: .no_toc }

Complete interface reference for every stage in the `tbdocs` build pipeline. Each section covers one module: its entry-point signature, the data it reads from prior stages, the data it writes for subsequent stages, and every exported symbol.

For design rationale and narrative descriptions, see [tbdocs Builder](Builder). To add a new stage or markdown-it plugin, see [Extending the Builder](Extending).

* TOC goes here
{:toc}

## Data model

The pipeline passes two mutable data structures through every stage.

### Page objects (`pages[]`)

`discover` creates one page object per `.md` or `.html` source file with parseable YAML frontmatter. Subsequent stages add new fields; no stage removes or renames a field set by an earlier one. Later stages can safely assume all fields from earlier stages are present.

| Field | Added by | Type | Description |
|---|---|---|---|
| `srcPath` | Phase 1 | `string` | Absolute filesystem path of the source file. |
| `srcRel` | Phase 1 | `string` | POSIX-style path relative to `srcRoot`, e.g. `Reference/Core/Dim.md`. |
| `ext` | Phase 1 | `string` | Lowercase file extension: `.md` or `.html`. |
| `frontmatter` | Phase 1 | `object` | Parsed YAML frontmatter. All frontmatter keys are accessible here (e.g. `frontmatter.title`, `frontmatter.parent`, `frontmatter.nav_order`). |
| `rawContent` | Phase 1 | `string` | Body text after the frontmatter block. |
| `permalink` | Phase 1 | `string` | URL path, taken from `frontmatter.permalink` or derived from `srcRel`. |
| `destPath` | Phase 1 | `string` | Filesystem path within the output root, e.g. `Reference/Core/Dim.html`. |
| `layoutDefault` | Phase 1 | `boolean` | `true` when frontmatter has no explicit `layout:` key. |
| `imageScope` | Phase 1 | `boolean` | `true` when `srcRel` contains an `Images/` segment. Phase 3 uses this to validate image paths. |
| `navPath` | Phase 2 (nav) | `string` | Slash-joined nav chain: `grand_parent / parent / title`. Set only on pages with a non-empty `title`. |
| `navLevels` | Phase 2 (nav) | `object` | Positional indices in the sidebar tree. Phase 4 uses this to generate the per-page activation CSS. |
| `breadcrumbs` | Phase 2 (nav) | `Page[]` | Ancestor chain from the root to the current page, nearest-first. |
| `children` | Phase 2 (nav) | `Page[]` | Immediate child pages in nav order. |
| `seoTitle` | Phase 2 (seo) | `string` | HTML-stripped, whitespace-collapsed page title for `<title>` and `og:title`. |
| `seoFullTitle` | Phase 2 (seo) | `string` | `"<seoTitle> -- <siteTitle>"` for non-home pages; equals `seoTitle` on the home page. |
| `seoCanonical` | Phase 2 (seo) | `string` | Absolute canonical URL (scheme + host + baseurl + permalink). |
| `seoIsHome` | Phase 2 (seo) | `boolean` | `true` when the page's permalink is a known home-page URL (e.g. `/`). |
| `renderedContent` | Phase 3 | `string` | HTML body produced by markdown-it. Not yet wrapped in the site layout. |
| `html` | Phase 4 | `string` | Complete HTML document, ready to write to disk. Absent on `layout: book-combined` pages, which Phase 8 owns. |

### Site object (`site`)

Built at the end of Phase 2 and passed unchanged to every subsequent phase.

| Field | Type | Description |
|---|---|---|
| `config` | `object` | Parsed `_config.yml`, with CLI overrides (`--baseurl`, `--url`) already applied. |
| `navTree` | `object` | Top-level nav hierarchy produced by `nav.mjs`. |
| `seoSiteTitle` | `string` | Rendered site title from `config.title`. |
| `seoLogoUrl` | `string` | Absolute URL of the site logo. |
| `buildInfo` | `object` | `{ commit: string, commitDate: string }` from git. Both fall back to `"unknown"` outside a git repository. |
| `bookData` | `object\|null` | Parsed `_data/book.yml` with chapter selectors resolved to `Page` references. `null` when the file is absent. See [Book Configuration](Book-Configuration). |
| `data` | `object` | All `_data/*.yml` files keyed by basename: `data.book`, `data.contributors`, and so on. |
| `markdown` | `MarkdownIt` | Shared markdown-it instance, built once during Phase 2 setup and reused by Phase 2's SEO pass and Phase 3's render pass. |

### Static files (`staticFiles[]`)

Also produced by Phase 1. Every file that is not a page --- images, fonts, prebuilt CSS/JS, and any `.md`/`.html` file without frontmatter --- becomes a static file object. This array does not grow after Phase 1.

| Field | Type | Description |
|---|---|---|
| `srcPath` | `string` | Absolute source path. |
| `srcRel` | `string` | POSIX path relative to `srcRoot`. |
| `destRel` | `string` | Relative path within the output root (currently the same as `srcRel`). |
| `size` | `number` | File size in bytes at discovery time. |

---

## Pre-phase: `mermaid.mjs`

Runs before Phase 1 so any freshly regenerated `.svg` files appear in Phase 1's static-file inventory.

**Entry point**

```js
regenerateMermaid(srcRoot: string): Promise<{
  processed: number,
  regenerated: number,
  failed: number,
  setupSkipped?: true,
}>
```

Enumerates `<srcRoot>/assets/images/mmd/*.mmd`, compares modification times against the `.svg` sibling at the same path, and drives `puppeteer` + the `mermaid` package directly to render each stale `.mmd` into its `.svg`. One browser launch covers the whole batch. The call is a no-op when no `.mmd` files are stale.

The render runs in an in-page `page.evaluate` that dynamic-imports `mermaid.esm.mjs` via a request-intercept origin (`https://tbdocs-mermaid.invalid`). The intercept maps requests back to `node_modules/mermaid/dist/`; the origin trick is needed because Chromium blocks the `import()` chain that `mermaid.esm.mjs` triggers when loaded over `file://`. The IIFE bundle (`mermaid.min.js`) would sidestep that constraint but inlines + minifies past the patched dagre chunk (see [Mermaid Dagre Patches](Fixes/Dagre)), so the ESM path with the intercept is the only one that keeps the patch effective.

Two failure-mode distinctions:

- **Setup failure** (`puppeteer` / `mermaid` not installed, Chrome runtime missing) returns `{ ..., setupSkipped: true }`, warns once, and leaves on-disk SVGs intact. The orchestrator does **not** flip the exit code.
- **Per-diagram render failure** (broken `.mmd`, mermaid render throws) does not abort the batch --- the loop continues so every broken diagram surfaces in one run, the previous SVG is retained for each failed diagram, and the orchestrator flips `process.exitCode = 1` based on the `failed` count.

**Reads:** `<srcRoot>/assets/images/mmd/*.mmd` and their `.svg` siblings; `node_modules/mermaid/dist/**` (resolved via `import.meta.url`-rooted `createRequire`).  
**Writes:** `.svg` files alongside stale `.mmd` sources.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `regenerateMermaid` | `(srcRoot) → Promise<{ processed, regenerated, failed, setupSkipped? }>` | Main entry point. |

---

## Phase 1: `discover.mjs`

Traverses the source tree and produces the `pages` and `staticFiles` arrays consumed by every later phase.

**Entry point**

```js
discover(srcRoot: string): Promise<{ pages: Page[], staticFiles: StaticFile[] }>
```

Runs a single `fast-glob` call over `srcRoot` with the hardcoded `IGNORE` exclude list (underscore-prefixed directories, prebuilt theme assets, toolchain files). For each `.md` or `.html` file, attempts to parse YAML frontmatter. Files with parseable frontmatter become page objects; everything else becomes static file objects. Pages are sorted by basename (mirroring Jekyll's reader); static files by relative path.

**Reads:** source files under `srcRoot`.  
**Writes (page fields):** `srcPath`, `srcRel`, `ext`, `frontmatter`, `rawContent`, `permalink`, `destPath`, `layoutDefault`, `imageScope`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `discover` | `(srcRoot) → Promise<{ pages, staticFiles }>` | Main entry point. |

---

## Phase 2: COMPUTE

Phase 2 runs several modules in sequence (with `captureBuildInfo` running in parallel). Together they build the `site` object and add nav, SEO, and book-chapter data to each page.

### `nav.mjs`

Computes the navigation tree from each page's `title`, `parent`, and `grand_parent` frontmatter keys. The only Phase 2 substep that can abort the build --- it throws on orphan or ambiguous `parent:` declarations.

**Entry point**

```js
computeNav(pages: Page[], config: object): { navTree: object }
```

Runs six substeps in sequence: nav-path, nav-integrity check, shared-state build (`byTitle` / `byParentTitle` maps, `topLevel` list, `orderedChildren` map), nav-tree, nav-levels, breadcrumbs, children. Returns the nav tree for the site object; writes nav-related fields directly onto each page object.

**Reads:** `frontmatter.title`, `frontmatter.parent`, `frontmatter.grand_parent`, `frontmatter.nav_order`, `frontmatter.nav_exclude`, `page.permalink`, `config.nav_sort`, `config.case_insensitive`.  
**Writes (page fields):** `navPath`, `navLevels`, `breadcrumbs`, `children`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `computeNav` | `(pages, config) → { navTree }` | Main entry point. |

---

### `seo.mjs`

Pre-computes SEO metadata for every page and for the site as a whole.

**Entry point**

```js
precomputeSeo(pages: Page[], config: object, markdown: MarkdownIt): { seoSiteTitle: string, seoLogoUrl: string }
```

For each page, runs the title through `renderTitle` (markdown-it render → strip HTML → collapse whitespace → escape HTML entities) and writes four SEO fields to the page object. Returns `seoSiteTitle` and `seoLogoUrl` for the site object. Requires the shared markdown-it instance to be built via `createMarkdownIt` before this call.

**Reads:** `frontmatter.title`, `frontmatter.permalink`, `page.permalink`, `config.title`, `config.url`, `config.baseurl`, `config.logo`, `site.markdown`.  
**Writes (page fields):** `seoTitle`, `seoFullTitle`, `seoCanonical`, `seoIsHome`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `precomputeSeo` | `(pages, config, markdown) → { seoSiteTitle, seoLogoUrl }` | Main entry point. |
| `renderTitle` | `(text: string, markdown: MarkdownIt) → string` | Runs one title string through the full markdown-it + strip-HTML pipeline. |
| `stripHtml` | `(s: string) → string` | Strips all HTML tags from a string. Re-exported for `search.mjs`. |
| `absoluteUrl` | `(input: string, config: object) → string` | Resolves a root-relative path to an absolute URL using `config.url` and `config.baseurl`. Re-exported for `sitemap.mjs` and `redirects.mjs`. |
| `relativeUrl` | `(input: string, config: object) → string` | Prepends `config.baseurl` to a root-relative path. |

---

### `book.mjs` --- Phase 2 half

Resolves the `_data/book.yml` chapter selectors to concrete `Page` arrays so Phase 8 has no further page lookups to do.

**Phase 2 entry point**

```js
resolveBookChapters(bookData: object | null, pages: Page[]): void
```

Iterates over every entry in `bookData.front_matter` and `bookData.parts` (and their `chapters` sub-arrays), resolves each selector to a `Page[]`, and stores the result as `entry._chapters`. Pre-resolves `landing_page` and `foreword_page` URLs to their `Page` references. Operates in-place; returns nothing. See [Book Configuration](Book-Configuration) for the selector schema.

**Reads:** `bookData` (loaded by `data.mjs`), `page.permalink`, `page.navPath`.  
**Writes:** `entry._chapters` on each `bookData` entry (not a page field). Sets `_landing` and `_foreword` references on entries that declare `landing_page:` / `foreword_page:`.

Phase 8's `assembleBook` lives in the same module; see [Phase 8](#phase-8-pdfmjs--bookmjs) below.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `loadBookData` | `(srcRoot: string) → Promise<object\|null>` | Back-compat wrapper that loads `_data/book.yml` directly. Prefer `data.mjs` instead. |
| `resolveBookChapters` | `(bookData, pages) → void` | Phase 2 entry point. |
| `sortByNavOrder` | `(input: Page[]) → Page[]` | Sorts a page array: index pages (URLs ending in `/`) first, then by `nav_order` ascending with title as tie-breaker, then alphabetically by title. |
| `chapterAnchorFromUrl` | `(url: string, fallbackTitle?: string) → string` | Converts a page URL to the `ch-…` anchor slug used for in-book cross-references. |
| `bookChapterTransform` | `(body: string, baseurl: string, headingShiftN: number, chapterAnchor: string) → string` | Applies all per-chapter body transforms to a rendered HTML string: baseurl-prefix stripping, `<details>` / `<summary>` unwrapping, whitespace wrapping for pagedjs page breaks, heading-level shift, and chapter-anchor prefixing. |
| `assembleBook` | `(site: object, pages: Page[]) → string` | Phase 8 entry point. Returns the assembled `book.html` string. |
| `rewriteBookHrefs` | `(html: string, site: object, pages: Page[]) → string` | Rewrites intra-book absolute `href="/X"` references to in-page `href="#ch-X"` fragment anchors. |

---

### `build-info.mjs`

Captures git commit hash and date for the PDF title page.

**Entry point**

```js
captureBuildInfo(): Promise<{ commit: string, commitDate: string }>
```

Issues two parallel `git` shell-outs (`rev-parse --short HEAD` and `log -1 --format=%cs`). Falls back to `"unknown"` on any failure, so the build never aborts outside a git repository. The orchestrator launches this promise immediately after Phase 1 so the shell-outs overlap with the CPU-bound nav computation.

**Reads:** local git repository state.  
**Writes:** nothing to pages (result returned directly to the orchestrator).

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `captureBuildInfo` | `() → Promise<{ commit, commitDate }>` | Main entry point. |

---

### `data.mjs`

Loads every `_data/*.yml` file under `srcRoot` into a flat object.

**Entry point**

```js
loadData(srcRoot: string): Promise<object>
```

Returns a plain object keyed by file basename without extension: `_data/book.yml` → `{ book: … }`, `_data/contributors.yml` → `{ contributors: … }`. Returns `{}` when the `_data/` directory is absent. The orchestrator stores the result at `site.data` and also exposes `site.data.book` as `site.bookData`.

**Reads:** `<srcRoot>/_data/*.yml`.  
**Writes:** nothing to pages (result returned directly).

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `loadData` | `(srcRoot: string) → Promise<object>` | Main entry point. |

---

### Phase 2 setup --- shared markdown-it instance

Before Phase 2 completes, the orchestrator builds the shared markdown-it instance that both Phase 2's SEO pass and Phase 3's render pass reuse. Three functions from `render.mjs` are called in sequence:

```js
const highlighter = await initHighlighter({ copyButton: boolean });
const linkTables  = buildLinkTables(pages);
const markdown    = createMarkdownIt({ highlighter, linkTables, baseurl, staticFiles });
```

These functions are documented under [Phase 3](#phase-3-rendermjs) below since they are defined in `render.mjs`. They are called here during Phase 2 only to allow the SEO pass to share the same configured pipeline.

---

## Phase 3: `render.mjs`

Renders every page's `rawContent` to HTML via markdown-it.

**Entry point**

```js
renderPhase(pages: Page[], site: object, staticFiles?: StaticFile[]): Promise<void>
```

Renders each page's `rawContent` to `page.renderedContent` using the shared `site.markdown` instance. Skips pages with `layout: book-combined` (Phase 8 owns those).

**Reads:** `page.rawContent`, `page.frontmatter`, `page.imageScope`, `site.markdown`, `site.config.baseurl`, `staticFiles` (for image-path validation).  
**Writes (page fields):** `renderedContent`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `renderPhase` | `(pages, site, staticFiles?) → Promise<void>` | Main entry point. |
| `createMarkdownIt` | `({ highlighter, linkTables, baseurl, staticFiles }) → MarkdownIt` | Configures and returns a markdown-it instance with all plugins and render-rule overrides applied. See [Extending the Builder](Extending) for how to add a plugin here. |
| `initHighlighter` | `({ copyButton?: boolean }) → Promise<{ render, themeCss }>` | Initialises Shiki with the bundled twinBASIC grammar (delegates to `highlight.mjs` internally). `render(code, lang)` returns highlighted HTML; `themeCss` is the generated `tb-highlight.css` string or `null` when no theme was loaded. |
| `buildLinkTables` | `(pages: Page[]) → { byPath, byUrl, byRedirect }` | Builds lookup tables keyed by `srcRel`, `permalink`, and `redirect_from` entries. Used by the relative-links plugin to resolve in-source `[X](Y.md)` links to absolute URLs at render time. |
| `kramdownSlug` | `(text: string) → string` | Converts heading text to a kramdown-compatible anchor slug: lowercase, strip non-word characters, deduplicate with `-1`, `-2`, and so on. |
| `rewriteAdmonitions` | `(src: string) → string` | Pre-render text pass: converts GFM `> [!NOTE]` / `[!IMPORTANT]` / `[!WARNING]` / `[!TIP]` / `[!CAUTION]` blocks to the `markdown-alert markdown-alert-<type>` class structure. |

---

## Phase 4: `template.mjs` and `compress.mjs`

Phase 4 wraps each page's `renderedContent` in the full site layout and then compresses the resulting HTML.

### `template.mjs`

**Entry point**

```js
templatePhase(pages: Page[], site: object): Promise<void>
```

Pre-computes the per-build static sidebar HTML once, then wraps each page's `renderedContent` in the just-the-docs layout via direct JS template-literal concatenation (no template engine). Calls `compressHtml` on each page's output before storing the result. Skips `layout: book-combined` pages.

**Reads:** all page fields set by Phases 1--3, all `site` fields.  
**Writes (page fields):** `html`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `templatePhase` | `(pages, site) → Promise<void>` | Main entry point. |
| `navActivationCss` | `(page: Page) → string` | Generates the per-page `<style id="jtd-nav-activation">` block from `page.navLevels`. Phase 12's dev server calls this when patching in the SSE reload script. |
| `injectAnchorHeadings` | `(html: string) → string` | Adds `<a class="anchor-heading">` next to every heading that has an `id` attribute. |

---

### `compress.mjs`

`templatePhase` calls `compressHtml` internally. The function is also exported for standalone use.

**Entry point**

```js
compressHtml(html: string): string
```

Splits on `<pre>…</pre>` blocks, collapses ASCII whitespace in the non-`<pre>` segments to a single space, and trims. Uses the explicit character class `[ \t\n\r\f\v]+` rather than `\s` to preserve non-breaking spaces in `&nbsp;`-based indentation.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `compressHtml` | `(html: string) → string` | Compresses whitespace outside `<pre>` blocks. |

---

## Phase 5: `write.mjs`

Materialises the in-memory page set and static files to disk.

**Entry point**

```js
writePhase(
  pages: Page[],
  staticFiles: StaticFile[],
  {
    destRoot: string,
    dryRun?: boolean,
    generatedAssets?: { rel: string, content: string }[],
    baseurl?: string
  }
): Promise<{ pages: { written, skipped }, theme: { copied }, staticFiles: { copied } }>
```

Clears then recreates `destRoot`, then runs three operations in parallel: writes each `page.html` to its `destPath`; copies `builder/assets/` to `<destRoot>/assets/` (with a CSS `url()` baseurl rewrite for non-empty baseurls); and copies every `staticFiles[]` entry. Skips pages where `page.html` is `undefined`.

**Reads:** `page.html`, `page.destPath`, `staticFile.srcPath`, `staticFile.destRel`.  
**Writes:** `<destRoot>/**` (the online tree).

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `writePhase` | `(pages, staticFiles, opts) → Promise<stats>` | Main entry point. |
| `WRITE_LIMIT` | `64` | Concurrency ceiling for `runLimited`. Phases 6, 7, and 8 pass this value to their own `runLimited` calls for consistent I/O throttling. |
| `isUnderProject` | `(destRoot: string) → boolean` | Returns `true` only when `destRoot` is a descendant of the project root. Used by Phases 7 and 8 as a guard against destructive `--dest` values. |
| `mkdirRec` | `(dir: string) → Promise<void>` | Recursive `mkdir` with an in-flight deduplication cache. Shared by Phases 6, 7, and 8. |
| `runLimited` | `<T>(items: T[], limit: number, fn: (T) → Promise<any>) → Promise<void>` | Runs `fn` on each item with at most `limit` concurrent operations. |
| `writeFileMkdirp` | `(filePath: string, content: string\|Buffer) → Promise<void>` | Writes `content` to `filePath`, creating parent directories as needed. |
| `safeWrite` | `(dest: string, fn: () → Promise<any>) → Promise<void>` | Wraps a write callback and re-throws with `dest` in the error message if the callback throws. |

---

## Phase 6: Auxiliaries

Phase 6 runs three writers concurrently. None writes to page objects; all write to `<destRoot>/`.

### `redirects.mjs`

**Entry point**

```js
writeRedirects(pages: Page[], site: object, destRoot: string): Promise<{ written: number }>
```

For each page with a `redirect_from:` frontmatter entry, writes one HTML stub per source URL. Each stub uses `<script>location=…</script>`, `<meta http-equiv="refresh">`, a `<link rel="canonical">`, `<meta name="robots" content="noindex">`, and a visible `<a>` fallback for no-script/no-meta-refresh environments.

**Reads:** `page.frontmatter.redirect_from`, `page.permalink`, `site.config`.  
**Writes:** redirect stub HTML files under `<destRoot>/`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `writeRedirects` | `(pages, site, destRoot) → Promise<{ written }>` | Main entry point. |
| `deriveRedirectStubs` | `(pages, site) → Array<{ from, to, destPath }>` | Pure derivation of the stub list without writing to disk. Exported so `offline.mjs` can read the list without re-running the derivation. |

---

### `sitemap.mjs`

**Entry point**

```js
writeSitemap(pages: Page[], site: object, destRoot: string): Promise<{ entries: number }>
```

Filters pages by jekyll-sitemap rules (drops `sitemap: false` and `/404.html`), sorts absolute URLs alphabetically for byte-identical re-runs, and emits `sitemap.xml`. Also writes `robots.txt` with a `Sitemap:` reference.

**Reads:** `page.permalink`, `page.frontmatter.sitemap`, `site.config`.  
**Writes:** `<destRoot>/sitemap.xml`, `<destRoot>/robots.txt`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `writeSitemap` | `(pages, site, destRoot) → Promise<{ entries }>` | Main entry point. |
| `deriveSitemapUrls` | `(pages, site) → string[]` | Returns the sorted list of absolute URLs that would appear in the sitemap, without writing to disk. |
| `extractSitemapUrls` | `(xml: string) → string[]` | Parses an existing `sitemap.xml` string and extracts its `<loc>` values. Useful for diffing two builds. |
| `renderRobotsTxt` | `(config: object) → string` | Produces the `robots.txt` content string. |

---

### `search.mjs`

**Entry point**

```js
writeSearchData(pages: Page[], site: object, destRoot: string): Promise<{ entries: number }>
```

Splits each titled, non-`search_exclude` page by headings, emits one search-index entry per heading-bounded section, and writes a Lunr-compatible JSON index.

**Reads:** `page.renderedContent`, `page.frontmatter.title`, `page.frontmatter.search_exclude`, `page.permalink`, `page.seoTitle`, `site.config`.  
**Writes:** `<destRoot>/assets/js/search-data.json`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `writeSearchData` | `(pages, site, destRoot) → Promise<{ entries }>` | Main entry point. |
| `deriveSearchEntries` | `(pages, site) → object[]` | Returns the search-index entry array without writing to disk. |

---

## Phase 7: `offline.mjs`

Mirrors `<destRoot>/` to `<destRoot>-offline/`, rewriting every URL to a page-relative path so the tree opens under `file://`.

**Entry point**

```js
writeOffline(
  pages: Page[],
  staticFiles: StaticFile[],
  site: object,
  destRoot: string,
  { auxStats?: object, profileOffline?: boolean }
): Promise<{ html, css, redirects, statics, assets, excluded, unresolved }>
```

Reads every file written by Phases 5 and 6, rewrites absolute URLs to relative paths, and writes to `<destRoot>-offline/`. Patches `just-the-docs.js` via AST (acorn) to replace `navLink` and `initSearch` with offline-compatible implementations. Wraps `search-data.json` as an inline `window.SEARCH_DATA` assignment.

**Reads:** all files under `<destRoot>` (online tree), `auxStats.redirects` (redirect stub list from Phase 6).  
**Writes:** all files to `<destRoot>-offline/`.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `writeOffline` | `(pages, staticFiles, site, destRoot, opts) → Promise<stats>` | Main entry point. |
| `buildOfflineState` | `(pages, staticFiles, site, destRoot, { stubs? }) → Promise<OfflineState>` | Constructs the state object (site-path set, resolution caches, per-directory nav caches) used by all offline derivation functions. |
| `deriveOfflinePage` | `(page: Page, state: OfflineState) → string` | Rewrites one page's HTML for offline use. |
| `deriveOfflineRedirect` | `(stub, state: OfflineState) → string` | Rewrites a redirect stub's HTML for offline use. |
| `deriveOfflineCss` | `(cssIn: string, themeRel: string, state: OfflineState) → string` | Rewrites `url()` references in a CSS file to page-relative paths. |
| `deriveOfflineJtdJs` | `(src: string) → string` | Patches `just-the-docs.js` via AST: replaces `navLink` and `initSearch` with offline-compatible implementations. A parse failure at build time is a signal that re-extraction produced unreadable source. |
| `deriveOfflineSearchDataJs` | `(jsonBytes: Buffer) → string` | Wraps `search-data.json` as `window.SEARCH_DATA = …` and minifies it. |

---

## Phase 8: `pdf.mjs` + `book.mjs`

Produces the sparse `<destRoot>-pdf/` tree that `render-book.mjs` renders into a PDF.

**Entry point**

```js
writePdf(
  pages: Page[],
  staticFiles: StaticFile[],
  site: object,
  destRoot: string,
  { tolerateMissingImages?: boolean }
): Promise<{ bookBytes, css, images, missing }>
```

Calls `book.mjs`'s `assembleBook(site, pages)` to produce `book.html`, copies `print.css` and `tb-highlight.css`, and collects every image referenced in `book.html`. Reports missing images as build errors by default; `--tolerate-missing-images` downgrades them to warnings.

**Reads:** `site.bookData` (with chapter selectors resolved by Phase 2's `resolveBookChapters`), all pages' `page.html`, `staticFiles`.  
**Writes:** `<destRoot>-pdf/book.html`, `<destRoot>-pdf/*.css`, image copies in `<destRoot>-pdf/`.

**`book.mjs` Phase 8 entry point**

```js
assembleBook(site: object, pages: Page[]): string
```

Traverses `site.bookData`, emits a title page, then iterates over `front_matter` and `parts` in order. For each chapter, calls `bookChapterTransform` to apply the five body transforms. Then runs `rewriteBookHrefs` to convert intra-book absolute hrefs to `#ch-…` fragment anchors. Returns the complete `book.html` HTML string.

**All exports (`pdf.mjs`)**

| Symbol | Signature | Description |
|---|---|---|
| `writePdf` | `(pages, staticFiles, site, destRoot, opts) → Promise<stats>` | Main entry point. |
| `deriveBookOutputs` | `(pages, site) → { bookHtml: string, images: string[] }` | Pure-compute version: returns the assembled HTML and image-path list without writing to disk. |
| `extractImagePaths` | `(html: string) → string[]` | Extracts all image `src` / `href` paths from an HTML string. |

For `book.mjs` exports, see [Phase 2 `book.mjs`](#bookmjs--phase-2-half) above.

---

## Phase 12: `serve.mjs`

The long-lived dev server, activated by `tbdocs --serve`. This is a separate lifecycle from the one-shot build; it skips Phase 7 (offline) and Phase 8 (PDF).

**Entry point**

```js
runServe(opts: BuildOpts): Promise<void>
```

Runs an initial one-shot online build (Phases pre, 1--5), then starts an HTTP server on `opts.port` (default `4000`), a recursive source-tree watcher, and an SSE endpoint at `/_tbdocs/reload`. A 300 ms debounce fires a rebuild on file changes. On rebuild success, a reload event is sent to every connected browser tab.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `runServe` | `(opts: BuildOpts) → Promise<void>` | Main entry point. `BuildOpts` is the same object accepted by `runBuild`. |

---

## Shared helpers

### `paths.mjs`

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `permalinkToDestPath` | `(permalink: string) → string` | Converts a permalink URL to a destination file path. `/` → `index.html`; `/foo/` → `foo/index.html`; paths with `.html`, `.htm`, or `.xml` extensions are kept as-is; all other paths get `.html` appended. Used by Phase 1 and Phase 6. |

---

### `highlight-theme.mjs`

Called internally by `initHighlighter` in `highlight.mjs`; not normally called directly by other stages.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `loadHighlightTheme` | `(themesDir?: string) → Promise<{ scopeToClass, css }>` | Reads `Light.theme` and `Dark.theme`, groups TextMate-scope tokens by their (light-props, dark-props) pair, assigns one CSS class per unique pair, and returns the scope-to-class lookup and the generated `tb-highlight.css` content. |

---

## `tbdocs.mjs` --- orchestrator

The orchestrator sequences all stages and assembles the `site` object. It is not a stage itself.

**All exports**

| Symbol | Signature | Description |
|---|---|---|
| `runBuild` | `(opts: BuildOpts) → Promise<{ pages, staticFiles, site, destRoot }>` | Runs the full pipeline (pre-phase, Phases 1--8). Returns the final state so external harnesses can chain additional work. |
| `makeTimer` | `() → { lap(label: string): void, summary(): string }` | Lightweight lap timer. `lap(label)` records elapsed milliseconds since the last lap; `summary()` returns all laps as a `"label=Nms …"` string. |

`BuildOpts` fields:

| Field | Default | Description |
|---|---|---|
| `src` | `"docs"` | Source root, relative to `cwd`. |
| `dest` | `null` | Destination root. Defaults to `<src>/_site`. |
| `baseurl` | `null` | Overrides `config.baseurl`. |
| `url` | `null` | Overrides `config.url`. |
| `dryRun` | `false` | Skip all filesystem writes. |
| `skipOffline` | `null` | Skip Phase 7. `null` reads `also_build_offline` from `_config.yml`. |
| `skipPdf` | `null` | Skip Phase 8. `null` reads `also_build_pdf` from `_config.yml`. |
| `tolerateMissingImages` | `false` | Downgrade missing-image errors to warnings in Phase 8. |
| `profileOffline` | `false` | Emit per-substep timings for Phase 7 in the console output. |
| `serve` | `false` | Start Phase 12 instead of the one-shot build. |
| `port` | `4000` | HTTP port for Phase 12. |

## See Also

- [tbdocs Builder](Builder) -- architecture overview and narrative design rationale.
- [Book Configuration](Book-Configuration) -- `_data/book.yml` key reference.
- [Extending the Builder](Extending) -- tutorial for adding a new stage or markdown-it plugin.
