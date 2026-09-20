# Documentation review of `c9f2dfe0..HEAD`

78 commits · 158 files · +18,478 / −1,999 · branch `staging` at `a9d7638` · reviewed 2026-09-20

Scope: **developer documentation only** — does the prose still describe the code? Content
pages under `docs/Reference/` and `docs/Features/` were not reviewed except where a
maintainer-facing claim pointed at one.

This is the documentation-side companion to
[REVIEW-c9f2dfe0-1b6922b.md](REVIEW-c9f2dfe0-1b6922b.md), which reviewed the code over the
first 38 commits of the same range and whose Tier 4 was actioned in `9f6c38f`. Several
findings below are **survivors of that pass** — items it listed, or items whose sibling copy
it fixed while leaving another. Those are marked `→ 9f6c38f survivor`.

## Verdict

**The private notes kept up; the published documentation did not.** Across the range:

| Surface | Net change |
|---|---:|
| Code (`builder/`, `scripts/`, `perf/`) | **+9,726 / −1,176** |
| In-tree plans and reviews (`builder/*.md`) | +4,453 / −75 |
| Maintainer guide (`WIP.md`) | +631 / −5 |
| **Published developer docs (`docs/Documentation/`)** | **+344 / −24** |

Of those 344 lines, 207 are the new contributor-facing `Authoring.md`. The *builder*
documentation — the pages a person modifying the pipeline reads — received **≈137 net
lines against ≈9,700 lines of code**.

The sharpest single measurement: **`Pipeline-Stages.md` received `+3 / −2` lines.** It is
advertised by both `Builder.md:24` and `index.md:33` as the *"complete interface
reference"*. In the same range the task graph gained four tasks and five modules. All three
of its edits were incidental touches from commits doing something else; it never received a
structural update.

Three failure modes account for nearly everything found:

1. **Two pages state a scheduler rule backwards**, in the two places someone adding a task
   would look.
2. **The check subsystem — the range's headline change — is absent** from the published
   architecture pages, while `build.bat` runs it on every invocation.
3. **A tutorial teaches a pattern the range deliberately banned.**

### Two things found while applying the amendments

Neither is documentation drift. Both were turned up by running the gates while verifying
the doc edits, and both are recorded here because nothing else in the tree records them.

**A. [S1] The `fixture-built` CI gate was red on `staging`, and the cause is in this range.**
`checks.yml:127` runs
`check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused`.
It exited 1 at `a9d7638`, and identically at pristine `HEAD` with every edit of this pass
stashed --- so the range shipped it, not the amendments.

The two checker implementations *agreed perfectly*; what failed was the fixture's own
expectation. `58f9c6e` put two `<link rel="preload" href="/assets/fonts/…">` tags on every
page. `test/fixtures/check-src/` has no `assets/fonts/`, so each of its three pages gained
two broken links and the `broken` count went 3 → 9 against a hard-coded
`FIXTURE_BUILT_ONLINE.broken = 3`.

This is finding 13's invariant firing for real, and with a twist worth keeping: **you do
not have to touch the fixture to break it.** The fixture is built by the real `tbdocs`, so
any unconditional reference the page template gains lands in the fixture's pages too. The
three unpushed commits (`58f9c6e`, `6170e07`, `a9d7638`) are why CI had not yet reported it.

*Fixed* by adding the two stub `.woff2` files the template now expects, keeping `broken` at
its designed 3 rather than raising the expectation to 9 --- six accidental broken links
would dilute a category the fixture exists to hold at an exact number.

**B. [S1] The `AppGlobalClassObject` package publishes nothing, and leaks raw markdown.**
Not fixed --- it needs a decision. `docs/Reference/Built-In/AppGlobalClassObject/` holds 38
authored files and produces **zero** HTML pages. Two independent causes:

1. The 37 pages under `_App/` match `"**/_*/**"` in `_config.yml`'s `exclude:` --- the rule
   that exists to drop `_Images`, `_includes` and friends. The interface genuinely is named
   `_App` in twinBASIC (the COM hidden-interface convention), so the folder name and the
   build convention collide head-on.
2. `index.md` is the only file under `docs/` carrying a UTF-8 BOM. The BOM precedes the
   `---`, so the frontmatter never parses, `discover` classifies it as a **static file**,
   and **the raw markdown is copied verbatim to
   `_site/Reference/Built-In/AppGlobalClassObject/index.md`** and served as-is.

Verified by running `discover` directly: 0 pages, 1 static file. **Confirmed on the live
site**, not just in a local build:

| URL | Result |
|---|---|
| `docs.twinbasic.com/Reference/Built-In/AppGlobalClassObject/index.md` | **200** --- serves the raw markdown, YAML frontmatter and all (`title:`, `parent:`, `exclude_from_docs:`, `indexed_from: beta-x-0983`) as plain text |
| `docs.twinbasic.com/tB/Packages/AppGlobalClassObject/_App/Build` | **404** --- the permalink that page's own links point at does not exist |

