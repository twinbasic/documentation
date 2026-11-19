---
title: CommonDialog
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/CommonDialog
has_toc: false
symbols:
  - CommonDialog
  - CdlBIFConstants
  - CdlCCConstants
  - CdlCFConstants
  - CdlErrorConstants
  - CdlFRConstants
  - CdlHelpConstants
  - CdlOFNConstants
  - CdlOFNShareViResultConstants
  - CdlPDConstants
  - CdlPDResultConstants
  - CdlPRBNConstants
  - CdlPRCMConstants
  - CdlPRDPConstants
  - CdlPRORConstants
  - CdlPRPQConstants
  - CdlPRPSConstants
  - CdlPSDConstants
---

# CommonDialog class
{: .no_toc }

A **CommonDialog** shows the common dialog boxes of Windows: Open, Save As, Color, Font, Print, Page Setup, Browse for Folder, Find and Replace. It also opens a Windows Help file.

```tb check_build
Private Sub mnuOpen_Click()
    Dim Dlg As New CommonDialog
    Dlg.Filter = "Text files (*.txt)|*.txt|All files (*.*)|*.*"
    Dlg.Flags = CdlOFNFileMustExist Or CdlOFNHideReadOnly
    If Dlg.ShowOpen Then Debug.Print Dlg.FileName
End Sub
```

It is a class, not a control: a program makes one with **New**, sets its properties, and calls one of its **Show** methods, which returns when the user closes the dialog. The properties then hold what the user chose. It stands in place of the CommonDialog control of `COMDLG32.OCX`, which is drawn on a form, and adds the Page Setup, Browse for Folder, Find and Replace dialogs.

## The same class as VBComDlg's

The [VBComDlg](../VBComDlg/) package is the same class, Krool's, as a package of its own, documented at [**CommonDialog**](../VBComDlg/CommonDialog). The two share all their code but one line:

