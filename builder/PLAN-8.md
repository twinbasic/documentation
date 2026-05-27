# PLAN-8: Phase 8 — WRITE PDF (`pdf.mjs`, `book.mjs` renderer half)

Detailed implementation plan for the eighth (and final) phase of the
tbdocs builder. Read this together with [PLAN.md](PLAN.md) (the
architecture overview), [PLAN-1.md](PLAN-1.md) (DISCOVER),
[PLAN-2.md](PLAN-2.md) (COMPUTE), [PLAN-3.md](PLAN-3.md) (RENDER),
[PLAN-4.md](PLAN-4.md) (TEMPLATE), [PLAN-5.md](PLAN-5.md) (WRITE
ONLINE), [PLAN-6.md](PLAN-6.md) (AUXILIARIES), and
[PLAN-7.md](PLAN-7.md) (WRITE OFFLINE). The canonical Jekyll
references are:

- [`docs/_plugins/pdfify.rb`](../docs/_plugins/pdfify.rb) +
  [`docs/_plugins/pdfify.md`](../docs/_plugins/pdfify.md) — the sparse
  `_site-pdf/` writer (book.html capture + CSS + image copy).
- [`docs/book.html`](../docs/book.html) — the Liquid template that
  concatenates every chapter into one long HTML document.
- [`docs/_layouts/book-combined.html`](../docs/_layouts/book-combined.html)
  — the minimal `<html><head>` wrapper around `{{ content }}`.
- [`docs/_includes/book-chapter-body.html`](../docs/_includes/book-chapter-body.html)
  — the per-chapter assembly (article wrapper + body transform).
- [`docs/_plugins/book-chapter-transform.rb`](../docs/_plugins/book-chapter-transform.rb)
  — the Liquid filter that does the 7-pass per-chapter body
  transform (baseurl strip, details/summary unwrap, whitespace
  patterns, heading shift, anchor-id prefix).
- [`docs/_plugins/book-href-rewrite.rb`](../docs/_plugins/book-href-rewrite.rb)
  — the post-render Ruby pass that rewrites in-book hrefs to
  `#ch-...` anchors and strips redundant landing-page H1s.
- [`docs/_data/book.yml`](../docs/_data/book.yml) — the chapter
  manifest (front matter + parts + chaptered-part chapters).

The WRITE PDF phase has one job: take the rendered chapter bodies
that Phase 3 produced and **assemble them into a single
`<destRoot>-pdf/book.html` document, plus the two stylesheets and
every image referenced from book.html, so pagedjs-cli can render the
PDF book**. The output tree is intentionally sparse — ~14 MB instead
of ~130 MB if we copied the full online tree — and is the contract
[`docs/book.bat`](../docs/book.bat) consumes.

What Phase 8 does NOT do:

- Render markdown, compute nav, wrap chrome, write the online tree,
  produce the sitemap / robots / search-data / redirect stubs, or
  mirror the offline tree (Phases 1-7 already did).
- Run pagedjs-cli to produce the actual PDF. That's
  [`docs/book.bat`](../docs/book.bat)'s job — a post-build step
  outside the builder.
- Modify `<destRoot>/` or `<destRoot>-offline/` in any way — both
  trees are read-only input here (and Phase 8 only reads from them
  for the two CSS files; everything else comes from in-memory state
  Phases 1-3 already produced).

Target: **~80-200 ms wall time** on the current Windows dev machine
for the full PDF tree, processing one ~5.5 MB book.html assembly + 2
CSS file copies + ~85 image-file copies. The Jekyll equivalent
(pdfify.rb + book.html's Liquid render + book-chapter-transform +
book-href-rewrite) currently runs ~600 ms post-optimisation, with
~500 ms of that in book.html's Liquid render — work tbdocs replaces
with one direct JS pass over the already-resolved chapter list. The
JS port targets a ~3-5× gain by collapsing the Liquid include loop
and skipping the Ruby plugin chain entirely.

## Status: shipped

Implementation landed across:

- [`builder/book.mjs`](book.mjs) — extended from the Phase 2 ~180-line
  resolver to ~750 lines with the Phase 8 §B-§F assembler surface
  (`assembleBook`, `bookChapterTransform`, `chapterAnchorFromUrl`,
  `rewriteBookHrefs`, `emitChapter`, `emitFrontMatter`, `emitPart`,
  `renderBookHead`, `renderTitlePage`, `renderPartDivider`,
  `renderChapterDivider`, `formatBuildDate`, the URL→anchor +
  landing-strip maps, and `augmentWithRedirectStubs`).
- [`builder/pdf.mjs`](pdf.mjs) — new, ~210 lines. `writePdf` +
  `deriveBookOutputs` + `extractImagePaths` + the setup/copy/report
  pipeline.
- `builder/verify-phase8.mjs` (retired Phase 10) — new, ~270 lines.
  Per-article byte-diff vs `_site-pdf/book.html` with accepted-
  divergence skipping, plus structural / cross-ref / landing-strip /
  image-resolution / file-count / perf checks.
- [`builder/tbdocs.mjs`](tbdocs.mjs) — `writePdf` call wired in after
  `writeOffline`, plus the summary line.
- [`builder/_diff.mjs`](_diff.mjs) + [`builder/_triage.mjs`](_triage.mjs) —
  extended per §12.1 with the new PDF modes. The pre-existing
  `--phase3` body-fragment mode was removed from both as part of the
  same pass (the default Phase 4 mode subsumes it through the layout
  chain), and `--help` was added.

The verify harness runs end-to-end on the production tree and all
checks pass. Byte parity vs Jekyll's `docs/_site-pdf/book.html` is
exact at the per-article level: **752 articles match, 6 accepted
divergences, 0 unaccepted** on the current ~758-article book (the 6
accepted are all Rouge-vs-Shiki HTML/JSON/SQL/XML/JS tokenisation
differences plus one kramdown-vs-markdown-it emphasis case on
Reference/Attributes.md — all pre-existing Phase 3 rendering
divergences that propagate through). The sparse PDF tree matches
Jekyll's `_site-pdf/` file-count (88 files: `book.html` + 2 CSS + 85
images), all images resolve, and the two CSS files are byte-equal
to their `_site/` source.

Phase 8 wall-time on the dev machine: **~137-165 ms** (well below
the 500 ms soft cap, near the 140 ms target).

Six findings worth recording up front -- each surfaced during
byte-parity iteration against `_site-pdf/book.html` and forced a
spec-level correction:

1. **Table-wrapper unwrap is required.** tbdocs's Phase 3 renderer
   always wraps `<table>` in `<div class="table-wrapper">` (matching
   just-the-docs's `_includes/table_wrappers.html` Liquid layer). The
   `book-combined` layout in Jekyll bypasses that include, so
   Jekyll's book.html carries bare `<table>` tags. The chapter
   transform now strips the wrapper as a new Step 2b (`<div class=
   "table-wrapper"><table>` → `<table>`; `</table></div>` →
   `</table>`). See §6.3.
2. **DETAILS / SUMMARY regexes must NOT consume the trailing `\n`.**
   The Ruby plugin's `<\/summary>\n?` works because kramdown emits a
   true blank line (two `\n`s) between `</summary>` and the next
   `<p>` paragraph; consuming one `\n` leaves one for compress to
   turn into a space. markdown-it emits a single `\n` there;
   consuming it leaves no whitespace at all, so compress can't
   produce the separating space Jekyll has. Dropped `\n?` from all
   three regexes (`DETAILS_OPEN_RE`, `DETAILS_CLOSE_RE`,
   `SUMMARY_RE`). See §6.3.
3. **Redirect-stub augmentation for the URL→anchor map.** Jekyll's
   `site.pages` includes jekyll-redirect-from's stub pages, each
   carrying the redirect-from URL as its `page.url`. The rewriter's
   prefix match sweeps them into the urlToAnchor map; a link like
   `[X](/tB/Modules/ExpressionService)` resolves to a `#ch-tB-
   Modules-ExpressionService` anchor (technically dangling -- the
   stub body isn't emitted as an article -- but matching Jekyll
   bytes is the goal). tbdocs's `pages[]` doesn't carry the stubs;
   `rewriteBookHrefs` calls `augmentWithRedirectStubs(pages)` to
   synthesise them from each page's `frontmatter.redirect_from`.
   See §6.6, §6.8.
4. **`src="<baseurl>/"` strip is unconditional.** The Ruby plugin's
   `result.include?(strip)` guard is a performance optimisation
   only -- when `baseurl == ""`, `strip` becomes `src="/` and the
   gsub strips the leading `/` from every root-absolute image URL.
   PLAN-8's original `if (baseurl)` JS gate skipped the strip
   entirely, leaving `src="/Features/Images/..."` in the output and
   making the extract-image-paths regex (which excludes leading-`/`
   URLs) miss every image. Gate removed. See §6.3.
5. **No leading whitespace before `<article>`.** Jekyll's
   `{%- for -%}` and `{%- include -%}` Liquid blocks eat the
   surrounding whitespace, so the post-compress output has
   `</section><article>` and `</article><article>` joined directly
   (no space). PLAN-8's pseudocode that pushed `\n` before each
   `emitChapter` / `renderPartDivider` / `renderChapterDivider` was
   wrong; those `\n` pushes are gone. See §6.5.
6. **build-info line has no leading whitespace.** Jekyll's
   `{%- assign -%}` / `{%- if -%}` blocks between
   `<div class="title-footer">` and `<p class="build-info">` strip
   all surrounding whitespace; the post-compress output has the two
   tags joined directly. PLAN-8 §6.9's pseudocode had a `\n    `
   indent between them; corrected.

A seventh correction is more subtle: `formatBuildDate` parses the
commit-date string explicitly as `YYYY-MM-DD` rather than relying
on `new Date(iso)`. The native Date constructor parses `"2026-05-
26"` as UTC midnight, and `.getDate()` on the resulting object can
return the previous day under a negative UTC offset (every US
machine, every CI runner in `America/*`). See §6.10.

---

## 1. Inputs

### From Phase 1 / Phase 2 / Phase 3

The `{ pages, staticFiles, site, destRoot }` object the orchestrator
carries after Phase 7. Phase 8 reads:

| Field | Why Phase 8 reads it |
|---|---|
| `pages` (the array) | Phase 8 enumerates `pages.filter(p => p.frontmatter.layout === "book-combined")` to locate the book page (currently `book.html`). The page's own `permalink` / `destPath` / `html` are ignored — Phase 8 builds the output from scratch using `site.bookData` as the manifest. |
| `chapter.renderedContent` (per chapter Page) | The per-chapter body HTML fragment Phase 3 produced. This is the input each `bookChapterTransform` pass operates on. |
| `chapter.permalink` | The chapter's URL. Drives the chapter anchor (`ch-...` slug) and feeds the URL→anchor map for cross-reference rewriting (§6.6). |
| `chapter.frontmatter.title` | The chapter title. Used in the running-header `<span class="header-string">`, the sub-page state machine's `current_index_name`, the `chapter-divider` H2, and as the anchor-seed fallback for chapters at URL `/`. |
| `chapter.frontmatter.nav_order` | Already consumed by Phase 2's `sortByNavOrder`; Phase 8 doesn't re-sort. Reads not needed. |
| `site.bookData` | The chapter manifest. Phase 2's `resolveBookChapters` populated `_chapters` / `_landing` / `_foreword` on each entry; Phase 8 walks the resulting tree (`front_matter[]`, `parts[]`, each part's `chapters[]`) and emits one `<article>` per chapter / divider. |
| `site.buildInfo.commit` + `.commitDate` | Stamped into the title page's `<p class="build-info">` line. `"unknown"` when outside a repo (the substring "Built {date} from commit unknown" survives; the renderer matches Jekyll's fallback shape exactly). |
| `site.config.title` | The book's `<title>` and the `<h1 class="book-title">` on the title page. |
| `site.config.footer_content` | The copyright line on the title page. |
| `site.config.lang` | The `<html lang="...">` attribute (defaults to `"en-US"` if unset, mirroring Jekyll). |
| `site.config.baseurl` | Stripped from `src="<baseurl>/..."` inside each chapter's body before the rest of the per-chapter transform runs. Currently empty; honoured for forward-compat. |
| `site.config.time` (forward-compat) | Jekyll's `site.time` is used in the build-info line ("Built 26 May 2026 from commit …"). tbdocs doesn't have a global `site.time`; Phase 8 reads `site.buildInfo.commitDate` for the build date instead, or — if that is missing — falls back to `new Date()` formatted the same way. See §7.D7. |
| `destRoot` | The `_site/` root Phases 5+6+7 wrote to. Phase 8 derives `pdfRoot = destRoot + "-pdf"` and writes there. The two CSS files (`print.css`, `rouge.css`) are read from `<destRoot>/assets/css/`. |

Phase 8 does NOT read `page.html`, `page.navPath`, `page.breadcrumbs`,
`page.children`, `page.navLevels`, `page.seo*`, `site.navTree`,
`site.seoSiteTitle`, `site.seoLogoUrl`, or any of Phase 7's
offline-state outputs. The book is layout-less by design (no
sidebar, no nav, no chrome — just `<html><head><title> + <link>` and
a string of `<article>` elements); everything Phase 4 / Phase 7
produced for the online and offline trees is invisible here.

### From the source tree

Phase 8 walks `<srcRoot>/` (or rather, reads source-path entries
from `staticFiles[]`) to find images referenced from the assembled
book.html. The source paths are already in `staticFile.srcPath`
from Phase 1; Phase 8 just probes them by `destRel`.

Two static-file shape categories matter:

- **Content images** under `Features/Images/`, `Tutorials/.../Images/`,
  `Reference/Images/`, `Miscellaneous/Images/`. ~85 files on the
  current site. Phase 1 puts each one in `staticFiles[]` with
  `destRel` matching the path under `_site/`; the same path is used
  unchanged for the PDF tree.
- **The two stylesheets** at `<destRoot>/assets/css/print.css` and
  `<destRoot>/assets/css/rouge.css`. Phase 5 copied these from
  `builder/assets/css/` to `<destRoot>/assets/css/`; Phase 8 reads
  from `<destRoot>/` (the same source pdfify.rb uses) to mirror
  Jekyll's behaviour. See §7.D8.

### From the destination root (filesystem state)

`pdfRoot = <destRoot>-pdf`. Phase 8 wipes the entire directory at
entry (unlike Phase 7's wipe-contents-keep-directory pattern — see
§7.D1) and recreates it from scratch. This mirrors Jekyll
pdfify.rb's `FileUtils.rm_rf(dest); FileUtils.mkdir_p(dest)`
behaviour.

### From the orchestrator

| Value | Default | Source |
|---|---|---|
| `pdfRoot` | `<destRoot>-pdf` — a sibling of `destRoot` with the `-pdf` suffix. On the current dev machine: `D:\OCP\wc\twinBASIC-documentation\docs\_site-new-pdf`. | Derived inside Phase 8; not a CLI flag. |
| `dryRun` | `false` | The orchestrator's existing `--dry-run` flag. Gated externally via `if (!dryRun) await writePdf(...)`; the gate matches Phase 6/7's pattern. `writePdf` itself doesn't take a `dryRun` option. |
| `serving` (forward-compat) | `false` | Mirrors Jekyll's `site.config.serving` flag, which pdfify.rb consults to decide between `throw` and `warn` on missing images. tbdocs has no `serve` mode today; the default-to-strict behaviour matches Jekyll's CI gating. See §7.D9. |

