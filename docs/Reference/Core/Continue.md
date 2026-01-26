---
title: Continue
parent: Statements
permalink: /tB/Core/Continue
---

# Continue

{: no_toc }

Immediately begins the next iteration of the enclosing loop.

Syntax: **Continue** [ **Do** \| **For** \| **While** ]

Do

: Used within a [Do](Do-Loop) loop.

For

: Used within a [For](For-Next) loop.

While

: Used within a [While](While-Wend) loop

### Example

This example uses **Continue For** to skip processing of certain characters of the string.

```vb
Dim i%, ch$, text$
For i = 1 To 10
    ch = Mid$(text, i, 1)
    If ch = " " Then Continue For
    ' Process a non-space character here
Next i
```

