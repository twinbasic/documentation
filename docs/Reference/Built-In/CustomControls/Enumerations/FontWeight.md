---
title: FontWeight
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/FontWeight
---
# FontWeight
{: .no_toc }

The weight of a font face, on the standard 100 -- 900 scale used by OpenType's `wght` axis and by CSS's `font-weight`. Assigned to [**FontStyle.Weight**](../Styles/TextRendering#weight). A [**FontStyle**](../Styles/TextRendering#fontstyle-class) has no font name, so the face is the package's choice.

<!-- test: bug waynes-fontweight-three-steps -->
> [!NOTE] BETA 1042
> The text is drawn in Segoe UI, in three weights only: 100 to 500 alike, in its regular face; 600 in Segoe UI Semibold; and 700 to 900 alike, in Segoe UI Bold. So **tbThin**, **tbExtraLight**, **tbLight** and **tbMedium** draw as **tbNormal**, and **tbExtraBold** and **tbHeavy** as **tbBold**, though Windows has Segoe UI Light and Black.

| Constant | Value | Description |
|----------|-------|-------------|
| **tbThin**{: #tbThin } | 100 | The thinnest weight (also called Hairline). |
| **tbExtraLight**{: #tbExtraLight } | 200 | Also known as Ultra Light. |
| **tbLight**{: #tbLight } | 300 | A noticeably thinner stroke than the regular weight. |
| **tbNormal**{: #tbNormal } | 400 | The default weight. Also known as Regular. Newly-constructed [**FontStyle**](../Styles/TextRendering) objects start here. |
| **tbMedium**{: #tbMedium } | 500 | Slightly heavier than **tbNormal**. |
| **tbSemiBold**{: #tbSemiBold } | 600 | Heavier still; also known as Demi Bold. |
| **tbBold**{: #tbBold } | 700 | The standard bold weight. |
| **tbExtraBold**{: #tbExtraBold } | 800 | Also known as Ultra Bold. |
| **tbHeavy**{: #tbHeavy } | 900 | The heaviest weight. Also known as Black. |

**tbNormal** is also a member of [**WindowState**](WindowState) and [**Customtate**](Customtate), so written alone it is ambiguous (TB5073), even where a **FontWeight** is expected. Qualify it with the enumeration's name:

```tb check_build
Dim weight As FontWeight = FontWeight.tbNormal
```
