---
title: Show
parent: cListboxHScroll
permalink: /tB/Packages/Contributed/TBMANLIB_ListBoxHScroll/cListboxHScroll/Show
has_toc: false
---
# Show
{: .no_toc }

Attaches the horizontal scroll bar to a **ListBox** control and initialises scroll handling.

Syntax: *object*.**Show** *ListBoxInst*

<!-- test: ShowTests.Show_ObjectOfAnotherTypeRaisesError, UnShowTests.UnShow_KeepsListBoxReference -->
*ListBoxInst*
: *required* An object expression that evaluates to a **ListBox** control. The class assigns it to a **ListBox** variable, so an object of another type causes a run-time error. The class holds this reference for the lifetime of the object; [**UnShow**](UnShow) does not release it.
<!-- /test -->

<!-- test: ShowTests.Show_ShowsHorizontalScrollBar, ShowTests.Show_ExtentIsWidestItemPlus10, ShowTests.Show_ExtentUsesControlFont, ShowTests.Show_SetsScrollRange, ShowTests.Show_EmptyListSetsNoExtent, ShowTests.Show_EmptyItemsSetNoExtent, ShowTests.Show_ListScrollsHorizontally -->
**Show** performs three actions in sequence:

1. Calls the Win32 `ShowScrollBar` API to make the horizontal scroll bar visible on *ListBoxInst*.
2. Iterates every item in the list, measures each item's pixel width using the GDI `GetTextExtentPoint32` API with the control's own font, then sets the horizontal scrollable extent via the `LB_SETHORIZONTALEXTENT` message and the scroll range and page size via `SetScrollInfo`. A 10-pixel margin is added to the widest item. When the list is empty, or every item is empty, the extent and the scroll range are not set.
3. Installs a window subclass (`SetWindowSubclass` from `comctl32`) on the control's `hWnd` to intercept `WM_HSCROLL` messages. The subclass procedure updates the scroll bar position with `SetScrollInfo` and then passes each message on to `DefSubclassProc`.

After **Show** returns, the **ListBox** scrolls horizontally when any item is wider than the visible area.
<!-- /test -->

<!-- test: ScrollTests.LineRight_ContentsFollowThumb, ScrollTests.LineLeft_ContentsFollowThumb, ScrollTests.PageRight_ContentsFollowThumb, ScrollTests.PageLeft_ContentsFollowThumb, ScrollTests.Right_ContentsFollowThumb, ScrollTests.ThumbTrack_ContentsFollowThumb -->
> [!WARNING] 1.0.0.1
> The thumb of the scroll bar and the contents of the list disagree after a click on a scroll arrow or in the track of the scroll bar. The subclass moves the thumb by 20 pixels for an arrow and by one page for the track, while the list box scrolls its contents by its own step, for example 9 pixels for an arrow and about two-thirds of a page for the track. After a few clicks the thumb is at a position the list does not show. Dragging the thumb, and the scroll to the start or the end, leave them equal.

<!-- test: ShowTests.Show_ItemAddedLaterIsNotMeasured, ShowTests.Show_AgainMeasuresTheNewItems -->
> [!IMPORTANT] timeless
> **Show** must be called after the **ListBox** has been populated. If items are added or removed after the call, the horizontal extent is not updated automatically. Call **Show** again on the same control to recalculate the extent for the updated item list.
<!-- /test -->

<!-- test: UnShowTests.Terminate_RemovesTheSubclass, UnShowTests.UnShow_RemovesTheSubclass -->
> [!NOTE] timeless
> The subclass installed by **Show** is removed automatically when the class instance is destroyed (`Class_Terminate`). It can also be removed explicitly by calling [**UnShow**](UnShow).

### Example

This example attaches a horizontal scroll bar to a **ListBox** named `List1` after filling it with items.

```tb check_build
Private hScroll As New cListboxHScroll

Private Sub Form_Load()
    List1.AddItem "Short item"
    List1.AddItem "A much longer item that exceeds the visible width of the list box"
    List1.AddItem "Another moderately long entry"

    hScroll.Show List1
End Sub

Private Sub Form_Unload(Cancel As Integer)
    hScroll.UnShow
End Sub
```

### See Also

- [UnShow](UnShow) method
