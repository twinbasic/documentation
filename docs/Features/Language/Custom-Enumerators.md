---
title: Custom Enumerators
parent: Language Syntax
nav_order: 18
permalink: /Features/Language/Custom-Enumerators
---

# Custom Enumerators

A class becomes usable with [**For Each**](../../tB/Core/For-Each-Next) when one of its members supplies an enumerator: an object that implements the COM interface [**IEnumVARIANT**](../../Reference/COM-Interfaces/IEnumVARIANT). The member is marked with the [**[Enumerator]**](../../tB/Core/Attributes#enumerator) attribute. It can return the enumerator of an object that already has one, such as a [**Collection**](../../tB/Modules/Collection/), or an enumerator the class implements itself. [Writing an enumerator](#writing-an-enumerator) shows a class that produces its own items, with no collection behind it.

## Returning a Collection's enumerator

A class that keeps its items in a **Collection** returns the collection's own enumerator, which is its hidden `_NewEnum` member. The square brackets let the name start with an underscore.

```tb check_build projname=enum-bag slot=file
Class Bag
    Private Items As New Collection

    Public Sub Add(ByVal Item As Variant)
        Items.Add Item
    End Sub

    [Enumerator]
    Public Function _NewEnum() As stdole.IUnknown
        Return Items.[_NewEnum]
    End Function
End Class
```

```tb check_run projname=enum-bag
Dim b As New Bag
b.Add "a"
b.Add "b"
b.Add "c"

Dim x As Variant
For Each x In b
    Debug.Print x
Next
' Output:
' a
' b
' c
```

Each **For Each** calls the member again and gets an enumerator of its own, so two loops over the same object --- one nested in the other --- do not disturb each other.

## The enumerator member

- **The attribute is what counts.** Mark the member with **[Enumerator]**, or with **[DispId(-4)]**, the dispatch identifier COM reserves for it. A member named `_NewEnum` without either attribute is not used: **For Each** raises error 438, *Object doesn't support this property or method*, as it does for a class with no enumerator at all.
- **The name and the visibility are free.** `_NewEnum` is the convention, but a member called `Items` works too, and so does a **Private** or **Friend** one.
- **It can be a Function or a Property Get.** It returns **stdole.IUnknown**, a **Variant** holding the enumerator, or the type of a class that implements **IEnumVARIANT**.

> [!NOTE]
> twinBASIC also accepts a member that returns the **Collection** itself rather than its `[_NewEnum]`, and **For Each** then uses the collection's enumerator. VB6 does not: **For Each** raises error 451, *Property let procedure not defined and property get procedure did not return an object*. Return `[_NewEnum]` in code that must also run in VB6.

## Writing an enumerator

When the items are not in a collection --- a range of numbers, records read on demand --- the class implements **IEnumVARIANT** itself. The interface in **stdole** cannot be implemented from twinBASIC: its counts are unsigned 32-bit integers, which have no twinBASIC type, so the compiler reports `{unsupported VT_UI4}` for them. Declare the interface in the project instead, with the same interface identifier and **Long** counts:

```tb check_build projname=enum-range slot=file
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Private Interface IEnumVARIANT Extends stdole.IUnknown
    Sub Next(ByVal celt As Long, ByRef rgVar As Variant, ByRef pCeltFetched As Long)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As IEnumVARIANT
End Interface
```

**For Each** uses the enumerator in a fixed way, and an implementation has to allow for it:

- It calls **Reset** first, then **Next** once per item, always with *celt* = 1. **Skip** and **Clone** are never called, so they can return `E_NOTIMPL`.
- It passes *pCeltFetched* as a null pointer. Assigning to it then fails with an access violation, so test its address with [**VarPtr**](../../tB/Modules/Information/VarPtr) first.
- **Next** ends the loop by returning `S_FALSE` (1) through [**Err.ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult). Without it the loop never ends: **For Each** cannot see the count of 0, and calls **Next** again for as long as it returns `S_OK`. An item written together with `S_FALSE` is dropped, so the call that writes the last item returns `S_OK`, and the call after it `S_FALSE`.
- An error raised in **Next** ends the loop and reaches the error handler of the procedure running the **For Each**, with its number and description.

```tb check_build projname=enum-range slot=file
Class RangeEnum
    Implements IEnumVARIANT

    Private Const S_FALSE As Long = 1
    Private Const E_NOTIMPL As Long = &H80004001
    Private First As Long, Last As Long, Current As Long

    Public Sub Init(ByVal FromValue As Long, ByVal ToValue As Long)
        First = FromValue
        Last = ToValue
        Current = FromValue
    End Sub

    Private Sub Next(ByVal celt As Long, ByRef rgVar As Variant, ByRef pCeltFetched As Long) _
            Implements IEnumVARIANT.Next
        If Current > Last Then
            If VarPtr(pCeltFetched) <> 0 Then pCeltFetched = 0
            Err.ReturnHResult = S_FALSE
            Exit Sub
        End If
        rgVar = Current
        Current += 1
        If VarPtr(pCeltFetched) <> 0 Then pCeltFetched = 1
    End Sub

    Private Sub Skip(ByVal celt As Long) Implements IEnumVARIANT.Skip
        Err.ReturnHResult = E_NOTIMPL
    End Sub

    Private Sub Reset() Implements IEnumVARIANT.Reset
        Current = First
    End Sub

    Private Function Clone() As IEnumVARIANT Implements IEnumVARIANT.Clone
        Err.ReturnHResult = E_NOTIMPL
    End Function
End Class
```

```tb check_build projname=enum-range slot=file
Class NumberRange
    Private First As Long, Last As Long

    Public Sub Init(ByVal FromValue As Long, ByVal ToValue As Long)
        First = FromValue
        Last = ToValue
    End Sub

    [Enumerator]
    Public Function _NewEnum() As stdole.IUnknown
        Dim e As New RangeEnum
        e.Init First, Last
        Return e
    End Function
End Class
```

```tb check_run projname=enum-range
Dim r As New NumberRange
r.Init 3, 5

Dim n As Variant
For Each n In r
    Debug.Print n
Next
' Output:
' 3
' 4
' 5
```

This **Next** returns one item per call, which is all **For Each** asks for. Native code that calls the enumerator directly may ask for several items at once, and an enumerator meant for such callers must handle a *celt* above 1. [**IEnumVARIANT**](../../Reference/COM-Interfaces/IEnumVARIANT) describes the whole contract, the declaration that allows it, and an enumerator that implements it.

## See Also

- [For Each...Next](../../tB/Core/For-Each-Next) statement
- [Enumerator](../../tB/Core/Attributes#enumerator) attribute
- [IEnumVARIANT](../../Reference/COM-Interfaces/IEnumVARIANT) interface
- [Interfaces and CoClasses](Interfaces-CoClasses) -- declaring an interface in twinBASIC
- [Implements](../../tB/Core/Implements) statement
- [Collection](../../tB/Modules/Collection/) class
