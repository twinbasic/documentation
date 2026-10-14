---
title: cDialogDateTime
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogDateTime
has_toc: false
---

# cDialogDateTime class
{: .no_toc }

A **cDialogDateTime** holds a date and a time, asks the user for new values in a box with one line of text, and formats and calculates with them. The box is the **InputBox** of the run-time library: the class has no calendar or clock control, and the user types the date and the time.

A **cDialogDateTime** is made with **New**: `Dim picker As New cDialogDateTime`. It cannot be made with **CreateObject**. A new object holds the date and time of the computer's clock.

[**ShowDialog**](#showdialog) opens the box and reads what the user typed, [**ShowDatePicker**](#showdatepicker) and [**ShowTimePicker**](#showtimepicker) ask for a date alone or a time alone. The parts are read and written through [**Year**](#year), [**Month**](#month), [**Day**](#day), [**Hour**](#hour), [**Minute**](#minute) and [**Second**](#second), or as one value through [**DateValue**](#datevalue), [**TimeValue**](#timevalue) and [**DateTimeValue**](#datetimevalue). [**FormatDate**](#formatdate), [**FormatTime**](#formattime) and [**FormatDateTime**](#formatdatetime) return text, and [**AddDays**](#adddays), [**AddHours**](#addhours), [**SetNow**](#setnow) and [**SetToday**](#settoday) change the value.

```tb check_build
Dim picker As New cDialogDateTime

picker.Title = "Appointment"
picker.Prompt = "When should the meeting start?"
picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(9, 0, 0)

If picker.ShowDialog() Then
    Debug.Print picker.FormatDateTime()
Else
    Debug.Print "Cancelled"
End If
```

## What the box shows and accepts

The box has the title [**Title**](#title) and the text [**Prompt**](#prompt), a blank line, a line that names the format (`Enter date and time:`, `Enter date (MM/DD/YYYY):` or `Enter time (HH:MM):`, with `HH:MM AM/PM` when [**Is24HourFormat**](#is24hourformat) is **False**), a blank line and `Year range:` with [**MinYear**](#minyear) and [**MaxYear**](#maxyear). The edit box holds the current value as [**FormatDateTime**](#formatdatetime) gives it, such as `03/15/2026 14:05`. [**OwnerHwnd**](#ownerhwnd) has no effect, because the box has no owner.

The class reads the text like this:

- The text is trimmed and cut at its first space. What is before the space is the date, what is after it is the time.
- Without a space, the whole text is the time in the time mode, the date in the date mode, and in the date-and-time mode a date when it contains a `/` or a `-`, otherwise a time.
- A date is month, day and year in that order, separated by `/` or `-`, whatever the settings of Windows are. The month must be 1 to 12, the day must exist in the month, and the year must lie in the range [**MinYear**](#minyear) to [**MaxYear**](#maxyear).
- A time is hour, minute and optionally second, separated by `:`, with the hour 0 to 23, the minute and the second 0 to 59. Seconds are read whether [**ShowSeconds**](#showseconds) is set or not. `AM` or `PM` after the time is read whether [**Is24HourFormat**](#is24hourformat) is set or not: 12 AM is hour 0, and 1 to 11 PM are 13 to 23.
- A part that is not typed keeps its value, so `11/12/2028` changes only the date, and `23:59` only the hour and minute.

The result of [**ShowDialog**](#showdialog) is **False** when the user cancelled or typed a value that fails these rules, which also shows a second box, `Invalid date/time format. Please use:` followed by the text that the edit box offered. The result is **True** when the user pressed OK, and that includes an empty entry and text without a recognisable part (`hello` or `1/2`): such text changes nothing.

> [!WARNING] 1.1.0.0
> When the text fails the check, the parts that the class has already read stay in the object. After `13/45/2026`, [**Month**](#month) is 13 and [**Day**](#day) is 45; after `02/30/2026`, **Day** is 30 in February; after `25:61`, [**Hour**](#hour) is 25 and [**Minute**](#minute) is 61; after `04/05/2027 25:00` the date is 5 April 2027 and the hour is 25. [**ShowDialog**](#showdialog) returns **False** and [**Cancelled**](#cancelled) is **True**, yet the object does not hold the value it held before. The setters of the parts, which refuse such values, are bypassed. A program that carries on with the object after a **False** result reads wrong values. Copy [**DateTimeValue**](#datetimevalue) before the call and restore it when the call returns **False**.

> [!WARNING] 1.1.0.0
> A time with `AM` or `PM` and no date in front of it is not read correctly. `9:30 PM` is cut at its space into the date `9:30` and the time `PM` and rejected, so the offered text of the time mode with [**Is24HourFormat**](#is24hourformat) **False** (`02:05 PM`) is rejected when the user presses OK without changing it. `9:30pm`, with no space, is accepted and read as 21:03, because the class removes three characters from the end of the text and the third is a digit of the minutes. With a date in front, `03/15/2026 9:30 PM` is read correctly. Typing the time with a 24-hour clock (`21:30`) works in every mode.

```tb check_build
Dim picker As New cDialogDateTime
Dim before As Date

before = picker.DateTimeValue
If Not picker.ShowDialog() Then
    ' The object may hold parts that were read before the entry was refused.
    picker.DateTimeValue = before
End If
```

## Properties

### Cancelled
{: .no_toc }

Whether the last box was cancelled, read-only.

Syntax: *object*.**Cancelled** **As Boolean**

**False** in a new object and after a box that the user closed with OK. **True** after Cancel, and after an entry that was refused, as [above](#what-the-box-shows-and-accepts) describes. [**Reset**](#reset) sets it to **False**.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.Cancelled    ' False
```

### CustomFormat
{: .no_toc }

The pattern that [**FormatDate**](#formatdate) uses for **Custom**.

Syntax: *object*.**CustomFormat** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

Only [**FormatDate**](#formatdate) with the argument **Custom** reads it. [**FormatDateTime**](#formatdatetime) and the box ignore it.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.CustomFormat = "DD.MM.YYYY"
Debug.Print picker.CustomFormat    ' DD.MM.YYYY
```

### DateTimeValue
{: .no_toc }

The date and the time together.

Syntax: *object*.**DateTimeValue** [ **=** *value* ]

*value*
: A **Date**.

Reading returns [**DateValue**](#datevalue) plus [**TimeValue**](#timevalue). Setting sets all six parts. The value is not checked against [**MinYear**](#minyear) and [**MaxYear**](#maxyear).

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(14, 5, 9)
Debug.Print Format$(picker.DateTimeValue, "yyyy-mm-dd hh:nn:ss")    ' 2026-03-15 14:05:09
Debug.Print picker.Year                                             ' 2026
Debug.Print picker.Second                                           ' 9
```

### DateValue
{: .no_toc }

The date.

Syntax: *object*.**DateValue** [ **=** *value* ]

*value*
: A **Date**. Only its date part is used.

Reading returns the date at midnight, built from [**Year**](#year), [**Month**](#month) and [**Day**](#day). Setting sets the three parts, without checking them against [**MinYear**](#minyear) and [**MaxYear**](#maxyear).

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2027, 7, 4)
Debug.Print picker.Month                              ' 7
Debug.Print Format$(picker.DateValue, "yyyy-mm-dd")   ' 2027-07-04
```

### Day
{: .no_toc }

The day of the month.

Syntax: *object*.**Day** [ **=** *value* ]

*value*
: A **Long** from 1 to the number of days of the current [**Month**](#month) and [**Year**](#year).

A value outside that range is ignored, without an error. To enter a date, set [**Year**](#year) and [**Month**](#month) first, or use [**DateValue**](#datevalue).

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 2, 10)
picker.Day = 30                 ' no such day in February 2026: ignored
Debug.Print picker.Day          ' 10
picker.Day = 28
Debug.Print picker.Day          ' 28
```

### Hour
{: .no_toc }

The hour, in the 24-hour clock.

Syntax: *object*.**Hour** [ **=** *value* ]

*value*
: A **Long** from 0 to 23. Another value is ignored, without an error.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Hour = 18
Debug.Print picker.Hour    ' 18
picker.Hour = 24           ' ignored
Debug.Print picker.Hour    ' 18
```

### Is24HourFormat
{: .no_toc }

Whether the offered time is written in the 24-hour clock.

Syntax: *object*.**Is24HourFormat** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

With **False**, [**FormatTime**](#formattime) and the text that the box offers write `02:05 PM` for 14:05, and the time mode names `HH:MM AM/PM`. The box reads either form of a time, as [above](#what-the-box-shows-and-accepts) describes.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Hour = 14
picker.Minute = 5
Debug.Print picker.FormatTime()    ' 14:05
picker.Is24HourFormat = False
Debug.Print picker.FormatTime()    ' 02:05 PM
```

### MaxYear
{: .no_toc }

The last year that the box accepts.

Syntax: *object*.**MaxYear** [ **=** *value* ]

*value*
: A **Long**. The default is 2100.

Limits the year typed in the box and the value of [**Year**](#year). The box names the range. [**DateValue**](#datevalue) and [**DateTimeValue**](#datetimevalue) do not check it.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.MaxYear    ' 2100
picker.MaxYear = 2050
picker.Year = 2060            ' above MaxYear: ignored
Debug.Print picker.Year = 2060    ' False
```

### MinYear
{: .no_toc }

The first year that the box accepts.

Syntax: *object*.**MinYear** [ **=** *value* ]

*value*
: A **Long**. The default is 1900.

Limits the year typed in the box and the value of [**Year**](#year), as [**MaxYear**](#maxyear) does for the last year.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.MinYear    ' 1900
picker.Year = 1850            ' below MinYear: ignored
Debug.Print picker.Year = 1850    ' False
```

### Minute
{: .no_toc }

The minute.

Syntax: *object*.**Minute** [ **=** *value* ]

*value*
: A **Long** from 0 to 59. Another value is ignored, without an error.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Minute = 45
Debug.Print picker.Minute    ' 45
picker.Minute = 60           ' ignored
Debug.Print picker.Minute    ' 45
```

### Mode
{: .no_toc }

What the box asks for.

Syntax: *object*.**Mode** [ **=** *value* ]

*value*
: A [**PickerMode**](#pickermode) member. The default is **DateTime**.

[**ShowDatePicker**](#showdatepicker) and [**ShowTimePicker**](#showtimepicker) set it to **DateOnly** and **TimeOnly**, and it stays so for the following calls. It also decides what [**FormatDateTime**](#formatdatetime) returns.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.Mode = PickerMode.DateTime    ' True
picker.Mode = PickerMode.TimeOnly
Debug.Print picker.Mode                          ' 2
```

### Month
{: .no_toc }

The month.

Syntax: *object*.**Month** [ **=** *value* ]

*value*
: A **Long** from 1 to 12. Another value is ignored, without an error.

When the current [**Day**](#day) does not exist in the new month, it is lowered to the last day of the month.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 1, 31)
picker.Month = 2
Debug.Print picker.Day      ' 28
picker.Month = 13           ' ignored
Debug.Print picker.Month    ' 2
```

### OwnerHwnd
{: .no_toc }

A window handle that has no effect.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

*value*
: A **LongPtr**. The default is 0.

The value is stored, but the box does not use it: it has no owner, and [**Reset**](#reset) does not change it.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.OwnerHwnd    ' 0
```

### Prompt
{: .no_toc }

The first text of the box.

Syntax: *object*.**Prompt** [ **=** *value* ]

*value*
: A **String**. The default is `Please select a date and time:`.

The class adds the line that names the format and the year range below this text.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.Prompt    ' Please select a date and time:
```

### Second
{: .no_toc }

The second.

Syntax: *object*.**Second** [ **=** *value* ]

*value*
: A **Long** from 0 to 59. Another value is ignored, without an error.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Second = 30
Debug.Print picker.Second    ' 30
picker.Second = 75           ' ignored
Debug.Print picker.Second    ' 30
```

### ShowSeconds
{: .no_toc }

Whether the offered time has seconds.

Syntax: *object*.**ShowSeconds** [ **=** *value* ]

*value*
: A **Boolean**. The default is **False**.

With **True**, [**FormatTime**](#formattime) and the text that the box offers write the seconds, `14:05:09` or `02:05:09 PM`. The box reads seconds whatever this property is.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.TimeValue = TimeSerial(14, 5, 9)
Debug.Print picker.FormatTime()    ' 14:05
picker.ShowSeconds = True
Debug.Print picker.FormatTime()    ' 14:05:09
```

### TimeValue
{: .no_toc }

The time of day.

Syntax: *object*.**TimeValue** [ **=** *value* ]

*value*
: A **Date**. Only its time part is used.

Reading returns the time on 30 December 1899, built from [**Hour**](#hour), [**Minute**](#minute) and [**Second**](#second). Setting sets the three parts.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.TimeValue = TimeSerial(8, 30, 15)
Debug.Print picker.Hour                            ' 8
Debug.Print Format$(picker.TimeValue, "hh:nn:ss")  ' 08:30:15
```

### Title
{: .no_toc }

The title of the box.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**. The default is `Select Date and Time`.

The box that reports a refused entry has the same title. [**ShowDatePicker**](#showdatepicker) and [**ShowTimePicker**](#showtimepicker) set it.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.Title    ' Select Date and Time
```

### Year
{: .no_toc }

The year.

Syntax: *object*.**Year** [ **=** *value* ]

*value*
: A **Long** from [**MinYear**](#minyear) to [**MaxYear**](#maxyear). Another value is ignored, without an error.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Year = 2030
Debug.Print picker.Year    ' 2030
picker.Year = 2200         ' above MaxYear: ignored
Debug.Print picker.Year    ' 2030
```

## Methods

### AddDays
{: .no_toc }

Moves the date by a number of days.

Syntax: *object*.**AddDays** ( *days* )

*days*
: *required* A **Long**, negative to move back.

The time of day does not change. A result after 31 December 9999 raises error 13 (*Type mismatch*).

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 15)
picker.AddDays 20
Debug.Print Format$(picker.DateValue, "yyyy-mm-dd")    ' 2026-04-04
picker.AddDays -35
Debug.Print Format$(picker.DateValue, "yyyy-mm-dd")    ' 2026-02-28
```

### AddHours
{: .no_toc }

Moves the time by a number of hours, carrying over into the date.

Syntax: *object*.**AddHours** ( *hours* )

*hours*
: *required* A **Long**, negative to move back.

Adds the hours to the time of day, and moves the date forward or back by the days that this passes.

> [!NOTE] 1.1.0.0
> The class works in seconds in a **Long**, so a value of about 596,000 hours (68 years) or more, in either direction, raises error 6 (*Overflow*). The date and time are left as they were.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(14, 5, 9)
picker.AddHours 10
Debug.Print Format$(picker.DateTimeValue, "yyyy-mm-dd hh:nn:ss")    ' 2026-03-16 00:05:09
picker.AddHours -15
Debug.Print Format$(picker.DateTimeValue, "yyyy-mm-dd hh:nn:ss")    ' 2026-03-15 09:05:09
```

### FormatDate
{: .no_toc }

Returns the date as text.

Syntax: *object*.**FormatDate** ( [ *formatType* ] ) **As String**

*formatType*
: *optional* A [**DateFormat**](#dateformat) member. The default is **ShortDate**.

**ShortDate** gives `03/15/2026`, with month, day and year in that order. **LongDate** gives `Sunday, March 15, 2026`, in English whatever the language of Windows is. **Custom** gives the text of [**CustomFormat**](#customformat) in which these patterns are replaced, in this order: `YYYY` (four digits), `YY` (two digits), `MMMM` (the month's name), `MMM` (its first three letters), `MM` (two digits), `M`, `DD` (two digits) and `D`. With an empty [**CustomFormat**](#customformat), **Custom** gives the short date.

> [!WARNING] 1.1.0.0
> The patterns are replaced one after the other in the text that is being built, so the letters `M` and `D` of a month's name, which `MMMM` and `MMM` have just put in, are replaced as well. **March** and **May** lose their first letter to the number of the month (`3arch`, `5ay`) and **December** its first letter to the number of the day (`15ecember`). No error is raised. The same happens to any other `Y`, `M` or `D` in the format, which is not kept as a literal character. Formats with `MMMM` or `MMM` are right only for the other months.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 15)
Debug.Print picker.FormatDate()                  ' 03/15/2026
Debug.Print picker.FormatDate(DateFormat.LongDate)    ' Sunday, March 15, 2026

picker.CustomFormat = "YYYY-MM-DD"
Debug.Print picker.FormatDate(DateFormat.Custom)      ' 2026-03-15
picker.CustomFormat = "D.M.YY"
Debug.Print picker.FormatDate(DateFormat.Custom)      ' 15.3.26
picker.CustomFormat = "MMMM D, YYYY"
Debug.Print picker.FormatDate(DateFormat.Custom)      ' 3arch 15, 2026
```

### FormatDateTime
{: .no_toc }

Returns the value as the box offers it.

Syntax: *object*.**FormatDateTime** ( ) **As String**

Depends on [**Mode**](#mode): **DateOnly** gives [**FormatDate**](#formatdate), **TimeOnly** gives [**FormatTime**](#formattime), and **DateTime** gives the two with a space between, such as `03/15/2026 14:05`. It always uses the short date, never the long or the custom one.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(14, 5, 9)
Debug.Print picker.FormatDateTime()    ' 03/15/2026 14:05
picker.Mode = PickerMode.DateOnly
Debug.Print picker.FormatDateTime()    ' 03/15/2026
picker.Mode = PickerMode.TimeOnly
Debug.Print picker.FormatDateTime()    ' 14:05
```

### FormatTime
{: .no_toc }

Returns the time as text.

Syntax: *object*.**FormatTime** ( ) **As String**

Returns `HH:MM` in the 24-hour clock, or `hh:MM AM` or `hh:MM PM` when [**Is24HourFormat**](#is24hourformat) is **False**, with `:SS` after the minutes when [**ShowSeconds**](#showseconds) is **True**. Midnight is `12:00 AM`.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.TimeValue = TimeSerial(14, 5, 9)
picker.Is24HourFormat = False
picker.ShowSeconds = True
Debug.Print picker.FormatTime()    ' 02:05:09 PM
picker.TimeValue = TimeSerial(0, 30, 0)
Debug.Print picker.FormatTime()    ' 12:30:00 AM
```

### GetDayOfWeek
{: .no_toc }

Returns the weekday of the date.

Syntax: *object*.**GetDayOfWeek** ( ) **As Long**

Returns 0 for Sunday to 6 for Saturday.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 15)
Debug.Print picker.GetDayOfWeek()    ' 0
```

### GetDayOfWeekName
{: .no_toc }

Returns the name of the weekday of the date.

Syntax: *object*.**GetDayOfWeekName** ( ) **As String**

Returns `Sunday` to `Saturday`, in English.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 16)
Debug.Print picker.GetDayOfWeekName()    ' Monday
```

### GetDaysInMonth
{: .no_toc }

Returns the number of days in a month.

Syntax: *object*.**GetDaysInMonth** ( *year* , *month* ) **As Long**

*year*
: *required* A **Long**. It matters for February: leap years have 29 days.

*month*
: *required* A **Long** from 1 to 12. For another value the result is 0.

The method does not use the date of the object.

```tb check_build check_run
Dim picker As New cDialogDateTime

Debug.Print picker.GetDaysInMonth(2024, 2)    ' 29
Debug.Print picker.GetDaysInMonth(1900, 2)    ' 28
Debug.Print picker.GetDaysInMonth(2026, 4)    ' 30
Debug.Print picker.GetDaysInMonth(2026, 13)   ' 0
```

### GetMonthName
{: .no_toc }

Returns the English name of a month.

Syntax: *object*.**GetMonthName** ( [ *month* ] ) **As String**

*month*
: *optional* A **Long** from 1 to 12. Omitted or 0, the month of the object is used. For another value the result is an empty string.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 15)
Debug.Print picker.GetMonthName()      ' March
Debug.Print picker.GetMonthName(12)    ' December
Debug.Print Len(picker.GetMonthName(13))    ' 0
```

### Reset
{: .no_toc }

Restores the starting values.

Syntax: *object*.**Reset**

Sets the date and time to the clock of the computer, [**Title**](#title) and [**Prompt**](#prompt) to their defaults, [**Mode**](#mode) to **DateTime**, [**MinYear**](#minyear) and [**MaxYear**](#maxyear) to 1900 and 2100, [**ShowSeconds**](#showseconds) to **False**, [**Is24HourFormat**](#is24hourformat) to **True**, [**CustomFormat**](#customformat) to an empty string and [**Cancelled**](#cancelled) to **False**. [**OwnerHwnd**](#ownerhwnd) is left as it is.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Title = "Meeting"
picker.Mode = PickerMode.DateOnly
picker.Reset
Debug.Print picker.Title                        ' Select Date and Time
Debug.Print picker.Mode = PickerMode.DateTime   ' True
```

### SetNow
{: .no_toc }

Sets the value to the clock of the computer.

Syntax: *object*.**SetNow**

Sets the six parts to the local date and time, with the seconds.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.Year = 2000
picker.SetNow
Debug.Print picker.Year = Year(Date)    ' True
```

### SetToday
{: .no_toc }

Sets the value to today at midnight.

Syntax: *object*.**SetToday**

Sets the date to today's and the hour, minute and second to 0.

```tb check_build check_run
Dim picker As New cDialogDateTime

picker.SetToday
Debug.Print picker.Hour + picker.Minute + picker.Second    ' 0
Debug.Print picker.Day = Day(Date)                         ' True
```

### ShowDatePicker
{: .no_toc }

Asks for a date.

Syntax: *object*.**ShowDatePicker** ( [ *title* ] ) **As Boolean**

*title*
: *optional* The title of the box. The default is `Select Date`.

Sets [**Title**](#title) and sets [**Mode**](#mode) to **DateOnly**, then calls [**ShowDialog**](#showdialog) and returns its result. Both properties keep the new values afterwards.

```tb check_build
Dim picker As New cDialogDateTime

picker.DateValue = DateSerial(2026, 3, 15)
If picker.ShowDatePicker("Birthday") Then
    Debug.Print picker.FormatDate(DateFormat.LongDate)
End If
```

### ShowDialog
{: .no_toc }

Asks for a date and a time, or the part that [**Mode**](#mode) names.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Opens the box that [above](#what-the-box-shows-and-accepts) describes, waits until it is closed, and reads the text. Returns **True** when the user pressed OK, **False** when the user cancelled or the text was refused; [**Cancelled**](#cancelled) is the opposite. The warnings in that section apply.

```tb check_build
Dim picker As New cDialogDateTime

picker.Title = "Start of the shift"
picker.Is24HourFormat = False
picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(8, 0, 0)

If picker.ShowDialog() Then
    Debug.Print "Shift starts " & picker.FormatDateTime()
End If
```

### ShowTimePicker
{: .no_toc }

Asks for a time.

Syntax: *object*.**ShowTimePicker** ( [ *title* ] ) **As Boolean**

*title*
: *optional* The title of the box. The default is `Select Time`.

Sets [**Title**](#title) and sets [**Mode**](#mode) to **TimeOnly**, then calls [**ShowDialog**](#showdialog) and returns its result. With [**Is24HourFormat**](#is24hourformat) **False**, the warning [above](#what-the-box-shows-and-accepts) about `AM` and `PM` applies to every entry.

```tb check_build
Dim picker As New cDialogDateTime

picker.TimeValue = TimeSerial(7, 30, 0)
If picker.ShowTimePicker("Alarm") Then
    Debug.Print picker.FormatTime()
End If
```

## Enumerations

### PickerMode
{: .no_toc }

What the box asks for, for [**Mode**](#mode).

| Member | Value | Meaning |
|---|---|---|
| **DateTime** | 0 | A date and a time |
| **DateOnly** | 1 | A date |
| **TimeOnly** | 2 | A time |

### DateFormat
{: .no_toc }

The forms of [**FormatDate**](#formatdate).

| Member | Value | Meaning |
|---|---|---|
| **ShortDate** | 0 | `MM/DD/YYYY` |
| **LongDate** | 1 | `Sunday, March 15, 2026` |
| **Custom** | 2 | The pattern in [**CustomFormat**](#customformat) |

## Example

This example asks for the start of a meeting, keeps the previous value when the entry is refused, and prints the end two hours later.

```tb check_build
Dim picker As New cDialogDateTime
Dim before As Date

picker.Title = "Meeting"
picker.Prompt = "When does the meeting start?"
picker.DateTimeValue = DateSerial(2026, 3, 15) + TimeSerial(10, 0, 0)
before = picker.DateTimeValue

If picker.ShowDialog() Then
    picker.AddHours 2
    Debug.Print "Ends " & picker.FormatDateTime()
Else
    picker.DateTimeValue = before
    Debug.Print "Kept " & picker.FormatDateTime()
End If
```

## See Also

- [cDialogInputBox](cDialogInputBox) class -- asks for one line of text
- [cDialogCountdownMsgBox](cDialogCountdownMsgBox) class -- shows a message box that closes by itself
- [TBMANLIB_Dialog](.) package -- overview
