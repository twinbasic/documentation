# builder/vendor/just-the-docs/

Vendored just-the-docs gem sources at version **0.10.1**. The build pipeline
reads from this tree on every run; nothing here is published as-is, but
everything here either feeds a compile step or is copied verbatim into
`_site/assets/`.

## Inventory

| Path | Origin | Used by |
|---|---|---|
| `_sass/` | Gem's `_sass/` at v0.10.1, byte-for-byte (`base.scss`, `buttons.scss`, `code.scss`, `color_schemes/`, `custom/setup.scss` + the gem's empty `custom/custom.scss`, `modules.scss`, `support/`, `utilities/`, `vendor/normalize.scss/normalize.scss`, ...). | [`builder/scss.mjs`](../../scss.mjs) compiles `docs/assets/css/just-the-docs-combined.scss` against these sources via Dart Sass; the load-path ordering puts `docs/_sass/` first so our `custom/custom.scss` shadows the gem's empty one. |
| `assets/js/just-the-docs.js` | Gem's `assets/js/just-the-docs.js` at v0.10.1, **patched in tree**. | [`builder/write.mjs`](../../write.mjs)'s `copyTheme` copies it to `_site/assets/js/just-the-docs.js`; [`builder/offline.mjs`](../../offline.mjs) re-derives an offline-mode variant via [`acorn`](https://www.npmjs.com/package/acorn)-AST patching. |
| `assets/js/vendor/lunr.min.js` | Gem's `assets/js/vendor/lunr.min.js` at v0.10.1, unmodified. | Copied verbatim by `copyTheme`. The search index that drives it is the in-process [`builder/search.mjs`](../../search.mjs) output (`assets/js/search-data.json`). |

## In-tree patches to `just-the-docs.js`

The upstream `processCodeBlocks` runtime that injects a copy-code button
into every `<div class="highlighter-rouge">` was retired. The same button
HTML is now server-rendered by [`builder/highlight.mjs`](../../highlight.mjs)
inside the highlighter wrapper, so the click handler binds to the
pre-rendered buttons via `closest('div.highlighter-rouge')`. The patched
file diverges from upstream by ~20 lines around the `processCodeBlocks`
call sites; the rest stays byte-identical.

Re-vendoring upstream means re-applying this patch by hand --- the offline
patcher in [`offline.mjs`](../../offline.mjs) is AST-based and survives
cosmetic upstream edits inside the patched function bodies, but the
copy-button retirement above is structural and has to be re-applied.

## Re-vendoring

Bumping the just-the-docs version is a deliberate operation. Procedure:

1. Pick a target tag at [just-the-docs/just-the-docs](https://github.com/just-the-docs/just-the-docs/tags)
   --- a patch bump is usually low risk, a minor bump may require entry-point
   adjustments because the gem's Liquid include shape can change.

2. Download the tagged tarball and replace this tree's `_sass/` and
   `assets/` with the upstream copies. From the repo root:

   ```sh
   # On Windows, the equivalent PowerShell calls are
   #   Invoke-WebRequest ... -OutFile ...; tar -xzf ... ; Copy-Item -Recurse ... .
   TAG=v0.10.2  # whatever you're bumping to
   curl -L "https://github.com/just-the-docs/just-the-docs/archive/refs/tags/$TAG.tar.gz" \
     | tar -xz -C "$TMPDIR"
   rm -rf builder/vendor/just-the-docs/_sass
   rm -rf builder/vendor/just-the-docs/assets
   cp -R "$TMPDIR/just-the-docs-${TAG#v}/_sass"  builder/vendor/just-the-docs/_sass
   mkdir -p builder/vendor/just-the-docs/assets/js/vendor
   cp "$TMPDIR/just-the-docs-${TAG#v}/assets/js/just-the-docs.js" \
      builder/vendor/just-the-docs/assets/js/just-the-docs.js
   cp "$TMPDIR/just-the-docs-${TAG#v}/assets/js/vendor/lunr.min.js" \
      builder/vendor/just-the-docs/assets/js/vendor/lunr.min.js
   ```

3. Delete the unused vendor syntax themes that are not used by this site
   (syntax highlighting comes from the twinBASIC IDE theme via
   `builder/highlight-theme.mjs` instead):

   ```sh
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneLightJekyll
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneDarkJekyll
   ```

4. Re-apply the copy-button patch in `assets/js/just-the-docs.js` (see
   above). Diffing against the previous vendored copy via `git diff` is
   the easiest way to spot what needs to come back.

5. Inspect the entry point at `docs/assets/css/just-the-docs-combined.scss`
   --- if the upstream `_includes/css/just-the-docs.scss.liquid` Liquid
   template changed shape between versions, the entry point needs to track
   it. The current entry point mirrors v0.10.1's: `support/support`,
   `custom/setup`, `color_schemes/<scheme>`, `modules`, plus the
   `callouts.scss.liquid` `div.opaque` rule and the `custom.scss.liquid`
   `@import "./custom/custom"`.

6. Inspect the offline JS patcher in [`builder/offline.mjs`](../../offline.mjs)
   --- `deriveOfflineJtdJs` slices in replacements for the upstream `navLink`
   and `initSearch` functions; if upstream rewrote either, the replacement
   bodies may need a refresh.

7. Run `build.bat && check.bat`. The link check catches missing CSS / JS
   references immediately; visual regressions are best caught by spinning
   up a preview and checking both light and dark modes.

## What this directory does **not** contain

- Project-owned theme assets (`print.css`, `just-the-docs-head-nav.css`,
  `theme-switch.js`) --- those live under `docs/assets/` and are
  authored locally, not vendored.
- The generated `_site/assets/css/just-the-docs-combined.css` --- compiled
  fresh on every build by [`builder/scss.mjs`](../../scss.mjs), never
  committed.
- The twinBASIC IDE syntax theme --- that's vendored separately under
  [`builder/themes/`](../../themes/) and consumed by
  [`builder/highlight-theme.mjs`](../../highlight-theme.mjs).
