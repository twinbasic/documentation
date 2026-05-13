---
title: CellRenderingOptions
parent: WaynesGrid
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesGrid/CellRenderingOptions
has_toc: false
---

# CellRenderingOptions class
{: .no_toc }

A bundle of the style objects that describe one *category* of cell in a [**WaynesGrid**](.). Each grid carries six parallel instances — one for column headers, one for row headers, one for normal cells, one for the hovered cell, one for the selected cell, and one for cells inside a full-row or full-column multi-selection — and the grid picks the appropriate instance per cell at paint time.

```tb
With Grid1.SelectedCellOptions
    .Fill.ColorPoints.SetSolidColor &HFFEEAA   ' pale blue
    .Borders.SetSimpleBorder StrokeSize:=2, ColorRGB:=vbBlue
End With
```

## Properties

### Borders
{: .no_toc }

The [**Borders**](../Styles/Borders) drawn around the cell.

### Corners
{: .no_toc }

The [**Corners**](../Styles/Corners) that controls the per-corner shape and radius of the cell. Most cells use the default sharp 90° corners; rounded corners only really make sense on a single highlighted cell rather than on every cell in a column.

### Cursor
{: .no_toc }

The mouse cursor shown when the pointer is over this category of cell. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants). Defaults to **vbDefault**; the grid sets **vbHand** on the column-header and row-header instances internally to indicate that those rows / columns are clickable for multi-selection.

### Fill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the cell background. Newly-constructed **CellRenderingOptions** instances default to a solid mid-grey background ([**WAYNESCOLOR_GREY**](#) — `&H808080`).

### TextRendering
{: .no_toc }

The [**TextRendering**](../Styles/TextRendering) that controls how the cell's text (supplied by the [**GetCellText**](.#getcelltext) event) is drawn.

## Methods

### New
{: .no_toc }

Constructs a [**CellRenderingOptions**](#) with the default mid-grey fill.

Syntax: **New CellRenderingOptions**

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the contained style objects raises its own **OnChanged**, or when [**Cursor**](#cursor) is assigned. The parent [**WaynesGrid**](.) listens for this and requests a repaint.
