# tbdocs — Custom JS Static Site Generator

Port of the Jekyll + just-the-docs build pipeline to a single-purpose
Node.js tool. Goal: byte-equivalent output to Jekyll (modulo the
accepted-divergences allow-list), in compact dependency-light JS, no
framework.

## Status: phases 1-9 shipped, Phase 10 planned

All nine build phases land on the production tree and produce
byte-equivalent output to Jekyll modulo the entries in
[accepted-divergences.mjs](accepted-divergences.mjs). Phases 1-8 each
have their own acceptance harness ([verify-phase1.mjs](verify-phase1.mjs)
through [verify-phase8.mjs](verify-phase8.mjs)) that runs the
preceding phases into a scratch destination and asserts the §10
checks from the corresponding `PLAN-N.md`. Phase 9 is a no-output
consolidation pass; its acceptance is "Phases 1-8 still pass" rather
than a dedicated harness.

**Phase 9** (shipped, see [PLAN-9.md](PLAN-9.md)) consolidated every
FUTURE-WORK item which either didn't change build output or strictly
improved Jekyll parity. The CLI gained `--no-offline`, `--no-pdf`,
`--serving`, and `--profile-offline` flags. Phase 7 picked up a
per-destination-dir nav-block cache (~200 ms saved). Phase 8's image-
extraction folded into `assembleBook` and the PDF title-page date
switched to wall-clock to match Jekyll's `site.time`. A generic
`_data/*.yml` loader (`data.mjs`) replaced the book-specific YAML
load. `_diff.mjs` gained `--against-disk` and `--multi` modes; a new
`_audit_accepted.mjs` surfaces hidden secondary divergences behind
already-accepted entries; `verify-phase8.mjs` got a cross-reference
completeness audit. The codebase gained [README.md](README.md).

**Phase 10** (planned, see [PLAN-10.md](PLAN-10.md)) is the
Jekyll-to-tbdocs cutover: flip the default destination from
`_site-new` to `_site`, swap CI (`build.bat` / `serve.bat` /
`check.bat` / the GitHub Pages workflow) to invoke tbdocs instead
of `bundle exec jekyll build`, retire the verify-phase{1..8}.mjs
harnesses, and replace them with an expanded site-integrity
checker built on top of the existing [scripts/check_links.mjs](../scripts/check_links.mjs)
(HTML well-formedness, duplicate-ID detection, anchor resolution,
heading-hierarchy checks). The Jekyll source set (`docs/_plugins/`,
`docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`)
stays in tree for one release cycle as a reference, then deletes
in a follow-up commit.

**Phase 11** ([PLAN-11.md](PLAN-11.md)) picks up the output-changing
FUTURE-WORK items now that the byte-vs-Jekyll acceptance bar is
gone. Lands as five independent PRs: B2 (Shiki theming generated
from the vendored `.theme` files, replacing the Rouge-class
indirection in [highlight.mjs](highlight.mjs) and dropping
`rouge.css`) — shipped; B1 (mermaid auto-gen), B5 (copy-code SSR),
B10 (search-data minification), B11 (AST-based JTD patcher) —
pending. Sequenced after Phase 10 because Phase 11's intentional
divergences are only free to land once `accepted-divergences.mjs`
stops being the acceptance bar.

Open follow-ups (deferred enhancements, divergence investigations)
live in [FUTURE-WORK.md](FUTURE-WORK.md).

## Architecture

One entry point, ~14 modules. The content model is fixed (markdown + YAML frontmatter),
the output structure is fixed (three trees), the template is one layout with variations.

