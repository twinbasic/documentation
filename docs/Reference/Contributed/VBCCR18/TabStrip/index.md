---
title: TabStrip
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TabStrip/
has_toc: false
symbols:
  - TabStrip
  - TbsPlacementConstants
  - TbsStyleConstants
  - TbsTabStyleConstants
  - TbsTabWidthStyleConstants
  - TbsTabAlignmentConstants
  - TbsHitResultConstants
  - TbsDrawModeConstants
---

# TabStrip class
{: .no_toc }

A **TabStrip** is a row of tabs, or of buttons, of which one is selected. It shows no pages of its own: a program shows the controls that belong to the selected tab, and hides the others.

```tb check_build check_run arch=win32,win64
TabStrip1.Tabs(1).Caption = "General"
TabStrip1.Tabs.Add , "view", "View"
TabStrip1.Tabs.Add , "edit", "Edit"
TabStrip1.Tabs("view").Selected = True
Debug.Print TabStrip1.Tabs.Count
Debug.Print TabStrip1.SelectedItem.Key
' Output:
'  3
' view
```

The control stands in place of the TabStrip of the Microsoft common controls (`MSCOMCTL.OCX`).

Of the [common members](../Common), the control has all but the **Click** and **DblClick** events: [Name and place](../Common#name-and-place), [Window handles](../Common#window-handles), [Font and visual styles](../Common#font-and-visual-styles), [Mouse](../Common#mouse), [Keyboard and focus](../Common#keyboard-and-focus), [Dragging the control](../Common#dragging-the-control), [OLE drag and drop](../Common#ole-drag-and-drop) and [Right-to-left](../Common#right-to-left), **RightToLeftLayout** included. A change of the selected tab raises [**TabBeforeClick**](#tabbeforeclick) and [**TabClick**](#tabclick).

Its sub-objects have pages of their own:

- [TbsTabs](TbsTabs) -- the collection of the tabs, which [**Tabs**](#tabs) returns
- [TbsTab](TbsTab) -- one tab

* TOC
{:toc}

## Tabs and the selected tab

<!-- test: TabStripTests.Tabs_NewStrip_HasOneSelectedTab -->
A tab strip drawn on a form has one tab, with no caption, and it is selected. [**Tabs**](#tabs) returns the collection, and its [**Add**](TbsTabs#add) method makes more. The tabs are numbered from 1, and a program can also name each by a key.
<!-- /test -->

[**SelectedItem**](#selecteditem) is the selected tab, or **Nothing**. A program selects a tab by assigning **True** to its [**Selected**](TbsTab#selected), or by setting [**SelectedItem**](#selecteditem) with **Set**. The tab strip changes nothing else on the form: the program's [**TabClick**](#tabclick) handler shows and hides the controls.

<!-- test: TabStripTests.Selected_False_LeavesNoTabSelected -->
Assigning **False** to the [**Selected**](TbsTab#selected) of the selected tab, or **Nothing** to [**SelectedItem**](#selecteditem), leaves no tab selected. **False** on another tab does nothing.
<!-- /test -->

## Changing the selected tab

<!-- test: TabStripTests.Selected_Assigned_RaisesTabBeforeClickThenTabClick, TabStripTests.TabBeforeClick_Cancel_KeepsTheSelectedTab -->
A change of the selected tab raises [**TabBeforeClick**](#tabbeforeclick) first. A handler that sets *Cancel* to **True** keeps the change from happening, and [**TabClick**](#tabclick) is not raised. Otherwise the tab is selected and **TabClick** follows. Both are raised by an assignment to [**Selected**](TbsTab#selected) as well, also for the tab that is selected already.

```tb hidden
Class TabWatcher
    Public WithEvents Strip As VBCCR18.TabStrip
    Public Cancel As Boolean
    Private Sub Strip_TabBeforeClick(ByVal TabItem As TbsTab, ByRef Cancel As Boolean) Handles Strip.TabBeforeClick
        Debug.Print "TabBeforeClick " & TabItem.Caption
        Cancel = Me.Cancel
    End Sub
    Private Sub Strip_TabClick(ByVal TabItem As TbsTab) Handles Strip.TabClick
        Debug.Print "TabClick " & TabItem.Caption
    End Sub
End Class
```

```tb check_build check_run arch=win32,win64
Dim Watch As New TabWatcher
Set Watch.Strip = TabStrip1
TabStrip1.Tabs(1).Caption = "One"
TabStrip1.Tabs.Add , , "Two"
TabStrip1.Tabs(2).Selected = True
Watch.Cancel = True                     ' the handler of TabBeforeClick says Cancel
TabStrip1.Tabs(1).Selected = True
Debug.Print TabStrip1.SelectedItem.Caption
' Output:
' TabBeforeClick Two
' TabClick Two
' TabBeforeClick One
' Two
```
<!-- /test -->

**TabWatcher** in this sample is a class of the program's own that holds the control **WithEvents** and prints the events.

<!-- test: TabStripTests.Click_ByTheUser_RaisesTabBeforeClickThenTabClick -->
When the user clicks a tab, the argument of **TabBeforeClick** is the tab that is selected now and is about to be left, and that of **TabClick** is the tab clicked. The two events come before the **MouseDown** event of the click. A program that assigns **Selected** gets the tab that is to be selected in both events.
<!-- /test -->

<!-- test: TabStripTests.TabScrollWheel_TurnsToTheNextAndThePreviousTab, TabStripTests.TabScrollWheel_RaisesTheTabEvents -->
While [**TabScrollWheel**](#tabscrollwheel) is **True**, a turn of the mouse wheel over the strip selects the next tab or the previous one, with the same two events.
<!-- /test -->

A letter that follows an ampersand in a tab's [**Caption**](TbsTab#caption) is its access key: Alt and the letter select the tab.

## Pictures on the tabs

A tab shows a picture from an [**ImageList**](../ImageList/) control. The program gives the tab strip the list with [**ImageList**](#imagelist), and a tab names its picture by number or by key with [**Image**](TbsTab#image).

```tb hidden
Public Type TabPictDesc
    Size As Long
    Kind As Long
    Handle As LongPtr
    Palette As LongPtr
End Type
Public Type TabGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type
Public Declare PtrSafe Function TbGetDC Lib "user32" Alias "GetDC" (ByVal hWnd As LongPtr) As LongPtr
Public Declare PtrSafe Function TbReleaseDC Lib "user32" Alias "ReleaseDC" (ByVal hWnd As LongPtr, ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function TbCreateCompatibleDC Lib "gdi32" Alias "CreateCompatibleDC" (ByVal hDC As LongPtr) As LongPtr
Public Declare PtrSafe Function TbCreateCompatibleBitmap Lib "gdi32" Alias "CreateCompatibleBitmap" (ByVal hDC As LongPtr, ByVal W As Long, ByVal H As Long) As LongPtr
Public Declare PtrSafe Function TbSelectObject Lib "gdi32" Alias "SelectObject" (ByVal hDC As LongPtr, ByVal hObject As LongPtr) As LongPtr
Public Declare PtrSafe Function TbCreateSolidBrush Lib "gdi32" Alias "CreateSolidBrush" (ByVal Color As Long) As LongPtr
Public Declare PtrSafe Function TbPatBlt Lib "gdi32" Alias "PatBlt" (ByVal hDC As LongPtr, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Rop As Long) As Long
Public Declare PtrSafe Function TbDeleteObject Lib "gdi32" Alias "DeleteObject" (ByVal hObject As LongPtr) As Long
Public Declare PtrSafe Function TbDeleteDC Lib "gdi32" Alias "DeleteDC" (ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function TbOleCreatePictureIndirect Lib "oleaut32" Alias "OleCreatePictureIndirect" (ByRef Desc As TabPictDesc, ByRef IID As TabGuid, ByVal Own As Long, ByRef Pic As IPictureDisp) As Long

' A bitmap of one color.
Public Function TabSquare(ByVal Color As Long, Optional ByVal Width As Long = 16, Optional ByVal Height As Long = 16) As StdPicture
    Dim screenDC As LongPtr, memDC As LongPtr, bmp As LongPtr, brush As LongPtr, oldBmp As LongPtr, oldBrush As LongPtr
    screenDC = TbGetDC(0)
    memDC = TbCreateCompatibleDC(screenDC)
    bmp = TbCreateCompatibleBitmap(screenDC, Width, Height)
    brush = TbCreateSolidBrush(Color)
    oldBmp = TbSelectObject(memDC, bmp)
    oldBrush = TbSelectObject(memDC, brush)
    TbPatBlt memDC, 0, 0, Width, Height, &HF00021
    TbSelectObject memDC, oldBrush
    TbSelectObject memDC, oldBmp
    TbDeleteObject brush
    TbDeleteDC memDC
    TbReleaseDC 0, screenDC
    Dim desc As TabPictDesc, iid As TabGuid, pic As IPictureDisp
    desc.Size = LenB(desc)
    desc.Kind = 1
    desc.Handle = bmp
    iid.Data1 = &H7BF80981
    iid.Data2 = &HBF32
    iid.Data3 = &H101A
    iid.Data4(0) = &H8B
    iid.Data4(1) = &HBB
    iid.Data4(3) = &HAA
    iid.Data4(5) = &H30
    iid.Data4(6) = &HC
    iid.Data4(7) = &HAB
    TbOleCreatePictureIndirect desc, iid, 1, pic
    Set TabSquare = pic
End Function
```

<!-- test: TabStripTests.Image_ByKeyAndNumber_IsTheNumberInTheList -->
```tb check_build check_run arch=win32,win64
ImageList1.ListImages.Add , "red", TabSquare(vbRed)
ImageList1.ListImages.Add , "blue", TabSquare(vbBlue)
Set TabStrip1.ImageList = ImageList1
TabStrip1.Tabs.Add , "two", "Two", "blue"
TabStrip1.Tabs(1).Image = 1
Debug.Print TabStrip1.Tabs("two").ImageIndex; TabStrip1.Tabs(1).ImageIndex
' Output:
'  2  1
```
<!-- /test -->

**TabSquare** in this sample is a function of the program's own that returns a bitmap of one color, 16 pixels wide and high. The picture of a tab can be named by key or by number, and the tab's [**ImageIndex**](TbsTab#imageindex) is always the number.

## The look of the strip

[**Style**](#style) chooses tabs, buttons or flat buttons. [**TabWidthStyle**](#tabwidthstyle) decides the widths: tabs stretched to fill each row, tabs of their own width, or tabs all of one size, [**TabFixedWidth**](#tabfixedwidth) by [**TabFixedHeight**](#tabfixedheight). With visual styles the tabs are always along the top, whatever [**Placement**](#placement) says. When the tabs do not fit one row, [**MultiRow**](#multirow) puts them in several, and without it the strip shows two small arrows to scroll the row.

<!-- test: TabStripTests.Style_Changed_KeepsTheTabsAndTheSelection -->
A change of most of these properties makes the control's window again. The tabs, their keys, tags, tool tip texts and the selected tab stay as they were.
<!-- /test -->

## The area inside the tabs

[**ClientLeft**](#clientleft), [**ClientTop**](#clienttop), [**ClientWidth**](#clientwidth) and [**ClientHeight**](#clientheight) are the rectangle inside the tabs, where the program puts the controls of the selected tab. Assigning [**ClientWidth**](#clientwidth) or [**ClientHeight**](#clientheight) changes the size of the control so that the rectangle has that size.

Properties
----------

### BackColor
{: .no_toc }

The color behind the tabs. **OLE_COLOR**. Default: **vbButtonFace**. With **TbsStyleTabs** it is the strip along the tabs, not the area below them; with a style of buttons it is the whole control.

### ClientHeight
{: .no_toc }

The height of the area inside the tabs, in the scale units of the control's container. **Single**. An assignment changes the height of the control, see [The area inside the tabs](#the-area-inside-the-tabs).

<!-- test: TabStripTests.ClientWidth_Assigned_ResizesTheControl -->
The control becomes higher than the value, by the height of the tabs and the border.
<!-- /test -->

### ClientLeft
{: .no_toc }

The distance from the left edge of the control to the area inside the tabs, in the scale units of the control's container. **Single**, read-only.

### ClientTop
{: .no_toc }

The distance from the top edge of the control to the area inside the tabs, in the scale units of the control's container. **Single**, read-only.

### ClientWidth
{: .no_toc }

The width of the area inside the tabs, in the scale units of the control's container. **Single**. An assignment changes the width of the control, see [The area inside the tabs](#the-area-inside-the-tabs). The control becomes wider than the value, by the border.

### DoubleBuffer
{: .no_toc }

Whether the control draws itself in a bitmap off the screen first, which reduces flicker. **Boolean**. Default: **True**.

### DrawMode
{: .no_toc }

Whether Windows draws the tabs or the program does. A member of [**TbsDrawModeConstants**](#tbsdrawmodeconstants). Default: **TbsDrawModeNormal**. With **TbsDrawModeOwnerDrawFixed** the control raises [**ItemDraw**](#itemdraw) for each tab.

<!-- test: TabStripTests.DrawMode_AtRunTime_Raises382, TabStripTests.Properties_ValuesOutsideTheEnumerations_Raise380 -->
The property can be set only in the form designer. An assignment at run time raises run-time error 382, *DrawMode property is read-only at run time*, whatever the value, but a value that is not a member raises 380.
<!-- /test -->

### hWndToolTip
{: .no_toc }

The handle of the tool tip window of the tab control, which shows the tabs' [**ToolTipText**](TbsTab#tooltiptext). **LongPtr**, read-only.

### HotTracking
{: .no_toc }

Whether the tab under the pointer is highlighted. **Boolean**. Default: **True**. The visual style of Windows can draw its own highlight whatever the value. A change makes the window again.

### ImageList
{: .no_toc }

The list of the pictures that the tabs show. A **Variant**: assigned a control of the class [**ImageList**](../ImageList/), the name of such a control on the same form as a **String**, or the handle of a Windows image list as a **Long**. It returns the control, or the handle where one was given.

<!-- test: TabStripTests.ImageList_NotAnImageList_Raises35610 -->
Another kind of object raises run-time error 35610, *Invalid object*, and a value of another type raises 13. A name that no **ImageList** has leaves the strip without one, with no error.
<!-- /test -->

The control must have pictures by the time it is given: see [**ImageList**](../ImageList/) for what a list does when its pictures change.

### MultiRow
{: .no_toc }

Whether tabs that do not fit one row go to further rows. **Boolean**. Default: **True**. **False** keeps a single row and shows arrows to scroll it. **TabStyle** set to **TbsTabStyleOpposite** keeps it **True**. A change makes the window again.

### MultiSelect
{: .no_toc }

Whether the user can select several tabs by holding Ctrl while clicking. **Boolean**. Default: **False**. It applies to **TbsStyleButtons** and **TbsStyleFlatButtons**. A change makes the window again.

### Placement
{: .no_toc }

The side of the control where the tabs are. A member of [**TbsPlacementConstants**](#tbsplacementconstants). Default: **TbsPlacementTop**. A value that is not a member raises run-time error 380. It takes effect only in a program without visual styles. With them the tabs stay at the top.

<!-- test: TabStripTests.Placement_WithVisualStyles_LeavesTheTabsOnTop -->
The value is kept and returned all the same.
<!-- /test -->

### RowCount
{: .no_toc }

The number of rows of tabs now. **Long**, read-only. Only a strip with [**MultiRow**](#multirow) **True** has more than one.

### SelectedItem
{: .no_toc }

The selected tab. A [**TbsTab**](TbsTab), or **Nothing** where no tab is selected. Assigned with **Set**, it selects that tab as [**Selected**](TbsTab#selected) does, with its events, and **Nothing** leaves no tab selected, without events. See [Tabs and the selected tab](#tabs-and-the-selected-tab).

### Separators
{: .no_toc }

Whether the control draws separators between the buttons. **Boolean**. Default: **True**. It applies to **TbsStyleFlatButtons**.

### ShowTips
{: .no_toc }

Whether a tab shows its [**ToolTipText**](TbsTab#tooltiptext) when the pointer rests on it. **Boolean**. Default: **False**.

### Style
{: .no_toc }

Whether the strip is drawn with tabs, with buttons or with flat buttons. A member of [**TbsStyleConstants**](#tbsstyleconstants). Default: **TbsStyleTabs**. A change makes the window again.

<!-- test: TabStripTests.TabStyleOpposite_ForcesTheTabsStyleAndMultipleRows, TabStripTests.Properties_ValuesOutsideTheEnumerations_Raise380 -->
A value that is not a member raises run-time error 380. While [**TabStyle**](#tabstyle) is **TbsTabStyleOpposite** the style is always **TbsStyleTabs**: a change to another one is undone.
<!-- /test -->

### TabAlignment
{: .no_toc }

Where a tab puts its picture and its caption. A member of [**TbsTabAlignmentConstants**](#tbstabalignmentconstants). Default: **TbsTabAlignmentStandard**. A value that is not a member raises run-time error 380.

<!-- test: TabStripTests.TabAlignment_WithoutFixedWidth_IsStandard -->
It has an effect only while [**TabWidthStyle**](#tabwidthstyle) is **TbsTabWidthStyleFixed**: a change of the width style to another value sets it to **TbsTabAlignmentStandard**.
<!-- /test -->

### TabFixedHeight
{: .no_toc }

The height of every tab while [**TabWidthStyle**](#tabwidthstyle) is **TbsTabWidthStyleFixed**, in the scale units of the control's container. **Single**. Default: 0.

<!-- test: TabStripTests.TabSizes_Negative_Raise380 -->
A negative value raises run-time error 380.
<!-- /test -->

### TabFixedWidth
{: .no_toc }

The width of every tab while [**TabWidthStyle**](#tabwidthstyle) is **TbsTabWidthStyleFixed**, in the scale units of the control's container. **Single**. Default: 0. A negative value raises run-time error 380.

### TabMinWidth
{: .no_toc }

The width that a tab does not go below, in the scale units of the control's container. **Single**. Default: 40 device-independent pixels. -1 gives the tabs the width Windows gives them. Another negative value raises run-time error 380.

### TabScrollWheel
{: .no_toc }

Whether the mouse wheel selects the next or the previous tab. **Boolean**. Default: **True**. See [Changing the selected tab](#changing-the-selected-tab).

### Tabs
{: .no_toc }

The collection of the tabs. A [**TbsTabs**](TbsTabs) object, read-only.

### TabStyle
{: .no_toc }

How the rows of tabs are arranged when the strip has several. A member of [**TbsTabStyleConstants**](#tbstabstyleconstants). Default: **TbsTabStyleStandard**. A value that is not a member raises run-time error 380. **TbsTabStyleOpposite** sets [**Style**](#style) to **TbsStyleTabs** and [**MultiRow**](#multirow) to **True**.

### TabWidthStyle
{: .no_toc }

How wide the tabs are. A member of [**TbsTabWidthStyleConstants**](#tbstabwidthstyleconstants). Default: **TbsTabWidthStyleJustified**. A value that is not a member raises run-time error 380.

### Transparent
{: .no_toc }

Whether the background of the strip copies what is behind the control, so that it looks transparent. **Boolean**. Default: **False**.

Methods
-------

### DeselectAll
{: .no_toc }

Clears the selection of every tab. It is meant for the styles of buttons, where tabs stay pressed.

Syntax: *object*.**DeselectAll**

### DrawBackground
{: .no_toc }

Draws the strip's background onto a device context, as it lies behind a window of another control. A program calls it when it paints a control that sits on the strip, so that the control's background matches the strip's.

Syntax: *object*.**DrawBackground** *hWnd*, *hDC*

*hWnd*
: *required* A **LongPtr**: the handle of the window of the control that is painted.

*hDC*
: *required* A **LongPtr**: the device context to draw into.

### HitTest
{: .no_toc }

Returns the tab at a point of the control, or **Nothing** where there is none.

Syntax: *object*.**HitTest**( *X*, *Y* [, *HitResult* ] ) **As TbsTab**

*X*, *Y*
: *required* **Single**: the point, measured from the top left corner of the control in the scale units of the control's container.

*HitResult*
: *optional* A member of [**TbsHitResultConstants**](#tbshitresultconstants), set by the call to say what part of the tab is at the point.

<!-- test: TabStripTests.HitTest_ReturnsTheTabAtThePoint -->
A point that is on no tab returns **Nothing**.
<!-- /test -->

Events
------

### ItemDraw
{: .no_toc }

Raised for each tab that the program draws, while [**DrawMode**](#drawmode) is **TbsDrawModeOwnerDrawFixed**.

Syntax: *object*\_**ItemDraw**( *TabItem* **As TbsTab**, *ItemAction* **As Long**, *ItemState* **As Long**, *hDC* **As Long**, *Left* **As Long**, *Top* **As Long**, *Right* **As Long**, *Bottom* **As Long** )

*TabItem*
: The [**TbsTab**](TbsTab) to draw.

*ItemAction*
: What Windows asks for, a value of the ODA constants of Windows: 1 to draw the whole tab, 2 for a change of selection, 4 for a change of focus.

*ItemState*
: The state of the tab, the sum of the ODS constants of Windows: 1 for selected, 2 for grayed, 4 for disabled, 8 for checked, 16 for focused.

*hDC*
: The device context to draw into.

*Left*, *Top*, *Right*, *Bottom*
: The rectangle of the tab, in pixels of the device context.

### TabBeforeClick
{: .no_toc }

Raised before the selected tab changes, by a click, the wheel, an access key or an assignment. A handler that sets *Cancel* to **True** keeps the tab selected as it is. See [Changing the selected tab](#changing-the-selected-tab).

Syntax: *object*\_**TabBeforeClick**( *TabItem* **As TbsTab**, *Cancel* **As Boolean** )

*TabItem*
: A [**TbsTab**](TbsTab): the tab that is selected now when the user clicks, and the tab that is to be selected when the program assigns [**Selected**](TbsTab#selected).

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the change from happening.

### TabClick
{: .no_toc }

Raised after a tab is selected, by a click, the wheel, an access key or an assignment to [**Selected**](TbsTab#selected), also for a tab that was selected already.

Syntax: *object*\_**TabClick**( *TabItem* **As TbsTab** )

*TabItem*
: The [**TbsTab**](TbsTab) that is now selected.

## TbsPlacementConstants
{: #tbsplacementconstants }

The values of [**Placement**](#placement).

| Member | Value | Description |
|---|---|---|
| **TbsPlacementTop**{: #TbsPlacementConstants_TbsPlacementTop } | 0 | The tabs are along the top edge. |
| **TbsPlacementBottom**{: #TbsPlacementConstants_TbsPlacementBottom } | 1 | The tabs are along the bottom edge. |
| **TbsPlacementLeft**{: #TbsPlacementConstants_TbsPlacementLeft } | 2 | The tabs are along the left edge. |
| **TbsPlacementRight**{: #TbsPlacementConstants_TbsPlacementRight } | 3 | The tabs are along the right edge. |

## TbsStyleConstants
{: #tbsstyleconstants }

The values of [**Style**](#style).

| Member | Value | Description |
|---|---|---|
| **TbsStyleTabs**{: #TbsStyleConstants_TbsStyleTabs } | 0 | Tabs. |
| **TbsStyleButtons**{: #TbsStyleConstants_TbsStyleButtons } | 1 | Buttons. |
| **TbsStyleFlatButtons**{: #TbsStyleConstants_TbsStyleFlatButtons } | 2 | Flat buttons, which look raised under the pointer. |

## TbsTabStyleConstants
{: #tbstabstyleconstants }

The values of [**TabStyle**](#tabstyle).

| Member | Value | Description |
|---|---|---|
| **TbsTabStyleStandard**{: #TbsTabStyleConstants_TbsTabStyleStandard } | 0 | When a tab is selected, the row it is in moves next to the page area. |
| **TbsTabStyleOpposite**{: #TbsTabStyleConstants_TbsTabStyleOpposite } | 1 | When a tab is selected, the tabs that are not needed in front of it move to the opposite side of the control. It sets [**Style**](#style) to tabs and [**MultiRow**](#multirow) to **True**. |

## TbsTabWidthStyleConstants
{: #tbstabwidthstyleconstants }

The values of [**TabWidthStyle**](#tabwidthstyle).

| Member | Value | Description |
|---|---|---|
| **TbsTabWidthStyleJustified**{: #TbsTabWidthStyleConstants_TbsTabWidthStyleJustified } | 0 | The tabs of a row are made wider to fill it. |
| **TbsTabWidthStyleNonJustified**{: #TbsTabWidthStyleConstants_TbsTabWidthStyleNonJustified } | 1 | Each tab keeps the width its content needs, and a row may end short of the right edge. |
| **TbsTabWidthStyleFixed**{: #TbsTabWidthStyleConstants_TbsTabWidthStyleFixed } | 2 | Every tab is [**TabFixedWidth**](#tabfixedwidth) wide and [**TabFixedHeight**](#tabfixedheight) high. |

## TbsTabAlignmentConstants
{: #tbstabalignmentconstants }

The values of [**TabAlignment**](#tabalignment), which has an effect with **TbsTabWidthStyleFixed**.

| Member | Value | Description |
|---|---|---|
| **TbsTabAlignmentStandard**{: #TbsTabAlignmentConstants_TbsTabAlignmentStandard } | 0 | The picture and the caption are in the middle of the tab. |
| **TbsTabAlignmentImageLeft**{: #TbsTabAlignmentConstants_TbsTabAlignmentImageLeft } | 1 | The picture is at the left edge of the tab. |
| **TbsTabAlignmentImageCaptionLeft**{: #TbsTabAlignmentConstants_TbsTabAlignmentImageCaptionLeft } | 2 | The picture and the caption are at the left edge of the tab. |

## TbsHitResultConstants
{: #tbshitresultconstants }

The values that [**HitTest**](#hittest) gives its *HitResult* argument.

| Member | Value | Description |
|---|---|---|
| **TbsHitResultNoWhere**{: #TbsHitResultConstants_TbsHitResultNoWhere } | 0 | The point is on no tab. |
| **TbsHitResultItem**{: #TbsHitResultConstants_TbsHitResultItem } | 1 | The point is on a tab, away from its picture and caption. |
| **TbsHitResultItemIcon**{: #TbsHitResultConstants_TbsHitResultItemIcon } | 2 | The point is on a tab's picture. |
| **TbsHitResultItemLabel**{: #TbsHitResultConstants_TbsHitResultItemLabel } | 3 | The point is on a tab's caption. |

## TbsDrawModeConstants
{: #tbsdrawmodeconstants }

The values of [**DrawMode**](#drawmode).

| Member | Value | Description |
|---|---|---|
| **TbsDrawModeNormal**{: #TbsDrawModeConstants_TbsDrawModeNormal } | 0 | Windows draws the tabs. |
| **TbsDrawModeOwnerDrawFixed**{: #TbsDrawModeConstants_TbsDrawModeOwnerDrawFixed } | 1 | The program draws each tab in [**ItemDraw**](#itemdraw). |

## See Also

- [Common members](../Common) -- the members this control shares with the package's other controls
- [TbsTabs](TbsTabs) -- the collection of the tabs
- [TbsTab](TbsTab) -- one tab
- [ImageList](../ImageList/) -- the list of the pictures that the tabs show
