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

- [**ArrayListLib**](../Contributed/ArrayListLib/) -- a list class in place of .NET's `ArrayList`. Version 1.4.0.134 does not compile in twinBASIC BETA 1005.
- [**BigNumberLib**](../Contributed/BigNumberLib/) -- arbitrary-precision signed integer arithmetic. Version 0.0.0.0 does not compile in twinBASIC BETA 1005.
- [**TBMANLIB**](../Contributed/TBMANLIB/) -- a toolkit of helpers: JSON, logs, INI files, strings, bytes, files and dictionaries. Version 1.0.0.5 compiles for 32-bit programs, crashes the compiler in a 64-bit build, and has several members that fail or give wrong results.
- [**TBMANLIB_Aes**](../Contributed/TBMANLIB_Aes/) -- AES encryption of text and byte arrays. Version 1.0.0.2 compiles, and its cipher modes are not the ones their names say: the default mode, CBC, runs ECB, and the output does not match the standard test vectors.
- [**TBMANLIB_Diagnostic**](../Contributed/TBMANLIB_Diagnostic/) -- a diagnostic report of the computer and its processes, as text, JSON or HTML. Version 0.0.0.0 compiles, and its text report, its **Dictionary** class and several of its list and file helpers fail or give wrong results.
- [**TBMANLIB_Xml**](../Contributed/TBMANLIB_Xml/) -- XML documents parsed, edited and written, in twinBASIC code. Version 1.0.0.0 compiles, and its parser misreads some common XML, such as self-closing elements and entities in text, and does not return for some malformed text.
- [**WinReg**](../Contributed/WinReg/) -- registry keys and values, read, written, deleted and enumerated. Version 0.0.0.0 does not compile in twinBASIC BETA 1005.
- [**xCalendar**](../Contributed/xCalendar/) -- a calendar control, in place of the Calendar control of `MSCAL.OCX`. Version 1.0.7.0 compiles, and has defects, among them some that can stop a program from responding.
