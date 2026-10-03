Filed as [twinbasic/twinbasic#2448](https://github.com/twinbasic/twinbasic/issues/2448).

## Hover says a `ByVal` parameter was auto-generated because `Option Explicit` is off

**Describe the bug**
In a project with `Option Explicit` on, hovering over a `ByVal` parameter of type `String`, `Variant`, `Object`, a class or tbIDE's `Host` shows a note that the variable was auto-generated because `Option Explicit` is off, and recommends turning it on. The option is on, and the parameter was declared by the user.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `hover-byval-option-explicit.twinproj` (attached as `hover-byval-option-explicit.zip`) and open `Symbols.twin`. `project.optionExplicit` is true in its `Settings`. The file holds:
   ```
   Public Sub Probe2(ByVal h As Host, ByVal count As Long, ByVal col As Collection, _
                     ByVal o As Object, ByVal v As Variant, ByRef r As Host, ByVal s As String)
       Dim d As Host
       Debug.Print h Is Nothing, count, col Is Nothing, o Is Nothing, IsEmpty(v), r Is Nothing, s, d Is Nothing
   End Sub
   ```
2. Hover over `s` where `Debug.Print` uses it.
3. The hover shows:

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

**Expected behavior**
No note on any of them: `Option Explicit` is on and every one of these names is declared.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: cosmetic, but it tells the user to turn on an option that is already on, over a parameter they declared.

So it takes `ByVal` and a type that is not a plain number. That looks like a hidden local copy that the compiler makes for such a parameter, which the hover then describes as a variable it generated for an undeclared name.

This was measured by sending `textDocument/hover` over the compiler's language socket, with the parameters the IDE's own hover provider sends; the text above is the markdown that request returns, which is what the IDE's hover shows. The tooltip itself was not looked at in this run.

<!-- Asserted by `addin-test.bat --only symbols` (test/addin/symbols.test.mjs, "hover says a ByVal parameter of String, Variant, Object or a class was made because Option Explicit is off, which it is not"), which checks every row of the table; passes on BETA 995 (observed first on 2026-09-24). The reproducer is test/addin/probes/symbols reduced to Probe2 and its Settings; the lane's own project also holds the procedures the other hover tests ask about. When fixed: update that test and P5 in WIP.HelpAddin.md. -->
