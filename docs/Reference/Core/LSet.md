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

> [!WARNING]
> Using **LSet** to copy a variable of one user-defined type into a variable of a different user-defined type is not recommended. Copying data of one data type into space reserved for a different data type can cause unpredictable results. When a variable is copied from one user-defined type to another, the binary data from one variable is copied into the memory space of the other, without regard for the data types specified for the elements.

### Example

This example uses the **LSet** statement to left-align a string within a string variable. Although **LSet** can also be used to copy a variable of one user-defined type to another variable of a different but compatible user-defined type, this practice is not recommended; due to the varying implementations of data structures among platforms, such a use of **LSet** can't be guaranteed to be portable.

```tb
Dim MyString
MyString = "0123456789" ' Initialize string.
LSet MyString = "<-Left" ' MyString contains "<-Left    ".
```

### See Also

- [**RSet** statement](RSet)
- [**Mid =** statement](Mid-equals)
- [**Let** statement](Let)
