---
title: SbrPanel
parent: StatusBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/StatusBar/SbrPanel
has_toc: false
---

# SbrPanel class
{: .no_toc }

One panel of a [**StatusBar**](.): what it shows, its look, its place and its width. A program gets one from the [**SbrPanels**](SbrPanels) collection, and from that collection's [**Add**](SbrPanels#add) method. It cannot make an **SbrPanel** object with **New**.

```tb check_build check_run arch=win32,win64
Dim Panel As SbrPanel
Set Panel = StatusBar1.Panels.Add(, "pos", "Ln 1")
Panel.Alignment = SbrPanelAlignmentCenter
Panel.Bold = True
Panel.ToolTipText = "The line of the caret"
Debug.Print Panel.Text; Panel.Index
' Output:
' Ln 1 2
```

The properties that give a panel a place and a width are in [The width of a panel](.#the-width-of-a-panel) of the control's page.

* TOC
{:toc}

Properties
----------

### Alignment
{: .no_toc }

Where the panel puts its text and its picture. A member of [**SbrPanelAlignmentConstants**](.#sbrpanelalignmentconstants). Default: **SbrPanelAlignmentLeft**.

<!-- test: StatusBarTests.Panel_ValuesOutsideTheEnumerations_Raise380 -->
A value that is not a member raises run-time error 380.
<!-- /test -->

### AutoSize
{: .no_toc }

How the panel's width is decided. A member of [**SbrPanelAutoSizeConstants**](.#sbrpanelautosizeconstants). Default: **SbrPanelAutoSizeNone**. A value that is not a member raises run-time error 380. See [The width of a panel](.#the-width-of-a-panel).

### Bevel
{: .no_toc }

The border of the panel. A member of [**SbrPanelBevelConstants**](.#sbrpanelbevelconstants). Default: **SbrPanelBevelInset**. A value that is not a member raises run-time error 380.

### Bold
{: .no_toc }

Whether the panel's text is drawn in a bold form of the control's **Font**. **Boolean**. Default: **False**.

### DTFormat
{: .no_toc }

The format of the date and the time that a panel of the styles **SbrPanelStyleTime**, **SbrPanelStyleDate** and **SbrPanelStyleDateTime** shows. A member of [**SbrPanelDTFormatConstants**](.#sbrpaneldtformatconstants). Default: **SbrPanelDTFormatShort**. A value that is not a member raises run-time error 380. With **SbrPanelDTFormatCustom** the panel's [**Text**](#text) is the format string, as the **Format** function takes it.

### Enabled
{: .no_toc }

Whether the panel's text is drawn as enabled, in [**ForeColor**](#forecolor), or in the gray of disabled text with a dimmed picture. **Boolean**. Default: **True**. A panel whose [**Style**](#style) shows the name of a key follows the key instead, see [What a panel shows](.#what-a-panel-shows).

### ForeColor
{: .no_toc }

The color of the panel's text. **OLE_COLOR**. Default: **vbButtonText**.

### Index
{: .no_toc }

The number of the panel in the bar, from 1. **Long**, read-only. It changes when a panel is added or removed before this one.

### Key
{: .no_toc }

The key of the panel in the [**SbrPanels**](SbrPanels) collection. **String**. Empty for a panel without a key.

<!-- test: StatusBarTests.Key_Assigned_RenamesTheTakesAwayAndRefusesAKeyInUse -->
An assignment gives the panel another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another panel has raises run-time error 457, and the panel keeps its key.
<!-- /test -->

### Left
{: .no_toc }

The distance from the left edge of the control to the left edge of the panel, in the scale units of the control's container. **Single**, read-only.

<!-- test: StatusBarTests.Left_Assigned_Raises383 -->
An assignment raises run-time error 383.
<!-- /test -->

### MinWidth
{: .no_toc }

The width the panel does not go below, in the scale units of the control's container. **Single**. Default: 96 device-independent pixels, which is 1440 twips.

<!-- test: StatusBarTests.Panel_NegativeSizes_Raise380 -->
A negative value raises run-time error 380.
<!-- /test -->

### Picture
{: .no_toc }

The picture the panel shows beside its text, an icon or a bitmap. An **IPictureDisp**. Default: **Nothing**. The bar becomes as high as its tallest picture needs, if that is higher than its text. A panel with **AutoSize** set to content is wider by the picture.

### PictureIndent
{: .no_toc }

Space beside the picture, in the scale units of the control's container. **Single**. Default: 0. A negative value raises run-time error 380. It adds to the width of a panel whose **AutoSize** is content.

### PictureOnRight
{: .no_toc }

Whether the picture is at the right of the text. **Boolean**. Default: **False**, with which it is at the left.

### Style
{: .no_toc }

What the panel shows. A member of [**SbrPanelStyleConstants**](.#sbrpanelstyleconstants). Default: **SbrPanelStyleText**. A value that is not a member raises run-time error 380. See [What a panel shows](.#what-a-panel-shows).

### Tag
{: .no_toc }

A value of the program's own, which the bar does not use. **Variant**: unlike the [**Tag**](../Common#tag) of a control it holds a value of any type, an object included, which is assigned with **Set**.

<!-- test: StatusBarTests.Tag_NewPanel_IsAnEmptyString -->
A new panel has an empty string.
<!-- /test -->

### Text
{: .no_toc }

The text of the panel. **String**. Default: empty. It is the default member.

<!-- test: StatusBarTests.Text_KeyStyle_KeepsTheAssignedText -->
A panel whose [**Style**](#style) is not **SbrPanelStyleText** draws something else but still returns the string that was assigned. With a custom [**DTFormat**](#dtformat) that string is the format.
<!-- /test -->

### TextIndent
{: .no_toc }

Space between the panel's edge and its text, in the scale units of the control's container: at the left edge for a left-aligned text, at the right edge for a right-aligned one. **Single**. Default: 0. A negative value raises run-time error 380. It has no effect on centered text, and it adds to the width of a panel whose **AutoSize** is content.

### ToolTipText
{: .no_toc }

The text shown in a small window when the pointer rests on the panel. **String**. Default: empty. It shows only while the bar's [**ShowTips**](.#showtips) is **True**.

### Visible
{: .no_toc }

Whether the panel is shown. **Boolean**. Default: **True**.

<!-- test: StatusBarTests.Visible_False_MakesThePanelNoWidth -->
A panel that is not visible has a [**Width**](#width) of 0, and the panels after it move up.
<!-- /test -->

### Width
{: .no_toc }

The width of the panel as it is drawn, in the scale units of the control's container. **Single**. What an assignment does depends on [**AutoSize**](#autosize).

<!-- test: StatusBarTests.Width_AutoSizeNone_IsTheAssignedWidth, StatusBarTests.Width_AutoSizeContent_SetsTheMinimumWidth, StatusBarTests.Panel_NegativeSizes_Raise380 -->
With **SbrPanelAutoSizeNone** the value becomes the panel's width, and -1 gives the panel [**MinWidth**](#minwidth) again. With **SbrPanelAutoSizeContent** the value becomes [**MinWidth**](#minwidth). With **SbrPanelAutoSizeSpring** an assignment has no effect. A value below 0 raises run-time error 380, except the -1 that is allowed with **SbrPanelAutoSizeNone**.
<!-- /test -->

## See Also

- [StatusBar](.) -- the control
- [SbrPanels](SbrPanels) -- the collection of the panels
