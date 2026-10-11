---
title: SubMatches
parent: Match
permalink: /tB/Packages/Contributed/tbRegExp/Match/SubMatches
has_toc: false
---

# SubMatches
{: .no_toc }

Returns the text captured by the groups of the pattern in this match.

Syntax: *object*.**SubMatches**

*object*
: *required* An object expression that evaluates to a **Match**.

Returns a [**SubMatches**](../SubMatches/) object. The property is read-only.

## Remarks

The returned object holds one string for each capture group in the pattern, counted by [**Count**](../SubMatches/Count) and read with [**Item**](../SubMatches/Item) by position or, for a named group, by name.

When the pattern has no capture groups, the property returns an empty **SubMatches** object with a **Count** of 0. Every match of such a pattern returns the same empty object.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(\d+)-(\d+)"

Dim m As Match
Set m = re.Execute("pages 10-25").Item(0)
Debug.Print m.Value                 ' 10-25
Debug.Print m.SubMatches.Count      ' 2
Debug.Print m.SubMatches.Item(0)    ' 10
Debug.Print m.SubMatches.Item(1)    ' 25

re.Pattern = "\d+"
Set m = re.Execute("pages 10-25").Item(0)
Debug.Print m.SubMatches.Count      ' 0
```

## See Also

- [Value](Value) property -- the text of the whole match
- [SubMatches](../SubMatches/) class -- the object that the property returns
- [Match](./) class -- overview
