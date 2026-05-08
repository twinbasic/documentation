---
title: InputBox
parent: Interaction Module
permalink: /tB/Modules/Interaction/InputBox
redirect_from:
-  /tB/Core/InputBox
---
# InputBox
{: .no_toc }

Displays a prompt in a dialog, waits for the user to type text or click a button, and returns a **String** containing the contents of the text box.

Syntax: **InputBox(** *prompt* [ **,** *title* ] [ **,** *default* ] [ **,** *xpos* ] [ **,** *ypos* ] [ **,** *helpfile* **,** *context* ] **)**

*prompt*
: *required* String expression displayed as the message in the dialog box. The maximum length of *prompt* is approximately 1024 characters, depending on the width of the characters used. To break *prompt* across multiple lines, separate the lines with a carriage return (`Chr(13)`), a linefeed (`Chr(10)`), or a CR-LF combination (`vbCrLf`).

*title*
: *optional* String expression displayed in the title bar of the dialog box. If omitted, the application name is used.

*default*
: *optional* String expression displayed in the text box as the initial response. If omitted, the text box is displayed empty.

*xpos*
: *optional* Numeric expression specifying, in twips, the horizontal distance of the left edge of the dialog from the left edge of the screen. If omitted, the dialog is horizontally centered.

*ypos*
: *optional* Numeric expression specifying, in twips, the vertical distance of the top edge of the dialog from the top of the screen. If omitted, the dialog is positioned approximately one-third of the way down the screen.

*helpfile*
: *optional* String expression that identifies the Help file to use to provide context-sensitive Help for the dialog box. If *helpfile* is supplied, *context* must also be supplied.

*context*
: *optional* Numeric expression giving the Help context number assigned to the relevant Help topic. If *context* is supplied, *helpfile* must also be supplied.

If the user clicks **OK** or presses ENTER, **InputBox** returns whatever is in the text box. If the user clicks **Cancel**, the function returns a zero-length string (`""`).

> [!NOTE]
> A zero-length return value alone cannot distinguish "user cancelled" from "user submitted an empty string". To tell them apart, capture the result in a **Variant** and test the underlying **BSTR** pointer with **StrPtr**: a cancelled dialog returns a null pointer, while an empty submitted string returns a pointer to an allocated zero-length **BSTR**.
>
> ```tb
> Dim Reply As Variant
> Reply = InputBox("Enter your name:")
> If StrPtr(Reply) = 0 Then
>     ' User cancelled.
> ElseIf Reply = "" Then
>     ' User submitted an empty string.
> Else
>     ' User entered: Reply.
> End If
> ```

The text box accepts at most 255 characters; the returned string is truncated to 254 characters. The text box does not accept line breaks (e.g. SHIFT+ENTER); pasted text containing a line break is truncated at the break.

When both *helpfile* and *context* are supplied, the user can press F1 to view the relevant Help topic.

### Example

This example shows several ways of calling **InputBox**. If *xpos* and *ypos* are omitted the dialog is centered on its respective axis. The variable `MyValue` ends up containing whatever the user typed when **OK** or ENTER was pressed, or a zero-length string when **Cancel** was pressed.

```tb
Dim Message As String, Title As String, Default As String, MyValue As String
Message = "Enter a value between 1 and 3"
Title = "InputBox Demo"
Default = "1"

' Display message, title, and default value.
MyValue = InputBox(Message, Title, Default)

' Use a Help file and context. The Help button is added automatically.
MyValue = InputBox(Message, Title, , , , "DEMO.HLP", 10)

' Display the dialog at screen position (100, 100).
MyValue = InputBox(Message, Title, Default, 100, 100)
```

### See Also

- [MsgBox](MsgBox) function

{% include VBA-Attribution.md %}
