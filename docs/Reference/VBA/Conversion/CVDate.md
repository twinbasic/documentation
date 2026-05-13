---
title: CVDate
parent: Conversion Module
permalink: /tB/Modules/Conversion/CVDate
redirect_from:
-  /tB/Core/CVDate
vba_attribution: true
---
# CVDate
{: .no_toc }

Converts a valid date and time expression to a **Variant** of subtype **Date**.

Syntax: **CVDate(** *expression* **)**

*expression*
: *required* Any expression that can be converted to a date — a date literal, a date/time string, or a number that falls within the range of acceptable dates.

The return type is **Variant** (**Date**). An error occurs if *expression* cannot be converted to a date.

**CVDate** is provided for compatibility with previous versions of Visual Basic. The syntax of **CVDate** is identical to [**CDate**](CDate); however, **CVDate** returns a **Variant** whose subtype is **Date** instead of an actual **Date** type. Since **Date** is now an intrinsic type, there is no further need for **CVDate** in new code. The same effect can be achieved by converting an expression to a **Date** with [**CDate**](CDate) and then assigning it to a **Variant**.

### Example

```tb
Dim dateString As String
dateString = "February 28, 1998"
MsgBox "Date value of " & dateString & " is " & CVDate(dateString)
```

### See Also

- [CDate](CDate), [CVar](CVar), [CVErr](CVErr) functions
