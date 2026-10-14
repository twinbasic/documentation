---
title: CommonDialog
parent: VBComDlg Package
permalink: /tB/Packages/Contributed/VBComDlg/CommonDialog
has_toc: false
---

# CommonDialog class
{: .no_toc }

A **CommonDialog** provides access to the Windows common dialogs: File Open, File Save, Color, Font, Print, Print (extended), Page Setup, Folder Browser, Find, and Replace.

The class wraps the Win32 `comdlg32` and `shell32` APIs directly. Each dialog is invoked by calling the corresponding `Show*` method. Every dialog except the extended Print dialog can also be invoked by assigning a numeric code to [**Action**](#action). Properties set before the call initialize the dialog; after the user closes it, the same properties reflect the user's selections.

```tb check_build
Dim dlg As New CommonDialog
dlg.Filter     = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*"
dlg.FilterIndex = 1
dlg.Flags      = CdlOFNFileMustExist

If dlg.ShowOpen() Then
    Debug.Print "Opened: " & dlg.FileName
End If
```

Setting [**CancelError**](#cancelerror) to **True** causes the class to raise run-time error `CdlCancel` (32755) when the user closes a dialog with **Cancel** rather than **OK**. An error handler for this error distinguishes cancellation from a successful selection.

Assigning a value outside the documented range or set of constants to a property raises run-time error 380 (*Invalid property value*). A failure that the sections below do not list raises an error whose number is the code the Windows common-dialog library reports and whose description is "Unexpected error."

> [!NOTE] timeless
> Events such as [**InitDialog**](#initdialog), [**FileValidate**](#filevalidate), and [**ColorValidate**](#colorvalidate) require setting [**HookEvents**](#hookevents) to **True** before calling the `Show*` method. Without the hook, these events are not raised. The Folder Browser dialog always raises its events, and the Help, Find and Replace events do not use the hook.

* TOC
{:toc}

## Owner window

The owner of a dialog is the active window of the calling thread. If that window has an MDI client window, the owner is the active MDI child, or the MDI client itself when it has no active child.

When the thread has no active window --- in a program that has no form, for example --- the File Open, File Save, Color, Font, Print, Page Setup and Folder Browser dialogs have no owner and are task-modal, as a message box with the **MB_TASKMODAL** style is: while the dialog is shown, the class disables every enabled top-level window of the thread, and it enables those windows again when the dialog closes. A window that was already disabled stays disabled. The extended Print dialog needs an owner, so it then uses the desktop window, and is task-modal in the same way. The Find and Replace dialogs also need an owner, so they are given a hidden one (see [**ShowFind**](#showfind)).

## Properties

### Action
{: .no_toc }

Invokes a dialog by numeric code. Write-only; reading raises run-time error 394. **Default property.**

Syntax: *object*.**Action** = *value*

*value*
: An **Integer** in the range 1--10 selecting the dialog to show: 1 = [**ShowOpen**](#showopen), 2 = [**ShowSave**](#showsave), 3 = [**ShowColor**](#showcolor), 4 = [**ShowFont**](#showfont), 5 = [**ShowPrinter**](#showprinter), 6 = [**ShowHelp**](#showhelp), 7 = [**ShowPageSetup**](#showpagesetup), 8 = [**ShowFolderBrowser**](#showfolderbrowser), 9 = [**ShowFind**](#showfind), 10 = [**ShowReplace**](#showreplace).

Assigning a value outside this range raises run-time error 380 (*Invalid property value*). Values 1--10 are equivalent to calling the named `Show*` methods directly.

### CancelError
{: .no_toc }

Determines whether cancelling a dialog raises a run-time error.

Syntax: *object*.**CancelError** [ = *value* ]

*value*
: **Boolean**. When **True**, closing a dialog with **Cancel** (or the **X** button) raises run-time error `CdlCancel` (32755). Default **False**.

### Color
{: .no_toc }

The color selected in the Color dialog, or the initial color shown when the dialog opens (the dialog shows it only when **CdlCCRGBInit** is set in [**Flags**](#flags)). Also used by the Font dialog as the text color when **CdlCFEffects** is set.

Syntax: *object*.**Color** [ = *value* ]

*value*
: A **Long** RGB color value. Pass an **OLE_COLOR** (such as one from the system color constants) or a plain `RGB(r, g, b)` value. The class translates OLE colors to RGB before passing them to the underlying Win32 API.

### ColorMode
{: .no_toc }

The printer color mode. A member of **CdlPRCMConstants**: **CdlPRCMMonochrome** or **CdlPRCMColor**. Default **CdlPRCMColor**.

Syntax: *object*.**ColorMode** [ = *value* ]

Setting this property before calling [**ShowPrinter**](#showprinter) or [**ShowPrinterEx**](#showprinterex) overrides the corresponding DEVMODE field; after the dialog closes, the property reflects the user's selection. [**ShowPageSetup**](#showpagesetup) does not use this property.

### Copies
{: .no_toc }

The number of copies to print. An **Integer**, minimum 1. Default 1.

Syntax: *object*.**Copies** [ = *value* ]

### CustomColors
{: .no_toc }

The 16 custom colors shown in the lower half of the Color dialog.

Syntax: *object*.**CustomColors** [ = *value* ]

*value*
: A single-dimensioned array of up to 16 values. Each element is converted to a **Long** and then to RGB, so it is an RGB value or an OLE color, and a **String** that holds a number is accepted. The first element of the array is the first custom color, whatever the array's lower bound. The class reads the first 16 elements and ignores the rest; with fewer than 16 elements, the remaining colors are unchanged. An element that cannot be converted raises run-time error 13 (*Type mismatch*), or run-time error 94 (*Invalid use of Null*) for a **Null** element, and the elements before it have already been stored. Assigning a multi-dimensional array raises run-time error 5; assigning an unallocated array raises run-time error 91. Assigning `Empty` restores the 16 default colors; any other value that is not an array raises run-time error 380.

The getter returns a **Variant** array of 16 **Long** values (index 0 to 15).

Default: a gradient from white (`&HFFFFFF`) through progressively darker greys to near-black. The Color dialog reads and writes its custom colors in this array.

### DefaultExt
{: .no_toc }

The default file name extension appended by the Save dialog when the user omits the extension. **String**.

Syntax: *object*.**DefaultExt** [ = *value* ]

### DialogTitle
{: .no_toc }

The text shown in the title bar of the File Open and File Save dialogs. **String**. When empty (default), the dialog uses its standard OS title. The Folder Browser dialog shows the text above its folder tree instead. The other dialogs do not use this property.

Syntax: *object*.**DialogTitle** [ = *value* ]

### Duplex
{: .no_toc }

The printer duplex (two-sided printing) mode. A member of **CdlPRDPConstants**: **CdlPRDPSimplex**, **CdlPRDPHorizontal**, or **CdlPRDPVertical**. Default **CdlPRDPSimplex**.

Syntax: *object*.**Duplex** [ = *value* ]

### FileName
{: .no_toc }

The path and file name selected in the File Open or File Save dialog, or the initial value shown in the filename box when the dialog opens.

Syntax: *object*.**FileName** [ = *value* ]

*value*
: **String**. When **CdlOFNAllowMultiSelect** and **CdlOFNExplorer** are set and the user picks multiple files, **FileName** returns the directory name first, followed by the selected file names (without directory), each separated by a null character. [**FileTitle**](#filetitle) is then empty.

### FileOffset
{: .no_toc }

The zero-based character offset from the beginning of [**FileName**](#filename) to the start of the file name part (that is, the character immediately after the last backslash). Read-only; writing raises run-time error 383.

Syntax: *object*.**FileOffset**

### FileTitle
{: .no_toc }

The file name without the directory path, as returned by the File Open or File Save dialog. Read-only; writing raises run-time error 383.

Syntax: *object*.**FileTitle**

### Filter
{: .no_toc }

The file-type filter list shown in the "Files of type" combo box of the File Open and File Save dialogs. **String**.

Syntax: *object*.**Filter** [ = *value* ]

*value*
: A pipe-delimited string alternating between display names and filter patterns: `"Text Files (*.txt)|*.txt|All Files (*.*)|*.*"`. Each pair is one entry in the list.

### FilterIndex
{: .no_toc }

The one-based index of the initially selected filter in the [**Filter**](#filter) list. **Long**, minimum 0 (the Windows dialog treats 0 as the first filter). Default 0. After the user closes the File Open or File Save dialog with **OK**, the property holds the index of the filter that was selected.

Syntax: *object*.**FilterIndex** [ = *value* ]

### FindWhat
{: .no_toc }

The search string displayed in the Find or Replace dialog's "Find what" field. **String**.

Syntax: *object*.**FindWhat** [ = *value* ]

### Flags
{: .no_toc }

A **Long** bitmask of option flags passed to the active dialog. The applicable constants depend on which dialog is being shown:

- File dialogs: **CdlOFNConstants** (e.g. **CdlOFNFileMustExist**, **CdlOFNOverwritePrompt**, **CdlOFNAllowMultiSelect**)
- Color dialog: **CdlCCConstants** (e.g. **CdlCCFullOpen**, **CdlCCSolidColor**)
- Font dialog: **CdlCFConstants** (e.g. **CdlCFScreenFonts**, **CdlCFEffects**, **CdlCFLimitSize**)
- Print dialog: **CdlPDConstants** (e.g. **CdlPDAllPages**, **CdlPDPageNums**, **CdlPDReturnDC**)
- Page Setup dialog: **CdlPSDConstants** (e.g. **CdlPSDMargins**, **CdlPSDInThousandthsOfInches**)
- Folder Browser dialog: **CdlBIFConstants** (e.g. **CdlBIFNewDialogStyle**, **CdlBIFEditBox**)
- Find/Replace dialogs: **CdlFRConstants** (e.g. **CdlFRDown**, **CdlFRMatchCase**, **CdlFRWholeWord**)

Syntax: *object*.**Flags** [ = *value* ]

After the File Open, File Save, Color, Font, Print, Print (extended) and Page Setup dialogs close with **OK** or **Print**, **Flags** is updated to reflect the flags as the dialog returned them (excluding internal hook flags, which are stripped automatically). The Find and Replace dialogs update it before each event; the Folder Browser dialog leaves it unchanged.

### FontBold
{: .no_toc }

Whether the font selected in the Font dialog is bold. **Boolean**. Mapped from [**FontWeight**](#fontweight): **True** when **FontWeight** is 600 or higher.

Syntax: *object*.**FontBold** [ = *value* ]

Setting **FontBold** to **True** sets **FontWeight** to 700 (FW_BOLD); **False** sets it to 400 (FW_NORMAL).

### FontCharset
{: .no_toc }

The character set of the selected font. **Integer**. Default 0 (ANSI_CHARSET). Setting this property before [**ShowFont**](#showfont) pre-selects the script in the dialog.

Syntax: *object*.**FontCharset** [ = *value* ]

### FontItalic
{: .no_toc }

Whether the selected font is italic. **Boolean**, default **False**.

Syntax: *object*.**FontItalic** [ = *value* ]

### FontName
{: .no_toc }

The face name of the selected font. **String**, default empty.

Syntax: *object*.**FontName** [ = *value* ]

### FontSize
{: .no_toc }

The point size of the selected font. **Single**, default 8.

Syntax: *object*.**FontSize** [ = *value* ]

### FontStrikethru
{: .no_toc }

Whether the selected font has strikethrough applied. **Boolean**, default **False**.

Syntax: *object*.**FontStrikethru** [ = *value* ]

### FontUnderline
{: .no_toc }

Whether the selected font is underlined. **Boolean**, default **False**.

Syntax: *object*.**FontUnderline** [ = *value* ]

### FontWeight
{: .no_toc }

The numeric weight of the selected font, corresponding to the Win32 LOGFONT `lfWeight` field. **Integer**, default 400 (FW_NORMAL).

Syntax: *object*.**FontWeight** [ = *value* ]

*value*
: One of the standard Win32 weight constants: 0, 100, 200, 300, 400, 500, 600, 700, 800, or 900. Any other value raises run-time error 380.

### FromPage
{: .no_toc }

The first page number entered in the Print dialog's page-range field. **Long**, minimum 0. Default 0.

Syntax: *object*.**FromPage** [ = *value* ]

### hDC
{: .no_toc }

A handle to a device context or information context, as returned by the Print or extended Print dialog when **CdlPDReturnDC** or **CdlPDReturnIC** is set in [**Flags**](#flags). A **LongPtr** (the same size as a **Long** in 32-bit builds). Read-only; writing raises run-time error 383.

Syntax: *object*.**hDC**

The handle is freed when the **CommonDialog** object is destroyed, or when a later Print dialog returns a new one. Do not free it separately.

### HelpCommand
{: .no_toc }

The type of help to invoke when [**ShowHelp**](#showhelp) is called. A member of **CdlHelpConstants**, or 0 (the default), for which **ShowHelp** does nothing. Any other value raises run-time error 380.

Syntax: *object*.**HelpCommand** [ = *value* ]

| Constant | Description |
|----------|-------------|
| **CdlHelpContext** | Displays the topic identified by [**HelpContext**](#helpcontext). |
| **CdlHelpContents** | Displays the table of contents. |
| **CdlHelpForceFile** | Forces WinHelp to display the correct file. |
| **CdlHelpHelpOnHelp** | Displays help on using Help itself. |
| **CdlHelpIndex** | Displays the index. |
| **CdlHelpKey** | Displays help for the keyword in [**HelpKey**](#helpkey). |
| **CdlHelpPartialKey** | Displays the topic whose keyword matches [**HelpKey**](#helpkey), or lists the matching topics when there are several. |
| **CdlHelpCommandHelp** | Executes the help macro in [**HelpKey**](#helpkey). |
| **CdlHelpContextPopup** | Displays a pop-up for the topic in [**HelpContext**](#helpcontext). |
| **CdlHelpQuit** | Closes the help file. |
| **CdlHelpSetContents** | Sets the table of contents topic. |
| **CdlHelpSetIndex** | Sets the context specified by [**HelpContext**](#helpcontext) as the current index. |

### HelpContext
{: .no_toc }

The numeric context ID of the help topic, used when **HelpCommand** is **CdlHelpContext**, **CdlHelpContextPopup**, **CdlHelpSetIndex**, or **CdlHelpSetContents**. A **LongPtr** (the same size as a **Long** in 32-bit builds). Default 0.

Syntax: *object*.**HelpContext** [ = *value* ]

### HelpFile
{: .no_toc }

The path to the `.hlp` file opened by [**ShowHelp**](#showhelp). **String**.

Syntax: *object*.**HelpFile** [ = *value* ]

### HelpKey
{: .no_toc }

The help keyword or macro string used when **HelpCommand** is **CdlHelpKey**, **CdlHelpPartialKey**, or **CdlHelpCommandHelp**. **String**.

Syntax: *object*.**HelpKey** [ = *value* ]

### HookEvents
{: .no_toc }

Enables the hook callback required to raise certain events.

Syntax: *object*.**HookEvents** [ = *value* ]

*value*
: **Boolean**. When **True**, the dialog's hook procedure is installed, enabling the [**InitDialog**](#initdialog), [**FileValidate**](#filevalidate), [**FileShareViolation**](#fileshareviolation), [**ColorValidate**](#colorvalidate), and [**FontApply**](#fontapply) events. Default **False**. The Folder Browser dialog raises [**InitDialog**](#initdialog) and [**FolderBrowserValidateFailed**](#folderbrowservalidatefailed) whatever the value.

> [!IMPORTANT] timeless
> **HookEvents** must be set to **True** before calling the corresponding `Show*` method. Setting it after the call has no effect on the current invocation.

### InitDir
{: .no_toc }

The directory shown initially in the File Open and File Save dialogs, and the folder initially selected in the Folder Browser dialog. **String**. Default empty (the OS chooses the initial directory).

Syntax: *object*.**InitDir** [ = *value* ]

### Max
{: .no_toc }

The maximum font size (points) in the Font dialog, or the maximum page number in the Print dialog. **Long**, minimum 0. Default 0. The Font dialog applies the font-size range only when **CdlCFLimitSize** is set in [**Flags**](#flags).

Syntax: *object*.**Max** [ = *value* ]

### MaxFileSize
{: .no_toc }

The maximum number of characters in the file name buffer used by the File Open and File Save dialogs. **Long**, minimum 1. Default 260 (MAX_PATH).

Syntax: *object*.**MaxFileSize** [ = *value* ]

### Min
{: .no_toc }

The minimum font size (points) in the Font dialog, or the minimum page number in the Print dialog. **Long**, minimum 0. Default 0. The Font dialog applies the font-size range only when **CdlCFLimitSize** is set in [**Flags**](#flags).

Syntax: *object*.**Min** [ = *value* ]

### Object
{: .no_toc }

Returns the **CommonDialog** instance itself as an **Object**. Read-only.

Syntax: *object*.**Object**

### Orientation
{: .no_toc }

The paper orientation. A member of **CdlPRORConstants**: **CdlPRORPortrait** or **CdlPRORLandscape**. Default **CdlPRORPortrait**.

Syntax: *object*.**Orientation** [ = *value* ]

### PageBottomMargin
{: .no_toc }

The bottom margin size in the Page Setup dialog, in the unit described under [**PageTopMinMargin**](#pagetopminmargin). **Long**, minimum 0.

Syntax: *object*.**PageBottomMargin** [ = *value* ]

### PageBottomMinMargin
{: .no_toc }

The minimum allowed bottom margin in the Page Setup dialog. **Long**, minimum 0.

Syntax: *object*.**PageBottomMinMargin** [ = *value* ]

### PageLeftMargin
{: .no_toc }

The left margin size. **Long**, minimum 0.

Syntax: *object*.**PageLeftMargin** [ = *value* ]

### PageLeftMinMargin
{: .no_toc }

The minimum allowed left margin. **Long**, minimum 0.

Syntax: *object*.**PageLeftMinMargin** [ = *value* ]

### PageRightMargin
{: .no_toc }

The right margin size. **Long**, minimum 0.

Syntax: *object*.**PageRightMargin** [ = *value* ]

### PageRightMinMargin
{: .no_toc }

The minimum allowed right margin. **Long**, minimum 0.

Syntax: *object*.**PageRightMinMargin** [ = *value* ]

### PageTopMargin
{: .no_toc }

The top margin size. **Long**, minimum 0.

Syntax: *object*.**PageTopMargin** [ = *value* ]

### PageTopMinMargin
{: .no_toc }

The minimum allowed top margin. **Long**, minimum 0.

Syntax: *object*.**PageTopMinMargin** [ = *value* ]

The unit for all margin properties is controlled by **CdlPSDInThousandthsOfInches** or **CdlPSDInHundredthsOfMillimeters** in [**Flags**](#flags). When neither flag is set, the unit is thousandths of inches on US locale systems and hundredths of millimetres on metric locale systems. The dialog starts with the margin properties only when **CdlPSDMargins** is set in **Flags**, and with the minimum-margin properties only when **CdlPSDMinMargins** is set. After the dialog closes with **OK**, the four margin properties hold the user's margins; the minimum-margin properties are not updated.

### PaperBin
{: .no_toc }

The paper source (bin) used by the printer. A member of **CdlPRBNConstants** (e.g. **CdlPRBNUpper**, **CdlPRBNLower**, **CdlPRBNAuto**). Default **CdlPRBNAuto**.

Syntax: *object*.**PaperBin** [ = *value* ]

### PaperSize
{: .no_toc }

The paper size. A member of **CdlPRPSConstants** (e.g. **CdlPRPSLetter**, **CdlPRPSA4**). Default is **CdlPRPSA4** on metric systems and **CdlPRPSLetter** on US systems.

Syntax: *object*.**PaperSize** [ = *value* ]

### PrinterDefault
{: .no_toc }

When **True**, the printer selected in the Print dialog is set as the system default printer after the dialog closes. **Boolean**, default **True**.

Syntax: *object*.**PrinterDefault** [ = *value* ]

### PrinterDefaultInit
{: .no_toc }

When **True**, the Print, Print (extended) and Page Setup dialogs always initialize from the system default printer, ignoring [**PrinterName**](#printername). **Boolean**, default **True**. [**PrinterDriver**](#printerdriver) and [**PrinterPort**](#printerport) are never used to initialize a dialog.

Syntax: *object*.**PrinterDefaultInit** [ = *value* ]

### PrinterDriver
{: .no_toc }

The driver name of the printer selected by the Print dialog. **String**. Read back after [**ShowPrinter**](#showprinter) or [**ShowPrinterEx**](#showprinterex) returns.

Syntax: *object*.**PrinterDriver** [ = *value* ]

### PrinterName
{: .no_toc }

The device name of the printer selected by the Print dialog. **String**. Set before calling [**ShowPrinter**](#showprinter), [**ShowPrinterEx**](#showprinterex) or [**ShowPageSetup**](#showpagesetup) (with [**PrinterDefaultInit**](#printerdefaultinit) set to **False**) to pre-select a specific printer. When the name is not a valid printer, the dialog initializes from the system default printer.

Syntax: *object*.**PrinterName** [ = *value* ]

### PrinterPort
{: .no_toc }

The output port of the selected printer. **String**. Read back after [**ShowPrinter**](#showprinter) or [**ShowPrinterEx**](#showprinterex) returns.

Syntax: *object*.**PrinterPort** [ = *value* ]

### PrintQuality
{: .no_toc }

The printer resolution. A member of **CdlPRPQConstants** (**CdlPRPQHigh**, **CdlPRPQMedium**, **CdlPRPQLow**, **CdlPRPQDraft**) or an integer from 0 to 32767 giving a resolution in dots per inch. Default **CdlPRPQHigh**.

Syntax: *object*.**PrintQuality** [ = *value* ]

### ReplaceWith
{: .no_toc }

The replacement string displayed in the Replace dialog's "Replace with" field. **String**.

Syntax: *object*.**ReplaceWith** [ = *value* ]

### RootFolder
{: .no_toc }

The root of the folder tree shown in the Folder Browser dialog. **Variant**.

Syntax: *object*.**RootFolder** [ = *value* ]

*value*
: **Empty** (default) to use the Desktop as the root; an integer CSIDL constant (e.g. `CSIDL_DRIVES = &H11`) to start from a shell folder; or a **String** absolute path to start from a specific directory. Floating-point values are converted to **Long** before use as CSIDL constants. Other types raise run-time error 380.

### Tag
{: .no_toc }

A free-form **String** that the application can use to associate custom data with the instance. Ignored by the class.

Syntax: *object*.**Tag** [ = *value* ]

### ToPage
{: .no_toc }

The last page number entered in the Print dialog's page-range field. **Long**, minimum 0. Default 0.

Syntax: *object*.**ToPage** [ = *value* ]

## Methods

### ShowColor
{: .no_toc }

Displays the Color dialog and returns **True** if the user clicked **OK**.

Syntax: *object*.**ShowColor** ( ) **As Boolean**

The dialog starts with the current [**Color**](#color) value when **CdlCCRGBInit** is set in [**Flags**](#flags). On **OK**, [**Color**](#color) is updated with the chosen color and [**Flags**](#flags) is updated to reflect the dialog's returned flags. On cancel with [**CancelError**](#cancelerror) **True**, error `CdlCancel` is raised.

### ShowFind
{: .no_toc }

Opens a modeless Find dialog and returns the dialog's window handle. Returns 0 if the dialog is already open.

Syntax: *object*.**ShowFind** ( ) **As LongPtr**

The dialog is non-modal: it remains open while the user interacts with the application. When the user clicks **Find Next**, [**FindWhat**](#findwhat) and [**Flags**](#flags) are updated and the [**FindNext**](#findnext) event fires. When the dialog closes, the internal handle is released automatically. Call this method again to reopen the dialog. The method returns 0 while a Find or Replace dialog opened by the same **CommonDialog** object is still open. The dialog needs an owner window: when the thread has no active window, the owner is a hidden window that the class creates for the dialog and destroys when the dialog closes.

If the dialog cannot be created, the method raises **CdlBufferLengthZero** (36848) when the *Find what* buffer is invalid.

### ShowFont
{: .no_toc }

Displays the Font dialog and returns **True** if the user clicked **OK**.

Syntax: *object*.**ShowFont** ( ) **As Boolean**

The dialog is pre-loaded with the current font properties. [**Flags**](#flags) must contain **CdlCFScreenFonts**, **CdlCFPrinterFonts**, or both; with neither, the Windows dialog finds no fonts and the method raises **CdlNoFonts**. On **OK**, [**FontName**](#fontname), [**FontWeight**](#fontweight) (and with it [**FontBold**](#fontbold)), [**FontItalic**](#fontitalic), [**FontSize**](#fontsize) and [**FontCharset**](#fontcharset) are updated, except that the name is left unchanged when the flags the dialog returns include **CdlCFNoFaceSel**, the weight and italic style when they include **CdlCFNoStyleSel**, the size when they include **CdlCFNoSizeSel**, and the character set when they include **CdlCFNoScriptSel**. [**FontStrikethru**](#fontstrikethru), [**FontUnderline**](#fontunderline) and [**Color**](#color) are updated only when **CdlCFEffects** is set.

Errors: **CdlMaxLessThanMin** (24573) when [**Max**](#max) < [**Min**](#min); **CdlNoFonts** (24574) when no fonts are available for the specified flags.

### ShowFolderBrowser
{: .no_toc }

Displays the shell Folder Browser dialog and returns **True** if the user selected a folder.

Syntax: *object*.**ShowFolderBrowser** ( ) **As Boolean**

On success, [**FileName**](#filename) is set to the selected path (with a trailing backslash for directories). [**FileTitle**](#filetitle) is set to the file name part when a file is selected rather than a directory; [**FileOffset**](#fileoffset) is the character offset of that name within [**FileName**](#filename). For a directory, **FileTitle** is empty and **FileOffset** is 0. On cancel with [**CancelError**](#cancelerror) **True**, error `CdlCancel` is raised.

[**Flags**](#flags) is passed to the dialog as its **CdlBIFConstants** options and is not updated afterwards. The [**FolderBrowserValidateFailed**](#folderbrowservalidatefailed) event fires when the user types an invalid path into the dialog's edit box.

### ShowHelp
{: .no_toc }

Invokes the Windows Help system with the file and command specified by [**HelpFile**](#helpfile), [**HelpCommand**](#helpcommand), [**HelpContext**](#helpcontext), and [**HelpKey**](#helpkey).

Syntax: *object*.**ShowHelp**

If [**HelpCommand**](#helpcommand) is 0, the method returns immediately without doing anything. On failure, error `CdlHelp` (32751) is raised.

> [!NOTE] timeless
> WinHelp (`.hlp`) is a deprecated help format. This method calls the `WinHelpW` API, which fails on a system that has no WinHelp viewer.

### ShowOpen
{: .no_toc }

Displays the File Open dialog and returns **True** if the user selected a file.

Syntax: *object*.**ShowOpen** ( ) **As Boolean**

On **OK**, [**FileName**](#filename), [**FileTitle**](#filetitle), [**FileOffset**](#fileoffset), [**FilterIndex**](#filterindex) and [**Flags**](#flags) are updated to reflect the selection. [**MaxFileSize**](#maxfilesize) sets the size of the buffer that receives the file name. Possible errors: **CdlBufferTooSmall** (20476), **CdlInvalidFileName** (20477), **CdlSubclassFailure** (20478).

### ShowPageSetup
{: .no_toc }

Displays the Page Setup dialog and returns **True** if the user clicked **OK**.

Syntax: *object*.**ShowPageSetup** ( ) **As Boolean**

On **OK**, the margin properties ([**PageLeftMargin**](#pageleftmargin) etc.), [**Orientation**](#orientation), [**PaperSize**](#papersize), [**PaperBin**](#paperbin) and [**Flags**](#flags) are updated. The same printer error codes as [**ShowPrinter**](#showprinter) may be raised.

### ShowPrinter
{: .no_toc }

Displays the standard Print dialog and returns **True** if the user clicked **OK** or **Print**.

Syntax: *object*.**ShowPrinter** ( ) **As Boolean**

On **OK**, printer-related properties ([**PrinterName**](#printername), [**PrinterDriver**](#printerdriver), [**PrinterPort**](#printerport), [**Orientation**](#orientation), [**PaperSize**](#papersize), [**Copies**](#copies), etc.) are updated. When **CdlPDReturnDC** or **CdlPDReturnIC** is in [**Flags**](#flags), [**hDC**](#hdc) is set.

Possible errors: **CdlPrinterNotFound** (28660), **CdlCreateICFailure** (28661), **CdlDndmMismatch** (28662), **CdlNoDefaultPrn** (28663), **CdlNoDevices** (28664), **CdlInitFailure** (28665), **CdlGetDevModeFail** (28666), **CdlLoadDrvFailure** (28667), **CdlRetDefFailure** (28668), **CdlParseFailure** (28669).

### ShowPrinterEx
{: .no_toc }

Displays the extended Print dialog (the `PrintDlgEx` function) and returns a **CdlPDResultConstants** value.

Syntax: *object*.**ShowPrinterEx** ( ) **As CdlPDResultConstants**

Returns **CdlPDResultPrint** (1) when the user clicked **Print**, **CdlPDResultApply** (2) for **Apply**, or **CdlPDResultCancel** (0) for **Cancel**. Properties are updated on non-cancel results, the same as [**ShowPrinter**](#showprinter). When the user chooses **Cancel** and [**CancelError**](#cancelerror) is **True**, error `CdlCancel` is raised. The extended dialog requires a valid owner window; when the thread has no active window, the method uses the desktop window as the owner, and the dialog is task-modal (see [Owner window](#owner-window)). When `PrintDlgEx` fails with an out-of-memory, invalid-argument, invalid-pointer, invalid-handle or unspecified error, the method raises **CdlInitFailure** (28665).

### ShowReplace
{: .no_toc }

Opens a modeless Replace dialog and returns the dialog's window handle. Returns 0 if the dialog is already open.

Syntax: *object*.**ShowReplace** ( ) **As LongPtr**

Works identically to [**ShowFind**](#showfind), with the addition that the [**Replace**](#replace) event fires when the user clicks **Replace**, and the [**ReplaceAll**](#replaceall) event is declared for **Replace All** (but see the note under that event). The dialog starts with the current [**ReplaceWith**](#replacewith) text, and **ReplaceWith** is updated before each event. If the dialog cannot be created, the method raises **CdlBufferLengthZero** (36848) when the *Find what* or *Replace with* buffer is invalid.

### ShowSave
{: .no_toc }

Displays the File Save dialog and returns **True** if the user selected a file.

Syntax: *object*.**ShowSave** ( ) **As Boolean**

Behaves identically to [**ShowOpen**](#showopen). [**DefaultExt**](#defaultext) is applied when the user does not type an extension.

## Events

### ColorValidate
{: .no_toc }

Raised when the user clicks **OK** in the Color dialog, before the dialog closes. Requires [**HookEvents**](#hookevents) **True**.

Syntax: *object*\_**ColorValidate**( *RGBColor* **As Long**, *Cancel* **As Boolean**, *hDlg* **As Long** )

*RGBColor*
: The color the user selected, as an RGB **Long**. The handler may modify this value, but a change takes effect only when *Cancel* is set to **True**: the dialog then stays open and shows the modified color. When *Cancel* is **False**, the change is discarded and [**Color**](#color) receives the color the user chose.

*Cancel*
: Set to **True** to keep the dialog open (for example, to show a validation message before refusing the selection).

*hDlg*
: The Win32 window handle of the dialog. Pass it to API functions that need to interact with the dialog.

### FileShareViolation
{: .no_toc }

Raised when a network sharing violation occurs for the selected file in the File Open or File Save dialog. Requires [**HookEvents**](#hookevents) **True**. The Windows dialog does not report sharing violations when **CdlOFNShareAware** is set in [**Flags**](#flags).

Syntax: *object*\_**FileShareViolation**( *FileName* **As String**, *Result* **As CdlOFNShareViResultConstants**, *hDlg* **As Long** )

*FileName*
: The path of the file that caused the sharing violation.

*Result*
: Set to a **CdlOFNShareViResultConstants** value to control the dialog's response: **CdlOFNShareViResultWarn** (0, default --- show a warning), **CdlOFNShareViResultNoWarn** (1 --- silently reject), or **CdlOFNShareViResultFallThrough** (2 --- accept the selection despite the violation).

*hDlg*
: The Win32 window handle of the dialog.

### FileValidate
{: .no_toc }

Raised when the user clicks **OK** in the File Open or File Save dialog, before the dialog closes. Requires [**HookEvents**](#hookevents) **True**. The event is raised whether or not **CdlOFNExplorer** is set in [**Flags**](#flags).

Syntax: *object*\_**FileValidate**( *FileName* **As String**, *FileTitle* **As String**, *FileOffset* **As Integer**, *Cancel* **As Boolean**, *hDlg* **As Long** )

*FileName*
: The full path selected by the user.

*FileTitle*
: The file name without the directory path.

*FileOffset*
: The zero-based character offset to the start of the file name within *FileName*.

*Cancel*
: Set to **True** to prevent the dialog from closing (for example, to reject the selection and prompt the user again).

*hDlg*
: The Win32 window handle of the dialog.

### FindNext
{: .no_toc }

Raised when the user clicks **Find Next** in the Find or Replace dialog.

Syntax: *object*\_**FindNext**( )

When this event fires, [**FindWhat**](#findwhat) and [**Flags**](#flags) have already been updated to reflect the current state of the dialog.

### FolderBrowserValidateFailed
{: .no_toc }

Raised when the user types an invalid path into the Folder Browser dialog's edit box and the dialog rejects it. Requires **CdlBIFEditBox** and **CdlBIFValidate** in [**Flags**](#flags). The event is raised whether or not [**HookEvents**](#hookevents) is **True**.

Syntax: *object*\_**FolderBrowserValidateFailed**( *Text* **As String**, *Cancel* **As Boolean**, *hDlg* **As Long** )

*Text*
: The invalid string the user typed.

*Cancel*
: Set to **True** to keep the dialog open so that the user can correct the text. When it stays **False**, the dialog closes.

*hDlg*
: The Win32 window handle of the dialog.

### FontApply
{: .no_toc }

Raised when the user clicks **Apply** in the Font dialog. Requires [**HookEvents**](#hookevents) **True** and the **CdlCFApply** flag set.

Syntax: *object*\_**FontApply**( *Flags* **As Long**, *FontName* **As String**, *FontSize* **As Single**, *FontBold* **As Boolean**, *FontItalic* **As Boolean**, *FontStrikethru* **As Boolean**, *FontUnderline* **As Boolean**, *FontCharset* **As Integer**, *RGBColor* **As Long**, *hDlg* **As Long** )

The parameters contain the font settings as they stand at the time the user clicks **Apply**. *FontBold* is **True** when the font weight is 600 or higher, and *RGBColor* is the color selected in the dialog's color list. The class's own properties are not updated by this event --- update them from the event parameters if needed.

### Help
{: .no_toc }

Raised when the user clicks the **Help** button in a dialog box. Requires a non-null owner window and the help flag (e.g. **CdlOFNHelpButton**) set in [**Flags**](#flags).

Syntax: *object*\_**Help**( *Handled* **As Boolean**, *Action* **As Integer**, *hDlg* **As Long** )

*Handled*
: Set to **True** to suppress the default **ShowHelp** call that the class would otherwise make automatically.

*Action*
: An **Integer** identifying which dialog raised the event: 1 = Open, 2 = Save, 3 = Color, 4 = Font, 5 = Print, 7 = Page Setup, 9 = Find, 10 = Replace.

*hDlg*
: The Win32 window handle of the dialog.

### InitDialog
{: .no_toc }

Raised after a dialog has finished initializing but before it becomes visible. Requires [**HookEvents**](#hookevents) **True**, except for the Folder Browser dialog.

Syntax: *object*\_**InitDialog**( *Action* **As Integer**, *hDlg* **As Long** )

*Action*
: An **Integer** identifying which dialog fired the event, using the numbers of the [**Action**](#action) property (1 = Open ... 10 = Replace).

*hDlg*
: The Win32 window handle of the dialog. Pass it to API functions (e.g. `SetWindowText`) to customize the dialog before it is shown.

### Replace
{: .no_toc }

Raised when the user clicks **Replace** in the Replace dialog.

Syntax: *object*\_**Replace**( )

[**FindWhat**](#findwhat), [**ReplaceWith**](#replacewith), and [**Flags**](#flags) are updated before the event fires.

### ReplaceAll
{: .no_toc }

Declared for the **Replace All** button of the Replace dialog.

Syntax: *object*\_**ReplaceAll**( )

> [!NOTE] 1.0.13.0
> Of the package the class never raises this event. Its test for the **Replace All** button compares the masked flags with **CdlFRFindNext** instead of **CdlFRReplaceAll**, so the comparison is never true. Clicking **Replace All** raises none of the events.

## Example

This example shows a File Open dialog filtered to text files, then reads and prints the first line of the selected file.

```tb check_build
Private Sub OpenTextFile()
    Dim dlg As New CommonDialog
    dlg.Filter      = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*"
    dlg.FilterIndex = 1
    dlg.InitDir     = "C:\Users"
    dlg.Flags       = CdlOFNFileMustExist Or CdlOFNHideReadOnly
    dlg.CancelError = True

    On Error Resume Next
    dlg.ShowOpen
    If Err.Number = CdlCancel Then
        Debug.Print "User cancelled."
        Exit Sub
    ElseIf Err.Number <> 0 Then
        Debug.Print "Error: " & Err.Description
        Exit Sub
    End If
    On Error GoTo 0

    Dim fNum As Integer
    fNum = FreeFile
    Open dlg.FileName For Input As #fNum
    Dim line1 As String
    Line Input #fNum, line1
    Close #fNum
    Debug.Print "First line: " & line1
End Sub
```

## See Also

- [VBComDlg](.) package -- overview
