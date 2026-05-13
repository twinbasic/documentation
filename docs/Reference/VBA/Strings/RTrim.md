---
title: RTrim
parent: Strings Module
permalink: /tB/Modules/Strings/RTrim
vba_attribution: true
---
# RTrim
{: .no_toc }

Returns a **String** containing a copy of a specified string without trailing spaces.

Syntax: **RTrim$(** *string* **)**, **RTrim(** *string* **)**

*string*
: *required* Any valid string expression. If *string* contains **Null**, **Null** is returned.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

### Example

This example uses the **RTrim** function to strip trailing spaces from a string variable.

```tb
Dim MyString, TrimString
MyString = "  <-Trim->  "         ' Initialize string.
TrimString = RTrim(MyString)      ' TrimString = "  <-Trim->".
```

### See Also

- [LTrim](LTrim), [Trim](Trim) functions
