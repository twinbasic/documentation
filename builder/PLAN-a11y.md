# Accessibility Audit — WCAG 2.2 AA

Target: WCAG 2.2 AA conformance for the online site at `docs.twinbasic.com`.

Scope: the generated HTML template/chrome (builder pipeline, JS, CSS) **and** content-level patterns (tables, code blocks, admonitions, SVG diagrams, headings) — but with a firm constraint on where fixes land.

## Guiding principle: no HTML in markdown

Accessibility fixes must not push raw HTML into `docs/` markdown files. The markdown source should stay readable, diffable, and free of ARIA attributes. Every fix belongs in one of:

- **`builder/template.mjs`** — page skeleton, sidebar, search, breadcrumbs, footer.
- **`builder/render.mjs`** — markdown-it renderer rules, post-processing (admonitions, tables, anchor headings, code blocks). This file already has custom `th_open`, `td_open`, `table_open` rules that inject wrapper divs and normalise attributes — the same pattern extends to `scope`, `role`, etc.
- **SCSS files** — focus indicators, motion, contrast.
- **JS files** — `just-the-docs.js`, `theme-switch.js`, `svg-inline.js` — ARIA state management, live regions, focus trapping, keyboard handlers.

If a fix *cannot* be expressed in the pipeline — i.e. it requires per-page semantic knowledge that the builder can't infer — document it as a content-authoring guideline in WIP.md and apply to affected pages in a separate pass. But aim to avoid this.

---

## Implementation status

All five phases are **complete**, Phase 3 included. The site builds clean and `check.bat`'s axe-core scan (`scripts/check_a11y.mjs`) reports **0 violations** across all six sample pages in both themes at two viewports — now with the `target-size` rule enabled (see 3.2). The WCAG 2.2 AA chrome and contrast work landed in three commits, with the Phase 3 polish (3.2, 3.3, 3.4) following after:

- **`c9f2dfe`** *WCAG 2.2 AA accessibility improvements* — Phase 1 (1.1–1.8) and Phase 2 (2.1–2.7) in full, plus Phase 4 (the axe-core check and its `check.bat` wiring). Also removed the redundant search-input `tabindex` (3.5) as a side effect of the combobox rework.
- **`3db9794`** *Fix WCAG 1.4.3 contrast in both themes; unblind the a11y checker* — Phase 3.1 to WCAG 1.4.3 AA in both themes, and it **unblinded the checker**: `check_a11y.mjs` had been scanning `_site/` over `file://`, where the root-absolute asset URLs never resolve — every page was audited unstyled, so every contrast result was a meaningless black-on-white pass. It now scans `_site-offline/`, both themes, two viewports. Same commit fixed a new **WCAG 2.1.1** item (see 1.9 — horizontally scrolling code blocks are now keyboard-focusable) and moved syntax-token contrast clamping into `builder/highlight-theme.mjs` at emit time.
- **`0813181`** *Raise text contrast to WCAG AAA (1.4.6) in both themes* — Phase 3.1 raised from AA to **WCAG 1.4.6 AAA** (7:1 body / 4.5:1 large text) in both themes. This resolved the previously-noted "known residual" active-nav-gradient defect by darkening the light-theme link colour to `$purple-200`.

**Phase 3 polish — DONE (this pass):** 3.2 (target size), 3.3 (heading-level skip), 3.4 (breadcrumb separator). None were AA blockers; details inline below. The measurement that had been "needed in-browser" for 3.2 was done with axe-core's own viewport emulation (the puppeteer scan renders the offline tree's relative CSS for real, unlike the app's `file://` snapshot which loads unstyled) — the only real target-size failures were the SVG diagram buttons, now fixed, so the rule is enabled.

**Phase 5 — DONE:** the 3-state (system / light / dark) theme toggle now replaces the old 2-state light-default toggle, with system as the default and no-JS progressive enhancement (dark applies via `@media (prefers-color-scheme: dark)` with no script). Shipped with the interim rule-set duplication; the CSS-custom-properties refactor that removes it stays tracked in [FUTURE-WORK.md](FUTURE-WORK.md) (B19).

