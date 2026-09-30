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

| Measure | At `fe9ce12b` | After, at `532dd269` (C83) |
|---|---|---|
| clone regions of 60+ tokens | 680, of which 318 do not involve `perf/` | 1,759, of which 1,510 do not involve `perf/` |
| top-level function names defined in two or more files | 77, of which 57 outside `perf/` | 101, of which 81 outside `perf/` |
| command-line tools outside `perf/` that read `process.argv` | 32, none using `node:util` `parseArgs` | 57, of which the survey counts 1 importing `parseArgs` |
| tools with a private copy of `flag`/`opt`/`die` | 6, with `opt` in three different versions | 6 |
| packages imported but not declared | 2: `picocolors` (installed for `@babel/code-frame`), `pako` (for `pdf-lib`) | 0 |
| clone regions by pair of areas: `builder`/`scripts`, `scripts`/`scripts`, `builder`/`builder` | 55, 95, 39 | 72, 619, 28 |

The after column is `--summary` and the area table of the full listing at `532dd269`: 253
files and 441,106 tokens, against 185 and 309,618. Re-run today's script against a worktree
at `fe9ce12b` (`--root`) and it prints the before column exactly, so the two are measured the
same way. Why each measure moved:

- **Clone regions rose because of what was added, not because code was copied.** Of the 1,510
  outside `perf/`, 437 (49,328 tokens) involve `eval/search-experiments/`, 29 lab scripts that
  the search work added on 2026-09-26, after the baseline and outside this review; 848
  (63,812 tokens) involve a gate's probe tables or a test file (`check_cli.mjs`'s case table
  alone is in clones worth 68,517 tokens, counted on each side), against 56 at the baseline;
  and 225 (17,725 tokens) are the rest. Among files present at both commits, the rest fell
  from 262 regions and 21,185 tokens to 177 and 14,136. The largest falls are the book's
  shims (`fast-sync-load.mjs` and `fast-dict-array.mjs` deleted, the onebuf pair sharing
  `onebuf-range.mjs`), `check_examples.mjs` (16 regions with itself, now none) and the a11y
  tools' shared discovery. Of the 48 regions in files added since, most are literal tables that
  token normalisation makes alike: C69's `checkTargets` tables (21 regions between the two
  onebuf shims), `pdf-lib-internals.mjs`' list of requires, `attribute-sites.mjs`' site
  skeletons. `builder/gantt.mjs` against `gen_attribute_probes.mjs` (23) is the same pair of
  array literals the baseline counted against `tbdocs.mjs`, moved by C77.
- **Repeated names rose for the same reason.** Of the 81 outside `perf/`, 39 are repeated only
  through `eval/search-experiments/`. The other 42 are down from 57: 22 of them are the
  baseline's; 33 of the baseline's are repeated nowhere now (`flag`, `opt`, `escapeHtml`,
  `escapeRegExp`, `logicalLines`, `walk`, the page and symbol baseline helpers, the onebuf
  internals and more) and 2 only through the lab scripts; and 20 are new, mostly homonyms:
  `show`, `same` and `say` are one-line local helpers, and `makeBatches` (17 lines against
  110) and `runProbes` (17 against 442) are unrelated functions that share a name.
- **`process.argv` readers are counted by file, and `parseArgs` by direct import.** Of the 57,
  46 parse through `lib/cli.mjs`, which is the one that imports `parseArgs` and reads no
  `process.argv` itself; the one the survey counts is `check_cli.mjs`, which compares
  `lib/cli.mjs` with a strict `parseArgs`. The other 11 are nine lab scripts in
  `eval/search-experiments/`, `impexp.mjs` (a published download with no dependencies, kept
  in step with `impexp.py` by its parity gate) and `scripts/lib/pdf-shims-side.mjs`, which
  reads a JSON job, not options.
- **The `flag`/`opt`/`die` count matches names, not parsers.** None of the six files parses
  arguments with them now: each defines `die` as an exit helper used after `lib/cli.mjs`'
  parse, and `sweep_attributes.mjs`' `opt` is the object its parse returns. Four of the `die`s
  are the same line (`addin_test`, `build_package_api`, `census_attributes`, `tbrun`); the
  ones in `sweep_attributes.mjs` and `check_examples.mjs` also tidy the registry. C83a
  moved the four into `lib/cli.mjs`, after which the survey counts 3: `lib/cli.mjs` and the
  two that tidy.
- **Undeclared packages** are 0 since C09 declared `picocolors` and `pako`.
- **By area**, `builder`/`builder` fell from 39 to 28. `builder`/`scripts` rose from 55 to 72
  through literal tables alone: `highlight-theme.mjs`' scope table against
  `check_code_regions.mjs`' probes (25, new) and the `gantt.mjs` pair above, while the
  baseline's code clones there (`sab-scheduler.mjs` and `check.mjs` against `check_links.mjs`,
  and others) are gone. `scripts`/`scripts` rose from 95 to 619, of which 476 involve
  `check_cli.mjs`.

Observed by hand at the same commit:

| Observation | At `fe9ce12b` |
|---|---|
| places that state which gates run | 5 that execute (three `.bat` files, two workflows), plus Tools.md |
| lint or format tooling | none |
| line endings | LF in the repository; CRLF in 118 of 140 working-tree files under `core.autocrlf=true`; no `.gitattributes` |
| quote style | double in `builder/`, `scripts/`, `test/`, `eval/`; single in `book/`, `wisdom/`, `perf/` |

## How the review is run

The review ran as fourteen passes against `fe9ce12b`: ten area passes (`A1`–`A10`), each over
one part of the tree, and four lens passes (`L1`–`L4`), each following one concern across the
whole tree. A verifier re-checked every R1 and R2 citation, and the orchestrator merged
findings more than one pass reported. The method (each pass's exact scope, what counted as a
finding, the acceptable-workaround test, and the output format) is recorded in
[REVIEW-TOOLING-fe9ce12b.md](REVIEW-TOOLING-fe9ce12b.md); the review is finished and that
record does not change.

The commit entries below still cite the review's notation:

- **Finding IDs**: `<pass>-<n>`, the pass's label (`A1` through `A10`, `L1` through `L4`) and
  the finding's number within it, for example `A7-1` or `L3-1`. A `/` joins IDs the review
  merged as one finding.
- **Severity, by cost**: **R1** has already produced a divergence or a defect, or will on the
  next ordinary change. **R2** makes every change in its area slower or riskier. **R3** is
  local untidiness.

## Oracles

The existing gates check the site, not how the tools behave inside, so each refactor is
compared before and after:

| Tool | Comparison |
|---|---|
| `tbdocs` | `scripts/compare_trees.mjs` (C02, decision 3): build before and after into scratch `--dest` folders with `--no-fetch-assets`; the three trees must match byte for byte. The first step is to show that two builds of one commit already match. Known differences are normalised, each for a stated reason, rather than excluded: the build's own timings in `assets/images/gantt.svg` and in the copy of that chart inlined into `Documentation/Development/BuildInfo.html` in the online and offline trees, and the commit and date on the PDF title page, which differ only when the two sides are different commits. |
| gates | The same output on the real tree; and a changed gate must still fail when its original defect is put back. |
| harness | The `examples.bat` summary unchanged (1,129 samples as of 2026-09-25) and `addin-test.bat` green, against the local BETA 983. Never two harness runs at once. |
| book | Page count, outline and extracted text unchanged; the PDF's bytes include timestamps. From C66, `check_pdf_shims_equiv.mjs`, which compares the shimmed pdf-lib with stock, is the oracle for the shims. |
| command lines | From C47, `check_cli.mjs`'s recorded cases: each migrated tool's exit code, stream and message for the invocations that stop during argument parsing. |
| CI | For a commit that changes a workflow or the composite action: a dispatch of `checks.yml` on `origin`, and the deploy workflow's own run on the next push of `staging`. A dispatch of the deploy workflow cuts a GitHub release, so it is not a test. Pushing is the owner's call, so these commits wait for it. |

## Execution

Each phase lands as commits on `staging`, the working branch, which is merged upstream when a
chunk of work is done. The commits below are numbered in the order they are meant to land. A
commit that needs a follow-up takes a letter (C07a) rather than renumbering the rest. From now
on, a commit's **Landed** note is written in full in the commit that lands it, where git
history keeps it; at the end of each phase, that phase's landed entries are cut to what later
work still needs. The landed entries of C01–C18 and C13a were cut this way on 2026-09-26;
their full text is in this file as it stood before the commit `builder: cut the tooling
plan's landed entries to what later work needs`. Those of the rest of Phase 1 (C19–C30, with
C22a–C22j, C25a–C25f, C27a and C27b) were cut the same day, and their full text is in this
file as it stood before `builder: cut Phase 1's landed entries in the tooling plan`. Those of
Phase 2 (C31–C70, with C32a, C41a–C41c, C51a, C51b, C65a–C65e, C67a and C67b) were cut on
2026-09-28, and their full text is in this file as it stood before `builder: cut Phase 2's
landed entries in the tooling plan`. Those of Phase 3 (C71–C75, with C72a, C72b and C74a) were
cut on 2026-09-30, and their full text is in this file as it stood before `builder: cut
Phase 3's landed entries in the tooling plan`. Those of Phase 4 (C76–C81, with C76a, C78a
and C81a) were cut on 2026-09-30, and their full text is in this file as it stood before
`builder: cut Phase 4's landed entries in the tooling plan`. Those of Phase 5 (C82–C83, with C82a
and C83a) were cut on 2026-09-30, and their full text is in this file as it stood before
`builder: cut Phase 5's landed entries in the tooling plan`. A pointer below to a cut entry's
Landed note means that
text. Line numbers are the review's, at `fe9ce12b`, and move as the commits land.

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
before CI can confirm them. CI has confirmed those through C62; C66 and C70 wait for the next
push.

