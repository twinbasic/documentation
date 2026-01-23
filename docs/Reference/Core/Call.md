---
title: Call
parent: Statements
permalink: /tB/Core/Call
---

# Call

{: no_toc }

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
: *optional*  A comma-delimited list of variables, arrays or expressions to pass to the procedure. Components of *argumentlist* may include the keywords **ByVal** or **ByRef** to describe how the arguments are to be passed to the called procedure.

You are not required to use the **Call** keyword when calling a procedure. However, if you use the **Call** keyword to call a procedure that requires arguments, *argumentlist* must be enclosed in parentheses. If you omit the **Call** keyword, you also must omit the parentheses around *argumentlist*. If you use either **Call** syntax to call any intrinsic or user-defined function, the function's return value is discarded.

To pass a whole array to a procedure, use the array name followed by empty parentheses.

### Example

This example illustrates how the **Call** statement is used to transfer control to a **Sub** procedure, an intrinsic function, and a dynamic-link library (DLL) procedure.

``` vb
' Call a Sub procedure. 
Call PrintToDebugWindow("Hello World")     
' The above statement causes control to be passed to the following 
' Sub procedure. 
Sub PrintToDebugWindow(AnyString) 
    Debug.Print AnyString    ' Print to the Immediate window. 
End Sub 
 
' Call an intrinsic function. The return value of the function is 
' discarded. 
Call Shell(AppName, 1)    ' AppName contains the path of the  
        ' executable file. 
 
' Call a Microsoft Windows DLL procedure. The Declare statement must be  
' Private in a Class Module, but not in a standard Module. 
Private Declare Sub MessageBeep Lib "User" (ByVal N As Integer) 
Sub CallMyDll() 
    Call MessageBeep(0)    ' Call Windows DLL procedure. 
    MessageBeep 0    ' Call again without Call keyword. 
End Sub
```

### See Also

- [**Declare** statement](Declare)
- [**Function** statement](Function)
- [**Sub** statement](Sub)



{% include VBA-Attribution.md %}