# tbdocs — Custom JS Static Site Generator

Port of the Jekyll + just-the-docs build pipeline to a single-purpose Node.js tool.
Goal: functionally equivalent output, ~2,200 lines of compact JS, no framework.

## Architecture

One entry point, ~12 modules. The content model is fixed (markdown + YAML frontmatter),
the output structure is fixed (three trees), the template is one layout with variations.

```
builder/                 (sibling of docs/, at the repo root)
  index.mjs              entry point + orchestrator
  discover.mjs           file reading, frontmatter parsing
  nav.mjs                nav tree + breadcrumbs + nav-levels
  render.mjs             markdown-it pipeline setup
  template.mjs           page layout as JS functions (replaces Liquid)
  book.mjs               book chapter resolution + PDF page assembly
  offline.mjs            URL rewriting for _site-offline/
  pdf.mjs                sparse _site-pdf/ tree generation
  search.mjs             Lunr search index generation (search-data.json)
  seo.mjs                per-page SEO metadata
  redirects.mjs          redirect stub pages
  sitemap.mjs            sitemap.xml
  highlight.mjs          Shiki setup + twinBASIC grammar
  compress.mjs           HTML whitespace collapse
  twinbasic.tmLanguage.json   TextMate grammar for twinBASIC
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
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.0",
    "shiki": "^1.0",
    "fast-glob": "^3.3",
    "lunr": "^2.3"
  }
}
```

Six production dependencies. No template engine, no framework, no bundler.

## Build Phases

```
Phase 1: DISCOVER        ~50ms    Read .md/.html with frontmatter, enumerate static files
Phase 2: COMPUTE         ~20ms    Nav tree, breadcrumbs, SEO, book chapters
Phase 3: RENDER          ~1-2s    Markdown -> HTML (dominates build time)
Phase 4: TEMPLATE        ~200ms   Wrap in layout, anchor headings, compress
Phase 5: WRITE ONLINE    ~300ms   Write _site/
Phase 6: AUXILIARIES     ~100ms   Redirects, sitemap, search-data.json
Phase 7: WRITE OFFLINE   ~500ms   URL-rewritten copy to _site-offline/
Phase 8: WRITE PDF       ~50ms    Sparse copy to _site-pdf/
```

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

### Phase 2: COMPUTE (`nav.mjs`, `seo.mjs`, `book.mjs`)

**Nav tree** (`nav.mjs`):

Algorithm (direct port of `nav-tree-precompute.rb`):
1. Group pages by parent title
2. Sort within groups: nav_order numeric -> nav_order string -> title numeric -> title string
3. Recursively build tree from roots (pages with no parent)
4. Walk tree to compute breadcrumb chains and positional indices (for CSS activation)
5. Compute children-in-nav for each page

Also includes the nav-integrity-check logic (abort on ambiguous/orphan parents).

**SEO** (`seo.mjs`):

- Strip markdown from titles (only 2 of 837 pages have md-active chars in titles)
- Compute canonical URL
- Determine og:type (homepage -> website, else article)

**Book chapters** (`book.mjs`, resolution half):

- Parse `_data/book.yml` selector schema (`page`/`pages`/`nav_page`/`nav_pages` + `no_descent`)
- Match pages by URL or nav_path prefix
- Sort by nav_order, prepend landing pages

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

| Step | Module(s) | Verify by |
|------|-----------|-----------|
| 1 | `discover.mjs` | Assert page count = 838 (836 .md + 404.html + book.html); spot-check frontmatter; verify `staticFiles[]` covers content images + favicon + lib/ + render-book.mjs |
| 2 | `render.mjs` + `highlight.mjs` | Diff rendered HTML of 5 representative pages vs Jekyll |
| 3 | `nav.mjs` | Assert tree structure matches Jekyll's `site.nav_tree` |
| 4 | `template.mjs` + `compress.mjs` | Full-page render, visual comparison in browser |
| 5 | Write online (`_site/`) | `check_links.mjs` passes |
| 6 | `search.mjs` + `redirects.mjs` + `sitemap.mjs` | Functional search in browser |
| 7 | `offline.mjs` | Open `_site-offline/index.html` via file://, nav + search work |
| 8 | `book.mjs` + `pdf.mjs` | `pagedjs-cli` renders PDF without errors |

## Expected Outcome

| Metric | Jekyll (current) | tbdocs (projected) |
|--------|-----------------|-------------------|
| Build time | ~11s | ~2-3s |
| Dependencies | Ruby + Bundler + 8 gems | Node.js + 6 npm packages |
| Build code | ~4,800 lines Ruby (plugins) + theme gem | ~2,200 lines JS |
| Content changes | none | none |
| Output parity | baseline | functional equivalent |
