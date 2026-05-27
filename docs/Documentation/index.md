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

## Sub-pages

- [Permanent Links](Development/Permanent-Links) --- the stable `/tB/` URL contract under which the IDE help system, in-source `[Documentation(...)]` attribute links, and external references resolve.
- [Building and Deployment](Development/Building) --- the day-to-day workflow for editing content: requirements, building, serving locally, link checking, Mermaid diagrams, screenshots, and the GitHub Pages deployment.
- [Tools and Scripts](Development/Tools) --- one-line-per-tool reference for every script, batch file, and CLI flag exposed by the documentation toolchain (intended audience: doc contributors).
- [tbdocs Internals](Development/Builder) --- detailed technical documentation for the `tbdocs` static site generator that lives under [`builder/`](https://github.com/twinbasic/documentation/tree/main/builder). Read this when modifying the build pipeline itself.