### Where this plan departs from the review

Planning against the tree turned up places where a finding's stated fix does not fit the code,
or where the charter's own details were short. None changes a decision; each changes how one
is implemented.

1. **A command-line error in `tbdocs` cannot exit 2 (L1-4).** Fixed by C18, which gives a
   command-line error one value outside the bitmask in both `tbdocs` and `check_links.mjs`,
   whose own argument errors the review did not list. Superseded by C72b, which drops the
   bitmask in both tools, so a command-line error exits 2 as in every tool.
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
4. **The tree comparison normalises three regions, not two.** Folded into the Oracles table
   above, which now carries the detail.
5. **The pinning policy has to cover the linter (decision (g)).** C01 states the policy to
   include the case a review-worded pin would miss: exact also where a new version would
   change a gate's verdict on unchanged code, which is why Biome is pinned exact though it
   patches nothing.
6. **A dispatch of the deploy workflow is not a test.** It cuts a GitHub release; folded into
   the Oracles table's CI row.
7. **The command-line defects are fixed before `cli.mjs` exists (L1-2, L1-3, A7-5).** The
   review's fix for each is the shared module, but decision (e) makes Phase 2 change no
   behaviour, so C17 fixes them in place first. L3-3 likewise gets a loud failure in Phase 1
   (C26), ahead of the fence-aware split (C36).
8. **`check_tb_registry.mjs`'s missing crash handler changes an exit code** (a crash goes
   from 1 to 2; L1-11), so it is fixed with A5-2's two tools in Phase 1 (C28), not in the
   helper commit that must change nothing (C43).
9. **L1-10 closes as a side effect.** `node:util` `parseArgs` accepts `--name=value` for
   every option and cannot be told not to, so this is the one behaviour change Phase 2's
   migrations make, and it only adds a form. C49 adds a second, at the owner's choice
   (2026-09-27): in the harness tools whose `opt()` found a flag with `indexOf`, and in
   `check_publish_policy` (C50), a repeated flag now keeps its last value, as `parseArgs` does
   and as C72's strict parse would.
10. **Three of the review's facts were wrong**, found by proofreading this plan against the
    source (A8-2, fixed in C10; A2-1, fixed in C14; L4-10, whose corrected figure, 119 probes,
    is stated in C61).

## Phase 0: process and oracles

Before any finding is fixed.

### C01 — `docs: state the dependency pinning policy, and correct Builder.md's list`

**Carried forward.** The pinning policy (decision (g)): exact where the code patches the
dependency or relies on its internals, or where a new version would change a gate's verdict on
unchanged code (the reason `@biomejs/biome`, C05, is pinned exact though it patches nothing);
caret otherwise. `docs/Documentation/Builder.md`'s Dependencies section is the corrected,
authoritative list, and a commit that changes `package.json` updates it in the same commit (see
The bar for each commit).

### C02 — `scripts: compare_trees.mjs, the built trees before and after a change`

Landed.

### C03 — `scripts: check_ci_workflows.mjs, the workflows against the wrappers' gates`

Landed.

### C04 — `ci: one composite action for the gates both workflows run`

Landed.

### C05 — `lint: Biome, correctness rules only, and the fixes it finds`

**Carried forward.** The linter is Biome, pinned exact (2.5.14); ESLint was not needed, since
no finding required separate treatment for Node modules, the two browser scripts in
`docs/assets/js/`, or `page.evaluate` callback bodies. Scope: `builder/`, `scripts/`, `book/`,
`eval/`, `wisdom/`, `test/`, `docs/assets/js/`, and `lib/` since C12, excluding `perf/`, the vendored code, the
generated JSON (the two baselines, `package-api.json`, `inter-metrics.json`),
`package-lock.json`, and every Markdown, SCSS, YAML and `.bat` file. The formatter stays off
until Phase 6 (decision 4).

### C06 — `scripts: check_lint.mjs, a lint gate in test.bat and CI`

Landed.

### C07 — `scripts: convert_em_dash_separators exits 2 on a crash`

**Carried forward.** A crash handler is installed by a call inside a module's
entry-point guard (`process.argv[1]` against `import.meta.url`), never as a side effect of
import: the module is written to stay importable, and a process-wide handler installed on
import would change how the importing process ends on a crash. C43's shared helper keeps that
property.

### C08 — `githooks: a pre-commit hook that runs Biome on the staged files`

**Carried forward.** The pre-commit hook (`.githooks/pre-commit`) runs `node
scripts/check_lint.mjs --staged` and nothing else, on the owner's decision; enabled per clone
with `git config core.hooksPath .githooks`. `--staged` lints only the files `git diff --cached
--diff-filter=ACMR` reports, with `--no-errors-on-unmatched`, so staging nothing in the lint
scope is clean; the whole-scope run keeps its own floor of one script.

## Phase 1: remove, relocate, and fix in place

Done ahead of this phase, during the review: the four superseded pdf-lib shims deleted
(`90624841`), `perf/detach-pages.js` marked as code the book build loads (`26eefeeb`), and the
`staging.md` content slip fixed (`e0d127f0`, decision (f)).

### C09 — `deps: declare picocolors and pako, which the code imports directly`

Landed.

### C10 — `scripts: move census_attributes.mjs out of builder/`

Landed.

### C11 — `scripts: census_attributes finds the install through tb-install`

Landed.

### C12 — `lib: move markdown-files.mjs to a top-level lib/`

**Carried forward.** `markdown-files.mjs` (`markdownFiles`, `isOutputTree`) moved from
`scripts/lib/` to the new top-level `lib/`, which any part of the tree may import and which
imports none of them (see departure 2). `biome.jsonc` enforces the second half of that rule on
`lib/**/*.mjs` with a `noRestrictedImports` override refusing `builder/`, `scripts/`, `book/`,
`eval/`, `wisdom/` and `test/`.

### C13 — `builder, eval: decide what is an output tree with isOutputTree`

Landed.

### C13a — `builder: refuse a --dest that overlaps the source tree`

Landed.

### C14 — `builder: delete what the retired diff tools left behind`

Landed.

### C15 — `builder, wisdom: delete precomputeSeo and schemas.mjs; unexport kramdownSlug`

Landed.

### C16 — `scripts: tbrun recognises all five failed-build shapes`

**Carried forward.** `tb-ide.mjs` exports `BUILD_FAILED`, the pattern matching all five
failed-build log shapes; `tbrun.mjs` reports a build failure by matching against it. C25a's
saved-segment check looks for a `BUILD_FAILED` line the same way.

### C17 — `scripts: harness CLIs reject a missing value; tbbuild finds its project`

Landed.

### C18 — `builder, scripts: a command-line error exits outside the link bitmask`

Landed.

### C19 — `scripts: close the browser on every exit path, through lib/browser.mjs`

**Carried forward.** `scripts/lib/browser.mjs` holds `launchBrowser` and `withBrowser(fn,
options)`, which closes the browser in a `finally`; `LAUNCH_ARGS` is no longer exported.
`axe-scan.mjs` re-exports `launchBrowser` for the `perf/` rigs that import it.
`check_dot_fit.mjs` and `build_dot_metrics.mjs` launch through the same module (C44).

### C20 — `a11y: validate --theme and --viewport wherever a matrix is built`

Landed.

### C21 — `builder: the Gantt chart draws Check, vendorAssets and Other`

Landed.

### C22 — `scripts: crawl_check follows every link attribute the build checks`

Landed.

### C22a — `scripts: crawl_check sets its exit code instead of calling process.exit`

Landed.

### C22b — `builder: serve.bat redirects a folder URL to its trailing slash`

Landed.

### C22c — `docs: Builder.md's task sections match the chart and the task graph`

Landed.

### C22d — `scripts: crawl_check retries a request that fails before any response`

Landed.

### C22e — `docs: Pipeline-Stages.md's task sections match the chart and the task graph`

Landed.

### C22f — `docs: export tables for counts.mjs and page-baseline.mjs`

Landed.

### C22g — `builder: tbdocs.mjs's task-graph comment points to TASKS and the docs`

Landed.

### C22h — `builder: delete counts.mjs's unused COUNT_NAMES`

Landed.

### C22i — `scripts: crawl_check reports a page whose body cannot be read`

Landed.

### C22j — `scripts: crawl_check's --timeout covers a page's body`

Landed.

### C23 — `scripts: check_examples restores the registry after a spawn failure`

Landed.

### C24 — `scripts: tb-operate stops on an afterReveal timeout`

Landed.

### C25 — `scripts: tbbuild always tidies; correct tb-registry's -Command note`

Landed.

### C25a — `scripts: tbrun reports a codegen failure that Debug.Cls erased`

Landed.

### C25b — `scripts: tbbuild refuses a named IDE that is not there`

Landed.

### C25c — `scripts: tb-launch.ps1 reports why a launch failed, in plain text`

Landed.

### C25d — `scripts: launchIde under --show reports a spawn that fails`

Landed.

### C25e — `scripts: tbrun's --raw changes only what it prints`

Landed.

### C25f — `scripts: tbrun says when a probe ran and printed nothing`

Landed.

### C26 — `wisdom: parseStaging refuses a chunk it cannot place`

