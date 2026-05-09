---
title: ContainedControls Module
parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/ContainedControls/
redirect_from:
  - /tB/Modules/ContainedControls
has_toc: false
---

# ContainedControls module

The **ContainedControls** object is a collection that exposes the controls placed inside an instance of a **UserControl** that has been set up as a control container. The author of the **UserControl** uses this collection to enumerate or inspect those constituent controls at run time. The author of the **UserControl** sees only what the consumer added — controls placed on the **UserControl** at design time by the author themselves are not part of this collection.

The collection is read-only: items cannot be added or removed through it, and the indexer returns existing controls only. To use it, the **UserControl**'s **ControlContainer** property must have been set to **True** at design time.

```tb
' Inside the UserControl that hosts other controls.
Private Sub UserControl_Resize()
    Dim ctl As Object
    For Each ctl In UserControl.ContainedControls
        ' Lay each consumer-placed control out within the UserControl.
    Next ctl
End Sub
```

## Members

### Count

Returns the number of controls in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **ContainedControls** object.

The value is a **Long**. Valid indexes for [**Item**](#item) run from `1` to **Count**.

### Item

Returns a single control from the collection by its one-based position.

Syntax: *object*.**Item(** *index* **)**

*object*
: *required* An object expression that evaluates to a **ContainedControls** object.

*index*
: *required* A **Long** giving the one-based position of the control to return. Must be between `1` and [**Count**](#count); otherwise an error occurs.

**Item** is the default member of **ContainedControls**, so the following lines are equivalent:

```tb
Set ctl = UserControl.ContainedControls.Item(1)
Set ctl = UserControl.ContainedControls(1)
```

The result is typed as **Object** because the consumer may have placed any kind of control inside the **UserControl**. Use [**TypeName**](../../../Modules/Information/TypeName) or **TypeOf** to discover the concrete type before binding to a specific control's properties.

### For Each iteration

A **ContainedControls** object can be iterated with the [**For Each...Next**](../../../Core/For-Each-Next) statement, which yields each control in turn, in the order the consumer added them. The hidden `_NewEnum` member supplies the enumerator and is not called directly from user code.

```tb
Dim ctl As Object
For Each ctl In UserControl.ContainedControls
    Debug.Print TypeName(ctl)
Next ctl
```
