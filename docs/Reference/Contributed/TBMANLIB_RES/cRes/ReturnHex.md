---
title: ReturnHex
parent: cRes
permalink: /tB/Packages/Contributed/TBMANLIB_RES/cRes/ReturnHex
has_toc: false
---
# ReturnHex
{: .no_toc }

Returns the loaded resource bytes as an uppercase hex string, with an optional separator between each byte and an optional line-break interval.

Syntax: *object*.**ReturnHex** ( [ *Separator* ] [ **,** *LineBreak* ] )

*Separator*
: *optional* A **String** inserted between each pair of adjacent byte values. Pass an empty string (default) for a compact, unseparated hex string.

*LineBreak*
: *optional* A **Long** specifying how many bytes appear on each line. When greater than `0`, a `vbCrLf` line break is inserted after every *LineBreak* bytes rather than the *Separator*. When `0` (default), no line breaks are inserted.

Each byte is formatted as exactly two uppercase hex digits, left-padded with `0` where necessary, so single-digit values such as `0A` or `0F` always occupy two characters. *Separator* is not appended after the final byte.

When *LineBreak* is greater than `0`, it takes precedence over *Separator*: the *Separator* string is not inserted between bytes that fall on a line-break boundary. If both *Separator* is non-empty and *LineBreak* is greater than `0`, *Separator* is inserted between bytes within each line while `vbCrLf` is inserted at the end of each complete *LineBreak*-sized group.

> [!NOTE]
> **ReturnHex** raises a run-time error if no resource has been loaded. Call [**Read**](Read) before calling **ReturnHex**.

### Example

This example loads a binary resource, prints it as a compact hex string, then as a space-separated string, and finally as 16-bytes-per-line blocks.

```tb
Dim res As New cRes
res.Read 101, "BINARY"

' Compact hex: "0102030405..."
Debug.Print res.ReturnHex()

' Space-separated: "01 02 03 04 05..."
Debug.Print res.ReturnHex(" ")

' 16 bytes per line, space-separated within each line:
Debug.Print res.ReturnHex(" ", 16)
```

### See Also

- [Read](Read) method
- [ReturnBytes](ReturnBytes) method
- [ReturnString](ReturnString) method
- [ReturnBase64](ReturnBase64) method
