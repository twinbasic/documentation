---
title: GetData
parent: DataObject
permalink: /tB/Packages/VBRUN/DataObject/GetData
---
# GetData
{: .no_toc }

Returns the value previously stored in the **DataObject** under the given clipboard format, as a **Variant**.

Syntax: *object*.**GetData(** *Format* **)**

*object*
: *required* An object expression that evaluates to a **DataObject**.

*Format*
: *required* A **ClipboardConstants** value identifying the format to read back --- for example `vbCFText`, `vbCFUnicodeText`, `vbCFBitmap`. If the **DataObject** does not contain data in *Format*, the result is **Empty**; check first with [**GetFormat**](GetFormat) when the format may not be present.

The concrete subtype of the returned **Variant** depends on *Format*: text formats yield a **String**, `vbCFBitmap` yields an **stdole.IPictureDisp**, `vbCFFiles` yields a path or a path collection, and so on. To pull data out by a textual format name rather than a numeric clipboard constant, use [**GetDataByName**](GetDataByName).

### Example

```tb
If Data.GetFormat(vbCFText) Then
    Dim Text As String
    Text = Data.GetData(vbCFText)
    Debug.Print Text
End If
```

### See Also

- [GetDataByName](GetDataByName) method
- [GetFormat](GetFormat) method
- [SetData](SetData) method
- [AvailableFormats](AvailableFormats) method
