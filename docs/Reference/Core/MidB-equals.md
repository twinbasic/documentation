---
title: MidB =
parent: Statements
permalink: /tB/Core/MidB-equals
---
# MidB = statement
{: .no_toc }

Replaces a specified number of bytes in a **Variant** (**String**) variable with bytes from another string. The byte-mode counterpart of the [**Mid =**](Mid-equals) statement.

Syntax:
> **MidB(** *stringvar* **,** *start* [ **,** *length* ] **) =** *string*

*stringvar*
: Name of the string variable to modify.

*start*
: **Variant** (**Long**). Byte position in *stringvar* where the replacement of bytes begins.

*length*
: *optional*  **Variant** (**Long**). Number of bytes to replace. If omitted, all of *string* is used.

*string*
: String expression whose bytes replace part of *stringvar*.

The number of bytes replaced is always less than or equal to the number of bytes in *stringvar*.

**MidB =** is the byte-positioned form of [**Mid =**](Mid-equals): in this form, *start* and *length* count bytes of the underlying buffer rather than characters. This matters in double-byte character set languages where one character may occupy two bytes.

### See Also

- [**Mid =** statement](Mid-equals)
- [**MidB** function](../Modules/Strings/Mid)
- [**LSet** statement](LSet)
- [**RSet** statement](RSet)

{% include VBA-Attribution.md %}
