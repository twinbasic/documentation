---
title: Printer
parent: VB Package
permalink: /tB/Packages/VB/Printer/
has_toc: false
---

# Printer class
{: .no_toc }

A **Printer** object encapsulates one Windows printer device, exposing a drawing surface that records the application's graphics calls and forwards them to the spooler as a print job. The implicit **Printer** is mutable and tracks the system default printer; the entries of the [**Printers**](../Printers/) collection are read-only descriptors of the installed devices, useful for enumeration or for switching the active printer with `Set Printer = Printers("HP LaserJet")`.

A print job begins implicitly the first time the application calls a drawing or text method on the **Printer** ([**Print**](#print), [**Line**](#line), [**Circle**](#circle), [**PSet**](#pset), [**PaintPicture**](#paintpicture), …), and is finalised by [**EndDoc**](#enddoc). [**NewPage**](#newpage) advances to a fresh page within the same job; [**KillDoc**](#killdoc) aborts the job without finishing the current page.

```tb
Printer.FontSize = 12
Printer.Print "Hello, world!"
Printer.NewPage
Printer.Print "Second page."
Printer.EndDoc
```

User code never instantiates a **Printer** directly — the class is marked `[COMCreatable(False)]` and its public API has no useful constructor. The two access paths are the implicit **Printer** global and the [**Printers**](../Printers/) collection.

* TOC
{:toc}

## The default Printer and the Printers collection

twinBASIC exposes a single implicit **Printer** object, accessible by name from anywhere in user code, plus a [**Printers**](../Printers/) collection enumerating every printer installed on the system:

```tb
Dim p As Printer
For Each p In Printers
    Debug.Print p.DeviceName, p.DriverName, p.Port
Next
```

By default the implicit **Printer** has [**TrackDefault**](#trackdefault) **True**: every property read consults the current system-default printer, so the application reflects changes the user makes in **Settings → Printers** without restarting. Writing to a settings property, calling **Set Printer = Printers(i)**, or starting a print job locks **TrackDefault** to **False** and pins the object to a specific device.

The entries returned by [**Printers**](../Printers/) are immutable — assigning to one of their properties raises run-time error 383 (*Property is read-only*), and the document-control methods raise error 438 (*Object doesn't support this property or method*). To print to one of them, copy it onto the implicit **Printer** with **Set**:

```tb
Set Printer = Printers("HP LaserJet")
Printer.Orientation = vbPRORLandscape
Printer.Print "Hello on landscape paper."
Printer.EndDoc
```

`Set Printer = …` does not replace the implicit instance — it forwards the new device's identity onto the existing object, ending any active print job and discarding the cached device context in the process.

## Print-job lifecycle

The methods that manage the job — [**EndDoc**](#enddoc), [**KillDoc**](#killdoc), [**NewPage**](#newpage) — and the implicit "start-on-first-output" rule together form a small state machine:

| State              | How it advances                                                                                          |
|--------------------|----------------------------------------------------------------------------------------------------------|
| No job in progress | The next drawing or text method starts a new job and a fresh page.                                       |
| Page in progress   | [**NewPage**](#newpage) emits the page and starts another; [**EndDoc**](#enddoc) emits it and finishes.  |
| Anywhere           | [**KillDoc**](#killdoc) aborts the job without emitting whatever is on the current page.                 |

[**Page**](#page) reports the current page number (starting at 1). Property setters that affect page geometry — [**PaperSize**](#papersize), [**Orientation**](#orientation), [**Copies**](#copies), [**Width**](#width), [**Height**](#height), [**Duplex**](#duplex), [**PaperBin**](#paperbin), [**ColorMode**](#colormode), [**PrintQuality**](#printquality), [**Zoom**](#zoom) — must be assigned on a blank page; doing so mid-page raises error 396 (*'PropertyName' cannot be set within a page*).

## Coordinate system

A **Printer** has its own coordinate system, configured through [**ScaleMode**](#scalemode), the [**Scale\***](#scaleleft) properties, and [**Scale**](#scale). The default mode is **vbTwips**, with the surface spanning the physical paper area. Drawing primitives consume coordinates in the current units; [**ScaleX**](#scalex) and [**ScaleY**](#scaley) convert distances between any two scale modes without changing the active one.

```tb
Printer.ScaleMode = vbInches
Printer.Line (0.5, 0.5)-(8, 10.5), vbBlack, B   ' 1/2-inch margin rectangle
```

## Printing to a file

Assigning a path to [**OutputFile**](#outputfile) **before** the job starts redirects the raw spool output to that file instead of the printer device. The file holds the printer-driver-specific bytes that would otherwise be sent over the port — typically a `.prn` file that can later be copied to a port with the **COPY /B** command.

```tb
Printer.OutputFile = "C:\Spool\report.prn"
Printer.Print "Captured to file"
Printer.EndDoc
```

## Properties

### ColorMode
{: .no_toc }

Whether the printer should print in colour or monochrome.

Syntax: *object*.**ColorMode** [ = *value* ]

*value*
: A member of [**PrinterObjectConstants_ColorMode**](../../VBRUN/Constants/PrinterObjectConstants_ColorMode): **vbPRCMMonochrome** (1) or **vbPRCMColor** (2). Other values raise error 380.

### Copies
{: .no_toc }

The number of copies to print. **Integer**. The maximum value supported by the driver is checked through the device-capabilities API: values greater than the maximum raise error 380, and a driver that does not advertise a maximum raises error 483 (*Printer driver does not support specified property*).

### CurrentX
{: .no_toc }

The horizontal pen position used by [**Print**](#print), [**Line**](#line), [**Circle**](#circle), and [**PSet**](#pset) when they omit a starting coordinate. **Double**, in the current [**ScaleMode**](#scalemode) units. Updated automatically by each drawing call.

### CurrentY
{: .no_toc }

The vertical pen position. **Double**. See [**CurrentX**](#currentx).

### DeviceName
{: .no_toc }

The friendly name of the bound printer, as it appears in the Windows printer dialog. **String**, read-only. While [**TrackDefault**](#trackdefault) is **True**, this returns the *current* default printer rather than a cached value.

### DrawMode
{: .no_toc }

The raster operation applied when drawing-method output is combined with the page. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants), default **vbCopyPen** (opaque overwrite). Re-applied automatically after a printer change.

### DrawStyle
{: .no_toc }

The pen pattern used by line-drawing methods. A member of [**DrawStyleConstants**](../../VBRUN/Constants/DrawStyleConstants): **vbSolid** (0, default), **vbDash**, **vbDot**, **vbDashDot**, **vbDashDotDot**, **vbInvisible**, or **vbInsideSolid**. Solid is forced when [**DrawWidth**](#drawwidth) is greater than 1.

### DrawWidth
{: .no_toc }

The pen thickness, in pixels, used by [**Line**](#line), [**Circle**](#circle), and [**PSet**](#pset). **Long**, default 1.

### DriverName
{: .no_toc }

The name of the device driver that handles the bound printer. **String**, read-only. While [**TrackDefault**](#trackdefault) is **True**, this returns the *current* default printer's driver.

### Duplex
{: .no_toc }

Whether the printer should print on one or both sides of the paper.

Syntax: *object*.**Duplex** [ = *value* ]

*value*
: A member of [**PrinterObjectConstants_Duplex**](../../VBRUN/Constants/PrinterObjectConstants_Duplex): **vbPRDPSimplex** (1), **vbPRDPHorizontal** (2), or **vbPRDPVertical** (3). Values that exceed the driver's reported duplex capability raise error 380. Simplex is always accepted, even when the driver does not advertise duplex support.

### FillColor
{: .no_toc }

The colour used to fill closed shapes drawn by [**Line**](#line) (with the `F` flag) and [**Circle**](#circle), as an **OLE_COLOR**. Default **0** (black). Honoured only when [**FillStyle**](#fillstyle) is not **vbFSTransparent**.

### FillStyle
{: .no_toc }

The pattern used to fill closed shapes. A member of [**FillStyleConstants**](../../VBRUN/Constants/FillStyleConstants): **vbFSTransparent** (1, default), **vbFSSolid** (0), or one of the hatched styles. **Transparent** suppresses fill entirely, so only the outline is drawn.

### Font
{: .no_toc }

The **StdFont** used to render [**Print**](#print) output and measured by [**TextWidth**](#textwidth) / [**TextHeight**](#textheight). The convenience properties [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontBold**](#fontbold), [**FontItalic**](#fontitalic), [**FontStrikethru**](#fontstrikethru), [**FontUnderline**](#fontunderline), and [**FontTransparent**](#fonttransparent) read or write members of this object. Assigning a string to **Font** is a shortcut for assigning to **Font.Name**; assigning an **StdFont** with **Set** replaces the underlying font object.

On a printer obtained from [**Printers**](../Printers/), **Font** can still be read (a fresh, mutable **StdFont** is returned), but reassigning it raises error 383.

### FontBold
{: .no_toc }

Shortcut for [**Font**](#font)`.Bold`. **Boolean**.

### FontCount
{: .no_toc }

The number of typefaces installed on the printer. **Long**, read-only. Used together with [**Fonts**](#fonts) to enumerate them.

### FontItalic
{: .no_toc }

Shortcut for [**Font**](#font)`.Italic`. **Boolean**.

### FontName
{: .no_toc }

Shortcut for [**Font**](#font)`.Name`. **String**.

### Fonts
{: .no_toc }

Indexed access to the names of the typefaces installed on the printer.

Syntax: *object*.**Fonts**( *Index* ) **As String**

*Index*
: *required* A zero-based **Long** in the range `0 .. FontCount - 1`. Out-of-range indices return an empty string rather than raising an error.

### FontSize
{: .no_toc }

Shortcut for [**Font**](#font)`.Size`, the point size. **Single**.

### FontStrikethru
{: .no_toc }

Shortcut for [**Font**](#font)`.Strikethrough`. **Boolean**.

### FontTransparent
{: .no_toc }

When **True** (default), text drawn by [**Print**](#print) leaves the background pixels untouched between glyphs; when **False**, the glyphs' background is filled with the printer's drawn background colour. **Boolean**.

### FontUnderline
{: .no_toc }

Shortcut for [**Font**](#font)`.Underline`. **Boolean**.

### ForeColor
{: .no_toc }

The colour used by the drawing-method pen (lines, circles, points) and by [**Print**](#print) text. **OLE_COLOR**.

### hDC
{: .no_toc }

The Win32 device-context handle for the printer's drawing surface, as a **LongPtr**. Read-only.

Reading **hDC** the first time creates the device context — calling the driver's **CreateDC** and preparing the surface for drawing — but does **not** start the spool job. The spooler is engaged only when the first drawing call runs, so reading **hDC** for, say, a **GetDeviceCaps** query is non-committal: nothing is printed if the application never calls a drawing method afterwards.

### Height
{: .no_toc }

The physical page height, in twips. **Long**. Assigning a value overrides the driver's reported paper height and forces [**PaperSize**](#papersize) to a custom size; the new value can be read back through `Height` itself.

### Orientation
{: .no_toc }

The page orientation.

Syntax: *object*.**Orientation** [ = *value* ]

*value*
: A member of [**PrinterObjectConstants_Orientation**](../../VBRUN/Constants/PrinterObjectConstants_Orientation): **vbPRORPortrait** (1) or **vbPRORLandscape** (2). Assigning landscape on a driver that does not advertise the **DC_ORIENTATION** capability raises error 380; portrait is always accepted.

### OutputFile
{: .no_toc }

The path of a file to capture the raw spooled bytes into, instead of sending them to the printer device. **String**. New in twinBASIC. Must be set before the first drawing call; assigning while a job is active has no effect on the running job. Read-only on a printer obtained from [**Printers**](../Printers/).

### Page
{: .no_toc }

The page currently being composed, starting at 1 when the job begins. **Long**, read-only. Reset to 1 by [**EndDoc**](#enddoc) and [**KillDoc**](#killdoc); incremented by [**NewPage**](#newpage).

### PaperBin
{: .no_toc }

The paper source the printer should pull from.

Syntax: *object*.**PaperBin** [ = *value* ]

*value*
: A member of [**PrinterObjectConstants_PaperBin**](../../VBRUN/Constants/PrinterObjectConstants_PaperBin) — for example **vbPRBNUpper**, **vbPRBNManual**, **vbPRBNCassette**. The value must be one of the bins the driver enumerates through **DC_BINS**; an unsupported value raises error 380.

### PaperSize
{: .no_toc }

The paper size to print on.

Syntax: *object*.**PaperSize** [ = *value* ]

*value*
: A member of [**PrinterObjectConstants_PaperSize**](../../VBRUN/Constants/PrinterObjectConstants_PaperSize) — for example **vbPRPSLetter**, **vbPRPSA4**, **vbPRPSEnv10**. Assigning to [**Width**](#width) or [**Height**](#height) forces this property to **vbPRPSUser** (256).

### Port
{: .no_toc }

The name of the port that connects to the printer (e.g. `LPT1:`, `USB001`, `IP_192.168.1.50`). **String**, read-only. While [**TrackDefault**](#trackdefault) is **True**, this returns the *current* default printer's port.

### PrintQuality
{: .no_toc }

The print resolution.

Syntax: *object*.**PrintQuality** [ = *value* ]

*value*
: An **Integer** — either a positive DPI value supported by the driver, or a member of [**PrinterObjectConstants_PrintQuality**](../../VBRUN/Constants/PrinterObjectConstants_PrintQuality): **vbPRPQDraft** (-1), **vbPRPQLow** (-2), **vbPRPQMedium** (-3), or **vbPRPQHigh** (-4). Zero, or values below -4, raise error 380.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### ScaleHeight
{: .no_toc }

The vertical extent of the printer's drawing surface in [**ScaleMode**](#scalemode) units. **Double**. Assigning a value switches [**ScaleMode**](#scalemode) to **vbUser** and rescales the vertical axis so the page maps to the new height.

### ScaleLeft
{: .no_toc }

The X coordinate that maps to the left edge of the printable area. **Double**, default 0. Assigning a value switches [**ScaleMode**](#scalemode) to **vbUser**.

### ScaleMode
{: .no_toc }

The unit used by [**CurrentX**](#currentx), [**CurrentY**](#currenty), and every drawing method. A member of [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants): **vbUser** (0), **vbTwips** (1, default), **vbPoints**, **vbPixels**, **vbCharacters**, **vbInches**, **vbMillimeters**, or **vbCentimeters**. Switching away from **vbUser** resets [**ScaleLeft**](#scaleleft) and [**ScaleTop**](#scaletop) to 0.

### ScaleTop
{: .no_toc }

The Y coordinate that maps to the top edge of the printable area. **Double**, default 0. Assigning a value switches [**ScaleMode**](#scalemode) to **vbUser**.

### ScaleWidth
{: .no_toc }

The horizontal extent of the printer's drawing surface in [**ScaleMode**](#scalemode) units. **Double**. Assigning a value switches [**ScaleMode**](#scalemode) to **vbUser**.

### TrackDefault
{: .no_toc }

When **True**, every property read consults the current system-default printer; when **False**, the **Printer** is locked to the specific device identified by [**DeviceName**](#devicename), [**DriverName**](#drivername), and [**Port**](#port). **Boolean**.

Setting **TrackDefault** to **False** captures the current default device into the cached identifiers so subsequent reads stop drifting. Setting it back to **True** finishes any active print job (as if [**EndDoc**](#enddoc) had been called) and clears the cached device context. Always **False** on a printer obtained from [**Printers**](../Printers/), and read-only there.

### TwipsPerPixelX
{: .no_toc }

The number of twips that correspond to one device pixel, horizontally — useful for custom DPI-aware sizing. **Double**, read-only.

### TwipsPerPixelY
{: .no_toc }

The vertical counterpart of [**TwipsPerPixelX**](#twipsperpixelx). **Double**, read-only.

### Width
{: .no_toc }

The physical page width, in twips. **Long**. Assigning a value overrides the driver's reported paper width and forces [**PaperSize**](#papersize) to a custom size; the new value can be read back through `Width` itself.

### Zoom
{: .no_toc }

The print-scaling percentage applied by the driver. **Integer**, default 100. Values greater than 100 enlarge the output; values less than 100 shrink it. Zero and negative values raise error 380.

## Methods

### Circle
{: .no_toc }

Draws a circle, ellipse, or elliptical arc on the current page.

Syntax: *object*.**Circle** [ **Step** ] ( *X*, *Y* ), *Radius* [, *Color* [, *Start* [, *End* [, *Aspect* ] ] ] ]

*X*, *Y*
: *required* Coordinates of the centre in [**ScaleMode**](#scalemode) units. **Single**. **Step** makes them relative to [**CurrentX**](#currentx) / [**CurrentY**](#currenty).

*Radius*
: *required* The radius along the X axis. **Single**.

*Color*
: *optional* An **OLE_COLOR** for the outline. Defaults to [**ForeColor**](#forecolor).

*Start*, *End*
: *optional* Start and end angles in radians (0 to 2π). Negative values connect the arc end-point to the centre with a chord. Omitted draws a full circle.

*Aspect*
: *optional* The Y/X aspect ratio. **1.0** for a circle (default); other values give an ellipse.

If no job is in progress, **Circle** implicitly starts one.

### EndDoc
{: .no_toc }

Finalises the current print job, sending whatever is on the current page to the spooler and releasing the underlying GDI document. Has no effect when no job is in progress.

Syntax: *object*.**EndDoc**

### KillDoc
{: .no_toc }

Aborts the current print job, discarding any in-progress page output. Releases the device context immediately, without further interaction with the spooler beyond an **AbortDoc** call.

Syntax: *object*.**KillDoc**

### Line
{: .no_toc }

Draws a straight line, a rectangle outline, or a filled rectangle.

Syntax: *object*.**Line** [ [ **Step** ] ( *X1*, *Y1* ) ] **-** [ **Step** ] ( *X2*, *Y2* ) [, *Color* [, **B** [**F**] ] ]

*X1*, *Y1*
: *optional* Start coordinates. **Single**. If omitted, the line starts at [**CurrentX**](#currentx) / [**CurrentY**](#currenty). **Step** makes them relative to the pen.

*X2*, *Y2*
: *required* End coordinates. **Single**. **Step** makes them relative to the start point.

*Color*
: *optional* An **OLE_COLOR** for the line. Defaults to [**ForeColor**](#forecolor).

*B*
: *optional* Draws a rectangle whose opposite corners are *(X1, Y1)* and *(X2, Y2)* instead of a line.

*F*
: *optional* Only valid with **B**. Fills the rectangle with [**FillColor**](#fillcolor) at the current [**FillStyle**](#fillstyle).

If no job is in progress, **Line** implicitly starts one.

### NewPage
{: .no_toc }

Emits the current page to the spooler and begins a new blank page. [**Page**](#page) is incremented; [**CurrentX**](#currentx) and [**CurrentY**](#currenty) are reset to 0. If no job is in progress, **NewPage** implicitly starts one before emitting the first page break.

Syntax: *object*.**NewPage**

### PaintPicture
{: .no_toc }

Draws a picture onto the current page, optionally scaling, clipping, or applying a raster operation.

Syntax: *object*.**PaintPicture** *Picture*, *X1*, *Y1* [, *Width1* [, *Height1* [, *X2* [, *Y2* [, *Width2* [, *Height2* [, *Opcode* ] ] ] ] ] ] ]

*Picture*
: *required* An **IPictureDisp** to paint.

*X1*, *Y1*
: *required* Destination top-left in [**ScaleMode**](#scalemode) units.

*Width1*, *Height1*
: *optional* Destination size. Defaults to the picture's natural size.

*X2*, *Y2*, *Width2*, *Height2*
: *optional* Source rectangle within *Picture*. Defaults to the whole picture.

*Opcode*
: *optional* A raster-operation code passed through to **BitBlt** — for example **&HCC0020** (`vbSrcCopy`, default) or **&H660046** (`vbSrcInvert`).

If no job is in progress, **PaintPicture** implicitly starts one.

### Print
{: .no_toc }

Writes text to the current page using [**Font**](#font), starting at [**CurrentX**](#currentx) / [**CurrentY**](#currenty) and advancing them as it goes. Dispatched through the **Print** statement so multiple expressions can be separated by `;` (no spacing) or `,` (tab to next print zone). **Spc(n)** inserts *n* spaces and **Tab(n)** moves to print column *n*.

Syntax: *object*.**Print** \[ *expressionlist* \] \[ **;** \| **,** \]

A trailing `;` or `,` suppresses the newline so the next [**Print**](#print) call continues on the same line. If no job is in progress, **Print** implicitly starts one.

### PSet
{: .no_toc }

Sets a single pixel on the current page.

Syntax: *object*.**PSet** [ **Step** ] ( *X*, *Y* ) [, *Color* ]

*X*, *Y*
: *required* Coordinates in [**ScaleMode**](#scalemode) units. **Single**. **Step** makes them relative to [**CurrentX**](#currentx) / [**CurrentY**](#currenty).

*Color*
: *optional* An **OLE_COLOR**. Defaults to [**ForeColor**](#forecolor).

If no job is in progress, **PSet** implicitly starts one.

### Scale
{: .no_toc }

Defines a user coordinate system for the page. Calling **Scale** with no arguments resets [**ScaleMode**](#scalemode) to **vbTwips** and clears [**ScaleLeft**](#scaleleft) / [**ScaleTop**](#scaletop).

Syntax: *object*.**Scale** [ ( *X1*, *Y1* ) **-** ( *X2*, *Y2* ) ]

*X1*, *Y1*
: *required* (with the second pair) The coordinate that maps to the top-left corner — sets [**ScaleLeft**](#scaleleft) and [**ScaleTop**](#scaletop).

*X2*, *Y2*
: *required* The coordinate that maps to the bottom-right corner — sets [**ScaleWidth**](#scalewidth) = `X2 - X1` and [**ScaleHeight**](#scaleheight) = `Y2 - Y1`. [**ScaleMode**](#scalemode) becomes **vbUser**.

Calling **Scale** with coordinates implicitly starts a print job (matching VB6 behaviour); calling it without arguments does not.

### ScaleX
{: .no_toc }

Converts a horizontal distance from one scale mode to another, without changing the printer's [**ScaleMode**](#scalemode).

Syntax: *object*.**ScaleX**( *Width*, *FromScale* [, *ToScale* ] ) **As Double**

*Width*
: *required* The value to convert. **Double**.

*FromScale*
: *required* A [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants) member identifying the unit of *Width*. Unlike on a [**PictureBox**](../PictureBox/) or [**Form**](../Form/), this argument has no default on a **Printer** — omitting it raises error 448 (*Named argument not found*).

*ToScale*
: *optional* A [**ScaleModeConstants**](../../VBRUN/Constants/ScaleModeConstants) member identifying the unit of the result; defaults to the printer's current [**ScaleMode**](#scalemode).

### ScaleY
{: .no_toc }

The vertical counterpart of [**ScaleX**](#scalex), for heights.

Syntax: *object*.**ScaleY**( *Height*, *FromScale* [, *ToScale* ] ) **As Double**

### TextHeight
{: .no_toc }

Measures the height of the given string when rendered in the current [**Font**](#font), in [**ScaleMode**](#scalemode) units — including the line-spacing leading, so the result is suitable for advancing [**CurrentY**](#currenty) between rows of text. Embedded line breaks are honoured.

Syntax: *object*.**TextHeight**( *Str* **As String** ) **As Double**

### TextWidth
{: .no_toc }

Measures the width of the given string when rendered in the current [**Font**](#font), in [**ScaleMode**](#scalemode) units. Returns the longest line width when *Str* contains embedded line breaks.

Syntax: *object*.**TextWidth**( *Str* **As String** ) **As Double**

## See Also

- [Printers](../Printers/) — read-only collection of every installed printer.
- [Form.PrintForm](../Form/#printform) — sends a screenshot of a form to the implicit **Printer**.
- [Report.PrintReport](../Report/#printreport) — sends every page of a banded report to the implicit **Printer**.
- [PrinterObjectConstants](../../VBRUN/Constants/PrinterObjectConstants) — combined enumeration of printer option values.
