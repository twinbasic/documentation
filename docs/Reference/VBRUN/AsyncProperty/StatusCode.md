---
title: StatusCode
parent: AsyncProperty Module
permalink: /tB/Packages/VBRUN/AsyncProperty/StatusCode
---
# StatusCode
{: .no_toc }

Returns the current state of the read, as an **AsyncStatusCodeConstants** value. Read-only.

Syntax: *object*.**StatusCode**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value identifies the step the read is currently on --- `vbAsyncStatusCodeFindingResource`, `vbAsyncStatusCodeConnecting`, `vbAsyncStatusCodeBeginDownloadData`, `vbAsyncStatusCodeEndDownloadData`, and so on. `vbAsyncStatusCodeError` (0) indicates that the read failed; the [**Status**](Status) property contains the matching human-readable description.

### See Also

- [Status](Status) property
- [BytesRead](BytesRead) property
- [BytesMax](BytesMax) property
