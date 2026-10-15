---
title: RedEyeCorrectionParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/RedEyeCorrectionParams
---

# RedEyeCorrectionParams type
{: .no_toc }

The parameters of a [**RedEyeCorrection**](../RedEyeCorrection) effect: the rectangles of the picture in which red eyes are corrected.

The type mirrors the GDI+ [RedEyeCorrectionParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-redeyecorrectionparams) structure. The rectangles are stored in memory that the structure points to, so a program allocates the memory, fills it, and releases it when it is done.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **numberOfAreas** | **UINT** | The number of rectangles. |
| **areas** | **LongPtr** | The address of the rectangles. |

## Methods

### Allocate

Syntax: *status* **=** *params*.**Allocate**( *newCount* )

Frees the memory the structure held, allocates room for *newCount* rectangles with the GDI+ allocator, and sets **numberOfAreas** to *newCount*. The rectangles are not initialised. Returns **OutOfMemory** when the allocation fails.

### Area

Syntax: *rect* **=** *params*.**Area**( *index* )

Syntax: **Set** *params*.**Area**( *index* ) **=** *rect*

*index*
: *required* The number of the rectangle, from 1 to **numberOfAreas**.

Gets or sets one rectangle, as a [**GpRect**](GpRect). The property is declared as an object property, so a rectangle is written with the **Set** statement. An index outside the range reads as an empty rectangle and writes nothing.

### GetGpAreas

Syntax: *rects* **=** *params*.**GetGpAreas**( )

Returns copies of the rectangles as an array of [**GpRect**](GpRect) with the lower bound 1.

### GetAreas

Syntax: *rects* **=** *params*.**GetAreas**( )

Returns a view of the rectangle memory as an array of the package's own RECT structure, with the lower bound 1. The view is valid only while the structure keeps its memory.

### Free

Syntax: *params*.**Free**

Releases the memory and sets **numberOfAreas** and **areas** to 0. A program must call it for every structure whose memory it allocated.

## Creating

Syntax: *params* **= RedEyeCorrectionParams**( *areas*( ) )

*areas*
: *required* An array of [**GpRect**](GpRect): the rectangles to copy into newly allocated memory.

> [!WARNING] 0.9.45.0
> The function stops the program with an access violation when the array has elements. Allocate and fill the structure with **Allocate** and **Area**, as the example does. A [**RedEyeCorrection**](../RedEyeCorrection) effect built from the structure does not work either.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As RedEyeCorrectionParams
Debug.Print p.Allocate(2) & " " & p.numberOfAreas
Set p.Area(1) = GpRect(0, 0, 5, 5)
Set p.Area(2) = GpRect(5, 5, 8, 6)

Debug.Print p.Area(1).Width & " " & p.Area(2).X & " " & p.Area(2).Height
Debug.Print p.Area(3).Width

Dim copies() As GpRect = p.GetGpAreas()
Debug.Print LBound(copies) & " " & UBound(copies) & " " & copies(2).Y

p.Free
Debug.Print p.numberOfAreas
' Output:
' 0 2
' 5 5 6
' 0
' 1 2 5
' 0
```

## See Also

- [RedEyeCorrectionParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-redeyecorrectionparams) -- Microsoft's documentation of the GDI+ structure
- [RedEyeCorrection](../RedEyeCorrection) class
- [GpRect](GpRect) type
