---
title: Value
parent: AsyncProperty
permalink: /tB/Packages/VBRUN/AsyncProperty/Value
---
# Value
{: .no_toc }

Returns the result of the asynchronous read, as a **Variant**. Read-only.

Syntax: *object*.**Value**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

**Value** is only meaningful in the **AsyncReadComplete** event --- during a progress notification the read has not yet finished. The concrete subtype of **Value** is determined by [**AsyncType**](AsyncType):

- `vbAsyncTypePicture` --- an **stdole.IPictureDisp**, which can be assigned to a **Picture** property.
- `vbAsyncTypeFile` --- a **String** holding the path of a temporary file containing the downloaded data.
- `vbAsyncTypeByteArray` --- a **Byte** array (`Byte()`) holding the raw bytes.

### Example

This example reads **Value** in the completion event and assigns the result to the control's **Picture** property.

```tb
Private Sub UserControl_AsyncReadComplete(AsyncProp As AsyncProperty)
    If AsyncProp.PropertyName = "Picture" Then
        Set UserControl.Picture = AsyncProp.Value    ' Value is an IPictureDisp
    End If
End Sub
```

### See Also

- [AsyncType](AsyncType) property
- [PropertyName](PropertyName) property
- [Target](Target) property
