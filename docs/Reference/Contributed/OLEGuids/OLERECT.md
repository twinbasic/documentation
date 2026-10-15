---
title: OLERECT
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLERECT
has_toc: false
---

# OLERECT type
{: .no_toc }

<!-- test: TypeLayoutTests.OLERECT_HasTheLayoutOfRect -->
A rectangle, with the layout of the Windows `RECT` structure.

**OLERECT** is a user-defined type declared in the package's `OLEGuids` module, so both `OLERECT` and `OLEGuids.OLERECT` name it. It mirrors the Windows structure [RECT](https://learn.microsoft.com/en-us/windows/win32/api/windef/ns-windef-rect), which holds the coordinates of the upper-left and lower-right corners of a rectangle.
<!-- /test -->

```tb inert=signature
Public Type OLERECT
    Left As Long
    Top As Long
    Right As Long
    Bottom As Long
End Type
```

## Fields

*Left*
: A **Long** holding the x coordinate of the upper-left corner.

*Top*
: A **Long** holding the y coordinate of the upper-left corner.

*Right*
: A **Long** holding the x coordinate of the lower-right corner.

*Bottom*
: A **Long** holding the y coordinate of the lower-right corner.

## Where it is used

No method of the package takes an **OLERECT** by name. The methods that take a `RECT*` declare the parameter as a **LongPtr**, and the address of an **OLERECT** variable, from [**VarPtr**](../../../Modules/Information/VarPtr), fits it:

- [**IOleObject.DoVerb**](IOleObject#doverb) -- *lprcPosRect*
- [**IOleInPlaceObject.SetObjectRects**](IOleInPlaceObject#setobjectrects) -- *lprcPosRect* and *lprcClipRect*
- [**IOleInPlaceActiveObject.ResizeBorder**](IOleInPlaceActiveObject#resizeborder) -- *prcBorder*
- [**IOleInPlaceUIWindow.GetBorder**](IOleInPlaceUIWindow#getborder) -- *lpRectBorder*
- [**IOleInPlaceUIWindow.RequestBorderSpace**](IOleInPlaceUIWindow#requestborderspace) and [**SetBorderSpace**](IOleInPlaceUIWindow#setborderspace) -- *pBorderWidths*, a `RECT` that holds four widths
- [**IOleInPlaceSite.GetWindowContext**](IOleInPlaceSite#getwindowcontext) -- *lprcPosRect* and *lprcClipRect*
- [**IOleInPlaceSite.OnPosRectChange**](IOleInPlaceSite#onposrectchange) -- *lprcPosRect*

## Example

This function asks a frame or document window for its border rectangle and returns the width of the rectangle.

```tb check_build
Private Function BorderWidth(ByVal Window As IOleInPlaceUIWindow) As Long
    Dim border As OLERECT
    Window.GetBorder VarPtr(border)
    Return border.Right - border.Left
End Function
```

## See Also

- [OLEPOINT](OLEPOINT) type -- a point
- [OLESIZE](OLESIZE) type -- a width and a height
- [IOleInPlaceObject](IOleInPlaceObject) interface -- activates and deactivates an object in place
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- border space in a frame or document window
