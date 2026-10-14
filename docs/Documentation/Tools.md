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

Reference for every executable in the documentation repository. This page covers the nine Windows batch wrappers at the repository root, the conventions every command-line tool shares, and the configuration files the tools read. The tools themselves --- the Node and Python scripts under `scripts/`, the twinBASIC programs [`imagestrip`](Tools-IDE#imagestrip) and [`impexp`](Tools-Compiler#impexp), `tbdocs` and its flags, and the PDF render driver --- are on seven pages, grouped by what they work on. For the day-to-day workflow, see [Building and Deployment](Building). To modify the build pipeline, see [tbdocs Internals](Builder).

* TOC goes here
{:toc}

## Tool groups

![Eight rounded boxes, one per group of tools, each holding a smaller rounded box for every tool in the group. Batch wrappers holds the nine .bat files at the repository root. Build and Generation holds tbdocs, render-book, compare_trees and the generators of committed files. Site Checks holds the link, freshness, diagram and accessibility checks. Toolchain Tests, the largest group, holds the gates test.bat runs. Compiler Harness holds tbbuild, tbrun, impexp and the probes of the harness itself. Code Samples and Attributes holds check_examples and the three attribute tools. IDE Automation holds the add-in and IDE test runners, try_help_addin, shoot_docs, imagestrip, probe_ide_image_labels, probe_theme_semicolon and the SVG replay. Defect Reproducers holds bug_repro and vb6run. Each group's name links to its page, and each tool's box to its entry.](Images/Tools-Groups.svg)

- [Build and Generation Tools](Tools-Build) -- `tbdocs`, the PDF render driver, the build comparison, and the generators of committed files.
- [Site Checks](Tools-Site-Checks) -- the link, freshness, diagram and accessibility checks over a built site.
- [Toolchain Tests](Tools-Toolchain-Tests) -- the gates `test.bat` runs, which test the toolchain rather than the pages.
- [Compiler Harness](Tools-Compiler) -- `tbbuild`, `tbrun`, `impexp`, and the probes of the harness itself.
- [Code Samples and Attributes](Tools-Samples) -- `check_examples` and the attribute census, probe generator and sweep.
- [IDE Automation](Tools-IDE) -- the add-in and IDE test runners, the help add-in tryout, the screenshot tool, and the IDE's embedded images.
- [Defect Reproducers](Tools-Defects) -- `bug_repro` and `vb6run`.

## Command-line conventions

Every Node tool answers `--help` or `-h` by printing its usage to standard output and exiting 0, without doing any work.

Every Node tool refuses an unusable command line the same way: it reports the problem on standard error and exits **2**, before doing any work. A crash also exits 2. The refused cases are:

- an unknown flag, a flag without its value or with an empty one, and an unexpected argument;
- a number that is not a number, is out of range, or is a fraction where a whole number is needed;
- a regular expression that does not compile;
- a URL that is not an absolute `http` or `https` one;
- a date that is not ISO 8601;
- a value outside a fixed set;
- options that exclude each other.

A tool that reads its command line through `lib/cli.mjs` and takes search terms, file names or folder names accepts one that starts with a dash after `--`.

## Batch wrappers at the repository root
{: #batch-wrappers }

All ten sit at the repository root, beside `package.json`. Each uses `@pushd "%~dp0"` to run from that root wherever it is invoked, and each entry below gives the POSIX equivalent of what it runs. The equivalents have no `pushd`, so **run them from the repository root**: `tbdocs`'s `--src docs`, [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy)'s default source root and every path given to [`render-book.mjs`](Tools-Build#bookrender-bookmjs) resolve against the working directory.

`examples.bat`, `package-tests.bat`, `addin-test.bat`, `ide-test.bat` and `try-help-addin.bat` have no POSIX equivalent. They need a twinBASIC install and drive the IDE, so they run only on Windows and are not part of the site build. Four other tools are Windows-specific for the same reason and are not part of the build either:

- [`scripts/tbbuild.mjs`](Tools-Compiler#tbbuild) and [`scripts/tbrun.mjs`](Tools-Compiler#tbrun) drive the twinBASIC IDE.
- [`census_attributes.mjs`](Tools-Samples#census-attributes) unpacks the packages of a twinBASIC install. It is cross-platform when given an already-exported tree with `--exported`.
- [`imagestrip`](Tools-IDE#imagestrip) is a twinBASIC program.

The twinBASIC edition of [`impexp`](Tools-Compiler#impexp) is a Windows program too. Built, it needs no twinBASIC install, Node or Python to run.

`tbdocs` and every gate in both wrappers is a Node script. CI runs all of them on `ubuntu-latest` except [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh), which guards against a failure CI cannot have.

### build.bat

    build.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --check-audit-index [extra tbdocs flags]

Renders the documentation, forwarding extra arguments through `%*`. Produces `_site/`, `_site-offline/` and `_site-pdf/`, unless `--no-offline` / `--no-pdf` or the `also_build_offline` / `also_build_pdf` keys in `_config.yml` turn one off. A local build also writes the [help archive](Tools-Build#the-help-archive), unless `--no-help-archive` is given.

Keep `--check-audit-index` when running `tbdocs` by hand. It implies `--check`; without it the same three trees are written, no link check runs, and the build reports success.

Every run prints its own time (`Done in …`, with the page and static-file counts). The time depends on page count, core count and which passes ran: `--no-check`, `--no-offline`, `--no-pdf` and `--no-help-archive` each remove one.

Exit codes, those of [`tbdocs`](Tools-Build#tbdocs): **0** nothing to report; **1** the build or its check found a problem: a link or integrity failure, a failed build step, a fall in the page count, or a symbol-index URL lost; **2** a refused command line, a build stopped by the stall watchdog, or a crash.

### serve.bat

    serve.bat [extra tbdocs flags]

POSIX:

    node builder/tbdocs.mjs --src docs --serve [extra tbdocs flags]

Starts a live preview, forwarding extra arguments through `%*`. After an initial build it serves the site on port 4000 (`--port <N>` changes it), rebuilds on each change under `docs/`, and reloads a connected browser after each successful rebuild. The offline and PDF passes are skipped. Ctrl+C stops it. **Only failures (4xx, 5xx, server exceptions) are logged.** **An edit under `builder/` does not reach a running preview**; restart it --- see [why `serve.bat` does not show a builder change](Extending#serve-does-not-reload).

Exit codes, those of `tbdocs`: **0** the server was stopped with Ctrl+C, **2** a refused command line, a failed first build, a port already in use, or a crash.

### check.bat

    check.bat

The gates that read the built site; run `build.bat` first. Link and integrity checking is in `build.bat` (see [tbdocs](Tools-Build#tbdocs)), and tests of the toolchain are in [`test.bat`](#testbat). Four steps, each stopping the run if it fails:

1. [`scripts/check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) --- refuses a tree older than the sources that produced it.
2. [`scripts/check_a11y.mjs`](Tools-Site-Checks#check-a11y) --- the puppeteer + axe-core accessibility scan.
3. [`scripts/check_dot_fit.mjs`](Tools-Site-Checks#check-dot-fit) --- re-renders every committed diagram with the real webfont and fails if a label sits outside its box.
4. [`scripts/pick_a11y_sample.mjs --check`](Tools-Site-Checks#pick-a11y-sample) --- verifies the sample still covers every markup construct the site uses.

POSIX --- four commands, chained so the run stops where `check.bat` would:

    node scripts/check_tree_fresh.mjs \
      && node scripts/check_a11y.mjs \
      && node scripts/check_dot_fit.mjs \
      && node scripts/pick_a11y_sample.mjs --check

Exit codes: **0** every step passed; otherwise the code of the step that stopped the run, as that step's entry gives it.

A local pass of [`check_a11y.mjs`](Tools-Site-Checks#check-a11y) does not predict CI's. Its `target-size` rule measures rendered boxes, and an inline element's height depends on the font `system-ui` resolves to on the machine running the scan. Both workflows install `fonts-liberation`, and the site's padding is calibrated against the smallest face in that band. Larger local metrics clear controls that CI then fails. See [Building and Deployment](Building#fonts-liberation-installed-on-purpose).

### test.bat

    test.bat

The tests the toolchain has to pass. Twenty-six steps, each stopping the run if it fails:

1. [`scripts/check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy) --- verifies the publish allowlist still refuses the types it should. Needs neither a browser nor a built tree.
2. [`scripts/check_gate_lists.mjs`](Tools-Toolchain-Tests#check-gate-lists) --- verifies the two gate lists on this page still match the wrappers that run them.
3. [`scripts/check_ci_workflows.mjs`](Tools-Toolchain-Tests#check-ci-workflows) --- verifies both CI workflows run the gates the wrappers run, and build as `build.bat` does.
4. [`scripts/check_lint.mjs`](Tools-Toolchain-Tests#check-lint) --- runs Biome's linter and formatter check over the tooling and fails on any finding, warnings and layout included.
5. [`test/search.test.mjs`](Tools-Toolchain-Tests#search-test) --- unit tests for the site search: what the search entries hold, and that the copies of the search client agree.
6. [`test/render.test.mjs`](Tools-Toolchain-Tests#render-test) --- unit tests for the markdown-it plugins, on inputs no page holds.
7. [`test/strftime.test.mjs`](Tools-Toolchain-Tests#strftime-test) --- unit tests for the footer's date formatter, which no build calls.
8. [`test/png.test.mjs`](Tools-Toolchain-Tests#png-test) --- unit tests for the pictures of a bug reproducer: PNG decoding, comparing and the side-by-side image, the files behind `images` and `expect.imagesDiffer`, and the refusals of `bug_repro.mjs`.
9. [`test/compact-image.test.mjs`](Tools-Toolchain-Tests#compact-image-test) --- unit tests for what an embedded image keeps: an editor's metadata goes, a notice of ownership and terms stays. The half that runs [`imagestrip`](Tools-IDE#imagestrip) is skipped unless its exe is named.
10. [`test/svgshot.test.mjs`](Tools-Toolchain-Tests#svgshot-test) --- unit tests that an SVG screenshot is written on one line, that its underlines are placed as Chromium places them, that a background image is sized by its bytes, that a frame's page is placed inside its frame, that a web font is found and cut as the page uses it, that the page's own `<svg>` icons are found and kept apart, and that a colour filter is baked into the colours it paints.
11. [`test/example-batches.test.mjs`](Tools-Toolchain-Tests#example-batches-test) --- runs `check_examples.mjs`'s probes, which test how samples are batched and how a crashed batch is cut down, without an IDE.
12. [`test/ports.test.mjs`](Tools-Toolchain-Tests#ports-test) --- unit tests for how the harness claims the DevTools ports its IDEs use, and for the temp folder and profile an IDE on a port leaves behind, without an IDE.
13. [`test/addin-project.test.mjs`](Tools-Toolchain-Tests#addin-project-test) --- unit tests for how the build packs the help add-in's project file: exactly the files git tracks in `add-in/`, never `Resources/HELP/`, the same bytes from any checkout.
14. [`test/indexer.test.mjs`](Tools-Toolchain-Tests#indexer-test) --- unit tests for the package indexer: the VB6 preprocessing, the files of a package, the `api.json` built from them (sorted by code unit, nested types by their path, values and fields in declaration order, the same bytes from the same files) and the differ that compares two of them.
15. [`scripts/check_regex_safety.mjs`](Tools-Toolchain-Tests#check-regex-safety) --- refuses a regex that can backtrack exponentially, written as a literal or built from constants.
16. [`scripts/check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) --- verifies no pre-render rewrite alters the contents of a code fence or code span, that the rewrites over rendered HTML leave a raw `<pre>` or `<code>` alone, and that `lib/markdown.mjs` and `lib/frontmatter.mjs` pass their probes.
17. [`scripts/check_page_baseline.mjs`](Tools-Toolchain-Tests#check-page-baseline) --- verifies the page-count drift guard still refuses a fall.
18. [`scripts/check_book_coverage.mjs`](Tools-Toolchain-Tests#check-book-coverage) --- verifies the build still warns about a page `docs/_book.yml` does not mention.
19. [`scripts/check_package_tests.mjs`](Tools-Toolchain-Tests#check-package-tests) --- verifies every NOTE and WARNING of a contributed package's section names the test cases behind it, and that each package test project is in order.
20. [`scripts/check_symbol_index.mjs`](Tools-Toolchain-Tests#check-symbol-index) --- verifies the symbol index still places each kind of symbol, and its drift guard still refuses a lost URL.
21. [`scripts/check_twin_parsers.mjs`](Tools-Toolchain-Tests#check-twin-parsers) --- verifies the scanners of twinBASIC source and of the attribute reference still read the shapes each once misread.
22. [`scripts/check_attribute_sweep.mjs`](Tools-Toolchain-Tests#check-attribute-sweep) --- verifies the logic of the attribute sweep: its site skeletons, how it reads a probe's diagnostics, how it batches probes, and how it compares the answers with `Attributes.md`.
23. [`scripts/check_cli.mjs`](Tools-Toolchain-Tests#check-cli) --- verifies `lib/cli.mjs`, the command-line parser, and each tool's recorded command-line errors.
24. [`scripts/check_pdf_shims_equiv.mjs`](Tools-Toolchain-Tests#check-pdf-shims-equiv) --- verifies the book's pdf-lib shims write what stock pdf-lib writes, patch the members of pdf-lib it lists, have each of them in their shim's table of targets, and run.
25. [`scripts/check_impexp_parity.mjs`](Tools-Toolchain-Tests#check-impexp-parity) --- verifies the editions of the impexp tool pass the same built-in tests, and exit, print and write the same for one sequence of commands. Without Python it reports itself skipped and passes, except in CI. It compares the twinBASIC edition too, when `IMPEXP_EXE` names its built exe.
26. [`scripts/check_axe_patch_equiv.mjs`](Tools-Toolchain-Tests#check-axe-patch-equiv) --- verifies the vendored axe source patch still produces identical colour values.

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
      && node --test test/indexer.test.mjs \
      && node scripts/check_regex_safety.mjs \
      && node scripts/check_code_regions.mjs \
      && node scripts/check_page_baseline.mjs \
      && node scripts/check_book_coverage.mjs \
      && node scripts/check_package_tests.mjs \
      && node scripts/check_symbol_index.mjs \
      && node scripts/check_twin_parsers.mjs \
      && node scripts/check_attribute_sweep.mjs \
      && node scripts/check_cli.mjs \
      && node scripts/check_pdf_shims_equiv.mjs \
      && node scripts/check_impexp_parity.mjs \
      && node scripts/check_axe_patch_equiv.mjs

Exit codes: **0** every step passed; otherwise the code of the step that stopped the run, as that step's entry gives it.

**Twenty-two of the twenty-six cannot be affected by an edit confined to `docs/`**, which is why they are separate from `check.bat`. Run this one when the change touches `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `indexer/` or `test/`, the site's scripts in `docs/assets/js/`, the help add-in's source in `add-in/`, a contributed package's section, a wrapper, or a workflow. Both CI workflows run all twenty-six unconditionally.

The four exceptions are [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions), [`check_gate_lists.mjs`](Tools-Toolchain-Tests#check-gate-lists), which reads this page, [`check_lint.mjs`](Tools-Toolchain-Tests#check-lint), which lints the site's scripts in `docs/assets/js/`, and [`check_package_tests.mjs`](Tools-Toolchain-Tests#check-package-tests), which reads the callouts of the contributed packages' sections.

`check_code_regions.mjs` has two halves. Its corpus sweep tokenises every markdown file under `docs/`, so a page that provokes a rewrite into altering a code region fails it. Its fixed probes run against their own sources whatever the tree holds, and cover the *mirror* fault, where a rewrite silently stops firing; the sweep cannot see that one. After adding a page with an unusual code construct, run `test.bat` and read the built page too.

A gate belongs in `test.bat` rather than `check.bat` if it would still mean something against an empty `docs/`. `check_axe_patch_equiv.mjs` needs a built page and Chromium only because its probe needs some document to run inside; it tests the axe patch.

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

Renders the PDF book from `docs\_site-pdf\book.html` into `docs\_pdf\twinBASIC Book.pdf` with `node book\render-book.mjs` (see [below](Tools-Build#bookrender-bookmjs)). To rename the PDF, change the `-o` argument in `book.bat` and in `.github/workflows/tbdocs-gh-pages.yml`.

Run `build.bat` first to populate `_site-pdf/`; `book.bat` checks this with [the pre-flight](#book-preflight) below.

**The `npm install` guard tests for the package, not for the browser.** `book.bat` checks only that `node_modules\puppeteer\package.json` exists. An install run with `--ignore-scripts` or `PUPPETEER_SKIP_DOWNLOAD`, or a puppeteer cache cleared afterwards, passes that test with no Chromium to render with. `npx puppeteer browsers install chrome` fixes it. [PDF Generation](PDF-Generation#chromium-is-not-installed) gives the error.

`render-book.mjs` does not create the output directory. A missing `docs/_pdf/` fails with `ENOENT` at the end of the render, after the page-breaking pass has run, so `book.bat` and the deploy workflow create it first.

**Do not chain the two as `build.bat && book.bat`.** `build.bat` sets a non-zero exit code when the link or integrity check finds something, though it still writes all three trees. `&&` reads only the exit code, so a broken link anywhere cancels the render, and the terminal ends on the link findings and no PDF. Run them as two separate commands; see [Building and Deployment](Building#the-double-ampersand-trap).

Exit codes: **0** the PDF was written; **1** the tree is stale, or `npm install` failed; **2** there is no built tree, or the render failed. [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) runs first and its code is returned as it is; [`render-book.mjs`](Tools-Build#bookrender-bookmjs) has no 1 of its own.

#### The pre-flight freshness check
{: #book-preflight }

`book.bat` first runs, before the `npm install` test and the renderer:

    node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html

[`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh) refuses a `_site-pdf/` tree older than `docs/` or `builder/`. Without it, editing a page and running `book.bat` without `build.bat` spends two minutes rendering the **previous** book and reports success. The PDF is internally consistent, so nothing flags it. The renderer cannot catch this: it refuses only a missing input (`input not found:` and the resolved path).

`--marker book.html` is required and `book.bat` is the only caller that passes it. The script identifies a tree by its `index.html`, and `_site-pdf/` holds only `book.html`.

**A 2 does not say which half of `book.bat` failed; the message does.** The pre-flight returns 2 for an absent tree and the renderer returns 2 for a failed render. A 1 is unambiguous: a stale tree, or a failed `npm install`. Every pre-flight failure is prefixed `check_tree_fresh:`, and these are the two it prints:

    check_tree_fresh: docs/_site-pdf/book.html does not exist.
      Run build.bat first -- there is no built tree to check.

    check_tree_fresh: docs/_site-pdf is 118s older than docs/Reference/Core/Dim.md.
      Run build.bat first. Scanning a stale tree reports a pass for the
      previous build, which is the one thing these gates must never do.

The check has one known false positive: it watches all of `docs/` and `builder/`, so editing a `builder/PLAN-*.md` marks every tree stale although the build does not read it. Rebuild.

### examples.bat
{: #examplesbat }

    examples.bat [flags]

One invocation of [`check_examples.mjs`](Tools-Samples#check-examples), with every flag passed straight through:

    node scripts/check_examples.mjs [flags]

Compiles the documentation's own twinBASIC code samples --- every ` ```tb ` fence marked `check_build` --- and reports the ones the compiler refuses, against the line in the page they came from. A sample also marked `check_run` is run, and what it prints is checked against the page. To mark a sample, and for what a pull request that changes one shows, see [Authoring Pages](Authoring#checking-that-a-sample-compiles).

**It is not one of the gates, and must not become one.** It is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows, because it needs a twinBASIC install (`npm install` alone must suffice to build the docs) and Windows with a private desktop and a CDP-reachable WebView2 (the CI box has neither). An IDE cold start also takes 6 to 8 seconds, against four for a whole site build. A person runs it, as with [`sweep_a11y.mjs`](Tools-Site-Checks#sweep-a11y).

Exit codes, those of [`check_examples.mjs`](Tools-Samples#check-examples): **0** clean, **1** a sample does not compile, or does not run as its page says, **2** the harness failed.

### package-tests.bat
{: #package-testsbat }

    package-tests.bat <Package> [<Package> ...] [flags]
    package-tests.bat --all-packages [flags]

One invocation of [`package_tests.mjs`](Tools-Samples#package-tests), with every argument passed straight through:

    node scripts/package_tests.mjs <Package> [<Package> ...] [flags]

Runs the contributed packages' test projects under `test/package-tests/`, which back the NOTEs and WARNINGs of each package's section with test cases, and says which cases no longer do what the package's `expect.json` records: fixed, so the page's callout goes, or changed, so a claim of the page is no longer true.

**It is not one of the gates**, for the reasons `examples.bat` is not, and is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows. The gate that ties each callout to its cases, [`check_package_tests.mjs`](Tools-Toolchain-Tests#check-package-tests), needs no install and is in `test.bat`.

Exit codes, those of [`package_tests.mjs`](Tools-Samples#package-tests): **0** every case as documented, **1** a case fixed or changed, **2** the harness failed.

### addin-test.bat
{: #addin-testbat }

    addin-test.bat [flags]

One invocation of [`addin_test.mjs`](Tools-IDE#addin-test), with every flag passed straight through:

    node scripts/addin_test.mjs [flags]

Tests twinBASIC IDE add-ins by machine: it builds each add-in under test, loads it into an IDE, operates the IDE as a person would, and checks what the add-in did.

**It is not one of the gates**, for the reasons `examples.bat` is not, and is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes, those of [`addin_test.mjs`](Tools-IDE#addin-test): **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### ide-test.bat
{: #ide-testbat }

    ide-test.bat [flags]

One invocation of [`ide_test.mjs`](Tools-IDE#ide-test), with every flag passed straight through:

    node scripts/ide_test.mjs [flags]

Tests the twinBASIC IDE itself by machine: it opens a project in an IDE, operates the IDE as a person would (the debugger, Export Project, the Packages dialog), and checks what the IDE did. It is [`addin-test.bat`](#addin-testbat)'s runner for scenarios that test the IDE rather than an add-in.

**It is not one of the gates**, for the reasons `examples.bat` is not, and is absent from `build.bat`, `check.bat`, `test.bat` and both CI workflows.

Exit codes, those of [`ide_test.mjs`](Tools-IDE#ide-test): **0** every lane passed and the registry is as it was found, **1** a lane failed, **2** the harness failed, **3** the registry or a work folder was not put back.

### try-help-addin.bat
{: #try-help-addinbat }

    try-help-addin.bat [flags]

One invocation of [`try_help_addin.mjs`](Tools-IDE#try-help-addin), with every flag passed straight through:

    node scripts/try_help_addin.mjs [flags]

Opens an IDE on your desktop with the help add-in built and loaded, to try it by hand, and puts the registry back once the IDE is closed. **It is not one of the gates**: it needs a twinBASIC install and Windows.

Exit codes, those of [`try_help_addin.mjs`](Tools-IDE#try-help-addin): **0** the IDE was closed and the registry is as it was found, **1** the add-in did not build or the project does not compile, **2** the tool could not run, **3** the registry or the work folder was not put back.

## Configuration files

The build also reads these declarative files.

| File | Effect |
|---|---|
| `docs/_config.yml` | Site config. `tbdocs` reads `url`, `baseurl`, `title`, `logo`, `also_build_offline`, `also_build_pdf`, `offline_exclude`, `exclude` (which filters the source walk but is **not** the publish safety net --- see [`check_publish_policy.mjs`](Tools-Toolchain-Tests#check-publish-policy)), the footer / aux-link knobs, the GitHub edit-link knobs, and the download-link knobs (`gh_offline_link`, `gh_offline_link_url`, `gh_pdf_link_url`). Jekyll-only keys (`markdown`, `kramdown`, `theme`, `highlighter`, the `defaults` block, the `compress_html` block) are ignored. |
| `docs/_book.yml` | The PDF book's chapter manifest. Entries are resolved to pages via the selector schema (`page` / `pages` / `nav_page` / `nav_pages` / `no_descent`) and control PDF outline behaviour via `landing_page:`, `landing_is_target:`, `no_outline_entry:`, `no_heading_shift:`, and `outline_closed:`. Its `left_out:` list names the pages not in the book, each with a `reason:`; the build warns about a page that is in neither. The file header documents the full schema. |
| `builder/themes/Light.theme`, `Dark.theme`, `Classic.theme` | twinBASIC IDE theme files, vendored from the BETA installer. `builder/highlight-theme.mjs` parses them into the palette behind the renderer's scope-to-class mapping and the generated `tb-highlight.css`. Refresh them from the installer when the IDE adds palette entries. |
| `builder/twinbasic.tmLanguage.json` | TextMate grammar for the twinBASIC language. Shiki uses it to tokenise every ` ```tb ` code block. |
