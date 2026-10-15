---
title: OLECADWORD
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLECADWORD
has_toc: false
---

# OLECADWORD type
{: .no_toc }

<!-- test: TypeLayoutTests.OLECADWORD_HasTheLayoutOfCadword -->
A counted array of 32-bit values, with the layout of the Windows `CADWORD` structure.

**OLECADWORD** is a user-defined type declared in the package's `OLEGuids` module, so both `OLECADWORD` and `OLEGuids.OLECADWORD` name it. It mirrors the Windows structure [CADWORD](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/ns-ocidl-cadword), which holds the number of elements of an array and the address of the array.
<!-- /test -->

```tb inert=signature
Public Type OLECADWORD
    cElems As Long
    pElems As LongPtr
End Type
```

## Fields

*cElems*
: A **Long** holding the number of elements in the array.

*pElems*
: A **LongPtr** holding the address of the array. Each element is a 32-bit `DWORD`, which is a **Long** in twinBASIC.

## Where it is used

[**IPerPropertyBrowsing.GetPredefinedStrings**](IPerPropertyBrowsing#getpredefinedstrings) takes it by reference as *pCaCookiesOut* and fills it with a cookie for each of the strings it returns in an [OLECALPOLESTR](OLECALPOLESTR). The cookie at a given position goes with the string at the same position, and is passed to [**GetPredefinedValue**](IPerPropertyBrowsing#getpredefinedvalue). The object allocates the array, and the caller frees it with `CoTaskMemFree`.

## See Also

- [OLECALPOLESTR](OLECALPOLESTR) type -- a counted array of Unicode string pointers
- [OLECAUUID](OLECAUUID) type -- a counted array of GUIDs
- [IPerPropertyBrowsing](IPerPropertyBrowsing) interface -- display strings, property pages and predefined values of an object's properties
