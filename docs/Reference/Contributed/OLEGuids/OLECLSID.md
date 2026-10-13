---
title: OLECLSID
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLECLSID
has_toc: false
---

# OLECLSID type
{: .no_toc }

A class or interface identifier, with the layout of the Windows `GUID` structure.

**OLECLSID** is a user-defined type declared in the package's `OLEGuids` module, so both `OLECLSID` and `OLEGuids.OLECLSID` name it. It mirrors the Windows structure [GUID](https://learn.microsoft.com/en-us/windows/win32/api/guiddef/ns-guiddef-guid), which the interface declarations use for a class identifier (CLSID) and for an interface identifier (IID) alike.

```tb inert=signature
Public Type OLECLSID
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type
```

## Fields

*Data1*
: A **Long** holding the first eight hexadecimal digits of the identifier. The Windows field is unsigned, so a value above `&H7FFFFFFF` appears negative.

*Data2*
: An **Integer** holding the next four digits.

*Data3*
: An **Integer** holding the next four digits.

*Data4*
: An array of eight **Byte** values, indexed from 0 to 7, holding the last sixteen hexadecimal digits, two to a byte.

For the identifier `00020400-0000-0000-C000-000000000046`, *Data1* is `&H00020400`, *Data2* and *Data3* are 0, and *Data4* holds `&HC0`, 0, 0, 0, 0, 0, 0 and `&H46`.

An **OLECLSID** variable that is not filled in holds only zeros, which is the null identifier `IID_NULL` that [**IDispatchUnrestricted.GetIDsOfNames**](IDispatchUnrestricted#getidsofnames) and [**IDispatchUnrestricted.Invoke**](IDispatchUnrestricted#invoke) ask for in their *riid* parameter.

## Where it is used

- [**IDispatchUnrestricted.GetIDsOfNames**](IDispatchUnrestricted#getidsofnames) and [**IDispatchUnrestricted.Invoke**](IDispatchUnrestricted#invoke) -- *riid*, by reference.
- [**IObjectSafety.GetInterfaceSafetyOptions**](IObjectSafety#getinterfacesafetyoptions) and [**SetInterfaceSafetyOptions**](IObjectSafety#setinterfacesafetyoptions) -- *riid*, by reference.
- [**IPerPropertyBrowsing.MapPropertyToPage**](IPerPropertyBrowsing#mappropertytopage) -- *pCLSID*, by reference.
- [**IRichEditOle.ConvertObject**](IRichEditOle#convertobject) -- *pCLSIDNew*, and [**IRichEditOle.ActivateAs**](IRichEditOle#activateas) -- *pCLSID* and *pCLSIDAs*, by reference.
- [**IRichEditOleCallback.QueryInsertObject**](IRichEditOleCallback#queryinsertobject) -- *pCLSID*, by reference.
- [**IUnknownUnrestricted.QueryInterface**](IUnknownUnrestricted#queryinterface) -- *priid* is the address of the identifier, from [**VarPtr**](../../../Modules/Information/VarPtr).

## Example

This procedure asks an object which safety options it supports for the **IDispatch** interface. The identifier `00020400-0000-0000-C000-000000000046` is written into an **OLECLSID** field by field.

```tb check_build
Private Function DispatchSafetyOptions(ByVal Obj As IObjectSafety) As Long
    Dim iid As OLECLSID
    iid.Data1 = &H20400
    iid.Data4(0) = &HC0
    iid.Data4(7) = &H46

    Dim supported As Long
    Dim enabled As Long
    Obj.GetInterfaceSafetyOptions iid, supported, enabled
    Return supported
End Function
```

## See Also

- [IDispatchUnrestricted](IDispatchUnrestricted) interface -- finds and calls members of an automation object by name or dispatch identifier
- [IObjectSafety](IObjectSafety) interface -- reports and sets an object's safety options
- [OLECAUUID](OLECAUUID) type -- a counted array of GUIDs
