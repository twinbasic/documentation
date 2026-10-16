Filed as [twinbasic/twinbasic#2521](https://github.com/twinbasic/twinbasic/issues/2521).

## `QueryInterface` of an object of a twinBASIC class returns E_NOINTERFACE and leaves its out pointer as it was, where COM sets it to NULL

**Describe the bug**
`IUnknown::QueryInterface`, called through slot 0 of the vtable of an object of a class that twinBASIC compiles (a class of the project, a form, a control), asks for an interface the object does not have and returns `E_NOINTERFACE` (`&H80004002`), but leaves the out pointer, `*ppvObject`, as it was. The COM contract is that the method sets `*ppvObject` to NULL when it fails. A variable set to 12345 before the call is still 12345 after it. Observed in the DEBUG CONSOLE, by calling slot 0 through an interface that the project declares, and again with `DispCallFunc` on the object's own pointer.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `queryinterface-leaves-out-pointer.twinproj` (attached as `queryinterface-leaves-out-pointer.zip`). Its module `Startup` asks seven objects for an interface that none of them has, and sets the out variable to 12345 before each call.
2. Press F5. Each object is asked twice: through `IRawUnknown`, an interface of the project that has `IUnknown`'s interface identifier and `Extends Nothing`, so that its first method is slot 0 and `[PreserveSig]` returns the raw HRESULT; and with `DispCallFunc`, calling slot 0 of the pointer that `ObjPtr` gives for the `Object` variable.
3. See the DEBUG CONSOLE. For `Plain`, `Implementer` (a class that implements an interface), `Form1` and `CommandButton` (a control added to the form with `Controls.Add`), both calls return `E_NOINTERFACE` and leave `out=12345`. Here is the line for `Plain`, and the line for the `Collection`, which sets the variable to 0 as COM requires:

```
Plain: missing interface: hr=80004002 out=12345; with DispCallFunc: hr=80004002 out=12345; IUnknown: hr=0 out is a pointer=True; IDispatch: hr=0 out is a pointer=True
Collection: missing interface: hr=80004002 out=0; with DispCallFunc: hr=80004002 out=0; IUnknown: hr=0 out is a pointer=True; IDispatch: hr=0 out is a pointer=True
```

The narrowed reproduction is that project cut down to one object and one call:
```vb
[InterfaceId("00000000-0000-0000-C000-000000000046")]
Private Interface IMin Extends Nothing
    [PreserveSig]
    Function QueryInterface(ByVal priid As LongPtr, ByRef ppvObject As LongPtr) As Long
End Interface

Private Class Plain
    Public Value As Long
End Class

Module Startup

    Private Type Guid128
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type

    Public Sub Main()
        Dim u As IMin = New Plain
        Dim iid As Guid128          ' an interface that Plain does not have
        iid.Data1 = &H12345
        Dim p As LongPtr = 12345
        Dim hr As Long = u.QueryInterface(VarPtr(iid), p)
        Debug.Print Hex$(hr), p     ' prints 80004002 and 12345; COM requires 0
    End Sub

End Module
```

**Expected behavior**
`*ppvObject` is 0 after every call that fails, so that every line of the output shows `out=0` in place of `out=12345`, as the line for the `Collection` does. The Windows documentation of `IUnknown::QueryInterface` says that `*ppvObject` is set to NULL when the object does not support the interface. VB6 does it for its own classes: its `Class` instance, `Collection`, `Err` and a `Scripting.Dictionary` all return `E_NOINTERFACE` and set the variable to 0 (the VB6 project is attached as `queryinterface-leaves-out-pointer-vb6.zip`; it calls slot 0 with `DispCallFunc`, as VB6 cannot declare the interface).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
Which objects: the pointer is left as it was for an object of a class that twinBASIC compiles: a plain class, a class that implements an interface of the project, a form, the VB package's `CommandButton`, and (in another project, not attached) the `WebView2` control on a form. It is set to 0, correctly, for the objects of the runtime library: `Collection` and `Err` in the attached project, and `App`, `Screen` and a form's `Controls` in the other. A `Scripting.Dictionary` from the Scripting Runtime library sets it to 0 too.

What does not reproduce it: asking for an interface the object has. `IUnknown` and `IDispatch` return `S_OK` and write a new pointer, for every object above (the `IUnknown` and `IDispatch` columns of the output). The result is the same through the project's own interface and through `DispCallFunc`, so it is not a side effect of the declaration, and the same in a 32-bit and a 64-bit run.

Severity: low. The failure is reported, by the HRESULT, so a caller that tests it is not affected. A caller that tests the pointer instead, as a C or C++ client may, sees the value it passed in. When the variable is reused after an earlier successful call, that value is a pointer the caller has released.

<!-- Reproducer: bugs/queryinterface-leaves-out-pointer/ (mode run: expect lists the four lines of classes that twinBASIC compiles with out=12345 and the three runtime lines with out=0); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too (the IDE's own run; not as a built exe, where Debug.Print writes nothing). VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`. The narrowed module above was run on its own in a scratch project (output `80004002       12345`); the interface needs only the interface identifier of IUnknown, Extends Nothing and a [PreserveSig] first method (no [OleAutomation(False)], no AddRef or Release). Pages: docs/Reference/Contributed/OLEGuids/IUnknownUnrestricted.md carries a NOTE for it after its QueryInterface section (its check_run sample uses a Collection, which sets the variable to 0, so it does not show the defect), and docs/Reference/COM-Interfaces/IUnknown.md carries one after the return value of its QueryInterface section; both NOTEs go when a fixed build is released. Found 2026-10-13 documenting the OLEGuids package. -->

## A `For Each` that cannot get an enumerator never ends under `On Error Resume Next`

**Describe the bug**
A `For Each` whose *group* gives no enumerator --- `Nothing`, an object of a class with no `[Enumerator]` member, or an object whose `[Enumerator]` member returns `Nothing` or raises an error --- never ends when it runs under `On Error Resume Next`, or under an error handler that ends with `Resume Next`. The error in the `For Each` line resumes into the loop body; then `Next` raises error 91, *Object variable or With block variable not set*, and resumes into the body again, without end. The expression after `In` is evaluated once only. Nothing is reported, and the program stops responding.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `for-each-resume-next-loops.twinproj` (attached as `for-each-resume-next-loops.zip`). Its module `Startup` runs five loops under `On Error Resume Next` and four under a handler that ends with `Resume Next`. Each counts how often the expression after `In` is evaluated (`header=`) and how often the body runs, and leaves the loop after six passes so that the program ends.
2. Press F5.
3. See the DEBUG CONSOLE. The control, a `Collection` of one item, runs once. Every other loop is evaluated once and runs its body until the guard ends it, with error 91 at each pass:

```
Collection (control): header=1 body=1 errors: 0 | after Next: 0
Nothing: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Class with no enumerator: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Enumerator returns Nothing: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Enumerator raises error 5: header=1 body=6 errors: 91 91 91 91 91 91 | after Next: 0
Nothing, handler with Resume Next: header=1 body=4 passes: error -2147467259 error 91 body error 91 body error 91 body error 91 body error 91
```

The narrowed reproduction:
```vb
Module Startup
    Public Sub Main()
        Dim o As Object, v As Variant, n As Long
        On Error Resume Next
        For Each v In o          ' o is Nothing: an error, resumed
            n = n + 1
            If n = 1000 Then Exit For   ' without this line the loop never ends
        Next
        Debug.Print n            ' prints 1000; VB6 prints 1
    End Sub
End Module
```

**Expected behavior**
The loop ends. VB6 runs the body once, then raises error 92, *For loop not initialized*, at `Next`, and `Resume Next` continues after the loop. Every loop of the attached VB6 project (`for-each-resume-next-loops-vb6.zip`, the same cases, with classes whose `NewEnum` has the procedure identifier -4) prints `body=1`, then error 92:

```
Nothing: header=1 body=1 errors: 424 | after Next: 92
Class with no enumerator: header=1 body=1 errors: 438 | after Next: 92
Enumerator returns Nothing: header=1 body=1 errors: 451 | after Next: 92
Enumerator raises error 5: header=1 body=1 errors: 5 | after Next: 92
```

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit run. A package can meet it without the program's knowledge: the contributed package ArrayListLib returns `Nothing` from its enumerator for a list with no items, and its `ToString` method goes through a list with `For Each` under `On Error Resume Next`, so `ToString` of an empty list never returns.

The first error also differs from VB6's, which the handler cases show (VB6 in parentheses): `Nothing` raises -2147467259, `E_FAIL` (VB6 424, *Object required*); an enumerator that returns `Nothing` raises -2147467259 (VB6 451, *Property let procedure not defined and property get procedure did not return an object*); an error 5 raised in the enumerator arrives as -2147352567, *Exception occurred* (VB6 5); a class with no enumerator raises 438 in both.

Severity: high. The program stops responding with no error, in code written to go on after an error, and a program that loops over what a package returns cannot see it coming.

<!-- Reproducer: bugs/for-each-resume-next-loops/ (mode run: expect lists the control, the four Resume Next loops with body=6 and the first handler line); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`. The narrowed module above was run on its own in a scratch project with tbrun (output 1000). Pages: docs/Reference/Core/For-Each-Next.md carries a WARNING after the paragraph on [Enumerator]; it goes when a fixed build is released, and with it the two mentions of "a twinBASIC defect" in docs/Reference/Contributed/ArrayListLib/index.md (Known problems: For Each over a list with no items, ToString). Found 2026-10-13 documenting the ArrayListLib package. -->

## An assignment through a default member with an argument, written on a public field of an object, is refused with TB5090

**Describe the bug**
`obj.Field(key) = value`, where `Field` is a public field of a class and holds an object whose class has a default member that takes an argument, is refused with TB5090, *named argument already provided for ''*. The default member is a `[DefaultMember]` `Property Get` and `Property Let` pair of a class of the project, or the `Item` property of a `Scripting.Dictionary`. The message names nothing, and the line is a plain assignment. The same assignment compiles through a local variable, a module variable (qualified or not), a property that returns the object, an `Object` variable, and `Me.Field(key)` or `Field(key)` inside the class that holds the field. The read `obj.Field(key)` compiles, and so does the assignment with the default member written out, `obj.Field.Item(key) = value`. So the compiler refuses the one place where the object is reached through a field of an instance.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `field-default-member-named-argument.twinproj` (attached as `field-default-member-named-argument.zip`). Its one source file, `Startup.twin`, has a class `Bag` with a default `Item(Key)`, a class `Holder` with public fields, and `Main` with the assignments; the lines that are refused carry the comment `REFUSED`.
2. Let the IDE compile it (it does so on opening).
3. See five errors, one at each line marked `REFUSED`, and no other: `TB5090 named argument already provided for ''`.

The narrowed reproduction:
```vb
Class Bag
    Private mValue As Long

    [DefaultMember]
    Property Get Item(ByVal Key As String) As Long
        Item = mValue
    End Property

    [DefaultMember]
    Property Let Item(ByVal Key As String, ByVal Value As Long)
        mValue = Value
    End Property
End Class

Class Holder
    Public Field As New Bag
End Class

Module Startup
    Public Sub Main()
        Dim h As New Holder
        h.Field("a") = 1            ' TB5090
        h.Field.Item("a") = 1       ' compiles
    End Sub
End Module
```

What the refusal depends on, each tried in a project of its own or as a line in one project:
- the type of the field: `As New Bag`, `As Bag`, `As Object`, `As New Scripting.Dictionary` and `As New Collection` are all refused (a `Collection` has no way to assign an item, so it is no use as a comparison); it is the field, not its type;
- how the object holding the field is reached: a variable `As Holder`, `As New Holder`, a parameter, a `With` block and the left-hand side of a compound statement (`h.Field("a") = h.Field("a") + 1`) are refused; `Me.Field(...)` and a bare `Field(...)` inside the class, and a variable `As Object` or `As Variant` that holds the `Holder`, compile;
- a `Property Get Prop() As Bag` in the place of the field: `h.Prop("a") = 1` compiles; a field of a user-defined type that holds a `Bag` (`u.UdtBag("a") = 1`) compiles; a module's public variable, written `Startup.PubBag("a") = 1`, compiles;
- `Set h.ObjField("a") = x`, with a default `Property Set Item(Key)`, is refused too, with another message: TB5001, *Argument for '': cannot coerce type 'String' to '_ObjBag'* (the key is taken for the object the default member returns).

**Expected behavior**
The assignment compiles and calls the default member's `Property Let` (or `Property Set`), as it does through a property that returns the same object. VB6 does not compile it either: its build stops with the compile error *Wrong number of arguments or invalid property assignment* on each of the five refused lines, and on `Me.Field("a") = 1` inside the class, which twinBASIC compiles. VB6 does compile the property, the local variable, the read, and the late-bound object (the attached VB6 project, `field-default-member-named-argument-vb6.zip`, builds those and lists the refused lines as comments). So the request is for twinBASIC to be consistent with itself, and, if the refusal stays, a message that says why: the one it gives names an argument that does not exist.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit compile. Met in the contributed package TBMANLIB, whose `cHttpClient` has a public `RequestHeaders` field that holds a dictionary: `Http.RequestHeaders("X-Key") = "1"` is refused and `Http.RequestHeaders.Item("X-Key") = "1"` is accepted.

Severity: low. The line is refused at compile time and the default member written out is a workaround.

<!-- Reproducer: bugs/field-default-member-named-argument/ (mode compile: expect is TB5090; the project has the Scripting Runtime referenced for the Dictionary case); verified on BETA 1005 by `bug_repro.mjs verify`, and compiled with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`; VB6 refuses the same lines, so that side lists them as comments and builds the rest. Pages: docs/Reference/Contributed/TBMANLIB/cHttpClient.md carries a NOTE (after its table of error codes) that names the TB5090 refusal and the `.Item` workaround; update it when a fixed build is released (if the fix accepts the assignment, the NOTE goes). Found 2026-10-13 documenting the TBMANLIB package. -->

## Empty parentheses after a function result or a variable are accepted on a typed value and fail at run time on a Variant

**Describe the bug**
A pair of empty parentheses written after a function's result or a variable, as in `Num = Asc(c)()` or `G = Chr(Num)()`, compiles. What it does when it runs depends on the type of the value in front of it. When the type is not `Variant` (`Long`, `Double`, `String`), the parentheses are ignored and the value is used: `Asc("abc")()` is 97. When it is a `Variant` (the result of `Chr`, `Mid`, `Left`, `Int`, `Sgn`, `Abs` and `InStr`, of a `Function ... As Variant` of the project, or a `Variant` variable), the line raises error -2147467259, *Unspecified error*. When it is an object, the default member is called with no arguments and raises error -2147352561, *Parameter not optional* if it needs one. The compiler gives no diagnostic for any of these.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `empty-parentheses-after-value.twinproj` (attached as `empty-parentheses-after-value.zip`). Its module `Startup` runs nine such assignments under `On Error Resume Next` and prints each result and error number.
2. Press F5.
3. See the DEBUG CONSOLE: the six lines with a value that is not a `Variant` give their value and error 0; the three with a `Variant` give an empty result and error -2147467259:

```
Asc(s)() [Long]: result=[97] error 0
Len(s)() [Long]: result=[3] error 0
Twice(3)() [Long]: result=[6] error 0
n() [Long variable]: result=[5] error 0
s() [String variable]: result=[abc] error 0
Chr$(65)() [String]: result=[A] error 0
Chr(65)() [Variant]: result=[] error -2147467259
VarLong()() [Variant]: result=[] error -2147467259
v() [Variant variable]: result=[] error -2147467259
```

What the compiler does refuse: arguments in the second pair (`Len(s)(1)` and `Twice(3)(1)`, TB5030, *Unexpected call arguments*), `(Asc(s))()` (TB5001, *expected a delegate*), and `Coll()()` for a function that returns a `Collection` (TB5092, *Missing argument 'Index'*).

**Expected behavior**
A diagnostic for the value that is not a `Variant`, as VB6 gives: its build stops with *Type mismatch* on `Asc(s)()`, `Twice(3)()` and `Chr$(65)()`, *Syntax error* on `Len(s)()`, and *Expected array* on `n()` and `s()`. For a `Variant`, VB6 compiles the line and raises error 9, *Subscript out of range*, when it runs (the parentheses are read as an index of an array with no subscripts); twinBASIC raises -2147467259 (the attached VB6 project, `empty-parentheses-after-value-vb6.zip`, builds the three `Variant` lines, and lists the refused ones with VB6's messages as comments).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit run. Met in the contributed package TBMANLIB, whose module `ToolsCN` has `Num = Asc(Mid(CnChar, i, 1))()` and `G = Chr(Num)()` in `GetPinYin`: the first line runs and returns the character code, the second raises the error, for every ASCII character.

Severity: low. Code that VB6 refuses is accepted and, for the types that are not `Variant`, works; for a `Variant` it raises an error that does not say what is wrong.

<!-- Reproducer: bugs/empty-parentheses-after-value/ (mode run: expect lists the nine lines); verified on BETA 1005 by `bug_repro.mjs verify`, and run with --arch win64 too. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`; VB6 refuses the six typed lines at compile time, so that side builds only the three Variant lines (error 9) and lists the others as comments with VB6's messages (each checked in a build of its own). Pages: docs/Reference/Contributed/TBMANLIB/ToolsCN.md's NOTE on GetPinYin names `G = Chr(Num)()` as the line that raises and says the parentheses after `Asc` have no effect, and docs/Reference/Contributed/TBMANLIB/index.md (Known problems) says GetPinYin fails for a text with an English letter, a digit or a space (both corrected 2026-10-13 and checked with check_run: "a" raises -2147467259, ChrW(233) returns "" with no error, ChrW(&H4E2D) raises on a Western code page, `Asc("a")()` is 97). When a fixed build is released, both statements change: if twinBASIC then refuses `()` after a value as VB6 does, TBMANLIB's ToolsCN no longer compiles, and the TBMANLIB section says so. Found 2026-10-13 documenting the TBMANLIB package. -->

## An assignment to an element of a public array field of a class crashes the compiler

**Describe the bug**
`h.Values(1) = 5`, where `Values` is a public array field of a class (`Public Values(1 To 3) As Long`) and `h` is a variable of that class, crashes the compiler. The IDE prints `NATIVE EXCEPTION: ACCESS_VIOLATION` in the DEBUG CONSOLE, restarts the compiler on the same project, and it crashes again, three times in a run, so nothing in the project compiles while the line is there. The declaration alone does not crash it, and nor does the read of an element, which is refused with a diagnostic (TB5033, *Binding error, no datatype*), so the assignment is the one use that crashes the compiler instead of being compiled or refused.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `class-array-field-element-assignment-crash.twinproj` (attached as `class-array-field-element-assignment-crash.zip`). Its one source file, `Startup.twin`, holds the whole bug:
   ```
   Class Holder
       Public Values(1 To 3) As Long
   End Class

   Module Startup

       Public Sub Main()
           Dim h As New Holder
           h.Values(1) = 5
       End Sub

   End Module
   ```
2. Let the IDE compile it (it does so on opening).
3. See the DEBUG CONSOLE: `NATIVE EXCEPTION: ACCESS_VIOLATION  {no-basic-code} [$1EAFA348:twinBASIC_win32.dll+000FA348]`, then `restarting from MEMORY [...]`, and the same exception twice more, each with a list of the compiler's threads in which the failing one is `>>> thread 0004: ResolveStageZ_CompilationsUnitStart, /ClassArrayFieldElementAssignmentCrash/Sources/Startup.twin; within unit Main; starting line 12`. Without the line `h.Values(1) = 5` the project compiles without a diagnostic.

What it depends on, each tried in a project of its own:
- the assignment crashes with the array bounds `(1 To 3)` and `(3)`, with `h` declared `As New Holder` or `As Holder`, and in a `With h` block (`.Values(1) = 5`); the class having other members does not change that (a `Sub`, or a field `Public X As Long`, with which the compiler also reports TB5131 at the declaration, as the next paragraph says);
- it compiles when `h` is an `Object` variable that holds the `Holder` (late bound), when the assignment is inside the class, for an array of a user-defined type (`u.A(1) = 5`), and for a public array of a module (`Startup.A(1) = 5`);
- a dynamic array field, `Public Values() As Long`, is refused instead of crashing: `ReDim h.Values(1 To 3)` gives TB5063 and `h.Values(1) = 5` gives TB5001, *cannot coerce type 'Integer' to [ByRef] 'Long()'*; so a public array field of a class cannot be indexed from outside the class at all.

The declaration is also treated unevenly. TB5131, *class modules cannot expose public fixed-arrays*, is reported at `Public Values(1 To 3) As Long` when the class has a field of another type (`Public X As Long` before or after it), and not when the array is the class's only field, nor when the class has only arrays (two of them) or only arrays and methods. The crash is the same with and without TB5131.

**Expected behavior**
A diagnostic, or a compiled project. The assignment is refused the way the read of an element is, with a message that says what is wrong, and the project keeps compiling. VB6 refuses the declaration itself: its build stops with *Constants, fixed-length strings, arrays, user-defined types and Declare statements not allowed as Public members of object modules* (the attached VB6 project, `class-array-field-element-assignment-crash-vb6.zip`, has the line as a comment, with an indexed property in its place).

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same in a 32-bit and a 64-bit compile. Met while documenting the contributed package TBMANLIB: a probe project with a class that had a public fixed array, and a statement that assigned to one of its elements, crashed the compiler.

Severity: high for a project that has the line. The compiler crashes on every attempt and restarts into the same crash, so the IDE reports nothing else about the project, and the line has to be found and removed by hand. No wrong code is produced.

<!-- Reproducer: bugs/class-array-field-element-assignment-crash/ (mode compile; expect is tbbuild exit 4, the compiler crashing); verified on BETA 1005 by `bug_repro.mjs verify`, and compiled with --arch win64 too. The exception text above is from the IDE's DEBUG CONSOLE (tbbuild --keep, then the console read over CDP); the address is build-specific. VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6`; the refusal message was got from a build with the line uncommented, since a refused build prints nothing to out.txt. The variants were scratch projects, not kept. Pages: none. Found 2026-10-13 while documenting the TBMANLIB package: the probe project of that session crashed the compiler on `L.A(1) = 5` among nine other, harmless, lines. -->
