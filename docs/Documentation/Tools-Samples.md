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

Compiles the documentation's own code samples. No other gate evaluates a ` ```tb ` fence ([`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) only protects its contents), so a sample that does not compile can ship with every gate green. This tool asks the compiler. [`examples.bat`](Tools#examplesbat) is how it is usually run, and [Authoring Pages](Authoring#checking-that-a-sample-compiles) is where a sample opts in.

Each marked sample is generated into its own `Module tbx_<hash>`, packed with a template project, and built the way [`tbbuild.mjs`](Tools-Compiler#tbbuild) builds. The report converts the generated file and line of each diagnostic back to the page and the line in it:

    FAIL  docs/Reference/Core/Unload.md:24  (Reference/Core/Unload.md#1)
            does not compile (module, inferred, console)
            docs/Reference/Core/Unload.md:32: TB5134 duplicate definition [UserForm_Click]

**The shape of the sample decides what is generated around it.** A whole `Class` becomes a file of its own; procedures and module-level declarations go inside the generated module; loose statements go inside a `Private Sub` in it. The markup states the slot only when the inference is wrong, and the report names the slot used either way.

**Samples that belong to one program are grouped with `projname`**, and a group is compiled as its own project with nothing else in it. Otherwise a page that presents one program in pieces passes only if its pieces happen to share a generated project, so the same page can pass a full run and fail an `--only` one. A group that is only half marked is reported as such. An `--only` that leaves part of a group out of a run says so, because what that run reports about the rest of the group differs from a full run's.

| Flag | Effect |
|---|---|
| `--only <regex>` | Restrict to pages whose path matches. The path is page-relative, as in `^Reference/Core`. |
| `--census` | Classify every `tb` fence and print the table --- how many are whole files, procedures, statement runs, and how many are fragments no wrapper can rescue --- then the fences marked `inert` by reason, and finally the **undecided** ones: classifiable, unmarked, and not inert. That last number is the backlog. No compiler, no IDE, well under a second. |
| `--propose` | Compile the unmarked samples too, and list the ones that would pass. An unmarked sample that fails does not fail the run; a marked one does. It ends with the grouping `--report` prints. |
| `--apply` | With `--propose`, add the bare marker to the fences that passed in that run. It never touches a fence that already carries markup, so a re-run is a no-op. Read the diff. |
| `--report <file>` | Group the findings of a survey saved with `--propose --json`: by diagnostic, section, unresolved name, wrapper and page. It needs no compiler, so the slow run happens once and the grouping can be iterated on. |
| `--jobs <n>` | Concurrent IDE lanes. Default 4. Each lane has its own port, workspace and private desktop. |
| `--port <n>` | Base DevTools port. Default 9480; lane *n* uses base + *n*. |
| `--batch <n>` | Upper bound on samples per generated project. Default 120. The batcher packs fewer when there are lanes to fill. |
| `--ide <path>` | `twinBASIC.exe`. Default: `$TB_IDE`, else the newest `twinBASIC_IDE_BETA_<n>` on the Desktop. |
| `--build` | Also build each project that compiles without errors. A project whose build fails is cut down, as for a crash, to the samples that fail it. A project whose compile has errors is not built: the run names its first error and counts its samples as "compiled but not built". |
| `--llvm` | Build with LLVM (implies `--build`) by setting each project's compiler options to `+llvm`. It needs a Professional or Ultimate licence and exits 2 without one. A sample that fails under `--llvm` but not under a plain `--build` is one LLVM cannot generate code for. |
| `--keep` | Leave the generated projects on disk and print where. |
| `--verbose` | Report warnings as well as errors. Only errors ever fail the run. |
| `--json` | One object on stdout; every report line moves to stderr. |

**Templates live in `test/example-projects/`**, one directory per template, each an exported project tree --- a `Settings` file and a `Sources/` folder. A fence names one with `project=`.

- `console` is the default.
- `packages` references every package the IDE ships. A page under `Reference/Built-In/` or a package tutorial gets it without asking.
- `form` is `console` with a real, empty `Form1`, for the samples that draw on a form or read its properties: a form made in code has no designer file and cannot be drawn on.
- `contributed-<Package>` is `console` with a reference to one contributed package, at the version its section's `indexed_from` names, and to what that package's samples name besides (WinReg's need WinDevLib's types and declarations). A page under `Reference/Contributed/<Package>/` gets it without asking, so each package's samples compile in a project that references that package alone, as a reader's does. The packages are not in the repository: the tool downloads each version from TWINSERV the first time it is needed, keeps it in `%TEMP%\tb-twinserv\`, and embeds it in every project built from the template. So the first run of these samples needs the network. An error inside an embedded package's own source fails nothing: the run reports it as a note naming the package, since the package is someone else's code, and the package's page says it does not compile.

After each `check_run` sample the run unloads every form the sample left loaded, so a sample that forgets `Unload Form1` neither keeps the run waiting nor leaves its drawing for the next sample.

Each template also carries a **stage set**: a module declaring the control instances the samples assume, `Text1`, `ListView1`, `CefBrowser1` and the rest. A sample that says `Text1.Text = "hi"` is form code-behind and cannot compile alone, because the designer declares `Text1`. Declaring the instances lets the compiler check that the member exists, takes those arguments and has matching types. The list is written out, not inferred from identifiers ending in a digit, which would also declare `Var1`, `Arg1`, `Line2` and `VBA7`.

**A sample can take the compiler down**, and one in this corpus does. twinBASIC runs the compiler in the same process as user code, so in a batch of a hundred a crash costs the other ninety-nine their result. `tbbuild` reports a crash as exit 4 and names the file the compiler was parsing when it died. That file's sample is built on its own and the rest of the batch without it, which usually costs two extra builds. When no sample is named, the batch is split in half repeatedly until the offending sample is alone (O(log n) extra builds). A crash that needs several samples at once is searched for as a set, and all of them are reported. The finding names the sample or set and points at `BUGS-TO-REPORT.md`.

**A sample can compile and still fail the build.** The front end accepts constructs that code generation refuses, so `--build` presses Build on each project that compiled without errors, and `--llvm` does the same with LLVM switched on. A build can fail once and pass when repeated, so a failed build is repeated once, and only a second failure counts. `tbbuild` reports a failed build as exit 5 and names no sample, so the project is cut by halving, as for a crash, until one sample is left or the samples a failure needs together are found. The finding says "fails the build", and its second line says "the LLVM build" under `--llvm` and "the build" otherwise.

A build refuses three things a compile accepts, so batches are arranged around them:

- an `expect-error` sample is batched apart from the samples that should build;
- a sample or group that declares its own `Sub Main` gets a project of its own without the template's `Main`, because two make the startup object ambiguous;
- two samples that export one `[DllExport]` name are kept in different projects.

**A sample can be run.** A statement sample marked `check_run` is built and run in every mode, and what it prints is compared with what the page says it prints: a trailing comment on a `Debug.Print` line, up to a ` -- ` that starts a note, or the comment lines under an `' Output:` line ([Authoring Pages](Authoring#checking-that-a-sample-compiles) has the markup). A project may have only one `[RunAfterBuild]` Sub (TB5114), so run samples are batched apart from the rest. Each run batch gets one generated `Module tbxRun` whose `[RunAfterBuild]` Sub calls each sample's body in turn. It prints a marker line before and after each call, and an `On Error GoTo` handler around each call keeps one sample's error from ending the rest.

The handler is reached only by an error the sample does not handle itself, so a sample can demonstrate an error under its own `On Error Resume Next` and print `Err.Number`. (Checking `Err.Number` after the call could not tell the two apart: a procedure that handles an error with `On Error Resume Next` returns with `Err` still set, in VB6 and in twinBASIC alike.)

The run's console output is captured as [`tbrun.mjs`](Tools-Compiler#tbrun) captures it and split by the markers, so each line is charged to the sample that printed it. A sample that raises an error, does not return, or prints something other than the page says is a finding at the page line that states the value. A run sample is refused without being built if it is not `slot=sub`, is marked `expect-error`, calls `MsgBox` or `InputBox`, or contains an `End` statement: a message box waits for a click on a desktop nobody sees, and `End` ends every sample after it.

    FAIL  docs/Reference/Default/VBA/Strings/InStr.md:77  (Reference/Default/VBA/Strings/InStr.md#3)
            prints "3", the page says "7"

**A batch can report nothing when it should report something.** `tbbuild` does not wait for a build: it reads the IDE's window, status bar and Problems panel once the compiler's status reads OPERATIONAL and either the IDE's traffic shows the compile has ended and the window agrees, or the window has stopped changing for five seconds. An IDE under load can be OPERATIONAL with an empty panel before it has published its diagnostics, and a read then reports every sample as compiling, which looks exactly like a batch with nothing wrong.

So every batch carries a canary: a module holding a `#Warning` directive, whose warning (`TB0005`) is known. A read with no errors in it must report the canary, or it is not believed. The module carries `[EnforceWarnings(TB0005)]`, so a project setting cannot ignore the warning or turn it into an error, and nothing else in the batch hides it. It is a warning, not an error, so a batch with nothing wrong still builds clean.

A read that holds real errors needs no canary, because the IDE was plainly not silent. Real errors are errors in the batch's samples, and errors outside every sample that the template does not draw by itself. A canary missing beside real errors is printed as a note.

A read with no errors and no canary is built once more, and if it is silent again, the batch is split in half repeatedly, as for a crash, until each part reports the canary or errors of its own. A single unit --- one sample, or a group compiled as one program --- that is still silent stops the run with exit code 2 and its name, because its clean result cannot be trusted. The template built with no samples, which is how the tool learns the errors a template draws by itself, follows the same rule.

**A sample can be compiled against a file.** A fence carrying `resource=<project-relative
path>` --- in any language, typically ` ```json ` --- is written into the generated project at that path instead of being compiled, and travels with its page as a `hidden` fence does. It is for the compile-time attributes that read a project file: `[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", …)]` fills an **Enum**'s members from that JSON while compiling, so the members the page's other samples name are checked against the file the page shows. The path may not escape the project --- no `..`, no drive letter, no UNC --- and a refused path is a finding.

**A diagnostic can also land outside every sample**, inside a referenced package's own source. For example, a generic instantiated with a type the project does not have is reported against the generic's own type parameter, in the package's file, and the sample that provoked it has no diagnostic of its own. The run fails with a row naming no page, and the same splitting isolates the sample, after one build of the empty template decides whether the row is the template's own. A split never cuts a `projname` group in half, and never separates a page's `hidden` context from the samples that need it.

Four files under `scripts/lib/` belong to the tool:

- `tb-fences.mjs` needs no compiler --- fence extraction, the markup and the classifier --- and is where a new key or slot goes.
- `example-batches.mjs` packs samples into batches, cuts a crashed batch down, and holds the probes, which run before every run and in [`example-batches.test.mjs`](Tools-Toolchain-Tests#example-batches-test).
- `example-run.mjs` is what `check_run` needs without an IDE: which samples may be run, what a sample says it prints, the generated dispatcher, and the reading of the run's markers.
- `tb-install.mjs` finds the IDE and the compiler beside it, and is shared with the two other IDE-driving tools.

Exit codes: **0** every marked sample compiles, or none is marked (`--report` always, and `--propose` when it found only unmarked samples that fail, which is advisory); **1** a marked sample does not compile, a marker is misused, a template does not compile, the compiler crashed on a project, `--build` or `--llvm` found a sample that fails the build, or a `check_run` sample raised an error, did not return or printed something other than the page says (the report names each); **2** the harness could not run: a refused command line, a failed self-test probe, no IDE, an unreadable `--report` file, a work folder it could not clear, an `--llvm` run on a Community or Personal licence, or a crash.

## package_tests.mjs
{: #package-tests }

    node scripts/package_tests.mjs (<Package> ... | --all-packages) [--arch win32|win64|both] [--port N] [--timeout S] [--hang-timeout S] [--update] [--ide <path>] [--json]

It runs the packages named, each matched to its folder in any case (`tbregexp` is `tbRegExp`), or with `--all-packages` every package that has a test project; a whole run takes several minutes a package, so it is never the default. With neither, or with both, it refuses and lists the packages that have a test project.

Runs the contributed packages' test projects. Each package the reference documents under `docs/Reference/Contributed/` has one in `test/package-tests/<Package>/`: `[TestCase]` Subs of `[TestFixture]` modules that check every claim the NOTEs and WARNINGs of its section make, a generated `RunAll` module, and `expect.json`. The README in that folder says how a case is written. Each case checks what is correct, so a defect of the package is a failing case, and `expect.json` records how each case fails, or that it never returns, on the version the section documents.

For each package and architecture (both by default), the tool stages the project with the package embedded, downloading it from TWINSERV into `%TEMP%\tb-twinserv` the first time, and runs it with [`tbrun --tests`](Tools-Compiler#tbrun). Each case is then judged:

- **documented** --- as `expect.json` says;
- **fixed** --- `expect.json` says it fails or never returns, and it passes: the page's callout and the entry go;
- **changed** --- anything else: a claim of the page is no longer true, or the case is wrong.

A case that never returns stops the compiler. The tool catches it, runs the cases after it again in a new IDE, and from then on, once `expect.json` says so, runs it alone with `--hang-timeout`. `--update` writes `expect.json` from the run, for the architectures run. The run also writes `RunAll.twin` again whenever the cases or `expect.json` change; [`check_package_tests.mjs`](Tools-Toolchain-Tests#check-package-tests) fails while it is out of date.

The build publishes each project as `<Package>-tests.twinproj` beside the package's section, and the section's landing page links to it. It carries none of the package's code: it references the package as a [linked package](../../Features/Packages/Linked), which the IDE loads from `%APPDATA%\twinBASIC\packages`. With the package's file there, the project's `Sub Main` runs every case and prints `PASS`, `FAIL` or `SKIP` for each in the DEBUG CONSOLE.

It is outside every gate and CI: it needs Windows and a twinBASIC install. [`package-tests.bat`](Tools#package-testsbat) runs it.

Exit codes: **0** every case did what `expect.json` says; **1** a case was fixed or changed; **2** a refused command line, a package with no test project, or the harness failed.

## gen_attribute_probes.mjs
{: #gen-attribute-probes }

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Generates twinBASIC probe projects from the `Applicable to:` lines in `Reference/Attributes.md`, for [`tbbuild.mjs`](Tools-Compiler#tbbuild) to compile. Each line is a claim about the compiler, and only the compiler can confirm it. The tool writes one source file per claimed target, so a single build answers every claim. A `Syntax:` or `Applicable to:` line inside a code fence is not read ([`census_attributes.mjs`](#census-attributes) reads the page through the same code, `scripts/lib/attributes-doc.mjs`).

A misplaced attribute comes back as `This attribute is not supported in this context` (TB5155) or `Syntax error.  No handler for this symbol` (TB5182). Which of the two arrives says nothing about whether the attribute exists, only that it is not accepted there.

Up to three trees come out, on two contracts that must not be mixed:

| Tree | Contract |
|---|---|
| `<out_dir>` | `AttributeProbes` --- every probe is expected to compile, so a diagnostic naming a probe module is a documentation defect. |
| `<out_dir>-2` | `AttributeProbes2` --- the same contract, for targets that cannot share a project (one `[RunAfterBuild]` per project). |
| `<out_dir>-explore` | `AttributeExplore` --- **a diagnostic is the answer.** Questions the page cannot settle; each source file carries its own header saying how to read its result. |

Red in `AttributeProbes` is a defect; red in `AttributeExplore` is a result.

The tool also writes a key naming the `Attributes.md` line each probe came from, beside the tree rather than inside it, because anything inside gets packed into the `.twinproj` as a stray project file. Pack a tree into a project with [`impexp.mjs`](Tools-Compiler#impexp) before building it:

    node scripts/impexp.mjs import AttributeProbes.twinproj <out_dir> --overwrite

`impexp.mjs` exits non-zero when the pack fails. The compiler's own `import` verb takes the same command line, but **its exit code is `0` after every failure it reports**, so a script that packs with it and then builds will compile the previous `.twinproj`. (The one failure it does not report, a tree holding an embedded package, exits `999`.) Test the last line of its output for `... DONE` instead; [Import/Export Tool](../../Features/Packages/Import-Export-Tool#checking-the-result) has the caveat in full and a batch-file form of the test. Re-run the generator after editing `Attributes.md`.

Exit codes: **0** the probe project and the key were written, **2** a refused command line (no output directory included), or a crash.

## census_attributes.mjs
{: #census-attributes }

    node scripts/census_attributes.mjs [--ide <install>] [--exported <dir>] [--cache <dir>]
                                       [--refresh] [--samples] [--attr <name>]
                                       [--json] [--out <file>] [--dump-sites <file>] [--quiet]

Reports, for every attribute the twinBASIC packages use, **which enclosing construct and which kind of declaration it decorates**. It unpacks each package of an IDE install with [`impexp.mjs`](Tools-Compiler#impexp), scans the `.twin` sources, and writes a Markdown or JSON report. No arguments are needed: it finds the newest `twinBASIC_IDE_BETA_*` as [`tbbuild.mjs`](Tools-Compiler#tbbuild) does and caches the export under the build number. It is not part of the site build.

Against BETA 1005 that is 661 files, 9,744 attribute sites and 55 distinct attributes.

**A census is evidence, not applicability.** It says where an attribute *is* used, never where it *may* be used, and the two differ in both directions. The packages contain no use of `[Hidden]` on a whole **Class**, yet the compiler accepts one. They contain many on **Class** and **Interface** members, yet the compiler refuses the same attribute on the **Interface** lines inside a **CoClass**. To find out what the compiler accepts, use [`gen_attribute_probes.mjs`](#gen-attribute-probes) and [`tbbuild.mjs`](Tools-Compiler#tbbuild), which ask it directly.

Grouping is by enclosing construct *and* declaration keyword, because the keyword alone misleads. `[RedirectToStaticImplementation]` has 82 uses, on "a Property Get, a Function and a Sub", which by keyword suggests *procedure in a Class*. The compiler rejects that with TB5155, because every one of those uses is inside an **Interface**.

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

The report ends with what the scanner could not resolve, and **that section is expected to be empty**: an unresolved site is a scanner bug, not something to absorb. The scanner handles what this corpus does that a simpler sweep gets wrong: attributes spanning lines (`[Description("..." & vbCrLf & _` accounts for 3.8% of all attribute lines), comma-separated lists, arguments containing commas, escaped identifiers that look like attributes (`[_HiddenModule].Foo`, and Enum members genuinely named `[A4 Portrait]`), comments in four different positions, and block-tracking traps such as a UDT field called `Type As Long` or a module named `[_HiddenModule]`.

Exit codes: **0** the report was produced, **2** a refused command line, no install, an install with no package project, or a crash (a package that fails to export is left out of the census).

## sweep_attributes.mjs
{: #sweep-attributes }

    node scripts/sweep_attributes.mjs [--ide <twinBASIC.exe>] [--names <a,b,...>] [--sites <a,b,...>]
                                      [--forms bare|smart|all] [--no-tokens] [--jobs <n>] [--port <n>]
                                      [--batch-size <n>] [--verify <n>] [--out <file>]
                                      [--dump-results <file>] [--work <dir>] [--keep] [--preflight]
                                      [--dry-run] [--list-sites] [--show | --hide] [--timeout <secs>]

Asks the compiler where every attribute is legal. It writes each attribute name at each declaration site --- a Module, a Class member, an API `Declare`, a Type field, a parameter, an `Implements ... Via` statement, and so on --- in each argument shape, builds the projects the way [`tbbuild.mjs`](Tools-Compiler#tbbuild) does, and compares the answers with the `Applicable to:` lines in `Reference/Attributes.md`. The report lists the documented targets the compiler refuses, the targets that hold only partly, and the sites it accepts that the page never mentions.

It exists because the older tools leave a gap. [`census_attributes.mjs`](#census-attributes) says where the shipped packages *use* an attribute, and [`gen_attribute_probes.mjs`](#gen-attribute-probes) probes only the targets the page already *claims*: a line checked against only a Sub and a Const says nothing about an API `Declare`. This tool asks every question, so a missing target shows up as a row of the report.

The names come from every entry in `Attributes.md`, every name in the compiler's own token table (a pipe-separated string in the compiler binary, holding keywords, attributes and object members together), and `--names`. A token-table name is a *candidate*: it is an attribute only if some site accepts it. `Debug` is in the table and is not one.

**How an answer is made readable.** A clean build is not proof by itself, so the tool guards against the ways one goes wrong:

- **Baselines.** Every site is built with no attribute first, and one that does not build clean is voided, so a wrong skeleton cannot read as "every attribute is refused here".
- **Controls.** TB5155 and TB5182 do not separate "wrong place" from "no such attribute". An invented name is built at every site, and a probe that draws exactly what the control draws is a refusal whatever its code. A site whose control compiles is voided.
- **Canaries.** Three probes (one clean, one refused for context, one unknown) ride in every batch. What they must draw is fixed in the script, and the tool builds them alone first and stops unless they draw it. A batch whose canaries differ, or that holds an error row belonging to no probe, is halved rather than believed. That catches a compiler that stops reporting after so many errors, or a syntax error that suppresses the diagnostics of other files.
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

**An Enum member cannot be tested.** On a line of its own inside an Enum, a bracket group is not an attribute but a member named by its text, so that form compiles whatever it names, an attribute that applies nowhere included; written inline, every attribute is refused. The site is voided, and a target on an Enum member is reported as one the sweep could not test.

**A clean build says the compiler accepts an attribute at a site, not that the attribute does anything.** The sweep reads the IDE's background compile, so a check made only when linking is not seen. To show an attribute's effect, use an A/B probe like X29 to X33 in `gen_attribute_probes.mjs`.

Like [`check_examples.mjs`](#check-examples), it needs a twinBASIC install and Windows with a private desktop, so it is outside every gate and CI. **Pass `--out` and `--dump-results`:** the report is the only product, and a run piped through `tail` keeps one line of it.

Exit codes: **0** the report was produced and its self-checks held; **1** a self-check found a fault --- a probe disturbed the canaries even beside nothing else, or `--verify` found a probe that answered differently the second time; **2** a refused command line, no install, canaries that do not draw what the script records, a harness failure, a run cut short (its report is written all the same, and says so at the top), or a crash.
