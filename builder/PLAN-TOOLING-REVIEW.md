# Tooling review: strategy, decisions and status

A software-engineering review of the repository's own tooling: `tbdocs`, the gates, the
compiler harness, the book renderer and the smaller tools. It asks about factoring and
repetition, and about sound design against hacks. That makes it a different kind of review
from [REVIEW-c9f2dfe0-1b6922b.md](REVIEW-c9f2dfe0-1b6922b.md), which asked whether one
range of commits was correct.

The findings are in [REVIEW-TOOLING-fe9ce12b.md](REVIEW-TOOLING-fe9ce12b.md). The commit
plan that addresses them is under [Execution](#execution), with a coverage table that maps
every finding to its commit.

## Status

- 2026-09-25: strategy agreed; review passes started against `fe9ce12b` on `staging`.
- 2026-09-25: all fourteen passes reported; verification running. Decisions 1 and 5 were
  settled further while the passes ran (below), and the four superseded pdf-lib shims were
  deleted. The passes also raised a theme the review will lead with: markdown is repeatedly
  processed as text, each tool deciding privately what counts as code.
- 2026-09-25: the review is written, [REVIEW-TOOLING-fe9ce12b.md](REVIEW-TOOLING-fe9ce12b.md),
  with its evidence beside it in [REVIEW-TOOLING-fe9ce12b/](REVIEW-TOOLING-fe9ce12b/README.md).
  The owner accepted all seven of its decisions as recommended (listed below). Decision (f),
  the `staging.md` content slip, is already fixed. Next: the commit plan, added to this file.
- 2026-09-25: the commit plan is written, under [Execution](#execution): 87 commits in seven
  phases. Planning against the tree turned up ten places where a finding's fix, one of its
  facts, or a detail of this charter had to change; see
  [Where this plan departs from the review](#where-this-plan-departs-from-the-review).
  No commit of it has landed yet; C01 is next. The owner confirmed the four commands that
  needed it (C05, C08, C09 and C40) the same day, C08 on condition that the hook runs Biome
  and nothing else.

## Decisions

Made on 2026-09-25, before the review started.

1. **`perf/` is a lab notebook, and nothing moves out of it.** It is not reviewed, linted
   or formatted. *Amended during the review:* the book build loads one file from it at run
   time, `perf/detach-pages.js`. Moving that file would break five lab scripts that load it
   from beside themselves, and touch several pages, so it stays; its header and
   `perf/README.md` now say that the book build depends on it. Four superseded pdf-lib
   shims that only `perf/` loaded (`fast-refs`, `fast-dict-array`, `fast-dict-iter`,
   `fast-parse-dict`) were deleted from `book/lib/` rather than moved: pdf-lib is pinned at
   its final release, so the comparisons they served are settled, their measurements are
   in `perf/notes/08-pdf-lib.md`, and git keeps the code.
2. **Fix in place first.** Splitting a large module is a separate pass after the in-place
   work, taken only where the evidence says good practice calls for it. The review records
   split candidates; it does not propose splits as fixes.
3. **The before-and-after tree comparison becomes a committed tool**, because every future
   `builder/` refactor needs it.
4. **A linter and a formatter run before every commit**, as a matter of course, with a gate
   in `test.bat` and both CI workflows as the backstop. **The linter comes first** (Phase
   0): it is most useful while code is being consolidated, when moved and deleted code
   leaves unused imports and undeclared names behind. **Formatting is a separate, last
   pass** (Phase 6), once every fix from the review is in. The review's citations stay
   valid while the fixes are made, and the one formatting commit touches only code that
   survived them.
5. **`impexp.py` and `impexp.mjs` both stay**: both are published for readers'
   convenience. **`build_fonts.py` stays**: a JavaScript port was evaluated recently and is
   blocked by harfbuzzjs ([WIP.Fonts.md](../WIP.Fonts.md)). **The standalone link checker
   stays, as a thin wrapper**: decided on A4's evidence. `scripts/check_links.mjs` keeps
   its command line and its own reading of a tree from disk, and calls the functions
   `builder/check.mjs` exports for everything else; `check_links_diff.mjs` then compares
   one implementation reading a tree two ways.
6. **A gate checks that both CI workflows run the same gates as the wrappers**, rather than
   generating the workflows and wrappers from one list.

Taken on the review's recommendations, 2026-09-25; the letters are the review's:

- **(a) One shared markdown module, in a new top-level `lib/`**: markdown-it block regions,
  one tested inline-code splitter, and a frontmatter splitter on js-yaml 4. gray-matter, and
  the js-yaml 3 it bundles, are dropped. The five rewriting sites move onto it before the ten
  scanning sites.
- **(b) A parity gate for `impexp.mjs` and `impexp.py`**, run unconditionally in CI. Whether
  `test.bat` then requires Python or reports the gate as skipped, loudly, is settled when the
  gate is written.
- **(c) Load-time checks in each pdf-lib shim, and an equivalence test against stock
  pdf-lib**, modelled on the axe patch and `check_axe_patch_equiv.mjs`.
- **(d) A composite CI action for the two workflows' shared steps**, after the roster gate of
  decision 6.
- **(e) Command lines:** Phase 2 builds `scripts/lib/cli.mjs` on `node:util` `parseArgs` with no
  change in behaviour; Phase 3 converges on `impexp.mjs`'s discipline (`--help` to stdout and
  exit 0, errors to stderr and exit 2, one table of exit codes per tool).
- **(f) The `staging.md` content slip is fixed now**, as data, ahead of the tooling.
- **(g) The pinning policy is stated** (exact where the code patches a dependency or relies on
  its internals, caret otherwise), and Builder.md's stale Dependencies section is fixed.

## Scope

| Area | Size | Treatment |
|---|---|---|
| `builder/` (tbdocs) | ~16.5k lines | full review |
| `scripts/`, `scripts/lib/` | ~18.7k | full review |
| `book/` renderer and pdf-lib patches | ~4.4k, not counting the 33k-line paged.js fork | full review |
| `test/addin/`, `eval/`, `wisdom/` | 1.5k, 1.0k, 2.4k | lighter review |
| the `.bat` wrappers and both workflows | ~0.9k | reviewed together, as the list of gates |
| `docs/assets/js/` | 0.4k | lighter review; it ships to readers |
| `perf/` | 8.8k, 49 files | not reviewed (decision 1) |
| vendored code: `book/lib/paged.browser.js`, `builder/vendor/` | | not reviewed; only whether our changes to it are recorded |

## Baseline survey

Taken at `fe9ce12b` with [`scripts/survey_tooling.mjs`](../scripts/survey_tooling.mjs), to
be re-run when the work is done: a token-level clone detector (identifiers and literals
normalised, windows of 60 tokens) and an import graph over the 185 first-party JavaScript
files, `perf/` included and vendored code excluded. `--summary` prints the first six rows;
`--root` measures a checkout of `fe9ce12b` itself, which does not contain the script.

| Measure | At `fe9ce12b` |
|---|---|
| clone regions of 60+ tokens | 680, of which 318 do not involve `perf/` |
| top-level function names defined in two or more files | 77, of which 57 outside `perf/` |
| command-line tools outside `perf/` that read `process.argv` | 32, none using `node:util` `parseArgs` |
| tools with a private copy of `flag`/`opt`/`die` | 6, with `opt` in three different versions |
| packages imported but not declared | 2: `picocolors` (installed for `@babel/code-frame`), `pako` (for `pdf-lib`) |
| clone regions by pair of areas: `builder`/`scripts`, `scripts`/`scripts`, `builder`/`builder` | 55, 95, 39 |

Observed by hand at the same commit:

| Observation | At `fe9ce12b` |
|---|---|
| places that state which gates run | 5 that execute (three `.bat` files, two workflows), plus Tools.md |
| lint or format tooling | none |
| line endings | LF in the repository; CRLF in 118 of 140 working-tree files under `core.autocrlf=true`; no `.gitattributes` |
| quote style | double in `builder/`, `scripts/`, `test/`, `eval/`; single in `book/`, `wisdom/`, `perf/` |

## How the review is run

### Passes

The last review split its passes by area, and that misses repetition between areas, which
is where much of what the survey found sits. So there are two kinds of pass. An **area
pass** asks about design inside one part. A **lens pass** follows one concern across the
whole tree. All passes run on Sonnet; the orchestrator reconciles them and judges.

| Pass | Subject | Scope |
|---|---|---|
| A1 | build orchestration and scheduling | `builder/`: `tbdocs`, `scheduler`, `sab-scheduler`, `sab-broadcast`, `cpu-worker`, `worker-pool`, `serve`, `gantt`, `build-info`, `discover`, `data`, `paths` |
| A2 | output stages and auxiliary outputs | `builder/`: `write`, `offline`, `offline-rewrite`, `redirects`, `sitemap`, `search`, `compress`, `scss`, `vendor-assets`, `counts`, `publish-policy`, `page-baseline`, `symbol-baseline`, `symbols` |
| A3 | the Markdown dialect and page templates | `builder/`: `render`, `highlight`, `highlight-theme`, `template`, `seo`, `nav` |
| A4 | link and integrity checks, and the two-checker question | `builder/`: `link-check`, `check`, `check-tree`; `scripts/`: `check_links`, `check_links_diff`, `crawl_check`; `test/fixtures/` |
| A5 | site-reading gates, accessibility, diagrams | `scripts/lib/axe-scan`, `check_a11y`, `check_a11y_fingerprint`, `check_axe_patch_equiv`, `pick_a11y_sample`, `sweep_a11y`, `check_dot_fit`, `build_dot_metrics`, `check_tree_fresh`; `builder/`: `dot`, `dot-metrics` |
| A6 | the gates as a system, and the `test.bat` gates | the seven `.bat` files, both workflows, `check_gate_lists`, `check_publish_policy`, `check_regex_safety` with `lib/regex-fold`, `check_code_regions` with `lib/markdown-files`, `check_page_baseline`, `check_book_coverage`, `check_symbol_index`, `convert_em_dash_separators` |
| A7 | the compiler harness | `scripts/lib/tb-*` with `tb-launch.ps1`, `tbbuild`, `tbrun`, `addin_test`, `check_tb_registry`, `test/addin/` |
| A8 | sample compiling and the package API | `check_examples`, `lib/tb-fences`, `gen_attribute_probes`, `builder/census_attributes`, `build_package_api`, `lib/twin-api`, `lib/tb-packages` |
| A9 | the book pipeline | `book/render-book`, `book/lib/` except the fork, `builder/book`, `builder/pdf`, `book.bat`, and whatever the book build loads from `perf/` |
| A10 | smaller tools and the site's scripts | `eval/`, `wisdom/`, `scripts/impexp.mjs`, `scripts/build_fonts.py`, `docs/assets/js/` |
| L1 | command-line and process conventions | every entry point outside `perf/` |
| L2 | paths, configuration, file walking, dependencies | the whole tree outside `perf/` |
| L3 | browsers, child processes, and rewriting HTML and Markdown as text | the whole tree outside `perf/` |
| L4 | the survey's duplicate-code leads | the clone list, outside `perf/` |

A verifier, also on Sonnet, then re-reads every R1 and R2 citation against the source. The
orchestrator merges findings that more than one pass reported, and writes the review.

### What counts as a finding

Five kinds:

- **dup**: two or more implementations of one thing. Worst when the copies have already
  diverged, because the divergence is a latent bug.
- **hack**: a workaround that fails one of the three tests below.
- **struct**: a module doing several unrelated jobs, a module in the wrong place, a
  dependency pointing the wrong way (production code loading from `perf/`), or a missing
  seam where a test would need one.
- **conv**: conventions that differ between tools for no reason: flags, help, exit codes,
  output streams, error reporting.
- **dead**: superseded code, unused exports, dead flags, comments naming files that have
  moved.

**A workaround is acceptable when it passes three tests.** It is *contained*: in one place,
behind one interface. It is *guarded*: if what it works around changes, something fails
loudly; the axe patch and `check_axe_patch_equiv.mjs` are the model. It has a *stated
exit*: the condition under which it can be removed. A workaround that fails any of the
three is a finding, and so is one whose recorded reason no longer holds.

**A recorded decision is not a finding.** This codebase explains itself in header comments,
in the `WIP.*.md` casebooks and in `builder/PLAN-*.md`. Before calling anything a hack or a
duplication, look for its recorded reason. Report it only if the reason does not cover what
the code actually does, or its premise has expired, and cite where the reason is.

**Severity is by cost:**

- **R1**: has already produced a divergence or a defect, or will on the next ordinary
  change: copies that disagree, a list maintained by hand in several places.
- **R2**: makes every change in its area slower or riskier: a helper edited in several
  places, a module too large to hold in mind, a missing seam.
- **R3**: local untidiness.

Size alone is not a finding. A large module is reported as a *split candidate*, with
evidence of what its size costs (decision 2).

### Rules for every pass

- **Read-only.** Create, modify or delete nothing in the repository. Scratch files go only
  in the session scratchpad.
- **Run nothing that writes outside the scratchpad, starts a browser or starts an IDE.** No
  `build.bat`, `serve.bat`, `check.bat`, `test.bat` or `book.bat`, and no
  `node builder/tbdocs.mjs`: it writes `docs/_site*` and can rewrite the committed
  baselines. No `examples.bat`, `addin-test.bat`, `tbbuild`, `tbrun`, `build_package_api`,
  `census_attributes`, `gen_attribute_probes` or `check_tb_registry`: a harness run starts
  an IDE and changes the registry, and two must never run at once. No network, no
  `npm install`.
- Allowed: reading, `grep`, `git log` / `show` / `blame`, and small Node scripts in the
  scratchpad to test a hypothesis, including importing a repository module that does
  nothing on import. These gates are read-only and may be run on their own:
  `check_gate_lists`, `check_publish_policy`, `check_code_regions`, `check_page_baseline`,
  `check_book_coverage`, `check_symbol_index`, `check_regex_safety`, and
  `check_examples --census`.
- **Cite `path:line` and the enclosing function or constant.** Line numbers will move
  before the last fixes land.
- Stay in scope. Anything seen outside it goes under *Cross-area leads*.
- Be complete on findings and brief in prose.

### Output format for a pass

```
## <pass> -- <subject>

### Findings
<pass>-<n>. [R1|R2|R3] [dup|hack|struct|conv|dead] <one-line statement of the fault>
  Where: <path:line (function)>, ...
  Recorded reason: <where, and what it says> | none found (looked in: ...)
  Cost: <the divergence that already happened, or what it makes harder>
  Fix in place: <the change; name any shared module it needs>
  Verify by: <which oracle below>
  Size: S | M | L

### Split candidates
<module> -- <the separate jobs it does, and what its size costs; evidence>

### Verified sound
<what was examined and found fine, one line each, with why>

### Cross-area leads
<observations outside this pass's scope, for another pass>
```

## Oracles

The existing gates check the site, not how the tools behave inside, so each refactor is
compared before and after:

| Tool | Comparison |
|---|---|
| `tbdocs` | `scripts/compare_trees.mjs` (C02, decision 3): build before and after into scratch `--dest` folders with `--no-fetch-assets`; the three trees must match byte for byte. The first step is to show that two builds of one commit already match. Known differences are normalised, each for a stated reason, rather than excluded: the build's own timings in `assets/images/gantt.svg` and in the copy of that chart inlined into `Documentation/Development/BuildInfo.html` in the online and offline trees, and the commit and date on the PDF title page, which differ only when the two sides are different commits. |
| gates | The same output on the real tree; and a changed gate must still fail when its original defect is put back. |
| harness | The `examples.bat` summary unchanged (1,119 samples) and `addin-test.bat` green, against the local BETA 983. Never two harness runs at once. |
| book | Page count, outline and extracted text unchanged; the PDF's bytes include timestamps. From C66, `check_pdf_shims_equiv.mjs`, which compares the shimmed pdf-lib with stock, is the oracle for the shims. |
| command lines | From C47, `check_cli.mjs`'s recorded cases: each migrated tool's exit code, stream and message for the invocations that stop during argument parsing. |
| CI | For a commit that changes a workflow or the composite action: a dispatch of `checks.yml` on `origin`, and the deploy workflow's own run on the next push of `staging`. A dispatch of the deploy workflow cuts a GitHub release, so it is not a test. Pushing is the owner's call, so these commits wait for it. |

## Execution

Each phase lands as commits on `staging`, the working branch, which is merged upstream when a
chunk of work is done. The commits below are numbered in the order they are meant to land. A
commit that needs a follow-up takes a letter (C07a) rather than renumbering the rest; when one
lands, its heading gains the hash, and a **Landed** note records anything that differed from
the entry, as in [PLAN-REVIEW-c9f2dfe0-1b6922b.md](PLAN-REVIEW-c9f2dfe0-1b6922b.md). Line
numbers are the review's, at `fe9ce12b`, and move as the commits land.

### The organising idea

Three things decide the order.

**Nothing is refactored before the oracles exist.** Most commits below claim to change no
behaviour, and such a claim is only as good as the comparison behind it. Phase 0 builds the
tree comparison and shows that two builds of one commit already agree, then the roster gate
and the linter, before any finding is touched.

**Defects are fixed in place before code is shared.** Phase 2 promises no change in
behaviour. A defect still present when its tool moves onto a shared module is either
preserved by the move, where the comparison approves it, or fixed inside the move, where the
comparison reports a difference that is not a regression. So Phase 1 fixes, in place and
each against its own oracle, every R1 defect whose fix does not wait on a Phase 2 module, and
Phase 2's comparisons have one right answer: identical. Twelve of the twenty R1 findings are
closed by the end of Phase 1, and L3-3's silent drop is made loud there. The other seven are
duplications whose fix is the shared module itself. Five of them change nothing on today's
content (A3-1, A3-3, A8-1, A10-2, L4-10), and the other two are conventions rather than wrong
results: A5-1's ignored typo and A6-1's indentation.

**Rewriters before scanners, `tbdocs` last, the roster gate before the shared action.**
Decision (a) moves the five markdown rewriters before the ten scanners, because a wrong region
in a rewriter corrupts committed content. Decision (e) migrates `tbdocs`'s command line last.
Decision (d) builds the composite action only once the roster gate can check it, and building
both before the first new gate means every later gate is registered once and checked from
then on.

### Phase order

| Phase | Commits | Why here |
|---|---|---|
| 0: process and oracles | C01–C08 | Every later commit is judged by them. |
| 1: remove, relocate, fix in place | C09–C30 | Dead code goes before anyone factors it; two moves the later modules need; the defects that need no Phase 2 module, so that Phase 2's comparisons have one right answer. |
| 2: shared code, no behaviour change | C31–C70 | The review's duplications, one shared module at a time, each adopted under the tree comparison or the tool's own oracle. |
| 3: conventions users see | C71–C75 | Behaviour changes on purpose, once every tool parses its command line through one module. |
| 4: splits | C76–C81 | Only where the evidence holds (decision 2). |
| 5: documentation and measurement | C82–C83 | Written against the code as it then is. |
| 6: formatting | C84–C87 | Last, so the one mechanical commit touches only code that survived. |

Four commits wait for the owner before a command runs: C05, C09 and C40 change installed
packages, and C08 changes this clone's git configuration. All four were confirmed on
2026-09-25, C08 on condition that the hook runs Biome and nothing else. The commits that change a workflow
or add a gate to one (C03, C04, C06, C47, C62, C66, C70, C87) wait for the owner's next push
before CI can confirm them.

### Where this plan departs from the review

Planning against the tree turned up places where a finding's stated fix does not fit the code,
or where the charter's own details were short. None changes a decision; each changes how one
is implemented.

1. **A command-line error in `tbdocs` cannot exit 2 (L1-4).** `tbdocs` reports link failures
   as 1, integrity failures as 2 and both as 3 (`tbdocs.mjs:1563-1570`), so a usage error at
   2 reads as an integrity failure. `check_links.mjs` has the same scheme and already returns
   2 for its three argument errors (`:384,399,403`), which the review did not list. C18 gives
   a command-line error one value outside the bitmask, the same in both tools.
2. **`builder/` cannot import `isOutputTree` (L2-1).** `serve.mjs` is in `builder/`, which
   must not import `scripts/` (`render.mjs:383`), and `isOutputTree` is in
   `scripts/lib/markdown-files.mjs`. C12 moves that module into the new top-level `lib/`
   first. For the same reason `cli.mjs`, onto which decision (e) migrates `tbdocs`, and the
   repository-root helper, whose nineteen callers (L2-5) include two in `builder/`, go in
   `lib/` rather than `scripts/lib/`. `lib/` holds modules that any part of the tree may
   import, and it imports none of them.
3. **`withBrowser` goes in `scripts/lib/browser.mjs`, not `axe-scan.mjs` (L3-1).** The two
   diagram tools need the same browser lifecycle (A5-5) and have no other reason to load the
   accessibility module.
4. **The tree comparison normalises three regions, not two.** `injectGanttChart`
   (`tbdocs.mjs:1312`) also inlines the chart into `Documentation/Development/BuildInfo.html`
   in the online and offline trees, so excluding `assets/images/gantt.svg` alone would fail
   every comparison. The PDF title page's commit comes from `git rev-parse --short HEAD`
   (`build-info.mjs`), so it differs only when the two sides are different commits.
5. **The pinning policy has to cover the linter (decision (g)).** Worded as the review words
   it (exact where the code patches a dependency or relies on its internals), it does not
   explain the exact pin decision 4 gives Biome, which patches nothing: the reason there is
   that a new version changes the gate's verdict on unchanged code. C01 words the policy to
   include that.
6. **A dispatch of the deploy workflow is not a test.** It cuts a GitHub release
   (`tbdocs-gh-pages.yml`'s `release` job). A commit that changes the workflows is checked by
   a dispatch of `checks.yml` on `origin` and by the deploy workflow's run on the next push of
   `staging`, which is the owner's to make. The Oracles table now says so.
7. **The command-line defects are fixed before `cli.mjs` exists (L1-2, L1-3, A7-5).** The
   review's fix for each is the shared module, but decision (e) makes Phase 2 change no
   behaviour, so C17 fixes them in place first. L3-3 likewise gets a loud failure in Phase 1
   (C26), ahead of the fence-aware split (C36).
8. **`check_tb_registry.mjs`'s missing crash handler changes an exit code** (a crash goes
   from 1 to 2; L1-11), so it is fixed with A5-2's two tools in Phase 1 (C28), not in the
   helper commit that must change nothing (C43).
9. **L1-10 closes as a side effect.** `node:util` `parseArgs` accepts `--name=value` for
   every option and cannot be told not to, so this is the one behaviour change Phase 2's
   migrations make, and it only adds a form.
10. **Three of the review's facts were wrong**, found by proofreading this plan against the
    source. `check_tree_fresh.mjs`'s `IGNORED_FILES` has three entries, not one only for
    `census_attributes.mjs`, so C10 removes that entry and keeps the other two (A8-2);
    `offline.mjs`'s unused re-export block has 32 names, not 24 (A2-1); and
    `check_examples.mjs`'s probe suite has 119 probes, of which 74 are the inline ones the
    review counted (L4-10).

## Phase 0: process and oracles

Before any finding is fixed.

### C01 — `docs: state the dependency pinning policy, and correct Builder.md's list`

**Decision (g).** `docs/Documentation/Builder.md`'s Dependencies section omits `recheck`,
gives `@hpcc-js/wasm-graphviz` as `^1.21` where `package.json` has `^1.29.1`, and names
`axe-core` as the only exact pin where four are exact (`axe-core`, `pdf-lib`, `puppeteer`,
`recheck`). The last review fixed the same drift once, in `74b3395`.

**Change.** Correct the section against `package.json`. Give each exact pin its recorded
reason, cited where it is recorded rather than restated. State the policy in one sentence:
exact where the code patches the dependency or relies on its internals, or where a new
version would change a gate's verdict on unchanged code; caret otherwise. From here on, a
commit that changes `package.json` updates this section in the same commit (see the bar).

**Verify.** Every row re-read against `package.json` and `package-lock.json`; `build.bat`
for the page.

**Landed**, saying two things the entry does not. The paragraph under the package list also
credited `htmlparser2` to the PDF renderer, where only the link checker and `crawl_check.mjs`
import it; the rewrite says what each package is for, the four it never mentioned (`gray-matter`,
`js-yaml`, `fast-glob`, `recheck`) included. And the policy had to explain why
`@hpcc-js/wasm-graphviz` floats although `dot-metrics.mjs` patches it: the patch finds Graphviz's
width table by an exact signature and fails the build when a release moves it, so the caret is
a decision, and the section says so. The exact pins cite `PLAN-axe-perf.md`, `08-pdf-lib.md`,
the change that pinned `puppeteer` with `pdf-lib`, and WIP.Build.md's note on `recheck`'s
Windows backend. The JSON block now matches `package.json`'s `devDependencies` exactly.

### C02 — `scripts: compare_trees.mjs, the built trees before and after a change`

**Decision 3.** The oracle for every `builder/` commit below.

**Change.** A tool, not a gate.

- The *before* side is built from a temporary `git worktree` at `--before <ref>` (default
  `HEAD`), with `node_modules` linked to this checkout's; the *after* side is the working
  tree. Both run `node builder/tbdocs.mjs --src docs --dest docs/_site-cmp-<side>
  --no-fetch-assets` with `CI=1` in the environment, so the page and symbol baselines are
  read and never written (`tbdocs.mjs:1589`); the only other reader of `CI` is the asset
  fetch, which the flag already turns off. Arguments after `--` go to both builds; C53
  needs a `--baseurl` build.
- All three tree pairs are compared file by file: missing, extra and differing files, with
  the first differing lines of a text file. Exit 0 identical, 1 different, 2 the tool failed.
- Known differences are normalised, each with a stated reason, never excluded wholesale: the
  timings in `assets/images/gantt.svg` and in the copy of that chart inlined into
  `Documentation/Development/BuildInfo.html` (both trees), and the commit and date on the PDF
  title page.
- `--keep` leaves the trees and the worktree for inspection; otherwise both are removed.
  `docs/.gitignore`, which names each output tree, gains the `_site-cmp*` trees.
- A Tools.md entry; WIP.Build.md names it as the oracle for a `builder/` change.

**Verify.** First the A/A run the charter asks for: `HEAD` against a clean working tree must
be identical after normalisation. Anything else it finds is either given a reason and a
normaliser, or fixed as nondeterminism. Then a one-character change to a template must show
in all three trees. Record how long a comparison takes.

**Landed, with the after side built from a checkout too.** The entry's design, the working
tree built in place against a worktree at `HEAD`, failed its first run on eleven files that
were not differences. Under `core.autocrlf` a fresh checkout writes CRLF, while files a tool
has rewritten in this working tree hold LF, and everything the build copies verbatim (the
impexp downloads, the font licences, `theme-toggle.js`, a committed diagram `.svg`) differed by
line endings alone. So the after side is a second worktree, at a commit object made from the
working tree through a copy of the index: `git add -A` into the copy, `write-tree`,
`commit-tree`, with fixed identities. Neither the real index nor any file changes, untracked
files that are not ignored are included, and both sides get the same line endings.

Both worktrees live under `.compare-trees/` at the repository root, which the root `.gitignore`
names, rather than `docs/_site-cmp*`; Node finds `node_modules` by walking up from them, so
nothing is linked. The PDF title page's normaliser covers the whole build line, which holds the
build's wall-clock date as well as the commit. A comparison takes about ten seconds.

Verified at `b0612a46`. The A/A run, `HEAD` against a clean tree, found all 3,055 files
identical across the three trees, with the three regions normalised and nothing else. **The
entry's test, that a one-character template change shows in all three trees, was wrong about
the trees.** A change to the generator tag in the page head reached all 913 online pages and no
offline one, because the offline pass removes the whole SEO block (`offline-rewrite.mjs`'s
`stripSeo`); a change to the skip link's text reached 913 pages in each of the online and
offline trees; neither touched the PDF tree, because `book.html` is assembled from each page's
rendered content, not from the page template. A page edit reaches all three: C01's change to
`Builder.md` showed in both trees' `Builder.html`, both search indexes and `book.html`.

### C03 — `scripts: check_ci_workflows.mjs, the workflows against the wrappers' gates`

**Decision 6, A6-4 (R2).** Nothing reads either workflow to confirm it runs the gates the
wrappers run. Today the two workflows' twelve shared gate steps are identical and in the same
order, and the workflows differ only in three recorded ways.

**Change.** As A6-4's design in the ledger:

- `scripts/lib/gate-roster.mjs` generalises `check_gate_lists.mjs`'s `gatesFromBat`
  (`:111-118`) to read a wrapper or a workflow's `run:` steps. `check_gate_lists.mjs` moves
  onto it unchanged.
- `scripts/check_ci_workflows.mjs` compares (1) each workflow with the wrappers' roster:
  `test.bat` and `check.bat`, less `check_tree_fresh.mjs`, which CI does not need because it
  builds in the same job, plus the recorded CI-only `check_links_diff.mjs` steps; (2) the two
  workflows with each other; and (3) the build step's critical flags, `--check-audit-index`
  and `--no-fetch-assets`. An allowlist holds the recorded deltas, each with where it is
  recorded: `checks.yml`'s fixture-built link-checker step, the deploy build's `--url` and
  `--baseurl`, and the deploy-only steps. Order is compared within each wrapper's own gates.
  CI already interleaves the two wrappers' gates, running `check_axe_patch_equiv.mjs` among
  `check.bat`'s, and that stays allowed.
- Probes ride along: a missing gate, an extra step, two gates reordered, a missing
  `--check-audit-index`, and the allowlisted deltas, which must not fire.
- Registered in `test.bat`, both workflows, Tools.md's numbered list, which
  `check_gate_lists.mjs` requires, and WIP.md's gate table.

**Verify.** Clean on the real tree; each probe fails as intended; a scratch copy of
`checks.yml` with one gate step deleted fails. `check_gate_lists.mjs`'s 18 probes unchanged.
CI waits for the owner's push.

**Landed**, somewhat wider than the entry. The gate compares each gate's arguments as well as
its name, since `pick_a11y_sample.mjs` without `--check` is a different gate; it reports an
allowance that no longer matches anything, so the allowlist cannot quietly outlive its reason;
and it reads the build flags as quoted tokens, because the deploy build's `--url` value is
`'${{ steps.pages.outputs.origin }}'`, spaces included. Its probes number 13, on a synthetic set
of wrappers and workflows rather than copies of the real files, so that they mean the same
whatever state the real ones are in; two of them assert that CI may interleave the two
wrappers' gates alike and may not interleave them differently.

With `check_code_regions.mjs`'s step deleted from the real `checks.yml` (restored from git
afterwards), it reported the missing gate and the two workflows parting at step 5, and exited
1. Registering it found one more place restating `test.bat`: `check_gate_lists.mjs` failed on
`Building.md`'s POSIX command block until the new gate was added there too. `test.bat`'s header
and WIP.md now name a wrapper or a workflow among the changes that call for `test.bat`.

### C04 — `ci: one composite action for the gates both workflows run`

**Decision (d).** After the roster gate, so the action is checked from its first commit.

**Change.** `.github/actions/run-gates/action.yml` holds the steps both workflows share, in
their current order, each with its comment, and both workflows call it. `checks.yml` keeps
its fixture-built step; the deploy workflow keeps its build flags and its deploy steps.
Whether the setup steps join the action (`checks.yml` installs in three steps, the deploy
workflow in one) is decided here. `check_ci_workflows.mjs` reads through
`uses: ./.github/actions/run-gates` and gains two probes: a gate missing from the action, and
a workflow that stops calling it.

**Verify.** The roster gate and its probes. CI: a dispatch of `checks.yml` on `origin`, and
the deploy workflow's next run.

**Landed.** All thirteen shared steps moved, the standalone link checker's included, so
`checks.yml` runs its fused fixture step after the action, with its comment saying which step
it now follows. The setup steps stay in each workflow: a local action cannot be used before
the repository is checked out, and the two workflows' installs differ only in how many steps
they take. The action has one comment per gate, merged from the two workflows'. `checks.yml`'s
were the long ones, and three facts only the deploy workflow's comments had are kept:
`check_dot_fit.mjs` runs after the build because `dot.mjs` rewrites a stale `.svg` in place,
Chromium is already installed for the PDF render, and the deploy run is the one place a change
pushed straight to `staging` meets the gates.

`check_ci_workflows.mjs` reads a step that uses a local action as that action's own steps, and
reports one it cannot read; its probes are 17. With `pick_a11y_sample.mjs`'s step removed from
the action, it reported that gate missing from both workflows and exited 1. `Extending.md`'s
rule for registering a gate goes from four places to three, and names both checks that enforce
it. **The cost:** GitHub shows a composite action as one step, with each gate as a named group
inside its log, so a failure reads as "Run the gates" until the log is opened.

### C05 — `lint: Biome, correctness rules only, and the fixes it finds`

**Decision 4**, first half. The linter comes first because moved and deleted code leaves
unused imports and undeclared names behind, and Phases 1 and 2 move and delete a lot.

**Change.**

- Evaluate first, and record the result in the Landed note. Run Biome's defect-finding rules
  (its correctness and suspicious groups) over the scope, counting findings and false
  positives in three kinds of code: Node modules; the two browser scripts in
  `docs/assets/js/`; and the functions passed to `page.evaluate`, which sit in Node files
  but run in the browser. If Biome cannot tell these apart without blanket suppressions, use
  ESLint (`eslint`, `@eslint/js`, `globals`) under the same rules.
- Install it pinned to an exact version, after the **owner's confirmation**, and add its row
  to Builder.md's Dependencies.
- One configuration at the root. Scope: `builder/`, `scripts/`, `book/`, `eval/`, `wisdom/`,
  `test/`, `docs/assets/js/`. Excluded: `perf/`; the vendored code
  (`book/lib/paged.browser.js`, `builder/vendor/`); `book/lib/outline.mjs` and
  `postprocesser.mjs`, which the review found to be attributed, unmodified ports of
  `pagedjs-cli`, to be treated as vendored; the generated JSON (the two baselines,
  `package-api.json`, `inter-metrics.json`); `package-lock.json`; every Markdown, SCSS, YAML
  and `.bat` file. The formatter stays off until Phase 6.
- Findings with a mechanical fix are fixed here. A rule whose findings need design work
  starts disabled, with a comment naming the phase that enables it.

**Verify.** Lint clean over the scope. The tree comparison identical, since the fixes touch
`builder/`. `test.bat` and `check.bat` clean.

**Landed** with Biome 2.5.14, exact. Its first run over the scope, with the recommended
correctness and suspicious rules, found 106 diagnostics in eleven rules:
`noAssignInExpressions` 20, `noInnerDeclarations` 19, `noUnusedFunctionParameters` 17,
`noUnusedVariables` 17, `noTemplateCurlyInString` 10, `useIterableCallbackReturn` 7,
`noUnusedImports` 5, `noControlCharactersInRegex` 4, `noGlobalIsNan` 3,
`noShadowRestrictedNames` 1, and two `useBiomeIgnoreFolder` notes on the configuration itself.
None fired on a browser global inside a `page.evaluate` body, so the three kinds of code need
no separate treatment and ESLint was not needed. It checks the scope, 136 scripts, in about
100 ms.

`biome.jsonc` turns two rules off, each with its reason: `noAssignInExpressions`, because
`while ((m = re.exec(s)))` is how this tree walks a regex's matches, and
`noTemplateCurlyInString`, because strings here hold Actions, PowerShell and JavaScript source
whose `${...}` is literal. `noInnerDeclarations` is off only for `docs/assets/js/`, whose
ES5-style scripts ship as written. Biome 2.5 replaced the `recommended` field with `preset`,
which the configuration uses. **One file is outside the entry's scope:**
`wisdom/extract/workflow.mjs` ends in a top-level `return`, because the agent Workflow engine
runs it as a function body, and no module parser accepts that. It is excluded, and
`check_regex_safety.mjs` still reads its regexes, through acorn's `allowReturnOutsideFunction`.

The other 54 findings are fixed, or suppressed with a reason. Five unused imports went, and
sixteen unused parameters of fixed callback signatures gained an underscore. Seventeen unused
variables were deleted, among them `census_attributes.mjs`'s `declLine`, assigned on two paths
and never read, and `cpu-worker.mjs`'s `idMapping`, which no worker reads. `measure-pass.mjs`
uses `Number.isNaN`, the same test there, since `parseNumberOrRefCapture` returns only a
number or `NaN`. `twin-api.mjs`'s `unescape`, which shadowed the global, is `unbracket`. Seven
`forEach` callbacks no longer return their expression's value. The two regexes whose control
characters are intended, the code mask's NUL delimiter and `impexp.mjs`'s test for the
characters Windows forbids in a file name, say so in a `biome-ignore` comment. **Two findings
are suppressed rather than fixed**, on the owner's decision: `offline.mjs`'s
`writeOfflinePages` and `writeOffline`'s `precomputed` parameter are A2-1's dead code, and
C14, which deletes them, now removes the two comments as well and moves the function's account
of the nav-block cache into `cpu-worker.mjs`. The main thread still posts `idMapping` to every
worker, and C14 now deletes that too.

The tree comparison could not be identical, because the commit edits `Builder.md`, the site's
two scripts, and `scripts/impexp.mjs`, which the site publishes as a download. Those are the
only differences: `Builder.html`, the search index and `book.html`; `svg-inline.js` and
`theme-toggle.js`, whose four `catch (e)` became `catch (_e)` to stay ES5; and the
`impexp.mjs` download, whose readers now see its new comment. Every other change built
identical output.

### C06 — `scripts: check_lint.mjs, a lint gate in test.bat and CI`

**Decision 4.** The backstop for C08's hook.

**Change.** `scripts/check_lint.mjs` runs the pinned linter over the configured scope and
follows the gate convention: 0 clean, 1 findings, 2 the linter failed. It sits early in
`test.bat` (no tree, no browser), and goes in the composite action, Tools.md's numbered list
and WIP.md's gate table. WIP.md gains the rule: lint before every commit.

**Verify.** Clean on the tree; an unused import exits 1; a broken configuration exits 2. The
roster gate passes. CI waits for the owner's push.

**Landed** with two things the entry did not foresee, both about what Biome's exit code
means. **Biome 2.5 reports `noUnusedImports` and `noUnusedVariables` as warnings, and exits 0
on warnings**, so a gate that ran `biome lint` as C05 left it would have passed the entry's
own test case, an unused import. The gate passes `--error-on-warnings`. And the exit code
cannot tell a finding from a gate that checked nothing: Biome exits 1 for a configuration it
cannot read, as for a finding, and 0 for a scope that matches no script, because it counts
`biome.jsonc` among the files it checked and so never reports that no files were processed.
The gate reads the summary Biome writes to a file beside its usual output. No summary means
Biome stopped before linting, and the summary counts the findings and the files checked.
Neither the SARIF nor the JUnit report counts the files checked, and Biome prints a notice
calling its JSON report experimental on every run, so the summary is the report the gate
reads. C08's hook will pass the staged files, where checking none of them is normal, so the
floor of one script belongs to the whole-scope run only.

Verified: clean on the tree, 0; an unused import, 1, and `test.bat` stops there; a syntax
error, 1; an unknown key in `biome.jsonc`, invalid JSON, and a scope that matches no script,
2; Biome not installed, 2. About 0.25 s. With the gate registered, `check_gate_lists.mjs` and
`check_ci_workflows.mjs` pass. Tools.md's "seven of the nine" became "seven of the ten", not
eight: the lint scope includes `docs/assets/js/`, so an edit under `docs/` can now affect
three gates. The tree comparison differs only in the three pages the commit edits (Tools,
Building, and Builder, whose dependency list now names the gate), the search index and
`book.html`. CI waits for the owner's push.

### C07 — `scripts: convert_em_dash_separators exits 2 on a crash`

**A6-3 (R2).** Its one exit is `process.exit(main())`, with 0 or 1 (`:210,214`), and a crash
also exits 1, which reads as a finding. The review expected it to run from the pre-commit
hook; the owner approved that hook for Biome only (C08), so the fix stands on its own: a crash
should not read as a finding wherever the tool runs.

**Change.** The one-line `uncaughtException` handler four gates already have
(`check_page_baseline.mjs:34` and its siblings), exiting 2. C43 later folds every copy into
one helper.

**Verify.** A forced throw exits 2; `--check` over `docs/` exits 0; a planted literal dash
exits 1.

**Landed** with one difference from the four gates' copies: the handler is installed inside
the entry-point guard (`process.argv[1]` against `import.meta.url`), not at the top of the
module. The tool is written to be importable, and a module that installs a process-wide
handler on import changes how the importing process ends on a crash. C43's helper has to keep
that property. The header now states the three exit codes. A throw forced from a preload
(`node --import`, replacing `fs.promises.readFile`) exited 1 before the change and 2 after,
since a rejected top-level `await` reaches `uncaughtException`; `--check` exits 0 on `docs/`
and 1 with a planted em-dash. The tree comparison is identical.

### C08 — `githooks: a pre-commit hook that runs Biome on the staged files`

**Decision 4.** The owner approved the hook on condition that it runs Biome and nothing else.
The dash check `PLAN-10.md:690-693,795-797` deferred to a hook, and that A6-3 assumed, stays
out of it unless the owner asks for it.

**Change.** `.githooks/pre-commit`, run by Git for Windows's own `sh` and by `sh` elsewhere,
runs the pinned Biome, through `check_lint.mjs`, on the staged JavaScript. Enabling it in a
clone is `git config core.hooksPath .githooks`. This clone's `.git/config` already sets
`core.hooksPath`, to the default `.git\hooks`, so enabling it here means changing that value,
which the owner has confirmed. WIP.md and Tools.md say how to enable it, and that CI runs the
same check for a clone without it.

**Verify.** A staged file with an unused import is refused; a clean commit passes; a commit
that stages no JavaScript is not slowed. Time the hook on a typical commit.

**Landed** as the entry describes, with three details. The hook is one line, `exec node
scripts/check_lint.mjs --staged`. The gate's new `--staged` asks git for the scripts the commit
adds or changes (`git diff --cached --diff-filter=ACMR`) and passes them to Biome with
`--no-errors-on-unmatched`, so a staged script outside the scope is skipped and checking none
is clean; the whole-scope run keeps its floor. A partly staged file is linted as it is in the
working tree. A new `.gitattributes` keeps `.githooks/*` LF. Git for Windows ran a CRLF copy
of the hook correctly, through `sh` and through `git hook run`, so the rule is for a POSIX Git
on a CRLF checkout, such as WSL on a Windows tree, whose kernel would read the carriage return
after `#!/bin/sh` as part of the interpreter's name. That case is untested, since this machine
has no WSL. C84, which settles line endings, keeps the rule. The hook is committed executable,
as a POSIX Git requires.

`core.hooksPath` in this clone's `.git/config` was `D:\OCP\wc\twinBASIC-documentation\.git\hooks`,
a folder holding only Git's samples, and is now `.githooks`. The worktrees under
`.claude/worktrees/` share the setting, and get the hook once their branch has it.

Verified: with a planted unused import staged, `git hook run pre-commit` exited 1 and
`git commit` was refused with HEAD unchanged; a staged script outside the scope, in `perf/`,
was skipped, exit 0; this commit, which stages `check_lint.mjs`, passed the hook. Timed with
`git hook run`: Git with no hook about 55 ms; the hook with no script staged about 145 ms, the
difference being Node's start and one `git diff`; with one clean script staged about 230 ms.
The gate's whole-scope cases are unchanged. The tree comparison differs only in Tools.html,
the search index and `book.html`.

## Phase 1: remove, relocate, and fix in place

Done ahead of this phase, during the review: the four superseded pdf-lib shims deleted
(`90624841`), `perf/detach-pages.js` marked as code the book build loads (`26eefeeb`), and the
`staging.md` content slip fixed (`e0d127f0`, decision (f)).

### C09 — `deps: declare picocolors and pako, which the code imports directly`

**A1-2 (R1).** `picocolors` is imported by `tbdocs.mjs:35` and `scheduler.mjs:5` and installed
only through `puppeteer → cosmiconfig → parse-json → @babel/code-frame`; `pako` is imported
by `book/lib/fast-inflate.mjs` and installed only through `pdf-lib`. The day either chain
changes, the build stops at an import.

**Change.** Declare both at the versions installed today, under C01's policy: `picocolors`
with a caret (`^1.1.1`), and `pako` exact (`1.0.11`), because `fast-inflate.mjs` replaces its
`inflate` at run time. The **owner's confirmation** before `npm install`. Builder.md's
Dependencies gains both rows.

**Verify.** `npm ls picocolors pako` shows both as direct dependencies at the same versions,
and `package-lock.json` should change only in its root entry. The tree comparison identical.

**Landed** as the entry describes. Each package was installed once, at the version declared,
and both lockfiles agreed with every package's own `package.json` apart from the optional
packages for other platforms, so `npm install` reported the tree up to date and changed no
installed file. `package-lock.json` changed only in its root entry, and `npm ls` shows both
at depth 0. Builder.md's block gains both, its prose says what each is for, and its pinned
list gains `pako`, making six: `fast-inflate.mjs` patches the copy it imports, which reaches
pdf-lib only while the two share one copy, and 1.0.11 is the last 1.x release, the only one
pdf-lib's own `^1.0.11` accepts. Declaring pako 2 instead would put it at the root and nest
pdf-lib's own copy under `pdf-lib/`, and the patch would stop reaching pdf-lib without an
error.

Verified with two `--keep` runs of the tree comparison, one before the install and one after:
HEAD's two builds are identical under the three normalisers, and the working tree differs from
HEAD only in Builder.html, the search index and `book.html`.

### C10 — `scripts: move census_attributes.mjs out of builder/`

**A8-2 (R2).** It imports `../scripts/lib/tb-packages.mjs` (`:79`) against `builder/`'s rule
that it must not depend on `scripts/` (`render.mjs:383`), and `check_tree_fresh.mjs`'s
`IGNORED_FILES` (`:57-63`) holds an entry only for it, beside the two baselines.

**Change.** `git mv` it to `scripts/`, beside `build_package_api.mjs`, and fix its imports.
Update every citation of the `builder/` path: `V3.md` lists eleven, the HTML comment in the
published `docs/Reference/Attributes.md:588` among them; re-run `git grep census_attributes`.
Remove its entry from `IGNORED_FILES`, whose other two entries, the two baselines, stay. If
the linter can express it, a restricted-imports rule for `builder/` turns the rule into a
guard rather than a comment.

**Verify.** The tree comparison: identical, or differing only in that HTML comment if it
reaches the page. `check_tree_fresh.mjs` clean. `census_attributes.mjs --json` byte-identical
before and after (a harness run).

**Landed** as the entry describes. `REPO` needed no change, since `scripts/` sits at the same
depth as `builder/`. Seventeen lines citing the old path changed, in twelve files: the tool's
own header, the three `scripts/lib/` modules and `build_package_api.mjs` that name it,
Tools.md's usage line, the HTML comment in Attributes.md, `BUGS-TO-REPORT.md`, WIP.md and three
WIP siblings. Two more places described the old placement rather than citing the path, and
lost the description: Tools.md's opening paragraph listed the tool as the one executable
under `builder/`, and WIP.Harness.md explained why it sat there and why `IGNORED_FILES` named
it. The review's own files keep the old path, as records of `fe9ce12b`.

Biome can express the rule. `biome.jsonc` gains an override for `builder/**/*.mjs` that turns
on `style/noRestrictedImports` with the pattern `**/scripts/**`, a dependency guard although
Biome files it under style. A probe under `builder/` showed it catching a static import, a
re-export, a bare side-effect import and a dynamic `import()` into `scripts/`, and passing
`picocolors` and `./render.mjs`; the same file under `scripts/` is not checked. With the
census copied back into `builder/` with its old import, `check_lint.mjs` exits 1. C12's `lib/`
needs a rule of its own, since it may import none of the tree's other folders.

Verified: the census's `--json` report is byte-identical before and after the move, from the
cached export of BETA 983 (661 files, 9,701 sites; no compiler started). The tree comparison
differs only in Tools.html, Attributes.html (the HTML comment does reach the page), the search
index and `book.html`, which carries both pages.

### C11 — `scripts: census_attributes finds the install through tb-install`

**L2-2 (R1).** `findInstall` (`census_attributes.mjs:99-119`) recognises an install by its
`packages/` folder and `tb-install.mjs`'s `findIde` (`:19-35`) by `twinBASIC.exe`, and only
the private copy falls back to `os.homedir()` when `USERPROFILE` is unset. `tb-install.mjs`'s
header exists to prevent exactly this copy.

**Change.** Use `findIde`, keep the `packages/` check as census's own validation of what it
found, and move the home-folder fallback into `tb-install.mjs`, where every harness tool gets
it.

**Verify.** A scratch script: `findIde` and census resolve the same install with
`USERPROFILE` set and unset. `census_attributes.mjs --json` unchanged (a harness run).

**Landed** as the entry describes. `findInstall` asks `findIde`, then checks, as before, that
the path it gets or the folder above it holds `packages/`. `tb-install.mjs` gains the fallback
(`USERPROFILE || os.homedir()`), so tbbuild, tbrun, check_examples, addin_test and
build_package_api have it too; without it a missing `USERPROFILE` searched a `Desktop` folder
under the working directory. Census's two messages for a failed Desktop search became one,
`build_package_api.mjs`'s wording, still exit 2. Three cases now behave differently. Two are
the point of the finding: an install with `twinBASIC.exe` but no `packages/` is now refused
rather than skipped for an older one, and one with `packages/` but no `twinBASIC.exe` is no
longer chosen, so census never reads a different install from the one the other tools compile
with. The third is `--ide` given last with no value, which used to skip `TB_IDE` and now falls
back to it; C17 makes that command line an error.

**Unsetting `USERPROFILE` for a child process does not work on Windows.** A child spawned with
an environment block that lacks it still has it, and so do `HOMEPATH` and `TEMP`, while
`APPDATA` and `LOCALAPPDATA` stay removed: libuv adds a set of variables back from the parent.
The first run of the oracle reported agreement for that reason. Its "unset" children now
delete the variable themselves, through a `--import` preload, and they print what they saw.

Verified: before the change, with `USERPROFILE` unset, `findIde` returned null while census
found BETA 983 through the home folder; after it, both resolve BETA 983 with it set and unset.
The census's `--json` report is byte-identical to C10's baseline in both cases, and with
`--ide` given the install root or its `twinBASIC.exe`; a path with no `packages/` and a home
folder with no install both exit 2. The tree comparison is identical.

### C12 — `lib: move markdown-files.mjs to a top-level lib/`

**Decision (a)'s home**, and the prerequisite for C13: `builder/serve.mjs` needs
`isOutputTree` and may not import `scripts/`.

**Change.**

- `git mv scripts/lib/markdown-files.mjs lib/markdown-files.mjs`, and update its importers
  (`check_code_regions.mjs`, `check_tree_fresh.mjs`, `convert_em_dash_separators.mjs`,
  `scripts/lib/tb-fences.mjs`, and `eval/nav_hops.mjs`'s file-URL import) and every citation,
  WIP.md's Don't rule among them.
- A header, or `lib/README.md`, says what `lib/` is for: modules that `builder/`,
  `scripts/`, `book/`, `eval/` and `wisdom/` may all import, and that import none of them.
- `lib/` joins every list of the tooling's folders: `check_tree_fresh.mjs`'s
  `DEFAULT_SOURCES` (`docs` and `builder` today; the build imports `lib/` from C13 on, and an
  edit there must mark the tree stale), `check_regex_safety.mjs`'s globs,
  `survey_tooling.mjs`'s `TOOLING_DIRS`, the lint scope, and the prose that names the folders
  (WIP.md, `test.bat`'s header, Tools.md).

**Verify.** `markdownFiles` returns the same list before and after (a scratch comparison).
`test.bat` clean, since `check_code_regions.mjs` and the dash tool use it; `check.bat` clean,
since `check_tree_fresh.mjs` uses `isOutputTree`; an edit under `lib/` makes
`check_tree_fresh.mjs` refuse the tree.

**Landed** as the entry describes. `biome.jsonc` lints `lib/**/*.mjs` and gains a second
`noRestrictedImports` override, for `lib/`, that refuses an import from `builder/`,
`scripts/`, `book/`, `eval/`, `wisdom/` or `test/`: a probe under `lib/` had all six flagged,
while `node:fs`, `node:test`, `fast-glob` and `./markdown-files.mjs` passed. `lib/README.md`
says what the folder is for and states the rule, and WIP.Build.md gains a paragraph on `lib/`
beside the ones on `wisdom/` and `eval/`. `eval/nav_hops.mjs`'s comment said a corpus holds
`scripts/` only as stubs; `build_corpus.mjs` stubs every file whose extension is not prose or
configuration, `lib/` included, so the comment now says every script. `build_corpus.mjs`
itself did not change: its list is of exclusions, and `lib/` is mirrored as `scripts/` is.
Only the review's records and this plan keep the old path.

Verified: `markdownFiles` from HEAD's copy (loaded from `git show` through a `data:` URL, so
nothing was written) and from `lib/` return the same 912 files, and `isOutputTree` picks the
same eight folders under `docs/`. After a build, touching `lib/markdown-files.mjs` makes
`check_tree_fresh.mjs` exit 1, and the old default, `--source docs --source builder`, passes
the same stale tree. A probe under `lib/` holding `/^(a+)+$/` fails `check_regex_safety.mjs`,
which passes once the probe is gone. `survey_tooling.mjs` surveys 186 files, the 189 scripts
under its eight folders less the three vendored ones. `check_lint.mjs` still checks 138
files, since the module moved within its scope. The tree comparison differs only in
Building.html, Extending.html and Tools.html, the search index and `book.html`.

### C13 — `builder, eval: decide what is an output tree with isOutputTree`

**L2-1 (R1).** `serve.mjs:138`'s `IGNORED_PREFIXES` has no `_site-basepath*`, so a
`--dest docs/_site-basepath` build while `serve.bat` runs triggers a rebuild;
`eval/build_corpus.mjs:59-71` lists `docs/_site-basepath` but its prefix test misses the
`-offline` and `-pdf` trees. `check_tree_fresh.mjs` was fixed for this class once already.

**Change.** Both decide output trees with `lib/markdown-files.mjs`'s `isOutputTree`.
`serve.mjs` keeps `node_modules` and `.git` in its own list, since those are not output
trees.

**Verify.** With `serve.bat` running, a build to `--dest docs/_site-basepath` causes no
rebuild, and a page edit still does. A scratch run of `build_corpus.mjs`'s exclusion test
excludes all three basepath trees.

**Landed** as the entry describes. `serve.mjs`'s watcher skips a top-level folder that
`isOutputTree` names, and keeps `node_modules` and `.git` in a list of its own,
`IGNORED_DIRS`. `build_corpus.mjs`'s `isExcluded` asks `isOutputTree` about the folder
directly under `docs/`, and `EXCLUDED_PATHS` lost the six output trees it named. A comment in
`runServe` said the watcher's list keyed off the serve's destination; the list matches names,
so the comment now says that a `--dest` inside `docs/` must be named like an output tree (see
Found while implementing).

Verified by running the tool rather than a scratch copy of its test. With a build to `--dest
docs/_site-basepath` on disk, all three trees populated, the old `build_corpus.mjs` mirrored
2,545 files, 1,217 of them from `_site-basepath-offline` and 3 from `_site-basepath-pdf`, the
rest being binary and omitted; the new one mirrors 1,325, that list less those two trees, and
`diff -r` finds nothing else different. A second serve ran the new code on port 4010 with
`--dest docs/_serve-c13`, since the build refuses to clean a destination outside the project
tree. A build to `--dest docs/_site-basepath` that rewrote files in all three trees started no
rebuild there, and touching `Tools.md` started one (`Changed: Documentation/Tools.md`). The
old list matched whole names and had none of the three. The tree comparison is identical.
The test builds overwrote `docs/_site-basepath`, which `check_links_diff.mjs --base-path-tree`
reads, so it was rebuilt the way that tool builds it, with `--baseurl /twinBASIC-docs
--no-offline --no-pdf`.

### C13a — `builder: refuse a --dest that overlaps the source tree`

**Found while implementing C13**, and given a commit of its own by the owner. `serve.mjs`'s
watcher skips output trees by name, never by the path it serves from, so a `--dest` inside
`docs/` with any other name is watched as source.

**Change.** Found while implementing proposed that the watcher skip the serve's own
destination as well.

**Verify.** `serve.bat --dest docs/preview` starts no rebuild of its own, and an edit still
starts one.

**Landed** differently, because reproducing the fault showed that the watcher is not the only
reader of the destination. A serve given `--dest docs/preview-c13a` on port 4010 started its
first rebuild with no edit, on late directory events from its initial build (`Changed:
preview-c13a/CustomControls, …`), and every rebuild failed in `discover`. `_config.yml`
excludes only `_*` at the top of `docs/`, so the previous output was read as source, and the
publish allowlist refused five of its files: both `impexp` downloads, both JSON files and
`sitemap.xml`. Any other build over `docs/` reads the folder the same way while it exists.
Skipping it in the watcher would have left every rebuild failing. For a name that `discover`
skips and `isOutputTree` does not, such as `_preview`, each rebuild's writes would start the
next, as the original note said; that case follows from the same log and was not reproduced.

So `write.mjs` gains `assertDestinationClearOfSource(srcRoot, destRoot)`, which `runBuild`
calls before any task, for a build and for each of a serve's builds. It refuses a destination
that is or contains the source tree, which `prepareDestinations` would delete, having checked
only that it lies under the project; and one inside the source tree unless its first folder
there is one that `isOutputTree` names, which is what both `discover` and the watcher skip.
The watcher's name test then covers the serve's destination, and `serve.mjs` changes only in
its comment. The rule is in the `--dest` rows of Tools.md and `builder/README.md`, and
Pipeline-Stages.md has a row for the function.

Verified: a scratch probe gives the expected answer for 21 destinations. Among them
`docs/_site-basepath`, `docs/_site/sub`, the fixture build's `test/fixtures/_out` and
compare_trees' `.compare-out/site` pass; `docs/preview`, `docs/_foo`, `docs/_SITE`,
`docs/..foo`, `docs/preview/_site`, `docs` itself and the repository root are refused. Every
in-tree caller of `tbdocs --dest` passes. A build and a serve given `--dest docs/preview-c13a`
both exit 1 before writing anything, the build with a stack from `main()`'s catch, which C18
replaces for command-line errors. A serve given `--dest docs/_serve-c13a` built, started no
rebuild in the eight seconds after, rebuilt once when `Tools.md`'s time stamp changed, and did
not rebuild again. The tree comparison differs only in Tools.html, Pipeline-Stages.html, the
search index and `book.html`.

### C14 — `builder: delete what the retired diff tools left behind`

**A2-1 / A1-5 / L4-4, A1-4, A2-2 / A9-10 (all R2).** `644d6bdb` deleted `_diff.mjs`,
`_triage.mjs`, `_sitemap_diff.mjs` and their siblings; code only they called, and comments
naming them, remain.

**Change.**

- Delete `offline.mjs`'s `writeOfflinePages` (`:244-289`), `writeOffline`'s unread
  `precomputed` parameter (`:117`), `buildSitePaths` and the fallback that calls it
  (`:207,213,359-394`; `tbdocs.mjs:705-706` always sets `sitePaths`), and the 32-name
  re-export block that nothing imports (`:55-88`); `search.mjs`'s `writeSearchData`
  (`:18-24`); `sitemap.mjs`'s `extractSitemapUrls` (`:70-74`); `pdf.mjs`'s
  `extractImagePaths` (`:146-158`).
- With `writeOfflinePages` and `precomputed` go the two `biome-ignore` comments C05 put on
  them and `tbdocs.mjs`'s `precomputed: true` argument. The function's comment on the
  nav-block cache (`PLAN-9.md` §5.3, B7, and §7.D11) is the only explanation in the code of
  a mechanism that lives on in `cpu-worker.mjs`'s `render`, so it moves above that copy
  instead of going with the function. `offline.mjs`'s header (`:6-20`) describes
  `precomputed`, `writeOfflinePages`, `buildSitePaths` and the re-exports, and is rewritten
  to match.
- `worker-pool.mjs`'s `sendInit` still posts `idMapping` to every worker (`:43-45`, called
  from `tbdocs.mjs:1449`), though C05 deleted the only place a worker kept it. The parameter
  and the message field go, and `Pipeline-Stages.md:860`'s signature with them.
- Delete `tbdocs.mjs`'s unused `makeTimer` export (`:196-209`). `offline.mjs` keeps its
  private copy (`:98-111`), with a comment that no longer cites the deleted tools.
- Delete or correct the comments that name them: `offline-rewrite.mjs:411`,
  `search.mjs:65-66`, `sitemap.mjs:67-68,97`, `redirects.mjs:35-36`, `pdf.mjs:6-9,99-107`,
  and `offline.mjs:200-201`, which the review missed; and those that refer to them as "the
  diff tools" without naming them, `offline.mjs:95-97` and `:364-365`.
- The documentation rows that name a deleted function (`Pipeline-Stages.md:847` for
  `extractImagePaths`, and any for the others) change in the same commit.

**Verify.** `git grep` finds no caller of any deleted name, and no mention of the deleted
tools outside the PLAN and REVIEW records. The tree comparison: identical apart from the
documentation pages this commit edits.

**Landed** with more than the entry names: everything it lists went, and deleting it left
more dead code, which went too.

- With the fallback gone, `buildOfflineState` read none of `pages`, `staticFiles` and
  `stubs`, and `writeOffline` kept `pages` only to pass it on. Both lost those parameters,
  and `tbdocs.mjs`'s call and Pipeline-Stages.md's signatures lost them too. Nothing outside
  `offline.mjs` calls `buildOfflineState` and it awaits nothing, so it is private and no longer
  `async`. Four imports from `offline-rewrite.mjs` that only the deleted code used went, and so
  did `pdf.mjs`'s `IMG_SRC_RE` and `sitemap.mjs`'s `LOC_RE` with the only functions that used
  them. `offline.mjs`'s rewritten header lists everything `writeOffline` still writes, and a
  comment there that counted five `Promise.all` branches says three, as there have been since
  before this commit.
- Three more things existed only for the retired tools, by their own comments, and the review
  missed them: `book.mjs`'s `loadBookData` ("retained for the verify harnesses and diff
  tools"), which nothing calls and which is deleted, and the exports of `pdf.mjs`'s
  `deriveBookOutputs` and `sitemap.mjs`'s `renderRobotsTxt`, which only their own files use.
  Pipeline-Stages.md loses eight rows: those two, `loadBookData`, `buildOfflineState`,
  `extractSitemapUrls`, `writeSearchData`, `extractImagePaths` and `makeTimer`. The rows for
  `writeOffline`, `buildSitePathsSync` and `WorkerPool` changed, and so did the `writeOffline`
  task's paragraph, which still passed `precomputed: true`.
- The entry's comment list missed three that named the tools or their code:
  `offline-rewrite.mjs`'s on `buildSitePathsSync`, `search.mjs`'s on
  `writeSearchDataFromChunks`, and `book.mjs`'s on `IMG_SRC_RE_BOOK`, which pointed at
  `pdf.mjs`'s deleted copy of the pattern.
- The nav-block cache comment sits above the cache in `cpu-worker.mjs`'s `render`, unchanged
  apart from its first line, which named the deleted function, and one "we".

Verified: `git grep -w` for each deleted name finds only the scheduler's own `idMapping`,
unrelated uses of "precomputed", and the records; the retired tools are named only in the
records and in two notes that say they were retired (`WIP.OldJekyll.md`, `builder/README.md`).
Lint is clean at 138 files. The tree comparison differs only in Pipeline-Stages.html, the
search index and `book.html`. Every offline page is identical, which shows that dropping
`precomputed` and the fallback changed nothing the render workers write.

### C15 — `builder, wisdom: delete precomputeSeo and schemas.mjs; unexport kramdownSlug`

**A3-9, A3-10 (R3), A10-4 (R2).** `seo.mjs`'s `precomputeSeo` (`:90-94`) has no caller;
`render.mjs`'s `kramdownSlug` (`:1352`) is exported and used only inside its module;
`wisdom/extract/schemas.mjs` is imported by nothing and has drifted from the inline schemas
`workflow.mjs` uses (`source_thread` where `:49` has `thread_path`, free text where `:77` has
an enum).

**Change.** Delete `precomputeSeo` and `schemas.mjs`; drop `kramdownSlug`'s `export`.
Reviving `schemas.mjs` would mean reconciling it with `workflow.mjs` for no caller.

**Verify.** `git grep` finds no importer before each deletion; the tree comparison identical.

**Landed** as the entry describes, with the documentation that named the three. `precomputeSeo`
went with its comment, which said it was kept for dev tooling; both halves it wrapped keep
their callers, `markdownInit` on the main thread and `render` on the workers. Pipeline-Stages.md,
whose module tables are headed as each file's export list, loses the rows for `precomputeSeo`
and `kramdownSlug`. The `kramdownSlug` row was the only description of the slug rule, and it
credited the function with the deduplication that `headerIdPlugin` does through `uniqueSlug`,
so the rule moved, corrected, into the plugin chain's row for `headerIdPlugin`. Wisdom.md's
file listing loses `schemas.mjs`, and its `workflow.mjs` line, one column out, is aligned.
`wisdom/PLAN-3.md` still says the workflow uses `extract/schemas.mjs`, which was already untrue;
like the builder's PLAN files, it is a record and stays as written.

Verified: before the change, `git grep` found no importer of any of the three, only the
records, the documentation rows and `render.mjs`'s own call. After it, `kramdownSlug` appears
only in `render.mjs`, in the `headerIdPlugin` row and in one WIP.Build.md sentence, which name
the function the heading ids use. Lint checks 137 files, one fewer, `schemas.mjs`. The tree
comparison differs only in Pipeline-Stages.html, Wisdom.html, the search index and
`book.html`.

### C16 — `scripts: tbrun recognises all five failed-build shapes`

**A7-1 (R1).** `tbrun.mjs:327`'s pattern matches three of the five shapes that
`tb-ide.mjs:730-734`'s `BUILD_FAILED` lists. A build that fails with `[BUILD] ERROR` or
`[LINKER] compilation (codegen) error` is reported as a success.

**Change.** Export `BUILD_FAILED` from `tb-ide.mjs`, and use it in `tbrun.mjs`.

**Verify.** A scratch script: all five shapes match the exported list, and the two missed
ones fail the old pattern. A probe project with a compile error makes `tbrun` exit non-zero,
and a clean one still prints its output and exits 0 (harness runs).

**Landed** as the entry describes, and verified end to end with a failure the old pattern
missed rather than with a compile error. A compile error never reaches the pattern: `tbrun`
exits 1 on the compile's error count before it builds. BUGS-TO-REPORT.md records a shift of
a `Single` that compiles clean and then fails code generation, so the probe's
`[RunAfterBuild]` Sub did that. Before the change, `tbrun` exited 0 and returned the IDE's
log as the probe's output: `[BUILD] Starting...`, `[LINKER] SUCCESS created output file`,
`[BUILD] Executing 'DocSamples.Probe.Run'...` and `[LINKER] compilation (codegen) error
detected in 'Probe.Run' at line #11`. Nothing in the Sub ran, `Debug.Cls` included. After it,
the same probe exits 2 and prints that log as the reason, and a clean probe still prints
`clean probe 2` and exits 0. The message and the header's exit-code line now name code
generation beside the build, since the build succeeded there. Tools.md's paragraph and
WIP.Harness.md's bullet on failed builds say the same.

A scratch script tested all five shapes against the exported pattern and the old one: the
new one matches all five and none of five ordinary lines from the same log, and the old one
misses `[BUILD] ERROR` and the codegen line. The `[BUILD] FAILED` and `[BUILD] ERROR` test
lines have made-up tails, since no build here produced either; the other three are real lines
from WIP.Harness.md and these runs. The old pattern was
case-insensitive and allowed any run of spaces; the build log writes one space and the case
the list names, so nothing real is lost.

Harness runs, one at a time, on BETA 983: probe A (the shift in the `[RunAfterBuild]` Sub),
before `exit 0`, after `exit 2`; probe B (clean), after `exit 0`; probe C (the shift in a
procedure the probe calls), before and after `exit 0` with `before` as the output; probe C2
(probe C without `Debug.Cls`), before, `exit 0`. Probe C is a gap no pattern can close; see
Found while implementing.

### C17 — `scripts: harness CLIs reject a missing value; tbbuild finds its project`

**L1-2, L1-3 (R1), A7-5 (R2).** Three defects in hand-written argument parsing, fixed in
place so that C49 can migrate these tools without changing what they do:

- `opt()` returns `undefined` for a value flag given last, in `census_attributes.mjs:86`,
  `check_examples.mjs:93` and `tbbuild.mjs:61`, and `build_package_api.mjs:56`'s one-argument
  `opt()` has the same gap. `Number(undefined)` then makes `tbbuild`'s `--port` and
  `--timeout` (`:68,70`) and `check_examples`'s `--jobs`, `--port` and `--batch`
  (`:102-104`) `NaN`. A `NaN` timeout makes `tb-ide.mjs:436`'s poll run zero times and
  report that the IDE never opened the project, instead of a timeout.
- `tbbuild.mjs:62` skips any token after a `--flag`, whether or not the flag takes a value,
  so `tbbuild --keep proj` and `tbbuild --json proj` report a usage error.

**Change.** A value flag with no value, or a numeric flag whose value is not a positive
number, is a usage error through each tool's existing usage path. `tbbuild` finds its
positional argument with a table of the flags that take values, as `tbrun.mjs:112-116` does.

**Verify.** Each malformed invocation exits with the tool's usage code before any IDE starts.
`tbbuild --keep proj` and `tbbuild --json proj` build (harness runs; the kept IDE is ended by
its pid). The `examples.bat` summary unchanged: 1,119 samples.

**Landed** as the entry describes, with three things it left open settled. "No value" also
covers a value flag followed by another flag, as in `--port --keep proj`. Node's strict
`parseArgs`, which C47's module is built on, refuses both forms and takes a lone `-` as a
value (measured on Node 24.13), and the four tools now do the same, so C49 has nothing to
change here. Ports and counts must be whole numbers; the timeout may be any positive number.
`check_examples` clamped `--jobs 0` and `--batch 0` to 1 and now refuses them; the clamp never
caught a bare `--jobs`, because `Math.max(1, NaN)` is NaN. The check comes before `--help` in
`check_examples` and `census_attributes`, as a strict parser's does. Each reason is one line
on stderr: `tbbuild` follows it with its usage line, and `check_examples` prefixes its own
name, as most of its messages do.

Before, on HEAD in a worktree: `tbbuild <probe> --timeout` started the IDE and exited 3 after
3 s with `the IDE never reported <probe> as open`, and `tbbuild --keep <probe>` and `--json
<probe>` printed the usage and exited 2. A scratch table of 34 malformed invocations, run with
`TB_IDE` naming a file that does not exist, so that a case which got past parsing fails on
another message rather than starting an IDE, now gives exit 2 and the reason for all 34, each
in under 100 ms. On HEAD, a bare `--ide` fell back to `TB_IDE` in `tbbuild`,
`census_attributes` and `build_package_api`; `build_package_api --src --check` looked for a
folder named `--check`; and a bare or unreadable `--port` reached `tbbuild`'s launch as NaN
(`options.port should be >= 0 and < 65536`). HEAD's `check_examples` cannot load in a
worktree with no `node_modules`, so it has no before column.

Harness runs, one at a time, on BETA 983: `tbbuild --keep <probe>`, `0 error(s), 0
warning(s), 0 hint(s), 0 info` and exit 0 in 9 s, its IDE then ended by `taskkill /PID <pid>
/T /F`; `tbbuild --json <probe>`, `"errors": 0` and exit 0 in 11 s; and `examples.bat`,
`check_examples: 1129 sample(s), 1129 compile, 0 finding(s), 121.1s -- clean`. The count is
1,129 rather than 1,119 because content commits of 2026-09-24 and 25 marked more samples. C17
changes no fence handling, and later commits compare against 1,129. `tbbuild` leaves a kept
IDE's registry entries alone, so a scratch tidy spanned the two runs: `startTidy` with the
probe's folder as a prefix before them, and `finishTidy` after, which deleted the project
state and the recent-list entry the kept run left. The census's `--json` report is
byte-identical to HEAD's, 27,490 bytes, and `build_package_api --check` finds
`package-api.json` up to date. The harness runs predate one edit, which lets a lone `-`
through as a value; none of them passed one.

### C18 — `builder, scripts: a command-line error exits outside the link bitmask`

**L1-4 (R1)**, and the same fault in `check_links.mjs`, which the review did not list (see
departure 1). `tbdocs.mjs` throws on an unknown argument (`:189-191`) and `main()`'s catch
exits 1 (`:1616-1635`), the "link check failed" bit. `check_links.mjs` exits 2 for its
argument errors (`:384,399,403`), its integrity bit.

**Change.** In both tools a command-line error exits with one value outside the 1/2/3
bitmask. 4 is recommended: no run that reaches a check can produce it. Both usage texts and
Tools.md's exit-code rows say so. C13a added one more command-line error to `tbdocs`: the
refusal of a `--dest` that overlaps the source tree. It is thrown from `runBuild`, not
`parseArgs`, so it must be told apart from a crash to exit 4 as well. Phase 3's convention, where an argument error exits 2,
records these two tools as the exception, and C60 names the value beside the two bits.

**Verify.** `tbdocs --bogus`, and `check_links.mjs` with no input, both exit 4. The fixture
build (`test/fixtures/check-src`) still exits with its link and integrity bits, and
`check_links_diff.mjs --self-test` passes.

### C19 — `scripts: close the browser on every exit path, through lib/browser.mjs`

**L3-1 (R1).** `check_a11y.mjs` launches Chromium (`:167`) and closes it only on success
(`:218`), and `main().catch` exits 2 without closing it (`:244-247`). The comment at `:229`
names the path that throws: a `PAGE_STATES` applier's failed assertion, which throws by
design. On Linux, where CI runs this gate, Chromium stays up for the rest of the job. The
three sibling tools guard their launch.

**Change.** `scripts/lib/browser.mjs` takes `axe-scan.mjs`'s `launchBrowser` and
`LAUNCH_ARGS` (`:258-264`), with their reasons, and adds `withBrowser(fn, options)`, which
closes the browser in a `finally`. `axe-scan.mjs` re-exports `launchBrowser`, so its
importers need not change. `check_a11y.mjs`, `check_a11y_fingerprint.mjs`, `sweep_a11y.mjs`
and `check_axe_patch_equiv.mjs` use `withBrowser`. C44 moves the two diagram tools onto the
same module.

**Verify.** With an applier made to fail, a Chromium started by the run is left over before
the change and none after. Count by the Puppeteer cache path in each process's command
line, never by image name, since the owner's own Chrome has the same one. `check_a11y.mjs`'s
findings unchanged; `check_axe_patch_equiv.mjs` passes.

### C20 — `a11y: validate --theme and --viewport wherever a matrix is built`

**L1-1 (R1).** `check_a11y.mjs:82-95`'s `pick()` was written after `--theme drak` labelled a
light run "drak"; `sweep_a11y.mjs:120-121` and `check_a11y_fingerprint.mjs:134-135`, the gate
for an axe upgrade, never received it. `buildMatrix` labels the report from the unvalidated
string and `gotoPage` applies it; the dark CSS matches only `[data-theme=dark]`, so an
unknown value renders light under a report that says otherwise.

**Change.** `pick()` moves into `axe-scan.mjs`, beside `THEMES` and `VIEWPORTS`, and all three
tools use it. `buildMatrix` also refuses an unknown value, as the backstop for a future
caller.

**Verify.** `--theme drak` and `--viewport tiny` fail with a usage error in all three tools;
`check_a11y.mjs`'s findings unchanged.

### C21 — `builder: the Gantt chart draws Check, vendorAssets and Other`

**A1-1 (R1).** `gantt.mjs:39-49` draws only `Seeds`, `Spine` (which also takes `Render`)
and `Write`, so
`checkBook` and `checkReport` (section `Check`) and `vendorAssets` (no `GANTT_SECTION` entry;
`tbdocs.mjs:539-562`) are drawn on no build, while their durations still stretch the time
axis. `COLORS.Other` (`:12`) is never used, and `Builder.md:410` says a task with no section
falls into an "Other" bucket.

**Change.** `mainSections` gains `Check` and `Other`, and `vendorAssets` gets a
`GANTT_SECTION` entry.

**Verify.** The built `gantt.svg` names `checkBook`, `checkReport` and `vendorAssets` after
the change and not before. The tree comparison identical apart from its normalised Gantt
regions. `Builder.md:410` re-read against the result.

### C22 — `scripts: crawl_check follows every link attribute the build checks`

**A4-3 (R1).** `crawl_check.mjs:91-108`, the only checker that runs against the deployed
site, handles five tag and attribute pairs, where `link-check.mjs:38-60`'s `LINK_ATTR_TABLE`
has 21 tags and 26 pairs. It never follows `srcset`, `poster`, `cite`, `formaction`,
`action`, `data` or `longdesc`.

**Change.** Export `LINK_ATTR_TABLE` and `splitSrcset` from `link-check.mjs`, and let the
table decide `crawl_check.mjs`'s tag handling; its HTTP concerns (concurrency, redirects,
HEAD then GET) stay its own. This is separate from decision 5, which covers the two
filesystem checkers only.

