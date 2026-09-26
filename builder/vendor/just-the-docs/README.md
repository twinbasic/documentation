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

`LICENSE.txt` is the upstream MIT licence, copied verbatim from the tag and
covering all three --- see [Licence](#licence).

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

**The search's typo fallback is capped at an edit distance of 2.** When a
query's words match nothing, upstream searches again with an edit distance
taken from the length of the *whole query*, `Math.round(Math.sqrt(input.length
/ 2 - 1))`, and applies it to every word. lunr's fuzzy expansion grows
exponentially with that distance. Measured in headless Chromium against the
built site: three Windows API names the site does not index, 49 characters and
distance 5, froze the page for 5.1 s and took the JS heap to 1.6 GB; four, 70
characters and distance 6, never answered within 60 s. Capped, both answer in
about 10 ms. A query of 15 characters or fewer is unaffected, since the formula
gives at most 2 there. [`eval/site_search.mjs`](../../../eval/site_search.mjs)
replicates the query logic and carries the same cap; it is where the defect
was found, when re-measuring an evaluator's search ran the replica out of
memory.

**A query made only of asterisks crashes lunr instead of returning no
results.** `update()` builds its query from `lunr.tokenizer(input)`
unfiltered; a token that is all `*` survives tokenising (lunr's trimmer
only strips from the ends) and reaches `lunr.Query.wildcard.TRAILING`,
where lunr's query engine throws (`Cannot read properties of undefined
(reading '_index')`) instead of matching nothing. Once that throws, the
in-page search stays broken until the page reloads. The patch filters out
any token matching `/^\*+$/` before both the main query and the fuzzy
fallback; if nothing is left, `results` is set to `[]` directly so the
existing "No results found" branch renders as it would for any other query
with no hits. `initSearch()` and `navLink()` are the only functions the
offline build's AST patcher (`deriveOfflineJtdJs` in
[`offline.mjs`](../../offline.mjs)) replaces; `update()` and `searchLoaded()`
pass through untouched, so the offline build inherits this fix for free.
[`eval/site_search.mjs`](../../../eval/site_search.mjs) mirrors the same
filter, so the replica returns what the site does.

**Two extra fields joined in from the symbol index.** `initSearch()` adds
`this.field('names', { boost: 100 })` and `this.field('qualified', { boost:
50 })`, and passes `docs[i].names || ''` / `docs[i].qualified || ''` in the
matching `this.add({...})`. The values come from `builder/search.mjs`'s
`joinSymbolsToEntries`, which attaches bare symbol names (`names`) and their
`Container.Name` forms (`qualified`) to each `search-data.json` entry at
build time -- see [`../../../WIP.Search.md`](../../../WIP.Search.md)'s
"Design" §2 for why they are two fields, not one. `offline.mjs`'s
`JTD_INITSEARCH_FN_REPLACEMENT` carries the same two fields at the same
boosts, since it builds its own lunr index rather than inheriting
`initSearch()`.

**Qualified names ("Form.PaintPicture") missed their target because the
tokenizer never splits on `.`.** `update()`'s smart dot split keeps each
query token whole (so `Debug.Print` still matches its exact entry first)
and, where a `.` follows a run of word characters holding a letter or
underscore and precedes a letter or underscore, also adds the parts as
extra terms with the same boost and trailing wildcard. Such dots are
marked with a NUL by `/([A-Za-z_]\w*)\.(?=[A-Za-z_])/g` and split there. A
lookbehind would say it more directly, but Safari before 16.4 can't parse
one, and the SyntaxError would disable this whole file, navigation
included. Parts of one character are dropped, which
keeps `1.0`, `3.9`, `e.g.` and `i.e.` from adding noise. The fuzzy fallback
reuses the same expanded token list. `update()` is not one of the two
functions the offline AST patcher replaces, so the offline build inherits
this for free, same as the asterisk guard above.
[`eval/site_search.mjs`](../../../eval/site_search.mjs) mirrors the split
exactly. `test/search.test.mjs` extracts the `names`/`qualified` field and
boost list from this file, `offline.mjs`, and `eval/site_search.mjs` and
asserts all three agree, so the two client copies (and the eval replica)
cannot drift apart silently.

**Stop words were dropped from the index but never from the query, so
every twinBASIC keyword was unfindable.** lunr's index pipeline runs
`lunr.stopWordFilter` by default; its search pipeline never did, so a
query for `Do`, `For`, `If`, `Is`, `On`, `With` or `Each` still carried that
exact token, which by then existed nowhere in the index (`Do` ranked 18th,
`With` 55th, `Is` 177th). The fix is `this.pipeline.remove(
lunr.stopWordFilter)` inside the `lunr(function(){...})` builder in both
copies (and `eval/site_search.mjs`'s `buildIndex`), which keeps stop words
in the index instead. See [`../../../WIP.Search.md`](../../../WIP.Search.md)'s
"Design §5" for the queries this trades away (short common words, mostly
other `vbXxx` prefixes, now crowd into a few more results than before).

**Runs of two or more dots (`Do...Loop`, `For Each...Next`) tokenised as
one opaque token.** lunr's tokenizer decides where to split by testing one
character at a time against `separator`, so a `\.{2,}` alternative inside
that regex can never match. The fix wraps `lunr.tokenizer`: for a string
input, every run of 2+ dots becomes the same number of spaces (keeping
character offsets valid for match highlighting), then the original
tokenizer runs as usual; non-string input (arrays, `null`) passes through
unchanged. Installed once, at the same place `lunr.tokenizer.separator`
used to be set directly -- and the wrapper has to carry `separator` itself,
because the original tokenizer reads `lunr.tokenizer.separator` at call
time, which after this reassignment resolves to the wrapper's own property,
not the original function's. Since it patches the shared global `lunr`
object, it applies to the index build and every query alike.
`eval/site_search.mjs` installs the same wrapper. `test/search.test.mjs`'s
drift guard checks all three copies remove the stop-word filter and install
this wrapper, alongside its existing field/boost check.

**The index was fetched and built synchronously on every page load, even
for readers who never opened search.** About 1.3s and 240MB of heap on a
desktop -- see [`../../../WIP.Search.md`](../../../WIP.Search.md)'s "Design
§5" cost table. `initSearch()` now only defines *how* to build the index
(`loadIndex(onSuccess, onError)`) and hands that to `searchLoaded()`, which
wires up the search box's listeners immediately but doesn't call
`loadIndex()` until the first `keyup` (upstream's trigger for `update()`)
that leaves the box non-empty. That first keystroke shows a loading message
(reusing `.search-no-result`) and the matching `a11y-status` text, then
yields: a frame (`requestAnimationFrame`) raced by a 100 ms timer, since
frames never fire in a hidden tab, then `setTimeout(fn, 0)`, so the message
paints before the synchronous build runs. It then searches whatever is in
the box *when the build finishes*, which may differ from what triggered it,
since the reader may keep typing. Only one load is ever in flight; a
keystroke mid-load leaves the loading message in place (`update()` checks
for the unbuilt index before it clears the panel) and just changes what
gets searched at the end. A failed load shows "Search is unavailable" and
leaves the index unset, so the next keystroke retries. `searchLoaded()` now
takes `loadIndex` in place of `(index, docs)` -- it, and everything below
`update()`'s new lazy-build gate, stays a single shared function; only
`initSearch()` differs between the two copies (XHR fetch vs. reading the
offline build's preloaded `window.SEARCH_DATA`), and both install the
stop-word and dot-run-split patches above from inside their own
`loadIndex()`. `eval/site_search.mjs` has no lazy build to mirror -- the
CLI always wants an index built up front.

## Licence

just-the-docs is MIT-licensed, and `LICENSE.txt` beside this file is the
upstream notice at v0.10.1, copied byte-for-byte from the tag (MIT, "Copyright
(c) 2016 Patrick Marsceill", 1084 bytes,
sha256 `2ca62729bcac3d0b534e7e03b7693d4436e1aec4a6e0f2a766fab8263a3a1b85`).

It was missing until `HEAD`. `e7dd843` and `090b3a1` copied the gem's `_sass/`
and `assets/` directories only, and the licence sits at the gem root. The two
upstream `LICENSE` files that *were* vendored --- OneDarkJekyll's and
OneLightJekyll's, both MIT --- went with the syntax themes in `1632d3d`, so for
a period this tree carried no licence text at all.

It has to carry one. The MIT terms require the copyright notice and the
permission notice to be included with "copies or substantial portions of the
Software", and what is vendored here is the theme's entire stylesheet tree plus
its runtime JS, compiled into `assets/css/just-the-docs-combined.css` and served
from every page of the site. The footer's "Just the Docs" link is attribution,
not the notice. The project's practice elsewhere is to keep the two together:
each of the three webfaces under `docs/assets/fonts/` sits beside its OFL
licence, and [`builder/template.mjs`](../../template.mjs) keeps the Feather and
Bootstrap Icons MIT notices inline with the SVG data they cover.

**Re-vendoring must bring the licence with the code.** Step 2 below copies it
from the same tarball as `_sass/` and `assets/`, so the notice always matches
the version it covers --- taking it from anywhere else is how the two drift
apart.

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

5. Re-apply the copy-button patch, the edit-distance cap, the asterisk
   guard, the `names`/`qualified` fields, the smart dot split, the
   stop-word removal, the dot-run-split tokenizer wrapper, and the lazy
   index build in `assets/js/just-the-docs.js` (see above). Diffing against
   the previous vendored copy via `git diff` is the easiest way to spot
   what needs to come back. Then re-check `offline.mjs`'s
   `JTD_INITSEARCH_FN_REPLACEMENT` still carries the same two fields at the
   same boosts and the same stop-word/dot-run-split/lazy-build patches, and
   run `test/search.test.mjs`'s field-list drift guard and its stop-word/
   dot-run-split sibling guard -- both fail loudly if the re-vendor left the
   copies out of step. If upstream's `initSearch()`/`searchLoaded()` split
   changed shape (a signature change, a rename), `deriveOfflineJtdJs`'s
   `JTD_INITSEARCH_FN_REPLACEMENT` and the offline `loadIndex()` it defines
   may need a matching update -- see [`../../../WIP.Search.md`](../../../WIP.Search.md)'s
   "Design §5" for how the two functions divide the work now.

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
- Anything from the gem outside `_sass/` and `assets/` --- no `_includes/`,
  `_layouts/` or `_config.yml`. The one exception is `LICENSE.txt`, which is
  vendored because it has to be; see [Licence](#licence).
