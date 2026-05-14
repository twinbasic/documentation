---
title: Screen
parent: VB Package
permalink: /tB/Packages/VB/Screen/
has_toc: false
---

# Screen class
{: .no_toc }

The **Screen** class wraps the user's primary display — its dimensions and twip-to-pixel ratio, the list of installed fonts, the currently active [**Form**](../Form/) and the currently focused control on that form, and the application-wide mouse-pointer override. It is a singleton: there is exactly one **Screen** instance per process, owned by the runtime and exposed through the [**Screen**](../Global/#screen) property of the [**Global**](../Global/) app-object. Code reaches it without qualification:

```tb
' Centre a form on the primary display
Me.Left = (Screen.Width  - Me.Width)  \ 2
Me.Top  = (Screen.Height - Me.Height) \ 2

' Show an hourglass cursor across the whole application during a long task
Screen.MousePointer = vbHourglass
LongRunningWork
Screen.MousePointer = vbDefault
```

* TOC
{:toc}

## Dimensions and DPI

[**Width**](#width) and [**Height**](#height) report the primary monitor's dimensions in twips — the same unit forms and controls use by default. The conversion factors are exposed too:

- [**TwipsPerPixelX**](#twipsperpixelx) — twips per horizontal pixel on the primary display.
- [**TwipsPerPixelY**](#twipsperpixely) — twips per vertical pixel.

On a 96-DPI display these are both `15` (1440 twips per logical inch ÷ 96 pixels per inch); on a 144-DPI display they are `10`. Use them when interop with the Win32 API forces a conversion between pixels and the form-side coordinate system.

> [!NOTE]
> twinBASIC's **Screen** describes the *primary* monitor only. For per-monitor information in a multi-monitor configuration, fall through to the Win32 `EnumDisplayMonitors` / `GetMonitorInfo` API.

## Active form and active control

[**ActiveForm**](#activeform) returns the [**Form**](../Form/) instance that is currently the foreground form in the application; [**ActiveControl**](#activecontrol) returns the control within that form that currently holds the focus. Both return **Nothing** if no form in the application is active.

The most common idiom is accessing the active form from a global handler — for example, a toolbar button on an [**MDIForm**](../MDIForm/) that operates on whatever MDI child is in front:

```tb
Private Sub tbrEdit_ButtonClick(ByVal Button As MSComctlLib.Button)
    Dim f As Form
    Set f = Screen.ActiveForm
    If f Is Nothing Then Exit Sub
    Select Case Button.Key
        Case "Cut":   f.ActiveControl.SelText = ""
        Case "Copy":  Clipboard.SetText f.ActiveControl.SelText
        ...
    End Select
End Sub
```

## Fonts

[**FontCount**](#fontcount) is the number of fonts the OS reports for the current display context; [**Fonts**](#fonts)(*Index*) returns the name of the font at *Index* — `0` to `FontCount - 1`. Together they let an application build a font-picker without going through the Win32 `EnumFontFamilies` API.

```tb
Dim i As Integer
For i = 0 To Screen.FontCount - 1
    cboFonts.AddItem Screen.Fonts(i)
Next
```

## Mouse pointer override

[**MousePointer**](#mousepointer) is an application-wide cursor override. Setting it to anything other than **vbDefault** forces the chosen cursor over every window of the application, regardless of each individual control's own [**MousePointer**](../CheckBox/#mousepointer) setting — the typical use is showing the hourglass while a synchronous operation runs. Set it back to **vbDefault** when the operation completes.

[**MouseIcon**](#mouseicon) supplies a custom **StdPicture** to use when [**MousePointer**](#mousepointer) is **vbCustom**.

## Properties

### ActiveControl
{: .no_toc }

The control on the [**ActiveForm**](#activeform) that currently has the input focus, as a [**Control**](../CheckBox/) reference, or **Nothing** if no form is active. Read-only.

### ActiveForm
{: .no_toc }

The [**Form**](../Form/) that is currently the foreground form in the application, or **Nothing** if no form is active. Read-only.

### FontCount
{: .no_toc }

The number of fonts the OS reports as available on the current display context. **Integer**, read-only.

### Fonts
{: .no_toc }

The name of the font at the given zero-based index, in the order the OS reported it. **String**, read-only.

Syntax: *object*.**Fonts**( *Index* )

*Index*
: *required* An **Integer** in the range `0` to [**FontCount**](#fontcount) `- 1`. Out-of-range indices return an empty string.

### Height
{: .no_toc }

The height of the primary display, in twips. **Single**, read-only.

### MouseIcon
{: .no_toc }

The custom cursor picture used when [**MousePointer**](#mousepointer) is **vbCustom**, as a **StdPicture**. Readable, writable (`Let`), and assignable by reference (`Set`).

### MousePointer
{: .no_toc }

The application-wide mouse-pointer override, as a member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants). **Integer**, readable and writable.

Setting **MousePointer** to anything other than **vbDefault** (0) forces the chosen cursor over every window of the application, ignoring per-control overrides. The typical use is showing **vbHourglass** during a synchronous long-running operation; set it back to **vbDefault** when the operation finishes.

### TwipsPerPixelX
{: .no_toc }

The number of twips per horizontal pixel on the primary display, as a **Single**. Effectively `1440 / dpi_x`. Returned by a parameterless function call.

Syntax: *object*.**TwipsPerPixelX**( )

### TwipsPerPixelY
{: .no_toc }

The number of twips per vertical pixel on the primary display, as a **Single**. Effectively `1440 / dpi_y`. Returned by a parameterless function call.

Syntax: *object*.**TwipsPerPixelY**( )

### Width
{: .no_toc }

The width of the primary display, in twips. **Single**, read-only.
