---
title: ReplacementString
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/ReplacementString
has_toc: false
---

# ReplacementString
{: .no_toc }

<!-- test: EscapeSequenceTests.Create_Plain_HoldsTheArguments, EscapeSequenceTests.Friend_Setters_CanBeCalledByAProject, EscapeSequenceTests.Execute_Plain_ReplacesEveryOccurrence -->

Returns or sets the text that replaces a plain escape sequence.

## Get

Returns a **String**.

Syntax: *object*.**ReplacementString**

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

The default value is an empty string. An ASCII sequence ([**IsAsciiCharacter**](IsAsciiCharacter) is **True**) does not use the value.

## Let

Declared **Friend**. Sets the replacement text.

Syntax: *object*.**ReplacementString** **=** *value*

*value*
: A **String**.

## Remarks

[**Create**](Create) sets the property from its *replacement* argument. [**Execute**](Execute) puts the value in place of every occurrence of [**EscapeString**](EscapeString).

<!-- /test -->

## Example

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\n", vbNewLine)
Debug.Print Len(esc.ReplacementString)  ' 2
```

## See Also

- [EscapeString](EscapeString) property -- the text that is replaced
- [Create](Create) method -- sets the replacement
- [Execute](Execute) method -- applies the sequence
- [EscapeSequence](./) class -- overview
