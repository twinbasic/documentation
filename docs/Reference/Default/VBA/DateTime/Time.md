---
title: Time
parent: DateTime Module
permalink: /tB/Modules/DateTime/Time
redirect_from:
-  /tB/Core/Time
vba_attribution: true
---
# Time
{: .no_toc }
{: #time-top }

> [!NOTE]
>
> In twinBASIC, **Time** and **Time$** are implemented as module-level properties, not as functions/statements like they were in VBx. This has no impact on their behavior. These properties still have the syntax and semantics of the Time and Time$ functions and statements in VBx.

## Time Property
{: #time }

### Get

{: #time-get }

Returns a **Variant** (**Date**) indicating the current system time.

Syntax: **Time** [ **()** ]

#### Example

This example uses the **Time** property to return the current system time.

```tb check_build
Dim MyTime As Variant
MyTime = Time   ' MyTime contains the current system time.
```

### Let
{: #time-let }

Sets the current system time.

Syntax: **Time** **=** *time*

*time*

: *required* Any numeric expression, string expression, or any combination that can represent a time.

If *time* is a string, **Time** attempts to convert it to a time by using the time separators specified by the system.

> [!NOTE]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system time is a privileged operation that requires the process to have relevant permissions.

> [!NOTE]
> twinBASIC takes a number as [**CDate**](../Conversion/CDate) converts it, and sets the time part of the result: `Time = 0.25` sets 6:00:00 AM, and so does `Time = 1.25`. VB6 raises error 13, *Type mismatch*, for a number, though it takes the same value as a **Date**, such as `CDate(0.25)`.

#### Example

This example uses the **Time** property to set the computer system time.

```tb check_build
Dim MyTime
MyTime = #4:35:17 PM#    ' Assign a time.
Time = MyTime             ' Set system time to MyTime.
```

## Time$ Property
{: #time-1 }

### Get
{: #time-get-1 }

Returns a **String** containing the current system time.

Syntax: **Time$** [ **()** ]

#### Example

This example uses the **Time$** property to return the current system time as a string.

```tb check_build
Dim MyTime$
MyTime = Time$  ' MyTime contains the current system time as a string.
```

### Let
{: #time-let-1 }

Sets the current system time from a string.

Syntax: **Time$** **=** *time*

*time*

: *required* A string expression representing a time from 0:00:00 (12:00:00 A.M.) to 23:59:59 (11:59:59 P.M.), inclusive.

> [!NOTE]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system time is a privileged operation that requires the process to have relevant permissions.

#### Example

This example uses the **Time$** property to set the computer system time.

```tb check_build
Dim MyTime$
MyTime = "4:35:17 PM"    ' Assign a time.
Time$ = MyTime           ' Set system time.
```

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | **Time** is given a string that is not a time, or a number outside the range of dates |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | **Time$** is given a value that is not a string of the form *hh:mm:ss*, or one outside 00:00:00 to 23:59:59<br>**Time$** is given a time in another form VB6 reads, such as *hh:mm* or *hh* |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Time$** is given **Null**<br>**Time** is given **Null** |

> [!NOTE] BETA 1010
> When **Time$** is given a value that is not a string of the form *hh:mm:ss*, or one outside 00:00:00 to 23:59:59, VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When **Time$** is given a time in another form VB6 reads, such as *hh:mm* or *hh*, VB6 raises no error.

> [!NOTE] BETA 1010
> When **Time** is given **Null**, VB6 raises error [13 (`&HD`)](tb:Errors#13), *Type mismatch*, instead.

<!-- /errors -->

### See Also

- [Date](Date) property
- [Now](Now) function
