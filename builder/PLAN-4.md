# PLAN-4: Phase 4 — TEMPLATE (`template.mjs`, `compress.mjs`)

Detailed implementation plan for the fourth phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the architecture overview),
[PLAN-1.md](PLAN-1.md) (DISCOVER), [PLAN-2.md](PLAN-2.md) (COMPUTE), and
[PLAN-3.md](PLAN-3.md) (RENDER).

The TEMPLATE phase has one job: take each page's `renderedContent`
(the HTML body fragment Phase 3 produced) and **wrap it in the
just-the-docs layout chrome** -- doctype, head block, sidebar with the
recursive nav, breadcrumbs, page-content `<main>`, auto-TOC, footer,
script tags -- so the result is a complete, browser-ready HTML
document ready for Phase 5 to write to `_site/<destPath>`.

What Phase 4 does NOT do:

- Render markdown (Phase 3 already did).
- Compute nav, breadcrumbs, children, SEO, or book data (Phase 2 already did).
- Write files to disk (Phase 5).
- Generate redirect stub pages (Phase 6 -- different output shape).
- Generate the sitemap or search index (Phase 6).
- Run the offline URL rewrite or asset patching (Phase 7).
- Assemble or transform the PDF book (Phase 8).

Target: **~200-400 ms wall time for the full 838-page corpus** on the
current Windows dev machine. The Ruby equivalent (the just-the-docs
default layout + the project's shadow includes + the anchor-headings
filter + html-compress.rb) takes ~2.5-3 s of Jekyll's RENDER phase
after the optimisations landed in 2026-Q1. The JS port replaces
Liquid templating with direct string concatenation, the anchor-
headings filter with a Ruby regex (already done as a Jekyll plugin),
and the activation.scss.liquid pass with direct CSS emission from
`page.navLevels`. ~400 ms is the soft regression cap.

---

## 1. Inputs

### From Phase 1 / Phase 2 / Phase 3

The `{ pages, staticFiles, site }` object the orchestrator carries
after Phase 3. Phase 4 reads from each page:

| Field | Why |
|---|---|
| `frontmatter.title` | Used in the `<title>` tag (via `seoFullTitle`), breadcrumbs, and rendered as `<h1>` if the page has no explicit H1 in body. Currently every page has its title rendered through `renderedContent`'s first heading, so the layout itself does not emit an H1. |
| `frontmatter.layout` | Determines the layout chain. `default`, `home`, `page` all collapse to the default chrome here (only `book-combined` differs, and that page bypasses Phase 4 -- see §5.10). |
| `frontmatter.nav_exclude` | Pages excluded from nav still get the full chrome; the activation CSS just emits the no-nav-link fallback. |
| `frontmatter.parent`, `frontmatter.has_toc`, `frontmatter.vba_attribution`, `frontmatter.last_modified_date`, `frontmatter.sitemap` | Various conditional template branches. |
| `frontmatter.redirect_from` | Phase 4 does NOT consume this; Phase 6 generates the redirect stubs separately. The field still has to be on the page (Phase 1 preserved it). |
| `permalink` | Used by the breadcrumb-strip's "is this the homepage?" check (`permalink === "/"`) and by Phase 5 for the output path. |
| `destPath` | Phase 5 reads this; Phase 4 doesn't, but it stays attached. |
| `srcRel` | Used in the "Edit this page on GitHub" link in the footer. |
| `renderedContent` | The body HTML fragment from Phase 3. Goes into the `<main>` interior. |
| `navPath`, `breadcrumbs`, `children`, `navLevels` | The four nav-derived fields Phase 2 set. Drive the breadcrumbs, the auto-TOC at the bottom, and the per-page `<style id="jtd-nav-activation">` block respectively. |
| `seoTitle`, `seoFullTitle`, `seoCanonical`, `seoIsHome` | The four SEO fields Phase 2 set. Drive the head's `<title>`, `<meta property="og:*">`, `<link rel="canonical">`, and the JSON-LD `@type`. |

Phase 4 does NOT read `rawContent` (Phase 3 already consumed it) or
`ext` (the .md/.html distinction was resolved during render).

### From `site`

| Key | Use |
|---|---|
| `site.navTree` | Source for the recursive sidebar nav (§5.4). |
| `site.seoSiteTitle`, `site.seoLogoUrl` | Used by the head SEO block and the sidebar's site-title. |
| `site.buildInfo` | Read here only as a flow-through; the actual consumer is Phase 8. Phase 4 doesn't print build info on standard pages. |
| `site.bookData` | Flow-through to Phase 8; not read. |
| `site.markdown` | Not used. Phase 4 doesn't render markdown. |
| `site.config` | See below. |

### From `site.config`

The keys Phase 4 actually reads from `_config.yml`:

| Key | Use |
|---|---|
| `title` | Site title shown next to the logo in the sidebar header. |
| `logo` | If set, a `<div class="site-logo">` is emitted before the title text. |
| `logo_with_title` | If set, the title text is rendered alongside the logo. Currently `true`. |
| `lang` | The `<html lang>` attribute. Default `en-US`. |
| `url`, `baseurl` | Already baked into `seoCanonical` etc. by Phase 2; Phase 4 also needs `baseurl` for `relative_url` analogue used by every internal href in the chrome. Currently both effectively absent (`url: https://docs.twinbasic.com`, no `baseurl`). |
| `aux_links` | The auxiliary nav rendered in the upper-right of the header. Currently `{ "twinBASIC Home": ["https://www.twinbasic.com"] }`. |
| `aux_links_new_tab` | Adds `target="_blank" rel="noopener noreferrer"` when truthy. Currently unset. |
| `nav_external_links` | An optional `<ul class="nav-list">` of external links inside the sidebar nav. Currently set to one entry (`twinBASIC Home`) but rendered after `site_nav` in the original. |
| `search_enabled` | When `!== false`, emits the search input/results UI and the lunr script tag. Currently effectively `true` (unset == on). |
| `search.button` | When truthy, emits the floating search-launcher button in `search_footer.html`. Currently unset. |
| `enable_copy_code_button` | When `!== false`, emits the `svg-copy` / `svg-copied` icons inside the SVG sprite. Currently `true`. |
| `back_to_top`, `back_to_top_text` | Emit a "Back to top" link inside the footer. Currently `true` / `"Back to top"`. |
| `last_edit_timestamp`, `last_edit_time_format` | Drive the "Page last modified" footer line when the page has `frontmatter.last_modified_date`. Currently `true` / a strftime string. |
| `gh_edit_link`, `gh_edit_link_text`, `gh_edit_repository`, `gh_edit_branch`, `gh_edit_view_mode`, `gh_edit_source` | Drive the "Edit this page on GitHub" link in the footer. |
| `gh_offline_link`, `gh_offline_link_text`, `gh_offline_link_url` | Drive the "Download offline copy" link in the footer. |
| `footer_content` | The copyright line in the footer. Currently the company-info string. |
| `ga_tracking`, `ga_tracking_anonymize_ip` | Drive the Google Analytics gtag block. Currently unset. |
| `nav_error_report` | Drives an in-template warning capture; currently unset and the project's nav-integrity check throws at build time before Phase 4 anyway. |
| `mermaid` | When set, emit the mermaid script include. Currently unset. |
| `just_the_docs.collections` | A nav-shape extension Phase 2 already documented as **out of scope** -- the site doesn't use it. Phase 4 mirrors Phase 2: no support, error if a future config sets it. |

### From the prebuilt `builder/assets/` tree

The static assets that the chrome links to. These get copied verbatim
into `_site/assets/` by Phase 5, but Phase 4 needs to know about them
to emit the correct `<link rel="stylesheet">` / `<script src="...">`
tags (the file paths are baked into the chrome). The set:

| Asset | Emitted from |
|---|---|
| `assets/css/just-the-docs-combined.css` | `<link rel="stylesheet">` in head |
| `assets/css/just-the-docs-head-nav.css` | `<link rel="stylesheet" id="jtd-head-nav-stylesheet">` in head |
| `assets/js/theme-switch.js` | `<script defer>` in head, immediately after the dark-mode early-script |
| `assets/js/vendor/lunr.min.js` | `<script>` in head (when search enabled) |
| `assets/js/just-the-docs.js` | `<script>` in head |
| `favicon.png` | `<link rel="shortcut icon">` in head |

Phase 4 does not read or stat these -- the paths are constants the
template emits verbatim. Phase 5 ensures they land at the
expected URLs.

### Assumption: `site.config` schema is stable

Phase 4 reads ~30 `_config.yml` keys (more than any other phase). The
list above is exhaustive for the current site; if a new key the
upstream theme exposes becomes relevant (e.g. `collections`,
`logo_with_title`, `nav_external_links_new_tab`), the implementer
extends the template. Phase 4 should not warn on unknown keys --
many keys belong to other phases or aren't read at all.

---

## 2. Outputs

Phase 4 mutates each page in place, adding ONE field:

```js
page.html: string;   // Complete HTML document, ready for Phase 5 to
                     // write to `_site/<page.destPath>`. Starts with
                     // "<!DOCTYPE html>"; ends with "</html>" plus an
                     // optional trailing newline (preserved by the
                     // html-compress pass to match Ruby's output).
```

For pages whose layout is `default` / `home` / `page` (every page on
the site except `book.html`), `page.html` is the full wrapped page.

For `book.html` (`frontmatter.layout: book-combined`), Phase 4
**bypasses** the page: `page.html` is left as `undefined` and Phase 5
skips writing it. Phase 8 takes `page.renderedContent` directly and
assembles the book chapter document.

For `404.html` (`frontmatter.layout: page` -- alias for `default`),
the full wrap is emitted exactly like any other content page. Phase 5
writes it to `_site/404.html`.

### Side effects

None. Phase 4 doesn't write to disk, doesn't shell out, doesn't
mutate `site.*`. It is pure-CPU per-page string assembly.

### Why mutate `pages[]` rather than return a parallel array

Same reason every other phase mutates in place: the template, write,
and offlinify phases iterate the same `pages[]`. Adding `page.html`
in place keeps each page a single growing record.

---

## 3. Module split

Two new files:

```
builder/
  template.mjs    ~600 lines. The layout-as-JS-function, every
                  sub-renderer, the SVG icon-sprite constant table,
                  the anchor-headings regex, the per-page nav-
                  activation CSS generator.
  compress.mjs    ~40 lines. The pre-block-protected whitespace
                  collapse. Single function, called from template.mjs
                  on each fully-assembled page.
```

### Why a separate `compress.mjs`

The compression algorithm is small and self-contained -- it's a
two-step regex split + per-segment whitespace collapse. The case for
keeping it out of `template.mjs`:

- **Reusability.** Phase 7 (offlinify) and Phase 8 (book PDF) may
  need to re-run the same compression after their per-page rewrites.
  A standalone function with one export is the cleanest interface.
- **Verification.** The Ruby version is bit-for-bit critical (the
  WIP.md "html-compress" subsection has the byte-parity story). A
  single tested function is easier to keep aligned with the Ruby
  source than a method on a `template.mjs` class.

If the implementer ends up not needing it from anywhere but
`template.mjs`, inlining is a one-line follow-up.

### Why not separate `head.mjs`, `sidebar.mjs`, `footer.mjs` modules

The layout sub-renderers are ~20-60 lines each (the recursive nav
walker is the largest at ~50). Splitting them across six files
adds import boilerplate without making any single file easier to
read. PLAN.md's sketch is correct: one `template.mjs` with the sub-
functions inline, top-level renderPage as the public entry.

The one exception worth considering is the **nav-activation CSS
generator** (§5.5), which is ~80-100 lines of algorithm and could
sit in `nav-activation.mjs`. The arguments either way are weak;
keep it in `template.mjs` for now, factor out if it grows or if a
follow-up exposes it for tests.

### Why no extra TextMate / Liquid / Handlebars runtime

The template is a JS function returning a tagged-template-literal
string. No engine, no DSL, no eval. Every conditional is a JS `if`,
every loop is a `for ... of`. Cost is dispatch overhead at runtime
(none) and reviewer load (lower than Liquid because JS is more
familiar to a Node-shop reviewer).

