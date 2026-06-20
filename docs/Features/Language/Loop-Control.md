---
title: Loop Control
parent: Language Syntax
nav_order: 12
permalink: /Features/Language/Loop-Control
---

# Loop Control

The following new statements are available for controlling the procession of loops:

- `Continue For` - Proceed to the next iteration (or end) of `For` loop.
- `Continue While` - Proceed to the next iteration (or end) of `While` loop.
- `Continue Do` - Proceed to the next iteration of `Do` loop.
- `Exit While` - Exit a `While` loop immediately.

## Example

```tb
Dim i As Long
For i = 1 To 10
    If i Mod 2 = 0 Then Continue For  ' skip even numbers
    If i > 7 Then Exit For            ' stop before reaching 8
    Debug.Print i
Next
' prints: 1, 3, 5, 7
```
