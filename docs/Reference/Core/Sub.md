---
title: Sub
parent: Statements
permalink: /tB/Core/Sub
vba_attribution: true
---
# Sub
{: .no_toc }

Declares the name, arguments, and code that form the body of a **Sub** procedure.

Syntax:
> [ *attributes* ]  
> [ **Public** \| **Private** \| **Friend** \| **Protected** ] [ **Static** ] [ **Overridable** ] **Sub** *name* [ **(** **Of** *typevars* **)** ] [ **(** *arglist* **)** ] [ *binding-clause* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Exit Sub** ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
> **End Sub**

*attributes*
: *optional* One or more of the [supported attributes](Attributes) for procedures.

**Public**
: *optional*  Indicates that the **Sub** procedure is accessible to all other procedures in all modules. If used in a module that contains an **Option Private**, the procedure is not available outside the project.

**Private**
: *optional*  Indicates that the **Sub** procedure is accessible only to other procedures in the module where it is declared.

**Friend**
: *optional*  Used only in a class module. Indicates that the **Sub** procedure is visible throughout the project, but not visible to a controller of an instance of an object.

**[Protected](Protected)**
: *optional*  (twinBASIC) Used only in a class. Indicates that the **Sub** procedure is accessible from inside the declaring class and from classes that derive from it via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop), but not from outside callers.

**[Static](Static)**
: *optional*  Indicates that the **Sub** procedure's local variables are preserved between calls. The **Static** attribute doesn't affect variables that are declared outside the **Sub**, even if they are used in the procedure.

**Overridable**
: *optional*  (twinBASIC) Marks the **Sub** as an inheritance hook that classes derived via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop) may replace with an **Overrides** clause. Meaningful only on a member of a class that participates in an **Inherits** hierarchy.

*name*
: Name of the **Sub**; follows standard variable naming conventions. The special name `New` declares an instance constructor — see [Inheritance](../../Features/Language/Inheritance) for chained construction with `*baseclass*.New(...)`.

**Of** *typevars*
: *optional*  One or more type variable names, following standard variable naming conventions. The names are separated by commas. Causes the procedure to be a generic **Sub**.

*arglist*
: *optional*  List of variables representing arguments that are passed to the **Sub** procedure when it is called. Multiple variables are separated by commas. See [*arglist*](#arglist) below for syntax.

*binding-clause*
: *optional*  (twinBASIC) One of three trailing clauses that bind this body to a member declared elsewhere:

  - **Handles** *object*.*event* [ **,** *object*.*event* … ] — wires this **Sub** up as a handler for the named event(s), replacing the traditional `Object_Event` naming convention. See [**Handles** statement](Handles).
  - **Implements** *iface*.*member* [ **,** *iface2*.*member2* … ] — provides the body for the named [**Interface**](Interface) (or [**Class**](Class)) member, replacing the traditional `Iface_Member` naming convention. A comma-separated list lets one body satisfy several interfaces' members at once. See [**Implements** statement](Implements).
  - **Overrides** *base*.*member* — supplies the body for an **Overridable** *member* inherited via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop). Combine with **Overridable** on the same header to allow further-derived classes to override again.

*statements*
: *optional*  Any group of statements to be executed within the **Sub** procedure.

**[Exit Sub](Exit)**
: *optional*  Immediately returns from the **Sub** procedure. (A bare [**Return**](Return) statement does *not* exit a **Sub** — it is reserved for the [**GoSub...Return**](GoSub-Return) construct.)

### *arglist*

Syntax: One or more of  
[ **Optional** ] [ **ByVal** \| **ByRef** ] [ **[ParamArray](ParamArray)** ] *varname* [ **()** ] [ **As** *type* ] [ **=** *defaultvalue* ]

**Optional**
: *optional*  Indicates that an argument is not required. If used, all subsequent arguments in *arglist* must also be optional and declared by using the **Optional** keyword. **Optional** can't be used for any argument if **ParamArray** is used.

**ByVal**
: *optional*  Indicates that the argument is passed by value.

**ByRef**
: *optional*  Indicates that the argument is passed by reference. **ByRef** is the default unlike in Visual Basic .NET.

