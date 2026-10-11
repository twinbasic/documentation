---
title: RSet
parent: Statements
permalink: /tB/Core/RSet
vba_attribution: true
---
# RSet
{: .no_toc }

Right-aligns a string within a string variable.

Syntax:
> **RSet** *stringvar* **=** *string*

*stringvar*
: Name of a string variable.

*string*
: String expression to be right-aligned within *stringvar*.

If *stringvar* is longer than *string*, **RSet** replaces any leftover characters in *stringvar* with spaces, back to its beginning.

If *string* is longer than *stringvar*, **RSet** places only the leftmost characters, up to the length of *stringvar*, in *stringvar*. The rightmost characters of *string* are the ones dropped, as with [**LSet**](LSet).

**RSet** never changes the length of *stringvar*, so a *stringvar* of zero length stays empty. *stringvar* can be a variable-length string, a fixed-length string, or a **Variant** that holds a string. A *string* that is **Null** raises error 94.

> [!WARNING]
> BETA 1005 has a defect: **RSet** on an element of a **Variant** that holds an array, such as `RSet v(1) = "zz"` with `v = Array("0123456789", "abcde")` or a **Variant** that was given its bounds with **ReDim**, changes nothing and raises no error. VB6 changes the element. An element of an array declared `Dim w(0 To 1) As Variant` works. To change an element of a **Variant** array, copy it to a **String** variable, use **RSet** on the variable and assign the variable back.

> [!NOTE]
> **RSet** can't be used with user-defined types. The compiler refuses the statement.

### Example

This example uses the **RSet** statement to right-align a string within a string variable.

```tb check_build
Dim MyString
MyString = "0123456789"   ' Initialize string.
RSet MyString = "Right->" ' MyString contains "   Right->".
```

This example shows the padding, the truncation, a fixed-length string and an empty destination.

```tb check_run
Dim s As String
Dim fixed As String * 5
s = "0123456789"
RSet s = "ab"
Debug.Print "[" & s & "]"        ' [        ab]
RSet s = "abcdefghijklm"
Debug.Print "[" & s & "]"        ' [abcdefghij]
fixed = "01234"
RSet fixed = "ab"
Debug.Print "[" & fixed & "]"    ' [   ab]
s = ""
RSet s = "abc"
Debug.Print Len(s)               ' 0
```

### See Also

- [**LSet** statement](LSet)
- [**Mid =** statement](Mid-equals)
- [**Let** statement](Let)
