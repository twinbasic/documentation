---
title: Count
parent: SubMatches
grand_parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/SubMatches/Count
has_toc: false
---

# Count
{: .no_toc }

Returns the number of strings in the collection, one for each capture group of the pattern.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **SubMatches**.

Returns a **Long**. The property is read-only.

## Remarks

**Count** is the number of capture groups in the pattern, not the number of groups that took part in the match. A group that took no part still has its position, and its string is empty. It is 0 for a pattern with no capture groups.

The positions that [**Item**](Item) accepts run from 0 to **Count** - 1.

## Example

```tb check_build check_run
Dim re As New RegExp
Dim matches As MatchCollection
Dim sm As SubMatches

re.Pattern = "\d+"
Set matches = re.Execute("a1")
Set sm = matches(0).SubMatches
Debug.Print sm.Count    ' 0

re.Pattern = "(a)|(b)"
Set matches = re.Execute("b")
Set sm = matches(0).SubMatches
Debug.Print sm.Count    ' 2
Debug.Print Len(sm(0))  ' 0
Debug.Print sm(1)       ' b
```

## See Also

- [Item](Item) property -- returns a string by position or by name
- [SubMatches](./) class -- overview
