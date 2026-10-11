---
title: IPerPropertyBrowsing
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IPerPropertyBrowsing
has_toc: false
---

# IPerPropertyBrowsing interface
{: .no_toc }

Lets a property browser ask an object for the display string, the property page and the predefined values of one of its properties.

**IPerPropertyBrowsing** has the interface identifier `376BD3AA-3845-101B-84ED-08002B2EC713` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IPerPropertyBrowsing](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nn-ocidl-iperpropertybrowsing).

The declaration is complete: it has all four methods of the Windows interface, and every one is marked `[PreserveSig]`. Each returns the raw HRESULT as a **Long**; `E_NOTIMPL` (`&H80004001`) means that the object does not provide that kind of information. A class cannot implement this interface; it is for calling. [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) declares three of the methods in a form a class can implement.

Each property is named by its dispatch identifier, *DispID*.

## Methods

### GetDisplayString

```tb inert=signature
[PreserveSig]
Function GetDisplayString(ByVal DispID As Long, ByRef lpDisplayName As LongPtr) As Long
```

Returns a text string that describes a property, for a property browser to display. *lpDisplayName* receives a pointer to a `BSTR` that the object allocates. The caller frees it with `SysFreeString`.

### MapPropertyToPage

```tb inert=signature
[PreserveSig]
Function MapPropertyToPage(ByVal DispID As Long, ByRef pCLSID As OLEGuids.OLECLSID) As Long
```

Returns the class identifier of the property page on which the property can be edited, in *pCLSID*. When the method fails, *pCLSID* is set to the null identifier.

### GetPredefinedStrings

```tb inert=signature
[PreserveSig]
Function GetPredefinedStrings(ByVal DispID As Long, ByRef pCaStringsOut As OLEGuids.OLECALPOLESTR, ByRef pCaCookiesOut As OLEGuids.OLECADWORD) As Long
```

Returns the names of the values a property can take, for a drop-down list. *pCaStringsOut* receives a counted array of string pointers, and *pCaCookiesOut* a counted array of cookies. Each string has a cookie in the same position. The object allocates the strings and both arrays, and the caller frees them with `CoTaskMemFree`. A cookie is passed to **GetPredefinedValue** to get the value the string names.

### GetPredefinedValue

```tb inert=signature
[PreserveSig]
Function GetPredefinedValue(ByVal DispID As Long, ByVal dwCookie As Long, ByRef pVarOut As Variant) As Long
```

Returns, in *pVarOut*, the value that corresponds to *dwCookie*, a cookie that **GetPredefinedStrings** returned.

## See Also

- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) interface -- Visual Basic-style versions of three of the methods
- [ISpecifyPropertyPages](ISpecifyPropertyPages) interface -- lists the property pages of an object
- [OLECLSID](OLECLSID) type -- a class or interface identifier
- [OLECALPOLESTR](OLECALPOLESTR) type -- a counted array of Unicode string pointers
- [OLECADWORD](OLECADWORD) type -- a counted array of **DWORD** values
