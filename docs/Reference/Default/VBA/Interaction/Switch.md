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

The argument list consists of pairs of conditions and values. Conditions are evaluated from left to right, and the value associated with the first condition that evaluates to **True** is returned.

**Switch** returns **Null** if none of the conditions is **True**, or if the first **True** condition has a corresponding *value* of **Null**.

> [!NOTE]
> **Switch** evaluates *every* condition expression and *every* value, not only the ones it ends up using. Watch for side effects: if any of the value expressions would raise an error (for example, division by zero), the error occurs even when **Switch** would not have returned that value.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | the arguments are not in pairs: their number is odd |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | an *expr* is a string that is not a **Boolean** or a number |

> [!NOTE] BETA 1010
> When the arguments are not in pairs: their number is odd, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses **Switch** to return the language associated with a city name.

```tb check_build
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
