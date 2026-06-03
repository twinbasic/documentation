---
title: Documentation Development
nav_order: 9
has_children: true
has_toc: false
permalink: /Documentation/Development/
---

# Documentation Development
{: .no_toc }

This section covers everything related to the twinBASIC documentation: the URL contract the compiler and IDE rely on, the build / preview / deploy workflow for content contributors, every script and batch file in the repository, and the internals of the `tbdocs` static site generator that produces the site.

## Toolchain overview

Three commands handle the entire build-and-verify workflow. `build.bat` produces three output trees from the markdown source; `check.bat` validates link integrity on the two HTML trees; `book.bat` renders the PDF from the third.

![Toolchain overview](/assets/images/dot/toolchain-overview.svg)

`build.bat` must run before either of the other two --- `check.bat` reads from `_site/` and `_site-offline/`, while `book.bat` reads from `_site-pdf/`. A clean `build.bat && check.bat` is the bar for "ready to commit".

## Build pipeline

A single `build.bat` run executes `tbdocs` against a shared task DAG, dispatched by a SharedArrayBuffer-based pull scheduler --- there is no central dispatcher and no fixed phase sequence; workers and the main thread compete for ready tasks directly. The graph is organised into four sections (**Seeds**, **Spine**, **Render**, **Write**) that also label the timeline on the [Build Info](Development/BuildInfo) page; the [tbdocs Builder](Development/Builder) page documents the full DAG, the scheduler architecture, and each task's interface contract.

## Sub-pages

- [Permanent Links](Development/Permanent-Links) --- the stable `/tB/` URL contract under which the IDE help system, in-source `[Documentation(...)]` attribute links, and external references resolve.
- [Building and Deployment](Development/Building) --- the day-to-day workflow for editing content: requirements, building, serving locally, link checking, Graphviz diagrams, screenshots, and the GitHub Pages deployment.
- [Tools and Scripts](Development/Tools) --- one-line-per-tool reference for every script, batch file, and CLI flag exposed by the documentation toolchain (intended audience: doc contributors).
- [tbdocs Builder](Development/Builder) --- detailed technical documentation for the `tbdocs` static site generator that lives under [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read this when modifying the build pipeline itself. Sub-pages:
    - [Pipeline Stages](Development/Pipeline-Stages) --- complete interface reference: per-task signatures and per-module export tables, plus the scheduler-level concepts (flag bits, task lifecycle, SAB layout).
    - [Book Configuration](Development/Book-Configuration) --- `_book.yml` key reference for the PDF chapter manifest.
    - [Extending the Builder](Development/Extending) --- tutorial for adding a new pipeline task, markdown-it plugin, or render-worker sub-stage.
- [PDF Generation](Development/PDF-Generation) --- internals of the PDF renderer: `render-book.mjs`, paged.browser.js, and the pdf-lib shims.
- [Library Patches](Development/Fixes) --- every modification to `paged.browser.js` and the `fast-*.mjs` pdf-lib shims: upstream problem, applied fix, and mechanism.
