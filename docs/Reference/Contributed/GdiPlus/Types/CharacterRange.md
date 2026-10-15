---
title: CharacterRange
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/CharacterRange
---

# CharacterRange type
{: .no_toc }

A range of characters in a string: the position of the first character and the number of characters.

A **CharacterRange** names the part of a string whose layout is wanted. A [**StringFormat**](../StringFormat) holds up to 32 of them ([**MeasurableCharacterRanges**](../StringFormat#measurablecharacterranges)), and [**Graphics.MeasureCharacterRanges**](../Graphics) returns the space that each one takes when the string is drawn. The type mirrors the GDI+ [CharacterRange](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-characterrange) structure.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **First** | **Long** | The position of the first character of the range, counted from 0. |
| **Length** | **Long** | The number of characters in the range. |

## Creating

Syntax: *range* **= CharacterRange**( )

Syntax: *range* **= CharacterRange**( *first*, *length* )

*first*
: *required* A **Long** for **First**.

*length*
: *required* A **Long** for **Length**.

**CharacterRange**( ) returns a range with both fields 0. A variable declared **As CharacterRange** starts the same way, so the function is a convenience for setting both fields in one expression.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim r As CharacterRange = CharacterRange(4, 3)
Debug.Print r.First & " " & r.Length    ' 4 3

Dim zero As CharacterRange = CharacterRange()
Debug.Print zero.First & " " & zero.Length    ' 0 0

' The word "world" in "Hello world":
Dim text As String = "Hello world"
Dim word As CharacterRange = CharacterRange(InStr(text, "world") - 1, Len("world"))
Debug.Print Mid$(text, word.First + 1, word.Length)    ' world
```

## See Also

- [StringFormat](../StringFormat) class -- holds the ranges to measure
- [Graphics](../Graphics) class -- **MeasureCharacterRanges**
- [CharacterRange structure](https://learn.microsoft.com/en-us/windows/win32/api/gdiplustypes/nl-gdiplustypes-characterrange) -- Microsoft's GDI+ reference
