---
title: TextOverflowMode
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/TextOverflowMode
---
# TextOverflowMode
{: .no_toc }

Controls how text that does not fit inside the available rectangle is truncated. Used by [**TextRendering.OverflowMode**](../Styles/TextRendering#overflowmode).

| Constant | Value | Description |
|----------|-------|-------------|
| **tbAllowPartialChars**{: #tbAllowPartialChars } | 0 | Truncate at the available width, allowing the final glyph to be clipped mid-character. |
| **tbDisallowPartialChars**{: #tbDisallowPartialChars } | 1 | Truncate at the last fully-visible character; no half-glyph at the edge. Used by [**WaynesTextBox**](../WaynesTextBox/) so the caret never falls between glyphs of a surrogate pair. |
| **tbAppendEllipsis**{: #tbAppendEllipsis } | 2 | Truncate at the last fully-visible character and append `…` if any characters were dropped. The default for newly-constructed [**TextRendering**](../Styles/TextRendering) objects. |
| **tbShrinkToFit**{: #tbShrinkToFit } | 3 | Reduce the rendered font size until the entire string fits without truncation. Used by [**WaynesTimer**](../WaynesTimer) so its design-time clock glyph scales with the control. |

The same caption, too long for its label, in each mode:

![Four labels of one width holding the same long caption: tbAllowPartialChars cuts the last letter in half at the edge, tbDisallowPartialChars stops at the last whole letter, tbAppendEllipsis ends the text with an ellipsis, and tbShrinkToFit draws the whole caption in a much smaller font](Images/TextOverflowMode.png){:width="469" height="273"}
