---
title: FontWeight
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/FontWeight
---
# FontWeight
{: .no_toc }

The weight of a font face, on the standard 100 – 900 scale used by OpenType's `wght` axis and by CSS's `font-weight`. Carried by [**FontStyle.Weight**](../Styles/TextRendering#weight); availability of each weight depends on which faces are installed for the chosen font family.

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
