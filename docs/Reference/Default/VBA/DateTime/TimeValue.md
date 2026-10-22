---
title: TimeValue
parent: DateTime Module
permalink: /tB/Modules/DateTime/TimeValue
redirect_from:
-  /tB/Core/TimeValue
vba_attribution: true
---
# TimeValue
{: .no_toc }

Returns a **Variant** (**Date**) containing the time.

Syntax: **TimeValue** ( *time* )

*time*
: *required* Normally a string expression representing a time from 0:00:00 (12:00:00 A.M.) to 23:59:59 (11:59:59 P.M.), inclusive. However, *time* can also be any expression that represents a time in that range.
<!-- VBA: VBA-Docs says this; twinBASIC and VB6 raise error 94 for a Null time.
If *time* contains **Null**, **Null** is returned.
-->

Valid times can be entered using a 12-hour or 24-hour clock. For example, `"2:24PM"` and `"14:24"` are both valid *time* arguments.

If the *time* argument contains date information, **TimeValue** doesn't return it.

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *time* is not a time: a string that is not one, a time outside 0:00:00 to 23:59:59, a string with an invalid date, a number outside the range of dates, **Empty**, **True** or an **Error** value |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *time* is **Null** |

<!-- /errors -->

### Example

This example uses the **TimeValue** function to convert a string to a time. You can also use date literals to directly assign a time to a **Variant** or **Date** variable (for example, `MyTime = #4:35:17 PM#`).

```tb check_build
Dim MyTime
MyTime = TimeValue("4:35:17 PM")    ' Return a time.
```

### See Also

- [TimeSerial](TimeSerial) function
