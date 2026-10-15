---
title: AsciiBase
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/AsciiBase
has_toc: false
---

# AsciiBase
{: .no_toc }

<!-- test: EscapeSequenceTests.Create_Plain_HoldsTheArguments, EscapeSequenceTests.Create_Ascii_HoldsTheArguments, EscapeSequenceTests.Friend_Setters_CanBeCalledByAProject -->

Returns or sets the number base of the digits that an ASCII escape sequence captures.

## Get

Returns an [**AsciiEscapeBase**](../AsciiEscapeBase) value.

Syntax: *object*.**AsciiBase**

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

The default value is **Octal**. The value matters only when [**IsAsciiCharacter**](IsAsciiCharacter) is **True**.

## Let

Declared **Friend**. Sets the number base.

Syntax: *object*.**AsciiBase** **=** *value*

*value*
: An [**AsciiEscapeBase**](../AsciiEscapeBase) value: **Octal** (0) or **Hexadecimal** (1).

## Remarks

[**Create**](Create) sets the property from its *base* argument. [**Execute**](Execute) reads the captured digits with the prefix `&O` for **Octal** and `&H` for **Hexadecimal**.

<!-- /test -->

## Example

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\\x(\w{2})", vbNullString, True, Hexadecimal)
Debug.Print esc.AsciiBase  ' 1

Set esc = EscapeSequence.Create("\\(\d{3})", vbNullString, True)
Debug.Print esc.AsciiBase  ' 0
```

## See Also

- [IsAsciiCharacter](IsAsciiCharacter) property -- whether the base is used
- [Create](Create) method -- sets the base
- [AsciiEscapeBase](../AsciiEscapeBase) enumeration -- the number bases
- [EscapeSequence](./) class -- overview
