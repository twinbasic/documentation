# twinBASIC Documentation --- The Package Indexer

`indexer/twin-index.mjs` turns the sources of the twinBASIC packages into `api.json`
snapshots and lists the documentation work a new build leaves. **What to do** is in
[WIP.md](WIP.md#the-package-indexer); how to run it and the format of `api.json` are in
[indexer/README.md](indexer/README.md); the published account is the
[Tools-Build entry](docs/Documentation/Tools-Build.md#twin-index). This file says **why it is
built the way it is**, and keeps the decisions and open items that still decide something.
History is in git.

## The job

After a new twinBASIC build, find what the reference has not yet said about it, without
anyone reading diffs of `.twin` files. Two commands, one after the other:

- `sync` reads the packages (the built-in and default ones from the local install, the
  contributed ones from TWINSERV), indexes each into an `api.json`, keeps sources and index
  in the store, and copies the index of each documented package to the committed snapshots.
- `analyze` compares the store's `api.json` with the snapshot committed at `HEAD` and writes
  `indexer/.packages/report.json`: symbols to create, to update, to flag for removal.

`analyze` ends at the report. The pages are written by the per-symbol workflow
([WIP.Authoring.md](WIP.Authoring.md#per-symbol-workflow)), by hand or with the
`document-symbol` skill.

## Where the state lives

**The store, `indexer/.packages/`, is gitignored; the snapshots, `indexer/snapshots/`, are
committed.** The store is a git repository of its own, seeded with the committed snapshots as
its baseline commit, so that its history shows what changed in each package's API between
syncs. It keeps sources byte for byte (`core.autocrlf` off) and opens long paths
(`core.longpaths` on): some source names are over a hundred characters, more than Windows
opens from a deeply nested clone otherwise.

**`analyze` reads its baseline from `HEAD`** (`git show HEAD:indexer/snapshots/...`), never
from the working tree. A `sync` against a newer build rewrites the working-tree snapshots, and
the baseline has to stay what the pages say until the pages and the new snapshots are
committed together. It reads with a buffer of 1 GB because VB's snapshot is larger than the
1 MB `execFile` default, which once made VB fall back to an audit.

**The manifests live in the store, not in the repository.** They were committed once, and two
things went wrong. After a pull, the manifest said the new build had been read while the store,
which is not committed, held old sources or none, so `sync` printed "Up to date" over stale
data. And a `sync` limited to some packages (`--package`) moved the whole manifest to the new
build, so the packages it skipped looked current and were not. Now the manifest says only what
was last fetched, a clone has none, and its first `sync` reads every package. Whether a package
is current is judged from what the store holds: its sources, an `api.json` in the format this
indexer writes, of the version the source has now, written by the scanner this checkout has.

**The fingerprint.** An `api.json` is a function of the sources *and of the code that reads
them*. The store records, beside each `api.json`, a SHA-256 over `scripts/lib/twin-api.mjs`,
`scripts/lib/twin-declarations.mjs`, `indexer/lib/api-model.mjs` and
`indexer/lib/vb6-preprocess.mjs` (line ends made alike, so a CRLF and an LF checkout agree).
Without it a scanner fix left every store's `api.json` "current" and `analyze` compared output
of the old scanner. With it, `sync` indexes the package again from the stored sources, with no
download and under the version it had. That is why the store keeps each package's `Settings`
file (the project name). The list is every module `api-model.mjs` imports, and the unit test
fails when an import is added and the list is not; `package-files.mjs` is not on it, because
its output is what the store keeps.

**No user name in a committed file.** The manifest records the source (`install` or
`release`) and the BETA number, never the install's path, which holds a user name. Snapshot
paths are relative to `Sources/`.

## One scanner

**`parseTwin` in `scripts/lib/twin-api.mjs` is the only scanner**; the indexer has no lexer or
extractor of its own. It had them once, and they misread what the shared scanner reads right:
a field named for a keyword opened a container nothing closed, a `Public CoClass` was missed,
so were Delegates and a `/*Private*/ Module`, and the values of a nested Enum and the fields of
a nested Type were dropped. On the same input `parseTwin` found a superset. Two scanners also
drift: the symbol index (`scripts/build_package_api.mjs`) and the indexer would disagree about
one package, and each fix would be made twice. The scanner is pinned by
`scripts/check_symbol_index.mjs`, `scripts/check_twin_parsers.mjs` and
`test/indexer.test.mjs`; its header comment lists the ways to misread this corpus.

What the compiler answered, each asked of BETA 1005 and settled; the scanner follows it, and
the probes in `check_symbol_index.mjs` and the comments in `twin-api.mjs` hold the cases:

- **An unmodified `Declare` is Public in a Module** (another module calls it) **and must be
  Private in a Class** (TB5227), so it is never a Private member: in a Class it is an error.
- **`Dim x = 5`, `Public n& = 0` and a bare `Public r` are legal** without `As`, in a Module
  and a Class: a Variant with the warning TB0003, unless a type character gives the type. A
  Type takes no initialiser (TB5182) but a bare name.
- **`Abstract` and `Virtual` are not modifiers.** `Public Abstract Sub Y()` is a Variant
  variable named `Abstract` followed by a Sub the parser refuses (TB5182). Thirteen more words
  (`Shared`, `Partial`, `Overrides`, `Overloads`, `MustOverride`, `MustInherit`,
  `NotInheritable`, `Iterator`, `Async`, `Naked`, `Unsafe`, `Extern`, `Inline`) are refused the
  same way, and stay on the shared list until a source is found that needs them gone.
  `Overrides` is a clause after a result type, never a modifier.
- **A generic constraint of any form is refused** (TB5069); the scanner reads past one, taking
  the name before the parenthesis.
- **A bracket group alone on a line is a member in an Enum**, the attribute list of the next
  field in a Type. In an Enum it is a value whatever it holds (`[_]`, `[Flat]`, `[A4
  Portrait]`, `[Hidden]`, `[Description("x")]`), and an attribute in front of a value on the
  same line is refused (TB5182), so an Enum value cannot carry an attribute. In a Type or Union
  `[Class] As Long` is the attribute `Class` and a field named `As`, which is refused (TB5182).
- **A colon joins statements, and each is a declaration of its own**: `Private x As Long:
  Private y As Long`, `Sub P(): End Sub: Sub Q(): End Sub`, `Class C: End Class`, `Enum E: A: B:
  End Enum`. A colon inside a string, brackets, parentheses or `:=` joins nothing.
- **Every character past ASCII is an identifier character**, the no-break space and emoji
  included, so `\b` is no word boundary: `Public` followed by an accented letter is a name, not
  the modifier.
- **A type-declaration character ends an unbracketed name and gives its type** on a function,
  Property Get, delegate, Declare, variable, field and constant; a Sub, Property Let or Set and
  Event refuse one (TB5204).

Branches of an `#If` are read as alternatives that each start from the block structure the
`#If` found, nothing is evaluated, and branches that leave different blocks open are listed in
`problems`.

## api.json format 3 and the `#If` merge

`format` changes whenever the shape does, and `sync` indexes a package again when the store
holds another number. Format 3 merges the declarations in the branches of an `#If`
(`#If VBA7 Then ... As LongPtr #Else ... As Long`) into **one member with a `signatures` list**,
a condition on each. Before, the branches were separate members with no condition, so an
`#If` pair looked like overloads and a changed condition changed nothing the differ could see.
The differ reads the merged form, with the condition in front of each signature, so that a
changed condition, a new branch or an edited signature each modifies the one symbol of that
name and kind. The rules for what counts as an alternative (same block, name, kind, accessor
and Declare-ness, more than one condition; two declarations under one condition are
overloads) are in the README.

**A change to the fingerprinted code or to `format` means regenerating the committed snapshots
from the build they record (`indexed_from`), in the same commit as the change.** If it does
not, `analyze` compares the new scanner's output with the old scanner's and reports the
scanner's changes as changes to the API. The BETA 997 snapshots were regenerated this way when
the scanner changed. It needs that build's install, `sync --ide <folder>`:
`--release` downloads only the newest release, and a plain `sync` reads the newest install,
which would write the snapshots of another build.

## Decisions of the owner

- **Snapshots are committed only for the documented packages, to start with**: 14 files, 3.2 MB
  (about 350 KB compressed). The contributed packages and the extra CEF builds are indexed into
  the store and left out of the repository. A package joins when its section does; `sync`
  copies a snapshot for a documented package it indexed in that run.
- **They are taken from the build the reference was last indexed against, BETA 997**
  (`beta-x-0997`), not from a newer one, so that the pages and the baseline agree and
  `analyze` of a newer build shows the real distance.
- **The twinBASIC "install" is the release zip unzipped.** Its `packages/<folder>/package.twinproj`
  files are the zip's, so either gives the same sources and the same `api.json`, byte for byte.
  The local install is therefore the default source and `--release` exists only for a machine
  without one. Nothing in the tool starts the IDE.
- **`analyze` covers the documented packages by default**; `--all` takes everything in the
  store, and `--package` and `--packages` name any. A package no section documents is audited
  against no pages, so every public symbol of it is work: the report would otherwise be mostly
  the contributed packages and the two spare CEF builds.
- **The group of a package is a constant, not something the install says.** `DEFAULT_PACKAGES`
  in `twin-index.mjs` (`VBA`, `VBRUN`, `VB`: the three every project loads) are `default`;
  everything else in the install is `built-in`, and everything from TWINSERV `contributed`. A
  package the IDE starts to ship is `built-in` until someone adds it to the constant. The group
  decides the store folder, the snapshot folder and the folder of the reference.
- **CEF is one snapshot, `cefPackage145`.** `cefPackage49`, `cefPackage109` and `cefPackage145`
  are one source tree compiled against three CEF runtimes, and their `api.json` files differ
  only in the `package` key (checked on BETA 997 and 1005). `analyze` compares a package with
  its own snapshot, so naming all three would triple every CEF task and keep two copies of
  460 KB. If a build ever declares an API of its own, it needs its name in `package_name:` and
  a snapshot.
- **CustomControls maps to two packages**, `CustomControls, CustomControlsPackage`.
  `package_name:` replaces the folder-name default, so the folder's own name is listed when it
  is a package too. The project name inside `api.json` is not always the package's:
  `TwinBasicAssertions` is the project `Assert`, `AppGlobalClassObject` is
  `AppGlobalClassProject`, and the three CEF builds are `cefPackage`.
- **A contributed package's `indexed_from` is the four-part TWINSERV version**
  (`1.3.0.0`), because that is the `version` of its snapshot; a three-part one never matches
  and `analyze` falls back to an audit.

## The next step

**Derive `builder/package-api.json` from the indexer's parse.** That file is the input of the
help add-in's symbol index ([WIP.HelpAddin.md](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build)),
and `scripts/build_package_api.mjs` writes it today: it exports the packages of an install and
scans them with `twin-api.mjs`. The scanner is already shared; what is not is the reading and
the second pass over the same packages, and the install that tool needs. The snapshots hold the
types, members, kinds, Enum values and CoClass interfaces that file annotates the index with.
Nothing is designed beyond that. Two things to settle first: `package-api.json` is keyed by
project name (`cefPackage`, `Assert`) where the snapshots are keyed by package, and it is a
committed build input that `check_tree_fresh.mjs` watches.

## Open items

- **`diffApi` reports `attributes` as changed as well as `signature` when only a property's
  accessors changed.** A symbol's attributes are compared as a list with one entry for each
  declaration of the name, and an added Let adds an entry. The report's `reason` is still
  right (`signature_changed`); `changes` lists both.
- **`#If` alternatives of Enum values and Type fields are not merged**, because their order is
  part of what they mean, and **alternative types carry no condition**: two `Class` headers in
  the branches of one `#If` are two types of one path, told apart as `#2` in file order, so a
  changed condition cannot be seen.
- **The audit matches by name.** `auditCoverage` looks a symbol's name up among the titles of
  every page in the section. A member documented inline on its container's page (the
  `Assert` functions on `Exact.md`) shows as undocumented, and a name shared by several types
  shows as documented once any page carries it. Update mode does not audit, but finds a
  changed symbol's `doc_page` the same way.
- **Adopting a package whose store is already current writes no snapshot.** By reading `runSync`:
  the snapshots are copied for the packages the run indexed, and a package that is up to date
  is not among them. Documenting a package that `sync` has already read needs its store folder
  removed first, or a build newer than the store's.
- **`indexer/TWINSERV-protocol.md` stays where it is, as reference beside the code.** It
  describes a third party's HTTP API, which is neither a reason nor a decision, and folding 239
  lines of it into this note would bury both. Its one reader is `lib/twinserv-client.mjs`, which
  calls only `query` and `download`; the rest (login, publish, version check, the IDE-to-compiler
  commands) is there for whoever writes a publisher tool. It was reverse-engineered from
  BETA 983 (June 2026) and keeps no copy of the IDE files it came from. Check it against the
  current IDE before relying on anything but those two endpoints.
