---
title: Text and Typing
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/Text
has_toc: false
symbols:
  - RtfTextModeConstants
---

# Text and Typing
{: .no_toc }

Sets and reads the text of a [**RichTextBox**](.), as plain text and as RTF, and limits what the user can type into it.

```tb hidden
Public Declare PtrSafe Function RtbTextSendMessage Lib "user32" Alias "SendMessageW" (ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr
```

<!-- test: RichTextBoxTextTests.Text_Paragraphs_EndWithACarriageReturn, RichTextBoxTextTests.UseCrLf_True_GivesCrLf -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "one" & vbCrLf & "two"
Debug.Print RichTextBox1.TextLength; InStr(RichTextBox1.Text, vbCr); InStr(RichTextBox1.Text, vbLf)
RichTextBox1.UseCrLf = True
Debug.Print RichTextBox1.TextLength; InStr(RichTextBox1.Text, vbCrLf)
' Output:
'  7  4  0
'  8  4
```
<!-- /test -->

* TOC
{:toc}

## Paragraphs

The control ends each paragraph with one carriage return, **vbCr**. A **vbCrLf** in a text that the program assigns becomes one **vbCr**, so [**Text**](#text) and [**TextLength**](#textlength) count one character for each line break. With [**UseCrLf**](#usecrlf) set to **True**, **Text** and **TextLength** give each line break as **vbCrLf**, as a [**TextBoxW**](../TextBoxW) does. The selection and the places of characters are counted in the control's own characters, with one for each line break, whatever **UseCrLf** says.

## Plain text and RTF

[**TextRTF**](#textrtf) is the whole text with its formatting, in the Rich Text Format, and an assignment to it replaces the text and its formatting with the document assigned. [**Text**](#text) is the same text without its formatting.

<!-- test: RichTextBoxTextTests.TextMode_Changed_EmptiesTheText, RichTextBoxTextTests.TextMode_PlainText_KeepsNoFormatOfAPart, RichTextBoxTextTests.TextRTF_PlainText_LeavesTheBoxEmpty -->
With [**TextMode**](#textmode) set to **RtfTextModePlainText** the control holds plain text, in one format for the whole of it. A format given to a part of the text, such as [**SelBold**](CharacterFormatting#selbold), does not change it, and an assignment to **TextRTF** leaves the control empty; **TextRTF** still returns the text as a document. A change of **TextMode** empties the control.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.TextMode = RtfTextModePlainText
RichTextBox1.Text = "ab cd"
RichTextBox1.SelStart = 0
RichTextBox1.SelLength = 2
RichTextBox1.SelBold = True             ' has no effect on plain text
Debug.Print RichTextBox1.SelBold
RichTextBox1.TextMode = RtfTextModeRichText
Debug.Print "[" & RichTextBox1.Text & "]"
' Output:
' False
' []
```

## Changes and the Modified flag

