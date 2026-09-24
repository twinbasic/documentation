# Documentation use-case evaluation

A harness for asking whether the developer documentation *works* --- whether somebody who
arrives with a goal can get it done --- as opposed to whether it is accurate.

The two questions are orthogonal, and only the first one was ever being asked.
[builder/REVIEW-DOCS-c9f2dfe0-a9d7638.md](../builder/REVIEW-DOCS-c9f2dfe0-a9d7638.md) audited
whether the prose still describes the code. It is a good audit and it cannot see any of this:
most findings from the first use-case round involve sentences that are individually true.
`Tools.md` correctly documented the remedy for a remote image; it was the wrong remedy for the
case the check mostly fires on. `Authoring.md` correctly told contributors to widen
`SOURCE_EXTENSIONS`; that advice reintroduces the exact defect the allowlist exists to prevent.

## Running a round

```sh
node builder/tbdocs.mjs --src docs              # the search index must be current
node eval/build_corpus.mjs --dest <corpus>      # mirror, with source stubbed unreadable
node eval/run_case.mjs --smoke --corpus <corpus> --site <snapshot> --out <dir>/smoke
node eval/run_case.mjs --corpus <corpus> --site <snapshot> --protocol repo \
    --goal <dir>/UC-56.goal.md --out <dir>/UC-56
```

Each case is **one goal** from [usecases.md](usecases.md), in a file of its own, and
nothing else. Never tell the evaluator what the case is testing or that a hazard exists.
`run_case.mjs` puts the evaluator-facing part of [protocol.md](protocol.md) in front of the
goal; the part below *For the orchestrator* names defects earlier rounds found, so it stays
out.

