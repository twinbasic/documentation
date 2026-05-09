---
title: TextAlign
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/TextAlign
---
# TextAlign
{: .no_toc }

Returns the container's preferred text alignment, as an **Integer**. Read-only.

Syntax: *object*.**TextAlign**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

A control that displays text and does not have its own alignment explicitly set should align its text according to this hint. The value follows the standard OLE control alignment enumeration:

| Value | Meaning                                                |
|-------|--------------------------------------------------------|
| 0     | General — numeric values right-aligned, text left-aligned |
| 1     | Left-aligned                                           |
| 2     | Centred                                                |
| 3     | Right-aligned                                          |
| 4     | Fill                                                   |

### See Also

- [Font](Font) property
- [RightToLeft](RightToLeft) property
- [ScaleUnits](ScaleUnits) property
