---
title: Loading and Saving
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/Files
has_toc: false
symbols:
  - RtfLoadSaveFormatConstants
---

# Loading and Saving
{: .no_toc }

Reads the text of a [**RichTextBox**](.) from a file, as RTF or as plain text, and writes it to one.

<!-- test: RichTextBoxFilesTests.SaveFile_LoadFile_KeepsTheFormatting -->
```tb check_build check_run arch=win32,win64
Dim Path As String
Path = Environ$("TEMP") & "\rtb-sample.rtf"
RichTextBox1.Text = "Saved text"
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 5
RichTextBox1.SelBold = True
RichTextBox1.SaveFile Path                  ' as RTF, the default
RichTextBox1.Text = ""
RichTextBox1.LoadFile Path
Debug.Print RichTextBox1.Text
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 5
Debug.Print RichTextBox1.SelBold            ' the formatting came back with the text
Kill Path
' Output:
' Saved text
' True
```
<!-- /test -->

* TOC
{:toc}

## Files and their formats

[**LoadFile**](#loadfile) and [**SaveFile**](#savefile) read and write a file in one of the formats of [**RtfLoadSaveFormatConstants**](#rtfloadsaveformatconstants): RTF, plain text in the code page of Windows, or plain text in Unicode. Either method can work on the selection alone: **LoadFile** then puts the file in place of the selection, or at the insertion point, and **SaveFile** writes the selection.

<!-- test: RichTextBoxFilesTests.SaveFile_UnicodeText_StartsWithAByteOrderMark, RichTextBoxFilesTests.LoadFile_SelectionOnly_InsertsAtTheInsertionPoint -->
A file of Unicode text is written in UTF-16 with a byte order mark at its start, and read with or without one. A file of plain text in the code page of Windows can hold only the characters of that code page: the others are written as question marks.
<!-- /test -->

```tb check_build check_run arch=win32,win64
Dim Path As String
Path = Environ$("TEMP") & "\rtb-sample.txt"
RichTextBox1.Text = "words"
RichTextBox1.SaveFile Path, RtfLoadSaveFormatUnicodeText
Debug.Print FileLen(Path)                   ' 2 bytes of the mark, 2 for each character
RichTextBox1.Text = "[]"
RichTextBox1.SelStart = 1
RichTextBox1.LoadFile Path, RtfLoadSaveFormatUnicodeText, True
Debug.Print RichTextBox1.Text
Kill Path
' Output:
'  12
' [words]
```

<!-- test: RichTextBoxFilesTests.FileName_TextFile_LoadsIt, RichTextBoxFilesTests.FileName_RtfFileInPlainText_IsNotLoaded -->
[**FileName**](#filename) loads a file too, and decides its format by its first bytes: a byte order mark of UTF-16 makes it Unicode text, a start of `{\rtf` makes it RTF, and anything else makes it plain text.
<!-- /test -->

<!-- test: RichTextBoxFilesTests.SaveFile_FolderMissing_RaisesAnError -->
> [!WARNING] 1.8.142.0
> **SaveFile** raises no error when it cannot write the file, in a folder that does not exist, on a file that another program has open, or where the user may not write. Nothing is saved, and the program cannot tell. A program that must know checks the file afterwards, for example with [**FileLen**](../../../../Modules/FileSystem/FileLen) or [**Dir**](../../../../Modules/FileSystem/Dir).

Properties
----------

### FileName
{: .no_toc }

The file that was last loaded by assigning this property. **String**. Default: empty. An assignment loads the file in the format that its first bytes show; see [Files and their formats](#files-and-their-formats). In plain text, with [**TextMode**](Text#textmode) set to **RtfTextModePlainText**, a file of RTF is not loaded, and **FileName** is set to an empty string. An empty string empties the box.

<!-- test: RichTextBoxFilesTests.FileName_Missing_Raises75 -->
A file that does not exist raises run-time error 75, *The specified file name cannot be accessed or is invalid*.
<!-- /test -->

Methods
-------

### LoadFile
{: .no_toc }

Reads a file into the box, in place of the whole text or of the selection.

Syntax: *object*.**LoadFile** *FileName* [, *Format* ] [, *SelectionOnly* ]

*FileName*
: *required* A **String**: the full path of the file. An empty string does nothing.

*Format*
: *optional* A member of [**RtfLoadSaveFormatConstants**](#rtfloadsaveformatconstants): the format of the file. The default is **RtfLoadSaveFormatRTF**.

*SelectionOnly*
: *optional* A **Boolean**: **True** to put the file in place of the selection, or at the insertion point. The default, **False**, replaces the whole text.

<!-- test: RichTextBoxFilesTests.LoadFile_Missing_Raises75 -->
A file that does not exist raises run-time error 75.
<!-- /test -->

### SaveFile
{: .no_toc }

Writes the text of the box, or the selection, to a file. A file of that name is replaced.

Syntax: *object*.**SaveFile** *FileName* [, *Format* ] [, *SelectionOnly* ]

*FileName*
: *required* A **String**: the full path of the file. An empty string does nothing.

*Format*
: *optional* A member of [**RtfLoadSaveFormatConstants**](#rtfloadsaveformatconstants): the format to write. The default is **RtfLoadSaveFormatRTF**.

*SelectionOnly*
: *optional* A **Boolean**: **True** to write the selection alone. The default is **False**.

The [warning](#files-and-their-formats) above says what the method does when it cannot write the file.

## RtfLoadSaveFormatConstants
{: #rtfloadsaveformatconstants }

The formats of [**LoadFile**](#loadfile) and [**SaveFile**](#savefile).

| Member | Value | Description |
|---|---|---|
| **RtfLoadSaveFormatRTF**{: #RtfLoadSaveFormatConstants_RtfLoadSaveFormatRTF } | 0 | The Rich Text Format, with the formatting of the text. |
| **RtfLoadSaveFormatText**{: #RtfLoadSaveFormatConstants_RtfLoadSaveFormatText } | 1 | Plain text, in the code page of Windows. |
| **RtfLoadSaveFormatUnicodeText**{: #RtfLoadSaveFormatConstants_RtfLoadSaveFormatUnicodeText } | 2 | Plain text, in UTF-16 with a byte order mark. |

## See Also

- [RichTextBox](.) control
- [Text and Typing](Text) -- **TextRTF**, the text as RTF in a string
