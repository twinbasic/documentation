---
title: IDispatch
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IDispatch
has_toc: false
---

# IDispatch interface
{: .no_toc }

Finds and calls the members of an automation object by name or by dispatch identifier.

**IDispatch** has the interface identifier `00020400-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IDispatch](https://learn.microsoft.com/en-us/windows/win32/api/oaidl/nn-oaidl-idispatch).

The declaration is complete: it has all four methods of the Windows interface. Each is a **Sub** that hides the HRESULT: a failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../../Modules/ErrObject/LastHresult). The structure parameters of **Invoke** are **stdole**'s **DISPPARAMS** and **EXCEPINFO**; the interface identifiers are the package's [OLECLSID](OLECLSID).

> [!NOTE]
> A variable declared `As IDispatch` has the type of **stdole**, not this one, in a project that references **stdole**. A call through it is late-bound by name, and the four methods are not reached. Write `OLEGuids.IDispatch` to get this declaration. [IOleControlSite.GetExtendedControl](IOleControlSite#getextendedcontrol) returns it.

The [IDispatch](../../../../Reference/COM-Interfaces/IDispatch) page in the COM Interfaces section gives the contract of the four methods, what a class that implements the interface must do, and how the **stdole** declaration behaves. The parameters there are the same as here, except that a project declares its own structure for the interface identifier where this package supplies [OLECLSID](OLECLSID).

## Methods

### GetTypeInfoCount

```tb inert=signature
Sub GetTypeInfoCount(ByRef pctInfo As Long)
```

Says whether the object can describe itself with type information. *pctInfo* receives 1 when the object has type information and 0 when it has none.

### GetTypeInfo

```tb inert=signature
Sub GetTypeInfo(ByVal itinfo As Long, ByVal lcid As Long, ByRef pptinfo As LongPtr)
```

Returns the object's type information, as an `ITypeInfo*` in *pptinfo*. *itinfo* is the index of the type information: 0 selects the type information of the object's own implementation of **IDispatch**. *lcid* is the locale of the information.

### GetIDsOfNames

```tb inert=signature
Sub GetIDsOfNames(ByRef riid As OLEGuids.OLECLSID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispID As Long)
```

Converts the names of a member and its parameters into dispatch identifiers. *riid* is reserved: pass an [OLECLSID](OLECLSID) holding only zeros. *rgszNames* is the first element of an array of *cNames* pointers to Unicode strings, such as `StrPtr(name)` in a **LongPtr** variable, and *rgDispID* receives one identifier for each name. A name that the object does not have raises a run-time error.

### Invoke

```tb inert=signature
Sub Invoke(ByVal DispIDMember As Long, ByRef riid As OLEGuids.OLECLSID, ByVal lcid As Long, ByVal wFlags As Integer, ByRef pdispparams As stdole.DISPPARAMS, ByRef pvarResult As Variant, ByRef pexcepinfo As stdole.EXCEPINFO, ByRef puArgErr As Long)
```

Calls the member with the dispatch identifier *DispIDMember*. *riid* is reserved and holds only zeros. *wFlags* says what kind of access it is: 1 calls a method (`DISPATCH_METHOD`), 2 reads a property (`DISPATCH_PROPERTYGET`), 4 assigns a property (`DISPATCH_PROPERTYPUT`) and 8 sets an object property (`DISPATCH_PROPERTYPUTREF`). *pdispparams* holds the arguments, *pvarResult* receives the result, *pexcepinfo* receives the details of an error the member raised, and *puArgErr* receives the index of the argument that was wrong.

## Example

This function finds the dispatch identifier of a member of an object by name. The *riid* argument is an **OLECLSID** that is not filled in, so it holds only zeros.

```tb check_build
Private Function DispIdOf(ByVal Obj As Object, ByVal MemberName As String) As Long
    Dim d As OLEGuids.IDispatch = Obj
    Dim iid As OLECLSID
    Dim namePtr As LongPtr = StrPtr(MemberName)
    Dim id As Long
    d.GetIDsOfNames iid, namePtr, 1, 0, id
    Return id
End Function
```

## See Also

- [IDispatch](../../../../Reference/COM-Interfaces/IDispatch) interface -- the contract, in the COM Interfaces section
- [OLECLSID](OLECLSID) type -- a class or interface identifier
- [IOleControlSite](IOleControlSite) interface -- its **GetExtendedControl** returns this interface
- [IEnumVARIANTUnrestricted](IEnumVARIANTUnrestricted) interface -- extends **stdole.IDispatch**
