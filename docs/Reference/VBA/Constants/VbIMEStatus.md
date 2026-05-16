---
title: VbIMEStatus
parent: Constants Module
grand_parent: VBA Package
permalink: /tB/Modules/Constants/VbIMEStatus
redirect_from:
- /tB/Core/VbIMEStatus
- /tB/Core/vbIMENoOp
- /tB/Core/vbIMEModeNoControl
- /tB/Core/vbIMEOn
- /tB/Core/vbIMEModeOn
- /tB/Core/vbIMEOff
- /tB/Core/vbIMEModeOff
- /tB/Core/vbIMEDisable
- /tB/Core/vbIMEModeDisable
- /tB/Core/vbIMEHiragana
- /tB/Core/vbIMEModeHiragana
- /tB/Core/vbIMEKatakanaDbl
- /tB/Core/vbIMEModeKatakana
- /tB/Core/vbIMEKatakanaSng
- /tB/Core/vbIMEModeKatakanaHalf
- /tB/Core/vbIMEAlphaDbl
- /tB/Core/vbIMEModeAlphaFull
- /tB/Core/vbIMEAlphaSng
- /tB/Core/vbIMEModeAlpha
- /tB/Core/vbIMEModeHangulFull
- /tB/Core/vbIMEModeHangul
vba_attribution: true
---
# VbIMEStatus
{: .no_toc }

Input Method Editor mode constants. Each value is exposed under both the legacy `vbIME...` name and the newer `vbIMEMode...` name; the two names with the same value are interchangeable.

The constants applicable to a given mode depend on the system locale. Values 4--8 apply to Japanese locales, and values 9 and 10 apply to Korean locales.

| Constants | Value | Description |
|-----------|-------|-------------|
| **vbIMENoOp**{: #vbIMENoOp } / **vbIMEModeNoControl**{: #vbIMEModeNoControl } | 0 | Don't control the IME (default). |
| **vbIMEOn**{: #vbIMEOn } / **vbIMEModeOn**{: #vbIMEModeOn } | 1 | IME on. |
| **vbIMEOff**{: #vbIMEOff } / **vbIMEModeOff**{: #vbIMEModeOff } | 2 | IME off. |
| **vbIMEDisable**{: #vbIMEDisable } / **vbIMEModeDisable**{: #vbIMEModeDisable } | 3 | IME disabled. |
| **vbIMEHiragana**{: #vbIMEHiragana } / **vbIMEModeHiragana**{: #vbIMEModeHiragana } | 4 | Full-width Hiragana mode. |
| **vbIMEKatakanaDbl**{: #vbIMEKatakanaDbl } / **vbIMEModeKatakana**{: #vbIMEModeKatakana } | 5 | Full-width Katakana mode. |
| **vbIMEKatakanaSng**{: #vbIMEKatakanaSng } / **vbIMEModeKatakanaHalf**{: #vbIMEModeKatakanaHalf } | 6 | Half-width Katakana mode. |
| **vbIMEAlphaDbl**{: #vbIMEAlphaDbl } / **vbIMEModeAlphaFull**{: #vbIMEModeAlphaFull } | 7 | Full-width Alphanumeric mode. |
| **vbIMEAlphaSng**{: #vbIMEAlphaSng } / **vbIMEModeAlpha**{: #vbIMEModeAlpha } | 8 | Half-width Alphanumeric mode. |
| **vbIMEModeHangulFull**{: #vbIMEModeHangulFull } | 9 | Full-width Hangul mode. |
| **vbIMEModeHangul**{: #vbIMEModeHangul } | 10 | Half-width Hangul mode. |
