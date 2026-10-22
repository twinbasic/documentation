---
title: Filter
parent: Strings Module
permalink: /tB/Modules/Strings/Filter
vba_attribution: true
---
# Filter
{: .no_toc }

Returns a zero-based array containing a subset of a string array based on a specified filter criteria.

Syntax: **Filter(** *sourcearray*, *match* [ **,** *include* [ **,** *compare* ] ] **)**

*sourcearray*
: *required* One-dimensional array of strings to be searched.

> [!NOTE]
> twinBASIC also takes a *sourcearray* whose elements are of a type other than **String** or **Variant**, such as **Long** or **Double**. For a **Long** array VB6 and 64-bit VBA raise error 13, *Type mismatch*.

*match*
: *required* String to search for.

*include*
: *optional* **Boolean** value indicating whether to return substrings that include or exclude *match*. If *include* is **True**, **Filter** returns the subset of the array that contains *match* as a substring. If *include* is **False**, **Filter** returns the subset of the array that does not contain *match* as a substring.

*compare*
: *optional* Numeric value indicating the kind of string comparison to use. See settings below.

The *compare* argument can have the following values:

| Constant               | Value | Description                                                                              |
|------------------------|-------|------------------------------------------------------------------------------------------|
| **vbBinaryCompare**    | 0     | Performs a binary comparison.                                                            |
| **vbTextCompare**      | 1     | Performs a textual comparison.                                                           |

<!-- VBA: VBA-Docs lists this setting too; twinBASIC and VB6 raise error 5 for it.
| **vbUseCompareOption** | -1    | Performs a comparison by using the setting of the [**Option Compare**](../../Core/Option) statement. |
-->

The array returned by the **Filter** function contains only enough elements to contain the number of matched items.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *compare* is less than 0, or greater than 1 and not a valid locale identifier |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *sourcearray* is **Null**, or has more than one dimension |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *match*, *include* or *compare* is **Null**, or an element of *sourcearray* is **Null** |

> [!NOTE] BETA 1010
> When *compare* is 2 (**vbDatabaseCompare**), VB6 raises error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### See Also

- [Join](Join), [Split](Split) functions
