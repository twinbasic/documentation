---
title: DateDiff
parent: DateTime Module
permalink: /tB/Modules/DateTime/DateDiff
redirect_from:
-  /tB/Core/DateDiff
vba_attribution: true
---
# DateDiff
{: .no_toc }

Returns a **Variant** (**Long**) specifying the number of time intervals between two specified dates.

Syntax: **DateDiff** ( *interval*, *date1*, *date2* [, *firstdayofweek* [, *firstweekofyear* ]] )

*interval*
: *required* String expression that is the interval of time used to calculate the difference between *date1* and *date2*. See [Interval settings](#interval-settings).

*date1*, *date2*
: *required* **Variant** (**Date**). Two dates to use in the calculation.

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

To calculate the number of days between *date1* and *date2*, you can use either Day of Year ("y") or Day ("d"). When *interval* is Weekday ("w"), **DateDiff** returns the number of weeks between the two dates. If *date1* falls on a Monday, **DateDiff** counts the number of Mondays until *date2*. It counts *date2* but not *date1*.

If *interval* is Week ("ww"), however, **DateDiff** returns the number of calendar weeks between the two dates. It counts the number of Sundays between *date1* and *date2*. **DateDiff** counts *date2* if it falls on a Sunday, but it doesn't count *date1*, even if it does fall on a Sunday.

If *date1* refers to a later point in time than *date2*, the function returns a negative number. The *firstdayofweek* argument affects calculations that use the "w" and "ww" interval symbols.

If *date1* or *date2* is a date literal, the specified year becomes a permanent part of that date. If *date1* or *date2* is enclosed in double quotation marks and you omit the year, the current year is inserted each time the expression is evaluated.

When comparing December 31 to January 1 of the immediately succeeding year, **DateDiff** for Year ("yyyy") returns 1 even though only a day has elapsed.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied date must be Gregorian. If the calendar is Hijri, the supplied date must be Hijri.

### Example

This example uses the **DateDiff** function to display the number of days between a given date and today.

```tb
Dim TheDate As Date
Dim Msg As String
TheDate = InputBox("Enter a date")
Msg = "Days from today: " & DateDiff("d", Now, TheDate)
MsgBox Msg
```

### See Also

- [DateAdd](DateAdd), [DatePart](DatePart) functions
