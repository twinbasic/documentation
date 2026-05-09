---
title: UserMode
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/UserMode
---
# UserMode
{: .no_toc }

Returns whether the control is running inside an application (**True**) or being edited inside a designer (**False**), as a **Boolean**. Read-only.

Syntax: *object*.**UserMode**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

This is the most-checked ambient property. A control should consult **UserMode** before doing anything that only makes sense at run time — connecting to a database, starting a timer, animating its own appearance — because at design time the host is showing a static representation of the control on a layout surface. When **UserMode** is **False**, the control should also be willing to draw selection adornments such as [**ShowGrabHandles**](ShowGrabHandles) and [**ShowHatching**](ShowHatching) on request.

### See Also

- [UIDead](UIDead) property
- [ShowGrabHandles](ShowGrabHandles) property
- [ShowHatching](ShowHatching) property
- [DisplayAsDefault](DisplayAsDefault) property
