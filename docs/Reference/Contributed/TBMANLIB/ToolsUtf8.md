---
title: ToolsUtf8
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsUtf8
has_toc: false
---

# ToolsUtf8 module
{: .no_toc }

Converts between a **String** and an array of bytes in UTF-8, with the Windows functions **MultiByteToWideChar** and **WideCharToMultiByte** and the code page 65001. The module has three functions and needs no other component.

```tb check_build check_run
Dim Bytes() As Byte
Bytes = ToolsUtf8.Encode("caf" & ChrW(233))

Debug.Print UBound(Bytes) + 1
Debug.Print Hex$(Bytes(3)) & Hex$(Bytes(4))
Debug.Print ToolsUtf8.Decode(Bytes) = "caf" & ChrW(233)
' Output:
' 5
' C3A9
' True
```

Both functions that read UTF-8 take a byte array that starts at index 0: they read from `Utf(0)` and take the count of bytes from `UBound`.

* TOC
{:toc}

## Functions

### Decode
{: .no_toc }

Converts UTF-8 bytes to a string.

Syntax: **ToolsUtf8.Decode** ( *Utf* ) **As String**

*Utf*
: *required* A **Byte** array that holds UTF-8 text. It is passed by reference and is not changed.

Returns the text as a **String**. A byte order mark (EF BB BF) at the start of the bytes is not removed: it becomes the character U+FEFF at the start of the string.

If *Utf* has not been dimensioned, the function returns an empty string.

### DecodeToByteArray
{: .no_toc }

Converts UTF-8 bytes to the bytes of a UTF-16 string.

Syntax: **ToolsUtf8.DecodeToByteArray** ( *Utf* ) **As Byte()**

*Utf*
: *required* A **Byte** array that holds UTF-8 text. It is passed by reference and is not changed.

The conversion produces two bytes for each character of the text, but the array that the function returns is resized to a length in bytes equal to the number of characters, so it holds the first half of the converted bytes only.

> [!WARNING] 1.0.0.29
> The result is cut off without an error. For the five UTF-8 bytes of the text `caf` followed by the letter e with an acute accent, which is four characters and eight UTF-16 bytes, the array has four bytes. To get the whole text as UTF-16 bytes, convert with [**Decode**](#decode) and assign the string to a **Byte** array.

```tb check_build check_run
Dim Utf() As Byte
Dim Half() As Byte
Utf = ToolsUtf8.Encode("caf" & ChrW(233))
Half = ToolsUtf8.DecodeToByteArray(Utf)
Debug.Print UBound(Half) + 1
' Output:
' 4
```

If *Utf* has not been dimensioned, the call raises error 9.

### Encode
{: .no_toc }

Converts a string to UTF-8 bytes.

Syntax: **ToolsUtf8.Encode** ( *UCS* ) **As Byte()**

*UCS*
: *required* A **String**.

Returns a **Byte** array that starts at index 0 and holds the text in UTF-8, with no byte order mark and no terminating zero byte.

For an empty string the function returns an array that has not been dimensioned, so `UBound` of the result raises error 9.

```tb check_build check_run
Dim Utf() As Byte
Utf = ToolsUtf8.Encode("")
On Error Resume Next
Debug.Print UBound(Utf)
Debug.Print Err.Number
' Output:
' 9
```

## See Also

- [cToolsStream](cToolsStream) class -- reads and writes files in a chosen character set, UTF-8 by default
- [cToolsStr](cToolsStr) class -- **ToBytes** and **ToString**, which convert with the ANSI code page
- [TBMANLIB](.) package -- overview
