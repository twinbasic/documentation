# builder/vendor/just-the-docs/

Vendored just-the-docs gem sources at version **0.10.1**. The build pipeline
reads from this tree on every run; nothing here is published as-is, but
everything here either feeds a compile step or is copied verbatim into
`_site/assets/`.

## Inventory

| Path | Origin | Used by |
|---|---|---|
| `_sass/` | Gem's `_sass/` at v0.10.1, **patched in tree** --- 30 of its files have diverged since the vendoring commit `e7dd843`. See [In-tree patches to `_sass/`](#in-tree-patches-to-_sass) for which, why, and which must survive a re-vendor. | [`builder/scss.mjs`](../../scss.mjs) compiles `docs/assets/css/just-the-docs-combined.scss` against these sources via Dart Sass; the load-path ordering puts `docs/_sass/` first so our `custom/custom.scss` shadows the gem's empty one. |
| `assets/js/just-the-docs.js` | Gem's `assets/js/just-the-docs.js` at v0.10.1, **patched in tree**. | [`builder/write.mjs`](../../write.mjs)'s `copyTheme` copies it to `_site/assets/js/just-the-docs.js`; [`builder/offline.mjs`](../../offline.mjs) re-derives an offline-mode variant via [`acorn`](https://www.npmjs.com/package/acorn)-AST patching. |
| `assets/js/vendor/lunr.min.js` | Gem's `assets/js/vendor/lunr.min.js` at v0.10.1, unmodified. | Copied verbatim by `copyTheme`. The search index that drives it is the in-process [`builder/search.mjs`](../../search.mjs) output (`assets/js/search-data.json`). |

## In-tree patches to `_sass/`

Thirty files differ from the gem's v0.10.1 tree. They fall into three groups,
and only the third has to be re-applied by hand after a re-vendor.

### Group 1 --- syntax migration (18 files, re-derivable)

`edc9990` (`@import` to `@use` / `@forward`) and `32a404b` (ports of
deprecated Sass constructs). Mechanical: repeat the migration against the new
upstream rather than trying to port the diffs. Covers `base.scss`,
`content.scss`, `labels.scss`, `modules.scss`, `print.scss`, `skiptomain.scss`,
`tables.scss`, `typography.scss`, all of `support/mixins/`, `support/support.scss`
and all of `utilities/`.

### Group 2 --- deleted vendor syntax themes (6 files)

`1632d3d` removed `vendor/OneDarkJekyll/` and `vendor/OneLightJekyll/`
(LICENSE + `syntax.scss` each); syntax highlighting comes from the twinBASIC
IDE theme via [`builder/highlight-theme.mjs`](../../highlight-theme.mjs)
instead.

**The deletion is not self-contained.** `color_schemes/dark.scss` and
`color_schemes/light.scss` each carried a `@use "./vendor/One*Jekyll/syntax";`
pointing into the deleted directories, and those two lines had to go in the
same commit or Dart Sass fails on a missing partial. Re-vendoring step 3 below
re-applies both halves. (`1632d3d` also reworded two stale
`// Override OneDarkJekyll Colors` comments in `code.scss`; cosmetic, and safe
to skip.)

### Group 3 --- accessibility patches, which MUST survive re-vendoring (6 files)

These are the ones a re-vendor loses, and each was made against a measured
failure. The contrast ratios quoted below are from the patches' own SCSS
comments and the commits that introduced them.

| File | Commit | The patch, and why |
|---|---|---|
| `buttons.scss` | `3db9794` | `.btn-reset` gains `color: inherit`. Without it the button keeps the UA's `buttontext` (black), which is **1.39:1** on the dark background --- the SVG diagram controls. |
| `buttons.scss` | `c9f2dfe` | `.btn-reset:focus-visible` gains a 2px `$link-color` outline at 2px offset. Upstream ships none. |
| `code.scss` | `c9f2dfe` | The copy-code control's `outline: none` on `:active` is dropped and `:focus` becomes `:focus-visible` with a visible 2px ring. |
| `search.scss` | `c9f2dfe` | The search input's `outline: 0` on `:focus` becomes a 2px inset ring. |
| `layout.scss` | `3db9794`, `0813181` | `.site-footer` text moves from `$grey-dk-000` (**2.82:1** on the light sidebar) to `$grey-dk-100` (**7.20:1**), and takes `font-weight: 350` so hierarchy comes from weight rather than a dimmer colour. |
| `navigation.scss` | `0813181` | `.nav-list-link` child items take `font-weight: 350`, for the same reason. |
| `navigation.scss` | `56c5570` | The breadcrumb separator gains `content: "/" / "";` --- CSS alt text, so the decorative slash is not announced between every crumb. The plain `content: "/";` stays first as the fallback for Safari < 17.4. |
| `support/_variables.scss` | `0813181` | `$grey-dk-100` `#5c5962` -> `#54515a` (6.86/6.35:1 -> **7.77/7.20:1**) and `$link-color` `$purple-000` -> `$purple-200` (5.03/4.66/4.30:1 -> **9.46/8.76/8.09:1**; the old value did not reach AA at the opaque end of the active-nav gradient). |

`buttons.scss`, `code.scss`, `layout.scss`, `navigation.scss`,
`search.scss` and `support/_variables.scss` are therefore also group-1 files ---
the migration touched them too. Take the migration from upstream and these
patches from `git show` on the commits above.

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

3. Delete the unused vendor syntax themes, and the two `@use` statements
   that point into them. Both halves, or the Sass build fails on a
   missing partial:

   ```sh
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneLightJekyll
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneDarkJekyll
   # and remove, from _sass/color_schemes/:
   #   dark.scss :  @use "./vendor/OneDarkJekyll/syntax";
   #   light.scss:  @use "./vendor/OneLightJekyll/syntax";
   ```

4. Re-apply the copy-button patch in `assets/js/just-the-docs.js` (see
   above). Diffing against the previous vendored copy via `git diff` is
   the easiest way to spot what needs to come back.

4a. **Re-apply the group-3 accessibility patches to `_sass/`** --- see
   [In-tree patches to `_sass/`](#in-tree-patches-to-_sass). Six files,
   four commits (`3db9794`, `c9f2dfe`, `0813181`, `56c5570`), each one a
   fix for a measured contrast or focus-visibility failure. `git show`
   on each commit is the source; `check.bat` is what says they came back
   (the dark half of the scan is the one that catches a specificity
   slip).

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
  `theme-toggle.js`) --- those live under `docs/assets/` and are
  authored locally, not vendored.
- The generated `_site/assets/css/just-the-docs-combined.css` --- compiled
  fresh on every build by [`builder/scss.mjs`](../../scss.mjs), never
  committed.
- The twinBASIC IDE syntax theme --- that's vendored separately under
  [`builder/themes/`](../../themes/) and consumed by
  [`builder/highlight-theme.mjs`](../../highlight-theme.mjs).
