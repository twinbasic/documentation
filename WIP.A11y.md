# twinBASIC Documentation --- The Accessibility Scan

What the axe scan actually is, how its sample is chosen, and why tuning it is
dangerous. Split out of [WIP.md](WIP.md), which keeps the gate roster under [The
gates, and where their internals are](WIP.md#the-gates-and-where-their-internals-are).

`check.bat` runs [scripts/check_tree_fresh.mjs](scripts/check_tree_fresh.mjs),
which refuses a tree older than the sources that produced it, then
[scripts/check_dot_fit.mjs](scripts/check_dot_fit.mjs), then
[scripts/pick_a11y_sample.mjs --check](scripts/pick_a11y_sample.mjs) --- see
[Choosing the sample](#choosing-the-sample) --- and then
[scripts/check_a11y.mjs](scripts/check_a11y.mjs), which runs puppeteer +
axe-core over thirteen sample pages against WCAG 2.0/2.1/2.2 at Level A + AA
(plus the `heading-order` best-practice rule) and exits non-zero on any
violation.

What the scan *is* --- the page list, the viewports, the themes, the blocked
requests and the axe run options --- lives in
[scripts/lib/axe-scan.mjs](scripts/lib/axe-scan.mjs), shared with the
correctness gate and the measurement rig; `check_a11y.mjs` itself is only the
reporting front end. Note that all five WCAG tags --- `wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa`, `wcag22aa` --- must be listed: axe matches tags literally
with no version rollup, so a rule tagged only `wcag21aa` does **not** match
`wcag22aa`.

Four details of that script matter and are easy to break:

- It scans **`_site-offline/`, not `_site/`**. The online tree references its assets with root-absolute URLs (`/assets/css/…`), which resolve to nothing under `file://` — every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass. The offline tree uses relative asset paths and renders for real.
- It scans each page **in both themes and at two viewports** (`--theme`, `--viewport`). Dark mode is a separate stylesheet with its own palette, and defects such as horizontally scrolling code blocks only appear once the layout is narrow enough to overflow. The dark half is not a formality: the dark compilation re-emits every JTD base rule under `html[data-theme=dark]`, which raises its specificity from (0,0,1) to (0,1,2) -- so a root-level single-class rule in `custom/custom.scss` that overrides a bare element selector **applies in light mode and silently does not in dark**. That is exactly how the footnote-underline fix shipped half-broken, and only the dark pass caught it. Prefix such rules with `.main-content` to clear the bar.
- It injects a **patched** axe bundle. `SOURCE_PATCHES['plain-color-fields']` in `axe-scan.mjs` replaces `Color2`'s six WeakMap-emulated `#private` fields with plain own properties, worth **-26 %** across a realistic page set and **-30 %** on large pages. Patches need the unminified bundle, which costs ~6 ms more per page to inject. Two obligations come with it: every axe-core upgrade re-runs both `check_a11y_fingerprint.mjs --patches plain-color-fields` and `check_axe_patch_equiv.mjs` (CI and `test.bat` run the second for you), and if a result ever looks wrong, re-run with `--stock-axe` first -- that injects the unmodified bundle and says in one command whether the patch is implicated.
- It **blocks the search index** (`search-data.js` + `lunr.min.js`) via request interception — see `BLOCKED_REQUESTS`. Every page pulls in ~3.4 MB of index that never touches the DOM axe walks; loading it was 18.9 s of a 27.1 s run, and aborting it cuts the scan to ~9 s with byte-identical results (every rule id and node count, violations and incomplete alike, across every page/theme/viewport combination -- 24 of them when that was measured, 60 audits today). Do **not** extend the block list to `just-the-docs.js` — it installs the search combobox ARIA, and blocking it makes axe see *less* (colour-contrast nodes on `Select-Case` drop 54 → 2), silently masking coverage.

**A local pass on the geometry rules used not to be authoritative, and the reason is worth keeping in mind.** `target-size` measures rendered boxes, and an inline element's measured height is its font's content area --- so it moved with whatever `system-ui` resolved to. Measured at the mobile h3 size: Segoe UI 19px, Inter / Verdana / Tahoma 17px, Arial 16px, Liberation Sans / DejaVu Sans / Roboto 15px. A heading link topped up with `padding-block: 3px` therefore cleared the 24px floor by 0.8px on Windows and missed it on CI's Linux fonts, and the local scan reported a clean pass throughout.

[Self-hosting the text face](WIP.md#typography) pins that number at 17px on every machine, which is what closed the gap between a local pass and CI's. It does not licence trimming the paddings back: `font-display: swap` puts the first frames of every load on the fallback, and a reader whose font request fails stays there, so the 15--19px band is still the range a fix has to clear. Give a font-dependent measurement margin against the *smallest* of those numbers, prefer a rule that meets the floor on declared size where the layout allows one, and check the whole site for the rule rather than the sample --- one rule over every page at one viewport takes about two minutes.

**axe does not evaluate whether a focus ring is actually visible**, only that focusable things are reachable and labelled --- so a ring that is drawn and then clipped away passes every rule. The aux nav is where that matters. `.aux-nav` is `overflow-x: auto` (navigation.scss:182), and the overflow spec turns the other axis from `visible` to `auto` when one axis is not `visible`, so the nav is a scroll container that clips at its padding box on all four sides; its items are `height: 100%` and the first one starts at the left content edge. An outset ring on anything in there therefore loses every side that sits on the clip edge. The theme toggle shipped that way --- `.btn-reset`'s 2px ring at 2px offset survived only on the right, where the aux-nav link leaves room --- and a manual keyboard pass is what found it. The fix is an inset ring (`outline-offset: -2px` on `#theme-toggle`, in `custom/custom.scss`), which needs an id selector to out-rank the dark compilation's `html[data-theme=dark] .btn-reset:focus-visible` at (0,3,1).

The "twinBASIC Home" link next to it had the same defect, and this file used to say it did not -- that Chrome's UA `outline: auto` on it "renders in full". Measured at 1280x900 in both themes, the nav's box is top 0 / bottom 59 and the link's is identical, so the UA ring's `+1px` offset puts its top and bottom segments outside the clip box exactly as the toggle's did; only the left and right bars survive, because the link starts 50px inboard of the nav's left edge. It now takes an author ring at `outline-offset: -2px` too (`.aux-nav a.site-button:focus-visible`), with a dark-mode colour override -- the link is not a `.btn-reset`, so nothing in either compilation competes with it.

## Heading permalinks

The chain icon beside every heading is **deliberately `aria-hidden="true" tabindex="-1"`**, which looks like a defect and is not. It used to carry `aria-labelledby` pointing at its own enclosing heading, so Chrome computed its accessible name as the heading text verbatim: every heading turned up a second time in a screen reader's links list, named identically, with nothing marking it as a permalink. Over 7,000 of them across the site's 869 content pages -- 867 carry at least one -- and 172 on `tB/Gloss.html` alone. axe passed `link-name` throughout, because the rule asks whether a name exists, not whether it is worth announcing.

It stays a real `<a href>` so the mouse affordances that people actually use to copy these -- right-click Copy Link Address, middle-click, the status-bar URL preview -- are untouched. The keyboard and screen-reader equivalent is `renderSectionLinks` in [builder/template.mjs](builder/template.mjs): one `<details class="section-links">` per page, listing every heading. Since `e045ab5` it sits at the top of the page footer, immediately after `</main>` closes (`renderFooter` places it; see `template.mjs`), and it is omitted on a page with fewer than two headings -- 452 of the 1,159 built files lack it, 290 redirect stubs and 162 content pages. **A closed `<details>` subtree is `notRendered`** -- it contributes nothing to the accessibility tree and no tab stop beyond the `<summary>` -- so the whole feature costs one tab stop per page and expands on demand. Verified on the built tree: `Gloss.html` exposes 166 links closed and 338 open.

Two things about that placement are load-bearing:

- **It is emitted from the template, not from the markdown render.** The PDF book assembles its chapters from `page.renderedContent` ([book.mjs](builder/book.mjs)) and the search index reads the same field ([search.mjs](builder/search.mjs)); both are upstream of the template, so the block reaches neither and nothing has to be marked or stripped downstream. The same is true of the anchor icons themselves, and of `renderChildrenNav`. If a future page-level addition *does* need to reach the book, that is the field to put it in -- not a marker attribute.
- **`min-height` for target-size belongs to `.main-content summary`**, which is same-specificity and later in `custom/custom.scss`. A local `min-height` on `.section-links > summary` silently loses to it. And the summary keeps the UA's `display: list-item`: giving a `<summary>` `display: flex` makes Chrome drop the disclosure triangle, which is the only thing marking it as openable.

One caveat on how this was checked. axe excludes `aria-hidden` subtrees from rule evaluation wholesale, so the icon vanishing from `link-name` and `target-size` is axe seeing less, not the markup being better -- exactly the pattern the rest of this section warns about. What makes the change sound is that the element was confirmed gone from the accessibility tree (Chrome CDP: ignored, `ariaHiddenElement`) and from the tab order (real Tab presses), independently of what axe reports.

### State audits, and the hole they close

**A closed `<details>` is invisible to the scan.** Its subtree is `notRendered`, so axe never walks it -- the same property that makes the section-links disclosure cheap is what hides it. The construct went out on 707 pages with `target-size` violations on every link inside it (69.6x14 against a 24px floor) and `check.bat` reported a clean pass, because the state a reader sees after one click was never audited at all.

`STATE_AUDITS` in [scripts/lib/axe-scan.mjs](scripts/lib/axe-scan.mjs) closes that: entries layered onto the page x theme x viewport matrix that apply a DOM mutation from `PAGE_STATES` after navigation and before the audit. Two entries, each run across both themes and both viewports --- eight extra audits on top of the 52 the thirteen sample pages produce, for the 60 the scan reports.

Three things about it are load-bearing:

- **Every `PAGE_STATES` function must assert it found what it expected.** A state that silently no-ops degrades into a second audit of the default page: slower, still green, covering nothing. The `section-links-open` applier throws unless it finds exactly one disclosure holding at least two links, and returns the count so `check_a11y.mjs` can print what was actually exposed. Verified both ways -- it throws on a page with no disclosure and on one whose disclosure has been emptied.
- **The gate cannot vouch for this.** `check_a11y_fingerprint.mjs` compares a candidate against a baseline produced by that same scheme's element set, so a change to *which DOM is walked* is its documented blind spot. Adding elements is the safe direction, but it still has to be argued from source and demonstrated: the open audit walks 57 more nodes than the closed one, and with the fix reverted in-page it reports `target-size` x14 where the closed audit reports nothing. Run the A/A control (`--baseline production --candidate production`) after touching the matrix -- a nondeterministic state audit would surface there.
- **Item count buys nothing; pick the cheap host.** Menu/Window hosts it at 14 items and 0.41 s per audit rather than Pipeline-Stages at 72 and 1.28 s. The defect class is per-link geometry, identical for every item -- spacing between two consecutive items does not change with how many follow, and the long labels that make the big page look like the stress case only *wrap* at mobile, which makes a target taller and easier to pass. Both catch a reverted fix at both viewports.

`sweep_a11y.mjs` still audits every page closed only; the full-site sweep does not cover the open state.

Syntax-highlight token colours are kept above 4.5:1 automatically: [builder/highlight-theme.mjs](builder/highlight-theme.mjs) clamps any colour from the vendored `.theme` files that fails against the code-block background, moving lightness away from the background while preserving hue and saturation. The vendored themes stay faithful to the IDE; the emitted rule carries a `raised to 4.5:1` comment naming the original colour.

Requires `build.bat` to have produced an up-to-date `_site/`.

## Choosing the sample

The scan audits thirteen pages out of ~1,160, so its page list decides what it can report at all -- and a page list that stops being representative fails *silently*. That happened: the original six were picked by hand, the site grew around them, and by the time anyone measured, all six sat between 2,175 and 2,694 elements against a site maximum of 5,231 and not one carried a table, an image, a `<details>` widget or a video card. `image-alt`, the table rules and `scrollable-region-focusable` were all in the run options with nothing to run on, and the gate reported a clean pass.

A full-site sweep ([scripts/sweep_a11y.mjs](scripts/sweep_a11y.mjs) — every page, both themes, both viewports, 3,476 audits, ~20 min) settled what that pass had been hiding: **six violation classes on 54 pages**, every one of them in a construct the sample could not see. `scrollable-region-focusable` on 44 pages (table wrappers carried no `tabindex`), `link-in-text-block` on the footnote back-links, `target-size` on the FAQ's `<summary>` elements at the phone viewport, `heading-order` on five pages, `role-img-alt` on two unlabelled diagrams, and one `color-contrast` failure at 4.43:1 inside a Mermaid export (both Mermaid diagrams have since been redrawn as DOT). All fixed; the sweep is clean.

So the sample is derived rather than maintained by hand. [scripts/pick_a11y_sample.mjs](scripts/pick_a11y_sample.mjs) holds a list of **construct families** — markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on — and three modes:

- `--check` (the default, and what `check.bat` and both CI workflows run): every family the site uses is covered by at least one sample page, or exit 1 naming the gaps and the cheapest page that would close each. No browser, ~1 s.
- `--propose`: greedy set cover, seeded from the current `SAMPLE_PAGES`, so it prints what to *add*. `--fresh` ignores the current set and covers from scratch, which is how to ask whether the existing pages still earn their place.
- `--census`: what each family is, how many pages use it, which page uses it most.

Cost is part of the choice, not an afterthought: audit cost is super-linear in element count (k = 2.73), so the cheapest cover is not the smallest one, and `--propose` ranks candidates by measured per-page cost from the sweep's JSONL when one has been run. Measured across the full matrix, the thirteen-page sample costs 18.7 s of audit against 6.3 s for the original six -- 2.96x for a bit over twice the pages, because cost tracks element count super-linearly rather than page count. `Pipeline-Stages.html` alone is 26 % of it, and earns that as the site's largest and most table-dense page.

**When the docs start using a construct they have not used before** — a new admonition shape, a figure, a widget — add a family for it in `FAMILIES` and let `--check` say whether the sample already covers it. Leaving it out is not neutral: it means the rule for that construct never runs anywhere.

## Changing the scan

axe is the site's correctness oracle, which makes it a dangerous thing to tune: a change can make axe see *less* and still report a clean pass. This nearly happened once -- blocking `just-the-docs.js` during the scan looked like a 130 ms win and quietly dropped the colour-contrast node count on `Select-Case` from 54 to 2.

So any change to *what the scan runs* goes through [scripts/check_a11y_fingerprint.mjs](scripts/check_a11y_fingerprint.mjs) first. It runs the full page x theme x viewport matrix twice, once under each of two named configurations from the scheme registry in `axe-scan.mjs`, against one build in one process, and diffs the findings audit by audit -- violations by `ruleId:nodeCount`, incomplete by rule-id set.

```sh
node scripts/check_a11y_fingerprint.mjs --list
node scripts/check_a11y_fingerprint.mjs --candidate no-html
```

It has one blind spot worth knowing: it compares a candidate against a baseline produced by that same scheme's element set, so it cannot detect a change that stops auditing elements *entirely*. Anything touching which DOM is walked -- viewport, visibility, request blocking -- has to be argued from source instead.

One thing the gate structurally cannot catch: it compares *which* findings axe produces, never their shape. The `no-html` scheme passes the gate on every audit and would still crash the reporter, because `noHtml: true` makes `node.html` null and `check_a11y.mjs` calls `.slice()` on it. Treat the gate as necessary, not sufficient.

Cost attribution for the scan lives in [perf/ab-axe.mjs](perf/ab-axe.mjs), with [perf/probe-axe-dom.mjs](perf/probe-axe-dom.mjs) for DOM operation counts and [perf/probe-axe-scaling.mjs](perf/probe-axe-scaling.mjs) for the size curve. The investigation is [builder/PLAN-axe-perf.md](builder/PLAN-axe-perf.md), and it is **complete**. Its conclusion: one vendored source patch is worth **26 %** across a realistic page set and **30 %** on large pages -- `SOURCE_PATCHES['plain-color-fields']` in `axe-scan.mjs`, which replaces `Color2`'s WeakMap-emulated `#private` fields with plain properties. It is gated audit-by-audit by [check_a11y_fingerprint.mjs](scripts/check_a11y_fingerprint.mjs) and verified value-by-value by [check_axe_patch_equiv.mjs](scripts/check_axe_patch_equiv.mjs) -- both are needed, because the fingerprint gate compares `incomplete` as a rule-id set and would not notice a colour error that shifted ratios without flipping a pass/fail. The patch asserts an exact occurrence count at each substitution point, so an axe-core bump fails loudly rather than silently reverting. Three results are worth knowing before touching the scan:

- **Audit cost is super-linear in page size** -- `k = 2.73` on real pages, almost entirely inside `color-contrast`. The four largest pages in the site cost ~5.9x an average sample page each.
- **`SAMPLE_PAGES` used to contain only small pages** (2,175--2,694 elements, against a site maximum of 5,231) and none of the site's tables, images, disclosure widgets or video cards. Widening it -- see [Choosing the sample](#choosing-the-sample) -- found six violation classes on 54 pages, and cost 2.96x the audit time for 2.2x the pages, because cost tracks element count rather than page count.
- **Every axe-core upgrade needs the fingerprint gate run across it** -- axe ships new and revised WCAG rules between minors, and the source patches are pinned to the bundle's current text.
- **`ab-axe.mjs` cannot resolve an effect under ~20 %** -- its tracer overhead plus GC timing swamps the signal, and it has now mis-read a real ~10 % effect as noise twice (`plain-color-fields`, then `config-only`). Use [perf/ab-axe-pages.mjs](perf/ab-axe-pages.mjs) to decide anything modest, and run `--scheme production` as an A/A control before believing a small delta. `config-only` measures **-10.7 %** there against a **-0.4 %** A/A, and is declined anyway: `noHtml` and `selectors: false` remove the `html` and `target` fields that say which element failed.
