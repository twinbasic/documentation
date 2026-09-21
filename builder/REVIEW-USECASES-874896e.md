# Use-case review of the developer documentation at `874896e`

Branch `staging` · reviewed 2026-09-20 · 16 use cases across 3 personas

Scope: **developer documentation only** — `README.md`, `builder/*.md`, `perf/*.md`,
`test/README.md`, `docs/Documentation/`, and the vendored theme's README. Content pages were
touched only as worked examples, except where a measurement below counts them.

This is the usability companion to
[REVIEW-DOCS-c9f2dfe0-a9d7638.md](REVIEW-DOCS-c9f2dfe0-a9d7638.md), which asked whether the
prose still describes the code. **The two questions are orthogonal, and most findings below
involve sentences that are individually true.** A page can pass a drift review completely and
still fail every reader who arrives with a goal.

## Verdict

**The documentation degrades monotonically with depth into the toolchain**, and it is worst
exactly where the project has invested most heavily in writing.

| persona | completeness | discoverability | actionability |
|---|---:|---:|---:|
| content contributor (5 cases) | 3.0 | **3.8** | 3.4 |
| toolchain user (5 cases) | 2.8 | 2.8 | 2.8 |
| builder developer (6 cases) | **2.5** | **1.8** | 2.8 |

The builder tier has by far the most written about it — `builder/` holds roughly 1.4 MB of
plan documents — and scores lowest, because almost none of it is reachable. `builder/*.md`
are not published pages, so the site's search index cannot see them at all. The two
worst-scoring cases in the whole review (UC-16 CSS in both themes: discoverability **0/4**;
UC-15 link-checker parity: **1/4**) are both cases where the answer exists, is excellent,
and lives somewhere no reader-facing channel reaches.

A second measurement makes the same point from the other side: **`docs/Documentation/` holds
130 of the search index's 3,712 entries — 3.5%.** The developer documentation competes for
its own site search against 3,017 entries of twinBASIC language reference sharing its entire
vocabulary. *Font*, *add*, *download*, *colour*, *build*, *image*, *style* and *dark mode*
are all twinBASIC API names. Site search returned the answer page at rank ≤3 in 7 of 16
cases and missed entirely in 5.

Four failure modes account for nearly everything found:

1. **The correct fix is absent from the page that diagnoses the problem** — and the fix that
   *is* offered is the one `WIP.md` forbids.
2. **The hazard and its remedy are separated.** The docs say dark mode is a separate palette;
   nothing published says how to write a rule that survives the dark compilation.
3. **Worked examples contradict the rule beside them**, and contributors have copied them.
4. **A gate's own documentation publishes the invocation that does not exercise it.**

## Tier 1 — actively wrong guidance

**1. `Authoring.md:83` and `Building.md:96` name two remedies for a refused file; the
correct third is in neither.** Both answer "the build refuses my file" with *add it to
`SOURCE_EXTENSIONS`*. For a single `.json` download that makes **every** stray `.json` under
`docs/` publishable — reintroducing precisely the `secrets.json` case the allowlist exists to
stop. `bundle_extra`, which exempts by path rather than extension and is already used for
`impexp.py` / `impexp.mjs`, appears only in a module export table (`Pipeline-Stages.md:569`)
and inside a self-test description (`Tools.md:188`). The evaluator was told the wrong thing
at hop 3 and reached the right one at hop 10.

**2. `Building.md:48` gives the wrong instrument for the job, 61 lines before explaining
why.** `:48` — *"The simplest local preview is `build.bat` followed by opening the rendered
files in any browser."* `:109` — the online tree's root-absolute asset URLs *"do not resolve
under `file://` and would leave every page unstyled."* Line 48 is the first preview advice a
contributor reads, it does not say which tree to open, and followed literally on `_site/` it
hands them an unstyled page. Neither sentence references the other.

**3. `Tools.md:117` gives the wrong remedy for the case the flag mostly fires on.** The
`--check-remote-assets` row ends *"Vendor the file under the section's `Images/` folder
instead."* Correct for an arbitrary host, wrong for a `github.com/user-attachments/…` URL,
which `Authoring.md:192` says to leave in place for the build to vendor.

**4. `Authoring.md`'s two named worked examples both violate the heading rule two sections
later.** `:13` — *"Two worked reference pages to imitate: `Const.md` and `Dim.md`."* `:148` —
*"Do **not** jump from `#` straight to `###`."* Both named pages do exactly that, as does
`Continue.md`. A contributor told to imitate them reproduces a defect the guide calls a
defect.

