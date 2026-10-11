---
title: CopyCapitalisation
parent: StringValidation
permalink: /tB/Packages/Contributed/Fmt/StringValidation/CopyCapitalisation
has_toc: false
---

# CopyCapitalisation
{: .no_toc }

Returns a string in upper case or in lower case, following the case of another string.

Syntax: **CopyCapitalisation** ( *source*, *applyTo* ) **As String**

*source*
: *required* The **String** whose letter case is followed.

*applyTo*
: *required* The **String** to convert.

Returns *applyTo* in upper case when *source* has no lower-case letters, and in lower case otherwise.

## Remarks

The function looks at *source* as a whole and does not copy case letter by letter. A *source* of `"HeLLo"` has lower-case letters, so the result is lower case. A *source* with no letters at all, such as `"123"`, is equal to its upper-case form, so the result is upper case.

The format identifier classes use it to give a result the case of the identifier that was written: `{0:X}` and `{0:x}` give `&HFF` and `&hff`.

## Example

```tb check_build check_run
Debug.Print CopyCapitalisation("HELLO", "world")  ' WORLD
Debug.Print CopyCapitalisation("HeLLo", "world")  ' world
Debug.Print CopyCapitalisation("hello", "WORLD")  ' world
Debug.Print CopyCapitalisation("123", "world")    ' WORLD
```

## See Also

- [HexSFI](../HexSFI) class -- follows the case of its identifier
- [StringValidation](./) module -- overview