**Verify.** Run it before and after against `serve.bat`'s local server if it takes a base
URL, and otherwise ask before crawling the live site. The after run requests the `srcset` and
`poster` targets, and reports nothing the before run did not, apart from any link in those
attributes that is actually broken.

### C23 — `scripts: check_examples restores the registry after a spawn failure`

**L3-2 (R2)**, with V4's note that `check_examples.mjs` has no process-level handler at all.
`buildStaged`'s spawn (`:601-612`) has no `'error'` listener and waits for `'exit'`. A spawn
failure is then an uncaught exception at the emitter, outside both `main()`'s catch and
`main().catch`, so the step that restores the tbIDE registry never runs.

**Change.** Listen for `'error'` and wait for `'close'`, as `addin_test.mjs:180,185` and
`check_regex_safety.mjs:347-348` do. An `uncaughtException` and `unhandledRejection` handler
restores the registry and exits 2.

**Verify.** With the spawn pointed at a missing executable (a scratch edit), the run exits 2
and the registry is as it was found. The `examples.bat` summary unchanged (a harness run).

### C24 — `scripts: tb-operate stops on an afterReveal timeout`

**A7-2 (R2).** `afterReveal` (`tb-operate.mjs:421-429`) returns `false` on a timeout, and
`openFile` (`:453`), `setCursor` (`:461`) and `select` (`:475`) discard the result. That
reopens the cursor-reset race the function exists to prevent: `:401-409` records the measured
`"xyz"` to `"zy"` corruption.

