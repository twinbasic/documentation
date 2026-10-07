Filed as [twinbasic/twinbasic#2488](https://github.com/twinbasic/twinbasic/issues/2488).

## `IConnectionPoint.Advise(Nothing)` on a twinBASIC class's connection point ends in an access violation

**Describe the bug**
A class that declares an `Event` is a connectable object, and its connection point is reached through `IConnectionPointContainer`. Calling `Advise` on that connection point with a null sink raises a native `ACCESS_VIOLATION` and ends the run, instead of returning an error. It is the same crash whether the argument is `Nothing` or an unassigned `stdole.IUnknown` variable.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `advise-nothing-crashes.twinproj` (attached as `advise-nothing-crashes.zip`). Its one source file, `Startup.twin`, declares the project's own copies of `IConnectionPointContainer`, `IEnumConnectionPoints` and `IConnectionPoint` (`stdole` has none of them), a class with one event, and this:
   ```
   Private Class Source
       Public Event Ping()
   End Class

   Public Sub Main()
       Dim src As New Source
       Dim container As IConnectionPointContainer = src
       Dim points As IEnumConnectionPoints = container.EnumConnectionPoints()
       Dim point As IConnectionPoint, fetched As Long
       points.Next 1, point, fetched
       Debug.Print "before"
       Dim cookie As Long = point.Advise(Nothing)
       Debug.Print "after " & cookie
   End Sub
   ```
2. Run the project in the IDE (F5).
3. See `before` in the DEBUG CONSOLE, and then `NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main LINE 000033 [...twinBASIC_win32.dll+00389F3E]`. `after` is never printed.

**Expected behavior**
`Advise` returns `E_POINTER`, which twinBASIC raises as run-time error `&H80004003` that `On Error` can handle. The Windows SDK page for [IConnectionPoint::Advise](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nf-ocidl-iconnectionpoint-advise) lists `E_POINTER` for "The value in *pUnkSink* or *pdwCookie* is not valid. For example, either pointer may be **NULL**."

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low in practice, since a program rarely advises a null sink, but a COM client written in any language can send one, and the connection point crashes the process that hosts the class instead of refusing the call.

What was tried: an object that is not a sink gives an ordinary error (`E_NOINTERFACE`, `&H80004002`), so only a null pointer crashes. The address of the crash is the same in the standalone probe and in this project.

VB6 crashes too. The same call on the connection point of a VB6 class with an event, made through `DispCallFunc` (the VB6 project is attached as `advise-nothing-crashes-vb6.zip`), ends the exe with an access violation (`0xC0000005` in `MSVBVM60.DLL`, in the Application event log) after it writes `before`. A fix therefore costs no compatibility: no program depends on the crash.

<!-- Reproducer: bugs/advise-nothing-crashes/ (mode run, expects tbrun exit 5, the output `before` and the native exception); verified on 995. VB6 side in bugs/advise-nothing-crashes/vb6/ (VB6 6.0): out.txt ends at `before`, and `vb6` reports the crash. Stated in docs/Reference/COM-Interfaces/IConnectionPoint.md, section Advise, the last bullet of "In twinBASIC" and the WARNING after it, which names BETA 995 ("Advise with Nothing as the sink ends the program with an access violation"): when fixed, remove the WARNING, state what error it raises, and add Nothing to the example if it fits. -->
