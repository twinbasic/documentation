---
title: Declare
parent: Statements
permalink: /tB/Core/Declare
---

# Declare

Used at the module level to declare references to external procedures in a dynamic-link library (DLL).

> [!NOTE]
>
> **Declare** statements with the PtrSafe keyword is the recommended syntax. **Declare** statements that include **PtrSafe** work correctly in twinBASIC and VBA version 7 development environment on both 32-bit and 64-bit platforms only after all data types in the **Declare** statement (parameters and return values) that need to store 64-bit quantities are updated to use LongLong for 64-bit integrals or LongPtr for pointers and handles. To ensure backwards compatibility with VBA version 6 and earlier, use the following construct:

```vb
#If VBA7 Then 
Declare PtrSafe Sub... 
#Else 
Declare Sub... 
#EndIf
```
> [!NOTE]
>
> For code to run when built for 64-bit targets, all **Declare** statements must include the **PtrSafe** keyword, and all data types in the **Declare** statement (parameters and return values) that need to store 64-bit quantities must be updated to use **LongLong** for 64-bit integrals or **LongPtr** for pointers and handles.

Syntax:

- > [ *attributes* ]  
  > [ **Public** \| **Private** ] **Declare** [ **PtrSafe**  ] **Sub** *name* **Lib** "*libname*" [ **(** [ *arglist* ] **)** ]
- > [ *attributes* ]  
  > [ **Public** \| **Private** ] **Declare** [ **PtrSafe**  ] **Sub** *name* **Lib** "*libname*" **Alias** "*aliasname*" [ **(** [ *arglist* ] **)** ]
- > [ *attributes* ]  
  > [ **Public** \| **Private** ] **Declare** [ **PtrSafe** ] **Function** *name* **Lib** "*libname*" [ **(** [ *arglist* ] **)** ] [ **As** *type* ]
- > [ *attributes* ]  
  > [ **Public** \| **Private** ] **Declare** [ **PtrSafe** ] **Function** *name* **Lib** "*libname*" **Alias** "*aliasname*" [ **(** [ *arglist* ] **)** ] [ **As** *type* ]


*attributes*
: *optional* One or more of:  
[Description](Attributes#description), [DLLStackCheck](Attributes#dllstackcheck), [PreserveSig](Attributes#preservesig), [SetDllDirectory](Attributes#setdlldirectory), [UseGetLastError](Attributes#usegetlasterror)

**Public**
: *optional* Used to declare procedures that are available to all other procedures in all modules.

**Private**
: *optional* Used to declare procedures that are available only within the module where the declaration is made.

**PtrSafe**
: *required in 64-bits* The PtrSafe keyword asserts that a Declare statement is safe to run in 64-bit versions of Microsoft Office.

**Sub / Function**
: Indicates whether the procedure returns a value (**Function**) or not (**Sub**).

*name*
: Any valid procedure name. Note that DLL entry points are case-sensitive.

*libname*
: Name of the DLL or code resource that contains the declared procedure.

**Alias** *aliasname*
: *optional* Indicates that the procedure being called has another name in the DLL. This is useful when the external procedure name is the same as a keyword. You can also use Alias when a DLL procedure has the same name as a public variable, constant, or any other procedure in the same scope. Alias is also useful if any characters in the DLL procedure name aren't allowed by the DLL naming convention.  
*aliasname* names the procedure in the DLL or code resource. If the first character is not a number sign (**#**), *aliasname* is the name of the procedure's entry point in the DLL. If (**#**) is the first character, all characters that follow must indicate the ordinal number of the procedure's entry point.

*arglist* 
: *optional* List of variables representing arguments that are passed to the procedure when it is called.

*type*
: *optional* Data type of the value returned by a **Function** procedure; may be Byte, Boolean, Integer, Long, LongLong, LongPtr, Currency, Single, Double, Decimal (not currently supported), Date, String (variable length only), Variant, a user-defined type (UDT), or an object type. **LongLong** is a valid declared type only on 64-bit platforms.

### arglist

The *arglist* argument has the following syntax and parts:

Syntax: [ **Optional** ] [ **ByVal** \| **ByRef** ] [ **ParamArray** ] *varname* [ **( )** ] [ **As** *type* ]

**Optional**
: *optional* Indicates that an argument is not required. If used, all subsequent arguments in *arglist* must also be optional and declared by using the **Optional** keyword. **Optional** can't be used for any argument if **ParamArray** is used.

**ByVal**
: *optional* Indicates that the argument is passed by value.

**ByRef**
: *optional* Indicates that the argument is passed by reference. **ByRef** is the default unlike in Visual Basic .NET.

**ParamArray**
: *optional* Used only as the last argument in arglist to indicate that the final argument is an **Optional** array of **Variant** elements. The **ParamArray** keyword allows you to provide an arbitrary number of arguments. The ParamArray keyword can't be used with **ByVal**, **ByRef**, or **Optional**.

*varname*
: Name of the variable representing the argument being passed to the procedure; follows standard variable naming conventions.

**( )**
:  Required for array variables. Indicates that *varname* is an array.

*type*
: *optional* Data type of the argument passed to the procedure; may be **Byte**, **Boolean**, **Integer**, **Long**, **LongLong**, **LongPtr**, **Currency**, **Single**, **Double**, **Decimal** (not currently supported), **Date**, **String** (variable length only), **Object**, **Variant**, a user-defined type (UDT), or an object type. (**LongLong** is a valid declared type only on 64-bit platforms.)

If you include an argument list, the number and type of arguments are checked each time the procedure is called. The First sub in the following example takes one **Long** argument, wherease the Second sub takes no arguments:

```vb
Declare Sub First Lib "MyLib" (X As Long)
Declare Sub Second Lib "MyLib" ()
```

> [!NOTE]
>
> - You can't have fixed-length strings in the argument list of a **Declare** statement; only variable-length strings can be passed to procedures. Fixed-length strings can appear as procedure arguments, but they are converted to variable-length strings before being passed.
> - The **vbNullString** constant is used when calling external procedures, where the external procedure requires a string whose value is zero. This is not the same thing as a zero-length string ("").

### Example

This example shows how the **Declare** statement is used at the module level of a standard module to declare a reference to an external procedure in a dynamic-link library (DLL). You can place the **Declare** statements in class modules if the **Declare** statements are **Private**.

```vb
' In 32-bit Microsoft Windows systems, specify the library USER32.DLL.
Declare Sub MessageBeep Lib "User32" (ByVal N As Long)
 
' 64-bit Declare statement example:
Declare PtrSafe Function GetActiveWindow Lib "User32" () As LongPtr
 
' Conditional Compilation Example 
#If Vba7 Then
     ' Code is running in 32-bit or 64-bit twinBASIC or VBA7
     #If Win64 Then
          ' Code is running in 64-bit twinBASIC or VBA7.
     #Else
          ' Code is not running in 64-bit twinBASIC or VBA7.
     #End If
#Else
     ' Code is NOT running in 32-bit or 64-bit twinBASIC or VBA7.
#End If 
```

{% include VBA-Attribution.md %}
