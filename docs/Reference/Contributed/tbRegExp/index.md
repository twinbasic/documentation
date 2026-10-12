---
title: tbRegExp Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - StaticRegex
indexed_from: 1.4.0.0
permalink: /tB/Packages/Contributed/tbRegExp/
---

# tbRegExp Package
{: .no_toc }

**Author:** GCuser99. **Version:** 1.4.0.0. **On GitHub:** [GCuser99/tbRegExp](https://github.com/GCuser99/tbRegExp), in the folder *Package*.

The **tbRegExp** contributed package provides regular expressions for twinBASIC projects, as a replacement for the **RegExp** object of VBScript. It follows the same object model. A [**RegExp**](RegExp/) is given a pattern and options, its [**Execute**](RegExp/Execute) method returns a [**MatchCollection**](MatchCollection/) of [**Match**](Match/) objects, and each **Match** holds the text captured by the groups of the pattern as a [**SubMatches**](SubMatches/) object. Positions are zero-based, as in VBScript.

The matching is done by the [vba-regex](https://github.com/sihlfall/vba-regex) engine of sihlfall, which the package includes as a private module, **StaticRegex**.

Beyond VBScript's object, **RegExp** has the [**DotAll**](RegExp/DotAll) and [**Flags**](RegExp/Flags) options, the [**Split**](RegExp/Split) method, and [**IsValid**](RegExp/IsValid), [**LastError**](RegExp/LastError) and [**LastErrorNumber**](RegExp/LastErrorNumber), which report an invalid pattern before it is used. [**Replace**](RegExp/Replace) reads a `$` in the replacement string differently from VBScript.

> [!WARNING]
> With [**Global**](RegExp/Global) set to **True**, a match of no characters is reported twice when the search had to skip at least one character to reach it. It happens to a pattern that matches no characters at a position after the one where the search started: `$`, `\b`, `^` with [**MultiLine**](RegExp/MultiLine), and a lookahead or lookbehind on its own. A pattern such as `x*`, which matches no characters at the position where the search starts, is not affected. [**Execute**](RegExp/Execute) returns the match twice, [**Replace**](RegExp/Replace) makes its replacement twice and [**Split**](RegExp/Split) adds an extra empty string, and nothing is raised. VBScript's **RegExp** reports such a match once. A match of one or more characters is never repeated, and with **Global** set to **False** nothing is. This is how version 1.4.0.0 behaves.

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

A pattern that holds `\k<name>`, `\A`, `\Z`, `\p{...}`, an atomic group `(?>...)` or a conditional is not valid: [**IsValid**](RegExp/IsValid) returns **False**. A numbered backreference such as `\1` works when the pattern has that group; [**IsValid**](RegExp/IsValid) does not find a backreference to a group that is missing. `\w` matches only the ASCII letters and digits and `_`, as in VBScript, so `\w+` finds `caf` in `café`.

A `{` has to start a quantifier: `{n}`, `{n,}`, `{n,m}` or `{,m}`, which means `{0,m}`. A pattern in which a `{` starts none, such as `a{` or `a{x}`, is not valid; write `\{` for the character. VBScript reads a `{` that starts no quantifier, and `{,m}`, as ordinary text. A `]` or `}` that closes nothing is an ordinary character, as in VBScript.

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
