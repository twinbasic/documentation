---
title: OLECAUUID
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLECAUUID
has_toc: false
---

# OLECAUUID type
{: .no_toc }

A counted array of GUIDs, with the layout of the Windows `CAUUID` structure.

**OLECAUUID** is a user-defined type declared in the package's `OLEGuids` module, so both `OLECAUUID` and `OLEGuids.OLECAUUID` name it. It mirrors the Windows structure [CAUUID](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/ns-ocidl-cauuid), which holds the number of elements of an array and the address of the array.

```tb inert=signature
Public Type OLECAUUID
    cElems As Long
    pElems As LongPtr
End Type
```

## Fields

*cElems*
: A **Long** holding the number of elements in the array.

*pElems*
: A **LongPtr** holding the address of the array. Each element is a GUID, with the layout of an [OLECLSID](OLECLSID).

## Where it is used

[**ISpecifyPropertyPages.GetPages**](ISpecifyPropertyPages#getpages) takes it by reference as *pPages* and fills it with the class identifiers of an object's property pages. The object allocates the array with `CoTaskMemAlloc`, and the caller frees it with `CoTaskMemFree`.

## See Also

- [OLECLSID](OLECLSID) type -- a class or interface identifier
- [OLECALPOLESTR](OLECALPOLESTR) type -- a counted array of Unicode string pointers
- [OLECADWORD](OLECADWORD) type -- a counted array of **DWORD** values
- [ISpecifyPropertyPages](ISpecifyPropertyPages) interface -- lists the property pages of an object
