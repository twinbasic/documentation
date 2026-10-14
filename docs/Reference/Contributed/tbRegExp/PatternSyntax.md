---
title: Pattern syntax
parent: tbRegExp Package
permalink: /tB/Packages/Contributed/tbRegExp/PatternSyntax
has_toc: false
---

# Pattern syntax
{: .no_toc }

How a pattern is written for **tbRegExp**, and the few places where that needs saying.

A pattern written for VBScript's **RegExp** needs no change. What follows either adds to that syntax or spells out a rule VBScript follows without documenting it.

## What tbRegExp adds

**tbRegExp** accepts, beyond VBScript's syntax:

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

## Escapes

The escapes that name a control character or a character code are read as in VBScript:

- `\c` followed by a letter, in either case, is a control character: `\cJ` and `\CJ` are the line feed. A `\c` followed by anything else makes the pattern invalid;
- `\0` is the character with code 0, `\0` followed by octal digits, such as `\012`, is that code, and `\8` and `\9` are the digits themselves;
- `\1` to `\9` and longer numbers are backreferences when the group they name has already been opened, that is, when its `(` stands earlier in the pattern. Otherwise the digits are read as an octal character code, so `\101` is `A` and `(a)\2` is `a` followed by the character with code 2; [**IsValid**](RegExp/IsValid) returns **True** for both;
- `\f`, `\n`, `\r` and `\t`, inside a character class as well, are the form feed, line feed, carriage return and tab.

<!-- test: PatternSyntaxTests.Test_NamedBackreferenceIsText, PatternSyntaxTests.Test_CapitalAAndZAreLetters -->
A backslash before a letter that names no escape stands for the letter itself, as in VBScript. The constructs that other engines spell that way are therefore ordinary text here, not errors: `\k<name>` matches `k<name>`, `\A` matches `A`, and `\p{L}` matches `p{L}`, the braces being text as well.
<!-- /test -->

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
Digits that name a group declared *later* in the pattern are therefore not a backreference at all. `\1(a)` is the character with code 1 followed by `a`, and finds no match in the string `a`, as in VBScript's **RegExp**. A group that is open but has not yet taken part, such as the `\1` in `(\1a)`, is a real backreference and matches no characters.
<!-- /test -->

## Character classes

`\w` matches only the ASCII letters and digits and `_`, as in VBScript, so `\w+` finds `caf` in `café`.

## Quantifiers and braces

A `{` starts a quantifier when it is followed by `{n}`, `{n,}` or `{n,m}`. A `{` that starts none, such as the one in `a{`, `a{x}` or `a{,2}`, is an ordinary character, as in VBScript; `\{` for the character is accepted too but not needed. A `]` or `}` that closes nothing is an ordinary character as well.

<!-- test: PatternSyntaxTests.IsValid_BraceThatStartsNoQuantifier, PatternSyntaxTests.Test_BraceThatStartsNoQuantifierIsText, PatternSyntaxTests.Test_CommaAndMaximumOnlyIsText -->
`{,m}` is text and not a quantifier, because a quantifier needs a count before the comma: `a{,2}` finds the text `a{,2}` and not up to two `a`. A `{` that does start a quantifier with counts that cannot be used is still an error, though: `a{2,1}`, whose upper count is below its lower one, makes the pattern invalid.
<!-- /test -->

```tb check_build check_run
Dim re As New RegExp
re.Pattern = "(?<_part2>\d)"
Debug.Print re.IsValid                   ' True
re.Pattern = "(?<2part>\d)"
Debug.Print re.IsValid                   ' False

re.Pattern = "a{x}"
Debug.Print re.IsValid                   ' True
Debug.Print re.Execute("a{x}")(0).Value  ' a{x}
re.Pattern = "a{2,1}"
Debug.Print re.IsValid                   ' False
```

## See Also

- [Pattern](RegExp/Pattern) property -- the regular expression
- [IsValid](RegExp/IsValid) property -- whether a pattern compiles
- [LastErrorNumber](RegExp/LastErrorNumber) property -- the faults a pattern can have, with an example of each
- [tbRegExp Package](./) -- overview
