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

Two third-party libraries are modified in the tree itself. `book/lib/paged.browser.js` is a patched copy of paged.js v0.4.3 (MIT); the thirteen `fast-*.mjs` files there are side-effecting shims applied to pdf-lib's live exports before each PDF process phase. This section documents every change to those two: what the upstream behaviour was, why it was unsuitable for the build pipeline, and what was changed.

A third library is modified, but nowhere on disk. The accessibility scan rewrites the `axe-core` bundle as it injects it --- `SOURCE_PATCHES` in `scripts/lib/axe-scan.mjs` replaces `Color2`'s six WeakMap-emulated `#private` fields with plain own properties, worth about a quarter of the scan's running time. Nothing under `node_modules/` is touched, so the substitution has to be re-proved against each axe-core upgrade rather than surviving one. Two gates do that, and both are needed: [`check_axe_patch_equiv.mjs`](Tools#check-axe-patch-equiv) compares the colour values the patched and stock bundles produce, and [`check_a11y_fingerprint.mjs`](Tools#check-a11y-fingerprint) compares the findings across the whole scan matrix.

## Sub-pages

- [Paged.js Patches](Fixes/PagedJS) --- changes to `book/lib/paged.browser.js`: the synchronous execution chain, hook dispatch fast-paths, DOM lookup optimizations, layout correctness fixes, and miscellaneous headless-specific changes.
- [pdf-lib Patches](Fixes/PDFLib) --- the thirteen `fast-*.mjs` shims and `parallel-deflate.mjs` that retune pdf-lib's parser, object model, and serializer for the process phase.
