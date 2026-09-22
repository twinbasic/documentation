# twinBASIC Documentation — Font subsetting notes

Companion to [WIP.md](WIP.md)'s [Typography](WIP.md#typography) section. This file covers
*producing* the six committed `.woff2` files under `docs/assets/fonts/`: the generator, why
the Unicode coverage and the axis pinning are what they are, and the JavaScript port of the
generator, which is blocked on a harfbuzzjs build defect documented here in full. Everything
about *using* the faces --- the `@font-face` wiring, the dark-theme specificity trap, the
PDF's font handling, the diagram width tables --- stays in WIP.md.

Like WIP.md, this file is not rendered through tbdocs, so literal dashes are fine here.

## Regenerating the fonts

[scripts/build_fonts.py](scripts/build_fonts.py) downloads the pinned upstream
releases (SHA-256 verified), pins the optical-size axis, subsets, and writes
`docs/assets/fonts/`. It is dev tooling --- `build.bat` needs neither Python nor
a network connection, exactly like the committed DOT SVGs.

```sh
python -m pip install "fonttools[woff]"
python scripts/build_fonts.py
```

**Regenerating Inter means regenerating the diagram metrics too.**
`builder/inter-metrics.json` is Inter's advance widths, measured from these
exact `.woff2` files and handed to Graphviz so it can size diagram boxes
correctly --- so a new subset with different advances leaves it stale:

```sh
node scripts/build_dot_metrics.mjs      # or --check, which fails if stale
```

