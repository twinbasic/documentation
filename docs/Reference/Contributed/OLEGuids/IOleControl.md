---
title: IOleControl
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleControl
has_toc: false
---

# IOleControl interface
{: .no_toc }

Lets a container ask an OLE control for its keyboard mnemonics, and tell the control about changes to the container's ambient properties and about frozen events.

**IOleControl** has the interface identifier `B196B288-BAB4-101A-B69C-00AA00341D07` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleControl](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/nn-ocidl-iolecontrol).

The declaration is complete: it has all four methods of the Windows interface. **GetControlInfo** and **OnMnemonic** are marked `[PreserveSig]`, so a class cannot implement this interface; it is for calling. [IOleControlVB](IOleControlVB) declares the same two methods in a form a class can implement. **OnAmbientPropertyChange** and **FreezeEvents** hide the HRESULT: a failure code raises a run-time error.

## Methods

### GetControlInfo

```tb inert=signature
[PreserveSig]
Function GetControlInfo(ByRef pCI As OLECONTROLINFO) As Long
```

Fills *pCI* with the control's keyboard mnemonics and keyboard behavior. The caller sets the structure's `cb` field to its size before the call. The result is the raw HRESULT; a control that has no mnemonics returns `E_NOTIMPL` (`&H80004001`).

### OnMnemonic

```tb inert=signature
[PreserveSig]
Function OnMnemonic(ByRef pMsg As OLEACCELMSG) As Long
```

Tells the control that the user pressed one of the mnemonic keys it listed in **GetControlInfo**. *pMsg* holds the keystroke message. The result is the raw HRESULT.

### OnAmbientPropertyChange

```tb inert=signature
Sub OnAmbientPropertyChange(ByVal DispID As Long)
```

Tells the control that an ambient property of the container changed. *DispID* is the dispatch identifier of the property, or -1 (`DISPID_UNKNOWN`) when more than one property changed.

### FreezeEvents

```tb inert=signature
Sub FreezeEvents(ByVal bFreeze As Long)
```

Tells the control to stop firing events, when *bFreeze* is not 0, or to resume, when it is 0.

## See Also

- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style versions of **GetControlInfo** and **OnMnemonic**
- [IOleControlSite](IOleControlSite) interface -- the container-side site of a control
- [OLECONTROLINFO](OLECONTROLINFO) type -- the keyboard mnemonic table of a control
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
