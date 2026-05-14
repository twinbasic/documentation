---
title: CodeEditor
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/CodeEditor
has_toc: false
---

# CodeEditor class
{: .no_toc }

A code-pane editor — the specific [**Editor**](Editor) kind the IDE returns when the active editor is a source-code pane. Adds selection / text / scrolling control, an inline-widget API, and a raw passthrough into the underlying Monaco editor that powers code panes.

A **CodeEditor** is reached by casting an [**Editor**](Editor) — `Host.ActiveEditors(0)` returns an [**Editor**](Editor) that, for a code pane, is also a **CodeEditor**:

```tb
If TypeOf Host.ActiveEditors(0) Is CodeEditor Then
    Dim codeEditor As CodeEditor = Host.ActiveEditors(0)
    codeEditor.SelectedText = "' commented out by an addin" & vbCrLf & codeEditor.SelectedText
End If
```

**CodeEditor** inherits every base [**Editor**](Editor) member ([**Path**](Editor#path), [**Type**](Editor#type), [**SetFocus**](Editor#setfocus), [**Close**](Editor#close), [**Save**](Editor#save), [**IsDirty**](Editor#isdirty)) and adds the members listed below.

* TOC
{:toc}

## Properties

### SelectedText
{: .no_toc }

The currently-selected text. Reading returns the selection as a **String** (empty string when nothing is selected). Assigning replaces the current selection with the supplied text. Read / write.

Syntax: *codeEditor*.**SelectedText** [ = *value* ]

### Text
{: .no_toc }

The full text of the code pane. Reading returns the entire document; assigning replaces every line with the supplied text. Read / write.

Syntax: *codeEditor*.**Text** [ = *value* ]

Replacing the entire text is heavy — both for the editor (it has to rebuild every Monaco data structure) and for the user (the undo stack collapses to a single step). For targeted edits, prefer [**SelectedText**](#selectedtext) over [**Text**](#text).

## Methods

### AddMonacoWidget
{: .no_toc }

Attaches an inline HTML overlay to a specific position in the editor — Monaco's *content widget* mechanism, exposed as a familiar [**HtmlElement**](HtmlElement).

Syntax: *codeEditor*.**AddMonacoWidget**( *LineNumber*, *ColumnNumber*, *Html* [, *Css* ] ) **As** [**HtmlElement**](HtmlElement)

*LineNumber*
: *required* One-based line number to attach the widget to. **Long**.

*ColumnNumber*
: *required* One-based column number on that line, **or zero**. **Long**. When the column number is zero, the widget is rendered *below* the line and the editor inserts vertical space so the widget does not overlap the next line. Pass a non-zero column to render the widget inline at that column.

*Html*
: *required* The widget's HTML content. **String**.

*Css*
: *optional* Per-widget CSS as a **String**. Use this for widget-local styles that should not bleed into the rest of the code pane.

The returned [**HtmlElement**](HtmlElement) has the same dynamic-DOM properties as elements inside a tool window — see [Dynamic DOM property resolution](.#dynamic-dom-property-resolution) on the package overview. Call [**HtmlElement.Remove**](HtmlElement#remove) on the returned object to remove the widget.

### ExecuteMonacoCommand
{: .no_toc }

Sends a direct command to the underlying Monaco editor instance. Useful for triggering Monaco's built-in commands (Find, Go-to-Line, Format, Toggle Comment, …) without writing the equivalent twinBASIC code.

Syntax: *codeEditor*.**ExecuteMonacoCommand** *Command* [, *Arg1*, *Arg2*, … ]

*Command*
: *required* The Monaco command ID. **String**. Common values include `"actions.find"` (open the Find widget), `"closeFindWidget"` (close it), `"editor.action.formatDocument"`, and `"editor.action.commentLine"`.

*Args*
: *optional* A **ParamArray** of command-specific arguments. **Variant**. Forwarded verbatim to Monaco.

The reference does not enumerate Monaco's command set — refer to Monaco's documentation for the full list and their per-command argument shapes.

```tb
codeEditor.ExecuteMonacoCommand "actions.find"          ' open Find widget
codeEditor.ExecuteMonacoCommand "closeFindWidget"       ' close it
```

### GetSelectionInfo
{: .no_toc }

Reports the start and end positions of the current selection. All four output arguments are filled even when nothing is selected — start and end positions then coincide on the caret's current position.

Syntax: *codeEditor*.**GetSelectionInfo** *StartLine*, *StartColumn*, *EndLine*, *EndColumn*

*StartLine*, *StartColumn*, *EndLine*, *EndColumn*
: **ByRef Long** — output parameters, all one-based.

### RevealRange
{: .no_toc }

Scrolls the editor to bring a range into view, optionally animating the scroll and positioning the range at a specific spot in the viewport.

Syntax: *codeEditor*.**RevealRange** *StartLine*, *StartColumn*, *EndLine*, *EndColumn* [, *SmoothScroll* ] [, *Area* ]

*StartLine*, *StartColumn*, *EndLine*, *EndColumn*
: *required* The range to reveal. **Long**, one-based.

*SmoothScroll*
: *optional* **Boolean** — animate the scroll. Default **True**.

*Area*
: *optional* A [**RevealArea**](#revealarea) value controlling where in the viewport the range lands. Default [**Any**](#RevealArea_Any).

### SetSelectionInfo
{: .no_toc }

Sets the start and end positions of the selection. The inverse of [**GetSelectionInfo**](#getselectioninfo).

Syntax: *codeEditor*.**SetSelectionInfo** *StartLine*, *StartColumn*, *EndLine*, *EndColumn*

*StartLine*, *StartColumn*, *EndLine*, *EndColumn*
: *required* One-based line and column positions. **Long**. To position the caret without selecting any text, use the same line / column for both ends.

## RevealArea
{: #revealarea }

Controls where in the viewport [**RevealRange**](#revealrange) places the requested range.

| Constant | Value | Description |
|----------|-------|-------------|
| **Any**{: #RevealArea_Any }                                | 0 | Scroll vertically or horizontally only as much as necessary to make the range visible. Cheapest scroll. |
| **Top**{: #RevealArea_Top }                                | 1 | Scroll so the range sits at the top of the viewport. |
| **Center**{: #RevealArea_Center }                          | 2 | Scroll so the range is vertically centred in the viewport. |
| **CenterIfNotVisible**{: #RevealArea_CenterIfNotVisible }  | 3 | Centre vertically, but only if the range currently lies outside the viewport — otherwise do nothing. |
| **NearTop**{: #RevealArea_NearTop }                        | 4 | Scroll so the range sits close to the top, with some context above — Monaco's "view a code definition" preset. |
| **NearTopIfNotVisible**{: #RevealArea_NearTopIfNotVisible } | 5 | Same as [**NearTop**](#RevealArea_NearTop), but only if the range is currently outside the viewport. |
