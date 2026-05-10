---
title: IsNull
parent: Information Module
permalink: /tB/Modules/Information/IsNull
redirect_from:
-  /tB/Core/IsNull
---
# IsNull
{: .no_toc }

Returns a **Boolean** indicating whether an expression contains no valid data (**Null**).

Syntax: **IsNull(** *expression* **)**

*expression*
: *required* A **Variant** containing a numeric or string expression.

**IsNull** returns **True** if *expression* is **Null**; otherwise, **False**. If *expression* contains more than one variable, **Null** in any constituent variable causes the whole expression to evaluate to **Null**, and **IsNull** to return **True**.

The **Null** value indicates that a **Variant** holds no valid data. **Null** is not the same as [**Empty**](IsEmpty) (a variable that has not yet been initialized), nor the same as a zero-length string (`""`), which is sometimes called a null string.

> [!IMPORTANT]
> Use **IsNull** to determine whether an expression contains a **Null** value. Comparisons such as `If Var = Null` and `If Var <> Null` are always **False**, because any expression involving **Null** is itself **Null**, and a **Null** comparison is treated as **False**.

### Example

This example uses **IsNull** to determine whether a variable contains a **Null**.

```tb
Dim MyVar As Variant
Dim MyCheck As Boolean
MyCheck = IsNull(MyVar)               ' False — MyVar is Empty.

MyVar = ""
MyCheck = IsNull(MyVar)               ' False — empty string is not Null.

MyVar = Null
MyCheck = IsNull(MyVar)               ' True.
```

### See Also

- [IsEmpty](IsEmpty), [IsMissing](IsMissing) functions
- [Nz](../Conversion/Nz) function

{% include VBA-Attribution.md %}
