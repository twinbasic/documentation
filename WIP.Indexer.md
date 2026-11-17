# twinBASIC Documentation --- The Package Indexer

`indexer/twin-index.mjs` turns the sources of the twinBASIC packages into `api.json`
snapshots and lists the documentation work a new build leaves. **What to do** is under
[Rules](#rules) below; how to run it and the format of `api.json` are in
[indexer/README.md](indexer/README.md); the published account is the
[Tools-Build entry](docs/Documentation/Tools-Build.md#twin-index). This file says **why it is
built the way it is**, and keeps the decisions and open items that still decide something.

## Rules

- **Run `analyze` to find what a page set lacks**, before and after a batch of pages; see the
  [per-symbol workflow](WIP.Authoring.md#per-symbol-workflow).
- **`draft` places what `analyze` lists**: each page's file, parent and permalink, from the
  section's own layout, in `indexer/.packages/draft/`. To have Claude write the drafts, pass the
  parsed `indexer/.packages/draft/manifest.json` as `args` to the Workflow tool with `scriptPath:
  "indexer/draft/workflow.mjs"` --- only when the owner asks for it, since it runs one agent per
  batch of twelve pages and three per package. It writes pages and compiles their samples, and
  commits nothing; read every draft against its source before committing it. The workflow is
  described in this file only ([`draft` and the doc-draft workflow](#draft-and-the-doc-draft-workflow)):
  nothing under `docs/Documentation/` may require Claude.
- **A documented package is pinned at its `indexed_from`**: `sync` reads it at that version and
  writes its snapshot only of that version; **`sync --upgrade` (with `--package` for one) is the
  only way past the pin** (owner). A plain `sync` lists what is newer, and moves a package the
  store holds past its pin back to it ([Pinning](#pinning)). **`sync
  --query` (`--builtin` for the bundled packages) lists what changed upstream and writes
  nothing**: run it to see what work is waiting.
- **Bump a section's `indexed_from` when its package is re-indexed**: `sync --upgrade`,
  `analyze`, the pages, the bump, then a plain `sync`, which writes the new snapshots, and
  `derive`; commit the pages, the new `indexed_from`, the new snapshots and `derive`'s
  `builder/package-api.json` together. `analyze` compares with the snapshot at `HEAD` and only
  when its `version` is the `indexed_from` tag; committing the snapshots on their own, or the
  bump without them, drops the next `analyze` into audit mode. The bump fails the build until
  each callout labelled with the old version is checked against the new one and its label
  moved, or the callout removed: `analyze` lists them as the package's `recheck_callout` tasks.
- **After a new twinBASIC build, check again every callout labelled with an older one**, with
  `node scripts/recheck_callouts.mjs` (`--plan` first; [Tools-Defects](docs/Documentation/Tools-Defects.md#recheck-callouts)).
  It runs what each callout's marker names, each check once, one tool after another, moves the
  label of each callout whose evidence all holds, and lists the rest: *changed* (read the
  callout, then fix or remove it, rule 6 under *Plain-English prose* in WIP.Authoring.md), *not checked* (run again
  alone with `--from <report>` before believing it) and *by hand* (`none`). A full run takes
  hours; `--kinds` and `--only` cut it. An `analyze` of the whole reference (no `--package`) also
  lists the callouts labelled `BETA <n>` below the build the store's built-in packages come from,
  in `indexer/.packages/callouts.json`.
- **A change to `scripts/lib/twin-api.mjs`, `scripts/lib/twin-declarations.mjs`,
  `indexer/lib/api-model.mjs` or `indexer/lib/vb6-preprocess.mjs`, or to `format` in
  `api.json`, regenerates the committed snapshots in the same commit**, with a plain `sync`
  (never `--upgrade`), which indexes each documented package again at its pin. Otherwise
  `analyze` reports the scanner's changes as changes to the API. Run `derive --check` too,
  which reads the pinned build: a scanner change can change `builder/package-api.json`.
- **There is one scanner, `parseTwin`.** A misread declaration is fixed in
  `scripts/lib/twin-api.mjs` and pinned in `scripts/check_symbol_index.mjs`, never worked
  around in `indexer/`.
- **`derive` regenerates `builder/package-api.json`**, the packages' declared API that the
  build's symbol index (`tB/symbols.json`, for the IDE help add-in) is annotated from
  ([WIP.HelpAddin.md, Stage 3](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build));
  it needs a twinBASIC install (or `--release`). It is a step of every re-index (the bump above).

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
indexer writes, of the version wanted (its pin, or the newest), written by the scanner this
checkout has.

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

**No user name in a committed file** ([WIP.md](WIP.md#donts)): the manifest records the
source (`install` or `release`) and the BETA number, and snapshot paths are relative to
`Sources/`.

## One scanner

**`parseTwin` in `scripts/lib/twin-api.mjs` is the only scanner**; the indexer has no lexer or
extractor of its own, which would misread what the shared scanner reads right: a field named
for a keyword opening a container nothing closes, a `Public CoClass`, Delegates and a
`/*Private*/ Module` missed, and the values of a nested Enum and the fields of a nested Type
dropped. Two scanners also drift: the symbol index (`builder/package-api.json`) and the indexer would disagree about
one package, and each fix would be made twice. The scanner is pinned by
`scripts/check_symbol_index.mjs`, `scripts/check_twin_parsers.mjs` and
`test/indexer.test.mjs`; its header comment lists the ways to misread this corpus.

What the compiler answered, each asked of BETA 1010 and settled; the scanner follows it, and
the probes in `check_symbol_index.mjs` and the comments in `twin-api.mjs` hold the cases:

- **An unmodified `Declare` is Public in a Module** (another module calls it) **and must be
  Private in a Class** (TB5227), so it is never a Private member: in a Class it is an error.
- **`Dim x = 5`, `Public n& = 0` and a bare `Public r` are legal** without `As`, in a Module
  and a Class: a Variant with the warning TB0003, unless a type character gives the type. A
  Type takes no initialiser (TB5182) but a bare name.
- **`Abstract` and `Virtual` are not modifiers.** `Public Abstract Sub Y()` is a Variant
  variable named `Abstract` followed by a Sub the parser refuses (TB5182). These words
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

## api.json format 4 and the `#If` merge

`format` changes whenever the shape does, and `sync` indexes a package again when the store
holds another number. The declarations in the branches of an `#If`
(`#If VBA7 Then ... As LongPtr #Else ... As Long`) merge into **one member with a `signatures` list**,
a condition on each. Separate members with no condition would make an `#If` pair look like
overloads and hide a changed condition from the differ.

Format 4 (owner, 2026-11-15): **every declaration under an `#If` keeps its
`cond`**, a member, field or value the merge leaves alone included; kept only on the
alternatives of a merge, a Declare under one branch alone (tbKMode's `KfLowerIrql`, x86
only) or a Sub and a Declare of one name in the two branches (`InterlockedIncrement`) would read as
unconditional. And **a Declare records what it binds** (`lib`, or `libConst` for `Lib
DETOURS`, `entry`, `cdecl`, `fastcall`, `wide`, `params`), read by `declareParts`, so that a tool checking a package's Declares against
Windows reads them from the snapshot rather than parsing twinBASIC again; `builder/package-api.json`
keeps no signatures and so none of this.
The differ reads the merged form, with the condition in front of each signature, so that a
changed condition, a new branch or an edited signature each modifies the one symbol of that
name and kind. The rules for what counts as an alternative (same block, name, kind, accessor
and Declare-ness, more than one condition; two declarations under one condition are
overloads) are in the README.

A change to the fingerprinted code or to `format` regenerates the committed snapshots in the
same commit ([Rules](#rules)).

## Pinning

**A documented package is pinned at its section's `indexed_from`** (owner, 2026-11-16), and
`sync` reads it at that version unless `--upgrade` moves it. Without the pin, regenerating the
snapshots after a scanner change would move every section with a newer version on TWINSERV at
once, silently, in a commit about the scanner.

- **The pin is `indexed_from`, not the working-tree snapshot's `version`** (owner). The two
  agree at every commit; `indexed_from` is the one a person writes. The price: a plain `sync`
  in the middle of an upgrade moves that package back to its pin, and says so; `--upgrade
  --package <name>` moves it forward again, from the download cache.
- **The snapshot follows the pin** (`syncSnapshots`): it is written only when the store holds
  the package at its pin, current, and differs. So an upgrade writes no snapshot, and bumping
  `indexed_from` and running `sync` writes the new one. The same rule gives a section started
  after its package was synced its snapshot, with no case of its own.
- **The store holds one version of each package**, the wanted one. Keeping the pin and an
  upgrade side by side would serve the rare case of a scanner change during an upgrade, at the
  cost of a second layout every reader of the store would have to know. The download cache,
  `downloads/<package>/<version>.twinpack`, outside the store's history, makes moving back and
  forth free instead.
- **Built-in and default packages are pinned too** (owner), each at its own build, read from
  the `twinBASIC_IDE_BETA_<n>` folder of that build (by the BETA its `ide/build.js` names),
  else from its GitHub release by tag. The packages no section documents (the two spare CEF
  builds) follow the newest build. `derive` reads the pinned build, and refuses sections pinned
  at more than one, since it writes one file of one build.
- **TWINSERV keeps old versions**: on 2026-11-16 it listed every pinned version, the oldest
  pin among them. A version it drops can still be read from the store or the cache; with
  neither, `sync` fails that package, which is the right answer for a section documenting a
  version that can no longer be had.
- **`sync --query` lists what changed upstream and writes nothing** (owner, 2026-11-17),
  contributed packages by default, the built-in ones with `--builtin`. The built-in ones are
  compared by content because their only version is the build's, and a new build usually
  leaves most of them byte for byte the same: between BETA 1034 and 1042, VB alone differed.
  The comparison reports sources and public API apart, since a changed source with the same
  API (a fix inside a procedure) is no documentation work, and the API is that of the stored
  sources indexed by this scanner, so that a scanner change is never reported as an upstream
  one. Contributed packages are compared by version only: comparing their content would mean
  downloading every newer version, and a new version is worth a look either way (VBComDlg
  1.0.14.0 changes no public API).
- **The newest build is what `beta` in the built-in manifest names**, so `analyze`'s
  callouts.json still lists the callouts labelled below the newest BETA installed, whatever the
  pins say: those are the callouts a new build leaves to check.

## Decisions of the owner

- **Snapshots are committed only for the documented packages**, default, built-in and
  contributed. The packages no section documents and the extra CEF builds are indexed into
  the store and left out of the repository. A package joins when its section does
  (`syncSnapshots`, under [Pinning](#pinning)).
- **They are taken from the build each section's `indexed_from` names**, not from a newer
  one, so that the pages and the baseline agree and `analyze` of a newer build shows the real
  distance.
- **The twinBASIC "install" is the release zip unzipped.** Its `packages/<folder>/package.twinproj`
  files are the zip's, so either gives the same sources and the same `api.json`, byte for byte.
  The local install is therefore the default source and `--release` exists only for a machine
  without one. Nothing in the tool starts the IDE.
- **`analyze` covers the documented packages by default**; `--all` takes everything in the
  store, and `--package` and `--packages` name any. A package no section documents is audited
  against no pages, so every public symbol of it is work: the report would otherwise be mostly
  the undocumented packages and the two spare CEF builds.
- **The group of a package is a constant, not something the install says.** `DEFAULT_PACKAGES`
  in `twin-index.mjs` (`VBA`, `VBRUN`, `VB`: the three every project loads) are `default`;
  everything else in the install is `built-in`, and everything from TWINSERV `contributed`. A
  package the IDE starts to ship is `built-in` until someone adds it to the constant. The group
  decides the store folder, the snapshot folder and the folder of the reference.
- **CEF is one snapshot, `cefPackage145`.** `cefPackage49`, `cefPackage109` and `cefPackage145`
  are one source tree compiled against three CEF runtimes, and their `api.json` files differ
  only in the `package` key (checked on BETA 1010). `analyze` compares a package with
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
  its 17 values at BETA 1010, the first named `" "`.

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
  package (the thirteen built-in and default ones, and nine contributed ones) and planning
  it again: 994 of 998 members land on the file
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
  give every task `model: null`, and the agents would invent a page layout. A page of a kind its section lacks takes a model from the group's largest
  section that has one, of the same shape: a folder's `index.md` for a class that gets a
  folder, never a one-page class.
- **A permalink is computed only where the rule holds for every existing page** of the
  section (`followsFolders`). At BETA 1010 that is every section but VBA's, whose
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
  `check_examples --only` on the section (each run's lanes take slots of their own from
  `tbbroker`, so agents at once never meet), and fixes the pages. A contributed package without a
  `contributed-<Package>` template cannot be compiled, and the agent says so. **It also runs
  the doubts the other agents return**: the workflow passes their results into its prompt,
  and it settles each one a run can on a scratch page (`zz-probe.md`, every line expecting
  `' ?`, so the report prints what each line printed) and, for a package that replaces
  another object, on that object too (`cscript` for VBScript, `vb6run.mjs` for VB6). The
  Draft agents only list doubts: they run concurrently, so none of them compiles. The Lists
  agent reads a new package's README through read-only `gh` and lists the README's claims
  as doubts as well.
- **The agents are Sonnet**; the drafts are read against the sources before they are
  committed, which no model choice replaces.
- **A batch of 28 pages in 5 batches takes about 7 agents, 7 minutes and 0.96 M subagent
  tokens** (tbRegExp 1.0.5.0), and its samples compile and run on the first Check. The
  review still finds what no compile finds: the drafts state only what the code says, so
  where the package differs from the object it replaces (VBScript's **RegExp**, run under
  `cscript`) nothing says so, and claims read from the code but never run (`$0`, a lone `$`)
  need a probe page. Running the doubts is the Check agent's (above).
- **It is not in the published docs.** `draft` is (Tools-Build), because its plans serve a
  person writing pages by hand; the workflow is not ([Rules](#rules)).

## A Public Enum inside a Private Module

The indexer counts a Public Enum as public even inside a Private Module, because the members of a
built-in package's are reached qualified with the library name
(`WinNativeCommonCtls.ImlDrawTransparent`), and the enum's type name only through its library
symbol written with an asterisk (`*WinNativeCommonCtls`, as `ImlDrawConstants` says). On BETA 1042
the bare member and the bare type name of `ImlDrawConstants` are TB5079, as is
`As WinNativeCommonCtls.ImlDrawConstants` without the asterisk. An enum in a Public Module is
reachable bare in every form: `OrientationConstants`, in `Public Module Miscellaneous2`. A
contributed package whose internal module holds such an enum names that module in
`exclude_from_docs` (tbRegExp's `StaticRegex`; tbProjPacker's `modImpExp` and `modWin32`).

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
  describes a third party's HTTP API, which is neither a reason nor a decision, and folding
  it into this note would bury both. Its one reader is `lib/twinserv-client.mjs`, which
  calls only `query` and `download`; the rest (login, publish, version check, the IDE-to-compiler
  commands) is there for whoever writes a publisher tool. It is reverse-engineered from
  the IDE's own files, of which it keeps no copy, and describes BETA 1010. Check it against
  the current IDE before relying on anything but those two endpoints.
