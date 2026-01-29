---
title: Delegates
parent: Language Syntax
nav_order: 4
---

# Delegate Types for Call By Pointer

There is native support for calling a function by pointer, by way of `Delegate` syntax. A delegate in twinBASIC is a function pointer type that's compatible with LongPtr. `AddressOf` returns a delegate type, that's also backwards compatible with `LongPtr`.

## Basic Usage

The syntax looks like this:

```vb
Private Delegate Function Delegate1 (ByVal A As Long, ByVal B As Long) As Long

Private Sub Command1_Click()
    Dim myDelegate As Delegate1 = AddressOf Addition
    MsgBox "Answer: " & myDelegate(5, 6)
End Sub

Public Function Addition(ByVal A As Long, ByVal B As Long) As Long
    Return A + B
End Function
```

## Advanced Usage

The delegate type can also be used in interface/API declarations and as members of a User-defined type. For example, the `ChooseColor` API:

```vb
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

```vb
Dim tCC As CHOOSECOLOR
tCC.lpfnHook = AddressOf ChooseColorHookProc

'...

Public Function ChooseColorHookProc(ByVal hwnd As LongPtr, ByVal uMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr

End Function
```
