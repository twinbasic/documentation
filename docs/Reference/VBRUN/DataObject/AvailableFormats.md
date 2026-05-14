---
title: AvailableFormats
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/AvailableFormats
---
# AvailableFormats
{: .no_toc }

Returns a [**DataObjectFormats**](DataObjectFormats) collection describing every format the **DataObject** currently holds a value in.

Syntax: *object*.**AvailableFormats**

*object*
: *required* An object expression that evaluates to a **DataObject**.

Each element of the returned collection is a [**DataObjectFormat**](DataObjectFormat) descriptor with the format's `Name`, its `FormatType` from **ClipboardConstants**, and information about how the format is stored. Use this when the consumer side does not know in advance which formats the source has supplied --- typically in OLE drag-and-drop or paste operations from another application.

> [!NOTE]
> **AvailableFormats** is a twinBASIC addition; VB6 callers had to probe each format of interest with **GetFormat** instead.

### Example

```tb
Dim F As DataObjectFormat
For Each F In Data.AvailableFormats
    Debug.Print F.Name, F.FormatType
Next F
```

### See Also

- [DataObjectFormats](DataObjectFormats) collection
- [DataObjectFormat](DataObjectFormat)
- [GetFormat](GetFormat) method
- [GetFormatByName](GetFormatByName) method
