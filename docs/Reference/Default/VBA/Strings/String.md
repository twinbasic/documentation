---
title: String
parent: Strings Module
permalink: /tB/Modules/Strings/String
vba_attribution: true
---
# String
{: .no_toc }

Returns a **String** containing a repeating character string of the length specified.

Syntax: **String$(** *number*, *character* **)**, **String(** *number*, *character* **)**

*number*
: *required* **Long**. Length of the returned string. <!-- VBA: VBA-Docs says this; twinBASIC and VB6 raise error 94 instead. If *number* contains **Null**, **Null** is returned. -->

*character*
: *required* **Variant**. Character code specifying the character or string expression whose first character is used to build the return string. <!-- VBA: VBA-Docs says this, and VB6 does it for String but not String$; twinBASIC raises error 94 for both. If *character* contains **Null**, **Null** is returned. -->

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

When *character* is a number greater than 255, **String** converts the number to a valid character code by using this formula: *character* **Mod** 256.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *number* is negative, or greater than 1,073,741,823<br>*character* is a zero-length string |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *number* is **Null**, or **String$** is given a *character* that is **Null**<br>**String** is given a *character* that is **Null** |

> [!NOTE] BETA 1010
> When **String** is given a *character* that is **Null**, VB6 raises no error.

<!-- /errors -->

### Example

This example uses the **String** function to return repeating character strings of the length specified.

```tb check_build
Dim MyString
MyString = String(5, "*")       ' Returns "*****".
MyString = String(5, 42)        ' Returns "*****".
MyString = String(10, "ABC")    ' Returns "AAAAAAAAAA".
```

### See Also

- [Space](Space) function
