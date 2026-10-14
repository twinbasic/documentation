---
title: cDialogCountdownMsgBox
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogCountdownMsgBox
has_toc: false
---

# cDialogCountdownMsgBox class
{: .no_toc }

A **cDialogCountdownMsgBox** shows a Windows message box that closes by itself after a number of seconds, and reports which button ended it. The box is the one that the **MessageBoxTimeoutW** function of `user32.dll` shows; the class has no window of its own.

A **cDialogCountdownMsgBox** is made with **New**: `Dim box As New cDialogCountdownMsgBox`. It cannot be made with **CreateObject**. It is not a countdown that runs on screen: the box shows the number of seconds as text that never changes, and Windows closes it when the time is up.

The properties [**Title**](#title), [**Message**](#message), [**CountdownSeconds**](#countdownseconds), [**Buttons**](#buttons), [**Icon**](#icon) and [**DefaultButton**](#defaultbutton) describe the box, [**ShowDialog**](#showdialog) shows it, and [**ShowInfo**](#showinfo), [**ShowWarning**](#showwarning), [**ShowError**](#showerror), [**ShowQuestion**](#showquestion), [**ShowConfirm**](#showconfirm) and [**ShowCustom**](#showcustom) set the first five and show it in one call. [**Result**](#result), [**IsTimedOut**](#istimedout) and [**GetResultDescription**](#getresultdescription) report how it ended.

```tb check_build
Dim box As New cDialogCountdownMsgBox
Dim answer As DialogResult

answer = box.ShowQuestion("Save the changes before closing?", "Close", 20)
Select Case answer
    Case DialogResult.drYes:     Debug.Print "Save"
    Case DialogResult.drNo:      Debug.Print "Do not save"
    Case DialogResult.drTimeout: Debug.Print "No answer in 20 seconds"
End Select
```

> [!WARNING] 1.1.0.0
> A box with only an OK button that closes because its time ran out reports [**drOK**](#dialogresult), not [**drTimeout**](#dialogresult), and [**IsTimedOut**](#istimedout) is **False**. This affects the default box and [**ShowInfo**](#showinfo), [**ShowWarning**](#showwarning) and [**ShowError**](#showerror). A box with any other set of buttons reports **drTimeout** when it times out. No error is raised, so a program cannot tell a press of OK from the end of the time with these members alone.

```tb check_build
Dim box As New cDialogCountdownMsgBox
Dim started As Single

started = Timer
box.ShowInfo "Backup finished.", "Backup", 5

' With OK only, the result cannot show a timeout: compare the time.
If Timer - started >= 5 Then
    Debug.Print "Closed by the countdown"
Else
    Debug.Print "OK was pressed"
End If
```

## Properties

### AutoClose
{: .no_toc }

Whether the box closes when the time is up.

Syntax: *object*.**AutoClose** [ **=** *value* ]

*value*
: A **Boolean**. **True** (the default) closes the box after [**CountdownSeconds**](#countdownseconds) seconds. **False** leaves it open until the user presses a button; it then shows no countdown text, whatever [**ShowProgress**](#showprogress) says.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.AutoClose    ' True
box.AutoClose = False
Debug.Print box.AutoClose    ' False
```

### Buttons
{: .no_toc }

The buttons of the box.

Syntax: *object*.**Buttons** [ **=** *value* ]

*value*
: A **Long**, usually a [**MessageBoxButtons**](#messageboxbuttons) member. The default is **MB_OK**.

The value is combined with [**Icon**](#icon) and [**DefaultButton**](#defaultbutton) by **Or** and passed to Windows as the style of the box. [**ShowInfo**](#showinfo), [**ShowWarning**](#showwarning), [**ShowError**](#showerror), [**ShowQuestion**](#showquestion), [**ShowConfirm**](#showconfirm) and [**ShowCustom**](#showcustom) set it.

The enumeration has the six sets of buttons that [**Result**](#result) can report. A button that [**DialogResult**](#dialogresult) has no member for, such as Try Again and Continue of the style 6 (Cancel, Try Again, Continue), is not mapped: [**ShowDialog**](#showdialog) then leaves [**Result**](#result) as the previous call left it, or **drTimeout** in a new object, and returns that.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.Buttons = MB_OK    ' True
box.Buttons = MB_YESNOCANCEL
Debug.Print box.Buttons            ' 3
```

### CountdownSeconds
{: .no_toc }

The time after which the box closes, in seconds.

Syntax: *object*.**CountdownSeconds** [ **=** *value* ]

*value*
: A **Long**. The default is 10.

Setting it also sets [**RemainingSeconds**](#remainingseconds). The shortened forms [**ShowInfo**](#showinfo) and the others take the time as an argument, store it here, and do not touch [**RemainingSeconds**](#remainingseconds).

The countdown text that the box shows (see [**ShowProgress**](#showprogress)) names this value in whole seconds, also for 1 and 0: `in 1 seconds...`. A value of 0 or less does not close the box: it stays open until a button is pressed, and its text says `in 0 seconds...`.

> [!NOTE]
> The class multiplies the value by 1000 to get milliseconds. A value above 2,147,483 (about 24.8 days) overflows, and [**ShowDialog**](#showdialog) handles the error 6 itself: it shows a plain message box with the message and an OK button, with no icon, countdown text or other buttons, and returns **drOK**. The call raises nothing, but **Err.Number** is 6 afterwards.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.CountdownSeconds    ' 10
box.CountdownSeconds = 45
Debug.Print box.CountdownSeconds    ' 45
Debug.Print box.RemainingSeconds    ' 45
```

### DefaultButton
{: .no_toc }

The button that Enter presses.

Syntax: *object*.**DefaultButton** [ **=** *value* ]

*value*
: A **Long**, usually a [**MessageBoxDefaultButton**](#messageboxdefaultbutton) member. The default is **MB_DEFBUTTON1**, the first button.

With **MB_YESNO** and **MB_DEFBUTTON2**, Enter ends the box with **drNo**. The [**Show\***](#showdialog) shortened forms do not change this property.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.DefaultButton = MB_DEFBUTTON1    ' True
box.Buttons = MB_YESNO
box.DefaultButton = MB_DEFBUTTON2
Debug.Print box.DefaultButton                    ' 256
```

### Icon
{: .no_toc }

The icon of the box.

Syntax: *object*.**Icon** [ **=** *value* ]

*value*
: A **Long**, usually a [**MessageBoxIcons**](#messageboxicons) member. The default is **MB_ICONINFORMATION**.

The [**Show\***](#showdialog) shortened forms set it; each form names its icon. The enumeration has no member for a box without an icon.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.Icon = MB_ICONINFORMATION    ' True
box.Icon = MB_ICONSTOP
Debug.Print box.Icon                         ' 16
```

### Message
{: .no_toc }

The text of the box.

Syntax: *object*.**Message** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

The box shows this text; when the countdown text is on (see [**ShowProgress**](#showprogress)), it follows after a blank line.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print Len(box.Message)    ' 0
box.Message = "Do you want to continue?"
Debug.Print box.Message         ' Do you want to continue?
```

### OwnerHwnd
{: .no_toc }

The window that owns the box.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

*value*
: A **LongPtr**, the handle of a window. The default is 0, no owner.

With an owner, the box is shown over it and the owner cannot be used while the box is open. [**Reset**](#reset) sets it back to 0.

```tb check_build
Sub AskFromForm(ByVal parentWindow As LongPtr)
    Dim box As New cDialogCountdownMsgBox

    box.OwnerHwnd = parentWindow
    Debug.Print box.ShowConfirm("Discard the draft?", "Draft", 15)
End Sub
```

### RemainingSeconds
{: .no_toc }

The seconds left, read-only.

Syntax: *object*.**RemainingSeconds** **As Long**

Returns the value that [**CountdownSeconds**](#countdownseconds) was last set to by the property. It does not count down, neither while the box is open nor afterwards, so it is of no use for showing the time left.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

box.CountdownSeconds = 30
Debug.Print box.RemainingSeconds    ' 30
```

### Result
{: .no_toc }

How the last box ended, read-only.

Syntax: *object*.**Result** **As** [**DialogResult**](#dialogresult)

The button that ended the last call of [**ShowDialog**](#showdialog), or **drTimeout**. A new object, and one after [**Reset**](#reset), holds **drTimeout** before any box has been shown.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.Result = DialogResult.drTimeout    ' True
Debug.Print box.Result                             ' 32000
```

### ShowProgress
{: .no_toc }

Whether the box tells the number of seconds.

Syntax: *object*.**ShowProgress** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

When this and [**AutoClose**](#autoclose) are **True**, the box adds a blank line and `This message will close automatically in N seconds...` to [**Message**](#message), where N is [**CountdownSeconds**](#countdownseconds). The text is fixed: it does not count down and the box has no progress bar. When **False**, only the message is shown; the box still closes when the time is up.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.ShowProgress    ' True
box.ShowProgress = False
Debug.Print box.ShowProgress    ' False
```

### Title
{: .no_toc }

The title of the box.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**. The default is `Message`.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.Title    ' Message
box.Title = "Backup"
Debug.Print box.Title    ' Backup
```

## Methods

### GetResultDescription
{: .no_toc }

Names the result in words.

Syntax: *object*.**GetResultDescription** ( ) **As String**

Returns `OK`, `Cancel`, `Abort`, `Retry`, `Ignore`, `Yes`, `No` or `Timeout (Auto-close)` for the current [**Result**](#result). In a new object it returns `Timeout (Auto-close)`.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.GetResultDescription()    ' Timeout (Auto-close)
```

### IsTimedOut
{: .no_toc }

Whether the last box was closed by the countdown.

Syntax: *object*.**IsTimedOut** ( ) **As Boolean**

Returns **True** when [**Result**](#result) is **drTimeout**. That is also the case in a new object before any box has been shown. A box with only an OK button that times out gives **False**, as the warning [above](#cdialogcountdownmsgbox-class) describes.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

Debug.Print box.IsTimedOut()    ' True
```

### Reset
{: .no_toc }

Restores every property to its starting value.

Syntax: *object*.**Reset**

Sets [**Title**](#title) to `Message`, [**Message**](#message) to an empty string, [**CountdownSeconds**](#countdownseconds) and [**RemainingSeconds**](#remainingseconds) to 10, [**Buttons**](#buttons) to **MB_OK**, [**Icon**](#icon) to **MB_ICONINFORMATION**, [**DefaultButton**](#defaultbutton) to **MB_DEFBUTTON1**, [**ShowProgress**](#showprogress) and [**AutoClose**](#autoclose) to **True**, [**OwnerHwnd**](#ownerhwnd) to 0 and [**Result**](#result) to **drTimeout**.

```tb check_build check_run
Dim box As New cDialogCountdownMsgBox

box.Title = "Backup"
box.CountdownSeconds = 3
box.AutoClose = False
box.Reset
Debug.Print box.Title               ' Message
Debug.Print box.CountdownSeconds    ' 10
Debug.Print box.AutoClose           ' True
```

### ShowConfirm
{: .no_toc }

Shows a box with Yes, No and Cancel.

Syntax: *object*.**ShowConfirm** ( *message* [ , *title* [ , *seconds* ] ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *optional* The title. The default is `Confirm`.

*seconds*
: *optional* The time before the box closes. The default is 30.

Sets [**Message**](#message), [**Title**](#title), [**CountdownSeconds**](#countdownseconds), [**Buttons**](#buttons) (**MB_YESNOCANCEL**) and [**Icon**](#icon) (**MB_ICONQUESTION**), then calls [**ShowDialog**](#showdialog). The other properties keep their values. The result is **drYes**, **drNo**, **drCancel** or **drTimeout**; Esc and the close button of the box give **drCancel**.

```tb check_build
Dim box As New cDialogCountdownMsgBox

Select Case box.ShowConfirm("Overwrite the file?", "Save")
    Case DialogResult.drYes:    Debug.Print "Overwrite"
    Case DialogResult.drNo:     Debug.Print "Choose another name"
    Case DialogResult.drCancel: Debug.Print "Cancelled"
    Case DialogResult.drTimeout: Debug.Print "No answer"
End Select
```

### ShowCustom
{: .no_toc }

Shows a box with the buttons and the icon that are passed.

Syntax: *object*.**ShowCustom** ( *message* , *title* , *buttons* , *icon* [ , *seconds* ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *required* The title.

*buttons*
: *required* A **Long**, a [**MessageBoxButtons**](#messageboxbuttons) member.

*icon*
: *required* A **Long**, a [**MessageBoxIcons**](#messageboxicons) member.

*seconds*
: *optional* The time before the box closes. The default is 10.

Sets the five properties that correspond to the arguments, then calls [**ShowDialog**](#showdialog). The arguments are numbers, not captions: the class does not offer button captions of its own.

```tb check_build
Dim box As New cDialogCountdownMsgBox
Dim answer As DialogResult

answer = box.ShowCustom("Try the upload again?", "Upload", MB_RETRYCANCEL, MB_ICONEXCLAMATION, 20)
Debug.Print box.GetResultDescription()
```

### ShowDialog
{: .no_toc }

Shows the box that the properties describe.

Syntax: *object*.**ShowDialog** ( ) **As** [**DialogResult**](#dialogresult)

Shows the box and waits until a button is pressed, the box is closed, or the time is up. The call combines [**Buttons**](#buttons), [**Icon**](#icon) and [**DefaultButton**](#defaultbutton) into the style, takes the time from [**CountdownSeconds**](#countdownseconds) when [**AutoClose**](#autoclose) is **True** (otherwise there is no limit), adds the countdown text when [**ShowProgress**](#showprogress) is **True**, and stores the answer in [**Result**](#result), which it also returns.

The box is modal. Enter presses [**DefaultButton**](#defaultbutton). Esc and the close button end a box that has only OK (the result is **drOK**) or has a Cancel button (**drCancel**); a box with Yes and No only ignores both.

See [**Buttons**](#buttons) for a button that is not mapped and [**CountdownSeconds**](#countdownseconds) for a time that is too long, and the warning at the top of the page for the timeout of a box with OK only.

```tb check_build
Dim box As New cDialogCountdownMsgBox

box.Title = "Session"
box.Message = "Your session is about to end. Stay signed in?"
box.Buttons = MB_YESNO
box.Icon = MB_ICONQUESTION
box.DefaultButton = MB_DEFBUTTON1
box.CountdownSeconds = 30

If box.ShowDialog() = DialogResult.drYes Then
    Debug.Print "Stay signed in"
Else
    Debug.Print "Sign out"
End If
```

### ShowError
{: .no_toc }

Shows an error box with an OK button.

Syntax: *object*.**ShowError** ( *message* [ , *title* [ , *seconds* ] ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *optional* The title. The default is `Error`.

*seconds*
: *optional* The time before the box closes. The default is 20.

Sets [**Buttons**](#buttons) to **MB_OK** and [**Icon**](#icon) to **MB_ICONSTOP** and the other three properties as [**ShowConfirm**](#showconfirm) does, then calls [**ShowDialog**](#showdialog). The result is **drOK** whether OK was pressed or the time ran out.

```tb check_build
Dim box As New cDialogCountdownMsgBox

box.ShowError "The file could not be saved.", "Save"
```

### ShowInfo
{: .no_toc }

Shows an information box with an OK button.

Syntax: *object*.**ShowInfo** ( *message* [ , *title* [ , *seconds* ] ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *optional* The title. The default is `Information`.

*seconds*
: *optional* The time before the box closes. The default is 10.

Sets [**Buttons**](#buttons) to **MB_OK** and [**Icon**](#icon) to **MB_ICONINFORMATION** and the other three properties as [**ShowConfirm**](#showconfirm) does, then calls [**ShowDialog**](#showdialog). The result is **drOK** whether OK was pressed or the time ran out.

```tb check_build
Dim box As New cDialogCountdownMsgBox

box.ShowInfo "The report was exported.", "Export", 8
```

### ShowQuestion
{: .no_toc }

Shows a box with Yes and No.

Syntax: *object*.**ShowQuestion** ( *message* [ , *title* [ , *seconds* ] ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *optional* The title. The default is `Question`.

*seconds*
: *optional* The time before the box closes. The default is 30.

Sets [**Buttons**](#buttons) to **MB_YESNO** and [**Icon**](#icon) to **MB_ICONQUESTION** and the other three properties as [**ShowConfirm**](#showconfirm) does, then calls [**ShowDialog**](#showdialog). The result is **drYes**, **drNo** or **drTimeout**. Esc and the close button of the box do nothing.

```tb check_build
Dim box As New cDialogCountdownMsgBox

If box.ShowQuestion("Restart now?", "Update", 30) = DialogResult.drYes Then
    Debug.Print "Restarting"
ElseIf box.IsTimedOut() Then
    Debug.Print "No answer; restart later"
End If
```

### ShowWarning
{: .no_toc }

Shows a warning box with an OK button.

Syntax: *object*.**ShowWarning** ( *message* [ , *title* [ , *seconds* ] ] ) **As** [**DialogResult**](#dialogresult)

*message*
: *required* The text of the box.

*title*
: *optional* The title. The default is `Warning`.

*seconds*
: *optional* The time before the box closes. The default is 15.

Sets [**Buttons**](#buttons) to **MB_OK** and [**Icon**](#icon) to **MB_ICONEXCLAMATION** and the other three properties as [**ShowConfirm**](#showconfirm) does, then calls [**ShowDialog**](#showdialog). The result is **drOK** whether OK was pressed or the time ran out.

```tb check_build
Dim box As New cDialogCountdownMsgBox

box.ShowWarning "The disk is almost full.", "Disk"
```

## Enumerations

The four enumerations are declared in the class and are used by their member names, such as `MB_YESNO` and `DialogResult.drYes`.

### DialogResult
{: .no_toc }

The result of a box.

| Member | Value | Meaning |
|---|---|---|
| **drOK** | 1 | OK. Also the result of a box with only OK that timed out |
| **drCancel** | 2 | Cancel, Esc or the close button |
| **drAbort** | 3 | Abort |
| **drRetry** | 4 | Retry |
| **drIgnore** | 5 | Ignore |
| **drYes** | 6 | Yes |
| **drNo** | 7 | No |
| **drTimeout** | 32000 | The time ran out |

### MessageBoxButtons
{: .no_toc }

The sets of buttons for [**Buttons**](#buttons).

| Member | Value | Buttons |
|---|---|---|
| **MB_OK** | 0 | OK |
| **MB_OKCANCEL** | 1 | OK, Cancel |
| **MB_ABORTRETRYIGNORE** | 2 | Abort, Retry, Ignore |
| **MB_YESNOCANCEL** | 3 | Yes, No, Cancel |
| **MB_YESNO** | 4 | Yes, No |
| **MB_RETRYCANCEL** | 5 | Retry, Cancel |

### MessageBoxIcons
{: .no_toc }

The icons for [**Icon**](#icon).

| Member | Value | Icon |
|---|---|---|
| **MB_ICONSTOP** | 16 | A red circle with a cross |
| **MB_ICONQUESTION** | 32 | A question mark |
| **MB_ICONEXCLAMATION** | 48 | An exclamation mark |
| **MB_ICONINFORMATION** | 64 | The letter i |

### MessageBoxDefaultButton
{: .no_toc }

The default buttons for [**DefaultButton**](#defaultbutton).

| Member | Value | Default button |
|---|---|---|
| **MB_DEFBUTTON1** | 0 | The first button |
| **MB_DEFBUTTON2** | 256 | The second button |
| **MB_DEFBUTTON3** | 512 | The third button |

## Example

This example asks a question that has a safe answer when nobody replies, and treats a timeout as the answer No.

```tb check_build
Dim box As New cDialogCountdownMsgBox
Dim answer As DialogResult

box.Title = "Unsaved changes"
box.Message = "Close the document without saving?"
box.Buttons = MB_YESNO
box.Icon = MB_ICONEXCLAMATION
box.DefaultButton = MB_DEFBUTTON2
box.CountdownSeconds = 30

answer = box.ShowDialog()
If answer = DialogResult.drYes Then
    Debug.Print "Closing without saving"
Else
    Debug.Print "Keeping the document: " & box.GetResultDescription()
End If
```

## See Also

- [cDialogInputBox](cDialogInputBox) class -- asks for one line of text
- [cDialogProgress](cDialogProgress) class -- tracks the progress of a task
- [TBMANLIB_Dialog](.) package -- overview
