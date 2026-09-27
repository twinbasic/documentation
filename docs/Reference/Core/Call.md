---
title: Call
parent: Statements
permalink: /tB/Core/Call
vba_attribution: true
---

# Call
{: .no_toc }

Transfers control to a **Sub** [procedure](../Gloss#procedure), **Function** procedure, or dynamic-link library (DLL) procedure.

Syntax:

- **Call** *name* **(** [ *argumentlist* ] **)**  
  When the **Call** keyword is specified, the *argumentlist* must be enclosed in parentheses.  
  
- *name* **(** [ *argumentlist* ] **)**  
  Without the **Call** keyword, the *argumentlist* can be optionally enclosed in parentheses,  
  
- *name* [ *argumentlist* ]  

*name*
: The name of the procedure to call

*argumentlist*
: *optional* A comma-delimited list of variables, arrays or expressions to pass to the procedure. Components of *argumentlist* may include the keywords **ByVal** or **ByRef** to describe how the arguments are to be passed to the called procedure.

The **Call** keyword is not required when calling a procedure. However, when the **Call** keyword is used to call a procedure that requires arguments, *argumentlist* must be enclosed in parentheses. When the **Call** keyword is omitted, the parentheses around *argumentlist* must also be omitted. When either **Call** syntax is used to call any intrinsic or user-defined function, the function's return value is discarded.

To pass a whole array to a procedure, use the array name followed by empty parentheses.

Enclosing a single argument in its own parentheses, as in `MyProc (x)`, makes it an expression: the procedure receives a copy, even for a **ByRef** parameter. See [Passing arguments ByRef and ByVal](Sub#passing-arguments-byref-and-byval).

### Example

This example illustrates how the **Call** statement is used to transfer control to a **Sub** procedure, an intrinsic function, and a dynamic-link library (DLL) procedure.

```tb check_build
' The Declare statement must be Private in a Class Module, but not in a standard Module.
Private Declare Sub MessageBeep Lib "user32" (ByVal wType As Long)

Sub PrintToDebugWindow(AnyString)
    Debug.Print AnyString    ' Print to the Debug Console.
End Sub

Sub CallExamples()
    ' Call a Sub procedure: control passes to PrintToDebugWindow above.
    Call PrintToDebugWindow("Hello World")

    ' Call an intrinsic function. Its return value, the program's
    ' task ID, is discarded.
    Call Shell("notepad.exe", vbNormalFocus)

    ' Call a Windows DLL procedure.
    Call MessageBeep(0)
    MessageBeep 0    ' Call again without the Call keyword.
End Sub
```

### Named arguments
{: index="named parameters" }

An argument can be passed by the name of its parameter instead of by its position, as *name* **:=** *value*. Named arguments can come in any order, and an **Optional** argument that isn't named is left out, so there is no need to count commas to skip one. The name is the parameter's name in the procedure's declaration; for a built-in procedure, it is the name its reference page gives, such as *prompt* and *title* for [**MsgBox**](../Modules/Interaction/MsgBox).

A call can start with positional arguments and continue with named ones, but once an argument is named, every argument after it must be named too. A procedure with a [**ParamArray**](ParamArray) parameter can't be called with named arguments.

```tb check_build
Sub Greet(Name As String, Optional Greeting As String = "Hello", Optional Suffix As String = "!")
    Debug.Print Greeting & ", " & Name & Suffix
End Sub

Sub TryNamedArguments()
    Greet "Ada", Suffix:="?"                    ' Hello, Ada?  -- Greeting left out
    Greet Suffix:=".", Name:="Ada"              ' Hello, Ada.  -- in any order
    Call Greet("Ada", Greeting:="Hi")           ' Hi, Ada!
    MsgBox Prompt:="Done", Title:="Named arguments"
End Sub
```

### See Also

- [**Declare** statement](Declare)
- [**Function** statement](Function)
- [**Sub** statement](Sub)
- [Passing arguments ByRef and ByVal](Sub#passing-arguments-byref-and-byval)
- [Optional arguments and default values](Sub#optional-arguments-and-default-values)
- [named argument](../Gloss#named-argument) in the Glossary

