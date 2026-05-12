---
title: GoTo
parent: Statements
permalink: /tB/Core/GoTo
vba_attribution: true
---
# GoTo
{: .no_toc }

Branches unconditionally to a specified line within a procedure.

Syntax:
> **GoTo** *line*

*line*
: Any line label or line number.

**GoTo** can branch only to lines within the procedure where it appears.

> [!NOTE]
> Too many **GoTo** statements can make code difficult to read and debug. Use structured control statements ([**Do...Loop**](Do-Loop), [**For...Next**](For-Next), [**If...Then...Else**](If-Then-Else), [**Select Case**](Select-Case)) whenever possible.

### Example

This example uses the **GoTo** statement to branch to line labels within a procedure.

```tb
Sub GotoStatementDemo()
    Dim Number, MyString
    Number = 1 ' Initialize variable.
    ' Evaluate Number and branch to appropriate label.
    If Number = 1 Then GoTo Line1 Else GoTo Line2

Line1:
    MyString = "Number equals 1"
    GoTo LastLine ' Go to LastLine.
Line2:
    ' The following statement never gets executed.
    MyString = "Number equals 2"
LastLine:
    Debug.Print MyString ' Print "Number equals 1" in the Immediate window.
End Sub
```

### See Also

- [**On...GoTo** statement](On-GoTo)
- [**GoSub...Return** statement](GoSub-Return)
- [**On Error** statement](On-Error)
- [**Select Case** statement](Select-Case)
