# PLAN-2: Phase 2 — COMPUTE (`nav.mjs`, `seo.mjs`, `book.mjs`, `build-info.mjs`)

Detailed implementation plan for the second phase of the tbdocs builder.
Read this together with [PLAN.md](PLAN.md) (the authoritative architecture
overview) and [PLAN-1.md](PLAN-1.md) (which produced the inputs this
phase consumes).

The COMPUTE phase has one job: take the inventory Phase 1 produced and
**derive every piece of structured data the template phase will iterate**
(nav tree, breadcrumbs, per-page nav-activation coordinates, child
listings, SEO metadata, resolved book chapter lists, build provenance) —
without rendering markdown, expanding templates, or touching the
filesystem beyond reading `_config.yml`, `_data/book.yml`, and one
`git` shell-out.

Target: ~30 ms wall time after Phase 1 on the current 836-page corpus.
The Ruby equivalents collectively cost ~1.5 s in Jekyll's GENERATE
phase; sharing intermediate state across the precomputes (rather than
each Generator rebuilding it) makes the JS version much cheaper.

## Status: shipped

Phase 2 landed across [nav.mjs](nav.mjs) (318 lines), [seo.mjs](seo.mjs)
(126 lines), [book.mjs](book.mjs) (175 lines), [build-info.mjs](build-info.mjs)
(28 lines), the extended [tbdocs.mjs](tbdocs.mjs) (93 lines), and the
`verify-phase2.mjs` (retired Phase 10) acceptance harness (302 lines).
Total ~1,040 lines of JS for ~4,800 lines of replaced Ruby across the
six nav plugins + seo-precompute + book-resolve-chapters + book-sort +
build-info.

Measured wall time on the current Windows dev machine: discover ~120 ms,
nav 28 ms, seo 21 ms, book 9 ms, buildInfo ≤2 ms — total Phase 1+2 ~180
ms. The Phase 2 substeps alone come in at ~60 ms, about 2× the ~30 ms
aspirational target this document opened with but comfortably under the
~200 ms soft cap §10 used as a regression guard. Roughly half of the
60 ms is the combined nav walk (path + integrity + tree + levels +
breadcrumbs + children) and a third is the markdown-it init + 838 title
renders inside `seo`; book and build-info are noise on this scale.

Verification: all 23 checks in `verify-phase2.mjs` pass on the production
tree. Cross-verified against Jekyll's rendered `_site/`: top-level
`navTree` order matches byte-for-byte (10 entries), and the homepage's
`<title>` / `<link rel="canonical">` / `<meta property="og:site_name">`
plus the markdown-active `&, &=` title's escape (`&amp;, &amp;=`) all
match Jekyll's output character-for-character.

---

## 1. Inputs

### From Phase 1

The `{ pages, staticFiles }` object returned by `discover()`. Phase 2
only reads `pages[]`; `staticFiles[]` flows past untouched into Phase 5.
The relevant `Page` fields are:

| Field | Why Phase 2 reads it |
|---|---|
| `permalink` | The page's URL. Equivalent to Jekyll's `page.url`. |
| `frontmatter.title` | Required to be in the nav tree / titled set. |
| `frontmatter.parent` | Parent's title (string). |
| `frontmatter.grand_parent` | Disambiguation hint for non-unique parent titles. |
| `frontmatter.nav_order` | Sort key; may be number or string. |
| `frontmatter.child_nav_order` | `"desc"` / `"reversed"` reverses children order on this parent. |
| `frontmatter.nav_exclude` | Page is excluded from nav-tree / nav-levels (but still appears in breadcrumbs / children). |
| `frontmatter.summary` | Optional short blurb shown next to a child link in the auto-generated children list. |
| `frontmatter.layout` | Read indirectly via Phase 1's `layoutDefault`; not used in Phase 2 itself but kept around. |

The `rawContent` field is not read by Phase 2. The body stays opaque
until Phase 3.

### From the source tree

