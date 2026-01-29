---
title: Inline Variable Initialization
parent: Language Syntax
nav_order: 14
---

# Inline Variable Initialization

You can now set initial values for variables inline, without needing a line-continuation character.

## Examples

```vb
Dim i As Long = 1
Dim foo As Boolean = bar()
Dim arr As Variant = Array(1, 2, 3)
Dim strArr(2) As String = Array("a", "b", "c")
Dim cMC As cMyClass = New cMyClass(customConstructorArgs)
```

## Inline Variable Declaration for For

You now no longer need a separate `Dim` statement for counter variables:

```vb
For i As Long = 0 To 10
    '...
Next
```

is now valid syntax. You can use any type, not just `Long`.
