---
title: IOleControlVB
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleControlVB
has_toc: false
---

# IOleControlVB interface
{: .no_toc }

Visual Basic-style versions of the **IOleControl** methods **GetControlInfo** and **OnMnemonic**, which a class can implement.

**IOleControlVB** is not a Windows interface. It has the interface identifier `C895C8F9-6564-4123-8760-529F72AB9322` and extends **stdole.IDispatch**. It is not declared `[OleAutomation(False)]`, as the package's Windows interfaces are. Its two methods have the dispatch identifiers 1 and 2 (`[DispId(1)]` and `[DispId(2)]`).

It exists because [**IOleControl**](IOleControl) has `[PreserveSig]` members, which a twinBASIC class cannot implement. Each method here is a **Sub** that corresponds to one of those two methods, with signature types that Visual Basic code uses. The other two methods of **IOleControl**, **OnAmbientPropertyChange** and **FreezeEvents**, have no counterpart.

*Handled* is the first parameter of both methods. It is passed by reference, and it is a flag that an implementation which dealt with the call sets to **True**.

## Methods

### GetControlInfo

```tb inert=signature
[DispId(1)]
Sub GetControlInfo(ByRef Handled As Boolean, ByRef AccelCount As Integer, ByRef AccelTable As LongPtr, ByRef Flags As Long)
```

Reports the control's keyboard mnemonics. The three parameters after *Handled* are the fields of the [OLECONTROLINFO](OLECONTROLINFO) structure that the Windows method fills in: *AccelCount* is `cAccel`, *AccelTable* is `hAccel` and *Flags* is `dwFlags`.

### OnMnemonic

```tb inert=signature
[DispId(2)]
Sub OnMnemonic(ByRef Handled As Boolean, ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr, ByVal Shift As Long)
```

Tells the control that the user pressed one of its mnemonic keys. The Windows method receives a pointer to the keystroke message, an [OLEACCELMSG](OLEACCELMSG); this one receives the fields of the message as separate parameters: the window handle *hWnd*, the message number *wMsg*, and *wParam* and *lParam*. *Shift* is passed in addition to them.

## See Also

- [IOleControl](IOleControl) interface -- the Windows interface this one corresponds to
- [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) interface -- Visual Basic-style **TranslateAccelerator**
- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) interface -- Visual Basic-style versions of three **IPerPropertyBrowsing** methods
- [IOleInPlaceObjectWindowlessVB](IOleInPlaceObjectWindowlessVB) interface -- Visual Basic-style **OnWindowMessage**
- [OLECONTROLINFO](OLECONTROLINFO) type -- the keyboard mnemonic table of a control
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
