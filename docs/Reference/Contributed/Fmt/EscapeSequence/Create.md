---
title: Create
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/Create
has_toc: false
---

# Create
{: .no_toc }

<!-- test: EscapeSequenceTests.Create_Plain_HoldsTheArguments, EscapeSequenceTests.Create_Ascii_HoldsTheArguments, EscapeSequenceTests.Create_ReturnsANewObjectEachTime, EscapeSequenceTests.Execute_Ascii_Hexadecimal -->

Creates an escape sequence, plain or ASCII.

Syntax: *object*.**Create** ( *escape*, *replacement* [, *isAsciiReplacement* [, *base* ]] ) **As EscapeSequence**

*object*
: *required* The class name, `EscapeSequence`, which is predeclared.

*escape*
: *required* A **String**. For a plain sequence, the text to look for, such as `\n`. For an ASCII sequence, a regular expression with one capture group that captures the digits of the character code, such as `\\x(\w{2})`. The expression ignores letter case.

*replacement*
: *required* A **String**, the text that replaces *escape* in a plain sequence. An ASCII sequence ignores it, and `vbNullString` can be passed.

*isAsciiReplacement*
: *optional* A **Boolean**. **True** makes the sequence an ASCII sequence. The default is **False**.

*base*
: *optional* An [**AsciiEscapeBase**](../AsciiEscapeBase) value, the number base of the captured digits. It matters only for an ASCII sequence. The default is **Octal**.

Returns a new **EscapeSequence** whose [**EscapeString**](EscapeString), [**ReplacementString**](ReplacementString), [**IsAsciiCharacter**](IsAsciiCharacter) and [**AsciiBase**](AsciiBase) properties hold the arguments.

## Remarks

**Create** is the intended way to make an escape sequence. It fills in a new instance through the **Friend** setters of the properties and returns it through [**Self**](Self).

<!-- /test -->

## Example

This example creates a plain sequence and an ASCII sequence.

```tb check_build check_run
Dim plain As EscapeSequence
Set plain = EscapeSequence.Create("\z", "ZZ")
Debug.Print plain.EscapeString & " " & plain.ReplacementString  ' \z ZZ
Debug.Print plain.IsAsciiCharacter                              ' False

Dim ascii As EscapeSequence
Set ascii = EscapeSequence.Create("\\#(\d{2})", vbNullString, True, Hexadecimal)
Debug.Print ascii.IsAsciiCharacter                              ' True
Debug.Print ascii.AsciiBase                                     ' 1

Dim text As String
text = "a\#41b\#42"
ascii.Execute text
Debug.Print text                                                ' aAbB
```

## See Also

- [Execute](Execute) method -- applies the sequence to a string
- [AsciiEscapeBase](../AsciiEscapeBase) enumeration -- the number bases
- [EscapeSequence](./) class -- overview
