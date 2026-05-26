# Future Work

Open follow-up tasks discovered during the tbdocs port. Each entry
describes how the issue surfaced, what's known about the root cause,
the current mitigation, and what an investigation would look like.
None of these are blocking the current phase milestone.

When picking up an entry: re-run the discovery step listed under
"Reproduce" before assuming the symptom is still current -- code on
either side of the divergence may have changed since the entry was
written.

---

## 1. Hidden secondary divergences on accepted-divergence pages

**Discovered**: Phase 6 verify (search-data byte comparison vs Jekyll's
`docs/_site/assets/js/search-data.json`).

**Reproduce**:
```
cd builder
node index.mjs                       # builds _site-new/
node verify-phase6.mjs               # surfaces non-accepted content diffs
```

**Symptom**: After the NBSP-handling fix in `search.mjs`'s
`sanitiseContent` (Phase 6 was treating ` ` as whitespace; Ruby
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

**Owner**: unassigned. Pick this up after Phase 7 / Phase 8 land if
the Phase 6 release status is "shipped with one annotated accepted
divergence".
