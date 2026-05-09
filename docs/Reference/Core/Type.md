---
title: Type
parent: Statements
permalink: /tB/Core/Type
---
# Type
{: .no_toc }

Used at the module level to define a user-defined data type containing one or more elements.

Syntax:
> [ **Private** \| **Public** ] **Type** *varname*  
> &nbsp;&nbsp;&nbsp;&nbsp; *elementname* [ **(** [ *subscripts* ] **)** ] **As** *type*  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *elementname* [ **(** [ *subscripts* ] **)** ] **As** *type* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; **. . .**  
> **End Type**

**Public**
: *optional*  Used to declare user-defined types that are available to all procedures in all modules in all projects.

**Private**
: *optional*  Used to declare user-defined types that are available only within the module where the declaration is made.

*varname*
: Name of the user-defined type; follows standard variable naming conventions.

*elementname*
: Name of an element of the user-defined type. Element names also follow standard variable naming conventions, except that keywords can be used.

*subscripts*
: *optional*  Dimensions of an array element. When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

*type*
: Data type of the element; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal** (not currently supported), **Date**, **String** (for variable-length strings), **String** *length* (for fixed-length strings), **Object**, **Variant**, another user-defined type, or an object type.

The **Type** statement can be used only at the module level. After you have declared a user-defined type by using the **Type** statement, you can declare a variable of that type anywhere within the scope of the declaration. Use [**Dim**](Dim), [**Private**](Private), [**Public**](Public), [**ReDim**](ReDim), or [**Static**](Static) to declare a variable of a user-defined type.

In standard modules and class modules, user-defined types are public by default. This visibility can be changed by using the **Private** keyword.

Line numbers and line labels aren't allowed in **Type...End Type** blocks.

User-defined types are often used with data records, which frequently consist of a number of related elements of different data types.

The following example shows the use of fixed-size arrays in a user-defined type:

```tb
Type StateData
    CityCode (1 To 100) As Integer    ' Declare a static array.
    County As String * 30
End Type

Dim Washington(1 To 100) As StateData
```

In the preceding example, `StateData` includes the `CityCode` static array, and the record `Washington` has the same structure as `StateData`.

When you declare a fixed-size array within a user-defined type, its dimensions must be declared with numeric literals or constants rather than variables.

### Example

This example uses the **Type** statement to define a user-defined data type. The **Type** statement is used at the module level only. If it appears in a class module, a **Type** statement must be preceded by the keyword **Private**.

```tb
Type EmployeeRecord    ' Create user-defined type.
    ID As Integer    ' Define elements of data type.
    Name As String * 20
    Address As String * 30
    Phone As Long
    HireDate As Date
End Type

Sub CreateRecord()
    Dim MyRecord As EmployeeRecord    ' Declare variable.

    ' Assignment to EmployeeRecord variable must occur in a procedure.
    MyRecord.ID = 12003    ' Assign a value to an element.
End Sub
```

### See Also

- [**Dim** statement](Dim)
- [**Private** statement](Private)
- [**Public** statement](Public)
- [**Enum** statement](Enum)
- [**Class** statement](Class)

{% include VBA-Attribution.md %}