Landed.

### C27 — `wisdom: write manifest.json and denied.json atomically`

Landed.

### C27a — `wisdom: an incremental export fetches new messages in stored targets`

Landed.

### C27b — `wisdom: export --since keeps the history already stored`

Landed.

### C28 — `scripts: exit 2 on a crash in three tools that exit 1`

Landed.

### C29 — `test.bat: cite check_gate_lists for the gate's history`

Landed.

### C30 — `scripts: tidy check_links_diff's and check_publish_policy's failures`

Landed.

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

**Carried forward.** `lib/markdown.mjs` is the one answer to what is code. `blockRegions(src,
{ md })` returns every fence, indented code block and HTML block as `{ type, start, end,
markup, info, content }`: a half-open, 0-based line range whose lines keep their blockquote
and list prefixes, with lines ending at CRLF, LF or a lone CR. `maskCode(src, { md, indented
})` replaces a fence whole with one line that starts with a backtick, and masks code spans on
every other line, indented blocks only under `indented: true`. `splitOnMarker` never takes a
line inside a region as a marker, and `mapLines` splices lines and keeps each ending.
`splitCodeSpans` scans backticks only, and misses a span over two lines and a backslash before
a backtick. A caller that reads a page passes the site's markdown-it instance, whose plugins
change what counts as a block; a caller that reads a file that is not a page uses the bare
one. `lib/frontmatter.mjs`'s `parseFrontmatter(raw)` returns `{ data, content }`, or null when
the first line is not `---`.

### C32 — `render: the pre-render rewrites ask lib/markdown what is code`

Landed.

### C32a — `builder: an unknown count name is reported at its file line`

Landed.

### C33 — `render: admonitions find their fences through lib/markdown`

Landed.

### C34 — `scripts: convert_em_dash_separators reads code regions from lib/`

Landed.

### C35 — `scripts: check_examples' marker splice uses lib/markdown's line splice`

Landed.

### C36 — `wisdom: parseStaging splits only on real section boundaries`

Landed.

### C37 — `scripts: check_gate_lists' sections ignore fenced headings`

Landed.

### C38 — `scripts: one Attributes.md reader for census and the probe generator`

Landed.

### C39 — `builder, eval: counts, run_case and nav_hops skip code`

Landed.

### C40 — `builder, eval: frontmatter through lib/frontmatter; drop gray-matter`

Landed.

### C41 — `wisdom: read pages and threads through lib/`

Landed.

### C41a — `docs: quote the three statement titles that end in #`

Landed.

### C41b — `builder: warn about an unquoted frontmatter value that ends in #`

Landed.

### C41c — `wisdom: group reference pages by package, below Default/ and Built-In/`

**Carried forward.** `buildPackageSummary` and `buildPageIndex` in
`wisdom/extract/sitemap.mjs` take a page's parts through one `packageParts(path)`, which drops
`docs/Reference/` and then a `Default/` or `Built-In/`, so a page is grouped by its package
folder's name, and the Assert package is `TwinBasicAssertions` (see Open questions).

*The link checker, the gates' scaffolding, the browser tools and the repository root:
C42–C46.*

### C42 — `scripts: check_links.mjs becomes a thin wrapper over builder/check.mjs`

Landed.

### C43 — `scripts: lib/gate-probes.mjs for the gates' probes and crash handler`

Landed.

### C44 — `scripts: the dot tools share one launch, host page and source list`

Landed.

### C45 — `a11y: one page discovery and stub ceiling for the sampler and the sweep`

Landed.

### C46 — `lib: one repository root for every tool`

Landed.

*Command lines (decision (e)): C47–C52.*

### C47 — `lib: cli.mjs on node:util parseArgs, and check_cli.mjs`

**Carried forward.** `lib/cli.mjs` exports `parseCli(argv, { options, positionals, unknown,
acceptsValue, stopAt })`, `CliError`, `numberOption`, `withUsageError(fn, { stream, exitCode =
2, format })` and `printHelpAndExit(text, { stream = "stdout", exitCode = 0 })`. `parseCli`
returns `{ values, positionals, tokens, ignored, stopped }`: values keyed in camelCase, a
repeated flag keeping its last value, and `tokens` the kept options, positionals and `--` in
order. A tool's leniency is a parameter, and Phase 3 removes each use of it: `unknown` is
`"error"`, `"ignore"` (an unknown option, a boolean given a value and a positional beyond
`max` go into `ignored`) or `"positional"` (an unknown option becomes a positional, and
counts); `acceptsValue(value, inline)` defaults to the strict rule (a separate value may not
be missing or look like a flag; `-` and `""` are values), and a tool's own guard replaces it;
`stopAt` names options that end the parse on the spot, for `--help`. `numberOption` refuses
blank text, which `Number` reads as 0. `scripts/check_cli.mjs` is the gate: probes of the
module, and a `CASES` table of `{ tool, args, exit, stdout, stderr }` for invocations that
stop during argument parsing (a string is the whole stream, a RegExp must match, an unnamed
stream must be empty). Each case runs as a child process in an empty folder, with `TB_IDE` and
`PUPPETEER_EXECUTABLE_PATH` naming missing files and `TBBUILD_SHOW` removed, so a case that
gets past parsing fails instead of starting an IDE or a browser. A change to a tool's command
line records its cases from the unedited tool first, and adds them with a comment naming the
commit.

### C48 — `scripts: the a11y and diagram tools parse through lib/cli.mjs`

**Carried forward.** The a11y and diagram tools keep their leniency until Phase 3.
`check_a11y`, `check_a11y_fingerprint`, `check_axe_patch_equiv`, `check_tree_fresh`,
`pick_a11y_sample` and `sweep_a11y` take `acceptsValue: Boolean` (a missing or empty value is
an error; a following flag is taken as the value) and print every refused argument as
`unknown arg: X` with exit 2, through `withUsageError`. Five of them have `help` (short `h`)
in `stopAt`, and print their usage through `printHelpAndExit`: to stdout in
`check_a11y_fingerprint`, `check_axe_patch_equiv` and `check_tree_fresh`, to stderr with exit
0 in `pick_a11y_sample` and `sweep_a11y`. `check_a11y` has no `--help` and refuses it as an
unknown argument, and `check_a11y_fingerprint`'s `--list` is a `stopAt` too. `check_dot_fit`
and `build_dot_metrics` declare their one boolean with `unknown: "ignore"`, so they ignore
every other argument.

### C49 — `scripts: the harness tools parse through lib/cli.mjs`

Landed.

### C50 — `scripts: the gates and link tools parse through lib/cli.mjs`

Landed.

### C51 — `book, eval, wisdom: parse through lib/cli.mjs`

Landed.

### C51a — `scripts: check_cli's transcript -x case passes on Linux`

Landed.

### C51b — `scripts: the gate roster reads node --test lines; CI runs the search tests`

Landed.

### C52 — `builder: tbdocs parses through lib/cli.mjs`

Landed.

*`builder/`'s helpers, defined twice: C53–C60.*

### C53 — `builder: one URL module`

Landed.

### C54 — `builder: one module for the HTML, XML and RegExp escapers`

Landed.

### C55 — `builder: one code/pre guard and replaceOutsideCode`

Landed.

### C56 — `builder: guard code in the three whole-page HTML rewrites`

Landed.

### C57 — `builder: one drift guard for the page and symbol baselines`

Landed.

### C58 — `builder: fold six small duplicates`

Landed.

### C59 — `builder: cpu-worker's timed task paths share one runner`

Landed.

### C60 — `builder: name tbdocs's exit bits and set them in one place`

**Carried forward.** `tbdocs.mjs` exports the exit bits `EXIT_FAILED` (1), `EXIT_INTEGRITY`
(2) and `EXIT_COMMAND_LINE` (4), and sets them through a private `failBuild(bit)` that ORs a
bit into `process.exitCode`; `serve.mjs` imports the constants for its refusal and its two
failure exits. No non-zero exit literal is left in `builder/*.mjs`.

*The harness: C61–C65.*

### C61 — `scripts: one logicalLines for twinBASIC source`

**Carried forward.** `check_examples.mjs --census`, which needs no compiler, runs 122 probes:
the 119 of departure 10, and three `CLASSIFIER_PROBES` added by this entry (a `/* */` over two
lines, a BOM, and a fence of only comments and blank lines).

### C62 — `scripts: one twinBASIC keyword classifier, with probes in test.bat`

Landed.

### C63 — `scripts: click the build icon like every other control`

Landed.

### C64 — `scripts: three small harness duplicates`

Landed.

### C65 — `test: one scenario preamble and one linesSince for the add-in tests`

Landed.

### C65a — `test: a lane fails when closing it finds a problem`

Landed.

### C65b — `book: delete fast-inflate.mjs, which patched a function pdf-lib never calls`

Landed.

### C65c — `book: fast-parse-number reads a decimal as Number() does`

Landed.

### C65d — `book: fast-dict-onebuf builds new pages and page trees in its buffer`

Landed.

### C65e — `docs: Fixes.md stops counting the pdf-lib shims`

Landed.

*The book's pdf-lib shims (decision (c)): C66–C69.*

### C66 — `book: check_pdf_shims_equiv.mjs, the shims against stock pdf-lib`

**Carried forward.** `scripts/check_pdf_shims_equiv.mjs` is a step of the composite action,
and CI first runs it on Linux on the owner's next push. It must print `stock pdf-lib and 12
shims with parallelSave write the same 25 objects for a loaded document and the same 11 for a
created one; the 72 members the shims patch are as listed, and all ran but the 2 marked`.

### C67 — `book: one module for pdf-lib's internal requires`