```
builder/                 (sibling of docs/, at the repo root)
  README.md              quickstart + module map (Phase 9 addition)
  index.mjs              entry point + orchestrator (also exports makeTimer)
  discover.mjs           file reading, frontmatter parsing
  nav.mjs                nav tree + breadcrumbs + nav-levels + children
  seo.mjs                per-page SEO metadata (shares site.markdown)
  book.mjs               book chapter resolution + PDF page assembly
  build-info.mjs         git commit + commit date capture
  data.mjs               generic _data/*.yml loader (Phase 9 addition)
  render.mjs             markdown-it pipeline setup
                          (exports createMarkdownIt, initHighlighter,
                           buildLinkTables for the orchestrator + tools)
  template.mjs           page layout as JS functions (replaces Liquid)
  compress.mjs           HTML whitespace collapse
  highlight.mjs          Shiki setup + twinBASIC grammar
  write.mjs              _site/ writer (page HTML + theme + static files)
  redirects.mjs          redirect stub pages
  sitemap.mjs            sitemap.xml + robots.txt
  search.mjs             Lunr search index generation (search-data.json)
  paths.mjs              shared dest-path helpers (Phase 5 + Phase 6)
  offline.mjs            URL rewriting for _site-offline/
                          (per-dest-dir nav-block cache as of Phase 9)
  pdf.mjs                sparse _site-pdf/ tree generation
  twinbasic.tmLanguage.json    TextMate grammar for twinBASIC
  accepted-divergences.mjs     allow-list consumed by every verify harness
  verify-phase{1..8}.mjs       per-phase acceptance harnesses
  _diff.mjs              single-target byte-diff (+ --against-disk, --multi)
  _diff_all.mjs          per-bucket divergence aggregation
  _triage.mjs            bulk classifier + auxiliary audit (+ --multi)
  _audit_accepted.mjs    accepted-divergence multi-region audit
                          (Phase 9 addition)
  _sitemap_diff.mjs      sitemap URL-set diff
  _spot.mjs              single-page output dump
```

The builder lives at the repo root (not under `docs/`) so it isn't part of
Jekyll's source tree and doesn't need to be excluded from Jekyll's input.
It reads from `docs/` and writes to `docs/_site/` / `docs/_site-offline/`
/ `docs/_site-pdf/` -- the same destinations Jekyll uses, so deployment
tooling (GitHub Pages serving from `/docs/`) stays unchanged.

Static assets (CSS, JS, SVGs) extracted once from the current Jekyll build live in
`builder/assets/` and get copied verbatim to `docs/_site/assets/` on each build.