**Change.** Each call site checks the result, retries once, then throws naming the file and
position.

**Verify.** `addin-test.bat` green, all ten lanes (a harness run).

### C25 — `scripts: tbbuild always tidies; correct tb-registry's -Command note`

**A7-9, A7-6 (R3).** `tbbuild`'s shutdown skips its tidy step when the IDE handle was never
set, which is safe only by an invariant inside `tb-launch.ps1`; `tbrun` always tidies. And
`tb-registry.mjs:49-50` says `tbrun`'s snapshot uses `-EncodedCommand`, where `tbrun.mjs:376`
uses `-Command` with a fixed literal.

**Change.** `tbbuild` tidies on every shutdown path, as `tbrun` does. The comment is
corrected; the code is safe as it stands.

**Verify.** `tbbuild` on a probe, and `tbbuild` given a missing `--ide`, both leave the
registry as found (harness runs).

### C26 — `wisdom: parseStaging refuses a chunk it cannot place`

**L3-3 (R1)**, the half that needs no shared module. `parseStaging` (`merger.mjs:114-129`)
splits on any line equal to `---`, and `parseSection` returns `null` for a chunk that does
not start with `## ` (`:162-168`), which the caller drops (`:147-148,152-153`). A bare `---`
inside a fenced sample therefore drops the rest of its section and the section's
`finding_ids` line without a word, against the header's promise never to drop reviewer
content (`:111-112`). Today's file produces no such chunk.

