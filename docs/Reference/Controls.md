---
title: Controls
parent: Reference Section
nav_order: 7
permalink: /tB/Controls
---

# Controls

The standard set of UI control classes that ship with twinBASIC lives in the **VB** built-in package — see [VB Package](Packages/VB) for the package landing page. The classes below are grouped by purpose; each entry links to the per-class reference.

## Forms and host classes

These classes are *containers* rather than controls in the strict sense — they host other controls and back the form/control designer in the IDE.

- [Form](Packages/VB/Form/) — top-level window hosting controls, menus, and a drawing surface.
- [MDIForm](Packages/VB/MDIForm/) — top-level MDI parent that hosts MDI-child [Form](Packages/VB/Form/) instances inside a recessed client area.
- [UserControl](Packages/VB/UserControl/) — base class for designing a reusable ActiveX control in twinBASIC.
- [PropertyPage](Packages/VB/PropertyPage/) — container backing a single tab of a COM property-page dialog (the **(Custom)** popup on an ActiveX control's property browser).
- [Report](Packages/VB/Report/) — top-level window specialised for banded report layout, print preview, and printing.

## Buttons and toggles

- [CommandButton](Packages/VB/CommandButton/) — push-button used to trigger an action.
- [CheckBox](Packages/VB/CheckBox/) — two- or three-state check box with an optional text caption.
- [CheckMark](Packages/VB/CheckMark/) — windowless check glyph that scales to fill its rectangle; no caption, no focus.
- [OptionButton](Packages/VB/OptionButton/) — radio-button; option buttons sharing a container form a mutually-exclusive group.

## Text and value input

- [TextBox](Packages/VB/TextBox/) — single-line or multi-line edit control, with optional password masking and digit-only input.
- [ComboBox](Packages/VB/ComboBox/) — edit field combined with a drop-down list of items.
- [ListBox](Packages/VB/ListBox/) — vertically-scrolling list of items, optionally multi-column and multi-select.
- [HScrollBar](Packages/VB/HScrollBar/) — stand-alone horizontal scroll bar.
- [VScrollBar](Packages/VB/VScrollBar/) — stand-alone vertical scroll bar.

## File-system browsing

These three controls are normally wired up together to build a complete file picker.

- DriveListBox — drive picker. *Not yet documented.*
- [DirListBox](Packages/VB/DirListBox/) — directory-tree picker for a single path.
- [FileListBox](Packages/VB/FileListBox/) — file list for a single directory, filtered by wildcard and file-attribute toggles.

## Containers

- [Frame](Packages/VB/Frame/) — captioned container that groups related controls and scopes [OptionButton](Packages/VB/OptionButton/) groups.
- [MultiFrame](Packages/VB/MultiFrame/) — layout container that arranges a set of [Frame](Packages/VB/Frame/) controls in a horizontal or vertical strip.
- [PictureBox](Packages/VB/PictureBox/) — Win32 native control combining picture display, a drawing surface, and a child-control container.

## Display-only

- [Label](Packages/VB/Label/) — windowless lightweight read-only text display, used for captions, status text, and keyboard mnemonics.
- [Image](Packages/VB/Image/) — windowless lightweight picture display; the small, efficient alternative to [PictureBox](Packages/VB/PictureBox/).
- [Line](Packages/VB/Line/) — windowless single straight line between two endpoints.
- [Shape](Packages/VB/Shape/) — windowless geometric primitive (rectangle, oval, circle, star, arrow, …) with configurable border, fill, and rotation.
- [QRCode](Packages/VB/QRCode/) — windowless QR-code renderer driven by a text or byte-array payload.

## Menus

- [Menu](Packages/VB/Menu/) — item in a Win32 native menu — top-level entry on a [Form](Packages/VB/Form/)'s or [MDIForm](Packages/VB/MDIForm/)'s menu bar, a drop-down entry, or a separator.

## Data and external content

- [Data](Packages/VB/Data/) — Win32 native control that opens a DAO recordset and exposes record-navigation buttons for bound controls.
- [OLE](Packages/VB/OLE/) — OLE container hosting a linked or embedded OLE Automation object (Word document, Excel sheet, …).
- [Timer](Packages/VB/Timer/) — non-visual control that raises a periodic event at a programmable interval.
