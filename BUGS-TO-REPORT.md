# twinBASIC bugs to report

A queue, not a record. Each entry is a **product** bug --- something twinBASIC itself does
wrong --- observed while working on this documentation. **Delete an entry once it has been
filed upstream**; nothing here is meant to accumulate, and an entry that stays after it is
filed turns this file into a second, worse issue tracker.

Documentation defects do not belong here. They are fixed in `docs/`, and the ones that are
not yet fixed are recorded in the relevant `WIP.*.md`.

What an entry owes a reader:

- the **build** it was seen on, because the answer changes between betas;
- a **minimal reproduction**, narrowed rather than pasted --- the thing that made it
  reproduce is usually smaller and stranger than the code it was found in;
- what was tried that did **not** reproduce it, which is half of what makes a report
  actionable;
- how it was **observed**, so somebody else can see the same thing.

---

## The recent-projects list fills its empty slots with copies of its last entry

**Build:** BETA 983
**Severity:** cosmetic, but it shows on a new installation, which is exactly when the
list has empty slots --- the same project repeated down the Recent tab.

The list is 21 values, `"0"` to `"20"`, under
`HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE\RecentlyOpened`. Reproduction:

1. Leave two entries: `"0"` = `A.twinproj`, `"1"` = `B.twinproj`. Either delete `"2"` to
   `"20"` or set them to empty strings; both reproduce it.
2. Open a third project, `C.twinproj` --- on the command line is enough.
3. The IDE writes `"0"` = `C`, `"1"` = `A`, and `"2"` to `"20"` = `B`: **nineteen copies of
   `B`**.

What does **not** reproduce it:

| starting list | result |
|---|---|
| no `RecentlyOpened` key at all | `C` and 20 empty strings --- correct |
| 21 distinct entries | 21 distinct entries, the oldest dropped --- correct, read at the end of 41 successive opens |
| `C` already at the top | unchanged --- the opened project itself is never duplicated |

So it takes at least one existing entry and at least one slot with nothing in it, which
looks like each slot being read with the previous slot's value as its default. Once a
duplicate is there, the next opened project keeps it: 18 copies of one project became 20
after one more open, with the new project on top.

**Observed** on 2026-09-23 by reading the registry values after `tbbuild --keep` opened a
fixture project on a private desktop and the IDE was killed: once for each variant of step
1, and in two successive sessions on one project for the third row and the growth from 18
copies to 20. The first row was seen when the key had been deleted and the next harness run
recreated it, the second at the end of a `check_examples` run. The
harness records it because its own runs trip it: every IDE a run starts opens a project, and
a run that began on a list holding one entry ended with seventeen copies of it. The registry
tidy (`scripts/lib/tb-registry.mjs`) now puts the list back as it found it, without the
copies; a list that was short to begin with is left short, and the next project the user
opens then trips this.

---

## Compiler crashes on an `Interface` named by an angle-bracket placeholder that has an `Extends` clause

**Build:** BETA 983 (`twinBASIC_win32.dll+00141F7A`)
**Severity:** crash --- takes the compiler down, three restarts, then the IDE gives up.

This two-line file is the whole reproduction:

```
Interface <name> Extends <base-interface>
End Interface
```

The IDE's DEBUG CONSOLE reports `NATIVE EXCEPTION: ACCESS_VIOLATION {no-basic-code}` with
`>>> thread 0004: ParsingFileStart, <that file>`, then `restarting from MEMORY`, three
times over.

**It takes a placeholder name and an `Extends` clause**, and what the clause names does not
matter:

| source | result |
|---|---|
| `Interface <name>` + `End Interface` | TB5182 Syntax error, no crash |
| `Interface IFoo Extends <base-interface>` + `End Interface` | TB5182 + TB5079 + TB5127, no crash |
| `Interface <name> Extends <base-interface>` + `End Interface` | **crash** |
| `Interface <name> Extends IBase` + `End Interface`, no `IBase` anywhere | **crash** |
| the same, with `Interface IBase` or `Class IBase` declared in another file | **crash** |

This entry used to say that it takes a placeholder in *both* positions; the last two rows,
measured on 2026-09-24 with a project of its own each, say otherwise. The input is not real
code --- it is a syntax skeleton, the shape `docs/Reference/Attributes.md` uses to show
where an attribute goes --- but a parser meeting nonsense should diagnose it, and this one
dereferences something instead.

**Found by** pointing `scripts/check_examples.mjs` at the documentation's own code samples;
the skeleton is one of the 1,124 `tb` fences under `docs/`. A crash in a batch of samples
costs the whole batch its result, which is why that tool isolates the sample on exit code 4.

---

## An `Interface` that extends itself compiles without a diagnostic

**Build:** BETA 983
**Severity:** invalid code accepted --- the same cycle through a class is refused.

This two-line file compiles with no error, warning, hint or info:

```
Interface IA Extends IA
End Interface
```

A cycle through two interfaces is accepted the same way, in one file or split across two:
`Interface IA Extends IB` and `Interface IB Extends IA`. The other kinds of cycle are
diagnosed:

| source | result |
|---|---|
| `Class CA` + `Inherits CA` + `End Class` | TB5127 circular reference |
| `Class CA` inheriting `CB` and `Class CB` inheriting `CA`, two files | TB5127 circular reference, TB5022 failed to import inherited members |
| `Type TA` holding a `TB` and `Type TB` holding a `TA`, two modules | TB5101 unable to finalize User Defined Type, possible circular reference |

So a cycle is checked for classes and UDTs, and not for interfaces. What happens when such a
project is built --- its type library has to describe the cycle --- was not tried.

**Observed** on 2026-09-24 with `tbbuild`, a project of its own for each source: exit 0 and
`0 error(s), 0 warning(s), 0 hint(s), 0 info` for the three interface cases, and the
diagnostics above for the rest. **Found by** looking for a compiler crash that needs two
files, to test `check_examples`' handling of one: a cycle between two files was the likeliest
candidate, and the interface cycle compiled instead of crashing.

---

## `--buildAndExit32` writes nothing, exits 0 on a project with errors, and hangs on a failing build

**Build:** BETA 983
**Severity:** makes the documented unattended-build switch unusable.

The IDE executable accepts `--buildAndExit32` and `--buildAndExit64`; `parseCommandLine()`
reads them, and Personal Edition is refused by name, so they are real. Measured three ways:

- **nothing is written to stdout or stderr, ever** --- no diagnostics, no summary;
- it **exits 0 on a project the IDE flags with errors**;
- when the build genuinely fails it **does not exit at all**, sitting on a *"Please wait…"*
  dialog at 100% indefinitely.

