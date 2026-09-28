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
file as it stood before `builder: cut Phase 1's landed entries in the tooling plan`. A
pointer below to a cut entry's Landed note means that text. Line numbers are the
review's, at `fe9ce12b`, and move as the commits land.

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

1. **A command-line error in `tbdocs` cannot exit 2 (L1-4).** Fixed by C18, which gives a
   command-line error one value outside the bitmask in both `tbdocs` and `check_links.mjs`,
   whose own argument errors the review did not list.
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

**Carried forward.** `census_attributes.mjs` moved from `builder/` to `scripts/`, beside
`build_package_api.mjs` (C38 relies on both readers now living in `scripts/`).

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

**Carried forward.** In `tbbuild`, `check_examples`, `census_attributes` and
`build_package_api` (and in `tbdocs`, under C18), a value flag given no value, whether at the end of
the command line or followed immediately by another flag, is a usage error. This matches
Node's strict `parseArgs` (confirmed on Node 24.13, which also accepts a lone `-` as a value),
so `lib/cli.mjs` (C47) needs no behaviour change here when C49 migrates these tools onto it.
Ports and counts must be whole numbers; a timeout may be any positive number. The check runs
before `--help` is handled.

### C18 — `builder, scripts: a command-line error exits outside the link bitmask`

**Carried forward.** A command-line error in `tbdocs` and in `check_links.mjs` exits 4, a
value outside the existing 1 (link failure) / 2 (integrity failure) / 3 (both) bitmask. This
covers a value flag given no value or followed by another flag, an out-of-range `--port`, and
(from C13a) a `--dest` that overlaps the source tree. C47, C49, C52 and C60 build on this
value; Phase 3 (C71, C72) treats these two tools as the exception to "an unknown flag or a bad
value exits 2."

### C19 — `scripts: close the browser on every exit path, through lib/browser.mjs`

**Carried forward.** `scripts/lib/browser.mjs` holds `launchBrowser` and `withBrowser(fn,
options)`, which closes the browser in a `finally`; `LAUNCH_ARGS` is no longer exported.
`axe-scan.mjs` re-exports `launchBrowser` for the `perf/` rigs that import it. C44 moves
`check_dot_fit.mjs` and `build_dot_metrics.mjs` onto the same module, adding a file-access
launch option to it.

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

**Carried forward.** `parseStaging` throws, naming the line, when the chunk after a `---` line
does not start with `## `, so a `---` inside a fenced sample stops the run. C26's oracle, a
scratch script not in the repository, ran it on the real `staging.md` and on synthetic files,
one of them a section whose fenced sample holds a `---`. C36's Verify expects that file to
keep its section's tail and its `_Source threads:_` line.

### C27 — `wisdom: write manifest.json and denied.json atomically`

Landed.

### C27a — `wisdom: an incremental export fetches new messages in stored targets`

Landed.

### C27b — `wisdom: export --since keeps the history already stored`

Landed.

### C28 — `scripts: exit 2 on a crash in three tools that exit 1`

**Carried forward.** `pick_a11y_sample.mjs`, `build_dot_metrics.mjs` and
`check_tb_registry.mjs` each gained `check_dot_fit.mjs`'s crash handler, installed after
their imports, exiting 2 on a crash; `check_tb_registry.mjs`'s catch passes on everything but
an `AssertionError`. C43 folds these three handlers, and C07's, into `lib/gate-probes.mjs`'s
shared handler.

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

**Landed.** `lib/markdown.mjs` exports `blockRegions(src, { md })`, `maskCode(src, { md,
indented })`, `splitCodeSpans(line)`, `splitOnMarker(src, isMarker, { md })` and `mapLines(src,
fn)`, the line-splice helper. `lib/frontmatter.mjs` exports `parseFrontmatter(raw)`. Nothing
adopts either yet. `check_code_regions.mjs` gained eleven module probes, one of them the
sixteen code-span cases, and its sweep now checks on every page that `blockRegions` gives the
full parse's fences, code blocks and HTML blocks at the same lines; its summary line adds the
fence count. `lib/README.md`, Tools.md's list entry and section, Extending.md's "Say what a
pass covered" and WIP.md's gate row say so.

What the module decides, which later entries rely on:
- **Lines** end at CRLF, LF or a lone CR, as in CommonMark, and are 0-based. `blockRegions`
  applies markdown-it's `normalize` rule itself, since a block-only parse skips it: without
  it a CRLF closing fence closes nothing. `mapLines` and `splitOnMarker` split the same way,
  so a region's `start` and `end` index what they see. Neither gives a line for the empty
  remainder after a final line ending, where `split("\n")` gives one (C35, C36).
- **A region** is `{ type, start, end, markup, info, content }`: a half-open range whose
  lines keep their blockquote and list prefixes, and markdown-it's token fields. Regions are
  disjoint and in document order.
- **`maskCode`** replaces a fence whole, prefixes included, with one line that starts with a
  backtick, as `maskCodeRegions` did; the line's ending stays outside the placeholder.
  Code spans are masked on every other line, HTML blocks included, and indented code blocks
  only under `indented: true`.
- **`splitOnMarker`** returns `{ marker, start, lines }[]`: first the lines before any marker,
  with `marker` null, then each marker line's text and index with the lines after it, line
  endings dropped. A line inside any region, HTML blocks included, is never a marker.
- **`splitCodeSpans`** is `convert_em_dash_separators.mjs`'s `splitInlineCode` verbatim, so
  V1's equivalence with `maskInlineCode` carries over. It scans backticks only: the entry's
  "backtick and tilde run scanner" is wrong, since a code span cannot be written with tildes.
  Its two known gaps are stated beside it, and both copies had them: a span over two lines
  is not seen, and a backslash before a backtick does not stop it opening a span.
- **`parseFrontmatter`** returns `{ data, content }`, or null when the first line is not
  `---`. It differs from gray-matter only on input no page holds (C40, C41): a block closes
  only at a line that is `---` with optional trailing whitespace, where gray-matter closes at
  the first `\n---` whatever follows; nothing may follow the opening `---` but whitespace,
  where gray-matter reads a language name there; an unclosed block throws, where gray-matter
  parses the rest of the file as YAML; a block that parses to anything but a mapping throws.
  An empty block, or one of only comments, gives `{}`, as gray-matter's does. A YAML error
  names the line of the file, because the parse is given a newline in place of the opener.

**Verify.** The eleven module probes and `--self-test` pass. Over all 912 pages
`blockRegions` agrees with the full parse, and finds **1,372 fences, not 1,371**: one has
been added since the review. Each of eight faults put into the modules fails the gate:
dropping the newline normalisation (the CRLF probe and 598 pages), a marker split that
ignores regions, a span closed by a longer run, `blockRegions` ignoring the parser passed,
indented blocks always masked, the placeholder losing its line ending (three probes), no BOM
strip, and no stand-in line for js-yaml (the error-line probe). `maskCodeRegions` fails the
A3-1 probe's mask assertion: it masks the ```` ```abc`def ```` line and all after it as a
fence. Ahead of C32 and C40, two scratch comparisons over the corpus: `maskCode` with the
site's parser against `maskCodeRegions`, on the content `render.mjs` sees, gives the same
masked text on 905 of 912 pages (the other seven are under C32); `parseFrontmatter` against
gray-matter as `discover.mjs` calls it gives the same result on all 912 pages and on the two
tracked `.html` pages, which have frontmatter too: data deep-equal, content byte-equal. The
tree comparison differs only where the commit edits pages: Tools and Extending online and
offline, the search data, and `book.html`. Nothing in `builder/` imports the modules yet.

Writing the modules, the Write tool turned a four-digit `\u` escape into the character it
names, twice; a scan for raw non-ASCII found both. WIP.md's Don'ts now say so, in the commit
before this one.

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

**Found in C31: the new mask covers seven fences the old one does not.** `maskCodeRegions`
masks a fence only when nothing but up to three spaces or tabs precedes its opener, and
`maskCode` masks every fence markdown-it finds. On the content `render.mjs` sees, with the site's parser, the
two masks give the same text on 905 of 912 pages. The other seven each hold a `> ```tb`
fence inside an admonition, which only the new mask hides: `CEF/CefBrowser/index.md`,
`WebView2/WebView2/index.md`, `tbIDE/HtmlElement.md`, `Core/If-Then-Else.md`,
`Core/Option.md`, `Core/WithEvents.md` and `VBA/Interaction/InputBox.md`. The tree comparison
should still come out identical, but that is reasoned, not measured: `check_code_regions.mjs`
already shows that no rewrite alters those fences, and `rewriteAdmonitions` runs after the
restore. If it differs, look at those seven pages first. Two more things this commit must
settle. `applyPreRenderRewrites` takes no parser today, so it needs one to pass the site's.
And `check_code_regions.mjs` calls it: with the bare parser by default, the gate would mask
differently from the build wherever the definition-list plugin makes a fence.

**Landed.** `applyPreRenderRewrites(rawContent, md)` masks with `maskCode(source, { md })`
and throws a `TypeError` when given no parser, so no caller can mask differently from the
build without noticing; `renderPage` passes the site's. `maskCodeRegions` and
`maskInlineCode` are gone. `findCountRefs(rawContent, md)` and `validateCountNames(pages,
counts, md)` mask the same way, so `counts.mjs` no longer imports `render.mjs` and the
circular import between them is gone; `tbdocs.mjs` now creates the site's parser before it
validates the count names. `check_code_regions.mjs` builds the site's parser with
`createMarkdownIt` and passes it to the chain, which settles the entry's question, and gains
`UNCHANGED_PROBES`: sources the chain must return byte for byte, one so far, a fence the
definition-list plugin makes. That probe had to be a direct comparison. The region
comparison parses bare, finds no fence there, and so never sees the fence's body rewritten.
`check_examples.mjs`'s markup probe masks with `maskCode`. At the owner's request,
`encodeSpacesInMediaUrls`' comment, stranded above `applyPreRenderRewrites`, went back above
its function. Citations of the old mask are updated in `builder/README.md`, WIP.md,
WIP.Build.md, WIP.ExamplesBuild.md, Extending, Authoring, Pipeline-Stages,
`eval/usecases.md` and `scripts/lib/tb-fences.mjs`; two of those said the old mask skipped a
fence whose info string holds a backtick, which A3-1 shows it did not. The comment above
`stashCodeFences` still names `maskCodeRegions`; C33 deletes it.

For later entries: the region comparison cannot see a code region that only the site's
parser finds, so a probe for one compares the chain's output directly. With the mask taken
out of the chain altogether, the corpus sweep still reports no page altered; today only the
probes catch that fault.

**Verify.** Before the citation edits the tree comparison was identical (1,461 files online,
1,457 offline, 137 pdf), the seven admonition-fence pages included, so the entry's reasoning
now has a measurement behind it. After them it differs only in Authoring, Extending and
Pipeline-Stages online and offline, the search data, and `book.html`.
`check_code_regions.mjs`: `912 file(s), 0 with altered code regions, 1372 fence(s) in the
full parse -- clean`, with 7, 5, 1 and 11 probes. Three faults each fail it with exit 1: the
gate passing its bare parser to the chain and the mask ignoring the parser it is given both
fail the new probe, and the chain rewriting unmasked source fails three fence probes and the
new one. `check_examples.mjs --census` runs the markup probe: `ok 119 probes`. From a
scratch page, the count validator ignores a name in a fence, in a code span and in a
definition-list fence, and reports one in prose.

Found: the line `validateCountNames` reports is a line of the masked content after the
frontmatter, not of the file: `x.md:5` for a name on line 12, below three lines of
frontmatter and a five-line fence. C32 keeps that number, and C32a fixes it.

### C32a — `builder: an unknown count name is reported at its file line`

**Found in C32** (see Found while implementing); the owner asked for the fix as its own
commit straight after C32, so that C32 changes nothing.

**Landed.** `discover` gives each page `contentLine`, the file's 1-based line on which
`rawContent` starts, counted from the text before gray-matter's content. `findCountRefs`
counts a reference's line in `rawContent` with the code put back, so a masked fence counts
all its lines, and `validateCountNames` adds `contentLine - 1`. C40 needs no change for it,
because the line comes from the content's length. If `parseFrontmatter`'s content is ever
not the file's tail, the probe fails. The probe is in `check_code_regions.mjs`, which the
owner chose because the validator asks `lib/markdown` what is code. It writes one page to a
temporary folder and runs it through the real `discover` and `validateCountNames`: CRLF
frontmatter, count names in a fence, a code span and a definition-list fence, then an
unknown one in prose on line 16. Pipeline-Stages gains the `contentLine` field and states
both functions' lines. Tools.md's section and WIP.md's gate row name C32's probe and this one.

**Verify.** HEAD's validator reports the probe's page at `x.md:9`, and this one at
`x.md:16`. Four faults each fail the probe: lines counted in the masked content, no
frontmatter offset, `discover` setting no `contentLine`, and the validator masking with a
bare parser. Over all 914 pages `discover` finds (912 `.md`, 2 `.html`), the file from line
`contentLine` on is exactly `rawContent`. The tree comparison differs only where the commit
edits pages: Pipeline-Stages and Tools online and offline, the search data, and `book.html`.

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

**Landed.** `stashCodeFences` and its `FENCE_OPEN_RE` are gone, with the comment above them
that named `maskCodeRegions`. `rewriteAdmonitions(src, md)` asks `blockRegions` with the
site's parser, which `applyPreRenderRewrites` passes on, and throws a `TypeError` without one,
as the chain does. It leaves a match alone when the match's `[!TYPE]` line is in a region.
That is narrower than the entry's "skips the ranges": a fence inside an admonition is a
region too, and the rewrite must still strip its `> ` markers, so only the opener line
decides. HTML blocks count as regions, as they do for `splitOnMarker`; the old stash did not
protect them, but no page has an admonition in one (below). The new comment says what decides
and points to WIP.Build.md for the two defects the old scan had. Two probes: A3-1's shape
joins `ADMONITION_PROBES`, six now, with a fence after it that a wrong opener would close on;
`UNCHANGED_PROBES` gains an admonition written inside a definition-list fence, the shape where
the old scan and the parser disagree. The gate's failure message and summary line no longer
name the stasher. Pipeline-Stages (both functions' rows), Extending (its sample passes `md`,
and a rewrite outside the mask can skip `blockRegions`' lines), Authoring, Building, Tools
and WIP.Build say so; what WIP.Build tells of the old scan stays in the past tense.

**Verify.** Before the change, over all 912 pages: 632 admonition openers, one of them in a
region (a fence in `Documentation/Wisdom.md`), which the old stash protected too, and none in
an indented code block or an HTML block. The tree comparison with the page edits set aside is
identical (1,461 files online, 1,457 offline, 137 pdf); with them it differs only in
Authoring, Building, Extending, Pipeline-Stages and Tools online and offline, the search
data, and `book.html`. `check_code_regions.mjs`: 7, 6, 2 and 11 probes, and `912 file(s), 0
with altered code regions, 1372 fence(s) in the full parse -- clean`. Four faults each fail
it with exit 1: the rewrite ignoring the regions (the new unchanged probe, and Wisdom.md's
fence altered), the rewrite asking a bare parser (the new unchanged probe), a private opener
test that allows a backtick in the info string, as the old mask's did (both new probes), and
HEAD's `render.mjs` put back whole, stash and all (the new unchanged probe).

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

**Landed.** `convertText(text, md)` takes its code regions from `blockRegions` with the
site's parser, which `main` builds with `createMarkdownIt`, and throws a `TypeError` without
one, as the build's two rewrites do. A line inside any region is left alone, and the other
lines go through `splitCodeSpans`, rejoined by `mapLines`. HTML blocks count, because the
typographer converts only text tokens, so a dash in one is literal on the page. `FENCE_OPEN_RE`,
`FENCE_CLOSE_RE`, `splitInlineCode` and `KEEP_ENDS` are gone, and so is the comment on the
known gap for indented code blocks, which this closes. The entry's gap for two-space
list-item fences was already closed by `427f77a6`, whose opener allows up to three spaces.
**The old scan closed no fence** (see Found while implementing), and deleting it is the fix,
at the owner's choice. Also at the owner's choice, the entry's seeded file became seven
permanent `DASH_PROBES` in `check_code_regions.mjs`: a fence after an earlier fence with CRLF
and lone-CR endings, a doubled-backtick span, a fence five spaces into a nested list item,
one behind `> `, an indented code block beside an HTML block, a definition-list fence, and a
See Also separator. Tools.md's two sections and WIP.md's gate row say so. The exit paragraph
in Tools.md now says "any other probe" where it named module probes and left out two kinds.

**Verify.** `--check` over `docs/` exits 0 before and after, with `Files affected: 0`. Over
all 912 pages against the old scan: 37,861 lines it read as code are prose to `blockRegions`,
in 1,386 runs across 598 files, all after the page's first fence. 304 lines it read as prose
are code now: 15 in fences behind `> `, 180 in indented code blocks and 109 in HTML blocks.
The pages hold 77 literal dashes in fences and 4 on other lines, all four in code spans
(`Authoring.md:388`, `Tools.md:596`), so no dash got past the old scan. The site's parser and
a bare one find the same regions on every page, and so do the whole file and its content
after the frontmatter. `check_code_regions.mjs`: 7, 6, 2, 7, 11 and 1 probes, and `912
file(s), 0 with altered code regions, 1372 fence(s) in the full parse -- clean`. Six faults
each fail it with exit 1: HEAD's scan put back and the regions
ignored each fail five probes, the first among them; a bare parser fails the definition-list
probe; skipping fences only fails the indented-block probe; unsplit code spans fail the span
probe; and normalised line endings fail the first. The tree comparison differs only in Tools
online and offline, the search data, and `book.html`.

### C35 — `scripts: check_examples' marker splice uses lib/markdown's line splice`

**Inventory site A4.** `applyMarkers` (`check_examples.mjs:1123-1154`) already finds its line
through markdown-it and re-verifies it before editing; only the split, edit and rejoin that
keeps CRLF is private.

**Change.** The splice comes from `lib/markdown.mjs`; the re-verification stays.

**Verify.** An equivalence run in a scratch script: the old and new splice give identical
files for every `tb` fence opener in `docs/`.

**Landed.** `applyMarkers` rewrites each file through `mapLines`, with a map from a line's
0-based index to the fence found there; the re-verification and its finding are unchanged,
and a refused line comes back as it was. The one difference is intended: `collectFences`
numbers lines from a full markdown-it parse, which also ends a line at a lone CR, and
`split("\n")` did not, so below a lone CR the old splice read the wrong line and refused the
fence. `mapLines` splits as the parse does.

**Verify.** HEAD's `applyMarkers` and this one, each cut from its file and run with a fake
`fs` over the 1,222 `tb` fences `collectFences` returns from 606 pages, every one claimed
unmarked with the info string `tb`. On the pages as they are, both refuse all 1,222 and write
back identical files. With ` check_build` taken off every opener that carries it (569 pages),
both mark 950 and refuse 272, and the marked pages are byte for byte the pages in the tree,
all 606 of them, CRLF included. For a fence below a line holding a lone CR, HEAD refuses and
this marks.
`check_examples.mjs --census` loads it and passes its 119 probes.

### C36 — `wisdom: parseStaging splits only on real section boundaries`

**L3-3 (R1), second half.** After C26 a fenced `---` makes the run fail instead of dropping
content; this makes it not a boundary at all.

**Change.** `parseStaging` splits with `splitOnMarker(src, line => line === "---")`, and
`serializeStaging` writes back through the same module.

**Verify.** The real `staging.md` parses to the same 1,160 sections, with the same headings
and metadata, and serialises to the same bytes as before. C26's synthetic file now keeps its
section's tail and metadata.

**Landed.** `parseStaging` splits with `splitOnMarker(content, (line) => line === '---')`,
with the bare parser, since `staging.md` is not a page. Each chunk's first line for C26's
error comes from the marker's index, and C26's message no longer says that a fenced `---`
splits the file. The CRLF replace goes: the module splits at any line ending. A fence left
open runs to the end of the file in markdown, so every section after it would have become
body text of one section, where the old split cut at every `---`. At the owner's choice
`parseStaging` refuses that instead: a region that reaches the file's last line and holds a
`---` line throws, naming its first line and the `---`. `serializeStaging` has nothing to
take from the module: it builds lines from parsed sections and reads no source. Wisdom now
loads markdown-it through `lib/`, from `wisdom.mjs` on, since it imports `prep.mjs` and so
`merger.mjs` statically: Wisdom.md's Prerequisites said no `npm install` was needed, and now
say it is, and WIP.Wisdom.md's opening says the same. C41 would have made that so anyway,
through `lib/frontmatter.mjs` and js-yaml. Wisdom.md's merge step says what the split skips
and what it refuses.

**Verify.** The kit's `c36-oracle.mjs`, against a HEAD copy of `wisdom/extract` and
`wisdom/files.mjs`. The real `staging.md` (1,586,815 bytes, LF, 180 fences and 10 HTML
blocks, none holding a `---` or `## ` line) parses to 1,160 sections under both, deep-equal,
and the same parse from its CRLF form. A graft of no additions writes back 1,586,815 bytes
under both, equal to the file. C26's synthetic file, and one with a `---` in a tilde fence and
in an HTML comment, give two sections with their finding ids and every body line, where HEAD
throws. A fence left open and an HTML comment left open throw, where HEAD split them into
three and two sections. Prose after an unfenced `---` throws under both at the same line;
blank chunks, an all-preamble file and a file with no final newline parse the same. The tree
comparison differs only in Wisdom online and offline, the search data, and `book.html`.

