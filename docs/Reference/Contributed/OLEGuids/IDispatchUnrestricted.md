---
title: IDispatchUnrestricted
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IDispatchUnrestricted
redirect_from:
-  /tB/Packages/Contributed/OLEGuids/IDispatch
has_toc: false
---

# IDispatchUnrestricted interface
{: .no_toc }

Finds and calls the members of an automation object by name or by dispatch identifier, through four methods that a program can call.

**IDispatchUnrestricted** has the interface identifier `00020400-0000-0000-C000-000000000046`, which is the identifier of **IDispatch**, and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IDispatch](https://learn.microsoft.com/en-us/windows/win32/api/oaidl/nn-oaidl-idispatch).

The declaration is complete: it has all four methods of the Windows interface. Each is a **Sub** that hides the HRESULT: a failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../../Modules/ErrObject/LastHresult). The interface identifiers are the package's [OLECLSID](OLECLSID). **Invoke** takes its three structure parameters as pointers (**LongPtr**): the address of an [OLEDISPPARAMS](OLEDISPPARAMS), of a **Variant** and of an `EXCEPINFO` structure, from [**VarPtr**](../../../Modules/Information/VarPtr), or 0 where the parameter is optional.

<!-- test: DispatchTests.StdoleIDispatch_CallIsLateBoundAndDoesNotReachTheMethods, DispatchTests.Assign_ObjectVariableToIDispatchUnrestricted, DispatchTests.Assign_StdoleIDispatchVariableToIDispatchUnrestricted, compile NoIDispatchInThePackage -->
> [!NOTE] 1.0.10.0
> The package has no declaration named **IDispatch**. A variable declared `As IDispatch` has the type of **stdole**, and a call through it is late-bound by name, so the four methods are not reached. To reach them, assign the object to an **IDispatchUnrestricted** variable. The assignment asks the object for the **IDispatch** interface, and it accepts an **Object** variable and a **stdole.IDispatch** variable alike. [IOleControlSite.GetExtendedControl](IOleControlSite#getextendedcontrol) returns a **stdole.IDispatch**.

```tb check_build
Private Function Describable(ByVal Site As IOleControlSite) As Boolean
    Dim d As IDispatchUnrestricted = Site.GetExtendedControl()
    Dim count As Long
    d.GetTypeInfoCount count
    Return count > 0
End Function
```

The [IDispatch](../../../../Reference/COM-Interfaces/IDispatch) page in the COM Interfaces section gives the contract of the four methods, what a class that implements the interface must do, and how the **stdole** declaration behaves. The parameters there are the same as here, except that a project's own declaration of the interface gives **Invoke** structure parameters of types where this one has pointers.

## Methods

### GetTypeInfoCount

```tb inert=signature
Sub GetTypeInfoCount(ByRef pctInfo As Long)
```

<!-- test: DispatchTests.GetTypeInfoCount_ClassObjectHasTypeInformation, DispatchTests.Assign_CollectionAsksForIDispatch -->
Says whether the object can describe itself with type information. *pctInfo* receives 1 when the object has type information and 0 when it has none. An object of a twinBASIC class has it.
<!-- /test -->

### GetTypeInfo

```tb inert=signature
Sub GetTypeInfo(ByVal itinfo As Long, ByVal lcid As Long, ByRef pptinfo As LongPtr)
```

<!-- test: DispatchTests.GetTypeInfo_IndexZeroReturnsTypeInformation, DispatchTests.GetTypeInfo_OtherIndexRaisesBadIndex -->
Returns the object's type information, as an `ITypeInfo*` in *pptinfo*. *itinfo* is the index of the type information: 0 selects the type information of the object's own implementation of **IDispatch**. *lcid* is the locale of the information. An object of a twinBASIC class has the one description, and any other index raises run-time error -2147352565, which is `DISP_E_BADINDEX` (`&H8002000B`).
<!-- /test -->

### GetIDsOfNames

```tb inert=signature
Sub GetIDsOfNames(ByRef riid As OLEGuids.OLECLSID, ByRef rgszNames As LongPtr, ByVal cNames As Long, ByVal lcid As Long, ByRef rgDispId As Long)
```

Converts the names of a member and its parameters into dispatch identifiers. *riid* is reserved: pass an [OLECLSID](OLECLSID) holding only zeros. *rgszNames* is the first element of an array of *cNames* pointers to Unicode strings, such as `StrPtr(name)` in a **LongPtr** variable, and *rgDispId* receives one identifier for each name.

<!-- test: DispatchTests.GetIDsOfNames_KnownNameReturnsAnIdentifier, DispatchTests.GetIDsOfNames_UnknownNameRaisesError438 -->
A name that the object does not have raises run-time error 438, *Object doesn't support this property or method*. **Err.LastHresult** then holds `DISP_E_UNKNOWNNAME` (`&H80020006`), and *rgDispId* holds -1 (`DISPID_UNKNOWN`).

```tb check_run
Dim d As IDispatchUnrestricted = New Calculator
Dim iid As OLECLSID
Dim namePtr As LongPtr = StrPtr("Add")
Dim id As Long

On Error Resume Next
d.GetIDsOfNames iid, namePtr, 1, 0, id
Debug.Print Err.Number            ' 438
Debug.Print Hex(Err.LastHresult)  ' 80020006
Debug.Print id                    ' -1
```
<!-- /test -->

### Invoke

```tb inert=signature
Sub Invoke(ByVal DispId As Long, ByRef riid As OLEGuids.OLECLSID, ByVal lcid As Long, ByVal wFlags As Integer, ByVal lpdispparams As LongPtr, ByVal lpvarResult As LongPtr, ByVal lpexcepinfo As LongPtr, ByRef puArgErr As Long)
```

Calls the member with the dispatch identifier *DispId*. *riid* is reserved and holds only zeros. *lcid* is the locale for interpreting the arguments. *wFlags* says what kind of access it is: 1 calls a method (`DISPATCH_METHOD`), 2 reads a property (`DISPATCH_PROPERTYGET`), 4 assigns a property (`DISPATCH_PROPERTYPUT`) and 8 sets an object property (`DISPATCH_PROPERTYPUTREF`).

*lpdispparams* is the address of an [OLEDISPPARAMS](OLEDISPPARAMS) that holds the arguments. *lpvarResult* is the address of a **Variant** that receives the result, or 0 when the result is not wanted. *lpexcepinfo* is the address of an `EXCEPINFO` structure that receives the details of an error the member raised, or 0. *puArgErr* receives the index of the argument that was wrong.

The package declares no `EXCEPINFO` type, and the **stdole** type cannot be used: some of its members are of unsigned types, which twinBASIC does not support, as VB6 does not, so a variable of it does not compile (TB5106). A project that wants the details declares a structure of the same layout with signed members, as the [IDispatch](../../../../Reference/COM-Interfaces/IDispatch) page does.

<!-- test: DispatchTests.Invoke_MemberErrorWithoutExcepinfoIsRaisedAsItIs, DispatchTests.Invoke_MemberErrorWithExcepinfoRaisesDispEException -->
A member that raises an error is reported in one of two ways. With *lpexcepinfo* set to 0, the member's own error is raised: an `Err.Raise 5, , "boom"` in the member raises error 5 with the description *boom*. With *lpexcepinfo* the address of a structure, the call raises error -2147352567, which is `DISP_E_EXCEPTION` (`&H80020009`), and the structure holds the error: *scode* is the Windows code of the member's error (`&H800A0005` for error 5), and *bstrSource* and *bstrDescription* are its source and description.
<!-- /test -->

<!-- test: DispatchTests.Invoke_UnknownIdentifierRaisesError438 -->
An identifier that the object has no member for raises error 438. **Err.LastHresult** holds `DISP_E_MEMBERNOTFOUND` (`&H80020003`).
<!-- /test -->

## Example

This function finds the dispatch identifier of a member of an object by name. The *riid* argument is an **OLECLSID** that is not filled in, so it holds only zeros.

```tb check_build
Private Function DispIdOf(ByVal Obj As Object, ByVal MemberName As String) As Long
    Dim d As IDispatchUnrestricted = Obj
    Dim iid As OLECLSID
    Dim namePtr As LongPtr = StrPtr(MemberName)
    Dim id As Long
    d.GetIDsOfNames iid, namePtr, 1, 0, id
    Return id
End Function
```

The next procedure calls a method of a class by its name. The class has a method `Subtract(a, b)` that returns *a* minus *b*.

```tb hidden
Class Calculator
    Public Function Subtract(ByVal a As Long, ByVal b As Long) As Long
        Return a - b
    End Function
End Class
```

<!-- test: DispatchTests.Invoke_CallsAMethodWithTheArgumentsInReverseOrder -->
The arguments are an array of **Variant** values in **reverse** order: the last argument of the call is element 0. The call `Subtract(10, 3)` puts 3 in element 0 and 10 in element 1.

```tb check_run
Dim d As IDispatchUnrestricted = New Calculator

Dim iid As OLECLSID
Dim namePtr As LongPtr = StrPtr("Subtract")
Dim id As Long
d.GetIDsOfNames iid, namePtr, 1, 0, id

Dim args(0 To 1) As Variant
args(0) = 3
args(1) = 10
Dim params As OLEDISPPARAMS
params.rgvarg = VarPtr(args(0))
params.cArgs = 2

Dim result As Variant
Dim argErr As Long
d.Invoke id, iid, 0, 1, VarPtr(params), VarPtr(result), 0, argErr
Debug.Print result  ' 7
```
<!-- /test -->

## See Also

- [IDispatch](../../../../Reference/COM-Interfaces/IDispatch) interface -- the contract, in the COM Interfaces section
- [OLEDISPPARAMS](OLEDISPPARAMS) type -- the arguments of **Invoke**
- [OLECLSID](OLECLSID) type -- a class or interface identifier
- [IOleControlSite](IOleControlSite) interface -- its **GetExtendedControl** returns a **stdole.IDispatch**
- [IUnknownUnrestricted](IUnknownUnrestricted) interface -- the three methods of **IUnknown**, callable
