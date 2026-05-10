---
title: LCase
parent: Strings Module
permalink: /tB/Modules/Strings/LCase
---
# LCase
{: .no_toc }

Returns a **String** that has been converted to lowercase.

Syntax: **LCase$(** *string* **)**, **LCase(** *string* **)**

*string*
: *required* Any valid string expression. If *string* contains **Null**, **Null** is returned.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

Only uppercase letters are converted to lowercase; all lowercase letters and nonletter characters remain unchanged.

### Example

This example uses the **LCase** function to return a lowercase version of a string.

```tb
Dim UpperCase, LowerCase
UpperCase = "Hello World 1234"    ' String to convert.
LowerCase = LCase(UpperCase)      ' Returns "hello world 1234".
```

### See Also

- [StrConv](StrConv), [UCase](UCase) functions

{% include VBA-Attribution.md %}