### C37 — `scripts: check_gate_lists' sections ignore fenced headings`

**Inventory site B3.** `splitSections` (`:251-264`) starts a section at any line matching
`/^#{1,6}\s/`, so the fenced `staging.md` example at `docs/Documentation/Wisdom.md:304-305`
splits `### staging.md format` in two. No verdict changes today only because the phantom
section states no gate count.

**Change.** Sections through `splitOnMarker`, so a heading-shaped line inside a fence starts
none. A probe: a fenced `## ` line inside a section that states a count.

**Verify.** The gate's verdict and its 18 probes unchanged; the new probe fails with the old
splitter.

**Landed.** `splitSections` splits with `splitOnMarker` on the same `/^#{1,6}\s/` test, with
the site's parser, since the pages are the site's; it is built on first use inside `main`, so
a failure to build it exits 2. A section still begins with its heading line and carries that
line's 1-based number. `sectionBody` had the same fault in Tools.md's two wrapper sections,
which the entry does not name, and now takes its section from `splitSections`. The new prose
probe states a wrong total after a fenced `## ` line in a wrapper's section: 19 probes, and
Tools.md's section and WIP.Build.md now say thirteen of the nineteen cover the sweep. Two
other differences from the old split reach no page: a lone CR now ends a line (no page the
gate reads has one), and a final line ending no longer gives an empty last line, which no
rule matches.

**Verify.** Of the 16 pages the gate reads, one has a heading-shaped line inside a region:
`Wisdom.md:310`, in the `staging.md` example, under the bare parser and the site's alike.
`--verbose` under a HEAD copy and the working file gives the same claim lines, 6 stated
counts across 16 pages, exit 0 both; the only difference is the new probe's line. With the
old splitter put back the new probe fails: exit 1, `1 of 19 self-test probes failed`.

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

**Landed.** `scripts/lib/attributes-doc.mjs` exports `parseAttributes(src)`, which is
`gen_attribute_probes`' reader, `{ name, syntax, line, app }[]` in page order, with every line
inside a region from `blockRegions` skipped. Its regions come from the site's parser, built on
first use, as in C37. `gen_attribute_probes` calls it on the file it reads; `census_attributes`
builds its map from it, keyed by name, a later entry replacing an earlier one as before, and
its values now also carry `syntax`, which it never reads. Both tools therefore load
markdown-it and `builder/render.mjs`, where they imported only `node:` modules, so neither runs
without `npm install` any more. Tools.md's `gen_attribute_probes.mjs` section says a fenced
line is not read and names the module.

**Verify.** The kit-style oracle, HEAD's `documentedAttributes` and `parseAttributes` cut from
HEAD's files and run beside the new reader: the real page and its CRLF form give the same 71
attributes, each with a target, under all three. A fenced `Syntax:` block appended to the page
is read by both HEAD readers and not by the new one, and a fenced `Applicable to:` line put
straight after the first `Syntax:` line becomes that attribute's target under HEAD, where the
new reader takes the real line after the fence. End to end, HEAD copies and the working tools
give byte-identical output, 136 files: `gen_attribute_probes`' two probe trees and key, and
`census_attributes --json` over the BETA 987 cache (661 files, 9,706 sites; no IDE started).

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

**Landed.** All four use the bare parser. `counts.mjs` has no choice: the site's parser is
built with the counts (`tbdocs.mjs:607-613`), so it does not exist when they are derived. A new
`proseLines(src)` there gives a page's lines with each line in a region replaced by null;
`countAttributeAnchors` counts the `{: #id }` lines in it, and `countEnumerations` finds the
index heading and scans to the next heading in it, where each did a multiline regex over the
raw source. `evaluatorProtocol` takes neither boundary from a region. `hrefs` blanks the lines
of every fence and indented code block and keeps HTML blocks, whose `href`s are links.
`eval/` still imports only `lib/`, not `builder/`: over all 912 pages the bare parser and the
site's give the same regions. Extending.md's paragraph on the two scanning counts says they
skip code, and that a new one should.

**Verify.** A scratch oracle cut each function out of HEAD's file and the working one and ran
both with their dependencies injected. The counts come out 72 anchors and 140 enumerations
from the real pages and their CRLF forms under both; with a fenced `{: #fake }` appended and
a fence holding `- [Fake](Fake)` and `## x` put under the index heading, HEAD gives 73 and 1
and the new code 72 and 140. The protocol's evaluator half is the same 3,985 characters from
the file and its CRLF form; with a fence holding `---` and the orchestrator heading put
before the first rule, HEAD throws and the new code returns the same text. `hrefs` gives the
same links on 911 of 912 pages (12,835 links in all). The one difference is `Authoring.md`,
81 links under HEAD and 86 now, which is the Found item "`nav_hops.mjs`' `hrefs` misread
`Authoring.md`": the new reader drops the three link strings in indented code and finds the
five prose link targets HEAD's regex dropped. On a probe page it keeps a prose link and an
HTML block's `href`, and drops one in a four-backtick fence, a fence in a list item and an
indented code block, where HEAD dropped none of the three. `nav_hops` itself, HEAD copy against
the working file, prints the same paths for four targets. The tree comparison differs only in
Extending online and offline, the search data, and `book.html`.

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

**Landed.** `discover.mjs`'s own frontmatter step is renamed `readFrontmatter`, to free the
name: it calls `parseFrontmatter` inside the same `Failed to parse frontmatter in <file>`
wrap, and takes `contentLine` (C32a) from the raw text, since the stripped BOM holds no line
ending. `stripBom` goes, as `parseFrontmatter` strips the BOM. `nav_hops` takes a missing block as no permalink, as gray-matter's
empty data was. `npm uninstall gray-matter` removed it from `package.json`, and from the
lockfile it, its nested `js-yaml@3` and `argparse`, and seven packages only it used
(`esprima`, `extend-shallow`, `is-extendable`, `kind-of`, `section-matter`, `sprintf-js`,
`strip-bom-string`): 120 lines deleted, none added. Builder.md's `package.json` listing and
its Dependencies paragraph, Pipeline-Stages.md's `frontmatter` row, WIP.md's BOM paragraph,
WIP.Build.md's publish-allowlist note, two comments in `publish-policy.mjs` and the headers
of `lib/frontmatter.mjs` and `discover.mjs`'s frontmatter step no longer name gray-matter, in
the present or as history: at the owner's word, history that no later task needs is left to
git.

**Verify.** `discover()` from a HEAD copy of `builder/` and `lib/` against the working one,
over `docs/`: 914 pages (912 `.md`, 2 `.html`) deep-equal, frontmatter, content and
`contentLine` included, in the same order, and the same 281 static files. With gray-matter
still installed, the tree comparison before any page edit matched in all three trees (1,461,
1,457 and 137 files). Its after side was set aside, gray-matter uninstalled, and the tree
comparison run again with `--before` a `git stash create` commit of the working tree; the
two after sides, compared by a scratch script with `compare_trees`' normalisers, agree on
every file, five of them once normalised (the Gantt chart twice over in two trees, and the
book's build line). HEAD's side no longer builds once the package is gone, so the final tree
comparison takes that stash commit as its before side: it differs only in Builder and
Pipeline-Stages online and offline, the search data, and `book.html`.

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

**Landed.** `wisdom/files.mjs` gains `readFrontmatter(path)`: `parseFrontmatter`'s data, `{}`
for a file with no block, and an error naming the file for a block that does not parse, as
`readJsonFile` names a state file. `sitemap.mjs`'s `parseFrontmatter` and `walk()` and
`prep.mjs`'s `parseThreadFrontmatter` go, and all three call sites read through it.
`buildSitemap` lists its pages with `markdownFiles`, so it is async and `runExtract` awaits
it. `findThreadMetadata` still skips a thread file it cannot read, which now includes one
whose frontmatter does not parse; `runExtract` stops on such a file and names it. The
serializer's `quote` says why every string is written quoted: YAML would read an unquoted
snowflake as a number and lose its low digits. `wisdom/PLAN-3.md`'s layout line no longer
says the sitemap has a parser of its own.

**Verify.** The kit's `c41-oracle.mjs`, HEAD's two readers cut out of the files against
`parseFrontmatter`. Threads: 1,847 files, 1,830 of them in channel folders; none throws and
no snowflake is unquoted, and the record `prep.mjs` builds from each of the 1,830 is
deep-equal. The whole frontmatter differs on 919 files, each on purpose: the old reader
dropped the nested `top_reactions` (898 files) and `starter_reactions` (250), and kept the
backslash of an escaped `"` in 41 titles; `prep.mjs` reads none of those. Pages: 760 under
`docs/Reference`, none throws, and `title`, `permalink` and `parent` agree on 757. The other
three are `Input.md`, `Line-Input.md` and `Write.md`, whose unquoted `title: Input #` YAML
reads as `Input` with a comment after it, which is how the site has shown them since
`042210e2`; the old reader kept the `#`. The keys the sitemap does not read differ as
expected: numbers and booleans where the old reader gave strings (`nav_order`, `has_toc`,
`has_children`, `vba_attribution`), and lists it dropped or kept as text (`redirect_from`,
`symbols`, `exclude_from_docs`, `exclude_kinds`). The walk returns the same 760 files, in
code-unit order where it was the file system's. With HEAD's three titles read as YAML reads
them, the entries, the package summary and the page index are the same; only
`page-index.json`'s key order differs. End to end, the kit's `c41-prep.mjs` runs HEAD's
`runExtract` and the working one into scratch folders over the real threads (it starts no
agent): the ten batch files and the manifest are byte-identical, `package-summary.txt`
differs by the three ` #` (6 bytes), and `page-index.json` by the six keys that held them
(12 bytes) and by its key order. An unclosed block, a YAML error and a list each throw with
the file's path; a BOM and CRLF parse. The tree comparison is identical in all three trees
(1,461, 1,457 and 137 files).

### C41a — `docs: quote the three statement titles that end in #`

**Found while landing C41.** `Input.md`, `Line-Input.md` and `Write.md` under
`docs/Reference/Core/` have `title: Input #` and the like unquoted, and YAML reads ` #` as
the start of a comment.

**Change.** The three titles are quoted.

**Landed.** As the entry says. No other frontmatter line under `docs/` holds an unquoted
` #`: a grep for a key whose unquoted value contains one finds these three lines only.

**Verify.** The tree comparison differs on all 914 pages online and offline, and on
`book.html`. A word diff of the two kept trees, the Gantt chart's two files left out, finds
nothing but the three titles gaining their `#`: the sidebar's link text on every page, the
three pages' breadcrumbs, `<title>`, meta titles and JSON-LD headline, their entries in the
search data, and their running heads in the book. The page count and the symbol index are
unchanged.

### C41b — `builder: warn about an unquoted frontmatter value that ends in #`

**The owner's request, after C41a.** Nothing told the author of C41a's three pages that YAML
had dropped their `#`. The build warns when a frontmatter value left unquoted ends in `#`,
whitespace after the `#` aside, so the author is reminded to check; quoting the value
always silences it.

**Landed.** `lib/frontmatter.mjs` gains `unquotedHashValues(raw)`, the block's lines whose
value is unquoted and ends in `#`, as `{ line, text }` counted from the opening `---`; it
shares a new private `splitBlock` with `parseFrontmatter`, which is otherwise unchanged. A
key's value, a list item, and a key opening a list item are checked; a comment line, a key
whose value is on the lines below, and the lines of a `|` or `>` block scalar are not, since
a scalar cannot be quoted. A value such as `C#`, which YAML keeps whole, is still reported,
as the rule asks. `discover.mjs`'s `readFrontmatter` prints each as `discover:
<page>:<line>: an unquoted value ends in #, ...` with the line's text, and the build goes on.
`check_code_regions.mjs` gains a module probe (eighteen lines: five reported, among them a
BOM, CRLF, trailing spaces and a list item's key; a quoted value, a quoted value followed by
a bare `#`, a comment, a list of quoted items and a block scalar's lines not) and a
`discover` probe that captures `console.warn` over a real page. Authoring.md's frontmatter
section, Pipeline-Stages.md's `frontmatter` row, Tools.md's section on the gate, WIP.md's
gate row and `lib/README.md` say so.

**Verify.** On today's 912 pages no frontmatter line ends in `#` and none holds a block
scalar, so the build prints no warning. With C41a's `title: "Input #"` put back unquoted and
three spaces after the `#`, a build printed `discover: Reference/Core/Input.md:2: an
unquoted value ends in #, ...: title: Input #` and exited 0. Four faults put into the code
each fail `check_code_regions`: no call in `discover` (the `discover` probe), no block-scalar
skip (line 16 reported), no allowance for trailing whitespace (line 5 missed), and no quote
check (line 18 reported).

### C41c — `wisdom: group reference pages by package, below Default/ and Built-In/`

**Found while landing C41.** `buildPackageSummary` and `buildPageIndex` take the first
folder under `docs/Reference/` as a page's package, and since `58a5e1c` that folder is
`Default`, `Built-In` or `Core`.

**Change.** Both take a page's parts through one `packageParts(path)`, which drops
`docs/Reference/` and then a `Default/` or `Built-In/`.

**Landed.** As the entry says. Wisdom.md already describes `Package > Module` lines and
`Package/Title` keys, so no page changes. The Assert package groups as
`TwinBasicAssertions`, its folder's name, where the last summary written (2026-06-04, from a
tree before the move) said `Assert`; the grouping has always been by folder. Open
questions keeps this, at the owner's request.

**Verify.** The kit's `c41c-oracle.mjs`, HEAD's two functions against the working ones over
one sitemap: the summary goes from three groups to 40, VBA and VBRUN split by module again,
and lists 735 titles where it listed 726, since a title shared by two packages no longer
collapses into one group. The page index goes from 1,492 keys to 1,500, its 740 bare-title
keys and their paths unchanged, and the pages a `Package/Title` key reaches from 751 to 759
of 760, none lost. The kit's `c41-prep.mjs`, HEAD's `runExtract` against the working one:
the batch files and the manifest are byte-identical, and only `package-summary.txt` and
`page-index.json` differ.

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

**Landed.** `runCheck` walks the tree as before, then hands every page to `checkChunk` as one
chunk, each page's `html` a getter that reads the file, so one page is in memory at a time
and the chunk's unique count, fragment-target count and stage timings are the tree's. It
passes the oracle on `env` (`FsOracle`, or `treeIndexFor` over its own listing for `--oracle
index`), then `joinChunks` with the tree's rel paths, the sniffed stubs, and `sitemap.xml` and
`search-data.json` read from disk, and returns `findingsFor`'s view with `counts.unique` filled
in from the chunk. `buildFindings`, the three `*Contents` wrappers, `extractLinksAndIds`,
`relFilesFor` and `statSafe` (inlined as a `try` in `collectHtmlFiles`) go. `check.mjs` pages
are tree-relative; a `walkPath` map turns them back into the walk's paths for the report, so
the report is unchanged. The owner chose that report over `formatReport` (Where the plan was
wrong). `checkChunk` now also returns `stubs` (always empty in the build, whose `TREES` never
set `captureRedirectStub`), `fragmentTargets` and `stages` (with `extract`), for `-v`. The
self-test's guards 1 and 3 now run `runCheck` over its one-page tree, four passes, ~20 ms
instead of <10 ms. Both comments the entry names are rewritten, and so is every sentence that
called the pair two implementations or the script the reference implementation: Tools.md,
Building.md, Extending.md, Builder.md, Pipeline-Stages.md (also `checkChunk`'s and
`findingsFor`'s rows), WIP.Build.md (a heading, which nothing links to), test/README.md,
builder/README.md, `link-check.mjs`'s banner and reporter comment, `check_links_diff.mjs`'s
header and `script` side, `page-baseline.mjs`, a `checks.yml` comment (no step changes), and
`check_gate_lists.mjs`'s note on `checks?`, whose example phrase is gone from the corpus.

Oracle: the kit's `c42-oracle.mjs` runs `runCheck` in 25 cases (the three real trees, an
absolute root, `-v`, the book with and without `--no-fail`, the base-path tree right and
wrong, `check_links_diff`'s hand-written fixture cut from its source in five flag sets, the
two built fixture trees, a subfolder, two inputs, no `--root-dir`, a missing input, only a
missing input, a root without `sitemap.xml`, unknown flags and the three usage errors), each
with the default, `fs` and `index` oracles, plus four CLI runs (`-h`, no arguments, three
passes over `/sep/`, one pass), with timings masked. Against HEAD everything is identical,
the self-test included, but two things: the findings gain `findingsFor`'s `skipped`, which
`check_links_diff` does not compare; and where cross-file issues are printed (the wrong base
path and the root without a sitemap, 13 canonical lines each) they now come sorted by code
unit, as `joinChunks` sorts them, rather than in the walk's order (`tB/Core/LSet.html` now
before `LeftShift.html`); line order only, no line gained or lost. `check_links_diff.mjs --a
script --b fused`: no differences across 6 cases; `--a script --b index`: none across 8, both
`online-abs` identities ok; `--self-test` ok, and with `basePath: ""` passed to `joinChunks`
it fails on guard 1 (`--check-sitemap with --base-path`). Timing on `docs/_site` with `-v`,
HEAD against now: 3.81 s against 3.38 (`fs`), 3.49 against 3.27 (`index`). `compare_trees`:
the trees match. Two cases change and are not covered: an input on another drive than
`--root-dir` on Windows, where a page's tree-relative path is absolute, so `checkChunk`
resolves its links from a folder that does not exist; and a tree whose every canonical-bearing
page is a redirect stub, where `--check-canonical` now warns instead of reporting `[]`.

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