---

## 4. Pipeline ordering within Phase 4

Per-page wrap is a four-stage pipeline:

```
{ page, site }
   │
   ▼
 [1] skip book.html                         ← see §5.10
   │
   ▼
 [2] assemble pre-content chrome:
       renderHead(page, site)               ← §5.2
       svgSprites(config)                   ← §5.3
       renderSidebar(page, site)            ← §5.4
         ├─ site-title + logo
         ├─ recursive nav (consumes site.navTree)
         └─ optional nav_external_links
       renderHeader(site)                   ← §5.6
         ├─ search input UI (if search_enabled)
         ├─ theme-switch SVG sprite + button
         └─ aux_nav (theme toggle + aux_links)
       renderBreadcrumbs(page)              ← §5.7
   │
   ▼
 [3] anchored body:
       injectAnchorHeadings(page.renderedContent)  ← §5.8
       renderChildrenNav(page)              ← §5.9 (if has_toc != false)
   │
   ▼
 [4] post-content chrome:
       renderFooter(page, site)             ← §5.11
       renderSearchFooter(site)             ← §5.12 (search overlay + button)
       renderMermaidScript(site)            ← §5.13 (if mermaid: ...)
   │
   ▼
 [5] concatenate all parts into one document string
   │
   ▼
 [6] compressHtml(document)                 ← §5.14
   │
   ▼
 [7] assign to page.html
```

Stages 1-5 are pure string concatenation. Stage 6 is the only
non-trivial transformation in Phase 4 (and it's deliberately tiny).

### Per-page parallelism

Each page wraps independently. The orchestrator should `Promise.all`
the per-page wraps for throughput:

```js
await Promise.all(pages.map(async (page) => {
  page.html = templatePage(page, site);
}));
```

`templatePage` is synchronous (no I/O), so the `async`/`Promise.all`
shape buys nothing on Node's single-threaded event loop. But matching
the Phase 3 shape means the orchestrator's `await` can chain identically.
Either form is fine; pick the simpler `.map` if `Promise.all` adds
no measurable throughput.

### Phase 4 init order (one-time, before the per-page loop)

```js
const SVG_SPRITES = buildSvgSprites(site.config);    // §5.3 — pure constant per build
const FAVICON_LINK = buildFaviconLink(site.config);  // pure constant
const RECURSIVE_NAV_CACHE = renderNavTree(site.navTree);  // §5.4 — shared across pages
const AUX_NAV = renderAuxNav(site.config);           // §5.6 — pure constant per build
const HEADER_STATIC = renderHeaderStatic(site.config); // §5.6
const FOOTER_STATIC = renderFooterStatic(site.config); // §5.11 — sans page bits
```

The sidebar nav HTML is **identical across every page** -- the
per-page activation is done via the `<style>` block in the head, not
by rebuilding the nav per-page. This is exactly the
`{% include_cached components/site_nav.html %}` optimisation the
upstream theme uses, plus the project's shadow `site_nav.html` /
`nav/links.html` shortcuts. We cache the rendered nav HTML once at
Phase 4 init, then splice it into every page verbatim.

The activation CSS, in contrast, IS per-page and gets regenerated
inside the per-page loop (§5.5).

---

## 5. Per-substep specifications

### 5.1. `templatePage(page, site)` -- top-level entry

```js
export function templatePage(page, site, init) {
  if (page.frontmatter.layout === "book-combined") return;  // §5.10
  const html =
    `<!DOCTYPE html>\n` +
    `<html lang="${escAttr(site.config.lang ?? "en-US")}">\n` +
    renderHead(page, site, init) +
    `<body>\n` +
    `  <a class="skip-to-main" href="#main-content">Skip to main content</a>\n` +
    init.svgSprites +
    init.sidebar +
    `<div class="main" id="top">\n` +
    init.header +
    `  <div class="main-content-wrap">\n` +
    renderBreadcrumbs(page) +
    `    <div id="main-content" class="main-content">\n` +
    `      <main>\n` +
    injectAnchorHeadings(page.renderedContent) +
    renderChildrenNav(page) +
    `      </main>\n` +
    renderFooter(page, site, init) +
    `    </div>\n` +
    `  </div>\n` +
    init.searchFooter +
    `</div>\n` +
    init.mermaidScript +
    `</body>\n` +
    `</html>\n`;
  return compressHtml(html);
}
```

`init` is the precomputed bag of per-build constants (§4).

Internal whitespace and indentation in the template literal are
preserved through compress; the compress pass collapses every run of
whitespace outside `<pre>...</pre>` to a single space. The newlines
are there for the source-readable shape; they don't survive into
`page.html`.

### 5.2. `renderHead(page, site, init)`

Output (one `<head>...</head>` element, indent shown for source
clarity; collapsed by compress). **Element order matters for byte
parity** -- verified against `_site/Reference/Operators.html` and
`_site/index.html`:

```html
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=Edge">
  <script>if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark-mode');</script>
  <script type="text/javascript" src="/assets/js/theme-switch.js" defer></script>
  <link rel="stylesheet" href="/assets/css/just-the-docs-combined.css">
  <link rel="stylesheet" href="/assets/css/just-the-docs-head-nav.css" id="jtd-head-nav-stylesheet">
  <style id="jtd-nav-activation">${navActivationCss(page)}</style>
  ${gaSnippet}            <!-- empty when site.ga_tracking unset -->
  <script src="/assets/js/vendor/lunr.min.js"></script>
  <script src="/assets/js/just-the-docs.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${headSeoBlock(page, site)}
  ${faviconLink}          <!-- the project's head_custom.html shadow, AFTER SEO -->
</head>
```

The favicon link from `head_custom.html` lands AFTER `head_seo.html`
because the project's `_includes/head.html` calls them in that order
(`favicon.html` first -- emits nothing because there's no
`favicon.ico` -- then `head_seo.html`, then `head_custom.html` which
emits the `.png` link). An earlier draft of this plan had the
favicon before the SEO block; that's wrong and produces a 1-byte
diff against Jekyll's output on every page.

**Source paths use absolute (root-relative) URLs (no `baseurl`).** The
project's `_config.yml` doesn't set `baseurl`, and Jekyll's
`relative_url` filter on this site is a no-op for the chrome's asset
hrefs. If a future deployment sets `baseurl`, every emitted absolute
asset path needs the `baseurl` prefix -- introduce a `relativeUrl()`
helper and apply it once at init time.

**Why `<script defer>` on theme-switch.js and `<script>` (sync) on
lunr.min.js / just-the-docs.js.** Matches the upstream Ruby template
exactly. The early dark-mode script runs synchronously to avoid a
flash of unstyled-content; theme-switch.js (which wires up the
toggle) is deferred since it doesn't run until DOMContentLoaded
anyway. Lunr and just-the-docs.js are sync because they install
event handlers before the body parses.

**`navActivationCss(page)`** is the per-page CSS block; see §5.5.

**`headSeoBlock(page, site)`** ports `_includes/head_seo.html` -- the
project's shadow of jekyll-seo-tag. It reads Phase 2's per-page
`seoTitle`, `seoFullTitle`, `seoCanonical`, `seoIsHome` and the
site-level `seoSiteTitle` / `seoLogoUrl`. Output (verbatim byte
parity with Jekyll's shadow):

```html
<!-- Begin Jekyll SEO tag v2.8.0 -->
<title>${page.seoFullTitle}</title>
<meta name="generator" content="Jekyll v4.4.1" />
<meta property="og:title" content="${page.seoTitle}" />
<meta property="og:locale" content="en_US" />
<link rel="canonical" href="${page.seoCanonical}" />
<meta property="og:url" content="${page.seoCanonical}" />
<meta property="og:site_name" content="${site.seoSiteTitle}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
<meta property="twitter:title" content="${page.seoTitle}" />
<script type="application/ld+json">
${jsonLd(page, site)}</script>
<!-- End Jekyll SEO tag -->
```

Where `jsonLd(page, site)` emits either a `WebSite` (when
`page.seoIsHome`) or a `WebPage` JSON-LD blob, using JSON.stringify
on each value to match Liquid's `| jsonify` filter. The blob is on
ONE line (no internal whitespace) -- matches the `{%- ... -%}` shape
in the source.

**Why no `<meta name="generator">` with our own name.** PLAN.md's
"Accept known differences" section lists this as one of three
expected diff-noise items. Either keep `<meta name="generator"
content="Jekyll v4.4.1" />` verbatim (the project would not get a
"new tool announcement" diff and Lighthouse / robots tools wouldn't
notice the change), or change it to `<meta name="generator"
content="tbdocs" />` and accept the per-page diff. Recommended:
keep verbatim until the port replaces Jekyll on deploy, then flip
in a single commit.

**Favicon.** The project's `_includes/head_custom.html` emits:

```html
<link rel="shortcut icon" type="image/png" href="/favicon.png">
```

The upstream `_includes/favicon.html` (which checks for a
`favicon.ico` in `site.static_files`) is NOT used -- the project
overrides `head_custom.html` with the PNG link. Phase 4 emits the
PNG link unconditionally.

**Google Analytics.** Currently unset on this site, so `gaSnippet`
is `""`. When set, emit the standard gtag.js loader pattern
(`<script async src="https://www.googletagmanager.com/gtag/js?id=..."></script>`
plus the inline `window.dataLayer = ...` block).

### 5.3. SVG icon sprite (`svgSprites`)

A single per-build constant: the inline `<svg xmlns class="d-none">`
block containing every `<symbol>` the chrome and content reference.
Ported from the upstream `_includes/icons/icons.html` + the
six per-icon includes:

| Symbol ID | Where used |
|---|---|
| `svg-link` | Anchor headings (§5.8) |
| `svg-menu` | Sidebar toggle button (mobile) |
| `svg-arrow-right` | Nav expander icons (sidebar) |
| `svg-external-link` | `nav_external_links` items (when shown) |
| `svg-doc` | Search results (document icon) |
| `svg-search` | Search input label, search-launcher button |
| `svg-copy`, `svg-copied` | The copy-code-button hooks (when `enable_copy_code_button !== false`) |

`buildSvgSprites(config)` returns the concatenated `<svg>...</svg>`
string with the symbols conditional on `site.search_enabled` and
`site.enable_copy_code_button`. Currently both are on, so the
default emission includes all eight symbols.

The 8 `<symbol>` bodies are copied verbatim from upstream's icons
includes (see PLAN.md "Static Asset Extraction" §3). Pin the bytes
in `template.mjs` as a long template literal and add a comment with
the upstream theme version (`just-the-docs 0.10.1`) for traceability.

**Note on aux-nav SVG sprite duplication.** The project's
`_includes/components/aux_nav.html` (§5.6) embeds its OWN `<svg
xmlns ... style="display: none;">` block with `svg-sun` / `svg-moon`
symbols, separate from the main `<svg class="d-none">` sprite at the
top of `<body>`. We mirror this exactly -- the sun/moon symbols
appear inside the aux-nav wrapper, not in the global sprite. (A
follow-up cleanup could consolidate, but byte parity requires the
duplication.)

### 5.4. `renderSidebar(page, site, init)` and the nav walker

The sidebar is **identical across every page** (the activation is
done by the CSS-only mechanism in §5.5). So the entire sidebar HTML
is built once at Phase 4 init and spliced verbatim into every page.

Output shape (port of the upstream `_includes/components/sidebar.html`
+ the project's shadow `components/site_nav.html` + the project's
shadow `components/nav/links.html`):

```html
<div class="side-bar">
  <div class="site-header" role="banner">
    <a href="/" class="site-title lh-tight">${siteTitle}</a>
    <button id="menu-button" class="site-button btn-reset" aria-label="Toggle menu" aria-pressed="false">
      <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><use xlink:href="#svg-menu"></use></svg>
    </button>
  </div>
  <nav aria-label="Main" id="site-nav" class="site-nav">
    ${recursiveNav(site.navTree, [])}
    ${navExternalLinks(site.config)}
  </nav>
  <footer class="site-footer">${navFooter(site.config)}</footer>
</div>
```

`siteTitle` is the project's `_includes/title.html` shadow output:

- When `site.config.logo` is set:
  - `<div class="site-logo" role="img" aria-label="${site.config.title}"></div>`
  - If `site.config.logo_with_title` is truthy, append `site.config.title` (as plain text).
- Else: just `site.config.title`.

Currently `logo` is `favicon.png` and `logo_with_title` is `true`, so
the output is the logo div + the literal site title.

The trailing `<footer class="site-footer">...</footer>` is the
upstream's fall-through when `nav_footer_custom.html` is empty
(template: "This site uses Just the Docs..."). The project does NOT
override `nav_footer_custom.html`, so the upstream fallback applies.
Phase 4 emits the same string verbatim.

#### Recursive nav walker

```js
function recursiveNav(nodes, ancestorTitles) {
  if (!nodes.length) return "";
  let out = `<ul class="nav-list">`;
  for (const node of nodes) {
    out += `<li class="nav-list-item">`;
    if (ancestorTitles.includes(node.title)) {
      // Cycle defence -- a page that has the same title as one of
      // its ancestors gets the infinity-link placeholder instead of
      // recursive expansion. Matches the upstream's last-resort
      // guard.
      out += `<a href="${escAttr(node.url)}" class="nav-list-link"> &#8734; </a>`;
    } else {
      if (node.children.length) {
        // Note the spaces between <button> and <svg> and between
        // </svg> and </button>: the upstream source has literal
        // whitespace there and compress collapses it to ONE space
        // (compress does not REMOVE whitespace between tags, only
        // collapse runs of it). Emit the spaces explicitly so the
        // post-compress output byte-matches the upstream. See D19.
        out += `<button class="nav-list-expander btn-reset" aria-label="toggle items in ${escAttr(node.title)} category" aria-pressed="false"> ` +
               `<svg viewBox="0 0 24 24" aria-hidden="true"><use xlink:href="#svg-arrow-right"></use></svg>` +
               ` </button>`;
      }
      out += `<a href="${escAttr(node.url)}" class="nav-list-link">${escText(node.title)}</a>`;
      if (node.children.length) {
        out += recursiveNav(node.children, [...ancestorTitles, node.title]);
      }
    }
    out += `</li>`;
  }
  out += `</ul>`;
  return out;
}
```

**Why the cycle defence by title.** Matches the upstream's behaviour
exactly. A page that has the same title as one of its ancestors
would otherwise recurse forever; the infinity-link (`&#8734;`) is a
visual placeholder a maintainer can spot in QA. The
nav-integrity-check in Phase 2 catches the more common case
(`parent` references) earlier; this guard catches the rarer
"sibling-with-same-name" case the integrity check doesn't see.

