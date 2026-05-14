---
title: HtmlElements
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/HtmlElements
has_toc: false
---

# HtmlElements class
{: .no_toc }

A child-element collection on an [**HtmlElement**](HtmlElement). Reached through [**HtmlElement.ChildDomElements**](HtmlElement#childdomelements). Use [**Add**](#add) to create new children and [**Item**](#item) to look one up by ID after the fact.

```tb
With myToolWindow.RootDomElement
    With .ChildDomElements.Add("header", "h1")
        .Properties.innerText = "Hello"
    End With
    With .ChildDomElements.Add("body", "div")
        .Properties.style.padding = "10px"
        With .ChildDomElements.Add("greeting", "p")
            .Properties.innerText = "World"
        End With
    End With
End With
```

* TOC
{:toc}

## Methods

### Add
{: .no_toc }

Creates a new child element under the parent [**HtmlElement**](HtmlElement) and returns the new [**HtmlElement**](HtmlElement).

Syntax: *htmlElements*.**Add**( *ElementID*, *TagName* ) **As** [**HtmlElement**](HtmlElement)

*ElementID*
: *required* A DOM `id` for the new element. **String**. Pick distinct IDs across the tool window — they double as the key for [**Item**](#item) lookups.

*TagName*
: *required* The HTML tag name. **String**. Standard tags (`"div"`, `"span"`, `"input"`, `"h1"`, `"label"`, `"img"`, …) work as expected; the IDE additionally accepts four custom-widget tags described in [Tool-window DOM tags](.#tool-window-dom-tags) on the package overview: `"chartjs"`, `"monaco"`, `"listview"`, `"virtuallistview"`.

```tb
' Standard DOM tags:
Set greeting = .ChildDomElements.Add("greeting", "h1")
Set entry    = .ChildDomElements.Add("entryBox", "input")

' Custom-widget tags (see sample 11 / 12 / 13 / 14):
Set chart      = .ChildDomElements.Add("cpuChart",  "chartjs")
Set editor     = .ChildDomElements.Add("myEditor",  "monaco")
Set listview   = .ChildDomElements.Add("itemsList", "listview")
Set virtList   = .ChildDomElements.Add("bigList",   "virtuallistview")
```

## Properties

### Item
{: .no_toc }

Looks up an existing child element by its ID. **DefaultMember** — so `elements("greeting")` is equivalent to `elements.Item("greeting")`.

Syntax: *htmlElements*( *ID* ) **As** [**HtmlElement**](HtmlElement)

*ID*
: A **Variant** — typically the **String** ID assigned at [**Add**](#add) time.
