# twinBASIC Documentation --- Typography and Diagrams

Why the type system is built the way it is, and why every diagram is Graphviz
DOT measured with Inter's own widths. Split out of [WIP.md](WIP.md), which keeps
the three faces, the hard rules and the gate under
[Typography](WIP.md#typography).

Two neighbours: [WIP.Fonts.md](WIP.Fonts.md) is how the six subset `.woff2`
files are produced, and [WIP.A11y.md](WIP.A11y.md) is the scan that a change in
type metrics can move.

## Why this is not only a cosmetic change

An inline element's measured height is its font's content area, so WCAG 2.5.8
`target-size` results moved with whatever `system-ui` resolved to on the machine
running the scan --- measured at the mobile h3 size: 19px on Segoe UI, 17px on
Inter and Verdana, 16px on Arial, 15px on CI's Liberation Sans, all at the same
declared size. That is how the heading-link hit box shipped clearing the 24px
floor by 0.8px on Windows and missing it on CI. Pinning the face settles the
number at 17px everywhere.

It does **not** make the generous paddings unnecessary, and they must not be
trimmed back. `font-display: swap` means even a normal load spends its first
frames on the fallback, and a reader whose font request fails --- or who turns
webfonts off --- stays there. The rule that actually cannot be unsettled by a
font is one that meets the floor on *declared size*, which is what
`.footer-actions > *` does; prefer that shape where the layout allows it.

**Changing the face broke one `target-size` check, on one node of 869 pages ---
read it as a warning, not a one-off.** A footnote back-link is a bare inline
`<a>` holding a single U+21A9 with no padding, so its target is whatever box the
font gives that glyph: 12.09 x 19 on Segoe UI, 12.09 x 15 on Liberation Sans,
15.97 x 17 on Inter. **None of those has ever met 24 x 24.** It was passing on
axe's *spacing* exception --- a 24px circle centred on the target happened to
clear its neighbours --- and Inter's arrow is 3.9px wider, which moved the centre
far enough to intersect one. The fix sizes the link outright (`display:
inline-block; min-width/min-height: 24px`) rather than restoring the clearance.

Two things to take from it. **Run the full sweep after any change that moves
type metrics** --- the thirteen-page sample was clean through all of this, in
both themes and both viewports, and would have shipped the regression. And
**treat a target that passes only on the spacing exception as unfixed**: it is
a measurement standing on the font, the surrounding layout and the viewport at
once, and any of the three can move.

## Where the wiring lives

- [docs/_sass/custom/_fonts.scss](docs/_sass/custom/_fonts.scss) --- the
  `@font-face` rules (as a **mixin**, see below) and the `$tb-body-font-family`
  / `$tb-mono-font-family` stacks.
- [docs/assets/css/just-the-docs-combined.scss](docs/assets/css/just-the-docs-combined.scss)
  --- includes `fonts.emit-font-faces` and passes the stacks into JTD's
  `$body-font-family` / `$mono-font-family` through the `meta.load-css` `$with`
  map.
- [docs/_sass/modules-dark.scss](docs/_sass/modules-dark.scss) --- passes the
  same two stacks again. **This is not redundant.** The dark compilation
  re-emits every JTD base rule under `html[data-theme="dark"]`, which lifts
  `body { font-family: ... }` from (0,0,1) to (0,1,2); leave the dark side on
  the defaults and the site renders Inter in light mode and system fonts in
  dark. It is the same specificity trap `modules-dark.scss`'s own header warns
  about, and it is invisible unless you check both themes.
- [builder/template.mjs](builder/template.mjs) --- `fontPreloads()` emits the
  two `<link rel="preload">` tags. `crossorigin` is mandatory even same-origin:
  font fetches are always CORS-mode, and a preload whose mode does not match
  the later `@font-face` fetch is not reused, so the file downloads twice.
- [docs/assets/css/print.css](docs/assets/css/print.css) --- the book's own
  `@font-face` block and three stacks.
- [builder/pdf.mjs](builder/pdf.mjs) --- `REQUIRED_FONTS`, copied into the
  sparse `_site-pdf/` tree. Keep it in step with print.css's `@font-face` block.

Two rules that are easy to get wrong:

1. **`@font-face` is emitted exactly once, from the light compilation.** That is
   why `_fonts.scss` exposes a mixin rather than bare CSS: the dark entry point
   emits its whole payload twice, once per dark selector, and an `@font-face`
   nested inside a selector is invalid.
2. **`url()` in both stylesheets is relative (`../fonts/...`), never
   root-absolute.** The compiled CSS lands at `assets/css/` in all four trees,
   so a relative URL resolves identically online, in the `file://` offline
   mirror, in the `--baseurl` tree, and in the PDF source. A root-absolute path
   would depend on the offline rewrite catching it and would break under a base
   path.

## Diagrams

Inline SVG inherits the page's font environment, so the self-hosted faces apply
to diagram labels too --- `svg-inline.js` puts the SVG in the DOM rather than
behind an `<img src>`, which would isolate it from the document's `@font-face`
rules. The DOT sources --- `docs/assets/images/dot/` for shared diagrams,
`Images/` beside a page for one that belongs to it --- and `builder/gantt.mjs`
name the Inter stack directly.

**Every diagram is Graphviz DOT, and it measures with a font it has never seen.**
A committed export is only correct for the metrics the layout was computed with,
so the face and the geometry are coupled whatever the renderer.

The WASM build carries **no font machinery at all** --- zero occurrences of
pango, fontconfig, freetype or harfbuzz --- only the built-in width tables for
the core PostScript families, and `get_metrics_for_font_family()` falls back to
Times for anything else. So `fontname="Inter"` produced byte-identical geometry
to `fontname="NoSuchFontXYZ"` (194.00 against Helvetica's 208.00, Courier's
254.00). Times is far narrower than Inter through the lowercase --- `a` is 444
per 1000 em against 557 --- so every box came out about 11% too small.

That shipped. **Twenty-seven labels across the three DOT diagrams were painted
outside their boxes**, by up to 17.9 user units, and every label sat right of
centre; `toolchain-overview.svg` had the `s` of "book.html + CSS + images"
clipped by the box edge. It had been that way since the diagrams were written,
through the whole font migration, and nothing reported it: axe does not
evaluate SVG `<text>` geometry, so the full-site sweep passed over it.

[builder/dot-metrics.mjs](builder/dot-metrics.mjs) fixes the cause. See
[Teaching Graphviz what Inter measures](#teaching-graphviz-what-inter-measures)
below for the mechanism, and run the gate after touching any of it:

```sh
node scripts/check_dot_fit.mjs           # also runs inside check.bat
```

It renders every committed diagram with the real webface and fails if a label
sits outside the box Graphviz drew for it. With the metrics installed, the
worst off-centre across all five diagrams is 1.1 units; with them reverted, the
check reports the CEF diagram's three longest labels overflowing by 8.5 to 15.7
--- verified by writing a deliberately Times-measured SVG and watching it fail.

## Teaching Graphviz what Inter measures

`lib/common/textspan_lut.c` stores widths as:

```c
struct FontFamilyMetrics {
  const char **font_name;
  double units_per_em;
  short widths_regular[128], widths_bold[128],
        widths_italic[128], widths_bold_italic[128];
};
```

`applyInterMetrics()` overwrites the Times family's four arrays with Inter's
advances after `Graphviz.load()`. Three facts make that work, and each was
measured rather than assumed:

- **The table is reachable.** `_module.HEAPU8` exposes the module's 16.3 MB
  linear memory.
- **It is read on every layout, not cached.** Writing a new width for `A`
  moved the laid-out box for `AAAA` from 43.00 pt to 80.00 pt.
- **Inter already routes there.** The name lookup is permissive and falls back
  to Times, so patching Times is what makes `fontname="Inter"` correct. Nothing
  in the docs asks for Times; a diagram that did would now get Inter's metrics.

Widths are in the family's **own em units** (2048 for this table), not AFM
thousandths --- which is why a first search of the WASM for the AFM values
found nothing. `builder/inter-metrics.json` is in the same scale, generated by
`scripts/build_dot_metrics.mjs` from the committed webfonts, measured in a
browser rather than read out of the font binary: the browser's shaped advance
is the number we are trying to match.

Result across the site's diagram labels: **-11.4% mean / -18.0% worst becomes
+0.5% mean / +2.8% worst**. The residual is kerning, which a per-character
table cannot express, and it errs *wide* --- boxes come out slightly generous
rather than slightly tight, which is the safe direction.

**Why not recompile Graphviz instead.** Adding an `Inter` entry to
`all_font_metrics` upstream is tidier and is upstreamable, but it needs an
emscripten toolchain plus @hpcc-js's packaging, and `npm install` would stop
being enough to build the docs --- which is exactly what dot.mjs's
setup-failure path exists to preserve. A binary patch of the shipped `.wasm`
is no better: `Graphviz.load()` takes no arguments, so delivering one means
monkeypatching `WebAssembly.instantiate` or vendoring the 800 KB generated
loader. If the source route is ever taken, `inter-metrics.json` is already the
table it needs.

**It has to be idempotent, and that is not obvious.** `Graphviz.load()`
memoises its module, so serve.bat hands the same instance back on every
rebuild. A second unconditional patch searches a heap where Inter's widths are
already sitting in the Times slot, finds no signature, and fails --- reading
exactly like an upstream bump, which is the wrong place to go looking.
`applyInterMetrics()` keeps a `WeakSet` of patched instances and re-verifies
instead of re-writing. Three in-process rebuilds with a `.dot` edit between
each now come back clean; before the WeakSet, the second one threw.

**What will break it.** An `@hpcc-js/wasm-graphviz` bump that moves the table.
That is deliberate: `locateTimesFamily()` requires exactly one signature match
against the published Times AFM widths and spot-checks all four arrays, and
`assertMeasuresInter()` lays out a real string afterwards to prove the patch
took. On failure `regenerateDot` emits nothing and flips the exit code --- a
stale but correct SVG beats a freshly wrong one.

### Diagram scale on the web: never stretch a diagram up

`custom.scss` used to say `.svg-container svg { width: 100% }`, which stretched
every diagram to the column whatever its own size. Label size then became an
accident of how wide Graphviz happened to draw the thing --- measured against
16px body text in a 736px column:

| diagram | natural | rendered | label vs body |
|---------|--------:|---------:|--------------:|
| toolchain-overview | 636px | 736px | **1.16x** |
| pdf-render-pipeline | 767px | 736px | 0.96x |
| WebView2 Monaco | 981px | 736px | 0.75x |
| scheduler-dag | 1048px | 736px | 0.70x |
| CEF Monaco | 1259px | 736px | 0.58x |

A 2x spread with no typographic intent in it, and one diagram set larger than
the prose beside it. The rule is now `width: auto; max-width: 100%`.

**Natural size is the correct target, and not by luck.** Graphviz writes labels
at `fontsize=12` in a space where one user unit is one point, and sizes the root
`<svg width="NNNpt">` to match --- so at 1:1 a label is 12pt, which is 16px at
96dpi, which is the site's body size. `toolchain-overview` lands on exactly
1.00x, not approximately.

`max-width` still shrinks anything too wide for the column, and that scales
geometry and labels together, so wide diagrams stay small-but-aligned; the Zoom
control is what covers reading them. Nothing else moved: the four capped
diagrams are unchanged, the Gantt chart (which has no `width` attribute) does
not collapse, and at mobile every diagram is capped anyway so the rule is a
no-op there.

The lesson is the same one the print stylesheet had to learn, from the opposite
direction: **scale the whole SVG or nothing.** Stretching it up inflates the
labels; shrinking the text alone unmoors them from their boxes.

Once a diagram can be narrower than the column, it also has to be **centred**,
in both stylesheets: an `<svg>` is inline-level by default, so it would sit
against the left margin with the whole shortfall pooled on the right, which
reads as a layout mistake rather than as a small diagram. `display: block` plus
`margin-inline: auto` in `custom/custom.scss` and `print.css` does it, and is a
no-op for a diagram that reaches `max-width` --- there is no shortfall to
distribute. Measured on `toolchain-overview`: 636px in a 736px column, 50px of
gap each side, on screen and on the printed page alike.

### The PDF used to shrink diagram labels out from under their boxes

`print.css` carried `.svg-container text { font-size: 75%; }`, added to stop
diagram labels dominating the page. It is gone, and it must not come back.

It was the width-table defect arriving from the stylesheet instead. Graphviz
sizes each box to the text it measured and positions the label with
`text-anchor="start"` at an x computed for that size, so shrinking only the
text leaves it undersized *and* left of centre in a box that did not move.
Measured across the book's five diagrams: **worst off-centre 15.6px with the
rule, 1.4px without**.

It was also unnecessary. `max-width: 100%` scales any diagram wider than the
170mm text column down to fit, and that scales its labels too --- which is
four of the five. Label size against 10.5pt body text, with the rule removed:

| diagram | natural width | label | vs body |
|---------|--------------:|------:|--------:|
| CEF Monaco | 944pt | 6.1pt | 0.58x |
| WebView2 Monaco | 736pt | 7.9pt | 0.75x |
| scheduler-dag | 786pt | 7.4pt | 0.70x |
| pdf-render-pipeline | 575pt | 10.1pt | 0.96x |
| toolchain-overview | 477pt | 12.0pt | 1.14x |

Only `toolchain-overview` sits above body size, because at 477pt it is the one
diagram that fits the column at natural size. The rule bought that single case
1.14x -> 1.00x and paid for it with the worst misalignment in the book.

**A diagram that needs to be smaller in print is scaled whole, never by its
text alone** --- and one does, for a reason worth keeping straight.

Graphviz authors labels at 12pt. On the web that *is* the 16px body size, so a
diagram at natural size matches the prose beside it for nothing. The book sets
body text at 10.5pt, so the same diagram comes out at **1.14x the prose**. It
only affects `toolchain-overview`, the one diagram narrow enough (477pt) to
render at natural size in the 170mm column; the other four are already scaled
down to fit and land below body size on their own.

`print.css` closes it with `zoom: 0.875`, which is 10.5/12 exactly:

| diagram | as it was | with `zoom` | with `max-width: 87.5%` |
|---------|----------:|------------:|------------------------:|
| toolchain-overview | 1.14x | **1.00x** | 1.01x |
| pdf-render-pipeline | 0.96x | unchanged | 0.84x |
| WebView2 Monaco | 0.75x | unchanged | 0.65x |
| scheduler-dag | 0.70x | unchanged | 0.61x |
| CEF Monaco | 0.58x | unchanged | 0.51x |

**`zoom`, not `max-width` and not `transform`.** A `max-width` percentage is
relative to the column, so it shrinks the four diagrams that were already
correct. `transform` does not change the layout box, so paged.js would break
pages around space the diagram no longer occupies. `zoom` scales geometry and
labels together, relative to the diagram's own size, and does change the
layout box. The four wide diagrams are untouched by it because they are wider
than the column either way, so `max-width: 100%` still decides their size.

## Diagram labels that sit on the page background

Graphviz emits `<text>` with no `fill` attribute, so it inherits SVG's initial
black. For a node label that is right: those sit on the diagrams' light amber
fill in both themes. A **cluster label and an edge label sit on the page
background**, and black on the dark theme's background measures **1.40:1**.

This was also shipping unreported, for the same reason as the overflow: axe's
colour-contrast rule does not evaluate SVG text. `custom/custom.scss` now gives
`g.cluster > text` and `g.edge > text` `fill: currentColor`, which tracks the
body text colour without hardcoding either palette --- the same thing
`admonitions.scss` does for its icons. Scoped to **direct** children, because
node text must keep the dark ink its own light fill needs. Measured after:
15.02:1 light, 11.66:1 dark, against 19.59:1 for the node labels in both.

Do not widen that selector to all `text`. The node labels would go light on a
light fill in dark mode, which is the same defect with the themes swapped.

## Diagram exports carry their own font

The four buttons above each inlined diagram (Download / Copy, SVG / PNG) all
route through `serializeWithFonts` in
[docs/assets/js/svg-inline.js](docs/assets/js/svg-inline.js), which embeds the
faces the diagram paints with as `data:` URIs in an inline `@font-face`.

This is necessary because **an exported diagram is cut off from the page's
`@font-face` rules**. An SVG handed to `new Image()` renders in the browser's
"secure static mode", which fetches no external resource at all, and a
downloaded `.svg` opened somewhere else has no access to this site's
stylesheet either. Both fall back to whatever the viewer has installed.
Measured on a machine with no local Inter: an exported PNG asking for
`font-family="Inter"` rasterised *pixel-identical* to one asking for a font
that does not exist --- same ink count, same extent.

A `data:` URI is not an external fetch, so secure static mode permits it, and
the bytes come from the HTTP cache because the page already downloaded them.
The whole thing costs ~25 ms per click and nothing over the wire. Two details
are load-bearing:

- **Only the faces the diagram actually uses are embedded**, decided from the
  live element's computed styles rather than from the markup. Every diagram
  needs Inter roman; the two Monaco ones also carry italic label text, and that
  is a second 203 KB. An export runs ~243 KB roman-only, ~449 KB with italic.
- **Font paths resolve against the script's own URL**
  (`document.currentScript.src`), not a hard-coded root-absolute path, which
  is what makes them work unchanged in the offline mirror and under a
  `--baseurl` deployment. In the offline mirror `fetch()` cannot read a
  `file://` URL at all, so the embed silently degrades to the old behaviour;
  that is the one context where an export still uses the viewer's fonts.

### PNG export, and the constraint that decided the diagram format

**Never adopt a diagram tool that emits HTML-in-SVG.** Chromium taints a canvas
that has had an SVG containing `<foreignObject>` drawn into it, and a tainted
canvas refuses `toBlob()` with a `SecurityError` --- so *Download PNG* and *Copy
PNG* cannot work on such a diagram at all, and the throw lands inside an
`img.onload` handler where nothing surfaces it, so the click just appears to do
nothing. Graphviz emits plain `<text>`, which is why all four buttons work on all
five diagrams. This is a property of the *format*, not of the export code, and it
is what decided the format.

Mermaid was the tool this was measured on, and **the obvious workaround does not
work**: `flowchart: { htmlLabels: false }` moves only the edge labels to `<text>`
and keeps node labels in `foreignObject` regardless, tested against Mermaid 11.
It is no longer wired up --- no dependency, no script emitted, only
`code.language-mermaid` rules left in the vendored theme CSS --- so a `mermaid`
fence renders as a code block today.

Measured through the real export path, all five rasterise: 65--403 KB per PNG,
and 6.4--13.6% more ink than the same SVG with the `@font-face` stripped, which
is what says the embedded Inter is being used rather than a fallback.

The failure path stays, because it is still reachable --- a hand-authored SVG
could reintroduce `foreignObject`: it is caught, logged, and announced through
a `role="status"` live region naming *Download SVG* as the alternative.

Driving the real buttons turned up one more silence of the same kind: the
`copy-png` branch called `navigator.clipboard.write()` with no `.catch()`,
unlike `copy-svg` beside it, so an unfocused document or a denied permission
rejected into nothing and the click looked like it had worked. It now reports
through the same live region.

## The PDF, and two things the book pipeline does differently

**The forked paged.js asserts that fonts have settled** before the page-breaking
pass, and it used to reject any face not in state `loaded`. A CSS-connected
`FontFace` is only fetched when the layout demands one, so a face print.css
declares but a given render never exercises --- Cascadia Mono Italic, when no
code sample is italicised --- sits at `unloaded` forever and tripped it. The
assertion now rejects `loading` and `error` only; see `loadFonts()` in
[book/lib/paged.browser.js](book/lib/paged.browser.js).

**The book's fallback chains are self-hosted all the way down.** `Source Serif 4,
Inter, Georgia, ...` rather than dropping straight to a system serif, and
`"Cascadia Mono", monospace` with no named local face. The book is rendered once,
on one machine, so a named local fallback bakes *that machine's* fonts into the
artifact.

Checking which fonts the PDF *actually embedded* is what found the remaining
gaps, and it found two the CSS review had not:

- Source Serif 4 covers 603 of the codepoints this book uses against Inter's
  1103, so dropping straight from it to a system serif pulled a Times New Roman
  subset in for seven footnote back-arrows and four U+2194. Putting Inter second
  in the chain fixed it.
- normalize.scss puts `pre`, `code`, `kbd` and `samp` on generic `monospace` and
  JTD overrides only `code`; print.css loads no normalize but the UA default is
  the same. Eleven pages use `<kbd>`, and every one of them was setting keys in
  whatever the machine called `monospace` --- Consolas here. Fixed in both
  stylesheets; `samp` is included although nothing uses it yet.

What is left in 1,991 pages is three glyphs: a clock emoji, and the U+2714 and
U+22EE that [Authoring](docs/Documentation/Authoring.md) prints as examples of
characters the subsets do not carry. Those two are deliberate and the page says
so --- but they are why a font census of the book reports a Segoe UI Symbol and a
Cambria Math subset, which is otherwise a mystery worth an hour.

To check what a built PDF actually embedded:

```sh
node -e "const z=require('zlib'),f=require('fs'),b=f.readFileSync('docs/_pdf/twinBASIC Book.pdf'),s=b.toString('latin1'),h={},a=t=>{for(const m of t.matchAll(/\/(BaseFont|FontFamily)\s*(?:\/|\()([\w+\-,. ]+)/g))h[m[2]]=(h[m[2]]||0)+1};a(s);for(const m of s.matchAll(/stream\r?\n/g)){const i=m.index+m[0].length,e=s.indexOf('endstream',i);try{a(z.inflateSync(b.subarray(i,e)).toString('latin1'))}catch{}}console.log(h)"
```

## The offline tree drops the preloads

A font preload is a CORS-mode fetch. Under `file://` there is no origin to
match, so Chrome fails it with `ERR_FAILED` and logs it, while the `@font-face`
fetch beside it succeeds and the faces load anyway. The preload therefore buys
an offline reader nothing and costs two red lines in the console, so
`stripFontPreloads` in [builder/offline-rewrite.mjs](builder/offline-rewrite.mjs)
removes it from that tree only.