**5. The Phase 15 worked sample reproduces both halves of the defect its own document is
about.** `PLAN-sab-pull-scheduler.md:2660ff` registers `render:i` with `if (!p) continue;`
and populates only `flushJoinDef.expected`, never `renderJoin`'s — while `:568` states that
`dispatch.submit` does it *"for both barriers"* and `:605` states that the `continue` now
throws. Copying the worked example reproduces the six-missing-pages bug.

**6. Two incompatible rules for rewriting a barrier's `expected`, each with a justifying
comment.** `PLAN-sab:572` clones (*"clone: TASKS must stay clean"*); `PLAN-sab:2692` mutates
in place (*"the task def object is reused across rebuilds"*). Serve mode is where it matters.

**7. `Tools.md:165` publishes a `check_links_diff` invocation that covers less than it
appears to, and omits `--case` entirely.** It shows only `--a script --b fused`. `fixture`
and `online-abs` have no `fused` equivalent, so a `--b fused` run drops them. The case and
side registries, and the invocations CI actually runs, existed only in the workflow YAML and
in an orphaned README. `Tools.md:170` also called the harness *"deliberately not in
`check.bat`"* without mentioning that **both** CI workflows run it.

*Corrected while fixing — this review overstated it twice.* `DEFAULT_CASES` includes
`fixture-built` and `fixture-built-offline`, so a bare `--a script --b fused` **does**
exercise the fused side against real faults; and the dropped cases are reported on a
`skipped:` line rather than silently omitted. The defect is an undocumented flag and an
incorrect claim about CI, not a gate that proves nothing.

**8. `PLAN-scheduler.md:387` still specifies the deleted `emit()` API**, and
`Authoring.md:212` still attributes the hotlink rule to `check.bat` when `:200` correctly
attributes the same rule to `build.bat`.

## Tier 2 — missing at the point of need

**9. The published docs never name the stylesheet you edit.** `grep -rn 'custom\.scss\|_sass'
docs/Documentation/` returns exactly one line — `Builder.md:442`, pointing at the *vendored*
theme SCSS. `docs/_sass/custom/custom.scss` and `_theme.scss` exist, carry all project
styling, and are named in no published page. UC-16 stalled after eleven navigation hops and
four failed searches; the answer was reachable only by grepping `builder/*.md`.

**10. The dark-compilation specificity trap is in no published page.** `main-content` has
zero occurrences across `docs/Documentation/`. It is the single most consequential fact for
anyone writing CSS here — the trap has shipped three times (footnote underline, `hr` margins,
`.section-links > ul`) — and it lives only in `WIP.md`, `PLAN-axe-perf.md:1653` and review
snapshots. `PLAN-REVIEW-c9f2dfe0-1b6922b.md:537` even says *"as the footnote rule already
documents"* — i.e. the project believes it is documented, in a source comment no reader sees.

**11. `Authoring.md` never says to register a new page in the indexes.** It covers
frontmatter, headings, formatting, typography, diagrams, images, attribution, callouts and
links — and has no step for listing the page. Several pages enumerate Core statements
(`Statements.md`, `Categories.md`, `twinBASIC-Additions.md`, `Permanent-Links.md`). Nothing
catches the omission: the link check verifies that links *resolve*, not that a page is
*listed*. `WIP.md`'s per-symbol workflow has this as steps 3 and 4.

*Corrected while fixing.* This review said all four enumerate *every* Core statement. They do
not, and the real rule is per page kind. Measured against all 92 `Reference/Core/`
permalinks: `Statements.md` 69, `Categories.md` 68, `Permanent-Links.md` 65,
`twinBASIC-Additions.md` only 12 — operators live in `Reference/Operators.md` rather than
`Statements.md`, and `twinBASIC-Additions.md` is tB-only by definition. Also found while
writing the section: `Permanent-Links.md` lists modules but not their members, so a runtime
function needs no edit there; `Enumerations.md` lists each enum **twice**; `Controls.md`
covers only the VB package; and `Reference/Packages.md` and `Reference/index.md` carry
package counts that a new package must bump.

