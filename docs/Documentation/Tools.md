---
title: Tools and Scripts
parent: Documentation Development
nav_order: 4
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

One-line-per-tool reference for every executable in the documentation repository: the nine Windows batch wrappers at the repository root, the Node and Python scripts under `scripts/` (cross-platform except for [`tbbuild.mjs`](#tbbuild), which drives the twinBASIC IDE), the `tbdocs` orchestrator and its CLI flags, and the PDF render driver. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper. Every Node tool answers `--help` or `-h` by printing its usage to standard output and exiting 0, without doing any of its work. A command line a tool cannot use is refused the same way by every Node tool: an unknown flag, a flag without its value or with an empty one, and an unexpected argument are reported on standard error and exit **2**. So is a crash. So is a value a tool cannot use, before it does any work: a number that is not one or is out of range (a fraction where a whole number is needed), a regular expression that does not compile, a URL that is not an absolute `http` or `https` one, a date that is not ISO 8601, a value outside a fixed set, and options that exclude each other. A tool that reads its command line through `lib/cli.mjs` and takes search terms, file names or folder names takes one that starts with a dash after `--`.

* TOC goes here
{:toc}
## Batch wrappers at the repository root
{: #batch-wrappers }

All nine sit at the repository root, beside `package.json` --- not under `docs/`. Each uses `@pushd "%~dp0"` to run from that root regardless of where it is invoked from, and each entry below gives the POSIX equivalent of what it runs. Those equivalents have no `pushd` in front of them, so **run them from the repository root** --- `tbdocs`'s `--src docs`, [`check_publish_policy.mjs`](#check-publish-policy)'s default source root, and every path handed to [`render-book.mjs`](#bookrender-bookmjs) are all resolved against the working directory. `examples.bat`, `addin-test.bat`, `ide-test.bat` and `try-help-addin.bat` are the exceptions to "each entry below gives the POSIX equivalent": they need a twinBASIC install and drive the IDE, so they are Windows-only, and none is part of the site build. Four other tools are Windows-specific for the same reason and are likewise not part of it: [`scripts/tbbuild.mjs`](#tbbuild) and [`scripts/tbrun.mjs`](#tbrun), which drive the twinBASIC IDE, and [`census_attributes.mjs`](#census-attributes) and [`build_package_api.mjs`](#build-package-api), which unpack the packages of a twinBASIC install --- though those two are cross-platform when given an already-exported tree with `--exported`. Nothing else in the repository is: `tbdocs` and every gate in both wrappers is a Node script, and CI runs all of them on `ubuntu-latest` except [`check_tree_fresh.mjs`](#check-tree-fresh), which guards against a failure mode CI cannot have.

### build.bat

    build.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --check-audit-index [extra tbdocs flags]

Renders the documentation. Wraps `node builder/tbdocs.mjs --src docs --check-audit-index` and forwards extra arguments through `%*`. Produces `_site/`, `_site-offline/`, and `_site-pdf/`, modulo the `--no-offline` / `--no-pdf` flags and the `also_build_offline` / `also_build_pdf` keys in `_config.yml`. A local build also ends by writing the [help archive](#the-help-archive), unless `--no-help-archive` is given. It returns [`tbdocs`](#tbdocs)'s exit code as it is.

`--check-audit-index` is the part of that invocation most easily lost in transcription, and losing it is silent: it implies `--check`, so a bare `node builder/tbdocs.mjs --src docs` writes the same three trees, runs no link check at all, and reports success --- a check that never ran has nothing to report.

There is no fixed build time worth quoting here, because every run prints its own (`Done in …`, with the page and static-file counts). What that number tracks is page count, core count, and which passes ran: the check, the offline mirror, the PDF tree and the help archive are each part of the total, and `--no-check`, `--no-offline`, `--no-pdf` and `--no-help-archive` each remove one.

Exit codes: **0** nothing to report; **1** the build or its check found a problem: a link or integrity failure, a failed build step, a fall in the page count, or a symbol-index URL lost; **2** a refused command line, a build stopped by the stall watchdog, or a crash.

### serve.bat

    serve.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --serve [extra tbdocs flags]

Starts a long-lived dev process. Wraps `node builder/tbdocs.mjs --src docs --serve` and forwards extra arguments through `%*`. After an initial build, an HTTP server binds to port 4000 (pass `--port <N>` to use a different port), a recursive source-tree watcher fires a debounced rebuild on each change, and a browser connected to the page auto-reloads via SSE on each successful rebuild. Offline and PDF passes are skipped each rebuild. Ctrl+C exits cleanly. **Only failures (4xx, 5xx, server exceptions) are logged** --- successful requests are silent. The watcher covers `docs/` and the worker pool is reused across rebuilds, so **an edit under `builder/` does not reach a running preview** and needs a restart --- see [why `serve.bat` does not show a builder change](Extending#serve-does-not-reload).

Exit codes: `tbdocs`'s own, as the other wrappers return theirs: **0** the server was stopped with Ctrl+C, **2** a refused command line, a failed first build, a port already in use, or a crash.

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

Exit codes: **0** every step passed; otherwise the code of the step that stopped the run, as that step's entry gives it.

One of the four does not mean the same thing locally as it does in CI, on any platform. [`check_a11y.mjs`](#check-a11y)'s `target-size` rule measures rendered boxes, and an inline element's measured height is the content area of whatever `system-ui` resolves to on the machine running the scan --- which is why both workflows install `fonts-liberation` and the site's padding is calibrated against the smallest face in that band. A local pass does not predict the runner's, and it errs in the unhelpful direction: larger metrics clear controls that CI then fails. See [Building and Deployment](Building#fonts-liberation-installed-on-purpose) for the measurements.

### test.bat

    test.bat

The tests the toolchain has to pass. Twenty-one steps, each stopping the run if it fails:

1. [`scripts/check_publish_policy.mjs`](#check-publish-policy) --- verifies the publish allowlist still refuses the types it is meant to. Needs neither a browser nor a built tree, so it goes first.
2. [`scripts/check_gate_lists.mjs`](#check-gate-lists) --- verifies the two gate lists on this page still match the wrappers that run them.
3. [`scripts/check_ci_workflows.mjs`](#check-ci-workflows) --- verifies both CI workflows run the gates the wrappers run, and build as `build.bat` does.
4. [`scripts/check_lint.mjs`](#check-lint) --- runs Biome's linter and formatter check over the tooling and fails on any finding, warnings and layout included.
5. [`test/search.test.mjs`](#search-test) --- unit tests for the site search: what the search entries hold, and that the copies of the search client agree.
6. [`test/render.test.mjs`](#render-test) --- unit tests for the markdown-it plugins, on inputs no page holds.
7. [`test/strftime.test.mjs`](#strftime-test) --- unit tests for the footer's date formatter, which no build calls.
8. [`test/png.test.mjs`](#png-test) --- unit tests for the pictures of a bug reproducer: PNG decoding, comparing and the side-by-side image, the files behind `images` and `expect.imagesDiffer`, and the refusals of `bug_repro.mjs` over fixtures.
9. [`test/example-batches.test.mjs`](#example-batches-test) --- runs `check_examples.mjs`'s probes, which test how samples are batched and how a crashed batch is cut down, without an IDE.
10. [`test/ports.test.mjs`](#ports-test) --- unit tests for how the harness claims the DevTools ports its IDEs use, without an IDE.
11. [`scripts/check_regex_safety.mjs`](#check-regex-safety) --- refuses a regex that can backtrack exponentially, written as a literal or built from constants.
12. [`scripts/check_code_regions.mjs`](#check-code-regions) --- verifies no pre-render rewrite alters the contents of a code fence or code span, that the rewrites over rendered HTML leave a raw `<pre>` or `<code>` alone, and that `lib/markdown.mjs` and `lib/frontmatter.mjs` pass their probes.
13. [`scripts/check_page_baseline.mjs`](#check-page-baseline) --- verifies the page-count drift guard still refuses a fall.
14. [`scripts/check_book_coverage.mjs`](#check-book-coverage) --- verifies the build still warns about a page `docs/_book.yml` does not mention.
15. [`scripts/check_symbol_index.mjs`](#check-symbol-index) --- verifies the symbol index still places each kind of symbol, and its drift guard still refuses a lost URL.
16. [`scripts/check_twin_parsers.mjs`](#check-twin-parsers) --- verifies the scanners of twinBASIC source and of the attribute reference still read the shapes each once misread.
17. [`scripts/check_attribute_sweep.mjs`](#check-attribute-sweep) --- verifies the logic of the attribute sweep: its site skeletons, how it reads a probe's diagnostics, how it batches probes, and how it compares the answers with `Attributes.md`.
18. [`scripts/check_cli.mjs`](#check-cli) --- verifies `lib/cli.mjs`, the command-line parser, and each tool's recorded command-line errors.
19. [`scripts/check_pdf_shims_equiv.mjs`](#check-pdf-shims-equiv) --- verifies the book's pdf-lib shims write what stock pdf-lib writes, patch the members of pdf-lib it lists, have each of them in their shim's table of targets, and run.
20. [`scripts/check_impexp_parity.mjs`](#check-impexp-parity) --- verifies the two editions of the impexp tool pass the same built-in tests, and exit, print and write the same for one sequence of commands. Without Python it reports itself skipped and passes, except in CI.
21. [`scripts/check_axe_patch_equiv.mjs`](#check-axe-patch-equiv) --- verifies the vendored axe source patch still produces identical colour values.

POSIX:

    node scripts/check_publish_policy.mjs \
      && node scripts/check_gate_lists.mjs \
      && node scripts/check_ci_workflows.mjs \
      && node scripts/check_lint.mjs \
      && node --test test/search.test.mjs \
      && node --test test/render.test.mjs \
      && node --test test/strftime.test.mjs \
      && node --test test/png.test.mjs \
      && node --test test/example-batches.test.mjs \
      && node --test test/ports.test.mjs \
      && node scripts/check_regex_safety.mjs \
      && node scripts/check_code_regions.mjs \
      && node scripts/check_page_baseline.mjs \
      && node scripts/check_book_coverage.mjs \
      && node scripts/check_symbol_index.mjs \
      && node scripts/check_twin_parsers.mjs \
      && node scripts/check_attribute_sweep.mjs \
      && node scripts/check_cli.mjs \
      && node scripts/check_pdf_shims_equiv.mjs \
      && node scripts/check_impexp_parity.mjs \
      && node scripts/check_axe_patch_equiv.mjs

Exit codes: **0** every step passed; otherwise the code of the step that stopped the run, as that step's entry gives it.

**Eighteen of the twenty-one cannot be affected by an edit confined to `docs/`**, which is why they are separate from `check.bat`. Run this one when the change touches `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/` or `test/`, the site's scripts in `docs/assets/js/`, a wrapper, or a workflow. Both CI workflows run all twenty-one unconditionally, so skipping it locally cannot let a tooling regression reach `staging`.

The three exceptions are [`check_code_regions.mjs`](#check-code-regions), [`check_gate_lists.mjs`](#check-gate-lists), which reads this page, and [`check_lint.mjs`](#check-lint), which lints the site's scripts in `docs/assets/js/`. The first is worth knowing in detail. Its corpus sweep tokenises every markdown file under `docs/`, so a page that provokes a rewrite into altering a code region fails it. Its fixed probes are a different matter: they run against their own sources whatever the tree holds, and they cover the *mirror* fault, where a rewrite silently stops firing. The sweep cannot see that one --- text the rewrite skipped is stashed and restored unchanged, so every region still matches. Add a page with an unusual code construct and run `test.bat`, but read the built page too.

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

Exit codes: **0** the PDF was written; **1** the tree is stale, or `npm install` failed; **2** there is no built tree, or the render failed. [`check_tree_fresh.mjs`](#check-tree-fresh) runs first and `book.bat` returns its code as it is; [`render-book.mjs`](#bookrender-bookmjs) has no 1 of its own.

#### The pre-flight freshness check
{: #book-preflight }

`book.bat`'s **first** action, before the `npm install` test and before the renderer starts, is:

    node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html

[`check_tree_fresh.mjs`](#check-tree-fresh) refuses a `_site-pdf/` tree older than `docs/` or `builder/`. An existence test is not enough: edit a page, run `book.bat` without `build.bat`, and it would spend two minutes rendering the **previous** book and report success. Nothing downstream notices, because the PDF it produces is internally consistent, correctly paginated and correctly bookmarked. It is simply the wrong book.

Leaving the question to the renderer does not cover it either. `render-book.mjs` refuses a missing input with `input not found:` and the resolved path, which says nothing at all about a tree that is present and stale --- the case that costs two minutes and yields a wrong artifact.

`--marker book.html` is required here, and `book.bat` is the only caller that passes it. The script identifies a tree by its `index.html`, which every output tree has except `_site-pdf/` --- that one holds a single `book.html`. Without the flag, `--tree docs/_site-pdf` looked for an `index.html` that never exists and exited 2, so `--tree` was there all along and could not actually be pointed at this tree.

**A 2 does not say which half of `book.bat` failed; the message does.** The pre-flight returns 2 for an absent tree and the renderer returns 2 for a failed render, and `book.bat` hands whichever it got straight back to its caller. A 1 is unambiguous: a stale tree, or a failed `npm install`. Every pre-flight failure is prefixed `check_tree_fresh:`, and these are the two it prints:

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

Compiles the documentation's own twinBASIC code samples --- every ` ```tb ` fence marked `check_build` --- and reports the ones the compiler refuses, against the line in the page they came from. A sample also marked `check_run` is run, and what it prints is checked against what the page says it prints. [Authoring Pages](Authoring#checking-that-a-sample-compiles) is the page for marking a sample and for what a pull request that changes one shows; this entry is about running the tool.

**It is not one of the gates, and it must not become one.** It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows, for three reasons that are not going to change: it needs a twinBASIC install, where `npm install` has to remain sufficient to build the docs; it needs Windows, a private desktop and a CDP-reachable WebView2, none of which exists on the CI box; and an IDE cold start is 6 to 8 seconds against a whole site build's four. It is run by a person, deliberately, which is the same arrangement [`sweep_a11y.mjs`](#sweep-a11y) already has.

Exit codes: those of [`check_examples.mjs`](#check-examples), returned as they are: **0** clean, **1** a sample does not compile, or does not run as its page says, **2** the harness failed.

### addin-test.bat
{: #addin-testbat }

    addin-test.bat [flags]

One invocation of [`addin_test.mjs`](#addin-test), with every flag passed straight through:

    node scripts/addin_test.mjs [flags]

Tests twinBASIC IDE add-ins by machine: it builds each add-in under test, loads it into an IDE, operates the IDE the way a person would, and checks what the add-in did.

**It is not one of the gates either**, and for the reasons `examples.bat` is not: it needs a twinBASIC install, and it needs Windows, a private desktop and a CDP-reachable WebView2. It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes: those of [`addin_test.mjs`](#addin-test), returned as they are: **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### ide-test.bat
{: #ide-testbat }

    ide-test.bat [flags]

One invocation of [`ide_test.mjs`](#ide-test), with every flag passed straight through:

    node scripts/ide_test.mjs [flags]

Tests the twinBASIC IDE itself by machine: it opens a project in an IDE, operates the IDE the way a person would (the debugger, Export Project, the Packages dialog), and checks what the IDE did. It is the runner of [`addin-test.bat`](#addin-testbat) for scenarios that test the IDE rather than an add-in.

**It is not one of the gates either**, and for the reasons `examples.bat` is not: it needs a twinBASIC install, and it needs Windows, a private desktop and a CDP-reachable WebView2. It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes: those of [`ide_test.mjs`](#ide-test), returned as they are: **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### try-help-addin.bat
{: #try-help-addinbat }

    try-help-addin.bat [flags]

One invocation of [`try_help_addin.mjs`](#try-help-addin), with every flag passed straight through:

    node scripts/try_help_addin.mjs [flags]

Opens an IDE on your desktop with the help add-in built and loaded, to try it by hand, and puts the registry back once the IDE is closed. **It is not one of the gates**: it needs a twinBASIC install and Windows.

Exit codes: those of [`try_help_addin.mjs`](#try-help-addin), returned as they are: **0** the IDE was closed and the registry is as it was found, **1** the add-in did not build or the project does not compile, **2** the tool could not run, **3** the registry or the work folder was not put back.

## CLI tools

### tbdocs --- node builder/tbdocs.mjs
{: #tbdocs }

Entry point for the static site generator. Every caller adds flags to the bare `--src docs`, and no two agree, so take the invocation from the caller rather than from memory:

| Caller | Invocation |
|---|---|
| `build.bat` | `--src docs --check-audit-index` (plus anything passed through) |
| `checks.yml` (PR checks) | `--src docs --no-fetch-assets --no-help-archive --check-audit-index` |
| `tbdocs-gh-pages.yml` (deploy) | the same, plus `--url` and `--baseurl` from the Pages environment |

Full invocation:

    node builder/tbdocs.mjs [--src <path>] [--dest <path>]
                            [--baseurl <prefix>] [--url <origin>]
                            [--dry-run]
                            [--no-offline] [--no-pdf] [--no-help-archive]
                            [--tolerate-missing-images]
                            [--fetch-assets] [--no-fetch-assets]
                            [--profile-offline]
                            [--check] [--no-check] [--check-audit-index]
                            [--check-findings <path>]
                            [--update-page-baseline] [--update-symbol-baseline]
                            [--symbol-gaps <path>]
                            [--serve] [--port <N>]
                            [--stall-timeout <seconds>]

`build.bat` passes `--src docs --check-audit-index`, and forwards anything else given to it. A flag that takes a value takes it as the next argument or as `--flag=value`; given as the next argument, the value may not start with a dash.

| Flag | Effect |
|---|---|
| `--src <path>` | Source root. Default: `docs` relative to the working directory. |
| `--dest <path>` | Online-tree destination. Default: `<src>/_site`. The offline tree lands at `<dest>-offline`, the PDF tree at `<dest>-pdf`. The build refuses a destination that is or contains `<src>`, since cleaning it would delete the source. Inside `<src>`, it must be, or be inside, a folder directly under it whose name starts with `_site`, `_serve` or `_pdf`: anywhere else there, its output is read back as source by the next build or by `--serve`'s watcher. |
| `--baseurl <prefix>` | Overrides `_config.yml`'s `baseurl`. Used by CI to inject the GitHub Pages base path on fork deployments. |
| `--url <origin>` | Overrides `_config.yml`'s `url`; an absolute `http` or `https` URL. Used by CI so canonical URLs match the actual deployment origin rather than the configured production host. |
| `--dry-run` | Skip every filesystem write. Useful for benchmarking or validating discovery / compute / render. |
| `--no-offline` | Skip the offline tree pass. |
| `--no-pdf` | Skip the PDF tree pass. |
| `--no-help-archive` | Do not write the [help archive](#the-help-archive). CI passes it. |
| `--tolerate-missing-images` | Downgrade Phase 8's missing-image error to a warning. Use when the source tree is mid-edit and may temporarily reference an image that does not yet exist. |
| `--fetch-assets` / `--no-fetch-assets` | Force remote-asset vendoring on or off. Without either flag, the build downloads missing YouTube thumbnails and GitHub user-attachment images on a dev machine, and refuses to download anything when `$CI` is set --- a referenced but uncommitted asset is a hard build error there. See [Authoring Pages](Authoring#committing-downloaded-assets). |
| `--profile-offline` | Print per-substep timing for the offline tree pass. |
| `--check` | Run the link and site-integrity check over the HTML the build already holds in memory, across every tree it produced. A failing check does not abort the build; it sets the exit code to 1, and its summary lines say whether links, integrity or both failed. |
| `--no-check` | Turn the check off again. Flags are read in order, so this wins over a `--check` baked into `build.bat`. |
| `--check-audit-index` | Implies `--check`, and additionally diffs the tree index the build derives from its own records against what landed on disk. A spurious entry makes the link oracle answer "exists" for a path that 404s in production, and nothing else would notice. This is what `build.bat` passes. |
| `--check-findings <path>` | Implies `--check`, and writes the findings as JSON for a tool to read. Used by [`scripts/check_links_diff.mjs`](#check-links-diff). |
| `--update-page-baseline` | Record this build's page and static-file counts in `builder/page-baseline.json` as the drift guard's new baseline, in whichever direction they moved. An ordinary build raises the baseline by itself; only a **fall** needs this flag, because a fall is what the guard exists to catch. See [the page-count drift guard](Building#the-page-count-drift-guard). |
| `--update-symbol-baseline` | Record this build's symbol-index URLs in `builder/symbol-baseline.json`, whichever left it. New URLs are recorded by an ordinary build; only a URL the index has **stopped** publishing needs this flag --- and usually needs a pinned heading id instead. See [the symbol index and its drift guard](Building#the-symbol-index). |
| `--symbol-gaps <path>` | Write the public symbols no page documents to a JSON file: each one's package, container, name, kind, and the page its container is on. Names a package's `exclude_from_docs:` lists are left out. |
| `--stall-timeout <seconds>` | How long the build waits with no task completing before it gives up, names the outstanding tasks and exits 2. Default: 120; a number of seconds, fractions allowed. `0` disables the watchdog and returns the build to hanging in silence on a wedged worker. See [when a build stops instead of failing](Building#when-a-build-stops). |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). Offline and PDF passes are skipped each rebuild. |
| `--port <N>` | HTTP port for `--serve` mode, a whole number from 1 to 65535. Default: 4000. |

A command-line error --- an unknown flag, an unexpected argument, a flag without its value or with an empty one (`--baseurl` alone accepts one, meaning the site root), a value a flag cannot use (a `--port` that is not a port number, a negative or non-numeric `--stall-timeout`, a `--url` that is not an absolute `http` or `https` URL), or a `--dest` the build refuses --- is reported on standard error before any work starts, so it is never read as a broken link.

Exit codes: **0** nothing to report (with `--serve`, the server was stopped with Ctrl+C); **1** the build or its check found a problem: a link or integrity failure, a failed build step, a fall in the page count, or a symbol-index URL lost; **2** a refused command line (a `--dest` the build refuses included), a build stopped by the stall watchdog, with `--serve` a failed first build or a port in use, or a crash.

#### The help archive
{: #the-help-archive }

A local build ends by writing the zip the IDE help add-in serves the documentation from. The add-in embeds `add-in/Resources/HELP/site.zip` in its DLL as a resource, and the build writes that file from the offline tree it has just written. It writes the archive last, after the build-time chart has been added to `BuildInfo.html` in both trees, so the archive holds the pages as they are on disk. The step prints one line:

    help archive: add-in/Resources/HELP/site.zip, 1471 entries, 21.2 MB (1.2 s)

The zip is not committed, because it is too large; `add-in/Resources/HELP/` is listed in `.gitignore`. Only a build of the documentation tree into `docs/_site-offline` writes it. A build of another source tree (the test fixtures, for one) or into another `--dest`, `--serve`, `--dry-run` and a build without an offline tree leave it alone, and so does `--no-help-archive`, which both CI workflows pass. A file the build cannot write, or an archive that does not match the tree, fails the build with exit code 1.

The reader on the twinBASIC side does no inflating of its own, so the format is fixed. There is one entry per file and no directory entries. A name is relative to the tree root, uses forward slashes and is UTF-8, with general-purpose flag bit 11 set. Entries are sorted by name in code-unit order, so the same tree gives the same bytes. The DOS date and time are always 1980-01-01 00:00, the version made by and needed is 20, and there are no extra fields, no comments and no data descriptors: the CRC-32 and both sizes are in the local header and in the central directory. There is no zip64, so a tree of more than 65,535 files, or an archive of 4 GB, is refused. Files that are compressed already (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff2`, `.woff`, `.mp4`, `.zip`, `.pdf`) are stored. Every other file is deflated at level 9, and stored instead when the deflated data is not smaller than the file.

After the file is written, the build reads it back. It parses the end record and every central-directory entry, checks that each local header agrees with its entry (name, method, sizes, CRC-32), and inflates each deflated entry. It compares each entry's content and CRC-32 with the source file's bytes, and names any entry that differs. This check always runs. The file is written under a temporary name beside the target and renamed, so a failed run never leaves a half-written archive. The writer is `lib/help-archive.mjs`.

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

A finding can be a broken link, an integrity failure or both (the integrity checks share the same SAX parse pass as link extraction); the summary lines say which. `--no-fail` turns a finding's 1 into 0, and changes nothing else. The script dedupes `(target, fragment)` so each unique filesystem check fires exactly once regardless of how many pages link to the same target --- on the current tree (~733k link occurrences, ~12k unique targets across 1,127 HTML files / 124 MB) each pass runs in ~2.2 seconds on a development box.

Exit codes: **0** every check passed, or `--no-fail` turned the findings into 0; **1** a link, forbidden-prefix or integrity check failed (with `/sep/` segments, the highest code of any segment); **2** the check could not run: a refused command line (no arguments, an unknown option, a flag without its value, no `--offline`, or no input), or a crash.

### crawl_check.mjs
{: #crawl-check }

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Starts at `<start-url>`, GETs every same-origin / same-base-path page recursively, extracts every link the build's own check follows (`srcset` and `poster` included), and verifies that each link responds 2xx (HEAD for cross-origin, GET for same-origin). A request that fails before any response arrives, whether its connection is reset or it times out, is tried twice more, each time with the full `--timeout`, before its link is reported broken. The timeout covers a page's body as well as its headers. A page whose body breaks off, or is still arriving when the timeout runs out, is reported broken at once, without a retry, and the part that arrived is not parsed for links. A command line it refuses includes a missing start URL or one that is not an absolute `http` or `https` URL, a `--concurrency` that is not a whole number of at least 1, a `--timeout` that is not a whole number of milliseconds from 1 to 2147483647, and a second argument. Use it after a manual `workflow_dispatch` deploy to verify the published site --- `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live deployed site.

Exit codes: **0** every link is reachable and every anchor exists, **1** a link is broken or an anchor is missing, **2** a refused command line, or a crash.

### check_a11y.mjs
{: #check-a11y }

    node scripts/check_a11y.mjs [--root-dir <path>] [--theme light|dark|both] [--viewport desktop|mobile|both]
                                [--stock-axe] [--minified]

Automated accessibility scan of the built site, and the last of `check.bat`'s four steps. Loads `axe-core` into headless Chromium (via `puppeteer`) and runs it against thirteen sample pages in both themes at two viewports, plus two state audits that open a disclosure first --- 60 audits in all. The page list is derived rather than hand-maintained, and [`scripts/pick_a11y_sample.mjs`](#pick-a11y-sample) is what keeps it representative.

**This script is the reporting front end, not the scan.** What the scan *is* --- the page list, the themes and viewports, the blocked requests, the axe run options, the vendored source patches and the state audits --- lives in [`scripts/lib/axe-scan.mjs`](#axe-scan), which `check_a11y.mjs`, `sweep_a11y.mjs` and `check_a11y_fingerprint.mjs` all share. Change the scan there, not here. The scan uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags, plus the `heading-order` best-practice rule. All five WCAG tags must be listed because axe matches tags literally, with no version rollup --- a rule tagged only `wcag21aa` does not match `wcag22aa`, even though WCAG 2.2 AA is a superset of 2.1 AA. Incomplete (needs-review) results are reported but do not fail the run.

| Flag | Effect |
|---|---|
| `--root-dir <path>` | Tree to scan. Default: `docs/_site-offline`. |
| `--theme light\|dark\|both` | Which palette(s) to test. Default: `both`. |
| `--viewport desktop\|mobile\|both` | Which viewport(s) to test (`desktop` = 1280×900, `mobile` = 375×812). Default: `both`, so each page is scanned four times. |
| `--stock-axe` | Inject the unmodified axe bundle instead of the patched one. **Run this first if a result ever looks wrong** --- it says in one command whether the source patch is implicated. |
| `--minified` | Inject `axe.min.js`. The patched path needs the unminified bundle, so this and `--stock-axe` go together when reproducing a stock baseline. |

Three details are essential and easy to break. It scans **`_site-offline/`, not `_site/`**: the online tree's root-absolute asset URLs (`/assets/css/…`) resolve to nothing under `file://`, so every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass --- the offline tree uses relative asset paths and renders for real. It scans **each page in both themes**, because dark mode is a separate palette (applied via `[data-theme=dark]`) and a light-mode pass says nothing about it. And it **blocks the search index** (`search-data.js` + `lunr.min.js`) while scanning: every page pulls in ~3.2 MB of index that never reaches the DOM axe walks, so aborting it cuts the run from ~27 s to ~9 s with identical results. `just-the-docs.js` is deliberately not blocked --- it installs the search combobox ARIA, and blocking it would make axe see less. Requires `build.bat` to have produced an up-to-date `_site-offline/`.

Exit codes: **0** no page has a violation (incomplete checks are reported but do not fail), **1** at least one page has a violation, **2** the scan could not run: a refused command line, or a crash.

### pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads thirteen pages out of ~1,160, so the page list decides what it can report at all --- and a list that stops being representative fails silently: the rule for a construct no sample page carries simply never runs, and the gate stays green.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on. `--check` (the default, and what `check.bat` and both CI workflows run) verifies every family the site uses is covered by at least one sample page, and names the gaps and the cheapest page that would close each. `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list. `--census` reports what each family is, how many pages use it, and which page uses it most. Two of the three modes together are refused. `--fresh` applies to `--propose` alone: by default the set cover is seeded with the current list, so it prints what to *add*, and `--fresh` ignores the current list and covers from scratch --- which is how to ask whether the pages already in the sample still earn their place.

**`--check` cannot report a construct nobody has registered.** It iterates the families that exist and asks whether the sample still covers each, so markup no family describes produces silence --- and that silence is the failure a derived sample exists to prevent. When the docs start using a construct they have not used before, registering the family is a deliberate step nothing will prompt you to take.

A family is one entry in the `FAMILIES` object at the top of the script, keyed by a short name, with three fields:

    kbd: { re: /<kbd[\s>]/g, min: 2, why: "color-contrast on inline key caps" },

`re` is a global regular expression matched against each page's built HTML --- the emitted markup, not the markdown --- so key it on the tag or class the renderer actually produces. `min` is how many matches a page needs before it counts as covering the family, and it is the field that needs a decision: `1` when one instance exercises the rule exactly as fifty would, higher when the rule is about the relationship *between* instances. Consecutive `<summary>` elements are the worked case --- `target-size` between two of them is registered as its own family at `min: 8`, because a page with one disclosure does not exercise it and neither does a page with four. `why` names the axe rule that would otherwise have nothing to run on, and is what a failure prints.

Then run `--check`. If the new family is uncovered it names the cheapest page that would close the gap, and **adding that page means editing `SAMPLE_PAGES` in `scripts/lib/axe-scan.mjs`, not this script.** An entry there is a bare string --- the page's path in the built tree, root-relative, with the `.html` on it and no origin:

    "/Documentation/Development/Pipeline-Stages.html",

which is the path `--check` names for you. Two things follow from that second edit. Run [`scripts/sweep_a11y.mjs`](#sweep-a11y) once over the whole site, because the sample can only ever report on the markup it contains, and the sweep is what says what the new construct is doing on the pages that already have it. And do not expect [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) to vouch for it: it compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot.

Exit codes: **0** the mode ran (with `--check`, every construct family in use is covered); **1** with `--check`, a construct family has no sample page, or a `SAMPLE_PAGES` entry is not in the built tree; **2** a refused command line, no built tree (run `build.bat` first), or a crash.

### check_links_diff.mjs
{: #check-links-diff }

    node scripts/check_links_diff.mjs [--a SIDE] [--b SIDE] [--case NAME ...]
                                      [--base-path-tree DIR] [--build-base-path]
                                      [--max-lines N] [-v]
    node scripts/check_links_diff.mjs --list
    node scripts/check_links_diff.mjs --self-test

Differential harness for the link checker. The check has two front ends --- the standalone [`scripts/check_links.mjs`](#check-links), which reads a tree from disk, and the build's own `--check` pass, which checks the pages it holds in memory against an index of what it wrote, in chunks across its workers. Both run the same functions in `builder/check.mjs` and differ only in how they read the tree, which is still enough to hide a fault, because **a checker that silently checks less reports a clean pass**. This runs both over the same bytes and diffs their findings category by category, across the nine finding categories plus the per-run counts.

Two registries decide what a run actually does, and `--list` prints both. **Sides** are the implementations being compared, named by `--a` and `--b`:

| Side | What it is |
|---|---|
| `script` | `check_links.mjs` pinned to `--oracle fs`, run in-process. The reference side --- though not an oracle of record: on Windows its filesystem oracle answers "exists" for a wrong-case path that 404s on GitHub Pages, and on that one question `index` is the correct side. |
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

`tbdocs-gh-pages.yml` (deploy) keeps only the first: ~0.3 s over a synthetic tree, enough that the script side cannot rot unnoticed, while the extra three-page build stays on the PR gate. What is in neither, and deliberately not in `check.bat` either, is the full `--a script --b fused` over the real trees --- it builds the site itself so both sides read the same bytes, and the script side then costs a few seconds, which is the entire saving of having folded the check into the build. Run that one by hand after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`.

`--self-test` is the guard on the guard. It runs `check_links.mjs`'s own regression guards --- nothing else does --- and then diffs the `script` side against a deliberately corrupted copy, failing unless the difference is reported. Everything else the harness prints reduces to *the two sides agreed*, which is also what a harness comparing nothing says.

The fixtures have their own document, and it is the one to read before editing them: [`test/README.md`](https://github.com/twinbasic/documentation/blob/main/test/README.md) covers what each page under `check-src/` is there to provoke, and the hard-coded per-category counts (`FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE`, `FIXTURE_BUILT_OFFLINE`) that are asserted after every run, so a fixture that stops provoking a category fails loudly instead of quietly returning to empty-against-empty. It also covers the hazard that catches people out: **the fixture is built by the real `tbdocs`, so a template change can turn this gate red without anyone touching the fixture or the checker.** Adding the self-hosted fonts put two `<link rel="preload">` tags on every page, `check-src/` had no `assets/fonts/`, and its `broken` count went from 3 to 9. The fix for that shape of failure is to add the stub asset the template now expects --- never to raise the expected count, which dilutes a category the fixture exists to hold at an exact number.

Exit codes: **0** the two sides agree in every case; **1** the sides differ, a fixture's category counts drifted, or `--self-test` failed; **2** the comparison could not run: a refused command line, an unknown side or case, `--a` equal to `--b`, a failed build, or a crash.

### axe-scan.mjs
{: #axe-scan }

Not a command --- `scripts/lib/axe-scan.mjs` is the shared module that **defines** the accessibility scan, imported by [`check_a11y.mjs`](#check-a11y), [`pick_a11y_sample.mjs`](#pick-a11y-sample), [`sweep_a11y.mjs`](#sweep-a11y), [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) and [`check_axe_patch_equiv.mjs`](#check-axe-patch-equiv). It holds `SAMPLE_PAGES`, `THEMES`, `VIEWPORTS`, `STATE_AUDITS`, `BLOCKED_REQUESTS`, `AXE_RUN_OPTIONS`, `SOURCE_PATCHES` and the `SCHEMES` registry, plus the `runMatrix` / `buildMatrix` drivers, and the page discovery the sampler and the sweep share: `discoverPages`, and `STUB_TAG_CEILING`, below which a page is a redirect stub neither of them audits. Any change to *what the scan runs* belongs here, and most of them must go through the [fingerprint gate](#check-a11y-fingerprint) first. **`SAMPLE_PAGES` is the exception, and it is the constant most often edited**: the gate compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot, and a green run there vouches for nothing. Argue that one from source, run [`sweep_a11y.mjs`](#sweep-a11y) once, and use the gate's A/A control (`--baseline production --candidate production`) only to show the matrix is still deterministic.

`STATE_AUDITS` deserves a note: a closed `<details>` subtree is `notRendered`, so axe never walks it. Entries here are layered onto the page × theme × viewport matrix and apply a DOM mutation from `PAGE_STATES` before the audit, which is how the section-links disclosure gets audited open as well as closed. **Every `PAGE_STATES` function must assert it found what it expected** --- a state that silently does nothing degrades into a second audit of the default page: slower, still green, covering nothing.

### check_publish_policy.mjs
{: #check-publish-policy }

    node scripts/check_publish_policy.mjs [--src <path>]

The gate on the publish allowlist. Everything under `docs/` that is not a page is copied into the published site verbatim, so the source tree's shape is the site's shape --- [`builder/publish-policy.mjs`](Builder#module-map) is the list of types that may be published, enforced inside the build at the source inventory and again at each output tree's inventory. A finding there aborts the build rather than setting an exit code: a broken link still leaves a tree worth inspecting, a tree with a private key in it does not.

A clean build only says **nothing in `docs/` is currently refused**, which is also what an allowlist widened until it refuses nothing would say, and no build over a clean tree can distinguish the two. So this asserts the other half: thirteen named probes that must stay refused (a `.bak`, a `.pem`, a `.docx`, a `.twin`, a `secrets.json`, a `Thumbs.db`, a frontmatter-less `.md`, an extensionless `LICENSE`, a dotfile), six that must keep publishing (`.png`, `.PNG`, `.woff2`, `.txt`, `.html`, `CNAME`), that `bundle_extra` exemptions stay scoped to the exact declared path rather than blessing the extension everywhere, and that `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` stay disjoint --- folding the two together would pass every other assertion here while quietly making a stray `docs/secrets.json` publishable.

It also checks that the refusal *message* for a `.md` still names a fault that can happen, which is a narrower thing than it sounds. The message tells the reader the opening `---` must be the first line, and that is the right advice only because the two causes that come to mind first are handled elsewhere: a UTF-8 BOM is stripped before parsing, and malformed YAML aborts with its own error. An earlier draft named the BOM and would have sent every reader hunting for something that cannot occur, so all three behaviours are now asserted against real files --- nothing else in the repository covers them.

No browser, no built tree, ~40 ms, which is why it is `test.bat`'s first step. Run it after touching `builder/publish-policy.mjs`. Each failed assertion is named.

Exit codes: **0** every assertion held, and the source tree holds no file the allowlist refuses; **1** an assertion failed, or the source tree holds a file the allowlist refuses; **2** the gate could not run: a refused command line, or a crash.

### check_tree_fresh.mjs
{: #check-tree-fresh }

    node scripts/check_tree_fresh.mjs [--tree DIR] [--source DIR ...]

`check.bat`'s first gate. Refuses a built tree older than the sources that produced it, by comparing the newest mtime under the source tree against the built tree's `index.html`. The build's own output trees under `docs/` are not sources, and which folders those are comes from `lib/markdown-files.mjs`, the list [`check_code_regions.mjs`](#check-code-regions) walks by. Without it, editing a page and running `check.bat` without rebuilding audits the *previous* build and passes --- a green run that says nothing about the change just made. CI never hits this because it builds in the same job; a development box hits it whenever the two commands run out of order. The message for a stale tree names `build.bat`.

Exit codes: **0** the tree is at least as new as its inputs; **1** the tree is stale (run `build.bat`); **2** the check could not run: a refused command line, no built tree or marker file, or a crash.

### check_dot_fit.mjs
{: #check-dot-fit }

    node scripts/check_dot_fit.mjs [--verbose]

Renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Graphviz lays out boxes from a width table while the browser paints text with an actual font --- two measurements of the same string that nothing inside the build compares. When they disagree the SVG is still well-formed and the build still green; the only symptom is a label hanging past its edge. Twenty-seven labels across three diagrams shipped that way, on pages that had passed the full accessibility sweep, because axe does not evaluate SVG `<text>` geometry either. `builder/dot-metrics.mjs` fixed the cause; this proves it stayed fixed. Needs a browser, which is why it lives in `check.bat` rather than the build. Run it after touching any `.dot`, `builder/dot-metrics.mjs`, or `builder/inter-metrics.json`.

Exit codes: **0** every diagram's text fits its boxes, or no diagram was found; **1** the text of at least one diagram sits outside its box; **2** the gate could not run: a refused command line, no browser, or a crash.

### check_regex_safety.mjs
{: #check-regex-safety }

    node scripts/check_regex_safety.mjs [--census] [--self-test]

Refuses a regex that can backtrack exponentially. Parses every `.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/` and `wisdom/` with acorn and classifies each pattern with [recheck](https://makenowjust-labs.github.io/recheck/). No browser, no built tree, a few seconds.

**It reads two things: regex literals, and every `new RegExp(...)` whose arguments can be resolved from the source.** The second half matters more than it sounds, because building a pattern out of shared fragments --- `const NUM = "..."; new RegExp(`${WRAP}${NUM}`)` --- is the ordinary way to avoid writing a sub-pattern six times, and for as long as the gate read literals only, doing that made a regex invisible to it. Six in one gate were, and one of them turned out to be polynomial rather than safe; it was found by a person running recheck against it by hand, which is not a process. A construction it cannot resolve is listed by `--census` with the reason --- *a function parameter, check the call sites*, *a `let`, so its value is not fixed* --- so the remaining blind spot is a short list rather than a count.

**An exponential regex does not fail a build, it stops one.** The corpus passes for as long as no page happens to contain the trigger; then a worker sits inside `String.replace` and never returns, and the build prints its last line. That is not hypothetical --- `VOID_TAGS_RE` in `builder/render.mjs` shipped that way, and the two alt strings that triggered it (`Line/Column`, `/Packages/WinDevLib`) are ordinary English. This gate asks the question of the regex rather than waiting for content to ask it. When it first ran it found a second exponential regex in the same file that nobody knew about, and then found that the first attempt at fixing `VOID_TAGS_RE` was still exponential on a subtler input. The [stall watchdog](Building#when-a-build-stops) ends such a run after two minutes and names the wedged task and the pages it was rendering, which turns a silent hang into a diagnosis --- it does not make the regex safe.

**When it refuses one**, the report gives the file, the line, the pattern, and a **witness** --- an input that makes that pattern blow up. Keep the witness: pasting it into a scratch `re.test(witness)` is how you watch the fault, and it is the only thing that later says the rewrite worked, since the corpus passed before the fix and passes after it. It is printed whole, with its length, and must be pasted whole. The report used to cut it to 70 characters, and a shortened witness has fewer repetitions of the part that causes the blowup: for the first attempt at fixing `VOID_TAGS_RE`, the 492-character witness ran for more than 30 seconds while its first 70 characters returned in under a millisecond.

The cause is one shape, every time: **two parts of the pattern can match the same character**, so a single run of input can be divided between them in exponentially many ways, and a match that ultimately fails tries every division. Both regexes this repository shipped were that. `VOID_TAGS_RE` spelled a void tag's attribute list as `(?:\s+[^>/]+...)*`, and `[^>/]` matches a space exactly as `\s` does, so any run of attribute text divides arbitrarily. Narrowing the class to `[^\s>/]` looked like the fix and was not --- it still matches `"`, `'` and `=`, so an attribute could be taken either by the name class or by the quoted-value alternative, which is the same ambiguity one level down. That second version was pronounced safe by hand and refused by this gate.

**The rewrite that works is to stop describing the structure between the delimiters.** Both regexes are `<(br|hr|...)\b([^>]*)>`, and the attribute handling happens afterwards in ordinary JavaScript, where it is easier to read and cannot backtrack at all. `[^>]*` and the `>` after it share no character, so there is no division to try. **Do not reintroduce a per-attribute sub-pattern in either one**: a per-attribute sub-pattern is what made them exponential.

It gates on **exponential only**. recheck also reports polynomial blowup, and about a fifth of the patterns here are polynomial --- nearly all the ordinary `<tag[^>]*>` shape on bounded input. Failing those would mean fifty findings on day one, and a gate that fails on day one gets switched off. The `degN` a census prints is worth even less than that: on one pattern, over three runs each, the native backend calls it degree 2 and the pure-JavaScript fallback calls it degree 3. Both agree on exponential-or-not, which is the only thing the gate rests on.

Two sets of probes run inside the normal pass rather than behind `--self-test`, because a green line saying *no exponential regex* is otherwise indistinguishable from a gate that has stopped detecting them. Eight are regexes with known answers in both directions, including the three this repository actually shipped. Fourteen more cover the folding: eight constructions that must resolve to an exact pattern, and six that must be refused with a reason --- a folder that quietly resolves nothing moves every construction into the unresolved list and the run still passes.

A probe that comes back wrong is a 1, like a finding: the gate ran and its verdict cannot be trusted. A failure to do the job at all is a 2 rather than a 1, because each of those leaves something unchecked --- a file that would not parse, a regex that could not be analysed, a crash --- and a 2 wins over a 1 when both happen in one run. That is the [convention for a gate's exit codes](Extending#conventions).

Exit codes: **0** no regex can backtrack exponentially (with `--self-test`, every probe was classified correctly); **1** a regex can backtrack exponentially, or a probe came back wrong (also `--self-test`); **2** the gate could not run, and 2 wins over 1: a refused command line, a file it could not parse, a regex it could not analyse, or a crash.

### check_code_regions.mjs
{: #check-code-regions }

    node scripts/check_code_regions.mjs [--verbose] [--self-test]

Verifies that no pre-render rewrite in `builder/render.mjs` alters the contents of a code fence, an indented code block or an inline code span. Tokenises every markdown file under `docs/`, applies the real rewrite chain, re-tokenises, and compares the code regions in order. No browser, no built tree, a couple of seconds.

The list of files comes from `lib/markdown-files.mjs`, which [`convert_em_dash_separators.mjs`](#convert-em-dash-separators), [`check_tree_fresh.mjs`](#check-tree-fresh), `scripts/lib/tb-fences.mjs` (and through it [`check_examples.mjs`](#check-examples)), `eval/nav_hops.mjs`, `eval/build_corpus.mjs`, `wisdom/extract/sitemap.mjs` and the builder's `write.mjs` and `serve.mjs` share. It never enters the build's output trees, so a running `serve.bat` cannot fail the gate: the preview deletes and rewrites `docs/_serve` on every rebuild, and a walk inside it at that moment fails with `ENOENT`.

Those rewrites run over **raw markdown**, before markdown-it has parsed anything, so none of them can tell prose from code --- and this site's subject matter is code. A rewrite without a code guard can print `If` / `ElseIf` / `Else` bodies flush left, drop the blank line between two examples, percent-encode a link's argument list inside a fence, or delete a YAML sample's closing `---`. **No other gate can see any of it**, because the damage sits inside `<code>` and the link, integrity, publish and accessibility checks all pass over it.

Probes ride along in the normal run, each a defect this repository actually shipped, and a passing run prints how many of each kind it ran. The corpus is clean, so a sweep that finds nothing is otherwise indistinguishable from a gate that has stopped detecting. It imports the rewrite chain rather than reconstructing it, which is what makes removing the code mask from one rewrite change what the gate runs.

The admonition probes test the mirror fault, which the region comparison structurally cannot see: **a rewrite that misreads what is code can also fail to fire on real prose**, and the regions still come back identical because the text was only stashed and restored. `Reference/Attributes.md` shipped all six of its admonitions as the literal text `[!NOTE]` for exactly that reason --- a `[Description(...)]` sample whose argument is a Markdown string containing two fence markers as twinBASIC string literals, which the fence stasher closed the surrounding fence on. Every pairing after it was off by one.

Four probes hold the rewrites that run over every page's rendered HTML, `render.mjs`'s `applyPostRenderRewrites` and `template.mjs`'s `injectAnchorHeadings`. A `<pre>` or `<code>` written as raw HTML must come through them as written, and a match outside it must still be rewritten. Code the renderer produced cannot match them, since its `<` is escaped; the probes are for raw HTML, which markdown-it passes through unchanged, and whitespace inside a `<pre>` is content.

It is also the gate on `lib/markdown.mjs` and `lib/frontmatter.mjs`, the modules that tell the tools what in a page is code and where its frontmatter ends. Their probes run with the others, and on every page the sweep checks that `blockRegions`, which parses blocks only, finds exactly the fences, code blocks and HTML blocks of a full parse. The summary line gives the number of fences that full parse found. Three more probes hold the build to the same answer: the rewrite chain must leave alone a fence that only the site's parser finds, and an admonition written inside one, and the build's check of `{{tbdocs:<name>}}` count names must skip names in code and give an unknown one's line in its file. One more holds the build's warning about a frontmatter value left unquoted that ends in `#`: `discover` must name the page and line of `title: Input #`, and say nothing about a quoted value. Another set holds [`convert_em_dash_separators.mjs`](#convert-em-dash-separators), which rewrites page source by hand rather than in the build, to converting prose and nothing else.

`--verbose` prints the first few altered regions of each failing file, before and after. `--self-test` replaces the normal run rather than adding to it, so neither the probes nor the sweep runs: it de-indents the body of one small fence by hand and passes only if the comparison notices. That proves the comparator can still see a change, and nothing more --- it runs no rewrite at all.

[When `test.bat` fails in `check_code_regions`](Extending#code-regions-altered) says what to change.

Exit codes: **0** no code region was altered, and every probe passed (with `--self-test`, the comparison detects the altered region); **1** a code region was altered, a probe failed or the two parses disagree (with `--self-test`, the comparison missed the altered region); **2** the gate could not run: a refused command line, or a crash.

### check_gate_lists.mjs
{: #check-gate-lists }

    node scripts/check_gate_lists.mjs
    node scripts/check_gate_lists.mjs --verbose
    node scripts/check_gate_lists.mjs --self-test

Two checks in one. It verifies that the two numbered gate lists on this page --- [`check.bat`](#checkbat) and [`test.bat`](#testbat) --- still name the same scripts, in the same order, as the wrappers that run them, and that each section's stated step count matches its own list. Then it sweeps `README.md` and every page under `docs/Documentation/` for a gate count stated in prose anywhere, and fails on any that disagrees with the wrapper. Pure text: no browser, no built tree, well under a second.

A gate scoped to one page guards one file, not every page that restates a count, which is why the sweep covers `README.md` and all of `docs/Documentation/`.

Three things follow from how it works. **The wrapper is the source of truth**, not the prose: a gate comparing the pages against each other would be satisfied by two pages that agree and are both wrong. **This page owns the lists**, and every other page cites these entries rather than restating them. And **the sweep reads per section, not per line** --- a count is often stated in a section whose only mention of the wrapper is the command line under its heading, so a line-by-line grep misses most sites.

When it fires on a count that is merely a subset --- *three cheaper gates run first* --- the fix is to delete the number rather than correct it. The command block or the linked list beneath it already states it, and a number nothing derives is a number that goes stale. The script's header names what the sweep deliberately does not see.

Its probes ride along in the ordinary run rather than hiding behind `--self-test`, because a green line from a gate that has stopped detecting looks exactly like a green line from a working one. Some probes are wrong gate lists, and the rest cover the sweep: count sentences as real pages word them, each of which must be reported, and correct ones, which must not. One puts a heading-shaped line in a code fence, as in [Wisdom](Wisdom)'s `staging.md` example, inside a wrapper's section, because such a line starts no section.

Exit codes: **0** the wrappers match the gate lists, every stated count agrees, and every probe passed; **1** a list or a stated count disagrees, or a probe failed; **2** the gate could not run: a refused command line, or a crash.

### check_ci_workflows.mjs
{: #check-ci-workflows }

    node scripts/check_ci_workflows.mjs

The same question as [`check_gate_lists.mjs`](#check-gate-lists), asked of the two CI workflows, which nothing else reads. It requires that `checks.yml` and `tbdocs-gh-pages.yml` each run every gate [`test.bat`](#testbat) and [`check.bat`](#checkbat) run, with the same arguments and in each wrapper's own order; that the two workflows run the same gate steps in the same order; and that each workflow's build passes every argument [`build.bat`](#buildbat) passes, plus `--no-fetch-assets`. A step dropped from a workflow, a gate added to a wrapper and never to CI, or a lost `--check-audit-index` would otherwise leave CI green over a check it had stopped making.

The gates both workflows share are one composite action, `.github/actions/run-gates/action.yml`, and the gate reads a workflow step that uses a local action as that action's own steps. A local action it cannot read is a finding, so a renamed action cannot take its gates out of CI unnoticed.

The differences that are meant are listed in the script, each with where it is recorded: `check_tree_fresh.mjs` runs only locally, because CI builds the tree in the same job; the two `check_links_diff.mjs` fixture steps run only in CI, one of them only in `checks.yml`; and the deploy build adds `--url` and `--baseurl`. CI may also interleave the two wrappers' gates, as long as each wrapper's own order holds. Anything else is a finding, and so is an allowance that no longer matches anything.

Its probes ride along in every run: each plants one defect in a small synthetic set of wrappers, workflows and actions --- a missing gate, a step no wrapper runs, two gates swapped, changed arguments, a build flag lost or added, a gate missing from the shared action, a workflow that stops calling it --- and requires exactly the findings it should produce. Pure text: no browser, no built tree.

Exit codes: **0** both workflows run every gate the wrappers run, and its own probes pass; **1** a workflow differs from the wrappers (a finding is listed), or one of its probes failed; **2** the gate could not run: a refused command line, or a crash.

### check_lint.mjs
{: #check-lint }

    node scripts/check_lint.mjs
    node scripts/check_lint.mjs --staged

Runs Biome, pinned to an exact version, over the tooling: `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `test/` and the site's two scripts in `docs/assets/js/`, less the exceptions that `biome.jsonc` at the repository root lists and explains. It runs `biome check`, which lints and checks formatting in one pass. The lint rules are the ones that find defects --- Biome's correctness and suspicious groups --- and none about style; the configuration names the few it turns off and the one it adds, `noUndeclaredVariables`, each with its reason, and declares the page globals --- `axe`, `Paged` --- only for the files whose code runs in that page. Moving and deleting code leaves unused imports and undeclared names behind, and nothing else reads the tooling for them. Style belongs to the formatter, whose settings are in the same file: a file it would change is a finding, and `npx biome format --write` fixes it. A literal table laid out by hand keeps its layout under a `// biome-ignore format:` comment with a reason. No browser, no built tree, a fraction of a second.

**Warnings fail as well as errors.** Biome reports an unused import or variable as a warning, and exits 0 on warnings, so a plain `npx biome lint` passes a file full of them. The gate also refuses to pass when Biome could not lint. Biome exits 1 for a broken `biome.jsonc`, as it does for a finding, and 0 for a scope that matches no script at all, so the gate reads the summary Biome writes beside its usual output to tell these apart.

Lint before every commit that touches one of those folders, or let the pre-commit hook do it. `.githooks/pre-commit` runs this gate with `--staged`, on the scripts the commit adds or changes, as they are in the working tree, and runs nothing else. Biome skips the staged scripts its scope excludes, and a commit that stages no script returns before Biome starts. Enable the hook in a clone with:

    git config core.hooksPath .githooks

A clone without the hook is still checked, because `test.bat` and both CI workflows run this gate over the whole scope. The commit that first applied the formatter changed only layout, and `.git-blame-ignore-revs` lists it so that `git blame` looks through it. GitHub reads that file by itself; a clone reads it once told to:

    git config blame.ignoreRevsFile .git-blame-ignore-revs

`npx biome lint --write` applies the fixes Biome marks safe. The fixes it offers for an unused import or variable are marked unsafe and need `--unsafe` as well, so read the diff after applying them.

Exit codes: **0** Biome found nothing (with `--staged`, also when no script is staged, so nothing was linted); **1** Biome found an error or a warning, or a file the formatter would change; **2** the gate could not lint: a refused command line, git or Biome failing to run, Biome checking no script over the whole scope, or a crash.

### search.test.mjs
{: #search-test }

    node --test test/search.test.mjs

Unit tests for the site search, run by Node's own test runner rather than as a script under `scripts/`. The first group builds search entries from small synthetic pages through `builder/search.mjs` and checks what each entry holds: the split at headings, the folding of generic sections such as See Also into the member they belong to, index marks, the join with the symbol index, and output that is the same byte for byte from one build to the next. The build's own check sees only which URLs the index covers. The rest are guards that the copies of the search client's query code still agree --- the online client under `builder/vendor/just-the-docs/`, the offline client in `builder/offline.mjs` and the replica in `eval/site_search.mjs`, all three or two of them --- and that the online client's index, built in slices, is the index lunr builds in one call. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

### render.test.mjs
{: #render-test }

    node --test test/render.test.mjs

Unit tests for the markdown-it plugins in `builder/render.mjs`, run by Node's own test runner through the site's own `createMarkdownIt`. The build compares whole pages, so a plugin that is wrong only on input no page holds passes it; these tests give each plugin such input. They cover the ellipsis plugin, which keeps the dots past the third in a run such as `....`, next to code spans, dashes, guillemets, quotes and autolinks. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

### strftime.test.mjs
{: #strftime-test }

    node --test test/strftime.test.mjs

Unit tests for `builder/strftime.mjs`, which formats the "Page last modified" line in a page's footer. That line is written only for a page that sets `last_modified_date`, and no page does, so no build calls the formatter and the build's output cannot catch a fault in it. These call it directly: the site's own format, the day of the year, an unknown token and a value that is not a date. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

### png.test.mjs
{: #png-test }

    node --test test/png.test.mjs

Unit tests for the pictures a bug reproducer carries (see [`bug_repro.mjs`](#bug-repro)). `scripts/lib/png.mjs` reads and writes PNG files, compares two pictures and draws the side-by-side image: these tests build PNG files by hand for each filter type, for RGB and for palette images, and check that a wrong checksum and every unsupported kind of file is refused, that `comparePngs` counts each differing pixel once, and that the comparison image has the size, the labels and the red pixels it should. `scripts/lib/repro-images.mjs` holds the files and judgements behind `images` and `expect.imagesDiffer`: the check of a reproducer's `PngDump` modules, the `Probe.vbp` line, and the rule that decides whether a run reproduces. The last group runs `bug_repro.mjs` itself over fixture reproducers in a temp folder (`BUG_REPRO_BUGS` names it), through `new --with-images` and the refusals of `verify`, which end before any IDE is looked for. No twinBASIC, no VB6, no browser, no built tree, a few seconds.

Exit codes: **0** every test passed, **1** a test failed.

### example-batches.test.mjs
{: #example-batches-test }

    node --test test/example-batches.test.mjs

Runs the probes of [`check_examples.mjs`](#check-examples) under Node's own test runner. They live in `scripts/lib/example-batches.mjs`, beside what they test: how samples are packed into projects, how a batch whose build crashed the compiler is cut down to the samples that crash it, the canary every batch carries, the fence classifier, and how a `check_run` sample is refused, read for what it says it prints, called and judged. `check_examples.mjs` runs them before every run too, but it needs a twinBASIC install, so it runs only by hand and never in CI. The probes need no IDE: crash isolation is driven through a fake lane whose builds crash on the samples a probe chooses. The same file also runs the probes of [`vb6run.mjs`](#vb6run), from `scripts/lib/vb6.mjs`: the `Debug.Print` rewrite on strings, comments, statement separators, single-line `If` and a bare `Debug.Print`, the generated modules, the reading of VB6's build log and the Windows-1252 encoding. It also holds the probes for a bug reproducer's VB6 project (see [`bug_repro.mjs`](#bug-repro)): which files go into its zip, what refuses a project (the `PngDump.bas` picture module among the sources that must pass), and the project file the build copy gets. They need no VB6. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

### ports.test.mjs
{: #ports-test }

    node --test test/ports.test.mjs

Unit tests for `scripts/lib/tb-ports.mjs`, which claims the DevTools ports that [`addin_test.mjs`](#addin-test), [`ide_test.mjs`](#ide-test) and [`try_help_addin.mjs`](#try-help-addin) start their IDEs on. A port is claimed with a lock file in `tb-ports` under the system temp directory before it is checked, and runs claim one at a time, so two runs started together never get the same one. Four child processes claim three ports each at the same time, from a range where one port is in use, one has the lock of a process that has ended and one the lock of a live process, and each holds its ports until all have claimed. The test checks that the claims are disjoint, that they are exactly the free ports with the stale lock taken over, and that each lock is gone once its process exits. Two more tests ask for more free ports than the range holds, which is refused with the port found unlocked again, and claim past the unfinished claim of a run that ended. Starts no IDE. No browser, no built tree, about 2 s.

Exit codes: **0** every test passed, **1** a test failed.

### check_page_baseline.mjs
{: #check-page-baseline }

    node scripts/check_page_baseline.mjs

Verifies the [page-count drift guard](Building#the-page-count-drift-guard) still refuses what it exists to refuse. Eleven probes against a scratch baseline file in the system temp directory, so nothing here touches `builder/page-baseline.json`. No browser, no built tree, well under a second.

The guard says nothing on a healthy tree, so every ordinary build sounds exactly like one whose guard has stopped working --- which is the whole reason this exists. The first probe is a whole package lost to a blanket `exclude:` rule, which a fixed floor on the page count would not notice. Two probes look redundant and are not. A **foreign source root must be ignored**: [`check_links_diff.mjs`](#check-links-diff) builds a three-page fixture tree, and a baseline keyed to nothing would report every other page missing. And **CI must refuse a missing baseline** rather than create one, because a run that wrote the file would record whatever drop it had been asked to catch.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

### check_book_coverage.mjs
{: #check-book-coverage }

    node scripts/check_book_coverage.mjs

Verifies the build still warns about a page [`docs/_book.yml`](Book-Configuration#pages-left-out-of-the-book) does not mention. Twelve probes over a manifest and pages built in memory, so nothing here reads `docs/`. No browser, no built tree, well under a second.

The warnings say nothing when every page has an entry --- in a part, or in `left_out:` with a reason --- which is also all a check that had stopped working would say. Without them, a whole section can drop out of the PDF with nothing to report it.

Eight probes give each of the five findings a fault to report: a page with no entry, a page in the book and in `left_out:`, an entry of each kind that selects no page, and a landing or foreword URL that names none. The other four hold the opposite: a consistent manifest reports nothing, and the three pages the book carries without a selector naming them --- a chaptered part's landing, a foreword, and the book page itself --- are never reported. Dropping any one emission site from `bookCoverage()` fails most of the twelve at once, and the probe named after that site says which.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

### check_symbol_index.mjs
{: #check-symbol-index }

    node scripts/check_symbol_index.mjs

Verifies the [symbol index](Building#the-symbol-index) still places each kind of symbol, and that its drift guard still refuses a URL the index has stopped publishing. Every probe is a fixture of its own --- a few lines of twinBASIC, a page or three, a scratch baseline file --- so it needs no built tree and no twinBASIC install, and never touches `builder/symbol-baseline.json`. Under a second.

A build that indexes the reference cleanly says nothing about the rules that did not fire on it, so each rule is asserted against the case that made it necessary. The `.twin` scanner's: a `Type` whose `Sub`s have bodies, an `Interface` line inside a `CoClass`, `[Hidden]` on a module whose members are global, a `$` name escaped in brackets. The derivation's: a member on a page of its own and under a heading, an inherited member found on its declaring type's page, a page filed under one module and declared in another, a `$` form, a `## Properties` heading on a type that has a `Properties` property, and the ellipsis the typographer puts in a Core page's heading. And the guard's: a lost anchor fails and is named, and CI never writes the list.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

### check_twin_parsers.mjs
{: #check-twin-parsers }

    node scripts/check_twin_parsers.mjs

Verifies the scanners that read twinBASIC source and the attribute reference still read the shapes each of them once misread. None of them says so when it misreads: a line read as the wrong kind is counted, generated or skipped as that kind. Every probe is a fixed input, so it needs no built tree and no twinBASIC install. Under a second.

The modifier words that may precede a declaration keyword are one list, in `scripts/lib/twin-declarations.mjs`, and a word missing from it makes the keyword after it invisible. So each word is run through all three scanners that use the list: the attribute census's `declarationKind`, `scripts/lib/twin-api.mjs`'s `parseTwin` and `scripts/lib/tb-fences.mjs`'s `classify`. The census's declaration kinds are asserted too, including an inline block comment before the keyword and a `Const` kept apart from a variable, and so are the targets `parseTargets` in `scripts/lib/attributes-doc.mjs` reads from an `Applicable to:` line, including the phrases that must be matched before the line is split on commas and "and".

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

### check_attribute_sweep.mjs
{: #check-attribute-sweep }

    node scripts/check_attribute_sweep.mjs

Verifies the logic of [`sweep_attributes.mjs`](#sweep-attributes), the tool that asks the compiler where every attribute is legal. None of that tool's failures announces itself: a site skeleton that is wrong reads as "every attribute is refused here", a control the classifier ignores reads as a recognised attribute, and a refusal taken for an acceptance is published as a finding about the compiler. The IDE is what cannot run here, so the parts that decide what an answer *means* live in `scripts/lib/attribute-sweep.mjs` and `scripts/lib/attribute-sites.mjs`, and every probe is a fixed input: no IDE, no built tree and no twinBASIC install. Under a second.

The probes cover, in turn: the site skeletons --- what each renders, that the attribute lands on the line `attributeLine` names, that every name a skeleton declares belongs to its probe alone, that a `$&` in an attribute is written literally, and that every site is in a family of `Applicable to:` targets or is listed in the gate as being in none, so a new site is a decision and not an accident; how a probe's diagnostics are read, including which refusal wins, what counts as accepted, the errors a skeleton draws by itself, and what the control's fold does and does not fold; which probe each of the compiler's rows belongs to; the argument shapes each name is tried in, and the batches, in which every probe appears once and none holds two of an attribute the compiler allows once per project; how probes become one cell per site, where a form nobody built and the `(False)` form must not decide the answer; and how an `Applicable to:` line is read and laid against the cells, including every `Applicable to:` line the page has, each pinned to the targets it reads to. The runner that isolates what goes wrong is probed with a scripted fake in place of the IDE, which is what lets a crash that names the probe, one that names an innocent one, one that needs two probes together, a hang, a disturbed canary, a stray error row and a build that could not run each be checked, along with the cap on every one of them; so are the preflight's verdict on a site and the comparison `--verify` makes.

A fault injected into the code the probes guard, one at a time, fails at least one probe.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

### check_cli.mjs
{: #check-cli }

    node scripts/check_cli.mjs

Verifies `lib/cli.mjs`, the module the tools read their command lines through, and each tool's recorded command-line errors. Nothing else tests how a tool reads its command line, and a hand-written parse reads a value flag given no value as `NaN` or as the next flag. No built tree, no browser, no twinBASIC install; a few seconds.

The module's probes cover what `parseCli` returns and refuses, with a comparison against a strict `node:util` `parseArgs` over the same argument lists, and what `numberOption`, `choiceOption`, `regexOption`, `urlOption`, `dateOption`, `refuseTogether`, `withUsageError` and `printHelpAndExit` do. The first five are how a tool reads a value after the parse, and `refuseTogether` refuses options that exclude each other. The parse is strict for every tool: `parseCli` refuses an unknown option, a boolean flag given a value, a value flag with no value, a positional beyond the count the tool declares, and an empty value unless the option allows one --- only `tbdocs`'s `--baseurl` does. The probes cover each refusal and the `--` that ends the options. They also cover the options `builder/command-line.mjs` returns for `tbdocs`, where `--no-check` makes the order of the flags matter; no case can, since each of those command lines starts a build.

The recorded cases are invocations that stop while the tool reads its command line, or at its first check of the project, folder, file or install the command line names, each with its exit code and what it prints on each stream: the tool's own words for the error exactly, a crash's only by the line that names the problem, and the opening of a usage text printed after it. Each case runs the tool as a child process, in an empty folder of its own (or one holding just the file the case writes there) and with `TB_IDE` and `PUPPETEER_EXECUTABLE_PATH` naming files that do not exist, so a case that gets past the command line fails on a different message rather than starting a twinBASIC IDE or a browser. A case belongs here only if the tool stops before doing any work.

Exit codes: **0** every probe and recorded case passed, **1** a probe or a recorded case failed, **2** the gate could not run: a refused command line, or a crash.

### check_pdf_shims_equiv.mjs
{: #check-pdf-shims-equiv }

    node scripts/check_pdf_shims_equiv.mjs

Verifies that the book's [pdf-lib patches](Fixes/PDFLib) write what pdf-lib itself writes. `book/render-book.mjs` loads Chromium's PDF, adds the metadata and the outline, and saves it, with a dozen shims replacing pdf-lib's parser, object classes and writer, and `parallelSave` in place of `save()`. This loads, changes and saves one document twice, with stock pdf-lib and with every shim `render-book.mjs` imports, each side in a process of its own, does the same for a document built with `PDFDocument.create`, and compares each pair of files object by object with every stream inflated, since `node:zlib` and pdf-lib's own deflate can compress the same bytes differently. It also checks each file's cross-reference entries against the objects they locate, since pdf-lib's own parser finds objects without them. No built tree, no browser; under a second.

The document is written by the gate, without pdf-lib, so the forms the shims' parsers branch on are known to be in it: names with `#` escapes, numbers in every lexical form, a classic cross-reference table, and an incremental update with an object stream and a cross-reference stream. The change mirrors `render-book.mjs`'s and adds what reaches the rest of the shims: text drawn on a page that has just been given a new key, which moves the page's entries in `fast-dict-onebuf`'s buffer and must keep the page's two flags with them, a page inserted and one removed, objects parsed early and edited late, and a call of each patched method the book does not make, its result written into the document so that the comparison checks it. The created document reaches the factories that build a page tree and a catalog. Each member of pdf-lib that a shim puts a function into is checked against `PATCHES`, a list in the gate. A listed member that is not patched fails it, and so does a patched member that is not listed: a patch applied to a copy of a class leaves pdf-lib's own member as it was. Each listed member's function must run, unless the list marks the member as one neither document reaches and says why, and a marked member that runs fails the gate as well, so the marks stay true. A shim none of whose functions runs is reported whole, since the documents then no longer test it, or the book does not need it. Each patched member must also be in the table of targets its shim passes to `checkTargets` (`book/lib/shim-targets.mjs`), the check that stops the import when pdf-lib's own version of a member changes: a patch whose member is missing from the table would let a pdf-lib update change it unnoticed, so the gate fails and names the shim and the member. On a difference, that document's shimmed side runs again with each shim alone and with each left out, and the report names the shims that make it.

Exit codes: **0** the shims write what stock pdf-lib writes, and every shim and patched member is reached, as listed and in its shim's table; **1** a pair of files differs, a shim or patched member is no longer reached, or a patched member is not as listed or not in its shim's table; **2** the check could not run: a refused command line, a failure of the check itself, or a crash.

### check_impexp_parity.mjs
{: #check-impexp-parity }

    node scripts/check_impexp_parity.mjs

Verifies that the two editions of the [impexp tool](#impexp), `scripts/impexp.mjs` and `scripts/impexp.py`, behave the same, as that section promises. Both `--self-test` suites must pass, with the same test names in the same order. Then one sequence of commands runs through each edition, each in a scratch folder of its own holding copies of `indexer/sample.twinpack` and `test/example-projects/console`: export and import, the printing commands, and each refusal, failure and warning the exit codes name. After every command, both editions must give the exit code the command is there for, print the same on each stream, and leave the same files, compared as bytes. On Windows, Python writes CRLF to the console, so there a CRLF in the printed output is read as LF on both sides; on Linux, as in CI, the output is compared as written. About four seconds, most of it Python starting once a command.

Without Python 3.6 or later on the `PATH` (it tries `python3`, then `python`, then `py -3` on Windows), the gate prints `SKIPPED` and exits 0, so `test.bat` passes on a machine without Python. When `CI` is `true`, as GitHub sets it, the same case fails instead: CI must compare the two.

Exit codes: **0** the two editions agree, or the check was skipped because no Python was found; **1** the editions differ, or a built-in test failed; **2** the check could not run: a refused command line, no Python when `CI=true`, or a crash.

### check_axe_patch_equiv.mjs
{: #check-axe-patch-equiv }

    node scripts/check_axe_patch_equiv.mjs [--patch NAME]

Value-equivalence check for the vendored axe source patches. Builds the same colours under the stock and patched bundles and compares every derived value `color-contrast` consumes. This is the companion to the [fingerprint gate](#check-a11y-fingerprint), and both are needed: the fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification would sail straight through it. Run it before adopting a new `SOURCE_PATCHES` entry and after **every** axe-core upgrade --- the patches are pinned to the bundle's current text, and an upgrade needs this gate *and* the fingerprint gate, never one of the two. See [Upgrading axe-core](#upgrading-axe-core) for the sequence.

Exit codes: **0** the patched bundle gives the same colour values as stock axe, **1** at least one colour value differs, **2** the check could not run: a refused command line, or a crash.

### check_a11y_fingerprint.mjs
{: #check-a11y-fingerprint }

    node scripts/check_a11y_fingerprint.mjs --list
    node scripts/check_a11y_fingerprint.mjs [--candidate <scheme>] [--baseline <scheme>]
                                            [--patches <name>] [--unminified]
                                            [--root-dir <path>] [--pages <list>]
                                            [--theme <t>] [--viewport <v>] [--out <file>]

The gate for any change to *what the scan runs*. axe is the site's correctness oracle, which makes it dangerous to tune: a change can make axe see **less** and still report a clean pass. Blocking `just-the-docs.js`, for example, makes the scan faster and quietly cuts the colour-contrast nodes axe examines on one page to almost none. This runs the full page × theme × viewport matrix twice, once under each of two named schemes from `axe-scan.mjs`'s registry, against one build in one process, and diffs the findings audit by audit (violations by `ruleId:nodeCount`, incomplete by rule-id set).

Two limits worth knowing. It compares a candidate against a baseline produced by that same scheme's element set, so it **cannot** detect a change that stops auditing elements entirely --- anything touching viewport, visibility or request blocking has to be argued from source instead. And it compares *which* findings axe produces, never their shape, so a scheme that passes every audit can still crash the reporter. Necessary, not sufficient. Both `--baseline` and `--candidate` default to `production`, so a bare run is already that A/A control --- run it after touching the matrix. Each must name a scheme that `--list` prints, and `--patches` a list of the patches it prints.

Exit codes: **0** every fingerprint is identical, or `--list` printed the schemes; **1** at least one fingerprint differs; **2** the check could not run: a refused command line, or a crash.

#### Upgrading axe-core
{: #upgrading-axe-core }

`package.json` pins `axe-core` exactly --- no caret --- because the source patches are pinned to the bundle's current text and roughly fifty line citations in `builder/PLAN-axe-perf.md` are pinned to its current layout. A bump is therefore a deliberate act, and it needs **both** gates. Neither is implied by the other, and each needs Chromium and an up-to-date `_site-offline/`:

    node scripts/check_a11y_fingerprint.mjs --patches plain-color-fields
    node scripts/check_axe_patch_equiv.mjs

The first asks whether the patched bundle still *finds* what the stock one finds, across the full page × theme × viewport matrix. `--patches` is what makes it ask that. Without the flag each side runs its own scheme's patch list, and since every scheme inherits `DEFAULT_PATCHES` the two sides would share a bundle --- a no-op for this question. With it the flag overrides both: stock on the baseline, the named patches on the candidate. It also selects the unminified bundle for the patched side on its own, so `--unminified` is not part of this run.

Read that diff as **news, not as a regression to be suppressed.** axe ships new and revised WCAG rules between minors, so a bump can legitimately change what the scan reports. The gate exists to make the change visible, not to freeze coverage where it is.

The second asks whether the patched bundle still *computes* what the stock one computes, and it is the half a reader is most likely to skip --- `test.bat` and both CI workflows run it, so a bump that breaks it surfaces as a red PR rather than as something the upgrade asked for. It is not optional for a patch to the colour maths, because the fingerprint gate compares `incomplete` as a rule-id *set*: a colour error that shifted contrast ratios without flipping any pass/fail classification produces the same set and sails through. `--patch` defaults to `plain-color-fields`, the single entry `DEFAULT_PATCHES` carries; name another, an entry of `SOURCE_PATCHES`, when adopting a new one.

A third failure mode needs no gate at all: each substitution inside a patch asserts its target was found, so a bump that moves the code fails loudly rather than silently reverting to the slow path. What none of the three reaches is a result that merely looks wrong. [`check_a11y.mjs --stock-axe`](#check-a11y) injects the unmodified bundle, which says in one command whether the patch is implicated.

### sweep_a11y.mjs
{: #sweep-a11y }

    node scripts/sweep_a11y.mjs [--theme <t>] [--viewport <v>] [--filter <substr>]
                                [--limit N] [--resume] [--report] [--out FILE]
                                [--root-dir DIR] [--stock-axe] [--recycle-every N]

The full-site accessibility sweep: every page, both themes, both viewports --- 3,476 audits, roughly 20 minutes. The thirteen-page sample exists because this is too slow for a commit gate, but the sample can only report on constructs it carries, and when the sample was six hand-picked pages this sweep found **six violation classes on 54 pages**, every one in a construct the sample could not see. Run it after any change that moves type metrics or page structure, and when adding a construct family to [`pick_a11y_sample.mjs`](#pick-a11y-sample). Note it audits every page with disclosures **closed** only; the open-state coverage is the sample scan's `STATE_AUDITS`.

Exit codes: **0** no accessibility violation was found, **1** the sweep found at least one violation, **2** a refused command line (a bad `--theme` or `--viewport` included), or a crash.

### build_fonts.py
{: #build-fonts }

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

Regenerates the subset webfonts under `docs/assets/fonts/` from pinned upstream releases (SHA-256 verified), pinning the optical-size axis and keeping `wght` variable. Development tooling only: the `.woff2` files are committed like the generated DOT SVGs, and `build.bat` needs neither Python nor a network connection --- though the PDF pass aborts if one of the faces it needs is missing from the source tree, naming this script. **Regenerating Inter means regenerating the diagram metrics too** --- see below. Changing a face rather than refreshing one reaches well beyond this script; [Changing a typeface](Builder#changing-a-typeface) lists every place the build names one. The script takes no options except `-h` and `--help`, which print the usage and start nothing.

Exit codes: **0** the faces were written; **1** a dependency is missing, an archive's SHA-256 differs from the pinned one, or a build step failed; **2** a refused command line.

### build_dot_metrics.mjs
{: #build-dot-metrics }

    node scripts/build_dot_metrics.mjs            # regenerate
    node scripts/build_dot_metrics.mjs --check    # fail if stale

Measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, the table `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The widths are measured from the committed `.woff2` files rather than read out of the font binary, because the browser's shaped advance is the number the layout has to match. Development tooling; the JSON is committed and the build never runs the generator. Run it after [`build_fonts.py`](#build-fonts) touches Inter --- forgetting is not silent, but it surfaces as [`check_dot_fit.mjs`](#check-dot-fit) failing rather than as anything naming the metrics. It measures Inter by name, so giving the diagrams a different face means editing this script, not only rerunning it; see [Changing a typeface](Builder#changing-a-typeface).

Exit codes: **0** the table was written or is unchanged (with `--check`, it is current); **1** with `--check`, the table is stale; **2** a refused command line, a browser that would not start, or a crash.

### build_package_api.mjs
{: #build-package-api }

    node scripts/build_package_api.mjs            # regenerate
    node scripts/build_package_api.mjs --check    # fail if stale

Writes `builder/package-api.json`: every type the packages of a twinBASIC install declare, public or not, and the public members of each with their kinds. The [symbol index](Building#the-symbol-index) takes its entries from the pages and this file annotates them --- the kind of a member documented on a page of its own, an enumeration's values, the interface a CoClass's members are declared on --- and says which public symbols no page documents. Development tooling like [`build_dot_metrics.mjs`](#build-dot-metrics): the JSON is committed and the build never runs the generator, because running it needs a twinBASIC install, so it is Windows-only in the way [`census_attributes.mjs`](#census-attributes) is. Run it when the reference is re-indexed against a newer build, and commit the result with the pages.

It shares [`census_attributes.mjs`](#census-attributes)'s export and cache, and takes the same `--ide`, `--exported`, `--cache` and `--refresh` flags; `--out` writes elsewhere. Packages are keyed by the name code uses for them --- the project name, which is not always the folder's: TwinBasicAssertions is `Assert`, and the three CEF builds are one `cefPackage`, whose APIs the tool checks are identical.

Exit codes: **0** the file was written (with `--check`, it is up to date); **1** with `--check`, the file is stale; **2** a refused command line, no install, an export that failed, packages that declare different APIs under one name, or a crash.

### convert_em_dash_separators.mjs
{: #convert-em-dash-separators }

    node scripts/convert_em_dash_separators.mjs            # rewrite in place
    node scripts/convert_em_dash_separators.mjs --check    # report, change nothing

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to the ASCII source forms markdown-it's typographer converts at build time (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips what the site's parser reads as code --- fences, indented code blocks and HTML blocks, found through `lib/markdown.mjs` --- and inline code spans, and preserves each file's existing line endings. Its probes run in [`check_code_regions.mjs`](#check-code-regions). `--check` reports what it would change without writing, so it can serve as a gate.

Exit codes: **0** the dashes were converted (with `--check`, there were none); **1** with `--check`, a file holds a literal dash; **2** a refused command line, or a crash.

### survey_tooling.mjs
{: #survey-tooling }

    node scripts/survey_tooling.mjs                  # the summary, then every listing
    node scripts/survey_tooling.mjs --summary        # the summary only
    node scripts/survey_tooling.mjs --root <dir>     # measure another checkout

Measures the repository's own tooling for repetition and structure: code duplicated between files, found token by token so that two copies differing only in names still match; top-level functions defined under one name in several files; how the command-line tools read their arguments; packages imported without being declared in `package.json`; and the import graph --- the imports that cross from one directory to another, the files nothing imports, and the most imported modules. `builder/PLAN-TOOLING-REVIEW.md` records its summary at the commit the tooling review started from, and the review's last phase runs it again to compare.

It is not a gate, and nothing runs it: take a measurement before and after a piece of refactoring. It reads only the files git tracks, so a scratch file never changes a number. `--root` measures another checkout, such as a worktree at an older commit that does not contain the script. `perf/` is measured, but it is counted separately in the summary and left out of the listings unless `--include-perf` is given.

Exit codes: **0** the survey was printed, **2** a refused command line, a folder that is not a git checkout, or a crash.

### compare_trees.mjs
{: #compare-trees }

    node scripts/compare_trees.mjs                      # HEAD against the working tree
    node scripts/compare_trees.mjs --before <ref>       # any commit against the working tree
    node scripts/compare_trees.mjs --keep               # leave both trees and both build logs
    node scripts/compare_trees.mjs -- --baseurl /docs   # extra tbdocs arguments, for both builds

Builds the site twice and compares the online, offline and PDF trees file by file, byte for byte: once at a commit, `HEAD` unless `--before` names another, and once from the working tree as a commit would hold it, untracked files included. It is the check for a change to `builder/` that should leave the output alone, and for one that should not, whose differences ought to be the intended ones and no others.

Both builds run from git worktrees under `.compare-trees/` at the repository root, which is gitignored, and neither touches the index or the working tree. Building the working tree in place would not do: under `core.autocrlf` a fresh checkout writes CRLF where files a tool has rewritten hold LF, and every file the build copies verbatim would then differ. Both builds run `tbdocs --no-fetch-assets` with `CI=1`, so the committed baselines are read and never written.

Three regions differ between any two builds and are replaced before the comparison: the build's own timings in `assets/images/gantt.svg`, the same chart inlined into the [Build Info](BuildInfo) page, and the PDF title page's build line, which holds the build date and the commit. Everything else must match. A run takes about ten seconds on the development box. It is not a gate, and nothing runs it. A failed run leaves `.compare-trees/` for inspection, and the next run removes it.

Exit codes: **0** the trees match; **1** the trees differ; **2** a refused command line, a git command or a build that failed to produce its tree, or a crash.

### tbbuild.mjs
{: #tbbuild }

    node scripts/tbbuild.mjs <project.twinproj> [--ide <twinBASIC.exe>] [--port N]
                             [--arch win32|win64] [--timeout S] [--build | --llvm]
                             [--json] [--keep] [--show|--hide]

Compiles a `.twinproj` and prints its diagnostics, with no IDE window to click through. This is how a claim the documentation makes about the language gets checked against the compiler rather than against memory: write a one-module project that uses the construct in the position you are asking about, run this, and read what comes back. Windows only, and no part of the site build.

twinBASIC has no command-line build. The compiler executable's whole surface is six verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- and none of them builds. The IDE executable does take `--buildAndExit32` and `--buildAndExit64`, and both are worse than useless unattended: they write nothing to stdout or stderr, exit 0 when the error is in code nothing calls, and do not exit at all for an error the build reaches. So this drives the IDE. Its user interface is a WebView2 page and WebView2 honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, so the IDE starts with a Chrome DevTools port and is driven over CDP. The diagnostics come from the IDE's own *copy compilation error report* walk with the clipboard write removed, so the text is exactly what that command gives a person.

| Flag | Effect |
|---|---|
| `--ide <path>` | Path to `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` folder on `%USERPROFILE%\Desktop`, which is where the IDE's own zip says to unpack it. **No install path is hardcoded anywhere in this tooling** --- an install path contains a username --- so an install kept elsewhere needs one of those two. |
| `--port <n>` | DevTools port. Default 9333. It also names the WebView2 user-data folder, the IDE's temp folder (`%TEMP%\tbbuild-tmp-<n>`, its `TEMP` and `TMP`) and the private desktop, which is what makes concurrent instances possible: IDEs building at once in one temp folder fail now and then to write the type library. A port another IDE already holds --- another run's, or another session's --- is refused after ten seconds, rather than attached to. |
| `--arch <target>` | The target to compile for, `win32` or `win64`. Default `win32`. The diagnostics can differ between the two, because `#If Win64` and the size of `LongPtr` change what compiles. The target is set on every run, because the IDE opens a project in whatever target it last used for that project. Switching restarts the compiler, which then compiles the project again, so a switch adds a few seconds. When the target is not `win32`, or the IDE remembered another one for the project, the report starts with a `target:` line. |
| `--timeout <secs>` | Give up waiting for the compile to settle. Default 180. |
| `--build` | After a compile with no errors, build the project, as the toolbar's Build button does, and print `built: <file>` after the summary line. The project is exported and packed again first (see below), so the given file is never changed. |
| `--llvm` | Build with LLVM: `--build`, with the project's compiler options set to `+llvm`. It is refused, with exit 2, on a Community or Personal licence, which would build with the default compiler and say nothing. Without it, `--build` is the control for an `--llvm` run. |
| `--json` | Emit one JSON object --- the target, counts, diagnostic rows, the text of any alert the IDE opened, which is dismissed so the compile can go on, and `built` (the file a build wrote, or null) and `buildLog` --- instead of lines of text. |
| `--keep` | Leave the IDE running afterwards, and print its pid as `ide-pid: <n>`, followed by the `taskkill` command that ends it and every process it started, as cmd and PowerShell spell it and as Git Bash does (`//PID`). The IDE's registry entries for the project are then left as they are, because the IDE is still writing them. |
| `--show` / `--hide` | Put the IDE on your own desktop where you can watch it, or on a private one where it cannot take focus. Hidden is the default unless `TBBUILD_SHOW` is set to something other than `0`, `false` or `no`; the two flags override that for one invocation. |

**A compile does not generate code, and a build does.** The compiler's front end accepts a construct that its LLVM code generation refuses ("a feature used in your code is not yet supported with the LLVM compiler"), so a clean compile says nothing about an LLVM build. `--build` and `--llvm` press Build after the compile and read the build log. The default build path of a packed project opens a *Save* dialog that a private desktop hides, so either flag first exports the project into `%TEMP%\tbbuild\<port>\src`, packs a copy with an explicit build path under `%TEMP%\tbbuild\<port>\out` and a project id of its own, and opens that copy. A project with compile errors is not built: the report is the compile's, with exit 1. A build that fails, or that ends the compiler with a native exception, prints the build log on stdout and the failing line on stderr, and exits 5. A `[RunAfterBuild]` procedure runs during the build, and the log it would erase with `Debug.Cls` is kept and read all the same.

**It runs the IDE on a private Windows desktop, and that is not decoration.** The IDE calls `HostForceFocus()` from its own `window.onload`, so it takes the keyboard whatever window style it starts with --- `start /min` was tried and the window still came to the front. A process on another desktop has no foreground to take, and the compile does not care whether anything is on screen. Hidden by default has one real cost. A wedged IDE on a private desktop is invisible to the person debugging it, and the only way to see anything is to run it again visible. Export `TBBUILD_SHOW=1` for a session you are working through interactively, and leave it unset for unattended runs.

**One IDE handles one project.** Loading a second project into a running IDE wedges it, so a fresh IDE per project is the design rather than a convenience. It costs roughly 6 to 8 seconds each on a development box and is flat in project size, because what is being paid for is IDE startup and not compilation. Concurrency is the way to make a batch of probes fast: distinct `--port` values give distinct DevTools ports, user-data folders and desktops, so instances do not collide. Keep a question that might crash the compiler in a project of its own, so the answer is attributable and one bad probe cannot cost the rest of the batch its run.

**The IDE it starts ends with it.** The IDE runs inside a Windows job object, so when `tbbuild` ends --- finished, failed, or stopped with Ctrl+C --- every process the IDE started ends too. That includes a compiler the IDE was restarting after a crash, which a plain process-tree kill can miss and leave running. Two exceptions: under `--keep` the IDE runs outside the job and lives until you close it, and under `--show` it is started directly on your desktop, without the job.

**It leaves the IDE's own settings as it found them.** Every IDE it starts writes to the same registry keys as your own IDE: a saved state for the project (open tabs, watch expressions, Debug Console history), a place at the top of the recent-projects list, and, when the run switches the target, the target the IDE remembers for the project. Once the IDE has exited, `tbbuild` puts all three back. An entry the run created is deleted, and a project that already had one --- one of your own --- gets its old state, its old place in the list and its old target back. The `.twinproj` file association is restored too, if the IDE changed it. When [`check_examples.mjs`](#check-examples) or [`sweep_attributes.mjs`](#sweep-attributes) builds many projects, it does this once for all its lanes instead.

Seven files under `scripts/lib/` belong to it and are never run directly. `tb-build.mjs` is `tbbuild` without its command line: `compileProject` opens a project in the IDE and returns its diagnostics as an array, which is how `check_examples.mjs` and `sweep_attributes.mjs` build many projects without starting a process for each. It never exits the process and never tidies the registry, so its caller owns both. `tb-ide.mjs` holds the mechanics `tb-build.mjs` and `tbrun.mjs` share: starting the IDE, attaching to it, waiting for the compile, and reading the diagnostics. `tb-ide-console.mjs` reads the IDE's DEBUG CONSOLE, which is where `tbrun` finds what a probe printed. `tb-run.mjs` presses Build and reads that console until a `[RunAfterBuild]` Sub has finished, and checks what was erased for a failed build; `tbrun` and `check_examples.mjs`'s `check_run` capture a run with it, so they capture it the same way. `tb-registry.mjs` records and restores the registry entries described above, through .NET's registry API by way of PowerShell, because `reg.exe` mangles any path holding a character outside the console code page; [`check_tb_registry.mjs`](#check-tb-registry) is its self-test. `tb-cdp.mjs` is a minimal CDP client over Node's global `WebSocket`, raw rather than puppeteer because a pending `alert()` blocks the renderer and puppeteer's `connect()` handshake talks to the renderer --- so it hangs on precisely the state you need to recover from. Every call it makes has a time limit, so a blocked page ends a run with a message rather than holding it forever. `tb-launch.ps1` holds the Win32 calls Node cannot make without a native FFI addon: `CreateDesktop` and `CreateProcess` with `STARTUPINFO.lpDesktop` for the private desktop, and the job object described above. It is the only PowerShell file under `scripts/`, and it is not executed as a file: `tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so the execution policy never comes into it and nobody has to be told to bypass one.

Exit codes: **0** the project compiled without errors; **1** the project has errors; **2** a refused command line (a path that is not a `.twinproj` included), a project file that cannot be read (empty, cut short or not a project at all: it is read before an IDE starts, and the message names the file and what is wrong), no IDE, an IDE that did not start or expose a debug port, a project that could not be exported or packed, an `--llvm` run on a Community or Personal licence, or a crash; **3** the compile never settled: the IDE did not report the project open, or its diagnostics did not match its status bar; **4** the project crashes the compiler; **5** the build failed after a clean compile.

### tbrun.mjs
{: #tbrun }

    node scripts/tbrun.mjs <source-dir> [--port N] [--arch win32|win64] [--timeout S]
                           [--quiet MS] [--json] [--raw] [--keep] [--no-reap]
                           [--reap-images a,b] [--show|--hide]
                           [--llvm | --compiler-options S] [--exe] [--allow-name-clash]

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

**A build that fails after a clean compile is a failed run**, with the IDE's build log printed
as the reason. The probe never runs then, so the console still holds that log --- `[BUILD] failed`,
often after `[TYPELIB] failed to finalize typelibrary` --- and `tbrun` does not return it as the
probe's output. Run it again: such a failure can pass on a second run.
A `[RunAfterBuild]` Sub that fails code generation is a failed run the same way: the build succeeds,
the console adds `[LINKER] compilation (codegen) error detected in '<module>.<procedure>'`,
and nothing in the Sub runs, `Debug.Cls` included. A procedure the probe *calls* that fails
code generation is a failed run as well. Its error line is written before the probe's first
statement, so the probe's `Debug.Cls` erases it, and the probe stops at the call. `tbrun`
keeps what each clear erases, so it names that line and prints the output up to the call.

**A probe that ends before it returns is a failed run, exit 5**, with what it printed
printed all the same. `End` ends a probe that way, and so does an error raised with no
handler in a procedure compiled with LLVM, which ends the run without a report. In the
staged copy, `tbrun` moves the `[RunAfterBuild]` attribute to a Sub it adds to the same
module, which calls the probe's Sub and then prints a line of its own. That line is missing
when the probe did not return, and it is never printed. A probe that leaves a form loaded
has returned too: the IDE prints `[DEBUGGER] Waiting for remaining forms to close...` after
that line, and `tbrun` prints it. The attribute is replaced with
spaces, so the line and column numbers in a diagnostic are still the ones in your file.
`tbrun` warns when it cannot add the wrapper --- the Sub is in a class, takes parameters, or
is one of several marked --- and the check is then off. A probe that stays silent for longer
than `--quiet` while it works also ends the wait without that line, so raise `--quiet` for a
slow one.

**A probe whose module holds a procedure named like the module is refused, exit 2**, before
an IDE starts. In twinBASIC (BETA 997) the `[RunAfterBuild]` Sub of such a module does not run,
whatever the letter case or modifiers of the procedure, and nothing says so, so the run would end
as a probe that stopped early. Rename the module or the procedure. `--allow-name-clash` runs the
probe anyway, which is what a reproducer of that defect needs.

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

**`--llvm` compiles the whole probe with [LLVM](../../LLVM/)**, with no
`[CompilerOptions("+llvm")]` on each procedure. It sets the project's compiler options in the
staged copy: `compiler.debugOptions`, which the `[RunAfterBuild]` run is compiled with, and
`compiler.buildOptions`, which the exe is. `--compiler-options` sets both to any other
string, such as `"+llvm +optimize"`. A run that uses LLVM --- through either option, the
tree's own settings or a procedure's `[CompilerOptions]` --- is refused when the IDE shows a
Community or Personal licence. Neither of those compiles your code with LLVM, so the run would
test the default compiler.

**`--exe` also runs the exe the build wrote**, after the probe has run in the IDE. It
starts the exe on a private desktop, as it starts the IDE, so a message box the exe opens
appears on no desktop you use, and it closes every box the exe opens by pressing OK, printing the box's title and text: an unhandled error in an exe opens a box and waits. It also ends the exe at `--timeout`. The exe runs its
`Sub Main`, not the `[RunAfterBuild]` Sub, so a probe for both gives the tree a `Main` that
calls the probe, and leaves out the template's own module with an empty `Main`. A built exe
writes nothing with `Debug.Print`, so the probe prints with `TbRun.Out`, from a module `tbrun`
adds to the staged copy. `TbRun.Out` writes to the Debug Console in the IDE, and to a file
`tbrun` reads in the exe. The exe's exit code, the fault the Windows Application log records for it, if any, the boxes it opened, and its lines follow the probe's output.

| Flag | Effect |
|---|---|
| `--port <n>` | DevTools port for the IDE. Default 9346. Distinct ports let probes run concurrently --- the staging directory and the project id are keyed to it, so two runs never share a workspace. A port another IDE holds is refused, as for `tbbuild`. |
| `--arch <target>` | The target to build for, `win32` or `win64`. Default `win32`, set on every run, as for `tbbuild`. A `win64` probe runs as a 64-bit process. |
| `--timeout <secs>` | Give up waiting for console output. Default 120. |
| `--quiet <ms>` | How long the console must stop changing before the output counts as complete, when the probe has not returned. Default 2500. Raise it well above the default for a probe that drives an out-of-process server, which can take longer than that to start. |
| `--llvm` | Compile the whole probe, and the exe, with LLVM. The same as `--compiler-options +llvm`. |
| `--compiler-options <s>` | The project's compiler options, for the run and the exe. |
| `--exe` | Also run the built exe, and print what it writes with `TbRun.Out`, its exit code, the fault the event log records for it, and the boxes it opened, each closed with OK. |
| `--allow-name-clash` | Run a probe whose module holds a procedure named like the module, which is refused otherwise. twinBASIC does not run its `[RunAfterBuild]` Sub, so the run exits 5. |
| `--raw` | Keep the console's timestamp column, which is otherwise stripped. |
| `--json` | One object with the path of the built file, the target, the captured lines, whether the probe returned, the licence an LLVM run checked, the exe's run, the IDE pid and anything reaped. |
| `--keep` | Leave the IDE running, and print its pid as `ide-pid: <n>` (with `--json`, `idePid`), followed by the `taskkill` command that ends it and every process it started, as cmd and PowerShell spell it and as Git Bash does (`//PID`). Implies `--no-reap`, and leaves the IDE's registry entries for the probe as they are. |
| `--no-reap` | Do not harvest automation servers the probe left behind. |
| `--reap-images <a,b>` | Replace the harvested image list. Default is the Office suite. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild): your own desktop or a private one, with `TBBUILD_SHOW` setting the default. |

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
writes. **A probe builds for the target `--arch` names**, whatever the IDE remembers, so a
kept IDE switched to `win64` does not make later runs on the same port build 64-bit.

Exit codes: **0** the probe ran and its output was captured; **1** the project has compile errors (the diagnostics are printed); **2** a refused command line (a source folder that is missing or has no `Settings` file included), no IDE, an IDE that did not start, a compile that never settled, a build that failed after a clean compile, a probe that never ran or stopped at a procedure that failed code generation, an LLVM run on a Community or Personal licence, an `--exe` run with no exe built, or a crash; **3** no output: the console held none before the timeout, or the probe printed none after its last `Debug.Cls`; **4** the compiler crashed, or restarted twice, while compiling the project; **5** the probe ended before it returned, its output printed all the same; **6** under `--exe`, the exe exited with a code other than 0, the Application event log records that it faulted, it opened a box (which `tbrun` closed), or it was still running after `--timeout` and was ended, its output, exit code, fault and boxes printed all the same. A run that would exit 5 exits 5 whatever the exe did.

### bug_repro.mjs
{: #bug-repro }

    node scripts/bug_repro.mjs new <slug> "<entry title>" [--template <name>] [--with-vb6] [--with-images]
    node scripts/bug_repro.mjs pack <slug>
    node scripts/bug_repro.mjs compile|build|run <slug> [--ide <twinBASIC.exe>] [--port N]
                               [--arch win32|win64] [--timeout S] [--llvm] [--exe] [--keep] [--show|--hide]
    node scripts/bug_repro.mjs vb6 <slug> [--vb6 <VB6.EXE>] [--timeout S] [--keep]
    node scripts/bug_repro.mjs verify [slug ...] [--ide <twinBASIC.exe>] [--port N] [--timeout S]
                               [--jobs N] [--show|--hide]
    node scripts/bug_repro.mjs file <slug> <issue> [--existing]
    node scripts/bug_repro.mjs file --marked

Keeps the reproducer projects of `BUGS-TO-REPORT.md` --- one folder, `bugs/<slug>/`, for each
entry, or `bugs/filed/<slug>/` once the entry has been filed upstream --- and puts them in
front of the compiler. A slug is kebab-case, lowercase letters and digits joined by single
hyphens, and anything else is refused, as is `filed`. A slug that exists in both places is an
error, exit 2. Like [`tbbuild.mjs`](#tbbuild)
and [`tbrun.mjs`](#tbrun), which it runs, it needs a twinBASIC install and Windows. It is
outside every gate and outside CI, and `verify` is run by a person only.

| Command | Effect |
|---|---|
| `new <slug> "<title>"` | Creates `bugs/<slug>/src/` from the console template under `test/example-projects/`, with the project named after the slug in PascalCase, a fresh project id, the description `Reproduces: <title>` and a `Startup` module holding an empty `Sub Main`. Also writes `bugs/<slug>/repro.json` with `"mode": "manual"`. Refused, with exit 3, when `bugs/<slug>` exists. `--template <name>` starts from a folder of `test/repro-templates/` instead: its `Settings`, with the same four keys rewritten, and its `Sources/` as they are. `webview2-form` is a form holding one WebView2 control, which opens `about:blank` when the control is ready and closes when that navigation completes, shown modally by `Sub Main`. `--with-vb6` also creates `bugs/<slug>/vb6/` from the VB6 template in `test/repro-templates/vb6/`: `Probe.vbp` and `Module1.bas`, whose `Sub Main` opens `out.txt` beside the exe, prints one line under an error handler and closes. `--with-images` also copies `PngDump.twin` from `test/repro-templates/png/` into `src/Sources/` and, with `--with-vb6`, `PngDump.bas` into `vb6/` with its `Module=PngDump; PngDump.bas` line in `Probe.vbp`, and writes `"images": ["main"]` into `repro.json`. |
| `pack <slug>` | Packs `src/` into `<slug>.twinproj` with [`impexp.mjs`](#impexp), called directly, and prints the lines that `impexp.mjs import` prints. It then writes `<slug>.zip` holding that file and the files `repro.json`'s `attach` names. The zip is written by the script itself, so neither PowerShell nor 7-Zip is needed. When `bugs/<slug>/vb6/` exists, it also writes `<slug>-vb6.zip`, holding the source files of that folder (`.vbp`, `.bas`, `.cls`, `.frm`, `.frx`, `.ctl` and `.ctx`) and nothing else, so an exe or an output left there is not zipped; the files left out are named. A `vb6/` with no `Probe.vbp`, or whose sources call `MsgBox` or `InputBox`, is refused. The zip also holds every file of `images/`, and `pack` prints the path of each `<name>-compare.png`, the pictures to put in the issue. |
| `compile <slug>` | Packs, then compiles the project with `tbbuild --json` and prints its diagnostics. |
| `build <slug>` | Packs, then compiles and builds it with `tbbuild --build`, or `--llvm` when that is given. A build that fails prints the build log and the failing line. |
| `run <slug>` | Copies `src/` to `%TEMP%\bugrepro\<port>\<slug>`, adds a `TbRunProbe` module whose `[RunAfterBuild]` Sub calls `Debug.Cls` and then `Main`, runs `tbrun` on the copy and prints what it captured. The Sub clears `WEBVIEW2_USER_DATA_FOLDER` and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` while `Main` runs: the harness starts the IDE with both, and WebView2 lets them override what a WebView2 control in the project asks for, so the control would fail to start inside the IDE's process. Apart from the pictures below, the tree under `bugs/` is not changed. With `--exe` no probe module is added: `tbrun` runs `Sub Main` in the built exe. With `images` in `repro.json`, `run` also gives `tbrun` an empty folder in `BUGREPRO_IMAGES`, which the IDE and, with `--exe`, the exe inherit, and when the run finishes keeps each picture as `images/<name>-tb.png`. A picture the probe did not write is a failure that names it, exit 9. |
| `vb6 <slug>` | Builds the reproducer's VB6 project, in `vb6/`, and prints what its exe wrote. By convention `Probe.vbp` builds `Probe.exe`, which writes its findings to `out.txt` beside the exe and handles every error itself. The sources are copied to a new folder under the OS temp folder, so no exe or output lands in the repository, and the copy's project is given VB6's Unattended Execution option, which sends a message box or an unhandled error to the Windows event log instead of the desktop. VB6 refuses that option for a project with a form, a user control, a property page, a user document or a designer, so such a project is built without it. The exe always runs on a private desktop, inside a job that ends everything it starts, as `tbrun --exe` runs one: a box it shows is on no desktop anyone uses, and is closed by pressing OK and reported, and the time limit ends the exe. An unhandled error in an exe built with Unattended Execution exits with code 0 and leaves no fault; the VB runtime writes it to the Application event log instead, and that record is reported. The project is refused, exit 2, when its sources call `MsgBox` or `InputBox`, which would open a modal box. VB6 is found from `--vb6 <path>`, else the `VB6_EXE` environment variable, else `VB98\VB6.EXE` under `C:\Program Files (x86)\Microsoft Visual Studio` and then `C:\Program Files\Microsoft Visual Studio`; it is started from Node with an argument array and no shell, as [`vb6run.mjs`](#vb6run) does it. `--timeout` is the time limit on the exe (default 30 s), and `--keep` keeps the work folder and prints where it is. It needs no IDE. With `images` in `repro.json`, the exe is given an empty folder in `BUGREPRO_IMAGES`, and each picture it wrote is kept as `images/<name>-vb6.png`. |
| `verify [slug ...]` | Reads `repro.json` for each named reproducer, or every one under `bugs/` and `bugs/filed/`, runs what it says and reports one line each. A filed reproducer's line is labelled with its issue, such as `(filed #2453)`, and the summary counts the filed ones on a line of their own. |
| `file <slug> <issue>` | Moves the entry that names `` `<slug>.twinproj` `` out of `BUGS-TO-REPORT.md`, together with one `---` beside it, into `bugs/filed/<slug>/REPORT.md`, whose first line links the issue (`--existing`: "Covered by the existing issue ..." when an existing issue already covered the bug) and which holds no mark line. Then moves `bugs/<slug>/` to `bugs/filed/<slug>/` and records `issue` (and `existing`) in its `repro.json`. An entry whose reproducer is not an attachment names `bugs/<slug>/` in its closing comment instead. Refused, with exit 2 and nothing changed, when no entry or more than one names the slug, `bugs/<slug>` is missing, or `bugs/filed/<slug>` exists. |
| `file --marked` | Does that for every entry with a mark line directly under its title: `*FILED #<n>*`, `*CAPTURED IN EXISTING #<n>*` or `*CAPTURED IN \#<n>*`, the issue and the slug taken from the entry. A line such as `*DEFERRED until after v1*` is not a mark, and the entry is skipped. If a mark cannot be read, or a slug cannot be settled, the entries concerned are printed and nothing at all is filed, exit 2. One line is printed for each entry filed. Takes neither a slug nor an issue. |

The options of `compile`, `build` and `run` are those of `tbbuild` and `tbrun` of the same
name, and are passed to them: `--ide`, `--port` (default 9440), `--arch`, `--timeout`,
`--keep` and `--show` / `--hide`, with `--llvm` for `build` and `run`, and `--exe` for `run`.
An option that does not apply to a command is refused, not ignored. `vb6` takes `--vb6`,
`--timeout` and `--keep` only, and `--with-vb6` is for `new` alone.

A VB6 project in `vb6/` has no key in `repro.json`: the folder says it is there. `pack` and
`verify` check it, and `attach` may not name `<slug>-vb6.zip` or a path under `vb6/`.
`verify` runs the twinBASIC side only, and never starts VB6.

**A graphical defect carries pictures.** What twinBASIC drew beside what VB6 drew shows it
better than a description, and `images` in `repro.json` names them. Two modules draw them,
`PngDump.twin` in `src/Sources/` and `PngDump.bas` in `vb6/` (`new --with-images` copies
both from `test/repro-templates/png/`), and have the same members:
`PngDump.Surface Form1, "main"` for an object that has an `hDC`, and
`PngDump.Window Text1.hWnd, "text"` for a control with none. Each copies the pixels with
`BitBlt` or `PrintWindow` into a bitmap of its own and saves it with GDI+, so the picture is
what was drawn and not what the object's `Image` property or `SavePicture` would make of it.
The file is `<name>.png` in the folder `BUGREPRO_IMAGES` names, which `run` and `vb6` set,
else in `App.Path`. A name uses letters, digits, `-` and `_`. Any failure raises error 5 with
a description of the call that failed, and no message box opens.

`run` keeps each picture as `bugs/<slug>/images/<name>-tb.png`, `vb6` as `<name>-vb6.png`, and
when both exist `<name>-compare.png` shows twinBASIC, VB6 and their difference side by side,
with the beta that drew the first named over it. A pixel that differs is pure red in the
difference panel. Each command prints `image <name>: identical`, or how many pixels differ.
`pack` puts every file of `images/` into `<slug>.zip` and prints the `-compare.png` paths,
which are the pictures to put in the issue. The pictures are part of the report, so the entry in
`BUGS-TO-REPORT.md` embeds each `-compare.png` under **Screenshots** as
`![...](bugs/<slug>/images/<name>-compare.png)`: `pack` warns when it does not, `test/png.test.mjs`
fails, and `file` rewrites the path to `images/<name>-compare.png` in `REPORT.md`, which sits
beside the pictures. A copy of either module that differs from the
template draws a warning and nothing more, because a filed reproducer stays as it was filed.
`verify` never changes the tree: it keeps its pictures in the temp folder.

**`repro.json` says how to ask the compiler about a reproducer.** It is committed with the
reproducer and is not part of the `.twinproj`. A key it does not have, or a value of the
wrong type, is refused with exit 2, naming the file and the key, before anything runs.

| Key | Meaning |
|---|---|
| `mode` | `compile`, `build`, `run`, `cli`, `lane`, `probe` or `manual`. `lane` is a bug that a lane of [`ide_test.mjs`](#ide-test) or [`addin_test.mjs`](#addin-test) asserts, such as one that needs a click in the IDE; `probe` is one that a script of its own measures, such as one that needs several IDEs at once; `manual` is a reproducer that only a person can run. A `cli`, `lane`, `probe` or `manual` reproducer may have no `src/`, when the bug is in files the installation ships or the lane brings its own project; `verify` then runs it without packing, and `{project}` and `{src}` are refused. |
| `lane` | `lane` mode. `ide:<lane>` or `addin:<lane>`: the suite, and the lane's name as `--only` matches it. A lane the suite's `lanes.mjs` does not list is refused. |
| `tests` | `lane` mode. The names of the lane's tests that pass while the bug is there, as the lane's report prints them. The reproducer reproduces when every one of them passes. |
| `probe` | `probe` mode. A script under `scripts/`, then its arguments: `verify` runs `node <script> <arguments>` from the repository's root, adding `--ide` when it was given one, and judges the exit code and the output by `expect`. The script starts and ends what it needs itself, and must end on its own. |
| `arch` | Optional. `win32` (default) or `win64`. |
| `llvm` | Optional, `build` and `run`. `true` builds with LLVM. |
| `exe` | Optional, `run` only. `true` also runs the built exe, as `run --exe` does: no probe module is added, `Sub Main` runs in the exe, and an exe that exits with a code other than 0, faults or opens a box is `tbrun`'s exit 6. `Debug.Print` writes nothing in an exe, so what `expect.output` can match is only what `TbRun.Out` wrote; a bug that crashes the exe is expected as `"exit": 6`. |
| `expect.exit` | The exit code of `tbbuild` or `tbrun` as they print it, not this tool's mapped code; for `cli`, the compiler executable's; for `probe`, the script's. |
| `expect.diagnostics` | `compile`. Diagnostic codes, such as `TB5182`, that must all be reported. |
| `expect.noDiagnostics` | `compile`. `true` expects no error, warning, hint or information. |
| `expect.message` | `build`. A regular expression the message `tbbuild` prints on standard error must match. |
| `expect.output` | `run`, `cli` and `probe`. Regular expressions, each of which must match the output. They are matched line by line, so `^` and `$` hold at each line. |
| `expect.absent` | `run`, `cli` and `probe`. Regular expressions, none of which may match the output, such as an `ERROR` line the bug's fix would print. |
| `cli` | `cli` mode. The arguments for the compiler executable, `bin\twinBASIC_win32.exe`, or a list of such lists, run in turn; their output is joined, and their exit code is the one they all gave, or the codes joined by commas, such as `0,999`. `{tmp}` stands for a new temp folder, deleted afterwards; `{project}` for a copy of the packed `.twinproj` in it, and `{src}` for a copy of `src/`, so a command that writes either never touches the committed reproducer; `{ide}` for the folder of the IDE that `--ide` names or that is found, so a file the installation ships can be named without a user name. Give an output folder with backslashes and a trailing one, as `export` requires. Each command runs on a private desktop, inside a job that ends everything it starts, with its standard output and error written to files; `--timeout` (default 120 seconds) is the limit on each. The compiler opens a modal message box for some inputs, such as a damaged project, and waits for it to be closed, and on a private desktop nobody could close it. So the tool reads every dialog box a command opens, and presses its OK button, which lets the command go on. A command's output begins with one line for each box, in the order they opened, `dialog: <title>: <text>` with the box's text on one line, then its standard output, then its standard error, and `expect.output` and `expect.absent` are matched against that. |
| `steps` | What a person does to see the bug, for the issue. `verify` prints it for a `manual` reproducer. |
| `images` | Optional, `run` and `manual`. A non-empty list of picture names, each of letters, digits, `-` and `_`, without repeats. The project needs a `PngDump.twin` under `src/Sources/` and, when there is a `vb6/`, a `vb6/PngDump.bas` and a `Module=PngDump; PngDump.bas` line in its `Probe.vbp`; without them the file is refused. |
| `expect.imagesDiffer` | `run`, with `images`. `true` reproduces only when at least one picture of the fresh run differs from the committed `images/<name>-vb6.png`, a difference in size counting; `false` only when all of them match. `images/<name>-vb6.png` must exist for every name, and the file is refused when one does not. |
| `attach` | Optional. Files besides the project that the issue needs, such as a `.twinpack`: paths relative to the reproducer's folder, with forward slashes. `pack` adds each to `<slug>.zip`. A `cli` command finds a copy of each in its temp folder, at the same relative path: `{tmp}\garbage.twinproj` for `garbage.twinproj`, so a command may damage or write to it. |
| `issue` | Optional. A positive whole number, the number of the `twinbasic/twinbasic` issue the bug was filed as. `file` writes it. |
| `existing` | Optional, with `issue` only. `true` when the issue was not filed for this bug but already covered it. `file --existing` writes it. |

A `verify` line is one of four things. **reproduces**: everything `expect` names is as
expected. **NO LONGER REPRODUCES**: it ran, and something expected is not so; the bug may
be fixed in this build, and the entry may be ready to retire; for a filed bug it is the signal
that a fix has been released. **manual**: not automatable,
and `steps` is printed. **harness failed**: the tool could not do its job, as for a
`tbbuild` or `tbrun` exit of 2, or a compile that never settled; that says nothing about
the bug unless `expect.exit` names it; for a `lane` reproducer, the suite's runner exiting
2 or 3, or a named test missing from the lane's report. A `lane` reproducer whose test
failed is **NO LONGER REPRODUCES**, so read the lane's report before retiring the entry:
a test can fail for another reason. Reproducers run one at a time. `--jobs N` runs N at
once, each in the IDE on its own port, from `--port` up. `verify` tidies the IDE's registry
entries once for all of them, as [`check_examples.mjs`](#check-examples) does. The `lane`
reproducers run last: each suite's runner once, with `--only` naming every lane they need,
and the runner tidies the registry for its lanes.

Exit codes: **0** done --- a project that compiled, built or ran as it should, or, for `verify`, every reproducer that can be run on its own still reproduces; **1** a finding: the project has errors, or its build failed after a clean compile, or, for `vb6`, VB6 refused the project, or, for `verify`, at least one reproducer no longer reproduces; **2** a refused command line, a `repro.json` that is not valid, no IDE, a project that could not be packed, a harness that failed, or a crash; for `vb6`, no VB6, a reproducer with no `vb6/` folder, a project that has no `Probe.vbp` or calls `MsgBox` or `InputBox`, or VB6 failing to build it; for `verify`, a lane's harness failed; for `file`, an entry that is missing, ambiguous or marked unreadably, or a `bugs/filed/<slug>` already there, with nothing changed; **3** `new` found `bugs/<slug>` or `bugs/filed/<slug>` already there; **4** the compile never settled; **5** the project crashes the compiler; **6** `run`: the probe printed nothing; for `vb6`, the exe wrote no `out.txt`, or an empty one; **7** `run`: the probe ended before it returned; **8** `run --exe`, and `vb6`: the exe exited with a code other than 0, or was still running after `--timeout`, or the Application event log records that it faulted (a VB6 exe that dies of an access violation exits with code 0), or it opened a box, or, with `vb6`, the VB runtime logged an unhandled error for it in the Application log; **9** `run` and `vb6`: a picture that `images` names was not written, or could not be read.

### probe_shared_temp.mjs
{: #probe-shared-temp }

    node scripts/probe_shared_temp.mjs [--ides N] [--rounds R] [--control] [--all]
                                       [--ide <twinBASIC.exe>] [--port N] [--timeout S]

Counts the builds that fail to write the type library when several IDEs build at once in one `TEMP` folder. It is the measurement behind the entry of `BUGS-TO-REPORT.md` whose reproducer is `bugs/concurrent-builds-shared-temp/`: such a build ends with `[TYPELIB] failed to finalize typelibrary.  Disk error?`, then `[LINKER] FAILED to create type library` and `[BUILD] failed`. Like [`tbbuild.mjs`](#tbbuild), it needs a twinBASIC install and Windows, and it is outside every gate and outside CI.

Each round starts `--ides` IDEs at once, each on its own port and each opening a copy of the reproducer's project, packed into a folder under `%TEMP%\tbprobe-shared-temp\` with an explicit build path. An IDE builds one project and is ended, because an IDE reused for a second project wedges. Every IDE compiles its project, then waits until all the others have compiled, so that Build is pressed in all of them at about the same moment. A build whose log holds a `[TYPELIB] failed` line or `FAILED to create type library` failed to write the type library. Any other failed build is not what the probe measures; it ends the probe with exit 2.

[`tbbuild.mjs`](#tbbuild) gives every IDE a `TEMP` folder of its own, so no build of the harness shares one. The probe gives all its IDEs one folder, made for the run under `%TEMP%\tbprobe-shared-temp\` and deleted afterwards, through the `env` option of `launchIde`. With `--control` it leaves the harness's own folders in place, one for each IDE, which is the reproducer's control.

| Flag | Effect |
|---|---|
| `--ides <n>` | IDEs at once. Default 8. |
| `--rounds <r>` | Rounds, one build in each IDE. Default 24. |
| `--control` | Give each IDE a `TEMP` folder of its own. No build is expected to fail. |
| `--all` | Run every round. By default the probe stops after the round in which it first sees a type library fail, because one is enough to show the defect. |
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. |
| `--port <n>` | The first DevTools port to try. Default 9760. The IDEs take the first free ports from it. |
| `--timeout <secs>` | The wait for a compile to settle, and again for a build. Default 180. |

The output is one `round <k>: <n> failed` line for each round, the last console lines of every build that failed, and a last line of the form `<f> of <n> builds failed to write the type library (TEMP shared)`, or `(TEMP per IDE)` under `--control`. Other work on the machine, such as lanes of [`addin_test.mjs`](#addin-test) or [`ide_test.mjs`](#ide-test), loads the same processor, and a disturbed run is not comparable with a quiet one.

Exit codes: **0** no build failed to write the type library; **1** at least one did, so the defect is there; **2** a refused command line, no IDE, no free ports, an IDE that did not start, a project that did not compile, a build that failed in some other way, or a crash.

### probe_build_twice.mjs
{: #probe-build-twice }

    node scripts/probe_build_twice.mjs [--arch win32|win64] [--ide <twinBASIC.exe>] [--port N]
                                       [--timeout S] [--keep-files <dir>]
    node scripts/probe_build_twice.mjs --vb6 [--timeout S] [--keep-files <dir>]

Builds the project of `bugs/build-writes-compiler-addresses/` twice and compares the two exes. It is the measurement behind the entry of `BUGS-TO-REPORT.md` whose reproducer that is: two builds of one unchanged project are not byte for byte equal, and what differs is more than the PE time stamp and checksum. Each exe holds, at the start of its `.data` section, a block of deflate-compressed data: a u32 compressed size, a u32 inflated size of 4,096 and a raw deflate stream. Inflated, the blocks of two builds differ in two values that have the form of heap addresses: 4 bytes each in a win32 exe, and the low 6 bytes of a 64-bit value in a win64 exe. Like [`tbbuild.mjs`](#tbbuild), it needs a twinBASIC install and Windows, and it is outside every gate and outside CI.

Each build is made in an IDE of its own, one after the other on one port, because an IDE reused for a second project wedges. Before each build the project is staged again, packed into a folder under `%TEMP%\tbprobe-build-twice\<port>\` with an explicit build path, in the same folders both times, so that no path can be what differs. The exe is copied out as soon as the build is done.

The output has these parts, in order: the two sizes, and whether the section tables are the same; the PE time stamp and checksum of each file, which the linker sets and the comparison leaves out; the startup block, found by its header (a u32 compressed size, then a u32 inflated size that is a multiple of 1,024, at a 4-byte step of `.data`, then a stream that inflates), with the sizes of the two streams and their padding to the pointer size of the target; the bytes that differ outside the time stamp, the checksum and the block, by section, one line for each range with its bytes in both files; and the decompressed bytes of the block that differ, each range read as the little-endian value of the target's pointer size that holds it. The two blocks are lined up on the end of their padding, so that data which moved by one step because a stream is a few bytes longer is not counted as a difference, and the padding is compared on its own, aligned at its end. The last line is the summary, `the decompressed startup blocks of two builds differ in <n> bytes, in <k> ranges (<arch>)`, or `the decompressed startup blocks of two builds are equal (<arch>)`. A stream that does not inflate to exactly the size its header states, and an exe with no such block, end the probe with exit 2.

| Flag | Effect |
|---|---|
| `--arch <a>` | `win32` or `win64`, the target to build for. Default `win32`. |
| `--ide <path>` | Path to `twinBASIC.exe`, found as for `tbbuild`. |
| `--port <n>` | The first DevTools port to try. Default 9800. The IDE takes the first free port from it. |
| `--timeout <secs>` | The wait for a compile to settle, and again for a build. Default 180. |
| `--keep-files <dir>` | Copy the two exes into `<dir>`, which is made if it is missing, as `<arch>-1.exe` and `<arch>-2.exe`. Nothing already in the folder is removed. |
| `--vb6` | Build the `vb6/` project of the reproducer twice with VB6 in place of the twinBASIC project, and print every range that differs outside the time stamp and the checksum, by section. A VB6 exe has no deflate-compressed block. VB6 is found as for [`vb6run.mjs`](#vb6run) (`VB6_EXE`, else the standard install folders) and is started only through `scripts/lib/vb6.mjs`, never from a shell. The project is built with Unattended Execution, as `bug_repro.mjs vb6` builds it. Both builds are made in one folder, because VB6 stores the folder's name in the exe and two folders would show as a difference of their own. `--arch`, `--ide` and `--port` do not apply, and are refused with it. |

Exit codes: **0** the compared bytes are equal, the two decompressed blocks or, with `--vb6`, the two files outside the time stamp and the checksum; **1** they differ, so the defect is there; **2** a refused command line, no IDE or no VB6, no free port, an IDE that did not start, a project that did not compile or build, a block that does not inflate to its stated size or is not there, or a crash.

### vb6run.mjs
{: #vb6run }

    node scripts/vb6run.mjs <file | -> [--vb6 <path>] [--timeout S] [--keep] [--json]
    node scripts/vb6run.mjs --docs [--only <regex>] [--vb6 <path>] [--timeout S] [--keep] [--json]

Builds and runs Visual Basic 6 code, so that what a documented sample prints in twinBASIC can be compared with what it prints in VB6. It needs VB6, which it finds from `--vb6 <path>`, else the `VB6_EXE` environment variable, else `VB98\VB6.EXE` under `C:\Program Files (x86)\Microsoft Visual Studio` and then under `C:\Program Files\Microsoft Visual Studio`; with none of them it exits 2 and says how to point at one. It needs Windows, is outside every gate and outside CI, and is run by a person, as [`check_examples.mjs`](#check-examples) is.

**Nothing may open a dialog, and VB6 is never started through a shell.** The tool starts `VB6.EXE` from Node with an argument array. Started from Git Bash by hand, `/make` and `/out` are rewritten as paths, and VB6 answers every switch it does not know with a modal message box on the desktop. A compiled exe also shows a modal box for an unhandled run-time error, for `MsgBox` and for `InputBox`. So each sample runs under an error handler the tool generates, the project is built with VB6's Unattended Execution option, which writes such a box to the Windows event log, and a sample that calls `MsgBox` or `InputBox` or contains an `End` statement is refused without being built, as `check_run` refuses it. The exe runs on a private desktop, inside a job that ends everything it starts, as `tbrun --exe` runs one: a box it opens all the same is closed by pressing OK and reported, and Windows records a fault in the Application event log only for an exe started that way. Every process the tool starts has a time limit and is ended by its pid when it runs over. Work folders are created under the OS temp folder, one for each run, and removed at the end; `--keep` leaves the folder and prints where it is.

**`Debug.Print` is rewritten.** It writes nothing in a compiled exe. The tool rewrites each `Debug.Print` statement to `Print #511,` against a file the generated `Sub Main` opens, and `Print #` takes the same arguments (`;`, `,`, `Spc`, `Tab`), so the text is the same. A `Debug.Print` inside a string or a comment is left alone, and one after a `:` or after `Then` or `Else` is rewritten. VB6 writes the file in the ANSI code page, and the tool reads it as Windows-1252. A sample that calls `Close` with no file number also closes that file, and its next `Debug.Print` raises error 52.

| Mode | Effect |
|---|---|
| `<file>` | A `.bas` module, or a text file of bare statements; `-` reads statements from standard input. A file that defines `Sub Main` is a whole module: it is built as written, its `Sub Main` is renamed so that the generated `Main` can start it, and it keeps its `Attribute VB_Name` line or is given one. Any other file is the body of a generated procedure. What the sample printed goes to standard output. A compile error is reported to standard error as VB6 reports it, with the line given as a line of the file, and a run-time error as `[vb6] error <n>: <description>`. |
| `--docs` | Reads the documentation's `check_run` fences with the reader `check_examples.mjs` uses and builds each as a module of its own in a VB6 project; the fences that need no other fence share one project. The run fences of a `projname=` group are built in a project of their own, since class and module names collide between groups, together with the other fences of the group, each of which is a file. A `slot=file` fence is translated into VB6 components: every `Class <Name>` block becomes a class module and every `Module <Name>` block a standard module, `Public`, `Private` or `Friend` before the keyword being accepted, and anything outside those blocks (`Declare`, `Type`, `Enum`, `Const`, procedures) becomes one more standard module. Nothing else is translated. A construct VB6 has no form for, such as an `Interface`, a `CoClass`, a generic or an attribute line, stays where it is and VB6 refuses it, so each run fence of a group whose files do not build is `not VB6`, with the first error at its line in the page. Each of the run fences ends as `same` (VB6 prints what the page says twinBASIC prints), `differs` (the lines that differ, the page against VB6, with the page path and line), `not VB6` (VB6 refuses to compile it, with its first error; most twinBASIC syntax ends here, and it is informational), `error` (a run-time error, the exe ended during it, or it did not return), or `refused` (the sample cannot be run, for the reasons `check_run` gives). A fence that says `project=form` is built with a blank `Form1.frm`, which VB6 refuses to build with Unattended Execution, so such a project is built without it; each sample's forms are unloaded when it ends. On a `Declare` statement, `PtrSafe` is dropped and `LongPtr` is read as `Long`, because VB6 knows neither. A compile error stops VB6 at the first module that fails, so that module is dropped and the project is built again until it builds. A summary line gives the count of each. `--only <regex>` keeps the pages whose path under `docs/` matches. |

Other options: `--timeout S` is the time limit, in seconds, for each run of the built exe (default 30), and `--json` prints one JSON object in place of the text.

Exit codes: **0** the sample ran, or, with `--docs`, no fence differs and none raised an error; **1** a VB6 compile error, a run-time error, a sample during which the exe ended (a VB6 exe that dies of an access violation can exit with code 0, so the exe ending before the time limit in the middle of a sample is what shows it; the fault the Application event log records is named when there is one, and so are a box the exe opened and what the VB runtime logged) or a sample that did not return, or, with `--docs`, at least one fence that differs or raised an error; **2** the harness could not run --- a refused command line, a file that is missing, a sample that is refused, no VB6, VB6 failing to build, or a crash.

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
(Global Search), end to end. The others but the last are probes, and take what they need from
`test/addin/probes/`. Two build add-ins of their own and check what the tbIDE pages say about
the IDE: which keyboard shortcuts fire, for the
[KeyboardShortcuts](../../tB/Packages/tbIDE/KeyboardShortcuts) page, and what a tool window
does with HTML and with a web page in an `iframe`, for the
[HtmlElement](../../tB/Packages/tbIDE/HtmlElement) page and its neighbours. The panes lane
serves the pages its frame shows from a server of its own on `localhost`. Three more answer
questions the help add-in rests on: what the compiler says about the name under the
cursor, which files the IDE's own web server serves from its `ide` folder, and which folders
the compiler loads add-ins from. The last three check what the [Add Ins](../../tB/IDE/AddIns/)
and [tbIDE package](../../tB/Packages/tbIDE/) pages say about loading: which folder each
build target loads, what a compiler restart does to a loaded add-in, and which entry-point
names the IDE accepts. They build add-ins for win64 as well as win32, restart the compiler,
and patch a built DLL's export name. One more checks that the environment variable the
runner sets, which keeps an add-in under test from opening a browser, reaches the add-in,
also after a compiler restart. Another times what the help add-in's hover help costs, a
widget in the code editor and polling the cursor, and checks that a hover provider added
through the page shows in the IDE's own hover. The last two lanes test the help add-in in `add-in/`, which
opens the page for the name under the cursor and, with its *Hover help* box ticked, shows
links to a name's pages in the mouse hover, with the copy of the symbol index committed in
`add-in/Resources/SYMBOLS/`: `help` with the pages from the built site, and `help-offline`
with the pages from the add-in's own server, built with an archive of the built offline
tree that the lane writes with the same [help archive](#the-help-archive) writer the build
uses. The fourteen lanes take about two minutes together.

| Flag | Effect |
|---|---|
| `--only <regex>` | Run only the lanes whose name matches. A lane's name is its file's name without `.test.mjs`. |
| `--port <n>` | Base DevTools port. Default 9560; the lanes get the first free ports from *n*, and their work folders are keyed to their ports. A port is free when nothing listens on it and no other run of these tools has claimed it: each run claims its ports with a lock file in `%TEMP%	b-ports`, so two runs started together never share one. |
| `--jobs <n>` | Lanes at once. Default 2. |
| `--timeout <secs>` | A lane still running after this long is ended and counted as failed. Default 600. |
| `--ide <path>` | The `twinBASIC.exe` to copy, found as for [`tbbuild.mjs`](#tbbuild). |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild). |

**It leaves the registry as it found it, and checks.** It puts back the IDE's own entries as
`tbbuild` does, and also the settings the add-ins under test save with `SaveSetting`. Those
are stored under `HKCU\Software\VB and VBA Program Settings\<name>`, which any installed copy
of the same add-in shares, so a lane names its add-ins' application names in `lanes.mjs`
(`settings`). They are recorded before the first lane starts, deleted before each lane that
names them, so that its add-ins start from their defaults, and put back at the end. Two lanes
that name the same one never run at once. Afterwards it confirms that no entry names a lane's
folder and that the settings are as found, and reports any new application key that no lane
named. Pressing Ctrl+C ends the lanes and still puts everything back, and so does a crash of
the runner once it has recorded the registry.

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
fails if its IDE's add-in folder is anywhere else.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE, no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

### ide_test.mjs
{: #ide-test }

    node scripts/ide_test.mjs [--only <regex>] [--port N] [--jobs N] [--timeout S]
                              [--ide <path>] [--show|--hide]

Runs the IDE scenarios under `test/ide/`: the scenarios that operate the IDE itself, such as
the debugger, Export Project and the Packages dialog, rather than an add-in. It is the same
runner as [`addin_test.mjs`](#addin-test), with the same flags, the same kind of lanes and the
same exit codes: each file listed in `test/ide/lanes.mjs` is one **lane**, run by
[`ide-test.bat`](#ide-testbat) in a process of its own, with its own DevTools port, work
folder and private copy of the twinBASIC install. Run on its own, a scenario skips itself.
The two differences are the suite and the default base port, which is 9660 here, so that a
run of each tool starts on ports of its own. A run whose `test/ide/lanes.mjs` lists no lane
matching `--only` is refused, as for `addin_test.mjs`.

It leaves the registry as it found it, and checks, exactly as `addin_test.mjs` does. The rules
of that tool apply here unchanged: every IDE it starts has a private `APPDATA` and
`TB_ADDIN_TEST` set to `1`, and an IDE is ended by its process id and never by its image name.

Exit codes: **0** every lane passed, and the registry is as it was found; **1** a lane failed, or the run was interrupted; **2** the harness could not run: a refused command line, no IDE, no matching lane, a registry it could not record, or a crash after which the registry was put back; **3** the registry or a work folder was not put back (see the lines above), at the end of a run or after a crash, which wins over a 1 because the registry is what to repair.

### try_help_addin.mjs
{: #try-help-addin }

    node scripts/try_help_addin.mjs [--project <dir>] [--port N] [--ide <path>]

Opens an IDE on your own desktop with the help add-in in `add-in/` built and loaded, to try it
by hand, and waits until the IDE is closed. The IDE is set up as a lane of
[`addin_test.mjs`](#addin-test) is: the add-in goes into a private copy of the twinBASIC install
in the temp folder, never into the install's `addins\` or `%APPDATA%\twinBASIC\addins\`, and the
IDE has a private `APPDATA`, so none of your own add-ins loads into it. `TB_ADDIN_TEST` is `1`,
so *Open in browser* prints `open <url>` to the Debug Console and starts nothing. The pane's
pages come from the built site, `docs/_site`, served on `localhost`, so run `build.bat` first.
Unlike the lanes, the IDE is always on your desktop; the one that builds the add-in first runs on a
private desktop, as a lane's does, so it never appears or takes the focus.

`--project` names the exported project to open, by default `test/addin/helphost`, the help
lane's host. It is opened as a staged copy, so edits made in the IDE are not kept. `--port` is
where the search for the IDE's DevTools port starts, 9590 by default; it takes the first
free one, as `addin_test.mjs` does. Closing the IDE, or Ctrl+C, puts back the IDE's
registry entries and the add-in's saved settings (`tbDocsHelp`) as they were found, and deletes
the copy.

Exit codes: **0** the IDE was closed, and the registry is as it was found; **1** the add-in did not build, or the project does not compile; **2** the tool could not run: a refused command line, no IDE, no built site, a registry it could not record, or a crash; **3** the registry or the work folder was not put back (see the lines above).

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
the run's folder go, and every other one stays, in its order and its exact text. The IDE's
theme, which an add-in scenario switches, comes back, and every other IDE option stays as it
is. So is the rule that a file association pointing into the temp folder when a run began --- at another
run's private copy of the IDE --- is left as it is rather than put back. It also checks that
the module refuses to sweep outside the temp folder or restore a key near the root of the
registry. It deletes the scratch key when it ends.

It is not a gate and is not in `test.bat`, because it needs Windows and a real registry and
the CI runners have neither. Run it by hand after changing `tb-registry.mjs`.

Exit codes: **0** every assertion held, **1** an assertion failed, **2** the test could not run to its end: a refused command line, PowerShell failing, or a crash.

### check_examples.mjs
{: #check-examples }

    node scripts/check_examples.mjs [--only <regex>] [--census] [--propose [--apply]]
                                    [--report <file>] [--jobs N] [--port N] [--batch N]
                                    [--ide <path>] [--build | --llvm] [--keep] [--verbose]
                                    [--json]

Compiles the documentation's own code samples. A ` ```tb ` fence is something
[`check_code_regions.mjs`](#check-code-regions) protects the *contents* of and nothing ever
evaluates, so a sample that does not compile can ship and every gate stays green. This is the tool that asks the compiler; [`examples.bat`](#examplesbat) is how it is
usually run, and [Authoring Pages](Authoring#checking-that-a-sample-compiles) is where a
sample opts in.

Each marked sample is generated into its own `Module tbx_<hash>`, packed with a template
project, and built the way [`tbbuild.mjs`](#tbbuild) builds. A diagnostic comes back against a
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
| `--propose` | Compile the unmarked samples too, and list the ones that would pass. A survey: an unmarked sample that fails does not fail the run, though a marked one still does. It ends with the same grouping `--report` prints. |
| `--apply` | With `--propose`, add the marker to the fences that passed. It only ever adds the bare flag, only to a fence that compiled in that very run, and never to one that already carries markup --- so a re-run is a no-op. Read the diff. |
| `--report <file>` | Group the findings of a survey saved with `--propose --json`: by diagnostic, by section, by the name that did not resolve, by wrapper, and by page. No compiler --- the survey holds every page and line it names, so the slow run happens once and the grouping is what gets iterated on. |
| `--jobs <n>` | Concurrent IDE lanes. Default 4. Each lane has its own port, its own workspace and its own private desktop. |
| `--port <n>` | Base DevTools port. Default 9480; lane *n* uses base + *n*. |
| `--batch <n>` | Upper bound on samples per generated project. Default 120. The batcher packs fewer than this when there are lanes to fill. |
| `--ide <path>` | `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop. |
| `--build` | Also build each project that compiles without errors. A project whose build fails is cut down, as a crash is, to the samples that fail it. A project whose compile has errors is not built: the run names its first error, and ends by counting its samples as "compiled but not built". |
| `--llvm` | Build with LLVM (implies `--build`): each project's compiler options are set to `+llvm`. It needs a Professional or Ultimate licence and exits 2 without one. A plain `--build` run is its control: a sample that fails only under `--llvm` is one LLVM cannot generate code for. |
| `--keep` | Leave the generated projects on disk and print where. |
| `--verbose` | Report warnings as well as errors. Only errors ever fail the run. |
| `--json` | One object on stdout; every report line moves to stderr. |

**Templates live in `test/example-projects/`**, one directory per template, each an exported
project tree --- a `Settings` file and a `Sources/` folder. `console` is the default;
`packages` references every package the IDE ships and is what a page under
`Reference/Built-In/` or a package tutorial gets without asking. A fence can name one with
`project=`. `form` is `console` with a real, empty `Form1` for the samples that draw on a form
or read its properties: a form made in code has no designer file and cannot be drawn on.
After each `check_run` sample the run unloads every form the sample left loaded, so a sample
that forgets `Unload Form1` neither keeps the run waiting nor leaves its drawing for the next
sample.

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

**A sample can compile and still fail the build.** The front end accepts constructs that code generation refuses, so `--build` presses Build on each project that compiled without errors, and `--llvm` does the same with LLVM switched on. A build can fail once and pass when repeated, so a project whose build fails is built once more, and only a second failure counts. `tbbuild` reports a failed build as exit 5 and names no sample, so the project is cut by halving, with the crash machinery and its costs, until one sample is left or the samples a failure needs together are found. The finding says "fails the build", and its second line says "the LLVM build" under `--llvm` and "the build" otherwise. The canary described below is a warning, so it does not stop a project from building. A build also refuses three things a compile accepts, so a run that builds batches around them: an `expect-error` sample is batched apart from the samples that should build; a sample, or a group, that declares its own `Sub Main` gets a project of its own without the template's `Main`, because two make the startup object ambiguous; and two samples that export one `[DllExport]` name are kept in different projects.

**A sample can be run.** A statement sample marked `check_run` is built and run in every mode, and what it prints is compared with what the page says it prints: a trailing comment on a `Debug.Print` line, or the comment lines under an `' Output:` line ([Authoring Pages](Authoring#checking-that-a-sample-compiles) has the markup). A project may have only one `[RunAfterBuild]` Sub (TB5114), so run samples are batched apart from the rest, and each run batch gets one generated `Module tbxRun` whose `[RunAfterBuild]` Sub calls each sample's body in turn. It prints a marker line before and after each call, and an `On Error GoTo` handler around each call keeps one sample's error from ending the rest. The handler is reached only by an error the sample does not handle itself, so a sample can demonstrate an error under its own `On Error Resume Next` and print `Err.Number`. A check of `Err.Number` after the call could not tell the two apart, because a procedure that handles an error with `On Error Resume Next` returns with `Err` still set, in VB6 and in twinBASIC alike. The run's console output is captured as [`tbrun.mjs`](#tbrun) captures it and split by those markers, so each line is charged to the sample that printed it. A sample that raises an error, does not return, or prints something other than the page says is a finding at the page line that states the value. A run sample that is not `slot=sub`, is marked `expect-error`, or calls `MsgBox` or `InputBox` or contains an `End` statement is refused without being built: a message box waits for a click on a desktop nobody sees, and `End` ends every sample after it.

    FAIL  docs/Reference/Default/VBA/Strings/InStr.md:77  (Reference/Default/VBA/Strings/InStr.md#3)
            prints "3", the page says "7"

**A batch can report nothing when it should report something.** `tbbuild` does not wait for a build: it reads the IDE's own window, the status bar and the Problems panel for the project the IDE has open, once the compiler's status reads OPERATIONAL and either the IDE's own traffic shows the compile has ended and the window agrees with it, or the window has stopped changing for five seconds. An IDE under load can be OPERATIONAL with an empty panel before it has published its diagnostics, and a batch read then reports every sample as compiling, which looks exactly like a batch with nothing wrong. So every batch carries a canary: a module holding a `#Warning` directive, whose warning (`TB0005`) is known. A read with no errors in it must report the canary, or it is not believed. The module carries `[EnforceWarnings(TB0005)]`, so a project setting that ignores the warning, or turns it into an error, does not change it. The warning is reported whatever else the batch holds: unterminated blocks, stray `End` statements, broken classes and many undefined names in other files do not hide it. It is a warning rather than an error so that a batch with nothing wrong still builds clean. A batch that crashes the compiler reports nothing at all and is isolated as a crash; its canary is never read.

The canary proves only that the IDE published something, not that it published everything: a read that includes the canary but not a sample's later diagnostics would still pass that sample. So a read that holds real errors needs no canary --- the IDE was plainly not silent --- and is taken as read, whatever the canary did. Real errors here are errors in the batch's samples, and errors outside every sample that the template does not draw by itself; a template's own errors do not count, or a template that always draws one would switch the canary off for every batch built from it. A canary missing beside real errors has never been seen, and is printed as a note if it happens. A read with no errors and no canary is built once more, because a read that came too early says nothing about the batch. If it is silent again, the batch is split in half repeatedly, as for a crash, until each part reports the canary or errors of its own. A single unit --- one sample, or a group compiled as one program --- that is still silent stops the run with exit code 2 and its name, because its clean result cannot be trusted and it is not blamed for errors nobody saw. The template built with no samples, which is how the tool learns the errors a template draws by itself, follows the same rule: it needs its canary only if it has no errors, is read again when it is silent, and stops the run when it is silent twice.

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
sample that provoked it can have no diagnostic of its own at all. Such a sample is not
counted as compiling: the run fails with a row naming no page, and the same splitting
isolates it, after one build of the template with nothing in it decides whether the row is
the template's own rather than any sample's. A split never cuts a `projname` group in half,
and never separates a page's `hidden` context from the samples that need it.

Four files under `scripts/lib/` belong to it. `tb-fences.mjs` is the half that needs no
compiler --- fence extraction, the markup, and the classifier --- and is where a new key or
a new slot goes. `example-batches.mjs` packs samples into batches and cuts a crashed batch
down, and holds the probes, which run before every run and in
[`example-batches.test.mjs`](#example-batches-test). `example-run.mjs` is what `check_run`
needs without an IDE: which samples may be run, what a sample says it prints, the generated
dispatcher, and the reading of the run's markers. `tb-install.mjs` finds the IDE and the
compiler beside it, and is shared with the two IDE-driving tools so the three cannot come to
disagree about where an install is.

Exit codes: **0** every marked sample compiles, or none is marked (`--report` always, and `--propose` when it found only unmarked samples that fail, which is advisory); **1** a marked sample does not compile, a marker is misused, a template does not compile, the compiler crashed on a project, `--build` or `--llvm` found a sample that fails the build, or a `check_run` sample raised an error, did not return or printed something other than the page says (the report names each); **2** the harness could not run: a refused command line, a failed self-test probe, no IDE, an unreadable `--report` file, a work folder it could not clear, an `--llvm` run on a Community or Personal licence, or a crash.

### gen_attribute_probes.mjs
{: #gen-attribute-probes }

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Generates twinBASIC probe projects from the `Applicable to:` lines in `Reference/Attributes.md`, for [`tbbuild.mjs`](#tbbuild) to compile. An `Applicable to:` line is a claim about the compiler, and only the compiler can confirm it. This writes one source file per claimed target, so a single build answers every claim at once. A `Syntax:` or `Applicable to:` line inside a code fence is not read, so an example that shows the page's own format is not taken for an attribute; [`census_attributes.mjs`](#census-attributes) reads the page through the same code, `scripts/lib/attributes-doc.mjs`. A misplaced attribute comes back as `This attribute is not supported in this context` (TB5155) or `Syntax error.  No handler for this symbol` (TB5182). Which of the two arrives says nothing about whether the attribute exists, only that it is not accepted there.

Up to three trees come out, on two contracts that must not be mixed:

| Tree | Contract |
|---|---|
| `<out_dir>` | `AttributeProbes` --- every probe is expected to compile, so a diagnostic naming a probe module is a documentation defect. |
| `<out_dir>-2` | `AttributeProbes2` --- the same contract, for targets that cannot share a project (one `[RunAfterBuild]` per project). |
| `<out_dir>-explore` | `AttributeExplore` --- **a diagnostic is the answer.** Questions the page cannot settle; each source file carries its own header saying how to read its result. |

Keeping the two contracts in separate projects is what makes either build readable: red in `AttributeProbes` is a defect, red in `AttributeExplore` is a result.

It also writes a key naming the `Attributes.md` line each probe came from, beside the tree rather than inside it --- anything inside gets packed into the `.twinproj` and turns up as a stray project file. Pack a tree into a project with [`impexp.mjs`](#impexp) before building it:

    node scripts/impexp.mjs import AttributeProbes.twinproj <out_dir> --overwrite

Its exit code says whether the pack worked. The compiler's own `import` verb takes the same command line, but **its exit code is `0` after every failure it reports**, so a script that packs a tree with it and then builds will happily compile the previous `.twinproj`. The one failure it does not report --- a tree holding an embedded package --- exits `999`. Test the last line of its output for `... DONE` instead; [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) has the caveat in full and a batch-file form of the test. Re-run the generator after editing `Attributes.md`.

Exit codes: **0** the probe project and the key were written, **2** a refused command line (no output directory included), or a crash.

### census_attributes.mjs
{: #census-attributes }

    node scripts/census_attributes.mjs [--ide <install>] [--exported <dir>] [--cache <dir>]
                                       [--refresh] [--samples] [--attr <name>]
                                       [--json] [--out <file>] [--dump-sites <file>] [--quiet]

Reports, for every attribute the twinBASIC packages use, **which enclosing construct and which kind of declaration it decorates**. It unpacks each package of an IDE install with [`impexp.mjs`](#impexp), called directly, scans the `.twin` sources, and writes a Markdown or JSON report. No arguments are needed: it finds the newest `twinBASIC_IDE_BETA_*` the same way [`tbbuild.mjs`](#tbbuild) does, caches the export under the build number, and reuses it on later runs. It is not part of the site build and nothing calls it during one.

Against BETA 995 that is 661 files, 9,713 attribute sites and 55 distinct attributes.

**A census is evidence, not applicability.** It says where an attribute *is* used, never where it *may* be used, and the two differ in both directions. The packages contain no use of `[Hidden]` on a whole **Class**, yet the compiler accepts one; they contain many on **Class** and **Interface** members, and the compiler refuses the same attribute on the **Interface** lines inside a **CoClass**. Neither fact is reachable from the other tool, so pair this with [`gen_attribute_probes.mjs`](#gen-attribute-probes) and [`tbbuild.mjs`](#tbbuild), which ask the compiler directly.

Grouping is by enclosing construct *and* declaration keyword, because the keyword alone misleads. `[RedirectToStaticImplementation]` has 82 uses, on "a Property Get, a Function and a Sub", which read by keyword suggests *procedure in a Class* --- and the compiler rejects that with TB5155, because every one of those uses is inside an **Interface**.

| Flag | Effect |
|---|---|
| `--ide <install>` | The install root to census. Defaults to `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_*` on the Desktop. |
| `--exported <dir>` | Census an already-exported tree and skip the export entirely. |
| `--cache <dir>` | Where exports are kept. Defaults to a per-build folder under the system temp directory. |
| `--refresh` | Re-export even when the cache already holds this build. |
| `--samples` | Also census `projects/` and `addins/`, not only `packages/`. |
| `--attr <name>` | Report one attribute in detail instead of the whole table. |
| `--dump-sites <file>` | Write every raw site as JSON --- which file and line produced each row. |
| `--json` | Emit JSON instead of Markdown. |
| `--out <file>` | Write to a file instead of standard output. |

The report ends with what the scanner could not resolve, and **that section is expected to be empty**. A census that quietly buckets its own confusion publishes a wrong number with nothing to notice it by, so an unresolved site is reported as a scanner bug rather than absorbed. The scanner handles several things this corpus does that a simpler sweep gets wrong: attributes spanning lines (`[Description("..." & vbCrLf & _` accounts for 3.8% of all attribute lines), comma-separated lists, arguments containing commas, escaped identifiers that look exactly like attributes (`[_HiddenModule].Foo`, and Enum members genuinely named `[A4 Portrait]`), comments in four different positions, and block-tracking traps such as a UDT field called `Type As Long` or a module named `[_HiddenModule]`.

Exit codes: **0** the report was produced, **2** a refused command line, no install, an install with no package project, or a crash (a package that fails to export is left out of the census).

### sweep_attributes.mjs
{: #sweep-attributes }

    node scripts/sweep_attributes.mjs [--ide <twinBASIC.exe>] [--names <a,b,...>] [--sites <a,b,...>]
                                      [--forms bare|smart|all] [--no-tokens] [--jobs <n>] [--port <n>]
                                      [--batch-size <n>] [--verify <n>] [--out <file>]
                                      [--dump-results <file>] [--work <dir>] [--keep] [--preflight]
                                      [--dry-run] [--list-sites] [--show | --hide] [--timeout <secs>]

Asks the compiler where every attribute is legal. It writes each attribute name at each declaration site --- a Module, a Class member, an API `Declare`, a Type field, a parameter, an `Implements ... Via` statement, and so on --- in each argument shape, builds the projects the way [`tbbuild.mjs`](#tbbuild) does, and lays the answers against the `Applicable to:` lines in `Reference/Attributes.md`. The report lists the documented targets the compiler refuses, the targets that hold only partly, and the sites it accepts that the page never mentions.

It exists because the two older tools each leave a gap. [`census_attributes.mjs`](#census-attributes) says where the shipped packages *use* an attribute, and [`gen_attribute_probes.mjs`](#gen-attribute-probes) probes only the targets the page already *claims*, so an entry that is too short stays too short: a line checked against only a Sub and a Const says nothing about an API `Declare`. This tool asks every question, so a missing target shows up as a row of the report and not as something a person has to think of.

The names come from three places: every entry in `Attributes.md`, every name in the compiler's own token table (a long pipe-separated string in the compiler binary, holding keywords, attributes and object members together), and `--names`. A token-table name is a *candidate*: it is called an attribute only if some site accepts it. `Debug` and `ExecuteHostCommand` are in the table and neither is one.

**How an answer is made readable.** A clean build is not proof by itself, so the tool guards against the ways one goes wrong:

- **Baselines.** Every site is built with no attribute first, and one that does not build clean is voided, so a wrong skeleton cannot read as "every attribute is refused here".
- **Controls.** TB5155 and TB5182 do not separate "wrong place" from "no such attribute". An invented name is built at every site, and a probe that draws exactly what the control draws is a refusal whatever its code. A site whose control compiles is voided.
- **Canaries.** Three probes (one clean, one refused for context, one unknown) ride in every batch. What they must draw is fixed in the script, not read from a build, and the tool builds them alone first and stops unless they draw it. A batch whose canaries differ, or that holds an error row belonging to no probe, is halved rather than believed. That is what would catch a compiler that stops reporting after so many errors, or a syntax error that suppresses the diagnostics of other files.
- **Isolation.** Halving also finds the probe behind a compiler crash or hang, and a crash that needs several probes together is reported as such.
- **Batching.** Batches are shuffled, and an attribute the compiler allows once per project (`[RunAfterBuild]`) goes in one probe to a batch, or its TB5114 would read as acceptance.
- **`--verify N`** rebuilds N random probes in fresh batches and compares.

| Flag | Effect |
|---|---|
| `--names`, `--sites` | Restrict to these attribute names (any case) or site ids. `--list-sites` prints the ids. |
| `--forms` | `bare`, `smart` (the default) or `all`. Smart gives every documented attribute every argument shape, a token-table name its bare form, and more shapes only where a site recognised it. A shape known to be required is always tried. |
| `--no-tokens` | Leave out the token table. |
| `--jobs`, `--port` | Concurrent IDE lanes (default 4) and the first DevTools port; a lane uses one more each (default 9560). |
| `--batch-size` | Probes per project (default 400). |
| `--verify N` | Rebuild N random probes and compare. |
| `--out <file>` | Write the Markdown report there. Without it the report goes to standard output. |
| `--dump-results <file>` | Also write every result, raw, as JSON: each name at each site with the answer for each argument shape. |
| `--work`, `--keep` | Where projects are staged, which must be under the system temp folder, and whether to keep them. |
| `--preflight` | Build only the canaries, baselines and controls, and stop. About 20 seconds, and the way to check a change to a site. |
| `--dry-run` | Count the probes and build nothing. |
| `--timeout <secs>` | How long to wait for one build to settle. Default 180. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](#tbbuild). |

**An Enum member cannot be tested.** An Enum body accepts any attribute written on its own line, including one that applies nowhere, and refuses every attribute written inline, so the site is voided and a target on an Enum member is reported as one the sweep could not test.

**A clean build says the compiler accepts an attribute at a site.** It does not say the attribute does anything, and the IDE's background compile is what is read, so a check made only when linking is not seen. Where the report points at a target worth documenting, an A/B probe like X29 to X33 in `gen_attribute_probes.mjs` is what shows the effect.

Like [`check_examples.mjs`](#check-examples) it needs a twinBASIC install and Windows with a private desktop, so it is outside every gate and outside CI. **Pass `--out` and `--dump-results`.** The report is the only product, and a run piped through `tail` keeps one line of it.

Exit codes: **0** the report was produced and its self-checks held; **1** a self-check found a fault --- a probe disturbed the canaries even beside nothing else, or `--verify` found a probe that answered differently the second time; **2** a refused command line, no install, canaries that do not draw what the script records, a harness failure, a run cut short (its report is written all the same, and says so at the top), or a crash.

### impexp.mjs and impexp.py
{: #impexp }

    node scripts/impexp.mjs export <project> <folder> [--overwrite]
    node scripts/impexp.mjs import <project> <folder> [--overwrite]
    node scripts/impexp.mjs settings|licence|changelog|readme <project>
    node scripts/impexp.mjs --self-test

Standalone `.twinproj` / `.twinpack` unpacker and packer, with the compiler executable's own command line: the same six commands, the project file first, and `--overwrite` required to replace anything. `scripts/impexp.py` is the same tool, run as `python scripts/impexp.py ...`; the two editions print the same output and write byte-identical project files, which [`check_impexp_parity.mjs`](#check-impexp-parity) checks. Neither has dependencies; the Node edition needs Node 18+, the Python edition Python 3.6+. The exit code says what happened, so a caller need not read the output. `--self-test` needs nothing but the script, and adds a round trip of `indexer/sample.twinpack` when run from this repository.

**Neither is run by the site build.** They are published downloads: `_config.yml`'s `bundle_extra` copies both into `Features/Packages/downloads/`, and [Import/Export Tool](../../Features/Packages/Import-Export-Tool) offers them to readers as the two editions of one tool. That is why `impexp.py` is one of only two `.py` files in a repository whose tooling is otherwise all Node --- porting it would delete a deliberate offering rather than tidy anything up. The `bundle_extra` exemption is by exact path, so moving either file breaks the download; see [`check_publish_policy.mjs`](#check-publish-policy). The Node edition is also a library: `scripts/lib/tb-project.mjs` imports its `exportProject` and `importProject`, and the tools that unpack or pack a twinBASIC project call them directly, among them [`tbbuild.mjs`](#tbbuild), [`tbrun.mjs`](#tbrun), [`check_examples.mjs`](#check-examples), [`census_attributes.mjs`](#census-attributes) and [`bug_repro.mjs`](#bug-repro). The Python edition is only a download.

Exit codes: the table in [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) gives every code. This tool keeps its own codes, which the two editions share and which are not those of the other tools here.

### render-book.mjs
{: #bookrender-bookmjs }

    node book/render-book.mjs <input.html> -o <output.pdf> [options]

The PDF renderer that `book.bat` calls. It is a generic HTML-to-PDF converter: it takes the pre-built `_site-pdf/book.html` as its sole document input and has no knowledge of `_data/book.yml` --- all chapter structure, heading levels, and outline entries are already embedded in the HTML by `tbdocs` Phase 8. Uses `puppeteer` + `paged.js` + `pdf-lib` directly, so it controls `pdf-lib`'s `parseSpeed` (the default yields the event loop between every 100 objects on load, adding ~32 seconds to a 100-second build for no reason in Node --- see [perf/README.md](https://github.com/twinbasic/documentation/blob/main/perf/README.md) for the diagnosis).
Key options used by `book.bat`:

| Flag | Effect |
|---|---|
| `-o <output.pdf>` | Output PDF path. |
| `--outline-tags h1,h2,h3,h4` | Heading levels to include in the PDF outline / bookmarks. |
| `--additional-script <path>` | Path to a script injected before paged.js runs. `book.bat` passes `perf\detach-pages.js`, which hides each finalised page from Chromium's layout tree and restores them all before `page.pdf()` runs, dropping render time from ~104s to ~51s on a 1,638-page book by sidestepping paged.js's quadratic overflow walker. |

Exit codes: **0** the PDF was written; **2** a refused command line, an input or script that does not exist, a render that failed, or a crash. There is no 1.

## Configuration files

The build pipeline also reads a handful of declarative files. They are not executable but the build's behaviour depends on them.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `exclude` (which filters the source walk but is **not** the publish safety net --- see [`check_publish_policy.mjs`](#check-publish-policy)), the footer / aux-link knobs, the GitHub edit-link knobs, and the download-link knobs (`gh_offline_link`, `gh_offline_link_url`, `gh_pdf_link_url`). Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block) are ignored. |
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Its `left_out:` list names the pages deliberately not in the book, each with a `reason:`; the build warns about a page that is in neither. Full schema is documented in the file header. Phase 2 resolves chapter arrays; Phase 8 assembles `book.html`. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that determines both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
