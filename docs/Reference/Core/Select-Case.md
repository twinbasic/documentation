---
title: Select Case
parent: Statements
permalink: /tB/Core/Select-Case
vba_attribution: true
---

# Select Case
{: .no_toc }

Executes one of several groups of statements, depending on the value of an expression.

Syntax:

> **Select Case** *testexpression*  
> &nbsp;&nbsp;&nbsp;&nbsp;[ **Case** *expressionlist-n*  
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ *statements-n* ] ] ...  
> &nbsp;&nbsp;&nbsp;&nbsp;[ **Case Else**  
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ *elsestatements* ] ]  
> **End Select**

*testexpression*
: Any numeric expression or string expression.

*expressionlist-n*
: Required if a **Case** appears. A delimited list of one or more of the following forms:
  - *expression*
  - *expression* **To** *expression*
  - **Is** *comparisonoperator* *expression*

  The **To** keyword specifies a range of values. When the **To** keyword is used, the smaller value must appear before **To**.

  Use the **Is** keyword with comparison operators (except **Is** and **Like**) to specify a range of values. If not supplied, the **Is** keyword is automatically inserted.

*statements-n*
: *optional* One or more statements executed if *testexpression* matches any part of *expressionlist-n*.

*elsestatements*
: *optional* One or more statements executed if *testexpression* doesn't match any of the **Case** clauses.

If *testexpression* matches any **Case** *expressionlist* expression, the *statements* following that **Case** clause are executed up to the next **Case** clause, or, for the last clause, up to **End Select**. Control then passes to the statement following **End Select**. If *testexpression* matches an *expressionlist* expression in more than one **Case** clause, only the statements following the first match are executed.

The **Case Else** clause is used to indicate the *elsestatements* to be executed if no match is found between the *testexpression* and an *expressionlist* in any of the other **Case** selections. Although not required, it is a good idea to have a **Case Else** statement in a **Select Case** block to handle unforeseen *testexpression* values. If no **Case** *expressionlist* matches *testexpression* and there is no **Case Else** statement, execution continues at the statement following **End Select**.

Multiple expressions or ranges can appear in each **Case** clause. For example, the following line is valid:

```tb
Case 1 To 4, 7 To 9, 11, 13, Is > MaxNumber
```

> [!NOTE]
> The **Is** comparison operator is not the same as the **Is** keyword used in the **Select Case** statement.

Ranges and multiple expressions can also be specified for character strings. In the following example, **Case** matches strings that are exactly equal to `everything`, strings that fall between `nuts` and `soup` in alphabetic order, and the current value of `TestItem`:

```tb
Case "everything", "nuts" To "soup", TestItem
```

**Select Case** statements can be nested. Each nested **Select Case** statement must have a matching **End Select** statement.

### Example

This example uses the **Select Case** statement to evaluate the value of a variable. The second **Case** clause contains the value of the variable being evaluated, and therefore only the statement associated with it is executed.

```tb
Dim Number
Number = 8    ' Initialize variable.
Select Case Number    ' Evaluate Number.
    Case 1 To 5    ' Number between 1 and 5, inclusive.
        Debug.Print "Between 1 and 5"
    ' The following is the only Case clause that evaluates to True.
    Case 6, 7, 8    ' Number between 6 and 8.
        Debug.Print "Between 6 and 8"
    Case 9 To 10    ' Number is 9 or 10.
        Debug.Print "Greater than 8"
    Case Else    ' Other values.
        Debug.Print "Not between 1 and 10"
End Select
```

### See Also

- [**If...Then...Else** statement](If-Then-Else)
- [**Do...Loop** statement](Do-Loop)
