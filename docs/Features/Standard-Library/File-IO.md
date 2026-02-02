---
title: File I/O
parent: Standard Library
nav_order: 2
---

# Encoding Options for File I/O

The `Open` statement supports Unicode through the use of a new `Encoding` keyword and variable, and allows you to specify a wide range of encoding options in addition to standard Unicode options.

## Usage Example

```vb
Open "C:\MyFile.txt" For Input Encoding utf-8 As #1
```

## Supported Encodings

The full list of encoding options currently defined (and don't worry, these will come up in Intellisense) is:

- `default_system_ansi`
- `utf_7`, `utf_7_bom`
- `utf_8`, `utf_8_bom`
- `utf_16`, `utf_16_bom`
- `us_ascii`
- `koi8_u`, `koi8_r`
- `big5`
- `iso_8859_1_latin1`, `iso_8859_2_latin2`, `iso_8859_3_latin3`, `iso_8859_4_latin4`
- `iso_8859_5_cyrillic`, `iso_8859_6_arabic`, `iso_8859_7_greek`, `iso_8859_8_hebrew`
- `iso_8859_9_latin5_turkish`, `iso_8859_10_latin6_nordic`, `iso_8859_11_thai`
- `iso_8859_13_latin8_baltic`, `iso_8859_14_latin8_celtic`
- `iso_8859_15_latin9_euro`, `iso_8859_16_latin10_balkan`
- `windows_1250_central_europe`, `windows_1251_cyrillic`, `windows_1252_western`
- `windows_1253_greek`, `windows_1254_turkish`, `windows_1255_hebrew`, `windows_1256_arabic`
- `windows_1257_baltic`, `windows_1258_vietnamese`
- `ibm_850_western_europe`, `ibm_852_central_and_eastern_europe`
- `ibm_855_cyrillic`, `ibm_856_hebrew`, `ibm_857_turkish`, `ibm_858_western_europe`
- `ibm_860_portuguese`, `ibm_861_icelandic`, `ibm_862_hebrew`
- `ibm_863_canadian`, `ibm_865_danish`, `ibm_866_cyrillic`, `ibm_869_greek`
- `ibm_932_japanese`, and `ibm_949_korean`

Others with a similar format should be accepted depending on system support.
