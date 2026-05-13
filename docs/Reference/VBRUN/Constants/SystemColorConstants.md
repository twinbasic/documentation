---
title: SystemColorConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/SystemColorConstants
---
# SystemColorConstants
{: .no_toc }

Reference values for system palette entries — the colours the user has chosen for various standard parts of the Windows UI. Values have the high bit set so that the runtime can distinguish them from RGB colours; pass them through [**TranslateColor**](../../../Modules/Information/TranslateColor) to obtain a plain RGB value.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbScrollBars**{: #vbScrollBars } | &H80000000 | Scroll-bar colour. |
| **vbDesktop**{: #vbDesktop } | &H80000001 | Desktop colour. |
| **vbActiveTitleBar**{: #vbActiveTitleBar } | &H80000002 | Active window's title-bar colour. |
| **vbInactiveTitleBar**{: #vbInactiveTitleBar } | &H80000003 | Inactive window's title-bar colour. |
| **vbMenuBar**{: #vbMenuBar } | &H80000004 | Menu-bar background. |
| **vbWindowBackground**{: #vbWindowBackground } | &H80000005 | Window background (typically white in the classic palette). |
| **vbWindowFrame**{: #vbWindowFrame } | &H80000006 | Window frame. |
| **vbMenuText**{: #vbMenuText } | &H80000007 | Menu text colour. |
| **vbWindowText**{: #vbWindowText } | &H80000008 | Window text colour. |
| **vbTitleBarText**{: #vbTitleBarText } | &H80000009 | Active window's title-bar text. |
| **vbActiveTitleBarText**{: #vbActiveTitleBarText } | &H80000009 | Same as **vbTitleBarText**. |
| **vbActiveBorder**{: #vbActiveBorder } | &H8000000A | Active window's border colour. |
| **vbInactiveBorder**{: #vbInactiveBorder } | &H8000000B | Inactive window's border colour. |
| **vbApplicationWorkspace**{: #vbApplicationWorkspace } | &H8000000C | Application workspace (MDI parent background). |
| **vbHighlight**{: #vbHighlight } | &H8000000D | Highlighted item background (selection colour). |
| **vbHighlightText**{: #vbHighlightText } | &H8000000E | Highlighted item text. |
| **vbButtonFace**{: #vbButtonFace } | &H8000000F | Button face. |
| **vb3DFace**{: #vb3DFace } | &H8000000F | Same as **vbButtonFace**. |
| **vbButtonShadow**{: #vbButtonShadow } | &H80000010 | Button shadow (the shaded edge). |
| **vb3Dshadow**{: #vb3Dshadow } | &H80000010 | Same as **vbButtonShadow**. |
| **vbGrayText**{: #vbGrayText } | &H80000011 | Disabled (grayed) text. |
| **vbButtonText**{: #vbButtonText } | &H80000012 | Button text. |
| **vbInactiveCaptionText**{: #vbInactiveCaptionText } | &H80000013 | Inactive window's title-bar text. |
| **vbInactiveTitleBarText**{: #vbInactiveTitleBarText } | &H80000013 | Same as **vbInactiveCaptionText**. |
| **vb3DHighlight**{: #vb3DHighlight } | &H80000014 | 3-D highlight (the bright edge). |
| **vb3DDKShadow**{: #vb3DDKShadow } | &H80000015 | 3-D dark shadow. |
| **vb3DLight**{: #vb3DLight } | &H80000016 | 3-D light edge. |
| **vbInfoText**{: #vbInfoText } | &H80000017 | Tool-tip text colour. |
| **vbInfoBackground**{: #vbInfoBackground } | &H80000018 | Tool-tip background colour. |
| **vbHotTrackText**{: #vbHotTrackText } | &H8000001A | Hot-tracked item text. |
| **vbActiveTitleBarGradient**{: #vbActiveTitleBarGradient } | &H8000001B | Active title-bar gradient end colour. |
| **vbInactiveTitleBarGradient**{: #vbInactiveTitleBarGradient } | &H8000001C | Inactive title-bar gradient end colour. |
| **vbMenuHighlight**{: #vbMenuHighlight } | &H8000001D | Menu-item highlight (hover) colour. |
| **vbMenuBarFlat**{: #vbMenuBarFlat } | &H8000001E | Flat-style menu-bar background. |
