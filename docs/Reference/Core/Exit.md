---
title: Exit
parent: Statements
permalink: /tB/Core/Exit
---
# Exit
{: .no_toc }

Exits a block of **Do…Loop**, **For…Next**, **Function**,  **Sub**, or **Property** code.

Syntax:

- **Exit Do**  
  Provides a way to exit a **[Do...Loop](Do-Loop)** statement. It can be used only inside a **Do...Loop** statement. **Exit Do** transfers control to the statement following the **Loop** statement. When used within nested **Do...Loop** statements, **Exit Do** transfers control to the loop that is one nested level above the loop where **Exit Do** occurs.
  
- **Exit For**  
  Provides a way to exit a **For** loop. It can be used only in a **[For...Next](For-Next)** or **[For Each...Next](For-Next)** loop. **Exit For** transfers control to the statement following the **Next** statement. When used within nested **For** loops, **Exit For** transfers control to the loop that is one nested level above the loop where **Exit For** occurs.
  
- **Exit Function**  
  Immediately exits the **[Function](Function)** procedure in which it appears. Execution continues with the statement following the statement that called the **Function**.
  
- **Exit Property**  
  Immediately exits the **[Property](Property)** procedure in which it appears. Execution continues with the statement following the statement that called the **Property** procedure.
  
- **Exit Sub**  
  Immediately exits the **[Sub](Sub)** procedure in which it appears. Execution continues with the statement following the statement that called the **Sub** procedure.

Do not confuse **Exit** statements with **End** statements. **Exit** does not define the end of a structure.

### Example

This example uses the **Exit** statement to exit a **For...Next** loop, a **Do...Loop**, and a **Sub** procedure.

```vb
Sub ExitStatementDemo() 
  Dim I%, MyNum% 
  Do ' Set up infinite loop. 
    For I = 1 To 1000 ' Loop 1000 times. 
      MyNum = Int(Rnd * 1000) ' Generate random numbers. 
      Select Case MyNum ' Evaluate random number. 
        Case 7: Exit For ' If 7, exit For...Next. 
        Case 29: Exit Do ' If 29, exit Do...Loop. 
        Case 54: Exit Sub ' If 54, exit Sub procedure. 
      End Select
    Next I 
  Loop 
End Sub
```
{% include VBA-Attribution.md %}