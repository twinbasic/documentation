---
title: InputB, InputB$
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/InputB
redirect_from:
  - /tB/Modules/HiddenModule/InputB
vba_attribution: true
---
# InputB, InputB$
{: .no_toc }

Returns a fixed number of bytes read from a file opened in **Input** or **Binary** mode.

Syntax:
- **InputB(** *Number* **,** [ **#** ] *FileNumber* **)** --- returns a **Variant**.
- **InputB$(** *Number* **,** [ **#** ] *FileNumber* **)** --- returns a **String** whose underlying bytes are the bytes that were read.

*Number*
: *required* The number of bytes to return.

*FileNumber*
: *required* The file number used to open the file with the [**Open**](../../Core/Open) statement.

**InputB** is the byte-oriented counterpart of [**Input**](Input). Where **Input** counts and returns characters (two bytes per character in twinBASIC's UTF-16 buffer), **InputB** counts and returns raw bytes --- useful when reading binary data through a textually-opened channel.

The bytes are packed into the result without any character-set translation; the **String** form simply reinterprets the byte run as a UTF-16 string for storage.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *Number* is more bytes than are left in a file open for **Input**<br>the file is open for **Output**, **Append** or **Random**<br>*Number* is negative, after rounding<br>*FileNumber* is not the number of an open file |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *Number* or *FileNumber* is **Null** |

> [!NOTE] BETA 1010
> When *Number* is more bytes than are left in a file open for **Input**, VB6 and 64-bit VBA raise error [62 (`&H3E`)](tb:Errors#62), *Input past end of file*, instead.

> [!NOTE] BETA 1010
> When the file is open for **Output**, **Append** or **Random**, VB6 and 64-bit VBA raise error [54 (`&H36`)](tb:Errors#54), *Bad file mode*, instead.

> [!NOTE] BETA 1010
> When *Number* is negative, after rounding, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *FileNumber* is not the number of an open file, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

<!-- /errors -->

### Example

```tb check_build
Dim Bytes As Variant
Open "data.bin" For Binary Access Read As #1
Bytes = InputB(LOF(1), 1)            ' Read the whole file as bytes.
Close #1
```

### See Also

- [Input, Input$](Input) functions
- [Open](../../Core/Open) statement
- [LOF](LOF) function
