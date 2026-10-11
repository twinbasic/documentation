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
| `--no-help-archive` | Do not write the [help archive](#the-help-archive). The project file the build publishes then holds no archive, so CI never passes it. |
| `--tolerate-missing-images` | Downgrade Phase 8's missing-image error to a warning. Use when the source tree is mid-edit and may temporarily reference an image that does not yet exist. |
| `--fetch-assets` / `--no-fetch-assets` | Force remote-asset vendoring on or off. Without either flag, the build downloads missing YouTube thumbnails and GitHub user-attachment images on a dev machine, and refuses to download anything when `$CI` is set --- a referenced but uncommitted asset is a hard build error there. See [Authoring Pages](Authoring#committing-downloaded-assets). |
| `--profile-offline` | Print per-substep timing for the offline tree pass. |
| `--check` | Run the link and site-integrity check over the HTML the build already holds in memory, across every tree it produced. A failing check does not abort the build; it sets the exit code to 1, and its summary lines say whether links, integrity or both failed. |
| `--no-check` | Turn the check off again. Flags are read in order, so this wins over a `--check` baked into `build.bat`. |
| `--check-audit-index` | Implies `--check`, and additionally diffs the tree index the build derives from its own records against what landed on disk. A spurious entry makes the link oracle answer "exists" for a path that 404s in production, and nothing else would notice. This is what `build.bat` passes. |
| `--check-findings <path>` | Implies `--check`, and writes the findings as JSON for a tool to read. Used by [`scripts/check_links_diff.mjs`](Tools-Site-Checks#check-links-diff). |
| `--update-page-baseline` | Record this build's page and static-file counts in `builder/page-baseline.json` as the drift guard's new baseline, in whichever direction they moved. An ordinary build raises the baseline by itself; only a **fall** needs this flag, because a fall is what the guard exists to catch. See [the page-count drift guard](Building#the-page-count-drift-guard). |
| `--update-symbol-baseline` | Record this build's symbol-index URLs in `builder/symbol-baseline.json`, whichever left it. New URLs are recorded by an ordinary build; only a URL the index has **stopped** publishing needs this flag --- and usually needs a pinned heading id instead. See [the symbol index and its drift guard](Building#the-symbol-index). |
| `--symbol-gaps <path>` | Write the public symbols no page documents to a JSON file: each one's package, container, name, kind, and the page its container is on. Names a package's `exclude_from_docs:` lists are left out. |
| `--stall-timeout <seconds>` | How long the build waits with no task completing before it gives up, names the outstanding tasks and exits 2. Default: 120; a number of seconds, fractions allowed. `0` disables the watchdog and returns the build to hanging in silence on a wedged worker. See [when a build stops instead of failing](Building#when-a-build-stops). |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). Offline and PDF passes are skipped each rebuild. |
| `--port <N>` | HTTP port for `--serve` mode, a whole number from 1 to 65535. Default: 4000. |

A command-line error --- an unknown flag, an unexpected argument, a flag without its value or with an empty one (`--baseurl` alone accepts one, meaning the site root), a value a flag cannot use (a `--port` that is not a port number, a negative or non-numeric `--stall-timeout`, a `--url` that is not an absolute `http` or `https` URL), or a `--dest` the build refuses --- is reported on standard error before any work starts, so it is never read as a broken link.

Exit codes: **0** nothing to report (with `--serve`, the server was stopped with Ctrl+C); **1** the build or its check found a problem: a link or integrity failure, a failed build step, a fall in the page count, or a symbol-index URL lost; **2** a refused command line (a `--dest` the build refuses included), a build stopped by the stall watchdog, with `--serve` a failed first build or a port in use, or a crash.

### The help add-in's project file
{: #the-help-add-ins-project-file }

Every build of the documentation, CI's included, packs the IDE help add-in's source folder, `add-in/`, into a project file and publishes it, so that [Help Add-In](../../tB/IDE/AddIns/Help) can offer it as a download. `_config.yml` declares it:

```yaml
addin_project:
  src: ../add-in
  dest: tB/IDE/AddIns/downloads/tbDocsHelp.twinproj
```

`src` is resolved against `docs/`, as a `bundle_extra` source is, and `dest` is the file's path in the online tree, a `downloads` folder beside the page, as the [Import/Export Tool](../../Features/Packages/Import-Export-Tool)'s downloads are beside its page. The offline tree holds no copy: the project carries the offline tree's archive, which the offline tree could not hold as well. A link in an offline page to a file only the online tree holds, this one included, is written as the website's absolute URL, and is not counted as an unresolved link. The `addinProject` task (`builder/addin-project.mjs`) writes the file once the symbol index and the help archive are written, and prints one line:

    add-in project: tB/IDE/AddIns/downloads/tbDocsHelp.twinproj, 21 files, 26.9 MB, with the offline archive, in 1 tree (143 ms)

What goes in is the files git tracks in `add-in/`, as they are in the working folder, so an edit not yet committed is in a local build's file and a file nobody has added never is. A second line names any file git does not track there that was left out. A `site.zip` in `Resources/HELP/` on the disk is never packed. The file holds the [help archive](#the-help-archive) this build wrote as `Resources/HELP/site.zip`, byte for byte, so the add-in built from it serves the pages itself, without the internet. A build that wrote no archive (`--no-help-archive`, `--serve`, a `--dest` other than `docs/_site`, a fixture) packs none, and its line says `without the offline archive`; the add-in built from that file shows the pages from the website. `Resources/SYMBOLS/symbols.json` is replaced by the `tB/symbols.json` the same build wrote, so the download always holds the index of the pages it is published with. Line endings are packed as git stores them: CRLF becomes LF in every file outside `Resources/`, which `.gitattributes` checks out byte for byte, and the code files then get CRLF, as the IDE stores them. A Windows build and a Linux build therefore write the same bytes, and two builds of one tree write the same file. The pack is `importProject` from `scripts/impexp.mjs`, run in the build's own process; it needs Node and git, and neither twinBASIC nor Python.

A `.twinproj` is not a publishable type: the [publish allowlist](Tools-Toolchain-Tests#check-publish-policy) exempts this one path in the output trees, and still refuses a `.twinproj` anywhere else, and one found in `docs/`. `--dry-run` writes nothing, `--serve` writes the file into its one tree so that the preview's link works, and a build of a source tree whose `_config.yml` declares no `addin_project` (the test fixtures) packs nothing. A pack that fails --- `git` missing, say --- is reported and fails the build with exit code 1; the trees are still written, and the index audit then reports the missing file too. [`test/addin-project.test.mjs`](Tools-Toolchain-Tests#addin-project-test) tests what the file holds.

### The help archive
{: #the-help-archive }

Every build writes the zip the IDE help add-in serves the documentation from. The add-in embeds `add-in/Resources/HELP/site.zip` in its DLL as a resource, and the build writes that file from the offline tree. The `helpArchive` task runs once every task that writes into the offline tree has finished, and before the build-time chart is added to `BuildInfo.html` in both trees. So the archive holds `BuildInfo.html` without the chart and `assets/images/gantt.svg` as the placeholder the sources hold, and two builds of one tree write the same archive. The step prints one line:

    help archive: add-in/Resources/HELP/site.zip, 1475 entries, 26.0 MB (0.3 s)

The zip is not committed, because it is too large; `add-in/Resources/HELP/` is listed in `.gitignore`. The [help add-in's project file](#the-help-add-ins-project-file) carries the zip this build wrote. Only a build of the documentation tree into `docs/_site-offline` writes it. A build of another source tree (the test fixtures, for one) or into another `--dest`, `--serve`, `--dry-run` and a build without an offline tree leave it alone, and so does `--no-help-archive`. Neither CI workflow passes that flag, because the project file CI publishes would then hold no archive; `check_ci_workflows.mjs` fails when one does. A file the build cannot write, or an archive that does not match the tree, fails the build with exit code 1.

The build ends by checking the offline tree on disk against the archive again, now that the chart is in. It must list the same files, and only `BuildInfo.html` and `assets/images/gantt.svg` may differ in content. A file written into the offline tree after the archive was made fails the build, and so does a missing one.

The reader on the twinBASIC side does no inflating of its own, so the format is fixed. There is one entry per file and no directory entries. A name is relative to the tree root, uses forward slashes and is UTF-8, with general-purpose flag bit 11 set. Entries are sorted by name in code-unit order, so the same tree gives the same bytes. The DOS date and time are always 1980-01-01 00:00, the version made by and needed is 20, and there are no extra fields, no comments and no data descriptors: the CRC-32 and both sizes are in the local header and in the central directory. There is no zip64, so a tree of more than 65,535 files, or an archive of 4 GB, is refused. Files that are compressed already (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff2`, `.woff`, `.mp4`, `.zip`, `.pdf`) are stored. Every other file is deflated at level 9, and stored instead when the deflated data is not smaller than the file.

After the file is written, the build reads it back. It parses the end record and every central-directory entry, checks that each local header agrees with its entry (name, method, sizes, CRC-32), and inflates each deflated entry. It compares each entry's content and CRC-32 with the source file's bytes, and names any entry that differs. This check always runs. The file is written under a temporary name beside the target and renamed, so a failed run never leaves a half-written archive. The writer is `lib/help-archive.mjs`.

## build_fonts.py
{: #build-fonts }

    python -m pip install "fonttools[woff]"
    python scripts/build_fonts.py

Regenerates the subset webfonts under `docs/assets/fonts/` from pinned upstream releases (SHA-256 verified), pinning the optical-size axis and keeping `wght` variable. Development tooling only: the `.woff2` files are committed like the generated DOT SVGs, and `build.bat` needs neither Python nor a network connection --- though the PDF pass aborts if one of the faces it needs is missing from the source tree, naming this script. **Regenerating Inter means regenerating the diagram metrics too** --- see below. Changing a face rather than refreshing one reaches well beyond this script; [Changing a typeface](Builder#changing-a-typeface) lists every place the build names one. The script takes no options except `-h` and `--help`, which print the usage and start nothing.

Exit codes: **0** the faces were written; **1** a dependency is missing, an archive's SHA-256 differs from the pinned one, or a build step failed; **2** a refused command line.

## build_dot_metrics.mjs
{: #build-dot-metrics }

    node scripts/build_dot_metrics.mjs            # regenerate
    node scripts/build_dot_metrics.mjs --check    # fail if stale

Measures Inter's advance widths in a browser and writes `builder/inter-metrics.json`, the table `builder/dot-metrics.mjs` installs into Graphviz before any layout runs. The widths are measured from the committed `.woff2` files rather than read out of the font binary, because the browser's shaped advance is the number the layout has to match. Development tooling; the JSON is committed and the build never runs the generator. Run it after [`build_fonts.py`](#build-fonts) touches Inter --- forgetting is not silent, but it surfaces as [`check_dot_fit.mjs`](Tools-Site-Checks#check-dot-fit) failing rather than as anything naming the metrics. It measures Inter by name, so giving the diagrams a different face means editing this script, not only rerunning it; see [Changing a typeface](Builder#changing-a-typeface).

Exit codes: **0** the table was written or is unchanged (with `--check`, it is current); **1** with `--check`, the table is stale; **2** a refused command line, a browser that would not start, or a crash.

## build_package_api.mjs
{: #build-package-api }

    node scripts/build_package_api.mjs            # regenerate
    node scripts/build_package_api.mjs --check    # fail if stale

Writes `builder/package-api.json`: every type the packages of a twinBASIC install declare, public or not, and the public members of each with their kinds. The [symbol index](Building#the-symbol-index) takes its entries from the pages and this file annotates them --- the kind of a member documented on a page of its own, an enumeration's values, the interface a CoClass's members are declared on --- and says which public symbols no page documents. Development tooling like [`build_dot_metrics.mjs`](#build-dot-metrics): the JSON is committed and the build never runs the generator, because running it needs a twinBASIC install, so it is Windows-only in the way [`census_attributes.mjs`](Tools-Samples#census-attributes) is. Run it when the reference is re-indexed against a newer build, and commit the result with the pages.

It shares [`census_attributes.mjs`](Tools-Samples#census-attributes)'s export and cache, and takes the same `--ide`, `--exported`, `--cache` and `--refresh` flags; `--out` writes elsewhere. Packages are keyed by the name code uses for them --- the project name, which is not always the folder's: TwinBasicAssertions is `Assert`, and the three CEF builds are one `cefPackage`, whose APIs the tool checks are identical.

Exit codes: **0** the file was written (with `--check`, it is up to date); **1** with `--check`, the file is stale; **2** a refused command line, no install, an export that failed, packages that declare different APIs under one name, or a crash.

## convert_em_dash_separators.mjs
{: #convert-em-dash-separators }

    node scripts/convert_em_dash_separators.mjs            # rewrite in place
    node scripts/convert_em_dash_separators.mjs --check    # report, change nothing

Normalises literal en-dash / em-dash characters in markdown source under `docs/` to the ASCII source forms markdown-it's typographer converts at build time (`--` for en-dash, `---` for em-dash). The site forbids literal `–` / `—` in source --- this is the canonical fixer if any slip back in. Skips what the site's parser reads as code --- fences, indented code blocks and HTML blocks, found through `lib/markdown.mjs` --- and inline code spans, and preserves each file's existing line endings. Its probes run in [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions). `--check` reports what it would change without writing, so it can serve as a gate.

Exit codes: **0** the dashes were converted (with `--check`, there were none); **1** with `--check`, a file holds a literal dash; **2** a refused command line, or a crash.

## survey_tooling.mjs
{: #survey-tooling }

    node scripts/survey_tooling.mjs                  # the summary, then every listing
    node scripts/survey_tooling.mjs --summary        # the summary only
    node scripts/survey_tooling.mjs --root <dir>     # measure another checkout

Measures the repository's own tooling for repetition and structure: code duplicated between files, found token by token so that two copies differing only in names still match; top-level functions defined under one name in several files; how the command-line tools read their arguments; packages imported without being declared in `package.json`; and the import graph --- the imports that cross from one directory to another, the files nothing imports, and the most imported modules. `builder/PLAN-TOOLING-REVIEW.md` records its summary at the commit the tooling review started from, and the review's last phase runs it again to compare.

It is not a gate, and nothing runs it: take a measurement before and after a piece of refactoring. It reads only the files git tracks, so a scratch file never changes a number. `--root` measures another checkout, such as a worktree at an older commit that does not contain the script. `perf/` is measured, but it is counted separately in the summary and left out of the listings unless `--include-perf` is given.

Exit codes: **0** the survey was printed, **2** a refused command line, a folder that is not a git checkout, or a crash.

## compare_trees.mjs
{: #compare-trees }

    node scripts/compare_trees.mjs                      # HEAD against the working tree
    node scripts/compare_trees.mjs --before <ref>       # any commit against the working tree
    node scripts/compare_trees.mjs --keep               # leave both trees and both build logs
    node scripts/compare_trees.mjs -- --baseurl /docs   # extra tbdocs arguments, for both builds

Builds the site twice and compares the online, offline and PDF trees file by file, byte for byte: once at a commit, `HEAD` unless `--before` names another, and once from the working tree as a commit would hold it, untracked files included. It is the check for a change to `builder/` that should leave the output alone, and for one that should not, whose differences ought to be the intended ones and no others.

Both builds run from git worktrees under `.compare-trees/` at the repository root, which is gitignored, and neither touches the index or the working tree. Building the working tree in place would not do: under `core.autocrlf` a fresh checkout writes CRLF where files a tool has rewritten hold LF, and every file the build copies verbatim would then differ. Both builds run `tbdocs --no-fetch-assets` with `CI=1`, so the committed baselines are read and never written.

Three regions differ between any two builds and are replaced before the comparison: the build's own timings in `assets/images/gantt.svg`, the same chart inlined into the [Build Info](BuildInfo) page, and the PDF title page's build line, which holds the build date and the commit. Everything else must match. A run takes about ten seconds on the development box. It is not a gate, and nothing runs it. A failed run leaves `.compare-trees/` for inspection, and the next run removes it.

Exit codes: **0** the trees match; **1** the trees differ; **2** a refused command line, a git command or a build that failed to produce its tree, or a crash.

## render-book.mjs
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
