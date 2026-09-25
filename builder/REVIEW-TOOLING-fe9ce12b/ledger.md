# Review ledger (condensed pass reports, for synthesis)

## VERIFICATION STATUS (details in scratchpad/verify/V*.md)

- V1 (builder/, 23 findings): all CONFIRMED. Severity notes: A2-1 R2 not R1 (unreachable code, no
  live divergence); A3-4 R3 not R2 (two 4-line predicates). L4-8: 4 of 5 helpers byte-identical,
  encodeSpaces same behaviour, different idiom. Conflicts: writeBaseline -> L2-4 right (equals
  JSON.stringify(x,null,2)+"\n" except an empty list, run); normalizeBaseurl -> A9 right (premise
  expired: book.mjs imports compress.mjs and data.mjs); escapeHtml -> keep A3-2, narrowed. Five
  noticed-in-passing items in V1.md (another stale diff-tool reference, a third HTML-escaper copy,
  an exit-code ordering hazard, ...).
- V4 (L3, 6 findings): all CONFIRMED. L3-3 nuance: a bare --- inside a fence does not make the
  section vanish; it cuts off the rest of that section's body AND its meta/finding_ids line (the
  caller drops the null); replay of the real 15,553-line staging.md drops 0 chunks today. L3-2: an
  unhandled spawn 'error' is an uncaught exception, bypassing both catches and finishTidy -- no
  uncaughtException handler in the file. A3-6 CONFLICT RULED: both partly right -- fenced, indented
  and inline code are always escaped, but hand-authored raw HTML (<pre>, headings; html:true,
  markdown-it's own html_block/html_inline) passes through unescaped and IS exposed to the three
  whole-page rewrites. Not live: zero hand-written <pre> or heading tags in 912 pages. The invariant
  is written nowhere near the sites nor in WIP.Build.md, which has an adjacent precedent ("Do not
  rely on that accident"). -> keep A3-6 as R2 hack: a real, unguarded, undocumented path.
- V3 (harness, samples, book; 15 findings): 10 CONFIRMED, 5 CORRECTED (details only):
  A7-1 tbrun matches 3 of the 5 shapes (case-insensitive), still misses "[BUILD] ERROR" and
  "[LINKER] compilation (codegen) error" (I had told the user "2 of 5" -- corrected to them);
  A7-3 click() used directly in 4 of 10 scenario files (appdata, panes, sample10, sample15), not all;
  A7-4 addin_test imports 10 names from tb-registry, not 9; A8-2 path citations are 11 (strict) or 13
  (bare filename) -- the list wrongly had WIP.Build.md and missed build_package_api.mjs and
  tb-fences.mjs (V3.md has the exact list); A9-5 12 files repeat the createRequire block, not ~15.
  L4-10: YES, twin-api's logicalLines keeps tb-fences' quote-aware comment stripping (8+ cases incl.
  "" then a real apostrophe), but the swap is not mechanical: twin-api keeps blank lines, `line`
  1-based vs `at` 0-based, no trim, recognises Rem. tb-fences has NO /* */ handling at all.
  A7-2's kind (struct vs hack) arguable, left.
- V2 (gates, links, a11y, CI, small tools; 29 findings): 25 CONFIRMED, 4 CORRECTED: A4-3
  LINK_ATTR_TABLE is 21 tags / 26 flattened pairs (not 20); crawl_check's 5 exact; RAISE TO R1 -- the
  gap is live (crawl_check misses srcset, poster, cite, formaction, action, data, longdesc today).
  A5-1: 8 scripts, not 7 (check_tree_fresh.mjs too). L2-5: 19 files exact; ~5 AST shapes rather
  than 4. L2-6: four files use try/finally cleanup, not three. All three conflicts: keep the
  original findings alongside L4's classification (different questions).
- ALL FOUR VERIFIERS DONE.
- ORCHESTRATOR CHECK of the inventory's "live staging.md corruption" claim: NOT CONFIRMED. Running
  the real parseStaging on the real file: section 1060 (Len.md, holds the ReDim sample) carries
  finding_ids ["1314412625714479125"], dates 2024-12-06 -- exactly the meta beneath it on disk;
  sections 1059 and 1061 keep their own. The heading's "see also thread ..." lists the OTHER
  duplicates, which misled the agent. What IS real: a content slip -- staging.md:14245-14246 lack
  the "> " continuation, so if that section is ever grafted into Len.md it renders as a broken
  admonition and a fence that runs on (markdown-it reads 14246-14297 as one fence). A data defect a
  markdown-aware check of section bodies would catch; not mis-pairing.
- ORCHESTRATOR CHECK: docs/Documentation/Wisdom.md:304 opens a fence, :305 is "## docs/..." inside
  it -> check_gate_lists.mjs's splitSections splits there (dormant: that phantom section states no
  gate count). CONFIRMED.

## THEME raised by the user (2026-09-25): markdown handled as text without parsing first

The user's observation: markdown is repeatedly treated with regexes directly, without first parsing
the file to separate code. Instances: render.mjs maskCodeRegions/maskInlineCode and stashCodeFences
(A3-1), convert_em_dash_separators.mjs (L3-4, L4-7), wisdom merger.mjs '---' split (L3-3), wisdom's two
frontmatter parsers (A10-2), census_attributes.mjs's Attributes.md line regexes; precedent for doing it
right: tb-fences.mjs and check_code_regions.mjs (markdown-it tokens), discover.mjs (gray-matter).
Direction: ONE shared module deriving prose/code/HTML/frontmatter regions from markdown-it's block
parse (the renderer's own view) + one tested inline-code splitter; every markdown scan/rewrite goes
through it. This is a headline theme for the review, with a design decision for the user.
Inventory agent DONE -> scratchpad/md-inventory/INVENTORY.md (15 sites: 5 rewrite/A,
10 read-only-scan/B, cross-referenced against A3/A10/L3/L4's findings above and confirms
them; sharpest new result: live, on-disk section corruption in the COMMITTED
wisdom/data/findings/staging.md, traced with markdown-it against the real 15,553-line file
-- a blockquote-fence missing its "> " continuation at line 14245 makes markdown-it read
lines 14246-14297 as one unclosed fence, and parseStaging's bare-"---" splitter attaches
a DIFFERENT section's _Source threads:_/_Date range:_ meta to the "Len.md · after-remarks"
heading; re-running extract --merge would serialize the wrong pairing back to the repo.
Revises L3-3's "not live today" -- it IS live, just not via the bare-dash-in-fence shape
L3-3 checked; a naive fence-aware toggle also mis-verifies this, worth noting for
whoever writes the fix. Also confirmed A3-1's repro independently (own read, before
seeing A3's note). New: B3 check_gate_lists.mjs's splitSections also mis-splits on a
"## ..." line inside a fenced staging.md-format example at Documentation/Wisdom.md:305
(dormant, same root cause class as L3-3, different file). Task 2: markdown-it answers
all confirmed empirically (fixtures + real corpus); frontmatter is ACTIVELY misparsed
(hr + setext H2), not just ignored, if not stripped first. Timing: 912 files/3.98MiB,
full parse 234-257ms (0.26-0.28ms/file), block-only 34ms (0.037ms/file, ~7x cheaper,
verified to skip inline splitting for real). Recommended home: new top-level lib/
(sibling to builder/scripts/wisdom/eval), since builder/ can be imported FROM scripts/
already (check_code_regions.mjs does) but not the reverse -- scripts/lib/ is out because
render.mjs:383 says so verbatim, and putting it inside builder/ would make wisdom/eval/
depend on the site generator for fence-detection, which is backwards. Also verified the
js-yaml skew independently: gray-matter@4.0.3 nests js-yaml@3.14.2
(node_modules/gray-matter/node_modules/js-yaml), while builder/data.mjs, tbdocs.mjs and
check_publish_policy.mjs import the top-level js-yaml@4.1.1 directly -- confirms the
follow-up note above from package.json reads, not just cited.
Follow-up (user asked why two parsers): gray-matter is a frontmatter splitter + YAML, not a markdown
parser -- but it bundles js-yaml 3.14.2 while the build parses _config.yml/_book.yml with the direct
js-yaml 4.1.1: page frontmatter and site config go through two YAML major versions. Users:
builder/discover.mjs:8, eval/nav_hops.mjs:35. discover.mjs strips a BOM itself because matter.test()
does not. Recommendation (told the user): drop gray-matter; a small frontmatter splitter in the
shared markdown module + js-yaml 4. Oracle: every page's parsed frontmatter deep-equal both ways
(906 pages) + identical built trees.

Verifier column: what must be re-read before a finding goes into the review.

## A4 -- link checkers (done)

Two-checker question, evidence:
- "Tree the build did not produce" (release zip, bisect, foreign artifact) is stated in six places, exercised nowhere: CI runs check_links.mjs only in-process via check_links_diff.mjs on fixtures; the release zips the tree the same job already checked; git history has no such use. crawl_check.mjs (live HTTP, person-run after release, Building.md:653-655) is the only post-release check and shares no code.
- Shared (link-check.mjs): extraction, resolution, oracle, cross-file checks, human-readable reports. Parallel: tree loading (deliberate, PLAN-checks "What is being moved"); findings translation (clone); statSafe; 1/2/3 exit assembly (deliberate: tbdocs ORs build-failure bits too, tbdocs.mjs:1566-1584).
- Harness cost: 763 lines, 3 CI steps (~0.3 s, ~1 s, ~0.3 s), not in check/test.bat; fixture counts break on unrelated changes (fonts preload: broken 3 -> 9, test/README.md).
- Harness catches (all in the shared core or fixtures, none algorithm-vs-algorithm): 39e03ab2 brokenUnique double count; d2c3a743 skipped check printed as clean; Phase 2 coordinate bugs (95,839 and 11,815 phantom links); Phase 3 writeOfflineRedirects dependency gap and resolution-cache bug; the dead --check-html gate; revived scriptSelfTest.
- Recommendation: option 2 -- check_links.mjs keeps its disk walk and CLI but calls check.mjs's exported checkChunk/joinChunks/findingsFor/formatReport; harness then compares disk-read vs memory-read over one implementation (still catches index/coordinate bugs); fixture counts stay as a regression test. Not option 3: capability cheap to keep; tbdocs would gain an unrelated job; post-release checking wants HTTP anyway.

Findings:
- A4-1 R3 dup statSafe twice: link-check.mjs:455-457 (FsOracle), check_links.mjs:151-153. VERIFY identical.
- A4-2 R2 dup findings translation: check.mjs:438-449 findingsFor vs check_links.mjs:621-634 buildFindings; human-readable twin already shared. VERIFY clone.
- A4-3 R2 dup crawl_check.mjs:91-108 own attribute table, 5 tag/attr pairs vs link-check.mjs:38-60 LINK_ATTR_TABLE's 20; no record. VERIFY counts.
- Split candidates: none (check.mjs, check_links.mjs, check_links_diff.mjs coherent).
- Lead for L2: check_links.mjs:276 oracle default depends on platform (index on win32) -- reasoned.
- DECIDED by the user (2026-09-25): option 2. check_links.mjs stays as a thin wrapper over
  builder/check.mjs. Record under decision 5 in PLAN-TOOLING-REVIEW.md when the passes are in;
  the fix goes in Phase 2 (shared code). A4-3 (crawl_check's table) is separate, not decided.

## A9 -- book pipeline (done)

Decision 1 scope: the book build loads exactly ONE file from perf/ at run time: perf/detach-pages.js
(via render-book's --additional-script). perf/timing-handler.js is only mentioned in a comment
(progress-handler.js:8). Places naming detach-pages.js: book.bat:13,39; tbdocs-gh-pages.yml:196;
render-book.mjs:28 (comment); Tools.md:108,975; PDF-Generation.md:44,197,395,396,430; Building.md:86;
docs/assets/css/print.css:136 (comment); paged.browser.js:30542 (comment, fork). AND five perf scripts
resolve it next to themselves -- perf/measure.mjs:366, probe-tabs-vs-procs.mjs:48,
probe-renderer-mem.mjs:71, probe-parallel.mjs:61, probe-memory.mjs:66 -- which break on the move
unless their paths are updated (mechanical; perf otherwise untouched).
Original of the measure-pass copy: perf/phase0-measure.mjs (f76701a4); book/lib/measure-pass.mjs was
extracted from it 40 min later (d963c183). Note only.

Findings:
- A9-1 R2 hack: pdf-lib shims (fast-*.mjs, parallel-deflate's PDFStreamWriter subclass) unguarded;
  only the exact pin 1.17.1 (recorded perf/notes/08-pdf-lib.md:1751-1757) -- covers accidental drift,
  not a deliberate bump; a behavioural upstream change fails silently. Fix: load-time shape
  assertions per shim, modelled on axe-scan's SOURCE_PATCHES counts. pdf-lib upstream abandoned
  (@cantoo fork evaluated and rejected, 08-pdf-lib.md:5048-5061) -> R2 not R1.
- A9-2 R2 struct: no equivalence test of shimmed vs stock pdf-lib output anywhere (one-off manual
  checks in perf notes). Fix: check_pdf_shims_equiv.mjs like check_axe_patch_equiv (stock pdf-lib in
  a child process). Would be a new test.bat gate -> gate lists/CI/decision-6 gate.
- A9-3 R2 dup: onebuf machinery (pack, _cow, _registerContext, _appendArray, _makeFromRange,
  _makeFromAppend) in both fast-array-onebuf and fast-dict-onebuf; recorded reason
  (fast-array-onebuf.mjs:36-39) covers only the singleton; _registerContext/_appendArray identical
  bar names. Fix: book/lib/onebuf-range.mjs factory.
- A9-4 R3 dup: _writeUint/_digitCount in fast-refs and fast-refs-class. MOOT if A9-6 moves
  fast-refs.mjs to perf/ (orchestrator confirmed fast-refs.mjs is imported only by perf/measure.mjs:428
  and perf/phase0-measure.mjs:28; fast-refs-class does not import it).
- A9-5 R3 dup: ~15 shims repeat createRequire + require('pdf-lib/cjs/...').default blocks.
  Fix: book/lib/pdf-lib-internals.mjs.
- A9-6 R2 struct: four A/B-baseline shims live in book/lib but only perf/ loads them: fast-refs,
  fast-dict-array, fast-dict-iter, fast-parse-dict (render-book.mjs:56-58 records them as baselines,
  not their location). Fix: move into perf/ and update perf's imports. NEEDS USER OK: the converse of
  decision 1 (book -> perf), which the user did not decide.
- A9-7 R2 dup: the code-guard alternation (<code>/<pre> leading alternative) re-typed by hand:
  book.mjs:210 CODE_OR_PRE_BOOK vs IMG_SRC_RE_BOOK book.mjs:228-229 (same file!), pdf.mjs:143-144
  IMG_SRC_RE (identical), offline-rewrite.mjs:299 HTML_COMBINED_RE. Safety-critical, no gate ties
  them. Fix: one exported fragment. (Expect overlap with L3.)
- A9-8 R2 dup: normalizeBaseurl book.mjs:303-307 == offline-rewrite.mjs:232-236 (exported); recorded
  reason (Jekyll plugins independent, book.mjs:300-302) expired at the Node cutover; comment also
  misnames offline.mjs. Fix: import it. VERIFY byte-identical.
- A9-9 R3 dead: fast-dict-array.mjs:9 cites docs/lib/fast-parse-dict.mjs (moved in 4c36c8d6).
- A9-10 R2 dead: pdf.mjs:6-9, 99-107 justify exports by the deleted _diff.mjs/_triage.mjs (644d6bdb);
  extractImagePaths (pdf.mjs:146-158) has zero callers. deriveBookOutputs is live (writePdf).
  VERIFY zero callers.
- Split candidate: builder/book.mjs -- resolver (§A), book.html assembly (§B-F, incl. rewriteBookHrefs),
  coverage checker (§G); pdf.mjs already imports the three as if separate.
- Verified sound: book.bat; render-book's 13-shim import list consistent; __xInstalled guards;
  paged.js fork divergence fully recorded (20 [PATCH] tag families, 52 sites, Fixes-PagedJS.md);
  pdf.mjs IMG_SRC_RE follows the guard rule; postprocesser/outline are attributed ports.
- Leads: render-book.mjs:204-225 hand-rolled argv (L1); offline.mjs imports from offline-rewrite
  (the model A9-8 should follow).

## A8 -- samples and package API (done)

- A8-1 R1 dup: census_attributes.mjs MODS (138-148) lacks Overridable (+Iterator, Dim; tb-fences has
  Async/PtrSafe/... too) vs twin-api.mjs:123-125 and tb-fences.mjs:340-343. "Public Overridable Sub"
  -> DECL_RE fails -> VAR_RE matches -> "Variable". ORCHESTRATOR VERIFIED the trace. IMPACT CLAIM FALSE:
  BETA 983 cache has 31 Overridable Sub/Function/Property lines, 0 carry an attribute (inline or above,
  past comments/#If), and block tracking uses only type keywords (OPEN_RE/CLOSE_RE, 157-159), so no
  stack corruption. Dormant divergence. Two more claimed divergences to VERIFY: blankStrings (170-179)
  no "" escape; BLOCK_COMMENT_RE per line, stateless (twin-api stateful, 56-66).
- A8-2 R2 struct: census_attributes.mjs in builder/ breaks render.mjs:383's rule "builder/ must not
  depend on scripts/"; check_tree_fresh.mjs:57-63 IGNORED_FILES exists only for it. Move to scripts/
  beside build_package_api; ten path citations: WIP.md, WIP.Harness.md, WIP.HelpAddin.md,
  WIP.ExamplesBuild.md, WIP.Build.md, BUGS-TO-REPORT.md:430, Tools.md #census-attributes,
  docs/Reference/Attributes.md:588 (HTML comment, published page), tb-packages.mjs:2, twin-api.mjs:17.
- A8-3 R3 dup: fence unit key twice in check_examples.mjs (:424 makeBatches, :675 unitsOf).
- A8-4 R2 struct: census_attributes and gen_attribute_probes' parseTargets have no ride-along probes;
  both have shipped silent misparses before (parseTargets' own comment).
- Split: check_examples.mjs -- 8 jobs (templates 125-193, selection 201-378, batching 380-506,
  staging 508-568, orchestration 570-655/928-949, bisection 657-927 [270 lines, 14 fns], diag mapping
  inside buildStaged 643-653, 3 report modes threaded as booleans) + 425-line probe suite 1157-1581.
  NOT gen_attribute_probes (47% is the EXPLORATORY data table).
- Sound: serialize/strip/kindOf name collisions coincidental; symbols.mjs is not a .twin scanner;
  tb-fences tested only via check_examples' runProbes (74 probes).
- Leads: L2 -- no gate enforces "builder/ must not depend on scripts/" (import-direction check).

## A1 -- build orchestration (done)

- A1-1 R1 struct: Gantt drops checkBook, checkReport (section "Check") and vendorAssets (no
  GANTT_SECTION entry) on every build -- gantt.mjs:39-49 renders Seeds/Spine(+Render)/Write only; the
  "Other" colour (gantt.mjs:12) is unused; Builder.md:410 promises an "Other" bucket. Reaches the
  published Build Info page; their durations still stretch the axis. ORCHESTRATOR VERIFIED.
- A1-2 R1 hack: picocolors undeclared (tbdocs.mjs:35, scheduler.mjs:5); via puppeteer -> cosmiconfig
  -> parse-json -> @babel/code-frame. Fix: declare 1.1.1.
- A1-3 R2 dup: on-demand task run/time/report block x3 in cpu-worker.mjs (360-377, 423-440, 469-486).
- A1-4 R2 dead: tbdocs.mjs:196-209 exports makeTimer, zero callers; offline.mjs:98-111 private copy;
  its reason (offline.mjs:95-97, "verify harnesses and diff tools") expired with 644d6bdb.
- A1-5 = A2-1 (dead writeOfflinePages branch cloning cpu-worker.mjs:183-201). MERGE.
- A1-6 R2 conv: exit-code bits set at 7 sites with magic numbers (tbdocs.mjs:560, 1469-1470,
  1568-1573, 1598, 1610); bit 0 conflates 5 causes. Fix: failBuild(bit) + named constants.
- A1-7 R3 dead: cpu-worker.mjs:510 writes literal 4 (FAILED) -- and nothing ever reads FAILED.
- A1-8 R3 struct: tbdocs parseArgs (91-194) not exported, untested.
- Split: tbdocs.mjs -- TASKS literal fuses DAG topology with task bodies (260-1257, 61%); dispatch's
  submit() is SAB machinery (788-911); check glue (1085-1256); Gantt/timing (1268-1403) belongs by
  gantt.mjs (A1-1 is the cost); console report (1478-1525); exit policy scattered.
- Sound: small modules; SAB layout 174,100 bytes matches Builder.md; HANDLERS key sets match; SAB
  constants imported by name (except A1-7); barrier invariant; --dry-run and --profile-offline LIVE,
  Tools.md flag table matches 20/20; stall watchdog matches WIP.Build.md.
- Leads: offline.mjs's "Re-export surface for diff tools" (55-88, ~25 names) has zero importers (A2).

## A2 -- output stages (done)

- A2-1 [agent R1, likely R2] dead: writeOfflinePages (offline.mjs:244-289, zero callers; 258-280 clone
  of cpu-worker.mjs:183-201), writeOffline's unread `precomputed` param (117), buildSitePaths +
  fallback (207, 213, 359-394; tbdocs.mjs:705-706 always sets sitePaths), writeSearchData
  (search.mjs:18-24), extractSitemapUrls (sitemap.mjs:69-74). Plus A1's lead: offline.mjs 55-88
  re-export block unused. All from the retired _diff/_triage tools and the SAB split.
- A2-2 R2 dead: comments naming deleted _diff.mjs/_triage.mjs/_sitemap_diff.mjs/accepted-divergences:
  offline-rewrite.mjs:411, search.mjs:65-66, sitemap.mjs:67-68,97, redirects.mjs:35-36 -- and
  pdf.mjs:6-9,99-107 (A9-10). MERGE with A9-10's comment half.
- A2-3 R2 dup: readBaseline byte-identical (page-baseline.mjs:83-90, symbol-baseline.mjs:45-52); the
  six-branch drift-guard state machine re-typed (117-176 vs 75-125). Recorded: "the page-count
  guard's shape applied to URLs" (WIP.Build.md) -- covers look-alike, not the copy.
- A2-4 R2 dup: escapeRegExp x3 -- render.mjs:2235, offline-rewrite.mjs:239 (exported), book.mjs:212
  (escapeRegExpBook). regex-fold recognises escape helpers "by body" because of the copies. MERGE A3-5.
- A2-5 R3 dup: encodeSpaces search.mjs:204 vs template.mjs:925 (different idioms). MERGE A3-3/A3-5.
- A2-6 R2 dup: normalizeBaseurl = A9-8. MERGE.
- A2-7 R2 dup: ASCII-only NBSP-preserving trim twice: compress.mjs:73-84 (regex) vs search.mjs:251-261
  (charCode scan) -- the shipped-defect class of "Whitespace inside inline code is content".
- A2-8 R3 dup: replaceAll("\\","/") inline x10 (offline-rewrite 34,39,44,219,226; offline 133,311,
  370,375,380); publish-policy.mjs:189 has a private posix(); check-tree.mjs:46 another (recorded).
- Split: none (offline.mjs sections; loses ~100 lines with A2-1).
- Sound: offline/offline-rewrite split recorded; HTML_COMBINED_RE follows the guard rule;
  deriveOfflineJtdJs uses acorn; vendor-assets contained+guarded; symbols.mjs not a .twin scanner;
  substitute() and decode() collisions coincidental; publish-policy disjointness self-test; gates run
  clean (publish 6/6, page-baseline 11/11, symbol-index 46/46).
- Leads: HTML escape maps x4 (highlight.mjs:251, render.mjs:2225/2230, template.mjs:993, gantt esc
  213); atomic-write idiom; write.mjs:173-178 vs offline-rewrite 442-465 url() regexes (different jobs).

## A3 -- Markdown dialect (done)

- A3-1 R1 dup: fence-opener predicates differ -- maskCodeRegions (render.mjs:148,
  /^[ \t]{0,3}(`{3,}|~{3,})/) accepts a backtick fence whose info string holds a backtick;
  stashCodeFences (1713) refuses it (CommonMark-correct). Agent REPRODUCED: "```abc`def" masked by one,
  unprotected by the other (a "> [!NOTE]" inside became an admonition). No live trigger in docs/;
  check_code_regions structurally blind to it. Fix: one predicate + a probe. VERIFY repro.
- A3-2 R2 dup: escapeHtml = 3 chars in highlight.mjs:252, 5 chars in render.mjs:2226; headingTocHtml
  (1437-1450) uses 5-char for text, 3-char for code_inline; markdown-it escapes &<>" -> a TOC'd heading
  with an apostrophe renders &#39; in the TOC, ' in the heading. Not live (no TOC'd page has one).
- A3-3 R1 dup: absoluteUrl/relativeUrl ported twice and diverged: seo.mjs:121-148 (config arg, forces
  leading slash, no space encoding) vs template.mjs:917-936 (baseurl arg, leaves bare values
  unchanged, encodes spaces). No call site hits the gap today. Fix: builder/url.mjs.
- A3-4 R2 dup: isNonEmpty nav.mjs:338 == seo.mjs:164.
- A3-5 R3 dup: escapeRegExp (MERGE A2-4), splitFragment render.mjs:1593 vs crawl_check.mjs:51,
  encodeSpaces (MERGE A2-5).
- A3-6 R2 hack: three post-render whole-page regex rewrites with no code guard -- padEmptyCells
  (render.mjs:74-80), normaliseVoidTags (351-354), injectAnchorHeadings (template.mjs:714-727). Safe
  only by an unstated invariant (code content is entity-escaped); outside check_code_regions (which
  covers only the pre-render chain). Fix: state the invariant; extend the gate. (Expect L3 overlap.)
- A3-7 R2 struct: template.mjs holds a strftime formatter (940-989), URL helpers, escape helpers.
- A3-8 R3 dup: highlight-theme.mjs three palette loops (336-344, 351-359, 364-372).
- A3-9 R3 dead: precomputeSeo (seo.mjs:90-94) zero callers.
- A3-10 R3 dead: kramdownSlug exported (render.mjs:1352), used only inside.
- Split: render.mjs -- STRONG evidence: image renderer rule chained by md.use order (svgInline 518
  before remoteImage 520; swapping reverses silently); anchors on third-party rule names
  ("curly_attributes"); ellipsis plugin assumes dashes plugin ran first (515/516); shared helpers
  thread through all plugins; no plugin tested in isolation. Seams listed. template.mjs weaker:
  navActivationCss (446-567) deferral trigger in PLAN-4 §3 close to met.
- Sound: nav.mjs; table/fence fixups on single known tokens; token-walking plugins immune to code;
  html_block-scoped rewrites; template reuses seo's stripHtml; clampContrast loud; VOID_TAGS_RE gated.

## A5 -- a11y and diagram gates (done)

- A5-1 R1 dup/conv: argv loops copied in 7 scripts, diverged: check_a11y.mjs --help -> "unknown arg"
  exit 2 while siblings print usage exit 0; check_dot_fit/build_dot_metrics use argv.includes and
  ignore typos; usage printed to stdout in some, stderr in others. (Feeds L1.)
- A5-2 R2 conv: 0/1/2 convention (Extending.md:640-648) broken in build_dot_metrics.mjs (no catch;
  crash exits 1 = STALE) and pick_a11y_sample.mjs discover() (ENOENT exits 1 = coverage gap; live in
  check.bat). check_dot_fit.mjs:31-34 has the guard with a comment citing the convention.
- A5-3 R2 dup: page discovery + tag count + stub ceiling in pick_a11y_sample (122, 159-171, 184) and
  sweep_a11y (78, 129-153); ceiling named STUB_CEILING vs STUB_TAG_CEILING (both 100); the two must
  agree (--propose reads sweep's JSONL).
- A5-4 R3 dup: pad/median identical in the same two files.
- A5-5 R2 dup: check_dot_fit.mjs and build_dot_metrics.mjs duplicate the Inter host page + puppeteer
  scaffold (font filenames, launch args incl. --allow-file-access-from-files unexplained there;
  axe-scan's LAUNCH_ARGS omits it for the same kind of load). Three repo-root idioms in scope.
- A5-6 R2 dup: check_dot_fit.mjs:49-67 re-walks .dot sources instead of importing dot.mjs's
  listDotSources (135-155, private) -- the mirror-fault shape; five gates already import the chain.
- Split: axe-scan.mjs NOT proposed (single-source property; any split must re-export).
- Sound: axe SOURCE_PATCHES earns model status (exit implicit: "until axe ships a modern build");
  dot-metrics WASM patch passes emphatically (signature match, read-back, real layout check, WeakSet);
  check_tree_fresh uses isOutputTree; FAMILIES table is data; check_a11y mutual exclusion correct.

## A6 -- gates as a system (done)

- A6-1 R1 dup: self-test accumulator + report loop in check_page_baseline (38-44, 128-139),
  check_book_coverage (81-87, 158-170), check_symbol_index (40-45, 361-370), + the crash handler in 4
  gates. Diverged: only check_book_coverage.mjs:162 re-indents multi-line detail. Shared helper must
  (a) keep probes unconditional, (b) take the probe-failure exit code as a parameter (1 for these
  three; 2 for gates whose probes guard a separate sweep: check_gate_lists, check_regex_safety).
- A6-2 R1 dup: test.bat:34-43's history of check_gate_lists contradicts the script's header (9-44)
  and Tools.md:435-437. Fix: trim to a citation, like the other seven comments.
- A6-3 R2 conv: convert_em_dash_separators.mjs:213-215 has no exit-2 path; matters once it runs in
  the pre-commit hook (PLAN-10.md:690-693,795-797 deferred exactly that hook).
- A6-4 R2 struct: nothing reads the workflows (decision 6). DESIGN: new standalone
  scripts/check_ci_workflows.mjs + shared scripts/lib/gate-roster.mjs (gatesFromBat generalised,
  check_gate_lists.mjs:111-118). Compares (1) wrapper roster vs each workflow (canonical: test.bat
  U check.bat - check_tree_fresh U recorded CI-only check_links_diff), (2) the two workflows with each
  other, (3) load-bearing build flags (--check-audit-index, --no-fetch-assets). Allowlist of recorded
  deltas: checks.yml's fixture-built link-diff step (checks.yml:114-126); deploy's --url/--baseurl;
  deploy-only steps. Probes: missing gate, extra step, reordered, missing --check-audit-index, and the
  allowlisted deltas must NOT fire. Registration -> test.bat + both workflows + Tools.md list grows.
- A6-5 R3 conv: serve.bat does not propagate the exit code.
- Q4: composite action (.github/actions/run-gates) as a follow-on AFTER the gate -- not a reusable
  workflow (separate job loses the built trees the deploy job needs). Would also fold checks.yml's
  three install steps vs deploy's one.
- Sound: check_gate_lists exemplary (18 probes); check_publish_policy bidirectional; regex_safety +
  regex-fold strongest; code_regions + markdown-files strong; convert_em_dash uses markdownFiles and
  preserves line endings; exit convention followed except A6-3/A5-2; .bat idiom deliberate and
  cross-referenced; workflow comments point rather than restate. Probe counts: 18, 6, 11, 12, 46, 22, 12.
- Leads: convert_em_dash --check as a pre-commit entry (closes the PLAN-10 deferral); A4's two
  selfTest shapes and impexp's test trio are further probe-harness shapes.

## A7 -- compiler harness (done)

- A7-1 R1 dup: tbrun.mjs:327's failed-build test covers 2 of the 5 shapes tb-ide.mjs:730-734
  BUILD_FAILED lists; misses "[BUILD] ERROR" and "[LINKER] compilation (codegen) error" -> exit 0 on a
  failed build (the round-8 bug class). ORCHESTRATOR VERIFIED the regexes. Fix: export BUILD_FAILED.
- A7-2 R2 struct: afterReveal's false (timeout) discarded by openFile/setCursor/select
  (tb-operate.mjs:421-429, 453, 461, 475) -- reopens the "MsgBox( -> gBox(s" race silently.
- A7-3 R2 dup: two CDP click primitives: tb-ide.mjs:848-861 clickCenter (no scroll/hit-test/retry,
  used for buildIcon by buildProject and tbrun.mjs:295) vs tb-operate.mjs:79-134 click (used for
  restartIcon and by every scenario).
- A7-4 R2 dup: alive() and norm() in tb-registry.mjs (588-590, 462, private) and addin_test.mjs
  (105, 230); addin_test already imports 9 names from tb-registry.
- A7-5 R2 conv: CLI divergences REPRODUCED: tbbuild opt trailing -> undefined -> port NaN, timeout NaN
  -> waitForCompile exits at once with a misleading message; tbrun/addin_test substitute defaults
  (also for an explicit ""); tbbuild's positional finder skips a token after ANY --flag, so
  `tbbuild --json proj` fails (dormant: check_examples.mjs:602 puts the path first); die() three
  structures. (Feeds L1.)
- A7-6 R3 conv: tb-registry.mjs:49-50 says tbrun's snapshot uses -EncodedCommand; tbrun.mjs:376 uses
  -Command (safe today: fixed literal).
- A7-7 R3 dup: 180 s compile timeout literal at 7 sites in 4 files.
- A7-8 R2 dup: all ten test/addin scenarios hand-roll the HERE/HOST/lane preamble and skip object;
  six hand-roll a "console lines since a mark" reader three different ways. Fix: a scenario helper +
  linesSince beside readConsole.
- A7-9 R3 struct: tbbuild's shutdown skips finishTidy when ide was never set; safe only by an
  invariant in tb-launch.ps1 (suspended start); tbrun always tidies.
- Split: tb-ide.mjs (console reading and add-in introspection separable; build-state core coupled);
  tb-registry.mjs (file-boundary only); tbrun's reap tail -> tb-reap.mjs (would host A7-6's fix).
- Sound: strict DAG, no cycles; tb-registry imported only by the three CLIs; stageProject shared;
  laneProjectId allocator; check_tb_registry independent fixtures; PowerShell payloads are fixed
  literals with data via env/stdin; job object + suspended-kill path; retry loops recorded + loud.

## A10 -- smaller tools (done)

- A10-1 R3 conv: eval's four parseArgs differ on unknown args and exit codes; transcript.mjs:190-198
  exits 1 on bare --help.
- A10-2 [agent R1] dup: wisdom sitemap.mjs:69-87 parseFrontmatter has no BOM strip (discover.mjs
  94-117 does, after the AppGlobalClassObject incident) and disagrees with prep.mjs:343-388 on
  coercion. ORCHESTRATOR: no markdown under docs/ has a BOM today -> dormant.
- A10-3 R2 dup: wisdom sitemap.mjs:61-67 walk() re-implements markdownFiles; its reason ("no
  dependency on builder/", PLAN-3.md:404) does not reach scripts/lib.
- A10-4 R2 dead: wisdom/extract/schemas.mjs imported by nothing and drifted from workflow.mjs's inline
  schemas (source_thread vs thread_path; section string vs enum).
- A10-5 R2 conv: wisdom manifest.json/denied.json written non-atomically (messages.mjs:10-12,
  wisdom.mjs:146); loadManifest has no parse guard; Phase 3 uses temp+rename.
- A10-6 R2 struct: impexp.mjs/impexp.py self-tests (19 each) run by nothing; parity claimed in
  Tools.md:958, unchecked. Fix proposed: check_impexp_parity.mjs in test.bat -- NEEDS DECISION: it
  makes test.bat (and CI) depend on Python.
- Split: none (impexp single-file downloads).
- Sound: site JS clean IIFEs, svg-inline.js does not duplicate svgInlinePlugin (markup vs runtime);
  build_fonts.py matches WIP.Fonts.md; eval isolation stack deliberate; merger.mjs; wisdom api paging.
- Leads: atomic write x4 with inconsistent cleanup (impexp x2, wisdom state/merger); wisdom.mjs
  switch-shaped parseArgs (another CLI variant).

## DECISIONS since the plan was written

- Decision 1 AMENDED by the user: detach-pages.js STAYS in perf/ (moving it breaks five perf scripts
  and touches many docs). Instead: two header lines in perf/detach-pages.js (+ one in perf/README.md)
  saying book.bat and the deploy workflow load it. Nothing moves out of perf/.
- APPROVED by the user: DELETE the four superseded shims (fast-refs, fast-dict-array, fast-dict-iter,
  fast-parse-dict). Do it AFTER L3/L4 finish (L4 reads their clone pairs), as its own commit.
- USER: NO BRANCH. staging is the working branch ("whatever I'm working on right now"), merged to
  upstream/main by the user when a chunk of work is done. Commit on staging. Revise the plan's
  "Each phase lands as one pull request" to match: commits on staging, merging upstream is the user's. Touches: the four files; perf/measure.mjs's four
  flags (+ exclusivity checks, imports); perf/phase0-measure.mjs:28 import -> fast-refs-class (its
  "production-equivalent" claim is currently false); comments pointing at the files:
  render-book.mjs:46,57, fast-indirect-objects.mjs:21, fast-parse-object.mjs:39,
  fast-refs-class.mjs:3,37, fast-sync-load.mjs:80. No published page names them. Closes A9-4, A9-6.
  Fallback if the user prefers: move into perf/ + path updates in the same two perf scripts.

## L1 -- CLI conventions (done)

36 entry points inventoried (32 argv readers + 4 argument-less gates). Appendix has the table and the
cli.mjs spec.
- L1-1 R1 dup: --theme/--viewport validation (check_a11y.mjs:82-95 pick(), fixed after "--theme drak"
  labelled a light run "drak") missing from sweep_a11y.mjs:120-121 and check_a11y_fingerprint.mjs:
  134-135 (the axe-upgrade gate). Fix: hoist pick() into axe-scan.mjs or validate in buildMatrix.
  VERIFY.
- L1-2 R1 dup: opt() x7 in 4 variants -- adds check_publish_policy.mjs:31-33 (inline, unnamed). NaN
  from a trailing value flag: tbbuild.mjs:68,70 (port, timeout), check_examples.mjs:102-104 (jobs,
  port, batch).
- L1-3 R1 dup/hack: positional detection -- tbrun VALUE_FLAGS (112-116); tbbuild order-dependent
  find (62): `tbbuild --keep proj` -> usage error.
- L1-4 R1 hack: tbdocs.mjs:189-191 throws on an unknown argument -> main().catch -> exit 1, the "link
  check failed" code. Fix: exit 2 for parse errors. VERIFY.
- L1-5 R2 dead: check_links.mjs:307-314,406-412 tolerate unknown flags "passed through via
  check.bat's %*" -- check.bat no longer calls it (PLAN-checks.md:14).
- L1-6 R2 conv: --help in four shapes (stdout/0; stderr/0 in pick_a11y_sample, sweep_a11y; stderr/2
  via the usage error in tbbuild, tbrun, addin_test; none in 12 tools). gen_attribute_probes takes
  --help as out_dir and mkdirs "--help/Sources"; render-book rejects --help as unknown (exit 2).
- L1-7 R2 conv: unknown flag -> ignore (11 tools) / warn (check_links) / err 2 (8) / throw -> 1 or 2
  / err 1 (wisdom).
- L1-8 R2 conv: --json boolean-to-stdout (tbbuild, tbrun, check_examples, census) vs value-taking file
  (check_a11y_fingerprint).
- L1-9 R3 conv: --src = docs root (tbdocs, check_publish_policy) vs exported package tree (census,
  build_package_api).
- L1-10 R3 conv: --name=value only in tbdocs, and not for --check-findings/--symbol-gaps.
- L1-11 R2 dup: uncaughtException->exit 2 one-liner in check_page_baseline:34, check_book_coverage:27,
  check_symbol_index:38, check_publish_policy:29; missing in check_tb_registry.mjs (crash exits 1).
  Tools.md's check_publish_policy entry omits its exit 2. (Overlaps A6-1.)
- L1-12 R3 dup: "usage; exit by whether help was asked" x6 in eval/ and wisdom.
- L1-13 R2 struct: nothing tests any tool's argv handling -- the seam that let L1-1/L1-2 ship. The
  shared module should carry its own ride-along self-test in test.bat.
- Spec (scripts/lib/cli.mjs): parseCli(argv, {options, positionals}) over node:util parseArgs
  (strict, allowPositionals, tokens) + camelCase aliases + positional-count checks + tokens pass-
  through; withUsageError(fn, {onError}) keeps each tool's own message/stream/code; numberOption()
  closes the NaN hole; printHelpAndExit(text, {stream, exitCode}) keeps each tool's current --help
  shape until Phase 3. Care: multiple:true for --forbid (check_links), --source (check_tree_fresh),
  --case (check_links_diff), --additional-script (render-book), --channel (wisdom); tbdocs's
  cross-flag order (--no-check resets others) needs a walk over tokens -> MIGRATE TBDOCS LAST;
  strict:false still parses undeclared options; check_links's warn-collect and wisdom's subcommands
  need custom code (wisdom last or never).
- Exit schemes: link bitmask (tbdocs, check_links: deliberate, documented); tbbuild 0-4, tbrun 0-3,
  addin_test/check_examples 0-2; gates 0/1/2; impexp 0-6. Misleading: L1-4; addin_test's 2 means
  either "harness failed" or "registry not restored".
- Sound: .bat capture-before-popd x7; check_examples --json keeps stdout clean; impexp.mjs is the
  best-disciplined CLI (verb Map, EXIT object, usageError) -- the model for Phase 3; census --help
  prints its own header.
- Leads: check_regex_safety has an internal --shard re-exec flag (A6); buildMatrix validation (A5);
  serve.mjs exit codes vs tbdocs (A1).

## L2 -- paths, config, dependencies (done)

- L2-1 R1 dup: two more hand-kept lists of output trees, the exact defect check_tree_fresh was fixed
  for (WIP.Build.md:376-388): builder/serve.mjs:138 IGNORED_PREFIXES has no _site-basepath* (a
  check_links_diff --b fused run while serve.bat runs -> spurious rebuild); eval/build_corpus.mjs:59-71
  EXCLUDED_PATHS has docs/_site-basepath but its prefix test misses _site-basepath-offline/-pdf.
  60bb6f5 edited serve.mjs's list the same day markdown-files.mjs landed. Fix: isOutputTree. VERIFY.
- L2-2 R1 dup: census_attributes.mjs:99-119 findInstall re-implements tb-install.mjs:19-35 findIde
  (whose header exists to prevent a private copy) and diverged: validates packages/ vs twinBASIC.exe;
  os.homedir() fallback only in the private copy. Fix: use findIde, keep its packages/ check, move the
  homedir fallback into tb-install.
- L2-3 R2 dup: = A5-6 (dot.mjs listDotSources vs check_dot_fit findDotSvgs); neither uses
  isOutputTree -- their broader "_"/"." skip is safe today (no .dot under _data/_sass/_App/_Images).
  Fix: one filesUnder(root, {ext, skip}) helper; keep the broad skip. MERGE with A5-6.
- L2-4 R2 dup: = A2-3 readBaseline; plus symbol-baseline.mjs:55-58's hand-rolled writeBaseline emits
  `"urls": [\n\n  ]` for an empty list where JSON.stringify gives `[]` (agent verified). Four
  generated JSON files, four serializers (inter-metrics 1-space and package-api hand-built have
  reasons). MERGE with A2-3.
- L2-5 R2 dup: repo root derived inline in ~19 files, four expressions; axe-scan.mjs:29 exports
  REPO_ROOT, imported by 2. Extending.md:654 names the convention. Fix: scripts/lib/repo-paths.mjs
  (re-exported by axe-scan).
- L2-6 R3 conv: mkdtemp scratch not removed in a finally: check_publish_policy.mjs:152-189,
  check_links_diff.mjs:651-750 (three siblings do it right).
- L2-7 R3: three small tree walkers in offline.mjs (401-416, 608-626) and write.mjs (281-299) -- not
  proposed.
- Sound: exactly three real YAML parse sites (tbdocs.mjs:271, check_publish_policy.mjs:69,
  data.mjs:12), bare yaml.load, each loaded once per build; check_publish_policy's cwd-relative SRC
  is recorded (Extending.md:654); atomic temp+rename writes where used; tbrun cleans its per-port work
  dir at the next start on purpose; only picocolors and pako are undeclared; lockfile + npm ci.
- Leads: Builder.md:412-440 "Dependencies" is stale -- misses recheck, shows wasm-graphviz ^1.21
  (really ^1.29.1), and says axe-core is the only exact pin (four are: axe-core, pdf-lib, puppeteer,
  recheck). A REPEAT of a drift the last review fixed (74b3395). Each exact pin has a recorded
  technical reason; nothing states the policy (exact = we patch or depend on internals; caret =
  the rest), so carets on output-changing deps look like an accident when they are not.

## L4 -- clone leads classified (done)

37 regions >= 100 tokens + 57 same-named functions, both sides opened.
NEW:
- L4-2 R3 dup: scss.mjs compileLightScss/compileDarkScss (65-76, 78-89) same body.
- L4-3 R2 dup: vendor-assets.mjs fetchToFile (222-252) / fetchAttachment (279-319) each re-implement
  fetch-with-two-tiers + atomic temp+rename write.
- L4-7 R2 dup: CommonMark code-span splitting twice -- render.mjs:180-204 maskInlineCode vs
  convert_em_dash_separators.mjs:74-~100 splitInlineCode; the em-dash tool already shipped a bug in
  this exact logic (its comment 70-73). Equivalent today. Fix: shared splitOnCodeSpans.
- L4-10 R1 dup: logicalLines -- tb-fences.mjs:423-445 (private) vs twin-api.mjs:51-~90 (exported);
  twin-api handles a BOM and multi-line /* */ block comments, tb-fences neither. VERIFY that swapping
  in twin-api's version keeps tb-fences' quote-aware comment stripping (its reason, :423).
MERGES: L4-1 = A1-3 (and the 4th, "claimed task" path, 497-540, is legitimately different: its own
ordering trap 515-525). L4-4 -> A2-1 (buildSitePaths is dead: delete, don't delegate). L4-5 = A2-3.
L4-6 = A3-3, with two more disagreements: protocol-relative //host (template.mjs skips it; seo.mjs's
isAbsoluteUrl misses it and prepends baseurl -- masked while baseurl is ""), non-string input (null
vs ""). L4-8 = isNonEmpty/encodeSpaces/splitFragment/statSafe/makeTimer cluster (A3-4, A2-5, A3-5,
A4-1, A1-4) -> a low-level util module; route makeTimer so offline.mjs never imports tbdocs.mjs.
L4-9 = A5-3/A5-4. L4-11/12 = L1-2/L1 (CLI). L4-13 = A6-1/L1-11 (+ withBaseline tmpdir fixture twice:
check_page_baseline.mjs:46-55, check_symbol_index.mjs:314-323). L4-14 -> A7-8 (probeLines with
hard-coded .slice(15)/.slice(13)).
CONFLICTS to settle in verification:
- findingsFor/buildFindings: L4 says (c) recorded -- mirrored so check_links_diff can cross-check
  (check.mjs:410-414, check_links.mjs:599-601). SUPERSEDED by the user's option-2 decision (A4); the
  fix must rewrite those two comments.
- normalizeBaseurl/escapeRegExpBook: L4 accepts book.mjs:298-300's "by design ... plugins are
  independent"; A9-8 says that premise (Ruby plugins) expired at the Node cutover -- book.mjs already
  imports siblings. Side with A9, cite both.
- escapeHtml 3 vs 5 chars: L4 (c) via highlight.mjs:249-250 (Rouge). Covers highlight's choice, not
  render.mjs's TOC mixing both -> keep A3-2, narrowed.
- writeBaseline: L4 says deliberately different (one URL per line); L2-4 says it equals
  JSON.stringify(...,2) except an empty list. READ the code.
- alive/norm: L4 (b) "no clone region" (below the window); A7-4 read both: identical. Keep A7-4 (R3).
- parseFrontmatter: L4 (b) different dialects; A10-2's BOM gap is independent of dialect. Keep,
  dormant.
- extractFromHtml: L4 (b) different sizes; A4-3 is a coverage gap (5 vs 20 tag/attr pairs), not a
  clone. Keep A4-3.
Sound (b): data tables (GANTT_SECTION~HUMAN, SCOPE_TO_SYMBOL~MUST_REFUSE, FAMILIES, fixtures), main,
the five selfTest shapes, classify, page, kindOf, zero-pad pad, decode, resolve, strip, serialize,
select, runAll, printHelp, discover, walk, fmtMs, log, count, substitute, node:test boilerplate.
(c): check-tree.mjs's inlined fnmatch/excluded (import cost on the dispatch path).

## L3 -- browsers, processes, text rewrites (done)

- L3-1 R1 dup: check_a11y.mjs:167-218 launches the browser with no try/finally (browser.close at 218
  only on success; main().catch at 244-247 exits 2 without closing); siblings on the same library
  guard it: check_a11y_fingerprint.mjs:234-248, sweep_a11y.mjs:209-273, check_axe_patch_equiv.mjs:
  99-115. PAGE_STATES appliers (axe-scan.mjs:117-172) throw by design. Leaks Chromium in CI (Linux);
  Windows unverified. Fix: withBrowser(fn) in axe-scan.mjs for all four.
- L3-2 R2 dup: check_examples.mjs:601-612 (buildStaged) spawn has no 'error' handler and awaits
  'exit' not 'close'; addin_test.mjs:180 and check_regex_safety.mjs:347-348 do both. A spawn failure
  crashes past finishTidy (registry restore).
- L3-3 R1 hack: wisdom/extract/merger.mjs:114-129 parseStaging splits on bare '---' with no fence
  awareness; parseSection (162-168) returns null for a chunk not starting "## " and the caller drops
  it -- contradicting 111-112 ("never silently drop reviewer content"). staging.md is committed and
  PLAN-3.md:181-183 puts fenced tb code in every section. Not live today (section count = '---' count).
- L3-4 R2 dup: three fence/code-span parsers -- render.mjs maskCodeRegions (141-175) + maskInlineCode
  (180-204), stashCodeFences (1704-1730), convert_em_dash_separators.mjs FENCE_OPEN_RE/CLOSE_RE
  (59-60) + splitInlineCode (74-99) + convertText (141-157). The info-string guard is only in
  stashCodeFences; the em-dash tool shares maskCodeRegions' gap. MERGE with A3-1 and L4-7.
- L3-5 R2 dup: HTML escapers -- minimal (&<>) x3: render escapeHtmlMinimal 2230, highlight escapeHtml
  251, gantt esc 213; full (&<>"') x4: render escapeHtml 2225, template escText 993-998, template
  escAttr 999-1001 (== escText), sitemap xmlEscape 106-113. escapeHtml names both classes.
  html-entities used only to decode (outline.mjs:22). MERGE with A3-2 and A2's lead.
- L3-6 R3 conv: check_links_diff.mjs:598-601 main()'s try/catch covers only argument parsing;
  fusedBuild (426-432) and ensureBasePathTree (518-525) spawnSync unguarded -> raw stack trace.
- Split: render.mjs -- the two fence parsers sit 1,550 lines apart with no cross-reference (evidence
  for A3's candidate).
- CONFLICT with A3-6: L3 calls the unguarded whole-page HTML rewrites SOUND -- padEmptyCells,
  normaliseVoidTags, injectAnchorHeadings, search sanitiseContent/extractSections, seo stripHtml,
  book.mjs bookChapterTransform steps 2/2b/4 -- because every code path escapes & < > before they
  run (highlight.mjs:252-253, render.mjs:2231-2233); book.mjs steps 1 and 5 (quote-anchored) use
  replaceOutsideCode. A3-6 says the same invariant is unstated at the sites and outside the gate.
  Likely resolution: the invariant holds (so not a live hazard); the finding becomes "state it and
  probe it", R3 or low R2.
- Sound: four puppeteer launches consistent where it matters; --allow-file-access-from-files needed
  where the page fetch()es a sibling file:// resource (A5-5 still right that the dot tools don't say
  so); share the lifecycle, not the args. Child processes: no shell:true, array args everywhere,
  killTree by pid, stdin hazard fixed once in runCompiler, PowerShell -EncodedCommand with data via
  env/stdin, tbrun's -Command a fixed literal; cleanup disciplined across tb-lane, tb-addin,
  addin_test (SIGINT), panes.test after(), check_tb_registry; runShard is the model; check_links'
  Worker dispatch; worker-pool. Text: applyPreRenderRewrites brackets its four rewrites; token-scoped
  md.core rules are a third sound mechanism WIP.Build.md does not name; HTML_COMBINED_RE and
  IMG_SRC_RE follow the documented shape; other unguarded rewrites target build-generated markers.
- Leads: document the token-scoped mechanism in WIP.Build.md; book/lib/outline.mjs and
  postprocesser.mjs are pagedjs-cli ports -- treat as vendored (A9 found them attributed, unmodified);
  L3-1 needs an empirical browser test.

<!-- next -->
