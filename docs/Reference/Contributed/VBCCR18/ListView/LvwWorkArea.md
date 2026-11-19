---
title: LvwWorkArea
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LvwWorkArea
has_toc: false
---

# LvwWorkArea class
{: .no_toc }

One work area of a [**ListView**](.): its rectangle and the items in it. A program gets one from the [**LvwWorkAreas**](LvwWorkAreas) collection and its [**Add**](LvwWorkAreas#add) method, and from an item's [**WorkArea**](LvwListItem#workarea).

```tb check_build check_run arch=win32,win64
Dim Area As LvwWorkArea
With ListView1
    .View = LvwViewIcon
    Set Area = .WorkAreas.Add(0, 0, 2000, 1500)
    .ListItems.Add , , "first"
    Debug.Print Area.Index; Area.ListItemIndices.Count; .ListItems(1).WorkArea.Index
End With
' Output:
'  1  1  1
```

A program cannot make an **LvwWorkArea** object with **New**. The object stands for a number: after a work area in front of it is added or removed, it works on the work area that now has that number.

* TOC
{:toc}

Properties
----------

### Height, Left, Top, Width
{: .no_toc }

The rectangle of the work area, measured from the control's top left corner, in the scale units of the control's container. **Single**, read-only: an assignment raises run-time error 383. Windows keeps the rectangle in pixels, so a value read back can differ a little from the one given to [**Add**](LvwWorkAreas#add).

### Index
{: .no_toc }

The number of the work area, from 1. **Long**, read-only.

### ListItemIndices
{: .no_toc }

The numbers of the items in the work area, as a **Collection**. Read-only. It has a meaning in the icon, small icon and tile views; in another view reading it raises run-time error 394.

## See Also

- [LvwWorkAreas](LvwWorkAreas) class -- the collection of the work areas
- [Views and Icons](Views#work-areas) -- work areas in the control
