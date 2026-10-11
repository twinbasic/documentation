---
title: LSet
parent: Statements
permalink: /tB/Core/LSet
vba_attribution: true
---
# LSet
{: .no_toc }

Left-aligns a string within a string variable, or copies a variable of one user-defined type to another variable of a different user-defined type.

Syntax:
- > **LSet** *stringvar* **=** *string*
- > **LSet** *varname1* **=** *varname2*

*stringvar*
: Name of a string variable.

*string*
: String expression to be left-aligned within *stringvar*.

*varname1*
: Variable name of the user-defined type being copied to.

*varname2*
: Variable name of the user-defined type being copied from.

**LSet** replaces any leftover characters in *stringvar* with spaces.

If *string* is longer than *stringvar*, **LSet** places only the leftmost characters, up to the length of the *stringvar*, in *stringvar*.

**LSet** never changes the length of *stringvar*, so a *stringvar* of zero length stays empty. *stringvar* can be a variable-length string, a fixed-length string, or a **Variant** that holds a string. A *string* that is **Null** raises error 94.

> [!WARNING]
> BETA 1005 has a defect: **LSet** on an element of a **Variant** that holds an array, such as `LSet v(0) = "zz"` with `v = Array("0123456789", "abcde")` or a **Variant** that was given its bounds with **ReDim**, changes nothing and raises no error. VB6 changes the element. An element of an array declared `Dim w(0 To 1) As Variant` works. To change an element of a **Variant** array, copy it to a **String** variable, use **LSet** on the variable and assign the variable back.

When copying between user-defined types, **LSet** copies as many bytes as the smaller of the two types holds. If *varname1* is larger than *varname2*, its bytes beyond the end of the source keep their old values. Both types must be free of variable-length **String**, **Variant**, **Object** and dynamic-array fields; the compiler refuses the statement otherwise (error TB5249). Fixed-length **String** fields are allowed.

> [!WARNING]
> Using **LSet** to copy a variable of one user-defined type into a variable of a different user-defined type is not recommended. Copying data of one data type into space reserved for a different data type can cause unpredictable results. When a variable is copied from one user-defined type to another, the binary data from one variable is copied into the memory space of the other, without regard for the data types specified for the elements.

### Example

This example uses the **LSet** statement to left-align a string within a string variable. Although **LSet** can also be used to copy a variable of one user-defined type to another variable of a different but compatible user-defined type, this practice is not recommended; due to the varying implementations of data structures among platforms, such a use of **LSet** can't be guaranteed to be portable.

```tb check_build
Dim MyString
MyString = "0123456789" ' Initialize string.
LSet MyString = "<-Left" ' MyString contains "<-Left    ".
```

This example shows the padding, the truncation, a fixed-length string and an empty destination.

```tb check_run
Dim s As String
Dim fixed As String * 5
s = "0123456789"
LSet s = "ab"
Debug.Print "[" & s & "]"        ' [ab        ]
LSet s = "abcdefghijklm"
Debug.Print "[" & s & "]"        ' [abcdefghij]
fixed = "01234"
LSet fixed = "ab"
Debug.Print "[" & fixed & "]"    ' [ab   ]
s = ""
LSet s = "abc"
Debug.Print Len(s)               ' 0
```

This example copies a **Long** into a pair of **Integer** values of a different type. The low half of the **Long** becomes the first **Integer**.

```tb check_build
Private Type Whole
    Value As Long
End Type

Private Type Pair
    Lo As Integer
    Hi As Integer
End Type

Private Sub Demo()
    Dim w As Whole, p As Pair
    w.Value = &H12345678
    LSet p = w
    Debug.Print Hex$(p.Lo), Hex$(p.Hi)   ' 5678  1234
End Sub
```

### See Also

- [**RSet** statement](RSet)
- [**Mid =** statement](Mid-equals)
- [**Let** statement](Let)
