---
title: Type
parent: Statements
permalink: /tB/Core/Type
vba_attribution: true
---
# Type
{: .no_toc }

Used at the module level to define a user-defined data type containing one or more elements.

Syntax:
> [ *attributes* ]  
> [ **Private** \| **Public** ] **Type** *varname* [ **(** **Of** *typevars* **)** ]  
> &nbsp;&nbsp;&nbsp;&nbsp; *elementname* [ **(** [ *subscripts* ] **)** ] **As** *type*  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *elementname* [ **(** [ *subscripts* ] **)** ] **As** *type* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; **. . .**  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *member-procedure* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; **. . .**  
> **End Type**

*attributes*
: *optional* (twinBASIC) Type-level attributes. Most notably [**PackingAlignment**](Attributes#packingalignment), which sets the field-alignment value used when laying out the UDT in memory --- useful for interop with C structs declared under `#pragma pack` or `#include <pshpack1.h>`.

**Public**
: *optional* Used to declare user-defined types that are available to all procedures in all modules in all projects.

**Private**
: *optional* Used to declare user-defined types that are available only within the module where the declaration is made.

*varname*
: Name of the user-defined type; follows standard variable naming conventions.

*elementname*
: Name of an element of the user-defined type. Element names also follow standard variable naming conventions, except that keywords can be used.

*subscripts*
: *optional* Dimensions of an array element. When not explicitly stated in *lower*, the lower bound of an array is controlled by the [**Option Base**](Option#Base) statement. The lower bound is zero if no **Option Base** statement is present.

*type*
: Data type of the element; may be **Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (for variable-length strings), **String** *length* (for fixed-length strings), **Object**, **Variant**, another user-defined type, or an object type. In a generic **Type** (see below), *type* may also be one of the *typevars* introduced in the **Of** clause.

**Of** *typevars*
: *optional* (twinBASIC) One or more type variable names, separated by commas, that make the **Type** a *generic UDT*. Each type variable can be referenced as the *type* of an element. See [Generics](../../Features/Language/Generics). Generic UDTs do not yet support member procedures.

*member-procedure*
: *optional* (twinBASIC) A [**Sub**](Sub), [**Function**](Function), or [**Property**](Property) procedure, or a [**Declare**](Declare) external procedure, written inside the **Type** body and callable through any variable of that type. See [twinBASIC enhancements](#twinbasic-enhancements) below.

The **Type** statement can be used only at the module level. After a user-defined type has been declared by using the **Type** statement, a variable of that type can be declared anywhere within the scope of the declaration. Use [**Dim**](Dim), [**Private**](Private), [**Public**](Public), [**ReDim**](ReDim), or [**Static**](Static) to declare a variable of a user-defined type.

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

When a fixed-size array is declared within a user-defined type, its dimensions must be declared with numeric literals or constants rather than variables.

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

### twinBASIC enhancements

twinBASIC extends classic VBA's **Type** in several ways. UDTs remain stack-allocated structs that can be passed to Win32 APIs, but they can also have behaviour like a lightweight class.

**Member procedures.** [**Sub**](Sub), [**Function**](Function), and [**Property**](Property) procedures may appear inside `Type ... End Type`, and are called through any variable of the type. Inside a member procedure, other members of the same UDT must be accessed with the explicit `Me.` prefix.

**Lifecycle and operator hooks.** Well-known member names are connected by the compiler:

| Member | Purpose |
|:---|:---|
| `Type_Initialize` | Constructor --- runs when a variable of the type is created. |
| `Type_Terminate` | Destructor --- runs when the variable goes out of scope. |
| `Type_Assignment` | Assignment operator --- `=` assigns *RHS* to a variable of the type. The signature is `Sub Type_Assignment(ByVal RHS As ...)`, and several overloads with different *RHS* types may coexist. |
| `Type_Conversion` | Conversion operator --- produces a value of another type from the UDT. The signature is `Function Type_Conversion() As ...`, and several overloads with different return types may coexist. |
| `Type_DebugView` | Debugger display --- returns a **String** shown in the IDE's variable inspector. |

**API declarations inside a UDT.** A [**Declare**](Declare) statement inside a **Type** body works as a regular module-level declaration, except that when its first parameter is named `Me` and is the same type as the UDT, calls on a variable of that type pass the variable as the first argument implicitly:

```tb
Type HWND
    Value As LongPtr
    Public Declare PtrSafe Function BringWindowToTop Lib "user32" (ByVal Me As HWND) As Long
End Type

Dim h As HWND
h.BringWindowToTop()  ' Passes h as the first argument to the API.
```

**Custom packing.** The [**PackingAlignment**](Attributes#packingalignment) type-level attribute controls alignment of the UDT's fields. The default packing places each field at a multiple of its own size (with trailing padding so the total size is a multiple of the largest field). Setting `[PackingAlignment(1)]` packs fields with no padding --- matching `#pragma pack(push, 1)` in C.

```tb
[PackingAlignment(2)]
Private Type MyUDT
    x As Integer
    y As Long
    z As Integer
End Type
```

**Generic types.** A type variable list `(Of T)` after the *varname* makes the **Type** generic. Element types may then reference the type variables. Member procedures are not yet supported on generic UDTs.

```tb
Type ListU(Of T)
    value() As T
End Type
```

### See Also

- [**Dim** statement](Dim)
- [**Private** statement](Private)
- [**Public** statement](Public)
- [**Enum** statement](Enum)
- [**Class** statement](Class)
- [UDT Enhancements](../../Features/Language/UDTs)
- [Generics](../../Features/Language/Generics)
