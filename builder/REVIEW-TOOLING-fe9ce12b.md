# Review of the tooling at `fe9ce12b`

Scope: all first-party tooling — `builder/`, `scripts/`, `book/`, `eval/`, `wisdom/`, `test/`, the `.bat` wrappers and both CI workflows (`perf/` and vendored code excluded) · reviewed 2026-09-25 · line numbers refer to `fe9ce12b`

This is a different kind of review from [REVIEW-c9f2dfe0-1b6922b.md](REVIEW-c9f2dfe0-1b6922b.md), which asked whether one range of commits was correct. This one asks about factoring and repetition, and about sound design against workarounds, across the whole of the repository's own tooling. Its charter, rubric and decisions are in [PLAN-TOOLING-REVIEW.md](PLAN-TOOLING-REVIEW.md).

---

## Verdict

The tooling holds up well where it matters most. Fourteen review passes and four independent verifiers read `builder/`, `scripts/`, `book/`, `eval/`, `wisdom/`, `test/` and the wrappers directly against `fe9ce12b`, and confirmed nearly everything they found. The scheduler's barrier and SAB layout, the compiler harness's process discipline, the axe patch and the dot-metrics WASM patch, the gates' probe-and-report shape, and the paged.js fork's divergence record are all sound, for the reasons given under Verified sound below.

Where the tooling is weak, it is weak in the same two ways, repeated across many files. First, small helper functions — URL builders, HTML escapers, baseline serializers, argv parsers, repo-root derivations, directory walkers — exist in two, three, or for HTML escaping seven copies, and several of the copies have already disagreed with each other, not merely risked it: a link checker with a narrower attribute table than its sibling, three CLI parsers that return `undefined` instead of a stated default on a trailing flag, two frontmatter readers with no BOM handling next to a third that has it, two install-finders that recognise an install by different files. Second, a smaller number of workarounds fail the review's own three-part test for an acceptable one — contained, guarded, with a stated exit. The clearest cases are the three post-render HTML rewrites that depend on an invariant (code content is always entity-escaped) that is true for three of the four ways text can reach a `<code>` block and false for the fourth, and the pdf-lib shims, pinned against accidental version drift but asserting nothing about what they overwrite.

The single most important theme, raised by the repository's owner partway through the review, threads through both weaknesses: markdown is handled as text, not as a parsed structure, and almost every tool that touches it re-derives, by hand, what counts as a fence, a heading, or a code span. The costs range from a reproducible bug — two fence-opener predicates in the same file disagree on one input — to a genuine defect in a file the repository commits: a missing blockquote marker in `wisdom/data/findings/staging.md` breaks a fence, and the tool that re-serializes that file's sections has no way to notice. Closing that gap with one shared, markdown-it-based module is the review's leading recommendation for the fix phases that follow; the remaining findings are smaller individually but numerous, and the plan schedules them across its phases, described in [PLAN-TOOLING-REVIEW.md](PLAN-TOOLING-REVIEW.md#execution).

---

## Provenance

Fourteen passes, all on Sonnet, read the tree at `fe9ce12b` without changing it: reading, `git log`/`blame`, scratch scripts in the session scratchpad, and the read-only gates, but never a build, a browser, or the compiler harness:

| Pass | Subject |
|---|---|
| A1 | Build orchestration and scheduling |
| A2 | Output stages and auxiliary outputs |
| A3 | The Markdown dialect and page templates |
| A4 | Link and integrity checks, and the two-checker question |
| A5 | Site-reading gates, accessibility, diagrams |
| A6 | The gates as a system, and `test.bat` |
| A7 | The compiler harness |
| A8 | Sample compiling and the package API |
| A9 | The book pipeline |
| A10 | Smaller tools and the site's scripts |
| L1 | Command-line and process conventions, every entry point |
| L2 | Paths, configuration, file walking, dependencies |
| L3 | Browsers, child processes, rewriting HTML and Markdown as text |
| L4 | The survey's duplicate-code leads |

Four verifiers, also on Sonnet, then re-read every R1 and R2 citation against the source as it is at `fe9ce12b` (`git show fe9ce12b:<path>`, so commits made meanwhile could not move anything under them):

| Verifier | Scope | Findings checked | Verdict |
|---|---|---|---|
| V1 | `builder/` (A1–A3, A9 subset, A2/L2/L4 overlaps) | 23 | All confirmed; several severity notes, five items noticed in passing |
| V2 | Gates, links, a11y, CI, small tools (A4–A6, A10, L1–L2, L4 overlaps) | 29 | 25 confirmed, 4 corrected (A4-3, A5-1, L2-5, L2-6) |
| V3 | Harness, samples, book (A7–A9, L2, L4 overlaps) | 15 | 10 confirmed, 5 corrected (A7-1, A7-3, A7-4, A8-2, A9-5) |
| V4 | L3 (browsers, processes, text rewrites) | 6 | All confirmed; one nuance (L3-3), one conflict ruled (A3-6) |

The orchestrator ran six checks of its own, beyond what the verifiers covered, and reports them because each one changed a finding's stated impact or resolved a conflict the passes left open:

- **The census Overridable check against the BETA 983 package cache** — traced A8-1's claimed misclassification against the real exported package tree and found zero attributed `Overridable` members exist there today, so the divergence is real but dormant.
- **The tbrun regex** — compared tbrun.mjs's failed-build pattern with tb-ide.mjs's `BUILD_FAILED` by reading (A7-1). The orchestrator first reported the narrower pattern as matching two of the five failure shapes; it is case-insensitive and matches three, as V3 found. The two it misses are the ones the finding names.
- **The Gantt sections** — confirmed A1-1's claim that Check-phase tasks and `vendorAssets` are dropped from the Gantt chart on every build.
- **The BOM scan of `docs/`** — confirmed A10-2's BOM gap is dormant: zero of 912 markdown files begin with a UTF-8 BOM today.
- **The staging.md `parseStaging` run** — ran the real parser against the real, committed 15,553-line file and found the inventory's claim of live section-metadata mis-pairing not confirmed; see Where the passes were wrong.
- **The Wisdom.md:304–305 fence** — confirmed `check_gate_lists.mjs`'s `splitSections` genuinely mis-splits on a heading-shaped line inside a fenced example at that location, dormant only because the phantom section states no gate count.

The working records — the orchestrator's ledger, the four verifiers' files and the markdown inventory — are committed beside this document, in [`REVIEW-TOOLING-fe9ce12b/`](REVIEW-TOOLING-fe9ce12b/README.md).

Four commits were made on `staging` during the review, all before this document:

- **`d0a652d6`** — `scripts/survey_tooling.mjs`, the before-and-after clone-detection and import-graph tool the plan's baseline survey and this document's appendix both depend on (decision 3).
- **`90624841`** — deleted the four superseded pdf-lib shims (`fast-refs`, `fast-dict-array`, `fast-dict-iter`, `fast-parse-dict`) that only `perf/` loaded, approved by the user during the review. Resolves **A9-4**, **A9-6**, **A9-9**.
- **`26eefeeb`** — documented, in `perf/detach-pages.js` and `perf/README.md`, that `book.bat` and the deploy workflow load that file at run time — the amendment to decision 1 (nothing else moves out of `perf/`).
- **`86a70107`** — `PLAN-TOOLING-REVIEW.md` itself, recording the review's strategy and the decisions made as the passes ran.

---

## Themes

### Markdown is processed as text, each tool deciding privately what counts as code

