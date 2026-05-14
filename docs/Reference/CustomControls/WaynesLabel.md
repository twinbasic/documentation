---
title: WaynesLabel
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesLabel
has_toc: false
---

# WaynesLabel class
{: .no_toc }

A static text-display control. Paints a [**Caption**](#caption) string inside its rectangle using the configured [**TextRendering**](#textrendering), on top of a [**BackgroundFill**](#backgroundfill). The label has no interactive states — appearance is the same whether the mouse is hovering over it or not.

```tb
Private Sub Form_Load()
    Label1.Caption = "Hello, world"
    With Label1.TextRendering
        .Font.Size = 14
        .Font.Weight = tbBold
        .Alignment = tbAlignMiddleCenter
        .Fill.ColorPoints.SetSolidColor vbWhite
    End With
    Label1.BackgroundFill.ColorPoints.SetSolidColor vbBlue
End Sub
```

Because [**BackgroundFill**](#backgroundfill) and [**TextRendering**](#textrendering) accept the same [**Fill**](Styles/Fill) gradients and the same [**Outlines**](Styles/TextRendering#outlines) array as any other control, a label can serve as a banner, header strip, or status panel without dropping a heavier control onto the form. Setting [**TextRendering.OverflowMode**](Styles/TextRendering#overflowmode) to **tbShrinkToFit** keeps a dynamically-set caption visible even when it is wider than the label:

```tb
With Label1.TextRendering
    .Font.Size = 24
    .Font.Weight = tbBold
    .Alignment = tbAlignMiddleCenter
    .OverflowMode = tbShrinkToFit
    .Fill.SetSimplePattern vbWhite, &HCCCCFF, _
            Pattern:=tbGradientNorthToSouth
End With
Label1.BackgroundFill.SetSimplePattern &H014C99, &H99CCFF, _
        Pattern:=tbGradientNorthWestToSouthEast
```

## Properties

### Anchors
{: .no_toc }

Which sides of the control are attached to its container during resize. [**Anchors**](Styles/Anchors). Inherited.

### BackgroundFill
{: .no_toc }

The [**Fill**](Styles/Fill) that paints the label's entire client area.

### Caption
{: .no_toc }

The text displayed on the label. **String**. Default: `"Label"`.

Syntax: *object*.**Caption** [ = *string* ]

### Dock
{: .no_toc }

How the control is docked inside its container. A member of [**DockMode**](Enumerations/DockMode). Inherited.

### Height
{: .no_toc }

The control's height in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Left
{: .no_toc }

The horizontal offset of the control's left edge from its container, in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. **String**. Inherited.

### TextRendering
{: .no_toc }

The [**TextRendering**](Styles/TextRendering) that controls how the [**Caption**](#caption) is drawn — font, padding, fill, outlines, alignment, and overflow.

### Top
{: .no_toc }

The vertical offset of the control's top edge from its container, in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.

### Visible
{: .no_toc }

Whether the control is currently displayed. **Boolean**. Inherited. Default: **True**.

### Width
{: .no_toc }

The control's width in pixels. [**PixelCount**](Enumerations/PixelCount). Inherited.
