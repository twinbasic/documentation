---
title: TextBoxW
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/TextBoxW
has_toc: false
symbols:
  - TextBoxW
  - TxtCharacterCasingConstants
  - TxtIconConstants
  - TxtNetAddressFormatConstants
  - TxtNetAddressTypeConstants
---

# TextBoxW class
{: .no_toc }

A **TextBoxW** is a box in which the user types and edits text, on one line or on several. It can also show a prompt while it is empty, limit what is typed, check a network address, and take text and files that are dragged onto it.

```tb check_build check_run arch=win32,win64
TextBoxW1.Text = "Hello world"
TextBoxW1.SelStart = 6
TextBoxW1.SelLength = 5
TextBoxW1.SelText = "there"            ' replaces the selected "world"
Debug.Print TextBoxW1.Text
Debug.Print TextBoxW1.TextLength
' Output:
' Hello there
'  11
```

The control stands in place of the [**TextBox**](../../VB/TextBox/) of the VB package, the text box of VB6. It holds its text in Unicode, and adds the clipboard and undo methods, the methods that work on the lines of the text, [**CharacterCasing**](#charactercasing), [**AllowOverType**](#allowovertype), [**UseSystemPasswordChar**](#usesystempasswordchar), [**ShowBalloonTip**](#showballoontip), the margins, the [**DropFiles**](#dropfiles), [**MaxText**](#maxtext) and [**ContextMenu**](#contextmenu) events, and the check of a [network address](#checking-a-network-address).

Of the [common members](Common), the control has those under [Name and place](Common#name-and-place), [Window handles](Common#window-handles), [Font and visual styles](Common#font-and-visual-styles), [Mouse](Common#mouse), [Keyboard and focus](Common#keyboard-and-focus), [Dragging the control](Common#dragging-the-control), [OLE drag and drop](Common#ole-drag-and-drop) and [Right-to-left](Common#right-to-left) but **RightToLeftLayout**. Its [**OLEDropMode**](#oledropmode) takes another type than the common one, and is on this page.

* TOC
{:toc}

## Text and what the user may type

[**Text**](#text) is the whole text of the box. The control raises [**Change**](#change) each time the text changes, whether the user or the program changed it.

<!-- test: TextBoxWTests.Text_LongerThanMaxLength_IsCutToIt, TextBoxWTests.Typing_PastMaxLength_RaisesMaxText -->
[**MaxLength**](#maxlength) limits the number of characters. A text that the program assigns is cut to that length. A character that the user types into a full box is refused, and the control raises [**MaxText**](#maxtext).
<!-- /test -->

<!-- test: TextBoxWTests.Typing_Locked_ChangesNothing, TextBoxWTests.Typing_AllowOnlyNumbers_RefusesALetter, TextBoxWTests.Text_AllowOnlyNumbers_TakesLetters -->
Three properties limit the user and leave the program free. With [**Locked**](#locked) the user can select and copy the text and cannot change it. With [**AllowOnlyNumbers**](#allowonlynumbers) the user can type digits only. In both cases an assignment to **Text** still sets any text.
<!-- /test -->

<!-- test: TextBoxWTests.CharacterCasing_Upper_ConvertsWhatIsAssignedAndTyped, TextBoxWTests.CharacterCasing_Upper_LeavesTheTextAlreadyThere -->
[**CharacterCasing**](#charactercasing) converts the text to capital or to small letters as it goes into the box, typed or assigned. The text that is in the box when the property is set stays as it is.
<!-- /test -->

```tb check_build check_run arch=win32,win64
TextBoxW1.Text = "abc"
TextBoxW1.CharacterCasing = TxtCharacterCasingUpper
Debug.Print TextBoxW1.Text              ' the text already there is not converted
TextBoxW1.Text = "def"
Debug.Print TextBoxW1.Text
TextBoxW1.MaxLength = 2
TextBoxW1.Text = "ghijk"
Debug.Print TextBoxW1.Text
' Output:
' abc
' DEF
' GH
```

A box for a password shows one character in place of each character of the text: the one in [**PasswordChar**](#passwordchar), or the dot that Windows uses when [**UseSystemPasswordChar**](#usesystempasswordchar) is **True**. **Text** returns the real text in both cases.

<!-- test: TextBoxWTests.OverTypeMode_WithoutAllowOverType_StaysFalse, TextBoxWTests.Typing_OverTypeMode_ReplacesTheNextCharacter, TextBoxWTests.InsertKey_AllowOverType_TogglesOverTypeMode -->
With [**AllowOverType**](#allowovertype) set to **True** the Insert key switches [**OverTypeMode**](#overtypemode) on and off. While it is on, a character that the user types replaces the character after the insertion point; at the end of a line it is added as usual.
<!-- /test -->

## The selection, the clipboard and undo

[**SelStart**](#selstart) and [**SelLength**](#sellength) are the place and the length of the selection, counted in characters from 0, and [**SelText**](#seltext) is the selected text. With a **SelLength** of 0, **SelStart** is the insertion point. Assigning **SelText** replaces the selection, or inserts at the insertion point, and leaves the insertion point after the new text.

[**Copy**](#copy), [**Cut**](#cut), [**Paste**](#paste) and [**Clear**](#clear) do to the selection what the commands of the same names do in the menu of the box. [**Undo**](#undo) takes back the last change made in the box, and [**CanUndo**](#canundo) says whether there is one to take back.

```tb check_build
If TextBoxW1.SelLength > 0 Then TextBoxW1.Cut
TextBoxW1.SelStart = TextBoxW1.TextLength     ' the insertion point, to the end
TextBoxW1.Paste
If TextBoxW1.CanUndo Then TextBoxW1.Undo
```

[**Modified**](#modified) says whether the text has been changed in the box since the program last assigned **Text**.

## Several lines

With [**MultiLine**](#multiline) set to **True** the box holds several lines, separated by a carriage return and a line feed (**vbCrLf**). [**ScrollBars**](#scrollbars) gives it scroll bars. A box with no horizontal scroll bar wraps a line that is too long, without changing the text.

<!-- test: TextBoxWTests.GetLine_ReturnsTheLineOfThatNumber, TextBoxWTests.GetLine_Zero_IsTheLineOfTheInsertionPoint, TextBoxWTests.GetLineFromChar_ReturnsTheLineNumber -->
The methods that work on lines count them from 1. [**GetLineCount**](#getlinecount) returns the number of lines, [**GetLine**](#getline) the text of one, and [**GetLineFromChar**](#getlinefromchar) the line that a character is on. [**ScrollToLine**](#scrolltoline) brings a line to the top of the box. A line here is a line as the box shows it, so a long line that the box has wrapped counts as several.

```tb check_build check_run arch=win32,win64
TextBoxW1.MultiLine = True
TextBoxW1.Text = "one" & vbCrLf & "two" & vbCrLf & "three"
Debug.Print TextBoxW1.GetLineCount
Debug.Print TextBoxW1.GetLine(2)
TextBoxW1.SelStart = 12                  ' in "three"
Debug.Print TextBoxW1.GetLine(0)         ' the line of the insertion point
Debug.Print TextBoxW1.GetLineFromChar(5)
' Output:
'  3
' two
' three
'  2
```
<!-- /test -->

<!-- test: TextBoxWTests.MultiLine_Changed_MakesANewWindowAndKeepsTheText -->
A program can change **MultiLine**, **ScrollBars**, [**HideSelection**](#hideselection), [**UseSystemPasswordChar**](#usesystempasswordchar) and [**NetAddressValidator**](#netaddressvalidator) while it runs. For each of them the control makes its window again, with the same text and the same selection, so [**hWnd**](Common#hwnd) returns another handle afterwards.
<!-- /test -->

On a form that has a default button, the Enter key presses that button. A multi-line box with [**WantReturn**](#wantreturn) set to **True** takes the key itself and starts a new line.

## A prompt and a balloon tip

[**CueBanner**](#cuebanner) is a text that a box of one line shows in grey while it is empty, to say what belongs in it. It is not part of **Text**. [**ShowBalloonTip**](#showballoontip) shows a balloon that points at the insertion point, for a message about what the user typed. Both need a program with visual styles.

```tb check_build
TextBoxW1.CueBanner = "Search"
TextBoxW1.CueBannerAlways = True              ' also while the box has the focus
If Not IsNumeric(TextBoxW1.Text) Then
    TextBoxW1.ShowBalloonTip "Type a number.", "Not a number", TxtIconWarning
End If
```

## Dragging text and dropping files

With [**OLEDragMode**](#oledragmode) set to **vbOLEDragAutomatic** the user can drag the selected text out of the box. With [**OLEDropMode**](#oledropmode) set to **vbOLEDropAutomatic** the box takes text that is dropped on it and inserts it at the place of the drop. The control still raises the [OLE drag-and-drop events](Common#ole-drag-and-drop), so a handler can look at the data and refuse it. While text is dragged over a box with scroll bars, the box scrolls when the pointer comes near an edge, unless [**OLEDragDropScroll**](#oledragdropscroll) is **False**.

Files that the user drags from Explorer are another matter. With [**AllowDropFiles**](#allowdropfiles) set to **True** and **OLEDropMode** left at **vbOLEDropNone**, a drop of files raises [**DropFiles**](#dropfiles) with their paths.

```tb check_build
Private Sub TextBoxW1_DropFiles(FileList As Variant, ByVal X As Single, ByVal Y As Single)
    Dim i As Long
    For i = LBound(FileList) To UBound(FileList)
        TextBoxW1.SelText = FileList(i) & vbCrLf
    Next
End Sub
```

## Checking a network address

With [**NetAddressValidator**](#netaddressvalidator) set to **True** the box is the network address control of Windows, which can tell whether its text is an IPv4 address, an IPv6 address or a DNS name. It needs a program with visual styles. [**NetAddressType**](#netaddresstype) says which kinds of address the box accepts.

<!-- test: TextBoxWTests.ValidateNetAddress_DnsName_GivesTheName, TextBoxWTests.ValidateNetAddress_NotAnAddress_Raises5, TextBoxWTests.ValidateNetAddress_Empty_Raises380, TextBoxWTests.ValidateNetAddress_ValidatorOff_Raises5 -->
[**ValidateNetAddress**](#validatenetaddress) checks the text. When the text is an address of an accepted kind, the method returns and [**NetAddressFormat**](#netaddressformat), [**NetAddressString**](#netaddressstring), [**NetAddressPortNumber**](#netaddressportnumber) and [**NetAddressPrefixLength**](#netaddressprefixlength) hold what it found. When it is not, the method raises run-time error 5, and [**ShowNetAddressErrorTip**](#shownetaddresserrortip) shows the user a balloon that says what is wrong. An empty box raises run-time error 380.

```tb check_build check_run arch=win32,win64
TextBoxW1.NetAddressValidator = True
TextBoxW1.NetAddressType = TxtNetAddressTypeAnyAddress
TextBoxW1.Text = "example.com"
TextBoxW1.ValidateNetAddress
Debug.Print TextBoxW1.NetAddressFormat = TxtNetAddressFormatDNSName
Debug.Print TextBoxW1.NetAddressString
TextBoxW1.Text = "not an address"
On Error Resume Next
TextBoxW1.ValidateNetAddress
Debug.Print Err.Number
' Output:
' True
' example.com
'  5
```
<!-- /test -->

<!-- test: TextBoxWTests.ValidateNetAddress_IPv4_GivesTheAddress -->
> [!WARNING] 1.8.136.0
> **NetAddressString** is wrong for an IPv4 address: after `192.168.0.1` it holds `0.0.1.0`. **NetAddressFormat**, **NetAddressPortNumber** and **NetAddressPrefixLength** are right, and so is **NetAddressString** for an IPv6 address and for a DNS name. A program that needs the IPv4 address reads **Text**.

Properties
----------

### Alignment
{: .no_toc }

Where the text stands in the box. A member of [**AlignmentConstants**](../../VBRUN/Constants/AlignmentConstants): **vbLeftJustify** (the default), **vbRightJustify** or **vbCenter**. Another value raises run-time error 380. When [**RightToLeft**](Common#righttoleft) takes effect, a left alignment becomes a right one, and the other way round when it stops.

### AllowDropFiles
{: .no_toc }

Whether the box takes files that are dragged from Explorer, and raises [**DropFiles**](#dropfiles) for them. **Boolean**. Default: **False**. It has an effect while [**OLEDropMode**](#oledropmode) is **vbOLEDropNone**.

### AllowOnlyNumbers
{: .no_toc }

Whether the user can type digits only. **Boolean**. Default: **False**. A text that the program assigns is not checked.

### AllowOverType
{: .no_toc }

Whether the Insert key switches [**OverTypeMode**](#overtypemode) on and off. **Boolean**. Default: **False**. Setting it to **False** also sets **OverTypeMode** to **False**.

### BackColor
{: .no_toc }

The color behind the text. **OLE_COLOR**. Default: **vbWindowBackground**.

### BorderStyle
{: .no_toc }

The border of the box. A member of [**CCBorderStyleConstants**](Common#ccborderstyleconstants). Default: **CCBorderStyleSunken**. Another value raises run-time error 380.

### CharacterCasing
{: .no_toc }

Whether the box converts text to capital or to small letters. A member of [**TxtCharacterCasingConstants**](#txtcharactercasingconstants). Default: **TxtCharacterCasingNormal**. Another value raises run-time error 380. See [Text and what the user may type](#text-and-what-the-user-may-type).

### CueBanner
{: .no_toc }

The prompt that the box shows while it is empty. **String**. Default: empty. It shows in a box of one line, in a program with visual styles.

### CueBannerAlways
{: .no_toc }

Whether the prompt of [**CueBanner**](#cuebanner) stays while the empty box has the focus. **Boolean**. Default: **False**, with which the prompt goes when the box gets the focus.

### ForeColor
{: .no_toc }

The color of the text. **OLE_COLOR**. A control newly drawn on a form has black.

### HideSelection
{: .no_toc }

Whether the selection stops being shown when the box loses the focus. **Boolean**. Default: **True**.

### IMEMode
{: .no_toc }

The state of the Input Method Editor while the box has the focus. A member of [**CCIMEModeConstants**](Common#ccimemodeconstants). Default: **CCIMEModeNoControl**. Another value raises run-time error 380.

### LeftMargin, RightMargin
{: .no_toc }

The widths of the empty strips at the left and at the right of the text, in the scale units of the control's container. **Single**. Assigning -1 gives the margin the width that Windows works out from the font.

<!-- test: TextBoxWTests.LeftMargin_Negative_Raises380 -->
Any other negative value raises run-time error 380.
<!-- /test -->

### Locked
{: .no_toc }

Whether the user is kept from changing the text. **Boolean**. Default: **False**. The user can still select and copy the text, and the program can still change it.

### MaxLength
{: .no_toc }

The greatest number of characters the box holds. **Long**. Default: 0, which sets no limit of the control's own.

<!-- test: TextBoxWTests.MaxLength_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### Modified
{: .no_toc }

<!-- test: TextBoxWTests.Modified_TrueAfterTyping_FalseAfterText -->
Whether the text has been changed in the box since the program last assigned [**Text**](#text). **Boolean**. Typing and an assignment to [**SelText**](#seltext) set it to **True**, and an assignment to **Text** sets it to **False**. The program can set it as well.
<!-- /test -->

### MultiLine
{: .no_toc }

Whether the box holds several lines. **Boolean**. Default: **False**. See [Several lines](#several-lines).

### NetAddressFormat
{: .no_toc }

The kind of address that the last [**ValidateNetAddress**](#validatenetaddress) found. A member of [**TxtNetAddressFormatConstants**](#txtnetaddressformatconstants), read-only. It is **TxtNetAddressFormatNone** before the first check and after one that failed.

### NetAddressPortNumber
{: .no_toc }

The port number in the text that the last [**ValidateNetAddress**](#validatenetaddress) checked, such as 8080 in `192.168.0.1:8080`. **Integer**, read-only. A port number above 32767 is returned as a negative number.

### NetAddressPrefixLength
{: .no_toc }

The length of the network prefix in the text that the last [**ValidateNetAddress**](#validatenetaddress) checked, such as 8 in `10.0.0.0/8`. **Byte**, read-only. It is 255 when the text has no prefix.

### NetAddressString
{: .no_toc }

The address that the last [**ValidateNetAddress**](#validatenetaddress) found, without the port number and the prefix: a DNS name as it was typed, an IPv6 address written out in its eight groups. **String**, read-only. The [warning](#checking-a-network-address) above says what it holds for an IPv4 address.

### NetAddressType
{: .no_toc }

The kinds of address that [**ValidateNetAddress**](#validatenetaddress) accepts. A member of [**TxtNetAddressTypeConstants**](#txtnetaddresstypeconstants). Default: **TxtNetAddressTypeNone**. Another value raises run-time error 380.

### NetAddressValidator
{: .no_toc }

Whether the box is the network address control of Windows. **Boolean**. Default: **False**. See [Checking a network address](#checking-a-network-address).

### OLEDragDropScroll
{: .no_toc }

Whether a box with scroll bars scrolls while data is dragged over it near an edge. **Boolean**. Default: **True**.

### OLEDragMode
{: .no_toc }

Whether the user can drag the selected text out of the box. A member of [**OLEDragConstants**](../../VBRUN/Constants/OLEDragConstants): **vbOLEDragManual** (the default), with which only [**OLEDrag**](Common#oledrag) starts a drag, or **vbOLEDragAutomatic**. Another value raises run-time error 380. Text that the user drags to another place and drops as a move is removed from the box.

### OLEDropMode
{: .no_toc }

<!-- test: TextBoxWTests.OLEDropMode_Automatic_IsAccepted, TextBoxWTests.OLEDropMode_OutOfRange_Raises380 -->
Whether the box takes data that is dropped on it. A member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants), not of the [**OLEDropModeConstants**](Common#oledropmodeconstants) that the other controls take: **vbOLEDropNone** (the default), **vbOLEDropManual** or **vbOLEDropAutomatic**. Another value raises run-time error 380.
<!-- /test -->

With **vbOLEDropAutomatic** the box takes text: it shows an insertion point under the pointer while text is dragged over it, and inserts the text there when it is dropped. The control raises [**OLEDragOver**](Common#oledragover) and [**OLEDragDrop**](Common#oledragdrop) as with **vbOLEDropManual**, with *Effect* already set to **vbDropEffectMove** for text and to **vbDropEffectNone** for anything else. A handler that sets *Effect* to **vbDropEffectNone** in **OLEDragDrop** keeps the text out of the box.

### OverTypeMode
{: .no_toc }

Whether a character that the user types replaces the character after the insertion point. **Boolean**. Default: **False**. It can be **True** only while [**AllowOverType**](#allowovertype) is **True**: otherwise an assignment of **True** leaves it **False**.

### PasswordChar
{: .no_toc }

The character that the box shows in place of each character of its text. **String**. An empty string, the default, shows the text itself.

<!-- test: TextBoxWTests.PasswordChar_TwoCharacters_Raises380 -->
A string of more than one character raises run-time error 380. An assignment does nothing while [**UseSystemPasswordChar**](#usesystempasswordchar) is **True**.
<!-- /test -->

<!-- test: TextBoxWTests.PasswordChar_NoneSet_IsAnEmptyString -->
> [!NOTE] 1.8.136.0
> While the box has no password character, **PasswordChar** returns a string of one character with the code 0, not the empty string that the VB6 text box returns. A program tests `AscW(TextBoxW1.PasswordChar) = 0`.

### ScrollBars
{: .no_toc }

The scroll bars of a multi-line box. A member of [**ScrollBarConstants**](../../VBRUN/Constants/ScrollBarConstants): **vbSBNone** (the default), **vbHorizontal**, **vbVertical** or **vbBoth**. Another value raises run-time error 380. A box of one line has none.

### SelLength
{: .no_toc }

The number of characters selected. **Long**. An assignment selects that many characters from [**SelStart**](#selstart) on, or as many as there are.

<!-- test: TextBoxWTests.SelLength_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### SelStart
{: .no_toc }

The place of the first selected character, counted from 0, or of the insertion point when nothing is selected. **Long**. An assignment puts the insertion point there, selects nothing, and scrolls the place into view.

<!-- test: TextBoxWTests.SelStart_PastTheEnd_IsTheEnd, TextBoxWTests.SelStart_Negative_Raises380 -->
A value greater than the length of the text puts the insertion point at the end. A negative value raises run-time error 380.
<!-- /test -->

### SelText
{: .no_toc }

<!-- test: TextBoxWTests.SelText_Assigned_ReplacesTheSelection -->
The selected text. **String**. An assignment replaces the selection with the new text, or inserts the text at the insertion point, and raises [**Change**](#change). The user can take the replacement back with [**Undo**](#undo).
<!-- /test -->

### Text
{: .no_toc }

The text of the box. **String**. A control newly drawn on a form has its own name. It is the control's default property.

<!-- test: TextBoxWTests.Text_Assigned_RaisesChangeOnlyWhenItDiffers, TextBoxWTests.Text_Assigned_EmptiesUndoAndMovesTheInsertionPointToTheStart -->
An assignment raises [**Change**](#change) when the new text differs from the old one. It sets [**Modified**](#modified) to **False**, empties what [**Undo**](#undo) can take back, and puts the insertion point at the start.
<!-- /test -->

### TextLength
{: .no_toc }

The number of characters in [**Text**](#text). **Long**, read-only.

### UseSystemPasswordChar
{: .no_toc }

Whether the box shows the password dot of Windows in place of each character of its text. **Boolean**. Default: **False**. While it is **True** the control ignores [**PasswordChar**](#passwordchar).

### WantReturn
{: .no_toc }

Whether the Enter key starts a new line in a multi-line box on a form that has a default button. **Boolean**. Default: **False**, with which the key presses the default button.

Methods
-------

### CanUndo
{: .no_toc }

Returns whether [**Undo**](#undo) has a change to take back.

Syntax: *object*.**CanUndo** **As Boolean**

### CharFromPos
{: .no_toc }

Returns the place in the text, counted from 0, of the character nearest to a point.

Syntax: *object*.**CharFromPos**( *X*, *Y* ) **As Long**

*X*, *Y*
: *required* The point, measured from the top left corner of the box in the scale units of the control's container. **Single**.

The result is right for a text of up to 65,535 characters.

### Clear
{: .no_toc }

Deletes the selected text.

Syntax: *object*.**Clear**

### Copy
{: .no_toc }

Copies the selected text to the clipboard.

Syntax: *object*.**Copy**

### Cut
{: .no_toc }

Copies the selected text to the clipboard and deletes it from the box.

Syntax: *object*.**Cut**

### GetLine
{: .no_toc }

Returns the text of one line, without the characters that end it.

Syntax: *object*.**GetLine**( *LineNumber* ) **As String**

*LineNumber*
: *required* A **Long**: the number of the line, counted from 1, or 0 for the line of the insertion point.

<!-- test: TextBoxWTests.GetLine_Negative_Raises380, TextBoxWTests.GetLine_PastTheLastLine_Raises380, TextBoxWTests.ScrollToLine_PastTheLastLine_Raises380 -->
A negative number, or a number greater than the number of lines, raises run-time error 380.

> [!NOTE] 1.8.136.0
> In a 64-bit program a number greater than the number of lines raises run-time error 6, *Overflow*, in **GetLine**, and [**ScrollToLine**](#scrolltoline) raises nothing and does not scroll.
<!-- /test -->

### GetLineCount
{: .no_toc }

Returns the number of lines in the box. A box that is empty has one line.

Syntax: *object*.**GetLineCount** **As Long**

### GetLineFromChar
{: .no_toc }

Returns the number of the line, counted from 1, that a character is on.

Syntax: *object*.**GetLineFromChar**( *CharIndex* ) **As Long**

*CharIndex*
: *required* A **Long**: the place of the character in the text, counted from 0, or -1 for the line of the insertion point. A place after the end of the text gives the last line.

<!-- test: TextBoxWTests.GetLineFromChar_BelowMinusOne_Raises380 -->
A value less than -1 raises run-time error 380.
<!-- /test -->

### HideBalloonTip
{: .no_toc }

Takes away the balloon of [**ShowBalloonTip**](#showballoontip).

Syntax: *object*.**HideBalloonTip** **As Boolean**

### Paste
{: .no_toc }

Puts the text of the clipboard in place of the selection, or at the insertion point.

Syntax: *object*.**Paste**

### ResetUndoQueue
{: .no_toc }

<!-- test: TextBoxWTests.Undo_TakesBackWhatWasTyped, TextBoxWTests.ResetUndoQueue_LeavesNothingToUndo -->
Forgets the change that [**Undo**](#undo) would take back, so that [**CanUndo**](#canundo) returns **False**.
<!-- /test -->

Syntax: *object*.**ResetUndoQueue**

### ScrollToCaret
{: .no_toc }

Scrolls the box so that the insertion point shows.

Syntax: *object*.**ScrollToCaret**

### ScrollToLine
{: .no_toc }

Scrolls a multi-line box so that a line is the first one that shows, where the text is long enough for that.

Syntax: *object*.**ScrollToLine** *LineNumber*

*LineNumber*
: *required* A **Long**: the number of the line, counted from 1.

A negative number, or a number greater than the number of lines, raises run-time error 380. The note under [**GetLine**](#getline) says what a 64-bit program does.

### ShowBalloonTip
{: .no_toc }

Shows a balloon with a message that points at the insertion point, and gives the box the focus. It returns **True** when the balloon is shown. It needs a program with visual styles.

Syntax: *object*.**ShowBalloonTip**( *Text* [, *Title* ] [, *Icon* ] ) **As Boolean**

*Text*
: *required* A **String**: the message.

*Title*
: *optional* A **String**: a title above the message, in bold.

*Icon*
: *optional* A member of [**TxtIconConstants**](#txticonconstants): the icon beside the title. The default is **TxtIconNone**.

<!-- test: TextBoxWTests.ShowBalloonTip_IconOutOfRange_Raises380 -->
An *Icon* that is not a member raises run-time error 380.
<!-- /test -->

### ShowNetAddressErrorTip
{: .no_toc }

Shows a balloon that tells the user why the text is not an address of an accepted kind, and gives the box the focus. It does nothing while [**NetAddressValidator**](#netaddressvalidator) is **False**.

Syntax: *object*.**ShowNetAddressErrorTip**

### Undo
{: .no_toc }

Takes back the last change made in the box: what the user typed, deleted or pasted, or an assignment to [**SelText**](#seltext). A second call puts the change back.

Syntax: *object*.**Undo**

### ValidateNetAddress
{: .no_toc }

Checks whether the text is a network address of a kind that [**NetAddressType**](#netaddresstype) accepts, and fills the four properties that describe it. See [Checking a network address](#checking-a-network-address).

Syntax: *object*.**ValidateNetAddress**

The method raises run-time error 5 when the text is not such an address, and when [**NetAddressValidator**](#netaddressvalidator) is **False**. It raises run-time error 380 when the box is empty.

Events
------

### Change
{: .no_toc }

Raised when the text has changed: the user typed, deleted, pasted or took a change back, or the program assigned another [**Text**](#text) or a [**SelText**](#seltext).

Syntax: *object*\_**Change**( )

### ContextMenu
{: .no_toc }

Raised when the user asks for the menu of the box, with the right mouse button or with Shift+F10, before the box shows the menu that Windows gives every text box.

Syntax: *object*\_**ContextMenu**( *Handled* **As Boolean**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*Handled*
: **False** when the event is raised. A handler that sets it to **True** keeps the box from showing its own menu, to show another one or none.

*X*, *Y*
: The place of the click, measured from the top left corner of the box in the scale units of the control's container. Both are -1 when the user asked with the keyboard.

```tb check_build
Private Sub TextBoxW1_ContextMenu(Handled As Boolean, ByVal X As Single, ByVal Y As Single)
    Handled = TextBoxW1.Locked            ' no menu on a box the user cannot change
End Sub
```

### DropFiles
{: .no_toc }

Raised when the user drops files on the box, while [**AllowDropFiles**](#allowdropfiles) is **True**.

Syntax: *object*\_**DropFiles**( *FileList* **As Variant**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*FileList*
: An array of **String**, counted from 0: the full path of each file.

*X*, *Y*
: The place of the drop, measured from the top left corner of the box in the scale units of the control's container.

### MaxText
{: .no_toc }

Raised when the user types or pastes more characters than [**MaxLength**](#maxlength) allows. The box keeps what fits and refuses the rest.

Syntax: *object*\_**MaxText**( )

### Scroll
{: .no_toc }

<!-- test: TextBoxWTests.Scroll_RaisedWhenTheTextScrolls -->
Raised when the text of a multi-line box scrolls: the user moved a scroll bar or moved the insertion point out of view, or the program called [**ScrollToLine**](#scrolltoline).
<!-- /test -->

Syntax: *object*\_**Scroll**( )

## TxtCharacterCasingConstants
{: #txtcharactercasingconstants }

The values of [**CharacterCasing**](#charactercasing).

| Member | Value | Description |
|---|---|---|
| **TxtCharacterCasingNormal**{: #TxtCharacterCasingConstants_TxtCharacterCasingNormal } | 0 | The text is kept as it is typed or assigned. |
| **TxtCharacterCasingUpper**{: #TxtCharacterCasingConstants_TxtCharacterCasingUpper } | 1 | Letters become capital letters. |
| **TxtCharacterCasingLower**{: #TxtCharacterCasingConstants_TxtCharacterCasingLower } | 2 | Letters become small letters. |

## TxtIconConstants
{: #txticonconstants }

The icons of [**ShowBalloonTip**](#showballoontip).

| Member | Value | Description |
|---|---|---|
| **TxtIconNone**{: #TxtIconConstants_TxtIconNone } | 0 | No icon. |
| **TxtIconInfo**{: #TxtIconConstants_TxtIconInfo } | 1 | The information icon. |
| **TxtIconWarning**{: #TxtIconConstants_TxtIconWarning } | 2 | The warning icon. |
| **TxtIconError**{: #TxtIconConstants_TxtIconError } | 3 | The error icon. |

## TxtNetAddressFormatConstants
{: #txtnetaddressformatconstants }

The values of [**NetAddressFormat**](#netaddressformat).

| Member | Value | Description |
|---|---|---|
| **TxtNetAddressFormatNone**{: #TxtNetAddressFormatConstants_TxtNetAddressFormatNone } | 0 | No address was found. |
| **TxtNetAddressFormatDNSName**{: #TxtNetAddressFormatConstants_TxtNetAddressFormatDNSName } | 1 | A DNS name. |
| **TxtNetAddressFormatIPv4**{: #TxtNetAddressFormatConstants_TxtNetAddressFormatIPv4 } | 2 | An IPv4 address. |
| **TxtNetAddressFormatIPv6**{: #TxtNetAddressFormatConstants_TxtNetAddressFormatIPv6 } | 3 | An IPv6 address. |

## TxtNetAddressTypeConstants
{: #txtnetaddresstypeconstants }

The values of [**NetAddressType**](#netaddresstype). An *address* is a host alone, a *service* is a host with a port number, and a *network* is an address with a prefix length, such as `10.0.0.0/8`. A member with **NoScope** in its name refuses an IPv6 address that has a scope, the part after a `%`.

| Member | Value | Accepts |
|---|---|---|
| **TxtNetAddressTypeNone**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeNone } | 0 | Nothing. |
| **TxtNetAddressTypeIPv4Address**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv4Address } | 1 | An IPv4 address. |
| **TxtNetAddressTypeIPv4Service**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv4Service } | 2 | An IPv4 address with a port number. |
| **TxtNetAddressTypeIPv4Network**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv4Network } | 3 | An IPv4 network. |
| **TxtNetAddressTypeIPv6Address**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv6Address } | 4 | An IPv6 address. |
| **TxtNetAddressTypeIPv6AddressNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv6AddressNoScope } | 5 | An IPv6 address without a scope. |
| **TxtNetAddressTypeIPv6Service**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv6Service } | 6 | An IPv6 address with a port number. |
| **TxtNetAddressTypeIPv6ServiceNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv6ServiceNoScope } | 7 | An IPv6 address without a scope, with a port number. |
| **TxtNetAddressTypeIPv6Network**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPv6Network } | 8 | An IPv6 network. |
| **TxtNetAddressTypeDNSName**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeDNSName } | 9 | A DNS name. |
| **TxtNetAddressTypeDNSService**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeDNSService } | 10 | A DNS name with a port number. |
| **TxtNetAddressTypeIPAddress**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPAddress } | 11 | An IPv4 or an IPv6 address. |
| **TxtNetAddressTypeIPAddressNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPAddressNoScope } | 12 | An IPv4 address, or an IPv6 address without a scope. |
| **TxtNetAddressTypeIPService**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPService } | 13 | An IPv4 or an IPv6 address with a port number. |
| **TxtNetAddressTypeIPServiceNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPServiceNoScope } | 14 | As **TxtNetAddressTypeIPService**, the IPv6 address without a scope. |
| **TxtNetAddressTypeIPNetwork**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeIPNetwork } | 15 | An IPv4 or an IPv6 network. |
| **TxtNetAddressTypeAnyAddress**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeAnyAddress } | 16 | A DNS name, an IPv4 address or an IPv6 address. |
| **TxtNetAddressTypeAnyAddressNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeAnyAddressNoScope } | 17 | As **TxtNetAddressTypeAnyAddress**, the IPv6 address without a scope. |
| **TxtNetAddressTypeAnyService**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeAnyService } | 18 | A DNS name, an IPv4 address or an IPv6 address, each with a port number. |
| **TxtNetAddressTypeAnyServiceNoScope**{: #TxtNetAddressTypeConstants_TxtNetAddressTypeAnyServiceNoScope } | 19 | As **TxtNetAddressTypeAnyService**, the IPv6 address without a scope. |

## See Also

- [Common members](Common) -- the members this control shares with the package's other controls
- [TextBox](../../VB/TextBox/) -- the text box of the VB package
- [OLEDropConstants](../../VBRUN/Constants/OLEDropConstants) -- the values of **OLEDropMode**
