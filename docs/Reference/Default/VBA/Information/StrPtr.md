---
title: StrPtr
parent: Information Module
permalink: /tB/Modules/Information/StrPtr
redirect_from:
  - /tB/Modules/HiddenModule/StrPtr
---
# StrPtr
{: .no_toc }

Returns the address of the underlying buffer of a **String** as a **LongPtr**.

Syntax: **StrPtr(** *String* **)**

*String*
: *required* The **String** whose buffer address is wanted.

twinBASIC stores a **String** as a Unicode (UTF-16) BSTR --- a length-prefixed buffer that **StrPtr** returns the start of. The returned value points at the first character, not at the four-byte length prefix that precedes it.

If *String* is **vbNullString** the result is zero. For an empty string `""`, the result is the address of a valid (but zero-length) buffer; passing it to an API that distinguishes a null pointer from an empty string is the usual reason to prefer **vbNullString** over `""` in declarations.

The pointer is valid only as long as the **String** variable stays alive and is not reassigned. Treat it as a borrow, not as ownership.

### Example

```tb
Dim s As String
s = "Hello"
Debug.Print StrPtr(s)            ' e.g. 1234567890 — varies per run

Dim ch As Integer
GetMem2 StrPtr(s), ch
Debug.Print Chr$(ch)             ' "H"
```

### See Also

- [ObjPtr](ObjPtr) function
- [VarPtr](VarPtr) function
- [vbNullString](../Constants/#vbNullString)
