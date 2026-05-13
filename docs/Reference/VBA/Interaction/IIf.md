---
title: IIf
parent: Interaction Module
permalink: /tB/Modules/Interaction/IIf
redirect_from:
-  /tB/Core/IIf
vba_attribution: true
---
# IIf
{: .no_toc }

Returns one of two values, depending on the evaluation of an expression.

Syntax: **IIf(** *expr* **,** *truepart* **,** *falsepart* **)**

*expr*
: *required* Expression to evaluate.

*truepart*
: *required* Value or expression returned if *expr* is **True**.

*falsepart*
: *required* Value or expression returned if *expr* is **False**.

> [!NOTE]
> **IIf** always evaluates both *truepart* and *falsepart*, even though it returns only one of them. Watch for side effects: if the unused branch would raise an error (for example, division by zero), the error still occurs. Use the short-circuiting [**If**](If) function — a twinBASIC addition — when you need to guard against errors in the unused branch.

### Example

This example uses **IIf** to return the word "Large" if the amount is greater than 1000, and "Small" otherwise.

```tb
Function CheckIt(TestMe As Integer) As String
    CheckIt = IIf(TestMe > 1000, "Large", "Small")
End Function
```

### See Also

- [If](If) function
- [Choose](Choose) function
- [Switch](Switch) function
