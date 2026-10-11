---
title: tbRegExp Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - StaticRegex
indexed_from: 1.0.5.0
permalink: /tB/Packages/Contributed/tbRegExp/
---

# tbRegExp Package
{: .no_toc }

**Author:** GCuser99. **On GitHub:** [GCuser99/tbRegExp](https://github.com/GCuser99/tbRegExp), in the folder *Package*.

The **tbRegExp** contributed package provides regular expressions for twinBASIC projects, as a replacement for the **RegExp** object of VBScript. It follows the same object model. A [**RegExp**](RegExp/) is given a pattern and options, its [**Execute**](RegExp/Execute) method returns a [**MatchCollection**](MatchCollection/) of [**Match**](Match/) objects, and each **Match** holds the text captured by the groups of the pattern as a [**SubMatches**](SubMatches/) object. Positions are zero-based, as in VBScript.

The matching is done by the [vba-regex](https://github.com/sihlfall/vba-regex) engine of sihlfall, which the package includes as a private module, **StaticRegex**.

Beyond VBScript's object, **RegExp** has the [**DotAll**](RegExp/DotAll) and [**Flags**](RegExp/Flags) options, the [**Split**](RegExp/Split) method, and [**IsValid**](RegExp/IsValid), [**LastError**](RegExp/LastError) and [**LastErrorNumber**](RegExp/LastErrorNumber), which report an invalid pattern before it is used. [**Replace**](RegExp/Replace) reads a `$` in the replacement string differently from VBScript.

## Pattern syntax

A pattern is written as for VBScript's **RegExp**. **tbRegExp** also accepts:

- named groups, `(?<name>...)`: [**SubMatches.Item**](SubMatches/Item) returns one by its name, and [**Replace**](RegExp/Replace) inserts one as `$<name>`;
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

A pattern that holds `\k<name>`, `\A`, `\Z`, `\p{...}`, an atomic group `(?>...)` or a conditional is not valid: [**IsValid**](RegExp/IsValid) returns **False**. A numbered backreference such as `\1` works. `\w` matches only the ASCII letters and digits and `_`, as in VBScript, so `\w+` finds `caf` in `café`.

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
  - [DotAll](RegExp/DotAll) -- returns or sets whether `.` matches line terminators
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
  - [Split](RegExp/Split) -- splits a string at the matches
  - [Test](RegExp/Test) -- returns whether a string contains a match
- [SubMatches](SubMatches/) -- holds the strings that the capture groups of a pattern captured in one Match
  - [Count](SubMatches/Count) -- returns the number of strings
  - [Item](SubMatches/Item) -- returns one string by position or by group name (the default member)
  - [NewEnum](SubMatches/NewEnum) -- returns the enumerator that For Each uses (hidden)