So the package is simultaneously absent from the site at its intended URLs and present at
an unintended one, leaking internal frontmatter keys. **Fixing the BOM alone
turns the build red** --- `index.md` would become a page whose `_App/…` links resolve to
nothing --- so both halves must land together. The `_App/` half is the decision: rename the
folder, narrow the glob to `_Images` plus the known Jekyll directories, or add an explicit
include exception.

This also explains a symptom the review had already noted from the other end: finding 31
blamed `Packages.md` for why `AppGlobalClassObject` was never listed on the two landing
pages. The real reason is that it has never been on the site at all. The site-facing counts
were therefore *correct* as they stood, and the amendment pass left them alone.

### Provenance

Five area agents (site pages · `builder/PLAN-*.md` · `perf/` + script headers · CI + test
fixture · `WIP.md`) plus orchestrator verification. **Every finding reproduced below was
re-checked against source by the orchestrator before inclusion**; agent claims are not
relayed unverified. Corrections made to agent output are recorded inline. Working tree
clean throughout; no file was edited and nothing was committed.

Severity: **S1** — actively wrong guidance a maintainer would follow into a defect.
**S2** — a documented mechanism that does not exist, or exists and is undocumented.
**S3** — stale figures, internal contradictions, drift that would mislead but not misdirect.

---

## Tier 1 — actively wrong guidance