Phase 8 has no new CLI flags. The `--no-pdf` opt-out (parallel to
Jekyll's `also_build_pdf: false`) is a future addition; the default-
on behaviour matches Jekyll exactly (`also_build_pdf: true` in
`_config.yml`).

### Assumption: `_site/` and `_site-offline/` are fully populated before Phase 8 starts

The orchestrator awaits Phase 5 (page writes), Phase 6 (auxiliaries),
and Phase 7 (offline mirror) before invoking Phase 8. Reading from
`<destRoot>/assets/css/` during Phase 8 (the two CSS files) is safe:
those files are flushed to disk before Phase 8's first read.

Phase 7's `Promise.all` settles in <1100 ms on the dev machine, so
this is a non-issue in practice — Phase 8's setup pass (wipe +
chapter-list walk) runs at least 50 ms anyway.

---

## 2. Outputs

Phase 8 produces a fully populated `<pdfRoot>/` directory on disk:

```
<pdfRoot>/                              ~88 files, ~14 MB
  book.html                             the assembled book document (~5.5 MB)
  assets/
    css/
      print.css                         verbatim copy from <destRoot>/assets/css/
      rouge.css                         verbatim copy
  Features/
    Images/<hash>.png                   verbatim copies (~29 files)
    Packages/Images/<hash>.png          verbatim copies (~15 files)
  Miscellaneous/
    Images/<hash>.png                   verbatim copies (~13 files)
  Reference/
    Images/<hash>.png                   verbatim copies (~3 files)
  Tutorials/
    CEF/Images/MonacoArchitecture.svg   verbatim copy
    CustomControls/Images/<name>.png    verbatim copies (~16 files)
    WebView2/Images/<name>.(png|gif|svg) verbatim copies (~7 files)
```

What's **excluded** from `<pdfRoot>/`:

- Every theme JS asset (`just-the-docs.js`, `theme-switch.js`,
  `vendor/lunr.min.js`) — pagedjs renders book.html into PDF with no
  client-side JS.
- Every theme CSS file except `print.css` and `rouge.css` — the
  book-combined layout links only those two.
- The favicon, the SVG sprites, every other page's content.
- `sitemap.xml`, `robots.txt`, `CNAME`, `search-data.json` /
  `search-data.js`.
- Redirect stubs from Phase 6.
- Every static file under `lib/*.mjs`, `render-book.mjs`,
  `assets/images/mmd/`, etc. — irrelevant to PDF rendering.

What's **added** that wasn't in `_site/`:

- `<pdfRoot>/book.html` — the concatenated book document. Phase 5
  intentionally skips `book.html` (per Phase 5 §5.2 + PLAN-7 §7.D5),
  so `<destRoot>/book.html` doesn't exist. Phase 8 generates the
  file's bytes from scratch using `site.bookData` and each chapter's
  `renderedContent`.

What's **transformed** vs each chapter's `renderedContent` source:

- Per-chapter body: `src="<baseurl>/..."` prefix stripped; `<details>`
  / `</details>` / `<summary>` tags stripped; 12 inter-span
  whitespace patterns wrapped in `<span class="w">…</span>`;
  headings shifted by 0-3 levels (`<h1>` → `<h2..hN>`, capped at
  `h7-stub`); every `id="..."` on a heading prefixed with the
  chapter anchor; every `href="#fragment"` prefixed with the chapter
  anchor.
- Post-assembly across the whole document: every in-book href
  resolved against the chapter's URL parent rewritten to a
  `#ch-...` (or `#ch-...-fragment`) anchor; landing-page first H1
  (or H2/H3 depending on shift level) stripped where appropriate.
- HTML compression (whitespace collapse outside `<pre>` blocks)
  applied to the whole document.

### Side effects

Filesystem mutations only. Phase 8 doesn't shell out, doesn't mutate
any in-memory data structure beyond the per-build accumulators it
allocates itself, doesn't network. The single visible effect is "the
PDF source tree on disk now matches the intended output."

### Why a wholly separate tree rather than emit `book.html` to `_site/`

Two reasons, both mirroring pdfify.rb's rationale:

1. **`book.html` is huge (~5.5 MB) and serves only the PDF
   renderer**. Putting it in `_site/` would inflate the deploy
   artifact and create a live URL (`/book.html`) that visitors might
   stumble onto. The book is meant to be downloaded as a PDF, not
   browsed as HTML.
2. **The sparse tree makes the PDF input set explicit**. Every file
   in `<pdfRoot>/` is one pagedjs reads; if you add a `<img src=>`
   to a chapter and it doesn't show up in the rendered PDF, the
   missing file in the sparse tree indicates a problem. Versus
   `_site/` where 800+ unrelated files would hide the issue.

The cost is ~14 MB of disk space (the PDF tree is mostly images;
book.html itself is ~5.5 MB) and the ~150 ms Phase 8 wall time.
Worth it.

---

## 3. Module split

