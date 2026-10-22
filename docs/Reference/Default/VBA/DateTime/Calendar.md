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

> [!NOTE] BETA 1010
> twinBASIC has not implemented **Calendar** yet. The compiler warns TB0009 at each use, **Calendar** always reads as **vbCalGreg**, and setting it raises an error, **vbCalGreg** included.

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *calendartype* is **vbCalGreg** or **vbCalHijri**<br>*calendartype* is any other value |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *calendartype* is **Null** |

> [!NOTE] BETA 1010
> When *calendartype* is **vbCalGreg** or **vbCalHijri**, VB6 raises no error.

> [!NOTE] BETA 1010
> When *calendartype* is any other value, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example sets the calendar type to Hijri.

```tb check_build
Calendar = vbCalHijri
```

### See Also

- [Date](Date) property
