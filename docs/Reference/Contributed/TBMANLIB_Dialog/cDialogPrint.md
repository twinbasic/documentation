---
title: cDialogPrint
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogPrint
has_toc: false
---

# cDialogPrint class
{: .no_toc }

A **cDialogPrint** shows the Windows Print dialog, in which the user picks a printer, a range of pages and a number of copies. The class prints nothing: it returns the choices as properties and, by default, a device context for the printer the user chose, on which the program prints. It also describes the choice as a line of text.

**Properties:** [**AllowPageRange**](#allowpagerange), [**AllowPrintToFile**](#allowprinttofile), [**AllowSelection**](#allowselection), [**Cancelled**](#cancelled), [**Collate**](#collate), [**Copies**](#copies), [**FromPage**](#frompage), [**hDC**](#hdc), [**HidePrintToFile**](#hideprinttofile), [**LastError**](#lasterror), [**MaxPage**](#maxpage), [**MinPage**](#minpage), [**OwnerHwnd**](#ownerhwnd), [**PrintRangeMode**](#printrangemode), [**PrintToFile**](#printtofile), [**ReturnDC**](#returndc), [**ToPage**](#topage).
**Methods:** [**Reset**](#reset), [**ShowDialog**](#showdialog), [**ToDescription**](#todescription).
**Enumerations:** [**PrintRange**](#printrange).

Create an object with `Dim dlg As New cDialogPrint`. The class is declared `[COMCreatable(False)]`, so **CreateObject** cannot make one, and **New** can.

```tb check_build
Private Declare PtrSafe Function PrDeleteDC Lib "gdi32" Alias "DeleteDC" (ByVal hDC As LongPtr) As Long

Private Sub ChooseAndPrint()
    Dim dlg As New cDialogPrint

    dlg.MinPage = 1
    dlg.MaxPage = 12
    dlg.FromPage = 1
    dlg.ToPage = 12
    If dlg.ShowDialog() Then
        Debug.Print dlg.ToDescription()
        ' ... print on dlg.hDC ...
        PrDeleteDC dlg.hDC
    ElseIf dlg.Cancelled Then
        Debug.Print "Cancelled"
    Else
        Debug.Print "Error " & dlg.LastError
    End If
End Sub
```

<!-- test: CDialogPrintTests.ShowDialog_CancelReturnsFalseAndSetsCancelled, CDialogPrintTests.ShowDialog_OKReturnsTrueAndClearsCancelled -->
## How the dialog is shown

[**ShowDialog**](#showdialog) calls `PrintDlgW`, the classic Print dialog, not the newer `PrintDlgEx`. The properties set these flags when they have the value shown: [**ReturnDC**](#returndc) **True** (`PD_RETURNDC`), [**Collate**](#collate) **True** (`PD_COLLATE`), [**PrintToFile**](#printtofile) **True** (`PD_PRINTTOFILE`), [**AllowSelection**](#allowselection) **False** (`PD_NOSELECTION`), [**AllowPageRange**](#allowpagerange) **False** (`PD_NOPAGENUMS`), [**HidePrintToFile**](#hideprinttofile) **True** (`PD_HIDEPRINTTOFILE`) and [**AllowPrintToFile**](#allowprinttofile) **False** (`PD_DISABLEPRINTTOFILE`). [**PrintRangeMode**](#printrangemode) adds `PD_SELECTION` or `PD_PAGENUMS`. The class passes no printer settings and sets no hook, template or help button. The dialog is modal and has the title *Print*; its printer is the default printer of the computer until the user changes it.

When the user chooses **OK**, [**ShowDialog**](#showdialog) stores the page range, the number of copies, the collate and print-to-file choices, the kind of range and, with [**ReturnDC**](#returndc), the device context in the properties, and returns **True**. [**Cancelled**](#cancelled) is then **False**. When the user chooses **Cancel**, or closes the dialog, it returns **False** and sets **Cancelled** to **True**, and the other properties are unchanged. When the call itself fails, it returns **False**, leaves **Cancelled** **False** and stores the error code in [**LastError**](#lasterror).

The class frees the printer data that Windows allocates for the dialog. The printer that the user chose, its paper, its orientation and the other settings of its driver are therefore not returned as such. They are in the device context, which is set up for the chosen printer with its settings, so a program that needs to know them asks the context with the API function `GetDeviceCaps`.

<!-- /test -->

<!-- test: probe c26 -->
> [!IMPORTANT] 1.1.0.0
> With [**ReturnDC**](#returndc) **True**, which is the default, every **OK** creates a device context that the class never deletes. The program must delete it with the API function `DeleteDC` when it has finished with it, as the sample at the head of the page does, or set **ReturnDC** to **False** when it does not need the context. [**Reset**](#reset), and a later [**ShowDialog**](#showdialog) that returns **True**, replace the handle without deleting the old context.

<!-- /test -->

<!-- test: CDialogPrintTests.ShowDialog_FromPageAbove32767RaisesOverflowBeforeTheDialog, CDialogPrintTests.ShowDialog_ToPageAbove32767RaisesOverflow, CDialogPrintTests.ShowDialog_MinPageAbove32767RaisesOverflow, CDialogPrintTests.ShowDialog_MaxPageAbove32767RaisesOverflow, CDialogPrintTests.ShowDialog_CopiesAbove32767RaisesOverflow -->
> [!NOTE] 1.1.0.0
> The page numbers and the number of copies are passed to Windows as 16-bit integers. A [**FromPage**](#frompage), [**ToPage**](#topage), [**MinPage**](#minpage), [**MaxPage**](#maxpage) or [**Copies**](#copies) that does not fit, one above 32,767 or one below -32,768, makes [**ShowDialog**](#showdialog) raise error 6, *Overflow*, before the dialog opens.

<!-- test: CDialogPrintTests.Defaults_AreThoseOfThePage, CDialogPrintTests.Copies_IgnoresZeroAndNegativeValues, CDialogPrintTests.ToDescription_NamesRangeCopiesAndOptions, CDialogPrintTests.Reset_RestoresTheStartingValues -->
## Properties

### AllowPageRange
{: .no_toc }

Whether the user may choose a range of pages.

Syntax: *object*.**AllowPageRange** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PD_NOPAGENUMS`, and the *Pages* button and the *from* and *to* boxes are shown disabled.

```tb check_build
Dim dlg As New cDialogPrint

dlg.AllowPageRange = False
Debug.Print dlg.AllowPageRange
```

### AllowPrintToFile
{: .no_toc }

Whether the user may choose *Print to file*.

Syntax: *object*.**AllowPrintToFile** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PD_DISABLEPRINTTOFILE`, and the *Print to file* box is shown disabled. To remove the box, use [**HidePrintToFile**](#hideprinttofile).

```tb check_build
Dim dlg As New cDialogPrint

dlg.AllowPrintToFile = False
Debug.Print dlg.AllowPrintToFile
```

### AllowSelection
{: .no_toc }

Whether the user may choose *Selection*.

Syntax: *object*.**AllowSelection** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PD_NOSELECTION`, and the *Selection* button is shown disabled. Set it to **False** when the program has no selection to print.

```tb check_build
Dim dlg As New cDialogPrint

dlg.AllowSelection = False
Debug.Print dlg.AllowSelection
```

### Cancelled
{: .no_toc }

Whether the last [**ShowDialog**](#showdialog) ended because the user cancelled.

Syntax: *object*.**Cancelled**

A read-only **Boolean**, **False** by default. A **ShowDialog** that returns **True** sets it to **False**, one the user cancelled sets it to **True**, and one that failed sets it to **False**, so the three outcomes can be told apart with [**LastError**](#lasterror).

```tb check_build
Dim dlg As New cDialogPrint

If Not dlg.ShowDialog() Then
    If dlg.Cancelled Then Debug.Print "The user cancelled"
End If
```

### Collate
{: .no_toc }

Whether the copies are collated.

Syntax: *object*.**Collate** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `PD_COLLATE` and the *Collate* box starts selected. The box is disabled while [**Copies**](#copies) is 1. After **OK** it holds the state the user left.

```tb check_build
Dim dlg As New cDialogPrint

dlg.Copies = 3
dlg.Collate = True
Debug.Print dlg.ToDescription()
```

### Copies
{: .no_toc }

The number of copies.

Syntax: *object*.**Copies** [ **=** *value* ]

A **Long**, 1 by default. A value of 0 or less is ignored, without an error. The dialog shows it in the *Number of copies* box, and after **OK** it holds the number the user left. It must fit a 16-bit integer: see the note at the head of the page.

```tb check_build check_run
Dim dlg As New cDialogPrint

dlg.Copies = 3
dlg.Copies = 0          ' ignored
dlg.Copies = -2         ' ignored
Debug.Print dlg.Copies
' Output:
' 3
```

### FromPage
{: .no_toc }

The first page of the range.

Syntax: *object*.**FromPage** [ **=** *value* ]

A **Long**, 1 by default. It is the *from* box of the dialog. After a [**ShowDialog**](#showdialog) that returned **True** it holds the first page the user typed or left; when the user chose *All* or *Selection*, it keeps the value the dialog was given. It is meaningful when [**PrintRangeMode**](#printrangemode) is **PageRange**.

```tb check_build
Dim dlg As New cDialogPrint

dlg.MinPage = 1
dlg.MaxPage = 20
dlg.PrintRangeMode = PrintRange.PageRange
dlg.FromPage = 3
dlg.ToPage = 7
If dlg.ShowDialog() Then Debug.Print dlg.FromPage & "-" & dlg.ToPage
```

### hDC
{: .no_toc }

The device context of the chosen printer.

Syntax: *object*.**hDC**

A read-only **LongPtr**, 0 by default. After a [**ShowDialog**](#showdialog) that returned **True** with [**ReturnDC**](#returndc) **True**, it holds a device context for the printer that the user chose, with the settings the user chose, and the program must delete it: see the note under [How the dialog is shown](#how-the-dialog-is-shown). With **ReturnDC** **False** Windows returns no context and the property is 0. A cancelled or failed call leaves the property as it was.

```tb check_build
Private Declare PtrSafe Function PrDeleteDC2 Lib "gdi32" Alias "DeleteDC" (ByVal hDC As LongPtr) As Long

Private Sub UseContext()
    Dim dlg As New cDialogPrint

    If dlg.ShowDialog() Then
        Debug.Print dlg.hDC <> 0
        PrDeleteDC2 dlg.hDC
    End If
End Sub
```

### HidePrintToFile
{: .no_toc }

Whether the dialog hides *Print to file*.

Syntax: *object*.**HidePrintToFile** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `PD_HIDEPRINTTOFILE`, and the *Print to file* box is not shown.

```tb check_build
Dim dlg As New cDialogPrint

dlg.HidePrintToFile = True
Debug.Print dlg.HidePrintToFile
```

### LastError
{: .no_toc }

The error code of the last call that failed.

Syntax: *object*.**LastError**

A read-only **Long**, 0 by default. When the call to Windows fails and the user did not cancel, [**ShowDialog**](#showdialog) stores the value of `CommDlgExtendedError` here. A later call that succeeds or is cancelled does not reset it; only [**Reset**](#reset) does.

```tb check_build
Dim dlg As New cDialogPrint

If Not dlg.ShowDialog() Then
    If Not dlg.Cancelled Then Debug.Print "Failed: " & dlg.LastError
End If
```

### MaxPage
{: .no_toc }

The largest page number the user may enter.

Syntax: *object*.**MaxPage** [ **=** *value* ]

A **Long**, 9999 by default. It must fit a 16-bit integer: with 32,768 or more, [**ShowDialog**](#showdialog) raises error 6, *Overflow*.

```tb check_build check_run
Dim dlg As New cDialogPrint

dlg.MaxPage = 40000
On Error Resume Next
Debug.Print dlg.ShowDialog()
Debug.Print Err.Number
' Output:
' 6
```

### MinPage
{: .no_toc }

The smallest page number the user may enter.

Syntax: *object*.**MinPage** [ **=** *value* ]

A **Long**, 1 by default. It must fit a 16-bit integer, as [**MaxPage**](#maxpage) must.

```tb check_build
Dim dlg As New cDialogPrint

dlg.MinPage = 1
dlg.MaxPage = 50
Debug.Print dlg.MinPage
```

### OwnerHwnd
{: .no_toc }

The window that owns the dialog.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

A **LongPtr** window handle, 0 by default, which gives the dialog no owner. [**ShowDialog**](#showdialog) passes it as the owner window of the call. [**Reset**](#reset) does not change it.

```tb check_build
Private Sub ChoosePrinter(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogPrint

    dlg.OwnerHwnd = ownerWindow         ' the handle of a window of the program
    dlg.ReturnDC = False
    Debug.Print dlg.OwnerHwnd
    Debug.Print dlg.ShowDialog()
End Sub
```

### PrintRangeMode
{: .no_toc }

Which pages are printed.

Syntax: *object*.**PrintRangeMode** [ **=** *value* ]

A [**PrintRange**](#printrange), **AllPages** by default. It selects the button of the *Print range* group that the dialog starts with, and after **OK** it holds the button that was selected. **PageRange** uses [**FromPage**](#frompage) and [**ToPage**](#topage). A number that is not a member of **PrintRange** is passed without a flag, so the dialog starts with *All*, and [**ToDescription**](#todescription) writes no range for it.

```tb check_build
Dim dlg As New cDialogPrint

dlg.PrintRangeMode = PrintRange.Selection
Debug.Print dlg.ToDescription()
```

### PrintToFile
{: .no_toc }

Whether the output goes to a file.

Syntax: *object*.**PrintToFile** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `PD_PRINTTOFILE` and the *Print to file* box starts selected. After **OK** it holds the state the user left. The class does not ask for a file name and does not print: it is for the program to send its output to a file when the property is **True**.

```tb check_build
Dim dlg As New cDialogPrint

dlg.PrintToFile = True
Debug.Print dlg.ToDescription()
```

### ReturnDC
{: .no_toc }

Whether the dialog returns a device context for the chosen printer.

Syntax: *object*.**ReturnDC** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `PD_RETURNDC` and [**hDC**](#hdc) holds the context after **OK**. The program must delete the context: see the note under [How the dialog is shown](#how-the-dialog-is-shown).

```tb check_build
Dim dlg As New cDialogPrint

dlg.ReturnDC = False       ' the program only needs the page range
Debug.Print dlg.ReturnDC
```

### ToPage
{: .no_toc }

The last page of the range.

Syntax: *object*.**ToPage** [ **=** *value* ]

A **Long**, 1 by default. It is the *to* box of the dialog, and is handled as [**FromPage**](#frompage) is.

```tb check_build
Dim dlg As New cDialogPrint

dlg.FromPage = 2
dlg.ToPage = 5
Debug.Print dlg.ToPage
```

## Methods

### Reset
{: .no_toc }

Restores the properties to their starting values.

Syntax: *object*.**Reset**

[**FromPage**](#frompage), [**ToPage**](#topage), [**MinPage**](#minpage) and [**Copies**](#copies) become 1, [**MaxPage**](#maxpage) 9999, [**PrintRangeMode**](#printrangemode) **AllPages**, [**Collate**](#collate), [**PrintToFile**](#printtofile) and [**HidePrintToFile**](#hideprinttofile) **False**, the three **Allow** properties and [**ReturnDC**](#returndc) **True**, [**hDC**](#hdc) and [**LastError**](#lasterror) 0 and [**Cancelled**](#cancelled) **False**. It does not delete a device context, and it does not change [**OwnerHwnd**](#ownerhwnd).

```tb check_build check_run
Dim dlg As New cDialogPrint

dlg.Copies = 4
dlg.MaxPage = 40
dlg.PrintRangeMode = PrintRange.Selection
dlg.Reset
Debug.Print dlg.ToDescription()
Debug.Print dlg.MaxPage
' Output:
' All pages, 1 copy
' 9999
```

### ShowDialog
{: .no_toc }

Shows the Print dialog.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user chose **OK**, and then the properties hold the choice. Returns **False** when the user cancelled ([**Cancelled**](#cancelled) is **True**) or when the call failed ([**LastError**](#lasterror) holds the code). It raises error 6 when a page number or the number of copies does not fit a 16-bit integer. It sends nothing to a printer. See [How the dialog is shown](#how-the-dialog-is-shown).

```tb check_build
Dim dlg As New cDialogPrint

dlg.ReturnDC = False
dlg.MinPage = 1
dlg.MaxPage = 20
dlg.PrintRangeMode = PrintRange.PageRange
dlg.FromPage = 3
dlg.ToPage = 7
If dlg.ShowDialog() Then
    Debug.Print dlg.ToDescription()
End If
```

### ToDescription
{: .no_toc }

Returns the choice as a line of text.

Syntax: *object*.**ToDescription** ( ) **As String**

The range, then the number of copies, then `, Collated` and `, Print to file` for each that is **True**. The range is `All pages`, `Selection`, or `Pages ` followed by [**FromPage**](#frompage), ` - ` and [**ToPage**](#topage). The copies are `1 copy` or `n copies`.

```tb check_build check_run
Dim dlg As New cDialogPrint

Debug.Print dlg.ToDescription()
dlg.PrintRangeMode = PrintRange.PageRange
dlg.FromPage = 2
dlg.ToPage = 4
dlg.Copies = 3
dlg.Collate = True
dlg.PrintToFile = True
Debug.Print dlg.ToDescription()
' Output:
' All pages, 1 copy
' Pages 2 - 4, 3 copies, Collated, Print to file
```

<!-- /test -->

## Enumerations

### PrintRange
{: .no_toc }

Which pages are printed, the type of [**PrintRangeMode**](#printrangemode).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **AllPages** | 0 | Every page. |
| **Selection** | 1 | The selection of the program. |
| **PageRange** | 2 | The pages from [**FromPage**](#frompage) to [**ToPage**](#topage). |

<!-- test: compile PrintRangeQualifiedByTheClass -->
The enumeration is declared inside the class. A program names its members with the name of the enumeration in front, as in the samples, or by the member alone, such as `Selection`. The name of the class cannot be put in front: `cDialogPrint.PrintRange.Selection` is refused with TB5079, *Unrecognized symbol 'cDialogPrint'*.
<!-- /test -->

## See Also

- [cDialogPageSetup](cDialogPageSetup) class -- shows the Page Setup dialog
- [cDialogFont](cDialogFont) class -- shows the Font dialog
- [cDialog](cDialog/) class -- shows the Open, Save As and Browse For Folder dialogs
- [TBMANLIB_Dialog](.) package -- overview
