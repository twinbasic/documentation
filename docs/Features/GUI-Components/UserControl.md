---
title: UserControl Enhancements
parent: GUI Components
nav_order: 7
permalink: /Features/GUI-Components/UserControl
---

# UserControl Enhancements

The UserControl object now provides new features for better control handling.

## PreKeyEvents Property

The UserControl object now provides the new Boolean property `PreKeyEvents` that enables corresponding new events `PreKeyDown` and `PreKeyUp`. These allow handling special keys like tab, arrows, etc without OS or COM hooks (for example, based on the `IOleInPlaceActiveObject` interface).

These work with all child windows inside the UserControl, including ones created by `CreateWindowEx`.

## Access to Raw Message Data

You can access raw message data in the `PreKeyDown`/`PreKeyUp` event handlers with the new `PreKeyWParam`/`PreKeyLParam` and `PreKeyTargetHwnd` UserControl properties.

## Example

```tb
Private Sub UserControl_Initialize()
    PreKeyEvents = True
End Sub

Private Sub UserControl_PreKeyDown(KeyCode As Integer, Shift As Integer)
    If KeyCode = vbKeyTab Then
        Debug.Print "Tab intercepted; lParam=" & CStr(PreKeyLParam)
    End If
End Sub
```
