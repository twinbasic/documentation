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
plan's landed entries to what later work needs`. Line numbers are the
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

**Landed.** The premise was wrong; the change stands, restated (see [Where the plan was
wrong](#where-the-plan-was-wrong)). At HEAD, with `"details.section-links"` changed to
`"details.section-links-x"` in the first `PAGE_STATES` applier, `check_a11y.mjs` exits 2 after
8 s with the applier's error and leaves no Chromium running. `@puppeteer/browsers` subscribes
to Node's `exit` event for every launch (`lib/launch.js:178`) and kills the browser there
synchronously (`:232`): `taskkill /pid <pid> /T /F` on Windows (`:268`), a `SIGKILL` of the
browser's detached process group elsewhere (`:151`, `:283`). Linux was read, not measured.
What the failed run left was the browser's temporary profile, one
`%TEMP%\puppeteer_dev_chrome_profile-*` folder of 4.3 MB. Puppeteer deletes it only when the
browser process's own `exit` event arrives (`puppeteer-core`'s `BrowserLauncher.js:64`, `:82`),
and `process.exit` ends Node before that. A clean run left none. On 2026-09-26 the owner kept
C19 as planned and had the 211 such folders then in `%TEMP%` (389 MB, dated February to
September 2026) deleted.

`scripts/lib/browser.mjs` holds `launchBrowser`, `LAUNCH_ARGS` and `withBrowser(fn,
options)`. `LAUNCH_ARGS` is no longer exported, since nothing imported it. `axe-scan.mjs`
re-exports `launchBrowser` for the four `perf/` rigs that import it, and drops its `puppeteer`
import; `builder/link-check.mjs`'s comment, which said `axe-scan.mjs` owns puppeteer, now says
it loads puppeteer through `browser.mjs`. In `check_a11y.mjs`, `buildMatrix` now runs before
the launch instead of after it.
`sweep_a11y.mjs`'s header said `--recycle-every` restarts the browser; the code opens a fresh
tab, as its own comment says, and the header now says so too.

After the change the same failing run exits 2 with the same error and leaves no folder, and
no Chromium. `check.bat`'s a11y line is unchanged: `13 pages x 2 theme(s) x 2 viewport(s) + 8
state audit(s) checked: 0 violation(s), 42 incomplete check(s)`. `check_a11y_fingerprint.mjs`'s
self-test reports `60/60 audits identical -- gate PASSES` before and after. `sweep_a11y.mjs
--limit 4 --recycle-every 2 --theme light --viewport desktop` writes four records that match
HEAD's apart from `runMs`. `check_axe_patch_equiv.mjs` reports `20/20 colour values
identical`.

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

**Landed.** Reproduced first, after C19. `sweep_a11y.mjs --theme drak --viewport desktop
--limit 1` exited 0 and recorded `/404.html [drak, desktop]`. `--theme light --viewport tiny`
also exited 0, recording `[light, tiny]`: `setViewport(undefined)` does not throw, so the audit
ran at a size nobody chose. `check_a11y_fingerprint.mjs --pages /404.html` reported `1/1
audits identical -- gate PASSES` with either value.

`pick()` moved from `check_a11y.mjs` into `axe-scan.mjs`, exported, beside `THEMES`, and its
comment gained the viewport case. All three tools call it at module level, so the usage error
comes before any browser starts. `buildMatrix` throws for a theme not in `THEMES` or a
viewport that is not an own key of `VIEWPORTS` (`Object.hasOwn`, so `toString` is refused
too). `sweep_a11y.mjs` builds its own matrix, so the backstop covers the other two.

The six cases now exit 2 with one line each, `unknown --theme "drak"; expected one of light,
dark or both` or `unknown --viewport "tiny"; expected one of desktop, mobile or both`. A
scratch probe of `buildMatrix` got 60 entries by default and 30 for one theme or one
viewport, and a throw for `drak`, `tiny` and `toString`. Valid single values still run:
`sweep_a11y.mjs --theme dark --viewport mobile --limit 1` recorded `/404.html [dark, mobile]`,
and the fingerprint self-test with the same values passed. `check.bat`'s a11y line is
unchanged.

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

**Landed.** Before, both built `gantt.svg` files (at 0ba42460) named none of the three tasks
and had no Check band. After, each names all three once and has a Check band, and so do both
copies inlined into `BuildInfo.html`. `vendorAssets` charts in Spine: it runs on the main
thread after `discover`, and `markdownInit` waits for it. Check's colour is a pink (`#e59ac6`
light, `#b35c8c` dark); its label contrast is in the range of the other bars', and both themes
were looked at through puppeteer.