## Dependencies

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0",
    "lunr": "^2.3"
  }
}
```

Seven production dependencies. No template engine, no framework, no
bundler. `js-yaml` is technically a transitive dep of `gray-matter`
(declared explicitly because Phase 2 loads `_config.yml` and
`_data/book.yml` directly). Phase 3 brings in `markdown-it-deflist`
and `markdown-it-footnote` alongside `markdown-it-attrs`; Phase 6
brings in `lunr` for the search index emitter.

## Build Phases

```
Phase 1: DISCOVER        ~120ms   Read .md/.html with frontmatter, enumerate static files     [shipped]
Phase 2: COMPUTE         ~60ms    Nav tree, breadcrumbs, SEO, book chapters, build-info       [shipped]
Phase 3: RENDER          ~1-2s    Markdown -> HTML (dominates build time)                     [shipped]
Phase 4: TEMPLATE        ~200ms   Wrap in layout, anchor headings, compress                   [shipped]
Phase 5: WRITE ONLINE    ~400ms   Write _site/                                                [shipped]
Phase 6: AUXILIARIES     ~100ms   Redirects, sitemap, search-data.json, robots.txt            [shipped]
Phase 7: WRITE OFFLINE   ~1000ms  URL-rewritten copy to _site-offline/                        [shipped]
Phase 8: WRITE PDF       ~150ms   Sparse copy to _site-pdf/                                   [shipped]
Phase 9: QoL + DOCS      (-200ms) FUTURE-WORK consolidation; no output change                 [shipped]
Phase 10: CUTOVER        (n/a)    Retire Jekyll; pivot harnesses to site-integrity checker    [shipped]
Phase 11: PARITY UPDATE  (TBD)    Output-changing FUTURE-WORK items (Shiki, mermaid, ...)     [shipped]
```

Timings are wall-clock measurements from `node builder/index.mjs` on
the current Windows dev machine. Per-phase target / cap details and
the per-substep breakdown live in each `PLAN-N.md`. Phase 9 is net
~200 ms faster than the post-Phase-8 baseline (Phase 7 nav-block
cache + Phase 8 image-extract fold); Phase 10 is a feature phase
with no perf budget set yet.

## Phase Specifications

### Phase 1: DISCOVER (`discover.mjs`)

Input: the `docs/` source tree. Excluded: all `_*` directories (catches
`_site/`, `_site-offline/`, `_site-pdf/`, `_data/`, `_includes/`, `_layouts/`,
`_sass/`, `_plugins/`, `_profile/`, and every `_Images/`), `assets/css/` and
`assets/js/` (theme assets, sourced from `builder/assets/` instead),
top-level Jekyll/toolchain files (`_config.yml`, `Gemfile`, `Gemfile.lock`,
`*.bat`), and `.jekyll-cache` / `.sass-cache` / `node_modules`. The builder
itself lives at `../builder/` (outside `docs/`) and isn't part of the
source tree.

Output: `{ pages, staticFiles }`.

- `pages[]` -- markdown (`.md`) and HTML (`.html`) with frontmatter (838
  currently: 836 .md + `404.html` + `book.html`). Each entry:
  `{ srcPath, srcRel, ext, frontmatter, rawContent, permalink, destPath, layoutDefault, imageScope }`.
- `staticFiles[]` -- everything else that survives the exclude rules
  (content images, `favicon.png`, `CNAME`, `render-book.mjs`, `lib/*.mjs`,
  `assets/images/mmd/*`). Each entry: `{ srcPath, srcRel, destRel, size }`.

Steps:
- Glob the tree (one fast-glob call with the exclude list).
- For each `.md`/`.html`: parse with gray-matter; if frontmatter present,
  emit a `Page`; otherwise treat as static.
- Compute `permalink` from `frontmatter.permalink`, or derive from `srcRel`
  (strip extension, prepend `/`, append `.html`) for the two pages that
  currently lack an explicit permalink.
- Compute `destPath` from `permalink`: `/` → `index.html`, trailing-slash
  → `<path>index.html`, explicit `.html`/`.htm`/`.xml` left as-is,
  everything else → `<path>.html`.

Replaces: Jekyll's file reader + frontmatter defaults + the source-tree
half of the static-file copy.

Full spec, design decisions, edge cases, and acceptance checklist:
[PLAN-1.md](PLAN-1.md).

### Phase 2: COMPUTE (`nav.mjs`, `seo.mjs`, `book.mjs`, `build-info.mjs`)

Input: the `{ pages, staticFiles }` object Phase 1 returned, plus
`docs/_config.yml` and `docs/_data/book.yml`.

Output: each titled page gains `navPath`, `breadcrumbs`, `children`, and
(when reachable from a top-level page) `navLevels`; every page gains
`seoTitle`, `seoFullTitle`, `seoCanonical`, and `seoIsHome`. A site-level
object collects `{ config, navTree, seoSiteTitle, seoLogoUrl, buildInfo,
bookData }` for the later phases to read.

Modules:

- **`nav.mjs`** -- six nav substeps (nav-path, integrity-check, nav-tree,
  nav-levels, breadcrumbs, children) sharing one pass over the titled
  set and the ordered-children memo. Ports the six Ruby plugins under
  `_plugins/nav-*.rb` + `breadcrumbs-precompute.rb` + `children-precompute.rb`.
- **`seo.mjs`** -- markdown-it-driven `text | markdownify | strip_html |
  normalize_whitespace | escape_once` pipeline + Node-`URL`-driven
  `absolute_url` / `uri_escape`. Ports `_plugins/seo-precompute.rb`.
- **`book.mjs`** -- loads `_data/book.yml` and resolves every entry's
  selector schema (`page` / `pages` / `nav_page` / `nav_pages` +
  `no_descent`) to a concrete `Array<Page>` plus pre-resolved
  `landing_page` / `foreword_page` references. Phase 8's renderer half
  will land in the same file. Ports `_plugins/book-resolve-chapters.rb`
  + `book-sort.rb`.
- **`build-info.mjs`** -- two parallel `git` shell-outs producing
  `{ commit, commitDate }`; falls back to `"unknown"` outside a repo.
  Ports `_plugins/build-info.rb`.

Replaces: ten Ruby plugins totalling ~1,460 lines of code that ran in
Jekyll's GENERATE phase for ~1.5 s combined. The JS port is ~650 lines
of compute code (the four modules above) and runs in ~60 ms -- 25×
faster.

Full spec, design decisions, edge cases, acceptance checklist, and
measured timings: [PLAN-2.md](PLAN-2.md).

### Phase 3: RENDER (`render.mjs`, `highlight.mjs`)

Input: the `{ pages, staticFiles, site }` object Phase 2 returned. Phase 3
reads each page's `rawContent` (markdown body) and writes one new field,
`renderedContent`, holding the HTML body fragment.

Modules:

- **`render.mjs`** -- markdown-it base setup (`html: true`, `typographer:
  true`, `linkify: false`, `breaks: false`), plus a pre-render text pass
  for GFM admonitions, plus plugins: `markdown-it-attrs` (with the
  kramdown-style `{:` delimiter), `markdown-it-deflist`,
  `markdown-it-footnote` (with rendering rules overridden to match
  kramdown's `fnref:N` shape), custom plugins for header IDs (kramdown
  slug algorithm), auto-TOC (`{:toc}`), relative-link rewriting
  (`[X](Y.md)` → `[X](/perm-of-Y)` using by-path / by-permalink /
  by-redirect-from tables), and `markdown="1"` block-HTML recursion.
- **`highlight.mjs`** -- Shiki bootstrap, the
  `builder/twinbasic.tmLanguage.json` grammar, a scope-to-Rouge-class
  mapper so the existing `rouge.css` keeps working byte-for-byte, and
  the wrapper-div emitter producing the Rouge-shaped `<div
  class="language-tb highlighter-rouge"><div class="highlight"><pre
  class="highlight"><code>...</code></pre></div></div>` structure.

Replaces: kramdown's GFM converter + jekyll-relative-links (with the
patch) + jekyll-gfm-admonitions (with the two patches) + Rouge + the
custom `_plugins/twinbasic.rb` Rouge lexer. The JS port produces
byte-equivalent body HTML modulo the entries in
`accepted-divergences.mjs` (a small set of kramdown-vs-markdown-it
edge cases that aren't worth the cost of a fix); verified per-page
by `verify-phase3.mjs`.

Full spec, design decisions, edge cases, acceptance checklist,
TextMate-grammar port plan, and implementation order:
[PLAN-3.md](PLAN-3.md).

### Phase 4: TEMPLATE (`template.mjs`, `compress.mjs`)

The layout is a single JS function returning an HTML string. The ~13
Liquid includes become helper functions called inline. Full spec:
[PLAN-4.md](PLAN-4.md).

```js
export function renderPage(page, site) {
  return `<!DOCTYPE html>
<html lang="en">
<head>${renderHead(page, site)}</head>
<body>
  ${svgSprites}
  <div class="page-wrap">
    ${renderSidebar(site.navTree, page)}
    <div class="main">
      ${renderBreadcrumbs(page)}
      <div class="main-content-wrap">
        <div class="main-content" id="main-content">
          ${renderTitle(page)}
          ${page.renderedContent}
          ${renderChildrenNav(page)}
        </div>
      </div>
      ${renderFooter(page, site)}
    </div>
  </div>
  ${renderScripts(page, site)}
</body></html>`;
}
```

Sub-functions:
- `renderHead()` -- meta tags, CSS links, dark-mode early script, nav-activation `<style>`
- `renderSidebar()` -- recursive nav tree rendering (replaces site_nav.html + nav/links.html)
- `renderBreadcrumbs()` -- breadcrumb trail from `page.breadcrumbs`
- `renderTitle()` -- page H1 with optional logo
- `renderChildrenNav()` -- auto-generated child page list
- `renderFooter()` -- edit link, offline link, last-modified, copyright, VBA attribution
- `renderScripts()` -- Lunr, just-the-docs.js, theme-switch.js

**Anchor headings** (~20 lines): Regex pass adding `<a>` with SVG to each `<hN id="...">`.

**HTML compress** (~10 lines): Split on `<pre>...</pre>`, collapse whitespace in non-pre segments.

**Nav activation CSS** (~30 lines): Generate the per-page `<style id="jtd-nav-activation">`
block from `page.navLevels` -- positional `:nth-child()` selectors.

### Phase 5: WRITE ONLINE (`write.mjs`)

- For each page: write destPath to `_site/`
- Copy theme assets: `builder/assets/` -> `docs/_site/assets/` (CSS, JS, sprites)
- Copy every entry in `staticFiles[]` (from Phase 1) to its `destRel` under
  `_site/` -- content images, `favicon.png`, `CNAME`, `render-book.mjs`,
  `lib/*.mjs`, `assets/images/mmd/*`

Pure filesystem I/O -- no transformation, no URL rewriting. Phase 6
adds `search-data.json`, redirects, sitemap, and robots.txt alongside
Phase 5's output. Full spec: [PLAN-5.md](PLAN-5.md).

### Phase 6: AUXILIARIES (`redirects.mjs`, `sitemap.mjs`, `search.mjs`)

**Redirects** (`redirects.mjs`):
- For each page with `redirect_from` in frontmatter, generate a minimal HTML page
  with `<meta http-equiv="refresh">` + JS redirect. Same format as jekyll-redirect-from.

**Sitemap** (`sitemap.mjs`):
- Standard `sitemap.xml` from all page permalinks. Same output as jekyll-sitemap.
- Writes `robots.txt` alongside (one-line `Sitemap:` reference).

**Search index** (`search.mjs`):
- Walk rendered pages, strip HTML tags, split by headings into sections
- Emit JSON: `{ "0": { doc, title, content, url, relUrl }, ... }`
- Same format the client-side Lunr consumer expects -- zero client JS changes needed

Full spec: [PLAN-6.md](PLAN-6.md).

### Phase 7: WRITE OFFLINE (`offline.mjs`)

The algorithmic core of offlinify.rb:

For each HTML file in `_site/`:
1. Rewrite `href`/`src` attributes: root-absolute -> page-relative
   - Probe: `path`, `path.html`, `path/index.html`
   - Compute relative prefix via path segment counting
2. Inject `<script>window.OFFLINE_SITE_ROOT="../../";</script>`
3. Inject `<script src="../../assets/js/search-data.js"></script>`

For CSS files: rewrite `url()` references similarly.

One-time operations:
- Patch `just-the-docs.js` (navLink + initSearch replacements)
- Generate `search-data.js` wrapper: `window.SEARCH_DATA = {...};`

Skip patterns: CNAME, robots.txt, sitemap.xml, book.html (per
`offline_exclude` config). Full spec: [PLAN-7.md](PLAN-7.md).

### Phase 8: WRITE PDF (`pdf.mjs`, `book.mjs` render half)

1. Assemble `book.html` from resolved chapters:
   - Title page with build info (git commit, date)
   - Front matter sections (unnumbered)
   - Numbered parts with roman numeral dividers
   - Per-chapter: heading shift + anchor-id prefix + href rewrite + details-strip
2. Write sparse tree to `_site-pdf/`:
   - `book.html`
   - `print.css`, `rouge.css`
   - Every `<img src="...">` referenced from `book.html`

`pagedjs-cli` (invoked by `docs/book.bat`) reads the resulting
`_site-pdf/book.html` and produces `_pdf/book.pdf`. Phase 8 writes
the inputs; the shell script does the actual PDF render. Full spec:
[PLAN-8.md](PLAN-8.md).

### Phase 9: QOL + DOCS + CLEANUP (shipped)

Consolidation pass landing every FUTURE-WORK item that either
didn't change build output or strictly improved Jekyll parity.
Added CLI flags (`--no-offline`, `--no-pdf`, `--serving`,
`--profile-offline`); a Phase 7 nav-block cache (~200 ms perf
win); a generic `_data/*.yml` loader (`data.mjs`); a multi-
divergence audit tool (`_audit_accepted.mjs`); `--against-disk`
and `--multi` modes for `_diff.mjs`; a PDF cross-reference
completeness check in `verify-phase8.mjs`; and a `builder/README.md`
plus a per-module header consistency pass. Switched the PDF
title-page date from `commitDate` to wall-clock to match Jekyll's
`site.time`. Full spec: [PLAN-9.md](PLAN-9.md).

### Phase 10: CUTOVER (planned)

The Jekyll-to-tbdocs cutover. Flips the default destination from
`_site-new` to `_site` in [index.mjs](index.mjs); updates
[docs/build.bat](../docs/build.bat) / [docs/serve.bat](../docs/serve.bat)
/ [docs/check.bat](../docs/check.bat) and the GitHub Pages workflow
to call tbdocs instead of `bundle exec jekyll build`; retires the
eight `verify-phase{1..8}.mjs` harnesses; and replaces them with an
expanded site-integrity checker built on top of
[scripts/check_links.mjs](../scripts/check_links.mjs) -- adding
HTML well-formedness validation, duplicate-`id` detection, anchor
resolution (already partial via `--include-fragments`), and
heading-hierarchy checks. The Jekyll source set (`docs/_plugins/`,
`docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`)
stays for one release cycle as reference, then deletes in a
follow-up commit. Full spec: [PLAN-10.md](PLAN-10.md).

### Phase 11: PARITY UPDATE (shipped)

Output-changing FUTURE-WORK items the byte-parity-with-Jekyll
discipline of Phases 3-9 had deferred. All five PRs landed:

- **B2:** Shiki themes generated from the vendored `.theme` files.
  `scripts/extract_theme_colors.py` and `rouge.css` are gone;
  `builder/highlight-theme.mjs` builds the palette and emits
  `tb-highlight.css` at build time; `builder/highlight.mjs` shrank
  from ~470 lines to ~190.
- **B1:** Mermaid `.mmd` -> `.svg` auto-regen via `builder/mermaid.mjs`.
  Reuses the cached Chrome the top-level `puppeteer` install already
  provides; no second Chrome download.
- **B5:** Server-side copy-code button. The button HTML is now
  pre-rendered by `builder/highlight.mjs`; `just-the-docs.js`
  retired the runtime DOM-injection loop, the click handler binds
  to the pre-rendered buttons via `closest()`. `print.css` hides
  the button for the PDF render path.
- **B10:** Offline `search-data.js` minification -- `JSON.parse +
  JSON.stringify` without indent. ~100 KB savings on the current
  tree.
- **B11:** AST-based patching of `just-the-docs.js` via `acorn`.
  Survives cosmetic upstream edits; produces byte-identical output
  to the prior regex patcher. `just-the-docs.js` is a vendored
  asset re-extracted only on deliberate gem-bump operations, so no
  regex fallback ships -- a parse error at build time is a clear
  signal to fix the asset at the moment of the bump.

B6 (linkify) and B18 (streaming book.html write) were dropped.
Full spec: [PLAN-11.md](PLAN-11.md).

## Static Asset Extraction (One-Time Setup)

Before the first build, extract from the current Jekyll output:

1. **CSS** -- `_site/assets/css/just-the-docs-combined.css` (compiled theme with custom
   colors baked in), `just-the-docs-head-nav.css`, `print.css`, `rouge.css`
2. **JS** -- `_site/assets/js/just-the-docs.js`, `vendor/lunr.min.js`
3. **SVG sprites** -- the `<svg>` defs block from any rendered page
4. **Favicon** -- `favicon.png`

These live in `builder/assets/` and get copied verbatim to `docs/_site/assets/` on each build.
If the custom color scheme ever changes, recompile once manually with `sass`.

## What Doesn't Get Ported

- `build-phase-timing.rb` -- replace with `console.time()` calls inline
- `jekyll-relative-links-patch.rb` -- the bug it patches is Jekyll-specific
- `jekyll-gfm-admonitions-patch.rb` -- native handling in the markdown-it plugin
- `jekyll-include-cache` -- no template includes to cache
- The entire Liquid template engine -- replaced by direct string concatenation
- Ruby/Bundler/Gem toolchain -- replaced by Node.js + npm

## Verification Strategy

The content files don't change. Correctness is asserted by diffing
output against Jekyll's:

```
1. Build with Jekyll:    cd docs && bundle exec jekyll build  ->  docs/_site/
2. Build with tbdocs:    node builder/index.mjs               ->  docs/_site-new/
3. Diff:                 diff -rq docs/_site/ docs/_site-new/
```

tbdocs is invoked from the repo root. It defaults to `docs/` as the
source root and `docs/_site-new/` as the destination during the port;
the post-port cutover (see [FUTURE-WORK.md](FUTURE-WORK.md) §C1)
flips the destination to `docs/_site/` and retires the Jekyll step.

Per-phase verification is the primary signal: each phase's
`verify-phaseN.mjs` harness (listed individually in the Implementation
Order table below) drives the preceding phases into a scratch
destination and asserts the §10 acceptance checks from the
corresponding `PLAN-N.md`. The full-tree `diff -rq` is the cumulative
catch-all.

Known accepted differences live in
[accepted-divergences.mjs](accepted-divergences.mjs) -- a single
per-page allow-list every verify harness reads. The buckets are
documented inline next to each entry (kramdown-vs-markdown-it parser
edge cases, Rouge-vs-Shiki tokenisation for non-tB languages, etc.).
For the offline tree: `diff -rq docs/_site-offline/
docs/_site-offline-new/` plus `scripts/check_links.mjs` -- both
covered by `verify-phase7.mjs`.

The bulk-triage tools ([_triage.mjs](_triage.mjs),
[_diff.mjs](_diff.mjs), [_diff_all.mjs](_diff_all.mjs)) classify any
new divergence by first-occurrence pattern so a regression's blast
radius is visible at a glance.

## Implementation Order

All eight steps shipped. Each phase has its own acceptance harness
that runs the preceding phases into a scratch destination and asserts
the §10 checks from the corresponding `PLAN-N.md`.

| Step | Module(s) | Status | Verify by |
|------|-----------|--------|-----------|
| 1 | `discover.mjs` | shipped | `verify-phase1.mjs`: 838 pages (836 .md + 404.html + book.html), frontmatter spot-checks, `staticFiles[]` covers content images + favicon + lib/ + render-book.mjs |
| 2 | `nav.mjs` + `seo.mjs` + `book.mjs` + `build-info.mjs` | shipped | `verify-phase2.mjs`: 23 acceptance checks (navTree shape, navPath/breadcrumbs/children/navLevels populated, SEO byte-parity against Jekyll, buildInfo, bookData resolution) |
| 3 | `render.mjs` + `highlight.mjs` + `twinbasic.tmLanguage.json` | shipped | `verify-phase3.mjs`: per-page rendered-body diff against Jekyll's `_site/<destPath>` (sidebar stripped), bucketed by `accepted-divergences.mjs` |
| 4 | `template.mjs` + `compress.mjs` | shipped | `verify-phase4.mjs`: full-page byte diff against `_site/<destPath>` for every page (skipping `book.html`), accepted-divergence honouring |
| 5 | `write.mjs` (Write online `_site/`) | shipped | `verify-phase5.mjs`: scratch-destination `diff -rq` vs Jekyll's `_site/`, plus `check_links.mjs` clean |
| 6 | `search.mjs` + `redirects.mjs` + `sitemap.mjs` + `paths.mjs` | shipped | `verify-phase6.mjs`: sitemap URL-set parity, redirect stub byte parity (290 stubs), search-data per-entry content parity (2,587 entries), robots.txt byte parity |
| 7 | `offline.mjs` | shipped | `verify-phase7.mjs`: per-file diff against Jekyll's `_site-offline/`, plus `check_links.mjs --forbid 'https://docs.twinbasic.com'` clean |
| 8 | `book.mjs` renderer half + `pdf.mjs` | shipped | `verify-phase8.mjs`: per-article book.html byte diff vs `_site-pdf/book.html` (accepted-divergence-honouring), image inventory parity, CSS parity |

Phase 2 shipped ahead of `render.mjs` (the originally-projected step 2)
because the COMPUTE outputs don't depend on rendered markdown -- doing
them first meant RENDER and TEMPLATE could both consume the full
per-page field set from day one without an "if `page.navLevels` is set
yet" guard.

## Outcome

| Metric | Jekyll | tbdocs (shipped) |
|--------|--------|------------------|
| Build time | ~11s | ~3s |
| Dependencies | Ruby + Bundler + 8 gems | Node.js + 7 npm packages |
| Build code | ~4,800 lines Ruby (plugins) + theme gem | ~6,600 lines JS production code + ~4,400 lines of acceptance harnesses / triage tools |
| Content changes | baseline | none |
| Output parity | baseline | byte-equivalent modulo entries in `accepted-divergences.mjs` |

The JS line count came in higher than the original ~2,200-line
projection because the byte-parity requirement (rather than functional
equivalence) drove out a long tail of kramdown-vs-markdown-it parity
plugins, the full offlinify port, and the per-phase verify harnesses.
The cumulative source-of-truth is the eight `PLAN-N.md` specs plus
`FUTURE-WORK.md`.
