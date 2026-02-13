---
title: Return Syntax
parent: Language Syntax
nav_order: 13
permalink: /Features/Language/Return
---

# Return Syntax

You can now combine assigning a return value and exiting a procedure into a single statement like many other languages allow. This is accomplished with the `Return` keyword:

```vb
Private Function Foo() As Long
    Dim i As Long = 1
    If i Then
        Return i
    End If
End Function
```

This is the equivalent of:

```vb
Private Function Foo() As Long
    Dim i As Long = 1
    If i Then
        Foo = i
        Exit Function
    End If
End Function
```

`Return` can be used to return objects as well. It is currently only valid with a value specified and within a function; you cannot use `Return` without anything after it in a sub.

`Return` can be used in function procedures, function method procedures, and property getter procedures.
