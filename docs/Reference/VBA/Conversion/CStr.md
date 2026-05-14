---
title: CStr
parent: Conversion Module
permalink: /tB/Modules/Conversion/CStr
redirect_from:
-  /tB/Core/CStr
vba_attribution: true
---
# CStr
{: .no_toc }

Coerces an expression to a **String**.

Syntax: **CStr(** *expression* **)**

*expression*
: *required* Any valid expression.

The return type is **String**. The result depends on the type of *expression*:

| If *expression* is | CStr returns                                                  |
|--------------------|---------------------------------------------------------------|
| **Boolean**        | A string containing `"True"` or `"False"`.                    |
| **Date**           | A string containing a date in the system's short date format. |
| **Empty**          | A zero-length string (`""`).                                  |
| **Error**          | A string containing the word `Error` followed by the error number. |
| **Null**           | A run-time error.                                             |
| Other numeric      | A string containing the number.                               |

**CStr** is the internationally aware alternative to [**Str**](Str) for converting a number to a string. **CStr** recognizes different decimal separators properly, depending on the system's locale setting.

### Example

This example uses the **CStr** function to convert a numeric value to a **String**.

```tb
Dim MyDouble, MyString
MyDouble = 437.324                       ' MyDouble is a Double.
MyString = CStr(MyDouble)                ' MyString contains "437.324".
```

### See Also

- [CBool](CBool), [CByte](CByte), [CCur](CCur), [CDbl](CDbl), [CInt](CInt), [CLng](CLng), [CSng](CSng), [CVar](CVar) functions
- [Str](Str), [Format](../Strings/Format) functions
