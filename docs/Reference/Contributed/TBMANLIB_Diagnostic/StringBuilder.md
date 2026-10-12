---
title: StringBuilder
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/StringBuilder
has_toc: false
---

# StringBuilder class
{: .no_toc }

Builds a long string from many parts. The text is kept in a buffer that grows as needed, so appending does not copy the whole string each time. The three [formatters](Formatters) build their reports with it. Most of its methods return the builder, so the calls can be chained.

```tb check_build check_run
Dim sb As New StringBuilder
sb.Append("Name: ").Append("Ann").AppendLine
sb.AppendFormat "{0} is {1}", "Ann", 31
sb.AppendLine
sb.AppendRepeat "-", 5

Debug.Print Replace(sb.ToString(), vbCrLf, "|")
Debug.Print sb.Length
' Output:
' Name: Ann|Ann is 31|-----
' 27
```

The text is a **String**, with the limits of one. Positions are counted from 0: the first character is at position 0.

* TOC
{:toc}

## Properties

### Capacity
{: .no_toc }

The size of the buffer, in characters.

Syntax: *builder*.**Capacity** **As Long**

Read-only. It is 256 for a builder made without an argument, and the argument, or 16 when that is less, for a builder made with one. When an append does not fit, the buffer becomes twice as large, or as large as the text needs when that is more.

### Length
{: .no_toc }

The number of characters in the text.

Syntax: *builder*.**Length** [ **=** *value* ]

Setting a value below 0 sets 0. A value below the current length cuts the text. A value above it makes the text longer and the buffer larger when needed; the new characters are those that the buffer holds at those places, which are spaces for a buffer that was never written there, and the characters of earlier text for a buffer that was cut or cleared.

```tb check_build check_run
Dim sb As New StringBuilder
sb.Append "abc"
sb.Insert 1, "XY"
Debug.Print sb.ToString()
sb.Length = 2
Debug.Print sb.ToString()
sb.Length = 5
Debug.Print sb.ToString()

Dim fresh As New StringBuilder
fresh.Append "ab"
fresh.Length = 4
Debug.Print "[" & fresh.ToString() & "]"
' Output:
' aXYbc
' aX
' aXYbc
' [ab  ]
```

## Methods

### Append
{: .no_toc }

Adds text at the end.

Syntax: *builder*.**Append** ( *text* ) **As StringBuilder**

*text*
: *required* A **String**.

Returns the builder. An empty string changes nothing.

### AppendFormat
{: .no_toc }

Adds text in which numbered places are replaced by values.

Syntax: *builder*.**AppendFormat** ( *format*, *args* ) **As StringBuilder**

*format*
: *required* A **String** with the places `{0}`, `{1}` and so on.

*args*
: *optional* Any number of values, each converted with **CStr**. The first one replaces `{0}`.

Returns the builder. The function replaces the places one after the other, in the order of the values, with the **Replace** function, so it has no formats such as `{0:N2}`. A value that holds a place, such as `{1}`, is itself replaced when a later value has that number.

### AppendLine
{: .no_toc }

Adds text and a line break.

Syntax: *builder*.**AppendLine** [ ( *text* ) ] **As StringBuilder**

*text*
: *optional* A **String**. Default: an empty string.

Returns the builder. The line break is **vbCrLf**.

### AppendRepeat
{: .no_toc }

Adds a character several times.

Syntax: *builder*.**AppendRepeat** ( *char*, *count* ) **As StringBuilder**

*char*
: *required* A **String**. Its first character is repeated.

*count*
: *required* A **Long**. A value of 0 or less changes nothing.

Returns the builder.

### Clear
{: .no_toc }

Empties the text.

Syntax: *builder*.**Clear**

Sets the length to 0. The buffer keeps its size and its contents.

### Insert
{: .no_toc }

Inserts text at a position.

Syntax: *builder*.**Insert** ( *index*, *text* ) **As StringBuilder**

*index*
: *required* A **Long**, from 0 to [**Length**](#length). The text goes before the character at that position. With **Length** it goes at the end.

*text*
: *required* A **String**.

Returns the builder. Raises error 9 with the source `StringBuilder.Insert` and the text `Index out of range`, when *index* is below 0 or above **Length**.

### New
{: .no_toc }

Creates a builder.

Syntax: **New** **StringBuilder** [ ( *initialCapacity* ) ]

*initialCapacity*
: *optional* A **Long**, the size of the buffer in characters. A value below 16 gives 16. Default: 256.

### ToString
{: .no_toc }

Returns the text.

Syntax: *builder*.**ToString** **As String**

Returns the text, or an empty string when the length is 0.

## See Also

- [Formatters](Formatters) -- build their reports with a **StringBuilder**
- [FormatHelper](FormatHelper) module -- functions for text, numbers and times
