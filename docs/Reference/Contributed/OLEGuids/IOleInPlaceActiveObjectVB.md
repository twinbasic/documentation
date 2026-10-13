---
title: IOleInPlaceActiveObjectVB
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceActiveObjectVB
has_toc: false
---

# IOleInPlaceActiveObjectVB interface
{: .no_toc }

A Visual Basic-style version of **IOleInPlaceActiveObject.TranslateAccelerator**, which a class can implement.

**IOleInPlaceActiveObjectVB** is not a Windows interface. It has the interface identifier `38584260-0CFB-45E7-8FBB-5D20B311F5B8` and extends **stdole.IDispatch**. It is not declared `[OleAutomation(False)]`, as the package's Windows interfaces are.

It exists because [**IOleInPlaceActiveObject**](IOleInPlaceActiveObject) has `[PreserveSig]` members, which a twinBASIC class cannot implement. This interface has one **Sub** that corresponds to the **TranslateAccelerator** method of that interface, with signature types that Visual Basic code uses.

## Methods

### TranslateAccelerator

```tb inert=signature
Sub TranslateAccelerator(ByRef Handled As Boolean, ByRef RetVal As Long, ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByVal Shift As Long)
```

Lets the object process an accelerator keystroke. The Windows method receives a pointer to a `MSG` structure; this one receives the fields of the message as separate parameters: the window handle *hWnd*, the message number *wMsg*, and *wParam* and *lParam*. *Shift* is passed in addition to them.

*Handled* and *RetVal* are passed by reference, and the implementation sets them. *Handled* is a flag that an implementation which dealt with the keystroke sets to **True**. *RetVal* corresponds to the HRESULT that the Windows method returns: `S_OK` (0) when the object used the keystroke and `S_FALSE` (1) when it did not.

## Example

This class uses the F2 key (virtual-key code `&H71`) and reports that it did, with `S_OK` as the result. It leaves every other keystroke alone.

```tb check_build projname=og-activeobject slot=file
Class AcceleratorHandler
    Implements IOleInPlaceActiveObjectVB

    Private Sub IOleInPlaceActiveObjectVB_TranslateAccelerator(ByRef Handled As Boolean, ByRef RetVal As Long, ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByVal Shift As Long) Implements IOleInPlaceActiveObjectVB.TranslateAccelerator
        If wMsg = &H100 And wParam = &H71 Then
            Handled = True
            RetVal = 0
        End If
    End Sub
End Class
```

A key-down message for F2 (`WM_KEYDOWN`, `&H100`) is handled:

```tb check_run projname=og-activeobject
Dim a As IOleInPlaceActiveObjectVB = New AcceleratorHandler
Dim handled As Boolean
Dim result As Long = 1

a.TranslateAccelerator handled, result, 0, &H100, &H71, 0, 0
Debug.Print handled  ' True
Debug.Print result   ' 0
```

## See Also

- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) interface -- the Windows interface this one corresponds to
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) interface -- Visual Basic-style versions of three **IPerPropertyBrowsing** methods
- [IOleInPlaceObjectWindowlessVB](IOleInPlaceObjectWindowlessVB) interface -- Visual Basic-style **OnWindowMessage**
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
