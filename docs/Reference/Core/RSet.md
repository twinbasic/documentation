---
title: RSet
parent: Statements
permalink: /tB/Core/RSet
---
# RSet
{: .no_toc }

Right-aligns a string within a string variable.

Syntax:
> **RSet** *stringvar* **=** *string*

*stringvar*
: Name of a string variable.

*string*
: String expression to be right-aligned within *stringvar*.

If *stringvar* is longer than *string*, **RSet** replaces any leftover characters in *stringvar* with spaces, back to its beginning.

> [!NOTE]
> **RSet** can't be used with user-defined types.

### Example

This example uses the **RSet** statement to right-align a string within a string variable.

```tb
Dim MyString
MyString = "0123456789"   ' Initialize string.
RSet MyString = "Right->" ' MyString contains "   Right->".
```

### See Also

- [**LSet** statement](LSet)
- [**Mid =** statement](Mid-equals)
- [**Let** statement](Let)

{% include VBA-Attribution.md %}
