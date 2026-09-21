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
node builder/tbdocs.mjs --src docs            # the search index must be current
node eval/build_corpus.mjs --dest <path>      # mirror, with source stubbed unreadable
```

Then, per case: give an evaluator [protocol.md](protocol.md) with `<CORPUS_ROOT>` filled in,
plus **one goal** from [usecases.md](usecases.md) and nothing else. Never tell it what the
case is testing or that a hazard exists.

Cases are independent, so they run in parallel. Sixteen is comfortable.

**Two protocols.** The default one plays a developer working in the repository. The
**site-entry variant** plays a reader of `docs.twinbasic.com`, who never sees `README.md`,
`WIP.md` or `builder/`: Channel 2 starts at `docs/index.md` and the evaluator may open only
files under `docs/`. Nothing else changes. Use it for anything about the twinBASIC
reference --- which is 80.9% of the index and was untouched until round 6 --- and never
compare a site-protocol run with a repo-protocol run of the same goal.

```sh
node eval/site_search.mjs "how do I add a build task"   # the site's real search box
node eval/site_search.mjs --composition                 # what the index is made of
```

## Why the corpus is a mirror

`build_corpus.mjs` replaces every non-prose file with an unreadable stub, so "documentation
only, no reading the implementation" is a property of the tree rather than an instruction.
That distinction is not pedantic: in the fix pass that followed round 1, two evaluators
declined instructions of mine that were simply wrong (one said the image files were
unreadable when they render; another predicted a table-of-contents change on a page that has
no table of contents). A capable evaluator that quietly reads the source measures how good
the *source* is, reports a clean pass, and tells you nothing.

Three of its decisions are deliberate and worth keeping:

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

## Rounds so far

| round | cases | outcome |
|---|---|---|
| 1 | 16 --- contributor, toolchain user, builder developer | [builder/REVIEW-USECASES-874896e.md](../builder/REVIEW-USECASES-874896e.md); 26 findings, 30 commits of fixes |
| 2 | 16 --- recovery, and the `/tB/` URL contract | [builder/REVIEW-USECASES-2e74de2.md](../builder/REVIEW-USECASES-2e74de2.md); 16 findings, ~35 commits of fixes |
| 3 | 8 --- the fixes, and gates that report success | [builder/REVIEW-USECASES-cd141f1.md](../builder/REVIEW-USECASES-cd141f1.md); 13 findings |
| 4 | 8 --- the failure path, and a fix pass auditing itself | [builder/REVIEW-USECASES-4f97bac.md](../builder/REVIEW-USECASES-4f97bac.md); 14 findings, six of them introduced by round 3's own fix pass |
| 5 | 8 --- the fixes again, and three unread surfaces | [builder/REVIEW-USECASES-4b50c0c.md](../builder/REVIEW-USECASES-4b50c0c.md); 15 findings, no hazard walked into, and discoverability flat across three re-runs |
| 6 | 8 --- a discoverability fix measured, and the reference half | [builder/REVIEW-USECASES-9b8e70c.md](../builder/REVIEW-USECASES-9b8e70c.md); 14 findings, the first non-compiling samples the harness has found |

Round 1's headline was a gradient: documentation quality fell monotonically with depth into
the toolchain (contributor 3.8 discoverability, toolchain user 2.8, builder developer 1.8),
and was worst exactly where the project has written most --- because `builder/`'s 1.4 MB of
plan documents are not published pages and no reader-facing channel reaches them.

Round 6 added a second protocol and a second answer. Splitting its cases by which one
they used: **the developer documentation is hard to find and reliable once found
(discoverability 2.25, actionability 3.50); the reference is easy to find and its
examples do not work (3.25, 2.50).** Rounds 1--5 measured only the first, on 4.0% of
the search index. The reference is 80.9%.

Round 5's headline is what four rounds of fixes have and have not bought. Re-running three
cases across round 4's fix pass moved completeness +1.33 and actionability +1.34 and moved
discoverability **±0.00** --- the pages the fixes wrote are right, and nothing made them
easier to reach. **Only a re-run can show an axis failing to move**, which is a third thing
the instrument measures, after "the fix worked" (round 4) and "the fix pass broke something
else" (round 4).