- **The same in both**: every property, method and event, with the same names, types and defaults, the same values refused with run-time error 380 and the same errors from the dialogs; and every enumeration, with the same members and values.
- **The [ReplaceAll](#findnext-replace-replaceall) event**: this class raises it when the user clicks **Replace All** in the Replace dialog. VBComDlg's class never raises it.
- **The package**: this class comes with the package's controls, and the [**MCIWnd**](MCIWnd) control uses it for its Open and Save As dialogs. VBComDlg is for a program that needs the dialogs and none of the controls.

In a project that references both packages, a declaration names the package: `Dim Dlg As VBCCR18.CommonDialog`.

* TOC
{:toc}

## Before and after a dialog

The properties that a dialog reads are its starting values, and the dialog writes the user's choice back to them when the user clicks **OK**: [**FileName**](#filename) for the Open dialog, [**Color**](#color) for the Color dialog, [**FontName**](#fontname) and the other font properties for the Font dialog. [**Flags**](#flags) holds the options of the dialog shown next, from the enumeration of that dialog, and holds the flags the dialog returned after it closes. A new object has these values:

<!-- test: CommonDialogTests.Defaults_OfANewObject, CommonDialogTests.FontBold_True_SetsTheWeightTo700, CommonDialogTests.FontWeight_OtherValue_Raises380 -->
```tb check_build check_run arch=win32,win64
Dim Dlg As New CommonDialog
Debug.Print Dlg.MaxFileSize; Dlg.Copies; Dlg.FontSize; Dlg.FontWeight; Dlg.Flags
Dlg.FontBold = True
Debug.Print Dlg.FontWeight
On Error Resume Next
Dlg.FontWeight = 450
Debug.Print Err.Number
' Output:
'  260  1  8  400  0
'  700
'  380
```
<!-- /test -->

The printer properties, [**Orientation**](#orientation), [**PaperSize**](#papersize), [**PaperBin**](#paperbin), [**PrintQuality**](#printquality), [**ColorMode**](#colormode) and [**Duplex**](#duplex), change the printer's settings in the Print dialog only once the program has set them, or a dialog has returned them: until then the dialog starts with the printer's own.

## Cancel and errors

A **Show** method returns **False** when the user cancels the dialog. With [**CancelError**](#cancelerror) **True** it raises run-time error 32755, **CdlCancel**, instead. When the dialog fails, the method raises one of the errors of [**CdlErrorConstants**](#cdlerrorconstants), or for a failure that has no member there, an error whose number is the code of the Windows common dialogs and whose description is *Unexpected error.*

## Owner window

A dialog belongs to the active window of the program or, when that window is an MDI form, to its active child form. While the program has no active window, a dialog belongs to no window, and the class disables the program's windows while it is shown, as a message box does. The Find and Replace dialogs then belong to a hidden window the class makes for them.

## Events and the hook

[**InitDialog**](#initdialog), [**FileValidate**](#filevalidate), [**FileShareViolation**](#fileshareviolation), [**ColorValidate**](#colorvalidate) and [**FontApply**](#fontapply) are raised only while [**HookEvents**](#hookevents) is **True** when the **Show** method is called. The Browse for Folder dialog raises **InitDialog** and [**FolderBrowserValidateFailed**](#folderbrowservalidatefailed) either way, and the [**Help**](#help), [**FindNext**](#findnext-replace-replaceall), [**Replace**](#findnext-replace-replaceall) and [**ReplaceAll**](#findnext-replace-replaceall) events need no hook. A program that handles the events holds the object **WithEvents**:

```tb check_build
Class ColorPicker
    Private WithEvents Dlg As CommonDialog

    Public Function Pick() As Long
        Set Dlg = New CommonDialog
        Dlg.HookEvents = True
        Dlg.Flags = CdlCCFullOpen
        If Dlg.ShowColor Then Pick = Dlg.Color Else Pick = -1
    End Function

    Private Sub Dlg_ColorValidate(RGBColor As Long, Cancel As Boolean, ByVal hDlg As Long) Handles Dlg.ColorValidate
        Cancel = (RGBColor = vbBlack)            ' black is not allowed: the dialog stays open
    End Sub
End Class
```

Properties
----------

### Action
{: .no_toc }

Shows a dialog by its number: 1 [**ShowOpen**](#showopen), 2 [**ShowSave**](#showsave), 3 [**ShowColor**](#showcolor), 4 [**ShowFont**](#showfont), 5 [**ShowPrinter**](#showprinter), 6 [**ShowHelp**](#showhelp), 7 [**ShowPageSetup**](#showpagesetup), 8 [**ShowFolderBrowser**](#showfolderbrowser), 9 [**ShowFind**](#showfind) and 10 [**ShowReplace**](#showreplace). **Integer**, write-only. It is the default property.

<!-- test: CommonDialogTests.Action_Read_Raises394, CommonDialogTests.Action_OutOfRange_Raises380 -->
Reading it raises run-time error 394, and another number raises run-time error 380.
<!-- /test -->

### CancelError
{: .no_toc }

Whether a dialog that the user cancels raises run-time error 32755, **CdlCancel**. **Boolean**. Default: **False**.

### Color
{: .no_toc }

The color chosen in the Color dialog, and the color of the text chosen in the Font dialog with **CdlCFEffects**. **Long**. Default: 0. The Color dialog starts with it when [**Flags**](#flags) has **CdlCCRGBInit**. A system color, such as **vbButtonFace**, is changed to its RGB value when a dialog reads it.

### ColorMode
{: .no_toc }

Whether the printer prints in color. A member of [**CdlPRCMConstants**](#cdlprcmconstants). Default: **CdlPRCMColor**. Another value raises run-time error 380.

### Copies
{: .no_toc }

The number of copies to print. **Integer**. Default: 1. A value less than 1 raises run-time error 380.

### CustomColors
{: .no_toc }

The 16 custom colors of the Color dialog, which the dialog shows and the user changes. **Variant**: an array of 16 **Long** RGB values, from index 0. Default: shades of grey from white to near black.

<!-- test: CommonDialogTests.CustomColors_ShortArray_KeepsTheOthers -->
Assigning an array of one dimension sets the colors from its first element on, and keeps the others; elements past the sixteenth are not used, and a system color becomes its RGB value. **Empty** gives back the shades of grey. Another value that is not an array raises run-time error 380, an array of more dimensions run-time error 5, and an array with no elements run-time error 91.
<!-- /test -->

### DefaultExt
{: .no_toc }

The extension that the Save As dialog adds to a file name the user types without one, such as `txt`. **String**.

### DialogTitle
{: .no_toc }

The title of the Open and Save As dialogs, and the text over the tree of the Browse for Folder dialog. **String**. Default: empty, with which each dialog has its own title.

### Duplex
{: .no_toc }

Whether the printer prints on both sides of the paper. A member of [**CdlPRDPConstants**](#cdlprdpconstants). Default: **CdlPRDPSimplex**. Another value raises run-time error 380.

### FileName
{: .no_toc }

The file chosen in the Open or the Save As dialog, with its path, and the name the dialog starts with. **String**. The Browse for Folder dialog sets it to the folder chosen, with a backslash at the end. With **CdlOFNAllowMultiSelect** and **CdlOFNExplorer** in [**Flags**](#flags), and more than one file chosen, it is the folder and then each file's name, separated by **vbNullChar**.

### FileOffset
{: .no_toc }

Where the name of the file starts in [**FileName**](#filename), counted from 0: the length of the path before it. **Integer**, read-only: assigning it raises run-time error 383.

### FileTitle
{: .no_toc }

<!-- test: CommonDialogTests.FileTitle_Assigned_Raises383 -->
The name of the file chosen, without its path. **String**, read-only: assigning it raises run-time error 383. It is empty when more than one file was chosen, and for a folder.
<!-- /test -->

### Filter
{: .no_toc }

The file types of the Open and Save As dialogs: pairs of a description and a pattern, separated by `|`, such as `"Pictures|*.bmp;*.png|All files|*.*"`. **String**.

### FilterIndex
{: .no_toc }

The file type the dialog starts with, counted from 1, and the one chosen after the dialog. **Long**. Default: 0, with which the dialog starts with the first type. A negative value raises run-time error 380.

### FindWhat
{: .no_toc }

The text to find, in the Find and Replace dialogs, and what the user typed when an event is raised. **String**.

### Flags
{: .no_toc }

The options of the dialog shown next: the sum of the members of the dialog's enumeration, [**CdlOFNConstants**](#cdlofnconstants) for Open and Save As, [**CdlCCConstants**](#cdlccconstants) for Color, [**CdlCFConstants**](#cdlcfconstants) for Font, [**CdlPDConstants**](#cdlpdconstants) for Print, [**CdlPSDConstants**](#cdlpsdconstants) for Page Setup, [**CdlBIFConstants**](#cdlbifconstants) for Browse for Folder, and [**CdlFRConstants**](#cdlfrconstants) for Find and Replace. **Long**. Default: 0. A dialog closed with **OK** sets it to the flags it returned; the Find and Replace dialogs set it before each event; the Browse for Folder dialog leaves it as it was.

### FontBold, FontItalic, FontStrikethru, FontUnderline
{: .no_toc }

The style of the font chosen in the Font dialog, and the style it starts with. **Boolean**. Default: **False**. **FontBold** is **True** while [**FontWeight**](#fontweight) is 600 or more; setting it sets **FontWeight** to 700 or 400. **FontStrikethru** and **FontUnderline** are in the dialog with **CdlCFEffects** only.

### FontCharset
{: .no_toc }

The character set of the font chosen, such as 0 for Western. **Integer**. Default: 0.

### FontName
{: .no_toc }

The name of the font chosen in the Font dialog, and the font it starts with. **String**. Default: empty.

### FontSize
{: .no_toc }

The size of the font chosen, in points. **Single**. Default: 8.

### FontWeight
{: .no_toc }

The weight of the font chosen: 0 for any weight, 100 for thin, 400 for normal, 700 for bold and 900 for heavy, or another hundred between. **Integer**. Default: 400. Another value raises run-time error 380.

### FromPage, ToPage
{: .no_toc }

The first and the last page to print, in the Print dialog with **CdlPDPageNums**. **Long**. Default: 0. A negative value raises run-time error 380.

### hDC
{: .no_toc }

The device context of the printer chosen in the Print dialog, when [**Flags**](#flags) has **CdlPDReturnDC** or **CdlPDReturnIC**. **LongPtr**, read-only: assigning it raises run-time error 383. The object deletes it when it is destroyed, and when a later Print dialog returns another one.

### HelpCommand
{: .no_toc }

What [**ShowHelp**](#showhelp) asks of Windows Help. A member of [**CdlHelpConstants**](#cdlhelpconstants), or 0. Default: 0, with which **ShowHelp** does nothing. Another value raises run-time error 380.

### HelpContext
{: .no_toc }

The number of the help topic, for the **HelpCommand** values that name a topic. **LongPtr**. Default: 0.

### HelpFile
{: .no_toc }

The help file that [**ShowHelp**](#showhelp) opens. **String**.

### HelpKey
{: .no_toc }

The keyword or the macro that [**ShowHelp**](#showhelp) passes, for **CdlHelpKey**, **CdlHelpPartialKey** and **CdlHelpCommandHelp**. **String**.

### HookEvents
{: .no_toc }

Whether the dialog shown next raises the events that need a hook procedure. **Boolean**. Default: **False**. See [Events and the hook](#events-and-the-hook).

### InitDir
{: .no_toc }

The folder the Open and Save As dialogs start in, and the folder selected first in the Browse for Folder dialog. **String**. Default: empty, with which Windows chooses.

### Max, Min
{: .no_toc }

The largest and the smallest size the Font dialog offers, in points, with **CdlCFLimitSize**; and the highest and the lowest page number the Print dialog accepts. **Long**. Default: 0. A negative value raises run-time error 380.

### MaxFileSize
{: .no_toc }

The number of characters the Open and Save As dialogs can return in [**FileName**](#filename). **Long**. Default: 260. A value less than 1 raises run-time error 380.

### Object
{: .no_toc }

The object itself. **Object**, read-only.

### Orientation
{: .no_toc }

How the paper is turned. A member of [**CdlPRORConstants**](#cdlprorconstants). Default: **CdlPRORPortrait**. Another value raises run-time error 380.

### PageBottomMargin, PageLeftMargin, PageRightMargin, PageTopMargin
{: .no_toc }

The margins of the Page Setup dialog: those it starts with when [**Flags**](#flags) has **CdlPSDMargins**, and those the user chose. **Long**, in thousandths of an inch or hundredths of a millimetre, as **CdlPSDInThousandthsOfInches** or **CdlPSDInHundredthsOfMillimeters** says, or else as the user's locale measures. A negative value raises run-time error 380.

### PageBottomMinMargin, PageLeftMinMargin, PageRightMinMargin, PageTopMinMargin
{: .no_toc }

The smallest margins the Page Setup dialog accepts, when [**Flags**](#flags) has **CdlPSDMinMargins**. **Long**, in the unit of the margins. A negative value raises run-time error 380. The dialog does not change them.

### PaperBin
{: .no_toc }

The tray the paper comes from. A member of [**CdlPRBNConstants**](#cdlprbnconstants), or a number of the printer's own from 1 to 32767. Default: **CdlPRBNAuto**. Another value raises run-time error 380.

### PaperSize
{: .no_toc }

The size of the paper. A member of [**CdlPRPSConstants**](#cdlprpsconstants), or a number of the printer's own from 1 to 32767. A new object has **CdlPRPSA4** where the user's locale measures in metric units and **CdlPRPSLetter** where it measures in inches. Another value raises run-time error 380.

### PrinterDefault
{: .no_toc }

Whether a printer the user chooses in the Print dialog becomes the default printer of Windows. **Boolean**. Default: **True**.

### PrinterDefaultInit
{: .no_toc }

Whether the Print and Page Setup dialogs start with the default printer. **Boolean**. Default: **True**. With **False** they start with [**PrinterName**](#printerdriver-printername-printerport), or the default printer when there is no printer of that name.

### PrinterDriver, PrinterName, PrinterPort
{: .no_toc }

The driver, the name and the port of the printer chosen in the Print dialog. **String**.

### PrintQuality
{: .no_toc }

The resolution of the printer. A member of [**CdlPRPQConstants**](#cdlprpqconstants), or a number of dots per inch from 0 to 32767. Default: **CdlPRPQHigh**. Another value raises run-time error 380.

### ReplaceWith
{: .no_toc }

The text to put in place of [**FindWhat**](#findwhat), in the Replace dialog. **String**.

### RootFolder
{: .no_toc }

The folder at the top of the tree of the Browse for Folder dialog. **Variant**: **Empty** for the desktop (the default), a number for a special folder of Windows (a `CSIDL` value, such as `&H11` for This PC), or the path of a folder. A value of another type raises run-time error 380.

### Tag
{: .no_toc }

A string of the program's own, which the object does not use. **String**.

Methods
-------

Each **Show** method shows its dialog and waits until the user closes it, but **ShowFind** and **ShowReplace**, which return at once.

### ShowColor
{: .no_toc }

Shows the Color dialog. Returns **True** when the user clicked **OK**; [**Color**](#color) is then the color chosen.

Syntax: *object*.**ShowColor** **As Boolean**

The dialog with [**Color**](#color) set to `RGB(64, 128, 192)` and [**Flags**](#flags) set to `CdlCCRGBInit Or CdlCCPreventFullOpen` (left) and to `CdlCCRGBInit Or CdlCCFullOpen` (right):

![Two Color dialogs. The left one shows the 48 basic colors and 16 custom colors, with the Define Custom Colors button disabled, and OK and Cancel. The right one shows the same, and beside them the part for defining custom colors: a spectrum with a cross at the chosen color, a luminosity bar, a swatch of the color, its Hue 140, Sat 120 and Lum 120, its Red 64, Green 128 and Blue 192, and an Add to Custom Colors button.](../VBComDlg/Images/ShowColor.png){:width="688" height="332"}

### ShowFind
{: .no_toc }

Shows the Find dialog, which stays open while the user works in the program, and returns its window handle. **LongPtr**. Returns 0, and shows nothing, while a Find or Replace dialog of the same object is open. The dialog raises [**FindNext**](#findnext-replace-replaceall) each time the user clicks **Find Next**, and closes when the user cancels it. When Windows cannot make the dialog, the method raises an error, as [Cancel and errors](#cancel-and-errors) says.

Syntax: *object*.**ShowFind** **As LongPtr**

The Find dialog (left) and the Replace dialog that [**ShowReplace**](#showreplace) opens (right), with [**FindWhat**](#findwhat) `total`, [**ReplaceWith**](#replacewith) `sum` and [**Flags**](#flags) set to `CdlFRDown Or CdlFRMatchCase`:

![A Find dialog with total in its Find what box, the Match whole word only box clear, the Match case box checked, Down chosen in its Direction group, and the Find Next and Cancel buttons. Beside it a Replace dialog with total in Find what, sum in Replace with, the same two check boxes, and the Find Next, Replace, Replace All and Cancel buttons.](../VBComDlg/Images/ShowFind.png){:width="718" height="182"}

### ShowFolderBrowser
{: .no_toc }

Shows the Browse for Folder dialog, from [**RootFolder**](#rootfolder) with [**DialogTitle**](#dialogtitle) over the tree and [**InitDir**](#initdir) selected. Returns **True** when the user chose a folder; [**FileName**](#filename) is then its path, with a backslash at the end. With **CdlBIFBrowseIncludeFiles** the user can also choose a file, and [**FileTitle**](#filetitle) and [**FileOffset**](#fileoffset) are then set too.

Syntax: *object*.**ShowFolderBrowser** **As Boolean**

The dialog with [**RootFolder**](#rootfolder) set to the path of a folder named Projects, [**InitDir**](#initdir) to its folder Reports and [**DialogTitle**](#dialogtitle) to `Choose the folder for the reports.`, with [**Flags**](#flags) set to **CdlBIFReturnOnlyFSDirs** (left) and to **CdlBIFUseNewUI** (right):

![Two Browse For Folder dialogs, each showing the text Choose the folder for the reports. above a tree whose root is the folder Projects, holding the folders Invoices, Reports and Templates, with Reports selected. The left one is small and has only OK and Cancel. The right one, in the new style, is larger and has a Folder box showing Reports, a Make New Folder button, OK and Cancel.](../VBComDlg/Images/ShowFolderBrowser.png){:width="892" height="635"}

### ShowFont
{: .no_toc }

Shows the Font dialog, starting with the font properties. Returns **True** when the user clicked **OK**; [**FontName**](#fontname), [**FontSize**](#fontsize), [**FontWeight**](#fontweight), [**FontItalic**](#fontbold-fontitalic-fontstrikethru-fontunderline) and [**FontCharset**](#fontcharset) are then the font chosen, and with **CdlCFEffects** also [**FontStrikethru**](#fontbold-fontitalic-fontstrikethru-fontunderline), [**FontUnderline**](#fontbold-fontitalic-fontstrikethru-fontunderline) and [**Color**](#color). It raises **CdlMaxLessThanMin** when [**Max**](#max-min) is less than [**Min**](#max-min) with **CdlCFLimitSize**, and **CdlNoFonts** when there is no font to list.

Syntax: *object*.**ShowFont** **As Boolean**

The dialog with [**FontName**](#fontname) `Microsoft Sans Serif`, [**FontSize**](#fontsize) 10, [**FontBold**](#fontbold-fontitalic-fontstrikethru-fontunderline) **True**, [**Color**](#color) `RGB(0, 0, 160)` and [**Flags**](#flags) set to `CdlCFScreenFonts Or CdlCFEffects`:

![The Font dialog with Microsoft Sans Serif selected in its list of fonts, Bold in its list of styles and 10 in its list of sizes. Below them, an Effects group with Strikeout and Underline check boxes and a Color list showing a dark blue swatch named Custom, a Sample box showing AaBbYyZz in that blue, a Script list showing Western, a Show more fonts link and the OK and Cancel buttons.](../VBComDlg/Images/ShowFont.png){:width="407" height="513"}

### ShowHelp
{: .no_toc }

Opens [**HelpFile**](#helpfile) in Windows Help with [**HelpCommand**](#helpcommand), [**HelpContext**](#helpcontext) and [**HelpKey**](#helpkey). It does nothing while **HelpCommand** is 0, and raises run-time error 32751, **CdlHelp**, when Windows Help fails, as it does on a system without the program that shows `.hlp` files.

Syntax: *object*.**ShowHelp**

### ShowOpen
{: .no_toc }

Shows the Open dialog. Returns **True** when the user chose a file; [**FileName**](#filename), [**FileTitle**](#filetitle), [**FileOffset**](#fileoffset), [**FilterIndex**](#filterindex) and [**Flags**](#flags) then describe it.

Syntax: *object*.**ShowOpen** **As Boolean**

The Open dialog (left) and the Save As dialog that [**ShowSave**](#showsave) opens (right), with [**InitDir**](#initdir) a folder Reports that holds three text files, [**Filter**](#filter) set to `Text files (*.txt)|*.txt|All files (*.*)|*.*`, [**HookEvents**](#hookevents) **True** and [**Flags**](#flags) set to `CdlOFNExplorer Or CdlOFNHideReadOnly`, and for Save As [**FileName**](#filename) `April sales.txt`:

![An Open dialog and a Save As dialog, each with Reports in its Look in or Save in box, a bar of places at the left (Quick access, Desktop, Libraries, This PC and Network), and a list of the files March sales.txt, Notes.txt and Q1 summary.txt with their date modified, 3/15/2026 10:30 AM. Under the list, the Open dialog has an empty File name box, Text files (*.txt) in Files of type, and the Open and Cancel buttons; the Save As dialog has April sales.txt in File name, Text files (*.txt) in Save as type, and the Save and Cancel buttons.](../VBComDlg/Images/ShowOpen.png){:width="1129" height="426"}

### ShowPageSetup
{: .no_toc }

Shows the Page Setup dialog. Returns **True** when the user clicked **OK**; the margins, [**Orientation**](#orientation), [**PaperSize**](#papersize), [**PaperBin**](#paperbin) and [**Flags**](#flags) are then the user's.

Syntax: *object*.**ShowPageSetup** **As Boolean**

The dialog with [**PrinterDefaultInit**](#printerdefaultinit) **False** and [**PrinterName**](#printerdriver-printername-printerport) `Microsoft Print to PDF`:

![The Page Setup dialog: a preview of a page at the top; a Paper group with Letter in its Size list and an empty, disabled Source list; an Orientation group with Portrait chosen; a Margins (inches) group with 1 in its Left, Right, Top and Bottom boxes; and the OK and Cancel buttons.](../VBComDlg/Images/ShowPageSetup.png){:width="361" height="425"}

### ShowPrinter
{: .no_toc }

Shows the Print dialog. Returns **True** when the user clicked **Print** or **OK**; the printer properties, [**Copies**](#copies), [**FromPage**](#frompage-topage), [**ToPage**](#frompage-topage) and [**Flags**](#flags) are then the user's, and [**hDC**](#hdc) the printer's device context when **Flags** asked for one.

Syntax: *object*.**ShowPrinter** **As Boolean**

### ShowPrinterEx
{: .no_toc }

Shows the Print dialog of Windows with its pages of properties and its **Apply** button. Returns a member of [**CdlPDResultConstants**](#cdlpdresultconstants): what the user clicked. The properties are set as by [**ShowPrinter**](#showprinter), for every result but **CdlPDResultCancel**. It cannot be shown by [**Action**](#action).

Syntax: *object*.**ShowPrinterEx** **As CdlPDResultConstants**

### ShowReplace
{: .no_toc }

Shows the Replace dialog, as [**ShowFind**](#showfind) shows the Find dialog, starting with [**FindWhat**](#findwhat) and [**ReplaceWith**](#replacewith). It raises [**FindNext**](#findnext-replace-replaceall), [**Replace**](#findnext-replace-replaceall) and [**ReplaceAll**](#findnext-replace-replaceall) for the three buttons.

Syntax: *object*.**ShowReplace** **As LongPtr**

### ShowSave
{: .no_toc }

Shows the Save As dialog, as [**ShowOpen**](#showopen) shows the Open dialog, and adds [**DefaultExt**](#defaultext) to a name typed without an extension.

Syntax: *object*.**ShowSave** **As Boolean**

Events
------

### ColorValidate
{: .no_toc }

Raised when the user clicks **OK** in the Color dialog, before it closes, while [**HookEvents**](#hookevents) is **True**.

Syntax: *object*\_**ColorValidate**( *RGBColor* **As Long**, *Cancel* **As Boolean**, **ByVal** *hDlg* **As Long** )

*RGBColor*
: The color chosen. A handler that sets *Cancel* to **True** can also change it: the dialog then shows that color.

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the dialog open.

*hDlg*
: The window handle of the dialog.

### FileShareViolation
{: .no_toc }

Raised when the file chosen in the Open or the Save As dialog is open in another program that does not share it, while [**HookEvents**](#hookevents) is **True**.

Syntax: *object*\_**FileShareViolation**( **ByVal** *FileName* **As String**, *Result* **As CdlOFNShareViResultConstants**, **ByVal** *hDlg* **As Long** )

*FileName*
: The file.

*Result*
: What the dialog does, a member of [**CdlOFNShareViResultConstants**](#cdlofnshareviresultconstants): **CdlOFNShareViResultWarn** when the event is raised.

*hDlg*
: The window handle of the dialog.

### FileValidate
{: .no_toc }

Raised when the user clicks **OK** in the Open or the Save As dialog, before it closes, while [**HookEvents**](#hookevents) is **True**.

Syntax: *object*\_**FileValidate**( **ByVal** *FileName* **As String**, **ByVal** *FileTitle* **As String**, **ByVal** *FileOffset* **As Integer**, *Cancel* **As Boolean**, **ByVal** *hDlg* **As Long** )

*FileName*, *FileTitle*, *FileOffset*
: The file chosen, as the properties of those names give it.

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the dialog open.

*hDlg*
: The window handle of the dialog.

### FindNext, Replace, ReplaceAll
{: .no_toc }

Raised when the user clicks **Find Next** in the Find or the Replace dialog, and **Replace** and **Replace All** in the Replace dialog. [**FindWhat**](#findwhat), [**ReplaceWith**](#replacewith) and [**Flags**](#flags) then hold what the dialog shows, such as **CdlFRMatchCase** and **CdlFRDown**.

Syntax: *object*\_**FindNext**( )

### FolderBrowserValidateFailed
{: .no_toc }

Raised when the user types a name that is not a folder into the box of the Browse for Folder dialog, with **CdlBIFEditBox** and **CdlBIFValidate** in [**Flags**](#flags).

Syntax: *object*\_**FolderBrowserValidateFailed**( **ByVal** *Text* **As String**, *Cancel* **As Boolean**, **ByVal** *hDlg* **As Long** )

*Text*
: What the user typed.

*Cancel*
: **False** when the event is raised, and the dialog then closes. A handler that sets it to **True** keeps the dialog open.

*hDlg*
: The window handle of the dialog.

### FontApply
{: .no_toc }

Raised when the user clicks **Apply** in the Font dialog, with **CdlCFApply** in [**Flags**](#flags) and [**HookEvents**](#hookevents) **True**. The properties do not change; the arguments hold the font the dialog shows.

Syntax: *object*\_**FontApply**( **ByVal** *Flags* **As Long**, **ByVal** *FontName* **As String**, **ByVal** *FontSize* **As Single**, **ByVal** *FontBold* **As Boolean**, **ByVal** *FontItalic* **As Boolean**, **ByVal** *FontStrikethru* **As Boolean**, **ByVal** *FontUnderline* **As Boolean**, **ByVal** *FontCharset* **As Integer**, **ByVal** *RGBColor* **As Long**, **ByVal** *hDlg* **As Long** )

### Help
{: .no_toc }

Raised when the user clicks the **Help** button of a dialog, which a flag such as **CdlOFNHelpButton** adds, while the dialog belongs to a window.

Syntax: *object*\_**Help**( *Handled* **As Boolean**, **ByVal** *Action* **As Integer**, **ByVal** *hDlg* **As Long** )

*Handled*
: **False** when the event is raised, and the object then calls [**ShowHelp**](#showhelp). A handler that shows its own help sets it to **True**.

*Action*
: Which dialog, by the numbers of [**Action**](#action).

*hDlg*
: The window handle of the dialog.

### InitDialog
{: .no_toc }

Raised when a dialog has been made and before the user sees it, while [**HookEvents**](#hookevents) is **True**, and always for the Browse for Folder dialog. A handler can change the dialog through its window handle.

Syntax: *object*\_**InitDialog**( **ByVal** *Action* **As Integer**, **ByVal** *hDlg* **As Long** )

*Action*
: Which dialog, by the numbers of [**Action**](#action).

*hDlg*
: The window handle of the dialog.

## CdlBIFConstants
{: #cdlbifconstants }

The flags of the Browse for Folder dialog, in [**Flags**](#flags). Each is the `BIF_` flag of Windows of that name.

| Member | Value | Description |
|---|---|---|
| **CdlBIFReturnOnlyFSDirs**{: #CdlBIFConstants_CdlBIFReturnOnlyFSDirs } | &H1 | Only a folder of the file system can be chosen. |
| **CdlBIFDontGoBelowDomain**{: #CdlBIFConstants_CdlBIFDontGoBelowDomain } | &H2 | The network folders below the domain are not shown. |
| **CdlBIFStatusText**{: #CdlBIFConstants_CdlBIFStatusText } | &H4 | A line of status text, for a dialog of the old style. |
| **CdlBIFReturnFSAncestors**{: #CdlBIFConstants_CdlBIFReturnFSAncestors } | &H8 | Only a folder that holds file system folders can be chosen. |
| **CdlBIFEditBox**{: #CdlBIFConstants_CdlBIFEditBox } | &H10 | A box in which the user can type a name. |
| **CdlBIFValidate**{: #CdlBIFConstants_CdlBIFValidate } | &H20 | A name typed that is not a folder raises [**FolderBrowserValidateFailed**](#folderbrowservalidatefailed). |
| **CdlBIFNewDialogStyle**{: #CdlBIFConstants_CdlBIFNewDialogStyle } | &H40 | The dialog of the new style, which can be resized. |
| **CdlBIFBrowseIncludeURLs**{: #CdlBIFConstants_CdlBIFBrowseIncludeURLs } | &H80 | Web addresses are shown too. |
| **CdlBIFUseNewUI**{: #CdlBIFConstants_CdlBIFUseNewUI } | &H50 | **CdlBIFNewDialogStyle** and **CdlBIFEditBox**. |
| **CdlBIFUAHint**{: #CdlBIFConstants_CdlBIFUAHint } | &H100 | A hint in place of the edit box, with **CdlBIFNewDialogStyle**. |
| **CdlBIFNoNewFolderButton**{: #CdlBIFConstants_CdlBIFNoNewFolderButton } | &H200 | No **Make New Folder** button. |
| **CdlBIFNoTranslateTargets**{: #CdlBIFConstants_CdlBIFNoTranslateTargets } | &H400 | A shortcut chosen is returned as the shortcut, not as its target. |
| **CdlBIFBrowseForComputer**{: #CdlBIFConstants_CdlBIFBrowseForComputer } | &H1000 | Only a computer can be chosen. |
| **CdlBIFBrowseForPrinter**{: #CdlBIFConstants_CdlBIFBrowseForPrinter } | &H2000 | Only a printer can be chosen. |
| **CdlBIFBrowseIncludeFiles**{: #CdlBIFConstants_CdlBIFBrowseIncludeFiles } | &H4000 | Files are shown too, and can be chosen. |
| **CdlBIFShareable**{: #CdlBIFConstants_CdlBIFShareable } | &H8000 | The shared folders of remote computers are shown. |
| **CdlBIFBrowseFileJunctions**{: #CdlBIFConstants_CdlBIFBrowseFileJunctions } | &H10000 | The contents of files that hold folders, such as ZIP files, are shown. |

## CdlCCConstants
{: #cdlccconstants }

The flags of the Color dialog, in [**Flags**](#flags).

| Member | Value | Description |
|---|---|---|
| **CdlCCRGBInit**{: #CdlCCConstants_CdlCCRGBInit } | &H1 | The dialog starts with [**Color**](#color). |
| **CdlCCFullOpen**{: #CdlCCConstants_CdlCCFullOpen } | &H2 | The part that defines custom colors is shown at once. |
| **CdlCCPreventFullOpen**{: #CdlCCConstants_CdlCCPreventFullOpen } | &H4 | The button that shows that part is disabled. |
| **CdlCCHelpButton**{: #CdlCCConstants_CdlCCHelpButton } | &H8 | A **Help** button. |
| **CdlCCSolidColor**{: #CdlCCConstants_CdlCCSolidColor } | &H80 | Only solid colors are offered. |
| **CdlCCAnyColor**{: #CdlCCConstants_CdlCCAnyColor } | &H100 | Every color the display can show is offered. |

## CdlCFConstants
{: #cdlcfconstants }

The flags of the Font dialog, in [**Flags**](#flags).

| Member | Value | Description |
|---|---|---|
| **CdlCFScreenFonts**{: #CdlCFConstants_CdlCFScreenFonts } | &H1 | The fonts of the screen are listed. |
| **CdlCFPrinterFonts**{: #CdlCFConstants_CdlCFPrinterFonts } | &H2 | The fonts of the printer are listed. |
| **CdlCFHelpButton**{: #CdlCFConstants_CdlCFHelpButton } | &H4 | A **Help** button. |
| **CdlCFEffects**{: #CdlCFConstants_CdlCFEffects } | &H100 | The strikeout, underline and color choices are shown. |
| **CdlCFApply**{: #CdlCFConstants_CdlCFApply } | &H200 | An **Apply** button, which raises [**FontApply**](#fontapply). |
| **CdlCFScriptsOnly**{: #CdlCFConstants_CdlCFScriptsOnly } | &H400 | Fonts of the OEM and the symbol character sets are not listed. |
| **CdlCFNoVectorFonts**{: #CdlCFConstants_CdlCFNoVectorFonts } | &H800 | Vector fonts are not listed. |
| **CdlCFLimitSize**{: #CdlCFConstants_CdlCFLimitSize } | &H2000 | Only the sizes from [**Min**](#max-min) to [**Max**](#max-min) are offered. |
| **CdlCFFixedPitchOnly**{: #CdlCFConstants_CdlCFFixedPitchOnly } | &H4000 | Only fonts whose characters all have one width are listed. |
| **CdlCFForceFontExist**{: #CdlCFConstants_CdlCFForceFontExist } | &H10000 | A font name typed that does not exist is refused. |
| **CdlCFScalableOnly**{: #CdlCFConstants_CdlCFScalableOnly } | &H20000 | Only fonts that can take any size are listed. |
| **CdlCFTTOnly**{: #CdlCFConstants_CdlCFTTOnly } | &H40000 | Only TrueType and OpenType fonts are listed. |
| **CdlCFNoFaceSel**{: #CdlCFConstants_CdlCFNoFaceSel } | &H80000 | The dialog starts with no font selected. |
| **CdlCFNoStyleSel**{: #CdlCFConstants_CdlCFNoStyleSel } | &H100000 | The dialog starts with no style selected. |
| **CdlCFNoSizeSel**{: #CdlCFConstants_CdlCFNoSizeSel } | &H200000 | The dialog starts with no size selected. |
| **CdlCFSelectScript**{: #CdlCFConstants_CdlCFSelectScript } | &H400000 | Only fonts of [**FontCharset**](#fontcharset) are listed, and the script cannot be changed. |
| **CdlCFNoScriptSel**{: #CdlCFConstants_CdlCFNoScriptSel } | &H800000 | The script list is disabled. |
| **CdlCFNoVertFonts**{: #CdlCFConstants_CdlCFNoVertFonts } | &H1000000 | Only fonts written horizontally are listed. |

A flag that the dialog sets, such as **CdlCFNoFaceSel** when the user leaves the font unselected, keeps the property of that part as it was.

## CdlErrorConstants
{: #cdlerrorconstants }

The run-time errors that the **Show** methods raise.

| Member | Value | Raised when |
|---|---|---|
| **CdlCancel**{: #CdlErrorConstants_CdlCancel } | 32755 | The user cancelled, with [**CancelError**](#cancelerror) **True**. |
| **CdlBufferTooSmall**{: #CdlErrorConstants_CdlBufferTooSmall } | 20476 | The files chosen do not fit in [**MaxFileSize**](#maxfilesize) characters. |
| **CdlInvalidFileName**{: #CdlErrorConstants_CdlInvalidFileName } | 20477 | [**FileName**](#filename) is not a valid name. |
| **CdlSubclassFailure**{: #CdlErrorConstants_CdlSubclassFailure } | 20478 | The Open or Save As dialog had too little memory. |
| **CdlMaxLessThanMin**{: #CdlErrorConstants_CdlMaxLessThanMin } | 24573 | [**Max**](#max-min) is less than **Min**, with **CdlCFLimitSize**. |
| **CdlNoFonts**{: #CdlErrorConstants_CdlNoFonts } | 24574 | The Font dialog has no font to list. |
| **CdlPrinterNotFound**{: #CdlErrorConstants_CdlPrinterNotFound } | 28660 | The printer is not installed. |
| **CdlCreateICFailure**{: #CdlErrorConstants_CdlCreateICFailure } | 28661 | The dialog could not make the information context of the printer. |
| **CdlDndmMismatch**{: #CdlErrorConstants_CdlDndmMismatch } | 28662 | The printer's settings and its name are of two printers. |
| **CdlNoDefaultPrn**{: #CdlErrorConstants_CdlNoDefaultPrn } | 28663 | There is no default printer. |
| **CdlNoDevices**{: #CdlErrorConstants_CdlNoDevices } | 28664 | No printer is installed. |
| **CdlInitFailure**{: #CdlErrorConstants_CdlInitFailure } | 28665 | A Print dialog could not start. |
| **CdlGetDevModeFail**{: #CdlErrorConstants_CdlGetDevModeFail } | 28666 | The printer driver did not give its settings. |
| **CdlLoadDrvFailure**{: #CdlErrorConstants_CdlLoadDrvFailure } | 28667 | The printer driver could not be loaded. |
| **CdlRetDefFailure**{: #CdlErrorConstants_CdlRetDefFailure } | 28668 | The default printer could not be returned. |
| **CdlParseFailure**{: #CdlErrorConstants_CdlParseFailure } | 28669 | The printer's entry in the system could not be read. |
| **CdlHelp**{: #CdlErrorConstants_CdlHelp } | 32751 | Windows Help failed. |
| **CdlBufferLengthZero**{: #CdlErrorConstants_CdlBufferLengthZero } | 36848 | The Find or Replace dialog refused the buffer of its text. |

## CdlFRConstants
{: #cdlfrconstants }

The flags of the Find and Replace dialogs, in [**Flags**](#flags).

| Member | Value | Description |
|---|---|---|
| **CdlFRDown**{: #CdlFRConstants_CdlFRDown } | &H1 | The search goes down. The dialog sets or clears it. |
| **CdlFRWholeWord**{: #CdlFRConstants_CdlFRWholeWord } | &H2 | **Match whole word only** is checked. |
| **CdlFRMatchCase**{: #CdlFRConstants_CdlFRMatchCase } | &H4 | **Match case** is checked. |
| **CdlFRFindNext**{: #CdlFRConstants_CdlFRFindNext } | &H8 | Set by the dialog: the user clicked **Find Next**. |
| **CdlFRReplace**{: #CdlFRConstants_CdlFRReplace } | &H10 | Set by the dialog: the user clicked **Replace**. |
| **CdlFRReplaceAll**{: #CdlFRConstants_CdlFRReplaceAll } | &H20 | Set by the dialog: the user clicked **Replace All**. |
| **CdlFRHelpButton**{: #CdlFRConstants_CdlFRHelpButton } | &H80 | A **Help** button. |
| **CdlFRNoUpDown**{: #CdlFRConstants_CdlFRNoUpDown } | &H400 | The direction buttons are disabled. |
| **CdlFRNoMatchCase**{: #CdlFRConstants_CdlFRNoMatchCase } | &H800 | **Match case** is disabled. |
| **CdlFRNoWholeWord**{: #CdlFRConstants_CdlFRNoWholeWord } | &H1000 | **Match whole word only** is disabled. |
| **CdlFRHideUpDown**{: #CdlFRConstants_CdlFRHideUpDown } | &H4000 | The direction buttons are hidden. |
| **CdlFRHideMatchCase**{: #CdlFRConstants_CdlFRHideMatchCase } | &H8000 | **Match case** is hidden. |
| **CdlFRHideWholeWord**{: #CdlFRConstants_CdlFRHideWholeWord } | &H10000 | **Match whole word only** is hidden. |

## CdlHelpConstants
{: #cdlhelpconstants }

The values of [**HelpCommand**](#helpcommand). Each is the `HELP_` command of Windows Help of that name.

| Member | Value | Description |
|---|---|---|
| **CdlHelpContext**{: #CdlHelpConstants_CdlHelpContext } | 1 | Shows the topic [**HelpContext**](#helpcontext). |
| **CdlHelpQuit**{: #CdlHelpConstants_CdlHelpQuit } | 2 | Closes Windows Help. |
| **CdlHelpIndex**{: #CdlHelpConstants_CdlHelpIndex } | 3 | Shows the contents topic. The same as **CdlHelpContents**. |
| **CdlHelpContents**{: #CdlHelpConstants_CdlHelpContents } | 3 | Shows the contents topic. |
| **CdlHelpHelpOnHelp**{: #CdlHelpConstants_CdlHelpHelpOnHelp } | 4 | Shows how to use Windows Help. |
| **CdlHelpSetIndex**{: #CdlHelpConstants_CdlHelpSetIndex } | 5 | Makes [**HelpContext**](#helpcontext) the contents topic. The same as **CdlHelpSetContents**. |
| **CdlHelpSetContents**{: #CdlHelpConstants_CdlHelpSetContents } | 5 | Makes [**HelpContext**](#helpcontext) the contents topic. |
| **CdlHelpContextPopup**{: #CdlHelpConstants_CdlHelpContextPopup } | 8 | Shows the topic [**HelpContext**](#helpcontext) in a small window. |
| **CdlHelpForceFile**{: #CdlHelpConstants_CdlHelpForceFile } | 9 | Makes Windows Help show [**HelpFile**](#helpfile). |
| **CdlHelpKey**{: #CdlHelpConstants_CdlHelpKey } | &H101 | Shows the topic of the keyword [**HelpKey**](#helpkey). |
| **CdlHelpCommandHelp**{: #CdlHelpConstants_CdlHelpCommandHelp } | &H102 | Runs the macro [**HelpKey**](#helpkey). |
| **CdlHelpPartialKey**{: #CdlHelpConstants_CdlHelpPartialKey } | &H105 | Shows the topic of the keyword [**HelpKey**](#helpkey), or a list of the topics whose keywords start with it. |

## CdlOFNConstants
{: #cdlofnconstants }

The flags of the Open and Save As dialogs, in [**Flags**](#flags). Each is the `OFN_` flag of Windows of that name.

| Member | Value | Description |
|---|---|---|
| **CdlOFNReadOnly**{: #CdlOFNConstants_CdlOFNReadOnly } | &H1 | **Open as read-only** is checked when the dialog starts; the dialog sets it when the user checked it. |
| **CdlOFNOverwritePrompt**{: #CdlOFNConstants_CdlOFNOverwritePrompt } | &H2 | The Save As dialog asks before it replaces a file. |
| **CdlOFNHideReadOnly**{: #CdlOFNConstants_CdlOFNHideReadOnly } | &H4 | **Open as read-only** is hidden. |
| **CdlOFNNoChangeDir**{: #CdlOFNConstants_CdlOFNNoChangeDir } | &H8 | The current folder of the program stays as it was. |
| **CdlOFNHelpButton**{: #CdlOFNConstants_CdlOFNHelpButton } | &H10 | A **Help** button. |
| **CdlOFNNoValidate**{: #CdlOFNConstants_CdlOFNNoValidate } | &H100 | A name with characters that a file name cannot have is accepted. |
| **CdlOFNAllowMultiSelect**{: #CdlOFNConstants_CdlOFNAllowMultiSelect } | &H200 | More than one file can be chosen. |
| **CdlOFNExtensionDifferent**{: #CdlOFNConstants_CdlOFNExtensionDifferent } | &H400 | Set by the dialog: the extension chosen is not [**DefaultExt**](#defaultext). |
| **CdlOFNPathMustExist**{: #CdlOFNConstants_CdlOFNPathMustExist } | &H800 | Only a path that exists is accepted. |
| **CdlOFNFileMustExist**{: #CdlOFNConstants_CdlOFNFileMustExist } | &H1000 | Only a file that exists is accepted. |
| **CdlOFNCreatePrompt**{: #CdlOFNConstants_CdlOFNCreatePrompt } | &H2000 | The Open dialog asks whether to make a file that does not exist. |
| **CdlOFNShareAware**{: #CdlOFNConstants_CdlOFNShareAware } | &H4000 | A file open in another program is accepted. |
| **CdlOFNNoReadOnlyReturn**{: #CdlOFNConstants_CdlOFNNoReadOnlyReturn } | &H8000 | A read-only file is refused. |
| **CdlOFNNoNetworkButton**{: #CdlOFNConstants_CdlOFNNoNetworkButton } | &H20000 | No **Network** button, in a dialog of the old style. |
| **CdlOFNExplorer**{: #CdlOFNConstants_CdlOFNExplorer } | &H80000 | The dialog of the Explorer style. Without it the dialog has the old style when **CdlOFNAllowMultiSelect** or [**HookEvents**](#hookevents) is set. |
| **CdlOFNNoDereferenceLinks**{: #CdlOFNConstants_CdlOFNNoDereferenceLinks } | &H100000 | A shortcut chosen is returned as the shortcut, not as its target. |
| **CdlOFNDontAddToRecent**{: #CdlOFNConstants_CdlOFNDontAddToRecent } | &H2000000 | The file is not added to the recent files of Windows. |
| **CdlOFNForcesShowHidden**{: #CdlOFNConstants_CdlOFNForcesShowHidden } | &H10000000 | Hidden and system files are shown. |

## CdlOFNShareViResultConstants
{: #cdlofnshareviresultconstants }

The values of the *Result* argument of [**FileShareViolation**](#fileshareviolation).

| Member | Value | Description |
|---|---|---|
| **CdlOFNShareViResultWarn**{: #CdlOFNShareViResultConstants_CdlOFNShareViResultWarn } | 0 | The dialog tells the user, and refuses the file. |
| **CdlOFNShareViResultNoWarn**{: #CdlOFNShareViResultConstants_CdlOFNShareViResultNoWarn } | 1 | The dialog refuses the file and says nothing. |
| **CdlOFNShareViResultFallThrough**{: #CdlOFNShareViResultConstants_CdlOFNShareViResultFallThrough } | 2 | The dialog accepts the file. |

## CdlPDConstants
{: #cdlpdconstants }

The flags of the Print dialogs, in [**Flags**](#flags). Each is the `PD_` flag of Windows of that name.

| Member | Value | Description |
|---|---|---|
| **CdlPDAllPages**{: #CdlPDConstants_CdlPDAllPages } | &H0 | **All** is chosen. |
| **CdlPDSelection**{: #CdlPDConstants_CdlPDSelection } | &H1 | **Selection** is chosen. |
| **CdlPDPageNums**{: #CdlPDConstants_CdlPDPageNums } | &H2 | **Pages** is chosen, from [**FromPage**](#frompage-topage) to **ToPage**. |
| **CdlPDNoSelection**{: #CdlPDConstants_CdlPDNoSelection } | &H4 | **Selection** is disabled. |
| **CdlPDNoPageNums**{: #CdlPDConstants_CdlPDNoPageNums } | &H8 | **Pages** is disabled. |
| **CdlPDCollate**{: #CdlPDConstants_CdlPDCollate } | &H10 | **Collate** is checked. |
| **CdlPDPrintToFile**{: #CdlPDConstants_CdlPDPrintToFile } | &H20 | **Print to file** is checked. |
| **CdlPDPrintSetup**{: #CdlPDConstants_CdlPDPrintSetup } | &H40 | The Print Setup dialog in place of the Print dialog, for [**ShowPrinter**](#showprinter). |
| **CdlPDNoWarning**{: #CdlPDConstants_CdlPDNoWarning } | &H80 | No message when there is no default printer. |
| **CdlPDReturnDC**{: #CdlPDConstants_CdlPDReturnDC } | &H100 | [**hDC**](#hdc) is a device context of the printer chosen. |
| **CdlPDReturnIC**{: #CdlPDConstants_CdlPDReturnIC } | &H200 | [**hDC**](#hdc) is an information context of the printer chosen. |
| **CdlPDReturnDefault**{: #CdlPDConstants_CdlPDReturnDefault } | &H400 | No dialog is shown: the properties are set to the default printer's. |
| **CdlPDHelpButton**{: #CdlPDConstants_CdlPDHelpButton } | &H800 | A **Help** button, for [**ShowPrinter**](#showprinter). |
| **CdlPDUseDevModeCopies**{: #CdlPDConstants_CdlPDUseDevModeCopies } | &H40000 | The printer makes the copies and collates them, where it can. |
| **CdlPDUseDevModeCopiesAndCollate**{: #CdlPDConstants_CdlPDUseDevModeCopiesAndCollate } | &H40000 | The same as **CdlPDUseDevModeCopies**. |
| **CdlPDDisablePrintToFile**{: #CdlPDConstants_CdlPDDisablePrintToFile } | &H80000 | **Print to file** is disabled. |
| **CdlPDCurrentPage**{: #CdlPDConstants_CdlPDCurrentPage } | &H400000 | **Current page** is chosen, for [**ShowPrinterEx**](#showprinterex). |
| **CdlPDHidePrintToFile**{: #CdlPDConstants_CdlPDHidePrintToFile } | &H100000 | **Print to file** is hidden. |
| **CdlPDNoNetworkButton**{: #CdlPDConstants_CdlPDNoNetworkButton } | &H200000 | No **Network** button, for [**ShowPrinter**](#showprinter). |
| **CdlPDNoCurrentPage**{: #CdlPDConstants_CdlPDNoCurrentPage } | &H800000 | **Current page** is disabled, for [**ShowPrinterEx**](#showprinterex). |

## CdlPDResultConstants
{: #cdlpdresultconstants }

The values that [**ShowPrinterEx**](#showprinterex) returns.

| Member | Value | Description |
|---|---|---|
| **CdlPDResultCancel**{: #CdlPDResultConstants_CdlPDResultCancel } | 0 | The user clicked **Cancel**. |
| **CdlPDResultPrint**{: #CdlPDResultConstants_CdlPDResultPrint } | 1 | The user clicked **Print**. |
| **CdlPDResultApply**{: #CdlPDResultConstants_CdlPDResultApply } | 2 | The user clicked **Apply**, then **Cancel**. |

## CdlPRBNConstants
{: #cdlprbnconstants }

The values of [**PaperBin**](#paperbin). Each has the value of the VBRUN constant whose name has `vb` in place of `Cdl`, in [**PrinterObjectConstants_PaperBin**](../../VBRUN/Constants/PrinterObjectConstants_PaperBin), which describes them.

| Member | Value | Member | Value |
|---|---|---|---|
| **CdlPRBNUpper**{: #CdlPRBNConstants_CdlPRBNUpper } | 1 | **CdlPRBNAuto**{: #CdlPRBNConstants_CdlPRBNAuto } | 7 |
| **CdlPRBNLower**{: #CdlPRBNConstants_CdlPRBNLower } | 2 | **CdlPRBNTractor**{: #CdlPRBNConstants_CdlPRBNTractor } | 8 |
| **CdlPRBNMiddle**{: #CdlPRBNConstants_CdlPRBNMiddle } | 3 | **CdlPRBNSmallFmt**{: #CdlPRBNConstants_CdlPRBNSmallFmt } | 9 |
| **CdlPRBNManual**{: #CdlPRBNConstants_CdlPRBNManual } | 4 | **CdlPRBNLargeFmt**{: #CdlPRBNConstants_CdlPRBNLargeFmt } | 10 |
| **CdlPRBNEnvelope**{: #CdlPRBNConstants_CdlPRBNEnvelope } | 5 | **CdlPRBNLargeCapacity**{: #CdlPRBNConstants_CdlPRBNLargeCapacity } | 11 |
| **CdlPRBNEnvManual**{: #CdlPRBNConstants_CdlPRBNEnvManual } | 6 | **CdlPRBNCassette**{: #CdlPRBNConstants_CdlPRBNCassette } | 14 |

## CdlPRCMConstants
{: #cdlprcmconstants }

The values of [**ColorMode**](#colormode).

| Member | Value | Description |
|---|---|---|
| **CdlPRCMMonochrome**{: #CdlPRCMConstants_CdlPRCMMonochrome } | 1 | Black and white. |
| **CdlPRCMColor**{: #CdlPRCMConstants_CdlPRCMColor } | 2 | Color. |

## CdlPRDPConstants
{: #cdlprdpconstants }

The values of [**Duplex**](#duplex).

| Member | Value | Description |
|---|---|---|
| **CdlPRDPSimplex**{: #CdlPRDPConstants_CdlPRDPSimplex } | 1 | One side of the paper. |
| **CdlPRDPHorizontal**{: #CdlPRDPConstants_CdlPRDPHorizontal } | 2 | Both sides, turned on the short edge. |
| **CdlPRDPVertical**{: #CdlPRDPConstants_CdlPRDPVertical } | 3 | Both sides, turned on the long edge. |

## CdlPRORConstants
{: #cdlprorconstants }

The values of [**Orientation**](#orientation).

| Member | Value | Description |
|---|---|---|
| **CdlPRORPortrait**{: #CdlPRORConstants_CdlPRORPortrait } | 1 | The page is taller than it is wide. |
| **CdlPRORLandscape**{: #CdlPRORConstants_CdlPRORLandscape } | 2 | The page is wider than it is tall. |

## CdlPRPQConstants
{: #cdlprpqconstants }

The values of [**PrintQuality**](#printquality) that are not a number of dots per inch.

| Member | Value | Description |
|---|---|---|
| **CdlPRPQHigh**{: #CdlPRPQConstants_CdlPRPQHigh } | -4 | High quality. |
| **CdlPRPQMedium**{: #CdlPRPQConstants_CdlPRPQMedium } | -3 | Medium quality. |
| **CdlPRPQLow**{: #CdlPRPQConstants_CdlPRPQLow } | -2 | Low quality. |
| **CdlPRPQDraft**{: #CdlPRPQConstants_CdlPRPQDraft } | -1 | Draft quality. |

## CdlPRPSConstants
{: #cdlprpsconstants }

The values of [**PaperSize**](#papersize). Each has the value of the VBRUN constant whose name has `vb` in place of `Cdl`, in [**PrinterObjectConstants_PaperSize**](../../VBRUN/Constants/PrinterObjectConstants_PaperSize), which gives the size of each paper.

| Member | Value | Member | Value |
|---|---|---|---|
| **CdlPRPSLetter**{: #CdlPRPSConstants_CdlPRPSLetter } | 1 | **CdlPRPSCSheet**{: #CdlPRPSConstants_CdlPRPSCSheet } | 24 |
| **CdlPRPSLetterSmall**{: #CdlPRPSConstants_CdlPRPSLetterSmall } | 2 | **CdlPRPSDSheet**{: #CdlPRPSConstants_CdlPRPSDSheet } | 25 |
| **CdlPRPSTabloid**{: #CdlPRPSConstants_CdlPRPSTabloid } | 3 | **CdlPRPSESheet**{: #CdlPRPSConstants_CdlPRPSESheet } | 26 |
| **CdlPRPSLedger**{: #CdlPRPSConstants_CdlPRPSLedger } | 4 | **CdlPRPSEnvDL**{: #CdlPRPSConstants_CdlPRPSEnvDL } | 27 |
| **CdlPRPSLegal**{: #CdlPRPSConstants_CdlPRPSLegal } | 5 | **CdlPRPSEnvC5**{: #CdlPRPSConstants_CdlPRPSEnvC5 } | 28 |
| **CdlPRPSStatement**{: #CdlPRPSConstants_CdlPRPSStatement } | 6 | **CdlPRPSEnvC3**{: #CdlPRPSConstants_CdlPRPSEnvC3 } | 29 |
| **CdlPRPSExecutive**{: #CdlPRPSConstants_CdlPRPSExecutive } | 7 | **CdlPRPSEnvC4**{: #CdlPRPSConstants_CdlPRPSEnvC4 } | 30 |
| **CdlPRPSA3**{: #CdlPRPSConstants_CdlPRPSA3 } | 8 | **CdlPRPSEnvC6**{: #CdlPRPSConstants_CdlPRPSEnvC6 } | 31 |
| **CdlPRPSA4**{: #CdlPRPSConstants_CdlPRPSA4 } | 9 | **CdlPRPSEnvC65**{: #CdlPRPSConstants_CdlPRPSEnvC65 } | 32 |
| **CdlPRPSA4Small**{: #CdlPRPSConstants_CdlPRPSA4Small } | 10 | **CdlPRPSEnvB4**{: #CdlPRPSConstants_CdlPRPSEnvB4 } | 33 |
| **CdlPRPSA5**{: #CdlPRPSConstants_CdlPRPSA5 } | 11 | **CdlPRPSEnvB5**{: #CdlPRPSConstants_CdlPRPSEnvB5 } | 34 |
| **CdlPRPSB4**{: #CdlPRPSConstants_CdlPRPSB4 } | 12 | **CdlPRPSEnvB6**{: #CdlPRPSConstants_CdlPRPSEnvB6 } | 35 |
| **CdlPRPSB5**{: #CdlPRPSConstants_CdlPRPSB5 } | 13 | **CdlPRPSEnvItaly**{: #CdlPRPSConstants_CdlPRPSEnvItaly } | 36 |
| **CdlPRPSFolio**{: #CdlPRPSConstants_CdlPRPSFolio } | 14 | **CdlPRPSEnvMonarch**{: #CdlPRPSConstants_CdlPRPSEnvMonarch } | 37 |
| **CdlPRPSQuarto**{: #CdlPRPSConstants_CdlPRPSQuarto } | 15 | **CdlPRPSEnvPersonal**{: #CdlPRPSConstants_CdlPRPSEnvPersonal } | 38 |
| **CdlPRPS10x14**{: #CdlPRPSConstants_CdlPRPS10x14 } | 16 | **CdlPRPSFanfoldUS**{: #CdlPRPSConstants_CdlPRPSFanfoldUS } | 39 |
| **CdlPRPS11x17**{: #CdlPRPSConstants_CdlPRPS11x17 } | 17 | **CdlPRPSFanfoldStdGerman**{: #CdlPRPSConstants_CdlPRPSFanfoldStdGerman } | 40 |
| **CdlPRPSNote**{: #CdlPRPSConstants_CdlPRPSNote } | 18 | **CdlPRPSFanfoldLglGerman**{: #CdlPRPSConstants_CdlPRPSFanfoldLglGerman } | 41 |
| **CdlPRPSEnv9**{: #CdlPRPSConstants_CdlPRPSEnv9 } | 19 | **CdlPRPSUser**{: #CdlPRPSConstants_CdlPRPSUser } | 256 |
| **CdlPRPSEnv10**{: #CdlPRPSConstants_CdlPRPSEnv10 } | 20 | | |
| **CdlPRPSEnv11**{: #CdlPRPSConstants_CdlPRPSEnv11 } | 21 | | |
| **CdlPRPSEnv12**{: #CdlPRPSConstants_CdlPRPSEnv12 } | 22 | | |
| **CdlPRPSEnv14**{: #CdlPRPSConstants_CdlPRPSEnv14 } | 23 | | |

## CdlPSDConstants
{: #cdlpsdconstants }

The flags of the Page Setup dialog, in [**Flags**](#flags). Each is the `PSD_` flag of Windows of that name.

| Member | Value | Description |
|---|---|---|
| **CdlPSDDefaultMinMargins**{: #CdlPSDConstants_CdlPSDDefaultMinMargins } | &H0 | The smallest margins are the printer's. |
| **CdlPSDMinMargins**{: #CdlPSDConstants_CdlPSDMinMargins } | &H1 | The smallest margins are those of the **Page...MinMargin** properties. |
| **CdlPSDMargins**{: #CdlPSDConstants_CdlPSDMargins } | &H2 | The dialog starts with the margin properties. |
| **CdlPSDInThousandthsOfInches**{: #CdlPSDConstants_CdlPSDInThousandthsOfInches } | &H4 | The margins are in thousandths of an inch. |
| **CdlPSDInHundredthsOfMillimeters**{: #CdlPSDConstants_CdlPSDInHundredthsOfMillimeters } | &H8 | The margins are in hundredths of a millimetre. |
| **CdlPSDDisableMargins**{: #CdlPSDConstants_CdlPSDDisableMargins } | &H10 | The margins cannot be changed. |
| **CdlPSDDisablePrinter**{: #CdlPSDConstants_CdlPSDDisablePrinter } | &H20 | The **Printer** button is disabled. |
| **CdlPSDNoWarning**{: #CdlPSDConstants_CdlPSDNoWarning } | &H80 | No message when there is no default printer. |
| **CdlPSDDisableOrientation**{: #CdlPSDConstants_CdlPSDDisableOrientation } | &H100 | The orientation cannot be changed. |
| **CdlPSDDisablePaper**{: #CdlPSDConstants_CdlPSDDisablePaper } | &H200 | The paper size and source cannot be changed. |
| **CdlPSDReturnDefault**{: #CdlPSDConstants_CdlPSDReturnDefault } | &H400 | No dialog is shown: the properties are set to the default printer's. |
| **CdlPSDHelpButton**{: #CdlPSDConstants_CdlPSDHelpButton } | &H800 | A **Help** button. |
| **CdlPSDDisablePagePainting**{: #CdlPSDConstants_CdlPSDDisablePagePainting } | &H80000 | The sample page is drawn empty. |
| **CdlPSDNoNetworkButton**{: #CdlPSDConstants_CdlPSDNoNetworkButton } | &H200000 | No **Network** button. |

## See Also

- [CommonDialog](../VBComDlg/CommonDialog) -- the same class in the VBComDlg package
- [MCIWnd](MCIWnd) -- the control whose **ShowOpen** and **ShowSave** show this class's dialogs
- [VBCCR18 Package](.)