Landed.

### C67a — `book: check_pdf_shims_equiv checks each member the shims patch`

**Carried forward.** `PATCHES` in `scripts/check_pdf_shims_equiv.mjs` lists every member of
pdf-lib that each shim patches (72 members of 12 shims after C67b), and a member the document
does not reach is marked with the reason (two are, the `context` setters). The shimmed side
finds the patched members by snapshotting the own properties of every pdf-lib module's
exports before and after the shims load, and prints `{ streamCount, reached, patched }`,
`patched` being one `{ shim, member, ran }` per member a shim puts a function into. The gate
reports a listed member not patched, a patched member not listed, an unmarked member that
never ran and a marked one that ran.

### C67b — `book: the shim gate reaches the members it marks`

Landed.

### C68 — `book: the two onebuf shims share their range machinery`

Landed.

### C69 — `book: each pdf-lib shim checks what it overwrites`

**Carried forward.** `book/lib/shim-targets.mjs` exports `checkTargets(shimUrl, roots,
targets)`, `ABSENT` and `fingerprint(fn)`. Each of the twelve shims calls `checkTargets` in
its install guard, before it patches anything (`parallel-deflate.mjs` at module level), with a
table keyed by path from the pdf-lib objects it imports (`'PDFDict.prototype.get'`, `'PDFRef'`
for a constructor); each value is `[arity, fingerprint]` or `ABSENT`, and a member that is
missing, of another arity or source, or an `ABSENT` one that is present, makes the import
throw an error naming the shim and every member that differs. The tables cover the members
the gate's `PATCHES` lists (a getter and setter pair as one `ABSENT` entry), and also the
constructors and `PDFDocument.prototype.save` that a shim relies on without patching. Nothing
compares a shim's table with `PATCHES` (the open item under Found while implementing).

*impexp (decision (b)): C70.*

### C70 — `scripts: check_impexp_parity.mjs, the two impexp editions compared`

**Carried forward.** On the owner's next push CI runs the step `Verify the two impexp
editions agree (check_impexp_parity.mjs)` for the first time on Linux, with the runner's own
`python3`. Its summary line prints the Python version, and a missing interpreter fails it
there (`CI` set to `true` exits 2) instead of skipping.

## Phase 3: conventions users see

Decision (e): converge on `impexp.mjs`'s discipline. `--help` prints usage to stdout and exits
0; an unknown flag or a bad value prints to stderr and exits 2, or C18's value in the two link
tools; each tool has one table of exit codes. Each commit changes `check_cli.mjs`'s
expectations, the usage texts and Tools.md together.

### C71 — `scripts, book, eval, wisdom: --help prints usage to stdout and exits 0`

**Carried forward.** Every Node tool answers `--help` and `-h` by printing its `USAGE` to
stdout and exiting 0. Each declares `help` with `short: "h"` and `stopAt: ["help"]`, answers it
straight after the parse, before any number, project or install check, and has a `USAGE`
constant (the usage line, one sentence, the options, and the `Exit codes:` block). A new tool
is added to `HELP_TOOLS` in `scripts/check_cli.mjs`, which checks that its help exits 0 and
leaves its scratch folder empty.

### C72 — `scripts, book, eval, wisdom: an unknown flag or a bad value exits 2`

**Carried forward.** Every tool parses through `lib/cli.mjs`'s `parseCli` (`tbdocs` through
`builder/command-line.mjs`, which wraps it), and the parse is strict: an unknown option, a
boolean given a value, a value option with none, an empty value unless the option's spec says
`empty: true` (only `tbdocs`' `--baseurl`), and a positional beyond the tool's count are each a
`CliError`, reported on stderr with exit 2 through `withUsageError`. A term that starts with a
dash goes after `--`. A new tool needs an unknown-flag case in `REFUSALS`, and an empty-value
case if it has a value option, in `scripts/check_cli.mjs`, which checks `REFUSALS` against
`HELP_TOOLS`.

### C72a — `scripts, book, eval, wisdom: a bad value exits 2`

**Carried forward.** A tool checks each value it reads after the parse straight after the
parse, before it starts an IDE or browser, records a registry, makes a request or removes a
file, and refuses a bad one on stderr with exit 2, in its usage-error form. It does so through
`lib/cli.mjs`'s `numberOption` (read as `Number()` reads, so `0x10` passes and `12abc` does
not), `choiceOption`, `regexOption`, `urlOption`, `dateOption` and `refuseTogether`, and a
new option that takes a number, regex, URL, date or fixed set needs a case in `BAD_VALUES` in
`scripts/check_cli.mjs`.

### C72b — `builder, scripts: tbdocs and check_links exit 0, 1 or 2 like every tool`

**Carried forward.** `tbdocs.mjs` and `scripts/check_links.mjs` each define `EXIT_FOUND` (1,
the build or check found a problem of any kind) and `EXIT_ERROR` (2, a refused command line,
a crash, or `tbdocs`' stall watchdog), and neither exits 3 or 4; `--no-fail` still forces 0 on
findings alone.

### C73 — `scripts: one meaning each for --json and --src`

**Carried forward.** `--json` is a boolean that prints to stdout, and `--out FILE` names an
output file (`check_a11y_fingerprint`, `census_attributes`, `build_package_api`, `sweep_a11y`,
`run_case`). `--src` is a documentation root (`tbdocs`, `check_publish_policy`), `--exported`
the exported package tree (`census_attributes`, `build_package_api`) and `--repo` a repository
root that holds `docs/` (`eval/build_corpus.mjs`, `eval/nav_hops.mjs`). An old spelling is
refused as an unknown option, so Tools.md and `eval/README.md` must use these names.

### C74 — `scripts: one exit-code table per tool, and no code with two meanings`

**Carried forward.** Every tool exits 0 clean, 1 a finding, 2 the tool could not do its job
(a refused command line, a missing input, a crash), and its own codes above 2: `addin_test`
3 (the registry or a work folder was not put back, after a crash too), `wisdom` 3 (the
request cap), `tbbuild` 3 (the compile never settled) and 4 (the compiler crashed), `tbrun` 3
(no output) and 4 (the compiler crashed), and `impexp` 3 to 6 (the table it shares with
`impexp.py`, which has no `Exit codes:` probe). Each tool's usage text ends with one `Exit codes:` block,
which `check_cli` checks, and each Tools.md section (`eval/README.md` and Wisdom.md for the
tools without one) ends with the same codes on one `Exit codes:` line. `exitOnCrash` is in
`lib/cli.mjs`; a tool that other modules import installs it at its entry point only.

### C74a — `scripts: addin_test puts the registry back after a crash`

Landed.

### C75 — `serve.bat: return tbdocs's exit code`

Landed.

## Phase 4: splits

Decision 2: a split is taken only where the evidence says good practice calls for it, and
size alone does not qualify. The test for each candidate is whether the split removes a hidden
dependency, lets a part be tested on its own, or separates parts that Phases 1 to 3 had to
change for unrelated reasons. Each is decided at the start of the phase against what the
earlier phases found, and each is a pure move, checked by the tree comparison or the owning
tool's oracle. `axe-scan.mjs` is not a candidate: the review found its single-source property
worth keeping.

### C76 — `render: split along its plugin seams`

Landed.

### C76a — `render: the ellipsis plugin counts each dot run where it is`

**Carried forward.** `kramdownEllipsisPlugin` counts each dot run in the text token that
holds it, tracking no source, and `test/render.test.mjs` (`node --test`) pins it on inputs no
page holds. No page exercises the plugin's miscounting cases, so the tree comparison cannot
see a regression there. Its CI step is among those listed under C80.

### C77 — `builder: tbdocs's Gantt and timing code moves beside gantt.mjs`

**Carried forward.** `builder/gantt.mjs` exports `GANTT_SECTION` and `groupGanttTimings`,
pure code over the scheduler's timings, so the chart can be grouped and drawn without a build; `injectGanttChart` and `recheckInjected` stay in
`tbdocs.mjs`. Builder.md and Extending.md name `gantt.mjs` for `GANTT_SECTION`.

### C78 — `builder: template.mjs's date formatter moves to its own module`

**Carried forward.** `builder/strftime.mjs` exports `formatDate`, and Builder.md's module
map has a row for it. `renderFooterLegal` calls it only for a page whose frontmatter sets
`last_modified_date`, which no page does, so no build exercises it and the tree comparison
cannot see a change to it. `test/strftime.test.mjs` (C78a) is what does.

### C78a — `builder: strftime's %j is the calendar day, in three digits`

**Carried forward.** `formatDate`'s `%j` is the calendar day, in three digits, and the gate
`test/strftime.test.mjs` (`node --test`) calls `formatDate` directly. Its CI step is among
those listed under C80.

### C79 — `builder: book.mjs as a resolver, an assembler and a coverage check`

Landed.

### C80 — `scripts: check_examples' bisection and probe suite in their own modules`

**Carried forward.** `scripts/lib/example-batches.mjs` holds the batching (`makeBatches`,
which takes `{ batchSize, jobs }` and defaults to `DEFAULT_BATCH` and `DEFAULT_JOBS`), the
canaries, crash isolation (`crashedIn` to `runBatch`), `sectionOf`, `diagKind`,
`unresolvedName` and `runProbes(say)`; the lane that stages and builds (`stageBatch`,
`buildStaged`, `laneOf`, `runAll`) stays in `check_examples.mjs`. The gate
`test/example-batches.test.mjs` runs the probes with no IDE. **The owner's next push is the
first CI run of the three `node --test` steps this phase added**, `Unit-test the markdown
plugins (test/render.test.mjs)`, `Unit-test the date formatter (test/strftime.test.mjs)` and
`Unit-test check_examples' batches (test/example-batches.test.mjs)`, and of the wrappers' 22
gates as `check_ci_workflows` counts them.

