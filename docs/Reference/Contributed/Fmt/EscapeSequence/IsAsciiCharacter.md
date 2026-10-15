---
title: IsAsciiCharacter
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/IsAsciiCharacter
has_toc: false
---

# IsAsciiCharacter
{: .no_toc }

<!-- test: EscapeSequenceTests.Create_Plain_HoldsTheArguments, EscapeSequenceTests.Create_Ascii_HoldsTheArguments, EscapeSequenceTests.Friend_Setters_CanBeCalledByAProject -->

Returns or sets whether the escape sequence stands for a character code instead of fixed text.

## Get

Returns a **Boolean**.

Syntax: *object*.**IsAsciiCharacter**

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

The default value is **False**. **True** means that [**EscapeString**](EscapeString) is a regular expression whose capture group holds the digits of a character code, and that [**ReplacementString**](ReplacementString) is not used.

## Let

Declared **Friend**. Sets the value.

Syntax: *object*.**IsAsciiCharacter** **=** *value*

*value*
: A **Boolean**.

## Remarks

[**Create**](Create) sets the property from its *isAsciiReplacement* argument. [**Execute**](Execute) takes the ASCII path when the value is **True**, reading the digits in the base given by [**AsciiBase**](AsciiBase).

<!-- /test -->

## Example

```tb check_build check_run
Debug.Print EscapeSequence.Create("\n", vbNewLine).IsAsciiCharacter                       ' False
Debug.Print EscapeSequence.Create("\\(\d{3})", vbNullString, True).IsAsciiCharacter      ' True
```

## See Also

- [AsciiBase](AsciiBase) property -- the number base used when the value is **True**
- [Create](Create) method -- sets the value
- [EscapeSequence](./) class -- overview
