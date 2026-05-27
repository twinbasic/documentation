# twinBASIC Documentation — Jekyll-Era Working Notes

Historic engineering notes from the era when the documentation site was built with Jekyll + just-the-docs. Kept as archeology: the actual Ruby source set (`docs/_plugins/`, `docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`, `docs/Gemfile.lock`) and the Jekyll profilers (`profile-rbspy.bat`, `profile-rubyprof.bat`, `_profile/`) were deleted from the tree in the Ruby-removal follow-up to the Phase 10 cutover. The contents survive in git history; search for `Phase 10` to find the cutover, and for the Ruby-removal follow-up that landed alongside the [Documentation Development](docs/Documentation/) page split.

The build pipeline itself is now `tbdocs`, the Node.js static site generator under [builder/](builder/). The day-to-day Working Notes for the live site are in [WIP.md](WIP.md); this file is the engineering record of *how the Jekyll site worked*, *why it was replaced*, and *what was learned in the optimisation passes that preceded the port*.

## Historical note

The site was originally built with Jekyll + just-the-docs. The Jekyll source set (`docs/_plugins/`, `docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `docs/Gemfile`) was retired in the Phase 10 cutover commit; the directories were kept for one release cycle as reference and then deleted in a follow-up cleanup commit. Search the git log for `Phase 10` to find both commits.

## Migration notes

- `_site-new/` is no longer used. Run `rm -rf docs/_site-new/` on first sync after the cutover.
- The eight `verify-phase{N}.mjs` harnesses were retired in the same cutover commit. Regression detection now relies on `scripts/check_links.mjs` (expanded into a site-integrity checker; see [docs/check.bat](docs/check.bat)).
- The diff and verify harnesses (`_triage.mjs`, `_diff.mjs`, `_diff_all.mjs`, `_audit_accepted.mjs`, `_sitemap_diff.mjs`, `_spot.mjs`, `verify-phase{1..8}.mjs`, `accepted-divergences.mjs`) were retired in the Phase 10 cutover commit. They asserted byte-equivalence with Jekyll, which is no longer the acceptance bar.

## Phase 11 — parity update

Phase 11 (see [builder/PLAN-11.md](builder/PLAN-11.md)) landed the output-changing follow-ups that the Phase 3-9 byte-vs-Jekyll discipline had deferred. Five independent PRs, all shipped:

- **B2 — Shiki theme generated from `.theme` source.** Shipped. `scripts/extract_theme_colors.py` and `builder/assets/css/rouge.css` are gone; `builder/highlight-theme.mjs` parses the vendored `builder/themes/Light.theme` + `Dark.theme` files and emits `_site/assets/css/tb-highlight.css` at build time. Per-span class names switched from Rouge tokens (`k`, `s`, `mi`) to a palette scheme (`c1`, `c2`, …). `builder/highlight.mjs` shrank from ~470 lines to ~190 — the per-language Rouge-quirk overrides folded into the scope-to-Symbol table.
- **B1 — Mermaid `.mmd` → `.svg` automation.** Shipped. `builder/mermaid.mjs` runs before Phase 1's discover, walks `docs/assets/images/mmd/*.mmd`, and invokes `mmdc` (via `npx --no-install` rooted at `builder/`) for any source whose `.svg` sibling is missing or older. The `.mmd` is now the canonical input; the SVG is a build artifact. Adds `@mermaid-js/mermaid-cli` as a devDependency in `builder/package.json`. The PDF render step already pulls in `puppeteer` at the repo root (and CI runs `npx puppeteer browsers install chrome --install-deps`), so `mermaid.mjs` reuses that cached Chrome via `PUPPETEER_EXECUTABLE_PATH` — no second Chrome download. A missing `mmdc` (e.g. someone never ran `npm install` in `builder/`) or a missing Chrome cache downgrades to a graceful warning; the existing on-disk SVG is retained and the build continues.
- **B5 — Server-side copy-code button.** Shipped. `builder/highlight.mjs` emits the `<button class="copy-code">` HTML inside each `<div class="highlighter-rouge">` wrapper at build time; the chrome's existing CSS positions it absolutely over the top-right corner. `builder/assets/js/just-the-docs.js` retired the runtime DOM-injection loop (`processCodeBlocks`) — the click handler now binds to the pre-rendered buttons via `closest('div.highlighter-rouge')`. `print.css` hides the button for the PDF render path. Gated by `enable_copy_code_button` in `_config.yml` (default true).
- **B10 — `search-data.js` minification.** Shipped. `builder/offline.mjs`'s `deriveOfflineSearchDataJs` now re-stringifies the parsed JSON without indentation before wrapping it as `window.SEARCH_DATA = ...;`. On the current tree this shaves ~100 KB off the offline asset (2.80 MB → 2.70 MB) -- modest, because most of the size is content payload, not whitespace. The online `_site/assets/js/search-data.json` keeps its pretty-printed shape (Phase 6 unchanged).
- **B11 — AST-based `just-the-docs.js` patching.** Shipped. `builder/offline.mjs`'s `deriveOfflineJtdJs` parses the upstream `just-the-docs.js` with `acorn`, walks the AST for `FunctionDeclaration` nodes named `navLink` / `initSearch`, and string-slices the canonical replacements into place at the node ranges. Non-patched regions stay byte-identical to upstream (verified: the AST output matches the prior regex-patched bytes 1:1). `just-the-docs.js` is a vendored asset re-extracted only on deliberate gem-bump operations, so a parse error at build time is a clear signal to fix the asset (or the patcher) at that moment — no regex fallback shipped. Adds `acorn` + `acorn-walk` to `builder/package.json`.

## Jekyll build pipeline (the old way)

The Jekyll build was driven from `docs/`:

- `bundle exec jekyll build` (or `build.bat`) — built three trees in a single Jekyll run: the online copy at `_site/`, a `file://`-browsable copy at `_site-offline/`, and the sparse pagedjs source at `_site-pdf/`. The offline pass (`_plugins/offlinify.rb`, activated by `also_build_offline: true` in `_config.yml`) added ~3-5s and the PDF pass (`_plugins/pdfify.rb`, activated by `also_build_pdf: true`) added <1s on top of the normal ~13s build. The PDF plugin captured `book.html`'s rendered output (the concatenated chapter document built via `_layouts/book-combined.html`) at `:pages, :post_render`, dropped the page from `site.pages` at `:site, :post_render` so `_site/book.html` was never written, and at `:site, :post_write` wrote the captured bytes into `_site-pdf/book.html` along with `assets/css/print.css`, `assets/css/rouge.css`, and every relative `<img src=>` target -- just what pagedjs needed to render the book PDF. The companion `offline_exclude: [..., book.html]` entry in `_config.yml` kept `offlinify.rb` from copying book.html into `_site-offline/`: offlinify's per-page hook fired before pdfify's `:site, :post_render` (Jekyll fires every per-page hook before any site-level post-render hook), so during offlinify's pass `book.html` was still in `site.pages` and the exclude was what made it skip writing the offline copy. When `also_build_pdf: false` the exclude did the same job from a different angle -- pdfify never ran, `book.html` rendered normally to `_site/`, and the exclude still kept it out of `_site-offline/`. After Jekyll's WRITE phase, the offline plugin walked `_site/`, copied binary assets verbatim into `_site-offline/`, and for each HTML and CSS file rewrote every root-absolute `href` / `src` / `url()` to a page-relative path with the resolved file extension (`/FAQ` → `../../FAQ.html`, `/Tutorials/CEF/` → `../../Tutorials/CEF/index.html`). It also patched the offline copy of `assets/js/just-the-docs.js` in two places — `navLink()` to match the active nav entry by resolved DOM `link.href` rather than `document.location.pathname` (the upstream pathname-vs-attribute compare returned no match under `file://`, leaving the sidebar with no `.active` class so the nav appeared collapsed on every navigation), and `initSearch()` to read the lunr index from `window.SEARCH_DATA` rather than fetching `search-data.json` over `XMLHttpRequest` (XHR to `file://` resources is blocked by browsers; classic `<script src=>` is not). To support that, the plugin (a) generated `_site-offline/assets/js/search-data.js` once per build by wrapping the rendered `search-data.json` in `window.SEARCH_DATA = {...};`, and (b) injected two `<script>` tags per page right before `just-the-docs.js`: one that set `window.OFFLINE_SITE_ROOT` to the per-page relative prefix to the offline site root, and one that loaded `search-data.js`. The patched `initSearch()` rewrote every `doc.url` from a root-absolute permalink (`/tB/Core/Const`) to a page-relative path (`<OFFLINE_SITE_ROOT>tB/Core/Const.html`) so search-result clicks landed on the actual file regardless of which page the user was on.
- `bundle exec jekyll serve` (or `serve.bat`) — local server at `localhost:4000`. Note that `_site-offline/` was also produced on the initial build, but live-reload only updated `_site/`; manual rebuild needed for offline updates.
- `check.bat` — link check (offline `scripts/check_links.mjs` against `_site/` and `_site-offline/`; the offline pass also runs `--forbid 'https://docs.twinbasic.com'` to catch surviving live-site links).
- `book.bat` — renders the PDF from `_site-pdf/book.html` via `pagedjs-cli` into `_pdf/book.pdf`. Run `build.bat` first to populate `_site-pdf/`.

## HTML-compress plugin

The HTML whitespace compression that wrapped every page's render chain was handled by `_plugins/html-compress.rb` rather than the just-the-docs theme's `vendor/compress.html` Liquid layout — see [_plugins/html-compress.md](docs/_plugins/html-compress.md) (in git history) for the full writeup. The Liquid layout's per-page cost in the profile was ~2.4s of Liquid filter dispatch (a `split: " " | join: " "` over the outside-of-`<pre>` content, lowering to a per-page Array allocation of every whitespace-delimited token across 837 pages — millions of small `String` objects). The layout was short-circuited via `compress_html.ignore.envs: all` in `_config.yml`; it then output a bare `{{ content }}` and the plugin took over at `:pages, :post_render` / `:documents, :post_render` with `priority :normal`, doing the same pre-block-protected whitespace collapse via `content.split(PRE_BLOCK_RE).each { |s| s.split(" ").join(" ") }` in C-implemented Ruby. The `:normal` priority was the *middle* tier of a three-level convention across the site's `:post_render` hooks: mutators (`book-href-rewrite`) ran at `:high`, this cleanup pass at `:normal`, readers (`pdfify`, `offlinify`) at `:low`. The invariant "compress runs after every mutator and before every reader" therefore held by construction; no downstream plugin had to be whitespace-aware. Pages whose layout chain didn't reach `vendor/compress` were gated out via a `:site, :pre_render` precompute that walked `site.layouts[name].data["layout"]` for every layout key and marked the entire compress-reaching chain (default → table_wrappers → vendor/compress) -- jekyll-redirect-from stubs, the SCSS-derived CSS pages, and `assets/js/zzzz-search-data.json` all stayed un-gated and passed through verbatim. `book.html` (which used the minimal `book-combined` layout that had no parent) was *also* outside that chain but was explicitly added to the compress-eligible set at the end of the precompute, so the same whitespace collapse ran on it -- saved paged.js's render-time `WhiteSpaceFilter` ~37k DOM mutations (~28k `textContent` overwrites + ~9k `removeChild` calls) at the cost of ~480 ms once per Jekyll build. Output was byte-identical to the layout-based version: a recursive `diff -rq` of `_site/` against a vendor/compress.html baseline reported zero differences across all ~840 HTML pages, 290 redirect stubs, every CSS / JSON / SVG / image asset. The plugin's correctness depended on two non-obvious details that broke an earlier cut -- the layout-chain walk had to compare against the layout *key* (`"vendor/compress"`) rather than `layout.name` (which carries the `.html` extension), and the per-segment `split(" ").join(" ")` stripped trailing whitespace that the Liquid layout's *template* re-adds via its trailing-newline source character, so the plugin captured `content.end_with?("\n")` before the split and re-appended a `\n` after the join. Both regressions surfaced as nonzero `diff -rq` counts during development.

## Profiling the build

Two profilers were wired in for diagnosing slow Jekyll builds. Both ran a full Jekyll build with all three trees (`_site/`, `_site-offline/`, `_site-pdf/`) and wrote results into `_profile/out/` (gitignored).

- `profile-rbspy.bat` — sampling profiler (99 Hz, ~1.7x slowdown). Wrote `_profile/out/jekyll-build.speedscope.json`. Drop into [speedscope.app](https://www.speedscope.app/) for timeline / sandwich / left-heavy views — the closest thing to vernier's Firefox-profiler UI you can get on Windows. Required `_profile/rbspy.exe` (gitignored, ~6 MB); on a fresh checkout grab it from rbspy's [GitHub releases](https://github.com/rbspy/rbspy/releases) — the `rbspy-x86_64-pc-windows-msvc.exe.zip` asset, renamed to `rbspy.exe` and placed in `_profile/`.
- `profile-rubyprof.bat` — instrumentation profiler (TracePoint-based, ~2.2x slowdown). Wrote `_profile/out/callgrind.out.*` (open in KCachegrind / QCachegrind), plus `jekyll-build.flat.txt` and `jekyll-build.graph.txt` for quick text-based inspection. Activated by `gem "ruby-prof", force_ruby_platform: true` in the Gemfile — the platform-precompiled gem ships no `.so` for Ruby 3.4+ on `x64-mingw-ucrt`, so the extension was built from source at `bundle install` time.

The shared runner `_profile/build.rb` invoked `Jekyll::Commands::Build.process({})` directly. rbspy's `CreateProcess`-based launcher on Windows couldn't resolve the `bundle.cmd` / `bundle.bat` shims, so both wrappers spawned `ruby.exe` against this script rather than going through `bundle exec`. `_profile/profile.rb` wrapped the same `build.rb` in a `RubyProf::Profile`. Neither wrapper auto-activated inside normal `build.bat` / `serve.bat` runs.

The first useful finding from a baseline profile: `Offlinify#rewrite_html!` was the single largest non-library hotspot (~6% self-time, ~3s of a ~30s instrumented build), with `Offlinify#compute_relative` a distant second; everything else was Liquid rendering (`BlockBody#render`, `Context#evaluate`, `Variable#render`) inside the Jekyll/Liquid stack itself.

### Current Liquid filter picture

After the html-compress plugin landed (`vendor/compress.html` short-circuited, the Ruby plugin doing the whitespace pass), the top per-filter costs on a ~39 s ruby-prof run broke down as follows. Numbers from `Liquid::Strainer#invoke`'s children in `_profile/out/jekyll-build.graph.txt`:

| Filter | Total time | Calls | µs/call |
|---|---|---|---|
| `markdownify` | 4.605 s | 1,802 | 2,555 |
| `where_exp` | 1.484 s | **37** | **40,108** |
| `replace` | 0.606 s | 87,991 | 6.9 |
| `relative_url` | 0.503 s | 11,417 | 44 |
| `absolute_url` | 0.396 s | 1,675 | 236 |
| `normalize_whitespace` | 0.329 s | 4,261 | 77 |
| `strip_html` | 0.248 s | 8,261 | 30 |

Two structurally different outliers in that list:

- **`markdownify` (4.6 s / 11.7 % of build)** -- 1,802 explicit `| markdownify` filter invocations across templates. Only three call sites: `_includes/head_seo.html` (`page.title | markdownify` and `site.title | markdownify`, ~1,674 calls), `_includes/book-chapter-body.html` (`include.chapter.content | markdownify`, ~100 of the 745 chapter passes -- most chapters' content starts with `<` and skips), and `book.html`'s part subtitle / intro (~24). Jekyll's markdown cache deduplicates these (3,146 `Converters::Markdown#convert` calls back only 1,975 actual kramdown parses), so the 4.6 s is mostly **filter dispatch + cache-lookup overhead, not kramdown work**. Of the 836 page titles, only 2 (`*, *=` and `\, \=`) contained markdown-active characters; the other 834 paths through the `markdownify | strip_html | normalize_whitespace | escape_once` pipeline reduced to `escape_once(title)`.
- **`where_exp` (1.5 s / 37 calls × 40 ms)** -- ~40 ms per call was the per-element Liquid expression interpreter cost on `site.pages` (~837 entries). All 37 calls came from `_includes/book-collect-matches.html` (the `site.pages | where_exp: "p", "p.url contains prefix"` and `"p.nav_path contains np"` sweeps) and one `book.html` site (`collected | where_exp: "p", "p.url != part_landing_url"` to strip a landing page from the prefix sweep).

`replace` was the third bucket worth tracking: 87,991 calls but only 0.6 s -- ~7 µs per call. Of those, ~36 k came from `_includes/book-chapter-body.html`'s heading-shift chains (12 replaces × 3 cascading shift passes) and anchor-id prefix replaces (13 replaces). The per-call cost was tiny but the volume added up.

### Investigation plan

Ranked by estimated wall-clock saving on the Windows development machine at the time:

1. **`book-collect-matches.html` → Ruby precompute. [LANDED]** Moved every `where_exp` / `where` / `concat` / `sort_by_nav_order` chain driven by `_data/book.yml` into a `:site, :pre_render` plugin (`_plugins/book-resolve-chapters.rb`) that stashed the resolved chapter array on each front-matter entry / flat part / chaptered-part chapter. `book.html` read `entry._chapters` directly; `_includes/book-collect-matches.html` deleted. The `Jekyll::Filters#where_exp` row disappeared from ruby-prof's filter table (was 1.484 s / 37 calls), and the overall `Liquid::Strainer#invoke` total dropped from 8.902 s to 6.687 s in instrumented runs.

   Wall-clock effect on the development machine (5 `--profile` runs each, before/after; one outlier in the before set inflated its stddev):

   | Phase / template | Before (mean +- sd) | After (mean +- sd) | Delta |
   |---|---|---|---|
   | RENDER total | 11.93 +- 2.11 s | 9.53 +- 0.12 s | -2.40 s |
   | `book.html` | 1.68 +- 1.09 s | 0.58 +- 0.03 s | -1.10 s |
   | `_includes/book-collect-matches.html` | 0.71 +- 0.46 s | 0.00 s (removed) | -0.71 s |
   | `_includes/book-chapter-body.html` | 0.81 +- 0.51 s | 0.51 +- 0.03 s | -0.30 s |

   The before-run stddevs were large because one of the 5 baseline runs was a clear 5 s outlier; outlier-excluded, the RENDER delta is closer to -1.4 s. The after-run stddev was tight across the same 5-run sample, so the speedup itself was robust at >1 s. Output was byte-identical to baseline (verified by `diff -rq` on all three of `_site/`, `_site-offline/`, `_site-pdf/`).
2. **`head_seo.html` markdownify precompute. [LANDED]** Moved the entire per-page derivation chain (`markdownify | strip_html | normalize_whitespace | escape_once` for page + site title, `absolute_url` for canonical, `absolute_url | uri_escape` for logo, homepage URL test) into a `:site, :pre_render` plugin (`_plugins/seo-precompute.rb`) that stashed the assembled values on `page.data["_seo_*"]` and `site.config["_seo_*"]`. `head_seo.html` then read them back as `page._seo_full_title` / `site._seo_site_title` etc. via the Drop fallback to data/config -- no per-render filter dispatch.

   Ruby-prof effect (post-chapter-precompute baseline vs post-SEO-precompute, instrumented build):

   | Metric | Before | After | Delta |
   |---|---|---|---|
   | Total instrumented wall | 39.28 s | 36.90 s | -2.38 s |
   | `Liquid::Strainer#invoke` total | 6.69 s / 190,973 calls | 5.97 s / 179,266 calls | -0.72 s / -11,707 calls |
   | `Jekyll::Filters#markdownify` calls | 1,802 | 128 | -1,674 |
   | `Jekyll::Filters#markdownify` total | 4.61 s | 3.69 s | -0.92 s |
   | `Jekyll::Filters::URLFilters#absolute_url` calls | 1,675 | 1 | -1,674 |
   | `Liquid::BlockBody#render` total | 18.38 s | 16.14 s | -2.24 s |
   | `Liquid::Context#stack` total | 18.19 s | 15.50 s | -2.70 s |
   | `Liquid::Variable#render` total | 10.05 s | 8.96 s | -1.09 s |

   The `BlockBody#render` / `Context#stack` / `Variable#render` drops reflect the eliminated `{%- assign -%}` / `{%- if -%}` blocks in head_seo.html (dropped from ~85 lines of Liquid logic to ~20 lines of straight output). The 128 remaining `markdownify` calls come from `book.html`'s part subtitle/intro (~24) and `book-chapter-body.html`'s per-chapter `chapter.content | markdownify` (~100 chapters whose content doesn't start with `<`); both candidates for a follow-up pass (see #3). New `Jekyll::SeoPrecompute#absolute_url` adds 0.44 s for 846 calls, replacing 1,675 filter calls that totalled 0.40 s -- essentially flat, but the absolute_url filter had its own per-build cache, so the swap was a wash on this axis. Output byte-identical to baseline (`diff -rq` clean on all three of `_site/`, `_site-offline/`, `_site-pdf/`).
3. **`book-chapter-body.html` heading-shift + anchor-prefix `replace` chain → Ruby pass. [LANDED]** Replaced the per-chapter chain of 0-3 heading-shift cascades (12 replaces each), the 12-pattern whitespace span wrapping, and the 13-replace anchor-id prefix pass with a single Liquid filter `book_chapter_transform` (`_plugins/book-chapter-transform.rb`). The filter took the body, the site baseurl, a precomputed `heading_shift_n` (0-3, derived in Liquid from `skip_base_heading_shift` / `is_sub_page` / `extra_heading_shift`), and the chapter anchor; did all seven passes in one method with no intermediate string allocations beyond what the regex engine produces internally (the seventh pass, added later, strips `<details>`/`<summary>` tags so collapsible sections like the FAQ render as flat content in the PDF). The dead `p1_search` / `p1_replace` / ... whitespace-pattern declarations were also removed from `book.html`'s prologue.

   The single-pass heading shift (one regex bumping each level by N, capping at h7-stub for source levels above 6) is equivalent to N applications of the bottom-up cascade chain -- each source heading lands at `level + N` or `h7-stub` regardless of how many sequential passes the chain ran, since the cascade structure was an artifact of Liquid not having a bump-by-N primitive, not a semantic requirement.

   Ruby-prof effect (post-SEO baseline vs post-chapter-transform):

   | Metric | Before | After | Delta |
   |---|---|---|---|
   | Total instrumented wall | 36.90 s | 34.78 s | -2.12 s |
   | `Liquid::Strainer#invoke` total | 5.97 s / 179,266 calls | 5.45 s / 122,397 calls | -0.52 s / -56,869 calls |
   | `Liquid::StandardFilters#replace` calls | 87,991 | 48,577 | -39,414 |
   | `Liquid::StandardFilters#replace` total | 0.58 s | 0.33 s | -0.25 s |
   | new `BookChapterTransform#book_chapter_transform` | -- | 0.14 s / 718 calls | +0.14 s |
   | `Liquid::BlockBody#render` total | 16.14 s | 14.43 s | -1.71 s |
   | `Liquid::Context#stack` total | 15.50 s | 13.78 s | -1.71 s |
   | `Liquid::Variable#render` total | 8.96 s | 7.82 s | -1.14 s |

   The Liquid framework drops (`BlockBody#render`, `Context#stack`, `Variable#render`) again outweigh the filter-dispatch drop -- they capture the eliminated `{%- unless -%}` / `{%- if -%}` blocks plus the chained `| replace:` pipeline AST nodes. The new filter does ~190 µs per call across 718 invocations, covering the same work the eliminated 39 k Liquid replaces did. Output byte-identical to baseline (`diff -rq` clean on `_site/`, `_site-offline/`, `_site-pdf/`).

4. **JekyllGFMAdmonitions defer-body-parse. [LANDED]** Extended `_plugins/jekyll-gfm-admonitions-patch.rb` with two method overrides on `JekyllGFMAdmonitions::GFMAdmonitionConverter`. The first replaced `admonition_html` so the admonition body was spliced into `doc.content` as raw markdown inside a `<div ... markdown='1'>` wrapper, deferring the per-admonition `@markdown.convert(text)` call to the page-level kramdown pass (which already ran with `parse_block_html: true` per `_config.yml`). One combined kramdown pass replaced 1 + N parses for each of the site's 508 admonitions. The second overrode `process_doc` to preserve the leading newline(s) in the code-block stash placeholder substitution -- without this, the gem's `(?:^|\n)(?<!>)\s*\`\`\`.*?\`\`\`` regex consumed the blank line between an admonition body and a following fenced code block, the placeholder ended up appended to the last `>`-prefixed body line, the admonition regex pulled it into the body capture, and either kramdown rendered it as an empty `<code class="language-plaintext"></code>` (gem behaviour) or the code block was spliced inside the admonition div (deferred-body behaviour). With the override, placeholders stayed on their own line outside the body capture.

   Ruby-prof effect (post-CT baseline vs post-GFM-patch):

   | Metric | Before | After | Delta |
   |---|---|---|---|
   | `GFMAdmonitionConverter#generate` total | 0.690 s / 1 call | 0.108 s / 1 call | -0.582 s |
   | `admonition_html` calls | 508 | 508 | (same dispatch, now does only string concat) |
   | `@markdown.convert(text)` calls from admonition_html | 508 | 0 | -508 |

   Wall-clock effect on 3-run uninstrumented means (busy dev machine, but consistent within each set):

   | Phase | Before | After | Delta |
   |---|---|---|---|
   | `done in ...` total | 11.47 s | 11.13 s | -0.34 s |
   | `GFMA: Generator ran in ...` | 216 ms | 93 ms | -123 ms |

   Output was not byte-identical to baseline: 12 files differed. Eleven were real bug fixes that were latent in the unpatched gem -- 5 pages had their fenced code block lost (the code-block-stash-eats-the-blank-line bug above; `Tutorials/Arrays.md`, `Tutorials/CustomControls/Painting.md`, `tB/Packages/WebView2/WebView2/index.md`, `tB/Packages/WinNamedPipesLib/NamedPipeClientConnection.md`, `tB/Packages/WinServicesLib/ServiceManager.md`), 1 page had a `\\\\` source sequence collapsed to `\\` by the gem's second markdown pass (`tB/Core/RightShift.md` -- the body is now parsed once, so `**\\\\**` renders as `<strong>\\</strong>` not `<strong>\</strong>`), 1 page had its loose-list items rendered as `<li>text</li>` instead of CommonMark's `<li><p>text</p></li>` because the gem's pre-rendered admonition HTML changed the surrounding paragraph context (`Documentation/Development.md`), and the remaining 5 are cosmetic whitespace nits inside admonitions that themselves contain a fenced code block (`tB/Core/If-Then-Else.md`, `tB/Core/Option.md`, `tB/Modules/Interaction/InputBox.md`, `tB/Packages/CEF/CefBrowser/index.md`, `tB/Packages/tbIDE/HtmlElement.md`). The 12th file was `assets/js/search-data.json`, derived from page contents so it tracked them. Lychee link check was clean (`8170 OK, 0 errors` for online; `6824 OK, 0 errors` for offline).

   A separate investigation looked at `NavIntegrityCheck::Generator#generate` (0.436 s / 1 call in the post-CT profile, attributed to 855 `Jekyll::FrontmatterDefaults#find` walks). The plugin used `page.data[key]` for `title` / `nav_exclude` / `parent` / `grand_parent`, and Jekyll's `Page#initialize` set `data.default_proc = proc { site.frontmatter_defaults.find(...) }`, so every missing key fell through to a full defaults walk. Switching to `data.fetch(key, nil)` bypassed the default_proc, but the resulting wall-clock delta was only ~50-80 ms: NavIntegrityCheck was warming `FrontmatterDefaults`'s internal `@matched_set_cache` (keyed by `path-type`), and `NavTreePrecompute::Generator#ordered_children_for` was the cache's biggest beneficiary. With NavIntegrityCheck skipping the walk, NavTreePrecompute paid the cache-miss cost itself -- ~430 ms moved from one stack to the other, leaving only the per-call dispatch overhead recovered. The patch was reverted.

### Cumulative

The four landed optimizations together (chapter precompute, SEO precompute, chapter-body transform, GFM defer-body-parse) shrank ruby-prof's instrumented build wall from ~41.7 s (immediately post-html-compress baseline) down to ~34 s. The cumulative profile-table picture, comparing the post-html-compress baseline to the post-GFM state:

| Metric | Post-html-compress | Post-GFM | Delta |
|---|---|---|---|
| Total instrumented wall | 39.30 s | 34.78 s* | -4.52 s |
| `Liquid::Strainer#invoke` total | 8.90 s / 191,365 calls | 5.45 s / 122,397 calls | -3.45 s / -68,968 calls |
| `where_exp` calls | 37 | 0 | -37 |
| `markdownify` calls | 1,802 | 128 | -1,674 |
| `absolute_url` filter calls | 1,675 | 1 | -1,674 |
| `replace` calls | 87,991 | 48,577 | -39,414 |
| `GFMAdmonitionConverter#generate` total | 0.690 s | 0.108 s | -0.582 s |
| `Liquid::BlockBody#render` total | 18.38 s | 14.43 s | -3.95 s |
| `Liquid::Context#stack` total | 18.19 s | 13.78 s | -4.41 s |

\* Instrumented totals were noisy on the development Windows machine (single-run range ~9 s across consecutive identical runs); the per-method numbers above are stable across runs and were the more reliable signal.

What was left of the per-filter table is approximately what kramdown / Rouge actually parsed and emitted: the 128 remaining `markdownify` calls were the per-chapter `chapter.content | markdownify` in `book-chapter-body.html` plus `book.html`'s part subtitle / intro markdown. Each of those is unique input, so Jekyll's converter cache rarely hits and the kramdown parse itself dominates. Further savings on this axis would have needed either (a) reusing the already-rendered `_site/<page>.html` instead of re-parsing source markdown for the book, or (b) accepting kramdown's parse cost as the floor and looking elsewhere -- the next-biggest non-library hotspot was `Offlinify#rewrite_html!` at ~2 s of self-time, already heavily optimised. The whole stack was retired in the Phase 10 cutover before option (a) was attempted in earnest; tbdocs writes the book PDF chapter set straight from the pre-rendered `<page>.renderedContent` in memory, which is essentially option (a) for free.
