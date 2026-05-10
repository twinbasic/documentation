---
title: GetFormatByName
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/GetFormatByName
---
# GetFormatByName
{: .no_toc }

Returns whether the **DataObject** holds a value in a format identified by name, as a **Boolean**.

Syntax: *object*.**GetFormatByName(** *Format* **)**

*object*
: *required* An object expression that evaluates to a **DataObject**.

*Format*
: *required* A **String** giving the name of the format to test for — typically the name a custom clipboard format was registered under with `RegisterClipboardFormat`.

The result is **True** if the **DataObject** can produce a value in *Format*, **False** otherwise. Use this before calling [**GetDataByName**](GetDataByName) when the format may not be present.

> [!NOTE]
> **GetFormatByName** is a twinBASIC addition; it has no equivalent in VB6. For the standard built-in formats, [**GetFormat**](GetFormat) with a **ClipboardConstants** value is more direct.

### Example

```tb
If Data.GetFormatByName("HTML Format") Then
    Dim Html As String
    Html = Data.GetDataByName("HTML Format")
End If
```

### See Also

- [GetDataByName](GetDataByName) method
- [GetFormat](GetFormat) method
- [AvailableFormats](AvailableFormats) method
