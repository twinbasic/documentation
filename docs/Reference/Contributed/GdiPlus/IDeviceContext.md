---
title: IDeviceContext
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/IDeviceContext
---

# IDeviceContext interface
{: .no_toc }

**IDeviceContext** is the pair of members that hand out a Windows device context for drawing with GDI calls.

It is implemented by [**Graphics**](Graphics). The device context is a GDI **HDC**: a handle that GDI functions such as **SetPixelV**, **TextOut** or **BitBlt** accept. A program takes it with **GetHdc**, draws with GDI and gives it back with **ReleaseHdc**. Between the two calls the **Graphics** object is locked. Calling any other method of the **Graphics** object fails with **ObjectBusy** until **ReleaseHdc** is called.

The interface has two members. **Graphics** also has methods of its own with the names **GetHDC** and **ReleaseHDC**; the one that takes the handle as an argument is described on the [**Graphics**](Graphics) page.

## GetHdc
{: .no_toc }

Syntax: *object*.**GetHdc** **As LongPtr**

Returns the device context of the object. The handle is 0 if the call fails.

## ReleaseHdc
{: .no_toc }

Syntax: *object*.**ReleaseHdc**

Gives the device context back, which unlocks the object. It must be called after each successful **GetHdc**, and before the next use of the object. The handle is not passed in: the object remembers the one it gave out.

The GDI calls draw on the same surface as GDI+. A GDI colour is a **COLORREF**, the value `&H00BBGGRR`, so a call that takes a Visual Basic colour such as `vbRed` draws red. The example uses this declaration:

```tb hidden slot=module
Declare PtrSafe Function SetPixelV Lib "gdi32" (ByVal hdc As LongPtr, ByVal x As Long, ByVal y As Long, ByVal crColor As Long) As Long
```

```tb inert=excerpt
Declare PtrSafe Function SetPixelV Lib "gdi32" (ByVal hdc As LongPtr, ByVal x As Long, ByVal y As Long, ByVal crColor As Long) As Long
```

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Dim g As Graphics = Graphics(bmp)
g.Clear Color(255, 255, 255, 255)

Dim dc As IDeviceContext = g
Dim hdc As LongPtr = dc.GetHdc
SetPixelV hdc, 2, 3, &HFF&                    ' a COLORREF: red
SetPixelV hdc, 4, 3, &HFF0000                 ' a COLORREF: blue
dc.ReleaseHdc

Dim c As Color = bmp.Pixel(2, 3)
Debug.Print Hex$(c.R) & " " & Hex$(c.G) & " " & Hex$(c.B)    ' FF 0 0
c = bmp.Pixel(4, 3)
Debug.Print Hex$(c.R) & " " & Hex$(c.G) & " " & Hex$(c.B)    ' 0 0 FF

```

## See Also

- [Graphics](Graphics) class
- [ITransformable](ITransformable) interface
- [Graphics::GetHDC](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusgraphics/nf-gdiplusgraphics-graphics-gethdc) -- Microsoft's documentation of the GDI+ method
