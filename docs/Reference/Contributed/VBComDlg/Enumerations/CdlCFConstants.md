---
title: CdlCFConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlCFConstants
---

# CdlCFConstants enumeration
{: .no_toc }

Options of the Font dialog, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `CF_` constants of the `CHOOSEFONT` structure.

The class always adds the Windows flag that makes the dialog start from the font properties (`CF_INITTOLOGFONTSTRUCT`), and, when the [**HookEvents**](../CommonDialog#hookevents) property is **True**, the one that switches on its hook procedure (`CF_ENABLEHOOK`). It removes both from **Flags** when the dialog closes, so they are not members. The dialog returns the `CdlCFNo...Sel` flags to say which parts the user did not select; [**ShowFont**](../CommonDialog#showfont) then leaves the matching property as it was.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlCFScreenFonts**{: #CdlCFScreenFonts } | `&H1` | Lists the fonts that the screen supports. |
| **CdlCFPrinterFonts**{: #CdlCFPrinterFonts } | `&H2` | Lists the fonts that a printer supports. |
| **CdlCFHelpButton**{: #CdlCFHelpButton } | `&H4` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event, but only when the dialog has an owner window. |
| **CdlCFEffects**{: #CdlCFEffects } | `&H100` | Shows the **Strikeout** and **Underline** check boxes and the color list. Only with this flag does the class update [**FontStrikethru**](../CommonDialog#fontstrikethru), [**FontUnderline**](../CommonDialog#fontunderline) and [**Color**](../CommonDialog#color). |
| **CdlCFApply**{: #CdlCFApply } | `&H200` | Shows an **Apply** button. A click raises the [**FontApply**](../CommonDialog#fontapply) event, which needs [**HookEvents**](../CommonDialog#hookevents) **True**. |
| **CdlCFScriptsOnly**{: #CdlCFScriptsOnly } | `&H400` | Lists the fonts of the non-OEM character sets, the Symbol set and the ANSI set. |
| **CdlCFNoVectorFonts**{: #CdlCFNoVectorFonts } | `&H800` | Does not allow vector fonts. |
| **CdlCFLimitSize**{: #CdlCFLimitSize } | `&H2000` | Limits the sizes to the range from [**Min**](../CommonDialog#min) to [**Max**](../CommonDialog#max) points. Without this flag the dialog ignores both properties. |
| **CdlCFFixedPitchOnly**{: #CdlCFFixedPitchOnly } | `&H4000` | Lists only fixed-pitch (monospaced) fonts. |
| **CdlCFForceFontExist**{: #CdlCFForceFontExist } | `&H10000` | The dialog shows an error message when the user enters a font or a style that does not exist. |
| **CdlCFScalableOnly**{: #CdlCFScalableOnly } | `&H20000` | Lists only scalable fonts, which include vector, TrueType and OpenType fonts. |
| **CdlCFTTOnly**{: #CdlCFTTOnly } | `&H40000` | Lists only TrueType fonts. |
| **CdlCFNoFaceSel**{: #CdlCFNoFaceSel } | `&H80000` | No font name is selected when the dialog opens. The dialog returns the flag when the user chose no name, and the class then leaves [**FontName**](../CommonDialog#fontname) unchanged. |
| **CdlCFNoStyleSel**{: #CdlCFNoStyleSel } | `&H100000` | No style is selected when the dialog opens. The dialog returns the flag when the user chose no style, and the class then leaves [**FontWeight**](../CommonDialog#fontweight) and [**FontItalic**](../CommonDialog#fontitalic) unchanged. |
| **CdlCFNoSizeSel**{: #CdlCFNoSizeSel } | `&H200000` | No size is selected when the dialog opens. The dialog returns the flag when the user chose no size, and the class then leaves [**FontSize**](../CommonDialog#fontsize) unchanged. |
| **CdlCFSelectScript**{: #CdlCFSelectScript } | `&H400000` | Lists only the fonts of the character set in [**FontCharset**](../CommonDialog#fontcharset). The user cannot change the character set in the **Script** box. |
| **CdlCFNoScriptSel**{: #CdlCFNoScriptSel } | `&H800000` | Disables the **Script** box. The dialog returns the flag when the user chose no character set, and the class then leaves [**FontCharset**](../CommonDialog#fontcharset) unchanged. |
| **CdlCFNoVertFonts**{: #CdlCFNoVertFonts } | `&H1000000` | Does not list the vertical fonts, those with a name that starts with `@`. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowFont**](../CommonDialog#showfont)); the *Flags* parameter of the [**FontApply**](../CommonDialog#fontapply) event

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
