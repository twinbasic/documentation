---
title: Arrays
parent: Tutorials
permalink: /Tutorials/Arrays
---

# Arrays
{: .no_toc }

Arrays come in two kinds:

1. Fixed size arrays, whose size specification is a compile-time constant.  
   `Dim MyInts(10) As Integer`
   `Dim MyLongs(10 To 19) As Long`
2. Dynamic arrays, who aren't initialized initially, and must be (re-)dimensioned prior to use.  
   `Dim MyLongs() As Long`

Fixed size arrays have lower memory and runtime overhead than dynamic arrays. They perform better as small arrays -- up to 8 cache lines in size, or up to 512 bytes in size.

In arrays larger than that, the overhead of a dynamic array becomes negligible when creating (dimensioning) the array. However, there is still slight runtime overhead on element access, independently of the size of a dynamic array.

- TOC
{:toc}

## Array  Declaration Syntax

Fixed size arrays can only be used for variables or class and UDT fields.  
Dynamic arrays can be used for variables, fields, parameter types and return types.  
A fixed size array can be passed as an argument accepting a dynamic array.

> [!NOTE]
>
> Fixed size arrays cannot be used as return types directly. They can be returned when wrapped in a UDT.

* Syntax for variable declarations in procedures  
  **Dim** | **Static** name **()** [ **As** type ]  -- dynamic array  
  **Dim** | **Static** name **(** size [ **,** size ... ] **)** [ **As** type ]  -- fixed array
* Syntax for procedure parameter types; only dynamic arrays are valid and both syntaxes below are equivalent  
  name **()** [ **As** type ]   
  name **As** type **()**
* Syntax for procedure return types; only dynamic arrays are valid  
  name **As** type **()**
* Syntax for field declarations in classes  
  **Dim** | **Private** | **Protected** | **Public** name **()** [ **As** type ]  -- dynamic array  
  **Dim** | **Private** | **Protected** | **Public** name **(** size [ **,** size ....] **)** [ **As** type ]  -- static array
* Syntax for field declarations in types (UDTs)  
  name **()** [ **As** type ]  -- dynamic array  
  name **(** size [ **,** size ....] **)** [ **As** type ]  -- static array

Each size specification is a range, but the lower bound is optional and defaults to currently active **Option Base**:

- ubound, e.g.
  `Dim A(10, 20)`
- lbound **To** ubound  -- range, inclusive of both bounds, e.g.
  `Dim A(1 To 10, 1 To 20)`

Both variants of size specifications can be mixed in one declaration, e.g.  
`Dim B(10, 1 To 20)`

Here is how **Option Base** controls the default lower bound of a dimension:

```tb
Option Base 0
Dim A(10, 20)   ' is equivalent to...
Dim A(0 To 10, 0 To 20)   ' i.e. a 21 x 11 array

Option Base 1
Dim A(10, 20)   ' is equivalent to...
Dim A(1 To 10, 1 To 20)    ' i.e. a 20 x 10 array
```

Only the dynamic arrays can be passed as procedure arguments:

```tb
Sub OkSub1(data() As Byte)     ' Dynamic array parameter
Sub OkSub2(data As Byte())     ' Alternate syntax

Sub BadSub1(data(10) As Byte)  ' Invalid, fixed array types are not allowed as parameters...
Sub BadSub2(data As Byte(10))  ' ... in neither syntax          
```

## Dimensioning Dynamic Arrays

A dynamic array is uninitialized after declaration. It cannot be used in any way other than to be dimensioned. Dimensioning is performed by the **ReDim** statement:

```tb
Dim array()
Debug.Assert IsArrayInitialized(array) = False
Debug.Print LBound(array)  ' raises a runtime error since the array is uninitialized,
                           ' and no operations are valid on it other than a ReDim

ReDim array(1 to 10)       ' now the array is initialized
Debug.Assert IsArrayInitialized(array) = True
Debug.Assert LBound(array) = 1
Debug.Assert UBound(array) = 10
```

**ReDim** has two operating modes: by default, it discards the existing data in the array. Optionally, it can preserve the existing data to the extent that new dimensions allow it.

Syntax:  

* **ReDim** [ **Preserve** ] name **(** size [ **,** size ...] **)**

> [!IMPORTANT]
>
> Only the upper bound of an array dimension can be changed with **ReDim Preserve**.
> Non-preserving **ReDim** allows arbitrary changes.

```tb
Dim a() As Long

ReDim a(1 To 2)             ' Initial dimensioning
a(1) = 10
a(2) = 20

ReDim Preserve a(1 To 3)    ' Change of an upper bound of 1st dimension
Debug.Assert a(1) = 10
Debug.Assert a(2) = 20
Debug.Assert a(3) = 0

ReDim Preserve a(2 To 3)    ' Causes a runtime error

ReDim a(5 To 8)             ' Change of both bounds of 1st dimension while losing data
Debug.Assert a(5) = 0
```

