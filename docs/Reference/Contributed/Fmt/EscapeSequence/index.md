---
title: EscapeSequence
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/
has_toc: false
---

# EscapeSequence class
{: .no_toc }

<!-- test: EscapeSequenceTests.Create_Plain_HoldsTheArguments, EscapeSequenceTests.Create_Ascii_HoldsTheArguments, EscapeSequenceTests.Execute_Plain_ReplacesEveryOccurrence, EscapeSequenceTests.Execute_Ascii_Hexadecimal, EscapeSequenceTests.Friend_Setters_CanBeCalledByAProject, EscapeSequenceTests.Self_ReturnsTheSameObject -->

Describes one escape sequence of a format string, the text to look for and what replaces it, and applies it to a string.

An escape sequence is either plain or ASCII:

- A **plain** sequence replaces every occurrence of a fixed text with a fixed replacement. `\n` and `\t` are plain.
- An **ASCII** sequence is a regular expression with one capture group. The group captures the digits of a character code, which are read in octal or hexadecimal ([**AsciiEscapeBase**](../AsciiEscapeBase)), and each match is replaced with the character that has that code. `\xHH` and `\ooo` are ASCII.

**EscapeSequence** is predeclared. [**Create**](Create) is called on the class name and returns a configured instance, and [**Execute**](Execute) applies the sequence to a string. [**StringHelper**](../StringHelper) creates the ten sequences that **StringFormat** expands; the [package overview](../#escape-sequences) lists them.

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\z", "ZZ")

Dim text As String
text = "a\zb"
esc.Execute text
Debug.Print text  ' aZZb
```

> [!NOTE] BETA 1005
> [**Self**](Self) and the four property setters ([**AsciiBase**](AsciiBase), [**EscapeString**](EscapeString), [**IsAsciiCharacter**](IsAsciiCharacter) and [**ReplacementString**](ReplacementString) with **Let**) are declared **Friend**, for [**Create**](Create) to use. A project that references the package can call them too, so the properties of an instance can be changed after it is created.

<!-- /test -->

## Properties

- [AsciiBase](AsciiBase) -- returns the number base of an ASCII sequence
- [EscapeString](EscapeString) -- returns the text or the pattern to look for
- [IsAsciiCharacter](IsAsciiCharacter) -- returns whether the sequence is an ASCII sequence
- [ReplacementString](ReplacementString) -- returns the text that replaces a plain sequence
- [Self](Self) -- returns the object itself

## Methods

- [Create](Create) -- creates an escape sequence
- [Execute](Execute) -- applies the sequence to a string

## See Also

- [AsciiEscapeBase](../AsciiEscapeBase) enumeration -- the number bases
- [StringHelper](../StringHelper) class -- creates and applies the sequences
- [FormerEscapeSequence](../FormerEscapeSequence/) class -- a plain sequence without an **Execute** method, unused by the package
- [Fmt package](../) -- overview, with the table of escape sequences
