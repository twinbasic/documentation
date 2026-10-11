---
title: IOleInPlaceUIWindow
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceUIWindow
has_toc: false
---

# IOleInPlaceUIWindow interface
{: .no_toc }

Lets an object that is active in place negotiate border space for its tools in a container's frame or document window.

**IOleInPlaceUIWindow** has the interface identifier `00000115-0000-0000-C000-000000000046` and extends [**IOleWindow**](IOleWindow), so it also has that interface's **GetWindow** and **ContextSensitiveHelp** methods. It is declared `[OleAutomation(False)]`. All four methods hide the HRESULT: a failure code raises a run-time error. Microsoft Learn describes the Windows interface: [IOleInPlaceUIWindow](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleinplaceuiwindow).

The declaration is complete: it has every method of the Windows interface. [IOleInPlaceFrame](IOleInPlaceFrame) extends it.

The *pBorderWidths* parameters point to a `BORDERWIDTHS` structure, which is a `RECT` whose four fields are the widths, in pixels, needed on the left, top, right and bottom sides. An [OLERECT](OLERECT) has that layout.

## Methods

### GetBorder

```tb inert=signature
Sub GetBorder(ByVal lpRectBorder As LongPtr)
```

Writes into the `RECT` that *lpRectBorder* points to the outer rectangle in which the object can place its tools, such as the address of an [OLERECT](OLERECT).

### RequestBorderSpace

```tb inert=signature
Sub RequestBorderSpace(ByVal pBorderWidths As LongPtr)
```

Asks whether the window can give up the border widths that *pBorderWidths* holds. A window that supports no toolbars, or has no room, returns `INPLACE_E_NOTOOLSPACE`, which raises a run-time error. The space is not allocated until **SetBorderSpace**, so the object can negotiate before it moves its tools.

### SetBorderSpace

```tb inert=signature
Sub SetBorderSpace(ByVal pBorderWidths As LongPtr)
```

Allocates the border space that **RequestBorderSpace** accepted. A null pointer (0) says that the object does not need any space.

### SetActiveObject

```tb inert=signature
Sub SetActiveObject(ByVal pActiveObject As OLEGuids.IOleInPlaceActiveObject, ByVal lpszObjName As LongPtr)
```

Gives the window the [IOleInPlaceActiveObject](IOleInPlaceActiveObject) of the object, which sets up a direct channel between the two. *lpszObjName* is a pointer to a Unicode string that names the object for the container's window title, or 0 when the object does not need the title changed. A deactivating object passes `Nothing` and 0.

## See Also

- [IOleWindow](IOleWindow) interface -- the base interface
- [IOleInPlaceFrame](IOleInPlaceFrame) interface -- the container's frame window
- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) interface -- messages, activation and border changes for an in-place active object
- [OLERECT](OLERECT) type -- a rectangle
