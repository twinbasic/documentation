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
| Other numeric      | A string containing the number.                               |

**CStr** is the internationally aware alternative to [**Str**](Str) for converting a number to a string. **CStr** recognizes different decimal separators properly, depending on the system's locale setting.

> [!WARNING] BETA 1010
> A 64-bit build converts a negative zero of type **Single** or **Double** (a value that equals 0 and has its sign bit set) to `"-0"`. A 32-bit build and VB6 give `"0"`. The same happens when such a value is joined to a string with `&`.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses the **CStr** function to convert a numeric value to a **String**.

```tb check_build
Dim MyDouble, MyString
MyDouble = 437.324                       ' MyDouble is a Double.
MyString = CStr(MyDouble)                ' MyString contains "437.324".
```

### See Also

- [CBool](CBool), [CByte](CByte), [CCur](CCur), [CDbl](CDbl), [CInt](CInt), [CLng](CLng), [CSng](CSng), [CVar](CVar) functions
- [Str](Str), [Format](../Strings/Format) functions
