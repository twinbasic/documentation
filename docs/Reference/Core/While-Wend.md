---
title: While...Wend
parent: Statements
permalink: /tB/Core/While-Wend
vba_attribution: true
---

# While...Wend
{: .no_toc }

Executes a series of statements as long as a given condition is **True**.

Syntax:

> **While** *condition*  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ]  
> **Wend**

*condition*
: Numeric expression or string expression that evaluates to **True** or **False**. If *condition* is Null, *condition* is treated as **False**.

*statements*
: *optional*  One or more statements executed while *condition* is **True**.

If *condition* is **True**, all *statements* are executed until the **Wend** statement is encountered. Control then returns to the **While** statement and *condition* is again checked. If *condition* is still **True**, the process is repeated. If it is not **True**, execution resumes with the statement following the **Wend** statement.

**While...Wend** loops can be nested to any level. Each **Wend** matches the most recent **While**.

Any number of [**Exit While**](Exit) statements may be placed anywhere in the **While...Wend** loop as a way to exit early. **Exit While** is often used after evaluating some condition, in which case it transfers control to the statement immediately following the **Wend**.

Any number of [**Continue While**](Continue) statements may be placed anywhere in the **While...Wend** loop to skip the rest of the statements and proceed with a new iteration.

> [!NOTE]
> **Exit While** and **Continue While** are twinBASIC extensions. Classic VBA has no early-exit or skip-iteration form for **While...Wend** loops.

> [!TIP]
> The [**Do...Loop**](Do-Loop) statement provides a more structured and flexible way to perform looping.

### Example

This example uses the **While...Wend** statement to increment a counter variable. The statements in the loop are executed as long as the condition evaluates to **True**.

```tb
Dim Counter
Counter = 0 ' Initialize variable.
While Counter < 20 ' Test value of Counter.
    Counter = Counter + 1 ' Increment Counter.
Wend ' End While loop when Counter > 19.
Debug.Print Counter ' Prints 20 in the Immediate window.
```

### See Also

- [**Do...Loop** statement](Do-Loop)
- [**For...Next** statement](For-Next)
