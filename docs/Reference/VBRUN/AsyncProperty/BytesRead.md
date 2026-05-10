---
title: BytesRead
parent: AsyncProperty Module
permalink: /tB/Packages/VBRUN/AsyncProperty/BytesRead
---
# BytesRead
{: .no_toc }

Returns the number of bytes that have been read so far, as a **Long**. Read-only.

Syntax: *object*.**BytesRead**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value accumulates across successive **AsyncReadProgress** notifications and reaches its final total by the time **AsyncReadComplete** fires. When [**BytesMax**](BytesMax) is non-zero, the ratio `BytesRead / BytesMax` gives the fraction of the read that has completed.

### See Also

- [BytesMax](BytesMax) property
- [Status](Status) property
- [StatusCode](StatusCode) property
