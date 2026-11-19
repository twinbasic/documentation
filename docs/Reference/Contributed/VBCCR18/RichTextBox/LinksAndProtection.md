---
title: Links and Protected Text
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/LinksAndProtection
has_toc: false
---

# Links and Protected Text
{: .no_toc }

Marks text of a [**RichTextBox**](.) as a link, which reports what the user does with the mouse over it, and protects text against changes.

```tb hidden
Class RtbProtectionWatcher
    Public WithEvents Box As VBCCR18.RichTextBox
    Private Sub Box_ModifyProtected(Allow As Boolean, ByVal SelStart As Long, ByVal SelEnd As Long) Handles Box.ModifyProtected
        Debug.Print "ModifyProtected"
    End Sub
End Class
```

<!-- test: RichTextBoxLinksTests.SelProtected_SelText_RaisesModifyProtectedAndKeepsTheText, RichTextBoxLinksTests.Text_Assigned_ReplacesProtectedText -->
```tb check_build check_run arch=win32,win64
Dim Watch As New RtbProtectionWatcher
RichTextBox1.Text = "Name: Ada"
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 5
RichTextBox1.SelProtected = True        ' "Name:" cannot change
Set Watch.Box = RichTextBox1
RichTextBox1.SelStart = 1
RichTextBox1.SelLength = 1
RichTextBox1.SelText = "X"              ' refused
Debug.Print RichTextBox1.Text
RichTextBox1.Text = "Other"             ' Text replaces protected text too
Debug.Print RichTextBox1.Text
' Output:
' ModifyProtected
' Name: Ada
' Other
```
<!-- /test -->

**RtbProtectionWatcher** in this sample is a class of the program's own that holds the control **WithEvents** and prints its **ModifyProtected** event.

* TOC
{:toc}

## Links

<!-- test: RichTextBoxLinksTests.AutoURLDetect_True_MarksAUrlAsALink, RichTextBoxLinksTests.SelLink_AutoURLDetectFalse_IsKept, RichTextBoxLinksTests.SelLink_AutoURLDetectTrue_OnTextThatIsNoUrl_IsNotKept -->
Text with [**SelLink**](#sellink) set to **True** is a link, underlined and in the color of links. While [**AutoURLDetect**](#autourldetect) is **True**, the default, the control finds the addresses in the text, such as `http://example.com`, and makes each a link; a link that the program sets on other text does not stay. With **AutoURLDetect** set to **False** the program decides which text is a link.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "See http://example.com for more."
RichTextBox1.SelStart = 6
Debug.Print RichTextBox1.SelLink         ' found by AutoURLDetect
RichTextBox1.AutoURLDetect = False
RichTextBox1.Text = "Read the manual."
RichTextBox1.SelStart = 9
RichTextBox1.SelLength = 6
RichTextBox1.SelLink = True              ' "manual" as a link
Debug.Print RichTextBox1.SelLink
' Output:
' True
' True
```

<!-- test: RichTextBoxLinksTests.LinkEvent_Click_RaisesTheButtonMessages -->
The control raises [**LinkEvent**](#linkevent) when the user presses or releases a mouse button over a link, and with the window message that says which: **WM_LBUTTONDOWN** (&H201), **WM_LBUTTONUP** (&H202) and the like. The control does nothing else with the link: a program that opens it does so in the handler, with the text that [**GetTextRange**](Selection#gettextrange) returns for it.
<!-- /test -->

```tb check_build
Private Sub RichTextBox1_LinkEvent(ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByVal LinkStart As Long, ByVal LinkEnd As Long)
    Const WM_LBUTTONUP As Long = &H202
    If wMsg = WM_LBUTTONUP Then
        Debug.Print "Open "; RichTextBox1.GetTextRange(LinkStart, LinkEnd)
    End If
End Sub
```

## Protected text

<!-- test: RichTextBoxLinksTests.SelProtected_Typing_RaisesModifyProtectedAndKeepsTheText, RichTextBoxLinksTests.ModifyProtected_Allow_ChangesTheText, RichTextBoxTextTests.TextRTF_ProtectedText_RaisesModifyProtected -->
Text with [**SelProtected**](#selprotected) set to **True** cannot be changed. When the user types, deletes or pastes over it, or the program assigns [**SelText**](Selection#seltext), [**SelRTF**](Selection#selrtf) or [**TextRTF**](Text#textrtf) over it, the control raises [**ModifyProtected**](#modifyprotected) and refuses the change, unless the handler allows it. An assignment to [**Text**](Text#text) replaces the whole text, protected or not, and raises no event.
<!-- /test -->

<!-- test: RichTextBoxLinksTests.LinkEvent_Click_GivesTheRangeOfTheLink, RichTextBoxLinksTests.ModifyProtected_GivesTheRangeOfTheChange -->
> [!WARNING] 1.8.136.0
> In a 64-bit program the numbers that [**LinkEvent**](#linkevent) and [**ModifyProtected**](#modifyprotected) give are wrong: *LinkStart*, *LinkEnd*, *wParam* and *lParam* of **LinkEvent**, and *SelStart* and *SelEnd* of **ModifyProtected**. A click on a link at the characters 4 to 22 gives 22 and 0. The *wMsg* of **LinkEvent** is right, and so is the *Allow* of **ModifyProtected**.

Properties
----------

### AutoURLDetect
{: .no_toc }

Whether the control finds the addresses in the text and makes them links. **Boolean**. Default: **True**. See [Links](#links).

### SelLink
{: .no_toc }

Whether the selected characters are a link. A **Variant**: **True**, **False** or **Null**, as the properties of the [format of characters](CharacterFormatting#the-format-of-the-selection) are. An assignment of **Null** makes them no link.

### SelProtected
{: .no_toc }

Whether the selected characters are protected against changes. A **Variant**: **True**, **False** or **Null**, as the properties of the [format of characters](CharacterFormatting#the-format-of-the-selection) are. An assignment of **Null** protects them, as **True** does.

Events
------

### LinkEvent
{: .no_toc }

Raised when the user presses or releases a mouse button over a link. See [Links](#links).

Syntax: *object*\_**LinkEvent**( **ByVal** *wMsg* **As Long**, **ByVal** *wParam* **As LongPtr**, **ByVal** *lParam* **As LongPtr**, **ByVal** *LinkStart* **As Long**, **ByVal** *LinkEnd* **As Long** )

*wMsg*
: The window message of the mouse, such as **WM_LBUTTONUP** (&H202).

*wParam*, *lParam*
: The two parameters of that message: the keys and buttons held down, and the place of the pointer in pixels from the top left corner of the box.

*LinkStart*
: The place of the first character of the link, counted from 0.

*LinkEnd*
: The place after the last character of the link.

### ModifyProtected
{: .no_toc }

Raised when the user or the program tries to change [protected text](#protected-text).

Syntax: *object*\_**ModifyProtected**( *Allow* **As Boolean**, **ByVal** *SelStart* **As Long**, **ByVal** *SelEnd* **As Long** )

*Allow*
: **False** when the event is raised. A handler that sets it to **True** lets the change happen.

*SelStart*
: The place of the first character that the change would touch, counted from 0.

*SelEnd*
: The place after the last character that the change would touch.

## See Also

- [RichTextBox](.) control
- [Character Formatting](CharacterFormatting) -- the other parts of the format of characters
