---
title: CachedBitmap
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/CachedBitmap
---

# CachedBitmap class
{: .no_toc }

A copy of a bitmap in the format of one particular [**Graphics**](Graphics), for drawing it again and again quickly.

A [**Bitmap**](Bitmap) is converted to the format of the destination every time it is drawn. A **CachedBitmap** does that conversion once, when it is created, so that [**Graphics.DrawCachedBitmap**](Graphics#drawcachedbitmap) can copy the pixels without converting them. It suits a picture that is drawn many times unchanged. The class has no members of its own besides the constructor, and the copy does not follow later changes to the bitmap. It mirrors the GDI+ [CachedBitmap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscachedbitmap/nl-gdipluscachedbitmap-cachedbitmap) class.

## Creating

Syntax: *cached* **= CachedBitmap**( *bitmap*, *gr* )

Syntax: *cached* **= New CachedBitmap**( *bitmap*, *gr* )

*bitmap*
: *required* The [**Bitmap**](Bitmap) to copy.

*gr*
: *required* The [**Graphics**](Graphics) whose pixel format and settings the copy is made for.

A constructor that fails creates an unusable object whose **LastResult** tells why.

<!-- test: Im_CachedBitmapTests.Draw_OnGraphicsOfTheSameFormat, Im_CachedBitmapTests.Draw_OnGraphicsOfAnotherFormatIsWrongState -->
> [!NOTE] 0.9.45.0
> A **CachedBitmap** is valid for the **Graphics** it was made for, and for another with the same pixel format. If the format of the destination changes (for example, the display resolution or colour depth changes), the cached copy has to be made again, and drawing it on a destination with another format fails with **WrongState**.

## Drawing

Draw it with [**Graphics.DrawCachedBitmapI**](Graphics#drawcachedbitmapi), which takes the position as two **Long** values, or with [**DrawCachedBitmap**](Graphics#drawcachedbitmap), which takes a [**GpPoint**](Types/GpPoint). The copy is drawn without scaling, and with its upper left corner at that position.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim tile As Bitmap = Bitmap(4!, 4!)
Dim tg As Graphics = Graphics(tile)
tg.Clear(Color(255, 255, 0, 0))

Dim target As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(target)

Dim cached As CachedBitmap = CachedBitmap(tile, g)
Debug.Print cached.LastResult

Debug.Print g.DrawCachedBitmapI(cached, 2, 2)
Debug.Print Hex$(target.Pixel(3, 3).argb)
Debug.Print Hex$(target.Pixel(0, 0).argb)
' Output:
' 0
' 0
' FFFF0000
' 0
```

## Example

The example paints the same cached tile at three positions.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim tile As Bitmap = Bitmap(2!, 2!)
Dim tg As Graphics = Graphics(tile)
tg.Clear(Color(255, 0, 128, 0))

Dim target As Bitmap = Bitmap(8!, 2!)
Dim g As Graphics = Graphics(target)
Dim cached As CachedBitmap = CachedBitmap(tile, g)

Dim x As Long
For x = 0 To 6 Step 3
    g.DrawCachedBitmapI cached, x, 0
Next

For x = 0 To 7
    Debug.Print Hex$(target.Pixel(x, 0).A) & " ";
Next
Debug.Print
' Output:
' FF FF 0 FF FF 0 FF FF
```

## See Also

- [CachedBitmap](https://learn.microsoft.com/en-us/windows/win32/api/gdipluscachedbitmap/nl-gdipluscachedbitmap-cachedbitmap) -- Microsoft's documentation of the GDI+ class
- [Bitmap](Bitmap) class
- [Graphics](Graphics) class
