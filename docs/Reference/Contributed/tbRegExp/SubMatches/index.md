---
title: SubMatches
parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/SubMatches/
has_toc: false
---

# SubMatches class
{: .no_toc }

Holds the strings that the capture groups of a pattern captured in one [**Match**](../Match/).

The [**SubMatches**](../Match/SubMatches) property of a **Match** returns a **SubMatches** object. It holds one string for each capture group in the pattern, in the order of the groups. A pattern with no capture groups gives an object whose [**Count**](Count) is 0. A group that took no part in the match, such as one side of an alternation that did not match, still has its position, and its string is empty.

The strings are read by position or by name. The position is zero-based, as in the VBScript object model that the package replaces. A group written `(?<name>...)` has a name, and its string can be read by that name as well. [**Item**](Item) is the default member, so `sm(0)` is the same as `sm.Item(0)`. **For Each** goes through the strings in the order of their positions.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})"

Dim matches As MatchCollection
Set matches = re.Execute("Released on 2026-10-11.")

Dim sm As SubMatches
Set sm = matches(0).SubMatches
Debug.Print sm.Count     ' 3
Debug.Print sm(0)        ' 2026
Debug.Print sm("month")  ' 10
```

The class has no member that adds or removes a string: the package fills a **SubMatches** from the groups of the match it belongs to.

## Properties

- [Count](Count) -- returns the number of strings
- [Item](Item) -- returns one string by position or by group name (the default member)

## Methods

- [NewEnum](NewEnum) -- returns the enumerator that **For Each** uses (hidden)

## See Also

- [Match](../Match/) class -- one match; its **SubMatches** property returns this object
- [MatchCollection](../MatchCollection/) class -- the matches of a search
- [RegExp](../RegExp/) class -- runs the search
- [For Each...Next](../../../../Core/For-Each-Next) statement -- goes through the strings
- [tbRegExp package](../) -- overview
