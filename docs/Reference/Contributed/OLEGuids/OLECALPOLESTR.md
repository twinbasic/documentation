---
title: OLECALPOLESTR
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLECALPOLESTR
has_toc: false
---

# OLECALPOLESTR type
{: .no_toc }

<!-- test: TypeLayoutTests.OLECALPOLESTR_HasTheLayoutOfCalpolestr -->
A counted array of pointers to Unicode strings, with the layout of the Windows `CALPOLESTR` structure.

**OLECALPOLESTR** is a user-defined type declared in the package's `OLEGuids` module, so both `OLECALPOLESTR` and `OLEGuids.OLECALPOLESTR` name it. It mirrors the Windows structure [CALPOLESTR](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/ns-ocidl-calpolestr), which holds the number of elements of an array and the address of the array.
<!-- /test -->

```tb inert=signature
Public Type OLECALPOLESTR
    cElems As Long
    pElems As LongPtr
End Type
```

## Fields

*cElems*
: A **Long** holding the number of elements in the array.

*pElems*
: A **LongPtr** holding the address of the array. Each element is a pointer to a null-terminated Unicode string.

## Where it is used

[**IPerPropertyBrowsing.GetPredefinedStrings**](IPerPropertyBrowsing#getpredefinedstrings) takes it by reference as *pCaStringsOut* and fills it with the names of the values a property can take. The object allocates the array and each string, and the caller frees them with `CoTaskMemFree`.

## See Also

- [OLECADWORD](OLECADWORD) type -- a counted array of **DWORD** values
- [OLECAUUID](OLECAUUID) type -- a counted array of GUIDs
- [IPerPropertyBrowsing](IPerPropertyBrowsing) interface -- display strings, property pages and predefined values of an object's properties
