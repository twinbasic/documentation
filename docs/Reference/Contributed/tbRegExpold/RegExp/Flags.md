---
title: Flags
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Flags
has_toc: false
---

# Flags
{: .no_toc }

Returns or sets the four matching options as one string of letters.

## Get

Returns a **String** that holds the letter of each option that is **True**, always in the order `g`, `m`, `i`, `s`. It is an empty string when all four are **False**.

Syntax: *object*.**Flags**

*object*
: *required* An object expression that evaluates to a **RegExp**.

## Let

Sets all four options at once.

Syntax: *object*.**Flags** **=** *value*

*value*
: A **String** of letters. The letters are not case-sensitive.

| Letter | Option |
|--------|--------|
| `g` | [**Global**](Global) |
| `m` | [**MultiLine**](MultiLine) |
| `i` | [**IgnoreCase**](IgnoreCase) |
| `s` | [**DotAll**](DotAll) |

## Remarks

An option whose letter is missing from *value* is set to **False**, so `vbNullString` turns all four off. Other characters in *value* are ignored, and the order and repetition of the letters do not matter.

The `i` letter is applied through [**IgnoreCase**](IgnoreCase), so the pattern is compiled again the next time it is needed when that option changes.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Flags = "GI"
Debug.Print re.Global      ' True
Debug.Print re.IgnoreCase  ' True
Debug.Print re.MultiLine   ' False
Debug.Print re.Flags       ' gi

re.DotAll = True
Debug.Print re.Flags       ' gis

re.Flags = "m"
Debug.Print re.Flags       ' m
Debug.Print re.Global      ' False

re.Flags = vbNullString
Debug.Print Len(re.Flags)  ' 0
```

## See Also

- [Global](Global) property -- the `g` option
- [MultiLine](MultiLine) property -- the `m` option
- [IgnoreCase](IgnoreCase) property -- the `i` option
- [DotAll](DotAll) property -- the `s` option
- [RegExp](./) class -- overview