**Change.** A chunk that does not start with `## ` is an error naming its line. C36 then
stops a fenced `---` from making such a chunk; this check stays as the guard for any other
malformed one.

**Verify.** A synthetic file with a `---` inside a fence: before, the tail disappears; after,
the run fails naming the line. The real `staging.md` parses to the same 1,160 sections and
serialises to the same bytes as before.

### C27 — `wisdom: write manifest.json and denied.json atomically`

**A10-5 (R2).** `saveManifest` (`wisdom/discord/messages.mjs:10-12`) and `wisdom.mjs:146`
write with a plain `writeFileSync`, and `loadManifest` parses without a guard, beside
`wisdom/extract/state.mjs:62-75`, which writes to a temp file and renames it.

**Change.** Both writes use the temp-and-rename write `state.mjs` already has, shared within
`wisdom/`; a file that does not parse is reported by name.

**Verify.** With the rename made to throw (a scratch edit), the previous file survives
intact; a truncated manifest gives an error that names it.

### C28 — `scripts: exit 2 on a crash in three tools that exit 1`

**A5-2 (R2), and the `check_tb_registry.mjs` half of L1-11.** The convention
(`Extending.md:640-648`) keeps 1 for a finding and 2 for a crash. `pick_a11y_sample.mjs`'s
`discover()` (`:159-169`) throws uncaught on a missing tree and exits 1, the same as a
coverage gap (`:310`), and it runs in `check.bat`. `build_dot_metrics.mjs` has no catch
around its browser work, so a crash exits 1, which is also its STALE result.
`check_tb_registry.mjs` exits 1 for a crash and for a failure alike.

