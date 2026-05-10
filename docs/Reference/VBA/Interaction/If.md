---
title: If
parent: Interaction Module
permalink: /tB/Modules/Interaction/If
redirect_from:
-  /tB/Core/If
---
# If
{: .no_toc }

Returns one of two values depending on a condition, evaluating only the branch it returns. **If** is a twinBASIC addition; in VBA, the closest equivalent is [**IIf**](IIf), which always evaluates both branches.

Syntax:

- **If(** *expression* **,** *truepart* **,** *falsepart* **)**
- **If(** *expressiontruepart* **,** *falsepart* **)**

*expression*
: *required* Expression evaluated for its truth value. May be any expression that converts to **Boolean**.

*truepart*
: *required* Value or expression returned when *expression* is **True**. In the three-argument form this is evaluated only when *expression* is **True**.

*falsepart*
: *required* Value or expression returned when *expression* is **False**, or when *expressiontruepart* is **Null**, **Empty**, or **Nothing**. Evaluated only when actually needed.

*expressiontruepart*
: *required* (in the two-argument form) Expression that serves as both the test and the value to return when it is "set". The function returns *expressiontruepart* unless it is **Null**, **Empty**, or a **Nothing** object reference, in which case it returns *falsepart*. Useful for null-coalescing — for example, `If(MaybeNothing, FallbackValue)`.

The three-argument form is the inline conditional: it returns *truepart* when *expression* is **True**, *falsepart* otherwise, and only the chosen branch is evaluated. This makes expressions such as `If(Divisor <> 0, 100 / Divisor, "n/a")` safe even when *Divisor* is zero.

> [!NOTE]
> **If** uses special internal bindings in the compiler and may not behave exactly like a regular function — in particular, `Application.Run "If", ...` and other reflective callers will not invoke it.

### Example

```tb
Dim Divisor As Long
Divisor = 0

' Three-argument form — short-circuits, so the division never happens when Divisor = 0.
Dim Result As Variant
Result = If(Divisor <> 0, 100 / Divisor, "n/a")     ' "n/a"

' Two-argument form — null-coalescing.
Dim MaybeName As Variant
MaybeName = Null
Debug.Print If(MaybeName, "Anonymous")              ' "Anonymous"

MaybeName = "Alice"
Debug.Print If(MaybeName, "Anonymous")              ' "Alice"
```

### See Also

- [IIf](IIf) function
- [Choose](Choose) function
- [Switch](Switch) function
