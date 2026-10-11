---
title: IOleInPlaceFrame
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceFrame
has_toc: false
---

# IOleInPlaceFrame interface
{: .no_toc }

Names the container's top-level frame window in in-place activation; declared here as a stub that adds no methods to **IOleInPlaceUIWindow**.

**IOleInPlaceFrame** has the interface identifier `00000116-0000-0000-C000-000000000046` and extends [**IOleInPlaceUIWindow**](IOleInPlaceUIWindow). It is declared `[OleAutomation(False)]`. Its description marks it as a stub and points to the tbShellLib package for the full version.

In Windows, the interface adds the container's menu and status line services to the border negotiation of **IOleInPlaceUIWindow**: **InsertMenus**, **SetMenu**, **RemoveMenus**, **SetStatusText**, **EnableModeless** and **TranslateAccelerator**. Microsoft Learn describes the Windows interface: [IOleInPlaceFrame](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleinplaceframe).

The stub declares none of those six. Through a variable of this type, only the four methods of **IOleInPlaceUIWindow** and the two of [**IOleWindow**](IOleWindow) can be called. The type is useful for naming a parameter: [**IOleInPlaceSite.GetWindowContext**](IOleInPlaceSite#getwindowcontext) and [**IRichEditOleCallback.GetInPlaceContext**](IRichEditOleCallback#getinplacecontext) return one.

## See Also

- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- the base interface
- [IOleWindow](IOleWindow) interface -- the base of the base interface
- [IOleInPlaceSite](IOleInPlaceSite) interface -- the container-side site for in-place activation
- [IRichEditOleCallback](IRichEditOleCallback) interface -- what a Rich Edit control asks its container
