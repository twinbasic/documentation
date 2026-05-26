# builder/assets/

Prebuilt theme assets the JS builder ships verbatim into the rendered
site at `<destRoot>/assets/`. Phase 5 (`write.mjs`) copies this whole
tree as a unit — no transformation, no per-file allow-list. Anything
added under here lands in every build.

The seven files are the just-the-docs chrome's runtime dependencies.
The HTML templates in `builder/template.mjs` reference each one by
literal path; reorganising the tree breaks the chrome.

These are the **online** variants — no offline-mode patches applied.
Phase 7 (offline tree, future) will copy from `<destRoot>/assets/`
into `_site-offline/` and re-run the offlinify rewrites itself.

## Inventory

All seven files are Jekyll-build outputs, captured from
`docs/_site/assets/` after a clean `bundle exec jekyll build`. The
upstream sources Jekyll consumed are listed for reference.

| File | Upstream source | Notes |
|---|---|---|
| `css/just-the-docs-combined.css` | `docs/assets/css/just-the-docs-combined.scss` — pulls in `_sass/just-the-docs.scss.liquid` (via the just-the-docs gem) plus `_sass/custom/twinbasic-light` / `_sass/custom/twinbasic-dark` for the project's dark/light variants and `_sass/custom/custom.scss` / `_sass/custom/admonitions.scss` for site-specific tweaks | The site stylesheet. Compiled by Jekyll's Sass pipeline; vendored here to avoid a Sass dep in the JS build. |
| `css/just-the-docs-head-nav.css` | `docs/assets/css/just-the-docs-head-nav.css` — hand-written CSS with a small Liquid prelude (newline-capture) | Per-page nav-prefix override sheet. |
| `css/print.css` | `docs/assets/css/print.css` — hand-written self-contained print stylesheet | The `@media print` sheet; used by Phase 8's PDF tree too. |
| `css/rouge.css` | `docs/assets/css/rouge.css` — hand-written, the Rouge `github.light` palette mapped to `.k` / `.kc` / `.nb` / `.s` / … class names | The syntax-highlight scope-to-colour rules. Phase 3's Shiki driver emits the same Rouge / Pygments class names so this file styles both Rouge-rendered and Shiki-rendered code blocks. |
| `js/just-the-docs.js` | just-the-docs gem `assets/js/just-the-docs.js` (version pinned by `docs/Gemfile`) | The runtime that wires the sidebar, search, copy-button, dark-mode toggle. |
| `js/theme-switch.js` | `docs/assets/js/theme-switch.js` — project-local script | The dark-mode toggle. |
| `js/vendor/lunr.min.js` | just-the-docs gem `assets/js/vendor/lunr.min.js` | The search runtime. |

Theme version is pinned in `docs/Gemfile`: `gem "just-the-docs", "= 0.10.1"`.
Bump that version, re-run the extraction procedure below, and inspect
the diff before committing.

## Re-extraction procedure

Run after any of:

- a `just-the-docs` version bump in `docs/Gemfile`,
- a custom SCSS change under `docs/_sass/custom/`,
- a hand-written CSS change under `docs/assets/css/*.{css,scss}`,
- a `theme-switch.js` change under `docs/assets/js/`.

From the repo root:

```sh
cd docs && bundle exec jekyll build && cd ..

cp docs/_site/assets/css/just-the-docs-combined.css   builder/assets/css/
cp docs/_site/assets/css/just-the-docs-head-nav.css   builder/assets/css/
cp docs/_site/assets/css/print.css                    builder/assets/css/
cp docs/_site/assets/css/rouge.css                    builder/assets/css/
cp docs/_site/assets/js/just-the-docs.js              builder/assets/js/
cp docs/_site/assets/js/theme-switch.js               builder/assets/js/
cp docs/_site/assets/js/vendor/lunr.min.js            builder/assets/js/vendor/
```

Then re-run `node builder/verify-phase5.mjs`. A `diff -rq docs/_site
docs/_site-new` "Files differ" entry for any of these seven paths
means the bundled copy has drifted from Jekyll's current output —
re-extracting closes the gap. (Per-page HTML divergences are
unrelated; see PLAN-5.md §10.)

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

**Syntax highlighting** (`highlight.mjs` + `rouge.css`):

- The Rouge / Pygments token class set: `.k` keyword, `.kc`
  keyword-constant, `.nb` name-builtin, `.s` string, `.c` comment,
  `.n` name, `.o` operator, …
- Phase 3's Shiki driver emits these class names from
  `twinbasic.tmLanguage.json` scope mappings, so `rouge.css` styles
  them with no extra translation step.
- Phase 3 also emits `<span class="lc">` (line continuation) and
  `<span class="se">` (string escape) for tB-specific tokens; both
  inherit Rouge's class palette.

If `rouge.css` ever stops covering a class name the highlighter
emits, the affected tokens render as unstyled text — visible in the
rendered site as black-on-white code spans inside the otherwise-
coloured block. The fix is either to add the class to `rouge.css`
(if the source omitted it) or to remap the Shiki scope in
`highlight.mjs` to a name `rouge.css` already covers.
