---
title: Length
parent: Match
permalink: /tB/Packages/Contributed/tbRegExp/Match/Length
has_toc: false
---

# Length
{: .no_toc }

Returns the number of characters in the match.

Syntax: *object*.**Length**

*object*
: *required* An object expression that evaluates to a **Match**.

Returns a **Long**. The property is read-only.

## Remarks

The value is the length of the matched text that [**Value**](Value) returns. Together with [**FirstIndex**](FirstIndex) it gives the range of the source string that the match covers.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "b+"

Dim m As Match
Set m = re.Execute("aabbbc").Item(0)
Debug.Print m.Length      ' 3
Debug.Print Len(m.Value)  ' 3
```

## See Also

- [FirstIndex](FirstIndex) property -- the position where the match starts
- [Value](Value) property -- the matched text
- [Match](./) class -- overview
