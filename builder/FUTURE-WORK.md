# Future Work

Open follow-up tasks for the tbdocs builder. Phases 1-11 are shipped.

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
