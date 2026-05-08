---
title: IMEStatus
parent: Information Module
permalink: /tB/Modules/Information/IMEStatus
redirect_from:
-  /tB/Core/IMEStatus
---
# IMEStatus
{: .no_toc }

Returns a [**VbIMEStatus**](../Constants/VbIMEStatus) value specifying the current Input Method Editor (IME) mode of Microsoft Windows; available in East Asian versions only.

Syntax: **IMEStatus** [ **()** ]

The return value is one of the [**VbIMEStatus**](../Constants/VbIMEStatus) constants. Locales differ in which constants can be returned:

- **Japanese**: any of `vbIMEModeNoControl`, `vbIMEModeOn`, `vbIMEModeOff`, `vbIMEModeDisable`, `vbIMEModeHiragana`, `vbIMEModeKatakana`, `vbIMEModeKatakanaHalf`, `vbIMEModeAlphaFull`, `vbIMEModeAlpha`.
- **Korean**: `vbIMEModeNoControl`, `vbIMEModeAlphaFull`, `vbIMEModeAlpha`, `vbIMEModeHangulFull`, `vbIMEModeHangul`.
- **Chinese**: `vbIMEModeNoControl`, `vbIMEModeOn`, `vbIMEModeOff`.

### See Also

- [VbIMEStatus](../Constants/VbIMEStatus) enumeration

{% include VBA-Attribution.md %}
