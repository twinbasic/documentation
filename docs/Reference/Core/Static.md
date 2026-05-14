---
title: Static
parent: Statements
permalink: /tB/Core/Static
vba_attribution: true
---
# Static
{: .no_toc }

Used at the procedure level to declare variables and allocate storage space. Variables declared with the **Static** statement retain their values as long as the code is running.

Syntax:
> **Static** *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ] [ **,** *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ]] **. . .**

*varname*
: Name of the variable; follows standard variable naming conventions.

*subscripts*
: *optional* Dimensions of an array variable; up to 60 multiple dimensions may be declared. The *subscripts* argument uses the following syntax: [ *lower* **To** ] *upper* [ , [ *lower* **To** ] *upper* ] **. . .**. When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

**New**
: *optional* Keyword that enables implicit creation of an object. When **New** is used to declare the object variable, a new instance of the object is created on first reference to it, so the **[Set](Set)** statement is not required to assign the object reference. The **New** keyword can't be used to declare variables of any intrinsic data type or to declare instances of dependent objects.

*type*
: *optional* Data type of the variable; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (for variable-length strings), **String** *length* (for fixed-length strings), **Object**, **Variant**, a user-defined type, or an object type. Use a separate **As** *type* clause for each variable being defined.

After module code is running, variables declared with the **Static** statement retain their value until the module is reset or restarted. In class modules, variables declared with the **Static** statement retain their value in each class instance until that instance is destroyed. In form modules, static variables retain their value until the form is closed.

Use the **Static** statement in nonstatic procedures to explicitly declare variables that are visible only within the procedure, but whose lifetime is the same as the module in which the procedure is defined.

Use a **Static** statement within a procedure to declare the data type of a variable that retains its value between procedure calls. For example, the following statement declares a fixed-size array of integers:

```tb
Static EmployeeNumber(200) As Integer
```

The following statement declares a variable for a new instance of a worksheet:

```tb
Static X As New Worksheet
```

If the **New** keyword isn't used when declaring an object variable, the variable that refers to the object must be assigned an existing object by using the **Set** statement before it can be used. Until it is assigned an object, the declared object variable has the special value **Nothing**, which indicates that it doesn't refer to any particular instance of an object. When the **New** keyword is used in the declaration, an instance of the object is created on the first reference to the object.

When no data type or object type is specified, and there is no [**Deftype**](Deftype) statement in the module, the variable is **Variant** by default.

> [!NOTE]
> The **Static** statement and the **Static** keyword are similar, but used for different effects. When a procedure is declared by using the **Static** keyword (as in `Static Sub CountSales()`), the storage space for all local variables within the procedure is allocated once, and the value of the variables is preserved for the entire time the program is running. For nonstatic procedures, storage space for variables is allocated each time the procedure is called and released when the procedure is exited. The **Static** statement is used to declare specific variables within nonstatic procedures to preserve their value for as long as the program is running.

When variables are initialized, a numeric variable is initialized to 0, a variable-length string is initialized to a zero-length string (""), and a fixed-length string is filled with zeros. **Variant** variables are initialized to **Empty**. Each element of a user-defined type variable is initialized as if it were a separate variable.

By convention, **Static** statements within a procedure are placed at the beginning of the procedure with other declarative statements such as **[Dim](Dim)**.

### Example

This example uses the **Static** statement to retain the value of a variable for as long as the module code is running.

```tb
' Function definition.
Function KeepTotal(Number)
    ' Only the variable Accumulate preserves its value between calls.
    Static Accumulate
    Accumulate = Accumulate + Number
    KeepTotal = Accumulate
End Function

' Static function definition.
Static Function MyFunction(Arg1, Arg2, Arg3)
    ' All local variables preserve value between function calls.
    Accumulate = Arg1 + Arg2 + Arg3
    Half = Accumulate / 2
    MyFunction = Half
End Function
```

### See Also

- [**Dim** statement](Dim)
- [**Private** statement](Private)
- [**Public** statement](Public)
- [**Sub** statement](Sub)
- [**Function** statement](Function)
