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

### Example

This example uses **Join** to concatenate an array of strings with a delimiter.

```tb
Debug.Print Join(Array("one", "two", "three"), ", ")    ' "one, two, three"
Debug.Print Join(Array("a", "b", "c"), "-")             ' "a-b-c"
Debug.Print Join(Array("x", "y"), "")                   ' "xy"
```

### See Also

- [Filter](Filter), [Split](Split) functions
