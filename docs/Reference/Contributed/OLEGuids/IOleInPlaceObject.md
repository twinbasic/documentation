---
title: IOleInPlaceObject
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceObject
has_toc: false
---

# IOleInPlaceObject interface
{: .no_toc }

Lets a container deactivate an OLE object that is active in place, and tell the object where it is drawn.

**IOleInPlaceObject** has the interface identifier `00000113-0000-0000-C000-000000000046` and extends [**IOleWindow**](IOleWindow), so it also has that interface's **GetWindow** and **ContextSensitiveHelp** methods. It is declared `[OleAutomation(False)]`. All four methods hide the HRESULT: a failure code raises a run-time error. Microsoft Learn describes the Windows interface: [IOleInPlaceObject](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleinplaceobject).

The declaration is complete: it has every method of the Windows interface.

## Methods

### InPlaceDeactivate

```tb inert=signature
Sub InPlaceDeactivate()
```

Deactivates the object, which stops being active in place, and releases the resources it took for in-place activation.

### UIDeactivate

```tb inert=signature
Sub UIDeactivate()
```

Removes the object's user interface, such as its menus and toolbars, from the container's windows. The object stays active in place.

### SetObjectRects

```tb inert=signature
Sub SetObjectRects(ByVal lprcPosRect As LongPtr, ByVal lprcClipRect As LongPtr)
```

Tells the object how much of itself is visible. *lprcPosRect* points to a `RECT` holding the object's position in its parent window, and *lprcClipRect* to a `RECT` holding the rectangle it must be clipped to. Both are pointers: pass the address of an [OLERECT](OLERECT) with [**VarPtr**](../../../Modules/Information/VarPtr).

### ReactivateAndUndo

```tb inert=signature
Sub ReactivateAndUndo()
```

Reactivates an object that was deactivated, and undoes the changes made since it was activated.

## Example

This procedure gives an in-place object a position and a clipping rectangle of the same size, with its upper-left corner at the origin of its parent window.

```tb check_build
Private Sub PlaceObject(ByVal Obj As IOleInPlaceObject, ByVal Width As Long, ByVal Height As Long)
    Dim area As OLERECT
    area.Right = Width
    area.Bottom = Height
    Obj.SetObjectRects VarPtr(area), VarPtr(area)
End Sub
```

## See Also

- [IOleWindow](IOleWindow) interface -- the base interface
- [IOleInPlaceObjectWindowless](IOleInPlaceObjectWindowless) interface -- extends this interface for an object that has no window
- [IOleInPlaceSite](IOleInPlaceSite) interface -- the container-side site for in-place activation
- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) interface -- messages, activation and border changes for an in-place active object
- [OLERECT](OLERECT) type -- a rectangle
