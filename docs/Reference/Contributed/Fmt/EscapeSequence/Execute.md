---
title: Execute
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/Execute
has_toc: false
---

# Execute
{: .no_toc }

Applies the escape sequence to a string, replacing it in place.

Syntax: *object*.**Execute** ( *string_value* )

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

*string_value*
: *required* A **String** variable, passed by reference. On return it holds the text with the sequence replaced.

## Remarks

A plain sequence replaces every occurrence of [**EscapeString**](EscapeString) with [**ReplacementString**](ReplacementString). The match takes letter case into account, so `\z` does not replace `\Z`. The string is left alone when it does not contain the text.

An ASCII sequence reads [**EscapeString**](EscapeString) as a regular expression that ignores letter case. For each match it reads the digits of the first capture group in the base given by [**AsciiBase**](AsciiBase) and replaces the matched text with the character that has that code. [**ReplacementString**](ReplacementString) is not used. Two details follow from the implementation:

- The expression is applied only when the string contains a backslash. A pattern that does not match a backslash, such as `#(\d{3})`, has no effect on a string that has none.
- Digits that are not valid in the base, as in `\189` read as octal, raise run-time error 13, *Type mismatch*.

## Example

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\z", "ZZ")

Dim text As String
text = "a\zb\z"
esc.Execute text
Debug.Print text  ' aZZbZZ

text = "a\Zb"
esc.Execute text
Debug.Print text  ' a\Zb
```

## See Also

- [Create](Create) method -- creates an escape sequence
- [AsciiBase](AsciiBase) property -- the number base of an ASCII sequence
- [EscapeSequence](./) class -- overview
