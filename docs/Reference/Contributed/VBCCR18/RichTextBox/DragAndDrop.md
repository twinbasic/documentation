---
title: Drag and Drop
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/DragAndDrop
has_toc: false
---

# Drag and Drop
{: .no_toc }

Lets the user drag text out of a [**RichTextBox**](.) and drop text, pictures and files into it, either by the rich edit control's own drag and drop or by the OLE drag and drop of VB6.

<!-- test: RichTextBoxDragTests.OLEDragMode_AutomaticWithOLEDragDropRTF_Raises383, RichTextBoxDragTests.OLEDragDropRTF_False_MakesANewWindowAndKeepsTheText -->
```tb check_build check_run arch=win32,win64
On Error Resume Next
RichTextBox1.OLEDragMode = vbOLEDragAutomatic   ' refused while OLEDragDropRTF is True
Debug.Print Err.Number
On Error GoTo 0
RichTextBox1.OLEDragDropRTF = False
RichTextBox1.OLEDragMode = vbOLEDragAutomatic
RichTextBox1.OLEDropMode = OLEDropModeManual
Debug.Print RichTextBox1.OLEDragMode; RichTextBox1.OLEDropMode
' Output:
'  383
'  1  1
```
<!-- /test -->

* TOC
{:toc}

## The rich edit control's drag and drop