**Baseline for the a11y scan:** `check_a11y.mjs` exits 0 with 0 violations and ~20 *incomplete* ("needs review") results. Those incompletes are all colour-contrast cases axe-core cannot compute programmatically — the active-nav gradient background, SVG `<text>` in the BuildInfo charts, and syntax-highlight `<span>`s over the tinted code-block background. Each was verified by hand during the Phase 3 contrast passes (syntax tokens are clamped to 4.5:1 at emit time). An incomplete is not a violation; the run is clean.

Per-item status is annotated inline below (`— DONE` on completed items, with the implementing commit noted where it helps).

---

## Phase 1 — Keyboard & semantic blockers

These are real WCAG failures: keyboard users and/or screen reader users cannot operate parts of the site.

### 1.1  Theme toggle: `<span>` → `<button>` — DONE (`c9f2dfe`)

**WCAG:** 2.1.1 Keyboard, 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:585`, `docs/assets/js/theme-switch.js`  
**Problem:** `<span id="theme-toggle" class="site-button">` is not focusable, has no role, no accessible name.  
**Fix:** Change to `<button type="button" id="theme-toggle" class="site-button btn-reset" aria-label="Toggle dark mode">`. In `theme-switch.js`, update `aria-label` to reflect current state ("Switch to dark mode" / "Switch to light mode") on each toggle. The sun/moon SVG symbols already have `<title>` elements, but the `<use>` reference doesn't expose them reliably — the explicit `aria-label` on the button is the canonical name.

### 1.2  Nav expanders: `aria-pressed` → `aria-expanded` — DONE (`c9f2dfe`)

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:363`, `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Nav expander buttons use `aria-pressed="false"` but they disclose/hide child content — that's the `aria-expanded` pattern.  
**Fix:** In `template.mjs`, emit `aria-expanded="false"` instead of `aria-pressed="false"`. In `just-the-docs.js`'s click handler, toggle `aria-expanded` between `"true"` and `"false"`. The per-page `<style id="jtd-nav-activation">` CSS also pre-expands branches for the active page — `template.mjs`'s `renderNavActivation()` should emit `aria-expanded="true"` on those nodes via the same CSS-disabled/JS-takeover pattern, or the JS `activateNav()` path should set it.

### 1.3  Menu button: `aria-pressed` → `aria-expanded` — DONE (`c9f2dfe`)

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:302`, `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Same disclosure pattern as 1.2. `aria-pressed` is wrong for a hamburger menu.  
**Fix:** Emit `aria-expanded="false"`. JS toggles it alongside the `.nav-open` class. Also add `aria-controls="site-nav"` to link the button to the sidebar `<nav>`.  
**Done:** Menu button now emits `aria-expanded` + `aria-controls="site-nav"`; the JS toggles it (see 2.4 for the paired focus handling).

### 1.4  SVG action controls: `<a href="#">` → `<button>` — DONE (`c9f2dfe`)

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs` (SVG inline-wrap rendering), `docs/assets/js/svg-inline.js`  
**Problem:** Download-SVG, Copy-SVG, Download-PNG, Copy-PNG are `<a href="#">` with `data-action` — semantically navigation, actually actions. Not announced as buttons; `href="#"` causes spurious history entries.  
**Fix:** Change to `<button type="button" class="btn-reset" data-action="..." data-filename="...">`. Update `svg-inline.js` to target `button[data-action]` instead of `a[data-action]`. Add accessible names: "Download SVG", "Copy SVG", "Download PNG", "Copy PNG".

### 1.5  SVG zoom: keyboard access + focus trap — DONE (`c9f2dfe`)

**WCAG:** 2.1.1 Keyboard, 2.4.11 Focus Not Obscured (Minimum)  
**Files:** `docs/assets/js/svg-inline.js`, possibly `docs/_sass/custom/custom.scss`  
**Problem:** `.svg-container` is a `<div>` — not focusable, no keyboard activation. When zoomed (fixed full-viewport overlay), focus can Tab behind the overlay; only Escape closes it.  
**Fix:**
1. Add `tabindex="0"` and `role="button"` to `.svg-container` in template.mjs, or better: add a dedicated "Zoom diagram" button inside `.svg-inline-wrap`.
2. In `svg-inline.js`, on zoom-in: trap focus within the overlay (the container + a close button); on zoom-out: restore focus to the trigger element.
3. Add a visible close button ("×" or "Close") inside the zoomed overlay for pointer users too — relying solely on click-anywhere-to-close is undiscoverable.