This is the theme the repository's owner raised while the passes were running, and it is the one worth fixing first. A dedicated inventory pass ([`REVIEW-TOOLING-fe9ce12b/markdown-inventory.md`](REVIEW-TOOLING-fe9ce12b/markdown-inventory.md)) found **15 sites** that scan or rewrite markdown by hand. Five rewrite text: `render.mjs`'s `maskCodeRegions`/`maskInlineCode` and its `stashCodeFences`/`rewriteAdmonitions` (behind **A3-1**), `convert_em_dash_separators.mjs` (behind **L3-4**/**L4-7**), `check_examples.mjs`'s marker splice, and wisdom's `parseStaging`/`serializeStaging` (behind **L3-3**). Ten only scan: `census_attributes.mjs` and `gen_attribute_probes.mjs` reading `Attributes.md` line by line, `check_gate_lists.mjs`'s section splitter, `counts.mjs`'s two raw-source counts, wisdom's two frontmatter readers (behind **A10-2**), two readers in `eval/`, and one test that reads markdown returned by the compiler's hover. Of the 15, **eight have no code awareness of any kind** — not even a hand-written fence check — and six more have a hand-written fence or frontmatter rule with a known, named gap. Exactly one site (`check_examples.mjs`'s marker splice) locates its edit through a markdown-it-derived line number and then re-verifies the line before touching it; it is the model the rest should follow, alongside the token-traversing plugins in `render.mjs` and `check_code_regions.mjs`'s own gate, which already consult markdown-it's token stream instead of re-deriving it (`scripts/lib/tb-fences.mjs`, `builder/discover.mjs`'s `gray-matter` use).

Two live problems came out of tracing this by hand rather than by inference. `check_gate_lists.mjs`'s `splitSections` genuinely splits `docs/Documentation/Wisdom.md`'s `### staging.md format` section into two phantom sections at `Wisdom.md:305`, because that line is a fenced *example* of a `## ` heading, not a real one — dormant only because the phantom section happens to state no gate count. And the real, committed `wisdom/data/findings/staging.md` has a genuine content defect at lines 14245–14246: a fenced sample nested inside a `> [!NOTE]` admonition is missing its blockquote continuation marker on the fence's content line, so markdown-it does not close the fence where the source intends — it runs on for 52 lines. The inventory's stronger claim, that this already causes `parseStaging` to attach the wrong metadata to the wrong section, is **not confirmed** — see Where the passes were wrong.

Markdown-it itself was tested directly, empirically, rather than assumed. Block-level tokens (`fence`, `code_block`, `html_block`) have a `.map` giving the exact source line range, including a fence nested inside a blockquote or a list item, prefix markers included in the raw slice and stripped in `.content` — both available from one parse. Inline tokens have no offsets at all (`.map` is always `null`), so a correct inline code-span splitter still has to be the same manual backtick/tilde-run scan `maskInlineCode` and `splitInlineCode` already implement independently — markdown-it can supply which lines an inline run occupies, never where within them. Frontmatter is not merely unhandled by markdown-it: it is **actively misparsed** unless split off first — a leading `---` becomes an `hr`, and the block that follows is then read as a setext H2 heading, so frontmatter must be split off before markdown-it sees a page, as `discover.mjs` already does. Timing over all 912 markdown files under `docs/` (3.98 MiB): a block-only parse (bypassing inline/linkify/replacements/smartquotes) takes 33.7 ms total, about 0.037 ms/file; a full parse takes 234–257 ms, about 0.26–0.28 ms/file — roughly seven times cheaper for block-only, verified to genuinely skip inline splitting (every inline token's `.children` stays the empty-array default).

One more fact belongs to this theme, found independently while tracing the frontmatter gap: the build runs **two YAML parsers**. `gray-matter@4.0.3` bundles its own nested `js-yaml@3.14.2` (`node_modules/gray-matter/node_modules/js-yaml`), while `builder/data.mjs`, `builder/tbdocs.mjs` and `scripts/check_publish_policy.mjs` import the top-level `js-yaml@4.1.1` directly for `_config.yml`/`_book.yml`. Page frontmatter and site configuration are parsed by two major versions of the same library. See Decisions for you (a).

### Command-line handling

Thirty-six entry points (32 argv readers plus 4 argument-less gates) were inventoried by L1, and the pattern across them is consistent: every tool parses its own flags by hand, and several of the hand-written parsers have already shipped the same class of bug more than once. **L1-1** through **L1-13** catalogue it in full (see Findings); the sharper instances are a positional-option helper reimplemented seven times in four variants, one of which returns `undefined` instead of its stated default on a trailing value flag (**L1-2**); a theme/viewport validator that exists in one script specifically because an unvalidated value once mislabeled a report, and is missing from two siblings that do the same kind of work, one of them the axe-upgrade gate itself (**L1-1**); and a positional-argument detector that fails outright on a boolean flag placed before a path (**L1-3**). The area passes hit the same shape independently: **A5-1** found the identical manually written argv loop, diverged three ways, in eight accessibility and diagram scripts; **A7-5** found three incompatible `opt()`/`die()` shapes inside the compiler harness alone, with a concrete, traced misdiagnosis (a `NaN` timeout produces the wrong error message, not a timeout error); **A10-1** found the same split among the four parsers in `eval/`. The exception is `impexp.mjs`, whose verb table, named exit codes and single usage-error path L1 names as the model to follow. **L1-13** names the reason none of this was caught: nothing tests any tool's own argument handling, anywhere in the repository. See Decisions for you (e) for the proposed convergence.

### Copies that have already diverged

The review's severity rubric reserves R1 for a duplication that has already produced a disagreement, not merely risked one, and a sizeable share of the R1 tier is exactly that: **A4-3**'s link-attribute table is five pairs against the build checker's 21 tags and 26 pairs, and the post-release checker that uses the narrower one already misses seven kinds of link the build-time checker catches; **A3-3**/**L4-6**'s two URL helpers disagree on a forced leading slash, on protocol-relative `//host`, and on null input, in three separately confirmed ways; **A7-1**'s failed-build detector misses two of the five failure shapes its own sibling module lists, so a failed compile can report success; **A8-1**'s attribute-keyword lists already differ (dormant only because the current package cache never exercises the gap); **A10-2**'s three independent frontmatter readers disagree on BOM handling and on type coercion; **L2-1**'s two output-tree exclusion lists are missing the same prefix that a prior fix (`check_tree_fresh.mjs`) already closed once, in a different pair of files; **L2-2**'s two twinBASIC-install finders recognise an install by different files, so a partly unpacked install passes one and fails the other; **L4-10**'s two `logicalLines` implementations differ on BOM handling and on block comments. Every one of these copies has already diverged; two of the divergences (**A8-1**, **A10-2**) happen to change nothing on today's content. Each is presented in full under Findings, tier 1.

### Dead code left by the retired `_diff`/`_triage` tools

Commit `644d6bdb` deleted `_diff.mjs`, `_triage.mjs`, `_sitemap_diff.mjs` and their siblings, and the tree still shows two kinds of trace of them: functions that only they called, and comments that still name them. **A1-4**'s exported `makeTimer` has zero callers anywhere in the repository, while `offline.mjs` keeps a private, byte-identical copy whose own comment cites the deleted tools as the reason it can't import the exported one. **A2-1** (absorbing **A1-5** and **L4-4**) is five more dead paths from the same cause — `writeOfflinePages`, an unread `precomputed` parameter, an unreachable fallback branch, `writeSearchData`, `extractSitemapUrls` — plus a 24-name re-export block in `offline.mjs` with zero importers for any of the 24. **A2-2** (absorbing **A9-10**'s comment half) is five files whose comments still name the deleted tools, one of which (`pdf.mjs`) uses the stale comment to justify an export, `extractImagePaths`, that also has zero callers. **A9-4** and **A9-9** were two more instances of the same shape in `book/lib/`'s pdf-lib shims; both are now moot, resolved by the shim deletion in `90624841`.

### Gate scaffolding and conventions

The gates are individually well built — see Verified sound — but the scaffolding around them repeats itself and has already drifted in one place. **A6-1** (absorbing **L1-11** and **L4-13**) is a self-test accumulator, a report loop, and an `uncaughtException` handler, each copied across three or four gate scripts, with one of the three already re-indenting its output differently from its two siblings. **A6-2** is a genuine three-way disagreement, inside the repository itself, about the history of a past incident (`test.bat`'s own comment tells a different story than `check_gate_lists.mjs`'s header and `Tools.md`, neither of which corroborates `test.bat`'s specific counts) — in the comment that introduces the gate built to stop exactly that kind of drift. **A5-2** and **A6-3** are three tools that break the documented 0/1/2 exit convention (`build_dot_metrics.mjs`, `pick_a11y_sample.mjs`, `convert_em_dash_separators.mjs`); `pick_a11y_sample.mjs` runs in `check.bat` today, so a crash there reads as a coverage gap rather than a crash. **A6-4** is the structural gap decision 6 exists to close: nothing today reads either CI workflow to confirm it runs the same gates as the wrappers, though the two workflows' shared steps are in fact byte-identical, differing only in three already-recorded ways.

### Dependencies and pinning

**A1-2** is an undeclared direct dependency (`picocolors`, imported by `tbdocs.mjs` and `scheduler.mjs` and reachable today only through `puppeteer → cosmiconfig → parse-json → @babel/code-frame`); it works by accident of the lockfile, not by declaration. `book/lib/fast-inflate.mjs` imports `pako` the same way, through `pdf-lib`. Separately, `docs/Documentation/Builder.md`'s own "Dependencies" section is stale in three ways at once — it omits `recheck` entirely, states `wasm-graphviz` as `^1.21` when the installed version is `^1.29.1`, and says `axe-core` is the only exact pin when four packages are pinned exactly (`axe-core`, `pdf-lib`, `puppeteer`, `recheck`) — a repeat of a drift the previous review already fixed once, in `74b3395`. Each individual pin has its own recorded technical reason; nothing states the general policy behind the choice of exact versus caret, so a caret on a dependency whose output the build depends on reads as an oversight rather than a decision. See Decisions for you (g). The pdf-lib shims (**A9-1**, **A9-2**) round out the theme from the workaround side, immediately below.

### Workarounds judged by the three tests

The plan's bar for an acceptable workaround is that it is contained, guarded, and has a stated exit. Two workarounds pass emphatically and are the model for the rest: the axe patch (`scripts/lib/axe-scan.mjs`'s `SOURCE_PATCHES`, with `check_axe_patch_equiv.mjs` as its guard and "until axe ships a modern build" as its stated exit) and the dot-metrics WASM patch (signature match, a read-back check, a real layout check, and a `WeakSet` guard). Against that model, several workarounds found by the passes fall short. The pdf-lib shims (**A9-1**) are contained — one file per shim — but guarded only by an exact version pin, which catches accidental drift and nothing else: no shim asserts anything about the pdf-lib internals it depends on, and there is no equivalence test against stock pdf-lib output anywhere (**A9-2**). The three whole-page HTML rewrites in `render.mjs` and `template.mjs` (**A3-6**) depend on an invariant — code content is always entity-escaped before these run — that holds for three of the four ways text can end up inside `<code>`/`<pre>` and not the fourth (raw, hand-authored HTML, which markdown-it passes through unescaped by design), is not stated at any of the three call sites, and is outside what `check_code_regions.mjs` checks. WIP.Build.md already warns, about a neighbouring case, "Do not rely on that accident"; nothing connects that warning to these three. Wisdom's `parseStaging` (**L3-3**) promises in its header comment that it never silently drops reviewer content, and breaks the promise whenever a bare `---` line sits inside a code fence in a section: the rest of that section's body and its `finding_ids` line are dropped without a word.

---

## Findings

Findings are grouped by severity after the verifiers' corrections, not as first reported. Where a finding was reported by more than one pass, every source ID is kept so it can be traced back to [`REVIEW-TOOLING-fe9ce12b/ledger.md`](REVIEW-TOOLING-fe9ce12b/ledger.md).

### Tier 1 — already diverged, or one ordinary change from it

#### A1-1 — R1, struct
**The build's own Gantt chart silently drops the Check phase and `vendorAssets` from every build, and its "Other" bucket is dead.**

- Where: `builder/gantt.mjs:39-49` (`mainSections`, only pushes `Seeds`/`Spine`/`Render`/`Write`), `:12` (`COLORS.Other`, unreferenced); `builder/tbdocs.mjs:1270-1282` (`GANTT_SECTION`/`GANTT_SECTION_ORDER` list `Check`); `vendorAssets` (`tbdocs.mjs:539-562`, `runOnMain:true`, no `GANTT_SECTION` entry).
- Recorded reason: none found; `docs/Documentation/Builder.md:410` states the opposite — that a section-less task falls into a generic "Other" bucket.
- Cost: reaches the published Build Info page. `checkBook`, `checkReport` and `vendorAssets` durations stretch the chart's time axis with no visible bar to show for it.
- Fix in place: add `Check` and `Other` to `gantt.mjs`'s `mainSections`; give `vendorAssets` a `GANTT_SECTION` entry.
- Verify by: the built `gantt.svg` names `checkBook`, `checkReport` and `vendorAssets` after the fix and not before (the byte comparison of the trees excludes this file, because it records timings); correct `Builder.md:410`.
- Size: S.
- Verified: confirmed (V1), and checked directly by the orchestrator (see Provenance).

#### A1-2 — R1, hack
**`picocolors` is imported directly in two files but never declared; it works only because it is an unlisted transitive dependency.**

- Where: `builder/tbdocs.mjs:35`, `builder/scheduler.mjs:5`; reachable today via `puppeteer → cosmiconfig → parse-json → @babel/code-frame` (confirmed in the lockfile).
- Recorded reason: none.
- Cost: the day an update stops that chain installing it, every build — local, CI and deploy — stops at import with "Cannot find package 'picocolors'", for a reason unrelated to the colour output that uses it.
- Fix in place: declare `picocolors` `^1.1.1` directly in `package.json`.
- Verify by: `npm ls picocolors` before/after; build unaffected.
- Size: S.
- Verified: confirmed (V1).

#### A3-1 / L3-4 / L4-7 — R1, dup
**Two fence-opening predicates 1,550 lines apart in the same file disagree on whether a backtick-fenced block with a backtick in its info string is a valid opener, and a third file, and a fourth function, repeat the same gap.**

- Where: `builder/render.mjs:141-175` `maskCodeRegions` (open test `:148`, no info-string check) vs. `:1704-1730` `stashCodeFences` (`:1713`, CommonMark-correct refusal); `scripts/convert_em_dash_separators.mjs:59-60` `FENCE_OPEN_RE` is byte-for-byte identical to `maskCodeRegions`'s pattern and shares the same gap; `render.mjs:180-204` `maskInlineCode` and `convert_em_dash_separators.mjs:74-99` `splitInlineCode` independently implement the same inline code-span algorithm (confirmed behaviourally equivalent today across 16 edge cases, not yet diverged).
- Recorded reason: none; the three were written independently.
- Cost: reproduced directly. A fence opened with `` ```abc`def `` is masked (protected) by `maskCodeRegions` but left exposed to `stashCodeFences`, so a `> [!NOTE]` inside it is rewritten into a live HTML admonition. `check_code_regions.mjs` is structurally blind to this class. Not observed in `docs/` today.
- Fix in place: one shared, CommonMark-correct fence-opener predicate and one shared inline-code splitter, in the markdown module proposed under Decisions for you (a); both `render.mjs` functions and `convert_em_dash_separators.mjs` migrate onto it.
- Verify by: the reproduction case above, turned into a probe in `check_code_regions.mjs`; tree comparison.
- Size: M.
- Verified: A3-1 confirmed by direct reproduction (V1); L3-4 confirmed, byte-identical regex (V4), which itself notes the merged finding should inherit A3-1's R1 rather than average down; L4-7 confirmed equivalent today (V1).

#### A3-3 / L4-6 — R1, dup
**Two URL helpers, ported into two files, have diverged in three separately confirmed ways.**

- Where: `builder/seo.mjs:121-148` `absoluteUrl`/`relativeUrl` (config-arg, forces a leading slash at `:145-148`, no space encoding, `isAbsoluteUrl`'s scheme-only regex at `:160-162` misses `//host`) vs. `builder/template.mjs:917-936` (baseurl-arg, leaves a bare value unchanged at `:922`, encodes spaces at `:920`, its `:919` condition explicitly excludes `//host`); non-string/null input also handled differently (`null` vs. `""`).
- Recorded reason: none.
- Cost: no call site hits the gap today — this site's `baseurl` is always `""`, which masks the `//host` disagreement — but two independently maintained URL helpers is exactly the shape the rubric reserves for R1.
- Fix in place: one `builder/url.mjs`.
- Verify by: every URL in both trees, byte-identical before/after.
- Size: M.
- Verified: confirmed, all three disagreements traced directly (V1).

#### A4-3 — R1, dup
**The only post-release, real-HTTP link checker keeps its own five-pair attribute table instead of using the build checker's 21-tag, 26-pair table, and already misses seven kinds of link the build-time checker catches.**

- Where: `scripts/crawl_check.mjs:91-108` (own if/else chain: `a`/`href`, `link`/`href`, `img`/`src`, `script`/`src`, `iframe`/`src`) vs. `builder/link-check.mjs:38-60` `LINK_ATTR_TABLE` (21 tags, 26 flattened pairs, 9 distinct attribute names — corrected from an initial count of 20).
- Recorded reason: none found.
- Cost: live, on the deployed site — `crawl_check.mjs` never follows `srcset`, `poster`, `cite`, `formaction`, `action`, `data` or `longdesc` links, which the build-time checker does cover.
- Fix in place: export `LINK_ATTR_TABLE` (and `splitSrcset`) from `link-check.mjs`, and drive `crawl_check.mjs`'s tag handler from it, keeping its own HTTP concerns (concurrency, redirects, HEAD-then-GET). This is separate from the owner's decision on the two filesystem link checkers, which does not cover `crawl_check.mjs`.
- Verify by: `crawl_check.mjs`'s findings before/after over a page using one of the missed attributes.
- Size: S.
- Verified: corrected (V2) — table size corrected to 21/26; severity raised from the pass's original R2 to R1 because the gap is live.

#### A5-1 — R1, dup/conv
**Argv-parsing is hand-written in eight scripts and has already diverged three ways.**

- Where: `scripts/check_a11y.mjs:63-79` (no `--help` case, falls to "unknown arg", exit 2) vs. `scripts/pick_a11y_sample.mjs:144-147` and `scripts/sweep_a11y.mjs:106-110` (stderr, exit 0); `scripts/check_dot_fit.mjs:47` and `scripts/build_dot_metrics.mjs:55` (bare `.includes()`, silently ignores a typo'd flag); `scripts/check_a11y_fingerprint.mjs:115-121` and `scripts/check_axe_patch_equiv.mjs:43-45` (stdout, exit 0); `scripts/check_tree_fresh.mjs:76-90,82` (a third stdout example, in scope but left out of the pass's original count of seven).
- Recorded reason: none.
- Cost: a typo'd flag does nothing, silently, in two scripts; feeds the wider L1 convention gap.
- Fix in place: the shared argv module proposed under command-line handling (Decisions for you (e)).
- Verify by: each script's current flags and exit codes, preserved exactly.
- Size: L (the fix is the shared module itself).
- Verified: corrected (V2) — count raised from seven scripts to eight.

#### A6-1 / L1-11 / L4-13 — R1, dup
**A self-test accumulator, its report loop, an `uncaughtException` crash handler, and a `withBaseline` test fixture are each copied across three or four gate scripts, and have already diverged once.**

- Where: `check_page_baseline.mjs:38-44,128-139`; `check_book_coverage.mjs:81-87,158-170`; `check_symbol_index.mjs:40-45,361-370`; the crash handler additionally byte-identical in `check_publish_policy.mjs:29`; missing entirely from `check_tb_registry.mjs`, whose only error path ends at exit 1 for both a crash and a real failure; `withBaseline` duplicated between `check_page_baseline.mjs:46-55` and `check_symbol_index.mjs:314-323`.
- Recorded reason: none.
- Cost: `check_book_coverage.mjs:162` is the only one of the three that re-indents a multi-line detail string — already diverged. A shared fix must keep probes unconditional and take the probe-failure exit code as a parameter, since two other gates (`check_gate_lists`, `check_regex_safety`) use probes to guard a separate sweep rather than as the whole gate.
- Fix in place: one shared self-test/report/crash-handler helper, and one shared `withBaseline`.
- Verify by: each gate's current probe count preserved (18, 6, 11, 12, 46, 22, 12, per the Sound tally).
- Size: M.
- Verified: confirmed (V2).

#### A6-2 — R1, dup
**Three places in the repository disagree about the history of the same past incident, and the odd one out is the comment that introduces the gate built to stop exactly that kind of drift.**

- Where: `test.bat:34-43` (frames it as a fix that introduced three more wrong numbers) vs. `check_gate_lists.mjs`'s header (~30-44) and `Tools.md:435,437` (agree with each other: the numbers were already wrong in the commit that shipped the gate green). `test.bat`'s specific counts are corroborated by neither other account.
- Recorded reason: three competing recorded reasons is itself the finding.
- Cost: a maintainer reading `test.bat`'s comment gets an uncorroborated story.
- Fix in place: trim `test.bat`'s comment to a citation into `check_gate_lists.mjs`'s header, matching the file's other seven comments.
- Verify by: re-read after the edit; no behaviour change.
- Size: S.
- Verified: confirmed, the three-way disagreement traced exactly (V2).

#### A7-1 — R1, dup
**`tbrun`'s failed-build detector matches 3 of the 5 failure shapes its own sibling module lists, and still misses the two that matter.**

- Where: `scripts/tbrun.mjs:327` (`/^\[(BUILD\]\s+failed|LINKER\]\s+FAILED)\b/i`) vs. `scripts/lib/tb-ide.mjs:730-734` `BUILD_FAILED` (5 shapes).
- Recorded reason: the round-8 incident that motivated `tb-ide.mjs`'s own list is recorded; `tbrun.mjs`'s regex was never brought into line with it.
- Cost: a build that fails with `"[BUILD] ERROR"` or `"[LINKER] compilation (codegen) error"` is reported by `tbrun` as a success.
- Fix in place: export `tb-ide.mjs`'s `BUILD_FAILED` and use it from `tbrun.mjs`.
- Verify by: a probe project that fails each of the 5 ways; `tbrun` exits non-zero for all 5.
- Size: S.
- Verified: corrected (V3) — the orchestrator first reported "2 of 5"; tbrun's `/i` flag catches both listed casings of the BUILD shape, so it is 3 of 5. The consequence — the two missed shapes still produce a false success — is unchanged.

#### A8-1 — R1, dup
**`census_attributes.mjs`'s modifier-keyword list already disagrees with the two other places that classify the same twinBASIC source, and is missing `Overridable`.**

- Where: `builder/census_attributes.mjs` `MODS` (`:138-148`, also missing `Iterator`, `Dim`) vs. `scripts/lib/twin-api.mjs:123-125` and `scripts/lib/tb-fences.mjs:340-343` (which additionally has `Async`, `PtrSafe`, and others).
- Recorded reason: none — three independently maintained keyword lists.
- Cost: originally reported as a live misclassification (`"Public Overridable Sub"` falling through to the variable-declaration path). Traced against the real BETA 983 package cache: 31 `Overridable` `Sub`/`Function`/`Property` lines exist there, and zero have an attribute, so the divergence is real but dormant today, not live. Two further divergences (`blankStrings`'s missing `""` escape handling, and a per-line vs. cross-line block-comment state) are structurally confirmed, not shown to misfire on real source.
- Fix in place: one shared keyword-classifier module, paired with the ride-along probes **A8-4** also calls for.
- Verify by: re-run against the exported package tree; census output unchanged except newly recognised `Overridable` members.
- Size: M.
- Verified: confirmed as an already-diverged keyword list (V3); the impact claim corrected — see Where the passes were wrong.

#### A10-2 — R1, dup
**Three independent frontmatter readers — two in wisdom, one in the build — disagree on BOM handling and on type coercion.**

- Where: `wisdom/extract/sitemap.mjs:69-87` `parseFrontmatter` (no BOM strip) vs. `builder/discover.mjs:94-117` (`stripBom`, added after the AppGlobalClassObject incident) and `wisdom/extract/prep.mjs:343-388` (adds array and boolean/number coercion sitemap.mjs's version lacks).
- Recorded reason: none for the BOM gap.
- Cost: dormant — a scan of all 912 `docs/` markdown files at `fe9ce12b` confirmed zero begin with a BOM today. `WIP.md` itself documents that Windows editors add one "without being asked."
- Fix in place: route all three through the shared frontmatter parser proposed under Decisions for you (a).
- Verify by: every page's parsed frontmatter, deep-equal before/after.
- Size: M.
- Verified: confirmed, dormancy confirmed by direct scan rather than inference (V2); independent of the "different dialects" point below (see Where the passes were wrong).

#### L1-1 — R1, dup
**A theme/viewport validator exists in one accessibility script, built specifically after an unvalidated value once mislabelled a report, and is missing from two siblings that do the identical kind of dispatch — one of which is the axe-upgrade gate.**

- Where: `scripts/check_a11y.mjs:82-95` `pick()` vs. `scripts/sweep_a11y.mjs:120-121` and `scripts/check_a11y_fingerprint.mjs:134-135` (both bare `themeArg === "both" ? THEMES : [themeArg]`).
- Recorded reason: the fix exists in one place; it was never propagated.
- Cost: traced end to end — `axe-scan.mjs`'s `buildMatrix` builds the report label straight from the unvalidated string, and `gotoPage` applies it with no validation either; the dark CSS is scoped to `[data-theme=dark]` only, so an unrecognised value silently renders light while the report claims otherwise, reproducing the original bug in two tools that never received the fix.
- Fix in place: hoist `pick()` into `axe-scan.mjs`, or validate inside `buildMatrix`.
- Verify by: `--theme drak` fails loudly in all three tools.
- Size: S.
- Verified: confirmed, full consequence traced (V2).

#### L1-2 — R1, dup
**The flag-value helper `opt()` is reimplemented seven times in four variants, and the most common variant returns `undefined`, not its stated default, for a trailing value flag.**

- Where: (A) returns `undefined` — `census_attributes.mjs:86`, `check_examples.mjs:93`, `tbbuild.mjs:61` (3 copies); (B) falls back to the default, also for an explicit empty value — `addin_test.mjs:68`, `tbrun.mjs:105-108` (2); (C) one-arg, no default — `build_package_api.mjs:56`; (D) inline/unnamed — `check_publish_policy.mjs:31-33`. `NaN` confirmed at `tbbuild.mjs:68,70` (port, timeout) and `check_examples.mjs:102-104` (jobs, port, batch).
- Recorded reason: none.
- Cost: a trailing `--port` or `--timeout` silently becomes `NaN` instead of the documented default.
- Fix in place: the shared `numberOption()` in the cli.mjs module (Decisions for you (e)).
- Verify by: a trailing value flag now errors instead of becoming `NaN`, for every affected tool.
- Size: M.
- Verified: confirmed, all 7 copies found and classified (V2).

#### L1-3 — R1, dup/hack
**Positional-argument detection disagrees between two harness tools, and one fails outright on a boolean flag placed before the positional argument.**

- Where: `scripts/tbrun.mjs:112-116` (explicit `VALUE_FLAGS` list) vs. `scripts/tbbuild.mjs:62` (order-dependent: rejects a token whose *predecessor* starts with `--`, with no distinction between a boolean switch and a value-taking flag).
- Recorded reason: none.
- Cost: `tbbuild --keep proj` reports a usage error, because `--keep`'s own `--` prefix rejects the token after it.
- Fix in place: the shared flag registry in the cli.mjs module.
- Verify by: `tbbuild --keep proj` succeeds after the fix.
- Size: S.
- Verified: confirmed, traced exactly (V2, by trace rather than execution).

#### L1-4 — R1, hack
**`tbdocs.mjs` throws on an unknown argument, and the resulting exit code is the same bit already documented elsewhere in the same function as meaning "link check failed."**

- Where: `builder/tbdocs.mjs:189-191` (throw), `:1616-1635` (`main()`/`.catch`, uniform exit 1), `:1568-1570` (the link-check bit-0 meaning).
- Recorded reason: none.
- Cost: a parse error and a real link-check failure are indistinguishable by exit code, in the flagship, CI-invoked tool.
- Fix in place: exit 2 for parse errors, distinct from the build-failure bitmask.
- Verify by: a malformed flag exits 2; a real link-check failure still sets bit 0.
- Size: S.
- Verified: confirmed, full trace (V2).

#### L2-1 — R1, dup
**Two more hand-kept lists of "which folders are output trees" repeat a defect class `check_tree_fresh.mjs` was already fixed for once, and one of the two has a traced live consequence.**

- Where: `builder/serve.mjs:138` `IGNORED_PREFIXES` (no `_site-basepath*` entry — a `--dest docs/_site-basepath` run mid-`serve.bat` is not filtered, causing a spurious rebuild); `eval/build_corpus.mjs:59-71` `EXCLUDED_PATHS` (lists `docs/_site-basepath` explicitly, but its prefix test does not match `-offline`/`-pdf` variants, since the next character is `-` not `/`). `60bb6f5` edited `serve.mjs`'s list the same day `scripts/lib/markdown-files.mjs`'s general `isOutputTree` was added, without switching to it.
- Recorded reason: none.
- Cost: a spurious rebuild while `serve.bat` is running; incomplete exclusion in the evaluator's corpus builder.
- Fix in place: both use `isOutputTree`.
- Verify by: a `--dest docs/_site-basepath` build during `serve.bat` produces no spurious rebuild; `build_corpus.mjs` excludes all three basepath variants.
- Size: S.
- Verified: confirmed, both halves (V1).

#### L2-2 — R1, dup
**`census_attributes.mjs` reimplements the twinBASIC-install finder that a shared module's own header exists specifically to prevent a private copy of, and the two have already diverged.**

- Where: `census_attributes.mjs:99-119` `findInstall` (validates via a `packages/` directory) vs. `scripts/lib/tb-install.mjs:19-35` `findIde` (validates via `twinBASIC.exe`); the home-directory fallback (`os.homedir()` when `USERPROFILE` is unset) exists only in the private copy.
- Recorded reason: `tb-install.mjs`'s own header states the shared-module rationale this private copy undercuts.
- Cost: the two recognise an install by different files, so a partly unpacked install passes one check and fails the other; they also disagree when `USERPROFILE` is unset.
- Fix in place: `census_attributes.mjs` uses `findIde`, keeping its `packages/` validation; fold the home-directory fallback into `tb-install.mjs` itself.
- Verify by: both functions agree on the same Desktop layout, including an unset `USERPROFILE`.
- Size: S.
- Verified: confirmed (V3).

#### L3-1 — R1, dup
**`check_a11y.mjs` launches its browser with no try/finally, and the exact exception path it leaks on is already named in a comment one line above the unguarded code.**

- Where: `scripts/check_a11y.mjs:167` (launch), `:218` (`browser.close()`, success path only), `:244-247` (`main().catch`, exits 2 without closing); `:229`'s own comment ("though PAGE_STATES throws before it gets that far"); every sibling using the same library guards it (`check_a11y_fingerprint.mjs:234,238-248`; `sweep_a11y.mjs:209,214-274`; `check_axe_patch_equiv.mjs:99,104-116`).
- Recorded reason: none for the missing guard; the throw path is independently confirmed real — `axe-scan.mjs`'s `PAGE_STATES` appliers throw by design on a failed assertion.
- Cost: any `PAGE_STATES` assertion failure leaves Chromium running for the rest of the job on Linux, which is where CI runs this gate. Whether Windows reaps it with its parent was not tested.
- Fix in place: a shared `withBrowser(fn)` helper in `axe-scan.mjs`, adopted by all four scripts.
- Verify by: a deliberately failing assertion leaves no child process running, before/after.
- Size: S.
- Verified: confirmed by code reading; no browser was actually started to reproduce it (V4).

#### L3-3 — R1, hack
**Wisdom's section splitter contradicts its own header comment — "we never silently drop reviewer content" — by dropping exactly that, with no fence awareness of any kind.**

- Where: `wisdom/extract/merger.mjs:114-129` `parseStaging` (splits on any line exactly equal to `---`); `:162-168` `parseSection` (returns `null` for a chunk not starting `"## "`); `:147-148`/`152-153` (the caller drops a `null` result silently); `:111-112` (the contradicted comment).
- Recorded reason: the comment states the opposite of what the code does.
- Cost: reproduced directly on a synthetic file — a bare `---` inside a fenced block does not make the whole section disappear, but it does silently cut off the rest of that section's own body and its entire metadata line (`finding_ids`/`confidence`): the tail chunk does not start with `## `, so it is dropped. Ground truth on the real, 15,553-line committed `staging.md`: 1,160 bare `---` lines produce 1,160 chunks, and all 1,160 start with `"## "` — zero dropped today, so the defect is dormant on the current file (a separate, real content slip at the same file's lines 14245–14246 is discussed under Where the passes were wrong and Decisions for you (f)).
- Fix in place: parse `staging.md` through the shared markdown module's fence-aware section splitter (Decisions for you (a)) instead of a bare line-equality test.
- Verify by: replay of the real `staging.md`, zero dropped or mis-paired sections, before and after.
- Size: M.
- Verified: confirmed, with the nuance above (V4).

#### L4-10 — R1, dup
**Twin-BASIC source-line splitting is implemented twice, and the two have already diverged on BOM handling and on block comments.**

- Where: `scripts/lib/tb-fences.mjs:423-445` `logicalLines` (private) vs. `scripts/lib/twin-api.mjs:51-86` `logicalLines` (exported). Twin-api strips a leading BOM and threads a multi-line `/* */` comment across physical lines; tb-fences does neither — it has **no `/* */` handling at all**.
- Recorded reason: tb-fences's quote-aware comment stripping (its own stated reason, `:423`) is preserved in twin-api's version too — confirmed directly, both are quote-aware for the same structural reason. Not a drop-in swap, though: twin-api keeps blank lines (tb-fences drops them), uses 1-based `line` vs. tb-fences's 0-based `at`, never trims (tb-fences does), and recognises `Rem` (tb-fences does not) — four behaviour changes a real replacement must absorb deliberately.
- Cost: a `/* */` comment spanning two physical lines is not stripped by tb-fences at all; its trailing declaration is left unreachable by tb-fences' own `^`-anchored classifier regexes.
- Fix in place: consolidate on one `logicalLines`, absorbing the four behaviour differences deliberately, with a probe for a `/* */` span.
- Verify by: `check_examples.mjs`'s 74-probe `runProbes` suite unchanged; a new probe for a block comment.
- Size: M.
- Verified: confirmed, including the full replacement-question analysis run for exactly this purpose (V3).

### Tier 2 — makes every change in the area slower or riskier

#### A1-3 / L4-1 — R2, dup
**A "run handler, time it, report" block is repeated three times in the same file.** Where: `builder/cpu-worker.mjs:360-377, 423-440, 469-486` (a fourth block at `:497-540` is genuinely different — a distinct message shape and a deliberate SAB-then-postMessage ordering that closes a race, related to **A1-7**). Recorded reason: none. Cost: a fix must be applied by hand three times. Fix in place: one shared `runTimed()` helper for the three identical paths. Verify by: tree comparison. Size: M. Verified: confirmed, including the fourth path's genuine difference (V1).

#### A1-4 — R2, dead
**An exported timer helper has zero callers anywhere, and the private copy that is actually used justifies itself by citing tools that no longer exist.** Where: `builder/tbdocs.mjs:196-209` `makeTimer` (exported, unused) vs. `builder/offline.mjs:98-111` (private, identical, called at `:151`); the comment at `:95-97` cites the tools `644d6bdb` deleted. Recorded reason: expired — the cited consumers are gone. Cost: a future editor cannot tell which copy is live. Fix in place: delete the unused export, or have `offline.mjs` import the one copy; correct the comment. Verify by: grep for callers; tree comparison. Size: S. Verified: confirmed (V1). One of the five members of the **L4-8** low-level-util cluster (see Tier 3).

#### A1-6 — R2, conv
**Exit-code bits are set at seven sites with bare magic-number literals, and bit 0 is set independently by five of them.** Where: `builder/tbdocs.mjs:560, 1469, 1470, 1568-1573, 1598, 1610`. Recorded reason: none. Cost: today's five bit-0 sites are safe only because they execute in a fixed source order before the OR'd sites; nothing enforces that order, so a reordering silently clobbers a bit. Fix in place: a `failBuild(bit)` helper with named constants. Verify by: tree comparison; a deliberately reordered defect still fails loudly. Size: M. Verified: confirmed (V1).

#### A2-1 / A1-5 / L4-4 — R2, dead
**Five dead code paths from the retired `_diff`/`_triage` tools remain live in `offline.mjs`, plus a 24-name re-export block with zero importers.** Where: `builder/offline.mjs:244-289` `writeOfflinePages` (zero callers, a clone of the live pre-pass at `cpu-worker.mjs:183-201`), `:117` (unread `precomputed` param), `:207,213,359-394` (`buildSitePaths`'s unreachable fallback — `tbdocs.mjs:705-706` always sets `sitePaths`), `builder/search.mjs:18-24` `writeSearchData`, `builder/sitemap.mjs:70-74` `extractSitemapUrls`, `offline.mjs:55-88` (re-export block, confirmed zero importers for every one of the 24 names). Recorded reason: none live. Cost: dead code that looks essential to an editor who doesn't check. Fix in place: delete all five paths and the re-export block. Verify by: repo-wide grep for callers = 0; tree comparison. Size: M. Verified: confirmed, severity corrected from the pass's own hedged R1 to R2, since nothing here has actually diverged, only gone unreachable (V1).

#### A2-2 / A9-10 — R2, dead
**Comments in five files still name tools deleted in `644d6bdb`, and one uses the stale reference to justify a dead export.** Where: `offline-rewrite.mjs:411`, `search.mjs:65-66`, `sitemap.mjs:67-68,97`, `redirects.mjs:35-36`, `pdf.mjs:6-9,99-107` (justifies `extractImagePaths`, `pdf.mjs:146-158`, zero callers; `deriveBookOutputs`, by contrast, is live, called from `writePdf`). Recorded reason: describes tools that no longer exist. Cost: a stale comment claiming a real consumer is what lets dead code survive review. Fix in place: delete the comments and the dead export. Verify by: grep for the deleted tool names outside git history. Size: S. Verified: confirmed (V1); zero callers for `extractImagePaths` confirmed repo-wide.

#### A2-3 / L2-4 / L4-5 — R2, dup
**A baseline reader is byte-identical in two files, and the six-branch drift-guard state machine around it is retyped rather than shared; the accompanying hand-written writer has its own small divergence.** Where: `page-baseline.mjs:83-90` vs. `symbol-baseline.mjs:45-52` (`readBaseline`); `checkPageBaseline:117-176` vs. `checkSymbolBaseline:75-125` (the six-branch structure); `symbol-baseline.mjs:55-58` `writeBaseline`. Recorded reason: `WIP.Build.md` ("the page-count guard's shape applied to URLs") explains why the two look alike, not why the branch bodies weren't factored together. Cost: any fix to the drift-guard logic must be made twice by hand. Fix in place: one shared baseline-drift-guard module; `writeBaseline` delegates to `JSON.stringify(x, null, 2) + "\n"`. Verify by: byte-identical baseline files before/after; the gate still fails on reintroduced drift. Size: M. Verified: confirmed (V1). Conflict resolved: `writeBaseline` is byte-identical to `JSON.stringify(...,null,2)+"\n"` for every non-empty list, confirmed by execution — it differs only on an empty list (`[\n\n  ]` vs. `[]`), an accidental artifact rather than the "one URL per line" design L4 first read into it.

#### A2-4 / A3-5 (escapeRegExp) — R2, dup
**A regex-escaping helper is defined identically in three files, and a fourth tool had to be specially built to tolerate the duplication.** Where: `render.mjs:2235-2237`, `offline-rewrite.mjs:239-241` (exported), `book.mjs:212-214` `escapeRegExpBook`. Recorded reason: none for the duplication; `scripts/lib/regex-fold.mjs:58-63` explicitly recognises the escaper "by shape rather than by name" because of these exact copies — evidence for the finding, not a defence of it. Cost: a fourth copy is one keystroke away. Fix in place: one exported `escapeRegExp`. Verify by: tree comparison. Size: S. Verified: confirmed (V1).

#### A2-7 — R2, dup
**An ASCII-only, NBSP-preserving whitespace trim is implemented twice, with two different techniques, repeating the shape of a whitespace-in-code defect that has already shipped once.** Where: `compress.mjs:73-84` `collapseWhitespace` (regex-based) vs. `search.mjs:251-261` `stripAsciiWhitespace`/`isAsciiWs` (charCode-scan-based); both independently preserve NBSP. Recorded reason: none for the duplication. Cost: `WIP.Build.md` documents a real, named prior defect in exactly this area of `compress.mjs` ("Whitespace inside inline code is content"); two implementations double the chance of a second one. Fix in place: one shared whitespace-collapse helper. Verify by: tree comparison (search index and compressed HTML unchanged). Size: S. Verified: confirmed (V1).

#### A3-2 / L3-5 — R2, dup
**Seven HTML-escaper copies exist across two classes, "escapeHtml" collides three ways as a name across the build, and one function mixes both classes for sibling token types.** Where: minimal (`&<>`) — `render.mjs:2230-2233` `escapeHtmlMinimal`, `highlight.mjs:251-254` `escapeHtml` (recorded reason: matches Rouge, which escapes only `&<>`), `gantt.mjs:213` `esc`; full (`&<>"'`) — `render.mjs:2225-2228` `escapeHtml`, `template.mjs:993-998` `escText` and `:999-1001` `escAttr` (byte-identical to `escText` under a different exported name), `sitemap.mjs:106-113` `xmlEscape`; `render.mjs:1437-1450` `headingTocHtml` uses the full escaper for `text` tokens and the minimal one for `code_inline` tokens, within the same function. Recorded reason: `highlight.mjs`'s own 3-character choice is explained (Rouge parity); `render.mjs`'s internal mixing is not. Cost: dormant (no TOC'd heading has an apostrophe today), but a maintainer grepping for "escapeHtml" can pick the wrong module's copy and silently under-escape. Fix in place: one minimal and one full escaper in a shared module; `headingTocHtml` escapes all inline-token text consistently. Verify by: TOC rendering unchanged for the existing corpus; a probe heading with an apostrophe. Size: S. Verified: confirmed — A3-2 narrowed to `render.mjs`'s internal mixing, since `highlight.mjs`'s own choice is separately justified (V1); L3-5's broader catalogue, including the `escText`/`escAttr` duplicate, confirmed independently (V4).

#### A3-6 — R2, hack
**Three whole-page HTML rewrites have no code guard and depend on an invariant that is true for three of four ways text can reach `<code>`/`<pre>`, and false for the fourth.** Where: `render.mjs:74-80` `padEmptyCells`, `:351-354` `normaliseVoidTags`, `template.mjs:714-727` `injectAnchorHeadings` (its `HEADING_REGEX` at `:694` has no `<code>`/`<pre>` leading alternative). Recorded reason: none at the three sites; `WIP.Build.md`'s "Never rewrite markdown source without knowing what is code" section never mentions these three, as compliant examples or as a stated exception. Cost: the fourth path — a raw, hand-authored `<pre>` or heading tag in markdown source, structurally open via `html: true` and never overridden by any `md.renderer.rules` assignment — lets text end up in `<code>`/`<pre>` unescaped, though `git grep` across all 912 pages finds none today. This codebase has already paid for exactly this class of mistake once, in `book.mjs`'s chapter-transform rewrites, whose incident report concludes "do not rely on that accident." Fix in place: state the invariant, and extend it with the code-guarded pattern already used elsewhere (`replaceOutsideCode`, or the `<code>`/`<pre>` leading-alternation shape), or a probe. Verify by: `check_code_regions.mjs` extended to the post-render chain. Size: M. Verified: confirmed, with a conflict ruled — L3 had called these three "sound" on the reasoning that every code path escapes first; true for three of four paths, not the fourth. Both readings are partly right; A3-6 stands as written (V4).

#### A3-7 — R2, struct
**One template module holds a date formatter, URL helpers, and a fourth, independent escape-helper implementation, beyond its own templating job.** Where: `template.mjs:940-989` (strftime tables and `formatDate`/`parseDate`), `:917-936` (URL helpers), `:991-998` (a fourth escape-helper block, under its own "§5.15 escape helpers" header). Recorded reason: none. Cost: several unrelated jobs in one module, the rubric's own definition of a struct finding. Fix in place: see Split candidates. Size: L. Verified: confirmed, reinforced by a fourth job V1 found beyond the pass's own citation.

#### A4-2 — R2, dup
**The structured-findings translation is written twice, though the human-readable half is already shared.** Where: `builder/check.mjs:422-449` `findingsFor` vs. `scripts/check_links.mjs:602-634` `buildFindings` (same broken/forbidden/html/a11y/dupIds/remoteAssets logic, differing only in the path-relativiser and a null-guard); both already import `formatLinkReport`/`formatIntegrityReport` from `link-check.mjs`. Recorded reason: both comments (`check.mjs:410-414`, `check_links.mjs:599-601`) tie the parallel shape to `check_links_diff.mjs` cross-checking two independently written implementations — legitimate when written. Cost: superseded by the user's 2026-09-25 decision to make `check_links.mjs` a thin wrapper over `builder/check.mjs` (decision 5); after that refactor there is one implementation behind two front ends, and both comments need rewriting. Fix in place: as part of the Phase 2 thin-wrapper work already decided, delete the duplicate translation and rewrite both comments. Verify by: `check_links_diff.mjs` continues to cross-check disk-read vs. memory-read over the one implementation. Size: M. Verified: confirmed (V2); the conflict this raises with L4's "deliberately mirrored" reading is resolved under Where the passes were wrong.

#### A5-2 — R2, conv
**The documented 0/1/2 exit convention is broken in two scripts that crash instead of exiting 1 for a genuine finding.** Where: `docs/Documentation/Extending.md:640-648` (the convention); `build_dot_metrics.mjs` (no catch around its puppeteer work; its only intentional exit path is `exitCode=1` for STALE); `pick_a11y_sample.mjs`'s `discover()` (`:159-169`, an absent tree throws uncaught, ending at the same exit 1 as a real coverage gap at `:310`); contrast `check_dot_fit.mjs:31-34`, which has the guard and cites the convention by name. Recorded reason: the convention exists; these two don't follow it. Cost: `pick_a11y_sample.mjs` runs live in `check.bat:23` — a crash there reads as a coverage gap to anyone triaging a red `check.bat`. Fix in place: wrap both in the convention's try/catch, exit 2 for a genuine crash. Verify by: a deliberately broken tree exits 1, not crashes, for a real gap; exits 2 for an actual crash. Size: S. Verified: confirmed (V2).

#### A5-3 / L4-9 (part 1) — R2, dup
**Page discovery, tag counting, and a stub ceiling are each implemented independently in two scripts whose outputs must agree with each other.** Where: `pick_a11y_sample.mjs:122,159-169,184` `STUB_CEILING` vs. `sweep_a11y.mjs:78,129-153` `STUB_TAG_CEILING` (both 100 today); `pick_a11y_sample.mjs`'s `--propose` reads the exact JSONL file `sweep_a11y.mjs`'s `--out` default writes. Recorded reason: none. Cost: the two ceilings must stay in step for the join between them to mean anything, and nothing enforces that today. Fix in place: one shared discovery/ceiling module. Verify by: `--propose` output unchanged. Size: S. Verified: confirmed (V2).

#### A5-5 — R2, dup
**Two scripts hand-build an identical Inter-webfont host page and an identical puppeteer launch, including a flag neither explains, while a third tool's equivalent launch explains its flags but omits this one.** Where: `check_dot_fit.mjs:76-87` and `build_dot_metrics.mjs:57-68` (both `["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]`, no comment on the third flag); `axe-scan.mjs:258-264` `LAUNCH_ARGS` (explains the first two, silent on the third for the same class of `file://` load); three different repo-root idioms coexist in scope at the same time. Recorded reason: none. Cost: a maintainer changing one launch has to find and update the other by hand. Fix in place: one shared puppeteer-launch helper with the flag documented once. Verify by: tree comparison (diagram fit, metrics unchanged). Size: S. Verified: confirmed (V2).

#### A5-6 / L2-3 — R2, dup
**A gate re-scans `.dot` sources by hand instead of importing the shared, already-exported-elsewhere walker.** Where: `check_dot_fit.mjs:49-67` `findDotSvgs` vs. `builder/dot.mjs:135-155` `listDotSources` (never exported; only `regenerateDot` calls it internally); five other gates already import the shared `markdown-files.mjs` chain instead of re-implementing the same traversal. Neither function uses `isOutputTree`; their shared, broader `"_"/"."` skip is safe today, since no `.dot` file sits under `_data`/`_sass`/`_App`/`_Images`. Recorded reason: none. Cost: the mirror-fault shape this review is watching for — a second copy that silently stops matching the first if either changes. Fix in place: export `listDotSources`, or a shared `filesUnder(root, {ext, skip})` helper. Verify by: identical file lists before/after. Size: S. Verified: confirmed (V2).

#### A6-3 — R2, conv
**A tool about to become a pre-commit check has no path from a crash to a distinct exit code, which will matter once it runs inside the pre-commit hook already planned for it.** Where: `convert_em_dash_separators.mjs` has exactly one `process.exit(...)` (`:214`), fed only 0 or 1 from `main()` (`:210`); no `catch`/`uncaughtException` anywhere. `PLAN-10.md:690-693,795-797` both defer exactly that hook to later. Recorded reason: the hook doesn't exist yet, so the gap is dormant by design, not by oversight. Cost: none today; matters the day the hook ships. Fix in place: the shared crash-handler pattern from **A6-1**. Verify by: a crash now exits 2, a real finding still exits 1. Size: S. Verified: confirmed (V2).

#### A6-4 — R2, struct
**Nothing reads either CI workflow to confirm it runs the same gates as the wrappers, though today the two workflows' shared steps are byte-identical.** Where: `check_gate_lists.mjs` never touches a workflow file (confirmed: zero matches for `.github`/`workflow`/`.yml`); the two workflows' 12 shared gate steps are identical, in the same order, differing only in three already-recorded ways (`checks.yml`'s extra fixture-built link-checker step, the deploy build's extra `--url`/`--baseurl`, and deploy-only steps). Recorded reason: decision 6 already commits to building this gate; the design (a new `scripts/check_ci_workflows.mjs` plus a shared `scripts/lib/gate-roster.mjs`, generalising `check_gate_lists.mjs`'s `gatesFromBat`) is in the ledger but not yet evaluated by a verifier. Cost: nothing today would catch a workflow silently dropping a gate, reordering one around a critical flag, or losing `--check-audit-index`. Fix in place: as designed — compare wrapper roster vs. each workflow, the two workflows against each other, and critical build flags, against an explicit allowlist of the three recorded deltas. Verify by: probes for a missing gate, an extra step, reordering, a missing flag, and confirmation the three allowlisted deltas do not fire. Size: L. Verified: facts confirmed (V2, which did not evaluate the proposed design, per its own scope).

#### A7-2 — R2, struct (kind arguable — reads closer to an unguarded workaround; left as filed)
**A timeout return value is silently discarded at every call site, reopening the cursor-reset race the function exists to prevent.** Where: `tb-operate.mjs:421-429` `afterReveal` (returns `false` on timeout) vs. its three call sites, `openFile:453`, `setCursor:461`, `select:475` (each a bare `await afterReveal(c);`). Recorded reason: the race is documented (`:401-409`, the measured `"xyz"→"zy"` cursor corruption); the discard that reopens it is not. Cost: silently proceeding after a timeout risks exactly that corruption again. Fix in place: check the return value at all three call sites; retry or fail loudly on timeout. Verify by: `addin-test.bat` green, same lanes. Size: S. Verified: confirmed (V3).

#### A7-3 — R2, dup
**Two CDP click primitives exist, one minimal and one with scroll, hit-test and retry, and the minimal one is used for the build icon alone.** Where: `tb-ide.mjs:848-861` `clickCenter` (no scrollIntoView, hit-test or retry; exactly 2 call sites, both the build icon: `tb-ide.mjs:757`, `tbrun.mjs:295`) vs. `tb-operate.mjs:79-134` `click` (scrollIntoView, shadow-root-aware hit test, retry loop; used directly in 4 of the 10 `test/addin/*.test.mjs` files — appdata, panes, sample10, sample15 — plus twice inside `tb-operate.mjs` itself). Recorded reason: none. Cost: the build-icon click path skips the retry and hit-test logic every other click path relies on. Fix in place: route `clickCenter`'s two call sites through `click`, or justify why the build icon is exempt. Verify by: `addin-test.bat` green, same lanes. Size: S. Verified: corrected (V3) — usage overstated as "every scenario"; corrected to the exact 4-of-10 file list.

#### A7-4 — R2, dup
**Two small helpers are byte-identical between a shared module and its one caller, which separately imports ten names from that module.** Where: `tb-registry.mjs:588-590` `alive` and `:462` `norm` (both private/unexported) vs. `addin_test.mjs:105` and `:230` (identical bodies); `addin_test.mjs:60-61` imports 10 names from `tb-registry.mjs` (corrected from an initial count of 9). Recorded reason: none. Cost: none yet — not diverged. Fix in place: export `alive`/`norm` from `tb-registry.mjs`, remove the private copies. Verify by: `addin-test.bat` green. Size: S. Verified: corrected (V3) — import count corrected to 10. A conflict with L4's "no clone region, below the detector's window" reading is resolved in A7-4's favour: both bodies were read directly and found identical.

#### A7-5 — R2, conv
**The harness's three CLI tools disagree on defaulting behaviour in independently reproducible ways, one of which produces a misleading diagnostic.** Where: `tbbuild.mjs:61-62,68,70,118-122` (`opt()` returns `undefined` on a trailing flag, so `Number(undefined)` is `NaN` for `--port`/`--timeout`; a `NaN` timeout makes `tb-ide.mjs:436`'s polling loop run zero times, producing "the IDE never reported `<name>` as open" instead of a timeout message); `tbrun.mjs:105-108`/`addin_test.mjs:68-69` (substitute the default for a trailing flag *and* for an explicit `""`); `tbbuild.mjs`'s positional finder skips a token after any `--flag` regardless of whether it takes a value, so `tbbuild --json proj` fails (dormant — `check_examples.mjs:602` always puts the path first); `die()` exists in three different shapes across the three tools. Recorded reason: none. Cost: a misconfigured timeout produces the wrong diagnosis. Fix in place: the shared cli.mjs module — `numberOption()` closes the `NaN` hole, a flag registry replaces the order-dependent positional finder. Verify by: the reproduced cases above become fixture cases. Size: M. Verified: confirmed, every sub-claim independently reproduced by script or trace (V3).

#### A7-8 — R2, dup
**Every one of the ten add-in test scenarios hand-writes its own lane preamble, and six of the ten hand-write a "console lines since a mark" reader four different ways.** Where: all ten `test/addin/*.test.mjs` files (the `HERE`/`HOST`/lane preamble and the skip object); `appdata.test.mjs:33`/`panes.test.mjs:86` `probeLines` (two hard-coded slice offsets), `arch.test.mjs:31`/`reload.test.mjs:37` (two different regex-capture readers), `keys.test.mjs:28` (plain split+trim), `sample10.test.mjs:81` (bare trim, no split). Recorded reason: none. Cost: a change to how the console mark works must be found and fixed in up to four different shapes. Fix in place: a scenario helper, plus one shared `linesSince` beside `readConsole`. Verify by: `addin-test.bat` green, all ten lanes. Size: M. Verified: confirmed (V3).

#### A8-2 — R2, struct
**A `builder/` module depends on `scripts/`, against the codebase's own stated rule, and a gate has a carve-out that exists only for this one file.** Where: `census_attributes.mjs:79` imports `../scripts/lib/tb-packages.mjs`; `render.mjs:383`'s comment states, verbatim, "builder/ must not depend on scripts/"; `check_tree_fresh.mjs:57-63` `IGNORED_FILES` exists only for `census_attributes.mjs`. Recorded reason: none for the violation itself. Cost: 11 files cite the `builder/census_attributes.mjs` path directly, and 13 cite the bare filename (corrected — the pass's original ten-item list wrongly included `WIP.Build.md`, which only cites the bare filename, and omitted `scripts/build_package_api.mjs:12` and `scripts/lib/tb-fences.mjs:334,349`, which cite the literal path); every one needs updating on a move. Fix in place: move `census_attributes.mjs` to `scripts/`, beside `build_package_api.mjs` (already scheduled in Phase 1 of the plan). Verify by: tree comparison; all citations updated; `check_tree_fresh.mjs`'s carve-out removed. Size: M. Verified: corrected (V3) — citation count and list corrected.

#### A8-4 — R2, struct
**Two independent keyword/phrase classifiers, both with a documented history of silent misparses, have no fixture-based regression test.** Where: `census_attributes.mjs` (no `selftest`/`node:test`/assertion anywhere; its own header at `:42-67` names a 14-site Interface-member loss and, at `:150-152`, a 368-Declare misparse) and `gen_attribute_probes.mjs`'s `parseTargets` (`:961-978`, its own comment at `:946-947` names a plural-matching bug it already shipped). Recorded reason: both histories are recorded; neither has a test that would have caught them by construction. Cost: the next silent misparse ships the same way the last ones did. Fix in place: a shared "labelled-keyword-list classifier plus ride-along probes" pattern, covering both (paired with **A8-1**'s fix). Verify by: the probes themselves, run in `test.bat`. Size: M. Verified: confirmed (V3).

#### A9-1 — R2, hack
**The pdf-lib shims are contained but not guarded: only an exact version pin protects them, which catches accidental drift and nothing else.** Where: all 13 production shim files under `book/lib/` (e.g. `fast-array-onebuf.mjs`, `fast-sync-load.mjs`); each has only an idempotency guard (`__xInstalled`-style), never a check of what it overwrites; `parallel-deflate.mjs:50`'s `PDFStreamWriter` subclass has no guard of any kind; `package.json:20` pins `pdf-lib` at exactly `1.17.1`. Recorded reason: `perf/notes/08-pdf-lib.md:1751-1757` states the pin exists "so a stray `npm update` can't silently swap upstream" — covers accidental drift only, exactly as claimed; pdf-lib's upstream is genuinely abandoned (the `@cantoo` fork was evaluated and rejected, `08-pdf-lib.md:5048-5061`), which is why this is R2 rather than R1. Cost: a deliberate future version bump, or a mistaken hand-edit to a shim, fails silently. Fix in place: load-time shape assertions per shim, modelled on `axe-scan.mjs`'s `SOURCE_PATCHES` counts. Verify by: a deliberately wrong shape throws by name. Size: M. Verified: confirmed — matches the rubric's un-met "guarded" test exactly (V3).

#### A9-2 — R2, struct
**No test anywhere compares the shimmed output against stock pdf-lib.** Where: no test file exists under `book/` at all; the only comparisons are one-off, manual notes in `perf/notes/08-pdf-lib.md`. Recorded reason: none. Cost: a shim regression would only be caught by visual inspection of the rendered PDF. Fix in place: `check_pdf_shims_equiv.mjs`, modelled on `check_axe_patch_equiv.mjs` (stock pdf-lib run in a child process); would become a new `test.bat` gate. Verify by: the new gate, run against a deliberately broken shim. Size: M. Verified: confirmed, no test file exists anywhere under `book/` (V3). See Decisions for you (c).

#### A9-3 — R2, dup
**Two of six helpers shared between the array and dict "onebuf" implementations are identical apart from naming; the other four are similarly shaped but not copies.** Where: `fast-array-onebuf.mjs` vs. `fast-dict-onebuf.mjs` — `_registerContext` and `_appendArray` are identical bar internal names; `pack`, `_cow`, `_makeFromRange`, `_makeFromAppend` differ by real bit-packing and subclass-dispatch logic dict needs and array does not. Recorded reason: `fast-array-onebuf.mjs:36-39` names only the singleton-context mechanism, leaving `_appendArray`'s exact duplication unaddressed. Cost: a fix to the two identical helpers must be applied twice. Fix in place: `book/lib/onebuf-range.mjs`, a factory that parametrises over the subclass-dispatch and gap-mask logic the two genuinely need differently — not a naive single-body extraction. Verify by: the book pipeline's oracle (page count, outline, extracted text unchanged). Size: M. Verified: confirmed, with the "identical" claim narrowed to exactly two of the six helpers (V3).

#### A9-6 — R2, struct — Resolved in `90624841`
**Four A/B-baseline shims lived in `book/lib/` but were loaded only by `perf/`.** Where: `fast-refs`, `fast-dict-array`, `fast-dict-iter`, `fast-parse-dict`; `render-book.mjs:56-58` records them as baselines, not their location. Recorded reason: needed the user's decision, since it is the converse of decision 1 (moving code the other direction, from `book/` toward `perf/`). Cost: production code (`book/lib/`) held code nothing in production loaded. Resolution: the user approved deleting the four rather than moving them, since `perf/`'s own measurements against them are already recorded in `perf/notes/08-pdf-lib.md` and git keeps the code. Verified: confirmed at pass time (V1, via the deletion decision's own cross-check of importers).

#### A9-7 — R2, dup
**A safety-critical code/pre guard alternation is re-typed by hand four times, including twice in the same file, with no gate tying the copies together.** Where: `book.mjs:210` `CODE_OR_PRE_BOOK` and `:228-229` `IMG_SRC_RE_BOOK` (same file); `pdf.mjs:143-144` `IMG_SRC_RE` (byte-identical to `book.mjs`'s); `offline-rewrite.mjs:299` `HTML_COMBINED_RE` (opens with the identical alternation before diverging). Recorded reason: none. Cost: this is the exact guard shape `WIP.Build.md` prescribes for a whole-page HTML rewrite; a fix to it — say, a missing HTML5 void-element case — must be found and applied in four places. Fix in place: one exported fragment, composed into each regex. Verify by: `book.html`, the PDF and the offline HTML, byte-identical before/after. Size: S. Verified: confirmed (V3).

#### A9-8 / A2-6 — R2, dup
**A URL-normalising helper is byte-identical in two files, and the comment justifying the private copy describes a plugin architecture this codebase no longer has.** Where: `book.mjs:303-307` `normalizeBaseurl` vs. `offline-rewrite.mjs:232-236` (exported); `book.mjs:300-302`'s comment cites "book-href-rewrite.rb keeps its own copy... so plugins are independent" — the old Ruby/Jekyll architecture. Recorded reason: expired. `book.mjs` already imports two sibling `builder/` modules (`compressHtml` from `compress.mjs`, `loadData` from `data.mjs`); nothing prevents it from importing `normalizeBaseurl` the same way. The comment is also wrong about the function's current location (`offline-rewrite.mjs`, not `offline.mjs`). Cost: a fix to URL normalisation must be applied twice. Fix in place: `book.mjs` imports `normalizeBaseurl` from `offline-rewrite.mjs`. Verify by: byte-identical output before/after. Size: S. Verified: confirmed byte-identical (V1). Conflict resolved in favour of this finding — see Where the passes were wrong.

#### A10-3 — R2, dup
**Wisdom re-implements the shared markdown file-walker from scratch, and its recorded reason does not actually cover what the shared version requires.** Where: `wisdom/extract/sitemap.mjs:61-67` `walk()` (bare recursive `readdirSync`, no `.md` filter, no output-tree skip). Recorded reason: `PLAN-3.md:404` — "a minimal built-in parser, no dependency on `builder/`" — but `scripts/lib/markdown-files.mjs` imports only `node:fs`/`node:path`, zero dependency on `builder/`, so the stated reason does not justify skipping it. Cost: currently harmless — the call is scoped to `docs/Reference/`, which never contains an output tree. Fix in place: use `markdownFiles` from `scripts/lib/markdown-files.mjs`. Verify by: identical file lists. Size: S. Verified: confirmed (V2).

#### A10-4 — R2, dead
**A schema module is imported by nothing and has drifted from the inline schemas actually in use.** Where: `wisdom/extract/schemas.mjs` (zero importers repo-wide) vs. `workflow.mjs:49` (`thread_path`, not `schemas.mjs`'s `source_thread`) and `workflow.mjs:77` (`section` as an enum, not `schemas.mjs`'s free-text string). Recorded reason: none. Cost: none live; would mislead if ever revived. Fix in place: delete `schemas.mjs`, or bring it into line with `workflow.mjs` and connect it. Verify by: grep for importers = 0, before deleting. Size: S. Verified: confirmed, both divergences confirmed by direct comparison (V2).

#### A10-5 — R2, conv
**Two wisdom state files are written non-atomically, with no parse guard on load, next to a sibling that is explicitly commented as doing both correctly.** Where: `wisdom/discord/messages.mjs:10-12` `saveManifest` (plain `writeFileSync`), `wisdom/wisdom.mjs:146` (same); `loadManifest` has no try/catch around its `JSON.parse`. Contrast `wisdom/extract/state.mjs:62-75`, explicitly commented "write state atomically (temp file + rename)" and doing exactly that. Recorded reason: none for the inconsistency. Cost: an interrupted write can corrupt `manifest.json`/`denied.json`, and a corrupt file crashes the next load with no diagnostic. Fix in place: the same temp-and-rename pattern, applied to both. Verify by: an interrupted-write simulation leaves the previous file intact. Size: S. Verified: confirmed (V2).

#### A10-6 — R2, struct
**Two parallel implementations have 19 byte-identical self-test names in the same order, and nothing runs either self-test suite.** Where: `impexp.mjs` and `impexp.py`, 19 `test(...)` calls each, confirmed byte-identical in name and order. Recorded reason: `Tools.md:958` states, unhedged, "the two editions print the same output and write byte-identical project files," with nothing mechanical behind the claim. Cost: real engineering discipline (keeping the two ports in lock-step) with no automated backstop at all. Fix in place: `check_impexp_parity.mjs`, run from `test.bat`. Verify by: the parity check itself, against a deliberately diverged copy. Size: M. Verified: confirmed (V2). See Decisions for you (b) — this fix makes `test.bat` and CI depend on Python.

#### L1-5 — R2, dead
**A script still tolerates unknown flags "passed through via `check.bat`'s `%*`," and `check.bat` no longer calls it at all.** Where: `check_links.mjs:307-314,406-412`; `check.bat` (read in full) never calls `check_links.mjs` — link and integrity checking moved into `build.bat`. Recorded reason: stale — corroborated independently by `PLAN-checks.md:14`. Cost: dead tolerance code, easy to mistake for a live contract. Fix in place: delete the stale tolerance and its comment. Verify by: `check_links.mjs`'s own tests unaffected. Size: S. Verified: confirmed (V2).

#### L1-6 — R2, conv
**`--help` is handled four different ways across 36 entry points, and one of the four gaps has a live filesystem side effect.** Where: stdout/exit 0; stderr/exit 0 (`pick_a11y_sample`, `sweep_a11y`); stderr/exit 2 via the general usage-error path (`tbbuild`, `tbrun`, `addin_test`); unhandled in 12 tools. `gen_attribute_probes.mjs:1147-1158` takes a bare `--help` as its `out_dir` argument and actually creates a `--help/Sources` directory on disk — traced, not just "fails to print help." `render-book.mjs:210-220` rejects `--help` as an unknown argument (exit 2) and never reaches its own usage text. Recorded reason: none. Cost: the first command a confused user types against `gen_attribute_probes.mjs` writes to disk. Fix in place: the shared `printHelpAndExit()` in the cli.mjs module. Verify by: `--help` on every tool now prints usage and exits 0, with no side effect. Size: M. Verified: confirmed, the `gen_attribute_probes.mjs` side effect independently confirmed as a live write (V2).

#### L1-7 — R2, conv
**Unknown-flag handling is five-way inconsistent.** Where: ignore (11 tools), warn (`check_links`), exit 2 (8 tools), throw → exit 1 or 2, exit 1 (wisdom). Recorded reason: none. Cost: the same mistake produces a different outcome depending on which tool it's made against. Fix in place: the shared cli.mjs module's strict-mode handling, one behaviour for all. Verify by: each tool's current, intentional exceptions preserved explicitly. Size: M. Verified: not re-verified — outside the set of citations the verifiers covered.

#### L1-8 — R2, conv
**`--json` means a boolean-to-stdout flag in four tools and a value-taking output file in a fifth.** Where: `tbbuild`, `tbrun`, `check_examples`, `census_attributes` (boolean) vs. `check_a11y_fingerprint` (takes a path). Recorded reason: none. Cost: the same flag name means something different depending on the tool. Fix in place: document the two shapes explicitly in the cli.mjs spec, or rename one. Verify by: `Tools.md`'s CLI tables, checked against real behaviour. Size: S. Verified: not re-verified — outside the set of citations the verifiers covered.

#### L1-13 — R2, struct
**Nothing tests any tool's own argument handling, anywhere in the repository — the missing seam that let L1-1, L1-2, L1-3 and L1-6 ship.** Where: every `--self-test`/`selfTest` in the repo (`check_code_regions.mjs`, `check_gate_lists.mjs`, `check_links.mjs`/`check_links_diff.mjs`, `check_regex_safety.mjs`, `impexp.mjs`) asserts domain logic, never argv parsing; no dedicated CLI test file exists anywhere. Recorded reason: none. Cost: demonstrated positively — four real, currently shipping argv defects a minimal parser test would have caught. Fix in place: the shared cli.mjs module has its own ride-along self-test in `test.bat`. Verify by: the self-test itself, plus regression coverage for L1-1/L1-2/L1-3/L1-6. Size: M. Verified: confirmed (V2).

#### L2-5 — R2, dup
**A repository-root path is derived inline in 19 files, by roughly five distinct expressions, and the one place that names a convention for it overstates how widely that convention is actually followed.** Where: 19 files confirmed exactly (`census_attributes`, `tbdocs`, `build_corpus`, `nav_hops`, `run_case`, `site_search`, `addin_test`, `build_dot_metrics`, `build_package_api`, `check_code_regions`, `check_dot_fit`, `check_examples`, `check_gate_lists`, `check_links_diff`, `check_tree_fresh`, `convert_em_dash_separators`, `gen_attribute_probes`, `wisdom/extract/prep.mjs`, `builder/write.mjs`); `axe-scan.mjs:29` exports `REPO_ROOT`, imported by only 2 of the 19. Recorded reason: `Extending.md:654` states a convention ("nearly all of them do" a specific expression), but only 3 of the 19 actually use that exact expression — the nested-`dirname` shape is the majority, 10 of 19. Cost: a change to the repository layout must be traced through five different idioms. Fix in place: `scripts/lib/repo-paths.mjs`, re-exported by `axe-scan.mjs`; correct `Extending.md:654`. Verify by: every derived root byte-identical before/after. Size: M. Verified: corrected (V2) — count of distinct expressions raised from four to roughly five.

#### L3-2 — R2, dup
**One spawn call has no `'error'` handler and awaits `'exit'` rather than `'close'`, and a failure there skips the registry-restore step that exists to guard against exactly this.** Where: `check_examples.mjs:601-612` `buildStaged` (spawn at `:608`, `'exit'` at `:612`); a spawn `'error'` with no listener is an uncaught exception at the emitter's own emit point, not a promise rejection, so it bypasses both `main()`'s local `catch` (`:1678-1680`) and `main().catch` (`:1810`) — neither is in its call stack, and no `uncaughtException` handler exists anywhere in the file. Two siblings (`addin_test.mjs:180,185`, `check_regex_safety.mjs:347-348`) register both events. Recorded reason: none. Cost: a spawn failure (a bad `execPath`, for instance) leaves the tbIDE registry unrestored — the exact hazard `tb-registry.mjs`'s tidy machinery exists to prevent. Fix in place: register both `'error'` and `'close'`, matching the two siblings. Verify by: a deliberately unspawnable command still restores the registry. Size: S. Verified: confirmed (V4).

#### L4-3 — R2, dup
**Two vendoring functions each independently re-implement the same fetch-with-fallback-and-atomic-write sequence.** Where: `vendor-assets.mjs:222-252` `fetchToFile` and `:279-319` `fetchAttachment`; both wrap `fetch()` in try/catch, check `res.ok`, wrap `arrayBuffer()` in a second try/catch, then use the identical `` `${destPath}.tmp-${pid}-${Date.now()}` `` temp-and-rename idiom (confirmed byte-identical). Recorded reason: none for the shared half; the two functions' validation logic legitimately differs (content-type checking differs between them, tracked separately in the previous review). Cost: a fix to the atomic-write idiom must be applied twice. Fix in place: one shared `fetchWithFallback`/`atomicWrite` pair, called from both. Verify by: tree comparison (vendored assets unchanged). Size: S. Verified: confirmed (V1).

### Tier 3 — local untidiness

| ID(s) | Kind | Statement | Where | Verified |
|---|---|---|---|---|
| A1-7 | dead | `cpu-worker.mjs:510` writes the literal `4` (FAILED status); nothing anywhere reads it. | `builder/cpu-worker.mjs:510` | Not re-verified. |
| A1-8 | struct | `tbdocs.mjs`'s own argument parser is not exported and has no test. | `builder/tbdocs.mjs:91-194` | Not re-verified. |
| A2-8 | dup | `replaceAll("\\","/")` inline at 10 sites; two more files each keep a private `posix()`. | `offline-rewrite.mjs:34,39,44,219,226`; `offline.mjs:133,311,370,375,380`; `publish-policy.mjs:189`; `check-tree.mjs:46` (recorded) | Not re-verified. |
| A3-4 / A2-5 / A3-5 / A4-1 (L4-8 cluster) | dup | Four small leaf helpers — `isNonEmpty`, `encodeSpaces`, `splitFragment`, `statSafe` — are each duplicated once, three of them byte-identical, `encodeSpaces` a different idiom with the same behaviour. `makeTimer`, the fifth member of this cluster, is the substantial one and is covered as **A1-4** in Tier 2. | `nav.mjs:338` / `seo.mjs:164`; `search.mjs:204` / `template.mjs:925`; `render.mjs:1593` / `crawl_check.mjs:51`; `link-check.mjs:455-457` / `check_links.mjs:151-153` | Confirmed, all four (V1, V2). |
| A3-8 | dup | Three near-identical palette-building loops in one file. | `highlight-theme.mjs:336-344,351-359,364-372` | Not re-verified. |
| A3-9 | dead | `precomputeSeo` has zero callers. | `seo.mjs:90-94` | Not re-verified. |
| A3-10 | dead | `kramdownSlug` is exported but used only inside its own module. | `render.mjs:1352` | Not re-verified. |
| A5-4 (= L4-9 part 2) | dup | `pad`/`median` are byte-identical in two scripts. | `pick_a11y_sample.mjs:229-232,259`; `sweep_a11y.mjs:279-283` | Confirmed, byte-identical (V2). |
| A6-5 | conv | `serve.bat` does not propagate its child process's exit code. | `serve.bat` | Not re-verified. |
| A7-6 | conv | A comment says `tbrun`'s snapshot uses `-EncodedCommand`; the code uses `-Command` (safe today — a fixed literal). | `tb-registry.mjs:49-50` vs. `tbrun.mjs:376` | Not re-verified. |
| A7-7 | dup | A 180-second compile timeout is a literal, repeated at 7 sites in 4 files. | across `scripts/lib/tb-*` and the three harness CLIs | Not re-verified. |
| A7-9 | struct | `tbbuild`'s shutdown skips its tidy step when the IDE handle was never set; safe only by an invariant in `tb-launch.ps1`. | `tbbuild.mjs` shutdown path | Not re-verified. |
| A8-3 | dup | The fence unit key is computed twice in the same file. | `check_examples.mjs:424` (`makeBatches`), `:675` (`unitsOf`) | Not re-verified. |
| A9-4 | dup — **Resolved in `90624841`** | `_writeUint`/`_digitCount` duplicated between two shims, both since deleted. | (deleted) `fast-refs.mjs`, `fast-refs-class.mjs` | Moot; not separately re-verified. |
| A9-5 | dup | The `createRequire` + `require('pdf-lib/cjs/...').default` block is repeated in 12 files (corrected from an estimated ~15); 3 of the 12 were among the shims deleted in `90624841`, leaving 9 in production. | `book/lib/fast-*.mjs` (list in [`REVIEW-TOOLING-fe9ce12b/V3.md`](REVIEW-TOOLING-fe9ce12b/V3.md)) | Corrected (V3). |
| A9-9 | dead — **Resolved in `90624841`** | A comment cited a file moved in `4c36c8d6`; the citing file has since been deleted entirely. | (deleted) `fast-dict-array.mjs:9` | Moot; not separately re-verified. |
| A10-1 | conv | Four `eval/` scripts each parse arguments differently; one exits 1 on a bare `--help`. | `eval/*.mjs`, incl. `transcript.mjs:190-198` | Not re-verified. |
| L1-9 | conv | `--src` means the docs root in some tools and the exported package tree in others. | `tbdocs`, `check_publish_policy` vs. `census_attributes`, `build_package_api` | Not re-verified. |
| L1-10 | conv | `--name=value` form works only in `tbdocs`, and not for two of its own flags. | `builder/tbdocs.mjs` | Not re-verified. |
| L1-12 | dup | "Usage text; exit code follows whether help was asked" is repeated six times across `eval/` and wisdom. | `eval/`, `wisdom/` | Not re-verified. |
| L2-6 | conv | A scratch directory is not removed in a `finally` in two scripts; four others do this correctly (corrected from "three"). | `check_publish_policy.mjs:152-189`, `check_links_diff.mjs:651-750` (wrong); `check_links.mjs`, `impexp.mjs`, `check_page_baseline.mjs`/`check_symbol_index.mjs`'s `withBaseline` (right) | Corrected (V2). |
| L2-7 | dup | Three small tree walkers, not proposed as a fix. | `offline.mjs:401-416,608-626`; `write.mjs:281-299` | Not re-verified. |
| L3-6 | conv | Two `spawnSync` calls throw unguarded; the resulting stack trace reaches the terminal at the wrong exit code and without the tool's own `error:` convention. | `check_links_diff.mjs`: `fusedBuild` (`:426,432`), `ensureBasePathTree` (`:518,525`) | Confirmed — fails loudly, just inconsistently (V4). |
| L4-2 | dup | Two SCSS-compiling functions share the same body. | `scss.mjs:65-76,78-89` (`compileLightScss`/`compileDarkScss`) | Not re-verified. |

---

## Split candidates

Per decision 2, these are candidates for a later, separate pass — not proposed as fixes here.

- **`builder/render.mjs`** — strongest evidence. The image-renderer rule order matters and is silent about it (`svgInlinePlugin` at `:518` must run before `remoteImagePlugin` at `:520`; swapping them reverses the behaviour with no error); the ellipsis plugin assumes the dashes plugin already ran (`:515`/`:516`); shared helpers thread through every plugin registered on the instance; no plugin is tested in isolation; anchors reference third-party rule names directly (`"curly_attributes"`). Separately, its two fence/code-span parsers (**A3-1**) sit 1,550 lines apart with no cross-reference to each other.
- **`builder/tbdocs.mjs`** — the `TASKS` literal fuses DAG topology with task bodies across 61% of the file (`:260-1257`); `dispatch`'s `submit()` is SAB machinery (`:788-911`); check glue (`:1085-1256`); Gantt/timing logic (`:1268-1403`) belongs beside `gantt.mjs` — **A1-1** is the visible cost of it not being there; the console report (`:1478-1525`); exit policy scattered across the file (**A1-6**).
- **`scripts/check_examples.mjs`** — eight distinguishable jobs in one file: templates (`:125-193`), selection (`:201-378`), batching (`:380-506`), staging (`:508-568`), orchestration (`:570-655,928-949`), bisection (`:657-927`, 270 lines across 14 functions), diagnostic mapping inside `buildStaged` (`:643-653`), and three report modes threaded through as booleans — plus a 425-line probe suite (`:1157-1581`) that is itself a candidate on its own. `gen_attribute_probes.mjs` is explicitly **not** a candidate: 47% of that file is its own exploratory data table, not logic.
- **`builder/book.mjs`** — a resolver (§A), `book.html` assembly (§B–F, including `rewriteBookHrefs`), and a coverage checker (§G) are already three separable concerns; `pdf.mjs` already imports all three as if they were separate modules.
- **`builder/template.mjs`** — weaker evidence. Its `navActivationCss` deferral trigger, named in `PLAN-4.md` §3, is close to being met, which would remove part of the case for splitting it; **A3-7**'s finding (a date formatter, URL helpers, and an escape-helper block, all beyond templating) stands independent of whether the file is ever split.
- **`scripts/lib/tb-ide.mjs`** — console reading and add-in introspection are separable from the coupled build-state core.
- **`scripts/lib/axe-scan.mjs`** — **not proposed.** It has a single-source property the review found worth protecting rather than splitting: any split would have to re-export everything through one module anyway, so a split would add a layer without removing one.

---

## Verified sound

**Build orchestration.** Small modules elsewhere in `builder/`; the SAB layout (174,100 bytes) matches `Builder.md`; `HANDLERS` key sets match across the scheduler and the workers; SAB constants are imported by name everywhere except **A1-7**; the barrier invariant holds; `--dry-run` and `--profile-offline` are both live and `Tools.md`'s flag table matches 20 of 20; the stall watchdog matches `WIP.Build.md`.

**Output stages.** The `offline.mjs`/`offline-rewrite.mjs` split is a recorded, deliberate one; `HTML_COMBINED_RE` follows the code-guard shape; `deriveOfflineJtdJs` uses a real parser (`acorn`), not a regex; `vendor-assets.mjs` is contained and guarded; `symbols.mjs` is not a `.twin` scanner (a common misreading); `substitute()`/`decode()` name collisions across files are coincidental, not duplicated logic; the publish-allowlist's own disjointness self-test passes; the gates run clean today (publish 6/6, page-baseline 11/11, symbol-index 46/46).

**The Markdown dialect.** `nav.mjs`; the table and fence fix-ups operate on single, already-known tokens; token-traversing `md.core` plugins are immune to the class of bug the rewrite-site theme describes, because they consult markdown-it's own parsed structure rather than re-deriving it; `html_block`-scoped rewrites are correctly scoped; `template.mjs` reuses `seo.mjs`'s `stripHtml` rather than a third copy; `clampContrast` fails loudly rather than silently; `VOID_TAGS_RE` is properly gated.

**Link checker.** `check.mjs`, `check_links.mjs` and `check_links_diff.mjs` are coherent as three files, with no split candidate among them.

**Accessibility and diagram gates.** The axe patch (`SOURCE_PATCHES`) earns the review's model status for a workaround — see Themes; the dot-metrics WASM patch passes emphatically (signature match, a read-back check, a real layout check, a `WeakSet` guard); `check_tree_fresh.mjs` correctly uses `isOutputTree`; the `FAMILIES` table is data, not logic that needs factoring; `check_a11y.mjs`'s mutual-exclusion handling is correct.

**Gates as a system.** `check_gate_lists.mjs` is exemplary (18 probes); `check_publish_policy.mjs`'s check is bidirectional; `check_regex_safety.mjs` and `scripts/lib/regex-fold.mjs` are the strongest pair in the gate roster; `check_code_regions.mjs` and `scripts/lib/markdown-files.mjs` are strong; `convert_em_dash_separators.mjs` correctly uses the shared walker and preserves line endings; the exit convention is followed everywhere except **A5-2**/**A6-3**; the `.bat` idiom is deliberate and cross-referenced; the workflow files' own comments point at their source rather than restate it.

**The compiler harness.** A strict DAG with no cycles; `tb-registry.mjs` is imported only by the three CLIs that need it; `stageProject` is genuinely shared; the `laneProjectId` allocator is correct; `check_tb_registry.mjs` has its own independent fixtures; every PowerShell payload is a fixed literal, with real data passed through the environment or stdin, never interpolated into the script text; the job-object-plus-suspended-kill path is sound; retry loops are recorded and fail loudly rather than silently.

**Samples and the package API.** The `serialize`/`strip`/`kindOf` name collisions across files are coincidental, not duplicated logic; `symbols.mjs` is not a `.twin` scanner; `tb-fences.mjs` is tested, indirectly, through `check_examples.mjs`'s 74-probe `runProbes` suite.

**The book pipeline.** `book.bat` is correct; `render-book.mjs`'s 13-shim import list is internally consistent; every shim's `__xInstalled` guard works as intended; the paged.js fork's divergence from upstream is fully recorded (20 `[PATCH]` tag families across 52 sites, in `Fixes-PagedJS.md`); `pdf.mjs`'s `IMG_SRC_RE` follows the code-guard rule; `outline.mjs` and `postprocesser.mjs` are attributed, unmodified ports of `pagedjs-cli` and should be treated as vendored code, not first-party tooling.

**Smaller tools.** The site's own client-side JavaScript is a set of self-contained IIFEs, with no shared state between them; `svg-inline.js` does not duplicate `svgInlinePlugin` — one is markup-time, the other runtime; `build_fonts.py` matches what `WIP.Fonts.md` describes; the evaluator's process-isolation design is deliberate and sound; `wisdom/extract/merger.mjs` and the wisdom API's pagination are both fine apart from **L3-3**.

**Paths, configuration, dependencies.** Exactly three real YAML parse sites exist (`tbdocs.mjs:271`, `check_publish_policy.mjs:69`, `data.mjs:12`), each loaded once per build; `check_publish_policy.mjs`'s cwd-relative `SRC` is a recorded, deliberate choice (`Extending.md:654`); atomic temp-and-rename writes are used correctly wherever they are used; `tbrun`'s per-port scratch-directory cleanup at the next start is deliberate; only `picocolors` and `pako` are undeclared dependencies; the lockfile and `npm ci` are used correctly throughout.

**Browsers, processes, text rewrites.** The four puppeteer launches are consistent wherever consistency matters; `--allow-file-access-from-files` is needed wherever a page `fetch()`es a sibling `file://` resource; child processes never use `shell:true`, always pass array arguments, are killed by pid (never by image name), and the one stdin hazard the harness had was fixed once, centrally, in `runCompiler`; PowerShell payloads pass data through the environment or stdin, never interpolated; cleanup is disciplined across `tb-lane`, `tb-addin`, `addin_test.mjs` (on `SIGINT`), the add-in tests' own `after()` hooks, and `check_tb_registry.mjs`; `runShard` is the model worth following elsewhere; `check_links.mjs`'s worker dispatch and `worker-pool.mjs` are both sound. On text: `applyPreRenderRewrites` correctly brackets its four rewrites between mask and restore; token-scoped `md.core` rules are a third sound mechanism that `WIP.Build.md` does not currently name (a documentation gap, not a code one); `HTML_COMBINED_RE` and `IMG_SRC_RE` both follow the documented guard shape; every other unguarded rewrite in the tree targets build-generated markers, not author content.

---

## Where the passes were wrong

The verification step exists because a pass's first read is not always the last word. These are the specific corrections that changed a finding's severity, its impact, or its standing:

- **A4-3's severity.** First filed as R2 with a count of "20" attribute-tag pairs. The verifier found the build checker's table actually has 21 tags and 26 pairs, and — more importantly — that the gap between it and `crawl_check.mjs`'s own five-pair table is not merely a risk: it already causes the only post-release checker to miss seven kinds of link on the live site. Raised to R1.
- **A8-1's impact.** The pass reported a live misclassification of `Overridable`-attributed members. The orchestrator traced it against the real BETA 983 package cache and found zero attributed `Overridable` members exist there today — the keyword-list divergence is real and already diverged (satisfying R1 on its own terms), but its specific claimed consequence is dormant, not live.
- **The inventory's staging.md claim.** The markdown inventory reported "live, on-disk section corruption" in the committed `staging.md`, with a specific claimed mis-pairing of metadata between two named sections. Running the real `parseStaging` against the real file, the orchestrator found the named section (`Len.md · after-remarks`) has exactly the metadata beneath it on disk, correctly; the heading's own "see also thread" text, which lists other duplicate sections, is what misled the inventory's read. **Not confirmed.** What is real, and confirmed, is a narrower defect: a two-line content slip at `staging.md:14245-14246`, missing the blockquote continuation marker, which would render as a broken admonition and a runaway code fence if that section is ever grafted into `Len.md`. See Decisions for you (f).
- **A7-1's count.** The orchestrator, reading the two patterns, first reported that tbrun's regex matches 2 of the 5 documented failure shapes. The verifier ran both regexes against all five shapes and found it actually matches 3 of 5 — `tbrun`'s case-insensitive flag catches both listed casings of the BUILD shape. The two shapes it misses, and the resulting false-success consequence, are unchanged.
- **Corrected counts**, none changing a verdict's direction but each changing a specific number the finding cites: **A5-1** (7 scripts → 8, `check_tree_fresh.mjs` added); **A7-3** ("used by every scenario" → used directly in 4 of 10 test files); **A7-4** (9 imports → 10); **A8-2** (the ten-item citation list had one wrong entry and two missing; corrected to 11 strict-path / 13 bare-filename citations); **A9-5** (~15 files → 12, 3 of which were later deleted in `90624841`); **L2-5** ("four expressions" → confirmed 19 files, closer to five distinct AST shapes); **L2-6** ("three siblings do it right" → four).
- **L4's classification of `findingsFor`/`buildFindings`.** L4 read the parallel-shape comments in `check.mjs` and `check_links.mjs` as a deliberate, still-valid design (mirrored on purpose so `check_links_diff.mjs` can cross-check two independent implementations) and declined to flag it. That reading was correct when the comments were written. It is superseded by the user's own 2026-09-25 decision to make `check_links.mjs` a thin wrapper over `builder/check.mjs` (decision 5): after that refactor, one implementation sits behind two front ends, not two independent ones, and both comments need to be rewritten to say so.
- **L4's acceptance of `book.mjs`'s "plugins are independent."** L4 accepted the recorded reason for `book.mjs`'s private copy of `normalizeBaseurl`/`escapeRegExpBook` at face value. The reason describes the old Ruby/Jekyll plugin architecture, where `book-href-rewrite.rb` and `offlinify.rb` had no shared-code mechanism between them. That premise expired at the Node cutover — `book.mjs` already imports two sibling `builder/` modules for other things — and A9-8's reading is the one this document adopts.
- **L3's "sound" verdict on the three whole-page HTML rewrites.** L3 called `padEmptyCells`, `normaliseVoidTags` and `injectAnchorHeadings` sound, reasoning that every code path escapes `&<>` before they run. Traced against all four ways text can end up inside `<code>`/`<pre>`, that is true for three of the four and false for the fourth (raw, hand-authored HTML). Both readings are partly right; **A3-6** stands as filed, at R2, because the fourth path is real even though nothing in the current corpus triggers it.

---

## Decisions for you

**Decided on 2026-09-25: all seven as recommended.** The one question left open inside them is (b)'s local behaviour, settled when that gate is written.

**(a) The shared markdown module — home, scope, and migration order.**
Home: a new top-level `lib/` directory, sibling to `builder/`, `scripts/`, `wisdom/` and `eval/`. `builder/render.mjs:383`'s own comment rules out `scripts/lib/`, since `builder/` is a required consumer and must not depend on `scripts/`; `wisdom/`'s stated reason for its own private parser (`PLAN-3.md:404`, "no dependency on `builder/`") also rules out putting the module inside `builder/`. Scope: markdown-it block regions (fence/`code_block`/`html_block`, with `.map` line ranges) plus one tested inline-code-span splitter plus a frontmatter splitter built on `js-yaml` 4 directly, dropping `gray-matter` (and its bundled `js-yaml` 3) entirely. Migration order: the five rewrite sites first (`render.mjs`'s two, `convert_em_dash_separators.mjs`, `check_examples.mjs`'s marker splice, which is already close, and wisdom's `parseStaging`/`serializeStaging`), since a wrong region there can corrupt committed content; the ten read-only scan sites after, since their failure mode is under- or over-counting, not corruption.
*Recommendation:* a new top-level `lib/`, with the inventory's API sketch (`blockRegions`, `maskCode`, `splitCodeSpans`, `splitOnMarker`, `parseFrontmatter`) as the starting point. The sketch was built by testing the real markdown-it instance against the real corpus, not from the sites' existing behaviour. The oracle for moving each rewriter onto it is the byte comparison of the built trees; for dropping `gray-matter`, every page's parsed frontmatter compared both ways.

**(b) A parity gate for `impexp.mjs`/`impexp.py`.**
**A10-6** found the two ports keep 19 byte-identical self-test names with nothing running either suite. Adding `check_impexp_parity.mjs` to `test.bat` closes that, but it is the first gate that would make `test.bat`, and both CI workflows, depend on a Python interpreter being present.
*Recommendation:* add it, and run it unconditionally in CI, whose runners have Python. The discipline behind the parity is already real (the two test suites are kept in step by hand, and `Tools.md` promises byte-identical output); a gate only formalises a check the project already believes it needs. The part to decide is local: whether `test.bat` should require Python, or report this one gate as skipped, loudly, when no interpreter is found. `build_fonts.py` already requires Python, but only for someone regenerating fonts; nothing in the routine local loop does today.

**(c) The pdf-lib shims — guard, or record the pin as the only guard.**
**A9-1**/**A9-2**: either add load-time shape assertions per shim plus an equivalence test against stock pdf-lib (modelled on `check_axe_patch_equiv.mjs`), or explicitly record that the exact version pin is the only guard this workaround will ever have, given upstream pdf-lib is abandoned and the `@cantoo` fork was evaluated and rejected.
*Recommendation:* add the assertions. The pin only protects against an accidental `npm update`; it does nothing for a deliberate, intentional bump to a newer pdf-lib release, or for a future contributor's mistaken hand-edit to a shim file. Both are realistic over the tool's lifetime, and the axe patch shows the cost of the guard is small once one example exists to copy.

**(d) A composite CI action as a follow-on to the roster gate.**
**A6-4**'s design proposes `.github/actions/run-gates` after the CI-roster gate is in place (decision 6), not as a reusable workflow — a separate job would lose the built trees the deploy job needs.
*Recommendation:* proceed in that order. Building the roster gate first gives the composite action something to check itself against; building the action first would let it and the gate drift from each other before either is proven.

**(e) The command-line convention Phase 3 should converge on.**
`impexp.mjs`'s own discipline (a verb `Map`, an `EXIT` object, `usageError()`) is the best-disciplined CLI in the repository today and is the model **L1** names.
*Recommendation:* for Phase 3, converge on that discipline: `--help` prints usage to stdout and exits 0; an unknown flag or a bad value prints to stderr and exits 2; each tool names its exit codes in one table. For Phase 2, which must change no behaviour, build the shared `scripts/lib/cli.mjs` module L1 specified — `parseCli()` over `node:util` `parseArgs` (strict, `allowPositionals`, tokens) with camelCase aliases and positional-count checks; `withUsageError()` preserving each tool's current message, stream and exit code; `numberOption()` closing the `NaN` hole; `printHelpAndExit()` preserving each tool's current `--help` text until Phase 3 actually changes it. Migrate `tbdocs.mjs` last — its cross-flag ordering (`--no-check` resets other flags) needs a scan over the parsed tokens, not a simple options object. Migrate wisdom last, or not at all — its subcommand shape needs custom code the shared module does not cover.

**(f) The `staging.md` content slip.**
The one confirmed, real defect in the committed data itself: `wisdom/data/findings/staging.md:14245-14246` is missing a blockquote continuation marker on a fenced sample's content line.
*Recommendation:* fix the data now, independent of the tooling fix in (a): add the missing `> ` to lines 14245 and 14246. It is a two-line editorial correction to a file reviewers already edit by hand, and there is no reason to wait for the shared parser before correcting it.

**(g) State the dependency-pinning policy, and fix `Builder.md`'s stale Dependencies section.**
`Builder.md`'s "Dependencies" section omits `recheck` entirely, states `wasm-graphviz` as `^1.21` when it is `^1.29.1`, and says `axe-core` is the only exact pin when four packages are pinned exactly. This is a repeat of a drift the previous review already fixed once, in `74b3395`.
*Recommendation:* fix the section, and add one sentence stating the policy itself — exact pin when the code patches the dependency's internals or depends on undocumented behaviour, caret otherwise — so a future caret on an output-changing dependency reads as a decision rather than an oversight.

Not re-opened here, because each was already decided by the owner before or during the review: the link-checker architecture (`check_links.mjs` stays a thin wrapper over `builder/check.mjs`, decision 5); `perf/`'s scope (nothing moves out, `detach-pages.js` documented in place, decision 1 as amended); the four superseded pdf-lib shims (deleted in `90624841`); formatting as the last phase (decision 4, Phase 6); and working directly on `staging` with no PR branch.

---

## Appendix

### Baseline survey

Taken at `fe9ce12b` with `scripts/survey_tooling.mjs` (a token-level clone detector — identifiers and literals normalised, 60-token windows — plus an import graph over 185 first-party JavaScript files, `perf/` included, vendored code excluded):

| Measure | At `fe9ce12b` | After the shim deletion (`90624841`) |
|---|---|---|
| Clone regions of 60+ tokens | 680, of which 318 outside `perf/` | 571, of which 266 outside `perf/` |
| Top-level function names defined in 2+ files | 77, of which 57 outside `perf/` | 74, of which 54 outside `perf/` |
| Command-line tools outside `perf/` reading `process.argv` | 32, none using `node:util` `parseArgs` | (unchanged by the deletion) |
| Tools with a private copy of `flag`/`opt`/`die` | 6, with `opt` in three different versions | (unchanged by the deletion) |
| Packages imported but not declared | 2: `picocolors`, `pako` | (unchanged by the deletion) |
| Clone regions by pair of areas (`builder`/`scripts`, `scripts`/`scripts`, `builder`/`builder`) | 55, 95, 39 | (not re-measured) |

Observed by hand at `fe9ce12b`: 5 places state which gates run (three `.bat` files, two workflows) plus `Tools.md`; no lint or format tooling exists; line endings are LF in the repository but CRLF in 118 of 140 working-tree files under `core.autocrlf=true`, with no `.gitattributes`; quote style is double in `builder/`, `scripts/`, `test/`, `eval/` and single in `book/`, `wisdom/`, `perf/`.

The drop in clone regions and repeated function names between the two columns reflects the four pdf-lib shims deleted during the review. Apart from the three findings that deletion resolved, none of this document's fixes has been made yet.

### Finding counts, merged, by tier and kind

Counts are of merged findings (one row per finding as presented above), not of raw pass-level citations; a finding with a compound kind label (for example "dup/hack") is counted under its first-listed kind.

| Tier | dup | hack | struct | conv | dead | Total |
|---|---|---|---|---|---|---|
| Tier 1 (R1) | 16 | 3 | 1 | 0 | 0 | 20 |
| Tier 2 (R2) | 19 | 2 | 9 | 8 | 5 | 43 |
| Tier 3 (R3) | 11 | 0 | 2 | 7 | 4 | 24 |
| **Total** | **46** | **5** | **12** | **15** | **9** | **87** |

Eighty-seven merged findings account for 109 raw finding IDs across the fourteen passes; the difference is the roughly twenty IDs the ledger's explicit MERGE and `=` directives fold into another finding. Three findings (**A9-4**, **A9-6**, **A9-9**) are resolved, in `90624841`, ahead of the fix phases the rest of this document's findings still await.
