---
title: Palette
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/Palette
---
# Palette
{: .no_toc }

Returns the colour palette the container would like its embedded controls to draw with, as an **stdole.IPictureDisp**. Read-only.

Syntax: *object*.**Palette**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The returned object is a picture whose attached palette identifies the colours the host expects to be available. A control rendering on a palette-managed display should use these colours to avoid unwanted palette flashing when its window receives the focus. On modern true-colour displays the palette is rarely meaningful, and most controls can ignore it.

### See Also

- [BackColor](BackColor) property
- [ForeColor](ForeColor) property
