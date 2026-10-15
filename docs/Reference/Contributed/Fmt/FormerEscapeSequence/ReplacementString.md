---
title: ReplacementString
parent: FormerEscapeSequence
permalink: /tB/Packages/Contributed/Fmt/FormerEscapeSequence/ReplacementString
has_toc: false
---

# ReplacementString
{: .no_toc }

<!-- test: EscapeSequenceTests.Former_Create_ReturnsANewObjectWithTheArguments, EscapeSequenceTests.Former_Friend_Setters_CanBeCalledByAProject -->

Returns or sets the text that replaces the escape sequence.

## Get

Returns a **String**.

Syntax: *object*.**ReplacementString**

*object*
: *required* An object expression that evaluates to a **FormerEscapeSequence**.

The default value is an empty string.

## Let

Declared **Friend**. Sets the replacement text.

Syntax: *object*.**ReplacementString** **=** *value*

*value*
: A **String**.

## Remarks

[**Create**](Create) sets the property on the instance that it returns.

<!-- /test -->

## Example

```tb check_build check_run
Dim factory As New FormerEscapeSequence
Debug.Print factory.Create("\q", Chr$(34)).ReplacementString  ' "
```

## See Also

- [EscapeString](EscapeString) property -- the text that is replaced
- [Create](Create) method -- sets the replacement
- [FormerEscapeSequence](./) class -- overview
