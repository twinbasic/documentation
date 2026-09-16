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

## Phase 1 — Keyboard & semantic blockers

These are real WCAG failures: keyboard users and/or screen reader users cannot operate parts of the site.

### 1.1  Theme toggle: `<span>` → `<button>`

**WCAG:** 2.1.1 Keyboard, 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:585`, `docs/assets/js/theme-switch.js`  
**Problem:** `<span id="theme-toggle" class="site-button">` is not focusable, has no role, no accessible name.  
**Fix:** Change to `<button type="button" id="theme-toggle" class="site-button btn-reset" aria-label="Toggle dark mode">`. In `theme-switch.js`, update `aria-label` to reflect current state ("Switch to dark mode" / "Switch to light mode") on each toggle. The sun/moon SVG symbols already have `<title>` elements, but the `<use>` reference doesn't expose them reliably — the explicit `aria-label` on the button is the canonical name.

### 1.2  Nav expanders: `aria-pressed` → `aria-expanded`

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:363`, `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Nav expander buttons use `aria-pressed="false"` but they disclose/hide child content — that's the `aria-expanded` pattern.  
**Fix:** In `template.mjs`, emit `aria-expanded="false"` instead of `aria-pressed="false"`. In `just-the-docs.js`'s click handler, toggle `aria-expanded` between `"true"` and `"false"`. The per-page `<style id="jtd-nav-activation">` CSS also pre-expands branches for the active page — `template.mjs`'s `renderNavActivation()` should emit `aria-expanded="true"` on those nodes via the same CSS-disabled/JS-takeover pattern, or the JS `activateNav()` path should set it.

### 1.3  Menu button: `aria-pressed` → `aria-expanded`

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs:302`, `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Same disclosure pattern as 1.2. `aria-pressed` is wrong for a hamburger menu.  
**Fix:** Emit `aria-expanded="false"`. JS toggles it alongside the `.nav-open` class. Also add `aria-controls="site-nav"` to link the button to the sidebar `<nav>`.

### 1.4  SVG action controls: `<a href="#">` → `<button>`

**WCAG:** 4.1.2 Name/Role/Value  
**Files:** `builder/template.mjs` (SVG inline-wrap rendering), `docs/assets/js/svg-inline.js`  
**Problem:** Download-SVG, Copy-SVG, Download-PNG, Copy-PNG are `<a href="#">` with `data-action` — semantically navigation, actually actions. Not announced as buttons; `href="#"` causes spurious history entries.  
**Fix:** Change to `<button type="button" class="btn-reset" data-action="..." data-filename="...">`. Update `svg-inline.js` to target `button[data-action]` instead of `a[data-action]`. Add accessible names: "Download SVG", "Copy SVG", "Download PNG", "Copy PNG".

### 1.5  SVG zoom: keyboard access + focus trap

**WCAG:** 2.1.1 Keyboard, 2.4.11 Focus Not Obscured (Minimum)  
**Files:** `docs/assets/js/svg-inline.js`, possibly `docs/_sass/custom/custom.scss`  
**Problem:** `.svg-container` is a `<div>` — not focusable, no keyboard activation. When zoomed (fixed full-viewport overlay), focus can Tab behind the overlay; only Escape closes it.  
**Fix:**
1. Add `tabindex="0"` and `role="button"` to `.svg-container` in template.mjs, or better: add a dedicated "Zoom diagram" button inside `.svg-inline-wrap`.
2. In `svg-inline.js`, on zoom-in: trap focus within the overlay (the container + a close button); on zoom-out: restore focus to the trigger element.
3. Add a visible close button ("×" or "Close") inside the zoomed overlay for pointer users too — relying solely on click-anywhere-to-close is undiscoverable.

### 1.6  `btn-reset` focus styles

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

### 1.7  Search input focus indicator

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

### 1.8  Copy-code button focus indicator

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

---

## Phase 2 — ARIA, announcements, content patterns

### 2.1  Search results: ARIA listbox pattern

**WCAG:** 4.1.2 Name/Role/Value, 1.3.1 Info and Relationships  
**File:** `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Arrow-key navigation through search results adds `.active` visually but is invisible to screen readers. No `role="listbox"`, no `role="option"`, no `aria-activedescendant`.  
**Fix:** When results render:
- Set `role="listbox"` on `#search-results` (or the inner `<ul>`).
- Set `role="option"` + unique `id` on each result `<li>`.
- Set `aria-activedescendant` on `#search-input` to the active item's `id`.
- Set `aria-expanded="true"` on `#search-input` when results are visible, `"false"` when hidden.
- Add `aria-haspopup="listbox"` to `#search-input`.

### 2.2  Live regions for status messages

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

### 2.3  Table `<th scope="col">`

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/render.mjs:284`  
**Problem:** `<th>` elements lack `scope` — screen readers can't associate cells with headers.  
**Fix:** Extend the existing `th_open` renderer rule to inject `scope="col"` when the `<th>` is inside `<thead>` (the overwhelmingly common case in this site's markdown tables). The token's nesting context provides this: `th_open` tokens inside a `thead_open`…`thead_close` range get `scope="col"`. No markdown changes needed — this is purely a renderer-rule extension following the exact same pattern as the existing `styleSpace()` function.

### 2.4  Mobile sidebar focus management

**WCAG:** 2.4.11 Focus Not Obscured (Minimum)  
**File:** `builder/vendor/just-the-docs/assets/js/just-the-docs.js`  
**Problem:** Menu button toggles `.nav-open` but focus is not moved into the sidebar or trapped there. Tab can escape behind the overlay on mobile.  
**Fix:** On menu open: move focus to `#site-nav` (or its first link). On menu close: return focus to `#menu-button`. Optionally trap Tab within the sidebar while open (wrap from last to first link). Ensure Escape closes the sidebar.

