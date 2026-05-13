---
title: WaynesFrame
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesFrame
has_toc: false
---

# WaynesFrame class
{: .no_toc }

A rectangular container control whose entire area is painted with a configurable [**BackgroundFill**](#backgroundfill). Used to group other controls on a [**WaynesForm**](WaynesForm/), with the same layout / sizing surface as any other custom control.

The default fill is a solid mid-grey ([**WAYNESCOLOR_GREY**](#) — `&H808080`); change it by reaching into the **Fill.ColorPoints** collection.

```tb
Private Sub Form_Load()
    Frame1.BackgroundFill.ColorPoints.SetSolidColor vbWhite
End Sub
```

## Properties

### Anchors
{: .no_toc }

Which sides of the control are pinned to its container during resize. [**Anchors**](Styles/Anchors). Inherited.

### BackgroundFill
{: .no_toc }

The [**Fill**](Styles/Fill) that paints the frame's entire client area.

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](Enumerations/DockMode). Inherited. Default: **tbDockNone**.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### Top
{: .no_toc }

The vertical offset of the control's top edge from its container, in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.
