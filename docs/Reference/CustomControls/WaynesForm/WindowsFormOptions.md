---
title: WindowsFormOptions
parent: WaynesForm
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesForm/WindowsFormOptions
has_toc: false
---

# WindowsFormOptions class
{: .no_toc }

The Win32-frame settings of a [**WaynesForm**](.) — border style, initial window state, startup position, taskbar visibility, and the title-bar buttons. Surfaces as [**WaynesForm.WindowsOptions**](.#windowsoptions); a single instance per form, created automatically.

Most of the fields take effect *once*, when the form is first shown — changing [**StartUpPosition**](#startupposition) or [**WindowState**](#windowstate) on a form that is already visible has no effect. The exception is the title-bar buttons; whether they have a visible effect depends on whether [**BorderStyle**](#borderstyle) is one of the styles that include those buttons in the first place.

The type itself is `Private Class` — you reach the instance only through the form's **WindowsOptions** property and cannot declare a variable typed as **WindowsFormOptions** from outside the package.

```tb
Private Sub Form_Load()
    With Me.WindowsOptions
        .StartUpPosition = tbStartUpCenterScreen
        .BorderStyle = tbFixedDialog
        .MaximizeButton = False
        .ShowInTaskbar = False
    End With
End Sub
```

## Properties

### BorderStyle
{: .no_toc }

The Win32 frame style — thin / thick border, resizable / fixed, normal / tool-window title bar. A member of [**BorderStyle**](../Enumerations/BorderStyle). Default: **tbFixedSizable**.

### ControlBox
{: .no_toc }

Whether the form's title bar shows the system control box (the icon at the far left of the bar, with the **Move** / **Close** menu). **Boolean**. Default: **True**.

### MaximizeButton
{: .no_toc }

Whether the title bar shows a **Maximize** button. **Boolean**. Default: **True**. Effective only when [**BorderStyle**](#borderstyle) is one of the resizable styles.

### MinimizeButton
{: .no_toc }

Whether the title bar shows a **Minimize** button. **Boolean**. Default: **True**. Effective only when [**BorderStyle**](#borderstyle) is one of the styles that supports minimizing.

### ShowInTaskbar
{: .no_toc }

Whether the form's window appears in the Windows taskbar. **Boolean**. Default: **True**.

### StartUpPosition
{: .no_toc }

How the form's window is positioned when first shown. A member of [**StartupPosition**](../Enumerations/StartupPosition). Default: **tbStartUpWindowsDefault**.

### WindowState
{: .no_toc }

The window state of the form when first shown — normal, minimized, or maximized. A member of [**WindowState**](../Enumerations/WindowState). Default: **tbNormal**.

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the seven fields is assigned. The parent [**WaynesForm**](.) listens for this event and (where applicable to a not-yet-shown form) re-applies the frame settings.
