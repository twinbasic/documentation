---
title: KeyCodeConstants
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/KeyCodeConstants
---
# KeyCodeConstants
{: .no_toc }

Virtual-key codes reported in the *KeyCode* argument of **KeyDown** and **KeyUp** events. The values match the underlying Windows virtual-key codes (`VK_*`).

> [!NOTE]
> In classic VBA, `KeyCodeConstants` is a module of standalone constants; in VB6 and twinBASIC it is an enumeration.

## Mouse buttons and modifiers

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKeyLButton**{: #vbKeyLButton } | 1 | Left mouse button. |
| **vbKeyRButton**{: #vbKeyRButton } | 2 | Right mouse button. |
| **vbKeyMButton**{: #vbKeyMButton } | 4 | Middle mouse button. |
| **vbKeyShift**{: #vbKeyShift } | 16 | **Shift**. |
| **vbKeyControl**{: #vbKeyControl } | 17 | **Ctrl**. |
| **vbKeyMenu**{: #vbKeyMenu } | 18 | **Alt**. |

## Editing and navigation

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKeyCancel**{: #vbKeyCancel } | 3 | **Ctrl**+**Break**. |
| **vbKeyBack**{: #vbKeyBack } | 8 | **Backspace**. |
| **vbKeyTab**{: #vbKeyTab } | 9 | **Tab**. |
| **vbKeyClear**{: #vbKeyClear } | 12 | **Clear** (numeric pad **5** without **Num Lock**). |
| **vbKeyReturn**{: #vbKeyReturn } | 13 | **Enter**. |
| **vbKeyPause**{: #vbKeyPause } | 19 | **Pause**. |
| **vbKeyCapital**{: #vbKeyCapital } | 20 | **Caps Lock**. |
| **vbKeyEscape**{: #vbKeyEscape } | 27 | **Esc**. |
| **vbKeySpace**{: #vbKeySpace } | 32 | **Space**. |
| **vbKeyPageUp**{: #vbKeyPageUp } | 33 | **Page Up**. |
| **vbKeyPageDown**{: #vbKeyPageDown } | 34 | **Page Down**. |
| **vbKeyEnd**{: #vbKeyEnd } | 35 | **End**. |
| **vbKeyHome**{: #vbKeyHome } | 36 | **Home**. |
| **vbKeyLeft**{: #vbKeyLeft } | 37 | **Left arrow**. |
| **vbKeyUp**{: #vbKeyUp } | 38 | **Up arrow**. |
| **vbKeyRight**{: #vbKeyRight } | 39 | **Right arrow**. |
| **vbKeyDown**{: #vbKeyDown } | 40 | **Down arrow**. |
| **vbKeySelect**{: #vbKeySelect } | 41 | **Select**. |
| **vbKeyPrint**{: #vbKeyPrint } | 42 | **Print**. |
| **vbKeyExecute**{: #vbKeyExecute } | 43 | **Execute**. |
| **vbKeySnapshot**{: #vbKeySnapshot } | 44 | **Print Screen**. |
| **vbKeyInsert**{: #vbKeyInsert } | 45 | **Insert**. |
| **vbKeyDelete**{: #vbKeyDelete } | 46 | **Delete**. |
| **vbKeyHelp**{: #vbKeyHelp } | 47 | **Help**. |
| **vbKeyNumlock**{: #vbKeyNumlock } | 144 | **Num Lock**. |
| **vbKeyScrollLock**{: #vbKeyScrollLock } | 145 | **Scroll Lock**. |

## Letter keys

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKeyA**{: #vbKeyA } – **vbKeyZ**{: #vbKeyZ } | 65 – 90 | The letters **A** through **Z**. |

## Number keys

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKey0**{: #vbKey0 } – **vbKey9**{: #vbKey9 } | 48 – 57 | The digits **0** through **9** on the main keyboard. |

## Numeric keypad

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKeyNumpad0**{: #vbKeyNumpad0 } – **vbKeyNumpad9**{: #vbKeyNumpad9 } | 96 – 105 | The digits **0** through **9** on the numeric keypad. |
| **vbKeyMultiply**{: #vbKeyMultiply } | 106 | **\*** on the numeric keypad. |
| **vbKeyAdd**{: #vbKeyAdd } | 107 | **+** on the numeric keypad. |
| **vbKeySeparator**{: #vbKeySeparator } | 108 | Numeric-keypad separator. |
| **vbKeySubtract**{: #vbKeySubtract } | 109 | **-** on the numeric keypad. |
| **vbKeyDecimal**{: #vbKeyDecimal } | 110 | **.** on the numeric keypad. |
| **vbKeyDivide**{: #vbKeyDivide } | 111 | **/** on the numeric keypad. |

## Function keys

| Constant | Value | Description |
|----------|-------|-------------|
| **vbKeyF1**{: #vbKeyF1 } – **vbKeyF16**{: #vbKeyF16 } | 112 – 127 | The function keys **F1** through **F16**. |
