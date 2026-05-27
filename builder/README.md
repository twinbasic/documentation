# tbdocs

Node.js static site generator for [docs.twinbasic.com](https://docs.twinbasic.com).
Replaces the original Jekyll + just-the-docs pipeline (retired in the
Phase 10 cutover; the legacy Ruby source set has since been removed
from the tree).

## Quickstart

Requires Node.js 22+.

```
cd builder
npm install
node tbdocs.mjs               # builds docs/_site/, docs/_site-offline/, docs/_site-pdf/
```

The day-to-day driver is [docs/build.bat](../docs/build.bat) (and
`serve.bat` / `check.bat` / `book.bat`) -- they invoke `tbdocs` with
the right `--src` argument and route the link checker and PDF render
behind the same wrappers.

CLI flags:

| Flag | Effect |
|---|---|
| `--src <path>` | Source root (default `docs`). |
| `--dest <path>` | Online tree destination (default `<src>/_site`). The offline tree lands at `<dest>-offline`, the PDF tree at `<dest>-pdf`. |
| `--baseurl <prefix>` | Overrides `_config.yml`'s `baseurl` (used by CI to inject the GitHub Pages base path on fork deployments). |
| `--url <origin>` | Overrides `_config.yml`'s `url` (used by CI so canonical URLs match the deployment origin). |
| `--dry-run` | Skip every filesystem write. |
| `--no-offline` | Skip the offline-tree pass (Phase 7). |
| `--no-pdf` | Skip the PDF-tree pass (Phase 8). |
| `--tolerate-missing-images` | Downgrade Phase 8's missing-image error to a warning. |
| `--profile-offline` | Per-substep timing for Phase 7. |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). |
| `--port <N>` | HTTP port for `--serve` mode (default 4000). |

## Serve mode

`tbdocs --serve` starts a long-lived dev process: HTTP server on
port 4000 (override with `--port`), recursive watcher on the
source tree, debounced rebuild on changes, and SSE-driven browser
auto-reload. The offline and PDF passes are skipped each rebuild
(restore them with a non-`--serve` invocation).

    cd builder && node tbdocs.mjs --src ../docs --serve

Or via the docs wrapper: `docs/serve.bat`.

Ctrl+C exits cleanly (closes the server, aborts the watcher,
drains SSE clients).

## Documentation

- [PLAN.md](PLAN.md) -- architecture overview and the 12-phase pipeline.
- [PLAN-1.md](PLAN-1.md) .. [PLAN-12.md](PLAN-12.md) -- per-phase
  specs (inputs, outputs, edge cases, acceptance checklists). Phases
  1-8 are the build itself; Phase 9 was the QoL consolidation pass;
  Phase 10 was the Jekyll cutover; Phase 11 is the output-changing
  parity update; Phase 12 adds `--serve` watch mode.
- [FUTURE-WORK.md](FUTURE-WORK.md) -- open follow-ups, grouped by
  divergence investigations / deferred enhancements.
- [assets/README.md](assets/README.md) -- the bundled theme assets,
  the CSS class contract the generator targets, and the (now-historical)
  re-extraction procedure.

The end-user-facing documentation about how the build pipeline works
lives on the site itself under [Documentation Development](../docs/Documentation/):
[Tools and Scripts](../docs/Documentation/Tools.md) is the one-line
cheat sheet; [tbdocs Internals](../docs/Documentation/Builder.md) is
the architecture overview.

## Build phases

| Phase | Module(s) | Job |
|---|---|---|
| 1 | [discover.mjs](discover.mjs) | Read .md/.html + frontmatter, enumerate static files |
| 2 | [nav.mjs](nav.mjs) / [seo.mjs](seo.mjs) / [book.mjs](book.mjs) / [build-info.mjs](build-info.mjs) / [data.mjs](data.mjs) | Compute nav tree, SEO, book chapters, git commit info, `_data/*.yml` |
| 3 | [render.mjs](render.mjs) + [highlight.mjs](highlight.mjs) + [highlight-theme.mjs](highlight-theme.mjs) | Markdown -> HTML body |
| 4 | [template.mjs](template.mjs) + [compress.mjs](compress.mjs) | Wrap in layout, anchor-heading injection, whitespace compress |
| 5 | [write.mjs](write.mjs) | Write `_site/` |
| 6 | [redirects.mjs](redirects.mjs) / [sitemap.mjs](sitemap.mjs) / [search.mjs](search.mjs) | Auxiliaries (stubs, sitemap.xml, search-data.json) |
| 7 | [offline.mjs](offline.mjs) | Mirror to `_site-offline/` with `file://` URL rewrites |
| 8 | [pdf.mjs](pdf.mjs) + [book.mjs](book.mjs) (renderer half) | Sparse `_site-pdf/` tree (book.html + CSS + images) |

A pre-step ([mermaid.mjs](mermaid.mjs)) regenerates stale
`docs/assets/images/mmd/*.svg` from their `.mmd` sources before
discover walks the tree.

## Verification

Regression detection runs through [scripts/check_links.mjs](../scripts/check_links.mjs)
(driven from [docs/check.bat](../docs/check.bat)) -- offline link
check + HTML well-formedness, duplicate-`id` detection, anchor
resolution, sitemap and search-index integrity. A clean `check.bat`
run is the bar for "ready to commit".

The per-phase `verify-phase{1..8}.mjs` harnesses and the bulk-triage
tools (`_triage.mjs`, `_diff.mjs`, etc.) were retired in the Phase 10
cutover; they asserted byte-equivalence with Jekyll, which is no
longer the acceptance bar.
