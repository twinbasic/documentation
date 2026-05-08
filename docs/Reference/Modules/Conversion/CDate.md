---
title: CDate
parent: Conversion Module
permalink: /tB/Modules/Conversion/CDate
redirect_from:
-  /tB/Core/CDate
---
# CDate
{: .no_toc }

Coerces an expression to a **Date**.

Syntax: **CDate(** *expression* **)**

*expression*
: *required* Any valid date expression — a date literal, a date/time string, or a number that falls within the range of acceptable dates.

The return type is **Date**.

Use the **IsDate** function to determine whether *expression* can be converted to a date or time. **CDate** recognizes date literals and time literals as well as some numbers that fall within the range of acceptable dates. When converting a number to a date, the whole-number portion is converted to a date. Any fractional part of the number is converted to a time of day, starting at midnight.

**CDate** recognizes date formats according to the locale setting of your system. The correct order of day, month, and year may not be determined if it is provided in a format other than one of the recognized date settings. In addition, a long date format is not recognized if it also contains the day-of-the-week string.

[**CVDate**](CVDate) is also provided for compatibility with previous versions of Visual Basic. The syntax of **CVDate** is identical to **CDate**; however, **CVDate** returns a **Variant** whose subtype is **Date** instead of an actual **Date** type.

### Example

This example uses the **CDate** function to convert a string to a **Date**. In general, hard-coding dates and times as strings (as shown in this example) is not recommended. Use date literals and time literals, such as `#2/12/1969#` and `#4:45:23 PM#`, instead.

```tb
Dim MyDate, MyShortDate, MyTime, MyShortTime
MyDate = "February 12, 1969"             ' Define date.
MyShortDate = CDate(MyDate)              ' Convert to Date data type.

MyTime = "4:35:47 PM"                    ' Define time.
MyShortTime = CDate(MyTime)              ' Convert to Date data type.
```

### See Also

- [CVDate](CVDate), [DateValue](../DateTime/DateValue), [TimeValue](../DateTime/TimeValue) functions

{% include VBA-Attribution.md %}
