---
title: RightToLeft
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/RightToLeft
---
# RightToLeft
{: .no_toc }

Returns whether the container is laid out for a right-to-left language, as a **Boolean**. Read-only.

Syntax: *object*.**RightToLeft**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The property is **True** when the host is rendering its UI for a right-to-left language such as Arabic or Hebrew, and **False** for left-to-right languages. A control that displays text or directional adornments (scrollbars, tree expanders, alignment defaults) should mirror its layout when this is **True** so that it reads naturally inside an RTL container.

### See Also

- [LocaleID](LocaleID) property
- [TextAlign](TextAlign) property
