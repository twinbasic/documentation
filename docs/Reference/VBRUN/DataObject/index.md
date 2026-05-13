---
title: DataObject
parent: VBRUN Package
nav_order: 10
permalink: /tB/Packages/VBRUN/DataObject/
redirect_from:
  - /tB/Modules/DataObject
has_toc: false
---

# DataObject class

A **DataObject** is a container for one piece of information held in one or more clipboard formats — the same payload represented as plain text, Unicode text, RTF, a bitmap, a list of file paths, and so on. The runtime hands a **DataObject** to clipboard and OLE drag-and-drop operations: the source side fills it with [**SetData**](SetData), and the destination side inspects what's available with [**GetFormat**](GetFormat) (or [**AvailableFormats**](AvailableFormats)) and pulls the bytes out with [**GetData**](GetData).

A new **DataObject** is created with **New** and starts out empty.

## Storing and retrieving data

[**SetData**](SetData) places a value into the **DataObject** under a given clipboard format — typically a value from the **ClipboardConstants** enumeration such as `vbCFText`, `vbCFUnicodeText`, or `vbCFBitmap`. A single object can hold the same logical payload under several formats at once, so consumers with different requirements can each find a representation they understand.

```tb
Dim Data As New DataObject
Data.SetData "Hello, world!", vbCFText
Data.SetData StrConv("Hello, world!", vbUnicode), vbCFUnicodeText
```

[**GetData**](GetData) pulls the value back out for a chosen format. [**Clear**](Clear) removes every format and value at once — useful when reusing a single **DataObject** for several operations.

twinBASIC also accepts format names as plain strings: [**GetDataByName**](GetDataByName) is the string-keyed counterpart to [**GetData**](GetData), and is convenient for custom or registered formats whose numeric identifier is not known up front.

## Discovering what's there

A consumer that did not place the data itself usually does not know which formats are present. [**GetFormat**](GetFormat) returns **True** if a given clipboard format is available, and [**GetFormatByName**](GetFormatByName) does the same for a named format. To discover the full set, [**AvailableFormats**](AvailableFormats) returns a [**DataObjectFormats**](DataObjectFormats) collection of [**DataObjectFormat**](DataObjectFormat) descriptors — each with a `Name`, a `FormatType` from **ClipboardConstants**, and information about how the format is stored.

```tb
Dim F As DataObjectFormat
For Each F In Data.AvailableFormats
    Debug.Print F.Name, F.FormatType
Next F
```

> [!NOTE]
> [**AvailableFormats**](AvailableFormats), [**GetFormatByName**](GetFormatByName), and [**GetDataByName**](GetDataByName) are twinBASIC additions; they have no equivalent in VB6.

## Files

When a **DataObject** carries a list of file paths — for example, the payload of a Windows shell drag-and-drop — [**Files**](Files) returns a [**DataObjectFiles**](DataObjectFiles) collection holding each path as a **String**.

```tb
Dim Path As Variant
For Each Path In Data.Files
    Debug.Print Path
Next Path
```

## Members

- [AvailableFormats](AvailableFormats) -- returns the collection of formats currently held in the **DataObject** *(twinBASIC extension)*
- [Clear](Clear) -- removes every format and value from the **DataObject**
- [Files](Files) -- returns the collection of file paths held in the **DataObject**
- [GetData](GetData) -- returns the value stored under a given clipboard format
- [GetDataByName](GetDataByName) -- returns the value stored under a given named format *(twinBASIC extension)*
- [GetFormat](GetFormat) -- returns whether the **DataObject** holds a value in a given clipboard format
- [GetFormatByName](GetFormatByName) -- returns whether the **DataObject** holds a value in a given named format *(twinBASIC extension)*
- [SetData](SetData) -- stores a value in the **DataObject** under a given clipboard format