Silent, falsely green, and hanging on the one case worth catching. This is why
`scripts/tbbuild.mjs` drives the IDE's WebView over CDP instead --- see
[WIP.Harness.md](WIP.Harness.md#compiling-a-twinbasic-project-without-the-ide-in-front-of-you), which
records the same measurements.

---

## Public members are typed with Private components, so a default project cannot use them

**Build:** BETA 983
**Severity:** documented APIs need the consumer to expose the package's internals; one
event asks for a type it then refuses.

`VB.Report` shows it most sharply, because the compiler names the type in one diagnostic
and rejects it in the next. In a project referencing the VB package the ordinary way:

```
Class ProbeReport
    Private WithEvents rpt As VB.Report
    Private Sub rpt_BeforePaintSection(ByVal Section As VB.ControlsSection)
    End Sub
End Class
```

```
TB5018 unable to match this handler to its event member. The expected signature was:
       Private Sub rpt_BeforePaintSection(ByVal Section As ControlsSection)
TB5079 Unrecognized datatype symbol 'ControlsSection'
```

**The remedy is the asterisk**, and it works: with the library symbol set to `*VB`, the
handler above compiles exactly as written. So this is not an unreachable type --- it is a
*public* event whose parameter type is `Private Class ControlsSection`
(`VB/Sources/SUPPORT/ControlsSection.twin:4`), which means handling a documented event
requires opting into the package's private half. The other spellings are worse than useless:
`ByVal Section As Object` binds and compiles, while `Variant`, the bare name, and omitting
the parameter all fail.

**The CustomControls package has the same shape across its whole style surface.** Every
class in `CustomControlsPackage/Sources/zTemporarySupport.twin` is `Private` --- `Corner`,
`Corners`, `Padding`, `FillColorPoint`, `FillColorPoints`, `Border`, `Borders`, `Line`,
`Fill`, `TextRendering`, `Anchors`, `WindowsFormOptions` and the per-control `…State`
classes --- while the members that hand them out are public:

| member | declared | what a default project can do |
|---|---|---|
| `Borders.Elements` | `Public WithEvents Elements() As Border` | read it; assigning needs a `Border()` it cannot declare |
| `FillColorPoints.Values` | `Public WithEvents Values() As FillColorPoint` | the same |
| `TextRendering.Outlines` | an array of `Border` | the same, and with no `SetSimpleBorder` equivalent to fall back on |
| `Canvas.RuntimeUICCCanvasAddElement` | `(ByVal Me As Canvas, ByRef ElementDescriptor As Any)` | pass a record it declares itself, with the style members left `Nothing` |

With `*CustomControlsPackage`, all of it works under the package qualifier:
`New CustomControlsPackage.Border`, `Dim elems(0 To 2) As CustomControlsPackage.Border`,
`Dim descriptor As CustomControlsPackage.ElementDescriptor`, and a complete
`ICustomControl` implementation that sets `BackgroundFill` and `TextRenderingOptions` from
`New CustomControlsPackage.Fill` / `.TextRendering`. Both `CustomControlsPackage.ElementDescriptor`
and `CustomControlsPackage.UDTs.ElementDescriptor` resolve, although the UDT is declared
`Public Type` inside `Private Class UDTs`.

**Why this reads as an oversight rather than a policy.** The file is called
`zTemporarySupport.twin`, and the package's own changelog dates the narrowing:
*"v0.0.5.0, 15th September 2022 --- improved: made changes to ensure nothing within the
package is being exposed unnecessarily."* Reducing the surface is reasonable; what it missed
is that these particular classes are not internal --- they appear in the signatures of
members that stayed public, so every consumer of those members is now required to import the
package with an asterisk and qualify names that the package's own controls write bare.

**Two more packages have the same shape, found the same way.** In both, a `Public Enum` sits
inside a `Private Module`, so a consumer can name neither the enum nor its members --- and
both enums are the argument type of a documented, public member:

| package | declaration | what a default project cannot write |
|---|---|---|
| WinNativeCommonCtls | `Private Module ImageListConsts` → `Public Enum ImlDrawConstants` | `ImageList1.ListImages(1).Draw hDC, x, y, ImlDrawTransparent Or ImlDrawFocus` |
| cefPackage | `Private Module _cef_log_severity_t` → `Enum CefLogSeverity` | `CefBrowser1.EnvironmentOptions.LogSeverity = CefLogWarning` |

Neither the bare member (`ImlDrawTransparent`), the enum name (`ImlDrawConstants.…`), nor the
owning control as a qualifier (`ImageList.ImlDrawConstants.…`) resolves --- all three are
`TB5079 Unrecognized symbol`. **The asterisk works**, as it does for the VB and
CustomControls cases: with the library symbol set to `*WinNativeCommonCtls`,
`WinNativeCommonCtls.ImlDrawTransparent` compiles, and the documentation now shows that form
with a note. That is a workaround, not a fix --- a documented, user-facing enum should not
require a project to expose the package's private half. **The VB package has it too**, from a different direction: the
enums nested inside a control class, `MultiFrameDirectionConstants` in `MultiFrame` and
`QRCodegenEccConstants` in `QRCode`, are equally unreachable, so
`mfPanels.Direction = vbDirectionHorizontal` does not compile although it is what the
property's own documentation says to write.

**Why it went unnoticed:** none of the 32 sample projects the IDE ships exercises any of
this from code. Exported and grepped, all of them: `ControlsSection` appears only as a
designer `_className` in the two `.tbreport` files and no sample handles
`BeforePaintSection`; `ElementDescriptor`, `ICustomControl`, `ICustomForm` and
`RuntimeUICC*` appear nowhere at all; `Border` appears 971 times, every one a designer
`_className` in a `.tbform`. No sample line sets `NormalState`, `HoverState` or any
`.Fill.` from code.

**Found by** `scripts/check_examples.mjs`, which compiles the documentation's own code
samples. The pages documenting `New Border`, `Dim descriptor As ElementDescriptor` and a
`ControlsSection` handler were all written from the packages' sources, and none of them
compiled in a default project.

---

## `Err.Raise` rejects `HelpContext` as a named argument, while its three siblings work

**Build:** BETA 983
**Severity:** VBA-compatible code that names the fifth argument does not compile, and the
diagnostic does not say which name was wrong.

```
Dim myHelpFile As String, myHelpContext As Long
Err.Raise vbObjectError + 894, Source:="MyApp.MyClass", _
          Description:="Was not able to complete your task", _
          HelpFile:=myHelpFile, HelpContext:=myHelpContext
```

```
TB5090 unrecognized named argument
```

**What does work**, each verified on its own: the same call with `Source:=`,
`Description:=` and `HelpFile:=` named and the fifth argument dropped compiles, and so does
the fully positional form `Err.Raise vbObjectError + 894, myObjectID, "...", myHelpFile,
myHelpContext`. So the parameter exists and accepts a **Long**; only its *name* is
unrecognised. `HelpContextID:=` is rejected as well, so this is not simply a different
spelling to discover --- and the compiler binary's only `HelpContextID` strings belong to
project settings, not to a signature.

**Why it matters:** `HelpContext` is what VBA itself names that parameter. Read out of the
VBA type library on the machine this was found on --- `VBE7.DLL` 7.01.1158, VBA7.1, via
`LoadTypeLibEx` and `ITypeInfo::GetNames` on `_ErrObject`:

```
Raise(Number, Source, Description, HelpFile, HelpContext)
```

All five names are exactly the ones the failing call uses, and the call is Microsoft's own
`Err.Source` example, named arguments and all --- so the code twinBASIC rejects is the code
a VBA developer is most likely to have copied. Four of the five names are accepted here;
only the fifth is not.

**Found by** `scripts/check_examples.mjs` over `Reference/Default/VBA/ErrObject/Source.md`,
whose sample was written in the named form. The page uses the positional form now.

---

## An interface member marked `[PreserveSig]` cannot be implemented by a class

**Build:** BETA 983
**Severity:** an interface the language lets you declare cannot be implemented at all, and
the diagnostic asks for the signature that is already written.

```
[InterfaceId("11111111-0000-4000-8000-000000000004")]
Interface IProbeD Extends IUnknown
    [PreserveSig]
    Function F() As Long
End Interface

Class ImplD
    Implements IProbeD
    Private Function IProbeD_F() As Long Implements IProbeD.F
    End Function
End Class
```

```
TB5004 unable to match this implementation to its interface member. The expected signature was: Private Function IProbeD_F() As Long
TB5000 Missing implementation of member Function F() As Long
```

**The "expected" signature is character for character the one on the line the error is
reported against.** Whatever the compiler is comparing, it is not what it prints.

**What was tried and does not help**, each on its own:

- the VB6-style name without the method-level `Implements IProbeD.F` clause --- `TB5018
  unable to match this handler to its event member`, an *event-handler* message for an
  interface member, with the same expected signature;
- `[PreserveSig]` on the implementing method as well --- `TB5155 This attribute is not
  supported in this context`.

**What does not matter:** a parameter, or a **Boolean** return --- the case it was found in
was `Function MyFunc(Arg1 As Variant) As Boolean` --- or a `[TypeHint(...)]` on that
parameter, which implements cleanly without `[PreserveSig]`. The same interface with the
attribute removed implements cleanly. `[PreserveSig]` alone is the trigger.

**Found by** `scripts/check_examples.mjs` over `Reference/Core/Interface.md`, whose example
declared `IFoo` with a `[PreserveSig]` member and then showed a class implementing it. The
implementation had never compiled. The page's example no longer puts `[PreserveSig]` on a
member it implements, and its description of the attribute says why.

---

## `import` stops with exit code 999 on any folder inside `Packages`, so a project that embeds a package cannot be packed

**Build:** BETA 983 --- `twinBASIC_win32.exe` and `twinBASIC_win64.exe` alike
**Severity:** the command line cannot pack any project that embeds a package, and the
failure prints neither `... DONE` nor `... FAILED`.

`import` is the compiler executable's verb for packing a folder tree into a project file.
Given a tree whose top-level `Packages` folder contains a folder, it ends partway through:

```
twinBASIC_win32.exe import out.twinproj tree\ --overwrite
```

- the exit code is **999**, where every other failure observed exits 0;
- no project file is written, and one already at the output path is left untouched;
- the last line printed is `  IMPORTED FOLDER: <tree>\\Packages\`, and nothing reaches
  stderr.

**The smallest reproduction is one empty folder.** Export any project, add an empty
`Packages\Nested\` to the tree, and import it. Every case below starts from a fresh `export`
of the HelloWorld sample:

| added to the exported tree | result |
|---|---|
| nothing | exit 0, `... DONE` |
| an empty `Packages\Nested\` | **exit 999, no project** |
| `Packages\Nested\x.txt` | **exit 999, no project** |
| `Packages\Nested\Settings`, a copy of the root `Settings` | **exit 999, no project** |
| `Packages\A\B\` | **exit 999, no project** |
| `packages\Nested\`, in lower case | **exit 999, no project** |
| `Packages\x.txt` --- a file, no folder | exit 0, `... DONE` |
| an empty `Packages\` on its own | exit 0, `... DONE` |
| `Miscellaneous\Nested\x.txt` | exit 0, `... DONE` |
| `Sources\Packages\Nested\` --- a `Packages` below the top level | exit 0, `... DONE` |

So the trigger is a folder inside the top-level `Packages`, whatever it holds: an empty one
does it, and so does one with a `Settings` file of its own, which is what a real package
has. Leaving out `--overwrite` makes no difference: with a project already at the output
path, `import` still stops with 999 rather than refusing to overwrite it.

**This is not malformed input.** A package a project uses is embedded in it by default, as
a folder of its own under `Packages`, and `export` writes that folder out with the rest of
the tree. Five of the 48 project and package files the IDE ships have one ---
`WinNativeCommonCtls` (which embeds `VBComDlg`), samples 8, 17 and 23, and the *Standard
EXE (plus VBCCR v1.8)* project template --- and each was measured: `export` succeeds, and
`import` of the tree it has just written stops as above. None of them round-trips through
the command line, and neither does any project created from that template. Nor does any
export written by the IDE's **Export Project**, which always adds the compiler packages under
`Packages` (see *Export Project writes the compiler packages*, below).

**Found by** checking `scripts/impexp.mjs` against the compiler's `import` for line-ending
handling: a probe tree with a made-up `Packages\Nested\` folder never produced a project to
compare. The standalone scripts pack all five exported trees with every file byte-identical
to the original; the only files missing are `.meta` files, the embedded packages' own
included, which `export` does not write.

---

## `export` and `import` stop at the 260-character path limit, apart from the one path they prefix with `\\?\`

**Build:** BETA 983 --- `twinBASIC_win32.exe`, on a machine with `LongPathsEnabled` set to 1
**Severity:** an `export` to a deep folder writes part of the tree and exits 0, and the
errors it prints blame permissions and storage space.

`export` names its input with a `\\?\` prefix --- *exporting from
"\\?\C:\...\package.twinproj"* --- and a 301-character input path exports normally. Every
other path the two verbs touch is held to the ordinary Win32 limits:

| path | observed | what it prints |
|---|---|---|
| a file `export` writes | 259 characters written, 260 fails | `ERROR: failed to create output file: <path> (check permissions and storage space)` |
| a folder `export` creates | 247 characters with its trailing `\` created, 248 fails | `[EXPORT]  ERROR: folder does not exist and could not be created: <path>\` |
| the project file `import` writes | a 271-character path fails | `ERROR: failed to create output file: <path> (check permissions and storage space)` |
| the tree `import` reads | a tree at a 250-character path fails | `ERROR: unable to read from folder: <tree>\\ImportedTypeLibraries\*` |

Every one of those runs ends `... FAILED` and exits 0. `export` carries on past each error,
so what it leaves is a partial tree: exporting `WebView2Package` to a 198-character folder
wrote 45 of its 72 files. `LongPathsEnabled` is 1 on the machine this was measured on, so
the Windows setting does not rescue it.

**Reproduction.** Export the HelloWorld sample into an existing folder whose own path is 231
characters long. `Settings` and `Sources\HelloWorld.twin` are written, at 240 and 255
characters; `Resources\ICON\twinBASIC.ico` would be 260 and is not. At 220 characters every
file is written and the run ends `... DONE`.

**What does not reproduce it:** a long *input* path to `export`, and any output folder short
enough that no file path reaches 260 characters and no folder path 248.

**Found by** the attribute census, `builder/census_attributes.mjs`, pointed at a cache folder
inside a deep working directory: `WebView2Package` and the three `cefPackage` versions came
back `... FAILED` while the other twelve packages exported. The census used to trust
`export`'s exit code, so until it tested for `... DONE` it would have scanned those partial
trees as complete.

---

## A damaged project file opens a message box, and the command waits until it is closed

**Build:** BETA 983 --- `twinBASIC_win32.exe`
**Severity:** an unattended `export`, `settings` or `readme` never finishes; once the box is
closed, `export` reports success.

```
twinBASIC_win32.exe export C:\probe\garbage.twinproj C:\probe\out\
```

`garbage.twinproj` can be any file that is not a project: a 20-byte text file, an empty file,
a real project with its first byte changed, or one cut off halfway. All four were tried.

- The executable opens a modal message box --- *invalid header* and *invalid file format*
  were both seen across those inputs --- and prints nothing more until it is closed. Left
  alone, each of `export`, `settings` and `readme` was still waiting when the harness killed
  it at 25 seconds.
- Once the box is closed, `export` prints `WARNING: failed to parse project file, file may be
  corrupt`, then `... DONE`, and exits 0. For the project cut off halfway it also writes the
  one file it could read, `Settings`.

So the `... DONE` test that the exit code forces on every script is fooled as well. **What
does not reproduce it:** a folder given where the project should be. `settings` then prints
`ERROR: failed to parse project file, file may be corrupt or inaccessible` and exits, with no
box.

**Found by** probing the command line for the rewrite of the Import/Export Tool page. The
boxes appeared on the desktop of the person at the machine, which is how their wording is
known.

---

## `export` refused for lack of `--overwrite` still writes part of the tree

**Build:** BETA 983
**Severity:** a refused export leaves the folder a mixture of the old tree and the project.

Export the HelloWorld sample into a folder, delete the exported `Settings`, edit
`Sources\HelloWorld.twin`, and export again without `--overwrite`:

```
[EXPORT]  ERROR: output file already exists and --overwrite not set: <out>\Resources\ICON\twinBASIC.ico
[EXPORT]  ERROR: output file already exists and --overwrite not set: <out>\Sources\HelloWorld.twin
[EXPORT]  DONE: <out>\Settings
... FAILED
```

`Settings` comes back from the project while the edited `HelloWorld.twin` stays, so the folder
now matches neither the old tree nor the project. `import` checks before it writes, so a
refused `import` leaves the project file as it was; `export` should do the same.

The same behaviour makes **the VB package impossible to export without `--overwrite`**, even
into an empty folder: it holds `Resources\MANIFEST\#1.xml` twice (next entry), and `export`
writes one copy and then refuses the other because of the file it has just written.

---

## The IDE has written the same name twice into project files it ships

**Build:** BETA 983
**Severity:** a folder can hold only one of them, so unpacking keeps one copy; which copy the
IDE itself uses is not known.

Two of the 48 project and package files an installation ships hold one name more than once,
with different contents:

| file | name | copies |
|---|---|---|
| the VB package | `Resources/MANIFEST/#1.xml` | 2 --- 703 and 682 bytes |
| Sample 16, *twinBASIC IDE Addin (TODO Widgets demo)* | `.addins/WaynesTodoItemsData` | 8, no two alike |

`export` writes entries in reverse order, so with `--overwrite` the first copy in the file is
the one left on disk. The eight Sample 16 copies suggest that each save of the add-in's data
added an entry instead of replacing the old one --- a guess, not a measurement.

**Found by** comparing the standalone scripts' `export` with the executable's over every
shipped project file. The scripts now keep the first copy, as the executable does, and name
the repeated entries in a warning.

---

## `export` needs a full, backslashed project path, and no folder path may use forward slashes

**Build:** BETA 983
**Severity:** ordinary relative and forward-slashed paths fail, with messages that say the
file or folder does not exist.

| argument | example | result |
|---|---|---|
| `export`'s project path, relative | `export hello.twinproj out\` | `ERROR: input twinproj file does not exist` |
| `export`'s project path, forward slashes | `export C:/p/hello.twinproj C:\p\out\` | the same |
| `export`'s folder, forward slashes | `export C:\p\hello.twinproj C:/p/out/` | `ERROR: output folder does not exist and could not be created`, although it exists |
| `import`'s folder, forward slashes | `import C:\p\x.twinproj C:/p/tree/` | `ERROR: input folder does not exist`, although it exists |

The echo line explains the first two: `exporting from "\\?\hello.twinproj"`. The project path
is prefixed with `\\?\`, which turns off Windows' path normalisation, so only a full path with
backslashes survives it. **What does not reproduce it:** `import`'s project path and the
printing commands' take relative and forward-slashed paths, and with backslashes `export`
creates every missing level of its output folder.

---

## `import` of a folder with no `Settings` file fails without saying why

**Build:** BETA 983
**Severity:** minor --- the refusal is right, and the silence is not.

Given a folder with no `Settings` file at its top, `import` lists the files it read, ends
`... FAILED` with no `ERROR:` line, and writes nothing. Every other failure measured names its
cause.

---

## `\` and `Mod` on the most negative `Integer` or `Long` by -1 raise a native exception that `On Error` cannot handle

**Build:** BETA 983, 32-bit target
**Severity:** a division that should raise the trappable error 6 stops the procedure instead; the
`LongLong` form returns a wrong value with no error at all.

```
Dim a As Integer = -32768
Dim b As Integer = -1
On Error Resume Next
Debug.Print a \ b
```

The DEBUG CONSOLE shows `NATIVE EXCEPTION: NT_OVERFLOW /<file>; <module>.<procedure> LINE <n>
[CONTINUABLE]` for the division's line, then `[IDE] auto-activated TRACE-MODE in this session`,
and nothing after that line runs, `On Error Resume Next` notwithstanding.

| operands | `\` | `Mod` |
|---|---|---|
| `Integer` -32768 and -1 | native exception | native exception |
| `Long` -2147483648 and -1 | native exception | native exception |
| `LongLong` -9223372036854775808 and -1 | **-9223372036854775808**, no error | 0 (right) |
| a `Variant` holding the `Integer` -32768, and -1 | `Long` 32768 (right) | --- |
| a `Variant` holding the `Long` -2147483648, and -1 | error 6 (right) | --- |

**What does not reproduce it:** every other overflow measured raises error 6 as it should ---
`32767 + 1`, `32767 * 32767` and `-(-32768)` on typed `Integer` values, and the same kind of
overflow on `Long`, `LongLong`, `Single`, `Double`, `Currency` and `Decimal` --- and division by
zero raises error 11. Only the one quotient that does not fit its type fails this way.

**Found by** probing the arithmetic operators' result types for `Reference/Operators.md`. The
probe's first run lost every case after this one.

---

## Shifting a `Single`, `Double`, `Date`, `Boolean` or `String` compiles clean, then fails code generation

**Build:** BETA 983
**Severity:** the compiler accepts the expression with no diagnostic, and the procedure that
contains it never runs.

```
Dim a As Single = 7.9
Dim c As Integer = 1
Debug.Print a << c
```

The problems panel shows no errors and the build reports `[LINKER] SUCCESS created output file`.
When the procedure is called, the DEBUG CONSOLE shows `[LINKER] compilation (codegen) error
detected in '<module>.<procedure>' at line #<n>`, naming the shift's line, and nothing in the
procedure runs --- not even the statements before the shift. `On Error Resume Next` in the caller
does not see it; the caller stops too.

| left operand | `<<` and `>>` |
|---|---|
| `Single`, `Double`, `Date`, `Boolean`, `String` | codegen error |
| `Byte`, `Integer`, `Long`, `LongLong`, `LongPtr` | shifts |
| `Currency`, `Decimal` | builds, but works on the value: a `Currency` holding 7.9, shifted left by 1, is 15.8 |
| a `Variant` holding any of the types above | builds, and multiplies or divides the value |

Precedence reaches it too: `"x" & n << 2` parses as `("x" & n) << 2`, a `String` shift, and fails
the same way. Either a diagnostic or a working shift is expected; the documentation had said
floating-point operands are truncated before shifting.

**Found by** probing the operators' result types for `Reference/Operators.md`.

---

## `>>` gives three different results for the same value, and a `Variant` shift can return `Empty`

**Build:** BETA 983
**Severity:** wrong values, with no diagnostic.

```
Dim n As Long = -8
Dim v As Variant = CLng(-8)
Debug.Print -8& >> 1    ' -4           constants: an arithmetic shift
Debug.Print n >> 1      ' 2147483644   a Long variable: a logical shift
Debug.Print v >> 1      ' -4           a Variant: a division, truncated toward zero
```

The logical shift is what a typed variable gets and what the documentation describes. The
constant folder disagrees with the code generator: `-1 >> 1` and `-1& >> 1` are both -1, where an
`Integer` variable holding -1 gives 32767 and a `Long` variable gives 2147483647.

A `Variant` operand is not shifted but multiplied or divided --- a `Variant` holding the `Double`
7.9, shifted left by 1, is 15.8 --- and a count as large as the width of the type it holds gives
`Empty` rather than 0:

| expression | result |
|---|---|
| a `Variant` holding `CInt(1)`, `<< 20` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 32` | `Empty` |
| a `Variant` holding `CLng(1)`, `<< 31` | `Long` -2147483648 |
| a `Long` variable holding 1, `<< 32` | 0 |

**Found by** probing the operators for `Reference/Core/LeftShift.md` and `RightShift.md`, whose
examples said `-1 >> 1` returns `&H7FFFFFFF`. It returns -1.

---

## Overloads on `Date` and `Double` resolve by declaration order, not by the argument's type

**Build:** BETA 983
**Severity:** the wrong overload runs, with no diagnostic.

```
Private Function F(ByVal x As Date) As String
    F = "Date"
End Function
Private Function F(ByVal x As Double) As String
    F = "Double"
End Function

Dim x As Double = 1.5
Debug.Print F(x)        ' Date
```

Whichever of the two is declared first receives every call. With `Date` first, a `Double`
argument reaches the `Date` overload; with `Double` first, a `Date` variable, `#1/2/2026#` and
`CDate(1)` all reach the `Double` overload.

**What does not reproduce it:** a `Date` overload beside a `String` one resolves correctly, and an
overload set on `Byte`, `Integer`, `Long`, `LongLong`, `Single`, `Double`, `Currency`, `Decimal`,
`Boolean`, `String` and `Variant` sends arguments of each of those types to their own overload.
The compiler does tell the two types apart elsewhere: `TypeName` of a `Date` expression is
`Date`, and a `Long` overload beside a `LongPtr` one is refused as a duplicate definition in a
32-bit build, as it should be.

**Found by** the overload set used to detect the static type of arithmetic results while
measuring the operators for `Reference/Operators.md`.

---

## `Boolean \ String` and `Boolean Mod String` convert the `String` to `Boolean`

**Build:** BETA 983
**Severity:** a wrong value and a wrong type, with no diagnostic.

```
Dim b As Boolean = True
Debug.Print TypeName(b \ "2")
```

| expression | result | expected |
|---|---|---|
| `b \ "2"` | `Boolean` True | `Long` 0, as `b \ 2.0` gives |
| `b Mod "2"` | `Boolean` False | `Long` -1, as `b Mod 2.0` gives |

The results are consistent with converting `"2"` to `Boolean` (`True`, -1) first: -1 \ -1 is 1,
stored as `True`, and -1 Mod -1 is 0, stored as `False`. A `String` literal and a `String`
variable on the right both reproduce it.

**What does not reproduce it:** every other operator converts the `String` to a number --- `b +
"2"` is the `Double` 1, `b / "2"` the `Double` -0.5 --- and so do `\` and `Mod` with the operands
the other way round: `"2" \ b` is the `Long` -2.

**Found by** the result-type probe for `Reference/Operators.md`.

---

## Export Project follows a directory junction in its folder and deletes what it points to

**Build:** BETA 983
**Severity:** data loss outside the folder the user chose. Export Project empties its folder
before writing, as the *Export Path* setting warns; it does not stop at a junction.

1. In the export folder, make a junction to another folder that holds a file:
   `mklink /J <target>\linked <outside>`, with `<outside>\precious.txt`.
2. Run **File → Export Project** into `<target>`, with *Export Verbose* on.
3. The Debug Console shows:
   ```
   [EXPORT]  DELETED: \\?\<target>\linked\precious.txt
   [EXPORT]  DELETED: \\?\<target>\linked
   ```
   and `<outside>` is empty afterwards.

**What does not reproduce it:** the command-line `export` verb, which deletes nothing.

**Found by** the Export Project probe for round 8's UC-55, which drove the IDE's own
`exportProjectTo()` over DevTools on a scratch folder.

---

## Export Project stops at a read-only file after deleting everything before it, and the IDE reports nothing

**Build:** BETA 983
**Severity:** a partly emptied folder, with the only record in the Debug Console. On a Git
working copy it breaks the repository, because Git makes its object files read-only.

1. Put a read-only file in the export folder among other files.
2. Run **File → Export Project** into it.
3. The Debug Console shows:
   ```
   [EXPORT]  DELETE FAILED: \\?\<target>\readonly.txt
   [EXPORT]  ERROR: unable to clean the output folder
   [EXPORT] export failed.
   ```
   The files and folders that sort before the read-only one are already deleted, nothing is
   exported, and no dialog appears: the compiler's response to the IDE is code 0.

On a `git init` working copy with a commit, it deletes `.git\config`, `HEAD`, `index`, `hooks`
and `info`, then stops at the first object file. `git status` there reports
`fatal: not a git repository`.

**What does not reproduce it:** a folder with no read-only file, which is emptied and exported
completely --- `.git` included, with no prompt.

**Found by** the same probe.

---

## Export Path refuses `${SourcePath}` alone, but not the same folder written as a path

**Build:** BETA 983
**Severity:** the project file is deleted when the export folder is the folder that holds it.

The Settings editor's check on `project.exportPath` in `ide/main.js` compares the text with
`${sourcepath}` and `${sourcepath}\`, with the message "This would DELETE the project file, as
the `Export Project` command empties the output folder before exporting". It does not resolve
the path. The compiler applies no check of its own: an export into the project's own folder
logged `[EXPORT]  DELETED: \\?\<folder>\<project>.twinproj` and completed. A **Save** afterwards
wrote the file back; closing without saving loses it.

**Found by** the same probe. The compiler's side was measured, by calling `exportProjectTo()`
with the folder; that the editor accepts the same folder typed as a path is read from the
check's code, not tried.

---

## Export Project writes the compiler packages, which the project does not hold, and the command line cannot pack the result

**Build:** BETA 983
**Severity:** the IDE's export of a project cannot be packed back into a project by the
supported tool, so it cannot serve for version control; and a two-file project exports as
477 files.

**File → Export Project** writes a `Packages` folder holding the full source of the compiler
packages the project uses: `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject` for a project
with the default references --- 475 of the 477 files an export of a two-file project wrote.
The project file does not hold them. A `.twinproj` the IDE saved holds only the packages the
project embeds, and `twinBASIC_win32.exe export` of it writes only those: for a project
embedding WinDevLib, `Packages\WinDevLib` and no other package.

Then, on that 477-file export:

- `twinBASIC_win32.exe import x.twinproj <export>\` stops with exit code 999 and writes
  nothing (the `import` entry above), as it does for any folder under `Packages`;
- the standalone script packs it, into a 4,220,723-byte project, against 2,055 bytes for the
  same export with `Packages` removed. The project now embeds its own copy of the four
  compiler packages. It compiles with no errors;
- the IDE's own **New Project → Import from folder...** does the same, into a
  4,222,833-byte project, against 4,207 bytes from the export with `Packages` removed.

**The embedded copy is dead, and every later export writes it back.** Measured on the
IDE's import (round 10):

1. Export a project with the default references into an empty folder `E`.
2. In `E\Packages\VBA\Sources\Math.twin`, add `Public Function ProbeEmbeddedMarker() As
   Long` before `End Module`, and a call to it in one of the project's own modules.
3. **Import from folder...** on `E`: TB5079, *Unrecognized symbol 'ProbeEmbeddedMarker'*.
   The compiler uses its own VBA package, not the copy the project now holds.
4. Save the project, and export it again: the Debug Console reports
   `[EXPORT] COMPLETED (139 folders, 954 files)`, against `(72 folders, 479 files)` before,
   and the exported `Math.twin` holds the marker. The export writes both copies to the same
   paths, the embedded one last.

So a project kept in Git through *Export After Save* and rebuilt from a clone keeps committing
the package source of the IDE that first exported it, while it compiles against the current
IDE's. Expected: a `.twinproj` the IDE saves holds no compiler packages, so **Import from
folder** could skip them, or the export could write the IDE's own copy rather than the
project's.

**What does not reproduce it:** the command line's own `export`, which writes what the
project file holds; and **Import from folder** on the export with the compiler packages'
folders removed, which gives the 4,207-byte project, compiles, and exports 479 files.

**Found by** checking round 9's UC-62 answer, which sets up *Export After Save* into a Git
repository and rebuilds the project from a fresh clone with the tB executable. The export was
round 8's, written by the IDE's `exportProjectTo()` over DevTools. The dead copy was measured
following round 10's UC-66, the fresh clone, with `root.loadProjectFromFolder()` --- what the
dialog calls after its folder picker --- and `root.saveProjectAs()` over DevTools.

---

## An out-of-range index raises `&H8002000B` or `&H80004005`, not VBA's error 9

**Build:** BETA 983 --- the IDE and a compiled EXE alike
**Severity:** VBA code that handles `Err.Number = 9` does not recognise the error, with no
diagnostic.

```
Dim a(5) As Long
On Error Resume Next
a(7) = 1
Debug.Print Err.Number, Hex$(Err.Number), Err.Description
```

prints `-2147352565  8002000B  Invalid index.`. Every case measured, reading `Err.Number` in
the program:

| access | twinBASIC | VBA, per VBA-Docs' *Subscript out of range (Error 9)* |
|---|---|---|
| past a fixed or dynamic array's bound, a `Variant` array's, or `Split("x y")(5)` | -2147352565 (`8002000B`) *Invalid index.* | 9 |
| an element of an array never dimensioned: `Dim u() As Integer: u(8) = 234`, VBA-Docs' own example | -2147467259 (`80004005`) *Unspecified error* | 9 |
| a `Collection` member by a missing index or key | -2147467259 *Unspecified error* | 9 for a missing member |
| `Forms(99)`, `Forms.Item(-1)` | -2147467259 *Unspecified error* | --- |

**What does not reproduce it:** `UBound` of an erased array, `Printers(99)` and `Err.Raise 9`
all give 9, and division by zero gives 11. The IDE's run-time error panel shows the same number
`Err.Number` holds, for the array case. An erased array behaves as one never dimensioned:
`-2147467259` for an element, 9 from `LBound` and `UBound`. `Printers` raises 9 past its end but
`-2147467259` for a negative index and for an unknown name. The description of `-2147467259`
varies between runs --- *Unspecified error* in one, *Automation error* in another.

---

## Reading `Forms` by index returns a broken reference, and the process then crashes

**Build:** BETA 983 --- the IDE and a compiled EXE alike
**Severity:** crash (`0xC0000005`), from a form of access the documentation shows.

With one form loaded (`Load Form1`):

```
Dim s As String
s = Forms(0).Name        ' s is "", and the process later dies with 0xC0000005
```

`Set f = Forms(0)` followed by `f.Name` does the same, and so does `s = Forms(n).Name` with
`n` a variable. Inside `For k = 0 To Forms.Count - 1`, `Set f = Forms(k)` corrupts the loop
variable: `k` read 0, 0, 0, then 8195702.

**What does not reproduce it:** `n = 0: Set f = Forms(n)` outside a loop returns the form
(`f.Name` is `Form1`) and the program exits 0; `For Each f In Forms` and `Unload Forms(i)` work;
`Printers(0)` with a literal index works.

**Found by** the fix pass for round 8's error-number findings: an EXE that logs a line before
each statement, run once per case with crash dialogs suppressed. The crash itself was
reproduced by the orchestrator; the loop-variable corruption was measured by the fix agent only.

**Found by** the IDE debugging probe for round 8's UC-61, then a probe of its own run in the IDE
and as the built EXE, with identical results.

---

## A step key pressed on the line that raised an error leaves a step pending

**Build:** BETA 983
**Severity:** the debugger stops where it was not asked to, and one command no longer means one
thing.

1. Run a procedure that raises an untrapped error inside a loop, and let the error panel open.
2. Press F8 (or F10, F11, SHIFT+F8) on the failing line. The line re-runs, the error recurs,
   and the mark does not move --- as expected.
3. Now choose **Ignore (Resume Next)**. It stops at the next line instead of running on.
   Moving past the line with **Set Next Statement** (CTRL+F9) instead, each F5 then advances
   one line.

Seen in three runs. In the one followed to the end, it lasted until the procedure returned; in
another, a fix-then-F5 stopped once. Which of the two applies was not isolated.

**What does not reproduce it:** choosing **Ignore** without pressing a step key first, which
runs on from the next line as the panel says.

**Found by** the IDE debugging probe for round 8's UC-61, driving real keys over DevTools.

---

## Stop at a run-time error ends only the procedure that raised it

**Build:** BETA 983
**Severity:** the program goes on running after the user asked it to stop.

A `Sub Main` that calls a procedure which raises an untrapped error, and prints a line after
the call. At the error panel, choose **Stop** --- the panel's button or the toolbar's. The
failing procedure ends, and `Main`'s following `Debug.Print` still runs. Three runs, the same
each time.

**What does not reproduce it:** **Stop** at an ordinary break (a breakpoint or a step), which
prints `aborted` and ends the whole run.

**Its worst consequence is a false pass.** At a failed `Assert` --- whose error is raised by the
assertion's own procedure --- **Stop**, and **Run → End** too, end only that procedure: the test
carries on past the failed check, and a runner in the shape `Testing-with-Assert.md` teaches then
prints `All PadLeft tests passed.` Three trials, one per button (**Ignore (Resume Next)** does the
same, as it should). Moving execution to the test's `End Sub` with **Set Next Statement** and then
choosing **Run → End** makes it an ordinary break, and the run is aborted (two trials).

**Found by** the same probe; the assertion case by the fix pass for the Assert tutorial.

---

## A `Static` declaration cannot initialise with a constructor that takes arguments

**Build:** BETA 983
**Severity:** a valid declaration does not compile; the workaround is a `Static` without an
initialiser and a `Set` on first use.

```
Private Class Dog
    Private m_Name As String
    Public Sub New(ByVal Name As String)
        m_Name = Name
    End Sub
End Class

' in a procedure:
Static s As Dog = New Dog("Rex")
```

fails with TB5074, *Could not bind to parameterized constructor of class 'Dog'. No compatible
Sub New() method found*, at the `New`.

**What does not reproduce it:** the same initialiser on `Dim` (`Dim d As Dog = New Dog("Rex")`),
and on a module-level `Private` or `Public`; a `Static` initialised with a constructor that takes
no arguments (`Static c As Collection = New Collection`); and a `Static` of a value type
(`Static n As Long = 5`). All compile and run.

**Found by** the fix pass for round 8's UC-59, measuring the forms `New.md` documents.

---

## *Import from file...* leaves the imported package unticked

**Build:** BETA 983
**Severity:** the package is imported but not referenced, and the documentation says it is.

Settings → References → Available Packages → *Import from file...*, and choose a `.twinpack`. The
compiler answers the IDE's `importPackage` request with
`success: true, body: { packageSymbol: "DocProbePkg" }`, and the package appears in the list
unticked, so nothing in the project can use it until it is ticked by hand.
`packageLoadFromFile` in `ide/main.js` reads `packageSymbol` from the response itself rather
than from its `body`, which is consistent with what is seen; that part is read, not traced.

**Found by** the package probe for round 8's UC-60, which drove the import over DevTools with
the file's path in place of the native picker.

---

## Replacing an embedded package under one Apply keeps running the old copy

**Build:** BETA 983
**Severity:** the project builds and runs the old package after the user has replaced it.

1. A project embeds a package built locally, `DocProbePkg` v1.
2. In Settings → References, untick it; *Import from file...* its v2; tick v2; apply once.
3. The console shows only `[COMPILER] Project settings updated` --- no restart and no save. Builds
   keep running v1. Save All and then a compiler restart give v2; a restart *without* saving
   brings v1 back, under a reference numbered 1.1.0.0.

Two runs of two, on a machine with no linked copy of the package.

**What does not reproduce it:** the same steps with a linked copy of the package present in
`%APPDATA%\twinBASIC\packages` (six runs of six), and an apply after the untick followed by
another after the import and tick (every run): each of those restarts the compiler and saves,
and v2 runs at once.

**Found by** the same probe.

---

## An error in the body of a generic procedure names neither the type nor the call that caused it

**Build:** BETA 983
**Severity:** a diagnostic that points at correct code. In a project with many calls to a
generic procedure, nothing says which call to fix.

```
Module GenMax
Public Function Max(Of T)(a As T, b As T) As T
    If a > b Then
        Return a
    Else
        Return b
    End If
End Function
End Module
```

With one call, `Set m = Max(Of Collection)(c1, c2)`, the project fails to compile with
`TB5092 Missing argument 'Index'`, reported twice, both times at `[3,14]` of the module that
holds `Max` --- the line with `>`. The message comes from `Collection`'s default member,
`Item`. Neither error names `Collection`, and neither names the line of the call.

**What does not reproduce it:** calls with `Long`, `Double` and `String`, deduced or given
with `(Of ...)`, which compile and return the larger value.

**Found by** probing round 9's UC-65 answer, whose `Max` uses `>` on a type parameter with
nothing to say which types it accepts.

---

## Text that continues a `Debug.Print` line is escaped twice in the DEBUG CONSOLE

**Build:** BETA 983
**Severity:** cosmetic, but it changes what a program appears to print: `&`, `<` and `>` in
the continued part of a line show as `&amp;`, `&lt;` and `&gt;`.

Two statements in a `[RunAfterBuild]` Sub are the whole reproduction:

```
Debug.Print "A";
Debug.Print "&"
```

The DEBUG CONSOLE shows `A&amp;`. The text that opens the line comes out right ---
`Debug.Print "a < b";` shows `a < b` --- and everything printed after it until the line
ends is escaped twice: after `Debug.Print "C";`, `Debug.Print "D";` and
`Debug.Print "<&>"`, the line reads `CD&lt;&amp;&gt;`.

**What does not reproduce it:** a whole line (`Debug.Print "a < b & c"` shows exactly that),
and the same text in one statement (`Debug.Print "B"; "&"` shows `B&`).

`debugOutputPartial` in `ide/main.js`, which takes all of a program's output, and an
add-in's `PrintText` too, and adds to a line that is still open, passes the new text through
`TEXTtoHTML` twice: once as it builds the text and again as it stores it. When the new
text's colour differs from the line's, the `</span><span class='...'>` it puts in to change
colour goes through the second pass too, so the tags themselves show as text. The colour
comes from the output: a program's plain output is `debugConsoleOutputText`, and a
`PrintText` is `debugConsoleOutputTextYELLOW`. With a line left open in the first, made by
calling `debugOutputPartial` from the page, a `PrintText` from the IDE's own Sample 10 add-in
showed as `</span><span class='debugConsoleOutputTextYELLOW'>Hello there from
WaynesWorldAddIn!`. A program's own open line followed by a `PrintText` was not tried.

**Observed** on 2026-09-24 with `scripts/tbrun.mjs`, which decodes the console's stored
entries once, as the pane renders them. Found while making the add-in harness read text
that the IDE appends to an open console line.

---

## An add-in's keyboard shortcut does not fire if it includes `{CTRL}` or `{ALT}`

**Build:** BETA 983
**Severity:** the SDK's own example, `{CTRL}{SHIFT}d` in `KeyboardShortcuts.Add`'s
description, cannot be used, and nothing says why.

An add-in that registers

```
Host.KeyboardShortcuts.Add "{CTRL}{SHIFT}d", AddressOf OnCtrlShiftD
Host.KeyboardShortcuts.Add "{SHIFT}d", AddressOf OnShiftD
```

gets `OnShiftD` for Shift+D, and nothing at all for Ctrl+Shift+D.

| registered | pressed | fires |
|---|---|---|
| `d`, `{SHIFT}D`, `F1`, `{shift}f1` | D, Shift+D, F1, Shift+F1 | yes |
| `{CTRL}{SHIFT}d`, `{ctrl}d`, `{ALT}f` | Ctrl+Shift+D, Ctrl+D, Alt+F, each more than 0.5 s after any other press of D or F | **no** |
| the same three | D alone, then Ctrl+D and Ctrl+Shift+D; F alone, then Alt+F, all inside 0.5 s | yes, all three |

The last row shows the cause. `globalKeyUp` in `ide/main.js` matches an add-in's shortcut when
the key is released, and only if `realKeyPresses` holds a press of the same key from less than
500 ms before. `globalKeyDown` records a press only
`if((!e.ctrlKey||e.key==="Control")&&(!e.altKey||e.key==="Alt"))`, so a key pressed with Ctrl
or Alt held is never recorded. Its release finds either no press, or an earlier one of the same
key made without the modifier. The IDE's own bindings are unaffected, because they are matched
on the key-down.

A smaller point for the same fix: `KeyboardShortcuts.Add` stores the string as given, lowercased
and without spaces, and the key-up builds the string it looks up as `{ctrl}`, `{shift}`, `{alt}`
and the key, in that order. So `{SHIFT}{CTRL}d` could never match even with the recording fixed.

**Observed** on 2026-09-24 with a probe add-in whose shortcuts print to the DEBUG CONSOLE
(`test/addin/probes/keys`), operated by `test/addin/keys.test.mjs`, which presses keys as CDP
key events and checks each result. Every case in the table is a test in that lane.

---

## F1 and the fold icon toggle the signature help, then fail

**Build:** BETA 983
**Severity:** cosmetic --- the toggle works, but every F1 adds `command failed:
"tbHelp_ToggleExpandSignatureHelp"` to the DEBUG CONSOLE, and every click on the icon throws
in the page.

1. In the code editor, put the cursor inside a call's parentheses and press Ctrl+Space. The
   signature help shows, with a fold icon whose tooltip reads *Fold/Collapse (F1)*.
2. Press F1. The signature help expands, and the DEBUG CONSOLE shows
   `command failed: "tbHelp_ToggleExpandSignatureHelp"`. F1 again collapses it, with a second
   such line.
3. Click the fold icon instead. The signature help toggles, and the page throws
   `TypeError: Cannot read properties of undefined (reading 'stopPropagation') at toggleSigHelp`.

`toggleSigHelp(e)` in `ide/main.js` ends with `e.stopPropagation();e.preventDefault()`, and
neither caller passes an event: the command is `internalAction:()=>{toggleSigHelp()}`, and the
icon is `onclick='toggleSigHelp()'`. The toggle comes first, so the error is the only symptom.
`executeKeyboardShortcuts` catches the command's error and writes the DEBUG CONSOLE line.

**Observed** on 2026-09-24: the F1 case in `test/addin/keys.test.mjs`, which checks for the
line, and the click in a harness IDE with `Runtime.exceptionThrown` recorded over CDP.

---

## Typing just after a file opens at a position puts the text at that position, in reverse

**Build:** BETA 983
**Severity:** typed text goes to the wrong place and in the wrong order, and nothing shows
that it happened.

For 700 ms after the code editor opens a file at a line and column --- Go To Definition, a
Find in Files result, an add-in's `Editors.Open` --- the IDE puts the cursor back at that
place whenever the compiler's decorations for the document arrive. Every edit brings new
decorations, and each time the cursor goes back the 700 ms start again. So typing that
starts inside the window, and goes on without a 0.7 s pause, puts each character at the
opened position, in front of the one before it.

1. Open `Haystack.twin`, not yet open, at line 4, column 9, through
   `openEditors.openFile(node, false, false, false, 4, 9)` --- the call Find in Files makes.
2. 0.3 s later, move the cursor to line 3, column 1, and type `xyz`, one key every 150 ms.
3. Line 3 starts with `x`, and line 4 reads `        zyDim needleCount As Long`.

`parseDocumentDecorations` in `ide/main.js` ends with
`if(performance.now()-revealedLineTime<700){revealLineInEditor(revealedLine,revealedLineColumn,revealedLineViewPortTop)}`,
and `revealLineInEditor` sets the cursor's position and `revealedLineTime` again. Logged in the
run above: `revealLineInEditor(4,9)` from `gotFileData`, then from `parseDocumentDecorations`
9 ms later, and again after each key. The same happens for a file that is already open, whose
`onReveal` calls `revealLineInEditor` too.

**What does not reproduce it:** the same typing started more than 0.7 s after the file opened,
which puts `xyz` at 3:1 in order. Keeping the view where the reveal left it may be what the
repeat is for; setting the cursor again is what does the damage.

**Found by** the add-in harness: `MsgBox(`, typed into the code editor just after opening a
file at line 5, came out as `gBox(s` at the start of that line, with the `M` on the line below. The harness now waits for the 700 ms to pass after
opening a file (`afterReveal` in `scripts/lib/tb-operate.mjs`).

---

## Hover says a `ByVal` parameter was auto-generated because `Option Explicit` is off

**Build:** BETA 983
**Severity:** cosmetic, but it tells the user to turn on an option that is already on, over
a parameter they declared.

In a project with `project.optionExplicit` set to true:

```
Public Sub Probe2(ByVal h As Host, ByVal count As Long, ByVal col As Collection, _
                  ByVal o As Object, ByVal v As Variant, ByRef r As Host, ByVal s As String)
    Dim d As Host
    Debug.Print h Is Nothing, count, col Is Nothing, o Is Nothing, IsEmpty(v), r Is Nothing, s, d Is Nothing
End Sub
```

Hover over `s` where it is used shows

> *parameter* ByVal s As String
>
> ***note:*** *this variable was auto-generated due to* ***Option Explicit*** *being Off*
>
> ***recommendation:*** *use Option Explicit and declare variables explicitly*

| hovered | note |
|---|---|
| `ByVal` of `String`, `Variant`, `Object`, `Collection` or tbIDE's `Host` | **yes** |
| `ByVal` of `Long` | no |
| `ByRef r As Host` | no |
| a local, `Dim d As Host` or `Dim c As New Collection` | no |

So it takes `ByVal` and a type that is not a plain number. That looks like a hidden local copy
that the compiler makes for such a parameter, which the hover then describes as a variable it
generated for an undeclared name.

**Observed** on 2026-09-24 by sending `textDocument/hover` over the compiler's language socket
with the parameters the IDE's own hover provider sends (`test/addin/symbols.test.mjs`, which
checks every row of the table). The text is the markdown the IDE's hover shows.

---

## Every tool window given no id is the same window

**Build:** BETA 983
**Severity:** an add-in's windows overwrite each other, or another add-in's, and nothing
says so. The id is declared `Optional`, so leaving it out looks correct.

```
Set w1 = Host.ToolWindows.Add("First")
w1.Title = "First"
w1.RootDomElement.ChildDomElements.Add("one", "div").Properties.innerText = "first"
w1.Visible = True
Set w2 = Host.ToolWindows.Add("Second")
w2.Title = "Second"
w2.RootDomElement.ChildDomElements.Add("two", "div").Properties.innerText = "second"
w2.Visible = True
```

shows one window, titled `Second` and holding `second` alone. What is then added through
`w1` goes into that same window.

`createToolWindow` in `ide/main.js` files each window under `e.guid`, which is the
`UniqueIdForPositionPersistance` argument, and `""` when it is left out.
`createToolWindowById(e)` returns the window it already has under that id, after
`n.bodyElement.innerHTML=""`, instead of making another, and the page answers the compiler
with that window's number, so both `ToolWindow` objects are bound to it. The same reuse is
what hands an add-in its own window back after a compiler restart, when it asks again for
the id it used before (`test/addin/reload.test.mjs`), so a fix would give each window without
an id one of its own rather than change the reuse.

**What does not reproduce it:** a window given an id, or one window given none. None of the
IDE's add-in samples leaves the id out.

**Observed** on 2026-09-25 with the panes probe's third button, operated by
`test/addin/panes.test.mjs`, which reads `toolWindowsById` over CDP.
