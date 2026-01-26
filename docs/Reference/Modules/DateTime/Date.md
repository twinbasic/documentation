---
title: Date
parent: DateTime Module
permalink: /tB/Modules/DateTime/Date
redirect_from:
-  /tB/Core/Date
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

```vb
Dim MyDate as Variant
MyDate = Date   ' MyDate contains the current system date.
```

### Let
{: #date-let }

Sets the current system date from a value with a Variant or Date type.

Syntax: **Date** **=** *date*

date

: For systems running Microsoft Windows 95, the required *date* specification must be a date from January 1, 1980, through December 31, 2099. For systems running Microsoft Windows NT, *date* must be a date from January 1, 1980, through December 31, 2079. For the Macintosh, *date* must be a date from January 1, 1904, through February 5, 2040.

> [!NOTE]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system date is a privileged operation that requires the process to have relevant permissions. Without those permissions, assignment to **Date** results in a Permission Denied runtime error.

#### Example

This example uses the **Date** property to set the computer system date. In the development environment, the date literal is displayed in short date format by using the locale settings of your code.

```vb
Dim MyDate As Date
MyDate = #February 12, 1985#  ' Assign a date to a variable.
Date= MyDate                  ' Change system date. 
```

## Date$ Property
{: #date-1 }

The behavior of the **Date$** property relies on the [**Calendar**](Calendar) property setting. If the calendar is Hijri, **Date$** returns or accepts a 10-character string of the form *mm-dd-yyyy*, where *mm* (01–12), *dd* (01–30) and *yyyy* (1400–1523) are the Hijri month, day, and year. The equivalent Gregorian range is Jan 1, 1980, through Dec 31, 2099.

### Get
{: #date-get-1 }

Returns a **String** containing the current system date.

Syntax: **Date$** [ **()** ]

#### Example

This example uses the **Date** property to return the current system date as a string.

```vb
Dim MyDate$
MyDate = Date$  ' MyDate contains the current system date.
```

### Let
{: #date-let-1 }

Sets the current system date from a string.

Syntax: **Date$** **=** *date*

date

: For systems running Microsoft Windows 95, the required *date* specification must be a date from January 1, 1980, through December 31, 2099. For systems running Microsoft Windows NT, *date* must be a date from January 1, 1980, through December 31, 2079. For the Macintosh, *date* must be a date from January 1, 1904, through February 5, 2040.

> [!NOTE]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system date is a privileged operation that requires the process to have relevant permissions. Without those permissions, assignment to **Date**$ results in a Permission Denied runtime error.

#### Example

This example uses the **Date$** property to set the computer system date. In the development environment, the date literal is displayed in short date format by using the locale settings of your code.

```vb
Dim MyDate$
MyDate = "02-12-1985"        ' Assign a date to a variable.
Date$ = MyDate               ' Change the system date. 
```

### See Also

- [Time](Time) property
- [Format](../Strings#format) and [Now](Now) functions

{% include VBA-Attribution.md %}