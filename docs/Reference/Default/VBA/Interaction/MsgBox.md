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
: *optional* String expression that identifies the Help file to use to provide context-sensitive Help for the dialog box.

*context*
: *optional* Numeric expression giving the Help context number assigned to the relevant Help topic.

The *buttons* argument is a combination of values from the [**VbMsgBoxStyle**](../Constants/VbMsgBoxStyle) enumeration: one *button group* value (`vbOKOnly`, `vbOKCancel`, `vbAbortRetryIgnore`, `vbYesNoCancel`, `vbYesNo`, `vbRetryCancel`, `vbCancelTryAgainContinue`), optionally combined with one *icon* value (`vbCritical`, `vbQuestion`, `vbExclamation`, `vbInformation`), one *default-button* value (`vbDefaultButton1` through `vbDefaultButton4`), one *modality* value (`vbApplicationModal`, `vbSystemModal`), and any of the option flags (`vbMsgBoxHelpButton`, `vbMsgBoxSetForeground`, `vbMsgBoxRight`, `vbMsgBoxRtlReading`). Combine values with **Or** or addition.

> [!NOTE]
> **MsgBox** passes *buttons* to Windows as it is, so any style Windows accepts can be used. VB6 and 64-bit VBA show a plain **OK** box for a value they do not know --- `vbCancelTryAgainContinue`, two icons combined, a default-button value of &H400 --- and raise no error.

<!-- bug: interaction-missing-argument-checks -->
> [!WARNING] BETA 1010
> A *buttons* value whose button group Windows does not have (7 to 15, -1 included) shows no box: **MsgBox** returns 0 and raises no error. VB6 and 64-bit VBA show an **OK** box and return **vbOK**.

The return value is one of the constants from the [**VbMsgBoxResult**](../Constants/VbMsgBoxResult) enumeration, identifying which button the user clicked.

If the dialog box displays a **Cancel** button, pressing the ESC key has the same effect as clicking **Cancel**. When both *helpfile* and *context* are supplied, the user can press F1 to view the relevant Help topic; if the dialog also contains a **Help** button, clicking it invokes context-sensitive Help. The dialog stays open and **MsgBox** does not return until one of the non-Help buttons is clicked.

> [!NOTE]
> To pass any argument by name (other than the first), use **MsgBox** in an expression context --- for example, assign its result to a variable. To skip a positional argument, include the corresponding comma delimiter.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *prompt*, *buttons*, *title* or *context* is **Null**<br>*helpfile* is **Null** |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *helpfile* is given without *context* |

> [!NOTE] BETA 1010
> When *helpfile* is **Null**, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *helpfile* is given without *context*, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *context* is given without *helpfile*, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example displays a critical-error message in a dialog with **Yes** and **No** buttons; the **No** button is the default. The value returned by **MsgBox** depends on the button the user clicks.

```tb check_build
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