**At the owner's request, a task the chart cannot draw fails the build**, so `Other` was not
added: nothing can reach it, and `COLORS.Other` and its `.gb-other` rules are gone.
`groupGanttTimings` throws for a task with no section, and `renderGantt` for a main-thread
task whose section has no band or a worker task whose section has no colour. With each defect put back
by a scratch edit, the check fixture's build exited 1 with `gantt: task vendorAssets has no
section; add it to GANTT_SECTION`, and with `gantt: the chart has no place for task checkBook
in section "Check"`. Without `--check` the Check tasks are not charted, so the second fails
only a checked build, which `build.bat` and both CI workflows are. WIP.md's gate table gains
the check beside nav integrity; Tools.md lists no build-internal checks, so nothing is
registered there.

Docs: Builder.md's `Other` sentence rewritten and `vendorAssets` moved from Seeds to Spine in
its section list; Extending.md's row on Gantt sections rewritten, its counts corrected (32
static tasks, 30 in the map, none setting `ganttSection` on its definition, where it said 31,
28 and `dispatch`); Pipeline-Stages.md's `ganttSection` values gain `Check` and `renderGantt`'s
row says it throws; BuildInfo.md's alt text says five bands. `Builder.md:410`, re-read (now
`:409-413`): the `Other` sentence was the one the entry named; the paragraph's claim that
boot timings form a row group of their own, and more in the section lists above it, is wrong
and is recorded under Found while implementing.

`compare_trees` replaces the chart whole, so it cannot see this change; the built chart is the
oracle. It exits 1 on the four edited pages, online and offline, the search data and
`book.html`, and BuildInfo.html's difference is its alt text. `check.bat`'s a11y line is
unchanged (0 violations, 42 incomplete), though BuildInfo.html is in the sample and the chart
gained four labels. `test.bat` and lint pass.

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

**Landed**, with one change of shape. Exporting the table and `splitSrcset` would have left a
second copy of the loop over them in `crawl_check.mjs`, including which attribute is a
srcset. So `link-check.mjs` exports one function instead, `forEachLink(name, attribs, fn)`,
which walks the table and splits a srcset; `extractFromHtml` and `crawl_check`'s tag handler
both call it, and the table and `splitSrcset` stay private. `crawl_check`'s id capture is
unchanged. Tools.md's paragraph says it follows every link the build's check follows.

`extractFromHtml` gives the same results: a scratch script ran HEAD's copy and the edited one
over every `.html` file in the three built trees, the check fixture's trees and the fixture
below (2,414 files, 1,777,900 links), with every option on and with every option off, and no
field of any result differed. `check_links_diff.mjs --a script --b fused` found no
differences across 6 cases.

The tool takes a start URL, so both runs used a scratch static server on `127.0.0.1` that
resolves a path as `serve.mjs` does and, as GitHub Pages does, redirects a folder URL without
its trailing slash to the slash form. Without the redirect, 626 links came back broken, all
from folder pages fetched without the slash; an agent confirmed the redirect on both live
sites (a 301 with an absolute `Location`), and found no GitHub documentation of it. Node's
server also closes an idle keep-alive socket after 5 s, which failed 30 fetches until the
scratch server kept its sockets longer.

Against the built site, with `--skip-external`, before and after: 1,247 pages crawled, 3,228
unique links, 0 broken, 0 missing anchors, the two reports identical apart from the elapsed
time. The site uses none of the newly followed attributes: nothing in `_site` has a `srcset`,
`poster`, `cite`, `action`, `data` or `longdesc`. So the fixture carried the test: one page
with a missing target for each of the table's 26 pairs, 28 URLs in all, since both srcsets
list two. Before, 5 broken (`a`, `link`, `img src`, `script`, `iframe`); after, all 28, the
srcset and poster targets included. `compare_trees`: Tools.html online and offline, the search
data and `book.html`, nothing else. Two defects found on the way are recorded under Found
while implementing.

### C22a — `scripts: crawl_check sets its exit code instead of calling process.exit`

**Found while verifying C22; the owner asked on 2026-09-26 for it to be fixed before C23**
(see Found while implementing). `crawl_check.mjs` ended `main()` with `process.exit()` straight
after printing its report, and its crash handler called `process.exit(2)`. On Windows (Node
24.13.0) that can abort on a libuv assertion, `!(handle->flags & UV_HANDLE_CLOSING)` in
`src\win\async.c:76`: the report is complete, and the exit code is 0xC0000409 (Git Bash shows
127) instead of 1.

**Change.** `main()` sets `process.exitCode` and returns, and the crash handler sets it to 2.
The two usage exits stay, since they run before any fetch. The header and Tools.md's
paragraph give all three exit codes: a missing anchor exits 1 as well.

**Landed**, with one addition. With `process.exit` gone, a crawl of the site printed its
report at 66 s and never exited: idle, its CPU time flat, 90 connections to the server still
established, until it was stopped 269 s later. `crawlOne` GETs every same-site URL but read
the body only of an HTML page answered 2xx, and an unread body keeps its connection busy;
`process.exit` had been cutting that short. `discardBody` now cancels every body that is not
read, in `crawlOne` and after `checkUrl`'s HEAD and GET.

The assertion does not need unread bodies. On scratch probes against the fixture server, 28
concurrent fetches followed by `process.exit(1)` aborted 10 times of 10 with or without
cancelling the bodies, and one fetch, read or unread, exited 1 all 10 times. What else it
needs is not established: HEAD's crawl of the site reaches `process.exit` with those 90
connections open, and did not abort in C22's four runs.

Against the C22 fixture, through the kit's static server with `--skip-external`: before, 5
runs of 5 aborted after reporting 28 broken; after, 10 of 10 exit 1 with 28 broken and no
assertion, the process ending 25–30 ms after its report. Against the site, three runs after:
exit 0, 1,247 pages crawled, 3,228 unique links, 1,247 status checks, 0 broken, 0 missing
anchors, as in C22's runs, in 66 to 79 s, ending 26–43 ms after the report. A crash
mid-crawl, injected by a preload that makes `Response#url` throw from its 200th read so that
`crawlOne` throws outside its `try` blocks with other fetches in flight: HEAD's copy aborted
5 of 5 with 0xC0000409, and after, 5 of 5 exit 2, about 40 ms after the error. An unknown flag
and a missing URL exit 2, as before. `compare_trees`: Tools.html online and offline, the search
data and `book.html`, nothing else.

