---
title: Dim
parent: Statements
permalink: /tB/Core/Dim
---

# Dim
{: no_toc }

Declares variables and allocates storage space.

Syntax: **Dim** [ **WithEvents** ] *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ] [ **,** [ **WithEvents** ] *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ]] **. . .**

**WithEvents**

: *optional* Keyword that specifies that *varname* is an object variable used to respond to events triggered by an ActiveX object. **WithEvents** is valid only in class modules. You can declare as many individual variables as you like by using **WithEvents**, but you can't create arrays with **WithEvents**. You can't use **New** with **WithEvents**.

*varname*

:  Name of the variable; follows standard variable naming conventions.

*subscripts*

: *optional* Dimensions of an array variable; up to 60 multiple dimensions may be declared. The *subscripts* argument uses the following syntax: [ *lower* **To** ] *upper* [ , [ *lower* **To** ] *upper* ] **. . .**.  When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

**New**

: *optional* Keyword that enables implicit creation of an object. If you use **New** when declaring the object variable, a new instance of the object is created on first reference to it, so you don't have to use the **Set** statement to assign the object reference.  The **New** keyword can't be used to declare variables of any intrinsic data type or to declare instances of dependent objects, and it can't be used with **WithEvents**.

*type*

: *optional*. Data type of the variable; may be Byte, Boolean, Integer, Long, Currency, Single, Double, Decimal (not currently supported), Date, String (for variable-length strings), **String** *length* (for fixed-length strings), Object, Variant, a user-defined type (UDT), or an object type. Use a separate **As** *type* clause for each variable you declare.

Variables declared with **Dim** at the module level are available to all procedures within the module. At the procedure level, variables are available only within the procedure.

Use the **Dim** statement at the module or procedure level to declare the data type of a variable. For example, the following statement declares a variable as an **Integer**.

```vb
Dim NumberOfEmployees As Integer 
```

Also use a **Dim** statement to declare the object type of a variable. The following declares a variable for a new instance of a worksheet.

```vb
Dim X As New Worksheet 
```

If the **New** keyword is not used when declaring an object variable, the variable that refers to the object must be assigned an existing object by using the **Set** statement before it can be used. Until it is assigned an object, the declared object variable has the special value **Nothing**, which indicates that it doesn't refer to any particular instance of an object.

You can also use the **Dim** statement with empty parentheses to declare a dynamic array. After declaring a dynamic array, use the [**ReDim**](ReDim) statement within a procedure to define the number of dimensions and elements in the array. If you try to redeclare a dimension for an array variable whose size was explicitly specified in a [**Private**](Private), [**Public**](Public), or **Dim** statement, an error occurs.

If you don't specify a data type or object type, and there is no [**Deftype**](Deftype) statement in the module, the variable is **Variant** by default. When variables are initialized, a numeric variable is initialized to 0, a variable-length string is initialized to a zero-length string (""), and a fixed-length string is filled with zeros. **Variant** variables are initialized to Empty. Each element of a user-defined type variable is initialized as if it were a separate variable.

> [!NOTE]
>
> When you use the **Dim** statement in a procedure, you generally put the **Dim** statement at the beginning of the procedure.

### Example

This example shows the **Dim** statement used to declare variables. It also shows the **Dim** statement used to declare arrays. The default lower bound for array subscripts is 0 and can be overridden at the module level by using the **Option Base** statement.

```vb
' AnyValue and MyValue are declared as Variant by default with values 
' set to Empty. 
Dim AnyValue, MyValue 
 
' Explicitly declare a variable of type Integer. 
Dim Number As Integer 
 
' Multiple declarations on a single line. AnotherVar is of type Variant 
' because its type is omitted. 
Dim AnotherVar, Choice As Boolean, BirthDate As Date 
 
' DayArray is an array of Variants with 51 elements indexed, from 
' 0 thru 50, assuming Option Base is set to 0 (default) for 
' the current module. 
Dim DayArray(50) 
 
' Matrix is a two-dimensional array of integers. 
Dim Matrix(3, 4)As Integer 
 
' MyMatrix is a three-dimensional array of doubles with explicit 
' bounds. 
Dim MyMatrix(1 To 5, 4 To 9, 3 To 5)As Double 
 
' BirthDay is an array of dates with indexes from 1 to 10. 
Dim BirthDay(1 To 10)As Date 
 
' MyArray is a dynamic array of variants. 
Dim MyArray()
```

{% include VBA-Attribution.md %}