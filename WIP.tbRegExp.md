# tbRegExp --- working notes

The contributed tbRegExp package, documented at `docs/Reference/Contributed/tbRegExp/`. This file
holds what its section decided and what is known about the package beyond its pages; the rules for
every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

tbRegExp's section is drafted by the doc-draft workflow ([WIP.Indexer.md](WIP.Indexer.md#draft-and-the-doc-draft-workflow)) and reviewed against the sources, the package's README and VBScript's own **RegExp** under `cscript`. Its pattern syntax has a page of its own, `PatternSyntax.md`.

tbRegExp's `exclude_from_docs` names its private engine module, `StaticRegex`, whose Public Enums the indexer counts as public ([WIP.Indexer.md](WIP.Indexer.md#a-public-enum-inside-a-private-module)).

tbRegExp 1.9.0.0 raises `vbObjectError + 3016` from a search that uses up its step budget and returns nothing; the budget is 10 steps for each character squared, at least 1,000,000 and at most 100,000,000, for the search of one match, and `RegExp.SearchStepLimit` replaces it with a fixed number, documented on its own page and in a section of the landing page. On the dev box (BETA 1010, win32) `\d+x` costs 2.0 × n² steps (2.002 to 2.009 for 500 to 2,000 digits), so it finishes on 7,000 digits (16 s) and raises on 10,000 (16 s); `(a+)+b` raises in 0.2 s on 30 or 300 `a` but takes 16 s on 3,000; `a*` matches 1,000,000 characters whole in about half a second.
