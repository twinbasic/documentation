---
title: VbStrConv
parent: Constants Module
grand_parent: VBA Package
permalink: /tB/Modules/Constants/VbStrConv
redirect_from:
- /tB/Core/VbStrConv
- /tB/Core/vbUpperCase
- /tB/Core/vbLowerCase
- /tB/Core/vbProperCase
- /tB/Core/vbWide
- /tB/Core/vbNarrow
- /tB/Core/vbKatakana
- /tB/Core/vbHiragana
- /tB/Core/vbUnicode
- /tB/Core/vbFromUnicode
- /tB/Core/vbUTF8
- /tB/Core/vbFromUTF8
vba_attribution: true
---
# VbStrConv
{: .no_toc }

Conversion type flags for the [**StrConv**](../Strings/StrConv) function. Compatible flags can be combined with **Or** to apply multiple conversions at once.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbUpperCase**{: #vbUpperCase } | 1 | Converts the string to uppercase characters. |
| **vbLowerCase**{: #vbLowerCase } | 2 | Converts the string to lowercase characters. |
| **vbProperCase**{: #vbProperCase } | 3 | Converts the first letter of every word in the string to uppercase. |
| **vbWide**{: #vbWide } | 4 | Converts narrow (single-byte) characters in the string to wide (double-byte) characters. East-Asia locales. |
| **vbNarrow**{: #vbNarrow } | 8 | Converts wide (double-byte) characters in the string to narrow (single-byte) characters. East-Asia locales. |
| **vbKatakana**{: #vbKatakana } | 16 | Converts Hiragana characters to Katakana. Japan only. |
| **vbHiragana**{: #vbHiragana } | 32 | Converts Katakana characters to Hiragana. Japan only. |
| **vbUnicode**{: #vbUnicode } | 64 | Converts the string to Unicode using the system default code page. |
| **vbFromUnicode**{: #vbFromUnicode } | 128 | Converts the string from Unicode to the system default code page. |
| **vbUTF8**{: #vbUTF8 } | 256 | Converts the string to UTF-8 (twinBASIC extension). |
| **vbFromUTF8**{: #vbFromUTF8 } | 512 | Converts the string from UTF-8 (twinBASIC extension). |

### See Also

- [StrConv](../Strings/StrConv) function