**Change.** The convention's crash handler, as `check_dot_fit.mjs:31-34` has it, in all
three, exiting 2. C43 folds the handlers into one helper.

**Verify.** In each, a forced crash exits 2 and a real finding still exits 1.
`check_tb_registry.mjs`'s fixtures pass (a harness run).

### C29 — `test.bat: cite check_gate_lists for the gate's history`

**A6-2 (R1).** `test.bat:34-43` tells the gate's history in a way that neither
`check_gate_lists.mjs`'s header (about `:30-44`) nor `Tools.md:435-437` supports, and those
two agree with each other.

**Change.** Trim the comment to a citation of the header, matching the file's other seven
comments.

**Verify.** Re-read against both accounts; `check_gate_lists.mjs` and
`check_ci_workflows.mjs` pass.

### C30 — `scripts: tidy check_links_diff's and check_publish_policy's failures`

**L2-6, L3-6 (R3).** `check_publish_policy.mjs:152-189` and `check_links_diff.mjs:651-750`
remove their scratch folders only on success, where four other tools do it in a `finally`.
And `check_links_diff.mjs`'s `fusedBuild` (`:426,432`) and `ensureBasePathTree`
(`:518,525`) call `spawnSync` unguarded, so a failure reaches the terminal as a stack trace
at exit 1 rather than as the tool's `error:` line at 2.

**Change.** A `finally` for both scratch folders; both spawns report through the tool's error
path.

**Verify.** A forced failure in each leaves no scratch folder and prints the tool's `error:`
line with exit 2. `check_links_diff.mjs --self-test` and CI's fixture cases unchanged.

## Phase 2: shared code, in place, with no change in behaviour

Each commit's oracle must show no difference: the tree comparison for `builder/`, a gate's own
output and probes for a gate, the harness summaries for the harness, and from C47
`check_cli.mjs`'s recorded cases for a command line. A difference is a regression unless the
entry names it as intended.

The groups run in the order below. Within the markdown group the rewriters (C32–C36) come
before the scanners (C37–C41), as decision (a) requires. The command-line migrations end with
`tbdocs` (C52), as decision (e) requires. C55 comes before C56, which uses it, and C66 before
the shim refactors it checks.

*The markdown module (decision (a)): C31–C41.*

### C31 — `lib: markdown.mjs and frontmatter.mjs, with their probes`

**Decision (a).** The module the inventory sketched (`markdown-inventory.md`, Task 3), built
on what it measured: block tokens have `.map` line ranges, blockquote and list prefixes
included; inline tokens have none; frontmatter must be split off before markdown-it sees a
page, which otherwise reads it as a rule and a setext heading; a block-only parse of the
whole corpus takes about 34 ms.

**Change.**

- `lib/markdown.mjs`: `blockRegions(src, {md})`, every fence, code block and HTML block with
  its line range, from a block-only parse; `maskCode(src, {indented})`, the mask, rewrite and
  restore helper, with markdown-it's CommonMark opener rules, the info-string rule that
  `maskCodeRegions` lacks included; `splitCodeSpans(line)`, the one tested backtick and tilde
  run scanner, since markdown-it gives inline spans no offsets; `splitOnMarker(src,
  isMarker)`, sections split on a marker line outside any code region; and a line-splice
  helper that keeps each line's ending, which `convert_em_dash_separators.mjs` and
  `check_examples.mjs` both do by hand.
- The regions come from the caller's markdown-it instance when it passes one. `render.mjs`
  passes the site's, because its plugins (the definition-list one among them) change what
  counts as a block; other callers get a bare `html: true` instance.
- `lib/frontmatter.mjs`: `parseFrontmatter(raw)` strips a BOM, splits off the `---` block,
  parses it with `js-yaml` 4, and leaves the content's bytes untouched.
- The probes ride along in `check_code_regions.mjs`, which becomes the gate on the module as
  well as on the rewrites: A3-1's shape (a ```` ```abc`def ```` fence holding a
  `> [!NOTE]`), fences inside blockquotes and list items, the 16 code-span cases V1 used for
  L4-7, CRLF input, a BOM, a fenced `---`, and frontmatter that markdown-it would read as a
  heading.

**Verify.** The probes. Over every page under `docs/`, `blockRegions` finds the same 1,371
fences as `check_code_regions.mjs`'s own pass over the tokens.

### C32 — `render: the pre-render rewrites ask lib/markdown what is code`

**A3-1 (R1), first half.** `maskCodeRegions` (`render.mjs:141-175`) accepts a backtick fence
whose info string holds a backtick, and `stashCodeFences` (`:1704-1730`) refuses it, as
CommonMark does. Reproduced: ```` ```abc`def ```` is protected by one and exposed to the
other, and a `> [!NOTE]` inside it becomes a live admonition. `check_code_regions.mjs` cannot
see this class of fault.

**Change.** `applyPreRenderRewrites` masks through `maskCode` and `splitCodeSpans`, with the
site's instance and `indented: false` as today. `maskCodeRegions` and `maskInlineCode` go;
`counts.mjs`'s `findCountRefs`, which reuses the mask, follows.

**Verify.** The tree comparison identical, since no page holds the shape.
`check_code_regions.mjs` clean, its mirror-fault probes included.

### C33 — `render: admonitions find their fences through lib/markdown`

**A3-1, second half.** `rewriteAdmonitions` protects fences with its own `stashCodeFences`.
It runs after the mask is restored, so it must recognise a fence inside an admonition with
its `> ` markers still on; `blockRegions`' ranges include those prefixes.

**Change.** `stashCodeFences` goes, and `rewriteAdmonitions` skips the ranges `blockRegions`
reports. A3-1's reproduction becomes a probe in `check_code_regions.mjs` against the whole
pre-render chain.

