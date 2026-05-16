---
title: Target
parent: AsyncProperty
permalink: /tB/Packages/VBRUN/AsyncProperty/Target
---
# Target
{: .no_toc }

Returns the URL or file path being read, as a **String**. Read-only.

Syntax: *object*.**Target**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value is the *Target* argument that was passed to **UserControl.AsyncRead** when the read was started --- typically an absolute or relative URL, but local file paths are also accepted. It is the location the data is being fetched from, and remains the same across every **AsyncReadProgress** notification and the final **AsyncReadComplete** event for that read.

### See Also

- [PropertyName](PropertyName) property
- [Value](Value) property
- [AsyncType](AsyncType) property
