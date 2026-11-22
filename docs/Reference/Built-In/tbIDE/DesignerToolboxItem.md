---
title: DesignerToolboxItem
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/DesignerToolboxItem
has_toc: false
---

# DesignerToolboxItem class
{: .no_toc }

One tool in a designer's TOOLBOX, made with [**DesignerToolbox.AddItem**](DesignerToolbox#additem). Held `WithEvents`, it raises [**OnClick**](#onclick) when the user clicks it in the TOOLBOX.

* TOC
{:toc}

## Properties

### Caption
{: .no_toc }

The tool's name. **String**.

Syntax: *item*.**Caption** [ = *value* ]

### IconData
{: .no_toc }

The tool's icon, as the text of an SVG picture that starts with `<svg`. **Variant**.

Syntax: *item*.**IconData** [ = *value* ]

## Events

### OnClick
{: .no_toc }

Raised when the user clicks the tool. The TOOLBOX then shows it as the selected tool, and keeps it so when the tab is left and chosen again. No tool is selected at first.

Syntax: *item*_**OnClick**()

## See Also

- [DesignerToolbox](DesignerToolbox) class
