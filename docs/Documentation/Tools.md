---
title: Tools and Scripts
parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

One-line-per-tool reference for every executable in the documentation repository: the Windows batch wrappers under `docs/`, the cross-platform Node and Python scripts under `scripts/`, the `tbdocs` orchestrator and its CLI flags, and the PDF render driver. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper.

* TOC goes here
{:toc}
## Batch wrappers under docs/

Each batch file changes to the `docs/` folder first, runs its underlying command, then restores the working directory. POSIX equivalents are listed in the per-batch entry below.

### docs/build.bat

    docs\build.bat [extra tbdocs flags]

Renders the documentation. Wraps `node ..\builder\tbdocs.mjs --src .` and forwards extra arguments through `%*`. Produces `_site/`, `_site-offline/`, and `_site-pdf/`, modulo the `--no-offline` / `--no-pdf` flags and the `also_build_offline` / `also_build_pdf` keys in `_config.yml`. Build time on the current tree is ~3 seconds end-to-end.

### docs/serve.bat

    docs\serve.bat

Starts a long-lived dev process. Wraps `node ..\builder\tbdocs.mjs --src . --serve` and forwards extra arguments through `%*`. After an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each change, and a browser connected to the page auto-reloads via SSE on each successful rebuild. Offline and PDF passes are skipped each rebuild. Ctrl+C exits cleanly. **Only failures (4xx, 5xx, server exceptions) are logged** --- successful requests are silent.

### docs/check.bat

    docs\check.bat

Runs `scripts/check_links.mjs` against the rendered `_site/` and `_site-offline/` trees in two parallel passes. The offline pass also runs `--forbid "https://docs.twinbasic.com"` to flag any surviving live-site link the offline rewrite missed. Both passes assert link integrity, HTML well-formedness, duplicate-`id` detection, anchor resolution, and accessibility hints; the online pass additionally checks `sitemap.xml` and the search index. Requires `build.bat` to have run first.

### docs/book.bat

    docs\book.bat

Renders the PDF book from `_site-pdf/book.html` into `_pdf/book.pdf`. Calls `node render-book.mjs` (see [below](#docsrender-bookmjs)). Requires `build.bat` to have populated `_site-pdf/` and a Chromium install from `npx puppeteer browsers install chrome`. The first invocation auto-runs `npm install` at the repository root if `puppeteer` is missing.

## CLI tools

### tbdocs --- node builder/tbdocs.mjs
{: #tbdocs }

Entry point for the static site generator. `docs/build.bat` invokes it as `node ..\builder\tbdocs.mjs --src .`; in CI it is run from the repository root.

Full invocation:

    node builder/tbdocs.mjs [--src <path>] [--dest <path>]
                            [--baseurl <prefix>] [--url <origin>]
                            [--dry-run]
                            [--no-offline] [--no-pdf] [--tolerate-missing-images]
                            [--profile-offline]
                            [--serve] [--port <N>]

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
| `--profile-offline` | Print per-substep timing for the offline tree pass. |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). Offline and PDF passes are skipped each rebuild. |
| `--port <N>` | HTTP port for `--serve` mode. Default: 4000. |

### scripts/check_links.mjs

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
| `--check-a11y` | Surface accessibility hints (missing `alt`, etc.). |
| `--check-ids` | Flag duplicate `id` attributes within a page. |
| `--check-sitemap` | Assert `sitemap.xml` covers every page. |
| `--check-search` | Assert search-index entries resolve to existing pages. |
| `--check-canonical` | Assert each page's canonical URL matches its location. |
| `--no-fail` | Downgrade failures to informational output (exit 0 even with broken links). |

Exit code 1 indicates broken links; exit code 2 indicates integrity-only failures (the integrity checks share the same SAX parse pass as link extraction). The script dedupes `(target, fragment)` so each unique filesystem check fires exactly once regardless of how many pages link to the same target --- on the current tree (~733k link occurrences, ~12k unique targets across 1,127 HTML files / 124 MB) each pass runs in ~2.2 seconds on a development box.

### scripts/crawl_check.mjs

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Starts at `<start-url>`, GETs every same-origin / same-base-path page recursively, extracts links, and verifies that each link responds 2xx (HEAD for cross-origin, GET for same-origin). Exits 0 if all links are reachable, 1 if any are broken. Use it after a manual `workflow_dispatch` deploy to verify the published site --- `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live HTTP surface.

### scripts/convert_em_dash_separators.py

    python scripts/convert_em_dash_separators.py

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to their kramdown smart-quotes ASCII source form (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips fenced code blocks and inline code spans.

### docs/render-book.mjs

    node docs/render-book.mjs <input.html> -o <output.pdf> [options]

The PDF renderer that `book.bat` calls. Drives `puppeteer` + `paged.js` + `pdf-lib` directly, so it controls `pdf-lib`'s `parseSpeed` (the default yields the event loop between every 100 objects on load, adding ~32 seconds to a 100-second build for no reason in Node --- see [perf/README.md](https://github.com/twinbasic/documentation/blob/main/perf/README.md) for the diagnosis). Replaces an earlier `npx pagedjs-cli ...` invocation.

Key options used by `book.bat`:

| Flag | Effect |
|---|---|
| `-o <output.pdf>` | Output PDF path. |
| `--outline-tags h1,h2,h3,h4` | Heading levels to include in the PDF outline / bookmarks. |
| `--additional-script <path>` | Path to a script injected before paged.js runs. `book.bat` passes `..\perf\detach-pages.js`, which hides each finalised page from Chromium's layout tree and restores them all before `page.pdf()` runs, dropping render time from ~104s to ~51s on the 1,638-page book by sidestepping paged.js's quadratic overflow walker. |

## Configuration files

The build pipeline also reads a handful of declarative files. They are not executable but the build's behaviour depends on them.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `enable_copy_code_button`, the footer / aux-link knobs, the GitHub edit-link knobs, and the offline-download-link knobs. Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block, the `exclude` list) are ignored. |
| `docs/_data/book.yml` | The PDF book's table of contents. Each entry resolves to one or more pages via `page` / `pages` / `nav_page` / `nav_pages` selectors plus an optional `no_descent` flag. `tbdocs`'s [`book.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/book.mjs) walks every entry and stashes the resolved chapter array as `entry._chapters` for the renderer pass. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that drives both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
