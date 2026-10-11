---
title: Build and Generation Tools
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Tools-Build
---

# Build and Generation Tools
{: .no_toc }

Builds the site and the PDF book, compares two builds, and regenerates the committed artifacts the build reads: the webfonts, the diagram font metrics and the packages' declared API. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## tbdocs --- node builder/tbdocs.mjs
{: #tbdocs }

Entry point for the static site generator. Each caller adds its own flags to the bare `--src docs`, so take the invocation from the caller:

| Caller | Invocation |
|---|---|
| `build.bat` | `--src docs --check-audit-index` (plus anything passed through) |
| `checks.yml` (PR checks) | `--src docs --no-fetch-assets --check-audit-index` |
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

A flag that takes a value accepts it as the next argument or as `--flag=value`; as the next argument, the value may not start with a dash.

| Flag | Effect |
|---|---|
| `--src <path>` | Source root. Default: `docs` relative to the working directory. |
| `--dest <path>` | Online-tree destination. Default: `<src>/_site`. The offline tree goes to `<dest>-offline`, the PDF tree to `<dest>-pdf`. The build refuses a destination that is or contains `<src>`. Inside `<src>`, the destination must be, or be inside, a folder directly under it whose name starts with `_site`, `_serve` or `_pdf`; anywhere else there, the next build or `--serve`'s watcher would read the output back as source. |
| `--baseurl <prefix>` | Overrides `_config.yml`'s `baseurl`. CI uses it to set the GitHub Pages base path on fork deployments. |
| `--url <origin>` | Overrides `_config.yml`'s `url`; an absolute `http` or `https` URL. CI uses it so canonical URLs match the deployment origin. |
| `--dry-run` | Skip every filesystem write. |
| `--no-offline` | Skip the offline tree pass. |
| `--no-pdf` | Skip the PDF tree pass. |
| `--no-help-archive` | Do not write the [help archive](#the-help-archive). CI never passes it. |
| `--tolerate-missing-images` | Downgrade Phase 8's missing-image error to a warning, for a source tree that is mid-edit. |
| `--fetch-assets` / `--no-fetch-assets` | Force remote-asset vendoring on or off. Without either flag, a dev machine downloads missing YouTube thumbnails and GitHub user-attachment images, and a build with `$CI` set downloads nothing: a referenced but uncommitted asset is a hard error there. See [Authoring Pages](Authoring#committing-downloaded-assets). |
| `--profile-offline` | Print per-substep timing for the offline tree pass. |
| `--check` | Run the link and site-integrity check over every tree the build produced. A failing check does not abort the build; it sets the exit code to 1, and its summary lines say whether links, integrity or both failed. |
| `--no-check` | Turn the check off again. Flags are read in order, so this wins over the `--check` in `build.bat`. |
| `--check-audit-index` | Implies `--check`, and also diffs the tree index the build derives from its own records against what was written to disk. A spurious entry would make the link check answer "exists" for a path that 404s in production. `build.bat` passes this. |
| `--check-findings <path>` | Implies `--check`, and writes the findings as JSON. Used by [`scripts/check_links_diff.mjs`](Tools-Site-Checks#check-links-diff). |
| `--update-page-baseline` | Record this build's page and static-file counts in `builder/page-baseline.json` as the drift guard's new baseline. An ordinary build raises the baseline itself, so only a **fall** needs this flag. See [the page-count drift guard](Building#the-page-count-drift-guard). |
| `--update-symbol-baseline` | Record this build's symbol-index URLs in `builder/symbol-baseline.json`. An ordinary build records new URLs, so only a URL the index has **stopped** publishing needs this flag --- and usually a pinned heading id instead. See [the symbol index and its drift guard](Building#the-symbol-index). |
| `--symbol-gaps <path>` | Write the public symbols no page documents to a JSON file: each one's package, container, name, kind, and the page its container is on. Names in a package's `exclude_from_docs:` list are left out. |
| `--stall-timeout <seconds>` | How long the build waits with no task completing before it names the outstanding tasks and exits 2. Default: 120; fractions allowed. `0` disables the watchdog, and a wedged worker then hangs the build in silence. See [when a build stops instead of failing](Building#when-a-build-stops). |
| `--serve` | Start the dev server (watch, rebuild, SSE live-reload). Each rebuild skips the offline and PDF passes. |
| `--port <N>` | HTTP port for `--serve`, a whole number from 1 to 65535. Default: 4000. |

A command-line error is reported on standard error before any work starts. These are errors:

- an unknown flag, or an unexpected argument;
- a flag without its value, or with an empty one (only `--baseurl` accepts an empty value, meaning the site root);
- a value the flag cannot use: a `--port` that is not a port number, a negative or non-numeric `--stall-timeout`, a `--url` that is not an absolute `http` or `https` URL;
- a `--dest` the build refuses.

Exit codes: **0** nothing to report (with `--serve`, the server was stopped with Ctrl+C); **1** the build or its check found a problem: a link or integrity failure, a failed build step, a fall in the page count, or a symbol-index URL lost; **2** a refused command line (a `--dest` the build refuses included), a build stopped by the stall watchdog, with `--serve` a failed first build or a port in use, or a crash.

### The help add-in's project file
{: #the-help-add-ins-project-file }

Every build packs the IDE help add-in's source folder, `add-in/`, into a project file and publishes it, so that [Help Add-In](../../tB/IDE/AddIns/Help) can offer it as a download. `_config.yml` declares it:

```yaml
addin_project:
  src: ../add-in
  dest: tB/IDE/AddIns/downloads/tbDocsHelp.twinproj
```

`src` is relative to `docs/`; `dest` is the file's path in the online tree. The offline tree holds no copy. Its links to the file become the website's absolute URL and are not counted as unresolved. The build prints one line:

    add-in project: tB/IDE/AddIns/downloads/tbDocsHelp.twinproj, 21 files, 26.9 MB, with the offline archive, in 1 tree (143 ms)

The project holds:

- **Source files.** The files git tracks in `add-in/`, as they are in the working folder: an uncommitted edit is in, an unadded file is not. A second line names any untracked file left out. A `site.zip` in `Resources/HELP/` on the disk is never packed.
- **The archive.** The [help archive](#the-help-archive) this build wrote, so the add-in built from the file serves the pages without the internet. A build that wrote no archive packs none, and its line says `without the offline archive`; the add-in then shows the pages from the website.
- **The symbol index.** The `tB/symbols.json` this build wrote replaces `Resources/SYMBOLS/symbols.json`.

Line endings are normalised, so a Windows build and a Linux build write the same file. Packing needs Node and git, and neither twinBASIC nor Python.

`--dry-run` writes no file, and a source tree whose `_config.yml` declares no `addin_project` (the test fixtures) packs nothing. `--serve` writes the file into its one tree. A failed pack --- `git` missing, say --- fails the build with exit code 1, after the trees are written.

A `.twinproj` is not a publishable type. The [publish allowlist](Tools-Toolchain-Tests#check-publish-policy) exempts this one path in the output trees and refuses a `.twinproj` anywhere else, or in `docs/`. [`test/addin-project.test.mjs`](Tools-Toolchain-Tests#addin-project-test) tests what the file holds.

### The help archive
{: #the-help-archive }

Every build writes the zip the IDE help add-in serves the documentation from. The add-in embeds `add-in/Resources/HELP/site.zip` as a resource, and the build writes that file from the offline tree, before the build-time chart is added to `BuildInfo.html`. The archive therefore holds `BuildInfo.html` without the chart, and `assets/images/gantt.svg` as the placeholder the sources hold. The step prints one line:

    help archive: add-in/Resources/HELP/site.zip, 1475 entries, 26.0 MB (0.3 s)

The zip is too large to commit; `add-in/Resources/HELP/` is in `.gitignore`.

Only a build of the documentation tree into `docs/_site-offline` writes the archive. Builds of another source tree or `--dest`, `--serve`, `--dry-run` and builds without an offline tree skip it, and so does `--no-help-archive`. CI must not pass `--no-help-archive`, or the project file it publishes would hold no archive; `check_ci_workflows.mjs` fails when one does.

A file the build cannot write, or an archive that does not match the tree, fails the build with exit code 1. The build ends by checking the offline tree on disk against the archive again, now that the chart is in: the same files must be listed, and only `BuildInfo.html` and `assets/images/gantt.svg` may differ in content.

The reader on the twinBASIC side does no inflating of its own, so the zip format is fixed:

- One entry per file, no directory entries. A name is relative to the tree root, uses forward slashes and is UTF-8, with general-purpose flag bit 11 set. Entries are sorted by name in code-unit order.
- The DOS date and time are always 1980-01-01 00:00, and the version made by and needed is 20.
- No extra fields, comments or data descriptors: the CRC-32 and both sizes are in the local header and in the central directory.
- No zip64, so a tree of more than 65,535 files, or an archive of 4 GB, is refused.
- Files that are compressed already (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff2`, `.woff`, `.mp4`, `.zip`, `.pdf`) are stored. Every other file is deflated at level 9, and stored instead when the deflated data is not smaller than the file.

The build reads the file back, checks every entry against its source file, and names any that differ. The writer is `lib/help-archive.mjs`.

## build_fonts.py
{: #build-fonts }

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

Regenerates the subset webfonts under `docs/assets/fonts/` from pinned upstream releases (SHA-256 verified), pinning the optical-size axis and keeping `wght` variable. The `.woff2` files are committed, so `build.bat` needs neither Python nor a network. The PDF pass aborts, naming this script, if a face is missing.

**Regenerating Inter means regenerating the diagram metrics too** --- see below. Changing a face, rather than refreshing one, reaches beyond this script; [Changing a typeface](Builder#changing-a-typeface) lists every place the build names one. The script takes no options except `-h` and `--help`, which print the usage and start nothing.

Exit codes: **0** the faces were written; **1** a dependency is missing, an archive's SHA-256 differs from the pinned one, or a build step failed; **2** a refused command line.

## build_dot_metrics.mjs
{: #build-dot-metrics }

    node scripts/build_dot_metrics.mjs            # regenerate
    node scripts/build_dot_metrics.mjs --check    # fail if stale

Measures Inter's advance widths in a browser, from the committed `.woff2` files, and writes `builder/inter-metrics.json`, the table `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The JSON is committed and the build never runs the generator.

Run it after [`build_fonts.py`](#build-fonts) changes Inter. Forgetting shows up as [`check_dot_fit.mjs`](Tools-Site-Checks#check-dot-fit) failing, with nothing naming the metrics. The script measures Inter by name, so giving the diagrams a different face means editing it; see [Changing a typeface](Builder#changing-a-typeface).

Exit codes: **0** the table was written or is unchanged (with `--check`, it is current); **1** with `--check`, the table is stale; **2** a refused command line, a browser that would not start, or a crash.

## build_package_api.mjs
{: #build-package-api }

    node scripts/build_package_api.mjs            # regenerate
    node scripts/build_package_api.mjs --check    # fail if stale

Writes `builder/package-api.json`: every type the packages of a twinBASIC install declare, public or not, and the public members of each with their kinds. The [symbol index](Building#the-symbol-index) takes its entries from the pages, and this file annotates them with the kind of a member documented on a page of its own, an enumeration's values, and the interface a CoClass's members are declared on. It also says which public symbols no page documents.

The JSON is committed and the build never runs the tool. It needs a twinBASIC install, so it is Windows-only. Run it when the reference is re-indexed against a newer build, and commit the result with the pages.

It shares [`census_attributes.mjs`](Tools-Samples#census-attributes)'s export and cache, and takes the same `--ide`, `--exported`, `--cache` and `--refresh` flags; `--out` writes elsewhere. Packages are keyed by the project name, not always the folder's: TwinBasicAssertions is `Assert`, and the three CEF builds are one `cefPackage`, whose APIs the tool checks are identical.

Exit codes: **0** the file was written (with `--check`, it is up to date); **1** with `--check`, the file is stale; **2** a refused command line, no install, an export that failed, packages that declare different APIs under one name, or a crash.

## convert_em_dash_separators.mjs
{: #convert-em-dash-separators }

    node scripts/convert_em_dash_separators.mjs            # rewrite in place
    node scripts/convert_em_dash_separators.mjs --check    # report, change nothing

Converts literal en-dash and em-dash characters in markdown source under `docs/` to the ASCII forms (`--` for en-dash, `---` for em-dash) that markdown-it's typographer converts at build time. The site forbids literal `–` and `—` in source, and this is the fixer if any slip back in.

It skips fences, indented code blocks, HTML blocks and inline code spans, and preserves each file's line endings. Its probes run in [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions). `--check` reports what it would change without writing, so it can serve as a gate.

Exit codes: **0** the dashes were converted (with `--check`, there were none); **1** with `--check`, a file holds a literal dash; **2** a refused command line, or a crash.

## survey_tooling.mjs
{: #survey-tooling }

    node scripts/survey_tooling.mjs                  # the summary, then every listing
    node scripts/survey_tooling.mjs --summary        # the summary only
    node scripts/survey_tooling.mjs --root <dir>     # measure another checkout

Measures the repository's own tooling for repetition and structure:

- code duplicated between files (matched token by token, so renamed copies still match);
- top-level functions defined under one name in several files;
- how the command-line tools read their arguments;
- packages imported without being declared in `package.json`;
- the import graph: imports that cross directories, files nothing imports, and the most imported modules.

It is not a gate, and nothing runs it: take a measurement before and after a refactoring. It reads only the files git tracks. `--root` measures another checkout, such as a worktree at an older commit that lacks the script. `perf/` is counted separately in the summary and left out of the listings unless `--include-perf` is given.

Exit codes: **0** the survey was printed, **2** a refused command line, a folder that is not a git checkout, or a crash.

## compare_trees.mjs
{: #compare-trees }

    node scripts/compare_trees.mjs                      # HEAD against the working tree
    node scripts/compare_trees.mjs --before <ref>       # any commit against the working tree
    node scripts/compare_trees.mjs --keep               # leave both trees and both build logs
    node scripts/compare_trees.mjs -- --baseurl /docs   # extra tbdocs arguments, for both builds

Builds the site twice and compares the online, offline and PDF trees byte for byte. One build is at a commit (`HEAD` unless `--before` names another), the other from the working tree as a commit would hold it, untracked files included. Use it on a change to `builder/` that should leave the output alone, or change it only where intended.

Both builds run from git worktrees under `.compare-trees/` (gitignored), without touching the index or the working tree, with `tbdocs --no-fetch-assets` and `CI=1`, so the committed baselines are never written.

Three regions differ between any two builds and are replaced before the comparison: the build's timings in `assets/images/gantt.svg`, the same chart inlined into the [Build Info](BuildInfo) page, and the PDF title page's build line. Everything else must match.

A run takes about ten seconds. It is not a gate, and nothing runs it. A failed run leaves `.compare-trees/` for inspection; the next run removes it.

Exit codes: **0** the trees match; **1** the trees differ; **2** a refused command line, a git command or a build that failed to produce its tree, or a crash.

## render-book.mjs
{: #bookrender-bookmjs }

    node book/render-book.mjs <input.html> -o <output.pdf> [options]

The PDF renderer that `book.bat` calls. It converts the pre-built `_site-pdf/book.html`, which already holds all chapter structure, heading levels and outline entries; it does not read `_data/book.yml`.

It uses `puppeteer`, `paged.js` and `pdf-lib` directly, and sets `pdf-lib`'s `parseSpeed` to avoid ~32 seconds of needless event-loop yielding in a 100-second build; see [perf/README.md](https://github.com/twinbasic/documentation/blob/main/perf/README.md).

Key options used by `book.bat`:

| Flag | Effect |
|---|---|
| `-o <output.pdf>` | Output PDF path. |
| `--outline-tags h1,h2,h3,h4` | Heading levels to include in the PDF outline / bookmarks. |
| `--additional-script <path>` | Path to a script injected before paged.js runs. `book.bat` passes `perf\detach-pages.js`, which hides each finalised page from Chromium's layout tree and restores them all before `page.pdf()` runs. It cuts render time from ~104s to ~51s on a 1,638-page book. |

Exit codes: **0** the PDF was written; **2** a refused command line, an input or script that does not exist, a render that failed, or a crash. There is no 1.