**12. The `headingLevelNormalizePlugin` disarm trap is undocumented, and the docs are
actively reassuring about it.** `Authoring.md:148` says older pages *"are repaired
automatically at build time"*. The plugin fires only on a page using h1 and h3 and **no h2**
(`Pipeline-Stages.md:644`). **410 pages under `docs/` are currently in that state.** Adding a
single `##` to any of them disarms the normalizer for the whole page and converts every
pre-existing `###` into a live heading-order defect in one keystroke. Nothing says so, and
the deduction requires a builder API table a contributor has no reason to open.
`Authoring.md:148` also understates the plugin — *"raises an orphaned `h3` up to `h2`"*,
where it raises **every** heading of level ≥3.

**13. Alt text is never required for images, and the guide's own example taught the habit.**
`Authoring.md`'s Images section states no alt-text obligation; it appears only for diagrams
(`:180`) and videos (`:210`). Site-wide, of 248 markdown images, dozens carry a placeholder
name — `image`, `img` — and **11 across four files share the alt text "Create Package"**,
including images of a references dialog, a toolbox and an animated GIF. The source is
`Authoring.md:187`, the canonical example, whose alt text was copied verbatim onto ten
unrelated images. `Building.md:150-182` — the page documenting the contribution workflow —
uses `![img]` seven times. **All of them pass axe**, because `image-alt` asks whether a name
exists, not whether it describes the image.

*Corrected while fixing — this review overstated the count.* The **24 empty `![]()` images
are correct and must not be "fixed"**: each is a toolbar or tree icon immediately followed by
its own label in the same heading or list item (`## ![](Images/tB-Green.png) Windows Form`).
The icon is decorative and the accessible name is already carried by the adjacent text;
describing it would make a screen reader announce *"Windows Form Windows Form"*. One genuine
defect of that shape does exist: `docs/IDE/Project Explorer.md:39` is
`![Folder](Images/Folder.png "Folder") Add Folder`, which announces *"Folder Add Folder"*.

*Method note for any repeat of this work:* the image files are readable — PNG, JPG and GIF
render visually — and describing them from the surrounding prose instead produces confidently
wrong alt text. `Debugging.md:16` sits under a paragraph about the trace logger and shows the
Project Settings page; `IDE-Features.md:47` reads as a form-designer shot from its heading
and is an annotated whole-IDE screenshot carrying twelve callouts.

**14. `test/README.md` is an orphan.** Nothing links to it — not `README.md`, not
`builder/README.md`, not `Tools.md`. It is the only document covering `FIXTURE_EXPECTED`, the
build-order hazard, and the rule that a red fixture gate after a template change means *add
the stub asset, do not raise the expected count*. It is unpublished, so site search cannot
reach it either. For UC-15 it was the single best document in the corpus.

**15. The axe upgrade obligation is published at half strength.** *"Every axe-core bump must
re-run `check_a11y_fingerprint.mjs --patches plain-color-fields`"* lives only in
`PLAN-axe-perf.md:1480` and `perf/README.md:471`. The published pages mention only the
equivalence half (`Tools.md:213`). A reader following the site runs one of the two required
gates — and the fingerprint gate is the one that catches axe having changed its rule set.

**16. No page documents CI as a subject.** The workflows are reachable only as an aside in a
CLI-flag table (`Tools.md:62`). *"What runs in CI that does not run locally"* — the actual
question a contributor has — must be reconstructed from YAML. The PR target branch
(`staging`) is never stated to contributors; `Building.md:142-156` walks the whole PR flow
without naming it.

**17. `Extending.md` covers three extension points, and CSS is not one of them** — with no
pointer to where styling does live. Nor does it mention the a11y construct-family
registration that `Tools.md:158` requires when a plugin introduces new markup, so an author
following the plugin tutorial end to end ships a construct no axe rule covers.

**18. No remediation guidance for a failing diagram-fit check.** Four pages tell you
`check_dot_fit.mjs` fails; none says what to change — shorten the label, insert `\n`, set
`width=`, reduce `fontsize`. For a goal whose entire risk is a long label, that is the
missing half.

## Tier 3 — stale figures and internal contradictions

**19. `Tools.md` contradicts itself about `check.bat`:** `:35` *"Six steps"*; `:137` *"the
last of `check.bat`'s five steps"*.

**20. The accessibility sample size is stated three ways.** `Tools.md:137` — thirteen pages,
60 audits. `checks.yml:161` — *"eleven pages of ~1,160"*. `PLAN-checks.md:803` — *"11 then,
13 now × 2"*, giving 44.

