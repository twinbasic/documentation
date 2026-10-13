---
title: IOleInPlaceObjectWindowless
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceObjectWindowless
has_toc: false
---

# IOleInPlaceObjectWindowless interface
{: .no_toc }

Lets a container send window messages to an OLE object that is active in place and has no window of its own, and ask the object for its drop target.

**IOleInPlaceObjectWindowless** has the interface identifier `1C2056CC-5EF4-101B-8BC8-00AA003E3B29` and extends [**IOleInPlaceObject**](IOleInPlaceObject), so it also has the methods of that interface and of [**IOleWindow**](IOleWindow). It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleInPlaceObjectWindowless](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nn-ocidl-ioleinplaceobjectwindowless).

A small object, such as a control, does not need a window. The container receives the window messages for it and passes them on with **OnWindowMessage**, and the object takes part in drag and drop through the target that **GetDropTarget** returns.

The declaration is complete: it has both methods of the Windows interface. Both are marked `[PreserveSig]` and return the raw HRESULT as a **Long**, so a class cannot implement this interface; it is for calling. [IOleInPlaceObjectWindowlessVB](IOleInPlaceObjectWindowlessVB) declares **OnWindowMessage** in a form a class can implement.

## Methods

### OnWindowMessage

```tb inert=signature
[PreserveSig]
Function OnWindowMessage(ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByRef Result As LongPtr) As Long
```

Sends a window message from the container to the object. *wMsg* is the message identifier, and *wParam* and *lParam* are the parameters of the message, as the container received them. A position in *wParam* or *lParam* is in client coordinates of the container's window. *Result* receives the result code of the message.

The result of the call is the raw HRESULT: `S_OK` (0) when the object processed the message, and `S_FALSE` (1) when it did not. The container then processes the message itself or passes it to the default window procedure.

The container sends the mouse messages to the object that has captured the mouse, or else to the object under the pointer, and the keyboard messages to the object that has the focus.

### GetDropTarget

```tb inert=signature
[PreserveSig]
Function GetDropTarget(ByRef lppDropTarget As LongPtr) As Long
```

Returns the object's `IDropTarget` interface in *lppDropTarget*. A windowless object cannot register a drop target, because it has no window to register, so the container gets the interface here instead. The package does not declare `IDropTarget`, so the pointer is a **LongPtr**. The container gives the pointer back with **Release**, and may keep it for later drag operations until then.

The result is the raw HRESULT: `S_OK` (0) on success, and `E_NOTIMPL` (`&H80004001`) when the object does not support drag and drop.

## Example

This function sends a message to a windowless object and returns whether the object processed it. The result code of the message is not used.

```tb check_build
Private Function Deliver(ByVal Obj As IOleInPlaceObjectWindowless, ByVal Msg As Long, ByVal WParam As LongPtr, ByVal LParam As LongPtr) As Boolean
    Dim result As LongPtr
    Return Obj.OnWindowMessage(Msg, WParam, LParam, result) = 0
End Function
```

## See Also

- [IOleInPlaceObjectWindowlessVB](IOleInPlaceObjectWindowlessVB) interface -- Visual Basic-style **OnWindowMessage**
- [IOleInPlaceObject](IOleInPlaceObject) interface -- the base interface
- [IOleWindow](IOleWindow) interface -- returns the window handle of an OLE object
- [IOleInPlaceSite](IOleInPlaceSite) interface -- the container-side site for in-place activation
