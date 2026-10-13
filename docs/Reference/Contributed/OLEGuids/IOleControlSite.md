---
title: IOleControlSite
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleControlSite
has_toc: false
---

# IOleControlSite interface
{: .no_toc }

The container-side site of an OLE control: lets a control tell its container about focus, unused keystrokes and changes to its keyboard information, and ask the container to convert coordinates.

**IOleControlSite** has the interface identifier `B196B289-BAB4-101A-B69C-00AA00341D07` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleControlSite](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nn-ocidl-iolecontrolsite).

The declaration is complete: it has all seven methods of the Windows interface. **TranslateAccelerator** is marked `[PreserveSig]`, so a class cannot implement this interface; it is for calling. The other six hide the HRESULT: a failure code raises a run-time error.

## Methods

### OnControlInfoChanged

```tb inert=signature
Sub OnControlInfoChanged()
```

Tells the container that the control's [OLECONTROLINFO](OLECONTROLINFO) changed. The container then calls [**IOleControl.GetControlInfo**](IOleControl#getcontrolinfo) again.

### LockInPlaceActive

```tb inert=signature
Sub LockInPlaceActive(ByVal fLock As Long)
```

Asks the container to keep the control active in place, when *fLock* is not 0, or to stop keeping it, when it is 0.

### GetExtendedControl

```tb inert=signature
Function GetExtendedControl() As stdole.IDispatch
```

Returns the container's extended control: the object that holds the properties and methods the container maintains for the control, and that the control could not reach otherwise. The result is a **stdole.IDispatch**, so a call through it is late-bound by name. To call the four methods of **IDispatch** on it, assign it to an [IDispatchUnrestricted](IDispatchUnrestricted) variable. The Windows method returns it through an output parameter.

### TransformCoords

```tb inert=signature
Sub TransformCoords(ByVal pPtlHimetric As LongPtr, ByVal pPtfContainer As LongPtr, ByVal dwFlags As Long)
```

Converts a position or a size between HIMETRIC units (hundredths of a millimeter) and the container's own units. *pPtlHimetric* points to a `POINTL`, two **Long** values with the layout of an [OLEPOINT](OLEPOINT), and *pPtfContainer* to a `POINTF`, two **Single** values. One structure is read and the other is written, according to the direction. *dwFlags* combines two choices:

- what is converted: 1 for a position (`XFORMCOORDS_POSITION`) or 2 for a size (`XFORMCOORDS_SIZE`);
- which way: 4 for HIMETRIC to the container's units (`XFORMCOORDS_HIMETRICTOCONTAINER`) or 8 for the container's units to HIMETRIC (`XFORMCOORDS_CONTAINERTOHIMETRIC`).

### TranslateAccelerator

```tb inert=signature
[PreserveSig]
Function TranslateAccelerator(ByVal lpMsg As LongPtr, ByVal grfModifiers As Long) As Long
```

Passes a keystroke that the control did not use to the container. *lpMsg* points to the `MSG` of the keystroke, such as the address of an [OLEACCELMSG](OLEACCELMSG). *grfModifiers* holds the state of the modifier keys: 1 for Shift, 2 for Ctrl and 4 for Alt (`KEYMOD_SHIFT`, `KEYMOD_CONTROL`, `KEYMOD_ALT`). The result is the raw HRESULT: `S_OK` (0) when the container used the keystroke, and `S_FALSE` (1) when it did not.

### OnFocus

```tb inert=signature
Sub OnFocus(ByVal fGotFocus As Long)
```

Tells the container that the control gained the focus, when *fGotFocus* is not 0, or lost it, when it is 0.

### ShowPropertyFrame

```tb inert=signature
Sub ShowPropertyFrame()
```

Asks the container to show the control's property pages itself, so that they can work with the container's extended control. A container that does not need to returns `E_NOTIMPL`, which raises a run-time error, and the control then shows the pages directly.

## See Also

- [IOleControl](IOleControl) interface -- the control's side
- [IDispatchUnrestricted](IDispatchUnrestricted) interface -- finds and calls members of an automation object by name or dispatch identifier
- [OLECONTROLINFO](OLECONTROLINFO) type -- the keyboard mnemonic table of a control
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
- [OLEPOINT](OLEPOINT) type -- a point
