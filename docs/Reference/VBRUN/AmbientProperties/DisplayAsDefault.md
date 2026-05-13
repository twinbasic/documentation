---
title: DisplayAsDefault
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/DisplayAsDefault
---
# DisplayAsDefault
{: .no_toc }

Returns whether the container is treating this control as its default control, as a **Boolean**. Read-only.

Syntax: *object*.**DisplayAsDefault**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The default control on a form is the one activated when the user presses **Enter** without first giving focus to another control — most often a command button. A control that wants to advertise its default-button status should paint itself with the heavier border or other distinguishing visual when **DisplayAsDefault** is **True**.

### See Also

- [ShowGrabHandles](ShowGrabHandles) property
- [ShowHatching](ShowHatching) property
- [SupportsMnemonics](SupportsMnemonics) property
