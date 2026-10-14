---
title: Split
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Split
has_toc: false
---

# Split
{: .no_toc }

Splits a string at the matches of the pattern and returns the pieces as a **Collection**.

Syntax: *object*.**Split** ( *sourceString* ) **As Collection**

*object*
: *required* An object expression that evaluates to a [**RegExp**](./).

*sourceString*
: *required* A **String**, the text to split.

Returns a new **Collection** of **String** values, numbered from 1. It holds the text before the first match, the text between each match and the next, and the text after the last match. The matched text itself is not in the collection.

## Remarks

[**Global**](Global) sets how many matches split the string. With **Global** set to **False**, the default, only the first match splits it, so the collection holds the text before that match and the text after it. With **Global** set to **True**, every match splits it.

A match that has capture groups adds the text of each group to the collection, in order, straight after the text before that match. A group that took no part in the match, or matched nothing, adds an empty string.

When [**Pattern**](Pattern) finds no match, the collection holds one item, the whole of *sourceString*. No piece is dropped: a match at the start of the string gives an empty first string, and two matches next to each other give an empty string between them.

[**IgnoreCase**](IgnoreCase), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) apply to the matching.

A match of no characters splits the string at its position, once. In this example the string is split before each capital letter.

```tb check_build check_run
Dim re As New RegExp
re.Global = True
re.Pattern = "(?=[A-Z])"

Dim parts As Collection
Set parts = re.Split("fooBarBaz")
Debug.Print parts.Count                                          ' 3
Debug.Print parts(1) & "|" & parts(2) & "|" & parts(3)           ' foo|Bar|Baz
```

<!-- test: SearchGivesUpTests.Split_CatastrophicPatternKeepsNothing -->
A search that backtracks without end, such as `(a+)+b` on thirty `a`, gives up instead of hanging, and **Split** then raises an error. No partly split collection is returned. See [**SearchStepLimit**](SearchStepLimit).
<!-- /test -->

When **Pattern** is not a valid regular expression, **Split** raises the compile error. Its number is [**LastErrorNumber**](LastErrorNumber), its description is [**LastError**](LastError), and its source is `RegExp`. Read [**IsValid**](IsValid) first to avoid the error.

## Example

This example splits a list at each comma, first at the first match only, then at every match.

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = ",\s*"

Dim parts As Collection
Set parts = re.Split("red, green,blue")
Debug.Print parts.Count   ' 2
Debug.Print parts(1)      ' red
Debug.Print parts(2)      ' green,blue

re.Global = True
Set parts = re.Split("red, green,blue")
Debug.Print parts.Count   ' 3
Debug.Print parts(1)      ' red
Debug.Print parts(2)      ' green
Debug.Print parts(3)      ' blue
```

This example shows the text of a capture group in the result.

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(-)"
re.Global = True

Dim parts As Collection
Set parts = re.Split("a-b-c")
Debug.Print parts.Count   ' 5
Debug.Print parts(1)      ' a
Debug.Print parts(2)      ' -
Debug.Print parts(3)      ' b
Debug.Print parts(4)      ' -
Debug.Print parts(5)      ' c
```

## See Also

- [Execute](Execute) method -- returns the matches themselves
- [Replace](Replace) method -- replaces the matches
- [Global](Global) property -- all matches or only the first
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
