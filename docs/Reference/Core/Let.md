---
title: Let
parent: Statements
permalink: /tB/Core/Let
vba_attribution: true
---
# Let
{: .no_toc }

Assigns the value of an expression to a variable or property.

Syntax:
> [ **Let** ] *varname* **=** *expression*

**Let**
: *optional* Explicit use of the **Let** keyword is a matter of style; it is usually omitted.

*varname*
: Name of the variable or property; follows standard variable naming conventions.

*expression*
: Value assigned to the variable or property.

A value expression can be assigned to a variable or property only if it is of a data type that is compatible with the variable. String expressions cannot be assigned to numeric variables, and numeric expressions cannot be assigned to string variables. Such an assignment raises an error at compile time.

**Variant** variables can be assigned to either string or numeric expressions. However, the reverse is not always true. Any **Variant** except a **Null** can be assigned to a string variable, but only a **Variant** whose value can be interpreted as a number can be assigned to a numeric variable. Use the **IsNumeric** function to determine if the **Variant** can be converted to a number.

Assigning an expression of one numeric type to a variable of a different numeric type coerces the value of the expression into the numeric type of the resulting variable.

**Let** statements can be used to assign one record variable to another only when both variables are of the same user-defined type. Use the **LSet** statement to assign record variables of different user-defined types. Use the [**Set**](Set) statement to assign object references to variables.

An object assigned without **Set** gives the value of its default member: assigning a **StdFont** to a **Variant** assigns its **Name**. An object whose class has no default member raises error 438, *Object doesn't support this property or method*. A default member that needs an argument, such as the **Item** of a **Collection**, is refused at compile time when the variable is not a **Variant**: TB5092, *Missing argument 'Index'*.

```tb check_run
Dim Fnt As New StdFont
Dim V As Variant
Fnt.Name = "Arial"
V = Fnt                     ' no Set: the value of the default member, Name
Debug.Print TypeName(V)     ' String
Debug.Print V               ' Arial
```

<!-- test: bug let-object-result-stored -->
> [!WARNING] BETA 1042
> An object whose default member needs an argument, such as a **Collection** or a **Scripting.Dictionary**, assigned to a **Variant** without **Set**, is stored in the **Variant** with no error when it comes from a function, from `New Collection` or from **CreateObject**; so is an object of a class with no default member that a function returns. VB6 raises error 450, *Wrong number of arguments or invalid property assignment*, or error 438, and leaves the **Variant** as it was. The same object in a variable raises -2147352561, *Parameter not optional.*, where VB6 raises 450. Use **Set** to assign an object.

### Example

This example assigns the values of expressions to variables by using the explicit **Let** statement.

```tb check_build
Dim MyStr, MyInt
' The following variable assignments use the Let statement.
Let MyStr = "Hello World"
Let MyInt = 5
```

The following are the same assignments without the **Let** statement.

```tb check_build
Dim MyStr, MyInt
MyStr = "Hello World"
MyInt = 5
```

### See Also

- [**Set** statement](Set)
- [**LSet** statement](LSet)
- [**Property** statement](Property)
