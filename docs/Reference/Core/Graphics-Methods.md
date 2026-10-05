---
title: Line, Circle, PSet, Scale
parent: Statements
permalink: /tB/Core/Graphics-Methods
---
# Line, Circle, PSet, Scale
{: .no_toc }

Turns the drawing syntax of **Line**, **Circle**, **PSet** and **Scale** into an ordinary method call with a flags argument.

Drawing surfaces such as [**Form**](../Packages/VB/Form/), [**PictureBox**](../Packages/VB/PictureBox/) and [**Printer**](../Packages/VB/Printer/) take these four methods in a form that is not an ordinary argument list: the points are written `(x, y)`, two points are joined by `-`, **Step** makes a point relative, and **B** or **BF** turns a line into a box. The compiler recognises the method name, reads that syntax, and calls the method with a *Flags* value first that records which parts were written. The method receives plain numbers.

Syntax:

- > *object*.**Line** [ [ **Step** ] ( *X1*, *Y1* ) ] -[ **Step** ] ( *X2*, *Y2* ) [, [ *Color* ] [, **B** [ **F** ] ] ]
- > *object*.**Circle** [ **Step** ] ( *X*, *Y* ), *Radius* [, [ *Color* ] [, [ *Start* ] [, [ *End* ] [, *Aspect* ] ] ] ]
- > *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]
- > *object*.**Scale** [ ( *X1*, *Y1* )-( *X2*, *Y2* ) ]

## The call the compiler makes

Each form becomes a call with *Flags* as the first argument, followed by every remaining argument in a fixed order. A part that is left out is passed as `0`, with its flag clear, so the method can tell an omitted *Color* from a *Color* of `0`.

| Method | Parameters, in order |
|--------|----------------------|
| **Line** | *Flags*, *X1*, *Y1*, *X2*, *Y2*, *Color* |
| **Circle** | *Flags*, *X*, *Y*, *Radius*, *Color*, *Start*, *End*, *Aspect* |
| **PSet** | *Flags*, *X*, *Y*, *Color* |
| **Scale** | *Flags*, *X1*, *Y1*, *X2*, *Y2* |

The coordinates, *Radius*, angles and *Aspect* are **Single** values, *Color* is a **Long**, and *Flags* is a **Long** bit mask.

### The flags

| Value | Name in the VB package | Set when |
|------:|------------------------|----------|
| 1 | StepOnFirstCoords | **Step** precedes the first point (**Line**, **PSet**, **Circle**) |
| 2 | ColorSpecified | *Color* is written |
| 4 | FirstCoordsSpecified | the first point of **Line** or **Scale** is written |
| 8 | StepOnSecondCoords | **Step** precedes the second point of **Line** |
| 16 | Box | **B** is written |
| 32 | BoxFilled | **BF** is written |
| 64 | StartSpecified | *Start* is written |
| 128 | EndSpecified | *End* is written |
| 256 | AspectSpecified | *Aspect* is written |

The names belong to a private enumeration in the VB package, so code that implements these methods writes the numbers or declares its own constants. **BF** sets only 32, not 16 and 32 together.

## Line

The first point is optional. When it is left out, *X1* and *Y1* are passed as `0` and flag 4 is clear, which is how a method knows to start from the current position. **Step** before the first point sets flag 1, and **Step** before the second point sets flag 8.

| Statement | Flags | Arguments after *Flags* |
|-----------|------:|-------------------------|
| `(1, 2)-(3, 4)` | 4 | `1, 2, 3, 4, 0` |
| `(1, 2)-(3, 4), 5` | 6 | `1, 2, 3, 4, 5` |
| `(1, 2)-(3, 4), 5, B` | 22 | `1, 2, 3, 4, 5` |
| `(1, 2)-(3, 4), 5, BF` | 38 | `1, 2, 3, 4, 5` |
| `(1, 2)-(3, 4), , B` | 20 | `1, 2, 3, 4, 0` |
| `Step(1, 2)-(3, 4)` | 5 | `1, 2, 3, 4, 0` |
| `(1, 2)-Step(3, 4)` | 12 | `1, 2, 3, 4, 0` |
| `Step(1, 2)-Step(3, 4), 5, BF` | 47 | `1, 2, 3, 4, 5` |
| `-(3, 4)` | 0 | `0, 0, 3, 4, 0` |
| `-Step(3, 4)` | 8 | `0, 0, 3, 4, 0` |
| `-(3, 4), 7, B` | 18 | `0, 0, 3, 4, 7` |

