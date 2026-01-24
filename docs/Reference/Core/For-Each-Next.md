---
title: For Each...Next
parent: Statements
permalink: /tB/Core/For-Each-Next
---

# For Each...Next
{: .no_toc }

Repeats a group of statements for each element in an array or collection.

Syntax:
> **For Each** *element* [ **As** *type* ] **In** *group*  
> &nbsp;&nbsp;&nbsp;&nbsp; [ *statements* ]  
> &nbsp;&nbsp;&nbsp;&nbsp; [ **Continue For** \| **Exit For** ]  
> &nbsp;&nbsp;&nbsp;&nbsp;  [ *statements* ]  
> **Next** [ *element* ]

*element*
: Variable used to iterate through the elements of the collection or array. For collections, *element* can only be a **Variant** variable, a generic object variable, or any specific object variable. For arrays, *element* can only be a **Variant** variable.

*type*
: *optional* A type used to declare *element*.  
  When present it is equivalent to placing `Dim element As type` immediately before the **For Each** statement.

*group*
:  Name of an object collection or array (except an array of user-defined types (UDTs)).

*statements*
: *optional* One or more statements that are executed on each item in *group*.

**Continue For**
: *optional* Immediately skips remaining statements and begins next iteration, or exits the loop if no more iterations remain.  
  **Continue For** is often used after evaluating some condition, for example **If...Then**.

**Exit For**
: *optional* Immediately exits the body of the loop.  
  **Exit For** is often used after evaluating some condition, for example **If...Then**, and transfers control to the statement immediately following **Next**.

The **For…Each** block is entered if there is at least one element in *group*. After the loop has been entered, all the statements in the loop are executed for the first element in *group*. If there are more elements in *group*, the statements in the loop continue to execute for each element. When there are no more elements in *group*, the loop is exited and execution continues with the statement following the **Next** statement.

You can nest **For...Each...Next** loops by placing one **For…Each…Next** loop within another. However, each loop *element* must be unique.

> [!NOTE]
>
> If you omit *element* in a **Next** statement, execution continues as if *element* is included. If a **Next** statement is encountered before its corresponding **For** statement, an error occurs.

You can't use the **For...Each...Next** statement with an array of user-defined types because a **Variant** can't contain a user-defined type.

### Example

This example uses the **For Each...Next** statement to search the **Text** property of all elements in a collection for the existence of the string "Hello". In the example, *MyObject* is a text-related object and is an element of the collection *MyCollection*. Both are generic names used for illustration purposes only.

```vb
Dim Found, MyObject, MyCollection 
Found = False         ' Initialize variable. 
For Each MyObject In MyCollection    ' Iterate through each element.  
  If MyObject.Text = "Hello" Then    ' If Text equals "Hello". 
    Found = True      ' Set Found to True. 
    Exit For          ' Exit loop. 
  End If 
Next
```
{% include VBA-Attribution.md %}