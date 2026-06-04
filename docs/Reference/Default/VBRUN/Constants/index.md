---
title: Constants Module
parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/
has_toc: false
---

# Constants module

The VBRUN **Constants** module collects the named-integer enumerations that classic VB6 forms, intrinsic controls, and runtime services use to spell out their option values --- colours, mouse pointers, key codes, drag/drop states, OLE container behaviour, printer setup values, and so on. There are no standalone constants in this module; everything is grouped into an enumeration so that **IntelliSense** can offer the right options at each property or argument.

Some enumerations are tagged **\[MustBeQualified\]** in the source --- their members must be referenced through the enum name (e.g. `ControlBorderStyleConstantsCustom.vbCustomBorder`) to avoid clashing with members of similarly named enumerations. This is noted on those enum's pages.

## Enumerations

- [AlignConstants](AlignConstants) -- alignment values for the **Align** property (none, top, bottom, left, right)
- [AlignmentConstants](AlignmentConstants) -- text alignment values (left, right, centred)
- [AlignmentConstantsNoCenter](AlignmentConstantsNoCenter) -- text alignment values without a centred option
- [AppearanceConstants](AppearanceConstants) -- flat or 3-D drawing style for controls
- [ApplicationStartConstants](ApplicationStartConstants) -- whether the application was started standalone or via Automation
- [AspectTypeConstants](AspectTypeConstants) -- rendering aspects of an OLE object (content, thumbnail, icon, print)
- [AsyncReadConstants](AsyncReadConstants) -- flags for **UserControl.AsyncRead**
- [AsyncStatusCodeConstants](AsyncStatusCodeConstants) -- status codes reported by the **AsyncReadProgress** event
- [AsyncTypeConstants](AsyncTypeConstants) -- the kind of data being read in **UserControl.AsyncRead**
- [BackFillStyleConstants](BackFillStyleConstants) -- whether a control's background fill is opaque or transparent
- [BorderStyleConstants](BorderStyleConstants) -- line style for drawn shapes (solid, dashed, dotted, transparent, ...)
- [ButtonConstants](ButtonConstants) -- standard or graphical button style
- [CheckBoxConstants](CheckBoxConstants) -- state of a check box (unchecked, checked, grayed)
- [ClipboardConstants](ClipboardConstants) -- clipboard format identifiers (`vbCFText`, `vbCFBitmap`, ...)
- [ColorConstants](ColorConstants) -- common named colours (`vbBlack`, `vbBlue`, `vbRed`, ...)
- [ComboBoxConstants](ComboBoxConstants) -- combo-box style (drop-down, simple, drop-down list)
- [ControlBorderStyleConstants](ControlBorderStyleConstants) -- single-border style (none or fixed single)
- [ControlBorderStyleConstantsCustom](ControlBorderStyleConstantsCustom) -- single-border style with a custom-drawn option
- [ControlTypeConstants](ControlTypeConstants) -- identifiers for the standard intrinsic control types
- [DataBOFconstants](DataBOFconstants) -- action when a Data control reaches the start of a recordset
- [DataEOFConstants](DataEOFConstants) -- action when a Data control reaches the end of a recordset
- [DataErrorConstants](DataErrorConstants) -- response to an error from a data binding operation
- [DataValidateConstants](DataValidateConstants) -- actions reported in a Data control's **Validate** event
- [DatabaseTypeConstants](DatabaseTypeConstants) -- database engine to use with the Data control (ODBC, Jet, ACE)
- [DefaultCursorTypeConstants](DefaultCursorTypeConstants) -- cursor type for a Data control connection
- [DockModeConstants](DockModeConstants) -- dock-edge values for forms and toolbars
- [DragConstants](DragConstants) -- states reported by **DragDrop**/**DragOver**
- [DragModeConstants](DragModeConstants) -- automatic or manual drag mode
- [DragOverConstants](DragOverConstants) -- enter/leave/over state values during a drag-over event
- [DrawModeConstants](DrawModeConstants) -- raster operation for **PSet**/**Line**/**Circle** drawing
- [DrawStyleConstants](DrawStyleConstants) -- line style for drawn lines and shape outlines
- [FillStyleConstants](FillStyleConstants) -- fill pattern for filled shapes
- [FillStyleConstantsEx](FillStyleConstantsEx) -- fill pattern with twinBASIC gradient extensions
- [FormArrangeConstants](FormArrangeConstants) -- MDI child arrangement modes (cascade, tile, ...)
- [FormBorderStyleConstants](FormBorderStyleConstants) -- form window border style (sizable, fixed dialog, tool window, ...)
- [FormShowConstants](FormShowConstants) -- whether a form is shown modal or modeless
- [FormWindowStateConstants](FormWindowStateConstants) -- normal, minimised, or maximised window state
- [HitResultConstants](HitResultConstants) -- return values from a **UserControl** **HitTest** event
- [KeyCodeConstants](KeyCodeConstants) -- virtual-key code values for **KeyDown**/**KeyUp**
- [LinkModeConstants](LinkModeConstants) -- DDE link mode (none, automatic, manual, notify)
- [ListBoxConstants](ListBoxConstants) -- list-box style (standard, check-box, colour swatch)
- [LoadPictureColorConstants](LoadPictureColorConstants) -- colour-depth flag for **LoadPicture**
- [LoadPictureSizeConstants](LoadPictureSizeConstants) -- size selector for **LoadPicture**
- [LoadResConstants](LoadResConstants) -- resource type for **LoadResPicture**
- [LogEventTypeConstants](LogEventTypeConstants) -- severity for **LogEvent** (error, warning, information)
- [LogModeConstants](LogModeConstants) -- destination and behaviour flags for the application log
- [MenuAccelConstants](MenuAccelConstants) -- keyboard-accelerator codes for menu items
- [MenuControlConstants](MenuControlConstants) -- alignment and triggering options for popup menus
- [MouseButtonConstants](MouseButtonConstants) -- bit flags for the pressed mouse buttons (left, right, middle)
- [MousePointerConstants](MousePointerConstants) -- cursor shape for the **MousePointer** property
- [MultiSelectConstants](MultiSelectConstants) -- multi-selection mode for a list box
- [NegotiatePositionConstants](NegotiatePositionConstants) -- positioning of OLE-negotiated menus
- [OLEContainerActivateConstants](OLEContainerActivateConstants) -- when the **OLE** container activates its embedded object
- [OLEContainerConstants](OLEContainerConstants) -- combined enumeration of all **OLE** container option values
- [OLEContainerDisplayTypeConstants](OLEContainerDisplayTypeConstants) -- whether to show content or icon
- [OLEContainerSizeModeConstants](OLEContainerSizeModeConstants) -- sizing rule for an embedded **OLE** object
- [OLEContainerTypesAllowedConstants](OLEContainerTypesAllowedConstants) -- linked, embedded, or either object types
- [OLEContainerUpdateOptionsConstants](OLEContainerUpdateOptionsConstants) -- update mode for an **OLE**-linked object
- [OLEDragConstants](OLEDragConstants) -- automatic or manual **OLE** drag
- [OLEDropConstants](OLEDropConstants) -- none/manual/automatic **OLE** drop targets
- [OLEDropEffectConstants](OLEDropEffectConstants) -- effect of an **OLE** drop (copy, move, link, scroll)
- [OldLinkModeConstants](OldLinkModeConstants) -- legacy DDE link modes (hot, cold, server)
- [PaletteModeConstants](PaletteModeConstants) -- palette source for forms and controls
- [ParentControlsType](ParentControlsType) -- whether [**ParentControls**](../ParentControls) wraps items in their **Extender**
- [PictureTypeConstants](PictureTypeConstants) -- the type of a **StdPicture** (bitmap, icon, metafile, enhanced metafile)
- [PrinterObjectConstants](PrinterObjectConstants) -- combined enumeration of all printer setup values
- [PrinterObjectConstants_ColorMode](PrinterObjectConstants_ColorMode) -- colour or monochrome printing
- [PrinterObjectConstants_Duplex](PrinterObjectConstants_Duplex) -- one-sided or two-sided printing mode
- [PrinterObjectConstants_Orientation](PrinterObjectConstants_Orientation) -- portrait or landscape paper orientation
- [PrinterObjectConstants_PaperBin](PrinterObjectConstants_PaperBin) -- paper-source identifiers for the printer
- [PrinterObjectConstants_PaperSize](PrinterObjectConstants_PaperSize) -- paper-size identifiers for the printer
- [PrinterObjectConstants_PrintQuality](PrinterObjectConstants_PrintQuality) -- draft / low / medium / high print quality
- [QueryUnloadConstants](QueryUnloadConstants) -- reason codes reported in a form's **QueryUnload** event
- [RasterOpConstants](RasterOpConstants) -- raster-operation codes for **PaintPicture**
- [RecordsetTypeConstants](RecordsetTypeConstants) -- table / dynaset / snapshot recordset types
- [ScaleModeConstants](ScaleModeConstants) -- measurement units for a form's or container's **Scale** properties
- [ScrollBarConstants](ScrollBarConstants) -- which scrollbars a control should display (none, horizontal, vertical, both)
- [ShapeConstants](ShapeConstants) -- geometric shape selectors for the **Shape** control
- [ShiftConstants](ShiftConstants) -- bit flags for **Shift**, **Ctrl**, and **Alt** in mouse and key events
- [ShortcutConstants](ShortcutConstants) -- shortcut-key identifiers for menu items
- [StartUpPositionConstants](StartUpPositionConstants) -- initial position of a form (manual, owner, screen, default)
- [StorageTypeContants](StorageTypeContants) -- **OLE** data storage medium (`HGLOBAL`, file, `IStream`, `IStorage`, ...)
- [SystemColorConstants](SystemColorConstants) -- high values referring to system palette entries
- [VariantTypeConstants](VariantTypeConstants) -- DAO field-type tags (legacy)
- [VerticalAlignmentConstants](VerticalAlignmentConstants) -- vertical text alignment (top, middle, bottom)
- [ZOrderConstants](ZOrderConstants) -- selectors for **BringToFront** / **SendToBack**

> [!NOTE]
> The enumeration name `StorageTypeContants` (note the missing `s`) is preserved here exactly as the runtime exposes it; the misspelling is a long-standing VB6 holdover.
