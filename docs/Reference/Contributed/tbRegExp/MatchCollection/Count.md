---
title: Count
parent: MatchCollection
permalink: /tB/Packages/Contributed/tbRegExp/MatchCollection/Count
has_toc: false
---

# Count
{: .no_toc }

Returns the number of [**Match**](../Match/) objects in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **MatchCollection**.

Returns a **Long**. The property is read-only.

## Remarks

For the collection that the **Execute** method of [**RegExp**](../RegExp/) returns, **Count** is the number of matches found in the source string. It is 0 when the pattern finds nothing. When the **Global** property of the expression is **False**, the collection holds the first match only, so **Count** is at most 1.

The positions that [**Item**](Item) accepts run from 0 to **Count** - 1.

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"
re.Global = True
Debug.Print re.Execute("one two three").Count  ' 3
Debug.Print re.Execute("1 2 3").Count          ' 0

re.Global = False
Debug.Print re.Execute("one two three").Count  ' 1
```

## See Also

- [Item](Item) property -- returns a match by position
- [MatchCollection](./) class -- overview