### 2.5  `prefers-reduced-motion`

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

### 2.6  Admonition semantic role

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/render.mjs` (`rewriteAdmonitions()`)  
**Problem:** `<div class="markdown-alert markdown-alert-note">` has no ARIA role. Screen readers see a generic `<div>`.  
**Fix:** Add `role="note"` to NOTE / TIP / IMPORTANT admonitions, `role="alert"` to WARNING / CAUTION. The role goes on the outer `<div>`. This is a one-line change in the template string in `rewriteAdmonitions()`.

### 2.7  Main-content footer landmark

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/template.mjs`  
**Problem:** There are two `<footer>` elements — one in `.side-bar` (site credits) and one inside `#main-content` (copyright, "Edit on GitHub", "Back to top"). Neither has a `role` attribute. The sidebar one is fine as a sectioning footer, but the main one is the page's true `contentinfo` landmark.  
**Fix:** Add `role="contentinfo"` to the `<footer>` inside `#main-content`. Optionally add `aria-label="Site"` to the sidebar footer to distinguish the two for screen reader landmark navigation.

---

## Phase 3 — Lower-severity / polish

### 3.1  Colour contrast audit

**WCAG:** 1.4.3 Contrast (Minimum)  
**Approach:** Automated scan (see Phase 4). Specific concerns to spot-check:
- `opacity: 0.5` on `.search-result-doc-parent` — halves effective contrast.
- `$grey-dk-000` used for breadcrumb separators and secondary text.
- Dark-mode link colour vs. dark background.
- Syntax-highlight token colours (generated by `highlight-theme.mjs` from `Light.theme` / `Dark.theme`).

### 3.2  Target size (24×24 CSS px minimum)

**WCAG:** 2.5.8 Target Size (Minimum)  
**Elements to measure:** nav expander buttons, theme toggle, copy-code button, SVG action buttons (after Phase 1 conversion), search icon/button. Measure in the browser after the Phase 1 fixes land, since element types and padding will change.

### 3.3  Heading level integrity

**WCAG:** 1.3.1 Info and Relationships  
**Problem:** The children-nav section injects `<h2 class="text-delta">Table of contents</h2>` that may conflict with content heading levels. No build-time validation of heading order.  
**Approach:** Consider changing the injected "Table of contents" to a styled `<p>` or `<div>` with `role="heading" aria-level="2"` only when an `<h1>` exists in the content. Or add a build-time lint to the existing nav integrity check in `builder/nav.mjs` that warns when a page's content starts at `<h2>` or higher without an `<h1>`.

### 3.4  Breadcrumb separator

**WCAG:** 1.3.1 Info and Relationships  
**File:** `builder/vendor/just-the-docs/_sass/navigation.scss:225-229`  
**Problem:** `::after { content: "/" }` is exposed to assistive tech, creating redundant "slash" announcements between breadcrumb items. The `<ol>` structure already communicates order.  
**Fix:** Add `aria-hidden="true"` to a wrapper `<span>`, or hide the separator from AT with `content: "" / ""` (CSS `content` alt-text syntax, supported in modern browsers). Alternatively, since the `<nav aria-label="Breadcrumb"><ol>` pattern is well-established, most screen readers handle this correctly — verify with automated scan and real AT testing before changing.

### 3.5  Redundant `tabindex="0"` on search input

**File:** `builder/template.mjs:554`  
**Problem:** `<input>` is natively focusable; `tabindex="0"` is harmless noise.  
**Fix:** Remove `tabindex="0"` from the search input.

---

## Phase 4 — Automated tooling

### Approach: axe-core post-build check

Add `scripts/check_a11y.mjs` using `@axe-core/puppeteer` (or the lighter `axe-core` + `puppeteer` combination) to scan built pages in `_site/`.

**Pages to sample** (covers all content patterns):
1. Homepage (`/index.html`)
2. A deep reference page with code blocks + definition lists (e.g. `Dim`)
3. A page with tables (e.g. a module index)
4. A page with SVG diagrams
5. A page with admonitions
6. The 404 page

**Configuration:**
- WCAG 2.2 AA ruleset
- Report violations and incomplete checks
- Fail the script on any violation (exit code 1)

**Integration:**
- Add to `check.bat` after the link check: `node scripts/check_a11y.mjs`
- `devDependencies`: `axe-core`, `puppeteer` (or `puppeteer-core` + system Chromium)

**Alternative:** `pa11y` is simpler to set up (CLI tool, no code needed) but less configurable. `axe-core` gives more control over which rules run and how results are reported. Either works.

### Contrast-specific tooling

For Phase 3.1, a targeted contrast check can be done with:
- `axe-core`'s built-in colour contrast rules (covers most cases)
- Manual spot-checks with browser DevTools' contrast picker for the specific concerns listed in 3.1

---

## Execution plan

| Order | Phase | Items | Markdown files touched? |
|-------|-------|-------|------------------------|
| 1 | Phase 1 | 1.1–1.8 | **No** — all in template.mjs, JS, SCSS |
| 2 | Phase 4 | Automated tooling | **No** — new script + package.json |
| 3 | Phase 2 | 2.1–2.7 | **No** — all in render.mjs, JS, SCSS, template.mjs |
| 4 | Phase 3 | 3.1–3.5 | **No** (3.3 might add a build-time lint) |

The "Markdown files touched?" column is the key constraint: every row is **No**. All fixes live in the builder pipeline.
