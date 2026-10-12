---
title: Replace
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Replace
has_toc: false
---

# Replace
{: .no_toc }

Replaces the matches of the pattern in a string and returns the result.

Syntax: *object*.**Replace** ( *sourceString*, *replaceString* ) **As String**

*object*
: *required* An object expression that evaluates to a **RegExp**.

*sourceString*
: *required* A **String**, the text to search. The argument is not changed.

*replaceString*
: *required* A **String**, the text that replaces each match. It can hold the substitution items in the table below.

Returns a new **String** with the replacements made. It is *sourceString* unchanged when there is no match.

## Substitution items

A `$` in *replaceString* starts a substitution item. Any other text is copied as it is.

| Item | Is replaced with |
|------|------------------|
| `$$` | A single `$`. |
| `$&` | The matched text. |
| `` $` `` | The part of *sourceString* before the match. |
| `$'` | The part of *sourceString* after the match. |
| `$`*n* | The text of numbered group *n*, counting from 1. All the digits after the `$` are read as the number. It is an empty string when the group matched nothing or the pattern has no such group. `$0` raises a run-time error. |
| `$<`*name*`>` | The text of the group written `(?<name>...)`. It is an empty string when the group matched nothing or no group has the name. |
| `$~` | Nothing. The item is dropped. |

A `$` at the end of *replaceString*, or followed by a character that is not in the table, raises error `vbObjectError + 3031`. The error is raised even when *sourceString* has no match, so a literal `$` is written `$$`.

> [!NOTE]
> VBScript's **RegExp** copies into the result, as written, any `$` that does not start one of its own items (`$$`, `$&`, `` $` ``, `$'` and `$`*n*). Here a `$` at the end or before another character raises an error, `$0` raises an error, `$~` is dropped and `$`*n* of a group the pattern does not have is an empty string. A replacement string written for VBScript that holds a literal `$` needs `$$`.

## Remarks

With [**Global**](Global) set to **False**, only the first match is replaced. With **Global** set to **True**, every match is. [**IgnoreCase**](IgnoreCase), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) change what counts as a match.

> [!WARNING]
> With **Global** set to **True**, the replacement is made twice at a position where a match of no characters was reached by skipping at least one character, such as the start of every line but the first with `^` and **MultiLine** set to **True**. The warning at [**Execute**](Execute#remarks) lists the patterns affected. VBScript's **RegExp** makes the replacement once. This is how version 1.4.0.0 behaves.

In this example the pattern `^` is meant to put `> ` at the start of each of three lines. The second and third lines get it twice.

```tb check_build check_run
Dim re As New RegExp
re.Global = True
re.MultiLine = True
re.Pattern = "^"
Debug.Print Replace(re.Replace("a" & vbLf & "b" & vbLf & "c", "> "), vbLf, "/")  ' > a/> > b/> > c
```

An invalid pattern raises the compile error, with the number in [**LastErrorNumber**](LastErrorNumber) and the description in [**LastError**](LastError). Check [**IsValid**](IsValid) first to avoid it.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "(\w+)@(\w+)\.com"
Debug.Print re.Replace("ann@example.com, bob@test.com", "$2:$1")  ' example:ann, bob@test.com

re.Global = True
Debug.Print re.Replace("ann@example.com, bob@test.com", "$2:$1")  ' example:ann, test:bob

re.Pattern = "\d+"
Debug.Print re.Replace("5 and 12", "$$$&")                        ' $5 and $12

re.Pattern = "(?<first>\w+) (?<last>\w+)"
Debug.Print re.Replace("Ada Lovelace", "$<last>, $<first>")       ' Lovelace, Ada
```

## See Also

- [Execute](Execute) method -- returns the matches
- [Split](Split) method -- splits a string at the matches
- [Global](Global) property -- all matches or the first
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
