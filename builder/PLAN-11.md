# PLAN-11: Phase 11 — PARITY UPDATE (output-changing follow-ups)

The parity-update phase. Read this together with [PLAN.md](PLAN.md)
(architecture overview), [PLAN-10.md](PLAN-10.md) (the cutover that
unblocks Phase 11), and [FUTURE-WORK.md](FUTURE-WORK.md) §B (the
backlog of output-changing items routed here) and §D (the sequencing
notes captured during the Phase 9 → 10/11 split planning that this
plan expands).

Phase 11 has one job: **land every output-changing FUTURE-WORK item
that the byte-vs-Jekyll discipline of Phases 3-9 had deferred**.
After Phase 10 retired `accepted-divergences.mjs` and the eight
`verify-phase{1..8}.mjs` harnesses, the cost of an intentional
divergence dropped to zero -- the new acceptance bar is the expanded
`scripts/check_links.mjs` integrity checker plus a manual spot of
the rendered chrome. Phase 11 walks the five remaining items in
[FUTURE-WORK.md §B](FUTURE-WORK.md) that are still routed here:

| Item | Subject | Headline change |
|---|---|---|
| B2 | Shiki theme generated from upstream `.theme` source files | Drops the ~470-line Rouge-class indirection in [highlight.mjs](highlight.mjs); regenerates the syntax-highlight stylesheet from upstream and changes per-span class names from Rouge tokens (`k`, `s`, `mi`) to a colour-palette scheme (`c1`, `c2`, …). |
| B1 | Mermaid `.mmd` → `.svg` automation | Adds a `mermaid.mjs` preprocessor invoking `mmdc`; the source `.mmd` becomes the canonical input. |
| B5 | Server-side copy-code button | Injects `<button class="copy">` into each `<pre>` in [highlight.mjs](highlight.mjs); shrinks `just-the-docs.js` by retiring the client-side injection path. |
| B10 | `search-data.js` minification | Strips whitespace + redundant keys from the search index; ~2.8 MB → ~1.7 MB. |
| B11 | AST-based `just-the-docs.js` patching | Replaces the offline-pass regex patches with an `acorn` AST rewrite that survives cosmetic upstream just-the-docs edits. |

What Phase 11 does NOT do:

