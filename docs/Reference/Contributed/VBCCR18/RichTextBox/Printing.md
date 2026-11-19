---
title: Printing
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/Printing
has_toc: false
---

# Printing
{: .no_toc }

Prints the text of a [**RichTextBox**](.), or its selection, with its formatting, on a printer or on another device that the program gives a device context of.

```tb check_build
Private Sub PrintLetter(ByVal hPrinterDC As LongPtr)
    ' hPrinterDC: the device context of a printer, such as the PrintDlg function of Windows returns
    RichTextBox1.PrintDoc hPrinterDC, True, "Letter", 1440, 1440, 1440, 1440   ' margins of an inch
End Sub
```

* TOC
{:toc}

## Pages, margins and the print job

[**PrintDoc**](#printdoc) prints the whole text, and [**SelPrint**](#selprint) the selection, or the whole text when nothing is selected. Both take the handle of a device context, *hDC*, and do nothing when it is 0.

On a printer the text fills one page after the other, inside the margins, which are measured from the edges of the paper in twips. With *CallStartEndDoc* **True**, the default, the method makes a print job of its own, named *DocName*, and ends it when the last page is done; when a page fails, the job is cancelled. With **False** the program has started the job itself, with the **StartDoc** function of Windows, and ends it with **EndDoc**, so that it can print more in the same job.

On a device context that is not a printer's, such as that of a window or of a bitmap in memory, the method draws the text once, on one page the size of the screen, and makes no print job.

Methods
-------

### PrintDoc
{: .no_toc }

Prints the whole text on a device.

Syntax: *object*.**PrintDoc** *hDC* [, *CallStartEndDoc* ] [, *DocName* ] [, *LeftMargin* ] [, *TopMargin* ] [, *RightMargin* ] [, *BottomMargin* ]

*hDC*
: *required* A **LongPtr**: the handle of the device context to print on.

*CallStartEndDoc*
: *optional* A **Boolean**: **True** (the default) to make a print job, **False** when the program has started one. See [Pages, margins and the print job](#pages-margins-and-the-print-job).

*DocName*
: *optional* A **String**: the name of the print job, as the queue of the printer shows it. The default is `RICHTEXT`.

*LeftMargin*, *TopMargin*, *RightMargin*, *BottomMargin*
: *optional* **Long** values: the margins, in twips from the edges of the paper. The default of each is 0.

### SelPrint
{: .no_toc }

Prints the selection on a device, or the whole text when nothing is selected. It takes the same parameters as [**PrintDoc**](#printdoc).

Syntax: *object*.**SelPrint** *hDC* [, *CallStartEndDoc* ] [, *DocName* ] [, *LeftMargin* ] [, *TopMargin* ] [, *RightMargin* ] [, *BottomMargin* ]

## See Also

- [RichTextBox](.) control
- [Selection](Selection) -- what **SelPrint** prints
