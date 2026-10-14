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
1 MB `execFile` default, and VB falls back to an audit with the smaller buffer.

**The manifests live in the store, not in the repository.** A committed manifest goes wrong
two ways. After a pull it says the new build has been read while the store, which is not
committed, holds old sources or none, so `sync` prints "Up to date" over stale data. And a
`sync` limited to some packages (`--package`) moves the whole manifest to the new build, so
the packages it skipped look current and are not. So the manifest says only what was last
fetched, a clone has none, and its first `sync` reads every package. Whether a package
is current is judged from what the store holds: its sources, an `api.json` in the format this
indexer writes, of the version the source has now, written by the scanner this checkout has.

**The fingerprint.** An `api.json` is a function of the sources *and of the code that reads
them*. The store records, beside each `api.json`, a SHA-256 over `scripts/lib/twin-api.mjs`,
`scripts/lib/twin-declarations.mjs`, `indexer/lib/api-model.mjs` and
`indexer/lib/vb6-preprocess.mjs` (line ends made alike, so a CRLF and an LF checkout agree).
Without it a scanner fix would leave every store's `api.json` "current" and `analyze` would
compare output of the old scanner. With it, `sync` indexes the package again from the stored sources, with no
download and under the version it had. That is why the store keeps each package's `Settings`
file (the project name). The list is every module `api-model.mjs` imports, and the unit test
fails when an import is added and the list is not; `package-files.mjs` is not on it, because
its output is what the store keeps.

**No user name in a committed file.** The manifest records the source (`install` or
`release`) and the BETA number, never the install's path, which holds a user name. Snapshot
paths are relative to `Sources/`.

## One scanner

**`parseTwin` in `scripts/lib/twin-api.mjs` is the only scanner**; the indexer has no lexer or
extractor of its own, which would misread what the shared scanner reads right: a field named
for a keyword opening a container nothing closes, a `Public CoClass`, Delegates and a
`/*Private*/ Module` missed, and the values of a nested Enum and the fields of a nested Type
dropped. Two scanners also drift: the symbol index (`builder/package-api.json`) and the indexer would disagree about
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
a condition on each. Separate members with no condition would make an `#If` pair look like
overloads and hide a changed condition from the differ.
The differ reads the merged form, with the condition in front of each signature, so that a
changed condition, a new branch or an edited signature each modifies the one symbol of that
name and kind. The rules for what counts as an alternative (same block, name, kind, accessor
and Declare-ness, more than one condition; two declarations under one condition are
overloads) are in the README.

**A change to the fingerprinted code or to `format` means regenerating the committed snapshots
from the build they record (`indexed_from`), in the same commit as the change.** If it does
not, `analyze` compares the new scanner's output with the old scanner's and reports the
scanner's changes as changes to the API. It needs that build's install, `sync --ide <folder>`:
`--release` downloads only the newest release, and a plain `sync` reads the newest install,
which would write the snapshots of another build.

## Decisions of the owner

- **Snapshots are committed only for the documented packages**: 14 files, 3.2 MB
  (about 360 KB compressed). The contributed packages and the extra CEF builds are indexed into
  the store and left out of the repository. A package joins when its section does; `sync`
  copies a snapshot for a documented package it indexed in that run, and gives a documented
  package with none the store's `api.json` when that is of its `indexed_from` version
  (`adoptSnapshots`): a package is usually synced before its section exists, and a later
  sync finds its store current and indexes nothing.
- **They are taken from the build the reference was last indexed against, BETA 1005**
  (`beta-x-1005`), not from a newer one, so that the pages and the baseline agree and
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
  only in the `package` key (checked on BETA 1005). `analyze` compares a package with
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

## `derive`: the symbol index's packages

`builder/package-api.json` is the input of the help add-in's symbol index
([WIP.HelpAddin.md](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build)).
`twin-index derive` writes it (`lib/package-api.mjs`). It reads the `.twinproj`
files with the reader `sync` uses and parses them with `parsePackageFiles`, the parse
`buildApi` makes, so the two outputs come from one reading. It takes half a second with no
cache.

- **It reads the packages, not the snapshots or the store.** An `api.json` sorts types and
  members by name and drops line numbers, and `apiSnapshot` needs declaration order: the
  first declaration of a name gives a member its kind, and the file lists types in that
  order. The snapshots also hold only the documented packages, and the store only what the
  last `sync` read. So `derive` needs no `sync` first, and takes `--ide` and `--release` as
  `sync` does.
- **It is keyed by project name**, `cefPackage` and `Assert`, where the snapshots are keyed
  by package; each project lists its packages as `exports`. The three CEF builds must
  declare one API, or `derive` exits 2.
- **It stays committed.** It is a build input `check_tree_fresh.mjs` watches, and CI has no
  packages to derive it from. `derive --check` is outside every gate for the same reason.
- **A scanner change can change it**, as it can the snapshots. The `[ ]` Enum member (a
  bracket group alone on a line is a member) gives VB's `ReportBaseCtl.ReportSizeConstants`
  its 17 values at BETA 1005, the first named `" "`.

## `draft` and the doc-draft workflow

