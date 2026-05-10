---
title: Str
parent: Conversion Module
permalink: /tB/Modules/Conversion/Str
redirect_from:
-  /tB/Core/Str
---
# Str, Str$
{: .no_toc }

Returns a string representation of a number.

Syntax:

- **Str$(** *number* **)**
- **Str(** *number* **)**

*number*
: *required* Any valid numeric expression.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

When numbers are converted to strings, a leading space is always reserved for the sign of *number*. If *number* is positive, the returned string contains a leading space and the plus sign is implied.

Use the [**Format**](../Strings/Format) function to convert numeric values that you want formatted as dates, times, or currency or in other user-defined formats. Unlike **Str**, the **Format** function doesn't include a leading space for the sign of *number*.

> [!NOTE]
> The **Str** function recognizes only the period (`.`) as a valid decimal separator. When different decimal separators may be used (for example, in international applications), use [**CStr**](CStr) to convert a number to a string.

### Example

This example uses the **Str** function to return a string representation of a number. When a number is converted to a string, a leading space is always reserved for its sign.

```tb
Dim MyString
MyString = Str(459)         ' Returns " 459".
MyString = Str(-459.65)     ' Returns "-459.65".
MyString = Str(459.001)     ' Returns " 459.001".
```

### See Also

- [CStr](CStr), [Format](../Strings/Format), [Hex](Hex), [Oct](Oct), [Val](Val) functions

{% include VBA-Attribution.md %}
