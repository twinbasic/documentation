---
title: VbMsgBoxStyle
parent: Constants Module
permalink: /tB/Modules/Constants/VbMsgBoxStyle
redirect_from:
- /tB/Core/VbMsgBoxStyle
- /tB/Core/vbApplicationModal
- /tB/Core/vbDefaultButton1
- /tB/Core/vbOKOnly
- /tB/Core/vbOKCancel
- /tB/Core/vbAbortRetryIgnore
- /tB/Core/vbYesNoCancel
- /tB/Core/vbYesNo
- /tB/Core/vbRetryCancel
- /tB/Core/vbCancelTryAgainContinue
- /tB/Core/vbCritical
- /tB/Core/vbQuestion
- /tB/Core/vbInformation
- /tB/Core/vbExclamation
- /tB/Core/vbDefaultButton2
- /tB/Core/vbDefaultButton3
- /tB/Core/vbDefaultButton4
- /tB/Core/vbSystemModal
- /tB/Core/vbMsgBoxHelpButton
- /tB/Core/vbMsgBoxSetForeground
- /tB/Core/vbMsgBoxRight
- /tB/Core/vbMsgBoxRtlReading
vba_attribution: true
---
# VbMsgBoxStyle
{: .no_toc }

Buttons, icons, default-button, modality, and other behaviour flags for the **MsgBox** dialog. Combine values from different groups with **Or** (or addition) to specify the desired combination --- for example, `vbYesNo Or vbCritical Or vbDefaultButton2`.

### Buttons

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOKOnly**{: #vbOKOnly } | 0 | **OK** button only (default). |
| **vbOKCancel**{: #vbOKCancel } | 1 | **OK** and **Cancel** buttons. |
| **vbAbortRetryIgnore**{: #vbAbortRetryIgnore } | 2 | **Abort**, **Retry**, and **Ignore** buttons. |
| **vbYesNoCancel**{: #vbYesNoCancel } | 3 | **Yes**, **No**, and **Cancel** buttons. |
| **vbYesNo**{: #vbYesNo } | 4 | **Yes** and **No** buttons. |
| **vbRetryCancel**{: #vbRetryCancel } | 5 | **Retry** and **Cancel** buttons. |
| **vbCancelTryAgainContinue**{: #vbCancelTryAgainContinue } | 6 | **Cancel**, **Try Again**, and **Continue** buttons. |

### Icon

| Constant | Value | Description |
|----------|-------|-------------|
| **vbCritical**{: #vbCritical } | 16 | Critical message icon. |
| **vbQuestion**{: #vbQuestion } | 32 | Warning query icon. |
| **vbExclamation**{: #vbExclamation } | 48 | Warning message icon. |
| **vbInformation**{: #vbInformation } | 64 | Information message icon. |

### Default button

| Constant | Value | Description |
|----------|-------|-------------|
| **vbDefaultButton1**{: #vbDefaultButton1 } | 0 | First button is default (default). |
| **vbDefaultButton2**{: #vbDefaultButton2 } | 256 | Second button is default. |
| **vbDefaultButton3**{: #vbDefaultButton3 } | 512 | Third button is default. |
| **vbDefaultButton4**{: #vbDefaultButton4 } | 768 | Fourth button is default. |

### Modality

| Constant | Value | Description |
|----------|-------|-------------|
| **vbApplicationModal**{: #vbApplicationModal } | 0 | Application-modal message box (default). |
| **vbSystemModal**{: #vbSystemModal } | 4096 | System-modal message box. |

### Options

| Constant | Value | Description |
|----------|-------|-------------|
| **vbMsgBoxHelpButton**{: #vbMsgBoxHelpButton } | 16384 | Adds a Help button to the message box. |
| **vbMsgBoxSetForeground**{: #vbMsgBoxSetForeground } | 65536 | Specifies the message box window as the foreground window. |
| **vbMsgBoxRight**{: #vbMsgBoxRight } | 524288 | Text is right-aligned. |
| **vbMsgBoxRtlReading**{: #vbMsgBoxRtlReading } | 1048576 | Text is displayed right-to-left, for Hebrew and Arabic systems. |

### See Also

- [VbMsgBoxResult](VbMsgBoxResult)