While [**OLEDragDropRTF**](#oledragdroprtf) is **True**, the default, the rich edit control of Windows does the dragging and dropping itself. The user drags the selected text, with its formatting, to another place of the box or to another program, and drops text, RTF, pictures and files from other programs into the box, where they come in at the place of the drop. The control raises its own events for it: [**OLEGetDragEffect**](#olegetdrageffect) when a drag starts at the box, [**OLEGetDropEffect**](#olegetdropeffect) while something is dragged over it, and [**OLEDragDropDone**](#oledragdropdone) when a drag that started at it has ended.

<!-- test: RichTextBoxDragTests.OLEDropMode_ManualWithOLEDragDropRTF_Raises383, RichTextBoxDragTests.OLEDragDropScroll_FalseWithOLEDragDropRTF_Raises383, RichTextBoxDragTests.OLEDragDropRTF_True_ResetsTheOtherProperties -->
In this mode the three properties of the other one keep their defaults: an [**OLEDragMode**](#oledragmode) other than **vbOLEDragManual**, an [**OLEDropMode**](#oledropmode) other than **OLEDropModeNone**, and an [**OLEDragDropScroll**](#oledragdropscroll) of **False** raise run-time error 383, which says so. Setting **OLEDragDropRTF** to **True** gives the three their defaults again.
<!-- /test -->

## The OLE drag and drop of VB6

With **OLEDragDropRTF** set to **False**, the box does what a [**TextBoxW**](../TextBoxW#dragging-text-and-dropping-files) does. With **OLEDragMode** set to **vbOLEDragAutomatic** the user can drag the selected text out of the box: the data holds it as Unicode text, as text and as RTF, and text dropped elsewhere as a move is removed from the box. With **OLEDropMode** set to **OLEDropModeManual** the control raises [**OLEDragOver**](../Common#oledragover) and [**OLEDragDrop**](../Common#oledragdrop), and the program puts the data into the text itself. The control raises the other [OLE drag-and-drop events](../Common#ole-drag-and-drop) as the other controls do.

In this mode files that the user drags from Explorer raise [**DropFiles**](#dropfiles), while [**AllowDropFiles**](#allowdropfiles) is **True**.

```tb check_build
Private Sub RichTextBox1_DropFiles(FileList As Variant, ByVal X As Single, ByVal Y As Single, ByVal CharPos As Long, ByVal Protected As Boolean, Cancel As Boolean)
    Dim i As Long
    RichTextBox1.SelStart = CharPos         ' the place of the drop
    For i = LBound(FileList) To UBound(FileList)
        RichTextBox1.SelText = FileList(i) & vbCr
    Next
End Sub
```

Properties
----------

### AllowDropFiles
{: .no_toc }

Whether the box takes files that are dragged from Explorer, and raises [**DropFiles**](#dropfiles) for them. **Boolean**. Default: **False**. It has an effect while [**OLEDragDropRTF**](#oledragdroprtf) is **False**.

### OLEDragDropRTF
{: .no_toc }

Whether the rich edit control does the dragging and dropping itself. **Boolean**. Default: **True**. See [The rich edit control's drag and drop](#the-rich-edit-controls-drag-and-drop).

A change makes the control's window again, with the same text and the same selection, so [**hWnd**](../Common#hwnd) returns another handle afterwards.

### OLEDragDropScroll
{: .no_toc }

Whether a box with scroll bars scrolls while data is dragged over it near an edge, in the OLE drag and drop of VB6. **Boolean**. Default: **True**. While [**OLEDragDropRTF**](#oledragdroprtf) is **True** it must stay **True**.

### OLEDragMode
{: .no_toc }

Whether the user can drag the selected text out of the box, in the OLE drag and drop of VB6. A member of [**OLEDragConstants**](../../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (the default), with which only [**OLEDrag**](../Common#oledrag) starts a drag, or **vbOLEDragAutomatic**. Another value raises run-time error 380. While [**OLEDragDropRTF**](#oledragdroprtf) is **True** it must stay **vbOLEDragManual**.

### OLEDropMode
{: .no_toc }

Whether the box raises the OLE drop events, in the OLE drag and drop of VB6. A member of [**OLEDropModeConstants**](../Common#oledropmodeconstants). Default: **OLEDropModeNone**. While [**OLEDragDropRTF**](#oledragdroprtf) is **True** it must stay **OLEDropModeNone**.

<!-- test: RichTextBoxDragTests.OLEDropMode_Automatic_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

Events
------

### DropFiles
{: .no_toc }

Raised when the user drops files on the box, while [**AllowDropFiles**](#allowdropfiles) is **True** and [**OLEDragDropRTF**](#oledragdroprtf) is **False**.

Syntax: *object*\_**DropFiles**( *FileList* **As Variant**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single**, **ByVal** *CharPos* **As Long**, **ByVal** *Protected* **As Boolean**, *Cancel* **As Boolean** )

*FileList*
: An array of **String**, counted from 0: the full path of each file.

*X*, *Y*
: The place of the drop, measured from the top left corner of the box in the scale units of the control's container.

*CharPos*
: The place in the text, counted from 0, at which the files were dropped.

*Protected*
: Whether that place is in [protected text](LinksAndProtection#protected-text).

*Cancel*
: **False** when the event is raised, with which the control leaves the files out of the text.

### OLEDragDropDone
{: .no_toc }

Raised at the box when a drag that the rich edit control started there has ended, dropped or cancelled.

Syntax: *object*\_**OLEDragDropDone**( )

### OLEGetDragEffect
{: .no_toc }

Raised when the user starts to drag the selected text with the rich edit control's own drag and drop.

Syntax: *object*\_**OLEGetDragEffect**( *AllowedEffects* **As Long** )

*AllowedEffects*
: The sum of the [**OLEDropEffectConstants**](../../../VBRUN/Constants/OLEDropEffectConstants) members for what a target may do with the text. A handler can change it, for example to **vbDropEffectCopy** to keep the text in the box.

### OLEGetDropEffect
{: .no_toc }

Raised while data is dragged over the box with the rich edit control's own drag and drop.

Syntax: *object*\_**OLEGetDropEffect**( *Effect* **As Long**, **ByVal** *Button* **As Integer**, **ByVal** *Shift* **As Integer**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*Effect*
: What a drop here would do with the data, a member of [**OLEDropEffectConstants**](../../../VBRUN/Constants/OLEDropEffectConstants). A handler can change it; **vbDropEffectNone** refuses the drop.

*Button*, *Shift*
: The mouse buttons and the keys held down, as in [**MouseDown**](../Common#mousedown-mousemove-mouseup).

*X*, *Y*
: The place of the pointer, measured from the top left corner of the box in the scale units of the control's container.

## See Also

- [RichTextBox](.) control
- [Common members](../Common#ole-drag-and-drop) -- the OLE drag-and-drop events of VB6
- [TextBoxW](../TextBoxW) control -- the same OLE drag and drop in a text box
