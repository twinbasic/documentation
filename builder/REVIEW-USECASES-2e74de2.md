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
`template.mjs`. The file has not been added; the vendor README now records the gap and its
re-vendoring step copies it.

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
and has not been made.

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

> **Queue state after the follow-on session.** Struck-through entries are closed and carry the
> commit that closed them. What is left is: everything under
> [Needs someone with the twinBASIC IDE](#needs-someone-with-the-twinbasic-ide), the
> `_site-pdf/` freshness check, and the `Description` entry's reconstructed wrapper.
>
> Two entries were **overstated** and are marked where they sit --- `Authoring.md`'s listing
> checklist was already half-fixed before it was checked, and `IDE/Links.png` is not a defect
> at all. One was **understated**: `IDE/New Project.md` had every sample number off by one, not
> two wrong entries. Re-verifying before acting is what separated those three from the rest,
> and it is the same discipline this review's own [method
> note](#what-round-2-confirms-about-the-method) records.

### Needs someone with the twinBASIC IDE

> **Command-line compilation is not a route to any of these.** Checked against
> `twinBASIC_IDE_BETA_983`: the compiler executable's whole command-line surface is six
> verbs --- `export`, `import`, `settings`, `licence`, `changelog`, `readme` --- and none of
> them builds. Building is IDE-only, so verifying an `Applicable to:` line still means
> putting the attribute in front of the compiler by hand. The six verbs are now documented
> at [Import/Export Tool](../docs/Features/Packages/Import-export%20tool.md); they were not
> before, and the usage message the tool prints names only two of them.

- **`ConstantFoldableNumericsOnly`** carries the same unqualified *Applicable to: **Function***
  that `ConstantFoldable` did. The sibling turned out to be module-scoped only. Same check.
- ~~**The other 52 `Applicable to:` lines in `Reference/Attributes.md`**~~ **Done.**
  `scripts/gen_attribute_probes.py` writes one source file per claimed placement and packs it
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

  Seven attributes are still unprobed: six whose argument cannot be synthesised without a real
  factory method, image file, `.json` resource, warning code or option string, and
  `[FormDesignerId]`, which reached TB5247 `unable to find matching form designer JSON` ---
  the compiler accepting the placement and then failing a lookup, which confirms its line.
  `[DispInterface]` and `[DualInterface]` remain the least trustworthy entries on the page:
  both claim an `Interface` in a `Library`, a construct with no reference page in `docs/`, and
  both are absent from the compiler's lexer token table.

  Two facts the page did not state, both now on it: only one `[RunAfterBuild]` is allowed per
  project (TB5114), and a module-level variable cannot carry `[DllExport]`.
- **Two IDE defects visible in committed screenshots**, confirmed at 3x: the Align submenu
  renders `Bottom}` with a stray brace, and Align and Make Same Size both render `ARROWLUP`.
  Documentation bugs these are not.

- **`Reference/Attributes.md` is missing attributes the documentation itself uses.** The
  compiler's token table names `Enumerator`, `NonBrowsable` and `AllowUnpopulatedVtableEntry`;
  all three are used as attributes in published reference pages --- `WinServicesLib/Services.md:208`,
  `WinNativeCommonCtls/ListView/index.md:159`, `tbIDE/Host.md:133` --- and none has an entry in
  the attribute reference a reader would consult. Semantics for the three are not guessable from
  the binary, so no entries were written.

- **Eight more names the compiler knows appear nowhere in `docs/` at all:**
  `WithDispatchForwarding`, `ImplementsViaPrivateFriendlies`, `ExecuteHostCommand`,
  `CustomDesigner`, `DefaultDesignerEvent`, `ComExport`, `RunBeforeStartupObject`,
  `RedirectToStaticImplementation`. Two are siblings of documented attributes --- `ComExport`
  beside `DllExport`, `RunBeforeStartupObject` beside `RunAfterBuild` --- which is what makes
  them worth asking about. The table mixes keywords with attributes, so whether each is an
  attribute or a modifier needs the compiler to settle.

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
- `_site-pdf/` freshness is unchecked: `book.bat` tests only that `book.html` exists, and
  `check_tree_fresh.mjs` defaults to `_site-offline` with `check.bat` passing no `--tree`.
  Rendering after a content edit without rebuilding silently renders the previous book.
  **Still open, and it bit during the follow-on session** --- a stale PDF was nearly used as
  the baseline for a page-count comparison.
- ~~`PDF-Generation.md`'s `![PDF render pipeline]` is the fourth caption-parroting diagram
  alt~~ **Done** in `558dc28`. The same commit corrected the diagram's own `(~5 MB)` label
  for `book.html`, which measures 6.9 MB.
- ~~`Attributes.md` pins 55 heading ids while `Permanent-Links.md` lists 56 anchors. Three
  published URLs rest on the default slug and break if a type is appended to the heading;
  two pinned ids are listed nowhere.~~ **Done** in `b3df7ea`: `#classinterface`,
  `#dispinterface` and `#dualinterface` now carry pinned ids (same slugs, so no URL moved),
  and `#customcontrol` and `#specialcompilerbinding` were added to the contract, which is
  also what puts them under the build's link check. Now 58 pinned against 58 listed.
- The `Description` entry's `Public Function CurrentProjectName() As String` wrapper is an
  agent's reconstruction, not from the maintainer's quoted source. **Still open.**

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
