Filed as [twinbasic/twinbasic#2522](https://github.com/twinbasic/twinbasic/issues/2522).

## A variable declared as the class of an ActiveX control cannot hold the control: `Set` raises *No such interface supported*, and every member of a `Dim ... As New` variable raises error 91

**Describe the bug**
An object variable whose declared type is the class of an ActiveX control, such as `MSScriptControl.ScriptControl`, never receives the object. `Set sc = New MSScriptControl.ScriptControl` and `Set sc = CreateObject("MSScriptControl.ScriptControl")` raise error -2147467262, *No such interface supported* (E_NOINTERFACE). `Dim sc As New MSScriptControl.ScriptControl` raises nothing at the declaration, `TypeName(sc)` is `ScriptControl` and `sc Is Nothing` is False, and then the first member that is used raises error 91, *Object variable or With block variable not set*. The control itself is created and has its interface: the same `New` and `CreateObject` give a working object when the variable is declared `As Object` or `As MSScriptControl.IScriptControl`, the control's default interface. The same happens with the Winsock and Common Dialog controls. The classes of libraries that are not controls (`Scripting.Dictionary`, `ADODB.Connection`) are not affected. VB6 creates every one of these. Observed in the IDE, with the error of each statement written to the DEBUG CONSOLE.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `activex-control-class-variable.twinproj` (attached as `activex-control-class-variable.zip`). It references Microsoft Script Control 1.0, Microsoft Winsock Control 6.0, Microsoft Common Dialog Control 6.0, Microsoft Scripting Runtime and ADO 2.8 (all 32-bit, so the project's target stays win32), and its module `Startup` runs 21 statements with a line after each that writes the error. Four of them:
   ```
   Dim sc As New MSScriptControl.ScriptControl
   sc.Language = "JScript"                                  ' error 91
   Dim sc2 As MSScriptControl.ScriptControl
   Set sc2 = New MSScriptControl.ScriptControl              ' -2147467262, No such interface supported
   Dim o As Object
   Set o = New MSScriptControl.ScriptControl                ' no error
   Dim i As MSScriptControl.IScriptControl
   Set i = New MSScriptControl.ScriptControl                ' no error, and i.Eval("1 + 2") is 3
   ```
2. Run the project in the IDE (F5) and read the DEBUG CONSOLE.
3. See, for the statements of the project (each is one line in the console, with its error number and text):

   | statement | twinBASIC | VB6 |
   |---|---|---|
   | `Dim sc As New ScriptControl`, then `sc.Language = "JScript"` or `sc.Eval("1 + 2")` | 91 | no error, `Eval` is 3 |
   | `Private ModuleSc As New ScriptControl` at module level, then `ModuleSc.Language = ...` | 91 | no error |
   | `Public Sc As New ScriptControl` as a class field, then `h.Sc.Language = ...` | 91 | no error |
   | `Set sc = New ScriptControl`, `sc` declared `As ScriptControl` | -2147467262, No such interface supported | no error |
   | `Set sc = CreateObject("MSScriptControl.ScriptControl")`, `sc` declared `As ScriptControl` | -2147467262 | no error |
   | `Set sc = o`, `o` an **Object** holding the control, `sc` declared `As ScriptControl` | -2147467262 | no error |
   | `Set o = New ScriptControl`, and `Set o = CreateObject(...)`, `o` declared `As Object` | no error, `o.Eval("1 + 2")` is 3 | the same |
   | `Set i = New ScriptControl`, `i` declared `As IScriptControl` | no error, `i.Eval("1 + 2")` is 3 | the same |
   | `Set w = New MSWinsockLib.Winsock`, `w` declared `As Winsock`; the same with `MSComDlg.CommonDialog` | -2147467262 | no error |
   | `Dim wa As New MSWinsockLib.Winsock`, then `wa.LocalPort` | 91 | no error |
   | the same two classes, the variable declared `As Object` | no error | no error |
   | `Dim d As New Scripting.Dictionary`, `Dim c As New ADODB.Connection`, then a member | no error | no error |

   VB6 is the same statements (attached as `activex-control-class-variable-vb6.zip`, which writes each result to `out.txt`).

What decides it, each tried in the project above:
- The variable's declared type decides: a class that is an ActiveX control (the coclass has the `control` flag in its type library), as a variable's type, fails; `Object`, the default interface and a class that is not a control work. `Dim x As MSScriptControl.DScriptControlSource`, the events interface the class lists beside its default one, fails with the same error on `Set x = o`.
- `New` and `CreateObject` make no difference: `Set o = New ...` and `Set o = CreateObject(...)` both work for an `Object`.
- `Dim ... As New` hides the failure until a member is used; `Set` reports it at the statement. `TypeName` and `Is Nothing` do not show it.
- A built exe gives the same results as a run in the IDE (the statements written with `TbRun.Out` in a scratch copy).
- `Dim j As New MSScriptControl.IScriptControl` is refused with TB5121, *Unable to create instance of type 'IScriptControl'*, so the interface type is usable with `Set` only.

**Expected behavior**
A variable declared as the class of an ActiveX control holds the control, as in VB6: `Set sc = New MSScriptControl.ScriptControl` and `Dim sc As New MSScriptControl.ScriptControl` give a usable object, and `sc.Eval("1 + 2")` is 3.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997, 995 and 957. The type libraries of the failing classes list two implemented interfaces flagged `default`: the dual interface (`IScriptControl`) and, flagged `default` and `source`, the events dispinterface (`DScriptControlSource`). `ADODB.Connection` lists the same pair and works, so the pair alone does not explain it; the three classes that fail are flagged `control` in their type libraries, and the two that work are not.

Not tried: a control that is registered for 64-bit, and a form that hosts the control (a variable of the control's class on a form is the usual use).

Severity: medium. A visible error is raised, never a wrong value, but it is raised at the first use with a message that points at an object that was never set, and a VB6 program that holds an ActiveX control's class in a typed variable, or declares one `As New`, must be changed to `As Object` or to the interface. The contributed package TBMANLIB 1.0.0.5 does this for the Script Control (`Dim MSSC As New MSScriptControl.ScriptControl`), and both functions of its **ToolsJScript** module fail with error 91 for that reason.

<!-- Reproducer: bugs/activex-control-class-variable/ (mode run: `Sub Main` prints 21 lines with Debug.Print; expect is exit 0 and the 17 lines of the failing and working statements; verify reproduces on BETA 1005, 997, 995 and 957). VB6 side in vb6/ (VB6 6.0; a project with a class module, `Holder.cls`, and references to the five libraries): `bug_repro.mjs vb6` prints the VB6 column. The exe run, the `IScriptControl` and `DScriptControlSource` variables and the `Dim ... As New IScriptControl` refusal were run in scratch copies, not kept. Found documenting the contributed package TBMANLIB: docs/Reference/Contributed/TBMANLIB/ToolsJScript.md carries a NOTE naming BETA 1005 for it, and docs/Reference/Contributed/TBMANLIB/ToolsDic.md (ToWwwFormUrlencoded, which uses NewArr) and index.md ("Defects of version 1.0.0.5") state the failures that follow from it, without a callout: when fixed, correct the three, which assume that the control cannot be created (the package's `NewObj` still assigns to the name of the other function, as its page says). -->
