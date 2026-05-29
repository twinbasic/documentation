---
title: StatusCode
parent: AsyncProperty
permalink: /tB/Packages/VBRUN/AsyncProperty/StatusCode
---
# StatusCode
{: .no_toc }

Returns the current state of the read, as an **AsyncStatusCodeConstants** value. Read-only.

Syntax: *object*.**StatusCode**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value identifies the step the read is currently on --- `vbAsyncStatusCodeFindingResource`, `vbAsyncStatusCodeConnecting`, `vbAsyncStatusCodeBeginDownloadData`, `vbAsyncStatusCodeEndDownloadData`, and so on. `vbAsyncStatusCodeError` (0) indicates that the read failed; the [**Status**](Status) property contains the matching human-readable description.

### Example

This example checks **StatusCode** during a download and reports an error when the read fails.

```tb
Private Sub UserControl_AsyncReadProgress(AsyncProp As AsyncProperty)
    If AsyncProp.StatusCode = vbAsyncStatusCodeError Then
        MsgBox "Download failed: " & AsyncProp.Status
    End If
End Sub
```

### See Also

- [Status](Status) property
- [BytesRead](BytesRead) property
- [BytesMax](BytesMax) property
