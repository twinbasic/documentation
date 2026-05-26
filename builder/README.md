# tbdocs

Node.js static site generator for [docs.twinbasic.com](https://docs.twinbasic.com).
Replaces the original Jekyll + just-the-docs pipeline (still living at
`docs/_plugins/` and friends for reference).

## Quickstart

Requires Node.js 20+.

```
cd builder
npm install
node index.mjs                # builds docs/_site-new/
```

CLI flags:

| Flag | Effect |
|---|---|
| `--src <path>` | Source root (default `docs`). |
| `--dest <path>` | Online tree destination (default `<src>/_site-new`). |
| `--dry-run` | Skip every filesystem write. |
| `--no-offline` | Skip the offline-tree pass (Phase 7). |
| `--no-pdf` | Skip the PDF-tree pass (Phase 8). |
| `--serving` | Flip Phase 8's missing-image throw to a warning. |
| `--profile-offline` | Per-substep timing for Phase 7. |

## Documentation

- [PLAN.md](PLAN.md) -- architecture overview and the 8-phase pipeline.
- [PLAN-1.md](PLAN-1.md) .. [PLAN-9.md](PLAN-9.md) -- per-phase specs
  (inputs, outputs, edge cases, acceptance checklists). PLAN-9 is the
  consolidation pass that adds the CLI flags above, the nav-block cache,
  the `data.mjs` loader, the diagnostic tools, and this README.
- [FUTURE-WORK.md](FUTURE-WORK.md) -- open follow-ups, grouped by
  divergence investigations / deferred enhancements / post-port cutover.
- [accepted-divergences.mjs](accepted-divergences.mjs) -- per-page
  allow-list every verify harness reads. Adds an entry only after
  confirming the divergence is purely a tokenisation or parse-edge-case
  difference, not a content drift.

## Verification

Each phase has its own acceptance harness:

```
node verify-phase1.mjs       # discover
node verify-phase2.mjs       # compute (nav, seo, book, build-info)
node verify-phase3.mjs       # render (markdown -> body HTML)
node verify-phase4.mjs       # template + compress
node verify-phase5.mjs       # write _site/
node verify-phase6.mjs       # auxiliaries (redirects, sitemap, search)
node verify-phase7.mjs       # write _site-offline/
node verify-phase8.mjs       # write _site-pdf/
```

The bulk-triage tools (`_triage.mjs`, `_diff.mjs`, `_diff_all.mjs`,
`_audit_accepted.mjs`, `_sitemap_diff.mjs`, `_spot.mjs`) classify
divergences by first-occurrence pattern, drill into one file, or surface
hidden secondary divergences. See the
["Builder diff / triage / verify tools" section of WIP.md](../docs/WIP.md)
in the repo root for the full workflow table.

## Build phases

| Phase | Module(s) | Job |
|---|---|---|
| 1 | [discover.mjs](discover.mjs) | Read .md/.html + frontmatter, enumerate static files |
| 2 | [nav.mjs](nav.mjs) / [seo.mjs](seo.mjs) / [book.mjs](book.mjs) / [build-info.mjs](build-info.mjs) / [data.mjs](data.mjs) | Compute nav tree, SEO, book chapters, git commit info, `_data/*.yml` |
| 3 | [render.mjs](render.mjs) + [highlight.mjs](highlight.mjs) | Markdown -> HTML body |
| 4 | [template.mjs](template.mjs) + [compress.mjs](compress.mjs) | Wrap in layout, anchor-heading injection, whitespace compress |
| 5 | [write.mjs](write.mjs) | Write `_site/` |
| 6 | [redirects.mjs](redirects.mjs) / [sitemap.mjs](sitemap.mjs) / [search.mjs](search.mjs) | Auxiliaries (stubs, sitemap.xml, search-data.json) |
| 7 | [offline.mjs](offline.mjs) | Mirror to `_site-offline/` with `file://` URL rewrites |
| 8 | [pdf.mjs](pdf.mjs) + [book.mjs](book.mjs) (renderer half) | Sparse `_site-pdf/` tree (book.html + CSS + images) |

Each `verify-phase<N>.mjs` drives Phases 1..N into a scratch
destination and asserts the §10 acceptance checks from the matching
`PLAN-<N>.md`.
