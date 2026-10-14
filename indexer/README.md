# indexer — twinBASIC package documentation pipeline

Reads the built-in and default twinBASIC packages from the local twinBASIC
install, downloads the community ones, extracts their source code, and
produces structured API snapshots (`api.json`) used to maintain the
reference documentation at docs.twinbasic.com.

This file is the reference for its layout, commands and `api.json`. The
published account of the tool is its entry in
[Build and Generation Tools](../docs/Documentation/Tools-Build.md#twin-index);
why it is built as it is, and the decisions and open items that still
matter, are in [WIP.Indexer.md](../WIP.Indexer.md).

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

1. Creates `indexer/.packages/` as a local git repo (the "store"), seeded
   with the committed snapshots as its baseline commit, so that the store's own
   history shows what changed in each package's API. It keeps the sources as
   the packages hold them (`core.autocrlf` off) and opens long paths
   (`core.longpaths` on): some source names are over a hundred characters, which
   Windows refuses from a deeply nested clone otherwise.
2. Reads the built-in and default packages from the local twinBASIC
   install, and downloads all packages from TWINSERV (community).
3. Reads the sources of every package with the repository's shared
   twinBASIC scanner, `scripts/lib/twin-api.mjs` (the one the symbol
   index and the attribute census use too).
4. Generates an `api.json` snapshot per package ([described below](#apijson)).
5. Commits sources + snapshots to the store.
6. Copies the `api.json` of each package the reference documents to
   `indexer/snapshots/` (committed to the docs repo; [see below](#documented-packages)).
7. Records what it read in `indexer/.packages/manifests/` (in the store,
   not committed).

Subsequent runs only read and download what changed. A fresh clone has no
store, so its first `sync` reads everything.

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
| 0 | The command finished: `sync` wrote every package it was asked for, or found it up to date; `analyze` wrote its report; `draft` placed its pages; `derive` wrote the file, or with `--check` found it up to date. |
| 1 | A package named by `--package` or `--packages` failed to sync, or does not exist, or is not in the report (`draft`); the others were done. With `derive --check`, the file is stale. |
| 2 | A refused command line, no twinBASIC install found, no snapshots to analyze (run `sync` first), no report to draft from (run `analyze` first), packages that declare different APIs under one project name (`derive`), or a crash. |

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
| `--ide <path>` | Read the built-in and default packages from this twinBASIC install, given as its folder or its `twinBASIC.exe`. Without it: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop, found as the compiler harness finds it. No path is built in. |
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
sources or no `api.json`, holds an `api.json` in an older format than the
indexer writes (the `format` number below), or holds one of another build or
version than the source has now. The store is the record of what has been
read: the manifest only says what was last fetched, so it cannot hide a package
the store lacks, and a `sync` limited to some packages, which moves the
manifest to the new build for all of them, leaves the others to be read again
by the next one.

A package whose `api.json` was written by other code than this checkout has is
indexed again as well, but from the sources the store already holds, with no
download and under the version it had. Beside each `api.json` the store records
a fingerprint of the code that wrote it (`indexer.json`): a hash of
`scripts/lib/twin-api.mjs`, `scripts/lib/twin-declarations.mjs`,
`lib/api-model.mjs` and `lib/vb6-preprocess.mjs`, the modules `api-model.mjs`
imports (`lib/fingerprint.mjs` lists them, and a test checks the list), with the
line ends made alike. A store from before the fingerprint, or any change to
those files, makes the next `sync` index every package again; the store also
keeps each package's `Settings` file for this, beside its `sources/`. `analyze`
warns when the fingerprint of a package is not the checkout's. The version in
`api.json` is the release tag in both cases:
BETA 1005 is `beta-x-1005`, as `indexed_from` in the package pages has it. The
BETA number is read from the install's `ide/build.js`, else from the name of
its folder.

**What it writes:**

| Path | Committed? | Contents |
|------|-----------|----------|
| `indexer/.packages/{group}/{pkg}/sources/` | No (gitignored) | Extracted `.twin` source files |
| `indexer/.packages/{group}/{pkg}/Settings` | No (gitignored) | The package's Settings file, for its project name |
| `indexer/.packages/{group}/{pkg}/api.json` | No (gitignored) | Full API snapshot |
| `indexer/.packages/{group}/{pkg}/indexer.json` | No (gitignored) | The [fingerprint](#sync) of the code that wrote the `api.json` |
| `indexer/.packages/manifests/contributed.json` | No (in the store) | TWINSERV sync state |
| `indexer/.packages/manifests/built-in.json` | No (in the store) | Built-in and default sync state |
| `indexer/snapshots/{group}/{pkg}/api.json` | Yes | Copy of the above, for the [documented packages](#documented-packages) only (survives cloning) |

The manifests are in the store, with the sources they describe, and not in the
repository: a manifest that travels with git says "up to date" about a store
that a clone does not have, or holds from another build. A clone has no store
and so no manifests, and its first `sync` reads every package.

`built-in.json` records which source the packages were read from and which
build: `source` is `install` or `release`, `beta` the BETA number and
`twinbasicTag` the release tag of that build, and `publishedAt` the release's
date (null for an install). It never records the install's path, which holds a
user name. A change of source reads the packages again even when the build is
the same.

### analyze

```sh
node indexer/twin-index.mjs analyze [--package <name> | --packages <a>,<b> | --all]
```

Compares the current API snapshots (from `sync`) against the
documented baseline and produces a change report.

| Flag | Effect |
|------|--------|
| _(no flag)_ | The packages the reference documents ([see below](#documented-packages)): those a section's landing page names, which are the ones with a committed snapshot. The store's other packages are left out, and a line says how many. That is the three CEF packages' two spare builds (`cefPackage49`, `cefPackage109`, which share the section's `cefPackage145`) and the contributed packages, nearly all of them. |
| `--package VBA`, `--packages VBA,tbIDE` | Those packages, documented or not. |
| `--all` | Every package in the store. Not with `--package` or `--packages`, and not for `sync`. |

A package no landing page documents is audited against no pages at all, so every
public symbol of it is listed as one to create: the report for `--all` or for a
named undocumented package is a list of everything to write.

Two modes, chosen automatically per package:

- **Update mode** — the package's landing page has an `indexed_from`
  field. Diffs the current `.packages/` api.json against the
  last-committed snapshot (`git show HEAD:indexer/snapshots/...`), and
  only when that snapshot's `version` is the `indexed_from` value.
  Reports added, modified, and removed public symbols. A committed
  snapshot in an older format is not diffed; the package is audited
  instead.

- **Audit mode** — no `indexed_from` (new package, or pre-tracking), or no
  committed snapshot of the `indexed_from` version to diff against.
  Cross-references every public symbol in `api.json` against existing
  doc pages (matched by `title:` frontmatter). Reports documented vs
  undocumented symbols.

A current `api.json` is needed: `analyze` stops (exit 2) at a package
whose file is in an older format, and `sync` writes it again.

**Callouts to check again.** A callout's label (`> [!WARNING] 1.0.0.4`,
`> [!NOTE] BETA 1005`; `lib/callout-labels.mjs`) says what it is true of.
When the store holds a version of a package other than its section's
`indexed_from`, the package's report has a `recheck_callout` task for each
callout of the section labelled with another version (`file`, `line`,
`label`, `from`, `to`): the build refuses the new `indexed_from` until each
label is moved. `draft` ignores these tasks. An `analyze` with no package
named also lists every callout labelled `BETA <n>` below the build in
`.packages/manifests/built-in.json`, and writes them to
`.packages/callouts.json`.

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

### draft

```sh
node indexer/twin-index.mjs draft [--package <name> | --packages <a>,<b>]
```

Places the pages the last report asks for. For each package of
`report.json` (or each one named), `lib/draft-plan.mjs` reads the section's
pages and the package's `api.json` and decides, for each task:

- **the file**, as most of the section's pages of the same kind are. A new type
  goes in the folder that keeps most types of its kind (a control, a class
  marked `[WindowsControl]` or `[CustomControl]`, counts as a kind of its own),
  as `<Type>/index.md` or `<Type>.md` as most of them are; with none to go by,
  as a folder when it has new members. A type that a documented type's member
  returns (`As ListItem`) goes in that type's folder instead, when the folder
  already keeps another type, as `ListView/` keeps `ListItem`. A member of a
  type whose page is a folder's (`X/index.md`, or `X/X.md` in a folder with no
  `index.md`, as `_App/_App.md` is) gets `X/<Member>.md` if most of the type's
  members of that kind have pages, else most of its members, else most members
  in the section; otherwise it goes `inline` on the type's page, as VB's do. A
  change goes to the page that documents the symbol: the one titled with its
  name whose parent is its type's page.
- **the parent**: the type's page, the folder's `index.md` (`Enumerations`), or
  the landing page.
- **the permalink**, only when every page of the section has the permalink its
  folders give it (`followsFolders`); otherwise null, to follow the siblings.
  VBA's `/tB/Modules/...` is the one section that does not.
- **a model page** of the same kind in the section, and the source file. A page
  of a kind the section has none of, as every page of a new section is, takes
  its model from another section of the group (`sectionModels`), the one with the
  most pages first, and one of the same shape (a folder's `index.md`, or a page
  of its own) where there is one.

A package with no section gets `docs/Reference/<Group>/<Package>/` and a
landing page like the group's others (`newLandingFor`): `<Package> Package`,
their parent, and a permalink beside theirs. A member of a type with no page is
`unplaced`; a removed symbol is `flagged` with its page.

It writes `indexer/.packages/draft/`, emptied first: `<Package>.json` (the
plan), `batch-<n>.json` (a type with its new members, or one type's members,
twelve pages at most, never splitting the pages that go on one file), and
`manifest.json`, which lists them. The manifest is what the Claude Code
workflow `draft/workflow.mjs` takes; see [WIP.Indexer.md](../WIP.Indexer.md).

### derive

```sh
node indexer/twin-index.mjs derive [--check] [--out <file>] [--ide <path> | --release]
```

Writes `builder/package-api.json`, the package half of the documentation's
symbol index ([WIP.HelpAddin.md](../WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build)),
from every built-in and default package of the install (`--ide`, found as
`sync` finds it) or of the latest release (`--release`). It reads and parses the
packages as `sync` does, with `parsePackageFiles` from `lib/api-model.mjs`,
and needs no store. The snapshots cannot stand in for the packages: they hold
only the documented ones, and an `api.json` keeps no declaration order, which
the file keeps because the first declaration of a name gives a member its kind.
The format and what the build takes from it are in `lib/package-api.mjs`.

`--check` compares instead of writing, and exits 1 when the file is stale.
`--out` writes elsewhere. Run it with the same install as `sync` when the
reference moves to a new build, and commit the file with the pages and the
snapshots.

## api.json

One file for each package, written by `lib/api-model.mjs` from what
`scripts/lib/twin-api.mjs` reads out of the package's sources. Its first key
is `format`, which changes whenever the shape does (3 today); `sync` indexes a
package again when the store holds another number.

```json
{
  "format": 3,
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
accessor?, hidden?, attrs?, description? }` (or `signatures` for `signature`, for
the alternatives of an `#If`, described below): `kind` is `sub`, `function`,
`property`, `event`, `delegate`, `const` or `field`; `declare` is true for a
`Declare` statement, which is a `sub`, `function` or `property` as well;
`returnType` is the type after the parameter list of a Function, a Property Get
or a Delegate Function, without the `Implements`, `Overrides` or `Handles`
clause that may follow it, else the type the name's closing type-declaration
character gives (`Function Size%()` returns `Integer`); `accessor` is `Get`, `Let` or `Set`. A member with no
modifier is Public if it is a procedure, event, delegate or Declare in a Module
or Class, Private if it is a variable or constant, and everything in an
Interface, CoClass, Enum, Type or Union is Public (a Declare with no modifier is
Public in BETA 1005: another module calls it; a Class accepts only a Private
Declare, TB5227). `hidden` is false for `[Hidden(False)]`, which hides nothing.
A name declared in brackets
keeps every character, as VBA's `Function [Chr$]` does; a type-declaration
character (`%` Integer, `&` Long, `!` Single, `#` Double, `@` Currency, `$`
String, `^` LongLong) on a name written without brackets is not part of it, so
`Public Function Command$()` is `Command`, whatever it names: a Function, a
Property Get, a Delegate, a Declare, a variable, a field or a constant. The
`signature` keeps it as written.

**A member declared in the branches of an `#If`** is one member when its
declarations are alternatives, and holds them in `signatures`, one item for each
in declaration order: `{ cond, vis?, signature, returnType?, hidden?, attrs?,
description? }`. `cond` is the condition of its branch, in the source's own
words, with the branches before it negated: `Win64` and `Not (Win64)` for the
two branches of `#If Win64 Then ... #Else ... #End If`, `Not (A) And B` for the
`#ElseIf B` after `#If A`, `Outer And Inner` in a nested one. Declarations are
alternatives when they are in one `#If` block (a nested one with its outer
block), of one name and kind, the same `accessor` (a Property Get is not an
alternative of its Let) and both or neither a Declare, with more than one
condition among them; two declarations under the same condition are overloads
and stay members of their own, as does a declaration under a condition on its
own. The member has `name`, `kind`, `vis` (the most accessible of the
alternatives), `declare` and `accessor`, and what all the alternatives have
alike once, as a member that is not merged has it: `returnType`, `hidden`,
`attrs` and `description`, which an attribute list above the `#If` gives to every
branch. Only a key that differs is on an item, and `vis` is on one only when it
is not the member's. A merged member has no `signature` of its own. The
differ treats it as the members it holds: one symbol of the name and kind, a
line in its `signature` for each alternative, `#If Win64 Then Public Declare ...`,
so that a changed condition is a changed signature. The values of an Enum and
the fields of a Type are not merged: their order is part of what they mean, and
each alternative stays in it.

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

*Statements and identifiers.* A colon joins statements, and each is a declaration
of its own, as BETA 1005 reads them: `Private x As Long: Private y As Long`,
`Sub P(): End Sub: Sub Q(): End Sub`, `Class C: End Class`, `Enum E: A: B: End
Enum`, `G = 1: H = 2`. A colon inside a string, brackets, parentheses or `:=` joins
nothing, and a `[Attribute]` list belongs to the first statement after it. An
identifier is made of the ASCII letters, digits and `_` and of every character
past ASCII: `Größe`, `Café`, `日本語` are names, and so is `Publicé`, which is not
the modifier `Public`.

*Enumeration values written in brackets.* A line that is only `[Name]` in an
Enum body is a value of that name, not an attribute of the next line: the
`[_]` placeholder of the `Private Enum LongPtr` compatibility shim in the
VB6-derived packages, xCalendar's `[Flat]`, and the `[A4 Portrait]` of VB's
`ReportSizeConstants`. The compiler reads every such line this way, whatever the
brackets hold, so `[Hidden]` or `[Description("x")]` alone on a line is a value
too, and an Enum value cannot carry an attribute.

*Conditional compilation.* The branches of an `#If` are read as alternatives:
each starts from the block structure the `#If` found, so that
`#If VBA7 Then Public Sub S(…) As LongPtr #Else Public Sub S(…) As Long #End If`
followed by one body is two procedures of that name, an `End Sub` in each
branch closes the one body, and two alternative `Class` headers are two
classes that each get the members after them. An attribute before the `#If`
applies in every branch. Branches that leave different blocks open are
listed in `problems`, as are an `#Else` or `#End If` with no `#If` and an `#If`
that is never closed. Nothing is evaluated: every branch is indexed, and the
alternatives of one name are written as one member with a `cond` for each
(see [a member declared in the branches of an `#If`](#apijson) above).

*Type bodies.* A field in a Type is a bare name, so `Default As Long` and
`Static As Long` are fields, and a line that starts with `[` is an attribute list
(BETA 1005 reads `[Class] As Long` as an attribute and a field called `As`, and
refuses it): it is listed in `problems` as a line with no field.

## Documented packages

`indexer/snapshots/` holds the baseline the reference is compared with, so it
holds a package only if the reference documents it, and only that package's
`api.json`: the sources stay in the store. `sync` copies a snapshot when the
package has a section in the reference, and `analyze` diffs against it. A
section started after its package was synced gets its snapshot from the next
`sync`, which copies the store's `api.json` when it is of the version the
section's `indexed_from` names (`adoptSnapshots`). The
other packages are indexed into the store and left out of the repository; most
of the contributed ones are, and so are the builds of a package that is
documented as one.

A package's section in `docs/Reference/` is the folder with its landing page,
`docs/Reference/{Default,Built-In,Contributed}/<Section>/index.md`. The page's
frontmatter ties the section to the packages in the store (`lib/doc-pages.mjs`
reads it; the site's builder ignores these keys):

| Key | Means |
|-----|-------|
| `package_name:` | The packages the section documents, by the names the store has, comma-separated: `CustomControls, CustomControlsPackage`. Without it the section documents the package named like its folder. It replaces that name, so the folder's own is listed too when it is a package. |
| `indexed_from:` | The release tag the section was brought up to date with, `beta-x-1005`: the `version` of the committed snapshots. Bump it in the commit that updates the pages, and write the new snapshots in it. |
| `exclude_from_docs:`, `exclude_kinds:` | Types, and kinds of symbol, that are deliberately not documented, so `analyze` does not list them. |

The group is the folder's: a package in `Built-In/` is a built-in one.

The 13 sections and the 14 snapshots they have, all of BETA 1005 (`beta-x-1005`),
the build the reference was last indexed against:

| Section | Packages (`package_name:`) | Snapshots | Size |
|---------|----------------------------|-----------|------|
| `Default/VB` | `VB` (no key) | `default/VB` | 1,427 KB |
| `Default/VBA` | `VBA` (no key) | `default/VBA` | 407 KB |
| `Default/VBRUN` | `VBRUN` (no key) | `default/VBRUN` | 106 KB |
| `Built-In/AppGlobalClassObject` | `AppGlobalClassObject` (no key) | `built-in/AppGlobalClassObject` | 22 KB |
| `Built-In/CEF` | `cefPackage145` | `built-in/cefPackage145` | 468 KB |
| `Built-In/CustomControls` | `CustomControls, CustomControlsPackage` | `built-in/CustomControls`, `built-in/CustomControlsPackage` | 20 KB, 87 KB |
| `Built-In/TwinBasicAssertions` (the `Assert` package) | `TwinBasicAssertions` (no key) | `built-in/TwinBasicAssertions` | 21 KB |
| `Built-In/WebView2` | `WebView2Package` | `built-in/WebView2Package` | 189 KB |
| `Built-In/WinEventLogLib` | `WinEventLogLib` (no key) | `built-in/WinEventLogLib` | 7 KB |
| `Built-In/WinNamedPipesLib` | `WinNamedPipesLib` (no key) | `built-in/WinNamedPipesLib` | 56 KB |
| `Built-In/WinNativeCommonCtls` | `WinNativeCommonCtls` (no key) | `built-in/WinNativeCommonCtls` | 314 KB |
| `Built-In/WinServicesLib` | `WinServicesLib` (no key) | `built-in/WinServicesLib` | 41 KB |
| `Built-In/tbIDE` | `tbIDE` (no key) | `built-in/tbIDE` | 48 KB |

That is 3.2 MB as the files are, about 360 KB compressed. The project name inside
the files (`project` in `api.json`) is not always the package's:
`TwinBasicAssertions` is the project `Assert`, `AppGlobalClassObject` is
`AppGlobalClassProject` and the three CEF packages are `cefPackage`. The
builder's `PACKAGE_FOLDERS` in `builder/symbols.mjs` is the same list by
project name.

**One API, several builds.** The three CEF packages in an install,
`cefPackage49`, `cefPackage109` and `cefPackage145`, are one source tree
compiled against three CEF runtimes. Their `api.json` files differ only in
the `package` key (checked on BETA 1005), and the reference has one
section for them, so the section names one and the repository keeps one
snapshot, of the newest, `cefPackage145`. `analyze` compares each package with
its own snapshot, so naming all three would triple every CEF task and keep two
copies of the same 460 KB. If a build ever declares an API of its own, it needs
its own name in `package_name:` and a snapshot.

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
sync  -->  analyze  -->  draft  -->  write the pages  -->  verify  -->  review
```

1. **sync** — read, extract, generate api.json, commit to store
2. **analyze** — diff snapshots, produce change report
3. **draft** — place each page the report asks for: file, parent, permalink
4. **write the pages** — the per-symbol workflow in
   [`WIP.Authoring.md`](../WIP.Authoring.md#per-symbol-workflow), by hand,
   with the `document-symbol` skill, or with the `draft/workflow.mjs`
   Claude Code workflow, from the plans; then set `indexed_from`, run
   `derive`, and commit the new snapshots and `builder/package-api.json`
   with the pages
5. **verify** — `build.bat`, `check.bat` (the existing builder), and
   `examples.bat` for the new samples
6. **review** — the developer reviews and commits

The indexer implements steps 1 to 3. Step 4 needs a person, or Claude.

## Directory layout

```
indexer/
  twin-index.mjs              CLI entry point (sync | analyze | draft | derive)
  draft/
    workflow.mjs               the doc-draft Claude Code workflow, over draft's manifest
  lib/
    sync.mjs                   TWINSERV manifest comparison + download
    builtin-sync.mjs           install / GitHub release manifest comparison + extraction
    twinserv-client.mjs        TWINSERV HTTP client
    github-release.mjs         GitHub Releases client
    package-files.mjs          .twinpack/.twinproj -> files, by scripts/impexp.mjs's parser
    zip-reader.mjs             Minimal ZIP reader (deflate)
    vb6-preprocess.mjs         VB6 -> twinBASIC normalization
    api-model.mjs              files -> api.json, through scripts/lib/twin-api.mjs
    package-api.mjs            packages -> builder/package-api.json (derive)
    fingerprint.mjs            the hash of the code api.json depends on, kept beside each one in the store
    doc-pages.mjs              the reference's package sections: package_name, indexed_from, exclusions
    store.mjs                  .packages/ git repo lifecycle, sync state, what the store holds
    differ.mjs                 api.json diff + coverage audit
    draft-plan.mjs             report tasks -> page files, parents, permalinks, batches (draft)
  snapshots/                   (committed) latest api.json per package
    default/
    built-in/
    contributed/
  .packages/                   (gitignored) local git repo with sources
    manifests/                 sync state: built-in.json, contributed.json
```

Its unit tests are `test/indexer.test.mjs` (`node --test test/indexer.test.mjs`,
run by `test.bat` and in CI): the VB6 preprocessing, the reading of a package's
files from `sample.twinpack`, `api.json` and the differ, on small inputs.
They need no network, git or twinBASIC install.

## Troubleshooting

**"No packages to analyze. Run sync first."**
The `.packages/` directory is empty. Run `sync` to populate it.

**"no twinBASIC install found" or "no twinBASIC.exe at ..."**
`sync` reads the built-in and default packages from a twinBASIC install and
found none. Unpack the IDE's zip as a `twinBASIC_IDE_BETA_<n>` folder on the
Desktop, pass `--ide <folder>` or set `TB_IDE`, or use `--release` to
download the latest release instead.

**Sync says "Up to date" but a package looks wrong.**
`sync` compares what the store holds with the source, whatever the manifest
says, so this should not happen. To start over, delete `indexer/.packages/`
(the sources, the manifests and the store's history) and run `sync` again;
the committed snapshots seed the new store.

**Git errors during store operations.**
The store requires `git` on PATH. Verify with `git --version`. The
store uses its own identity (`user.name=indexer`, `user.email=indexer@local`)
so it won't interfere with your global git config.

## Specifications and artifacts

| File | Description |
|------|-------------|
| `TWINSERV-protocol.md` | TWINSERV HTTP API specification, reverse-engineered from the IDE and describing BETA 1005. The indexer calls only `query` and `download`. |
| `sample.twinpack` | Sample `.twinpack` binary (CustomControlsPackage v0.0.3.0). |
| [`WIP.Indexer.md`](../WIP.Indexer.md) | Why the indexer is built as it is: decisions and open items. |

The canonical `.twinpack` binary format spec is at
[`docs/Features/Packages/TWINPACK file format.md`](../docs/Features/Packages/TWINPACK%20file%20format.md).
