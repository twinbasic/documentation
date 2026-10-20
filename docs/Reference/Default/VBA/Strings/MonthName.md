---
title: MonthName
parent: Strings Module
permalink: /tB/Modules/Strings/MonthName
vba_attribution: true
---
# MonthName
{: .no_toc }

Returns a string indicating the specified month.

Syntax: **MonthName(** *month* [ **,** *abbreviate* ] **)**

*month*
: *required* The numeric designation of the month. For example, January is 1, February is 2, and so on.

*abbreviate*
: *optional* **Boolean** value that indicates if the month name is to be abbreviated. If omitted, the default is **False**, which means that the month name is not abbreviated.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *month* is less than 1 or greater than 12 |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *month* or *abbreviate* is **Null** |

<!-- /errors -->

### Example

This example uses **MonthName** to return the full and abbreviated name of a month.

```tb check_build
Debug.Print MonthName(3)           ' "March"
Debug.Print MonthName(3, True)     ' "Mar"
Debug.Print MonthName(12)          ' "December"
```

### See Also

- [FormatDateTime](FormatDateTime), [WeekdayName](WeekdayName) functions
