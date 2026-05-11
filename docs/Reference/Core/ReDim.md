---
title: ReDim
parent: Statements
permalink: /tB/Core/ReDim
---
# ReDim
{: .no_toc }

Used at the procedure level to reallocate storage space for dynamic array variables.

Syntax:
> **ReDim** [ **Preserve** ] *varname* **(** *subscripts* **)** [ **As** *type* ] [ **,** *varname* **(** *subscripts* **)** [ **As** *type* ] ] **. . .**

**Preserve**
: *optional*  Keyword used to preserve the data in an existing array when you change the size of the last dimension.

*varname*
: Name of the variable; follows standard variable naming conventions.

*subscripts*
: Dimensions of an array variable; up to 60 multiple dimensions may be declared. The *subscripts* argument uses the following syntax: [ *lower* **To** ] *upper* [ , [ *lower* **To** ] *upper* ] **. . .**.  When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

*type*
: *optional*  Data type of the variable; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (for variable-length strings), **String** *length* (for fixed-length strings), **Object**, **Variant**, a user-defined type, or an object type.  
Use a separate **As** *type* clause for each variable being defined. For a **Variant** containing an array, *type* describes the type of each element of the array, but doesn't change the **Variant** to some other type.

The **ReDim** statement is used to size or resize a dynamic array that has already been formally declared by using a [**Private**](Private), [**Public**](Public), or [**Dim**](Dim) statement with empty parentheses (without dimension subscripts).

Use the **ReDim** statement repeatedly to change the number of elements and dimensions in an array. However, you can't declare an array of one data type and later use **ReDim** to change the array to another data type, unless the array is contained in a **Variant**. If the array is contained in a **Variant**, the type of the elements can be changed by using an **As** *type* clause, unless you are using the **Preserve** keyword, in which case no changes of data type are permitted.

If you use the **Preserve** keyword, you can resize only the last array dimension and you can't change the number of dimensions at all. For example, if your array has only one dimension, you can resize that dimension because it is the last and only dimension. However, if your array has two or more dimensions, you can change the size of only the last dimension and still preserve the contents of the array.

The following example shows how you can increase the size of the last dimension of a dynamic array without erasing any existing data contained in the array.

```tb
ReDim X(10, 10, 10)
. . .
ReDim Preserve X(10, 10, 15)
```

Similarly, when you use **Preserve**, you can change the size of the array only by changing the upper bound; changing the lower bound causes an error.

If you make an array smaller than it was, data in the eliminated elements will be lost.

When variables are initialized, a numeric variable is initialized to 0, a variable-length string is initialized to a zero-length string (""), and a fixed-length string is filled with zeros. **Variant** variables are initialized to **Empty**. Each element of a user-defined type variable is initialized as if it were a separate variable.

A variable that refers to an object must be assigned an existing object by using the [**Set**](Set) statement before it can be used. Until it is assigned an object, the declared object variable has the special value **Nothing**, which indicates that it doesn't refer to any particular instance of an object.

The **ReDim** statement acts as a declarative statement if the variable it declares doesn't exist at the module level or procedure level. If another variable with the same name is created later, even in a wider scope, **ReDim** will refer to the later variable and won't necessarily cause a compilation error, even if **Option Explicit** is in effect. To avoid such conflicts, **ReDim** should not be used as a declarative statement, but simply for redimensioning arrays.

> [!NOTE]
> To resize an array contained in a **Variant**, you must explicitly declare the **Variant** variable before attempting to resize its array.

### Example

This example uses the **ReDim** statement to allocate and reallocate storage space for dynamic-array variables. It assumes the **Option Base** is **1**.

```tb
Dim MyArray() As Integer ' Declare dynamic array.
ReDim MyArray(5) ' Allocate 5 elements.
For I = 1 To 5 ' Loop 5 times.
    MyArray(I) = I ' Initialize array.
Next I
```

The next statement resizes the array and erases the elements.

```tb
ReDim MyArray(10) ' Resize to 10 elements.
For I = 1 To 10 ' Loop 10 times.
    MyArray(I) = I ' Initialize array.
Next I
```

The following statement resizes the array but does not erase elements.

```tb
ReDim Preserve MyArray(15) ' Resize to 15 elements.
```

### See Also

- [**Dim** statement](Dim)
- [**Private** statement](Private)
- [**Public** statement](Public)
- [**Static** statement](Static)
- [**Erase** statement](Erase)

{% include VBA-Attribution.md %}
