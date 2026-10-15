---
title: cDialogFindReplace
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogFindReplace
has_toc: false
---

# cDialogFindReplace class
{: .no_toc }

A **cDialogFindReplace** shows the Windows Find dialog or the Find and Replace dialog. The dialog is modeless: [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) return at once, and the dialog stays open beside the program's own window. The class holds the text, the options and the last action of the user as properties, and builds the line of text that describes the search.

<!-- test: probe c43, probe c44, probe c46, probe c48 -->
> [!WARNING] 1.1.0.0
> The program never learns what the user did in the dialog. [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) keep the structure that Windows works on in a local variable, which no longer exists when the method returns, although Windows keeps its address for as long as the dialog is open. The owner window then receives no message for **Find Next**, **Replace**, **Replace All** or **Cancel**, [**LastAction**](#lastaction) stays **None**, and [**hWnd**](#hwnd) and [**IsVisible**](#isvisible) still show a dialog after it was closed. In a 32-bit program, **ShowReplace** can also end the program with an access violation while the dialog is open, before anything is pressed, because Windows reads memory that has been reused. See [How the dialog reports](#how-the-dialog-reports). A program that needs the dialog calls `FindTextW` or `ReplaceTextW` itself and keeps the `FINDREPLACE` structure in a module-level variable.

<!-- test: CDialogFindReplaceTests.MessageId_IsTheRegisteredMessageOfTheDialogs, CDialogFindReplaceTests.UpdateFromFlags_SetsTheOptionsAndTheAction, CDialogFindReplaceTests.UpdateFromFlags_DialogTermWinsOverTheOtherActions, CDialogFindReplaceTests.UpdateFromFlags_EmptiesBothTextsWhenNoDialogHasFilledTheBuffers -->
**Properties:** [**AllowMatchCase**](#allowmatchcase), [**AllowUpDown**](#allowupdown), [**AllowWholeWord**](#allowwholeword), [**Direction**](#direction), [**FindWhat**](#findwhat), [**hWnd**](#hwnd), [**LastAction**](#lastaction), [**LastError**](#lasterror), [**MatchCase**](#matchcase), [**MessageId**](#messageid), [**Mode**](#mode), [**OwnerHwnd**](#ownerhwnd), [**ReplaceWith**](#replacewith), [**WholeWord**](#wholeword).
**Methods:** [**IsVisible**](#isvisible), [**Reset**](#reset), [**ShowFind**](#showfind), [**ShowReplace**](#showreplace), [**ToDescription**](#todescription), [**UpdateFromFlags**](#updatefromflags).
**Enumerations:** [**DialogMode**](#dialogmode), [**FindAction**](#findaction), [**SearchDirection**](#searchdirection).

Create an object with `Dim dlg As New cDialogFindReplace`. The class is declared `[COMCreatable(False)]`, so **CreateObject** cannot make one, and **New** can.

```tb check_build
Private Sub OpenFind(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogFindReplace

    dlg.OwnerHwnd = ownerWindow         ' the window that receives the messages
    dlg.FindWhat = "twin"
    dlg.MatchCase = True
    If dlg.ShowFind() Then
        Debug.Print "Open, message " & dlg.MessageId
    Else
        Debug.Print "Not shown, error " & dlg.LastError
    End If
End Sub
```

## How the dialog reports

The dialog is not modal, so there is no result to return. Windows reports the user's actions by **sending a registered window message** to the owner window, with the address of a `FINDREPLACE` structure as `lParam`. The number of the message is [**MessageId**](#messageid), the same for every object. In the structure, `Flags` tells what happened: `FR_FINDNEXT` (&H8), `FR_REPLACE` (&H10), `FR_REPLACEALL` (&H20) or `FR_DIALOGTERM` (&H40, the dialog closed), together with the options `FR_DOWN` (&H1), `FR_WHOLEWORD` (&H2) and `FR_MATCHCASE` (&H4). The program's window procedure reads `Flags`, at byte 12 of the structure in a 32-bit program and byte 24 in a 64-bit one, and passes it to [**UpdateFromFlags**](#updatefromflags), which sets [**LastAction**](#lastaction), [**MatchCase**](#matchcase), [**WholeWord**](#wholeword), [**Direction**](#direction) and reads [**FindWhat**](#findwhat) and [**ReplaceWith**](#replacewith) back from the text the user typed.

The class has no event, callback or message loop of its own. To receive the message, the owner window needs a window procedure that the program controls, for example by subclassing the window, and the message loop of the program must run while the dialog is open.

```tb check_build
Private Declare PtrSafe Sub FrCopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)

' Called from the owner window's procedure when the message number equals dlg.MessageId.
Public Sub FrHandleFindMessage(ByVal dlg As cDialogFindReplace, ByVal lParam As LongPtr)
    Dim flags As Long

    #If Win64 Then
        FrCopyMemory VarPtr(flags), lParam + 24, 4
    #Else
        FrCopyMemory VarPtr(flags), lParam + 12, 4
    #End If
    dlg.UpdateFromFlags flags
    Select Case dlg.LastAction
        Case FindAction.FindNext
            Debug.Print "Find: " & dlg.FindWhat
        Case FindAction.ReplaceAll
            Debug.Print "Replace all: " & dlg.FindWhat & " -> " & dlg.ReplaceWith
        Case FindAction.DialogClosed
            Debug.Print "Closed"
    End Select
End Sub
```

<!-- /test -->

<!-- test: CDialogFindReplaceTests.FindTextW_WithAModuleLevelStructureDeliversTheMessages, probe c47 -->
### The structure the class keeps in a local variable

Each of [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) declares its `FINDREPLACE` as a local variable and passes it to `FindTextW` or `ReplaceTextW`. Windows does not copy it: it keeps the pointer for the whole life of the dialog and reads and writes the structure each time the user presses a button. When the method returns, the memory belongs to whatever uses the stack next. In a 32-bit and in a 64-bit program alike, the dialog opens, accepts text and closes, and the owner window gets no message at all, so a program that waits for [**LastAction**](#lastaction) never leaves the wait.

The fault is in the code of the class and not in Windows: the same call made with the structure in a module-level variable delivers a message for **Find Next** and one for **Cancel**, with the typed text in the buffer.

<!-- /test -->

<!-- test: CDialogFindReplaceTests.Defaults_AreThoseOfThePage, CDialogFindReplaceTests.ToDescription_NamesTheSearch, CDialogFindReplaceTests.Reset_RestoresTheSearchSettings, CDialogFindReplaceTests.ShowFind_WithoutAnOwnerReturnsFalseWithLastErrorFFFF, CDialogFindReplaceTests.ShowFind_FindWhatOf300CharactersRaisesError5, CDialogFindReplaceTests.ShowReplace_ReplaceWithOf300CharactersRaisesError5 -->
## Properties

### AllowMatchCase
{: .no_toc }

Whether the user may change the *Match case* option.

Syntax: *object*.**AllowMatchCase** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) set `FR_NOMATCHCASE`, and the *Match case* check box is shown disabled.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.AllowMatchCase = False
dlg.MatchCase = True            ' fixed for the user
Debug.Print dlg.AllowMatchCase
```

### AllowUpDown
{: .no_toc }

Whether the user may change the search direction.

Syntax: *object*.**AllowUpDown** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, the methods set `FR_NOUPDOWN`, and the *Up* and *Down* buttons are shown disabled.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.AllowUpDown = False
dlg.Direction = SearchDirection.Down
Debug.Print dlg.AllowUpDown
```

### AllowWholeWord
{: .no_toc }

Whether the user may change the *Match whole word only* option.

Syntax: *object*.**AllowWholeWord** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, the methods set `FR_NOWHOLEWORD`, and the check box is shown disabled.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.AllowWholeWord = False
Debug.Print dlg.AllowWholeWord
```

### Direction
{: .no_toc }

The direction of the search.

Syntax: *object*.**Direction** [ **=** *value* ]

A [**SearchDirection**](#searchdirection), **Down** by default. When it is **Down**, the methods set `FR_DOWN` and the dialog opens with *Down* selected, otherwise with *Up*. [**UpdateFromFlags**](#updatefromflags) sets it from `FR_DOWN`.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.Direction = SearchDirection.Up
Debug.Print dlg.Direction = SearchDirection.Up
```

### FindWhat
{: .no_toc }

The text to find.

Syntax: *object*.**FindWhat** [ **=** *value* ]

A **String**, empty by default. [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) put it in the *Find what* box. The box holds 256 characters, and the methods raise error 5 (*Invalid procedure call or argument*) for a longer text, before they ask Windows for the dialog. [**UpdateFromFlags**](#updatefromflags) replaces it with the text of the box.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

dlg.FindWhat = String$(300, "a")
On Error Resume Next
Debug.Print dlg.ShowFind()
Debug.Print Err.Number
' Output:
' 5
```

### hWnd
{: .no_toc }

The window handle of the dialog.

Syntax: *object*.**hWnd**

A read-only **LongPtr**, 0 by default and when no dialog was created. [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) set it to the handle that Windows returns. [**UpdateFromFlags**](#updatefromflags) sets it to 0 when the flags tell that the dialog closed, and [**Reset**](#reset) sets it to 0 without closing the dialog.

```tb check_build
Dim dlg As New cDialogFindReplace

Debug.Print dlg.hWnd
```

### LastAction
{: .no_toc }

What the user did last, as [**UpdateFromFlags**](#updatefromflags) read it.

Syntax: *object*.**LastAction**

A read-only [**FindAction**](#findaction), **None** by default. Only [**UpdateFromFlags**](#updatefromflags) and [**Reset**](#reset) change it.

```tb check_build
Dim dlg As New cDialogFindReplace

If dlg.LastAction = FindAction.None Then Debug.Print "No action yet"
```

### LastError
{: .no_toc }

The error code of the last call that could not create a dialog.

Syntax: *object*.**LastError**

A read-only **Long**, 0 by default. After a [**ShowFind**](#showfind) or [**ShowReplace**](#showreplace) that returned **False** it holds the value of `CommDlgExtendedError`; after one that returned **True** it is 0. With [**OwnerHwnd**](#ownerhwnd) 0, Windows refuses the dialog and the value is `&HFFFF`.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

Debug.Print dlg.ShowFind()
Debug.Print Hex$(dlg.LastError)
' Output:
' False
' FFFF
```

### MatchCase
{: .no_toc }

Whether the search distinguishes upper-case from lower-case letters.

Syntax: *object*.**MatchCase** [ **=** *value* ]

A **Boolean**, **False** by default. The methods set `FR_MATCHCASE` for **True** and the *Match case* check box starts selected. [**UpdateFromFlags**](#updatefromflags) sets it from `FR_MATCHCASE`.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.MatchCase = True
Debug.Print dlg.ToDescription()
```

### MessageId
{: .no_toc }

The number of the window message that the dialog sends to the owner window.

Syntax: *object*.**MessageId**

A read-only **Long**: the value of `RegisterWindowMessage("commdlg_FindReplace")`, a number that Windows assigns once for the whole session, from `&HC000` up. Every object gets the same number. The class reads it when it is created.

```tb check_build
Dim dlg As New cDialogFindReplace

Debug.Print dlg.MessageId
```

### Mode
{: .no_toc }

Which dialog the object last showed, and how [**ToDescription**](#todescription) describes the search.

Syntax: *object*.**Mode** [ **=** *value* ]

A [**DialogMode**](#dialogmode), **FindMode** by default. [**ShowFind**](#showfind) sets **FindMode** and [**ShowReplace**](#showreplace) sets **ReplaceMode**, also when Windows refuses the dialog. Assigning a value changes only the text that **ToDescription** returns; the dialog that opens is the one of the method that is called.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.Mode = DialogMode.ReplaceMode
dlg.ReplaceWith = "x"
Debug.Print dlg.ToDescription()
```

### OwnerHwnd
{: .no_toc }

The window that owns the dialog and receives its messages.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

A **LongPtr** window handle, 0 by default. Windows requires an owner: with 0, [**ShowFind**](#showfind) and [**ShowReplace**](#showreplace) return **False** and no dialog opens. [**Reset**](#reset) does not change it.

```tb check_build
Private Sub SetOwner(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogFindReplace

    dlg.OwnerHwnd = ownerWindow         ' the handle of a window of the program
    Debug.Print dlg.OwnerHwnd
End Sub
```

### ReplaceWith
{: .no_toc }

The replacement text.

Syntax: *object*.**ReplaceWith** [ **=** *value* ]

A **String**, empty by default. [**ShowReplace**](#showreplace) puts it in the *Replace with* box, which holds 256 characters, and raises error 5 for a longer text. [**ShowFind**](#showfind) has no such box and does not use it. [**UpdateFromFlags**](#updatefromflags) replaces it with the text of the box; after a **ShowFind** the box does not exist, and the text becomes empty.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.FindWhat = "old"
dlg.ReplaceWith = "new"
Debug.Print dlg.ReplaceWith
```

### WholeWord
{: .no_toc }

Whether the search matches whole words only.

Syntax: *object*.**WholeWord** [ **=** *value* ]

A **Boolean**, **False** by default. The methods set `FR_WHOLEWORD` for **True** and the check box starts selected. [**UpdateFromFlags**](#updatefromflags) sets it from `FR_WHOLEWORD`.

```tb check_build
Dim dlg As New cDialogFindReplace

dlg.WholeWord = True
Debug.Print dlg.ToDescription()
```

## Methods

### IsVisible
{: .no_toc }

Tells whether the object has a dialog.

Syntax: *object*.**IsVisible** ( ) **As Boolean**

Returns **True** when [**hWnd**](#hwnd) is not 0. It does not ask Windows whether the window is shown or still exists, so it stays **True** after the user closed the dialog, until [**UpdateFromFlags**](#updatefromflags) reads a closing message or [**Reset**](#reset) runs.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

Debug.Print dlg.IsVisible()
' Output:
' False
```

### Reset
{: .no_toc }

Restores the search settings to their starting values.

Syntax: *object*.**Reset**

[**FindWhat**](#findwhat) and [**ReplaceWith**](#replacewith) become empty, [**MatchCase**](#matchcase) and [**WholeWord**](#wholeword) **False**, [**Direction**](#direction) **Down**, [**Mode**](#mode) **FindMode**, the three **Allow** properties **True**, [**hWnd**](#hwnd) 0, [**LastAction**](#lastaction) **None** and [**LastError**](#lasterror) 0. It does not close a dialog that is open, and it does not change [**OwnerHwnd**](#ownerhwnd) or the text the dialog edits, so a later [**UpdateFromFlags**](#updatefromflags) can bring that text back.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

dlg.FindWhat = "alpha"
dlg.MatchCase = True
dlg.Direction = SearchDirection.Up
dlg.Reset
Debug.Print dlg.ToDescription()
' Output:
' Find: "", Down
```

### ShowFind
{: .no_toc }

Shows the Find dialog.

Syntax: *object*.**ShowFind** ( ) **As Boolean**

Calls `FindTextW` and returns at once. Returns **True** when Windows created the dialog, and [**hWnd**](#hwnd) holds its handle. Returns **False** when it did not, and [**LastError**](#lasterror) holds the reason; a missing [**OwnerHwnd**](#ownerhwnd) is the usual one. The dialog opens with [**FindWhat**](#findwhat), [**MatchCase**](#matchcase), [**WholeWord**](#wholeword) and [**Direction**](#direction) in its controls and has the title *Find*. [**Mode**](#mode) becomes **FindMode**. Read the warning at the head of the page: the owner window receives no message from the dialog.

```tb check_build
Private Sub FindIn(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogFindReplace

    dlg.OwnerHwnd = ownerWindow
    dlg.FindWhat = "twinBASIC"
    dlg.Direction = SearchDirection.Down
    Debug.Print dlg.ShowFind()
End Sub
```

### ShowReplace
{: .no_toc }

Shows the Replace dialog.

Syntax: *object*.**ShowReplace** ( ) **As Boolean**

As [**ShowFind**](#showfind), with `ReplaceTextW`, a title *Replace*, the *Replace with* box filled from [**ReplaceWith**](#replacewith), and the buttons **Replace** and **Replace All** beside **Find Next**. [**Mode**](#mode) becomes **ReplaceMode**.

```tb check_build
Private Sub ReplaceIn(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogFindReplace

    dlg.OwnerHwnd = ownerWindow
    dlg.FindWhat = "old"
    dlg.ReplaceWith = "new"
    Debug.Print dlg.ShowReplace()
End Sub
```

### ToDescription
{: .no_toc }

Returns the search as a line of text.

Syntax: *object*.**ToDescription** ( ) **As String**

`Find: "text"`, then, when [**Mode**](#mode) is **ReplaceMode**, `, Replace: "text"`, then `, Match Case` and `, Whole Word` for each that is **True**, and last `, Down` or `, Up`.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

dlg.FindWhat = "alpha"
dlg.MatchCase = True
dlg.Direction = SearchDirection.Up
Debug.Print dlg.ToDescription()
dlg.Mode = DialogMode.ReplaceMode
dlg.ReplaceWith = "beta"
dlg.WholeWord = True
Debug.Print dlg.ToDescription()
' Output:
' Find: "alpha", Match Case, Up
' Find: "alpha", Replace: "beta", Match Case, Whole Word, Up
```

### UpdateFromFlags
{: .no_toc }

Reads the flags that the dialog sent, and updates the properties.

Syntax: *object*.**UpdateFromFlags** ( *flags* )

*flags*
: *required* A **Long**: the `Flags` member of the `FINDREPLACE` structure at `lParam` of the registered message. See [How the dialog reports](#how-the-dialog-reports).

The method sets [**MatchCase**](#matchcase) from `FR_MATCHCASE`, [**WholeWord**](#wholeword) from `FR_WHOLEWORD` and [**Direction**](#direction) from `FR_DOWN`, and sets [**LastAction**](#lastaction) from the first of these that is set, in this order: `FR_DIALOGTERM` gives **DialogClosed** (and sets [**hWnd**](#hwnd) to 0), then `FR_FINDNEXT` **FindNext**, `FR_REPLACE` **Replace**, `FR_REPLACEALL` **ReplaceAll**; with none of them it is **None**. Then it reads [**FindWhat**](#findwhat) and [**ReplaceWith**](#replacewith) from the two text buffers of the object.

Call it only from the handler of the message. Called at another time, it sets the options from whatever flags it is given and replaces both texts with the content of the buffers. The buffers are empty before the first dialog, so [**FindWhat**](#findwhat) and [**ReplaceWith**](#replacewith) then become empty strings. The buffer of the replacement text is filled only by [**ShowReplace**](#showreplace), so after a [**ShowFind**](#showfind) alone **ReplaceWith** becomes empty.

```tb check_build check_run
Dim dlg As New cDialogFindReplace

dlg.FindWhat = "alpha"
dlg.UpdateFromFlags &H8 Or &H1 Or &H4      ' FR_FINDNEXT, FR_DOWN, FR_MATCHCASE
Debug.Print dlg.LastAction = FindAction.FindNext
Debug.Print dlg.MatchCase
Debug.Print "[" & dlg.FindWhat & "]"
dlg.UpdateFromFlags &H40                   ' FR_DIALOGTERM
Debug.Print dlg.LastAction = FindAction.DialogClosed
Debug.Print dlg.Direction = SearchDirection.Up
' Output:
' True
' True
' []
' True
' True
```

<!-- /test -->

## Enumerations

<!-- test: compile FindActionQualifiedByTheClass, CDialogFindReplaceTests.Enumerations_HaveTheDocumentedValues -->
The enumerations are declared inside the class. A program names their members with the name of the enumeration in front, as in the samples, such as `FindAction.FindNext`. The name of the class cannot be put in front: `cDialogFindReplace.FindAction.FindNext` is refused with TB5079, *Unrecognized symbol 'cDialogFindReplace'*.
<!-- /test -->

### DialogMode
{: .no_toc }

Which dialog an object shows, the type of [**Mode**](#mode).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **FindMode** | 0 | The Find dialog. |
| **ReplaceMode** | 1 | The Replace dialog. |

### FindAction
{: .no_toc }

What the user did in the dialog, the type of [**LastAction**](#lastaction).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **None** | 0 | Nothing yet. |
| **FindNext** | 1 | The user chose **Find Next**. |
| **Replace** | 2 | The user chose **Replace**. |
| **ReplaceAll** | 3 | The user chose **Replace All**. |
| **DialogClosed** | 4 | The dialog was closed. |

### SearchDirection
{: .no_toc }

The direction of a search, the type of [**Direction**](#direction).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **Up** | 0 | Toward the start of the text. |
| **Down** | 1 | Toward the end of the text. |

## See Also

- [cDialogPrint](cDialogPrint) class -- shows the Print dialog
- [cDialogPageSetup](cDialogPageSetup) class -- shows the Page Setup dialog
- [cDialog](cDialog/) class -- shows the Open, Save As and Browse For Folder dialogs
- [TBMANLIB_Dialog](.) package -- overview
