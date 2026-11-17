---
title: tbKMode Writer
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/Writer
has_toc: false
---

# tbKMode Writer
{: .no_toc }

Writes the module pages of this section from the tbKMode package's declarations and a description of each of its names.

The writer is a Node.js program in the documentation's repository, in [test/package-tests/tbKMode/writer](https://github.com/twinbasic/documentation/tree/main/test/package-tests/tbKMode/writer). It is for a contributor who updates this section, and it is not published as a download. It needs a clone of the repository and Node.js, and no twinBASIC install.

* TOC
{:toc}

## What it writes

The writer writes the pages of the six modules: [modWDM](modWDM), [modFltMgr](modFltMgr), [modSysInfo](modSysInfo), [modImage](modImage), [modDisk](modDisk) and [modKmOpaque](modKmOpaque). Each module has a folder in the writer's folder, which holds:

- `frame.md` --- the page's text, with a placeholder where each table goes.
- `names.json` --- a description of each public name of the module, one line each, by section: Declares, Types, Enumerations, Constants and the others.
- `procedures.md` --- for modWDM only, a section for each procedure with a body.

The writer takes the rest from the package and the repository. The names of each kind, the value of each constant and the type of each alias come from the package's declarations. A name's link goes to its page on Microsoft Learn, where Microsoft documents it. The comment above each table lists the test cases that check the table, the cases of the [test project](.#test-cases) that pass.

Each table lists its names in alphabetical order. A page is never edited itself: a change goes in the module's folder, and the writer writes the page again.

## Running it

From the repository's folder:

```sh
node test/package-tests/tbKMode/writer/writer.mjs
```

It writes every module's page, or only those named after the command, such as `modWDM`. With `--check` it writes nothing, lists each page that differs from what it would write, and ends with exit code 1 if one does.

## A new version of the package

When this section moves to a new version of tbKMode, the writer finds what the version changed:

- A name the version adds has no description yet. The writer leaves it off the page and lists it: its description goes in `names.json`.
- A name the version removes or renames still has a description. The writer stops and names it: its description goes, or takes the new name.
- A test case that fails with the new version stops the writer until a callout of the page names it in its test marker, the callout that says what is wrong.

The writer's README, in its folder, describes each placeholder.

## See Also

- [tbKMode](.) package -- building a driver, and the package's test cases
- [tbKMode Verifier](Verifier) -- checks the package's declarations, and a built driver's imports, against the Windows kernel
