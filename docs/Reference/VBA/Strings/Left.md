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

### Example

This example uses the **Left** function to return a specified number of characters from the left side of a string.

```tb
Dim AnyString, MyStr
AnyString = "Hello World"    ' Define string.
MyStr = Left(AnyString, 1)   ' Returns "H".
MyStr = Left(AnyString, 7)   ' Returns "Hello W".
MyStr = Left(AnyString, 20)  ' Returns "Hello World".
```

### See Also

- [Len](Len), [Mid](Mid), [Right](Right) functions
