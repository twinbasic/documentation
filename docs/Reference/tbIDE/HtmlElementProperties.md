---
title: HtmlElementProperties
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/HtmlElementProperties
has_toc: false
---

# HtmlElementProperties class
{: .no_toc }

The dynamic property bag on an [**HtmlElement**](HtmlElement). Reached through [**HtmlElement.Properties**](HtmlElement#properties). Every CSS property, every DOM attribute, every custom-widget extension is accessed through this bag — and almost always written in shorthand because [**Properties**](HtmlElement#properties) is the **DefaultMember** of [**HtmlElement**](HtmlElement):

```tb
With element                          ' element.Properties is the default member
    .style.display    = "flex"        ' Properties.Item("style").Item("display").Value = "flex"
    .style.flexDirection = "column"
    .style.gap        = "10px"
    .innerText        = "Hello"
End With
```

The shorthand reads at run time as a chain of `Item("name")` lookups against the underlying DOM element — see [Dynamic DOM property resolution](.#dynamic-dom-property-resolution) on the package overview.

> [!IMPORTANT]
> This interface is **`[COMExtensible(True)]`**. Property names are resolved against the live DOM element at run time, not declared statically on the interface. The compiler does not validate names — a typo (`.innerTxt = "..."` instead of `.innerText = "..."`) fails silently or throws at run time. The accepted set is **every DOM property of the underlying tag**, plus any custom-widget extensions; the reference does not enumerate it.

## Default member

The interface's **DefaultMember** is [**Item**](#item) — so `properties("style")` is equivalent to `properties.Item("style")`. Chains of `.style.color = "red"` thus desugar to `properties.Item("style").Item("color").Value = "red"`.

## Properties

### Item
{: .no_toc }

Looks up a property by name. Returns an [**HtmlElementProperty**](HtmlElementProperty), which includes the property's value plus a nested [**Properties**](HtmlElementProperty#properties) for further drill-down.

Syntax: *properties*( *DomPropertyName* ) **As** [**HtmlElementProperty**](HtmlElementProperty)

*DomPropertyName*
: *required* The property name. **String**. Standard DOM property names, CSS-style property names (when looked up under `style`), or custom-widget property names — all forwarded to the IDE's tool-window renderer.
