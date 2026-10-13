---
title: RegExp
parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/
has_toc: false
---

# RegExp class
{: .no_toc }

Searches strings with a regular expression: finds the matches, tests for one, replaces them and splits a string at them.

**RegExp** is a replacement for the regular expression object of VBScript. It follows the same object model: [**Execute**](Execute) returns a [**MatchCollection**](../MatchCollection/) of [**Match**](../Match/) objects, and the indexes of both are zero-based. The matching is done by the vba-regex engine, which the package includes as the **StaticRegex** module.

The class is not predeclared. Create an instance with **New**, set [**Pattern**](Pattern) and the options, then call a method.

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\d+)-(\d+)"
re.Global = True

Dim matches As MatchCollection
Set matches = re.Execute("10-20 and 30-40")
Debug.Print matches.Count                        ' 2
Debug.Print matches.Item(0).Value                ' 10-20
Debug.Print matches.Item(1).SubMatches.Item(0)   ' 30

Debug.Print re.Test("none")                      ' False
Debug.Print re.Replace("10-20", "$2-$1")         ' 20-10
```

## Options

Four properties change how the pattern is matched. [**Flags**](Flags) reads and sets all four as one string of letters.

| Property | Flag | When **True** |
|----------|------|---------------|
| [**Global**](Global) | `g` | All matches are used. When **False**, [**Execute**](Execute), [**Replace**](Replace) and [**Split**](Split) use only the first match. |
| [**MultiLine**](MultiLine) | `m` | `^` and `$` also match at the start and end of each line. |
| [**IgnoreCase**](IgnoreCase) | `i` | Letter case is ignored. |
| [**DotAll**](DotAll) | `s` | `.` also matches a line feed. |

All four are **False** in a new instance.

## Invalid patterns

The pattern is compiled the first time a method or one of [**IsValid**](IsValid), [**LastError**](LastError) and [**LastErrorNumber**](LastErrorNumber) needs it. It is compiled again after [**Pattern**](Pattern) or [**IgnoreCase**](IgnoreCase) is set to a different value. [**Global**](Global), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) are applied when a match is made and do not cause a new compilation.

A pattern that does not compile does not raise an error at once. [**IsValid**](IsValid) returns **False**, and [**LastError**](LastError) and [**LastErrorNumber**](LastErrorNumber) describe the failure. [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) then raise that error, with the number in **LastErrorNumber**, the description in **LastError** and the source `RegExp`. When **IsValid**, **LastError** or **LastErrorNumber** is the call that compiles an invalid pattern, it raises nothing, but the compile error stays in the **Err** object after it returns; [**IsValid**](IsValid) says what to do about it.

## Properties

- [DotAll](DotAll) -- returns or sets whether `.` matches a line feed
- [Flags](Flags) -- returns or sets the four options as a string of letters
- [Global](Global) -- returns or sets whether all matches are used
- [IgnoreCase](IgnoreCase) -- returns or sets whether letter case is ignored
- [IsValid](IsValid) -- returns whether the pattern compiles
- [LastError](LastError) -- returns the message of the compile error
- [LastErrorNumber](LastErrorNumber) -- returns the number of the compile error
- [MultiLine](MultiLine) -- returns or sets whether `^` and `$` match at line boundaries
- [Pattern](Pattern) -- returns or sets the regular expression

## Methods

- [Execute](Execute) -- returns the matches in a string
- [Replace](Replace) -- replaces the matches in a string
- [Split](Split) -- splits a string at the matches
- [Test](Test) -- returns whether a string contains a match

## See Also

- [MatchCollection](../MatchCollection/) class -- the matches that **Execute** returns
- [Match](../Match/) class -- one match
- [SubMatches](../SubMatches/) class -- the groups of one match
- [tbRegExp package](../) -- overview
