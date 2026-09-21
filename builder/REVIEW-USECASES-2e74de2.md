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

*Found while fixing the above:* **the same tutorial's other worked example produced empty
output.** Its block-rule callout plugin, run exactly as documented, rendered
`<div class="callout callout-warning"></div>` --- the body was consumed by the line-skip loop
and silently discarded. Verified by executing both the documented version and the corrected
one against the repository's own markdown-it. So of `Extending.md`'s three worked examples,
two were defective: one duplicated a shipped fix and weakened it, one did not work at all.
A tutorial's examples are the part readers copy verbatim, and nothing tests them.

**2. `Builder.md` says the vendored theme is pristine; thirty files differ.**
`Builder.md:458` describes the vendored sources as *"pristine upstream and re-vendored
wholesale"*. `builder/vendor/just-the-docs/README.md:18` says thirty files differ, six of
them measured accessibility patches with commit SHAs --- a 1.39:1 contrast fix, a footer at
2.82:1 raised to 7.20:1, three focus rings, two palette variables. A maintainer who reads
the published page re-vendors wholesale and silently drops all six. `Builder.md:447` also
advertises the vendor README as covering *"the in-tree patches applied to
`just-the-docs.js`"*, omitting the `_sass/` patches entirely.

*Refined while fixing.* `check.bat` catches this **half**: the axe scan reports the two
contrast regressions; the three focus rings are reported by nothing, because axe checks that a
control is reachable and named rather than that its ring is visible. Verified against the
tree, the divergence is 30 paths --- 26 modified, 4 deleted --- of the 36 files vendored at
`e7dd843`, and all six accessibility patches are physically present in the source.

*Also found:* **no upstream MIT `LICENSE` is vendored.** `find builder/vendor -iname "*licen*"`
returns nothing; the vendoring commits copied `_sass/` and `assets/` only, and `LICENSE.txt`
sits at the gem root. Confirmed upstream as MIT, "Copyright (c) 2016 Patrick Marsceill". MIT
requires the notice with substantial portions, and this is the entire stylesheet tree plus the
runtime JS, compiled into a stylesheet every page loads; the footer's "Just the Docs" link is
attribution, not the notice. The repository's own practice agrees --- three OFL licences sit
beside the webfaces, and the Feather and Bootstrap Icons MIT notices are inline in
`template.mjs`. *Added since, in `30d2c39`* --- `builder/vendor/just-the-docs/LICENSE.txt`
is the upstream notice verbatim, and the vendor README's re-vendoring step copies it forward.

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
states it. Capitalisation after the dash is lowercase with zero counterexamples and is
likewise unstated. So is the rule for a parenthetical aside --- practice is split inside a
single page (`Dim.md:33` uses parentheses, `:37` uses `---`).

*Corrected while fixing, on three counts.* This review claimed `Authoring.md`'s own "See
also" was the counterexample. **It is not.** `--` on a link bullet *is* the site rule ---
1,570 of 1,570 in `docs/Reference/`, 70 of 72 in Tutorials, 8 of 8 in Features. The guide was
already right, and the genuinely mixed section is `docs/Documentation/` itself, 23 `--`
against 20 `---`, which is probably what was seen. The lowercase rule is narrower than stated
too: absolute for bold-term bullets (26/26, and 16/16 in Documentation) but **not** for link
bullets, 94 of which begin with a capital, 58 of those proper nouns such as `Win32` and
`Variant`. And the link-bullet count here was low --- 1,570, not 1,460.

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
`Builder.md:539`: `if (pages.length < 836)`, described as catching "a discover-rule
regression that silently drops content". A floor is not a drift check.

