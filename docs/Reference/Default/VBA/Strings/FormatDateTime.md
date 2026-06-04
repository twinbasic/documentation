---
title: FormatDateTime
parent: Strings Module
permalink: /tB/Modules/Strings/FormatDateTime
vba_attribution: true
---
# FormatDateTime
{: .no_toc }

Returns an expression formatted as a date or time.

Syntax: **FormatDateTime(** *date* [ **,** *namedFormat* ] **)**

*date*
: *required* Date expression to be formatted.

*namedFormat*
: *optional* Numeric value that indicates the date/time format used. If omitted, **vbGeneralDate** is used.

The *namedFormat* argument has the following settings:

| Constant           | Value | Description                                                                                                                                                                |
|--------------------|-------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **vbGeneralDate**  | 0     | Display a date and/or time. If there is a date part, display it as a short date. If there is a time part, display it as a long time. If present, both parts are displayed. |
| **vbLongDate**     | 1     | Display a date by using the long date format specified in the system regional settings.                                                                                    |
| **vbShortDate**    | 2     | Display a date by using the short date format specified in the system regional settings.                                                                                   |
| **vbLongTime**     | 3     | Display a time by using the time format specified in the system regional settings.                                                                                         |
| **vbShortTime**    | 4     | Display a time by using the 24-hour format (`hh:mm`).                                                                                                                      |

### Example

This example uses **FormatDateTime** to display a date value in several formats.

```tb
Dim d As Date
d = #2026-05-29#
Debug.Print FormatDateTime(d, vbLongDate)     ' e.g. "Friday, May 29, 2026"
Debug.Print FormatDateTime(d, vbShortDate)    ' e.g. "05/29/2026"
Debug.Print FormatDateTime(d, vbLongTime)     ' e.g. "12:00:00 AM"
```

### See Also

- [Format](Format), [MonthName](MonthName), [WeekdayName](WeekdayName) functions
