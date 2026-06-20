---
title: DateSerial
parent: DateTime Module
permalink: /tB/Modules/DateTime/DateSerial
redirect_from:
-  /tB/Core/DateSerial
vba_attribution: true
---
# DateSerial
{: .no_toc }

Returns a **Variant** (**Date**) for a specified year, month, and day.

Syntax: **DateSerial** ( *year*, *month*, *day* )

*year*
: *required* **Integer**. Number between 100 and 9999, inclusive, or a numeric expression.

*month*
: *required* **Integer**. Any numeric expression.

*day*
: *required* **Integer**. Any numeric expression.

To specify a date, such as December 31, 1991, the range of numbers for each **DateSerial** argument should be in the accepted range for the unit (1--31 for days, 1--12 for months). Relative dates can also be specified for each argument by using any numeric expression that represents some number of days, months, or years before or after a certain date.

The following example uses numeric expressions instead of absolute date numbers. The **DateSerial** function returns a date that is the day before the first day (`1 - 1`), two months before August (`8 - 2`), 10 years before 1990 (`1990 - 10`) --- in other words, May 31, 1980.

When any argument exceeds the accepted range, it increments to the next larger unit as appropriate. For example, 35 days is evaluated as one month and some number of days, depending on where in the year it is applied. If any single argument is outside the range -32,768 to 32,767, an error occurs. If the date specified by the three arguments falls outside the acceptable range of dates, an error occurs.

Two-digit years for the *year* argument are interpreted based on user-defined machine settings. The default settings are that values between 0 and 29 are interpreted as the years 2000--2029, and values between 30 and 99 are interpreted as the years 1930--1999. For all other *year* arguments, use a four-digit year.

If the [**Calendar**](Calendar) property setting is Gregorian, the supplied value is assumed to be Gregorian. If the setting is Hijri, the supplied value is assumed to be Hijri, and two-digit *year* values between 0 and 99 are interpreted as the years 1400--1499.

### Example

This example uses the **DateSerial** function to return the date for the specified year, month, and day.

```tb
Dim MyDate
MyDate = DateSerial(1969, 2, 12)    ' Returns February 12, 1969.
```

### See Also

- [DateValue](DateValue), [Day](Day), [Month](Month), [Year](Year) functions
