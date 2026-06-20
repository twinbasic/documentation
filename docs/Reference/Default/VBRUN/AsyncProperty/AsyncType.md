---
title: AsyncType
parent: AsyncProperty
permalink: /tB/Packages/VBRUN/AsyncProperty/AsyncType
---
# AsyncType
{: .no_toc }

Returns the kind of data being read, as an **AsyncTypeConstants** value. Read-only.

Syntax: *object*.**AsyncType**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value mirrors the *AsyncType* argument passed to **UserControl.AsyncRead** when the read was started. It also determines the subtype of [**Value**](Value) once the read completes:

- `vbAsyncTypePicture` (0) --- the data is being delivered as an **stdole.IPictureDisp**.
- `vbAsyncTypeFile` (1) --- the data is being saved to a temporary file; **Value** holds its path as a **String**.
- `vbAsyncTypeByteArray` (2) --- the data is being delivered as a **Byte** array.

### Example

This example checks **AsyncType** in the completion event and assigns the result to the appropriate property.

```tb
Private Sub UserControl_AsyncReadComplete(AsyncProp As AsyncProperty)
    If AsyncProp.PropertyName = "Picture" Then
        If AsyncProp.AsyncType = vbAsyncTypePicture Then
            Set UserControl.Picture = AsyncProp.Value
        End If
    End If
End Sub
```

### See Also

- [Value](Value) property
- [PropertyName](PropertyName) property
- [Target](Target) property
