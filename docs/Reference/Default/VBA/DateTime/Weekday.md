---
title: Weekday
parent: DateTime Module
permalink: /tB/Modules/DateTime/Weekday
redirect_from:
-  /tB/Core/Weekday
vba_attribution: true
---
# Weekday
{: .no_toc }

Returns a **Variant** (**Integer**) containing a whole number representing the day of the week.

Syntax: **Weekday** ( *date* [, *firstdayofweek* ] )

*date*
: *required* Any **Variant**, numeric expression, string expression, or any combination that can represent a date. If *date* contains **Null**, **Null** is returned.

*firstdayofweek*
: *optional* A constant that specifies the first day of the week. If not specified, **vbSunday** is assumed.

The *firstdayofweek* argument uses these settings:

| Constant | Value | Description |
|:---|:---|:---|
| **vbUseSystem** | 0 | Use the NLS API setting. |
| **vbSunday** | 1 | Sunday (default) |
| **vbMonday** | 2 | Monday |
| **vbTuesday** | 3 | Tuesday |
| **vbWednesday** | 4 | Wednesday |
| **vbThursday** | 5 | Thursday |
| **vbFriday** | 6 | Friday |
| **vbSaturday** | 7 | Saturday |

The **Weekday** function can return any of these values:

| Constant | Value | Description |
|:---|:---|:---|
| **vbSunday** | 1 | Sunday |
| **vbMonday** | 2 | Monday |
| **vbTuesday** | 3 | Tuesday |
| **vbWednesday** | 4 | Wednesday |
| **vbThursday** | 5 | Thursday |
| **vbFriday** | 6 | Friday |
| **vbSaturday** | 7 | Saturday |

If the [**Calendar**](Calendar) property setting is Gregorian, the returned integer represents the Gregorian day of the week for the date argument. If the calendar is Hijri, the returned integer represents the Hijri day of the week for the date argument.

### Example

This example uses the **Weekday** function to obtain the day of the week from a specified date.

```tb
Dim MyDate, MyWeekDay
MyDate = #February 12, 1969#    ' Assign a date.
MyWeekDay = Weekday(MyDate)     ' MyWeekDay contains 4 because
                                ' MyDate represents a Wednesday.
```

### See Also

- [Day](Day), [Month](Month), [Year](Year) functions
