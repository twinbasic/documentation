---
title: WaynesForm
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesForm/
has_toc: false
---

# WaynesForm class
{: .no_toc }

The top-level form class that hosts the package's custom controls. A **WaynesForm** is the equivalent of a `Form` from the [**VB**](../../VB/) package, but instead of being a Win32 native window with controls overlaid on top, it is an owner-drawn surface that paints itself and its child controls through the [**CustomControls**](..) framework.

Within the current release of the package every form created with the designer is hard-coded to use **WaynesForm** as its root class; other base form classes are planned but not yet supported.

A form has a [**Caption**](#caption) (shown in the Win32 title bar), a [**BackgroundFill**](#backgroundfill) (painted across its entire client area), and a [**WindowsOptions**](#windowsoptions) sub-object that drives the surrounding Win32 frame — border style, window state, taskbar visibility, minimize / maximize buttons, and so on. Showing the form is done by calling [**Show**](#show); closing it by [**Close**](#close).

```tb
Private Sub Form_Load()
    Me.Caption = "Welcome"
    Me.BackgroundFill.ColorPoints.SetSolidColor vbWhite
    With Me.WindowsOptions
        .StartUpPosition = tbStartUpCenterScreen
        .BorderStyle = tbFixedDialog
        .MaximizeButton = False
    End With
End Sub
```

* TOC
{:toc}

## Modal display

The current release supports modal display only. Calling [**Show**](#show) with **vbModeless** writes a debug-print message and otherwise does nothing — call **Show vbModal** to display the form.

## Properties

### BackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the form's entire client area. Defaults to a solid light-grey ([**WAYNESCOLOR_LIGHTGREY**](#) — `&HD0D0D0`).

### Caption
{: .no_toc }

The text shown in the Win32 title bar of the form. **String**.

Syntax: *object*.**Caption** [ = *string* ]

### Controls
{: .no_toc }

The [**CustomControlsCollection**](../Framework/CustomControlsCollection) of every control hosted on the form. Inherited from the form base. Read-only — iterate or look up by index / name to reach individual controls.

### FormDesignerId
{: .no_toc }

A **String** holding the unique GUID that associates this form instance with its designer-saved metadata. Inherited from the form base. Application code does not normally read or write this — the framework populates it.

### Height
{: .no_toc }

The form's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Left
{: .no_toc }

The form's left position in pixels — honoured only when [**WindowsOptions.StartUpPosition**](WindowsFormOptions#startupposition) is **tbStartUpManual**. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The form's name within the project. **String**. Inherited.

### Top
{: .no_toc }

The form's top position in pixels — honoured only when [**WindowsOptions.StartUpPosition**](WindowsFormOptions#startupposition) is **tbStartUpManual**. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Width
{: .no_toc }

The form's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### WindowsOptions
{: .no_toc }

The [**WindowsFormOptions**](WindowsFormOptions) that drives the Win32 frame — border style, window state, taskbar visibility, minimize / maximize buttons, system menu.

## Methods

### Close
{: .no_toc }

Closes the form's underlying window.

Syntax: *object*.**Close**

### Show
{: .no_toc }

Shows the form. The current release supports modal display only — calling with **vbModeless** writes a debug message and otherwise does nothing.

Syntax: *object*.**Show** [ *Modal* ]

*Modal*
: *optional* A member of [**FormShowConstants**](../../VBRUN/Constants/FormShowConstants). Pass **vbModal** for the supported modal display; **vbModeless** is currently a no-op.

### StartupShow
{: .no_toc }

Shows the form unconditionally — used by the framework to display the project's startup form. Application code can call it but [**Show**](#show) is the normal entry point.

Syntax: *object*.**StartupShow**

## Events

### Click
{: .no_toc }

Raised when the user clicks on the form's background — i.e. on a region not occupied by a hosted control.

Syntax: *object*\_**Click**( )
