---
title: IEnumVARIANT
parent: COM Interfaces
permalink: /Reference/COM-Interfaces/IEnumVARIANT
---

# IEnumVARIANT interface
{: .no_toc }

Enumerates a sequence of **Variant** values, a fixed number at a time. It is the interface [**For Each**](../../tB/Core/For-Each-Next) uses to go through an object, and the one an object's [**[Enumerator]**](../../tB/Core/Attributes#enumerator) member returns.

* TOC
{:toc}

## Declaration

**IEnumVARIANT** derives from **IUnknown** and has the interface identifier `00020404-0000-0000-C000-000000000046`. Its four methods return an **HRESULT**, which twinBASIC hides as it does for any interface method: a failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult).

The declaration in **stdole** cannot be implemented from twinBASIC. Its counts are unsigned 32-bit integers, which have no twinBASIC type, and the compiler reports `{unsupported VT_UI4}` for them. A project declares its own copy instead, with the same interface identifier and **Long** counts. Either of two forms works.

This form is enough for an enumerator that only **For Each** uses, since **For Each** asks for one item at a time:

```tb check_build slot=file
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Private Interface IEnumVARIANT Extends stdole.IUnknown
    Sub Next(ByVal celt As Long, ByRef rgVar As Variant, ByRef pCeltFetched As Long)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As IEnumVARIANT
End Interface
```

Here *rgVar* names the first element of the caller's array and nothing after it, and *pCeltFetched* can be tested for a null pointer only through [**VarPtr**](../../tB/Modules/Information/VarPtr). The [Custom Enumerators](../../Features/Language/Custom-Enumerators) page uses this form.

This form passes both as addresses, so an implementation can fill any number of elements and test *pCeltFetched* directly:

```tb check_build slot=file
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Private Interface IEnumVARIANT Extends stdole.IUnknown
    Sub Next(ByVal celt As Long, ByVal rgVar As LongPtr, ByVal pCeltFetched As LongPtr)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As IEnumVARIANT
End Interface
```

