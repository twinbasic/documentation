---
title: UnShow
parent: cListboxHScroll
permalink: /tB/Packages/Contributed/TBMANLIB_ListBoxHScroll/cListboxHScroll/UnShow
has_toc: false
---
# UnShow
{: .no_toc }

Removes the window subclass installed by [**Show**](Show).

Syntax: *object*.**UnShow**

*object*
: *required* An object expression that evaluates to a **cListboxHScroll** instance.

**UnShow** calls `RemoveWindowSubclass` (comctl32) to detach the scroll message handler that was installed by **Show**. After this call, the **ListBox** control associated with the instance no longer receives the subclassed `WM_HSCROLL` processing added by the class.

> [!NOTE] timeless
> **UnShow** does not hide the horizontal scrollbar itself, and does not reset the horizontal extent or release the **ListBox** reference---it removes only the subclass procedure. Call `ShowScrollBar` directly with `SB_HORZ` and `0` if the scrollbar must also be hidden.

> [!IMPORTANT] timeless
> The class destructor (`Class_Terminate`) calls the internal `RemoveListBoxSubclass` helper automatically, so **UnShow** need only be called explicitly when the subclass must be removed before the **cListboxHScroll** instance goes out of scope.

### Example

This example adds a horizontal scrollbar to a ListBox on a form, then removes it when a button is clicked.

```tb check_build
Private HScroll As cListboxHScroll

Private Sub Form_Load()
    Set HScroll = New cListboxHScroll
    HScroll.Show List1
End Sub

Private Sub cmdRemove_Click()
    HScroll.UnShow
End Sub
```

### See Also

- [Show](Show) method
