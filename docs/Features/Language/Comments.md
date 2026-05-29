---
title: Comment Syntax
parent: Language Syntax
nav_order: 17
permalink: /Features/Language/Comments
---

# New Comment Syntax

## Block and Inline Comments

You can now use `/* */` syntax. For example, `Sub Foo(bar As Long /* out */)` or:

```c
/*
Everything here is
a comment until:
*/
```

### Example

```tb
' Single-line comment using the apostrophe

Sub Greet(ByVal name As String /* in */)
    Debug.Print "Hello, " & name  ' inline comment
    /*
    This block comment
    spans multiple lines.
    */
End Sub
```

