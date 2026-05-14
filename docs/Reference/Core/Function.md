---
title: Function
parent: Statements
permalink: /tB/Core/Function
vba_attribution: true
---
# Function
{: .no_toc }

Declares the name, arguments, and code that form the body of a **Function** procedure.

Syntax:
> [ *attributes* ]  
> [ **Public** \| **Private** \| **Friend** \| **Protected** ] [ **Static** ] [ **Overridable** ] **Function** *name* [ **(** **Of** *typevars* **)** ] [ **(** *arglist* **)** ] [ **As** *type* ] [ *binding-clause* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ [ **Let** ] *name* **=** *expression* ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Set** *name* **=** *expression* ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Return** *expression* ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Exit Function** ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
> **End Function**

*attributes*
: One or more of:  
[ArrayBoundsChecks](Attributes#arrayboundschecks), [BindOnlyIfNoArguments](Attributes#bindonlyifnoarguments), [BindOnlyIfStringSuffix](Attributes#bindonlyifstringsuffix), [CompileIf](Attributes#compileif), [ConstantFoldable](Attributes#constantfoldable), [ConstantFoldableNumericsOnly](Attributes#constantfoldablenumericsonly), [Debuggable](Attributes#debuggable), [DebugOnly](Attributes#debugonly), [Description](Attributes#description), [EnforceErrors](Attributes#enforceerrors), [EnforceWarnings](Attributes#enforcewarnings), [FloatingPointErrorChecks](Attributes#floatingpointerrorchecks), [IntegerOverflowChecks](Attributes#integeroverflowchecks), [MustBeQualified](Attributes#mustbequalified), [RunAfterBuild](Attributes#runafterbuild), [SimplerByVals](Attributes#simplerbyvals), [TestCase](Attributes#testcase), [Unimplemented](Attributes#unimplemented)

**Public**
: *optional*. Indicates that the **Function** procedure is accessible to all other procedures in all modules. If used in a module that contains an **Option Private**, the procedure is not available outside the project.

**Private**
: *optional* Indicates that the **Function** procedure is accessible only to other procedures in the module where it is declared.

**Friend**
: *optional* Used only in a class module. Indicates that the **Function** procedure is visible throughout the project, but not visible to a controller of an instance of an object.

**[Protected](Protected)**
: *optional* (twinBASIC) Used only in a class. Indicates that the **Function** procedure is accessible from inside the declaring class and from classes that derive from it via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop), but not from outside callers.

**Static**
: *optional* Indicates that the **Function** procedure's local variables are preserved between calls. The **Static** attribute doesn't affect variables that are declared outside the **Function**, even if they are used in the procedure.

**Overridable**
: *optional* (twinBASIC) Marks the **Function** as an inheritance hook that classes derived via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop) may replace with an **Overrides** clause. Meaningful only on a member of a class that participates in an **Inherits** hierarchy.

*name*
: Name of the **Function**; follows standard variable naming conventions.

**Of** *typevars*
: *optional* One or more type variable names; following standard variable naming conventions. The names are separated by commas. Causes the function to be a generic function.

*arglist*
: *optional* List of variables representing arguments that are passed to the **Function** procedure when it is called. Multiple variables are separated by commas.

**As** *type*
: *optional* Data type of the value returned by the **Function** procedure; may be Byte, Boolean, Integer, Long, Currency, Single, Double, Decimal, Date, String (except fixed length), Object, Variant, or any user-defined type (UDT).

*binding-clause*
: *optional* (twinBASIC) One of three trailing clauses that bind this body to a member declared elsewhere:

  - **Handles** *object*.*event* [ **,** *object*.*event* … ] --- connects this **Function** as a handler for the named event(s), replacing the traditional `Object_Event` naming convention. See [**Handles** statement](Handles).
  - **Implements** *iface*.*member* [ **,** *iface2*.*member2* … ] --- provides the body for the named [**Interface**](Interface) (or [**Class**](Class)) member, replacing the traditional `Iface_Member` naming convention. A comma-separated list permits one body to satisfy several interfaces' members at once. See [**Implements** statement](Implements).
  - **Overrides** *base*.*member* --- supplies the body for an **Overridable** *member* inherited via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop). Combine with **Overridable** on the same header to allow further-derived classes to override again.

