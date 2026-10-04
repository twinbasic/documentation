---
title: IDispatch
parent: COM Interfaces
permalink: /Reference/COM-Interfaces/IDispatch
---

# IDispatch interface
{: .no_toc }

Lets a caller find a member of an object by name and call it, without knowing the object's type when the code is written. It is the interface behind every **Object** variable, behind [**CallByName**](../../tB/Modules/Interaction/CallByName), and behind automation servers such as Office and the Scripting Runtime.

* TOC
{:toc}

## Declaration

**IDispatch** derives from **IUnknown** and has the interface identifier `00020400-0000-0000-C000-000000000046`. It adds four methods. Each returns an **HRESULT**, which twinBASIC hides as it does for any interface method: a failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult).

Every twinBASIC class has an **IDispatch** implementation that the compiler writes, so a program seldom needs the interface itself. A program needs it to call an object's **GetIDsOfNames** or **Invoke** directly, and to write a class that supplies its own member lookup. The declaration in **stdole** cannot call them (see [The stdole declaration](#the-stdole-declaration)); a project declares its own copy, with the same interface identifier. A copy needs the three structures the methods pass.

```tb check_build projname=com-idispatch slot=file
Module DispatchTypes
    Public Type GUID
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type

    Public Type DISPPARAMS
        rgvarg As LongPtr
        rgdispidNamedArgs As LongPtr
        cArgs As Long
        cNamedArgs As Long
    End Type

    Public Type EXCEPINFO
        wCode As Integer
        wReserved As Integer
        bstrSource As LongPtr
        bstrDescription As LongPtr
        bstrHelpFile As LongPtr
        dwHelpContext As Long
        pvReserved As LongPtr
        pfnDeferredFillIn As LongPtr
        scode As Long
    End Type

    Public Const DISP_E_MEMBERNOTFOUND As Long = &H80020003
    Public Const DISP_E_UNKNOWNNAME As Long = &H80020006
    Public Const E_NOTIMPL As Long = &H80004001
End Module

[InterfaceId("00020400-0000-0000-C000-000000000046")]
Private Interface IDispatch Extends stdole.IUnknown
    Sub GetTypeInfoCount(ByRef pctinfo As Long)
    Sub GetTypeInfo(ByVal iTInfo As Long, ByVal lcid As Long, ByRef ppTInfo As LongPtr)
    Sub GetIDsOfNames(ByRef riid As GUID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispId As Long)
    Sub Invoke(ByVal dispIdMember As Long, ByRef riid As GUID, ByVal lcid As Long, ByVal wFlags As Integer, ByRef pDispParams As DISPPARAMS, ByRef pVarResult As Variant, ByRef pExcepInfo As EXCEPINFO, ByRef puArgErr As Long)
End Interface
```

*rgszNames* is declared as the first element of an array of string pointers: pass `StrPtr(name)` in a **LongPtr** variable, or the first element of an array of them. *pVarResult* and *pExcepInfo* are the caller's variables. A caller that expects no result passes a null pointer for *pVarResult*, and a class that implements **Invoke** tests it with [**VarPtr**](../../tB/Modules/Information/VarPtr) before it writes.

## Methods

### GetTypeInfoCount
{: .no_toc }

Says whether the object can describe itself with type information.

Syntax: *object*.**GetTypeInfoCount** *pctinfo*

*pctinfo*
: *required* A **Long** that receives 1 when the object has type information, and 0 when it has none.

Returns `S_OK`. A twinBASIC class returns 1.

### GetTypeInfo
{: .no_toc }

Returns the object's type information, as an **ITypeInfo** pointer that the caller releases.

Syntax: *object*.**GetTypeInfo** *iTInfo*, *lcid*, *ppTInfo*

*iTInfo*
: *required* A **Long**: which type information to return. It is 0, the only value an object with a single description accepts. Another value fails with `DISP_E_BADINDEX` (`&H8002000B`).

*lcid*
: *required* A **Long**: the locale for the names in the description.

*ppTInfo*
: *required* A **LongPtr** that receives the pointer.

A twinBASIC class returns a description for *iTInfo* 0. For 1 it fails with `E_UNEXPECTED` (`&H8000FFFF`), not with `DISP_E_BADINDEX`. [**TypeName**](../../tB/Modules/Information/TypeName) calls this method to find the name of an object's class.

