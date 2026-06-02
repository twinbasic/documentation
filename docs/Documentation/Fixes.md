---
title: Library Patches
parent: Documentation Development
nav_order: 9
has_children: true
has_toc: false
permalink: /Documentation/Development/Fixes
---

# Library Patches
{: .no_toc }

Two third-party libraries carry in-tree modifications. `book/lib/paged.browser.js` is a patched copy of paged.js v0.4.3 (MIT); the thirteen `fast-*.mjs` files there are side-effecting shims applied to pdf-lib's live exports before each PDF process phase. This section documents every change: what the upstream behaviour was, why it was unsuitable for the build pipeline, and what was changed.

## Sub-pages

- [Paged.js Patches](Fixes/PagedJS) --- changes to `book/lib/paged.browser.js`: the synchronous execution chain, hook dispatch fast-paths, DOM lookup optimizations, layout correctness fixes, and miscellaneous headless-specific changes.
- [pdf-lib Patches](Fixes/PDFLib) --- the thirteen `fast-*.mjs` shims and `parallel-deflate.mjs` that retune pdf-lib's parser, object model, and serializer for the process phase.
