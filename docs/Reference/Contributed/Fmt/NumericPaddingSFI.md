---
title: NumericPaddingSFI
parent: Fmt Package
permalink: /tB/Packages/Contributed/Fmt/NumericPaddingSFI
has_toc: false
---

# NumericPaddingSFI class
{: .no_toc }

A placeholder format identifier that never matches and cannot format.

**NumericPaddingSFI** is a format identifier class. It implements [**IStringFormatIdentifier**](IStringFormatIdentifier) but has no identifier of its own. [**StringHelper**](StringHelper) registers it last among the numeric identifiers, and because its **IsIdentifierMatch** always returns **False**, [**StringFormat**](PublicEntryPoints/StringFormat) never calls its **GetFormattedValue**. The package's source states no purpose for it. The class is predeclared, and its two members are reached through the interface.

An item such as `{0:N}` names an identifier that no class matches, so it raises error `-2147212503`, *Invalid format string*. This class does not implement the .NET `N` identifier or any other padding.

## Members

- **IsIdentifierMatch** always returns **False**, whatever the specifier holds.
- **GetFormattedValue** always raises run-time error 5, *Invalid procedure call or argument*.

Both are implemented as private members of the interface.

```tb check_build check_run
Dim f As IStringFormatIdentifier
Set f = NumericPaddingSFI

Dim spec As New StringFormatSpecifier
spec.identifier = "N"
Debug.Print f.IsIdentifierMatch(spec)  ' False

On Error Resume Next
Debug.Print f.GetFormattedValue(1, spec)
Debug.Print Err.Number & ": " & Err.Description  ' 5: Invalid procedure call or argument
```

## See Also

- [IStringFormatIdentifier](IStringFormatIdentifier) interface -- the contract every format identifier class implements
- [StringHelper](StringHelper) class -- registers the numeric identifiers
- [Fmt package](./) -- overview, with the table of identifiers
