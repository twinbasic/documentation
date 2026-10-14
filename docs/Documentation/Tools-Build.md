---
title: Build and Generation Tools
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 1
permalink: /Documentation/Development/Tools-Build
---

# Build and Generation Tools
{: .no_toc }

Builds the site and the PDF book, compares two builds, and regenerates the committed files that the build or a maintainer reads: the webfonts, the diagram font metrics, the packages' declared API, and the API snapshots the reference is compared with. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

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
| `--dest <path>` | Online-tree destination. Default: `<src>/_site`. The offline tree goes to `<dest>-offline`, the PDF tree to `<dest>-pdf`; with `--no-offline` or `--no-pdf` that folder is removed rather than written, so no tree from an earlier build is left beside the new one. Only a build into `docs/_site` updates the committed files a build compares with --- `builder/page-baseline.json`, `builder/symbol-baseline.json` and the help add-in's copy of the symbol index --- and writes the [help archive](#the-help-archive). A build into another destination checks against them and says what a build into `docs/_site` would change, so builds into folders of their own can run side by side without changing the working copy (see [where the drift guard compares but does not write](Building#where-it-compares-but-does-not-write)). The build refuses a destination that is or contains `<src>`. Inside `<src>`, the destination must be, or be inside, a folder directly under it whose name starts with `_site`, `_serve` or `_pdf`; anywhere else there, the next build or `--serve`'s watcher would read the output back as source. |
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

