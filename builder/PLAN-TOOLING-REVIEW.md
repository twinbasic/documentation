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
   migrations make, and it only adds a form.
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

## Open questions

Each is settled in the commit named, on the recommendation given there, unless the owner
decides otherwise:

- the exit value for a command-line error in `tbdocs` and `check_links.mjs`: C18 recommends 4;
- Biome or ESLint: C05's evaluation decides;
- whether `test.bat` without Python fails or skips `check_impexp_parity.mjs` loudly: C70,
  decision (b)'s open question, which the owner settled on 2026-09-25: it skips, loudly;
- whether the pre-commit hook should also run the dash check, which A6-3 assumed: the owner
  approved a hook that runs Biome only (C08), so it stays out unless the owner asks for it.

The two questions this plan started with are settled: the two link checkers (decision 5), and
the survey script, which is committed.