**B** and **BF** are case-insensitive. They are recognised only in the slot after the colour: a local variable named `B` or `F` does not change them, and in the colour slot itself `, B` is an ordinary expression that supplies the colour.

## Circle

**Circle** never sets flag 4, because its centre is not optional. *Start*, *End* and *Aspect* each set their flag when written, even for a value of `0`, so a method can tell a *Start* of `0` from an omitted one. The values pass through unchanged, negative angles included.

| Statement | Flags | Arguments after *Flags* |
|-----------|------:|-------------------------|
| `(1, 2), 3` | 0 | `1, 2, 3, 0, 0, 0, 0` |
| `Step(1, 2), 3` | 1 | `1, 2, 3, 0, 0, 0, 0` |
| `(1, 2), 3, 4` | 2 | `1, 2, 3, 4, 0, 0, 0` |
| `(1, 2), 3, 4, 0.5` | 66 | `1, 2, 3, 4, 0.5, 0, 0` |
| `(1, 2), 3, 4, 0.5, 1.5` | 194 | `1, 2, 3, 4, 0.5, 1.5, 0` |
| `(1, 2), 3, , , 1.5` | 128 | `1, 2, 3, 0, 0, 1.5, 0` |
| `(1, 2), 3, , , , 2.5` | 256 | `1, 2, 3, 0, 0, 0, 2.5` |
| `(1, 2), 3, , 0` | 64 | `1, 2, 3, 0, 0, 0, 0` |
| `Step(1, 2), 3, 4, -0.5, -1.5, 2.5` | 451 | `1, 2, 3, 4, -0.5, -1.5, 2.5` |

## PSet

**PSet** never sets flag 4.

| Statement | Flags | Arguments after *Flags* |
|-----------|------:|-------------------------|
| `(1, 2)` | 0 | `1, 2, 0` |
| `(1, 2), 5` | 2 | `1, 2, 5` |
| `Step(1, 2)` | 1 | `1, 2, 0` |
| `Step(1, 2), 5` | 3 | `1, 2, 5` |

## Scale

**Scale** takes either two points or nothing. **Step** is not accepted: `o.Scale Step(1, 2)-(3, 4)` is error TB5079.

| Statement | Flags | Arguments after *Flags* |
|-----------|------:|-------------------------|
| `(1, 2)-(3, 4)` | 4 | `1, 2, 3, 4` |
| *(no arguments)* | 0 | `0, 0, 0, 0` |

## Any object can take the syntax

The compiler reads the syntax from the method name alone: **Line**, **Circle**, **PSet** or **Scale**. It does not look at the type of the object. All of these use it:

- a method of a class declared in the project, called through a variable of that class;
- a variable declared **As Object** or **As Variant**, where the call is late-bound;
- a variable of an **Interface** type;
- the object of a **With** block, `Me.Line`, and a bare `Line` inside the class;
- a **Public Sub** in a module, called bare or as `ModuleName.Line`.

A method of any other name gets ordinary syntax errors: `o.Foo (1, 2)-(3, 4)` does not compile.

The method must accept the whole argument list: six arguments for **Line**, eight for **Circle**, four for **PSet** and five for **Scale**. A method with fewer parameters is error TB5103, *Too many arguments*. The parameter types and **ByRef** or **ByVal** are not checked against a fixed signature; the usual conversions apply. A method with extra trailing **Optional** parameters is accepted, and they take their defaults.

> [!IMPORTANT]
> The default value of an **Optional** parameter is not used for a part that was left out. The compiler passes `0`, so a parameter declared `Optional ByVal Color As Long = vbBlack` receives `0` whether or not *Color* was written. Test *Flags* to find out what was written.

The plain call forms are not rewritten. `o.Line 99, 1, 2, 3, 4, 5` and `Call o.Line(99, 1, 2, 3, 4, 5)` pass their arguments through unchanged. A trailing comma is accepted after the second point of **Line** and after the point of **PSet**, but not after the radius of **Circle**, where it is error TB5075.

> [!NOTE]
> VB6 reserves some of these names. It accepts a **Public Sub Line** in a module and a qualified call such as `Module1.Line (1, 2)-(3, 4), 5, B`, and passes the same flags as above to it. It refuses a bare `Line (1, 2)-(3, 4)` in a module, with the error *Method not valid without suitable object*, and it does not accept a procedure named **Circle**, **PSet** or **Scale** at all. In twinBASIC a procedure may have any of the four names, and a bare call in a module reaches the module's procedure.

## What the built-in surfaces do with the flags

