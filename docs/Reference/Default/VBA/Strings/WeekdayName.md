---
title: WeekdayName
parent: Strings Module
permalink: /tB/Modules/Strings/WeekdayName
vba_attribution: true
---
# WeekdayName
{: .no_toc }

Returns a string indicating the specified day of the week.

Syntax: **WeekdayName(** *weekday* [ **,** *abbreviate* [ **,** *firstdayofweek* ] ] **)**

*weekday*
: *required* The numeric designation for the day of the week. The numeric value of each day depends on the *firstdayofweek* setting.

*abbreviate*
: *optional* **Boolean** value that indicates if the weekday name is to be abbreviated. If omitted, the default is **False**, which means that the weekday name is not abbreviated.

*firstdayofweek*
: *optional* Numeric value indicating the first day of the week. See settings below.

The *firstdayofweek* argument can have the following values:

| Constant         | Value | Description                                                |
|------------------|-------|------------------------------------------------------------|
| **vbUseSystem**  | 0     | Default. Use National Language Support (NLS) API setting.  |
| **vbSunday**     | 1     | Sunday                                                     |
| **vbMonday**     | 2     | Monday                                                     |
| **vbTuesday**    | 3     | Tuesday                                                    |
| **vbWednesday**  | 4     | Wednesday                                                  |
| **vbThursday**   | 5     | Thursday                                                   |
| **vbFriday**     | 6     | Friday                                                     |
| **vbSaturday**   | 7     | Saturday                                                   |

### Example

This example uses **WeekdayName** to return the full and abbreviated name of a weekday.

```tb
Debug.Print WeekdayName(2)          ' "Monday" (vbSunday = first day of week)
Debug.Print WeekdayName(2, True)    ' "Mon"
Debug.Print WeekdayName(1)          ' "Sunday"
```

### See Also

- [FormatDateTime](FormatDateTime), [MonthName](MonthName) functions