### C22b — `builder: serve.bat redirects a folder URL to its trailing slash`

**Found while verifying C22; the owner asked on 2026-09-26 for it to be fixed before C23**
(see Found while implementing). `serve.mjs`'s static handler answered a folder URL without its
trailing slash with the folder's `index.html`, where GitHub Pages answers 301 to the slash
form. A browser then resolves the page's relative links against the parent folder, one level
too high. The built site links 74 folder pages without the slash, e.g.
`../../tB/Modules/Collection` from Permanent-Links, so a `serve.bat` preview reached through
one of those links shows a page whose links are broken.

**Change.** When the only file that matches is the folder's `index.html` and the URL path
lacks its slash, answer 301 to the path plus `/`, keeping any query string.

**Landed.** `resolveFile` returns `{ file }` or `{ redirect }`. The `Location` is built from
the folder under the destination rather than from the request, percent-encoded segment by
segment, so a request for `//tB/Packages` redirects to `/tB/Packages/` and not to a host named
`tB`. The redirect carries the page's `no-store` cache header, so a browser does not keep it
after a folder page becomes a single-file one. A URL that names a page is served as before:
`/tB/Core/Dim` from `Dim.html`. No page under `docs/Documentation/` describes how the serve
resolves a URL.

Verified on a test serve (port 4393, `--dest docs/_serve-c22b`, through a temporary
`.claude/launch.json` entry; both removed afterwards). Before, `/tB/Packages`,
`/tB/Modules/Interaction` and `/tB/Packages/CEF` answered 200. After, each answers 301 to its
slash form and the slash forms 200; `/tB/Packages?x=1&y=2` redirects to
`/tB/Packages/?x=1&y=2`, and a temporary folder named `Ä b` to `/%C3%84%20b/`.
`crawl_check --skip-external` against HEAD's serve: 1,850 pages crawled, 3,831 unique links,
623 broken, of which 603 were HTTP errors, such as a 404 for `/Core/Attributes`, and 20 were
`fetch failed`, and 2 missing anchors. After: 1,247 pages crawled, 3,228 unique links and 0
missing anchors, as in C22's crawl of `_site`, and 20 broken, every one a `fetch failed`
caused by `read ECONNRESET`, and none an HTTP error. The resets are a separate defect,
recorded under Found while implementing: with the serve's keep-alive timeout raised as a
scratch experiment, two crawls of two had none. `compare_trees`: identical.

