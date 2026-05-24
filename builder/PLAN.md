# tbdocs — Custom JS Static Site Generator

Port of the Jekyll + just-the-docs build pipeline to a single-purpose Node.js tool.
Goal: functionally equivalent output, ~2,200 lines of compact JS, no framework.

## Architecture

One entry point, ~14 modules. The content model is fixed (markdown + YAML frontmatter),
the output structure is fixed (three trees), the template is one layout with variations.

```
builder/                 (sibling of docs/, at the repo root)
  index.mjs              entry point + orchestrator
  discover.mjs           file reading, frontmatter parsing
  nav.mjs                nav tree + breadcrumbs + nav-levels + children
  seo.mjs                per-page SEO metadata
  book.mjs               book chapter resolution + PDF page assembly
  build-info.mjs         git commit + commit date capture
  render.mjs             markdown-it pipeline setup
  template.mjs           page layout as JS functions (replaces Liquid)
  offline.mjs            URL rewriting for _site-offline/
  pdf.mjs                sparse _site-pdf/ tree generation
  search.mjs             Lunr search index generation (search-data.json)
  redirects.mjs          redirect stub pages
  sitemap.mjs            sitemap.xml
  highlight.mjs          Shiki setup + twinBASIC grammar
  compress.mjs           HTML whitespace collapse
  twinbasic.tmLanguage.json   TextMate grammar for twinBASIC
  verify-phase1.mjs      Phase 1 acceptance harness
  verify-phase2.mjs      Phase 2 acceptance harness
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
`_data/book.yml` directly); the four bottom-of-list packages remain
unused until later phases land.

## Build Phases

```
Phase 1: DISCOVER        ~120ms   Read .md/.html with frontmatter, enumerate static files       [shipped]
Phase 2: COMPUTE         ~60ms    Nav tree, breadcrumbs, SEO, book chapters, build-info         [shipped]
Phase 3: RENDER          ~1-2s    Markdown -> HTML (dominates build time)
Phase 4: TEMPLATE        ~200ms   Wrap in layout, anchor headings, compress
Phase 5: WRITE ONLINE    ~300ms   Write _site/
Phase 6: AUXILIARIES     ~100ms   Redirects, sitemap, search-data.json
Phase 7: WRITE OFFLINE   ~500ms   URL-rewritten copy to _site-offline/
Phase 8: WRITE PDF       ~50ms    Sparse copy to _site-pdf/
```

Phase 1+2 measured timings come from `node builder/index.mjs` on the
current Windows dev machine; Phase 3 onward are still projections.

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

markdown-it setup:
- GFM mode (tables, strikethrough, autolinks)
- Block HTML parsing (enabled by default in markdown-it)
- `markdown-it-attrs` for `{: .class }` / `{: .no_toc }` annotations
- Custom plugin for GFM admonitions (`> [!NOTE]` etc.) -- ~40 lines
- Shiki highlighter for fenced code blocks via `markdown-it` fence override

**twinBASIC grammar** (`twinbasic.tmLanguage.json`):

Port the Rouge lexer's token rules to TextMate format:
- ~140 keywords (statements, type keywords, operators)
- States: root, string, attribute, dotted, dim, funcname, typename, namespace
- Literals: hex (`&H`), octal (`&O`), binary (`&B`), dates (`#...#`), type suffixes
- Preprocessor: `#If`, `#Const`, `#Region`
- Line continuation: `_` at end of line
- Custom token types: Boolean, Empty, Nothing, Null (map to TextMate scopes)

### Phase 4: TEMPLATE (`template.mjs`, `compress.mjs`)

The layout is a single JS function returning an HTML string. The ~13 Liquid includes
become helper functions called inline:

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

### Phase 5: WRITE ONLINE

- For each page: write destPath to `_site/`
- Copy theme assets: `builder/assets/` -> `docs/_site/assets/` (CSS, JS, sprites)
- Copy every entry in `staticFiles[]` (from Phase 1) to its `destRel` under
  `_site/` -- content images, `favicon.png`, `CNAME`, `render-book.mjs`,
  `lib/*.mjs`, `assets/images/mmd/*`