### GetIDsOfNames
{: .no_toc }

Turns a member name, and optionally the names of that member's parameters, into the numbers **Invoke** takes. The number is the member's dispatch identifier, a **DISPID**.

Syntax: *object*.**GetIDsOfNames** *riid*, *rgszNames*, *cNames*, *lcid*, *rgDispId*

*riid*
: *required* A **GUID**. It is reserved and must be all zeros, `IID_NULL`.

*rgszNames*
: *required* The names to look up. The first is the member's name. Each one after it is the name of one of that member's parameters.

*cNames*
: *required* A **Long**: how many names *rgszNames* holds.

*lcid*
: *required* A **Long**: the locale for interpreting the names.

*rgDispId*
: *required* The first element of an array of *cNames* **Long** values, which receives one identifier per name, in the same order. The identifier of a parameter is the zero-based position of that parameter in the member's parameter list.

Name matching ignores case. A member keeps its identifier for the life of the object, so a caller can look it up once and use it for every later call.

Returns `S_OK` when every name is known. When a name is not known it returns `DISP_E_UNKNOWNNAME` (`&H80020006`) and writes `DISPID_UNKNOWN` (-1) in that name's slot, and a name the object does know still gets its identifier.

### Invoke
{: .no_toc }

Calls a method, or reads or writes a property, given the identifier **GetIDsOfNames** returned.

Syntax: *object*.**Invoke** *dispIdMember*, *riid*, *lcid*, *wFlags*, *pDispParams*, *pVarResult*, *pExcepInfo*, *puArgErr*

*dispIdMember*
: *required* A **Long**: the member's identifier.

*riid*
: *required* A **GUID**: reserved, all zeros, as for **GetIDsOfNames**.

*lcid*
: *required* A **Long**: the locale for interpreting the arguments.

*wFlags*
: *required* An **Integer**: what the call does with the member, from the table below. A caller that cannot tell a method call from a property read sets both `DISPATCH_METHOD` and `DISPATCH_PROPERTYGET`, and the object does whichever the member is.

*pDispParams*
: *required* A **DISPPARAMS** holding the arguments.

*pVarResult*
: *required* A **Variant** that receives the result of a method or a property read. It is a null pointer when the caller wants no result, and the object ignores it for a property write.

*pExcepInfo*
: *required* An **EXCEPINFO** that the object fills in when it returns `DISP_E_EXCEPTION`. It can be a null pointer.

*puArgErr*
: *required* A **Long** that receives the position, in *rgvarg*, of the first argument that was wrong, when the return value says so. It can be a null pointer.

| Flag | Value | Meaning |
|------|-------|---------|
| `DISPATCH_METHOD` | 1 | Call the member as a method. |
| `DISPATCH_PROPERTYGET` | 2 | Read the member as a property. |
| `DISPATCH_PROPERTYPUT` | 4 | Assign a value to the property. |
| `DISPATCH_PROPERTYPUTREF` | 8 | Assign an object to the property by reference, as **Set** does. |

#### The DISPPARAMS structure

*rgvarg* points to an array of *cArgs* **Variant** values, holding the arguments in **reverse order**: element 0 is the last argument of the call and the highest element is the first. A call `Subtract(10, 3)` passes 3 in element 0 and 10 in element 1.

A named argument goes first in the array, which puts it at the end of the call's own order. *rgdispidNamedArgs* points to *cNamedArgs* identifiers, one per named argument, in the same order as the first *cNamedArgs* elements of *rgvarg*. The identifiers are those **GetIDsOfNames** returned for the parameter names. A call `Greet(1, n:=5)` passes 5 in element 0, with the identifier of *n* as the single named identifier, and 1 in element 1.

A property assignment passes the new value as the only argument, named with the reserved identifier `DISPID_PROPERTYPUT` (-3): *cNamedArgs* is 1 and *rgdispidNamedArgs* points to a **Long** holding -3.

#### Return values