### 1.6  `btn-reset` focus styles — DONE (`c9f2dfe`)

**WCAG:** 2.4.7 Focus Visible  
**File:** `builder/vendor/just-the-docs/_sass/buttons.scss:122-130`  
**Problem:** `.btn-reset` strips all visual styling (background, border, border-radius) but provides no `:focus` rule. Elements using it — menu button, nav expanders — are invisible to keyboard users.  
**Fix:** Add a `:focus-visible` rule to `.btn-reset`:
```scss
.btn-reset {
  // ...existing resets...
  &:focus-visible {
    outline: 2px solid $link-color;
    outline-offset: 2px;
  }
}
```
Using `:focus-visible` rather than `:focus` avoids showing the ring on mouse clicks.

### 1.7  Search input focus indicator — DONE (`c9f2dfe`)

**WCAG:** 2.4.7 Focus Visible  
**File:** `builder/vendor/just-the-docs/_sass/search.scss:65-66`  
**Problem:** `outline: 0` with only an icon colour change — not a visible focus indicator for the input itself.  
**Fix:** Replace `outline: 0` with a visible ring:
```scss
&:focus {
  outline: 2px solid $link-color;
  outline-offset: -2px;
  // keep the icon colour change too
}
```

### 1.8  Copy-code button focus indicator — DONE (`c9f2dfe`)

**WCAG:** 2.4.7 Focus Visible  
**File:** `builder/vendor/just-the-docs/_sass/code.scss:101-108`  
**Problem:** `:active { outline: none }` and `:focus { opacity: 1 }` — opacity change alone is not a focus indicator.  
**Fix:** Add `:focus-visible` with an outline, remove `:active { outline: none }`:
```scss
&:focus-visible {
  opacity: 1;
  outline: 2px solid $link-color;
  outline-offset: 2px;
}
```

### 1.9  Code blocks: focusable scroll region — DONE (`3db9794`)

**WCAG:** 2.1.1 Keyboard  
**Files:** `builder/vendor/just-the-docs/_sass/layout.scss`, `docs/_sass/custom/custom.scss`  
**Problem:** Code blocks scroll horizontally on narrow viewports. A scrollable region that a keyboard user cannot focus is unreachable — there is no way to scroll it without a pointer.  
**Fix:** `div.highlight` is made focusable with a visible focus ring, so keyboard users can Tab to a wide code block and scroll it with the arrow keys. Not part of the original plan — surfaced by the unblinded checker at the mobile viewport during the `3db9794` pass.

---

## Phase 2 — ARIA, announcements, content patterns

### 2.1  Search results: ARIA combobox / listbox pattern — DONE (`c9f2dfe`)

**WCAG:** 4.1.2 Name/Role/Value, 1.3.1 Info and Relationships  
**File:** `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Arrow-key navigation through search results adds `.active` visually but is invisible to screen readers. No `role="listbox"`, no `role="option"`, no `aria-activedescendant`.  
**Fix:** When results render:
- Set `role="listbox"` on `#search-results` (or the inner `<ul>`).
- Set `role="option"` + unique `id` on each result `<li>`.
- Set `aria-activedescendant` on `#search-input` to the active item's `id`.
- Set `aria-expanded="true"` on `#search-input` when results are visible, `"false"` when hidden.
- Add `aria-haspopup="listbox"` to `#search-input`.

**Done:** The input carries `role="combobox"` + `aria-haspopup="listbox"` + `aria-expanded`, the results list gets `role="listbox"`, and `aria-activedescendant` tracks the arrow-key selection.

### 2.2  Live regions for status messages — DONE (`c9f2dfe`)

**WCAG:** 4.1.3 Status Messages  
**Files:** `just-the-docs.js`, `builder/template.mjs`  
**Problem:** Three status changes have no screen reader announcement:
1. Search result count ("5 results for 'Dim'") — visual only.
2. Copy-code success (icon swaps from clipboard to checkmark) — visual only.
3. Theme change (sun ↔ moon icon) — visual only.