### C22c — `docs: Builder.md's task sections match the chart and the task graph`

**Found while re-reading Builder.md's Gantt paragraph for C21; the owner asked on 2026-09-26
for it to be fixed before C23** (see Found while implementing). "Task DAG by section" says the
chart's five sections organise its discussion, and disagreed with the chart and with `TASKS`:
the lists put `discover` in Seeds and `warmInit` and `renderEnvInit` in Seeds and Render; the
Seeds discussion said a seed has no predecessors and listed `scss`, `prepDest` and
`prepPageDirs`, which have; the Spine sketch drew `loadData → highlighterInit` off `discover`;
and the Gantt paragraph put the start-up bars in a row group of their own, and a lane's bars
in completion order.

**Change.** The five lists follow `GANTT_SECTION`, and a sentence says `warmInit` and
`renderEnvInit` are in none of them. Each task's bullet and its row in What runs where move
under its chart section; the two per-lane start-up tasks are described under Render. The
Seeds introduction says which seeds wait for another task, the Spine sketch is redrawn from
`expected`, and the Gantt paragraph says where the bands and the start-up bars are drawn.

**Landed**, with three additions. The Render sketch drew the `flush:i` column feeding
`renderJoin`; it is redrawn with each `render:i` feeding `renderJoin` and each `flush:i`
feeding `flushJoin`, as `dispatch` wires them. `vendorAssets`, in the Spine list, had neither
a bullet nor a row in What runs where, and gains both, from Pipeline-Stages.md's section. And
the table, which says it lists every task, had no row for the three Check tasks. Every edge
in the two sketches was checked against `expected` and `dispatch`'s dynamic edges (the Spine
sketch leaves out `deriveRedirects → dispatch`, which `markdownInit` implies), every section
against `GANTT_SECTION`, and the Gantt paragraph against `gantt.mjs` (the four bands, a lane's
bars sorted by `workerStart`, the `cold` / `warm` / `env` labels) and `tbdocs.mjs` (no
cold-start bars on a rebuild; the `Join` tasks skipped). A scratch script confirmed the
sketches' vertical connectors line up. `scheduler-dag.dot` already draws `config →
highlighterInit → loadData`. Extending.md's account of the four surfaces still holds.
Pipeline-Stages.md files the same tasks by stage rather than by chart section, which is
recorded under Found while implementing. `compare_trees`: Builder.html online and offline, the
search data and `book.html`, nothing else.

### C22d — `scripts: crawl_check retries a request that fails before any response`

**Found while verifying C22b; the owner asked on 2026-09-26 for it to be fixed before C23,
with two retries** (see Found while implementing). A crawl of `serve.bat` reported about 20
links broken with `fetch failed`, each caused by `read ECONNRESET`: the serve closes an idle
keep-alive connection after Node's default 5 s, `fetch` reuses one just as it closes, and
`crawl_check` reported the first failure as the link's.

**Change.** `fetchWithTimeout`, which every request goes through (`crawlOne`'s GET,
`checkUrl`'s HEAD and its GET after a 405 or 501), becomes `fetchWithRetry`: when `fetch`
rejects, whether reset or timed out, it tries twice more, each attempt with the full
`--timeout`, and throws the last error. An HTTP error status is a response and is not
retried, and neither is a failure while reading a body. The header and Tools.md's paragraph
say so.

**Landed.** A test serve (port 4393, `--dest docs/_serve-c22d`, through a temporary
`.claude/launch.json` entry; both removed afterwards), crawled with `--skip-external` through
the kit's `crawl-tally.mjs`: before, exit 1 with 10 broken, every one a `fetch failed` from
`read ECONNRESET` (the twelfth session's crawls had 20, 21 and 20); after, two crawls, each
exit 0, 1,247 pages crawled, 3,228 unique links, 0 broken and 0 missing anchors, while the
preload logged 20 failed attempts in each, all `read ECONNRESET`. A scratch server, the kit's
`c22d-retry.mjs`, resets the first two requests to `/r2` and `/h2` and the first three to
`/r3` and `/h3`, and never answers `/slow`; the crawl runs with `--timeout 1000`, and the `r`
paths are same-origin GETs, the others cross-origin HEADs. HEAD's copy requested each path
once and reported all five. After, each path was requested three times: `/r2` and `/h2`
succeeded on the third, and `/r3`, `/h3` and `/slow` were reported, the last as `timeout`. The
C22 fixture through the kit's static server: three runs of three exit 1 with 28 broken, as
before. A host that never answers now costs three timeouts, 45 s at the default, before its
link is reported. `compare_trees`: Tools.html online and offline, the search data and
`book.html`, nothing else.

### C22e — `docs: Pipeline-Stages.md's task sections match the chart and the task graph`

