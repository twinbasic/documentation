---
title: String
parent: Strings Module
permalink: /tB/Modules/Strings/String
---
# String
{: .no_toc }

Returns a **String** containing a repeating character string of the length specified.

Syntax: **String$(** *number*, *character* **)**, **String(** *number*, *character* **)**

*number*
: *required* **Long**. Length of the returned string. If *number* contains **Null**, **Null** is returned.

*character*
: *required* **Variant**. Character code specifying the character or string expression whose first character is used to build the return string. If *character* contains **Null**, **Null** is returned.

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

If you specify a number for *character* greater than 255, **String** converts the number to a valid character code by using this formula: *character* **Mod** 256.

### Example

This example uses the **String** function to return repeating character strings of the length specified.

```tb
Dim MyString
MyString = String(5, "*")       ' Returns "*****".
MyString = String(5, 42)        ' Returns "*****".
MyString = String(10, "ABC")    ' Returns "AAAAAAAAAA".
```

### See Also

- [Space](Space) function

{% include VBA-Attribution.md %}
