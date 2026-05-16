---
title: PropertyName
parent: AsyncProperty
permalink: /tB/Packages/VBRUN/AsyncProperty/PropertyName
---
# PropertyName
{: .no_toc }

Returns the name of the property the read is being performed for, as a **String**. Read-only.

Syntax: *object*.**PropertyName**

*object*
: *required* An object expression that evaluates to an **AsyncProperty** object.

The value is the *PropertyName* argument that was passed to **UserControl.AsyncRead** when the read was started. A user control can have several reads pending at once, so an event handler typically uses **PropertyName** in a **Select Case** to decide what to do with [**Value**](Value) when the read completes --- for example, which property of the control to assign the result to.

### See Also

- [Target](Target) property
- [Value](Value) property
- [AsyncType](AsyncType) property
