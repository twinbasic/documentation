---
title: Files
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/Files
---
# Files
{: .no_toc }

Returns a [**DataObjectFiles**](DataObjectFiles) collection holding the file paths the **DataObject** contains.

Syntax: *object*.**Files**

*object*
: *required* An object expression that evaluates to a **DataObject**.

This is the typical way to read the payload of a Windows shell drag-and-drop, which arrives as a list of fully qualified paths under the `vbCFFiles` clipboard format. Each element of the collection is a **String**.

The source side may also fill the **DataObject** with a list of files by adding paths to this collection — see [**DataObjectFiles.Add**](DataObjectFiles#add).

### Example

```tb
Private Sub Form_OLEDragDrop(Data As DataObject, Effect As Long, Button As Integer, _
                             Shift As Integer, X As Single, Y As Single)
    If Data.GetFormat(vbCFFiles) Then
        Dim Path As Variant
        For Each Path In Data.Files
            Debug.Print Path
        Next Path
    End If
End Sub
```

### See Also

- [DataObjectFiles](DataObjectFiles) collection
- [GetFormat](GetFormat) method
- [SetData](SetData) method
