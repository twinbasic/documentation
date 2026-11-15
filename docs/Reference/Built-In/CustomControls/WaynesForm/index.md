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

A form has a [**Caption**](#caption) (shown in the Win32 title bar), a [**BackgroundFill**](#backgroundfill) (painted across its entire client area), and a [**WindowsOptions**](#windowsoptions) sub-object that controls the surrounding Win32 frame --- border style, window state, taskbar visibility, minimize / maximize buttons, and so on. Call [**Show**](#show) to display the form; call [**Close**](#close) to close it.

* TOC
{:toc}

## Setting up a form

A **WaynesForm** raises no **Load** event --- [**Click**](#click) is its only event --- so a `Form_Load` procedure in its code is never called. The code that sets the form up goes in its constructor, `Sub New`, which runs once the values saved by the form designer are loaded and before the form's window is made. The form's controls exist by then, so `Sub New` can set their properties as well as the form's own.

```tb check_build inherits=WaynesForm
Sub New()
    Me.Caption = "Welcome"
    Me.BackgroundFill.ColorPoints.SetSolidColor vbWhite
    With Me.WindowsOptions
        .StartUpPosition = tbStartUpCenterScreen
        .BorderStyle = tbFixedDialog
        .MaximizeButton = False
    End With
End Sub
```

<!-- test: bug waynesform-window-ignores-code -->
> [!WARNING] BETA 1042
> The form's window is made from the values the form designer saved, and never from the form's properties as code has set them. [**Caption**](#caption), [**Width**](#width), [**Height**](#height), [**Left**](#left), [**Top**](#top) and every member of [**WindowsOptions**](#windowsoptions) set in code --- in `Sub New`, before **Show**, or while the form is shown --- read back the new value, but the title bar, the window's size and place, its border and its buttons stay as designed, and no error is raised. Set them in the form designer. [**BackgroundFill**](#backgroundfill), and the style objects of the form's controls, are drawn as code sets them. In the sample above, only the white background takes effect.

<!-- test: bug waynes-controls-ignore-geometry -->
> [!WARNING] BETA 1042
> The form's controls, too, keep most of the place, size and visibility the form designer gave them. In `Sub New`, a control's **Left**, **Height** and **Dock** take effect, and its **Top**, **Width** and **Visible** do not; once the form is shown, none of them does, and no error is raised. See [Controls](../#controls) on the package's page.

[**BackgroundFill**](#backgroundfill) is an ordinary [**Fill**](../Styles/Fill), so the form can display a gradient backdrop or a solid colour --- a soft top-to-bottom wash, for example:

```tb check_build inherits=WaynesForm
Sub New()
    Me.BackgroundFill.SetSimplePattern &HE5E5E5, &HF8F8F8, _
            Pattern:=tbGradientNorthToSouth
End Sub
```

## Modal display

The current release supports modal display only. Calling [**Show**](#show) with **vbModeless** writes a debug-print message and otherwise does nothing --- call **Show vbModal** to display the form.

## Properties

### BackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the form's entire client area. Defaults to a solid light-grey ([**WAYNESCOLOR_LIGHTGREY**](#) --- `&HD0D0D0`).

### Caption
{: .no_toc }

The text shown in the Win32 title bar of the form. **String**.

Syntax: *object*.**Caption** [ = *string* ]

### Controls
{: .no_toc }

The [**CustomControlsCollection**](../Framework/CustomControlsCollection) of every control hosted on the form. Inherited from the form base. Read-only --- iterate or look up by index / name to access individual controls.

<!-- test: bug waynesform-controls-nothing -->
> [!NOTE] BETA 1042
> **Controls** is **Nothing** whenever code can read it --- in `Sub New`, before **Show** and while the form is shown --- so any use of it, such as `Me.Controls.Count`, raises error 91, *Object variable or With block variable not set*. Reach each control by its name instead (`Me.Label1`).

### FormDesignerId
{: .no_toc }

A **String** holding the unique GUID that associates this form instance with its designer-saved metadata. Inherited from the form base. Application code does not normally read or write this --- the framework populates it.

### Height
{: .no_toc }

The form's height in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Left
{: .no_toc }

The form's left position in pixels --- honoured only when [**WindowsOptions.StartUpPosition**](WindowsFormOptions#startupposition) is **tbStartUpManual**. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Name
{: .no_toc }

The form's name within the project. **String**. Inherited.

### Top
{: .no_toc }

The form's top position in pixels --- honoured only when [**WindowsOptions.StartUpPosition**](WindowsFormOptions#startupposition) is **tbStartUpManual**. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### Width
{: .no_toc }

The form's width in pixels. [**PixelCount**](../Enumerations/PixelCount). Inherited.

### WindowsOptions
{: .no_toc }

The [**WindowsFormOptions**](WindowsFormOptions) that controls the Win32 frame --- border style, window state, taskbar visibility, minimize / maximize buttons, system menu.

## Methods

### Close
{: .no_toc }

Closes the form's underlying window.

Syntax: *object*.**Close**

### Show
{: .no_toc }

Shows the form. The current release supports modal display only --- calling with **vbModeless** writes a debug message and otherwise does nothing.

Syntax: *object*.**Show** [ *Modal* ]

*Modal*
: *optional* A member of [**FormShowConstants**](../../VBRUN/Constants/FormShowConstants). Pass **vbModal** for the supported modal display; **vbModeless** is currently a no-op.

### StartupShow
{: .no_toc }

Shows the form unconditionally --- used by the framework to display the project's startup form. Application code can call it but [**Show**](#show) is the normal entry point.

Syntax: *object*.**StartupShow**

## Events

### Click
{: .no_toc }

Raised when the user clicks on the form's background --- i.e. on a region not occupied by a hosted control.

Syntax: *object*\_**Click**( )
