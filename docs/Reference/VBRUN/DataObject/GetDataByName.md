---
title: GetDataByName
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/GetDataByName
---
# GetDataByName
{: .no_toc }

Returns the value previously stored in the **DataObject** under a format identified by name, as a **Variant**.

Syntax: *object*.**GetDataByName(** *Format* **)**

*object*
: *required* An object expression that evaluates to a **DataObject**.

*Format*
: *required* A **String** giving the name of the format to read back --- typically the name a custom clipboard format was registered under with `RegisterClipboardFormat`. If the **DataObject** does not contain data in *Format*, the result is **Empty**; check first with [**GetFormatByName**](GetFormatByName) when the format may not be present.

> [!NOTE]
> **GetDataByName** is a twinBASIC addition; it has no equivalent in VB6. Use it when the consumer side knows the format only by its registered name and does not have the corresponding numeric identifier available. For the standard built-in formats, [**GetData**](GetData) with a **ClipboardConstants** value is more direct.

### Example

```tb
If Data.GetFormatByName("HTML Format") Then
    Dim Html As String
    Html = Data.GetDataByName("HTML Format")
End If
```

### See Also

- [GetData](GetData) method
- [GetFormatByName](GetFormatByName) method
- [AvailableFormats](AvailableFormats) method
