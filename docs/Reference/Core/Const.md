---
title: Const
parent: Statements
permalink: /tB/Core/Const
---

# Const

{: no_toc }

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
: *optional*  Keyword used at the class or module level to declare constants that are available only within the class or module where the declaration is made. Not allowed in procedures.

*constname*

: Name of the constant; follows standard variable naming conventions.

*type*

: *optional* The data type of the constant; may be Byte, Boolean, Integer, Long, Currency, Single, Double, Decimal (not currently supported), Date, String, or Variant. Use a separate **As** *type* clause for each constant being declared.

*expression*

: Required. Literal, other constant, or any combination that includes all arithmetic or logical operators except **Is**.

Constants are private by default. Within procedures, constants are always private; their visibility can't be changed. In standard modules, the default visibility of module-level constants can be changed by using the **Public** keyword. In class modules, however, constants can only be private and their visibility can't be changed by using the **Public** keyword.

To combine several constant declarations on the same line, separate each constant assignment with a comma. When constant declarations are combined in this way, the **Public** or **Private** keyword, if used, applies to all of them.

You can't use variables, user-defined functions, or intrinsic Visual Basic functions (such as **Chr**) in expressions assigned to constants.

> [!NOTE]
> Constants can make your programs self-documenting and easy to modify. Unlike variables, constants can't be inadvertently changed while your program is running.

If you don't explicitly declare the constant type by using **As** *type*, the constant has the data type that is most appropriate for *expression*.

Constants declared in a **Sub**, **Function**, or **Property** procedure are local to that procedure. A constant declared outside a procedure is defined throughout the module in which it is declared. Use constants anywhere you can use an expression.


### Example

This example uses the **Const** statement to declare constants for use in place of literal values. **Public** constants are declared in the General section of a standard module, rather than a class module. **Private** constants are declared in the General section of any type of module.

```vb
' Constants are Private by default. 
Const MyVar = 459 
 
' Declare Public constant. 
Public Const MyString = "HELP" 
 
' Declare Private Integer constant. 
Private Const MyInt As Integer = 5 
 
' Declare multiple constants on same line. 
Const MyStr = "Hello", MyDouble As Double = 3.4567 
```

{% include VBA-Attribution.md %}
