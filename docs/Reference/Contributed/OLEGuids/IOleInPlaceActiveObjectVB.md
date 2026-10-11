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
Sub TranslateAccelerator(Handled As Boolean, RetVal As Long, ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByVal Shift As Long)
```

Lets the object process an accelerator keystroke. The Windows method receives a pointer to a `MSG` structure; this one receives the fields of the message as separate parameters: the window handle *hWnd*, the message number *wMsg*, and *wParam* and *lParam*. *Shift* is passed in addition to them.

*Handled* and *RetVal* are passed by reference, and the implementation sets them. *Handled* is a flag that an implementation which dealt with the keystroke sets to **True**. *RetVal* corresponds to the HRESULT that the Windows method returns: `S_OK` (0) when the object used the keystroke and `S_FALSE` (1) when it did not.

## See Also

- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) interface -- the Windows interface this one corresponds to
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) interface -- Visual Basic-style versions of three **IPerPropertyBrowsing** methods
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
