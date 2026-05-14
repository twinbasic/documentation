---
title: Return
parent: Statements
permalink: /tB/Core/Return
vba_attribution: true
---
# Return
{: .no_toc }

Returns control from the current point of execution to its caller. The **Return** keyword has two distinct uses, distinguished by form and context:

- **Bare `Return`** --- valid only as the companion to [**GoSub**](GoSub-Return). Inside a **GoSub** subroutine, **Return** branches back to the statement immediately following the most recently executed **GoSub**.
- **`Return` *expression*** --- valid only inside a [**Function**](Function) or [**Property Get**](Property) procedure (twinBASIC extension). It exits the procedure with *expression* as the return value.

To exit a [**Sub**](Sub), [**Function**](Function), [**Property Get**](Property), [**Property Let**](Property), or [**Property Set**](Property) procedure *without* returning a value, use [**Exit Sub**](Exit), **Exit Function**, or **Exit Property** --- there is no bare-`Return` procedure-exit form.

Syntax:
- > **Return**
- > **Return** *expression*

*expression*
: In a [**Function**](Function) or **Property Get** procedure, the value to return to the caller. The type of *expression* must be compatible with the procedure's declared return type. *expression* must be present in this form --- it cannot be omitted.

> [!NOTE]
> The **Return** *expression* form is a twinBASIC extension. Classic VBA reserves **Return** exclusively for the [**GoSub...Return**](GoSub-Return) construct, and the only way to set a function's return value is to assign to the function name (e.g., `MyFunc = expr`). twinBASIC supports both styles.

### Example

Returning a value from a **Function** by using **Return** *expression*:

```tb
Function Square(N As Double) As Double
    Return N * N
End Function

Debug.Print Square(7)   ' 49
```

Exiting a **Sub** early --- note the use of **Exit Sub**, not bare **Return**:

```tb
Sub LogIfEnabled(ByVal Message As String)
    If Not LoggingEnabled Then Exit Sub
    Debug.Print Now & ": " & Message
End Sub
```

Returning from a **GoSub** subroutine --- bare **Return** here resumes execution at the statement following the **GoSub**. See [**GoSub...Return**](GoSub-Return) for the full pattern.

```tb
Sub GosubDemo()
    Dim Num As Double
    Num = 10
    GoSub Halve
    Debug.Print Num     ' 5
    Exit Sub
Halve:
    Num = Num / 2
    Return              ' Return to the GoSub call site.
End Sub
```

### See Also

- [**GoSub...Return** statement](GoSub-Return)
- [**Exit** statement](Exit)
- [**Sub** statement](Sub)
- [**Function** statement](Function)
- [**Property** statement](Property)
