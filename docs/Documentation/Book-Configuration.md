---
title: Book Configuration
parent: tbdocs Builder
grand_parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Book-Configuration
---

# Book Configuration
{: .no_toc }

`docs/_book.yml` is the chapter manifest for the PDF book: which pages appear, in what order, and how they group into named parts and chapters. `book.mjs` reads it during Phase 2 (to resolve page selectors) and Phase 8 (to assemble `book.html`). See [Pipeline Stages](Pipeline-Stages) for the interface contracts.

* TOC goes here
{:toc}

## File location and load order

**File:** `docs/_book.yml`

`data.mjs` loads `_book.yml` during Phase 2 as `site.data.book`. The orchestrator passes it to `resolveBookChapters` as `site.bookData`, which resolves every selector to a concrete `Page[]` stored as `entry._chapters`. Phase 8's `assembleBook` then needs no further page lookups.

To see the effect of a change, run `build.bat` then `book.bat`. `build.bat` warns about a page the manifest does not mention; see [Pages left out of the book](#pages-left-out-of-the-book).

## Top-level structure

```yaml
front_matter:
  - <entry>      # zero or more entries, emitted before the first Part
  - ...

parts:
  - <part>       # one or more numbered Parts
  - ...

left_out:
  - <entry>      # pages deliberately not in the book, each with a reason
  - ...
```

**`front_matter`** entries are emitted between the title page and the first numbered Part. They produce no divider page and no part number.

**`parts`** entries each produce a numbered divider page. A part holds either a flat set of pages or an ordered list of `chapters`, each with its own sub-divider page.

Front-matter entries, parts and chapters share the [selector schema](#selector-schema) and [common entry options](#common-entry-options).

**`left_out`** entries name pages that are not in the book. They use the selector schema and a `reason:`, and emit nothing; see [Pages left out of the book](#pages-left-out-of-the-book).

## Selector schema

An entry may combine any of these keys to select its pages. Matches are `contains` by default: the page's URL or nav-path must contain the prefix string. Set `no_descent: true` on the entry to make all its matches exact equality.

| Key | Type | Description |
|---|---|---|
| `page` | `string` | Single URL prefix. Shorthand for a one-element `pages:` list. |
| `pages` | `string[]` | List of URL prefixes, each tested against the page's `permalink` field. |
| `nav_page` | `string` | Single nav-path prefix. Shorthand for a one-element `nav_pages:` list. A page's nav-path is its slash-joined `grand_parent / parent / title` chain, as populated by `nav.mjs`. |
| `nav_pages` | `string[]` | List of nav-path prefixes, tested against each page's `navPath` field. |
| `no_descent` | `boolean` | When `true`, every match on this entry is exact equality instead of `contains`. Use it when `/Foo/` should match only the index page and not its sub-pages, or when `page: /` would otherwise sweep in every page on the site. |

An entry with several selector keys collects the union of their selections. A chapter's selectors are independent of its part's: the chapter collects its own pages, and the part does not inherit them.

## Pages left out of the book

A page that no part, chapter or `front_matter` entry selects is not in the book. To leave one out, name it in `left_out:` with the same selector keys and a `reason:`:

```yaml
left_out:
  - reason: Time-limited community contests
    page: /Challenges
```

Every page has to be in one or the other. The build's summary prints a `book:` warning for:

- a page that no entry selects and `left_out:` does not name;
- a page that is in the book and in `left_out:` as well;
- a book entry that selects no page, or a `left_out:` entry that matches none --- usually a page that was renamed or deleted;
- a `landing_page:` or `foreword_page:` URL that no page publishes at.

A new page with no entry looks like this:

      book:    1 page has no entry in _book.yml -- add each to a part, or to left_out with a reason:
                 IDE/Probe.md  (/tB/IDE/Project/Probe)

These are warnings: the exit code does not change. A build with nothing to report prints no `book:` line, and `serve.bat` never prints one because it does not build the book.

A link from inside the book to a left-out page opens that page on the website, since a site path goes nowhere in a PDF. The link check's pass over `book.html` lists each such link as `OUT OF BOOK`:

    _site-pdf/book.html:
      OUT OF BOOK  https://docs.twinbasic.com/tB/IDE/Project/PackagePublishing -- not in the book; opens the website

Look there first for a left-out page that belongs in the book after all.

## Common entry options

Front-matter entries, parts and chapters all support these options. Where parts and chapters differ, the part form comes first and the chapter form follows in parentheses.

### `title` / `subtitle`

```yaml
title: "VBA Package"
subtitle: "Standard runtime modules --- Strings, Math, FileSystem, and the rest"
```

`title` is the divider heading --- H1 for parts, H2 for chapters. `subtitle` is an optional subheading below it. Both serve as the PDF bookmark label.

With `landing_is_target:`, `title` is injected into the landing page's article instead of a standalone divider page.

### `landing_page`

```yaml
landing_page: /tB/Packages/VBA
```

A single absolute URL. The page is emitted first in the entry's content, before any prefix-selected pages, and excluded from prefix matches so it appears once. The rewriter strips its source H1, so the divider heading is the entry's only PDF outline entry. Unlike `foreword_page:`, it renders with a normal running header and regular article styling.

### `landing_is_target`

```yaml
landing_page: /tB/Packages/VBA
landing_is_target: true
```

Requires `landing_page:`. The divider page renders silently, and the entry `title` is injected as an H1 (part) or H2 (chapter) at the start of the landing-page article. The PDF bookmark goes to the landing page instead of a blank divider page. The landing's source H1 is still stripped.

Pair with `outline_closed:` to start the bookmark collapsed.

### `no_outline_entry`

```yaml
no_outline_entry: true
```

Emits the divider `title` as a silent `<p>` instead of an H1 or H2. PagedJS skips silent paragraphs when building the PDF outline, so the entry has no bookmark of its own; the first heading in its pages becomes the bookmark target.

Combined with `landing_page:`, the landing's source H1 is not stripped, and its first heading becomes the bookmark target.

Pair with `no_heading_shift:` to keep that heading at the correct depth.

### `no_heading_shift`

```yaml
no_heading_shift: true
```

Skips the heading shift that keeps `book.html` from having several H1s. See [Heading-shift mechanics](#heading-shift-mechanics) below.

### `outline_closed`

```yaml
outline_closed: true
```

Starts the entry's PDF bookmark collapsed (children hidden until expanded in a PDF reader). The `data-pdf-bookmark-closed` attribute is stamped on:

- the divider H1 / H2, for entries with a visible divider heading;
- the first content article, for `no_outline_entry` entries (PagedJS finds the heading via `closest()`);
- the injected heading directly, for `landing_is_target` entries.

## Part-only options

### `foreword_page`

```yaml
foreword_page: /tB/Packages/
```

A single absolute URL. The page is emitted as `<article class="part-foreword">` right after the part divider, before any chapter dividers. CSS suppresses its running header. Unlike `landing_page:`, its source H1 is kept and it adds no PDF outline entry.

### `chapters`

```yaml
chapters:
  - title: VBA Package
    ...
  - title: VBRUN Package
    ...
```

An ordered list of chapter entries. Each chapter has its own divider page (H2) and the same selector schema and common entry options as above. It has no options of its own.

## Heading-shift mechanics

The PDF assembler shifts heading levels so that source H1s do not compete with part and chapter divider headings:

- **Parts (no chapters):** every page in the part is shifted +1 --- source H1 renders as H2, H2 as H3, and so on. `no_heading_shift: true` on the part skips the shift and keeps source H1 as H1.
- **Chapters inside a part:** every page is shifted +2 (+1 for the part, +1 for the chapter) --- source H1 renders as H3. `no_heading_shift: true` on the chapter skips only the chapter's +1, so source H1 renders as H2.

Typical pattern: pair `no_outline_entry: true` with `no_heading_shift: true` when a single-page part or chapter should use the landing's own H1 as the bookmark target, with no silent divider above it.

## Sort order

Within each entry, `sortByNavOrder` orders the selected pages:

1. **Index pages first** --- any page whose URL ends in `/`.
2. **Pages with `nav_order`** --- ascending by `nav_order`, ties broken by `title`.
3. **Pages without `nav_order`** --- alphabetically by `title`.
4. **Grouped by owning index** --- an index page and its direct sub-pages stay adjacent.

A `landing_page:` URL always comes first, before the sorted pages.

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

In the PDF:

1. The chapter divider is silent (no visible H2 page), because of `landing_is_target: true`.
2. The VBA landing page at `/tB/Packages/VBA` comes first, with `"VBA Package"` injected as an H2 at the top. Its source H1 is stripped.
3. Every page whose URL contains `/tB/Modules/` follows, sorted by `sortByNavOrder`.
4. The chapter's bookmark goes to the VBA landing page and starts collapsed.

---

### Chapter with a visible divider and `nav_page` selector

```yaml
- title: Operators
  nav_page: Reference Section/Operators
  outline_closed: true
```

In the PDF:

1. A visible H2 divider page titled "Operators".
2. All pages whose `navPath` contains `Reference Section/Operators`, in nav order.
3. A collapsed bookmark to the divider page.

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

In the PDF:

1. The root page (`/`) only --- `no_descent: true` stops `/` from selecting every page on the site.
2. The divider title "Introduction" is a silent `<p>` with no bookmark. The page's source H1 is the bookmark target instead.
3. With `no_heading_shift: true`, that H1 renders as H1 rather than H2.
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

In the PDF:

1. A part divider page (H1) titled "Packages".
2. The page at `/tB/Packages/` as a foreword article (no running header, no outline entry), with its H1 kept.
3. A divider page (H2) for each chapter, followed by that chapter's pages in nav order.

## See Also

- [Pipeline Stages](Pipeline-Stages) -- the `book.mjs` interface contracts.
- [tbdocs Builder](Builder) -- design rationale for `book.mjs`.