Two files Phase 2 reads directly (Phase 1 excludes both of them on
purpose — they aren't pages):

| File | Loader | Consumer |
|---|---|---|
| `docs/_config.yml` | YAML | nav, SEO (for `nav_sort`, `title`, `logo`, `url`, `baseurl`) |
| `docs/_data/book.yml` | YAML | book chapter resolution |

Plus one shell-out:

| Command | Consumer |
|---|---|
| `git rev-parse --short HEAD` and `git log -1 --format=%cs` | build-info, ultimately rendered on the PDF title page |

### Assumption: `_config.yml` schema is stable

Phase 2 reads a fixed subset of `_config.yml` keys. The list:

- `title` — string. Site title; used by SEO.
- `logo` — string. Asset path (no leading slash); used by SEO.
- `url` — string. Absolute origin (no trailing slash); used by SEO.
  Currently `"https://docs.twinbasic.com"`.
- `baseurl` — string (optional). Path prefix on the origin; used by
  SEO when computing relative URLs. Empty on this site, but the rule
  has to handle a non-empty value.
- `nav_sort` — string (optional). `"case_insensitive"` lowercases the
  string-sort keys; absent or any other value means case-sensitive.
  Not currently set on this site.

If a future change adds an unfamiliar key Phase 2 cares about (a new
`nav_*` knob, say) the implementer has to extend the loader. Phase 2
should not warn on unknown keys — many other keys (`callouts`,
`enable_copy_code_button`, `aux_links`, ...) belong to later phases.

### Assumption: `_data/book.yml` schema is stable

See the inline comment block in `docs/_data/book.yml` for the canonical
selector schema. Phase 2 reads the keys the resolver needs:

- Top-level: `front_matter[]`, `parts[]`.
- Per front-matter entry: `title`, `page` / `pages` / `nav_page` /
  `nav_pages` / `no_descent`.
- Per part: `title`, `subtitle`, `intro`, `landing_page`, `foreword_page`,
  `no_outline_entry`, `no_heading_shift`, plus the same selector keys
  as a front-matter entry, plus `chapters[]`.
- Per chapter (inside a chaptered part): same keys as a part, minus
  `chapters[]` and the part-only `foreword_page`.

Phase 2's resolver only touches the selector keys + `landing_page` +
`foreword_page`. Every other key (`title`, `subtitle`, `intro`,
`no_outline_entry`, `no_heading_shift`) flows past untouched and is
read by Phase 8's renderer.

---

## 2. Outputs

Phase 2 returns one new object and mutates two pre-existing ones in
place. The orchestrator's working state after the phase looks like:

```js
{
  pages,             // Phase 1's array, with new per-page fields added.
  staticFiles,       // unchanged.
  site: {
    config,          // parsed _config.yml (with the keys Phase 2 read).
    navTree,         // Array<NavNode> — the sorted, filtered nav tree.
    seoSiteTitle,    // String — rendered site title for SEO.
    seoLogoUrl,      // String | null — absolute logo URL for SEO.
    buildInfo,       // { commit, commitDate } — git provenance.
    bookData,        // parsed _data/book.yml, with _chapters resolved.
  },
}
```

### Per-page fields added (mutated on each `Page`)

Every titled page (i.e. `frontmatter.title` is a non-empty string):

```js
page.navPath        // String. Slash-joined "grand_parent/parent/title".
                    // The selector book.yml's `nav_page` / `nav_pages`
                    // match against. Equivalent to Jekyll's
                    // page.data["nav_path"].
page.breadcrumbs    // Array<{ title, url }>. Root-first ancestor chain.
                    // Empty for top-level pages. Excludes the current
                    // page itself (the template adds that as a span).
                    // Equivalent to page.data["breadcrumb_chain"].
page.children       // Array<{ title, url, summary }>. Direct nav children
                    // of this page, sorted in render order. Empty for
                    // leaves. Equivalent to page.data["children_in_nav"].
```

For titled pages that successfully resolve into the nav tree (top-level
pages and any descendant whose parent chain grounds out at a top-level
page within `MAX_DEPTH` steps):

```js
page.navLevels      // Array<Integer> | undefined. Positional coordinates
                    // for the nav-activation CSS. See §5.4 for shape.
```

Pages that are excluded from the nav (`nav_exclude: true`, missing
parent, broken parent chain, or filtered out everywhere by
grand_parent disambiguation) get `navLevels === undefined`. The
template falls through to the no-nav-link rules in that case.

For every page (titled or not):

```js
page.seoTitle       // String. Markdownified+stripped+escaped page title,
                    // or the site title when page.title is empty.
page.seoFullTitle   // String. "<seoTitle> | <seoSiteTitle>", collapsed
                    // to just seoTitle when the two match.
page.seoCanonical   // String. Absolute canonical URL.
page.seoIsHome      // Boolean. True for the homepage / about page;
                    // toggles the JSON-LD @type.
```

### Site-level fields added

```js
site.navTree              // Array<NavNode>; see §5.3 shape.
site.seoSiteTitle         // Constant across the build.
site.seoLogoUrl           // Constant across the build; null when no logo.
site.buildInfo            // { commit: "d4fa6fc", commitDate: "2026-05-16" },
                          //   or { commit: "unknown", commitDate: "unknown" }
                          //   when git is unavailable.
site.bookData             // Parsed _data/book.yml. Each chapter-bearing
                          //   entry gains an `_chapters` field (see §5.8).
```

### Why mutate pages rather than return a new array

Two reasons:

- Phase 3 (RENDER) and Phase 4 (TEMPLATE) want to iterate the same
  `pages[]` array. Adding fields in place keeps each page as a single
  growing record; downstream phases stay free of "did this come from
  Phase 1 or Phase 2?" disambiguation.
- The Ruby plugins mutate `page.data` in place for the same reason.
  Doing it identically in JS keeps the mental model portable —
  reviewers can compare PLAN-2 against the Ruby plugin source without
  translating in their head.

### Naming convention: camelCase for computed fields

Phase 1 used camelCase for its computed fields (`srcPath`, `srcRel`,
`destPath`, `layoutDefault`, `imageScope`) and snake_case for fields
read verbatim from YAML (`frontmatter.nav_order`,
`frontmatter.parent`). Phase 2 follows the same split:

| Source | Convention |
|---|---|
| Verbatim YAML frontmatter value | `frontmatter.nav_order`, `frontmatter.parent` (snake_case from source) |
| Verbatim YAML site/book config | `site.config.nav_sort`, `bookData.front_matter[0].nav_page` |
| Computed by Phase 2 | `page.navPath`, `page.breadcrumbs`, `site.navTree` (camelCase) |

The Ruby plugins use snake_case throughout because that matches
Ruby/Liquid idioms. The JS port uses camelCase for computed fields
because the templates that will read them are JS string templates, not
Liquid. The two existing Liquid templates (`_includes/components/*`)
are *not* consumers — they get replaced by `template.mjs` in Phase 4.

---

## 3. Module split

Four new modules. The orchestrator wires them together.

```
builder/
  nav.mjs           navPath, integrity check, navTree, navLevels,
                    breadcrumbs, children — five outputs sharing one
                    parent/title/sort substrate.
  seo.mjs           per-page _seo_* + site-level _seo_*. Independent
                    of nav.
  book.mjs          book.yml loader + chapter resolution. The render
                    half (assembling book.html) stays in book.mjs but
                    only runs in Phase 8.
  build-info.mjs    git shell-out for { commit, commitDate }.
  tbdocs.mjs         existing orchestrator — extended to call the four
                    above between discover() and the (future) Phase 3.
```

### Why one nav.mjs, not six

The six nav-related Ruby plugins (`nav-path`, `nav-integrity-check`,
`nav-tree-precompute`, `nav-levels-precompute`, `breadcrumbs-precompute`,
`children-precompute`) all consume the same intermediate structures:

- `titled` — the subset of `pages` with a non-empty `frontmatter.title`.
- `byTitle` — `Map<title, Page[]>` (for ancestor lookup in breadcrumbs).
- `byParentTitle` — `Map<parentTitle, Page[]>` (for everything else).
- A page-comparison function (the four-bucket sort).
- `orderedChildren` — `Map<url, Page[]>`, the sorted+filtered children
  per parent (shared by navTree and navLevels).

In Jekyll, each Generator runs in isolation and rebuilds the same
structures. The cost is small relative to RENDER (the bottleneck), so
nobody factored them out. In JS we should build them once.

Putting all six in one module is straightforward:

```js
// nav.mjs
export function computeNav(pages, config) {
  computeNavPaths(pages);                    // §5.1; mutates pages
  validateNavIntegrity(pages);               // §5.2; throws on issue
  const state = buildSharedNavState(pages, config);  // §6
  const navTree = buildNavTree(state);       // §5.3
  computeNavLevels(pages, state);            // §5.4; mutates pages
  computeBreadcrumbs(pages, state);          // §5.5; mutates pages
  computeChildren(pages, state);             // §5.6; mutates pages
  return { navTree };
}
```

If a future maintainer prefers six small files, splitting is mechanical
(each function moves out, `state` becomes a shared import). For now,
one file keeps the related logic in one place.

### Why book.mjs holds both Phase 2 and Phase 8

`book.yml` selectors (`page` / `pages` / `nav_page` / `nav_pages` /
`no_descent` / `landing_page` / `foreword_page`) appear in both
phases. Putting the loader and resolver here lets the renderer (Phase
8) read its own intermediate data structure rather than re-implementing
the resolution.

The Phase 2 half exports `loadBookData()` and `resolveBookChapters()`.
The Phase 8 half (`renderBook()`) is out of scope for this plan; PLAN.md
describes it.

---

## 4. Phase ordering within Phase 2

Most of the substeps are independent. The exceptions are:

1. **`nav-path` must run before book resolution.** The book.yml selectors
   `nav_page` / `nav_pages` match against `page.navPath`, so the field
   has to be populated first. The Ruby plugin `nav-path.rb` runs as
   a `Generator` with `priority :low`, then `book-resolve-chapters.rb`
   runs in the `:site, :pre_render` hook. We replicate that order.

2. **`nav-integrity-check` must run before any nav consumer.** It
   aborts the build when a `parent:` reference is ambiguous or
   orphaned. Running it first means subsequent steps don't waste work
   on a broken graph. The Ruby plugin uses `priority :high` for the
   same reason.

3. **`nav-tree` and `nav-levels` both consume the shared
   `orderedChildren` map.** Build the map once in §6, then run both.

4. **`build-info` and `seo` are independent of everything else.**
   They can run in parallel with the nav block or after it. Recommended
   order: build-info first (fast, fires off the `git` calls), then nav,
   then SEO, then book.

5. **Book chapter resolution depends on `nav-path` (point 1) and on
   the page list having complete URLs.** Both conditions are met after
   §5.1 — book resolution can run anywhere after that, but conceptually
   belongs at the end of Phase 2 since it consumes the most.

The orchestrator order:

```
discover()                       // Phase 1
buildInfo = captureBuildInfo()   // Phase 2 part A
computeNav(pages, config)        // Phase 2 part B (§5.1–§5.6)
precomputeSeo(pages, config)     // Phase 2 part C (§5.7)
bookData = loadBookData(srcRoot) // Phase 2 part D (§5.8 loader)
resolveBookChapters(bookData, pages)  // Phase 2 part D (§5.8 resolver)
// Phase 3+ ...
```

`captureBuildInfo()` should be issued early as a `Promise` and awaited
right before assembling the `site` object — its two `git` shell-outs
are I/O-bound (~10 ms total) and can overlap with the CPU-bound nav
work for free.

---

## 5. Per-substep specifications

### 5.1. `nav-path`

**Purpose.** Slash-joined `grand_parent / parent / title` chain, stored
on each titled page as `page.navPath`. Selector key for book.yml's
`nav_page` / `nav_pages` entries — sweeps pages by their position in
the nav tree rather than by URL prefix.

**Algorithm** (port of `_plugins/nav-path.rb`):

```js
for (const page of pages) {
  const title = page.frontmatter.title;
  if (!title) continue;
  const parts = [];
  if (page.frontmatter.grand_parent) parts.push(page.frontmatter.grand_parent);
  if (page.frontmatter.parent)        parts.push(page.frontmatter.parent);
  parts.push(title);
  page.navPath = parts.join("/");
}
```

**Edge cases:**

- Page with no `title` → no `navPath` field added. Matches the Ruby
  plugin's `next unless title`.
- Page with `parent` but no `grand_parent` → two segments (e.g.
  `"Reference Section/Operators"`).
- Page with both → three segments.
- Page with `grand_parent` but no `parent` → two segments
  (`"grand_parent/title"`). Unusual but valid; matches the Ruby
  plugin's behaviour.

### 5.2. `nav-integrity-check`

**Purpose.** Abort the build when any nav-visible page declares a
`parent:` that doesn't uniquely identify exactly one other nav-visible
page. Catches two failure modes the upstream just-the-docs nav silently
papers over:

- **Ambiguity** — multiple pages share the title declared in `parent:`,
  and the child has no `grand_parent:` (or its `grand_parent:` still
  matches more than one candidate). The child would silently appear
  under every matching parent.
- **Orphan** — no page has the title declared in `parent:`, or the
  `grand_parent:` filter eliminates every candidate. The child would
  silently disappear from the sidebar.

**Algorithm** (port of `_plugins/nav-integrity-check.rb`):

1. Build `byTitle: Map<title, Page[]>` over nav-visible pages (titled
   AND not `nav_exclude`).
2. For each nav-visible `P` with `frontmatter.parent`:
   - Look up `candidates = byTitle.get(P.frontmatter.parent)`.
   - 0 candidates → orphan; record `{ page: P, reason: "no page titled X exists" }`.
   - 1 candidate → unambiguous, pass.
   - 2+ candidates and no `P.frontmatter.grand_parent` → ambiguous.
   - 2+ candidates with `grand_parent`:
     - Filter by `c.frontmatter.parent === grand_parent`.
     - 0 remain → orphan.
     - 1 remain → disambiguated, pass.
     - 2+ remain → still ambiguous.
3. If any ambiguous or orphan entries collected, log all of them to
   stderr and throw — same shape as the Ruby plugin's report. The error
   message must include the source `srcRel` of each affected page so
   the failure points at a fix-able file.

**Throw, don't return.** The orchestrator does not need to handle
this — an integrity failure should abort the build before any
downstream phase wastes work. PLAN.md verifies output by `diff -rq`
against Jekyll's output; an aborted build there is a clear signal.

### 5.3. `nav-tree`

**Purpose.** The deeply nested array the sidebar template iterates.
Each node is `{ title, url, children: Array<NavNode> }` — already
filtered (no `nav_exclude` pages) and sorted (per the four-bucket sort
in §6.2), with `child_nav_order: desc/reversed` reversal applied. The
template (Phase 4) recurses this without doing any filter / group /
sort work itself.

**Output shape:**

```js
type NavNode = {
  title: string,        // page.frontmatter.title verbatim
  url: string,          // page.permalink verbatim
  children: NavNode[],  // empty array for leaves
};

site.navTree: NavNode[];  // top-level pages in render order
```

**Algorithm** (port of `_plugins/nav-tree-precompute.rb`):

1. Compute `topLevel`: pages with no `parent`, filtered to non-`nav_exclude`,
   sorted (§6.2).
2. From the shared state, get `orderedChildren: Map<url, Page[]>`.
3. Walk top-down, building `NavNode` hashes:
   - `chain` accumulates the URLs visited so far (cycle defence —
     drop any child whose URL is already in `chain`).
   - At each node, materialise its children recursively up to
     `MAX_DEPTH = 16`.
4. Return `navTree` as the array of top-level NavNodes.

**Why the cycle defence by URL, not by reference.** A page might
appear under multiple parents (the same `child` Page object can be in
two different parents' `orderedChildren` arrays — see §5.4's
"Constants Module" example). The same Page reaching itself via a
different parent chain is *not* a cycle in the source data — the
cycle is "A's child list contains B, B's child list contains A". URL
comparison catches that directly; reference comparison would too in
this case, but URL is the conceptually correct test.

**Duplicates are preserved.** When a child has `parent: X` and two
pages are titled "X" (and the child has no disambiguating
`grand_parent`), the same child appears in both parents' `children`
arrays. The nav-integrity-check (§5.2) catches this as ambiguity, so
in practice this only happens to pages the maintainers have
explicitly opted into duplication for. The walker doesn't need to
deduplicate.

### 5.4. `nav-levels`

**Purpose.** Per-page positional coordinates `[1, i, j, k, ...]` for the
nav-activation CSS. The CSS uses `:nth-child()` selectors driven by
these indices to bold the current page's link, unfold its ancestor
collections, and rotate their expander icons — the no-JS fallback.

**Output shape:**

```js
page.navLevels: Array<Integer> | undefined;
```

The array shape, mirroring the upstream just-the-docs algorithm
byte-for-byte:

| Index | Meaning |
|---|---|
| `[0]` | Collection-prefix index. Always `1` on this site (no `just_the_docs.collections` configured). |
| `[i]` for `i >= 1` | 1-based position of the *i*-th ancestor in its parent's sorted, nav-filtered children list. |
| `.length` | `pageDepth + 1` where `pageDepth = 1` for top-level pages, 2 for their children, etc. |

`undefined` when the page is not in the nav (no title, `nav_exclude:
true`, broken parent chain, or filtered out everywhere by
grand_parent disambiguation).

**Algorithm** (port of `_plugins/nav-levels-precompute.rb`):

1. Compute `topLevel` (same as §5.3).
2. Build `topIndex: Map<url, Integer>` from `topLevel`'s 1-based
   positions.
3. From the shared state, get `orderedChildren` and derive
   `childIndex: Map<parentUrl, Map<childUrl, Integer>>` for O(1)
   child-position lookup.
4. Walk top-down in sorted order. The walker records `paths.get(url)`
   the *first time* it reaches each page (subsequent visits don't
   overwrite). Bound at `MAX_DEPTH = 16`; skip any child already in
   the current chain.
5. For each titled page, derive `navLevels` from its recorded chain:
   - `[1, topIndex.get(chain[0].url), childIndex.get(chain[0].url).get(chain[1].url), ...]`.
   - If the top-level page's URL isn't in `topIndex`, the page has no
     valid path — set `navLevels = undefined`.

**Why top-down + first-encounter.** Bottom-up walking from a page to its
parent works for the unambiguous majority, but breaks when the page's
declared `parent` matches multiple titled pages and there's no
disambiguating `grand_parent`. The upstream just-the-docs nav renders
such children under every matching parent (per §5.3); its activation
CSS uses whichever copy comes first in render order to anchor the
positional path. Mimicking that "first occurrence in render order"
without rendering the nav requires walking the tree top-down in sort
order and recording each page's chain on first encounter.

The canonical example on this site: `VbAppWinStyle` (and other VBA
constants enum pages) declares only `parent: Constants Module`, and
two pages on the site have that title — one under `VBA Package`, one
under `VBRUN Package`. The VBA constants render twice in the nav; the
activation CSS uses the first occurrence (the VBA one in this case,
since VBA sorts before VBRUN alphabetically). Our top-down walker
visits the VBA branch first and records the chain there, so subsequent
visits to the same `VbAppWinStyle` Page (via the VBRUN branch) leave
the recorded chain alone.

### 5.5. `breadcrumbs`

**Purpose.** Per-page root-first ancestor chain `[{ title, url }, ...]`.
The breadcrumb-strip template iterates this directly.

**Output shape:**

```js
page.breadcrumbs: Array<{ title: string, url: string }>;
```

Empty array for top-level pages (those without `parent`). The current
page itself is *not* in the chain — the template renders it
separately as a `<span>` after the loop.

**Algorithm** (port of `_plugins/breadcrumbs-precompute.rb`):

1. From the shared state, get `byTitle: Map<title, Page[]>`.
2. For each titled page, walk the parent chain upward up to
   `MAX_DEPTH = 8`:
   - At each step, look up the next ancestor via
     `resolveParent(parentTitle, grandParentTitle, byTitle)`.
   - When candidates is a list of more than one and `grandParentTitle`
     is set, narrow to those whose own `parent === grandParentTitle`.
     Fall back to `candidates[0]` if no narrowed match (the convention
     on this site is to declare `grand_parent` only when needed, so
     fall-through is safe).
   - Prepend `{ title: ancestor.frontmatter.title, url: ancestor.permalink }`
     to the chain and step up.
3. Store the chain on `page.breadcrumbs`.

**Why MAX_DEPTH = 8, not 16.** The deepest legitimate chain on this
site is 5 (Reference Section → Packages → VBA Package → Strings
Module → Len). 8 leaves headroom and guarantees termination on
accidental cycles. The nav-tree/nav-levels MAX_DEPTH of 16 is more
generous because those walkers go top-down through the whole tree (16
is the max nesting depth); breadcrumbs walks upward from a single
page, so the bound is the max depth a single page can be at.

**Note on `byTitle` over nav-visible vs. all titled pages.** The Ruby
breadcrumbs plugin uses `titled = site.pages.select { |p| p.data["title"] }`
— it does NOT filter `nav_exclude` out. So an ancestor that's
`nav_exclude: true` still appears in breadcrumbs. This is intentional:
breadcrumbs aren't a navigation surface, they're a position marker. The
JS port matches this — use the `byTitle` map built over all titled
pages, not just nav-visible ones.

### 5.6. `children`

**Purpose.** Per-page list of immediate nav children with optional
summaries, for the auto-generated TOC at the bottom of any parent page
where `frontmatter.has_toc !== false`. The Ruby plugin produces an
array of plain hashes; we do the same.

**Output shape:**

```js
page.children: Array<{ title: string, url: string, summary: string | undefined }>;
```

Empty array for leaf pages (those that nothing declares as `parent`).

**Algorithm** (port of `_plugins/children-precompute.rb`):

1. From the shared state, get `byParentTitle: Map<title, Page[]>`.
2. For each titled page, find its candidate children
   (`byParentTitle.get(page.frontmatter.title) || []`).
3. Filter: drop children whose `grand_parent` is set AND mismatches
   `page.frontmatter.parent`. (Children with no `grand_parent` pass
   unconditionally — the same disambiguation rule §5.3 / §5.4 apply.)
4. Sort with the four-bucket precedence (§6.2). Reverse when
   `page.frontmatter.child_nav_order` is `"desc"` or `"reversed"`.
5. Map each survivor to `{ title, url, summary }`.

**No `nav_exclude` filter.** Unlike `nav-tree` and `nav-levels`, the
children list does NOT filter `nav_exclude: true` pages. The auto-TOC
at the bottom of a parent should include every sub-page regardless of
sidebar visibility. The Ruby plugin matches the upstream behaviour
(`children_nav.html` iterates `site.html_pages | group_by: "parent"`,
which doesn't filter `nav_exclude`).

**Summary field handling.** `page.frontmatter.summary` may be:

- A string → emitted as-is.
- Missing → JS `undefined`. The template guards with `if (summary)`.
- Other types (number, boolean, list) → not used on this site;
  pass through whatever the YAML parser produced. If a future
  page sets `summary: 42`, the template renders `42`.

### 5.7. `seo`

**Purpose.** Per-page SEO metadata for the `<head>` block (canonical
URL, og:title, og:url, og:site_name, JSON-LD WebPage/WebSite) plus
site-level constants (site title, logo URL).

**Output shape:**

```js
page.seoTitle:     string;
page.seoFullTitle: string;
page.seoCanonical: string;
page.seoIsHome:    boolean;

site.seoSiteTitle: string;
site.seoLogoUrl:   string | null;
```

**Algorithm** (port of `_plugins/seo-precompute.rb`):

1. Compute `seoSiteTitle` = `renderTitle(config.title)`.
2. Compute `seoLogoUrl` = `config.logo ? uriEscape(absoluteUrl(config.logo, config)) : null`.
3. For each page:
   - `rawTitle = page.frontmatter.title`.
   - `seoTitle = rawTitle ? renderTitle(rawTitle) : seoSiteTitle`.
   - `seoFullTitle = (seoTitle === seoSiteTitle) ? seoTitle : `${seoTitle} | ${seoSiteTitle}`.
   - `canonicalInput = page.permalink.replace(/\/index\.html$/, "/")`.
   - `seoCanonical = absoluteUrl(canonicalInput, config)`.
   - `seoIsHome = HOMEPAGE_URLS.has(page.permalink)`.

Where:

- `renderTitle(text)` = `escapeOnce(normalizeWhitespace(stripHtml(markdownify(text))))`,
  the same pipeline the Ruby plugin runs. See §6.3 for the helper
  details.
- `absoluteUrl(input, config)` = if `input` is already absolute, return
  it. Else compute `relativeUrl(input, config)` (= `(baseurl || "") +
  ensureLeadingSlash(input)`), prepend `config.url`, then normalize via
  URL parsing.
- `uriEscape(input)` = percent-encode any character that needs it.
  Equivalent to Ruby's `Addressable::URI.normalize_component`.
- `HOMEPAGE_URLS` = `new Set(["/", "/index.html", "/index.htm", "/about/", "/about/index.html", "/about/index.htm"])`.

**Markdownification.** The Ruby version calls Jekyll's kramdown
converter. The JS version should use the same markdown-it instance
Phase 3 will set up. If markdown-it isn't initialised yet when Phase 2
runs (it doesn't need to be — Phase 3 sets it up), Phase 2 instantiates
its own minimal markdown-it for title rendering. Differences between
the two parsers would only matter for the 2 of 836 page titles that
contain markdown-active characters; for byte-exact parity with the Ruby
output, the implementer should diff those 2 pages' rendered titles
against Jekyll's output and adjust if needed.

**URL absolutisation.** The Ruby plugin uses `Addressable::URI` for both
parsing and normalisation. In JS, Node's built-in `URL` works for
absolute URLs but doesn't always match Addressable on edge cases (e.g.
trailing-slash handling on the origin). For this site, `config.url`
is `"https://docs.twinbasic.com"` (no trailing slash) and `baseurl` is
empty, so the concatenation is straightforward. The implementer should
keep the helper small (no regex normalisation), and verify byte-parity
via Phase 1's `verify-phase1.mjs`-style harness extended for Phase 2.

### 5.8. Book chapter resolution

**Purpose.** Walk `_data/book.yml` once and resolve every entry's
chapter list to an `Array<Page>` plus pre-resolve `landing_page` /
`foreword_page` references. The Phase 8 renderer iterates the resolved
data without doing any selector matching.

**Output (mutated on `bookData` in place):**

For front-matter entries:

```js
bookData.front_matter[i]._chapters: Page[];
```

For flat parts:

```js
bookData.parts[i]._chapters:     Page[];
bookData.parts[i]._landing:      Page | undefined;  // optional pre-resolve
bookData.parts[i]._foreword:     Page | undefined;  // optional pre-resolve
```

For chaptered parts:

```js
bookData.parts[i]._foreword:                       Page | undefined;
bookData.parts[i]._landing:                        Page | undefined;
bookData.parts[i].chapters[j]._chapters:           Page[];
bookData.parts[i].chapters[j]._landing:            Page | undefined;
```

The Ruby plugin precomputes `_chapters` but leaves the `landing_page` /
`foreword_page` lookups to `book.html` (each is a `where: "url"` filter
call). Since `where: "url"` is O(n) over all pages and we're already
iterating the book here, pre-resolving them too has zero marginal cost
and saves Phase 8 from re-walking `pages[]`. Recommended.

**Algorithm** (port of `_plugins/book-resolve-chapters.rb` + `book-sort.rb`):

1. Load `_data/book.yml` via `js-yaml` (or any YAML parser).
2. For each `front_matter[]` entry:
   - `_chapters = sortByNavOrder(collectMatches(entry, pages))`.
3. For each `parts[]` entry:
   - If `entry.chapters` is set (chaptered part):
     - Pre-resolve `entry._foreword` and `entry._landing` from
       `entry.foreword_page` / `entry.landing_page` via URL lookup.
     - For each `chapter` in `entry.chapters`:
       - `chapter._chapters = buildChapterList(chapter, pages)`.
       - `chapter._landing` from `chapter.landing_page`.
   - Else (flat part):
     - `entry._chapters = buildChapterList(entry, pages)`.
     - Pre-resolve `entry._foreword` / `entry._landing` from URLs.

Where:

- `buildChapterList(entry, pages)`:
  1. Start with `[entry._landing]` if landing exists.
  2. Add `collectMatches(entry, pages)` minus the landing page.
  3. Sort the second list via `sortByNavOrder`, leave the landing at
     position 0.
- `collectMatches(entry, pages)`:
  - For each URL prefix in `entry.page` / `entry.pages`:
    - If `entry.no_descent` → exact equality (`page.permalink === prefix`).
    - Else → substring match (`page.permalink.includes(prefix)`).
  - For each nav-path prefix in `entry.nav_page` / `entry.nav_pages`:
    - If `entry.no_descent` → exact equality (`page.navPath === np`).
    - Else → substring match (`(page.navPath || "").includes(np)`).
  - Concatenate all hits in declaration order; the sort step
    dedupes.
- `sortByNavOrder(pages)`: see §6.4.

**Type carriers.** The Ruby `sort_by_nav_order` filter handles three
input types (Jekyll::Page, Drops::PageDrop, Hash) because Liquid
passes pages through filters in any of those shapes. In JS we only
have one carrier (the Page object), so the helpers `pageUrl(p)` and
`pageAttr(p, key)` from the Ruby version collapse to direct field
accesses. The implementer should NOT port the three-way dispatch —
it's dead complexity in JS.

**`page` vs `nav_page` semantics:**

| Selector | Match against | Default | With `no_descent` |
|---|---|---|---|
| `page: "/Foo"` | `permalink` | `includes("/Foo")` | `=== "/Foo"` |
| `pages: ["/Foo", "/Bar"]` | `permalink` | `includes(prefix)` per entry | `=== prefix` per entry |
| `nav_page: "Reference Section/Operators"` | `navPath` | `includes(np)` | `=== np` |
| `nav_pages: [...]` | `navPath` | `includes(np)` per entry | `=== np` per entry |

A page with no `navPath` (untitled) is treated as having `navPath ===
""` for the comparison — matches `includes("")` (always true, but no
untitled pages have selectors in book.yml today) but not `=== np` for
any non-empty `np`.

### 5.9. `build-info`

**Purpose.** Stamp the PDF title page with `Built <date> from commit
<short-hash> (<commit-date>).` Used only by Phase 8 (`book.html`), but
captured here because it's a one-time pre-render operation and natural
to bundle with the other site-level state.

**Output:**

```js
site.buildInfo: { commit: string, commitDate: string };
```

Values:

- `commit` — output of `git rev-parse --short HEAD`, stripped, or
  `"unknown"` when the shell-out fails (no `git` on PATH, not a repo).
- `commitDate` — output of `git log -1 --format=%cs`, stripped (ISO
  short date format, e.g. `"2026-05-16"`), or `"unknown"`.

**Algorithm** (port of `_plugins/build-info.rb`):

```js
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

export async function captureBuildInfo() {
  const [commit, commitDate] = await Promise.all([
    git("rev-parse", "--short", "HEAD"),
    git("log", "-1", "--format=%cs"),
  ]);
  return { commit, commitDate };
}

async function git(...args) {
  try {
    const { stdout } = await exec("git", args);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}
```

**Why `execFile`, not `exec`.** The arguments are fixed (no
user-supplied paths or args); `execFile` avoids spawning a shell and
sidesteps quoting concerns on Windows. Both `git` calls run in
parallel via `Promise.all` — ~10 ms total wall-time on a warm OS.

**Fallback policy.** On error (git missing, not a repo, EPERM,
whatever), the field becomes `"unknown"` — no throw, no warn. The
Phase 8 template handles `"unknown"` with a degraded message
("Built <date>." instead of "Built <date> from commit X (Y)."). The
Ruby plugin uses the same fallback for the same reason: an offline
tarball install shouldn't break the build.

---

## 6. Shared helpers (inside `nav.mjs`)

### 6.1. `buildSharedNavState(pages, config)`

Returns the structures the nav substeps all consume:

```js
{
  titled,            // Page[] — pages with non-empty frontmatter.title
  byTitle,           // Map<title, Page[]>
  byParentTitle,     // Map<parentTitle, Page[]>; empty-string key holds
                     //   top-level pages (parent missing or empty)
  caseInsensitive,   // boolean — config.nav_sort === "case_insensitive"
  topLevel,          // Page[] — sorted, nav_exclude-filtered top-level
  orderedChildren,   // Map<url, Page[]> — sorted, filtered children
                     //   per parent.url (applies grand_parent
                     //   disambiguation and child_nav_order reversal)
}
```

The build:

```js
const titled = pages.filter(p => isNonEmptyString(p.frontmatter.title));
const byTitle = groupBy(titled, p => p.frontmatter.title);
const byParentTitle = groupBy(titled, p =>
  isNonEmptyString(p.frontmatter.parent) ? p.frontmatter.parent : ""
);
const caseInsensitive = config.nav_sort === "case_insensitive";

const topLevel = sortPages(
  (byParentTitle.get("") || []).filter(p => !p.frontmatter.nav_exclude),
  caseInsensitive,
);

const orderedChildren = new Map();
for (const parent of titled) {
  orderedChildren.set(parent.permalink, orderedChildrenFor(parent, byParentTitle, caseInsensitive));
}
```

### 6.2. `sortPages(pages, caseInsensitive)`

The four-bucket sort that just-the-docs uses for nav items. Ports
`_includes/components/nav/sorted.html` and the matching `sort_pages`
methods in the Ruby plugins.

```js
function sortPages(pages, caseInsensitive) {
  const navNum = [], navStr = [], titleNum = [], titleStr = [];
  for (const p of pages) {
    if (p.frontmatter.nav_order != null) {
      (typeof p.frontmatter.nav_order === "number" ? navNum : navStr).push(p);
    } else {
      (typeof p.frontmatter.title === "number" ? titleNum : titleStr).push(p);
    }
  }
  navNum.sort((a, b) => a.frontmatter.nav_order - b.frontmatter.nav_order);
  navStr.sort((a, b) => cmp(sortKey(a.frontmatter.nav_order, caseInsensitive),
                            sortKey(b.frontmatter.nav_order, caseInsensitive)));
  titleNum.sort((a, b) => a.frontmatter.title - b.frontmatter.title);
  titleStr.sort((a, b) => cmp(sortKey(a.frontmatter.title, caseInsensitive),
                              sortKey(b.frontmatter.title, caseInsensitive)));
  return [...navNum, ...navStr, ...titleNum, ...titleStr];
}

function sortKey(value, caseInsensitive) {
  const s = String(value);
  return caseInsensitive ? s.toLowerCase() : s;
}

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
```

**Why the buckets.** Pages with numeric `nav_order` come first, then
string `nav_order`, then pages without `nav_order` sorted by title
(numeric titles first). Mixing numbers and strings in one sort would
either coerce both to strings (so `10` sorts before `2`) or both to
numbers (so non-numeric strings become NaN). The bucket scheme is
just-the-docs's convention; matching it is the only way to get
byte-equivalent rendered HTML.

**Type detection.** Ruby's `value.is_a?(Numeric)` matches Integer +
Float. The YAML loader (js-yaml) produces `Number` for both YAML int
and YAML float; `typeof v === "number"` is the JS equivalent.

### 6.3. `renderTitle(text, markdown)` (for §5.7)

```js
const STRIP_HTML_BLOCKS = /<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>/gms;
const STRIP_HTML_TAGS = /<\/?[^>]+>/g;
const HTML_ESCAPE_ONCE_REGEXP = /["><']|&(?!([a-zA-Z]+|(#\d+));)/g;
const HTML_ESCAPE = { "&": "&amp;", ">": "&gt;", "<": "&lt;", '"': "&quot;", "'": "&#39;" };

function renderTitle(text, markdown) {
  if (text == null) return "";
  const s = String(text);
  if (s === "") return "";
  const html = markdown.render(s);              // markdown-it
  const stripped = html.replace(STRIP_HTML_BLOCKS, "").replace(STRIP_HTML_TAGS, "");
  const collapsed = stripped.replace(/\s+/g, " ").trim();
  return collapsed.replace(HTML_ESCAPE_ONCE_REGEXP, m => HTML_ESCAPE[m]);
}
```

**Mirrors the Liquid filter chain `text | markdownify | strip_html |
normalize_whitespace | escape_once`.** Constants ported from
`Liquid::StandardFilters` (the Ruby plugin's source for them) — Liquid
applies them globally, so they're worth matching verbatim.

**Trailing newline from markdown-it.** `markdown-it.render()` returns
the rendered HTML with a trailing `\n`. `normalize_whitespace`'s
`/\s+/g → " "` plus `.trim()` strips it back out. No special case
needed.

### 6.4. `sortByNavOrder(pages)` (for §5.8)

```js
function sortByNavOrder(pages) {
  pages = [...new Set(pages)];                    // dedupe

  const indexUrls = pages
    .filter(p => p.permalink.endsWith("/"))
    .map(p => p.permalink);

  const groups = new Map();
  for (const p of pages) {
    const url = p.permalink;
    let key;
    if (url.endsWith("/")) {
      key = url;
    } else {
      const owners = indexUrls.filter(iu => url.startsWith(iu));
      key = owners.length ? owners.reduce((a, b) => a.length >= b.length ? a : b) : url;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const sortedGroups = new Map();
  for (const [k, members] of groups) sortedGroups.set(k, sortWithinGroup(members));

  const orderedKeys = [...sortedGroups.keys()].sort((kA, kB) => {
    const a = sortedGroups.get(kA)[0], b = sortedGroups.get(kB)[0];
    const aOrder = a.frontmatter.nav_order ?? Infinity;
    const bOrder = b.frontmatter.nav_order ?? Infinity;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.frontmatter.title || "").toLowerCase()
      .localeCompare((b.frontmatter.title || "").toLowerCase());
  });

  return orderedKeys.flatMap(k => sortedGroups.get(k));
}

function sortWithinGroup(members) {
  const indexes = members.filter(p => p.permalink.endsWith("/"))
    .sort((a, b) => a.permalink < b.permalink ? -1 : a.permalink > b.permalink ? 1 : 0);
  const leaves = members.filter(p => !p.permalink.endsWith("/"));
  const withOrder = leaves.filter(p => p.frontmatter.nav_order != null);
  const withoutOrder = leaves.filter(p => p.frontmatter.nav_order == null);
  withOrder.sort((a, b) => {
    const cmp = a.frontmatter.nav_order - b.frontmatter.nav_order;
    if (cmp !== 0) return cmp;
    return (a.frontmatter.title || "").toLowerCase()
      .localeCompare((b.frontmatter.title || "").toLowerCase());
  });
  withoutOrder.sort((a, b) =>
    (a.frontmatter.title || "").toLowerCase()
      .localeCompare((b.frontmatter.title || "").toLowerCase()));
  return [...indexes, ...withOrder, ...withoutOrder];
}
```

**Different sort from §6.2.** `sortByNavOrder` (used by book chapter
resolution) clusters index pages with their leaves and uses mixed
numeric/title comparison; `sortPages` (used by nav) buckets by type.
They are NOT interchangeable. Keep them separate, with header
comments noting they exist for different purposes.

The Ruby `book-sort.rb` plugin has the canonical write-up of why
folder-style indexes group with their leaves — read its header
comment when porting.

---

## 7. Design decisions and assumptions

### D1. Mutate `pages[]` in place rather than return a new array

Matches Phase 1's `Page` shape (each page is a record that accumulates
fields phase by phase) and the Ruby plugins (which mutate
`page.data`). Alternative: return a parallel `Map<permalink, ComputedFields>`.
Rejected because the template phase wants one record per page, not
two records joined by URL.

### D2. CamelCase for computed fields, snake_case for verbatim YAML

Phase 1 set the precedent: `srcPath` / `destPath` (camelCase) for
computed, `frontmatter.permalink` / `frontmatter.nav_order` (verbatim
YAML) for raw. Phase 2 extends the same: `page.navTree`,
`page.breadcrumbs`, `page.seoTitle` are computed → camelCase;
`page.frontmatter.nav_order`, `bookData.parts[0].landing_page` are
verbatim YAML → snake_case.

The Ruby plugins use snake_case throughout because Ruby and Liquid
both standardise on it. Our JS templates standardise on camelCase, so
that's what they expect to read.

### D3. One `nav.mjs` module, not six

The six nav-related Ruby plugins all consume the same shared state
(titled set, byTitle / byParentTitle maps, four-bucket sort,
ordered-children map). Splitting them across six JS modules would
force each to rebuild the state or import it from a seventh "shared
state" module. One module shares the state implicitly and keeps the
related logic in one place. ~600 lines, manageable.

If a future maintainer wants to split, the substeps are mechanically
extractable — each is a function that takes `(pages, state)` and
returns or mutates.

### D4. Bundle `build-info` into Phase 2

The git shell-out is conceptually independent of the rest of Phase 2,
but it's a one-time pre-render compute that produces a site-level
field. Putting it anywhere else (Phase 1 / Phase 8 / its own phase)
splits the "what's on `site.*`?" surface across more modules without
benefit. It's a 30-line module; the cost of having it sit next to
`nav.mjs` is negligible.

### D5. Pre-resolve `landing_page` / `foreword_page` in `book.mjs`

The Ruby plugin precomputes `_chapters` but leaves the single-page
landing/foreword lookups to `book.html`'s Liquid `where: "url"`
filter. We're already iterating `pages[]` for `_chapters`; adding two
more URL → Page lookups in the same pass is free. Phase 8 then has no
pages-walk at all — pure data assembly.

### D6. `markdown-it` is shared between Phase 2 and Phase 3

SEO precompute (§5.7) needs to markdownify page titles. Phase 3 needs
markdown-it for the body content. Sharing one instance is fine —
markdown-it is stateless across `.render()` calls (configuration is
fixed at construction).

If Phase 2 runs before Phase 3 has constructed its markdown-it,
Phase 2 has to construct its own. Two acceptable resolutions:

1. Construct the markdown-it instance in Phase 2 and pass it to Phase 3.
2. Construct a minimal markdown-it (no syntax-highlighting, no extras)
   in Phase 2 just for title rendering. Phase 3 builds its own with
   the full plugin chain. The output is the same for the ~2 page
   titles that contain markdown.

Recommended: option 2. Phase 2 doesn't want a Shiki dependency. Title
rendering doesn't need GFM tables, syntax highlighting, or the
admonition plugin. A bare-bones markdown-it is ~100 KB and starts in
<10 ms.

### D7. Throw on integrity check failure, don't return

`nav-integrity-check` (§5.2) should `throw new Error(...)` with a
multi-line message listing every offending page. The orchestrator's
top-level `.catch()` in `tbdocs.mjs` already prints the error and exits
non-zero. Same end-user experience as Jekyll's `Jekyll::Errors::FatalException`.

Alternative: return an array of errors and let the orchestrator decide
what to do. Rejected because there's nothing useful to do — every
downstream phase assumes the nav graph is well-formed.

### D8. `MAX_DEPTH` constants stay as Ruby

- `MAX_DEPTH = 16` in nav-tree and nav-levels (top-down walk; max nesting depth).
- `MAX_DEPTH = 8` in breadcrumbs (bottom-up walk; max single-page depth).

The Ruby comments justify these numbers from the deepest legitimate
chain on the site (5). The JS port keeps the same numbers. Bumping
either would only matter on cycle-defence (where larger means more
work before bailing out); the legitimate case never gets close.

### D9. URL absolutisation uses Node's built-in `URL`, not a dependency

The Ruby plugin uses `Addressable::URI` because Ruby's stdlib `URI`
has rough edges around normalisation. Node's `URL` is good enough for
our use: `config.url` is a clean absolute origin, `baseurl` is empty,
and the canonical inputs are always rooted paths. The implementer
should verify byte-parity for the SEO `canonical` and `og:url` fields
via diff against Jekyll's output during Phase 2 acceptance.

### D10. `pages[]` keeps its Phase 1 sort order

The Phase 1 array is sorted by `srcRel`. Phase 2 doesn't re-sort
`pages[]` itself; it sorts subsets (top-level, children of a parent,
etc.) for its own purposes. The `pages[]` order matters for
determinism of build output, not for the algorithms in Phase 2.

### D11. Don't precompute `page.url` aliases

Jekyll exposes `page.url` (the canonical URL) and Liquid filters can
do `page.url | relative_url`. In our JS world, `page.permalink` is
the canonical URL (see PLAN-1.md §8). The template phase will call a
`relativeUrl(page.permalink, fromPage)` helper. Phase 2 does NOT
precompute `page.url` or `page.relativeUrl` — that's Phase 4's job.

### D12. `book.html` is treated like every other page in nav/SEO

`book.html` has `permalink: /book.html`, no `title`, `sitemap: false`.

- `navPath`: not added (no title).
- `breadcrumbs`: not added (only titled pages get this).
- `children`: not added.
- `navLevels`: not added.
- `seoTitle`: falls back to `seoSiteTitle` (no title).
- `seoFullTitle`: collapses to `seoSiteTitle`.
- `seoCanonical`: `<site.url>/book.html`.
- `seoIsHome`: false (not in HOMEPAGE_URLS).

No special case needed in Phase 2. Phase 8 retrieves `book.html` by
URL when rendering the PDF.

### D13. `_data/book.yml` is loaded inside `book.mjs`

Per PLAN-1.md D4, Phase 1 does not load `_data/`. Phase 2's
`book.mjs` is the only consumer of `_data/book.yml`, so it owns the
read. The orchestrator passes `srcRoot`; the module reads
`<srcRoot>/_data/book.yml` itself.

If a future generic data-loader module appears (covering
`site.data.*` more broadly), the book.yml load would move there. None
of the other data files are currently used; `site.data.build` (the
build-info plugin) is set programmatically, not from a file.

---

## 8. Edge cases

### Nav

| Case | Handling |
|---|---|
| Page with `title` but `nav_exclude: true` | In `titled`, in `byTitle`, in `byParentTitle`. NOT in `topLevel` (filtered out). NOT in any parent's `orderedChildren` (filtered out). Gets `navPath` (only requires title). Gets `breadcrumbs` (titled-only filter). Gets `children` (titled-only filter). Does NOT get `navLevels` (the walker never reaches it). |
| Page with no `title` | Not in `titled`. No `navPath`, no `breadcrumbs`, no `children`, no `navLevels`. |
| Page with `parent` matching a non-existent title | nav-integrity-check raises orphan diagnostic and aborts the build. |
| Page with `parent` matching multiple titles, no `grand_parent` | nav-integrity-check raises ambiguity diagnostic and aborts the build (unless the duplication is intentional and the maintainers accept the dual nav placement — current site does have this for VBA/VBRUN Constants Module children, so the check does NOT abort on those; see §5.2 for the resolution logic). |
| Page with `parent` matching multiple titles + `grand_parent` that disambiguates to exactly one | Pass; uses the disambiguated parent. |
| Page with `parent` matching multiple titles + `grand_parent` that doesn't match any | nav-integrity-check raises orphan diagnostic (the `grand_parent` filter rejected all candidates). |
| Page with `child_nav_order: "desc"` | Its `orderedChildren` is reversed after sort. Affects navTree, navLevels, and children-precompute identically. |
| Page declaring itself as its own parent (`parent: <same as title>`) | Cycle defence kicks in: the page never appears as its own child in `orderedChildren`. The walker continues past it. |
| Deeper cycle (A → B → A) | Cycle defence (URL membership in current `chain`) catches it at the closing edge. The opening edge succeeds. Cycle never makes it to navTree. |
| Top-level page list is empty | navTree is `[]`. Template renders an empty nav list. Should never happen on this site. |

### Breadcrumbs

| Case | Handling |
|---|---|
| Top-level page (no `parent`) | `breadcrumbs = []`. |
| Page with `parent` that has no `parent` itself | `breadcrumbs = [{ title: ..., url: ... }]` — one entry. |
| Parent chain that runs 9+ levels deep | Walker hits `MAX_DEPTH = 8` and stops. The truncated chain is what gets stored. (Doesn't happen on this site; the deepest is 5.) |
| Ancestor that has `nav_exclude: true` | Still appears in the chain (breadcrumbs walks all titled pages, not just nav-visible ones — §5.5 rationale). |

### Children

| Case | Handling |
|---|---|
| Leaf page (no other page declares it as parent) | `children = []`. |
| Parent page with mix of `nav_exclude: true` and not | All children appear in the list — children-precompute does not filter `nav_exclude` (§5.6 rationale). |
| Child without `summary` | The `summary` field is `undefined`. Template uses `if (summary)` to decide whether to render the dash + text. |
| Child with `child_nav_order` on the *child* (not the parent) | Ignored; `child_nav_order` only applies on the parent for its own children list. |

### SEO

| Case | Handling |
|---|---|
| Page with no `title` | `seoTitle = seoSiteTitle`. `seoFullTitle = seoSiteTitle`. |
| Page with `title` containing markdown-active chars (e.g. `&, &=`) | Render via markdown-it, strip HTML, escape-once. Output for `&, &=` is `&amp;, &amp;=`. |
| Page with `permalink: /index.html` | `seoCanonical` strips the `/index.html` to `/`. (No current page uses this; the rule covers the Jekyll defaulting behaviour the Ruby plugin replicates.) |
| Site with no `logo:` configured | `seoLogoUrl = null`. Template guards. |
| Site with no `url:` configured | `absoluteUrl()` falls through to just the relative URL. (Not the case here; `url:` is set.) |

### Book chapter resolution

| Case | Handling |
|---|---|
| Entry with both `page:` and `pages:` set | Both contribute; both apply the same `no_descent` rule. |
| Entry with both `page:` and `nav_page:` set | All four kinds contribute. Common case (no current entry uses this, but the schema supports it). |
| Page matched by multiple selectors on the same entry | Appears multiple times in `collectMatches` output. The `sortByNavOrder`'s `pages = [...new Set(pages)]` dedupe collapses it back to one. |
| Entry with `landing_page:` set but the URL doesn't match any page | `_landing = undefined`. The `_chapters` list still includes whatever the selectors swept in. Probably indicates a typo in book.yml; consider logging a warning. |
| Entry with `landing_page:` whose URL matches a page that ISN'T in `collectMatches`'s output | Landing still emitted first. Rest of `_chapters` is whatever the selectors found. |
| Chaptered part where `chapters[]` is empty | The part loop runs 0 times. The part divider still emits in Phase 8. |
| `no_descent: true` on a selector that's a single full URL | Equivalent to a `==` match; works the same as without `no_descent` when the URL exactly matches a single page. (Useful for `page: /` which would otherwise sweep *everything*.) |

---

## 9. What's NOT in Phase 2

These belong in later phases. Mentioned here so the implementer doesn't
get tempted.

- **Markdown → HTML rendering.** Phase 3. SEO title rendering is the
  only markdown call Phase 2 makes, and it's a tiny per-page operation
  on short strings.
- **Template rendering.** Phase 4. The `<style id="jtd-nav-activation">`
  block (which consumes `page.navLevels`) is emitted by the template,
  not Phase 2.
- **Heading anchor injection.** Phase 4.
- **HTML compression.** Phase 4.
- **Search index emission.** Phase 6.
- **Sitemap emission.** Phase 6 (and respects `frontmatter.sitemap === false`
  on `book.html`).
- **Redirect stub generation.** Phase 6 (consumes
  `frontmatter.redirect_from`).
- **`page.last_modified_date`** for the footer. Phase 4 reads it from
  `fs.stat()` or `frontmatter.last_modified_date`. Phase 2 doesn't
  plumb it through.
- **PDF assembly.** Phase 8 reads the `bookData` Phase 2 produces.
- **Offline URL rewriting.** Phase 7.
- **The `nav_path` selector is NOT extended to cover untitled pages**.
  An untitled page has no `navPath`. The book.yml `nav_page` /
  `nav_pages` selectors would never match it. (Currently no untitled
  page needs to be in the book.)

---

## 10. Verification

### Acceptance checklist for "Phase 2 is done"

1. After Phase 2 runs on the production tree:
   - `site.navTree` is an array of `NavNode` objects.
   - `site.navTree.length` matches the count of top-level nav pages
     in Jekyll's nav tree (currently 10 — Welcome, Frequently Asked
     Questions, Tutorials, Features, Reference Section, Packages,
     Documentation Development, Challenges, Videos, IDE — verify by
     parsing the first `<ul class="nav-list">` of `_site/index.html`
     and listing the `<a class="nav-list-link">` text at depth 1).
   - Every node has a non-empty `title`, a non-empty `url`, and a
     `children` array (possibly empty).
2. Every titled page has `navPath`, `breadcrumbs`, `children`. The
   ones reachable from a top-level page also have `navLevels`.
3. `navPath` for a known fixture matches the Ruby output:
   - `Reference/Operators.md` → `"Reference Section/Operators"`
   - `Reference/Core/Const.md` → `"Reference Section/Core Language Reference/Const"` (or whatever the parent chain dictates)
4. `breadcrumbs[0].url` for every titled non-top-level page equals
   the URL of an ancestor (root-first ordering).
5. `navLevels[0] === 1` for every page that has `navLevels` (the
   collection-prefix index is always 1).
6. `nav-integrity-check` aborts the build when a deliberately
   ambiguous fixture is introduced (test: temporarily add a page with
   `parent: Reference Section` and a non-unique title alongside
   another such page).
7. Every page has `seoTitle`, `seoFullTitle`, `seoCanonical`,
   `seoIsHome`. `site.seoSiteTitle` and `site.seoLogoUrl` are set.
8. For `index.md`: `seoIsHome === true`. The page has `title: Welcome`
   so `seoFullTitle === "Welcome | twinBASIC Documentation"` — only the
   `seoFullTitle === seoSiteTitle` collapse would fire if a page had no
   title (in which case `seoTitle` falls back to `seoSiteTitle` and the
   two compare equal). No current page on the site hits that branch,
   so the harness verifies `home.seoFullTitle` contains the site title
   rather than equals it.
9. For `Reference/Core/Concat.md` (title `"&, &="`):
   `seoTitle === "&amp;, &amp;="`.
10. `site.buildInfo.commit` matches `git rev-parse --short HEAD` in
    the working tree.
11. `bookData.front_matter[0]._chapters` is an array of one Page
    (the homepage, since the entry is `page: /` with `no_descent: true`).
12. `bookData.parts[0]._chapters` is undefined (the Features part is
    chaptered, not flat), but
    `bookData.parts[0].chapters[0]._chapters` is non-empty.
13. For a flat part (FAQ): `bookData.parts[1]._chapters` has the FAQ
    page.
14. Resolved `_chapters` are deduped — no page appears twice in a
    single entry's `_chapters`.

### Verification harness

`verify-phase2.mjs` (retired Phase 10) extends the `verify-phase1.mjs`
pattern. It:

1. Runs `discover()` then every Phase 2 substep, capturing per-substep
   wall time.
2. Asserts the items above against the production tree, plus a few
   structural sanity checks the original list left implicit
   (`navNode.children` is always an array, every breadcrumb URL points
   at a real page, every `_chapters` entry is unique, the planted-
   ambiguity test actually throws with an `/ambiguity/i` message).
3. Prints `OK <check>` per pass, `FAIL: <reason>` per failure, and
   exits non-zero on any failure.
4. Prints per-substep timings up front, with a `WARN` line if the
   total exceeds 1 s.

23 checks total in the shipped harness — the 14 items above plus the
expanded sanity checks. All 23 pass on the current production tree.

### Byte-for-byte parity check (deferred)

The ultimate test is "render with Jekyll, render with tbdocs through
Phase 4, diff the `_site/` outputs". This is impractical until Phase
4 lands. Until then, the verification harness above is the bar.

When Phase 4 ships, the targeted diff is:

- `_site/index.html` (homepage; touches navTree, breadcrumbs, SEO).
- `_site/tB/Core/Const.html` (typical reference page; touches
  breadcrumbs, navLevels, children).
- `_site/tB/Packages/index.html` (parent page with `children_in_nav`).
- `_site/book.html` (touches all of bookData resolution).

A clean diff on these four implies Phase 2 is producing the right data.

### Performance smoke check

The orchestrator and `verify-phase2.mjs` both print per-substep timings
already. From the repo root:

```sh
node builder/tbdocs.mjs              # one-line per-phase timings
node builder/verify-phase2.mjs      # full 23-check harness + timings
```

Measured wall time on the current Windows dev machine (mean of several
runs), with the soft regression target each substep is held to:

| Substep                              | Measured | Target |
|---|---|---|
| nav (path + integrity + tree + levels + breadcrumbs + children) | 28 ms | <40 ms |
| seo (markdown-it init + per-page render) | 21 ms | <100 ms |
| book chapter resolution              | 9 ms     | <10 ms |
| build-info (parallel `git` calls)    | ≤2 ms CPU, ~10 ms wall in parallel | <50 ms wall |
| **Phase 2 total**                    | **~60 ms** | **<200 ms** |
| Phase 1 (discover) for reference     | ~120 ms  | per PLAN-1 |
| **Phase 1+2 end-to-end**             | **~180 ms** | comfortably under the 2-3 s build goal |

markdown-it init turned out to be cheap (the `seo` substep covers init
+ markdownification of 838 page titles in 21 ms), so the
"dominated by markdown-it init" caveat the original target carried
didn't materialise. The Ruby equivalents this replaces sum to ~1.5 s in
Jekyll's GENERATE phase — about 25× the measured Phase 2 cost.

---

## 11. Dependencies needed for this phase only

Cumulative dependencies after Phase 2 (PLAN-1 already required the
first two):

```json
{
  "dependencies": {
    "gray-matter": "^4.0",
    "fast-glob": "^3.3",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0"
  }
}
```

New in Phase 2:

- `js-yaml` — `_config.yml` and `_data/book.yml` loader. gray-matter
  already pulls in `js-yaml` as a transitive dep, so this is a
  zero-byte add; declaring it explicitly makes the dependency visible
  in `package.json`.
- `markdown-it` — title rendering for SEO. Will also be the core of
  Phase 3.

No new dev dependencies. `verify-phase2.mjs` runs on the standard
Node runtime.

---

## 12. File layout after Phase 2

```
<repo root>/
  builder/
    PLAN.md             — architecture overview
    PLAN-1.md           — Phase 1 spec
    PLAN-2.md           — this file
    package.json        — js-yaml ^4.1 + markdown-it ^14.0 added
    discover.mjs        — Phase 1
    nav.mjs             — §5.1–§5.6 + §6.1–§6.2
    seo.mjs             — §5.7 + §6.3
    book.mjs            — §5.8 loader + resolver (Phase 8 renderer
                          lands here later)
    build-info.mjs      — §5.9
    tbdocs.mjs           — orchestrator extended (see below)
    verify-phase1.mjs   — Phase 1 harness (retired Phase 10)
    verify-phase2.mjs   — §10 acceptance harness (23 checks) (retired Phase 10)
  docs/                 — unchanged
```

### Extended `tbdocs.mjs` orchestrator

The shipped orchestrator (see [tbdocs.mjs](tbdocs.mjs) for the file):

```js
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "./discover.mjs";
import { computeNav } from "./nav.mjs";
import { precomputeSeo } from "./seo.mjs";
import { loadBookData, resolveBookChapters } from "./book.mjs";
import { captureBuildInfo } from "./build-info.mjs";

async function main() {
  const { src } = parseArgs(process.argv.slice(2));
  const srcRoot = path.resolve(process.cwd(), src);

  const t = makeTimer();
  const { pages, staticFiles } = await discover(srcRoot);
  t.lap("discover");

  // Issue build-info immediately so the git shell-outs overlap with the
  // CPU-bound nav work.
  const buildInfoPromise = captureBuildInfo();

  const config = yaml.load(await fs.readFile(path.join(srcRoot, "_config.yml"), "utf8"));
  const { navTree } = computeNav(pages, config);
  t.lap("nav");

  const { seoSiteTitle, seoLogoUrl } = precomputeSeo(pages, config);
  t.lap("seo");

  const bookData = await loadBookData(srcRoot);
  resolveBookChapters(bookData, pages);
  t.lap("book");

  const buildInfo = await buildInfoPromise;
  t.lap("buildInfo");

  const site = { config, navTree, seoSiteTitle, seoLogoUrl, buildInfo, bookData };
  console.log(`Phase 1+2 done: ${pages.length} pages, ${staticFiles.length} static files`);
  console.log(t.summary());

  if (pages.length < 836) {
    console.error(`WARN: page count ${pages.length} below baseline 836`);
    process.exitCode = 1;
  }

  return { pages, staticFiles, site };  // Phase 3+ chains in here.
}
```

`makeTimer()` is a tiny `console.time`-ish helper for per-substep
wall-time. The PLAN-1 drift guard (page count `< 836`) was kept and
moved out of the Phase 1 epilogue into the combined orchestrator.

---

## 13. What a "done" Phase 2 enables

After Phase 2 lands, every per-page field the template phase iterates
is populated. The next session can implement Phase 3 (`render.mjs` +
`highlight.mjs`) by walking `pages[]` and rendering each `rawContent`
into an HTML body — no nav, SEO, or book logic to think about.

Phase 4 (`template.mjs`) then assembles the final HTML by reading
both Phase 1 fields (`destPath`, `layoutDefault`) and Phase 2 fields
(`navTree`, `breadcrumbs`, `navLevels`, `children`, `seo*`,
`bookData`) — no further computation, just string concatenation.

That clean handoff is the whole point of having a compute phase as a
standalone step.
