---
title: Second
parent: DateTime Module
permalink: /tB/Modules/DateTime/Second
redirect_from:
-  /tB/Core/Second
vba_attribution: true
---
# Second
{: .no_toc }

Returns a **Variant** (**Integer**) specifying a whole number between 0 and 59, inclusive, representing the second of the minute.

Syntax: **Second** ( *time* )

*time*
: *required* Any **Variant**, numeric expression, string expression, or any combination that can represent a time. If *time* contains **Null**, **Null** is returned.

<!-- errors: generated from errors/VBA.DateTime.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *time* is a string that is not a time, a number outside the range of dates, or an **Error** value |

<!-- /errors -->

### Example

This example uses the **Second** function to obtain the second of the minute from a specified time.

```tb check_build
Dim MyTime, MySecond
MyTime = #4:35:17 PM#    ' Assign a time.
MySecond = Second(MyTime)    ' MySecond contains 17.
```

### See Also

- [Hour](Hour), [Minute](Minute), [DatePart](DatePart) functions