**Verify.** The tree comparison identical. `check_code_regions.mjs`'s `ADMONITION_PROBES`
(five variants, `Attributes.md`'s literal fence strings among them) and the new probe pass;
putting back a private opener test fails the new one.

### C34 — `scripts: convert_em_dash_separators reads code regions from lib/`

**L3-4, L4-7, merged into A3-1.** Its `FENCE_OPEN_RE` (`:59-60`) is byte for byte
`maskCodeRegions`' pattern, with the same gap, and `splitInlineCode` (`:74-99`) is a second
copy of the code-span scan, equivalent today; the tool's own comment (`:70-73`) records a bug
it already shipped in that scan.

**Change.** Code regions from `blockRegions`, code spans from `splitCodeSpans`, line endings
kept by the module's splice. The file's accepted gap for two-space list-item fences
(`Reference/Core/Get.md`, `Option.md`) closes, because markdown-it recognises those fences.

**Verify.** `--check` over `docs/` exits 0 before and after. A seeded probe file with CRLF
endings, a doubled-backtick span and a list-item fence has only its prose converted, and
keeps its endings.

### C35 — `scripts: check_examples' marker splice uses lib/markdown's line splice`

**Inventory site A4.** `applyMarkers` (`check_examples.mjs:1123-1154`) already finds its line
through markdown-it and re-verifies it before editing; only the split, edit and rejoin that
keeps CRLF is private.

**Change.** The splice comes from `lib/markdown.mjs`; the re-verification stays.

**Verify.** An equivalence run in a scratch script: the old and new splice give identical
files for every `tb` fence opener in `docs/`.

### C36 — `wisdom: parseStaging splits only on real section boundaries`

**L3-3 (R1), second half.** After C26 a fenced `---` makes the run fail instead of dropping
content; this makes it not a boundary at all.

**Change.** `parseStaging` splits with `splitOnMarker(src, line => line === "---")`, and
`serializeStaging` writes back through the same module.

**Verify.** The real `staging.md` parses to the same 1,160 sections, with the same headings
and metadata, and serialises to the same bytes as before. C26's synthetic file now keeps its
section's tail and metadata.

### C37 — `scripts: check_gate_lists' sections ignore fenced headings`

**Inventory site B3.** `splitSections` (`:251-264`) starts a section at any line matching
`/^#{1,6}\s/`, so the fenced `staging.md` example at `docs/Documentation/Wisdom.md:304-305`
splits `### staging.md format` in two. No verdict changes today only because the phantom
section states no gate count.

**Change.** Sections through `splitOnMarker`, so a heading-shaped line inside a fence starts
none. A probe: a fenced `## ` line inside a section that states a count.

**Verify.** The gate's verdict and its 18 probes unchanged; the new probe fails with the old
splitter.

### C38 — `scripts: one Attributes.md reader for census and the probe generator`

**Inventory sites B1, B2.** `census_attributes.mjs`'s `documentedAttributes` (`:377-392`) and
`gen_attribute_probes.mjs`'s `parseAttributes` (`:66-90`) read `docs/Reference/Attributes.md`
line by line with near-identical patterns and no fence exclusion, so a future example showing
the page's own `Syntax:` format inside a fence would be read as an attribute. Both are in
`scripts/` since C10.

**Change.** One reader in `scripts/lib/`, over `blockRegions`, that skips fenced lines; both
tools use it.

**Verify.** A scratch script: both tools' parsed attribute lists identical before and after on
the real page, and a fenced `Syntax:` line ignored.

### C39 — `builder, eval: counts, run_case and nav_hops skip code`

**Inventory sites B4, B5, B8, B9.** `counts.mjs`'s `countAttributeAnchors` (`:112-116`) and
`countEnumerations` (`:130-140`) apply regexes to raw source. `eval/run_case.mjs`'s
`evaluatorProtocol` (`:99-110`) cuts `eval/protocol.md` at the first bare `---` and a
heading, and the text it cuts becomes the evaluator's system prompt. `eval/nav_hops.mjs`'s
`hrefs` (`:86-94`) strips fences with a regex that recognises 1,353 of the corpus's 1,371;
the ones it misses are indented or use four backticks. None misfires today.

**Change.** Each finds its lines through `blockRegions`.

**Verify.** The tree comparison identical (the counts); `evaluatorProtocol` returns the same
text; `hrefs` returns the same links for every page.

### C40 — `builder, eval: frontmatter through lib/frontmatter; drop gray-matter`

**Decision (a)'s frontmatter half.** `gray-matter@4.0.3` bundles its own `js-yaml@3.15.2`,
while `data.mjs`, `tbdocs.mjs` and `check_publish_policy.mjs` parse the configuration with
`js-yaml@4.3.2`: page frontmatter and site configuration go through two major versions of one
library.

**Change.** `discover.mjs` (`:94-117`, which strips the BOM itself because `matter.test()`
does not) and `eval/nav_hops.mjs` use `parseFrontmatter`. `gray-matter` leaves
`package.json` and Builder.md's Dependencies, after the **owner's confirmation** for
`npm uninstall`.

**Verify.** Every page's parsed frontmatter deep-equal under both parsers, and the tree
comparison identical. Compare before uninstalling, since the before side needs `gray-matter`;
rebuild once after.

### C41 — `wisdom: read pages and threads through lib/`

**A10-2 (R1), A10-3 (R2).** Three frontmatter readers disagree: `wisdom/extract/sitemap.mjs:69-87`
has no BOM strip and no type coercion, `prep.mjs:343-388` coerces arrays, booleans and
numbers, and `discover.mjs` strips a BOM, after the AppGlobalClassObject incident. No page
has a BOM today. `sitemap.mjs:61-67`'s `walk()` repeats the markdown walker, and its recorded
reason, "no dependency on `builder/`" (`wisdom/PLAN-3.md:404`), never applied to a walker
that depends on nothing.

**Change.** Both readers use `parseFrontmatter`, and `sitemap.mjs` lists its pages with
`lib/markdown-files.mjs`.

**Verify.** Every page's and every harvested thread's parsed frontmatter deep-equal before and
after, with each difference resolved on purpose. Two are likely: YAML gives numbers and dates
where `sitemap.mjs` gave strings, and it refuses an unquoted `: ` inside a value, which a
harvested Discord title may hold. If a thread file has one, the harvester that writes these
files quotes its values, and the existing files are fixed in the same commit. The walker
returns the same files.

*The link checker, the gates' scaffolding, the browser tools and the repository root:
C42–C46.*

### C42 — `scripts: check_links.mjs becomes a thin wrapper over builder/check.mjs`

**Decision 5, A4-2 (R2), A4-1 (R3).** `check_links.mjs:602-634`'s `buildFindings` repeats
`check.mjs:422-449`'s `findingsFor`, and `statSafe` is in both (`link-check.mjs:455-457`,
`check_links.mjs:151-153`). The comments that justify the pair (`check.mjs:410-414`, and
`check_links.mjs`'s header, `:6-14`) describe two independent implementations for
`check_links_diff.mjs` to compare, which decision 5 replaces with one implementation read two
ways.

**Change.** `check_links.mjs` keeps its command line and its own reading of a tree from disk,
and calls `check.mjs`'s `checkChunk`, `joinChunks`, `findingsFor` and `formatReport` for the
rest. `buildFindings` and its `statSafe` go. Both comments are rewritten to say what
`check_links_diff.mjs` now compares: a tree read from disk against the same tree held in
memory, through one implementation.

**Verify.** `check_links_diff.mjs --a script --b fused` agrees on every case, and its
`--self-test` passes. `check_links.mjs` prints the same report on `docs/_site` and
`docs/_site-offline` before and after. CI's fixture cases unchanged.

### C43 — `scripts: lib/gate-probes.mjs for the gates' probes and crash handler`

**A6-1 / L1-11 / L4-13 (R1).** A probe accumulator and report loop in
`check_page_baseline.mjs` (`:38-44,128-139`), `check_book_coverage.mjs` (`:81-87,158-170`) and
`check_symbol_index.mjs` (`:40-45,361-370`); a crash handler in those three and in
`check_publish_policy.mjs:29`; `withBaseline` in `check_page_baseline.mjs:46-55` and
`check_symbol_index.mjs:314-323`. Only `check_book_coverage.mjs:162` re-indents a multi-line
detail.

**Change.** `scripts/lib/gate-probes.mjs` holds the accumulator, the report, the crash handler
and `withBaseline`. Probes stay unconditional, and the exit code for a failed probe is a
parameter: 1 for these gates, 2 where probes guard a separate sweep. The three gates and
`check_publish_policy.mjs` adopt it, and so do the handlers C07 and C28 added. C07's sits
inside `convert_em_dash_separators.mjs`'s entry-point guard because that module is
importable, so the shared handler is installed by a call, never as a side effect of the import.
`check_gate_lists.mjs` and `check_regex_safety.mjs` adopt it only if the fit is exact. The
re-indenting becomes the shared behaviour: the one change in output, and only in gate text.

**Verify.** Each adopting gate's probe count and verdict unchanged; a broken probe still fails
it; a forced crash exits 2.

### C44 — `scripts: the dot tools share one launch, host page and source list`

**A5-5, A5-6 / L2-3 (R2).** `check_dot_fit.mjs:76-87` and `build_dot_metrics.mjs:57-68`
build the same Inter host page and the same launch, and neither explains
`--allow-file-access-from-files`. `check_dot_fit.mjs:49-67`'s `findDotSvgs` repeats
`builder/dot.mjs:135-155`'s `listDotSources`, which is not exported.

**Change.** Both launch through `scripts/lib/browser.mjs` (C19), whose file-access option
adds the flag and states its reason once; the host page is built in one place;
`listDotSources` is exported and `check_dot_fit.mjs` uses it, keeping the broad `_` and `.`
skip, which is safe today.

**Verify.** `check_dot_fit.mjs`'s output unchanged; `build_dot_metrics.mjs` regenerates
`builder/inter-metrics.json` byte for byte; both listings name the same files.

### C45 — `a11y: one page discovery and stub ceiling for the sampler and the sweep`

**A5-3 / L4-9, A5-4 (R2, R3).** `pick_a11y_sample.mjs` (`:122,159-169,184`, `STUB_CEILING`)
and `sweep_a11y.mjs` (`:78,129-153`, `STUB_TAG_CEILING`) each discover pages, count tags and
apply a ceiling of 100, though `--propose` reads the JSONL the sweep writes, so the two must
agree. `pad` and `median` are identical in both.

**Change.** One discovery, ceiling, `pad` and `median`, in `axe-scan.mjs`, which both already
import.

**Verify.** `pick_a11y_sample.mjs --census` and `--propose` output unchanged; a sweep over two
pages writes records of the same shape.

### C46 — `lib: one repository root for every tool`

**L2-5 (R2).** Nineteen files derive the repository root inline, in about five different
expressions; `axe-scan.mjs:29` exports `REPO_ROOT`, and two files import it. `Extending.md:654`
says nearly all use one expression, and three do.

**Change.** `lib/repo-paths.mjs` exports the root, and the few paths several tools build from
it. The nineteen use it, `builder/`'s two included, which a `scripts/lib/` module could not
serve; `axe-scan.mjs` re-exports it for its two importers. `Extending.md:654` states the
convention as it now is.

**Verify.** The tree comparison identical; `test.bat` and `check.bat` clean;
`check_examples.mjs --census`, and each `eval/` and `wisdom/` tool's cheapest mode, unchanged.

*Command lines (decision (e)): C47–C52.*

### C47 — `lib: cli.mjs on node:util parseArgs, and check_cli.mjs`

**Decision (e), L1-13 (R2).** Nothing tests any tool's argument handling, which is how L1-1,
L1-2, L1-3 and L1-6 shipped.

**Change.**

- `lib/cli.mjs`, in `lib/` because `tbdocs` migrates onto it (departure 2), to L1's
  specification in the ledger: `parseCli(argv, {options, positionals})` over `parseArgs`
  with `strict`, `allowPositionals` and `tokens`, camelCase names and positional-count
  checks; `withUsageError(fn, {stream, exitCode})`, which keeps each tool's message, stream
  and code; `numberOption()`; and `printHelpAndExit(text, {stream, exitCode})`, which keeps
  each tool's current help behaviour until Phase 3. The options that repeat (`--forbid`,
  `--source`, `--case`, `--additional-script`, `--channel`) are `multiple`.
- `scripts/check_cli.mjs`, a `test.bat` gate: the module's own probes, and a table of cases
  per migrated tool (arguments, exit code, stream, and a pattern for the message), recorded
  from each tool's behaviour before it migrates. Only invocations that stop during argument
  parsing qualify. They run as child processes, in parallel, each with a timeout, and with the
  IDE and browser locations pointed at nothing, so a case that got past parsing fails instead
  of starting either.
- Registered in `test.bat`, the composite action, Tools.md's list and WIP.md.

**Verify.** The probes; changing one recorded expectation fails the gate; the roster gate
passes. CI waits for the owner's push.

### C48 — `scripts: the a11y and diagram tools parse through lib/cli.mjs`

**A5-1 (R1).** Eight hand-written loops, diverged three ways. `check_a11y.mjs:63-79` answers
`--help` with "unknown arg" and exit 2, where `pick_a11y_sample.mjs:144-147` and
`sweep_a11y.mjs:106-110` print usage to stderr and exit 0; `check_dot_fit.mjs:47` and
`build_dot_metrics.mjs:55` test with `.includes()` and ignore a mistyped flag;
`check_a11y_fingerprint.mjs`, `check_axe_patch_equiv.mjs` and `check_tree_fresh.mjs` print
usage to stdout.

**Change.** All eight parse through `parseCli`, each keeping today's behaviour, the ignored
typo included, which C72 removes. Their cases go into `check_cli.mjs` first.

**Verify.** `check_cli.mjs`'s cases for the eight, recorded before and passing after;
`check.bat` unchanged.

### C49 — `scripts: the harness tools parse through lib/cli.mjs`

