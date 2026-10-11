---
title: ISpecifyPropertyPages
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/ISpecifyPropertyPages
has_toc: false
---

# ISpecifyPropertyPages interface
{: .no_toc }

Lets an object list the class identifiers of its property pages.

**ISpecifyPropertyPages** has the interface identifier `B196B28B-BAB4-101A-B69C-00AA00341D07` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [ISpecifyPropertyPages](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nn-ocidl-ispecifypropertypages).

The declaration is complete: it has the one method of the Windows interface. The method is a **Sub**, so the HRESULT is hidden: a failure code raises a run-time error.

## Methods

### GetPages

```tb inert=signature
Sub GetPages(ByRef pPages As OLEGuids.OLECAUUID)
```

Fills *pPages* with a counted array of the class identifiers of the object's property pages. *pPages* is not initialized by the caller. The object allocates the array with `CoTaskMemAlloc` and stores its address in the structure's `pElems` field; the caller frees it with `CoTaskMemFree`.

## See Also

- [IPerPropertyBrowsing](IPerPropertyBrowsing) interface -- display strings, property pages and predefined values of an object's properties
- [OLECAUUID](OLECAUUID) type -- a counted array of GUIDs