<!-- test: RichTextBoxTextTests.Text_SameText_RaisesChange, RichTextBoxTextTests.Text_Assigned_ResetsModified, RichTextBoxTextTests.TextRTF_Assigned_SetsModified -->
The control raises [**Change**](#change) each time its text changes: the user typed, deleted, pasted or took a change back, or the program assigned [**Text**](#text), [**TextRTF**](#textrtf), [**SelText**](Selection#seltext) or [**SelRTF**](Selection#selrtf). An assignment to **Text** raises it even when the new text is the old one, which a **TextBoxW** does not.

[**Modified**](#modified) says whether the text has changed since the program last assigned **Text**. An assignment to **Text** sets it to **False**; typing, an assignment to **SelText** and an assignment to **TextRTF** set it to **True**.
<!-- /test -->

## What the user may type

<!-- test: RichTextBoxTextTests.MaxLength_Assigned_DoesNotCutTheText, RichTextBoxTextTests.Typing_PastMaxLength_RaisesMaxText, RichTextBoxTextTests.MaxLength_Zero_LimitsTypingTo65536 -->
[**MaxLength**](#maxlength) limits what the user types and pastes: a character typed into a full box is refused, and the control raises [**MaxText**](#maxtext). It does not limit what the program assigns to **Text**, **TextRTF** or **SelText**, unlike the **MaxLength** of a **TextBoxW**. With **MaxLength** 0, the default, the user can type up to 65,536 characters, the limit that Windows gives a rich edit control.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.MaxLength = 3
RichTextBox1.Text = "ab"
RichTextBox1.SelStart = 2
RtbTextSendMessage RichTextBox1.hWnd, &H102, AscW("c"), 0   ' WM_CHAR, as a key would
RtbTextSendMessage RichTextBox1.hWnd, &H102, AscW("d"), 0   ' refused: the box is full
Debug.Print RichTextBox1.Text
' Output:
' abc
```

**RtbTextSendMessage** in this sample is the Windows function **SendMessageW**, declared by the program.

<!-- test: RichTextBoxTextTests.Typing_AfterALongerTextWasAssigned_IsLimitedToMaxLength -->
> [!WARNING] 1.8.142.0
> An assignment of a text longer than **MaxLength**, to **Text**, **TextRTF** or **SelText**, raises the limit of the box to the length of that text, and **MaxLength** keeps returning the old value. With **MaxLength** 3, after `Text = "abcdef"` and then `Text = "ab"`, the user can type four more characters. A program that assigns long texts assigns **MaxLength** again after each of them.

<!-- test: RichTextBoxTextTests.Typing_Locked_ChangesNothing, RichTextBoxTextTests.SelText_Locked_ChangesTheText -->
With [**Locked**](#locked) set to **True** the user can select and copy the text and cannot change it. The program still can, with **Text**, **TextRTF** and **SelText**.
<!-- /test -->

<!-- test: RichTextBoxTextTests.OverTypeMode_True_ReplacesTheNextCharacter, RichTextBoxTextTests.AllowOverType_False_EndsOverTypeMode -->
The Insert key switches [**OverTypeMode**](#overtypemode) on and off, as in a **TextBoxW** with [**AllowOverType**](../TextBoxW#allowovertype); here [**AllowOverType**](#allowovertype) is **True** by default. While it is on, a character that the user types replaces the character after the insertion point.
<!-- /test -->

A box for a password shows one character in place of each character of the text, the one in [**PasswordChar**](#passwordchar) or the dot of Windows with [**UseSystemPasswordChar**](#usesystempasswordchar), as a **TextBoxW** does. **Text** returns the real text.

Properties
----------

### AllowOverType
{: .no_toc }

Whether the Insert key switches [**OverTypeMode**](#overtypemode) on and off. **Boolean**. Default: **True**. Setting it to **False** also sets **OverTypeMode** to **False**.

### IMEMode
{: .no_toc }

The state of the Input Method Editor while the box has the focus. A member of [**CCIMEModeConstants**](../Common#ccimemodeconstants). Default: **CCIMEModeNoControl**. Another value raises run-time error 380.

### Locked
{: .no_toc }

Whether the user is kept from changing the text. **Boolean**. Default: **False**. The user can still select and copy the text, and the program can still change it.

### MaxLength
{: .no_toc }

The greatest number of characters that the user can type or paste into the box. **Long**. Default: 0, with which the limit is 65,536 characters. See [What the user may type](#what-the-user-may-type).

<!-- test: RichTextBoxTextTests.MaxLength_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### Modified
{: .no_toc }

Whether the text has changed since the program last assigned [**Text**](#text). **Boolean**. See [Changes and the Modified flag](#changes-and-the-modified-flag). The program can set it as well.

### MultiLine
{: .no_toc }

Whether the box holds several paragraphs and wraps a line that is too long. **Boolean**. A control newly drawn on a form has **True**. With **False** the box holds one line, which scrolls sideways, and has no scroll bars.

<!-- test: RichTextBoxTextTests.MultiLine_AtRunTime_Raises382 -->
It is set at design time: an assignment while the program runs raises run-time error 382, *MultiLine property is read-only at run time*.
<!-- /test -->

### OverTypeMode
{: .no_toc }

Whether a character that the user types replaces the character after the insertion point. **Boolean**. Default: **False**. It can be **True** only while [**AllowOverType**](#allowovertype) is **True**: otherwise an assignment of **True** leaves it **False**.

### PasswordChar
{: .no_toc }

The character that the box shows in place of each character of its text. **String**. An empty string shows the text itself.

<!-- test: RichTextBoxTextTests.PasswordChar_NoneSet_IsAnEmptyString, RichTextBoxTextTests.PasswordChar_TwoCharacters_Raises380 -->
While the box has no password character, it returns an empty string, as the [**PasswordChar**](../TextBoxW#passwordchar) of a **TextBoxW** does. A string of more than one character raises run-time error 380. An assignment does nothing while [**UseSystemPasswordChar**](#usesystempasswordchar) is **True**.
<!-- /test -->

### Text
{: .no_toc }

The text of the box, without its formatting. **String**. A control newly drawn on a form has its own name. Paragraphs end with **vbCr**, or with **vbCrLf** while [**UseCrLf**](#usecrlf) is **True**.

An assignment replaces the whole text, raises [**Change**](#change) and sets [**Modified**](#modified) to **False**. It replaces [protected text](LinksAndProtection#protected-text) as well.

### TextLength
{: .no_toc }

The number of characters in [**Text**](#text). **Long**, read-only.

### TextMode
{: .no_toc }

Whether the box holds formatted text or plain text. A member of [**RtfTextModeConstants**](#rtftextmodeconstants). Default: **RtfTextModeRichText**. A change empties the box. See [Plain text and RTF](#plain-text-and-rtf).

<!-- test: RichTextBoxTextTests.TextMode_OutOfRange_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

### TextRTF
{: .no_toc }

The whole text with its formatting, as a document in the Rich Text Format. **String**. It is the control's default member.

An assignment replaces the text and its formatting with the document, raises [**Change**](#change) and sets [**Modified**](#modified) to **True**. While the text holds [protected text](LinksAndProtection#protected-text), the assignment raises [**ModifyProtected**](LinksAndProtection#modifyprotected), and changes nothing unless the handler allows it.

### UseCrLf
{: .no_toc }

Whether [**Text**](#text) and [**TextLength**](#textlength) give each line break as **vbCrLf** rather than **vbCr**. **Boolean**. Default: **False**.

### UseSystemPasswordChar
{: .no_toc }

Whether the box shows the password dot of Windows in place of each character of its text. **Boolean**. Default: **False**. While it is **True** the control ignores [**PasswordChar**](#passwordchar). A change makes the control's window again, with the same text, so [**hWnd**](../Common#hwnd) returns another handle afterwards.

### WantReturn
{: .no_toc }

Whether the Enter key starts a new paragraph in a multi-line box on a form that has a default button. **Boolean**. Default: **True**. With **False** the key presses the default button.

Events
------

### Change
{: .no_toc }

Raised when the text has changed. See [Changes and the Modified flag](#changes-and-the-modified-flag).

Syntax: *object*\_**Change**( )

### MaxText
{: .no_toc }

Raised when the user types or pastes more characters than [**MaxLength**](#maxlength) allows. The box keeps what fits and refuses the rest.

Syntax: *object*\_**MaxText**( )

## RtfTextModeConstants
{: #rtftextmodeconstants }

The values of [**TextMode**](#textmode).

| Member | Value | Description |
|---|---|---|
| **RtfTextModeRichText**{: #RtfTextModeConstants_RtfTextModeRichText } | 0 | Formatted text: each character and each paragraph can have a format of its own. |
| **RtfTextModePlainText**{: #RtfTextModeConstants_RtfTextModePlainText } | 1 | Plain text, in one format for the whole of it. |

## See Also

- [RichTextBox](.) control
- [Selection](Selection) -- **SelText** and **SelRTF**, the text of the selection
- [TextBoxW](../TextBoxW) control -- the password characters and the Insert key, which work as they do here