**Found while fixing Builder.md's copy of the same lists in C22c; the owner asked on
2026-09-26 for it to be fixed before C23** (see Found while implementing). Extending.md says
each task's `###` heading on the page sits under the numbered section matching its Gantt
section, and eight did not: Section 1 (Seed tasks) held `scss`, `dot`, `prepDest` and
`prepPageDirs`, Section 2 (Spine) `loadData` and `dispatch`, and Section 3 (Render fan-out)
`flush:i` and `flushJoin`. Section 1 also held `warmInit`, which the chart draws as a start-up
bar in each worker's row, and its introduction said its tasks have no predecessors.

**Change.** Each `###` section moves under its chart section, in Builder.md's order, and
`warmInit` joins `renderEnvInit` under Render, as in Builder.md; the four introductions say
what each section now holds. No heading's text changes, so every anchor keeps its id.
Extending.md's rule gains the case the chart gives no section: a per-lane start-up task goes
under Render.

**Landed**, with three additions. `markdownInit`'s `expected` line lacked `deriveRedirects`,
which it waits for only to count the redirect stubs for the `{{tbdocs:...}}` counts
(`tbdocs.mjs:598-599`), and its prose did not mention the counts; both are corrected, and so
is `deriveRedirects`'s list of consumers. `renderJoin` unblocks `symbolIndex` as well as
`searchData` and `writePdf`, and `flushJoin` unblocks `linkJoin` as well as `writeAux` and
`writePdf`. And `highlighterInit` gains the `expected` block that every other task with a
predecessor has. A scratch script moved the sections and would not write unless the region's
non-blank lines came out the same multiset; `git diff --color-moved` shows no other line
changed. The kit's `c22e-verify.mjs` checks the page against `tbdocs.mjs`: each block's
section against `GANTT_SECTION`, with `render:i` in Render and `flush:i` in Write as
`dispatch.submit` gives them and the two start-up tasks in Render; each `expected` line
against `TASKS`; and a block for every static task. On HEAD's page it reports 10 problems,
nine misplaced blocks and `markdownInit`'s line; after, none. `build.bat`'s link check passes,
so no link into the page lost its anchor. `compare_trees`: Extending.html and
Pipeline-Stages.html online and offline, the search data and `book.html`, nothing else. Two
defects found on the way are recorded under Found while implementing.

