---
title: Filter
parent: Strings Module
permalink: /tB/Modules/Strings/Filter
---
# Filter
{: .no_toc }

Returns a zero-based array containing a subset of a string array based on a specified filter criteria.

Syntax: **Filter(** *sourcearray*, *match* [ **,** *include* [ **,** *compare* ] ] **)**

*sourcearray*
: *required* One-dimensional array of strings to be searched.

*match*
: *required* String to search for.

*include*
: *optional* **Boolean** value indicating whether to return substrings that include or exclude *match*. If *include* is **True**, **Filter** returns the subset of the array that contains *match* as a substring. If *include* is **False**, **Filter** returns the subset of the array that does not contain *match* as a substring.

*compare*
: *optional* Numeric value indicating the kind of string comparison to use. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

The array returned by the **Filter** function contains only enough elements to contain the number of matched items.

### See Also

- [Join](Join), [Split](Split) functions

{% include VBA-Attribution.md %}
