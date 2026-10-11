---
title: ToString
parent: StringFormatSpecifier
permalink: /tB/Packages/Contributed/Fmt/StringFormatSpecifier/ToString
has_toc: false
---

# ToString
{: .no_toc }

Returns the text of the format item that the properties describe.

Syntax: *object*.**ToString** ( ) **As String**

*object*
: *required* An object expression that evaluates to a **StringFormatSpecifier**.

Returns a **String**: an opening brace, the [**Index**](IndexProperty), a comma and the [**Alignment**](Alignment) when the alignment is not zero, a colon and the [**identifier**](identifier) when the identifier is not empty, the [**CustomSpecifier**](CustomSpecifier), and a closing brace.

## Remarks

[**StringHelper**](../StringHelper) calls **ToString** to find the item again in the text it is building, and replaces that text with the formatted value. An item that is written differently from the text that **ToString** builds therefore stays in the result unchanged. This happens to an index or an alignment written with a leading zero (`{00}`, `{0,08}`) and to an alignment of zero (`{0,0}`), because the rebuilt text is `{0}` or `{0,8}`.

```tb check_build check_run
Debug.Print StringFormat("[{0}]", 5)      ' [5]
Debug.Print StringFormat("[{00}]", 5)     ' [{00}]
Debug.Print StringFormat("[{0,08}]", 5)   ' [{0,08}]
Debug.Print StringFormat("[{0,0}]", 5)    ' [{0,0}]
```

## Example

```tb check_build check_run
Dim spec As New StringFormatSpecifier
Debug.Print spec.ToString()  ' {0}

spec.Index = 1
spec.Alignment = 8
spec.identifier = "F"
spec.CustomSpecifier = "2"
Debug.Print spec.ToString()  ' {1,8:F2}
```

## See Also

- [Index](IndexProperty) property -- the position of the value
- [Alignment](Alignment) property -- the width of the value
- [identifier](identifier) property -- the format letter
- [CustomSpecifier](CustomSpecifier) property -- the text after the letter
- [StringFormatSpecifier](./) class -- overview