The six drawing classes of the VB package implement these methods. [**Printer**](../Packages/VB/Printer/) declares its own version, with a *Flags* parameter of type **Long**, and passes each call on to the same implementation; the other five inherit one shared declaration. They act on the flags like this:

- With flag 2 clear, the line, outline or point is drawn in [**ForeColor**](../Packages/VB/Form/#forecolor).
- **Line** without flag 4 starts at (**CurrentX**, **CurrentY**). **Step** on the first point adds those values to it. **Step** on the second point is relative to the first point, or to (**CurrentX**, **CurrentY**) when there is no first point. Afterwards (**CurrentX**, **CurrentY**) is the end point.
- **B** draws a rectangle outline using [**FillColor**](../Packages/VB/Form/#fillcolor) and [**FillStyle**](../Packages/VB/Form/#fillstyle) for the interior. **BF** draws a solid rectangle in the line colour.
- **PSet** with **Step** adds (**CurrentX**, **CurrentY**) to the point. Afterwards (**CurrentX**, **CurrentY**) is the point.
- **Circle** with **Step** adds (**CurrentX**, **CurrentY**) to the centre, and afterwards (**CurrentX**, **CurrentY**) is the centre. Without *Start* and *End* it draws a full ellipse, filled with [**FillColor**](../Packages/VB/Form/#fillcolor) and [**FillStyle**](../Packages/VB/Form/#fillstyle). *Start* and *End* are angles in radians, counter-clockwise from the 3 o'clock position. A negative angle is used as its absolute value, and the radius from the centre to that end of the arc is drawn as well. When both are negative the shape is a pie, filled like the ellipse; an arc with one radius or none is not filled. A negative zero is zero and draws no radius, so a pie that starts at angle 0 is written with a *Start* of `-2 * pi`. An angle, positive or negative, whose magnitude exceeds 2 pi raises error 5 and draws nothing. With flag 256 clear, *Aspect* is ignored.

For example, after `Form1.PSet (100, 100)` followed by `Form1.PSet Step(3, 4)`, the position is (103, 104). A call through an **As Object** variable draws in the same way.

The full description of each method on each class is in that class's own section: [**Line**](../Packages/VB/Form/#line), [**Circle**](../Packages/VB/Form/#circle), [**PSet**](../Packages/VB/Form/#pset) and [**Scale**](../Packages/VB/Form/#scale) on **Form**, and the same sections on the other five.

## Colour values

The built-in surfaces read *Color* as a **Long**. When *Color* is left out they read [**ForeColor**](../Packages/VB/Form/#forecolor) in the same way. A **Double** or **String** argument is converted to **Long** first, as for any **Long** parameter: `255.7` draws as 256, `"255"` draws as 255, a value beyond the **Long** range raises error 6, and a **String** that is not a number raises error 13. The top byte of the **Long** then decides what the value means:

- **&H80**: a system colour. A value from `&H80000000` to `&H8000001E` draws the current system colour of that index, as **GetSysColor** returns it, so `vbButtonFace` (`&H8000000F`) draws in the colour of a button face. Any other value with `&H80` as its top byte, such as `&H8000001F` or `&H80010003`, draws black.
- **Any other top byte**: an RGB colour held in the low 24 bits as `&HBBGGRR`. The top byte is ignored, so `-1` and `&H7FFFFFFF` draw white, `&H1000000` draws black and `&H10000FF` draws red. No such value raises an error.

The line of a **Line** and the fill of **BF** use the same rule, as does the circle of **Circle** and the point of **PSet**.

> [!WARNING]
> BETA 995 has a defect in system colours. VB6 takes the system colour index from the low 16 bits of the value, so that `&H80010003` draws system colour 3 and `&H80FF000F` draws system colour 15. BETA 995 draws both black, without raising an error, because it reads the value as a system colour only when it lies between `&H80000000` and `&H8000001E`. Pass a system colour as one of the `vb` constants, such as `vbButtonFace`, or as `&H800000nn` with nothing in the second and third bytes.

> [!NOTE]
> VB6 draws `&H80000019` to `&H8000001E` black, where twinBASIC draws the system colour of that index. The rest of the rule, including the truncation of every other value to 24 bits, is the same.

## Example

This example is a class that is not a drawing surface. **Plotter** implements **Line**, **Circle** and **PSet** as ordinary methods that print what they receive, so the program shows the *Flags* value and the arguments that each form of the syntax produces.

```tb check_build projname=graphics-plotter slot=file
Class Plotter
    Public Sub Line(ByVal Flags As Long, ByVal X1 As Single, ByVal Y1 As Single, _
                    ByVal X2 As Single, ByVal Y2 As Single, ByVal Color As Long)
        Debug.Print "Line F=" & Flags & " (" & X1 & "," & Y1 & ")-(" & X2 & "," & Y2 & ") C=" & Color
    End Sub

    Public Sub Circle(ByVal Flags As Long, ByVal X As Single, ByVal Y As Single, ByVal Radius As Single, _
                      ByVal Color As Long, ByVal Start As Single, ByVal ArcEnd As Single, ByVal Aspect As Single)
        Debug.Print "Circle F=" & Flags & " (" & X & "," & Y & ") R=" & Radius & " C=" & Color & _
                    " S=" & Start & " E=" & ArcEnd & " A=" & Aspect
    End Sub

    Public Sub PSet(ByVal Flags As Long, ByVal X As Single, ByVal Y As Single, ByVal Color As Long)
        Debug.Print "PSet F=" & Flags & " (" & X & "," & Y & ") C=" & Color
    End Sub
End Class
```

```tb check_run projname=graphics-plotter
Dim p As New Plotter

p.Line (1, 2)-(3, 4)
p.Line (1, 2)-(3, 4), 5, BF
p.Line Step(1, 2)-Step(3, 4), , B
p.Line -(3, 4), 7
p.Line 99, 1, 2, 3, 4, 5

p.Circle (1, 2), 3
p.Circle Step(1, 2), 3, 4, 0.5, 1.5, 2.5

p.PSet (1, 2)
p.PSet Step(1, 2), 5
' Output:
' Line F=4 (1,2)-(3,4) C=0
' Line F=38 (1,2)-(3,4) C=5
' Line F=29 (1,2)-(3,4) C=0
' Line F=2 (0,0)-(3,4) C=7
' Line F=99 (1,2)-(3,4) C=5
' Circle F=0 (1,2) R=3 C=0 S=0 E=0 A=0
' Circle F=451 (1,2) R=3 C=4 S=0.5 E=1.5 A=2.5
' PSet F=0 (1,2) C=0
' PSet F=3 (1,2) C=5
```

### Reading back what a surface drew

This example draws on **Form1**, a form with no controls, and reads single pixels back to show what a negative angle does. **Point** is not implemented in twinBASIC (see [**Point**](../Packages/VB/Form/#point)), which is why the example reads pixels with the Windows **GetPixel** function, declared in a module of its own.

```tb check_build projname=graphics-pixels project=form slot=file
Module PixelReader
    Public Declare PtrSafe Function GetPixel Lib "gdi32" (ByVal hdc As LongPtr, ByVal x As Long, ByVal y As Long) As Long
End Module
```

The pixel at (100, 75) is half-way along the radius from the centre (100, 100) to the 12 o'clock position, an angle of pi/2. It is red when *Start* and *End* are negative, because a negative angle draws the radius to that end of the arc, and it is not red when they are positive. The last call has an angle below -2 pi, which raises error 5.

```tb check_run projname=graphics-pixels project=form
Const Pi As Double = 3.14159265358979
Load Form1
Form1.ScaleMode = vbPixels
Form1.AutoRedraw = True
Form1.BackColor = vbWhite

Form1.Circle (100, 100), 50, vbRed, Pi / 4, Pi / 2
Debug.Print GetPixel(Form1.hDC, 100, 75) = vbRed    ' False

Form1.Cls
Form1.Circle (100, 100), 50, vbRed, -Pi / 4, -Pi / 2
Debug.Print GetPixel(Form1.hDC, 100, 75) = vbRed    ' True

On Error Resume Next
Form1.Circle (100, 100), 50, vbRed, -7, 1
Debug.Print Err.Number                              ' 5
```

## See Also

- [**Form**](../Packages/VB/Form/#line) class -- the **Line**, **Circle**, **PSet** and **Scale** methods
- [**PictureBox**](../Packages/VB/PictureBox/#line), [**Printer**](../Packages/VB/Printer/#line), [**UserControl**](../Packages/VB/UserControl/#line), [**PropertyPage**](../Packages/VB/PropertyPage/#line) and [**Report**](../Packages/VB/Report/#line) classes -- the other drawing surfaces
- [**Print** statement](Print) -- the other language-level syntax a drawing surface accepts
- [**CurrentX**](../Packages/VB/Form/#currentx), [**CurrentY**](../Packages/VB/Form/#currenty) properties -- the drawing position these methods read and set
