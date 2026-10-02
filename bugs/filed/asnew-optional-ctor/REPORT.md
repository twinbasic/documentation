Filed as [twinbasic/twinbasic#2459](https://github.com/twinbasic/twinbasic/issues/2459).

## `As New` refuses a class whose only constructor has all-`Optional` arguments

**Describe the bug**
`Dim x As New C` fails with TB5121 when the only constructor of `C` has nothing but `Optional` arguments, so it can be called with none. The same class passes TB5135, the check for COM exposure: it compiles as a public class without `[COMCreatable(False)]`, so that check counts the constructor as one that takes no arguments. The two checks for "can this class be created without arguments" disagree.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `asnew-optional-ctor.twinproj` (attached as `asnew-optional-ctor.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   Class COpt
       Public V As Long
       Public Sub New(Optional ByVal n As Long = 3)
           V = n
       End Sub
   End Class
   
   Module Probe
       Public Sub T()
           Dim x As New COpt
           Debug.Print x.V
       End Sub
   End Module
   ```
2. See the project fail to compile, on the `Dim`, with `TB5121 can't use this type with As-New syntax as it doesn't have a parameterless constructor`.

What does not reproduce it: a class with a `Class_Initialize` beside a `Sub New` that takes a required argument, or with a second `Sub New` with no parameters, is accepted. A class whose only `Sub New` takes a required argument is refused, `Private` or `[COMCreatable(False)]` alike, which is the diagnostic working as intended.

**Expected behavior**
The project compiles, and `x.V` prints `3`, as it does on BETA 983. A constructor whose arguments are all `Optional` can be called without arguments, which is what `As New` needs.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 accepts the reproducer and runs it. TB5121 is the diagnostic BETA 993's notes describe ("classes with [COMCreatable(False)] set on them cannot be used as an As-New datatype"), corrected in 995. Severity: code that compiled before BETA 993 stops compiling.

<!-- Reproducer: bugs/asnew-optional-ctor/ (mode compile, expects TB5121); on 983 it compiles clean, so verify there reports NO LONGER REPRODUCES, as it should. Observed on 2026-10-01 with compile probes through tbbuild, each case a project of its own, on BETA 995 and BETA 983; the run on 983 was a compiled EXE through tbrun. docs/Reference/Core/New.md states that a class whose only Sub New takes arguments, even if every argument is Optional, fails As New with TB5121; when this is fixed, that sentence is wrong for the Optional case. -->