**Fix:** Add a shared `aria-live="polite"` status region in the template (a visually-hidden `<div>`). On each event, set its `textContent`:
- Search: `"${n} results"` or `"No results"`.
- Copy: `"Copied to clipboard"`.
- Theme: `"Switched to dark mode"` / `"Switched to light mode"`.

**Done:** `template.mjs` emits `<div id="a11y-status" class="sr-only" aria-live="polite" aria-atomic="true">`; the search, copy-code, and theme-switch handlers write to it.

### 2.3  Table `<th scope="col">` — DONE (`c9f2dfe`)

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/render.mjs:284`  
**Problem:** `<th>` elements lack `scope` — screen readers can't associate cells with headers.  
**Fix:** Extend the existing `th_open` renderer rule to inject `scope="col"` when the `<th>` is inside `<thead>` (the overwhelmingly common case in this site's markdown tables). The token's nesting context provides this: `th_open` tokens inside a `thead_open`…`thead_close` range get `scope="col"`. No markdown changes needed — this is purely a renderer-rule extension following the exact same pattern as the existing `styleSpace()` function.

### 2.4  Mobile sidebar focus management — DONE (`c9f2dfe`)

**WCAG:** 2.4.11 Focus Not Obscured (Minimum)  
**File:** `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Menu button toggles `.nav-open` but focus is not moved into the sidebar or trapped there. Tab can escape behind the overlay on mobile.  
**Fix:** On menu open: move focus to `#site-nav` (or its first link). On menu close: return focus to `#menu-button`. Optionally trap Tab within the sidebar while open (wrap from last to first link). Ensure Escape closes the sidebar.  
**Done:** Open moves focus to the first sidebar link; close returns focus to `#menu-button`; Escape closes the menu. The *optional* full Tab-wrap trap was not added — the required parts (focus-in, focus-return, Escape) are in place, which is sufficient for AA.

### 2.5  `prefers-reduced-motion` — DONE (`c9f2dfe`)

**WCAG:** 2.3.3 Animation from Interactions  
**Files:** SCSS (transitions on sidebar, search overlay, nav), JS (SVG zoom)  
**Problem:** No `prefers-reduced-motion` media query anywhere in the codebase. All transitions run unconditionally.  
**Fix:** Add a global reduced-motion override in a shared SCSS partial:
```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
This is the nuclear approach; a targeted version could override only the specific `transition:` declarations in `search.scss`, `layout.scss`, and `navigation.scss`. Either is acceptable for AA.

### 2.6  Admonition semantic role — DONE (`c9f2dfe`)

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/render.mjs` (`rewriteAdmonitions()`)  
**Problem:** `<div class="markdown-alert markdown-alert-note">` has no ARIA role. Screen readers see a generic `<div>`.  
**Fix:** Add `role="note"` to NOTE / TIP / IMPORTANT admonitions, `role="alert"` to WARNING / CAUTION. The role goes on the outer `<div>`. This is a one-line change in the template string in `rewriteAdmonitions()`.

### 2.7  Main-content footer landmark — DONE (`c9f2dfe`)

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/template.mjs`  
**Problem:** There are two `<footer>` elements — one in `.side-bar` (site credits) and one inside `#main-content` (copyright, "Edit on GitHub", "Back to top"). Neither has a `role` attribute. The sidebar one is fine as a sectioning footer, but the main one is the page's true `contentinfo` landmark.  
**Fix:** Add `role="contentinfo"` to the `<footer>` inside `#main-content`. Optionally add `aria-label="Site"` to the sidebar footer to distinguish the two for screen reader landmark navigation.  
**Done:** The main footer emits `role="contentinfo"`. (The `role="banner"` on `.site-header`, `role="search"` on the search wrapper, and `role="img"` + `aria-label` on the CSS-background site logo already existed — they came in with the original template port in `2e54c6b`, not with the a11y work.)

---

## Phase 3 — Lower-severity / polish