### C22f — `docs: export tables for counts.mjs and page-baseline.mjs`

**Found while fixing Pipeline-Stages.md's task sections in C22e; the owner asked on
2026-09-26 for it to be fixed before C23** (see Found while implementing). The page says its
second half covers every module, with the full export table for each, and had none for
`builder/counts.mjs` or `builder/page-baseline.mjs`.

**Change.** A `counts.mjs` section after `render.mjs`'s, since `countPlugin` is the last
plugin `createMarkdownIt` applies, and a `page-baseline.mjs` section after
`symbol-baseline.mjs`'s, the other drift guard: every export, in the order the module declares
them, in the neighbouring tables' form.

**Landed.** A Sonnet agent drafted both tables from the modules, and every row was checked
against the source; five were corrected. `validateCountNames` returns a message per unknown
reference, not per name, and offers the nearest known name only within an edit distance of
three (`counts.mjs:251-258`). `countPlugin` runs after `replacements` because its core rule is
pushed last, not because it is the last plugin. `checkPageBaseline`'s row is rewritten so that
each case reads on its own (`page-baseline.mjs:120-175`). `GUARDED_SRC` is passed in the two
scripts' probes rather than building fixtures. And `deriveCounts`'s folder-style indexes are
reference pages, not only classes. Nothing imports `COUNT_NAMES`, which is recorded under
Found while implementing. `compare_trees`: Pipeline-Stages.html online and offline, the search
data and `book.html`, nothing else.

### C22g — `builder: tbdocs.mjs's task-graph comment points to TASKS and the docs`

**Found while checking C22e's edges; the owner asked on 2026-09-26 for it to be fixed before
C23, with a pointer rather than a correction** (see Found while implementing). The comment
above `TASKS` described the graph in prose, and contradicted `TASKS` in three places.

**Change.** The prose goes. The comment says that `TASKS`, with the `render:i` and `flush:i`
tasks `dispatch.submit` adds, is the graph, and names Pipeline-Stages.md and
`scheduler-dag.dot` as its descriptions; the sentence on `runBuild()` stays. No page cites the
comment.

**Landed.** A comment-only change: `compare_trees` identical, lint clean.

### C22h — `builder: delete counts.mjs's unused COUNT_NAMES`

**Found while checking C22f's table; the owner asked on 2026-09-26 for it to be deleted
before C23** (see Found while implementing). `COUNT_NAMES` called `deriveCounts` with an empty
state at module load, and nothing read it: `validateCountNames` checks a page against the
keys of the counts it is given, and `countPlugin` substitutes from the same object.