*Corrected while fixing:* `Tools.md` was right — `axe-scan.mjs` gives 13 pages × 2 themes ×
2 viewports = 52, plus 2 state audits × 2 × 2 = 8, so 60. `checks.yml:161` was simply stale.
`PLAN-checks.md`'s 44 is **not** an arithmetic error: it is a genuine historical measurement
at 11 pages (11 × 2 × 2), matching the `× 44` rows in the table beneath it. Only the sentence
framing needed repair, not the figure.

**21. The link-check category count is stated three ways.** `PLAN-checks.md:260` — *"nine of
the ten categories"*. `test/README.md:22` — *"eight of the nine"*.
`REVIEW-c9f2dfe0-1b6922b.md:62` — *"seven of the nine"*.

**22. `Builder.md:301` says `SharedState` has five fields.** *Measured while fixing:* **ten**
— five declared on the class in `scheduler.mjs` (`pages`, `staticFiles`, `site`,
`pageByDest`, `searchChunks`) and five attached by tasks (`sitePaths`, `checkStubs`,
`checkTrees`, `checkChunks`, `checkChunkCount`). The table also credited `staticFiles` to
`dot.submit()` alone, where `vendorAssets.submit()` appends to it too.

**23. `Fixes.md:13` promises *"This section documents every change"* to patched third-party
libraries, and is silent on the axe patch.** It is the top search hit for *"axe fingerprint
patch"* and does not mention axe.

*Corrected while fixing:* the count of **two** is accurate, and this review's original claim
of a third in-tree library was wrong. `readAxeSource()` patches the bundle read from
`node_modules/axe-core` **in memory**; nothing is vendored. The real defect was the
completeness promise plus the omission, so the fix narrows the promise to those two files and
adds a paragraph naming the axe patch and both of its gates.

**24. `Building.md:30` says Chromium is required for two things** — the PDF book and the
accessibility scan. *Measured while fixing:* **four** need it — `check_dot_fit.mjs` and
`check_a11y.mjs` import puppeteer directly, `check_axe_patch_equiv.mjs` gets it via
`axe-scan.mjs`, and `book/render-book.mjs` imports it. A reader trusting the requirements
list will think three of `check.bat`'s six steps run without Chromium.

**25. `Extending.md:291` says *"fourteen in-tree plugins"*;** `render.mjs`'s export table
(`Pipeline-Stages.md:630-644`) lists four, omitting `videoLinkPlugin` and
`remoteImagePlugin` — the closest precedent for the plugin tutorial's own task.

*Corrected while fixing — the count was right and this review was wrong.* `render.mjs` makes
17 `md.use()` calls, 3 of them npm packages, so fourteen in-tree is exact. The defect was the
**next sentence**, claiming Pipeline-Stages *"lists them all under `render.mjs`"* when the
table carried 2 of the 14. Fixed by extending the table to all seventeen in registration
order, with a note that registration order is not execution order — the image-renderer chain
runs outermost first, so `remoteImagePlugin`, registered last, runs *before*
`svgInlinePlugin`, and `videoLinkPlugin` is not in that chain at all.

**26. `Authoring.md:192` says the build *"rewrites the page to point there"*.** It rewrites
the *render*; the source `.md` keeps the remote URL in git permanently — directly beneath the
bolded *"A finished page never references an image by a remote URL."* `WIP.md` words it
correctly: *rewrites the render*.

## Tier 4 — two gaps in the gates themselves

Neither is documentation drift. Both were found while verifying the above.

**A. `check_dot_fit.mjs` runs on pull requests but not on deploy.**
`.github/workflows/checks.yml:147` runs it; `tbdocs-gh-pages.yml` contains no `dot` match at
all. A diagram merged by any route other than a PR — a direct push to `staging`, a manual
dispatch — publishes without the only check that compares a label to its box. No document
records the asymmetry.

**B. The alt-text defect in finding 13 is invisible to every gate the project has.** `image-alt`
passes on all 72, and the thirteen-page sample would not reach the tutorial pages regardless.
This is the same shape as the publish-allowlist insight already in `WIP.md` — a green gate
proving less than it appears to — and it has not been applied to alt text.

## Not a finding — the Wisdom exception, now recorded