1. **[S1] Task priority is documented backwards, on both pages that teach it.**

   | Where | Says |
   |---|---|
   | `docs/Documentation/Extending.md:57` | "Lower-number priority claims first when multiple tasks are READY." |
   | `docs/Documentation/Pipeline-Stages.md:106` | "When multiple tasks are READY, lower priority numbers claim first." |

   `builder/sab-scheduler.mjs:314` — `if (pri > bestPri) { bestPri = pri; bestIdx = i; }`.
   **Higher** claims first. The surrounding comment says so ("the READY worker task with the
   highest priority value"), and real usage confirms it: `builder/tbdocs.mjs:723` gives
   `flush:i` `priority: 1` precisely so it outranks the default-`0` tasks.

   `Extending.md` is the "how to add a task" tutorial and `Pipeline-Stages.md` is the field
   reference. Someone scheduling new work reads one of the two, sets the number the wrong
   way, and gets a task that never wins a race it was written to win.
   *Fix:* "Higher-number priority claims first." on both lines.

2. **[S1] `Extending.md`'s worked example teaches the pattern `33624df` banned.**
   Worked Example B (`:229-238`) shows a `render:i` submit callback containing:

   ```js
   const p = state.pageByDest.get(r.destPath);
   if (!p) continue;
   ```

   `builder/tbdocs.mjs:771` now **throws** on exactly that condition, with a comment
   explaining why: "pageByDest is built from the same page list the chunks were sliced from,
   so a miss is a bug, not a condition to tolerate." That hardening (`33624df`, "refuse to
   continue when a chunk's result is missing, everywhere on the merge path") is one of the
   range's load-bearing fixes, and `WIP.md` states the rule for future contributors: *"on
   this path, 'the piece is missing' is a bug, not a case to handle."*

   The tutorial a person copies from still demonstrates the silent skip. This is the most
   consequential finding in the review: the documentation actively propagates the defect
   class the range spent commits eliminating.
   *Fix:* replace `if (!p) continue;` with the throw, and say why in one sentence.

3. **[S1] `renderJoin` is documented in its pre-bug state.**
   `Pipeline-Stages.md:329`:

   ```js
   renderJoin.expected = []   // depCount set to N by dispatch.submit
   ```

   This is precisely the condition `f177c28` fixed ("give renderJoin an expected list — a
   zero dep count did not mean the submits had run"). `registerBarrier()`
   (`builder/tbdocs.mjs:206-212`) now populates `expected` with every `render:i` name, and
   `tbdocs.mjs:190-196` carries a comment warning against the old shape. `WIP.md` opens its
   build-pipeline section with the same warning.

   A reader adding a fan-out from this page copies the exact construct that silently dropped
   ~6 pages from `search-data.json` on one build in three.
   *Fix:* show the populated `expected`, and cross-reference
   [PLAN-sab-pull-scheduler.md](PLAN-sab-pull-scheduler.md#a-dep-count-of-zero-does-not-mean-the-submits-have-run).

4. **[S2] `Tools.md:48` sends you to a workflow file that does not exist.**
   "to rename the PDF, update it in `book.bat` and in `.github/workflows/jekyll-gh-pages.yml`."
   `.github/workflows/` contains only `checks.yml` and `tbdocs-gh-pages.yml`; the rename
   happened in `cacb76e`. The live `-o` argument is `tbdocs-gh-pages.yml:120`. This is
   actionable instruction pointing at nothing. → `9f6c38f` survivor.

5. **[S2] `Tools.md:55` — "CI invokes it the same way" is false, and self-contradicting.**
   "`build.bat` invokes it as `node builder\tbdocs.mjs --src docs`; CI invokes it the same way."
   - `build.bat:13` → `--src docs --check-audit-index %*`
   - `checks.yml:100` → `--src docs --no-fetch-assets --check-audit-index`
   - `tbdocs-gh-pages.yml:96` → the above **plus** `--url` and `--baseurl`

   No two of the three agree. `Tools.md:69`, fourteen lines later, states the correct
   `build.bat` invocation. → `9f6c38f` survivor: the prior review flagged this exact sentence
   (`REVIEW-c9f2dfe0-1b6922b.md:311`) and its cover note claims the whole table was corrected;
   this line was left verbatim while new content was added around it.

6. **[S2] `Building.md:89` claims the Graphviz path has no in-tree patches.**
   "one WASM module load (~50 ms) covers the whole batch … **No headless browser, no
   in-tree patches**, no Chromium dependency for diagrams."

   False since `6170e07`. `builder/dot-metrics.mjs`'s `applyInterMetrics()` writes Inter's
   advance widths directly into the Graphviz WASM module's linear memory through
   `_module.HEAPU8`, before any layout runs. **`Builder.md:374` explains that patch at
   length** — so the two published pages now contradict each other on whether the thing
   exists. `6170e07` updated the Graphviz section of `Building.md` and left this sentence
   two paragraphs above untouched.

---

## Tier 2 — the range's headline change is undocumented

7. **[S2] The check subsystem does not appear in the published architecture pages.**
   New in range: `builder/check.mjs` (+504), `builder/link-check.mjs` (+980),
   `builder/check-tree.mjs` (+70). Tasks: `linkJoin`, `checkBook`, `checkReport`.

   | Page | Mentions of `check.mjs` / `link-check.mjs` / `check-tree.mjs` |
   |---|---|
   | `Builder.md` module map, DAG lists, "What runs where" | **0** |
   | `Pipeline-Stages.md` task sections and export tables | **0** |

   This is not an opt-in corner: `build.bat` always passes `--check-audit-index`, which sets
   `check = true` (`tbdocs.mjs:131-132`). Every ordinary build runs it.

8. **[S2] `Pipeline-Stages.md` is missing four tasks and five module tables.**
   Absent tasks: `vendorAssets` (`tbdocs.mjs:533`), `linkJoin` (`:947`), `checkBook`
   (`:1040`), `checkReport` (`:1069`). Absent export tables: `check.mjs`, `check-tree.mjs`,
   `link-check.mjs`, `vendor-assets.mjs`, `dot-metrics.mjs`. The four check tasks form a
   coherent group and warrant a new "Section 5 — Check and report".

9. **[S2] `flush:i` is documented without the work it now does.**
   `Pipeline-Stages.md:320` — "Returns `{ written, offlineWritten, offlineMisses }`".
   `cpu-worker.mjs:142` returns `{ written, offlineWritten, offlineMisses, check }`, having
   run `runChunkCheck(items)` over both trees' just-written HTML at `:139`. The entire
   "the check rides along inside flush, where the HTML is already in worker memory" design —
   the reason the fold-in saved ~270 MB of I/O — appears nowhere on the page.
   `Builder.md:245` has the same omission.

10. **[S2] Three shipped tools have zero mentions anywhere under `docs/`.**
    - `scripts/check_a11y_fingerprint.mjs` — which `WIP.md` calls mandatory on every
      axe-core upgrade
    - `scripts/sweep_a11y.mjs` — the full-site sweep that found six violation classes on 54 pages
    - `scripts/lib/axe-scan.mjs` — **844 lines that define the scan**

    The last is a misdirection, not just a gap. `Tools.md:123` and `Building.md:72` describe
    the scan's page list, viewports, themes, request blocking and source patches as
    properties of `scripts/check_a11y.mjs`. That file is 247 lines and imports all of it from
    `lib/axe-scan.mjs`. `WIP.md` states the split correctly ("`check_a11y.mjs` itself is only
    the reporting front end"); the published pages do not. A maintainer told to change the
    scan opens the wrong file.

11. **[S2] `check.bat`'s gate count is wrong in both places it appears, and one gate is
    undocumented.** `check.bat` runs **five** gates. `Tools.md:35` says "Four steps";
    `Tools.md:129` says "the last of `check.bat`'s four steps"; `Building.md:72` says "Three
    cheaper gates run first". The missing one is `scripts/check_dot_fit.mjs`, added to
    `check.bat` by `6170e07` — which appears **nowhere** in `Tools.md` or `Building.md`.

12. **[S2] `Tools.md` covers 7 of 15 scripts, against its own charter.**
    The page opens: *"One-line-per-tool reference for **every executable** in the
    documentation repository."* No entry exists for `check_dot_fit.mjs`,
    `check_tree_fresh.mjs`, `check_axe_patch_equiv.mjs`, `check_a11y_fingerprint.mjs`,
    `sweep_a11y.mjs`, `build_fonts.py`, `build_dot_metrics.mjs`, or `lib/axe-scan.mjs`.
    Two of those are gates `check.bat` runs; two are gates CI runs.

13. **[S2] `test/fixtures/check-src/` ships with no documentation and a silent invariant.**
    Nine tracked files, added in range, consumed only by `scripts/check_links_diff.mjs`
    (`FIXTURE_SRC:77`, `FIXTURE_TREE:78`). Its per-category expected finding counts are
    hard-coded at `:99`, `:113` and `:118` — **editing the fixture's markdown without
    updating those constants in lockstep fails the assertion by design**, and no `.md` in the
    repository states that rule. `test/` has no README; `package.json` has no `scripts` key
    at all, so there is no `npm test` and the only way to run it is the literal CI command.
    The only living prose reference is one sentence at `Tools.md:160`. The full rationale
    exists only inside `REVIEW-c9f2dfe0-1b6922b.md`, which is explicitly frozen as a dated
    snapshot — not a page a contributor would be pointed at.

14. **[S3] Ten parsed flags are absent from their own scripts' header blocks.**
    Verified `parsed:1 inHeader:0` for each: `check_a11y_fingerprint.mjs --unminified`;
    `sweep_a11y.mjs --root-dir --out --stock-axe --recycle-every`; `pick_a11y_sample.mjs
    --root-dir --budget`; `check_links_diff.mjs --max-lines --base-path-tree
    --build-base-path`. **`--recycle-every` occurs exactly once in the entire repository** —
    its own argv line, `sweep_a11y.mjs:99`. Not in the header, not in `--help`, not in any
    document.

15. **[S3] `frontmatter: search_exclude: true` is load-bearing and undocumented.**
    `search.mjs:71` honours it, and `linkJoin` imports `searchIncludes` specifically so the
    cross-file check does not fail the build on a page that sets it — the code comment says
    the first such page would otherwise fail "with no hint why". Neither `Authoring.md` nor
    `Pipeline-Stages.md` documents the key (`sitemap: false` gets one passing mention at
    `Pipeline-Stages.md:539`). There is no complete frontmatter-key reference anywhere.

---

## Tier 3 — stale figures and internal contradictions

16. **[S3] Stale `expected` lists and counts in `Pipeline-Stages.md`.**

    | Line | Documented | Actual |
    |---|---|---|
    | `:223` | `markdownInit ["discover"]` | `["discover", "vendorAssets"]` |
    | `:353` | `writeAssets ["dot", "prepPageDirs", "highlighterInit"]` | `+ "vendorAssets"` |
    | `:390` | `writePdf ["flushJoin", "dot", "resolveBookChapters"]` | `+ "renderJoin"` |
    | `:494` | `injectAnchorHeadings(html) → string` | `(html, headingsOut)` — → `9f6c38f` survivor: it fixed the `Builder.md:94` copy and left this one |
    | `:382`, `:387` | `writeOffline` / `writePdf` "(main, terminal)" | neither is terminal; `linkJoin` and `checkBook` depend on them |

    Also: the `SharedState` table omits `checkTrees`, `checkChunks`, `checkChunkCount` and
    `checkStubs`; the `BuildOpts` table omits `check`, `auditIndex`, `checkFindings` and
    `fetchAssets`; the export tables omit `sitemapIncludes`, `searchIncludes` (both `7df8625`)
    and `stripFontPreloads` (`58f9c6e`); the `renderEnvInit` and `dispatch` payload
    enumerations omit `checkTrees`, `svgContents`, `vendoredVideos` and `vendoredImages`.

17. **[S3] Task and section counts.** `Builder.md:177` — "28 named static tasks … four
    sections". `TASKS` has **31** entries and `GANTT_SECTION_ORDER` (`tbdocs.mjs:1140`) is
    `["Seeds", "Spine", "Render", "Write", "Check"]` — **five**. `index.md:24` repeats the
    four-section list, omitting `Check`.

18. **[S3] `Extending.md:276` — "roughly ten in-tree plugins".** `createMarkdownIt` registers
    17 `.use()` calls, 3 of them third-party, so **14** in-tree. It was 11 at `c9f2dfe0`;
    `headingLevelNormalizePlugin`, `videoLinkPlugin` and `remoteImagePlugin` landed in range.

19. **[S3] `scripts/check_a11y.mjs:6` — "eleven pages … which eleven".** `SAMPLE_PAGES` has
    **13**. A second-order miss: `9f6c38f` corrected *six → eleven* in three files while the
    sample was being widened to thirteen inside the same batch, and this header kept the
    intermediate value. `PLAN-a11y.md:22` has the same defect one generation further back —
    still "all six sample pages" in the present tense, with its `Superseded` note 271 lines
    below at `:293`.

20. **[S3] `WIP.md` contradicts itself four times.**

    | Subject | One place | The other | Correct |
    |---|---|---|---|
    | `build.bat` flag | `:974` `--check` | `:992` `--check-audit-index` | `:992` |
    | PDF filename | `:977` `docs\_pdf\book.pdf` | `:914` `twinBASIC Book.pdf` | `:914` (matches `book.bat:28`) |
    | State audits | `:1057` "Four extra audits" | `:1030` "60 audits today" | 8. `STATE_AUDITS` has 2 entries × 2 themes × 2 viewports; 13×4 = 52, and 52+8 = 60 — the page's own total proves "four" wrong |
    | tbIDE CoClasses | `:40` "~20" | `:57` "23" | 23, corroborated by `WIP.tbIDE.md:5` |

21. **[S3] `WIP.md` misattributions.**
    - `:568` — "`custom.scss` go[es] on asking for `font-weight: 350` (it does, twice)".
      `docs/_sass/custom/custom.scss` contains **zero** `font-weight` declarations. The two
      real ones are in the *vendored* `layout.scss:218` and `navigation.scss:114`. The error
      originates in `docs/_sass/custom/_fonts.scss:67`'s own comment, which `WIP.md`
      paraphrases — so both need fixing.
    - `:414` — "`WIP.WinEventLogLib.md` and `WIP.WinServicesLib.md` reference anchors like
      `#service-host-idiom` and `#composition-delegation-idiom`". Neither anchor appears in
      either file (0 matches). Both are real, and live in the published docs:
      `#service-host-idiom` is defined at `Built-In/WinNamedPipesLib/index.md:42`,
      `#composition-delegation-idiom` in `Built-In/WinEventLogLib/`. The follow-on advice is
      also unworkable as written — `builder/redirects.mjs` generates whole-*page* stubs and
      has no fragment remapping, so `redirect_from` cannot preserve a renamed anchor.
    - `:561` — "`check_dot_fit.mjs` — in `check.bat` and in CI". Only in `checks.yml:139`;
      `tbdocs-gh-pages.yml` has no such step, so a diagram-geometry regression can reach the
      deploy path unchecked. (`:976` and `:621` are both accurate.)

22. **[S3] `WIP.md:309` states the reverse of the shipped behaviour.**
    "`Decimal` data type is reserved but not currently supported." Unchanged since the first
    commit. `docs/Features/Language/Data-Types.md:22` — "In twinBASIC, `Decimal` is
    implemented as a full, regular data type, in addition to use within a `Variant`" — and
    `docs/Reference/Data-Types.md:30` gives its size and range. `WIP.md:314` tells
    contributors to consult that exact page before assuming VBA semantics carry over.

23. **[S3] `PLAN-checks.md:78` — "Both workflows run the same four gates".**
    `checks.yml` runs **six** (`:113`, `:127`, `:139`, `:151`, `:158`, `:165`);
    `tbdocs-gh-pages.yml` runs **four** (`:103`, `:108`, `:112`, `:116`) — no fused-checker
    comparison, no DOT fit. The asymmetry is deliberate and recorded at
    `REVIEW-c9f2dfe0-1b6922b.md:344`; only the plan was never updated.

24. **[S3] `PLAN.md` contradicts itself on Phase 10 and documents a deleted toolchain.**
    `:8` "phases 1-12 shipped" and `:168` "[shipped]" against `:33` and `:428` "(planned)".
    It still describes verification by diffing against Jekyll via `verify-phase1..8.mjs`,
    `_triage.mjs`, `_diff.mjs` and `accepted-divergences.mjs` — **none of which exist**, and
    there is no Jekyll build left to diff against. Its "Dependencies" section (`:133-152`)
    claims a `"dependencies"` key with seven packages including `lunr`; `package.json` has
    **no `dependencies` key at all** and does not list `lunr`. `PLAN.md` also never mentions
    `PLAN-sab-pull-scheduler.md`, which is the current scheduler design (through Phase 18)
    and the one two of this range's commits continue.

25. **[S3] `PLAN-13.md:171` and `:366` — "`svg-inline.js` … ~80 lines / ~2.5 KB".**
    It is **338 lines**. It was 161 at `c9f2dfe0`, so **+177 inside this range** (`58f9c6e`,
    `6170e07`), gaining `serializeWithFonts`, `trapFocus` and `exportFailed` — none of which
    the behaviour list mentions. *(Agent reported +201; corrected to +177 on measurement.)*

26. **[S3] Two module headers kept a figure the prior review corrected everywhere else.**
    `builder/tbdocs.mjs:8` and `builder/check.mjs:5` both say "230 MB" in the present tense.
    `9f6c38f` updated that to ~270 MB in `WIP.md`, both workflows, `check_links.mjs`,
    `Building.md` and `PLAN-checks.md` — and missed the headers of the two modules the range
    introduced. (`PLAN-checks.md:6` and `:561` frame it historically and are correct as-is.)

27. **[S3] `scripts/check_links.mjs:54` documents one of four exit codes.**
    "Exit code 2 signals integrity-only failures". `:569` implements
    `(linksFailed ? 1 : 0) | (integrityFailed ? 2 : 0)` — 0/1/2/3. `Building.md` and
    `Tools.md` both document all four; the script header is the lagging copy.

28. **[S3] `tbdocs.mjs:3-5` usage block lists 9 of 17 parsed flags.** Omits `--no-check`,
    `--check-findings`, `--fetch-assets`, `--no-fetch-assets`, `--no-offline`, `--no-pdf`,
    `--profile-offline`, `--tolerate-missing-images`.

29. **[S3] `WIP.md:1000`/`:1015` — two small imprecisions.** "spawns [`check_links.mjs`]" —
    the `script` side is a static in-process import (`check_links_diff.mjs:72`, whose own
    `describe` says "in-process"); only the fused side uses `spawnSync`. And "nine of the ten
    categories" — `CATEGORIES` (`:431`) has exactly nine, matched 1:1 by `FIXTURE_EXPECTED`.
    The phrase is inherited from that file's own comment at `:185`, which is equally wrong.

---

## Tier 4 — pre-existing drift (not introduced by this range)

Reported because it is live and would mislead today, dated so it is not mistaken for range
damage.

30. **[S2] `WIP.md` never acknowledges the `Default/` + `Built-In/` reorganisation
    (`58a5e1c`, 2026-06-03; `eadcef5`, 2026-06-04).** `docs/Reference/` no longer has `VB/`,
    `VBA/`, `VBRUN/`, `WebView2/`, `CEF/`, `tbIDE/` … as direct children. They are under
    `docs/Reference/Default/{VB,VBA,VBRUN}/` and `docs/Reference/Built-In/{…}/`.
    `grep -c "Default/\|Built-In" WIP.md` → **0**. This makes every file path in "Where
    things live" (`:28-40`), every "Page template" worked example (`:66-73`) and every
    `docs/Reference/<Package>/` pattern in "Per-symbol workflow" (`:288-308`) wrong.

    Two qualifiers, both verified: the **Cross-section linking** tables (`:131-283`) are
    unaffected — the reorg moved files, not URLs, and sampled `permalink:` values still match
    the documented scheme exactly. And `Authoring.md` did not inherit the staleness, because
    it deliberately declines to commit to physical paths.

    This matters more than its age suggests: `WIP.md` is loaded into every session through
    `CLAUDE.md`, so it is the first thing that misdirects anyone — or anything — working here.

31. **[S3] The package count is wrong, in `WIP.md` and on the site.** `Built-In/` holds ten
    packages, not nine: `AppGlobalClassObject` is absent from `WIP.md`'s status table
    (0 mentions) despite 38 published pages under `AppGlobalClassObject/_App/`. Thirteen
    packages total, not twelve. `docs/Reference/index.md` and `docs/Reference/Built-In.md`
    undercount it too. Related: `WIP.md:300` tells you to extend `docs/Reference/Packages.md`
    when adding a package, but that file's body is two bullets pointing at `Default/` and
    `Built-In/` — the per-package list lives in `Built-In.md`. That is plausibly *why*
    `AppGlobalClassObject` was missed. The `Assert` folder was also renamed to
    `TwinBasicAssertions/` (URLs unchanged), which `WIP.md:71`/`:292` still cite by the old path.

32. **[S3] `PDF-Generation.md:39-45` shows a command that does not match `book.bat`.**
    The doc shows `..\book\render-book.mjs _site-pdf\book.html … ..\perf\detach-pages.js`
    across three `^`-continued lines, relative to `docs/`. `book.bat:28` is one line relative
    to the repo root: `node book\render-book.mjs docs\_site-pdf\book.html -o "docs\_pdf\twinBASIC Book.pdf" … --additional-script perf\detach-pages.js`. Stale since the batch files moved in `8ac701b`.

33. **[S3] `builder/README.md` has four stale facts.** `cd builder && npm install` — there is
    no `builder/package.json`; the install is at the repo root, as `Building.md` correctly
    says. It calls the wrappers `docs/build.bat` etc. — they moved to the root in `8ac701b`.
    It links `assets/README.md`, deleted in `090b3a1`. Its CLI table omits every check and
    fetch flag, and its "Documentation" list stops at `PLAN-12` (PLAN-13, PLAN-a11y,
    PLAN-axe-perf, PLAN-checks, PLAN-scheduler*, REVIEW-* all unlisted).

34. **[S3] `Builder.md:163` — "total roughly 140 KB".** `allocSchedulerSAB({}).byteLength` is
    **174,100 bytes = 170.0 KB**. `MAX_TASKS`/`MAX_LANES`/`MAX_EDGES` are byte-identical at
    `c9f2dfe0`, so this is an arithmetic error that predates the range.

35. **[S3] Two plan documents describe shipped work as proposals.**
    `PLAN-scheduler-offline.md` reads as forward-looking design across all 320 lines with
    zero "shipped" markers, yet `offline-rewrite.mjs`, `buildSitePathsSync` and the
    worker-side `deriveOfflinePageCached` all exist and are wired in (2026-05-30).
    `PLAN-scheduler.md` still tables and imports `builder/mermaid.mjs`, deleted in `969b66e`
    (2026-06-02).

36. **[S3] The repository's front door says nothing about building it.** `README.md` is 33
    lines. It invites pull requests and never mentions Node 22, `npm ci`, `build.bat`,
    `check.bat`, the `builder/` generator, or where the developer documentation lives. The
    range raised the stakes — five gates, two link checkers, and committed font and
    diagram-metric artifacts that need regeneration — without a path to any of it from the
    front door.

---

## Verified sound

Checked and found correct, so it need not be revisited.

- **The vendored-theme README kept up completely.**
  `builder/vendor/just-the-docs/README.md`'s patch table records every commit in the range
  that touched a vendored `_sass` file — `3db9794`, `0813181`, `56c5570` — with file, commit
  and rationale. The one documentation surface that did not drift.
- **`perf/README.md` is complete for the range.** Every in-range rig is listed and every
  documented flag matches actual argv parsing, including the `--patch`/`--patches`
  singular-plural split across `check_axe_patch_equiv.mjs` and `ab-axe.mjs`, and the
  `rouge.css → tb-highlight.css` / `drop-rouge → drop-highlight` rename from `76abd6c`. The
  only undocumented rig, `instrument-parsedict.mjs`, predates `c9f2dfe0`.
- **`FUTURE-WORK.md` has no orphans.** B6 and B18 correctly dropped; B19 correctly still
  deferred — the dark theme genuinely still uses rule duplication via `modules-dark.scss`.
- **`PLAN-checks.md`'s follow-ons B, C and D are genuinely unimplemented**, matching its own
  status line: `check.bat` still runs `pick_a11y_sample.mjs --check` and `check_a11y.mjs` as
  separate serial steps, there is no parallel page orchestration in the scan, and CI still
  runs build and checks as distinct named steps.
- **`PLAN-axe-perf.md` and `PLAN-sab-pull-scheduler.md` are accurate at HEAD** — phase status
  headers, the Phase-3 `config-only` retraction chain, and the Phase 14/16/17/18 markers all
  check out. Both were substantially written inside the range and it shows.
- **`Book-Configuration.md`, `Fixes-PagedJS.md`, `Fixes-PDFLib.md`, `Permanent-Links.md`,
  `BuildInfo.md`, `Authoring.md`** all verified clean, including every `[PATCH: …]` tag
  against `book/lib/paged.browser.js`, all 338 `tB/`-prefixed links in `Permanent-Links.md`,
  and `Authoring.md`'s vendoring paths against `vendor-assets.mjs`.
- **Three of `WIP.md`'s self-declared sync obligations currently hold**: `Authoring.md`
  against `WIP.md`'s conventions; `pdf.mjs`'s `REQUIRED_FONTS` against `print.css`'s
  `@font-face` block (same six faces); and `modules-dark.scss` forwarding `_fonts.scss`'s
  stacks — the latter by genuine shared reference (`@use "custom/fonts" as fonts`), not a
  hand-maintained duplicate that could drift.
- **`WIP.md`'s build-tree counts reproduce exactly** against a fresh build: 1,159 built files,
  707 pages with the section-links disclosure, 452 without (290 stubs + 162 content pages),
  869 content pages, `Gloss.html`'s 172 anchors, 867 pages carrying at least one.

---

## Proposed amendments

Ordered by value per unit of effort. Items 1–4 are the ones worth doing regardless.

**1. Correct the four statements that misdirect. (~15 lines, one commit.)**
Findings 1, 2, 3, 6 — the reversed `priority` rule on both pages, the `if (!p) continue;`
worked example, the `renderJoin.expected = []` block, and the "no in-tree patches" sentence.
These are the items where the documentation would lead a maintainer into a defect the range
specifically fixed. Nothing else here competes.

**2. Give `Pipeline-Stages.md` a "Section 5 — Check and report". (~120 lines.)**
`vendorAssets` into Section 1; `linkJoin`, `checkBook`, `checkReport` as a new section;
export tables for the five missing modules; the stale `expected` lists, `SharedState` rows
and `BuildOpts` rows from finding 16; the `flush:i` return shape and the check-rides-along
rationale. This single page is the largest gap and carries the "complete interface
reference" promise.

**3. Repair the tool catalogue. (~70 lines.)**
`Tools.md`: fix the gate count in both places, add the eight missing script entries, fix the
dead workflow filename and the "CI invokes it the same way" sentence, and split the scan's
description between `lib/axe-scan.mjs` (what the scan *is*) and `check_a11y.mjs` (what
reports it). `Building.md`: "four gates", name `check_dot_fit.mjs`, drop the "no in-tree
patches" clause.

**4. Fix `WIP.md`'s package paths, or make them unnecessary. (~40 lines.)**
Finding 30 is the highest-impact item in the review despite predating the range, because
`CLAUDE.md` loads this file into every session. Two options: mechanically prefix every path
with `Default/` or `Built-In/`; or adopt `Authoring.md`'s approach and describe placement by
permalink rather than by path, which is what made `Authoring.md` immune. The second is more
work and does not go stale again. Fix the `Decimal` bullet (22), the four internal
contradictions (20), the two misattributions (21) and the package count (31) in the same
pass.

**5. Write `test/README.md`. (~40 lines.)**
Finding 13. Minimum content: what `check-src` is and why it is distinct from the HTML-only
`fixture` case; its sole consumer and the gitignored `_out*` build target; the exact run
command and the fact that it is wired into `checks.yml` only — not the deploy workflow, not
`check.bat`, and not any npm script because none exists; and, load-bearing, the rule that
`FIXTURE_EXPECTED` / `FIXTURE_BUILT_ONLINE` / `FIXTURE_BUILT_OFFLINE` must be updated in
lockstep with the fixture's markdown.

**6. Sweep the script headers. (~30 lines, mechanical.)**
Findings 14, 19, 26, 27, 28: the ten missing flags, "eleven pages" → thirteen, the two
surviving "230 MB", `check_links.mjs`'s exit-code table, and `tbdocs.mjs`'s usage block.

**7. Close out the plan documents. (~25 lines.)**
Findings 23, 24, 25, 35: `PLAN.md`'s Phase 10 contradiction and its dead verification
section, the six-vs-four CI gate claim, `PLAN-13.md`'s size figures, and shipped banners on
`PLAN-scheduler-offline.md` and `PLAN-scheduler.md`'s mermaid references. Low urgency —
nobody is misdirected today — but `PLAN.md` is the document a newcomer opens first.

**8. Give `README.md` a "Building the docs" section. (~15 lines.)**
Finding 36. Node 22, `npm ci`, the four batch files, and a link to
`/Documentation/Development/`.

### Worth considering, not proposed

- **A complete frontmatter-key reference.** Finding 15 is a symptom; the build reads at least
  a dozen keys and no page lists them all. `Authoring.md` deliberately covers only "the keys
  that matter", which is a reasonable scope — the reference would belong on
  `Pipeline-Stages.md` or a new page.
- **A gate that would have caught most of Tier 3.** Findings 16–19 and 23 are all "a number
  or a list in prose disagrees with a literal in the code". The repo already has the habit
  (`check_dot_fit.mjs`, `pick_a11y_sample.mjs --check`, `build_dot_metrics.mjs --check`), and
  a small checker asserting a handful of doc claims against `TASKS`, `SAMPLE_PAGES`,
  `GANTT_SECTION_ORDER` and the argv parsers would be in keeping with it. Noted rather than
  proposed: it is a real build to specify, and its value depends on whether this drift
  recurs after amendment 2.

### Noticed in passing, out of scope

`scripts/check_links_diff.mjs:400` embeds two literal NUL bytes as cache-key separators
instead of `\0` escapes (offsets 17434, 17445). `git` diffs the file normally — the NULs
fall past its 8,000-byte sniff window — but `grep` and `file` classify it as binary, so a
plain `grep` for a symbol in that file returns "Binary file matches" and silently skips the
line. It caught this review out once.

---

## Method

Five parallel agents, each given a disjoint slice and instructed to report only claims
verified against current source, with file:line evidence, and to mark anything else
`UNVERIFIED`. The orchestrator re-verified every finding before inclusion here.

Agent claims corrected during verification, for the record:
- `svg-inline.js` growth reported as +201 lines; measured **+177** (161 → 338).
- `PLAN-checks.md`'s `--base-path` claim graded MEDIUM by the agent; **downgraded** — it
  sits inside "Follow-on D", an unimplemented proposal (heading at `:902`), so it is a stale
  premise for future design rather than live misdirection. Recorded here, not tiered.
- One agent observation — that `Builder.md`'s "Seeds" prose contradicts `GANTT_SECTION` —
  was self-marked `UNVERIFIED` and is **not** included; it was not independently confirmed.

Not verified, and flagged as such: the empirical measurements throughout `WIP.md`'s
Typography and Site-integrity sections (contrast ratios, px/pt geometry, WASM metric deltas,
PDF codepoint counts, timing figures, `k = 2.73`, the 26%/30% axe-patch savings). The
mechanism behind each was confirmed to exist as described; the specific numbers were not
re-measured. Likewise `inter-metrics.json`'s current freshness, the live equivalence of the
two link checkers, and the axe patch's current equivalence — all three have gates, none were
re-run.
