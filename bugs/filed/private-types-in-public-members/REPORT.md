Filed as [twinbasic/twinbasic#2454](https://github.com/twinbasic/twinbasic/issues/2454).

## Public members are typed with Private components, so a default project cannot use them

**Describe the bug**
Public members of the compiler packages are typed with `Private` classes, and `Public Enum`s sit inside `Private Module`s, so a project that references a package the ordinary way cannot name the types its documented members take. `VB.Report` shows it most sharply, because the compiler names the type in one diagnostic and rejects it in the next. Handling a documented public event requires opting into the package's private half by setting the library symbol to `*VB`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `private-types-in-public-members.twinproj` (attached as `private-types-in-public-members.zip`). It references the VB package the ordinary way, and its one source file, `ProbeReport.twin`, holds the whole bug:
   ```
   Class ProbeReport
       Private WithEvents rpt As VB.Report
       Private Sub rpt_BeforePaintSection(ByVal Section As VB.ControlsSection)
       End Sub
   End Class
   ```
2. See two errors:
   ```
   TB5018 unable to match this handler to its event member. The expected signature was:
          Private Sub rpt_BeforePaintSection(ByVal Section As ControlsSection)
   TB5079 Unrecognized datatype symbol 'ControlsSection'
   ```
3. Set the VB reference's library symbol to `*VB` and compile again: the handler compiles exactly as written.

`BeforePaintSection` is a public event whose parameter type is `Private Class ControlsSection` (`VB/Sources/SUPPORT/ControlsSection.twin:4`). The other spellings are worse than useless: `ByVal Section As Object` binds and compiles, while `Variant`, the bare name, and omitting the parameter all fail.

**The CustomControls package has the same shape across its whole style surface.** Every class in `CustomControlsPackage/Sources/zTemporarySupport.twin` is `Private` (`Corner`, `Corners`, `Padding`, `FillColorPoint`, `FillColorPoints`, `Border`, `Borders`, `Line`, `Fill`, `TextRendering`, `Anchors`, `WindowsFormOptions` and the per-control `...State` classes), while the members that hand them out are public:

| member | declared | what a default project can do |
|---|---|---|
| `Borders.Elements` | `Public WithEvents Elements() As Border` | read it; assigning needs a `Border()` it cannot declare |
| `FillColorPoints.Values` | `Public WithEvents Values() As FillColorPoint` | the same |
| `TextRendering.Outlines` | an array of `Border` | the same, and with no `SetSimpleBorder` equivalent to fall back on |
| `Canvas.RuntimeUICCCanvasAddElement` | `(ByVal Me As Canvas, ByRef ElementDescriptor As Any)` | pass a record it declares itself, with the style members left `Nothing` |

With `*CustomControlsPackage`, all of it works under the package qualifier: `New CustomControlsPackage.Border`, `Dim elems(0 To 2) As CustomControlsPackage.Border`, `Dim descriptor As CustomControlsPackage.ElementDescriptor`, and a complete `ICustomControl` implementation that sets `BackgroundFill` and `TextRenderingOptions` from `New CustomControlsPackage.Fill` / `.TextRendering`. Both `CustomControlsPackage.ElementDescriptor` and `CustomControlsPackage.UDTs.ElementDescriptor` resolve, although the UDT is declared `Public Type` inside `Private Class UDTs`.

**Two more packages have the same shape.** In both, a `Public Enum` sits inside a `Private Module`, so a consumer can name neither the enum nor its members, and both enums are the argument type of a documented, public member:

| package | declaration | what a default project cannot write |
|---|---|---|
| WinNativeCommonCtls | `Private Module ImageListConsts` then `Public Enum ImlDrawConstants` | `ImageList1.ListImages(1).Draw hDC, x, y, ImlDrawTransparent Or ImlDrawFocus` |
| cefPackage | `Private Module _cef_log_severity_t` then `Enum CefLogSeverity` | `CefBrowser1.EnvironmentOptions.LogSeverity = CefLogWarning` |

Neither the bare member (`ImlDrawTransparent`), the enum name (`ImlDrawConstants.…`), nor the owning control as a qualifier (`ImageList.ImlDrawConstants.…`) resolves: all three are `TB5079 Unrecognized symbol`. The asterisk works here too: with the library symbol set to `*WinNativeCommonCtls`, `WinNativeCommonCtls.ImlDrawTransparent` compiles. The VB package has it from a different direction as well: the enums nested inside a control class, `MultiFrameDirectionConstants` in `MultiFrame` and `QRCodegenEccConstants` in `QRCode`, are equally unreachable, so `mfPanels.Direction = vbDirectionHorizontal` does not compile although it is what the property's own documentation says to write.

**Expected behavior**
A type that appears in the signature of a public member is itself public, so a default project can write the handler, declare the `Border()`, and pass the enum, without importing the package's private half. If the types are meant to be internal, the members that hand them out should not be public.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
The reproducer holds the `VB.Report` case; the CustomControls, WinNativeCommonCtls, cefPackage and MultiFrame / QRCode cases above need packages the reproducer does not reference, and were each measured on BETA 995. The VB.Report case reproduces identically on BETA 983. Severity: documented APIs need the consumer to expose the package's internals, and one event asks for a type it then refuses. The asterisk is a workaround, not a fix.

This reads as an oversight rather than a policy. The file is called `zTemporarySupport.twin`, and the package's own changelog dates the narrowing: "v0.0.5.0, 15th September 2022 --- improved: made changes to ensure nothing within the package is being exposed unnecessarily." Reducing the surface is reasonable; what it missed is that these particular classes are not internal. They appear in the signatures of members that stayed public, so every consumer of those members is now required to import the package with an asterisk and qualify names that the package's own controls write bare.

It went unnoticed because none of the 32 sample projects the IDE ships exercises any of this from code. Exported and grepped, all of them: `ControlsSection` appears only as a designer `_className` in the two `.tbreport` files and no sample handles `BeforePaintSection`; `ElementDescriptor`, `ICustomControl`, `ICustomForm` and `RuntimeUICC*` appear nowhere at all; `Border` appears 971 times, every one a designer `_className` in a `.tbform`. No sample line sets `NormalState`, `HoverState` or any `.Fill.` from code.

<!-- Reproducer: bugs/private-types-in-public-members/ (mode compile, expects TB5018 and TB5079); verified on 995 and 983. Found by scripts/check_examples.mjs, which compiles the documentation's own code samples: the pages documenting `New Border`, `Dim descriptor As ElementDescriptor` and a `ControlsSection` handler were written from the packages' sources and none compiled in a default project. The checker's private-library templates (test/example-projects/vb-private, cc-private, cef-private, wnc-private) are the asterisk workaround; when the types become public, drop the templates and the notes in the docs that tell a reader to use the asterisk (the WinNativeCommonCtls ImageList pages, the CustomControls and CEF pages, VB MultiFrame and QRCode). -->
