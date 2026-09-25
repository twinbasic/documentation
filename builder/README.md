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
  shipped scheduler**, and maintained reference rather than a frozen
  design record: pull model, SAB layout, Phases 5-18, and worked
  examples that are corrected when the code moves -- most recently to
  the landed `registerBarrier` form in [tbdocs.mjs](tbdocs.mjs). It
  names pipeline tasks throughout; read them as current.
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
the architecture overview; [Extending the Builder](../docs/Documentation/Extending.md)
is the how-to for adding a pipeline task, a markdown-it plugin or a
render-worker sub-stage.

## Build phases

| Phase | Module(s) | Job |
|---|---|---|
| 1 | [discover.mjs](discover.mjs) + [publish-policy.mjs](publish-policy.mjs) | Read .md/.html + frontmatter, enumerate static files, refuse any that is not a publishable type |
| 2 | [nav.mjs](nav.mjs) / [seo.mjs](seo.mjs) / [book.mjs](book.mjs) / [build-info.mjs](build-info.mjs) / [data.mjs](data.mjs) | Compute nav tree, SEO, book chapters, git commit info, `_data/*.yml` |
| 3 | [render.mjs](render.mjs) + [highlight.mjs](highlight.mjs) + [highlight-theme.mjs](highlight-theme.mjs) | Markdown -> HTML body |
| 4 | [template.mjs](template.mjs) + [compress.mjs](compress.mjs) | Wrap in layout, anchor-heading injection, whitespace compress |
| 5 | [write.mjs](write.mjs) | Write `_site/` |
| 6 | [redirects.mjs](redirects.mjs) / [sitemap.mjs](sitemap.mjs) / [search.mjs](search.mjs) / [symbols.mjs](symbols.mjs) + [symbol-baseline.mjs](symbol-baseline.mjs) | Auxiliaries (stubs, sitemap.xml, search-data.json, tB/symbols.json and the drift guard on its URLs) |
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

`test.bat` is the other wrapper, and it is the one that judges an edit
made *here*: it runs the gates that test the toolchain rather than the
site, so a change under `builder/` owes it whether or not any page
moved. Two of its gates key on this directory by name.
[scripts/check_regex_safety.mjs](../scripts/check_regex_safety.mjs)
refuses a regex that can backtrack exponentially --- both that shipped
lived in [render.mjs](render.mjs), and each hung a render worker in
silence rather than failing, so the gate asks the question of the
pattern instead of waiting for a page to ask it. It reads constructed
patterns too, so assembling one from string constants is not an escape.
[scripts/check_code_regions.mjs](../scripts/check_code_regions.mjs)
refuses a pre-render rewrite that alters the contents of a code fence or
code span, which four rewrites in [render.mjs](render.mjs) have done ---
so a new one belongs inside `applyPreRenderRewrites`, between
`maskCodeRegions` and its `restore`.
[Tools and Scripts](https://docs.twinbasic.com/Documentation/Development/Tools)
lists every gate in both wrappers, in running order.

The pure core lives in [link-check.mjs](link-check.mjs); the build-side
plumbing is [check.mjs](check.mjs) and [check-tree.mjs](check-tree.mjs).
[scripts/check_links.mjs](../scripts/check_links.mjs) is the same check
as a standalone tool, for trees this build did not produce. Neither CI
workflow invokes it directly any more -- both reach it through
`check_links_diff.mjs`, which runs it in-process against the fixtures.
[scripts/check_links_diff.mjs](../scripts/check_links_diff.mjs) is the
gate that says the two agree -- run it whenever any of the three
changes; [test/README.md](../test/README.md) covers the fixtures that
give it something to disagree about, the exact finding counts they must
keep provoking, and why a template change can turn the gate red without
touching the fixture or the checker. See
[PLAN-checks.md](PLAN-checks.md).

The per-phase `verify-phase{1..8}.mjs` harnesses and the bulk-triage
tools (`_triage.mjs`, `_diff.mjs`, etc.) were retired in the Phase 10
cutover; they asserted byte-equivalence with Jekyll, which is no
longer the acceptance bar.

Every gate above checks the site. [eval/](../eval/) checks the
*documentation about* the site: it hands an evaluator a goal and a
mirror of the repository with all source stubbed unreadable, and asks
whether the goal can be reached. That is a different question from
whether the prose is accurate, and it catches a class of defect no gate
here can see -- a page can be true in every sentence and still send a
reader to the wrong remedy. See [eval/README.md](../eval/README.md) for
how to run a round, and
[REVIEW-USECASES-874896e.md](REVIEW-USECASES-874896e.md) for what the
first one found.
