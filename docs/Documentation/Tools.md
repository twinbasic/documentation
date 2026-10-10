---
title: Tools and Scripts
parent: Documentation Development
nav_order: 4
has_children: true
has_toc: false
permalink: /Documentation/Development/Tools
---

# Tools and Scripts
{: .no_toc }

Reference for every executable in the documentation repository. This page covers the nine Windows batch wrappers at the repository root, the conventions every command-line tool shares, and the configuration files the tools read. The tools themselves --- the Node and Python scripts under `scripts/`, the one twinBASIC program there, [`imagestrip`](Tools-IDE#imagestrip), the `tbdocs` orchestrator and its CLI flags, and the PDF render driver --- are on seven pages, grouped by what they work on. If you are looking for the day-to-day workflow rather than a cheat sheet, the [Building and Deployment](Building) page is the gentler read; if you are modifying the build pipeline itself, the [tbdocs Internals](Builder) page goes one level deeper.

* TOC goes here
{:toc}

## Tool groups

![Eight rounded boxes, one per group of tools, each holding a smaller rounded box for every tool in the group. Batch wrappers holds the nine .bat files at the repository root. Build and Generation holds tbdocs, render-book, compare_trees and the generators of committed files. Site Checks holds the link, freshness, diagram and accessibility checks. Toolchain Tests, the largest group, holds the gates test.bat runs. Compiler Harness holds tbbuild, tbrun, impexp and the probes of the harness itself. Code Samples and Attributes holds check_examples and the three attribute tools. IDE Automation holds the add-in and IDE test runners, try_help_addin, shoot_docs, imagestrip, probe_ide_image_labels and the SVG replay. Defect Reproducers holds bug_repro and vb6run.](Images/Tools-Groups.svg)

- [Build and Generation Tools](Tools-Build) -- `tbdocs`, the PDF render driver, the build comparison, and the generators of committed files.
- [Site Checks](Tools-Site-Checks) -- the link, freshness, diagram and accessibility checks over a built site.
- [Toolchain Tests](Tools-Toolchain-Tests) -- the gates `test.bat` runs, which test the toolchain rather than the pages.
- [Compiler Harness](Tools-Compiler) -- `tbbuild`, `tbrun`, `impexp`, and the probes of the harness itself.
- [Code Samples and Attributes](Tools-Samples) -- `check_examples` and the attribute census, probe generator and sweep.
- [IDE Automation](Tools-IDE) -- the add-in and IDE test runners, the help add-in tryout, the screenshot tool, and the IDE's embedded images.
- [Defect Reproducers](Tools-Defects) -- `bug_repro` and `vb6run`.

## Command-line conventions

Every Node tool answers `--help` or `-h` by printing its usage to standard output and exiting 0, without doing any of its work. A command line a tool cannot use is refused the same way by every Node tool: an unknown flag, a flag without its value or with an empty one, and an unexpected argument are reported on standard error and exit **2**. So is a crash. So is a value a tool cannot use, before it does any work: a number that is not one or is out of range (a fraction where a whole number is needed), a regular expression that does not compile, a URL that is not an absolute `http` or `https` one, a date that is not ISO 8601, a value outside a fixed set, and options that exclude each other. A tool that reads its command line through `lib/cli.mjs` and takes search terms, file names or folder names takes one that starts with a dash after `--`.

## Batch wrappers at the repository root
{: #batch-wrappers }

All nine sit at the repository root, beside `package.json` --- not under `docs/`. Each uses `@pushd "%~dp0"` to run from that root regardless of where it is invoked from, and each entry below gives the POSIX equivalent of what it runs. Those equivalents have no `pushd` in front of them, so **run them from the repository root** --- `tbdocs`'s `--src docs`, [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy)'s default source root, and every path handed to [`render-book.mjs`](Tools-Build#bookrender-bookmjs) are all resolved against the working directory. `examples.bat`, `addin-test.bat`, `ide-test.bat` and `try-help-addin.bat` are the exceptions to "each entry below gives the POSIX equivalent": they need a twinBASIC install and drive the IDE, so they are Windows-only, and none is part of the site build. Four other tools are Windows-specific for the same reason and are likewise not part of it: [`scripts/tbbuild.mjs`](Tools-Compiler#tbbuild) and [`scripts/tbrun.mjs`](Tools-Compiler#tbrun), which drive the twinBASIC IDE, and [`census_attributes.mjs`](Tools-Samples#census-attributes) and [`build_package_api.mjs`](Tools-Build#build-package-api), which unpack the packages of a twinBASIC install --- though those two are cross-platform when given an already-exported tree with `--exported`. [`imagestrip`](Tools-IDE#imagestrip) is a twinBASIC program, so it runs only on Windows too, and it is not part of the build either. Nothing else in the repository is: `tbdocs` and every gate in both wrappers is a Node script, and CI runs all of them on `ubuntu-latest` except [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh), which guards against a failure mode CI cannot have.

### build.bat

    build.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --check-audit-index [extra tbdocs flags]

Renders the documentation. Wraps `node builder/tbdocs.mjs --src docs --check-audit-index` and forwards extra arguments through `%*`. Produces `_site/`, `_site-offline/`, and `_site-pdf/`, modulo the `--no-offline` / `--no-pdf` flags and the `also_build_offline` / `also_build_pdf` keys in `_config.yml`. A local build also ends by writing the [help archive](Tools-Build#the-help-archive), unless `--no-help-archive` is given. It returns [`tbdocs`](Tools-Build#tbdocs)'s exit code as it is.

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

The gates that read the built site. Link and integrity checking is not among them any more --- that moved into `build.bat` (see [tbdocs](Tools-Build#tbdocs)). Tests of the toolchain itself are not among them either --- those are [`test.bat`](#testbat). Four steps, each stopping the run if it fails:

1. [`scripts/check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) --- refuses a tree older than the sources that produced it. Scanning a stale tree reports a pass for the previous build.
2. [`scripts/check_a11y.mjs`](Tools-Site-Checks#check-a11y) --- the puppeteer + axe-core accessibility scan. First here and first in the composite action CI uses, so the deploy workflow's backgrounded book PDF render overlaps with it only at the start.
3. [`scripts/check_dot_fit.mjs`](Tools-Site-Checks#check-dot-fit) --- re-renders every committed diagram with the real webfont and fails if a label sits outside its box.
4. [`scripts/pick_a11y_sample.mjs --check`](Tools-Site-Checks#pick-a11y-sample) --- verifies the sample still covers every markup construct the site uses.

Requires `build.bat` to have run first. POSIX --- four commands, not one, chained so the run stops where `check.bat` would:

    node scripts/check_tree_fresh.mjs \
      && node scripts/check_a11y.mjs \
      && node scripts/check_dot_fit.mjs \
      && node scripts/pick_a11y_sample.mjs --check

Exit codes: **0** every step passed; otherwise the code of the step that stopped the run, as that step's entry gives it.

One of the four does not mean the same thing locally as it does in CI, on any platform. [`check_a11y.mjs`](Tools-Site-Checks#check-a11y)'s `target-size` rule measures rendered boxes, and an inline element's measured height is the content area of whatever `system-ui` resolves to on the machine running the scan --- which is why both workflows install `fonts-liberation` and the site's padding is calibrated against the smallest face in that band. A local pass does not predict the runner's, and it errs in the unhelpful direction: larger metrics clear controls that CI then fails. See [Building and Deployment](Building#fonts-liberation-installed-on-purpose) for the measurements.

### test.bat

    test.bat

The tests the toolchain has to pass. Twenty-four steps, each stopping the run if it fails:

1. [`scripts/check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy) --- verifies the publish allowlist still refuses the types it is meant to. Needs neither a browser nor a built tree, so it goes first.
2. [`scripts/check_gate_lists.mjs`](Tools-Toolchain-Tests#check-gate-lists) --- verifies the two gate lists on this page still match the wrappers that run them.
3. [`scripts/check_ci_workflows.mjs`](Tools-Toolchain-Tests#check-ci-workflows) --- verifies both CI workflows run the gates the wrappers run, and build as `build.bat` does.
4. [`scripts/check_lint.mjs`](Tools-Toolchain-Tests#check-lint) --- runs Biome's linter and formatter check over the tooling and fails on any finding, warnings and layout included.
5. [`test/search.test.mjs`](Tools-Toolchain-Tests#search-test) --- unit tests for the site search: what the search entries hold, and that the copies of the search client agree.
6. [`test/render.test.mjs`](Tools-Toolchain-Tests#render-test) --- unit tests for the markdown-it plugins, on inputs no page holds.
7. [`test/strftime.test.mjs`](Tools-Toolchain-Tests#strftime-test) --- unit tests for the footer's date formatter, which no build calls.
8. [`test/png.test.mjs`](Tools-Toolchain-Tests#png-test) --- unit tests for the pictures of a bug reproducer: PNG decoding, comparing and the side-by-side image, the files behind `images` and `expect.imagesDiffer`, and the refusals of `bug_repro.mjs` over fixtures.
9. [`test/compact-image.test.mjs`](Tools-Toolchain-Tests#compact-image-test) --- unit tests for what an embedded image keeps: an editor's metadata goes, and a notice of whose the picture is and on what terms stays. The half that runs [`imagestrip`](Tools-IDE#imagestrip) is skipped unless its exe is named.
10. [`test/svgshot.test.mjs`](Tools-Toolchain-Tests#svgshot-test) --- unit tests that an SVG screenshot is written on one line, that its underlines are placed as Chromium places them, that a background image is sized by its bytes, that a frame's page is placed inside its frame, that a web font is found and cut as the page uses it, that the page's own `<svg>` icons are found and kept apart, and that a colour filter is baked into the colours it paints.
11. [`test/example-batches.test.mjs`](Tools-Toolchain-Tests#example-batches-test) --- runs `check_examples.mjs`'s probes, which test how samples are batched and how a crashed batch is cut down, without an IDE.
12. [`test/ports.test.mjs`](Tools-Toolchain-Tests#ports-test) --- unit tests for how the harness claims the DevTools ports its IDEs use, without an IDE.
13. [`test/addin-project.test.mjs`](Tools-Toolchain-Tests#addin-project-test) --- unit tests for how the build packs the help add-in's project file: exactly the files git tracks in `add-in/`, never `Resources/HELP/`, the same bytes from any checkout.
14. [`scripts/check_regex_safety.mjs`](Tools-Toolchain-Tests#check-regex-safety) --- refuses a regex that can backtrack exponentially, written as a literal or built from constants.
15. [`scripts/check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) --- verifies no pre-render rewrite alters the contents of a code fence or code span, that the rewrites over rendered HTML leave a raw `<pre>` or `<code>` alone, and that `lib/markdown.mjs` and `lib/frontmatter.mjs` pass their probes.
16. [`scripts/check_page_baseline.mjs`](Tools-Toolchain-Tests#check-page-baseline) --- verifies the page-count drift guard still refuses a fall.
17. [`scripts/check_book_coverage.mjs`](Tools-Toolchain-Tests#check-book-coverage) --- verifies the build still warns about a page `docs/_book.yml` does not mention.
18. [`scripts/check_symbol_index.mjs`](Tools-Toolchain-Tests#check-symbol-index) --- verifies the symbol index still places each kind of symbol, and its drift guard still refuses a lost URL.
19. [`scripts/check_twin_parsers.mjs`](Tools-Toolchain-Tests#check-twin-parsers) --- verifies the scanners of twinBASIC source and of the attribute reference still read the shapes each once misread.
20. [`scripts/check_attribute_sweep.mjs`](Tools-Toolchain-Tests#check-attribute-sweep) --- verifies the logic of the attribute sweep: its site skeletons, how it reads a probe's diagnostics, how it batches probes, and how it compares the answers with `Attributes.md`.
21. [`scripts/check_cli.mjs`](Tools-Toolchain-Tests#check-cli) --- verifies `lib/cli.mjs`, the command-line parser, and each tool's recorded command-line errors.
22. [`scripts/check_pdf_shims_equiv.mjs`](Tools-Toolchain-Tests#check-pdf-shims-equiv) --- verifies the book's pdf-lib shims write what stock pdf-lib writes, patch the members of pdf-lib it lists, have each of them in their shim's table of targets, and run.
23. [`scripts/check_impexp_parity.mjs`](Tools-Toolchain-Tests#check-impexp-parity) --- verifies the two editions of the impexp tool pass the same built-in tests, and exit, print and write the same for one sequence of commands. Without Python it reports itself skipped and passes, except in CI.
24. [`scripts/check_axe_patch_equiv.mjs`](Tools-Toolchain-Tests#check-axe-patch-equiv) --- verifies the vendored axe source patch still produces identical colour values.

POSIX:

    node scripts/check_publish_policy.mjs \
      && node scripts/check_gate_lists.mjs \
      && node scripts/check_ci_workflows.mjs \
      && node scripts/check_lint.mjs \
      && node --test test/search.test.mjs \
      && node --test test/render.test.mjs \
      && node --test test/strftime.test.mjs \
      && node --test test/png.test.mjs \
      && node --test test/compact-image.test.mjs \
      && node --test test/svgshot.test.mjs \
      && node --test test/example-batches.test.mjs \
      && node --test test/ports.test.mjs \
      && node --test test/addin-project.test.mjs \
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

**Twenty of the twenty-three cannot be affected by an edit confined to `docs/`**, which is why they are separate from `check.bat`. Run this one when the change touches `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/` or `test/`, the site's scripts in `docs/assets/js/`, the help add-in's source in `add-in/`, a wrapper, or a workflow. Both CI workflows run all twenty-four unconditionally, so skipping it locally cannot let a tooling regression reach `staging`.

The three exceptions are [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions), [`check_gate_lists.mjs`](Tools-Toolchain-Tests#check-gate-lists), which reads this page, and [`check_lint.mjs`](Tools-Toolchain-Tests#check-lint), which lints the site's scripts in `docs/assets/js/`. The first is worth knowing in detail. Its corpus sweep tokenises every markdown file under `docs/`, so a page that provokes a rewrite into altering a code region fails it. Its fixed probes are a different matter: they run against their own sources whatever the tree holds, and they cover the *mirror* fault, where a rewrite silently stops firing. The sweep cannot see that one --- text the rewrite skipped is stashed and restored unchanged, so every region still matches. Add a page with an unusual code construct and run `test.bat`, but read the built page too.

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

Renders the PDF book from `docs\_site-pdf\book.html` into `docs\_pdf\twinBASIC Book.pdf`, by calling `node book\render-book.mjs` (see [below](Tools-Build#bookrender-bookmjs)). The output filename is set by the `-o` argument here; to rename the PDF, update it in `book.bat` and in `.github/workflows/tbdocs-gh-pages.yml`.

`build.bat` must have populated `_site-pdf/` first. `book.bat` checks that rather than assuming it --- see [the pre-flight](#book-preflight) below.

**The `npm install` guard tests for the package, not for the browser.** `puppeteer`'s own `postinstall` downloads Chromium, so an ordinary `npm install` normally leaves both in place. What `book.bat` checks is whether `node_modules\puppeteer\package.json` exists, and that says nothing about the browser --- so an install run with `--ignore-scripts` or `PUPPETEER_SKIP_DOWNLOAD`, or a puppeteer cache cleared afterwards, passes the only test `book.bat` makes and still has nothing to render with. `npx puppeteer browsers install chrome` fixes that case; both CI workflows run it as a step of its own rather than relying on the postinstall. [PDF Generation](PDF-Generation#chromium-is-not-installed) gives the error it produces.

The `mkdir` is not housekeeping. `render-book.mjs` writes the PDF with a plain file write and never creates the directory above it, so a missing `docs/_pdf/` fails with `ENOENT` at the very end of the render, after the whole page-breaking pass has already run. `book.bat` and the deploy workflow both create it first, for that reason.

**Do not chain the two as `build.bat && book.bat`.** `build.bat` sets a non-zero exit code when the link or integrity check finds something, and still writes all three trees --- the finding is a report, not an abort. `&&` reads only the exit code, so a broken link anywhere on the site cancels the render, for a reason that has nothing to do with the book. The terminal ends on the link findings and no PDF, which reads as a render that failed rather than as one that never started. Run them as two separate commands; see [Building and Deployment](Building#the-double-ampersand-trap).

Exit codes: **0** the PDF was written; **1** the tree is stale, or `npm install` failed; **2** there is no built tree, or the render failed. [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) runs first and `book.bat` returns its code as it is; [`render-book.mjs`](Tools-Build#bookrender-bookmjs) has no 1 of its own.

#### The pre-flight freshness check
{: #book-preflight }

`book.bat`'s **first** action, before the `npm install` test and before the renderer starts, is:

    node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html

[`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) refuses a `_site-pdf/` tree older than `docs/` or `builder/`. An existence test is not enough: edit a page, run `book.bat` without `build.bat`, and it would spend two minutes rendering the **previous** book and report success. Nothing downstream notices, because the PDF it produces is internally consistent, correctly paginated and correctly bookmarked. It is simply the wrong book.

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

One invocation of [`check_examples.mjs`](Tools-Samples#check-examples), with every flag passed straight through:

    node scripts/check_examples.mjs [flags]

Compiles the documentation's own twinBASIC code samples --- every ` ```tb ` fence marked `check_build` --- and reports the ones the compiler refuses, against the line in the page they came from. A sample also marked `check_run` is run, and what it prints is checked against what the page says it prints. [Authoring Pages](Authoring#checking-that-a-sample-compiles) is the page for marking a sample and for what a pull request that changes one shows; this entry is about running the tool.

**It is not one of the gates, and it must not become one.** It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows, for three reasons that are not going to change: it needs a twinBASIC install, where `npm install` has to remain sufficient to build the docs; it needs Windows, a private desktop and a CDP-reachable WebView2, none of which exists on the CI box; and an IDE cold start is 6 to 8 seconds against a whole site build's four. It is run by a person, deliberately, which is the same arrangement [`sweep_a11y.mjs`](Tools-Site-Checks#sweep-a11y) already has.

Exit codes: those of [`check_examples.mjs`](Tools-Samples#check-examples), returned as they are: **0** clean, **1** a sample does not compile, or does not run as its page says, **2** the harness failed.

### addin-test.bat
{: #addin-testbat }

    addin-test.bat [flags]

One invocation of [`addin_test.mjs`](Tools-IDE#addin-test), with every flag passed straight through:

    node scripts/addin_test.mjs [flags]

Tests twinBASIC IDE add-ins by machine: it builds each add-in under test, loads it into an IDE, operates the IDE the way a person would, and checks what the add-in did.

**It is not one of the gates either**, and for the reasons `examples.bat` is not: it needs a twinBASIC install, and it needs Windows, a private desktop and a CDP-reachable WebView2. It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes: those of [`addin_test.mjs`](Tools-IDE#addin-test), returned as they are: **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### ide-test.bat
{: #ide-testbat }

    ide-test.bat [flags]

One invocation of [`ide_test.mjs`](Tools-IDE#ide-test), with every flag passed straight through:

    node scripts/ide_test.mjs [flags]

Tests the twinBASIC IDE itself by machine: it opens a project in an IDE, operates the IDE the way a person would (the debugger, Export Project, the Packages dialog), and checks what the IDE did. It is the runner of [`addin-test.bat`](#addin-testbat) for scenarios that test the IDE rather than an add-in.

**It is not one of the gates either**, and for the reasons `examples.bat` is not: it needs a twinBASIC install, and it needs Windows, a private desktop and a CDP-reachable WebView2. It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes: those of [`ide_test.mjs`](Tools-IDE#ide-test), returned as they are: **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### try-help-addin.bat
{: #try-help-addinbat }

    try-help-addin.bat [flags]

One invocation of [`try_help_addin.mjs`](Tools-IDE#try-help-addin), with every flag passed straight through:

    node scripts/try_help_addin.mjs [flags]

Opens an IDE on your desktop with the help add-in built and loaded, to try it by hand, and puts the registry back once the IDE is closed. **It is not one of the gates**: it needs a twinBASIC install and Windows.

Exit codes: those of [`try_help_addin.mjs`](Tools-IDE#try-help-addin), returned as they are: **0** the IDE was closed and the registry is as it was found, **1** the add-in did not build or the project does not compile, **2** the tool could not run, **3** the registry or the work folder was not put back.

## Configuration files

The build pipeline also reads a handful of declarative files. They are not executable but the build's behaviour depends on them.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `exclude` (which filters the source walk but is **not** the publish safety net --- see [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy)), the footer / aux-link knobs, the GitHub edit-link knobs, and the download-link knobs (`gh_offline_link`, `gh_offline_link_url`, `gh_pdf_link_url`). Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block) are ignored. |
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Its `left_out:` list names the pages deliberately not in the book, each with a `reason:`; the build warns about a page that is in neither. Full schema is documented in the file header. Phase 2 resolves chapter arrays; Phase 8 assembles `book.html`. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into a Symbol-keyed palette that determines both the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh from the installer when the IDE adds new palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
