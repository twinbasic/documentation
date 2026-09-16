# Future Work

Open follow-up tasks for the tbdocs builder. Phases 1-12 are shipped.

Phase 12 ([PLAN-12.md](PLAN-12.md)) shipped `--serve` watch mode, closing
the no-watch-mode deferrals from PLAN-10 §7.D4 and §7.D11.

When picking up a divergence-investigation entry: re-run the discovery
step listed under "Reproduce" before assuming the symptom is still
current -- code on either side of the divergence may have changed
since the entry was written.

---

## B. Deferred enhancements

### B6. Linkify exception list (PLAN-3 §15 / §D10) — dropped

**Routing**: → **drop** (2026-Q2). Postponed indefinitely; the
content convention of "wrap every URL in explicit `[text](url)`"
holds and the editorial pipeline catches stragglers. Re-add the
entry if a content shift makes bare URLs common in body prose.

**Trigger**: bare URLs start appearing in body prose that aren't
already wrapped in explicit `[text](url)` markdown.

markdown-it's `linkify` option is off because every existing URL on
the site is in explicit link form. Enabling it selectively (off
inside tables / code spans, on in prose) would handle the bare-URL
case but adds plugin complexity. Re-evaluate if the content
convention changes.

### B18. Phase 8 streaming write of book.html (PLAN-8 §13) — dropped

**Routing**: → **drop** ([PLAN-9.md §8.2](PLAN-9.md)). The trigger
is "a future book size where the in-memory string causes GC
pressure"; the current scale (~5 MB) is two orders of magnitude
below that threshold and the book hasn't grown materially in years.
Re-add the entry if the underlying constraint changes.

The current implementation builds the full ~5.5 MB book.html string
in memory and writes in one shot. A streaming write (Node's
`createWriteStream` + chunked `bookHtml.slice(...)` per article)
would reduce the peak memory footprint but add complexity.

### B19. Theme layer: refactor to CSS custom properties — deferred

**Routing**: → **defer**. Unblocks the clean form of the 3-state theme
toggle ([PLAN-a11y.md](PLAN-a11y.md) Phase 5): no-JS
`prefers-color-scheme` support without duplicating the whole dark rule
set. The toggle can ship before this lands (with the interim
duplication described in that phase); this refactor removes the
duplication.

**Trigger**: implementing the theme toggle's clean CSS path, or when
the duplicated dark block becomes a size / maintenance burden.

Today the dark theme is full **rule-set duplication**: every dark rule
is compiled under `html.dark-mode { @include
meta.load-css("modules-dark"); … }` in
`docs/assets/css/just-the-docs-dark.scss` and concatenated into
`just-the-docs-combined.css`, with a few hand-written dark rules in
`docs/_sass/custom/admonitions.scss`, `docs/_sass/custom/custom.scss`,
and `docs/assets/css/just-the-docs-head-nav.css`. That is how the
vendored just-the-docs theme is built.

Progressive-enhancement dark mode needs the dark styles available
under `@media (prefers-color-scheme: dark)` **and** under an explicit
`[data-theme="dark"]` override — two contexts, so the whole dark block
must be emitted twice. A **design-token layer** — light values on
`:root`, dark values restated only inside the media query and the
`[data-theme="dark"]` block, every component reading `var(--…)` —
makes that duplication cheap: only the small set of colour variables
repeats, not the full rule set. This is a substantial change to the
SCSS architecture and the two-compilation setup in `builder/scss.mjs`,
which is why it is tracked separately rather than bundled into the
toggle work.
