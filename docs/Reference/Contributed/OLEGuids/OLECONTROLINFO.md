---
title: OLECONTROLINFO
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLECONTROLINFO
has_toc: false
---

# OLECONTROLINFO type
{: .no_toc }

<!-- test: TypeLayoutTests.OLECONTROLINFO_HasTheLayoutOfControlinfo -->
The keyboard mnemonic table of an OLE control, with the layout of the Windows `CONTROLINFO` structure.

**OLECONTROLINFO** is a user-defined type declared in the package's `OLEGuids` module, so both `OLECONTROLINFO` and `OLEGuids.OLECONTROLINFO` name it. It mirrors the Windows structure [CONTROLINFO](https://learn.microsoft.com/en-us/windows/win32/api/ocidl/ns-ocidl-controlinfo).
<!-- /test -->

```tb inert=signature
Public Type OLECONTROLINFO
    cb As Long
    hAccel As LongPtr
    cAccel As Integer
    dwFlags As Long
End Type
```

## Fields

*cb*
: A **Long** holding the size of the structure, in bytes. The caller sets it before the call that fills the structure.

*hAccel*
: A **LongPtr** holding the handle of an accelerator table that holds the control's mnemonics.

*cAccel*
: An **Integer** holding the number of entries in the accelerator table.

*dwFlags*
: A **Long** holding flags that describe the control's keyboard behavior: 1 when the control processes the Enter key in a dialog box (`CTRLINFO_EATS_RETURN`), and 2 when it processes the Esc key (`CTRLINFO_EATS_ESCAPE`).

## Where it is used

- [**IOleControl.GetControlInfo**](IOleControl#getcontrolinfo) -- takes it by reference as *pCI*.
- [**IOleControlVB.GetControlInfo**](IOleControlVB#getcontrolinfo) -- takes the three last fields as separate parameters: *AccelCount* for *cAccel*, *AccelTable* for *hAccel* and *Flags* for *dwFlags*.
- [**IOleControlSite.OnControlInfoChanged**](IOleControlSite#oncontrolinfochanged) -- tells the container that the information changed.

## See Also

- [IOleControl](IOleControl) interface -- keyboard mnemonics, ambient property changes and event freezing of a control
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