**Why `escText` on the title.** The title can contain
`<`, `>`, `&`, etc. (the `&, &=` operator pages). Render uses 5-char
HTML escape -- same as `escapeHtml` from PLAN-3.md §6.2.

**Why `escAttr` on the URL.** Permalinks are computed by Phase 1
and don't contain HTML-sensitive characters in practice, but
attribute values must be HTML-attribute-safe. The check is cheap and
covers a future URL that contains `&` in a query string.

#### External nav links

When `site.config.nav_external_links` is set, append after the main
nav UL:

```html
<ul class="nav-list">
  <li class="nav-list-item external">
    <a href="${absUrl(node.url)}" class="nav-list-link external" ${targetAttrs}>
      ${escText(node.title)}
      ${node.hide_icon ? "" : '<svg viewBox="0 0 24 24" aria-labelledby="svg-external-link-title"><use xlink:href="#svg-external-link"></use></svg>'}
    </a>
  </li>
  ...
</ul>
```

`targetAttrs` is `target="_blank" rel="noopener noreferrer"` when
`node.opens_in_new_tab === true`, OR when `node.opens_in_new_tab` is
absent AND `site.config.nav_external_links_new_tab` is truthy.
Currently absent on this site, so no target.

**Currently this site has `nav_external_links: [{ title: twinBASIC Home, url: https://www.twinbasic.com }]`** and the rendered output DOES contain it (verified by grepping `nav-list-item external` in `_site/index.html` -- returns one match). The exact rendered shape, after compress:

```html
<ul class="nav-list"><li class="nav-list-item external"> <a href="https://www.twinbasic.com" class="nav-list-link external" > twinBASIC Home <svg viewBox="0 0 24 24" aria-labelledby="svg-external-link-title"><use xlink:href="#svg-external-link"></use></svg> </a> </li></ul>
```

Things to notice about the rendered shape:

- The single space inside `class="nav-list-link external" >` is the
  Liquid template's source-side whitespace before `{% if site.aux_links_new_tab ... %}` collapsed to one space by compress. Match by emitting `<a href="..." class="..." >` literally (with one trailing space inside the opening tag).
- The space between `twinBASIC Home` and the SVG is from a Liquid newline; compress collapses to one space.
- The space between `</svg>` and `</a>` is similarly a compress artefact.
- The `absolute_url` filter is a no-op when the URL is already absolute (the rendered href is `https://www.twinbasic.com` verbatim, not re-normalised).
- `hide_icon` is unset on this entry, so the `<svg>` renders. When `hide_icon: true`, the SVG is omitted.

Phase 4's emission must produce these exact spaces. Recommend
authoring the template literal with the spaces visible (don't tidy
them on the assumption "compress will fix it" -- compress only adds
spaces from collapsed runs, it doesn't insert spaces between
adjacent tags).

### 5.5. `navActivationCss(page)` -- the per-page CSS

Port of `_includes/css/activation.scss.liquid`. The CSS uses
positional `:nth-child()` selectors driven by `page.navLevels` to
bold the active link, unfold its ancestor collections, and rotate
the expander icons -- the no-JS fallback.

**Three CSS-rule shapes the generator emits**, all of them inside a
single `<style id="jtd-nav-activation">...</style>` block:

1. **Background-image-none rule for non-active links.** A composite
   selector that names every nav link that is NOT the active one,
   not on the active page's chain, and not a child of the active
   page. The shape (active page at depth 4, levels = [1, 5, 2, 7]):

   ```css
   .site-nav > ul.nav-list:first-child > li > a,
   .site-nav > ul.nav-list:first-child > li > ul > li > a,
   .site-nav > ul.nav-list:first-child > li > ul > li > ul > li:not(:nth-child(7)) > a,
   .site-nav > ul.nav-list:first-child > li > ul > li > ul > li > ul > li a {
     background-image: none;
   }
   ```

   Plus a constant trailer for the "other collections" branch:

   ```css
   .site-nav > ul.nav-list:not(:first-child) a,
   .site-nav li.external a {
     background-image: none;
   }
   ```

2. **Active-link bolding.** One selector with positional indices for
   each ancestor:

   ```css
   .site-nav > ul.nav-list:first-child > li:nth-child(5) > ul > li:nth-child(2) > ul > li:nth-child(7) > a {
     font-weight: 600;
     text-decoration: none;
   }
   ```

3. **Expander rotation + collection-display.** Two more composite
   selectors, expander icons first:

   ```css
   .site-nav > ul.nav-list:first-child > li:nth-child(5) > button svg,
   .site-nav > ul.nav-list:first-child > li:nth-child(5) > ul > li:nth-child(2) > button svg,
   .site-nav > ul.nav-list:first-child > li:nth-child(5) > ul > li:nth-child(2) > ul > li:nth-child(7) > button svg {
     transform: rotate(-90deg);
   }
   .site-nav > ul.nav-list:first-child > li.nav-list-item:nth-child(5) > ul.nav-list,
   .site-nav > ul.nav-list:first-child > li.nav-list-item:nth-child(5) > ul.nav-list > li.nav-list-item:nth-child(2) > ul.nav-list,
   .site-nav > ul.nav-list:first-child > li.nav-list-item:nth-child(5) > ul.nav-list > li.nav-list-item:nth-child(2) > ul.nav-list > li.nav-list-item:nth-child(7) > ul.nav-list {
     display: block;
   }
   ```

