---
title: TranslateColor
parent: Information Module
permalink: /tB/Modules/Information/TranslateColor
---
# TranslateColor
{: .no_toc }

Translates an OLE colour value to a plain RGB colour, resolving any reference to the system palette in the process.

Syntax: **TranslateColor(** *ColorValue* [ **,** *hPalettePtr* ] **)**

*ColorValue*
: *required* A **Long** OLE colour value to translate.

*hPalettePtr*
: *optional* A **LongPtr** handle to a palette to use for translation. Defaults to **0**, which selects the default system palette.

The OLE colour format encodes either a literal RGB value or an index into the Windows system palette (such as `&H80000012`, the colour of button text). **TranslateColor** returns the corresponding plain RGB **Long**, suitable for passing to APIs and properties that expect a true colour value rather than a system-palette reference.

<!-- errors: generated from errors/VBA.Information.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | the high byte of *ColorValue* is not &H00, &H01, &H02 or &H80<br>*ColorValue* is a system colour (&H80000000 and up) with an index above 30 (&H1E) |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *ColorValue* is **Null** |

<!-- /errors -->

### Example

This example translates an OLE system colour to its current RGB value.

```tb check_build
Dim OleColor As Long
Dim RgbColor As Long
OleColor = &H80000012                 ' COLOR_BTNTEXT — the button text colour.
RgbColor = TranslateColor(OleColor)
```

### See Also

- [RGB](RGB), [RGBA](RGBA) functions
- [QBColor](QBColor) function
