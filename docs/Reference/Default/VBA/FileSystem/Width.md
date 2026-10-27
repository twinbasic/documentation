---
title: Width
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Width
redirect_from:
  - /tB/Core/Width
  - /tB/Modules/HiddenModule/Width
vba_attribution: true
---
# Width #
{: .no_toc }

Assigns an output line width to a file opened by the [**Open**](../../Core/Open) statement.

Syntax: **Width #** *FileNumber* **,** *Width*

*FileNumber*
: *required* The file number used to open the file.

*Width*
: *required* An **Integer** in the range 0--32,767, inclusive, indicating how many characters appear on a line before a new line is started. If *Width* equals `0`, there is no limit to the length of a line. The default is `0`.

> [!NOTE]
> VB6 and 64-bit VBA take a *Width* from 0 to 255 only, and raise error 5, *Invalid procedure call or argument*, for one above 255.

<!-- bug: filesystem-argument-checks -->
> [!WARNING] BETA 1010
> A negative *Width* raises no error, and **Print #** then starts a new line before each item after the first. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*.

<!-- errors: generated from errors/VBA.FileSystem.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *FileNumber* is not the number of an open file |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *Width* is **Null** |

> [!NOTE] BETA 1010
> When *FileNumber* is not the number of an open file, VB6 and 64-bit VBA raise error [52 (`&H34`)](tb:Errors#52), *Bad file name or number*, instead.

> [!NOTE] BETA 1010
> When *Width* is negative, after rounding, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example sets the output line width to 5 --- five characters are written per line before the channel wraps.

```tb check_build
Dim I As Long
Open "TESTFILE" For Output As #1     ' Open file for output.
Width #1, 5                          ' Set output line width to 5.
For I = 0 To 9                       ' Loop 10 times.
    Print #1, Chr(48 + I);           ' Prints five characters per line.
Next I
Close #1                             ' Close file.
```

### See Also

- [Open](../../Core/Open) statement
- [Print #](../../Core/Print) statement
