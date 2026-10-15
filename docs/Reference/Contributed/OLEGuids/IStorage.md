---
title: IStorage
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IStorage
has_toc: false
---

# IStorage interface
{: .no_toc }

Names the COM structured-storage interface, which holds streams and nested storages in a compound file; declared here as a stub with no methods.

<!-- test: ImplementTests.IStorage_AnswersToItsIdentifier -->
**IStorage** has the interface identifier `0000000B-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Its description marks it as a stub and points to the tbShellLib package for the full version. Microsoft Learn describes the Windows interface: [IStorage](https://learn.microsoft.com/en-us/windows/win32/api/objidl/nn-objidl-istorage).
<!-- /test -->

The stub declares none of the methods that create, open, copy, enumerate and commit streams and storages. The type exists so that other declarations of the package can name it: [**IRichEditOle.SaveCompleted**](IRichEditOle#savecompleted) takes one, and [**IRichEditOleCallback.GetNewStorage**](IRichEditOleCallback#getnewstorage) and [**IRichEditOleCallback.QueryInsertObject**](IRichEditOleCallback#queryinsertobject) pass one. Nothing can be called through a variable of this type.

## See Also

- [IRichEditOle](IRichEditOle) interface -- the OLE objects in a Rich Edit control
- [IRichEditOleCallback](IRichEditOleCallback) interface -- what a Rich Edit control asks its container
- [IDataObject](IDataObject) interface -- stub for the data transfer interface
