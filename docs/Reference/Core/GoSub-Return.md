---
title: GoSub ... Return
parent: Statements
permalink: /tB/Core/GoSub-Return
---
# GoSub ... Return
{: .no_toc }

Branches to and returns from a subroutine within a procedure.

Syntax:
> **GoSub** *line*  
> &nbsp;&nbsp;&nbsp;&nbsp; ...  
> *line*  
> &nbsp;&nbsp;&nbsp;&nbsp; ...  
> &nbsp;&nbsp;&nbsp;&nbsp; **Return**

*line*
: Any line label or line number.

Use **GoSub** and **Return** anywhere in a procedure, but **GoSub** and the corresponding **Return** statement must be in the same procedure. A subroutine can contain more than one **Return** statement, but the first **Return** statement encountered causes the flow of execution to branch back to the statement immediately following the most recently executed **GoSub** statement.

> [!NOTE]
> You can't enter or exit [**Sub**](Sub) procedures with **GoSub...Return**.

> [!TIP]
> Creating separate procedures that you can call may provide a more structured alternative to using **GoSub...Return**.

### Example

This example uses **GoSub** to call a subroutine within a **Sub** procedure. The **Return** statement causes the execution to resume at the statement immediately following the **GoSub** statement. The [**Exit Sub**](Exit) statement is used to prevent control from accidentally flowing into the subroutine.

```tb
Sub GosubDemo()
    Dim Num
    ' Solicit a number from the user.
    Num = InputBox("Enter a positive number to be divided by 2.")
    ' Only use routine if user enters a positive number.
    If Num > 0 Then GoSub MyRoutine
    Debug.Print Num
    Exit Sub ' Use Exit to prevent an error.
MyRoutine:
    Num = Num / 2 ' Perform the division.
    Return ' Return control to statement following the GoSub statement.
End Sub
```

### See Also

- [**Return** statement](Return)
- [**GoTo** statement](GoTo)
- [**On...GoSub** statement](On-GoSub)
- [**Sub** statement](Sub)

{% include VBA-Attribution.md %}
