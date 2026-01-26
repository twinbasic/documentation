---
title: Do...Loop
parent: Statements
permalink: /tB/Core/Do-Loop
---

# Do...Loop
{: .no_toc }

Repeats a block of statements while a condition is **True** or until a condition becomes **True**.

Syntax:
- > **Do** [{ **While** \| **Until** } *condition* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ **Exit Do** \| **Continue Do**  ]  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ] ...  
  > **Loop**
- > **Do**  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ]  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ **Exit Do** \| **Continue Do** ]  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ] ...  
  > **Loop** [{ **While** \| **Until** } *condition* ]

*condition*
: *optional*  Numeric expression or string expression that is **True** or **False**. If *condition* is Null, *condition* is treated as **False**.

*statements*
: One or more statements that are repeated while, or until, *condition* is **True**.

Any number of [**Exit Do**](Exit) statements may be placed anywhere in the **Do…Loop** as an alternate way to exit a **Do…Loop**. **Exit Do** is often used after evaluating some condition, for example, **If…Then**, in which case the **Exit Do** statement transfers control to the statement immediately following the **Loop**.

When used within nested **Do…Loop** statements, **Exit Do** transfers control to the loop that is one nested level above the loop where **Exit Do** occurs.

Any number of [**Continue Do**](Continue) statements may be placed anywhere in the **Do…Loop** to skip the rest of the statements and proceed with a new iteration.

### Example

This example shows how **Do...Loop** statements can be used. The inner **Do...Loop** statement loops 10 times, asks the user if it should keep going, sets the value of the flag to **False** when they select **No**, and exits prematurely by using the **Exit Do** statement. The outer loop exits immediately upon checking the value of the flag.

```vb
Public Sub LoopExample()
    Dim Check As Boolean, Counter As Long, Total As Long
    Check = True: Counter = 0: Total = 0 ' Initialize variables.
    Do ' Outer loop.
        Do While Counter < 20 ' Inner Loop
            Counter = Counter + 1 ' Increment Counter.
            If Counter Mod 10 = 0 Then ' Check in with the user on every multiple of 10.
                Check = (MsgBox("Keep going?", vbYesNo) = vbYes) ' Stop when user click's on No
                If Not Check Then Exit Do ' Exit inner loop.
            End If
        Loop
        Total = Total + Counter ' Exit Do Lands here.
        Counter = 0
    Loop Until Check = False ' Exit outer loop immediately.
    MsgBox "Counted to: " & Total
End Sub
```

## Using Do...Loop statements

Use **Do...Loop** statements to run a block of statements an indefinite number of times. The statements are repeated either while a condition is **True** or until a condition becomes **True**.

### Repeating statements while a condition is True

There are two ways to use the **While** keyword to check a condition in a **Do...Loop** statement. You can check the condition before you enter the loop, or you can check it after the loop has run at least once.

In the following `ChkFirstWhile` procedure, you check the condition before you enter the loop. If `myNum` is set to 9 instead of 20, the statements inside the loop will never run. In the `ChkLastWhile` procedure, the statements inside the loop run only once before the condition becomes **False**.

```vb
Sub ChkFirstWhile() 
    counter = 0 
    myNum = 20 
    Do While myNum > 10 
        myNum = myNum - 1 
        counter = counter + 1 
    Loop 
    MsgBox "The loop made " & counter & " repetitions." 
End Sub 
 
Sub ChkLastWhile() 
    counter = 0 
    myNum = 9 
    Do 
        myNum = myNum - 1 
        counter = counter + 1 
    Loop While myNum > 10 
    MsgBox "The loop made " & counter & " repetitions." 
End Sub
```

### Repeating statements until a condition becomes True

There are two ways to use the **Until** keyword to check a condition in a **Do...Loop** statement. You can check the condition before you enter the loop (as shown in the `ChkFirstUntil` procedure), or you can check it after the loop has run at least once (as shown in the `ChkLastUntil` procedure). Looping continues while the condition remains **False**.

```vb
Sub ChkFirstUntil() 
    counter = 0 
    myNum = 20 
    Do Until myNum = 10 
        myNum = myNum - 1 
        counter = counter + 1 
    Loop 
    MsgBox "The loop made " & counter & " repetitions." 
End Sub 
 
Sub ChkLastUntil() 
    counter = 0 
    myNum = 1 
    Do 
        myNum = myNum + 1 
        counter = counter + 1 
    Loop Until myNum = 10 
    MsgBox "The loop made " & counter & " repetitions." 
End Sub
```

### Exiting a Do...Loop statement from inside the loop

You can exit a **Do...Loop** by using the [**Exit Do**](Exit) statement. For example, to exit an endless loop, use the **Exit Do** statement in the **True** statement block of either an [**If...Then...Else**](If-Then-Else) statement or a [**Select Case**](Select-Case) statement. If the condition is **False**, the loop will run as usual.

In the following example `myNum` is assigned a value that creates an endless loop. The **If...Then...Else** statement checks for this condition, and then exits, preventing endless looping.

```vb
Sub ExitExample() 
    counter = 0 
    myNum = 9 
    Do Until myNum = 10 
        myNum = myNum - 1 
        counter = counter + 1 
        If myNum < 10 Then Exit Do 
    Loop 
    MsgBox "The loop made " & counter & " repetitions." 
End Sub
```

> [!NOTE]
> 
> To stop an endless loop, press ESC or CTRL+BREAK.

{% include VBA-Attribution.md %}