---
title: Trim
parent: Strings Module
permalink: /tB/Modules/Strings/Trim
vba_attribution: true
---
# Trim
{: .no_toc }

Returns a **String** containing a copy of a specified string without leading and trailing spaces.

Syntax: **Trim$(** *string* **)**, **Trim(** *string* **)**

*string*
: *required* Any valid string expression. If *string* contains **Null**, **Null** is returned.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Trim$** is given a *string* that is **Null** |

<!-- /errors -->

### Example

This example uses the **Trim** function to strip both leading and trailing spaces from a string variable.

```tb check_build
Dim MyString, TrimString
MyString = "  <-Trim->  "        ' Initialize string.
TrimString = Trim(MyString)      ' TrimString = "<-Trim->".
```

### See Also

- [LTrim](LTrim), [RTrim](RTrim) functions
