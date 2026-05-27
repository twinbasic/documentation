# Future Work

Open follow-up tasks for the tbdocs builder. Phases 1-9 are shipped;
**Phase 10** is the Jekyll-to-tbdocs cutover ([PLAN-10.md](PLAN-10.md)
once drafted; see §C1 below). **Phase 11** picks up the items that
intentionally change build output and so couldn't fit Phase 9's
no-regression criterion -- sequenced after Phase 10's cutover (when
"regression vs Jekyll" is no longer the acceptance bar, so Phase 11
divergences land as `accepted-divergences.mjs` entries become moot).

Per-item phase routing is annotated inline below — items routed to
**→ Phase 9** are marked **shipped**; items routed to **→ Phase 10**
or **→ Phase 11** stay open; **→ drop** items are out of scope.

When picking up a divergence-investigation entry: re-run the discovery
step listed under "Reproduce" before assuming the symptom is still
current -- code on either side of the divergence may have changed
since the entry was written.

---

## A. Divergence investigations

### A1. Hidden secondary divergences on accepted-divergence pages

**Routing**: investigation paths #1 (multi-divergence audit tool) and
#3 (`_diff.mjs` / `_triage.mjs` `--multi` mode) → **shipped in Phase 9**
([PLAN-9.md §5.12](PLAN-9.md)). Path #2 (decide on the TestFixture
line specifically) is a content / parser call that can wait.

**Discovered**: Phase 6 verify (search-data byte comparison vs Jekyll's
`docs/_site/assets/js/search-data.json`).

**Reproduce**:
```
cd builder
node index.mjs                       # builds _site-new/
node verify-phase6.mjs               # surfaces non-accepted content diffs
```

