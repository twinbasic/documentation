# Tooling review: strategy, decisions and status

A software-engineering review of the repository's own tooling: `tbdocs`, the gates, the
compiler harness, the book renderer and the smaller tools. It asks about factoring and
repetition, and about sound design against hacks. That makes it a different kind of review
from [REVIEW-c9f2dfe0-1b6922b.md](REVIEW-c9f2dfe0-1b6922b.md), which asked whether one
range of commits was correct.

The findings will be written to `REVIEW-TOOLING-fe9ce12b.md`. The commit plan is added to
this file once they are in.

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
| `tbdocs` | Build before and after into scratch `--dest` folders with `--no-fetch-assets`; the three trees must match byte for byte. The first step is to show that two builds of one commit already match. Known differences to exclude: `assets/images/gantt.svg`, which holds the build's own timings, and the commit on the PDF title page. This becomes a committed tool (decision 3). |
| gates | The same output on the real tree; and a changed gate must still fail when its original defect is put back. |
| harness | The `examples.bat` summary unchanged (1,119 samples) and `addin-test.bat` green, against the local BETA 983. Never two harness runs at once. |
| book | Page count, outline and extracted text unchanged; the PDF's bytes include timestamps. |
| CI | A workflow dispatch on the fork, for any commit that changes a workflow. |

## Execution

Each phase lands as commits on `staging`, the working branch, which is merged upstream when a
chunk of work is done.

**Phase 0: process and oracles**, before any finding is fixed.

- The tree comparison tool (decision 3).
- The CI-roster gate (decision 6), with probes that make it fail on a deliberately
  mismatched workflow.
- The linter, lint rules only (decision 4):
  - Biome, pinned to an exact version, is the candidate: one package, `npm install` still
    enough to run everything. Confirm it on the tree before adopting it, counting findings
    and false positives on the mixed Node and browser code. ESLint is the fallback.
  - Scope: `builder/`, `scripts/`, `book/`, `eval/`, `wisdom/`, `test/`,
    `docs/assets/js/`. Excluded: `perf/`, the vendored code, generated JSON (the two
    baselines, `package-api.json`, `inter-metrics.json`), `package-lock.json`, and every
    Markdown, SCSS, YAML and `.bat` file.
  - Correctness rules only. No style rules until Phase 6.
  - Findings with a mechanical fix are fixed here. A rule whose findings need design work
    starts disabled, and the phase that fixes them enables it.
  - A gate in `test.bat` and both workflows; a `pre-commit` hook in a committed
    `.githooks/`, checking the staged files; the rule in WIP.md and Tools.md. Enabling the
    hook in a clone sets `core.hooksPath`, and that change to git configuration is
    confirmed before it is made.

**Phase 1: remove and relocate.** Move `census_attributes.mjs` out of `builder/`; declare
the two packages; delete the dead code the review identifies. Done ahead of it, during the
review: the four superseded pdf-lib shims deleted, and `perf/detach-pages.js` marked as
code the book build loads (decision 1).

**Phase 2: shared code, in place, with no change in behaviour.** Shared modules for what
the review finds repeated, adopted one tool at a time: argument parsing on `node:util`
`parseArgs` that preserves every tool's current flags and exit codes, paths and
configuration, the gates' self-test scaffolding, browser launching, and the helpers
`builder/` defines twice.

**Phase 3: conventions users see.** Flags, exit codes and help text brought into line,
with Tools.md updated in the same commit.

**Phase 4: splits.** A separate pass over the split candidates, taken only where the
evidence supports it (decision 2).

**Phase 5: documentation and measurement.** The Builder.md module map, Tools.md and
WIP.Build.md brought up to date; the survey re-run and compared with the baseline above.

**Phase 6: formatting** (decision 4), once every fix from the review is in.

- The formatter configured to the majority style and pinned to an exact version, with any
  style lint rules alongside it.
- Line endings settled so the check means the same on a CRLF Windows checkout and an LF CI
  checkout; otherwise every local run flags 118 files. Either a `.gitattributes` for the
  formatted file types or the formatter's own setting, shown to agree on both platforms.
- One mechanical commit, listed in `.git-blame-ignore-revs`. The tree comparison shows
  what it changed in the output; only the two published site scripts should differ.
- The gate and the hook extended to check formatting; WIP.md and Tools.md updated.

## The bar for each commit

- `build.bat && check.bat && test.bat` clean; after Phase 0, lint clean; after Phase 6,
  format clean.
- The commit's oracle from the table above, with every difference it shows explained in
  the commit message.
- A commit that changes a gate shows the gate still failing on its reintroduced defect.
- One concern per commit, with a concise one-line message.

## Open questions

None of the plan's own. Both that it started with are settled: the two link checkers
(decision 5), and the survey script, which is committed. The decisions the review raises are
listed in `REVIEW-TOOLING-fe9ce12b.md`.
