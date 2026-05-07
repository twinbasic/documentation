---
title: FormatDateTime
parent: Strings Module
permalink: /tB/Modules/Strings/FormatDateTime
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
| **vbLongDate**     | 1     | Display a date by using the long date format specified in your computer's regional settings.                                                                               |
| **vbShortDate**    | 2     | Display a date by using the short date format specified in your computer's regional settings.                                                                              |
| **vbLongTime**     | 3     | Display a time by using the time format specified in your computer's regional settings.                                                                                    |
| **vbShortTime**    | 4     | Display a time by using the 24-hour format (`hh:mm`).                                                                                                                      |

### See Also

- [Format](Format), [MonthName](MonthName), [WeekdayName](WeekdayName) functions

{% include VBA-Attribution.md %}
