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

To add days to *date*, use Day of Year ("y"), Day ("d"), or Weekday ("w").

> [!NOTE]
> When the "w" interval is used to add days to a date, **DateAdd** adds the total number of days specified, not just workdays (Monday through Friday).

**DateAdd** won't return an invalid date. The following example adds one month to January 31:

```tb check_build
DateAdd("m", 1, "31-Jan-95")
```

In this case, **DateAdd** returns 28-Feb-95, not 31-Feb-95. If *date* is 31-Jan-96, it returns 29-Feb-96 because 1996 is a leap year.

> [!WARNING] BETA 1010
> **DateAdd** with the "m", "q" or "yyyy" interval does not stop at the last day of a shorter month: it counts the extra days into the next month and raises no error. `DateAdd("m", 1, "31-Jan-95")` returns 3-Mar-95, `DateAdd("m", -1, #3/31/2026#)` returns 3-Mar-2026, and `DateAdd("yyyy", 1, #2/29/2024#)` returns 1-Mar-2025. VB6 returns 28-Feb-95, 28-Feb-2026 and 28-Feb-2025.

> [!WARNING] BETA 1010
> **DateAdd** with the "yyyy", "q" or "m" interval raises no error when the result would be before January 1, 100, and returns a date in the 1900s or 2000s instead: `DateAdd("yyyy", -1, #1/1/100#)` returns January 1, 1999, and `DateAdd("m", -1, #1/1/100#)` returns December 1, 1999. VB6 raises error 5.

If *number* isn't a **Long** value, it is rounded to the nearest whole number before being evaluated.

The format of the return value is determined by **Control Panel** settings, not by the format passed in the *date* argument.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied date must be Gregorian. If the calendar is Hijri, the supplied date must be Hijri.

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *interval* is not one of the settings listed<br>the result would be after December 31, 9999, or before January 1, 100 for an *interval* other than "yyyy", "q" or "m" |
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *date* is a number outside the range of dates |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *date* is a string that is not a date |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *interval* or *number* is **Null** |

> [!NOTE] BETA 1010
> When the result with an *interval* of "yyyy", "q" or "m" would be before January 1, 100, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *date* is a number outside the range of dates, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### Example

This example takes a date and, using the **DateAdd** function, displays a corresponding date a specified number of months in the future.

```tb check_build
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
