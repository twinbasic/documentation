---
title: Tools and Scripts
parent: Documentation Development
nav_order: 4
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

One-line-per-tool reference for every executable in the documentation repository: the seven Windows batch wrappers at the repository root, the Node and Python scripts under `scripts/` (cross-platform except for [`tbbuild.mjs`](#tbbuild), which drives the twinBASIC IDE), the `tbdocs` orchestrator and its CLI flags, and the PDF render driver. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper.

* TOC goes here
{:toc}
## Batch wrappers at the repository root
{: #batch-wrappers }

All seven sit at the repository root, beside `package.json` --- not under `docs/`. Each uses `@pushd "%~dp0"` to run from that root regardless of where it is invoked from, and each entry below gives the POSIX equivalent of what it runs. Those equivalents have no `pushd` in front of them, so **run them from the repository root** --- `tbdocs`'s `--src docs`, [`check_publish_policy.mjs`](#check-publish-policy)'s default source root, and every path handed to [`render-book.mjs`](#bookrender-bookmjs) are all resolved against the working directory. `examples.bat` and `addin-test.bat` are the exceptions to "each entry below gives the POSIX equivalent": they need a twinBASIC install and drive the IDE, so they are Windows-only, and neither is part of the site build. Four other tools are Windows-specific for the same reason and are likewise not part of it: [`scripts/tbbuild.mjs`](#tbbuild) and [`scripts/tbrun.mjs`](#tbrun), which drive the twinBASIC IDE, and [`census_attributes.mjs`](#census-attributes) and [`build_package_api.mjs`](#build-package-api), which run the twinBASIC compiler's `export` verb --- though those two are cross-platform when given an already-exported tree with `--src`. Nothing else in the repository is: `tbdocs` and every gate in both wrappers is a Node script, and CI runs all of them on `ubuntu-latest` except [`check_tree_fresh.mjs`](#check-tree-fresh), which guards against a failure mode CI cannot have.

### build.bat

    build.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --check-audit-index [extra tbdocs flags]

Renders the documentation. Wraps `node builder/tbdocs.mjs --src docs --check-audit-index` and forwards extra arguments through `%*`. Produces `_site/`, `_site-offline/`, and `_site-pdf/`, modulo the `--no-offline` / `--no-pdf` flags and the `also_build_offline` / `also_build_pdf` keys in `_config.yml`.

`--check-audit-index` is the part of that invocation most easily lost in transcription, and losing it is silent: it implies `--check`, so a bare `node builder/tbdocs.mjs --src docs` writes the same three trees, runs no link check at all, and reports success --- a check that never ran has nothing to report.

There is no fixed build time worth quoting here, because every run prints its own (`Done in …`, with the page and static-file counts). What that number tracks is page count, core count, and which passes ran: the check, the offline mirror and the PDF tree are each part of the total, and `--no-check`, `--no-offline` and `--no-pdf` each remove one.

### serve.bat

    serve.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --serve [extra tbdocs flags]

Starts a long-lived dev process. Wraps `node builder/tbdocs.mjs --src docs --serve` and forwards extra arguments through `%*`. After an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each change, and a browser connected to the page auto-reloads via SSE on each successful rebuild. Offline and PDF passes are skipped each rebuild. Ctrl+C exits cleanly. **Only failures (4xx, 5xx, server exceptions) are logged** --- successful requests are silent. The watcher covers `docs/` and the worker pool is reused across rebuilds, so **an edit under `builder/` does not reach a running preview** and needs a restart --- see [why `serve.bat` does not show a builder change](Extending#serve-does-not-reload).

### check.bat

    check.bat

The gates that read the built site. Link and integrity checking is not among them any more --- that moved into `build.bat` (see [tbdocs](#tbdocs)). Tests of the toolchain itself are not among them either --- those are [`test.bat`](#testbat). Four steps, each stopping the run if it fails:

1. [`scripts/check_tree_fresh.mjs`](#check-tree-fresh) --- refuses a tree older than the sources that produced it. Scanning a stale tree reports a pass for the previous build.
2. [`scripts/check_dot_fit.mjs`](#check-dot-fit) --- re-renders every committed diagram with the real webfont and fails if a label sits outside its box.
3. [`scripts/pick_a11y_sample.mjs --check`](#pick-a11y-sample) --- verifies the sample still covers every markup construct the site uses.
4. [`scripts/check_a11y.mjs`](#check-a11y) --- the puppeteer + axe-core accessibility scan.

Requires `build.bat` to have run first. POSIX --- four commands, not one, chained so the run stops where `check.bat` would:

    node scripts/check_tree_fresh.mjs \
      && node scripts/check_dot_fit.mjs \
      && node scripts/pick_a11y_sample.mjs --check \
      && node scripts/check_a11y.mjs

One of the four does not mean the same thing locally as it does in CI, on any platform. [`check_a11y.mjs`](#check-a11y)'s `target-size` rule measures rendered boxes, and an inline element's measured height is the content area of whatever `system-ui` resolves to on the machine running the scan --- which is why both workflows install `fonts-liberation` and the site's padding is calibrated against the smallest face in that band. A local pass does not predict the runner's, and it errs in the unhelpful direction: larger metrics clear controls that CI then fails. See [Building and Deployment](Building#fonts-liberation-installed-on-purpose) for the measurements.

### test.bat

    test.bat

The tests the toolchain has to pass. Ten steps, each stopping the run if it fails:

1. [`scripts/check_publish_policy.mjs`](#check-publish-policy) --- verifies the publish allowlist still refuses the types it is meant to. Needs neither a browser nor a built tree, so it goes first.
2. [`scripts/check_gate_lists.mjs`](#check-gate-lists) --- verifies the two gate lists on this page still match the wrappers that run them.
3. [`scripts/check_ci_workflows.mjs`](#check-ci-workflows) --- verifies both CI workflows run the gates the wrappers run, and build as `build.bat` does.
4. [`scripts/check_lint.mjs`](#check-lint) --- runs Biome over the tooling and fails on any finding, warnings included.
5. [`scripts/check_regex_safety.mjs`](#check-regex-safety) --- refuses a regex that can backtrack exponentially, written as a literal or built from constants.
6. [`scripts/check_code_regions.mjs`](#check-code-regions) --- verifies no pre-render rewrite alters the contents of a code fence or code span.
7. [`scripts/check_page_baseline.mjs`](#check-page-baseline) --- verifies the page-count drift guard still refuses a fall.
8. [`scripts/check_book_coverage.mjs`](#check-book-coverage) --- verifies the build still warns about a page `docs/_book.yml` does not mention.
9. [`scripts/check_symbol_index.mjs`](#check-symbol-index) --- verifies the symbol index still places each kind of symbol, and its drift guard still refuses a lost URL.
10. [`scripts/check_axe_patch_equiv.mjs`](#check-axe-patch-equiv) --- verifies the vendored axe source patch still produces identical colour values.

POSIX:

    node scripts/check_publish_policy.mjs \
      && node scripts/check_gate_lists.mjs \
      && node scripts/check_ci_workflows.mjs \
      && node scripts/check_lint.mjs \
      && node scripts/check_regex_safety.mjs \
      && node scripts/check_code_regions.mjs \
      && node scripts/check_page_baseline.mjs \
      && node scripts/check_book_coverage.mjs \
      && node scripts/check_symbol_index.mjs \
      && node scripts/check_axe_patch_equiv.mjs

**Seven of the ten cannot be affected by an edit confined to `docs/`**, which is why they are separate from `check.bat`. Run this one when the change touches `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/` or `test/`, the site's scripts in `docs/assets/js/`, a wrapper, or a workflow. Both CI workflows run all ten unconditionally, as they always did, so skipping it locally cannot let a tooling regression reach `staging`.

The two exceptions are [`check_code_regions.mjs`](#check-code-regions) and [`check_gate_lists.mjs`](#check-gate-lists), which reads this page. The first is worth knowing in detail. Its corpus sweep tokenises every markdown file under `docs/`, so a page that provokes a rewrite into altering a code region fails it. Its fixed probes are a different matter: they run against their own sources whatever the tree holds, and they cover the *mirror* fault, where a rewrite silently stops firing. The sweep cannot see that one --- text the rewrite skipped is stashed and restored unchanged, so every region still matches. Add a page with an unusual code construct and run `test.bat`, but read the built page too.

The split is by what a gate **interrogates**, not by what it happens to open. `check_axe_patch_equiv.mjs` loads a built page, so it does want `build.bat` to have run and it does want Chromium --- but only because its probe needs some document to run inside; what it tests is the axe patch. The test for where a new gate belongs is whether it would still mean something against an empty `docs/`.

### book.bat
{: #bookbat }

    book.bat

POSIX --- three commands, not one:

    node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
    mkdir -p docs/_pdf
    node book/render-book.mjs docs/_site-pdf/book.html \
      -o "docs/_pdf/twinBASIC Book.pdf" \
      --outline-tags h1,h2,h3,h4 \
      --additional-script perf/detach-pages.js

Renders the PDF book from `docs\_site-pdf\book.html` into `docs\_pdf\twinBASIC Book.pdf`, by calling `node book\render-book.mjs` (see [below](#bookrender-bookmjs)). The output filename is set by the `-o` argument here; to rename the PDF, update it in `book.bat` and in `.github/workflows/tbdocs-gh-pages.yml`.

`build.bat` must have populated `_site-pdf/` first. `book.bat` checks that rather than assuming it --- see [the pre-flight](#book-preflight) below.

**The `npm install` guard tests for the package, not for the browser.** `puppeteer`'s own `postinstall` downloads Chromium, so an ordinary `npm install` normally leaves both in place. What `book.bat` checks is whether `node_modules\puppeteer\package.json` exists, and that says nothing about the browser --- so an install run with `--ignore-scripts` or `PUPPETEER_SKIP_DOWNLOAD`, or a puppeteer cache cleared afterwards, passes the only test `book.bat` makes and still has nothing to render with. `npx puppeteer browsers install chrome` fixes that case; both CI workflows run it as a step of its own rather than relying on the postinstall. [PDF Generation](PDF-Generation#chromium-is-not-installed) gives the error it produces.

The `mkdir` is not housekeeping. `render-book.mjs` writes the PDF with a plain file write and never creates the directory above it, so a missing `docs/_pdf/` fails with `ENOENT` at the very end of the render, after the whole page-breaking pass has already run. `book.bat` and the deploy workflow both create it first, for that reason.

**Do not chain the two as `build.bat && book.bat`.** `build.bat` sets a non-zero exit code when the link or integrity check finds something, and still writes all three trees --- the finding is a report, not an abort. `&&` reads only the exit code, so a broken link anywhere on the site cancels the render, for a reason that has nothing to do with the book. The terminal ends on the link findings and no PDF, which reads as a render that failed rather than as one that never started. Run them as two separate commands; see [Building and Deployment](Building#the-double-ampersand-trap).

#### The pre-flight freshness check
{: #book-preflight }

`book.bat`'s **first** action, before the `npm install` test and before the renderer starts, is:

    node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html

[`check_tree_fresh.mjs`](#check-tree-fresh) refuses a `_site-pdf/` tree older than `docs/` or `builder/`. This used to be an existence test, and an existence test was not enough: edit a page, run `book.bat` without `build.bat`, and it spent two minutes rendering the **previous** book and reported success. Nothing downstream notices, because the PDF it produces is internally consistent, correctly paginated and correctly bookmarked. It is simply the wrong book.

Leaving the question to the renderer does not cover it either. `render-book.mjs` refuses a missing input with `input not found:` and the resolved path, which says nothing at all about a tree that is present and stale --- the case that costs two minutes and yields a wrong artifact.

`--marker book.html` is required here, and `book.bat` is the only caller that passes it. The script identifies a tree by its `index.html`, which every output tree has except `_site-pdf/` --- that one holds a single `book.html`. Without the flag, `--tree docs/_site-pdf` looked for an `index.html` that never exists and exited 2, so `--tree` was there all along and could not actually be pointed at this tree.

**The pre-flight has its own exit codes, and they collide with the renderer's.** `check_tree_fresh.mjs` exits **2** when the tree is absent and **1** when it is stale, and `book.bat` hands whichever it got straight back to its caller. [`render-book.mjs`](#bookrender-bookmjs) afterwards uses **1** for a missing input or a failed render and **2** for a bad argument, so the number alone does not say which half of `book.bat` failed. The message does --- every pre-flight failure is prefixed `check_tree_fresh:`, and these are the two it prints:

    check_tree_fresh: docs/_site-pdf/book.html does not exist.
      Run build.bat first -- there is no built tree to check.

    check_tree_fresh: docs/_site-pdf is 118s older than docs/Reference/Core/Dim.md.
      Run build.bat first. Scanning a stale tree reports a pass for the
      previous build, which is the one thing these gates must never do.

The check has one known false positive, which comes from the script rather than from this use of it. Its source list is `docs/` and `builder/`, and it does not distinguish code from notes, so editing a `builder/PLAN-*.md` marks every tree stale although nothing in the build reads those files. It errs toward refusing, which is the safe direction, but it does mean a note edit now blocks a render until you rebuild.

### examples.bat
{: #examplesbat }

    examples.bat [flags]

One invocation of [`check_examples.mjs`](#check-examples), with every flag passed straight through:

    node scripts/check_examples.mjs [flags]

Compiles the documentation's own twinBASIC code samples --- every ` ```tb ` fence marked `check_build` --- and reports the ones the compiler refuses, against the line in the page they came from. [Authoring Pages](Authoring#checking-that-a-sample-compiles) is the page for marking a sample and for what a pull request that changes one shows; this entry is about running the tool.

**It is not one of the gates, and it must not become one.** It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows, for three reasons that are not going to change: it needs a twinBASIC install, where `npm install` has to remain sufficient to build the docs; it needs Windows, a private desktop and a CDP-reachable WebView2, none of which exists on the CI box; and an IDE cold start is 8 to 11 seconds against a whole site build's four. It is run by a person, deliberately, which is the same arrangement [`sweep_a11y.mjs`](#sweep-a11y) already has.

Exit codes: **0** clean, **1** a sample does not compile, **2** the harness failed.

### addin-test.bat
{: #addin-testbat }

    addin-test.bat [flags]

One invocation of [`addin_test.mjs`](#addin-test), with every flag passed straight through:

    node scripts/addin_test.mjs [flags]

Tests twinBASIC IDE add-ins by machine: it builds each add-in under test, loads it into an IDE, operates the IDE the way a person would, and checks what the add-in did.

**It is not one of the gates either**, and for the reasons `examples.bat` is not: it needs a twinBASIC install, and it needs Windows, a private desktop and a CDP-reachable WebView2. It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes: **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed or could not put the registry back.

## CLI tools

### tbdocs --- node builder/tbdocs.mjs
{: #tbdocs }

Entry point for the static site generator. Every caller adds flags to the bare `--src docs`, and no two agree, so take the invocation from the caller rather than from memory:

| Caller | Invocation |
|---|---|
| `build.bat` | `--src docs --check-audit-index` (plus anything passed through) |
| `checks.yml` (PR checks) | `--src docs --no-fetch-assets --check-audit-index` |
| `tbdocs-gh-pages.yml` (deploy) | the same, plus `--url` and `--baseurl` from the Pages environment |

Full invocation:

    node builder/tbdocs.mjs [--src <path>] [--dest <path>]
                            [--baseurl <prefix>] [--url <origin>]
                            [--dry-run]
                            [--no-offline] [--no-pdf] [--tolerate-missing-images]
                            [--fetch-assets] [--no-fetch-assets]
                            [--profile-offline]
                            [--check] [--no-check] [--check-audit-index]
                            [--check-findings <path>]
                            [--update-page-baseline] [--update-symbol-baseline]
                            [--symbol-gaps <path>]
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
| `--update-page-baseline` | Record this build's page and static-file counts in `builder/page-baseline.json` as the drift guard's new baseline, in whichever direction they moved. An ordinary build raises the baseline by itself; only a **fall** needs this flag, because a fall is what the guard exists to catch. See [the page-count drift guard](Building#the-page-count-drift-guard). |
| `--update-symbol-baseline` | Record this build's symbol-index URLs in `builder/symbol-baseline.json`, whichever left it. New URLs are recorded by an ordinary build; only a URL the index has **stopped** publishing needs this flag --- and usually needs a pinned heading id instead. See [the symbol index and its drift guard](Building#the-symbol-index). |
| `--symbol-gaps <path>` | Write the public symbols no page documents to a JSON file: each one's package, container, name, kind, and the page its container is on. Names a package's `exclude_from_docs:` lists are left out. |
| `--stall-timeout <seconds>` | How long the build waits with no task completing before it gives up, names the outstanding tasks and exits 1. Default: 120. `0` disables the watchdog and returns the build to hanging in silence on a wedged worker. See [when a build stops instead of failing](Building#when-a-build-stops). |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). Offline and PDF passes are skipped each rebuild. |
| `--port <N>` | HTTP port for `--serve` mode. Default: 4000. |

### check_links.mjs
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
| `--check-remote-assets` | Flag any `<img>` whose `src` points off-box (`http://`, `https://`, or protocol-relative `//host`). Remote images cost a network round trip per view, break the offline mirror, and abort the PDF book render --- the forked paged.js raises an error on an image that has not finished loading. The remedy depends on the host. A `https://github.com/user-attachments/assets/...` URL needs no edit: the next local build downloads it to `docs/assets/attachments/` and renders that copy instead, so commit the downloaded file alongside the page. Any other host has no such handling --- download the image yourself and commit it under the section's `Images/` folder. See [Authoring Pages](Authoring#images). |
| `--check-sitemap` | Assert `sitemap.xml` covers every page. |
| `--check-search` | Assert search-index entries resolve to existing pages. |
| `--check-canonical` | Assert each page's canonical URL matches its location. |
| `--no-fail` | Downgrade failures to informational output (exit 0 even with broken links). |

Exit code 1 indicates broken links; exit code 2 indicates integrity-only failures (the integrity checks share the same SAX parse pass as link extraction). The script dedupes `(target, fragment)` so each unique filesystem check fires exactly once regardless of how many pages link to the same target --- on the current tree (~733k link occurrences, ~12k unique targets across 1,127 HTML files / 124 MB) each pass runs in ~2.2 seconds on a development box.

### crawl_check.mjs

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Starts at `<start-url>`, GETs every same-origin / same-base-path page recursively, extracts links, and verifies that each link responds 2xx (HEAD for cross-origin, GET for same-origin). Exits 0 if all links are reachable, 1 if any are broken. Use it after a manual `workflow_dispatch` deploy to verify the published site --- `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live deployed site.

### check_a11y.mjs
{: #check-a11y }

    node scripts/check_a11y.mjs [--root-dir <path>] [--theme light|dark|both] [--viewport desktop|mobile|both]
                                [--stock-axe] [--minified]

Automated accessibility scan of the built site, and the last of `check.bat`'s four steps. Loads `axe-core` into headless Chromium (via `puppeteer`) and runs it against thirteen sample pages in both themes at two viewports, plus two state audits that open a disclosure first --- 60 audits in all. The page list is derived rather than hand-maintained, and [`scripts/pick_a11y_sample.mjs`](#pick-a11y-sample) is what keeps it representative.

**This script is the reporting front end, not the scan.** What the scan *is* --- the page list, the themes and viewports, the blocked requests, the axe run options, the vendored source patches and the state audits --- lives in [`scripts/lib/axe-scan.mjs`](#axe-scan), which `check_a11y.mjs`, `sweep_a11y.mjs` and `check_a11y_fingerprint.mjs` all share. Change the scan there, not here. The scan uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags, plus the `heading-order` best-practice rule. All five WCAG tags must be listed because axe matches tags literally, with no version rollup --- a rule tagged only `wcag21aa` does not match `wcag22aa`, even though WCAG 2.2 AA is a superset of 2.1 AA. Exits 1 if any page has a violation and 2 on an internal error; incomplete (needs-review) results are reported but do not fail the run.

| Flag | Effect |
|---|---|
| `--root-dir <path>` | Tree to scan. Default: `docs/_site-offline`. |
| `--theme light\|dark\|both` | Which palette(s) to test. Default: `both`. |
| `--viewport desktop\|mobile\|both` | Which viewport(s) to test (`desktop` = 1280×900, `mobile` = 375×812). Default: `both`, so each page is scanned four times. |
| `--stock-axe` | Inject the unmodified axe bundle instead of the patched one. **Run this first if a result ever looks wrong** --- it says in one command whether the source patch is implicated. |
| `--minified` | Inject `axe.min.js`. The patched path needs the unminified bundle, so this and `--stock-axe` go together when reproducing a stock baseline. |

Three details are essential and easy to break. It scans **`_site-offline/`, not `_site/`**: the online tree's root-absolute asset URLs (`/assets/css/…`) resolve to nothing under `file://`, so every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass --- the offline tree uses relative asset paths and renders for real. It scans **each page in both themes**, because dark mode is a separate palette (applied via `[data-theme=dark]`) and a light-mode pass says nothing about it. And it **blocks the search index** (`search-data.js` + `lunr.min.js`) while scanning: every page pulls in ~3.2 MB of index that never reaches the DOM axe walks, so aborting it cuts the run from ~27 s to ~9 s with identical results. `just-the-docs.js` is deliberately not blocked --- it installs the search combobox ARIA, and blocking it would make axe see less. Requires `build.bat` to have produced an up-to-date `_site-offline/`.

### pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads thirteen pages out of ~1,160, so the page list decides what it can report at all --- and a list that stops being representative fails silently: the rule for a construct no sample page carries simply never runs, and the gate stays green.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on. `--check` (the default, and what `check.bat` and both CI workflows run) verifies every family the site uses is covered by at least one sample page, and exits 1 naming the gaps and the cheapest page that would close each. `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list. `--census` reports what each family is, how many pages use it, and which page uses it most. `--fresh` applies to `--propose` alone: by default the set cover is seeded with the current list, so it prints what to *add*, and `--fresh` ignores the current list and covers from scratch --- which is how to ask whether the pages already in the sample still earn their place.

**`--check` cannot report a construct nobody has registered.** It iterates the families that exist and asks whether the sample still covers each, so markup no family describes produces silence --- and that silence is the failure a derived sample exists to prevent. When the docs start using a construct they have not used before, registering the family is a deliberate step nothing will prompt you to take.

A family is one entry in the `FAMILIES` object at the top of the script, keyed by a short name, with three fields:

    kbd: { re: /<kbd[\s>]/g, min: 2, why: "color-contrast on inline key caps" },

`re` is a global regular expression matched against each page's built HTML --- the emitted markup, not the markdown --- so key it on the tag or class the renderer actually produces. `min` is how many matches a page needs before it counts as covering the family, and it is the field that needs a decision: `1` when one instance exercises the rule exactly as fifty would, higher when the rule is about the relationship *between* instances. Consecutive `<summary>` elements are the worked case --- `target-size` between two of them is registered as its own family at `min: 8`, because a page with one disclosure does not exercise it and neither does a page with four. `why` names the axe rule that would otherwise have nothing to run on, and is what a failure prints.

Then run `--check`. If the new family is uncovered it names the cheapest page that would close the gap, and **adding that page means editing `SAMPLE_PAGES` in `scripts/lib/axe-scan.mjs`, not this script.** An entry there is a bare string --- the page's path in the built tree, root-relative, with the `.html` on it and no origin:

    "/Documentation/Development/Pipeline-Stages.html",

which is the path `--check` names for you. Two things follow from that second edit. Run [`scripts/sweep_a11y.mjs`](#sweep-a11y) once over the whole site, because the sample can only ever report on the markup it contains, and the sweep is what says what the new construct is doing on the pages that already have it. And do not expect [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) to vouch for it: it compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot.

### check_links_diff.mjs
{: #check-links-diff }

    node scripts/check_links_diff.mjs [--a SIDE] [--b SIDE] [--case NAME ...]
                                      [--base-path-tree DIR] [--build-base-path]
                                      [--max-lines N] [-v]
    node scripts/check_links_diff.mjs --list
    node scripts/check_links_diff.mjs --self-test

Differential harness for the link checker. There are two implementations of one check --- the standalone [`scripts/check_links.mjs`](#check-links) and the build's own `--check` pass --- and two implementations of one check is the shape that rots quietly, because **a checker that silently checks less reports a clean pass**. This runs both over the same bytes and diffs their findings category by category, across the nine finding categories plus the per-run counts. Exits 0 when the two sides agree, 1 on a difference, 2 on a harness error.

Two registries decide what a run actually does, and `--list` prints both. **Sides** are the implementations being compared, named by `--a` and `--b`:

| Side | What it is |
|---|---|
| `script` | `check_links.mjs` pinned to `--oracle fs`, run in-process. The reference implementation --- though not an oracle of record: on Windows its filesystem oracle answers "exists" for a wrong-case path that 404s on GitHub Pages, and on that one question `index` is the correct side. |
| `index` | The same script over the same walk, with existence answered from a Set built off one directory listing rather than a stat per candidate. Proves the oracle's lookup semantics. |
| `fused` | `tbdocs --check`, the build's own pass. The side the whole harness exists for: the one that could quietly check less, with nothing else on a clean site to say so. |
| `mutant` | `script`, corrupted on purpose. Reachable only through `--self-test`. |

Both default to `script`, and a bare invocation is refused rather than printing agreement between an implementation and itself.

**Cases** are what gets checked and with which flags, selected by a repeatable `--case`. Omit it and all eight run:

| Case | Tree and flags | Fused equivalent |
|---|---|---|
| `online` | `_site/` --- integrity + sitemap + search + canonical | yes |
| `online-abs` | `online` again with an absolute `--root-dir`, asserted to reach identical findings | no |
| `offline` | `_site-offline/` --- integrity + `--forbid` | yes |
| `book` | `_site-pdf/book.html` --- fragments and `--forbid`, `--no-fail` | yes |
| `basepath` | a tree built with `--baseurl`, checked with the matching `--base-path` | yes |
| `fixture` | a synthetic tree written at run time, carrying one fault of every kind | no |
| `fixture-built` | `test/fixtures/check-src` built by `tbdocs` --- the online tree | yes |
| `fixture-built-offline` | the same build's offline tree, which has the forbidden prefix the online tree lacks | yes |

That last column is the part worth reading before trusting a green run. Under `--b fused` the two cases with no fused equivalent are skipped --- named in a `skipped:` line, not silently --- because the build's pass checks what the build produced and has nothing to say about a `--root-dir` shape variation or a hand-written tree it never wrote. The real-tree cases are empty in nearly every category on a healthy site, so for as long as `fixture` was the only fault-carrying case, **every `--b fused` run dropped the one case that gave the comparison anything to compare.** The built pair closes that: the same idea in a tree `tbdocs` produced, split across two cases because no single tree carries all nine categories --- the online tree has the sitemap, search and canonical checks, and the offline tree has the forbidden prefix the online tree lacks.

Both CI workflows run the harness, and neither runs it over the real site. `checks.yml` (pull requests) runs both halves:

    node scripts/check_links_diff.mjs --case fixture --a script --b index
    node scripts/check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused

`tbdocs-gh-pages.yml` (deploy) keeps only the first: ~0.3 s over a synthetic tree, enough that the reference implementation cannot rot unnoticed, while the extra three-page build stays on the PR gate. What is in neither, and deliberately not in `check.bat` either, is the full `--a script --b fused` over the real trees --- it builds the site itself so both sides read the same bytes, and the script side then costs a few seconds, which is the entire saving of having folded the check into the build. Run that one by hand after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`.

`--self-test` is the guard on the guard. It runs `check_links.mjs`'s own regression guards --- since `b97c75f` nothing else does --- and then diffs the reference implementation against a deliberately corrupted copy, failing unless the difference is reported. Everything else the harness prints reduces to *the two sides agreed*, which is also what a harness comparing nothing says.

The fixtures have their own document, and it is the one to read before editing them: [`test/README.md`](https://github.com/twinbasic/documentation/blob/main/test/README.md) covers what each page under `check-src/` is there to provoke, and the hard-coded per-category counts (`FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE`, `FIXTURE_BUILT_OFFLINE`) that are asserted after every run, so a fixture that stops provoking a category fails loudly instead of quietly returning to empty-against-empty. It also covers the hazard that catches people out: **the fixture is built by the real `tbdocs`, so a template change can turn this gate red without anyone touching the fixture or the checker.** Adding the self-hosted fonts put two `<link rel="preload">` tags on every page, `check-src/` had no `assets/fonts/`, and its `broken` count went from 3 to 9. The fix for that shape of failure is to add the stub asset the template now expects --- never to raise the expected count, which dilutes a category the fixture exists to hold at an exact number.

### axe-scan.mjs
{: #axe-scan }

Not a command --- `scripts/lib/axe-scan.mjs` is the shared module that **defines** the accessibility scan, imported by [`check_a11y.mjs`](#check-a11y), [`sweep_a11y.mjs`](#sweep-a11y) and [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint). It holds `SAMPLE_PAGES`, `THEMES`, `VIEWPORTS`, `STATE_AUDITS`, `BLOCKED_REQUESTS`, `AXE_RUN_OPTIONS`, `SOURCE_PATCHES` and the `SCHEMES` registry, plus the `runMatrix` / `buildMatrix` drivers. Any change to *what the scan runs* belongs here, and most of them must go through the [fingerprint gate](#check-a11y-fingerprint) first. **`SAMPLE_PAGES` is the exception, and it is the constant most often edited**: the gate compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot, and a green run there vouches for nothing. Argue that one from source, run [`sweep_a11y.mjs`](#sweep-a11y) once, and use the gate's A/A control (`--baseline production --candidate production`) only to show the matrix is still deterministic.

`STATE_AUDITS` deserves a note: a closed `<details>` subtree is `notRendered`, so axe never walks it. Entries here are layered onto the page × theme × viewport matrix and apply a DOM mutation from `PAGE_STATES` before the audit, which is how the section-links disclosure gets audited open as well as closed. **Every `PAGE_STATES` function must assert it found what it expected** --- a state that silently does nothing degrades into a second audit of the default page: slower, still green, covering nothing.

### check_publish_policy.mjs
{: #check-publish-policy }

    node scripts/check_publish_policy.mjs [--src <path>]

The gate on the publish allowlist. Everything under `docs/` that is not a page is copied into the published site verbatim, so the source tree's shape is the site's shape --- [`builder/publish-policy.mjs`](Builder#module-map) is the list of types that may be published, enforced inside the build at the source inventory and again at each output tree's inventory. A finding there aborts the build rather than setting an exit code: a broken link still leaves a tree worth inspecting, a tree with a private key in it does not.

A clean build only says **nothing in `docs/` is currently refused**, which is also what an allowlist widened until it refuses nothing would say, and no build over a clean tree can distinguish the two. So this asserts the other half: thirteen named probes that must stay refused (a `.bak`, a `.pem`, a `.docx`, a `.twin`, a `secrets.json`, a `Thumbs.db`, a frontmatter-less `.md`, an extensionless `LICENSE`, a dotfile), six that must keep publishing (`.png`, `.PNG`, `.woff2`, `.txt`, `.html`, `CNAME`), that `bundle_extra` exemptions stay scoped to the exact declared path rather than blessing the extension everywhere, and that `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` stay disjoint --- folding the two together would pass every other assertion here while quietly making a stray `docs/secrets.json` publishable.

It also checks that the refusal *message* for a `.md` still names a fault that can happen, which is a narrower thing than it sounds. The message tells the reader the opening `---` must be the first line, and that is the right advice only because the two causes that come to mind first are handled elsewhere: a UTF-8 BOM is stripped before parsing, and malformed YAML aborts with its own error. An earlier draft named the BOM and would have sent every reader hunting for something that cannot occur, so all three behaviours are now asserted against real files --- nothing else in the repository covers them.

No browser, no built tree, ~40 ms, which is why it is `test.bat`'s first step. Run it after touching `builder/publish-policy.mjs`. Exits 1 naming each failed assertion.

### check_tree_fresh.mjs
{: #check-tree-fresh }

    node scripts/check_tree_fresh.mjs [--tree DIR] [--source DIR ...]

`check.bat`'s first gate. Refuses a built tree older than the sources that produced it, by comparing the newest mtime under the source tree against the built tree's `index.html`. The build's own output trees under `docs/` are not sources, and which folders those are comes from `lib/markdown-files.mjs`, the list [`check_code_regions.mjs`](#check-code-regions) walks by. Without it, editing a page and running `check.bat` without rebuilding audits the *previous* build and passes --- a green run that says nothing about the change just made. CI never hits this because it builds in the same job; a development box hits it whenever the two commands run out of order. Exits 0 when the tree is current, 1 when stale (naming `build.bat`), 2 when the tree is absent.

### check_dot_fit.mjs
{: #check-dot-fit }

    node scripts/check_dot_fit.mjs [--verbose]

Renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Graphviz lays out boxes from a width table while the browser paints text with an actual font --- two measurements of the same string that nothing inside the build compares. When they disagree the SVG is still well-formed and the build still green; the only symptom is a label hanging past its edge. Twenty-seven labels across three diagrams shipped that way, on pages that had passed the full accessibility sweep, because axe does not evaluate SVG `<text>` geometry either. `builder/dot-metrics.mjs` fixed the cause; this proves it stayed fixed. Needs a browser, which is why it lives in `check.bat` rather than the build. Run it after touching any `.dot`, `builder/dot-metrics.mjs`, or `builder/inter-metrics.json`.

### check_regex_safety.mjs
{: #check-regex-safety }

    node scripts/check_regex_safety.mjs [--census] [--self-test]

Refuses a regex that can backtrack exponentially. Parses every `.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/` and `wisdom/` with acorn and classifies each pattern with [recheck](https://makenowjust-labs.github.io/recheck/). No browser, no built tree, a few seconds.

**It reads two things: regex literals, and every `new RegExp(...)` whose arguments can be resolved from the source.** The second half matters more than it sounds, because building a pattern out of shared fragments --- `const NUM = "..."; new RegExp(`${WRAP}${NUM}`)` --- is the ordinary way to avoid writing a sub-pattern six times, and for as long as the gate read literals only, doing that made a regex invisible to it. Six in one gate were, and one of them turned out to be polynomial rather than safe; it was found by a person running recheck against it by hand, which is not a process. A construction it cannot resolve is listed by `--census` with the reason --- *a function parameter, check the call sites*, *a `let`, so its value is not fixed* --- so the remaining blind spot is a short list rather than a count.

**An exponential regex does not fail a build, it stops one.** The corpus passes for as long as no page happens to contain the trigger; then a worker sits inside `String.replace` and never returns, and the build prints its last line. That is not hypothetical --- `VOID_TAGS_RE` in `builder/render.mjs` shipped that way, and the two alt strings that triggered it (`Line/Column`, `/Packages/WinDevLib`) are ordinary English. This gate asks the question of the regex rather than waiting for content to ask it. When it first ran it found a second exponential regex in the same file that nobody knew about, and then found that the first attempt at fixing `VOID_TAGS_RE` was still exponential on a subtler input. The [stall watchdog](Building#when-a-build-stops) ends such a run after two minutes and names the wedged task and the pages it was rendering, which turns a silent hang into a diagnosis --- it does not make the regex safe.

**When it refuses one**, the report gives the file, the line, the pattern, and a **witness** --- an input that makes that pattern blow up. Keep the witness: pasting it into a scratch `re.test(witness)` is how you watch the fault, and it is the only thing that later says the rewrite worked, since the corpus passed before the fix and passes after it. It is printed whole, with its length, and must be pasted whole. The report used to cut it to 70 characters, and a shortened witness has fewer repetitions of the part that causes the blowup: for the first attempt at fixing `VOID_TAGS_RE`, the 492-character witness ran for more than 30 seconds while its first 70 characters returned in under a millisecond.

The cause is one shape, every time: **two parts of the pattern can match the same character**, so a single run of input can be divided between them in exponentially many ways, and a match that ultimately fails tries every division. Both regexes this repository shipped were that. `VOID_TAGS_RE` spelled a void tag's attribute list as `(?:\s+[^>/]+...)*`, and `[^>/]` matches a space exactly as `\s` does, so any run of attribute text divides arbitrarily. Narrowing the class to `[^\s>/]` looked like the fix and was not --- it still matches `"`, `'` and `=`, so an attribute could be taken either by the name class or by the quoted-value alternative, which is the same ambiguity one level down. That second version was pronounced safe by hand and refused by this gate.

**The rewrite that works is to stop describing the structure between the delimiters.** Both regexes are now `<(br|hr|...)\b([^>]*)>`, and the attribute handling happens afterwards in ordinary JavaScript, where it is easier to read and cannot backtrack at all. `[^>]*` and the `>` after it share no character, so there is no division to try. **Do not reintroduce a per-attribute sub-pattern in either one**: it was written that way, fixed that way, and was wrong both times.

It gates on **exponential only**. recheck also reports polynomial blowup, and about a fifth of the patterns here are polynomial --- nearly all the ordinary `<tag[^>]*>` shape on bounded input. Failing those would mean fifty findings on day one, and a gate that fails on day one gets switched off. The `degN` a census prints is worth even less than that: measured on one pattern over three runs each, the native backend calls it degree 2 and the pure-JavaScript fallback calls it degree 3. Both agree on exponential-or-not, which is the only thing the gate rests on.

Two sets of probes run inside the normal pass rather than behind `--self-test`, because a green line saying *no exponential regex* is otherwise indistinguishable from a gate that has stopped detecting them. Eight are regexes with known answers in both directions, including the three this repository actually shipped. Fourteen more cover the folding: eight constructions that must resolve to an exact pattern, and six that must be refused with a reason --- a folder that quietly resolves nothing moves every construction into the unresolved list and the run still passes.

Exits 1 on an exponential finding. Exits 2 when the gate itself failed --- a file that would not parse, a regex recheck could not analyse, a probe that came back wrong, or a crash --- because each of those leaves something unchecked; a 2 wins over a 1 when both happen in one run. That is the [convention for a gate's exit codes](Extending#conventions), which this gate predates and followed only from round 7 of the use-case evaluation: until then it returned 1 for everything.

### check_code_regions.mjs
{: #check-code-regions }

    node scripts/check_code_regions.mjs [--verbose] [--self-test]

Verifies that no pre-render rewrite in `builder/render.mjs` alters the contents of a code fence, an indented code block or an inline code span. Tokenises every markdown file under `docs/`, applies the real rewrite chain, re-tokenises, and compares the code regions in order. No browser, no built tree, a couple of seconds.

The list of files comes from `lib/markdown-files.mjs`, which [`convert_em_dash_separators.mjs`](#convert-em-dash-separators) and [`check_examples.mjs`](#check-examples) share. It never enters the build's output trees, so a running `serve.bat` cannot fail the gate: the preview deletes and rewrites `docs/_serve` on every rebuild, and a walk inside it at that moment used to die with `ENOENT`.

Those rewrites run over **raw markdown**, before markdown-it has parsed anything, so none of them can tell prose from code --- and this site's subject matter is code. Four defects of exactly that shape shipped: a language reference printed its `If` / `ElseIf` / `Else` bodies flush left, a page lost the blank line between two examples, a link's argument list was percent-encoded inside a fence, and a YAML sample's closing `---` was deleted outright. **No other gate can see any of it**, because the damage sits inside `<code>` and the link, integrity, publish and accessibility checks all pass over it.

Probes ride along in the normal run, each a defect this repository actually shipped, and a passing run prints how many of each kind it ran. The corpus is clean, so a sweep that finds nothing is otherwise indistinguishable from a gate that has stopped detecting. It imports the rewrite chain rather than reconstructing it, which is what makes removing the code mask from one rewrite change what the gate runs.

The admonition probes test the mirror fault, which the region comparison structurally cannot see: **a rewrite that misreads what is code can also fail to fire on real prose**, and the regions still come back identical because the text was only stashed and restored. `Reference/Attributes.md` shipped all six of its admonitions as the literal text `[!NOTE]` for exactly that reason --- a `[Description(...)]` sample whose argument is a Markdown string containing two fence markers as twinBASIC string literals, which the fence stasher closed the surrounding fence on. Every pairing after it was off by one.

`--verbose` prints the first few altered regions of each failing file, before and after. `--self-test` replaces the normal run rather than adding to it, so neither the probes nor the sweep runs: it de-indents the body of one small fence by hand and passes only if the comparison notices. That proves the comparator can still see a change, and nothing more --- it runs no rewrite at all.

Exits 1 when a code region differs, when a probe's admonition is not rewritten, or when `--self-test`'s de-indent goes unnoticed, and 2 when the gate itself cannot run. [When `test.bat` fails in `check_code_regions`](Extending#code-regions-altered) says what to change.

### check_gate_lists.mjs
{: #check-gate-lists }

    node scripts/check_gate_lists.mjs
    node scripts/check_gate_lists.mjs --verbose
    node scripts/check_gate_lists.mjs --self-test

Two checks in one. It verifies that the two numbered gate lists on this page --- [`check.bat`](#checkbat) and [`test.bat`](#testbat) --- still name the same scripts, in the same order, as the wrappers that run them, and that each section's stated step count matches its own list. Then it sweeps `README.md` and every page under `docs/Documentation/` for a gate count stated in prose anywhere, and fails on any that disagrees with the wrapper. Pure text: no browser, no built tree, well under a second.

It exists because this rotted three times, and the last two were a fix decaying rather than a fresh mistake. Round 2 of the use-case evaluation found `test.bat` documented as three gates when it had four, and that was fixed here. [Building and Deployment](Building)'s parallel copy of the same sentence was not touched, a fifth gate landed, and round 3 found it naming three of five --- while [Extending the Builder](Extending) claimed `check.bat` runs six, listed two `test.bat` gates among them, and never mentioned `test.bat` at all.

**The first version of this gate read only this page, and said so as if that settled it**: *"a third page that starts restating them is outside what this can see, which is the argument for not letting one."* Building was already that third page and `README.md` a fourth, both wrong on the day the gate shipped green, and round 4 found three readers tripping over one of them independently. A gate scoped to one page guards one file, not a class --- hence the sweep.

Three things follow from how it works. **The wrapper is the source of truth**, not the prose: a gate comparing the pages against each other would be satisfied by two pages that agree and are both wrong. **This page owns the lists**, and every other page cites these entries rather than restating them. And **the sweep reads per section, not per line** --- the count that went wrong most often is stated in a section whose only mention of the wrapper is the command line under its heading, so a line-by-line grep finds four of seven sites and looks thorough doing it.

When it fires on a count that is merely a subset --- *three cheaper gates run first* --- the fix is to delete the number rather than correct it. The command block or the linked list beneath it already states it, and a number nothing derives is a number that goes stale. The script's header names what the sweep deliberately does not see.

Its probes ride along in the ordinary run rather than hiding behind `--self-test`, because a green line from a gate that has stopped detecting looks exactly like a green line from a working one. Twelve of the eighteen cover the sweep, each a sentence that was published at the commit round 4 reviewed. Exits 1 on a disagreement or a failed probe, 2 if it cannot run.

### check_ci_workflows.mjs
{: #check-ci-workflows }

    node scripts/check_ci_workflows.mjs

The same question as [`check_gate_lists.mjs`](#check-gate-lists), asked of the two CI workflows, which nothing else reads. It requires that `checks.yml` and `tbdocs-gh-pages.yml` each run every gate [`test.bat`](#testbat) and [`check.bat`](#checkbat) run, with the same arguments and in each wrapper's own order; that the two workflows run the same gate steps in the same order; and that each workflow's build passes every argument [`build.bat`](#buildbat) passes, plus `--no-fetch-assets`. A step dropped from a workflow, a gate added to a wrapper and never to CI, or a lost `--check-audit-index` would otherwise leave CI green over a check it had stopped making.

The gates both workflows share are one composite action, `.github/actions/run-gates/action.yml`, and the gate reads a workflow step that uses a local action as that action's own steps. A local action it cannot read is a finding, so a renamed action cannot take its gates out of CI unnoticed.

The differences that are meant are listed in the script, each with where it is recorded: `check_tree_fresh.mjs` runs only locally, because CI builds the tree in the same job; the two `check_links_diff.mjs` fixture steps run only in CI, one of them only in `checks.yml`; and the deploy build adds `--url` and `--baseurl`. CI may also interleave the two wrappers' gates, as long as each wrapper's own order holds. Anything else is a finding, and so is an allowance that no longer matches anything.

Its probes ride along in every run: each plants one defect in a small synthetic set of wrappers, workflows and actions --- a missing gate, a step no wrapper runs, two gates swapped, changed arguments, a build flag lost or added, a gate missing from the shared action, a workflow that stops calling it --- and requires exactly the findings it should produce. Pure text: no browser, no built tree. Exits 0 clean, 1 on a finding, 2 when a probe fails or the gate cannot run.

### check_lint.mjs
{: #check-lint }

    node scripts/check_lint.mjs
    node scripts/check_lint.mjs --staged

Runs Biome, pinned to an exact version, over the tooling: `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `test/` and the site's two scripts in `docs/assets/js/`, less the exceptions that `biome.jsonc` at the repository root lists and explains. The rules are the ones that find defects --- Biome's correctness and suspicious groups --- and none about style; the configuration names the few it turns off, each with its reason. Moving and deleting code leaves unused imports and undeclared names behind, and nothing else reads the tooling for them. No browser, no built tree, a fraction of a second.

**Warnings fail as well as errors.** Biome reports an unused import or variable as a warning, and exits 0 on warnings, so a plain `npx biome lint` passes a file full of them. The gate also refuses to pass when Biome could not lint. Biome exits 1 for a broken `biome.jsonc`, as it does for a finding, and 0 for a scope that matches no script at all, so the gate reads the summary Biome writes beside its usual output to tell these apart. Exits 0 clean, 1 on a finding, 2 when Biome could not lint or, over the whole scope, checked no script.

Lint before every commit that touches one of those folders, or let the pre-commit hook do it. `.githooks/pre-commit` runs this gate with `--staged`, on the scripts the commit adds or changes, as they are in the working tree, and runs nothing else. Biome skips the staged scripts its scope excludes, and a commit that stages no script returns before Biome starts. Enable the hook in a clone with:

    git config core.hooksPath .githooks

A clone without the hook is still checked, because `test.bat` and both CI workflows run this gate over the whole scope. `npx biome lint --write` applies the fixes Biome marks safe. The fixes it offers for an unused import or variable are marked unsafe and need `--unsafe` as well, so read the diff after applying them.

### check_page_baseline.mjs
{: #check-page-baseline }

    node scripts/check_page_baseline.mjs

Verifies the [page-count drift guard](Building#the-page-count-drift-guard) still refuses what it exists to refuse. Eleven probes against a scratch baseline file in the system temp directory, so nothing here touches `builder/page-baseline.json`. No browser, no built tree, well under a second.

The guard says nothing on a healthy tree, so every ordinary build sounds exactly like one whose guard has stopped working --- which is the whole reason this exists. The first probe replays the defect that motivated the guard: 37 pages of the AppGlobalClassObject package lost to a blanket `exclude:` rule, under a guard that knew only a floor of 836 against a real 908. Reverting the guard to that floor fails three of the eleven.

Two probes look redundant and are the two that caught real bugs while the guard was being written. A **foreign source root must be ignored**: [`check_links_diff.mjs`](#check-links-diff) builds a three-page fixture tree, and a baseline keyed to nothing met it with *905 pages missing*. And **CI must refuse a missing baseline** rather than create one, because a run that wrote the file would record whatever drop it had been asked to catch.

Exits 1 on any failed probe.

### check_book_coverage.mjs
{: #check-book-coverage }

    node scripts/check_book_coverage.mjs

Verifies the build still warns about a page [`docs/_book.yml`](Book-Configuration#pages-left-out-of-the-book) does not mention. Twelve probes over a manifest and pages built in memory, so nothing here reads `docs/`. No browser, no built tree, well under a second.

The warnings say nothing when every page has an entry --- in a part, or in `left_out:` with a reason --- which is also all a check that had stopped working would say. Before they existed, whole sections dropped out of the PDF with nothing to report it: the IDE, Challenges and Videos, and Data Types, Enumerations and twinBASIC Additions with them.

Eight probes give each of the five findings a fault to report: a page with no entry, a page in the book and in `left_out:`, an entry of each kind that selects no page, and a landing or foreword URL that names none. The other four hold the opposite: a consistent manifest reports nothing, and the three pages the book carries without a selector naming them --- a chaptered part's landing, a foreword, and the book page itself --- are never reported. Dropping any one emission site from `bookCoverage()` fails most of the twelve at once, and the probe named after that site says which.

Exits 1 on any failed probe, 2 if it cannot run.

### check_symbol_index.mjs
{: #check-symbol-index }

    node scripts/check_symbol_index.mjs

Verifies the [symbol index](Building#the-symbol-index) still places each kind of symbol, and that its drift guard still refuses a URL the index has stopped publishing. Every probe is a fixture of its own --- a few lines of twinBASIC, a page or three, a scratch baseline file --- so it needs no built tree and no twinBASIC install, and never touches `builder/symbol-baseline.json`. Under a second.

A build that indexes the reference cleanly says nothing about the rules that did not fire on it, so each rule is asserted against the case that made it necessary. The `.twin` scanner's: a `Type` whose `Sub`s have bodies, an `Interface` line inside a `CoClass`, `[Hidden]` on a module whose members are global, a `$` name escaped in brackets. The derivation's: a member on a page of its own and under a heading, an inherited member found on its declaring type's page, a page filed under one module and declared in another, a `$` form, a `## Properties` heading on a type that has a `Properties` property, and the ellipsis the typographer puts in a Core page's heading. And the guard's: a lost anchor fails and is named, and CI never writes the list.

Exits 1 on any failed probe, 2 if it cannot run.

### check_axe_patch_equiv.mjs
{: #check-axe-patch-equiv }

    node scripts/check_axe_patch_equiv.mjs [--patch NAME]

Value-equivalence check for the vendored axe source patches. Builds the same colours under the stock and patched bundles and compares every derived value `color-contrast` consumes. This is the companion to the [fingerprint gate](#check-a11y-fingerprint), and both are needed: the fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification would sail straight through it. Run it before adopting a new `SOURCE_PATCHES` entry and after **every** axe-core upgrade --- the patches are pinned to the bundle's current text, and an upgrade needs this gate *and* the fingerprint gate, never one of the two. See [Upgrading axe-core](#upgrading-axe-core) for the sequence. Exits 0 equivalent, 1 a value differs, 2 harness error.

### check_a11y_fingerprint.mjs
{: #check-a11y-fingerprint }

    node scripts/check_a11y_fingerprint.mjs --list
    node scripts/check_a11y_fingerprint.mjs [--candidate <scheme>] [--baseline <scheme>]
                                            [--patches <name>] [--unminified]
                                            [--root-dir <path>] [--pages <list>]
                                            [--theme <t>] [--viewport <v>] [--json]

The gate for any change to *what the scan runs*. axe is the site's correctness oracle, which makes it dangerous to tune: a change can make axe see **less** and still report a clean pass. That nearly shipped once --- blocking `just-the-docs.js` looked like a 130 ms win and quietly dropped the colour-contrast node count on one page from 54 to 2. This runs the full page × theme × viewport matrix twice, once under each of two named schemes from `axe-scan.mjs`'s registry, against one build in one process, and diffs the findings audit by audit (violations by `ruleId:nodeCount`, incomplete by rule-id set).

Two limits worth knowing. It compares a candidate against a baseline produced by that same scheme's element set, so it **cannot** detect a change that stops auditing elements entirely --- anything touching viewport, visibility or request blocking has to be argued from source instead. And it compares *which* findings axe produces, never their shape, so a scheme that passes every audit can still crash the reporter. Necessary, not sufficient. Both `--baseline` and `--candidate` default to `production`, so a bare run is already that A/A control --- run it after touching the matrix.

#### Upgrading axe-core
{: #upgrading-axe-core }

`package.json` pins `axe-core` exactly --- no caret --- because the source patches are pinned to the bundle's current text and roughly fifty line citations in `builder/PLAN-axe-perf.md` are pinned to its current layout. A bump is therefore a deliberate act, and it needs **both** gates. Neither is implied by the other, and each needs Chromium and an up-to-date `_site-offline/`:

    node scripts/check_a11y_fingerprint.mjs --patches plain-color-fields
    node scripts/check_axe_patch_equiv.mjs

The first asks whether the patched bundle still *finds* what the stock one finds, across the full page × theme × viewport matrix. `--patches` is what makes it ask that. Without the flag each side runs its own scheme's patch list, and since every scheme inherits `DEFAULT_PATCHES` the two sides would share a bundle --- a no-op for this question. With it the flag overrides both: stock on the baseline, the named patches on the candidate. It also selects the unminified bundle for the patched side on its own, so `--unminified` is not part of this run.

Read that diff as **news, not as a regression to be suppressed.** axe ships new and revised WCAG rules between minors, so a bump can legitimately change what the scan reports. The gate exists to make the change visible, not to freeze coverage where it is.

The second asks whether the patched bundle still *computes* what the stock one computes, and it is the half a reader is most likely to skip --- `check.bat` and both CI workflows run it, so a bump that breaks it surfaces as a red PR rather than as something the upgrade asked for. It is not optional for a patch to the colour maths, because the fingerprint gate compares `incomplete` as a rule-id *set*: a colour error that shifted contrast ratios without flipping any pass/fail classification produces the same set and sails through. `--patch` defaults to `plain-color-fields`, the single entry `DEFAULT_PATCHES` carries; name another when adopting a new one.

A third failure mode needs no gate at all: each substitution inside a patch asserts its target was found, so a bump that moves the code fails loudly rather than silently reverting to the slow path. What none of the three reaches is a result that merely looks wrong. [`check_a11y.mjs --stock-axe`](#check-a11y) injects the unmodified bundle, which says in one command whether the patch is implicated.

### sweep_a11y.mjs
{: #sweep-a11y }

    node scripts/sweep_a11y.mjs [--theme <t>] [--viewport <v>] [--filter <substr>]
                                [--limit N] [--resume] [--report] [--out FILE]
                                [--root-dir DIR] [--stock-axe] [--recycle-every N]

The full-site accessibility sweep: every page, both themes, both viewports --- 3,476 audits, roughly 20 minutes. The thirteen-page sample exists because this is too slow for a commit gate, but the sample can only report on constructs it carries, and when the sample was six hand-picked pages this sweep found **six violation classes on 54 pages**, every one in a construct the sample could not see. Run it after any change that moves type metrics or page structure, and when adding a construct family to [`pick_a11y_sample.mjs`](#pick-a11y-sample). Note it audits every page with disclosures **closed** only; the open-state coverage is the sample scan's `STATE_AUDITS`.

### build_fonts.py
{: #build-fonts }

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

Regenerates the subset webfonts under `docs/assets/fonts/` from pinned upstream releases (SHA-256 verified), pinning the optical-size axis and keeping `wght` variable. Development tooling only: the `.woff2` files are committed like the generated DOT SVGs, and `build.bat` needs neither Python nor a network connection --- though the PDF pass aborts if one of the faces it needs is missing from the source tree, naming this script. **Regenerating Inter means regenerating the diagram metrics too** --- see below. Changing a face rather than refreshing one reaches well beyond this script; [Changing a typeface](Builder#changing-a-typeface) lists every place the build names one.

### build_dot_metrics.mjs
{: #build-dot-metrics }

    node scripts/build_dot_metrics.mjs            # regenerate
    node scripts/build_dot_metrics.mjs --check    # fail if stale

Measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, the table `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The widths are measured from the committed `.woff2` files rather than read out of the font binary, because the browser's shaped advance is the number the layout has to match. Development tooling; the JSON is committed and the build never runs the generator. Run it after [`build_fonts.py`](#build-fonts) touches Inter --- forgetting is not silent, but it surfaces as [`check_dot_fit.mjs`](#check-dot-fit) failing rather than as anything naming the metrics. It measures Inter by name, so giving the diagrams a different face means editing this script, not only rerunning it; see [Changing a typeface](Builder#changing-a-typeface).

### build_package_api.mjs
{: #build-package-api }

    node scripts/build_package_api.mjs            # regenerate
    node scripts/build_package_api.mjs --check    # fail if stale

Writes `builder/package-api.json`: every type the packages of a twinBASIC install declare, public or not, and the public members of each with their kinds. The [symbol index](Building#the-symbol-index) takes its entries from the pages and this file annotates them --- the kind of a member documented on a page of its own, an enumeration's values, the interface a CoClass's members are declared on --- and says which public symbols no page documents. Development tooling like [`build_dot_metrics.mjs`](#build-dot-metrics): the JSON is committed and the build never runs the generator, because running it needs a twinBASIC install, so it is Windows-only in the way [`census_attributes.mjs`](#census-attributes) is. Run it when the reference is re-indexed against a newer build, and commit the result with the pages.

It shares [`census_attributes.mjs`](#census-attributes)'s export and cache, and takes the same `--ide`, `--src`, `--cache` and `--refresh` flags; `--out` writes elsewhere. Packages are keyed by the name code uses for them --- the project name, which is not always the folder's: TwinBasicAssertions is `Assert`, and the three CEF builds are one `cefPackage`, whose APIs the tool checks are identical. Exits 0 when written or up to date, 1 when `--check` finds the file stale, and 2 when the install or an export cannot be read.

### convert_em_dash_separators.mjs
{: #convert-em-dash-separators }

    node scripts/convert_em_dash_separators.mjs            # rewrite in place
    node scripts/convert_em_dash_separators.mjs --check    # report, change nothing

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to the ASCII source forms markdown-it's typographer converts at build time (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips fenced code blocks and inline code spans, and preserves each file's existing line endings. `--check` reports what it would change and exits non-zero without writing, so it can serve as a gate.

### survey_tooling.mjs
{: #survey-tooling }

    node scripts/survey_tooling.mjs                  # the summary, then every listing
    node scripts/survey_tooling.mjs --summary        # the summary only
    node scripts/survey_tooling.mjs --root <dir>     # measure another checkout

Measures the repository's own tooling for repetition and structure: code duplicated between files, found token by token so that two copies differing only in names still match; top-level functions defined under one name in several files; how the command-line tools read their arguments; packages imported without being declared in `package.json`; and the import graph --- the imports that cross from one directory to another, the files nothing imports, and the most imported modules. `builder/PLAN-TOOLING-REVIEW.md` records its summary at the commit the tooling review started from, and the review's last phase runs it again to compare.

It is not a gate, and nothing runs it: take a measurement before and after a piece of refactoring. It reads only the files git tracks, so a scratch file never changes a number. `--root` measures another checkout, such as a worktree at an older commit that does not contain the script. `perf/` is measured, but it is counted separately in the summary and left out of the listings unless `--include-perf` is given. Exits 0, or 2 on a bad argument or a folder that is not a git checkout.

### compare_trees.mjs
{: #compare-trees }

    node scripts/compare_trees.mjs                      # HEAD against the working tree
    node scripts/compare_trees.mjs --before <ref>       # any commit against the working tree
    node scripts/compare_trees.mjs --keep               # leave both trees and both build logs
    node scripts/compare_trees.mjs -- --baseurl /docs   # extra tbdocs arguments, for both builds

Builds the site twice and compares the online, offline and PDF trees file by file, byte for byte: once at a commit, `HEAD` unless `--before` names another, and once from the working tree as a commit would hold it, untracked files included. It is the check for a change to `builder/` that should leave the output alone, and for one that should not, whose differences ought to be the intended ones and no others.

Both builds run from git worktrees under `.compare-trees/` at the repository root, which is gitignored, and neither touches the index or the working tree. Building the working tree in place would not do: under `core.autocrlf` a fresh checkout writes CRLF where files a tool has rewritten hold LF, and every file the build copies verbatim would then differ. Both builds run `tbdocs --no-fetch-assets` with `CI=1`, so the committed baselines are read and never written.

Three regions differ between any two builds and are replaced before the comparison: the build's own timings in `assets/images/gantt.svg`, the same chart inlined into the [Build Info](BuildInfo) page, and the PDF title page's build line, which holds the build date and the commit. Everything else must match. A run takes about ten seconds on the development box. It is not a gate, and nothing runs it. Exits 0 when the trees match, 1 when they differ, and 2 when the tool failed; a failed run leaves `.compare-trees/` for inspection, and the next run removes it.

### tbbuild.mjs
{: #tbbuild }

    node scripts/tbbuild.mjs <project.twinproj> [--ide <twinBASIC.exe>] [--port N]
                             [--arch win32|win64] [--timeout S] [--json] [--keep]
                             [--show|--hide]

Compiles a `.twinproj` and prints its diagnostics, with no IDE window to click through. This is how a claim the documentation makes about the language gets checked against the compiler rather than against memory: write a one-module project that uses the construct in the position you are asking about, run this, and read what comes back. Windows only, and no part of the site build.

twinBASIC has no command-line build. The compiler executable's whole surface is six verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- and none of them builds. The IDE executable does take `--buildAndExit32` and `--buildAndExit64`, and both are worse than useless unattended: they write nothing to stdout or stderr, exit 0 on a project the IDE flags, and do not exit at all when the build genuinely fails. So this drives the IDE. Its user interface is a WebView2 page and WebView2 honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so the IDE starts with a Chrome DevTools port and is driven over CDP. The diagnostics come from the IDE's own *copy compilation error report* walk with the clipboard write removed, so the text is exactly what that command gives a person.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` folder on `%USERPROFILE%\Desktop`, which is where the IDE's own zip says to unpack it. **No install path is hardcoded anywhere in this tooling** --- an install path contains a username --- so an install kept elsewhere needs one of those two. |
| `--port <n>` | DevTools port. Default 9333. It also names the WebView2 user-data folder and the private desktop, which is what makes concurrent instances possible. A port another IDE already holds --- another run's, or another session's --- is refused after ten seconds, rather than attached to. |
| `--arch <target>` | The target to compile for, `win32` or `win64`. Default `win32`. The diagnostics can differ between the two, because `#If Win64` and the size of `LongPtr` change what compiles. The target is set on every run, because the IDE opens a project in whatever target it last used for that project. Switching restarts the compiler, which then compiles the project again, so a switch adds a few seconds. When the target is not `win32`, or the IDE remembered another one for the project, the report starts with a `target:` line. |
| `--timeout <secs>` | Give up waiting for the compile to settle. Default 180. |
| `--json` | Emit one JSON object --- the target, counts, diagnostic rows, and the text of any alert the IDE opened, which is dismissed so the compile can go on --- instead of lines of text. |
| `--keep` | Leave the IDE running afterwards. The IDE's registry entries for the project are then left as they are, because the IDE is still writing them. |
| `--show` / `--hide` | Put the IDE on your own desktop where you can watch it, or on a private one where it cannot take focus. Hidden is the default unless `TBBUILD_SHOW` is set to something other than `0`, `false` or `no`; the two flags override that for one invocation. |

Exit codes: **0** clean, **1** the project has errors, **2** the harness failed, **3** the compile never settled, **4** the project crashes the compiler.

**It runs the IDE on a private Windows desktop, and that is not decoration.** The IDE calls `HostForceFocus()` from its own `window.onload`, so it takes the keyboard whatever window style it starts with --- `start /min` was tried and the window still came to the front. A process on another desktop has no foreground to take, and the compile does not care whether anything is on screen. Hidden by default has one real cost. A wedged IDE on a private desktop is invisible to the person debugging it, and the only way to see anything is to run it again visible. Export `TBBUILD_SHOW=1` for a session you are working through interactively, and leave it unset for unattended runs.

**One IDE handles one project.** Loading a second project into a running IDE wedges it, so a fresh IDE per project is the design rather than a convenience. It costs roughly 8 to 11 seconds each on a development box and is flat in project size, because what is being paid for is IDE startup and not compilation. Concurrency is the way to make a batch of probes fast: distinct `--port` values give distinct DevTools ports, user-data folders and desktops, so instances do not collide. Keep a question that might crash the compiler in a project of its own, so the answer is attributable and one bad probe cannot cost the rest of the batch its run.

**The IDE it starts ends with it.** The IDE runs inside a Windows job object, so when `tbbuild` ends --- finished, failed, or stopped with Ctrl+C --- every process the IDE started ends too. That includes a compiler the IDE was restarting after a crash, which a plain process-tree kill can miss and leave running. Two exceptions: under `--keep` the IDE runs outside the job and lives until you close it, and under `--show` it is started directly on your desktop, without the job.

**It leaves the IDE's own settings as it found them.** Every IDE it starts writes to the same registry keys as your own IDE: a saved state for the project (open tabs, watch expressions, Debug Console history), a place at the top of the recent-projects list, and, when the run switches the target, the target the IDE remembers for the project. Once the IDE has exited, `tbbuild` puts all three back. An entry the run created is deleted, and a project that already had one --- one of your own --- gets its old state, its old place in the list and its old target back. The `.twinproj` file association is restored too, if the IDE changed it. When [`check_examples.mjs`](#check-examples) runs `tbbuild`, `check_examples` does this once for all its lanes instead.

Four files under `scripts/lib/` belong to it and are never run directly. `tb-ide.mjs` holds the mechanics `tbbuild.mjs` and `tbrun.mjs` share: starting the IDE, attaching to it, waiting for the compile, and reading the diagnostics and the DEBUG CONSOLE. `tb-registry.mjs` records and restores the registry entries described above, through .NET's registry API by way of PowerShell, because `reg.exe` mangles any path holding a character outside the console code page; [`check_tb_registry.mjs`](#check-tb-registry) is its self-test. `tb-cdp.mjs` is a minimal CDP client over Node's global `WebSocket`, raw rather than puppeteer because a pending `alert()` blocks the renderer and puppeteer's `connect()` handshake talks to the renderer --- so it hangs on precisely the state you need to recover from. Every call it makes has a time limit, so a blocked page ends a run with a message rather than holding it forever. `tb-launch.ps1` holds the Win32 calls Node cannot make without a native FFI addon: `CreateDesktop` and `CreateProcess` with `STARTUPINFO.lpDesktop` for the private desktop, and the job object described above. It is the only PowerShell file under `scripts/`, and it is not executed as a file: `tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so the execution policy never comes into it and nobody has to be told to bypass one.

### tbrun.mjs
{: #tbrun }

    node scripts/tbrun.mjs <source-dir> [--port N] [--arch win32|win64] [--timeout S]
                           [--quiet MS] [--json] [--raw] [--keep] [--no-reap]
                           [--reap-images a,b] [--show|--hide]

Builds a probe project and captures what it writes to the IDE's
[Debug Console](../../tB/IDE/Project/DebugConsole). Where [`tbbuild.mjs`](#tbbuild) answers
*does this compile*, this answers *what does this print* --- the questions no shipped source
demonstrates and no amount of reading settles. The width of a `Debug.Print` print zone was
measured with it.

It takes an **exported source tree** (the folder holding `Sources/` and `Settings`), not a
`.twinproj`, because it has to adjust the project before packing it. It stages a copy and
leaves your tree untouched. The staging is in `scripts/lib/tb-project.mjs`.

The probe is an ordinary module with a [`[RunAfterBuild]`](../../tB/Core/Attributes#runafterbuild)
Sub, which the IDE runs once the exe is linked:

```tb check_build
Module ZoneProbe
    [RunAfterBuild]
    Sub ShowZones()
        Debug.Cls
        Debug.Print "0123456789012345678901234567890123456789"
        Debug.Print "A", "B"
    End Sub
End Module
```

**Begin the probe with `Debug.Cls`.** The Debug Console is also where the IDE writes its own
build log, and the linker writes there *after* the build, so a probe that does not clear it
first comes back interleaved with `[LINKER]` lines. The script warns when a probe omits it,
and warns again when there is no `[RunAfterBuild]` at all.

**A build that fails after a clean compile exits 2**, with the IDE's build log printed as the
reason. The probe never runs then, so the console still holds that log --- `[BUILD] failed`,
often after `[TYPELIB] failed to finalize typelibrary` --- and `tbrun` used to return it as the
probe's output, with exit 0. Run it again: both failures seen so far passed on a second run.

**The capture is complete however much a probe prints**, so there is no reason to keep one
short. `tbrun` reads the console's backing array rather than the pane, which is a virtualised
list view holding only the rows that fit --- reading that instead returns the last ten or so
lines of a long probe and looks no different from a full capture. `Debug.Cls` is what empties
the array, which is the other reason to begin with it.

**A `win64` probe runs in the IDE's 64-bit compiler.** A `[RunAfterBuild]` Sub runs inside
the compiler that built it, not in the file that was built. For `win64` that compiler is
`twinBASIC_win64_noDEP.exe`, a 64-bit process, so the probe sees what 64-bit code sees:
`LenB` of a `LongPtr` is 8, [**ProcessorArchitecture**](../../tB/Modules/Compilation/ProcessorArchitecture)
returns **vbArchWin64**, and `Environ$("PROCESSOR_ARCHITECTURE")` is `AMD64`. Under `win32`
they are 4, **vbArchWin32** and `x86`.

**Print a line whole when its characters matter.** Text that continues a line left open by
`Debug.Print ...;` comes back escaped: after `Debug.Print "A";`, a following
`Debug.Print "&"` shows in the Debug Console as `A&amp;`, and `tbrun` captures what the
console shows. The IDE does this, not the probe; `Debug.Print "A"; "&"`, in one statement,
comes back as `A&`.

| Flag | Effect |
|---|---|
| `--port <n>` | DevTools port for the IDE. Default 9346. Distinct ports let probes run concurrently --- the staging directory and the project id are keyed to it, so two runs never share a workspace. A port another IDE holds is refused, as for `tbbuild`. |
| `--arch <target>` | The target to build for, `win32` or `win64`. Default `win32`, set on every run, as for `tbbuild`. A `win64` probe runs as a 64-bit process. |
| `--timeout <secs>` | Give up waiting for console output. Default 120. |
| `--quiet <ms>` | How long the console must stop changing before the output counts as complete. Default 2500. There is no sentinel string to match, so any probe works without telling the script anything. Raise it well above the default for a probe that drives an out-of-process server, which can take longer than that to start. |
| `--raw` | Keep the console's timestamp column, which is otherwise stripped. |
| `--json` | One object with the path of the built file, the target, the captured lines, the IDE pid and anything reaped. |
| `--keep` | Leave the IDE running. Implies `--no-reap`, and leaves the IDE's registry entries for the probe as they are. |
| `--no-reap` | Do not harvest automation servers the probe left behind. |
| `--reap-images <a,b>` | Replace the harvested image list. Default is the Office suite. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild): your own desktop or a private one, with `TBBUILD_SHOW` setting the default. |

Exit codes: **0** captured output, **1** the project has compile errors (the diagnostics are
printed), **2** the harness failed or the build did after a clean compile, **3** nothing reached
the console before the timeout.

**A probe that activates a COM server can leak one per run.** `CreateObject("Excel.Application")`
is activated by DCOM, so the `EXCEL.EXE` that appears is a child of `svchost.exe` rather than
of anything the harness started --- no tree kill reaches it. Each activation is its own
process, so they accumulate, and calling `Quit` is not enough: the process exits only once
every COM reference has been released. `tbrun` therefore takes a process snapshot before it
starts the IDE and harvests what appeared afterwards, subject to three conditions --- the
process must be new, its image must be on the reap list, and it must have no window open.
Anything new and on the list but *windowed* is reported and left alone, because that is
indistinguishable from a copy the user opened. Two concurrent runs both driving Excel cannot
tell their servers apart, so whichever finishes first harvests both: pass `--no-reap` there
and sweep once at the end.

> [!IMPORTANT]
> The one trap worth knowing even if you never read the script: a project whose
> `project.buildPath` is still the default `${SourcePath}\Build\...` template opens a native
> *Save* dialog on build. Under `tbbuild` the IDE runs on a private desktop, so that dialog
> is invisible, takes no input, and the build silently never happens --- the WebView2
> renderer stays responsive throughout, so even a health check says the IDE is fine. `tbrun`
> pins the path to a folder of its own in its staged copy, which makes the trap unreachable.
> The file keeps the IDE's own name, *project name*`_`*target*`.`*extension* --- for
> example `ArchProbe_win64.exe` --- so the name says what was built.

Like `tbbuild`, it leaves the IDE's registry entries as it found them. Everything it opens is
in its own temp folder, so it deletes every entry under that folder once the IDE has exited,
and again at the start of a run, which removes what an earlier run on the same port left
behind. That includes the target the IDE remembers for each project, which a `win64` run
writes. **A probe builds for the target `--arch` names**, whatever the IDE remembers. Before
the option, a kept IDE switched to `win64` made every later run on the same port build 64-bit,
and nothing said so.

### addin_test.mjs
{: #addin-test }

    node scripts/addin_test.mjs [--only <regex>] [--port N] [--jobs N] [--timeout S]
                                [--ide <path>] [--show|--hide]

Runs the add-in scenarios under `test/addin/`. A scenario file is a `node:test` file, and
[`addin-test.bat`](#addin-testbat) is the way to run it; run on its own, a scenario skips
itself. Each file is one **lane**, listed in `test/addin/lanes.mjs`. It runs in a process of
its own, with its own DevTools port and work folder, and with a private copy of the twinBASIC
install, whose add-in folders hold only what the lane puts there. A test add-in therefore
never loads into your own IDE, and two lanes never share one. The scenario builds the add-ins
it tests into its copy, opens a project, and operates the IDE: it clicks, presses keys, types,
and reads the add-ins' tool windows, message boxes, notifications, the code editor and the
Debug Console. Two scenarios operate the IDE's own sample add-ins, Sample 10 and Sample 15
(Global Search), end to end. The others are probes, and take what they need from
`test/addin/probes/`. Two build add-ins of their own and check what the tbIDE pages say about
the IDE: which keyboard shortcuts fire, for the
[KeyboardShortcuts](../../tB/Packages/tbIDE/KeyboardShortcuts) page, and what a tool window
does with HTML and with a web page in an `iframe`, for the
[HtmlElement](../../tB/Packages/tbIDE/HtmlElement) page and its neighbours. The panes lane
serves the pages its frame shows from a server of its own on `localhost`. Three more answer
questions the planned help add-in rests on: what the compiler says about the name under the
cursor, which files the IDE's own web server serves from its `ide` folder, and which folders
the compiler loads add-ins from. The last three check what the [Add Ins](../../tB/IDE/AddIns/)
and [tbIDE package](../../tB/Packages/tbIDE/) pages say about loading: which folder each
build target loads, what a compiler restart does to a loaded add-in, and which entry-point
names the IDE accepts. They build add-ins for win64 as well as win32, restart the compiler,
and patch a built DLL's export name. The ten lanes take about two and a half minutes
together.

| Flag | Effect |
|---|---|
| `--only <regex>` | Run only the lanes whose name matches. A lane's name is its file's name without `.test.mjs`. |
| `--port <n>` | Base DevTools port. Default 9560; the lanes get *n*, *n*+1 and so on, and their work folders are keyed to their ports. A port another IDE holds is refused, as for `tbbuild`. |
| `--jobs <n>` | Lanes at once. Default 2. |
| `--timeout <secs>` | A lane still running after this long is ended and counted as failed. Default 600. |
| `--ide <path>` | The `twinBASIC.exe` to copy, found as for [`tbbuild.mjs`](#tbbuild). |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild). |

Exit codes: **0** every lane passed and the registry is as it was found, **1** a lane
failed, **2** the harness failed or could not put the registry back.

**It leaves the registry as it found it, and checks.** It puts back the IDE's own entries as
`tbbuild` does, and also the settings the add-ins under test save with `SaveSetting`. Those
are stored under `HKCU\Software\VB and VBA Program Settings\<name>`, which any installed copy
of the same add-in shares, so a lane names its add-ins' application names in `lanes.mjs`
(`settings`). They are recorded before the first lane starts, deleted before each lane that
names them, so that its add-ins start from their defaults, and put back at the end. Two lanes
that name the same one never run at once. Afterwards it confirms that no entry names a lane's
folder and that the settings are as found, and reports any new application key that no lane
named. Pressing Ctrl+C ends the lanes and still puts everything back.

**An add-in under test starts no browser.** Every IDE the harness starts, including those of
`tbbuild`, `tbrun` and `check_examples`, has the environment variable `TB_ADDIN_TEST` set to
`1`, and an add-in tested here is expected to check it. While it is set, the add-in prints
`open <url>` to the Debug Console instead of opening a page, and a scenario reads the line
there. A browser started on the harness's private desktop would open where nobody can see it
and keep running after the run.

**The add-ins you keep in `%APPDATA%\twinBASIC\addins` never load into a test IDE.** The
compiler loads the add-ins there as well as those in the install's own `addins` folders, but
it takes that folder from the IDE, which builds its path from the `APPDATA` environment
variable. Every IDE a lane starts has an `APPDATA` inside the lane's work folder, and a lane
fails if its IDE's add-in folder turns out to be anywhere else.

### check_tb_registry.mjs
{: #check-tb-registry }

    node scripts/check_tb_registry.mjs

The self-test for `scripts/lib/tb-registry.mjs`, the code that puts the IDE's registry
entries back after [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun),
[`addin_test.mjs`](#addin-test) and [`check_examples.mjs`](#check-examples). It plays out a
run on a scratch copy of the IDE's keys, under `HKCU\Software\tbharness-selftest`, and checks
that everything comes back: a project of yours that the run opened gets its saved state and
its place in the recent list back, the run's own entries go, the file association is
restored, and a second restore writes nothing. The recent list gets two more checks, because
the IDE changes it on its own while a run's projects are on it: it fills a short list's empty
slots with copies of the last entry, and a full list loses its oldest entry for each project
a run opens. The copies must go and the lost entries come back. The build targets the IDE remembers are checked the same way: those under
the run's folder go, and every other one stays, in its order and its exact text. So is the
rule that a file association pointing into the temp folder when a run began --- at another
run's private copy of the IDE --- is left as it is rather than put back. It also checks that
the module refuses to sweep outside the temp folder or restore a key near the root of the
registry. It deletes the scratch key when it ends.

It is not a gate and is not in `test.bat`, because it needs Windows and a real registry and
the CI runners have neither. Run it by hand after changing `tb-registry.mjs`. Exit code
**0** when every check holds, **1** when one does not.

### check_examples.mjs
{: #check-examples }

    node scripts/check_examples.mjs [--only <regex>] [--census] [--propose [--apply]]
                                    [--report <file>] [--jobs N] [--port N] [--batch N]
                                    [--ide <path>] [--keep] [--verbose] [--json]

Compiles the documentation's own code samples. A ` ```tb ` fence is something
[`check_code_regions.mjs`](#check-code-regions) protects the *contents* of and nothing ever
evaluates, so a sample that does not compile can ship and every gate stays green --- two
did. This is the tool that asks the compiler; [`examples.bat`](#examplesbat) is how it is
usually run, and [Authoring Pages](Authoring#checking-that-a-sample-compiles) is where a
sample opts in.

Each marked sample is generated into its own `Module tbx_<hash>`, packed with a template
project, and handed to [`tbbuild.mjs`](#tbbuild). A diagnostic comes back against a
generated file and a generated line; the report converts both, so what you read is the page
and the line in it:

    FAIL  docs/Reference/Core/Unload.md:24  (Reference/Core/Unload.md#1)
            does not compile (module, inferred, console)
            docs/Reference/Core/Unload.md:32: TB5134 duplicate definition [UserForm_Click]

**The shape of the sample decides what is generated around it.** A whole `Class` becomes a
file of its own; procedures and module-level declarations go inside the generated module;
loose statements go inside a `Private Sub` in it. That is inferred from the sample and
stated in the markup only when the inference is wrong, and the report names which slot was
used either way, so a misinference reads as a misinference rather than as a broken sample.

**Samples that belong to one program are grouped with `projname`**, and a group is compiled
as its own project with nothing else in it. Without that, a page presenting one program in
pieces passes only when its pieces happen to share a generated project --- which depends on
what else is being checked, so the same page can pass a full run and fail a `--only` one.
A group that is only half marked is reported as such, rather than as a missing symbol in
whichever sample used it --- and an `--only` that leaves part of a group out of a run says
so as well, because what that run reports about the rest of the group is not what a full run
reports.

| Flag | Effect |
|---|---|
| `--only <regex>` | Restrict to pages whose path matches. The path is page-relative, as in `^Reference/Core`. |
| `--census` | Classify every `tb` fence and print the table --- how many are whole files, procedures, statement runs, and how many are fragments no wrapper can rescue --- then the fences marked `inert` by reason, and finally the **undecided** ones: classifiable, unmarked, and not inert. That last number is the backlog; the inert count is not. No compiler, no IDE, well under a second. |
| `--propose` | Compile the unmarked samples too, and list the ones that would pass. A survey, so it exits 0 whatever it finds. It ends with the same grouping `--report` prints. |
| `--apply` | With `--propose`, add the marker to the fences that passed. It only ever adds the bare flag, only to a fence that compiled in that very run, and never to one that already carries markup --- so a re-run is a no-op. Read the diff. |
| `--report <file>` | Group the findings of a survey saved with `--propose --json`: by diagnostic, by section, by the name that did not resolve, by wrapper, and by page. No compiler --- the survey holds every page and line it names, so the slow run happens once and the grouping is what gets iterated on. |
| `--jobs <n>` | Concurrent IDE lanes. Default 4. Each lane has its own port, its own workspace and its own private desktop. |
| `--port <n>` | Base DevTools port. Default 9480; lane *n* uses base + *n*. |
| `--batch <n>` | Upper bound on samples per generated project. Default 120. The batcher packs fewer than this when there are lanes to fill. |
| `--ide <path>` | `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop. |
| `--keep` | Leave the generated projects on disk and print where. |
| `--verbose` | Report warnings as well as errors. Only errors ever fail the run. |
| `--json` | One object on stdout; every report line moves to stderr. |

Exit codes: **0** clean, **1** a sample does not compile, **2** the harness failed.

**Templates live in `test/example-projects/`**, one directory per template, each an exported
project tree --- a `Settings` file and a `Sources/` folder. `console` is the default;
`packages` references every package the IDE ships and is what a page under
`Reference/Built-In/` or a package tutorial gets without asking. A fence can name one with
`project=`.

Each template also carries a **stage set**: a module declaring the control instances the
samples assume, `Text1`, `ListView1`, `CefBrowser1` and the rest. A sample that says
`Text1.Text = "hi"` is form code-behind --- complete as documentation, because the reader
has a form with a `TextBox` on it, and impossible to compile alone, because the designer
rather than the code is what declares `Text1`. Declaring those instances lets the compiler
check what the sample actually asserts: that the member exists, that it takes those
arguments, that the types line up. The list is written out rather than inferred from
identifiers ending in a digit, which would also have declared `Var1`, `Arg1`, `Line2` and
`VBA7`.

**A sample can take the compiler down**, and one in this corpus does. twinBASIC runs the
compiler in the same process as user code, so in a batch of a hundred that costs the other
ninety-nine their result. `tbbuild` reports a crash as exit 4 and names the file the
compiler was parsing when it died. The sample that file belongs to is built on its own and
the rest of the batch without it, so a crash usually costs two extra builds. When no sample
is named, the batch is split in half repeatedly until the offending sample is alone, which
is O(log n) extra builds. A crash can also need several samples at once, so that no part of
the batch crashes by itself. The samples it needs are then searched for as a set, and all
of them are reported. The cost is paid only on failure. The finding names the sample, or
the set, and points at `BUGS-TO-REPORT.md`.

**A sample can be compiled against a file.** A fence carrying `resource=<project-relative
path>` --- in any language, typically ` ```json ` --- is written into the generated project at
that path instead of being compiled, and travels with its page the way a `hidden` fence
does. It exists for the compile-time attributes that read a project file:
`[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", …)]` fills an **Enum**'s
members from that JSON while compiling, so the members the page's other samples name are
checked against the file the page shows. The path may not escape the project --- no `..`, no
drive letter, no UNC --- and a refused path is a finding rather than a write.

**A diagnostic can also land outside every sample**, inside a referenced package's own
source. A generic instantiated with a type the project does not have is the case to know: the
error is reported against the generic's own type parameter, in the package's file, and the
sample that provoked it can have no diagnostic of its own at all. Such a sample used to be
counted as compiling while the run failed with a row naming no page. The same splitting
isolates it, after one build of the template with nothing in it decides whether the row is
the template's own rather than any sample's. A split never cuts a `projname` group in half,
and never separates a page's `hidden` context from the samples that need it.

Two files under `scripts/lib/` belong to it. `tb-fences.mjs` is the half that needs no
compiler --- fence extraction, the markup, and the classifier --- and is where a new key or
a new slot goes. `tb-install.mjs` finds the IDE and the compiler beside it, and is shared
with the two IDE-driving tools so the three cannot come to disagree about where an install
is.

### gen_attribute_probes.mjs
{: #gen-attribute-probes }

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Generates twinBASIC probe projects from the `Applicable to:` lines in `Reference/Attributes.md`, for [`tbbuild.mjs`](#tbbuild) to compile. Those lines had gone unchecked against the compiler since they were written, and the one that was eventually checked turned out to be wrong. This writes one source file per claimed target, so a single build answers every claim at once. A misplaced attribute comes back as `This attribute is not supported in this context` (TB5155) or `Syntax error.  No handler for this symbol` (TB5182). Which of the two arrives says nothing about whether the attribute exists, only that it is not accepted there.

Up to three trees come out, on two contracts that must not be mixed:

| Tree | Contract |
|---|---|
| `<out_dir>` | `AttributeProbes` --- every probe is expected to compile, so a diagnostic naming a probe module is a documentation defect. |
| `<out_dir>-2` | `AttributeProbes2` --- the same contract, for targets that cannot share a project (one `[RunAfterBuild]` per project). |
| `<out_dir>-explore` | `AttributeExplore` --- **a diagnostic is the answer.** Questions the page cannot settle; each source file carries its own header saying how to read its result. |

Keeping the two contracts in separate projects is what makes either build readable: red in `AttributeProbes` is a defect, red in `AttributeExplore` is a result.

It also writes a key naming the `Attributes.md` line each probe came from, beside the tree rather than inside it --- anything inside gets packed into the `.twinproj` and turns up as a stray project file. Pack a tree into a project with the compiler's own `import` verb before building it:

    twinBASIC_win32.exe import AttributeProbes.twinproj <out_dir> --overwrite

**That command's exit code is `0` after every failure it reports**, so a script that packs a tree and then builds it will happily compile the previous `.twinproj`. The one failure it does not report --- a tree holding an embedded package --- exits `999`. Test the last line of its output for `... DONE` instead; [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) has the caveat in full and a batch-file form of the test. The standalone [`impexp.mjs`](#impexp) takes the same command, and its exit code does say whether it worked. Re-run the generator after editing `Attributes.md`. Exits 0, or 2 with usage when given no output directory.

### census_attributes.mjs
{: #census-attributes }

    node scripts/census_attributes.mjs [--ide <install>] [--src <dir>] [--cache <dir>]
                                       [--refresh] [--samples] [--attr <name>]
                                       [--json] [--out <file>] [--dump-sites <file>] [--quiet]

Reports, for every attribute the twinBASIC packages use, **which enclosing construct and which kind of declaration it decorates**. It exports each package of an IDE install with the compiler's own `export` verb, scans the `.twin` sources, and writes a Markdown or JSON report. No arguments are needed: it finds the newest `twinBASIC_IDE_BETA_*` the same way [`tbbuild.mjs`](#tbbuild) does, caches the export under the build number, and reuses it on later runs. It is not part of the site build and nothing calls it during one.

Against BETA 983 that is 661 files, 9,701 attribute sites and 55 distinct attributes.

**A census is evidence, not applicability.** It says where an attribute *is* used, never where it *may* be used, and the two differ in both directions. The packages contain no use of `[Hidden]` on a whole **Class**, yet the compiler accepts one; they contain many on **Class** and **Interface** members, and the compiler refuses the same attribute on the **Interface** lines inside a **CoClass**. Neither fact is reachable from the other tool, so pair this with [`gen_attribute_probes.mjs`](#gen-attribute-probes) and [`tbbuild.mjs`](#tbbuild), which ask the compiler directly.

Grouping is by enclosing construct *and* declaration keyword, because the keyword alone misleads. An earlier hand-written census of `[RedirectToStaticImplementation]` grouped its 82 uses by keyword, reported "a Property Get, a Function and a Sub", and produced the claim *procedure in a Class* --- which the compiler rejected with TB5155, because every one of those uses is inside an **Interface**.

| Flag | Effect |
|---|---|
| `--ide <install>` | The install root to census. Defaults to `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_*` on the Desktop. |
| `--src <dir>` | Census an already-exported tree and skip the export entirely. |
| `--cache <dir>` | Where exports are kept. Defaults to a per-build folder under the system temp directory. |
| `--refresh` | Re-export even when the cache already holds this build. |
| `--samples` | Also census `projects/` and `addins/`, not only `packages/`. |
| `--attr <name>` | Report one attribute in detail instead of the whole table. |
| `--dump-sites <file>` | Write every raw site as JSON --- which file and line produced each row. |
| `--json` | Emit JSON instead of Markdown. |
| `--out <file>` | Write to a file instead of standard output. |

The report ends with what the scanner could not resolve, and **that section is expected to be empty**. A census that quietly buckets its own confusion publishes a wrong number with nothing to notice it by, so an unresolved site is reported as a scanner bug rather than absorbed. Reaching zero took handling several things this corpus does that a simpler sweep gets wrong: attributes spanning lines (`[Description("..." & vbCrLf & _` accounts for 3.8% of all attribute lines), comma-separated lists, arguments containing commas, escaped identifiers that look exactly like attributes (`[_HiddenModule].Foo`, and Enum members genuinely named `[A4 Portrait]`), comments in four different positions, and block-tracking traps such as a UDT field called `Type As Long` or a module named `[_HiddenModule]`. Exits 0 once a report is produced, or 2 if no install or source tree can be found.

### impexp.mjs and impexp.py
{: #impexp }

    node scripts/impexp.mjs export <project> <folder> [--overwrite]
    node scripts/impexp.mjs import <project> <folder> [--overwrite]
    node scripts/impexp.mjs settings|licence|changelog|readme <project>
    node scripts/impexp.mjs --self-test

Standalone `.twinproj` / `.twinpack` unpacker and packer, with the compiler executable's own command line: the same six commands, the project file first, and `--overwrite` required to replace anything. `scripts/impexp.py` is the same tool, run as `python scripts/impexp.py ...`; the two editions print the same output and write byte-identical project files. Neither has dependencies; the Node edition needs Node 18+, the Python edition Python 3.6+. The exit code says what happened --- `0` done, `3` refused to overwrite, `6` done with a warning, and four more --- so a caller need not read the output; [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) has the table. `--self-test` needs nothing but the script, and adds a round trip of `indexer/sample.twinpack` when run from this repository.

**Neither is build tooling.** They are published downloads: `_config.yml`'s `bundle_extra` copies both into `Features/Packages/downloads/`, and [Import/Export Tool](../../Features/Packages/Import-Export-Tool) offers them to readers as the two editions of one tool. That is why `impexp.py` is one of only two `.py` files in a repository whose tooling is otherwise all Node --- porting it would delete a deliberate offering rather than tidy anything up. The `bundle_extra` exemption is by exact path, so moving either file breaks the download; see [`check_publish_policy.mjs`](#check-publish-policy).

### render-book.mjs
{: #bookrender-bookmjs }

    node book/render-book.mjs <input.html> -o <output.pdf> [options]

The PDF renderer that `book.bat` calls. It is a generic HTML-to-PDF converter: it takes the pre-built `_site-pdf/book.html` as its sole document input and has no knowledge of `_data/book.yml` --- all chapter structure, heading levels, and outline entries are already embedded in the HTML by `tbdocs` Phase 8. Uses `puppeteer` + `paged.js` + `pdf-lib` directly, so it controls `pdf-lib`'s `parseSpeed` (the default yields the event loop between every 100 objects on load, adding ~32 seconds to a 100-second build for no reason in Node --- see [perf/README.md](https://github.com/twinbasic/documentation/blob/main/perf/README.md) for the diagnosis). Replaces an earlier `npx pagedjs-cli ...` invocation.

Key options used by `book.bat`:

| Flag | Effect |
|---|---|
| `-o <output.pdf>` | Output PDF path. |
| `--outline-tags h1,h2,h3,h4` | Heading levels to include in the PDF outline / bookmarks. |
| `--additional-script <path>` | Path to a script injected before paged.js runs. `book.bat` passes `perf\detach-pages.js`, which hides each finalised page from Chromium's layout tree and restores them all before `page.pdf()` runs, dropping render time from ~104s to ~51s on a 1,638-page book by sidestepping paged.js's quadratic overflow walker. |

## Configuration files

The build pipeline also reads a handful of declarative files. They are not executable but the build's behaviour depends on them.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `exclude` (which filters the source walk but is **not** the publish safety net --- see [`check_publish_policy.mjs`](#check-publish-policy)), the footer / aux-link knobs, the GitHub edit-link knobs, and the download-link knobs (`gh_offline_link`, `gh_offline_link_url`, `gh_pdf_link_url`). Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block) are ignored. |
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Its `left_out:` list names the pages deliberately not in the book, each with a `reason:`; the build warns about a page that is in neither. Full schema is documented in the file header. Phase 2 resolves chapter arrays; Phase 8 assembles `book.html`. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that determines both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
