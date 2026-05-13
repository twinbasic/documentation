---
title: Switch
parent: Interaction Module
permalink: /tB/Modules/Interaction/Switch
redirect_from:
-  /tB/Core/Switch
vba_attribution: true
---
# Switch
{: .no_toc }

Evaluates a list of *(condition, value)* pairs and returns the value paired with the first condition that evaluates to **True**.

Syntax: **Switch(** *expr-1* **,** *value-1* [ **,** *expr-2* **,** *value-2* **, ...** [ **,** *expr-n* **,** *value-n* ] ] **)**

*expr*
: *required* **Variant** expression to evaluate.

*value*
: *required* Value or expression to be returned if the corresponding *expr* is **True**.

The argument list consists of pairs of conditions and values. Conditions are evaluated from left to right, and the value associated with the first condition that evaluates to **True** is returned. If the parts aren't properly paired (i.e. an odd number of arguments is supplied) a run-time error occurs.

**Switch** returns **Null** if none of the conditions is **True**, or if the first **True** condition has a corresponding *value* of **Null**.

> [!NOTE]
> **Switch** evaluates *every* condition expression and *every* value, not only the ones it ends up using. Watch for side effects: if any of the value expressions would raise an error (for example, division by zero), the error occurs even when **Switch** would not have returned that value.

### Example

This example uses **Switch** to return the language associated with a city name.

```tb
Function MatchUp(CityName As String) As Variant
    MatchUp = Switch(CityName = "London", "English", _
                     CityName = "Rome",   "Italian", _
                     CityName = "Paris",  "French")
End Function
```

### See Also

- [Choose](Choose) function
- [If](If) function
- [IIf](IIf) function
