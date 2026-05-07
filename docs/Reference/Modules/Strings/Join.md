---
title: Join
parent: Strings Module
permalink: /tB/Modules/Strings/Join
---
# Join
{: .no_toc }

Returns a string created by joining a number of substrings contained in an array.

Syntax: **Join(** *sourcearray* [ **,** *delimiter* ] **)**

*sourcearray*
: *required* One-dimensional array containing substrings to be joined.

*delimiter*
: *optional* String character used to separate the substrings in the returned string. If omitted, the space character (`" "`) is used. If *delimiter* is a zero-length string (`""`), all items in the list are concatenated with no delimiters.

### See Also

- [Filter](Filter), [Split](Split) functions

{% include VBA-Attribution.md %}
