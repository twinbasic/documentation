---
title: IgnoreCase
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/IgnoreCase
has_toc: false
---

# IgnoreCase
{: .no_toc }

Returns or sets whether letter case is ignored when the pattern is matched.

## Get

Returns a **Boolean**.

Syntax: *object*.**IgnoreCase**

*object*
: *required* An object expression that evaluates to a **RegExp**.

The default value is **False**.

## Let

Sets the value.

Syntax: *object*.**IgnoreCase** **=** *value*

*value*
: A **Boolean**. **True** makes matches case-insensitive. **False** makes them case-sensitive.

## Remarks

Unlike [**Global**](Global), [**MultiLine**](MultiLine) and [**DotAll**](DotAll), this option is part of the compiled pattern. Setting it to a different value makes the pattern compile again the next time it is needed, and [**IsValid**](IsValid), [**LastError**](LastError) and [**LastErrorNumber**](LastErrorNumber) then refer to the new compilation. Setting it to its current value does nothing.

The flag `i` of [**Flags**](Flags) reads and sets the same value.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
re.Pattern = "hello"
Debug.Print re.Test("Hello World")  ' False

re.IgnoreCase = True
Debug.Print re.Test("Hello World")  ' True
```

## See Also

- [Flags](Flags) property -- sets this option with the letter `i`
- [Pattern](Pattern) property -- the regular expression
- [IsValid](IsValid) property -- whether the pattern compiles
- [RegExp](./) class -- overview
