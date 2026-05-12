---
title: MsgBox
parent: Interaction Module
permalink: /tB/Modules/Interaction/MsgBox
redirect_from:
-  /tB/Core/MsgBox
vba_attribution: true
---
# MsgBox
{: .no_toc }

Displays a message in a modal dialog with a chosen set of buttons, waits for the user to click a button, and returns a [**VbMsgBoxResult**](../Constants/VbMsgBoxResult) value identifying that button.

Syntax: **MsgBox(** *prompt* [ **,** *buttons* ] [ **,** *title* ] [ **,** *helpfile* **,** *context* ] **)**

*prompt*
: *required* String expression displayed as the message in the dialog box. The maximum length of *prompt* is approximately 1024 characters, depending on the width of the characters used. To break *prompt* across multiple lines, separate the lines with a carriage return (`Chr(13)`), a linefeed (`Chr(10)`), or a CR-LF combination (`vbCrLf`).

*buttons*
: *optional* A [**VbMsgBoxStyle**](../Constants/VbMsgBoxStyle) value that specifies the number and type of buttons to display, the icon style, the identity of the default button, and the modality of the message box. If omitted, *buttons* defaults to `vbOKOnly`.

*title*
: *optional* String expression displayed in the title bar of the dialog box. If omitted, the application name is used.

*helpfile*
: *optional* String expression that identifies the Help file to use to provide context-sensitive Help for the dialog box. If *helpfile* is supplied, *context* must also be supplied.

*context*
: *optional* Numeric expression giving the Help context number assigned to the relevant Help topic. If *context* is supplied, *helpfile* must also be supplied.

The *buttons* argument is a combination of values from the [**VbMsgBoxStyle**](../Constants/VbMsgBoxStyle) enumeration: one *button group* value (`vbOKOnly`, `vbOKCancel`, `vbAbortRetryIgnore`, `vbYesNoCancel`, `vbYesNo`, `vbRetryCancel`, `vbCancelTryAgainContinue`), optionally combined with one *icon* value (`vbCritical`, `vbQuestion`, `vbExclamation`, `vbInformation`), one *default-button* value (`vbDefaultButton1` through `vbDefaultButton4`), one *modality* value (`vbApplicationModal`, `vbSystemModal`), and any of the option flags (`vbMsgBoxHelpButton`, `vbMsgBoxSetForeground`, `vbMsgBoxRight`, `vbMsgBoxRtlReading`). Combine values with **Or** or addition.

The return value is one of the constants from the [**VbMsgBoxResult**](../Constants/VbMsgBoxResult) enumeration, identifying which button the user clicked.

If the dialog box displays a **Cancel** button, pressing the ESC key has the same effect as clicking **Cancel**. When both *helpfile* and *context* are supplied, the user can press F1 to view the relevant Help topic; if the dialog also contains a **Help** button, clicking it invokes context-sensitive Help. The dialog stays open and **MsgBox** does not return until one of the non-Help buttons is clicked.

> [!NOTE]
> To pass any argument by name (other than the first), use **MsgBox** in an expression context — for example, assign its result to a variable. To skip a positional argument, include the corresponding comma delimiter.

### Example

This example displays a critical-error message in a dialog with **Yes** and **No** buttons; the **No** button is the default. The value returned by **MsgBox** depends on the button the user clicks.

```tb
Dim Style As VbMsgBoxStyle
Dim Response As VbMsgBoxResult

Style = vbYesNo Or vbCritical Or vbDefaultButton2
Response = MsgBox("Do you want to continue?", Style, "MsgBox Demonstration")

If Response = vbYes Then
    ' User chose Yes — perform the action.
Else
    ' User chose No — back out.
End If
```

### See Also

- [InputBox](InputBox) function
- [VbMsgBoxStyle](../Constants/VbMsgBoxStyle) enumeration
- [VbMsgBoxResult](../Constants/VbMsgBoxResult) enumeration
