---
title: Date
parent: DateTime Module
permalink: /tB/Modules/DateTime/Date
redirect_from:
-  /tB/Core/Date
vba_attribution: true
---
# Date
{: .no_toc }
{: #date-top }

> [!NOTE]
>
> In twinBASIC, **Date** and **Date$** are implemented as module-level properties, not as functions/statements like they were in VBx. This has no impact on their behavior. These properties still have the syntax and semantics of the Date and Date$ functions and statements in VBx.

## Date Property
{: #date }

The behavior of the **Date** property is unchanged by the [**Calendar**](Calendar) property setting.

### Get

{: #date-get }

Returns a **Variant** containing the current system date.

Syntax: **Date** [ **()** ]

#### Example

This example uses the **Date** property to return the current system date.

```tb check_build
Dim MyDate as Variant
MyDate = Date   ' MyDate contains the current system date.
```

### Let
{: #date-let }

Sets the current system date from a value with a Variant or Date type.

Syntax: **Date** **=** *date*

*date*
: *required* For systems running Microsoft Windows 95, the *date* specification must be a date from January 1, 1980, through December 31, 2099. For systems running Microsoft Windows NT, *date* must be a date from January 1, 1980, through December 31, 2079.

> [!IMPORTANT]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system date is a privileged operation that requires the process to have relevant permissions.

#### Example

This example uses the **Date** property to set the computer system date. In the development environment, the date literal is displayed in short date format by using the locale settings of the code.

```tb check_build
Dim MyDate As Date
MyDate = #February 12, 1985#  ' Assign a date to a variable.
Date= MyDate                  ' Change system date. 
```

## Date$ Property
{: #date-1 }

The behavior of the **Date$** property relies on the [**Calendar**](Calendar) property setting. If the calendar is Hijri, **Date$** returns or accepts a 10-character string of the form *mm-dd-yyyy*, where *mm* (01--12), *dd* (01--30) and *yyyy* (1400--1523) are the Hijri month, day, and year. The equivalent Gregorian range is Jan 1, 1980, through Dec 31, 2099.

### Get
{: #date-get-1 }

Returns a **String** containing the current system date.

Syntax: **Date$** [ **()** ]

#### Example

This example uses the **Date** property to return the current system date as a string.

```tb check_build
Dim MyDate$
MyDate = Date$  ' MyDate contains the current system date.
```

### Let
{: #date-let-1 }

Sets the current system date from a string.

Syntax: **Date$** **=** *date*

*date*
: *required* For systems running Microsoft Windows 95, the *date* specification must be a date from January 1, 1980, through December 31, 2099. For systems running Microsoft Windows NT, *date* must be a date from January 1, 1980, through December 31, 2079.

> [!IMPORTANT]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system date is a privileged operation that requires the process to have relevant permissions.

> [!NOTE] BETA 1010
> **Date$** accepts only a string of the form *mm-dd-yyyy*. VB6 also accepts other forms, such as *m/d/yyyy* and *mm-dd-yy*, which twinBASIC refuses with error -2147467259 (`&H80004005`).

#### Example

This example uses the **Date$** property to set the computer system date. In the development environment, the date literal is displayed in short date format by using the locale settings of the code.

```tb check_build
Dim MyDate$
MyDate = "02-12-1985"        ' Assign a date to a variable.
Date$ = MyDate               ' Change the system date. 
```

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | **Date** is given a string that is not a date, or a number outside the range of dates |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | **Date$** is given a value that is not a string of the form *mm-dd-yyyy* |
| [70 (`&H46`)](tb:Errors#70), *Permission denied* | the process does not have the privilege to change the system date |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Date$** is given **Null**<br>**Date** is given **Null** |

> [!NOTE] BETA 1010
> When **Date$** is given a value that is not a string of the form *mm-dd-yyyy*, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When **Date** is given **Null**, VB6 raises error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### See Also

- [Time](Time) property
- [Format](../Strings/Format) function
- [Now](Now) function