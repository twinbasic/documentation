---
title: Left
parent: Strings Module
permalink: /tB/Modules/Strings/Left
vba_attribution: true
---
# Left, LeftB
{: .no_toc }

Returns a **String** containing a specified number of characters from the left side of a string.

Syntax:

- **Left$(** *string*, *length* **)**, **Left(** *string*, *length* **)**
- **LeftB$(** *string*, *length* **)**, **LeftB(** *string*, *length* **)**

*string*
: *required* String expression from which the leftmost characters are returned. If *string* contains **Null**, **Null** is returned.

*length*
: *required* **Variant** (**Long**). Numeric expression indicating how many characters to return. If 0, a zero-length string (`""`) is returned. If greater than or equal to the number of characters in *string*, the entire string is returned.

The `$`-suffixed forms return a **String**; the unsuffixed forms return a **Variant** (**String**).

To determine the number of characters in *string*, use the [**Len**](Len) function.

> [!NOTE]
> Use the **LeftB** function with byte data contained in a string. Instead of specifying the number of characters to return, *length* specifies the number of bytes.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *length* is negative<br>**Left** or **Left$** is given a *length* greater than 1,073,741,823 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | **Left$** or **LeftB$** is given a *string* that is **Null**, or any form is given a *length* that is **Null** |

<!-- /errors -->

### Example

This example uses the **Left** function to return a specified number of characters from the left side of a string.

```tb check_build
Dim AnyString, MyStr
AnyString = "Hello World"    ' Define string.
MyStr = Left(AnyString, 1)   ' Returns "H".
MyStr = Left(AnyString, 7)   ' Returns "Hello W".
MyStr = Left(AnyString, 20)  ' Returns "Hello World".
```

### See Also

- [Len](Len), [Mid](Mid), [Right](Right) functions
