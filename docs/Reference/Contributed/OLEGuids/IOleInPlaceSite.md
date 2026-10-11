---
title: IOleInPlaceSite
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceSite
has_toc: false
---

# IOleInPlaceSite interface
{: .no_toc }

The container-side site for in-place activation: a container learns through it when its object is activated and deactivated, and gives the object the windows and rectangles it needs.

**IOleInPlaceSite** has the interface identifier `00000119-0000-0000-C000-000000000046` and extends [**IOleWindow**](IOleWindow), so it also has that interface's **GetWindow** and **ContextSensitiveHelp** methods. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleInPlaceSite](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleinplacesite).

The declaration is complete: it has all ten methods of the Windows interface. **CanInPlaceActivate** is marked `[PreserveSig]`, so a class cannot implement this interface; it is for calling. The other nine hide the HRESULT: a failure code raises a run-time error.

A parameter that is a pointer to a structure (a `RECT*`, an `OLEINPLACEFRAMEINFO*`) is a **LongPtr**: pass the address of an [OLERECT](OLERECT) or an [OLEINPLACEFRAMEINFO](OLEINPLACEFRAMEINFO) with [**VarPtr**](../../../Modules/Information/VarPtr).

## Methods

### CanInPlaceActivate

```tb inert=signature
[PreserveSig]
Function CanInPlaceActivate() As Long
```

Asks whether the container can activate the object in place. The result is the raw HRESULT: `S_OK` (0) when it can and `S_FALSE` (1) when it cannot.

### OnInPlaceActivate

```tb inert=signature
Sub OnInPlaceActivate()
```

Tells the container that its object is about to be activated in place.

### OnUIActivate

```tb inert=signature
Sub OnUIActivate()
```

Tells the container that the object is about to replace the container's menus and toolbars with its own.

### GetWindowContext

```tb inert=signature
Sub GetWindowContext(ByRef ppFrame As OLEGuids.IOleInPlaceFrame, ByRef ppDoc As OLEGuids.IOleInPlaceUIWindow, ByVal lprcPosRect As LongPtr, ByVal lprcClipRect As LongPtr, ByVal lpFrameInfo As LongPtr)
```

Returns what the object needs to run in place. *ppFrame* receives the container's [IOleInPlaceFrame](IOleInPlaceFrame), and *ppDoc* its document window's [IOleInPlaceUIWindow](IOleInPlaceUIWindow), or `Nothing` when the document window is the frame window. The container writes the object's position in its parent window to the `RECT` that *lprcPosRect* points to, and the outer clipping rectangle to the one that *lprcClipRect* points to. It fills the `OLEINPLACEFRAMEINFO` that *lpFrameInfo* points to.

### Scroll

```tb inert=signature
Sub Scroll(ByVal scrollExtant As Currency)
```

Asks the container to scroll the object by a number of pixels. The Windows method takes a `SIZE` by value, the distances in the x and y directions. This declaration passes the same eight bytes as a **Currency**. After the scroll, the container gives the object the new clipping rectangle with [**IOleInPlaceObject.SetObjectRects**](IOleInPlaceObject#setobjectrects).

### OnUIDeactivate

```tb inert=signature
Sub OnUIDeactivate(ByVal fUndoable As Long)
```

Tells the container that the object deactivated its user interface, so the container restores its own menus and toolbars. *fUndoable* is not 0 when the object can undo the changes made since it was activated.

### OnInPlaceDeactivate

```tb inert=signature
Sub OnInPlaceDeactivate()
```

Tells the container that the object is no longer active in place.

### DiscardUndoState

```tb inert=signature
Sub DiscardUndoState()
```

Tells the container to discard the undo state that the object kept for **ReactivateAndUndo**, because the object can no longer undo.

### DeactivateAndUndo

```tb inert=signature
Sub DeactivateAndUndo()
```

Asks the container to deactivate the object and return it to the state it had before it was activated.

### OnPosRectChange

```tb inert=signature
Sub OnPosRectChange(ByVal lprcPosRect As LongPtr)
```

Tells the container that the object's position changed. *lprcPosRect* points to a `RECT` holding the new position.

## See Also

- [IOleWindow](IOleWindow) interface -- the base interface
- [IOleInPlaceObject](IOleInPlaceObject) interface -- activates and deactivates an object in place
- [IOleInPlaceFrame](IOleInPlaceFrame) interface -- the container's frame window
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- border space in a frame or document window
- [OLERECT](OLERECT) type -- a rectangle
- [OLEINPLACEFRAMEINFO](OLEINPLACEFRAMEINFO) type -- accelerator information of an in-place frame
