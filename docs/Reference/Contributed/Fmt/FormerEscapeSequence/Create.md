---
title: Create
parent: FormerEscapeSequence
permalink: /tB/Packages/Contributed/Fmt/FormerEscapeSequence/Create
has_toc: false
---

# Create
{: .no_toc }

Creates a **FormerEscapeSequence** that holds a text and its replacement.

Syntax: *object*.**Create** ( *escape*, *replacement* ) **As FormerEscapeSequence**

*object*
: *required* An object expression that evaluates to a **FormerEscapeSequence**. The class is not predeclared, so create an instance with `New` first.

*escape*
: *required* A **String**, the text to look for. The parameter is declared **ByRef**.

*replacement*
: *required* A **String**, the replacement text. The parameter is declared **ByRef**.

Returns a new **FormerEscapeSequence** whose [**EscapeString**](EscapeString) and [**ReplacementString**](ReplacementString) hold the arguments. The object that **Create** is called on is not changed.

## Remarks

The class has no constructor with arguments. **Create** takes its place: it makes a new instance, fills in the two properties through their **Friend** setters and returns it.

## Example

```tb check_build check_run
Dim factory As New FormerEscapeSequence

Dim esc As FormerEscapeSequence
Set esc = factory.Create("\n", vbNewLine)
Debug.Print esc.EscapeString        ' \n
Debug.Print Len(esc.ReplacementString)  ' 2
Debug.Print (esc Is factory)        ' False
```

## See Also

- [EscapeString](EscapeString) property -- the text to look for
- [ReplacementString](ReplacementString) property -- the replacement text
- [FormerEscapeSequence](./) class -- overview
