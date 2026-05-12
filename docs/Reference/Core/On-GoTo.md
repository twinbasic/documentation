---
title: On...GoTo, On...GoSub
parent: Statements
permalink: /tB/Core/On-GoTo
vba_attribution: true
---
# On...GoTo, On...GoSub
{: .no_toc }

Branch to one of several specified lines, depending on the value of an expression.

Syntax:
- > **On** *expression* **GoTo** *destinationlist*
- > **On** *expression* **GoSub** *destinationlist*

*expression*
: Any numeric expression that evaluates to a whole number between 0 and 255, inclusive. If *expression* is any number other than a whole number, it is rounded before it is evaluated.

*destinationlist*
: List of line numbers or line labels separated by commas.

The value of *expression* determines which line is branched to in *destinationlist*. If the value of *expression* is less than 1 or greater than the number of items in the list, one of the following results occurs:

| If *expression* is | Then |
|:-----|:-----|
| Equal to 0 | Control drops to the statement following **On...GoSub** or **On...GoTo**. |
| Greater than the number of items in the list | Control drops to the statement following **On...GoSub** or **On...GoTo**. |
| Negative | An error occurs. |
| Greater than 255 | An error occurs. |

You can mix line numbers and line labels in the same list. Use as many line labels and line numbers as you like with **On...GoSub** and **On...GoTo**. However, if you use more labels or numbers than fit on a single line, you must use the line-continuation character to continue the logical line onto the next physical line.

> [!TIP]
> [**Select Case**](Select-Case) provides a more structured and flexible way to perform multiple branching.

### Example

This example uses the **On...GoSub** and **On...GoTo** statements to branch to subroutines and line labels, respectively.

```tb
Sub OnGosubGotoDemo()
    Dim Number, MyString
    Number = 2 ' Initialize variable.
    ' Branch to Sub2.
    On Number GoSub Sub1, Sub2 ' Execution resumes here after On...GoSub.
    On Number GoTo Line1, Line2 ' Branch to Line2.
    ' Execution does not resume here after On...GoTo.
    Exit Sub
Sub1:
    MyString = "In Sub1" : Return
Sub2:
    MyString = "In Sub2" : Return
Line1:
    MyString = "In Line1"
Line2:
    MyString = "In Line2"
End Sub
```

### See Also

- [**GoTo** statement](GoTo)
- [**GoSub...Return** statement](GoSub-Return)
- [**Select Case** statement](Select-Case)
