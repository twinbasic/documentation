---
title: IBrush
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/IBrush
---

# IBrush interface
{: .no_toc }

The interface that every brush of the package implements. **Brush** is another name for it.

A brush decides what a fill method of [**Graphics**](Graphics) puts inside a shape, and what a [**Pen**](Pen) draws with. The package has five kinds of brush, one class each:

| Class | Fills with |
|:------|:-----------|
| [**SolidBrush**](SolidBrush) | One colour. |
| [**HatchBrush**](HatchBrush) | A pattern of lines or dots in two colours. |
| [**LinearGradientBrush**](LinearGradientBrush) | A colour that changes along a line. |
| [**PathGradientBrush**](PathGradientBrush) | A colour that changes from a centre point to the edge of a path. |
| [**TextureBrush**](TextureBrush) | An image, repeated. |

Because every class implements **IBrush**, a parameter or a variable declared **As Brush** takes any of them, and the type of an object that came back as a **Brush** can be asked with [**Type**](#type).

* TOC
{:toc}

## What the brushes share

Each brush class is created with `New` or with the function of the same name, for example **New SolidBrush**(*color*) and **SolidBrush**(*color*). The two are one thing and are documented once, under *Creating* on the page of the class.

Each brush class inherits from **GdiPlusBase**, so it has the **LastResult** property: the last status that GDI+ reported as a failure, or **Ok**. Unless the program sets **GdipErrorHandlingStrategy**, a failure raises no error.

> [!NOTE] 0.9.45.0
> **LastResult** keeps the last failure until **ClearResult** is called. A property that returns an object returns **Nothing** while **LastResult** is not **Ok**, even when the failure was an earlier, unrelated call, and **Clone** does the same.

A brush deletes its GDI+ object when the last reference to the brush is released.

### Colours

Every brush that takes colours has two forms: one with **Color** parameters, and one with **Long** parameters, which are the *rgb* forms. The **Color** forms are the ones to use.

> [!WARNING] 0.9.45.0
> A **Long** passed to an *rgb* parameter is read as `&H00RRGGBB`: red in the third byte and blue in the first. It is not a VB colour (a `COLORREF`, `&H00BBGGRR`), so `SolidBrush(vbRed)` and `SolidBrush(RGB(255, 0, 0))` paint blue, and the colour constants of VB and the system colours (`vbButtonFace`, `&H8000000F`) are not translated. The alpha byte of the **Long** is dropped, so the result is always opaque. A member of **CColor** passed there binds to the **Long** form and loses its alpha: `SolidBrush(CColor.Transparent)` fills opaque white. Pass `Color(`*alpha*`, `*red*`, `*green*`, `*blue*`)`, or `Color(CColor.Transparent)`, to get the colour that was meant.

## Members

### CloneBrush

Syntax: *copy* **=** *brush*.**CloneBrush**( )

Returns a new brush of the same class with the same settings, as an **IBrush**. Changing the copy does not change the original. The class of the copy is the class of the original: a **Brush** variable that holds a **HatchBrush** gives a **HatchBrush** back, and can be assigned to a **HatchBrush** variable.

Each class has a **Clone** method as well, which returns the copy as the class itself.

### NativeBrush

Syntax: *handle* **=** *brush*.**NativeBrush**

Returns the GDI+ handle of the brush, wrapped in a structure. It is for a program that calls the GDI+ functions directly; the handle belongs to the brush and must not be deleted.

### Type

Syntax: *type* **=** *brush*.**Type**

Returns a [**GpBrushType**](Enumerations/GpBrushType) value for the kind of the brush: **BrushTypeSolidColor**, **BrushTypeHatchFill**, **BrushTypeTextureFill**, **BrushTypePathGradient** or **BrushTypeLinearGradient**. The property is read-only.

> [!WARNING] 0.9.45.0
> Reading **Type** of a [**PathGradientBrush**](PathGradientBrush#type) stops a program that runs in the IDE, at an assertion that expects a linear gradient. A compiled program is not affected, and returns **BrushTypePathGradient**.

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim brushes(1 To 3) As Brush
Set brushes(1) = New SolidBrush(Color(255, 0, 128, 0))
Set brushes(2) = New HatchBrush(HatchStyleCross, Color(255, 255, 0, 0), Color(255, 255, 255, 255))
Set brushes(3) = New LinearGradientBrush(GpPointF(0, 0), GpPointF(10, 0), Color(255, 0, 0, 0), Color(255, 255, 255, 255))

Dim i As Long
Dim copy As Brush
For i = 1 To 3
    Set copy = brushes(i).CloneBrush()
    Debug.Print brushes(i).Type & " " & copy.Type
Next

Dim hatch As HatchBrush = brushes(2).CloneBrush()
Debug.Print hatch.HatchStyle = HatchStyleCross
' Output:
' 0 0
' 1 1
' 4 4
' True
```

## See Also

- [Brush](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusbrush/nl-gdiplusbrush-brush) -- Microsoft's documentation of the GDI+ class
- [SolidBrush](SolidBrush) class
- [HatchBrush](HatchBrush) class
- [LinearGradientBrush](LinearGradientBrush) class
- [PathGradientBrush](PathGradientBrush) class
- [TextureBrush](TextureBrush) class
- [Pen](Pen) class
- [GpBrushType](Enumerations/GpBrushType) enumeration
