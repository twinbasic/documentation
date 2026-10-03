Filed as [twinbasic/twinbasic#2455](https://github.com/twinbasic/twinbasic/issues/2455).

## `Err.Raise` rejects `HelpContext` as a named argument, while its three siblings work

**Describe the bug**
`Err.Raise` accepts `Source:=`, `Description:=` and `HelpFile:=` as named arguments, but not `HelpContext:=`. The error is `TB5090 unrecognized named argument`, and it does not say which name was wrong.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `err-raise-helpcontext.twinproj` (attached as `err-raise-helpcontext.zip`). Its one source file, `Probe.twin`, holds the whole bug:
   ```
   Dim myHelpFile As String, myHelpContext As Long
   Err.Raise vbObjectError + 894, Source:="MyApp.MyClass", _
             Description:="Was not able to complete your task", _
             HelpFile:=myHelpFile, HelpContext:=myHelpContext
   ```
2. See the project fail to compile with `TB5090 unrecognized named argument`.

What does work, each verified on its own: the same call with `Source:=`, `Description:=` and `HelpFile:=` named and the fifth argument dropped compiles, and so does the fully positional form `Err.Raise vbObjectError + 894, myObjectID, "...", myHelpFile, myHelpContext`. So the parameter exists and accepts a `Long`; only its name is unrecognised. `HelpContextID:=` is rejected as well, so this is not simply a different spelling to discover, and the compiler binary's only `HelpContextID` strings belong to project settings, not to a signature.

**Expected behavior**
The call compiles. `HelpContext` is what VBA itself names that parameter. Read out of the VBA type library on the machine this was found on (`VBE7.DLL` 7.01.1158, VBA7.1, via `LoadTypeLibEx` and `ITypeInfo::GetNames` on `_ErrObject`), the method is `Raise(Number, Source, Description, HelpFile, HelpContext)`. All five names are exactly the ones the failing call uses, and the call is Microsoft's own `Err.Source` example, named arguments and all, so the code twinBASIC rejects is the code a VBA developer is most likely to have copied. Four of the five names are accepted here; only the fifth is not.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, with the same TB5090. Severity: VBA-compatible code that names the fifth argument does not compile, and the diagnostic does not say which name was wrong.

<!-- Reproducer: bugs/err-raise-helpcontext/ (mode compile, expects TB5090); verified on 995 and 983. Found by scripts/check_examples.mjs over Reference/Default/VBA/ErrObject/Source.md, whose sample was written in the named form; the page uses the positional form now. When fixed, the page can show the named form again. -->
