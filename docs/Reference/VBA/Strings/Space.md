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
: *required* The number of spaces you want in the string.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

The **Space** function is useful for formatting output and clearing data in fixed-length strings.

### Example

This example uses the **Space** function to return a string consisting of a specified number of spaces.

```tb
Dim MyString
' Returns a string with 10 spaces.
MyString = Space(10)

' Insert 10 spaces between two strings.
MyString = "Hello" & Space(10) & "World"
```

### See Also

- [String](String) function
