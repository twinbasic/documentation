---
title: CdlCCConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlCCConstants
---

# CdlCCConstants enumeration
{: .no_toc }

Options of the Color dialog, combined with **Or** in the [**Flags**](../CommonDialog#flags) property.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `CC_` constants of the `CHOOSECOLOR` structure.

When the [**HookEvents**](../CommonDialog#hookevents) property is **True**, the class adds the Windows flag that switches on its hook procedure (`CC_ENABLEHOOK`) and removes it from **Flags** again when the dialog closes, so it is not a member.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlCCRGBInit**{: #CdlCCRGBInit } | `&H1` | The dialog opens with the [**Color**](../CommonDialog#color) property as the selected color. Without this flag the dialog ignores **Color** when it opens. |
| **CdlCCFullOpen**{: #CdlCCFullOpen } | `&H2` | The dialog opens with the part for defining custom colors already shown. |
| **CdlCCPreventFullOpen**{: #CdlCCPreventFullOpen } | `&H4` | Disables the **Define Custom Colors** button, so the user cannot open the part for custom colors. |
| **CdlCCHelpButton**{: #CdlCCHelpButton } | `&H8` | Shows a Help button. A click raises the [**Help**](../CommonDialog#help) event, but only when the dialog has an owner window. |
| **CdlCCSolidColor**{: #CdlCCSolidColor } | `&H80` | The set of basic colors shows only solid colors. |
| **CdlCCAnyColor**{: #CdlCCAnyColor } | `&H100` | The set of basic colors shows all the colors that are available. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**Flags**](../CommonDialog#flags) (for [**ShowColor**](../CommonDialog#showcolor))

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
