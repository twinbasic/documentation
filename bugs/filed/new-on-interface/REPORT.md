Filed as [twinbasic/twinbasic#2486](https://github.com/twinbasic/twinbasic/issues/2486).

## `New` on an `Interface` compiles, and a call on the object returns a default value, or ends in an access violation for an inherited member

**Describe the bug**
`New` is accepted on an `Interface`, although no class exists for it, and the statement returns an object that is not `Nothing` and has no implementation behind its members. A call on a member the interface declares itself returns the default for its type (0 for a `Long`, an empty string, `Nothing` for an interface) and raises no error. A call on a member the interface inherits from another `Interface` ends the run with a native `ACCESS_VIOLATION`. `New stdole.IUnknown` and `New stdole.IDispatch` are refused with TB5074 (*Class construction expected class datatype*), so the check exists for an interface from a type library, and is missing for one declared in twinBASIC source, in a project or a package. Observed in a run of the reproducer project; found with `ErrorContext` of the VBRUN package, an interface with no class, and `ErrorCallstack` does the same.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `new-on-interface.twinproj` (attached as `new-on-interface.zip`). Its one source file, `Startup.twin`, declares `Interface IParent` with one `Function F() As Long` and `Interface IChild Extends IParent` with one `Function G() As Long`, and a `Sub Main` that constructs `New IParent`, `New ErrorContext` and `New IChild` and calls their members.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   IParent: Nothing? False, F() = 0
   ErrorContext: Unknown, Number = 0, Callstack Nothing? True
   IChild.G() = 0
   IChild.F(), inherited, next
   NATIVE EXCEPTION: ACCESS_VIOLATION /Startup.twin; Startup.Main LINE 000029 [$00000000]
   ```
   The project compiles without a diagnostic. `ObjPtr` of each object is not 0. `ErrorContext.Number` and `.State` read 0, `.Description` and `.Source` read an empty string, and `.Callstack` is `Nothing`, so `e.Callstack.Count` raises error 91, as any call on `Nothing` does. That error 91 is not a second defect: an unhandled one ends a run, as it does for a `Collection` variable that is `Nothing`, and under `On Error Resume Next` it skips the statement.

**Expected behavior**
A compile error, TB5074, for `New` on any `Interface`, as for `stdole.IUnknown`: an interface is a contract, and `New` needs a class that implements it. If an object is built nevertheless, a call on any of its members should behave the same way, not return a default for one member and crash on another. Code written against the VBRUN documentation, which lists `ErrorContext` with its members, compiles and then reads zeros, where a refusal would say at once that nothing can create the object.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low in practice, since few programs write `New` on an interface, but it is a compile-time check that is missing, and the result is a silent wrong value or a crash.

What was tried, each in a project of its own: `New` is accepted on an interface declared with `Extends stdole.IUnknown`, with no `Extends`, with `Extends stdole.IDispatch`, with `Extends` another interface of the project, and on a `Private` one, and `Dim x As New IFoo` is accepted as well. `TypeName` gives `Unknown` for an interface that extends `stdole.IUnknown` (and for `ErrorContext` and `ErrorCallstack`), and the interface's own name for one with no `Extends` or with `Extends stdole.IDispatch`. A `String` member returns an empty string, a `Property Get` returns 0, a `Sub` returns without a sign, and a member returning the interface itself returns `Nothing`. Only inherited members crash. `New stdole.IUnknown` and `New stdole.IDispatch` are refused. The same results on BETA 983.

VB6 has no comparison: a project cannot declare an `Interface`, and the interfaces of the type libraries it references (`stdole.IUnknown`, `IPictureDisp`, `IFontDisp`) are hidden from it (*User-defined type not defined*).

<!-- Reproducer: bugs/new-on-interface/ (mode run, expects tbrun exit 5, the four lines above and the native exception); verified on 995. Probes from the narrowing are local scratch files, not in the repository. docs/Reference/Default/VBRUN/ErrorContext/index.md, ErrorCallstack/index.md and ErrorStackFrame/index.md carry a NOTE that no code can obtain these objects in BETA 995 ("code that uses them compiles, but nothing returns an object that implements them"); when this is fixed, check that wording, since `New` on them compiles today and returns an object that has no implementation. -->
