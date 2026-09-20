# Use-case review, round 2 --- recovery and the URL contract, at `2e74de2`

Branch `staging` · reviewed 2026-09-20 · 16 cases

The companion to [REVIEW-USECASES-874896e.md](REVIEW-USECASES-874896e.md), run against the
documentation **after** that round's 30 commits of fixes. Method unchanged and now retained
in [eval/](../eval/): a mirror with all source stubbed unreadable, `WIP.md` withheld, and
search and navigation scored as separate channels.

Round 1 sampled what a person *does*. Round 2 samples what happens when something has
already gone wrong, and the `/tB/` permalink contract --- the one part of this site with a
consumer outside the repository.

## Verdict

**Round 2 scored lower than round 1, and that is the finding.**

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 | 2.75 | 2.75 | 3.00 |
| round 2 | **2.56** | **2.69** | **2.69** |

The corpus did not get worse; the questions got harder, and they got harder in a direction
nobody has written up. **Recovery is the weakest category in the documentation.** The two
worst results across both rounds are here: UC-24 (`book.bat` failed) and UC-22 (add a wide
table) each *stalled* on navigation and *missed* on search, answerable only by full-text
grep over unpublished design notes.

The shape is consistent. Every page in `docs/Documentation/` is written for someone who is
*about to do something*. Not one is written for someone to whom something has *happened*.
`Building.md` has a section titled "When the diagram-fit check fails" --- the project knows
the shape --- and it is the only one.

### Round 1's fixes demonstrably landed

Worth recording, because it is the only direct evidence a documentation change works. Five
independent evaluators found and used the heading-normalizer disarm trap, which did not
exist that morning: UC-19, UC-20, UC-21, UC-22 and UC-23 each cite `Authoring.md:185-192`
unprompted, and UC-20 reports that it "would have caused a silent regression and the docs
caught it for me." The new CI-delta section and the index-registration checklist were each
cited by three cases.

## Tier 1 --- actively wrong guidance

**1. `Extending.md` teaches a plugin that duplicates a shipped accessibility fix and
degrades it.** Its **Renderer override** worked example has the reader write a
`tableWrapPlugin` wrapping every `<table>` in `<div class="table-wrapper">`.
`builder/render.mjs:275` already sets `table_open` to emit
`<div class="table-wrapper" tabindex="0">`, and that `tabindex` is the
`scrollable-region-focusable` fix --- the defect that once covered 44 pages. The example's
`originalOpen` **is** the shipped rule, so following the tutorial produces a nested wrapper
whose outer `div` has no `tabindex`.

**2. `Builder.md` says the vendored theme is pristine; thirty files differ.**
`Builder.md:458` describes the vendored sources as *"pristine upstream and re-vendored
wholesale"*. `builder/vendor/just-the-docs/README.md:18` says thirty files differ, six of
them measured accessibility patches with commit SHAs --- a 1.39:1 contrast fix, a footer at
2.82:1 raised to 7.20:1, three focus rings, two palette variables. A maintainer who reads
the published page re-vendors wholesale and silently drops all six. `Builder.md:447` also
advertises the vendor README as covering *"the in-tree patches applied to
`just-the-docs.js`"*, omitting the `_sass/` patches entirely.

**3. Every "direct command" in the published docs fails on a non-Windows machine, and two
pages promise POSIX equivalents they never give.** `Building.md:18` --- *"their POSIX
equivalents are listed alongside"*. `Tools.md:17` --- *"POSIX equivalents are listed in the
per-batch entry below"*. Neither is true: `Building.md:40`, `Tools.md:23`, `:29` and `:50`
are all Windows-backslashed, so `node builder\tbdocs.mjs` is a literal filename on macOS and
fails with ENOENT. `Building.md:40` additionally omits `--check-audit-index`, so following it
silently skips the link check that `build.bat` runs. The only correct POSIX forms in the
repository are in `builder/README.md`, which is unpublished, and in CI YAML. UC-26 scored
actionability **1/4**.

