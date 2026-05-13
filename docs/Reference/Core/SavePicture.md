---
title: SavePicture
parent: Statements
permalink: /tB/Core/SavePicture
---
# SavePicture
{: .no_toc }

Saves a graphic from a `Picture` or `Image` to a file.

Syntax:
> **SavePicture** *picture* **,** *stringexpression*

*picture*
: A `Picture` (e.g. `stdole.StdPicture`) or `Image` from which the graphic will be saved. Typically the `Picture` property of a control such as a **PictureBox** or **Image**, or the result of a **LoadPicture** call.

*stringexpression*
: String expression specifying the path of the file to write.

If the *picture* originally came from a file (loaded with **LoadPicture**), the file is written in the same format as the original. If *picture* was created or modified at runtime (for example, by drawing into a **PictureBox**), the file is saved as a bitmap (`.bmp`).

> [!NOTE]
> **SavePicture** is a legacy VB6/VBx statement preserved in twinBASIC for source compatibility. New code that needs more control over output format (PNG, JPEG, format options) should use the platform's imaging APIs directly or convert via [**PictureToByteArray**](../Modules/HiddenModule/PictureToByteArray) and write the bytes through standard file I/O.

### Example

```tb
' Save the graphic currently displayed in Picture1 to disk.
SavePicture Picture1.Picture, "C:\Temp\Snapshot.bmp"

' Round-trip an image through a Picture object.
Dim P As StdPicture
Set P = LoadPicture("C:\Temp\Original.png")
SavePicture P, "C:\Temp\Copy.bmp"   ' Always saved as BMP if not loaded from file.
```

### See Also

- [**PictureToByteArray** function](../Modules/HiddenModule/PictureToByteArray)
- [**CreateStdPictureFromHandle** function](../Modules/HiddenModule/CreateStdPictureFromHandle)