**Change.** The export goes, with its row in Pipeline-Stages.md's table and the clause of the
`deriveCounts` row that named it. It was the only call that omitted `extra`, so `extra`'s
default and the `?? 0` behind `redirectStubs` go too, and the JSDoc and the table's signature
make `extra` required; `tbdocs.mjs:606`, the one caller left, always passes it. Extending.md
says instead that the returned object's keys are the names a page may use.

**Landed.** `compare_trees`: Extending.html and Pipeline-Stages.html online and offline, the
search data and `book.html`, nothing else. Lint clean.

### C22i — `scripts: crawl_check reports a page whose body cannot be read`

**Found while implementing C22d; the owner asked on 2026-09-26 for it to be fixed before C23,
with no retry** (see Found while implementing). `crawlOne` recorded a same-site page as
reachable before reading its body, and returned in silence when the read failed: the page's
links were never extracted, its ids never indexed, and the report said nothing.

**Change.** When the read fails, `crawlOne` records the page broken, with its status and the
error prefixed `body:`, and returns. It does not retry: the server has answered, and C22d's
retries already cover the common reset, which comes before any response. The part of the body
that arrived is not parsed. The header and Tools.md's paragraph say so.

**Landed.** The kit's `c22i-body.mjs` serves `/`, linking `/cut` and `/ok`; `/cut` answers
200 `text/html` with a `Content-Length` of 5000, sends a link to `/missing` and closes the
socket 50 ms later. HEAD's copy: exit 0, 3 pages crawled, 2 unique links, 3 status checks, 0
broken and 0 missing anchors. After: exit 1, the same counts with 1 broken, `[ERR  body:
terminated] http://localhost:4395/cut`, where `terminated` is undici's message. Both requested
each of `/`, `/cut` and `/ok` once and `/missing` never. The kit's `c22d-retry.mjs` gives
C22d's result unchanged: each failing path requested three times, `/r2` and `/h2` recovering,
and `/r3`, `/h3` and `/slow` reported. The C22 fixture through the kit's static server: three
runs of three exit 1 with 28 broken. `compare_trees`: Tools.html online and offline, the
search data and `book.html`, nothing else. Lint clean.

### C22j — `scripts: crawl_check's --timeout covers a page's body`

**Found while implementing C22i; the owner asked on 2026-09-26 for it to be fixed before
C23** (see Found while implementing). `fetchWithRetry` cleared its timer once `fetch`
resolved, which is when the headers arrive, so `--timeout` did not bound the read of a page's
body, and a body that stalled after its headers held the crawl until undici gave up.

**Change.** Each attempt passes `AbortSignal.timeout(timeoutMs)` as its signal, so the timeout
runs on through the body. Such a signal fails with a `TimeoutError`, not an `AbortError`, so
the three places that record an error take its text from one function, `errorText`:
`timeout` for a timeout, the error's message otherwise. A body still arriving when the time
runs out is reported `body: timeout`, without a retry, as C22i decided for a body that breaks
off. The header, the retry comment and Tools.md's paragraph say so.

**Landed.** The kit's `c22i-stall.mjs` serves `/`, linking `/stall` and `/ok`; `/stall`
answers 200 `text/html` with a `Content-Length` of 5000, sends a link to `/missing`, then
sends nothing and keeps the socket open. With `--timeout 1000`, C22i's commit exited 1 after
305.6 s, reporting `[ERR  body: terminated]` for `/stall`; after, it exits 1 after 1.2 s,
reporting `[ERR  body: timeout]`. Both requested each of `/`, `/stall` and `/ok` once and
`/missing` never. `c22i-body.mjs` still reports `body: terminated` for `/cut`;
`c22d-retry.mjs` gives C22d's result unchanged, `/slow` reported as `timeout`; and the C22
fixture gives three runs of three exit 1 with 28 broken. A crawl of the built site through
the kit's static server: exit 0, 1,247 pages crawled, 3,228 unique links, 0 broken and 0
missing anchors in 88.8 s, so the default 15 s, which now covers each body, stopped no page.
`compare_trees`: Tools.html online and offline, the search data and `book.html`, nothing
else. Lint clean.

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

