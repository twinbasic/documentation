---
title: DisplayAsDefault
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/DisplayAsDefault
---
# DisplayAsDefault
{: .no_toc }

Returns whether the container is treating this control as its default control, as a **Boolean**. Read-only.

Syntax: *object*.**DisplayAsDefault**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The default control on a form is the one activated when the user presses **Enter** without first giving focus to another control --- most often a command button. A control that wants to advertise its default-button status should paint itself with the heavier border or other distinguishing visual when **DisplayAsDefault** is **True**.

### Example

This example responds to a **DisplayAsDefault** change and triggers a repaint to update the button border.

```tb
Private Sub UserControl_AmbientChanged(PropertyName As String)
    Select Case PropertyName
        Case "DisplayAsDefault"
            UserControl.Refresh    ' repaint to show or remove the default-button border
    End Select
End Sub
```

### See Also

- [ShowGrabHandles](ShowGrabHandles) property
- [ShowHatching](ShowHatching) property
- [SupportsMnemonics](SupportsMnemonics) property
