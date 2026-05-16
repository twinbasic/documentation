---
title: ForeColor
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/ForeColor
---
# ForeColor
{: .no_toc }

Returns the foreground colour the container would like its embedded controls to use by default, as an **stdole.OLE_COLOR**. Read-only.

Syntax: *object*.**ForeColor**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

A control that does not have its own foreground colour explicitly set should draw its text and other foreground elements using this colour, so that it remains legible against the container's [**BackColor**](BackColor). The value is an **OLE_COLOR**: an RGB value, a system-colour reference, or a palette-index reference. Pass it through [**TranslateColor**](../../../Modules/Information/TranslateColor) to obtain a plain RGB value if needed.

### See Also

- [BackColor](BackColor) property
- [Font](Font) property
- [Palette](Palette) property
