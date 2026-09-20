---
title: Tools and Scripts
parent: Documentation Development
nav_order: 4
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

One-line-per-tool reference for every executable in the documentation repository: the Windows batch wrappers under `docs/`, the cross-platform Node and Python scripts under `scripts/`, the `tbdocs` orchestrator and its CLI flags, and the PDF render driver. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper.

* TOC goes here
{:toc}
## Batch wrappers under docs/

Each batch file uses `@pushd "%~dp0"` to run from the repository root regardless of where it is invoked from. POSIX equivalents are listed in the per-batch entry below.

### build.bat

    build.bat [extra tbdocs flags]

Renders the documentation. Wraps `node builder\tbdocs.mjs --src docs` and forwards extra arguments through `%*`. Produces `_site/`, `_site-offline/`, and `_site-pdf/`, modulo the `--no-offline` / `--no-pdf` flags and the `also_build_offline` / `also_build_pdf` keys in `_config.yml`. Build time on the current tree is ~3 seconds end-to-end.

### serve.bat

    serve.bat

Starts a long-lived dev process. Wraps `node builder\tbdocs.mjs --src docs --serve` and forwards extra arguments through `%*`. After an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each change, and a browser connected to the page auto-reloads via SSE on each successful rebuild. Offline and PDF passes are skipped each rebuild. Ctrl+C exits cleanly. **Only failures (4xx, 5xx, server exceptions) are logged** --- successful requests are silent.

### check.bat

    check.bat

