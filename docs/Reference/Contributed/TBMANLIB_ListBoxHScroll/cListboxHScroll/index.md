---
title: cListboxHScroll
parent: TBMANLIB_ListBoxHScroll Package
permalink: /tB/Packages/Contributed/TBMANLIB_ListBoxHScroll/cListboxHScroll/
has_toc: false
---

# cListboxHScroll class
{: .no_toc }

A helper class that adds a functional horizontal scrollbar to a standard VB **ListBox** control by combining the `LB_SETHORIZONTALEXTENT` message, Win32 scroll-info APIs, and window subclassing.

The class measures the pixel width of each list item using GDI's `GetTextExtentPoint32W`, sets the scroll range to fit the widest item, and installs a subclass procedure to intercept `WM_HSCROLL` messages and set the scrollbar thumb's position. Call [**Show**](#show) after populating the list and [**UnShow**](#unshow) (or allow the class instance to be destroyed) when the scroll handling is no longer needed.

```tb check_build
Private HScroll As New cListboxHScroll

Private Sub Form_Load()
    List1.AddItem "A short item"
    List1.AddItem "A much longer item that overflows the default width"
    HScroll.Show List1
End Sub

Private Sub Form_Unload(Cancel As Integer)
    HScroll.UnShow
End Sub
```

* TOC
{:toc}

## Methods

### Show
{: .no_toc }

Activates horizontal scrolling on a **ListBox** control.

Syntax: *object*.**Show** *ListBoxInst*

<!-- test: ShowTests.Show_ObjectOfAnotherTypeRaisesError -->
*ListBoxInst*
: *required* An **Object** reference to the **ListBox** control to instrument. The class assigns it to a **ListBox** variable, so an object of another type causes a run-time error. The control must already have its items populated; **Show** measures the text width of every item at call time to compute the scroll range.
<!-- /test -->

<!-- test: ShowTests.Show_ShowsHorizontalScrollBar, ShowTests.Show_ExtentIsWidestItemPlus10, ShowTests.Show_SetsScrollRange, ShowTests.Show_EmptyListSetsNoExtent, ShowTests.Show_EmptyItemsSetNoExtent, ShowTests.Show_ListScrollsHorizontally, ScrollTests.LineRight_MovesThumb20, ScrollTests.LineLeft_MovesThumb20, ScrollTests.LineLeft_StopsAtStart, ScrollTests.PageRight_MovesThumbOnePage, ScrollTests.PageRight_StopsAtEnd, ScrollTests.PageLeft_MovesThumbOnePage, ScrollTests.Right_MovesThumbToEnd, ScrollTests.Left_MovesThumbToStart, ScrollTests.ThumbPosition_MovesThumbToPosition, ScrollTests.ThumbTrack_MovesThumbToPosition, ScrollTests.ThumbPosition_StopsAtEnd, ScrollTests.EndScroll_LeavesThumb -->
**Show** performs three operations in sequence:

1. Calls the Win32 `ShowScrollBar` API to make the horizontal scrollbar visible.
2. Iterates every list item, measures its pixel width using the GDI device context of the control, and sends `LB_SETHORIZONTALEXTENT` with the widest measurement plus a 10-pixel margin. It also calls `SetScrollInfo` to set the scroll range and page size so the scrollbar thumb reflects the visible proportion of the content. When the list is empty, or every item is empty, neither is set.
3. Installs a window subclass procedure via `SetWindowSubclass` (comctl32) to intercept `WM_HSCROLL` messages. The subclass updates the scroll position on line-left / line-right (20 px per step), page-left / page-right, thumb-track / thumb-position, and left / right scrolls, then passes the message to `DefSubclassProc`.
<!-- /test -->

<!-- test: ShowTests.Show_ExtentUsesControlFont -->
The scroll range is calculated from the widest item's pixel width measured with the font that the control reports through `WM_GETFONT`, so a **ListBox** that uses a non-default font is measured with that font.
<!-- /test -->

<!-- test: ScrollTests.LineRight_ContentsFollowThumb, ScrollTests.LineLeft_ContentsFollowThumb, ScrollTests.PageRight_ContentsFollowThumb, ScrollTests.PageLeft_ContentsFollowThumb, ScrollTests.Right_ContentsFollowThumb, ScrollTests.ThumbTrack_ContentsFollowThumb -->
> [!WARNING] 1.0.0.1
> The thumb of the scroll bar and the contents of the list disagree after a click on a scroll arrow or in the track of the scroll bar. The subclass moves the thumb by 20 pixels for an arrow and by one page for the track, while the list box scrolls its contents by its own step, for example 9 pixels for an arrow and about two-thirds of a page for the track. After a few clicks the thumb is at a position the list does not show. Dragging the thumb, and the scroll to the start or the end, leave them equal.

<!-- test: ShowTests.Show_ItemAddedLaterIsNotMeasured, ShowTests.Show_AgainMeasuresTheNewItems -->
> [!NOTE] timeless
> **Show** measures item widths at the moment it is called. If items are added or removed after **Show**, the scroll range is not updated automatically. Call **Show** again after bulk changes to refresh the extent.

<!-- test: ShowTests.Show_ControlWithoutWindowRaisesNoError -->
> [!IMPORTANT] timeless
> The control's **hWnd** must be valid (the form must be loaded and the control fully created) before calling **Show**. Calling **Show** before the control's window exists returns silently without installing any scrolling behavior.
<!-- /test -->

### UnShow
{: .no_toc }

Removes the window subclass installed by [**Show**](#show).

Syntax: *object*.**UnShow**

<!-- test: UnShowTests.UnShow_RemovesTheSubclass, UnShowTests.UnShow_KeepsScrollBarAndExtent, UnShowTests.UnShow_ExtentAndBarCanBeClearedByHand -->
Calls `RemoveWindowSubclass` to detach the `WM_HSCROLL` handler. After **UnShow** the **ListBox** no longer receives the class's `WM_HSCROLL` handling. The scroll bar and the horizontal extent set by **Show** are not reset; send the `LB_SETHORIZONTALEXTENT` message with a width of 0 to the control, and hide the bar with `ShowScrollBar`, if clearing them is required.
<!-- /test -->

<!-- test: UnShowTests.Terminate_RemovesTheSubclass -->
`Class_Terminate` removes the subclass with the same internal helper, so the subclass is removed when the **cListboxHScroll** instance is destroyed.
<!-- /test -->

## Example

This example attaches a horizontal scrollbar to a **ListBox** and removes it when the form closes.

```tb check_build
Private HScroll As cListboxHScroll

Private Sub Form_Load()
    Set HScroll = New cListboxHScroll

    List1.AddItem "Alpha"
    List1.AddItem "Beta -- a much longer entry that would normally be clipped"
    List1.AddItem "Gamma"

    HScroll.Show List1
End Sub

Private Sub Form_Unload(Cancel As Integer)
    HScroll.UnShow
End Sub
```

## Remarks

**cListboxHScroll** uses window subclassing via the comctl32 `SetWindowSubclass` / `RemoveWindowSubclass` / `DefSubclassProc` API family. The subclass is identified by the constant ID `1` in every instance.

<!-- test: UnShowTests.Show_TwoInstancesOneList_EachHandlesEveryMessage, UnShowTests.UnShow_TwoInstancesOneList_LeavesTheOtherInPlace -->
> [!NOTE] 1.0.0.1
> Two instances on the same **ListBox** install two subclasses, and each handles every `WM_HSCROLL` message: a click on a scroll arrow moves the thumb 40 pixels, not 20. **UnShow** of one instance removes only its own subclass. Use one instance per **ListBox**.

<!-- test: UnShowTests.Show_TwoInstancesTwoLists -->
Instances on different list boxes are independent: **UnShow** of one leaves the scroll handling of the other in place.
<!-- /test -->

<!-- test: UnShowTests.Show_OtherListBoxLeavesFirstSubclassed -->
The class stores the **ListBox** reference in a class-level variable (`Ctl`). Replacing the control by calling **Show** with a different **ListBox** does not automatically remove the subclass from the first control; call **UnShow** before switching targets.
<!-- /test -->

## See Also

- [TBMANLIB_ListBoxHScroll](../) package -- overview and installation
