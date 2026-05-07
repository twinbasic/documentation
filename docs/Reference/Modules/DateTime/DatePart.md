---
title: DatePart
parent: DateTime Module
permalink: /tB/Modules/DateTime/DatePart
redirect_from:
-  /tB/Core/DatePart
---
# DatePart
{: .no_toc }

Returns a **Variant** (**Integer**) containing the specified part of a given date.

Syntax: **DatePart** ( *interval*, *date* [, *firstdayofweek* [, *firstweekofyear* ]] )

*interval*
: *required* String expression that is the interval of time to return. See [Interval settings](#interval-settings).

*date*
: *required* **Variant** (**Date**) value to evaluate.

*firstdayofweek*
: *optional* A [**VbDayOfWeek**](#firstdayofweek-settings) constant specifying the first day of the week. Defaults to **vbSunday**.

*firstweekofyear*
: *optional* A [**VbFirstWeekOfYear**](#firstweekofyear-settings) constant specifying the first week of the year. Defaults to **vbFirstJan1**.

### Interval settings

| Setting  | Description  |
|----------|-------------|
| **yyyy** | Year         |
| **q**    | Quarter      |
| **m**    | Month        |
| **y**    | Day of year  |
| **d**    | Day          |
| **w**    | Weekday      |
| **ww**   | Week         |
| **h**    | Hour         |
| **n**    | Minute       |
| **s**    | Second       |

### firstdayofweek settings

| Constant         | Value | Description       |
|------------------|-------|-------------------|
| **vbUseSystem**  | 0     | NLS API setting.  |
| **vbSunday**     | 1     | Sunday (default). |
| **vbMonday**     | 2     | Monday.           |
| **vbTuesday**    | 3     | Tuesday.          |
| **vbWednesday**  | 4     | Wednesday.        |
| **vbThursday**   | 5     | Thursday.         |
| **vbFriday**     | 6     | Friday.           |
| **vbSaturday**   | 7     | Saturday.         |

### firstweekofyear settings

| Constant            | Value | Description                                               |
|---------------------|-------|-----------------------------------------------------------|
| **vbUseSystem**     | 0     | NLS API setting.                                          |
| **vbFirstJan1**     | 1     | Week in which January 1 occurs (default).                 |
| **vbFirstFourDays** | 2     | First week that has at least four days in the new year.   |
| **vbFirstFullWeek** | 3     | First full week of the year.                              |

The *firstdayofweek* argument affects calculations that use the "w" and "ww" interval symbols.

If *date* is a date literal, the specified year becomes a permanent part of that date. If *date* is enclosed in double quotation marks and you omit the year, the current year is inserted each time the expression is evaluated.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied date must be Gregorian. If the calendar is Hijri, the supplied date must be Hijri. The returned date part is in the time period units of the current calendar.

### Example

This example takes a date and, using the **DatePart** function, displays the quarter of the year in which it occurs.

```vb
Dim TheDate As Date
TheDate = InputBox("Enter a date:")
MsgBox "Quarter: " & DatePart("q", TheDate)
```

### See Also

- [DateAdd](DateAdd), [DateDiff](DateDiff) functions

{% include VBA-Attribution.md %}