- Revisit Phase 10. The cutover commits (1-6) and the deferred
  Jekyll source set deletion (commit 7) are independent of Phase
  11. If commit 7 hasn't run yet when Phase 11 starts, that's fine
  -- Phase 11 doesn't touch `docs/_plugins/`, `docs/_includes/`,
  `docs/_layouts/`, `docs/_sass/`, or `docs/Gemfile`. The single
  intersection is `scripts/extract_theme_colors.py` (and its
  `scripts/themes/*.css` outputs), which B2 retires; see
  [§7.D2](#71-decision-record) for why that deletion is part of
  B2's PR rather than commit 7.
- Land all five items in one PR. Per [FUTURE-WORK.md §D5](FUTURE-WORK.md)
  the items get **one PR each**. B2 is large enough to deserve its
  own review window; the other four are clean independent commits
  whose per-item revert path stays simple when bundled separately.
- Add a Phase 11 verify harness. Per [FUTURE-WORK.md §D2](FUTURE-WORK.md)
  the expanded `check_links.mjs` integrity checker from Phase 10
  (`--check-html` / `--check-a11y` / `--check-ids` / `--check-sitemap`
  / `--check-search`) is the regression detector. Each Phase 11 PR
  just needs `check.bat` clean after it lands.
- Touch unrelated content or chrome. The five items are surgical;
  no opportunistic refactors slip in "while we're in there".

Target wall-clock impact: B2 trims highlight.mjs's ~470 lines of
per-language quirk logic to ~80 lines, shaving a small (~30-50 ms)
amount off Phase 3; B10 shrinks the offline tree by ~1.1 MB
(write-time saving on the order of 20-40 ms); B1 adds a
preprocess step gated on the presence of `.mmd` files (one
diagram on the current tree, ~200 ms cost when it runs); B5 and
B11 are perf-neutral. Net build-wall-clock effect: neutral to
slightly faster.

## Status: in progress — B2, B1, B5, B10 shipped; B11 pending

---

## 1. Inputs

The Phase 10 end-state at HEAD: tbdocs is the canonical build path
(`build.bat` invokes `node ../builder/index.mjs`); the eight
`verify-phase{1..8}.mjs` harnesses and their seven companion diff /
triage tools are deleted; `accepted-divergences.mjs` is deleted;
`scripts/check_links.mjs` carries the new integrity flags.

Specifically required:

- `cd docs && build.bat && check.bat` clean on the production tree
  (the cutover's post-deploy smoke test from PLAN-10 §9.2 / §9.3
  passing).
- No outstanding PRs that reference `accepted-divergences.mjs` or
  `verify-phase*.mjs` -- those files no longer exist; a PR that
  expects them in tree would conflict.
- The GitHub Pages workflow runs cleanly from `node builder/index.mjs`
  (PLAN-10 §5.4).

Not required as a precondition (but worth being aware of):

- **Phase 10 commit 7 (Jekyll source set deletion) may or may not
  have landed.** Phase 11 doesn't depend on it either way. The
  cleanup is sequenced independently; see PLAN-10 §5.8 / §9.4.
- **B2's `.theme` source location is resolved.** Per
  [FUTURE-WORK.md §D3](FUTURE-WORK.md) the investigation was to
  land as the first commit of B2's PR; in practice it ran ahead
  of the PR (one-shot copy from the twinBASIC IDE BETA's themes
  directory) and the three `.theme` files are now vendored under
  [`builder/themes/`](themes/). Resolution recorded in §6.1; B2's
  commit sequence in §5.1 starts at the `highlight-theme.mjs` port
  directly.

If `check.bat` fails or any verify state-of-the-world fact above
breaks, **stop** and fix before starting Phase 11. The integrity
checker is the only regression signal that survives the cutover;
losing it before achieving steady-state is the failure mode this
gate prevents.

---

## 2. Outputs

Phase 11 lands as five independent PRs, each producing its own
output deltas. The aggregate effect after all five land:

- **B2 (headline)**:
  - [highlight.mjs](highlight.mjs) shrinks from ~470 lines to ~80
    (the `SCOPE_TO_ROUGE_CLASS` table, the per-language quirk
    overrides at lines 218-340, the `bestRougeClass` walker, the
    `JS_BUILTINS` / `CPP_LIKE_RE` / `CPP_TOKEN_RE` / etc.
    auxiliary tables all delete).
  - One new module [highlight-theme.mjs](highlight-theme.mjs)
    (~60-80 lines): reads the upstream `.theme` files (location
    TBD per §6.1 investigation), parses the `Symbol*` properties,
    builds the colour palette + class-name table, returns
    `{ palette, classForScope }` for `highlight.mjs` to consume,
    and returns the rendered CSS string for the writer to emit.
  - `builder/assets/css/rouge.css` deletes; replaced by a
    build-time-generated `_site/assets/css/tb-highlight.css`.
  - [template.mjs](template.mjs)'s `<link rel="stylesheet">` list
    in `renderHead` swaps `rouge.css` for `tb-highlight.css`.
  - [book.mjs:538](book.mjs:538) and [pdf.mjs:35](pdf.mjs:35)
    follow the same swap for the PDF tree.
  - `scripts/extract_theme_colors.py` deletes (its consumer is
    gone).
  - `scripts/themes/twinbasic-{classic,dark,light}.css` deletes
    (regenerated outputs, no longer needed for inspection -- the
    same data drives the build now).
  - The rendered `<pre>` blocks on every page get per-span class
    names from the colour palette (`c1`, `c2`, …) instead of
    Rouge tokens (`k`, `s`, `mi`). Visually identical on the
    rendered page; structurally a clean break from Rouge's class
    set.

- **B1**:
  - One new module [mermaid.mjs](mermaid.mjs) (~80 lines): walks
    `docs/assets/images/mmd/*.mmd`, invokes `mmdc` per source if
    the matching `.svg` is missing or older than the source,
    writes the SVG sibling. Idempotent; the SVG is the artifact
    Phase 5 ships, so the regen runs as a pre-Phase-5 step.
  - One new dev dependency: `@mermaid-js/mermaid-cli` (devDependency,
    pinned). Not loaded at build time when no `.mmd` files
    changed.
  - On the current tree (one source: `docs/assets/images/mmd/2eff33e25804bc6ae919f694439dccbf.mmd`),
    the SVG sibling regenerates on a cold cache and is byte-stable
    across subsequent builds.

- **B5**:
  - [highlight.mjs](highlight.mjs) wraps each `<pre>` in a small
    container that carries the copy button:

    ```html
    <div class="code-example">
      <button class="btn copy-code" aria-label="Copy code to clipboard">
        <svg ...><!-- bi bi-clipboard --></svg>
      </button>
      <div class="language-tb highlighter-rouge">...</div>
    </div>
    ```

    The container shape matches what just-the-docs JS produces at
    runtime; the JS hook for the click handler stays.
  - `builder/assets/js/just-the-docs.js` retires the runtime DOM-
    injection path (the `processCodeBlocks` function). The click
    handler stays; the script is ~20 lines smaller.

- **B10**:
  - `_site/assets/js/search-data.json` is unaffected (Phase 6
    output still pretty-printed for direct fetch).
  - `_site-offline/assets/js/search-data.js` is **minified**:
    drops insignificant whitespace, ~2.8 MB → ~1.7 MB. The wrap
    `window.SEARCH_DATA = {...};` stays intact.

- **B11**:
  - [offline.mjs](offline.mjs)'s `deriveOfflineJtdJs` function
    drops the two regex patches and rewrites them as `acorn` AST
    transformations. The patched `just-the-docs.js` output is
    byte-comparable to the current regex output; the test for
    success is `check.bat` clean + the offline tree's search still
    works.
  - One new dep: `acorn` (and possibly `acorn-walk`).

---

## 3. Module split

```
builder/
  highlight.mjs               -390 / +20. Drop SCOPE_TO_ROUGE_CLASS,
                               bestRougeClass, JS_BUILTINS, the
                               per-language quirk block at lines
                               218-340, the CPP_LIKE_RE / CPP_TOKEN_RE
                               fallback. Keep the run-coalescing
                               (`append` / `flush` / `pendingNewlines`)
                               and the line-continuation absorption.
                               Emit color-palette classes via the new
                               highlight-theme.mjs interface. Also
                               injects the B5 copy-button container.
  highlight-theme.mjs         NEW ~60-80 lines. Parses .theme files,
                               builds the palette + class table,
                               returns the generated CSS string.
  themes/                     Vendored upstream .theme source files
                               (Light/Dark/Classic + upstream
                               README.txt). Landed alongside this
                               plan; see § 6.1 for the resolution
                               of the FUTURE-WORK §D3 investigation.
  mermaid.mjs                 NEW ~80 lines. Pre-Phase-5 regen step
                               (B1).
  offline.mjs                 -25 / +60. AST-based JTD patcher (B11);
                               minification step folded into
                               searchDataJs (B10).
  template.mjs                +1 / -1. Stylesheet link swap (B2).
  book.mjs                    +1 / -1. Same swap for the PDF tree.
  pdf.mjs                     +1 / -1. REQUIRED_CSS entry swap.
  index.mjs                   +20. Orchestrator: invoke mermaid.mjs
                               before Phase 5; thread the highlight
                               theme through Phase 3's init.
  assets/css/rouge.css        DELETED. Replaced by the build-time
                               generated tb-highlight.css.
  assets/js/just-the-docs.js  -20 lines. Drop processCodeBlocks
                               (B5).
  package.json                +2 deps (@mermaid-js/mermaid-cli, acorn);
                               possibly +1 (acorn-walk).
  PLAN.md                     Phase 11 → shipped; Build Phases table
                               updates.
  PLAN-11.md                  (this file)
  FUTURE-WORK.md              B1, B2, B5, B10, B11 → shipped.

scripts/
  extract_theme_colors.py     DELETED (B2 commit).
  themes/                     DELETED (B2 commit -- regenerated
                               artifact, no longer needed).
  check_links.mjs             Possibly +5 lines: the duplicate-id
                               check (Phase 10 addition) may need to
                               allow-list the B5 copy-button SVG ids
                               if any collide. Inspect after B5
                               lands.
```

The module count grows by two (`highlight-theme.mjs`, `mermaid.mjs`)
and loses one asset (`rouge.css`). Net `builder/` line delta across
all five PRs: estimated -300 lines (B2 dominates the reduction;
B1+B5+B11 add small ports of work the runtime currently did).

---

## 4. Implementation order

Per [FUTURE-WORK.md §D5](FUTURE-WORK.md), Phase 11 lands as **five
independent PRs**, not one combined cutover. B2 lands first
(largest change, sets the pattern); the other four are independent
and can land in any order.

| PR | Item | Verifies by |
|---|---|---|
| 1 | B2 — Shiki theme from `.theme` source | `build.bat && check.bat` clean. Visual spot of a Reference/<symbol>.md page: tB code block colours match the previous (Rouge-driven) palette within the rendered noise (the `.theme` source is the canonical truth on both sides; only the class-name layer changed). Generated `tb-highlight.css` exists and is referenced from the page `<head>`. |
| 2 | B1 — Mermaid auto-regen | `build.bat` regenerates the SVG; second `build.bat` is a no-op (timestamp check). Manual: change the `.mmd` source by one character, rebuild, confirm the SVG byte-changed. Revert. |
| 3 | B5 — Copy-button SSR | `check.bat` clean (no new duplicate-ids, well-formed HTML). Manual: load a page, click the copy button, confirm it copies. Confirm `just-the-docs.js` shrunk. |
| 4 | B10 — Search-data minification | `check.bat` clean. Manual: load an offline page, run a search, confirm hits return correctly. Confirm `_site-offline/assets/js/search-data.js` is ~1.7 MB. |
| 5 | B11 — AST JTD patcher | `check.bat` clean. Manual: confirm offline-tree navigation still highlights the current page in the sidebar; confirm offline search still works. The patched `just-the-docs.js` output may differ byte-for-byte from the pre-B11 regex-patched output -- that's fine if both produce the same observable behaviour. |

### PR policy

One PR per row. Each PR contains:

- The implementation commit(s) for the item.
- The PLAN-11 / FUTURE-WORK / PLAN.md updates marking that item
  shipped.
- The cleanup commit(s) for any artifacts the item retires
  (`extract_theme_colors.py` / `scripts/themes/` for B2; the
  `processCodeBlocks` block in `just-the-docs.js` for B5; the
  regex patches for B11).

Each PR must produce a working build before merge. Hook
enforcement stays as Phase 10 set it: **no `--no-verify`**.

The five PRs do not have a strict order beyond "B2 first". A
caller picking up Phase 11 mid-stream can land B1/B5/B10/B11 in
whatever order their reviewers prefer; the only cross-PR
dependency is between B2 and B5 (B5 modifies the same
`renderCodeBlock` function B2 rewrote, so doing them in reverse
order means rebasing B5 onto B2's reduced shape -- minor, but
worth noting).

---

## 5. Per-item specifications

### 5.1. B2 — Shiki theme generated from `.theme` source

**Source**: [FUTURE-WORK.md §B2](FUTURE-WORK.md) (headline), §B2a
(output-mode investigation), §D1 / §D3 / §D4 (sequencing notes).
The Phase 9 → 10/11 split planning recorded the design intent;
this section turns it into a concrete commit sequence.

**Background**. The current pipeline indirects twice between
upstream colour and rendered span:

```
.theme files (USERPROFILE/Desktop/...)
   │
   │ scripts/extract_theme_colors.py
   ▼
docs/_sass/custom/_twinbasic-{light,dark}.scss
   │  (then through the just-the-docs Sass pipeline)
   ▼
builder/assets/css/just-the-docs-combined.css     ← shipped
                       AND
builder/assets/css/rouge.css                       ← shipped (Rouge classes)
   │
   │   <span class="k">Dim</span>          ← class names emitted by
   │                                         highlight.mjs's SCOPE_TO_ROUGE_CLASS
   ▼
rendered page
```

The Rouge-class layer existed because Rouge's class set is fixed
and `rouge.css` was the only stylesheet that styled them; matching
Rouge's per-language quirks (`nf` for tB functions but `nc` for
JS function-CALL identifiers containing an uppercase letter, etc.)
required the ~120 lines of overrides in
[highlight.mjs:218-340](highlight.mjs:218). Under Phase 11, the
indirection drops:

```
.theme files (location TBD per §6.1 investigation)
   │
   │ builder/highlight-theme.mjs (parses Symbol* properties,
   │                              builds palette + class table)
   ▼
builder/_site/assets/css/tb-highlight.css         ← generated at build time
   │   (~1-2 KB; one rule per unique colour in the palette)
   │
   │   <span class="c3">Dim</span>          ← palette class
   ▼
rendered page
```

The class names are now colour-derived (`c1`, `c2`, …). The
Rouge per-language quirks no longer matter because the rendered
colour comes from the token's Shiki scope chain directly mapped
to a palette entry; whether Rouge would have called the same
token `k` or `kd` is irrelevant.

**Commit sequence within PR 1** (the investigation step from
[FUTURE-WORK.md §D3](FUTURE-WORK.md) ran ahead of the PR -- the
three `.theme` files are vendored under
[`builder/themes/`](themes/), resolution recorded in §6.1):

1. **highlight-theme.mjs port**. Implements the parser + palette
   builder + CSS emitter. ~60-80 lines. Stand-alone testable:
   reads `builder/themes/{Light,Dark,Classic}.theme`, returns
   `{ palette, classForScope, cssText }`. The Rouge mapping in
   `extract_theme_colors.py`'s `ROUGE_TO_SYMBOL` table is the
   source-of-truth ordering for which Symbol → which palette
   entry, but the palette emits colour-based class names not
   Rouge tokens.

2. **highlight.mjs rewrite**. Drops `SCOPE_TO_ROUGE_CLASS`,
   `bestRougeClass`, `JS_BUILTINS`, all the per-language `if
   (!isTb && ...)` blocks at lines 218-340, `CPP_LIKE_RE`,
   `CPP_TOKEN_RE`, `IDENT_FALLBACK_RE`, `STORAGE_TYPE_BARE_RE`,
   `NONTB_PUNCT_OPERATOR_RE`, `JS_BUILTINS`, `CONTAINER_TOP_LEVEL`,
   `hasContainerParent`. Keeps `renderRougeStyleSpans` (renamed to
   `renderThemedSpans`) since the run-coalescing + line-continuation
   absorption + multi-line-comment merging logic stays useful
   under the new class scheme. The `classForScope` lookup replaces
   `bestRougeClass`.

3. **Asset + template updates**. Delete
   `builder/assets/css/rouge.css`. Add a Phase 3 substep that
   writes `<destRoot>/assets/css/tb-highlight.css` (the generated
   stylesheet from step 1). Update `template.mjs`'s `<head>`
   stylesheet list to swap the link target. Update
   `book.mjs:538` and `pdf.mjs:35` similarly for the PDF tree.

4. **Cleanup**. Delete `scripts/extract_theme_colors.py` and
   `scripts/themes/twinbasic-{classic,dark,light}.css`. Delete
   `docs/_sass/custom/_twinbasic-{light,dark}.scss` IF Phase 10
   commit 7 has already landed (the Jekyll source set deletion);
   otherwise leave them for commit 7 to take. Update
   `builder/assets/README.md` to drop the `rouge.css` row and add
   a "Phase 11 reference" line pointing at this PLAN.

**Verification** (per [FUTURE-WORK.md §D2](FUTURE-WORK.md)): no
verify harness. The acceptance gates are:

- `build.bat` succeeds; the new `tb-highlight.css` lands in
  `_site/assets/css/`.
- `check.bat` clean (all five integrity flags, both online and
  offline trees).
- Visual spot of a tB code block: colours match the previous
  Rouge-driven render within rendering-noise tolerance. The
  source of truth on both sides is the same `.theme` data; only
  the class-name layer changed. A pixel-level diff is not
  required.
- The page `<head>` references `tb-highlight.css`, not
  `rouge.css`. `_site/assets/css/rouge.css` is absent.