### C81 — `scripts: tb-ide's console reading and add-in introspection move out`

**Carried forward.** `scripts/lib/tb-ide-console.mjs` holds the console reading
(`readConsole`, `consoleMark`, `linesSince`, `keepClears`, `keptClears`) and
`scripts/lib/tb-ide-addins.mjs` holds `loadedAddins`, `addinsRoot` and `checkAddinsRoot`;
`tb-ide.mjs` re-exports neither, and its importers take the names from the new modules.
Tools.md's `tbbuild` section counts six library files, `tb-ide-console.mjs` among them; no
page under `docs/` names `tb-ide-addins.mjs`, and WIP.Harness.md and WIP.HelpAddin.md cite
both modules.

### C81a — `scripts: launchIde's port refusal names what holds the port`

**Carried forward.** When `launchIde` (`scripts/lib/tb-ide.mjs`) finds its DevTools port
still taken after 10 s, its refusal names what holds the port, through `portListeners`
(netstat, then tasklist), or reports the bind's error code and points at `netsh int ipv4 show
excludedportrange protocol=tcp` when nothing listens. No gate covers it, since it runs
Windows' netstat and CI has no IDE.

## Phase 5: documentation and measurement

Written last, against the code as it then is, with every claim re-read against the file it
describes: the last review found its own figures stale by the time its documentation commit
ran.

### C82 — `docs: the module map, Tools.md, WIP.Build.md and Extending.md, as they now are`

Landed.

### C82a — `tooling: comments state their rules without the incidents behind them`

Landed.

### C83 — `builder: the tooling survey re-run against its baseline`

Landed.

### C83a — `lib, scripts: one die in lib/cli.mjs for four tools`

Landed.

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

**Landed.** `.gitattributes` gains `*.mjs`, `*.js` and `*.jsonc text eol=lf`, beside its two
existing LF rules (the hooks, and the Workflow script, which the new `*.mjs` rule also covers
but whose own reason stands). Re-measured first: every one of the 240 tracked `.mjs`, `.js`
and `.jsonc` blobs is LF (`git ls-files --eol`), and 177 were CRLF on disk, 142 of them among
the 185 files Biome's scope holds (the plan's 118 of 140 was `fe9ce12b`'s count). Biome's own
setting cannot settle it alone, measured with the formatter switched on through a scratch
config and each file's formatted output compared with its source for CRLF: `lineEnding: "lf"`
flagged those 142 here and none on an `autocrlf=false` worktree, and `"auto"`, which follows
the platform rather than the checkout, flagged the 43 LF files here and all 185 there. After
the change, a checkout under `autocrlf=true`, one under `false` and this working tree (its
177 files removed and checked out again: `checkout-index --force` skips an entry whose stat
matches) hold all 240 files byte for byte alike, so `"lf"` flags none of them for endings in
any of the three. No blob changed; `git add` of the 177 staged nothing. `compare_trees`
differs, online and offline alike, in the five shipped scripts whose HEAD checkout is CRLF,
each by its line endings alone: `svg-inline.js`, `theme-toggle.js`, the vendored
`just-the-docs.js` and `lunr.min.js`, and the `impexp.mjs` download. A local build now ships
them LF, as CI's Linux checkout always has.

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
| L3-1: `check_a11y` leaves Chromium running (in fact its profile folder; see C19) | R1 | C19 |
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

When a commit lands and its code turned out different from its entry, the entry keeps its
text, gains a Landed note, and the correction is listed here, as in the last review's plan.

- **C19 (L3-1): a failed accessibility run leaves no Chromium running.** The review and C19's
  entry said Chromium stays up for the rest of the CI job. Puppeteer kills its browser from
  its own `exit` handler, on Windows and Linux alike. What a failed run leaves is the
  browser's temporary profile folder, 4.3 MB. The change stands as planned and fixes that
  instead; see C19's Landed note.
- **C21 (A1-1): no `Other` band.** The entry adds `Check` and `Other` to the chart. At the
  owner's request a task with no section fails the build instead, so nothing can reach
  `Other`, and it was removed; see C21's Landed note. It landed as `builder: the Gantt chart
  draws every task, or the build fails naming it`.
- **C24 (A7-2): no retry.** The entry has each call site retry once before it throws.
  Retrying the wait only makes it longer, which is what `afterReveal`'s `timeout` is for, and
  opening the file again would start a new reveal, so each call throws at the first timeout,
  the review's other option ("retry or fail loudly"); see C24's Landed note.
- **C42 (A4-2): the script does not call `formatReport`.** The entry names it among the
  functions the script calls, and also asks for the same report before and after; the two
  cannot both hold, since `formatReport` prints the build's format. The owner chose the
  unchanged report: the script prints its own summary lines around the two `link-check.mjs`
  reporters it already shared, and `formatReport` stays the build's; see C42's Landed note.
- **C43 (A6-1): no exit-code parameter.** The entry makes the exit code for a failed probe a
  parameter, 2 for `check_gate_lists.mjs` and `check_regex_safety.mjs`, which adopt only if
  the fit is exact. It is not: the first keeps its probes as pairs, prints failures to stderr
  and has verbose and self-test-only modes, and the second runs its probes inside the sharded
  recheck. With no caller passing anything but 1, `report()` returns 1; see C43's Landed note.
- **C44 (A5-5): no file-access option.** The entry has `browser.mjs` add
  `--allow-file-access-from-files` and state its reason. There is none for these tools: their
  host page loads both Inter faces without it, and both give the same output, the regenerated
  table included. At the owner's choice the flag was dropped; CI's `check_dot_fit` step on
  Linux confirms it on the next push. See C44's Landed note.
- **C58 (A2-7): the two whitespace collapses are not duplicates.** They collapse the same
  ASCII class, but `compress.mjs` trims a both-sides segment with `String.prototype.trim`,
  which also strips U+00A0, and its comment says why it keeps that; `search.mjs` strips ASCII
  only. Folding either way changes one of them, so both stay, and C58 landed as `builder: fold
  five small duplicates`. See C58's Landed note.

- **C66 (A9-2): both sides run in child processes, and the comparison reads bytes.** The
  entry runs stock pdf-lib in a child and the shims in the gate's own process. Under the onebuf
  shims a process may hold one `PDFContext`, and the diagnosis needs a fresh shimmed process
  per combination, so both sides are children and the gate never imports pdf-lib. The two
  files are compared as written, with streams inflated, rather than as pdf-lib parses them:
  its parser finds objects without the cross-reference offsets and reads `0.50` as `0.5`, so a wrong
  `sizeInBytes` or a `0.50` would pass a comparison of parsed objects. See C66's Landed note.
- **C67b: `PDFDocument.create` reaches three of the four factories.** The entry has the
  created document reach all four page-tree and catalog factories. pdf-lib calls
  `PDFCatalog.fromMapWithContext` only from the stock `parseDict`
  (`core/parser/PDFObjectParser.js:159`), which `fast-dict-onebuf` replaces, and the shim's
  `PDFCatalog.withContextAndPages` builds its catalog without it (`fast-dict-onebuf.mjs:455-461`),
  so the created side calls it directly, on a copy of the created catalog's map. See C67b's
  Landed note.
- **C71: `tbdocs` answers `--help` too.** The entry's subject leaves out `builder/`, whose
  `tbdocs` refused `--help` and `-h` with exit 4. At the owner's choice (2026-09-28) every Node
  tool answers them, `tbdocs` and the argument-less gates included, so it landed as `builder,
  scripts, book, eval, wisdom: --help prints usage to stdout and exits 0`. See C71's Landed
  note.
- **C72: the values a tool reads after the parse are C72a's.** The entry's "a bad value"
  covered two kinds of fault: what the parse can see (a missing, empty or flag-like value, an
  unknown flag, an extra argument) and what only the tool can judge (a number, a regex, a URL,
  a value from a fixed set). At the owner's choice (2026-09-29) C72 did the first and C72a
  takes the second. `tbdocs`' `builder/command-line.mjs` changed too, and the empty-value
  case exists only for a tool with a value option (26 of 45), so it landed as `builder,
  scripts, book, eval, wisdom: a refused command line exits 2`. See C72's Landed note.
- **C73: `--src` had a third meaning, and `perf/` came in.** The entry renames only the
  review's three options. `eval/build_corpus.mjs` and `eval/nav_hops.mjs` also take a `--src`,
  meaning a repository root, and at the owner's choice (2026-09-30) they take `--repo` now. The
  three `perf/` rigs' `--json FILE` changed too, so C73 landed as `scripts, eval, perf: one
  meaning each for --json and --src`. See C73's Landed note.
- **C74: the codes changed as well as their tables.** The entry splits one code with two
  meanings. At the owner's choice (2026-09-30) it split three (`addin_test`, `wisdom`,
  `tbrun`), moved every could-not-run case that exited 1 to 2, and gave every tool a crash
  handler. That touched `builder/`, `book/`, `eval/` and `wisdom/`, so it landed as `builder,
  scripts, book, eval, wisdom: one exit-code table per tool`. See C74's Landed note.
- **C76: no split, because the orderings it rested on do not hold.** Measured on
  2026-09-30 by building `createMarkdownIt` with each pair swapped and rendering all 912 pages
  under `docs/`, plus fuzzed and hand-built inputs. (A) `svgInlinePlugin` and
  `remoteImagePlugin` both wrap the `image` renderer, but they act on different sources and
  `meta.svgInline` is set at core time from the unrewritten `src`. Swapping them changed no
  page and none of 60,000 fuzzed documents. (B) The ellipsis rule runs *before* the dashes
  rule, because a second `after("replacements")` is inserted ahead of the first. Swapping them
  changed no page. It changed only lines that hold `<<` or `>>` together with a run of four or
  more dots, and that difference comes from a defect in the ellipsis plugin's dot counting,
  not from a dependency between the two plugins; C76a fixes it. (C) Only `standalone-ial-attach`
  anchors on `"curly_attributes"`, and `tocPlugin` anchors on the plugin's own `header-id`
  rule. Registering either before its anchor throws `Parser rule not found` when
  `createMarkdownIt` runs, so a wrong order already fails loudly. No hidden dependency is left
  for decision 2's test, and size alone does not qualify, so at the owner's choice
  (2026-09-30) nothing moved. C76 corrected `matchTocMarker`'s comment, which said the toc rule
  ran before `standalone-ial-attach`, and landed as `render: correct the toc marker's comment;
  C76's split not taken`.
