---
title: IDataObject
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IDataObject
has_toc: false
---

# IDataObject interface
{: .no_toc }

Names the COM interface that transfers data between applications, as the clipboard and drag and drop do; declared here as a stub with no methods.

**IDataObject** has the interface identifier `0000010E-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Its description marks it as a stub and points to the tbShellLib package for the full version. Microsoft Learn describes the Windows interface: [IDataObject](https://learn.microsoft.com/en-us/windows/win32/api/objidl/nn-objidl-idataobject).

The stub declares none of the methods that get, set and describe data formats. The type exists so that other declarations of the package can name it: [**IRichEditOle.GetClipboardData**](IRichEditOle#getclipboarddata) and [**IRichEditOleCallback.GetClipboardData**](IRichEditOleCallback#getclipboarddata) return one, and [**IRichEditOle.ImportDataObject**](IRichEditOle#importdataobject) and [**IRichEditOleCallback.QueryAcceptData**](IRichEditOleCallback#queryacceptdata) take one. Nothing can be called through a variable of this type.

## See Also

- [IRichEditOle](IRichEditOle) interface -- the OLE objects in a Rich Edit control
- [IRichEditOleCallback](IRichEditOleCallback) interface -- what a Rich Edit control asks its container
- [IStorage](IStorage) interface -- stub for the structured-storage interface
