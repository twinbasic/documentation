---
title: ScaleUnits
parent: AmbientProperties
permalink: /tB/Packages/VBRUN/AmbientProperties/ScaleUnits
---
# ScaleUnits
{: .no_toc }

Returns a localised name for the unit of measure the container uses to size itself, as a **String**. Read-only.

Syntax: *object*.**ScaleUnits**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

Common values include `"Twip"`, `"Pixel"`, `"Inch"`, `"Centimeter"`, `"Millimeter"`, `"Point"`, and `"Character"`, but the container is free to return any string and to localise it for the current language. The value is a hint for display purposes --- for example, in a status bar or a property sheet --- and not a fixed enumeration that should be parsed.

### Example

This example responds to a **ScaleUnits** change and updates a label in the control's property sheet.

```tb
Private Sub UserControl_AmbientChanged(PropertyName As String)
    Select Case PropertyName
        Case "ScaleUnits"
            lblUnits.Caption = Ambient.ScaleUnits
    End Select
End Sub
```

### See Also

- [LocaleID](LocaleID) property
- [TextAlign](TextAlign) property
