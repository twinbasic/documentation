---
title: Column
parent: WaynesGrid
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesGrid/Column
has_toc: false
---

# Column class
{: .no_toc }

One column of a [**WaynesGrid**](.). Has a [**Caption**](#caption) that is shown in the column-header row and a [**Width**](#width) that the user can drag at run time. Elements of [**WaynesGrid.Columns**](.#columns).

```tb
ReDim Grid1.Columns(2)
Set Grid1.Columns(0) = New Column
Grid1.Columns(0).Caption = "ID"
Grid1.Columns(0).Width = 80
```

## Properties

### Caption
{: .no_toc }

The text shown in the column-header cell. **String**. Default: `"Column"`.

### Width
{: .no_toc }

The column's width in pixels (unscaled by DPI). [**PixelCount**](../Enumerations/PixelCount). Default: 100. Editable by the user at run time by dragging the resizer bar on the column's right edge; assignments at run time update the grid immediately.

## Events

### OnChanged
{: .no_toc }

Raised when [**Caption**](#caption) or [**Width**](#width) is assigned. The parent [**WaynesGrid**](.) listens for this and requests a repaint.
