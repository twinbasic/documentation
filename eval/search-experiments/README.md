# Site search experiments

The scripts behind the measurements in [WIP.Search.md](../../WIP.Search.md),
kept so the work can be reproduced and continued. They are research tools,
not part of the build or of `test.bat`. For the maintained tool, see
[eval/search_quality.mjs](../search_quality.mjs).

Generated data is not committed: the built `search-data.json` variants
(4–5 MB each) and the per-query result dumps (5–45 MB). The scripts
regenerate them.

## rounds/: design rounds 1–9

These decided the design that shipped in rollout steps 1–5: h3 entries,
folding generic sections, the `names`/`qualified` fields, the smart dot
split, keeping stop words, splitting dot runs, and the lazy build.
[rounds/README.md](rounds/README.md) is the round-by-round record, with a
summary table of every configuration measured. `*.log` holds the runs'
output, and the small `*.json` files hold derived findings: misses and
regression lists.

`eval.cjs` is the original harness. It takes `search-data.json` files and
builds its own copy of the client index:

```sh
node --expose-gc eval.cjs data-h2.json data-h3.json --worst 15
```

It expects `symbols.json` (a copy of a build's `docs/_site/tB/symbols.json`)
and the data files next to itself. To produce a data file for a
granularity, set `search.heading_level` in `docs/_config.yml`, run
`node builder/tbdocs.mjs --src docs --no-check --no-offline --no-pdf`,
copy `docs/_site/assets/js/search-data.json`, and restore the config.
`make-variants.cjs` derives the folded and retitled variants from an h3
file, and `config-b.cjs` and the `diagnose-*.cjs` scripts build the later
rounds' configurations on top. Paths inside them assume the files sit
together in one directory.

Note that this harness counts a bare name as correct if *any* page
documenting that name is hit. That turned out to be too lax; see intent/.

## intent/: reader-intent ground truth and the next fixes

These are the measurements behind WIP.Search.md's "Reader intent" section.
Each runs against a built `docs/_site`:

```sh
node eval/search-experiments/intent/intent_gt.mjs docs/_site        # tiers per bare name, doubtful cases
node eval/search-experiments/intent/eval_variants.mjs docs/_site    # X1/X2/X3/X1t and combinations
```

- `intent_gt.mjs` derives the tiered ground truth: type and language
  element, then member, then enum constant, then prose.
- `variants.mjs` holds the index and query variants (X1 exact-name field, X2
  page-title field, X3 all words first, X1t tiered exact fields) as
  modifications of `site_search.mjs`. That file, like `search_quality.mjs`,
  is a copy of the `eval/` file as of commit `641f1613`.
- `quick_combo.mjs` is a quick single-combination check.
- `run.log` and `run2.log` hold the runs' output.

## probes/: multi-word queries the eval doesn't ask

The eval's symbol queries are one word each. These scripts measure the
multi-word ground `WIP.Search.md`'s probes point at, against a build, with
whatever `EXP` knobs `eval/site_search.mjs` carries at the time:

- `spaced.mjs <out.json>`: every qualified symbol written as two words
  (`Printer Fonts`), and the top three for a list of probes.
- `kinds.mjs <out.json>`: every symbol written as its name and its kind
  (`MaxHeight property`, `Continue statement`), for the kinds the client
  counts as kind words, with hit@1 by kind. See `WIP.Search.md`'s "Fixed:
  kind words".
- `sets.mjs <out.json>`: every page's own multi-word title, typed as is
  (any entry of that page counts), and `<page title> <section title>` for
  the one-word section titles 20 or more pages share (`Form Events`;
  that section counts).
- `all.sh <label>`: the eval against its baseline, both scripts, and what
  got worse or better against a run labelled `base`. Output goes to
  `$OUT`.
- `knobs.patch`: the knobs the probe round measured (`plural`, `page=N`,
  `title=F`), as a diff against `eval/site_search.mjs`; apply it to
  reproduce the table in `WIP.Search.md`'s "Probes: whole titles".
