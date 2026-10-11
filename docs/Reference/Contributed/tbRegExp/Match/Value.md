---
title: Value
parent: Match
permalink: /tB/Packages/Contributed/tbRegExp/Match/Value
has_toc: false
---

# Value
{: .no_toc }

Returns the text of the whole match.

Syntax: *object*.**Value**

*object*
: *required* An object expression that evaluates to a **Match**.

Returns a **String**. The property is read-only.

## Remarks

**Value** is the default member of **Match**, so an expression that needs a **String** can name the object alone.

The text is the part of the source string that begins at [**FirstIndex**](FirstIndex) and has [**Length**](Length) characters. The text captured by the groups of the pattern is in [**SubMatches**](SubMatches).

## Example

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "[a-z]+"

Dim m As Match
Set m = re.Execute("42 apples").Item(0)

Dim text As String
text = m.Value
Debug.Print text  ' apples

text = m          ' the default member is Value
Debug.Print text  ' apples
```

## See Also

- [FirstIndex](FirstIndex) property -- the position where the match starts
- [Length](Length) property -- the number of characters in the match
- [SubMatches](SubMatches) property -- the text captured by the groups of the pattern
- [Match](./) class -- overview
