# tbdocs

Node.js static site generator for [docs.twinbasic.com](https://docs.twinbasic.com).
Replaces the original Jekyll + just-the-docs pipeline (retired in the
Phase 10 cutover; the legacy Ruby source set has since been removed
from the tree).

## Quickstart

Requires Node.js 22+. There is no `builder/package.json`; the whole
dependency set lives in one `package.json` at the repository root.

```
npm ci                                    # from the repository root
node builder/tbdocs.mjs --src docs        # -> docs/_site/, _site-offline/, _site-pdf/
```

The day-to-day drivers are [build.bat](../build.bat), [serve.bat](../serve.bat),
[check.bat](../check.bat) and [book.bat](../book.bat), all at the repository
root -- they invoke `tbdocs` with the right arguments and route the
browser-dependent gates and the PDF render behind the same wrappers.
`build.bat` passes `--check-audit-index`, so an ordinary build also
link-checks every tree it produced.

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
| `--fetch-assets` / `--no-fetch-assets` | Force remote-asset vendoring on or off. Default: download on a dev box, never when `$CI` is set. |
| `--check` / `--no-check` | Run (or skip) the link + integrity check over the HTML the build already holds in memory. Sets the exit code, never aborts the graph. |
| `--check-audit-index` | Implies `--check`; also diffs the derived tree index against what landed on disk. What `build.bat` passes. |
| `--check-findings <path>` | Implies `--check`; writes the findings as JSON for `scripts/check_links_diff.mjs`. |
| `--serve` | Start the long-lived dev server (watch + rebuild + SSE live-reload). |
| `--port <N>` | HTTP port for `--serve` mode (default 4000). |

## Serve mode

`tbdocs --serve` starts a long-lived dev process: HTTP server on
port 4000 (override with `--port`), recursive watcher on the
source tree, debounced rebuild on changes, and SSE-driven browser
auto-reload. The offline and PDF passes are skipped each rebuild
(restore them with a non-`--serve` invocation).

    node builder/tbdocs.mjs --src docs --serve

Or via the wrapper at the repository root: `serve.bat`.

Ctrl+C exits cleanly (closes the server, aborts the watcher,
drains SSE clients).

## Documentation

- [PLAN.md](PLAN.md) -- architecture overview and the 12-phase pipeline.
- [PLAN-1.md](PLAN-1.md) .. [PLAN-13.md](PLAN-13.md) -- per-phase
  specs (inputs, outputs, edge cases, acceptance checklists). Phases
  1-8 are the build itself; Phase 9 was the QoL consolidation pass;
  Phase 10 was the Jekyll cutover; Phase 11 is the output-changing
  parity update; Phase 12 adds `--serve` watch mode; Phase 13 is
  build-time SVG inlining with the zoom / export controls.
- [PLAN-sab-pull-scheduler.md](PLAN-sab-pull-scheduler.md) -- **the
  current scheduler design** (pull model, SAB layout, Phases 14-18).
  [PLAN-scheduler.md](PLAN-scheduler.md) is the superseded push-based
  design, and [PLAN-scheduler-offline.md](PLAN-scheduler-offline.md)
  covers moving the offline rewrite into the render workers.
- [PLAN-checks.md](PLAN-checks.md) -- folding the link checker into
  the build's task graph; Phase A shipped, the axe follow-ons are
  designed but not implemented.
- [PLAN-a11y.md](PLAN-a11y.md) -- the WCAG 2.2 AA work.
  [PLAN-axe-perf.md](PLAN-axe-perf.md) -- the axe-core performance
  investigation, complete.
- `REVIEW-*.md` / `PLAN-REVIEW-*.md` -- frozen audit snapshots of a
  commit range, not maintained reference documentation.
- [FUTURE-WORK.md](FUTURE-WORK.md) -- open follow-ups, grouped by
  divergence investigations / deferred enhancements.
- [vendor/just-the-docs/README.md](vendor/just-the-docs/README.md) --
  the vendored theme: what was taken, every in-tree patch to its
  `_sass/` and `just-the-docs.js` with the commit that made it, and the
  re-vendoring procedure.

The end-user-facing documentation about how the build pipeline works
lives on the site itself under [Documentation Development](../docs/Documentation/):
[Tools and Scripts](../docs/Documentation/Tools.md) is the one-line
cheat sheet; [tbdocs Internals](../docs/Documentation/Builder.md) is
the architecture overview.

## Build phases

| Phase | Module(s) | Job |
|---|---|---|
| 1 | [discover.mjs](discover.mjs) + [publish-policy.mjs](publish-policy.mjs) | Read .md/.html + frontmatter, enumerate static files, refuse any that is not a publishable type |
| 2 | [nav.mjs](nav.mjs) / [seo.mjs](seo.mjs) / [book.mjs](book.mjs) / [build-info.mjs](build-info.mjs) / [data.mjs](data.mjs) | Compute nav tree, SEO, book chapters, git commit info, `_data/*.yml` |
| 3 | [render.mjs](render.mjs) + [highlight.mjs](highlight.mjs) + [highlight-theme.mjs](highlight-theme.mjs) | Markdown -> HTML body |
| 4 | [template.mjs](template.mjs) + [compress.mjs](compress.mjs) | Wrap in layout, anchor-heading injection, whitespace compress |
| 5 | [write.mjs](write.mjs) | Write `_site/` |
| 6 | [redirects.mjs](redirects.mjs) / [sitemap.mjs](sitemap.mjs) / [search.mjs](search.mjs) | Auxiliaries (stubs, sitemap.xml, search-data.json) |
| 7 | [offline.mjs](offline.mjs) | Mirror to `_site-offline/` with `file://` URL rewrites |
| 8 | [pdf.mjs](pdf.mjs) + [book.mjs](book.mjs) (renderer half) | Sparse `_site-pdf/` tree (book.html + CSS + images) |

Two seed tasks run alongside discover: [dot.mjs](dot.mjs) regenerates
stale `*.svg` from their `.dot` siblings via the WASM build of Graphviz
(with [dot-metrics.mjs](dot-metrics.mjs) installing Inter's real advance
widths first, so boxes are sized for the font the browser will paint),
and [vendor-assets.mjs](vendor-assets.mjs) downloads any referenced-but-
uncommitted YouTube poster frame or GitHub user-attachment image -- never
under CI, where a missing asset is a hard error instead.

## Verification

Two gates abort the build outright, because their failure means the
output itself is wrong rather than merely incomplete: `nav.mjs`'s
permalink and nav-integrity checks, and [publish-policy.mjs](publish-policy.mjs),
which holds the allowlist of file types that may reach a published tree.
Everything under `docs/` that is not a page is copied into the output
verbatim, so a denylist only refuses what somebody named in advance --
before the allowlist, a stray `.bak`, `.pem`, `.twin` or frontmatter-less
`.md` published at a public URL on a green build. It is enforced over the
static-file inventory in `discover` and over each tree's derived
inventory in `dispatch`, neither behind `--check`.
[scripts/check_publish_policy.mjs](../scripts/check_publish_policy.mjs)
is the gate on that gate: a clean build says only that nothing is
currently refused, which is also what an allowlist widened to nothing
would say.

Regression detection runs inside the build. `tbdocs --check` (which
`build.bat` passes) walks each tree's final HTML on the worker lane that
produced it -- offline link check + duplicate-`id` detection, anchor
resolution, remote-asset detection, sitemap, search-index and canonical
integrity. A failing check sets the exit code but never aborts the
graph. `check.bat` then runs the gates that need a browser. A clean
`build.bat && check.bat` is the bar for "ready to commit".

The pure core lives in [link-check.mjs](link-check.mjs); the build-side
plumbing is [check.mjs](check.mjs) and [check-tree.mjs](check-tree.mjs).
[scripts/check_links.mjs](../scripts/check_links.mjs) is the same check
as a standalone tool, for trees this build did not produce. Neither CI
workflow invokes it directly any more -- both reach it through
`check_links_diff.mjs`, which runs it in-process against the fixtures.
[scripts/check_links_diff.mjs](../scripts/check_links_diff.mjs) is the
gate that says the two agree -- run it whenever any of the three
changes. See [PLAN-checks.md](PLAN-checks.md).

The per-phase `verify-phase{1..8}.mjs` harnesses and the bulk-triage
tools (`_triage.mjs`, `_diff.mjs`, etc.) were retired in the Phase 10
cutover; they asserted byte-equivalence with Jekyll, which is no
longer the acceptance bar.
