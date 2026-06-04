---
title: Anchors
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Anchors
has_toc: false
---

# Anchors class
{: .no_toc }

Determines which sides of a control are attached to its parent container when the container is resized. A control with both **Left** and **Right** set to **True**, for example, keeps its left and right edges at the same distance from the container's edges, stretching horizontally as the container grows. Controls receive this object through their inherited **Anchors** property.

The default is **Left**=**True**, **Top**=**True**, **Right**=**False**, **Bottom**=**False** --- the control stays at the same offset from the upper-left corner of the container and does not resize. To make a control fill the bottom of its container as the form is resized, anchor it to **Left**, **Right**, and **Bottom**.

```tb
With txtNotes.Anchors
    .Left = True
    .Top = True
    .Right = True
    .Bottom = True
End With
```

## Properties

### Bottom
{: .no_toc }

When **True**, the control's bottom edge stays at the same distance from the container's bottom edge. **Boolean**, default **False**.

### Left
{: .no_toc }

When **True**, the control's left edge stays at the same distance from the container's left edge. **Boolean**, default **True**.

### Right
{: .no_toc }

When **True**, the control's right edge stays at the same distance from the container's right edge. **Boolean**, default **False**.

### Top
{: .no_toc }

When **True**, the control's top edge stays at the same distance from the container's top edge. **Boolean**, default **True**.

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the four anchor flags is assigned. The hosting control listens for this event and re-applies the docking layout. Application code does not normally subscribe directly.