**Landed.** `scripts/lib/gate-probes.mjs` exports `exitOnCrash()`, `createProbes(tool,
onFailure)`, whose `check` records a probe and whose `report()` prints the lines and the
summary and returns the exit code, and `baselineFixture(name)`, which returns the
`withBaseline(initial, fn)` both drift-guard self-tests call. Each does its work when called,
never on import. The three probe gates adopt all three; `check_book_coverage.mjs` passes its
summary's remedy as `onFailure`. `check_symbol_index.mjs`'s fixture now takes `{ src, urls }`
(`BASE_FILE`) and writes it pretty-printed where it was compact, which both guards read with
`JSON.parse`. The temporary folders are `tb-page-baseline-*` and `tb-symbol-baseline-*`
(were `tb-pagebaseline-*`, `tb-symbolbaseline-*`). `exitOnCrash()` replaces the handler in
eleven files: the three gates, `check_publish_policy.mjs` (which keeps its own reporter), C07's
in `convert_em_dash_separators.mjs`, still inside its entry-point guard, and C28's three
(`pick_a11y_sample`, `build_dot_metrics`, `check_tb_registry`); and, at the owner's choice,
the three copies this entry did not name: `check_dot_fit.mjs`, which the others copied,
`check_ci_workflows.mjs` (C03) and `check_lint.mjs` (C06). Where a handler's comment said what
exit 1 means, one line keeps that. Neither `check_gate_lists.mjs` nor `check_regex_safety.mjs`
fits exactly, so neither adopts, and the failed-probe exit code is not a parameter (Where the
plan was wrong). Extending.md's exit-code convention names `exitOnCrash` for a script with no
`main()`, and a sentence after its four probe shapes names `createProbes`. Tools.md's
`check_page_baseline` section now says it exits 2 if it cannot run, as its two siblings'
sections say; the handler was there before.

Oracle: the kit's `c43-oracle.mjs before|after|compare` runs 26 cases: each of the eleven
tools plainly (`pick_a11y_sample`, `build_dot_metrics` and the converter with `--check`,
`check_tb_registry` once each side, 37 s), each through a forced crash (`c43-crash.mjs`, a
preload whose wrapped `process.on` throws from the line that installs the handler), an
import of the converter that counts the `uncaughtException` listeners it leaves (0), and the
three probe gates through a broken probe (`c43-fault.mjs`, a load hook that edits a builder
module's source as it loads: `was ${baseline[k]}` in `page-baseline.mjs`, `is missing` in
`symbol-baseline.mjs`, the `unlisted` push in `book.mjs`). 23 cases are identical, every crash
exiting 2 with `Error: c43 forced crash` and each fault exiting 1 with the same probe failed.
The three differences: lint checks 143 files, the new module among them; and in the page and
symbol faults the detail's continuation lines gain seven spaces, so they stay aligned under
`ERROR:` as the build prints them, the one change the entry expects. No `tb-*-baseline-*`
folder is left in `%TEMP%`.

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

**Landed.** Both tools launch through `withBrowser` from `scripts/lib/browser.mjs`, and
`--allow-file-access-from-files` is gone rather than explained: the host page loads both Inter
faces without it (Where the plan was wrong), so `browser.mjs` is unchanged. The host page is
built in a new `scripts/lib/inter-page.mjs`, whose `openInterPage(browser, name, { css, body
})` writes `docs/_<name>-host.html` with the two `@font-face` rules, loads it, removes it, and
returns the page with its `pageerror` logger; each tool passes only its own styles, and the
two host files keep their names. The page's `<title>` is now the name (`dot-fit`,
`dot-metrics`; was `dot fit`, `metrics`), which nothing reads. `builder/dot.mjs` exports
`listDotSources`, and `check_dot_fit.mjs` maps its sources to the SVGs on disk in place of
`findDotSvgs`, then sorts them as before (a sorted list of `.dot` paths can come out in
another order once each ends in `.svg`, as `a.dot` and `a.e.dot` do). Pipeline-Stages.md's
`dot.mjs` table gains the row. Neither tool's `try` body returned or exited, so moving it into
the callback changed nothing; `build_dot_metrics.mjs`'s `table` is now the callback's result.

Oracle: the kit's `c44-oracle.mjs before|after|compare`, 7 cases: `check_dot_fit` plain and
`--verbose` (their `ok` lines name every SVG found, so they are the listing), with its
tolerance forced to -100 through `c43-fault.mjs` (exit 1, every diagram reported), and through
`c43-crash.mjs` (exit 2); `build_dot_metrics --check`, a regeneration, and a crash. All 7 are
identical before and after, the regeneration leaves `inter-metrics.json` unchanged (sha256
`15d2c7739cde15b2…` both sides), and no run leaves a host file in `docs/` or a Puppeteer
profile in `%TEMP%`. The kit's `c44-noflag.mjs` ran the four plain cases with the flag still
there but turned off, and all four matched; `c44-flag.mjs` prints each face's
`FontFace.status` after a load, `loaded` both ways. With a font URL broken through
`c43-fault.mjs`, both tools exit 2 on `NetworkError` from `document.fonts.load`, so a refused
font stops the run rather than measuring a fallback; `inter-page.mjs`'s header says so.

### C45 — `a11y: one page discovery and stub ceiling for the sampler and the sweep`

**A5-3 / L4-9, A5-4 (R2, R3).** `pick_a11y_sample.mjs` (`:122,159-169,184`, `STUB_CEILING`)
and `sweep_a11y.mjs` (`:78,129-153`, `STUB_TAG_CEILING`) each discover pages, count tags and
apply a ceiling of 100, though `--propose` reads the JSONL the sweep writes, so the two must
agree. `pad` and `median` are identical in both.

**Change.** One discovery, ceiling, `pad` and `median`, in `axe-scan.mjs`, which both already
import.

**Verify.** `pick_a11y_sample.mjs --census` and `--propose` output unchanged; a sweep over two
pages writes records of the same shape.