*Corrected while fixing, and the real figure is worse than this review's.* Measured by
running the real `discover()` against `_config.yml`'s exclude list rather than counting files
on disk: **908 pages**, not the 864 stated here. So the margin is **72**, not 28 — and an
identical repeat of the 37-page `_App` loss would leave 871 and **not fire at all**, rather
than "firing only barely". Raising the constant to a tight floor is not the answer either;
it would then fire on every legitimate page removal, which is why it was left loose. The
guard that would have caught `_App` is a comparison against the previous build's count held
in a committed file, the same shape as `builder/inter-metrics.json`. That is a code change
and has not been made. **Made since** --- see the queue entry under [Open at
handoff](#open-at-handoff).

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

## Open at handoff

Everything above was fixed unless listed here. This section is the queue, not a finding list.

> ~~**One item is open, and it is a code change: the page-count drift guard**, Tier 3 item
> 20.~~ **Done.** `builder/page-baseline.json` is the committed baseline the finding asked
> for: a rise rewrites it, a fall fails the build, and `--update-page-baseline` is how a real
> removal is recorded. `scripts/check_page_baseline.mjs` is the gate on the gate, in
> `test.bat` and both CI workflows --- the guard is silent on a healthy tree, so a green build
> is exactly what a guard that has stopped working produces.
>
> Writing it turned up two bugs the finding did not anticipate, both from the baseline being
> a *file* rather than a constant. **It has to be keyed to a source tree**: `check_links_diff.mjs`
> builds a three-page fixture with `tbdocs`, and an unkeyed baseline met it with *905 pages
> missing*. And **the build now writes into `builder/`, which `check_tree_fresh.mjs` watches**,
> after the tree is written --- so the next `check.bat` called a freshly built tree stale, on
> exactly the builds that had added a page. A third was already there: the old guard assigned
> `process.exitCode = 1` after the link check had set bits 1 and 2, so a build with an
> integrity failure *and* a page drop reported only the drop. Recorded in
> [WIP.md](../WIP.md#the-page-count-drift-guard).
>
> *Two `Tools.md` gaps fell out of the same commit*, and they are the shape of Tier 2 item 12
> rather than of this one: `test.bat` was documented as three gates when it had four, and
> [`check_code_regions.mjs`](../scripts/check_code_regions.mjs) --- added in this review's own
> follow-on audit --- had no entry on the page at all. Adding a gate is exactly the code change
> that page has no obligation to notice.
>
> **Everything else is closed.** Struck-through entries carry the commit that closed
> them. The last two --- the applicability of `ImplementsViaPrivateFriendlies` and of
> `ExecuteHostCommand` --- are settled, and neither needed the maintainer question this
> section had been holding out for. Both had been asked the wrong question:
>
> - **`ExecuteHostCommand` is not an attribute**, which is why six probes across two rounds
>   rejected it in every attribute position tried. It is a member of `Debug`. Wayne confirmed
>   the rest: a leftover from the VS Code IDE that was never wired to this one, to be removed
>   in the next release --- so no entry is owed for it anywhere.
> - **`ImplementsViaPrivateFriendlies` belongs on an `Implements ... Via` statement**, the
>   composition-delegation form, which every earlier probe had skipped in favour of the plain
>   `Implements`. Documented, with its effect measured rather than inferred.
>
> Both are recorded in full under [Needs someone with the twinBASIC
> IDE](#needs-someone-with-the-twinbasic-ide). The IDE rendering defects below are twinBASIC
> bugs rather than documentation ones and are recorded, not queued; this round added two
> more, both in the IDE's command-line handling.
>
> Two entries were **overstated** and are marked where they sit --- `Authoring.md`'s listing
> checklist was already half-fixed before it was checked, and `IDE/Links.png` is not a defect
> at all. One was **understated**: `IDE/New Project.md` had every sample number off by one, not
> two wrong entries. Re-verifying before acting is what separated those three from the rest,
> and it is the same discipline this review's own [method
> note](#what-round-2-confirms-about-the-method) records.

### Needs someone with the twinBASIC IDE

> **Closed in a later session, on a machine with BETA 983 installed.** Everything under this
> heading is settled. The two attribute names this note once held open were closed in turn ---
> see [The last two names](#the-last-two-names). Two methods did the work, and the cheaper one
> was not the IDE:
>
> **Exporting the shipped packages settles more than probing does.** `twinBASIC_win32.exe
> export` unpacks any `.twinproj`, and the IDE installs sixteen packages and thirty-two
> sample projects as `.twinproj` files --- 820 `.twin` sources between them, all of code the
> compiler already accepts. A census of that corpus against `Attributes.md` found **ten**
> attributes the packages use and the reference omitted, not the three recorded below, and
> handed over the argument forms for four attributes that had gone unprobed for want of a
> usable value. **Prefer this to a probe wherever it reaches**: shipped source that compiles
> is stronger evidence of applicability than a synthetic probe, and it costs no build.
>
> What it cannot give is meaning, and it is worth being careful about what it *looks* like it
> gives. A census counts `[Name` at the start of a line, and twinBASIC spells an escaped
> identifier the same way --- `[_HiddenModule].vbaObjAddref(...)`, `[_MAX] = 0`. Read
> naively, `_HiddenModule` came third in the table at 139 uses. What separates the two is the
> tail after the closing bracket: an attribute is followed by a declaration, an escaped
> identifier by `.`, `=` or `(`.

> **Command-line compilation is not a route to any of these.** Checked against
> `twinBASIC_IDE_BETA_983`: the compiler executable's whole command-line surface is six
> verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- and none of
> them builds. Building is IDE-only, so verifying an `Applicable to:` line still means
> putting the attribute in front of the compiler by hand. The six verbs are now documented
> at [Import/Export Tool](../docs/Features/Packages/Import-export%20tool.md); they were not
> before, and the usage message the tool prints names only two of them.
>
> **Two corrections to the paragraph above, both from the session that emptied this queue.**
>
> *The IDE executable does take a build flag*, even though the compiler executable does not.
> `twinBASIC.exe --buildAndExit32 <project.twinproj>` (and `--buildAndExit64`) builds and
> exits; `parseCommandLine()` in `ide/main2.js` reads them, and the Personal Edition is
> refused with a named dialog, so it is a deliberate feature rather than a leftover. It is
> still useless for this job, for a reason worth recording: **it writes nothing to stdout or
> stderr, ever**, and exits 0 whether or not the build was clean. Measured three ways ---
> a clean project built and exited 0; a project carrying a `TB5155` in code nothing
> references built an executable *anyway* and exited 0; and a project with a `TB5079` on a
> reachable path produced no executable, reported `[BUILD] failed` in the IDE's own DEBUG
> CONSOLE, and then **never exited at all**, sitting on a "Please wait…" dialog at 100%. So
> it cannot serve even as a pass/fail gate: silent, falsely green, and hanging on exactly
> the case worth catching.
>
> *And putting the attribute in front of the compiler no longer has to be done by hand.*
> The IDE's UI is a WebView2 page, WebView2 honours `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`,
> so the IDE can be started with a DevTools port and driven over CDP ---
> [scripts/tbbuild.mjs](../scripts/tbbuild.mjs). It loads a project, waits for the background
> compile to settle, and prints the DIAGNOSTICS pane. The 32-probe exploratory project below
> is one ten-second command now, and every result it records was re-run through it from the
> committed generator rather than transcribed. See [Compiling a twinBASIC project without
> the IDE in front of you](../WIP.md#compiling-a-twinbasic-project-without-the-ide-in-front-of-you).

- ~~**`ConstantFoldableNumericsOnly`** carries the same unqualified *Applicable to:
  **Function*** that `ConstantFoldable` did. The sibling turned out to be module-scoped only.
  Same check.~~ **Done, and the line was wrong.** Probed both ways in one build: accepted on
  a **Function** in a **Module**, TB5182 on a method in a **Class**. It behaves exactly like
  its sibling, and the entry now carries the same `in a Module` qualification. A control
  probe put `[ConstantFoldable]` --- already known to be rejected there --- in the same
  build, so the new diagnostic could be read against one of settled meaning produced by the
  same compiler run.
- ~~**The other 52 `Applicable to:` lines in `Reference/Attributes.md`**~~ **Done.**
  `scripts/gen_attribute_probes.mjs` writes one source file per claimed target and packs it
  into a `.twinproj` with the `import` verb; every probe is expected to compile, so a
  diagnostic naming a probe module is a wrong line. Built against BETA 983 over two rounds,
  69 probes in the first: **45 of the 52 lines were probed, 43 of them confirmed correct
  and two wrong.**

  - **`[COMExtensible]` is not accepted on a procedure in an Interface** --- TB5182
    `No handler for this symbol`. The `[DispId]` and `[PreserveSig]` probes use the identical
    skeleton and compile, so the skeleton is sound and the attribute is not. Clause removed.
  - **`[DllExport]` says "variables" and means constants** --- TB5155 on a module-level
    variable, clean on a `Public Const`. The page's own worked example had been using a
    `Public Const` all along, so the example was right and the line disagreed with it.

  Two facts the page did not state, both now on it: only one `[RunAfterBuild]` is allowed per
  project (TB5114), and a module-level variable cannot carry `[DllExport]`.

  **Five entries stated no applicability at all**, which the key had been reporting all along as
  "nothing to verify and nothing for a reader to rely on". All five now have one, written
  from the package census and confirmed by probe, and two of the five had a *wrong* `Syntax:`
  line as well --- both documented an optional Boolean and neither takes one:

  | entry | applicability, from the packages | syntax correction |
  |---|---|---|
  | `EventInterfaceId` | **Class** (19 uses) | -- |
  | `EventsUseDispInterface` | **Class** (88 uses) | -- |
  | `IgnoreWarnings` | **Class**, **Module**, procedure (113 uses) | the codes are bare `TBnnnn` tokens; the entry called them a list of strings |
  | `SpecialCompilerBinding` | procedure, **Declare** (6 uses) | takes an **Integer**, not an optional Bool: the six uses pass 1, 2, 3, 4 and 254 |
  | `WindowsControl` | **Class** (44 uses) | takes a **String** toolbox image path, or `"no_designer"`; not an optional Bool, and no use is bare |

  `WindowsControl` also turned up an undocumented convention: `??` in the path stands for the
  icon size, so `"/miscellaneous/ICONS??/CheckBox??.png"` resolves against `ICONS24`,
  `ICONS30`, `ICONS32`, `ICONS36` and `ICONS40`, case-insensitively --- the package ships
  `Checkbox24.png` beside `CheckBox30.png` and both are found.

  **Every entry on the page now states its applicability**, and 86 probes over 62 attributes build
  clean. Six are excluded and each says why in the key.

  **All 52 lines are now accounted for.** Of the seven left unprobed above, five were
  unprobed only for want of a usable argument value, and the shipped packages carry one
  apiece --- `[CoClassCustomConstructor("CreatePropertyBagObject")]` in VBRUN,
  `[CustomControl("/miscellaneous/frmButton.png")]` in CustomControlsPackage,
  `[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]`
  in Sample 22, `[IgnoreWarnings(TB0001)]` in VB. The generator now writes the resources
  those point at into the tree (a real PNG, a `Strings.json`, a factory module) and all five
  build clean, taking the run to **73 probes over 50 attributes**.

  `[CompilerOptions]` was the fifth, and it was never blocked: the reason recorded for it was
  *"the option string vocabulary is not documented"*, and the entry documents `+llvm`,
  `+optimize`, `+optimizesize` and `+optimizespeed` in a bulleted list directly beneath the
  line being doubted. An empty string is accepted too.

  **The claim that `[DispInterface]` and `[DualInterface]` are "the least trustworthy entries
  on the page" is withdrawn.** Both entries already carry a note saying the attribute "is
  generated in the **Library** modules that twinBASIC generates for COM references in a
  project. It cannot be manually created" --- so the page had stated the very thing that
  looked suspicious. Three probes confirm it: `Library`, `End Library` and `[LibraryId(...)]`
  are each rejected with TB5182 in project source, while the `Interface` nested inside parsed
  cleanly, and `[DispInterface]` on an ordinary `Interface` is rejected too. The applicability is
  real, correctly described, and unreachable from user code, which is why no package
  contains one. `[FormDesignerId]` remains as recorded.
- **Two IDE defects visible in committed screenshots**, confirmed at 3x: the Align submenu
  renders `Bottom}` with a stray brace, and Align and Make Same Size both render `ARROWLUP`.
  Documentation bugs these are not.

- **Two more IDE defects, both in command-line handling**, found while automating the probe
  builds. Recorded here for the same reason as the two above: worth reporting upstream, not
  something the documentation can fix.

  **A trailing space on the command line stops a project opening.** The affected executable
  is `twinBASIC.exe`, the launcher at the install root, and the fault is in shipped
  JavaScript rather than in any binary: `parseCommandLine()` at byte 5154 of `ide/main2.js`,
  a 944-byte function in a 7.5 KB file minified onto one line, loaded by `main.htm` through
  an ordinary relative `<script src>`.

  It splits the raw command line on `" "` and pushes every resulting token, including the
  empty one a trailing space produces. The empty token is not a `--` switch, so it counts as
  a second file argument, and the IDE refuses the launch with an `alert()` reading *"Bad
  command line syntax."* --- leaving a modal the IDE will not close on a normal shutdown
  request. A *leading* space is harmless, which is a good check on the reading: the empty
  first token sets `a = ""`, and `if (a)` is false for an empty string.

  **Repro: one line pasted into `cmd`. No project file, no batch file, no PowerShell.** The
  parse runs before `root.loadProject`, so the path never has to resolve:

  ```bat
  "C:\...\twinBASIC.exe" "C:\DoesNotExist.twinproj"
  ```

  With **one trailing space** after the closing quote: *"Bad command line syntax."* Without
  it: *"Failed to load the project (error code ERROR_FILE_NOT_FOUND)"*. Two different dialogs
  from the same nonexistent path is the cleanest statement of the bug --- the space changes
  how the command line is **parsed**, not how the file is looked up, and the second dialog
  proves the IDE otherwise got as far as trying to open it. Confirmed by reading each
  launched process's own `Win32_Process.CommandLine`: the only difference is a final byte of
  code 32.

  It was first reproduced from two `.cmd` files rather than by hand, only because an
  automated harness has no way to type into a console and the trailing byte had to be
  guaranteed to survive. Typed or pasted at an interactive prompt it behaves identically ---
  `cmd` passes the trailing space through either way.

  A real project behaves the same; if one is wanted, 48 `.twinproj` ship with the IDE and
  `projects\_Standard EXE\projectName.twinproj` is the stock template. Note that the no-space
  run adds the path to the recents list, which is why that dialog offers to remove it again
  --- take the offer.

  PowerShell hits it without anyone asking for it: `Start-Process` appends that space, so
  `Start-Process twinBASIC.exe -ArgumentList $path` never opens the project while
  `spawn(exe, [path])` from Node does. That cost most of an hour, because the failing and
  working launches look identical written out.

  The fix is one clause --- skip empty tokens, `else { const v = e.trim(); if (v) r.push(v) }`
  --- in a file that ships as source.

  *Corrected after the fact.* This entry first named `ide/main.js`, which is where
  `getIDECommandLineArgs` lives, not `parseCommandLine`; and it claimed the trailing space
  had been measured through the IDE's own `GetCmdLine`, which it had not. What had been
  measured was `GetCmdLine` on the *working* launch and a trailing space on a *different*
  executable, joined into a mechanism. The mechanism turned out to be right, and stating it
  as measured before it was, was not.

  **`--buildAndExit32` does not exit when the build fails.** A build-and-exit switch that
  hangs on failure cannot be scripted at all, which is the whole point of having one.

  The repro is a Standard EXE whose `Main` calls a procedure that does not exist, so nothing
  can eliminate it as dead code:

  ```tb
  Module Main
      Public Sub Main()
          NoSuchProcedureAnywhere 123
      End Sub
  End Module
  ```

  ```bat
  twinBASIC.exe --buildAndExit32 BuildAndExitHang.twinproj
  ```

  Observed, with the build directory confirmed absent beforehand: the IDE opens, DIAGNOSTICS
  shows one `TB5079 Unrecognized symbol 'NoSuchProcedureAnywhere'`, the DEBUG CONSOLE shows
  `[LINKER] FAILED due to compilation errors` and `[BUILD] failed` --- and then it **sits on a
  "Please wait…" progress dialog at 100% and never exits**. `Build\` is created and left
  empty, so the linker got as far as making the folder. Nothing reaches stdout or stderr.
  Still running minutes later, and it needs `taskkill /T /F` because a modal IDE ignores a
  normal close.

  The same switch on a clean project builds, exits by itself, and returns 0 --- which is what
  makes this a failure path rather than the switch simply not working.

- ~~**`Reference/Attributes.md` is missing attributes the documentation itself uses.** The
  compiler's token table names `Enumerator`, `NonBrowsable` and `AllowUnpopulatedVtableEntry`;
  all three are used as attributes in published reference pages --- `WinServicesLib/Services.md:208`,
  `WinNativeCommonCtls/ListView/index.md:159`, `tbIDE/Host.md:133` --- and none has an entry in
  the attribute reference a reader would consult. Semantics for the three are not guessable from
  the binary, so no entries were written.~~ **Done, and it was ten, not three.** The census of
  the exported package sources found every attribute the packages use and the page omits:

  | attribute | uses | applicability the packages demonstrate |
  |---|---:|---|
  | `CustomDesigner("…")` | 154 | a property-backing variable in a control **Class** |
  | `RedirectToStaticImplementation("Mod.Proc")` | 116 | `Property Get` / `Function` / `Sub` in a **Class** |
  | `AllowUnpopulatedVtableEntry` | 71 | a prototype in an **Interface** |
  | `Default` | 54 | an **Interface** line inside a **CoClass** |
  | `WithDispatchForwarding` | 44 | an **Implements** statement in a **Class** |
  | `DefaultDesignerEvent` | 37 | an **Event** in a control **Class** |
  | `Enumerator` | 25 | the `_NewEnum` **Function** or `Property Get` |
  | `NonBrowsable` \| `(True)` | 17 | a variable or `Property Get` in a **Class** |
  | `Source` | 6 | an **Interface** inside a **CoClass**, always `[Default, Source]` |
  | `RunBeforeStartupObject` | 3 | `Function … As Boolean` in a **Module** |

  Three of them are in the **VB**, **VBA** and **VBRUN** packages every project references,
  which is the part the token-table check could not see. Entries are written for all ten:
  applicability stated as verified, effect described only as far as the usage shows, and the rest
  marked unconfirmed. Three of the ten are documented by the source itself rather than by
  inference --- the **MyCOMAddin** sample explains `[WithDispatchForwarding]` in a comment
  beside it, cefPackage's `MainModule` explains `[RunBeforeStartupObject]` the same way, and
  `WinServicesLib/Services` carries a `[Description]` saying `[Enumerator]` "provides For-Each
  support".

  A detail worth keeping: the page's own `CoClassId` example had been writing
  `[Default] Interface <name>` and `[Default, Source] Interface <event interface name>` all
  along, so the reference was **teaching two attributes it did not document**.

  **One of the ten went out with the wrong `Applicable to:` line, and probing the new
  entries is what caught it.** `[RedirectToStaticImplementation]` was written as *procedure
  in a **Class***; the compiler rejects that with TB5155. The census had grouped its uses by
  **declaration keyword** and reported "on a `Property Get`, a `Function` and a `Sub`", which
  is true and says nothing about scope --- regrouped by **enclosing construct**, all 82 uses
  are inside an **Interface** (`_App`, `_Clipboard`, `_Screen`, `_Forms`, `VBGlobal`) and
  none inside a Class. The line now says so.

  That is the argument for feeding new entries back through the probe generator rather than
  trusting the census that produced them: **a census answers the question it was asked**, and
  "which keyword does this sit on" is not "which scope is it legal in". Two later probes
  corrected the same round's entries again --- `[ComExport]` does take the optional Boolean
  the entry denied it, and `[Source]` does compile without `[Default]`, which the entry had
  recorded as unknown.

- **Eight more names the compiler knows appear nowhere in `docs/` at all:**
  ~~`WithDispatchForwarding`~~, ~~`ImplementsViaPrivateFriendlies`~~, `ExecuteHostCommand`,
  ~~`CustomDesigner`~~, ~~`DefaultDesignerEvent`~~, ~~`ComExport`~~,
  ~~`RunBeforeStartupObject`~~, ~~`RedirectToStaticImplementation`~~. **Seven of the eight are
  now documented** --- five from package usage in the table above, `[ComExport]` from a probe
  (rejected on a procedure with TB5155, clean on a `Public Const`, which is exactly the target
  `[DllExport]` turned out to mean), and `[ImplementsViaPrivateFriendlies]` from the round
  recorded under [The last two names](#the-last-two-names). The eighth, `ExecuteHostCommand`,
  is owed nothing: it is not an attribute, and the `Debug` member it turned out to be is being
  removed.

  ~~**Still open, and now exhausted from this side: `ImplementsViaPrivateFriendlies` and
  `ExecuteHostCommand`.**~~ **Both settled, and neither needed the maintainer question this
  entry was waiting on --- see [The last two names](#the-last-two-names) below.** Both are in
  the compiler's token table and neither appears in any package or sample. Three targets were
  probed for each, all rejected:

  | attribute | tried | result |
  |---|---|---|
  | `ImplementsViaPrivateFriendlies` | an `Implements` statement, beside its token-table neighbour `WithDispatchForwarding` | TB5155 |
  | | the **Class** doing the implementing | TB5182 |
  | | the **Interface** being implemented | TB5182 |
  | `ExecuteHostCommand` | a procedure in a **Module**, beside its neighbour `IdeButton` | TB5182 |
  | | a method in a **Class** | TB5182 |
  | | a procedure in a **Module**, with a String argument | TB5182 |

  The argument probe is what closes the second one off: `[ExecuteHostCommand("probe")]`
  failed at the same column as the bare form, so a missing argument was not what the first
  probe was short of. Further guessing is not worth a build --- **one question to the
  maintainer would settle both**, and these are the only two items left in this queue.

  One reading rule this produced, which the earlier round's notes imply the opposite of:
  **the diagnostic code does not distinguish "no such attribute" from "wrong place for it".**
  `[ConstantFoldable]`, unquestionably real, draws TB5182 `No handler for this symbol` on a
  class method; `[ComExport]` draws TB5155 on a Sub and then compiles on a Const. Existence
  is settled by the token table, not by which code comes back.

#### The last two names

**Six rejections across two rounds, and the reason was the same both times: the question was
wrong.** Sixteen further probes settled both names, and the second half of that reading rule
above --- *"existence is settled by the token table"* --- is **withdrawn**, because it is what
kept the first one unsolved.

**`ExecuteHostCommand` is not an attribute.** The token table interns keywords, attributes
and object members together --- `Debug`, `Print` and `Assert` sit in it beside `Description`
and `DllExport` --- so a name being in it says the compiler knows the name, not what kind of
name it is. This one is a member of `Debug`:

| probe | result |
|---|---|
| `Debug.Cls` (control, does `Debug` have members beyond Print/Assert?) | clean |
| `Debug.ExecuteHostCommand "tbFile_SaveProject"` | **clean** |
| `Debug.ExecuteHostCommand` with no argument | `TB5023 Expected argument: command` |
| `ExecuteHostCommand "…"` unqualified | `TB5079 Unrecognized symbol` |

The TB5023 text is the identification: `Expected argument: command` sits in the compiler
binary's string pool immediately after the ANSI identifier `DebugExecuteHostCommand`, next to
`DebugClsCommand`. Reading those two names as an IDE-internal protocol rather than as language
surface is what the earlier rounds got wrong.

**The maintainer settled the rest**, asked on 2026-09-17: it "is from the VS Code days, where
we allowed the developer to pass through commands directly to the VS Code host. This has never
been hooked up to the new IDE, and so I will remove this legacy API in the upcoming release."
So **nothing is owed here** --- not an attribute entry, and not a `Debug` reference page for a
member that does nothing and is about to go. Recorded so the next census does not re-open it.

**`ImplementsViaPrivateFriendlies` belongs on an `Implements ... Via` statement.** Every
earlier probe put it on a plain `Implements`, on the Class, or on the Interface. The
composition-delegation form --- `Implements <Class> Via <field> = <expr>`, documented on
[Inheritance](../docs/Features/Language/Inheritance.md) and used throughout WinEventLogLib ---
was never tried, and it is the target:

| probe | result |
|---|---|
| `[IVPF] Implements IFoo Via mBase = New CBase` | **clean** |
| `[IVPF] Implements IFoo Via CBase` | **clean** |
| `[WithDispatchForwarding]` on the same `Via` statement (control) | `TB5155` |
| `[IVPF]` on a plain `Implements`, with an unprefixed private member | `TB5155` |
| `[IVPF(True)]` on a plain `Implements` | `TB5155` |
| `[IVPF]` on an `Inherits` statement | `TB5155` |
| `[IVPF]` on an `Interface` line in a `CoClass` | `TB5182` |

**The control is what makes this evidence rather than a coincidence.**
`[WithDispatchForwarding]` is legal on a plain `Implements` and rejected on the `Via` form;
`[ImplementsViaPrivateFriendlies]` is the exact opposite. A clean build on its own would only
have shown that the statement tolerates attributes.

**The effect was measured, not inferred**, by an A/B over one source shape with the attribute
as the only variable. A `Friend` member of the delegate, called on the delegating class from a
module: clean without the attribute, `TB5027 Unrecognized member` with it. The same member
called from inside the class: clean either way, through `Me` and unqualified. A `Public`
member: unaffected. So the attribute keeps the delegate's `Friend` members private to the
delegating class instead of re-exposing them project-wide --- the name is literal. Written up
at [`#implementsviaprivatefriendlies`](../docs/Reference/Attributes.md).

**One trap on the way, recorded because it read as a discovery for several minutes.**
`Implements IFoo Via PrivateFriendlies` compiles, and means nothing at all: `Via` is the
documented delegation keyword and its operand is a field name, so that line declares a private
field that happens to be called `PrivateFriendlies`. It was written as a guess that the
feature might be spelled as a clause, and a clean build on it looked like confirmation. **A
probe whose source text reads like the answer is the one to re-check hardest** --- the same
discipline as this review's own [method note](#what-round-2-confirms-about-the-method), applied
to a false positive rather than an overstatement.

- **One name the token table does not have:** `[LibraryId("…")]`, which appears in the
  compiler binary beside `Library `, `End Library` and `' Original type library: `. It is
  undocumented, and unreachable for the same reason `[DispInterface]` is --- rejected with
  TB5182 in project source. That the token table lacks it is the second piece of evidence
  that the table is not an exhaustive list of attributes.

- **What the name check did settle:** all 57 attribute names in `Attributes.md` occur in the
  compiler binary, so none is invented. `DispInterface` and `DualInterface` are absent from the
  token table but present elsewhere in it, which is also what says that table is not an
  exhaustive list of attributes. The risk in that page is in the `Applicable to:` targets, not
  in the names --- and the compiler does diagnose a misplaced attribute, with
  `This attribute is not supported in this context`, so a probe project would settle all 52
  lines in one build.

### ~~Prose that contradicts its own screenshot~~ **Done**, in `280cb19`.

Found by opening every image. The alt text now describes the picture, so on these pages the
alt and the body disagreed; one of the two was stale in each case.

| page | prose said | picture shows | resolution |
|---|---|---|---|
| `IDE/Call Stack.md` | the active chain of procedure calls | two threads, no call frames | prose was incomplete: the pane groups calls **by thread**, and each thread row expands to its own frames |
| `IDE/Splash Screen.md` | version, build date, community links | a VIP Gold Supporters sponsor board | prose was simply wrong; the version is on the **About** dialog, and the page now says so |
| `IDE/Memory.md` | addresses and byte values | an empty pane | both true: the toolbar is now documented, and the pane is empty until an expression is watched |
| `IDE/Properties.md` | a name/value grid | an empty pane | same shape: empty with nothing selected |
| `IDE/Variables.md` | name/type/value columns | an empty pane | same shape: empty outside a paused debugging session |
| `IDE/Webpage.md` | documentation or release notes | google.com at 70% zoom | prose over-narrowed a general browser pane with an address bar and zoom control |
| `IDE/New Project.md` | a sample list without HelloWorld | `Sample 1. HelloWorld` present; `GetIPAddresses` plural | **worse than recorded** --- see below |
| `IDE/Status Bar.md` | three regions | a fourth, `tbProject_Close`; the `## Status` heading is empty | it is the **command under the mouse cursor**, settled by the maintainer; the empty heading now documents it |

**The New Project entry understated the defect.** The list was written as a markdown ordered
list numbered `0.` to `23.`, which renders as an `<ol>` starting at **1** --- so every sample
number on the published page was off by one from the dialog, not just the two entries named
here. It is now a bullet list carrying the dialog's own labels, which is also the only way to
express `1a`.

*Corrected while fixing:* the claim that `IDE/Links.png` is a defect is wrong. The icon is the
old Twitter bird and the documented URL is `x.com`, but the page is faithful to the IDE and
the alt text describes what is drawn. That is an IDE artifact, not a documentation bug.

`IDE/Menu/Format.md`'s unexplained image pair is fixed in the same commit --- the menu is
greyed until the form designer has a selection, and the page now says which screenshot is
which. The `IDE/Menu/Edit.md` claim in this paragraph was already retracted below.

### Documented shortcuts that disagree with their screenshots

*Fixed in `00ca609`.* `Edit.md` Find In Project `CTRL+SHIFT+Y` against `CTRL+SHIFT+F`;
`File.md` Export Project with no shortcut against `CTRL+E`; `Project.md` References with no
shortcut against `CTRL+T`; and `Edit.md`'s "Select All Matchtes" against "Select All Matches".
All four confirmed by opening the three screenshots, and a fifth found the same way:
`Edit.md` wrote "TransformTo Titlecase" without the space.

*Corrected while fixing.* This review's claim above that **`IDE/Menu/Edit.md`'s list omits
five commands the screenshot shows is false.** The screenshot holds 28 commands and the page
lists all 28, in order. What it had wrong was the three spellings, not the coverage.

### Smaller documentation items

- ~~The book's page count is stated four ways: 1,638 (`Tools.md`), 1,651 (`Fixes-PDFLib.md`,
  `Fixes-PagedJS.md`, five occurrences), 1,991 (`WIP.md`).~~ **Done** in `558dc28`. The perf
  figures are measurement conditions rather than claims about the book, so they keep their
  numbers and now read as such ("on a 1,651-page book"); `PDF-Generation.md` states the
  current size once and says the perf notes quote the size at the time of measurement.
- ~~`Authoring.md`'s listing checklist covers core statements and excuses module members, but
  says nothing for a class, control or enumeration inside a package, nor for a whole new
  package~~ --- **the first half was already fixed**; both bullets existed by the time this
  was checked. The live part was the tail: a new package also needs its own `###` section in
  `Permanent-Links.md`, which nothing said. Added in `b3df7ea`.
- ~~`_site-pdf/` freshness is unchecked: `book.bat` tests only that `book.html` exists, and
  `check_tree_fresh.mjs` defaults to `_site-offline` with `check.bat` passing no `--tree`.
  Rendering after a content edit without rebuilding silently renders the previous book.~~
  **Done.** It bit during the follow-on session --- a stale PDF was nearly used as the
  baseline for a page-count comparison --- and `book.bat` now runs the freshness gate before
  rendering. The entry missed *why* `--tree` had never been pointed at this tree: the script
  identified a tree by its `index.html`, which `_site-pdf/` does not have, so the flag existed
  but exited 2 on the one tree it was wanted for. `--marker book.html` closes that.
- ~~`PDF-Generation.md`'s `![PDF render pipeline]` is the fourth caption-parroting diagram
  alt~~ **Done** in `558dc28`. The same commit corrected the diagram's own `(~5 MB)` label
  for `book.html`, which measures 6.9 MB.
- ~~`Attributes.md` pins 55 heading ids while `Permanent-Links.md` lists 56 anchors. Three
  published URLs rest on the default slug and break if a type is appended to the heading;
  two pinned ids are listed nowhere.~~ **Done** in `b3df7ea`: `#classinterface`,
  `#dispinterface` and `#dualinterface` now carry pinned ids (same slugs, so no URL moved),
  and `#customcontrol` and `#specialcompilerbinding` were added to the contract, which is
  also what puts them under the build's link check. Now 58 pinned against 58 listed.
- ~~The `Description` entry's `Public Function CurrentProjectName() As String` wrapper is an
  agent's reconstruction, not from the maintainer's quoted source.~~ **Done, and the
  reconstruction was wrong in two ways.** Exporting the VBA package gives the real source,
  `VBA/Sources/Compilation.twin`: the member is
  `Public DeclareWide PtrSafe Function CurrentProjectName Lib "<compilation>" Alias "#-33" () As String`
  --- an API **Declare**, not a plain Function --- and the quoted example body had lost a
  line, `' Example: Retrieve the current project name`. Both restored verbatim, along with
  the source's own comment about the special internal bindings, and the page now notes that
  the member is a Declare so a reader does not take the wrapper as part of the pattern.

### A follow-on audit, recorded elsewhere

The session that closed the items above also asked a question this round did not: whether any
*build-time rewrite* silently corrupts the content it passes over. It does, and the findings
are not use-case findings, so they live with the code rather than here:

- **[WIP.md](../WIP.md), "Never rewrite markdown source without knowing what is code"** --- four
  rewrites that ran over raw markdown with no idea what was code, and the same class on
  rendered HTML in `book.mjs`. Shipped consequences included a language reference printing its
  `If`/`ElseIf`/`Else` bodies flush left, and six corrupted code spans in the published PDF.
- **`scripts/check_code_regions.mjs`** --- the gate that would have caught all of it, now in
  `test.bat` and both CI workflows.
- **[builder/PLAN-counts.md](PLAN-counts.md)** --- a design for giving build-time counts names
  in prose, motivated by the stale figures this round found.

The relevance to *this* document is the shape of the miss: every gate was green throughout,
because the damage sat inside `<code>` and nothing inspected that. Round 2's method could not
have found it either --- an evaluator reads what the page says, not whether the builder
mangled it on the way out.
