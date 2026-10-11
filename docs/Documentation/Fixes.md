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

Two third-party libraries are modified in the tree. `book/lib/paged.browser.js` is a patched copy of paged.js v0.4.3 (MIT); the `fast-*.mjs` files there are shims applied to pdf-lib's live exports before each PDF process phase. This section documents each change: the upstream behaviour, why it did not suit the build pipeline, and the fix.

A third library, `axe-core`, is patched in memory only. The accessibility scan rewrites the bundle as it injects it: `SOURCE_PATCHES` in `scripts/lib/axe-scan.mjs` replaces `Color2`'s six WeakMap-emulated `#private` fields with plain own properties, which saves about a quarter of the scan's running time. Nothing under `node_modules/` changes, so re-verify the substitution after each axe-core upgrade. Two gates do that: [`check_axe_patch_equiv.mjs`](Tools-Toolchain-Tests#check-axe-patch-equiv) compares the colour values the patched and stock bundles produce, and [`check_a11y_fingerprint.mjs`](Tools-Site-Checks#check-a11y-fingerprint) compares the findings across the whole scan matrix.

## Sub-pages

- [Paged.js Patches](Fixes/PagedJS) --- changes to `book/lib/paged.browser.js`: the synchronous execution chain, hook dispatch fast-paths, DOM lookup optimizations, layout correctness fixes, and miscellaneous headless-specific changes.
- [pdf-lib Patches](Fixes/PDFLib) --- the `fast-*.mjs` shims and `parallel-deflate.mjs` that retune pdf-lib's parser, object model, and serializer for the process phase.