**[ParamArray](ParamArray)**
: *optional*  Used only as the last argument in *arglist* to indicate that the final argument is an **Optional** array of **Variant** elements. The **ParamArray** keyword allows you to provide an arbitrary number of arguments. It may not be used with **ByVal**, **ByRef**, or **Optional**.

*varname*
: Name of the variable representing the argument; follows standard variable naming conventions.

*type*
: *optional*  Data type of the argument passed to the procedure; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (variable length only), **Object**, **Variant**, a specific object type, or the name of a generic type argument. If the parameter is not **Optional**, a user-defined type may also be specified.  
If the name of a generic type parameter is used, it becomes bound to the concrete type of the argument passed to the procedure. The name binding has the scope of the body of the procedure.

*defaultvalue*
: *optional*  Any constant or constant expression. Valid for **Optional** parameters only. If the type is an **Object**, an explicit default value can only be **Nothing**.

If not explicitly specified by using **Public**, **Private**, or **Friend**, **Sub** procedures are public by default.

If **Static** isn't used, the value of local variables is not preserved between calls.

The **Friend** keyword can only be used in class modules. However, **Friend** procedures can be accessed by procedures in any module of a project. A **Friend** procedure does not appear in the type library of its parent class, nor can a **Friend** procedure be late bound.

**Sub** procedures can be recursive; that is, they can call themselves to perform a given task. However, recursion can lead to stack overflow. The **Static** keyword usually is not used with recursive **Sub** procedures.

All executable code must be in procedures. You can't define a **Sub** procedure inside another **[Sub](Sub)**, **[Function](Function)**, or **[Property](Property)** procedure.

The **[Exit Sub](Exit)** statement causes an immediate exit from a **Sub** procedure. Program execution continues with the statement following the statement that called the **Sub** procedure. Any number of **Exit Sub** statements can appear anywhere in a **Sub** procedure.

Like a **Function** procedure, a **Sub** procedure is a separate procedure that can take arguments, perform a series of statements, and change the value of its arguments. However, unlike a **Function** procedure, which returns a value, a **Sub** procedure can't be used in an expression.

You call a **Sub** procedure by using the procedure name followed by the argument list. See the **[Call](Call)** statement for specific information about how to call **Sub** procedures.

Variables used in **Sub** procedures fall into two categories: those that are explicitly declared within the procedure and those that are not. Variables that are explicitly declared in a procedure (using **Dim** or the equivalent) are always local to the procedure. Variables that are used but not explicitly declared in a procedure are also local unless they are explicitly declared at some higher level outside the procedure.

A procedure can use a variable that is not explicitly declared in the procedure, but a naming conflict can occur if anything you defined at the module level has the same name. If your procedure refers to an undeclared variable that has the same name as another procedure, constant, or variable, it is assumed that your procedure is referring to that module-level name. To avoid this kind of conflict, explicitly declare variables. Use an **[Option Explicit](Option#Explicit)** statement to force explicit declaration of variables.

> [!NOTE]
> You can't use **GoSub**, **GoTo**, or **Return** to enter or exit a **Sub** procedure. Use [**Exit Sub**](Exit) to leave a **Sub** early.

### Example

This example uses the **Sub** statement to define the name, arguments, and code that form the body of a **Sub** procedure.

```tb
' Sub procedure definition.
' Sub procedure with two arguments.
Sub SubComputeArea(Length As Double, TheWidth As Double)
    Dim Area As Double ' Declare local variable.

    If Length = 0 Or TheWidth = 0 Then
        ' If either argument = 0.
        Exit Sub ' Exit Sub immediately.
    End If

    Area = Length * TheWidth ' Calculate area of rectangle.
    Debug.Print Area ' Print Area to Debug window.
End Sub
```

### See Also

- [**Call** statement](Call)
- [**Function** statement](Function)
- [**Property** statement](Property)
- [**Exit** statement](Exit)
- [**Return** statement](Return)
- [**Implements** statement](Implements)
- [**Handles** statement](Handles)
- [**Protected** statement](Protected)
- [Handler Method Syntax](../../Features/Language/Handlers)
- [Inheritance](../../Features/Language/Inheritance)
- [Generics](../../Features/Language/Generics)
