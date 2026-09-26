# lib

Modules that every part of the repository's tooling may import: `builder/`,
`scripts/`, `book/`, `eval/`, `wisdom/` and `test/`. A module here imports none
of those folders -- only Node's own modules, installed packages and other
modules in `lib/` -- and `biome.jsonc` refuses an import that breaks the rule.

The folder exists because `builder/` may not import `scripts/`, which
`biome.jsonc` enforces too, and some code is needed on both sides of that line.
[markdown-files.mjs](markdown-files.mjs) is the first: it walks `docs/` for its
pages and decides which folders there are the build's output trees.

`scripts/check_tree_fresh.mjs` counts `lib/` among the inputs that decide the
built bytes, beside `docs/` and `builder/`, so an edit here marks every built
tree stale, and `check.bat` and `book.bat` refuse it until the next build.
