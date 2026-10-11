---
title: IRichEditOleCallback
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IRichEditOleCallback
has_toc: false
---

# IRichEditOleCallback interface
{: .no_toc }

The interface that a Rich Edit control calls on its client to get storage for new objects, to ask whether to accept inserted objects and pasted data, and to ask for drag and drop effects and a context menu.

**IRichEditOleCallback** has the interface identifier `00020D03-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. The client implements the interface and gives it to the control by sending the `EM_SETOLECALLBACK` message. Microsoft Learn describes the Windows interface: [IRichEditOleCallback](https://learn.microsoft.com/en-us/windows/win32/api/richole/nn-richole-iricheditolecallback).

The declaration is complete: it has all 10 methods of the Windows interface, and none is marked `[PreserveSig]`, so a class can implement it. Every method is a **Sub**, which hides the HRESULT. An implementation returns a failure code by setting [**Err.ReturnHResult**](../../../Modules/ErrObject/ReturnHResult), and a success code other than `S_OK` the same way. Where a Windows method returns a pointer through a pointer-to-pointer parameter, the **Sub** takes a **ByRef** parameter of the interface type: assign it, or leave it `Nothing`.

A parameter that is a pointer to a structure the package does not declare (a `CHARRANGE*`) or to an object the package does not name (an `IOleObject*`) is a **LongPtr**. *RECO* is a clipboard operation flag: 0 for a paste (`RECO_PASTE`), 1 for a drop (`RECO_DROP`), 2 for a copy (`RECO_COPY`), 3 for a cut (`RECO_CUT`) and 4 for a drag (`RECO_DRAG`).

## Methods

### GetNewStorage

```tb inert=signature
Sub GetNewStorage(ByRef ppStorage As OLEGuids.IStorage)
```

Supplies storage for a new object that was pasted from the clipboard or read from an RTF stream. The result is an [IStorage](IStorage).

### GetInPlaceContext

```tb inert=signature
Sub GetInPlaceContext(ByRef ppFrame As OLEGuids.IOleInPlaceFrame, ByRef ppDoc As OLEGuids.IOleInPlaceUIWindow, ByRef pFrameInfo As OLEGuids.OLEINPLACEFRAMEINFO)
```

Supplies what in-place activation needs: the client's frame window in *ppFrame* as an [IOleInPlaceFrame](IOleInPlaceFrame), its document window in *ppDoc* as an [IOleInPlaceUIWindow](IOleInPlaceUIWindow), which can stay `Nothing` when the frame and document windows are the same, and the accelerator information in *pFrameInfo*, an [OLEINPLACEFRAMEINFO](OLEINPLACEFRAMEINFO).

### ShowContainerUI

```tb inert=signature
Sub ShowContainerUI(ByVal fShow As Long)
```

Tells the client to show its own user interface, when *fShow* is not 0, or to hide it, when it is 0. The control calls it when an object activates or deactivates its user interface in place.

### QueryInsertObject

```tb inert=signature
Sub QueryInsertObject(ByRef pCLSID As OLEGuids.OLECLSID, ByVal pStorage As OLEGuids.IStorage, ByVal CharPos As Long)
```

Asks whether the control may insert an object of the class *pCLSID*, which is stored in *pStorage*, at the character position *CharPos*. The control calls it when it pastes an object and when it reads RTF. Any result other than `S_OK` refuses the insertion.

### DeleteObject

```tb inert=signature
Sub DeleteObject(ByVal LpOleObject As LongPtr)
```

Tells the client that the object `IOleObject*` *LpOleObject* is about to be deleted from the control. The object is not necessarily released at that point.

### QueryAcceptData

```tb inert=signature
Sub QueryAcceptData(ByVal pDataObject As OLEGuids.IDataObject, ByRef CF As Integer, ByVal RECO As Long, ByVal fReally As Long, ByVal hMetaPict As LongPtr)
```

Asks whether the control should accept the data that is pasted or dragged in, an [IDataObject](IDataObject). *CF* holds the clipboard format to use; 0 selects the best available format, and a value the client changes it to is the only format the control then uses. *RECO* is 0 for a paste and 1 for a drop. *fReally* is not 0 when the paste or drop is happening, and 0 when the control only asks, such as for `EM_CANPASTE`. *hMetaPict* is the handle of a metafile that holds the icon view of the object, and is used only when a paste special operation imposes the icon aspect. A failure code refuses the data and ends the operation.

### ContextSensitiveHelp

```tb inert=signature
Sub ContextSensitiveHelp(ByVal fEnterMode As Long)
```

Tells the client to turn context-sensitive help mode on, when *fEnterMode* is not 0, or off, when it is 0. It has the meaning of [**IOleWindow.ContextSensitiveHelp**](IOleWindow#contextsensitivehelp).

### GetClipboardData

```tb inert=signature
Sub GetClipboardData(ByVal lpCharRange As LongPtr, ByVal RECO As Long, ByRef ppDataObject As OLEGuids.IDataObject)
```

Lets the client supply its own clipboard object, an [IDataObject](IDataObject), for the range of text that the `CHARRANGE` at *lpCharRange* holds.

### GetDragDropEffect

```tb inert=signature
Sub GetDragDropEffect(ByVal fDrag As Long, ByVal KeyState As Long, ByRef dwEffect As Long)
```

Lets the client set the effect of a drop. *fDrag* is not 0 when the query is for a drag over the control (`IDropTarget::DragEnter` or `DragOver`), and 0 when it is for the drop itself. *KeyState* is the key state as OLE defines it. On return, *dwEffect* is the effect that the control allows when *fDrag* is not 0, and the effect to use when it is 0.

### GetContextMenu

```tb inert=signature
Sub GetContextMenu(ByVal SelType As Integer, ByVal LpOleObject As LongPtr, ByVal lpCharRange As LongPtr, ByRef hMenu As LongPtr)
```

Asks the client for the context menu to show on a right-click. *SelType* describes the selection: 0 is empty (`SEL_EMPTY`), 1 is text (`SEL_TEXT`), 2 includes an object (`SEL_OBJECT`), 4 is more than one character of text (`SEL_MULTICHAR`) and 8 is more than one object (`SEL_MULTIOBJECT`). *LpOleObject* is an `IOleObject*` of the first selected object when *SelType* includes `SEL_OBJECT`, and 0 otherwise. *lpCharRange* points to the `CHARRANGE` of the selection. *hMenu* receives the handle of the menu; the control destroys it when it has finished. The control sends a `WM_COMMAND` message to its parent window when the user chooses an item.

## Example

This class refuses every object that a Rich Edit control tries to insert, and answers the other methods with `E_NOTIMPL` or accepts the default. A method that supplies an object leaves its parameter `Nothing` and reports `E_NOTIMPL`.

```tb check_build slot=file
Class NoObjects
    Implements IRichEditOleCallback

    Private Const E_NOTIMPL As Long = &H80004001
    Private Const E_FAIL As Long = &H80004005

    Private Sub IRichEditOleCallback_GetNewStorage(ByRef ppStorage As IStorage) Implements IRichEditOleCallback.GetNewStorage
        Err.ReturnHResult = E_NOTIMPL
    End Sub

    Private Sub IRichEditOleCallback_GetInPlaceContext(ByRef ppFrame As IOleInPlaceFrame, ByRef ppDoc As IOleInPlaceUIWindow, ByRef pFrameInfo As OLEINPLACEFRAMEINFO) Implements IRichEditOleCallback.GetInPlaceContext
        Err.ReturnHResult = E_NOTIMPL
    End Sub

    Private Sub IRichEditOleCallback_ShowContainerUI(ByVal fShow As Long) Implements IRichEditOleCallback.ShowContainerUI
    End Sub

    Private Sub IRichEditOleCallback_QueryInsertObject(ByRef pCLSID As OLECLSID, ByVal pStorage As IStorage, ByVal CharPos As Long) Implements IRichEditOleCallback.QueryInsertObject
        Err.ReturnHResult = E_FAIL
    End Sub

    Private Sub IRichEditOleCallback_DeleteObject(ByVal LpOleObject As LongPtr) Implements IRichEditOleCallback.DeleteObject
    End Sub

    Private Sub IRichEditOleCallback_QueryAcceptData(ByVal pDataObject As IDataObject, ByRef CF As Integer, ByVal RECO As Long, ByVal fReally As Long, ByVal hMetaPict As LongPtr) Implements IRichEditOleCallback.QueryAcceptData
    End Sub

    Private Sub IRichEditOleCallback_ContextSensitiveHelp(ByVal fEnterMode As Long) Implements IRichEditOleCallback.ContextSensitiveHelp
    End Sub

    Private Sub IRichEditOleCallback_GetClipboardData(ByVal lpCharRange As LongPtr, ByVal RECO As Long, ByRef ppDataObject As IDataObject) Implements IRichEditOleCallback.GetClipboardData
        Err.ReturnHResult = E_NOTIMPL
    End Sub

    Private Sub IRichEditOleCallback_GetDragDropEffect(ByVal fDrag As Long, ByVal KeyState As Long, ByRef dwEffect As Long) Implements IRichEditOleCallback.GetDragDropEffect
    End Sub

    Private Sub IRichEditOleCallback_GetContextMenu(ByVal SelType As Integer, ByVal LpOleObject As LongPtr, ByVal lpCharRange As LongPtr, ByRef hMenu As LongPtr) Implements IRichEditOleCallback.GetContextMenu
        Err.ReturnHResult = E_NOTIMPL
    End Sub
End Class
```

## See Also

- [IRichEditOle](IRichEditOle) interface -- the OLE objects in a Rich Edit control
- [IStorage](IStorage) interface -- stub for the structured-storage interface
- [IDataObject](IDataObject) interface -- stub for the data transfer interface
- [IOleInPlaceFrame](IOleInPlaceFrame) interface -- stub for the container's frame window
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- border space in a frame or document window
- [OLEINPLACEFRAMEINFO](OLEINPLACEFRAMEINFO) type -- accelerator information of an in-place frame
- [OLECLSID](OLECLSID) type -- a class or interface identifier
