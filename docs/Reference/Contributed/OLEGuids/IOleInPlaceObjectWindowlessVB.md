---
title: IOleInPlaceObjectWindowlessVB
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceObjectWindowlessVB
has_toc: false
---

# IOleInPlaceObjectWindowlessVB interface
{: .no_toc }

A Visual Basic-style version of **IOleInPlaceObjectWindowless.OnWindowMessage**, which a class can implement.

<!-- test: ImplementTests.IOleInPlaceObjectWindowlessVB_AnswersToItsIdentifier -->
**IOleInPlaceObjectWindowlessVB** is not a Windows interface. It has the interface identifier `061D3A2F-A213-4016-9756-B89140604819` and extends **stdole.IDispatch**. It is not declared `[OleAutomation(False)]`, as the package's Windows interfaces are. Its one method has the dispatch identifier 1 (`[DispId(1)]`).
<!-- /test -->

It exists because [**IOleInPlaceObjectWindowless**](IOleInPlaceObjectWindowless) has `[PreserveSig]` members, which a twinBASIC class cannot implement. This interface has one **Sub** that corresponds to the **OnWindowMessage** method of that interface, with signature types that Visual Basic code uses. **GetDropTarget** has no counterpart.

## Methods

### OnWindowMessage

```tb inert=signature
[DispId(1)]
Sub OnWindowMessage(ByRef Handled As Boolean, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByRef Result As LongPtr)
```

Receives a window message that a container sends to an object that is active in place and has no window. *wMsg* is the message identifier, and *wParam* and *lParam* are the parameters of the message.

*Handled* and *Result* are passed by reference, and the implementation sets them. *Handled* is a flag that an implementation which processed the message sets to **True**. *Result* corresponds to the result code that the Windows method returns through its last parameter.

## Example

This class processes the left mouse button message, `WM_LBUTTONDOWN` (`&H201`), and leaves every other message to its container.

```tb check_build projname=og-windowless slot=file
Class ClickHandler
    Implements IOleInPlaceObjectWindowlessVB

    Private Sub IOleInPlaceObjectWindowlessVB_OnWindowMessage(ByRef Handled As Boolean, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByRef Result As LongPtr) Implements IOleInPlaceObjectWindowlessVB.OnWindowMessage
        If wMsg = &H201 Then
            Handled = True
            Result = 0
        End If
    End Sub
End Class
```

A container passes it the messages it receives:

```tb check_run projname=og-windowless
Dim w As IOleInPlaceObjectWindowlessVB = New ClickHandler
Dim handled As Boolean
Dim result As LongPtr

w.OnWindowMessage handled, &H201, 0, 0, result
Debug.Print handled  ' True

handled = False
w.OnWindowMessage handled, &H200, 0, 0, result
Debug.Print handled  ' False
```

## See Also

- [IOleInPlaceObjectWindowless](IOleInPlaceObjectWindowless) interface -- the Windows interface this one corresponds to
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) interface -- Visual Basic-style **TranslateAccelerator**
- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) interface -- Visual Basic-style versions of three **IPerPropertyBrowsing** methods
