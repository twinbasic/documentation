---
title: Hour
parent: DateTime Module
permalink: /tB/Modules/DateTime/Hour
redirect_from:
-  /tB/Core/Hour
vba_attribution: true
---
# Hour
{: .no_toc }

Returns a **Variant** (**Integer**) specifying a whole number between 0 and 23, inclusive, representing the hour of the day.

Syntax: **Hour** ( *time* )

*time*
: *required* Any **Variant**, numeric expression, string expression, or any combination that can represent a time. If *time* contains **Null**, **Null** is returned.

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *time* is a string that is not a time, a number outside the range of dates, or an **Error** value |

<!-- /errors -->

### Example

This example uses the **Hour** function to obtain the hour from a specified time.

```tb check_build
Dim MyTime, MyHour
MyTime = #4:35:17 PM#    ' Assign a time.
MyHour = Hour(MyTime)    ' MyHour contains 16.
```

### See Also

- [Minute](Minute), [Second](Second), [DatePart](DatePart) functions