### 3.1  Colour contrast — DONE (AA in `3db9794`, AAA in `0813181`)

**WCAG:** 1.4.3 Contrast (Minimum), then 1.4.6 Contrast (Enhanced)  
**Outcome:** The Phase 4 scan was reporting clean because it loaded `_site/` over `file://`, where the root-absolute asset URLs never resolve — every page was audited unstyled. Pointing it at `_site-offline/` and adding a dark-mode pass surfaced the real defects (`3db9794`), all fixed to **AA**: sidebar footer, main-footer secondary text, the dark link colour, `.btn-reset` inheriting the UA's black, the admonition palette (the gem ships GitHub's *dark* colours), and the syntax-highlight tokens (now clamped at emit time in `builder/highlight-theme.mjs`).

The site was then taken to **AAA** (`0813181`):
- **Body text** `$grey-dk-100` `#5c5962` → `#54515a` (6.35/6.86:1 → 7.20/7.77:1); one token covers body prose, code-block text, child nav links, the sidebar footer, and footer meta. Dark body text was already 11.66:1.
- **Links** light `$purple-000` → `$purple-200` (5.03/4.66/4.30 → 9.46/8.76/8.09:1); dark `#58a6ff` → `#8cc2ff` (5.94 → 8.06:1). This also picked up a stray `#7253ed` that still coloured breadcrumbs.
- **Secondary text** dark `#959396` → `#b6b4b7` (4.92 → 7.30:1). Hierarchy now comes from `font-weight: 350` — a real face on all three system stacks — rather than from a dimmer colour, in both themes.
- **Dark `$code-background-color`** unified to `#212121`. The old `#31343f` was lighter than the `.language-tb` override, so tokens clamped against `#212121` failed on js/json/yaml/html blocks and on inline code inside links — 17 real violations on `Documentation/Development/Builder`.

Syntax tokens stay clamped at 4.5:1; 7:1 would flatten the IDE palette.

**Known residual — RESOLVED (`0813181`):** the earlier note flagged `.nav-list-link.active` at 4.30:1 where its right-edge gradient is most opaque, needing a darker light-theme `$link-color` ("a brand decision"). That decision was made: `$purple-200` is 8.09:1 even at the opaque end of the gradient.

> [!NOTE]
> The a11y scan still emits *incomplete* (not violation) contrast results for the active-nav gradient, SVG `<text>`, and syntax spans over the tinted code background — axe-core cannot compute contrast against a gradient, an SVG fill, or a nested background programmatically. These were verified by hand and by the emit-time clamp; they are not open defects.

### 3.2  Target size (24×24 CSS px minimum) — DONE

**WCAG:** 2.5.8 Target Size (Minimum)  
**Files:** `docs/_sass/custom/custom.scss` (`.svg-controls`), `scripts/check_a11y.mjs`  
**Measurement:** done with axe-core's own viewport emulation (its `target-size` rule implements the 24 px minimum plus the spacing and inline exceptions), not the app's `file://` preview — that preview renders the offline tree unstyled, so every hand-measurement against it was meaningless. Run in earnest across all six sample pages × both themes × both viewports, the *only* failures were the inline-SVG diagram control buttons (Download SVG / Copy SVG / Download PNG / Copy PNG / Zoom) at the mobile viewport. Nav expanders, nav links, theme toggle, menu button, copy-code button, and the search input all pass (24 px or the spacing exception). The checker's old blanket `"target-size": { enabled: false }` — justified by a "sidebar nav links are < 24px" note — was therefore an overcorrection; real emulation never flags them.  
**Fix:** the SVG control buttons were `btn-reset` (zero padding) text buttons ~21 px tall, `float: right` — which also *reversed* their visual order against DOM/focus order, and on a narrow column wrapped into rows spaced tighter than 24 px. `.svg-controls` is now a wrapping flexbox (`justify-content: flex-end`, `gap`) with `min-height: 24px` buttons: each clears the 24 px floor outright, wrap spacing is clean, and focus order now matches visual order. With that fixed, the `target-size` rule is **enabled** in `check_a11y.mjs` (blanket disable removed) as a live guard — the full scan stays at 0 violations.

