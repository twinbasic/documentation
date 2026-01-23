---
title: For...Next
parent: Statements
permalink: /tB/Core/For-Next
---

# For...Next
{: .no_toc }

Repeats a group of statements while the loop counter approaches its final value.

Syntax:

> **For** *counter* [ **As** *type* ] **=** *start* **To** *end* [ **Step** *step* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Continue For** \| **Exit For** ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ] ...  
> **Next** [ *counter* ]

*counter*
: Numeric variable used as a loop counter. The variable can't be a Boolean or an array element.

*type*
: *optional* A numeric type used to declare *counter*.  
  When present it is equivalent to placing `Dim counter As type` immediately before the **For** statement.

*start*
: Initial value of *counter*.

*end*
: Final value of *counter*.

*step*
: *optional* Amount *counter* is changed each time through the loop. If not specified, *step* defaults to one.

*statements*
: *optional* One or more statements between **For** and **Next** that are executed the specified number of times.

**Continue For**
: *optional* Immediately skips remaining statements and begins next iteration, or exits the loop if no more iterations remain.  
  **Continue For** is often used after evaluating some condition, for example **If...Then**.

**Exit For**
: *optional* Immediately exits the body of the loop.  
  **Exit For** is often used after evaluating some condition, for example **If...Then**, and transfers control to the statement immediately following **Next**.

The *step* argument can be either positive or negative. The value of the *step* argument determines loop processing as follows:

| Value         | Loop executes if   |
| :------------ | :----------------- |
| Positive or 0 | *counter* <= *end* |
| Negative      | *counter* >= *end* |

After all statements in the loop have executed, *step* is added to *counter*. At this point, either the statements in the loop execute again (based on the same test that caused the loop to execute initially), or the loop is exited and execution continues with the statement following the **Next** statement.

> [!TIP]
> 
> Changing the value of *counter* while inside a loop can make it more difficult to read and debug your code.

You can nest **For...Next** loops by placing one **For...Next** loop within another. Give each loop a unique variable name as its *counter*. The following construction is correct:

```vb
For I = 1 To 10 
  For J = 1 To 10 
    For K = 1 To 10 
    ' ... 
    Next K 
  Next J 
Next I 
```

> [!NOTE]
>
> If you omit *counter* in a **Next** statement, execution continues as if *counter* is included. If a **Next** statement is encountered before its corresponding **For** statement, an error occurs.

### Example

This example uses the **For...Next** statement to create a string that contains 10 instances of the numbers 0 through 9, each string separated from the other by a single space. The outer loop uses a loop counter variable that is decremented each time through the loop.

```vb
Dim Words, Chars, MyString 
For Words = 10 To 1 Step -1 ' Set up 10 repetitions. 
  For Chars = 0 To 9 ' Set up 10 repetitions. 
    MyString = MyString & Chars ' Append number to string. 
  Next Chars ' Increment counter 
  MyString = MyString & " " ' Append a space. 
Next Words 
```

{% include VBA-Attribution.md %}