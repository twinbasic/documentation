---
title: DateTime Module
parent: Modules
permalink: /tB/Modules/DateTime/
has_toc: false
---

# DateTime module

The **DateTime** module groups together the procedures for reading the system clock, building **Date** values from their components, parsing them out of strings, taking them apart again, and shifting them forward or backward by a chosen unit. A single setting — the [**Calendar**](Calendar) property — switches the whole module between the Gregorian and Hijri calendars.

## Reading the system clock

[**Now**](Now) returns the current system date *and* time as a single **Variant** of subtype **Date**; [**Date**](Date) returns just the date portion and [**Time**](Time) just the time portion. Each of the latter two has a `$`-suffixed sibling — **Date$** and **Time$** — that returns the same value as a formatted **String** rather than a **Date**. All four are also writable: assigning to them changes the system clock, subject to the operating system's privilege requirements.

> [!NOTE]
> In twinBASIC, **Date**, **Date$**, **Time**, and **Time$** are implemented as module-level properties rather than the functions/statements they were in VBx. The syntax and semantics are otherwise unchanged.

[**Timer**](Timer) returns a **Single** giving the number of seconds — with fractional precision — elapsed since midnight, and is the conventional way to measure elapsed time within a run.

```tb
Dim Started As Single
Started = Timer
' ... do some work ...
Debug.Print "Elapsed: " & (Timer - Started) & " seconds"
```

## Building dates and times from components

[**DateSerial**](DateSerial) builds a **Date** from year, month, and day arguments; [**TimeSerial**](TimeSerial) builds one from hour, minute, and second. Both honour out-of-range arguments by carrying — passing 13 as the month rolls into the next year, and passing 75 as the minute rolls into the next hour — which makes them well-suited to expressing relative dates as plain arithmetic on the components.

```tb
Dim FirstOfNextMonth As Date
FirstOfNextMonth = DateSerial(Year(Now), Month(Now) + 1, 1)
```

[**DateValue**](DateValue) parses a date out of a string in the system's short date format — recognising both numeric forms and unambiguous month names — and discards any time portion. [**TimeValue**](TimeValue) is the corresponding parser for time strings; it discards any date portion. For values that originate as date literals in source code, the surrounding `#...#` syntax is usually a better fit than either parser.

## Extracting parts of a date

The single-component accessors each return one part of a **Date** as an **Integer**: [**Year**](Year), [**Month**](Month), [**Day**](Day), [**Weekday**](Weekday), [**Hour**](Hour), [**Minute**](Minute), and [**Second**](Second). [**DatePart**](DatePart) generalises the same idea, taking the chosen part as a string interval code (`"yyyy"`, `"q"`, `"m"`, `"d"`, ...) — useful when the unit itself is a parameter.

```tb
Dim D As Date
D = #2/12/1969#
Debug.Print Year(D)       ' 1969
Debug.Print Month(D)      ' 2
Debug.Print Day(D)        ' 12
Debug.Print Weekday(D)    ' 4 — Wednesday
```

## Date arithmetic

[**DateAdd**](DateAdd) shifts a date by a chosen number of intervals — years, quarters, months, weeks, days, hours, minutes, or seconds — taking calendar irregularities (varying month lengths, leap years) into account, and clamping to the last day of the target month when a literal day-of-month would be invalid. [**DateDiff**](DateDiff) does the inverse: it returns the count of whole intervals between two dates. Both share the same string interval codes used by **DatePart**.

```tb
Debug.Print DateAdd("m", 1, #1/31/2026#)          ' 2/28/2026 — clamped to last day of February
Debug.Print DateDiff("d", #1/1/2026#, #5/9/2026#) ' 128
```

## Calendar selection

The [**Calendar**](Calendar) property selects the calendar — **vbCalGreg** (Gregorian, the default) or **vbCalHijri** (Hijri) — used by the rest of the module. The setting controls how **Date$** formats the system date, how arguments to **DateSerial**, **DateValue**, **DateAdd**, and **DateDiff** are interpreted, and how the parts returned by **DatePart**, **Year**, **Month**, **Day**, and **Weekday** are reported.

## Members

- [Calendar](Calendar) -- returns or sets the calendar type (Gregorian or Hijri)
- [Date](Date) -- sets or returns the current system date
- [DateAdd](DateAdd) -- adds a time interval to a date
- [DateDiff](DateDiff) -- returns the number of time intervals between two dates
- [DatePart](DatePart) -- returns a specified part of a given date
- [DateSerial](DateSerial) -- returns a date for a specified year, month, and day
- [DateValue](DateValue) -- converts a string to a date
- [Day](Day) -- returns the day of the month from a date value
- [Hour](Hour) -- returns the hour of the day from a time value
- [Minute](Minute) -- returns the minute of the hour from a time value
- [Month](Month) -- returns the month of the year from a date value
- [Now](Now) -- returns the current system date and time
- [Second](Second) -- returns the second of the minute from a time value
- [Time](Time) -- sets or returns the current system time
- [Timer](Timer) -- returns the number of seconds elapsed since midnight
- [TimeSerial](TimeSerial) -- returns a time for a specific hour, minute, and second
- [TimeValue](TimeValue) -- converts a string to a time
- [Weekday](Weekday) -- returns the day of the week from a date value
- [Year](Year) -- returns the year from a date value
