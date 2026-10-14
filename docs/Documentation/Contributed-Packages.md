---
title: Updating a Contributed Package
parent: Documentation Development
nav_order: 6
permalink: /Documentation/Development/Contributed-Packages
---

# Updating a Contributed Package
{: .no_toc }

The steps that bring a contributed package's section up to a new version of the package, in the order they are run.

A contributed package's section, under `docs/Reference/Contributed/<Package>/`, documents one version of the package. That version is written in five places: the landing page's `indexed_from:` and its **Version:** line, the package's API snapshot, the version its samples compile against, and its test project's `expect.json`. Editing the pages alone leaves the other three behind, and `test.bat` fails.

The examples below call the package **myPackage**; write your package's name in its place.

* TOC
{:toc}

## Before the first update

1. Install **Node.js 22** or later, and run `npm ci` at the repository root ([Requirements](Building#requirements)).
2. Install the newest twinBASIC BETA. The tools look for the newest `twinBASIC_IDE_BETA_<n>` folder on the Desktop; if yours is elsewhere, set the `TB_IDE` environment variable to the full path of its `twinBASIC.exe`. A contributed package is documented, and its samples compiled, against the newest BETA only.
3. Run `git config core.hooksPath .githooks`, which lints the scripts a commit changes.

## The steps

1. **Publish the new version to TWINSERV.** The tools fetch the package from the package server, never from GitHub, so a version that is not published there cannot be documented yet.

2. **Update the package's API snapshot, and list what changed:**

   ```bash
   node indexer/twin-index.mjs sync --package myPackage
   node indexer/twin-index.mjs analyze --package myPackage
   ```

   `sync` rewrites `indexer/snapshots/contributed/myPackage/api.json` from the new version. `analyze` lists the public symbols to document, to update and to remove, and every callout labelled with the old version, which is to be checked again. Until the new snapshot is committed, `analyze` says it runs in *audit mode*; that is expected. [twin-index.mjs](Tools-Build#twin-index) has the details.

3. **Edit the pages.** On the landing page, set `indexed_from:` and the **Version:** line to the new version, all four parts (`1.2.0.0`). Then go through the callouts `analyze` listed: move each label to the new version if it still holds, or remove the callout if it no longer does ([Callouts in a contributed package's section](Authoring#callouts-in-a-contributed-packages-section)). The build refuses a label naming any version but the one `indexed_from:` names.

   A member page that goes away needs the same care as any other removed page ([Removing a page](Authoring#removing-a-page)). When another page takes over its subject, give that page a `redirect_from:` entry with the old URL, so that links to it keep working.

4. **Set the samples' version** in `test/example-projects/contributed-myPackage/Settings`: the `versionMajor`, `versionMinor`, `versionBuild` and `versionRevision` of the package's reference. The samples and the test project are built against this version.

5. **Edit the test cases** in `test/package-tests/myPackage/Sources/` ([the folder's README](https://github.com/twinbasic/documentation/tree/main/test/package-tests) says how a case is written). Every NOTE and WARNING in the section names the cases behind it, so a callout added or changed in step 3 has cases to add or change here.

   - Do not copy `Expect.twin` into the project: every project uses the one in `test/package-tests/`.
   - Do not edit `RunAll.twin` or `expect.json` by hand. The next step writes them.
   - Do not commit a `.twinproj`. The build makes the one it publishes.

6. **Run the test cases**, on both architectures:

   ```bash
   package-tests.bat myPackage
   ```

   The run also writes `RunAll.twin` again. If a case passes or fails differently from what `expect.json` says, the run reports it. Once the cases are right, run it again with `--update`, which writes `expect.json` from the run, and read every entry it writes: each one says the package has a defect. [package-tests.bat](Tools#package-testsbat) has the options.

7. **Run the section's samples:**

   ```bash
   examples.bat --only "^Reference/Contributed/myPackage/"
   ```

   Every sample marked `check_build` has to compile, and every sample marked `check_run` has to print what its page says ([Checking that a sample compiles](Authoring#checking-that-a-sample-compiles)).

8. **Run the gates:**

   ```bash
   build.bat && check.bat && test.bat
   ```

   A page added to the section raises the page count, and the build writes the new count to `builder/page-baseline.json`. A section that has lost a page needs `build.bat --update-page-baseline` ([The page-count drift guard](Building#the-page-count-drift-guard)).

9. **Commit it all together:** the pages, the snapshot, the samples' `Settings`, the test cases, `RunAll.twin`, `expect.json` and `builder/page-baseline.json` if it changed. In the pull request's description, paste the `examples.bat` command and the line its run ends with.

## What the tools catch

`test.bat` fails while the versions disagree, while a copy of `Expect.twin` is in the project, and while `RunAll.twin` is not what `package-tests.bat` would write ([check_package_tests.mjs](Tools-Toolchain-Tests#check-package-tests)). The build fails on a callout labelled with another version.

Nothing catches a snapshot left at the old version, a test run that was skipped, or samples that were never run: `package-tests.bat` and `examples.bat` need a twinBASIC install, so they run in no CI workflow. The pull request's description is where a reviewer sees that they ran.
