---
title: OLEContainerConstants
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/OLEContainerConstants
---
# OLEContainerConstants
{: .no_toc }

A combined enumeration containing every option value used by the **OLE** container control. Each logical group of values has a more specific enumeration of its own — see the See Also section — but **OLEContainerConstants** retains all of the original VB6 names so existing code continues to compile.

## OLE type

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLELinked**{: #vbOLELinked } | 0 | The object is linked to its source. |
| **vbOLEEmbedded**{: #vbOLEEmbedded } | 1 | The object is embedded inside the container. |
| **vbOLEEither**{: #vbOLEEither } | 2 | Either linked or embedded. |
| **vbOLENone**{: #vbOLENone } | 3 | No object. |

## Update options

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEAutomatic**{: #vbOLEAutomatic } | 0 | The container updates the linked object whenever the source changes. |
| **vbOLEFrozen**{: #vbOLEFrozen } | 1 | Updates are paused. |
| **vbOLEManual**{: #vbOLEManual } | 2 | Updates happen only when **Update** is called. |

## Activation triggers

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEActivateManual**{: #vbOLEActivateManual } | 0 | Manual activation via **DoVerb**. |
| **vbOLEActivateGetFocus**{: #vbOLEActivateGetFocus } | 1 | Activate on focus. |
| **vbOLEActivateDoubleclick**{: #vbOLEActivateDoubleclick } | 2 | Activate on double-click. |
| **vbOLEActivateAuto**{: #vbOLEActivateAuto } | 3 | Activate automatically based on the object's defaults. |

## Sizing

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLESizeClip**{: #vbOLESizeClip } | 0 | The object is clipped at the container's edges. |
| **vbOLESizeStretch**{: #vbOLESizeStretch } | 1 | The object is stretched to fill the container. |
| **vbOLESizeAutoSize**{: #vbOLESizeAutoSize } | 2 | The container resizes itself to fit the object. |
| **vbOLESizeZoom**{: #vbOLESizeZoom } | 3 | The object is scaled to fit, preserving its aspect ratio. |

## Display style

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEDisplayContent**{: #vbOLEDisplayContent } | 0 | The object's contents are displayed. |
| **vbOLEDisplayIcon**{: #vbOLEDisplayIcon } | 1 | The object is displayed as an icon. |

## Status

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEChanged**{: #vbOLEChanged } | 0 | The object has been changed since the last update. |
| **vbOLESaved**{: #vbOLESaved } | 1 | The object has been saved. |
| **vbOLEClosed**{: #vbOLEClosed } | 2 | The object has been closed. |
| **vbOLERenamed**{: #vbOLERenamed } | 3 | The object has been renamed. |

## Verbs

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEPrimary**{: #vbOLEPrimary } | 0 | Invoke the object's primary verb. |
| **vbOLEShow**{: #vbOLEShow } | -1 | Show the object. |
| **vbOLEOpen**{: #vbOLEOpen } | -2 | Open the object in a separate window. |
| **vbOLEHide**{: #vbOLEHide } | -3 | Hide the object. |
| **vbOLEUIActivate**{: #vbOLEUIActivate } | -4 | Activate the object's user interface. |
| **vbOLEInPlaceActivate**{: #vbOLEInPlaceActivate } | -5 | Activate the object in place. |
| **vbOLEDiscardUndoState**{: #vbOLEDiscardUndoState } | -6 | Discard any undo state the object holds. |

## Menu flags

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEFlagGrayed**{: #vbOLEFlagGrayed } | 1 | The verb appears grayed in the menu. |
| **vbOLEFlagDisabled**{: #vbOLEFlagDisabled } | 2 | The verb is disabled. |
| **vbOLEFlagChecked**{: #vbOLEFlagChecked } | 8 | The verb appears with a check mark. |
| **vbOLEFlagSeparator**{: #vbOLEFlagSeparator } | 2048 | The item is rendered as a menu separator. |

## Miscellaneous

| Constant | Value | Description |
|----------|-------|-------------|
| **vbOLEMiscFlagMemStorage**{: #vbOLEMiscFlagMemStorage } | 1 | The object's storage is held in memory rather than on disk. |
| **vbOLEMiscFlagDisableInPlace**{: #vbOLEMiscFlagDisableInPlace } | 2 | In-place activation is disabled for this object. |

### See Also

- [OLEContainerActivateConstants](OLEContainerActivateConstants)
- [OLEContainerDisplayTypeConstants](OLEContainerDisplayTypeConstants)
- [OLEContainerSizeModeConstants](OLEContainerSizeModeConstants)
- [OLEContainerTypesAllowedConstants](OLEContainerTypesAllowedConstants)
- [OLEContainerUpdateOptionsConstants](OLEContainerUpdateOptionsConstants)
