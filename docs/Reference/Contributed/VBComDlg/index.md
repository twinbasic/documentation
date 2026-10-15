---
title: VBComDlg Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - CommonDialogBase
indexed_from: 1.0.13.0
permalink: /tB/Packages/Contributed/VBComDlg/
---

# VBComDlg Package
{: .no_toc }

**Author:** Krool. **Version:** 1.0.13.0

The **VBComDlg** contributed package provides the **CommonDialog** class, which wraps the Windows common dialogs (File Open, File Save, Color, Font, Print, Page Setup, Folder Browser, Find, and Replace) and the WinHelp call. Its members are modelled on those of the VB6 CommonDialog control.

## Classes

- [CommonDialog](CommonDialog) -- provides access to the Windows common dialogs: File Open, File Save, Color, Font, Print, Page Setup, Folder Browser, Find, and Replace.

## Enumerations

- [Enumerations](Enumerations/) -- the 17 enumerations of the **CommonDialog** class: the flags of each dialog, the printer settings, the help commands and the error numbers.

## Test cases

The notes and warnings of this section are checked by the test cases in [VBComDlg-tests.twinproj](VBComDlg-tests.twinproj), a twinBASIC project. It uses VBComDlg as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