**4. `Authoring.md` listed the wrong highlighted fence languages.** *Fixed in `4d87460`.* It
named only `yaml` and `json`; `SHIKI_LANGS` carries `js`, `yaml`, `json`, `c`, `html`, `xml`,
`sql` and `batch`, and `docs/` contains 64 `js` blocks that the page implied could not be
highlighted. The fallback is also not silent --- the build prints
`highlight: unknown fence language "<name>"` and names the list to add it to.

**5. `Tools.md` contradicts itself on gate order, three ways.** `:36` numbers
`check_publish_policy` step 1 and `check_tree_fresh` step 2; `:228` says publish-policy *"is
`check.bat`'s first step"*; `:235` calls tree-fresh *"First of `check.bat`'s gates."* Two of
the three cannot be true.

**6. `docs/Documentation/index.md:16` still says `check.bat` validates link integrity.**
`Tools.md:35` says the opposite and correctly: that moved into `build.bat`.

**7. `Building.md:24` strands a newcomer.** *"Clone either your fork or the documentation
repository itself"* --- clone upstream and the deploy section's first step, "push your
changes to your GitHub fork", is impossible. No remedy is offered.

## Tier 2 --- missing at the point of need

**8. No troubleshooting exists for `book.bat`**, the slowest and most fragile command in the
repository. Both reader channels failed outright. Every cause is documented --- the three
Phase 8 aborts in `Builder.md`, the two image aborts in `Authoring.md`, the phase-by-phase
output shapes in `PDF-Generation.md` --- and none of those pages is one a person with a
failed render would open. Compounding it: `build.bat` sets a non-zero exit code on link
failures while still writing a good tree, so **`build.bat && book.bat` silently never runs
`book.bat`**, and no page warns of that.

**9. `{: #id }` is used 153 times across `docs/` and explained nowhere.** It is the only
mechanism that preserves an anchor across a heading rename, and the obvious alternative does
not work: `redirect_from` emits whole-page stubs with no fragment remapping. `Authoring.md`'s
"Heading levels" and "Cross-section links" --- the two sections a writer would open --- never
mention it. `grep -rn -i "renam" docs/Documentation/` returns three unrelated hits, so the
single most common destructive documentation edit is undocumented.

**10. The list-bullet dash convention is near-absolute and unwritten.** Bold-term bullets
take `---` (50 of 50 in `docs/Reference/`); link bullets take `--` (1460 of 1460). Nothing
states it, and `Authoring.md`'s own "See also" uses `--`, so a contributor imitating the
guide becomes the only counterexample on the site. Capitalisation after the dash is
lowercase 26 times with zero counterexamples and is likewise unstated. So is the rule for a
parenthetical aside --- practice is split inside a single page (`Dim.md:33` uses parentheses,
`:37` uses `---`).

**11. `Authoring.md` has no table section.** Its only mention of tables is a prohibition
("not a markdown table", for parameter lists). It does not say the scroll wrapper is
automatic, does not say a literal `|` must be escaped as `\|` inside a cell (done in 37
files, documented in none), and gives no column budget. The mechanism exists only in
unpublished `builder/PLAN-*.md`.

**12. Nothing states the obligation to update documentation when code changes.**
`Extending.md`'s Verify and Testing sections list four commands, every one a *code* gate. A
contributor who follows the page exactly ships correct code and stale docs on a green build.
The affected surfaces are knowable --- `Pipeline-Stages.md`'s per-task section and its
reverse `expected` edges, `Builder.md`'s task count, section lists and ASCII DAG sketches,
and the hand-maintained `scheduler-dag.dot` --- but the reader must reconstruct the list.

**13. Both pages a *changer* lands on are written only for *adders*.** Every heading in
`Extending.md` is "Adding…". There is no path for changing an existing task, and no page at
all covers adding a verification gate --- `Extending.md` enumerates three extension points
and excludes styling explicitly, while never mentioning checks, despite listing all six in
its own Testing section.

**14. `has_toc` and folder-style pages are undocumented.** Every page in the
`AppGlobalClassObject` precedent sets `has_toc: false`, and it is live in the renderer;
`Authoring.md`'s frontmatter list omits it. The `<Class>/index.md` plus siblings layout
exists only by example.

**15. `Permanent-Links.md` claims to be the URL contract and omits `AppGlobalClassObject`
entirely**, while enumerating classes for the other ten packages. Nothing in the new
index-registration section tells you to edit it for a package member, so it rots by design.

