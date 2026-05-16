# PDF Book Build — Plan

Currently `book.bat` produces a ~1500-page PDF that is a flat concatenation of every reference page. It works, but it doesn't read like a book — no front matter, no parts, no global TOC, every chapter is `<h1>`, and "See Also" cross-references point at standalone `file://` URLs rather than jumping within the PDF.

This file is the staged plan for turning that output into an actual book. Phases are independent; each one ends in a verifiable rendered artefact and is a reasonable commit boundary.

## Pipeline recap

From `docs/`:

```
bundle exec jekyll build --config _config.yml,_config-pdf.yml
npx pagedjs-cli _site-pdf/book.html -o _pdf/book.pdf --outline-tags h1,h2,h3 -t 600000
```

or `book.bat`. Touch points:

- [docs/book.html](docs/book.html) — iterator that concatenates every chapter into one HTML document. Liquid filters here transform chapter content before emission.
- [docs/_layouts/book-combined.html](docs/_layouts/book-combined.html) — wraps book.html in `<html><head>` and links rouge.css + print.css.
- [docs/_layouts/book.html](docs/_layouts/book.html) — minimal per-page wrapper used when each source page is rendered to its own `_site-pdf/<path>.html`. The combined book.html iterates over those rendered pages via Jekyll's `site.pages` collection.
- [docs/assets/css/print.css](docs/assets/css/print.css) — the book's design (page geometry, headings, code blocks, tables, admonitions, running header).
- [docs/_data/book.yml](docs/_data/book.yml) — the manifest book.html iterates over. Currently a flat `sections:` list of URL prefixes.
- [docs/_config-pdf.yml](docs/_config-pdf.yml) — overlay config that switches the default layout to `book` and the output directory to `_site-pdf`.

## Build-time tooling policy

**Anything that participates in rendering the book or the online / offline site is handled by Jekyll** — Liquid templates, includes, layouts, data files (`_data/*.yml`), and Ruby plugins under `_plugins/`. The book is a Jekyll output; its build provenance, manifest, cross-references, and page assembly all live in the Jekyll pipeline.

Python scripts are reserved for non-render concerns: one-off content conversion (`scripts/convert_em_dash_separators.py`), repo audits, developer tooling, anything that runs *outside* a Jekyll build. They must never be a prerequisite for `bundle exec jekyll build` or `book.bat` — those commands should remain self-contained.

Concretely for the PDF book:

- Git-derived build info (commit hash, commit date) → Jekyll plugin (`_plugins/build-info.rb`) that populates `site.data.build` on `:site, :after_reset`. Not a pre-build Python step writing `_data/build.yml`.
- Chapter manifest → `_data/book.yml` (committed source of truth, hand-edited).
- Title page, colophon, TOC content → Liquid in `book.html` and the layouts.
- Heading rewrites and href rewrites → Liquid (existing approach in `book.html`).

The carve-out in WIP.md for `_plugins/offlinify.rb` is the same shape: build-time concerns tightly coupled to Jekyll's internal model belong in `_plugins/`, not in an external script.

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

CSS: pin the section to a named `@page title` so both the running header (`@top-right`) and the page-number footer (`@bottom-right`) are blank on this page — traditional title-page convention. `section.title-page { break-after: page; }` pushes the first part divider onto page 2. The previously-needed `article:first-of-type { break-before: avoid; }` rule is removed in this phase: the title page is now the first content in the document, and the first article (part divider) wants the default forced break.

Image (logo) optional — `docs/favicon.png` exists but is small. A larger source asset would be nice but is not blocking.

Build-time scripting: capturing git info via a Jekyll plugin (rather than a Python pre-build script that writes a YAML data file) is the rule for *anything that participates in the render*, online or PDF — see "Build-time tooling policy" below.

### 1.4 Colophon page

Front-matter page 2. Pulls together:

- Site copyright (already in `_config.yml` as `footer_content`).
- The CC-BY-4.0 attribution that VBA-derived pages currently emit via `_includes/footer_custom.html`. Promote it to a single book-wide notice.
- Build provenance — Jekyll version, pagedjs-cli version, the `commit-hash@date` from 1.3.

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
- **Deeper nesting (sub-sub-pages) is not handled.** No current folder has `index.md` → `Sub/index.md` → `Sub/X.md` three-deep, but if one appears, the state machine would need to track a stack instead of a single most-recent-index pointer.

## Phase 2 — In-PDF cross-references

Goal: clicking "[SetData](SetData)" inside a "See Also" jumps to the SetData chapter in the PDF, not to `file://.../tB/Packages/VBRUN/DataObject/SetData.html`.

After 1.5b, every chapter heading already carries a unique `id="ch-<chapter-anchor>-..."` and the chapter-title heading carries the bare `id="ch-<chapter-anchor>"`. Phase 2 is the inverse direction: rewrite the chapter body's outgoing `href`s to point at those ids.

### 2.1 Permalink → anchor map

Build a parallel-arrays map in book.html before the chapter loop: one array of absolute permalinks (`/tB/Packages/VBRUN/DataObject/SetData`), one array of chapter anchors (`ch-tB-Packages-VBRUN-DataObject-SetData`). The map is derived from the same iteration that emits chapters in 1.5, so it's free — no extra pass over `site.pages`.

Liquid lacks dict literals; the lookup is `array | index_of: url` (or `where_exp` for the typed variants). Tractable, just verbose.

### 2.2 Rewrite chapter-content href attributes

For each chapter body, after markdownify, the inter-span whitespace replacements, and the 1.5 heading rewrites:

- Find `<a href="X">` patterns where `X` doesn't start with `http`, `mailto:`, or `#` (the `#`-anchor rewrite already happened in 1.5 for intra-chapter links).
- Resolve `X` against the chapter's own URL (so `<a href="../VBRUN/Constants">` from a VBA page resolves to `/tB/Packages/VBRUN/Constants`).
- Look up the resolved URL in the permalink → anchor map. On hit, rewrite to `<a href="#ch-...">`. On miss, leave alone (probably broken markdown or a link to a page that didn't make it into the book — flag during verification).

A simpler escape hatch for the relative-resolution step: for each chapter, compute its "URL parent" (everything up to and including the last `/` of its permalink). Prepend that to every `<a href>` that doesn't start with `http`, `mailto`, `#`, or `/`. Then apply the absolute-URL → anchor replacement.

Bracket the work — Phase 2 still has the most "this works on paper but Liquid will hurt" risk because of the relative-path resolution. Heading uniqueness moving to 1.5 takes the riskiest piece (cross-chapter id collision) off Phase 2's plate.

### Verification

- Pick a See Also link (e.g. "SetData" inside "DataObject.GetData"). In the PDF reader, clicking it jumps to the SetData chapter.
- Pick a link that targets a page outside the book (e.g. an external `https://`) — confirm it still opens externally.
- Pick a link whose target is a permalink not included in `_data/book.yml` — confirm it's left as-is (and document the resulting dead link).

## Phase 3 — Global TOC

Goal: page 3 (or wherever the front matter ends) is a clickable, page-numbered table of contents listing every part and chapter.

### 3.1 TOC page

Emit, after the colophon and before the first part divider, a `<nav class="book-toc">` block with one `<li>` per part heading and one nested `<li>` per chapter. Each `<a href="#ch-...">` carries the in-book anchor from Phase 2.

```html
<nav class="book-toc">
  <h1>Contents</h1>
  <ol>
    <li><a href="#part-I">Part I — The Core Language</a>
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
   1.6 sub-page nesting under index chapters.
2. Phase 2 — cross-references. Largest navigation improvement.
3. Phase 3 — global TOC. Builds on Phase 2.
4. Phase 4 — polish. Small independent fixes.

Within Phase 1, 1.3 / 1.4 (front matter) and 1.6 (sub-page nesting) are independent of each other and can run in any order. 1.6 is most cleanly done right after 1.5 since both work on the same Liquid pass over chapter bodies.

Phase 1 is enough on its own to make the output feel like a book to flip through. Phases 2 and 3 are what make it usable as a reference. Phase 4 is per-issue cleanup.