- **C77: the grouping moved, the rest stayed.** The entry moves the Gantt and timing code and
  weighs four further candidates. Only `GANTT_SECTION` and `groupGanttTimings` had evidence
  beyond size, being the section list `gantt.mjs`'s bands must agree with, so at the
  supervisor's reading of decision 2 only they moved. The chart's injection and recheck write
  the trees and run the check, and stayed. It landed as `builder: the Gantt sections and their
  grouping move into gantt.mjs`. See C77's Landed note.
- **C79: no split, because nothing but size argues for one.** The entry splits `book.mjs`
  into a resolver, an assembler and a coverage check. Measured against decision 2's three
  tests, none holds. The sections depend on each other through named calls in the one file
  (coverage calls the resolver's `collectMatches`, the href rewrite calls §B's anchor
  helpers). `check_book_coverage.mjs` already tests the resolver and the coverage check
  without a build. And the review's eight commits to the file each crossed sections for one
  shared reason (the escapers, the URL module, the code guard, lint). `pdf.mjs` importing
  `assembleBook` and the coverage pair from one module is an ordinary import. At the owner's
  choice (2026-09-30) only three misplaced helpers moved, inside the file. It landed as
  `builder: book.mjs's image-path helpers move beside their one caller`. See C79's Landed
  note.
- **C80: one module, not two, and a gate.** The entry moves the bisection and the probes
  into modules of their own. Measured, they change together (six of the last 25 commits to
  the file touched both, as a feature and its probe), so separating them from each other
  splits code that changes together. What argued for a move was elsewhere: the file does
  all its work when it loads, so nothing could import the probes, and `makeBatches` read the
  run's flags (see Found). At the owner's choice (2026-09-30) both moved into one module, and
  the probes became a `test.bat` gate. See C80's Landed note.
- **C81: moved as the entry says, though decision 2's tests did not hold.** Measured, the
  module has no mutable state. The console reading reads nothing else in it, and the add-in
  introspection reads only `normPath`, so no dependency was hidden. The file does no work when
  it loads, so a test could already import it. Of the file's 19 commits, the console reading
  changed alone in two and the introspection in one. Five of the seven that touched either
  also touched the rest of the file for the same feature. The recommendation was no split.
  At the owner's choice (2026-09-30) both parts moved. See C81's Landed note.

## Found while implementing

Defects the review did not have, found by building something this plan asks for.

- **Four high-severity advisories in the installed packages**, which `npm` reported while C05
  installed Biome. Fixed between C05 and C06 in `deps: update js-yaml, ws, linkify-it and
  immutable past their advisories` (only `package-lock.json` changed). Two lessons bind later
  work, and C40 needs both: `npm ls` can report a version that is not actually installed,
  because `node_modules/.package-lock.json` can be rewritten (by e.g. `npm audit fix
  --dry-run`) while the packages on disk stay old, and npm trusts that file when it is newer
  than every package folder, so read each package's own `package.json` instead; and
  `compare_trees.mjs` cannot see a dependency change at all, because both its worktrees
  resolve packages from this checkout's one `node_modules`. So run it with `--keep` before
  the change, copy `.compare-trees/before/.compare-out` aside, run it again after, and compare
  the two `before` builds with the same three normalisers; they must agree.

- **`serve.bat --dest` inside `docs/` could rebuild forever** for a destination name the
  watcher does not recognise as an output tree, and `discover` reads a stale destination as
  source content too, failing the publish allowlist on every rebuild. Fixed in C13a, which
  added `assertDestinationClearOfSource`.

- **Pipeline-Stages.md's `render.mjs` table listed exports the module does not have**, and
  five more errors in the same material. Fixed in `docs, builder: correct render.mjs's export
  table and plugin chain` (`57cdaa1d`).

- **`tbrun` exits 0 with partial output when a procedure the probe calls fails code
  generation**, found while verifying C16. Scheduled as C25a, and fixed in `scripts: tbrun
  reports a codegen failure that Debug.Cls erased`.

- **Builder.md's "Task DAG by section" disagrees with the chart and with the task graph**,
  found while re-reading its Gantt paragraph for C21. The section lists put `discover` in
  Seeds, where `GANTT_SECTION` charts it in Spine, and `warmInit` and `renderEnvInit` in Seeds
  and Render, where the chart draws them as start-up bars in each worker's lane. The Seeds
  discussion says a seed has no predecessors, then lists `scss`, `prepDest` and
  `prepPageDirs`, which all have them. The Spine sketch draws `loadData` off `discover` and
  before `highlighterInit`, where `loadData` waits for `highlighterInit`, which waits for
  `config`. And the Gantt paragraph says boot timings form a row group of their own, where
  they are drawn at the start of each worker's row. Fixed in `docs: Builder.md's task
  sections match the chart and the task graph`.

- **`crawl_check.mjs` can exit 127 on Windows where it should exit 1**, found while
  verifying C22. It calls `process.exit()` straight after printing its report, and libuv
  (Node 24.13.0) aborts on an assertion, `!(handle->flags & UV_HANDLE_CLOSING)` in
  `src\win\async.c:76`. The report is complete; the exit code is not. It happened on three of
  three runs against the C22 fixture and on none of four against the site; a clean run
  reaches the same `process.exit(0)`, so nothing shows it is safe. Fixed in `scripts:
  crawl_check sets its exit code instead of calling process.exit`.

- **`serve.bat` serves a folder page at its URL without the trailing slash** rather than
  redirecting, as GitHub Pages does, so the page's relative links resolve one level too high.
  The built site links 74 folder pages that way, e.g. `../../tB/Modules/Collection` from
  Permanent-Links. On the live site those links cost a 301; in a `serve.bat` preview reached
  through one of them, the page's relative links are broken. `serve.mjs`'s resolver (about
  `:84-100`) has the same three candidates the C22 scratch server started with, whose crawl
  found 626 broken links for this reason. Fixed in `builder: serve.bat redirects a folder URL
  to its trailing slash`.

- **A crawl of `serve.bat` loses about 20 requests to connection resets**, found while
  verifying C22b. Crawls of a test serve report about 20 broken links that are not HTTP
  errors: a crawl of HEAD's serve had 20 `fetch failed` beside its 603 HTTP errors, and
  after C22b's fix, three crawls reported 20, 21 and 20 broken, the last tallied by cause as
  20 `fetch failed`, each caused by `read ECONNRESET`. The serve keeps Node's default 5 s
  keep-alive timeout. With it raised to 300 s as a scratch experiment, two crawls of two had
  no failure, and the kit's static server, which keeps connections 300 s, had none in C22a's
  three crawls of `_site`. So the resets come from the server closing idle connections that
  `fetch` then reuses, and `crawl_check` does not retry such a request. Whether the live site
  does the same is unmeasured. Fixed in `scripts: crawl_check retries a request that fails
  before any response`.

- **Pipeline-Stages.md files eight tasks under a section other than the chart's**, found
  while fixing Builder.md's copy of the same lists in C22c. Extending.md says each task's
  `###` heading there sits "under the numbered section matching its Gantt section". Section 1
  (Seed tasks) holds `scss`, `dot`, `prepDest` and `prepPageDirs`, Section 2 (Spine)
  `loadData` and `dispatch`, and Section 3 (Render fan-out) `flush:i` and `flushJoin`, where
  `GANTT_SECTION` charts them in Write, Spine, Render, Render, Seeds, Render, Write and Write.
  Section 1 also holds `warmInit` and Section 3 `renderEnvInit`, which the chart gives no
  section. And Section 1's introduction says its tasks have no predecessors, which `scss`,
  `highlighterInit`, `prepDest` and `prepPageDirs` all have. Fixed in `docs: Pipeline-Stages.md's
  task sections match the chart and the task graph`.

- **Pipeline-Stages.md's module export tables omit two modules**, found while fixing its task
  sections in C22e. The page says its second half covers every module, with the full export
  table for each, and has no table for `counts.mjs` or `page-baseline.mjs`, both in
  `builder/`. Its `markdownInit` section and `render.mjs`'s plugin table name `counts.mjs`'s
  functions. Fixed in `docs: export tables for counts.mjs and page-baseline.mjs`.

