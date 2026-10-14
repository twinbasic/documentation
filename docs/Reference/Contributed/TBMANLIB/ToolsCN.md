---
title: ToolsCN
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsCN
has_toc: false
---

# ToolsCN module
{: .no_toc }

Meant to convert Chinese characters to *pinyin*, the Latin spelling of their pronunciation. The module has one function, **GetPinYin**, and a table of 396 syllables. A comment at the head of the code, dated 30 December 2024, says that the author has *discarded this object for now*, and the function does not work in version 1.0.0.29.

* TOC
{:toc}

## Functions

### GetPinYin
{: .no_toc }

Converts Chinese characters to pinyin.

Syntax: **ToolsCN.GetPinYin** ( *CnChar* ) **As String**

*CnChar*
: *required* A **String**, the text to convert.

For each character, the code takes the number that **Asc** returns for it. A number from 1 to 159 is an ASCII character and is copied. A number from -20319 to -10247 is the code of a Chinese character in the GBK code page, which **Asc** returns as a negative number on a computer whose code page is a Chinese one; the function looks up the syllable of the table with the greatest start code that does not exceed that number, and returns it with a capital first letter (`Zhong`). Any other character is dropped. The syllables are joined with no separator.

An empty string returns an empty string.

> [!NOTE] 1.0.0.29
> The function raises error -2147467259, *Unspecified error*, for any text that holds a character with a code from 1 to 159, such as an English letter, a digit or a space. The line that copies such a character is written `G = Chr(Num)()`, with a pair of parentheses after the call to **Chr**, which returns a **Variant**, and that raises the error when it runs. On a computer whose code page is not a Chinese one, a Chinese character becomes `?`, code 63, so it raises the error too. Any other character is dropped with no error: `GetPinYin(ChrW(233))` returns an empty string. The same pair of parentheses after the call to **Asc** on the line before has no effect. The loop over the characters also uses the variable `i` for its own search through the table, so on a Chinese code page it would skip characters after a Chinese character.

## See Also

- [cToolsStr](cToolsStr) class -- string functions of the package
- [TBMANLIB](.) package -- overview
