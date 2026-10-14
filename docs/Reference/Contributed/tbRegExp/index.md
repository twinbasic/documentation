---
title: tbRegExp Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - StaticRegex
indexed_from: 1.8.0.0
permalink: /tB/Packages/Contributed/tbRegExp/
---

# tbRegExp Package
{: .no_toc }

**Author:** GCuser99. **Version:** 1.8.0.0. **On GitHub:** [GCuser99/tbRegExp](https://github.com/GCuser99/tbRegExp), in the folder *Package*.

The **tbRegExp** contributed package provides regular expressions for twinBASIC projects, as a replacement for the **RegExp** object of VBScript. It follows the same object model. A [**RegExp**](RegExp/) is given a pattern and options, its [**Execute**](RegExp/Execute) method returns a [**MatchCollection**](MatchCollection/) of [**Match**](Match/) objects, and each **Match** holds the text captured by the groups of the pattern as a [**SubMatches**](SubMatches/) object. Positions are zero-based, as in VBScript.

The matching is done by the [vba-regex](https://github.com/sihlfall/vba-regex) engine of sihlfall, which the package includes as a private module, **StaticRegex**.

Beyond VBScript's object, **RegExp** has the [**DotAll**](RegExp/DotAll) and [**Flags**](RegExp/Flags) options, the [**Split**](RegExp/Split) method, [**IsValid**](RegExp/IsValid), [**LastError**](RegExp/LastError) and [**LastErrorNumber**](RegExp/LastErrorNumber), which report an invalid pattern before it is used, and [**SearchAborted**](RegExp/SearchAborted), which reports a search that gave up. [**Replace**](RegExp/Replace) reads a `$` in the replacement string as VBScript does, and adds `$<name>` for a named group.

## Pattern syntax

A pattern is written as for VBScript's **RegExp**. **tbRegExp** also accepts:

- named groups, `(?<name>...)`: [**SubMatches.Item**](SubMatches/Item) returns one by its name, and [**Replace**](RegExp/Replace) inserts one as `$<name>`. A name starts with a letter or an underscore and goes on with letters, digits and underscores; a pattern with any other name is not valid;
- lookbehind, `(?<=...)` and `(?<!...)`, as well as lookahead;
- the options `i`, `m` and `s` inside the pattern: `(?i)` for the rest of the pattern, `(?i:...)` for one group.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<year>\d{4})-(?<month>\d{2})"
Debug.Print re.Execute("2026-10")(0).SubMatches("month")  ' 10
Debug.Print re.Replace("2026-10", "$<month>/$<year>")     ' 10/2026

re.Pattern = "(?<=\$)\d+"
Debug.Print re.Execute("costs $123")(0).Value            ' 123

re.Pattern = "(?i:abc)DEF"
Debug.Print re.Test("ABCDEF")                            ' True
Debug.Print re.Test("ABCdef")                            ' False
```

<!-- test: PatternSyntaxTests.IsValid_AtomicGroup, PatternSyntaxTests.IsValid_Conditional, PatternSyntaxTests.Test_NamedBackreferenceIsText, PatternSyntaxTests.Test_CapitalAAndZAreLetters -->
> [!NOTE]
> A pattern that holds an atomic group `(?>...)` or a conditional is not valid: [**IsValid**](RegExp/IsValid) returns **False**. A named backreference `\k<name>`, `\A`, `\Z` and `\p{...}` are not supported either, but they do not make the pattern invalid, because a backslash before a letter that names no escape stands for the letter itself, as in VBScript: `\k<name>` matches the text `k<name>`, and `\A` matches `A`. The pattern `\p{L}` is invalid for another reason: `{L}` does not start a quantifier (see below).

The escapes that name a control character or a character code are read as in VBScript:

- `\c` followed by a letter, in either case, is a control character: `\cJ` and `\CJ` are the line feed. A `\c` followed by anything else makes the pattern invalid;
- `\0` is the character with code 0, `\0` followed by octal digits, such as `\012`, is that code, and `\8` and `\9` are the digits themselves;
- `\1` to `\9` and longer numbers are backreferences when the pattern has that many groups. Otherwise the digits are read as an octal character code, so `\101` is `A` and `(a)\2` is `a` followed by the character with code 2; [**IsValid**](RegExp/IsValid) returns **True** for both;
- `\f`, `\n`, `\r` and `\t`, inside a character class as well, are the form feed, line feed, carriage return and tab.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "\101"
Debug.Print re.Test("A")                 ' True
re.Pattern = "\CJ"
Debug.Print re.Test(vbLf)                ' True
re.Pattern = "\k<n>"
Debug.Print re.IsValid                   ' True
Debug.Print re.Test("k<n>")              ' True
re.Pattern = "(a)\2"
Debug.Print re.Test("a" & ChrW(2))      ' True
```

<!-- test: PatternSyntaxTests.Test_BackreferenceToLaterGroupMatchesNothing -->
> [!NOTE]
> A backreference to a group that has not yet taken part in the match, such as `\1(a)`, matches no characters, so the pattern finds `a` in the string `a`. VBScript's **RegExp** finds no match for such a pattern.

`\w` matches only the ASCII letters and digits and `_`, as in VBScript, so `\w+` finds `caf` in `café`.

A `{` has to start a quantifier: `{n}`, `{n,}`, `{n,m}` or `{,m}`, which means `{0,m}`. A pattern in which a `{` starts none, such as `a{` or `a{x}`, is not valid; write `\{` for the character. A `]` or `}` that closes nothing is an ordinary character, as in VBScript.

<!-- test: PatternSyntaxTests.IsValid_BraceThatStartsNoQuantifier, PatternSyntaxTests.Test_BraceThatStartsNoQuantifierIsText, PatternSyntaxTests.Test_CommaAndMaximumOnlyIsText -->
> [!NOTE]
> VBScript's **RegExp** reads a `{` that starts no quantifier, and `{,m}`, as ordinary text: `a{x}` is a valid pattern there that finds the text `a{x}`, and `a{,2}` finds the text `a{,2}` and not `aa`. In **tbRegExp** the first is not valid, so a search with it raises the compile error, and `a{,2}` finds up to two `a`.

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<_part2>\d)"
Debug.Print re.IsValid                   ' True
re.Pattern = "(?<2part>\d)"
Debug.Print re.IsValid                   ' False

