---
title: Pattern
parent: RegExp
permalink: /tB/Packages/Contributed/tbRegExp/RegExp/Pattern
has_toc: false
---

# Pattern
{: .no_toc }

Returns or sets the regular expression.

## Get

Returns a **String**.

Syntax: *object*.**Pattern**

*object*
: *required* An object expression that evaluates to a **RegExp**.

The default value is an empty string.

## Let

Sets the regular expression.

Syntax: *object*.**Pattern** **=** *value*

*value*
: A **String** that holds the regular expression.

## Remarks

Setting a different pattern makes it compile again the next time it is needed. Setting the current pattern does nothing. A pattern that does not compile raises no error when it is set: [**IsValid**](IsValid), [**LastError**](LastError) and [**LastErrorNumber**](LastErrorNumber) report the failure, and [**Execute**](Execute), [**Test**](Test), [**Replace**](Replace) and [**Split**](Split) raise it.

A named group is written `(?<name>...)`. Its text is read from the [**SubMatches**](../SubMatches/) of a [**Match**](../Match/) by name, and used in [**Replace**](Replace) as `$<name>`. A name starts with a letter or an underscore and goes on with letters, digits and underscores. [**Pattern syntax**](../PatternSyntax) covers the rest of the pattern syntax.

## Example

```tb check_build check_run
Dim re As RegExp
Set re = New RegExp
Debug.Print re.Pattern = vbNullString  ' True

re.Pattern = "b+"
Debug.Print re.Pattern                 ' b+
Debug.Print re.Replace("abbbc", "-")   ' a-c
```

## See Also

- [IsValid](IsValid) property -- whether the pattern compiles
- [IgnoreCase](IgnoreCase) property -- the option that changes how the pattern is compiled
- [Execute](Execute) method -- returns the matches
- [RegExp](./) class -- overview