**Light / dark mode coordination**. The current Jekyll-built
just-the-docs-combined.css carries `.language-tb .highlight .X`
rules inside `html.dark-mode { ... }`. Under Phase 11 the
generated `tb-highlight.css` is emitted in two passes -- the
light palette at root, the dark palette under `html.dark-mode`
-- so the dark-mode toggle continues to flip the syntax highlight
in lockstep with the rest of the chrome. See [§6.3](#63-light--dark-coordination).

### 5.2. B1 — Mermaid `.mmd` → `.svg` automation

**Source**: [FUTURE-WORK.md §B1](FUTURE-WORK.md), [PLAN-3 §15](PLAN-3.md).

**Background**. The site currently has one mermaid diagram:
[docs/assets/images/mmd/2eff33e25804bc6ae919f694439dccbf.mmd](../docs/assets/images/mmd/2eff33e25804bc6ae919f694439dccbf.mmd)
with a hand-exported SVG sibling. The hand-export is what Phase 5
copies; the `.mmd` source is editorial-only. Under Phase 11 the
SVG becomes a build artifact regenerated from the source whenever
the source is newer (or the SVG is missing).

**New module** `builder/mermaid.mjs` (~80 lines):

```js
// Phase 11 mermaid preprocessor: regenerates assets/images/mmd/*.svg
// from the matching *.mmd source when the SVG is missing or stale.
// Pre-Phase-5 step; the SVGs are copied verbatim by write.mjs once
// they exist.
//
// Idempotent: a second build with no source changes is a no-op
// (mtime check). Requires @mermaid-js/mermaid-cli at devDependency
// scope; the binary is invoked via `npx --no-install mmdc ...`.
//
// On the current tree (one source) the cold-cache regen is ~200 ms;
// the warm-cache check is sub-millisecond.

import { promises as fs } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { spawn } from "node:child_process";

export async function regenerateMermaid(srcRoot) {
  const mmdRoot = path.join(srcRoot, "assets/images/mmd");
  const sources = await fg("*.mmd", { cwd: mmdRoot, absolute: true });
  for (const src of sources) {
    const svg = src.replace(/\.mmd$/, ".svg");
    if (await upToDate(svg, src)) continue;
    await invokeMmdc(src, svg);
  }
}
```

**Wiring**:

- Orchestrator calls `await regenerateMermaid(srcRoot)` once,
  immediately before Phase 5's WRITE ONLINE. The output SVGs
  show up in Phase 1's discovered `staticFiles[]` only on the
  *next* build -- on the regen build they need a one-shot
  re-scan after `regenerateMermaid` returns. Cleanest: invoke
  the regen step from the *top* of the orchestrator (before
  Phase 1's discover), so Phase 1 picks up the freshly-emitted
  SVGs.

**Dependency**:

- `@mermaid-js/mermaid-cli` as a devDependency. Invoked via
  `npx --no-install mmdc -i <src> -o <svg> -b transparent`. The
  binary is ~250 MB installed (puppeteer / chromium); justify the
  install cost only when at least one `.mmd` source exists --
  early-out the regen call when `sources.length === 0`.

**Verification**: no harness; `build.bat && check.bat` clean.
Manual: edit the existing source by adding a node, rebuild,
confirm the SVG byte-changed; revert.

**Edge cases**:

- Source newer than SVG but SVG hand-edited: the regen
  overwrites. Document in the WIP.md update: SVGs under
  `assets/images/mmd/` are build artifacts; edit the `.mmd`
  source, not the SVG.
- `mmdc` not installed: the spawn fails; the orchestrator
  catches and logs `mermaid: skipped (mmdc not installed; run
  npm install in builder/)`. The build continues using the
  existing on-disk SVG. Caller can opt out of B1 entirely by
  declining to install the devDependency.
- CI: the GitHub Actions workflow needs `npm ci` to include
  devDependencies (it does by default with `actions/setup-node@v4`).
  No extra setup required.

### 5.3. B5 — Server-side copy-code button

**Source**: [FUTURE-WORK.md §B5](FUTURE-WORK.md), [PLAN-3 §15](PLAN-3.md).

**Current**: every `<pre>` block ships unwrapped; the just-the-docs
client JS (`processCodeBlocks` in `just-the-docs.js`) walks the DOM
on `load`, finds each `<pre>`, wraps it in a `<div class="code-example">`,
and prepends a `<button class="copy-code">` with a clipboard SVG.
Run-time DOM mutation; non-trivial cost on a long page; no buttons
visible while JS is still loading.

**Change** — emit the same shape from `highlight.mjs` at build
time. The `renderCodeBlock` return string becomes:

```html
<div class="code-example">
  <button class="btn copy-code" aria-label="Copy code to clipboard">
    <svg width="14" height="14" fill="currentColor"><use href="#bi-clipboard" /></svg>
  </button>
  <div class="language-<lang> highlighter-rouge">
    <div class="highlight"><pre class="highlight"><code>...</code></pre></div>
  </div>
</div>
```

The `<use href="#bi-clipboard" />` references the inline SVG
sprite that `template.mjs`'s `svgSprites` already injects at the
top of `<body>`. Both `bi-clipboard` and `bi-clipboard-check-fill`
need to be in the sprite set; check the current set and add the
fill-variant if it's not there (the JS swaps the icon on click).

**Client-side change**:

- `just-the-docs.js`: delete `processCodeBlocks` (the DOM-injection
  function). Keep the click handler that swaps the icon + copies
  to clipboard; rebind it to the now-prebuilt button selector.
- Net JS reduction: ~20 lines.

**Verification**:

- `check.bat` clean (no new duplicate-ids from the per-page
  buttons — each `<pre>` gets its own button with no shared
  `id`; the click handler selects via class, not id).
- Manual: load a page, click the button, confirm the clipboard
  receives the code. Confirm the icon swaps to the check-mark
  on success.
- Manual: disable JS, reload, confirm the button is visible
  (server-side render) but inert. Acceptable degradation.

**Risk**: the just-the-docs runtime may target the button via a
selector that depended on its DOM position. Inspect the click
handler before deleting `processCodeBlocks` and re-bind to the
pre-rendered shape. The JS hook is preserved; only the injection
path retires.

### 5.4. B10 — `search-data.js` minification

**Source**: [FUTURE-WORK.md §B10](FUTURE-WORK.md), [PLAN-7 §13](PLAN-7.md).

**Current** ([offline.mjs](offline.mjs)'s `searchDataJs` step):
generates `_site-offline/assets/js/search-data.js` by wrapping the
pretty-printed `search-data.json` content in
`window.SEARCH_DATA = {...};`. The wrapper preserves the source
JSON's whitespace; the file is ~2.8 MB.

**Change**: re-stringify the parsed JSON with `JSON.stringify(data)`
(no indent) before wrapping. Estimated size after minification:
~1.7 MB.

**Implementation**:

```js
// offline.mjs, inside the searchDataJs step:
const jsonText = await fs.readFile(jsonPath, "utf8");
const parsed = JSON.parse(jsonText);
const minified = JSON.stringify(parsed);                  // no indent
const wrapped = `window.SEARCH_DATA = ${minified};\n`;
await fs.writeFile(jsWrapperPath, wrapped, "utf8");
```

The online tree's `search-data.json` stays pretty-printed (Phase
6 unchanged); the offline tree's `search-data.js` is the new
minification target. The Lunr consumer (`initSearch` in
`just-the-docs.js`) reads `window.SEARCH_DATA` and doesn't care
about formatting.

**Verification**:

- `check.bat` clean.
- Manual: load `_site-offline/index.html`, type a search query,
  confirm hits return.
- `wc -c _site-offline/assets/js/search-data.js` shows ~1.7 MB
  (vs ~2.8 MB before).

**Note on PLAN-7 §13's wider concern**: the original FUTURE-WORK
entry mentioned `_site-offline.zip` size pressure. There's no
`_site-offline.zip` artifact on the current build (the offline
tree is consumed directly by users who clone or download the
site). The minification is still worthwhile -- ~1.1 MB shaved
off the offline tree's footprint -- but the "zip size" framing
in FUTURE-WORK is a forward-looking concern, not a current one.

### 5.5. B11 — AST-based `just-the-docs.js` patching

**Source**: [FUTURE-WORK.md §B11](FUTURE-WORK.md), [PLAN-7 §13](PLAN-7.md).

**Current** ([offline.mjs](offline.mjs)'s `deriveOfflineJtdJs`):
two regex patches against the bundled `just-the-docs.js`:

1. `navLink()` body — replaces the upstream `document.location.pathname`
   active-page test with a resolved `link.href` test (so the
   sidebar's active-class lookup works under `file://`).
2. `initSearch()` body — replaces the upstream
   `XMLHttpRequest('search-data.json')` fetch with a read of
   `window.SEARCH_DATA` (XHR to `file://` is browser-blocked).

The regexes anchor on specific function signatures inside the
upstream source. A cosmetic upstream edit (variable rename,
whitespace change, etc.) breaks the regex match and the patch
silently no-ops -- `deriveOfflineJtdJs` returns warning lines but
the build continues.

**Change**: rewrite the patches as `acorn` AST rewrites. Parse
`just-the-docs.js` once; walk the AST; locate the `navLink` and
`initSearch` function declarations by name; replace the relevant
body fragments; serialise the modified AST back to JS. Survives
upstream cosmetic edits because the AST walker matches structure,
not text.

**Dependency**: `acorn` (production dep). Possibly `acorn-walk`
for the walker convenience. Both small (~150 KB combined).

**Implementation sketch**:

```js
import * as acorn from "acorn";
import * as walk from "acorn-walk";
// Optional: a serialiser like astring, OR build the output by
// in-place string slicing using the AST node's range info (start
// / end offsets in the source). The string-slicing approach
// produces a smaller diff vs upstream because non-patched regions
// stay byte-identical.

function patchJtdAst(source) {
  const ast = acorn.parse(source, { ecmaVersion: 2022, ranges: true });
  const edits = [];   // [{ start, end, replacement }, ...]
  walk.simple(ast, {
    FunctionDeclaration(node) {
      if (node.id.name === "navLink") {
        edits.push(replaceNavLinkBody(node, source));
      } else if (node.id.name === "initSearch") {
        edits.push(replaceInitSearchBody(node, source));
      }
    },
  });
  return applyEdits(source, edits);
}
```

**The two replacements** stay the same shape as the current regex
versions; only the locator changes from regex to AST. The
specific body fragments are the existing `OFFLINE_NAV_LINK` /
`OFFLINE_INIT_SEARCH` constants in `offline.mjs`. The serialiser
should preserve upstream byte-formatting outside the patched
regions, which the string-slice approach does naturally.

**Verification**:

- `check.bat` clean.
- Manual: load `_site-offline/index.html`, click around the
  sidebar; confirm the current page highlights. Type a search;
  confirm results return. Both behaviours regression-test the
  two patches.
- Byte-diff the new patched `just-the-docs.js` against the
  pre-Phase-11 regex-patched version. Acceptable shapes:
  byte-identical (the string-slice approach preserved all
  non-patched bytes), or differences confined to whitespace /
  trailing-newline normalisation inside the patched regions.
  Anything beyond that needs investigation -- the AST walker
  may have rewritten more than intended.

**Risk**: an `acorn` parse failure on the upstream
`just-the-docs.js` (e.g. a future just-the-docs release that uses
unsupported syntax). Mitigation: pass `ecmaVersion: "latest"`,
catch parse errors, fall back to the regex patcher with a clear
warning. The regex code stays in tree as the fallback for one
release cycle, then drops in a follow-up.

**Note**: the upstream just-the-docs version is pinned via
`docs/Gemfile` (`gem "just-the-docs", "= 0.10.1"`). Under Phase 11
post-cutover, the Gemfile is no longer the source of truth -- the
captured-once asset in `builder/assets/js/just-the-docs.js` is.
A bump to a new just-the-docs version is an explicit re-capture
step (see `builder/assets/README.md`); the AST patcher reduces
the manual effort each bump requires.

---

## 6. B2 design notes

(Expanded notes for §5.1. Skip this section if you're not
implementing B2.)

### 6.1. Where the `.theme` source files live (resolved)

**Resolution**: vendored in repo under
[`builder/themes/`](themes/). The three files
(`Light.theme`, `Dark.theme`, `Classic.theme`) plus the upstream
`README.txt` were copied verbatim from the twinBASIC IDE BETA's
themes directory and committed alongside this plan, ahead of B2's
PR proper. The pre-Phase-11 `scripts/extract_theme_colors.py`
read them from `%USERPROFILE%/Desktop/twinBASIC_IDE_BETA_982/themes/`
-- a local-only path that couldn't survive the move to CI. The
vendor-in-repo shape replaces it; B2's `highlight-theme.mjs`
reads from `builder/themes/` directly.

This matches the convention `builder/assets/README.md` already
established for the just-the-docs / Rouge / Lunr assets: the
canonical source is upstream, the working copy lives in tree
alongside a documented refresh procedure. For the themes the
upstream's own `README.txt` (vendored alongside) carries the
"do not modify" guidance.

**Refresh procedure** (when a new twinBASIC IDE BETA changes the
syntax-highlight palette):

1. Locate the new build's `themes/` directory (today: under the
   IDE installer's footprint).
2. Diff the new `Light.theme` / `Dark.theme` / `Classic.theme`
   against `builder/themes/`. If no `Symbol*` properties moved,
   carry the diff over verbatim. If renamed or new `Symbol*`
   entries appear, update `highlight-theme.mjs`'s `ROUGE_TO_SYMBOL`-
   equivalent table (the scope → Symbol mapping kept from the
   retired `extract_theme_colors.py`) to cover them, then carry
   the diff over.
3. Run `cd docs && build.bat && check.bat`. Spot a tB code block
   to confirm the new palette renders. Commit `builder/themes/`
   + any `highlight-theme.mjs` table changes in one commit.

**Open notes carried over from the investigation**:

- **File-format invariant.** The vendored files exhibit the
  property-line `Name: value;` shape and the `Symbol*` grouping
  the retired Python parser depended on. The B2 parser stays
  forward-compatible (silently skip unknown `Symbol*`
  properties) rather than hard-failing on novel entries -- a
  future IDE adding a new symbol shouldn't break the build
  before the docs caller catches up. The flip-side bound (an
  *expected* `Symbol` going missing) is caught by the test
  suite's spot of one rule per palette class in the rendered
  CSS output.
- **Licence.** The vendored upstream `README.txt` carries no
  explicit licence statement, but the twinBASIC IDE BETA ships
  the same three files in its public installer; vendoring the
  files to support documentation that links to the IDE itself
  is consistent with their distribution intent. If the upstream
  ever publishes a more restrictive licence, the fallback is
  fetch-at-build-time (a small step in `index.mjs` that pulls
  the release artifact instead of reading from `builder/themes/`).
- **Version recording.** The vendored copy was taken from the
  twinBASIC_IDE_BETA_982 build. When refreshing, prepend a
  comment to `builder/themes/Light.theme` (or similar) noting
  the source version. The IDE's own theme files don't carry a
  version stamp internally; tracking it in a comment is the
  least-invasive shape.

### 6.2. Palette and class-name scheme

**Goal**: minimise per-span HTML bytes while keeping the
stylesheet small and the class names stable across builds.

**Approach** (per [FUTURE-WORK.md §B2a](FUTURE-WORK.md)
output-mode investigation): custom-transformer Shiki output with
class names derived from unique theme colours.

1. **Parse** all three theme files (Light, Dark, Classic) into
   `{ symbol -> properties }` maps.
2. **Collect** the set of unique `Color` values across Light and
   Dark (the two palettes that drive runtime; Classic is light-
   inspection-only). Each unique colour gets a stable two-char
   class ID:
   - Sort the unique colours deterministically (e.g. alphabetical
     by hex value).
   - Assign `c1`, `c2`, … in sort order. Stable across builds
     because the sort key is deterministic.
3. **Build** the `Symbol -> classId` map for each palette
   (Light, Dark). Symbols whose `Color` is the same fold to the
   same `classId` (which is what we want -- the source already
   identifies same-coloured symbols as the same visual category).
4. **Build** the `scope -> classId` table the renderer reads.
   The current `ROUGE_TO_SYMBOL` table in
   `scripts/extract_theme_colors.py` encodes which Symbol owns
   which scope; carry that table over verbatim (~25 entries).
   The renderer's lookup becomes: "scope → Symbol → classId".
5. **Emit** the stylesheet:

   ```css
   /* Light palette (root) */
   .c1 { color: #448a63; font-style: normal; ... }   /* SymbolComment */
   .c2 { color: #ad8c98; ... }                       /* SymbolConditionalCompilationDirective */
   .c3 { color: #385ba9; ... }                       /* SymbolKeyword */
   ...

   /* Dark palette (under html.dark-mode) */
   html.dark-mode .c1 { color: #6ab886; ... }
   html.dark-mode .c2 { color: #c7a4b1; ... }
   ...
   ```

**Estimated size**: ~25 palette entries × ~40 bytes per rule × 2
palettes ≈ 2 KB. The current `rouge.css` is 2.3 KB; net wash.

**Why class names not inline styles**: per
[FUTURE-WORK.md §B2a](FUTURE-WORK.md), inline styles add
~31 bytes per span vs ~22 for class wrappers (`<span class="c12">`).
The 837-page corpus has ~50 K syntax-highlighted spans; the per-
span overhead matters at scale. The class-based approach also
keeps the dark-mode toggle working (inline styles would need CSS-
variables-with-fallback, which `<span style="--shiki-light:...">`
shape doubles per-span overhead -- the worst option).

### 6.3. Light / dark coordination

**Current** (Jekyll-built `just-the-docs-combined.css`): the dark
palette lives inside `html.dark-mode { ... }`. The `theme-switch.js`
toggle flips that class on `<html>` and every dark rule activates.

**Under Phase 11**: same pattern. The generated `tb-highlight.css`
emits the light palette as root rules and the dark palette inside
`html.dark-mode`. The toggle JS is unchanged; the dark-mode flip
continues to work in lockstep with the rest of the chrome.

For the PDF tree: `_site-pdf/book.html` ships with the print
stylesheet only (no dark mode). The PDF version of `tb-highlight.css`
strips the `html.dark-mode` rules (or the writer chooses not to
emit them for the PDF tree). Minor: ~50 bytes saved in the PDF
artifact.

### 6.4. The line-continuation / multi-line-comment carve-outs

**Keep**. The current
[highlight.mjs](highlight.mjs):130-380 logic that absorbs the
leading whitespace of the line after `_` into the same `lc` span,
and that merges adjacent block-comment spans across newlines into
one multi-line span, both reflect the visual intent of the
rendered code -- a multi-line comment looks better as one
contiguous coloured block than as N per-line fragments separated
by uncoloured newlines. Phase 11 keeps the run-coalescing machinery
even though the Rouge-class-name shape (`lc`, `cm`) is gone; the
new palette-class-name shape preserves the same merge invariants
(adjacent runs with the same class merge; line-continuation
absorbs the next line's leading whitespace).

The carve-outs are about **rendered visual grouping**, not about
**class-name semantics**, and they survive the class-naming
change.

### 6.5. Edge cases

- **Empty / unrecognised Symbol** in the theme file. Fall back
  to the parent scope or to `c0` (the default text colour --
  derived from the theme's `TextColor` or equivalent). The
  current Python script omits empty values; the JS port should
  do the same.
- **A code fence with an unknown language**. The current
  highlight.mjs's `wrapperLang = lang ? lang.trim().toLowerCase() : "plaintext"`
  shape stays. Tokens get `null` class (no `<span>` wrap); they
  inherit the default text colour from the `.highlight` rule.
  No regression vs the current shape.
- **A theme file that's missing entirely** (the location TBD per
  §6.1 hasn't resolved at build time). Hard-fail with a clear
  message; the build can't produce a syntax-highlight stylesheet
  without it. No silent fall-back to a generic palette -- if the
  upstream goes missing, the operator should know.

---

## 7. Design decisions and assumptions

### 7.1. Decision record

| ID | Decision | Why |
|---|---|---|
| D1 | Phase 11 lands as **five independent PRs**, not one combined cutover | Per [FUTURE-WORK.md §D5](FUTURE-WORK.md). B2 is large enough to deserve its own review window. The smaller items (B1, B5, B10, B11) are clean independent commits whose per-item revert path stays simple when bundled separately. |
| D2 | `scripts/extract_theme_colors.py` and `scripts/themes/*.css` delete in **B2's PR**, not as a separate cleanup commit | Per [FUTURE-WORK.md §D4](FUTURE-WORK.md). The script exists only to feed the Rouge-class indirection in highlight.mjs that B2 retires; without B2's `SCOPE_TO_ROUGE_CLASS` consumer it has no caller. Same commit, same revert boundary. |
| D3 | The `.theme` source files are **vendored under [`builder/themes/`](themes/)** rather than fetched at build time | The investigation step from [FUTURE-WORK.md §D3](FUTURE-WORK.md) resolved to "vendor in repo" (option 2.a in the original question set) before B2's PR opens. The vendored shape matches the convention `builder/assets/README.md` established for the just-the-docs / Rouge / Lunr assets, keeps the build deterministic (no network call), and survives a future restrictive-licence fall-back to fetch-at-build-time without a re-plan. §6.1 records the resolution and refresh procedure. |
| D4 | **No Phase 11 verify harness** | Per [FUTURE-WORK.md §D2](FUTURE-WORK.md). Phase 10's expanded `check_links.mjs` (HTML well-formedness, duplicate-id, anchor resolution, sitemap / search completeness) is the regression detector. Adding a per-PR harness would duplicate effort; manual smoke-tests + `check.bat` are sufficient at this scale. |
| D5 | B2 generates **palette-class names** (`c1`, `c2`, …), not inline styles or CSS variables | Per [FUTURE-WORK.md §B2a](FUTURE-WORK.md). Inline styles add ~31 bytes per span vs ~22 for class wrappers; CSS variables add ~60+. The 837-page corpus has ~50 K syntax-highlighted spans -- per-span overhead is the dominant cost. |
| D6 | B2 generates the stylesheet **at build time** under `_site/assets/css/tb-highlight.css`, not vendored as a pre-extracted artifact | The build-time path keeps the upstream `.theme` data as the single source of truth: edit the `.theme` source, rebuild, the new colours flow through. A vendored stylesheet would require a manual two-step refresh (edit `.theme`, re-run an extractor) that's exactly what B2 is trying to retire. |
| D7 | B1's mermaid regen runs **before Phase 1**, so the generated SVGs land in `staticFiles[]` naturally | The alternative (regen between Phase 1 and Phase 5) requires re-scanning the static-files set after regen. Running the preprocessor before discover folds the new SVGs into Phase 1's normal sweep. |
| D8 | B1 depends on `@mermaid-js/mermaid-cli` as a **devDependency**, invoked via `npx --no-install mmdc` | Build-time only; runtime users don't need it. The `--no-install` flag avoids npx's silent auto-install behaviour. A missing `mmdc` is a hard fail with a clear message; the operator opts in by running `npm install` in `builder/`. |
| D9 | B5's copy-button container is rendered by `highlight.mjs`, not by `template.mjs` | The container wraps individual code blocks, not the whole page. The natural home is the function that emits the code block. `template.mjs` stays page-level. |
| D10 | B5 keeps the just-the-docs click-handler intact; only the DOM-injection path retires | The click-to-copy interaction is unchanged; only the moment of button creation moves from runtime to build-time. Minimal surface area to debug if a regression shows up. |
| D11 | B10 minifies only the **offline** `search-data.js`, not the **online** `search-data.json` | The online JSON is fetched by Lunr at runtime and could-be-minified, but two consumer paths use it (the search runtime and any human-readable use-case for inspecting search hits). The offline `.js` is a write-once wrapper for `window.SEARCH_DATA` and has no other consumer; minification there is risk-free. |
| D12 | B11's AST rewrites use **string-slice serialisation** (preserve upstream byte-formatting outside patched regions) rather than full re-serialisation via astring or similar | Keeps the diff vs upstream small and reviewable. A full re-serialisation would normalise whitespace site-wide and inflate the diff to "every line changed", obscuring whether the patch did anything beyond the two intended sites. |
| D13 | B11 keeps the regex patcher in tree as a **fallback** for one release cycle, then drops it | Defence in depth against an acorn parse failure on a future just-the-docs version with unsupported syntax. The fallback fires only when acorn throws; once the release cycle is up, drop the fallback and tighten the dep on acorn's stability. |
| D14 | Phase 11 does **not** touch `docs/_config.yml` | Same as Phase 10's [§7.D8](PLAN-10.md). The remaining Jekyll-only config keys are harmless ballast; cleaning them up is a separate task once the Phase 10 follow-up commit lands. |
| D15 | `docs/_sass/custom/_twinbasic-{light,dark}.scss` deletes **in B2's PR if Phase 10 commit 7 has landed**, otherwise it stays for commit 7 to take | Avoids the bookkeeping question of "who owns these files now"; B2 retires their generator (`extract_theme_colors.py`), commit 7 retires the Jekyll source set including these SCSS partials. Whichever lands first claims the deletion. |

### 7.2. Why no Phase 11 verify harness

Phase 10 expanded `scripts/check_links.mjs` with five integrity
check categories:

- `--check-html` (HTML well-formedness)
- `--check-a11y` (accessibility basics: missing alt, empty links)
- `--check-ids` (duplicate `id="..."`)
- `--check-sitemap` (sitemap.xml completeness)
- `--check-search` (search-data.json completeness)

`check.bat` runs all five against both `_site/` and
`_site-offline/`. Every Phase 11 change is covered:

- **B2**: changes per-span class names. The class-attribute
  syntax stays well-formed; no new ids; the stylesheet link
  resolves; the sitemap and search index are unaffected.
  `--check-html` / `--check-a11y` / `--check-ids` catch any
  malformed output.
- **B1**: generates SVG files. The SVG well-formedness is
  outside the link checker's scope, but the references to them
  in HTML are checked (existing link-check).
- **B5**: adds buttons and a container around code blocks.
  `--check-html` catches mismatched-tag bugs; `--check-a11y`
  catches the `aria-label` if it's missing (the spec calls for
  one).
- **B10**: changes a JS file's formatting. The link checker
  doesn't parse JS; manual smoke (offline search works) is
  the regression detector.
- **B11**: same as B10 -- a JS-formatting change. Manual smoke
  (offline navigation highlight + offline search) is the
  detector.

The Phase 11 acceptance bar is `check.bat` clean + the per-item
manual smoke from §5.1-§5.5. No per-PR harness needed.

### 7.3. Scope guardrails

The line between Phase 11 and out-of-scope items is the criterion
stated in [§intro](#plan-11-phase-11--parity-update-output-changing-follow-ups):
the change is one of the five items routed to Phase 11 in
[FUTURE-WORK.md §B](FUTURE-WORK.md). Implementer test for "is
this Phase 11 or out of scope?":

1. Check FUTURE-WORK.md §B for the candidate. If it's routed to
   Phase 11 (B1, B2, B5, B10, B11) → Phase 11.
2. If it's routed to "drop" (B6, B18) → out of scope; don't
   reopen.
3. If it's not in FUTURE-WORK.md at all → file a new entry
   first; routing decision comes before implementation.

The five items aren't a frozen set -- a Phase 12 (or a later
Phase 11.5) can be filed if new output-changing follow-ups
emerge. But mid-Phase-11 scope creep is the failure mode this
guardrail prevents.

---

## 8. What's NOT in Phase 11

These belong to Phase 12+ or are out of scope.

### 8.1. Out of scope by routing

- **B6 Linkify exception list** — dropped to "Re-add the entry
  if a content shift makes bare URLs common in body prose"
  ([FUTURE-WORK.md §B6](FUTURE-WORK.md)). Do not reopen.
- **B18 Streaming write of `book.html`** — dropped because the
  current scale (~5 MB) is two orders of magnitude below the
  problem threshold ([FUTURE-WORK.md §B18](FUTURE-WORK.md)).
  Do not reopen.

### 8.2. Out of scope by topic

- **Watch-mode / incremental rebuild.** Same as Phase 10's
  [§7.D11](PLAN-10.md). Out of scope for Phase 11; if it ever
  lands, it's a phase of its own.
- **`docs/_config.yml` config-key cleanup.** The remaining
  Jekyll-only keys are harmless ballast (see Phase 10 §5.8). If
  Phase 10's follow-up commit (the Jekyll source set deletion)
  hasn't landed when Phase 11 finishes, the config-cleanup pass
  is still owed to that commit, not to Phase 11.
- **The `one-offs/` directory.** Phase 9 §8.4 and Phase 10 §8.2
  both ruled this out of scope; Phase 11 doesn't reopen it.
- **A new build phase.** Phase 11 is feature work landing in the
  existing modules; the eight-phase orchestrator shape doesn't
  change. B1's mermaid step is a pre-phase preprocessor, not a
  new phase.

### 8.3. Things Phase 11 is **not** allowed to slip in

- **`builder/assets/` re-extraction** triggered by a `just-the-docs`
  gem version bump. The version is pinned at 0.10.1 via
  `docs/Gemfile`; bumps are a separate manual procedure (see
  `builder/assets/README.md`). B11 makes future bumps easier to
  re-patch but doesn't perform a bump itself.
- **markdown-it plugin updates.** Phase 3's plugin stack is
  stable; any update risks per-page output drift that the new
  integrity checker may or may not catch. Out of scope.
- **Theme changes** beyond the syntax-highlight repaint. The
  just-the-docs chrome (colours, spacing, typography) is
  unchanged. B2 only affects the per-span colouring inside
  `<pre>` blocks.

---

## 9. Verification

Per [FUTURE-WORK.md §D2](FUTURE-WORK.md), no Phase 11 verify
harness. The acceptance gates per PR:

### 9.1. Per-PR (gate before merge)

1. `cd docs && build.bat` succeeds; `_site/`, `_site-offline/`,
   `_site-pdf/` all produced.
2. `cd docs && check.bat` clean (zero broken links, zero forbidden-
   prefix hits, all five integrity flags PASS).
3. Per-item manual smoke (from §5.1-§5.5):
   - B2: visual spot of a tB code block; head link references
     `tb-highlight.css`.
   - B1: edit `.mmd` source, rebuild, SVG byte-changes; revert
     and rebuild, no spurious regen.
   - B5: click the copy button on a page; clipboard receives
     the code.
   - B10: offline search returns results; `search-data.js` is
     ~1.7 MB.
   - B11: offline navigation highlights; offline search works.

### 9.2. Post-deploy smoke (per PR after merge)

1. `https://docs.twinbasic.com/` loads.
2. A Reference page with a tB code block renders the syntax
   highlight (the colour palette is visually equivalent to the
   pre-B2 render).
3. The mermaid diagram on `docs/Documentation/Architecture/` (or
   wherever its single source is referenced) renders.
4. The copy button on a code block copies.
5. The site search returns hits.
6. The PDF book renders via `book.bat` (the post-deploy run
   that exercises Phase 8 end-to-end).

### 9.3. Cumulative (after all five PRs land)

1. `_site/assets/css/rouge.css` is absent.
2. `_site/assets/css/tb-highlight.css` is present and styles the
   syntax highlight.
3. `scripts/extract_theme_colors.py` and `scripts/themes/` are
   gone.
4. `builder/highlight.mjs` is ~80 lines (down from ~470).
5. `_site-offline/assets/js/search-data.js` is ~1.7 MB (down
   from ~2.8 MB).
6. `builder/assets/js/just-the-docs.js` is ~20 lines shorter
   (the `processCodeBlocks` retirement).
7. `docs/assets/images/mmd/<hash>.svg` is byte-stable across
   consecutive builds with no source change.

---

## 10. Dependencies

Phase 11 adds two production deps and one devDependency:

```json
{
  "dependencies": {
    "fast-glob": "^3.3",
    "gray-matter": "^4.0",
    "js-yaml": "^4.1",
    "markdown-it": "^14.0",
    "markdown-it-attrs": "^4.3",
    "markdown-it-deflist": "^3.0",
    "markdown-it-footnote": "^4.0",
    "shiki": "^1.0",
    "acorn": "^8.0",                     // NEW (B11)
    "acorn-walk": "^8.0"                 // NEW (B11, optional convenience)
  },
  "devDependencies": {
    "@mermaid-js/mermaid-cli": "^11.0"   // NEW (B1)
  }
}
```

- **acorn** + **acorn-walk** (B11): ~150 KB combined; production
  dep because they're invoked during the offline-tree build.
  Stable API; small surface.
- **@mermaid-js/mermaid-cli** (B1): ~250 MB installed (pulls
  puppeteer / chromium). devDependency so production deployments
  without a `.mmd` source don't pay the install cost. CI installs
  via `npm ci` by default.

`shiki` stays unchanged (the existing Shiki + TextMate-grammar
pipeline keeps working; B2 only changes what the per-token
classifier returns).

No removals. The seven existing deps + two new are the Phase 11
end-state.

---

## 11. File layout after Phase 11

```
<repo root>/
  builder/
    PLAN.md                       (updated: Phase 11 → shipped)
    PLAN-1.md ... PLAN-10.md      (unchanged)
    PLAN-11.md                    (this file)
    FUTURE-WORK.md                (B1, B2, B5, B10, B11 marked shipped)
    README.md                     (the existing module map updated for
                                   the new modules and the rouge.css
                                   removal)
    index.mjs                     (+ 20 lines: mermaid pre-step,
                                   highlight-theme init)
    highlight.mjs                 (~ 80 lines, down from ~ 470)
    highlight-theme.mjs           NEW (~ 60-80 lines)
    mermaid.mjs                   NEW (~ 80 lines)
    offline.mjs                   (B10 minify + B11 AST patcher;
                                   ~+ 35 lines net)
    template.mjs                  (one-line stylesheet swap)
    book.mjs                      (one-line stylesheet swap)
    pdf.mjs                       (one-line REQUIRED_CSS swap)
    package.json                  (+ acorn, acorn-walk, mermaid-cli)
    themes/                       Vendored per § 6.1 (Light.theme,
                                   Dark.theme, Classic.theme,
                                   upstream README.txt). Landed
                                   alongside PLAN-11; B2's PR
                                   reads from here.
    one-offs/                     (unchanged)
    assets/
      css/
        rouge.css                 DELETED (B2)
        (other entries unchanged)
      js/
        just-the-docs.js          (- 20 lines, B5)
        (other entries unchanged)
      README.md                   (rouge.css row dropped; PLAN-11
                                   reference added)

  docs/
    build.bat                     (unchanged from Phase 10)
    check.bat                     (unchanged from Phase 10)
    serve.bat                     (unchanged from Phase 10)
    WIP.md                        (the "Build pipeline" section gets
                                   a Phase 11 paragraph noting the
                                   five PRs and pointing at PLAN-11)
    _plugins/                     (Phase 10 status: still present
                                   pending commit 7; Phase 11 doesn't
                                   touch)
    _includes/                    (same)
    _layouts/                     (same)
    _sass/                        (same -- if commit 7 has not landed;
                                   B2 deletes _sass/custom/_twinbasic-*
                                   IF commit 7 has landed, otherwise
                                   commit 7 takes them)
    Gemfile / Gemfile.lock        (same)
    _config.yml                   (unchanged)
    assets/
      images/
        mmd/
          <hash>.mmd              (canonical source; unchanged)
          <hash>.svg              (regenerated artifact; byte-stable
                                   across builds modulo source edits)

  scripts/
    check_links.mjs               (Phase 10 form; possibly + 5 lines
                                   for B5 copy-button id allow-list
                                   IF needed -- inspect after B5
                                   lands)
    convert_em_dash_separators.py (unchanged)
    extract_theme_colors.py       DELETED (B2)
    themes/                       DELETED (B2 -- regenerated artifact)

  .github/workflows/
    pages.yml                     (or jekyll-gh-pages.yml --
                                   unchanged from Phase 10)
```

After Phase 11 lands, the only remaining Phase 10 follow-up is
the deletion of the Jekyll source set (`docs/_plugins/`,
`docs/_includes/`, `docs/_layouts/`, `docs/_sass/`, `Gemfile`,
`Gemfile.lock`, `docs/_profile/`) per PLAN-10 §5.8. That commit
is sequenced two weeks after the Phase 10 cutover and is
independent of Phase 11 -- it may have landed before, during, or
after Phase 11 depending on calendar.

---

## 12. What "done" Phase 11 enables

After all five PRs land:

- **The syntax-highlight palette stays in sync with upstream
  automatically.** Edit the `.theme` source (or refresh the
  vendored copy per the procedure in §6.1), rebuild, the new
  colours flow through end-to-end. No manual re-mapping through
  Rouge classes; no `extract_theme_colors.py` to re-run.
- **Mermaid diagrams update from source.** Edit a `.mmd`,
  rebuild, the SVG regenerates. No Typora export step.
- **The code-block copy button is server-rendered.** Visible
  before JS loads; no run-time DOM mutation; the just-the-docs
  client bundle shrinks marginally.
- **The offline tree's biggest asset shrinks.** ~1.1 MB
  recovered on `_site-offline/`.
- **Future just-the-docs version bumps are easier to re-patch.**
  The AST patcher survives cosmetic upstream edits the regex
  patcher could miss.
- **`builder/highlight.mjs` is ~80 lines.** The ~390 lines of
  per-language Rouge-quirk overrides are gone. Reading the
  module to understand what it does no longer requires reading
  six TextMate-scope-to-Rouge-token decision tables.

The five items shipped together close out the Phase-10-deferred
backlog from FUTURE-WORK.md §B. After Phase 11, the only open
follow-up in FUTURE-WORK.md is the A1 investigation
(hidden-secondary-divergences) -- which is now a content
question, not a code question, and has no obvious next phase
to belong to.

The cutover phase, parity-update phase, and original eight build
phases are then complete; further work on the builder is
incremental enhancement against a stable baseline.
