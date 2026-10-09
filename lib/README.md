# lib

Modules that every part of the repository's tooling may import: `builder/`,
`scripts/`, `book/`, `eval/`, `wisdom/` and `test/`. A module here imports none
of those folders -- only Node's own modules, installed packages and other
modules in `lib/` -- and `biome.jsonc` refuses an import that breaks the rule.

The folder exists because `builder/` may not import `scripts/`, which
`biome.jsonc` enforces too, and some code is needed on both sides of that line.
The one exception is `scripts/impexp.mjs`, named in `biome.jsonc`: it is a
published standalone tool that has to stay a single file, and the build packs
the help add-in's project file with it.
[markdown-files.mjs](markdown-files.mjs) is the first: it walks `docs/` for its
pages and decides which folders there are the build's output trees.

[markdown.mjs](markdown.mjs) says what in a page's source is code, from a
markdown-it block parse: every fence, indented code block and HTML block with
its lines, a mask that hides the code from a rewrite and restores it, the code
spans on a line, sections split on a marker line outside any code, and a line
map that keeps each line's ending. [frontmatter.mjs](frontmatter.mjs) splits
off a page's YAML frontmatter and parses it with the `js-yaml` the rest of the
tooling uses, and lists the values left unquoted that end in `#`, since YAML
reads a `#` after a space as a comment. `scripts/check_code_regions.mjs` carries the probes for both, and
checks on every page that the block parse finds what a full parse finds.

[repo-paths.mjs](repo-paths.mjs) is where every tool gets the repository root,
`REPO_ROOT`, and `docs/`, `DOCS_DIR`, so each runs the same from any folder.

[cli.mjs](cli.mjs) reads a command line against a table of options, over
`node:util`'s `parseArgs` (`parseCli`), strictly: an unknown option, a
boolean given a value, a value flag with no value, an empty value and an
unexpected positional are all errors. It throws a `CliError` naming the
problem, which `withUsageError` prints with exit code 2. It also reads a value
that must be a number, one of a set, a regular expression, a URL or a date
(`numberOption`, `choiceOption`, `regexOption`, `urlOption`, `dateOption`),
refuses options that exclude each other (`refuseTogether`), prints a usage
text and exits 0 (`printHelpAndExit`), prints a message and exits with a
given code (`die`), and makes a crash exit 2 (`exitOnCrash`).
`scripts/check_cli.mjs` carries its probes and the tools' recorded
command-line cases.

`scripts/check_tree_fresh.mjs` counts `lib/` among the inputs that decide the
built bytes, beside `docs/` and `builder/`, so an edit here marks every built
tree stale, and `check.bat` and `book.bat` refuse it until the next build.
