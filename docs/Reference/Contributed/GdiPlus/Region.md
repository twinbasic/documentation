---
title: Region
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Region
---

# Region class
{: .no_toc }

A **Region** describes an area of a drawing surface, of any shape, made from rectangles and paths and combined with the operations of set theory.

Regions are used to clip drawing, with the **SetClip** methods of [**Graphics**](Graphics), to fill an area with **FillRegion**, and to test whether a point or a rectangle is inside an area. A region is stored in world coordinates, so it scales and moves with the transformation of the graphics object it is used with. A Windows GDI region is stored in device coordinates.

A new region is *infinite*: it covers the whole plane. [**MakeEmpty**](#makeempty) turns it into an area with no points, and the combining methods [**Intersect**](#intersect), [**Union**](#union), [**Xor**](#xor), [**Exclude**](#exclude) and [**Complement**](#complement) change it by a rectangle, a path or another region.

The methods that describe a region in terms of a drawing surface, such as **Bounds**, **IsEmpty** and **IsVisible**, take a [**Graphics**](Graphics) argument *g* for its transformation. It can be any graphics object. For **Bounds**, **IsEmpty**, **IsInfinite**, **IsEqualTo** and **GetHRGN** it must be a real object: with **Nothing** the call records **InvalidParameter** and returns an empty result. The **IsVisible** methods accept **Nothing**, which means no transformation.

Most members return a [**GpStatus**](Enumerations/GpStatus), which is **Ok** when the call worked. A function or property that fails records its status in **LastResult**, as every object of the package does. See [**GdiPlusBase**](GdiPlusBase). Members that take coordinates have a floating-point and an integer form. The floating-point form takes **Single** values or a [**GpRectF**](Types/GpRectF) or [**GpPointF**](Types/GpPointF). The integer form takes [**GpRect**](Types/GpRect) or [**GpPoint**](Types/GpPoint), or is the method with the extra letter **I**, such as **TranslateI**.

## Creating

Syntax: *region* **= Region(** [ *shape* ] **)**

Syntax: *region* **= New Region(** [ *shape* ] **)**

The function **Region** and **New Region** are the same thing, and take the same arguments.

*shape*
: *optional* What the region covers. Without it the region is infinite. It can be a [**GpRectF**](Types/GpRectF) or a [**GpRect**](Types/GpRect), the rectangle to cover; a [**GraphicsPath**](GraphicsPath), whose inside the region covers, as its [fill mode](GraphicsPath#fillmode) decides; or an **HRGN**, a Windows GDI region handle, passed as a **LongPtr**, which the region copies.

Syntax: *region* **= Region(** *regionData*, *size* **)**

*regionData*
: *required* The first byte of a **Byte** array that holds region data from [**GetData**](#getdata).

*size*
: *required* The number of bytes of data.

Creates a region from data that [**GetData**](#getdata) wrote earlier, which can be stored and used in another program.

Syntax: *region* **= FromHRGN(** *hRgn* **)**

Creates a region from a GDI region handle. It is the same as **Region(** *hRgn* **)**. The region keeps a copy: the program still owns the handle and deletes it with the GDI function **DeleteObject**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)

Dim all As Region = Region()
Debug.Print all.IsInfinite(g) & " " & all.IsEmpty(g)       ' True False
Dim box As Region = Region(GpRectF(10, 20, 30, 40))
Debug.Print box.IsInfinite(g) & " " & box.IsVisible(15, 25, g)    ' False True
```

### Clone
{: .no_toc }

Syntax: *region*.**Clone** **As Region**

Returns a new region that covers the same area. A change to one region does not change the other.

## Combining

### Intersect
{: .no_toc }

Syntax: *region*.**Intersect(** *shape* **)** **As GpStatus**

*shape*
: *required* A [**GpRectF**](Types/GpRectF), a [**GpRect**](Types/GpRect), a [**GraphicsPath**](GraphicsPath) or a **Region**.

Changes the region to the part of it that is also inside *shape*.

### Union
{: .no_toc }

Syntax: *region*.**Union(** *shape* **)** **As GpStatus**

Changes the region to everything that is inside the region, *shape* or both.

### Xor
{: .no_toc }

Syntax: *region*.**Xor(** *shape* **)** **As GpStatus**

Changes the region to the parts that are inside the region or *shape* but not both.

### Exclude
{: .no_toc }

Syntax: *region*.**Exclude(** *shape* **)** **As GpStatus**

Changes the region to the part of it that is not inside *shape*.

### Complement
{: .no_toc }

Syntax: *region*.**Complement(** *shape* **)** **As GpStatus**

Changes the region to the part of *shape* that is not inside the region. It is **Exclude** the other way round.

The arguments of the five methods are the same. This example starts each time from the square from 0, 0 to 50, 50 and combines it with the square from 25, 0 to 75, 50, then reads the bounds of the result:

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim other As GpRectF = GpRectF(25, 0, 50, 50)
Dim b As GpRectF

Dim r As Region = Region(GpRectF(0, 0, 50, 50))
r.Intersect other
b = r.Bounds(g)
Debug.Print "intersect " & b.X & " " & b.Width        ' intersect 25 25

Set r = Region(GpRectF(0, 0, 50, 50))
r.Union other
b = r.Bounds(g)
Debug.Print "union " & b.X & " " & b.Width            ' union 0 75

Set r = Region(GpRectF(0, 0, 50, 50))
r.Exclude other
b = r.Bounds(g)
Debug.Print "exclude " & b.X & " " & b.Width          ' exclude 0 25

Set r = Region(GpRectF(0, 0, 50, 50))
r.Complement other
b = r.Bounds(g)
Debug.Print "complement " & b.X & " " & b.Width       ' complement 50 25

Set r = Region(GpRectF(0, 0, 50, 50))
r.Xor other
Debug.Print "xor " & r.IsVisible(10, 10, g) & " " & r.IsVisible(30, 10, g) & " " & r.IsVisible(60, 10, g)    ' xor True False True
```

## State

### MakeInfinite
{: .no_toc }

Syntax: *region*.**MakeInfinite** **As GpStatus**

Changes the region to cover the whole plane.

### MakeEmpty
{: .no_toc }

Syntax: *region*.**MakeEmpty** **As GpStatus**

Changes the region to cover nothing.

### IsEmpty and IsInfinite
{: .no_toc }

Syntax: *region*.**IsEmpty(** *g* **)** **As Boolean**

Syntax: *region*.**IsInfinite(** *g* **)** **As Boolean**

**True** when the region covers nothing, or the whole plane.

### IsEqualTo
{: .no_toc }

Syntax: *region*.**IsEqualTo(** *other*, *g* **)** **As Boolean**

**True** when the two regions cover the same area.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim r As Region = Region()
r.MakeEmpty
Debug.Print r.IsEmpty(g) & " " & r.IsInfinite(g)           ' True False
r.MakeInfinite
Debug.Print r.IsEmpty(g) & " " & r.IsInfinite(g)           ' False True
Dim a As Region = Region(GpRectF(1, 2, 3, 4))
Debug.Print a.IsEqualTo(a.Clone, g) & " " & a.IsEqualTo(r, g)      ' True False
```

## Bounds

### Bounds and BoundsI
{: .no_toc }

Syntax: *region*.**Bounds(** *g* **)** **As GpRectF**

Syntax: *region*.**BoundsI(** *g* **)** **As GpRect**

Returns a rectangle that holds the whole region, in the coordinates of the graphics object *g*. **Bounds** returns a [**GpRectF**](Types/GpRectF), **BoundsI** a [**GpRect**](Types/GpRect) with whole numbers.

## Moving and transforming

### Translate and TranslateI
{: .no_toc }

Syntax: *region*.**Translate(** *dx*, *dy* **)** **As GpStatus**

Syntax: *region*.**Translate(** *offset* **)** **As GpStatus**

Syntax: *region*.**TranslateI(** *dx*, *dy* **)** **As GpStatus**

*dx*, *dy*
: *required* The distances to move by along each axis, **Single** for **Translate** and **Long** for **TranslateI**.

*offset*
: *required* A [**GpPointF**](Types/GpPointF) or a [**GpPoint**](Types/GpPoint).

Moves the region.

### Transform
{: .no_toc }

Syntax: *region*.**Transform(** *matrix* **)** **As GpStatus**

*matrix*
: *required* A [**Matrix**](Matrix).

Multiplies each point of the region by the matrix.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim r As Region = Region(GpRectF(0, 0, 50, 50))
r.Translate 5, 6
Dim b As GpRectF = r.Bounds(g)
Debug.Print b.X & " " & b.Y & " " & b.Width        ' 5 6 50
Dim m As Matrix = Matrix()
m.Scale 2, 2
r.Transform m
b = r.Bounds(g)
Debug.Print b.X & " " & b.Y & " " & b.Width        ' 10 12 100
```

## Hit testing

### IsVisible
{: .no_toc }

Syntax: *region*.**IsVisible(** *x*, *y*, *g* **)** **As Boolean**

Syntax: *region*.**IsVisible(** *point*, *g* **)** **As Boolean**

Syntax: *region*.**IsVisible(** *x*, *y*, *width*, *height*, *g* **)** **As Boolean**

Syntax: *region*.**IsVisible(** *rect*, *g* **)** **As Boolean**

Syntax: *region*.**IsVisibleI(** *x*, *y*, *g* **)** **As Boolean**

Syntax: *region*.**IsVisibleI(** *x*, *y*, *width*, *height*, *g* **)** **As Boolean**

With a point, **True** when the point is inside the region. With a rectangle, **True** when the rectangle and the region have a point in common. *g* can be **Nothing**.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As Region = Region(GpRectF(10, 10, 20, 20))
Debug.Print r.IsVisible(15, 15, Nothing) & " " & r.IsVisible(GpPointF(5, 5), Nothing)    ' True False
Debug.Print r.IsVisible(GpRectF(0, 0, 12, 12), Nothing) & " " & r.IsVisible(GpRectF(0, 0, 5, 5), Nothing)    ' True False
Debug.Print r.IsVisibleI(15, 15, Nothing)          ' True
```

## Scans

The scans are a set of rectangles that approximate the region. A rectangular region has one; a region with curved edges has many thin ones.

### GetRegionScansCount
{: .no_toc }

Syntax: *region*.**GetRegionScansCount(** *matrix* **)** **As Long**

The number of rectangles. The number can depend on the *matrix*, a [**Matrix**](Matrix), which is applied to the region first; it is normally the world-to-device transformation of a graphics object, or an identity matrix.

### GetRegionScans and GetRegionScansI
{: .no_toc }

Syntax: *region*.**GetRegionScans(** *matrix* **)** **As GpRectF()**

Syntax: *region*.**GetRegionScansI(** *matrix* **)** **As GpRect()**

Syntax: *region*.**GetRegionScans(** *matrix*, *rects*, *count* **)** **As GpStatus**

*rects*
: *required* The first element of an array of [**GpRectF**](Types/GpRectF) or [**GpRect**](Types/GpRect) that has room for all the rectangles. Call **GetRegionScansCount** first to find out how many.

*count*
: *required* A **Long** variable that receives the number of rectangles written.

The array forms return the rectangles in an array with indexes from 1. The array is empty when the region has no rectangles. The last form writes into an array that the program owns.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim r As Region = Region(GpRectF(5, 6, 10, 20))
Dim m As Matrix = Matrix()
Debug.Print r.GetRegionScansCount(m)               ' 1
Dim sc() As GpRectF = r.GetRegionScans(m)
Debug.Print sc(1).X & " " & sc(1).Y & " " & sc(1).Width & " " & sc(1).Height     ' 5 6 10 20

Dim buf(1 To 4) As GpRectF
Dim n As Long = 4
Debug.Print r.GetRegionScans(m, buf(1), n) & " " & n      ' 0 1
```

## Saving a region

### GetDataSize
{: .no_toc }

Syntax: *region*.**GetDataSize** **As Long**

The number of bytes that [**GetData**](#getdata) writes.

### GetData
{: .no_toc }

Syntax: *region*.**GetData(** *buffer*, *bufferSize*, [ *sizeFilled* ] **)** **As GpStatus**

*buffer*
: *required* The first byte of a **Byte** array with at least *bufferSize* bytes.

*bufferSize*
: *required* The size of the array, in bytes. It should be at least **GetDataSize**.

*sizeFilled*
: *optional* A **Long** variable that receives the number of bytes written.

Writes a description of the region into the array. A program creates a region from the data again with the constructor that takes data.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(10!, 10!)
Dim g As Graphics = Graphics(bmp)
Dim r As Region = Region(GpRectF(5, 6, 10, 20))
Dim size As Long = r.GetDataSize
Dim data() As Byte
ReDim data(0 To size - 1)
Dim filled As Long
r.GetData data(0), size, filled
Debug.Print (filled = size)                        ' True

Dim copy As Region = Region(data(0), filled)
Dim b As GpRectF = copy.Bounds(g)
Debug.Print b.X & " " & b.Y & " " & b.Width & " " & b.Height      ' 5 6 10 20
```

## Windows regions

### GetHRGN
{: .no_toc }

Syntax: *region*.**GetHRGN(** *g* **)** **As LongPtr**

Creates a Windows GDI region with the same area, in device coordinates, and returns its handle. The program owns the handle and deletes it with the GDI function **DeleteObject**. The handle is 0 if the call fails.

The two directions use the GDI functions **CreateRectRgn**, **GetRgnBox** and **DeleteObject**, which the example declares:

```tb hidden slot=module
Declare PtrSafe Function CreateRectRgn Lib "gdi32" (ByVal x1 As Long, ByVal y1 As Long, ByVal x2 As Long, ByVal y2 As Long) As LongPtr
Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal h As LongPtr) As Long
Declare PtrSafe Function GetRgnBox Lib "gdi32" (ByVal h As LongPtr, ByRef r As Long) As Long
```

```tb inert=excerpt
Declare PtrSafe Function CreateRectRgn Lib "gdi32" (ByVal x1 As Long, ByVal y1 As Long, ByVal x2 As Long, ByVal y2 As Long) As LongPtr
Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal h As LongPtr) As Long
Declare PtrSafe Function GetRgnBox Lib "gdi32" (ByVal h As LongPtr, ByRef r As Long) As Long
```

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(100!, 100!)
Dim g As Graphics = Graphics(bmp)

Dim h As LongPtr = CreateRectRgn(10, 20, 40, 60)
Dim r As Region = FromHRGN(h)
DeleteObject h                                     ' the region keeps a copy
Dim b As GpRectF = r.Bounds(g)
Debug.Print b.X & " " & b.Y & " " & b.Width & " " & b.Height    ' 10 20 30 40

Dim h2 As LongPtr = r.GetHRGN(g)
Dim box(0 To 3) As Long                            ' left, top, right, bottom
GetRgnBox h2, box(0)
Debug.Print box(0) & " " & box(1) & " " & box(2) & " " & box(3)    ' 10 20 40 60
DeleteObject h2
```

## Example

This example builds a ring from two ellipses, draws it, and tests two points. It then clips the drawing with the ring.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(40!, 40!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim outer As GraphicsPath = GraphicsPath()
outer.AddEllipse 2, 2, 36, 36
Dim inner As GraphicsPath = GraphicsPath()
inner.AddEllipse 10, 10, 20, 20
Dim ring As Region = Region(outer)
ring.Exclude inner

Dim blue As SolidBrush = New SolidBrush(Color(255, 0, 0, 255))
g.FillRegion blue, ring
Debug.Print Hex$(bmp.Pixel(20, 5).R) & " " & Hex$(bmp.Pixel(20, 5).B)       ' 0 FF
Debug.Print Hex$(bmp.Pixel(20, 20).R) & " " & Hex$(bmp.Pixel(20, 20).B)     ' FF FF

g.SetClip ring
g.Clear Color(255, 255, 0, 0)
Debug.Print Hex$(bmp.Pixel(20, 5).G) & " " & Hex$(bmp.Pixel(20, 20).G)      ' 0 FF
Debug.Print ring.IsVisible(20, 5, g) & " " & ring.IsVisible(20, 20, g)      ' True False
```

## See Also

- [GraphicsPath](GraphicsPath) class -- a path can become a region
- [Matrix](Matrix) class -- the transformation applied by **Transform**
- [Graphics](Graphics) class -- **FillRegion** and **SetClip** use a region
- [GpCombineMode](Enumerations/GpCombineMode) enumeration -- the combining operations as the **SetClip** methods name them
- [Region class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-region) -- Microsoft's documentation of the GDI+ class
