---
title: tbdocs Builder
parent: Documentation Development
nav_order: 4
has_children: true
has_toc: false
permalink: /Documentation/Development/Builder
---

# tbdocs Builder
{: .no_toc }

Detailed technical documentation for the `tbdocs` static site generator at [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read this when modifying the build pipeline itself; content contributors who only need to build, preview, and ship documentation should not need any of it.

Module-level documentation lives next to the code:

- [`builder/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/README.md) --- quickstart and the per-module map.
- [`builder/PLAN.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN.md) --- architecture overview and the full eleven-phase pipeline.
- [`builder/PLAN-1.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-1.md) through [`PLAN-11.md`](https://github.com/twinbasic/documentation/blob/main/builder/PLAN-11.md) --- per-phase specs: inputs, outputs, edge cases, acceptance checks.
- [`builder/FUTURE-WORK.md`](https://github.com/twinbasic/documentation/blob/main/builder/FUTURE-WORK.md) --- open follow-ups, grouped by divergence investigations / deferred enhancements.

Sub-pages:

- [Pipeline Stages](Pipeline-Stages) --- complete interface reference: function signatures, per-stage reads/writes, and every exported symbol.
- [Book Configuration](Book-Configuration) --- `_data/book.yml` key reference for the PDF chapter manifest.
- [Extending the Builder](Extending) --- tutorial for adding a new pipeline stage or a markdown-it plugin.

* TOC goes here
{:toc}

## Why tbdocs exists

The site was originally built with **Jekyll** + the **just-the-docs** theme. The eleven-phase port to Node.js + a tiny dependency set produces byte-equivalent output to Jekyll modulo a documented allow-list. The win is end-to-end build time (~11s → ~3s) and a 25x faster GENERATE phase --- ten Ruby plugins totalling ~1,460 lines collapsed into four JS modules of ~650 lines. The Ruby toolchain (Gemfile, `_plugins/`, `_includes/`, `_layouts/`, `_sass/`) was retained in tree for one release cycle as reference after the cutover, then dropped --- the project no longer depends on Ruby in any form.

## Architecture

One entry point, ~17 production modules. The content model is fixed (markdown + YAML frontmatter), the output structure is fixed (three trees), the template is one layout with variations.

| File | Role |
|---|---|
| [`tbdocs.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) | Entry point. Parses CLI flags, dispatches to `runBuild` or `runServe`, prints per-phase timings. |
| [`serve.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) | Phase 12 dev server: HTTP static file server + recursive watcher + SSE live-reload. |
| [`discover.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) | Phase 1. Traverses `docs/`, parses frontmatter, classifies each file as a page or a static file. |
| [`nav.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) | Phase 2 nav substeps: nav-path, integrity check, nav tree, nav levels, breadcrumbs, children. |
| [`seo.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) | Phase 2 SEO precompute: per-page title / canonical / og: tags. |
| [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) | Phase 2 book chapter resolution + Phase 8 book.html assembly. |
| [`build-info.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) | Phase 2 git commit hash + commit date capture. |
| [`data.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) | Phase 2 generic `_data/*.yml` loader. |
| [`mermaid.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/mermaid.mjs) | Phase 11 (B1) preprocess: `.mmd` → `.svg` regeneration. |
| [`render.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) | Phase 3 markdown-it pipeline: GFM admonitions, kramdown-style attributes, deflist, footnotes, header IDs, TOC, relative-link rewriting. |
| [`highlight.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) | Phase 3 Shiki bootstrap plus the twinBASIC grammar. Emits the just-the-docs wrapper structure. |
| [`highlight-theme.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) | Phase 11 (B2) theme loader: reads `themes/*.theme`, derives the palette, emits `tb-highlight.css` and the scope-to-class lookup. |
| [`template.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) | Phase 4 layout. Replaces ~13 Liquid includes with direct JS string concatenation. |
| [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) | Phase 4 HTML whitespace compression. |
| [`write.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) | Phase 5 online tree writer. |
| [`paths.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) | Shared permalink-to-destination-path helper. |
| [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) | Phase 6 redirect-stub generator. |
| [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) | Phase 6 sitemap.xml + robots.txt. |
| [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) | Phase 6 Lunr index emitter (`search-data.json`). |
| [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) | Phase 7 offline tree: URL rewriting, JS patching for `file://` browsing. |
| [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) | Phase 8 sparse PDF source tree. |

`builder/` lives at the repo root (not under `docs/`) so it is not part of the Jekyll source tree the legacy renderer reads. It writes to `docs/_site/`, `docs/_site-offline/`, and `docs/_site-pdf/` --- the same destinations Jekyll used, so deployment tooling stays unchanged.

## Build phases

| Phase | Module(s) | Job | Time |
|---|---|---|---|
| 1 | `discover.mjs` | Read `.md` / `.html` with frontmatter; enumerate static files | ~120 ms |
| 2 | `nav.mjs` / `seo.mjs` / `book.mjs` / `build-info.mjs` / `data.mjs` | Compute nav tree, SEO, book chapters, git commit info, `_data/*.yml` | ~60 ms |
| 3 | `render.mjs` + `highlight.mjs` | Markdown → HTML body | ~1-2 s |
| 4 | `template.mjs` + `compress.mjs` | Wrap in layout, anchor headings, compress whitespace | ~200 ms |
| 5 | `write.mjs` | Write `_site/` | ~400 ms |
| 6 | `redirects.mjs` / `sitemap.mjs` / `search.mjs` | Redirect stubs, sitemap.xml, search-data.json, robots.txt | ~100 ms |
| 7 | `offline.mjs` | URL-rewritten copy to `_site-offline/` | ~1,000 ms |
| 8 | `pdf.mjs` + `book.mjs` | Sparse `_site-pdf/` tree (book.html + CSS + images) | ~150 ms |

Phases 9, 10, and 11 are historical: Phase 9 was a no-output QoL pass, Phase 10 retired Jekyll, Phase 11 introduces the output-changing parity updates. None adds a runtime step. Phase 12 adds the `--serve` dev-server mode (a separate lifecycle, not a build phase). The per-phase `PLAN-N.md` files retain the implementation history.

## Dependencies

Seven production dependencies plus one dev-only dependency:

```json
{
  "dependencies": {
    "acorn": "^8.0",
    "acorn-walk": "^8.0",
    "fast-glob": "^3.3",
    "gray-matter": "^4.0",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0"
  },
  "devDependencies": {
    "@mermaid-js/mermaid-cli": "^11.0"
  }
}
```

No template engine, no framework, no bundler. `acorn` + `acorn-walk` parse the upstream `just-the-docs.js` so the offline patcher can target the AST instead of regex-matching strings; `markdown-it-{attrs,deflist,footnote}` cover the kramdown extensions the legacy renderer supported; `shiki` does the syntax highlighting; `lunr` powers the search index. The mermaid CLI runs only when an `.mmd` is newer than its `.svg` sibling.

## Per-module deep dive

Each subsection covers the design rationale and implementation details for one module. For function signatures, data contracts, and the complete export table of each module, see [Pipeline Stages](Pipeline-Stages). Modules are presented in pipeline order.

### [tbdocs.mjs](https://github.com/twinbasic/documentation/blob/main/builder/tbdocs.mjs) --- entry point and orchestrator

`captureBuildInfo()` is launched as a promise immediately after discover so the two `git` shell-outs overlap with the CPU-bound nav computation that follows; the result is `await`ed only once Phase 2's other substeps are done. The shared markdown-it instance is built once via `initHighlighter` + `createMarkdownIt` and stored on `site.markdown` so Phase 2's SEO precompute and Phase 3's body renderer use the same configured pipeline --- titles run through the same dash, quote, and footnote-stripping rules as page body text.

The drift guard at the end (`if (pages.length < 836)`) sets `process.exitCode = 1` when discover loses pages --- a discovery-rule regression that silently drops content appears as a non-zero exit even though the build itself "succeeded".

### [serve.mjs](https://github.com/twinbasic/documentation/blob/main/builder/serve.mjs) --- Phase 12 dev server

The 300 ms debounce coalesces rapid file changes into a single rebuild. A lightweight inject middleware splices the SSE client script before `</body>` at serve time so the on-disk `_site/` stays byte-identical to a non-`--serve` build.

### [discover.mjs](https://github.com/twinbasic/documentation/blob/main/builder/discover.mjs) --- Phase 1

The IGNORE rules skip every underscored directory (catches `_site/`, `_site-offline/`, `_site-pdf/`, `_data/`, every `_Images/` at any depth), the prebuilt theme trees under `assets/css/` and `assets/js/` (sourced from `builder/assets/` instead), top-level toolchain files (`Gemfile`, `_config.yml`, `*.bat`), and the obvious cache dirs.

The final `pages.sort(byName)` mirrors Jekyll's `site.pages.sort_by!(&:name)` --- sort by basename, leaving fast-glob's input order to break ties (which `nav_order` then resolves deterministically in Phase 2).

### [nav.mjs](https://github.com/twinbasic/documentation/blob/main/builder/nav.mjs) --- Phase 2 navigation

The shared-state approach is what gives the JS port its 25x speedup over the Ruby plugins it replaces --- each Ruby plugin used to rebuild the same intermediate maps from scratch.

The integrity check is the only path that can abort the build mid-Phase-2. Two failure modes: **ambiguity** (multiple pages share the title declared in `parent:` and `grand_parent:` doesn't disambiguate) and **orphan** (no page has that title at all). Both report one error per offending page plus the `srcRel` path so the fix is obvious.

`sortPages` implements Jekyll's four-bucket sort: numeric `nav_order`, then string `nav_order`, then numeric `title`, then string `title`. `case_insensitive` is opt-in via `_config.yml`. The cycle defence in `buildNavNode` (the `chain.some` check) bounds tree depth at `NAV_TREE_MAX_DEPTH = 16` so a circular `parent:` chain caps out instead of recursing forever.

### [seo.mjs](https://github.com/twinbasic/documentation/blob/main/builder/seo.mjs) --- Phase 2 SEO precompute

The Liquid filter chain it replaces is `text | markdownify | strip_html | normalize_whitespace | escape_once` --- `renderTitle()` is the JS port (markdown-it render, then the `stripHtml` helper, then `\s+` collapse + trim, then escape only the five HTML-active characters via `HTML_ESCAPE_ONCE_REGEXP`).

834 of 836 page titles on the site are plain ASCII strings where the pipeline collapses to a one-character escape; the remaining two (`Concat.md` and `LineContinuation.md` --- titles containing `&` and `\`) exercise the wrap-and-strip path. The shared markdown-it instance is mandatory; Phase 2 fails fast if the orchestrator forgot to build it via `createMarkdownIt` first.

`stripHtml` and `absoluteUrl` are also exported for [`search.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) (search-index content sanitiser) and for [`sitemap.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) / [`redirects.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) (absolute URL composition) --- the same byte-for-byte URL helper used for canonical tags is shared with the Phase 6 auxiliary writers.

### [book.mjs](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) --- Phase 2 chapter resolution + Phase 8 assembly

The largest module by line count (~990 lines), split into two clearly-labelled halves by section comments.

**§A: Phase 2 chapter resolution.** `resolveBookChapters(bookData, pages)` iterates over every entry / part / chaptered-part-chapter in `_data/book.yml` and resolves its `page` / `pages` / `nav_page` / `nav_pages` / `no_descent` selector schema to a concrete `Array<Page>` stored as `_chapters` on the entry. `landing_page` / `foreword_page` are pre-resolved to their `Page` references in the same pass so Phase 8 has no pages-walk left to do. `sortByNavOrder` implements Jekyll's group-by-owning-index sort: each index page and its leaves stay together, group order by lead-item `[nav_order, title]`.

**§B--§F: Phase 8 book.html assembly.** `assembleBook(site, pages)` is the pure-compute walker --- emits the title page, then iterates over `bookData.front_matter` and `bookData.parts` in order, then runs `rewriteBookHrefs` (in-book `href="/X"` → `href="#ch-X"` for any page that contributes to the PDF), then `compressHtml`. The per-chapter body transform in `bookChapterTransform` runs five passes:

1. strip the `src="<baseurl>/"` prefix;
2. unwrap `<details>` / `<summary>` for print;
3. wrap inter-`<span>` whitespace in `<span class="w">` so pagedjs's page splitter doesn't collapse it at page breaks (12 patterns, longest first);
4. shift heading levels by `n in [0, 3]` capped at `h7-stub`;
5. prefix every heading id and intra-chapter `href="#"` with the chapter anchor.

Each part and chapter divider page contains the entry's title as an H1/H2 heading (or a silent `<p>` when `no_outline_entry:` is set), which becomes the PDF bookmark target. When `landing_is_target:` is set on an entry, the heading is instead injected directly into the landing-page article so the PDF bookmark navigates there rather than to the blank divider page; `rewriteBookHrefs`'s landing-H1 strip skips the injected heading via a `data-divider-heading` attribute. `outline_closed:` stamps `data-pdf-bookmark-closed` on the heading (or on the first content article for `no_outline_entry` entries), and `parseOutline` in `docs/lib/outline.mjs` reads the attribute to write a negative PDF `/Count` for that bookmark node. Full schema is documented in the `_data/book.yml` file header.

`augmentWithRedirectStubs` synthesises virtual `Page` records from each real page's `redirect_from` so the cross-ref rewriter still captures legacy URLs the way Jekyll's `jekyll-redirect-from` did (its stubs appeared in `site.pages` and got swept into the lookup table). `chapterAnchorFromUrl` is the URL → `ch-…` slug helper that generates both `id="..."` and the `#…` href targets.

### [build-info.mjs](https://github.com/twinbasic/documentation/blob/main/builder/build-info.mjs) --- Phase 2 git capture

Both git shell-outs fall back to `"unknown"` on failure so a tarball install or a sparse checkout never aborts the build.

### [data.mjs](https://github.com/twinbasic/documentation/blob/main/builder/data.mjs) --- Phase 2 data loader

Replaces the book-specific YAML load that originally lived in [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs); the latter retains `loadBookData` as a back-compat wrapper for harnesses that haven't migrated.

### [mermaid.mjs](https://github.com/twinbasic/documentation/blob/main/builder/mermaid.mjs) --- Phase 11 (B1) preprocessor

Two practical complications. First, mmdc's launcher (the `npx` shim) needs Windows-vs-POSIX special-casing: on Windows, `spawn` requires `shell: true` and the `.cmd` suffix. Second, mmdc relies on puppeteer-core, which would otherwise download a second Chrome --- `findCachedChrome()` locates the cached Chrome the top-level `puppeteer` install already placed under `~/.cache/puppeteer/` and passes its path via `PUPPETEER_EXECUTABLE_PATH`, saving the duplicate install. `explainMmdcFailure()` parses mmdc's stderr to expose the two common failure modes (mmdc itself not installed; Chrome runtime missing) with the exact `npm install` / `puppeteer browsers install` invocation that fixes them; any failure logs a warning and leaves the existing on-disk SVG in place, so the build never aborts on a missing diagram tool.

### [render.mjs](https://github.com/twinbasic/documentation/blob/main/builder/render.mjs) --- Phase 3 markdown pipeline

The largest single module (~1,580 lines) and the runtime hot path --- this is what dominates the ~1--2 s build time.

`createMarkdownIt(ctx)` is the configuration heart. The base options (`html: true`, `xhtmlOut: true`, `breaks: false`, `linkify: false`, `typographer: true`, `quotes: "“”‘’"`) match kramdown's defaults. Plugins layer on: `markdown-it-attrs` with the `{:` / `}` delimiters that kramdown uses, `markdown-it-deflist`, `markdown-it-footnote` with the kramdown render rules (`fnref:N` / `reversefootnote` / `<div class="footnotes">` shapes; see `configureFootnotes`), plus a stack of in-tree plugins:

- **`standaloneIalForwardPlugin`** --- kramdown attaches a standalone `{:...}` IAL to the next block, not the previous one; markdown-it-attrs gets that backwards.
- **`tightLooseListPlugin`** --- kramdown decides per-item whether a list item carries `<p>` wraps; markdown-it decides at list level. Post-pass hides `paragraph_open` / `paragraph_close` tokens to match.
- **`looseDeflistPlugin`** --- the same rule applied to `<dd>` bodies, with the narrower trigger (only the `dt` → `dd` blank-line gap counts).
- **`headerIdPlugin`** --- the `kramdownSlug` algorithm (lowercase, drop characters outside `\p{L}\p{N}\p{M}\p{Pc}\-`, replace spaces with `-`, deduplicate with `-1`, `-2`, ...).
- **`tocPlugin`** --- detects the `* TOC\n{:toc}` pattern (a bullet list whose token carries a `toc` attribute) and replaces it with the nested `<ul id="markdown-toc">`.
- **`relativeLinksPlugin`** --- the in-source `[X](Y.md)` → `[X](/permalink-of-Y)` rewrite via the `byPath` / `byUrl` / `byRedirect` link tables `buildLinkTables` produces.
- **`blockHtmlRecursionPlugin`** --- strips `markdown="1"` from html_blocks (markdown-it already recurses when blank lines separate body content), runs kramdown-style smart-quote conversion through `markdown="span"` bodies, normalises raw block HTML (bareword attrs expanded to `attr=""`, whitespace-only bodies collapsed), and wraps standalone inline elements like `<br>` / `<img>` in `<p>`.
- **`kramdownDashesPlugin`** --- `--` → en-dash, `---` → em-dash, `<<` / `>>` → guillemets, plus a possessive-apostrophe sweep and the cross-emphasis smart-quote rules kramdown applies that markdown-it's typographer can't reach because it's blind to token siblings.
- **`kramdownEllipsisPlugin`** --- recovers the `....` / `.....` patterns markdown-it would collapse to a single `…`.
- **`flattenAdjacentStrongPlugin`** --- forces left-to-right `**` pairing instead of CommonMark's preferred-nesting algorithm.

The render-rule overrides on `fence` / `code_block` / `code_inline` / `table_open` / `th_open` / `ordered_list_open` handle the smaller divergences (Rouge-shaped wrapper, table-wrap div, no `start` on `<ol>`, `style: text-align:` spacing). Five pre-render text passes (`stripLiquidRawTags`, `rewriteTripleAsteriskEmphasis`, `encodeSpacesInMediaUrls`, `rewriteListItemSetextHeadings`, `absorbTrailingHtmlComments`, `rewriteAdmonitions`) rewrite the source string before markdown-it sees it; two post-render passes (`normaliseVoidTags`, `padEmptyCells`) fix kramdown's `<br />`-style XHTML void output and the `<td> </td>` empty-cell quirk. The GFM admonition rewrite (`rewriteAdmonitions`) emits the same five SVG octicons (info, light-bulb, report, alert, stop) that jekyll-gfm-admonitions emits, with `class="markdown-alert markdown-alert-<type>" markdown="1"` so the inner body recurses through the markdown parser.

### [highlight.mjs](https://github.com/twinbasic/documentation/blob/main/builder/highlight.mjs) --- Phase 3 syntax highlighter

The wrapper structure --- `<div class="language-X highlighter-rouge"><div class="highlight"><pre class="highlight"><code>...</code></pre></div></div>` --- is what the just-the-docs chrome's CSS expects, so the wrapper class output and the palette CSS share a single source of truth. `TB_ALIASES` accepts `tb`, `twinbasic`, `vb`, `vba` (all routed to the bundled tB grammar); other fenced languages route to Shiki's bundled list (`js`, `json`, `ruby`, `html`, `yaml`, and a few more). An empty info string falls through to `language-plaintext`.

`renderThemedSpans` is the per-token-run coalescer: same-class adjacent tokens merge into one `<span>` so a multi-line block comment is a single coloured block, the line-continuation token (`_<whitespace>\n`) absorbs the next line's leading whitespace into the same span (mirroring the tB lexer's continuation handling), and trailing newlines on comment runs defer so a continuing comment on the next line merges in. Phase 11 (B5) added `COPY_BUTTON_HTML` to the wrapper output --- the runtime DOM-injection loop the upstream just-the-docs.js used to do is gone, the click handler binds to the pre-rendered button via `closest()`.

### [highlight-theme.mjs](https://github.com/twinbasic/documentation/blob/main/builder/highlight-theme.mjs) --- Phase 11 (B2) theme loader

Replaces the two-step `scripts/extract_theme_colors.py` → SCSS-partial → Jekyll-Sass-compile indirection that lived in the Ruby era; the `.theme` source now feeds the renderer directly.

`SCOPE_TO_SYMBOL` is the TextMate-scope → tB-Symbol mapping (e.g. `keyword.declaration` → `Keyword`, `comment.line` → `Comment`, `constant.numeric` → `LiteralNumeric`). More-specific scopes precede their parents so the renderer's inner-out traversal of each token's scope chain stops at the right level. Symbols with no entry inherit the default `.highlight` text colour --- intentional, so plain punctuation and generic identifiers don't get a wrapping `<span>`.

`loadHighlightTheme()` groups Symbols by their (light props, dark props) tuple and assigns one CSS class per unique tuple --- so any two Symbols that share both palettes' properties collapse to a single class. Class IDs (`c1`, `c2`, ...) are tuple-derived and sort-stable; rebuilding with no theme changes produces byte-identical output. The CSS emits a light palette rule per class at root, then the same set under `html.dark-mode .highlight .cN` so the chrome's theme toggle flips the syntax highlight in lockstep with the rest of the page.

### [template.mjs](https://github.com/twinbasic/documentation/blob/main/builder/template.mjs) --- Phase 4 layout

The layout is direct JS template-literal concatenation --- no Liquid, no template engine. Sub-functions match the upstream just-the-docs include set one-to-one: `renderHead` (charset / dark-mode early script / CSS / activation-style / lunr / just-the-docs.js / viewport / SEO / favicon, in the upstream's exact order), `renderSidebar` + `renderNavTree` (recursive nav walker with cycle defence by title), `renderHeader` + `renderSearchInput` + `renderAuxNav`, `renderBreadcrumbs`, `injectAnchorHeadings` (regex pass adding `<a class="anchor-heading">` next to every heading with an id), `renderChildrenNav` (auto-generated child page list for index pages), `renderFooter` + `renderFooterCustom` + `renderEditAndOfflineBlock`.

`navActivationCss(page)` is the per-page `<style id="jtd-nav-activation">` block --- positional `:nth-child(N)` selectors derived from `page.navLevels` that bold the active leaf, rotate its expander chevron, expand the active sub-tree's `<ul>`, and turn off the background-image inheritance on every other link. The CSS structure mirrors the upstream `activation.scss.liquid` partial verbatim so the rendered style block byte-matches what Jekyll would have produced. `formatDate` implements the strftime tokens the project's `last_edit_time_format` actually uses (`%b %e %Y at %I:%M %p`) plus the common companions, throwing on unknown tokens so a future format change is detected immediately.

### [compress.mjs](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) --- Phase 4 whitespace compress

`collapseWhitespace` uses an explicit `[ \t\n\r\f\v]+` character class rather than JS's `\s` shorthand --- the latter would also match U+00A0 (no-break space) and a dozen other Unicode space characters, which would destroy the `&nbsp;`-based indentation kramdown emits in blockquote, footnote-backref, and `<kbd>` markup. The trailing newline is preserved when the input had one.

### [write.mjs](https://github.com/twinbasic/documentation/blob/main/builder/write.mjs) --- Phase 5 online writer

The `mkdirRec` cache plus inflight-collapse skips ~76% of the otherwise-duplicated `fs.mkdir` calls on the current ~1,080-file inventory.

Two safety rails. `isUnderProject(destRoot)` (also exported and reused by [`offline.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) and [`pdf.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs)) rejects any destination root that isn't a descendant of the project tree, so `--dest ~` can never `rm -rf` an entire home directory by accident. `assertNoDestinationCollisions` throws when a static file's `destRel` would overwrite a page's `destPath` --- a content-tree typo that drops a `.html` next to a real page would otherwise silently win. Several utilities are exported for the Phase 6/7/8 substep writers to share: `mkdirRec`, `runLimited` (concurrency-limited per-item runner, `LIMIT = 64`), `safeWrite` (error-wrapping write helper that includes the `dest` path in the message), `writeFileMkdirp`.

### [paths.mjs](https://github.com/twinbasic/documentation/blob/main/builder/paths.mjs) --- shared permalink-to-destination helper

Twenty-three lines. Shared by Phase 1 and Phase 6; see [Pipeline Stages](Pipeline-Stages#pathsmjs) for the four rules.

### [redirects.mjs](https://github.com/twinbasic/documentation/blob/main/builder/redirects.mjs) --- Phase 6 redirect stubs

`deriveRedirectStubs` is the pure-compute derivation (exported so the offline pass can read the stub list without re-deriving). It guards against two collision shapes: a `redirect_from` URL that would overwrite a real page (clear error with both source paths), and two different pages claiming the same redirect destination. Either fails the build immediately rather than letting the second writer silently clobber the first.

### [sitemap.mjs](https://github.com/twinbasic/documentation/blob/main/builder/sitemap.mjs) --- Phase 6 sitemap + robots.txt

Absolute URLs are sorted alphabetically so re-runs produce byte-identical output. A source-tree `permalink: /robots.txt` would shadow the generated one --- defensive check, no current page sets that.

### [search.mjs](https://github.com/twinbasic/documentation/blob/main/builder/search.mjs) --- Phase 6 Lunr index emitter

`sanitiseContent` is the kramdown-parity content normaliser --- 14 string replaces insert ` . ` / ` | ` separators between block boundaries (so the search snippet shows logical breaks instead of glued-together prose), then `stripHtml`, then a "Table of contents" removal, then a collapse-runs-of-ASCII-whitespace pass (narrow set, mirroring Ruby's `String#strip` semantics so `&nbsp;`-based indentation isn't destroyed --- the same issue the [`compress.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/compress.mjs) compress pass guards against). The order is essential for byte parity with the just-the-docs Liquid template; rearranging the steps would change the output.

### [offline.mjs](https://github.com/twinbasic/documentation/blob/main/builder/offline.mjs) --- Phase 7 offline mirror

The second-largest module (~950 lines). Internal sections are labelled `§A` through `§I` in the source.

`computeRelative` is the URL resolver core: absolute URL → page-relative path that resolves on disk. It runs `resolveRaw` (peels the baseurl, picks among `<path>` / `<path>.html` / `<path>/index.html` candidates against the `sitePaths` Set), then ascends `../`s to the longest common prefix with the page's own segments, then re-appends the descend plus the encoded tail. `computeRelUrl` handles already-page-relative inputs similarly. The result caches (`rawResolution`, `seg`, per-fileDir `result`) collapse the per-build cost to near-linear in unique-URL count.

The per-page sidebar nav block is byte-identical across every page (it doesn't depend on the per-page `page` object; the active highlight lives in the head-style block, not as inline `class=` attributes), so `writeOfflinePages` runs a pre-pass that renders the first page in each destination dir, slices out the nav, and caches the `{input, output}` pair. Subsequent pages in the same destination dir substitute the input slice with a placeholder, run the rewriter over the ~80 KB-smaller string, then splice the cached output back in. ~200 ms saved on each build (Phase 9 §5.3, B7). The fallback to full-rewrite-with-warning when the cache misses keeps it as pure optimisation, never a correctness dependency.

The just-the-docs.js patcher is AST-based as of Phase 11 (B11): `deriveOfflineJtdJs` parses the upstream source with `acorn`, scans for `FunctionDeclaration` nodes named `navLink` and `initSearch`, and slices in the two replacement implementations (`JTD_NAVLINK_REPLACEMENT`, `JTD_INITSEARCH_FN_REPLACEMENT`). The non-patched regions stay byte-identical to the upstream source, and cosmetic upstream edits (variable renames, whitespace inside the patched bodies) survive --- the prior anchored-regex patcher would have broken on either. A parse error at build time is a clear signal that re-extraction produced something acorn can't read; no defensive fallback ships because just-the-docs.js is only re-extracted on deliberate gem-bump operations.

`deriveOfflineSearchDataJs` wraps `search-data.json` as `window.SEARCH_DATA = {...}` (a `<script src=>` can't fetch JSON under `file://`) and minifies via `JSON.parse + JSON.stringify` without indentation --- Phase 11 (B10) shaved ~1.1 MB off the offline asset footprint.

### [pdf.mjs](https://github.com/twinbasic/documentation/blob/main/builder/pdf.mjs) --- Phase 8 PDF source tree

The image-path collector folds into `assembleBook`'s per-chapter emit (Phase 9 §5.9); a post-pass regex scan of the assembled HTML is retained as the exported `extractImagePaths` helper for the diff tools but no longer runs in the writer. `resolveBookPage` enforces exactly one `layout: book-combined` page in the source tree (throws on zero or multiple --- both are unambiguous misconfigurations).

`reportMissingImages` implements pdfify.rb's strict mode: per-path error log, then throw if `!tolerateMissingImages`. Every Phase 8 invocation runs in strict mode by default --- a missing image in the assembled book is a build-fail rather than a warning, since the alternative is a PDF with broken-image placeholders nobody notices until publication. The `--tolerate-missing-images` flag (renamed from `--serving` in Phase 12) downgrades the throw to a warning for iterative work.

## Static asset extraction

The bundled theme assets live under [`builder/assets/`](https://github.com/twinbasic/documentation/blob/main/builder/assets) and are copied verbatim into `<destRoot>/assets/` on every build. The seven files there are the just-the-docs chrome's runtime dependencies; they were extracted once from a Jekyll build of the upstream theme and committed at the version pinned at cutover time.

Re-extraction is a one-off event triggered by a deliberate theme bump or a hand-written CSS / JS change. The procedure requires temporarily restoring the legacy Jekyll source set (`docs/_plugins/`, `docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`, `docs/Gemfile.lock`) from git history (the cutover commit and its prior state), running `bundle install && bundle exec jekyll build`, copying the produced files out of `_site/assets/` into `builder/assets/`, and then reverting the restore --- see [`builder/assets/README.md`](https://github.com/twinbasic/documentation/blob/main/builder/assets/README.md) for the full procedure, the CSS class contract the generator targets, and the upstream sources each file came from.

## Verification

Site integrity after a build is asserted by `docs/check.bat`, which runs `scripts/check_links.mjs` against `_site/` and `_site-offline/`. The CI workflow runs the same passes plus the `crawl_check.mjs` post-deploy check.

The build itself includes a small guard at the end of `tbdocs.mjs`:

```js
if (pages.length < 836) {
  console.error(`WARN: page count ${pages.length} below baseline 836`);
  process.exitCode = 1;
}
```

so an accidental discovery-rule regression that silently drops pages appears as a non-zero exit code.

## What is NOT in builder/

Some build-adjacent code lives at the repo root rather than under `builder/`:

- **PDF rendering** --- `docs/render-book.mjs` plus its `docs/lib/*.mjs` helpers and the `paged.browser.js` bundle. `tbdocs` produces `_site-pdf/book.html`; the actual PDF render runs separately via `book.bat`. The driver is intentionally not part of the site generator: it pulls in `puppeteer` and `pdf-lib`, both heavy. See [PDF Generation](PDF-Generation) for the full internals.
- **Link checking** --- `scripts/check_links.mjs` reads from disk after the build; not part of the generator.
- **External link crawling** --- `scripts/crawl_check.mjs` reads from HTTP; not part of the generator.
- **Mermaid source files** --- `docs/assets/images/mmd/*.mmd` are source, `*.svg` are build artifacts that `tbdocs` regenerates as needed.
