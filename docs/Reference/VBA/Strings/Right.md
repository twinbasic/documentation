---
title: Right
parent: Strings Module
permalink: /tB/Modules/Strings/Right
vba_attribution: true
---
# Right, RightB
{: .no_toc }

Returns a **String** containing a specified number of characters from the right side of a string.

Syntax:

- **Right$(** *string*, *length* **)**, **Right(** *string*, *length* **)**
- **RightB$(** *string*, *length* **)**, **RightB(** *string*, *length* **)**

*string*
: *required* String expression from which the rightmost characters are returned. If *string* contains **Null**, **Null** is returned.

*length*
: *required* **Variant** (**Long**). Numeric expression indicating how many characters to return. If 0, a zero-length string (`""`) is returned. If greater than or equal to the number of characters in *string*, the entire string is returned.

The `$`-suffixed forms return a **String**; the unsuffixed forms return a **Variant** (**String**).

To determine the number of characters in *string*, use the [**Len**](Len) function.

> [!NOTE]
> Use the **RightB** function with byte data contained in a string. Instead of specifying the number of characters to return, *length* specifies the number of bytes.

### Example

This example uses the **Right** function to return a specified number of characters from the right side of a string.

```tb
Dim AnyString, MyStr
AnyString = "Hello World"      ' Define string.
MyStr = Right(AnyString, 1)    ' Returns "d".
MyStr = Right(AnyString, 6)    ' Returns " World".
MyStr = Right(AnyString, 20)   ' Returns "Hello World".
```

### See Also

- [Left](Left), [Len](Len), [Mid](Mid) functions
