---
title: ShowHatching
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/ShowHatching
---
# ShowHatching
{: .no_toc }

Returns whether the container would like the control to draw a selection hatching pattern, as a **Boolean**. Read-only.

Syntax: *object*.**ShowHatching**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

Selection hatching is the diagonal cross-hatch the IDE draws over an inactive embedded object to make clear it is selected but not yet activated for editing. A control that paints its own selection feedback should overlay a hatching pattern when this property is **True**. As with [**ShowGrabHandles**](ShowGrabHandles), the property is generally only meaningful while [**UserMode**](UserMode) is **False**.

### Example

This example responds to a **ShowHatching** change and repaints the control to show or hide the selection overlay.

```tb
Private Sub UserControl_AmbientChanged(PropertyName As String)
    Select Case PropertyName
        Case "ShowHatching"
            UserControl.Refresh    ' repaint to show or hide the hatching overlay
    End Select
End Sub
```

### See Also

- [ShowGrabHandles](ShowGrabHandles) property
- [UserMode](UserMode) property
- [DisplayAsDefault](DisplayAsDefault) property
