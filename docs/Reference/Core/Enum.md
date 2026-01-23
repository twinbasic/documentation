---
title: Enum
parent: Statements
permalink: /tB/Core/Enum
---

# Enum
{: .no_toc }

Declares a type for an enumeration.

Syntax:

> [ *attributes* ]  
> [ **Public** | **Private** ] **Enum** *name*  
> &nbsp;&nbsp;&nbsp;&nbsp;*membername* [**=** *constantexpression* ]   
> &nbsp;&nbsp;&nbsp;&nbsp;*membername* [**=** *constantexpression* ] . . .  
> **End Enum**

*attributes*
: *optional* One or more of:  
[EnumId](Attributes#enumid), [Flags](Attributes#flags), [PopulateFrom](Attributes#populatefrom)

**Public**
: *optional* Specifies that the **Enum** type is visible throughout the project. **Enum** types are **Public** by default.

**Private**
: *optional* Specifies that the **Enum** type is visible only within the module in which it appears.

*name*
:  The name of the **Enum** type. The *name* must be a valid Visual Basic identifier and is specified as the type when declaring variables or parameters of the **Enum** type.

*membername*
:  A valid Visual Basic identifier specifying the name by which a constituent element of the **Enum** type will be known.

*constantexpression*
: *optional* Value of the element (evaluates to a **Long**). If no *constantexpression* is specified, the value assigned is either zero (if it is the first *membername* ), or 1 greater than the value of the immediately preceding *membername*.

Enumeration variables are variables declared with an **Enum** type. Both variables and parameters can be declared with an **Enum** type. The elements of the **Enum** type are initialized to constant values within the **Enum** statement. The assigned values can't be modified at run time and can include both positive and negative numbers. For example:

```vb
Enum SecurityLevel 
 IllegalEntry = -1 
 SecurityLevel1 = 0 
 SecurityLevel2 = 1 
End Enum 
```

An **Enum** statement can appear only at the module level. After the **Enum** type is defined, it can be used to declare variables, parameters, or procedures returning its type. You can't qualify an **Enum** type name with a module name.

**Public Enum** types in a class module are not members of the class; however, they are written to the type library. **Enum** types defined in standard modules aren't written to type libraries. **Public Enum** types of the same name can't be defined in both standard modules and class modules because they share the same name space. When two **Enum** types in different type libraries have the same name, but different elements, a reference to a variable of the type depends on which type library has higher priority in the **References**.

You can't use an **Enum** type as the target in a **With** block.

### Example

The following example shows the **Enum** statement used to define a collection of named constants. In this case, the constants are colors you might choose to design data entry forms for a database.

```vb
Public Enum InterfaceColors 
 icMistyRose = &HE1E4FF& 
 icSlateGray = &H908070& 
 icDodgerBlue = &HFF901E& 
 icDeepSkyBlue = &HFFBF00& 
 icSpringGreen = &H7FFF00& 
 icForestGreen = &H228B22& 
 icGoldenrod = &H20A5DA& 
 icFirebrick = &H2222B2& 
End Enum
```

{% include VBA-Attribution.md %}