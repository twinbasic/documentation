---
title: Line
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Line
has_toc: false
---

# Line class
{: .no_toc }

A single stroke used to draw a grid line, divider, or resizer bar — simpler than a full [**Border**](Borders#border-class) (no blend-with-background flag, no surrounding **Elements** array). Reached as [**WaynesGrid.VerticalLineOptions**](../WaynesGrid/#verticallineoptions), [**HorizontalLineOptions**](../WaynesGrid/#horizontallineoptions), and [**ResizerBar**](../WaynesGrid/#resizerbar).

```tb
With WaynesGrid1.VerticalLineOptions
    .StrokeSize = 1
    .Fill.ColorPoints.SetSolidColor &HD0D0D0    ' pale grey
End With
```

## Properties

### Fill
{: .no_toc }

The [**Fill**](Fill) that supplies the colour or gradient used to draw the line.

### StrokeSize
{: .no_toc }

The stroke thickness in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 0 (the line is not drawn until you assign a non-zero size).

## Events

### OnChanged
{: .no_toc }

Raised when [**StrokeSize**](#strokesize) or [**Fill**](#fill) is assigned, or when the contained [**Fill**](#fill) raises its own **OnChanged**.
