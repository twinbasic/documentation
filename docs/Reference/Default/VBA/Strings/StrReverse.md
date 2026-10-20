---
title: StrReverse
parent: Strings Module
permalink: /tB/Modules/Strings/StrReverse
vba_attribution: true
---
# StrReverse
{: .no_toc }

Returns a string in which the character order of a specified string is reversed.

Syntax: **StrReverse(** *expression* **)**

*expression*
: *required* The string whose characters are to be reversed. If *expression* is a zero-length string (`""`), a zero-length string is returned.
<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *expression* is **Null** |

<!-- /errors -->

### Example

This example uses **StrReverse** to reverse the character order of a string.

```tb check_build
Debug.Print StrReverse("hello")     ' "olleh"
Debug.Print StrReverse("racecar")   ' "racecar"
Debug.Print StrReverse("AB")        ' "BA"
```
