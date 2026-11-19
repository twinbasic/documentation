---
title: TbsTab
parent: TabStrip
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TabStrip/TbsTab
has_toc: false
---

# TbsTab class
{: .no_toc }

One tab of a [**TabStrip**](.): its caption, picture, key, state and place. A program gets one from the [**TbsTabs**](TbsTabs) collection, from that collection's [**Add**](TbsTabs#add) method, from [**SelectedItem**](.#selecteditem) and from [**HitTest**](.#hittest), and the events [**TabBeforeClick**](.#tabbeforeclick) and [**TabClick**](.#tabclick) pass one. It cannot make a **TbsTab** object with **New**.

```tb check_build check_run arch=win32,win64
Dim Tab As TbsTab
Set Tab = TabStrip1.Tabs.Add(, "find", "&Find")
Tab.ToolTipText = "Search the text"
Tab.Selected = True
Debug.Print Tab.Caption; Tab.Index; Tab.Selected
' Output:
' &Find 2 True
```

* TOC
{:toc}

Properties
----------

### Caption
{: .no_toc }

The text of the tab. **String**. Default: empty. It is the default member.

A letter that follows an ampersand (`&`) is the tab's access key: Alt and that letter select the tab, with the events of [**Selected**](#selected).

### Height
{: .no_toc }

The height of the tab, in the scale units of the control's container. **Single**, read-only.

<!-- test: TabStripTests.TabGeometry_Assigned_Raises383 -->
An assignment to **Height**, [**Left**](#left), [**Top**](#top) or [**Width**](#width) raises run-time error 383.
<!-- /test -->

### HighLighted
{: .no_toc }

Whether the tab is drawn highlighted, to draw the user's attention to it without selecting it. **Boolean**. Default: **False**. It shows nothing in a control drawn with visual styles.

### Image
{: .no_toc }

The picture of the tab: its number or its key in the strip's [**ImageList**](.#imagelist). A **Variant**. A tab without a picture gives 0, and 0 takes the picture away.

<!-- test: TabStripTests.Image_ByKeyAndNumber_IsTheNumberInTheList -->
The property returns what was assigned, a number or a key, and [**ImageIndex**](#imageindex) is the number either way. A key that the list does not have raises run-time error 35601, *Element not found*.
<!-- /test -->

### ImageIndex
{: .no_toc }

The number of the tab's picture in the strip's list, from 1, or 0 for none. **Long**, read-only.

### Index
{: .no_toc }

The number of the tab in the strip, from 1. **Long**, read-only. It changes when a tab is added or removed before this one.

### Key
{: .no_toc }

The key of the tab in the [**TbsTabs**](TbsTabs) collection. **String**. Empty for a tab without a key.

<!-- test: TabStripTests.Key_Assigned_RenamesTheTab -->
An assignment gives the tab another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another tab has raises run-time error 457.
<!-- /test -->

### Left
{: .no_toc }

The distance from the left edge of the control to the tab, in the scale units of the control's container. **Single**, read-only.

### Pressed
{: .no_toc }

Whether the tab is drawn pressed. **Boolean**. It has a meaning where the strip's [**Style**](.#style) is a style of buttons, where tabs can stay pressed, several of them with [**MultiSelect**](.#multiselect).

### Selected
{: .no_toc }

Whether the tab is the selected one. **Boolean**. **True** selects the tab, with the events described in [Changing the selected tab](.#changing-the-selected-tab). **False** on the selected tab leaves no tab selected, and on another tab does nothing.

### Tag
{: .no_toc }

A value of the program's own, which the strip does not use. **Variant**: unlike the [**Tag**](../Common#tag) of a control it holds a value of any type, an object included, which is assigned with **Set**.

### ToolTipText
{: .no_toc }

The text shown in a small window when the pointer rests on the tab. **String**. Default: empty. It shows only while the strip's [**ShowTips**](.#showtips) is **True**.

### Top
{: .no_toc }

The distance from the top edge of the control to the tab, in the scale units of the control's container. **Single**, read-only.

### Width
{: .no_toc }

The width of the tab, in the scale units of the control's container. **Single**, read-only.

## See Also

- [TabStrip](.) -- the control
- [TbsTabs](TbsTabs) -- the collection of the tabs
