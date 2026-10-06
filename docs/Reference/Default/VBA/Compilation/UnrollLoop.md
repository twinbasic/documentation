---
title: UnrollLoop
parent: Compilation Module
permalink: /tB/Modules/Compilation/UnrollLoop
---
# UnrollLoop
{: .no_toc }

*(twinBASIC)* Asks the LLVM compiler to unroll the loop that contains it, for speed.

Syntax: **UnrollLoop** [ *maxloopunrollcount* ]

*maxloopunrollcount*
: *optional* The greatest number of times the loop body may be repeated in one unrolled iteration. It must be a literal **Integer** or **Long** value from 0 to 2,147,483,647, or the name of a constant that has such a value. A variable, an expression such as `2 + 2`, a negative number or a non-integer is compile error **TB5023**, *expected a literal Integer or Long value*.

*Unrolling* a loop repeats its body several times in each iteration, so that the loop tests its condition and jumps back less often. **UnrollLoop** is a hint to the [LLVM compiler](../../../LLVM/Getting-Started): it does not change what the loop does, only how the compiled code is laid out. Code that is not compiled with LLVM ignores it.

**UnrollLoop** must be the first statement in the body of a **For...Next**, **Do While...Loop**, **Do Until...Loop** or **While...Wend** loop. Comments, blank lines and **Dim** statements may come before it. Anywhere else --- before or after the loop, after another statement in the body, inside an **If** block in the body, in a **For Each...Next** loop, or in a **Do...Loop** with its condition at the end or with none --- it is compile error **TB5023**, *UnrollLoop() must appear immediately inside the start of a For/While loop*.

It can be written with or without parentheses and qualified or not: `UnrollLoop 4`, `UnrollLoop(4)` and `Compilation.UnrollLoop 4` are the same.

> [!NOTE]
> **UnrollLoop** is a twinBASIC extension. VBA and VB6 have no such statement.

### Example

```tb check_build
Function SumOfSquares(ByVal Count As Long) As Double
    Dim i As Long
    For i = 1 To Count
        UnrollLoop 4
        SumOfSquares = SumOfSquares + CDbl(i) * i
    Next
End Function
```

### See Also

- [Getting Started with LLVM](../../../LLVM/Getting-Started)
- [CompilerVersion](CompilerVersion) function
