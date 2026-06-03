---
title: HtmlElementProperty
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/HtmlElementProperty
has_toc: false
---

# HtmlElementProperty class
{: .no_toc }

One settable property on an [**HtmlElement**](HtmlElement) --- returned by [**HtmlElementProperties.Item**](HtmlElementProperties#item). Carries the property's [**Value**](#value) plus a [**Properties**](#properties) accessor that lets the addin drill into nested DOM property structures (`.style.color`, `.chart.data.datasets(0).borderWidth`, …).

Almost always written in shorthand --- neither **HtmlElementProperty** nor its parent [**HtmlElementProperties**](HtmlElementProperties) is typically named in addin code; the compiler resolves chains like `.style.color = "red"` through their default-members:

```tb
element.style.color = "red"
'   ↑ HtmlElement.Properties      (HtmlElement's DefaultMember)
'     .Item("style")               (HtmlElementProperties' DefaultMember)
'           .Properties            (HtmlElementProperty.Properties — nested bag)
'           .Item("color")         (the same DefaultMember chain again)
'                 .Value = "red"   (HtmlElementProperty.Value, the leaf)
```

* TOC
{:toc}

## Properties

### Properties
{: .no_toc }

A nested [**HtmlElementProperties**](HtmlElementProperties) for properties that themselves have sub-properties (the canonical example is `style`, whose sub-properties are the individual CSS-style names). Read-only at the accessor level; the inner bag is mutable.

Syntax: *property*.**Properties** **As** [**HtmlElementProperties**](HtmlElementProperties)

### Value
{: .no_toc }

The property's value. Read returns the current value as a **Variant**; assigning writes the new value back. **DefaultMember** --- so `propertyObj = "red"` is equivalent to `propertyObj.Value = "red"`.

Syntax: *property* [ = *value* ]

The interface is **`[COMExtensible(True)]`** --- see [Dynamic DOM property resolution](.#dynamic-dom-property-resolution) on the package overview. Property names that route through [**Properties**](#properties) are resolved against the live DOM at run time, not declared statically.
