---
title: IsArray
parent: Information Module
permalink: /tB/Modules/Information/IsArray
redirect_from:
-  /tB/Core/IsArray
---
# IsArray
{: .no_toc }

Returns a **Boolean** indicating whether a variable is an array.

Syntax: **IsArray(** *varname* **)**

*varname*
: *required* An identifier specifying the variable to test.

**IsArray** returns **True** if the variable is an array; otherwise, it returns **False**. **IsArray** is especially useful with **Variant**s containing arrays.

### Example

This example uses **IsArray** to check whether a variable is an array.

```tb
Dim MyArray(1 To 5) As Integer
Dim YourArray As Variant
Dim MyCheck As Boolean
YourArray = Array(1, 2, 3)            ' Use the Array function.
MyCheck = IsArray(MyArray)            ' Returns True.
MyCheck = IsArray(YourArray)          ' Returns True.
```

### See Also

- [IsArrayInitialized](IsArrayInitialized) function
- [LBound](LBound), [UBound](UBound) functions

{% include VBA-Attribution.md %}
