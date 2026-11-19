---
title: Appearance
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/Appearance
has_toc: false
symbols:
  - LvwPictureAlignmentConstants
  - LvwVisualThemeConstants
---

# Appearance
{: .no_toc }

The colors, the border and the background picture of a [**ListView**](.), and the look of the lists of Windows Explorer.

```tb check_build
With ListView1
    .BorderStyle = CCBorderStyleSingle
    .VisualTheme = LvwVisualThemeExplorer     ' the selection and hot items of Windows Explorer
    .BackColor = RGB(250, 250, 245)
    .ForeColor = vbBlack
End With
```

* TOC
{:toc}

## Colors

[**BackColor**](#backcolor) fills the control behind the items, and [**ForeColor**](#forecolor) is the color of the texts. An item and a subitem can have a [**ForeColor**](LvwListItem#forecolor) of their own, and be [**Bold**](LvwListItem#bold); [**ResetForeColors**](Items#resetforecolors) takes their colors away again. The background of the texts is that of the control unless [**TextBackground**](#textbackground) makes it [**BackColor**](#backcolor), and [**ItemBkColor**](Items#itembkcolor) gives a row a color of its own.

## A background picture

[**Picture**](#picture) is drawn behind the items, at the corner or the middle that [**PictureAlignment**](#picturealignment) names, or repeated over the whole control. With [**PictureWatermark**](#picturewatermark) **True** it is a watermark instead, at the bottom right corner. A picture needs visual styles.

<!-- test: ListViewTests.Picture_Assigned_TurnsDoubleBufferOff -->
A picture that is not a watermark is drawn better without double buffering, so assigning one sets [**DoubleBuffer**](#doublebuffer) to **False**. A watermark sets it to **True** again.
<!-- /test -->

```tb check_build
Set ListView1.Picture = LoadPicture(App.Path & "\paper.bmp")
ListView1.PictureAlignment = LvwPictureAlignmentTile
ListView1.TextBackground = CCBackStyleTransparent     ' the picture shows behind the texts
```

Properties
----------

### BackColor
{: .no_toc }

The color behind the items. **OLE_COLOR**. Default: **vbWindowBackground**.

<!-- test: ListViewTests.BackColor_None_Raises380 -->
-1, which stands for no color, raises run-time error 380.
<!-- /test -->

### BorderStyle
{: .no_toc }

The border of the control. A member of [**CCBorderStyleConstants**](../Common#ccborderstyleconstants). Default: **CCBorderStyleSunken**. Another value raises run-time error 380.

### DoubleBuffer
{: .no_toc }

Whether the control draws its items in memory first and then copies them to the screen at once, which keeps them from flickering. **Boolean**. Default: **True**. It has an effect when the program has visual styles. [**Picture**](#picture) changes it; see [A background picture](#a-background-picture).

### ForeColor
{: .no_toc }

The color of the texts of the items and the subitems that have no color of their own. **OLE_COLOR**. Default: **vbWindowText**.

### Picture
{: .no_toc }

The picture drawn behind the items. A picture object, or **Nothing** (the default) for none. A bitmap is drawn as it is; an icon, on [**BackColor**](#backcolor). Assigned with **Set**.

### PictureAlignment
{: .no_toc }

Where [**Picture**](#picture) is drawn. A member of [**LvwPictureAlignmentConstants**](#lvwpicturealignmentconstants). Default: **LvwPictureAlignmentTopLeft**. Another value raises run-time error 380. While the picture is tiled, no column is shaded as the [**SelectedColumn**](Columns#selectedcolumn).

### PictureWatermark
{: .no_toc }

Whether [**Picture**](#picture) is a watermark, drawn at the bottom right corner whatever [**PictureAlignment**](#picturealignment) says. **Boolean**. Default: **False**.

### TextBackground
{: .no_toc }

What is behind the texts of the items. A member of [**CCBackStyleConstants**](../Common#ccbackstyleconstants): **CCBackStyleTransparent** (the default), with which the background or the picture shows behind them, or **CCBackStyleOpaque**, with which the texts are on [**BackColor**](#backcolor). Another value raises run-time error 380.

### VisualTheme
{: .no_toc }

Whether the control is drawn as the list views of Windows Explorer are. A member of [**LvwVisualThemeConstants**](#lvwvisualthemeconstants). Default: **LvwVisualThemeStandard**. Another value raises run-time error 380. It has an effect while the program has visual styles and [**VisualStyles**](../Common#visualstyles) is **True**.

## LvwPictureAlignmentConstants
{: #lvwpicturealignmentconstants }

The values of [**PictureAlignment**](#picturealignment).

| Member | Value | Description |
|---|---|---|
| **LvwPictureAlignmentTopLeft**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentTopLeft } | 0 | At the top left corner. |
| **LvwPictureAlignmentTopRight**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentTopRight } | 1 | At the top right corner. |
| **LvwPictureAlignmentBottomLeft**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentBottomLeft } | 2 | At the bottom left corner. |
| **LvwPictureAlignmentBottomRight**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentBottomRight } | 3 | At the bottom right corner. |
| **LvwPictureAlignmentCenter**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentCenter } | 4 | In the middle. |
| **LvwPictureAlignmentTile**{: #LvwPictureAlignmentConstants_LvwPictureAlignmentTile } | 5 | Repeated over the whole control, under the header in the report view. |

## LvwVisualThemeConstants
{: #lvwvisualthemeconstants }

The values of [**VisualTheme**](#visualtheme).

| Member | Value | Description |
|---|---|---|
| **LvwVisualThemeStandard**{: #LvwVisualThemeConstants_LvwVisualThemeStandard } | 0 | The visual style of the list view of Windows. |
| **LvwVisualThemeExplorer**{: #LvwVisualThemeConstants_LvwVisualThemeExplorer } | 1 | The visual style of the lists of Windows Explorer, with their colors for the selected and the hot items. |

## See Also

- [ListView](.) control
- [Common members](../Common) -- **Font**, **VisualStyles** and the enumerations of the border and the background
