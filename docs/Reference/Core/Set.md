---
title: Set
parent: Statements
permalink: /tB/Core/Set
vba_attribution: true
---
# Set
{: .no_toc }

Assigns an object reference to a variable or property.

Syntax:
> **Set** *objectvar* **=** { [ **New** ] *objectexpression* \| **Nothing** }

*objectvar*
: Name of the variable or property; follows standard variable naming conventions.

**[New](New)**
: *optional* **New** is usually used during declaration to enable implicit object creation. When **New** is used with **Set**, it creates a new instance of the class. If *objectvar* contained a reference to an object, that reference is released when the new one is assigned. The **New** keyword can't be used to create new instances of any intrinsic data type and can't be used to create dependent objects.

*objectexpression*
: Expression consisting of the name of an object, another declared variable of the same object type, or a function or method that returns an object of the same object type.

**Nothing**
: *optional* Discontinues association of *objectvar* with any specific object. Assigning **Nothing** to *objectvar* releases all the system and memory resources associated with the previously referenced object when no other variable refers to it.

To be valid, *objectvar* must be an object type consistent with the object being assigned to it.

The [**Dim**](Dim), [**Private**](Private), [**Public**](Public), [**ReDim**](ReDim), and [**Static**](Static) statements only declare a variable that refers to an object. No actual object is referred to until the **Set** statement assigns a specific object.

The following example illustrates how **Dim** is used to declare an array with the type `Form1`. No instance of `Form1` actually exists. **Set** then assigns references to new instances of `Form1` to the `myChildForms` variable. Such code might be used to create child forms in an MDI application.

```tb
Dim myChildForms(1 To 4) As Form1
Set myChildForms(1) = New Form1
Set myChildForms(2) = New Form1
Set myChildForms(3) = New Form1
Set myChildForms(4) = New Form1
```

Generally, when **Set** is used to assign an object reference to a variable, no copy of the object is created for that variable. Instead, a reference to the object is created. More than one object variable can refer to the same object. Because such variables are references to the object rather than copies of the object, any change in the object is reflected in all variables that refer to it. However, when the **New** keyword is used in the **Set** statement, an instance of the object is actually created.

### Example

This example uses the **Set** statement to assign object references to variables. *YourObject* is assumed to be a valid object with a **Text** property.

```tb
Dim YourObject, MyObject, MyStr
Set MyObject = YourObject    ' Assign object reference.
' MyObject and YourObject refer to the same object.
YourObject.Text = "Hello World"    ' Initialize property.
MyStr = MyObject.Text    ' Returns "Hello World".

' Discontinue association. MyObject no longer refers to YourObject.
Set MyObject = Nothing    ' Release the object.
```

### See Also

- [**Let** statement](Let)
- [**New** keyword](New)
- [**Dim** statement](Dim)
- [**Property** statement](Property)