| Value | Name | Meaning |
|-------|------|---------|
| `&H00000000` | `S_OK` | The call succeeded. |
| `&H80020001` | `DISP_E_UNKNOWNINTERFACE` | *riid* is not all zeros. |
| `&H80020003` | `DISP_E_MEMBERNOTFOUND` | The object has no such member, or the member does not allow the access *wFlags* asks for. |
| `&H80020004` | `DISP_E_PARAMNOTFOUND` | A named argument's identifier is not a parameter of the member. |
| `&H80020005` | `DISP_E_TYPEMISMATCH` | An argument cannot be converted to the parameter's type. |
| `&H80020007` | `DISP_E_NONAMEDARGS` | The object does not accept named arguments. |
| `&H80020008` | `DISP_E_BADVARTYPE` | An argument is not a valid **Variant**. |
| `&H80020009` | `DISP_E_EXCEPTION` | The member raised an error. *pExcepInfo* describes it. |
| `&H8002000A` | `DISP_E_OVERFLOW` | An argument is out of range for the parameter. |
| `&H8002000E` | `DISP_E_BADPARAMCOUNT` | The call passes more or fewer arguments than the member takes. |
| `&H8002000F` | `DISP_E_PARAMNOTOPTIONAL` | A required argument is missing. |

## Reserved identifiers

An object may give any other number to a member, but these are reserved. Negative numbers other than the four in the table are reserved for other purposes.

| Identifier | Name | Member |
|-----------:|------|--------|
| 0 | `DISPID_VALUE` | The default member. |
| -1 | `DISPID_UNKNOWN` | Returned by **GetIDsOfNames** for a name it does not know. |
| -3 | `DISPID_PROPERTYPUT` | The name of the value argument of a property assignment. |
| -4 | `DISPID_NEWENUM` | The member that returns the object's enumerator, which [**For Each**](../../tB/Core/For-Each-Next) uses; see [**IEnumVARIANT**](IEnumVARIANT). |

## Late binding in twinBASIC

