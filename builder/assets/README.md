# builder/assets/

Prebuilt theme assets the JS builder ships verbatim into the rendered
site at `<destRoot>/assets/`. Phase 5 (`write.mjs`) copies this whole
tree as a unit — no transformation, no per-file allow-list. Anything
added under here lands in every build.

The seven files are the just-the-docs chrome's runtime dependencies.
The HTML templates in `builder/template.mjs` reference each one by
literal path; reorganising the tree breaks the chrome.

These are the **online** variants — no offline-mode patches applied.
Phase 7 (`builder/offline.mjs`) copies them from `<destRoot>/assets/`
into `_site-offline/` and re-runs the offlinify rewrites itself.

## Inventory

The six files below were captured one-off from `docs/_site/assets/`
after a clean Jekyll build at cutover time; the legacy Jekyll source
set has since been retired, so the upstream sources are listed for
historical reference only. The syntax-highlight stylesheet
(`tb-highlight.css`) is a seventh asset that is **generated at build
time** by `builder/highlight-theme.mjs` from the vendored
`builder/themes/*.theme` source files — see [PLAN-11.md](../PLAN-11.md)
§5.1 (B2).

| File | Upstream source at extraction time | Notes |
|---|---|---|
| `css/just-the-docs-combined.css` | `docs/assets/css/just-the-docs-combined.scss` — pulled in `_sass/just-the-docs.scss.liquid` (via the just-the-docs gem) plus `_sass/custom/twinbasic-light` / `_sass/custom/twinbasic-dark` for the project's dark/light variants and `_sass/custom/custom.scss` / `_sass/custom/admonitions.scss` for site-specific tweaks | The site stylesheet. Compiled by Jekyll's Sass pipeline; vendored here to avoid a Sass dep in the JS build. |
| `css/just-the-docs-head-nav.css` | `docs/assets/css/just-the-docs-head-nav.css` — hand-written CSS with a small Liquid prelude (newline-capture) | Per-page nav-prefix override sheet. |
| `css/print.css` | `docs/assets/css/print.css` — hand-written self-contained print stylesheet | The `@media print` sheet; used by Phase 8's PDF tree too. |
| `js/just-the-docs.js` | just-the-docs gem 0.10.1 (`assets/js/just-the-docs.js`) | The runtime that wires the sidebar, search, copy-button click handler, dark-mode toggle. Patched in tree: the upstream `processCodeBlocks` DOM-injection step is retired (PLAN-11 B5 -- the button HTML is now server-rendered by `builder/highlight.mjs`); the click handler binds to those pre-rendered buttons instead. Re-apply when bumping the upstream gem version. |
| `js/theme-switch.js` | `docs/assets/js/theme-switch.js` — project-local script | The dark-mode toggle. |
| `js/vendor/lunr.min.js` | just-the-docs gem 0.10.1 (`assets/js/vendor/lunr.min.js`) | The search runtime. |

Theme version pinned at extraction time: just-the-docs 0.10.1.

## Re-extraction procedure

The Ruby toolchain is no longer in tree; re-extraction therefore
requires temporarily restoring the legacy Jekyll source set
(`docs/_plugins/`, `docs/_includes/`, `docs/_layouts/`, `docs/_sass/`,
`docs/Gemfile`, `docs/Gemfile.lock`) from git history. Pick the cutover
commit (`git log --oneline | grep "Phase 10"` then the relevant
follow-up that retired Ruby) and check out those paths into a worktree.

```sh
# In a clean worktree with the Jekyll source set restored:
cd docs && bundle install && bundle exec jekyll build && cd ..

cp docs/_site/assets/css/just-the-docs-combined.css   builder/assets/css/
cp docs/_site/assets/css/just-the-docs-head-nav.css   builder/assets/css/
cp docs/_site/assets/css/print.css                    builder/assets/css/
cp docs/_site/assets/js/just-the-docs.js              builder/assets/js/
cp docs/_site/assets/js/theme-switch.js               builder/assets/js/
cp docs/_site/assets/js/vendor/lunr.min.js            builder/assets/js/vendor/
```

