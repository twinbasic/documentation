---
title: Global
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Global
has_toc: false
---

# Global
{: .no_toc }

Returns or sets whether all matches are used, or only the first.

## Get

Returns a **Boolean**.

Syntax: *object*.**Global**

*object*
: *required* An object expression that evaluates to a **RegExp**.

The default value is **False**.

## Let

Sets the value.

Syntax: *object*.**Global** **=** *value*

*value*
: A **Boolean**. **True** makes [**Execute**](Execute) return every match, [**Replace**](Replace) replace every match, and [**Split**](Split) split at every match. **False** makes each of them use only the first match.

## Remarks

[**Test**](Test) does not depend on the value, because it only reports whether a match exists.

The value is applied when a match is made. Changing it does not compile the pattern again. The flag `g` of [**Flags**](Flags) reads and sets the same value.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "\d+"

Debug.Print re.Execute("a1b22c333").Count  ' 1
Debug.Print re.Replace("a1b22c333", "#")    ' a#b22c333

re.Global = True
Debug.Print re.Execute("a1b22c333").Count  ' 3
Debug.Print re.Replace("a1b22c333", "#")    ' a#b#c#
```

## See Also

- [Flags](Flags) property -- sets this option with the letter `g`
- [Execute](Execute) method -- returns the matches
- [Replace](Replace) method -- replaces the matches
- [Split](Split) method -- splits a string at the matches
- [RegExp](./) class -- overview
