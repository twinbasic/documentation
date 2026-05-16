---
title: SetData
parent: DataObject
permalink: /tB/Packages/VBRUN/DataObject/SetData
---
# SetData
{: .no_toc }

Stores a value in the **DataObject** under a given clipboard format. Calling **SetData** several times against the same object lets one logical payload be made available under several formats --- for example as `vbCFText` and `vbCFUnicodeText` --- so each consumer can pick the representation it understands.

Syntax: *object*.**SetData** [ *Value* [ **,** *Format* ] ]

*object*
: *required* An object expression that evaluates to a **DataObject**.

*Value*
: *optional* The value to store. May be any expression assignable to a **Variant** --- text, a byte array, an **stdole.IPictureDisp**, and so on.

*Format*
: *optional* A **ClipboardConstants** value --- `vbCFText`, `vbCFUnicodeText`, `vbCFBitmap`, `vbCFFiles`, and so on --- naming the clipboard format under which *Value* is stored. If omitted, the **DataObject** chooses a default format based on the run-time type of *Value*.

When using a custom (private) clipboard format, register it with the system through `RegisterClipboardFormat` before passing its identifier to **SetData**; otherwise other applications will not be able to read the data back.

### Example

```tb
Dim Data As New DataObject
Data.SetData "Hello, world!", vbCFText
Data.SetData LoadPicture("logo.bmp"), vbCFBitmap
```

### See Also

- [Clear](Clear) method
- [GetData](GetData) method
- [GetFormat](GetFormat) method
