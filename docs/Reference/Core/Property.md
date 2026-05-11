---
title: Property
parent: Statements
permalink: /tB/Core/Property
---
# Property
{: .no_toc }

Declares the name, arguments, and code that form the body of a **Property** procedure: a procedure that gets the value of a property, assigns a value to a property, or sets a reference to an object property.

A property is exposed to callers through up to three property procedures, all sharing the same *name* in the same module:

- A **Property Get** procedure returns the property's value (or object reference).
- A **Property Let** procedure assigns a non-object value to the property.
- A **Property Set** procedure assigns an object reference to the property.

Syntax:

- > [ *attributes* ]  
  > [ **Public** \| **Private** \| **Friend** \| **Protected** ] [ **Static** ] [ **Overridable** ] **Property Get** *name* [ **(** **Of** *typevars* **)** ] [ **(** *arglist* **)** ] [ **As** *type* ] [ *binding-clause* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ [ **Let** ] *name* **=** *expression* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ **Set** *name* **=** *expression* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ **Return** *expression* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ **Exit Property** ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > **End Property**

- > [ *attributes* ]  
  > [ **Public** \| **Private** \| **Friend** \| **Protected** ] [ **Static** ] [ **Overridable** ] **Property Let** *name* [ **(** **Of** *typevars* **)** ] **(** [ *arglist* **,** ] *value* **)** [ *binding-clause* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ **Exit Property** ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > **End Property**

- > [ *attributes* ]  
  > [ **Public** \| **Private** \| **Friend** \| **Protected** ] [ **Static** ] [ **Overridable** ] **Property Set** *name* [ **(** **Of** *typevars* **)** ] **(** [ *arglist* **,** ] *reference* **)** [ *binding-clause* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ **Exit Property** ] ...  
  > &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
  > **End Property**

*attributes*
: *optional* One or more of the [supported attributes](Attributes) for procedures.

**Public**
: *optional*  Indicates that the **Property** procedure is accessible to all other procedures in all modules. If used in a module that contains an **Option Private** statement, the procedure is not available outside the project.

**Private**
: *optional*  Indicates that the **Property** procedure is accessible only to other procedures in the module where it is declared.

**Friend**
: *optional*  Used only in a class module. Indicates that the **Property** procedure is visible throughout the project, but not visible to a controller of an instance of an object.

**[Protected](Protected)**
: *optional*  (twinBASIC) Used only in a class. Indicates that the **Property** procedure is accessible from inside the declaring class and from classes that derive from it via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop), but not from outside callers. All three accessor forms of the same property (**Get**, **Let**, **Set**) should agree on the access modifier.

**[Static](Static)**
: *optional*  Indicates that the **Property** procedure's local variables are preserved between calls. The **Static** attribute doesn't affect variables that are declared outside the **Property** procedure, even if they are used in the procedure.

**Overridable**
: *optional*  (twinBASIC) Marks the **Property** as an inheritance hook that classes derived via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop) may replace with an **Overrides** clause. Meaningful only on a member of a class that participates in an **Inherits** hierarchy.

*name*
: Name of the **Property** procedure; follows standard variable naming conventions, except that the same name is shared by the matching **Property Get**, **Property Let**, and **Property Set** procedures in the same module.

**Of** *typevars*
: *optional*  One or more type variable names, following standard variable naming conventions. The names are separated by commas. Causes the procedure to be a generic **Property** procedure. The matching **Property Get**, **Property Let**, and **Property Set** procedures must declare the same generic parameters.

*arglist*
: List of variables representing arguments that are passed to the **Property** procedure when it is called. Multiple arguments are separated by commas. The name and data type of each argument in a **Property Let** or **Property Set** procedure must be the same as the corresponding argument in the matching **Property Get** procedure. See [*arglist*](#arglist) below for syntax. *arglist* is optional for **Property Get**; for **Property Let** and **Property Set** at least the *value*/*reference* parameter is required.

**As** *type*
: *optional*  Data type of the value returned by the **Property Get** procedure; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (except fixed length), **Object**, **Variant**, a user-defined type, or an array. The return *type* of a **Property Get** procedure must be the same data type as the *value* parameter of the corresponding **Property Let** procedure (if one exists), or compatible with the *reference* parameter of the corresponding **Property Set** procedure.

*statements*
: *optional*  Any group of statements to be executed within the body of the **Property** procedure.

*expression*
: *optional*  In **Property Get**, the value (or reference, when assigned with **Set**) returned by the procedure.

*value*
: In **Property Let**, the variable that contains the value to be assigned to the property. When the procedure is called, this argument appears on the right side of the calling expression. The data type of *value* must be the same as the return type of the corresponding **Property Get** procedure. *value* cannot be **Optional** or a **ParamArray**.

*reference*
: In **Property Set**, the variable containing the object reference used on the right side of the object reference assignment. *reference* cannot be **Optional**.

*binding-clause*
: *optional*  (twinBASIC) One of three trailing clauses that bind this accessor to a member declared elsewhere:

  - **Handles** *object*.*event* [ **,** *object*.*event* … ] — wires the property up as a handler for the named event(s), replacing the traditional `Object_Event` naming convention. See [**Handles** statement](Handles).
  - **Implements** *iface*.*member* [ **,** *iface2*.*member2* … ] — provides the body for the named [**Interface**](Interface) (or [**Class**](Class)) member, replacing the traditional `Iface_Member` naming convention. A comma-separated list lets one body satisfy several interfaces' members at once. See [**Implements** statement](Implements).
  - **Overrides** *base*.*member* — supplies the body for an **Overridable** *member* inherited via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop). Combine with **Overridable** on the same header to allow further-derived classes to override again.