This review raised `docs/Documentation/Wisdom.md` as a candidate scope violation: it is a
published page that requires a *"**Claude Code session** — for Phase 3"* (`:25`), tells the
reader to *"tell Claude: 'Run the wisdom extract workflow'"* (`:58`), and specifies the agent
topology down to *"One Sonnet agent per group"* (`:277`), while the rest of the published
developer documentation assumes a contributor with an editor and a terminal.

**It is a deliberate exception and stays public.** Phase 3 *is* a set of Claude agents; there
is no manual mode to document. The underlying rule and its exception had never been written
down, which is why this review reached for it — both are now stated in `WIP.md` under
*"The published docs assume manual work — and Wisdom is the exception"*, including a note
that relocating the page has been considered and declined.

Recorded here so the next review does not raise it a third time.

## Scores

| UC | persona | complete | discover (nav) | site-search | action |
|----|---------|---------:|---------------:|------------:|-------:|
| 01 document a new statement | contributor | 2 | 4 — 1 hop | #1 | 3 |
| 02 add a screenshot | contributor | 3 | 4 — 2 hops | #1 | 4 |
| 03 remote image in a PR | contributor | 3 | 4 — 2 hops | #1 | 3 |
| 04 embed a video | contributor | 4 | 3 — 2 hops | #7 | 4 |
| 05 heading levels | contributor | 3 | 4 — 2 hops | #1 | 3 |
| 06 publish allowlist abort | toolchain | 3 | 2 — 10 hops | miss | 2 |
| 07 accessibility triage | toolchain | 3 | 3 — 3 hops | #4 | 3 |
| 08 edit a DOT diagram | toolchain | 3 | 4 — 1 hop | #2 | 3 |
| 09 deploy and CI delta | toolchain | 2 | 3 — 2 hops | #1 / miss | 3 |
| 10 preview a visual change | toolchain | 3 | 2 — 1 hop | miss | 3 |
| 11 fan-out build task | builder | 3 | 2 — 6 hops | #1 | 4 |
| 12 markdown-it plugin | builder | 2 | 4 — 3 hops | #1 | 3 |
| 13 upgrade axe-core | builder | 3 | 3 — 4 hops | #3 | 3 |
| 14 change the body font | builder | 2 | 1 — search only | miss | 3 |
| 15 link-checker parity | builder | 4 | 1 — 2 hops | **miss 4/4** | 3 |
| 16 CSS in both themes | builder | 1 | **0 — stall** | **miss 4/4** | 1 |

**Navigation and search fail on different cases**, so neither alone is a fair measure.
`Extending.md` is search rank #1 and six navigation hops (neither README links it).
`Tools#check-links-diff` is two navigation hops and missed by all four searches. The font
wiring and the CSS answer are unreachable by either.

`Authoring.md` is the strongest page in the corpus — four of its five cases scored
discoverability 4, and UC-04 rated it 4/4 on completeness. Findings 4, 11, 12, 13 and 26 are
defects inside an otherwise exemplary page, which is why they are worth fixing rather than
rewriting around.

## Method

Sixteen goal-shaped use cases across three personas. Ten carried a hazard the evaluator was
never told about; walking into it was the finding.

Each case went to an agent with no prior knowledge of the project, working against a
**mirror of the repository with all 221 executable files replaced by an unreadable stub**
(`.mjs .js .py .bat .ps1 .scss .css .json`) and with `WIP.md` withheld — so "the answer
exists only in the maintainer's private notes" became a measurable outcome rather than an
invisible rescue. Subagents were confirmed not to inherit `CLAUDE.md`.

Three discovery channels were measured independently: a cold guess before opening anything;
the **site's own search box**, replicated with the real lunr configuration, the real query
construction from the vendored `just-the-docs.js`, and the real 3,712-entry index; and
navigation from the root `README.md` by links and headings only. Full-text search was a last
resort and counted as failure of both reader-facing channels.

**Every finding above was re-verified by the orchestrator against the file.** Agent claims
are not reproduced on trust; several were corrected or dropped.

## Discounted

- Multiple agents reported dangling references to `WIP.md` from `_config.yml:85`,
  `PLAN-a11y.md:297`, `PLAN-checks.md:812` and `MonacoArchitecture.dot:7`. Corpus artifact —
  `WIP.md` is committed in the real repository. Worth noting only that public config and a
  content-tree `.dot` both defer to a file whose name says it is working notes.