*statements*
: *optional* Any group of statements to be executed within the **Function** procedure.

**[Let](Let)**
: *optional* Assigns a non-object-type return value of the **Function** without exiting the function. The **Let** keyword is optional.

**[Set](Set)**
: *optional* Assigns an object-type return value of the **Function** without exiting the function.

**[Return](Return)** *expression*
: *optional* Immediately returns from the function with *expression* as the return value. The *expression* is required in this form; a bare **Return** is reserved for the [**GoSub...Return**](GoSub-Return) construct and does not exit a **Function**.

**[Exit Function](Exit)**
: *optional* Immediately returns from the function without setting a return value. Used to leave a function early when no value needs to be returned (the function will yield its default return value: 0 for numeric types, `""` for strings, **Empty** for **Variant**, **Nothing** for object references).

*expression*
: *optional* Return value of the **Function**.

### *arglist*

Syntax: One or more of  
[ **Optional** ] [ **ByVal** \| **ByRef** ] [ **ParamArray** ] *varname* [ **()** ] [ **As** *type* ] [ **=** *defaultvalue* ]

**Optional**
: *optional* Indicates that an argument is not required. If used, all subsequent arguments in *arglist* must also be optional and declared by using the **Optional** keyword. **Optional** can't be used for any argument if **ParamArray** is used.

**ByVal**
: *optional* Indicates that the argument is passed by value.

**ByRef**
: *optional* Indicates that the argument is passed by reference. **ByRef** is the default unlike in Visual Basic .NET.

**ParamArray**
: *optional* Used only as the last argument in *arglist* to indicate that the final argument is an **Optional** array of **Variant** elements. The **ParamArray** keyword permits passing an arbitrary number of arguments. It may not be used with **ByVal**, **ByRef**, or **Optional**.

*varname*
: Name of the variable representing the argument; follows standard variable naming conventions.

*type*
: *optional* Data type of the argument passed to the procedure; may be **Byte**, **Boolean**, **Integer**, **Long**, **Currency**, **Single**, **Double**, **Decimal**, **Date**, **String** (variable length only), **Object**, **Variant**, a specific object type, or the name of a generic type argument. If the parameter is not **Optional**, a user-defined type may also be specified.  
If the name of a generic type parameter is used, it becomes bound to the concrete type of the argument passed to the function. The name binding has the scope of the body of the function.

*defaultvalue*
: *optional* Any constant or constant expression. Valid for **Optional** parameters only. If the type is an **Object**, an explicit default value can only be **Nothing**.

If not explicitly specified by using **Public**, **Private**, or **Friend**, **Function** procedures are public by default.

If **Static** isn't used, the value of local variables is not preserved between calls.

The **Friend** keyword can only be used in class modules. However, **Friend** procedures can be accessed by procedures in any module of a project. A **Friend** procedure does not appear in the type library of its parent class, nor can a **Friend** procedure be late bound.

**Function** procedures can be recursive; that is, they can call themselves to perform a given task. However, recursion can lead to stack overflow. The **Static** keyword usually isn't used with recursive **Function** procedures.

All executable code must be in procedures. A **Function** procedure cannot be defined inside another **Function**, **[Sub](Sub)**, or **[Property](Property)** procedure.

The **[Exit Function](Exit)** statement and the **[Return](Return)** *expression* statement both cause an immediate exit from a **Function** procedure. Program execution continues with the statement following the statement that called the **Function** procedure. Any number of these statements can appear anywhere in a **Function** procedure. **Exit Function** is the right choice when the return value has already been assigned (or the default is wanted); **Return** *expression* sets the return value and exits in a single step.

