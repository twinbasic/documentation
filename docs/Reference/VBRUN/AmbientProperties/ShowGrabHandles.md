---
title: ShowGrabHandles
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/ShowGrabHandles
---
# ShowGrabHandles
{: .no_toc }

Returns whether the container would like the control to draw selection grab handles, as a **Boolean**. Read-only.

Syntax: *object*.**ShowGrabHandles**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

Grab handles are the small squares drawn on the corners and edges of a selected control on a designer surface. A simple control can leave the grab handles to the host and ignore this property; a control that paints its own selection feedback (for example, because it occupies its full client area) should draw them when **ShowGrabHandles** is **True**. The property is generally only meaningful while [**UserMode**](UserMode) is **False**.

### See Also

- [ShowHatching](ShowHatching) property
- [UserMode](UserMode) property
- [DisplayAsDefault](DisplayAsDefault) property
