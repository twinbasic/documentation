---
title: Date
parent: Data Types
grand_parent: Reference Section
nav_order: 11
permalink: /tB/Core/Date-Type
vba_attribution: true
---

# Date
{: .no_toc }

A date and a time of day, from January 1, 100 to December 31, 9999.

Syntax:

- [**Dim**](Dim) *varname* **As Date** [ **=** *expression* ]
- [**DefDate**](Deftype) *letterrange*

A **Date** variable is declared **As Date**. [**DefDate**](Deftype) makes **Date** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **Date** has no type-declaration character. A **Date** that is not given a value holds 0, which is midnight at the start of December 30, 1899.

The [**Date**](../Modules/DateTime/Date) and [**Time**](../Modules/DateTime/Time) functions return the current date and time, and [**Now**](../Modules/DateTime/Now) returns both in a **Date**. The **Variant** subtype for a **Date** is **vbDate** (7), and [**TypeName**](../Modules/Information/TypeName) gives `Date`.

## Storage and range

A **Date** is stored in 8 bytes as a **Double**. The integer part counts days from December 30, 1899, which is day 0: day 1 is December 31, 1899, and the days before it are negative. The fraction is the time of day, 0.5 being noon. January 1, 100 is day -657,434, and December 31, 9999 is day 2,958,465 plus the time of day. A **Date** has the same size in a 32-bit and a 64-bit build.

A number or a date outside that range cannot be a **Date**, and an assignment, a conversion or an addition that would make one raises error 6, *Overflow*.

> [!WARNING] BETA 1010
> A **Date** outside the range is accepted with no error: `d = 2958466`, `CDate(-657435)`, `#12/31/9999# + 1` and an assignment of `1E+300` each store the number, and **CStr**, **Format** and **Year** of the value then raise error 5, *Invalid procedure call or argument*. VB6 raises error 6, *Overflow*, at the assignment. Compare a day number with -657,434 and 2,958,465 before assigning it to a **Date**.

A **Date** prints, and is converted to a string, in the short date and time formats of the regional settings of the computer that runs the program. To get the same text on every computer, give [**Format**](../Modules/Strings/Format) a format string such as `"yyyy-mm-dd hh:nn:ss"`.

```tb check_run
Dim Moment As Date
Debug.Print CDbl(Moment)            ' 0
Debug.Print LenB(Moment)            ' 8
Debug.Print TypeName(Moment)        ' Date
Debug.Print VarType(Moment) = vbDate ' True
Debug.Print Format(Moment, "yyyy-mm-dd hh:nn:ss") ' 1899-12-30 00:00:00
Debug.Print CDbl(#1/1/100#)         ' -657434
Debug.Print CDbl(#12/31/9999#)      ' 2958465
```

## Date literals

A date literal is a date, a time of day, or both, written between number signs (`#`). Its type is **Date**, and its value is fixed when the project is compiled: the executable holds the number, not the text, so the regional settings of the machine that runs the program do not affect it.

```tb check_build
Dim Deadline As Date = #2026-03-17#          ' March 17, 2026
Dim Reminder As Date = #1:45 PM#             ' 1:45 PM on December 30, 1899, which is day 0
Dim Meeting As Date = #3/17/2026 13:45:30#   ' March 17, 2026, 1:45:30 PM
```

The date can be written month first with `/` or `-` between the parts (`#3/17/2026#`, `#3-17-2026#`), year first (`#2026-03-17#`, `#2026/3/17#`), or with an English month name (`#Mar 17, 2026#`, `#17 March 2026#`). The time can be 24-hour (`#13:45#`, `#13:45:30#`) or 12-hour with `AM` or `PM` in either case (`#1:45 PM#`, `#1:45 pm#`). A literal with both puts a space between the date and the time. A time on its own has the date part December 30, 1899.

The compiler reads the parts in the same order whatever the regional format of the machine that compiles the project. These results were checked under English (United States) and under English (United Kingdom), whose short dates put the month and the day in opposite orders:

- `#1/2/2026#` is January 2, 2026, under both: the first number is always the month.
- When the first number cannot be a month, the first two numbers are swapped: `#13/1/2026#` is January 13, 2026. So a day-first literal compiles without a diagnostic, and is read correctly only when its day is 13 or more.
- A two-digit year was placed between 1950 and 2049, the range the machine's Windows settings specify for two-digit years: `#1/2/49#` is 2049, and `#1/2/50#` is 1950.
- A literal with no year, such as `#1/2#`, takes the year in which the project is compiled.
- A literal that is not a real date or time is a compile error, *TB5085 bad date*: `#2/29/2026#`, `#2/30/2026#`, `#24:00#` and `#13:60#` are all refused. So are fractional seconds (`#13:45:30.5#`), a `T` between the date and the time (`#2026-01-02T13:45:30#`), and, under English (United States), dots between the parts of a date (`#1.2.2026#`).

