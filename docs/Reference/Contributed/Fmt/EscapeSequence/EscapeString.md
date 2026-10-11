---
title: EscapeString
parent: EscapeSequence
permalink: /tB/Packages/Contributed/Fmt/EscapeSequence/EscapeString
has_toc: false
---

# EscapeString
{: .no_toc }

Returns or sets the text, or the regular expression, that the escape sequence looks for.

## Get

Returns a **String**.

Syntax: *object*.**EscapeString**

*object*
: *required* An object expression that evaluates to an **EscapeSequence**.

The default value is an empty string. For a plain sequence the value is the text itself, such as `\n`. For an ASCII sequence ([**IsAsciiCharacter**](IsAsciiCharacter) is **True**) it is a regular expression with one capture group, such as `\\x(\w{2})`.

## Let

Declared **Friend**. Sets the text or the expression.

Syntax: *object*.**EscapeString** **=** *value*

*value*
: A **String**.

## Remarks

[**Create**](Create) sets the property from its *escape* argument.

## Example

```tb check_build check_run
Dim esc As EscapeSequence
Set esc = EscapeSequence.Create("\z", "ZZ")
Debug.Print esc.EscapeString  ' \z

esc.EscapeString = "\y"
Debug.Print esc.EscapeString  ' \y
```

## See Also

- [ReplacementString](ReplacementString) property -- the text that replaces it
- [Create](Create) method -- sets the text
- [Execute](Execute) method -- applies the sequence
- [EscapeSequence](./) class -- overview
