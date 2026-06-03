---
title: Calendar
parent: DateTime Module
permalink: /tB/Modules/DateTime/Calendar
redirect_from:
-  /tB/Core/Calendar
vba_attribution: true
---
# Calendar
{: .no_toc }

Returns or sets a value specifying the type of calendar used by the project.

Syntax: **Calendar** [ **=** *calendartype* ]

*calendartype*
: A **VbCalendar** constant specifying the calendar type.

| Constant       | Value | Description                    |
|----------------|-------|--------------------------------|
| **vbCalGreg**  | 0     | Gregorian calendar (default).  |
| **vbCalHijri** | 1     | Hijri calendar.                |

The **Calendar** property can only be set programmatically. The setting of **Calendar** affects the string returned by the [**Date$**](Date#date-1) property when the calendar is set to Hijri.

### Example

This example sets the calendar type to Hijri.

```tb
Calendar = vbCalHijri
```

### See Also

- [Date](Date) property