> [!NOTE]
> A date literal and [**CDate**](../Modules/Conversion/CDate) can read the same text differently. The literal is read month first, when the project is compiled; **CDate** reads a string in the order of the regional format of the machine the program runs on. Under English (United Kingdom), `#1/2/2026#` is January 2 and `CDate("1/2/2026")` is February 1. Written year first, `#2026-01-02#` and `CDate("2026-01-02")` are January 2 under both formats.

## Conversions

[**CDate**](../Modules/Conversion/CDate) converts an expression to a **Date**, and so does assigning one to a **Date** variable. A number is read as a count of days from the epoch, with the fraction as the time of day, and negative numbers are before December 30, 1899: `CDate(1.5)` is noon on December 31, 1899. A string is read as a date, a time or both, in the formats of the regional settings; a string in year-month-day order is read the same everywhere. A time on its own has the date part December 30, 1899. **Empty** becomes day 0 and `True` becomes day -1. A string that is not a date, and an empty string, raise error 13, *Type mismatch*; **Null** raises error 94, *Invalid use of Null*.

A **Date** converted to a number gives its day count: [**CDbl**](../Modules/Conversion/CDbl) keeps the time of day as a fraction, and [**CLng**](../Modules/Conversion/CLng) rounds to the nearest day, with halves going to the even day.

```tb check_run
Const Stamp As String = "yyyy-mm-dd hh:nn:ss"
Debug.Print Format(CDate(0), Stamp)                     ' 1899-12-30 00:00:00
Debug.Print Format(CDate(1.5), Stamp)                   ' 1899-12-31 12:00:00
Debug.Print Format(CDate(-1.5), Stamp)                  ' 1899-12-29 12:00:00
Debug.Print Format(CDate("2026-03-17 13:45:30"), Stamp) ' 2026-03-17 13:45:30
Debug.Print Format(CDate("13:45"), Stamp)               ' 1899-12-30 13:45:00
Debug.Print CDbl(#3/17/2026#)                           ' 46098
Debug.Print CLng(#3/17/2026 6:00 PM#)                   ' 46099
On Error Resume Next
Debug.Print CDate("not a date")
Debug.Print Err.Number                                  ' 13
```

## Arithmetic

A number added to a **Date** is a number of days, and a fraction is part of a day: adding 1 advances the date by a day and adding 0.5 by twelve hours. The result is a **Date**. Subtracting a number gives a **Date**, and subtracting one **Date** from another gives a **Double**, the number of days between them, with the time of day as a fraction. `*` and `/` treat a **Date** as a **Double** and give a **Double**. Comparison operators compare the moments in time. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

Adding a number of days cannot add a month or a year, whose lengths vary; [**DateAdd**](../Modules/DateTime/DateAdd) adds days, months, years and the other intervals.

```tb check_run
Const Stamp As String = "yyyy-mm-dd hh:nn"
Dim Start As Date = #3/17/2026 9:30 AM#
Dim Finish As Date = #3/20/2026 6:00 PM#
Debug.Print Format(Start + 1.5, Stamp)  ' 2026-03-18 21:30
Debug.Print TypeName(Start + 1)         ' Date
Debug.Print TypeName(Finish - Start)    ' Double
Debug.Print Round(Finish - Start, 4)    ' 3.3542
Debug.Print Start < Finish              ' True
Debug.Print Format(DateAdd("m", 1, Start), Stamp) ' 2026-04-17 09:30
```

## Example

This example finds how many whole days and hours there are between two moments.

```tb check_run
Dim Start As Date = #3/17/2026 9:30 AM#
Dim Finish As Date = #3/20/2026 6:00 PM#
Dim Elapsed As Double = Finish - Start
Debug.Print Int(Elapsed) & " days"                          ' 3 days
Debug.Print Round((Elapsed - Int(Elapsed)) * 24, 1) & " hours" ' 8.5 hours
Debug.Print DateDiff("d", Start, Finish)                    ' 3
```

## See Also

- [Data Types](../../Reference/Data-Types#date) -- the summary of all fourteen intrinsic types
- [CDate](../Modules/Conversion/CDate) function
- [Date](../Modules/DateTime/Date), [Time](../Modules/DateTime/Time), [Now](../Modules/DateTime/Now) -- the current date and time
- [DateAdd](../Modules/DateTime/DateAdd), [DateSerial](../Modules/DateTime/DateSerial) -- functions that build and change dates
- [Literals](../../Features/Language/Literals) -- how the compiler reads literals
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
