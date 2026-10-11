---
title: DateTimeSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/DateTimeSFI
has_toc: false
---

# DateTimeSFI class
{: .no_toc }

Formats a **Date** for the same identifiers as **GenericDateTimeSFI**, but is not registered with **StringHelper**.

**DateTimeSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) and contains the same code as [**GenericDateTimeSFI**](GenericDateTimeSFI): the identifiers **d**, **D**, **f**, **F**, **g**, **G**, **s**, **t**, **T** and **C** give the same results, and any other identifier does not match. The table of identifiers is on the [**GenericDateTimeSFI**](GenericDateTimeSFI#identifiers) page.

[**StringHelper**](StringHelper) registers **GenericDateTimeSFI** and not this class, so [**StringFormat**](PublicEntryPoints/StringFormat) never calls it. Code that calls the format identifier classes directly can use it. The class is predeclared, and its two members are reached through the interface.

```tb check_build check_run
Dim spec As New StringFormatSpecifier
spec.identifier = "d"

Dim f As IStringFormatIdentifier
Set f = DateTimeSFI
Debug.Print f.IsIdentifierMatch(spec)  ' True

spec.identifier = "q"
Debug.Print f.IsIdentifierMatch(spec)  ' False

spec.identifier = "C"
spec.CustomSpecifier = "yyyy-MM-dd"
Debug.Print f.GetFormattedValue(#2026-10-11 14:05:09#, spec)  ' 2026-10-11
```

## Members

- **IsIdentifierMatch** returns **True** when the specifier's [**identifier**](StringFormatSpecifier/identifier) is `C` or `c`, or is one of the other nine letters.
- **GetFormattedValue** returns the value formatted by the identifier. With `C` it uses the specifier's [**CustomSpecifier**](StringFormatSpecifier/CustomSpecifier).

Both are implemented as private members of the interface.

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [GenericDateTimeSFI](GenericDateTimeSFI) class -- the registered date and time identifier
- [Fmt package](./) -- overview, with the table of identifiers