- **`tbdocs.mjs`'s task-graph comment (`:216-227`) contradicts `TASKS`**, found while checking
  C22e's edges. It lists `scss` among the seeds, where `scss` waits for `scssLight`,
  `scssDark` and `prepDest`; it gives `config → loadData`, where `loadData` waits for
  `highlighterInit`; and it gives `flushJoin + prepPageDirs → writeAssets + searchData`, where
  neither waits for `flushJoin`, and `searchData` waits for `renderJoin` and `prepDest`. It is
  a fifth description of the graph, beside the four that Extending.md lists. Fixed in
  `builder: tbdocs.mjs's task-graph comment points to TASKS and the docs`.

- **`counts.mjs` exports `COUNT_NAMES`, which nothing reads**, found while checking C22f's
  table. `git grep` finds no importer: `validateCountNames` checks a page against the keys of
  the counts it is given (`counts.mjs:288`), and nothing else lists the names. Extending.md
  (`:698`) names it as though it registered them. Fixed in `builder: delete counts.mjs's
  unused COUNT_NAMES`.

- **`crawl_check.mjs` says nothing about a page whose body cannot be read**, found while
  implementing C22d. `crawlOne` records a same-site page as reachable (`:137`) before it
  reads the body, and a failed read returns at once (`:149`): the page's links are never
  extracted and its ids never indexed, so the fragment check skips every anchor into it, and
  the report says nothing. The kit's `c22i-body.mjs` serves a page that answers 200 with a
  `Content-Length` of 5000, sends a link to a missing page and closes the socket: the crawl
  exits 0 with nothing broken, and the missing page is never requested. Fixed in `scripts:
  crawl_check reports a page whose body cannot be read`.

- **`crawl_check.mjs`'s `--timeout` stops at a page's headers**, found while implementing
  C22i. `fetchWithRetry` cleared its timer in its `finally` (`:82`) once `fetch` resolved,
  which is when the headers arrive, so nothing of the crawl's own bounded the read of a body.
  The kit's `c22i-stall.mjs` serves a page that answers 200 with a `Content-Length` of 5000,
  sends part of it and then nothing, and keeps the socket open: with `--timeout 1000` the
  crawl waited 305.6 s, about undici's default body timeout of 300 s, before it reported the
  page as C22i's `body: terminated`. The crawl starts its next batch of pages only when every
  page of the current one is done, so the whole crawl waited. Fixed in `scripts:
  crawl_check's --timeout covers a page's body`.

- **`tbbuild` launches a named IDE that is not there**, found while implementing C25.
  `findIde` returns a path from `--ide` or `TB_IDE` unchecked, and `tbbuild` alone of its six
  callers went on to launch it: the hidden launch failed inside `tb-launch.ps1`, with a
  message in PowerShell's CLIXML, and `--show` crashed. Fixed in `scripts: tbbuild refuses a
  named IDE that is not there`.

- **A failed hidden launch reports its cause in CLIXML, and the wrong cause**, found while
  implementing C25. `launchIde` relays `tb-launch.ps1`'s stderr, which PowerShell writes in
  CLIXML when its streams are redirected, as `tb-registry.mjs` had already found; and `Fail`
  read the Win32 error after PowerShell's own calls had replaced it, so a missing executable
  was reported as error 203, "The system could not find the environment option that was
  entered". Fixed in `scripts: tb-launch.ps1 reports why a launch failed, in plain text`.

- **`launchIde` under `--show` crashes when the IDE cannot be started**, found while
  implementing C25. The branch spawned the IDE with no `'error'` listener, so a spawn that
  failed ended the run on Node's report of an unhandled `'error'`, with exit 1, the code
  `tbbuild` and `tbrun` give compile errors. Measured with a missing executable and with the
  install folder. Fixed in `scripts: launchIde under --show reports a spawn that fails`.

- **`tbrun --raw` never sees a failed build**, found while verifying C25a. `--raw` keeps each
  console line's timestamp column, and `tbrun` read the console once, with it, for its checks
  as well as its output. `BUILD_FAILED` is anchored at a line's start, so under `--raw` no
  failure matched: probe A exited 0 after 19.5 s and printed the timestamped build log as the
  probe's output. A line holding only a timestamp is not blank either, so a probe that printed
  nothing exited 0 after 18.9 s with one such line, where without `--raw` it exits 3. Fixed in
  `scripts: tbrun's --raw changes only what it prints`.

- **`tbrun` says a probe that ran and printed nothing "may not have run"**, found while
  verifying C25e. The build log is written and erased within the first 400 ms poll, so such a
  probe waits the whole 120 s timeout and exits 3 with the hint to look for a modal, though
  the record of clears C25a keeps shows that the Sub started. Fixed in `scripts: tbrun says
  when a probe ran and printed nothing`.

- **An incremental `wisdom.mjs export` never fetched a new message in a target it had
  stored**, found while verifying C27. `runExport` skipped every channel and thread with a
  manifest entry and a file, and the `?after=` branch ran only when the file was missing,
  writing the new messages as the whole file. Wisdom.md said a re-run fetches the new
  messages. C27's oracle measured it: a message added between two exports never reached the
  file. The stored export was four months old, and the first online pass after the fix
  appended 4,105 messages to 28 files and added 96. Fixed in `wisdom: an incremental export
  fetches new messages in stored targets`.

- **`wisdom.mjs export --since` replaced the history already stored**, found while verifying
  C27a. Under `--since` the export loaded an empty manifest, so it fetched every target from
  the date, wrote each file whole with only the messages after it, and saved a manifest
  holding only the targets that had some. A later plain export took each shortened file as up
  to date and never fetched the lost messages again: those before the date, and any between
  the file's end and the date. C27a's oracle measured it: a stored channel holding d1 and d2
  held d10 alone after an export with `--since` d5. Fixed in `wisdom: export --since keeps the
  history already stored`.
- **An unknown count name was reported at the wrong line**, found while landing C32.
  `findCountRefs` counted lines in the masked content, where a fence is one line, and
  `rawContent` starts after the frontmatter, so `validateCountNames` gave `x.md:5` for a name
  on line 12 below three lines of frontmatter and a five-line fence. The build still failed;
  only the line it named was wrong. Fixed in `builder: an unknown count name is reported at
  its file line`.
- **`convert_em_dash_separators.mjs` closed no fence**, found while landing C34. Its closing
  test, `FENCE_CLOSE_RE`, ends in `[ \t]*$` without the `m` flag, and each line it tested
  still carried its line ending, so a closing fence matched only as a page's last line with
  no ending. From a page's first fence on, the tool converted nothing and `--check` reported
  nothing: 37,861 prose lines in 598 of 912 pages. It came in with `427f77a6` (2026-09-21),
  whose close test replaced the port's toggle on any line starting with three backticks,
  and nothing tested the tool. No literal
  dash got past it. Fixed in `scripts: convert_em_dash_separators reads code regions from
  lib/`, which deletes the scan and adds the tool's probes to `check_code_regions.mjs`.
