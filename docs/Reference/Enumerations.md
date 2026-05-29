---
title: Enumerations
parent: Reference Section
nav_order: 9
has_toc: false
permalink: /Reference/Enumerations
---

# Enumerations

An *enumeration* defines a named set of integer constants. Passing an enum member instead of a bare integer makes call sites self-documenting and allows the IDE to offer completion for the valid values. Each built-in package groups its enumerations under a dedicated sub-folder; this page indexes all of them.

The sections below list enumerations [by package](#by-package), followed by an [alphabetical index](#alphabetical-index).

---

## By package

### VBA Package

Fifteen enumerations covering window styles, comparison modes, message-box options, variable types, date and time constants, file attributes, and more.

- [**VbAppWinStyle**](../tB/Modules/Constants/VbAppWinStyle) -- window-style values for the *windowstyle* argument of [**Shell**](../tB/Modules/Interaction/Shell)
- [**VbArchitecture**](../tB/Modules/Constants/VbArchitecture) -- processor-architecture values returned by [**ProcessorArchitecture**](../tB/Modules/Compilation/ProcessorArchitecture)
- [**VbCalendar**](../tB/Modules/Constants/VbCalendar) -- calendar-type values for the [**Calendar**](../tB/Core/Calendar) property
- [**VbCallType**](../tB/Modules/Constants/VbCallType) -- procedure-call type flags for **CallByName**
- [**VbCompareMethod**](../tB/Modules/Constants/VbCompareMethod) -- text-comparison modes for [**InStr**](../tB/Modules/Strings/InStr), [**Replace**](../tB/Modules/Strings/Replace), [**Split**](../tB/Modules/Strings/Split), and similar
- [**VbDateTimeFormat**](../tB/Modules/Constants/VbDateTimeFormat) -- format codes for [**FormatDateTime**](../tB/Modules/Strings/FormatDateTime)
- [**VbDayOfWeek**](../tB/Modules/Constants/VbDayOfWeek) -- day-of-week constants for [**DateAdd**](../tB/Modules/DateTime/DateAdd), [**DateDiff**](../tB/Modules/DateTime/DateDiff), [**Weekday**](../tB/Modules/DateTime/Weekday), and similar
- [**VbFileAttribute**](../tB/Modules/Constants/VbFileAttribute) -- attribute flags for [**Dir**](../tB/Modules/FileSystem/Dir), [**GetAttr**](../tB/Modules/FileSystem/GetAttr), and [**SetAttr**](../tB/Modules/FileSystem/SetAttr)
- [**VbFirstWeekOfYear**](../tB/Modules/Constants/VbFirstWeekOfYear) -- first-week-of-year selectors for [**DateDiff**](../tB/Modules/DateTime/DateDiff), [**DatePart**](../tB/Modules/DateTime/DatePart), and [**Weekday**](../tB/Modules/DateTime/Weekday)
- [**VbIMEStatus**](../tB/Modules/Constants/VbIMEStatus) -- Input Method Editor mode constants
- [**VbMsgBoxResult**](../tB/Modules/Constants/VbMsgBoxResult) -- identifies the button clicked in a [**MsgBox**](../tB/Modules/Interaction/MsgBox) dialog
- [**VbMsgBoxStyle**](../tB/Modules/Constants/VbMsgBoxStyle) -- buttons, icons, modality, and other flags for [**MsgBox**](../tB/Modules/Interaction/MsgBox)
- [**VbStrConv**](../tB/Modules/Constants/VbStrConv) -- conversion-type flags for [**StrConv**](../tB/Modules/Strings/StrConv)
- [**VbTriState**](../tB/Modules/Constants/VbTriState) -- three-state values for formatting functions such as [**FormatNumber**](../tB/Modules/Strings/FormatNumber) and [**FormatCurrency**](../tB/Modules/Strings/FormatCurrency)
- [**VbVarType**](../tB/Modules/Constants/VbVarType) -- Variant subtype codes returned by [**VarType**](../tB/Modules/Information/VarType)

### VBRUN Package

Eighty-six enumerations covering every aspect of classic VB6 controls and forms --- alignment, border styles, colours, drag-and-drop, OLE container options, printer settings, window states, and more.

- [**AlignConstants**](../tB/Packages/VBRUN/Constants/AlignConstants) -- **Align** property values for picture boxes, toolbars, and data controls
- [**AlignmentConstants**](../tB/Packages/VBRUN/Constants/AlignmentConstants) -- text alignment for label, text-box, and option-button controls
- [**AlignmentConstantsNoCenter**](../tB/Packages/VBRUN/Constants/AlignmentConstantsNoCenter) -- left/right alignment values where centre is not available
- [**AppearanceConstants**](../tB/Packages/VBRUN/Constants/AppearanceConstants) -- drawing style for the **Appearance** property
- [**ApplicationStartConstants**](../tB/Packages/VBRUN/Constants/ApplicationStartConstants) -- standalone vs. Automation-invoked start-up mode
- [**AspectTypeConstants**](../tB/Packages/VBRUN/Constants/AspectTypeConstants) -- OLE rendering aspect identifiers for **DataObjectFormat**
- [**AsyncReadConstants**](../tB/Packages/VBRUN/Constants/AsyncReadConstants) -- flags for the *AsyncReadOptions* argument of **UserControl.AsyncRead**
- [**AsyncStatusCodeConstants**](../tB/Packages/VBRUN/Constants/AsyncStatusCodeConstants) -- status codes reported during **AsyncReadProgress**
- [**AsyncTypeConstants**](../tB/Packages/VBRUN/Constants/AsyncTypeConstants) -- data kind delivered by **UserControl.AsyncRead**
- [**BackFillStyleConstants**](../tB/Packages/VBRUN/Constants/BackFillStyleConstants) -- opaque vs. transparent background fill
- [**BorderStyleConstants**](../tB/Packages/VBRUN/Constants/BorderStyleConstants) -- line style for the **BorderStyle** property of Shape and Line controls
- [**ButtonConstants**](../tB/Packages/VBRUN/Constants/ButtonConstants) -- style for command buttons with optional image-based appearance
- [**CheckBoxConstants**](../tB/Packages/VBRUN/Constants/CheckBoxConstants) -- state values for the check-box **Value** property
- [**ClipboardConstants**](../tB/Packages/VBRUN/Constants/ClipboardConstants) -- clipboard format identifiers for **DataObject** and **Clipboard**
- [**ColorConstants**](../tB/Packages/VBRUN/Constants/ColorConstants) -- common named RGB colours
- [**ComboBoxConstants**](../tB/Packages/VBRUN/Constants/ComboBoxConstants) -- style values for the combo-box **Style** property
- [**ControlBorderStyleConstants**](../tB/Packages/VBRUN/Constants/ControlBorderStyleConstants) -- border style for text boxes, picture boxes, and labels
- [**ControlBorderStyleConstantsCustom**](../tB/Packages/VBRUN/Constants/ControlBorderStyleConstantsCustom) -- extended border style including custom-drawn borders
- [**ControlTypeConstants**](../tB/Packages/VBRUN/Constants/ControlTypeConstants) -- identifiers for standard intrinsic control types
- [**DatabaseTypeConstants**](../tB/Packages/VBRUN/Constants/DatabaseTypeConstants) -- database engine for the **DefaultType** property of a Data control
- [**DataBOFconstants**](../tB/Packages/VBRUN/Constants/DataBOFconstants) -- action when the user moves past the start of a recordset
- [**DataEOFConstants**](../tB/Packages/VBRUN/Constants/DataEOFConstants) -- action when the user moves past the end of a recordset
- [**DataErrorConstants**](../tB/Packages/VBRUN/Constants/DataErrorConstants) -- response values for the Data control's **Error** event
- [**DataValidateConstants**](../tB/Packages/VBRUN/Constants/DataValidateConstants) -- action codes in the **Validate** event
- [**DefaultCursorTypeConstants**](../tB/Packages/VBRUN/Constants/DefaultCursorTypeConstants) -- cursor-driver for the Data control's connection
- [**DockModeConstants**](../tB/Packages/VBRUN/Constants/DockModeConstants) -- dock-edge values for forms and toolbars
- [**DragConstants**](../tB/Packages/VBRUN/Constants/DragConstants) -- action values for the **Drag** method
- [**DragModeConstants**](../tB/Packages/VBRUN/Constants/DragModeConstants) -- automatic vs. manual drag-mode for controls
- [**DragOverConstants**](../tB/Packages/VBRUN/Constants/DragOverConstants) -- state values in the **DragOver** event
- [**DrawModeConstants**](../tB/Packages/VBRUN/Constants/DrawModeConstants) -- GDI raster-operation values for the **DrawMode** property
- [**DrawStyleConstants**](../tB/Packages/VBRUN/Constants/DrawStyleConstants) -- line style for the **DrawStyle** property
- [**FillStyleConstants**](../tB/Packages/VBRUN/Constants/FillStyleConstants) -- fill pattern for the **FillStyle** property
- [**FillStyleConstantsEx**](../tB/Packages/VBRUN/Constants/FillStyleConstantsEx) -- extended fill patterns including gradient fills
- [**FormArrangeConstants**](../tB/Packages/VBRUN/Constants/FormArrangeConstants) -- arrangement modes for the MDI **Arrange** method
- [**FormBorderStyleConstants**](../tB/Packages/VBRUN/Constants/FormBorderStyleConstants) -- border and frame style for the form's **BorderStyle** property
- [**FormShowConstants**](../tB/Packages/VBRUN/Constants/FormShowConstants) -- modality values for the *Modal* argument of **Show**
- [**FormWindowStateConstants**](../tB/Packages/VBRUN/Constants/FormWindowStateConstants) -- window-state values for a form's **WindowState** property
- [**HitResultConstants**](../tB/Packages/VBRUN/Constants/HitResultConstants) -- return values from a **UserControl**'s **HitTest** event
- [**KeyCodeConstants**](../tB/Packages/VBRUN/Constants/KeyCodeConstants) -- virtual-key codes for **KeyDown** and **KeyUp** events
- [**LinkModeConstants**](../tB/Packages/VBRUN/Constants/LinkModeConstants) -- DDE link-mode values for the **LinkMode** property
- [**ListBoxConstants**](../tB/Packages/VBRUN/Constants/ListBoxConstants) -- style values for the list-box **Style** property
- [**LoadPictureColorConstants**](../tB/Packages/VBRUN/Constants/LoadPictureColorConstants) -- colour depth for **LoadPicture**
- [**LoadPictureSizeConstants**](../tB/Packages/VBRUN/Constants/LoadPictureSizeConstants) -- size selector for **LoadPicture**
- [**LoadResConstants**](../tB/Packages/VBRUN/Constants/LoadResConstants) -- resource-type values for **LoadResPicture**
- [**LogEventTypeConstants**](../tB/Packages/VBRUN/Constants/LogEventTypeConstants) -- severity values for **LogEvent**
- [**LogModeConstants**](../tB/Packages/VBRUN/Constants/LogModeConstants) -- destination and behaviour flags for **App.StartLogging**
- [**MenuAccelConstants**](../tB/Packages/VBRUN/Constants/MenuAccelConstants) -- keyboard-accelerator codes for menu-item shortcuts
- [**MenuControlConstants**](../tB/Packages/VBRUN/Constants/MenuControlConstants) -- alignment and trigger-button flags for **PopupMenu**
- [**MouseButtonConstants**](../tB/Packages/VBRUN/Constants/MouseButtonConstants) -- bit flags for the *Button* argument of mouse events
- [**MousePointerConstants**](../tB/Packages/VBRUN/Constants/MousePointerConstants) -- cursor-shape values for the **MousePointer** property
- [**MultiSelectConstants**](../tB/Packages/VBRUN/Constants/MultiSelectConstants) -- multi-selection mode for the list-box **MultiSelect** property
- [**NegotiatePositionConstants**](../tB/Packages/VBRUN/Constants/NegotiatePositionConstants) -- menu placement during OLE in-place activation
- [**OldLinkModeConstants**](../tB/Packages/VBRUN/Constants/OldLinkModeConstants) -- legacy DDE link-mode values retained for compatibility
- [**OLEContainerActivateConstants**](../tB/Packages/VBRUN/Constants/OLEContainerActivateConstants) -- activation trigger for the **AutoActivate** property
- [**OLEContainerConstants**](../tB/Packages/VBRUN/Constants/OLEContainerConstants) -- combined enumeration of all OLE container option values
- [**OLEContainerDisplayTypeConstants**](../tB/Packages/VBRUN/Constants/OLEContainerDisplayTypeConstants) -- display style for the OLE container **DisplayType** property
- [**OLEContainerSizeModeConstants**](../tB/Packages/VBRUN/Constants/OLEContainerSizeModeConstants) -- sizing rules for the OLE container **SizeMode** property
- [**OLEContainerTypesAllowedConstants**](../tB/Packages/VBRUN/Constants/OLEContainerTypesAllowedConstants) -- object-type filter for **OLETypeAllowed**
- [**OLEContainerUpdateOptionsConstants**](../tB/Packages/VBRUN/Constants/OLEContainerUpdateOptionsConstants) -- update mode for a linked OLE object
- [**OLEDragConstants**](../tB/Packages/VBRUN/Constants/OLEDragConstants) -- OLE drag-mode values for **OLEDragMode**
- [**OLEDropConstants**](../tB/Packages/VBRUN/Constants/OLEDropConstants) -- OLE drop-mode values for **OLEDropMode**
- [**OLEDropEffectConstants**](../tB/Packages/VBRUN/Constants/OLEDropEffectConstants) -- bit flags for the *Effect* argument of OLE drag-and-drop events
- [**PaletteModeConstants**](../tB/Packages/VBRUN/Constants/PaletteModeConstants) -- palette-source values for forms and UserControls
- [**ParentControlsType**](../tB/Packages/VBRUN/Constants/ParentControlsType) -- wrapping mode for the **ParentControls** collection
- [**PictureTypeConstants**](../tB/Packages/VBRUN/Constants/PictureTypeConstants) -- subtype values for **stdole.IPictureDisp**
- [**PrinterObjectConstants**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants) -- combined enumeration of all **Printer** object option values
- [**PrinterObjectConstants_ColorMode**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_ColorMode) -- colour mode for **Printer.ColorMode**
- [**PrinterObjectConstants_Duplex**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_Duplex) -- duplex mode for **Printer.Duplex**
- [**PrinterObjectConstants_Orientation**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_Orientation) -- paper orientation for **Printer.Orientation**
- [**PrinterObjectConstants_PaperBin**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PaperBin) -- paper source for **Printer.PaperBin**
- [**PrinterObjectConstants_PaperSize**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PaperSize) -- paper size for **Printer.PaperSize**
- [**PrinterObjectConstants_PrintQuality**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PrintQuality) -- print quality for **Printer.PrintQuality**
- [**QueryUnloadConstants**](../tB/Packages/VBRUN/Constants/QueryUnloadConstants) -- reason codes for the form's **QueryUnload** event
- [**RasterOpConstants**](../tB/Packages/VBRUN/Constants/RasterOpConstants) -- GDI raster-operation codes for **PaintPicture**
- [**RecordsetTypeConstants**](../tB/Packages/VBRUN/Constants/RecordsetTypeConstants) -- recordset type for a Data control
- [**ScaleModeConstants**](../tB/Packages/VBRUN/Constants/ScaleModeConstants) -- measurement units for the **ScaleMode** property
- [**ScrollBarConstants**](../tB/Packages/VBRUN/Constants/ScrollBarConstants) -- which scrollbars appear on text-box and similar controls
- [**ShapeConstants**](../tB/Packages/VBRUN/Constants/ShapeConstants) -- geometric shape values for the Shape control's **Shape** property
- [**ShiftConstants**](../tB/Packages/VBRUN/Constants/ShiftConstants) -- modifier-key bit flags for mouse and key events
- [**ShortcutConstants**](../tB/Packages/VBRUN/Constants/ShortcutConstants) -- shortcut-key identifiers for menu items
- [**StartUpPositionConstants**](../tB/Packages/VBRUN/Constants/StartUpPositionConstants) -- initial position for a form's **StartUpPosition** property
- [**StorageTypeContants**](../tB/Packages/VBRUN/Constants/StorageTypeContants) -- OLE data-storage medium identifiers for **DataObjectFormat**
- [**SystemColorConstants**](../tB/Packages/VBRUN/Constants/SystemColorConstants) -- system-UI colour references (pass through **TranslateColor** for plain RGB)
- [**VariantTypeConstants**](../tB/Packages/VBRUN/Constants/VariantTypeConstants) -- legacy DAO field-type tags retained for compatibility
- [**VerticalAlignmentConstants**](../tB/Packages/VBRUN/Constants/VerticalAlignmentConstants) -- vertical text alignment for cell-style controls
- [**ZOrderConstants**](../tB/Packages/VBRUN/Constants/ZOrderConstants) -- position selectors for the **ZOrder** method

### WebView2 Package

Ten enumerations for navigation errors, permissions, download placement, script dialogs, print orientation, and resource-request filtering.

- [**wv2DefaultDownloadCornerAlign**](../tB/Packages/WebView2/Enumerations/wv2DefaultDownloadCornerAlign) -- anchors the built-in download-progress dialog to a corner of the control
- [**wv2ErrorStatus**](../tB/Packages/WebView2/Enumerations/wv2ErrorStatus) -- reason a navigation failed (passed in the **NavigationComplete** event)
- [**wv2HostResourceAccessKind**](../tB/Packages/WebView2/Enumerations/wv2HostResourceAccessKind) -- cross-origin access policy for a virtual hostname mapping
- [**wv2KeyEventKind**](../tB/Packages/WebView2/Enumerations/wv2KeyEventKind) -- keyboard message kind in the **AcceleratorKeyPressed** event
- [**wv2PermissionKind**](../tB/Packages/WebView2/Enumerations/wv2PermissionKind) -- which device or browser capability a page is requesting
- [**wv2PermissionState**](../tB/Packages/WebView2/Enumerations/wv2PermissionState) -- the host's decision on a permission request
- [**wv2PrintOrientation**](../tB/Packages/WebView2/Enumerations/wv2PrintOrientation) -- page orientation for **PrintToPdf**
- [**wv2ProcessFailedKind**](../tB/Packages/WebView2/Enumerations/wv2ProcessFailedKind) -- identifies which WebView2 process failed
- [**wv2ScriptDialogKind**](../tB/Packages/WebView2/Enumerations/wv2ScriptDialogKind) -- which JavaScript dialog primitive the page is trying to open
- [**wv2WebResourceContext**](../tB/Packages/WebView2/Enumerations/wv2WebResourceContext) -- request kind matched by a web-resource filter

### CustomControls Package

Thirteen enumerations governing the appearance and behaviour of the `Waynes...` custom controls.

- [**BorderStyle**](../tB/Packages/CustomControls/Enumerations/BorderStyle) -- Win32 frame style for a **WaynesForm** window
- [**ColorRGBA**](../tB/Packages/CustomControls/Enumerations/ColorRGBA) -- 32-bit ABGR colour value type alias
- [**CornerShape**](../tB/Packages/CustomControls/Enumerations/CornerShape) -- shape of a single corner of a control (square, rounded, cut)
- [**Customtate**](../tB/Packages/CustomControls/Enumerations/Customtate) -- control state flags for custom-state painting
- [**DockMode**](../tB/Packages/CustomControls/Enumerations/DockMode) -- how a control is positioned relative to its container
- [**FillPattern**](../tB/Packages/CustomControls/Enumerations/FillPattern) -- how colour stops in a **Fill** are applied across the painted area
- [**FontWeight**](../tB/Packages/CustomControls/Enumerations/FontWeight) -- font weight on the standard 100--900 OpenType scale
- [**PixelCount**](../tB/Packages/CustomControls/Enumerations/PixelCount) -- pixel-measurement type alias used throughout the package
- [**PointSize**](../tB/Packages/CustomControls/Enumerations/PointSize) -- typographic-point font-size type alias
- [**StartupPosition**](../tB/Packages/CustomControls/Enumerations/StartupPosition) -- initial position of a **WaynesForm** window when first shown
- [**TextAlignment**](../tB/Packages/CustomControls/Enumerations/TextAlignment) -- horizontal and vertical text alignment within a control
- [**TextOverflowMode**](../tB/Packages/CustomControls/Enumerations/TextOverflowMode) -- how text that does not fit is truncated
- [**WindowState**](../tB/Packages/CustomControls/Enumerations/WindowState) -- minimized, restored, or maximized state of a **WaynesForm**

### CEF Package

Two enumerations for log verbosity and print orientation.

- [**CefLogSeverity**](../tB/Packages/CEF/Enumerations/CefLogSeverity) -- minimum severity at which the CEF runtime records messages to its debug log
- [**cefPrintOrientation**](../tB/Packages/CEF/Enumerations/cefPrintOrientation) -- page orientation for **PrintToPdf**

### WinServicesLib Package

Four enumerations covering service type, start mode, control codes, and runtime status.

- [**ServiceControlCodeConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceControlCodeConstants) -- control codes the SCM can deliver to a running service
- [**ServiceStartConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceStartConstants) -- when and how the SCM starts a service
- [**ServiceStatusConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceStatusConstants) -- runtime-state values a service reports to the SCM
- [**ServiceTypeConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceTypeConstants) -- Win32 service-type values (own process, shared host, kernel driver)

### WinNativeCommonCtls Package

Ten enumerations for the eight native common controls.

- [**DTPickerFormatConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/DTPickerFormatConstants) -- display format for a **DTPicker** control
- [**ImlDrawConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants) -- render-style flags for **ListImage.Draw**
- [**OrientationConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/OrientationConstants) -- horizontal / vertical orientation for **Slider** and **UpDown**
- [**TreeBorderStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeBorderStyleConstants) -- border style shared by **TreeView** and **ListView**
- [**TreeLabelEditConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLabelEditConstants) -- when inline label editing is triggered on a **TreeView**
- [**TreeLineStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLineStyleConstants) -- whether the **TreeView** draws lines from root nodes or only child nodes
- [**TreeRelationshipConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeRelationshipConstants) -- where a new node is inserted relative to an existing node
- [**TreeSortOrderConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortOrderConstants) -- ascending or descending sort order for **TreeView** and **Node**
- [**TreeSortTypeConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortTypeConstants) -- case-sensitive or case-insensitive sort comparison
- [**TreeStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeStyleConstants) -- composite visual style of a **TreeView** (buttons, lines, icons)

---

## Alphabetical index

**A**

- [**AlignConstants**](../tB/Packages/VBRUN/Constants/AlignConstants) -- **Align** property values (VBRUN)
- [**AlignmentConstants**](../tB/Packages/VBRUN/Constants/AlignmentConstants) -- text alignment for labels and text boxes (VBRUN)
- [**AlignmentConstantsNoCenter**](../tB/Packages/VBRUN/Constants/AlignmentConstantsNoCenter) -- left/right text alignment without centre (VBRUN)
- [**AppearanceConstants**](../tB/Packages/VBRUN/Constants/AppearanceConstants) -- drawing style for **Appearance** property (VBRUN)
- [**ApplicationStartConstants**](../tB/Packages/VBRUN/Constants/ApplicationStartConstants) -- standalone vs. Automation start mode (VBRUN)
- [**AspectTypeConstants**](../tB/Packages/VBRUN/Constants/AspectTypeConstants) -- OLE rendering aspect identifiers (VBRUN)
- [**AsyncReadConstants**](../tB/Packages/VBRUN/Constants/AsyncReadConstants) -- **UserControl.AsyncRead** option flags (VBRUN)
- [**AsyncStatusCodeConstants**](../tB/Packages/VBRUN/Constants/AsyncStatusCodeConstants) -- **AsyncReadProgress** status codes (VBRUN)
- [**AsyncTypeConstants**](../tB/Packages/VBRUN/Constants/AsyncTypeConstants) -- data kind from **UserControl.AsyncRead** (VBRUN)

**B**

- [**BackFillStyleConstants**](../tB/Packages/VBRUN/Constants/BackFillStyleConstants) -- opaque vs. transparent background (VBRUN)
- [**BorderStyle**](../tB/Packages/CustomControls/Enumerations/BorderStyle) -- Win32 frame style for **WaynesForm** (CustomControls)
- [**BorderStyleConstants**](../tB/Packages/VBRUN/Constants/BorderStyleConstants) -- line style for Shape and Line controls (VBRUN)
- [**ButtonConstants**](../tB/Packages/VBRUN/Constants/ButtonConstants) -- style for graphical command buttons (VBRUN)

**C**

- [**CefLogSeverity**](../tB/Packages/CEF/Enumerations/CefLogSeverity) -- CEF debug-log minimum severity (CEF)
- [**cefPrintOrientation**](../tB/Packages/CEF/Enumerations/cefPrintOrientation) -- page orientation for **PrintToPdf** (CEF)
- [**CheckBoxConstants**](../tB/Packages/VBRUN/Constants/CheckBoxConstants) -- check-box **Value** property state (VBRUN)
- [**ClipboardConstants**](../tB/Packages/VBRUN/Constants/ClipboardConstants) -- clipboard format identifiers (VBRUN)
- [**ColorConstants**](../tB/Packages/VBRUN/Constants/ColorConstants) -- named RGB colours (VBRUN)
- [**ColorRGBA**](../tB/Packages/CustomControls/Enumerations/ColorRGBA) -- 32-bit ABGR colour type alias (CustomControls)
- [**ComboBoxConstants**](../tB/Packages/VBRUN/Constants/ComboBoxConstants) -- combo-box **Style** property values (VBRUN)
- [**ControlBorderStyleConstants**](../tB/Packages/VBRUN/Constants/ControlBorderStyleConstants) -- border style for intrinsic controls (VBRUN)
- [**ControlBorderStyleConstantsCustom**](../tB/Packages/VBRUN/Constants/ControlBorderStyleConstantsCustom) -- extended border style including custom-drawn (VBRUN)
- [**ControlTypeConstants**](../tB/Packages/VBRUN/Constants/ControlTypeConstants) -- standard intrinsic control type identifiers (VBRUN)
- [**CornerShape**](../tB/Packages/CustomControls/Enumerations/CornerShape) -- corner shape (square, rounded, cut) (CustomControls)
- [**Customtate**](../tB/Packages/CustomControls/Enumerations/Customtate) -- control state flags for custom painting (CustomControls)

**D**

- [**DatabaseTypeConstants**](../tB/Packages/VBRUN/Constants/DatabaseTypeConstants) -- Data control database engine (VBRUN)
- [**DataBOFconstants**](../tB/Packages/VBRUN/Constants/DataBOFconstants) -- action at beginning of recordset (VBRUN)
- [**DataEOFConstants**](../tB/Packages/VBRUN/Constants/DataEOFConstants) -- action at end of recordset (VBRUN)
- [**DataErrorConstants**](../tB/Packages/VBRUN/Constants/DataErrorConstants) -- Data control **Error** event response values (VBRUN)
- [**DataValidateConstants**](../tB/Packages/VBRUN/Constants/DataValidateConstants) -- action codes in the **Validate** event (VBRUN)
- [**DefaultCursorTypeConstants**](../tB/Packages/VBRUN/Constants/DefaultCursorTypeConstants) -- cursor driver for a Data control connection (VBRUN)
- [**DockMode**](../tB/Packages/CustomControls/Enumerations/DockMode) -- how a CustomControl is docked (CustomControls)
- [**DockModeConstants**](../tB/Packages/VBRUN/Constants/DockModeConstants) -- dock-edge values for forms and toolbars (VBRUN)
- [**DragConstants**](../tB/Packages/VBRUN/Constants/DragConstants) -- **Drag** method action values (VBRUN)
- [**DragModeConstants**](../tB/Packages/VBRUN/Constants/DragModeConstants) -- automatic vs. manual drag mode (VBRUN)
- [**DragOverConstants**](../tB/Packages/VBRUN/Constants/DragOverConstants) -- state values in the **DragOver** event (VBRUN)
- [**DrawModeConstants**](../tB/Packages/VBRUN/Constants/DrawModeConstants) -- GDI raster-operation for **DrawMode** (VBRUN)
- [**DrawStyleConstants**](../tB/Packages/VBRUN/Constants/DrawStyleConstants) -- line style for **DrawStyle** property (VBRUN)
- [**DTPickerFormatConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/DTPickerFormatConstants) -- **DTPicker** display format (WinNativeCommonCtls)

**F**

- [**FillPattern**](../tB/Packages/CustomControls/Enumerations/FillPattern) -- how colour stops in a **Fill** are applied (CustomControls)
- [**FillStyleConstants**](../tB/Packages/VBRUN/Constants/FillStyleConstants) -- fill pattern for **FillStyle** property (VBRUN)
- [**FillStyleConstantsEx**](../tB/Packages/VBRUN/Constants/FillStyleConstantsEx) -- extended fill patterns with gradient fills (VBRUN)
- [**FontWeight**](../tB/Packages/CustomControls/Enumerations/FontWeight) -- font weight on the 100--900 scale (CustomControls)
- [**FormArrangeConstants**](../tB/Packages/VBRUN/Constants/FormArrangeConstants) -- MDI child-window arrangement modes (VBRUN)
- [**FormBorderStyleConstants**](../tB/Packages/VBRUN/Constants/FormBorderStyleConstants) -- form border and frame style (VBRUN)
- [**FormShowConstants**](../tB/Packages/VBRUN/Constants/FormShowConstants) -- modality for **Show** (VBRUN)
- [**FormWindowStateConstants**](../tB/Packages/VBRUN/Constants/FormWindowStateConstants) -- form window state (VBRUN)

**H**

- [**HitResultConstants**](../tB/Packages/VBRUN/Constants/HitResultConstants) -- **UserControl.HitTest** return values (VBRUN)

**I**

- [**ImlDrawConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/ImlDrawConstants) -- **ListImage.Draw** render-style flags (WinNativeCommonCtls)

**K**

- [**KeyCodeConstants**](../tB/Packages/VBRUN/Constants/KeyCodeConstants) -- virtual-key codes for key events (VBRUN)

**L**

- [**LinkModeConstants**](../tB/Packages/VBRUN/Constants/LinkModeConstants) -- DDE link-mode values (VBRUN)
- [**ListBoxConstants**](../tB/Packages/VBRUN/Constants/ListBoxConstants) -- list-box **Style** property values (VBRUN)
- [**LoadPictureColorConstants**](../tB/Packages/VBRUN/Constants/LoadPictureColorConstants) -- **LoadPicture** colour depth (VBRUN)
- [**LoadPictureSizeConstants**](../tB/Packages/VBRUN/Constants/LoadPictureSizeConstants) -- **LoadPicture** size selector (VBRUN)
- [**LoadResConstants**](../tB/Packages/VBRUN/Constants/LoadResConstants) -- **LoadResPicture** resource type (VBRUN)
- [**LogEventTypeConstants**](../tB/Packages/VBRUN/Constants/LogEventTypeConstants) -- **LogEvent** severity values (VBRUN)
- [**LogModeConstants**](../tB/Packages/VBRUN/Constants/LogModeConstants) -- **App.StartLogging** destination flags (VBRUN)

**M**

- [**MenuAccelConstants**](../tB/Packages/VBRUN/Constants/MenuAccelConstants) -- menu-item keyboard-accelerator codes (VBRUN)
- [**MenuControlConstants**](../tB/Packages/VBRUN/Constants/MenuControlConstants) -- **PopupMenu** alignment and trigger flags (VBRUN)
- [**MouseButtonConstants**](../tB/Packages/VBRUN/Constants/MouseButtonConstants) -- mouse-event *Button* argument bit flags (VBRUN)
- [**MousePointerConstants**](../tB/Packages/VBRUN/Constants/MousePointerConstants) -- **MousePointer** property cursor shape (VBRUN)
- [**MultiSelectConstants**](../tB/Packages/VBRUN/Constants/MultiSelectConstants) -- list-box multi-selection mode (VBRUN)

**N**

- [**NegotiatePositionConstants**](../tB/Packages/VBRUN/Constants/NegotiatePositionConstants) -- menu placement during OLE in-place activation (VBRUN)

**O**

- [**OldLinkModeConstants**](../tB/Packages/VBRUN/Constants/OldLinkModeConstants) -- legacy DDE link-mode values (VBRUN)
- [**OLEContainerActivateConstants**](../tB/Packages/VBRUN/Constants/OLEContainerActivateConstants) -- OLE container auto-activation trigger (VBRUN)
- [**OLEContainerConstants**](../tB/Packages/VBRUN/Constants/OLEContainerConstants) -- combined OLE container option values (VBRUN)
- [**OLEContainerDisplayTypeConstants**](../tB/Packages/VBRUN/Constants/OLEContainerDisplayTypeConstants) -- OLE container display style (VBRUN)
- [**OLEContainerSizeModeConstants**](../tB/Packages/VBRUN/Constants/OLEContainerSizeModeConstants) -- OLE container sizing rules (VBRUN)
- [**OLEContainerTypesAllowedConstants**](../tB/Packages/VBRUN/Constants/OLEContainerTypesAllowedConstants) -- OLE container object-type filter (VBRUN)
- [**OLEContainerUpdateOptionsConstants**](../tB/Packages/VBRUN/Constants/OLEContainerUpdateOptionsConstants) -- OLE container update mode (VBRUN)
- [**OLEDragConstants**](../tB/Packages/VBRUN/Constants/OLEDragConstants) -- **OLEDragMode** property values (VBRUN)
- [**OLEDropConstants**](../tB/Packages/VBRUN/Constants/OLEDropConstants) -- **OLEDropMode** property values (VBRUN)
- [**OLEDropEffectConstants**](../tB/Packages/VBRUN/Constants/OLEDropEffectConstants) -- OLE drag-and-drop *Effect* bit flags (VBRUN)
- [**OrientationConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/OrientationConstants) -- horizontal / vertical for **Slider** and **UpDown** (WinNativeCommonCtls)

**P**

- [**PaletteModeConstants**](../tB/Packages/VBRUN/Constants/PaletteModeConstants) -- palette source for forms and UserControls (VBRUN)
- [**ParentControlsType**](../tB/Packages/VBRUN/Constants/ParentControlsType) -- **ParentControls** collection wrapping mode (VBRUN)
- [**PictureTypeConstants**](../tB/Packages/VBRUN/Constants/PictureTypeConstants) -- **IPictureDisp** subtype values (VBRUN)
- [**PixelCount**](../tB/Packages/CustomControls/Enumerations/PixelCount) -- pixel-measurement type alias (CustomControls)
- [**PointSize**](../tB/Packages/CustomControls/Enumerations/PointSize) -- typographic-point font-size type alias (CustomControls)
- [**PrinterObjectConstants**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants) -- combined **Printer** object option values (VBRUN)
- [**PrinterObjectConstants_ColorMode**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_ColorMode) -- **Printer.ColorMode** values (VBRUN)
- [**PrinterObjectConstants_Duplex**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_Duplex) -- **Printer.Duplex** values (VBRUN)
- [**PrinterObjectConstants_Orientation**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_Orientation) -- **Printer.Orientation** values (VBRUN)
- [**PrinterObjectConstants_PaperBin**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PaperBin) -- **Printer.PaperBin** values (VBRUN)
- [**PrinterObjectConstants_PaperSize**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PaperSize) -- **Printer.PaperSize** values (VBRUN)
- [**PrinterObjectConstants_PrintQuality**](../tB/Packages/VBRUN/Constants/PrinterObjectConstants_PrintQuality) -- **Printer.PrintQuality** values (VBRUN)

**Q**

- [**QueryUnloadConstants**](../tB/Packages/VBRUN/Constants/QueryUnloadConstants) -- **QueryUnload** event reason codes (VBRUN)

**R**

- [**RasterOpConstants**](../tB/Packages/VBRUN/Constants/RasterOpConstants) -- GDI raster-operation codes for **PaintPicture** (VBRUN)
- [**RecordsetTypeConstants**](../tB/Packages/VBRUN/Constants/RecordsetTypeConstants) -- Data control recordset type (VBRUN)

**S**

- [**ScaleModeConstants**](../tB/Packages/VBRUN/Constants/ScaleModeConstants) -- measurement units for **ScaleMode** (VBRUN)
- [**ScrollBarConstants**](../tB/Packages/VBRUN/Constants/ScrollBarConstants) -- which scrollbars appear on a control (VBRUN)
- [**ServiceControlCodeConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceControlCodeConstants) -- SCM control codes for a running service (WinServicesLib)
- [**ServiceStartConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceStartConstants) -- service start mode (WinServicesLib)
- [**ServiceStatusConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceStatusConstants) -- service runtime state values (WinServicesLib)
- [**ServiceTypeConstants**](../tB/Packages/WinServicesLib/Enumerations/ServiceTypeConstants) -- Win32 service type (WinServicesLib)
- [**ShapeConstants**](../tB/Packages/VBRUN/Constants/ShapeConstants) -- geometric shape for the Shape control (VBRUN)
- [**ShiftConstants**](../tB/Packages/VBRUN/Constants/ShiftConstants) -- modifier-key bit flags for mouse and key events (VBRUN)
- [**ShortcutConstants**](../tB/Packages/VBRUN/Constants/ShortcutConstants) -- menu-item keyboard shortcut identifiers (VBRUN)
- [**StartupPosition**](../tB/Packages/CustomControls/Enumerations/StartupPosition) -- initial position of a **WaynesForm** (CustomControls)
- [**StartUpPositionConstants**](../tB/Packages/VBRUN/Constants/StartUpPositionConstants) -- form **StartUpPosition** property values (VBRUN)
- [**StorageTypeContants**](../tB/Packages/VBRUN/Constants/StorageTypeContants) -- OLE data-storage medium identifiers (VBRUN)
- [**SystemColorConstants**](../tB/Packages/VBRUN/Constants/SystemColorConstants) -- system-UI colour references (VBRUN)

**T**

- [**TextAlignment**](../tB/Packages/CustomControls/Enumerations/TextAlignment) -- horizontal and vertical text alignment (CustomControls)
- [**TextOverflowMode**](../tB/Packages/CustomControls/Enumerations/TextOverflowMode) -- text truncation mode (CustomControls)
- [**TreeBorderStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeBorderStyleConstants) -- **TreeView** and **ListView** border style (WinNativeCommonCtls)
- [**TreeLabelEditConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLabelEditConstants) -- **TreeView** inline-label-editing trigger (WinNativeCommonCtls)
- [**TreeLineStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeLineStyleConstants) -- **TreeView** tree-lines scope (WinNativeCommonCtls)
- [**TreeRelationshipConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeRelationshipConstants) -- **Nodes.Add** insertion position (WinNativeCommonCtls)
- [**TreeSortOrderConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortOrderConstants) -- **TreeView** / **Node** sort direction (WinNativeCommonCtls)
- [**TreeSortTypeConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeSortTypeConstants) -- **TreeView** / **Node** sort comparison mode (WinNativeCommonCtls)
- [**TreeStyleConstants**](../tB/Packages/WinNativeCommonCtls/Enumerations/TreeStyleConstants) -- **TreeView** composite visual style (WinNativeCommonCtls)

**V**

- [**VbAppWinStyle**](../tB/Modules/Constants/VbAppWinStyle) -- window-style values for **Shell** (VBA)
- [**VbArchitecture**](../tB/Modules/Constants/VbArchitecture) -- processor-architecture values (VBA)
- [**VbCalendar**](../tB/Modules/Constants/VbCalendar) -- calendar type values (VBA)
- [**VbCallType**](../tB/Modules/Constants/VbCallType) -- **CallByName** call-type flags (VBA)
- [**VbCompareMethod**](../tB/Modules/Constants/VbCompareMethod) -- text-comparison mode for string functions (VBA)
- [**VbDateTimeFormat**](../tB/Modules/Constants/VbDateTimeFormat) -- **FormatDateTime** format codes (VBA)
- [**VbDayOfWeek**](../tB/Modules/Constants/VbDayOfWeek) -- day-of-week constants for date functions (VBA)
- [**VbFileAttribute**](../tB/Modules/Constants/VbFileAttribute) -- file-attribute flags (VBA)
- [**VbFirstWeekOfYear**](../tB/Modules/Constants/VbFirstWeekOfYear) -- first-week-of-year selectors for date functions (VBA)
- [**VbIMEStatus**](../tB/Modules/Constants/VbIMEStatus) -- Input Method Editor mode constants (VBA)
- [**VbMsgBoxResult**](../tB/Modules/Constants/VbMsgBoxResult) -- **MsgBox** button-clicked identifier (VBA)
- [**VbMsgBoxStyle**](../tB/Modules/Constants/VbMsgBoxStyle) -- **MsgBox** button, icon, and modality flags (VBA)
- [**VbStrConv**](../tB/Modules/Constants/VbStrConv) -- **StrConv** conversion-type flags (VBA)
- [**VbTriState**](../tB/Modules/Constants/VbTriState) -- three-state values for formatting functions (VBA)
- [**VbVarType**](../tB/Modules/Constants/VbVarType) -- **VarType** Variant subtype codes (VBA)
- [**VariantTypeConstants**](../tB/Packages/VBRUN/Constants/VariantTypeConstants) -- legacy DAO field-type tags (VBRUN)
- [**VerticalAlignmentConstants**](../tB/Packages/VBRUN/Constants/VerticalAlignmentConstants) -- vertical text alignment (VBRUN)

**W**

- [**WindowState**](../tB/Packages/CustomControls/Enumerations/WindowState) -- **WaynesForm** window state (CustomControls)
- [**wv2DefaultDownloadCornerAlign**](../tB/Packages/WebView2/Enumerations/wv2DefaultDownloadCornerAlign) -- download-dialog corner alignment (WebView2)
- [**wv2ErrorStatus**](../tB/Packages/WebView2/Enumerations/wv2ErrorStatus) -- navigation failure reason (WebView2)
- [**wv2HostResourceAccessKind**](../tB/Packages/WebView2/Enumerations/wv2HostResourceAccessKind) -- virtual-hostname cross-origin access policy (WebView2)
- [**wv2KeyEventKind**](../tB/Packages/WebView2/Enumerations/wv2KeyEventKind) -- accelerator-key event kind (WebView2)
- [**wv2PermissionKind**](../tB/Packages/WebView2/Enumerations/wv2PermissionKind) -- permission request capability identifier (WebView2)
- [**wv2PermissionState**](../tB/Packages/WebView2/Enumerations/wv2PermissionState) -- permission-request decision (WebView2)
- [**wv2PrintOrientation**](../tB/Packages/WebView2/Enumerations/wv2PrintOrientation) -- **PrintToPdf** page orientation (WebView2)
- [**wv2ProcessFailedKind**](../tB/Packages/WebView2/Enumerations/wv2ProcessFailedKind) -- failed WebView2 process identifier (WebView2)
- [**wv2ScriptDialogKind**](../tB/Packages/WebView2/Enumerations/wv2ScriptDialogKind) -- JavaScript dialog kind (WebView2)
- [**wv2WebResourceContext**](../tB/Packages/WebView2/Enumerations/wv2WebResourceContext) -- web-resource filter request kind (WebView2)

**Z**

- [**ZOrderConstants**](../tB/Packages/VBRUN/Constants/ZOrderConstants) -- **ZOrder** method position selectors (VBRUN)

---

### See Also

- [Statements](Statements) -- alphabetical index of language statements
- [Procedures and Functions](Procedures-and-Functions) -- alphabetical index of callable runtime members
- [Operators](Operators) -- arithmetic, comparison, logical, and bitwise operators
- [Packages](../tB/Packages/) -- all twelve built-in packages
