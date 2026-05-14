---
title: Toolbars
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Toolbars
has_toc: false
---

# Toolbars class
{: .no_toc }

The collection of IDE toolbars. Reached through [**Host.Toolbars**](Host#toolbars). Currently a single toolbar --- `Host.Toolbars(0)` --- but the collection interface allows future IDE versions to add more.

```tb
With Host.Toolbars(0)
    .AddSplitter
    Set Button1 = .AddButton("MyAddIn.Button1", "Refresh")
End With
```

## Properties

### Count
{: .no_toc }

The number of toolbars. **Long**, read-only. Currently always **1**.

### Item
{: .no_toc }

Indexed access to a toolbar. **DefaultMember** --- so `Toolbars(0)` is equivalent to `Toolbars.Item(0)`.

Syntax: *toolbars*( *Index* ) **As** [**Toolbar**](Toolbar)

*Index*
: A zero-based **Variant** index. Currently `0` is the only valid value.
