---
title: Dim
parent: Statements
permalink: /tB/Core/Dim
vba_attribution: true
---

# Dim
{: .no_toc }

Declares variables and allocates storage space.

Syntax: **Dim** [ **WithEvents** ] *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ] [ **=** *expression* ] [ **,** [ **WithEvents** ] *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ] [ **=** *expression* ] ] **. . .**

**WithEvents**

: *optional* Keyword that specifies that *varname* is an object variable used to respond to events triggered by an ActiveX object. **WithEvents** is valid only in class modules. Any number of individual variables may be declared by using **WithEvents**, but arrays cannot be declared with **WithEvents**. **New** cannot be combined with **WithEvents**.

*varname*

: Name of the variable; follows standard variable naming conventions.

*subscripts*

: *optional* Dimensions of an array variable; up to 60 multiple dimensions may be declared. The *subscripts* argument uses the following syntax: [ *lower* **To** ] *upper* [ , [ *lower* **To** ] *upper* ] **. . .**. When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

**New**

: *optional* Keyword that enables implicit creation of an object. When **New** is used to declare the object variable, a new instance of the object is created on first reference to it, so the **Set** statement is not required to assign the object reference. The **New** keyword can't be used to declare variables of any intrinsic data type or to declare instances of dependent objects, and it can't be used with **WithEvents**.

*type*

: *optional*. Data type of the variable; may be **Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (for variable-length strings), **String** *length* (for fixed-length strings), **Object**, **Variant**, a user-defined type (UDT), an object type, or **Any** (twinBASIC; type is inferred from *expression* — see [Type Inference](../../Features/Language/Type-Inference)). Use a separate **As** *type* clause for each declared variable.

*expression*

: *optional*. (twinBASIC) Initial value assigned to the variable at declaration. Equivalent to a separate assignment statement immediately after the **Dim** — `Dim i As Long = 1` is the same as `Dim i As Long: i = 1`. For object types, `= New *type* ( *args* )` constructs an instance (and may pass custom-constructor arguments). When *type* is **Any**, *expression* is required and determines the inferred type. See [Inline Variable Initialization](../../Features/Language/Inline-Initialization).

Variables declared with **Dim** at the module level are available to all procedures within the module. At the procedure level, variables are available only within the procedure.

Use the **Dim** statement at the module or procedure level to declare the data type of a variable. For example, the following statement declares a variable as an **Integer**.

```tb
Dim NumberOfEmployees As Integer 
```

Also use a **Dim** statement to declare the object type of a variable. The following declares a variable for a new instance of a worksheet.

```tb
Dim X As New Worksheet 
```

If the **New** keyword is not used when declaring an object variable, the variable that refers to the object must be assigned an existing object by using the **Set** statement before it can be used. Until it is assigned an object, the declared object variable has the special value **Nothing**, which indicates that it doesn't refer to any particular instance of an object.

The **Dim** statement with empty parentheses also declares a dynamic array. After declaring a dynamic array, use the [**ReDim**](ReDim) statement within a procedure to define the number of dimensions and elements in the array. Redeclaring a dimension for an array variable whose size was explicitly specified in a [**Private**](Private), [**Public**](Public), or **Dim** statement raises an error.

When no data type or object type is specified, and there is no [**Deftype**](Deftype) statement in the module, the variable is **Variant** by default. When variables are initialized, a numeric variable is initialized to 0, a variable-length string is initialized to a zero-length string (""), and a fixed-length string is filled with zeros. **Variant** variables are initialized to Empty. Each element of a user-defined type variable is initialized as if it were a separate variable.

By convention, a **Dim** statement inside a procedure is placed at the beginning of the procedure.

### Example

This example shows the **Dim** statement used to declare variables. It also shows the **Dim** statement used to declare arrays. The default lower bound for array subscripts is 0 and can be overridden at the module level by using the **Option Base** statement.

```tb
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