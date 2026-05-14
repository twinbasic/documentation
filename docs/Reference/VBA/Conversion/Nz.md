---
title: Nz
parent: Conversion Module
permalink: /tB/Modules/Conversion/Nz
redirect_from:
-  /tB/Core/Nz
vba_attribution: true
---
# Nz
{: .no_toc }

Replaces a **Null** value with the specified replacement value.

Syntax: **Nz(** *value* [ **,** *valueIfNull* ] **)**

*value*
: *required* A **Variant** to check for **Null**.

*valueIfNull*
: *optional* A **Variant** to return if *value* is **Null**. If omitted, **Nz** returns **Empty**.

The return type is **Variant**.

**Nz** is useful for handling expressions that may evaluate to **Null** --- most commonly, fields read from a database recordset where a column permits **Null**. Unlike a direct comparison with **Null** (which itself yields **Null**), **Nz** returns a usable substitute value.

If *value* is anything other than **Null**, **Nz** returns *value* unchanged.

> [!NOTE]
> The function originated in Microsoft Access. twinBASIC provides it as a built-in so the same idiom can be used outside of an Access host.

### Example

This example uses **Nz** to substitute the string `"Unknown"` for a recordset field that may be **Null**.

```tb
Dim customerName As Variant
customerName = recordset.Fields("Name").Value
MsgBox "Customer Name: " & Nz(customerName, "Unknown")
```
