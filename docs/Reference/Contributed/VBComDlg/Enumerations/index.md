---
title: Enumerations
parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/Enumerations/
has_children: true
has_toc: false
nav_order: 99
---

# VBComDlg Enumerations
{: .no_toc }

The 17 public enumerations of the package, in groups by dialog. All of them are declared inside the [**CommonDialog**](../CommonDialog) class, and their members can be written with or without the name of the enumeration, as in `CdlOFNFileMustExist` or `CdlOFNConstants.CdlOFNFileMustExist`.

Most of them are sets of flags for the [**Flags**](../CommonDialog#flags) property, with the values of the Windows constants of the same names (`OFN_FILEMUSTEXIST` for **CdlOFNFileMustExist**, `CC_FULLOPEN` for **CdlCCFullOpen**). The members are combined with **Or**.

## File dialogs
{: .no_toc }

The File Open and File Save dialogs.

- [CdlOFNConstants](CdlOFNConstants) -- options of the File Open and File Save dialogs
- [CdlOFNShareViResultConstants](CdlOFNShareViResultConstants) -- how the dialog answers a sharing violation

## Color dialog
{: .no_toc }

- [CdlCCConstants](CdlCCConstants) -- options of the Color dialog

## Font dialog
{: .no_toc }

- [CdlCFConstants](CdlCFConstants) -- options of the Font dialog

## Print dialogs
{: .no_toc }

The Print dialog and the extended Print dialog.

- [CdlPDConstants](CdlPDConstants) -- options of the Print and extended Print dialogs
- [CdlPDResultConstants](CdlPDResultConstants) -- the button that closed the extended Print dialog

## Page Setup dialog
{: .no_toc }

- [CdlPSDConstants](CdlPSDConstants) -- options of the Page Setup dialog

## Printer settings
{: .no_toc }

The values of the printer properties that the Print, extended Print and Page Setup dialogs read and return.

- [CdlPRBNConstants](CdlPRBNConstants) -- paper sources (bins)
- [CdlPRCMConstants](CdlPRCMConstants) -- monochrome or color printing
- [CdlPRDPConstants](CdlPRDPConstants) -- one-sided or two-sided printing
- [CdlPRORConstants](CdlPRORConstants) -- portrait or landscape orientation
- [CdlPRPQConstants](CdlPRPQConstants) -- print quality presets
- [CdlPRPSConstants](CdlPRPSConstants) -- paper sizes

## Folder Browser dialog
{: .no_toc }

- [CdlBIFConstants](CdlBIFConstants) -- options of the Folder Browser dialog

## Find and Replace dialogs
{: .no_toc }

- [CdlFRConstants](CdlFRConstants) -- options and results of the Find and Replace dialogs

## Help and errors
{: .no_toc }

- [CdlHelpConstants](CdlHelpConstants) -- commands for the WinHelp viewer
- [CdlErrorConstants](CdlErrorConstants) -- run-time error numbers that the dialogs raise
