---
title: Font
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/Font
---
# Font
{: .no_toc }

Returns the font the container would like its embedded controls to use by default, as an **stdole.IFontDisp**. Read-only.

Syntax: *object*.**Font**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

A control that does not have its own font explicitly set should display text using this font, so that its captions and labels match the typography of the surrounding container. The returned **IFontDisp** exposes properties such as **Name**, **Size**, **Bold**, **Italic**, and **Underline**.

### See Also

- [BackColor](BackColor) property
- [ForeColor](ForeColor) property
- [TextAlign](TextAlign) property
