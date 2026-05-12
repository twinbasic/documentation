---
title: If...Then...Else
parent: Statements
permalink: /tB/Core/If-Then-Else
vba_attribution: true
---

# If...Then...Else
{: .no_toc }

Conditionally executes a group of statements, depending on the value of an expression.

Syntax:

- > **If** *condition* **Then** [ *statements* ] [ **Else** *elsestatements* ]
- > **If** *condition* **Then**  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *statements* ]  
  > [ **ElseIf** *condition-n* **Then**  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *elseifstatements* ] ]  
  > [ **Else**  
  > &nbsp;&nbsp;&nbsp;&nbsp;[ *elsestatements* ] ]  
  > **End If**

*condition*
: One or more of the following two types of expressions:
  - A numeric expression or string expression that evaluates to **True** or **False**. If *condition* is Null, *condition* is treated as **False**.
  - An expression of the form **TypeOf** *objectname* **Is** *objecttype*. *objectname* is any object reference, and *objecttype* is any valid object type. The expression is **True** if *objectname* is of the object type specified by *objecttype*; otherwise it is **False**.

*statements*
: Optional in block form; required in single-line form that has no **Else** clause. One or more statements separated by colons; executed if *condition* is **True**.

*condition-n*
: *optional*  Same as *condition*.

*elseifstatements*
: *optional*  One or more statements executed if the associated *condition-n* is **True**.

*elsestatements*
: *optional*  One or more statements executed if no previous *condition* or *condition-n* expression is **True**.

Use the single-line form (first syntax) for short, simple tests. The block form (second syntax) provides more structure and flexibility than the single-line form and is usually easier to read, maintain, and debug.

> [!NOTE]
> With the single-line form, it is possible to have multiple statements executed as the result of an **If...Then** decision. All statements must be on the same line and separated by colons, as in the following statement:
>
> ```tb
> If A > 10 Then A = A + 1 : B = B + A : C = C + B
> ```

A block form **If** statement must be the first statement on a line. The **Else**, **ElseIf**, and **End If** parts of the statement can have only a line number or line label preceding them. The block **If** must end with an **End If** statement.

To determine whether or not a statement is a block **If**, examine what follows the **Then** keyword. If anything other than a comment appears after **Then** on the same line, the statement is treated as a single-line **If** statement.

The **Else** and **ElseIf** clauses are both optional. You can have as many **ElseIf** clauses as you want in a block **If**, but none can appear after an **Else** clause. Block **If** statements can be nested; that is, contained within one another.

When executing a block **If** (second syntax), *condition* is tested. If *condition* is **True**, the statements following **Then** are executed. If *condition* is **False**, each **ElseIf** condition (if any) is evaluated in turn. When a **True** condition is found, the statements immediately following the associated **Then** are executed. If none of the **ElseIf** conditions are **True** (or if there are no **ElseIf** clauses), the statements following **Else** are executed. After executing the statements following **Then** or **Else**, execution continues with the statement following **End If**.

> [!TIP]
> [**Select Case**](Select-Case) may be more useful when evaluating a single expression that has several possible actions. However, the **TypeOf** *objectname* **Is** *objecttype* clause can't be used with the **Select Case** statement.

> [!NOTE]
> **TypeOf** cannot be used with hard data types such as **Long**, **Integer**, and so forth other than **Object**.

### Example

This example shows both the block and single-line forms of the **If...Then...Else** statement. It also illustrates the use of **If TypeOf...Then...Else**.

```tb
Dim Number, Digits, MyString
Number = 53 ' Initialize variable.
If Number < 10 Then
    Digits = 1
ElseIf Number < 100 Then
    ' Condition evaluates to True so the next statement is executed.
    Digits = 2
Else
    Digits = 3
End If

' Assign a value using the single-line form of syntax.
If Digits = 1 Then MyString = "One" Else MyString = "More than one"
```

Use the **If TypeOf** construct to determine whether the Control passed into a procedure is a particular kind of control.

```tb
Sub ControlProcessor(MyControl As Control)
    If TypeOf MyControl Is CommandButton Then
        Debug.Print "You passed in a " & TypeName(MyControl)
    ElseIf TypeOf MyControl Is CheckBox Then
        Debug.Print "You passed in a " & TypeName(MyControl)
    ElseIf TypeOf MyControl Is TextBox Then
        Debug.Print "You passed in a " & TypeName(MyControl)
    End If
End Sub
```

### See Also

- [**Select Case** statement](Select-Case)
- [**#If...Then...Else** directive](Topic-Preprocessor)
