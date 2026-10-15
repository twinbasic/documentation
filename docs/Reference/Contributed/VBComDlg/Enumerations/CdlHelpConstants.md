---
title: CdlHelpConstants
parent: Enumerations
grand_parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/CdlHelpConstants
---

# CdlHelpConstants enumeration
{: .no_toc }

Commands for the WinHelp viewer, which [**ShowHelp**](../CommonDialog#showhelp) starts.

The enumeration is declared inside the [**CommonDialog**](../CommonDialog) class. Its members are used without a qualifier, or with the name of the enumeration. The values are those of the Windows `HELP_` constants of the `WinHelp` function, and the class passes the value of [**HelpCommand**](../CommonDialog#helpcommand) to that function unchanged.

The command decides which property supplies the extra data that `WinHelp` needs. The commands that need a topic number read [**HelpContext**](../CommonDialog#helpcontext), those that need a keyword or a macro read [**HelpKey**](../CommonDialog#helpkey), and the others use no extra data. [**HelpFile**](../CommonDialog#helpfile) names the help file for every command. The **HelpCommand** property accepts these members and 0, for which **ShowHelp** does nothing.

Two pairs of members have the same value, so the two names of a pair are interchangeable: the **Index** names are the older ones: **CdlHelpIndex** and **CdlHelpContents**, and **CdlHelpSetIndex** and **CdlHelpSetContents**.

| Member | Value | Description |
|:-------|:------|:------------|
| **CdlHelpContext**{: #CdlHelpContext } | `&H1` | Shows the topic with the number in [**HelpContext**](../CommonDialog#helpcontext). |
| **CdlHelpQuit**{: #CdlHelpQuit } | `&H2` | Closes the help file. |
| **CdlHelpIndex**{: #CdlHelpIndex } | `&H3` | Shows the contents topic of the help file. Has the same value as **CdlHelpContents**, of which it is the older name. |
| **CdlHelpContents**{: #CdlHelpContents } | `&H3` | Shows the contents topic of the help file. Has the same value as **CdlHelpIndex**. |
| **CdlHelpHelpOnHelp**{: #CdlHelpHelpOnHelp } | `&H4` | Shows the help on how to use the help viewer. |
| **CdlHelpSetIndex**{: #CdlHelpSetIndex } | `&H5` | Makes the topic with the number in [**HelpContext**](../CommonDialog#helpcontext) the contents topic of the help file. Has the same value as **CdlHelpSetContents**, of which it is the older name. |
| **CdlHelpSetContents**{: #CdlHelpSetContents } | `&H5` | Makes the topic with the number in [**HelpContext**](../CommonDialog#helpcontext) the contents topic of the help file. Has the same value as **CdlHelpSetIndex**. |
| **CdlHelpContextPopup**{: #CdlHelpContextPopup } | `&H8` | Shows the topic with the number in [**HelpContext**](../CommonDialog#helpcontext) in a pop-up window. |
| **CdlHelpForceFile**{: #CdlHelpForceFile } | `&H9` | Makes sure that the viewer shows the help file named in [**HelpFile**](../CommonDialog#helpfile). |
| **CdlHelpKey**{: #CdlHelpKey } | `&H101` | Shows the topic for the keyword in [**HelpKey**](../CommonDialog#helpkey). |
| **CdlHelpCommandHelp**{: #CdlHelpCommandHelp } | `&H102` | Runs the help macro in [**HelpKey**](../CommonDialog#helpkey). |
| **CdlHelpPartialKey**{: #CdlHelpPartialKey } | `&H105` | Shows the topic for the keyword in [**HelpKey**](../CommonDialog#helpkey), or a list of the topics that match it when there are several. |

## Used by

- [**CommonDialog**](../CommonDialog) class: [**HelpCommand**](../CommonDialog#helpcommand)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [CommonDialog](../CommonDialog) class