Two source-file changes ship in Phase 8: extending the existing
`book.mjs` (Phase 2's chapter resolver) with the renderer half, and
adding a new `pdf.mjs` for the I/O orchestration. Internal section
boundaries match the Ruby plugins' structure for diffability.

```
builder/
  book.mjs        EXTENDED. Original Phase 2 surface (loadBookData,
                  resolveBookChapters, sortByNavOrder) stays. Adds:
                    assembleBook(site, pages, { now })
                      -- builds the full book.html string from
                         site.bookData + chapter renderedContents.
                         Includes title page, all articles, cross-ref
                         rewrite, html-compress.
                    bookChapterTransform(body, baseurl, headingShiftN, chapterAnchor)
                      -- ports book-chapter-transform.rb's 7-pass
                         per-chapter body transform.
                    chapterAnchor(url, fallbackTitle)
                      -- url → `ch-...` slug. Same scheme as
                         book-href-rewrite.rb's `chapter_anchor`.
                    rewriteBookHrefs(html, site, options)
                      -- ports book-href-rewrite.rb. Walks each
                         <article id="ch-..."> body, resolves
                         relative hrefs, rewrites in-book targets to
                         `#ch-...`, strips landing-page H1s.
                  Internal sections (in source order):

                  §A  (existing) Phase 2 loader + resolver + sorter
                  §B  Chapter anchor + URL helpers
                  §C  Per-chapter body transform (port of book-chapter-transform.rb)
                  §D  Article wrapper assembly (port of book-chapter-body.html)
                  §E  Top-level walker (port of book.html's Liquid)
                  §F  Cross-reference rewrite + landing-strip (port of book-href-rewrite.rb)
                  §G  Pure-compute exports for diff tools

  pdf.mjs         NEW. The I/O side of Phase 8. Exports:
                    writePdf(pages, staticFiles, site, destRoot, { serving })
                      -- the orchestrator entry point (gated by the
                         outer `if (!dryRun)` in tbdocs.mjs, mirroring
                         Phase 7's writeOffline). Returns
                         { bookBytes: N, html: 1, css: 2, images: N, missing: M }
                         where bookBytes is the assembled book.html
                         size in bytes and html is the file count (1).
                    deriveBookOutputs(pages, site)
                      -- pure-compute helper: returns
                         { bookHtml, imagePaths } given the
                         in-memory inputs. Used by the diff tools
                         and verify harness without touching disk.
                  Internal sections:

                  §A  Top-level orchestration (writePdf entry point)
                  §B  Image-path extraction (port of pdfify.rb's IMG_SRC_RE)
                  §C  Static-file lookup (resolve image path → staticFile entry)
                  §D  Setup pass (wipe + recreate pdfRoot)
                  §E  Copy pass (book.html + CSS + images)
                  §F  Missing-image reporting (port of pdfify.rb's strict mode)
```

### Why split between `book.mjs` and `pdf.mjs`

Two distinct concerns:

1. **Document assembly** is pure compute. Given `site.bookData` +
   per-chapter `renderedContent` + a few config fields, it produces
   a deterministic HTML string. No I/O, no filesystem, no
   destination root. This lives in `book.mjs` so the diff tools
   (`_diff.mjs --book`, `_triage.mjs auditBook*`) can derive
   expected bytes from in-memory state without touching disk.

2. **Sparse-tree writing** is pure I/O. Given a pre-assembled
   book.html string + the static-file inventory + the destination
   root, it lays bytes on disk. Image-path extraction sits on the
   I/O side because it's a precursor to "which files do I copy" —
   not part of the assembly itself. This lives in `pdf.mjs`.

PLAN.md's "book.mjs renderer half + pdf.mjs" entry already
anticipates the split. Phase 8 lands it as a single PR.

### Why not merge into one module

The single-module case would push the book-assembly surface (~500
lines) and the I/O surface (~250 lines) into one ~750-line file
that mixes two concerns. The split keeps each file under ~600 lines
and makes the boundary between "build the bytes" and "write the
bytes" the same shape as Jekyll's (book.html's Liquid + Ruby
filters produce the bytes; pdfify.rb writes them).

The diff tools also benefit: `_diff.mjs --book=full` derives the
full book.html in-memory and byte-compares vs Jekyll's
`_site-pdf/book.html`; it doesn't need to call into the writer.
`_diff.mjs --pdf-image=<rel>` checks whether a specific image
appears in the assembled book.html (compute) and whether
`pdf.mjs`'s extractor would copy it (compute). One round of `node
…` per inspection; no need to populate `<pdfRoot>/`.

### Reuse from prior phases

- **`mkdirRec`, `runLimited`, `writeFileMkdirp`, `safeWrite`,
  `WRITE_LIMIT`, `isUnderProject`** from `write.mjs` (Phase 5; the
  Phase 7 promotions to module-level exports remain). The PDF tree
  writes one large file + 2 small CSS + ~85 image copies — well
  within `runLimited(items, WRITE_LIMIT, …)`'s capacity.
- **`compressHtml`** from `compress.mjs` (Phase 4). The final
  whitespace-collapse pass over the assembled book.html mirrors
  Phase 4's pattern (`<pre>` blocks protected; runs of whitespace
  outside pre collapsed to one space).
- **`resolveBookChapters`** (Phase 2, already in `book.mjs`). Phase
  8 reads the `_chapters` / `_landing` / `_foreword` properties the
  Phase 2 pass populated; no additional resolution is needed.
- **Static-file lookup**: `staticFiles[]` from Phase 1 is keyed by
  `destRel`. Phase 8's image-copy pass builds a `Map<destRel,
  staticFile>` once at entry; per-image lookup is O(1).

No new dependencies. Phase 8 uses Node stdlib (`node:fs`,
`node:path`) plus the in-house helpers above.

### Suggested implementation order

Build inside-out so each piece can be unit-tested against a small
fixture before the next layer lands on top of it:

1. **`chapterAnchorFromUrl(url, fallbackTitle?)` and `parentUrlOf(url)`** (§6.1, §6.2). Two pure-string helpers; ~10 lines each. Spot-check against the URL→anchor table in §8.
2. **`bookChapterTransform(body, baseurl, headingShiftN, chapterAnchor)`** (§6.3). The 5-pass per-chapter body transform. Verify by running against one chapter body's `renderedContent` and diffing the result against Jekyll's output (extract the matching `<article>` block from `docs/_site-pdf/book.html`).
3. **`updateSubPageState`, `pickArticleClass`, `pickHeaderTitle`** + the `emitChapter` driver (§6.4). The per-chapter article-wrapper. Verify by emitting a small `<article>` from one chapter.
4. **`renderBookHead`, `renderTitlePage`, `renderPartDivider`, `renderChapterDivider`, `formatBuildDate`** (§6.9, §6.10). Static-template renderers. Verify each against the matching block in Jekyll's `_site-pdf/book.html`.
5. **`emitFrontMatter`, `emitPart`** (§6.5). The top-level walker. Now the whole document assembly works end-to-end on the manifest.
6. **`assembleBook(site, pages)`** (§5.2). The entry point. Calls all of the above plus the next step.
7. **`buildLandingStripTargets`, `buildUrlToAnchor`, `buildAnchorToParent`, `resolveHref`, `splitHash`, `stripBaseurl`, `normalizeBaseurl`** + the `rewriteBookHrefs(html, site, pages)` pass (§6.6, §6.7, §6.8). The cross-reference rewrite + landing-strip; runs after `assembleBook`'s emit loop.
8. **`compressHtml` wired in** (already exists in `compress.mjs`; just a call). Now `assembleBook` produces byte-comparable output.
9. **`pdf.mjs` writer half** — `extractImagePaths`, `setupPdfDest`, `writePdfBook`, `copyPdfCss`, `copyPdfImages`, `reportMissingImages`, `writePdf`, `deriveBookOutputs` (§5.3-5.8). Five small functions + the orchestrator entry point.
10. **`verify-phase8.mjs`** (§10) and the `_diff.mjs --book` / `_triage.mjs auditBook*` extensions (§12.1). Verification + diff tools.
11. **`tbdocs.mjs` wire-in** (§12). The one-line `await writePdf(...)` call + the summary log extension.

Each step's output is independently inspectable: steps 1-2 against
unit fixtures; steps 3-7 against extracted blocks from
`docs/_site-pdf/book.html`; step 8+ against the whole file.

---

## 4. Pipeline ordering within Phase 8

```
{ pages, staticFiles, site, destRoot, auxStats, offlineStats }   // after Phase 7
   │
   ▼
 [1] resolveBookPage(pages)                          ← §5.1
       (locate the one page with layout: book-combined;
        throw if zero or >1 match. The hit is what
        Phase 5 skipped writing to <destRoot>/.)
   │
   ▼
 [2] assembleBook(site, pages)                       ← §5.2
       (deriveBookOutputs in pdf.mjs delegates to this:
        walks site.bookData, emits the title page +
        every <article>, runs the cross-ref rewrite +
        landing-strip pass, runs html-compress.
        Pure compute, no I/O. Result: one large
        UTF-8 string.)
   │
   ▼
 [3] extractImagePaths(bookHtml)                     ← §5.3
       (regex sweep matching pdfify.rb IMG_SRC_RE.
        Returns unique relative paths in document
        order. Code/pre block contents skipped.)
   │
   ▼
 [4] setupPdfDest(pdfRoot)                           ← §5.4
       (rm -rf + mkdir <pdfRoot>/. Mirrors Jekyll
        pdfify.rb's wipe.)
   │
   ▼
 [5] In parallel (runLimited fans out):
       writePdfBook(bookHtml, pdfRoot)               ← §5.5  (1 file)
       copyPdfCss(destRoot, pdfRoot)                 ← §5.6  (2 files)
       copyPdfImages(imagePaths, staticFiles,         ← §5.7  (~85 files)
                     srcRoot, pdfRoot)
   │
   ▼
 [6] reportMissingImages(missingPaths, serving)      ← §5.8
       (per-path error log + throw in strict mode.)
   │
   ▼
 [7] summarise(totals)                               ← §5.9
       (counts; one log line.)
```

The three parallel substeps in step [5] write to disjoint
destination paths (book.html at the root; CSS under `assets/css/`;
images under `Features/`, `Tutorials/`, etc.), so they don't race.
No shared mutable state.

### Per-write parallelism

Each write surface uses `runLimited` with `WRITE_LIMIT = 64` (the
Phase 5 cap). Three concurrent surfaces × 64 = 192 max in-flight
operations — well below libuv's pool capacity. On the current site
the writes are bound by `book.html`'s ~5.5 MB single-file write,
which Node executes asynchronously without saturating the pool.

### Why the setup pass is sequential before the parallel writes

Same as Phase 5 / Phase 7: the wipe-and-recreate must complete
before any per-file write starts (so no write races against the rm)
and so an early-fail (permission error on the rm) surfaces cleanly
without interleaving with file-write errors.

The setup pass is ~5-10 ms; sequencing it costs nothing.

### Phase 8 init order (one-time)

```js
const PDF_SUFFIX = "-pdf";
const REQUIRED_CSS = ["assets/css/print.css", "assets/css/rouge.css"];
const LIMIT = WRITE_LIMIT;
```

Three lines. Everything else (regex constants, image-path
extractor, missing-list buffer) lives inline next to the functions
that use them.

### Deps assembly (entry-point shape)

The entry point assembles a single `deps` object and threads it
through every substep. Same pattern as Phase 5 / Phase 7:

```js
export async function writePdf(pages, staticFiles, site, destRoot, { serving = false } = {}) {
  const pdfRoot = destRoot + PDF_SUFFIX;
  const bookPage = resolveBookPage(pages);   // throws if missing or duplicated
  const { bookHtml, imagePaths } = deriveBookOutputs(pages, site);

  const staticByDestRel = new Map(staticFiles.map(s => [s.destRel.replaceAll("\\", "/"), s]));
  await setupPdfDest(pdfRoot);

  const counters = { bookBytes: 0, html: 0, css: 0, images: 0, missing: 0 };
  const missingPaths = [];

  await Promise.all([
    writePdfBook(bookHtml, pdfRoot, counters),
    copyPdfCss(destRoot, pdfRoot, counters),
    copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths),
  ]);

  reportMissingImages(missingPaths, serving, counters);
  return counters;
}

export function deriveBookOutputs(pages, site) {
  const bookHtml = assembleBook(site, pages);    // book.mjs §E
  const imagePaths = extractImagePaths(bookHtml); // pdf.mjs §B
  return { bookHtml, imagePaths };
}
```

The `deriveBookOutputs` split lets the diff tools (`_diff.mjs
--book`, `_diff.mjs --pdf-image=<rel>`, `_triage.mjs auditBook`) get
the assembled bytes + image-path list without going through the
writer. Mirrors the Phase 7 `buildOfflineState` / `deriveOffline*`
pattern.

`bookPage` from `resolveBookPage(pages)` is held for assertion only:
the orchestrator throws early if the source tree doesn't carry a
`layout: book-combined` page. This is the equivalent of pdfify.rb's
"no /book.html page rendered; skipping" warning — but stricter, since
tbdocs has no `serve` mode where temporary frontmatter changes might
remove the page mid-edit.

---

## 5. Per-substep specifications

### 5.1. `resolveBookPage(pages)`

**Purpose.** Locate the one page that drives the book assembly and
fail fast if zero or multiple matches.

**Algorithm.**

```js
function resolveBookPage(pages) {
  const matches = pages.filter(p => p.frontmatter?.layout === "book-combined");
  if (matches.length === 0) {
    throw new Error(
      "Phase 8: no page with `layout: book-combined` found. " +
      "Expected docs/book.html with this frontmatter; check the source tree.",
    );
  }
  if (matches.length > 1) {
    const list = matches.map(p => p.srcRel).join(", ");
    throw new Error(
      `Phase 8: multiple pages with \`layout: book-combined\` found: ${list}. ` +
      "Only one is supported.",
    );
  }
  return matches[0];
}
```

**Why throw rather than warn.** Mirrors `verify-phase7.mjs`'s
assertion style: the production source tree has exactly one
book-combined page; deviation is a real bug. The Ruby pdfify warns
because Jekyll's `:pages, :post_render` hook fires per-page and a
mid-edit removal of `book.html`'s frontmatter would otherwise crash
the watcher. tbdocs has no watcher and runs `node builder/tbdocs.mjs`
end-to-end; failing fast is the right default.

**Note.** `bookPage` itself isn't directly used to assemble the
book — `site.bookData` + `chapter.renderedContent` carry all the
needed input. The resolution exists only as an existence check.

### 5.2. `assembleBook(site, pages)`

**Purpose.** Produce the full book.html string. Pure compute; no
I/O.

**Algorithm.** Port of [`docs/book.html`](../docs/book.html)'s
Liquid (the title page + the front-matter loop + the parts loop +
the chaptered-part branch) followed by the `book-href-rewrite.rb`
+ `html-compress.rb` passes.

```js
export function assembleBook(site, pages) {
  const bookData = site.bookData;
  if (!bookData) {
    throw new Error("Phase 8: site.bookData is unset; Phase 2 didn't run.");
  }

  const lang = site.config?.lang ?? "en-US";
  const siteTitle = String(site.config?.title ?? "");
  const baseurl = String(site.config?.baseurl ?? "");

  const out = [];
  out.push(renderBookHead(lang, siteTitle));
  out.push("<body>");
  out.push(renderTitlePage(site));
  emitFrontMatter(out, bookData, baseurl);
  (bookData.parts ?? []).forEach((part, i) => emitPart(out, part, i, site, baseurl));
  out.push("</body>");
  out.push("</html>");

  let html = out.join("");
  html = rewriteBookHrefs(html, site, pages);
  html = compressHtml(html);
  return html;
}
```

Three top-level sections of the document:

1. **Head + title page.** Static HTML matching the
   `book-combined.html` layout's `<head>` + the title-page
   `<section>` in book.html. The build-info line uses
   `site.buildInfo.commit` / `.commitDate` (§7.D7).
2. **Front-matter entries.** Each `bookData.front_matter[i]` emits
   its resolved `_chapters` array via `emitChapter`, passing
   `articleClassOverride: 'front-matter'` and
   `skipSubPageDetection: true`.
3. **Numbered parts.** Each `bookData.parts[i]` emits the
   `part-divider` `<article>` (with optional subtitle / intro / no-
   outline-entry handling) followed by:
   - The optional `_foreword` page (foreword_page) as a
     `part-foreword`-classed `<article>`.
   - The optional `_landing` page (landing_page) on chaptered parts
     as a regular `<article class="page">` (its source H1 is
     stripped later by `rewriteBookHrefs`'s landing-strip pass).
   - For flat parts: `_chapters` walked sequentially with the
     sub-page state machine running.
   - For chaptered parts: each `part.chapters[j]` emits a
     `chapter-divider` `<article>` followed by `ch_entry._chapters`
     walked with a reset sub-page state machine per chapter.

The sub-page state machine ports the Liquid scoping in
`book-chapter-body.html`:

```js
const subPageState = {
  currentIndexUrl: "",
  currentIndexKind: "class",
  currentIndexName: "",
};

function emitChapter(out, chapter, opts, subPageState, baseurl) {
  // 1. Source body (already rendered by Phase 3).
  let body = chapter.renderedContent;
  if (!body || !body.trim()) return;  // empty body -> skip silently

  // 2. Sub-page detection + kind/name capture (1.6a / 1.6c).
  const isSubPage = updateSubPageState(chapter, opts, subPageState);

  // 3. Heading-shift level.
  let n = 0;
  if (!opts.skipBaseHeadingShift) n++;
  if (isSubPage) n++;
  if (opts.extraHeadingShift) n++;

  // 4. Chapter anchor.
  const chapterAnchor = opts.chapterAnchorOverride
    ?? chapterAnchorFromUrl(chapter.permalink);

  // 5. Per-chapter body transform (7 passes).
  body = bookChapterTransform(body, baseurl, n, chapterAnchor);
  const stripped = body.trim();
  if (stripped === "") return;

  // 6. Article wrapper.
  const articleClass = pickArticleClass(opts, isSubPage);
  const headerTitle  = pickHeaderTitle(chapter, opts, isSubPage, subPageState);
  out.push(`<article class="${articleClass}" id="${chapterAnchor}">`);
  out.push(`<span class="header-string">${escapeHtml(headerTitle)}</span>`);
  out.push(body);
  out.push("</article>");
}
```

The article-class selection mirrors `book-chapter-body.html`'s
end-of-template logic:

```
article_class_override set         -> use override verbatim, no sub-page suffix
otherwise                           -> "page"
  if isSubPage                      -> " sub-chapter" appended; compound header
  if extraHeadingShift              -> " chaptered" appended
```

**Why not run Liquid.** book.html's Liquid is 280 lines of
boilerplate over `bookData`. tbdocs already has `bookData` in
memory with `_chapters` resolved (Phase 2). Running the JS walker
directly is faster, easier to reason about, and avoids a
liquid-dependency on the JS side.

The line-by-line port keeps the article shape byte-identical to
Jekyll's output (verified by §10's diff against `_site-pdf/`).

### 5.3. `extractImagePaths(bookHtml)`

**Purpose.** Walk the assembled book.html, collect every relative
`<img src=>` URL, return the unique set in document order.

**Algorithm.** Port of pdfify.rb's `IMG_SRC_RE` regex + `scan` +
`Set.uniq` loop.

```js
const IMG_SRC_RE =
  /<code\b[^>]*>[\s\S]*?<\/code>|<pre\b[^>]*>[\s\S]*?<\/pre>|\bsrc=(["'])((?![#/]|[a-zA-Z][a-zA-Z0-9+.\-]*:)[^"']+)\1/g;

export function extractImagePaths(html) {
  const seen = new Set();
  const out = [];
  for (const m of html.matchAll(IMG_SRC_RE)) {
    if (m[1] === undefined) continue;   // <code> or <pre> branch
    const url = m[2];
    const path = url.split(/[?#]/, 1)[0];
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}
```

The combined regex carries three top-level alternatives, same as
pdfify.rb's:

1. `<code\b[^>]*>[\s\S]*?</code>` — a `<code>` block. The match's
   `m[1]` is undefined; the loop skips.
2. `<pre\b[^>]*>[\s\S]*?</pre>` — same for `<pre>`.
3. `\bsrc=("|')(URL)\1` — a real attribute, page-relative URL only.
   The URL alternative excludes anything starting with `/` (root-
   absolute), `#` (fragment-only), or a URL scheme (`http:`,
   `mailto:`, etc.).

**Why fold the code/pre skip into the regex.** Same reason as
Phase 7's `rewriteHtml`: a `<pre>` block in a tutorial that happens
to contain a literal `<img src="foo.png">` snippet (or Rouge's
broken-up `<span class="na">src=</span><span class="s">"foo"</span>`
sequence) would otherwise generate a spurious "missing image"
entry. The atomic consumption of the code/pre alternatives by V8's
regex engine makes the contract honest: every path returned is a
real `<img src=>` in source markdown that needs copying.

**Note on absolute URLs.** The regex skips URLs starting with
`http://`, `https://`, `mailto:`, etc., and URLs starting with `/`
(root-absolute, which the chapter-body transform's `src=
"<baseurl>/"` strip already removed for in-tree references; any
remaining `/`-prefixed src is a source-side bug to surface
separately). Pdfify's regex does the same.

The current book.html on the dev tree has 4 `<img src=>` references
to `https://github.com/user-attachments/...` URLs which legitimately
point at GitHub's CDN; those don't need local copies. The regex
skip leaves them alone, and pagedjs's render-time fetch handles
them (or doesn't — the PDF render may produce a broken-image
placeholder for GitHub-hosted assets if the build machine has no
internet, but that's a deployment concern outside Phase 8's scope).

### 5.4. `setupPdfDest(pdfRoot)`

**Purpose.** Ensure `<pdfRoot>/` exists and is empty when Phase 8
begins writing.

**Algorithm.**

```js
async function setupPdfDest(pdfRoot) {
  if (!isUnderProject(pdfRoot)) {
    throw new Error(`refusing to clean ${pdfRoot}: not under the project tree`);
  }
  await fs.rm(pdfRoot, { recursive: true, force: true });
  await fs.mkdir(pdfRoot, { recursive: true });
}
```

Unlike Phase 7's wipe-contents-keep-directory pattern (§7.D1), Phase
8 deletes and recreates the parent directory. Two reasons:

1. **No watcher concern.** Phase 7 honoured pdfify.rb's pattern
   defensively in case a future watcher lands. The PDF tree is even
   more inert — pagedjs only opens `<pdfRoot>/book.html` on-demand,
   never during the build. No watcher would target it.
2. **Stale-image cleanup.** Source pages get deleted or renamed
   over time; if `<pdfRoot>/` retained the directory and only wiped
   its contents, an `fs.rm` of every child would still need to
   clear the empty `Features/Images/`, etc. parent directories the
   old build left behind. `rm -rf` of the parent skips that.

`isUnderProject` (promoted to a `write.mjs` export in Phase 7) is
the safety guard against `pdfRoot` accidentally pointing outside
the project tree.

### 5.5. `writePdfBook(bookHtml, pdfRoot, counters)`

**Purpose.** Write the assembled book.html to disk.

**Algorithm.**

```js
async function writePdfBook(bookHtml, pdfRoot, counters) {
  const dest = path.join(pdfRoot, "book.html");
  await writeFileMkdirp(dest, bookHtml);
  counters.html = 1;
  counters.bookBytes = bookHtml.length;
  return bookHtml.length;
}
```

One write of the in-memory string. ~5.5 MB on the current site;
SSD write ~15 ms.

**Encoding.** UTF-8. Same as Phase 5's `writePages`.

**Why not stream.** The string is already in memory (it was just
returned by `assembleBook`); a single `fs.writeFile` is simpler than
a `createWriteStream` + chunked write and the size is small enough
that streaming saves nothing. Phase 5's larger pages (`Reference.html`
is ~2 MB) use the same pattern.

### 5.6. `copyPdfCss(destRoot, pdfRoot, counters)`

**Purpose.** Copy `print.css` and `rouge.css` from
`<destRoot>/assets/css/` to `<pdfRoot>/assets/css/`.

**Algorithm.**

```js
async function copyPdfCss(destRoot, pdfRoot, counters) {
  const warnings = [];
  await runLimited(REQUIRED_CSS, LIMIT, async (rel) => {
    const src = path.join(destRoot, rel);
    const dest = path.join(pdfRoot, rel);
    if (!existsSync(src)) {
      warnings.push(`missing required asset ${rel}; pagedjs render may break`);
      return;
    }
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(src, dest));
    counters.css++;
  });
  for (const w of warnings) console.warn(`pdf: ${w}`);
}
```

Mirrors pdfify.rb's `REQUIRED_CSS` loop. Missing files surface as
warnings — the PDF still builds, just with default styles for the
missing rules. The strict-mode throw (§5.8) only applies to image
references, not CSS.

**Why read from `<destRoot>/assets/css/` rather than
`builder/assets/css/`.** Mirrors Jekyll's `site.dest` source. If
Phase 5 ever transforms the CSS bytes between read from
`builder/assets/` and write to `<destRoot>/`, Phase 8 picks up the
transformed bytes by reading from the destination. The one extra
disk read per file (~20 KB total) is negligible.

The same rationale applied to Phase 7 §7.D13.

### 5.7. `copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths)`

**Purpose.** Copy every image referenced from book.html to its
mirrored location under `<pdfRoot>/`. Record paths whose source
isn't in `staticFiles[]` (i.e. on disk under `<srcRoot>/`).

**Algorithm.**

```js
async function copyPdfImages(imagePaths, staticByDestRel, pdfRoot, counters, missingPaths) {
  await runLimited(imagePaths, LIMIT, async (rel) => {
    const key = rel.replaceAll("\\", "/");
    const staticFile = staticByDestRel.get(key);
    if (!staticFile) {
      missingPaths.push(rel);
      return;
    }
    const dest = path.join(pdfRoot, rel);
    await mkdirRec(path.dirname(dest));
    await safeWrite(dest, () => fs.copyFile(staticFile.srcPath, dest));
    counters.images++;
  });
}
```

The `staticByDestRel` map was built once at the top of `writePdf`
from `staticFiles.map(s => [s.destRel.replaceAll("\\", "/"), s])`.
Per-image lookup is O(1).

**Why copy from `staticFile.srcPath` rather than from
`<destRoot>/<destRel>`.** Same reason as Phase 7 §5.4: the source-
path copy avoids a `<destRoot>/` round-trip and matches Phase 5's
copy of the same files. Either source produces byte-identical
output — Phase 5 copied from `srcPath` unchanged. The `<destRoot>/`
mirror is also fully populated (Phase 5 already finished), so a
read from there would work too — the choice is consistency with
Phase 5.

**Why fall through to `missingPaths` rather than throw inline.** The
strict-mode contract from pdfify.rb is "every miss logged per-path,
then a single summary log line, then throw with the total count" —
not "throw at the first miss". The per-path errors give the author
a complete picture of what's broken in one build, instead of
fix-one-rebuild-find-another. Phase 8 §5.8 reproduces this.

### 5.8. `reportMissingImages(missingPaths, serving, counters)`

**Purpose.** Per-path error log, then throw if `serving` is false.

**Algorithm.** Port of pdfify.rb's strict mode.

```js
function reportMissingImages(missingPaths, serving, counters) {
  counters.missing = missingPaths.length;
  for (const rel of missingPaths) {
    console.error(`pdf: missing image ${rel} (referenced from book.html, not present under source tree)`);
  }
  if (missingPaths.length === 0) return;
  if (serving) {
    console.warn(`pdf: ${missingPaths.length} image reference(s) missing; PDF render will show broken-image placeholders`);
    return;
  }
  throw new Error(
    `pdf: ${missingPaths.length} image reference(s) in book.html missing under source tree — see error log above`,
  );
}
```

The `serving` flag is plumbed from the orchestrator (currently
defaults to `false`); a future `--serving` flag (or watch-mode
addition) would set it to `true` to keep the dev preview alive
across mid-edit saves that temporarily break image references. For
the current strict-build CI path the flag stays `false` and the
throw is what surfaces source-side bugs.

**Why throw rather than `process.exit(1)`.** The orchestrator's
top-level `main().catch(...)` already turns thrown errors into
`process.exit(1)`. Throwing from the substep also lets the verify
harness catch the error and assert on its message in tests.

### 5.9. Summary logging

**Purpose.** One line summarising what Phase 8 did. Matches the
Phase 5/6/7 summary line pattern in `tbdocs.mjs`.

Target shape:

```
Phase 1+2+3+4+5+6+7+8 done: 838 pages, 234 static files
  wrote: 837 pages (1 skipped), 7 theme assets, 234 static files -> .../_site-new
  aux:   290 redirect stubs, 836 sitemap entries, 2587 search-index entries
  offline: 837 HTML, 4 CSS, 290 redirect stubs, 239 assets, 1 excluded (0 unresolved) -> .../_site-new-offline
  pdf:     book.html (5.5 MB), 2 CSS, 85 images (0 missing) -> .../_site-new-pdf
discover=98ms nav=26ms seo=17ms book=9ms buildInfo=0ms render=1964ms template=565ms write=434ms auxiliaries=141ms offline=1092ms pdf=140ms
```

The counters returned by `writePdf` map to the summary line as
follows:

| Counter | Bumped by | Source |
|---|---|---|
| `bookBytes` | `writePdfBook` | The assembled `bookHtml.length` in bytes. Formatted as MB in the summary line. |
| `html` | `writePdfBook` | Always 1 on success (the file count). |
| `css` | `copyPdfCss` | 1 per CSS file copied. 2 on the current tree. |
| `images` | `copyPdfImages` | 1 per image successfully copied. ~85 on the current tree. |
| `missing` | `reportMissingImages` | 1 per image whose source isn't in `staticFiles[]`. 0 on the current tree. |

Size in the log line is `counters.bookBytes / (1024 * 1024)` (in
MB, rounded to one decimal). The `(N missing)` clause is
suppressed when `counters.missing === 0`.

---

## 6. Shared helpers

### 6.1. `chapterAnchorFromUrl(url, fallbackTitle?)`

**Purpose.** Derive the `ch-...` slug used as the `<article>` id
and as the link target in cross-reference rewrites.

**Algorithm.** Port of `book-href-rewrite.rb`'s `chapter_anchor`:

```js
export function chapterAnchorFromUrl(url, fallbackTitle = null) {
  let seed = url.replaceAll("/", "-").replace(/^-/, "").replace(/-$/, "");
  if (seed === "" && fallbackTitle) {
    seed = fallbackTitle.toLowerCase().replaceAll(" ", "-");
  }
  return "ch-" + seed;
}
```

Two URL → seed transforms:

- `/tB/Core/Const` → `tB-Core-Const`
- `/Features/Language/` → `Features-Language`
- `/` → `""` → fallback to `fallbackTitle.toLowerCase().replaceAll(" ", "-")`,
  yielding e.g. `introduction` for the front-matter "Introduction"
  entry.

The fallback is invoked only when the URL collapses to an empty
seed (the root URL `/` is the current single case). Every other
URL produces a non-empty seed and `fallbackTitle` is ignored.

### 6.2. `parentUrlOf(url)`

**Purpose.** Compute the "parent URL" of a chapter for relative-href
resolution in the cross-reference rewriter (§6.6).

**Algorithm.** Port of `book-href-rewrite.rb`'s `parent_url_of`:

```js
function parentUrlOf(url) {
  if (url.endsWith("/")) return url;
  return url.replace(/[^\/]+$/, "");
}
```

Folder-style URLs (`/tB/Core/`) are their own parent — relative
links inside the page resolve against the folder. Single-file URLs
(`/tB/Core/Const`) drop the trailing segment so relative links
resolve against the containing folder.

### 6.3. `bookChapterTransform(body, baseurl, headingShiftN, chapterAnchor)`

**Purpose.** The 7-pass per-chapter body transform.

**Algorithm.** Port of
[`docs/_plugins/book-chapter-transform.rb`](../docs/_plugins/book-chapter-transform.rb).

```js
const WHITESPACE_PATTERNS = (() => {
  const SP = " ", NL = "\n", S4 = "    ", S8 = "        ", S12 = "            ", S16 = "                ";
  return [
    [`</span>${SP}${NL}${SP}${NL}<span`,
     `</span><span class="w">${SP}${NL}${SP}${NL}</span><span`],
    [`</span>${NL}${SP}${NL}<span`,
     `</span><span class="w">${NL}${SP}${NL}</span><span`],
    [`</span>${SP}${NL}${S12}<span`,
     `</span><span class="w">${SP}${NL}${S12}</span><span`],
    [`</span>${SP}${NL}${S8}<span`,
     `</span><span class="w">${SP}${NL}${S8}</span><span`],
    [`</span>${SP}${NL}${S4}<span`,
     `</span><span class="w">${SP}${NL}${S4}</span><span`],
    [`</span>${SP}${NL}<span`,
     `</span><span class="w">${SP}${NL}</span><span`],
    [`</span>${NL}${S16}<span`,
     `</span><span class="w">${NL}${S16}</span><span`],
    [`</span>${NL}${S12}<span`,
     `</span><span class="w">${NL}${S12}</span><span`],
    [`</span>${NL}${S8}<span`,
     `</span><span class="w">${NL}${S8}</span><span`],
    [`</span>${NL}${S4}<span`,
     `</span><span class="w">${NL}${S4}</span><span`],
    [`</span>${NL}<span`,
     `</span><span class="w">${NL}</span><span`],
    [`</span> <span`,
     `</span><span class="w"> </span><span`],
  ];
})();

// NB: regexes deliberately do NOT consume a trailing `\n` (see Status
// finding 2). Diverges from book-chapter-transform.rb which uses
// `<\/summary>\n?` etc.
const DETAILS_OPEN_RE  = /<details[^>]*>/gi;
const DETAILS_CLOSE_RE = /<\/details>/gi;
const SUMMARY_RE       = /<summary[^>]*>|<\/summary>/gi;
const HEADING_SHIFT_RE = /<(\/?)h([1-6])\b/g;
const HEADING_ID_RE    = /<(h[2-6]|h7-stub)((?:\s+class="no_toc")?)\s+id="/g;

export function bookChapterTransform(body, baseurl, headingShiftN, chapterAnchor) {
  if (!body) return body;
  let result = body;

  // Step 1: strip the baseurl-prefixed src=. Runs unconditionally;
  // when baseurl is "" the strip is `src="/` -> `src="`, removing the
  // leading slash from every root-absolute image URL. See Status
  // finding 4.
  const strip = `src="${baseurl}/`;
  if (result.includes(strip)) result = result.replaceAll(strip, `src="`);

  // Step 2: unwrap <details>/<summary>.
  result = result.replace(DETAILS_OPEN_RE,  "");
  result = result.replace(DETAILS_CLOSE_RE, "");
  result = result.replace(SUMMARY_RE,       "");

  // Step 2b: strip just-the-docs's <div class="table-wrapper"> around
  // every <table>. The book-combined layout bypasses table_wrappers.html
  // so Jekyll's book.html has bare <table>; tbdocs's Phase 3 renderer
  // always wraps, so we undo here. See Status finding 1.
  result = result.replaceAll(`<div class="table-wrapper"><table>`, `<table>`);
  result = result.replaceAll(`</table></div>`, `</table>`);

  // Step 3: whitespace span wrapping (longest first; the array order
  // matches book-chapter-transform.rb's WHITESPACE_PATTERNS).
  for (const [search, replacement] of WHITESPACE_PATTERNS) {
    result = result.replaceAll(search, replacement);
  }

  // Step 4: heading shift by N (0..3 levels; cap at h7-stub).
  const n = Math.max(0, Math.min(3, Number(headingShiftN) || 0));
  if (n > 0) {
    result = result.replace(HEADING_SHIFT_RE, (_, slash, levelStr) => {
      const newLevel = parseInt(levelStr, 10) + n;
      return newLevel > 6 ? `<${slash}h7-stub` : `<${slash}h${newLevel}`;
    });
  }

  // Step 5: anchor-id prefix on every heading id + every href="#".
  if (chapterAnchor) {
    const prefix = `${chapterAnchor}-`;
    result = result.replace(HEADING_ID_RE, (_, tag, classAttr) => `<${tag}${classAttr} id="${prefix}`);
    result = result.replaceAll(`href="#`, `href="#${prefix}`);
  }

  return result;
}
```

Six logical passes (steps 1, 2, 2b, 3, 4, 5). Output is byte-
identical to Jekyll's `_site-pdf/book.html` for every article whose
source page isn't in `ACCEPTED_DIVERGENCE_PATHS`, verified by §10's
per-article diff.

The two correctness notes from the Ruby plugin's header comment
carry over verbatim:

- **Heading shift processes BOTTOM-UP in the Liquid chain** to
  avoid double-shifting. A single-pass regex incrementing by N
  produces the same output for any N because each source heading
  lands at `source + N` or `h7-stub` if that exceeds 6 — the
  bottom-up structure was a Liquid-side artifact, not a semantic
  requirement.
- **The heading-shift regex captures the optional leading `/`** so
  it also handles closing tags (`</h1>` → `</h2>`). The `\b` word
  boundary anchors after the digit so a hypothetical `<h12>`
  doesn't accidentally match.

The whitespace-pattern table order matters: longest-first ensures
each match consumes its bytes before a shorter pattern can fragment
them. Reordering would produce a different post-transform body and
break byte-parity.

### 6.4. The article wrapper builder (`emitChapter`)

**Purpose.** Port of `_includes/book-chapter-body.html`: per-chapter
article wrapping including sub-page detection, article-class
selection, header-string composition, and chapter-anchor
derivation.

**Algorithm.** Already shown in §5.2's `emitChapter`. Key sub-helpers:

```js
function updateSubPageState(chapter, opts, state) {
  if (opts.skipSubPageDetection) return false;
  const url = chapter.permalink;
  if (url.endsWith("/")) {
    state.currentIndexUrl = url;
    state.currentIndexName = String(chapter.frontmatter.title ?? "")
      .replaceAll(" Module", "")
      .replaceAll(" module", "")
      .replaceAll(" Class", "")
      .replaceAll(" class", "")
      .replaceAll(" Package", "");
    const head = (chapter.renderedContent ?? "").slice(0, 200).toLowerCase();
    state.currentIndexKind = head.includes("module") ? "module" : "class";
    return false;
  }
  if (state.currentIndexUrl === "") return false;
  if (url.startsWith(state.currentIndexUrl)) return true;
  state.currentIndexUrl = "";
  return false;
}

function pickArticleClass(opts, isSubPage) {
  if (opts.articleClassOverride) return opts.articleClassOverride;
  let cls = "page";
  if (isSubPage) cls += " sub-chapter";
  if (opts.extraHeadingShift) cls += " chaptered";
  return cls;
}

function pickHeaderTitle(chapter, opts, isSubPage, state) {
  if (opts.articleClassOverride) return chapter.frontmatter.title ?? "";
  if (isSubPage) return `${state.currentIndexName} - ${chapter.frontmatter.title ?? ""}`;
  return chapter.frontmatter.title ?? "";
}
```

The "kind" detection (`"module"` vs `"class"`) is currently
captured but unused in the article output — it's a 1.6c state
machine input for a future use case described in
`book-chapter-body.html`. The port carries it forward to keep the
state shape identical.

### 6.5. The top-level walker (`emitPart`, `emitFrontMatter`)

**Purpose.** Port of book.html's Liquid: the front-matter loop, the
numbered-parts loop, the chaptered-part inner loop.

**Algorithm.** Mirrors book.html's structure line-by-line. The
Liquid include calls become direct `emitChapter` calls with
distinct `opts` shapes:

```js
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX"];

// NB: NO inter-article whitespace push -- Jekyll's `{%- for -%}` and
// `{%- include -%}` strip it, so `</section><article>` and
// `</article><article>` join directly. See Status finding 5.
function emitFrontMatter(out, bookData, baseurl) {
  const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
  for (const fm of bookData.front_matter ?? []) {
    for (const chapter of fm._chapters ?? []) {
      const fmAnchor = chapter.permalink === "/"
        ? `ch-${String(fm.title ?? "").toLowerCase().replaceAll(" ", "-")}`
        : null;
      emitChapter(out, chapter, {
        articleClassOverride: "front-matter",
        chapterAnchorOverride: fmAnchor,
        skipSubPageDetection: true,
      }, state, baseurl);
    }
  }
}

function emitPart(out, part, partIdx, site, baseurl) {
  const partNum = partIdx + 1;
  out.push(renderPartDivider(part, partNum, site));
  if (part.foreword_page && part._foreword) {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    emitChapter(out, part._foreword, {
      articleClassOverride: "part-foreword",
      skipSubPageDetection: true,
      skipBaseHeadingShift: !!part.no_heading_shift,
    }, state, baseurl);
  }
  if (part.chapters && part.landing_page && part._landing) {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    emitChapter(out, part._landing, {
      skipSubPageDetection: true,
      skipBaseHeadingShift: !!part.no_heading_shift,
    }, state, baseurl);
  }
  if (part.chapters) {
    for (const chEntry of part.chapters) {
      out.push(renderChapterDivider(chEntry));
      const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
      for (const chapter of chEntry._chapters ?? []) {
        emitChapter(out, chapter, chapteredFlags(part, chEntry), state, baseurl);
      }
    }
  } else {
    const state = { currentIndexUrl: "", currentIndexKind: "class", currentIndexName: "" };
    for (const chapter of part._chapters ?? []) {
      const isPartLanding = part.landing_page && chapter.permalink === part.landing_page;
      const flags = {};
      if (part.no_heading_shift) flags.skipBaseHeadingShift = true;
      if (isPartLanding) flags.skipSubPageDetection = true;
      emitChapter(out, chapter, flags, state, baseurl);
    }
  }
}
```

The flag combinations for chaptered-part chapters mirror the
Liquid:

| part.no_heading_shift | ch_entry.no_heading_shift | flags applied |
|---|---|---|
| false (default)       | false (default)           | extra=true |
| false                 | true                      | (no flags) |
| true                  | false                     | skipBase=true, extra=true |
| true                  | true                      | skipBase=true |

The "extra heading shift" defaults to true for chaptered chapters
(because a chapter-divider H2 sits above the chapter content and
the source H1 must shift twice — once for the 1.5a base, once for
the 1.9 chaptered offset). The flags above disable each shift
individually when the entry opts out.

### 6.6. `rewriteBookHrefs(html, site, pages)`

**Purpose.** Walk each `<article id="ch-...">` block in the
assembled book.html, resolve relative-path hrefs against the
chapter's URL parent, rewrite in-book targets to `#ch-...` anchors,
and strip the redundant landing-page H1.

**Algorithm.** Port of
[`docs/_plugins/book-href-rewrite.rb`](../docs/_plugins/book-href-rewrite.rb).

```js
const EXTERNAL_PREFIXES = ["http://", "https://", "mailto:", "#"];

export function rewriteBookHrefs(html, site, pages) {
  const bookData = site.bookData;
  const baseurl = normalizeBaseurl(site.config?.baseurl);
  // Augment with redirect-stub virtual pages so urlToAnchor / anchorToParent
  // include entries for redirect-from URLs (matching Jekyll's site.pages
  // which carries jekyll-redirect-from's stub Pages). See Status finding 3.
  const pagesWithStubs = augmentWithRedirectStubs(pages);
  const urlToAnchor = buildUrlToAnchor(bookData, pagesWithStubs);
  if (urlToAnchor.size === 0) return html;
  const anchorToParent = buildAnchorToParent(bookData, pagesWithStubs);
  const stripTargets = buildLandingStripTargets(bookData);

  return html.replace(
    /(<article[^>]*id="(ch-[^"]+)"[^>]*>)([\s\S]*?)(<\/article>)/g,
    (_, open, anchorId, body, close) => {
      if (stripTargets.has(anchorId)) {
        const level = stripTargets.get(anchorId);
        const re = new RegExp(`<${level}\\b[^>]*>[\\s\\S]*?</${level}>`);
        body = body.replace(re, "");
      }
      const parentUrl = anchorToParent.get(anchorId);
      if (parentUrl) {
        body = rewriteBodyHrefs(body, parentUrl, urlToAnchor, baseurl);
      }
      return open + body + close;
    },
  );
}

function rewriteBodyHrefs(body, parentUrl, urlToAnchor, baseurl) {
  return body.replace(/href="([^"]*)"/g, (whole, href) => {
    if (EXTERNAL_PREFIXES.some(p => href.startsWith(p))) return whole;
    const abs = resolveHref(href, parentUrl);
    if (!abs || !abs.startsWith("/")) return whole;
    const [pathPart, fragPart] = splitHash(abs);
    const lookupPath = stripBaseurl(pathPart, baseurl);
    const target = urlToAnchor.get(lookupPath);
    if (target) {
      return fragPart
        ? `href="#${target}-${fragPart}"`
        : `href="#${target}"`;
    }
    const missPath = fragPart ? `${lookupPath}#${fragPart}` : lookupPath;
    return `href="${missPath}"`;
  });
}
```

The shape of the regex sweep is the only meaningful difference from
`book-href-rewrite.rb`: Ruby uses `gsub` with `m` flag (`.` spans
newlines), JS uses `[\s\S]` to the same effect. Both consume the
entire article body atomically; nested `<article>` would break the
match (none exist in book.html).

**Three precomputed maps**, all built once per call:

- `urlToAnchor`: `Map<permalink, "ch-..">`. Keys include both the
  canonical permalink (`/tB/Core/Const`) and the alt-suffix forms
  (`/tB/Core/Const.html`, or `/tB/Core/Const/` for folder-style)
  to absorb source-side inconsistency between `[X](Y)` and
  `[X](Y.html)`.
- `anchorToParent`: `Map<"ch-...", parentUrl>`. The inverse-from-
  anchor's directory; `parentUrlOf(chapter.permalink)`.
- `stripTargets`: `Map<"ch-...", "h1"|"h2"|"h3">`. The heading-
  level to strip from landing pages. See §6.7.

`resolveHref` ports the Ruby `URI.merge` call:

```js
function resolveHref(href, parentUrl) {
  if (href.startsWith("/")) return href;
  try {
    const base = new URL("http://x" + parentUrl);
    const merged = new URL(href, base);
    return merged.hash
      ? `${merged.pathname}${merged.hash}`
      : merged.pathname;
  } catch {
    return null;
  }
}

function splitHash(abs) {
  const i = abs.indexOf("#");
  if (i === -1) return [abs, null];
  return [abs.slice(0, i), abs.slice(i + 1)];
}

function stripBaseurl(p, baseurl) {
  if (!baseurl) return p;
  if (p === baseurl) return "/";
  if (p.startsWith(baseurl + "/")) return p.slice(baseurl.length);
  return p;
}
```

`normalizeBaseurl` is the same one Phase 7 §6.12 ports — duplicated
inline rather than cross-imported, mirroring `book-href-rewrite.rb`'s
"plugins are independent" convention.

**Why rewrite hrefs at all.** Without this pass, every in-book
absolute href stays as e.g. `href="/tB/Core/Const"` in the PDF.
pagedjs renders those as live links pointing at the deploy URL,
which (a) need internet to work and (b) take the reader out of the
PDF rather than to the chapter that's in front of them. The
rewrite turns each one into `href="#ch-tB-Core-Const"`, a within-
PDF anchor jump.

**Why the URL→anchor map includes alt-suffix forms.** Source
authors write `[CheckBox](../CheckBox)` and
`[CheckBox](../CheckBox/)` interchangeably; the live site smooths
the difference via server-side trailing-slash redirect. The PDF
has no server. Adding both forms to the map covers it.

### 6.7. `buildLandingStripTargets(bookData)`

**Purpose.** Determine which `<article>` chapter anchors carry a
"strip the first HN heading" instruction, and at what heading
level.

**Algorithm.** Port of `book-href-rewrite.rb`'s
`build_landing_strip_targets`.

```js
function buildLandingStripTargets(bookData) {
  const map = new Map();
  for (const part of bookData.parts ?? []) {
    const partSkipBase = !!part.no_heading_shift;
    if (part.landing_page && !part.no_outline_entry) {
      const level = partSkipBase ? 1 : 2;
      const anchor = chapterAnchorFromUrl(part.landing_page, part.title);
      map.set(anchor, `h${level}`);
    }
    for (const ch of part.chapters ?? []) {
      if (!ch.landing_page || ch.no_outline_entry) continue;
      const chSkipExtra = !!ch.no_heading_shift;
      let level = 1;
      if (!partSkipBase) level++;
      if (!chSkipExtra) level++;
      const anchor = chapterAnchorFromUrl(ch.landing_page, ch.title);
      map.set(anchor, `h${level}`);
    }
  }
  return map;
}
```

The strip is skipped when `no_outline_entry: true` is set on the
carrying entry — in that case the landing's first heading IS the
chapter's PDF-outline bookmark target and must stay.

The level computation matches the Ruby plugin's table (reproduced
from the Ruby plugin's header comment):

```
Part-level landing:
  default:                  strip h2
  part.no_heading_shift:    strip h1

Chapter-level landing:
  default (both shifts):    strip h3
  ch_entry.no_heading_shift: strip h2
  part.no_heading_shift:    strip h2
  both flags set:           strip h1
```

### 6.8. `buildUrlToAnchor` + `buildAnchorToParent` (book entry iteration)

**Purpose.** Build the two maps the cross-reference rewriter (§6.6)
queries.

**Algorithm.** Port of `book-href-rewrite.rb`'s `build_url_to_anchor`
+ `build_anchor_to_parent`, both driven by `bookEntries(bookData)`,
fed by `augmentWithRedirectStubs(pages)` so jekyll-redirect-from's
stub Pages are present in the page list (matching Jekyll's
`site.pages`). The synth function:

```js
function augmentWithRedirectStubs(pages) {
  const out = pages.slice();
  for (const p of pages) {
    const from = p.frontmatter?.redirect_from;
    if (from == null) continue;
    const fromList = Array.isArray(from) ? from : [from];
    for (const fromPath of fromList) {
      if (typeof fromPath !== "string" || fromPath === "") continue;
      out.push({
        permalink: fromPath,
        navPath: p.navPath,
        frontmatter: { title: p.frontmatter?.title ?? "" },
        // No other fields needed -- rewriteBookHrefs only reads
        // permalink, navPath, frontmatter.title from the pages list.
      });
    }
  }
  return out;
}
```

The synth produces a Page-like with three fields:
- `permalink` = the redirect-from URL (matching jekyll-redirect-from's
  stub `page.url`),
- `navPath` = the source page's nav_path (so `nav_page` /
  `nav_pages` selectors still match the stub),
- `frontmatter.title` = the source page's title (used as the anchor-
  seed fallback when the redirect-from URL collapses to an empty
  seed, mirroring `chapter_anchor`'s second-arg semantics).

```js
function bookEntries(bookData) {
  if (!bookData) return [];
  const entries = [];
  for (const fm of bookData.front_matter ?? []) entries.push(fm);
  for (const part of bookData.parts ?? []) {
    if (part.page || part.pages || part.nav_page || part.nav_pages || part.landing_page) {
      entries.push(part);
    }
    if (part.foreword_page) {
      entries.push({ page: part.foreword_page, title: part.title, no_descent: true });
    }
    for (const ch of part.chapters ?? []) entries.push(ch);
  }
  return entries;
}

function entryPages(entry, pages, navByPath) {
  const out = new Set();
  const noDescent = !!entry.no_descent;
  for (const prefix of urlSpecsFor(entry)) {
    for (const p of pages) {
      if (noDescent ? p.permalink === prefix : p.permalink.startsWith(prefix)) out.add(p);
    }
  }
  for (const np of navSpecsFor(entry)) {
    for (const p of pages) {
      const navPath = p.navPath;
      if (!navPath) continue;
      if (noDescent ? navPath === np : navPath.startsWith(np)) out.add(p);
    }
  }
  if (entry.landing_page) {
    for (const p of pages) if (p.permalink === entry.landing_page) out.add(p);
  }
  return [...out];
}

function buildUrlToAnchor(bookData, pages) {
  const map = new Map();
  for (const entry of bookEntries(bookData)) {
    for (const page of entryPages(entry, pages)) {
      const anchor = chapterAnchorFromUrl(page.permalink, entry.title);
      map.set(page.permalink, anchor);
      if (page.permalink.endsWith("/")) {
        map.set(page.permalink.replace(/\/$/, ""), anchor);
      } else if (page.permalink.endsWith(".html")) {
        map.set(page.permalink.replace(/\.html$/, ""), anchor);
      } else {
        map.set(page.permalink + ".html", anchor);
      }
    }
  }
  return map;
}

function buildAnchorToParent(bookData, pages) {
  const map = new Map();
  for (const entry of bookEntries(bookData)) {
    for (const page of entryPages(entry, pages)) {
      map.set(chapterAnchorFromUrl(page.permalink, entry.title), parentUrlOf(page.permalink));
    }
  }
  return map;
}
```

`entryPages` reproduces `book-href-rewrite.rb`'s `entry_pages` — the
same selector schema as Phase 2's `collectMatches` but with `Set`
deduplication to mirror Ruby's `pages.uniq`. Phase 8 reuses Phase
2's `pages[]` array rather than re-querying `site.pages`.

**Note on duplication with Phase 2.** Phase 2's
`resolveBookChapters` already walked `bookData` and built
`_chapters` arrays — but Phase 2 stored `Page` objects, not the
anchor / parent strings. Phase 8 needs the anchor / parent
mappings, so it walks the same structure again. The cost is ~5 ms;
not worth pre-computing in Phase 2 because Phase 2's outputs are
shared across phases 3-7 and adding two more maps would inflate
the in-memory state for everyone.

### 6.9. The title page + part divider renderers

**Purpose.** Emit the static head + title page + per-part divider
HTML matching `book.html`'s Liquid output byte-for-byte.

**Algorithm.**

```js
function renderBookHead(lang, siteTitle) {
  return `<!DOCTYPE html>
<html lang="${escAttr(lang)}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(siteTitle)}</title>
  <link rel="stylesheet" href="assets/css/rouge.css">
  <link rel="stylesheet" href="assets/css/print.css">
</head>`;
}

function renderTitlePage(site) {
  const commit = site.buildInfo?.commit ?? "unknown";
  const commitDate = site.buildInfo?.commitDate ?? "unknown";
  const buildDate = formatBuildDate(commitDate);
  let buildLine;
  if (commit !== "unknown") {
    buildLine = commitDate !== "unknown"
      ? `Built ${buildDate} from commit ${commit} (${commitDate}).`
      : `Built ${buildDate} from commit ${commit}.`;
  } else {
    buildLine = `Built ${buildDate}.`;
  }
  const copyright = String(site.config?.footer_content ?? "");
  // Jekyll's `{%- assign -%}` / `{%- if -%}` blocks between
  // `<div class="title-footer">` and `<p class="build-info">` eat ALL
  // surrounding whitespace; the two tags join directly post-compress.
  // See Status finding 6.
  return `<section class="title-page" id="title-page">
  <div class="title-block">
    <h1 class="book-title">twinBASIC Documentation</h1>
    <p class="book-subtitle">Reference Manual &amp; Tutorials</p>
  </div>
  <div class="title-footer"><p class="build-info">${buildLine}</p>
    <p class="copyright-line">${copyright}</p>
  </div>
</section>`;
}

function renderPartDivider(part, partNum, site) {
  const silent = part.no_outline_entry ? " silent" : "";
  const titleHtml = part.no_outline_entry
    ? `<p class="part-title-silent">${escapeHtml(part.title)}</p>`
    : `<h1 id="pt-${partNum}-title">${escapeHtml(part.title)}</h1>`;
  let out = `<article class="part-divider${silent}" id="pt-${partNum}">
  <span class="part-title-string">${escapeHtml(part.title)}</span>
  <p class="part-number">Part ${ROMAN[partNum - 1]}</p>
  ${titleHtml}`;
  if (part.subtitle) {
    out += `\n  <p class="part-subtitle">${markdownifyInline(part.subtitle, site.markdown)}</p>`;
  }
  if (part.intro) {
    out += `\n  <div class="part-intro">${site.markdown.render(part.intro)}</div>`;
  }
  out += `\n</article>`;
  return out;
}

function renderChapterDivider(chEntry) {
  const idSeed = chEntry.landing_page
    ? chEntry.landing_page.replaceAll("/", "-").replace(/^-/, "").replace(/-$/, "")
    : String(chEntry.title ?? "").toLowerCase().replaceAll(" ", "-");
  const dividerId = `chd-${idSeed}`;
  const silent = chEntry.no_outline_entry ? " silent" : "";
  const titleHtml = chEntry.no_outline_entry
    ? `<p class="chapter-title-silent">${escapeHtml(chEntry.title)}</p>`
    : `<h2 id="${dividerId}-title">${escapeHtml(chEntry.title)}</h2>`;
  let out = `<article class="chapter-divider${silent}" id="${dividerId}">
${titleHtml}`;
  if (chEntry.subtitle) {
    out += `\n  <p class="chapter-subtitle">${escapeHtml(chEntry.subtitle)}</p>`;
  }
  out += `\n</article>`;
  return out;
}
```

The exact whitespace inside these templates matters for byte-parity
with Jekyll's output (book-combined.html uses literal newlines and
two-space indents); `compressHtml` at the end collapses the
whitespace anyway, but the pre-compress source needs to match
Jekyll's pre-compress source so the post-compress bytes line up.

`markdownifyInline` is a small helper that runs markdown-it on a
single line, then strips the wrapping `<p>...</p>` — the Liquid
template uses `subtitle | markdownify | remove: '<p>' | remove:
'</p>' | strip`. Reuses Phase 3's markdown-it instance from
`site.markdown` (which Phase 3 stashes on the site object).

### 6.10. `formatBuildDate(iso)`

**Purpose.** Format a build date in the same shape Jekyll's `site.time
| date: "%-d %B %Y"` produces: e.g. `"26 May 2026"`.

**Algorithm.**

```js
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatBuildDate(iso) {
  if (!iso || iso === "unknown") {
    const d = new Date();
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Parse YYYY-MM-DD explicitly. `new Date("2026-05-26")` parses
  // as UTC midnight, and `.getDate()` under a negative UTC offset
  // (every US runner) returns the previous day. See Status
  // finding 7.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const da = parseInt(m[3], 10);
    return `${da} ${MONTH_NAMES[mo - 1]} ${y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
```

`iso` is `site.buildInfo.commitDate` — typically an ISO 8601
string like `"2026-05-26"`. The format string `"%-d %B %Y"`
produces `"26 May 2026"` (day without leading zero + full month
name + 4-digit year). The fallback to `new Date()` mirrors Jekyll's
`site.time` (which Jekyll sets to the build's wall-clock at
process start).

### 6.11. `escapeHtml`, `escAttr`

**Purpose.** Standard HTML attribute / text escapers.

**Algorithm.**

```js
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}
```

These are the same shape as Phase 4's `template.mjs` exports.
Phase 8 could re-import from there; the duplication is two-line
each and keeps `book.mjs` standalone for callers that don't load
the whole template module (e.g. the diff tools).

---

## 7. Design decisions and assumptions

### D1. Phase 8 wipes `<pdfRoot>/` entirely, not contents-only

Unlike Phase 7 (which honours Jekyll offlinify's wipe-contents-keep-
directory pattern), Phase 8 uses `fs.rm(pdfRoot, { recursive:
true, force: true })`. The watcher concern that motivates the
offline pattern doesn't apply to the PDF tree — pagedjs reads
book.html on-demand at PDF-build time, never during the
incremental development loop. Deleting the parent also clears
orphan image directories left behind by deleted source pages.

This mirrors pdfify.rb's `FileUtils.rm_rf(dest)` + `FileUtils.mkdir_p(dest)`.

### D2. Phase 8 runs after Phase 5 + Phase 6 + Phase 7

Phase 8 reads from `<destRoot>/assets/css/` (the two stylesheets);
Phase 5 already wrote those. Phase 6/7 produce no files Phase 8
reads. The orchestrator ordering is:

```
discover → nav/seo/book/buildInfo → render → template → write
  → auxiliaries → offline → pdf
```

Phase 8 could in principle parallel-fan with Phase 7 — neither
reads the other's output — but the orchestrator runs them
sequentially. The simplification keeps the per-phase timing line
honest and avoids an `await Promise.all([...])` wrap around two
unrelated I/O passes. Phase 8's wall time (~150 ms) is small
relative to Phase 7's (~1 s), so the parallelism wouldn't shave
much.

### D3. `<destRoot>/` is read-only input

Phase 8 reads `<destRoot>/assets/css/print.css` and
`<destRoot>/assets/css/rouge.css`. Both are reads only — Phase 8
never writes back to `<destRoot>/`. The online deploy artifact
stays canonical.

If the reads moved to in-memory (read once from `builder/assets/`
in Phase 5 and stash on the orchestrator's `deps` object), Phase 8
wouldn't need to touch `<destRoot>/` at all. The current spec
accepts the disk reads for simplicity (40 KB across two files,
~5 ms total); promotion to in-memory is a follow-up.

### D4. The cross-reference rewrite is a separate pass, not per-chapter

The Ruby plugin runs `BookHrefRewrite.process` at `:pages,
:post_render` — after the whole book.html is assembled. The
alternative would be to run the rewrite inside `emitChapter`, on
each chapter body, before wrapping in the `<article>` tag.

**The post-assembly pass wins** for two reasons:

1. **Map lifetimes.** `urlToAnchor` / `anchorToParent` /
   `stripTargets` are built once and queried across every article.
   Building them inside `emitChapter` would either rebuild per call
   (wasteful) or stash globals (uglier).
2. **Strip-targets need the assembled context.** A landing-page
   `<article>` carries an `id="ch-..."` that the strip-targets map
   keys on. The strip itself is on the article body, but the
   decision lives in the part/chapter manifest. Wiring per-article
   to per-chapter would push the manifest lookup into the wrong
   layer.

The cost of the post-assembly pass is one regex sweep over the
~5.5 MB book.html — ~50 ms on the dev machine, well within budget.

### D5. `book.html`'s frontmatter is consulted only for the layout key

Phase 8 reads `bookPage.frontmatter.layout` (to find the book page)
and otherwise ignores the page itself. The `permalink: /book.html`
+ `sitemap: false` fields don't matter for PDF assembly — Phase 6
already used them to skip the sitemap entry; Phase 7 already used
`book-combined` to skip the offline copy. Phase 8 doesn't write to
`<pdfRoot>/book.html` based on the permalink (the path is
hardcoded; pagedjs expects exactly that name).

### D6. No `--no-pdf` opt-out in the first cut

Jekyll's `also_build_pdf: false` skips the PDF build entirely.
tbdocs's first cut doesn't expose this flag; the PDF build always
runs (~150 ms cost). If a production deploy ever wants to skip it
(unlikely, since the PDF is fast and useful), add a `--no-pdf` CLI
flag to `parseArgs` and gate the `writePdf` call.

Currently the `_config.yml` has `also_build_pdf: true`; tbdocs
honours that as the default-and-only behaviour. Worth gating on
the config value when the flag lands (so the config file remains
the source of truth).

### D7. Build date sources from `site.buildInfo.commitDate`, not a separate `site.time`

Jekyll's title page uses `site.time | date: "%-d %B %Y"` —
Jekyll's wall-clock at process start. tbdocs has `site.buildInfo.commit`
and `.commitDate` from Phase 2's `captureBuildInfo`. Phase 8 reads
`commitDate` as the build date (formatted via `formatBuildDate`).

The two semantics differ in edge cases:

- **Build during the same day as the commit.** Identical output.
- **Build during a later day.** Jekyll says "Built {today}"; tbdocs
  says "Built {commit-date}". For the production CI build this is
  effectively the same — CI builds on every commit.
- **Build outside a repo (no git).** Both fall back: Jekyll uses
  `site.time` (process wall-clock); tbdocs uses `new Date()`
  formatted the same way. Identical output.

The deviation is intentional. The commit date is more meaningful
than the build-machine wall-clock for a manual `book.bat` run
days after the source was last touched. If parity with Jekyll
matters in a specific deploy scenario, swap to `new Date()` in
`formatBuildDate`'s unset-branch.

### D8. Theme assets sourced from `<destRoot>/assets/`, not `builder/assets/`

Two options for the source of the CSS copies:

1. **From `<destRoot>/assets/css/`** (recommended). What Phase 5
   just copied. Tracks any future post-copy transformation Phase 5
   might apply.
2. **From `builder/assets/css/`** (the source of truth). One disk
   read fewer (already paid by Phase 5).

Option 1 wins on the "what's in the PDF tree mirrors what's in the
online tree" model. The disk-read cost is negligible (~20 KB total
across two files). Same rationale as Phase 7 §7.D13.

### D9. Strict mode is the default

Pdfify.rb gates strict-mode missing-image throws behind
`site.config["serving"]` — `false` in `jekyll build`, `true` in
`jekyll serve`. The split lets CI fail on broken image refs while
keeping the dev watcher alive during mid-edit saves.

tbdocs has no `serve` mode today, so `serving` defaults to `false`
and every Phase 8 invocation runs in strict mode. The throw fires
on any missing image. A future `--serving` flag (or watch-mode
addition) would set `serving: true` to switch to the warn-only path.

The current dev tree has zero missing images, so this is a no-op
in practice. The strict mode exists as a real bug signal — every
miss is an `<img src=>` in source markdown that points at a path
that doesn't exist on disk, and the rendered PDF would have a
broken-image placeholder there.

### D10. Two-module split

The Phase 8 implementation extends an existing module (`book.mjs`,
Phase 2's compute module) and adds one new module (`pdf.mjs`). See
§3's "Why split between `book.mjs` and `pdf.mjs`" subsection for the
rationale.

If `book.mjs` ever grows past ~1000 lines, splitting Phase 8's
assembler half out into `book-assemble.mjs` is a natural refactor.
The current target is ~600-700 lines added to `book.mjs` plus
~250 lines of `pdf.mjs`; comfortably under the threshold.

### D11. `compressHtml` runs over the whole assembled document

The Phase 4 `html-compress.rb` port (`compress.mjs`) is layout-
agnostic — it takes a string, protects `<pre>...</pre>` ranges,
collapses everything else's whitespace to single spaces. Phase 8
reuses it on the assembled book.html.

The Jekyll `html-compress.rb` plugin runs against book.html at
`:pages, :post_render :normal` priority (after BookHrefRewrite's
`:high` mutator). tbdocs's call order is the same: `assembleBook`
runs `rewriteBookHrefs` first, then `compressHtml`. Output is
byte-identical to Jekyll's compressed book.html.

### D12. Markdown-it for `part.subtitle` / `part.intro`

book.html's Liquid uses `markdownify` on `part.subtitle` (then
strips the wrapping `<p>`) and on `part.intro`. Phase 8 reuses the
markdown-it instance Phase 3 stashed on `site.markdown` — a one-off
render per subtitle / intro string, ~1 ms total across all parts.

If `site.markdown` isn't set (e.g. in a future code path that
calls `assembleBook` without Phase 3 having run), Phase 8 throws
with a clear message. The diff tools always run Phase 3 before
calling `assembleBook`, so this is a defensive check rather than a
case to handle gracefully.

### D13. `pages[]` order is the source-discovered order, not the book.yml order

`assembleBook` walks `bookData.front_matter[]` and `bookData.parts[]`
in manifest order, not in `pages[]` order. Phase 8 looks pages up
by URL via the resolved `_chapters` / `_landing` / `_foreword`
arrays — every chapter reference is a direct Page-object pointer
that Phase 2 set up.

The `pages[]` array passed to Phase 8 is the same one Phases 1-7
worked with; Phase 8 reads it only when building the
`urlToAnchor` / `anchorToParent` maps (§6.8). The iteration order
there doesn't matter — the maps' content is the same regardless of
input ordering.

### D14. `assembleBook` is pure compute; no per-build mutation of `site` or `pages`

Phase 8 doesn't mutate `site.bookData._chapters` (Phase 2 already
filled them in), doesn't add fields to any Page, doesn't add
fields to `site`. The single output is the returned `bookHtml`
string. This matters because:

- Re-running Phase 8 produces the same output (deterministic).
- The diff tools can call `assembleBook` multiple times in one
  process without state leaking across invocations.
- Phase 2-7's per-page derivations are unaffected.

The verify harness exploits this: it can run `assembleBook` in
isolation (against the Phase 1+2+3 outputs only — Phase 4-7 don't
need to have run) for fast iteration.

### D15. `site-attached image references` resolve through `staticFiles[]`, not source-tree probing

Phase 8's image-copy pass looks up each `<img src=>` path against
`Map<destRel, staticFile>` built from Phase 1's `staticFiles[]`. It
does NOT probe `<srcRoot>/<rel>` directly.

Two reasons:

1. **Phase 1 already enumerated the source tree.** Re-probing
   per-image would duplicate work.
2. **`staticFiles[]` is the source of truth for "what shipped in
   `_site/`".** Phase 8's PDF tree mirrors `_site/`'s file layout
   by design; using Phase 1's inventory keeps the two trees
   consistent. A future deviation (e.g. an image excluded from
   `_site/` via an `exclude:` pattern but referenced by book.html)
   would surface as a missing-image error here — which is the
   right behaviour.

The cost of building the lookup map is ~234 entries × ~50 µs ≈
12 ms once per build. Per-image lookup is O(1).

### D16. Roman-numeral table is 20 entries

book.html's Liquid hardcodes 20 roman-numeral entries (`I` through
`XX`). Phase 8 ports this verbatim. The current book has 6 parts;
the cap is forward-compat for up to 20 parts. If a 21st part is
ever added, both Jekyll and tbdocs would emit an empty `<p
class="part-number">Part </p>` — clear and easy to spot in review.

### D17. `compressHtml` priority ordering equivalence

Jekyll's `html-compress.rb` runs at `:pages, :post_render :normal`
priority. `book-href-rewrite.rb` runs at `:high` (a mutator
running before the cleanup). The convention: mutators at `:high`,
cleanup at `:normal`, readers at `:low`.

tbdocs's `assembleBook` runs the equivalent sequence inline:

```js
let html = (out.join(""));
html = rewriteBookHrefs(html, site, pages);   // mutator
html = compressHtml(html);                    // cleanup
return html;
```

No reader step (Jekyll's `:low` slot) — Phase 8 itself is the
reader, processing the cleaned-up HTML downstream in
`extractImagePaths` and the file write. Mirrors PLAN-7 §7.D5's
equivalent ordering invariant.

---

## 8. Edge cases

### Chapter content

| Case | Handling |
|---|---|
| Empty chapter body (`chapter.renderedContent === ""`) | `emitChapter` returns silently; no `<article>` emitted. Mirrors `book-chapter-body.html`'s `unless stripped == ""` gate. |
| Chapter body containing only whitespace | Same as empty (`stripped.trim() === ""`). |
| Chapter with no frontmatter title | `chapter.frontmatter.title ?? ""` empties to `""`; the running-header span renders as `<span class="header-string"></span>`. Currently no pages on the dev tree hit this. |
| Chapter URL = `/` | The chapter anchor falls back to `ch-{title-slug}`. The front-matter Introduction entry hits this; the fallback emits `ch-introduction`. |
| Chapter URL with trailing slash (`/Features/`) | `chapterAnchorFromUrl` produces `ch-Features` (the trailing `-` is stripped). Sub-page detection sees the trailing slash and sets `currentIndexUrl`. |
| Chapter present in `_chapters` but missing from `pages[]` (impossible by construction; Phase 2 puts only Page objects in `_chapters`) | Defensive: `chapter` would be `undefined`; `chapter.renderedContent` would throw. Phase 2 §6.4 asserts every `_chapters` entry is a Page; the throw here would surface a Phase 2 contract bug. |

### Chapter transform

| Case | Handling |
|---|---|
| Body with no `src="<baseurl>/"` references (baseurl is "") | Step 1 is a no-op. |
| Body with no `<details>`/`<summary>` | Step 2 regex finds nothing; pass-through. |
| Body with N `<details>` blocks | Each block's `<details>` open and `</details>` close are stripped independently; the body content stays intact (the unwrapping mirrors the FAQ's collapsible-section flattening). |
| Body with no whitespace-sensitive `</span>...<span>` sequences | Step 3 patterns find nothing; pass-through. |
| Body with headings beyond h6 source (impossible — markdown caps at h6) | Heading shift never targets h7+ in the source; the shift only generates h7-stub when source-h6 + N > 6. |
| `headingShiftN === 0` | Step 4 skipped entirely. |
| Body with no headings (rare; only `intro` paragraph) | Step 4 regex finds nothing; pass-through. |
| Chapter anchor empty string | Step 5 skipped (`if (chapterAnchor)` gate). Practically impossible — `chapterAnchorFromUrl` always returns at least `"ch-"`. |
| Body with `href="#foo"` (intra-chapter link) | Step 5 rewrites to `href="#${chapterAnchor}-foo"`. Subsequent `rewriteBookHrefs` leaves this alone (the `EXTERNAL_PREFIXES` test catches the `#` prefix). |

### Cross-reference rewrite

| Case | Handling |
|---|---|
| `href="https://github.com/..."` | `EXTERNAL_PREFIXES` early-return; preserved. |
| `href="mailto:foo@bar"` | Same; preserved. |
| `href="#ch-Foo-bar"` (already prefixed by Step 5) | `EXTERNAL_PREFIXES` includes `#`; preserved. |
| `href="../Const"` (relative; resolves to `/tB/Core/Const`) | `resolveHref` returns `/tB/Core/Const`; `urlToAnchor.get("/tB/Core/Const")` returns `ch-tB-Core-Const`; rewrite to `href="#ch-tB-Core-Const"`. |
| `href="../Const.html"` (relative with .html) | `resolveHref` returns `/tB/Core/Const.html`; `urlToAnchor` has the `/tB/Core/Const.html` alt-form (`buildUrlToAnchor`'s alt-suffix loop); hit. |
| `href="../Const#syntax"` (relative with fragment) | `resolveHref` returns `/tB/Core/Const#syntax`; split → path `/tB/Core/Const`, frag `syntax`; map hit; rewrite to `href="#ch-tB-Core-Const-syntax"`. |
| `href="/Features/Language/Generics"` (absolute, in-book) | `stripBaseurl` no-op (baseurl empty); `urlToAnchor.get(...)` hit; rewrite. |
| `href="/tB/Core/Missing"` (absolute, out-of-book) | `urlToAnchor` miss; the emitted href is the baseurl-stripped form (`href="/tB/Core/Missing"`). Dead in the PDF; flagged by no automated check (mirrors `book-href-rewrite.rb`'s "out-of-book passes through" behaviour). |
| Article body containing a nested `<article>` (impossible by construction) | The outer regex sweep would close on the inner `</article>`, slicing the outer's content. None exist; defensive cross-check not added. |

### Landing strip

| Case | Handling |
|---|---|
| Part with `landing_page` and `no_outline_entry: true` | Strip targets map skips the anchor; landing's first heading stays. |
| Part with `landing_page` and `no_outline_entry: false` and `no_heading_shift: true` | Strip targets map adds the anchor → `h1`. Landing's first H1 stripped. |
| Part with `landing_page` and default flags | Strip targets map adds the anchor → `h2`. Landing's first H2 (shifted from source H1) stripped. |
| Chaptered part chapter with `landing_page` and both shift flags set | Strip targets map adds the anchor → `h1`. |
| Chaptered part chapter with `landing_page` and one shift flag set | `h2`. |
| Chaptered part chapter with `landing_page` and no shift flags | `h3`. |
| Landing's source body has no matching HN heading | The regex matches the first `<hN>...</hN>` block; if absent, `body.replace(re, "")` is a no-op (no match). Defensive — the strip silently does nothing rather than throwing. |

### Image extraction

| Case | Handling |
|---|---|
| `<img src="Features/Images/foo.png">` (relative) | Extracted; path added to copy list. |
| `<img src="/Features/Images/foo.png">` (absolute) | Skipped by the regex's leading-`/` exclusion. Should never appear after Phase 8's chapter-transform step (`src="${baseurl}/..."` strip removes the prefix); a surviving absolute href would surface as a Phase 8 source-side bug. |
| `<img src="https://github.com/user-attachments/...">` | Skipped by the regex's URL-scheme exclusion. pagedjs handles these at PDF-render time (or fails to, if offline; not Phase 8's concern). |
| `<img src="foo.png?ver=2">` (with query) | The `path.split(/[?#]/, 1)[0]` strips the `?ver=2`; the bare path `foo.png` lands in the list. |
| `<img src="foo.png#section">` (with fragment) | Same — fragment stripped. |
| Two `<img src="X">` references to the same path | `Set` dedup keeps one entry; both reference the same on-disk file. |
| `<img src="X">` inside a `<code>` block | The code-block alternative consumes the block atomically; the inner src is not extracted. (Tutorial code samples showing `<img>` syntax don't generate spurious entries.) |
| `<img src="X">` inside a `<pre>` block | Same — pre-block alternative consumes it. |
| Source markdown with no images | `imagePaths` is empty; `copyPdfImages` is a no-op; counters.images = 0. |

### Missing images

| Case | Handling |
|---|---|
| Image referenced from book.html exists in `staticFiles[]` (the common case) | Copied to `<pdfRoot>/<destRel>`; `counters.images++`. |
| Image referenced from book.html missing from `staticFiles[]` | `missingPaths.push(rel)`; `counters.missing++`. After all copies, `reportMissingImages` logs per-path errors and throws (strict mode). |
| Image referenced from book.html and present in source but excluded from Phase 1 inventory | Same as missing — `staticFiles[]` is the source of truth (§7.D15). Investigate the Phase 1 exclude rule in this case. |
| Image referenced from book.html in a `<code>`/`<pre>` block (false positive from a careless extractor) | Handled by §6.B's regex skip; never reaches the missing list. |

### Static-file pass + CSS copy

| Case | Handling |
|---|---|
| `<destRoot>/assets/css/print.css` exists | Copied verbatim to `<pdfRoot>/assets/css/print.css`. |
| `<destRoot>/assets/css/rouge.css` exists | Copied verbatim. |
| Either CSS file missing | One warning logged: `pdf: missing required asset assets/css/<name>; pagedjs render may break`. Build continues. PDF will render with default styling for that file's rules. |
| CSS file present but unreadable (permission error) | `safeWrite` wraps `fs.copyFile`; the error message identifies the source path. The throw propagates. |
| `<pdfRoot>` already contains a previous build's `assets/` tree | `setupPdfDest` `fs.rm -rf` cleared it before copy starts. |

### Book.html assembly

| Case | Handling |
|---|---|
| `bookData` is `undefined` (no `_data/book.yml`) | `assembleBook` throws with a clear message. Phase 2 already populates `site.bookData`; this is a Phase-2-didn't-run signal. |
| `bookData.parts` is empty array | The parts loop emits nothing; the title page + front_matter (if any) is the entire book. |
| `bookData.front_matter` is empty / undefined | The front-matter loop emits nothing. |
| `part.chapters` is undefined and `part._chapters` is empty | Flat-part loop iterates an empty list; only the part divider emits. |
| `part._foreword` and `part._landing` both set on a chaptered part | Both emit, in the order foreword → landing → chapter content. |
| `part._foreword` or `part._landing` set but the URL didn't resolve in Phase 2 (the Page wasn't in `pages[]`) | The Phase 2 resolver leaves the property `undefined`. Phase 8's `if (part._foreword)` gate skips the emit. (A Phase 2 invariant warning would catch this earlier.) |
| 20 parts in `bookData.parts[]` | All 20 roman numerals emit; cap reached. |
| 21 parts | `ROMAN[20]` is `undefined`; `<p class="part-number">Part </p>` emits an empty roman-numeral. (Matches the Liquid behaviour.) |

---

## 9. What's NOT in Phase 8

These belong elsewhere or are out of scope. Listed so the
implementer doesn't get tempted.

- **PDF rendering itself** — `pagedjs-cli` is invoked by
  [`docs/book.bat`](../docs/book.bat), not by Phase 8. Phase 8 just
  writes the inputs pagedjs consumes. Running pagedjs from inside
  the builder would add a ~30 s `npx` invocation to every full
  build; that's an explicit dev decision left as a separate step.
- **Watch-mode rebuilds** — tbdocs has no watcher. Phase 8 wipes
  `<pdfRoot>/` and rebuilds from scratch on every invocation.
- **Incremental rebuilds** — same; full rebuild only.
- **`book.html` source-side validation** — Phase 8 trusts
  `book.html`'s frontmatter to declare `layout: book-combined`.
  If the frontmatter changes, Phase 8 throws (§5.1).
- **Missing-image healing** — Phase 8 reports and throws; it doesn't
  try to substitute a placeholder image or skip the reference.
  Source-side fix only.
- **PDF outline customisation** — pagedjs derives the PDF outline
  from the heading structure in book.html (the `<h1 id="...">`,
  `<h2 id="...">`, etc. tree). Phase 8's heading-shift and
  landing-strip passes are the only place that shape is
  manipulated; further outline tweaks would happen in `print.css`
  or in `book.html`'s Liquid (which Phase 8 ports verbatim).
- **A standalone book.bat-equivalent inside the builder** — Phase
  8 produces `<pdfRoot>/book.html`; the existing
  [`docs/book.bat`](../docs/book.bat) shell script reads from there
  and produces `_pdf/book.pdf`. The shell script stays.
- **`also_build_pdf: false` honouring** — see §7.D6. The first cut
  always runs Phase 8.

---

## 10. Verification

### Acceptance checklist for "Phase 8 is done"

1. After Phase 8 runs on the production tree:
   - `<pdfRoot>/` exists and is non-empty.
   - `<pdfRoot>/book.html` exists; size is within ±5 % of Jekyll's
     `docs/_site-pdf/book.html` size (~5.5 MB).
   - `<pdfRoot>/assets/css/print.css` exists; byte-equal to
     `<destRoot>/assets/css/print.css`.
   - `<pdfRoot>/assets/css/rouge.css` exists; byte-equal to
     `<destRoot>/assets/css/rouge.css`.
   - Every `<img src=>` referenced from `<pdfRoot>/book.html` has a
     corresponding file under `<pdfRoot>/`. Zero missing images.
   - The file count under `<pdfRoot>/` matches Jekyll's
     `docs/_site-pdf/` file count (currently 88: 1 book.html + 2
     CSS + 85 images).

2. **`book.html` per-article byte parity:**
   - Split `<pdfRoot>/book.html` and `docs/_site-pdf/book.html` on
     `<article ...>...</article>` boundaries (parsing the `id="..."`
     anchor on each). Normalise the build-info line on both sides.
   - For each `(ours[i], jekyll[i])` pair: byte-equal pass through,
     mismatch counts as a divergence UNLESS the anchor's source page
     is in `ACCEPTED_DIVERGENCE_PATHS` (the per-article skip-list
     covers the Rouge-vs-Shiki / kramdown-vs-markdown-it pre-existing
     rendering divergences that propagate from Phase 3 -- not
     Phase 8 bugs).
   - The header / title-page prefix (everything before the first
     `<article>`) must byte-match exactly.
   - Article count must match between sides.
   - Acceptable result: every article either matches exactly or has
     a source page in the accepted-divergence set.

3. **Cross-reference rewrite parity:**
   - For 10 spot-checked in-book href targets (a mix of front-matter
     reference, part-divider reference, chaptered-part chapter
     reference, and one deeply-nested sub-page reference): the
     `href="#ch-..."` value matches Jekyll's exactly.
   - Three spot-checked out-of-book hrefs (e.g.
     `/Documentation/Development`): the unrewritten path matches
     Jekyll's (baseurl-stripped, not wrapped in an anchor).

4. **Landing-strip parity:**
   - For each part / chaptered-chapter with a `landing_page` and
     `no_outline_entry: false`: the landing's `<article>` body in
     `<pdfRoot>/book.html` is missing its first `<hN>` heading
     (where N matches §6.7's table).
   - For each entry with `no_outline_entry: true`: the landing's
     first heading is present.

5. **Image-extraction parity:**
   - For every `<img src=>` in `<pdfRoot>/book.html`, the source
     path appears in Phase 8's `imagePaths` list (extracted via
     `extractImagePaths`).
   - Every `<img src=>` resolves to a file in `<pdfRoot>/`.

6. **Functional check (deferred to manual verification):**
   - Run `cd docs && book.bat`; assert that `_pdf/book.pdf` is
     produced without errors.
   - Open the PDF; verify the title page renders with the build
     info; verify the table of contents matches the article
     structure; verify cross-reference clicks navigate within the
     PDF.

### Verification harness

`verify-phase8.mjs` (~270 lines), extending the `verify-phase7.mjs`
pattern. It:

1. Runs `discover()` through `writePdf()` (Phases 1-8) into a
   scratch destination (`docs/_site-verify/` + offline +
   `docs/_site-verify-pdf/`).
2. Runs Phase 8 with timing capture.
3. Asserts the structural items above (pdfRoot exists, book.html size
   reasonable, CSS byte-equal vs destRoot, zero missing images).
4. **Per-article byte-parity vs `docs/_site-pdf/book.html`**: parses
   both sides on `<article ... id="...">...</article>` boundaries,
   normalises the build-info line on both, compares each article
   pair; counts `match` / `accepted` / `unaccepted` per the
   `ACCEPTED_DIVERGENCE_PATHS` set; fails if any unaccepted
   divergence. The header-and-title-page prefix must byte-match;
   article counts must match.
5. **Cross-reference spot checks**: four `href="#ch-..."` patterns
   (FAQ, Features, Reference-Statements, Tutorials-Arrays) plus
   one out-of-book href preserved as an absolute path.
6. **Landing-strip spot check**: the `ch-Features` article has no
   `<h2>` (default flags strip h2).
7. **Walks the assembled book.html** and asserts every `<img src=>`
   resolves to a file under `<pdfRoot>/`.
8. **File-count compare** vs `docs/_site-pdf/` (88 files expected on
   the current tree).
9. **`deriveBookOutputs` determinism**: calls it twice, asserts
   byte-identical result.
10. Prints `OK <check>` / `FAIL: <reason>` per check, per-substep
    timings up front, `WARN` if total Phase 8 wall-time exceeds
    500 ms.
11. Cleans up the verify destinations and exits non-zero on any
    failure.

Total checks: ~17 (4 structural + 1 header + 1 article count + 1
per-article diff + 5 cross-refs + 1 landing-strip + 1 image-resolve
+ 1 file-count + 1 determinism + 1 perf). The per-article diff (item
4) is the central guarantee; the spot checks (5-6) are sanity
backstops that surface issues in human-readable form when the
per-article diff fails.

### Byte-for-byte parity matrix

| Output | Target | Notes |
|---|---|---|
| `<pdfRoot>/book.html` | per-article byte parity vs `docs/_site-pdf/book.html` modulo build-info normalisation + the per-article `ACCEPTED_DIVERGENCE_PATHS` skip-list | All Phase 8 transformations (chapter transform, cross-ref rewrite, landing strip, html-compress) are deterministic. The remaining divergences are Phase 3 rendering differences flowing through: 6 accepted articles on the current tree (5 Rouge-vs-Shiki tokenisation + 1 kramdown-vs-markdown-it emphasis on Reference/Attributes.md). |
| `<pdfRoot>/assets/css/print.css` | byte-identical to `<destRoot>/assets/css/print.css` | Pure copy. |
| `<pdfRoot>/assets/css/rouge.css` | byte-identical | Pure copy. |
| Each image under `<pdfRoot>/` | byte-identical to `<srcRoot>/<destRel>` | Pure copy from `staticFile.srcPath`. |

Two documented divergence sources from Jekyll's `_site-pdf/book.html`:

1. **Build-info line** -- `<p class="build-info">Built X from commit
   Y (Z).</p>` varies with build wall-clock + git state. The verify
   harness normalises both sides to `Built BUILDDATE from commit
   COMMIT (COMMITDATE).` before diff.
2. **Per-article accepted divergences** -- Phase 3 (markdown-it vs
   kramdown) emits different tokenisation for certain code-fence
   languages and one emphasis edge case. The pre-existing
   `ACCEPTED_DIVERGENCE_PATHS` set in
   [`builder/accepted-divergences.mjs`](accepted-divergences.mjs)
   names the source pages; the verify harness allows the
   corresponding articles to differ.

### Performance smoke check

```sh
node builder/tbdocs.mjs                # one-line per-phase timings
cd builder && node verify-phase8.mjs  # ~25-check harness + timings
```

Projected wall time on the dev machine (Windows 10, three runs
averaged):

| Substep | Target |
|---|---|
| `assembleBook` (assembly) | ~30 ms |
| `extractImagePaths` (regex sweep) | ~10 ms |
| `setupPdfDest` (wipe + mkdir) | ~5 ms |
| `writePdfBook` (5.5 MB write) | ~15 ms |
| `copyPdfCss` (2 small copies) | ~3 ms |
| `copyPdfImages` (~85 file copies) | ~80 ms |
| **Phase 8 total** | **~140 ms** (target <500 ms soft cap) |

Same caveat as Phase 7: the projected numbers are extrapolations
from V8 / libuv microbenchmarks; the first measured run may differ.
Capture timing in the first cut's verify harness output.

The Jekyll baseline for comparison (after the recent optimizations
that landed on `book.html` rendering): ~600 ms total (book.html
Liquid ~500 ms + book-href-rewrite ~80 ms + book-chapter-transform
folded into render ~20 ms + pdfify.rb ~50 ms). Phase 8's target
runs ~4× faster, dominated by the elimination of Liquid (replaced
by direct JS walks) and book-chapter-transform's per-chapter
Ruby-callback overhead (replaced by direct string ops).

---

## 11. Dependencies needed for this phase only

Cumulative dependencies after Phase 8:

```json
{
  "dependencies": {
    "fast-glob": "^3.3",
    "gray-matter": "^4.0",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0"
  }
}
```

New in Phase 8: **nothing**. The implementation uses Node stdlib
(`node:fs`, `node:path`, the Web Standards `URL` class) plus
already-imported helpers from `write.mjs` (`mkdirRec`,
`runLimited`, `writeFileMkdirp`, `safeWrite`, `WRITE_LIMIT`,
`isUnderProject`), `compress.mjs` (`compressHtml`), and the
Phase 3 markdown-it instance on `site.markdown` (for the part
subtitle / intro mini-renders).

The `lunr` dependency from PLAN.md's initial list (already unused
after Phase 7) remains unused.

---

## 12. File layout after Phase 8

```
<repo root>/
  builder/
    PLAN.md                    — architecture overview (Phase 8 status updated to "shipped" after landing)
    PLAN-1.md                  — Phase 1 spec (shipped)
    PLAN-2.md                  — Phase 2 spec (shipped)
    PLAN-3.md                  — Phase 3 spec (shipped)
    PLAN-4.md                  — Phase 4 spec (shipped)
    PLAN-5.md                  — Phase 5 spec (shipped)
    PLAN-6.md                  — Phase 6 spec (shipped)
    PLAN-7.md                  — Phase 7 spec (shipped)
    PLAN-8.md                  — this file (Phase 8 spec, shipped)
    FUTURE-WORK.md             — Phase 8 entries pending append: --no-pdf opt-out (§7.D6), --serving flag (§7.D9), build-date semantics (§7.D7), out-of-book href audit, image-extraction unification, streaming write
    package.json               — unchanged (no new deps)
    discover.mjs               — Phase 1
    nav.mjs                    — Phase 2 nav
    seo.mjs                    — Phase 2 SEO
    book.mjs                   — Phase 2 book loader + resolver; EXTENDED with Phase 8 assembleBook, bookChapterTransform, chapterAnchorFromUrl, rewriteBookHrefs, etc.
    build-info.mjs             — Phase 2 build-info
    render.mjs                 — Phase 3
    highlight.mjs              — Phase 3 highlight
    template.mjs               — Phase 4
    compress.mjs               — Phase 4 compress (re-used by Phase 8)
    write.mjs                  — Phase 5 (re-exports mkdirRec, runLimited, writeFileMkdirp, WRITE_LIMIT, safeWrite, isUnderProject)
    paths.mjs                  — Phase 6 paths helper
    redirects.mjs              — Phase 6
    sitemap.mjs                — Phase 6 sitemap
    search.mjs                 — Phase 6 search
    offline.mjs                — Phase 7 offline mirror
    pdf.mjs                    — NEW: writePdf + deriveBookOutputs + extractImagePaths
    accepted-divergences.mjs   — unchanged
    tbdocs.mjs                  — orchestrator extended (writePdf call after offline + summary line)
    verify-phase1.mjs          — Phase 1 harness (retired Phase 10)
    verify-phase2.mjs          — Phase 2 harness (retired Phase 10)
    verify-phase3.mjs          — Phase 3 harness (retired Phase 10)
    verify-phase4.mjs          — Phase 4 harness (retired Phase 10)
    verify-phase5.mjs          — Phase 5 harness (retired Phase 10)
    verify-phase6.mjs          — Phase 6 harness (retired Phase 10)
    verify-phase7.mjs          — Phase 7 harness (retired Phase 10)
    verify-phase8.mjs          — NEW: §10 acceptance harness (~17 checks) (retired Phase 10)
    _diff.mjs                  — extended: --book, --book=full, --pdf-image=<rel>, --pdf-css=<rel>, --help (and --phase3 body-fragment mode removed -- Phase 4 default subsumes it)
    _diff_all.mjs              — unchanged
    _triage.mjs                — extended: auditPdfBook (per-article diff w/ accepted-divergence skipping), auditPdfCss, auditPdfImages, auditPdfTotal, --help (and --phase3 mode removed in the same cleanup)
    _sitemap_diff.mjs          — unchanged
    _spot.mjs                  — unchanged
  docs/                        — unchanged
  WIP.md                       — extended: Phase 8 in the JS builder port section, new diff tool modes documented
  docs/.gitignore              — extended: _site-new-pdf/ added
```

### Extended `tbdocs.mjs` orchestrator

Phase 8 adds one substantive call to the orchestrator, plus a small
extension to the summary line:

```js
import { writePdf } from "./pdf.mjs";

// ... existing main() body up through offline ...
let offlineStats = null;
if (!dryRun) {
  offlineStats = await writeOffline(pages, staticFiles, site, destRoot, { auxStats });
}
t.lap("offline");

let pdfStats = null;
if (!dryRun) {
  pdfStats = await writePdf(pages, staticFiles, site, destRoot);
}
t.lap("pdf");

console.log(`Phase 1+2+3+4+5+6+7+8 done: ${pages.length} pages, ${staticFiles.length} static files`);
console.log(`  wrote: ${writeStats.pages.written} pages (${writeStats.pages.skipped} skipped), ` +
            `${writeStats.theme.copied} theme assets, ${writeStats.staticFiles.copied} static files ` +
            `-> ${destRoot}`);
if (auxStats) {
  console.log(`  aux:   ${auxStats.redirects.written} redirect stubs, ` +
              `${auxStats.sitemap.entries} sitemap entries, ` +
              `${auxStats.search.entries} search-index entries`);
}
if (offlineStats) {
  console.log(`  offline: ${offlineStats.html} HTML, ${offlineStats.css} CSS, ` +
              `${offlineStats.redirects} redirect stubs, ` +
              `${offlineStats.statics + offlineStats.assets} assets, ` +
              `${offlineStats.excluded} excluded ` +
              `(${offlineStats.unresolved} unresolved) -> ${destRoot}-offline`);
}
if (pdfStats) {
  const mb = (pdfStats.bookBytes / (1024 * 1024)).toFixed(1);
  const missingClause = pdfStats.missing > 0 ? ` (${pdfStats.missing} missing)` : "";
  console.log(`  pdf:     book.html (${mb} MB), ${pdfStats.css} CSS, ` +
              `${pdfStats.images} images${missingClause} -> ${destRoot}-pdf`);
}
console.log(t.summary());
```

`--dry-run` semantics: Phase 8 is guarded by `if (!dryRun)`
matching Phase 6/7's pattern. The dry-run path skips all writes;
`assembleBook` could be run anyway (no I/O) to capture
representative timing if profiling demands.

### 12.1. Diff and triage tool extensions

The Phase 7 pattern (extending `_diff.mjs` and `_triage.mjs` rather
than spinning a new `_pdf_diff.mjs`) carries through. As part of the
same pass the pre-existing `--phase3` body-fragment mode was
**removed from both tools** -- the default Phase 4 mode subsumes it
through the layout chain, and the body-fragment mode had become an
unused alternate path. `--help` was added to both.

**`_diff.mjs` new modes:**

| Mode | Compares |
|---|---|
| `--book` | Derived book.html (via `deriveBookOutputs`) vs `_site-pdf/book.html`. Normalises the build-info line on both sides before the byte compare. |
| `--book=full` | Same as `--book` but skip the normalisation; surface every byte difference (including build-info). |
| `--pdf-image=<rel>` | Reports whether `<rel>` appears in `extractImagePaths(bookHtml)` and whether it would be copied (resolves through `staticFiles[]`). Prints `MATCH`/`MISS`/`MISSING-IN-INVENTORY`. |
| `--pdf-css=<rel>` | Reads `<rel>` from `_site/assets/css/` and from `_site-pdf/<rel>`, byte-diffs. (Both files are Jekyll outputs from the same build; pdfify copies one to the other, so they must be byte-equal.) |

Each mode prints MATCH or DIFFER + first divergence offset + ~200
chars of context, matching the existing convention.

**`_triage.mjs` new audit functions:**

- `auditPdfBook` — runs `assembleBook` in-memory, normalises the
  build-info line, **parses both sides into `<article ...>` blocks
  and counts per-article match / accepted / unaccepted** using the
  same `ACCEPTED_DIVERGENCE_PATHS`-derived skip-list as the verify
  harness. Reports MATCH only when zero unaccepted divergences.
- `auditPdfCss` — byte-compares `assets/css/print.css` and
  `assets/css/rouge.css` between `_site/` and `_site-pdf/`.
- `auditPdfImages` — re-runs `extractImagePaths` against the
  assembled book.html, checks each path against both the on-disk
  `staticFiles[]` inventory AND the on-disk `_site-pdf/<rel>` file,
  reports MATCH / DIFFER with per-path counts.
- `auditPdfTotal` — one-line summary of the three above.

A clean build's `_triage.mjs` output ends with a four-line block:

```
PDF book.html: MATCH (752 articles, 6 accepted, build-info normalised)
PDF CSS: MATCH (2 files)
PDF images: MATCH (85 files, 0 missing)
PDF total: book.html + CSS + images match Jekyll's _site-pdf/
```

When a divergence surfaces, the `_triage.mjs` line surfaces the
class; `_diff.mjs --book` or `--pdf-image=<rel>` is the follow-up
to inspect.

The convention is documented in WIP.md's "Builder diff / triage /
verify tools" subsection.

---

## 13. What "done" Phase 8 actually enables

The PDF source tree at `<destRoot>-pdf/` is **functionally complete**
after Phase 8:

- `pagedjs-cli` can run against `<pdfRoot>/book.html` and produce
  a complete PDF without errors.
- Every `<img src=>` resolves to a file in the sparse tree (no
  broken-image placeholders in the rendered PDF).
- Every in-book cross-reference click in the PDF navigates within
  the PDF rather than to a dead live-site link.
- The PDF outline (rendered by pagedjs from the heading structure)
  matches the book.yml manifest's part / chapter / sub-chapter
  shape.
- `book.bat` runs unchanged (it reads from `<pdfRoot>/book.html`
  and writes `_pdf/book.pdf`; both paths are stable).

After Phase 8 lands, **the JS builder port is feature-complete vs
Jekyll**. The pipeline produces the same three output trees Jekyll
produces (`_site/`, `_site-offline/`, `_site-pdf/`) with byte-for-byte
parity (modulo documented divergences). The Jekyll source tree
remains as the reference; `bundle exec jekyll build` continues to
work and can be run to validate against tbdocs's output at any
time.

The cutover from Jekyll to tbdocs happens in a separate step:
flipping `tbdocs.mjs`'s default destination from `_site-new/` to
`_site/`, updating the GitHub Pages deploy workflow to invoke
`node builder/tbdocs.mjs` instead of `bundle exec jekyll build`,
and retiring the Jekyll plugin set + Gemfile + Ruby toolchain.
That's a post-Phase-8 follow-up, not part of Phase 8 itself.

### Open follow-ups

Six Phase 8 follow-ups have been moved to
[FUTURE-WORK.md](FUTURE-WORK.md) §B13-B18: `--no-pdf` opt-out,
`--serving` flag, build-date semantics (`commitDate` vs
process-time), cross-reference completeness audit,
image-extraction unification with `assembleBook`, and a streaming
write of `book.html`. Each entry lists its trigger condition; none
block any current work.

The post-port cutover from Jekyll to tbdocs (flip default
destination, retire the Gemfile and Jekyll plugin set, swap CI to
`node builder/tbdocs.mjs`) is tracked in
[FUTURE-WORK.md](FUTURE-WORK.md) §C1.