re.Pattern = "a{x}"
Debug.Print re.IsValid                   ' False
re.Pattern = "a\{x}"
Debug.Print re.Execute("a{x}")(0).Value  ' a{x}
```

## Searches that give up

<!-- test: SearchGivesUpTests.Test_CatastrophicPatternGivesUpWithoutError, SearchGivesUpTests.Search_LongMatchOfAStarIsNotCut, SearchGivesUpTests.Search_LongMatchOfDotStarIsNotCut -->
A pattern that backtracks without end, such as `(a+)+b` on a string of thirty `a`, does not hang a search as it does in VBScript's **RegExp**. Every search has a budget of steps, which a program cannot change, and when it runs out the search stops and raises no error. Its result is then short or empty, and a program that has to tell it from a true result reads [**SearchAborted**](RegExp/SearchAborted) after the call. A long match is no problem: `a*` and `^.*$` match a string of 1,000,000 `a` whole.
<!-- /test -->

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(a+)+b"
Debug.Print re.Test(String(30, "a"))   ' False
Debug.Print re.SearchAborted           ' True

re.Pattern = "^.*$"
Debug.Print re.Test(String(100000, "a"))   ' True
Debug.Print re.SearchAborted               ' False
```

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
  - [SearchAborted](RegExp/SearchAborted) -- returns whether the last search gave up before it finished
  - [Split](RegExp/Split) -- splits a string at the matches
  - [Test](RegExp/Test) -- returns whether a string contains a match
- [SubMatches](SubMatches/) -- holds the strings that the capture groups of a pattern captured in one Match
  - [Count](SubMatches/Count) -- returns the number of strings
  - [Item](SubMatches/Item) -- returns one string by position or by group name (the default member)
  - [NewEnum](SubMatches/NewEnum) -- returns the enumerator that For Each uses (hidden)

## Test cases

The notes and warnings of this section are checked by the test cases in [tbRegExp-tests.twinproj](tbRegExp-tests.twinproj), a twinBASIC project. It uses tbRegExp as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
