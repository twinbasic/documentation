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

## Compiler crashes on an `Interface` whose name and base are both angle-bracket placeholders

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

**Neither half reproduces it on its own**, which is what makes it worth reporting rather
than shrugging at:

| source | result |
|---|---|
| `Interface <name>` + `End Interface` | TB5182 Syntax error, no crash |
| `Interface IFoo Extends <base-interface>` + `End Interface` | TB5182 + TB5079 + TB5127, no crash |
| `Interface <name> Extends <base-interface>` + `End Interface` | **crash** |

So it takes a placeholder in *both* positions. The input is not real code --- it is a
syntax skeleton, the shape `docs/Reference/Attributes.md` uses to show where an attribute
goes --- but a parser meeting nonsense should diagnose it, and this one dereferences
something instead.

**Found by** pointing `scripts/check_examples.mjs` at the documentation's own code samples;
the skeleton is one of the 1,124 `tb` fences under `docs/`. A crash in a batch of samples
costs the whole batch its result, which is why that tool bisects on exit code 4.

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