### 3.3  Heading level skip (chapter `h1` → section `h3`) — DONE

**WCAG:** 1.3.1 Info and Relationships (heading-order; a best-practice advisory, not an AA failure)  
**File:** `builder/render.mjs` (`headingLevelNormalizePlugin`)  
**Finding:** the injected children-nav "Table of contents" `<h2>` was never the problem — it always follows the page `<h1>`. The real pattern (measured: ~389 built pages) is the reference-page house style `# Chapter` then `### Section`, skipping `##`. That skip is deliberate: it keeps GitHub's own rendering of the raw markdown at a modest heading size without pushing styling into the source. Multiple `<h1>` per page is also intentional — an `h1` is a *chapter*, and a page may hold more than one — and is valid HTML that axe does not flag.  
**Fix (pipeline, no markdown touched):** a markdown-it core rule, running before `header-id` and `toc`, raises sub-chapter headings one level (`h3`→`h2`, `h4`→`h3`, …) **only** on a page that uses `h1` and `h3` but no `h2` — the unambiguous house-style shape. Any page that already uses `h2` is its author's own structure and is left exactly as written (maintainer's rule: "fire only when h1 and h3 are present and h2 is not; otherwise disabled"). Heading ids are text-derived, so anchors and the in-page ToC are unaffected. Result: built-site heading skips dropped 389 → 5, and the 5 remaining are mixed `##`/`###` pages the rule intentionally skips. GitHub keeps its `###`; on the site a promoted section renders at h2 size (≈15.75 px vs the 28 px page `h1`), which reads as a normal section heading. The house style is **deprecated**, not blessed: the WIP.md page template now uses `##` for sections and new content must follow it, so this rule is a self-retiring migration bridge (a page stops matching the trigger once it is rewritten to use `##`) that avoids churning ~389 files in one diff. The mixed `##`/`###` pages it leaves alone (FAQ, Do-Loop, Painting, Windowless, Fusion) are candidates for the same hand-cleanup over time.

### 3.4  Breadcrumb separator — DONE

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/vendor/just-the-docs/_sass/navigation.scss`  
**Problem:** `::after { content: "/" }` is exposed to assistive tech — most screen readers announce pseudo-element content, so a redundant "slash" is read between crumbs. The `<nav aria-label="Breadcrumb"><ol>` structure already communicates order.  
**Fix:** the separator now uses the CSS `content` alt-text syntax to hide itself from AT while staying visible:
```scss
content: "/";        // fallback: browsers without alt-text syntax (Safari < 17.4) show "/" as before
content: "/" / "";   // modern: renders "/", exposes "" to the accessibility tree
```
A pseudo-element cannot take `aria-hidden` (it is not a DOM node), so the alt-text descriptor is the CSS-only way; the plain-string first declaration is the graceful fallback.

### 3.5  Redundant `tabindex="0"` on search input — DONE (`c9f2dfe`)

**File:** `builder/template.mjs:554`  
**Problem:** `<input>` is natively focusable; `tabindex="0"` is harmless noise.  
**Fix:** Remove `tabindex="0"` from the search input.  
**Done:** Removed as part of the 2.1 combobox rework — the search input now carries `role="combobox"` and the ARIA attributes with no `tabindex`.

---

## Phase 4 — Automated tooling — DONE (`c9f2dfe`, corrected in `3db9794`)

### Approach: axe-core post-build check

`scripts/check_a11y.mjs` drives `puppeteer` and injects `axe-core` (`node_modules/axe-core/axe.min.js`, then `axe.run`) to scan built pages, and is wired into `check.bat` after the link check. The ruleset is `["wcag2a", "wcag2aa", "wcag22aa"]`.

**Correction (`3db9794`):** the script originally scanned `_site/` over `file://`, where the online tree's root-absolute asset URLs (`/assets/css/…`) never resolve — every page loaded unstyled and every contrast result was a meaningless black-on-white pass. It now scans **`_site-offline/`** (relative asset paths, renders for real), in **both themes** (dark mode is a separate stylesheet with its own palette) at **two viewports** (defects such as horizontally scrolling code blocks only appear once the layout is narrow enough to overflow).

