---
title: BackColor
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/BackColor
---
# BackColor
{: .no_toc }

Returns the background colour the container would like its embedded controls to use by default, as an **stdole.OLE_COLOR**. Read-only.

Syntax: *object*.**BackColor**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

A control that does not have its own background colour explicitly set should paint its background using this colour, so that it blends in with the surrounding container. The value is an **OLE_COLOR**: an RGB value, a system-colour reference, or a palette-index reference. Pass it through [**TranslateColor**](../../../Modules/Information/TranslateColor) to obtain a plain RGB value if needed.

### Example

This example responds to an ambient **BackColor** change and applies it to the control's background.

```tb
Private Sub UserControl_AmbientChanged(PropertyName As String)
    Select Case PropertyName
        Case "BackColor"
            UserControl.BackColor = Ambient.BackColor
    End Select
End Sub
```

### See Also

- [ForeColor](ForeColor) property
- [Font](Font) property
- [Palette](Palette) property
