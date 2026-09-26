# Markdown-as-text inventory

Read-only investigation. Nothing in the repository was changed; verification used
small Node scripts in this folder (`task2_fixtures.mjs`, `task2_timing.mjs`,
`probe_staging.mjs`, `probe_staging2.mjs`, `verify_navhops.mjs`,
`verify_navhops2.mjs`, `verify_staging_rigorous.mjs`) run against the repo's own
`node_modules` (resolved through the scratchpad's junction) and, for two probes,
against the real committed `wisdom/data/findings/staging.md`.

---

## Task 1 — Inventory

### Legend for "code awareness"

CommonMark rules a fence/inline parser can know about, abbreviated in the table:

- **F** — backtick *and* tilde fences recognised
- **I3** — up to 3 leading spaces on the opener allowed (a 4-space opener is an indented block, not a fence)
- **CL** — closing-fence rule: same character as the opener, run length ≥ opener's, line otherwise blank
- **IS** — info-string rule: a *backtick* fence's info string may not itself contain a backtick
- **IC** — indented (4-space) code blocks recognised as code
- **NEST** — a fence nested inside a blockquote (`> `) or list item is still recognised, with the prefix stripped
- **CS** — inline code spans, multi-backtick runs (`` ``a`b`` ``) matched correctly
- **HTML** — raw HTML blocks recognised as opaque (not prose)
- **FM** — YAML frontmatter recognised/stripped before anything else runs

"none" = no rule from this list; "hand-rolled (X, Y)" = only the listed rules, by hand, no markdown-it.

### A — Rewrite sites (mutate source or a file)

| # | Site | Matches | Awareness | Misfires on |
|---|---|---|---|---|
| A1 | `builder/render.mjs:141-169` `maskCodeRegions` + `:180-204` `maskInlineCode` | fenced blocks (mask), then per-line backtick/tilde runs (mask) | hand-rolled (F, I3, CL, CS). **No IS** — open regex `/^[ \t]{0,3}(\`{3,}\|~{3,})/` never checks the info string for a backtick. No IC (deliberate, documented gap). No NEST test (works structurally by line-scan, so blockquote/list prefixes pass through as ordinary text — it happens to work for masking purposes but the closing-fence scan doesn't know it's "inside" anything). | A backtick-fenced opener whose info string itself holds a backtick (e.g. `` ```abc`def ``) is accepted as an opener here but refused by A2's `stashCodeFences` (CommonMark-correct) 1550 lines below in the *same file* — the two disagree on the same input. Reproduced directly: `` ```abc`def `` masked by A1, left unprotected by A2, and a `> [!NOTE]` inside it was then rewritten into a live admonition. **Not observed in `docs/` today** — `check_code_regions.mjs` is structurally blind to this class (see its "KNOWN GAP" comments), so a future instance would ship silently. |
| A2 | `builder/render.mjs:1670` `ADMONITION_RE`, `:1704-1730` `stashCodeFences`, `:1732-1772` `rewriteAdmonitions` | admonition blockquotes (`> [!NOTE]` etc.) outside the A1 mask (deliberately — a fence inside an admonition still carries `> ` markers when A1 has already run and been restored) | hand-rolled (F, CL, IS). No I3 (opener anchored with `[ \t]*`, same as A1). No IC, no NEST tracking beyond the line-scan `stashCodeFences` already does for the reason above. | **This is the site the repo's own comments cite as having already shipped broken**: `docs/Reference/Attributes.md`'s `Description` attribute example (a `[Description("...")]` string built from twinBASIC literals `"\`\`\`basic"` and `"\`\`\`"` used as *sample text*, not real fences — see lines 379-393 of that file) used to close the surrounding fence on the embedded literal instead of the real closer, corrupting every admonition on the rest of the page. **Fixed** by the current line-based `stashCodeFences` (it requires a *standalone* fence-only closing line, which the embedded literals never are, since they sit inside a longer source line). Read today: confirmed the current code handles this specific page correctly. The class of bug is real and documented (`check_code_regions.mjs`'s own `ADMONITION_PROBES` reproduce five variants), just not currently tripped by this exact page. |
| A3 | `scripts/convert_em_dash_separators.mjs:59-60` `FENCE_OPEN_RE`/`FENCE_CLOSE_RE`, `:74-99` `splitInlineCode`, `:135-166` `convertText` | same fence-boundary shape as A1 | hand-rolled (F, I3, CL, CS). **Same missing-IS gap as A1** — literally the same regex shape, independently written. No IC (the file's own comment states this as a known, accepted gap, citing `Reference/Core/Get.md`/`Option.md`'s 2-space list-item fences by name). | Verified against the real corpus: `Get.md` and `Option.md` do carry exactly the cited 2-space fences (confirmed at `docs/Reference/Core/Get.md:49-51,69-73`), each nested under a bullet item. This tool's own header comment records that its *inline* splitter (`splitInlineCode`) already shipped one dash-inside-a-doubled-backtick-span bug and was fixed — the defect class has a track record in this exact file, not just a theoretical one. |
| A4 | `scripts/check_examples.mjs:1123-1154` `applyMarkers` | one exact fence-opener *line*, located by an already-markdown-it-derived line number (`fence.line`, from `tb-fences.mjs`'s `collectFences`, which itself uses `md.parse`) | **hybrid**: the *location* is markdown-it-correct; the *edit* is a guarded plain-text splice — reads the line, requires it to match `/^[ \t]*(?:>[ \t]*)*(\`{3,}\|~{3,})tb[ \t]*$/` (NEST via blockquote-prefix tolerance built in) before touching it, else refuses with a named error. CRLF-preserving by construction (captures/reattaches a trailing `\r` per modified line). | Low risk by design — it only ever touches a line it can re-verify, and refuses rather than guessing. Included because it duplicates "split file into lines, edit one, rejoin, preserving CRLF" logic that a shared module should provide once rather than leave as a one-off. |
| A5 | `wisdom/extract/merger.mjs:114-160` `parseStaging`, `:412-435` `serializeStaging` | splits `staging.md` into chunks on any line that is *exactly* `---`, then requires each chunk to start with `## ` | **none** — no fence rule at all, of any kind. `parseSection` (`:162-168`) `return`s `null` for a chunk not starting `## `, and the caller (`:150-154`) silently drops it — which directly contradicts the file's own header comment ("the parser is forgiving... we never silently drop reviewer content", `:106-113`). | **Confirmed live in the real, committed `wisdom/data/findings/staging.md`** — see the dedicated section below. This is the most severe finding in the inventory: real, on-disk section corruption today, not a hypothetical. |

### B — Read-only scan sites

| # | Site | Matches | Awareness | Misfires on |
|---|---|---|---|---|
| B1 | `builder/census_attributes.mjs:377-392` `documentedAttributes` | `docs/Reference/Attributes.md`, per-line `/^Syntax:\s*\*\*\[(\w+)/` and `/^Applicable to:\s*(.*)$/` | none | No fence exclusion at all. Dormant today: the page's own `Description`-attribute example (lines 366-406) demonstrates the *convention* using `"### Syntax"` (a heading, inside a string literal) rather than the literal string `Syntax:`, so it does not trip this scanner as written. A future example demonstrating the `Attributes.md` page format itself (plausible — it is meta-documentation about attributes) would. |
| B2 | `scripts/gen_attribute_probes.mjs:66-90` `parseAttributes` | same file, near-identical `/^Syntax:\s*(.*)$/` + `/^Syntax:\s*\*\*\[(\w+)/` + `/^Applicable to:\s*(.*)$/`, line-by-line | none | Same exposure as B1 — this is an independent, near-duplicate implementation of the same scan (**a third hand-written `Attributes.md` parser**, after B1 and A2's shared subject matter), with its own CRLF-normalisation comment ("Python reads in text mode... Match that, or every line carries a trailing CR") showing it was ported from a different predecessor than B1. |
| B3 | `scripts/check_gate_lists.mjs` (whole file: `gatesFromBat` `:111-118`, `sectionBody` `:121-128`, `gatesFromDoc` `:138-145`, `commandRuns` `:164-180`, `splitSections` `:251-264`, `subjectWrapper` `:273-289`, `proseClaims` `:297-351`) | `README.md` + every `docs/Documentation/*.md` page: batch-file step lists, and five regex shapes over prose (possessive/verbal/line-initial/section-total/back-reference gate-count claims) | **none** — `splitSections` treats *any* line matching `/^#{1,6}\s/` as a new section, full stop; nothing excludes a fenced code block first. | **Confirmed live**: `docs/Documentation/Wisdom.md:305` is a fenced example of the `staging.md` format (see A5) whose first line, `## docs/Reference/VB/Form/index.md · after-remarks`, matches the heading regex. `splitSections` genuinely splits `### staging.md format` into two phantom sections at that point — verified with a direct `awk` sweep of every fenced region in `README.md` and `docs/Documentation/*.md` for a line matching `^#{1,6} `; this is the only hit. It does not currently flip a verdict (the phantom section's body happens to contain no `check.bat`/`test.bat` count phrase), but the tool's internal model of "what section am I in" is provably wrong at that point today, for a reason that has nothing to do with gate counts. |
| B4 | `builder/counts.mjs:112-116` `countAttributeAnchors` | `Reference/Attributes.md`'s **raw** `page.rawContent`, `/^\{: #[a-z0-9]+ \}/gm` | none (regex over raw source, not the rendered/masked form used elsewhere in the same file) | Narrow pattern, low realistic collision surface; no fence in `Attributes.md` currently contains a line of that exact shape. |
| B5 | `builder/counts.mjs:130-140` `countEnumerations` | `Reference/Enumerations.md`'s raw content: split on `/^## Alphabetical index\s*$/m`, then on `/^#{1,6} /m`, then counts `/^- \[/gm` | none — the function's own comment admits it: "it scans one page's raw markdown, so a change to that page's list formatting moves the number." | No fence currently sits inside that page's "Alphabetical index" section, so dormant. |
| B6 | `wisdom/extract/sitemap.mjs:69-87` `parseFrontmatter` | any `docs/Reference/**/*.md`: `content.startsWith('---')`, `indexOf('\n---', 3)`, then per-line `/^(\w[\w_]*)\s*:\s*(.+)$/` | hand-rolled (**FM**, partial — no BOM strip, unlike `discover.mjs`; no YAML lists/multi-line values, only quoted scalars) | Dormant today — "no markdown under `docs/` has a BOM" was checked (matches the AppGlobalClassObject incident's fix). Live the moment an editor reintroduces one, which `WIP.md` documents as something Windows editors do "without being asked." Also, `sitemap.mjs:61-67`'s `walk()` re-implements `scripts/lib/markdown-files.mjs`'s directory walk from scratch (does not skip `docs/_site*` etc. by the shared rule) rather than importing it — a second, independent copy of "which folders are output trees." |
| B7 | `wisdom/extract/prep.mjs:343-388` `parseThreadFrontmatter` | Discord-thread `.md` frontmatter under `wisdom/data/threads/`: same `---`-delimited-block approach as B6 plus inline-array and boolean/number coercion | hand-rolled (**FM**, partial — no BOM strip; a *different* dialect from B6: arrays and type coercion B6 doesn't do) | Two independently hand-written, behaviourally-diverging frontmatter parsers (B6, B7) for what is conceptually one problem. A thread title or tag value containing an unquoted `:` (plausible in harvested Discord content) would misparse under the same `/^(\w[\w_]*)\s*:\s*(.+)$/` per-line rule both share. |
| B8 | `eval/run_case.mjs:99-110` `evaluatorProtocol` | `eval/protocol.md`: `lines.indexOf("---")` for the start marker, `lines.findIndex(l => l.startsWith("## For the orchestrator"))` for the end, slices between | none | Checked the real file: exactly one `---` line (line 10) and zero fences in `eval/protocol.md` today, so dormant — but the mechanism is the same "first bare marker line, no code awareness" shape as A5/B3, applied to the document that becomes the evaluator's own system prompt. A fenced example added before the `---` or containing one would silently move the boundary and could leak orchestrator-only instructions into what the evaluator reads (or vice versa). |
| B9 | `eval/nav_hops.mjs:86-94` `hrefs` | every page's link targets, after stripping fenced blocks with `/^(\`\`\`\|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm` | **hand-rolled but deliberately fence-aware** (F, CL) — the *only* site in the inventory outside the markdown-it-based ones that tries. Verified it correctly handles CRLF (JS regex `$` in multiline mode treats a bare `\r` as its own line terminator, so `[ \t]*$` matches before it — tested directly). **No I3** (opener anchored at column 0, no indent tolerance) and **fixed-length-3 only** (`` ``` `` / `~~~` exactly, not "3 or more" — CommonMark's actual rule), so it cannot recognise a 4+-backtick fence or one indented for a list/blockquote. | Measured precisely against every page under `docs/`: markdown-it finds 1,371 real fences; this regex recognises 1,353 of them (≈98.8%), missing 11 indented and 3 four-backtick fences. Of the 3 real fences anywhere in `docs/` whose content contains `](` (link-shaped text), **zero** are among the missed ones — so no live misfire today, but the gap is real and of the same shape already known to bite this corpus (the same 2-space list-item fences A3 documents by name). |
| B10 | `test/addin/symbols.test.mjs:57-58` `declaredIn`/`firstLine` | markdown returned live by the twinBASIC compiler's LSP hover (rendered from a `[Description(...)]` attribute string, see A2/`Attributes.md`), `/^## \*\*\w+\*\*[^\`\r\n]*\`in ([\w.]+)\`/m` | none | Low risk in practice — the regex only needs the *first* heading line, and every convention-following `Description` puts the heading first (`## **Name** ... \`in Module\``), before any fenced example could appear. Included for completeness since it is literally "markdown held as a string, regexed with no fence awareness," per the task's own phrasing, sourced from a live compiler response rather than a file. |

### C — Checked, out of scope (not markdown-as-text, or not markdown at all)

For completeness, sites the same searches surfaced and were read, then excluded:

- `eval/build_corpus.mjs` — copies `.md` files byte-for-byte (CRLF→LF only) into the evaluator's corpus; no structural parsing.
- `eval/site_search.mjs`, `eval/transcript.mjs` — read the built `search-data.json` / stream-JSON transcripts; no markdown involved.
- `scripts/check_links.mjs`, `check_links_diff.mjs` — operate on the *built* `docs/_site` HTML tree via `builder/link-check.mjs`, never on markdown source.
- `scripts/pick_a11y_sample.mjs`, `sweep_a11y.mjs` — `split("\n")` over their own JSONL result logs, not markdown.
- `scripts/check_regex_safety.mjs` — scans regex *literals inside `.mjs` source files* for ReDoS safety; mentions `Attributes.md`/`Tools.md` only in a comment.
- `builder/highlight-theme.mjs:196-208` `parseTheme` — parses a TextMate-style `Name: value;` theme file, a different text format entirely, not markdown.
- `builder/symbols.mjs:110-124` `headingsOf` — scans **rendered HTML** (`<hN>` tags) with a hand-written linear scan rather than regex (explicitly to avoid `O(n^2)`); real, but not markdown source, so out of the task's stated scope. Same for `render.mjs`'s post-render whole-page HTML rewrites (`padEmptyCells`, `normaliseVoidTags`) and `template.mjs`'s `injectAnchorHeadings` — HTML text, not markdown.
- `wisdom/process/render.mjs:67-70` `truncate` — takes the first line of a Discord message for a reply-quote preview (`.split('\n')[0]`); not structural, no heading/fence interpretation attempted.
- `wisdom/process/thread.mjs`, `wisdom/discord/api.mjs` — read/write JSON and generate `.md`, never scan existing markdown for structure.
- `wisdom/extract/state.mjs` — pure JSON state, no markdown.

### D — Positive precedent (already token/parser-based)

- `scripts/lib/tb-fences.mjs:295-328` `collectFences` — `const md = new MarkdownIt({ html: true })`; walks `md.parse(src, {})`'s tokens for `type === "fence"`, using `t.map` for page line numbers.
- `scripts/check_code_regions.mjs:75-90` `codeRegions` — same bare-instance pattern; walks `fence`/`code_block`/`code_inline` tokens for its before/after diff gate.
- `builder/discover.mjs:94-117` `parseFrontmatter`/`stripBom` — `gray-matter`, with an explicit BOM-strip in front of it because `matter.test()` doesn't do that itself.
- `builder/counts.mjs:242-249` `findCountRefs` (+ `:287-303` `validateCountNames`) — reuses `render.mjs`'s `maskCodeRegions` rather than re-deriving "what is code."
- `builder/counts.mjs:322-327` `findSurvivingPlaceholder` — scans **rendered HTML** with the `<code>`/`<pre>` leading-alternation guard (`WIP.Build.md`'s documented safe shape for an HTML-level rewrite).
- `builder/render.mjs:860-1173` (`standaloneIalForwardPlugin`, `tightLooseListPlugin`, `looseDeflistPlugin`) — these register as `md.core.ruler` passes that run *after* block parsing and consult `token.map` to index back into `state.src.split("\n")` only for already-parsed, already-located tokens. Not a "site" in the same sense (no independent fence-detection logic — they consume markdown-it's own structural output), included as the architecture the rest of the file's two fence parsers (A1/A2) do not follow.

### The `staging.md` finding, in detail

This is the strongest concrete result in the inventory: real, on-disk corruption in the
**already-committed** `wisdom/data/findings/staging.md` (15,553 lines), caused exactly
by A5's lack of fence/blockquote awareness. Traced with markdown-it against the real file
(`verify_staging_rigorous.mjs`):

Real source, `wisdom/data/findings/staging.md:14238-14251` (unedited excerpt):

```
14238: ## docs/Reference/VBA/Strings/Len.md · after-remarks [DUPLICATE? -- see also thread ...]
14239:
14240: > [!NOTE]
14241: >
14242: > In twinBASIC x64 builds, `Len()` and `LenB()` return different values...
14243: >
14244: > ```tb
14245: ReDim arr(LenB(udt) - 1)
14246: ```
14247:
14248: _Source threads: 1314412625714479125 · confidence: high_
14249: _Date range: 2024-12-06_
14250:
14251: ---
```

Line 14245 is missing its blockquote continuation marker (`> `) — a real authoring slip in
a fenced sample nested inside a `> [!NOTE]` admonition. Per CommonMark, an unprefixed line
cannot lazily continue a blockquote-wrapped fence, so markdown-it does **not** close the
fence at line 14246 (which itself has an empty info string and is not part of the same
fence at all): it opens a *new*, unclosed fence there that runs for 52 lines, to line 14297,
swallowing the real meta lines (14248-14249), the real section-separator `---` (14251), and
the entire next heading and its body as literal fence content.

`parseStaging` knows nothing of this. Its splitter still cuts a chunk at line 14251 (a
literal `---`, which is all it checks), producing a section headed `## docs/.../Len.md ·
after-remarks [DUPLICATE? ...]` whose parsed body is truncated to 7 lines ending mid-fence
(`"\`\`\`"`, confirmed) — and whose `_Source threads:_`/`_Date range:_` metadata
(`1314412625714479125` / `2024-12-06`) belongs to the **earlier, unrelated** "ReDim arr"
section, not to any of the six thread IDs the heading itself names. Re-running
`extract --merge` today would serialize this wrong pairing back to the committed file.
`raw bare --- lines: 1160` and `parsed.sections.length: 1160` agree only because the
splitter always produces exactly one section per `---` it sees, whether or not that `---`
was a real boundary — count-matching is not evidence of correctness here, and a naive
same-shape check (a manual fence-open/close toggle with no CommonMark closing-length rule)
independently produced a *misleading* "100 bare dashes inside a fence" figure before this
markdown-it-based re-check narrowed it to the one genuine, confirmed case above — which is
itself a small demonstration of the task's point: even a "fence-aware" hand check can get
the wrong answer.

---

## Task 2 — Can markdown-it supply the regions?

Tested against the repo's own `markdown-it` (from `node_modules`, both a bare
`new MarkdownIt({ html: true })` instance — matching `tb-fences.mjs`/`check_code_regions.mjs`
— and the site's configured `createMarkdownIt` from `builder/render.mjs`, imported by file
URL; importing it has no observable side effect, its top-level code is declarations only).

**(a) Fence/`code_block`/`html_block` tokens with `.map`, top level.** Yes. A top-level fence
`` ```tb\nDim x\n``` `` parses to a `fence` token with `map=[2,5]` (half-open line range,
0-indexed) — confirmed the range covers exactly the opener, content and closer lines.

**(b) Same, inside a blockquote and inside a list item — does `.map` cover the *prefixed*
source lines?** Yes to both, tested separately and combined. A fence inside a plain list
item (`- item\n\n  \`\`\`tb\n  Dim x\n  \`\`\`\n`) gets its own correctly-nested `fence`
token (`map=[2,5]`) under `bullet_list_open` / `list_item_open`, same shape as top level.
For the prefix question specifically: `` > ```tb\n> Dim x\n> y = 1\n> ``` `` gives
`map=[2,6]`, and indexing the *original, prefixed* source at that range yields
`["> \`\`\`tb", "> Dim x", "> y = 1", "> \`\`\`"]` verbatim — the map is in terms of raw
source lines, prefix included, while `token.content` is separately given already unwrapped
(`"Dim x\ny = 1\n"`, `>` markers stripped). Both are available from one parse. Same result
one level deeper still (fence inside a blockquote inside a list item): `map` correctly
spans just the fenced lines with their combined `"   > "` prefix intact in the raw slice.

**(c) Inline code span positions.** Confirmed absent, exactly as the task assumed:
`code_inline` tokens carry `map=null` always (only block-level tokens get a `.map`), plus
`.content` (the text between the backtick delimiters) and `.markup` (the delimiter run
itself, e.g. `` ` `` vs `` `` ``) — no character offset into the source line. A correct
inline splitter therefore cannot be "ask markdown-it"; it has to be the same manual
backtick/tilde-run scan `maskInlineCode` (A1) and `splitInlineCode` (A3) already implement
independently — markdown-it can supply *which source lines* an inline run occupies (via the
parent `inline` token's own `.map`), but not offsets within them.

**(d) Frontmatter.** Nothing in either instance (bare or site-configured — identical
output) handles it, and it is actively **misparsed**, not just ignored: given
`"---\ntitle: X\npermalink: /y\n---\n\n# Heading\n"`, both instances produce `hr` for the
first `---`, then treat `"title: X\npermalink: /y"` followed by the second `---` as a
**setext H2 heading** (`heading_open map=[1,4]`, inline text `"title: X"` + softbreak +
`"permalink: /y"`), then the real `# Heading` as a second, separate H1. This confirms
`discover.mjs`'s approach is necessary, not optional: strip a BOM, then hand the *whole*
source to `gray-matter` (or an equivalent frontmatter splitter) **before** any markdown-it
call, exactly as it does — never lean on markdown-it to recognise frontmatter itself.

**Timing** (`task2_timing.mjs`, single-threaded, this machine): 912 markdown files under
`docs/` (via `markdownFiles`, output trees already excluded), 3.98 MiB total source.

| parse | total | per-file mean |
|---|---|---|
| full `md.parse` (block + inline + core rules) | 234-257 ms | 0.26-0.28 ms |
| block-only (`md.block.parse` called directly, bypassing the `inline`/`linkify`/`replacements`/`smartquotes` core rules) | 33.7 ms | 0.037 ms |

Block-only is genuinely block-only, not merely faster for some other reason — verified
directly: after calling `md.block.parse()` alone, every `inline`-type token's `.children`
is still the empty array `[]` (markdown-it's `Token` constructor default) and its
`.content` is the raw, unsplit source text; the "inline" *core rule* — the thing that
actually walks a line for `` `code` ``/`**bold**`/etc. and would double as A1/A3's job if it
exposed offsets, which per (c) it does not — never ran. Full-parse per-file distribution:
min 0.012 ms, median 0.092 ms, p95 1.10 ms, max 5.50 ms. Block parsing alone is ~7x cheaper
and is sufficient for every region-finding need in this inventory (fences, code blocks,
html blocks, headings for section-splitting) — only inline code-span detection needs
anything more, and that "more" is the hand-written splitter from (c), not a deeper
markdown-it call.

---

## Task 3 — The union of needs, and where the module should live

### What every site in Task 1 is actually asking for

| Need | Sites that need it |
|---|---|
| Block regions (fence / code_block / html_block / prose) with line ranges, from one real block parse | A1, A2, A3, B3, B4, B5, B9, D (already has it, twice, independently) |
| A "mask code, rewrite prose, restore" helper built on the above, correctly covering the info-string rule the current one misses | A1, A2, A3 |
| One tested inline code-span splitter (backtick/tilde-run aware, offsets into the raw line) | A1, A3 |
| "Split into sections on a marker line, but only outside a code region" | A5 (bare `---`), B3 (`#{1,6}` headings), B8 (`---` twice) |
| Frontmatter: BOM-strip + `---`-delimited block + YAML parse, one implementation | B6, B7 (currently two, diverging), plus `discover.mjs`/`nav_hops.mjs`'s `gray-matter` calls, which could use it instead |
| CRLF / byte-exact round-trip (no forced LF normalisation of the caller's *output*) | A3 (has this today, carefully) — the module must not regress it |
| The existing directory walker, reused rather than re-implemented | B6 (`sitemap.mjs`'s private `walk()` duplicates `scripts/lib/markdown-files.mjs`) |

A fact worth folding into the frontmatter design specifically: `gray-matter@4.0.3` bundles
its **own** nested `js-yaml@3.14.2` (`node_modules/gray-matter/node_modules/js-yaml`,
confirmed by reading its `package.json`), while `builder/data.mjs`, `builder/tbdocs.mjs` and
`scripts/check_publish_policy.mjs` import the top-level `js-yaml@4.1.1` directly for
`_config.yml`/`_book.yml`. Page frontmatter and site configuration are parsed by two major
versions of the same YAML library today. A shared frontmatter helper should parse the
`---`-delimited block with the direct `js-yaml@4` dependency instead of pulling in
`gray-matter` (and its private v3) at all — one YAML implementation for the whole build.

### API sketch

```js
// a new shared module, e.g. lib/markdown-regions.mjs + lib/frontmatter.mjs

/** Every fence / code_block / html_block region, in document order, from one
 *  bare (site-plugin-free) block parse. map is [startLine, endLine) 0-indexed,
 *  against the raw source exactly as split("\n") would give it — blockquote/
 *  list prefixes included, per Task 2(b). */
export function blockRegions(src) // -> {type, map:[a,b], content, info?}[]

/** Generalizes maskCodeRegions (A1) and stashCodeFences (A2) into one,
 *  CommonMark-correct (fixes the missing info-string rule both A1 and A3
 *  share) implementation. indented:false matches today's pre-render-rewrite
 *  choice; true is what check_code_regions.mjs's KNOWN GAP 1 wants instead. */
export function maskCode(src, { indented = false } = {}) // -> {masked, restore(masked) => src}

/** The one tested backtick/tilde-run scanner inline positions actually need
 *  (Task 2(c)): splits ONE line into alternating segments. */
export function splitCodeSpans(line) // -> {code: boolean, text: string}[]

/** Chunks src on lines matching isMarker, using blockRegions to skip any
 *  marker-shaped line that sits inside a fence/code_block/html_block. Both
 *  A5's bare "---" and B3's "^#{1,6} " are isMarker predicates over this. */
export function splitOnMarker(src, isMarker) // -> {heading: string|null, lines: string[]}[]

/** BOM-strip + "---"-delimited block + direct js-yaml v4 (no gray-matter).
 *  Byte-preserving on `content` (CRLF untouched) per the A3 constraint. */
export function parseFrontmatter(raw) // -> {data: object, content: string} | null
```

### Where it should live

The constraint stated in the task is real and current: `builder/render.mjs:383`'s own
comment — *"Matched against the raw info string rather than parsed with
scripts/lib/tb-fences.mjs's parseInfo: builder/ must not depend on scripts/"* — rules out
`scripts/lib/` as the home, because `builder/` is one of the four required consumers. The
reverse direction is already precedented and fine (`scripts/check_code_regions.mjs` imports
`../builder/render.mjs` directly), so the module *could* physically live under `builder/`
— but `wisdom/` and `eval/` importing from the site generator for something as basic as
"find the fences in a markdown string" is a layering smell in the other direction: neither
tool has anything else to do with `builder/`, and `builder/` is the actively-churning,
large module in this repo (per `PLAN-scheduler*.md`) — not somewhere a Discord-harvesting
tool's frontmatter parsing should have to track.

**Recommended: a new top-level directory, sibling to all four** — e.g. `lib/` at the repo
root (`lib/markdown-regions.mjs`, `lib/frontmatter.mjs`), imported by relative path from
`builder/`, `scripts/` (and `scripts/lib/`), `wisdom/` (and `wisdom/extract/`), and `eval/`
alike. This is the only placement where none of the four is made to depend on another
subsystem's tree, it matches the existing `scripts/lib/` precedent of "a lib/ folder holds
cross-cutting non-CLI modules" one level up, and `eval/nav_hops.mjs` already reaches across
tree boundaries for exactly this kind of shared helper (it imports
`scripts/lib/markdown-files.mjs` today, by absolute file URL, with a comment explaining why
— the same import shape this new module would use from `wisdom/`, `eval/`, and `builder/`).
The one naming risk is visual adjacency to `scripts/lib/`; `mdlib/` is a fine alternative if
that confusion matters more than the short name.
