---
title: Book Configuration
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Book-Configuration
---

# Book Configuration
{: .no_toc }

`docs/_book.yml` defines the chapter manifest for the PDF book: which pages appear, in what order, and how they map to named parts and chapters. `book.mjs` reads this file during Phase 2 (to resolve page selectors) and Phase 8 (to assemble `book.html`). See [Pipeline Stages](Pipeline-Stages) for the relevant interface contracts.

* TOC goes here
{:toc}

## File location and load order

**File:** `docs/_book.yml`

`data.mjs` loads `_book.yml` during Phase 2 and makes it available as `site.data.book`. The orchestrator then exposes `site.data.book` as `site.bookData` and passes it to `resolveBookChapters`. That call traverses the entire structure and resolves every selector to a concrete `Page[]` stored as `entry._chapters`, so Phase 8's `assembleBook` has no further page lookups to do.

Run `build.bat` then `book.bat` to see the effect of changes. The `check.bat` integrity check also runs a PDF build pass.

## Top-level structure

```yaml
front_matter:
  - <entry>      # zero or more entries, emitted before the first Part
  - ...

parts:
  - <part>       # one or more numbered Parts
  - ...
```

**`front_matter`** entries are emitted between the title page and the first numbered Part. They produce no divider page and no part number.

**`parts`** entries each produce a numbered divider page. A part may contain a flat set of pages or an ordered list of `chapters`, each of which produces its own sub-divider page.

