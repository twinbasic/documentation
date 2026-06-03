---
title: Palette
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/Palette
---
# Palette
{: .no_toc }

Returns the colour palette the container would like its embedded controls to draw with, as an **stdole.IPictureDisp**. Read-only.

Syntax: *object*.**Palette**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The returned object is a picture whose attached palette identifies the colours the host expects to be available. A control rendering on a palette-managed display should use these colours to avoid unwanted palette flashing when its window receives the focus. On modern true-colour displays the palette is rarely meaningful, and most controls can ignore it.

### Example

This example responds to an ambient **Palette** change by triggering a repaint.

```tb
Private Sub UserControl_AmbientChanged(PropertyName As String)
    Select Case PropertyName
        Case "Palette"
            UserControl.Refresh    ' repaint using the updated palette
    End Select
End Sub
```

### See Also

- [BackColor](BackColor) property
- [ForeColor](ForeColor) property
