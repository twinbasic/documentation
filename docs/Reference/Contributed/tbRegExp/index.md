---
title: tbRegExp Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - StaticRegex
indexed_from: 1.9.0.0
permalink: /tB/Packages/Contributed/tbRegExp/
---

# tbRegExp Package
{: .no_toc }

**Author:** GCuser99. **Version:** 1.9.0.0. **On GitHub:** [GCuser99/tbRegExp](https://github.com/GCuser99/tbRegExp), in the folder *Package*.

The **tbRegExp** contributed package provides regular expressions for twinBASIC projects, as a replacement for the **RegExp** object of VBScript. It follows the same object model. A [**RegExp**](RegExp/) is given a pattern and options, its [**Execute**](RegExp/Execute) method returns a [**MatchCollection**](MatchCollection/) of [**Match**](Match/) objects, and each **Match** holds the text captured by the groups of the pattern as a [**SubMatches**](SubMatches/) object. Positions are zero-based, as in VBScript.

The matching is done by the [vba-regex](https://github.com/sihlfall/vba-regex) engine of sihlfall, which the package includes as a private module, **StaticRegex**.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "\d+"
re.Global = True
Debug.Print re.Test("a1b22c333")              ' True
Debug.Print re.Execute("a1b22c333").Count     ' 3
Debug.Print re.Execute("a1b22c333")(1).Value  ' 22
Debug.Print re.Replace("a1b22c333", "#")      ' a#b#c#
```

Beyond VBScript's object, **RegExp** has the [**DotAll**](RegExp/DotAll) and [**Flags**](RegExp/Flags) options, the [**Split**](RegExp/Split) method, [**IsValid**](RegExp/IsValid), [**LastError**](RegExp/LastError) and [**LastErrorNumber**](RegExp/LastErrorNumber), which report an invalid pattern before it is used, and [**SearchStepLimit**](RegExp/SearchStepLimit), which bounds a runaway search. [**Replace**](RegExp/Replace) reads a `$` in the replacement string as VBScript does, and adds `$<name>` for a named group.

## Pattern syntax

A pattern written for VBScript's **RegExp** needs no change. **tbRegExp** also accepts named groups, lookbehind, and the `i`, `m` and `s` options inside the pattern:

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<year>\d{4})-(?<month>\d{2})"
Debug.Print re.Execute("2026-10")(0).SubMatches("month")  ' 10
Debug.Print re.Replace("2026-10", "$<month>/$<year>")     ' 10/2026
```

[**Pattern syntax**](PatternSyntax) covers those in full, along with the escapes, the character classes and the brace rules.

## Searches that give up

This is the one place where **tbRegExp** behaves differently from VBScript's **RegExp** rather than adding to it.

<!-- test: SearchGivesUpTests.Test_CatastrophicPatternRaises, SearchGivesUpTests.Search_LongMatchOfAStarIsNotCut, SearchGivesUpTests.Search_LongMatchOfDotStarIsNotCut -->
A pattern that backtracks without end, such as `(a+)+b` on a string of thirty `a`, does not hang a search as it does in VBScript's **RegExp**. Every search is given a budget of steps, and when it runs out the search raises an error rather than returning a result it never established. A long match is no problem: `a*` and `^.*$` match a string of 1,000,000 `a` whole.
<!-- /test -->

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(a+)+b"
On Error Resume Next
re.Test String(30, "a")
Debug.Print Err.Number - vbObjectError   ' 3016
On Error GoTo 0
Err.Clear

re.Pattern = "^.*$"
Debug.Print re.Test(String(100000, "a"))   ' True
```

[**SearchStepLimit**](RegExp/SearchStepLimit) explains the budget, shows the message, and raises the ceiling when a search genuinely needs more.

## Classes

- [Match](Match/) -- holds one match that a RegExp found in a string: the matched text, where it starts, how many characters it has, and the text captured by its groups
  - [FirstIndex](Match/FirstIndex) -- returns the zero-based position where the match starts
  - [Length](Match/Length) -- returns the number of characters in the match
  - [SubMatches](Match/SubMatches) -- returns the text captured by the groups of the pattern
  - [Value](Match/Value) -- returns the matched text (default member)
- [MatchCollection](MatchCollection/) -- holds the Match objects that a regular expression finds in a string
  - [Count](MatchCollection/Count) -- returns the number of matches
  - [Item](MatchCollection/Item) -- returns one match by position (the default member)
  - [NewEnum](MatchCollection/NewEnum) -- returns the enumerator that For Each uses (hidden)
- [RegExp](RegExp/) -- searches strings with a regular expression: finds the matches, tests for one, replaces them and splits a string at them
  - [DotAll](RegExp/DotAll) -- returns or sets whether `.` matches a line feed
  - [Execute](RegExp/Execute) -- returns the matches in a string
  - [Flags](RegExp/Flags) -- returns or sets the four options as a string of letters
  - [Global](RegExp/Global) -- returns or sets whether all matches are used
  - [IgnoreCase](RegExp/IgnoreCase) -- returns or sets whether letter case is ignored
  - [IsValid](RegExp/IsValid) -- returns whether the pattern compiles
  - [LastError](RegExp/LastError) -- returns the message of the compile error
  - [LastErrorNumber](RegExp/LastErrorNumber) -- returns the number of the compile error
  - [MultiLine](RegExp/MultiLine) -- returns or sets whether `^` and `$` match at line boundaries
  - [Pattern](RegExp/Pattern) -- returns or sets the regular expression
  - [Replace](RegExp/Replace) -- replaces the matches in a string
  - [SearchStepLimit](RegExp/SearchStepLimit) -- returns or sets the step budget that stops a runaway search
  - [Split](RegExp/Split) -- splits a string at the matches
  - [Test](RegExp/Test) -- returns whether a string contains a match
- [SubMatches](SubMatches/) -- holds the strings that the capture groups of a pattern captured in one Match
  - [Count](SubMatches/Count) -- returns the number of strings
  - [Item](SubMatches/Item) -- returns one string by position or by group name (the default member)
  - [NewEnum](SubMatches/NewEnum) -- returns the enumerator that For Each uses (hidden)

## Test cases

The notes and warnings of this section are checked by the test cases in [tbRegExp-tests.twinproj](tbRegExp-tests.twinproj), a twinBASIC project. It uses tbRegExp as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
