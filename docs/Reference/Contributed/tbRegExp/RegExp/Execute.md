---
title: Execute
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Execute
has_toc: false
---

# Execute
{: .no_toc }

Searches a string for the pattern and returns the matches.

Syntax: *object*.**Execute** ( *sourceString* ) **As MatchCollection**

*object*
: *required* An object expression that evaluates to a **RegExp**.

*sourceString*
: *required* A **String**, the text to search.

Returns a [**MatchCollection**](../MatchCollection/) that holds one [**Match**](../Match/) for each match of [**Pattern**](Pattern) in *sourceString*, in the order they occur. The collection is empty when there is no match.

## Remarks

With [**Global**](Global) set to **False**, the collection holds at most one match, the first. With **Global** set to **True** it holds every match.

[**IgnoreCase**](IgnoreCase), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) change what counts as a match.

> [!WARNING]
> With **Global** set to **True**, a match of no characters is returned twice when the search had to skip at least one character to reach it, so the collection holds one **Match** too many at each such position. A pattern that can match no characters is affected: `$`, `\b`, `^` with **MultiLine** set to **True**, and a lookahead or lookbehind on its own. VBScript's **RegExp** returns each such match once. A match of one or more characters is never repeated, and with **Global** set to **False** nothing is. This is how version 1.4.0.0 behaves.

The pattern in this example matches no characters, before each capital letter. `fooBarBaz` has two capitals, and the collection holds four matches.

```tb check_build check_run
Dim re As New RegExp
re.Global = True
re.Pattern = "(?=[A-Z])"
Debug.Print re.Execute("fooBarBaz").Count  ' 4
```

Each **Match** gives the matched text ([**Value**](../Match/Value)), the position where it starts ([**FirstIndex**](../Match/FirstIndex), counted from 0), its length, and the text of each group of the pattern ([**SubMatches**](../Match/SubMatches)). A group written `(?<name>...)` can be read by its name.

An invalid pattern raises the compile error, with the number in [**LastErrorNumber**](LastErrorNumber) and the description in [**LastError**](LastError). Check [**IsValid**](IsValid) first to avoid it.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(?<year>\d{4})-(?<month>\d{2})"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("2026-10 and 2027-01")
Debug.Print matches.Count

Dim m As Match
For Each m In matches
    Debug.Print m.Value & " at " & m.FirstIndex & ": " & m.SubMatches.Item("year") & "/" & m.SubMatches.Item("month")
Next

re.Global = False
Debug.Print re.Execute("2026-10 and 2027-01").Count
Debug.Print re.Execute("no date").Count
' Output:
' 2
' 2026-10 at 0: 2026/10
' 2027-01 at 12: 2027/01
' 1
' 0
```

## See Also

- [Test](Test) method -- returns whether a string contains a match
- [Replace](Replace) method -- replaces the matches
- [Split](Split) method -- splits a string at the matches
- [Global](Global) property -- all matches or the first
- [MatchCollection](../MatchCollection/) class -- the result
- [RegExp](./) class -- overview
