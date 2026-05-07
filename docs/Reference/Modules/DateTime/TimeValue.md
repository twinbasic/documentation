---
title: TimeValue
parent: DateTime Module
permalink: /tB/Modules/DateTime/TimeValue
redirect_from:
-  /tB/Core/TimeValue
---
# TimeValue
{: .no_toc }

Returns a **Variant** (**Date**) containing the time.

Syntax: **TimeValue** ( *time* )

*time*
: *required* Normally a string expression representing a time from 0:00:00 (12:00:00 A.M.) to 23:59:59 (11:59:59 P.M.), inclusive. However, *time* can also be any expression that represents a time in that range. If *time* contains **Null**, **Null** is returned.

You can enter valid times by using a 12-hour or 24-hour clock. For example, `"2:24PM"` and `"14:24"` are both valid *time* arguments.

If the *time* argument contains date information, **TimeValue** doesn't return it. However, if *time* includes invalid date information, an error occurs.

### Example

This example uses the **TimeValue** function to convert a string to a time. You can also use date literals to directly assign a time to a **Variant** or **Date** variable (for example, `MyTime = #4:35:17 PM#`).

```vb
Dim MyTime
MyTime = TimeValue("4:35:17 PM")    ' Return a time.
```

### See Also

- [TimeSerial](TimeSerial) function

{% include VBA-Attribution.md %}