## twin-index.mjs
{: #twin-index }

    node indexer/twin-index.mjs sync [--package <name> | --packages <a>,<b>] [--ide <path> | --release]
    node indexer/twin-index.mjs analyze [--package <name> | --packages <a>,<b> | --all]
    node indexer/twin-index.mjs draft [--package <name> | --packages <a>,<b>]
    node indexer/twin-index.mjs derive [--check] [--out <file>] [--ide <path> | --release]

The package indexer, which finds the documentation work that a new twinBASIC build leaves. `sync` reads the sources of the packages and writes an `api.json` snapshot of each: every type the package declares and every member of each, with its visibility, kind and declaration. `analyze` compares the current snapshot of each documented package with the one the reference was last brought up to date with, and reports the public symbols to create a page for, to update and to remove. `draft` turns that report into the list of pages to write or change, each with its file, its parent and its permalink. `derive` writes `builder/package-api.json`, the package half of the [symbol index](Building#the-symbol-index); see [The symbol index's packages](#package-api) below.

The build does not run it and it is not a gate. It sits in `indexer/` rather than `scripts/` because it keeps state of its own. It reads the sources with `scripts/lib/twin-api.mjs`, the repository's one scanner of twinBASIC declarations, which [`check_symbol_index.mjs`](Tools-Toolchain-Tests#check-symbol-index) and [`check_twin_parsers.mjs`](Tools-Toolchain-Tests#check-twin-parsers) test. [`test/indexer.test.mjs`](Tools-Toolchain-Tests#indexer-test) tests it without a network, git or a twinBASIC install. The layout of `indexer/` and the format of `api.json` are in [`indexer/README.md`](https://github.com/twinbasic/documentation/blob/main/indexer/README.md).

**Where the packages come from.** The built-in and default packages (`VB`, `VBA`, `VBRUN` and the ones the IDE ships) are read from the files of a twinBASIC install, the unzipped IDE release. `--ide` names it, as its folder or its `twinBASIC.exe`; without it the tool takes `TB_IDE`, and then the newest `twinBASIC_IDE_BETA_<n>` folder on the Desktop. The BETA number comes from the install's `ide/build.js`, else from its folder name. `--release` downloads the same packages from the latest GitHub release instead, for a machine with no install; an install and the release zip of its build hold the same files, so either gives the same `api.json`. Nothing starts the IDE. The contributed packages are downloaded from TWINSERV, the package repository. A run that names only built-in or default packages does not contact it, so `sync --package VBA` works offline.

| Option | Command | Effect |
|---|---|---|
| `--package <name>` | `sync`, `analyze`, `draft` | Limits the command to one package, by the name the store has. |
| `--packages <a>,<b>` | `sync`, `analyze`, `draft` | The same for a comma-separated list. Not with `--package`. |
| `--all` | `analyze` | Covers every package in the store, not only the documented ones. Not with `--package` or `--packages`. |
| `--ide <path>` | `sync`, `derive` | The twinBASIC install to read the built-in and default packages from. Not with `--release`. |
| `--release` | `sync`, `derive` | Downloads the built-in and default packages from the latest GitHub release. |
| `--check` | `derive` | Fails if `builder/package-api.json` is stale, instead of writing it. |
| `--out <file>` | `derive` | Writes somewhere other than `builder/package-api.json`. |

A name that matches no package is reported, the other packages are done, and the exit code is 1.

**What `sync` writes.** `sync` reads again only what changed.

| Path | Committed | Holds |
|---|---|---|
| `indexer/.packages/` | no | The store, a git repository of its own that `sync` creates. Each package has its `sources/`, its `Settings` file, its `api.json` and an `indexer.json` that records which version of the scanner wrote the `api.json`. A new store starts from the committed snapshots, so its history shows what changed in each package's API. |
| `indexer/.packages/manifests/` | no | What was last read: `built-in.json` (the source, `install` or `release`, and the build) and `contributed.json` (the TWINSERV versions). They never hold the path of an install, which contains a user name. |
| `indexer/.packages/report.json` | no | The report of the last `analyze`. |
| `indexer/.packages/callouts.json` | no | The callouts labelled with a build older than the store's, from the last `analyze` of the whole reference. |
| `indexer/.packages/draft/` | no | What the last `draft` placed: a plan for each package, its pages in batches, and `manifest.json`, which lists them. |
| `indexer/snapshots/<group>/<package>/api.json` | yes | A copy of the `api.json` of each package the reference documents, for `analyze` to compare with. `<group>` is `default`, `built-in` or `contributed`. |

`sync` judges a package by what the store holds, never by the manifest. A package is read again when the store lacks its sources or its `api.json`, or holds an `api.json` in an older format or from another build. A package whose `api.json` another version of the scanner wrote is indexed again from the sources already in the store, with no download. A clone has no store, so its first `sync` reads every package.

**Which packages are documented.** A section of the reference documents a package when its folder under `docs/Reference/Default/`, `Built-In/` or `Contributed/` has an `index.md`, and the landing page's `package_name` lists the package (without that key, the folder's name is the package's). The page's `package_name`, `indexed_from`, `exclude_from_docs` and `exclude_kinds` are described under [Frontmatter and permalinks](Authoring#frontmatter-and-permalinks); the indexer reads them and the build does not put them into any page. `sync` copies a package's `api.json` to `indexer/snapshots/` only if the reference documents the package and that run indexed it, or the package has no snapshot yet and the store's `api.json` is of the version its section's `indexed_from` names. The second case is a new section: its package was synced before the section existed, so the next `sync` finds the store up to date and indexes nothing.

**What `analyze` reports.** By default it covers the documented packages and says how many others it left out. `--package` and `--packages` name any package. A package that no section documents has no pages to compare with, so every public symbol of it is listed as one to create, and so it is for every package under `--all`. A symbol is a type, or a name that a type declares: the Get, Let and Set of a property, and the overloads of a name, are one symbol, as the reference has one page for each. Only Public and Protected members of public types count, less what `exclude_from_docs` and `exclude_kinds` name. Each package is analyzed in one of two modes.

- **Update mode**, for a section whose landing page has `indexed_from`. The current `api.json` is compared with the snapshot committed at `HEAD`, provided that snapshot's `version` is the `indexed_from` tag. The report lists the symbols added (to create), changed (to update) and removed (to flag).
- **Audit mode**, for a section with no `indexed_from`, and when update mode has nothing to compare with: no committed snapshot, one in an older format, or one of another version, each with a warning. Every public symbol is matched by name with the `title:` of the pages in the section, and those with no page are to create.

**The callouts to check again.** A callout's label says which build of twinBASIC or which version of its package it is true of (see [What a callout applies to](Authoring#what-a-callout-applies-to)). When the store holds a version of a package other than its section's `indexed_from`, the report lists each callout of the section labelled with another version, as a `recheck_callout` task: the build refuses the section's new `indexed_from` until each is checked and its label moved, or the callout removed. An `analyze` with no `--package`, `--packages` or `--all` also lists the callouts of the whole documentation labelled `BETA <n>` below the build the store's built-in packages were read from, and writes them to `indexer/.packages/callouts.json`. A `since BETA <n>` label is never listed, and neither is `timeless`: both stay true.

`analyze` exits 0 whenever it writes its report, whatever the report lists: the list is the product, not a failure.

**What `draft` places.** `draft` reads the last report and, for each package in it (or each one `--package` or `--packages` names), writes the plan `indexer/.packages/draft/<package>.json`. Each entry names the page file to write or change, the title of its parent, and its permalink, all taken from what most of the section's pages do: a new type goes in the folder the section keeps that kind of type in (an `Enumerations/` folder, or beside the classes), as a folder with an `index.md` or as one page as those types are; a type that another type returns, such as a collection's item, goes in that type's folder when the folder already holds a type; and a new member gets a page of its own or goes on its type's page, as that type's other members do. A permalink is filled in only when every page of the section has the permalink its folders give it, which is so for every section except VBA's; otherwise it is left to follow the sibling pages. Each entry also names a page of the same kind in the section to follow, and the source file that declares the symbol. A package with no section gets one in its group's folder, with a landing page titled and placed like those of the group's other sections. A symbol no page can be found for, such as a member of a type that has no page, is listed as unplaced. A symbol the build no longer declares is listed with the page that documents it. The pages are also split into batches, one file each, for whoever writes them in parallel.

**Moving the reference to a new build:**

1. Run `sync` and `derive` with the new install. `sync` writes the new snapshots into the working tree, and `analyze` still compares with the ones at `HEAD`; `derive` writes the new `builder/package-api.json`.
2. Run `analyze`, then `draft`, and write the pages the plans list, where they say. Check each callout `analyze` lists as labelled with an older build on the new one, and move its label or remove it.
3. Set `indexed_from` on each section to the new build's tag (`beta-x-1005` is BETA 1005), and commit the pages, the new `indexed_from`, the new snapshots and `builder/package-api.json` together. A snapshot committed on its own, or an `indexed_from` that is not the snapshot's `version`, sends the next `analyze` into audit mode.

**After a change to the scanner or the model.** The code that writes `api.json` is `scripts/lib/twin-api.mjs`, `scripts/lib/twin-declarations.mjs`, `indexer/lib/api-model.mjs` and `indexer/lib/vb6-preprocess.mjs`. A change to any of them, the `format` number of `api.json` included, can change what the same sources index to. The next `sync` indexes every package again, and the committed snapshots have to be written again from the build they record, with `sync --ide` naming that build's install, in the same commit as the change. Otherwise `analyze` compares the output of the new code with that of the old and reports the difference as changes to the API. `--release` cannot do this: it downloads only the latest release.

**The symbol index's packages.**{: #package-api } `derive` writes `builder/package-api.json`: every type the built-in and default packages declare, public or not, and the public members of each with their kinds, in declaration order. The [symbol index](Building#the-symbol-index) takes its entries from the pages, and this file adds the kind of a member documented on a page of its own, an enumeration's values, and the interface a CoClass's members are declared on. It also says which public symbols no page documents. `derive` reads every package of the install, or of the latest release with `--release`, and parses them as `sync` does, so it needs no store and no `sync` first. The snapshots cannot serve instead: they hold only the documented packages, and keep no declaration order. Packages are keyed by the project name, which is not always the package's: TwinBasicAssertions is `Assert`, and the three CEF builds are one `cefPackage`, whose APIs `derive` checks are identical. The file is committed and the build never writes it, because that needs the packages. Run `derive` with the same install as `sync` when the reference moves to a new build, and commit the file with the pages and the snapshots. `--check` compares instead of writing.

Exit codes: **0** the command finished: `sync` wrote every package it was asked for, or found it up to date; `analyze` wrote its report; `draft` placed its pages; `derive` wrote the file, or with `--check` found it up to date. **1** a package named by `--package` or `--packages` failed to sync, or does not exist, or is not in the report (`draft`), and the others were done; with `derive --check`, the file is stale. **2** a refused command line, no twinBASIC install found, no snapshots to analyze (run `sync` first), no report to place pages from (run `analyze` first), packages that declare different APIs under one project name (`derive`), or a crash.

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