Like a **Sub** procedure, a **Function** procedure is a separate procedure that can take arguments, perform a series of statements, and change the values of its arguments. However, unlike a **Sub** procedure, a **Function** procedure can appear on the right side of an expression in the same way as any intrinsic function --- such as **Sqr**, **Cos**, or **Chr** --- when the value returned by the function is needed.

A **Function** procedure is called by using the function name, followed by the argument list in parentheses, in an expression. See the **[Call](Call)** statement for specific information about how to call **Function** procedures.

To return a value from a function, assign the value to the function name, or provide it as an argument to the **Return** statement. Any number of such assignments and **Return** statements can appear anywhere within the procedure. If no value is assigned to *name*, the procedure returns a default value: a numeric function returns 0, a string function returns a zero-length string (""), and a **Variant** function returns **Empty**. A function that returns an object reference returns **Nothing** if no object reference is assigned to *name* (using **Set** or **Return**) within the **Function**.

The following example shows how to assign a return value to a function. In this case, **False** is assigned to the name to indicate that some value was not found.

```tb
Function BinarySearch(...) As Boolean 
  '... 
  ' Value not found. Return a value of False. 
  If lower > upper Then 
    BinarySearch = False 
    Exit Function 
  End If 
  '...
End Function
```

Variables used in **Function** procedures fall into two categories: those that are explicitly declared within the procedure and those that are not.

Variables that are explicitly declared in a procedure (using **Dim** or the equivalent) are always local to the procedure. Variables that are used but not explicitly declared in a procedure are also local unless they are explicitly declared at some higher level outside the procedure.

A procedure can use a variable that is not explicitly declared in the procedure, but a naming conflict can occur if anything defined at the module level has the same name. When a procedure refers to an undeclared variable that has the same name as another procedure, constant, or variable, it is assumed that the procedure refers to that module-level name. Explicitly declare variables to avoid this kind of conflict. Use an **[Option Explicit](Option#Explicit)** statement to force explicit declaration of variables.

Visual Basic may rearrange arithmetic expressions to increase internal efficiency. Avoid using a **Function** procedure in an arithmetic expression when the function changes the value of variables in the same expression. For more information about arithmetic operators, see Operators.

### Example

This example uses the **Function** statement to declare the name, arguments, and code that form the body of a **Function** procedure. The last example uses hard-typed, initialized **Optional** arguments.

```tb
' The following user-defined function returns the square root of the 
' argument passed to it. 
Function CalculateSquareRoot(NumberArg As Double) As Double 
  If NumberArg < 0 Then ' Evaluate argument. 
    Exit Function ' Exit to calling procedure. 
  Else 
    CalculateSquareRoot = Sqr(NumberArg) ' Return square root. 
  End If 
End Function
```

Using the **ParamArray** keyword enables a function to accept a variable number of arguments. In the following definition, it is passed by value.

```tb
Function CalcSum(ByVal FirstArg As Integer, ParamArray OtherArgs()) 
  Dim ReturnValue 
  ' If the function is invoked as follows: 
  ReturnValue = CalcSum(4, 3, 2, 1) 
  ' Local variables are assigned the following values: FirstArg = 4, 
  ' OtherArgs(1) = 3, OtherArgs(2) = 2, and so on, assuming default 
  ' lower bound for arrays = 1. 
End Function
```

**Optional** arguments can have default values and types other than **Variant**.

```tb
' If a function's arguments are defined as follows: 
Function MyFunc(MyStr As String,Optional MyArg1 As _
 Integer = 5,Optional MyArg2 = "Dolly") 
  Dim RetVal 
  ' The function can be invoked as follows: 
  RetVal = MyFunc("Hello", 2, "World") ' All 3 arguments supplied. 
  RetVal = MyFunc("Test", , 5) ' Second argument omitted. 
  ' Arguments one and three using named-arguments. 
  RetVal = MyFunc(MyStr:="Hello ", MyArg1:=7)
End Function
```