**16. The cross-package link asymmetry is never stated.** VBRUN pages sit one URL segment
deeper than VBA pages, so the two directions need different `../` counts --- the single most
error-prone fact in that task. It must be inferred by diffing two sections of
`Permanent-Links.md`. Worse, `Authoring.md`'s fallback advice ("copy a working link from a
neighbouring page") evaporates here: **no VBA page links to any package page anywhere.**

## Tier 3 --- stale figures and contradictions

**17. `BOOKPLAN.md` is Jekyll-era, contradicts the live docs, and is marked historical
nowhere.** It describes `book.bat` as `npx pagedjs-cli`, the pipeline as
`bundle exec jekyll build`, and the output as `_pdf/book.pdf`. A developer grepping for
`book.bat` lands on a build system that no longer exists. It also strands the one uniquely
useful operational fact in the repository --- that `book.bat` needs `cmd.exe` because the
default PowerShell execution policy blocks `npx.ps1` --- which appears in no published page.

**18. `perf/README.md` says `build.bat` "is `bundle exec jekyll build`"** and locates it
under `docs/`. Both wrong since the Phase 10 cutover.

**19. Build-time baselines disagree and are unusable.** `Tools.md:23` says "~3 seconds";
`Builder.md:33` says "around 2--3 seconds". No hardware, no per-phase split. There is no
timing history of any kind, so "the build got slower" cannot be answered by comparison ---
only by re-running history by hand.

**20. The page-count drift guard cannot do what its description claims.**
`Builder.md:539`: `if (pages.length < 836) process.exitCode = 1`, described as catching "a
discover-rule regression that silently drops content". There are 864 pages today, so 28 can
vanish before it fires, and one never will. Against the 37-page `_App` incident it names
elsewhere, it would have fired only barely. A floor is not a drift check.

**21. `README.md` calls `check.bat` "the gates that need a browser (diagram fit,
accessibility)".** It is six gates, two of which need neither a browser nor a built tree ---
`Tools.md:37` says so explicitly.

**22. The vendor README's own file counts do not add up.** Its header says 18 group-1 files;
the enumeration names 19; adding the six group-3 files, six deletions and two modified
`color_schemes/` files exceeds thirty however it is sliced. Used as a checklist, it misleads.
No upstream MIT `LICENSE` is vendored, and the procedure never says to carry one across.

**23. Book page-count stated three ways** --- 1,638 (`Tools.md`), 1,651 (`Fixes-PDFLib.md`),
~1,500 (`BOOKPLAN.md`).

**24. `PLAN-sab-pull-scheduler.md`'s status is stated two ways.** `builder/README.md:70`
calls it *"the current scheduler design"*; `:80`'s frozen-snapshot list does not include it.
It names pipeline tasks 204 times, so whether its worked examples are maintained reference
matters.

**25. `Pipeline-Stages.md`'s plugin inventory omits the `table_open` rule** that carries the
accessibility fix, despite the table being introduced as all seventeen plugins "with what
each one does".

## What round 2 confirms about the method

Two evaluators found their case's premise false and audited reality instead --- UC-18's page
had already been moved, correctly, and produced three findings about *retiring* an old URL
that the intended scenario would not have. That is a successful run.

One evaluator was itself wrong in a way worth recording: UC-30 reported `batch` as
unregistered and the highlight fallback as entirely silent. Both are false --- `batch` is in
`SHIKI_LANGS` and the build prints a named warning. Its underlying finding was still correct
and is fixed. **Re-verify every finding against the file**; that discipline caught seven
overstatements in round 1 and one here.

## Method

See [eval/README.md](../eval/README.md). Corpus built by `eval/build_corpus.mjs`, search
measured with `eval/site_search.mjs` against the real index, protocol in
`eval/protocol.md`, catalogue in `eval/usecases.md`.

One measurement from building the harness is worth keeping: inverting the corpus filter from
a denylist of source extensions to an allowlist of prose extensions immediately surfaced
`.theme`, `.csv`, `.token`, `.jsonc`, `.twinpack` and `.keep` --- six file types nobody would
have thought to name in advance, and any of which would have silently become readable.
