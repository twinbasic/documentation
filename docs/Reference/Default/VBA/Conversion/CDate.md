---
title: CDate
parent: Conversion Module
permalink: /tB/Modules/Conversion/CDate
redirect_from:
-  /tB/Core/CDate
vba_attribution: true
---
# CDate
{: .no_toc }

Coerces an expression to a **Date**.

Syntax: **CDate(** *expression* **)**

*expression*
: *required* Any valid date expression --- a date literal, a date/time string, or a number that falls within the range of acceptable dates.

The return type is **Date**.

Use the **IsDate** function to determine whether *expression* can be converted to a date or time. **CDate** recognizes date literals and time literals as well as some numbers that fall within the range of acceptable dates. When converting a number to a date, the whole-number portion is converted to a date. Any fractional part of the number is converted to a time of day, starting at midnight.

**CDate** recognizes date formats according to the system locale setting. The correct order of day, month, and year may not be determined if it is provided in a format other than one of the recognized date settings. In addition, a long date format is not recognized if it also contains the day-of-the-week string.

[**CVDate**](CVDate) is also provided for compatibility with previous versions of Visual Basic. The syntax of **CVDate** is identical to **CDate**; however, **CVDate** returns a **Variant** whose subtype is **Date** instead of an actual **Date** type.

A **Date** holds a day number from -657,434 (January 1, 100) to 2,958,465 (December 31, 9999), with the time of day as its fraction.

> [!WARNING] BETA 1010
> **CDate** of a number outside that range, or of a string that holds one, raises no error: `CDate(2958466)`, `CDate(-657435)`, `CDate(1E+300)` and `CDate("3000000")` each return a **Date** that holds the number, and **CStr**, **Format** and **Year** of it then raise error 5, *Invalid procedure call or argument*. VB6 raises error 6, *Overflow*, for the number and error 13, *Type mismatch*, for the string. Compare a day number with -657,434 and 2,958,465 before converting it, or use [**CVDate**](CVDate), which raises error 13 for a number outside the range.

<!-- errors: generated from errors/VBA.Conversion.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *expression* is a **Decimal** less than -657,434 or 2,958,466 or more |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *expression* is a string that is not a date, a time or a number (a zero-length string included), or a date after December 31, 9999 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *expression* is **Null** |

> [!NOTE] BETA 1010
> When *expression* is a **Decimal** less than -657,434 or 2,958,466 or more, VB6 raises error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

> [!NOTE] BETA 1010
> When **CDate** is given a number of another type than **Decimal** that is less than -657,434 or 2,958,466 or more, VB6 raises error [6 (`&H6`)](tb:Errors#6), *Overflow*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When **CDate** is given a string that holds a number less than -657,434 or 2,958,466 or more, VB6 raises error [13 (`&HD`)](tb:Errors#13), *Type mismatch*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses the **CDate** function to convert a string to a **Date**. In general, hard-coding dates and times as strings (as shown in this example) is not recommended. Use date literals and time literals, such as `#2/12/1969#` and `#4:45:23 PM#`, instead.

```tb check_build
Dim MyDate, MyShortDate, MyTime, MyShortTime
MyDate = "February 12, 1969"             ' Define date.
MyShortDate = CDate(MyDate)              ' Convert to Date data type.

MyTime = "4:35:47 PM"                    ' Define time.
MyShortTime = CDate(MyTime)              ' Convert to Date data type.
```

### See Also

- [CVDate](CVDate), [DateValue](../DateTime/DateValue), [TimeValue](../DateTime/TimeValue) functions