## Determining Array Dimension Bounds

Every dimension of an *initialized* array has an associated lower and upper bound. These bounds are accessed with the **LBound** and **UBound** functions.

```tb
Dim array(1 To 10, 3 To 20)
Debug.Assert LBound(array) = 1		' 1st dimension by default
Debug.Assert LBound(array, 1) = 1	' 1st dimension
Debug.Assert LBound(array, 2) = 3   ' 2nd dimension
Debug.Assert UBound(array, 2) = 20  ' 2nd dimension, upper bound'
```

## Determining Array Size

An attempt to use **LBound** or **UBound** on an uninitialized array causes a runtime error. Thus, a function that determines the number of elements in a given dimension of an array, must first check if the array is initialized:

```tb
Sub ArrayLen(Of T)(array() Of T, ByVal dimension% = 1) As Long
    ' zero is the default return value    
    If IsArrayInitialized(array) Then
        Return 1 + UBound(array, dimension) - LBound(array, dimension)
    End If
End Sub
```

See also [Efficient low-level access of a 1D array](#efficient-low-level-access-of-a-1d-array).

## Array Element Access

To access array elements, indices for all dimensions should be provided as a parenthesized list after the name of the array variable:

```tb
Dim array(1 To 10) As Long

array(1) = 42
Debug.Assert array(1) = 42

Dim array2(1 To 10, 1 To 2) As Long
array(1, 2) = 42
Debug.Assert array(1, 2) = 42
```

Array elements are initialized to zero/null, just as all the other types are in twinBASIC:

```tb
Dim intArray(1 To 10) As Integer
Debug.Assert intArray(1) = 0 AndAlso intArray(10) = 0

Dim strArray(20 To 25) As String
Debug.Assert strArray(20) = vbNullString
```

## Returning Arrays

Any array can be returned as a dynamic array:

```tb
Function Fn1() As Long()
    Dim array1() As Long
    Dim array2(11) As Long
    Return array1
    Return array2
End Function
```

To return a fixed size array, it has to be wrapped in a UDT:

```tb
Type Wrapper
    array(11) As Long
End Type

Function Fn2() As Wrapper
    ' The procedure name is used to access the returned value
    Fn2.array(5) = 10
End Function

Sub Test()
    Dim arr As Wrapper = Fn2()
    Debug.Assert arr.array(5) = 10
End Sub
```

## Efficient low-level access of a 1D array

In twinBASIC, array types are implemented as pointers to a pointer to the Windows API **SAFEARRAY** structure.

This can be leveraged to efficiently access:

- the count of elements in the 1st dimension
- as the pointer to the data (to the 1st element in the array)
- the size of the array in bytes

```tb
Function ArrayLen(Of T)(array() As T) As Long
    Dim p As LongPtr
    GetMemPtr(VarPtr(array), p)
    If p <> 0 Then	' if the array is initialized
    #If win64 Then
        GetMem4(p + 24, Len)
    #Else
        GetMem4(p + 16, Len)
    #End If
    End If
End Function

Function ArrayPtr(Of T)(array() As T) As LongPtr
    Dim p As LongPtr
    GetMemPtr(VarPtr(array), p)
    If p <> 0 Then
    #If win64 Then
        GetMemPtr(p + 16, Ptr)
    #Else
        GetMemPtr(p + 12, Ptr)
    #End If
    End If
End Function

Function ArrayBytes(Of T)(array() As T) As Long
    Return ArrayLen(array) * LenB(Of T)
End Function

```

These functions are useful to pass arrays and array counts to external **Declare**-d procedures. For example:

```tb
Declare Sub SaveData Lib "mylib" (ByVal ptr As LongPtr, ByVal count&)
Declare Sub WriteData Lib "mylib" (ByVal ptr As LongPtr, ByVal numBytes&)

Sub Save(array() As Long)
    Debug.Assert ArrayBytes(array) = ArrayLen(array) * 4   ' 4 = size of a Long
    SaveLongData(ArrayPtr(array), ArrayLen(array))
End Sub
        
Sub Write(array() As Long)
    WriteData(ArrayPtr(array), ArrayBytes(array))
End Sub
```

Without these functions, this would have been more cumbersome:

```tb
Sub Save(array() As Long)
    If IsArrayInitialized(array) Then
        SaveLongData( _
            VarPtr(array(LBound(array))), _
            1 + UBound(array) - LBound(array))
    Else
        SaveLongData(0, 0)   ' ArrayLen, ArraySize, and ArrayPtr would
                             ' return 0 for an uninitialized array
    End If
End Sub
```

<!--
##  Using an array to access elements of a string

Dynamic arrays are internally represented with a **STATICARRAY** struct. It is possible to synthesize such a struct for wide strings (UTF-16 encoded) to allow quick enumeration.
-->
