---
title: Tools and Scripts
parent: Documentation Development
nav_order: 4
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

One-line-per-tool reference for every executable in the documentation repository: the five Windows batch wrappers at the repository root, the cross-platform Node and Python scripts under `scripts/`, the `tbdocs` orchestrator and its CLI flags, and the PDF render driver. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper.

* TOC goes here
{:toc}
## Batch wrappers at the repository root
{: #batch-wrappers }

All five sit at the repository root, beside `package.json` --- not under `docs/`. Each uses `@pushd "%~dp0"` to run from that root regardless of where it is invoked from, and each entry below gives the POSIX equivalent of what it runs. Those equivalents have no `pushd` in front of them, so **run them from the repository root** --- `tbdocs`'s `--src docs`, [`check_publish_policy.mjs`](#check-publish-policy)'s default source root, and every path handed to [`render-book.mjs`](#bookrender-bookmjs) are all resolved against the working directory. Nothing else in the repository is Windows-specific: `tbdocs` and all nine gates are Node scripts, and CI runs every one of them on `ubuntu-latest` except [`check_tree_fresh.mjs`](#check-tree-fresh), which guards against a failure mode CI cannot have.

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

Starts a long-lived dev process. Wraps `node builder/tbdocs.mjs --src docs --serve` and forwards extra arguments through `%*`. After an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each change, and a browser connected to the page auto-reloads via SSE on each successful rebuild. Offline and PDF passes are skipped each rebuild. Ctrl+C exits cleanly. **Only failures (4xx, 5xx, server exceptions) are logged** --- successful requests are silent.

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

The tests the toolchain has to pass. Five steps, each stopping the run if it fails:

1. [`scripts/check_publish_policy.mjs`](#check-publish-policy) --- verifies the publish allowlist still refuses the types it is meant to. Needs neither a browser nor a built tree, so it goes first.
2. [`scripts/check_regex_safety.mjs`](#check-regex-safety) --- refuses a regex literal that can backtrack exponentially.
3. [`scripts/check_code_regions.mjs`](#check-code-regions) --- verifies no pre-render rewrite alters the contents of a code fence or code span.
4. [`scripts/check_page_baseline.mjs`](#check-page-baseline) --- verifies the page-count drift guard still refuses a fall.
5. [`scripts/check_axe_patch_equiv.mjs`](#check-axe-patch-equiv) --- verifies the vendored axe source patch still produces identical colour values.

POSIX:

    node scripts/check_publish_policy.mjs \
      && node scripts/check_regex_safety.mjs \
      && node scripts/check_code_regions.mjs \
      && node scripts/check_page_baseline.mjs \
      && node scripts/check_axe_patch_equiv.mjs

**None of the five reads a page of documentation**, so an edit confined to `docs/` cannot change any of their outcomes --- which is why they are separate from `check.bat`. Run this one when the change touches `builder/`, `scripts/`, `book/`, `eval/` or `wisdom/`. Both CI workflows run all five unconditionally, as they always did, so skipping it locally cannot let a tooling regression reach `staging`.

The split is by what a gate **interrogates**, not by what it happens to open. `check_axe_patch_equiv.mjs` loads a built page, so it does want `build.bat` to have run and it does want Chromium --- but only because its probe needs some document to run inside; what it tests is the axe patch. The test for where a new gate belongs is whether it would still mean something against an empty `docs/`.

### book.bat

    book.bat

POSIX:

    mkdir -p docs/_pdf
    node book/render-book.mjs docs/_site-pdf/book.html \
      -o "docs/_pdf/twinBASIC Book.pdf" \
      --outline-tags h1,h2,h3,h4 \
      --additional-script perf/detach-pages.js

Renders the PDF book from `docs\_site-pdf\book.html` into `docs\_pdf\twinBASIC Book.pdf`. Calls `node book\render-book.mjs` (see [below](#bookrender-bookmjs)). Requires `build.bat` to have populated `_site-pdf/` and a Chromium install from `npx puppeteer browsers install chrome`. The first invocation auto-runs `npm install` if `puppeteer` is missing. The output filename is set by the `-o` argument here; to rename the PDF, update it in `book.bat` and in `.github/workflows/tbdocs-gh-pages.yml`.

The `mkdir` is not housekeeping. `render-book.mjs` writes the PDF with a plain file write and never creates the directory above it, so a missing `docs/_pdf/` fails with `ENOENT` at the very end of the render, after the whole page-breaking pass has already run. `book.bat` and the deploy workflow both create it first, for that reason.

Two of `book.bat`'s own steps have no equivalent in those commands. It checks that `docs\_site-pdf\book.html` exists and names `build.bat` as the fix, where `render-book.mjs` refuses a missing input with `input not found:` and the resolved path and nothing else; and it runs `npm install` itself when `node_modules\puppeteer` is absent, which the bare invocation will not --- run `npm ci` first if the renderer cannot find puppeteer.

**Do not chain the two as `build.bat && book.bat`.** `build.bat` sets a non-zero exit code when the link or integrity check finds something, and still writes all three trees --- the finding is a report, not an abort. `&&` reads only the exit code, so a broken link anywhere on the site cancels the render, for a reason that has nothing to do with the book. The terminal ends on the link findings and no PDF, which reads as a render that failed rather than as one that never started. Run them as two separate commands; see [Building and Deployment](Building#the-double-ampersand-trap).

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
                            [--update-page-baseline]
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
| `--check-remote-assets` | Flag any `<img>` whose `src` points off-box (`http://`, `https://`, or protocol-relative `//host`). Remote images cost a network round trip per view, break the offline mirror, and abort the PDF book render --- the forked paged.js raises an error on an image that has not finished loading. The remedy depends on the host. A `https://github.com/user-attachments/assets/...` URL needs no edit: the next local build downloads it to `docs/assets/attachments/` and renders that copy instead, so commit the downloaded file alongside the page. Any other host has no such handling --- download the image yourself and commit it under the section's `Images/` folder. See [Authoring Pages](Authoring#images). |
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

### scripts/pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads thirteen pages out of ~1,160, so the page list decides what it can report at all --- and a list that stops being representative fails silently: the rule for a construct no sample page carries simply never runs, and the gate stays green.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on. `--check` (the default, and what `check.bat` and both CI workflows run) verifies every family the site uses is covered by at least one sample page, and exits 1 naming the gaps and the cheapest page that would close each. `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list. `--census` reports what each family is, how many pages use it, and which page uses it most.

When the docs start using a construct they have not used before, add a family for it. Leaving it out is not neutral --- it means the rule for that construct runs nowhere.

### scripts/check_links_diff.mjs
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
| `book` | `_site-pdf/book.html` --- fragments only, `--no-fail` | yes |
| `basepath` | a tree built with `--baseurl`, checked with the matching `--base-path` | yes |
| `fixture` | a synthetic tree written at run time, carrying one fault of every kind | no |
| `fixture-built` | `test/fixtures/check-src` built by `tbdocs` --- the online tree | yes |
| `fixture-built-offline` | the same build's offline tree, the only one with a forbidden prefix | yes |

That last column is the part worth reading before trusting a green run. Under `--b fused` the two cases with no fused equivalent are skipped --- named in a `skipped:` line, not silently --- because the build's pass checks what the build produced and has nothing to say about a `--root-dir` shape variation or a hand-written tree it never wrote. The real-tree cases are empty in nearly every category on a healthy site, so for as long as `fixture` was the only fault-carrying case, **every `--b fused` run dropped the one case that gave the comparison anything to compare.** The built pair closes that: the same idea in a tree `tbdocs` produced, split across two cases because no single tree carries all nine categories --- the online tree has the sitemap, search and canonical checks, and the offline tree is the only one with a forbidden prefix.

Both CI workflows run the harness, and neither runs it over the real site. `checks.yml` (pull requests) runs both halves:

    node scripts/check_links_diff.mjs --case fixture --a script --b index
    node scripts/check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused

`tbdocs-gh-pages.yml` (deploy) keeps only the first: ~0.3 s over a synthetic tree, enough that the reference implementation cannot rot unnoticed, while the extra three-page build stays on the PR gate. What is in neither, and deliberately not in `check.bat` either, is the full `--a script --b fused` over the real trees --- it builds the site itself so both sides read the same bytes, and the script side then costs a few seconds, which is the entire saving of having folded the check into the build. Run that one by hand after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`.

`--self-test` is the guard on the guard. It runs `check_links.mjs`'s own regression guards --- since `b97c75f` nothing else does --- and then diffs the reference implementation against a deliberately corrupted copy, failing unless the difference is reported. Everything else the harness prints reduces to *the two sides agreed*, which is also what a harness comparing nothing says.

The fixtures have their own document, and it is the one to read before editing them: [`test/README.md`](https://github.com/twinbasic/documentation/blob/main/test/README.md) covers what each page under `check-src/` is there to provoke, and the hard-coded per-category counts (`FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE`, `FIXTURE_BUILT_OFFLINE`) that are asserted after every run, so a fixture that stops provoking a category fails loudly instead of quietly returning to empty-against-empty. It also covers the hazard that catches people out: **the fixture is built by the real `tbdocs`, so a template change can turn this gate red without anyone touching the fixture or the checker.** Adding the self-hosted fonts put two `<link rel="preload">` tags on every page, `check-src/` had no `assets/fonts/`, and its `broken` count went from 3 to 9. The fix for that shape of failure is to add the stub asset the template now expects --- never to raise the expected count, which dilutes a category the fixture exists to hold at an exact number.

### scripts/lib/axe-scan.mjs
{: #axe-scan }

Not a command --- the shared module that **defines** the accessibility scan, imported by [`check_a11y.mjs`](#check-a11y), [`sweep_a11y.mjs`](#sweep-a11y) and [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint). It holds `SAMPLE_PAGES`, `THEMES`, `VIEWPORTS`, `STATE_AUDITS`, `BLOCKED_REQUESTS`, `AXE_RUN_OPTIONS`, `SOURCE_PATCHES` and the `SCHEMES` registry, plus the `runMatrix` / `buildMatrix` drivers. Any change to *what the scan runs* belongs here and must go through the [fingerprint gate](#check-a11y-fingerprint) first.

`STATE_AUDITS` deserves a note: a closed `<details>` subtree is `notRendered`, so axe never walks it. Entries here are layered onto the page × theme × viewport matrix and apply a DOM mutation from `PAGE_STATES` before the audit, which is how the section-links disclosure gets audited open as well as closed. **Every `PAGE_STATES` function must assert it found what it expected** --- a state that silently does nothing degrades into a second audit of the default page: slower, still green, covering nothing.

### scripts/check_publish_policy.mjs
{: #check-publish-policy }

    node scripts/check_publish_policy.mjs [--src <path>]

The gate on the publish allowlist. Everything under `docs/` that is not a page is copied into the published site verbatim, so the source tree's shape is the site's shape --- [`builder/publish-policy.mjs`](Builder#module-map) is the list of types that may be published, enforced inside the build at the source inventory and again at each output tree's inventory. A finding there aborts the build rather than setting an exit code: a broken link still leaves a tree worth inspecting, a tree with a private key in it does not.

A clean build only says **nothing in `docs/` is currently refused**, which is also what an allowlist widened until it refuses nothing would say, and no build over a clean tree can distinguish the two. So this asserts the other half: thirteen named probes that must stay refused (a `.bak`, a `.pem`, a `.docx`, a `.twin`, a `secrets.json`, a `Thumbs.db`, a frontmatter-less `.md`, an extensionless `LICENSE`, a dotfile), six that must keep publishing (`.png`, `.PNG`, `.woff2`, `.txt`, `.html`, `CNAME`), that `bundle_extra` exemptions stay scoped to the exact declared path rather than blessing the extension everywhere, and that `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` stay disjoint --- folding the two together would pass every other assertion here while quietly making a stray `docs/secrets.json` publishable.

It also checks that the refusal *message* for a `.md` still names a fault that can happen, which is a narrower thing than it sounds. The message tells the reader the opening `---` must be the first line, and that is the right advice only because the two causes that come to mind first are handled elsewhere: a UTF-8 BOM is stripped before parsing, and malformed YAML aborts with its own error. An earlier draft named the BOM and would have sent every reader hunting for something that cannot occur, so all three behaviours are now asserted against real files --- nothing else in the repository covers them.

No browser, no built tree, ~40 ms, which is why it is `test.bat`'s first step. Run it after touching `builder/publish-policy.mjs`. Exits 1 naming each failed assertion.

### scripts/check_tree_fresh.mjs
{: #check-tree-fresh }

    node scripts/check_tree_fresh.mjs [--tree DIR] [--source DIR ...]

`check.bat`'s first gate. Refuses a built tree older than the sources that produced it, by comparing the newest mtime under the source tree against the built tree's `index.html`. Without it, editing a page and running `check.bat` without rebuilding audits the *previous* build and passes --- a green run that says nothing about the change just made. CI never hits this because it builds in the same job; a development box hits it whenever the two commands run out of order. Exits 0 when the tree is current, 1 when stale (naming `build.bat`), 2 when the tree is absent.

### scripts/check_dot_fit.mjs
{: #check-dot-fit }

    node scripts/check_dot_fit.mjs [--verbose]

Renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Graphviz lays out boxes from a width table while the browser paints text with an actual font --- two measurements of the same string that nothing inside the build compares. When they disagree the SVG is still well-formed and the build still green; the only symptom is a label hanging past its edge. Twenty-seven labels across three diagrams shipped that way, on pages that had passed the full accessibility sweep, because axe does not evaluate SVG `<text>` geometry either. `builder/dot-metrics.mjs` fixed the cause; this proves it stayed fixed. Needs a browser, which is why it lives in `check.bat` rather than the build. Run it after touching any `.dot`, `builder/dot-metrics.mjs`, or `builder/inter-metrics.json`.

### scripts/check_regex_safety.mjs
{: #check-regex-safety }

    node scripts/check_regex_safety.mjs [--census] [--self-test]

Refuses a regex literal that can backtrack exponentially. Parses every `.mjs` under `builder/`, `scripts/`, `book/`, `eval/` and `wisdom/` with acorn, extracts the regex literals, and classifies each with [recheck](https://makenowjust-labs.github.io/recheck/). No browser, no built tree, a few seconds.

**An exponential regex does not fail a build, it stops one.** The corpus passes for as long as no page happens to contain the trigger; then a worker sits inside `String.replace` and never returns, the build prints its last line, and nothing times out. That is not hypothetical --- `VOID_TAGS_RE` in `builder/render.mjs` shipped that way, and the two alt strings that triggered it (`Line/Column`, `/Packages/WinDevLib`) are ordinary English. This gate asks the question of the regex rather than waiting for content to ask it. When it first ran it found a second exponential regex in the same file that nobody knew about, and then found that the first attempt at fixing `VOID_TAGS_RE` was still exponential on a subtler input.

It gates on **exponential only**. recheck also reports polynomial blowup, and about 40 of this repository's ~178 literals are polynomial --- nearly all the ordinary `<tag[^>]*>` shape on bounded input. Failing those would mean 40 findings on day one, and a gate that fails on day one gets switched off.

The self-test probes run inside the normal pass rather than behind `--self-test`: eight regexes with known answers in both directions, including the three this repository actually shipped. A green line saying *no exponential regex* is otherwise indistinguishable from a gate that has stopped detecting them. `--census` lists every literal by classification, plus a count of runtime `new RegExp(...)` constructions, which the scan cannot see.

Exits 1 on an exponential finding, on a file that would not parse, or on a probe that came back wrong.

### scripts/check_code_regions.mjs
{: #check-code-regions }

    node scripts/check_code_regions.mjs [--verbose] [--self-test]

Verifies that no pre-render rewrite in `builder/render.mjs` alters the contents of a code fence, an indented code block or an inline code span. Tokenises every markdown file under `docs/`, applies the real rewrite chain, re-tokenises, and compares the code regions in order. No browser, no built tree, a couple of seconds.

Those rewrites run over **raw markdown**, before markdown-it has parsed anything, so none of them can tell prose from code --- and this site's subject matter is code. Four defects of exactly that shape shipped: a language reference printed its `If` / `ElseIf` / `Else` bodies flush left, a page lost the blank line between two examples, a link's argument list was percent-encoded inside a fence, and a YAML sample's closing `---` was deleted outright. **No other gate can see any of it**, because the damage sits inside `<code>` and the link, integrity, publish and accessibility checks all pass over it.

Seven probes ride along in the normal run, each a defect this repository actually shipped. The corpus is clean, so a sweep that finds nothing is otherwise indistinguishable from a gate that has stopped detecting. It imports the rewrite chain rather than reconstructing it, which is what makes removing the code mask from one rewrite change what the gate runs.

Exits 1 when a code region differs.

### scripts/check_page_baseline.mjs
{: #check-page-baseline }

    node scripts/check_page_baseline.mjs

Verifies the [page-count drift guard](Building#the-page-count-drift-guard) still refuses what it exists to refuse. Eleven probes against a scratch baseline file in the system temp directory, so nothing here touches `builder/page-baseline.json`. No browser, no built tree, well under a second.

The guard says nothing on a healthy tree, so every ordinary build sounds exactly like one whose guard has stopped working --- which is the whole reason this exists. The first probe replays the defect that motivated the guard: 37 pages of the AppGlobalClassObject package lost to a blanket `exclude:` rule, under a guard that knew only a floor of 836 against a real 908. Reverting the guard to that floor fails three of the eleven.

Two probes look redundant and are the two that caught real bugs while the guard was being written. A **foreign source root must be ignored**: [`check_links_diff.mjs`](#check-links-diff) builds a three-page fixture tree, and a baseline keyed to nothing met it with *905 pages missing*. And **CI must refuse a missing baseline** rather than create one, because a run that wrote the file would record whatever drop it had been asked to catch.

Exits 1 on any failed probe.

### scripts/check_axe_patch_equiv.mjs
{: #check-axe-patch-equiv }

    node scripts/check_axe_patch_equiv.mjs [--patch NAME]

Value-equivalence check for the vendored axe source patches. Builds the same colours under the stock and patched bundles and compares every derived value `color-contrast` consumes. This is the companion to the [fingerprint gate](#check-a11y-fingerprint), and both are needed: the fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification would sail straight through it. Run it before adopting a new `SOURCE_PATCHES` entry and after **every** axe-core upgrade --- the patches are pinned to the bundle's current text, and an upgrade needs this gate *and* the fingerprint gate, never one of the two. See [Upgrading axe-core](#upgrading-axe-core) for the sequence. Exits 0 equivalent, 1 a value differs, 2 harness error.

### scripts/check_a11y_fingerprint.mjs
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

### scripts/sweep_a11y.mjs
{: #sweep-a11y }

    node scripts/sweep_a11y.mjs [--theme <t>] [--viewport <v>] [--filter <substr>]
                                [--limit N] [--resume] [--report] [--out FILE]
                                [--root-dir DIR] [--stock-axe] [--recycle-every N]

The full-site accessibility sweep: every page, both themes, both viewports --- 3,476 audits, roughly 20 minutes. The thirteen-page sample exists because this is too slow for a commit gate, but the sample can only report on constructs it carries, and when the sample was six hand-picked pages this sweep found **six violation classes on 54 pages**, every one in a construct the sample could not see. Run it after any change that moves type metrics or page structure, and when adding a construct family to [`pick_a11y_sample.mjs`](#pick-a11y-sample). Note it audits every page with disclosures **closed** only; the open-state coverage is the sample scan's `STATE_AUDITS`.

### scripts/build_fonts.py
{: #build-fonts }

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

Regenerates the subset webfonts under `docs/assets/fonts/` from pinned upstream releases (SHA-256 verified), pinning the optical-size axis and keeping `wght` variable. Development tooling only: the `.woff2` files are committed like the generated DOT SVGs, and `build.bat` needs neither Python nor a network connection --- though the PDF pass aborts if one of the faces it needs is missing from the source tree, naming this script. **Regenerating Inter means regenerating the diagram metrics too** --- see below.

### scripts/build_dot_metrics.mjs
{: #build-dot-metrics }

    node scripts/build_dot_metrics.mjs            # regenerate
    node scripts/build_dot_metrics.mjs --check    # fail if stale

Measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, the table `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The widths are measured from the committed `.woff2` files rather than read out of the font binary, because the browser's shaped advance is the number the layout has to match. Development tooling; the JSON is committed and the build never runs the generator. Run it after [`build_fonts.py`](#build-fonts) touches Inter --- forgetting is not silent, but it surfaces as [`check_dot_fit.mjs`](#check-dot-fit) failing rather than as anything naming the metrics.

### scripts/convert_em_dash_separators.mjs
{: #convert-em-dash-separators }

    node scripts/convert_em_dash_separators.mjs            # rewrite in place
    node scripts/convert_em_dash_separators.mjs --check    # report, change nothing

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to the ASCII source forms markdown-it's typographer converts at build time (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips fenced code blocks and inline code spans, and preserves each file's existing line endings. `--check` reports what it would change and exits non-zero without writing, so it can serve as a gate.

### book/render-book.mjs
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
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Full schema is documented in the file header. Phase 2 resolves chapter arrays; Phase 8 assembles `book.html`. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that determines both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
