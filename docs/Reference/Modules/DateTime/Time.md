---
title: Time
parent: DateTime Module
permalink: /tB/Modules/DateTime/Time
redirect_from:
-  /tB/Core/Time
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

```vb
Dim MyTime As Variant
MyTime = Time   ' MyTime contains the current system time.
```

### Let
{: #time-let }

Sets the current system time.

Syntax: **Time** **=** *time*

*time*

: *required* Any numeric expression, string expression, or any combination that can represent a time.

If *time* is a string, **Time** attempts to convert it to a time by using the time separators specified for your system. If it cannot be converted to a valid time, an error occurs.

> [!NOTE]
>
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system time is a privileged operation that requires the process to have relevant permissions. Without those permissions, assignment to **Time** results in a Permission Denied runtime error.

#### Example

This example uses the **Time** property to set the computer system time.

```vb
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

```vb
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
> In some versions of Microsoft Windows, including Windows 10 and 11, setting the system time is a privileged operation that requires the process to have relevant permissions. Without those permissions, assignment to **Time$** results in a Permission Denied runtime error.

#### Example

This example uses the **Time$** property to set the computer system time.

```vb
Dim MyTime$
MyTime = "4:35:17 PM"    ' Assign a time.
Time$ = MyTime           ' Set system time.
```

### See Also

- [Date](Date) property
- [Now](Now) function

{% include VBA-Attribution.md %}
