---
title: Status
parent: AsyncProperty Module
permalink: /tB/Packages/VBRUN/AsyncProperty/Status
---
# Status
{: .no_toc }

Returns a human-readable description of the current state of the read, as a **String**. Read-only.

Syntax: *object*.**Status**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value is a short message such as `"Finding resource"`, `"Connecting"`, or `"Receiving response"`, suitable for display in a status bar or tooltip while the read is in progress. For programmatic logic, examine [**StatusCode**](StatusCode) instead --- its values are stable, whereas **Status** is intended for human consumption and may be localised.

### See Also

- [StatusCode](StatusCode) property
- [BytesRead](BytesRead) property
- [BytesMax](BytesMax) property
