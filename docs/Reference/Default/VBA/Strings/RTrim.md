---
title: RTrim
parent: Strings Module
permalink: /tB/Modules/Strings/RTrim
vba_attribution: true
---
# RTrim
{: .no_toc }

Returns a **String** containing a copy of a specified string without trailing spaces.

Syntax: **RTrim$(** *string* **)**, **RTrim(** *string* **)**

*string*
: *required* Any valid string expression. If *string* contains **Null**, **Null** is returned.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | **RTrim$** is given a *string* that is **Null** |

<!-- /errors -->

### Example

This example uses the **RTrim** function to strip trailing spaces from a string variable.

```tb check_build
Dim MyString, TrimString
MyString = "  <-Trim->  "         ' Initialize string.
TrimString = RTrim(MyString)      ' TrimString = "  <-Trim->".
```

### See Also

- [LTrim](LTrim), [Trim](Trim) functions
