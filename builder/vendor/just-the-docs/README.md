# builder/vendor/just-the-docs/

Vendored just-the-docs gem sources at version **0.10.1**. The build pipeline
reads from this tree on every run; nothing here is published as-is, but
everything here either feeds a compile step or is copied verbatim into
`_site/assets/`.

## Inventory

| Path | Origin | Used by |
|---|---|---|
| `_sass/` | Gem's `_sass/` at v0.10.1, **patched in tree** --- 30 of the 36 files vendored in `e7dd843` have diverged: 26 modified and 4 deleted. See [In-tree patches to `_sass/`](#in-tree-patches-to-_sass) for which, why, and which must survive a re-vendor. | [`builder/scss.mjs`](../../scss.mjs) compiles `docs/assets/css/just-the-docs-combined.scss` against these sources via Dart Sass; the load-path ordering puts `docs/_sass/` first so our `custom/custom.scss` shadows the gem's empty one. |
| `assets/js/just-the-docs.js` | Gem's `assets/js/just-the-docs.js` at v0.10.1, **patched in tree**. | [`builder/write.mjs`](../../write.mjs)'s `copyTheme` copies it to `_site/assets/js/just-the-docs.js`; [`builder/offline.mjs`](../../offline.mjs) re-derives an offline-mode variant via [`acorn`](https://www.npmjs.com/package/acorn)-AST patching. |
| `assets/js/vendor/lunr.min.js` | Gem's `assets/js/vendor/lunr.min.js` at v0.10.1, unmodified. | Copied verbatim by `copyTheme`. The search index that drives it is the in-process [`builder/search.mjs`](../../search.mjs) output (`assets/js/search-data.json`). |

No upstream `LICENSE` is vendored alongside them, and one should be --- see
[Licence](#licence).

## In-tree patches to `_sass/`

Thirty of the thirty-six files vendored in `e7dd843` differ from the gem's
v0.10.1 tree: 26 modified and 4 deleted. They fall into three groups, and only
the third has to be re-applied by hand after a re-vendor.

**The three groups are disjoint and sum to 30**, so this section doubles as the
re-vendoring checklist. A file is listed under the one patch that matters most
for re-vendoring, not under every commit that touched it: the syntax migration
touched all 26 modified files, including all six in group 3 and both of the
`color_schemes/` edits in group 2.

### Group 1 --- syntax migration only (18 files, re-derivable)

`edc9990` (`@import` to `@use` / `@forward`) and `32a404b` (ports of
deprecated Sass constructs). Mechanical: repeat the migration against the new
upstream rather than trying to port the diffs. These 18 files carry nothing
else:

- eight at the top level --- `base.scss`, `content.scss`, `labels.scss`,
  `modules.scss`, `print.scss`, `skiptomain.scss`, `tables.scss`,
  `typography.scss`;
- five under `support/` --- all four of `support/mixins/`, plus
  `support/support.scss`;
- five of the six under `utilities/` --- `_lists.scss` is the one file the
  migration did not touch, and it is byte-identical to upstream.

### Group 2 --- deleted vendor syntax themes (4 deletions + 2 edits = 6 files)

`1632d3d` removed `vendor/OneDarkJekyll/` and `vendor/OneLightJekyll/`
(LICENSE + `syntax.scss` each, so four files); syntax highlighting comes from
the twinBASIC IDE theme via [`builder/highlight-theme.mjs`](../../highlight-theme.mjs)
instead.

**The deletion is not self-contained.** `color_schemes/dark.scss` and
`color_schemes/light.scss` each carried a load of the deleted partial ---
upstream writes it as `@import "./vendor/One*Jekyll/syntax";`, and in this tree
`32a404b` had already converted both to `@use` before `1632d3d` removed them
--- and those two lines had to go in the same commit or Dart Sass fails on a
missing partial. Re-vendoring step 3 below re-applies both halves. Those two
files are the "+ 2 edits" in this group's count; they also carry the group-1
migration (`darken()` to `color.adjust()`), which is why deleting the two lines
against a fresh upstream tree means deleting `@import` statements rather than
`@use` ones.

(`1632d3d` also reworded two stale `// Override OneDarkJekyll Colors` comments
in `code.scss`; cosmetic, and safe to skip. `code.scss` is counted in group 3.)

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

Six files, four commits --- the eight rows above cover `buttons.scss` and
`navigation.scss` twice each. All six also carry the group-1 migration, which
touched them too: take the migration from upstream and these patches from
`git show` on `3db9794`, `c9f2dfe`, `0813181` and `56c5570`.

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

## Licence

just-the-docs is MIT-licensed and **its `LICENSE.txt` is not vendored here**.
`e7dd843` and `090b3a1` copied the gem's `_sass/` and `assets/` directories
only; the licence sits at the gem root, which was never copied. The two
upstream `LICENSE` files that *were* vendored --- OneDarkJekyll's and
OneLightJekyll's, both MIT --- went with the syntax themes in `1632d3d`, so
this tree now carries no licence text at all.

It should carry one. The MIT terms require the copyright notice and the
permission notice to be included with "copies or substantial portions of the
Software", and what is vendored here is the theme's entire stylesheet tree plus
its runtime JS, compiled into `assets/css/just-the-docs-combined.css` and served
from every page of the site. The footer's "Just the Docs" link is attribution,
not the notice. The project's practice elsewhere is to keep the two together:
each of the three webfaces under `docs/assets/fonts/` sits beside its OFL
licence, and [`builder/template.mjs`](../../template.mjs) keeps the Feather and
Bootstrap Icons MIT notices inline with the SVG data they cover.

The fix is one file --- copy `LICENSE.txt` from the tagged upstream tree to
`builder/vendor/just-the-docs/LICENSE.txt`. Re-vendoring step 2 below does it.
The current tree predates this note and does not have it yet.

## Re-vendoring

Bumping the just-the-docs version is a deliberate operation. Procedure:

1. Pick a target tag at [just-the-docs/just-the-docs](https://github.com/just-the-docs/just-the-docs/tags)
   --- a patch bump is usually low risk, a minor bump may require entry-point
   adjustments because the gem's Liquid include shape can change.

2. Download the tagged tarball and replace this tree's `_sass/` and
   `assets/` with the upstream copies, taking `LICENSE.txt` with them (see
   [Licence](#licence)). From the repo root:

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
   cp "$TMPDIR/just-the-docs-${TAG#v}/LICENSE.txt" \
      builder/vendor/just-the-docs/LICENSE.txt
   ```

3. Delete the unused vendor syntax themes, and the two statements that load
   them. Both halves, or the Sass build fails on a missing partial. Upstream
   spells them `@import`; this tree's copies were `@use` because the syntax
   migration ran first:

   ```sh
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneLightJekyll
   rm -rf builder/vendor/just-the-docs/_sass/vendor/OneDarkJekyll
   # and remove, from _sass/color_schemes/:
   #   dark.scss :  @import "./vendor/OneDarkJekyll/syntax";
   #   light.scss:  @import "./vendor/OneLightJekyll/syntax";
   ```

4. **Re-apply the group-3 accessibility patches to `_sass/`** --- see
   [In-tree patches to `_sass/`](#in-tree-patches-to-_sass). Six files,
   four commits (`3db9794`, `c9f2dfe`, `0813181`, `56c5570`), each one a
   fix for a measured contrast or focus-visibility failure. `git show`
   on each commit is the source; `check.bat` is what says they came back
   (the dark half of the scan is the one that catches a specificity
   slip). **This is the step a re-vendor loses in silence.** Steps 3 and 5
   announce themselves --- a missing partial fails the Sass build, and a
   missing copy-button patch leaves dead controls on the page --- while this
   one does not: the site renders. The contrast regressions are reported only
   by the axe scan, and the three focus rings by nothing at all, since axe
   checks that a control is reachable and named, not that its ring is visible.

5. Re-apply the copy-button patch in `assets/js/just-the-docs.js` (see
   above). Diffing against the previous vendored copy via `git diff` is
   the easiest way to spot what needs to come back.

6. Inspect the entry point at `docs/assets/css/just-the-docs-combined.scss`
   --- if the upstream `_includes/css/just-the-docs.scss.liquid` Liquid
   template changed shape between versions, the entry point needs to track
   it. The current entry point mirrors v0.10.1's: `support/support`,
   `custom/setup`, `color_schemes/<scheme>`, `modules`, plus the
   `callouts.scss.liquid` `div.opaque` rule and the `custom.scss.liquid`
   `@import "./custom/custom"`.

7. Inspect the offline JS patcher in [`builder/offline.mjs`](../../offline.mjs)
   --- `deriveOfflineJtdJs` slices in replacements for the upstream `navLink`
   and `initSearch` functions; if upstream rewrote either, the replacement
   bodies may need a refresh.

8. Run `build.bat && check.bat`. The link check catches missing CSS / JS
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
- The upstream MIT `LICENSE.txt` --- not by design; see [Licence](#licence).
