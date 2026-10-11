---
title: OLEACCELMSG
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/OLEACCELMSG
has_toc: false
---

# OLEACCELMSG type
{: .no_toc }

A window message, with the layout of the Windows `MSG` structure.

**OLEACCELMSG** is a user-defined type declared in the package's `OLEGuids` module, so both `OLEACCELMSG` and `OLEGuids.OLEACCELMSG` name it. It mirrors the Windows structure [MSG](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-msg).
```tb inert=signature
Public Type OLEACCELMSG
    hWnd As LongPtr
    Message As Long
    wParam As LongPtr
    lParam As LongPtr
    Time As Long
    PT As OLEPOINT
End Type
```

## Fields

*hWnd*
: A **LongPtr** holding the handle of the window that receives the message.

*Message*
: A **Long** holding the message identifier, such as `WM_KEYDOWN`.

*wParam*
: A **LongPtr** holding additional message information. Its meaning depends on *Message*.

*lParam*
: A **LongPtr** holding additional message information. Its meaning depends on *Message*.

*Time*
: A **Long** holding the time at which the message was posted.

*PT*
: An [OLEPOINT](OLEPOINT) holding the position of the cursor, in screen coordinates, when the message was posted.

## Where it is used

- [**IOleControl.OnMnemonic**](IOleControl#onmnemonic) -- takes it by reference as *pMsg*.
- Methods that take a `MSG*` declare the parameter as a **LongPtr**, and the address of an **OLEACCELMSG** variable fits it: [**IOleObject.DoVerb**](IOleObject#doverb) (*lpMsg*), [**IOleControlSite.TranslateAccelerator**](IOleControlSite#translateaccelerator) (*lpMsg*) and [**IOleInPlaceActiveObject.TranslateAccelerator**](IOleInPlaceActiveObject#translateaccelerator) (*lpMsg*).

## See Also

- [OLEPOINT](OLEPOINT) type -- a point
- [IOleControl](IOleControl) interface -- keyboard mnemonics, ambient property changes and event freezing of a control
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
