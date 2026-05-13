---
title: BytesMax
parent: AsyncProperty Module
permalink: /tB/Packages/VBRUN/AsyncProperty/BytesMax
---
# BytesMax
{: .no_toc }

Returns the total number of bytes expected for the read, as a **Long**. Read-only.

Syntax: *object*.**BytesMax**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

Used together with [**BytesRead**](BytesRead) to drive a progress indicator during an **AsyncReadProgress** event. **BytesMax** can be zero when the server has not advertised a content length — for example with an HTTP chunked transfer — in which case the total size is not known until the read completes and a determinate progress bar cannot be shown.

### See Also

- [BytesRead](BytesRead) property
- [Status](Status) property
- [StatusCode](StatusCode) property
