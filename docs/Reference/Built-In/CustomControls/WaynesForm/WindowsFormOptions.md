---
title: WindowsFormOptions
parent: WaynesForm
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesForm/WindowsFormOptions
has_toc: false
---

# WindowsFormOptions class
{: .no_toc }

The Win32-frame settings of a [**WaynesForm**](.) --- border style, initial window state, startup position, taskbar visibility, and the title-bar buttons. Exposed as [**WaynesForm.WindowsOptions**](.#windowsoptions); a single instance per form, created automatically.

The fields are applied when the form's window is made, as the form is first shown. Whether the title-bar buttons appear also depends on whether [**BorderStyle**](#borderstyle) is one of the styles that include them.

The type itself is `Private Class` --- the instance is accessed only through the form's **WindowsOptions** property, and a variable typed as **WindowsFormOptions** cannot be declared from outside the package.

A form's code sets the fields in its constructor, `Sub New`; a **WaynesForm** raises no **Load** event (see [Setting up a form](.#setting-up-a-form)).

```tb check_build inherits=WaynesForm
Sub New()
    With Me.WindowsOptions
        .StartUpPosition = tbStartUpCenterScreen
        .BorderStyle = tbFixedDialog
        .MaximizeButton = False
        .ShowInTaskbar = False
    End With
End Sub
```

<!-- test: bug waynesform-window-ignores-code -->
> [!WARNING] BETA 1042
> The form's window is made from the values the form designer saved, and never from these fields as code has set them. A field set in code --- in `Sub New`, before the form is shown, or while it is shown --- reads back the new value, but the window's border, buttons, place, state and taskbar button stay as designed, and no error is raised. Set the fields in the form designer.

## Properties

### BorderStyle
{: .no_toc }

The Win32 frame style --- thin / thick border, resizable / fixed, normal / tool-window title bar. A member of [**BorderStyle**](../Enumerations/BorderStyle). Default: **tbFixedSizable**.

### ControlBox
{: .no_toc }

Whether the form's title bar shows the system control box (the icon at the far left of the bar, with the **Move** / **Close** menu). **Boolean**. Default: **True**.

### MaximizeButton
{: .no_toc }

Whether the title bar shows a **Maximize** button. **Boolean**. Default: **True**. Shown when [**BorderStyle**](#borderstyle) is **tbFixedSingle**, **tbFixedSizable** or **tbFixedDialog**; see [**BorderStyle**](../Enumerations/BorderStyle).

### MinimizeButton
{: .no_toc }

Whether the title bar shows a **Minimize** button. **Boolean**. Default: **True**. Shown when [**BorderStyle**](#borderstyle) is **tbFixedSingle**, **tbFixedSizable** or **tbFixedDialog**; see [**BorderStyle**](../Enumerations/BorderStyle).

### ShowInTaskbar
{: .no_toc }

Whether the form's window appears in the Windows taskbar. **Boolean**. Default: **True**.

### StartUpPosition
{: .no_toc }

How the form's window is positioned when first shown. A member of [**StartupPosition**](../Enumerations/StartupPosition). Default: **tbStartUpWindowsDefault**.

### WindowState
{: .no_toc }

The window state of the form when first shown --- normal, minimized, or maximized. A member of [**WindowState**](../Enumerations/WindowState). Default: **tbNormal**.

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the seven fields is assigned. The parent [**WaynesForm**](.) listens for this event and repaints itself.
