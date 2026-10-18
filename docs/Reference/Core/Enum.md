---
title: Enum
parent: Statements
permalink: /tB/Core/Enum
index_also: enumerated constant
vba_attribution: true
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
: The name of the **Enum** type. The *name* must be a valid Visual Basic identifier and is specified as the type when declaring variables or parameters of the **Enum** type.

*membername*
: A valid Visual Basic identifier specifying the name by which a constituent element of the **Enum** type will be known. A name in square brackets can also hold spaces and other characters an identifier cannot, as in `[A4 Portrait]` or `[_Max]`.

*constantexpression*
: *optional* Value of the element (evaluates to a **Long**). If no *constantexpression* is specified, the value assigned is either zero (if it is the first *membername* ), or 1 greater than the value of the immediately preceding *membername*.

Enumeration variables are variables declared with an **Enum** type. Both variables and parameters can be declared with an **Enum** type. The elements of the **Enum** type are initialized to constant values within the **Enum** statement. The assigned values can't be modified at run time and can include both positive and negative numbers. For example:

```tb check_build
Enum SecurityLevel 
 IllegalEntry = -1 
 SecurityLevel1 = 0 
 SecurityLevel2 = 1 
End Enum 
```

An **Enum** statement can appear only at the module level. After the **Enum** type is defined, it can be used to declare variables, parameters, or procedures returning its type. An **Enum** type name cannot be qualified with a module name.

**Public Enum** types in a class module are not members of the class; however, the type library of an ActiveX DLL contains every one of them, whether or not a member uses it. A **Public Enum** in a standard module is written to the type library only when a public member of a public class or interface uses it as the type of a parameter, a return value, a property, a public variable or an event argument. A standard-module **Enum** that no such member uses is left out, and so is one used only by a **Private** or **Friend** procedure, by a **Private** class, or by a procedure in a standard module. The members of an **Enum** are written in the order they are declared, not in the order of their values, and the [EnumId](Attributes#enumid) attribute sets the GUID the type library records for it. **Public Enum** types of the same name can't be defined in both standard modules and class modules because they share the same name space. When two **Enum** types in different type libraries have the same name, but different elements, a reference to a variable of the type depends on which type library has higher priority in the **References**.

An **Enum** type cannot be used as the target in a **With** block.

> [!NOTE]
> An **Enum** member cannot carry an attribute. Written before the member on the same line, as in `[Hidden] Red = 5`, an attribute is error **TB5182**. On a line of its own inside the **Enum**, a bracketed name such as `[Hidden]` is not an attribute but a member with that name, and it takes a value like any other member. An **Enum** whose body is `[Hidden]` followed by `Red` therefore has two members: `[Hidden]`, which is 0, and `Red`, which is 1.

### Example

The following example shows the **Enum** statement used to define a collection of named constants. In this case, the constants are colors that might be used to design data entry forms for a database.

```tb check_build
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