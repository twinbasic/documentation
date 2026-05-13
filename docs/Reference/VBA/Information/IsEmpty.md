---
title: IsEmpty
parent: Information Module
permalink: /tB/Modules/Information/IsEmpty
redirect_from:
-  /tB/Core/IsEmpty
vba_attribution: true
---
# IsEmpty
{: .no_toc }

Returns a **Boolean** indicating whether a **Variant** has been initialized.

Syntax: **IsEmpty(** *expression* **)**

*expression*
: *required* A **Variant** containing a numeric or string expression. Most often, *expression* is a single variable name, since **IsEmpty** only returns meaningful information for **Variant**s.

**IsEmpty** returns **True** if the variable is uninitialized or has been explicitly set to **Empty**; otherwise, it returns **False**. **False** is always returned if *expression* contains more than one variable.

### Example

This example uses **IsEmpty** to determine whether a variable has been initialized.

```tb
Dim MyVar As Variant
Dim MyCheck As Boolean
MyCheck = IsEmpty(MyVar)              ' True — uninitialised.

MyVar = Null
MyCheck = IsEmpty(MyVar)              ' False — Null is not Empty.

MyVar = Empty
MyCheck = IsEmpty(MyVar)              ' True.
```

### See Also

- [IsNull](IsNull), [IsMissing](IsMissing) functions
