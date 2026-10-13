---
title: Experimental Packages
parent: Packages
nav_order: 4
permalink: /tB/Packages/Experimental/
has_toc: false
---

# Experimental Packages

Community-authored packages from TWINSERV that are not yet ready for use in a program.

These packages are published through TWINSERV, as the [Contributed Packages](../Contributed/) are, and are documented in the same way. A package is listed here when its newest version does not compile in the current twinBASIC, or when it has defects that a program would meet. Each section says which version it documents and what does not work yet. A package moves to the Contributed Packages once a version of it works, and its pages keep their addresses.

- [**ArrayListLib**](../Contributed/ArrayListLib/) -- a list class in place of .NET's `ArrayList`. Version 1.6.151.1 does not compile in twinBASIC BETA 1005, and in a copy that does, a **For Each** over a list with no items fails, **ToString** of such a list never returns, **Reverse** leaves the two middle items of an even run in place, and a second **GetEnumerator** over the same list ignores its arguments.
- [**BigNumberLib**](../Contributed/BigNumberLib/) -- arbitrary-precision signed integer arithmetic. Version 1.0.2.0 compiles, and has several members that give wrong results or do not return: setting **IsNegative** to **True**, a negative operand of the greatest common divisor and the least common multiple, a zero from **AssignFromLong**, and the modular inverse of zero.
- [**TBMANLIB**](../Contributed/TBMANLIB/) -- a toolkit of helpers: JSON, logs, INI files, strings, bytes, files and dictionaries. Version 1.0.0.5 compiles for 32-bit programs, crashes the compiler in a 64-bit build, and has several members that fail or give wrong results.
- [**TBMANLIB_Aes**](../Contributed/TBMANLIB_Aes/) -- AES encryption of text and byte arrays. Version 1.0.0.4 compiles, and its cipher modes are not the ones their names say: the default mode, CBC, runs ECB, and the output does not match the standard test vectors.
- [**TBMANLIB_ConsoleComponents**](../Contributed/TBMANLIB_ConsoleComponents/) -- text-interface components for console programs: progress bars, charts, tables and panels. Version 1.0.0.1 compiles, and its components cannot use a console object of the published TBMANLIB_ConsoleCore, since the package carries a copy of that package whose types the compiler treats as different.
- [**TBMANLIB_ConsoleCore**](../Contributed/TBMANLIB_ConsoleCore/) -- a console library with colours, UTF-8 and a full-screen mode. Version 1.0.0.1 compiles, and it reads keys wrongly and has several helpers that give wrong results.
- [**TBMANLIB_Diagnostic**](../Contributed/TBMANLIB_Diagnostic/) -- a diagnostic report of the computer and its processes, as text, JSON or HTML. Version 1.0.0.1 compiles. Its **Dictionary** class cannot be created, and several of its list and file helpers and two of its collectors fail or give wrong results.
- [**TBMANLIB_Xml**](../Contributed/TBMANLIB_Xml/) -- XML documents parsed, edited and written, in twinBASIC code. Version 1.0.0.1 compiles, and its parser misreads some common XML, such as self-closing elements and entities in text, and does not return for some malformed text. Its XPath engine reads some valid expressions as others, such as the step `..` and `and` with `or`.
- [**tbRegExp**](../Contributed/tbRegExp/) -- regular expressions, in place of VBScript's **RegExp** object. Version 1.4.0.0 compiles, and with **Global** set to **True** it reports a match of no characters twice when the search skipped characters to reach it, so **Execute**, **Replace** and **Split** give wrong results for patterns such as `$`, `\b` and a lookahead.
- [**WinReg**](../Contributed/WinReg/) -- registry keys and values, read, written, deleted and enumerated. Version 1.0.1.1 does not compile in twinBASIC BETA 1005, and three of its methods give wrong results: **ReadString** returns the text followed by NUL characters, **GetRegistryValueType** returns **REG_NONE** for a value that holds data, and one overload of **ConvertValueToString** finds no value.
- [**xCalendar**](../Contributed/xCalendar/) -- a calendar control, in place of the Calendar control of `MSCAL.OCX`. Version 1.0.17.0 compiles, and has defects, among them a grid that keeps the dates of the old month when **Value** is set to another month, and colour properties of the text that have no effect.