**Landed.** `axe-scan.mjs` gains a page-discovery section: `STUB_TAG_CEILING` (the sweep's
name; the sampler's `STUB_CEILING` goes), `staticTagCount`, `discoverPages(dir, fields)`,
`splitStubs(pages)` returning `{ content, stubs }`, `pad` and `median`. `discoverPages` reads
each page once and returns `{ filePath, tags, ...fields(html) }` sorted by `localeCompare`, as
the sweep did; the sampler passes its family counts as `fields` (`raw`), so it still reads each
page once, and its pages now come sorted where they came in `readdir` order. The two stub
comments are merged into the ceiling's, in the present tense. Tools.md's `axe-scan.mjs`
section names the shared discovery, and, at the owner's choice, all five scripts that import
the module (it named three, leaving out `pick_a11y_sample.mjs` and `check_axe_patch_equiv.mjs`,
a Found-in-passing item). `builder/PLAN-checks.md`'s open question cites the new name.

Oracle: the kit's `c45-oracle.mjs before|after|compare`: `pick_a11y_sample --census`,
`--propose` (over a copy of `perf/results/a11y-sweep.jsonl`, 3,476 records) and `--check`;
`sweep_a11y --report` over the same copy; and a sweep of the first two `/tB/Core/A` pages,
light and desktop, into a fresh JSONL. The sampler's three runs and the report are identical,
so its new page order changed no tie. The two-page sweep writes the same records, `runMs`
masked, and its output differs only in the per-page time column.

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

**Landed.** `lib/repo-paths.mjs` exports `REPO_ROOT`, from its own URL, and `DOCS_DIR`, the
one path several tools built from it; every other path built from the root is built by one or
two tools and stays with them. Twenty-six files take the two from it: the review's nineteen;
`check_regex_safety.mjs`, which was there at `fe9ce12b` and missing from the count;
`check_ci_workflows.mjs`, `check_lint.mjs`, `compare_trees.mjs` and `survey_tooling.mjs`,
added since, the last keeping its own `ROOT`, now `--root` or `REPO_ROOT`; `inter-page.mjs`
(C44); and `axe-scan.mjs`, which imports the root and re-exports it with `export { REPO_ROOT
}` for `pick_a11y_sample.mjs` and `sweep_a11y.mjs`, whose imports are unchanged. Local names
follow the exports: `REPO`, `ROOT` and `PROJECT_ROOT` become `REPO_ROOT`; the docs folder's
`ROOT` (`check_code_regions.mjs`, `convert_em_dash_separators.mjs`), `SRC` (`check_dot_fit.mjs`)
and `DOCS` (`check_examples.mjs`, `inter-page.mjs`) become `DOCS_DIR`; and
`gen_attribute_probes.mjs`'s `DOCS`, which held `Attributes.md`'s path, becomes `ATTR_DOC`, as
in `census_attributes.mjs`. Left alone: `perf/`, outside the review's scope; `impexp.mjs`'s
self-test path to `indexer/`, since the script is a download that must stand alone;
`check_publish_policy.mjs`'s working-directory `docs` default, a behaviour change, which
Extending.md names as the one gate that does not; and paths relative to a module that are not
the root (Wisdom's data folders, `builder/`'s vendored assets, `test/addin/`'s `HERE`).
Extending.md states the convention as it now is, `lib/README.md` names the module, and
WIP.md's sentence on `check_code_regions`' sweep names `DOCS_DIR`. The mechanical edit was a
Sonnet agent's (177 calls, ~207k, 12 min), reviewed line by line.

Oracle: the kit's `c46-oracle.mjs` takes each of the 32 root and docs constants HEAD defined
in the 26 files, evaluates it as HEAD wrote it for that file's own URL, and compares it with
the exports: all 32 equal, byte for byte (the two `Attributes.md` paths as `DOCS_DIR` plus
`\Reference\Attributes.md`). `c46-tools.mjs` runs each touched tool's cheapest mode from a
HEAD worktree and from the working tree, both roots masked: `check_examples --census`,
`nav_hops`, `site_search --site`, `run_case --prompt-only` over a `build_corpus` corpus,
`survey_tooling --summary` (each tree measured by both scripts), `gen_attribute_probes` (135
files) and `convert_em_dash_separators --check` give the same exit and output, and
`site_search`'s default `--site` answers as the explicit one does. `build_corpus`'s corpus
differs only in the three files this commit changes and in untracked local output that the
worktree lacks; it holds `wisdom/.token` as the stub every unlisted file type gets, not the
token. Wisdom's prep step, the kit's `c41-prep.mjs`, writes the same files. The tree
comparison differs only in Extending.md's page, online and offline, the search index and
`book.html`. Not run: `addin_test`, `build_dot_metrics`, `build_package_api`,
`census_attributes` and `check_links_diff`, whose changed lines are the constants above; Biome's
`noUndeclaredVariables` over the 26 files names none of the renamed identifiers.

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

**Landed.** `lib/cli.mjs` exports `parseCli`, `CliError`, `numberOption`, `withUsageError` and
`printHelpAndExit`. `parseCli(argv, { options, positionals, unknown, acceptsValue })` takes
options in `parseArgs`' shape and returns `{ values, positionals, tokens, ignored }`: values
keyed in camelCase; an absent option its `default`, a `multiple` one `[]`, any other none; a
repeat keeps the last; `tokens` the kept options (each with its `key`), positionals and `--`,
in order, for `tbdocs`' order-dependent resets. `parseArgs` runs loose and the module makes a
strict parse's checks itself, because a strict parse stops at the first unknown option and a
loose one alone takes a trailing value flag as `true`; with the defaults the two agree on 64
argument lists (a probe). A tool's leniency is two parameters, each use of which Phase 3
removes. `unknown` is `"error"`, `"ignore"` (an unknown option, a boolean given a value and a
positional beyond `max` go into `ignored`, as given: the `includes` and `opt()` tools, and the
list `check_links` warns about) or `"positional"` (an unknown option becomes a positional as
given, and counts: `nav_hops`, `site_search`, `tbrun`, `gen_attribute_probes`); a value flag
with no value is refused under all three. `acceptsValue(value, inline)` defaults to the strict
rule (a separate value may not be missing or start with a dash and one more character; any
inline value is taken; `-` and `""` are values); the survey's other guards are `(v) => v !==
undefined` (`check_links`), `Boolean` (the a11y family's truthiness test), `(v) => v !==
undefined && !v.startsWith("--")` (`compare_trees`) and `() => true` (no guard, which stores
`undefined` for a trailing flag and skips its default). A `CliError` has a `code`
(`unknown-option`, `unexpected-value`, `missing-value`, `unexpected-positional`,
`missing-positional`, `bad-number`), `option` as typed, `arg` and `value`; its default
messages are `unknown option: X`, `--x needs a value` (the majority wording), `--x takes no
value`, `unexpected argument: X`, `expected at least N argument(s), got M` and `--x expects a
whole number from 1 to 65535, got: 0`. `numberOption(value, { option, integer, min, max,
message })` refuses blank text, which `Number` reads as 0. `withUsageError(fn, { stream,
exitCode = 2, format, exit })` prints `format(err)` with one newline and exits, and throws
anything but a `CliError` on; `printHelpAndExit(text, { stream = "stdout", exitCode = 0, exit
})`. A `stream` object with a `write` and an `exit` are the probes' hooks, which no tool needs.

`scripts/check_cli.mjs` holds 36 module probes and 14 cases, 50 checks in 0.6 s. A case is `{
tool, args, exit, stdout, stderr }`: a string is the whole stream, a RegExp must match, and a
stream not named must be empty. The tool's own words for the error are pinned exactly, a usage
text after them by its opening. Each case runs in an empty folder of its own, with `TB_IDE` and
`PUPPETEER_EXECUTABLE_PATH` naming missing files and `TBBUILD_SHOW` removed, 30 s at most,
`availableParallelism()` at once. C47 records C18's settled behaviour (`tbdocs`: a trailing and
a dash-led missing value, `--port=0` and an unknown argument, exit 4 on stderr; `check_links`:
a trailing missing value for `--root-dir` and `--forbid`, exit 4, `error: ` on **stdout**) and
C17's (`tbbuild`, `check_examples`, `census_attributes`, `build_package_api`: a trailing and a
dash-led missing value, exit 2, `tbbuild`'s usage line matched by its opening).

Measured: Puppeteer 25.0.4 honours `PUPPETEER_EXECUTABLE_PATH`; `check_dot_fit` and
`check_axe_patch_equiv` exit 2 in about 0.3 s ("Tried to find the browser at the configured
path"). The kit's `c47-faults.mjs` puts one fault at a time into the gate or the module as it
loads (the `c43-fault.mjs` preload) and counts twinBASIC and Chromium processes, none before or
after. A changed exit code, a changed message and a message moved to the other stream each fail
their case alone (1 of 50); the value rule loosened to a loose parse's fails 2 probes, the
comparison with `parseArgs` among them; unknown options accepted fails 6. Cases forced past the
command line fail on their own message: `check_examples --jobs 2` runs its 119 probes and stops
on "no compiler beside the IDE" (1.1 s), `census_attributes --out x.json` on "no packages/
under", `tbdocs --port 4000` exits 1 with "task config failed" (0.5 s; its default `docs` is
relative to the empty folder), `tbbuild` on "no such project". `check_gate_lists` passes, and
`check_ci_workflows` counts 14 gates where it counted 13 (it leaves out `check_tree_fresh`,
which CI does not run). Registered in `test.bat` after `check_symbol_index`, the
composite action, Tools.md's list, POSIX block and a section, Building.md's POSIX block,
WIP.md's table and bullet, and `lib/README.md`. CI waits for the push, where the four harness
tools and `tbdocs` run on Linux for the first time, each only as far as its error.
`build.bat`, `check.bat` (the a11y line unchanged) and `test.bat` exit 0, and the tree
comparison differs only in Tools.md's and Building.md's pages, online and offline, the search
index and `book.html`.

For C48–C52:
- `opt()` in `tbbuild`, `check_examples`, `census_attributes`, `build_package_api` and
  `addin_test` finds its flag with `indexOf`, so a repeated flag keeps its **first** value;
  `parseCli` keeps the last, as `parseArgs` does (read, not run; `tbrun`'s `opt` not read). The
  survey's "every other repeat: last wins" is wrong for these. A repeat does not stop the tool,
  so `check_cli` cannot hold it; C49 decides.
- `check_tb_registry` reads no arguments, and C49's entry now says so; C50's names `check_lint`
  and `compare_trees`, which no entry did; C51's counts five `eval/` scripts.
- A migration adds its tools' cases to `CASES`, with a comment naming the commit, and runs the
  gate against the unedited tool before the edit.
- Found in passing, not fixed: a launch refused for a missing browser leaves a Puppeteer profile
  folder in `%TEMP%`, since `ChromeLauncher` makes it (`ChromeLauncher.js:77`) before it
  resolves the executable (`:87`), and `withBrowser` removes only the profile of a browser it
  got. Only a case that gets past its command line reaches it here.
- Building.md said "all ten gates" where there were 14 before this commit, and
  `check_gate_lists` did not report it; it now says "all the gates", as that gate advises.

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

**Landed.** All eight parse through `parseCli`. The six with a loop take `acceptsValue:
Boolean`, which is their truthiness test (a missing or empty value is an error, a following
flag is taken as the value), and `withUsageError` with `format: (err) => \`unknown arg:
${err.arg}\``, since the loop printed every refused argument as given; positionals stay at 0.
The loops answer `--help` and fingerprint's `--list` on the spot, so an error before them wins
and nothing after them is read: `lib/cli.mjs` gained `stopAt` for this, with `stopped` in the
result and three probes. `help` (short `h`) is in `stopAt` in the five that answer it, and each
prints its usage unchanged through `printHelpAndExit`, to stdout (`check_a11y_fingerprint`,
`check_axe_patch_equiv`, `check_tree_fresh`) or stderr (`pick_a11y_sample`, `sweep_a11y`);
`check_a11y` has none and still refuses `--help`. `pick_a11y_sample`'s mode is the last of
`--check`, `--propose` and `--census` in `tokens`; numbers are still read by `parseInt` and
`parseFloat`. `check_dot_fit` and `build_dot_metrics` declare their one boolean with `unknown:
"ignore"`, which cannot throw. The edit was a Sonnet agent's (43 calls, ~192k, 10.6 min),
reviewed line by line; it gave the booleans `default: false`, so each value is a boolean.

The cases were recorded from the unedited tools first: 25 across six tools (`--help`, an
unknown flag, a trailing and an empty value, `--theme`/`--viewport` refused by C20's check);
the two diagram tools ignore every argument and have none. `check_cli` now makes 78 checks, 39
probes and 39 cases. The kit's `c48-tools.mjs` writes HEAD's copy of each tool beside the real
one (`scripts/c48-head-<name>.mjs`, removed at the end) and runs both on 20 real invocations:
the same exit and output on all 20, but for a stack-trace line number in one that fails alike
on both (`--pages --list`, which takes `--list` as the page list). It covers the modes' order
(`--propose --check` is check, `--check --census` census), `--help --bogus` against `--bogus
--help`, `--list --bogus`, a flag taken as a value, `check_dot_fit` and `build_dot_metrics
--check` with stray arguments, and `check_tree_fresh` with `--tree` twice. A HEAD worktree
does not serve here: it lacks `node_modules/axe-core` and `perf/results`, which these tools
read through `REPO_ROOT`.

What differs, none of it a recorded case: `--name=value` is accepted (departure 9); after
`--` an argument is a positional, so `check_dot_fit -- --verbose` is no longer verbose; and a
short-option group is split into its letters, so `-hx` prints the usage where the loop said
`unknown arg: -hx`. `build.bat`, `check.bat` (the a11y line unchanged, run by the migrated
`check_tree_fresh`, `check_dot_fit`, `pick_a11y_sample --check` and `check_a11y`) and `test.bat`
exit 0.

### C49 — `scripts: the harness tools parse through lib/cli.mjs`

**A7-5 (R2)'s `die()` half, and L1-2's copies.** `tbbuild`, `tbrun` and `addin_test` each
have a `flag()` and `opt()` pair and a `die()`, in three shapes (V3's fifth note);
`check_examples`, `census_attributes`, `build_package_api`, `gen_attribute_probes` and
`check_tb_registry` parse by hand as well.

**Change.** All seven through `parseCli`, keeping today's behaviour, C17's fixes included;
`tbrun` and `addin_test` still substitute their default for an empty value until C72.
`check_tb_registry` reads no arguments (C47 found), so nothing of it migrates.

**Verify.** `check_cli.mjs`'s cases; the `examples.bat` summary and `addin-test.bat`
unchanged (harness runs, one at a time).

**Landed.** All seven parse through `parseCli`. `tbbuild`, `check_examples`,
`census_attributes` and `build_package_api` take the default `acceptsValue`, which is their
old check for a value flag with no value, and print a `CliError` through `withUsageError`:
`tbbuild` the message and then its usage line, `check_examples` with its `check_examples: `
prefix, the other two the message alone, all on stderr with exit 2. Their number checks
(`positive`, `positiveInteger`) stay in the tools, and so does the order: `tbbuild` and
`check_examples` check their numbers before `--help`. `tbrun` and `addin_test` take
`acceptsValue: () => true` and read each value as `values.x || default`, which keeps their
truthy test until C72: a value flag at the end of the list, or given `""`, gets its default,
and any other argument after it is its value. All six ignore an unknown flag (`unknown:
"ignore"`); `tbbuild` and `tbrun` take one positional (`max: 1`), a second one ignored as
before. `gen_attribute_probes` takes `unknown: "positional"` with no maximum, since every
argument after its second is ignored. `check_examples` prints its help through
`printHelpAndExit` (the same bytes: the text has no final newline); `census_attributes` still
prints the slice of its own header comment with `console.log`; `build_package_api` still has
no `--help`. The survey's list for `check_examples` lacked `--show` and `--hide`, which it
passes on to `tbbuild`; they are in its table. The edit was a Sonnet agent's (65 calls,
~275k, 18.6 min), reviewed line by line; one comment lost a dangling "too".

The cases were recorded from the unedited tools first: 28 across the seven (`--help` in each
shape, a number refused, a dash-led value, a bad `--arch`, a number error before `--help`,
the project after an unknown flag, `tbrun`'s value flag taking the source folder, a trailing
and an empty value given the default, `build_package_api --help` ignored,
`gen_attribute_probes` with no argument). `census_attributes --help` prints its header with
the checkout's line endings, so its case allows `\r`. Some cases stop at the first check of
what the command line names (a project, a source folder, an install), which is where a
default or a positional shows; Tools.md's `check_cli` section now says a case may. `check_cli`
now makes 106 checks, 39
probes and 67 cases. The kit's `c49-tools.mjs` (`c48-tools.mjs`'s shape, HEAD's copies
beside the real tools) runs 35 real invocations that start no IDE: `tbbuild` and `tbrun`
stopped at the project, Settings or IDE check with every option given, `addin_test` at the
IDE check and at a lane filter matching nothing, `check_examples --census` in four forms,
`--report` and `--help`, `census_attributes` over the warm BETA 987 cache, `build_package_api
--check`, and `gen_attribute_probes` writing two probe trees, compared by hash. 29 are the
same. Four differ as recorded below. `addin_test --only "("` crashes alike on both, the stack
trace's line number moved (75 to 88). `census_attributes --help` differs only in `\r`: HEAD's
copy is written from the LF blob and the tool prints its own file; the two slices are equal
without it. The harness bar is unchanged from the BETA 987 baselines: `examples.bat` exit 0
after 126.3 s, `1129 sample(s), 1129 compile, 0 finding(s), 124.0s -- clean`;
`addin-test.bat` exit 0 after 129.8 s, `10 of 10 lane(s) ran: 10 passed`, `registry: put
back (20 project-state, 21 recent-list and 3 association writes)`, the kit's registry
snapshots identical before and after. `build.bat`, `check.bat` (the a11y line unchanged)
and `test.bat` exit 0, and the tree comparison differs only in Tools.md's page, online and
offline, the search index and `book.html`.

What differs, none of it a recorded case: a repeated flag keeps its last value in `tbbuild`,
`check_examples`, `census_attributes`, `build_package_api`, `addin_test` and `tbrun`, whose
`opt()` also used `indexOf` (departure 9, at the owner's choice; `--census --jobs 3 --jobs
0` now refuses the 0); `--name=value` is accepted (departure 9; `--only=Reference/Core`
now filters); after `--` an argument is a positional, and `--` itself is not one; a
single-dash argument is an unknown short option, so `tbbuild -x proj.twinproj` builds
`proj.twinproj` where it said `not a .twinproj: -x`; and in `tbrun` and `addin_test` a flag
taken as another flag's value (`--port --json`) no longer also counts as itself.

Found in passing, not fixed: `census_attributes`' `--dump-sites <file>` is in neither its
header comment nor its `--help`, which prints that comment; its help's first line is empty,
since the slice starts at a bare `//`.

### C50 — `scripts: the gates and link tools parse through lib/cli.mjs`

**Decision (e); L1-2's fourth variant.** The rest of `scripts/`.

**Change.** `check_links.mjs`, whose collect-and-warn handling of unknown flags stays custom
code until C72; `check_links_diff.mjs`; `crawl_check.mjs`; `check_publish_policy.mjs`, whose
inline `opt` is L1-2's fourth variant; `check_regex_safety.mjs`, with its internal `--shard`
flag; `check_code_regions.mjs`; `check_gate_lists.mjs`; `convert_em_dash_separators.mjs`;
`survey_tooling.mjs`; and two no entry named until C47: `check_lint.mjs`, whose argument list
must be `--staged` or nothing, and `compare_trees.mjs`, which passes what follows `--` to
`tbdocs`. Each keeps today's behaviour.

**Verify.** `check_cli.mjs`'s cases; `test.bat` and `check.bat` unchanged;
`check_links_diff.mjs --a script --b fused` agrees.

**Landed.** All eleven parse through `parseCli`. The four that read their flags with
`includes` (`check_regex_safety`, `check_code_regions`, `check_gate_lists`,
`convert_em_dash_separators`) and `check_publish_policy` take `unknown: "ignore"`;
`check_publish_policy` reads `--src` with `acceptsValue: () => true`, so given last it is
still undefined. `check_links` takes `acceptsValue: (v) => v !== undefined` (its old `need()`)
and `unknown: "ignore"`, and turns a missing value back into `--x requires a value`; its
warning list is rebuilt from the kept tokens' indexes, because an unknown `--flag` without
`=` takes the positional after it along, which parseArgs makes an input. `check_links_diff`
and `crawl_check` take `acceptsValue: () => true` (a value flag takes whatever follows, and
given last is `undefined`, `NaN` once read as a number) and turn every `CliError` into their
own words, `unknown argument: X` and `unknown flag: X`. `compare_trees` splits its list at the
first `--` before parsing, which is exactly where its loop stopped, and parses the rest with
its old value guard as `acceptsValue` and `stopAt: ["help"]`. `check_lint` refuses any error,
and more kept tokens than `--staged` accounts for. `survey_tooling` moves off `node:util`'s
strict parse onto `parseCli`'s, at the owner's choice (2026-09-27): its three parse errors
now read `unknown option: --bogus`, `unexpected argument: x` and `--root needs a value` where
they were node:util's words, still followed by its usage line. The edit was a Sonnet agent's
(82 calls, ~280k, 33.9 min), reviewed line by line; two of its comments described the old
loop, one of them wrongly, and one repeated an old reason that is no longer true (`check.bat`
passes no arguments to `check_links`); all three were rewritten.

The cases were recorded from the unedited tools first: 39 across seven tools (`check_links`'
unknown flag taking its positional and a value flag taking a following flag;
`check_links_diff`'s refusals and its same-sides stop; `crawl_check`'s refusals, `--help`
among them; `check_publish_policy --src` given last; `survey_tooling`'s refusals, pinned by
their line and the usage after it, and its number checks; `check_lint`'s whole list;
`compare_trees`' refusals, `--` included). The other four ignore every argument and have none.
`check_cli` makes 145 checks, 39 probes and 106 cases. The kit's `c50-tools.mjs` runs 22 real
read-only invocations through HEAD's copies and the migrated tools: three `check_links` runs
over the built site with every kind of flag and a `/sep/` segment (56 MB of output each,
identical), `check_links_diff --self-test` and `--list`, `crawl_check` against a port with
nothing listening, both modes of the four gates, `convert_em_dash_separators --check`,
`survey_tooling` in two forms, `check_lint` both ways and `compare_trees --max 2 -- --no-pdf`.
All are the same but `survey_tooling --bogus`, whose words change as above.
`check_links_diff --a script --b fused` reports `No differences across 6 case(s)`, and
`build.bat`, `check.bat` (the a11y line unchanged) and `test.bat` exit 0.

What differs, beyond `survey_tooling`'s words and none of it a recorded case: `--src` given
twice keeps the last (departure 9); `--name=value` is accepted for a known flag; after `--` an
argument is a positional, outside `compare_trees`, and `--` is no longer an unknown argument
in `check_links`; a short-option group such as `-vh` is split; a lone `-` is a start URL to
`crawl_check`; `compare_trees --max x --bogus` reports the unknown argument where it reported
the bad number.

### C51 — `book, eval, wisdom: parse through lib/cli.mjs`

**A10-1, L1-12 (R3).** `render-book.mjs:204-225` parses by hand and rejects `--help`;
`eval/`'s four parsers differ on unknown arguments and exit codes, and `transcript.mjs:190-198`
exits 1 on a bare `--help`; "usage, then an exit code chosen by whether help was asked" is
repeated six times across `eval/` and `wisdom/`.

**Change.** `render-book.mjs` and the five `eval/` scripts (the four parsers and
`transcript.mjs`) through `parseCli`, with
`printHelpAndExit` replacing the six copies, each keeping today's behaviour. `wisdom.mjs`'s
subcommands need code the module does not have, so it migrates only if the fit is clean, and
otherwise stays as it is with a comment saying why.

**Verify.** `check_cli.mjs`'s cases; `book.bat` renders; each `eval/` script's cheapest mode
unchanged.

**Landed.** All seven tools the entry names, and `eval/search_quality.mjs`, parse through
`parseCli`. `search_quality` came in with the merge of PR #210, after this entry was written,
and the owner added it to this commit (2026-09-27). `wisdom.mjs` fits cleanly, so it migrated:
its command is its first argument, whatever that is, and the rest is parsed against one table
for all three commands, as its loop did. Every tool takes `acceptsValue: () => true`, since each
value flag took whatever followed it, and converts a value (`path.resolve`, `Number`,
`parseInt`, `parseFloat`) only when one was given, so a trailing value flag still fails where
it did: a path `TypeError`, a `NaN`, a `split` of undefined. `render-book` (`unknown arg: X`,
exit 2), `build_corpus` (`unknown argument: X`, exit 1), `run_case` (`unknown argument: X`,
exit 2), `search_quality` (`unrecognised argument: X`, exit 1) and `wisdom` (`Unknown option:
X`, exit 1) refuse through `withUsageError`. `nav_hops`, `site_search` and `transcript` take
`unknown: "positional"`, because an unknown flag was a pattern, a search term or an ignored
argument to them. `printHelpAndExit` replaces the six usage-then-exit copies (five in `eval/`,
and `wisdom`'s dispatch default, on stderr), each keeping its exit-code condition, and prints
`search_quality`'s help. `transcript` declares `--help` without `-h`, because a lone `-h` was
its file argument: until C71, `-h` alone exits 0 and `--help` alone exits 1. `build_corpus`
threw on an unknown argument, so Node printed its stack; it now prints the line, still exiting
1. `render-book`'s usage line for a missing input or output is an error, not one of the six,
and is unchanged. The edit was a Sonnet agent's (49 calls, ~236k, 22 min), reviewed line by
line; one comment was rewritten.

The cases were recorded from the unedited tools first: 73 across the eight. They cover
`render-book`'s refusals, `--help` among them, and a value flag taking a dash-led value. For
each `eval/` tool they cover its usage both ways, its refusals or its taking an unknown flag,
and a value flag given last. They also cover `transcript`'s exit codes for `--help` and `-h`,
and `wisdom`'s usage for no command, `--help` and an unknown command, and its refusals after a
command. Every `wisdom` case gives the command `bogus`, so a broken parse can only print the
usage, never start an export. A crash's stream is pinned by the line that names the problem,
allowing `\r?\n` for Node's own report. Tools.md's `check_cli` section says so now, adds a
file to what a case may stop at, and says the gate takes a few seconds (2.8 s before this
commit, 4.5 s after). The `site_search` cases were recorded before PR #210's merge rewrote
much of that file and pass on both. `check_cli` makes 218 checks: 39 probes and 179 cases.
The kit's `c51-tools.mjs` runs 26 real invocations through HEAD's copies and the migrated
tools, and compares the exit code, the masked output and every file written. The
invocations: `render-book` stopping at a missing input and a missing extra script, and one full
`book.bat` render per side, compared by page count and `pdftotext`; `build_corpus` over a
fixture and over the whole repository; `run_case --prompt-only` for both protocols and
`--smoke`, and its refusal of a corpus holding `CLAUDE.md`; `nav_hops` three ways, one over
that corpus; `site_search` four ways; `search_quality` over the full query set with `--save`
and with `--compare` (not `--sample`, which draws its queries at random, so no two runs
agree); `transcript` over a made-up session; `wisdom` with no command, `process` into scratch
whole and filtered by `--since`, `--force` and two `--channel`s, and `extract --dry-run` three
ways. All are the same. The kit's `c27-compare.mjs` reports all 21 of its export cases the
same. `build.bat`, `check.bat` (the a11y line unchanged) and `test.bat` exit 0.

What differs, none of it a recorded case: `--name=value` is accepted for a known flag. After
`--`, an argument is a positional and `--` is not one, so `wisdom extract --` runs `extract`
and `build_corpus --dest x --` builds, where both refused the `--`. A lone `-` is
`render-book`'s input. A short group is split, so `nav_hops -hx` prints the usage. And
`render-book -ofile` and `-t5` take the attached value.

### C51a — `scripts: check_cli's transcript -x case passes on Linux`

**Found by CI after C51.** The fork's deploy runs of C51 (36345344000) and of the search
commit after it (36347252812) failed at `check_cli`, 1 of 218, on `transcript -x`. The case
required a folder before the file name in Node's `ENOENT` line, which Node prints on Windows,
where it resolves the path, and not on Linux, where it prints `open '-x'` as given.

**Change.** The folder is optional in the case's pattern, and the C51 block's comment says
why.

**Landed.** As the entry says. The new pattern matches CI's line and a resolved Windows or
POSIX path, and refuses `--x` and `a-x`; `check_cli` makes 218 checks, all passing, and lint
is clean. The other 217 passed on Linux in both runs, so this is the whole of what CI found.
The steps after `check_cli` in the composite action did not run in either, so
`check_dot_fit`, `check_axe_patch_equiv` and the accessibility steps wait for the next push.

### C51b — `scripts: the gate roster reads node --test lines; CI runs the search tests`

**Found while landing C51a.** PR #210 put `node --test test/search.test.mjs` into `test.bat`,
and CI has never run it: `scripts/lib/gate-roster.mjs` read only `node scripts/<name>.mjs`
lines, so `check_ci_workflows` and `check_gate_lists` did not see the step, and neither the
composite action nor Tools.md's list had it.

**Change.** The roster reads `node --test test/<name>.mjs` as a gate too, named by its path
from the repository root (`gateName`), and `check_gate_lists` reads such a name in Tools.md's
list (a `test/` link) and in a POSIX block. The composite action runs the tests after
`check_lint`, as `test.bat` does; Tools.md lists them as `test.bat`'s fifth step, with a
section of their own, and Building.md's POSIX block and WIP.md's bullet and gate table have
them.

**Landed.** As the entry says, at the owner's choice of registering the step fully over
adding it to CI alone. Before the action and the pages had it, both gates failed on the real
tree: `check_ci_workflows` with a `missing` finding for `test/search.test.mjs` in each
workflow, and `check_gate_lists` with six disagreements (the list, the stated count, both
POSIX blocks, and Tools.md's "Eleven steps" and "of the eleven"). After, `check_ci_workflows`
passes with 19 probes and 15 gates, and `check_gate_lists` with 21 probes and `test.bat
(12)`. The new probes: in `check_ci_workflows`, a test file in `test.bat` and not in CI, and
one in both; in `check_gate_lists`, a test file the docs do not list, with a count that agrees
with the list unless the file is read, and a test file listed by its path, CRLF and a
backslash in the wrapper. Each fault through the kit's `c43-fault.mjs` fails: a roster that
reads no test line fails a probe in both gates; a doc list that reads no `test/` link fails
the new negative; POSIX blocks that read no test line split Building.md's and Tools.md's
blocks in two. The last is caught by the real tree only, as every POSIX-block defect is.

Found in passing, and fixed here at the owner's choice: Tools.md said eight of `test.bat`'s
eleven gates could not be affected by an edit under `docs/` and named two exceptions;
`check_lint`, which lints `docs/assets/js/`, was the third. It now says nine of twelve, and
names all three. The search tests read `builder/`, `builder/vendor/` and `eval/` only.

**CI must show**, on the owner's next push: `check_ci_workflows: 19 probes, all pass` and
`both workflows run the wrappers' 15 gates`, and the new step passing on Linux with `tests
67` and `pass 67`.

### C52 — `builder: tbdocs parses through lib/cli.mjs`

**A1-8 (R3), last, as decision (e) says.** `tbdocs.mjs`'s parser (`:91-194`) is neither
exported nor tested, and `--no-check` resets other flags, so order matters.

**Change.** The option table moves out of `tbdocs.mjs` into a module that exports it. The
order-dependent resets read `parseCli`'s tokens in order. `--name=value`, which today works
for only some of its flags (L1-10), then works for all of them.

**Verify.** `check_cli.mjs`'s cases for `tbdocs`, C18's exit value and the `--no-check`
ordering included; the tree comparison identical; `build.bat`, `serve.bat` and the CI build
steps behave as before.

**Landed.** The new `builder/command-line.mjs` exports `OPTIONS`, `DEFAULTS` and
`parseCommandLine(argv)`. It reads the command line through `parseCli` with the defaults ---
`unknown: "error"`, no positionals, the strict value rule --- and then applies each option
token in the order given, so `--no-check` undoes only the check flags before it, the last of
`--fetch-assets` and `--no-fetch-assets` wins, and each `--port` and `--stall-timeout` is
checked where it stands. A `missing-value` error keeps `parseCli`'s words, which were
already `tbdocs`'s (`--dest needs a value`); every other refusal is `Unknown argument:
<arg>`, the argument as given, so `-xy` and `--dry-run=1` read as before. `--port` goes
through `numberOption` with `tbdocs`'s message; `--stall-timeout` keeps a hand check,
because `numberOption` refuses the blank value that `--stall-timeout=` gives, and that
disables the watchdog. `main()` parses through `withUsageError` with exit 4, and its `catch`
still exits 4 on write.mjs's `--dest` refusal; `commandLineError` is gone, since nothing
else built one. The result is today's object, key for key, with `fetchAssets` still absent
unless given. Pipeline-Stages.md has the module's export table, and a `stallTimeoutMs` row
the `BuildOpts` table lacked; Builder.md's module map has a row; Tools.md's synopsis gains
`--stall-timeout`, which it lacked, and says a value may be given as `--flag=value`.

The oracle, in four parts. Cases first: 26 recorded from the unedited tool (with C47's four,
30 for `tbdocs`), among them every missing-value shape, `--dest --`, `-xy`, `--help`, a
boolean given a value, four bad `--port` values and a bad one before a good one, three bad
`--stall-timeout` values, and write.mjs's two `--dest` refusals, pinned by patterns since
the paths are the case's folder. Ten probes of `parseCommandLine` in `check_cli` for what no
case can reach, since each list starts a build: the defaults, `--no-check` before and after
the check flags, `--check-audit-index` after `--no-check`, both orders of each pair,
`--stall-timeout=` as 0, seconds as milliseconds, `--name=value` for four value flags, and
the two negations. `check_cli` makes 254 checks, 49 probes and 205 cases, in about 6 s (4.5 s
before). Five faults put into the module through the kit's `c43-fault.mjs`, also in
`NODE_OPTIONS` so the cases' children load them (`c52-faults.mjs`), each fail it: a
`--no-check` that keeps `auditIndex` (one probe), `parseCli`'s words for a refusal (ten
cases), `--stall-timeout` allowing -1 (one case), `--port` unchecked (seven cases and a
probe), and the first of the fetch pair winning (one probe). The kit's `c52-oracle.mjs` cuts
HEAD's parser out of `git show` and compares it with `parseCommandLine` over 76 argument
lists --- `build.bat`'s with flags a person adds, `serve.bat`'s, both workflows' builds (the
deploy's with an empty `--baseurl`, as a custom domain gives), `check_links_diff`'s and
`compare_trees`' spawns, the cases and the probes' lists: 70 are the same, and the 6 that
differ are the three differences below. `compare_trees`: only Builder.md, Pipeline-Stages.md
and Tools.md, the search index and `book.html` differ, online and offline. A test serve
(`--serve --port 4393 --dest=docs/_serve-c52 --stall-timeout=60`) built 914 pages and served
them. `build.bat`, `check.bat` (the a11y line unchanged) and `test.bat` exit 0.

What differs, none of it a recorded case: `--check-findings=x` and `--symbol-gaps=x` are
accepted (L1-10, the point of the entry); `--` is no longer refused, and an argument after it
is refused under its own name (`--src docs -- x` prints `Unknown argument: x`), as in every
tool C51 migrated; and a bad `--port` or `--stall-timeout` value followed by a parse error
now reports the parse error, since values are checked after `parseCli` returns. All three
still exit 4.

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

**Landed.** `builder/url.mjs` exports `absoluteUrl(url, config)`, `relativeUrl(url,
baseurl)`, `normalizeBaseurl`, `encodeSpaces` and `splitFragment`, and every copy is gone:
`seo.mjs`'s two helpers with its `ensureLeadingSlash` and `isAbsoluteUrl`, `template.mjs`'s
three, `search.mjs`'s `encodeSpaces`, `book.mjs`'s `normalizeBaseurl` with its comment about
the Ruby plugins, `offline-rewrite.mjs`'s exported one (its three importers,
`cpu-worker.mjs`, `offline.mjs` and `tbdocs.mjs`, now import `url.mjs`), and the two
`splitFragment`s, `crawl_check.mjs`'s included. `redirects.mjs` and `sitemap.mjs` import
`absoluteUrl` from `url.mjs` instead of `seo.mjs`. `relativeUrl` is `template.mjs`'s, which
is the only caller: no forced leading slash, spaces encoded, `baseurl` used as given, `""`
for a non-string. `absoluteUrl` treats a network-path reference `//host` as absolute, like a
scheme, gives `""` for a non-string (what Liquid prints for Jekyll's nil), normalises
`config.baseurl`, and reads a path from the site root, with or without its leading slash: its
result is a URL on the site, and `new URL(siteUrl + "a/b")` gave `https://docs.twinbasic.coma/b`.
That is the one place a forced leading slash is needed. Pipeline-Stages.md has `url.mjs`'s
export table, drops the two rows from `seo.mjs`'s and the one from `offline-rewrite.mjs`'s
(which said the opposite of what the function does, "the canonical trailing-slash form"), and
Builder.md's module map has a row.

`compare_trees`: all three trees identical, and identical again with `-- --baseurl /docs`.
The kit's `c53-oracle.mjs` cuts HEAD's three helpers out of `git show` and runs them beside
`url.mjs`'s over 12 inputs, 2 site URLs and 5 base URLs (288 comparisons). `relativeUrl`
matches `template.mjs`'s on every one. The 94 that differ are all `absoluteUrl`, in six
kinds: a non-string (`null` or `"/5"` before, `""` now), `//host` (the base URL or site URL
put in front before), a path without a leading slash in `template.mjs`'s (`#x`, `a/b`), a
base URL of `/docs/` or `docs` in `template.mjs`'s (`/docs//a/`, `docs/a/` before), a space
in `seo.mjs`'s when there is no site URL, and an empty path under a base URL, now the base
URL's root, `/docs/`. None is an input any call site passes, as the tree comparisons show.
`build.bat`, `check.bat` (the a11y line unchanged) and `test.bat` exit 0.

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

**Landed.** `builder/escape.mjs` exports `escapeMarkup` (`&`, `<`, `>`),
`escapeMarkupAndQuotes` (those and `"`, `'`) and `escapeRegExp`, and every copy is gone:
`render.mjs`'s three, `highlight.mjs`'s `escapeHtml` (its Rouge reason is now on
`escapeMarkup`), `gantt.mjs`'s `esc`, `template.mjs`'s `escText` and `escAttr` with their
"§5.15" section, `sitemap.mjs`'s `xmlEscape` (its Liquid note now at its one call),
`book.mjs`'s `escapeRegExpBook`, and `offline-rewrite.mjs`'s exported `escapeRegExp`, which
nothing imported. No name is `escapeHtml` any more; markdown-it's own function keeps it. Both
HTML escapers take `String(s)`, as `template.mjs`'s and `sitemap.mjs`'s did; every other
caller passes a string. `seo.mjs`'s `escape_once` port is not one of the seven and stays: it
leaves an existing entity alone, which neither escaper does. `headingTocHtml` escapes text
tokens with `escapeMarkup`, as it already escaped code spans, since a table-of-contents entry
is element content. `buildSvgWrapper` keeps its local `esc`, now bound to
`escapeMarkupAndQuotes`.

**The regex-safety gate now follows an import.** It recognised an escaper by its shape within
one file, so moving `escapeRegExp` out of the three files that call it would have left their
three constructions unresolved. `scripts/lib/regex-fold.mjs` has `exportedEscapers(ast)`, the
names under which a module exports a helper of that shape (`export function`, `export const`,
`export { f as g }`; a re-export from another module is not followed), and
`foldConstructedRegexes` takes an `escapersOf(source)` that each `import { x as y }` is checked
against. `check_regex_safety.mjs` parses every file before folding any and resolves a relative
import among them. Three new fold probes: an imported escaper, one exported under another
name, and (negative) an imported function of another shape. WIP.Build.md's probe count
(fourteen to seventeen) and its paragraph on the model say so, and its book-transform
paragraph names `escapeMarkup`. Pipeline-Stages.md has `escape.mjs`'s export table and drops
`escapeRegExp` from `offline-rewrite.mjs`'s helpers row; Builder.md's module map has a row.

`compare_trees`: all three trees identical. The gate: `504 literals + 25 constructed in 122
files ... 0 exponential; 9 construction(s) not resolvable`, `8 classification + 17 fold
probes correct`, against HEAD's `506 literals + 25 constructed in 121 files` and 14 probes;
the census is otherwise identical. The literals lose `gantt.mjs`'s `/&/g`, `/</g` and `/>/g`
and gain the negative probe's `reason` regex. With an exponential construction planted through
the imported `escapeRegExp` (`^${escapeRegExp(s)}(a+)+$` in a scratch module), the gate exits
1 naming it, `escaped splice modelled as "x"`. With the import resolution faulted out of
`regex-fold.mjs` (the kit's `c43-fault.mjs`), it resolves 22 constructions and leaves 12
unresolved, misses the planted one, and exits 2 on the two failing import probes. A scratch
heading holding `"`, `'`, `&` and a code span with quotes shows the same text in the heading
and in its table-of-contents entry, under HEAD's `render.mjs` and the working one; the entry's
bytes now leave a quote in text literal, as its code span always did.

### C55 — `builder: one code/pre guard and replaceOutsideCode`

**A9-7 (R2).** The `<code>`/`<pre>` leading alternative that WIP.Build.md prescribes for a
whole-page rewrite is typed four times: `book.mjs:210` and again inside `:228-229`,
`pdf.mjs:143-144` (identical to `book.mjs`'s), and at the head of `offline-rewrite.mjs:299`.

**Change.** A `builder/` module exports the fragment and `replaceOutsideCode`, which is
private in `book.mjs:216` today; the four patterns are composed from the fragment.

**Verify.** The tree comparison identical, covering `book.html` in the PDF tree and every
offline page. `check_regex_safety.mjs` clean on the composed patterns.

**Landed.** `builder/code-guard.mjs` exports `CODE_OR_PRE` and `replaceOutsideCode`, with the
reason for the guard that `book.mjs` gave; `book.mjs`'s `CODE_OR_PRE_BOOK` and private
`replaceOutsideCode` are gone. The entry's `pdf.mjs` copy went with the code C14 deleted, and
it missed a copy written since: `counts.mjs`'s `SURVIVING_PLACEHOLDER_RE`. So three patterns
are composed from the fragment, each as ``new RegExp(String.raw`${CODE_OR_PRE.source}|...`,
"g")``: `book.mjs`'s `IMG_SRC_RE_BOOK`, `offline-rewrite.mjs`'s `HTML_COMBINED_RE` and that
one. `compress.mjs`'s `CODE_BLOCK_RE` is not a guard (it splits a page into code and the
rest, `<pre>` first, with no `[^>]*>`) and stays.

**The regex-safety gate resolves an imported literal `const`.** Composed from an imported
fragment, the three patterns, which the gate checked as literals, would have become
constructions it could not resolve. C54's `exportedEscapers` is now `moduleExports(ast)`,
giving the escape helpers a module exports and the `const`s it exports with a string or regex
literal as initialiser; an import of one is a `const` in the importing file. A literal needs
nothing from its module's scope, which is why nothing else is followed. Two new fold probes:
an imported regex's `.source`, and (negative) an imported `const` that is not a literal.
WIP.Build.md's fold paragraph says so and drops its stale "Twelve of the tree's eighteen
constructions" for the summary line's own count; its probe count is nineteen; its rule for
rendered-HTML rewrites, and WIP.md's Don't, name `code-guard.mjs`. Pipeline-Stages.md and
Builder.md have its table and row.

`compare_trees`: all three trees identical. The kit's `c55-equal.mjs` evaluates HEAD's three
literals and `CODE_OR_PRE_BOOK` and the new expressions: the same
`source` and `flags`, all four. The gate: `502 literals + 28 constructed in 123 files ... 462
safe, 68 polynomial, ... 9 construction(s) not resolvable`, `19 fold probes correct`, against
C54's `504 literals + 25 constructed ... 461 safe`: three literals are now constructions
under the same keys (deg3, deg3 and deg2 in the census, as before), and the negative probe's
`reason` is a new safe literal. With the import of a `const` faulted out of `regex-fold.mjs`
(`c43-fault.mjs`), the three go unresolved (`25 constructed`, `65 polynomial`, `12 ... not
resolvable`, each reported as `CODE_OR_PRE` not being a `const` in the file) and the gate
exits 2 on the failing probe.

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

**Landed.** All three go through `replaceOutsideCode`, so none states the invariant in place of
a guard: the guard changes nothing on today's pages, and on a raw `<pre>` or `<code>` it keeps
`padEmptyCells` and `injectAnchorHeadings` from adding whitespace where whitespace is content.
`normaliseVoidTags` changes only a tag's spelling, so its guard is for the rule's sake.
`render.mjs` exports `applyPostRenderRewrites(html)`, the two rewrites as `renderPage` applies
them, which the gate imports as it imports `applyPreRenderRewrites`; its comment says what the
guard is for (code the renderer produced cannot match, since its `<` is escaped; raw HTML
reaches the rewrites as written). `padEmptyCells` takes a function replacer, its no-break space
written `\u{a0}` instead of as a raw character, and its two comments, which disagreed about a
space and a no-break space, are one. `template.mjs`'s comment on `injectAnchorHeadings` points
to it.

**Found in the move and fixed in it: `replaceOutsideCode` broke under the `i` flag.** It told a
guard match by `startsWith("<code")` or `"<pre"`, while the guard alternative takes the
pattern's flags. With `VOID_TAGS_RE` (`gi`) a raw `<PRE>` element was consumed by the guard,
handed to the replacer with its groups undefined, and `tag.toLowerCase()` threw: a build crash
on any page with a raw upper-case `<PRE>` or `<CODE>` (`git grep` finds none). The test now
follows the flags, `/^<(?:code|pre)/i` under `i` and case-sensitive otherwise; Pipeline-Stages.md's
row says so.

`check_code_regions.mjs` has four `POST_RENDER_PROBES`: a raw `<pre>` holding an empty cell;
one holding a void tag, beside a `<code>` holding one; a raw `<PRE>` holding `<BR>`; a raw
`<pre>` holding a heading. Each page has a match outside the code that must still be rewritten,
and each is compared with its exact expected output. A rewrite that throws fails its probe
rather than exiting 2. The kit's `c56-faults.mjs` removes one guard at a time through
`c43-fault.mjs`: without `padEmptyCells`'s guard the first probe fails, without
`normaliseVoidTags`'s the second and third, without `injectAnchorHeadings`'s the fourth, and
with the case-sensitive test put back the third fails with `threw Cannot read properties of
undefined (reading 'toLowerCase')`. Each run exits 1, its sweep clean.

WIP.Build.md's rewrite section names three mechanisms: the rendered-HTML bullet names the
three rewrites and why the guard matters for them, and a new bullet names the token-scoped
`md.core` rules (`kramdown-dashes`, `kramdown-ellipsis`, `kramdown-possessive` rewrite only
`text` tokens). Its gate section, WIP.md's gate row, Tools.md's list item and section,
Extending.md's failure section and gate bullet, `builder/README.md` and Pipeline-Stages.md (a
row for `applyPostRenderRewrites`; `injectAnchorHeadings`'s and `replaceOutsideCode`'s rows)
say what the probes hold.

`compare_trees`: all three trees identical. The regex-safety gate: `504 literals + 28
constructed in 123 files ... 464 safe, 68 polynomial ... 9 construction(s) not resolvable`,
against C55's `502 ... 462 safe`; the two new literals are the guard tests in
`code-guard.mjs`. Lint `Checked 162 files`.

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

**Landed.** `builder/baseline.mjs` exports `GUARDED_SRC` (moved from `page-baseline.mjs`) and
`checkBaseline(guard, { record, write, force, file })`, which holds the read, the write and the
six branches: another source tree skipped, a forced write, a missing file failing or created,
a loss failing, a gain written. `guard` gives the file's name (`page` or `symbol`), the rest of
the missing-file sentence, and four functions: the figures of a new file, what a forced write
changed, the loss's failure text up to the commands, and the gain. The accept commands are
built from the name, once. The write is `JSON.stringify(record, null, 2)` and a newline.
`page-baseline.mjs` and `symbol-baseline.mjs` keep their exports and signatures, each now a
guard object and a one-line call, so `tbdocs.mjs` is unchanged; the two probe scripts import
`GUARDED_SRC` from `baseline.mjs`. The comments on the write restrictions, the source-tree key
and the accept command moved into `baseline.mjs`; the last lost its history (the use-case
round that found the defect), keeping the reason.

The kit's `c57-oracle.mjs` runs HEAD's two functions and the working ones over 34 scenarios
(17 each: every branch, a loss and a gain together, a baseline missing a key, one that is not
JSON, one with CRLF, 25 and 30 lost URLs, unsorted and repeated URLs), each in a fresh folder,
and compares the result and the file's bytes after: A/A 0 differ, after the change 1, the
entry's known exception, an empty URL list now written `"urls": []` where the hand-written form
gave `"urls": [` and a blank line. The kit's `c57-faults.mjs` puts four faults into
`baseline.mjs` through `c43-fault.mjs` (a loss passes; a gain is written with `write` false; a
missing file is created with `write` false; another source tree is measured), and each fails
probes in both gates (3 and 1 for the first, 1 and 1 for each other), every run exit 1. A
build, then `tbdocs --src docs --check-audit-index --update-page-baseline`, then
`--update-symbol-baseline` (`pages 914 -> 914, static files 250 -> 250`, `4086 -> 4086 URLs`):
both committed baselines hash as HEAD's blobs after each.

`compare_trees`: the two pages edited differ (Builder.md, Pipeline-Stages.md, with the search
data and `book.html`), nothing else. Pipeline-Stages.md has a `baseline.mjs` table and drops
`GUARDED_SRC` from `page-baseline.mjs`'s; Builder.md's module table gains rows for
`baseline.mjs` and `symbol-baseline.mjs`, which had none; WIP.Build.md's drift-guard section
names where each of its three lessons is now a comment (it said all three were in
`page-baseline.mjs`, and the second never was; it is in `check_tree_fresh.mjs`).

**Found in passing, not fixed:** Builder.md's module table has no row for `symbols.mjs` either;
every other `builder/*.mjs` has one. Fixed in C59, at the owner's request.

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

**Landed**, five of the six, by one Sonnet agent (121 calls, ~227k, 11.6 min) and reviewed by
hand. A2-7 is not folded: the two collapses trim differently ("Where the plan was wrong").
- **L4-3**: `vendor-assets.mjs` has two private helpers, `guardedFetch(url)` (the fetch, the
  status check and the body read, every failure as `{ ok: false, status }`) and
  `writeAtomic(buf, destPath)` (temp file and rename). `fetchToFile` and `fetchAttachment`
  call both and keep their own validation.
- **L4-2**: `scss.mjs`'s two exports call a private `compileScss(srcRoot, rel, label)`.
- **A3-8**: `highlight-theme.mjs`'s three loops call a local `renderPalette(selectorFor,
  palette, bg)`.
- **A2-8**: `paths.mjs` exports `posix(p)`; the seven sites in `offline-rewrite.mjs` and
  `offline.mjs` and `publish-policy.mjs`'s private copy use it. `check-tree.mjs` keeps its own
  exported copy for its recorded reason, which `check.mjs` imports, and `paths.mjs`'s comment
  names it. A site that called `replaceAll` on a value now passes it through `String()`, as
  the private copy did.
- **A3-4**: `nav.mjs` exports `isNonEmpty` and `seo.mjs` imports it.

Pipeline-Stages.md has rows for `posix` and `isNonEmpty`. `compare_trees`: only
Pipeline-Stages.md's page differs (with the search data and `book.html`); the search index,
every compressed page and both stylesheets are identical. The agent's `c58-fetch.mjs` (the
C09 script was described there, not kept, so it was rewritten) drives `vendorAssets()` with a
stubbed `fetch` through both paths: an HTML body is rejected with no file and no temp file
left, a rejected `fetch` is warned about and counted, and all 16 committed thumbnails validate
(there are no committed attachments). Its output from a `git archive` copy of HEAD and from the
working tree is identical. The regex-safety gate is unchanged: `504 literals + 28 constructed
in 124 files` (C57's `baseline.mjs` is the 124th file).

### C59 — `builder: cpu-worker's timed task paths share one runner`

**A1-3 / L4-1 (R2), A1-7 (R3).** The same run, time and report block appears three times in
`cpu-worker.mjs` (`:360-377,423-440,469-486`). The fourth path (`:497-540`) is genuinely
different, with an ordering that closes a race, and stays as it is. `:510` writes the literal
`4` for FAILED, the one SAB constant not used by name.

**Change.** One `runTimed()` for the three paths; `:510` uses the named constant.

**Verify.** The tree comparison identical; the build reports its task timings as before.

**Landed.** `cpu-worker.mjs` has a private `runPerWorkerTask(taskIdx, meta)`, named for what it
runs rather than `runTimed`, since the fourth path is timed too. It times the handler, marks
the task done for the lane and posts the `perWorkerTiming` message; on a throw it posts
`taskFailed` and returns false, and the caller ends the pull loop, as each copy's `return`
did. The idle, nested and on-demand paths call it in one line each, and each still reads the
task's metadata where it did, the nested path after releasing its claimed task. The fourth path
writes `FAILED`, now imported from `sab-scheduler.mjs`. Nothing reads that status (A1-7), so
the name changes nothing.

`compare_trees` on the code change alone: identical (1461, 1457 and 137 files). The build's
summary still gives a `boot`, `render` and `write` time for each of the 16 lanes. The Gantt
charts of HEAD's build and the working one, kept by `compare_trees --keep`, draw the same bars
by class: 16 `gb-boot`, 16 `gb-env`, 16 `gb-cold`, 153 `gb-render`, 167 `gb-write`, 23
`gb-spine`, 9 `gb-seeds`. The kit's `c59-faults.mjs` builds the `check-src` fixture from a `git
archive` copy of HEAD and from the working tree, with a throw put at the top of `warmInit`,
`renderEnvInit` or `flush` through `c43-fault.mjs`. `flush:<i>` runs through the fourth path,
so its fault covers the `FAILED` write. Every faulted build exits 1 in about a second with
`task <name> failed` and the fault as its cause, and the two sides print the same lines. The
first run differed only in which flush chunk failed first (`flush:0` against `flush:1`), a race
the second run did not repeat.

Builder.md's module table gains a row for `symbols.mjs` (C57's Found item), under Write phase
beside `search.mjs`, as `builder/README.md` groups them; every `builder/*.mjs` now has exactly
one row. Its "Architecture at a glance" said `~34 modules` against 44; at the owner's choice it
now says "dozens of modules", linked to the module map, rather than a figure nothing derives.
With both, `compare_trees` differs in that page alone, with the search data and `book.html`.

### C60 — `builder: name tbdocs's exit bits and set them in one place`

**A1-6 (R2).** Seven sites set exit bits with bare literals
(`tbdocs.mjs:560,1469,1470,1568-1573,1598,1610`), five of them bit 0. The three plain
assignments are safe only because they run before the ones that OR (V1's third note).

**Change.** Named constants for the two bits and for C18's command-line value, and one
`failBuild(bit)` that ORs.

**Verify.** Each provoked failure exits as before: a broken link 1, an integrity failure 2,
both 3, a command-line error 4, a baseline drift 1. A scratch copy that moves an assignment
after an OR still exits with both bits.

**Landed.** `tbdocs.mjs` exports `EXIT_FAILED` (1), `EXIT_INTEGRITY` (2) and
`EXIT_COMMAND_LINE` (4), with the reasons for the scheme beside them, and has a private
`failBuild(bit)` that ORs a bit into `process.exitCode`. All seven sites call it: the three
plain assignments (vendorAssets, dot, scss), the check's combined code (now one call per bit)
and its recheck-only branch, and the two baseline guards. `main()`'s usage error, its `--dest`
refusal and its crash exit use the constants, and so do `serve.mjs`'s refusal and its two
`process.exit(1)`s, since it imports from `tbdocs.mjs` already. The comments that justified
each OR in place (one of them the history of the clobbered bits) are gone; `failBuild`'s says
why. Pipeline-Stages.md has a row for the constants and names `failBuild` in `checkReport`'s
exit-code line; Builder.md, Building.md, Pipeline-Stages.md's vendorAssets paragraph, and the
`dot.mjs` and `scss.mjs` headers say "exit bit 1" where they quoted `process.exitCode = 1`;
WIP.Build.md's rule now names `failBuild`.

The kit's `c60-exits.mjs` builds scratch sources made from the `check-src` fixture from a `git
archive` copy of HEAD and from the working tree, 17 cases each: clean 0, a broken link 1, a
duplicate id 2, both 3, a broken diagram 1, a broken stylesheet 1, a diagram with an integrity
failure 3, a stylesheet with a link 1, and through `c43-fault.mjs` a failed asset fetch 1 (with
an integrity failure 3), a baseline drift 1 (3), a crash in `discover` 1, and an unknown flag,
a `--dest` over the source and the same under `--serve`, each 4. Every case exits and prints
the same on both sides, before the change and after. The one designed to differ puts a bit-0
failure after the check has set bit 2: HEAD's form, `process.exitCode = 1`, exits 1, losing
the integrity failure, and the working tree's, `failBuild(EXIT_FAILED)`, exits 3. `compare_trees`:
the three pages edited differ, with the search data and `book.html`, and nothing else. No
non-zero exit literal is left in `builder/*.mjs`.

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

**Landed.** `tb-fences.mjs` imports `logicalLines` from `twin-api.mjs`, and its own splitter
is gone. `classify` trims each logical line and drops the blank ones. `usesMe`, a third copy
of the same quote-aware strip, reads the logical lines too: its comment's reason, that
`logicalLines` does not blank strings, stopped being true. `twin-api.mjs` changes only by a
line in `logicalLines`' comment naming its second user. The entry's differences are absorbed
so: a BOM and a `/* */` are now handled; blank lines are dropped in `classify`; the line
number went with its field, which nothing read; each line is trimmed; a `Rem` line is now a
comment. Three the entry does not list: strings arrive blanked, a joined continuation keeps
the space before its ` _`, and a lone `\r` no longer ends a line (a markdown-it fence never
holds one). `CLASSIFIER_PROBES` gains three: a `/* */` over two lines, a BOM, and a fence of
only comments and blank lines, so the census runs 122 probes.

The kit's `c61-oracle.mjs [<rev>]` archives HEAD's `scripts/lib` and `lib` and compares
HEAD's splitter, `classify` and `usesMe` with the working tree's over all 1,226 `tb` fences,
and `twin-api.mjs`'s splitter and `parseTwin` over the 661 `.twin` files of the BETA 987
census export. The split text differs on 725 fences: 558 by blanked strings, 64 by
continuation whitespace, 102 by both, and one by a `/* in */` inside a signature
(`Features/Language/Comments.md`). `classify` and `usesMe` agree on all 1,226 fences, and
`parseTwin` on all 661 files. `check_examples --census` differs only in its probe count.
HEAD's classifier gives the block-comment probe `null`. The kit's `c61-faults.mjs` puts four
faults in through `c43-fault.mjs`: without block comments the first probe fails, with blank
lines kept the third, untrimmed the first. Without the BOM strip every probe passes, because
`classify`'s `trim()` removes U+FEFF as well, so the BOM probe fails only with both gone.
`examples.bat`: exit 0 after 152.5 s, `1134 sample(s) from 598 page(s) in 43 project(s), 4
lane(s), BETA 987, 2 staged file(s)`, then `1134 sample(s), 1134 compile, 0 finding(s),
149.2s -- clean`; the census before the edit already counted 1,134 marked, so the rise from
1,129 is the pages'.

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

**Landed.** `scripts/lib/twin-declarations.mjs` exports `MODIFIERS`, the words allowed
before a declaration keyword as regex alternatives, and census's line classifier, moved
there so a gate can import it: `decomment` and `declarationKind(decl, container)` (census's
`classify`, with `DECL_RE` and `VAR_RE`). `MODIFIERS` is the union of the three lists less
`Optional`, `Dim` and `Const`: 30 words. `Dim` and `Const` open declarations of their own, and
the two scanners that read one as a modifier add it (census `Const`, twin-api `Dim`).
`Optional` is a parameter keyword: in the census it turned seven parameter-continuation lines
from unresolved into `Variable`. The list is one string literal, because
`check_regex_safety` folds an imported `const` only when its initialiser is a literal; as a
concatenation, the three constructions built from it went unresolvable (28 constructed and 9
unresolvable became 26 and 11). `census_attributes.mjs` keeps `OPEN_RE` and `CLOSE_RE`, built
from `MODIFIERS` plus `Const`; `twin-api.mjs`'s `MODIFIER_RE` and `tb-fences.mjs`'s `rx` build
from it too. `parseTargets`, its two rule tables and `stripDots` moved unchanged from
`gen_attribute_probes.mjs` to `scripts/lib/attributes-doc.mjs` (a script compared the cut text
with the moved text). The two structural divergences are left alone: census reads its source
a physical line at a time, so its `blankStrings` and its per-line `/* */` stay as they are.

The new gate `scripts/check_twin_parsers.mjs` (in `test.bat`, the composite action, Tools.md's
list, POSIX block and a section, Building.md's POSIX block, and WIP.md's bullet and table) runs
121 probes: `Public <word> Sub Foo()` for each of the 30 words through `declarationKind`,
`parseTwin` and `classify`, 19 `declarationKind` shapes and 12 `parseTargets` lines. Tools.md
now says "Thirteen steps", which `check_gate_lists` could not read: its number words stopped at
twelve, and now run to twenty. The kit's `c62-faults.mjs` puts five faults in through
`c43-fault.mjs`, and each fails the gate on the probes named after it: `Overridable` out of the
list (three), no `decomment` (one), a `Const` read as a variable (two), no whole-phrase rules
(two), the singular `const` rule (one). A `check_gate_lists` word list off by one fails it
three times.

The kit's `c62-oracle.mjs` runs HEAD copies of `census_attributes.mjs` and
`gen_attribute_probes.mjs` beside the real ones (census `--json` and the Markdown report over
the BETA 987 cache, no compiler; the generator's project and key), and all 137 files written are
identical. It also runs HEAD's `classify` and `declarationKind` over every line of the 661
`.twin` files under four containers: 128 of 415,428 pairs differ, all of them the 32
`Overridable` procedure lines, now read as `Sub` or `Function` (A8-1's fix; none carries an
attribute, so the census does not move). C61's `c61-oracle.mjs` finds `classify` identical on
all 1,226 fences and `parseTwin` on all 661 files. `check_regex_safety`: `503 literals + 28
constructed in 125 files ... 463 safe, 68 polynomial ... 9 construction(s) not resolvable`.

Found, not fixed: `declarationKind` reads a field named `Type` inside a `Type` block as a
`Type` declaration, since `DECL_RE` is tried before the container rules. It takes an attribute
on such a field to matter, and the census output shows none.

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

**Landed.** The click moved down into a new `scripts/lib/tb-click.mjs`, word for word from
`tb-operate.mjs`: `targetJs` (now exported), `named`, `clickAt` and `click`. Its `sleep` is
`node:timers/promises`' `setTimeout`, because `tb-ide.mjs`, which exports the other one,
imports this module. `tb-ide.mjs` imports `click` and `clickCenter` is gone. `buildProject`
returns `click`'s error as its `message` (`cannot click #buildIcon: <why>`) where it returned
`no #buildIcon in the IDE page -- did the project load?`, and `tbrun` throws it where it threw
that. `tb-operate.mjs` keeps `elementRect`, imports `targetJs`, `click` and `clickAt`, and
re-exports the last two, so no scenario's import changed. WIP.Harness.md's list of files to
read it before changing names the new module. The build icon now gets what every other control
gets: the pointer moved there first, a scroll into view, a hit test, and up to five seconds for
the icon to be there, sized and uncovered. Where `clickCenter` returned false at once for a
missing icon, the click now throws after five seconds; where it pressed whatever covered the
icon, and the build then waited out its timeout, the click throws naming what covers it.

`tbrun` on the kit's `tbrun-probes/clean`, before and after: exit 0 (23 s, 22 s), `one`,
`two`. The kit's `c63-faults.mjs` puts two faults in through `c43-fault.mjs`: an overlay over
the whole page, added before the first hit test, gives exit 2 after 24.8 s and `tbrun: cannot
click #buildIcon: its centre is covered by #c63cover`; a Build button that is not there gives
exit 2 after 40.3 s and `there is no such element`. `addin-test.bat` through the kit's
`c25-run.mjs`: exit 0 after 145.9 s, `10 of 10 lane(s) ran: 10 passed`, `registry: put back
(20 project-state, 21 recent-list and 3 association writes)`, the snapshots before and after
identical. Eight of the ten lanes, all but `symbols` and `ideserver`, build add-ins through
`buildProject`, ten builds in all, so the Build button was pressed through the new click ten
times. `examples.bat`, which presses no Build button (`tbbuild` only compiles), shows that
`tb-ide.mjs` still loads and does what it did: exit 0 after 146 s, `1134 sample(s), 1134
compile, 0 finding(s), 142.7s -- clean`, as in C61.

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

**Landed.** `tb-registry.mjs` exports `alive` and `norm` under their own names, each with a
line saying what it is, and `addin_test.mjs` imports them and drops its copies. `tb-ide.mjs`
exports `COMPILE_TIMEOUT` (180,000 ms) above `waitForCompile`. There were eight sites in five
files, not seven in four: `tbbuild.mjs`'s `--timeout` default, 180 in seconds, is the eighth,
and now reads `COMPILE_TIMEOUT / 1000`; its header still states 180, and the constant's comment
says so. The two JSDoc lines that said `default 180000` name the constant. `check_examples.mjs`
has a module-level `unitKey(fence)` above `makeBatches`, carrying the comment that stood over
the arrow function it replaces, and `unitsOf` calls it too. The two sites held the same
expression, so a clean run, which never splits a batch, covers `makeBatches` only, and
`unitsOf` is the same code by reading. `examples.bat`, whose lanes run `tbbuild` with its
default: exit 0 after 138 s, `1134 sample(s) from 598 page(s) in 43 project(s), 4 lane(s)`,
then `1134 compile, 0 finding(s), 135.3s -- clean`, the layout and result of C61 and C63.
`addin-test.bat` through the kit's `c25-run.mjs`: `10 of 10 lane(s) ran: 10 passed`, the
registry put back as in C63, the snapshots identical. `tbrun` on `tbrun-probes/clean`: exit 0,
`one`, `two`.

### C65 — `test: one scenario preamble and one linesSince for the add-in tests`

**A7-8 / L4-14 (R2).** All ten `test/addin/*.test.mjs` files write their own lane preamble
and skip object, and six read "console lines since a mark" in four ways: `appdata.test.mjs:33`
and `panes.test.mjs:86` with hard-coded slice offsets, `arch.test.mjs:31` and
`reload.test.mjs:37` with two different regex captures, `keys.test.mjs:28` with a split and a
trim, and `sample10.test.mjs:81` with a bare trim.

**Change.** A scenario helper for the preamble and the skip object, and one `linesSince`
beside `readConsole`.

**Verify.** `addin-test.bat` green, all ten lanes (a harness run).

**Landed.** The new `test/addin/scenario.mjs` exports `scenario(title, fn)`: the file's lane
from `addinLane`, a `describe` block skipped with the one reason when there is none, and an
`after` hook that closes the lane. `fn` gets the lane, and a function it returns runs after the
close in a `finally`, which is how `panes.test.mjs` keeps closing its page server when closing
the lane fails. All ten files are one `scenario()` block now, with no `addinLane`, skip object
or `after` of their own; `tb-lane.mjs`'s header points to the module for the outline it used
to show, and WIP.Harness.md's runner section names it. `tb-ide.mjs` exports `linesSince(c,
mark, { prefix })` after `consoleMark`: `readConsole`'s text since the mark, split and each
line trimmed, and with `prefix` only the lines that start with it, without it, which replaces
`appdata`'s and `panes`' `slice(15)` and `slice(13)`. `arch`, `reload`, `entry`, `keys` and
both of `sample10`'s reads use it, and so do `buildProject` and `tb-operate.mjs`'s
`openedUrls`, which read the console the same way. `keys.test.mjs`'s substring search for
`[KeysProbe] registered` still reads the text. Two reads changed slightly: `sample10`'s
`[WaynesWorldAddin]` lines are trimmed before the prefix test, and its one-line wait reads the
non-empty lines joined, where it trimmed the whole text. Both give the same answer for what the
add-in prints. The ten files were converted by one Sonnet agent from a brief (69 calls, ~193k,
3.6 min; one comment needed correcting) after a Sonnet Explore survey (24 calls, ~139k, 4.2
min).

A scratch test through `c43-fault.mjs`, with `addinLane()` replaced by a lane whose `close`
logs and optionally throws, shows the order: the close, then the returned function, also when
the close throws; with no lane the block is skipped. `addin-test.bat` through the kit's
`c25-run.mjs`: exit 0 after 130.0 s, `10 of 10 lane(s) ran: 10 passed`, the registry put back
as in C63, the snapshots identical, and no `✖` line in any lane's output.

### C65a — `test: a lane fails when closing it finds a problem`

**Found while landing C65** (see Found while implementing). What `Lane.close` finds, a
compiler crash or a javascript dialog, never fails a lane, because a throwing `after` hook
leaves a `node --test` file's exit code 0.

**Change.** `scenario()` closes the lane in a test of its own, the block's last, so that what
the close finds is a failing test. The `after` hook stays, for a block whose tests never ran;
closing a lane a second time does nothing (`closeProject` finds no connection, `shutdownIde`
returns on null, the copy is already gone). The function a scenario returns still runs after
the close, whichever of the two closed it. WIP.Harness.md's runner section says a problem
found at close fails the lane only because the close is a test.

**Verify.** The scratch test with a lane whose `close` throws exits 1 under `node --test`,
and 0 with one whose `close` works; `addin-test.bat` green, all ten lanes (a harness run).

**Landed.** After `fn` has declared the block's hooks and tests, `scenario()` declares one more
test, `the lane closes with nothing found`, and gives the `after` hook the same function. That
function runs once, whichever calls it first, so the hook closes the lane only when the test
never ran, and the function a scenario returns, called in the close's `finally`, runs once too.
A flag rather than `Lane.close`'s own idempotence keeps it to one run. `scenario.mjs`'s
comments say why the close is a test, WIP.Harness.md's runner section says so as well, and
`Lane.close`'s comment says it is for `scenario()` rather than `after()`. Each lane reports one
test more.

The kit's `c65-scenario.mjs` runs a scratch scenario seven ways, with `addinLane()` replaced
through `c43-fault.mjs` by a lane whose `close` logs and optionally throws. On HEAD a close
that throws exits 0, run directly and under `--test`; now it exits 1 both ways, with the close
test under "failing tests" and its `close failed`. A close that works exits 0 with `pass 2`;
with no lane the block is skipped (`tests 0`). A `before` hook that throws exits 1 on both
sides, and the close still runs, from the `after` hook. In the six cases with a lane, the close
and the returned function run once each, in that order.

`addin-test.bat` through the kit's `c25-run.mjs`, twice: exit 0 after 131.8 s and 131.4 s, `10
of 10 lane(s) ran: 10 passed`, the registry put back as in C63 and the snapshots identical.
The second run counted the close test's result lines in the lanes' output: ten, one per lane.

### C65b — `book: delete fast-inflate.mjs, which patched a function pdf-lib never calls`

**Found while designing C66** (see Found while implementing). `fast-inflate.mjs` replaces
`pako.inflate` with `zlib.inflateSync`, and pdf-lib 1.17.1 never calls `pako.inflate`: its
`cjs/` tree, the build Node loads, calls only `pako.deflate`, and a load decodes the
cross-reference stream and object streams through pdf-lib's own `FlateStream`. The shim changes
nothing, and three documents describe a call site that does not exist: its Fixes-PDFLib.md
section, `render-book.mjs`'s header, and Builder.md's reason for declaring and pinning `pako`.
No code of ours imports `pako` without it.

**Change.** Delete the shim and its import; drop its Fixes-PDFLib.md section, its line in
`render-book.mjs`'s header and the `perf/` rigs' `--fast-inflate` flag and imports; `npm
uninstall pako` (the owner's choice, which confirmed the uninstall), with Builder.md's
Dependencies updated. pdf-lib still installs pako 1.0.11 as its own dependency. C66 and C69
then cover twelve shims.

**Verify.** `book.bat` renders with the same page count and outline; the lockfile loses only
the root's `pako` line.

**Landed.** As the entry says. `render-book.mjs` loses the import and the shim's four lines in
its header; Fixes-PDFLib.md loses the section, which no page linked to; Builder.md loses
`pako` from its Dependencies block, from the sentence on the PDF renderer's packages and from
the pin list. In `perf/`, `measure.mjs` loses the flag, its comment, variable, argument branch
and import, `instrument-objclasses.mjs`, `instrument-pioh.mjs` and `phase0-measure.mjs` their
import, and `perf/README.md` the flag's bullet and its mentions in three command lines (done by
a Sonnet agent: 33 calls, ~126k, 2 min; accurate). `perf/notes/` is the record of the
measurements and keeps its account. `npm uninstall pako` removed one line from each of
`package.json` and `package-lock.json`, and `node_modules/pako` is still 1.0.11.

The book rendered twice from one `_site-pdf`, through HEAD's `book/` and `lib/` archived into
a scratch folder and through the working tree's: 92 s and 93 s, both `process: 1.1s` and
`1.0s`, 2,298 pages, 2,466 outline entries and 29,111,771 bytes each. The files differ in one
run of 28,991 bytes, inside one object stream of 500 objects; inflated, the two streams differ
only in `/CreationDate` and `/ModDate`, the render times. `compare_trees`: Builder.html and
Fixes/PDFLib.html online and offline, the search data, and `book.html`.

### C65c — `book: fast-parse-number reads a decimal as Number() does`

**Found while building C66** (see Found while implementing). `fast-parse-number.mjs` read a
decimal as `intPart + frac / scale`, which rounds twice, and accumulated a fraction of any
length, so `2.28` read as `2.2800000000000002` and `-40.8933` as `-40.893299999999996`, where
stock pdf-lib's `Number()` gives the double nearest the decimal. The book is not affected
today: none of the 70,978 decimals in the object streams of the render of 2026-09-25 has the 15
or more significant digits that a misread number is written with.

**Change.** Divide once, `(intPart * scale + frac) / scale`: while the number has at most 15
digits both operands are exact integers, and IEEE 754's correctly rounded division gives what
`Number()` gives. Past 15 digits, the fraction's included, rewind and delegate to the original,
as a long integer already did. Fixes-PDFLib.md's section says so.

**Verify.** The kit's `c65c-oracle.mjs` runs stock `parseRawNumber`, HEAD's shim and the
working one over the same numbers; the book renders the same through HEAD's shims and the
working ones.

**Landed.** As the entry says; the shim's header says the 15 digits include the fraction's.
The kit's `c65c-oracle.mjs` over 289,724 numbers (16 fixed, the rest random: a sign or none, up
to 17 integer digits, up to 19 after the period, or a bare period): HEAD's shim differs from
stock `parseRawNumber` on 1,747, `2.28`, `-40.8933` and `1.610936` among them; the working one
on none, in value (`-0` told apart), end offset and throw alike. The book rendered twice from
one `_site-pdf`, through HEAD's `book/` and `lib/` and through the working tree's: 91 s and
88 s, both `process: 1.1s`, 2,298 pages, 2,466 outline entries and 29,111,771 bytes each,
differing in one object stream and there only in `/CreationDate` and `/ModDate`. C66's gate,
not yet committed, passes over the fixture that found the defect, with its page insertion
taken out until C65d. `compare_trees`: Fixes/PDFLib.html online and offline, the search data,
and `book.html`.

### C65d — `book: fast-dict-onebuf builds new pages and page trees in its buffer`

**Found while building C66** (see Found while implementing). `fast-dict-onebuf.mjs` replaces
`PDFDict`'s methods with ones that read a dictionary's entries from one shared buffer, and
replaces six of pdf-lib's eight factories for `PDFDict`, `PDFCatalog`, `PDFPageTree` and
`PDFPageLeaf` to build there. The other two, `PDFPageTree.withContext` and
`PDFPageLeaf.withContextAndParent`, still build on a `Map` with `new`, and the replaced methods
cannot read what they make: `insertPage` and `addPage` fail (`Expected instance of PDFArray,
but got instance of undefined`, from the new page's `/MediaBox`), and `PDFDocument.create`
would. The book never adds a page; `parallelSave` would, only for a document with none.

**Change.** Replace the two, building pdf-lib's entries in pdf-lib's order through the shim's
own `fromMapWithContext`. Fixes-PDFLib.md's section names the eight factories.

**Verify.** `create`, `addPage`, `insertPage` and a save give stock's bytes under the shim
alone and under every shim; C66's gate passes with its page insertion; the book renders the
same.

**Landed.** As the entry says. pdf-lib 1.17.1 has exactly these eight static factories on the
four classes, and C65d's two are the ones `PDFDocument.create` (`PDFDocument.js:146`) and
`PDFPage.create` (`PDFPage.js:1435`) call. The kit's `c65d-oracle.mjs` runs `create`,
`addPage`, `insertPage`, `drawText`, another `addPage` and `save` in a process per shim set:
stock gives 3 pages and 1,019 bytes; HEAD's shim fails at `insertPage` alone and with every
shim; the working one gives stock's bytes (same sha256) both ways. C66's gate, not yet
committed, passes with nothing taken out of its change: 22 objects, every shim run. The book
rendered through HEAD's `book/` and `lib/` and through the working tree's: 88 s each,
`process: 1.1s` and `1.0s`, 2,298 pages, 2,466 outline entries and 29,108,192 bytes each (the
count moved with C65c's edit to Fixes-PDFLib.md), differing only in `/CreationDate` and
`/ModDate`. `compare_trees`: Fixes/PDFLib.html online and offline, the search data, and
`book.html`.

### C65e — `docs: Fixes.md stops counting the pdf-lib shims`

**Found while building C66** (see Found while implementing). Fixes.md says twice that there
are thirteen `fast-*.mjs` shims; C65b left twelve and did not edit that page.

**Change.** Both sentences name the shims without a count, which nothing keeps true.

**Verify.** `compare_trees` shows the page, the search data and `book.html`, and nothing else.

**Landed.** As the entry says; a search of the tree outside `perf/notes/` for a count of
thirteen shims finds only this plan's own entries. `compare_trees`: Fixes.html online and
offline, the search data, and `book.html`.

*The book's pdf-lib shims (decision (c)): C66–C69.*

### C66 — `book: check_pdf_shims_equiv.mjs, the shims against stock pdf-lib`

**A9-2 (R2).** No test compares shimmed pdf-lib output with stock; the only comparisons are
one-off notes in `perf/notes/08-pdf-lib.md`.

**Change.** A `test.bat` gate modelled on `check_axe_patch_equiv.mjs`. The same document is
loaded, changed and saved by stock pdf-lib in a child process and by pdf-lib with the twelve
shims (thirteen before C65b) installed here, and the two results are compared object by object, with streams
decompressed, since a different deflate can give different bytes for the same content. The
document is generated in the gate to reach every shimmed path (parsing, arrays and
dictionaries, the parallel deflate, the inflate replacement), so the gate needs no built tree.
Registered in the composite action, Tools.md and WIP.md.

**Verify.** Passes; a deliberately broken shim fails it, and the report names the shim. CI
waits for the owner's push.

**Landed.** `scripts/check_pdf_shims_equiv.mjs` and `scripts/lib/pdf-shims-side.mjs`, one side
per process; the gate itself never imports pdf-lib (see Where the plan was wrong). The shims
are every module `render-book.mjs` imports from `book/lib/`, in its order, less the four the
side calls as `render-book.mjs` does (`measure-pass`, `postprocesser`, `outline`,
`parallel-deflate`), so a new shim is checked without an edit. The document is written by the
gate: a classic section with a generation-1 object, then an incremental update whose object
stream redefines a page and holds a dictionary and an array of every lexical form the parse
shims branch on, with a cross-reference stream. The side sizes the onebuf shims from
`measure()`, loads, calls `setMetadata` (then pins `/ModDate`, which it stamps with the time)
and `setOutline` with a closed entry, draws text on a page, inserts and removes a page, edits
two early dictionaries and an array, and saves: the shimmed side through `parallelSave` with
500 objects to a stream, the stock side with `save()`'s own steps and
`PDFStreamWriter.forContext(ctx, Infinity, true, 500)`.

The comparison reads each file as pdf-lib writes it: every object by number, where it is
(top level, generation, or object stream and entry) and its bytes, streams inflated, each
`/Length` and the cross-reference stream's `/W` masked. Each file's cross-reference entries
and `startxref` must locate their objects; a problem in stock's output is the harness failing
(exit 2), in the shimmed output a finding. The reach check is V8 precise coverage in the
shimmed side, taken once after the imports to reset the counts: a shim with no function run
fails the gate, and `parallel-deflate.mjs` fails if `parallelSave` deflated no object stream.
On a difference the shimmed side reruns with each shim alone and each left out, four at a
time, and the report names the shims that differ alone and those whose removal makes the
output match. `--help` and an unknown option are `check_cli`'s cases 255 and 256.

Building it found three defects, fixed first at the owner's choice: C65c (the gate named
`fast-parse-number.mjs` both ways), C65d (the shimmed side failed at `insertPage`) and C65e.
Now: `stock pdf-lib and 12 shims with parallelSave write the same 22 objects; every shim ran`,
0.49-0.54 s. Faults through the kit's `c43-fault.mjs` in `NODE_OPTIONS`, so the sides load it:
`fast-dict-onebuf.mjs`'s `sizeInBytes` one byte long gives an output the reader cannot place
(`byte 2054 is neither an object nor the trailer`), named both ways; `fast-number-to-string.mjs`
writing `0.50` for `0.5`, which parses to the same values, differs in six objects, the drawn
content stream among them, named both ways; `fast-pdfnumber-pool.mjs` never installed, and
`parallelSave`'s thread-pool branch switched off, are each named by the reach check; a stock
side that throws exits 2. No temporary folder is left behind. Registered in `test.bat` before
`check_axe_patch_equiv`, the composite action, Tools.md (the list, its count, the POSIX block,
the counts after it and a section), Building.md's POSIX block and WIP.md (the table, the
`test.bat` bullet, the count); Fixes-PDFLib.md points to it. `check_gate_lists`: `test.bat
(14)`; `check_ci_workflows`: `the wrappers' 17 gates`; lint `Checked 168 files`; regex safety
`519 literals + 28 constructed in 129 files -- 479 safe, 68 polynomial`. CI waits for the
owner's push.

### C67 — `book: one module for pdf-lib's internal requires`

**A9-5 (R3).** The `createRequire` and `require('pdf-lib/cjs/...').default` block is repeated
in nine production shims.

**Change.** `book/lib/pdf-lib-internals.mjs`, which the nine import.

**Verify.** `check_pdf_shims_equiv.mjs`; `book.bat` renders with the same page count and
outline.

**Landed.** `book/lib/pdf-lib-internals.mjs` requires the 44 pdf-lib objects the nine shims
required themselves, each by the same CommonJS path, and exports them under the names the
shims already used, so each require block became one import and no shim's body changed. Two
reads move: `Numeric.js` is required once for `IsDigit` and `IsNumeric`, and
`copyStringIntoBuffer`, `last` and `toUint8Array` are read from the utilities barrel when the
new module loads rather than when `fast-sync-load.mjs` does. Neither changes a value: no shim
assigns those three (the two utility shims assign only `numberToString` and `sizeInBytes`), and
`render-book.mjs` and the gate's side both import `pdf-lib`, which loads every module, before
any shim. A scratch comparison of each export with `require('pdf-lib')` found 35 of the 44 to
be the objects pdf-lib's index exports and 9 not in it (`BaseParser`, the five syntax exports
and the three utility modules); the module's header says so. `fast-parse-object.mjs`'s header
said `PDFObjectParser` is not re-exported from pdf-lib's index, which is false, and now says
only where it comes from; `fast-parse-number.mjs` and Fixes-PDFLib.md say `BaseParser` is not,
which is true, and now name the module, which Fixes-PDFLib.md's introduction describes in a
new paragraph. `perf/`'s instruments keep their own requires, as records of the measurements.

`check_pdf_shims_equiv`: unchanged. With the module exporting a subclass of `PDFObjectParser`
in its place (a fault through the kit's `c43-fault.mjs`), the gate names `fast-parse-object`
and `fast-parse-name`, whose patches land on the copy, and not `fast-dict-onebuf` or
`fast-array-onebuf`, whose `parseDict` and `parseArray` land there too, because other
functions in both still ran: C67a. With `BaseParser` so, it names `fast-parse-number`. The
book, rendered from one `_site-pdf` through HEAD's `book/` and the working one: 2,299 pages,
2,466 outline entries and 29,130,183 bytes each, differing only in `/CreationDate` and
`/ModDate`; 130 s and 136 s, `process: 1.3s` and `1.4s`. `compare_trees`: Fixes-PDFLib online
and offline, the search data and `book.html`. Lint `Checked 169 files`.

### C67a — `book: check_pdf_shims_equiv checks each member the shims patch`

**Found while landing C67** (see Found while implementing). The gate's reach check fails a
shim none of whose functions ran, so a shim with several patches passes while one of them
never runs, or lands on a copy of a class. With `pdf-lib-internals.mjs` exporting a subclass of
`PDFObjectParser`, the gate named the two shims whose only patch is on it, and not
`fast-dict-onebuf.mjs` or `fast-array-onebuf.mjs`, whose `parseDict` and `parseArray` landed on
the copy too.

**Change.** The shimmed side lists the members of pdf-lib the shims put a function into, and
whether each function ran. The gate checks them against a list of every member each shim
patches, in which a member the document does not reach is marked, with the reason.

**Verify.** Passes; C67's fault fails it, naming the two members; so do a patched member missing
from the list, an unmarked member that stops running and a marked one that runs.

**Landed.** In coverage mode the side snapshots the own properties of every pdf-lib module's
exports in `require.cache`, of each function they export and of its prototype, before and
after the shims load; a member that holds a new function, as value, getter or setter, is
patched. The inspector gives each function's `[[FunctionLocation]]` and
`Debugger.getScriptSource` its script, and the function's coverage entry is the one containing
that position whose source is the function's own text. A function never called can have no
entry at all, having never been compiled (measured: `PDFContext.prototype.delete` has none), so
no entry counts as not run. Only functions a shim defines count. The side prints `{ streamCount,
reached, patched }`, `patched` one `{ shim, member, ran }` per member, since
`numberToString` and `sizeInBytes` are each installed in three modules.

`PATCHES` in the gate lists 74 members of 12 shims. A measurement is behind each of the 22
marks: 16 `the load, the change and the save do not call it`, both `computeBufferSize`
`parallelSave does not call it`, the two factories `PDFDocument.create` alone calls (read at
`api/PDFDocument.js:146-148`), `PDFCatalog.fromMapWithContext` (called only from the stock
`parseDict` that `fast-dict-onebuf` replaces) and `PDFPageTree.fromMapWithContext` (under the
shims, called only from that shim's `PDFPageTree.withContext`). The gate reports a listed
member not patched, a patched member not listed, an unmarked member that never ran, and a
marked member that ran; a shim that ran nothing is still reported whole, and its members are
left out of the four lists. Now: `stock pdf-lib and 12 shims with parallelSave write the same
22 objects; the 74 members the shims patch are as listed, and all ran but the 22 marked`, 0.49
s. Faults through the kit's `c67a-faults.mjs`, each exit 1: the `PDFObjectParser` copy names
`fast-parse-object` and `fast-parse-name` whole, `parseDict` and `parseArray` as not patched,
and the two `fromMapWithContext` marks as run, since stock `parseDict` runs again and calls
them; a `BaseParser` copy names `fast-parse-number` whole; the side without its
`misc.delete` names `PDFDict.prototype.delete` as never run; the side calling `misc.has` names
that mark as run; a method a shim adds to `PDFNumber.prototype` is named as not listed. The
header, `--help`, Tools.md's list line, section and exits, Fixes-PDFLib.md and WIP.md's table
say what the gate now checks; `check_cli`'s help case pins only the first line. Lint `Checked
169 files`; regex safety `521 literals + 28 constructed in 129 files -- 480 safe, 69
polynomial`. `compare_trees`: Fixes-PDFLib and Tools online and offline, the search data and
`book.html`. CI waits for the owner's push.

### C67b — `book: the shim gate reaches the members it marks`

**The owner's choice (2026-09-28)**, with C67a. A Sonnet agent measured the 22 marked members
against the real book: rendered with `NODE_V8_COVERAGE`, 2,299 pages, every one ran 0 times
(`PDFDict.prototype.get`, for comparison, 15,124), so the gate's document is not narrower than
the book. Twenty exist because the storage changed. The onebuf classes keep their entries in
one buffer (`_FastArray` holds only `this.d`, `fast-array-onebuf.mjs:147-148`), and a `PDFRef`
holds no `tag` (`fast-refs-class.mjs:74-86`), so every stock method that reads the old fields
had to be replaced, called or not. `PDFContext.prototype.delete` has a caller,
`fast-sync-load.mjs:92-95`, which removes an object 0 that a parsed file defines; Chromium
never writes one. The two `computeBufferSize` overrides are the exception. No storage change
forces them, the shim's comment calls them "patched for consistency" (`fast-sync-load.mjs:237-241`),
`08-pdf-lib.md` finds the writer-side wins "none reliably above noise" (`:1795-1822`), and
`ParallelStreamWriter`, which predates them, overrides the method on the book's only path
(`parallel-deflate.mjs:50-61`). The split renderer the owner recalled, `perf/probe-parallel.mjs`,
never loads the shims and never merges its parts; a renderer that copied pages between
documents would need two `PDFContext`s, which the onebuf shims refuse
(`fast-dict-onebuf.mjs:136-142`, `fast-array-onebuf.mjs:99-105`).

**Change.** Delete the two `computeBufferSize` overrides from `fast-sync-load.mjs`, at the
owner's choice, with their two `PATCHES` entries. The side's change calls each marked member
a loaded document can reach, with each result written into the document so that the
comparison checks it: a dictionary's and an array's `clone` registered, their `toString` and a
reference's stored as strings, `values`, `entries`, `has`, `asMap`, `indexOf`, `asArray` and
`getObjectRef` reduced to numbers or references stored in a dictionary, and `set` on an array.
The fixture gains an object 0, which the parse removes through `PDFContext.prototype.delete`.
A second pair of sides, stock and shimmed, builds a document with `PDFDocument.create`, adds
pages and saves, since one process allows the onebuf shims one context; the gate compares the
pair as it compares the first, and it reaches the four page-tree and catalog factories. The
two `context` setters stay marked: each is empty by design (`fast-dict-onebuf.mjs:411`,
`fast-array-onebuf.mjs:289`), and nothing it does reaches the output.

**Verify.** The gate passes with two marks left; each newly reached member, broken through
the kit's `c43-fault.mjs`, fails it by difference; C67a's five faults still fail. The book
renders identically but for its dates.

**Landed.** `fast-sync-load.mjs` loses both `computeBufferSize` overrides, the `Size` name only
they used and eleven imports; `pdf-lib-internals.mjs` loses the eleven exports no shim imports
any more (the four `core/document` classes, `PDFInvalidObject`, `PDFNumber`, `PDFStream`,
`PDFCrossRefStream`, `PDFObjectStream`, `PDFStreamWriter` and `last`), keeping 33. The shim's
header, which said eight methods and listed nine, `render-book.mjs`'s summary and
Fixes-PDFLib.md now name the seven it replaces, and say the writers' own `computeBufferSize`
stay as pdf-lib has them.

The side keeps its job's shape: a null `fixture` builds the document with `PDFDocument.create`
(both dates set to the fixed one, two pages added, text drawn on one, a third inserted at 0),
and sizes nothing, so the onebuf shims keep their initial capacities (2.4 million dictionary
slots, 800,000 array slots). Then it calls `PDFCatalog.fromMapWithContext` on a copy of the
catalog's map and registers the result (see Where the plan was wrong). The loaded document's
change ends with a registered `/Found` dictionary holding what `values`, `entries`, `asMap`,
`has` (one of them on a null value), `indexOf`, `asArray` and `getObjectRef` (one of them for a
generation-1 object) return, a null standing for an index or reference not found, and
`misc.toString()` as a hex string, which calls a dictionary's, an array's and a reference's
`toString`; then both clones are registered, and each clone and its original edited after the
copy, which also calls an array's `set`. The fixture's object 0 is removed by the parse on both
sides. The gate runs the four sides at once, compares each pair, runs the diagnosis for a
document that differs, and counts a member as run if it ran in either shimmed side. Only the
two `context` setters stay marked.

Now: `stock pdf-lib and 12 shims with parallelSave write the same 25 objects for a loaded
document and the same 11 for a created one; the 72 members the shims patch are as listed, and
all ran but the 2 marked`, about 0.5 s. The kit's `c67b-faults.mjs` breaks each of the 18
newly reached members, and each fault exits 1 by a difference in the document that reaches it,
with the diagnosis naming that member's shim alone; the `delete` fault keeps object 0, which
shifts every entry of the object stream. C67a's five faults still exit 1 (`c67a-faults.mjs`,
its `runs` case now setting a dictionary's `context`, since `has` is no longer marked). The
gate's header and help, Tools.md's section and WIP.md's table describe the created document.
The book, rendered from one `_site-pdf` through HEAD's `book/` and the working one: 2,299 pages
and 2,466 outline entries each, identical but for `/CreationDate` and `/ModDate`, whose object
stream deflates a byte longer (29,132,071 and 29,132,072 bytes); 85-103 s a render, `process:
1.1s`-`1.2s`. HEAD's first render, which ran beside `test.bat`, differed from its second in 34
objects, all Chromium's structure-node ids shifted by one (`/ID (node00151028)` against
`node00151029`): two renders of one tree are not always byte-identical, so a render pair that
differs outside its dates needs a repeat render before the change is blamed. Lint `Checked 169 files`; regex safety unchanged. `compare_trees`: Fixes-PDFLib and
Tools online and offline, the search data and `book.html`. CI waits for the owner's push.

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

**A9-1 (R2).** The twelve production shims (thirteen before C65b) each guard against being installed twice and
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
interpreter fails the gate and never skips it. **The owner settled it on 2026-09-25:**
without Python, `test.bat` reports the gate skipped, loudly, and passes. The gate tells the
two cases apart by the `CI` variable GitHub sets, not by an argument, because
`check_ci_workflows` requires CI to pass each gate the wrapper's arguments unchanged. Registered in the composite action, Tools.md
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

## Open questions

Each is settled in the commit named, on the recommendation given there, unless the owner
decides otherwise:

- the exit value for a command-line error in `tbdocs` and `check_links.mjs`: C18 recommends 4;
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