`twin-index draft` turns `report.json` into page plans (`lib/draft-plan.mjs`), and
`indexer/draft/workflow.mjs` is the Claude Code workflow that writes the pages from them.

- **Placement is read from each section, not from a convention**, because the sections do not
  share one: the built-in packages keep enumerations in `Enumerations/`, the contributed ones
  beside the classes; a class is `X/index.md` with member pages, `X.md` with its members
  inline, or `_App/_App.md`. One rule for every path (`<module>/<symbol>.md`, `<symbol>.md`) matches no
  section exactly. Every rule in
  `draft-plan.mjs` is a majority over the section's own pages.
- **How well it places, checked by leaving each symbol out** of every section with a store
  package (the thirteen built-in and default ones, and the nine contributed ones of the
  `contributed-packages` branch) and planning it again: 994 of 998 members land on the file
  the section has them on, with its parent and permalink; 138 of 156 types; and the landing
  page of each contributed section, planned from the other eight, matches in all nine. The 18
  types that miss are layout choices no API shows: six that are the only type of their kind
  in their package, with nothing to follow (`AutoComplete.md`, not `AutoComplete/index.md`;
  `_App/_App.md`); seven controls laid out unlike their package's other controls; two
  `...State` classes kept in their control's folder; CustomControls' `Constants` module, at
  the root while its other modules are in `Framework/`; and two collections whose owner's
  folder the check had itself taken away. The four members that miss are documented unlike
  the others of their kind in their type, or not at all. The rule that places a type in the
  folder of the type returning it is limited to folders that already keep a type, because
  without that limit it would move Printer under Printers, Dictionary under JsonConverter and
  eight others that the sections keep at their roots.
- **A new section borrows its model pages from its group.** Its pages have no sibling of
  their kind to follow, so the plan of the first package drafted into a new section would
  give every task `model: null`, and the agents would invent a page
  layout. A page of a kind its section lacks takes a model from the group's largest
  section that has one, of the same shape: a folder's `index.md` for a class that gets a
  folder, never a one-page class.
- **A permalink is computed only where the rule holds for every existing page** of the
  section (`followsFolders`). At BETA 1005 that is every section but VBA's, whose
  pages live under `/tB/Modules/`. A section that breaks the rule once gets no computed
  permalinks at all, rather than a guess that a sibling page would contradict.
- **The prep is Node and the workflow is thin**, as Wisdom's extract is
  ([WIP.Wisdom.md](WIP.Wisdom.md)): a workflow script cannot read a file, so everything that
  needs the tree --- the pages, their titles and permalinks, the kinds of the types they
  document --- is decided by tested code, and the agents get finished decisions. The
  manifest passed as `args` names the batch files and nothing more, because `args` is written
  out by the calling session, at output-token cost; each agent reads its own batch.
- **No two agents write one file.** A batch is a type with its new members, or one type's
  members, and the pages that go on one type's one page are never split across batches. The
  lists that several batches would all touch --- the landing page's, and a type page's list of
  its members --- are left to one agent per package after its batches finish.
- **The check step compiles before a person reads.** One agent per package runs
  `check_examples --only` on the section, at a port of its own (9700 up, clear of the
  harness's default 9480), and fixes the pages. A contributed package without a
  `contributed-<Package>` template cannot be compiled, and the agent says so. **It also runs
  the doubts the other agents return**: the workflow passes their results into its prompt,
  and it settles each one a run can on a scratch page (`zz-probe.md`, every line expecting
  `' ?`, so the report prints what each line printed) and, for a package that replaces
  another object, on that object too (`cscript` for VBScript, `vb6run.mjs` for VB6). The
  Draft agents only list doubts: they run concurrently, so none of them compiles. The Lists
  agent reads a new package's README through read-only `gh` and lists the README's claims
  as doubts as well.
- **The agents are Sonnet**, as the content agents of the contributed packages were; the
  drafts are read against the sources before they are committed, which no model choice
  replaces.
- **A batch of 28 pages in 5 batches takes about 7 agents, 7 minutes and 0.96 M subagent
  tokens** (tbRegExp 1.0.5.0), and its samples compile and run on the first Check. The
  review still finds what no compile finds: the drafts state only what the code says, so
  where the package differs from the object it replaces (VBScript's **RegExp**, run under
  `cscript`) nothing says so, and claims read from the code but never run (`$0`, a lone `$`)
  need a probe page. Running the doubts is the Check agent's (above); the review
  still reads the pages against the sources.
- **It is not in the published docs.** `draft` is (Tools-Build), because its plans serve a
  person writing pages by hand; the workflow is described here and in `WIP.md`, because
  nothing under `docs/Documentation/` may require Claude.

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
- **`indexer/TWINSERV-protocol.md` stays where it is, as reference beside the code.** It
  describes a third party's HTTP API, which is neither a reason nor a decision, and folding 239
  lines of it into this note would bury both. Its one reader is `lib/twinserv-client.mjs`, which
  calls only `query` and `download`; the rest (login, publish, version check, the IDE-to-compiler
  commands) is there for whoever writes a publisher tool. It is reverse-engineered from
  the IDE's own files, of which it keeps no copy, and describes BETA 1005. Check it against
  the current IDE before relying on anything but those two endpoints.
