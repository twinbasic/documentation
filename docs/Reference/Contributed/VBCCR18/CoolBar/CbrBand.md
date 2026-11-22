---
title: CbrBand
parent: CoolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/CoolBar/CbrBand
has_toc: false
---

# CbrBand class
{: .no_toc }

One band of a [**CoolBar**](.): its caption, its picture, its control, its size, its place and the way the user can move and resize it. A program gets one from the [**CbrBands**](CbrBands) collection, and from that collection's [**Add**](CbrBands#add) method.

```tb check_build check_run arch=win32,win64
Dim Band As CbrBand
Set Band = CoolBar1.Bands.Add(, "find", "Find")
Band.MinWidth = 600
Band.IdealWidth = 2400
Band.UseChevron = True
Debug.Print Band.Caption; " "; Band.UseChevron
' Output:
' Find True
```

A program cannot make a **CbrBand** object with **New**. A band that was removed from the collection no longer reaches the cool bar.

* TOC
{:toc}

## Size

The size of a band is its [**Width**](#width) along the row and its [**Height**](#height), which is that of its row. [**MinWidth**](#minwidth) and [**MinHeight**](#minheight) are the least room the band keeps for its control, and [**IdealWidth**](#idealwidth) is the width at which the band shows all it has. [**Maximize**](#maximize) gives the band its ideal width, and [**Minimize**](#minimize) its smallest. A band narrower than its ideal width shows a chevron button where [**UseChevron**](#usechevron) is **True**.

<!-- test: CoolBarTests.Band_FixedSize_WidthAndNewRowAreRefused -->
A band of style **CbrBandStyleFixedSize** has a width that the cool bar works out from its contents, and the user cannot change it. An assignment to its **Width** raises run-time error 35800, *Property is read-only if the style property is set to fixed size*, and an assignment of **True** to its **NewRow** raises error 35801.
<!-- /test -->

<!-- test: CoolBarTests.Band_Properties_ValuesOutOfRange_Raise380 -->
A negative **Width**, **MinWidth**, **MinHeight** or **IdealWidth** raises run-time error 380.
<!-- /test -->

## Moving the band

A band has two places. Its [**Index**](#index) is its place in the collection, and its [**Position**](#position) is its place in the cool bar. The user moves a band, and then its **Position** changes and its **Index** does not.

<!-- test: CoolBarTests.Band_Position_MovesTheBandNotItsIndex, CoolBarTests.Band_Position_NotAMove_Raises380 -->
```tb check_build check_run arch=win32,win64
CoolBar1.Bands.Clear
CoolBar1.Bands.Add , "file", "File"
CoolBar1.Bands.Add , "edit", "Edit"
CoolBar1.Bands("edit").Position = 1
Debug.Print CoolBar1.Bands("file").Position; CoolBar1.Bands("file").Index
' Output:
'  2  1
```

An assignment to **Position** that leaves the band where it is, such as its own position, and one that is outside the cool bar, raises run-time error 380.
<!-- /test -->

## A control in the band

[**Child**](#child) is the control the band holds, and the cool bar keeps it in the band's area: see [Holding a control](.#holding-a-control). [**ChildEdge**](#childedge) draws an edge at the top and the bottom of the area.

<!-- test: CoolBarTests.Band_Child_RefusedControl_IsNotKept -->
> [!WARNING] 1.8.142.0
> A control that **Child** refuses, with run-time error 380, is kept all the same: **Child** returns the control that was refused, though the band does not hold it. A program that catches the error assigns **Nothing** to **Child**.

Properties
----------

### BackColor
{: .no_toc }

The color behind the caption and the control of the band, while [**UseCoolBarColors**](#usecoolbarcolors) is **False**. **OLE_COLOR**. Default: **vbButtonFace**. It shows only while the control is drawn without visual styles.

### Caption
{: .no_toc }

The text in the band. **String**. Default: empty. It stands beside the grip, after the band's picture. [**HideCaption**](#hidecaption) keeps it from being drawn.

### Child
{: .no_toc }

The control that the band holds. A control object, or **Nothing** for a band without one. Assigned with **Set**, it puts the control into the band; the control has to be on the cool bar. See [Holding a control](.#holding-a-control) and the warning under [A control in the band](#a-control-in-the-band).

<!-- test: CoolBarTests.Band_Child_ControlNotOnTheCoolBar_Raises380 -->
A control that is not on the cool bar, and the cool bar itself, raise run-time error 380.
<!-- /test -->

### ChildEdge
{: .no_toc }

Whether the band draws an edge at the top and the bottom of its control. **Boolean**. Default: **False**.

<!-- test: CoolBarTests.Band_ChildEdge_False_TakesTheEdgeAway -->
An assignment of **False** takes the edge away again.
<!-- /test -->

### FixedBackground
{: .no_toc }

Whether the background picture stays fixed to the cool bar instead of moving with the band. **Boolean**. Default: **True**. It has an effect while the band has a picture, its own or that of the cool bar.

### ForeColor
{: .no_toc }

The color of the caption, while [**UseCoolBarColors**](#usecoolbarcolors) is **False**. **OLE_COLOR**. Default: **vbButtonText**.

### Gripper
{: .no_toc }

Whether the band shows its grip. A member of [**CbrBandGripperConstants**](.#cbrbandgripperconstants). Default: **CbrBandGripperNormal**. A value that is not a member raises run-time error 380.

### Height
{: .no_toc }

The height of the band, which is that of its row, in the container's scale units. **Single**, read-only.

<!-- test: CoolBarTests.Band_Height_Assigned_Raises383 -->
An assignment raises run-time error 383.
<!-- /test -->

### HideCaption
{: .no_toc }

Whether the caption is kept from being drawn. **Boolean**. Default: **False**.

### ID
{: .no_toc }

The number by which the cool bar's window knows the band, in the messages that Windows sends about it. **Long**, read-only. It stays with the band when the band moves.

### IdealWidth
{: .no_toc }

The width at which the band shows all it has, in the container's scale units. **Single**. Default: 0, which is no ideal width. See [Size](#size).

### Image
{: .no_toc }

The picture of the band: its number in the cool bar's [**ImageList**](.#imagelist), or its key. **Variant**. Default: 0, which is no picture. It is what the program gave to the property or to [**Add**](CbrBands#add): a key stays a key.

<!-- test: CoolBarTests.Band_Image_KeyWithoutAnImageListOrNegativeNumber_RaisesItsError -->
A key that the image list does not have, or a key when the cool bar has no image list, raises run-time error 35601, *Element not found*. A negative number raises error 35600, *Index out of bounds*, and the band keeps its picture after either error.
<!-- /test -->

### ImageIndex
{: .no_toc }

The number of the band's picture in the image list. **Long**, read-only. It is 0 for a band without a picture, and it is the number that a key stands for.

### Index
{: .no_toc }

The number of the band in the [**CbrBands**](CbrBands) collection, from 1. **Long**, read-only. It changes when a band is added or removed before this one, and not when the band is moved in the cool bar.

### Key
{: .no_toc }

The key of the band in the collection. **String**. Empty for a band without a key.

<!-- test: CoolBarTests.Band_Key_Assigned_RenamesTheBand -->
An assignment gives the band another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another band has raises run-time error 457, and the band keeps its key.
<!-- /test -->

### MinHeight
{: .no_toc }

The least height of the band's area, in the container's scale units. **Single**. Default: 24 device-independent pixels. See [Size](#size).

### MinWidth
{: .no_toc }

The least width of the band's area, in the container's scale units. **Single**. Default: 0. See [Size](#size).

### NewRow
{: .no_toc }

Whether the band starts a row of the cool bar. **Boolean**. Default: **False**.

<!-- test: CoolBarTests.Bands_Add_NewRowOnTheFirstBand_Raises35801 -->
The first band of the cool bar, at position 1, cannot start a row: **True** for it raises run-time error 35801, *Property is read-only if the style property is set to fixed size or the position property is 1*.
<!-- /test -->

### Picture
{: .no_toc }

A bitmap that fills the background of this band, while [**UseCoolBarPicture**](#usecoolbarpicture) is **False**. A picture object. Default: **Nothing**.

### Position
{: .no_toc }

The band's place in the cool bar, counted from 1 along the rows. **Long**. Assigned a number, it moves the band there. See [Moving the band](#moving-the-band).

### Style
{: .no_toc }

Whether the user can resize the band. A member of [**CbrBandStyleConstants**](.#cbrbandstyleconstants). Default: **CbrBandStyleNormal**. A value that is not a member raises run-time error 380.

### Tag
{: .no_toc }

A value of the program's own, which the cool bar does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**. A new band has an empty string.

### ToolTipText
{: .no_toc }

The text shown in a small window when the pointer rests on the band's caption, while the cool bar's [**ShowTips**](.#showtips) is **True**. **String**. Default: empty.

### UseChevron
{: .no_toc }

Whether the band shows a chevron button where the cool bar gives it less room than its [**IdealWidth**](#idealwidth). **Boolean**. Default: **False**. See [The chevron](.#the-chevron).

### UseCoolBarColors
{: .no_toc }

Whether the band takes the colors of the cool bar, its [**BackColor**](.#backcolor) and [**ForeColor**](.#forecolor), instead of its own. **Boolean**. Default: **True**.

### UseCoolBarPicture
{: .no_toc }

Whether the band takes the [**Picture**](.#picture) of the cool bar, instead of its own. **Boolean**. Default: **True**.

### Visible
{: .no_toc }

Whether the band is shown. **Boolean**. Default: **True**.

### Width
{: .no_toc }

The width of the band along its row, in the container's scale units. **Single**. See [Size](#size) for the case of a fixed size and for the values that are refused.

Methods
-------

### Maximize
{: .no_toc }

Makes the band as wide as its [**IdealWidth**](#idealwidth), or, for a band without one, as wide as the row allows. The other bands of the row make room.

Syntax: *object*.**Maximize**

### Minimize
{: .no_toc }

Makes the band as narrow as its [**MinWidth**](#minwidth) allows.

Syntax: *object*.**Minimize**

### PushChevron
{: .no_toc }

Presses the band's chevron button as the user does, which raises [**BandChevronPushed**](.#bandchevronpushed). It has an effect while [**UseChevron**](#usechevron) is **True** and the chevron is shown.

Syntax: *object*.**PushChevron**

## See Also

- [CoolBar](.) class
- [CbrBands](CbrBands) class -- the collection of the bands
- [CbrBandGripperConstants](.#cbrbandgripperconstants) -- the values of **Gripper**
- [CbrBandStyleConstants](.#cbrbandstyleconstants) -- the values of **Style**
