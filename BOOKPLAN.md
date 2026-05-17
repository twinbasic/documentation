# PDF Book Build — Plan

Currently `book.bat` produces a ~1500-page PDF that is a flat concatenation of every reference page. It works, but it doesn't read like a book — no front matter, no parts, no global TOC, every chapter is `<h1>`, and "See Also" cross-references point at standalone `file://` URLs rather than jumping within the PDF.

This file is the staged plan for turning that output into an actual book. Phases are independent; each one ends in a verifiable rendered artefact and is a reasonable commit boundary.

## Pipeline recap

From `docs/`:

```
bundle exec jekyll build            # produces _site/, _site-offline/, _site-pdf/
npx pagedjs-cli _site-pdf/book.html -o _pdf/book.pdf --outline-tags h1,h2,h3,h4 -t 600000
```

or `build.bat` then `book.bat`. One Jekyll invocation produces three trees in parallel: `_site/` is the online site, `_site-offline/` is the file://-browsable mirror produced by `_plugins/offlinify.rb`, and `_site-pdf/` is the sparse pagedjs source produced by `_plugins/pdfify.rb` — just `book.html`, the two stylesheets the book layout links, and the images `book.html` references. Render time: jekyll ~24 s (was ~7 s before sub-page nesting et al., the heavy work is now in plugins), then pagedjs-cli ~2 min for the full book. Iterate CSS by refreshing `_site-pdf/book.html` directly in a browser (no pagedjs needed) and only re-run pagedjs to confirm pagination.

Touch points and what each one already exposes:

- [docs/book.html](docs/book.html) — iterator that concatenates every chapter into one HTML document. Permalink `/book.html`, layout `book-combined`. Contains: whitespace-pattern primitives (p1..p4, indent variants) for the pagedjs whitespace fix; the Roman numerals array; the title-page section (1.3); the front-matter loop (1.7) that emits `site.data.book.front_matter` entries inline between the title page and Part I; the per-part loop. Each part can be **flat** (a single `chapters` list gathered from `page:` / `prefixes:`) or **chaptered** (1.9; a `foreword_page:` plus a nested `chapters:` list, each with its own divider page). Per-chapter body rendering — whitespace fix, heading depth shift, sub-page detection, id uniqueness, header-string emission — is factored out into `_includes/book-chapter-body.html` so all three call sites (front-matter, flat part, chaptered part) share one implementation. Insertion points for new front matter go **after** the title-page section and **before** the `{%- for part in site.data.book.parts -%}` opener.
- [docs/_includes/book-chapter-body.html](docs/_includes/book-chapter-body.html) — per-chapter body processing, called via `{% include book-chapter-body.html chapter=... %}` from each of book.html's chapter-loop callers. Handles markdownify, the pagedjs whitespace fix (consumes the `p1..p4` patterns from the outer scope), heading depth shift (1.5a + sub-page 1.6b), sub-page detection (1.6a, opt-out via `skip_sub_page_detection`), heading-id uniqueness (1.5b), compound running header (1.6c), and emits the final `<article>` block. Take-it-or-leave-it parameters cover the cases that don't fit the default: `article_class_override` (front-matter and part-foreword), `chapter_anchor_override` (root URL `/` fallback to `ch-introduction`), `skip_sub_page_detection` (front-matter entries don't share an index hierarchy with following chapters).
- [docs/_layouts/book-combined.html](docs/_layouts/book-combined.html) — minimal wrapper: `<html><head>` + `<title>{{ site.title }}</title>` + `rouge.css` + `print.css` + `{{ content }}`. No nav, no JS, no chrome. Pagedjs runs on the rendered output of this layout. The only layout the PDF pipeline uses; the older per-source-page `book` layout was retired alongside `_config-pdf.yml`.
- [docs/assets/css/print.css](docs/assets/css/print.css) — the book's design. Existing structural rules: `@page` (A4, 22mm margins, running header in `@top-right` via `string(chapter-title)`, page number in `@bottom-right`); `@page :first` (suppresses both — used by the title page); `@page divider` (suppresses both, used by part dividers via `page: divider`); `@page front-matter` (suppresses both, used by `article.front-matter` for 1.7 Introduction-style sections); `@page part-foreword` + `@page chapter-divider` (suppresses both, used by the 1.9 part foreword and per-chapter title pages); `article { break-before: page }`; per-chapter `string-set: chapter-title` on `article.page > .header-string`; the top-level vs sub-chapter heading-size split (`article.page:not(.sub-chapter) > h2:first-of-type` vs `article.page.sub-chapter > h3:first-of-type`); chapter-divider H2 typography (`article.chapter-divider h2` — 24pt centered, no border) plus its subtitle (`.chapter-subtitle` — 13pt italic).
- [docs/_data/book.yml](docs/_data/book.yml) — the manifest book.html iterates over. Schema: `parts:` is an ordered list of numbered parts. A flat part has `{ title, subtitle, prefixes }` or `{ title, subtitle, page }`. A **chaptered** part (1.9) has `{ title, subtitle, foreword_page, chapters }`, where `chapters` is an ordered list of per-chapter entries `{ title, subtitle, landing_page, prefixes }`; each chapter emits a full-page `<article class="chapter-divider">` title page followed by its landing page (with the source H1 stripped by the plugin) and the prefix-matched content in URL order. `front_matter:` is a sibling list of front-matter sections (1.7), same per-entry shape as a flat part. `prefixes:` is a list of URL substrings matched via `contains` (multiple prefixes can map to one Part / chapter — used for the Reference Section in 1.8 and for the VBA chapter's landing at `/tB/Packages/VBA` + members under `/tB/Modules/...`); `page:` is a single exact-URL match. Available in Liquid as `site.data.book.parts` and `site.data.book.front_matter`.
- [docs/_data/build.yml](#) — **not committed**. Build provenance lives in `site.data.build` (populated in memory by the plugin), so the YAML file is never written. The fields exposed are `site.data.build.commit` (short hash) and `site.data.build.commit_date` (ISO date, `%cs`), or `'unknown'` when git is unavailable.
- [docs/_config.yml](docs/_config.yml) — the regular-site config. Reads `site.title` ("twinBASIC Documentation") and `site.footer_content` (the canonical copyright string, reused by the title page and colophon). Also exposes the two combined-build toggles the post-write plugins consult: `also_build_offline: true` (offlinify) and `also_build_pdf: true` (pdfify). Both default to true in the committed config; flip either to `false` to skip that output without touching `_site/`.
- [docs/_plugins/build-info.rb](docs/_plugins/build-info.rb) — captures `git rev-parse --short HEAD` and `git log -1 --format=%cs` into `site.data['build']` on `:site, :post_read`. Falls back to `'unknown'` placeholders when git isn't on PATH.
- [docs/_plugins/build-phase-timing.rb](docs/_plugins/build-phase-timing.rb) — the cleanest hook-pattern example to copy when writing a new `_plugins/` file (uses every `:site, :hook` boundary).
- [docs/_plugins/offlinify.rb](docs/_plugins/offlinify.rb) — the offline-site link rewriter; reference example for build-time concerns tightly coupled to Jekyll's URL model. Runs on `:site, :post_write` when `also_build_offline: true`.
- [docs/_plugins/pdfify.rb](docs/_plugins/pdfify.rb) — emits the sparse `_site-pdf/` tree that pagedjs-cli consumes. Reads `<site.dest>/book.html`, copies it verbatim alongside `assets/css/print.css` + `assets/css/rouge.css` + every relative `<img src=>` target into `<site.dest>-pdf/`. Runs on `:site, :post_write` when `also_build_pdf: true`; retires the older `_config-pdf.yml` second-Jekyll-pass approach.
- [docs/_plugins/book-href-rewrite.rb](docs/_plugins/book-href-rewrite.rb) — post-render Ruby pass for Phase 2.2 cross-references **plus** the 1.9 landing-page H1 strip. Walks each `<article id="ch-...">` chapter body in the rendered `book.html`, resolves relative-path hrefs against the chapter's URL parent via `URI.merge` (RFC-3986 path normalization from the standard library — no manual `../` folding), and rewrites in-book absolute URLs to `#ch-...` anchors using a `Hash` map built from `_data/book.yml` + `site.pages`. The manifest iteration (`book_entries`) covers `front_matter:`, each part's optional `foreword_page:`, flat parts directly, and each chapter inside a chaptered part. The URL → anchor map symmetrizes the trailing-slash form for folder-style indexes **and** the `.html` suffix. For articles whose anchor matches a chapter `landing_page:`, the plugin strips the first `<h2>...</h2>` from the body (after Liquid's heading shift) so the chapter-divider's H2 is the chapter's sole outline entry. Out-of-book hrefs emit in their resolved absolute form so they're greppable as `href="/..."` during verification. Hooked into `:pages, :post_render` and filtered to `page.path == "book.html"`; non-book pages incur no cost. Replaces an earlier in-template Liquid implementation (~21 s of render overhead vs ~50 ms here).
- [docs/book.bat](docs/book.bat) — now only the pagedjs render step: checks `_site-pdf\book.html` exists, makes `_pdf\`, then `npx pagedjs-cli _site-pdf\book.html -o _pdf\book.pdf --outline-tags h1,h2,h3,h4 -t 600000`. Run `build.bat` first (or `bundle exec jekyll build`) to populate `_site-pdf/`. Must be run from `cmd.exe`, not PowerShell (see gotchas).

## Build-time tooling policy

**Anything that participates in rendering the book or the online / offline site is handled by Jekyll** — Liquid templates, includes, layouts, data files (`_data/*.yml`), and Ruby plugins under `_plugins/`. The book is a Jekyll output; its build provenance, manifest, cross-references, and page assembly all live in the Jekyll pipeline.

Python scripts are reserved for non-render concerns: one-off content conversion (`scripts/convert_em_dash_separators.py`), repo audits, developer tooling, anything that runs *outside* a Jekyll build. They must never be a prerequisite for `bundle exec jekyll build` or `book.bat` — those commands should remain self-contained.

Concretely for the PDF book:

- Git-derived build info (commit hash, commit date) → Jekyll plugin (`_plugins/build-info.rb`) that populates `site.data.build` on `:site, :post_read`. Not a pre-build Python step writing `_data/build.yml`.
- Chapter manifest → `_data/book.yml` (committed source of truth, hand-edited).
- Title page, colophon, TOC content → Liquid in `book.html` and the layouts.
- Heading rewrites → Liquid (existing approach in `book.html`). Per-chapter, one-shot, fast.
- Cross-reference href rewrites → Jekyll plugin (`_plugins/book-href-rewrite.rb`), running on `:pages, :post_render`. The first cut was inline Liquid; the per-(chapter × permalink) loop burned ~21 s of render even after pre-computing per-permalink search/replace strings and gating each permalink on a common-prefix `contains`, vs ~50 ms in Ruby. Rule of thumb: use Liquid for per-chapter shaping; reach for a plugin when the work is N × M with large N and M.

The carve-out in WIP.md for `_plugins/offlinify.rb` is the same shape: build-time concerns tightly coupled to Jekyll's internal model belong in `_plugins/`, not in an external script.

## Rendering gotchas

Cumulative discoveries from earlier phases. Read before starting a new task — every entry here is something that already burned cycles once.

### Pagedjs / CSS Paged Media

- **`page:` named-page does not apply to the first element of `<body>`.** Pagedjs opens page 1 before processing the first element, so a `section.title-page { page: title }` declaration is silently ignored — page 1 keeps the default `@page` rule's chrome. Use `@page :first { @top-right { content: ""; } @bottom-right { content: ""; } }` to style page-1 chrome instead. Named pages **do** work for any element with `break-before: page` (e.g. `article.part-divider { page: divider }`), since pagedjs has already processed the break and knows the next page's name before opening it.
- **A non-article first element is fine** — `<section class="title-page">` at the start of `<body>` inherits the default `@page` rule cleanly and the `:first` pseudo-class targets it.
- **`article:first-of-type { break-before: avoid }` was a pre-title-page hack.** It prevented a blank page 0 when the first content was the Part I divider. With a title page now sitting on page 1 and the first article (Part I divider) wanting to break to page 2, the rule must be **removed**, not kept — it collides with `section.title-page { break-after: page }` and `article { break-before: page }`.
- **Whitespace inside `<pre>` is fragile across page breaks.** The `book.html` `p1..p4` and `p4i4..p4i16` replacement chains exist to wrap every inter-token text node in `<span class="w">` so pagedjs doesn't drop the whitespace when it splits a code block. New code that emits `<pre>` content should expect this treatment (or render its code through the same Liquid pipeline).
- **Adjacent forced breaks collapse to one.** `section.title-page { break-after: page }` plus the next article's `break-before: page` produces a single page break, not two. No blank-page mitigation needed.

### Jekyll plugin patterns

- **Hook ordering: `:after_reset` is BEFORE READ.** Anything set on `site.data` in `:after_reset` gets overwritten when Jekyll loads `_data/*.yml`. Inject `site.data` keys in `:post_read` (or later) for them to survive. This trapped 1.3.
- **`Open3.capture2` + `Errno::ENOENT` is the right pattern for shell-outs.** See `_plugins/build-info.rb` for the shape — captures exit status, falls back to a sentinel string on `git` not found.
- **Liquid renders raw HTML entities verbatim through `{{ ... }}`.** `site.footer_content` contains `&copy;` and is emitted as-is by `{{ site.footer_content }}` — no `escape` filter needed.
- **`{{ site.data.X.Y | default: 'unknown' }}`** is the cleanest way to read a plugin-populated value: returns the fallback if either the data file or the key is missing, so the template doesn't need nil-guards.
- **`:pages, :post_render` lets you mutate `page.output` in place.** Fires after Liquid + layout have rendered the page but before Jekyll writes it. Cheaper than `:site, :post_write` because there's no re-read from disk and you don't have to track which destination tree to touch. Filter to a specific page with `page.path == "name.html"`; the hook fires for every page otherwise. Used by `_plugins/book-href-rewrite.rb` to rewrite only `book.html` after its chapter-collation Liquid has finished.
- **`URI.merge` does RFC-3986 path normalization in the standard library.** When you need to resolve a relative href like `../X`, `./X`, `.#frag`, or `..` against a base path inside Ruby, wrap the base as `URI("http://x" + base_path)` (dummy scheme + host so the parser is happy), parse the ref as `URI(ref)`, and call `base.merge(ref)`. `merged.path` gives the normalized absolute path; `merged.fragment` peels off the `#...` suffix. Saves writing — and re-debugging — manual `../` folding plus the bare-dot edge cases.
- **Jekyll's default permalink for pages without explicit `permalink:` frontmatter ends in `.html`.** A file at `Features/Compiler-IDE/CodeLens.md` with no permalink renders at `/Features/Compiler-IDE/CodeLens.html`; the same file with `permalink: /Features/Compiler-IDE/CodeLens` renders at the cleaner URL. Source markdown is inconsistent about which form it writes in links (`[CodeLens](CodeLens)` vs `[CodeLens](CodeLens.html)`), and only one matches in any given case. The live site smooths over the mismatch with server config; the PDF build does not. Symmetrize both forms in any URL → anchor map (see `_plugins/book-href-rewrite.rb`'s 1.7 changes) so either form resolves.

### Build environment

- **PowerShell cannot invoke `npx` directly.** Default execution policy blocks `npx.ps1`. `book.bat` (and any future script that wraps `npx pagedjs-cli`) must be run from `cmd.exe`. When invoking through Bash, use `cmd.exe //c ".\\book.bat"` to spawn a cmd subshell.
- **`bundle exec jekyll build` is ~5 seconds; `pagedjs-cli` is ~2 minutes** (1500-page render). Iterate CSS by refreshing `_site-pdf/book.html` directly in a browser — it has the same `print.css` linked, so layout looks identical to the PDF without paying the pagedjs render. Only re-run pagedjs to confirm pagination boundaries (page breaks, running headers, outline entries).

## Phase 1 — Structural framing

Goal: cover → colophon → Part I divider → Part I chapters → Part II divider → … reads like a book's table of contents shape even before a real TOC exists.

### 1.1 Schema upgrade for `_data/book.yml`

Replace the flat `sections:` list with `parts:`. Each part has:

- `title` — e.g. "The VBRUN Package".
- `subtitle` — optional, e.g. "Runtime types for controls, errors, and the property bag".
- `prefixes` — URL prefixes that contribute chapters, equivalent to today's `sections` entries.
- `intro` — optional Markdown blob used on the divider page. Defaults to the first paragraph of the package's `index.md`.

Sketch:

```yaml
parts:
  - title: "The Core Language"
    subtitle: "Statements, operators, and built-in keywords"
    prefixes: [/tB/Core/]
  - title: "The VBA Runtime"
    subtitle: "Standard runtime modules — Strings, Math, FileSystem, …"
    prefixes: [/tB/Modules/]
  - title: "The VBRUN Package"
    prefixes: [/tB/Packages/VBRUN/]
  …
```

13 parts total, one per package (Core, VBA, VBRUN, VB, WebView2, Assert, CustomControls, CEF, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls). The intro paragraph for each is sourced from the package's existing `index.md`.

### 1.2 Part divider pages

Emit, before each part's chapters, an `<article class="part-divider">` block:

```html
<article class="part-divider">
  <p class="part-number">Part {{ part_index_roman }}</p>
  <h1>{{ part.title }}</h1>
  <p class="part-subtitle">{{ part.subtitle }}</p>
  <div class="part-intro">{{ part.intro | markdownify }}</div>
</article>
```

CSS in print.css:

- `break-before: page`, `break-after: page` on `.part-divider`.
- Center vertically, large display type for `h1`, italic subtitle.
- Suppress the running header on divider pages (`@page :first` rule keyed off a CSS string).

### 1.3 Title page

Front-matter page 1. A single `<section class="title-page">` with:

- The book title — "twinBASIC Documentation".
- A subtitle line — "Reference Manual & Tutorials".
- The build date and short commit hash. Build date comes from `site.time` (Jekyll's build timestamp). Git provenance is captured by a small Jekyll plugin (`_plugins/build-info.rb`) into `site.data.build` on the `:site, :after_reset` hook, exposing `site.data.build.commit` and `site.data.build.commit_date`. The plugin falls back to `'unknown'` placeholders when git isn't available so the template renders cleanly without conditional gymnastics on a missing data file.
- Copyright/attribution line. Sourced from `site.footer_content` in `_config.yml` so the title page and the regular-site footer stay in lock-step.

CSS: extend `@page :first` to blank both `@top-right` (running header) and `@bottom-right` (page number) — traditional title-page convention. A named `@page title` does **not** work on the first element of `<body>` (see the pagedjs gotchas), so `:first` is the right hook. `section.title-page { break-after: page; }` pushes the first part divider onto page 2. The previously-needed `article:first-of-type { break-before: avoid; }` rule is removed in this phase: the title page is now the first content in the document, and the first article (part divider) wants the default forced break.

Image (logo) optional — `docs/favicon.png` exists but is small. A larger source asset would be nice but is not blocking.

Build-time scripting: capturing git info via a Jekyll plugin (rather than a Python pre-build script that writes a YAML data file) is the rule for *anything that participates in the render*, online or PDF — see "Build-time tooling policy" below.

### 1.4 Colophon page

Front-matter page 2. Pulls together:

- Site copyright — sourced from `site.footer_content` in `_config.yml` (same source the title page uses).
- The CC-BY-4.0 attribution that VBA-derived pages currently emit via `_includes/footer_custom.html`'s `vba_attribution` branch (the License/Code license/Attribution line with links to the VBA-Docs repo). Promote that exact text to a single book-wide notice in the colophon — no per-chapter footer in the PDF.
- Build provenance — Jekyll version, pagedjs-cli version, the `commit-hash@date` from 1.3 (`site.data.build.commit` + `site.data.build.commit_date`). Jekyll version is available as `jekyll.version`; pagedjs-cli version isn't exposed to Liquid, hard-code or extend `_plugins/build-info.rb` to capture it from `package-lock.json`.

CSS: emit as `<section class="colophon">` (same shape as `section.title-page`) so it inherits the no-break-before behaviour and lands on page 2 directly after the title page. Suppress page-2 chrome via `@page :nth(2)` if pagedjs supports it; otherwise emit a hidden marker on the section and target it via a named page reachable from a `break-before: page`-bearing parent (see the pagedjs gotcha — first-element page naming is silent).

### 1.5 Heading hierarchy shift + heading-id uniqueness

This phase has two coupled responsibilities; both work on the same Liquid pass over chapter content. Folding them together avoids walking the same body string twice.

#### 1.5a Heading depth shift

Today every chapter's first heading is `<h1>` because each source page's `# Title` becomes a top-level heading. In a book this should be `<h2>` so the Part divider's `<h1>` is the only H1 per part.

Mechanism: a Liquid pass in book.html that downgrades headings inside each chapter body:

```liquid
{%- assign body = body
    | replace: '<h6', '<h7-stub'
    | replace: '<h5', '<h6'
    | replace: '<h4', '<h5'
    | replace: '<h3', '<h4'
    | replace: '<h2', '<h3'
    | replace: '<h1', '<h2'
    | replace: '</h6>', '</h7-stub-end>'
    | replace: '</h5>', '</h6>'
    …
-%}
```

`h6` becomes a placeholder tag because there's no `h7`; the placeholder gets styled like `h6` would have been, or simply stripped. Verify which kramdown depths actually appear before deciding — most reference pages stop at `### Subsection`.

#### 1.5b Heading-id uniqueness (fixes outline-bookmark collapse)

kramdown auto-generates heading ids from heading text via a slugify rule. Every chapter has `id="see-also"`, `id="example"`, and other names that recur across chapters. Two consequences:

- The PDF outline produced by `pagedjs-cli --outline-tags h1,h2,h3` references heading ids; multiple identical ids collapse to the first occurrence in document order, so every "See Also" bookmark jumps to chapter 1's See Also rather than the chapter the reader was browsing.
- Phase 2's cross-reference rewriting needs unique anchors per heading anyway — doing it once, here, sets that up.

Fix: rewrite every `id="..."` in chapter content to `id="ch-<chapter-anchor>-<original-id>"`, where `<chapter-anchor>` is derived from the chapter's permalink (e.g. `tB-Packages-VBRUN-DataObject-SetData`). The first heading of each chapter (now `<h2>` after 1.5a) carries the chapter-level anchor `id="ch-<chapter-anchor>"` by convention — strip the redundant `-<original-id>` suffix for the first heading only.

Intra-chapter local links must be rewritten in lock-step. Patterns like `[**Count**](#count)` inside the same chapter render as `<a href="#count">`; after the rewrite, `#count` collides with whatever happens to be Chapter 1's count anchor. Solution: as part of the same Liquid pass, prefix every `href="#..."` in the chapter body the same way — `href="#ch-<chapter-anchor>-count"`.

Both rewrites are mechanical text substitutions over the chapter body string, no parsing required.

#### print.css updates

- `string-set: chapter-title content()` moves from `h1:first-of-type` to `h2:first-of-type`.
- `break-before: page` already lives on `article` (moved there in 1.2) — no change.
- The "first chapter of a part" rule needs `break-before: avoid` on `article.page:first-of-type > h2:first-of-type` once chapter headings are h2.

### Verification

- Render the PDF. Page 1 is the title page, page 2 is the colophon, page 3 is the global TOC opener, then "Part I: The Core Language" divider, then Core chapters starting with AddressOf operator. Running header on chapter pages shows the chapter title; absent on divider pages and the title/colophon pages.
- Open the PDF outline. Parts are H1-level entries; chapters are nested H2-level under their part; sub-sections nested H3-level under their chapter. No duplicate "See Also" entries collapsing to one destination.
- Click the second "See Also" bookmark in the outline; confirm it jumps to the chapter that owns it, not chapter 1's See Also.
- Click an intra-chapter link (e.g. inside the AddressOf operator page, the body links to `#count` for a `Count` member); confirm the jump lands in the same chapter, not a different chapter's `Count`.

### Outline-width tradeoff

`--outline-tags h1,h2,h3` over 13 parts × 698 chapters × ~3 subsections each gives an outline of roughly 2700 entries. Acceptable in PDF readers but the sidebar is busy. If the user finds it overwhelming once unique ids are in place, switch the CLI flag to `--outline-tags h1,h2` to bookmark only parts and chapter titles. That's a single-flag tweak in `book.bat`, reversible per-render.

### 1.6 Sub-page nesting under index chapters

When a folder has an `index.md` plus sibling `.md` files (e.g. `Reference/VBA/Collection/index.md` plus `Add.md`, `Clear.md`, `Count.md`, `Item.md`, …), the siblings are sub-pages of the index. In the rendered book they should:

- Nest under their index in the PDF outline so the bookmark sidebar shows Collection → Add / Clear / Count, not Collection and Add at the same level.
- Carry a compound running header — `Collection.Add` when the parent index is a class, `Compilation - CompilerVersion` when the parent index is a module.

This phase pulls naturally from the heading-shift machinery already in 1.5 and shares the per-chapter iteration loop in book.html.

#### 1.6a Sub-page detection

In book.html's chapter loop, track the most recent index URL seen during iteration. A chapter is a sub-page when both:

1. Its URL doesn't end in `/`.
2. Its URL starts with the most recent index URL (i.e., they live in the same folder).

Index pages always sort before their sub-pages under ASCII order (`Foo/` < `Foo/Bar`), so a simple state machine over the sorted iteration works in one pass. Per-chapter state:

```liquid
{%- assign last_char = chapter.url | slice: -1, 1 -%}
{%- if last_char == '/' -%}
  {%- assign current_index_url = chapter.url -%}
  {%- assign is_sub_page = false -%}
{%- else -%}
  {%- assign sized_prefix = chapter.url | slice: 0, current_index_url.size -%}
  {%- if current_index_url != '' and sized_prefix == current_index_url -%}
    {%- assign is_sub_page = true -%}
  {%- else -%}
    {%- assign current_index_url = '' -%}
    {%- assign is_sub_page = false -%}
  {%- endif -%}
{%- endif -%}
```

#### 1.6b Outline nesting via extra heading shift

Sub-pages get an additional `+1` heading depth on top of the existing 1.5a `+1` shift, so a sub-page's source `# Title` (h1) ends up as `<h3>` instead of `<h2>`, and its sections cascade down accordingly.

Implementation: a conditional second pass on the body when `is_sub_page` is true. The pass mirrors 1.5a but each rule shifts one extra level (e.g., `<h2` → `<h4`, `<h3` → `<h5`). After the cascade:

| Source depth | Top-level chapter | Sub-page chapter |
|--------------|-------------------|------------------|
| `#` (h1)     | h2                | h3               |
| `##` (h2)    | h3                | h4               |
| `###` (h3)   | h4                | h5               |
| `####` (h4)  | h5                | h6               |

Real content stops at `####`, so we don't need `h7-stub`/`h8-stub` for sub-pages in practice.

With `--outline-tags h1,h2,h3,h4` on `pagedjs-cli` (extended from the current `h1,h2,h3`), sub-pages appear as nested h3 outline entries directly under their parent index's h2 entry.

#### 1.6c Compound running headers

Sub-pages need a compound running header. The simple-header approach used today (`string-set: chapter-title content()` on the chapter title h2) doesn't compose, so we need a separate string source.

Determine the parent kind and name from the sub-page's `parent:` frontmatter, which by project convention reads `<Name> class`, `<Name> Module`, or `<Name> module`:

- `parent: Collection class` → kind = class, name = `Collection`, separator = `.`.
- `parent: Interaction Module` → kind = module, name = `Interaction`, separator = ` - `.
- Anything else → no compound; emit just the sub-page title (defensive fallback for unexpected frontmatter).

Emit the compound string in a hidden span immediately inside the sub-page article, before the visible chapter heading:

```html
<article class="page sub-chapter" id="ch-...">
  <span class="header-string">Collection.Add</span>
  <h3>Add</h3>
  ...
</article>
```

The hidden span is the string-set source. CSS:

```css
article.page.sub-chapter .header-string {
  string-set: chapter-title content();
  position: absolute;
  font-size: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}
```

Pin the existing `article.page > h2:first-of-type { string-set: chapter-title content(); }` rule to non-sub-chapter articles by tightening the selector to `article.page:not(.sub-chapter) > h2:first-of-type` so the two string-set sources don't fight.

The visible chapter heading inside the sub-page still reads just `Add` — the parent name is in the running header only.

#### 1.6d Visual styling for sub-page chapter titles

Sub-page chapter title (now `<h3>`) should still look like a chapter title (big, no border) but slightly smaller than a top-level chapter title (h2) to signal hierarchy:

- Top-level chapter (`article.page:not(.sub-chapter) > h2:first-of-type`): 24pt, bold, no border. Existing rule.
- Sub-chapter (`article.page.sub-chapter > h3:first-of-type`): 20pt, bold, no border. New rule, overrides the in-chapter `article.page h3` 18pt-with-border styling.

Internal sub-page section headings (h4 and below) inherit the existing in-chapter heading rules — no change needed.

#### Verification

- Open the rendered PDF outline. Inside "VBA Runtime" (Part II) → "Collection class", confirm nested entries Add, Clear, Count, Item, Items, Keys, Remove.
- Inside "VBRUN Package" → "Compilation module", confirm nested entries CompilerVersion, BuildConfiguration, … under it.
- Click "Add" in the outline — jumps to its sub-page.
- On the Add sub-page, the running header at the top-right reads `Collection.Add`.
- On a `Compilation/CompilerVersion` sub-page, the running header reads `Compilation - CompilerVersion`.
- The visible chapter heading inside the sub-page article still reads just `Add` (or `CompilerVersion`) — the parent isn't repeated visually.
- Cross-references from other chapters' See Also lists still resolve correctly (heading-id uniqueness from 1.5 stays intact, and the additional shift in 1.6b doesn't change the `id="ch-..."` prefix scheme).

#### Tradeoffs / open questions

- **Sub-page detection relies on an index.md being present.** If a folder has sibling `.md` files but no `index.md`, those siblings won't be detected as sub-pages — they'll inherit the previous unrelated index in iteration order, then either match it by URL prefix (wrong) or fall through to standalone (acceptable). Audit during implementation: list folders under `docs/Reference/` that have multiple `.md` siblings and no `index.md`.
- **`parent:` frontmatter is the source of truth for class/module distinction.** This is already a project convention enforced across the docs; the WIP.md style guide describes it. If any sub-page is missing `parent:`, the running header falls back to just the sub-title — flag during verification.
- **Outline tag list grows to `h1,h2,h3,h4`.** Combined with `h7-stub` (which is excluded), the outline gets one extra level. Total entries climb from ~2700 to ~3500. Still acceptable; the `h1,h2` narrow-outline fallback noted in 1.5 is also available if needed.
- **Deeper nesting (sub-sub-pages).** As of 1.7, three-deep folder structures exist (`Features/index.md` → `Features/Compiler-IDE/index.md` → `Features/Compiler-IDE/CodeLens.md`). The single-slot state machine handles them by treating each subfolder's `index.md` as a fresh top-level chapter within the part, with its leaves as direct sub-pages of that subfolder index. The compound running header therefore shows only the closest two levels ("Compiler-IDE - CodeLens"), not the full part path ("Features > Compiler-IDE > CodeLens"). Acceptable; a true stack-based state machine would be needed to recover the full path, and the part divider gives the reader the missing top-level context.

### 1.7 Beyond Reference: front matter and supplementary parts

The book.yml shipped with Phase 1.1 only listed the 13 Reference parts. The book also needs the Welcome page (renamed `Introduction` in the book), Features, FAQ, and Tutorials. Order: title page → Introduction (front matter) → Part I Features → Part II Frequently Asked Questions → Part III Tutorials → Parts IV–XVI Reference (Core, VBA Runtime, VBRUN, VB, WebView2, Assert, CustomControls, CEF, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls).

#### Schema extension

`_data/book.yml` gained two pieces:

- A top-level `front_matter:` list, sibling to `parts:`. Each entry emits its chapter(s) inline between the title page and Part I — no divider, no part number, no running header (CSS suppresses the chrome via `.front-matter` styling). Per-chapter rendering is identical to a part chapter otherwise.
- A `page:` field on entries, alternative to `prefixes:`. `page:` is a single absolute URL with exact-match semantics, used when a section is exactly one page (the FAQ; the root index for the Introduction). `prefixes:` keeps its existing starts-with-match semantics for folder-based sections.

#### Chapter anchor fallback

The root URL `/` collapses to an empty path under the default `gsub('/', '-').strip-dashes` derivation, leaving a `ch-` anchor that's just `ch-`. Both the Liquid pass in `book.html` and the plugin use the front-matter entry's `title:` (slugified) as a fallback seed when the URL-based seed is empty, so the Introduction lands at `ch-introduction` instead of `ch-`. The two callers compute the same fallback independently so the link map and the article id stay aligned.

#### `.html` suffix symmetrization

Pages without explicit `permalink:` frontmatter render at `/X.html`, while pages with an explicit permalink usually live at `/X` (no extension). Source markdown is inconsistent about which form it writes in cross-references. The plugin now adds both forms to the URL → anchor map (mirroring the trailing-slash symmetrization that already covered folder-style indexes), so a link to `/Features/Compiler-IDE/CodeLens` and `/Features/Compiler-IDE/CodeLens.html` both resolve.

#### Front-matter CSS

`article.front-matter { page: front-matter; break-before: page; }` plus `@page front-matter { @top-right { content: ""; } }` suppresses the running header on Introduction pages, matching the title-page chrome convention. The named-page selector works here because the article has `break-before: page` (per the pagedjs gotcha that first-of-body never gets a named page applied; front matter is never the first element thanks to the preceding `section.title-page`).

#### Known limitations

- The chapter body's H1 (`# Welcome to twinBASIC`) is not rewritten to `# Introduction`; the rename lives only in the section metadata (`book.yml`'s `title:` and the chapter anchor). The PDF outline therefore still reads "Welcome to twinBASIC" for the Introduction chapter. Rewriting body H1 across the Liquid + plugin boundary is fiddly; deferred until there's a clear demand for it.
- Three-level nesting (Features → Compiler-IDE → CodeLens) is handled by sub-page detection, but the compound running header only shows the closest two levels — see the 1.6 tradeoff bullet above.
- A handful of Features pages (CodeLens.md, others) lack explicit `permalink:` frontmatter and end up at `/X.html`; the plugin's `.html` symmetrization smooths over the cross-reference mismatch in the book, but the live-site URLs themselves stay inconsistent.

#### Verification

- The rendered PDF has 16 numbered parts in the right order, with an unnumbered Introduction front-matter chapter before Part I.
- In-book cross-references in the new sections resolve: `[FAQ]` from the Introduction → `#ch-FAQ`; `[Arrays]` → `#ch-Tutorials-Arrays`; deep links like `#ch-Features-Language-Data-Types-longlong` work.
- The Features part covers ~57 chapters; Tutorials ~22; FAQ exactly one; Introduction exactly one. Total chapter rewrites: 6181 (up from 5812 with Reference only). PDF page count: 1714 (up from 1535). Build wall stays at ~6 s — the plugin scales with chapter count, not chapter-count squared.

### 1.8 Catching up with the live nav: Reference Section + Packages move

The live site reorganised its top-level nav: `Packages` was promoted out of `Reference Section` and now sits as its own top-level item. Side effects:

- A new `VBA` package landing page was added at `/tB/Packages/VBA`. VBA module members keep their legacy `/tB/Modules/...` URLs, so VBA content now lives at two different URL prefixes.
- `Reference Section` (top-level, permalink `/Reference`) now groups eight alphabetical-index / lookup pages — `Categories`, `Statements`, `Procedures and Functions`, `Operators`, `Compiler Constants`, `Attributes`, `Controls`, and `Glossary` — that previously weren't in the book.

Book changes (committed in `_data/book.yml`):

- **The VBA Runtime** gains a second prefix `/tB/Packages/VBA` so the new landing page emits alongside the module members. The two prefixes can both belong to one Part because the chapter loop's `contains`-match accepts a list and de-duplicates by `sort | uniq` implicitly (each URL appears at most once in `site.pages`).
- **New `Reference Section` Part inserted between `The Core Language` and `The VBA Runtime`**. Prefixes: `/Reference` (catches the landing and the five `/Reference/<X>` lookup pages), `/tB/Controls`, `/tB/Gloss` (catch the two outliers that live under `/tB/` rather than `/Reference/`). `Attributes` is the only Reference-Section item not pulled in here: its permalink is `/tB/Core/Attributes`, which the existing `The Core Language` part already sweeps up via `/tB/Core/`. Moving it would require an `excludes:` schema for one page — left in Core for now, accepted as a small live-nav-vs-book inconsistency.
- The structural choice was to **keep the 13 separate per-package Parts** rather than collapse them into a single mega-`Packages` Part. The new top-level "Packages" nav grouping is therefore not visible as a Part boundary in the book; readers see VBA Runtime, VBRUN, VB, WebView2, … as siblings of the Reference Section Part. If a single Packages Part is wanted later, the change is mechanical (consolidate prefixes; let sub-page detection nest each package's landing as a top-level chapter).

#### Verification

- The book now has 17 numbered parts (was 16): Features, FAQ, Tutorials, Core, **Reference Section**, VBA Runtime, VBRUN, VB, WebView2, Assert, CustomControls, CEF, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls.
- Reference Section has 8 chapters: `Reference` landing + `Categories` + `Compiler Constants` + `Operators` + `Procedures and Functions` + `Statements` + `Controls` + `Glossary`.
- VBA Runtime now includes `ch-tB-Packages-VBA` (the landing page) alongside the module members.
- All `href="/tB/Gloss#..."` links from across the book (Core, Modules, Packages) now resolve to in-book `#ch-tB-Gloss-<term>` anchors. Total chapter cross-reference rewrites: **6918** (up from 6181, +737, almost all from Glossary anchors that previously left as broken absolute URLs). PDF page count: **1776** (up from 1714).
- Remaining out-of-book absolute links are all legitimate (pages under `/tB/IDE/...` that aren't manifest entries; the `/tB/Packages/` landing page itself, which has no in-book counterpart given the choice to keep packages as separate Parts).

### 1.9 Packages as chapters with full-page title pages

The 1.8 decision to keep 13 separate per-package Parts proved short-lived once the page count crossed 1700 — readers wanted Packages to behave like a single book section, not as a parade of equal-weight Parts. 1.9 collapses the 12 package Parts into one chaptered "Packages" Part, with each package promoted to a chapter (full-page title page) inside it and the `/tB/Packages/` landing recast as the part's foreword.

#### Schema extension

A part now has two shapes:

- **Flat part** (existing) — `prefixes:` / `page:` directly on the part. The chapter loop gathers and emits in URL order. Used by Features, FAQ, Tutorials, Core, Reference Section.
- **Chaptered part** (new) — `foreword_page:` and a nested `chapters:` list. Each chapter has its own `{ title, subtitle, landing_page, prefixes }`. The part divider opens the section, the foreword page emits as `<article class="part-foreword">` (no running header), and then for each chapter entry the iterator emits a `<article class="chapter-divider">` full-page title page followed by the chapter's landing page and prefix-matched content.

#### Rendering pipeline

Per-chapter body processing was pulled out of `book.html` into `_includes/book-chapter-body.html` so the three call sites — the 1.7 front-matter loop, the flat part chapter loop, and the new chaptered part chapter loop — share one implementation. The include takes the chapter via `include.chapter` and a small handful of overrides (`article_class_override`, `chapter_anchor_override`, `skip_sub_page_detection`); the state-machine variables (`current_index_url`, `current_index_kind`, `current_index_name`) live in the caller and the include reads/mutates them in place. The sub-page state machine is reset between each chapter of a chaptered part so each package's class / module folders nest only against their own siblings.

The chapter divider's content is generated directly in `book.html`, not from a source file — `<article class="chapter-divider" id="chd-<landing-anchor>"><h2 id="chd-<landing-anchor>-title">...</h2>` with the chapter `title` as an H2 and the optional `subtitle` as a `.chapter-subtitle` paragraph. The article id uses the `chd-` prefix (separate from the `ch-` namespace) so the plugin's `<article id="ch-...">` regex doesn't mistakenly process the divider; the inner `<h2>` carries its own `chd-...-title` id so the PDF outline entry produced by `pagedjs-cli --outline-tags h1,h2,h3,h4` has a valid anchor to jump to. Without an id on the H2 every chapter-divider bookmark collapsed to page 1 -- pagedjs falls back to the document start when an outlinable element has no anchor.

#### Extra heading shift for chaptered-part chapters

Every chapter inside a chaptered part receives a third +1 heading depth shift on top of the standard 1.5a shift (and the 1.6b sub-page shift, when applicable). Without this the class / module indexes (a chapter's "top-level" content pages, e.g. `/tB/Packages/VBRUN/AmbientProperties/`) end up at the same outline depth as the chapter divider itself: source-H1 → 1.5a H2 → outline depth 2, identical to the chapter-divider H2. The extra shift demotes those indexes to H3 (outline depth 3, nested below the chapter divider) and their member sub-pages to H4 (outline depth 4) so the outline reads Packages → VBRUN Package → AmbientProperties class → BackColor rather than Packages → VBRUN Package & AmbientProperties class & BackColor & ... all flat.

The include exposes this as an `extra_heading_shift` parameter and the chaptered-loop call site in `book.html` passes `extra_heading_shift=true`. Chapters in flat parts (Features, FAQ, Tutorials, Core, Reference Section) and front-matter entries continue to use the 1.5a-only shift since they have no chapter divider to nest beneath. Chaptered chapters also pick up an `article.page.chaptered` modifier class so `print.css` can target their now-deeper title and section headings (`article.page.chaptered:not(.sub-chapter) > h3:first-of-type` is the new "big bold chapter title" selector, mirroring the flat-part `> h2:first-of-type` rule one level deeper).

#### Landing-page H1 strip

The chapter divider's H2 ("VBA Package") and the chapter landing page's source H1 ("VBA Package") would otherwise emit as two outline entries with the same text. The plugin (`_plugins/book-href-rewrite.rb`) strips the first heading-of-title-level from any article whose anchor matches a chapter's `landing_page:`. Because every chaptered chapter now receives the extra heading shift, the source H1 arrives at the post-render HTML as `<h3>` (1.5a + 1.9 = +2 levels), so the plugin's `FIRST_LANDING_HEADING_REGEX` matches `<h3>` rather than `<h2>`. The strip runs after the Liquid heading shifts, before the href rewrite pass; the landing page's body then opens directly with its second-level content, and the chapter divider's H2 is the chapter's sole H2-level outline entry.

#### Foreword

`foreword_page` points at the part's intro URL — for Packages this is `/tB/Packages/`, the existing landing that lists the default and built-in packages with one-line descriptors. The foreword emits as `<article class="part-foreword">` between the part divider and the first chapter divider; CSS pins it to a named `part-foreword` page with the running header suppressed. The foreword's anchor is the same URL-derived anchor as any other chapter (`ch-tB-Packages` in this case), so cross-references like `[Packages](/tB/Packages/)` from elsewhere in the book resolve to `#ch-tB-Packages` and land on the foreword.

#### Verification

- The book now has **6 numbered parts** (down from 17): Features, FAQ, Tutorials, Core, Reference Section, Packages.
- The Packages part contains **one foreword article** (`ch-tB-Packages`) and **12 chapter dividers** (`chd-tB-Packages-VBA`, ..., `chd-tB-Packages-WinNativeCommonCtls`), one per package, in book.yml order.
- The plugin reports **stripped 12 landing H3s** on every build (one per chaptered chapter); each package's landing article body opens with its first non-title content.
- The PDF outline tree reads `Packages → VBRUN Package → AmbientProperties class → BackColor`, with each level nested one outline depth below its parent (depths 1 → 2 → 3 → 4). Pre-extra-shift the class index and its members both lived at depth 2, side-by-side with the chapter divider.
- Clicking the "VBRUN Package" bookmark in the PDF outline jumps to the chapter-divider page (page 47, 89, or wherever VBRUN's divider lands), not page 1 — the `chd-tB-Packages-VBRUN-title` id on the divider's H2 is the anchor target.
- In-book cross-references resolve **6932** (up from 6918). The `/tB/Packages/` foreword anchor now absorbs the previously-broken `href="/tB/Packages/"` links from elsewhere in the book.
- Build wall stays at ~7 s. PDF page count: **1779** (up from 1776 — the foreword + 12 chapter-divider pages roughly offset the 11 part-divider pages we no longer emit).

#### Tradeoffs / open questions

- **Chapter dividers have a `chd-` id, not `ch-`.** The plugin's article-walking regex matches `ch-` ids only, so chapter dividers are never processed (no href rewrites, no H3 strip needed). That's fine today; if Phase 3's TOC wants to deep-link to chapter dividers it'll need either to consult `chd-` ids directly or to add a parallel anchor namespace.
- **Outline-tag list and depth-5 dropout.** The chaptered extra shift pushes member sub-page section headings (source-H2 inside a sub-page like `BackColor.md`'s `## Example`) to h5, which is outside the current `--outline-tags h1,h2,h3,h4` range and therefore not in the PDF outline. That's a feature — the outline would be unreadable if every sub-page's Example / See Also / Remarks emitted a leaf. Class-index sections (`## Members` inside `AmbientProperties/index.md`) live at h4 and DO appear in the outline; if those become noisy too, narrow the flag to `h1,h2,h3`.
- **Foreword sits at outline depth 2 alongside chapter dividers.** The part-foreword article doesn't receive the extra heading shift, so its source H1 lands at H2 and reads as a peer of the chapter-divider H2s in the outline. Visually that's "Packages (foreword introduction) → VBA Package → VBRUN Package → …" which matches the book structure — the foreword is its own thing within the part, not a chapter under another chapter.
- **Source authoring**: the VBA package's `/tB/Packages/VBA` landing page is special because its members keep their legacy `/tB/Modules/...` URLs. Other packages have their landing and members under one URL tree (`/tB/Packages/<Name>/`). 1.9's `landing_page:` field covers both shapes — VBA points at `/tB/Packages/VBA` and lists `/tB/Modules/` as its prefix; VBRUN points at `/tB/Packages/VBRUN/` and lists the same as its prefix (the landing matches the prefix and the chapter loop filters it out to avoid double emission).

## Phase 2 — In-PDF cross-references

Goal: clicking "[SetData](SetData)" inside a "See Also" jumps to the SetData chapter in the PDF, not to `file://.../tB/Packages/VBRUN/DataObject/SetData.html`.

After 1.5b, every chapter heading already carries a unique `id="ch-<chapter-anchor>-..."` and the chapter-title heading carries the bare `id="ch-<chapter-anchor>"`. Phase 2 is the inverse direction: rewrite the chapter body's outgoing `href`s to point at those ids.

### 2.1 Permalink → anchor map

Build a parallel-arrays map in book.html before the chapter loop: one array of absolute permalinks (`/tB/Packages/VBRUN/DataObject/SetData`), one array of chapter anchors (`ch-tB-Packages-VBRUN-DataObject-SetData`). The map is derived from the same iteration that emits chapters in 1.5, so it's free — no extra pass over `site.pages`.

Liquid lacks dict literals; the lookup is `array | index_of: url` (or `where_exp` for the typed variants). Tractable, just verbose.

**Implementation.** Landed first as a Liquid pre-pass in `book.html` building parallel `book_permalinks` / `book_anchors` arrays, with `where_exp` matching `forloop.index0` for lookup. Iterated through three perf passes — pre-computing per-permalink search/replace strings in the pre-pass (Option A, ~10 s saved), gating each permalink's inner block on a common-prefix `contains` check (Option B, ~6 s more), and finally lifting the entire map into Ruby. It now lives in `_plugins/book-href-rewrite.rb` as a `Hash` built from `_data/book.yml` and `site.pages` inside `:pages, :post_render`. The Liquid scaffolding is gone; `book.html` carries only a pointer comment.

### 2.2 Rewrite chapter-content href attributes

For each chapter body, after markdownify, the inter-span whitespace replacements, and the 1.5 heading rewrites:

- Find `<a href="X">` patterns where `X` doesn't start with `http`, `mailto:`, or `#` (the `#`-anchor rewrite already happened in 1.5 for intra-chapter links).
- Resolve `X` against the chapter's own URL (so `<a href="../VBRUN/Constants">` from a VBA page resolves to `/tB/Packages/VBRUN/Constants`).
- Look up the resolved URL in the permalink → anchor map. On hit, rewrite to `<a href="#ch-...">`. On miss, leave alone (probably broken markdown or a link to a page that didn't make it into the book — flag during verification).

A simpler escape hatch for the relative-resolution step: for each chapter, compute its "URL parent" (everything up to and including the last `/` of its permalink). Prepend that to every `<a href>` that doesn't start with `http`, `mailto`, `#`, or `/`. Then apply the absolute-URL → anchor replacement.

Bracket the work — Phase 2 still has the most "this works on paper but Liquid will hurt" risk because of the relative-path resolution. Heading uniqueness moving to 1.5 takes the riskiest piece (cross-chapter id collision) off Phase 2's plate.

**Implementation.** Both the relative-path resolution and the map lookup live in `_plugins/book-href-rewrite.rb`. The plugin walks each `<article id="ch-...">` in the rendered `book.html` with one regex pass, resolves each href with `URI.merge` (RFC-3986 path normalization from the standard library — no manual `../` folding, no bare-dot / `.#frag` special cases to maintain), and rewrites in-book hits to `href="#ch-<anchor>"` (or `href="#ch-<anchor>-<frag>"` when the href carries a fragment). Out-of-book misses emit the resolved absolute URL so they're greppable as `href="/..."` during verification — both forms are dead in the PDF reader either way, and matching the prior in-template behavior keeps the build byte-comparable.

Folder-style index pages get a no-trailing-slash entry in the map alongside the canonical trailing-slash form. Source authors are inconsistent about the trailing slash on links to folder-style classes (`[CheckBox](../CheckBox)` instead of `[CheckBox](../CheckBox/)`) and the PDF build can't rely on the live site's redirect machinery to fix it post hoc.

The plan's "Liquid will hurt" guess was correct — three rounds of in-template optimization (per-permalink string pre-computation, common-prefix gate `contains`, byte-equivalent output) shaved ~17 s but plateaued at ~3.6 s above the pre-2.2 baseline. The Ruby plugin closes the rest: ~50 ms of `gsub` over ~700 chapters and ~5800 in-book rewrites, with the rest of the prior overhead (Liquid filter dispatch) gone entirely. Build wall is now ~7 s — under the pre-2.2 baseline, because removing the 2.1/2.2 Liquid scaffolding also bought back some unrelated render time.

### Verification

- Pick a See Also link (e.g. "SetData" inside "DataObject.GetData"). In the PDF reader, clicking it jumps to the SetData chapter.
- Pick a link that targets a page outside the book (e.g. an external `https://`) — confirm it still opens externally.
- Pick a link whose target is a permalink not included in `_data/book.yml` — confirm it's left as-is (and document the resulting dead link).

## Phase 3 — Global TOC

Goal: page 3 (or wherever the front matter ends) is a clickable, page-numbered table of contents listing every part and chapter.

### 3.1 TOC page

Emit, after the colophon and before the first part divider, a `<nav class="book-toc">` block with one `<li>` per part heading and one nested `<li>` per chapter. Each `<a href="#ch-...">` carries the in-book anchor from Phase 2.

Anchor sources to target:

- Part dividers: `id="pt-{{ forloop.index }}"` on the `article.part-divider`, with `id="pt-{{ forloop.index }}-title"` on the inner `<h1>`. Either works as an outline target; the article-level id is the natural one for a TOC line that jumps to the divider page.
- Chapters: `id="ch-<url-path-with-dashes>"` on each `article.page`, emitted by the 1.5b rewrite. The schema is `ch-` + the chapter's permalink with leading/trailing `/` stripped and inner `/` replaced by `-` (e.g. `/tB/Packages/VBRUN/DataObject/SetData` → `ch-tB-Packages-VBRUN-DataObject-SetData`). Reuse the same logic in book.html when building the TOC list to avoid drift.

```html
<nav class="book-toc">
  <h1>Contents</h1>
  <ol>
    <li><a href="#pt-1">Part I — The Core Language</a>
      <ol>
        <li><a href="#ch-tB-Core-AddressOf">AddressOf operator</a></li>
        …
      </ol>
    </li>
    …
  </ol>
</nav>
```

### 3.2 Page numbers via `target-counter`

CSS GCPM gives us:

```css
.book-toc a::after {
  content: leader(' . ') target-counter(attr(href url), page);
}
```

pagedjs implements this. Each TOC line ends with " . . . 47" pointing at the destination page.

### 3.3 Two-pass concern

The TOC is generated in the same Liquid pass that emits chapters, so the chapter anchors are known when the TOC is built. Pagedjs computes the `target-counter` values during its own pagination pass, after the page break layout has settled — so page numbers are correct without a separate run.

### Verification

- The TOC entry "Part III — The VBRUN Package" links to the Part III divider page.
- The TOC entry "SetData" shows a page number that matches the page on which the SetData chapter actually starts. Confirm the page number is right and the link jumps correctly.
- Two-column or single-column TOC styling — decide once we see how dense it gets at 1500 pages. Probably needs to be two-column to fit reasonably.

## Phase 4 — Polish

Smaller items, each independently useful.

### 4.1 In-page `{:toc}` lists

Some source pages (`docs/Reference/tbIDE/HtmlElement.md`, `docs/Reference/CustomControls/Framework/SerializeInfo.md`, possibly others) contain a kramdown `{:toc}` placeholder that emits a per-page TOC as a `<ul id="markdown-toc">`. In the standalone site these are useful; in the book they're redundant clutter (the global TOC and the natural chapter flow already provide navigation).

Action: in print.css, `ul#markdown-toc { display: none; }`. Verify nothing else relies on that ID.

### 4.2 Wide tables

Audit candidates:

- `docs/Reference/VBA/Interaction/Partition.md` — has a real comparison table.
- `docs/Reference/CustomControls/` various — every `Waynes…` control has a member table.
- `docs/Reference/WinNativeCommonCtls/` — similar.

At A4 width, three- and four-column tables of typical reference data usually fit. The risk cases are tables with one long description column. Mitigations:

- Reduce font-size on `table` from the current `0.95em` to `0.9em` or smaller.
- Allow `break-inside: auto` (already set) and orphan/widow control on rows.
- Add `word-wrap: break-word` on table cells.
- For specific overflow cases, consider rotating the table 90° (landscape page) via a `@page { size: A4 landscape; }` ruleset, scoped to a class.

### 4.3 Long code blocks

Verify that, with the whitespace fix in place, code blocks that span page boundaries render with all whitespace preserved (no token mashing). Spot-check a few long examples (`docs/Reference/CEF/CefBrowser/`, `docs/Reference/WebView2/`).

### 4.4 Cleanup

- Delete `docs/_pdf/smoke.pdf` — single-page POC artefact from early debugging.
- `_pdf/` and `_site-pdf/` should be in `.gitignore` for the worktree. Verify.

## Open questions

- **Edition / build provenance** — resolved in 1.3 as build date + short commit hash + commit date, sourced from `site.time` and the `_plugins/build-info.rb` plugin. Switch to a release version once there's a release cadence.
- **Part order** — current `_data/book.yml` order is Core → VBA → VBRUN → VB → WebView2 → Assert → CustomControls → CEF → WinEventLogLib → WinNamedPipesLib → WinServicesLib → tbIDE → WinNativeCommonCtls. Reasonable as-is. Could group the three winlibs together (they share idioms; see WIP.md) and pull tbIDE to the end since it's the addin SDK rather than user-facing runtime.
- **Anchor stability** — path-style anchors break if a permalink is renamed. The redirect_from system in source pages handles this for the live site but not for the book. Acceptable tradeoff because the book is rebuilt every time anyway.
- **Front-matter page numbering** — title / colophon / TOC are typically Roman numerals (i, ii, iii), then Arabic from page 1 of Part I. Optional polish; matters for citation but not for reading.
- **PDF metadata** — title, author, subject, keywords in the PDF properties dialog. pagedjs-cli passes through `<title>` and a few `<meta>` tags. Worth doing once content is settled.
- **Index / glossary** — out of scope. The global TOC + cross-references should be enough for a reference manual.

## Sequencing

Each phase is roughly 1-2 hours of work for me; ~1 working day end-to-end. Recommended commit boundary at the end of each phase.

1. Phase 1 — structural framing. Largest visible change.
   1.1 schema upgrade. **Done.**
   1.2 part divider pages. **Done.**
   1.3 title page. **Done.**
   1.4 colophon page.
   1.5 heading hierarchy shift + heading-id uniqueness. **Done.**
   1.6 sub-page nesting under index chapters. **Done.**
   1.7 beyond Reference: front matter + supplementary parts. **Done.** (Welcome → Introduction; Features, FAQ, Tutorials added before the Reference parts.)
   1.8 catching up with the live nav: Reference Section + Packages move. **Done.** (New Reference Section Part; VBA Runtime gains the `/tB/Packages/VBA` landing page.)
   1.9 packages as chapters with full-page title pages. **Done.** (12 package Parts collapsed into one chaptered Packages Part; `/tB/Packages/` recast as foreword; landing H1s stripped by plugin; chapter body rendering factored into `_includes/book-chapter-body.html`. Follow-up fixes: chapter-divider H2 carries an explicit `chd-...-title` id so PDF outline entries jump to the divider rather than collapsing to page 1; chaptered-part chapters receive an `extra_heading_shift` so class / module indexes nest under the chapter divider in the outline rather than appearing as siblings.)
2. Phase 2 — cross-references. Largest navigation improvement.
   2.1 permalink → anchor map. **Done.** (Folded into the `_plugins/book-href-rewrite.rb` `Hash`.)
   2.2 rewrite chapter-content href attributes. **Done.** (Plugin pass; ~50 ms over ~6900 rewrites.)
3. Phase 3 — global TOC. Builds on Phase 2.
4. Phase 4 — polish. Small independent fixes.

Within Phase 1, 1.3 / 1.4 (front matter) and 1.6 (sub-page nesting) are independent of each other and can run in any order. 1.6 is most cleanly done right after 1.5 since both work on the same Liquid pass over chapter bodies.

Phase 1 is enough on its own to make the output feel like a book to flip through. Phases 2 and 3 are what make it usable as a reference. Phase 4 is per-issue cleanup.
