---
title: DateAdd
parent: DateTime Module
permalink: /tB/Modules/DateTime/DateAdd
redirect_from:
-  /tB/Core/DateAdd
vba_attribution: true
---
# DateAdd
{: .no_toc }

Returns a **Variant** (**Date**) containing a date to which a specified time interval has been added.

Syntax: **DateAdd** ( *interval*, *number*, *date* )

*interval*
: *required* String expression that is the interval of time to add. See [Interval settings](#interval-settings).

*number*
: *required* Numeric expression for the number of intervals to add. It can be positive (to get dates in the future) or negative (to get dates in the past).

*date*
: *required* **Variant** (**Date**) or literal representing the date to which the interval is added.

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

To add days to *date*, you can use Day of Year ("y"), Day ("d"), or Weekday ("w").

> [!NOTE]
> When you use the "w" interval to add days to a date, **DateAdd** adds the total number of days that you specified, not just workdays (Monday through Friday).

**DateAdd** won't return an invalid date. The following example adds one month to January 31:

```tb
DateAdd("m", 1, "31-Jan-95")
```

In this case, **DateAdd** returns 28-Feb-95, not 31-Feb-95. If *date* is 31-Jan-96, it returns 29-Feb-96 because 1996 is a leap year.

If the calculated date would precede the year 100, an error occurs.

If *number* isn't a **Long** value, it is rounded to the nearest whole number before being evaluated.

The format of the return value is determined by **Control Panel** settings, not by the format passed in the *date* argument.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied date must be Gregorian. If the calendar is Hijri, the supplied date must be Hijri.

### Example

This example takes a date and, using the **DateAdd** function, displays a corresponding date a specified number of months in the future.

```tb
Dim FirstDate As Date
Dim IntervalType As String
Dim Number As Integer
IntervalType = "m"    ' "m" specifies months as interval.
FirstDate = InputBox("Enter a date")
Number = InputBox("Enter number of months to add")
MsgBox "New date: " & DateAdd(IntervalType, Number, FirstDate)
```

### See Also

- [DateDiff](DateDiff), [DatePart](DatePart) functions
