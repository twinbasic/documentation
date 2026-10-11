---
title: Code Samples and Attributes
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 5
permalink: /Documentation/Development/Tools-Samples
---

# Code Samples and Attributes
{: .no_toc }

Compiles the documentation's own code samples, and surveys and probes where the compiler accepts each attribute. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## check_examples.mjs
{: #check-examples }

    node scripts/check_examples.mjs [--only <regex>] [--census] [--propose [--apply]]
                                    [--report <file>] [--jobs N] [--port N] [--batch N]
                                    [--ide <path>] [--build | --llvm] [--keep] [--verbose]
                                    [--json]

Compiles the documentation's own code samples. A ` ```tb ` fence is something
[`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) protects the *contents* of and nothing ever
evaluates, so a sample that does not compile can ship and every gate stays green. This is the tool that asks the compiler; [`examples.bat`](Tools#examplesbat) is how it is
usually run, and [Authoring Pages](Authoring#checking-that-a-sample-compiles) is where a
sample opts in.

Each marked sample is generated into its own `Module tbx_<hash>`, packed with a template
project, and built the way [`tbbuild.mjs`](Tools-Compiler#tbbuild) builds. A diagnostic comes back against a
generated file and a generated line; the report converts both, so what you read is the page
and the line in it:

    FAIL  docs/Reference/Core/Unload.md:24  (Reference/Core/Unload.md#1)
            does not compile (module, inferred, console)
            docs/Reference/Core/Unload.md:32: TB5134 duplicate definition [UserForm_Click]

**The shape of the sample decides what is generated around it.** A whole `Class` becomes a
file of its own; procedures and module-level declarations go inside the generated module;
loose statements go inside a `Private Sub` in it. That is inferred from the sample and
stated in the markup only when the inference is wrong, and the report names which slot was
used either way, so a misinference reads as a misinference rather than as a broken sample.

**Samples that belong to one program are grouped with `projname`**, and a group is compiled
as its own project with nothing else in it. Without that, a page presenting one program in
pieces passes only when its pieces happen to share a generated project --- which depends on
what else is being checked, so the same page can pass a full run and fail a `--only` one.
A group that is only half marked is reported as such, rather than as a missing symbol in
whichever sample used it --- and an `--only` that leaves part of a group out of a run says
so as well, because what that run reports about the rest of the group is not what a full run
reports.

| Flag | Effect |
|---|---|
| `--only <regex>` | Restrict to pages whose path matches. The path is page-relative, as in `^Reference/Core`. |
| `--census` | Classify every `tb` fence and print the table --- how many are whole files, procedures, statement runs, and how many are fragments no wrapper can rescue --- then the fences marked `inert` by reason, and finally the **undecided** ones: classifiable, unmarked, and not inert. That last number is the backlog; the inert count is not. No compiler, no IDE, well under a second. |
| `--propose` | Compile the unmarked samples too, and list the ones that would pass. A survey: an unmarked sample that fails does not fail the run, though a marked one still does. It ends with the same grouping `--report` prints. |
| `--apply` | With `--propose`, add the marker to the fences that passed. It only ever adds the bare flag, only to a fence that compiled in that very run, and never to one that already carries markup --- so a re-run is a no-op. Read the diff. |
| `--report <file>` | Group the findings of a survey saved with `--propose --json`: by diagnostic, by section, by the name that did not resolve, by wrapper, and by page. No compiler --- the survey holds every page and line it names, so the slow run happens once and the grouping is what gets iterated on. |
| `--jobs <n>` | Concurrent IDE lanes. Default 4. Each lane has its own port, its own workspace and its own private desktop. |
| `--port <n>` | Base DevTools port. Default 9480; lane *n* uses base + *n*. |
| `--batch <n>` | Upper bound on samples per generated project. Default 120. The batcher packs fewer than this when there are lanes to fill. |
| `--ide <path>` | `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop. |
| `--build` | Also build each project that compiles without errors. A project whose build fails is cut down, as a crash is, to the samples that fail it. A project whose compile has errors is not built: the run names its first error, and ends by counting its samples as "compiled but not built". |
| `--llvm` | Build with LLVM (implies `--build`): each project's compiler options are set to `+llvm`. It needs a Professional or Ultimate licence and exits 2 without one. A plain `--build` run is its control: a sample that fails only under `--llvm` is one LLVM cannot generate code for. |
| `--keep` | Leave the generated projects on disk and print where. |
| `--verbose` | Report warnings as well as errors. Only errors ever fail the run. |
| `--json` | One object on stdout; every report line moves to stderr. |

**Templates live in `test/example-projects/`**, one directory per template, each an exported
project tree --- a `Settings` file and a `Sources/` folder. `console` is the default;
`packages` references every package the IDE ships and is what a page under
`Reference/Built-In/` or a package tutorial gets without asking. A fence can name one with
`project=`. `form` is `console` with a real, empty `Form1` for the samples that draw on a form
or read its properties: a form made in code has no designer file and cannot be drawn on.
After each `check_run` sample the run unloads every form the sample left loaded, so a sample
that forgets `Unload Form1` neither keeps the run waiting nor leaves its drawing for the next
sample.

Each template also carries a **stage set**: a module declaring the control instances the
samples assume, `Text1`, `ListView1`, `CefBrowser1` and the rest. A sample that says
`Text1.Text = "hi"` is form code-behind --- complete as documentation, because the reader
has a form with a `TextBox` on it, and impossible to compile alone, because the designer
rather than the code is what declares `Text1`. Declaring those instances lets the compiler
check what the sample actually asserts: that the member exists, that it takes those
arguments, that the types line up. The list is written out rather than inferred from
identifiers ending in a digit, which would also have declared `Var1`, `Arg1`, `Line2` and
`VBA7`.

**A sample can take the compiler down**, and one in this corpus does. twinBASIC runs the
compiler in the same process as user code, so in a batch of a hundred that costs the other
ninety-nine their result. `tbbuild` reports a crash as exit 4 and names the file the
compiler was parsing when it died. The sample that file belongs to is built on its own and
the rest of the batch without it, so a crash usually costs two extra builds. When no sample
is named, the batch is split in half repeatedly until the offending sample is alone, which
is O(log n) extra builds. A crash can also need several samples at once, so that no part of
the batch crashes by itself. The samples it needs are then searched for as a set, and all
of them are reported. The cost is paid only on failure. The finding names the sample, or
the set, and points at `BUGS-TO-REPORT.md`.

**A sample can compile and still fail the build.** The front end accepts constructs that code generation refuses, so `--build` presses Build on each project that compiled without errors, and `--llvm` does the same with LLVM switched on. A build can fail once and pass when repeated, so a project whose build fails is built once more, and only a second failure counts. `tbbuild` reports a failed build as exit 5 and names no sample, so the project is cut by halving, with the crash machinery and its costs, until one sample is left or the samples a failure needs together are found. The finding says "fails the build", and its second line says "the LLVM build" under `--llvm` and "the build" otherwise. The canary described below is a warning, so it does not stop a project from building. A build also refuses three things a compile accepts, so a run that builds batches around them: an `expect-error` sample is batched apart from the samples that should build; a sample, or a group, that declares its own `Sub Main` gets a project of its own without the template's `Main`, because two make the startup object ambiguous; and two samples that export one `[DllExport]` name are kept in different projects.

**A sample can be run.** A statement sample marked `check_run` is built and run in every mode, and what it prints is compared with what the page says it prints: a trailing comment on a `Debug.Print` line, or the comment lines under an `' Output:` line ([Authoring Pages](Authoring#checking-that-a-sample-compiles) has the markup). A project may have only one `[RunAfterBuild]` Sub (TB5114), so run samples are batched apart from the rest, and each run batch gets one generated `Module tbxRun` whose `[RunAfterBuild]` Sub calls each sample's body in turn. It prints a marker line before and after each call, and an `On Error GoTo` handler around each call keeps one sample's error from ending the rest. The handler is reached only by an error the sample does not handle itself, so a sample can demonstrate an error under its own `On Error Resume Next` and print `Err.Number`. A check of `Err.Number` after the call could not tell the two apart, because a procedure that handles an error with `On Error Resume Next` returns with `Err` still set, in VB6 and in twinBASIC alike. The run's console output is captured as [`tbrun.mjs`](Tools-Compiler#tbrun) captures it and split by those markers, so each line is charged to the sample that printed it. A sample that raises an error, does not return, or prints something other than the page says is a finding at the page line that states the value. A run sample that is not `slot=sub`, is marked `expect-error`, or calls `MsgBox` or `InputBox` or contains an `End` statement is refused without being built: a message box waits for a click on a desktop nobody sees, and `End` ends every sample after it.

    FAIL  docs/Reference/Default/VBA/Strings/InStr.md:77  (Reference/Default/VBA/Strings/InStr.md#3)
            prints "3", the page says "7"

**A batch can report nothing when it should report something.** `tbbuild` does not wait for a build: it reads the IDE's own window, the status bar and the Problems panel for the project the IDE has open, once the compiler's status reads OPERATIONAL and either the IDE's own traffic shows the compile has ended and the window agrees with it, or the window has stopped changing for five seconds. An IDE under load can be OPERATIONAL with an empty panel before it has published its diagnostics, and a batch read then reports every sample as compiling, which looks exactly like a batch with nothing wrong. So every batch carries a canary: a module holding a `#Warning` directive, whose warning (`TB0005`) is known. A read with no errors in it must report the canary, or it is not believed. The module carries `[EnforceWarnings(TB0005)]`, so a project setting that ignores the warning, or turns it into an error, does not change it. The warning is reported whatever else the batch holds: unterminated blocks, stray `End` statements, broken classes and many undefined names in other files do not hide it. It is a warning rather than an error so that a batch with nothing wrong still builds clean. A batch that crashes the compiler reports nothing at all and is isolated as a crash; its canary is never read.

The canary proves only that the IDE published something, not that it published everything: a read that includes the canary but not a sample's later diagnostics would still pass that sample. So a read that holds real errors needs no canary --- the IDE was plainly not silent --- and is taken as read, whatever the canary did. Real errors here are errors in the batch's samples, and errors outside every sample that the template does not draw by itself; a template's own errors do not count, or a template that always draws one would switch the canary off for every batch built from it. A canary missing beside real errors has never been seen, and is printed as a note if it happens. A read with no errors and no canary is built once more, because a read that came too early says nothing about the batch. If it is silent again, the batch is split in half repeatedly, as for a crash, until each part reports the canary or errors of its own. A single unit --- one sample, or a group compiled as one program --- that is still silent stops the run with exit code 2 and its name, because its clean result cannot be trusted and it is not blamed for errors nobody saw. The template built with no samples, which is how the tool learns the errors a template draws by itself, follows the same rule: it needs its canary only if it has no errors, is read again when it is silent, and stops the run when it is silent twice.

**A sample can be compiled against a file.** A fence carrying `resource=<project-relative
path>` --- in any language, typically ` ```json ` --- is written into the generated project at
that path instead of being compiled, and travels with its page the way a `hidden` fence
does. It exists for the compile-time attributes that read a project file:
`[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", …)]` fills an **Enum**'s
members from that JSON while compiling, so the members the page's other samples name are
checked against the file the page shows. The path may not escape the project --- no `..`, no
drive letter, no UNC --- and a refused path is a finding rather than a write.

**A diagnostic can also land outside every sample**, inside a referenced package's own
source. A generic instantiated with a type the project does not have is the case to know: the
error is reported against the generic's own type parameter, in the package's file, and the
sample that provoked it can have no diagnostic of its own at all. Such a sample is not
counted as compiling: the run fails with a row naming no page, and the same splitting
isolates it, after one build of the template with nothing in it decides whether the row is
the template's own rather than any sample's. A split never cuts a `projname` group in half,
and never separates a page's `hidden` context from the samples that need it.

Four files under `scripts/lib/` belong to it. `tb-fences.mjs` is the half that needs no
compiler --- fence extraction, the markup, and the classifier --- and is where a new key or
a new slot goes. `example-batches.mjs` packs samples into batches and cuts a crashed batch
down, and holds the probes, which run before every run and in
[`example-batches.test.mjs`](Tools-Toolchain-Tests#example-batches-test). `example-run.mjs` is what `check_run`
needs without an IDE: which samples may be run, what a sample says it prints, the generated
dispatcher, and the reading of the run's markers. `tb-install.mjs` finds the IDE and the
compiler beside it, and is shared with the two IDE-driving tools so the three cannot come to
disagree about where an install is.

Exit codes: **0** every marked sample compiles, or none is marked (`--report` always, and `--propose` when it found only unmarked samples that fail, which is advisory); **1** a marked sample does not compile, a marker is misused, a template does not compile, the compiler crashed on a project, `--build` or `--llvm` found a sample that fails the build, or a `check_run` sample raised an error, did not return or printed something other than the page says (the report names each); **2** the harness could not run: a refused command line, a failed self-test probe, no IDE, an unreadable `--report` file, a work folder it could not clear, an `--llvm` run on a Community or Personal licence, or a crash.

## gen_attribute_probes.mjs
{: #gen-attribute-probes }

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Generates twinBASIC probe projects from the `Applicable to:` lines in `Reference/Attributes.md`, for [`tbbuild.mjs`](Tools-Compiler#tbbuild) to compile. An `Applicable to:` line is a claim about the compiler, and only the compiler can confirm it. This writes one source file per claimed target, so a single build answers every claim at once. A `Syntax:` or `Applicable to:` line inside a code fence is not read, so an example that shows the page's own format is not taken for an attribute; [`census_attributes.mjs`](#census-attributes) reads the page through the same code, `scripts/lib/attributes-doc.mjs`. A misplaced attribute comes back as `This attribute is not supported in this context` (TB5155) or `Syntax error.  No handler for this symbol` (TB5182). Which of the two arrives says nothing about whether the attribute exists, only that it is not accepted there.

Up to three trees come out, on two contracts that must not be mixed:

| Tree | Contract |
|---|---|
| `<out_dir>` | `AttributeProbes` --- every probe is expected to compile, so a diagnostic naming a probe module is a documentation defect. |
| `<out_dir>-2` | `AttributeProbes2` --- the same contract, for targets that cannot share a project (one `[RunAfterBuild]` per project). |
| `<out_dir>-explore` | `AttributeExplore` --- **a diagnostic is the answer.** Questions the page cannot settle; each source file carries its own header saying how to read its result. |

Keeping the two contracts in separate projects is what makes either build readable: red in `AttributeProbes` is a defect, red in `AttributeExplore` is a result.

It also writes a key naming the `Attributes.md` line each probe came from, beside the tree rather than inside it --- anything inside gets packed into the `.twinproj` and turns up as a stray project file. Pack a tree into a project with [`impexp.mjs`](Tools-Compiler#impexp) before building it:

    node scripts/impexp.mjs import AttributeProbes.twinproj <out_dir> --overwrite

Its exit code says whether the pack worked. The compiler's own `import` verb takes the same command line, but **its exit code is `0` after every failure it reports**, so a script that packs a tree with it and then builds will happily compile the previous `.twinproj`. The one failure it does not report --- a tree holding an embedded package --- exits `999`. Test the last line of its output for `... DONE` instead; [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) has the caveat in full and a batch-file form of the test. Re-run the generator after editing `Attributes.md`.

Exit codes: **0** the probe project and the key were written, **2** a refused command line (no output directory included), or a crash.

## census_attributes.mjs
{: #census-attributes }

    node scripts/census_attributes.mjs [--ide <install>] [--exported <dir>] [--cache <dir>]
                                       [--refresh] [--samples] [--attr <name>]
                                       [--json] [--out <file>] [--dump-sites <file>] [--quiet]

Reports, for every attribute the twinBASIC packages use, **which enclosing construct and which kind of declaration it decorates**. It unpacks each package of an IDE install with [`impexp.mjs`](Tools-Compiler#impexp), called directly, scans the `.twin` sources, and writes a Markdown or JSON report. No arguments are needed: it finds the newest `twinBASIC_IDE_BETA_*` the same way [`tbbuild.mjs`](Tools-Compiler#tbbuild) does, caches the export under the build number, and reuses it on later runs. It is not part of the site build and nothing calls it during one.

Against BETA 995 that is 661 files, 9,713 attribute sites and 55 distinct attributes.

**A census is evidence, not applicability.** It says where an attribute *is* used, never where it *may* be used, and the two differ in both directions. The packages contain no use of `[Hidden]` on a whole **Class**, yet the compiler accepts one; they contain many on **Class** and **Interface** members, and the compiler refuses the same attribute on the **Interface** lines inside a **CoClass**. Neither fact is reachable from the other tool, so pair this with [`gen_attribute_probes.mjs`](#gen-attribute-probes) and [`tbbuild.mjs`](Tools-Compiler#tbbuild), which ask the compiler directly.

Grouping is by enclosing construct *and* declaration keyword, because the keyword alone misleads. `[RedirectToStaticImplementation]` has 82 uses, on "a Property Get, a Function and a Sub", which read by keyword suggests *procedure in a Class* --- and the compiler rejects that with TB5155, because every one of those uses is inside an **Interface**.

| Flag | Effect |
|---|---|
| `--ide <install>` | The install root to census. Defaults to `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_*` on the Desktop. |
| `--exported <dir>` | Census an already-exported tree and skip the export entirely. |
| `--cache <dir>` | Where exports are kept. Defaults to a per-build folder under the system temp directory. |
| `--refresh` | Re-export even when the cache already holds this build. |
| `--samples` | Also census `projects/` and `addins/`, not only `packages/`. |
| `--attr <name>` | Report one attribute in detail instead of the whole table. |
| `--dump-sites <file>` | Write every raw site as JSON --- which file and line produced each row. |
| `--json` | Emit JSON instead of Markdown. |
| `--out <file>` | Write to a file instead of standard output. |

The report ends with what the scanner could not resolve, and **that section is expected to be empty**. A census that quietly buckets its own confusion publishes a wrong number with nothing to notice it by, so an unresolved site is reported as a scanner bug rather than absorbed. The scanner handles several things this corpus does that a simpler sweep gets wrong: attributes spanning lines (`[Description("..." & vbCrLf & _` accounts for 3.8% of all attribute lines), comma-separated lists, arguments containing commas, escaped identifiers that look exactly like attributes (`[_HiddenModule].Foo`, and Enum members genuinely named `[A4 Portrait]`), comments in four different positions, and block-tracking traps such as a UDT field called `Type As Long` or a module named `[_HiddenModule]`.

Exit codes: **0** the report was produced, **2** a refused command line, no install, an install with no package project, or a crash (a package that fails to export is left out of the census).

## sweep_attributes.mjs
{: #sweep-attributes }

    node scripts/sweep_attributes.mjs [--ide <twinBASIC.exe>] [--names <a,b,...>] [--sites <a,b,...>]
                                      [--forms bare|smart|all] [--no-tokens] [--jobs <n>] [--port <n>]
                                      [--batch-size <n>] [--verify <n>] [--out <file>]
                                      [--dump-results <file>] [--work <dir>] [--keep] [--preflight]
                                      [--dry-run] [--list-sites] [--show | --hide] [--timeout <secs>]

Asks the compiler where every attribute is legal. It writes each attribute name at each declaration site --- a Module, a Class member, an API `Declare`, a Type field, a parameter, an `Implements ... Via` statement, and so on --- in each argument shape, builds the projects the way [`tbbuild.mjs`](Tools-Compiler#tbbuild) does, and lays the answers against the `Applicable to:` lines in `Reference/Attributes.md`. The report lists the documented targets the compiler refuses, the targets that hold only partly, and the sites it accepts that the page never mentions.

It exists because the two older tools each leave a gap. [`census_attributes.mjs`](#census-attributes) says where the shipped packages *use* an attribute, and [`gen_attribute_probes.mjs`](#gen-attribute-probes) probes only the targets the page already *claims*, so an entry that is too short stays too short: a line checked against only a Sub and a Const says nothing about an API `Declare`. This tool asks every question, so a missing target shows up as a row of the report and not as something a person has to think of.

The names come from three places: every entry in `Attributes.md`, every name in the compiler's own token table (a long pipe-separated string in the compiler binary, holding keywords, attributes and object members together), and `--names`. A token-table name is a *candidate*: it is called an attribute only if some site accepts it. `Debug` and `ExecuteHostCommand` are in the table and neither is one.

**How an answer is made readable.** A clean build is not proof by itself, so the tool guards against the ways one goes wrong:

- **Baselines.** Every site is built with no attribute first, and one that does not build clean is voided, so a wrong skeleton cannot read as "every attribute is refused here".
- **Controls.** TB5155 and TB5182 do not separate "wrong place" from "no such attribute". An invented name is built at every site, and a probe that draws exactly what the control draws is a refusal whatever its code. A site whose control compiles is voided.
- **Canaries.** Three probes (one clean, one refused for context, one unknown) ride in every batch. What they must draw is fixed in the script, not read from a build, and the tool builds them alone first and stops unless they draw it. A batch whose canaries differ, or that holds an error row belonging to no probe, is halved rather than believed. That is what would catch a compiler that stops reporting after so many errors, or a syntax error that suppresses the diagnostics of other files.
- **Isolation.** Halving also finds the probe behind a compiler crash or hang, and a crash that needs several probes together is reported as such.
- **Batching.** Batches are shuffled, and an attribute the compiler allows once per project (`[RunAfterBuild]`) goes in one probe to a batch, or its TB5114 would read as acceptance.
- **`--verify N`** rebuilds N random probes in fresh batches and compares.

| Flag | Effect |
|---|---|
| `--names`, `--sites` | Restrict to these attribute names (any case) or site ids. `--list-sites` prints the ids. |
| `--forms` | `bare`, `smart` (the default) or `all`. Smart gives every documented attribute every argument shape, a token-table name its bare form, and more shapes only where a site recognised it. A shape known to be required is always tried. |
| `--no-tokens` | Leave out the token table. |
| `--jobs`, `--port` | Concurrent IDE lanes (default 4) and the first DevTools port; a lane uses one more each (default 9560). |
| `--batch-size` | Probes per project (default 400). |
| `--verify N` | Rebuild N random probes and compare. |
| `--out <file>` | Write the Markdown report there. Without it the report goes to standard output. |
| `--dump-results <file>` | Also write every result, raw, as JSON: each name at each site with the answer for each argument shape. |
| `--work`, `--keep` | Where projects are staged, which must be under the system temp folder, and whether to keep them. |
| `--preflight` | Build only the canaries, baselines and controls, and stop. About 20 seconds, and the way to check a change to a site. |
| `--dry-run` | Count the probes and build nothing. |
| `--timeout <secs>` | How long to wait for one build to settle. Default 180. |
| `--show` / `--hide` | As for [`tbbuild.mjs`](Tools-Compiler#tbbuild). |

**An Enum member cannot be tested.** An Enum body accepts any attribute written on its own line, including one that applies nowhere, and refuses every attribute written inline, so the site is voided and a target on an Enum member is reported as one the sweep could not test.

**A clean build says the compiler accepts an attribute at a site.** It does not say the attribute does anything, and the IDE's background compile is what is read, so a check made only when linking is not seen. Where the report points at a target worth documenting, an A/B probe like X29 to X33 in `gen_attribute_probes.mjs` is what shows the effect.

Like [`check_examples.mjs`](#check-examples) it needs a twinBASIC install and Windows with a private desktop, so it is outside every gate and outside CI. **Pass `--out` and `--dump-results`.** The report is the only product, and a run piped through `tail` keeps one line of it.

Exit codes: **0** the report was produced and its self-checks held; **1** a self-check found a fault --- a probe disturbed the canaries even beside nothing else, or `--verify` found a probe that answered differently the second time; **2** a refused command line, no install, canaries that do not draw what the script records, a harness failure, a run cut short (its report is written all the same, and says so at the top), or a crash.
