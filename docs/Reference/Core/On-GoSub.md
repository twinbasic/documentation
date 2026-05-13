---
title: On...GoSub
parent: Statements
permalink: /tB/Core/On-GoSub
vba_attribution: true
---
# On...GoSub
{: .no_toc }

Branches to one of several specified subroutine lines, depending on the value of an expression.

The **On...GoSub** statement is documented together with **On...GoTo** on the [**On...GoTo, On...GoSub**](On-GoTo) page.

Syntax:
> **On** *expression* **GoSub** *destinationlist*

When *expression* evaluates to *n*, control transfers to the *n*-th label in *destinationlist*, just as if a [**GoSub**](GoSub-Return) had been executed against that label. A subsequent [**Return**](Return) within the called subroutine resumes execution at the statement following the **On...GoSub**. See [**On...GoTo, On...GoSub**](On-GoTo) for the full description of out-of-range values, the 0-255 constraint on *expression*, and worked examples.

### See Also

- [**On...GoTo** statement](On-GoTo)
- [**GoSub...Return** statement](GoSub-Return)
- [**Select Case** statement](Select-Case)
