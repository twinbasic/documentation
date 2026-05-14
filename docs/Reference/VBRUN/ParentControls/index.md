---
title: ParentControls
parent: VBRUN Package
nav_order: 10
permalink: /tB/Packages/VBRUN/ParentControls/
redirect_from:
  - /tB/Modules/ParentControls
has_toc: false
---

# ParentControls class

The **ParentControls** object is the collection of other controls that live in the same container as a **UserControl** --- its siblings on the host form, frame, or page. It is reachable inside a **UserControl** through **UserControl.ParentControls** and lets the control discover and interact with the other controls around it without being given explicit references.

By default each item is returned wrapped in its host **Extender** --- the container's per-control adapter that adds layout properties (**Top**, **Left**, **Tag**, **Visible**, **Name**, and so on) on top of the control's own interface. Set [**ParentControlsType**](#parentcontrolstype) to **vbNoExtender** to receive the bare controls instead. The collection itself is read-only: items cannot be added or removed through it.

```tb
' Inside a UserControl: print the name and type of every sibling control.
Dim ctl As Object
For Each ctl In UserControl.ParentControls
    Debug.Print ctl.Name, TypeName(ctl)
Next ctl
```

## Members

### Count

Returns the number of controls in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **ParentControls** object.

The value is a **Long**. Valid indexes for [**Item**](#item) run from `1` to **Count**.

### Item

Returns a single control from the collection by its one-based position.

Syntax: *object*.**Item(** *index* **)**

*object*
: *required* An object expression that evaluates to a **ParentControls** object.

*index*
: *required* A **Long** giving the one-based position of the control to return. Must be between `1` and [**Count**](#count); otherwise an error occurs.

**Item** is the default member of **ParentControls**, so the following lines are equivalent:

```tb
Set ctl = UserControl.ParentControls.Item(1)
Set ctl = UserControl.ParentControls(1)
```

The result is typed as **Object** because the container may hold any kind of control. Whether the returned reference exposes the host-supplied **Extender** properties is governed by [**ParentControlsType**](#parentcontrolstype).

### ParentControlsType

Returns or sets whether each item is returned wrapped in its host **Extender** or as the bare control.

Syntax: *object*.**ParentControlsType** [ **=** *value* ]

*object*
: *required* An object expression that evaluates to a **ParentControls** object.

*value*
: A **ParentControlsType** value:

`vbExtender` (`1`)
: Items are returned wrapped in the host's **Extender**, exposing the container-supplied layout properties (**Top**, **Left**, **Visible**, **Name**, **Tag**, and so on) in addition to the control's own interface. This is the default.

`vbNoExtender` (`0`)
: Items are returned as the bare control, without the **Extender** wrapper. Use this when the **Extender**'s extra properties are not needed, or when the control's own interface defines members that would otherwise be shadowed.

Changing **ParentControlsType** affects subsequent reads from [**Item**](#item) and **For Each** iteration; references already obtained are not retroactively re-wrapped.

### For Each iteration

A **ParentControls** object can be iterated with the [**For Each...Next**](../../../Core/For-Each-Next) statement, which yields each sibling control in turn, in the order the host returns them. The hidden `_NewEnum` member supplies the enumerator and is not called directly from user code.

```tb
Dim ctl As Object
For Each ctl In UserControl.ParentControls
    Debug.Print ctl.Name
Next ctl
```
