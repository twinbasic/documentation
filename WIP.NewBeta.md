# After a new twinBASIC BETA --- the checklist

What a new BETA asks of this repository, once it is installed on the Desktop (the tools take the
newest `twinBASIC_IDE_BETA_<n>` there). Each step names the file that holds its rules; this file
only puts them in order. None of it runs in a gate or in CI: every step needs the install.

1. **See what changed in the bundled packages**: `node indexer/twin-index.mjs sync --query
   --builtin` lists it and writes nothing. A built-in or default package whose public API changed
   is re-indexed as [WIP.Indexer.md, Rules](WIP.Indexer.md#rules) says (`sync --upgrade`,
   `analyze`, the pages, the bump, a plain `sync`, `derive`), and committed together.
2. **Check every callout labelled with an older build**: `node scripts/recheck_callouts.mjs
   --plan`, then the run ([WIP.Indexer.md, Rules](WIP.Indexer.md#rules)). It runs what each
   callout's marker names (reproducers, lanes, samples, error data, the LLVM and static-linking
   probes, package test cases), moves the label of each callout whose evidence still holds, and
   lists the rest. A callout whose defect the new build fixed goes, and the page states the
   correct behaviour (rule 6 in [WIP.Authoring.md](WIP.Authoring.md#plain-english-prose)). A
   full run takes hours; `--kinds` and `--only` cut it.
3. **Verify every reproducer**: `node scripts/bug_repro.mjs verify` says whether each entry of
   [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md) and `bugs/filed/` still reproduces. An entry whose fix
   is released and that no longer reproduces is deleted, with its callout
   ([WIP.BugHunt.md](WIP.BugHunt.md#reproducers)).
4. **Retire what the IDE hook no longer needs to fix**: each entry of `IDE_FIXES` applies only
   where the build still has the defect; a retired entry's fix leaves `IDE_FIXES` with its lane's
   `unfixed` ([WIP.Harness.md, Rules](WIP.Harness.md#rules)).
5. **Run the LLVM claims probe whole**: `node test/llvm/run.mjs`; for each difference, change the
   page that states the claim, then `--update`, and read the diff of `expect.json`
   ([test/llvm/README.md](test/llvm/README.md)).
6. **Check the IDE's `main.js` map**: `node scripts/ide_js.mjs check`, `seal` the map once each
   `review` and `lost` name has been looked at, and `keymap --check`, then `keymap --update` if
   the group changed ([WIP.Harness.md, Reading and patching the IDE's main.js](WIP.Harness.md#reading-and-patching-the-ides-mainjs)).
7. **Retake the IDE screenshots** that the new build changed, through the review tool
   ([WIP.ShotReview.md](WIP.ShotReview.md), [WIP.Screenshots.md](WIP.Screenshots.md#rules)).

A statement about the compiler in a contributed package's section names the newest build
([WIP.Contributed.md](WIP.Contributed.md#rules)), so step 2's relabelling covers it; one written
in prose rather than a callout is checked by hand.
