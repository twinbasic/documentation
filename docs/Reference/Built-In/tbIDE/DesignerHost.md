---
title: DesignerHost
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/DesignerHost
has_toc: false
---

# DesignerHost class
{: .no_toc }

One tab of a designer, as the IDE gives it to the designer in [**Designer.OnAttached**](Designer#onattached). Through it the designer draws the tab's page, names the tab, fills the TOOLBOX, and gives the IDE the file's new bytes.

```tb check_build
Private Site As DesignerHost

Private Sub Designer_OnAttached(ByVal DesignerHost As DesignerHost)
    Set Site = DesignerHost
    Site.ApplyCss "#title { padding: 6px; background: var(--themeAddinPanelBackColor, #2b2e40); }"
    Site.RootDomElement.ChildDomElements.Add("title", "div").Properties.innerText = Site.GetURI
End Sub
```

The page of the tab is HTML, as a [**ToolWindow**](ToolWindow)'s is, and the same [**HtmlElement**](HtmlElement) members build it, the custom-widget tags such as the [**datasheet**](Datasheet) included.

* TOC
{:toc}

## Properties

### Caption
{: .no_toc }

The text of the tab. **String**. The IDE names the tab after the file; set **Caption** to name it otherwise.

Syntax: *host*.**Caption** [ = *value* ]

### IconData
{: .no_toc }

The icon of the tab, as the text of an SVG picture that starts with `<svg`. **Variant**.

Syntax: *host*.**IconData** [ = *value* ]

### RootDomElement
{: .no_toc }

The element that holds the tab's page. **As** [**HtmlElement**](HtmlElement), read-only. The default member. The page is a shadow root of its own: the IDE's style sheets do not reach it, and [**ApplyCss**](#applycss) styles it.

### Toolbox
{: .no_toc }

The designer's tools in the IDE's TOOLBOX. **As** [**DesignerToolbox**](DesignerToolbox), read-only.

### Tooltip
{: .no_toc }

The text shown when the pointer rests on the tab. **String**.

Syntax: *host*.**Tooltip** [ = *value* ]

## Methods

### ApplyCss
{: .no_toc }

Adds a style sheet to the tab's page.

Syntax: *host*.**ApplyCss** *styles*

*styles*
: *required* The CSS. **String**. The theme's [colours for addins](Themes#colours-for-addins) are there as variables, and follow a change of the IDE's theme.

### GetURI
{: .no_toc }

The path of the tab's file in the project, such as `"/MyProject/Sources/Data.bin"`. **String**. It has no `twinbasic:` in front: put that in front of it for [**FileSystem.ResolvePath**](FileSystem#resolvepath). A designer opened with [**Editors.Open**](Editors#open), for no file, gets an empty string.

Syntax: *host*.**GetURI** **As String**

### SetFileData
{: .no_toc }

Gives the IDE the file's new bytes.

Syntax: *host*.**SetFileData** *bytes*

*bytes*
: *required* The whole file. **Byte()**, passed **ByRef**. For an empty file, Sample 24 passes an array with no elements, made with `SafeArrayCreateVector`, rather than an erased one, which its comments say the IDE does not take.

The IDE keeps the bytes as the tab's contents, and the tab is marked as changed. The file on disk changes only when the project is saved, which <kbd>Ctrl</kbd>+<kbd>S</kbd> in the tab also does. Saving the tab, or closing it with **Save**, runs the designer's [**OnSaveCompleted**](Designer#onsavecompleted); closing it with **Save** puts the bytes into the project the IDE holds, not on the disk. **SetFileData** calls no [**OnFileDataChanged**](Designer#onfiledatachanged).

Call it at each change, as Samples 24, 25 and 27 do, so that a save writes what the user sees and a restart of the compiler gives the designer its unsaved bytes back.

<!-- test: bug designer-dirty-dot-stays, lane addin:designers -->
> [!NOTE] BETA 1045
> When **SetFileData** gives back the bytes the file was saved with, the IDE takes the tab as unchanged, and closing it asks nothing, but the tab's changed mark stays until the next save.

## See Also

- [Designer](Designer) class
- [DesignerToolbox](DesignerToolbox) class
- [ToolWindow](ToolWindow) class -- the same page, in a window of its own
