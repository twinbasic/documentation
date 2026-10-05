# Compiling the Documentation's Code Samples

See [WIP.md](WIP.md) for the maintenance guide. This file covers the tool that answers *does
this sample actually build*.

`examples.bat` runs [scripts/check_examples.mjs](scripts/check_examples.mjs).
[scripts/lib/tb-fences.mjs](scripts/lib/tb-fences.mjs) holds the half that needs no
compiler, and [test/example-projects/](test/example-projects/) holds the template trees.
Reader-facing documentation is the [`check_examples.mjs`
entry](docs/Documentation/Tools.md) in Tools.md and [Checking that a sample
compiles](docs/Documentation/Authoring.md) in Authoring.md.

## State

Of 1,249 `tb` fences in 613 pages, **1,197 are marked `check_build`** and compile, and 52
are `inert` with a recorded reason. **None is undecided**, so the backlog the census measures
is empty. No fence is an `excerpt`. The run takes about 110 s. 33 of the marked samples are
also `check_run`.

New marked samples should come from editing pages, not from marking: the unmarked fences
that are left are not programs (see [What cannot be marked](#what-cannot-be-marked)).

## The problem

A `tb` fence is something `check_code_regions.mjs` protects the *contents* of and never
evaluates, so every gate was green over samples that do not compile: an icon key in a slot
the same package's prose says is validated, a `Sub` with no name, and the five
`Dim X As New Worksheet` samples in `Core/` (`Worksheet` is an Excel type, and in a bare
twinBASIC project that line does not compile at all).

## Why this is not part of a build

This is the constraint everything else bends around.

- **Cost.** An IDE cold start is 6--8 s per project and flat in project size (WIP.md,
  measured). A normal `build.bat` is ~4 s.
- **`npm install` must remain sufficient** to build the docs. A twinBASIC install is not on
  that path, and `dot.mjs`'s setup-failure behaviour exists to preserve exactly that.
- **CI cannot run it.** The harness needs Windows, a private desktop, and a CDP-reachable
  WebView2. None of that exists on the CI box.

So this is a **separate on-demand tool**, never invoked from `build.bat`, `check.bat`,
`test.bat`, or either CI workflow. A sample regression is caught when someone runs it, the
same arrangement `sweep_a11y.mjs` (~20 min, full site) makes.

## Opt-in, because the corpus says so

`check_examples.mjs --census` prints the live version of the table below, so there is one
reproducible number rather than several prose ones:

| slot | count | share |
|---|---:|---:|
| `file` --- a whole `Class` / `Module` / `Interface`; becomes its own `.twin` | 132 | 10.6% |
| `module` --- procedures and module-level declarations; a `Module tbx_<hash>` | 408 | 32.7% |
| `sub` --- loose statements; a `Module` and a `Private Sub` in it | 632 | 50.6% |
| `class` --- class code-behind, declarations; a `Class` | 57 | 4.6% |
| `method` --- class code-behind, statements; a `Class` and a `Private Sub` | 12 | 1.0% |
| fragment --- no wrapper rescues it | 8 | 0.6% |

The census also prints the fences by template and the inert fences by reason, and **which
classifiable fences carry no marker, by section and by page**. That last list is what the
marking work is planned from, and it needs no compiler. It does not claim any of them would
compile; only `--propose` knows that.

A fence that reads as unbalanced is usually a classifier that does not know the language,
not a sample that is incomplete. Three classifier gaps once produced most of the fragments.
Each is a probe in `scripts/lib/example-batches.mjs`, which `check_examples.mjs` and
`test.bat` both run:

- **an `Interface` body holds prototypes.** `Sub Bar()` inside one has no `End Sub`, so
  pushing it as a block eats the `End Interface` after it.
- **a `Type` is a container in twinBASIC**, unlike VBA: a UDT may declare
  `Type_Initialize`, `Type_Assignment` and `Type_Conversion`
  (`Features/Language/UDTs.md`). A UDT *field* may also be called `Type As Long`, which reads
  as an opener that never closes. So every opener demands a name after the keyword
  (`scripts/census_attributes.mjs` records the same trap).
- **`Overridable` is a modifier.** Without it in the list, a sample came back as *"End
  Function closing Class"*. A missed opener always surfaces as a mismatch somewhere later,
  never where it happened.

What is left as fragment is really fragmentary: an elision (`...`), a signature shown
without a body, a syntax skeleton with `<placeholders>`.

**Opt-in is right because many samples are correct as documentation and incomplete as
programs**: a `With MyLabel` block with no `MyLabel`, a handler for a class the page does
not define. When opt-in was decided, 54% of the classifiable fences compiled and 46% did not.
Marking the 46% would be wrong, and opting them out one by one would be a list of five
hundred exceptions. Page edits and harness work have since brought nearly all of them in.

## The markup

**In the fence info string.** `builder/render.mjs`'s fence renderer reads only the first
token:

```js
const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
```

The first whitespace-separated token is the language and the rest is discarded, so anything
after `tb` is invisible. This was verified against the real pipeline (`createMarkdownIt`
plus `initHighlighter`, not a bare markdown-it; see WIP.md's [Source
dashes](WIP.md#source-dashes)). Four properties are probes that ride along on every run:

| property | result |
|---|---|
| a marked fence renders byte-identical HTML to a plain one | **true** |
| `maskCode` still hides the body | **true** |
| the mask round-trips the marked fence | **true** |
| `applyPreRenderRewrites` leaves it byte-identical | **true** |

So the markup costs nothing at render time, cannot reach the HTML, and cannot perturb
`check_code_regions.mjs`, which compares fence *contents* and never sees the info string.

Shape --- bare flags and `key=value` pairs after the language token:

    ```tb check_build slot=module id=getobject-1

**No backticks in it.** CommonMark forbids them in a backtick fence's info string, and
markdown-it reads such a line as prose rather than as a fence, so the sample would not be
a fence at all.

| token | meaning | default |
|---|---|---|
| `check_build` | compile this sample | --- |
| `check_run` | compile it, build it and run it, and compare what it prints with what the fence says it prints (a trailing comment on a `Debug.Print` line, or the comment lines under `' Output:`). Statement samples (`slot=sub`) only; `MsgBox`, `InputBox` and `End` are refused. See the dispatcher design below | --- |
| `hidden` | context for the page's samples, compiled with them and rendered to nothing. Implies `check_build` | --- |
| `slot=` | `file`, `module`, `sub`, `class` or `method` --- what to generate around it | inferred |
| `inherits=` | the class the sample is code-behind *of*; forces the Class row | --- |
| `project=` | which template project to build into | inferred from the page's path |
| `projname=` | build these samples as one project | each sample is its own unit |
| `id=` | stable name for reporting | `<page>#<ordinal>` |
| `expect-error=` | the sample is *meant* not to compile; assert this error | --- |
| `resource=` | **on a fence in any language**: stage this fence's contents into the project at that path, instead of compiling it | --- |
| `concat_group=` | join these fences, in page order, into one compilation unit before classifying it. Implies `check_build` | --- |
| `inert=` | this fence is not a program, or cannot be one: `skeleton`, `signature`, `excerpt`, `pseudo`, `contrast`, `external`, `designer` or `blocked` | --- |

`project=` and `projname=` are one character apart and mean different things: the template
to build into, and the group to build with.

**`slot` and `project` are inferred and stated only when inference is wrong.** A
misinference is self-reporting: it produces a compile error, not a silent pass, and the
reporter names the slot it used in every finding. `project` follows the page: anything under
`Reference/Built-In/` or in a package tutorial gets the template that references every
package, because the package a sample needs is what the page is *about*. Stating `project=`
on 263 fences would repeat the directory name above it.

**A mistyped marker is a finding.** `check_bild` renders identically to no marker, so a
sample carrying one would never be compiled and nothing would say so. This is the one
failure mode of the design that is invisible by construction, so it is checked in every mode
including `--census`.

### `inert` is a decision, not a suppression

An unmarked fence used to mean two things --- nobody has looked, and somebody looked and
concluded there is nothing to compile --- and the census could not tell them apart.
`inert=<reason>` records the second. It **takes a reason rather than being a bare flag**:
the reason makes the count readable and lets a later reader disagree with a specific
judgement rather than with a silence. An unknown reason is refused the way a bad `slot=` is,
and `inert` beside `check_build` is refused as a contradiction.

The census prints three numbers: marked, inert by reason, and **undecided**. Only the last
is a backlog, and it is the one to drive to zero. The inert count should sit still.

**`blocked` is the one reason that is not about the fence**, and **nothing carries it
today**. It marks correct code that a *product* defect stops compiling. It exists so that
the alternative, rewriting the sample until the compiler accepts it, is not taken by
accident.

Do not reach for it too early. Six enum members a default project cannot name (each enum
sits inside a `Private Module` or a private base class) were once marked `blocked`, until the
question *what would a reader actually do?* found the answer: the asterisk. `*WinNativeCommonCtls`
exposes the package's private half, and `WinNativeCommonCtls.ImlDrawTransparent` compiles.
The templates `wnc-private` and `cef-private` join `vb-private` and `cc-private` for this,
and each such page carries an IMPORTANT saying which library symbol to set and why.

**The rule: documenting a call and leaving no way to make it work is worse than either
fixing it or deleting it.** `blocked` is for a defect with no workaround at all, and
reaching for it means the workaround has not been looked for hard enough. The package
defect is still a defect (BUGS-TO-REPORT.md carries it, since a documented enum should not
need the asterisk).

### A sample can be compiled against a file

`[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", "events", "name", "id")]`
fills an empty `Enum` with members read from a project file **while compiling**. A page
documenting it has samples whose symbols exist only if that file does. `WinEventLogLib/index.md`
is the case: its `Class MyService` names `MESSAGETABLE.EVENTS.service_started`, which comes
from the JSON the page prints two sections further down.

`resource=<project-relative path>` on that ` ```json ` fence stages it. impexp packs a
`Resources/` tree into the `.twinproj`, the attribute reads it, and a module referring to
`MESSAGETABLE.EVENTS.service_started` compiles with 0 errors, so the member names really are
produced from the file. The JSON's shape --- which array, which field supplies the name,
which supplies the value --- is checked against the code that reads it, on the page that
documents both.

Four rules, each a consequence rather than a preference:

- **It is a file, not a sample.** Never compiled, never counted, absent from the census, and
  it cannot pass or fail. The run header says `N staged file(s)`.
- **It travels with its page**, as `hidden` does, so no `projname` is needed for it to
  reach the page's group.
- **It keeps its own id series** (`<page>#r1`). Numbering it with the `tb` fences would
  renumber every sample below it on the page, and a sample's generated module name is a hash
  of its id.
- **The path may not leave the project.** No `..`, no drive letter, no UNC. The guard must
  test for `//` *before* stripping leading slashes, or `//server/share/x.json` passes as
  `server/share/x.json`. Eight probes cover it.

### One construct across several fences

`concat_group=<name>` joins its fences into one synthetic fence, in page order, **before
`classify` runs**. It has to: each part of a split `Class` is an unclosed block and
classifies as nothing. The joined fence keeps `concatParts`, the generated-line range each
part occupies, and `partOf` maps a diagnostic back to its part's own page line. An
off-by-one there would point every finding in the second part at a plausible wrong line,
which is why four of the concat probes are nothing but line mapping.

A fence that is one closing line short of compiling gets `' ...` and the closer (this is in
the public authoring guide), not `inert` and not a concat group.

Its use is **hidden parts around a visible one.** The Painting tutorial's `OnPaint` has to
sit inside a class that implements `ICustomControl`: its `Implements … .Paint` clause needs
the class-level `Implements`, the interface's other two members and the field it draws
with, all in the same class. A `hidden` fence cannot supply that, because it is a unit of
its own: context a sample can *refer to*, never a container a sample goes *inside*. Without
the class-level `Implements` the sample fails with `TB5016 Interface 'ICustomControl' was not
found`.

The CustomControls `Framework/` excerpts are built the same way: each method sits between a
hidden header (the class, its `Implements`, the fields the method sets) and a hidden footer
(any helper it calls, the interface's other two members, `End Class`). The visible code is
unchanged. A one-line hidden part in front also supplies a single undeclared field
(`SelectItem`'s `m_SelectedIndex`). An `implements=` key could not do this: with only
`Initialize` supplied, `Implements CustomControls.ICustomControl` is `TB5000 Missing
implementation of member Sub Destroy()`, and the wrapper cannot synthesize stubs for an
interface whose shape the tool does not know.

**A group is its page's own.** Groups are scoped to the page. Keyed by name alone, two
pages that picked the same name would become one unit --- a class opened on one page and
closed on another --- silently, since the join precedes classification.

**The unit is its first *visible* part.** If the joined unit inherited `hidden` from a
hidden first part, it would become page context. Page context is compiled only if the page
has another sample, and `splitBatch` cannot isolate a failure to it.

### `hidden`: a page's own context

A fence marked `hidden` is compiled with the page's other samples and **rendered to
nothing**: `builder/render.mjs`'s fence rule returns `""` for it, so it is absent from the
HTML and from everything downstream that reads the rendered string: the search index, the
offline mirror, the PDF book. Verified across all three trees.

It exists for fiction invented for one page (`MyServiceA` / `MyServiceB`, `ClientSession`).
Putting it in a shared stage set would make a template read by six hundred pages carry
declarations that serve one.

Rules:

- **A hidden fence is the PAGE's context, not a unit.** It joins every batch holding a
  sample from that page, and is never compiled alone --- a hidden block compiled by itself
  passes and helps nobody.
- **Its declared names are charged per page, not per unit.** Charged per unit, the *second*
  sample on a page "collides" with the context the first brought, and every page with hidden
  context splits into one project per sample, each costing a whole IDE start.
- **They still have to be counted.** Two pages whose hidden blocks both declare a
  `ClientSession` must not share a project. A probe says so.
- **`hidden` implies `check_build`**, because a hidden fence nobody compiles is text nobody
  can read and nothing checks.
- **A page cannot hide what it also shows --- so rename the placeholder.** Hidden context
  joins every project holding a sample from its page, so a *visible* sample on that page
  declaring the same name meets it (`TB5137 'IFoo' is ambiguous`).
  `Reference/Core/CoClass.md` is the case: its first example named `IFoo` and `IBar` without
  declaring them, and its next example declares both in full. `IFoo` and `IBar` are arbitrary
  placeholders, so the first example is now a `CoClass Shape` over `IShape` and `IDrawable`,
  with those two interfaces in a hidden fence. The general rule: **when hidden context
  collides with a visible sample, check whether the name is load-bearing before working
  around it.**
- **Write hidden declarations at the top of their fence**, not inside a `Module` wrapper,
  so the batcher can read their names (`COLLIDES` records a fence's outermost container).
  The harness generates the module for a module-slot fence anyway. This matters for a name
  the sample cannot change, like the Win32 `POINT`; a colliding placeholder is simply
  renamed.

The line between a stage entry and a hidden fence: **a local goes in the sample; anything
the reader already has elsewhere in their program --- a helper procedure, a module-level
flag, the class the page's prose asks them to insert --- goes in a `hidden` fence; a control
instance goes in the stage set.** A single-letter name in a hidden fence is the shape to
avoid: nothing separates two pages that both declare a module-level `A`, because `COLLIDES`
tracks type names only.

### `expect-error`

`Reference/Core/Option.md`'s module-level example shows that `Option Explicit` makes an
undeclared variable an error, so it carries `expect-error=TB5079`. **Assert the code, not
only the failure**: a renumbering in a future BETA then fails the gate loudly and somebody
updates it, which beats a sample that quietly stops demonstrating anything.

## Template projects

Version-controlled exported trees under `test/example-projects/<name>/` --- a `Settings`
file plus `Sources/`, exactly what `node scripts/impexp.mjs export` produces and what `tbrun`
already consumes. Three exist:

| template | references | for |
|---|---|---|
| `console` | stdole, VB (Forms), AppGlobalClassObject | everything by default |
| `packages` | the above plus all eleven other shipped packages | `Reference/Built-In/` and the package tutorials |
| `form` | `console`, a delta | a `check_run` sample that needs a real form: drawing, `Cls`, `Print`, `Scale`, a form property. Never inferred: a fence says `project=form` |

(The table is the three whole templates. The deltas over them --- `vb-private`, `cc-private`,
`wnc-private`, `cef-private`, `implicit`, `cef`, `webview2` --- are `TEMPLATE_BASE` in
`scripts/lib/example-batches.mjs`, with `form`.)

**Template inheritance.** `TEMPLATE_BASE` names each template's base. The stager copies
base-first, delta-over, so a template holds only the files that *differ*: `vb-private` is
one `Settings`, `cef` and `webview2` are one stage file each. The relation lives in the tool
rather than in the tree on purpose: a template directory is an exported twinBASIC project
that impexp packs whole, so a marker file in it would go into every batch built on it: one
more thing to test.

**`project.references` is a plain JSON array, and a hand-written entry works.** An entry
composed from a package's own `Settings` --- id, name, version, `symbolId`,
`isCompilerPackage: true` --- resolves the package's symbols exactly as the IDE's package
manager's does. A template is made by appending to that array; no IDE session is needed, and
the result is diffable.

**`overrideSymbol`, and the package's private half.** `VB.IVBPrint` does not resolve in an
ordinary project: the VB package's top-level components can be `Private`, and the IVBPrint
page tells the reader to prefix the library symbol with an asterisk (`*VB`) to expose them.
The project-settings key is **`overrideSymbol`**, alongside (not instead of) `symbolId`; the
IDE resolves `r.overrideSymbol ? r.overrideSymbol : r.symbolId` (`ide/main.js`). That is the
`vb-private` template: the page documents a project configured differently from the default,
so its samples build in a project configured that way.

**Two templates for one control name.** Both browser tutorials tell the reader to *"drop a
control onto a Form and rename it `WebView`"* --- one a **CefBrowser**, one a **WebView2**.
One name, two types, so no single stage set can carry it. The `cef` and `webview2`
templates each have their own `tbxStageBrowser.twin`, routed by path in `defaultProject`.

### The `form` template

**`form` is `console` plus a real `Form1`**: `Sources/Form1.twin` (a predeclared class with the
`FormDesignerId` attribute) and `Sources/Form1.tbform` (its designer file), and its own
`tbxStage.twin`, which is console's less the line `Public Form1 As Form`. A form made with
`New Form` in code has no designer file and cannot be drawn on (`Load` raises 361, `AutoRedraw`
raises -2147467259), so the form has to be a file of the project. Four facts, all measured on
BETA 995:

- **An empty form has no `_children` key.** `"_children": []` in `Form1.tbform` fails the build with
  `TB5247 unable to find matching form designer JSON via FormDesignerId`, and `Form1` is then
  unrecognised everywhere.
- **The stand-in makes no difference to `Load Form1`.** With `Public Form1 As Form` in the stage
  beside a real `Form1` class, `Form1` reaches the class's predeclared instance
  (`TypeName(Form1)` is `Form1`, `Load Form1` and `AutoRedraw` work), and the stand-in stays
  `Nothing`. In the `console` template, with no class, `Form1` is the stand-in and is `Nothing` at
  run time. The `form` stage drops the line anyway, so that no second `Form1` exists at project
  scope. A probe holds the two stage sets to "console's less that line", which is the only
  thing that keeps the lists from drifting apart.
- **Fences for `form` go in a run project of their own.** Batches are grouped by template, so a
  `project=form` run fence is never packed with a `console` one. A `projname=` group whose fences
  all say `project=form` is one form project (`checkGroups` refuses a group of two templates, so
  the `slot=file` module fence that declares `GetPixel` says `project=form` too).
- **The dispatcher unloads every form each sample leaves loaded.** A loaded form ends the
  run with `[DEBUGGER] Waiting for remaining forms to close...` and keeps it waiting, and the next
  sample finds the form with what the last one drew (a second sample's `GetPixel` on a form the
  first had drawn on read red before it drew anything). `tbxRun` therefore calls `tbxUnloadForms`
  after each sample and before its end marker; a sample that forgets `Unload Form1` costs nothing,
  and the samples share no form. The VB6 harness does the same.

### The stage set

Each template carries a `Sources/tbxStage.twin` declaring the control instances the samples
assume --- `Text1`, `ListView1`, `CefBrowser1`, and so on. A sample that says
`Text1.Text = "hi"` is form code-behind: complete as documentation, because the reader has a
form with a `TextBox` on it, and impossible to compile alone, because the designer rather
than the code declares `Text1`. Declaring those instances lets the compiler check what the
sample asserts: that the member exists, that it takes those arguments, that the types line up.

Measured on the 263 `Reference/Built-In` fences: **99% fail against a bare template, 78%
with every package referenced, 67% with the stage set**. Per package, CEF goes 85% → 15%,
WebView2 73% → 27%, WinNativeCommonCtls 100% → 45%.

**The list is written out rather than inferred, and that is the point.** A rule over "an
identifier ending in a digit" would also declare `Var1`, `Arg1`, `Line2`, `SQLITE3`, `VBA7`,
`MySub1` and `IShellView2`, none of which is a control. The stage set is the tool's one
deliberate fiction, so it stays explicit and greppable.

**Stage entries are the biggest lever.** A flat tail of undeclared *names* is not a flat
tail of *work*: 45 undeclared VB control instances (`lblName`, `mnuFileSaveAs`, `optPlain`,
`dlgOptions`, `fraLeft`), each on one or two pages, bought 22 samples in `Default/VB` for
one file edit.

## Batching, which is the whole cost question

One project per fence is unaffordable. What makes it tractable is that **IDE cost is flat in
project size**: what is paid for is startup, not compilation.

**Fill the lanes, not the batches.** Filling each batch to `--batch` before opening another
put 120, 55, 4 and 3 samples on four lanes, and a run takes as long as its biggest batch. The
batcher sizes to `ceil(total / jobs)` instead. On the VBA reference that was 28 s → 10.7 s
for the same result.

### A sample can pass on its neighbour's declarations

Several samples share a generated project, and a `module`-slot sample's declarations are
**visible to every other sample in it**. So a sample can compile because an unrelated one
defined what it referenced. Which samples share a project depends on the selection, so the
same page can pass one run and fail the next. `Tutorials/Testing-with-Assert.md` defines
`PadLeft` in one fence and tests it in three others: a `--propose` survey compiled all 30 of
its fences together and passed, while the gate (marked fences only) put the definition in a
different project and the tests failed on `Unrecognized symbol 'PadLeft'`.

`projname=` is the answer. It is markup rather than a heuristic because the grouping is a
fact about the page that no scan recovers:

- samples sharing a `projname` are compiled **as one project**;
- **and nothing else is compiled with them**, so the result depends on what the author
  grouped and the template, not on what the run happened to pack beside it;
- a group that is only **half marked** is a finding naming the missing members, because the
  alternative is an error about a missing symbol in the sample that is fine.

A page-atomic rule (keep every page's fences together) is worse twice over: it silently
merges samples on pages that deliberately show two versions of one class, and it still
leaves a page passing on another page's declarations. Three probes cover the batcher, since
a grouping that stops holding produces a green run whose samples were compiled apart.

**A `projname` group puts two definitions of one procedure into one project; it cannot keep
them apart.** `Tutorials/Arrays.md` presents a naive and a better `ArrayLen`, and a later
fence calls it: `TB5073 'ArrayLen' is ambiguous`. `COLLIDES` does not track procedure
names.

**The residual is stated rather than closed:** two *ungrouped* samples still share a
project and can still see each other. Nothing in twinBASIC hides a module's public members
from the rest of a project, so the only complete fix is a project per sample, at 6--8 s
each. A real dependency is now written down.

**The gate is the detector.** A `--propose` survey compiles every classifiable fence
together and the gate compiles only marked ones, so they disagree by construction.
**Always run the gate after `--apply`.** A page run (`--only`) is not a gate run either: a
five-page selection packs into different batches than the whole corpus does, so finish a
batch of edits with a full run.

### Collision rules

All are forced by putting unrelated samples in one compilation unit:

- **One generated `Module tbx_<hash>` per fence.** The hash covers the fence's id, so it is
  stable across runs and traceable without a lookup table.
- **Everything generated is `Private`.** Eleven pages declare a `MyString`.
- **`Sub Main` comes from the template, and a fence may bring its own as well.** Two
  `Public Sub Main`s in different modules compile, so the WinServicesLib `Module Startup`
  samples build as written. (A *build* adds a rule; see [`--build` and `--llvm`](#--build-and---llvm-what-a-compile-does-not-ask).)
- **A generated module must not share a name with the project.** `project.name = "ProbeWS"`
  beside `Module ProbeWS` makes `[RunAfterBuild]`'s `ProbeWS.ProbeWS.Probe` ambiguous, and
  the IDE refuses it at *execution* time, so the build is green and nothing runs.

**What collides is narrower than it looks, and guessing it wide is expensive.** Two
generated modules may each declare `Public Function Foo`, `Public Type Rec` and `Public Const
Answer`, and two different Enums may each have a member called `Red`. Two Enums with the
*same name* are `TB5000 duplicate definition in the current scope`. So only type-level names
(`Class`, `Module`, `Interface`, `CoClass`, `Library`, `Namespace`, `Enum`, and also `Type`
and `Structure`, see below) force two samples apart. A rule that also tracked procedures
would split batches, each costing a whole IDE startup, for nothing.

**A collision rule has to cover the names a sample can be made ambiguous *by*, not only the
ones two samples would duplicate.** Two modules may each declare `Public Type Rec`, but a
module-scoped `Type Foo` and a project-scoped `CoClass Foo` are **both in scope inside that
module**, so a reference to `Foo` there is `TB5137 'Foo' is ambiguous`
(`Features/Language/Pointers.md#1` and `Interfaces-CoClasses.md#5`). `Type` and `Structure`
are in the set for that reason.

**`COLLIDES` reads a fence's *outermost container* names, so it is still too narrow for
nested enums.** `Module MESSAGETABLE` is what it records, not the `Enum EVENTS` inside it
nor that enum's members. twinBASIC puts enum members in project scope whatever container
declares them, so two pages whose hidden context each declared an `EVENTS` enum landed in
one batch: `TB5000 duplicate definition [EVENTS]` and `TB5073 'status_changed' is
ambiguous`. The fix taken is `projname=` on each page, which buys an isolated project.
Tracking nested enum names in `COLLIDES` would be the general version, at the cost of
splitting batches for names that usually do not collide.

### `check_run`: one dispatcher per batch

**`[RunAfterBuild]` is one per project.** `TB5114 encountered too many [RunAfterBuild]
attributes. Only allowed one per-project.` So `check_run` cannot batch the naive way. It
uses one generated dispatcher per run batch (`Module tbxRun`, `lib/example-run.mjs`'s
`dispatcherText`) that calls each sample's `tbxBody` in turn, with a marker line printed
around each call so the output can be attributed and a sample that throws does not silently
swallow the rest.

**Each call has an `On Error GoTo` handler of its own, not `On Error Resume Next` and a test
of `Err.Number` after the call.** A procedure that handles an error with `On Error Resume
Next` and returns, by `End Sub` or `Exit Sub`, leaves `Err` set for its caller, in VB6 and in
twinBASIC alike (VB6 against BETA 995, identical; kit `s69/errpersist/`). Only a `Resume`
from an `On Error GoTo` handler, or any `On Error` statement, clears it. With a test after
the call, InStr.md's sample that demonstrates error 5 under its own `On Error Resume Next`
was reported as raising it. The caller's handler is reached only by an error the callee did
not handle (`InStr(0, "abc", "a")` unhandled in a sample's body printed `[tbx-run] error 5
Invalid procedure call or argument`, and the next sample ran), and `Resume tbxNext<n>`
clears it before the next call.

### `vb6run --docs`

**`node scripts/vb6run.mjs --docs` compares the same fences with VB6.** It reads the
`check_run` fences through `collectFences` and `joinConcatGroups`, refuses them with
`runRefusal`, and judges what VB6 prints with `expectedOutput` and `judgeOutput`, so the
comparison is the one `check_run` makes, against a second implementation. A fence of a
`projname=` group is built as a project of its own (class and module names collide between
groups, so groups are never batched together): the group's other fences, gathered by name as
`checkGroups` gathers them, are its files, each `slot=file` fence translated into VB6
components by `translateTwinFile` --- every `Class` block a `.cls` with VB6's class header,
every `Module` block a `.bas`, and what is outside both one more `.bas` --- and each run
fence is a module in it. Nothing else is translated: an `Interface`, an attribute line or a
generic stays where it is and VB6 refuses it, so a group whose files do not build ends with
every run fence `not VB6`, at the first error's page line. Each component keeps the fence's
line numbers, with the other components' lines blank, and a class's line is the file's less
two as a module's is (checked against a real error in a class, a module and the top level).
The dispatcher opens the output file before each sample and closes it after, so
`Class_Terminate` of an object released when the sample's `Sub` ends prints into it. Most
twinBASIC syntax is not VB6, and a compile error there is the state `not VB6`, which is
information; a `differs` is what the tool is for. What building in VB6 taught
(`scripts/lib/vb6.mjs`, which has the list):

- `Debug.Print` writes nothing in a compiled exe, so each one is rewritten to `Print #511,`,
  and the comma stays on a bare `Debug.Print` because `Print #511` without it is a syntax
  error.
- The project is built with `Unattended=-1` so that a box VB6 would show goes to the event
  log.
- VB6 numbers a module's lines from 0 and not counting `Attribute` lines, so a compile
  error's line is the file's less two.
- `Err.Source` of an error raised in the exe is the project name, which is why
  `ErrObject/Raise.md` differs.
- `Close` with no argument in a sample also closes the file the output goes to, so the
  sample's next `Debug.Print` raises error 52.

**A `project=form` fence is built in VB6 with a blank `Form1.frm`.** The project then has a
`Form=Form1.frm` line and no `Unattended=-1`, which VB6 refuses for a project with a form, so
its exe is run on a private desktop (`runOnDesktop`, as a reproducer's is) and the time limit ends
one that waits on a box. A `projname=` group takes the form when any of its fences says
`project=form`; plain fences that say it are one project of their own. The harness unloads each
sample's forms before the end marker, as the twinBASIC dispatcher does, because a loaded form keeps a
VB6 exe running after `Main` returns. `Declare PtrSafe` is not VB6: `declaresForVb6` drops `PtrSafe`
and reads `LongPtr` as `Long` on a Declare statement's lines (and its continuations) and touches
nothing else, which is what lets the documentation's `GetPixel` module build. Checked on BETA 995
and in VB6: both form samples print what the pages say (`Graphics-Methods.md`'s three lines, and
the Form page's `True`).

### What a batch runner must do

- **Keep a source map.** Errors return against a generated file and line; the report names
  the page, the fence and the line within the page. It is emitted while generating, not
  reconstructed afterwards. The offset differs per slot and the arithmetic must come out the
  same for all three, which is a probe.
- **Isolate a compiler crash, starting from the sample it names.** twinBASIC runs the
  compiler in-process with user code, so a bad sample can take it down, and in a batch that
  loses all hundred with it. `tbbuild`'s crash report names the file the compiler died
  parsing, which for a sample is its generated module. So the unit holding it is built alone
  and the rest of the batch without it: two builds, paid only on failure. With no sample
  named, split and recurse: O(log n) extra builds. On a page of nine samples with the crash
  fixture fifth, halving took 7 builds and 48 s and the named start 3 builds and 22 s, with
  the same finding and the other eight still reporting.
- **A batch that reports nothing is not a clean batch: a canary rides in every one.**
  `waitForCompile` reads the IDE's window --- the status counters and the Problems panel of
  the open project --- once the compiler status is OPERATIONAL and either the page's traffic
  shows the compile has ended and the window agrees with it, or five one-second samples
  match. It waits for no build. An IDE under load can sit OPERATIONAL with an empty panel
  before it has published anything, and every sample of that batch then reads as compiling,
  with nothing to tell it from a batch that has no errors. (`sweep_attributes` met it
  first: one build in 136 of a full run drew `ACCEPT` for all three of its canaries,
  including the invented name that can only draw an error. The cause is not established.)
  Each batch carries `tbxCanary`, a module with `[EnforceWarnings(TB0005)]` and a `#Warning`
  directive, which must draw the warning TB0005. Its rows are taken out, at any severity,
  before anything else reads them.

  **It is a warning, and enforced, because that is robust and leaves a clean batch clean**
  (BETA 987, `canary-warn.mjs`, ten cases). TB0005 appeared beside an unterminated `Sub`, an
  `If` with no `End If`, a stray `End Sub` with garbage after it, a class inheriting itself
  with an unknown type, ten undefined names, under Option Explicit off, and beside a module
  with `[IgnoreWarnings(TB0005)]`. A plain `#Warning` vanished in a project that ignores
  TB0005 and became an ERROR in one that promotes it; the enforced form stayed a warning in
  both. No template changes `project.warnings` today (the defaults leave every warning on),
  so the attribute is insurance. An error canary puts an error in every batch, so `tbbuild`
  never exits 0. An undefined-symbol canary is only the warning TB0002 under **Option
  Explicit off**, where the name is declared implicitly, and stopped a full run on
  `Core/Deftype.md:56`, a sample that compiles, in the `[implicit]` template. A batch that
  crashes the compiler returns no rows at all, canary included; `runBatch` hands a crash to
  `isolateCrash` before it reads the canary, so that case never reaches it.

  Ten failing samples across the console and `[implicit]` templates (among them an
  unterminated `Sub`, garbage after a stray `End Sub` and an `If` with no `End If`) were each
  reported with their own errors, with no canary event and no split, in about 13 s.

  **The canary is required only by a read with no errors in it.** It proves that the IDE
  published something, never that it published everything: a read that includes it and
  misses a later file's diagnostics would still pass that file. So a read holding real
  errors has already shown what the canary would, and is taken as read: no rebuild, no
  split, no stop. `heard()` decides what is real: an ERROR in one of the batch's samples, or
  an unattributed row the template does not draw by itself. **The template's own rows do not
  count**, or a template that always draws one would switch the canary off for every batch
  of it. A canary missing *beside* real errors is printed as a note and not acted on; it
  would be the first sign of a read that holds some files and not others.

  A silent read (no errors, no canary) is built once more; then split, as for a crash, until
  each part reports the canary or errors of its own. A unit that is still silent stops the
  run (exit 2, its name) without being blamed: its clean may be false, and a finding would
  claim something about its code that a build with no diagnostics cannot. A `projname`
  group is one program and cannot be split, and needs no splitting: if any member fails, the
  read was not silent. This keeps a corpus that legitimately fails (a `--propose` survey)
  from ever being stopped or slowed by the canary.

  `ownRowsOf`'s empty-template build follows the same rule: a silent read is read again and
  refused when silent twice, and a read with rows of its own needs no canary. It is
  memoised for the whole run, and a silent read believed there would leave `own` empty, so
  every batch with a template-own row would bisect to single samples and blame each one.

  Tested against a fake lane: an early read answered by one build; a sample that hides it,
  with no errors of its own, found and named; the same sample with errors of its own taken as
  read in one build, with the note; a group with only some members failing taken as read in
  one build; the hiding sample with only the template's own row named; two that hide it only
  together separated by halving; a batch that never reports; the empty template read again,
  refused when it never reports, and believed in one read when it has rows of its own.
- **A crash that needs two samples must not vanish.** Halving separates any pair by the time
  it reaches single samples; both halves then build clean, and every sample in the batch
  would count as compiling. So when neither part of a crashing batch crashes on its own (the
  named sample and the rest, or two halves), `together` searches for the samples the crash
  needs: holding one part fixed, whichever half of the other still crashes with it holds
  them, and when neither does, each half is searched with the other held. The members are
  blamed --- each has its own result, and none is a pass --- and one finding names them all.
  **No real crash of that shape is known**, so its tests are probes against a fake lane
  whose builds crash on the sample sets a probe chooses. Four two-file candidates were
  tried for a real one: inheritance cycles through interfaces, classes and UDTs, and the
  fixture's placeholder name with a base declared in the other file. None crashes only as a
  pair: the class and UDT cycles are diagnosed, the interface cycle is accepted without a
  word, which is queued in [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md), and the placeholder
  crashes from its own file.

### A diagnostic that lands in a package's own source

**A sample can produce a compiler error that appears in no file the sample is in.** A
generic instantiated with a type the project does not have is reported against the
*generic's own type parameter*, inside the package's source:
`Packages/WinServicesLib/Sources/ServiceCreator.twin [10,20]: TB5079 Unrecognized datatype
symbol 'T'` for a sample writing `New ServiceCreator(Of MyService)` with no `MyService`
anywhere. The sample gets **no diagnostic of its own at all**. Treated as a template fault,
that row would count the sample as one that compiled, a false pass of exactly the kind this
tool exists to end. (`WinServicesLib/index.md#1` has this shape and is unmarked.)

Three parts to the handling, each forced:

- **An unreadable row and an unattributable one are different.** A row this cannot parse
  names no file, so no amount of splitting finds its cause; an ERROR against a file that is
  not one of the batch's generated samples has a cause among them.
- **One build of the template with nothing in it decides whose row it is**, memoised per
  template and shared across lanes. Without that the leaf is ambiguous --- a sample that
  provoked the row and a template that emits it unprompted look identical --- and guessing
  the first would bisect every batch to a single sample, hundreds of IDE starts, and then
  blame an arbitrary one. The probe is lazy, so a clean run pays nothing for it.
- **The split goes by unit, not by slicing the fence array.** A `projname` group is one
  program, and a page's `hidden` fences are appended at the *end* of `batch.fences`, so a
  plain halving takes a group apart and drops one half's context, manufacturing the failure
  it then reports. The crash bisect has the same rule.

Cost on this corpus: one blame in 1,103 samples, three extra builds.

**`--only` cuts a `projname` group.** Narrowing to `WinServicesLib/ServiceCreator` left the
page that declares `MyService` out of the run while keeping three pages that instantiate
`ServiceCreator(Of MyService)`, so the isolation blamed a sample the full gate passes.
`checkGroups` now says so as an advisory finding. **A narrowed run's results are not a full
run's, and the tool has to be the thing that says which.**

### `--build` and `--llvm`: what a compile does not ask

**A compile asks the front end; code generation runs in a build.** A sample can compile
clean and still fail the build, and under LLVM the IDE reports "a feature used in your code
is not yet supported with the LLVM compiler". `--build` presses Build on each project whose
compile has no errors, through `compileProject`'s `build` option, and `--llvm` (which implies
`--build`) writes `+llvm` into each batch's `compiler.buildOptions` and
`compiler.debugOptions`. A plain `--build` run is the control for an `--llvm` one: a sample
that fails only the second is one LLVM cannot generate code for.

- **A failed build is a crash, for isolation.** `compileProject` returns code 5 and
  `buildStaged` turns it into `{ crashed: true, buildFailed: true, named: <empty set> }`.
  Nothing in a build log names a sample, so `runBatch` halves the batch, and `together`
  finds a set that fails only in combination. The notes and findings are worded by kind:
  "fails the build", and a second line naming "the LLVM build" under `--llvm` and "the
  build" otherwise, with the advice to record it in `BUGS-TO-REPORT.md` if it is the
  compiler's fault. The lane's `llvm` field chooses the wording.
- **The canary does not stop a build.** `[EnforceWarnings(TB0005)]` keeps its `#Warning` a
  warning whatever the project's settings say, and a warning does not stop the IDE building:
  a probe with the canary module beside it builds and runs (tbrun, exit 0, BETA 995).
- **A project with compile errors is compiled and not built.** `not built: b<n>.twinproj has
  errors, the first ...` prints, and the run ends by counting the samples that only ever sat
  in such a project: "N sample(s) in batches with errors were compiled but not built". A
  sample counts as built if any project that held it, a smaller one from isolating a larger
  included, was built.
- **`--llvm` needs a Professional or Ultimate licence.** `llvmLicence` in `tb-ide.mjs`,
  shared with `tbrun`, reads the status bar's licence once the compile has settled, and
  `compileProject` returns code 2 for a Community or Personal one.
- **A build that ends the compiler writes no failure line.** A native exception during an
  LLVM build (`NATIVE EXCEPTION: ACCESS_VIOLATION`, then "restarting from MEMORY") leaves
  the log without a success or a failure line, so `buildProject` treats the exception line
  as a failure; otherwise it waits out its whole timeout.
- **A `[RunAfterBuild]` that calls `Debug.Cls` would erase the build log.** `buildProject`
  wraps the page's `clearDebugConsole` (`keepClears`, as `tbrun` does) and reads what each
  clear after its mark erased in front of the console, so Tools.md's own tbrun sample builds.
- **A failed build is believed when it repeats.** `buildTwiceOnFailure` builds a failed
  batch again before halving, and every part the halving builds the same way: a build can
  fail once and pass when repeated, as one that reported nothing for 120 s did in a full
  `--llvm` run (BETA 995).
- **Each IDE has a temp folder of its own**, `%TEMP%\tbbuild-tmp-<port>`, set as its `TEMP`
  and `TMP` by `launchIde`. IDEs building at once in one temp folder fail now and then with
  `[TYPELIB] failed to finalize typelibrary.  Disk error?` and `[LINKER] FAILED to create
  type library`, on samples that build clean alone: 8 of 192 builds, eight at once, against
  0 of 192 with a folder each (BETA 995). The compiler imports `GetTempFileNameW`, and
  writes the type library to a file it then reads back; a name two processes both take fits
  the counts, but is not proved.
- **A build adds three collision rules a compile does not have**, each measured on BETA 995:
  - **`expect-error` samples are batched apart.** One such sample (Option.md, TB5079) left
    the 129 samples beside it unbuilt, since a project with an error is not built.
  - **A unit declaring its own `Sub Main` gets a project of its own, without `tbxMain`.**
    Two Mains compile, but binding the startup object fails the build ("'Main' is
    ambiguous"), as `tbxMain.twin`'s header says. `makeBatches`' `alone` picks the unit,
    the batch carries `noMain`, and `stageBatch` leaves out `tbxMain.twin`. (HelpFile,
    PrevInstance, Project-Types and the two WinServicesLib groups are such units.)
  - **A `[DllExport]` name counts among a sample's names.** Two samples exporting
    `MyExportedFunction` (API-Declarations, Classes-and-Modules) compile together, and the
    linker refuses them ("duplicate [DLLExport] functions detected"); as names, the batcher
    keeps them apart.
- **A marked `Sub Main` in a class slot is a finding**, in a compile as in a build. It is a
  method of the class, never the startup object, so the sample is no program: usually a
  class and the module that starts it, written as one fence. A compile passes it and a
  build fails with no startup object, so `select` refuses it before batching. Split it, with
  the startup Main in a fence of its own. The class slot may come from `inherits=` or from
  the inference: a top-level `WithEvents` field is TB5182 in a module, whether `Private`,
  `Dim` or `Public` (BETA 995).

## Traps

- **`tbbuild` once reported a clean build on a project that crashed the compiler**, and
  every number in this file depends on it not doing so. A 275-fence project reported `0
  errors, 0 warnings` and exit 0 while its quarters reported 129, 0, 294 and 448 errors. The
  quarter that reported zero held three `NATIVE EXCEPTION: ACCESS_VIOLATION` lines and three
  `restarting from MEMORY`. A crash-restart cycle takes about 1.3 s, shorter than a 1 Hz
  status sample can see; after the third restart the IDE gives up and leaves the status at
  OPERATIONAL with the counters at zero, byte-identical to a clean build. `tbbuild` now
  reads the DEBUG CONSOLE, which nothing removes an entry from, and exits 4 naming the file
  the compiler died parsing. **Treat any tooling that infers "finished" from "stopped
  changing" as suspect on this compiler.**
- **The classifier refuses a `<placeholder>` as a declaration name**, so a syntax skeleton
  such as `Interface <name> Extends <base-interface>` / `End Interface` (in
  `Reference/Attributes.md`) takes an explicit `slot=` to reach the compiler. Through BETA
  995 that skeleton crashed the compiler (twinbasic/twinbasic#2453, fixed in 997).
- **`project.buildPath` must be an explicit file.** The default `${SourcePath}\Build\...`
  template opens a native Save dialog, which on the private desktop is invisible and
  unreachable, so the build silently never happens --- and the WebView2 renderer stays
  responsive throughout, so every health check says the IDE is fine. The generator pins it
  in the staged copy.
- **`MsgBox` hangs a run-mode probe, invisibly.** The HelloWorld template's `Main` is a
  `MsgBox`; the templates here have an empty one. Run-mode fences are screened for `MsgBox`
  / `InputBox` and refused, not discovered at the timeout.
- **Two IDEs must not hold one source tree.** `tbbuild` takes the project directory as given
  and does not stage a copy the way `tbrun` does, so two concurrent builds pointed at the
  same folder --- distinct `--port`s, distinct desktops, everything else correct --- both
  wedge and neither ever returns. Each lane owns a workspace, not just a port.
- **A run that dies mid-batch leaves its lanes' IDEs running**, on desktops nobody can see,
  holding the projects they opened under `tbexamples\<port>`. The next run on that port then
  fails its first step, clearing that folder, with a bare `EPERM`. The harness says what the
  `EPERM` means; stop the `twinBASIC.exe` processes whose command line names a project under
  that folder (by pid, never by image name), or run on another `--port`.
- **Batches are packed in process by impexp** (`packTree` in `scripts/lib/tb-project.mjs`),
  never by the compiler executable's `import`, which exits 999 with nothing written on a
  tree holding an embedded package and 0 after the failures it reports;
  [WIP.Harness.md](WIP.Harness.md#getting-at-the-twin-sources) has the reasons. A
  `resource=` fence staged under `Packages/` packs like any other.
- **Office examples leak one process per run, and it is not self-limiting.** Each
  `CreateObject` starts a *separate* `EXCEL.EXE`, calling `Quit` is not sufficient --- the
  process exits only once every COM reference is released --- and they sit on the user's
  real desktop rather than the private one, hidden only because `Visible` is `False`.
  `tbrun` harvests them with a before/after snapshot diff restricted to processes that are
  new, on an image allowlist, *and* windowless; a run-mode batch inherits that and must pass
  `--no-reap` while running concurrently, sweeping once at the end.
- **DCOM does not reclaim it on a timer.** COM's ping protocol is for *remote* references;
  a same-machine client has no ping GC. A force-killed `CreateObject` holder's `EXCEL.EXE`
  was still running 563 s later. A job object is no answer either --- the server is not a
  descendant.
- **`@($null).Count` is 1 in PowerShell.** A count of `Select-String … | Measure-Object`
  results reported a hidden fence reaching all three built trees; it did not. **Count with
  the tool whose empty result is empty** (`grep -c` said 0).
- **The shell eats backslashes** in a regex passed through `node -e` from bash, turning
  `'...symbol .(.+?).'` into a pattern that matched one character and producing a
  plausible-looking table of single-letter "undeclared symbols". This is the heredoc trap in
  WIP.md's Don'ts arriving through `-e`. Write the script to a file.

## Rules from the survey passes

The compiling share went from 54% to nearly all of the classifiable corpus through harness
work and page edits. What a maintainer still needs from that work follows.

**Count diagnostics, then try the fix.** A guess from counting diagnostics is not a result.
"`[Me]` wants a fourth slot" (27 samples, TB5025) was built and measured: a bare `Class`
wrapper fixes **5**, because `Me` becoming legal does not make `Me.Caption` resolve: the
wrapper has no `Caption` (`TB5027 [tbx_…] does not contain 'Caption'`). The largest win was
the stage set.

### The Class row, and why it needs a base

`class` and `method` are `module` and `sub` with a `Class` container instead of a `Module`.
They are inferred from two signals that are language rules, not guesses:

- **`Me`** --- TB5025 reads *"[Me] cannot be used in standard modules. [Me] is only
  applicable to class modules."*
- **a top-level `WithEvents` field** --- not legal in a standard module at all. The
  compiler reports `TB5182` on the declaration and then `TB5079` on every later use of the
  name, so one wrong container produces four diagnostics and none of them names the cause.
  The whole WinNamedPipesLib reference is this shape, because the `WithEvents` field *is*
  the subject of those pages.
- **`Implements` and `Inherits` at fence top level** also mean class code-behind.

**Neither inference can regress a passing sample**, so it is safe to apply without markup:
a module- or sub-slot fence carrying either signal is already failing, so moving it to the
Class row can only change which diagnostic it gets, or fix it. A file-slot fence brings its
own container and is never reclassified.

**`inherits=` is what pays.** Across the 46 class/method fences, **5 compile in a bare
`Class`, 12 in one that `Inherits Form`.** A sample reaching `Me.Caption`, `Me.Arrange`,
`Me.Controls` or `Me.Print` needs the wrapper to *be* a form. `inherits=PropertyPage` and
`inherits=MDIForm` work the same way.

A generated `Class` wrapper carries `[COMCreatable(False)]`: a sample declaring
`Public Sub New(ByVal Host As Host)` (tbIDE's `Host.md`) fails with `TB5135` otherwise, a
diagnostic about the wrapper and not the sample.

Three things the base cannot rescue:

- **A `Handles X.Y` clause binds to a field named `X` in the same class.** In a generated
  `Class … Inherits Form` there is no field called `Form`, so `Handles Form.Load` fails
  with TB5019, while the *same clause in a generated Module* compiles. A sample using both
  `Handles` and a form intrinsic cannot be made to compile under any wrapper this tool can
  synthesize; it needs a real designer form, which needs designer JSON (TB5247).
- **A `WithEvents` handler has the same requirement**, which is why the browser stage sets
  declare `WebView` plainly: a handler in a generated module could never bind to a
  `WithEvents` in a shared stage module anyway.
- **`UserControl.PreKeyEvents = True` is `TB5096 ReadOnly binder`** against the stage's
  `UserControl` variable, though the unqualified form is what a real UserControl writes.
  The fiction does not reach that far; the sample stays unmarked.

### What editing a page fixes

When the survey says no unmarked sample compiles, the gain comes from changing pages. In
the order to try them (cheap and mechanical first):

| move | what it is |
|---|---|
| **declare the local** | `Dim I As Long` in a VBA-derived loop, `Dim obj As Object` above the reference the sample tests. A reader would write it; the VBA original left it implicit |
| **`hidden` fence** | for what a reader has *elsewhere* in their program --- a helper procedure, a module-level flag, the class the page's prose asks them to insert |
| **stage entry** | for a control instance |
| **put the statements in a `Sub`** | a fence mixing a `Type` or `Enum` with executable code is not a module a reader can paste; wrapping the code is what they would actually write |
| **`projname`** | when a page's fences really are one program |

Decide shown versus hidden by one question: *would a reader of the page need to see this?*
- **Shown:** whatever the reader writes, or needs in order to know where an object comes
  from. An event handler's header (`Request.Headers` means nothing until the reader sees
  which event passes `Request`), the `With` subject a leading-dot line depends on, the
  `WithEvents` field an event handler's name is built from, the interface member the reader
  implements. Where the page already shows that header elsewhere, the fence repeats it
  rather than inventing one.
- **Hidden:** what the reader brings from elsewhere --- their own helpers
  (`SaveDocument`, `OpenSalesRecordset`), what the form designer declares (`rptSales`,
  `Toolbar1`), stand-ins for an external library's declarations (`ChooseColorFlags`), and
  the class boilerplate around a method the page is about.

Language rules this work found:

- **`Dim x As New Foo(args)` is not valid twinBASIC.** Constructor arguments need the
  expression form, `Set x = New Foo(args)`. `twinBASIC-Additions.md`'s **Parameterised New**
  section shows a class the reader defines, carries `[COMCreatable(False)]` (a class whose
  only constructor takes arguments cannot supply the parameterless one COM creation wants),
  and says in a NOTE that `As New` with arguments is a syntax error.
- **The elision the VBA-derived pages use is `. . .`, spaced.** The classifier knew only
  `...`, and proposed three such pages as markable; they failed on *"Expected a symbol
  following the dot operator"*.
- **A class cannot implement an interface member marked `[PreserveSig]`**, and the
  diagnostic "expects" the signature already written (BUGS-TO-REPORT.md has the
  two-declaration reproduction). Examples do not put the attribute on an implemented member,
  and both pages that describe the attribute say why.
- **Confirmed by compiling:** `For Each` over a `WebView2RequestHeaders` or
  `WebView2ResponseHeaders` works as the pages say, and `AsyncWrite` accepts a
  `PropertyBag.Contents` **Variant** for its `Data() As Byte`.
- **An Assert call needs both qualifiers.** A package's members are reached through its
  namespace symbol, as `VB`'s are, so the form that compiles is `Assert.Exact.AreEqual`.
  `Assert.` is the package namespace; `Exact.` is there because each module carries
  `[MustBeQualified(True)]`:

  | form | result |
  |---|---|
  | `Assert.Strict.IsTrue x > 0` | compiles |
  | `Strict.IsTrue x > 0` | `TB5079 Unrecognized symbol 'Strict'` |
  | `Assert.IsTrue x > 0` | `TB5027 Unrecognized member 'IsTrue' on type 'Assert'` |
  | `IsTrue x > 0` | `TB5079 Unrecognized symbol 'IsTrue'` |

  Five pages wrote the bare form at 66 sites, because one sentence on the package index
  presented `Assert.` as disambiguation needed only on a clash. **When a sample is wrong
  across a whole package, check whether a sentence taught it**; prefixing the calls without
  rewriting that sentence leaves the prefixes reading as optional noise. All `Syntax:`
  lines carry the namespace too: a `Syntax:` line is the first thing a reader copies, and a
  mixed convention cannot be checked by grep. The harness cannot say which way to fix such a
  page; that is a judgement about the reader.

### What cannot be marked

The 52 `inert` fences are not programs and were never going to be: syntax skeletons with
`<placeholder>` names (`Interfaces-CoClasses.md` writes `Inherits base_interface`),
property-assignment lines shown outside their `With` (`WinServicesLib/ServiceManager.md`
documents each property as `.Name = "..."`), continuation fences that deliberately reuse the
previous fence's variables, pseudo-code, external-library declarations and designer-only
content. Their reasons are the `inert=` values. `--propose --json` writes a survey and
`--report <file>` groups it by diagnostic, section and unresolved name.

A genuine fragment (`TB5182`) is an elision, a signature with no body, or pseudo-code in a
`tb` fence. It needs the same judgement page by page; `VB/MDIForm/index.md`'s pseudo-code
menu table (`=>`) became four real handlers, which both compile and are what a reader
writes.

## Open questions

- Where does compile time stop being flat in fence count? 120 per project is the current
  default and 275 worked; the measured evidence does not say where the knee is.
- A `projname` is global, so two pages choosing `demo` would merge without saying so. Scoping
  it to the page would prevent that and would also prevent a group spanning pages, which a
  multi-page tutorial wants. Left global and documented; revisit if a collision happens.
- **Should the remaining single-page stage entries move into `hidden` fences?** About a
  dozen control instances are used by exactly one page --- `picCanvas`, `hsbVolume`,
  `mfPanels`, `lblCoords`. They are one line each in a list whose stated purpose is
  "the control instances the samples assume", so they stay. The invented *classes* moved,
  because a class is not a control instance and a page is where it belongs. The line between
  the two is a judgement, not a rule.
- Which pages should carry `check_run` (33 samples do)? A sample states its output in its own
  text, as a trailing comment on a `Debug.Print` line or as the comment lines under
  `' Output:`; its comparison is only as useful as the pages that state a printed value.