Both `front_matter` entries and parts (and their chapters) share the [selector schema](#selector-schema) and [common entry options](#common-entry-options) described below.

## Selector schema

Every entry may combine any of these keys to select the pages it contributes to the book. All matches are `contains` by default --- the page's URL or nav-path must contain the prefix string. Set `no_descent: true` on the entry to switch all its matches to exact equality.

| Key | Type | Description |
|---|---|---|
| `page` | `string` | Single URL prefix. Shorthand for a one-element `pages:` list. |
| `pages` | `string[]` | List of URL prefixes. Each prefix is tested against the page's `permalink` field. |
| `nav_page` | `string` | Single nav-path prefix. Shorthand for a one-element `nav_pages:` list. A page's nav-path is its slash-joined `grand_parent / parent / title` chain, as populated by `nav.mjs`. |
| `nav_pages` | `string[]` | List of nav-path prefixes, tested against each page's `navPath` field. |
| `no_descent` | `boolean` | When `true`, switches every match on this entry from `contains` to exact equality. Use this when a prefix like `/Foo/` should match only the index page and not its sub-pages, or when `page: /` would otherwise sweep in every page on the site. |

All selector keys are combinable within one entry. An entry with both `page` and `nav_page` collects the union of both selections. Selectors on a chapter entry are independent of the selectors on the containing part --- a chapter collects its own pages; the part does not automatically inherit them.

## Common entry options

Front_matter entries, parts, and chapters all support these options. Where behaviour differs between parts and chapters, the part form is noted first with the chapter form in parentheses.

### `title` / `subtitle`

```yaml
title: "VBA Package"
subtitle: "Standard runtime modules --- Strings, Math, FileSystem, and the rest"
```

`title` is the text for the divider heading --- H1 for parts, H2 for chapters. `subtitle` is an optional subheading rendered below `title`. Both are used as the PDF bookmark label.

When `landing_is_target:` is set, `title` is injected into the landing page's article rather than rendered on a standalone divider page.

### `landing_page`

```yaml
landing_page: /tB/Packages/VBA
```

A single absolute URL. The named page is emitted first in the entry's content list, before any prefix-swept pages. It is excluded from prefix matches so it is not emitted twice. Its source H1 is stripped by the rewriter so the divider heading remains the sole PDF outline entry for the entry. Unlike `foreword_page:`, a `landing_page` renders with a normal running header and regular article styling.

### `landing_is_target`

```yaml
landing_page: /tB/Packages/VBA
landing_is_target: true
```

Requires `landing_page:`. When set, the divider page renders silently and the entry `title` is injected as an H1 (part) or H2 (chapter) at the start of the landing-page article. The PDF bookmark navigates to the landing page rather than to a blank divider page. The landing's own source H1 is still stripped.

Pair with `outline_closed:` to start the bookmark collapsed.

### `no_outline_entry`

```yaml
no_outline_entry: true
```

Emits the divider `title` as a silent `<p>` instead of an H1 or H2. PagedJS skips silent paragraphs when building the PDF outline, so the entry has no bookmark of its own. The first content heading in the entry's pages becomes the bookmark target instead.

When combined with `landing_page:`, the landing's source H1 strip is skipped --- the landing's own first heading becomes the bookmark target.

Pair with `no_heading_shift:` to keep that heading at the correct depth.

### `no_heading_shift`

```yaml
no_heading_shift: true
```

Controls how the heading assembler shifts levels to prevent multiple H1s in the combined `book.html`. See [Heading-shift mechanics](#heading-shift-mechanics) below.

### `outline_closed`

```yaml
outline_closed: true
```

Starts the PDF bookmark for this entry collapsed (children hidden until expanded in a PDF reader). The `data-pdf-bookmark-closed` attribute is stamped on:

- the divider H1 / H2, for entries with a visible divider heading;
- the first content article, for `no_outline_entry` entries (PagedJS finds the heading via `closest()`);
- the injected heading directly, for `landing_is_target` entries.

## Part-only options

### `foreword_page`

```yaml
foreword_page: /tB/Packages/
```

A single absolute URL. The named page is emitted as `<article class="part-foreword">` right after the part divider, before any chapter dividers. No running header (CSS suppresses the page chrome for foreword articles). The foreword's source H1 is not stripped and it does not become a PDF outline entry.

Distinct from `landing_page:` in two ways: the source H1 is preserved, and there is no outline contribution from the foreword itself.

### `chapters`

```yaml
chapters:
  - title: VBA Package
    ...
  - title: VBRUN Package
    ...
```

An ordered list of chapter entries. Each chapter produces its own divider page (H2) and uses the same selector schema and common entry options above. No chapter-specific options exist beyond those shared with parts.

## Heading-shift mechanics

The PDF assembler shifts heading levels to prevent source H1s from competing with part and chapter divider headings:

- **Parts (no chapters):** every page in the part receives a +1 shift --- source H1 renders as H2, H2 as H3, and so on. Set `no_heading_shift: true` on the part entry to skip this shift and keep source H1 as H1.
- **Chapters inside a part:** every page receives a +2 shift total (base +1 from the part, plus an additional +1 for the chapter level) --- source H1 renders as H3. Set `no_heading_shift: true` on the chapter entry to skip only the extra +1, so source H1 renders as H2 instead of H3.

Typical pattern: pair `no_outline_entry: true` with `no_heading_shift: true` when a single-page part or chapter should use the landing's own H1 as the PDF bookmark target without a redundant silent divider above it.

## Sort order

Within each entry, selected pages are ordered by `sortByNavOrder`:

1. **Index pages first** --- any page whose URL ends in `/`.
2. **Pages with `nav_order`** --- ascending by `nav_order` value, with `title` as the tie-breaker.
3. **Pages without `nav_order`** --- alphabetically by `title`.
4. **Grouped by owning index** --- an index page and its direct sub-pages stay adjacent.

A `landing_page:` URL is always placed first, before the sorted set, and is excluded from the sorted set so it is not emitted twice.

## Worked examples

### Chapter with `landing_is_target`

```yaml
- title: VBA Package
  subtitle: Standard runtime modules --- Strings, Math, FileSystem, and the rest
  landing_page: /tB/Packages/VBA
  page: /tB/Modules/
  landing_is_target: true
  outline_closed: true
```

What this produces in the PDF:

1. A chapter divider rendered silently (no visible H2 page), because `landing_is_target: true`.
2. The VBA landing page at `/tB/Packages/VBA` --- first article, with `"VBA Package"` injected as an H2 at the top of its content. Its original source H1 is stripped.
3. Every page whose URL contains `/tB/Modules/`, sorted by `sortByNavOrder`.
4. The PDF bookmark for this chapter navigates to the VBA landing page and starts collapsed.

---

### Chapter with a visible divider and `nav_page` selector

```yaml
- title: Operators
  nav_page: Reference Section/Operators
  outline_closed: true
```

What this produces:

1. A visible H2 divider page titled "Operators".
2. All pages whose `navPath` contains `Reference Section/Operators`, in nav order.
3. A PDF bookmark navigating to the divider page, starting collapsed.

---

### Front-matter entry with `no_outline_entry` and `no_descent`

```yaml
front_matter:
  - title: Introduction
    page: /
    no_outline_entry: true
    no_heading_shift: true
    no_descent: true
    outline_closed: true
```

What this produces:

1. The root page (`/`) only --- `no_descent: true` prevents `/` from sweeping in every page on the site.
2. The divider title "Introduction" renders as a silent `<p>` (no own bookmark). The page's source H1 becomes the PDF bookmark target instead.
3. Because `no_heading_shift: true` is set, the source H1 renders as H1 rather than H2.
4. The bookmark starts collapsed.

---

### Part with a foreword and nested chapters

```yaml
- title: Packages
  subtitle: The runtime and library packages shipped with twinBASIC
  outline_closed: true
  foreword_page: /tB/Packages/
  chapters:
    - title: VBA Package
      ...
    - title: VBRUN Package
      ...
```

What this produces:

1. A part divider page (H1) titled "Packages".
2. The page at `/tB/Packages/` emitted as a foreword article (no running header, no outline entry). Its H1 is preserved.
3. Chapter divider pages (H2) for each chapter, followed by that chapter's pages in nav order.

## See Also

- [Pipeline Stages](Pipeline-Stages) -- the `book.mjs` interface contracts.
- [tbdocs Builder](Builder) -- design rationale for `book.mjs`.
