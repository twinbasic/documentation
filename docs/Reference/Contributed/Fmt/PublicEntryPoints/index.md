---
title: PublicEntryPoints
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/PublicEntryPoints/
has_toc: false
---

# PublicEntryPoints module
{: .no_toc }

Holds **StringFormat**, the main entry point of the package.

**PublicEntryPoints** is a standard module with one function, [**StringFormat**](StringFormat). Its **ParamArray** takes the values to format as arguments. It copies them into an array and passes them to [**StringHelper**](../StringHelper), which does the work. A project that references the package calls it by name or as `PublicEntryPoints.StringFormat`.

```tb check_build check_run
Debug.Print StringFormat("I'm eating a very nice {0} {1}", "Bramleys", 3.142)  ' I'm eating a very nice Bramleys 3.142
Debug.Print PublicEntryPoints.StringFormat("{0,-6}|{1,6}|", "ab", "cd")        ' ab    |    cd|
```

## Functions

- [StringFormat](StringFormat) -- builds a string from a format string and a list of values

## See Also

- [FormerStringFormat](../FormerEntryPoint/FormerStringFormat) function -- the earlier implementation
- [StringHelper](../StringHelper) class -- takes the values as an array
- [Fmt package](../) -- overview, with the syntax of format items
