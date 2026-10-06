---
title: Const
parent: Statements
permalink: /tB/Core/Const
vba_attribution: true
---

# Const
{: .no_toc }

Declares constants for use in place of literal values.

Syntax:  

> [ *attributes* ]  
> [ **Public** \| **Private** ] **Const** *constname* [ **As** *type* ] **=** *expression*

*attributes*
: *optional* One or more of:  
[Description](Attributes#description)

**Public**
: *optional* Keyword used at the module level to declare constants that are available to all procedures in all modules. Not allowed in procedures.

**Private**
: *optional* Keyword used at the class or module level to declare constants that are available only within the class or module where the declaration is made. Not allowed in procedures.

*constname*

: *required* Name of the constant; follows standard variable naming conventions.

*type*

: *optional* The data type of the constant; may be Byte, Boolean, Integer, Long, Currency, Single, Double, Decimal, Date, String, or Variant. Use a separate **As** *type* clause for each constant being declared.

*expression*

: *required* Literal, other constant, or any combination that includes all arithmetic or logical operators except **Is**.

Constants are private by default. Within procedures, constants are always private; their visibility can't be changed. In standard modules, the **Public** keyword can change the default visibility of module-level constants. In class modules, constants are always private; the **Public** keyword has no effect.

To combine several constant declarations on the same line, separate each constant assignment with a comma. When constant declarations are combined in this way, the **Public** or **Private** keyword, if used, applies to all of them.

Variables, user-defined functions, and intrinsic Visual Basic functions (such as **Chr**) cannot be used in expressions assigned to constants.

Constants can make programs self-documenting and easy to modify. Unlike variables, constants can't be inadvertently changed while the program is running.

When the constant type is not explicitly declared by using **As** *type*, the constant has the data type that is most appropriate for *expression*.

Constants declared in a **Sub**, **Function**, or **Property** procedure are local to that procedure. A constant declared outside a procedure is defined throughout the module in which it is declared. Constants can be used anywhere an expression is allowed.

## Array constants

*(twinBASIC)* A constant can also be a one-dimensional array, whose elements are given with [**Array**](../Modules/Information/Array):

> [ **Public** \| **Private** ] **Const** *constname* **(** [ [ *lower* **To** ] *upper* ] **)** **As** *type* **=** **Array(** *elementlist* **)**

The **As** *type* clause is required. In a module or a class, *type* is **Byte**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Single**, **Double**, **Currency**, **Date**, **Boolean** or an **Enum** type; any other type is compile error **TB5001**, *unsupported datatype for global Const - only scalar types are supported*. A constant declared in a procedure may also be an array of **String**, **Decimal** or **Variant**.

Each element of *elementlist* is a constant expression, converted to *type* as an assignment would convert it: in a **Long** array, `2.5` becomes 2 and `"5"` becomes 5. Without bounds, the array starts at 0 and has one element for each item in *elementlist*; [**Option Base**](Option) does not change that. With bounds, the number of items must match them. `Array()` gives an empty array, whose **UBound** is -1.

The elements are read as those of any array --- `Primes(2)`, with [**LBound**](../Modules/Information/LBound) and [**UBound**](../Modules/Information/UBound) for the bounds --- but the array cannot be changed or used as a whole:

- Assigning to an element is compile error **TB5050**, *bad constant array accessor*.
- **For Each** over the array is compile error **TB5109**; loop from **LBound** to **UBound** instead.
- The array cannot be assigned to an array variable or a **Variant**, or passed as an array argument. To copy it, copy it element by element.
- An element cannot be used in another constant expression: `Const First As Long = Primes(0)` is compile error **TB5002**.

```tb check_run
Const Primes() As Long = Array(2, 3, 5, 7, 11)
Dim i As Long, Total As Long
For i = LBound(Primes) To UBound(Primes)
    Total += Primes(i)
Next
Debug.Print UBound(Primes)      ' 4
Debug.Print Total               ' 28
```

> [!NOTE]
> Array constants are a twinBASIC extension. In VBA and VB6, `Const Primes() As Long = Array(2, 3)` is a syntax error.


## Example

This example uses the **Const** statement to declare constants for use in place of literal values. **Public** constants are declared in the General section of a standard module, rather than a class module. **Private** constants are declared in the General section of any type of module.

```tb check_build
' Constants are Private by default. 
Const MyVar = 459 
 
' Declare Public constant. 
Public Const MyString = "HELP" 
 
' Declare Private Integer constant. 
Private Const MyInt As Integer = 5 
 
' Declare multiple constants on same line. 
Const MyStr = "Hello", MyDouble As Double = 3.4567 
```
