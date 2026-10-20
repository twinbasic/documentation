---
title: Space
parent: Strings Module
permalink: /tB/Modules/Strings/Space
vba_attribution: true
---
# Space
{: .no_toc }

Returns a **String** consisting of the specified number of spaces.

Syntax: **Space$(** *number* **)**, **Space(** *number* **)**

*number*
: *required* The number of spaces in the string.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

The **Space** function is useful for formatting output and clearing data in fixed-length strings.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *number* is negative, or greater than 1,073,741,823 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null** |

<!-- /errors -->

### Example

This example uses the **Space** function to return a string consisting of a specified number of spaces.

```tb check_build
Dim MyString
' Returns a string with 10 spaces.
MyString = Space(10)

' Insert 10 spaces between two strings.
MyString = "Hello" & Space(10) & "World"
```

### See Also

- [String](String) function
