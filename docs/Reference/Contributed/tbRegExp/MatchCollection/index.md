---
title: MatchCollection
parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/MatchCollection/
has_toc: false
---

# MatchCollection class
{: .no_toc }

Holds the [**Match**](../Match/) objects that a regular expression finds in a string.

The **Execute** method of [**RegExp**](../RegExp/) returns a **MatchCollection**. When the **Global** property of the expression is **True**, the collection holds every match. Otherwise it holds the first match only. A string in which the pattern finds nothing gives an empty collection.

The collection is read by position, and the position is zero-based, as in the VBScript object model that the package replaces. [**Item**](Item) is the default member, so `matches(0)` is the same as `matches.Item(0)`. **For Each** goes through the matches in the order they were found.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "\d+"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("a1 b22 c333")
Debug.Print matches.Count     ' 3
Debug.Print matches(1).Value  ' 22

Dim s As String
Dim m As Match
For Each m In matches
    s = s & "[" & m.Value & "]"
Next
Debug.Print s                 ' [1][22][333]
```

The class has no member that adds or removes a match: only **Execute** fills a **MatchCollection**.

## Properties

- [Count](Count) -- returns the number of matches
- [Item](Item) -- returns one match by position (the default member)

## Methods

- [NewEnum](NewEnum) -- returns the enumerator that **For Each** uses (hidden)

## See Also

- [Match](../Match/) class -- one match
- [RegExp](../RegExp/) class -- its **Execute** method returns the collection
- [For Each...Next](../../../../Core/For-Each-Next) statement -- goes through the matches
- [tbRegExp package](../) -- overview