- **`nav_hops.mjs`' `hrefs` misread `Authoring.md`**, found while landing C39. Its fence
  regex opens on any line starting with three backticks and closes only on a line of exactly
  three, so each of the page's four-backtick fences (from `Authoring.md:476`) was closed
  early, and its own four-backtick closing line then opened a fence that ran to the next
  three-backtick line: lines 482-576, 577-614 and 615-760 were dropped as code, and five
  prose link targets with them. The regex also keeps indented code blocks, where three link
  strings sit (the page template's See Also, and two climbs shown as code). The fences came
  in with `5b64cd41` (2026-09-22), before the review, whose B9 says "None misfires today":
  it counted the fences the regex misses, not what it made of the lines after them. At the
  owner's choice it is fixed inside `builder, eval: counts, run_case and nav_hops skip code`
  rather than in place first.
- **Three statement pages had lost the `#` from their titles**, found while landing C41.
  `title: Input #`, `title: Line Input #` and `title: Write #` were unquoted, and YAML reads
  ` #` as the start of a comment, so the site had titled the pages `Input`, `Line Input` and
  `Write` (in the sidebar, the breadcrumb, the browser tab and the search) since `042210e2`
  (2026-05-09). Wisdom's own reader kept the `#`, which is how C41's oracle saw the
  difference. Fixed in `docs: quote the three statement titles that end in #`.
- **Wisdom's extract grouped the reference as `Default`, `Built-In` and `Core`**, found while
  landing C41. `buildPackageSummary` and `buildPageIndex` took the first folder under
  `docs/Reference/` as a page's package, and `58a5e1c` (2026-06-03) moved the packages one
  folder down. From then on `package-summary.txt` would have held three groups where the
  Extract agents are told to expect `Package > Module` lines, and `page-index.json`'s keys
  read `Default/<title>`, so that pages of one title in two packages hid all but one. No
  extract run has used it: the one on disk predates the move. Fixed in `wisdom: group
  reference pages by package, below Default/ and Built-In/`.
- **`check_cli`'s `transcript -x` case failed on Linux**, found by CI after C51: it required
  a folder in a file name that Node prints with one only on Windows. Fixed in `scripts:
  check_cli's transcript -x case passes on Linux`.
- **CI never ran `test/search.test.mjs`**, found while landing C51a: the gate roster read only
  `node scripts/` lines, so the two roster gates could not see a `node --test` step in
  `test.bat`. Fixed in `scripts: the gate roster reads node --test lines; CI runs the search
  tests`.
- **A lane whose close finds a problem passes**, found while landing C65. `Lane.close` throws
  when the compiler crashed or the IDE opened a javascript dialog, and it runs in an `after`
  hook. On Node 24.13.0 a throwing `after` hook marks its suite failed but leaves `fail 0`, and
  the file exits 0 under `node --test`, even when the hook sets `process.exitCode = 1` (scratch
  tests, run directly and under `--test`). `addin_test.mjs` judges a lane by that exit code.
  Scheduled as C65a, at the owner's choice. Fixed in `test: a lane fails when closing it finds
  a problem`.
- **`fast-inflate.mjs` patched a function pdf-lib never calls**, found while designing C66 (a
  Sonnet survey of the shims, then measured). A stock load of a PDF with a cross-reference
  stream and object streams made no `pako.inflate` call and decoded both through pdf-lib's own
  `FlateStream` (the kit's `c66-inflate-count.mjs`). The owner chose deletion, `pako`
  included. Fixed in `book: delete fast-inflate.mjs, which patched a function pdf-lib never
  calls`.
- **`fast-parse-number.mjs` read some decimals as a different double than stock**, found
  while building C66: its gate, over a fixture holding `/Sum 2.28`, found the shimmed save
  writing `2.2800000000000002`, and named the shim both ways (the only one to differ alone, and
  the only one whose removal made the output match). Scheduled as C65c, at the owner's choice.
  Fixed in `book: fast-parse-number reads a decimal as Number() does`.
- **Under `fast-dict-onebuf.mjs`, pdf-lib could not add a page**, found while building C66:
  the shimmed side of its gate failed at `insertPage`, and so did `fast-dict-onebuf.mjs` alone.
  Two of pdf-lib's dictionary factories were left unreplaced, and the replaced methods cannot
  read what they build. Scheduled as C65d, at the owner's choice. Fixed in `book:
  fast-dict-onebuf builds new pages and page trees in its buffer`.
- **Fixes.md still counted thirteen pdf-lib shims**, found while building C66: C65b deleted one
  and missed that page. Scheduled as C65e, at the owner's choice. Fixed in `docs: Fixes.md
  stops counting the pdf-lib shims`.
- **The shim gate's reach check counted shims, not patches**, found while landing C67: with
  `PDFObjectParser` replaced by a copy in `pdf-lib-internals.mjs`, the gate named the two shims
  whose only patch is on it, and passed over the `parseDict` and `parseArray` patches of two
  shims whose other functions ran. A reach check by function alone would not have closed it:
  a patch applied to a copy is not a patch of pdf-lib at all. Scheduled as C67a, with the
  document's reach of the members it marks as C67b, at the owner's choice. Fixed in `book:
  check_pdf_shims_equiv checks each member the shims patch`.
- **`render-book.mjs` described the dictionary shim's `d` with an owned bit**, found while
  landing C68: its summary said "a packed (start, length, owned) Number" and named "Owned
  dicts", a bit the shim dropped long before. Folded into C68, at the owner's choice. Fixed in
  `book: the two onebuf shims share their range machinery`.
- **The shim gate passed with PDFPageLeaf's flags dropped in a copy-on-write**, found while
  landing C68: a fault removing the gap bits from the new module's `cow` left the gate green.
  pdf-lib reads `autoNormalizeCTM` only inside `normalize()`, and the one copy of the drawn
  page's range came from the `/Annots` key that `normalize()` adds last, after that read. The
  side now sets a new key on the page before drawing on it. Folded into
  C68, at the owner's choice. Fixed in `book: the two onebuf shims share their range
  machinery`.
- **Nothing checks that a shim's table covers what it patches**, found while landing C69: a
  shim that gains a patch and no table entry passes, since the gate's `PATCHES` lists the
  members each shim patches and nothing compares that with the shim's own `checkTargets`
  table. The side already lists each shim's patched members, so each shim could export its
  table for the side to compare. Left for a commit of its own, at the owner's choice.
- **`census_attributes`' `--help` left out `--dump-sites`**, found while landing C49: it
  printed a slice of the header comment, whose option list lacked the flag and whose first
  printed line was empty. Folded into C71, at the owner's choice. Fixed in `builder, scripts,
  book, eval, wisdom: --help prints usage to stdout and exits 0`.
- **`check_links`' help said `--check-sitemap` and `--check-search` were skipped silently**
  when their file is absent; each prints a `warning:` line and skips the check. Folded into
  C71, at the owner's choice. Fixed in `builder, scripts, book, eval, wisdom: --help prints
  usage to stdout and exits 0`.
- **`eval/build_corpus.mjs --dest ""` deleted the current folder**, found while landing C72:
  the empty value resolved to the working folder, which `build()` removes recursively before
  writing (`build_corpus.mjs:148`). C72's empty-value refusal closes that form; `--dest .` and
  `--dest ..` still reach the removal. The guard goes into C72a, at the owner's choice.
  Fixed, for the empty value, in `builder, scripts, book, eval, wisdom: a refused command line
  exits 2`.
- **`convert_em_dash_separators --chek` rewrote `docs/`**, found while landing C72: a
  misspelt `--check` was ignored, and the tool converts in place unless `--check` is given.
  Fixed in `builder, scripts, book, eval, wisdom: a refused command line exits 2`.
- **`wisdom/PLAN-3.md` listed `--threads <dir>` for `extract`**, which takes `--in`; ignored
  before, refused once C72 lands. Fixed in `builder, scripts, book, eval, wisdom: a refused
  command line exits 2`.
- **`perf/ab-axe.mjs`'s `--json FILE` did nothing**, found while landing C73: `9c722f17`
  removed the write it fed and left the flag, so `jsonOut` was set and never read. The rig
  writes `per-rule-measures.json` into its `--out DIR`. The flag is deleted, at the owner's
  choice. Fixed in `scripts, eval, perf: one meaning each for --json and --src`.
- **A crash in `addin_test` after the registry snapshot leaves the registry unrestored**,
  found while landing C74. It exits 2, where the table gives 3 for a registry that was not
  put back. C74a fixes it.
- **`scripts/lib/axe-scan.mjs:220-230` throws while it loads**, when `STATE_AUDITS` names a
  page that `SAMPLE_PAGES` lacks or an unknown state. That runs before any crash handler, so
  the five a11y tools exit 1, which `check_a11y` gives for a violation. Found while landing
  C74, and left at the owner's choice.
- **A failed self-test probe exits 1 in `check_gate_lists`**, but 2 in `check_ci_workflows`
  and `check_regex_safety`. Found while landing C74, and left at the owner's choice.
- **A crash in a `check_regex_safety --shard` worker exits 1**. The parent reports it as a
  failed shard and exits 2, so no user sees the 1. Found while landing C74, and left at the
  owner's choice.
- **`check_examples`' probes batched with the run's own `--batch` and `--jobs`**, because
  `makeBatches` read both from module scope. `check_examples.mjs --census --batch 1` failed
  five probes and exited 2 on a valid command line. Found while measuring C80. Fixed in C80.
- **The roster gates did not read a gate whose file name holds a hyphen.** The three name
  patterns (`check_gate_lists.mjs`' list and command-block readers, `gate-roster.mjs`'s
  wrapper reader) allowed letters, digits, `_` and, for a test, `.`, so a hyphenated gate
  could leave a wrapper or CI with both roster gates green. Found when C80's gate was the
  first such name. Fixed in C80.
- **`launchIde` refused a taken DevTools port without saying what held it.** One
  `examples.bat` run stopped after 37 s. Lane 0, starting batch b4, found port 9480 still
  taken after the 10 s `launchIde` allows, and refused. Minutes later nothing listened on
  9480 and no twinBASIC process ran, so the holder could not be named. `portTaken` also
  counted any bind error as taken, so a port Windows had reserved (`EACCES`, nothing
  listening) read as another IDE. Found while running C81's check. Fixed in C81a, which names
  the holder, so a repeat can be diagnosed; the cause is still unknown.
- **Tooling comments tell incident history that no rule needs.** Found by C82's agents: the
  headers of `check_code_regions.mjs` and `check_gate_lists.mjs`, `test.bat`'s comments,
  `tbdocs.mjs:138`, `check_tree_fresh.mjs:42`. The owner chose a commit of its own
  (2026-09-30). Fixed in C82a.

## Open questions

Each is settled in the commit named, on the recommendation given there, unless the owner
decides otherwise:

- the exit value for a command-line error in `tbdocs` and `check_links.mjs`: C18 made it 4,
  and C72b settled it at 2, as in every tool;
- Biome or ESLint: C05's evaluation decides;
- whether `test.bat` without Python fails or skips `check_impexp_parity.mjs` loudly: C70,
  decision (b)'s open question, which the owner settled on 2026-09-25: it skips, loudly;
- whether the pre-commit hook should also run the dash check, which A6-3 assumed: the owner
  approved a hook that runs Biome only (C08), so it stays out unless the owner asks for it;
- what Wisdom's extract should call the Assert package: its reference folder is
  `docs/Reference/Built-In/TwinBasicAssertions/`, while the package's title, nav parent and
  permalinks say `Assert`. Since C41c `package-summary.txt` groups it as
  `TwinBasicAssertions` and `page-index.json` keys it `TwinBasicAssertions/<title>`; the last
  summary written (2026-06-04, before `58a5e1c` reached it) said `Assert`, the name a thread
  on Discord would use. Kept at the owner's request, to be picked up later; no commit is
  named yet.

The two questions this plan started with are settled: the two link checkers (decision 5), and
the survey script, which is committed.