**Landed.** Waiting for `'close'` also means `out` holds all of tbbuild's output when its JSON
is parsed, which `'exit'` did not promise. The handler is `die`, installed at the bottom
beside `main().catch`, whose body it takes over; the probes' `fakeLane` already has a
parameter named `crash`. A scratch edit pointed the spawn at `C:\no-such-folder\node.exe`,
run with `--jobs 1 --only "^Reference/Core/"` (186 samples from 87 pages in 12 projects).
HEAD: exit 1 after 3.6 s, on Node's own report of the uncaught `spawn
C:\no-such-folder\node.exe ENOENT`, which `examples.bat` reads as a sample that does not
compile, and nothing tidied. After: exit 2 after 3.4 s, `check_examples: spawn
C:\no-such-folder\node.exe ENOENT`, from `main()`'s catch around the lanes, which finishes
the tidy. A scratch throw from `process.nextTick` and a scratch rejection that nothing
awaits, each in `buildStaged` before the spawn, exit 2 through `die` with the error printed.
A read-only snapshot of the keys the tidy covers (`reg export` of the IDE's settings key and
the two association keys) came out identical around every run; in the failing runs no IDE
starts, so HEAD leaves the registry as found as well, and the full run is what shows the tidy
still puts it back. `examples.bat`: exit 0 after 122.2 s, `1129 sample(s), 1129 compile, 0
finding(s), 120.2s -- clean`, from 597 pages in 43 projects on 4 lanes, the snapshot
identical before and after. A lane that fails while another builds was checked as well,
because the catch then tidies while the other lane's IDE still runs, which `finishTidy`'s
comment forbids: with lane 1 failing 6 s in on two lanes, the run exited 2 after 9.8 s, no
tbbuild or IDE process was left, and the snapshot was identical, because Node ends the
children it spawned when it exits, and they end theirs (`tb-ide.mjs:145-150`).
`compare_trees` identical. Lint clean.

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

### C25a — `scripts: tbrun reports a codegen failure that Debug.Cls erased`

**Found while verifying C16; the owner chose this fix on 2026-09-25** (see Found while
implementing). When a procedure the probe calls fails code generation, the compiler logs
`[LINKER] compilation (codegen) error` straight after `[BUILD] Executing
'<project>.<module>.<Sub>'...`. The probe's first statement, `Debug.Cls`, erases that line,
and the probe prints up to the call and stops. `tbrun` exits 0 with the partial output.

**Change.** Before it presses Build, `tbrun` wraps the IDE page's global
`clearDebugConsole()`, so each call first saves the lines it is about to erase, read the
way `readConsole` reads them. In BETA 983's `ide/main.js` the compiler's clear event
(`event_clearDebugConsole`) and the Clear command both call that function by name, so the
wrapper sees every clear. After the run, a `BUILD_FAILED` line in a saved segment after the
last `[BUILD] Executing` line makes `tbrun` exit 2, naming that line and printing the
partial output. An IDE page without `clearDebugConsole` is refused, as one without
`dataNodes` is today. Probes keep `Debug.Cls`: nothing asked of a probe changes. `tbrun`'s
header, Tools.md's paragraph and WIP.Harness.md's bullet on failed builds name the case.

**Verify.** Harness runs, one at a time: probe C (the shift in a procedure the probe calls),
before `exit 0` with `before` as its output, after `exit 2` naming the codegen line; probe A
(the shift in the `[RunAfterBuild]` Sub) still `exit 2`; a clean probe still `exit 0` with
its output; and a clean probe that calls `Debug.Cls` twice `exit 0`, since a saved segment
with no failure line in it is not a failure.

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
  generation**, found while verifying C16. Scheduled as C25a; see its entry for the fix.

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
