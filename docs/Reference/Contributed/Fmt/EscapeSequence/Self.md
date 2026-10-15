---
title: Self
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/Self
has_toc: false
---

# Self
{: .no_toc }

<!-- test: EscapeSequenceTests.Self_ReturnsTheSameObject -->

Returns the escape sequence object itself.

Syntax: *object*.**Self**

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

Returns the same **EscapeSequence** that *object* refers to. The property is read-only and is declared **Friend**.

## Remarks

[**Create**](Create) builds the new instance inside a `With New EscapeSequence` block and returns it through **Self**, because a `With` block does not give a way to name the object it works on. A project that references the package can call **Self** as well, though it only returns what the caller already holds.

<!-- /test -->

## Example

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\z", "ZZ")
Debug.Print (esc.Self Is esc)  ' True
```

## See Also

- [Create](Create) method -- uses the property
- [EscapeSequence](./) class -- overview
