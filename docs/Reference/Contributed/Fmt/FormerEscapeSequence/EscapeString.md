---
title: EscapeString
parent: FormerEscapeSequence
permalink: /tB/Packages/Contributed/Fmt/FormerEscapeSequence/EscapeString
has_toc: false
---

# EscapeString
{: .no_toc }

Returns or sets the text that the escape sequence looks for.

## Get

Returns a **String**.

Syntax: *object*.**EscapeString**

*object*
: *required* An object expression that evaluates to a **FormerEscapeSequence**.

The default value is an empty string.

## Let

Declared **Friend**. Sets the text.

Syntax: *object*.**EscapeString** **=** *value*

*value*
: A **String**.

## Remarks

[**Create**](Create) sets the property on the instance that it returns.

## Example

```tb check_build check_run
Dim factory As New FormerEscapeSequence
Debug.Print factory.Create("\t", vbTab).EscapeString  ' \t
```

## See Also

- [ReplacementString](ReplacementString) property -- the text that replaces it
- [Create](Create) method -- sets the text
- [FormerEscapeSequence](./) class -- overview