Forgetting is not silent. Stale widths move the boxes, and
`scripts/check_dot_fit.mjs` --- in `check.bat` and in the PR checks workflow (`checks.yml`, though not the deploy workflow) --- fails as soon as a
label outgrows one. See [Teaching Graphviz what Inter
measures](WIP.Typography.md#teaching-graphviz-what-inter-measures).

`opsz` is pinned and `wght` is not. Keeping the optical-size axis costs ~70 KB
per face in `gvar`/`CFF2` delta data --- more than trimming the character set
would save --- and buys a subtle refinement at display sizes. Keeping `wght`
variable is what lets the vendored `layout.scss` and `navigation.scss` go on asking
for `font-weight: 350` (one occurrence each) and get a real 350 rather than a
browser-dependent snap to 300 or 400. Note it is the *vendored* theme sources that
ask, not `custom/custom.scss`, which declares no `font-weight` at all ---
`_fonts.scss`'s own comment gets this wrong too.

The subset is specified as whole Unicode blocks rather than the exact character
census, deliberately: an uncovered codepoint falls back to a system font, which
is the precise inconsistency this whole exercise removes, so the blocks carry
headroom for pages not yet written. Emoji are excluded --- a colour emoji font is
several megabytes and every platform ships one --- and the stacks end with
`"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"` to make that fallback
deterministic rather than leaving it to each UA's last-resort lookup.

Two content changes fell out of the coverage audit and should not be reverted:
U+2714 HEAVY CHECK MARK (14 uses) became U+2713 CHECK MARK, because no text face
in the stack carries U+2714 and it therefore rendered from the platform emoji
font --- coloured on Windows, monochrome elsewhere; and one U+22EE VERTICAL
ELLIPSIS inside a box-drawing ASCII diagram became `:`, because Cascadia has no
U+22EE and a fallback glyph of a different advance width shears the box borders.

## `build_fonts.py` is blocked on a harfbuzzjs build defect, not on Python

The JS stack for this exists and nearly works: `harfbuzzjs`'s `hb-subset` WASM for the
subsetting and the axis pinning, a WOFF2 codec, and a small ZIP reader. Measured against all
six committed faces it lands within **±1.2%** of fontTools on output size, and for the four
TrueType faces --- Inter roman and italic, Cascadia Mono roman and italic --- it is *exactly*
equivalent: same axes, same 1,103-codepoint cmap, same glyph count, same 20 tables, the OFL
notice intact, and **zero advance-width differences**.

`hb_subset_input_keep_everything()` is the wrong control for this (+56.9%, because it
retains glyph names). The right one is `hb_subset_input_set_flags(input, NOTDEF_OUTLINE)`
plus clear-and-invert on the `NAME_ID`, `NAME_LANG_ID` and `LAYOUT_FEATURE_TAG` sets, which
is what fontTools' `--name-IDs=*` and `--layout-features=*` mean.

**The two Source Serif faces are CFF2, and harfbuzzjs's subsetter instances them wrongly.**
Stated precisely, because the first three attempts at stating it were each too narrow:

> `harfbuzz-subset.wasm` as shipped in harfbuzzjs 1.5.0--1.6.2 (HarfBuzz 14.3.0--14.5.0)
> applies a pinned axis location to a CFF2 font's **charstrings but not to its `hmtx`**.
> `hmtx` keeps the default-instance advances, `head`'s bounding box is left at the
> accumulator's sentinel `(32767, 32767, -32767, -32767)` --- `xMin > xMax`, invalid by
> spec --- and `hhea.advanceWidthMax` is 0. `HVAR` is kept on a partial pin (restricted to
> the surviving axes) and dropped on a full one, correctly in both cases; it just no longer
> has anything to reconcile. Both subset APIs return success.

It is visible rather than subtle. Pinned at `opsz` 11, Source Serif's `A` is drawn with its
ink reaching x=720 --- matching fontTools to 2 units --- inside an advance of 664, the
`opsz` 20 value. The glyph overhangs its own advance by 56/1000 em, so letters collide.

The evidence, in the order it was gathered, because each line closed a door the previous
one had left open:

| control | result |
|---|---|
| HarfBuzz's **shaper** (`harfbuzz.wasm`, `hb_font_set_variations` + `hb_font_get_glyph_h_advance`) on the same font at the same location | disagrees with the subsetter's output on **7 of 7** sampled codepoints; fontTools agrees with the shaper to the unit |
| Same subsetter, **glyf/gvar** font (Inter), `opsz`→16 and `wght`→700 | correct, 317/317 --- and Inter's `opsz` *does* move advances, so this is not a blind test |
| Other axis, other API (`set_axis_range`), **full** pin | same fault every time |
| **Other CFF2 fonts** --- HarfBuzz's own `AdobeVFPrototype.otf` test font, Source Sans 3 VF | same fault, 201/201 and 319/319 advances stale; Roboto Flex (glyf, 13 axes) as a second control: 318/318 correct |
| **Official `hb-subset.exe` 14.5.0** (win64 release, same HarfBuzz version) on the same bytes with equivalent flags | **correct** on every codepoint, partial and full pin, both axes. Its `CFF2` table is **byte-identical** to the WASM's; only `hmtx` differs |
| Preprocess the real `hb-config.hh` with harfbuzzjs's real emcc flags | `update_instance_metrics_map_from_cff2()` is **compiled out** of the subset WASM and compiled in everywhere else |

So this is not a HarfBuzz logic bug. The upstream code is present and right; the WASM does
not contain it.

**Root cause.** `plan->hmtx_map` --- the map `hmtx::subset()` reads to emit instanced
advances --- has two writers. Glyf fonts fill it from phantom points, unguarded. CFF2 fonts
have no phantom points, so theirs is filled by `update_instance_metrics_map_from_cff2()`
(`hb-subset-plan-var.cc:673`, called at `hb-subset-plan.cc:792`), which needs the CFF2
*outline* accelerator for extents and is therefore wrapped in
`#if !defined(HB_NO_VAR) && !defined(HB_NO_OT_FONT_CFF)`. harfbuzzjs builds with
`-DHB_TINY`, which implies `HB_NO_DRAW`, and `hb-config.hh`'s closure block derives
`HB_NO_OT_FONT_CFF` from `HB_NO_DRAW` at line 141 --- **after** the per-build override is
included at line 112. `config-override-subset.h` does say `#undef HB_NO_OT_FONT_CFF`; at
that point the macro is not yet defined, so the undef is a no-op and line 141 defines it
anyway. The shaping build's `config-override.h` carries `#undef HB_NO_DRAW` and escapes; the
subset build's does not. When the map is empty, `hmtx::subset()` copies the source advance
verbatim (`hb-ot-hmtx-table.hh:235`), with no diagnostic --- which is why both APIs report
success, and why the same missing function also leaves `head`'s bbox at its sentinel and
`advanceWidthMax` at 0: those are its other two outputs.

Why nobody caught it: upstream *has* a regression test for exactly this
(`instantiate_cff2_update_metrics.tests`, from PR #4189 in 2023), but its CFF2 goldens are
copied from hb-subset's own output (`no_fonttools`), and the suite never runs an
`HB_NO_DRAW` build. harfbuzzjs's tests do not exercise pinning at all. The guard itself
arrived in June 2026 (PR #6009, answering harfbuzzjs's own link error in #5955) together
with a `#define HB_NO_CFF` that made the breakage loud; commit `38976fba` (July 2026)
removed the loud half and kept the guard. harfbuzzjs 1.2.1--1.4.0 therefore had no CFF2
subsetting at all; 1.5.0 onward has it, silently wrong.

**The fix is one line in harfbuzzjs**: `#undef HB_NO_DRAW` in `config-override-subset.h`
(or restore `-DHB_CONFIG_OVERRIDE_LAST_H`, which is what 1.2.0 used and why it was correct).
There is a secondary design point for upstream HarfBuzz --- a subsetter that cannot compute
CFF2 instance metrics should refuse rather than emit a font with mismatched outlines and an
invalid `head` --- but the actionable report is harfbuzzjs's.

**Unreported as of 2026-09-21.** A full sweep of both trackers (every open issue and PR,
closed-issue term searches, Discussions, and the `subset-font` / `subfont` / `cn-font-split`
wrappers) found nothing. The closest prior art is a review comment on harfbuzz PR #6009
(2026-07-16) that named `config-override-subset.h` and the missing `#undef HB_NO_DRAW` ---
for the loud predecessor, which `38976fba` then fixed without touching the guard. Two
look-alikes are different bugs: #6068 (HVAR advances frozen on partial instancing; fixed)
and the open #4029 (glyf `hhea` bounds not recomputed when the metrics map is empty --- the
same shape, a different table). Both repos' `main` still carried the defect when checked.

**Status (2026-09-21).** Decided: wait for the harfbuzzjs fix rather than take the Pyodide
route or leave the script Python for good. harfbuzzjs 1.6.2, published the same day, is a
pure HarfBuzz 14.5.0 bump --- byte-identical WASM to what was tested, re-run to be sure ---
so the first release that can help is whatever comes after it. The report is drafted at
`.claude/harfbuzzjs-issue.md` (gitignored, like everything under `.claude/`) and is to be
filed by the maintainer from their own account; once it is, put the issue number here so a
later reader can check whether a fixed release exists before starting the port.

**Consequences here.** `build_fonts.py` keeps its Python until a fixed harfbuzzjs ships. That
costs nothing anyone notices: dev tooling that runs about once a year, needs a network
connection regardless, and emits committed artifacts, so `build.bat` still needs neither
Python nor a network. **Nothing currently shipped is affected** --- the committed faces were
built by fontTools and are correct. When the port happens:

- It is `harfbuzzjs` + **`woff2-encoder`** + a ~70-line ZIP reader. Not `wawoff2`: it
  produces byte-identical output but has been unmaintained since 2022 and fails
  deterministically when decompress and compress interleave (its issue #11, closed unfixed).
  `ttf2woff2` cannot encode CFF2 at all (0 bytes out). `woff2-encoder` also *decodes*, so
  the `.woff2` archive members stay usable as input.
- **It must carry its own post-condition**, and this episode is the argument: shape the
  source at the pinned location and the output at its default, through `harfbuzz.wasm`,
  and refuse to write if any advance differs; assert `head.xMin <= head.xMax` while there.
  That check is what found this, and a subset build that has regressed in this way would
  otherwise pass every other gate in the repository.
- There is no HarfBuzz-free JS route. Surveyed against the six requirements (read the
  release archives, *partial* instancing of both gvar and CFF2, subsetting that keeps
  GSUB/GPOS remapped, whole `name` table, WOFF2 out, `npm install` only): fontkit,
  opentype.js, fonteditor-core, samsa-core, lib-font, Typr, allsorts, skera/klippa,
  skeravar, slice-web, cn-font-split all fail partial instancing or layout retention or
  both, most by a wide margin and each verified in their source rather than their README.
  The only thing that meets all six is fontTools itself under Pyodide (`@web-alchemy/
  fonttools`, ~15 MB, pinned to a stale 4.56.0) --- CPython in WASM, which satisfies "no
  Python" as a technicality and nothing more.
- One workaround was proposed and **declined**: stop pinning `opsz` on Source Serif, keep
  the axis, and have `print.css` ask for `font-variation-settings: "opsz" 11`. It would
  sidestep the bug and cost ~70 KB in a PDF-only face, but it changes what the generator
  produces to suit a tool defect. Do not re-propose it; the pin stays. Switching Source
  Serif to the glyf `.ttf` cut its Desktop zip also ships is the same category and is
  declined for the same reason.

The probes are in the session scratchpad under `fonts/` (`probe-oracle.mjs` is the one that
matters; `cli/` holds the CLI-vs-WASM comparison, `fonts2/` the other-CFF2-fonts runs,
`research/` the preprocessor evaluator). They are not committed; the numbers above are.