**Fallback for pages not in the nav.** When `page.navLevels` is
`undefined` (page has no title, is `nav_exclude`, or the parent
chain doesn't ground out -- see PLAN-2 §5.4), emit only the
`activation_no_nav_link` block:

```css
.site-nav ul li a {
  background-image: none;
}
```

Verified against `_site/404.html`'s `<style id="jtd-nav-activation">`
which contains exactly that one rule.

**Algorithm (port of the activation.scss.liquid).**

The upstream Liquid template builds the CSS from `nav_levels`
indirectly: it walks the rendered `site_nav` HTML, counts opening /
closing `<ul>` / `<li>` tags between the start and the current page's
link, and derives positional indices from those counts. The project
already moved this computation into the `nav-levels-precompute.rb`
plugin, which exposes `page.nav_levels` directly. Phase 2's
`page.navLevels` is the JS port of the same array.

So the JS generator only has to convert `page.navLevels` to the CSS
above. The full algorithm, ported rule-by-rule from
`activation.scss.liquid` lines 246-315 and verified by trace against
the homepage (depth=1), `Reference/Operators.md` (depth=2), and
`tB/Core/Const.md` (depth=3):

```js
const COLLECTION_PREFIX = ".site-nav > ul.nav-list:first-child";
const OTHER_COLLECTION = ".site-nav > ul.nav-list:not(:first-child)";

function navActivationCss(page) {
  const levels = page.navLevels;
  if (!levels) {
    return ".site-nav ul li a { background-image: none; }";
  }
  // levels[0] = 1 (collection-prefix; always 1 on this site).
  // levels[1..depth] = 1-based child positions for each ancestor + leaf.
  // depth = 1 (top-level), 2 (child of top-level), etc.
  const depth = levels.length - 1;
  const active = levels[depth];

  // ---- Rule 1: background-image: none for non-active links ----
  //
  // Liquid lines 246-260. Composite selector with three parts:
  //
  //   (a) When depth >= 2, one selector per ancestor LEVEL i in
  //       1..(depth-1): "prefix > (li > ul > ){i-1 times} li > a".
  //       Note: NO :nth-child on these -- it picks up every li at
  //       that level, including the ancestor on the active chain.
  //       The bolding rule (later, more specific) overrides for the
  //       active leaf; ancestors on the chain don't get bolding so
  //       they correctly drop the background image.
  //
  //   (b) Current page's SIBLINGS (li at depth, excluding active):
  //       "prefix > (li > ul > ){depth-1 times} li:not(:nth-child(N)) > a"
  //       where N = levels[depth].
  //
  //   (c) Current page's DESCENDANTS (li a at depth+1):
  //       "prefix > (li > ul > ){depth times} li a"
  const noBg = [];
  if (depth >= 2) {
    for (let i = 1; i <= depth - 1; i++) {
      let s = COLLECTION_PREFIX;
      for (let j = 2; j <= i; j++) s += " > li > ul";
      s += " > li > a";
      noBg.push(s);
    }
  }
  {
    let s = COLLECTION_PREFIX;
    for (let i = 1; i <= depth - 1; i++) s += " > li > ul";
    s += ` > li:not(:nth-child(${active})) > a`;
    noBg.push(s);
  }
  {
    let s = COLLECTION_PREFIX;
    for (let i = 1; i <= depth; i++) s += " > li > ul";
    s += " > li a";
    noBg.push(s);
  }
  let css = noBg.join(",\n") + " {\n  background-image: none;\n}\n";

  // ---- Rule 2: constant trailer for other collections + externals ----
  //
  // Liquid lines 266-269. This is page-independent (always the same
  // selectors); could be inlined as a constant in template.mjs.
  css += `${OTHER_COLLECTION} a,\n.site-nav li.external a {\n  background-image: none;\n}\n`;

  // ---- Rule 3: bolding the active leaf link ----
  //
  // Liquid lines 275-280. Bare "> li:nth-child(N)" (no class), one
  // per ancestor + leaf, separated by "> ul >":
  //   "prefix > li:nth-child(N1) > ul > li:nth-child(N2) > ... > a"
  {
    let s = `${COLLECTION_PREFIX} > li:nth-child(${levels[1]})`;
    for (let i = 2; i <= depth; i++) {
      s += ` > ul > li:nth-child(${levels[i]})`;
    }
    s += " > a";
    css += `${s} {\n  font-weight: 600;\n  text-decoration: none;\n}\n`;
  }

  // ---- Rule 4: expander icon rotation (button svg) ----
  //
  // Liquid lines 296-303. depth selectors total:
  //   "prefix > li:nth-child(N1) > button svg"
  //   "prefix > li:nth-child(N1) > ul > li:nth-child(N2) > button svg"
  //   ...
  //   "prefix > li:nth-child(N1) > ul > li:nth-child(N2) > ... > li:nth-child(Ndepth) > button svg"
  //
  // Note: bare "> li:nth-child(N)" (no class), same as Rule 3.
  {
    const sels = [];
    for (let i = 1; i <= depth; i++) {
      let s = COLLECTION_PREFIX;
      for (let j = 1; j <= i; j++) {
        s += (j === 1 ? " > " : " > ul > ") + `li:nth-child(${levels[j]})`;
      }
      s += " > button svg";
      sels.push(s);
    }
    css += sels.join(",\n") + " {\n  transform: rotate(-90deg);\n}\n";
  }

  // ---- Rule 5: collection display (ul.nav-list display: block) ----
  //
  // Liquid lines 308-315. Same shape as Rule 4 but with classed
  // selectors and ul.nav-list terminals:
  //   "prefix > li.nav-list-item:nth-child(N1) > ul.nav-list"
  //   "prefix > li.nav-list-item:nth-child(N1) > ul.nav-list > li.nav-list-item:nth-child(N2) > ul.nav-list"
  //   ...
  {
    const sels = [];
    for (let i = 1; i <= depth; i++) {
      let s = COLLECTION_PREFIX;
      for (let j = 1; j <= i; j++) {
        s += (j === 1 ? " > " : " > ul.nav-list > ") + `li.nav-list-item:nth-child(${levels[j]})`;
      }
      s += " > ul.nav-list";
      sels.push(s);
    }
    css += sels.join(",\n") + " {\n  display: block;\n}\n";
  }

  return css;
}
```

**Trace verification** (against rendered output):

| Page | navLevels | Generator output (after compress) matches rendered? |
|---|---|---|
| `index.md` (Welcome) | `[1, 1]` | depth=1. Rule 1: `prefix > li:not(:nth-child(1)) > a, prefix > li > ul > li a`. Rule 3: `prefix > li:nth-child(1) > a`. Verified ✓ |
| `Reference/Operators.md` | `[1, 5, 4]` | depth=2. Rule 1: `prefix > li > a, prefix > li > ul > li:not(:nth-child(4)) > a, prefix > li > ul > li > ul > li a`. Rule 3: `prefix > li:nth-child(5) > ul > li:nth-child(4) > a`. Verified ✓ against `_site/Reference/Operators.html` |
| `tB/Core/Const.md` | `[1, 5, 2, 7]` | depth=3. Rule 1: `prefix > li > a, prefix > li > ul > li > a, prefix > li > ul > li > ul > li:not(:nth-child(7)) > a, prefix > li > ul > li > ul > li > ul > li a`. Rule 3: `prefix > li:nth-child(5) > ul > li:nth-child(2) > ul > li:nth-child(7) > a`. Verified ✓ against `_site/tB/Core/Const.html` |
| `404.html` | `undefined` | Fallback: `.site-nav ul li a { background-image: none; }`. Verified ✓ against `_site/404.html` |

**Two subtle invariants worth flagging**:

1. **Rules 3 and 4 use BARE `> li:nth-child(N)`, no class.** Rule 5
   uses `> li.nav-list-item:nth-child(N)` with the class. This is a
   semantic distinction inherited from the upstream theme: the
   bolding / expander rules don't care about which `<li>` flavour
   matches (`nav-list-item` is the only flavour the nav uses, but the
   theme's specificity calculus is simpler without it), while the
   `display: block` rule does. Don't "tidy" by making them uniform --
   byte parity breaks.

2. **Rule 4 and Rule 5 build their selectors with a different
   first-segment join.** The first segment is ` > ` (space-arrow-space),
   subsequent segments add an intervening ` > ul > ` (Rule 4) or
   ` > ul.nav-list > ` (Rule 5). The conditional `j === 1 ? " > " : " > ul > "`
   captures this -- mis-ordering breaks the very first selector
   in each rule.

**Output whitespace**: the function emits literal `\n` newlines for
human readability of the source. The compress pass (§5.14) collapses
every run to a single space when it walks the full document. The
rendered output is one long line per rule with single-space
separators -- matches the upstream byte-for-byte.

**Verification fixtures:**

| Page | navLevels | Expected nav_activation_css |
|---|---|---|
| `index.md` (Welcome) | `[1, 1]` | depth=1 form |
| `tB/Core/Const.md` | `[1, 5, 2, 7]` | depth=3 form (matches grep above) |
| `Reference/Operators.md` | `[1, 5, 4]` | depth=2 form |
| `404.html` | `undefined` | `.site-nav ul li a { background-image: none; }` only |

The implementer should byte-diff the emitted CSS against
`_site/<page>.html`'s `<style id="jtd-nav-activation">` block for each
of these and iterate until match. (After the compress pass strips
inter-selector whitespace, the actual byte form is one long line --
see "Compression interplay" below.)

**Compression interplay.** The CSS is emitted with literal newlines
(`\n`) between selectors and rules. The compress pass (§5.14)
collapses every run of whitespace outside `<pre>` to a single
space, including inside `<style>` blocks (the compress pass is
oblivious to element semantics). The resulting CSS is one long line
with single spaces between selectors. That matches the upstream
output exactly (the upstream's compress.html does the same).

**The "no_nav_link" branch.** When `levels` is undefined, only the
fallback rule fires. Verified against `404.html` and (in the upstream)
any page where `site_nav` does not contain the page's URL.

### 5.6. `renderHeader(site, init)`

Per-page wrapper around the search input, the (optional) custom
header content, and the aux-nav. The aux-nav itself is constant per
build (it doesn't depend on the page).

Output:

```html
<div id="main-header" class="main-header">
  ${searchInput}      <!-- when search_enabled, else <div></div> -->
  ${auxNav}           <!-- when aux_links set, else nothing -->
</div>
```

`searchInput` (ported from upstream `components/search_header.html`):

```html
<div class="search" role="search">
  <div class="search-input-wrap">
    <input type="text" id="search-input" class="search-input" tabindex="0" placeholder="Search ${site.config.title}" aria-label="Search ${site.config.title}" autocomplete="off">
    <label for="search-input" class="search-label"><svg viewBox="0 0 24 24" class="search-icon"><use xlink:href="#svg-search"></use></svg></label>
  </div>
  <div id="search-results" class="search-results"></div>
</div>
```

The placeholder text comes from `_includes/search_placeholder_custom.html`
in the upstream theme. The site doesn't override it, so the upstream
default applies: "Search " + the strip-htmled site title. Bake that
into the constant.

`auxNav` (ported from the project's
`_includes/components/aux_nav.html` -- which includes the theme-
toggle button + the sun/moon SVG sprite inline):

```html
<nav aria-label="Auxiliary" class="aux-nav">
  <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
    <symbol id="svg-sun" viewBox="0 0 24 24">...sun body...</symbol>
    <symbol id="svg-moon" viewBox="0 0 24 24">...moon body...</symbol>
  </svg>
  <ul class="aux-nav-list">
    <li class="aux-nav-list-item">
      <span id="theme-toggle" class="site-button"><svg width='18px' height='18px'><use href="#svg-sun"></use></svg></span>
    </li>
    ${auxLinksItems}
  </ul>
</nav>
```

`auxLinksItems` iterates `site.config.aux_links` (a YAML hash of
`{ "Display Text": [url] }`). Each entry produces:

```html
<li class="aux-nav-list-item">
  <a href="${escAttr(link.url)}" class="site-button" ${targetAttrs}>
    ${escText(link.title)}
  </a>
</li>
```

`targetAttrs` is `target="_blank" rel="noopener noreferrer"` when
`site.config.aux_links_new_tab` is truthy.

**YAML hash → array conversion.** `aux_links` is a hash because
Liquid's `for link in site.aux_links` iterates `[key, value]` pairs
and `link.first` / `link.last` accesses the key / first value of the
list. In JS: `Object.entries(site.config.aux_links).map(([title, urls]) => ({ title, url: urls[0] }))`.

**Sun/moon SVG inline.** The project bakes them into `aux_nav.html`
rather than `icons/icons.html`. Phase 4 should do the same -- the
two SVG `<symbol>` blocks go inside the `<nav class="aux-nav">`
wrapper, not in the global `<svg class="d-none">` sprite.

### 5.7. `renderBreadcrumbs(page)`

Port of the project's `_includes/components/breadcrumbs.html` shadow.

Output (only when `page.permalink !== "/"` AND `page.frontmatter.parent`
AND `page.frontmatter.title`):

```html
<nav aria-label="Breadcrumb" class="breadcrumb-nav">
  <ol class="breadcrumb-nav-list">
    ${page.breadcrumbs.map(entry => `
    <li class="breadcrumb-nav-list-item"><a href="${escAttr(entry.url)}">${escText(entry.title)}</a></li>`).join("")}
    <li class="breadcrumb-nav-list-item"><span>${escText(page.frontmatter.title)}</span></li>
  </ol>
</nav>
```

When the gate fails (root page, no parent, no title), emit the empty
string. The wrapper `<div class="main-content-wrap">` doesn't care.

**Why `permalink !== "/"`** specifically. The homepage has
`permalink: /` and no `parent` -- both branches of the gate would
already drop it -- but the upstream guard checks `permalink` first
for compatibility with sites that might give the homepage a `parent`.
Keep the guard verbatim for byte parity.

### 5.8. `injectAnchorHeadings(html)`

Port of `_plugins/anchor-headings-fast.rb` (the project's Ruby
filter). The Phase 3 renderer already attached `id="..."` to each
heading; Phase 4 wraps each `<hN>...</hN>` with the link-and-svg
anchor.

```js
const HEADING_REGEX = /<(h[1-6])(\s[^>]*?)?>([\s\S]*?)<\/\1>/g;
const ID_ATTR_REGEX = /\bid="([^"]+)"/;
const ANCHOR_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><use xlink:href="#svg-link"></use></svg>';

export function injectAnchorHeadings(html) {
  return html.replace(HEADING_REGEX, (_, tag, attrs = "", body) => {
    const idMatch = attrs.match(ID_ATTR_REGEX);
    if (idMatch) {
      const id = idMatch[1];
      const anchor = `<a href="#${id}" class="anchor-heading" aria-labelledby="${id}">${ANCHOR_SVG}</a>`;
      return `<${tag}${attrs}> ${anchor} ${body} </${tag}>`;
    }
    return `<${tag}${attrs}> ${body} </${tag}>`;
  });
}
```

**Six bytes per heading worth pointing out:**

- A single space between `<hN attrs>` and the anchor: `> <a ...>`.
- A single space between the anchor and the body: `</a> CONTENT`.
- A single space between the body and the closing tag: `CONTENT </hN>`.
- For headings without `id`: still rebuild as `<hN attrs> CONTENT </hN>`
  (single spaces inside the open and close tags). The 404 page's
  `<h1>404</h1>` and the redirect-stub pages' `<h1>Redirecting...</h1>`
  hit this branch.

The single spaces are exactly what the upstream Liquid template +
`compress.html` produce after collapse -- emitting them directly
saves the compress pass any work on the heading region.

**Why `[\s\S]*?` (non-greedy match-all)** rather than `.*?`.
Headings can legitimately span multiple lines after Phase 3's
rendering (the upstream Ruby version uses `m` for the same reason).
Multiline match keeps the regex simple.

**Why no `no_anchor` class guard.** The upstream Liquid template
skips headings with `class="no_anchor"`. The project doesn't use
this class anywhere (the Ruby plugin's header comment notes this),
and the JS port mirrors the omission. If a future page introduces
`{:.no_anchor}` on a heading, add the guard: `if (attrs.includes('no_anchor')) return originalMatch;`.

**Auto-TOC headings (`<h2 class="text-delta">Table of contents</h2>`)
are intentionally not anchored.** They are inserted AFTER this pass
runs (§5.9 -- between `injectAnchorHeadings` and the closing
`</main>`). So even though the regex would match them, they aren't
in the input string.

### 5.9. `renderChildrenNav(page)`

Port of the project's `_includes/components/children_nav.html`
shadow.

Output (only when `page.children` is non-empty AND
`page.frontmatter.has_toc !== false`):

```html
<hr>
<h2 class="text-delta">Table of contents</h2>
<ul>
  ${page.children.map(child => `
  <li>
    <a href="${escAttr(child.url)}">${escText(child.title)}</a>${child.summary ? ` - ${escText(child.summary)}` : ""}
  </li>`).join("")}
</ul>
```

When the gate fails, emit the empty string.

**`has_toc` precedence.** `frontmatter.has_toc === false` suppresses
the children block. Everything else (including absence of the key)
emits it. Match upstream.

**Important: the `<h2 class="text-delta">` heading is emitted AFTER
the anchor-headings pass.** The class IS NOT `no_anchor`; if it
reached the anchor-headings regex, it would be rebuilt with single
spaces but without an `id` (no id attribute → no anchor link). The
upstream Ruby filter scope guard (the include is called against
`page.content`, not the full template output) achieves the same
isolation. Phase 4 must match by calling `injectAnchorHeadings`
ONLY on `page.renderedContent`, before splicing the children block
in.

**Summary dash.** The space-dash-space (` - `) between link and
summary is a literal source character; compress collapses any
surrounding whitespace to a single space. The kramdown
`smart_quotes` filter does NOT apply here (the entire chrome runs
post-kramdown).

### 5.10. The `book.html` bypass

`book.html` (with `layout: book-combined`) skips Phase 4 entirely.
The reason:

- Its consumer is Phase 8's PDF assembly, which iterates
  `site.bookData._chapters` and builds a single concatenated chapter
  document. The default-layout chrome (sidebar, breadcrumbs, footer)
  would be wrong for the PDF.
- The `book-combined` layout in the source (`_layouts/book-combined.html`)
  is the minimal "title page + chapters" template Phase 8 owns.

`templatePage` early-returns for `frontmatter.layout === "book-combined"`,
leaving `page.html` undefined. Phase 5's write loop must skip
pages with `page.html === undefined`. Phase 8 reads `page.renderedContent`
directly.

`book.html` also has `sitemap: false` in its frontmatter -- Phase 6's
sitemap generator respects this and excludes it. Not Phase 4's concern.

### 5.11. `renderFooter(page, site, init)`

Port of the project's `_includes/components/footer.html` shadow + the
project's `_includes/footer_custom.html` shadow.

Gate (only emit `<hr><footer>...</footer>` when at least one of):

- `footer_custom_html !== ""`  (the project's `footer_custom.html` is non-empty when `site.footer_content` is set OR `page.frontmatter.vba_attribution` is true)
- `site.config.last_edit_timestamp`
- `site.config.gh_edit_link`
- `site.config.gh_offline_link`
- `site.config.back_to_top`

Currently the project has `back_to_top: true`, `footer_content: ...`,
`last_edit_timestamp: true`, `gh_edit_link: true`, `gh_offline_link:
true` -- so the gate is always true on this site. Emit unconditionally
in practice, but keep the gate for portability.

Output:

```html
<hr>
<footer>
  ${backToTopBlock}
  ${footerCustom}
  ${editAndOfflineBlock}
</footer>
```

`backToTopBlock` (when `site.config.back_to_top`):

```html
<p><a href="#top" id="back-to-top">${escText(site.config.back_to_top_text ?? "Back to top")}</a></p>
```

`footerCustom` is the project's `_includes/footer_custom.html` output:

```html
${site.config.footer_content ? `<p class="text-small mb-0">${site.config.footer_content}</p>` : ""}
${page.frontmatter.vba_attribution ? `<p class="text-small mb-0">License: <a href="https://github.com/MicrosoftDocs/VBA-Docs/blob/main/LICENSE">CC-BY-4.0</a> Code license: <a href="https://github.com/MicrosoftDocs/VBA-Docs/blob/main/LICENSE-CODE">MIT</a> Attribution: <a href="https://github.com/MicrosoftDocs/VBA-Docs/tree/main">VBA-Docs</a></p>` : ""}
```

**`footer_content` is emitted verbatim**, not HTML-escaped. The
current value contains `&copy;` which is the desired HTML entity --
escaping would double-encode it to `&amp;copy;`. The upstream Liquid
does no escape either; match.

**The two attribution-line URLs are literal `<a>` tags** baked into
the include source. Phase 4 emits them verbatim.

`editAndOfflineBlock` (when any of `last_edit_timestamp` /
`gh_edit_link` / `gh_offline_link` are set):

```html
<div class="d-flex mt-2">
  ${lastModifiedBlock}
  ${editBlock}
  ${offlineBlock}
</div>
```

`lastModifiedBlock` (when `site.config.last_edit_timestamp` AND
`site.config.last_edit_time_format` AND `page.frontmatter.last_modified_date`):

```html
<p class="text-small text-grey-dk-000 mb-0 mr-2">
  Page last modified: <span class="d-inline-block">${formatDate(page.frontmatter.last_modified_date, site.config.last_edit_time_format)}</span>.
</p>
```

`formatDate` is a strftime-compatible formatter. The project uses
`"%b %e %Y at %I:%M %p"` -- e.g. "May 25 2026 at 09:13 PM". Implement
with a small helper (~30 lines covering `%a %A %b %B %d %e %H %I %j
%m %M %p %S %y %Y` -- the strftime tokens kramdown/Liquid `date`
supports). Most pages on this site don't set
`last_modified_date`, so the block is emitted rarely.

`editBlock` (when `site.config.gh_edit_link` and all five companion
keys are set):

```html
<p class="text-small text-grey-dk-000 mb-0${offlineExists ? " mr-2" : ""}">
  <a href="${gh_edit_link_href(page, site)}" id="edit-this-page">${escText(site.config.gh_edit_link_text)}</a>
</p>
```

The href is constructed by:

```js
const repo  = site.config.gh_edit_repository;
const view  = site.config.gh_edit_view_mode;       // "tree" or "edit"
const branch = site.config.gh_edit_branch;
const source = site.config.gh_edit_source ? `/${site.config.gh_edit_source}` : "";
const collDir = "";   // page.collection is unused on this site
return `${repo}/${view}/${branch}${source}${collDir}/${page.srcRel}`;
```

Currently produces e.g. `https://github.com/twinbasic/documentation//tree/main/docs/Reference/Core/Const.md` -- note the double slash (`/tree/main/docs/...`). Upstream Liquid concatenates the `gh_edit_repository` (which has a trailing slash in `_config.yml`) and the literal `/`, producing the double slash. Phase 4 mirrors this. Match-bytes wise this is the correct behaviour even though it's ugly; GitHub redirects through it.

The `offlineExists` boolean is `Boolean(site.config.gh_offline_link
&& site.config.gh_offline_link_text && site.config.gh_offline_link_url)`
-- the `mr-2` margin class only appears on the edit-block when the
offline-block also renders, so they sit in a row with a gap.

`offlineBlock` (when `gh_offline_link` and the two companion keys are
set):

```html
<p class="text-small text-grey-dk-000 mb-0">
  <a href="${escAttr(site.config.gh_offline_link_url)}" id="download-offline">${escText(site.config.gh_offline_link_text)}</a>
</p>
```

### 5.12. `renderSearchFooter(site)`

Port of `_includes/components/search_footer.html`.

Output (when `site.config.search_enabled !== false`):

```html
${searchButton}
<div class="search-overlay"></div>
```

`searchButton` (only when `site.config.search?.button` is truthy):

```html
<button id="search-button" class="search-button btn-reset" aria-label="Focus on search">
  <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><use xlink:href="#svg-search"></use></svg>
</button>
```

Currently `site.config.search` is unset, so just the overlay div is
emitted.

### 5.13. `renderMermaidScript(site)`

Port of `_includes/components/mermaid.html`. Emit when
`site.config.mermaid` is set. Currently unset, so this is a no-op.

When set, emit the mermaid include's standard CDN-loader pattern. The
upstream contents are roughly:

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@${site.config.mermaid.version}/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({ startOnLoad: true });
  ${site.config.mermaid_config ?? ""}
</script>
```

The site uses local SVG renders of mermaid diagrams (under
`assets/images/mmd/*.svg`), not the live mermaid runtime, so this
remains a forward-compatibility placeholder. Phase 4 emits empty
string when unset.

### 5.14. `compressHtml(html)`

Port of `_plugins/html-compress.rb`. Sole exported function from
`compress.mjs`:

```js
const PRE_BLOCK_RE = /<pre\b[\s\S]*?<\/pre>/g;

export function compressHtml(html) {
  const hadTrailingNl = html.endsWith("\n");
  // Split on <pre>...</pre> with a capture group so the matched
  // blocks stay in the result array, alternating with outside
  // segments. Even indices = outside, odd = pre body (verbatim).
  const parts = html.split(new RegExp(`(${PRE_BLOCK_RE.source})`, "g"));
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      parts[i] = collapseWhitespace(parts[i]);
    }
  }
  let result = parts.join("");
  if (hadTrailingNl && !result.endsWith("\n")) result += "\n";
  return result;
}

function collapseWhitespace(s) {
  // The Ruby version uses `split(" ").join(" ")` (awk-mode split):
  // splits on any run of whitespace (\s+) AND strips leading /
  // trailing whitespace implicitly. JS's `s.split(/\s+/)` on
  // "  foo  bar  " gives ["", "foo", "bar", ""] -- with leading /
  // trailing EMPTY strings -- so a naive `.split(/\s+/).join(" ")`
  // would produce " foo bar " (with stray spaces).
  //
  // `.trim()` first, then `.split(/\s+/)`, then `.join(" ")` matches
  // Ruby's awk-mode split character-for-character. Verified by
  // round-trip diff on a 100-page sample: zero divergences.
  return s.trim().split(/\s+/).join(" ");
}
```

**Why preserve a trailing newline.** The Ruby version restores one
because the upstream Liquid `vendor/compress.html` template's source
ends with a newline; its output therefore always ends with one.
Match for byte parity.

**Edge case: an empty document** (`html === ""`) returns `""`. The
trailing-newline restoration doesn't fire because `hadTrailingNl` is
false.

**Edge case: a `<pre>` with no closing tag** (malformed input). The
regex's `<\/pre>` requirement means it doesn't match, so the
malformed `<pre>...EOF` is treated as outside content and gets its
whitespace collapsed. Same as Ruby. Not a concern -- the renderer
ensures balanced pre blocks.

**Edge case: nested `<pre>`** isn't legal HTML but the non-greedy
`*?` would close on the first `</pre>`, leaving the rest of the
outer pre's body as outside content. Whitespace would be collapsed
inside the second half of the outer pre -- wrong, but again not
something a sane source produces.

**The `<pre>` boundary is by element, not by class.** Code blocks
emit `<pre class="highlight"><code>...</code></pre>` -- the regex
catches every `<pre>` regardless of attributes, so all code blocks
are safely preserved. Standalone `<code>` (without `<pre>`) is NOT
preserved -- the whitespace inside an inline code span would
collapse. This matches the upstream behaviour (the upstream's
`PRE_BLOCK_RE` is also pre-only). Currently no source page has
multi-whitespace runs inside inline `<code>`; if a future page
does, it'd render differently in both Jekyll and tbdocs.

**Indented `<pre>` blocks.** The regex doesn't care about leading
whitespace; the match starts at `<pre` wherever it lands. Outside
content before the match still gets collapsed (so the leading
whitespace before `<pre>` collapses to a single space). Matches
upstream.

### 5.15. `escText(s)` and `escAttr(s)`

Same 5-char HTML escape from PLAN-3.md §6.2. `escText` is used in
text content; `escAttr` is used in attribute values (same escape
characters; the names differ for self-documentation).

If a future requirement distinguishes them (e.g. allowing apostrophes
in attribute values), split. For now they're aliases.

---

## 6. Shared helpers

### 6.1. `escText(s)` / `escAttr(s)`

See §5.15.

### 6.2. `relativeUrl(url, baseurl)`

Port of Jekyll's `relative_url` filter. For root-absolute inputs
(`url.startsWith("/")`), prepend `baseurl` (currently empty). For
other inputs, return as-is.

```js
function relativeUrl(url, baseurl = "") {
  if (typeof url !== "string") return "";
  if (url.startsWith("/") && !url.startsWith("//")) {
    return `${baseurl}${url}`;
  }
  return url;
}
```

Used everywhere a chrome `href` / `src` references a root-absolute
URL. With empty `baseurl` it's the identity function -- but
introducing the helper now means a future `baseurl: /docs` config
change is a one-line edit.

### 6.3. `absoluteUrl(url, config)`

Port of Jekyll's `absolute_url` filter. For absolute inputs, return
as-is. For relative inputs, prepend `config.url + relativeUrl(...)`.

Used by `nav_external_links` and one or two other edge paths. SEO
fields already have their absoluteness baked in by Phase 2.

### 6.4. `formatDate(d, format)`

Strftime formatter. ~30 lines covering the tokens the project's
`last_edit_time_format` uses (`%b %e %Y at %I:%M %p`). Implement only
the tokens the format string actually contains; throw on unknown
tokens so a future format change surfaces immediately.

Alternative: use `date-fns` or `dayjs`. Adds a ~50 KB dependency
for one footer line; rejected. Hand-roll the tokens.

### 6.5. `jsonLd(page, site)`

Emits the JSON-LD blob inside the head_seo block. Uses
`JSON.stringify` per-field (matches Liquid's `| jsonify`). Two
variants depending on `page.seoIsHome`:

```js
function jsonLd(page, site) {
  if (page.seoIsHome) {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      headline: page.seoTitle,
      name: site.seoSiteTitle,
      publisher: {
        "@type": "Organization",
        logo: { "@type": "ImageObject", url: site.seoLogoUrl },
      },
      url: page.seoCanonical,
    });
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    headline: page.seoTitle,
    publisher: {
      "@type": "Organization",
      logo: { "@type": "ImageObject", url: site.seoLogoUrl },
    },
    url: page.seoCanonical,
  });
}
```

`JSON.stringify` produces compact JSON without trailing whitespace;
matches Liquid's `| jsonify` output character-for-character.

---

## 7. Design decisions and assumptions

### D1. One-pass template, not a render tree

Per PLAN.md "Architecture" sketch. The layout is small (~600 lines
of JS), the variations are few (one default layout plus the book
bypass), and a tree-based templating engine would add a runtime
dependency for negligible benefit. Direct string concatenation is
the cheapest and easiest-to-reason-about option.

Trade-off: if a future content type needs a substantially different
chrome (e.g. a blog index page with pagination), the JS function
acquires conditionals. We accept that; the current expectation is
no such variants.

### D2. Sidebar nav HTML is built once at init, not per-page

Per §4. The sidebar is identical across every page; the per-page
activation is a CSS-only mechanism via `page.navLevels`. Caching the
nav HTML once trims ~800 calls of the recursive walker to one.
Estimated savings: ~50-100 ms per build.

The upstream Jekyll theme uses `{% include_cached components/site_nav.html %}`
for the same reason; the project's `_includes/components/sidebar.html`
inherits that. We get the same effect by caching the string.

### D3. Activation CSS is per-page

Per §5.5. The activation block changes for every page (different
`navLevels`). It's small (~10-30 selectors), fast to emit, and is
the only per-page chrome variation other than `<head>` SEO fields,
breadcrumbs, children-nav, and the footer edit-link href.

Alternative considered: render `data-active-path="..."` attributes
on each `<li>` in the nav HTML and use a single CSS rule like
`li[data-active-path] > a { font-weight: 600; }`. Rejected because
it would force the nav HTML to change per-page (defeating D2) and
because the upstream activation mechanism is CSS-only (matching it
guarantees byte parity).

### D4. Anchor headings as a post-render regex pass, not at markdown render time

Per §5.8. The Ruby plugin already does this. The reasons:

- The anchor-injection regex is small (~15 lines) and fast.
- It runs against the rendered HTML, so it sees the final heading
  IDs (including markdown-it-attrs overrides and the dedup-suffix).
- Doing it inside `render.mjs` would force the markdown-it pipeline
  to know about the chrome's anchor SVG, which violates the Phase 3 /
  Phase 4 boundary.

Trade-off: a heading injected by the chrome (the auto-TOC's `<h2
class="text-delta">`) is intentionally not anchored, and Phase 4 has
to call `injectAnchorHeadings` on `renderedContent` BEFORE splicing
the auto-TOC in. Mirrors the upstream scope guard.

### D5. HTML compression as a post-template pass, not a per-section pass

Per §5.14. Doing it once on the fully-assembled document is one
function call per page. The alternative -- compressing each chunk
as it's appended -- would require coordinating which chunks are
"compress-safe" (no `<pre>` in the head, no `<pre>` in the sidebar,
maybe in the body...). The one-pass approach is simpler.

The compress function is ~10 lines of JS and runs in ~1-2 ms per
page (838 pages × 1.5 ms ≈ 1.3 s). That's the bulk of Phase 4's
budget; if it ever becomes a bottleneck, the alternative is to
identify which segments NEVER have `<pre>` blocks (head, sidebar,
breadcrumbs, footer, scripts) and pre-compress them at init, then
compress only the `<main>...</main>` interior per-page.

### D6. `book.html` skip is in Phase 4, not at the orchestrator level

Per §5.10. The orchestrator's per-page wrap loop calls
`templatePage` on every page; the layout check inside `templatePage`
early-returns for `book.html`. The reason:

- Keeps the orchestrator dumb (it doesn't need to know which pages
  are book-specific).
- Mirrors the way Jekyll handles different layouts: each layout has
  its own template, and the page renders through whichever matches.
- Phase 5 already has to handle the `page.html === undefined` case
  for redirect stubs (which Phase 6 generates separately).

Alternative: have the orchestrator filter `pages` by layout before
calling Phase 4. Rejected because it spreads the layout-dispatch
logic across two places.

### D7. No `theme-switch.js` source baked in

Per PLAN.md "Static Asset Extraction". The two custom JS files in
the source (`assets/js/theme-switch.js`, `assets/js/just-the-docs.js`)
get extracted once from the Jekyll build and live in
`builder/assets/js/`. Phase 5 copies them to `_site/assets/js/`.
Phase 4 just emits the `<script>` tags referencing them.

If the project ever changes the theme-switch source, regenerate the
asset and re-extract; the path the chrome references doesn't
change.

### D8. The `aux_nav.html` sun/moon SVG sprite stays inside the aux-nav block

Per §5.6. The project's source embeds the sun/moon symbols inline
inside the aux-nav, not in the global icon sprite. Phase 4 mirrors
this for byte parity. A future cleanup could consolidate the
sprites; not in scope.

### D9. `gh_edit_repository` keeps its trailing slash

Per §5.11. The project's `_config.yml` has
`gh_edit_repository: "https://github.com/twinbasic/documentation/"`,
and the upstream Liquid concatenates `repository + "/" + view_mode`,
producing the double slash (`/tree/`). GitHub redirects through it.
Phase 4 emits the same shape; "fixing" the double slash would create
a byte-diff against Jekyll's output.

### D10. Throw on unsupported layout

For any `frontmatter.layout` other than `default` / `home` / `page` /
`book-combined`, `templatePage` throws with the page's `srcRel` and
the unknown layout name. The four supported layouts cover every page
on this site; an unknown one is a bug worth catching early.

### D11. Throw on `site.config.just_the_docs.collections` being set

Per PLAN-2.md and §1. Phase 2 doesn't support collections; Phase 4
shouldn't pretend to either. The check goes in `init`-time so the
build fails before per-page work starts.

### D12. Trailing newline on `page.html`

`compressHtml` preserves a single trailing `\n` when the input had
one. The template literal in `templatePage` ends with `\n`, so the
output of `compressHtml` ends with `\n`. Matches Jekyll's file
output (Ruby writes `content` with a trailing newline always).

### D13. Mutate `page.html` in place

Same rationale as Phase 2 and Phase 3 -- one growing record per page.

### D14. No `last_modified_date` from `fs.stat`

If a page doesn't set `frontmatter.last_modified_date`, the "Page
last modified" footer line is suppressed -- the upstream conditional
fires only when the frontmatter key is present. Matches Jekyll. An
earlier draft of this plan considered falling back to `mtime` of
the source file; rejected because the upstream doesn't and the diff
noise (against Jekyll's output) would defeat the verification
strategy.

### D15. The footer's `<hr>` and `</main>` ordering

The upstream layout puts `</main>` BEFORE the footer's `<hr>`. Both
sit inside `<div id="main-content" class="main-content">`. Phase 4
mirrors:

```html
<div id="main-content" class="main-content">
  <main>
    ${body}
    ${childrenNav}
  </main>
  ${footer}    <!-- footer starts with <hr> when emitted -->
</div>
```

The children-nav's own `<hr>` (right before `<h2 class="text-delta">`)
sits INSIDE `<main>`. So a page with children renders:

```
<main>
  ...body...
  <hr>
  <h2 class="text-delta">Table of contents</h2>
  <ul>...</ul>
</main>
<hr>     ← footer's hr
<footer>...</footer>
```

Two consecutive `<hr>` tags, no intervening text. Matches the
upstream visual (the two `<hr>`s render as one separator with a
slightly thicker line).

### D16. `escapeHtml` semantics for `footer_content`

`footer_content` is emitted verbatim, NOT escaped (per §5.11). The
current value contains `&copy;`. Verifying: the rendered output
shows `Copyright &copy; 2025` -- the HTML entity, not `&amp;copy;`.
Match by passing the string through without escape.

If a future `footer_content` accidentally contains a `<` or `&` not
part of an entity, the renderer would emit it literally -- which is
the same as Jekyll. The fix is at the config level, not in Phase 4.

### D17. Use the project's shadow includes, not the upstream

The project ships shadow versions of `breadcrumbs.html`,
`children_nav.html`, `footer.html`, `site_nav.html`,
`nav/links.html`, `head_seo.html`, `head.html`, and a custom
`head_custom.html`. Phase 4 ports the SHADOWS, not the upstream
includes -- the shadows are what render the current `_site/`
output, so byte parity requires matching them.

Specifically the upstream `head_seo.html` is jekyll-seo-tag's
output, but the project's shadow is a hand-rolled subset (see
`docs/_includes/head_seo.html`). Phase 4 ports the shadow's exact
output shape.

### D18. Pure-string emission, no JSDOM / cheerio

Phase 4's output is HTML, but the construction is pure string
concatenation. No parser / serialiser. Reason: a DOM-based approach
would change the byte-level output (different attribute ordering,
re-emitted self-closing forms, etc.), breaking byte-parity
verification.

The two JS-side operations that look like DOM manipulation
(`injectAnchorHeadings` and `compressHtml`) are pure regex / string
operations.

### D19. Whitespace fidelity: compress collapses, it does not insert

The compress pass (§5.14) turns every run of whitespace outside
`<pre>` into ONE space. It does NOT add whitespace where there is
none. So adjacent tags emitted with no whitespace between them
(e.g. `<button><svg>...</svg></button>`) stay adjacent in the
compressed output (`<button><svg>...</svg></button>`).

The upstream Liquid templates frequently have source-side whitespace
(newlines, indentation) BETWEEN tags. After compress, that whitespace
becomes a single space. For byte parity, Phase 4's template literals
must include the same single space (or any whitespace that collapses
to one) between adjacent tags wherever the upstream has source-side
whitespace.

Concrete example: the `nav-list-expander` button. Upstream source:

```html
<button class="..." ...>
  <svg ...><use .../></svg>
</button>
```

Rendered: `<button ...> <svg ...><use .../></svg> </button>` (with
spaces inside the open and close tags). Phase 4 must emit
`<button ...> <svg ...>...</svg> </button>` literally -- a tight
concatenation `<button ...><svg ...>...</svg></button>` would
byte-diff.

Conversely, the upstream uses `{%- -%}` (whitespace-trimming Liquid)
in nav/links.html's `for` loop, so consecutive `<li>` items render
tight: `<li>...</li><li>...</li>` with no whitespace between them.
Phase 4 must emit those tight too -- a literal-newline `<li>...</li>\n<li>...</li>`
would compress to `<li>...</li> <li>...</li>` (with space) and
byte-diff.

**Rule of thumb:** for each block in the upstream template, decide
whether it uses `{%- -%}` (tight output) or plain `{% %}` (whitespace
preserved). Mirror the choice in Phase 4's template literal. When
in doubt, grep the rendered `_site/` for the exact byte pattern and
match.

Verification path: byte-diff a representative page against Jekyll's
output, and treat every diff that's "extra/missing space between
two tags" as a D19 violation. The fix is always at the template
source, never in the compress pass.

---

## 8. Edge cases (cross-cutting)

### Nav rendering

| Case | Handling |
|---|---|
| `site.navTree` is empty | Sidebar nav UL is empty: `<ul class="nav-list"></ul>`. Activation CSS falls through to the no-nav-link branch for every page. Should never happen on this site. |
| Top-level node with no children | Renders `<li>...</li>` with no expander button, no nested UL. |
| Node title containing HTML-active chars (`&, &=`) | `escText` escapes to `&amp;, &amp;=`. The activation CSS uses positional `:nth-child()`, not text matching, so the operator pages still bold correctly. |
| `nav_external_links` is empty array (`[]`) | Emit nothing -- the upstream guard is `{% if site.nav_external_links %}` which is truthy for any non-nil array; the project's shadow extends to checking the array's length. Currently set; verify behaviour by diff. |
| `nav_external_links_new_tab: false` but a single entry has `opens_in_new_tab: true` | The entry gets `target="_blank"`; others don't. |

### Activation CSS

| Case | Handling |
|---|---|
| `page.navLevels === undefined` (page not in nav) | Only the fallback `.site-nav ul li a { background-image: none; }` rule. |
| `page.navLevels === [1]` (top-level page) | depth=0 case. The bolding selector is `... :first-child > li:nth-child(1) > a` -- no nested UL chain. The implementer should diff against the homepage to confirm the shape. |
| `page.navLevels.length > 8` | Hits the implicit cap from the Phase 2 walker. No special handling needed; the loop unrolls correctly to any depth. |
| `page.navLevels[0] !== 1` | Would imply a `just_the_docs.collections` config. We throw at init (D11). |

### Anchor headings

| Case | Handling |
|---|---|
| Heading without `id` (e.g. `<h1>404</h1>`) | Rebuilt as `<h1> 404 </h1>` with single spaces around the body -- no anchor link. Matches upstream. |
| Heading with `id` and inline `<code>` body | Rebuilt with anchor; the body's `<code>` tag is preserved verbatim inside the rebuilt heading. |
| Heading with multiple attributes (`<h2 id="foo" class="bar">`) | The regex captures the entire attribute string into `$2`. The id-extraction regex finds `id="foo"`. The rebuild emits `<h2 id="foo" class="bar"> <a...> ... </h2>`. |
| Heading containing a `</h2>` inside an inner element (e.g. `<h2><span>x</h2></span></h2>`) | The non-greedy `*?` closes on the first `</h2>`, leaving the rest dangling. Invalid HTML; doesn't occur on the site. |
| Heading immediately followed by another heading | Each heading is matched independently; both get anchored. |
| `<hgroup>` containing multiple `<hN>` | Each inner heading anchored independently; the `<hgroup>` wrapper is untouched. Not used on this site. |

### Footer

| Case | Handling |
|---|---|
| `page.frontmatter.vba_attribution !== true` | Attribution `<p>` not emitted; `footer_custom` is just `<p>Copyright ...</p>`. |
| `page.frontmatter.vba_attribution: true` but `site.config.footer_content` unset | Only the attribution `<p>` renders; no copyright. |
| Neither `gh_edit_link` nor `gh_offline_link` set | The d-flex row is not emitted. |
| `gh_offline_link: true` but no `gh_offline_link_url` | The offline `<p>` doesn't render (the inner guard requires all three keys). The edit `<p>` then drops its `mr-2` class. |
| Page with `last_modified_date: 2026-05-01` (YAML date) | `formatDate` accepts JS `Date` and ISO strings. YAML parses `2026-05-01` as a `Date`; pass through. |

### Breadcrumbs

| Case | Handling |
|---|---|
| Homepage (`permalink: /`) | Gate fails on `permalink !== "/"`; no breadcrumb nav emitted. |
| Top-level non-home page (no `parent`) | Gate fails on `frontmatter.parent`; no breadcrumb nav emitted. |
| Page with deep `breadcrumbs` chain (4+ ancestors) | All ancestors rendered as `<li><a>...</a></li>`; the current page renders as the final `<li><span>...</span></li>`. No truncation. |

### Children-nav

| Case | Handling |
|---|---|
| `page.children` is empty | No `<hr><h2><ul>...</ul>` block emitted. |
| `has_toc: false` on a parent page | Children-nav suppressed even when children exist. |
| Child with `summary` set | The summary follows the link, separated by ` - `. |
| Child with summary containing HTML-active chars | `escText` escapes. |
| Child with `nav_exclude: true` | STILL included in children-nav -- the children-precompute (Phase 2 §5.6) doesn't filter `nav_exclude`, matching the upstream's behaviour. |

### Special pages

| Case | Handling |
|---|---|
| `index.md` (`layout: home`) | Treated as `default`; emits full chrome. |
| `404.html` (`layout: page`) | Treated as `default`; emits full chrome. Its `<h1>404</h1>` and `<h2>Not found</h2>` headings are rebuilt without anchors (no id). The activation CSS falls through to the no-nav branch. |
| `book.html` (`layout: book-combined`) | Skipped entirely (§5.10). `page.html` undefined. |
| A future page with `layout: minimal` | Throws (D10). |

### Compression

| Case | Handling |
|---|---|
| `<pre>` with attributes (`<pre class="highlight" data-lang="tb">`) | Matched by `<pre\b[\s\S]*?<\/pre>`; body preserved. |
| Self-closing `<br />` outside a `<pre>` | The trailing `/>` is part of the outside content; whitespace around it collapses to single spaces. Matches Ruby. |
| Multiple `<pre>` blocks on one page | Each matched independently; bodies preserved, gaps collapsed. |
| `<pre>` whose body contains a `</p>` or other tags | Body kept verbatim, tags inside not parsed. Standard inside-pre semantics. |
| Document with no `<pre>` | Single-element array after split; collapse the whole thing. |
| Document with leading whitespace | Stripped by the trim() inside the per-segment collapse. |

---

## 9. What's NOT in Phase 4

These belong in later phases. Mentioned here so the implementer doesn't
get tempted.

- **Writing `page.html` to `_site/<destPath>`.** Phase 5.
- **Copying static assets (CSS, JS, sprites, favicon, content images)
  to `_site/assets/`.** Phase 5.
- **Generating redirect stub pages from `frontmatter.redirect_from`.**
  Phase 6 (`redirects.mjs`). They use a different layout (the
  redirect minimal HTML, ~10 lines).
- **Generating `sitemap.xml`.** Phase 6 (`sitemap.mjs`).
- **Generating `assets/js/search-data.json` (Lunr index).** Phase 6
  (`search.mjs`).
- **URL rewriting for the offline tree (`_site-offline/`).** Phase 7
  (`offline.mjs`). The offline pass copies and rewrites every HTML
  file from `_site/`; it operates on Phase 5's output.
- **The `<script src="search-data.js">` injection for offline.** Phase 7.
- **Patching `just-the-docs.js` (navLink + initSearch).** Phase 7.
- **Assembling `book.html` from chapters, applying heading-shift,
  href-rewriting, details-stripping, etc.** Phase 8.
- **Rendering the PDF (pagedjs-cli).** External tool, run by `book.bat`
  after the build.
- **`window.OFFLINE_SITE_ROOT` injection.** Phase 7.

---

## 10. Verification

### Acceptance checklist for "Phase 4 is done"

1. After Phase 4 runs on the production tree:
   - Every page (except `book.html`) has a non-empty `page.html`
     starting with `<!DOCTYPE html>` and ending with `</html>\n`.
   - `book.html`'s `page.html` is `undefined`.
2. For a curated set of pages, the rendered `page.html` matches
   `_site/<destPath>` byte-for-byte modulo the known divergences
   listed in PLAN.md's "Verification Strategy":
   - Minor whitespace variance (compress vs ours).
   - `<meta name="generator">` (kept verbatim per D10's note).
   - Timestamp-dependent footer line (only when `frontmatter.last_modified_date`
     is set, and Jekyll's strftime might format hour-leading-zero
     differently from our hand-roll -- worth pinning).
3. For the four representative pages from Phase 3 §10:
   - `index.md` (Welcome) -- chrome includes site title with logo,
     no breadcrumbs (gate fails on `permalink === "/"`), full footer
     with copyright. Children-nav: page DOES have children in nav
     (top-level pages like FAQ, Tutorials, Features, ...), but
     `index.md`'s frontmatter doesn't set `parent:` -- so the
     children-precompute (Phase 2 §5.6) gives it `children = []`
     and the children-nav block is suppressed regardless of
     `has_toc`. Verify by grepping `text-delta` in `_site/index.html`
     -- should return no match.
   - `tB/Core/Const.md` -- breadcrumbs `[Reference Section,
     Statements, Const]`, no children-nav (it's a leaf), full footer
     with copyright + VBA attribution + edit/offline links.
     Activation CSS bolds the 7th child of the 2nd child of the 5th
     top-level item.
   - `Reference/index.md` -- children-nav lists 8 entries (Categories,
     Statements, Procedures and Functions, Operators, Compiler
     Constants, Attributes, Controls, Glossary). Activation CSS
     bolds the 5th top-level item.
   - `404.html` -- activation CSS is the fallback rule only; no
     breadcrumbs; no children-nav.
4. `injectAnchorHeadings` applied to a known fixture (`tB/Core/Const.md`'s
   `<h1 id="const"></h1>`) produces `<h1 id="const"> <a href="#const"
   class="anchor-heading" aria-labelledby="const"><svg...>...</svg></a>
   Const </h1>` (with single spaces).
5. `compressHtml` applied to a fixture with a code block preserves
   the body whitespace inside `<pre>` and collapses everything else.
   ~10 fixture cases (empty pre, multi-line pre, pre with attributes,
   adjacent pre blocks, leading whitespace, no pre at all).
6. `navActivationCss(page)` applied to a page with
   `page.navLevels = [1, 5, 2, 7]` produces the exact CSS string
   verified against `_site/tB/Core/Const.html`'s `<style id="jtd-nav-activation">`
   block (after whitespace normalisation).
7. The sidebar nav HTML (cached at init) matches `_site/index.html`'s
   `<nav id="site-nav">` content byte-for-byte after compress.
8. The auxiliary nav HTML (cached at init) matches `_site/index.html`'s
   `<nav class="aux-nav">` content -- including the sun/moon
   sprite -- byte-for-byte.
9. The footer block on `index.md` (no VBA attribution) and on
   `tB/Core/Const.md` (WITH VBA attribution) both diff clean against
   Jekyll's output.
10. Performance: full Phase 4 wrap of 838 pages completes in **under
    500 ms** on the current dev machine (target 300 ms; cap 500 ms
    before regression alarm). Compression dominates the budget; if
    we exceed, profile compress.mjs first.
11. Full-tree `diff -rq _site/ _site-new/` -- where `_site-new/` is
    Phase 5's output of Phase 4's `page.html` -- shows only the
    known divergences from item 2. This validates Phase 4 + Phase 5
    together; landing Phase 5 is a precondition.

### Verification harness

`builder/verify-phase4.mjs` extends the verify-phase3 pattern:

1. Run discover → nav → seo → book → buildInfo → render → template.
   Capture per-substep wall time.
2. Assert items 1-9 above.
3. **Byte-comparison harness:** for the four representative pages,
   diff `page.html` against `_site/<destPath>` (read from disk).
   Print the diff for each. Pass if the diff is empty or matches a
   known-acceptable pattern (the generator meta tag, the timestamp
   discrepancy).
4. **Performance smoke check:** print per-substep wall time; warn if
   total exceeds 500 ms.
5. Exit non-zero on any required failure.

### Triage tooling

The same `_diff.mjs` / `_diff_all.mjs` / `_triage.mjs` / `_spot.mjs`
scripts shipped for Phase 3 are extended to compare FULL pages (not
just body fragments) once Phase 4 ships. The extension:

- Update `_spot.mjs` to print `page.html` instead of `page.renderedContent`.
- Update `_diff.mjs` to diff against `_site/<destPath>` (not the
  body-fragment extraction Phase 3 uses).
- Update `_triage.mjs`'s classifier to bucket full-page divergences
  (e.g. "head-only", "footer-only", "nav-activation-css", "compress
  artefact").

### Accepted divergences

If any byte-level diff survives Phase 4 verification on a page that
isn't already in `accepted-divergences.mjs` (from Phase 3), extend
the file with the page + bucket (e.g. "generator-meta-tag",
"strftime-hour-padding") AND a one-paragraph header comment
explaining why the divergence is acceptable.

The current expectation is **zero new accepted divergences** -- the
chrome is fully derived from per-page Phase 2 fields and the layout
sources, and every conditional has a clean port.

### Byte-for-byte parity (the goal)

Phase 4 is the phase where `diff -rq _site/ _site-new/` becomes the
canonical verification, because the per-page output finally matches
Jekyll's. The Phase 3 harness diffs body fragments; Phase 4 diffs
full files. A clean diff on all 838 pages (modulo the accepted
divergences) is the bar for "Phase 4 + Phase 5 are done."

---

## 11. Dependencies needed for this phase only

Phase 4 adds **zero** new dependencies. Cumulative after Phase 4:

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0"
  }
}
```

The template and compress code is pure Node stdlib + plain JS. No
template engine, no HTML parser, no string-manipulation library.

---

## 12. File layout after Phase 4

```
<repo root>/
  builder/
    PLAN.md             — architecture overview
    PLAN-1.md           — Phase 1 spec
    PLAN-2.md           — Phase 2 spec
    PLAN-3.md           — Phase 3 spec
    PLAN-4.md           — this file
    package.json        — unchanged (no new deps)
    discover.mjs        — Phase 1 (shipped)
    nav.mjs             — Phase 2 (shipped)
    seo.mjs             — Phase 2 (shipped)
    book.mjs            — Phase 2 (shipped); Phase 8 renderer later
    build-info.mjs      — Phase 2 (shipped)
    render.mjs          — Phase 3 (shipped)
    highlight.mjs       — Phase 3 (shipped)
    twinbasic.tmLanguage.json   — Phase 3 (shipped)
    accepted-divergences.mjs    — Phase 3 list, possibly extended
    template.mjs        — §3 + §5 (~600 lines)
    compress.mjs        — §5.14 (~40 lines)
    tbdocs.mjs           — orchestrator extended
    verify-phase1.mjs   — Phase 1 harness (retired Phase 10)
    verify-phase2.mjs   — Phase 2 harness (retired Phase 10)
    verify-phase3.mjs   — Phase 3 harness (retired Phase 10)
    verify-phase4.mjs   — §10 acceptance harness (new) (retired Phase 10)
    _triage.mjs / _diff.mjs / _diff_all.mjs / _spot.mjs   — extended
                          to operate on page.html
    assets/             — NEW for Phase 4 (extracted theme assets)
      README.md         — re-extraction procedure + CSS-class contract (shipped)
      css/
        just-the-docs-combined.css
        just-the-docs-head-nav.css
        rouge.css
        print.css
      js/
        just-the-docs.js
        theme-switch.js
        vendor/
          lunr.min.js
  docs/                 — unchanged
```

### Extended `tbdocs.mjs` orchestrator

```js
import { templatePhase } from "./template.mjs";

async function main() {
  // ... Phase 1 + Phase 2 + Phase 3 as before ...

  await templatePhase(pages, site);
  t.lap("template");

  console.log(`Phase 1+2+3+4 done: ${pages.length} pages`);
  console.log(t.summary());

  return { pages, staticFiles, site };
}
```

Where `templatePhase(pages, site)`:

1. Builds the per-build init bag (SVG sprite, sidebar HTML, header,
   aux-nav, search-footer, favicon link, GA snippet, mermaid script).
2. `Promise.all`-wraps every page via `templatePage(page, site, init)`.
3. Skips `book.html` (assigned `undefined`).

### Static asset extraction (one-time setup)

Before the first Phase 4 build, extract from the current Jekyll
output:

```sh
cp docs/_site/assets/css/just-the-docs-combined.css   builder/assets/css/
cp docs/_site/assets/css/just-the-docs-head-nav.css   builder/assets/css/
cp docs/_site/assets/css/print.css                    builder/assets/css/
cp docs/_site/assets/css/rouge.css                    builder/assets/css/
cp docs/_site/assets/js/just-the-docs.js              builder/assets/js/
cp docs/_site/assets/js/theme-switch.js               builder/assets/js/
cp docs/_site/assets/js/vendor/lunr.min.js            builder/assets/js/vendor/
```

If the custom color scheme is ever changed (`docs/_sass/color_schemes/*.scss`),
recompile and re-extract. Until then, `builder/assets/` is the
canonical source.

[builder/assets/README.md](assets/README.md) (shipped during Phase 5)
documents:

- Source of each file (just-the-docs 0.10.1 from `docs/Gemfile`,
  custom SCSS under `docs/_sass/custom/`, hand-written CSS under
  `docs/assets/css/`, project-local `theme-switch.js`).
- Re-extraction procedure when the theme is updated.
- The CSS class names Phase 3's highlighter and Phase 4's template
  rely on (e.g. `.anchor-heading`, `.text-delta`, `.nav-list-link`).

---

## 13. What a "done" Phase 4 enables

After Phase 4 lands, every page has `page.html` populated (except
`book.html`). The next session can implement Phase 5 (write online)
by:

1. Iterating `pages[]` and writing `page.html` to `_site/<page.destPath>`.
2. Copying `builder/assets/` verbatim into `_site/assets/`.
3. Copying every entry in `staticFiles[]` (from Phase 1) to its
   `destRel` under `_site/`.

That's a ~50-line phase -- no logic, just file writes. The full
`diff -rq _site-jekyll/ _site-tbdocs/` validation runs at the end
of Phase 5 and confirms the layout port is correct.

Phase 6 (auxiliaries: redirects, sitemap, search), Phase 7 (offline),
and Phase 8 (PDF) all consume Phase 4's `page.html` directly or
indirectly:

- **Phase 6 (search):** walks rendered pages, strips HTML, indexes
  the text. The HTML it walks is `page.html` (or `_site/`-on-disk,
  depending on ordering).
- **Phase 6 (sitemap):** reads `permalink` and `frontmatter.sitemap`
  (the latter to exclude `book.html`). Doesn't need `page.html`.
- **Phase 6 (redirects):** generates new pages from `frontmatter.redirect_from`.
  Doesn't read `page.html`.
- **Phase 7 (offline):** reads every HTML file in `_site/` and
  rewrites root-absolute hrefs to page-relative form. The HTML it
  reads is Phase 5's output of Phase 4's `page.html`.
- **Phase 8 (PDF):** reads `page.renderedContent` (Phase 3) for each
  chapter, not `page.html`. The book bypass in Phase 4 (§5.10) is
  what frees Phase 8 to do its own chrome.

That clean handoff is the whole point of having a template phase as
a standalone step.

---

## 14. Implementation order

Suggested order for the next session. Each step is independently
verifiable.

1. **Bootstrap `template.mjs` with a stub `templatePage` returning
   `<!DOCTYPE html><html><head></head><body>${page.renderedContent}</body></html>`.**
   Wire into the orchestrator's `templatePhase` (which `Promise.all`-
   walks `pages`). Verify the loop runs over all 838 pages.

2. **Implement `compress.mjs` and add to the pipeline.** Test against
   ~10 fixtures (empty, no-pre, single-pre, multi-pre, leading-
   whitespace, adjacent-pre, attribute-pre, pre-with-tags-inside,
   document-with-no-trailing-newline).

3. **Add the head block (§5.2):** the static parts (charset, viewport,
   theme-switch script, CSS links, lunr, just-the-docs.js) first;
   then the SEO block (§5.2 sub); then the activation `<style>` (stub
   to a constant string for now).

4. **Add the body skip-to-main link, the SVG sprite (§5.3), the sidebar
   (§5.4 -- WITHOUT the recursive nav yet), and the header (§5.6
   without the aux-nav).** Verify the page shape matches Jekyll's for
   the homepage.

5. **Implement the recursive nav walker (§5.4) and the init-time
   cache.** Verify the cached nav HTML byte-matches `_site/index.html`'s
   sidebar nav UL (after compress).

6. **Implement the aux-nav (§5.6).** Verify against the rendered
   header on any content page.

7. **Implement breadcrumbs (§5.7) and children-nav (§5.9).** Verify
   against `_site/tB/Core/Const.html` (breadcrumbs) and
   `_site/Reference.html` (children-nav).

8. **Implement `injectAnchorHeadings` (§5.8).** Verify against any
   `tB/Core/*` page's `<h1>` and `<h2>` headings.

9. **Implement the footer (§5.11).** Verify against pages with
   and without `vba_attribution` and with and without
   `last_modified_date`.

10. **Implement the search-footer (§5.12) and the mermaid script
    placeholder (§5.13).** Both are mostly empty on this site.

11. **Implement `navActivationCss` (§5.5).** This is the largest
    sub-component. Verify against the four representative pages
    from §10 step 6.

12. **Wire the `book.html` bypass (§5.10).** Verify by inspecting
    `pages.find(p => p.srcRel === "book.html").html === undefined`.

13. **Wire `verify-phase4.mjs`** with the items in §10. Iterate
    until all checks pass.

14. **Extract static assets** (`builder/assets/`) and update
    `package.json` if needed (no new deps, but maybe a `scripts`
    entry for the asset-refresh procedure).

15. **(Phase 5 prerequisite, not Phase 4):** wire a minimal
    `_site-new/` writer that just dumps `page.html` to the right
    paths. Then run `diff -rq _site/ _site-new/` and iterate on any
    surfaced byte differences.

Steps 1-12 are mostly mechanical. Step 11 is the algorithmic core;
budget 1-2 hours for it. Steps 13-15 close the verification loop.

---

## 15. Notes for the implementer

- **Read the rendered output, not just the source.** The compress
  pass collapses meaningful whitespace; the rendered shape can
  surprise you. Use `_site/index.html` as the ground truth.
- **The four representative pages cover most cases.** If a fifth
  case surfaces during iteration (e.g. a redirect stub layout, a
  blog post collection), flag it -- it may indicate Phase 4 is
  growing beyond the default layout.
- **The activation CSS is the only algorithmic piece.** Most of the
  template is mechanical string concatenation; budget your time
  accordingly.
- **Byte parity is the bar.** If a diff surfaces a 1-byte
  difference, fix it -- don't accept it. The accepted-divergences
  list from Phase 3 is for genuine semantic differences (Rouge vs
  Shiki for non-tB syntax highlighting); the chrome should match
  exactly.
- **Don't refactor for elegance until verification passes.** The
  fast path to byte parity is "do exactly what the upstream Liquid
  + project shadows do." Cleanup is a follow-up.
