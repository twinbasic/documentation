---
title: IUnknown
parent: COM Interfaces
permalink: /Reference/COM-Interfaces/IUnknown
---

# IUnknown interface
{: .no_toc }

The base of every COM interface. It lets a caller ask an object for another interface it supports, and tells the object when a caller starts and stops using it. twinBASIC calls it on every object assignment, so most code never names it.

* TOC
{:toc}

## Declaration

**IUnknown** has the interface identifier `00000000-0000-0000-C000-000000000046`. It has three methods, and they are the first three entries in the method table of every other interface, in this order:

| Slot | Method | Native signature |
|------|--------|------------------|
| 0 | **QueryInterface** | `HRESULT QueryInterface(REFIID riid, void **ppvObject)` |
| 1 | **AddRef** | `ULONG AddRef()` |
| 2 | **Release** | `ULONG Release()` |

An interface that a project declares with [**Interface**](../../tB/Core/Interface) names **stdole.IUnknown** as its base with **Extends**, as the [IEnumVARIANT](IEnumVARIANT) declaration does, and its own methods then start at slot 3. twinBASIC supplies the three methods for every class, so a class that implements an interface never writes them (see [Implementing it](#implementing-it)).

## Methods

### QueryInterface
{: .no_toc }

Asks the object for a pointer to another interface it supports.

Syntax: *object*.**QueryInterface** *riid*, *ppvObject*

*riid*
: *required* The interface identifier asked for.

*ppvObject*
: *required* Receives the interface pointer, or a null pointer when the object does not support the interface.

Returns `S_OK` and a pointer with one reference added for the caller, or `E_NOINTERFACE` (`&H80004002`) and a null pointer. Three rules govern the answer:

- **Identity.** Asking any interface of an object for **IUnknown** always returns the same pointer value. A caller finds out whether two interface pointers belong to one object by asking each for **IUnknown** and comparing the results.
- **A fixed set.** If the object answers `S_OK` for an interface once, it never answers `E_NOINTERFACE` for it later, and the reverse.
- **Any interface leads to any other.** Asking an interface for itself succeeds (reflexive). If interface B was obtained from interface A, asking B for A succeeds (symmetric). If C can be obtained from B, and B from A, then C can be obtained from A (transitive).

### AddRef
{: .no_toc }

Adds a reference to the object.

Syntax: *object*.**AddRef**

Returns the new reference count. A caller calls it whenever it copies an interface pointer, and the count is for diagnostics only: a caller must not base logic on its value, because an object may report a number that is not its true count.

### Release
{: .no_toc }

Removes a reference from the object.

Syntax: *object*.**Release**

Returns the new reference count, with the same limit on its use as **AddRef**. A caller calls it when it no longer needs an interface pointer. When the count reaches zero the object frees itself, and every pointer to it is invalid from then on.

## Calling it from twinBASIC

twinBASIC issues these calls itself, so the language has no statement for them:

- **Set** *a* **=** *b* adds a reference to the object *b* holds, and releases the object *a* held before.
- **Set** *a* **= Nothing**, and a variable going out of scope, each release one reference.
- **Set** to a variable of an interface type asks the object for that interface with **QueryInterface**.

The three methods themselves cannot be called by name:

- On a variable declared **As stdole.IUnknown**, `u.AddRef`, `u.Release` and `u.QueryInterface` are compile errors, TB5027 *Unrecognized member*. The same holds for a variable of a project's own interface that extends **stdole.IUnknown**.
- On an **Object** variable, `o.AddRef` raises run-time error `&H80020006` (*Unknown name*) and `CallByName(o, "AddRef", VbMethod)` raises `&H80004005` (*Unspecified error*).
- A project cannot redeclare **IUnknown** under its own name and call it. An **Interface** declared with no **Extends** clause derives from **IDispatch**, not from **IUnknown**, so its first method is at slot 7 and the three declared methods are not the three of **IUnknown**. Declared with **Extends stdole.IUnknown**, the first method is at slot 3. Neither reaches slots 0 to 2.

> [!NOTE]
> Code that has to read or change a reference count goes through the object's method table. The example below does this with **DispCallFunc** from oleaut32.dll. [**vbaObjAddref**](../../tB/Modules/HiddenModule/vbaObjAddref) calls **AddRef** on a raw pointer without reading the result.

Calling **IUnknown** methods by hand is a low-level operation. A wrong slot number, or a **Release** with no matching **AddRef**, ends in an access violation or in an object freed while a variable still refers to it.

## How it shows in the language

### Reference counts

A twinBASIC object has one reference count, shared by every interface it is reached through. In BETA 995:

| Operation | Effect on the count |
|-----------|---------------------|
| `Set b = a`, for **b** of the class type, of an interface type, or **Object** | adds 1 |
| `Set b = Nothing` | removes 1 |
| `Set v = a`, for a **Variant** *v* | adds 1 |
| *collection*.**Add** *a* | adds 1, removed when the collection is released |
| A local variable holding a reference, when its procedure ends | removes 1 |
| A **ByRef** parameter | adds nothing |
| A **ByVal** object parameter | adds references for as long as the call runs |
| A function result, assigned to a variable | adds 1 for the variable; the result's own reference is released |
| `TypeOf`, `Is` | adds nothing |

### Assigning to another interface type

**Set** to a variable whose type is an interface the object does not support raises run-time error `-2147467262` (`&H80004002`, `E_NOINTERFACE`) with the description *No such interface supported*; **Err.Source** is empty. The compiler does not refuse the statement, even when the source variable's class is known not to implement the interface, and the source can be a class-typed variable, an **Object** or a **Variant**. The target variable keeps the reference it held before the failed statement.

Assigning to an **Object** or a **stdole.IUnknown** variable cannot fail for lack of an interface.

### TypeOf and Is

`TypeOf` *x* `Is` *I* is **True** when *x* holds an object that supports *I*, whichever type *x* is declared as, and **False** when *x* is **Nothing**. For **stdole.IUnknown** it is **True** for every object. It does not change the reference count.

The **Is** operator compares identity as COM defines it: two variables of different interface types that hold the same object compare equal, and two variables that are both **Nothing** compare equal whatever their types.

### ObjPtr

[**ObjPtr**](../../tB/Modules/Information/ObjPtr) returns the pointer the variable holds, which is the pointer of the interface the variable is declared as. A variable of the class type, an **Object** variable and a **stdole.IUnknown** variable that were assigned the same object give the same value, but variables of two different interface types give two different values, and neither is the pointer that **QueryInterface** returns for **IUnknown**. To test whether two variables refer to one object, use [**Is**](../../tB/Core/Is), never a comparison of **ObjPtr** values.

### When Class_Terminate runs

The class's `Class_Terminate` procedure runs inside the **Release** that brings the count to zero, before that **Release** returns. For the language's own releases this puts it:

- in a `Set x = Nothing` that drops the last reference, before the next statement;
- during a `Set x = ...` that replaces the last reference, before the next statement;
- when the procedure ends, for a local variable that held the last reference.

### Implementing it

A class never needs to implement **IUnknown**: the compiler gives every class an implementation, and an interface that extends **stdole.IUnknown** is satisfied without a body for those three methods.

`Implements stdole.IUnknown` compiles, and the class works as before. A project's own **Interface** that carries the identifier of **IUnknown** also compiles, and a class can implement it, but the interface is unusable: **Set** to a variable of that type gives the object's ordinary **IUnknown** pointer, which has none of the interface's methods, and calling one ends in an access violation.

## Example

A module that reads a reference count through the method table, and a class that reports when it is destroyed. **RefCount** calls **AddRef** and then **Release**, and returns the count from before the **AddRef**.

```tb check_build projname=com-iunknown slot=file
[InterfaceId("6B1F2A40-5C0D-4E8B-9A57-2D1E3C4B5A69")]
Private Interface IWatch Extends stdole.IUnknown
    Sub Watch()
End Interface

Private Module RefCounts
    Public Declare PtrSafe Function DispCallFunc Lib "oleaut32" ( _
        ByVal pvInstance As LongPtr, ByVal oVft As LongPtr, ByVal cc As Long, _
        ByVal vtReturn As Integer, ByVal cActuals As Long, ByVal prgvt As LongPtr, _
        ByVal prgpvarg As LongPtr, ByRef pvargResult As Variant) As Long

    ' Calls the method at a slot of the object's method table: no arguments,
    ' __stdcall (4), a Long result (VT_I4 is 3).
    Private Function CallSlot(ByVal pUnk As LongPtr, ByVal Slot As Long) As Long
        Dim result As Variant
        DispCallFunc pUnk, Slot * LenB(pUnk), 4, 3, 0, 0, 0, result
        Return result
    End Function

    Public Function RawAddRef(ByVal pUnk As LongPtr) As Long
        Return CallSlot(pUnk, 1)
    End Function

    Public Function RawRelease(ByVal pUnk As LongPtr) As Long
        Return CallSlot(pUnk, 2)
    End Function

    Public Function RefCount(ByVal pUnk As LongPtr) As Long
        Dim n As Long = RawAddRef(pUnk)
        RawRelease pUnk
        Return n - 1
    End Function

    Public Function CountByRef(ByRef t As Tracked, ByVal pUnk As LongPtr) As Long
        Return RefCount(pUnk)
    End Function

    Public Function CountByVal(ByVal t As Tracked, ByVal pUnk As LongPtr) As Long
        Return RefCount(pUnk)
    End Function
End Module

Class Tracked
    Implements IWatch

    Public Name As String

    Private Sub IWatch_Watch() Implements IWatch.Watch
    End Sub

    Private Sub Class_Terminate()
        Debug.Print "Tracked " & Name & " terminated"
    End Sub
End Class

Class Untracked
End Class
```

Each `Set` adds or removes one reference, and an interface variable shares the count of the object's other variables:

```tb check_run projname=com-iunknown
Dim a As Tracked
Set a = New Tracked
a.Name = "a"
Dim p As LongPtr = ObjPtr(a)
Debug.Print RefCount(p)

Dim b As Tracked
Set b = a
Debug.Print RefCount(p)
Set b = Nothing
Debug.Print RefCount(p)

Dim w As IWatch
Set w = a
Debug.Print RefCount(p)
Debug.Print a Is w
Debug.Print CountByRef(a, p)
Debug.Print CountByVal(a, p) > CountByRef(a, p)
Set w = Nothing
Debug.Print RefCount(p)
' Output:
' 1
' 2
' 1
' 2
' True
' 2
' True
' 1
' Tracked a terminated
```

The last line comes from the end of the sample: the local variable `a` goes out of scope, and its reference was the last one.

Assigning to an interface the object does not support is a run-time error, found by **QueryInterface**, and `TypeOf` asks the same question without the error:

```tb check_run projname=com-iunknown
Dim a As Tracked
Set a = New Tracked
a.Name = "a"
Dim u As Object
Set u = New Untracked
Dim w As IWatch

Debug.Print TypeOf a Is IWatch
Debug.Print TypeOf u Is IWatch

On Error Resume Next
Set w = u
Debug.Print Err.Number
Debug.Print Err.Description
On Error GoTo 0
Debug.Print w Is Nothing
' Output:
' True
' False
' -2147467262
' No such interface supported
' True
' Tracked a terminated
```

The class is destroyed inside the **Release** that removes the last reference. Here an extra reference taken by hand outlives the variable, so the variable's `Set ... = Nothing` destroys nothing, and the final **Release** does:

```tb check_run projname=com-iunknown
Dim a As Tracked
Set a = New Tracked
a.Name = "a"
Dim p As LongPtr = ObjPtr(a)

Debug.Print RawAddRef(p)
Set a = Nothing
Debug.Print "variable set to Nothing"
Debug.Print RawRelease(p)
' Output:
' 2
' variable set to Nothing
' Tracked a terminated
' 0
```

Replacing the last reference destroys the old object before the new one is stored:

```tb check_run projname=com-iunknown
Dim t As Tracked
Set t = New Tracked
t.Name = "first"

Debug.Print "replacing"
Set t = New Tracked
Debug.Print "replaced"
t.Name = "second"
Set t = Nothing
Debug.Print "done"
' Output:
' replacing
' Tracked first terminated
' replaced
' Tracked second terminated
' done
```

## See Also

- [IDispatch](IDispatch) -- the base of an **Interface** declared with no **Extends**
- [IEnumVARIANT](IEnumVARIANT) -- an interface that derives from **IUnknown**
- [Set](../../tB/Core/Set) statement
- [Is](../../tB/Core/Is) operator
- [ObjPtr](../../tB/Modules/Information/ObjPtr) function
- [vbaObjAddref](../../tB/Modules/HiddenModule/vbaObjAddref) procedure
- [Implements](../../tB/Core/Implements) statement
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses) -- declaring an interface in twinBASIC