- An agent's inference that `svg-inline.js` hardcodes font paths: not verified, excluded.
- UC-05's claim that zero pages mix `##`/`###` *and* skip a level relies on a setext-aware
  scan the agent ran but the orchestrator did not re-run. Recorded, not relied on.

## Found while fixing

Applying the fixes surfaced more than the review did, because fixing forces you into the
source. Recorded so the next pass starts from them.

1. **`PLAN-sab` carried three instances of the false FIFO claim, not one.** An entire section
   --- *§Draining messages before scanning* --- asserted "all pending merges complete before
   the scan", nineteen lines above the section that exists to refute it, and both it and
   *§Message handler* misstated the mechanism as `queueMicrotask` where the shipped
   `_scheduleMainScan` uses `setImmediate`. The worker-to-worker example also cited
   `render:i -> renderJoin`, which is `runOnMain: true` and not that shape at all.
2. **`renderJoin.execute()` is not a no-op.** It filters `state.pages` for a missing
   `renderedContent` and throws, naming the first five. The graph annotation calling it a
   "pure barrier" was wrong; the completeness-checks table was right.
3. **`checkChunks`' unindexed `push` is deliberate and correct.** `linkJoin` asserts a
   *count* --- `checkChunks.length !== checkChunkCount` --- so a pre-allocated array would
   report `length === N` from the outset and the short-chunk check could never fire. That is
   the mirror image of `searchChunks`, where indexed writes are mandatory because page order
   matters and `flat()` skips holes silently. Each is right for its own failure mode.
4. **`publish-policy.mjs`'s own refusal message had the same three-remedies gap as the two
   doc pages** --- and it is what a contributor reads at the moment their build aborts. Fixed
   on the source surface only: `refuse()` checks `declared` first, so a `bundle_extra` entry
   can never be what a *tree* refusal is about, and anything surviving to the tree sweep was
   minted by the build.
5. **The detached `{: .no_toc }` defect was site-wide across five files, and one was live.**
   `standaloneIalForwardPlugin` attaches a detached IAL *forward*, so the class landed on the
   next paragraph. On `CEF/index.md` that leaked `### Installing runtime files` into a
   rendered table of contents --- 8 entries before, 7 after.
6. **A `title` attribute defeats an empty alt.** Per HTML-AAM an `<img alt="">` maps to
   `role=none` only when it has no `title`; `![Folder](…, "Folder")` still announced
   *"Folder"*. All 25 correctly-decorative images in the repo carry zero titles.
7. **`check_links_diff.mjs` carried a second stale count** --- *"Four of the six cases"*,
   where `CASES` has eight. It predates `fixture-built` / `fixture-built-offline`.
8. **`checks.yml`'s DOT comment documented the wrong step.** Seventeen lines of Graphviz
   explanation read as documentation for the publish-allowlist step beneath them.
9. **The pull-request walkthrough screenshots are stale.** Two show `base: main`; one still
   shows *"Deploy Jekyll site to Pages"*. Not fixable by editing text.
10. **Two GitHub links that looked wrong are correct**, and this review nearly broke them.
    `tree/main` addresses `github.com/twinbasic/documentation`, the canonical publishing
    repository, whose default branch is `main` and which has no `staging` branch at all. The
    `staging` default belongs to this development fork. Two repositories, two default
    branches.

## Outcome

28 commits. `build.bat && check.bat` clean afterwards: both real trees 0 broken / 0
integrity, all six gates green, 0 accessibility violations across 13 pages x 2 themes x
2 viewports plus 8 state audits. The 14 `_site-pdf` findings are the pre-existing
informational ones and their count is unchanged.

Two prose rules were added to `WIP.md` and `Authoring.md` during the pass: **name the fault
directly, never build up to it**, and **`bites` (figurative)** in the substitutions table.
Both had spread from a single instance, which is the same mechanism that put one image's alt
text onto ten others.

Still open, and deliberately so:

- `docs/Miscellaneous/FAQs.md` has 13 placeholder alt texts, and five images carry raw
  GitHub attachment ids as their alt.
- The stale screenshots in finding 9 need re-shooting.
- `PLAN-axe-perf.md` still uses *bites* twice. It is a completed investigation record rather
  than reference documentation.
- `Project Explorer.md` has six icons whose alt is `Folder` followed by a *different* label
  --- informative rather than duplicative, so left as a judgement call.