A variable declared **As Object**, and a **Variant** that holds an object, call every member through **IDispatch**. That is late binding: the member is looked up by name when the statement runs, so a misspelled name compiles and fails when it is reached. A variable declared with a class or interface type calls through the vtable instead, which is faster and checked when the project compiles. See [Data Types](../Data-Types#object).

Each late-bound statement calls **GetIDsOfNames** with the member's name, then **Invoke** with the identifier it got. A statement that names an argument passes the argument's name as a second name. [**For Each**](../../tB/Core/For-Each-Next) over an **Object** variable skips the lookup and calls **Invoke** with `DISPID_NEWENUM`. The default member is also invoked by its identifier, 0, without a lookup.

The flags the call passes to **Invoke** depend on the statement:

| Statement | *wFlags* |
|-----------|---------:|
| *object*.*Member* *args* (a call used as a statement) | 1 |
| *x* = *object*.*Member*(*args*) (a value is read, a method or a property) | 3 |
| *object*.*Member* = *value* | 4, with the value named -3 |
| **Set** *object*.*Member* = *value* | 8, with the value named -3 |
| *object*(*args*), the default member | 3, identifier 0 |
| **CallByName** with `vbMethod` | 1 |
| **CallByName** with `vbGet` | 2 |
| **CallByName** with `vbLet` | 4, with the value named -3 |
| **CallByName** with `vbSet` | 8, with the value named -3 |

The four [**VbCallType**](../../tB/Modules/Constants/VbCallType) values are the four flags. [**CallByName**](../../tB/Modules/Interaction/CallByName) accepts any member with any of them: `vbGet` calls a method, and `vbMethod` reads a property. [**CallByDispId**](../../tB/Modules/Interaction/CallByDispId) does the same with an identifier in place of a name, and is the way to call a member that has an identifier and no name.

### Errors from a late-bound call

| Situation | Error |
|-----------|-------|
| The name is not known (**GetIDsOfNames** fails) | `&H80020006`, *Unknown name.* |
| **CallByName** with a name that is not known | `&H80004005`, *Unspecified error* |
| **Invoke** returns `DISP_E_MEMBERNOTFOUND` | 438, *Object doesn't support this property or method* |
| **Invoke** returns `DISP_E_TYPEMISMATCH` | 13, *Type mismatch* |
| **Invoke** returns any other failure code | that code as the error number, with the system's description of it |
| The object is **Nothing** | 91, *Object variable or With block variable not set* |
| **CallByName** on a value that is not an object | 424, *Object required* |

> [!NOTE]
> In VBA an unknown member raises error 438. In twinBASIC it raises `&H80020006`, so an error handler that tests for 438 does not catch it. This holds for objects of any origin: a twinBASIC class, a **Collection**, a **Dictionary** and a **FileSystemObject** all behave alike.

> [!WARNING]
> BETA 995 has a defect: a call that fails inside **Invoke** can be made twice, so its side effects happen twice and nothing says so. VB6 makes the call once. A failed property assignment is followed by a second **Invoke** with *wFlags* 3. A call with more arguments than a **Sub** takes runs the **Sub**, then fails with error 13, and a late-bound statement does this twice. Code that implements **Invoke** must not change state before it can still fail.

> [!NOTE]
> **CallByName** repeats a call that returned `DISP_E_MEMBERNOTFOUND`: a second **Invoke** with the same identifier and *wFlags* and a null *pVarResult*, for **VbMethod**, **VbGet** and **VbLet** alike. VB6 does the same. A late-bound statement makes the call once.

## Classes written in twinBASIC

Every class gets an **IDispatch** implementation from the compiler, so an object of any class can be assigned to an **Object** variable. [**GetTypeInfoCount**](#gettypeinfocount) returns 1 and [**TypeName**](../../tB/Modules/Information/TypeName) returns the class's name. The implementation dispatches the members of the class itself --- the default interface --- and nothing else. A member of an interface the class [**Implements**](../../tB/Core/Implements) is not found through an **Object** variable; only the interface's own variable type reaches it.

The members it finds:

- **Public** and **Friend** methods, properties and fields. A **Private** member is not found: **GetIDsOfNames** fails with `DISP_E_UNKNOWNNAME`.
- Names matched without regard to case.
- A property's **Property Get**, **Property Let** and **Property Set** share one identifier.
- A method can be called with `DISPATCH_PROPERTYGET`, and a property read with `DISPATCH_METHOD`. A write needs `DISPATCH_PROPERTYPUT` or `DISPATCH_PROPERTYPUTREF` and a member that has a **Property Let** or **Property Set**; a call with flags 0 fails, as does a write to a **Property Get** with no setter, with `DISP_E_MEMBERNOTFOUND`.
- An **Optional** parameter can be left out, and a named argument is matched to a parameter by name.

A bad call to a member is reported like this:

| Call | **Invoke** returns |
|------|--------------------|
| Too many arguments to a member that has no result, such as a **Sub** | runs the member, then `DISP_E_TYPEMISMATCH` |
| Too few arguments | `DISP_E_PARAMNOTOPTIONAL` |
| Too many arguments, to a **Function** | `DISP_E_BADPARAMCOUNT` |
| An argument that cannot be converted | `DISP_E_EXCEPTION`, with `DISP_E_TYPEMISMATCH` in *pExcepInfo*'s `scode` |
| The member raises an error | `DISP_E_EXCEPTION`; `scode`, `bstrSource` and `bstrDescription` hold the error's number, source and description |
| An identifier that is not a member | `DISP_E_MEMBERNOTFOUND` |

*puArgErr* is not written in these cases. A property assignment is accepted with or without the `DISPID_PROPERTYPUT` named argument.

### Dispatch identifiers

The compiler numbers the members of a class itself, and the numbers are not a contract. A member that must have a fixed identifier carries the [**[DispId]**](../../tB/Core/Attributes#dispid) attribute, which **GetIDsOfNames** then returns:

- `[DispId(42)]` on a method makes 42 its identifier. A **Property Get** and a **Property Let** of one property carry the same number.
- [**[DefaultMember]**](../../tB/Core/Attributes#defaultmember) gives the member the identifier 0, and so does `[DispId(0)]`. `object(args)` then calls it.
- [**[Enumerator]**](../../tB/Core/Attributes#enumerator) gives the member the identifier -4, and so does `[DispId(-4)]`. **GetIDsOfNames** answers to the member's own name, not to `_NewEnum`; an **Invoke** on -4 with either flags 2 or 3 returns the enumerator as a `VT_UNKNOWN` value. [**For Each**](../../tB/Core/For-Each-Next) over an **Object** variable works.

[**[DispId]**](../../tB/Core/Attributes#dispid) is also accepted on a member of an **Interface**, and the **Library** modules twinBASIC generates for a COM reference carry it on every member.

### Classes that are not dispatchable

A class declared [**NotDispatchable**](../../Features/Advanced/Classes-and-Modules#create-classes-without-idispatch) has no compiler-written **IDispatch**. Assigning it to an **Object** variable, or to an **IDispatch** variable, fails with `E_NOINTERFACE` (`&H80004002`), *No such interface supported*. A **Variant** can hold it, as `VT_UNKNOWN`.

## Implementing IDispatch

A class that does **Implements IDispatch**, with a project's own copy of the interface, compiles, and its four methods are never called: a request for **IDispatch** is answered by the compiler's implementation, so late-bound calls, **GetTypeInfoCount** and **GetIDsOfNames** all still reach the compiler's.

A class that is both **NotDispatchable** and implements **IDispatch** is dispatched through its own methods. Assigning it to an **Object** variable succeeds, and every late-bound statement, **CallByName**, **CallByDispId**, **For Each** and **TypeName** is delivered to the class. This is how a class accepts member names that were not declared, as a script object or a property bag does.

An implementation has these constraints:

- **GetIDsOfNames** may be called with several names at once, the member's followed by its parameters'. For a named argument the runtime passes the argument's name as the second name, and it passes the identifier the implementation returns for it in *rgdispidNamedArgs*.
- It must write *rgDispId* through its address, [**VarPtr**](../../tB/Modules/Information/VarPtr)`(rgDispId)`, to fill more than the first element.
- **Invoke** is called with a null *pVarResult* for a statement that discards the result, and the call is made with the flags in the table above. Assigning to a null *pVarResult* is an access violation that ends the run.
- *puArgErr* can be null, and for a default member read with no arguments it is.
- A failure code is returned with [**Err.ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult), and an error raised in the method with **Err.Raise** arrives at the caller as it is. `DISP_E_MEMBERNOTFOUND` from **Invoke** is reported as error 438, and any other code as itself.
- When **Invoke** for `DISPID_NEWENUM` fails with `DISP_E_MEMBERNOTFOUND`, **For Each** raises error 438. When it succeeds it must return an enumerator. See [**IEnumVARIANT**](IEnumVARIANT).
- [**TypeName**](../../tB/Modules/Information/TypeName) calls **GetTypeInfo**. An implementation that returns `E_NOTIMPL` gets the name `Object`.

[`[WithDispatchForwarding]`](../../tB/Core/Attributes#withdispatchforwarding) is a different mechanism, for a class that implements a COM interface of a host and must route the host's late-bound calls to the class's own members.

## The stdole declaration

A variable declared **As stdole.IDispatch** does not reach the four methods. A call through it is compiled as a late-bound call by name, the same as a call through an **Object** variable: `d.GetTypeInfoCount n` compiles with any arguments, and raises `&H80020006` (*Unknown name*) when it runs, because the object has no member of that name. A member the object does have, such as `d.Answer`, is called as it would be through **Object**. Use a project's own declaration, as above.

## COMExtensible

The [**[COMExtensible]**](../../tB/Core/Attributes#comextensible) attribute on an interface declares that the object behind it may accept members that its declaration does not list. It is the flag that the **tbIDE** package sets on its DOM classes, such as [**HtmlElementProperties**](../../tB/Packages/tbIDE/HtmlElementProperties), whose implementation lives in the IDE. Setting it on a project's own interface changes nothing for a class that implements it: the class's **IDispatch** still finds only the class's own public members, and `DISP_E_UNKNOWNNAME` for any other name. To accept names that nothing declares, use a **NotDispatchable** class that implements **IDispatch**, as in the example below.

## Example

The helper functions and the class that the first three samples use. **GetId** wraps **GetIDsOfNames**; it returns the identifier and the error number of the lookup.

```tb check_build projname=com-idispatch slot=file
Private Module DispatchSupport
    Public Declare PtrSafe Function VariantCopy Lib "oleaut32" ( _
        ByVal pvargDest As LongPtr, ByVal pvargSrc As LongPtr) As Long
    Public Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" ( _
        ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)
    Public Declare PtrSafe Function lstrlenW Lib "kernel32" (ByVal lpString As LongPtr) As Long

    Public Function GetId(ByVal obj As Object, ByVal member As String, ByRef hr As Long) As Long
        Dim d As IDispatch = obj
        Dim iid As GUID
        Dim namePtr As LongPtr = StrPtr(member)
        Dim id As Long
        On Error Resume Next
        d.GetIDsOfNames iid, namePtr, 1, 0, id
        hr = Err.Number
        On Error GoTo 0
        Return id
    End Function

    Public Function PtrToString(ByVal p As LongPtr) As String
        Dim n As Long = lstrlenW(p)
        Dim s As String = Space$(n)
        If n > 0 Then CopyMemory StrPtr(s), p, n * 2
        Return s
    End Function
End Module

Class Gadget
    Public Function Answer() As Long
        Return 42
    End Function

    Public Function Subtract(ByVal a As Long, ByVal b As Long) As Long
        Return a - b
    End Function

    Public Property Get Label() As String
        Return mLabel
    End Property
    Public Property Let Label(ByVal Value As String)
        mLabel = Value
    End Property
    Private mLabel As String

    [DispId(42)]
    Public Sub Beep()
    End Sub

    [DefaultMember]
    Public Function Item(ByVal Index As Long) As String
        Return "item" & Index
    End Function

    [Enumerator]
    Public Function Items() As stdole.IUnknown
        Dim c As New Collection
        c.Add 10
        c.Add 20
        Return c.[_NewEnum]
    End Function

    Private Sub Secret()
    End Sub

    Friend Sub Internal()
    End Sub
End Class
```

Looking members up through the project's copy of the interface shows which identifiers a class has. The explicit and reserved identifiers are fixed; a **Private** member is not found, and the failed lookup leaves -1 in the identifier:

```tb check_run projname=com-idispatch
Dim g As New Gadget
Dim hr As Long

Debug.Print GetId(g, "Beep", hr) & " " & Hex(hr)      ' 42 0
Debug.Print GetId(g, "BEEP", hr) & " " & Hex(hr)      ' 42 0
Debug.Print GetId(g, "Item", hr) & " " & Hex(hr)      ' 0 0
Debug.Print GetId(g, "Items", hr) & " " & Hex(hr)     ' -4 0
Debug.Print GetId(g, "Secret", hr) & " " & Hex(hr)    ' -1 80020006
Debug.Print GetId(g, "Missing", hr) & " " & Hex(hr)   ' -1 80020006
Debug.Print GetId(g, "Internal", hr) <> -1            ' True
```

**Invoke** called by hand. The arguments are in reverse order, so element 0 holds the second argument of **Subtract**:

```tb check_run projname=com-idispatch
Dim g As New Gadget
Dim d As IDispatch = g
Dim iid As GUID, hr As Long
Dim id As Long = GetId(g, "Subtract", hr)

Dim args(0 To 1) As Variant
args(0) = 3     ' the last argument
args(1) = 10    ' the first argument

Dim dp As DISPPARAMS
dp.rgvarg = VarPtr(args(0))
dp.cArgs = 2

Dim result As Variant, info As EXCEPINFO, badArg As Long
d.Invoke id, iid, 0, 1, dp, result, info, badArg    ' DISPATCH_METHOD
Debug.Print result                                  ' 7

Dim count As Long
d.GetTypeInfoCount count
Debug.Print count                                   ' 1
```

The same class through an **Object** variable and **CallByName**. An unknown name and a **Private** member fail alike, with the error of the failed lookup; **CallByName** reports the unknown name differently:

```tb check_run projname=com-idispatch
Dim o As Object = New Gadget

Debug.Print o.Answer()                                ' 42
Debug.Print o(3)                                      ' item3
o.Label = "tag"
Debug.Print o.Label                                   ' tag

Debug.Print CallByName(o, "Subtract", vbMethod, 10, 3)   ' 7
Debug.Print CallByName(o, "Answer", vbGet)               ' 42
CallByName o, "Label", vbLet, "new"
Debug.Print CallByName(o, "Label", vbGet)                ' new

On Error Resume Next
o.Secret
Debug.Print Hex(Err.Number) & " " & Err.Description  ' 80020006 Unknown name.
Err.Clear
o.Missing
Debug.Print Hex(Err.Number) & " " & Err.Description  ' 80020006 Unknown name.
Err.Clear
CallByName o, "Missing", vbMethod
Debug.Print Hex(Err.Number) & " " & Err.Description  ' 80004005 Unspecified error
Err.Clear
o.Internal
Debug.Print Err.Number                                ' 0
```

**For Each** over an **Object** variable calls **Invoke** with `DISPID_NEWENUM`, and `Items` returns the enumerator:

```tb check_run projname=com-idispatch
Dim o As Object = New Gadget
Dim x As Variant
For Each x In o
    Debug.Print x
Next
' Output:
' 10
' 20
```

An object that accepts any member name. Its class is **NotDispatchable** and implements **IDispatch**, so the runtime sends every late-bound statement to the four methods. Each name gets a slot the first time it is looked up, and a slot holds any value, an object included:

```tb check_build projname=com-idispatch slot=file
NotDispatchable Class Expando
    Implements IDispatch

    Private Names() As String
    Private Values() As Variant
    Private Count As Long

    Private Function SlotOf(ByVal Name As String) As Long
        Dim i As Long
        For i = 1 To Count
            If StrComp(Names(i), Name, vbTextCompare) = 0 Then Return i
        Next
        Count += 1
        ReDim Preserve Names(1 To Count)
        ReDim Preserve Values(1 To Count)
        Names(Count) = Name
        Return Count
    End Function

    Private Sub IDispatch_GetTypeInfoCount(ByRef pctinfo As Long) Implements IDispatch.GetTypeInfoCount
        pctinfo = 0
    End Sub

    Private Sub IDispatch_GetTypeInfo(ByVal iTInfo As Long, ByVal lcid As Long, ByRef ppTInfo As LongPtr) Implements IDispatch.GetTypeInfo
        Err.ReturnHResult = E_NOTIMPL
    End Sub

    Private Sub IDispatch_GetIDsOfNames(ByRef riid As GUID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispId As Long) Implements IDispatch.GetIDsOfNames
        Dim i As Long, namePtr As LongPtr, id As Long
        For i = 0 To cNames - 1
            CopyMemory VarPtr(namePtr), VarPtr(rgszNames) + i * LenB(namePtr), LenB(namePtr)
            If i = 0 Then
                id = SlotOf(PtrToString(namePtr))
            Else
                id = i - 1          ' a parameter name: its position
            End If
            CopyMemory VarPtr(rgDispId) + i * 4, VarPtr(id), 4
        Next
    End Sub

    Private Sub IDispatch_Invoke(ByVal dispIdMember As Long, ByRef riid As GUID, ByVal lcid As Long, ByVal wFlags As Integer, ByRef pDispParams As DISPPARAMS, ByRef pVarResult As Variant, ByRef pExcepInfo As EXCEPINFO, ByRef puArgErr As Long) Implements IDispatch.Invoke
        If dispIdMember < 1 Or dispIdMember > Count Then
            Err.ReturnHResult = DISP_E_MEMBERNOTFOUND
            Exit Sub
        End If
        If (wFlags And 12) <> 0 Then
            ' DISPATCH_PROPERTYPUT or DISPATCH_PROPERTYPUTREF: the value is argument 0
            VariantCopy VarPtr(Values(dispIdMember)), pDispParams.rgvarg
        ElseIf VarPtr(pVarResult) <> 0 Then
            VariantCopy VarPtr(pVarResult), VarPtr(Values(dispIdMember))
        End If
    End Sub
End Class
```

```tb check_run projname=com-idispatch
Dim bag As Object = New Expando

bag.Color = "red"
Debug.Print bag.Color         ' red

bag.Size = 3
Debug.Print bag.size * 2      ' 6

Debug.Print IsEmpty(bag.Shape)   ' True
Debug.Print TypeName(bag)        ' Object
```

## See Also

- [IUnknown](IUnknown) -- the base of **IDispatch**
- [IEnumVARIANT](IEnumVARIANT) -- the interface **Invoke** returns for `DISPID_NEWENUM`
- [IErrorInfo](IErrorInfo) -- how an error reaches a caller through a vtable call
- [IConnectionPoint](IConnectionPoint) -- events, which a sink receives through **Invoke**
- [CallByName](../../tB/Modules/Interaction/CallByName) function
- [CallByDispId](../../tB/Modules/Interaction/CallByDispId) function
- [VbCallType](../../tB/Modules/Constants/VbCallType) enumeration
- [DispId](../../tB/Core/Attributes#dispid), [DefaultMember](../../tB/Core/Attributes#defaultmember), [Enumerator](../../tB/Core/Attributes#enumerator), [COMExtensible](../../tB/Core/Attributes#comextensible) attributes
- [Classes and Modules](../../Features/Advanced/Classes-and-Modules#create-classes-without-idispatch) -- **NotDispatchable** classes
- [Data Types](../Data-Types#object) -- the **Object** type
- [Implements](../../tB/Core/Implements) statement
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses) -- declaring an interface in twinBASIC
