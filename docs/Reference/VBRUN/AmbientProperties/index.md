---
title: AmbientProperties
parent: VBRUN Package
nav_order: 10
permalink: /tB/Packages/VBRUN/AmbientProperties/
redirect_from:
  - /tB/Modules/AmbientProperties
has_toc: false
---

# AmbientProperties class

The **AmbientProperties** object exposes information about the environment in which a control is hosted. The container — a form, a property page, the IDE designer surface — populates this object with hints about its appearance, locale, and operating mode so that an embedded control can adapt itself to fit in. Every property is read-only: the container, not the control, decides what these values should be.

## Detecting design-time versus run-time

A control often needs to behave differently while it is being placed on a designer surface than when it is actually running inside an application. [**UserMode**](UserMode) returns **False** in the IDE designer and **True** at run time, and [**UIDead**](UIDead) becomes **True** while execution is paused under the debugger so that a control knows not to repaint or respond to input. [**ShowGrabHandles**](ShowGrabHandles) and [**ShowHatching**](ShowHatching) tell a control whether the container would like it to draw the usual selection adornments while it is being edited.

```tb
Sub AdaptToHost(ByVal Host As AmbientProperties)
    If Host.UserMode Then
        ' Running in the host application — render normally.
    Else
        ' Embedded in a designer — show edit-time decorations instead.
    End If
End Sub
```

## Visual defaults from the container

The container suggests a default colour scheme and typeface so that embedded controls fit in with their surroundings. [**BackColor**](BackColor) and [**ForeColor**](ForeColor) supply the suggested background and foreground colours as **OLE_COLOR** values, [**Font**](Font) returns the suggested **stdole.IFontDisp**, and [**Palette**](Palette) returns a hint palette as an **stdole.IPictureDisp**. [**TextAlign**](TextAlign) reports the container's preferred text alignment, and [**RightToLeft**](RightToLeft) is **True** when the container is laid out for a right-to-left language.

## Layout and other UI hints

[**ScaleUnits**](ScaleUnits) names the unit of measure the container uses to size itself — for example `"Twip"` or `"Pixel"`. [**SupportsMnemonics**](SupportsMnemonics) is **True** when the container will dispatch keyboard mnemonics — the underlined letters following an `&` — to its controls. [**DisplayAsDefault**](DisplayAsDefault) is **True** if the container is treating this control as its default control, so the control can paint itself with a heavier border. [**MessageReflect**](MessageReflect) indicates whether the container reflects window messages addressed to the control back to the control's own message handler.

## Locale and identity

[**LocaleID**](LocaleID) returns the Locale ID of the container, so a control can format text and numbers consistently with its host. [**DisplayName**](DisplayName) returns the name the container has assigned to the control — a useful string for error messages or property browsers.

## Members

- [BackColor](BackColor) -- returns the container's suggested background colour
- [DisplayAsDefault](DisplayAsDefault) -- returns whether the container is treating this control as its default
- [DisplayName](DisplayName) -- returns the name the container has assigned to the control
- [Font](Font) -- returns the container's suggested font
- [ForeColor](ForeColor) -- returns the container's suggested foreground colour
- [LocaleID](LocaleID) -- returns the container's Locale ID
- [MessageReflect](MessageReflect) -- returns whether the container reflects window messages back to the control
- [Palette](Palette) -- returns the container's suggested colour palette
- [RightToLeft](RightToLeft) -- returns whether the container is laid out right-to-left
- [ScaleUnits](ScaleUnits) -- returns the unit of measure used by the container
- [ShowGrabHandles](ShowGrabHandles) -- returns whether the container wants the control to draw selection grab handles
- [ShowHatching](ShowHatching) -- returns whether the container wants the control to draw a selection hatching pattern
- [SupportsMnemonics](SupportsMnemonics) -- returns whether the container will dispatch keyboard mnemonics to controls
- [TextAlign](TextAlign) -- returns the container's preferred text alignment
- [UIDead](UIDead) -- returns whether the user interface is non-responsive (for example, paused in the debugger)
- [UserMode](UserMode) -- returns **True** at run time and **False** when hosted in a designer
