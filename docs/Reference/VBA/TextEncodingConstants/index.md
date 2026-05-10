---
title: TextEncodingConstants Module
parent: VBA Package
permalink: /tB/Modules/TextEncodingConstants/
has_toc: false
---

# TextEncodingConstants module

The `Open` statement supports Unicode through the use of a new `Encoding` keyword and variable, and allows you to specify a wide range of encoding options in addition to standard Unicode options.

The **TextEncodingConstants** module provides the predefined identifier strings recognised by the **Encoding** clause of the **Open** statement:

```tb
Open "C:\MyFile.txt" For Input Encoding utf_8 As #1
```

The constants below name the well-known encodings; other system-supported encodings with similar identifier strings are also accepted at runtime.

The members are marked **[Hidden, Restricted]** — they are omitted from general IntelliSense, but the IDE surfaces them specifically after the **Encoding** keyword.

## Default and Unicode

| Constant | Value | Description |
|----------|-------|-------------|
| **default_system_ansi**{: #default_system_ansi } | `"default"` | The system default ANSI code page. |
| **utf_7**{: #utf_7 } | `"utf-7"` | UTF-7. |
| **utf_7_bom**{: #utf_7_bom } | `"utf-7 bom"` | UTF-7 with byte-order mark. |
| **utf_8**{: #utf_8 } | `"utf-8"` | UTF-8. |
| **utf_8_bom**{: #utf_8_bom } | `"utf-8 bom"` | UTF-8 with byte-order mark. |
| **utf_16**{: #utf_16 } | `"utf-16"` | UTF-16 (little-endian). |
| **utf_16_bom**{: #utf_16_bom } | `"utf-16 bom"` | UTF-16 with byte-order mark. |
| **us_ascii**{: #us_ascii } | `"us-ascii"` | 7-bit US-ASCII. |

## KOI8 (Cyrillic)

| Constant | Value | Description |
|----------|-------|-------------|
| **koi8_r**{: #koi8_r } | `"koi8_r"` | KOI8-R, Russian. |
| **koi8_u**{: #koi8_u } | `"koi8_u"` | KOI8-U, Ukrainian. |

## Big5

| Constant | Value | Description |
|----------|-------|-------------|
| **big5**{: #big5 } | `"big5"` | Big5, Traditional Chinese. |

## ISO 8859

| Constant | Value | Description |
|----------|-------|-------------|
| **iso_8859_1_latin1**{: #iso_8859_1_latin1 } | `"iso-8859-1"` | Latin-1, Western European. |
| **iso_8859_2_latin2**{: #iso_8859_2_latin2 } | `"iso-8859-2"` | Latin-2, Central European. |
| **iso_8859_3_latin3**{: #iso_8859_3_latin3 } | `"iso-8859-3"` | Latin-3, South European (Esperanto, Maltese). |
| **iso_8859_4_latin4**{: #iso_8859_4_latin4 } | `"iso-8859-4"` | Latin-4, North European. |
| **iso_8859_5_cyrillic**{: #iso_8859_5_cyrillic } | `"iso-8859-5"` | Cyrillic. |
| **iso_8859_6_arabic**{: #iso_8859_6_arabic } | `"iso-8859-6"` | Arabic. |
| **iso_8859_7_greek**{: #iso_8859_7_greek } | `"iso-8859-7"` | Greek. |
| **iso_8859_8_hebrew**{: #iso_8859_8_hebrew } | `"iso-8859-8"` | Hebrew. |
| **iso_8859_9_latin5_turkish**{: #iso_8859_9_latin5_turkish } | `"iso-8859-9"` | Latin-5, Turkish. |
| **iso_8859_10_latin6_nordic**{: #iso_8859_10_latin6_nordic } | `"iso-8859-10"` | Latin-6, Nordic. |
| **iso_8859_11_thai**{: #iso_8859_11_thai } | `"iso-8859-11"` | Thai. |
| **iso_8859_13_latin8_baltic**{: #iso_8859_13_latin8_baltic } | `"iso-8859-13"` | Latin-7, Baltic Rim. |
| **iso_8859_14_latin8_celtic**{: #iso_8859_14_latin8_celtic } | `"iso-8859-14"` | Latin-8, Celtic. |
| **iso_8859_15_latin9_euro**{: #iso_8859_15_latin9_euro } | `"iso-8859-15"` | Latin-9, Western European with euro sign. |
| **iso_8859_16_latin10_balkan**{: #iso_8859_16_latin10_balkan } | `"iso-8859-16"` | Latin-10, South-Eastern European. |

## Windows code pages

| Constant | Value | Description |
|----------|-------|-------------|
| **windows_1250_central_europe**{: #windows_1250_central_europe } | `"windows-1250"` | Central European. |
| **windows_1251_cyrillic**{: #windows_1251_cyrillic } | `"windows-1251"` | Cyrillic. |
| **windows_1252_western**{: #windows_1252_western } | `"windows-1252"` | Western European. |
| **windows_1253_greek**{: #windows_1253_greek } | `"windows-1253"` | Greek. |
| **windows_1254_turkish**{: #windows_1254_turkish } | `"windows-1254"` | Turkish. |
| **windows_1255_hebrew**{: #windows_1255_hebrew } | `"windows-1255"` | Hebrew. |
| **windows_1256_arabic**{: #windows_1256_arabic } | `"windows-1256"` | Arabic. |
| **windows_1257_baltic**{: #windows_1257_baltic } | `"windows-1257"` | Baltic. |
| **windows_1258_vietnamese**{: #windows_1258_vietnamese } | `"windows-1258"` | Vietnamese. |

## IBM/OEM code pages

| Constant | Value | Description |
|----------|-------|-------------|
| **ibm_850_western_europe**{: #ibm_850_western_europe } | `"850"` | OEM Multilingual Latin-1, Western European. |
| **ibm_852_central_and_eastern_europe**{: #ibm_852_central_and_eastern_europe } | `"852"` | OEM Latin-2, Central and Eastern European. |
| **ibm_855_cyrillic**{: #ibm_855_cyrillic } | `"855"` | OEM Cyrillic (primarily pre-Unicode Russian). |
| **ibm_856_hebrew**{: #ibm_856_hebrew } | `"856"` | Hebrew. |
| **ibm_857_turkish**{: #ibm_857_turkish } | `"857"` | OEM Turkish (Latin-5). |
| **ibm_858_western_europe**{: #ibm_858_western_europe } | `"858"` | OEM Multilingual Latin-1 with euro sign. |
| **ibm_860_portuguese**{: #ibm_860_portuguese } | `"860"` | Portuguese. |
| **ibm_861_icelandic**{: #ibm_861_icelandic } | `"861"` | Icelandic. |
| **ibm_862_hebrew**{: #ibm_862_hebrew } | `"862"` | Hebrew. |
| **ibm_863_canadian**{: #ibm_863_canadian } | `"863"` | French Canadian. |
| **ibm_865_danish**{: #ibm_865_danish } | `"865"` | Nordic (Danish, Norwegian). |
| **ibm_866_cyrillic**{: #ibm_866_cyrillic } | `"866"` | Russian. |
| **ibm_869_greek**{: #ibm_869_greek } | `"869"` | Modern Greek. |
| **ibm_932_japanese**{: #ibm_932_japanese } | `"932"` | Japanese (Shift-JIS, Microsoft variant). |
| **ibm_949_korean**{: #ibm_949_korean } | `"949"` | Korean (Unified Hangul Code). |

## See Also

- [File I/O encoding options](../../../Features/Standard-Library/File-IO)
