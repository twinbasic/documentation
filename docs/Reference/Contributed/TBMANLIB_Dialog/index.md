---
title: TBMANLIB_Dialog Package
parent: Contributed Packages
has_toc: false
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/
indexed_from: 1.0.0.1
---

# TBMANLIB_Dialog Package

**Author:** woeoio

A twinBASIC package with one class, **cDialog**, that shows the Windows Open, Save As and Browse For Folder dialogs, builds the file-type filters of the first two, splits a file path into folder, name and extension, and opens a file in the program that Windows associates with it. The property names follow VB6's **CommonDialog** control. The **CommonDialog** class of the [VBComDlg](../VBComDlg/CommonDialog) package is the fuller alternative, with flags, a filter index, cancel errors and the Color, Font and Print dialogs.

## Classes

- [cDialog](cDialog/) -- shows the Open, Save As and Browse For Folder dialogs, builds file filters, splits file paths and opens files.

## Properties (cDialog)

- [CreatePrompt](cDialog/CreatePrompt) -- asks before the Open dialog accepts a file that does not exist.
- [DefaultExt](cDialog/DefaultExt) -- the extension that Windows adds to a file name typed without one.
- [DialogTitle](cDialog/DialogTitle) -- the text that the dialogs show as their title.
- [FileMustExist](cDialog/FileMustExist) -- lets the Open dialog accept only the name of an existing file.
- [FileName](cDialog/FileName) -- the file name shown when a dialog opens, and the path that the last Open or Save As dialog returned.
- [Filter](cDialog/Filter) -- the file-type list of the Open and Save As dialogs, as pairs of a description and a pattern.
- [HideReadOnly](cDialog/HideReadOnly) -- hides the read-only choice of the Open dialog.
- [InitialDir](cDialog/InitialDir) -- the folder in which the Open and Save As dialogs start.
- [MultiSelect](cDialog/MultiSelect) -- lets the Open dialog select more than one file.
- [NewDialogStyle](cDialog/NewDialogStyle) -- selects the resizable Browse For Folder dialog with an edit box.
- [NoChangeDir](cDialog/NoChangeDir) -- keeps the current folder of the program as it was.
- [OverwritePrompt](cDialog/OverwritePrompt) -- asks before the Save As dialog accepts the name of an existing file.
- [PathMustExist](cDialog/PathMustExist) -- lets the Open and Save As dialogs accept only paths that exist.
- [ReadOnly](cDialog/ReadOnly) -- sets the read-only flag of the Open dialog, which has no visible effect.

## Methods (cDialog)

- [AddFilter](cDialog/AddFilter) -- appends a description and a pattern to the filter.
- [ClearFilter](cDialog/ClearFilter) -- empties the filter.
- [GetFileExtension](cDialog/GetFileExtension) -- returns the part of a path from its last period.
- [GetFileName](cDialog/GetFileName) -- returns the part of a path after its last backslash.
- [GetFileNameWithoutExt](cDialog/GetFileNameWithoutExt) -- returns the file name of a path without its extension.
- [GetFilePath](cDialog/GetFilePath) -- returns the part of a path before its last backslash.
- [OpenFile](cDialog/OpenFile) -- runs a shell verb, by default `open`, on a file or a program.
- [Reset](cDialog/Reset) -- restores every property to its starting value.
- [SelectAndOpenFile](cDialog/SelectAndOpenFile) -- shows the Open dialog and opens the chosen file or files.
- [SetCodeFilters](cDialog/SetCodeFilters) -- replaces the filter with one for source code files.
- [SetCommonFilters](cDialog/SetCommonFilters) -- replaces the filter with Text Files and All Files.
- [SetDocumentFilters](cDialog/SetDocumentFilters) -- replaces the filter with one for office documents.
- [SetImageFilters](cDialog/SetImageFilters) -- replaces the filter with one for image files.
- [ShowBrowseForFolder](cDialog/ShowBrowseForFolder) -- shows the Browse For Folder dialog and returns the chosen folder.
- [ShowOpen](cDialog/ShowOpen) -- shows the Open dialog and returns the chosen file.
- [ShowSave](cDialog/ShowSave) -- shows the Save As dialog and returns the chosen file name.
