---
title: Day
parent: DateTime Module
permalink: /tB/Modules/DateTime/Day
redirect_from:
-  /tB/Core/Day
---
# Day
{: .no_toc }

Returns a **Variant** (**Integer**) specifying a whole number between 1 and 31, inclusive, representing the day of the month.

Syntax: **Day** ( *date* )

*date*
: *required* Any **Variant**, numeric expression, string expression, or any combination that can represent a date. If *date* contains **Null**, **Null** is returned.

> [!NOTE]
> If the [**Calendar**](Calendar) property setting is Gregorian, the returned integer represents the Gregorian day of the month. If the calendar is Hijri, the returned integer represents the Hijri day of the month.

### Example

This example uses the **Day** function to obtain the day of the month from a specified date.

```vb
Dim MyDate, MyDay
MyDate = #February 12, 1969#    ' Assign a date.
MyDay = Day(MyDate)    ' MyDay contains 12.
```

### See Also

- [Month](Month), [Year](Year), [DatePart](DatePart) functions

{% include VBA-Attribution.md %}