**Symptom**: After the NBSP-handling fix in `search.mjs`'s
`sanitiseContent` (Phase 6 was treating ` ` as whitespace; Ruby
doesn't), exactly one search-content entry remained divergent vs
Jekyll's output -- `Reference/Attributes.md`'s `#testfixture`
section.

**Root cause**: kramdown and markdown-it parse this line differently
(line 629 of `docs/Reference/Attributes.md`):

```
Syntax: **[TestFixture **[ **( True** \| **False )** ] **]**
```

kramdown opens `<strong>` at the leading `**[TestFixture` marker and
closes at the third `**`:

```html
<strong>[TestFixture **[ **( True</strong> | <strong>False )</strong> ] <strong>]</strong>
```

markdown-it leaves the leading `**[TestFixture **[ ` as literal text
and only opens `<strong>` at `**( True**`:

```html
**[TestFixture **[ <strong>( True</strong> | <strong>False )</strong> ] <strong>]</strong>
```

The source pattern is unusual -- five `**` markers in a row with
mismatched bracket/paren grouping -- and kramdown's asymmetric
greedy-opener behaviour is arguably a bug it happens to commit
consistently. The page author may have meant a different markup; worth
asking before chasing parser parity.

**Why Phase 3 / Phase 4 didn't surface this**:
`Reference/Attributes.md` was already listed in
`accepted-divergences.mjs` for a different reason (a JSON syntax-
highlighting tokenisation difference inside an earlier code fence).
`_diff.mjs` prints only the **first** divergence offset, so it stops
at the JSON block and never reaches line 629. `_triage.mjs` buckets
pages by first-divergence pattern and silently passes any page whose
`srcRel` is in `ACCEPTED_DIVERGENCE_PATHS`. Once a page is fully
accepted, every subsequent divergence on that page is masked.

Phase 6's search-content verify happens to expose this because it
diffs each section's sanitised content independently, so divergences
past the first one have their own slot in the result.

**Current mitigation**: a second entry for `Reference/Attributes.md`
in `accepted-divergences.mjs` (category `markdown-parsing`) documenting
the strong-asterisk parsing difference and pointing at this section.

**Investigation paths**:

1. **Multi-divergence audit**. Add an `_audit_accepted.mjs` tool that
   diffs the **whole** rendered HTML (Phase 4 output, sidebar stripped)
   for every page in `ACCEPTED_DIVERGENCE_PATHS`, against Jekyll's
   `_site/<destPath>`, and reports any divergence regions whose
   character span lies outside the documented accepted region. The
   most expedient version of this just splits both sides on each
   character offset where they diverge and prints all distinct
   divergence regions with ~80 chars of context. Goal: find every
   page where an accepted-divergence wrapper is masking a different
   class of divergence.

2. **Decide on the TestFixture line specifically**. Three options:
   a. Patch the source -- if the intent was `[**TestFixture**` with a
      paired closer, ask the author and rewrite.
   b. Match kramdown's behaviour in markdown-it -- likely needs a
      custom plugin or a fork; the pattern is rare enough that the
      ROI is doubtful.
   c. Leave the divergence accepted; the rendered text reads
      identically in both cases (the asterisks vs `<strong>` shift is
      a visual styling difference, not a content difference).

3. **Make first-divergence tools multi-aware**. `_triage.mjs` and
   `_diff.mjs` could optionally continue past the first divergence,
   reporting each distinct region. The cost is moderate (the diff
   algorithm has to re-sync after each region) and the value is the
   ability to surface this kind of hidden secondary divergence
   without spawning a separate auditor.

**Owner**: unassigned. Pick this up if the next Phase 3/4/6 verify
ever surfaces a regression on this page, or as a one-off cleanup
when chasing parser parity becomes interesting.

---

## B. Deferred enhancements

These are out-of-scope follow-ups noted while implementing the
phases. Each is a clean addition; none block any current work.

### B1. Mermaid `.mmd` -> `.svg` automation (PLAN-3 §15) — **shipped in Phase 11**

**Routing**: → **shipped in Phase 11** ([PLAN-11.md §5.2](PLAN-11.md)).

`builder/mermaid.mjs` runs before Phase 1's discover, walks
`docs/assets/images/mmd/*.mmd`, and invokes `mmdc` (via
`npx --no-install` rooted at `builder/`) for any source whose `.svg`
sibling is missing or older. The `.mmd` is now the canonical input;
the SVG is a build artifact regenerated whenever the source changes.
Adds `@mermaid-js/mermaid-cli` as a devDependency. The site already
needs `puppeteer` at the repo root for the PDF render step (and CI
calls `npx puppeteer browsers install chrome --install-deps`), so
`mermaid.mjs` discovers that cached Chrome and passes it through
via `PUPPETEER_EXECUTABLE_PATH` -- no second Chrome download. A
missing `mmdc` or missing Chrome cache downgrades to a graceful
warning; the existing on-disk SVG is retained, the build continues.

### B2. Switch to Shiki-themed output (PLAN-3 §15 / §D3) — **shipped in Phase 11**

**Routing**: → **shipped in Phase 11** ([PLAN-11.md §5.1](PLAN-11.md)).
Headline parity-update item.

`scripts/extract_theme_colors.py` and `builder/assets/css/rouge.css`
are gone; `builder/highlight-theme.mjs` parses the three vendored
`.theme` files under `builder/themes/` (Light, Dark, Classic) and
emits `_site/assets/css/tb-highlight.css` at build time. Per-span
class names switched from Rouge tokens (`k`, `s`, `mi`) to a
colour-palette scheme (`c1`, `c2`, …) — one classId per unique
(Light props, Dark props) tuple, so symbols sharing both palettes'
properties collapse to a single rule (the five Literal* symbols
fold to one `c13` on the current themes). `builder/highlight.mjs`
shrank from ~470 lines to ~190; the per-language Rouge-quirk
overrides folded into the theme's scope-to-Symbol table.

Light palette ships at root; dark palette nests under
`html.dark-mode` so the chrome's theme toggle flips both halves
together. The PDF tree links `tb-highlight.css` from `book.html`
in place of the retired `rouge.css`.

#### B2a. Shiki output-mode investigation (findings, 2026-Q2)

Investigated as part of the Phase 9→10/11 split planning. Shiki has
three output modes:

| Mode | Per-span shape | Bytes/span | Notes |
|---|---|---|---|
| Default (inline styles) | `<span style="color:#FF5733">tok</span>` | ~31 | Colour baked into each span; no stylesheet needed. |
| CSS variables (`themes: {light,dark}`) | `<span style="--shiki-light:#FF5;--shiki-dark:#AAA">tok</span>` | ~60+ | Light/dark switching but worst for size. |
| Custom transformer + `codeToTokensBase` | `<span class="X">tok</span>` | depends on `X` | What [highlight.mjs](highlight.mjs) already does (with X = Rouge tokens). |

Current Rouge classes average ~1.7 chars (`k`/`mi`/`cm`/`nf`/`lc`,
Pygments convention). Per-span overhead is ~22 chars including the
class wrapper. A colour-palette scheme of 2-char `c1`...`cN` IDs is
the same length, so HTML byte size is essentially neutral; what
changes is class *meaning* (scope-derived → colour-derived).

The ~470-line `bestRougeClass` + per-language quirk logic in
[highlight.mjs:154-466](highlight.mjs:154) exists solely to make
Shiki's tokens emit what Rouge would have emitted; under Phase 11
that entire layer disappears and Shiki's tokens drive directly.
Net: highlight.mjs shrinks from ~470 lines to ~80, plus a small
palette extractor (~50 lines) and a generated `<lang>-colors.css`
(~1-2 KB).

Decision recorded for Phase 11: use the custom-transformer approach
with a colour-palette class scheme. Generate one combined stylesheet
(per-language colour prefixes if needed for collision-free palettes).

### B3. Move title rendering to `site.markdown` (PLAN-3 §15, PLAN-2 §D6)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.1](PLAN-9.md)).

**Trigger**: a refactor pass after the port settles.

Phase 2's `seo.mjs` currently creates its own minimal markdown-it
instance for SEO title rendering, while Phase 3 exposes a fully
configured `site.markdown` for body rendering. Consolidating onto
`site.markdown` would remove a few lines and one configuration site.
Tiny code reduction, no behaviour change.

### B4. Generic `site.data.*` loader (PLAN-3 §15)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.2](PLAN-9.md)).
Pulled in as a mechanical cleanup even without a trigger; sets up
cleanly for any future `_data/*.yml`.

**Trigger**: a new `_data/<file>.yml` is added.

Currently `book.mjs` loads `_data/book.yml` directly. A generic
loader walking `_data/*.yml` into `site.data` would cover any future
data file without per-file plumbing. Defer until a second data file
exists.

### B5. Inline copy-code button server-side rendering (PLAN-3 §15 / §D16)

**Routing**: → **Phase 11**. Adds button HTML to every `<pre>`;
regresses HTML byte-match.

**Trigger**: the just-the-docs copy-code JS needs to be retired
(client-bundle shrink, accessibility audit, etc.).

The copy-code button is currently injected at runtime by the
just-the-docs theme JS. Server-side injection in `highlight.mjs`
(adding the `<button class="copy">` next to each `<pre>`) would let
us drop the client script. Cosmetic; not worth doing without a
trigger.

### B6. Linkify exception list (PLAN-3 §15 / §D10)

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

### B7. Phase 7 nav-block cache (PLAN-7 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.3](PLAN-9.md)).
Keyed on destination directory (not source -- the URL rewrite depends
on `page.destPath`'s fileSegs). ~200 ms shaved off the Phase 7 wall.

**Trigger**: the offline HTML pass exceeds 300 ms in profiling, or
the Phase 7 total exceeds the 1500 ms cap in `verify-phase7.mjs`.

Per-source-dir caching of the rewritten just-the-docs sidebar nav
would save an estimated ~200 ms on the HTML pass. Implementation:
substitute the input nav with a placeholder before the per-page
gsub when `nav_cache[file_dir]` is set; splice the cached rewritten
nav back after the gsub; seed the cache from the first page in each
`file_dir`. ~80 lines added to `offline.mjs` §D.

### B8. Phase 7 `--no-offline` opt-out (PLAN-7 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.4](PLAN-9.md)).

**Trigger**: a deployment scenario where the offline tree is not
wanted (e.g. CI builds that only ship the online tree).

Add a CLI flag mirroring Jekyll's `also_build_offline: false` so
production deploys can skip the offline build entirely. Currently
the offline build always runs (~1 s cost).

### B9. Phase 7 `--profile-offline` flag (PLAN-7 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.7](PLAN-9.md)).

**Trigger**: Phase 7 misses its 800 ms target and the per-substep
breakdown is needed to identify the dominant cost.

Add per-substep timing instrumentation parallel to Jekyll
offlinify's `tick(:time_*)` accumulators. Per-substep wall-time
isn't captured in the first cut; only the Phase 7 total appears in
the orchestrator's `t.summary()`.

### B10. Phase 7 search-data minification (PLAN-7 §13)

**Routing**: → **Phase 11**. Jekyll's `search-data.js` is not
minified; minifying regresses the offline-tree byte match.

**Trigger**: complaints about page load under `file://` on spinning
disks, or `_site-offline.zip` size pressure.

Compress `search-data.js` (~2.8 MB -> ~1.7 MB at modest JSON
minification). The search index dominates offline-tree size; this
is the highest-leverage size reduction.

### B11. Phase 7 AST-based JTD JS patching (PLAN-7 §13)

**Routing**: → **Phase 11**. Replacing the regex patches with an
AST rewrite carries a real risk of byte drift in the patched
`just-the-docs.js`; Phase 11 verifies byte-identity or accepts the
divergence.

**Trigger**: regex misses in the patch step (the warning lines
`deriveOfflineJtdJs` returns would surface this), typically caused
by an upstream just-the-docs release changing the patched function
shape.

Replace the regex patches with an acorn-based AST rewrite. The
current regexes anchor on specific function signatures inside
`just-the-docs.js`; an AST pass would survive cosmetic upstream
edits.

### B12. Phase 5 `--against-disk` diff mode (PLAN-5 §14 step 11)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.10](PLAN-9.md)).

**Trigger**: a post-write verification scenario actually needs it.

Extend `_diff.mjs` / `_diff_all.mjs` with a mode that diffs the
on-disk Phase 5 output against Jekyll's `_site/` directly, rather
than the in-memory `page.html`. Valuable for triage of post-write
divergences (write-time encoding bugs, line-ending contamination)
that wouldn't show up in the in-memory compare.

### B13. Phase 8 `--no-pdf` opt-out (PLAN-8 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.5](PLAN-9.md)).

**Trigger**: a deployment scenario where the PDF tree is not wanted
(e.g. CI builds that only ship the online tree).

Add a CLI flag mirroring Jekyll's `also_build_pdf: false` so
production deploys can skip the PDF build entirely. Currently the
PDF build always runs (~150 ms cost). Implementation: gate
`writePdf` on a `--no-pdf` flag in `parseArgs` plus a fall-back to
`site.config.also_build_pdf` so the config file remains the source
of truth.

### B14. Phase 8 `--serving` flag (PLAN-8 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.6](PLAN-9.md)).

**Trigger**: a watch-mode flow lands and a mid-edit save can
temporarily break an image reference.

Add a `--serving` flag that flips Phase 8's strict-mode
missing-image throw to a warn. Matches Jekyll's
`site.config.serving` semantics. The `serving` option already exists
as a `writePdf` parameter; just needs a CLI surface.

### B15. Phase 8 build-date semantics (PLAN-8 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.8](PLAN-9.md)).
Switched the PDF title-page date from `commitDate` to wall-clock
(`new Date()`) to match Jekyll's `site.time` semantics. Counts as a
parity improvement, not a regression.

**Trigger**: a `book.bat` user complains that the PDF title page
date doesn't match expectations.

The title page reads `site.buildInfo.commitDate` as the build date
(parsed via the explicit YYYY-MM-DD path; see PLAN-8 §6.10 /
Status finding 7). Jekyll reads `site.time` (process wall-clock).
The two differ when building outside CI several days after the last
commit. Decide which is more useful for a manually-built `book.bat`
run and switch if needed (the `new Date()` fallback in
`formatBuildDate` is already there for the no-git case).

### B16. Phase 8 cross-reference completeness audit (PLAN-8 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.11](PLAN-9.md)).

**Trigger**: a reader complains that a PDF link sent them to the
live site when they expected an in-PDF jump.

When a chapter in `bookData` references an out-of-book URL (the
`urlToAnchor` miss path), the rewriter emits the absolute URL
verbatim. The PDF renders these as live links pointing at the
deploy URL -- which require internet to navigate. Add a verify
harness check that reports every out-of-book href so source authors
can either bring the target into the book (add to `book.yml`) or
accept the live-link behaviour. Currently no automated signal
surfaces these.

### B17. Phase 8 image-extraction unification with `assembleBook` (PLAN-8 §13)

**Routing**: → **shipped in Phase 9** ([PLAN-9.md §5.9](PLAN-9.md)).
`extractImagePaths` retained as a fallback/diagnostic export for the
verify harness and triage tools.

**Trigger**: Phase 8 misses its 200 ms target and the breakdown
shows `extractImagePaths` non-trivial.

The current implementation runs the image-extraction regex AFTER
`assembleBook` returns. The regex could be folded into the assembly
itself (collected as `<img src=>` references are emitted), saving
the post-pass regex sweep (~10 ms). Implementation: thread a `Set`
through `emitChapter` so each chapter contributes its image refs as
it assembles.

### B18. Phase 8 streaming write of book.html (PLAN-8 §13)

**Routing**: → **drop** ([PLAN-9.md §8.2](PLAN-9.md)). The trigger
is "a future book size where the in-memory string causes GC
pressure"; the current scale (~5 MB) is two orders of magnitude
below that threshold and the book hasn't grown materially in years.
Re-add the entry if the underlying constraint changes.

The current implementation builds the full ~5.5 MB book.html string
in memory and writes in one shot. A streaming write (Node's
`createWriteStream` + chunked `bookHtml.slice(...)` per article)
would reduce the peak memory footprint but add complexity.

---

## C. Post-port cutover

The cutover from Jekyll to tbdocs. Sequenced after Phases 1-9 land
and all nine verify harnesses pass clean on the production tree
(PLAN-5 §13, PLAN-8 §13).

**Routing**: → **Phase 10** ([PLAN-10.md](PLAN-10.md)). Phase 11
(the byte-changing items: B1, B2, B5, B10, B11) lands after Phase
10 because retiring the byte-vs-Jekyll acceptance bar is what
makes Phase 11's intentional divergences free to land.

---

## D. Phase 11 sequencing notes

Captured during the Phase 9 → 10/11 split planning so the design
intent survives until PLAN-11.md is drafted (post-Phase-10).

1. **B2 lands first.** It's the largest change (~470 lines deleted
   from [highlight.mjs](highlight.mjs), `scripts/extract_theme_colors.py`
   deleted, `rouge.css` replaced by a generated palette stylesheet),
   sets the pattern for "intentional divergence without the verify
   harness as a safety net", and unblocks the other items by
   proving the new acceptance model works. B1, B5, B10, B11 land
   after in any order -- they're independent.

2. **No Phase 11 verify harness needed.** Phase 10's expanded
   `check_links.mjs` integrity checker (HTML well-formedness,
   duplicate-id, anchor resolution, sitemap / search completeness)
   is the regression detector. Each Phase 11 item just needs
   `check.bat` clean after it lands.

3. **`.twin` source file investigation is the first Phase 11
   commit, not a planning blocker.** We don't yet know where
   the source-of-truth `.twin` style files live (upstream repo?
   local checkout? released artifact?) or what format they have
   (XML? JSON? a custom DSL?). PLAN-11 §1 (Inputs) will document
   the answer; the investigation itself happens in the first
   commit of the B2 work, with findings folded back into PLAN-11
   if material to subsequent commits.

4. **`scripts/extract_theme_colors.py` deletes in the B2 commit,
   not separately.** It exists only to feed the Rouge-class
   indirection in `highlight.mjs` that B2 retires; without B2's
   `SCOPE_TO_ROUGE_CLASS` consumer it has no caller. Same commit,
   same revert boundary.

5. **One PR per Phase 11 item, not one PR for the whole phase.**
   B2 is large enough to deserve its own review window. The
   smaller items (B1, B5, B10, B11) are clean independent
   commits; bundling them would muddy the per-item revert path
   without saving review time. Phase 10's "one PR for the
   cutover" approach was driven by atomicity (commits 1-6 only
   make sense together); Phase 11 doesn't have that constraint.

### C1. Cutover sequence

1. Verify Phases 5+6+7+8 all pass on the production tree
   (`diff -rq _site/ _site-new/` clean modulo accepted divergences;
   `check_links.mjs` clean; PDF renders via `book.bat`).
2. Flip the default destination in `index.mjs` from `_site-new` to
   `_site`.
3. Delete `docs/_site-new/` (no longer used).
4. Retire `bundle exec jekyll build`. The Gemfile, `_plugins/`,
   `_includes/`, `_sass/`, `_layouts/` can all be deleted in a
   follow-up cleanup.
5. Update `build.bat` / `serve.bat` / `check.bat` to invoke
   `node builder/index.mjs` instead of Jekyll.
6. Update the GitHub Pages deploy workflow
   (`.github/workflows/jekyll-gh-pages.yml`) to invoke tbdocs.
7. Update the WIP.md "JS builder port (in progress)" section to
   reflect the cutover.

**Owner**: unassigned. The cutover is gated on the cumulative
verify harness producing zero unexpected divergences; once that
state holds steady across a few content edits, the flip is a
one-sitting task.