The gates that need a browser, or a second pass over the built tree. Link and integrity checking is not among them any more --- that moved into `build.bat` (see [tbdocs](#tbdocs)). Four steps, each stopping the run if it fails:

1. `scripts/check_tree_fresh.mjs` --- refuses a tree older than the sources that produced it. Scanning a stale tree reports a pass for the previous build.
2. `scripts/check_axe_patch_equiv.mjs` --- verifies the vendored axe source patch still produces identical colour values.
3. `scripts/pick_a11y_sample.mjs --check` --- verifies the sample still covers every markup construct the site uses.
4. [`scripts/check_a11y.mjs`](#check-a11y) --- the puppeteer + axe-core accessibility scan.

Requires `build.bat` to have run first.

### book.bat

    book.bat

Renders the PDF book from `docs\_site-pdf\book.html` into `docs\_pdf\twinBASIC Book.pdf`. Calls `node book\render-book.mjs` (see [below](#bookrender-bookmjs)). Requires `build.bat` to have populated `_site-pdf/` and a Chromium install from `npx puppeteer browsers install chrome`. The first invocation auto-runs `npm install` if `puppeteer` is missing. The output filename is set by the `-o` argument here; to rename the PDF, update it in `book.bat` and in `.github/workflows/jekyll-gh-pages.yml`.

## CLI tools

### tbdocs --- node builder/tbdocs.mjs
{: #tbdocs }

Entry point for the static site generator. `build.bat` invokes it as `node builder\tbdocs.mjs --src docs`; CI invokes it the same way.

Full invocation:

    node builder/tbdocs.mjs [--src <path>] [--dest <path>]
                            [--baseurl <prefix>] [--url <origin>]
                            [--dry-run]
                            [--no-offline] [--no-pdf] [--tolerate-missing-images]
                            [--fetch-assets] [--no-fetch-assets]
                            [--profile-offline]
                            [--check] [--no-check] [--check-audit-index]
                            [--check-findings <path>]
                            [--serve] [--port <N>]

`build.bat` passes `--src docs --check-audit-index`, and forwards anything else given to it.

| Flag | Effect |
|---|---|
| `--src <path>` | Source root. Default: `docs` relative to the working directory. |
| `--dest <path>` | Online-tree destination. Default: `<src>/_site`. The offline tree lands at `<dest>-offline`, the PDF tree at `<dest>-pdf`. |
| `--baseurl <prefix>` | Overrides `_config.yml`'s `baseurl`. Used by CI to inject the GitHub Pages base path on fork deployments. |
| `--url <origin>` | Overrides `_config.yml`'s `url`. Used by CI so canonical URLs match the actual deployment origin rather than the configured production host. |
| `--dry-run` | Skip every filesystem write. Useful for benchmarking or validating discovery / compute / render. |
| `--no-offline` | Skip the offline tree pass. |
| `--no-pdf` | Skip the PDF tree pass. |
| `--tolerate-missing-images` | Downgrade Phase 8's missing-image error to a warning. Use when the source tree is mid-edit and may temporarily reference an image that does not yet exist. |
| `--fetch-assets` / `--no-fetch-assets` | Force remote-asset vendoring on or off. Without either flag, the build downloads missing YouTube thumbnails and GitHub user-attachment images on a dev machine, and refuses to download anything when `$CI` is set --- a referenced but uncommitted asset is a hard build error there. See [Authoring Pages](Authoring#committing-downloaded-assets). |
| `--profile-offline` | Print per-substep timing for the offline tree pass. |
| `--check` | Run the link and site-integrity check over the HTML the build already holds in memory, across every tree it produced. A failing check does not abort the build; it sets the exit code --- 1 for link failures, 2 for integrity failures, 3 for both. |
| `--no-check` | Turn the check off again. Flags are read in order, so this wins over a `--check` baked into `build.bat`. |
| `--check-audit-index` | Implies `--check`, and additionally diffs the tree index the build derives from its own records against what landed on disk. A spurious entry makes the link oracle answer "exists" for a path that 404s in production, and nothing else would notice. This is what `build.bat` passes. |
| `--check-findings <path>` | Implies `--check`, and writes the findings as JSON for a tool to read. Used by [`scripts/check_links_diff.mjs`](#check-links-diff). |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). Offline and PDF passes are skipped each rebuild. |
| `--port <N>` | HTTP port for `--serve` mode. Default: 4000. |

### scripts/check_links.mjs
{: #check-links }

    node scripts/check_links.mjs [pass-args...] [/sep/ [pass-args...] ...]

Offline (filesystem-only) link checker plus optional integrity checks. Multiple `/sep/`-separated passes run in parallel through `worker_threads`. The relevant flags:

| Flag | Effect |
|---|---|
| `--offline` | Required. Online (network) link checking is not implemented. |
| `--root-dir <path>` | Filesystem root to resolve root-absolute URLs against. |
| `--fallback-extensions <list>` | Comma-separated list of extensions to append when a link target does not exist as-is. Use `html` to mirror GitHub Pages' extensionless-URL behaviour. |
| `--index-files <list>` | Comma-separated list of filenames to try when a URL resolves to a directory. Use `'index.html,.'` to also accept the directory itself as a valid target. |
| `--base-path <prefix>` | Strip this prefix from root-absolute URLs before resolving. Used in CI when `--baseurl` is set. |
| `--include-fragments` | Resolve `#fragment` anchors against the target page's IDs. |
| `--forbid <prefix>` | Repeatable. Fail the run if any extracted link starts with `prefix`. Used by the offline pass to catch live-site links the offlinify rewrite missed (the bare prefix and `prefix/` are exempt). |
| `--check-html` | Assert HTML well-formedness. |
| `--check-a11y` | Report accessibility hints (missing `alt`, etc.). |
| `--check-ids` | Flag duplicate `id` attributes within a page. |
| `--check-remote-assets` | Flag any `<img>` whose `src` points off-box (`http://`, `https://`, or protocol-relative `//host`). Remote images cost a network round trip per view, break the offline mirror, and abort the PDF book render --- the forked paged.js raises an error on an image that has not finished loading. Vendor the file under the section's `Images/` folder instead. |
| `--check-sitemap` | Assert `sitemap.xml` covers every page. |
| `--check-search` | Assert search-index entries resolve to existing pages. |
| `--check-canonical` | Assert each page's canonical URL matches its location. |
| `--no-fail` | Downgrade failures to informational output (exit 0 even with broken links). |

Exit code 1 indicates broken links; exit code 2 indicates integrity-only failures (the integrity checks share the same SAX parse pass as link extraction). The script dedupes `(target, fragment)` so each unique filesystem check fires exactly once regardless of how many pages link to the same target --- on the current tree (~733k link occurrences, ~12k unique targets across 1,127 HTML files / 124 MB) each pass runs in ~2.2 seconds on a development box.

### scripts/crawl_check.mjs

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Starts at `<start-url>`, GETs every same-origin / same-base-path page recursively, extracts links, and verifies that each link responds 2xx (HEAD for cross-origin, GET for same-origin). Exits 0 if all links are reachable, 1 if any are broken. Use it after a manual `workflow_dispatch` deploy to verify the published site --- `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live deployed site.

### scripts/check_a11y.mjs
{: #check-a11y }

    node scripts/check_a11y.mjs [--root-dir <path>] [--theme light|dark|both] [--viewport desktop|mobile|both]
                                [--stock-axe] [--minified]

Automated accessibility scan of the built site, and the last of `check.bat`'s four steps. Loads `axe-core` into headless Chromium (via `puppeteer`) and runs it against thirteen sample pages in both themes at two viewports, plus two state audits that open a disclosure first --- the page list is derived rather than hand-maintained, and [`scripts/pick_a11y_sample.mjs`](#pick-a11y-sample) is what keeps it representative. The scan uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags, plus the `heading-order` best-practice rule. All five WCAG tags must be listed because axe matches tags literally, with no version rollup --- a rule tagged only `wcag21aa` does not match `wcag22aa`, even though WCAG 2.2 AA is a superset of 2.1 AA. Exits 1 if any page has a violation and 2 on an internal error; incomplete (needs-review) results are reported but do not fail the run.

| Flag | Effect |
|---|---|
| `--root-dir <path>` | Tree to scan. Default: `docs/_site-offline`. |
| `--theme light\|dark\|both` | Which palette(s) to test. Default: `both`. |
| `--viewport desktop\|mobile\|both` | Which viewport(s) to test (`desktop` = 1280×900, `mobile` = 375×812). Default: `both`, so each page is scanned four times. |

Three details are essential and easy to break. It scans **`_site-offline/`, not `_site/`**: the online tree's root-absolute asset URLs (`/assets/css/…`) resolve to nothing under `file://`, so every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass --- the offline tree uses relative asset paths and renders for real. It scans **each page in both themes**, because dark mode is a separate palette (applied via `[data-theme=dark]`) and a light-mode pass says nothing about it. And it **blocks the search index** (`search-data.js` + `lunr.min.js`) while scanning: every page pulls in ~3.2 MB of index that never reaches the DOM axe walks, so aborting it cuts the run from ~27 s to ~9 s with identical results. `just-the-docs.js` is deliberately not blocked --- it installs the search combobox ARIA, and blocking it would make axe see less. Requires `build.bat` to have produced an up-to-date `_site-offline/`.

### scripts/pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads thirteen pages out of ~1,160, so the page list decides what it can report at all --- and a list that stops being representative fails silently: the rule for a construct no sample page carries simply never runs, and the gate stays green.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on. `--check` (the default, and what `check.bat` and both CI workflows run) verifies every family the site uses is covered by at least one sample page, and exits 1 naming the gaps and the cheapest page that would close each. `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list. `--census` reports what each family is, how many pages use it, and which page uses it most.

When the docs start using a construct they have not used before, add a family for it. Leaving it out is not neutral --- it means the rule for that construct runs nowhere.

### scripts/check_links_diff.mjs
{: #check-links-diff }

    node scripts/check_links_diff.mjs --a script --b fused
    node scripts/check_links_diff.mjs --self-test

Differential harness for the link checker. There are two implementations of one check --- the standalone [`scripts/check_links.mjs`](#check-links) and the build's own `--check` pass --- and two implementations of one check is the shape that rots quietly, because **a checker that silently checks less reports a clean pass**. This runs both over the same bytes and diffs their findings category by category.

Run it after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`. It builds the site itself, so both sides look at the same tree. It is deliberately not in `check.bat`: the script side costs a few seconds, which is the whole saving of having folded the check into the build.

Most of its cases compare empty against empty on a healthy site, so two of them are synthetic: `fixture`, a hand-written tree with one fault of every kind, and `fixture-built`, the same idea built by `tbdocs` from `test/fixtures/check-src` --- which is the only way the build's own checker can be held to it. `--self-test` runs the reference implementation's own regression guards and then diffs it against a deliberately corrupted side, failing unless the difference is reported.

### scripts/convert_em_dash_separators.py

    python scripts/convert_em_dash_separators.py

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to their kramdown smart-quotes ASCII source form (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips fenced code blocks and inline code spans.

### book/render-book.mjs
{: #bookrender-bookmjs }

    node book/render-book.mjs <input.html> -o <output.pdf> [options]

The PDF renderer that `book.bat` calls. It is a generic HTML-to-PDF converter: it takes the pre-built `_site-pdf/book.html` as its sole document input and has no knowledge of `_data/book.yml` --- all chapter structure, heading levels, and outline entries are already embedded in the HTML by `tbdocs` Phase 8. Uses `puppeteer` + `paged.js` + `pdf-lib` directly, so it controls `pdf-lib`'s `parseSpeed` (the default yields the event loop between every 100 objects on load, adding ~32 seconds to a 100-second build for no reason in Node --- see [perf/README.md](https://github.com/twinbasic/documentation/blob/main/perf/README.md) for the diagnosis). Replaces an earlier `npx pagedjs-cli ...` invocation.

Key options used by `book.bat`:

| Flag | Effect |
|---|---|
| `-o <output.pdf>` | Output PDF path. |
| `--outline-tags h1,h2,h3,h4` | Heading levels to include in the PDF outline / bookmarks. |
| `--additional-script <path>` | Path to a script injected before paged.js runs. `book.bat` passes `perf\detach-pages.js`, which hides each finalised page from Chromium's layout tree and restores them all before `page.pdf()` runs, dropping render time from ~104s to ~51s on the 1,638-page book by sidestepping paged.js's quadratic overflow walker. |

## Configuration files

The build pipeline also reads a handful of declarative files. They are not executable but the build's behaviour depends on them.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `exclude`, the footer / aux-link knobs, the GitHub edit-link knobs, and the download-link knobs (`gh_offline_link`, `gh_offline_link_url`, `gh_pdf_link_url`). Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block) are ignored. |
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Full schema is documented in the file header. Phase 2 resolves chapter arrays; Phase 8 assembles `book.html`. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that determines both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
