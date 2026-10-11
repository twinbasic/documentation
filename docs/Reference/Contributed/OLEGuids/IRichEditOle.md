---
title: IRichEditOle
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IRichEditOle
has_toc: false
---

# IRichEditOle interface
{: .no_toc }

Gives a program access to the OLE objects in a Rich Edit control: counts them, reads and inserts them, and sets how they are hosted.

**IRichEditOle** has the interface identifier `00020D00-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. A program gets the interface by sending the `EM_GETOLEINTERFACE` message to a Rich Edit control. Microsoft Learn describes the Windows interface: [IRichEditOle](https://learn.microsoft.com/en-us/windows/win32/api/richole/nn-richole-iricheditole).

The declaration is complete: it has all 16 methods of the Windows interface. Every method except **GetClientSite** is marked `[PreserveSig]` and returns the raw HRESULT as a **Long**, so a class cannot implement this interface; it is for calling. **GetClientSite** hides the HRESULT: a failure code raises a run-time error.

Several parameters need declarations that the package does not have. The `REOBJECT` structure that **GetObject** and **InsertObject** pass is declared `As Any`: pass a variable of a structure with that layout. The `CHARRANGE` structure that **GetClipboardData** takes is a **LongPtr**. The strings of **ConvertObject** and **SetHostNames** are pointers to ANSI strings, not Unicode ones. The *iob* parameters are object indexes, which start at 0; -1 (`REO_IOB_SELECTION`) selects the selected object where a method allows it.

## Methods

### GetClientSite

```tb inert=signature
Function GetClientSite() As OLEGuids.IOleClientSite
```

Returns an [IOleClientSite](IOleClientSite) for a new object. Every object inserted into the control must use a client site returned by this method, and a site serves exactly one object.

### GetObjectCount

```tb inert=signature
[PreserveSig]
Function GetObjectCount() As Long
```

Returns the number of objects in the control. Unlike the other methods, the result is the count, not an HRESULT.

### GetLinkCount

```tb inert=signature
[PreserveSig]
Function GetLinkCount() As Long
```

Returns the number of objects in the control that are links. The result is the count, not an HRESULT.

### GetObject

```tb inert=signature
[PreserveSig]
Function GetObject(ByVal iob As Long, ByRef pREOBJECT As Any, ByVal dwFlags As Long) As Long
```

Fills the `REOBJECT` structure in *pREOBJECT* with information about the object at index *iob*, or about the object at the character position the structure holds when *iob* is -2 (`REO_IOB_USE_CP`). *dwFlags* says which interface pointers to return in the structure: 1 for the object (`REO_GETOBJ_POLEOBJ`), 2 for its storage (`REO_GETOBJ_PSTG`), 4 for its site (`REO_GETOBJ_POLESITE`), 7 for all of them (`REO_GETOBJ_ALL_INTERFACES`) and 0 for none. Each interface pointer returned has a reference that the caller releases.

### InsertObject

```tb inert=signature
[PreserveSig]
Function InsertObject(ByRef pREOBJECT As Any) As Long
```

Inserts the object that the `REOBJECT` structure in *pREOBJECT* describes into the control.

### ConvertObject

```tb inert=signature
[PreserveSig]
Function ConvertObject(ByVal iob As Long, ByRef pCLSIDNew As OLEGuids.OLECLSID, ByVal lpstrUserTypeNew As LongPtr /* ANSI */) As Long
```

Converts the object at index *iob* to the class that *pCLSIDNew* identifies. *lpstrUserTypeNew* is a pointer to the ANSI name of the new class that the user sees. The call reloads the object but does not update it; the caller does that.

### ActivateAs

```tb inert=signature
[PreserveSig]
Function ActivateAs(ByRef pCLSID As OLEGuids.OLECLSID, ByRef pCLSIDAs As OLEGuids.OLECLSID) As Long
```

Makes objects of the class *pCLSID* behave as objects of the class *pCLSIDAs*. The control unloads all objects of the old class, tells OLE to treat them as the new class, and reloads them. An object that cannot be reloaded is deleted.

### SetHostNames

```tb inert=signature
[PreserveSig]
Function SetHostNames(ByVal lpstrContainerApp As LongPtr /* ANSI */, ByVal lpstrContainerObj As LongPtr /* ANSI */) As Long
```

Sets the names of the container application and of its document or object that the control gives to every object it inserts. The parameters are pointers to ANSI strings. A server shows the names in its window when the object is opened.

### SetLinkAvailable

```tb inert=signature
[PreserveSig]
Function SetLinkAvailable(ByVal iob As Long, ByVal fAvailable As Long) As Long
```

Sets the link-available flag of the object at index *iob*: on when *fAvailable* is not 0, off when it is 0.

### SetDvaspect

```tb inert=signature
[PreserveSig]
Function SetDvaspect(ByVal iob As Long, ByVal dvAspect As Long) As Long
```

Sets the aspect in which the control draws the object at index *iob*, one of the `DVASPECT` values that OLE defines, such as 1 for the content and 4 for an icon. The control redraws the object. The drawing information that the object has cached is not changed; the caller does that.

### HandsOffStorage

```tb inert=signature
[PreserveSig]
Function HandsOffStorage(ByVal iob As Long) As Long
```

Tells the control to release its reference to the storage of the object at index *iob*. It does not call the object's own **HandsOffStorage**; the caller does that.

### SaveCompleted

```tb inert=signature
[PreserveSig]
Function SaveCompleted(ByVal iob As Long, ByVal pStorage As OLEGuids.IStorage) As Long
```

Tells the control that the most recent save of the object at index *iob* is complete. When *pStorage* is not `Nothing`, the control releases the storage it holds for the object and uses [IStorage](IStorage) *pStorage* from then on.

### InPlaceDeactivate

```tb inert=signature
[PreserveSig]
Function InPlaceDeactivate() As Long
```

Tells the control to deactivate the object that is active in place, if there is one.

### ContextSensitiveHelp

```tb inert=signature
[PreserveSig]
Function ContextSensitiveHelp(ByVal fEnterMode As Long) As Long
```

Tells the control to turn context-sensitive help mode on, when *fEnterMode* is not 0, or off, when it is 0. The control passes the change to the object that is active in place.

### GetClipboardData

```tb inert=signature
[PreserveSig]
Function GetClipboardData(ByVal lpCharRange As LongPtr, ByVal RECO As Long, ByRef ppDataObject As OLEGuids.IDataObject) As Long
```

Returns, in *ppDataObject*, a clipboard object for the range of text that the `CHARRANGE` at *lpCharRange* holds. The result is an [IDataObject](IDataObject). The Windows method ignores *RECO*.

### ImportDataObject

```tb inert=signature
[PreserveSig]
Function ImportDataObject(ByVal pDataObject As OLEGuids.IDataObject, ByVal CF As Integer, ByVal hMetaPict As LongPtr) As Long
```

Imports a clipboard object into the control, replacing the current selection. *CF* is the clipboard format to use, and 0 selects the best available format. *hMetaPict* is the handle of a metafile that holds the icon view of the object, and is used only when a paste special operation asks for the icon aspect.

## See Also

- [IRichEditOleCallback](IRichEditOleCallback) interface -- what a Rich Edit control asks its container
- [IOleClientSite](IOleClientSite) interface -- the container-side site of an embedded object
- [IStorage](IStorage) interface -- stub for the structured-storage interface
- [IDataObject](IDataObject) interface -- stub for the data transfer interface
- [OLECLSID](OLECLSID) type -- a class or interface identifier