A class that implements a member marked [**[PreserveSig]**](../../tB/Core/Attributes#preservesig) does not compile (BETA 1005), so an implementation cannot return its **HRESULT** as a function result. It sets [**Err.ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult) instead: `S_FALSE` is 1, `E_NOTIMPL` is `&H80004001`.

## Methods

### Next
{: .no_toc }

Returns the next *celt* items of the sequence, or as many as are left.

Syntax: *object*.**Next** *celt*, *rgVar*, *pCeltFetched*

*celt*
: *required* A **Long**: how many items the caller asks for.

*rgVar*
: *required* The first element of an array of at least *celt* **Variant** values, which receives the items in order. The caller owns what is written there; the enumerator does not free it, and does not read what the elements held before.

*pCeltFetched*
: *required* A **Long** that receives the number of items written to *rgVar*. The caller may pass a null pointer when it asks for one item, and **For Each** does, so an implementation tests the address before writing to it.

Returns `S_OK` when it wrote *celt* items, and `S_FALSE` when it wrote fewer because the sequence ended. A call at the end of the sequence writes nothing, sets *pCeltFetched* to 0 and returns `S_FALSE`. A *celt* of 0 writes nothing and returns `S_OK`.

The position moves past every item written, so the next call starts after the last of them.

### Skip
{: .no_toc }

Moves past the next *celt* items without returning them.

Syntax: *object*.**Skip** *celt*

*celt*
: *required* A **Long**: how many items to move past.

Returns `S_OK` when it moved past *celt* items, and `S_FALSE` when the sequence ended first. The position is then at the end.

### Reset
{: .no_toc }

Moves back to the start of the sequence.

Syntax: *object*.**Reset**

Returns `S_OK`.

### Clone
{: .no_toc }

Returns a new enumerator over the same sequence, at the same position.

Syntax: **Set** *copy* **=** *object*.**Clone**

The copy and the original then move independently: a **Next** or **Skip** on one does not move the other. A caller uses it to record a position and come back to it later.

## How For Each uses it

**For Each** over an object calls the object's enumerator member once, then uses the enumerator it returns in a fixed way:

- It calls **Reset** first. A **Reset** that returns `E_NOTIMPL` is ignored, and the loop goes on.
- It calls **Next** once per item, always with *celt* = 1 and a null *pCeltFetched*.
- It ends when **Next** returns `S_FALSE`. It cannot see the count, so a **Next** that returns `S_OK` with nothing written makes the loop go on forever.
- An item that **Next** writes and returns with `S_FALSE` is dropped. When **Next** writes the last item it must return `S_OK`, and `S_FALSE` on the call after it.
- It never calls **Skip** or **Clone**.
- An error raised in **Next** ends the loop and reaches the error handler of the procedure running the **For Each**.

Each **For Each** gets an enumerator of its own, so two loops over one object, one nested in the other, do not disturb each other.

## Reading S_FALSE

The methods are declared as **Sub**, so a caller does not get the **HRESULT** as a value. A success code such as `S_FALSE` raises no error; [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult) holds it until the next call. Read it in the statement straight after the method, before calling anything else --- even a procedure of the caller's own project replaces it.

## Example

An enumerator over a range of numbers that implements the whole contract, with the second form of the declaration. It writes each item with **VariantInit** and **VariantCopy**, from oleaut32.dll, at the address of its element; a **Variant** is 16 bytes in 32-bit code and 24 bytes in 64-bit code.

```tb check_build projname=com-ienumvariant slot=file
[InterfaceId("00020404-0000-0000-C000-000000000046")]
Private Interface IEnumVARIANT Extends stdole.IUnknown
    Sub Next(ByVal celt As Long, ByVal rgVar As LongPtr, ByVal pCeltFetched As LongPtr)
    Sub Skip(ByVal celt As Long)
    Sub Reset()
    Function Clone() As IEnumVARIANT
End Interface

Private Module EnumSupport
    Public Declare PtrSafe Sub VariantInit Lib "oleaut32" (ByVal pvarg As LongPtr)
    Public Declare PtrSafe Function VariantCopy Lib "oleaut32" ( _
        ByVal pvargDest As LongPtr, ByRef pvargSrc As Variant) As Long
    Public Declare PtrSafe Sub PutLong Lib "kernel32" Alias "RtlMoveMemory" ( _
        ByVal Destination As LongPtr, ByRef Source As Long, ByVal Length As LongPtr)
#If Win64 Then
    Public Const VARIANT_SIZE As Long = 24
#Else
    Public Const VARIANT_SIZE As Long = 16
#End If
    Public Const S_FALSE As Long = 1
End Module
```

```tb check_build projname=com-ienumvariant slot=file
Class RangeEnum
    Implements IEnumVARIANT

    Private First As Long, Last As Long, Current As Long

    Public Sub Init(ByVal FromValue As Long, ByVal ToValue As Long, _
            Optional ByVal Position As Long = 0)
        First = FromValue
        Last = ToValue
        Current = IIf(Position = 0, FromValue, Position)
    End Sub

    Private Sub Next(ByVal celt As Long, ByVal rgVar As LongPtr, ByVal pCeltFetched As LongPtr) _
            Implements IEnumVARIANT.Next
        Dim n As Long
        Do While n < celt And Current <= Last
            Dim item As Variant = Current
            Dim element As LongPtr = rgVar + n * VARIANT_SIZE
            VariantInit element
            VariantCopy element, item
            Current += 1
            n += 1
        Loop
        If pCeltFetched <> 0 Then PutLong pCeltFetched, n, 4
        If n < celt Then Err.ReturnHResult = S_FALSE
    End Sub

    Private Sub Skip(ByVal celt As Long) Implements IEnumVARIANT.Skip
        Dim n As Long
        Do While n < celt And Current <= Last
            Current += 1
            n += 1
        Loop
        If n < celt Then Err.ReturnHResult = S_FALSE
    End Sub

    Private Sub Reset() Implements IEnumVARIANT.Reset
        Current = First
    End Sub

    Private Function Clone() As IEnumVARIANT Implements IEnumVARIANT.Clone
        Dim copy As New RangeEnum
        copy.Init First, Last, Current
        Return copy
    End Function
End Class
```

```tb check_build projname=com-ienumvariant slot=file
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

**For Each** over a **NumberRange** asks for one item at a time:

```tb check_run projname=com-ienumvariant
Dim r As New NumberRange
r.Init 1, 3

Dim x As Variant
For Each x In r
    Debug.Print x
Next
' Output:
' 1
' 2
' 3
```

Called directly, as native code would call it, the enumerator returns several items at once, and the other three methods do what the contract says:

```tb check_run projname=com-ienumvariant
Dim re As New RangeEnum
re.Init 1, 5
Dim e As IEnumVARIANT
Set e = re

Dim items(0 To 2) As Variant, fetched As Long, hr As Long

' Three items asked for, three written: S_OK (0).
e.Next 3, VarPtr(items(0)), VarPtr(fetched)
hr = Err.LastHresult
Debug.Print fetched & " " & hr & " " & items(0) & items(1) & items(2)   ' 3 0 123

' Three asked for, two left: S_FALSE (1).
e.Next 3, VarPtr(items(0)), VarPtr(fetched)
hr = Err.LastHresult
Debug.Print fetched & " " & hr & " " & items(0) & items(1)              ' 2 1 45

' Back to the start, past two items, and a copy of that position.
e.Reset
e.Skip 2
Dim c As IEnumVARIANT
Set c = e.Clone()
e.Next 1, VarPtr(items(0)), VarPtr(fetched)
Debug.Print items(0)                                                     ' 3
e.Next 1, VarPtr(items(0)), VarPtr(fetched)
Debug.Print items(0)                                                     ' 4
c.Next 1, VarPtr(items(0)), VarPtr(fetched)
Debug.Print items(0)                                                     ' 3
```

## See Also

- [Custom Enumerators](../../Features/Language/Custom-Enumerators) -- making a class usable with **For Each**
- [For Each...Next](../../tB/Core/For-Each-Next) statement
- [Enumerator](../../tB/Core/Attributes#enumerator) attribute
- [Implements](../../tB/Core/Implements) statement
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses) -- declaring an interface in twinBASIC