**A7-5 (R2)'s `die()` half, and L1-2's copies.** `tbbuild`, `tbrun` and `addin_test` each
have a `flag()` and `opt()` pair and a `die()`, in three shapes (V3's fifth note);
`check_examples`, `census_attributes`, `build_package_api`, `gen_attribute_probes` and
`check_tb_registry` parse by hand as well.

**Change.** All eight through `parseCli`, keeping today's behaviour, C17's fixes included;
`tbrun` and `addin_test` still substitute their default for an empty value until C72.

**Verify.** `check_cli.mjs`'s cases; the `examples.bat` summary and `addin-test.bat`
unchanged (harness runs, one at a time).

### C50 — `scripts: the gates and link tools parse through lib/cli.mjs`

**Decision (e); L1-2's fourth variant.** The rest of `scripts/`.

**Change.** `check_links.mjs`, whose collect-and-warn handling of unknown flags stays custom
code until C72; `check_links_diff.mjs`; `crawl_check.mjs`; `check_publish_policy.mjs`, whose
inline `opt` is L1-2's fourth variant; `check_regex_safety.mjs`, with its internal `--shard`
flag; `check_code_regions.mjs`; `check_gate_lists.mjs`; `convert_em_dash_separators.mjs`; and
`survey_tooling.mjs`. Each keeps today's behaviour.

**Verify.** `check_cli.mjs`'s cases; `test.bat` and `check.bat` unchanged;
`check_links_diff.mjs --a script --b fused` agrees.

### C51 — `book, eval, wisdom: parse through lib/cli.mjs`

**A10-1, L1-12 (R3).** `render-book.mjs:204-225` parses by hand and rejects `--help`;
`eval/`'s four parsers differ on unknown arguments and exit codes, and `transcript.mjs:190-198`
exits 1 on a bare `--help`; "usage, then an exit code chosen by whether help was asked" is
repeated six times across `eval/` and `wisdom/`.

**Change.** `render-book.mjs` and the four `eval/` scripts through `parseCli`, with
`printHelpAndExit` replacing the six copies, each keeping today's behaviour. `wisdom.mjs`'s
subcommands need code the module does not have, so it migrates only if the fit is clean, and
otherwise stays as it is with a comment saying why.

**Verify.** `check_cli.mjs`'s cases; `book.bat` renders; each `eval/` script's cheapest mode
unchanged.

### C52 — `builder: tbdocs parses through lib/cli.mjs`

**A1-8 (R3), last, as decision (e) says.** `tbdocs.mjs`'s parser (`:91-194`) is neither
exported nor tested, and `--no-check` resets other flags, so order matters.

**Change.** The option table moves out of `tbdocs.mjs` into a module that exports it. The
order-dependent resets read `parseCli`'s tokens in order. `--name=value`, which today works
for only some of its flags (L1-10), then works for all of them.

**Verify.** `check_cli.mjs`'s cases for `tbdocs`, C18's exit value and the `--no-check`
ordering included; the tree comparison identical; `build.bat`, `serve.bat` and the CI build
steps behave as before.

*`builder/`'s helpers, defined twice: C53–C60.*

### C53 — `builder: one URL module`

**A3-3 / L4-6 (R1), A9-8 / A2-6 (R2), A2-5, and A3-5's `splitFragment` (R3).** `seo.mjs:121-148`
and `template.mjs:917-936` each define `absoluteUrl` and `relativeUrl`, and they disagree
three ways: a forced leading slash; protocol-relative `//host`, which `seo.mjs`'s scheme-only
`isAbsoluteUrl` misses and prefixes; and `null` against `""` for a non-string.
`normalizeBaseurl` is byte-identical in `book.mjs:303-307` and `offline-rewrite.mjs:232-236`,
and `book.mjs:300-302` justifies its copy by the retired Jekyll plugin layout. `encodeSpaces`
(`search.mjs:204`, `template.mjs:925`) and `splitFragment` (`render.mjs:1593`,
`crawl_check.mjs:51`) are each written twice.

**Change.** `builder/url.mjs` with one of each. The two URL helpers take the semantics that is
right for `//host` and for a non-string, keeping a forced leading slash only where a call site
needs it. `crawl_check.mjs` imports `splitFragment` from it.

**Verify.** The tree comparison identical, and again with `--baseurl /docs`: a non-empty base
URL is where the two helpers disagree, and this site's is empty.

### C54 — `builder: one module for the HTML, XML and RegExp escapers`

**A3-2 / L3-5, A2-4 (R2).** Seven HTML escapers of two kinds: `&<>` in `render.mjs:2230-2233`,
`highlight.mjs:251-254` (matching Rouge, a recorded reason) and `gantt.mjs:213`; `&<>"'` in
`render.mjs:2225-2228`, `template.mjs:993-998` and `:999-1001` (identical bodies under two
names), and `sitemap.mjs:106-113`. `escapeHtml` names both kinds, and markdown-it has a third
function of that name. `render.mjs:1437-1450`'s `headingTocHtml` escapes `text` tokens with
one kind and `code_inline` tokens with the other. `escapeRegExp` is identical in
`render.mjs:2235-2237`, `offline-rewrite.mjs:239-241` and `book.mjs:212-214`.

**Change.** `builder/escape.mjs` holds one escaper of each kind, named for what it escapes
(the three-character one for Rouge parity), and one `escapeRegExp`; every copy imports from
it. `headingTocHtml` escapes both token kinds alike.

**Verify.** The tree comparison identical, since no heading in a table of contents holds an
apostrophe or quote today; a scratch page with one renders the same text in the heading and
in the table of contents. `check_regex_safety.mjs` still recognises the escaper, which it does
by shape.

### C55 — `builder: one code/pre guard and replaceOutsideCode`

**A9-7 (R2).** The `<code>`/`<pre>` leading alternative that WIP.Build.md prescribes for a
whole-page rewrite is typed four times: `book.mjs:210` and again inside `:228-229`,
`pdf.mjs:143-144` (identical to `book.mjs`'s), and at the head of `offline-rewrite.mjs:299`.

**Change.** A `builder/` module exports the fragment and `replaceOutsideCode`, which is
private in `book.mjs:216` today; the four patterns are composed from the fragment.

**Verify.** The tree comparison identical, covering `book.html` in the PDF tree and every
offline page. `check_regex_safety.mjs` clean on the composed patterns.

### C56 — `builder: guard code in the three whole-page HTML rewrites`

**A3-6 (R2).** `padEmptyCells` (`render.mjs:74-80`), `normaliseVoidTags` (`:351-354`) and
`injectAnchorHeadings` (`template.mjs:714-727`, whose `HEADING_REGEX` at `:694` has no code
alternative) rewrite whole pages with no guard. They are safe only because code is
entity-escaped before they run, which holds for fenced, indented and inline code and fails
for hand-written raw HTML, which markdown-it passes through; no page has any today. The
invariant is stated at none of the three, and `check_code_regions.mjs` checks only the
pre-render chain.

**Change.** Each rewrite goes through C55's `replaceOutsideCode`, or, if a guard would change
what it does, states the invariant where it runs. `check_code_regions.mjs` gains post-render
probes: a raw `<pre>` holding an empty cell, a void tag and a heading-shaped line comes
through all three rewrites unchanged. WIP.Build.md's section on rewrites names these three,
and also the token-scoped `md.core` rules, the third sound mechanism it does not yet name (a
lead from L3).

**Verify.** The tree comparison identical; each probe fails with its guard removed.

### C57 — `builder: one drift guard for the page and symbol baselines`

**A2-3 / L2-4 / L4-5 (R2).** `readBaseline` is byte-identical in `page-baseline.mjs:83-90` and
`symbol-baseline.mjs:45-52`, and the six-branch drift logic is typed twice
(`checkPageBaseline`, `:117-176`; `checkSymbolBaseline`, `:75-125`). `symbol-baseline.mjs:55-58`'s
hand-written `writeBaseline` equals `JSON.stringify(x, null, 2) + "\n"` except for an empty
list.

**Change.** One module for the read, the drift logic and the write, parametrised by what is
compared, counts or a set of URLs; the write is `JSON.stringify`.

**Verify.** After a build, and after each `--update-*-baseline`, both committed baselines are
byte-identical. `check_page_baseline.mjs` (11 probes) and `check_symbol_index.mjs` (46) pass,
and a reintroduced drift fails each.

### C58 — `builder: fold six small duplicates`

Each written twice, with no recorded reason for the copy:

- **A2-7 (R2):** the ASCII-only whitespace collapse that keeps NBSP, by regex in
  `compress.mjs:73-84` and by char code in `search.mjs:251-261`. WIP.Build.md records a
  shipped defect in exactly this area.
- **L4-3 (R2):** `vendor-assets.mjs`'s `fetchToFile` (`:222-252`) and `fetchAttachment`
  (`:279-319`) each implement the guarded fetch and the temp-and-rename write. Their
  validation, which differs for good reason, stays apart.
- **L4-2 (R3):** `scss.mjs`'s `compileLightScss` and `compileDarkScss` (`:65-76,78-89`).
- **A3-8 (R3):** three palette loops in `highlight-theme.mjs` (`:336-344,351-359,364-372`).
- **A2-8 (R3):** `replaceAll("\\", "/")` at ten sites in `offline-rewrite.mjs` and
  `offline.mjs`, and a private `posix()` in `publish-policy.mjs:189`, become one helper.
  `check-tree.mjs:46`'s copy stays, for its recorded reason: import cost on the dispatch
  path.
- **A3-4 (R3):** `isNonEmpty` in `nav.mjs:338` and `seo.mjs:164`.

**Verify.** The tree comparison identical, the search index, compressed pages and both
stylesheets included. For the fetch, the stubbed-fetch script from the last review
(`PLAN-REVIEW-c9f2dfe0-1b6922b.md`, C09) still rejects an HTML body and survives a network
failure, and every committed thumbnail still validates.

### C59 — `builder: cpu-worker's timed task paths share one runner`

**A1-3 / L4-1 (R2), A1-7 (R3).** The same run, time and report block appears three times in
`cpu-worker.mjs` (`:360-377,423-440,469-486`). The fourth path (`:497-540`) is genuinely
different, with an ordering that closes a race, and stays as it is. `:510` writes the literal
`4` for FAILED, the one SAB constant not used by name.

**Change.** One `runTimed()` for the three paths; `:510` uses the named constant.

**Verify.** The tree comparison identical; the build reports its task timings as before.

### C60 — `builder: name tbdocs's exit bits and set them in one place`

**A1-6 (R2).** Seven sites set exit bits with bare literals
(`tbdocs.mjs:560,1469,1470,1568-1573,1598,1610`), five of them bit 0. The three plain
assignments are safe only because they run before the ones that OR (V1's third note).

**Change.** Named constants for the two bits and for C18's command-line value, and one
`failBuild(bit)` that ORs.

**Verify.** Each provoked failure exits as before: a broken link 1, an integrity failure 2,
both 3, a command-line error 4, a baseline drift 1. A scratch copy that moves an assignment
after an OR still exits with both bits.

*The harness: C61–C65.*

### C61 — `scripts: one logicalLines for twinBASIC source`

**L4-10 (R1).** `tb-fences.mjs:423-445` and `twin-api.mjs:51-86` each split source into
logical lines, and differ on a BOM and on block comments: `tb-fences.mjs` has no `/* */`
handling at all, and survives a BOM only because `trim()` strips U+FEFF (V3). Both strip
comments with quotes in mind, for the same reason. Swapping one for the other is not
mechanical: `twin-api.mjs` keeps blank lines, numbers lines from 1 where `tb-fences.mjs`
counts from 0, never trims, and recognises `Rem`.

**Change.** One exported `logicalLines` in `twin-api.mjs`; `tb-fences.mjs` uses it and
absorbs each of the four differences on purpose. Probes for a `/* */` spanning two lines and
for a BOM join `check_examples.mjs`'s `runProbes`.

**Verify.** `check_examples.mjs --census`, which runs its 119 probes and needs no compiler,
unchanged apart from the new probes. The `examples.bat` summary unchanged, 1,119 samples (a
harness run).

### C62 — `scripts: one twinBASIC keyword classifier, with probes in test.bat`

**A8-1 (R1), A8-4 (R2).** `census_attributes.mjs`'s `MODS` (`:138-148`) lacks `Overridable`,
`Iterator` and `Dim`, which `twin-api.mjs:123-125` and `tb-fences.mjs:340-343` have, so
`Public Overridable Sub` falls through to the variable path. The BETA 983 packages hold 31
such lines and none has an attribute, so no census result changes today. Two more
divergences are structural: `blankStrings` has no `""` escape, and the block-comment state is
kept per line. Neither this classifier nor `gen_attribute_probes.mjs`'s `parseTargets`
(`:961-978`) has a test, and both have shipped silent misparses
(`census_attributes.mjs:42-67,150-152`; `gen_attribute_probes.mjs:946-947`).

**Change.** One classifier module in `scripts/lib/` for the modifier keywords and declaration
shapes, used by all three. Ride-along probes for it, for census's classification and for
`parseTargets`, in a new `test.bat` gate, `check_twin_parsers.mjs`, registered in the
composite action, Tools.md and WIP.md.

**Verify.** `census_attributes.mjs --json` unchanged (a harness run);
`gen_attribute_probes.mjs`'s output unchanged; removing `Overridable` from the list fails a
probe. CI waits for the owner's push.

### C63 — `scripts: click the build icon like every other control`

**A7-3 (R2).** `tb-ide.mjs:848-861`'s `clickCenter` has no scroll into view, hit test or
retry, and its two callers are both the build icon (`tb-ide.mjs:757`, `tbrun.mjs:295`).
`tb-operate.mjs:79-134`'s `click` has all three and serves four of the ten add-in tests.

**Change.** Both callers use the click with the hit test and retry. The harness modules stay a
DAG: if `tb-operate.mjs` imports `tb-ide.mjs`, the click moves down to where both can reach
it. If the build icon turns out to need the plain click, it keeps it, with a comment saying
why.

**Verify.** `addin-test.bat` green, all ten lanes; the `examples.bat` summary unchanged
(harness runs, one at a time).

### C64 — `scripts: three small harness duplicates`

- **A7-4 (R2):** `alive` and `norm`, private in `tb-registry.mjs` (`:588-590`, `:462`) and
  repeated in `addin_test.mjs` (`:105,230`), which imports ten other names from it. Export
  them.
- **A7-7 (R3):** the 180-second compile timeout, a literal at seven sites in four files. One
  named constant.
- **A8-3 (R3):** `check_examples.mjs` computes a fence's unit key in `makeBatches` (`:424`)
  and again in `unitsOf` (`:675`). One function.

**Verify.** The `examples.bat` summary and `addin-test.bat` unchanged (harness runs, one at a
time).

### C65 — `test: one scenario preamble and one linesSince for the add-in tests`

**A7-8 / L4-14 (R2).** All ten `test/addin/*.test.mjs` files write their own lane preamble
and skip object, and six read "console lines since a mark" in four ways: `appdata.test.mjs:33`
and `panes.test.mjs:86` with hard-coded slice offsets, `arch.test.mjs:31` and
`reload.test.mjs:37` with two different regex captures, `keys.test.mjs:28` with a split and a
trim, and `sample10.test.mjs:81` with a bare trim.

**Change.** A scenario helper for the preamble and the skip object, and one `linesSince`
beside `readConsole`.

**Verify.** `addin-test.bat` green, all ten lanes (a harness run).

*The book's pdf-lib shims (decision (c)): C66–C69.*

### C66 — `book: check_pdf_shims_equiv.mjs, the shims against stock pdf-lib`

**A9-2 (R2).** No test compares shimmed pdf-lib output with stock; the only comparisons are
one-off notes in `perf/notes/08-pdf-lib.md`.

**Change.** A `test.bat` gate modelled on `check_axe_patch_equiv.mjs`. The same document is
loaded, changed and saved by stock pdf-lib in a child process and by pdf-lib with the thirteen
shims installed here, and the two results are compared object by object, with streams
decompressed, since a different deflate can give different bytes for the same content. The
document is generated in the gate to reach every shimmed path (parsing, arrays and
dictionaries, the parallel deflate, the inflate replacement), so the gate needs no built tree.
Registered in the composite action, Tools.md and WIP.md.

**Verify.** Passes; a deliberately broken shim fails it, and the report names the shim. CI
waits for the owner's push.

### C67 — `book: one module for pdf-lib's internal requires`

**A9-5 (R3).** The `createRequire` and `require('pdf-lib/cjs/...').default` block is repeated
in nine production shims.

**Change.** `book/lib/pdf-lib-internals.mjs`, which the nine import.

**Verify.** `check_pdf_shims_equiv.mjs`; `book.bat` renders with the same page count and
outline.

### C68 — `book: the two onebuf shims share their range machinery`

**A9-3 (R2).** `_registerContext` and `_appendArray` are identical apart from names in
`fast-array-onebuf.mjs` and `fast-dict-onebuf.mjs`, while `pack`, `_cow`, `_makeFromRange`
and `_makeFromAppend` differ by real bit-packing and subclass dispatch.

**Change.** `book/lib/onebuf-range.mjs`, a factory parametrised over the subclass dispatch and
the gap mask that the two genuinely need differently (V3's fourth note), not one body with
renamed variables.

**Verify.** `check_pdf_shims_equiv.mjs`; the book's page count and outline unchanged; render
time within noise of before, since these shims exist for speed.

### C69 — `book: each pdf-lib shim checks what it overwrites`

**A9-1 (R2).** The thirteen production shims each guard against being installed twice and
never check what they replace, and `parallel-deflate.mjs:50`'s `PDFStreamWriter` subclass has
no guard at all. Only the exact pin protects them (recorded in `08-pdf-lib.md:1751-1757`),
and it catches an accidental `npm update`, not a deliberate upgrade or a mistaken edit.
Upstream is abandoned, and the `@cantoo` fork was evaluated and rejected
(`08-pdf-lib.md:5048-5061`).

**Change.** At load, each shim asserts the shape of what it overwrites (the member exists,
its arity, and a fingerprint of its source where one is stable), modelled on `axe-scan.mjs`'s
`SOURCE_PATCHES` counts, and throws naming itself otherwise. Each header states the exit: the
shim goes when pdf-lib is replaced, or when a release changes what it patches.

**Verify.** With a target altered in a scratch copy of pdf-lib, the named shim throws at load;
`check_pdf_shims_equiv.mjs` passes; `book.bat` renders.

*impexp (decision (b)): C70.*

### C70 — `scripts: check_impexp_parity.mjs, the two impexp editions compared`

**A10-6 (R2).** `impexp.mjs` and `impexp.py` each have 19 self-tests, with identical names in
the same order, run by nothing, and Tools.md promises that the two print the same output and
write byte-identical files.

**Change.** A `test.bat` gate that runs both `--self-test` suites (the same names, all
passing) and runs the same commands through both editions on the repository's fixtures
(`indexer/sample.twinpack`, and a project under `test/example-projects/`), comparing printed
output and written files byte for byte. Decision (b)'s open question is settled here: whether
`test.bat` without Python fails, or reports the gate skipped, loudly. In CI a missing
interpreter fails the gate and never skips it. Registered in the composite action, Tools.md
and WIP.md.

**Verify.** Passes; a copy of one edition with one output line changed fails it. CI waits for
the owner's push.

## Phase 3: conventions users see

Decision (e): converge on `impexp.mjs`'s discipline. `--help` prints usage to stdout and exits
0; an unknown flag or a bad value prints to stderr and exits 2, or C18's value in the two link
tools; each tool has one table of exit codes. Each commit changes `check_cli.mjs`'s
expectations, the usage texts and Tools.md together.

### C71 — `scripts, book, eval, wisdom: --help prints usage to stdout and exits 0`

**L1-6 (R2), A5-1's help half, A10-1.** `--help` is handled four ways, and twelve tools ignore
it. `gen_attribute_probes.mjs:1147-1158` takes a bare `--help` as its output folder and creates
`--help/Sources`; `render-book.mjs:210-220` rejects it as unknown; `transcript.mjs` exits 1.

**Change.** Every tool prints its usage to stdout and exits 0, with no side effect.

**Verify.** `check_cli.mjs` gains a `--help` case for every tool, safe to run for all of them
once this lands; no file or folder appears.

### C72 — `scripts, book, eval, wisdom: an unknown flag or a bad value exits 2`

**L1-7, L1-5 (R2), A5-1's typo half, A10-1.** Eleven tools ignore an unknown flag,
`check_links.mjs` warns, eight refuse it with 2, some throw to 1 or 2, and `wisdom` refuses it
with 1. `check_links.mjs:307-314` still tolerates flags "passed through via check.bat's %*",
and the comment at `:406-412` still says `check.bat` passes it arguments; `check.bat` no
longer calls it (`PLAN-checks.md:14`). `tbrun` and `addin_test`
substitute their default for an explicit empty value.

**Change.** Strict parsing everywhere: an unknown flag or a bad value is an error on stderr,
with exit 2, or C18's value in the two link tools. `check_links.mjs`'s tolerance goes, and
both comments are corrected. Any exception a tool keeps is stated in its usage text and in Tools.md.

**Verify.** `check_cli.mjs` gains an unknown-flag case and an empty-value case for every tool.

### C73 — `scripts: one meaning each for --json and --src`

**L1-8 (R2), L1-9 (R3).** `--json` prints to stdout in `tbbuild`, `tbrun`, `check_examples`
and `census_attributes`, and takes a file in `check_a11y_fingerprint.mjs`. `--src` is the
documentation root in `tbdocs` and `check_publish_policy`, and the exported package tree in
`census_attributes` and `build_package_api`.

**Change.** The odd ones out are renamed: `check_a11y_fingerprint.mjs`'s file option and the
two package-tree options get names of their own. WIP.A11y.md, WIP.Harness.md and Tools.md
follow.

**Verify.** `check_cli.mjs`; `git grep` finds no old spelling in the documents or scripts.

### C74 — `scripts: one exit-code table per tool, and no code with two meanings`

**Decision (e).** Each tool's usage text and its Tools.md entry get one table of exit codes.
A code that means two things is split: `addin_test.mjs`'s 2 covers both a harness that failed
and a registry it could not restore (L1's notes in the ledger), and the second is the one the
user must act on.

**Verify.** Each table checked against the code; `check_cli.mjs` for the codes it can reach;
`addin-test.bat` green (a harness run).

### C75 — `serve.bat: return tbdocs's exit code`

**A6-5 (R3).** `serve.bat` does not pass its child's exit code back, unlike the other
wrappers, which capture it before `popd`.

**Change.** The same idiom.

**Verify.** A `serve.bat` that cannot start, because its port is taken, exits non-zero.

## Phase 4: splits

Decision 2: a split is taken only where the evidence says good practice calls for it, and
size alone does not qualify. The test for each candidate is whether the split removes a hidden
dependency, lets a part be tested on its own, or separates parts that Phases 1 to 3 had to
change for unrelated reasons. Each is decided at the start of the phase against what the
earlier phases found, and each is a pure move, checked by the tree comparison or the owning
tool's oracle. `axe-scan.mjs` is not a candidate: the review found its single-source property
worth keeping.

### C76 — `render: split along its plugin seams`

The strongest evidence. The image rule order matters and nothing says so (`svgInlinePlugin`
at `:518` must run before `remoteImagePlugin` at `:520`); the ellipsis plugin assumes the
dashes plugin has run (`:515-516`); the plugins anchor on a third-party rule name
(`"curly_attributes"`); no plugin is tested alone; the two fence parsers sat 1,550 lines apart
until C32 and C33. First each ordering becomes explicit and tested, with a probe that
registers the plugins in the wrong order and fails; then the plugins move into modules along
those seams.

**Verify.** The tree comparison identical; each ordering probe fails with its order reversed.

### C77 — `builder: tbdocs's Gantt and timing code moves beside gantt.mjs`

`tbdocs.mjs:1268-1403` computes what `gantt.mjs` draws, and A1-1 is what the separation cost.
Further candidates, taken on evidence: the `TASKS` literal, which mixes the graph's shape with
the task bodies over 61 % of the file (`:260-1257`); `dispatch`'s `submit()`, which is SAB
machinery (`:788-911`); the check glue (`:1085-1256`); the console report (`:1478-1525`).

**Verify.** The tree comparison identical; the chart names the same tasks in the same rows.

### C78 — `builder: template.mjs's date formatter moves to its own module`

**A3-7 (R2).** After C53 and C54 take the URL and escape helpers, the strftime tables and
`formatDate`/`parseDate` (`:940-989`) are the one job left in the file that is not
templating. Its `navActivationCss` deferral (`PLAN-4.md` §3) is close to its trigger, and may
remove more.

**Verify.** The tree comparison identical, every formatted date included.

### C79 — `builder: book.mjs as a resolver, an assembler and a coverage check`

Its §A resolver, its §B–F assembly of `book.html` (with `rewriteBookHrefs`) and its §G
coverage check are separate concerns, and `pdf.mjs` already imports them as though they were
separate modules.

**Verify.** The tree comparison identical, `book.html` above all; `check_book_coverage.mjs`
passes.

### C80 — `scripts: check_examples' bisection and probe suite in their own modules`

Eight jobs share one file; bisection (`:657-927`, 270 lines in 14 functions) and the 425-line
probe suite (`:1157-1581`) are the clearest to separate. `gen_attribute_probes.mjs` is not a
candidate: half of it is its own data table.

**Verify.** `check_examples.mjs --census` and the `examples.bat` summary unchanged (a harness
run).

### C81 — `scripts: tb-ide's console reading and add-in introspection move out`

Both separate cleanly from the build-state core, which stays together.

**Verify.** `addin-test.bat` green and the `examples.bat` summary unchanged (harness runs, one
at a time).

## Phase 5: documentation and measurement

Written last, against the code as it then is, with every claim re-read against the file it
describes: the last review found its own figures stale by the time its documentation commit
ran.

### C82 — `docs: the module map, Tools.md, WIP.Build.md and Extending.md, as they now are`

Builder.md's module map (the new `builder/` modules, and `lib/`); Tools.md's entries for the
new tools and gates, added in their commits and re-read here; WIP.Build.md, with the markdown
module as the one answer to what is code and the rewrite rules restated against it;
Extending.md's conventions (`lib/cli.mjs`, `gate-probes.mjs`, `lib/repo-paths.mjs`); WIP.md's
gate table and wrapper bullets; and `PLAN-10.md:692`, which still cites
`convert_em_dash_separators.py` (V2's second note).

**Verify.** Every changed claim re-read against its file; `build.bat` and `check.bat` for the
anchors.

### C83 — `builder: the tooling survey re-run against its baseline`

`node scripts/survey_tooling.mjs --summary`, recorded as an *after* column in this file's
baseline survey table, with the reason for each measure's movement. Expected: private
`flag`/`opt`/`die` copies from 6 to 0, `parseArgs` users from none to every migrated tool,
undeclared packages from 2 to 0, and clone regions and repeated names well below 571 (266
outside `perf/`) and 74 (54).

**Verify.** The recorded column re-read against the survey's own output; each measure that did
not move as expected has its reason written down.

## Phase 6: formatting

Decision 4's second half, once every fix is in, so that the review's citations stayed valid
while the fixes were made and the formatter touches only code that survived them.

### C84 — `repo: settle line endings for the formatted file types`

The repository stores LF, 118 of 140 working-tree files are CRLF under `core.autocrlf=true`,
and there is no `.gitattributes`. Either a `.gitattributes` for the formatted types or the
formatter's own line-ending setting, shown to give the same verdict on a CRLF Windows checkout
and an LF CI checkout; otherwise every local run flags 118 files.

**Verify.** The formatter's check gives the same verdict in this working tree and in a
worktree checked out with `core.autocrlf=false`.

### C85 — `lint: the formatter and its style rules, set to the majority style`

The formatter, the linter's own from C05, pinned exactly and configured to the majority style:
double quotes, as `builder/`, `scripts/`, `test/` and `eval/` use, where `book/` and
`wisdom/` use single. Any style lint rules go beside it. Nothing enforces it yet.

**Verify.** The formatter's check runs clean on its own configuration and lists the files C86
will change.

### C86 — `format: apply the formatter`

Mechanical, and nothing else.

**Verify.** The tree comparison shows what it changed in the output: only
`docs/assets/js/svg-inline.js` and `theme-toggle.js`, which the site ships as written, should
differ. `test.bat`, `check.bat`, the `examples.bat` summary and `addin-test.bat` unchanged.

### C87 — `lint: check formatting in the gate and the hook; blame ignores C86`

`check_lint.mjs` and the pre-commit hook check formatting too; `.git-blame-ignore-revs` lists
C86; WIP.md and Tools.md say so.

**Verify.** A misformatted staged file is refused by the hook and fails the gate with 1;
`git blame` on a file C86 touched skips it. CI waits for the owner's push.

## Coverage

Every finding in the review, mapped to the commit that addresses it. A finding closed by more
than one commit lists each.

### Findings

| Finding | Tier | Commit |
|---|---|---|
| A1-1: the Gantt chart drops Check and `vendorAssets` | R1 | C21 |
| A1-2: `picocolors` undeclared (and `pako`) | R1 | C09; policy in C01 |
| A3-1 / L3-4 / L4-7: two fence-opener predicates disagree | R1 | C31–C34 |
| A3-3 / L4-6: two URL helpers diverged | R1 | C53 |
| A4-3: `crawl_check` misses seven link attributes | R1 | C22 |
| A5-1: argument loops in eight scripts | R1 | C48; C71, C72 |
| A6-1 / L1-11 / L4-13: the gates' scaffolding copied | R1 | C43; handlers first in C07, C28 |
| A6-2: `test.bat`'s account of the gate's history | R1 | C29 |
| A7-1: `tbrun` misses two failed-build shapes | R1 | C16 |
| A8-1: census's keyword list lacks `Overridable` | R1 | C62 |
| A10-2: three frontmatter readers disagree | R1 | C41; module in C31 |
| L1-1: theme and viewport checked in one tool of three | R1 | C20 |
| L1-2: `opt()` returns `undefined`, then `NaN` | R1 | C17; C49, C50 |
| L1-3: `tbbuild --keep proj` fails | R1 | C17 |
| L1-4: a `tbdocs` usage error exits as a link failure | R1 | C18 |
| L2-1: two output-tree lists miss `_site-basepath*` | R1 | C13, after C12 |
| L2-2: census's private install finder | R1 | C11 |
| L3-1: `check_a11y` leaves Chromium running | R1 | C19 |
| L3-3: `parseStaging` drops content after a fenced `---` | R1 | C26 (loud), C36 (fence-aware) |
| L4-10: two `logicalLines` | R1 | C61 |
| A1-3 / L4-1: a run, time and report block three times | R2 | C59 |
| A1-4: `makeTimer`'s export unused | R2 | C14 |
| A1-6: exit bits as bare literals | R2 | C60 |
| A2-1 / A1-5 / L4-4: dead paths left by the diff tools | R2 | C14 |
| A2-2 / A9-10: comments naming deleted tools; `extractImagePaths` | R2 | C14 |
| A2-3 / L2-4 / L4-5: the baseline reader and drift guard | R2 | C57 |
| A2-4 / A3-5's `escapeRegExp` part: `escapeRegExp` three times | R2 | C54 |
| A2-7: the whitespace collapse twice | R2 | C58 |
| A3-2 / L3-5: seven HTML escapers | R2 | C54 |
| A3-6: three unguarded whole-page rewrites | R2 | C56, after C55 |
| A3-7: `template.mjs` does four jobs | R2 | C53, C54, C78 |
| A4-2: the findings translation twice | R2 | C42 |
| A5-2: two tools crash to exit 1 | R2 | C28 |
| A5-3 / L4-9: page discovery and stub ceiling twice | R2 | C45 |
| A5-5: the diagram tools' launch and host page twice | R2 | C44; lifecycle from C19 |
| A5-6 / L2-3: the `.dot` walker twice | R2 | C44 |
| A6-3: the dash tool has no exit for a crash | R2 | C07; C43 |
| A6-4: nothing reads the workflows | R2 | C03, C04 |
| A7-2: `afterReveal`'s timeout discarded | R2 | C24 |
| A7-3: two click primitives | R2 | C63 |
| A7-4: `alive` and `norm` twice | R2 | C64 |
| A7-5: the harness CLIs' defaults and `die()` | R2 | C17; C49 |
| A7-8: the add-in scenario preamble ten times | R2 | C65 |
| A8-2: census in `builder/` | R2 | C10 |
| A8-4: two classifiers without probes | R2 | C62 |
| A9-1: the shims are not guarded | R2 | C69 |
| A9-2: no shim equivalence test | R2 | C66 |
| A9-3: the onebuf helpers twice | R2 | C68 |
| A9-6: shims only `perf/` loaded, in `book/lib/` | R2 | resolved in `90624841` |
| A9-7: the code and pre guard four times | R2 | C55 |
| A9-8 / A2-6: `normalizeBaseurl` twice | R2 | C53 |
| A10-3: wisdom's own walker | R2 | C41 |
| A10-4: `schemas.mjs` dead | R2 | C15 |
| A10-5: wisdom's state files not written atomically | R2 | C27 |
| A10-6: impexp parity unchecked | R2 | C70 |
| L1-5: `check_links`' stale pass-through tolerance | R2 | C72 |
| L1-6: `--help` handled four ways | R2 | C71 |
| L1-7: unknown flags handled five ways | R2 | C72 |
| L1-8: `--json` with two meanings | R2 | C73 |
| L1-13: no tests of argument handling | R2 | C47 |
| L2-5: the repository root derived in nineteen files | R2 | C46 |
| L3-2: `check_examples`' spawn has no `'error'` listener | R2 | C23 |
| L4-3: the vendoring fetch and write twice | R2 | C58 |
| A1-7: FAILED written as a literal | R3 | C59 |
| A1-8: `tbdocs`' parser untested | R3 | C52 |
| A2-8: path separators flipped at ten sites, `posix()` twice | R3 | C58 |
| A3-4 / A2-5 / A3-5 / A4-1, the L4-8 cluster: four leaf helpers written twice (its fifth, `makeTimer`, is A1-4) | R3 | C58 (`isNonEmpty`), C53 (`encodeSpaces`, `splitFragment`), C42 (`statSafe`) |
| A3-8: three palette loops | R3 | C58 |
| A3-9: `precomputeSeo` dead | R3 | C15 |
| A3-10: `kramdownSlug` exported | R3 | C15 |
| A5-4 / L4-9: `pad` and `median` twice | R3 | C45 |
| A6-5: `serve.bat` drops the exit code | R3 | C75 |
| A7-6: the `-EncodedCommand` comment | R3 | C25 |
| A7-7: the 180-second literal at seven sites | R3 | C64 |
| A7-9: `tbbuild`'s shutdown can skip its tidy step | R3 | C25 |
| A8-3: the fence unit key twice | R3 | C64 |
| A9-4: `_writeUint` and `_digitCount` twice | R3 | resolved in `90624841` |
| A9-5: the `createRequire` block in nine shims | R3 | C67 |
| A9-9: a comment citing a moved file | R3 | resolved in `90624841` |
| A10-1: `eval/`'s four parsers | R3 | C51; C71, C72 |
| L1-9: `--src` with two meanings | R3 | C73 |
| L1-10: `--name=value` only in `tbdocs` | R3 | C47–C52, as a side effect of `parseArgs` |
| L1-12: usage-then-exit six times | R3 | C51 |
| L2-6: scratch folders not removed in a `finally` | R3 | C30 |
| L2-7: three small tree walkers | R3 | none: the review proposes no fix |
| L3-6: unguarded `spawnSync` | R3 | C30 |
| L4-2: the two SCSS compiles | R3 | C58 |

### Decisions

| Decision | Commit |
|---|---|
| 1: `perf/` stays a lab notebook | done in `26eefeeb` and `90624841` |
| 2: fix in place first, split later | Phase 4, C76–C81 |
| 3: the tree comparison as a committed tool | C02 |
| 4: the linter first, formatting last | C05, C06, C08; C84–C87 |
| 5: both impexp editions, `build_fonts.py`, the link checker as a thin wrapper | C42; C70 |
| 6: a gate on the workflows | C03 |
| (a): the markdown module in `lib/`, and no `gray-matter` | C12, C31–C41 |
| (b): the impexp parity gate | C70 |
| (c): shim checks and an equivalence test | C66, C69; C67 and C68 under it |
| (d): the composite action | C04 |
| (e): command lines | C17 first, C47–C52, C71–C74 |
| (f): the `staging.md` slip | done in `e0d127f0` |
| (g): the pinning policy and Builder.md's list | C01, then the bar's rule |

### The inventory's fifteen sites

| Site | Commit |
|---|---|
| A1: `render.mjs`'s code mask | C32 |
| A2: `render.mjs`'s admonition rewrite | C33 |
| A3: `convert_em_dash_separators.mjs` | C34 |
| A4: `check_examples.mjs`'s marker splice | C35 |
| A5: wisdom's `parseStaging` and `serializeStaging` | C26, C36 |
| B1: `census_attributes.mjs`'s `documentedAttributes` | C38 |
| B2: `gen_attribute_probes.mjs`'s `parseAttributes` | C38 |
| B3: `check_gate_lists.mjs`'s `splitSections` | C37 |
| B4, B5: `counts.mjs`'s raw-source counts | C39 |
| B6: `wisdom/extract/sitemap.mjs`'s frontmatter | C41 |
| B7: `wisdom/extract/prep.mjs`'s frontmatter | C41 |
| B8: `eval/run_case.mjs`'s protocol cut | C39 |
| B9: `eval/nav_hops.mjs`'s links | C39; its frontmatter in C40 |
| B10: `test/addin/symbols.test.mjs` | none: it reads the first line of a compiler hover reply, which no fence can come before |

`discover.mjs`'s `gray-matter` call, a positive precedent in the inventory, moves in C40.

### Verifier notes folded in

| Note | Commit |
|---|---|
| V1: a fifth comment naming the diff tools, `offline.mjs:364-365` | C14 |
| V1: `render.mjs`'s two escapers, one a copy of `highlight.mjs`'s | C54 |
| V1: the bit-0 assignments safe only by source order | C60 |
| V2: `Extending.md:654` overstates its own convention | C46 |
| V2: `PLAN-10.md:692` cites the `.py` dash tool | C82 |
| V2: `gen_attribute_probes.mjs --help` creates a folder | C71 |
| V2: three frontmatter readers, not two | C41 |
| V3: `tb-fences.mjs` has no `/* */` handling; its BOM safety comes from `trim()` | C61 |
| V3: A8-1 and A8-4 are one gap | C62 |
| V3: the onebuf factory must parametrise the dispatch and the gap mask | C68 |
| V3: a `flag()` and `opt()` pair in each harness CLI | C49 |
| V4: `render.mjs`'s and the dash tool's fence patterns are identical literals | C34 |
| V4: `check_examples.mjs` has no process-level handler | C23 |
| V4: `escapeHtml` names three unrelated functions | C54 |
| V4: `check_a11y.mjs:229` names the path that leaks the browser | C19 |

## The bar for each commit

- `build.bat && check.bat && test.bat` clean; from C06, lint clean; from C87, format clean.
- The commit's oracle from the table above, with every difference it shows explained. The
  explanation goes in the commit's Landed note in this file, since commit messages stay one
  line.
- A commit that changes a gate shows the gate still failing on its reintroduced defect.
- One concern per commit, with a concise one-line message under 80 characters and no
  trailers.
- **A new gate is registered in the commit that adds it**: in `test.bat` or `check.bat`, in
  the composite action (in both workflows before C04), in Tools.md's numbered list, and in
  WIP.md's gate table and wrapper bullet. `check_gate_lists.mjs` and `check_ci_workflows.mjs`
  catch a miss in the first three; WIP.md is checked by hand.
- **A commit that changes `package.json`** follows C01's policy and updates Builder.md's
  Dependencies in the same commit. `npm install` and `npm uninstall` wait for the owner's
  confirmation, and so does any change to git configuration.
- **A move or a rename** updates every citation `git grep` finds, in published pages and the
  WIP files included.
- **Harness runs** (`examples.bat`, `addin-test.bat`, `tbbuild`, `tbrun`, `census_attributes`,
  `build_package_api`, `gen_attribute_probes`, `check_tb_registry`) go one at a time, never two
  at once, and each run's summary line goes in the Landed note.
- **A commit that changes a workflow or the composite action** says what CI must show, and
  waits for the owner's push to show it (see Oracles).

## Where the plan was wrong

Nothing yet. When a commit lands and its code turned out different from its entry, the entry
keeps its text, gains a Landed note, and the correction is listed here, as in the last
review's plan.

## Found while implementing

Defects the review did not have, found by building something this plan asks for.

- **Four high-severity advisories in the installed packages**, which `npm` reported while C05
  installed Biome. Fixed between C05 and C06 in `deps: update js-yaml, ws, linkify-it and
  immutable past their advisories`. All four are denial of service from crafted input, and
  every fix is a release inside a range already declared, by `package.json` for `js-yaml` and
  by the parent package for the other four, so only `package-lock.json` changed and
  Builder.md's Dependencies did not: `js-yaml` 4.1.1 to
  4.3.2, and `gray-matter`'s nested copy 3.14.2 to 3.15.2; `ws` 8.20.1 to 8.21.3, under
  Puppeteer; `linkify-it` 5.0.1 to 5.0.2, under `markdown-it`, where it cannot change the
  output because `render.mjs` sets `linkify: false`; and `immutable` 5.1.6 to 5.1.9, under
  `sass`.

  **`npm ls` reported the fix as already done.** `node_modules/.package-lock.json`, npm's
  record of what is installed, had been rewritten with the fixed versions after the Biome
  install, most likely by the `npm audit fix --dry-run` that listed them, while the packages
  on disk stayed old. npm trusts that file when it is newer than every package folder, so a
  real `npm audit fix` could have updated the lockfile and left the old packages in place.
  With the file moved aside, `npm ls` showed the old versions, and the fix replaced five
  packages. C09 and C40 change installed packages too: read the versions from each package's
  own `package.json`, not from `npm ls`.

  **`compare_trees.mjs` cannot see a dependency change**, because both of its worktrees
  resolve packages from this checkout's one `node_modules`. One `--keep` run before the update
  and one after gave two builds of the same commit, which the same three normalisers found
  identical. The book rendered 2,276 pages both times, with the same 2,460 outline entries and
  the same extracted text; the two PDFs differ from byte 22.6 MB on, inside the compressed
  object streams, and their document dates differ. `build.bat`, `check.bat` and `test.bat`
  are clean.

- **`serve.bat --dest` inside `docs/` rebuilds forever unless the name is an output tree's**,
  found by reading `serve.mjs` for C13 and not reproduced. The watcher skips output trees by
  name, never by the path it serves from, and an event that arrives during a build queues
  another build, so the build's own writes into a folder such as `docs/preview` start the
  next one. `serve.bat` passes its arguments through, so `serve.bat --dest docs/preview` is
  enough. Not fixed: C13 only corrected the comment that said otherwise. The fix is for the
  watcher to skip the serve's own destination as well.

  **Fixed in C13a, which found this diagnosis incomplete**: `discover` reads such a folder as
  source too, so every rebuild fails the publish allowlist, and the fix is for the build to
  refuse the destination. See C13a's Landed note.

- **Pipeline-Stages.md's `render.mjs` table lists three functions the module does not
  export**, found while C15 removed `kramdownSlug`'s row: `svgInlinePlugin`,
  `buildSvgWrapper` and `headingLevelNormalizePlugin`. The section is headed "Module export
  tables", "the full export list per file". Not fixed. The plugin chain's rows for
  `svgInlinePlugin` and `headingLevelNormalizePlugin` say "Detailed above" and mean these
  rows, so the fix moves that detail rather than deleting it.

- **`tbrun` exits 0 with partial output when a procedure the probe calls fails code
  generation**, found while verifying C16. The codegen line naming the callee comes straight
  after `[BUILD] Executing '<project>.<module>.<Sub>'...`, before the probe's first statement:
  probe C2, which omits `Debug.Cls`, shows it above its own `before`. So the probe's
  `Debug.Cls` erases it, the probe prints up to the call and stops, and nothing left in the
  console says so. Not fixed. One direction: take the probe's output as everything after the
  `[BUILD] Executing` line instead of relying on `Debug.Cls` to clear the log, so the line
  stays visible; that changes what `tbrun` asks of a probe, and is the owner's call.

## Open questions

Each is settled in the commit named, on the recommendation given there, unless the owner
decides otherwise:

- the exit value for a command-line error in `tbdocs` and `check_links.mjs`: C18 recommends 4;
- Biome or ESLint: C05's evaluation decides;
- whether `test.bat` without Python fails or skips `check_impexp_parity.mjs` loudly: C70,
  decision (b)'s open question;
- whether the pre-commit hook should also run the dash check, which A6-3 assumed: the owner
  approved a hook that runs Biome only (C08), so it stays out unless the owner asks for it.

The two questions this plan started with are settled: the two link checkers (decision 5), and
the survey script, which is committed.
