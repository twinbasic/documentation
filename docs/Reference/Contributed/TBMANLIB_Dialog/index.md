---
title: TBMANLIB_Dialog Package
parent: Experimental Packages
has_toc: false
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/
indexed_from: 1.1.0.0
exclude_from_docs:
  - IOleWindow
  - IModalWindow
  - IShellItem
  - IShellItemArray
  - IFileDialog
  - IFileOpenDialog
  - IFileSaveDialog
  - TestModule
---

# TBMANLIB_Dialog Package

**Author:** woeoio. **Version:** 1.1.0.0

A twinBASIC package of dialogs. Its first class, **cDialog**, shows the Windows Open, Save As and Browse For Folder dialogs, builds the file-type filters of the first two, splits a file path into folder, name and extension, and opens a file in the program that Windows associates with it; its property names follow VB6's **CommonDialog** control. **cDialogEx** shows the Open, Save As and folder dialogs of Windows Vista and later. Five more classes show the Windows Color, Font, Find and Replace, Page Setup and Print dialogs, and five classes ask for a value or report progress (a message box with a time limit, a date and time, an input box, a password and a progress state); the last five use the run-time's own **InputBox** and **MsgBox** or draw nothing. Every class except **cDialog** is marked as not creatable with **CreateObject**, and is made with **New**. The module **mDialog** holds the types and conversion functions that they share. This section documents version 1.1.0.0, which added every class except **cDialog**. The **CommonDialog** class of the [VBComDlg](../VBComDlg/CommonDialog) package is a fuller alternative for the Windows common dialogs, with flags, a filter index and cancel errors.

> [!WARNING] 1.1.0.0
> Several classes fail at their main task, and no error is raised. [**cDialogFindReplace**](cDialogFindReplace) reports nothing to the program, and its **ShowReplace** can end a 32-bit program. [**cDialogPageSetup**](cDialogPageSetup) ignores the paper size and the orientation the program sets, and does not read back the orientation the user chose. [**cDialogEx**](cDialogEx) returns file and folder names without their folder, ignores **InitialDir**, and shows no file types for a filter written in the usual form. [**cDialogPassword**](cDialogPassword) shows the password as it is typed in its confirmation boxes. [**cDialogDateTime**](cDialogDateTime) keeps the parts of an entry it refused, refuses a time with AM or PM and no date, and changes the letters of a month name in a custom format. Four properties of [**cDialogInputBox**](cDialogInputBox), among them **PasswordChar**, have no effect. Each class's page describes its defects. [**cDialog**](cDialog/), the class for the Open, Save As and Browse For Folder dialogs, works.

## Classes

- [cDialog](cDialog/) -- shows the Open, Save As and Browse For Folder dialogs, builds file filters, splits file paths and opens files.
- [cDialogEx](cDialogEx) -- shows the Open, Save As and folder dialogs of Windows Vista and later, with a file-type index, an owner window and a title-bar icon.
- [cDialogColor](cDialogColor) -- shows the Windows Color dialog and holds the color as `&H00BBGGRR`, `#RRGGBB` and `RGB(r, g, b)`.
- [cDialogFont](cDialogFont) -- shows the Windows Font dialog and holds the face, size, style, effects and color, with CSS and text descriptions.
- [cDialogFindReplace](cDialogFindReplace) -- shows the modeless Windows Find and Replace dialogs; in version 1.1.0.0 the program receives nothing from them.
- [cDialogPageSetup](cDialogPageSetup) -- shows the Windows Page Setup dialog and holds the paper and the margins in inches; in version 1.1.0.0 the paper size and the orientation are not passed.
- [cDialogPrint](cDialogPrint) -- shows the Windows Print dialog and holds the page range, the copies and a printer device context that the program must delete.
- [cDialogCountdownMsgBox](cDialogCountdownMsgBox) -- shows a message box that closes by itself after a number of seconds; the text never counts down.
- [cDialogDateTime](cDialogDateTime) -- asks for a date and a time in the run-time's input box, and formats them.
- [cDialogInputBox](cDialogInputBox) -- asks for a text, a number, an e-mail address, a telephone number or a web address in the run-time's input box.
- [cDialogPassword](cDialogPassword) -- asks for a password, or for a new password in place of an old one, in the run-time's input box.
- [cDialogProgress](cDialogProgress) -- tracks the state of a task and returns it as text; it shows no window.

## Module

- [mDialog](mDialog) -- the unit conversions, the HTML colour conversions, the paper sizes and four structure types that the classes share.

## Test code and interfaces

The package contains a module of test procedures, **TestModule**, whose procedures each open a dialog and report the result in a message box. Its procedures, such as `TestFileOpen` and `QuickTest`, are not part of the interface that a program uses, and this section does not document them. The seven interfaces **IOleWindow**, **IModalWindow**, **IShellItem**, **IShellItemArray**, **IFileDialog**, **IFileOpenDialog** and **IFileSaveDialog** are declarations of COM interfaces of Windows that **cDialogEx** calls inside. No member of **cDialogEx** takes or returns one, so a program does not use them to use the class, and this section does not document them either.

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
- [PathCombine](cDialog/PathCombine) -- joins two path parts with one backslash.
- [Reset](cDialog/Reset) -- restores every property to its starting value.
- [SelectAndOpenFile](cDialog/SelectAndOpenFile) -- shows the Open dialog and opens the chosen file or files.
- [SelectFiles](cDialog/SelectFiles) -- shows the Open dialog and returns the chosen files as a collection.
- [SetCodeFilters](cDialog/SetCodeFilters) -- replaces the filter with one for source code files.
- [SetCommonFilters](cDialog/SetCommonFilters) -- replaces the filter with Text Files and All Files.
- [SetDocumentFilters](cDialog/SetDocumentFilters) -- replaces the filter with one for office documents.
- [SetImageFilters](cDialog/SetImageFilters) -- replaces the filter with one for image files.
- [ShowBrowseForFolder](cDialog/ShowBrowseForFolder) -- shows the Browse For Folder dialog and returns the chosen folder.
- [ShowOpen](cDialog/ShowOpen) -- shows the Open dialog and returns the chosen file.
- [ShowSave](cDialog/ShowSave) -- shows the Save As dialog and returns the chosen file name.

## See Also

- [VBComDlg](../VBComDlg/) package -- the **CommonDialog** class, with flags, a filter index and cancel errors
- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program
