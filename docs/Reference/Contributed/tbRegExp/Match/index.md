---
title: Match
parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/Match/
has_toc: false
---

# Match class
{: .no_toc }

Holds one match that a **RegExp** found in a string: the matched text, where it starts, how many characters it has, and the text captured by the groups of the pattern.

[**RegExp.Execute**](../RegExp/Execute) creates one **Match** for each match it finds and returns them in a [**MatchCollection**](../MatchCollection/), in the order found. All four properties are read-only, and the values are set once, when **Execute** creates the **Match**.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"

Dim m As Match
Set m = re.Execute("42 apples").Item(0)
Debug.Print m.Value       ' apples
Debug.Print m.FirstIndex  ' 3
Debug.Print m.Length      ' 6
```

## Properties

- [FirstIndex](FirstIndex) -- returns the zero-based position where the match starts
- [Length](Length) -- returns the number of characters in the match
- [SubMatches](SubMatches) -- returns the text captured by the groups of the pattern
- [Value](Value) -- returns the matched text (default member)

## See Also

- [RegExp](../RegExp/) class -- searches a string and creates the **Match** objects
- [MatchCollection](../MatchCollection/) class -- holds the matches that **Execute** finds
- [SubMatches](../SubMatches/) class -- holds the text captured by the groups of one match
- [tbRegExp package](../) -- overview
