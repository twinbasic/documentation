---
title: OLEINPLACEFRAMEINFO
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLEINPLACEFRAMEINFO
has_toc: false
---

# OLEINPLACEFRAMEINFO type
{: .no_toc }

The accelerator information of a container's frame window in in-place activation, with the layout of the Windows `OLEINPLACEFRAMEINFO` structure.

**OLEINPLACEFRAMEINFO** is a user-defined type declared in the package's `OLEGuids` module, so both `OLEINPLACEFRAMEINFO` and `OLEGuids.OLEINPLACEFRAMEINFO` name it. It mirrors the Windows structure [OLEINPLACEFRAMEINFO](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/ns-oleidl-oleinplaceframeinfo).

```tb inert=signature
Public Type OLEINPLACEFRAMEINFO
    cb As Long
    fMDIApp As Long
    hWndFrame As LongPtr
    hAccel As LongPtr
    cAccelEntries As Long
End Type
```

## Fields

*cb*
: A **Long** holding the size of the structure, in bytes.

*fMDIApp*
: A **Long** that is not 0 when the container is a multiple-document interface (MDI) application, and 0 when it is not.

*hWndFrame*
: A **LongPtr** holding the handle of the container's top-level frame window.

*hAccel*
: A **LongPtr** holding the handle of the accelerator table that the container uses in its frame.

*cAccelEntries*
: A **Long** holding the number of entries in that table.

## Where it is used

- [**IRichEditOleCallback.GetInPlaceContext**](IRichEditOleCallback#getinplacecontext) -- takes it by reference as *pFrameInfo*.
- [**IOleInPlaceSite.GetWindowContext**](IOleInPlaceSite#getwindowcontext) -- takes a pointer to it as *lpFrameInfo*, declared as a **LongPtr**: pass the address of an **OLEINPLACEFRAMEINFO** variable with [**VarPtr**](../../../Modules/Information/VarPtr).

## See Also

- [IOleInPlaceSite](IOleInPlaceSite) interface -- the container-side site for in-place activation
- [IRichEditOleCallback](IRichEditOleCallback) interface -- what a Rich Edit control asks its container
- [IOleInPlaceFrame](IOleInPlaceFrame) interface -- stub for the container's frame window
