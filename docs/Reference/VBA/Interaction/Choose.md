---
title: Choose
parent: Interaction Module
permalink: /tB/Modules/Interaction/Choose
redirect_from:
-  /tB/Core/Choose
vba_attribution: true
---
# Choose
{: .no_toc }

Selects and returns a value from a list of arguments by 1-based index.

Syntax: **Choose(** *index* **,** *choice-1* [ **,** *choice-2* **, ...** [ **,** *choice-n* ] ] **)**

*index*
: *required* Numeric expression that evaluates to a value between 1 and the number of available choices.

*choice*
: *required* **Variant** expression containing one of the possible choices.

If *index* is 1, **Choose** returns *choice-1*; if *index* is 2, it returns *choice-2*; and so on. If *index* is less than 1 or greater than the number of choices listed, **Choose** returns **Null**. Non-integer values of *index* are rounded to the nearest whole number before being evaluated.

> [!NOTE]
> **Choose** evaluates *every* choice in the list, not only the one it returns. Watch for side effects: a [**MsgBox**](MsgBox) call inside any of the choices is invoked once per choice, not just for the selected one. To avoid this --- for example, when one of the branches would error out --- use the short-circuiting [**If**](If) function instead.

### Example

This example uses **Choose** to map a 1-based option index to a name.

```tb
Function GetChoice(Ind As Integer) As String
    GetChoice = Choose(Ind, "Speedy", "United", "Federal")
End Function
```

### See Also

- [If](If) function
- [IIf](IIf) function
- [Switch](Switch) function
