---
title: Overloading
parent: Language Syntax
nav_order: 6
---

# Overloading

twinBASIC supports overloading in two ways:

## Overloading by Type of Argument

The following Subs are valid together in a module/class/etc:

```vb
Sub foo(bar As Integer)
'...
End Sub

Sub foo(bar As Long)
'...
End Sub

Sub foo(bar As Double)
'...
End Sub
```

The compiler will automatically pick which one is called by the data type.

## Overloading by Number of Arguments

In addition to the above, you could also add the following:

```vb
Sub Foo(bar1 As Integer)
'...
End Sub

Sub Foo(bar1 As Integer, bar2 As Integer)
'...
End Sub
```

The compiler will automatically pick which one is called by the number and/or types of arguments.
