---
title: Delegate Types
parent: Language Syntax
nav_order: 4
permalink: /Features/Language/Delegates
---

# Delegate Types for Indirect Calls

There is native support for calling a function by pointer, by way of `Delegate` syntax. A delegate in twinBASIC is a function pointer type that's compatible with LongPtr. `AddressOf` returns a delegate type, that's also backwards compatible with `LongPtr`.

A delegate is also how a procedure takes another function as an argument, which other languages call a *callback*. See [Passing a function as an argument](#callbacks).

## Basic Usage

The syntax looks like this:

```tb check_build
Private Delegate Function Delegate1 (ByVal A As Long, ByVal B As Long) As Long

Private Sub Command1_Click()
    Dim myDelegate As Delegate1 = AddressOf Addition
    MsgBox "Answer: " & myDelegate(5, 6)
End Sub

Public Function Addition(ByVal A As Long, ByVal B As Long) As Long
    Return A + B
End Function
```

## Passing a function as an argument or parameter (callbacks)
{: #callbacks }

A procedure can take a function as an argument and call it. Other languages call this a *callback*. Writing one takes three steps:

1. Declare a delegate type with the signature the function must have.
2. Give the procedure a parameter of that type, and call the parameter as if it were a function.
3. At the call, pass **AddressOf** followed by the name of the function.

**SortNames** below sorts an array of names. The caller chooses the order by passing a comparison function, and **SortNames** calls it through its *isInOrder* parameter:

```tb check_build
' The signature every comparison function must have.
Public Delegate Function Comparer(ByVal a As String, ByVal b As String) As Boolean

' Sorts names() in place. isInOrder returns True if a can stay before b.
Public Sub SortNames(names() As String, ByVal isInOrder As Comparer)
    Dim i As Long, j As Long, temp As String
    For i = LBound(names) To UBound(names) - 1
        For j = LBound(names) To UBound(names) - 1
            If Not isInOrder(names(j), names(j + 1)) Then
                temp = names(j)
                names(j) = names(j + 1)
                names(j + 1) = temp
            End If
        Next j
    Next i
End Sub

Public Function ByAlphabet(ByVal a As String, ByVal b As String) As Boolean
    Return a <= b
End Function

Public Function ByLength(ByVal a As String, ByVal b As String) As Boolean
    Return Len(a) <= Len(b)
End Function

Public Sub SortDemo()
    Dim names() As String = Array("Charlie", "Al", "Bob", "Dave", "Ed")
    SortNames names, AddressOf ByAlphabet
    Debug.Print Join(names, ", ")
    SortNames names, AddressOf ByLength
    Debug.Print Join(names, ", ")
End Sub
```

**SortDemo** prints:

```text
Al, Bob, Charlie, Dave, Ed
Al, Ed, Bob, Dave, Charlie
```

> [!IMPORTANT]
> The function passed must match the delegate: the same number and types of parameters, the same **ByVal** or **ByRef** on each (a parameter with neither is **ByRef**), and the same return type. A function that does not match causes only a warning, TB0026 *Mismatched delegate type*, and the program still builds. The function then receives its arguments in a form it does not expect: if the delegate's parameter is a **Long** and the function's is an **Integer**, a value of 70000 arrives in the function as 4464. `[EnforceErrors(TB0026)]` on the module that uses **AddressOf** makes the mismatch an error; [Compiler Warnings](../Compiler-IDE/Compiler-Warnings#adjusting-warnings) describes the other ways to do that.

A delegate type can also describe a callback that a Windows API function takes. See [Advanced Usage](#advanced-usage).

## Advanced Usage

The delegate type can also be used in interface/API declarations and as members of a User-defined type. For example, the `ChooseColor` API:

```tb hidden
' Context for the ChooseColor samples below: the flags enum the structure uses.
' A reader has it from a Windows declarations package such as WinDevLib.
Public Enum ChooseColorFlags
    CC_RGBINIT = &H1
    CC_FULLOPEN = &H2
    CC_ENABLEHOOK = &H10
End Enum
```

```tb check_build projname=delegates-choosecolor
Public Delegate Function CCHookProc (ByVal hwnd As LongPtr, ByVal uMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr

Public Type CHOOSECOLOR
    lStructSize As Long
    hwndOwner As LongPtr
    hInstance As LongPtr
    rgbResult As Long
    lpCustColors As LongPtr
    Flags As ChooseColorFlags
    lCustData As LongPtr
    lpfnHook As CCHookProc 'Delegate function pointer type instead of LongPtr
    lpTemplateName As LongPtr
End Type
```

If you already have code assigning a `Long`/`LongPtr` to the `lpfnHook` member, it will continue to work normally, but now you can also have the type safety benefits of setting it to a method matching the Delegate:

```tb check_build projname=delegates-choosecolor
Private Sub PickColor()
    Dim tCC As CHOOSECOLOR
    tCC.lpfnHook = AddressOf ChooseColorHookProc
    ' ...
End Sub

Public Function ChooseColorHookProc(ByVal hwnd As LongPtr, ByVal uMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr
    ' ...
End Function
```