**[Exit Property](Exit)**
: *optional*  Immediately returns from the **Property** procedure without setting a return value. Valid in **Property Get**, **Property Let**, and **Property Set**.

**[Return](Return)** *expression*
: *optional*  Valid only in a **Property Get** procedure. Immediately returns from the procedure with *expression* as the property's value. The *expression* is required in this form; a bare **Return** is reserved for the [**GoSub...Return**](GoSub-Return) construct and does not exit a **Property** procedure.

### *arglist*

Syntax: One or more of  
[ **Optional** ] [ **ByVal** \| **ByRef** ] [ **[ParamArray](ParamArray)** ] *varname* [ **()** ] [ **As** *type* ] [ **=** *defaultvalue* ]

**Optional**
: *optional*  Indicates that an argument is not required. If used, all subsequent arguments in *arglist* must also be optional and declared by using the **Optional** keyword. The right side of a **Property Let** or **Property Set** call (the *value* or *reference* parameter) cannot be **Optional**.

**ByVal**
: *optional*  Indicates that the argument is passed by value.

**ByRef**
: *optional*  Indicates that the argument is passed by reference. **ByRef** is the default unlike in Visual Basic .NET.

**[ParamArray](ParamArray)**
: *optional*  Indicates that the argument is an **Optional** array of **Variant** elements. The **ParamArray** keyword allows you to provide an arbitrary number of arguments. It may not be used with **ByVal**, **ByRef**, or **Optional**, and it may not be the *value*/*reference* parameter of a **Property Let** or **Property Set** procedure.

*varname*
: Name of the variable representing the argument; follows standard variable naming conventions.

*type*
: *optional*  Data type of the argument passed to the procedure; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (variable length only), **Object**, **Variant**, a specific object type, or the name of a generic type argument. If the parameter is not **Optional**, a user-defined type may also be specified.  
If the name of a generic type parameter is used, it becomes bound to the concrete type of the argument passed to the procedure. The name binding has the scope of the body of the procedure.

*defaultvalue*
: *optional*  Any constant or constant expression. Valid for **Optional** parameters only. If the type is an **Object**, an explicit default value can only be **Nothing**.

If not explicitly specified by using **Public**, **Private**, or **Friend**, **Property** procedures are public by default. If **Static** isn't used, the value of local variables is not preserved between calls.

The **Friend** keyword can only be used in class modules. However, **Friend** procedures can be accessed by procedures in any module of a project. A **Friend** procedure doesn't appear in the type library of its parent class, nor can a **Friend** procedure be late bound.

All executable code must be in procedures. You can't define a **Property** procedure inside another **[Property](Property)**, **[Sub](Sub)**, or **[Function](Function)** procedure.

The **[Exit Property](Exit)** statement, and the **[Return](Return)** *expression* statement (in **Property Get** only), cause an immediate exit from a **Property** procedure. Program execution continues with the statement following the statement that called the **Property** procedure. Any number of these statements can appear anywhere in a **Property** procedure.

Like **Sub** and **Function** procedures, a **Property** procedure is a separate procedure that can take arguments, perform a series of statements, and change the values of its arguments. A **Property Get** procedure can be used on the right side of an expression in the same way as a **Function** or a property name. A **Property Let** procedure can only be used on the left side of a property assignment expression or [**Let**](Let) statement. A **Property Set** procedure can only be used on the left side of an object reference assignment or **[Set](Set)** statement.

### Example

This example uses the **Property** statements to define a `PenColor` property: a **Property Let** that accepts a color name as a string and stores a numeric code, and a **Property Get** that returns the color name from the stored numeric code.

```tb
Dim CurrentColor As Integer
Const BLACK = 0, RED = 1, GREEN = 2, BLUE = 3

' Set the pen color property for a Drawing package.
' The module-level variable CurrentColor is set to
' a numeric value that identifies the color used for drawing.
Property Let PenColor(ColorName As String)
    Select Case ColorName ' Check color name string.
        Case "Red"
            CurrentColor = RED ' Assign value for Red.
        Case "Green"
            CurrentColor = GREEN ' Assign value for Green.
        Case "Blue"
            CurrentColor = BLUE ' Assign value for Blue.
        Case Else
            CurrentColor = BLACK ' Assign default value.
    End Select
End Property

' Returns the current color of the pen as a string.
Property Get PenColor() As String
    Select Case CurrentColor
        Case RED:   PenColor = "Red"
        Case GREEN: PenColor = "Green"
        Case BLUE:  PenColor = "Blue"
    End Select
End Property

' Calling code:
PenColor = "Red"        ' Calls Property Let.
ColorName = PenColor    ' Calls Property Get.
```

A **Property Set** procedure assigns an object reference, in much the same way as **Property Let** assigns a value:

```tb
' The Pen property may be set to different Pen implementations.
Property Set Pen(P As Object)
    Set CurrentPen = P ' Assign Pen to object.
End Property
```

### See Also

- [**Sub** statement](Sub)
- [**Function** statement](Function)
- [**Let** statement](Let)
- [**Set** statement](Set)
- [**Exit** statement](Exit)
- [**Return** statement](Return)
- [**Implements** statement](Implements)
- [**Handles** statement](Handles)
- [**Protected** statement](Protected)
- [Handler Method Syntax](../../Features/Language/Handlers)
- [Inheritance](../../Features/Language/Inheritance)
- [Generics](../../Features/Language/Generics)

{% include VBA-Attribution.md %}