**Sample pages** (`SAMPLE_PAGES` in the script — covers the content patterns):
1. `/index.html` — homepage
2. `/tB/Core/Dim.html` — code blocks + definition lists
3. `/tB/Modules/Interaction/index.html` — tables
4. `/Documentation/Development/BuildInfo.html` — SVG charts
5. `/tB/Core/Select-Case.html` — code blocks + admonitions
6. `/404.html`

**Configuration:**
- WCAG 2.2 AA ruleset
- Reports violations and incomplete checks
- Exit code 1 on any violation (currently 0 violations)

**Contrast-specific tooling:** axe-core's built-in colour-contrast rules cover most cases; the gradient / SVG / nested-background cases it can only mark *incomplete* were verified manually and, for syntax tokens, clamped at emit time in `builder/highlight-theme.mjs`.

---

## Phase 5 — Theme toggle: 3-state, system default, progressive enhancement — DONE

**Status: DONE.** Implemented and verified (full cycle, `localStorage` persistence, no-flash on reload, no-JS system default, forced-light over a dark OS, and `check.bat` clean at 0 violations in both themes). Key pieces: the `dark-theme` mixin in `docs/_sass/custom/_theme.scss`; the `data-theme` attribute set by the no-flash `<head>` script + `docs/assets/js/theme-toggle.js` (which replaces `theme-switch.js`); and the gantt / syntax-highlight generators plus `check_a11y.mjs` updated to match. The generated dark block ships twice (media query + `[data-theme="dark"]`); the token refactor that removes the duplication is [FUTURE-WORK.md](FUTURE-WORK.md) B19.

Replaces today's 2-state light/dark toggle (`docs/assets/js/theme-switch.js`), which defaults to **light** and ignores the OS entirely — there is no `prefers-color-scheme` anywhere, so a dark-OS visitor gets light until they click, and with JS off they are always light. The new control is a **3-state cycle — system → light → dark → system, defaulting to system** — built as progressive enhancement so the system default works with **no JS**.

**Decided:** a single cycling **icon button** in the header (parity with the current control), not a segmented / radio group.

### 5.1  State model & progressive enhancement

**Files:** `builder/template.mjs` (head no-flash script + button markup), `docs/assets/js/theme-toggle.js` (new, replaces `theme-switch.js`)  
**Model:**
- `localStorage['theme']` = `'light'` | `'dark'` for an explicit override; **absent = follow system** (returning to system does `removeItem`).
- `<html data-theme="light" | "dark">` mirrors an explicit override; **absent = follow system**, so the CSS media query keeps governing and re-resolves on OS change with no `matchMedia` listener. The vestigial `light-mode` / `dark-mode` classes are dropped in favour of `data-theme`.
- **No-flash:** the existing inline `<head>` script (`template.mjs:119`) currently adds `.dark-mode` from `localStorage`. Change it to set `document.documentElement.dataset.theme` from the stored `'light'`/`'dark'` value (in `try/catch`) before first paint. It must agree with the client script on the `'theme'` key.
- **Client script:** a deferred IIFE reads the stored choice, cycles the three modes on click, sets/removes `data-theme` + persists, sets `data-theme-choice` on the button (drives which icon shows), updates the accessible name and the live region, then reveals the button. The button ships `hidden` → with JS off there is no dead control and `prefers-color-scheme` governs.

### 5.2  CSS selector strategy (no-JS system support)

