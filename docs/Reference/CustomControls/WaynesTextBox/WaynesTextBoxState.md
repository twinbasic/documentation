---
title: WaynesTextBoxState
parent: WaynesTextBox
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/WaynesTextBox/WaynesTextBoxState
has_toc: false
---

# WaynesTextBoxState class
{: .no_toc }

A bundle of the style objects that describe a single visual state of a [**WaynesTextBox**](.). Each textbox holds three parallel instances ([**NormalState**](.#normalstate), [**HoverState**](.#hoverstate), [**FocusedState**](.#focusedstate)); the textbox picks one at each repaint depending on the focus / hover state.

In addition to the usual background / borders / corners / text-rendering quartet, a **WaynesTextBoxState** adds selection-highlight colours, a caret colour and width, and three decorator fills used for the *ERROR* / *WARNING* / *INFO* literal-substring decorations the textbox draws automatically.

[**InitializeDefaultValues**](#initializedefaultvalues) and [**InitializeDefaultValues_Focused**](#initializedefaultvalues_focused) populate the state with reasonable defaults — the focused variant uses a different selection background and caret colour.

The type itself is `Public Class` but is `[COMCreatable(False)]` — instances are accessed only through the textbox's **NormalState** / **HoverState** / **FocusedState** properties.

## Properties

### BackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the textbox background. Defaults to solid white.

### Borders
{: .no_toc }

The [**Borders**](../Styles/Borders) drawn around the textbox. Defaults to a 1-pixel black border.

### CaretFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the caret. Defaults to solid black in the normal state, orange in the focused state.

### CaretWidth
{: .no_toc }

The width of the caret, in pixels. **Long**. Default: 1.

### Corners
{: .no_toc }

The [**Corners**](../Styles/Corners) that controls the per-corner shape and radius. Defaults to **tbCurve** with a radius of 5.

### DecorationERROR
{: .no_toc }

The [**Fill**](../Styles/Fill) used to draw the inline squiggle decoration when the substring `ERROR` is detected in [**Value**](.#value). Defaults to solid red.

### DecorationINFO
{: .no_toc }

The [**Fill**](../Styles/Fill) used to draw the inline background-highlight decoration when the substring `INFO` is detected in [**Value**](.#value). Defaults to a light blue.

### DecorationWARNING
{: .no_toc }

The [**Fill**](../Styles/Fill) used to draw the inline 2-pixel straight-underline decoration when the substring `WARNING` is detected in [**Value**](.#value). Defaults to a dark blue.

### SelectedBackgroundFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints behind selected text. Defaults to mid-grey in the normal state, blue in the focused state.

### SelectedTextFill
{: .no_toc }

The [**Fill**](../Styles/Fill) that paints the selected glyphs themselves. Defaults to solid white.

### TextRendering
{: .no_toc }

The [**TextRendering**](../Styles/TextRendering) that controls how [**Value**](.#value) is drawn. Defaults to left-aligned with 5-pixel left / right padding and **tbDisallowPartialChars** overflow.

## Methods

### InitializeDefaultValues
{: .no_toc }

Populates every field with the package defaults — used by [**NormalState**](.#normalstate) and [**HoverState**](.#hoverstate).

Syntax: *object*.**InitializeDefaultValues**

### InitializeDefaultValues_Focused
{: .no_toc }

Calls [**InitializeDefaultValues**](#initializedefaultvalues) first, then overrides [**SelectedBackgroundFill**](#selectedbackgroundfill) and [**CaretFill**](#caretfill) with focus-specific colours.

Syntax: *object*.**InitializeDefaultValues_Focused**

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the contained style objects raises its own **OnChanged**, or when [**CaretWidth**](#caretwidth) is assigned. The parent [**WaynesTextBox**](.) listens for this and requests a repaint.
