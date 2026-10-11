---
title: AsciiEscapeBase
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/AsciiEscapeBase
has_toc: false
---

# AsciiEscapeBase enumeration
{: .no_toc }

Selects the number base of the digits in an ASCII escape sequence.

**AsciiEscapeBase** is used by the *base* parameter of [**EscapeSequence.Create**](EscapeSequence/Create) and by the [**AsciiBase**](EscapeSequence/AsciiBase) property. It matters only for an escape sequence created with *isAsciiReplacement* set to **True**. The enumeration is declared in the [**EscapeSequence**](EscapeSequence/) class module, and its members are used without a qualifier or with the name `AsciiEscapeBase`.

| Constant | Value | Description |
|----------|-------|-------------|
| **Octal**{: #Octal } | 0 | The digits that the escape's pattern captures are octal. The package reads them with the prefix `&O`. This is the default. |
| **Hexadecimal**{: #Hexadecimal } | 1 | The digits that the escape's pattern captures are hexadecimal. The package reads them with the prefix `&H`. |

```tb check_build check_run
Debug.Print AsciiEscapeBase.Octal        ' 0
Debug.Print AsciiEscapeBase.Hexadecimal  ' 1
Debug.Print Hexadecimal                  ' 1
```

[**StringHelper**](StringHelper) registers `\xHH` as a **Hexadecimal** escape and `\ooo` as an **Octal** one.

## See Also

- [EscapeSequence](EscapeSequence/) class -- one escape sequence
- [Create](EscapeSequence/Create) method -- creates an escape sequence with a base
- [AsciiBase](EscapeSequence/AsciiBase) property -- returns the base of an escape sequence
- [Fmt package](./) -- overview, with the table of escape sequences
