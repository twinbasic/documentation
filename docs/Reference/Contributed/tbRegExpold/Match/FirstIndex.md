---
title: FirstIndex
parent: Match
permalink: /tB/Packages/Contributed/tbRegExp/Match/FirstIndex
has_toc: false
---

# FirstIndex
{: .no_toc }

Returns the zero-based position in the source string where the match starts.

Syntax: *object*.**FirstIndex**

*object*
: *required* An object expression that evaluates to a **Match**.

Returns a **Long**. The property is read-only.

## Remarks

The first character of the source string is at position 0, so the property counts the characters before the match. The index is zero-based, as in the VBScript regular expression object model that the package replaces.

The **Mid$** function counts from 1. To cut the match out of the source string with **Mid$**, pass `FirstIndex + 1` as its start position and [**Length**](Length) as its length.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "b+"

Dim text As String
text = "aabbbc"

Dim m As Match
Set m = re.Execute(text).Item(0)
Debug.Print m.FirstIndex                          ' 2
Debug.Print Mid$(text, m.FirstIndex + 1, m.Length)  ' bbb
```

## See Also

- [Length](Length) property -- the number of characters in the match
- [Value](Value) property -- the matched text
- [Execute](../RegExp/Execute) method -- creates the **Match** objects
- [Match](./) class -- overview
