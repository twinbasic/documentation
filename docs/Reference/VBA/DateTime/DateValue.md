---
title: DateValue
parent: DateTime Module
permalink: /tB/Modules/DateTime/DateValue
redirect_from:
-  /tB/Core/DateValue
---
# DateValue
{: .no_toc }

Returns a **Variant** (**Date**) from a string expression representing a date.

Syntax: **DateValue** ( *date* )

*date*
: *required* String expression representing a date from January 1, 100, through December 31, 9999. However, *date* can also be any expression that can represent a date, a time, or both a date and time, in that range.

If *date* is a string that includes only numbers separated by valid date separators, **DateValue** recognizes the order for month, day, and year according to the Short Date format specified for your system. **DateValue** also recognizes unambiguous dates that contain month names, either in long or abbreviated form. For example, in addition to recognizing 12/30/1991 and 12/30/91, **DateValue** also recognizes December 30, 1991 and Dec 30, 1991.

If the year part of *date* is omitted, **DateValue** uses the current year from your computer's system date.

If the *date* argument includes time information, **DateValue** doesn't return it. However, if *date* includes invalid time information (such as "89:98"), an error occurs.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied date must be Gregorian. If the calendar is Hijri, the supplied date must be Hijri.

### Example

This example uses the **DateValue** function to convert a string to a date. You can also use date literals to directly assign a date to a **Variant** or **Date** variable (for example, `MyDate = #2/12/69#`).

```tb
Dim MyDate
MyDate = DateValue("February 12, 1969")    ' Returns a date.
```

### See Also

- [DateSerial](DateSerial) function

{% include VBA-Attribution.md %}
