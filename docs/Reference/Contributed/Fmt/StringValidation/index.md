---
title: StringValidation
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/StringValidation/
has_toc: false
---

# StringValidation module
{: .no_toc }

<!-- test: StringValidationTests.Functions_CanBeCalledDespiteOptionPrivateModule -->

Holds the small string tests and the case helper that the package's formatter is built on.

**StringValidation** is a standard module of five public functions. [**StringContains**](StringContains), [**StringContainsAny**](StringContainsAny), [**StringMatchesAny**](StringMatchesAny) and [**StringStartsWith**](StringStartsWith) return a **Boolean** about the text of a string, and [**CopyCapitalisation**](CopyCapitalisation) returns a string in the letter case of another. The formatter calls them to look for backslashes and escape sequences, to test whether a format string begins with `@` and to follow the case of an identifier. A project that references the package can call them too, by name or as `StringValidation.StringContains`.

> [!NOTE] BETA 1007
> The package declares the module with `Option Private Module`, which marks it as internal to the package. A project that references the package can still call its functions.

```tb check_build check_run
Debug.Print StringContains("Hello", "ELL")               ' True
Debug.Print StringContainsAny("Hello", False, "x", "L")  ' True
Debug.Print StringMatchesAny("b", "a", "b", "c")         ' True
Debug.Print StringStartsWith("He", "Hello")              ' True
Debug.Print CopyCapitalisation("HELLO", "world")         ' WORLD
```

<!-- /test -->

## Functions

- [CopyCapitalisation](CopyCapitalisation) -- returns a string in upper case or lower case, following another string
- [StringContains](StringContains) -- returns whether a string contains another, ignoring case unless asked not to
- [StringContainsAny](StringContainsAny) -- returns whether a string contains any one of several strings
- [StringMatchesAny](StringMatchesAny) -- returns whether a string is equal to any one of several values
- [StringStartsWith](StringStartsWith) -- returns whether a string begins with another, taking case into account

## See Also

- [StringFormat](../PublicEntryPoints/StringFormat) function -- the formatter that uses these functions
- [Fmt package](../) -- overview
