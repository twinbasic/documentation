---
title: DesignerToolbox
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/DesignerToolbox
has_toc: false
---

# DesignerToolbox class
{: .no_toc }

A designer's tools in the IDE's TOOLBOX panel, where the form designer shows its controls. Reached through [**DesignerHost.Toolbox**](DesignerHost#toolbox). The TOOLBOX shows a designer's items while its tab is the active editor, and none while another tab is.

```tb check_build
Private Site As DesignerHost
Private CurrentTool As String
Private WithEvents PencilTool As DesignerToolboxItem
Private WithEvents EraserTool As DesignerToolboxItem

Private Sub Designer_OnAttached(ByVal DesignerHost As DesignerHost)
    Set Site = DesignerHost
    With Site.Toolbox
        Set PencilTool = .AddItem("Pencil")
        Set EraserTool = .AddItem("Eraser")
    End With
End Sub

Private Sub PencilTool_OnClick()
    CurrentTool = "pencil"
End Sub
```

Add the items once, in [**Designer.OnAttached**](Designer#onattached), as Sample 25 does: the IDE shows them each time the tab becomes active.

* TOC
{:toc}

## Methods

### AddItem
{: .no_toc }

Adds a tool to the designer's TOOLBOX and returns it, for the designer to hold `WithEvents`.

Syntax: *toolbox*.**AddItem**( *Caption* [, *IconData* ] ) **As** [**DesignerToolboxItem**](DesignerToolboxItem)

*Caption*
: *required* The tool's name. **String**.

*IconData*
: *optional* The tool's icon, as the text of an SVG picture that starts with `<svg`. **Variant**.

### Clear
{: .no_toc }

Removes every tool from the designer's TOOLBOX.

Syntax: *toolbox*.**Clear**

## See Also

- [DesignerToolboxItem](DesignerToolboxItem) class
- [DesignerHost.Toolbox](DesignerHost#toolbox) property