The runner starts the evaluator as its own `claude -p` process, so the Claude Code CLI has
to be installed and signed in (`claude auth status`). **Never run an evaluator as a subagent
instead** --- [the next section](#why-an-evaluator-is-a-separate-process) says why. Run
`--smoke` first: it checks the evaluator's isolation in one short session and exits 1 if
any of it fails. Each case leaves the prompt it was given, its whole session as
stream-json, its report and a `.meta.json` recording the model and the Claude Code version,
and prints the session's digest --- see [Reading the results](#reading-the-results).

**Pin the Claude Code build when a round re-runs an earlier one.** `--claude <exe>` names it;
without it the runner takes whatever `claude` is on `PATH`, which changes with every install.
Round 10 found 2.1.212 there, where rounds 8 and 9 had run the desktop app's bundled 2.1.280,
and passed that one's path instead.

**Snapshot the search index with the corpus**: copy `docs/_site/assets/js/search-data.json`
and `assets/js/vendor/lunr.min.js` beside it, and give every case `--site <snapshot>`.
`site_search.mjs` otherwise reads the live `docs/_site/`, and a rebuild during the round
--- a fix pass running alongside, say --- moves the ranks under the evaluators' feet. **Keep the
snapshot after the round**: the next round re-runs this round's queries against both indexes,
which is how a fix is measured apart from the evaluator (see [Reading the results](#reading-the-results)).

Cases are independent, so they run in parallel. Sixteen is comfortable; a case takes one
to two minutes.

**Two protocols.** The default one plays a developer working in the repository. The
**site-entry variant** plays a reader of `docs.twinbasic.com`, who never sees `README.md`,
`WIP.md` or `builder/`: Channel 2 starts at `docs/index.md` and the evaluator may open only
files under `docs/` --- `--protocol site` makes `docs/` the evaluator's working directory,
and nothing outside it can be read. Nothing else changes. Use it for anything about the
twinBASIC reference --- which is 80.9% of the index and was untouched until round 6 --- and
never compare a site-protocol run with a repo-protocol run of the same goal.

```sh
node eval/site_search.mjs "how do I add a build task"   # the site's real search box
node eval/site_search.mjs --composition                 # what the index is made of
node eval/transcript.mjs <dir>/UC-56.jsonl --calls      # a finished case's session again
node eval/nav_hops.mjs '^/tB/Modules/ErrObject/Number$' # hops by link from docs/index.md
node eval/nav_hops.mjs --from README.md '^/Documentation/Development/Tools$'
```

## Why an evaluator is a separate process

Rounds 1--7 ran each evaluator as a subagent of the session orchestrating the round. **A
subagent started in this repository receives that session's `CLAUDE.md`**, and the local
`CLAUDE.md` is one line, `@WIP.md` --- so the evaluator carried in its own context the file
`build_corpus.mjs` withholds from the corpus, and withholding it from the tree achieved
nothing. Measured before round 8: a freshly started subagent, asked without tools what
project instructions it had been given, quoted `WIP.md`'s first heading and confirmed that
it names `SOURCE_EXTENSIONS`, `check_code_regions` and `modules-dark.scss`. Renaming
`CLAUDE.md` for the spawn does not help, because the session has already read it.

Round 1's review records the opposite --- subagents "confirmed not to inherit `CLAUDE.md`"
--- and may have been right about the Claude Code of that week. It is not true now, and when
it stopped being true is not known.

**What that means for rounds 1--7.** Search ranks are unaffected: they are mechanical, and
every one quoted in a review was re-measured by the orchestrator. `WIP.md` can have supplied
the rest --- a cold guess, which page to open next, whether a hazard was walked into, how
complete an answer felt. It bears hardest on repo-protocol cases, because it is mostly about
the toolchain: it states the hazard, and usually the remedy, of UC-06, UC-14, UC-16, UC-56
and UC-58. Round 7 ran from the same app the day before, so read its three repo-protocol
hazard passes (UC-56, UC-57, UC-58) as unproven. Site-protocol cases are less exposed, not
clean: `WIP.md` also gives the `tB` executable's command-line rules, which is UC-55's
subject. The first two isolated runs, round 8's re-runs of UC-56 and UC-55, both passed
their hazards and scored higher than in round 7 --- so the fixes those cases prompted do
their work without the notes.

`run_case.mjs` starts `claude -p` inside the corpus instead, in safe mode, with read-only
tools, reads refused outside its working directory, and a single command allowed:
`site-search`, a shim it generates over the snapshot. Its header records why each of those
is there, including why the search box cannot be `node .../site_search.mjs` itself.

The process route also returns something the subagent route never did: **the whole
session**, every call in order, where a subagent hands back only its report. That is what
made the second finding of round 8 possible --- see [Reading the results](#reading-the-results).

## Why the corpus is a mirror

`build_corpus.mjs` replaces every non-prose file with an unreadable stub, so "documentation
only, no reading the implementation" is a property of the tree rather than an instruction.
That distinction is not pedantic: in the fix pass that followed round 1, two evaluators
declined instructions of mine that were simply wrong (one said the image files were
unreadable when they render; another predicted a table-of-contents change on a page that has
no table of contents). A capable evaluator that quietly reads the source measures how good
the *source* is, reports a clean pass, and tells you nothing.

Four of its decisions are deliberate and worth keeping:

- **What stays readable is an allowlist**, for the same reason
  [builder/publish-policy.mjs](../builder/publish-policy.mjs) holds one. A denylist of source
  extensions only refuses what somebody named in advance; add a `.ts` and it silently becomes
  readable with nothing reporting it. Read the `stubbed` line of the summary --- a new source
  type appears there the first time it exists.
- **`WIP.md` is withheld**, so "the answer exists only in the maintainer's private notes" is
  a measurable outcome instead of an invisible rescue. It is measured: round 1's two
  worst-scoring cases both had answers that existed only there or in an unpublished plan.
- **`eval/` and prior `REVIEW-USECASES-*.md` are excluded**, because this catalogue names the
  hazard each case probes and a past review names the answers.
- **Readable files are written with LF**, as the repository stores them. A Windows checkout
  hands the corpus CRLF, and a permalink grep anchored with `$` then matches nothing: round 9's
  UC-63 reported a working link as broken, three times, from exactly that.

Other `builder/REVIEW-*.md` files stay in. They are audit snapshots a real developer has, and
round 1 produced a genuine finding because one was present.

## Why search and navigation are scored separately

They fail on different pages, so either alone is misleading. `Extending.md` is search rank 1
and was six navigation hops away. `Tools#check-links-diff` is two navigation hops away and
was missed by four searches out of four.

The structural finding behind that: **`docs/Documentation/` holds about 4% of the search
index**, against 80.9% twinBASIC language reference which shares its entire vocabulary.
*Font*, *add*, *download*, *colour*, *build*, *image* and *style* are all twinBASIC API names,
so a developer-docs query competes with hundreds of reference pages. `--composition` prints
the current split. Nothing under `builder/`, `perf/` or `test/` is indexed at all.

## Reading the results

**Re-verify every finding against the file before recording it.** Round 1 produced 26
findings; seven needed amendment once someone read the source, every one in the direction of
the reviewer having overstated severity. Two examples, both instructive: `Fixes.md`'s claim of
"two third-party libraries" was correct, because the axe patch is applied in memory rather
than vendored; and a link-checker invocation reported as proving nothing does exercise the
fused checker, because the relevant cases are in `DEFAULT_CASES`.

The structural findings held up. The per-finding severity claims did not, reliably.

**Read the digest before the report.** An evaluator's account of its own channels is not
reliable either. Of the first two isolated runs, UC-56 searched the whole corpus for
`check_code_regions` before its first site search and then wrote "Channel 3: not needed";
UC-55 found its answer by search, read it, and only then walked the navigation path to
confirm the links. The digest `run_case.mjs` prints shows the order of every call --- a
line like `X R R f F L L L S S S S P R I I R` for UC-56 --- and flags a full-text search
before the first site search, and one the report says was not needed. Neither run's score
was wrong: UC-56's rank-1 query and its one-hop README link both check out. But a
discoverability score has to rest on what can be checked, the ranks and the links, and
never on the report's word for how the answer was reached.

## Rounds so far

| round | cases | outcome |
|---|---|---|
| 1 | 16 --- contributor, toolchain user, builder developer | [builder/REVIEW-USECASES-874896e.md](../builder/REVIEW-USECASES-874896e.md); 26 findings, 30 commits of fixes |
| 2 | 16 --- recovery, and the `/tB/` URL contract | [builder/REVIEW-USECASES-2e74de2.md](../builder/REVIEW-USECASES-2e74de2.md); 16 findings, ~35 commits of fixes |
| 3 | 8 --- the fixes, and gates that report success | [builder/REVIEW-USECASES-cd141f1.md](../builder/REVIEW-USECASES-cd141f1.md); 13 findings |
| 4 | 8 --- the failure path, and a fix pass auditing itself | [builder/REVIEW-USECASES-4f97bac.md](../builder/REVIEW-USECASES-4f97bac.md); 14 findings, six of them introduced by round 3's own fix pass |
| 5 | 8 --- the fixes again, and three unread surfaces | [builder/REVIEW-USECASES-4b50c0c.md](../builder/REVIEW-USECASES-4b50c0c.md); 15 findings, no hazard walked into, and discoverability flat across three re-runs |
| 6 | 8 --- a discoverability fix measured, and the reference half | [builder/REVIEW-USECASES-9b8e70c.md](../builder/REVIEW-USECASES-9b8e70c.md); 14 findings, the first non-compiling samples the harness has found |
| 7 | 8 --- the re-runs round 6 named, and the first executed case | [builder/REVIEW-USECASES-60bb6f5.md](../builder/REVIEW-USECASES-60bb6f5.md); 19 findings, no hazard walked into, UC-40's discoverability 1 → 4, and a tutorial describing a failure the product does not produce |
| 8 | 13 --- the first isolated evaluators: round 7's re-runs, round 1's four lowest, three new | [builder/REVIEW-USECASES-5b4cd37.md](../builder/REVIEW-USECASES-5b4cd37.md); 29 findings, no set hazard walked into, and the four most serious found by probing the product: an IDE export that empties a Git repository, constructors that fail in silence, error numbers that are not VBA's, and a debugger Stop that stops one procedure and so turns a failed unit test into a pass |
| 9 | 11 --- round 8's seven re-runs, and four new site cases, four of the eleven executed | [builder/REVIEW-USECASES-d4b37ec.md](../builder/REVIEW-USECASES-d4b37ec.md); 12 findings, the re-runs' discoverability +1.00 and round 8's own queries from 2 hits of 14 to 11, and an IDE export the tB executable cannot pack back into a project |

Round 1's headline was a gradient: documentation quality fell monotonically with depth into
the toolchain (contributor 3.8 discoverability, toolchain user 2.8, builder developer 1.8),
and was worst exactly where the project has written most --- because `builder/`'s 1.4 MB of
plan documents are not published pages and no reader-facing channel reaches them.

Round 6 added a second protocol and a second answer. Splitting its cases by which one
they used: **the developer documentation is hard to find and reliable once found
(discoverability 2.25, actionability 3.50); the reference is easy to find and its
examples do not work (3.25, 2.50).** Rounds 1--5 measured only the first, on 4.0% of
the search index. The reference is 80.9%.

Round 8's headline is where the findings come from. Its thirteen evaluators, the first that
could not read `WIP.md`, passed every hazard they were set and raised every re-run; the round's
four most serious findings were behaviours of the product that no page mentions, and every one
was found by checking an evaluator's answer against the product --- a probe, an executed case, an
IDE driven over DevTools --- because nothing in the corpus contradicts a page that is silent.

Round 5's headline is what four rounds of fixes have and have not bought. Re-running three
cases across round 4's fix pass moved completeness +1.33 and actionability +1.34 and moved
discoverability **±0.00** --- the pages the fixes wrote are right, and nothing made them
easier to reach. **Only a re-run can show an axis failing to move**, which is a third thing
the instrument measures, after "the fix worked" (round 4) and "the fix pass broke something
else" (round 4).
