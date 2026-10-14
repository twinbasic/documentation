\---

title: tbRegExp Package
parent: Contributed Packages
has\_toc: false
exclude\_from\_docs:

* StaticRegex
indexed\_from: 1.9.0.0
permalink: /tB/Packages/Contributed/tbRegExp/

\---

# tbRegExp Package

{: .no\_toc }

**Author:** GCuser99. **Version:** 1.9.0.0. **On GitHub:** [GCuser99/tbRegExp](https://github.com/GCuser99/tbRegExp), in the folder *Package*.

The **tbRegExp** contributed package provides regular expressions for twinBASIC projects, as a replacement for the **RegExp** object of VBScript. It follows the same object model. A [**RegExp**](RegExp/) is given a pattern and options, its [**Execute**](RegExp/Execute) method returns a [**MatchCollection**](MatchCollection/) of [**Match**](Match/) objects, and each **Match** holds the text captured by the groups of the pattern as a [**SubMatches**](SubMatches/) object. Positions are zero-based, as in VBScript.

The matching is done by the [vba-regex](https://github.com/sihlfall/vba-regex) engine of sihlfall, which the package includes as a private module, **StaticRegex**.

Beyond VBScript's object, **RegExp** has the [**DotAll**](RegExp/DotAll) and [**Flags**](RegExp/Flags) options, the [**Split**](RegExp/Split) method, [**IsValid**](RegExp/IsValid), [**LastError**](RegExp/LastError) and [**LastErrorNumber**](RegExp/LastErrorNumber), which report an invalid pattern before it is used, and [**SearchStepLimit**](RegExp/SearchStepLimit), which bounds a runaway search. [**Replace**](RegExp/Replace) reads a `$` in the replacement string as VBScript does, and adds `$<name>` for a named group.

## Pattern syntax

A pattern is written as for VBScript's **RegExp**. **tbRegExp** also accepts:

* named groups, `(?<name>...)`: [**SubMatches.Item**](SubMatches/Item) returns one by its name, and [**Replace**](RegExp/Replace) inserts one as `$<name>`. A name starts with a letter or an underscore and goes on with letters, digits and underscores; a pattern with any other name is not valid;
* lookbehind, `(?<=...)` and `(?<!...)`, as well as lookahead;
* the options `i`, `m` and `s` inside the pattern: `(?i)` for the rest of the pattern, `(?i:...)` for one group.

```tb check\_build check\_run
Dim re As New RegExp
re.Pattern = "(?<year>\\d{4})-(?<month>\\d{2})"
Debug.Print re.Execute("2026-10")(0).SubMatches("month")  ' 10
Debug.Print re.Replace("2026-10", "$<month>/$<year>")     ' 10/2026

re.Pattern = "(?<=\\$)\\d+"
Debug.Print re.Execute("costs $123")(0).Value            ' 123

re.Pattern = "(?i:abc)DEF"
Debug.Print re.Test("ABCDEF")                            ' True
Debug.Print re.Test("ABCdef")                            ' False
```

<!-- test: PatternSyntaxTests.IsValid\_AtomicGroup, PatternSyntaxTests.IsValid\_Conditional, PatternSyntaxTests.Test\_NamedBackreferenceIsText, PatternSyntaxTests.Test\_CapitalAAndZAreLetters -->

> \[!NOTE] 1.9.0.0
> A pattern that holds an atomic group `(?>...)` or a conditional is not valid: \[\*\*IsValid\*\*](RegExp/IsValid) returns \*\*False\*\*. A named backreference `\\k<name>`, `\\A`, `\\Z` and `\\p{...}` are not supported either, but they do not make the pattern invalid, because a backslash before a letter that names no escape stands for the letter itself, as in VBScript: `\\k<name>` matches the text `k<name>`, and `\\A` matches `A`. So `\\p{L}` matches the text `p{L}`: the `\\p` is the letter, and `{L}` starts no quantifier and is text as well (see below).

The escapes that name a control character or a character code are read as in VBScript:

* `\\c` followed by a letter, in either case, is a control character: `\\cJ` and `\\CJ` are the line feed. A `\\c` followed by anything else makes the pattern invalid;
* `\\0` is the character with code 0, `\\0` followed by octal digits, such as `\\012`, is that code, and `\\8` and `\\9` are the digits themselves;
* `\\1` to `\\9` and longer numbers are backreferences when the group they name has already been opened, that is, when its `(` stands earlier in the pattern. Otherwise the digits are read as an octal character code, so `\\101` is `A` and `(a)\\2` is `a` followed by the character with code 2; [**IsValid**](RegExp/IsValid) returns **True** for both;
* `\\f`, `\\n`, `\\r` and `\\t`, inside a character class as well, are the form feed, line feed, carriage return and tab.

```tb check\_build check\_run
Dim re As New RegExp
re.Pattern = "\\101"
Debug.Print re.Test("A")                 ' True
re.Pattern = "\\CJ"
Debug.Print re.Test(vbLf)                ' True
re.Pattern = "\\k<n>"
Debug.Print re.IsValid                   ' True
Debug.Print re.Test("k<n>")              ' True
re.Pattern = "(a)\\2"
Debug.Print re.Test("a" \& ChrW(2))      ' True
```

<!-- test: PatternSyntaxTests.Test\_BackreferenceToLaterGroupMatchesNothing -->

Digits that name a group declared *later* in the pattern are therefore not a backreference at all. `\\1(a)` is the character with code 1 followed by `a`, and finds no match in the string `a`, as in VBScript's **RegExp**. A group that is open but has not yet taken part, such as the `\\1` in `(\\1a)`, is a real backreference and matches no characters.

<!-- /test -->

`\\w` matches only the ASCII letters and digits and `\_`, as in VBScript, so `\\w+` finds `caf` in `café`.

A `{` starts a quantifier when it is followed by `{n}`, `{n,}` or `{n,m}`. A `{` that starts none, such as the one in `a{`, `a{x}` or `a{,2}`, is an ordinary character, as in VBScript; `\\{` for the character is accepted too but not needed. A `]` or `}` that closes nothing is an ordinary character as well.

<!-- test: PatternSyntaxTests.IsValid\_BraceThatStartsNoQuantifier, PatternSyntaxTests.Test\_BraceThatStartsNoQuantifierIsText, PatternSyntaxTests.Test\_CommaAndMaximumOnlyIsText -->

`{,m}` is text and not a quantifier, because a quantifier needs a count before the comma: `a{,2}` finds the text `a{,2}` and not up to two `a`. A `{` that does start a quantifier with counts that cannot be used is still an error, though: `a{2,1}`, whose upper count is below its lower one, makes the pattern invalid.

<!-- /test -->

```tb check\_build check\_run
Dim re As New RegExp
re.Pattern = "(?<\_part2>\\d)"
Debug.Print re.IsValid                   ' True
re.Pattern = "(?<2part>\\d)"
Debug.Print re.IsValid                   ' False

re.Pattern = "a{x}"
Debug.Print re.IsValid                   ' True
Debug.Print re.Execute("a{x}")(0).Value  ' a{x}
re.Pattern = "a{2,1}"
Debug.Print re.IsValid                   ' False
```

## Searches that give up

<!-- test: SearchGivesUpTests.Test\_CatastrophicPatternRaises, SearchGivesUpTests.Search\_LongMatchOfAStarIsNotCut, SearchGivesUpTests.Search\_LongMatchOfDotStarIsNotCut -->

A pattern that backtracks without end, such as `(a+)+b` on a string of thirty `a`, does not hang a search as it does in VBScript's **RegExp**. Every search is given a budget of steps, and when it runs out the search raises an error. Nothing is returned, not even the part that was found: a search that ran out of steps never established whether the rest of the string matches, so a short result would be a wrong answer rather than an incomplete one. The message says how much budget was spent and what to try. A long match is no problem: `a\*` and `^.\*$` match a string of 1,000,000 `a` whole.

<!-- /test -->

```tb check\_build check\_run
Dim re As New RegExp
re.Pattern = "(a+)+b"
On Error Resume Next
re.Test String(30, "a")
Debug.Print Err.Number - vbObjectError   ' 3016
On Error GoTo 0
Err.Clear

re.Pattern = "^.\*$"
Debug.Print re.Test(String(100000, "a"))   ' True
```

The budget grows with the square of the length of the string, so an ordinary pattern that backtracks -- `\\d+x` on a string of digits with no `x`, say -- finishes at any length a search is likely to be given. Only a pattern whose cost grows faster than that is stopped. [**SearchStepLimit**](RegExp/SearchStepLimit) raises the ceiling when a search genuinely needs more.

## Classes

* [Match](Match/) -- holds one match that a RegExp found in a string: the matched text, where it starts, how many characters it has, and the text captured by its groups

  * [FirstIndex](Match/FirstIndex) -- returns the zero-based position where the match starts
  * [Length](Match/Length) -- returns the number of characters in the match
  * [SubMatches](Match/SubMatches) -- returns the text captured by the groups of the pattern
  * [Value](Match/Value) -- returns the matched text (default member)
* [MatchCollection](MatchCollection/) -- holds the Match objects that a regular expression finds in a string

  * [Count](MatchCollection/Count) -- returns the number of matches
  * [Item](MatchCollection/Item) -- returns one match by position (the default member)
  * [NewEnum](MatchCollection/NewEnum) -- returns the enumerator that For Each uses (hidden)
* [RegExp](RegExp/) -- searches strings with a regular expression: finds the matches, tests for one, replaces them and splits a string at them

  * [DotAll](RegExp/DotAll) -- returns or sets whether `.` matches a line feed
  * [Execute](RegExp/Execute) -- returns the matches in a string
  * [Flags](RegExp/Flags) -- returns or sets the four options as a string of letters
  * [Global](RegExp/Global) -- returns or sets whether all matches are used
  * [IgnoreCase](RegExp/IgnoreCase) -- returns or sets whether letter case is ignored
  * [IsValid](RegExp/IsValid) -- returns whether the pattern compiles
  * [LastError](RegExp/LastError) -- returns the message of the compile error
  * [LastErrorNumber](RegExp/LastErrorNumber) -- returns the number of the compile error
  * [MultiLine](RegExp/MultiLine) -- returns or sets whether `^` and `$` match at line boundaries
  * [Pattern](RegExp/Pattern) -- returns or sets the regular expression
  * [Replace](RegExp/Replace) -- replaces the matches in a string
  * [SearchStepLimit](RegExp/SearchStepLimit) -- returns or sets the step budget that stops a runaway search
  * [Split](RegExp/Split) -- splits a string at the matches
  * [Test](RegExp/Test) -- returns whether a string contains a match
* [SubMatches](SubMatches/) -- holds the strings that the capture groups of a pattern captured in one Match

  * [Count](SubMatches/Count) -- returns the number of strings
  * [Item](SubMatches/Item) -- returns one string by position or by group name (the default member)
  * [NewEnum](SubMatches/NewEnum) -- returns the enumerator that For Each uses (hidden)

## Test cases

The notes and warnings of this section are checked by the test cases in [tbRegExp-tests.twinproj](tbRegExp-tests.twinproj), a twinBASIC project. It uses tbRegExp as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\\twinBASIC\\packages`, then run the project, and each case prints whether it passes.

