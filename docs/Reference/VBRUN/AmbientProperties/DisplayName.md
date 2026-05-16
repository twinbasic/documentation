---
title: DisplayName
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/DisplayName
---
# DisplayName
{: .no_toc }

Returns the name the container has assigned to the control, as a **String**. Read-only.

Syntax: *object*.**DisplayName**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The host typically returns the name by which the user identifies the control --- for example `"Form1!Command1"` in a designer, or whatever label has been chosen at run time. A control can include this string in error messages, log entries, or property browsers so that the user can tell which instance the message refers to.

### See Also

- [LocaleID](LocaleID) property
- [UserMode](UserMode) property