Trigger conditions that warrant re-extraction:

- a `just-the-docs` version bump,
- a custom SCSS change applied to a temporarily-restored `_sass/custom/`,
- a hand-written CSS change to one of the three CSS files above,
- a `theme-switch.js` change.

Note: `rouge.css` was retired in PLAN-11 §5.1 (B2). The syntax-
highlight stylesheet is now `tb-highlight.css`, generated at build
time from `builder/themes/*.theme` — no extraction step.

After re-extracting, run `cd docs && build.bat && check.bat` and
confirm the rendered chrome still works.

## CSS class contract

The HTML emitted by Phase 3 (`render.mjs` / `highlight.mjs`) and
Phase 4 (`template.mjs`) targets the class names below; the bundled
stylesheets style them. Removing a class from the source SCSS without
adjusting the JS emitter (or vice versa) breaks the rendered chrome.

**Layout / chrome** (`template.mjs`):

- `side-bar`, `site-nav`, `nav-list`, `nav-list-item`,
  `nav-list-link`, `nav-list-expander btn-reset`,
  `nav-list-link external`, `nav-list-item external`
- `main`, `main-header`, `main-content-wrap`, `main-content`
- `site-header`, `site-title`, `site-logo`, `site-button`,
  `site-button btn-reset`, `site-footer`
- `aux-nav`, `aux-nav-list`, `aux-nav-list-item`
- `breadcrumb-nav`, `breadcrumb-nav-list`, `breadcrumb-nav-list-item`
- `search`, `search-input`, `search-input-wrap`, `search-label`,
  `search-icon`, `search-button btn-reset`, `search-overlay`,
  `search-results`
- `skip-to-main`
- `text-delta`, `text-small`
- Bootstrap-icons utility names `bi bi-clipboard`,
  `bi bi-clipboard-check-fill` (for the code-block copy button)
- Feather-icons utility names `feather feather-{menu,search,link,
  external-link,chevron-right,file,sun}`
- Tabler-icons utility name `icon-tabler-moon`

**Markdown body** (`render.mjs`):

- `highlight`, `language-<lang> highlighter-rouge`,
  `language-plaintext highlighter-rouge`
- `anchor-heading`
- `footnote`, `footnotes`, `reversefootnote`
- `table-wrapper`
- `markdown-alert markdown-alert-<type>`, `markdown-alert-title`,
  `octicon octicon-{alert,info,light-bulb,report,stop}`
  (the GitHub-flavoured admonition palette)

**Syntax highlighting** (`highlight.mjs` + `highlight-theme.mjs` + the
generated `tb-highlight.css`):

- The palette-class set: `.c1`, `.c2`, … `.cN` — one class per
  unique (Light props, Dark props) tuple across the Symbols the
  renderer can land on. Stable across builds because the tuples
  sort deterministically.
- `highlight.mjs` looks up each token's Shiki scope chain via the
  theme's `classForScope`, then emits `<span class="cN">` for hits
  and no wrap for misses (plain punctuation, generic identifiers,
  HTML tag names — the IDE theme doesn't colour those).
- `tb-highlight.css` is generated at build time and written to
  `<destRoot>/assets/css/tb-highlight.css`; the light palette lives
  at root, the dark palette under `html.dark-mode`. The chrome's
  theme toggle flips both halves together.

If the IDE refreshes its themes (a tB BETA bump that changes
palette colours or adds new Symbols), refresh the three files under
`builder/themes/` from the BETA's installer — `Light.theme`,
`Dark.theme`, `Classic.theme` — and rebuild. `highlight-theme.mjs`'s
`SCOPE_TO_SYMBOL` table maps Shiki scopes to the upstream Symbol
names; only changes there require code edits, palette colour shifts
do not.