**WCAG:** 1.4.3 / 1.4.6 (honouring the user's system colour preference)  
**Files:** `docs/assets/css/just-the-docs-dark.scss`, `builder/scss.mjs`, plus the hand-written `html.dark-mode` rules in `docs/_sass/custom/admonitions.scss`, `docs/_sass/custom/custom.scss`, `docs/assets/css/just-the-docs-head-nav.css`  
**Problem:** dark styles are gated only by the `html.dark-mode` **class**, which only JS can add. Without JS the media query is the only signal, so the dark styles must also exist under `@media (prefers-color-scheme: dark)`.  
**Fix:** migrate the scoping from the class to the `data-theme` attribute and emit the dark styles under both contexts:
```css
/* light = root default (unchanged) */
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) { /* …dark… */ color-scheme: dark; }  /* system, unless forced light */
}
html[data-theme="dark"]  { /* …dark… */ color-scheme: dark; }          /* explicit dark, any OS */
html[data-theme="light"] { color-scheme: light; }                      /* explicit light */
```
A media query adds no specificity, so `html[data-theme="dark"]` (0,1,1) and the `:not([data-theme="light"])` guard are what let an explicit choice beat the OS default.

**Interim vs clean:** just-the-docs themes by duplicating whole rule sets, so the compiled dark block has to be emitted **twice** (media + attribute). The repetition is identical text, so gzip/brotli crush the wire cost. The clean alternative — a CSS-custom-properties token layer where only the colour variables repeat — is a larger SCSS refactor tracked in [FUTURE-WORK.md](FUTURE-WORK.md) (B19); do that first if preferred, otherwise ship with duplication. Wrap the few hand-written dark overrides in a Sass mixin so they have a single source even while emitted under both selectors.

**Build risk:** whether `meta.load-css("modules-dark")` can be emitted twice in one compilation (the combined-file header warns that `$with` writes to the shared module cache). If it cannot, produce the second copy from a scoped placeholder via string duplication in `scss.mjs`, or a third `sass.compile()`.

### 5.3  Accessible name reflects state

**WCAG:** 4.1.2 Name/Role/Value, 4.1.3 Status Messages  
**Files:** `builder/template.mjs`, `docs/assets/js/theme-toggle.js`  
**Problem:** the current `aria-label` names the *action* ("Switch to dark mode"); the requirement is to indicate the current *state*, and `aria-pressed` cannot model three states.  
**Fix:** the state lives in the **accessible name** — `aria-label = "Theme: Follow system" | "Theme: Light" | "Theme: Dark"`, set on the initial silent sync *and* on each click, so a screen reader landing on the button always hears the current mode. Announce the change through the shared `#a11y-status` live region (Phase 2.2). Keep `type="button"`. (In system mode the resolved light/dark is conveyed by the icon and need not be appended to the name.)

### 5.4  Icons

**Files:** `builder/template.mjs` (SVG symbol sprite), `docs/_sass/custom/custom.scss`  
Three icons — **system/auto**, **sun**, **moon**. The sprite already has `#svg-sun` and `#svg-moon`; add a system/auto glyph. The button carries `data-theme-choice`; CSS shows the matching icon (`[data-theme-choice="system"] [data-icon="system"] { … }`, etc.). Icons are decorative (`aria-hidden="true"`) — the name carries the meaning.

### 5.5  Target size, focus, contrast

**WCAG:** 2.5.8 Target Size (Minimum), 2.4.7 Focus Visible, 1.4.11 Non-text Contrast  
The button inherits the `.btn-reset` `:focus-visible` ring (Phase 1.6); confirm it is ≥ 24×24 CSS px (Phase 3.2) and that the icon / any border meets 3:1 UI contrast in both themes.

---

## Execution plan

| Order | Phase | Items | Status | Markdown files touched? |
|-------|-------|-------|--------|------------------------|
| 1 | Phase 1 | 1.1–1.9 | **Done** (`c9f2dfe`; 1.9 `3db9794`) | **No** — all in template.mjs, JS, SCSS |
| 2 | Phase 4 | Automated tooling | **Done** (`c9f2dfe`, fixed `3db9794`) | **No** — new script + package.json |
| 3 | Phase 2 | 2.1–2.7 | **Done** (`c9f2dfe`) | **No** — all in render.mjs, JS, SCSS, template.mjs |
| 4 | Phase 3 | 3.1, 3.5 | **Done** (`3db9794`, `0813181`, `c9f2dfe`) | **No** |
| 5 | Phase 3 | 3.2, 3.3, 3.4 | **Done** | **No** — custom.scss, render.mjs, navigation.scss, check_a11y.mjs |
| 6 | Phase 5 | Theme toggle (5.1–5.5) | **Done** | **No** — template.mjs, JS, SCSS, scss.mjs |

The "Markdown files touched?" column is the key constraint: every row is **No**. All fixes live in the builder pipeline.
