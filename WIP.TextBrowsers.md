# Text browsers — the plan

The site should read well in a browser with no CSS and no JavaScript. A survey with lynx,
w3m, links and ELinks found the page text fine and five problems in the page furniture:

1. A picture in two themes prints its description twice.
2. Controls that only work with JavaScript are in the HTML (figure buttons, copy buttons, nav
   expanders, theme toggle, search box).
3. An inline Graphviz diagram prints its labels as run-on words.
4. The footer links run together.
5. Nothing checks any of this.

Item 1 has been investigated and nothing has been built: the owner paused the work on
2026-11-17, with the recommendation below not yet approved. Items 2 to 5 have been surveyed but
not decided or built, in [Items 2 to 5](#items-2-to-5).

## The benchmark (owner)

**w3m 0.5.3, plus whichever text browser exposes a given problem** (owner, 2026-11-17). For
pictures that is w3m and lynx. lynx is also the one that exposes item 2: it prints `(BUTTON)` for
each icon-only button in a figure's bar, where w3m prints nothing.

lynx 2.9.0, w3m 0.5.3, links2 2.29 and elinks 0.16 are installed in WSL `Ubuntu-24.04`. Serve
the built tree from inside WSL (`python3 -m http.server <port> --bind 127.0.0.1`, run in
`docs/_site` as a `/mnt/<drive>/…` path) and dump a page with:

- `w3m -dump -cols 100 -O UTF-8 <url>`
- `lynx -dump -width=100 -nolist -display_charset=utf-8 <url>`
- `links2 -dump -width 100 -codepage utf-8 <url>`

From Git Bash, set `MSYS_NO_PATHCONV=1` before calling `wsl`. Put the commands in a script file
and run it with `wsl -d Ubuntu-24.04 -e sh <script>`, since `$var` inside `wsl -- bash -lc '…'`
is expanded by the wrong shell. A local HTML file can also be dumped by its path, with no server.

## What the text browsers print today

`themePairPlugin` writes a picture in two themes as two `<img>` with the same `alt`
([WIP.Build.md](WIP.Build.md#pictures-in-two-themes)). A text browser ignores the CSS that
hides one of them, so it prints both descriptions:

- w3m and links glue the two copies together: `…toggle button highlightedThe Project Explorer
  title bar…`.
- lynx separates the two copies with a space.

## How each browser prints an `<img>`

Measured with each browser's defaults and no configuration file. `[basename]` is the file name
without its extension. Here that is often a GUID, e.g. `[b000d3aa-3689-4d94-88e3-bca44f8b7de6]`.

| The `<img>` has | w3m | lynx | links2 | elinks |
|---|---|---|---|---|
| `alt="X"` | X | X | X | `[n]`X |
| `alt=""` | `[basename]` | nothing | nothing | nothing |
| `alt=" "` | a space | a space | nothing | a space |
| no `alt` | `[basename]` | `[file.ext]` | nothing | nothing |
| `srcset` and no `src`, `alt="X"` | nothing | X | X | X |
| `srcset` and no `src`, `alt=""` | nothing | nothing | nothing | nothing |
| the `hidden` attribute | ignored | ignored | ignored | ignored |
| `alt` of U+200B or U+2060 | the raw character | the raw character | the raw character | garbled |

w3m prints `[basename]` for an empty alt because its `ignore_null_img_alt` option is on by
default. It skips any `<img>` that has no `src`. lynx skips only an empty or blank alt.

So the second `<img>` of a pair prints nothing in both w3m and lynx only in two forms:
**`alt=""` with no `src`** (the picture's URL in `srcset`), or **`alt=" "`**. In the dark theme
that image is the one shown, so it still needs a name for a screen reader, and in both forms the
name has to come from ARIA.

Two rules bear on this:

- **An `<img>` with only `srcset` is valid.** The HTML standard says "At least one of the src and
  srcset attributes must be present."
- **An `alt=""` image may carry no ARIA.** ARIA in HTML allows "No aria-* attributes except
  aria-hidden="true"" on it.

## Candidates and results

Each candidate changes only the dark `<img>` of each pair, except B, R2 and today's markup. A
cell shows the result in all four theme modes: light stored, dark stored, and system with each
OS scheme.

| | Markup | w3m | lynx | Named images per picture | Other theme fetched | Site's a11y gate | Other axe rules | Valid HTML/ARIA | Layout |
|---|---|---|---|---|---|---|---|---|---|
| Today | two `<img>`, same alt | twice | twice | 1 | never | pass | pass | yes | — |
| A | dark: `alt="" aria-label="X"` | once, then `[basename]` | once | 1 | never | pass | `presentation-role-conflict` on every dark picture | no (ARIA on `alt=""`) | not measured |
| B | both `alt=""`, one `.sr-only` X | `[basename][basename]`X | once | 0 (text only) | never | pass | pass | yes | not measured |
| W | dark: `alt=" " aria-label="X"` | once | once | 1 | never | **fails `image-alt`** in dark | — | yes | not measured |
| L | dark: `alt="" aria-labelledby=<light>` | as A | as A | 1 | never | pass | as A | as A | not measured |
| A2 | dark: `srcset`, no `src`, `alt="" aria-label="X"` | once | once | 1 | never | pass | as A | as A | the bar drops its SVG group in dark (below) |
| **R1** | dark: `<span class="pic-dark" role="img" aria-label="X"><img srcset alt=""></span>` | once | once | 1 | never | pass | pass | yes | same |
| R2 | both in one `<span role="img" aria-label="X">`; light as today, dark `srcset`, `alt=""` | once | once | 1 | never | pass | pass | yes | same |

How it was measured:

- **Pages:** `Features/Compiler-IDE/IDE-Features.html` (5 pairs), `FAQ.html` (9 pairs, in
  `<details>`) and `Documentation/Development/Building.html` (6 pairs).
- **Accessibility tree:** Chrome through puppeteer 25, `page.accessibility.snapshot()`.
- **axe:** axe-core 4.13, once with the gate's options (`AXE_RUN_OPTIONS`) and once with
  `presentation-role-conflict`, `image-alt`, `role-img-alt`, `image-redundant-alt`,
  `aria-allowed-attr`, `aria-prohibited-attr` and `aria-allowed-role`.
- **Fetches:** no candidate fetched any of the other theme's pictures. Every shown picture was
  confirmed fetched for today's markup, A2, R1 and R2 on all three pages, and for A, B, W and
  L on IDE-Features only.
- **Layout:** for R1 and R2, each figure's, container's and shown image's box was identical to
  today's in both themes. A2 differs as described below.

**A2's figure bar** in the dark theme was 94 px narrower. `figure.js` reads `img.src` to decide
which formats the bar offers, and `src` is empty on a `srcset`-only image, so the vector group
was hidden. Any candidate without `src` needs `currentSrc` there.

**Not measured:** Firefox, Safari and real screen readers. A, L and A2 work in Chrome because
Chrome applies ARIA's conflict resolution to the implicit presentational role of `alt=""`
images: a global ARIA attribute overrides it. That was not checked in the other engines.

## Recommendation: R1 (not yet approved)

Only two forms of the second image are silent in both w3m and lynx: no `src` with `alt=""`, or
`alt=" "`.

- **`alt=" "` fails the gate.** axe's `image-alt` (WCAG A, part of `check.bat`) fails any alt made
  only of whitespace (`alt-space-value`, `/^\s+$/`), even when `aria-label` names the image.
- **The ARIA name then has to go somewhere.** Put it on the `<img>` itself (A2) and it breaks ARIA
  in HTML and fails `presentation-role-conflict`. It also relies on the conflict resolution that
  was checked only in Chrome. Put it on a `role="img"` wrapper and it is plain ARIA that every
  engine supports, valid as written.

R1 over R2:

- **The light `<img>` stays as it is today.** The book's `lightOnly` still only has to delete the
  dark element.
- **R2's one advantage isn't needed.** Its name holds even with the CSS missing, but the hidden
  image is already out of the accessibility tree under the stylesheet that hides it.

## What building R1 takes

- **`themePairPlugin`**
  ([builder/render.mjs](builder/render.mjs)): write the dark image as `<span class="pic-dark"
  role="img" aria-label="ALT"><img srcset="URL" alt="" …></span>`, with the class moved from
  the `<img>` to the span. Do it in a renderer rule, not in the token stream, so the figure
  rule still sees two image tokens. `aria-label` is the alt as the renderer computes it
  (`renderInlineAsText` of the image's children), escaped.
- **`lightOnly`** ([builder/theme-pictures.mjs](builder/theme-pictures.mjs)): delete the span
  with its image, not a dark `<img>`. The book's light `<img>` keeps its alt as today.
- **`pngPictures`**: rewrite `srcset` as well as `src` and `href`.
- **`HTML_COMBINED_RE`** ([builder/offline-rewrite.mjs](builder/offline-rewrite.mjs)): add
  `srcset` beside `href|src`. A `srcset` written here holds one URL with no descriptor. A URL
  that ends in a comma would be misread, since a comma is not percent-encoded.
- **`figure.js`**: in `shownImage`, take the laid-out image among `.fig-container img`
  (`getClientRects().length`). The dark `<img>`'s own computed `display` is not `none` when only
  its span is hidden. In `sources`, read `img.currentSrc || img.src`.
- **`custom.scss`**: in zoom, the span is the flex item, so `.fig-container[data-zoomed] > img`
  needs a counterpart for `> .pic-dark`. Never give the span a `display`: one such rule outranks
  the theme's `display: none` (specificity (0,3,0) against (0,2,1)) and shows both pictures.
- **Already fine:**
  - `link-check.mjs` follows `srcset`. `scripts/crawl_check.mjs` does not, a known gap.
  - `gotoPage` in `scripts/lib/axe-scan.mjs` waits only for images that are laid out.
  - `shot-freeze.mjs` reads `currentSrc`.
- **Tests and notes:**
  - `test/render.test.mjs` (the `themePairPlugin and lightOnly` blocks).
  - The "Pictures in two themes" rule in [WIP.Build.md](WIP.Build.md).
  - Row 12 of `docs/Documentation/Pipeline-Stages.md`, which describes the markup.
- **Gates:** `build.bat && check.bat && test.bat`, and `node scripts/compare_trees.mjs`, whose
  output should differ only in the picture markup.

`figure.js` and the figure CSS are also what item 2 changes, so whichever lands second rebases
on the other.

## A link to a picture

`themePairPlugin` pairs a link to a picture the same way (the "Full size" link it was written
for). The built site has no such link today (0 on 2026-11-17), but one prints twice in all four
browsers: `Full sizeFull size`.

- **A link with text:** the dark link needs no text of its own, only `aria-label`. That printed
  once in all four browsers. Its visible text would then have to come from CSS, e.g. `content:
  attr(aria-label)` on `:empty::before`. This is neither built nor decided.
- **A link around a paired image:** nothing more is needed. Its dark copy holds only the silent
  dark image, and the link takes its name from the span.

## Redoing the measurements

The scripts lived in a session's scratch directory and were not kept. This is enough to write
them again:

- **Serve and rewrite:** serve `docs/_site` from Node and rewrite each pair per candidate on the
  fly. Use a fresh browser context per mode.
- **Theme modes:** set `localStorage` `theme` for a stored theme, and
  `emulateMediaFeatures([{ name: "prefers-color-scheme" }])` for the OS scheme.
- **Before measuring:** open every `<details>`. Scroll each laid-out picture into view and wait
  until it is `complete`, then 800 ms more.
- **What to record:**
  - the image nodes named as each alt in the accessibility snapshot;
  - the requests, by decoded path;
  - axe, as listed above;
  - each figure's boxes from `getBoundingClientRect`.

Three things that misled the first runs:

- **A closed `<details>` hides its pictures** from both the accessibility tree and the network.
- **Lazy loads were counted too early.** Building's pictures are about 19,000 px down the page,
  and a fixed-step scroll took the count before their loads were issued.
- **Screenshot bytes of the same markup differ between runs** (3 to 6 of 6 figures equal), so
  compare geometry, not screenshots.

## Items 2 to 5

Surveyed on 2026-11-16, before the owner chose the benchmark. The survey dumped these pages of
`docs/_site` in all four browsers: `index.html`, `tB/Modules/Strings/Left.html`,
`Features/Compiler-IDE/IDE-Features.html`, `Documentation/Development/index.html`,
`Downloads.html`, `Videos.html`, `nav.html` and `FAQ.html`. Nothing is decided or built for any
of these items.

### What is already fine

- **The page text:** headings, paragraphs, lists, definition lists, code blocks and the
  breadcrumb. A callout's title prints as a line of its own (`Note`).
- **Tables:** w3m and links2 draw them as tables. lynx runs a row's cells together. That is how
  lynx works, and there is nothing to fix.
- **The skip link** prints first.
- **The nav** is a plain nested list. On a reference page it takes about 60 lines before the
  content. Its Contents link goes to `/nav.html`, which needs no JavaScript.
- **The icon sprite's `<symbol><title>` text** prints in none of the four browsers. An SVG
  `<title>` is skipped wherever it is (see item 3).
- **lynx prints `#alternate` at the top of every page.** That is the page's `<link
  rel="alternate">` to its markdown copy, which lynx offers as a link. It is harmless.
- **ELinks 0.16 applied none of the site's CSS that hides things.** It shows the same problems as
  the others and adds nothing.

### Item 2: controls that need JavaScript

The build writes each of these into the HTML, and each does nothing without its script:

| Control | Written by | Operated by | lynx | w3m |
|---|---|---|---|---|
| menu button, `#menu-button` | `builder/template.mjs` | `just-the-docs.js` | `(BUTTON)` | nothing |
| nav expander, `.nav-list-expander`, one per branch | `template.mjs` | `just-the-docs.js`, `nav-tree.js` | `(BUTTON)` each | nothing |
| search box, `#search-input` | `template.mjs` | `just-the-docs.js` | `____________________` | `[                    ]` |
| theme toggle, `#theme-toggle` | `template.mjs`, with `hidden` | `theme-toggle.js`, which clears `hidden` | `(BUTTON)` | an empty list item, `•` |
| copy button, `.copy-code`, one per code block | `builder/highlight.mjs` | `just-the-docs.js` | `(BUTTON)` | nothing |
| figure bar, `.fig-controls` | `builder/render.mjs` | `docs/assets/js/figure.js` | `(BUTTON)` for each button, in a row before the picture | nothing |

`just-the-docs.js` is the vendored copy under `builder/vendor/just-the-docs/assets/js/`.

- **The fix that clears both browsers:** each script creates the controls it operates, so the
  HTML holds none of them.
- **`hidden` does not help.** Every text browser ignores it (see the image table above).
- **The nav expanders and the menu button change the layout.** Their script must add them before
  first paint, or the nav moves when they appear.
- **Not `<a download>`.** Making the figure's download buttons into such links would make them
  work without JavaScript, but it would put their text into both browsers' output.

`figure.js` and the figure CSS are also what item 1's R1 changes.

### Item 3: inline diagrams

An inline Graphviz diagram (`builder/inline-diagram.mjs`) prints its node and cluster labels in
source order, as one run of words. On 2026-11-16 the pages with one (`class="graph"` in the
built HTML) were:

- `Documentation/Development/index`
- `Builder`
- `PDF-Generation`
- `Tools`
- `Tutorials/CEF/Driving-Monaco`

From the first of those:

```
docs/ source tree *.md + _config.yml + _book.yml serve.bat _serve/ local web browser build.bat
tbdocs.mjs _site/ online HTML _site-offline/ file:// mirror ...
```

ELinks also numbers the boxes that link as links.

A small test page, dumped in w3m, lynx and links2, showed:

- **SVG `<text>` prints whatever the `<svg>` carries.** `aria-hidden="true"`, `role="img"` with
  `aria-label`, and `hidden` each change nothing.
- **An SVG's `<title>` prints in none of the three. Its `<desc>` prints.**
- **`<text>` elements with no whitespace between them glue together** (`OneTwo`). Graphviz's
  output has a line break between elements, so its labels come out separated by spaces.
- **`<object data="x.svg">` prints its fallback content** in w3m and lynx, and nothing in links2.

So no markup keeps an inline diagram's labels out of a text browser. The choices, which need the
owner's decision:

- **Accept the run of words.**
- **Put a text version beside the diagram**, a caption or a list. A text browser then prints it,
  followed by the run of words.
- **Stop inlining the diagram**: an `<img>` or `<object>` with a text alternative. That loses the
  linked boxes and the `currentColor` theming that inlining is for.

### Item 4: runs and repeats

Things that only CSS keeps apart print as one run:

- **The footer's actions**, `.footer-actions` in `renderFooterCustom()` (`builder/template.mjs`):
  `<a>`s in a `<div>`, printed as `Back to top Edit this page on GitHub Read Offline`.
- **The footer's legal line**, `.footer-legal`: `<span>`s, printed as `License: CC-BY-4.0 Code
  license: MIT Attribution: VBA-Docs`.
- **A download card's buttons**, `.download-actions` in `docs/Downloads/index.md`, printed as
  `impexp.mjs 49 KB impexp.py 51 KB impexp.twinproj 121 KB Documentation for impexp`.
- **Two images with no whitespace between them**, which glue together in w3m and links2. Item 1's
  `…highlightedThe Project…` is one.

There are two ways to fix a run:

- make it a list (`<ul>`) that the CSS lays out in a row;
- put a separator in the markup and have the CSS hide it.

"twinBASIC Home" also prints twice on every page: once from the sidebar's external links
(`nav_external_links`) and once from the header's aux nav (`aux_links`).

### Item 5: a check

Only w3m and lynx are needed. Run `w3m -dump` and `lynx -dump` over the pages the accessibility
check samples (`scripts/pick_a11y_sample.mjs`), and flag each problem in the browser that shows
it:

- a picture's description printed twice, in either browser;
- `(BUTTON)`, in lynx;
- in w3m:
  - an empty list item;
  - an empty input, `[   ]`;
  - a `[basename]` from an image with an empty alt or none;
- a diagram's run of labels, in either browser. Until item 3 is decided, report only how many
  there are.

**Where it can run is open:**

- **Not `check.bat`.** The browsers are not on npm.
- **CI could install them.** Both workflows run on `ubuntu-latest`, where `apt-get install w3m
  lynx` is cheap.
- **But `check_ci_workflows.mjs` requires CI to run exactly the wrappers' gates.** A gate that
  runs only in CI needs that rule widened.
- **Otherwise it stays a tool run by hand**, like `sweep_a11y.mjs`, through WSL on the dev box.

### A browser with CSS but no JavaScript

Dillo and NetSurf were not installed. The survey stood in for them with headless Chrome through
puppeteer, JavaScript off, at 1280×900, on `Left` and `IDE-Features`:

- The page looks as it does with JavaScript, and the theme follows the OS.
- The search box, the nav arrows and the figure bar are drawn, and do nothing.

The benchmark is text browsers, but item 2's fix (each script creates its controls) clears this
case too.
