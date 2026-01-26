---
title: Erase
parent: Statements
permalink: /tB/Core/Erase
---

# Erase
{: .no_toc }

Reinitializes the elements of fixed-size arrays, or releases dynamic-array storage space.

Syntax: **Erase** *arraylist*

*arraylist*
:  one or more comma-delimited array variables to be erased

**Erase** behaves differently depending on whether an array is fixed-size (ordinary) or dynamic. **Erase** recovers no memory for fixed-size arrays. Erase sets the elements of a fixed array as follows:

| Type of array |	Effect of Erase on fixed-array elements |
|-|-|
| Fixed numeric array |	Sets each element to zero. |
| Fixed string array (variable length) |	Sets each element to a zero-length string (""). |
| Fixed string array (fixed length) |	Sets each element to zero. |
| Fixed Variant array |	Sets each element to **Empty**. |
| Array of user-defined types |	Sets each element as if it were a separate variable. |
| Array of objects |	Sets each element to the special value **Nothing**. |

**Erase** frees the memory used by dynamic arrays. Before your program can refer to the dynamic array again, it must redeclare the array variable's dimensions by using a ReDim statement.

### Example
This example uses the **Erase** statement to reinitialize the elements of fixed-size arrays and deallocate dynamic-array storage space.

```vb
' Declare array variables. 
Dim NumArray(10) As Integer        ' Integer array. 
Dim StrVarArray(10) As String      ' Variable-string array. 
Dim StrFixArray(10) As String * 10 ' Fixed-string array. 
Dim VarArray(10) As Variant        ' Variant array. 
Dim DynamicArray() As Integer      ' Dynamic array. 
ReDim DynamicArray(10)      ' Allocate storage space. 
Erase NumArray                     ' Each element set to 0. 
Erase StrVarArray                  ' Each element set to zero-length 
                                   ' string (""). 
Erase StrFixArray                  ' Each element set to 0. 
Erase VarArray                     ' Each element set to Empty. 
Erase DynamicArray                 ' Free memory used by array.
```

{% include VBA-Attribution.md %}