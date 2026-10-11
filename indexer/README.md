# indexer — twinBASIC package documentation pipeline

Reads the built-in and default twinBASIC packages from the local twinBASIC
install, downloads the community ones, extracts their source code, and
produces structured API snapshots (`api.json`) used to maintain the
reference documentation at docs.twinbasic.com.

## Prerequisites

- Node.js 20+
- Git (used by the package store)
- A twinBASIC install, for the built-in and default packages: the newest
  `twinBASIC_IDE_BETA_<n>` folder on the Desktop, or the one `--ide` or
  `TB_IDE` names. `sync --release` needs none: it downloads the latest
  GitHub release instead.
- Internet access for the community packages (TWINSERV), and for
  `--release` (GitHub Releases)

No `npm install` required — the indexer uses only Node built-ins.

## Quick start (fresh clone)

```sh
# From the repo root:
node indexer/twin-index.mjs sync
```

This does everything on the first run:

1. Creates `indexer/.packages/` as a local git repo (the "store").
2. Reads the built-in and default packages from the local twinBASIC
   install, and downloads all packages from TWINSERV (community).
3. Reads the sources of every package with the repository's shared
   twinBASIC scanner, `scripts/lib/twin-api.mjs` (the one the symbol
   index and the attribute census use too).
4. Generates an `api.json` snapshot per package ([described below](#apijson)).
5. Commits sources + snapshots to the store.
6. Copies `api.json` files to `indexer/snapshots/` (committed to
   the docs repo).
7. Updates `indexer/manifests/` (committed; tracks sync state).

Subsequent runs only download what changed.

## Commands

```sh
node indexer/twin-index.mjs <command> [options]
node indexer/twin-index.mjs --help
```

The command line is read strictly, as every tool in this repository reads
it: an unknown option, an option without its value or with an empty one, a
value given to an option that takes none, an unexpected argument and an
unknown or missing command are each refused, with the reason on standard
error and exit code 2. `-h` or `--help` prints the usage text to standard
output and exits 0 without starting anything. The usage text ends with the
exit codes below.

| Code | Meaning |
|------|---------|
| 0 | The command finished: `sync` wrote every package it was asked for, or found it up to date; `analyze` wrote its report. |
| 1 | A package named by `--package` or `--packages` failed to sync, or does not exist; the others were done. |
| 2 | A refused command line, no twinBASIC install found, no snapshots to analyze (run `sync` first), or a crash. |

`analyze` exits 0 whenever it writes its report, whatever the report lists:
the list of symbols to document is its product, not a failure.

### sync

```sh
node indexer/twin-index.mjs sync [--package <name>] [--packages <a>,<b>] [--ide <path> | --release]
```

Reads packages, extracts sources, generates `api.json` snapshots.

| Flag | Effect |
|------|--------|
| `--package VBA` | Sync only VBA. |
| `--packages VBA,ArrayListLib` | Sync multiple specific packages. |
| _(no flag)_ | Sync everything. |
| `--ide <path>` | Read the built-in and default packages from this twinBASIC install, given as its folder or its `twinBASIC.exe`. Without it: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop, found as `scripts/build_package_api.mjs` finds it. No path is built in. |
| `--release` | Download the built-in and default packages from the latest GitHub release instead of reading an install. Excludes `--ide`. |

`--package` takes one name and `--packages` a comma-separated list; the two
cannot be given together. A name that matches no package is reported and
makes the exit code 1. `--ide` and `--release` apply to `sync` alone.

The install is looked for before anything is fetched, and one that is not
there is refused (exit 2) with the options that would fix it. A run that
names only built-in or default packages does not ask TWINSERV at all, so
`sync --package VBA` works offline.

An install holds the same `packages/<folder>/package.twinproj` files as the
release zip of its build, so either source gives the same sources and the
same `api.json`, byte for byte.

A package is read again, whatever its manifest says, when its store has no
sources or holds an `api.json` in an older format than the indexer writes
(the `format` number below). The version in `api.json` is the release tag in both cases:
BETA 983 is `beta-x-0983`, as `indexed_from` in the package pages has it. The
BETA number is read from the install's `ide/build.js`, else from the name of
its folder.

**What it writes:**

| Path | Committed? | Contents |
|------|-----------|----------|
| `indexer/.packages/{group}/{pkg}/sources/` | No (gitignored) | Extracted `.twin` source files |
| `indexer/.packages/{group}/{pkg}/api.json` | No (gitignored) | Full API snapshot |
| `indexer/snapshots/{group}/{pkg}/api.json` | Yes | Copy of the above (survives cloning) |
| `indexer/manifests/contributed.json` | Yes | TWINSERV sync state |
| `indexer/manifests/built-in.json` | Yes | Built-in and default sync state |

`built-in.json` records which source the packages were read from and which
build: `source` is `install` or `release`, `beta` the BETA number and
`twinbasicTag` the release tag of that build, and `publishedAt` the release's
date (null for an install). It never records the install's path, which holds a
user name. A change of source reads the packages again even when the build is
the same.

### analyze

```sh
node indexer/twin-index.mjs analyze [--package <name>] [--packages <a>,<b>]
```

Compares the current API snapshots (from `sync`) against the
documented baseline and produces a change report.

Two modes, chosen automatically per package:

- **Update mode** — the package's `index.md` has an `indexed_from`
  field. Diffs the current `.packages/` api.json against the
  last-committed snapshot (`git show HEAD:indexer/snapshots/...`).
  Reports added, modified, and removed public symbols. A committed
  snapshot in an older format is not diffed; the package is audited
  instead.

- **Audit mode** — no `indexed_from` (new package, or pre-tracking).
  Cross-references every public symbol in `api.json` against existing
  doc pages (matched by `title:` frontmatter). Reports documented vs
  undocumented symbols.

A current `api.json` is needed: `analyze` stops (exit 2) at a package
whose file is in an older format, and `sync` writes it again.

**What a symbol is.** One for each type, and one for each name a type
declares: a property's Get, Let and Set, and overloads of a name, are one
symbol, the way the documentation has one page for each. A symbol is
*public*, and so covered by the report, when it is documentable: a type
that `api.json` does not mark `"public": false`, and in such a type a member
declared Public or Protected. The members of a type that is not public are
not symbols. The enumeration values and Type fields belong to their type, and
a change in them modifies it. A symbol's kind is written `Module`, `Class`,
`Interface`, `CoClass`, `Enum`, `Type`, `Union`, `Sub`, `Function`,
`Property`, `Event`, `Delegate`, `Const`, `Field`, or `Declare` for a Declare
statement; those are the names a package page's `exclude_kinds:` lists.

A symbol is identified across two snapshots by its kind and path:
`Interface:Outer.Inner` for a type declared inside another, and
`Outer.Name.Function` for a member. A package page's `exclude_from_docs:` names
types; it excludes the type, the types inside it, and everything declared in
either.

The report is printed to stdout and written to
`indexer/.packages/report.json`.

## api.json

One file for each package, written by `lib/api-model.mjs` from what
`scripts/lib/twin-api.mjs` reads out of the package's sources. Its first key
is `format`, which changes whenever the shape does (2 today); `sync` indexes a
package again when the store holds another number.

```json
{
  "format": 2,
  "package": "VBA",
  "project": "VBA",
  "version": "beta-x-1005",
  "types": [ ... ],
  "aliases": [ ... ],
  "problems": [ ... ]
}
```

| Key | Contents |
|-----|----------|
| `package` | The package's name in the store. |
| `project` | `project.name` from the package's Settings file, the name code knows it by, or null. It is not always the package's own: TwinBasicAssertions is `Assert`. |
| `version` | The release tag for a built-in or default package, the four-part version for a contributed one. The same for an install and the release zip of its build. |
| `types` | Every Module, Class, Interface, CoClass, Enum, Type and Union the package declares, nested ones included. |
| `aliases` | Every `Alias X As Y` statement. |
| `problems` | `{ file, line, why }` for each declaration the scanner could not place; empty when it placed them all. `sync` prints how many. |

**A type** has these keys, those marked `?` only when they apply:

| Key | Contents |
|-----|----------|
| `name`, `kind` | `kind` is `module`, `class`, `interface`, `coclass`, `enum`, `type` or `union`. |
| `in?` | The path of the type it is declared in, `Outer` or `Outer.Inner`. A type with no `in` is at the top of its file. Most Enums and Types are inside a Module or Class. |
| `vis` | `public`, `private`, `friend` or `protected`; `public` when no modifier is written. |
| `public?` | `false`, written only when code outside the package cannot name the type: its own `vis` is not `public`, or it is declared in a type that is not public. An Enum is judged by its own modifier alone, because the packages declare Enums inside Private modules for public use. |
| `file` | The file it is declared in, relative to `Sources/`. |
| `signature` | The declaration as written, on one line, without its attributes, `Extends` included. |
| `extends?`, `inherits?`, `implements?` | An Interface's base, a Class's `Inherits` and `Implements` lines. |
| `interfaces?` | A CoClass's interfaces, `{ name, default?, source? }`: `default` for the one its members are declared on, `source` for its events. |
| `hidden?`, `attrs?`, `description?` | `hidden` is true for `[Hidden]` and `[Restricted]`; it never removes a symbol, because the members of VBA's hidden module are globals. `attrs` are the attributes as `{ name, args? }`, `args` the text between the parentheses as written. `description` is the text of `[Description(...)]`, which `attrs` then leaves out. |
| `members` | Every kind but an Enum has them, a Type or Union only its procedures. |
| `values` | An Enum has these instead, in declaration order. |
| `fields` | A Type or Union has these as well as `members`, in declaration order. |

**A member** is `{ name, kind, vis, declare?, signature, returnType?,
accessor?, hidden?, attrs?, description? }`: `kind` is `sub`, `function`,
`property`, `event`, `delegate`, `const` or `field`; `declare` is true for a
`Declare` statement, which is a `sub`, `function` or `property` as well;
`returnType` is the type after the parameter list of a Function, a Property Get
or a Delegate Function; `accessor` is `Get`, `Let` or `Set`. A member with no
modifier is Public if it is a procedure, event or delegate in a Module or Class,
Private if it is a variable, constant or Declare, and everything in an
Interface, CoClass, Enum, Type or Union is Public. A name declared in brackets
keeps every character, as VBA's `Function [Chr$]` does; a type-declaration
character on a name written without brackets is not part of it, so
`Public Function Command$()` is `Command`.

**A value** is `{ name, value?, hidden?, attrs?, description? }`, `value` the
text after the `=`. **A field** is `{ name, vis, signature, hidden?, attrs?,
description? }`. **An alias** is `{ name, target, vis, in?, file, signature,
hidden?, attrs?, description? }`.

*Order and layout.* Types are in code-unit order of their path
(`Outer.Inner.Name`), then `kind`, then `file`; members by `name`, then `kind`, then
declaration order; aliases by `name`, then `file`; problems by `file`, `line`
and `why`. Nothing is compared with `localeCompare`. The file is JSON written one
type to a few lines, and one member, value, field, alias and problem to a
line, so that a snapshot is small and a change to one member changes one
line of it. It holds no line numbers except in `problems`, for the same
reason.

*What is read.* The `.twin` files under `Sources/` as they are, and the VB6-format
`.bas`, `.cls`, `.frm`, `.ctl` and `.dsr` files after
`lib/vb6-preprocess.mjs` has rewritten each as the one Module or Class it
holds: the header and the `Attribute VB_*` lines go, and the type is named by
`VB_Name`, else by the file's own name (community NewTabCtl's
`subclass/mBSSubclass.bas` is commented out whole, `VB_Name` included, and is
the module `mBSSubclass`). The `.tbform`, `.tbcontrol` and `.tbppage` files are
JSON designer files with no declarations in them, and are skipped on purpose,
as is everything outside `Sources/`. Text inside a `/* ... */` comment is not
read.

*Enumeration values written in brackets.* A line that is only `[Name]` in an
Enum body is a value of that name, not an attribute of the next line: the
`[_]` placeholder of the `Private Enum LongPtr` compatibility shim in the
VB6-derived packages, xCalendar's `[Flat]`, and the `[A4 Portrait]` of VB's
`ReportSizeConstants`. The compiler reads every such line this way, whatever the
brackets hold, so `[Hidden]` or `[Description("x")]` alone on a line is a value
too, and an Enum value cannot carry an attribute.

## Package groups

Every package belongs to one group. The group determines where its
files live in the store, snapshots, and docs.

| Group | Source | Store path | Docs path | Packages |
|-------|--------|-----------|-----------|----------|
| default | local install (or GitHub Release) | `.packages/default/` | `Reference/Default/` | VBA, VBRUN, VB |
| built-in | local install (or GitHub Release) | `.packages/built-in/` | `Reference/Built-In/` | Assert, CEF, CustomControls, WebView2, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls |
| contributed | TWINSERV | `.packages/contributed/` | `Reference/Contributed/` | everything from TWINSERV (32+ packages) |

The three default packages (VBA, VBRUN, VB) are always loaded in every
twinBASIC project. Everything else the install (or the release zip) holds is
"built-in." Everything from TWINSERV is "contributed."

## Pipeline overview

```
sync  -->  analyze  -->  draft  -->  verify  -->  human review
```

1. **sync** — read, extract, generate api.json, commit to store _(done)_
2. **analyze** — diff snapshots, produce change report _(done)_
3. **draft** — Claude workflow fans out agents to write doc pages _(planned — Phase E)_
4. **verify** — build the site, check links _(uses existing builder)_
5. **human review** — developer reviews and commits

Steps 1-2 are implemented. Step 3 will be a Claude Code workflow at
`.claude/workflows/doc-draft.mjs` that reads `report.json` (from
`analyze`) and dispatches agents to create or update doc pages
following the conventions in [`WIP.md`](../WIP.md). Until then, use
the report to drive manual documentation or the `/document-symbol`
skill.

See `PLAN-pipeline.md` for the full design, status, and future phases.

## Directory layout

```
indexer/
  twin-index.mjs              CLI entry point (sync | analyze)
  lib/
    sync.mjs                   TWINSERV manifest comparison + download
    builtin-sync.mjs           install / GitHub release manifest comparison + extraction
    twinserv-client.mjs        TWINSERV HTTP client
    github-release.mjs         GitHub Releases client
    package-files.mjs          .twinpack/.twinproj -> files, by scripts/impexp.mjs's parser
    zip-reader.mjs             Minimal ZIP reader (deflate)
    vb6-preprocess.mjs         VB6 -> twinBASIC normalization
    api-model.mjs              files -> api.json, through scripts/lib/twin-api.mjs
    store.mjs                  .packages/ git repo lifecycle
    differ.mjs                 api.json diff + coverage audit
  manifests/                   (committed) sync state
    built-in.json
    contributed.json
  snapshots/                   (committed) latest api.json per package
    default/
    built-in/
    contributed/
  .packages/                   (gitignored) local git repo with sources
```

## Troubleshooting

**"No packages to analyze. Run sync first."**
The `.packages/` directory is empty. Run `sync` to populate it.

**"no twinBASIC install found" or "no twinBASIC.exe at ..."**
`sync` reads the built-in and default packages from a twinBASIC install and
found none. Unpack the IDE's zip as a `twinBASIC_IDE_BETA_<n>` folder on the
Desktop, pass `--ide <folder>` or set `TB_IDE`, or use `--release` to
download the latest release instead.

**Sync says "Up to date" but `.packages/` is empty.**
This shouldn't happen — `sync` detects missing store directories and
forces re-download even when the manifest says nothing changed. If it
does happen, delete `indexer/manifests/built-in.json` and
`indexer/manifests/contributed.json` (reset them to stubs), then run
`sync` again.

**Git errors during store operations.**
The store requires `git` on PATH. Verify with `git --version`. The
store uses its own identity (`user.name=indexer`, `user.email=indexer@local`)
so it won't interfere with your global git config.

## Specifications and artifacts

| File | Description |
|------|-------------|
| `TWINSERV-protocol.md` | TWINSERV HTTP API specification. |
| `PLAN-pipeline.md` | Full pipeline design, status, and future phases. |
| `PLAN-auto-sync.md` | Historical: original module layout and interfaces. |
| `query_response.json` | Captured TWINSERV `/query` response (238 KB, 32 packages). |
| `sample.twinpack` | Sample `.twinpack` binary (CustomControlsPackage v0.0.3.0). |
| `parse_tree.ps1` | PowerShell script to dump `.twinproj`/`.twinpack` entry trees. |

The canonical `.twinpack` binary format spec is at
[`docs/Features/Packages/TWINPACK file format.md`](../docs/Features/Packages/TWINPACK%20file%20format.md).
