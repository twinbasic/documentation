---
title: OLEDISPPARAMS
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLEDISPPARAMS
has_toc: false
---

# OLEDISPPARAMS type
{: .no_toc }

<!-- test: TypeLayoutTests.OLEDISPPARAMS_HasTheLayoutOfDispparams -->
The arguments of a call through **IDispatch.Invoke**, with the layout of the Windows `DISPPARAMS` structure.

**OLEDISPPARAMS** is a user-defined type declared in the package's `OLEGuids` module, so both `OLEDISPPARAMS` and `OLEGuids.OLEDISPPARAMS` name it. It mirrors the Windows structure [DISPPARAMS](https://learn.microsoft.com/en-us/windows/win32/api/oaidl/ns-oaidl-dispparams), which holds the addresses and the counts of the arguments and of the named arguments of a call.
<!-- /test -->

```tb inert=signature
Public Type OLEDISPPARAMS
    rgvarg As LongPtr
    rgdispidNamedArgs As LongPtr
    cArgs As Long
    cNamedArgs As Long
End Type
```

## Fields

*rgvarg*
: A **LongPtr** holding the address of an array of **Variant** values, which are the arguments. They are in **reverse** order: element 0 is the last argument of the call and the highest element is the first. The named arguments come first in the array, so they are the last of the call's own order.

*rgdispidNamedArgs*
: A **LongPtr** holding the address of an array of **Long** values, which are the dispatch identifiers of the named arguments, in the order of the first *cNamedArgs* elements of *rgvarg*. It is 0 when there are no named arguments.

*cArgs*
: A **Long** holding the number of elements in *rgvarg*, the named arguments included.

*cNamedArgs*
: A **Long** holding the number of elements in *rgdispidNamedArgs*.

A variable that is not filled in holds only zeros, which is a call with no arguments.

<!-- test: DispatchTests.Invoke_AssignsAPropertyWithPropertyPut -->
An assignment to a property passes the new value as the only argument, named with the reserved identifier `DISPID_PROPERTYPUT` (-3): *cArgs* and *cNamedArgs* are 1, and *rgdispidNamedArgs* is the address of a **Long** holding -3. The [IDispatch](../../../../Reference/COM-Interfaces/IDispatch#the-dispparams-structure) page in the COM Interfaces section describes the structure further.
<!-- /test -->


## Where it is used

[**IDispatchUnrestricted.Invoke**](IDispatchUnrestricted#invoke) takes the address of an **OLEDISPPARAMS** variable, from [**VarPtr**](../../../Modules/Information/VarPtr), as *lpdispparams*. No method of the package takes the structure by name.

## Example

This procedure assigns 25 to the `Level` property of a **Gauge** object by its dispatch identifier, through **Invoke** with the access flag 4 (`DISPATCH_PROPERTYPUT`).

```tb hidden
Class Gauge
    Private m_level As Long

    Public Property Get Level() As Long
        Return m_level
    End Property

    Public Property Let Level(ByVal NewValue As Long)
        m_level = NewValue
    End Property
End Class
```

```tb check_run
Dim g As New Gauge
Dim d As IDispatchUnrestricted = g

Dim iid As OLECLSID
Dim namePtr As LongPtr = StrPtr("Level")
Dim id As Long
d.GetIDsOfNames iid, namePtr, 1, 0, id

Dim newValue(0 To 0) As Variant
newValue(0) = 25
Dim putId As Long = -3  ' DISPID_PROPERTYPUT
Dim params As OLEDISPPARAMS
params.rgvarg = VarPtr(newValue(0))
params.rgdispidNamedArgs = VarPtr(putId)
params.cArgs = 1
params.cNamedArgs = 1

Dim argErr As Long
d.Invoke id, iid, 0, 4, VarPtr(params), 0, 0, argErr
Debug.Print g.Level  ' 25
```

## See Also

- [IDispatchUnrestricted](IDispatchUnrestricted) interface -- finds and calls members of an automation object by name or dispatch identifier
- [OLECLSID](OLECLSID) type -- a class or interface identifier