- Write `search-data.json` to `_site/assets/js/`

### Phase 6: AUXILIARIES

**Redirects** (`redirects.mjs`):
- For each page with `redirect_from` in frontmatter, generate a minimal HTML page
  with `<meta http-equiv="refresh">` + JS redirect. Same format as jekyll-redirect-from.

**Sitemap** (`sitemap.mjs`):
- Standard `sitemap.xml` from all page permalinks. Same output as jekyll-sitemap.

**Search index** (`search.mjs`):
- Walk rendered pages, strip HTML tags, split by headings into sections
- Emit JSON: `{ "0": { doc, title, content, url, relUrl }, ... }`
- Same format the client-side Lunr consumer expects -- zero client JS changes needed

### Phase 7: WRITE OFFLINE (`offline.mjs`)

The algorithmic core of offlinify.rb (~600 lines JS):

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

Skip patterns: CNAME, robots.txt, sitemap.xml, book.html (per `offline_exclude` config).

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

The content files don't change. Verify correctness by diffing output:

```
1. Build with Jekyll:    cd docs && bundle exec jekyll build  ->  docs/_site/
2. Build with tbdocs:    node builder/index.mjs               ->  docs/_site-new/
3. Diff:                 diff -rq docs/_site/ docs/_site-new/
```

tbdocs is invoked from the repo root. It defaults to `docs/` as the source
root and `docs/_site-new/` as the destination during the port; once it
replaces Jekyll, the destination flips to `docs/_site/` and the Jekyll
step goes away.

Accept known differences:
- Minor whitespace variance (Jekyll's compress vs ours)
- `<meta name="generator">` tag (Jekyll injects it; we omit)
- Timestamp-dependent content (last_modified_date)

For the offline tree: `diff -rq docs/_site-offline/ docs/_site-offline-new/`.

The existing `scripts/check_links.mjs` runs against the new output unchanged -- it checks
internal link integrity regardless of which tool produced the HTML.

## Implementation Order

Build incrementally, each step independently verifiable:

| Step | Module(s) | Status | Verify by |
|------|-----------|--------|-----------|
| 1 | `discover.mjs` | shipped | `verify-phase1.mjs`: 838 pages (836 .md + 404.html + book.html), frontmatter spot-checks, `staticFiles[]` covers content images + favicon + lib/ + render-book.mjs |
| 2 | `nav.mjs` + `seo.mjs` + `book.mjs` + `build-info.mjs` | shipped | `verify-phase2.mjs`: 23 acceptance checks (navTree shape, navPath/breadcrumbs/children/navLevels populated, SEO byte-parity against Jekyll, buildInfo, bookData resolution) |
| 3 | `render.mjs` + `highlight.mjs` | pending | Diff rendered HTML of 5 representative pages vs Jekyll |
| 4 | `template.mjs` + `compress.mjs` | pending | Full-page render, visual comparison in browser |
| 5 | Write online (`_site/`) | pending | `check_links.mjs` passes |
| 6 | `search.mjs` + `redirects.mjs` + `sitemap.mjs` | pending | Functional search in browser |
| 7 | `offline.mjs` | pending | Open `_site-offline/index.html` via file://, nav + search work |
| 8 | `book.mjs` renderer half + `pdf.mjs` | pending | `pagedjs-cli` renders PDF without errors |

Phase 2 shipped ahead of `render.mjs` (the originally-projected step 2)
because the COMPUTE outputs don't depend on rendered markdown -- doing
them first means RENDER and TEMPLATE can both consume the full per-page
field set from day one without an "if `page.navLevels` is set yet"
guard.

## Expected Outcome

| Metric | Jekyll (current) | tbdocs (projected) |
|--------|-----------------|-------------------|
| Build time | ~11s | ~2-3s |
| Dependencies | Ruby + Bundler + 8 gems | Node.js + 6 npm packages |
| Build code | ~4,800 lines Ruby (plugins) + theme gem | ~2,200 lines JS |
| Content changes | none | none |
| Output parity | baseline | functional equivalent |
