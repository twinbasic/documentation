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

A `$` in *replaceString* starts a substitution item. Any other text is copied as it is, and so is a `$` that starts no item.

| Item | Is replaced with |
|------|------------------|
| `$$` | A single `$`. |
| `$&` | The matched text. |
| `` $` `` | The part of *sourceString* before the match. |
| `$'` | The part of *sourceString* after the match. |
| `$`*n* or `$`*nn* | The text of numbered group *n*, counting from 1. Two digits are read as the number when the pattern has a group with that number, otherwise one. It is an empty string when the group matched nothing. When the pattern has no group *n*, the `$` is copied, and so are the digits: `$0` and `$00` are never items, and `$3` in a pattern of two groups is the text `$3`. |
| `$<`*name*`>` | The text of the group written `(?<name>...)`. It is an empty string when the group matched nothing or no group has the name. When the pattern has no named group, or the `>` is missing, or the name is empty, the `$` is copied. |
| `$~` | Nothing. The item is dropped. |

A `$` that starts no item raises no error, so a replacement string can hold a literal `$` as it is, at the end or before any other character. Before a character that would make an item, write `$$`: `$$$&` inserts a `$` and then the matched text, as the last example does.

> [!NOTE]
> Items are read as in VBScript's **RegExp**, with two differences: `$<`*name*`>` is an addition of this package, and `$~` is dropped, where VBScript copies `$~` into the result.

## Remarks

With [**Global**](Global) set to **False**, only the first match is replaced. With **Global** set to **True**, every match is. [**IgnoreCase**](IgnoreCase), [**MultiLine**](MultiLine) and [**DotAll**](DotAll) change what counts as a match.

A match of no characters is replaced once, wherever it is found. In this example the pattern `^` puts `> ` at the start of each of three lines.

```tb check_build check_run
Dim re As New RegExp
re.Global = True
re.MultiLine = True
re.Pattern = "^"
Debug.Print Replace(re.Replace("a" & vbLf & "b" & vbLf & "c", "> "), vbLf, "/")  ' > a/> b/> c
```

A search that backtracks without end, such as `(a+)+b` on thirty `a`, gives up instead of hanging, and **Replace** then replaces only the matches found before it gave up. [**SearchAborted**](SearchAborted) returns **True** in that case.

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
Debug.Print re.Replace("x5", "$ $x $3")                           ' x$ $x $3

re.Pattern = "(?<first>\w+) (?<last>\w+)"
Debug.Print re.Replace("Ada Lovelace", "$<last>, $<first>")       ' Lovelace, Ada
```

## See Also

- [Execute](Execute) method -- returns the matches
- [Split](Split) method -- splits a string at the matches
- [Global](Global) property -- all matches or the first
- [Pattern](Pattern) property -- the regular expression
- [RegExp](./) class -- overview
