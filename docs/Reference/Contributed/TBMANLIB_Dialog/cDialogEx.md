---
title: cDialogEx
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogEx
has_toc: false
---

# cDialogEx class
{: .no_toc }

Shows the Open, Save As and folder-picker dialogs of Windows Vista and later (the item dialogs, `IFileOpenDialog` and `IFileSaveDialog`), with a file-type index, an owner window, a title-bar icon and a folder-picking mode. Its members follow those of [**cDialog**](cDialog/), and it adds [**FilterIndex**](#filterindex), [**OwnerHwnd**](#ownerhwnd), [**PickFolders**](#pickfolders), [**GetPresetFilter**](#getpresetfilter), [**SetSystemIcon**](#setsystemicon), [**SetCustomIcon**](#setcustomicon) and [**ClearIcon**](#clearicon).

A **cDialogEx** is created with **New**. The properties are set before a dialog is shown, and [**ShowOpen**](#showopen), [**ShowSave**](#showsave) and [**ShowBrowseForFolder**](#showbrowseforfolder) show it. Creating an object calls `CoInitialize` for the thread, and destroying it calls `CoUninitialize`.

**Properties:** [CreatePrompt](#createprompt), [DefaultExt](#defaultext), [DialogTitle](#dialogtitle), [FileMustExist](#filemustexist), [FileName](#filename), [Filter](#filter), [FilterIndex](#filterindex), [InitialDir](#initialdir), [MultiSelect](#multiselect), [NoChangeDir](#nochangedir), [OverwritePrompt](#overwriteprompt), [OwnerHwnd](#ownerhwnd), [PathMustExist](#pathmustexist), [PickFolders](#pickfolders).

**Methods:** [AddFilter](#addfilter), [ClearFilter](#clearfilter), [ClearIcon](#clearicon), [GetFileExtension](#getfileextension), [GetFileName](#getfilename), [GetFileNameWithoutExt](#getfilenamewithoutext), [GetFilePath](#getfilepath), [GetPresetFilter](#getpresetfilter), [OpenFile](#openfile), [PathCombine](#pathcombine), [Reset](#reset), [SelectAndOpenFile](#selectandopenfile), [SelectFiles](#selectfiles), [SetCodeFilters](#setcodefilters), [SetCommonFilters](#setcommonfilters), [SetCustomIcon](#setcustomicon), [SetDocumentFilters](#setdocumentfilters), [SetImageFilters](#setimagefilters), [SetSystemIcon](#setsystemicon), [ShowBrowseForFolder](#showbrowseforfolder), [ShowOpen](#showopen), [ShowSave](#showsave).

**Enumeration:** [SystemIconId](#systemiconid).

```tb check_build
Dim dlg As New cDialogEx
Dim result As String

dlg.DialogTitle = "Open a text file"
dlg.Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*|"
result = dlg.ShowOpen()

If Len(result) > 0 Then Debug.Print "Chosen: " & result
```

<!-- test: probe x1, probe x2, probe x12 -->
> [!WARNING] 1.1.0.0
> The three dialogs return the **name** of the chosen file or folder, not its full path: [**ShowOpen**](#showopen), [**ShowSave**](#showsave), [**ShowBrowseForFolder**](#showbrowseforfolder) and [**SelectFiles**](#selectfiles) give `a.txt` for `C:\Reports\a.txt`, and `other` for the folder `C:\Reports\other`. A program that opens or saves the result opens or saves a file in its own current folder, and no error is raised. [**FileName**](#filename) holds the same short name afterwards. The class asks Windows for the name that is relative to the parent folder, because the constant `SIGDN_FILESYSPATH` of the source has the value `&H80058001` and the file-system path is `&H80058000`. The folder in which the user chose is not reported, so the result cannot be used to open or save the file. Use [**cDialog**](cDialog/), which returns full paths.

<!-- test: probe x15 -->
> [!WARNING] 1.1.0.0
> [**InitialDir**](#initialdir) has no effect: the dialogs always open in the *Documents* folder, and no error is raised. The class makes the folder item with `SHCreateItemFromParsingName` and a GUID for `IShellItem` that has a wrong byte (`&H37` where the interface identifier has `&H7B`), so Windows answers that it has no such interface and the class skips `SetDefaultFolder`.

<!-- test: CDialogExTests.AddFilter_BuildsAFilterTheDialogAccepts, CDialogExTests.SetFilters_BuildAFilterTheDialogAccepts, CDialogExTests.GetPresetFilter_GivesATextTheDialogAccepts, probe x5 -->
> [!WARNING] 1.1.0.0
> A [**Filter**](#filter) is ignored unless it holds an even number of pipe characters (`|`). A filter of N pairs written `Name|Pattern|Name|Pattern` holds 2N minus 1, an odd number, so the dialog shows no file-type list and accepts every file, and no error is raised. A pipe after the last pattern makes the count even: `Text (*.txt)|*.txt|All (*.*)|*.*|` shows two entries. [**AddFilter**](#addfilter) and the four **Set...Filters** methods build a filter without the closing pipe, and so does the text of [**GetPresetFilter**](#getpresetfilter), so none of them shows a list until the text gets its pipe: add `dlg.Filter = dlg.Filter & "|"` after them.

## Which dialog uses which property

<!-- test: probe x1, probe x3, probe x4, probe x5, probe x6, probe x7, probe x8, probe x9, probe x10, probe x11, probe x16 -->
*yes* means that the class passes the value to the dialog. [**ShowOpen**](#showopen) with [**PickFolders**](#pickfolders) **True** and [**ShowBrowseForFolder**](#showbrowseforfolder) show the same folder dialog.

| Property | ShowOpen | ShowSave | Folder dialog |
|---|---|---|---|
| [**DialogTitle**](#dialogtitle) | yes | yes | yes |
| [**InitialDir**](#initialdir) | yes (no effect) | yes (no effect) | yes (no effect) |
| [**FileName**](#filename) | read and written | read and written | written, not read |
| [**DefaultExt**](#defaultext) | ignored | yes | ignored |
| [**Filter**](#filter), [**FilterIndex**](#filterindex) | yes | yes | ignored |
| [**OverwritePrompt**](#overwriteprompt) | yes | yes | ignored |
| [**PathMustExist**](#pathmustexist) | yes | yes | always set |
| [**FileMustExist**](#filemustexist), [**CreatePrompt**](#createprompt), [**MultiSelect**](#multiselect) | yes | ignored | ignored |
| [**NoChangeDir**](#nochangedir) | yes | yes | yes |
| [**OwnerHwnd**](#ownerhwnd) | yes | yes | yes |
| [**PickFolders**](#pickfolders) | selects the folder dialog | ignored | ignored |
| the icon ([**SetSystemIcon**](#setsystemicon), [**SetCustomIcon**](#setcustomicon)) | yes | yes | yes |

Every method catches its errors: it writes a line that starts with the name of the method to the debug console (`Debug.Print`) and returns an empty string. A dialog that Windows cannot create gives an empty string in the same way, so an empty result means a cancel or a failure.
<!-- /test -->

## Differences from cDialog

<!-- test: compile CDialogExHasNoNewDialogStyle, compile CDialogExHasNoHideReadOnly, compile CDialogExHasNoReadOnly, CDialogExTests.Defaults_EveryBooleanIsFalse, CDialogExTests.Defaults_TextsAndNumbers, CDialogExTests.Properties_StoreWhatIsSet, CDialogExTests.Reset_RestoresTheStartingValues, CDialogExTests.GetPresetFilter_ReturnsAPairForAKnownName, CDialogExTests.GetPresetFilter_IgnoresCaseAndSpacesAtTheEnds, CDialogExTests.GetPresetFilter_DoesNotChangeFilter, CDialogExTests.AddFilter_JoinsPairsWithPipes, CDialogExTests.SetCommonFilters_ReplacesTheFilterWithTwoPairs, CDialogExTests.ClearFilter_EmptiesTheFilter, CDialogExTests.PathHelpers_WorkAsThoseOfCDialog, CDialogExTests.OpenFile_NonexistentFileReturns2, CDialogExTests.SystemIconId_HasTheDocumentedValues -->

- A new **cDialogEx** has every Boolean property **False**. A new [**cDialog**](cDialog/#defaults) has [**OverwritePrompt**](#overwriteprompt), [**PathMustExist**](#pathmustexist) and [**FileMustExist**](#filemustexist) set to **True**.
- The dialogs are the item dialogs of Windows Vista and later: the folder dialog is the file dialog in a folder-picking mode, with a *Select Folder* button, and not the tree of `SHBrowseForFolder`. There is no [**NewDialogStyle**](cDialog/NewDialogStyle), [**HideReadOnly**](cDialog/HideReadOnly) or [**ReadOnly**](cDialog/ReadOnly) property.
- A [**ShowOpen**](#showopen) with [**MultiSelect**](#multiselect) puts the first file in [**FileName**](#filename) when two or more files are chosen. **cDialog** empties it.
- With the defaults the Open dialog accepts the name of a file that does not exist, but a name in a folder that does not exist raises a message box and the dialog stays open, whatever [**PathMustExist**](#pathmustexist) holds.
- [**Filter**](#filter) needs the closing pipe, as the warning above says.

## Properties

### CreatePrompt
{: .no_toc }

Returns or sets whether the Open dialog asks before it accepts the name of a file that does not exist.

Syntax: *object*.**CreatePrompt** [ = *boolean* ]

A **Boolean**. The default is **False**. With **True**, the Open dialog sets `FOS_CREATEPROMPT`: a name that matches no file raises a box titled *Open*, with the text *This file doesn't exist. Create the file?* and the buttons *Yes* and *No*. Windows shows the box twice in a row. *Yes* closes the dialog and returns the name; *No* leaves the dialog open. The class does not create the file. [**ShowSave**](#showsave) ignores the property.

### DefaultExt
{: .no_toc }

Returns or sets the extension that the Save As dialog adds to a name typed without one.

Syntax: *object*.**DefaultExt** [ = *string* ]

A **String**, an extension without a period (`txt`). The default is an empty string, which adds nothing. Only [**ShowSave**](#showsave) uses it, through `SetDefaultExtension`. A name typed without an extension gets the extension after a period (`out` becomes `out.txt`), and a name with its own extension, such as `out.dat`, is kept. A value with a period (`.txt`) is passed as it stands, and the result is `out..txt`.

### DialogTitle
{: .no_toc }

Returns or sets the title of the dialog.

Syntax: *object*.**DialogTitle** [ = *string* ]

A **String**. The default is an empty string, and the dialog then shows its own title: *Open* for [**ShowOpen**](#showopen), *Save As* for [**ShowSave**](#showsave), and for the folder dialog (**ShowBrowseForFolder**, or **ShowOpen** with [**PickFolders**](#pickfolders)) the five characters U+9009 U+62E9 U+6587 U+4EF6 U+5939, which mean *Select Folder* in Chinese. A non-empty value replaces the title in all three.

### FileMustExist
{: .no_toc }

Returns or sets whether the Open dialog accepts only the name of a file that exists.

Syntax: *object*.**FileMustExist** [ = *boolean* ]

A **Boolean**. The default is **False**, so the Open dialog accepts a name that matches no file and returns it. With **True** it sets `FOS_FILEMUSTEXIST`: a name that matches no file raises a box with the text *File not found. Check the file name and try again.*, and the dialog stays open. [**ShowSave**](#showsave) ignores the property.

### FileName
{: .no_toc }

Returns or sets the file name that the dialogs show when they open, and holds the name that the last dialog returned.

Syntax: *object*.**FileName** [ = *string* ]

A **String**. The default is an empty string. [**ShowOpen**](#showopen) and [**ShowSave**](#showsave) write a non-empty value into the File name box when the dialog opens. A confirmed dialog stores its result here: the name of the file (see the first warning above), the first name of several files from [**ShowOpen**](#showopen), or the name of the folder. A cancelled dialog leaves **FileName** as it was. The folder dialog does not read it. Because a confirmed dialog stores its result, the next dialog opens with that name in the box; set **FileName** to an empty string, or call [**Reset**](#reset), to start without it.

### Filter
{: .no_toc }

Returns or sets the file-type list of the Open and Save As dialogs.

Syntax: *object*.**Filter** [ = *string* ]

A **String** of pairs of a description and a pattern, separated by pipe characters: `Text (*.txt)|*.txt|All (*.*)|*.*|`. Several patterns of one pair are separated by semicolons. The default is an empty string, which shows no list. The text is split at each pipe, so it must hold an even number of pipes, which means that it must end with a pipe; see the warning at the top of the page. A text with an odd number of pipes is ignored, and a text with an even number but an incomplete last pair keeps what it can: `Text (*.txt)|*.txt|All` shows one entry. The folder dialog ignores the property. Descriptions are shown as written, so add the pattern to the description if the dialog is to show it.

### FilterIndex
{: .no_toc }

Returns or sets which entry of the file-type list the dialog selects when it opens.

Syntax: *object*.**FilterIndex** [ = *long* ]

A **Long**, 1 for the first entry. The default is 0, which selects the first entry. A value above the number of entries selects the last one, and a negative value selects the first. The dialog sets the index only when [**Filter**](#filter) is in effect (see the warning above). The property is not updated when the user chooses another entry, so the program cannot find out which entry the user chose.

### InitialDir
{: .no_toc }

Returns or sets the folder in which the dialogs should open.

Syntax: *object*.**InitialDir** [ = *string* ]

A **String**. The default is an empty string. In version 1.1.0.0 the value has no effect; see the warning at the top of the page. The class never changes it.

### MultiSelect
{: .no_toc }

Returns or sets whether the Open dialog lets the user select more than one file.

Syntax: *object*.**MultiSelect** [ = *boolean* ]

A **Boolean**. The default is **False**. With **True** the dialog allows several files, and [**ShowOpen**](#showopen) returns a **String** for one file and an array of **String** values for two or more. [**ShowSave**](#showsave) and the folder dialog ignore the property.

### NoChangeDir
{: .no_toc }

Returns or sets whether the dialogs leave the current folder of the program alone.

Syntax: *object*.**NoChangeDir** [ = *boolean* ]

A **Boolean**. The default is **False**. With **True** the class sets `FOS_NOCHANGEDIR` for all three dialogs. The current folder of the program stayed the same after each dialog with the property **False** and **True**.

### OverwritePrompt
{: .no_toc }

Returns or sets whether the dialog asks before it accepts the name of an existing file.

Syntax: *object*.**OverwritePrompt** [ = *boolean* ]

A **Boolean**. The default is **False**, so the Save As dialog accepts the name of an existing file without asking. With **True** it sets `FOS_OVERWRITEPROMPT`: the dialog raises a box titled *Confirm Save As* with the buttons *Yes* and *No*. *Yes* returns the name and *No* leaves the dialog open. [**ShowOpen**](#showopen) passes the flag too, and the folder dialog does not.

### OwnerHwnd
{: .no_toc }

Returns or sets the window that owns the dialogs.

Syntax: *object*.**OwnerHwnd** [ = *longptr* ]

A **LongPtr**, the handle of a window of the program. The default is 0, a dialog with no owner. The dialog is owned by that window. A handle that is not a window (12345, for example) makes **Show** fail: the method returns an empty string at once, shows no dialog and raises no error.

### PathMustExist
{: .no_toc }

Returns or sets whether the Open and Save As dialogs accept only paths that exist.

Syntax: *object*.**PathMustExist** [ = *boolean* ]

A **Boolean**. The default is **False**. With **True** it sets `FOS_PATHMUSTEXIST` for [**ShowOpen**](#showopen) and [**ShowSave**](#showsave), and a name in a folder that does not exist raises a box with the text *Path does not exist. Check the path and try again.* The Open dialog shows the same box with the property **False**. The folder dialog always sets the flag.

### PickFolders
{: .no_toc }

Returns or sets whether [**ShowOpen**](#showopen) picks a folder.

Syntax: *object*.**PickFolders** [ = *boolean* ]

A **Boolean**. The default is **False**. With **True**, **ShowOpen** shows the folder dialog and returns the folder, as [**ShowBrowseForFolder**](#showbrowseforfolder) does. [**MultiSelect**](#multiselect) is ignored in that mode.

## Methods

### AddFilter
{: .no_toc }

Appends a description and a pattern to the filter.

Syntax: *object*.**AddFilter** ( *strDescription*, *strExtension* )

Both arguments are **String** values. The method joins the new pair to [**Filter**](#filter) with a pipe, and adds no pipe at the end; see the warning at the top of the page.

### ClearFilter
{: .no_toc }

Empties the filter.

Syntax: *object*.**ClearFilter**

### ClearIcon
{: .no_toc }

Removes the icon that [**SetSystemIcon**](#setsystemicon) or [**SetCustomIcon**](#setcustomicon) set.

Syntax: *object*.**ClearIcon**

The dialogs then show the icon that Windows chooses. The class destroys an icon that **SetSystemIcon** loaded, and **Reset** calls this method.

### GetFileExtension
{: .no_toc }

Returns the part of a path from its last period.

Syntax: *object*.**GetFileExtension** ( *strFullPath* ) **As String**

The same as [**cDialog.GetFileExtension**](cDialog/GetFileExtension).

### GetFileName
{: .no_toc }

Returns the part of a path after its last backslash.

Syntax: *object*.**GetFileName** ( *strFullPath* ) **As String**

The same as [**cDialog.GetFileName**](cDialog/GetFileName).

### GetFileNameWithoutExt
{: .no_toc }

Returns the file name of a path without its extension.

Syntax: *object*.**GetFileNameWithoutExt** ( *strFullPath* ) **As String**

The same as [**cDialog.GetFileNameWithoutExt**](cDialog/GetFileNameWithoutExt).

### GetFilePath
{: .no_toc }

Returns the part of a path before its last backslash.

Syntax: *object*.**GetFilePath** ( *strFullPath* ) **As String**

The same as [**cDialog.GetFilePath**](cDialog/GetFilePath).

### GetPresetFilter
{: .no_toc }

Returns the text of a filter for a kind of file.

Syntax: *object*.**GetPresetFilter** ( *filterName* ) **As String**

*filterName* is a **String** that the method compares without regard to case and after removing spaces at both ends. The result is a pair, with no closing pipe, and an empty string for any other name. The method does not change [**Filter**](#filter).

| *filterName* | Result |
|---|---|
| `all` | `All Files|*.*` |
| `text` | `Text Files|*.txt` |
| `images` or `image` | `Image Files|*.bmp;*.jpg;*.jpeg;*.png;*.gif` |
| `documents` or `document` | `Documents|*.doc;*.docx;*.pdf;*.txt;*.rtf` |
| `executables` or `executable` | `Executables|*.exe;*.bat;*.cmd;*.ps1` |

```tb check_build check_run
Dim dlg As New cDialogEx
Debug.Print dlg.GetPresetFilter("Images")       ' Image Files|*.bmp;*.jpg;*.jpeg;*.png;*.gif
Debug.Print "[" & dlg.GetPresetFilter("code") & "]"   ' []

dlg.Filter = dlg.GetPresetFilter("text") & "|" & dlg.GetPresetFilter("all") & "|"
Debug.Print dlg.Filter                          ' Text Files|*.txt|All Files|*.*|
```

### OpenFile
{: .no_toc }

Runs a shell verb, by default `open`, on a file or a program.

Syntax: *object*.**OpenFile** ( *strFilePath* [, *strOperation* ] ) **As LongPtr**

The same as [**cDialog.OpenFile**](cDialog/OpenFile). A path that does not exist returns 2.

### PathCombine
{: .no_toc }

Joins two path parts with one backslash.

Syntax: *object*.**PathCombine** ( *strPath1*, *strPath2* ) **As String**

The same as [**cDialog.PathCombine**](cDialog/PathCombine).

### Reset
{: .no_toc }

Restores every property to its starting value.

Syntax: *object*.**Reset**

[**DialogTitle**](#dialogtitle), [**InitialDir**](#initialdir), [**FileName**](#filename), [**DefaultExt**](#defaultext) and [**Filter**](#filter) become empty strings, [**FilterIndex**](#filterindex) and [**OwnerHwnd**](#ownerhwnd) become 0, and every Boolean property becomes **False**. The icon is cleared.

### SelectAndOpenFile
{: .no_toc }

Shows the Open dialog and opens the file or files that the user chose.

Syntax: *object*.**SelectAndOpenFile** ( ) **As LongPtr**

The same as [**cDialog.SelectAndOpenFile**](cDialog/SelectAndOpenFile): 0 for a cancel, the value of [**OpenFile**](#openfile) for one file, and 1 after an array of files. With the name-only result described in the warning at the top of the page, the file that is opened is the one with that name in the current folder of the program.

### SelectFiles
{: .no_toc }

Shows the Open dialog and returns the chosen files as a **Collection**.

Syntax: *object*.**SelectFiles** ( ) **As Collection**

The same as [**cDialog.SelectFiles**](cDialog/SelectFiles): one **String** for each file, an empty collection after a cancel. With [**PickFolders**](#pickfolders) **True** it holds the chosen folder.

### SetCodeFilters
{: .no_toc }

Replaces the filter with one for source code files.

Syntax: *object*.**SetCodeFilters**

The same pairs as [**cDialog.SetCodeFilters**](cDialog/SetCodeFilters). Like the three methods below, it builds a filter with no closing pipe, so the dialog shows no list until one is added; see the warning at the top of the page.

### SetCommonFilters
{: .no_toc }

Replaces the filter with Text Files and All Files.

Syntax: *object*.**SetCommonFilters**

The same pairs as [**cDialog.SetCommonFilters**](cDialog/SetCommonFilters).

### SetCustomIcon
{: .no_toc }

Sets an icon from a handle.

Syntax: *object*.**SetCustomIcon** ( *iconHandle* )

*iconHandle* is a **LongPtr**, the handle of an icon (**HICON**). The dialogs show the icon in the title bar and do not destroy it: the program owns the handle and must destroy it. The icon is applied when the dialog opens, and the dialog accepts files as before.

### SetDocumentFilters
{: .no_toc }

Replaces the filter with one for office documents.

Syntax: *object*.**SetDocumentFilters**

The same pairs as [**cDialog.SetDocumentFilters**](cDialog/SetDocumentFilters).

### SetImageFilters
{: .no_toc }

Replaces the filter with one for image files.

Syntax: *object*.**SetImageFilters**

The same pairs as [**cDialog.SetImageFilters**](cDialog/SetImageFilters).

### SetSystemIcon
{: .no_toc }

Sets one of the icons of Windows.

Syntax: *object*.**SetSystemIcon** ( *iconId* )

*iconId* is a member of [**SystemIconId**](#systemiconid). The class loads the icon with `SHGetStockIconInfo`, large if it can and small otherwise, shows it in the title bar of the dialogs, and destroys it when it is replaced, cleared or the object ends. **SIID_INVALID** and an icon that cannot be loaded leave the dialog without an icon.

### ShowBrowseForFolder
{: .no_toc }

Shows the folder dialog and returns the folder that the user chose.

Syntax: *object*.**ShowBrowseForFolder** ( ) **As String**

The dialog is the Open dialog in `FOS_PICKFOLDERS` mode with `FOS_FORCEFILESYSTEM` and `FOS_PATHMUSTEXIST`, and with `FOS_NOCHANGEDIR` when [**NoChangeDir**](#nochangedir) is **True**. The title is [**DialogTitle**](#dialogtitle). The button is *Select Folder*. The result is a **String**: the **name** of the folder (see the first warning), and for a folder with no file-system name, such as the *Documents* library when the user confirms with nothing typed, the text `::{D3162B92-9365-467A-956B-92703ACA08AF}`. A name typed into the box that is a file raises a box and the dialog stays open. A cancel returns an empty string. The method stores the result in [**FileName**](#filename) and leaves [**InitialDir**](#initialdir) as it was.

### ShowOpen
{: .no_toc }

Shows the Open dialog and returns the chosen file.

Syntax: *object*.**ShowOpen** ( ) **As Variant**

Returns a **Variant**: a **String** for one file, an empty string for a cancel, and, with [**MultiSelect**](#multiselect) **True** and two or more files chosen, an array of **String** values (0-based, in the order in which the names were typed). Each value is a name; see the first warning at the top of the page. With [**PickFolders**](#pickfolders) **True** it shows the folder dialog. A confirmed result goes into [**FileName**](#filename). Test the result with **IsArray**, or call [**SelectFiles**](#selectfiles).

### ShowSave
{: .no_toc }

Shows the Save As dialog and returns the file name that the user chose.

Syntax: *object*.**ShowSave** ( ) **As String**

Returns the name of the file (see the first warning at the top of the page) or an empty string for a cancel. The dialog starts with [**FileName**](#filename) in the File name box, and adds [**DefaultExt**](#defaultext) to a name typed without an extension. It asks before it replaces a file when [**OverwritePrompt**](#overwriteprompt) is **True**. The result goes into **FileName**.

## SystemIconId

The icons of [**SetSystemIcon**](#setsystemicon). The members can be written without the class name.

| Member | Value | Icon |
|---|---|---|
| **SIID_INVALID** | -1 | none |
| **SIID_DOCUMENT** | 0 | a document |
| **SIID_FOLDER** | 3 | a folder |
| **SIID_FOLDEROPEN** | 5 | an open folder |
| **SIID_DISK** | 6 | a disk |
| **SIID_DRIVEFIXED** | 8 | a fixed drive |
| **SIID_DRIVECD** | 10 | a CD drive |
| **SIID_DRIVEHD** | 11 | a hard drive |
| **SIID_SERVER** | 15 | a server |
| **SIID_SHARE** | 28 | a shared folder |
| **SIID_STAROFFILE** | 30 | a file with a star |

```tb check_build
Dim dlg As New cDialogEx
dlg.SetSystemIcon SIID_FOLDER
dlg.DialogTitle = "Choose a project folder"
dlg.PickFolders = True
Debug.Print dlg.ShowOpen()
dlg.ClearIcon
```
<!-- /test -->

## See Also

- [cDialog](cDialog/) class -- the same dialogs through the Win32 structures, with full paths
- [TBMANLIB_Dialog](.) package -- overview
