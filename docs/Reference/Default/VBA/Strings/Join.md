---
title: Join
parent: Strings Module
permalink: /tB/Modules/Strings/Join
vba_attribution: true
---
# Join
{: .no_toc }

Returns a string created by joining a number of substrings contained in an array.

Syntax: **Join(** *sourcearray* [ **,** *delimiter* ] **)**

*sourcearray*
: *required* One-dimensional array containing substrings to be joined.

*delimiter*
: *optional* String character used to separate the substrings in the returned string. If omitted, the space character (`" "`) is used. If *delimiter* is a zero-length string (`""`), all items in the list are concatenated with no delimiters.

<!-- errors: generated from errors/VBA.Strings.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument* | *sourcearray* has more than one dimension |
| [13 (`&HD`)](../../../Reference/Run-time-Errors#error-13), *Type mismatch* | *sourcearray* is **Null**, or an element of it is an array |
| [94 (`&H5E`)](../../../Reference/Run-time-Errors#error-94), *Invalid use of Null* | *delimiter* is **Null**, or an element of *sourcearray* is **Null** |

> [!NOTE] BETA 1010
> When *sourcearray* is a **Long** array, VB6 raises error [5 (`&H5`)](../../../Reference/Run-time-Errors#error-5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses **Join** to concatenate an array of strings with a delimiter.

```tb check_build
Debug.Print Join(Array("one", "two", "three"), ", ")    ' "one, two, three"
Debug.Print Join(Array("a", "b", "c"), "-")             ' "a-b-c"
Debug.Print Join(Array("x", "y"), "")                   ' "xy"
```

### See Also

- [Filter](Filter), [Split](Split) functions
