---
title: VB Package
parent: Reference Section
nav_order: 21
permalink: /tB/Packages/VB/
has_toc: false
---

# VB Package

These classes are in the VB built-in package, which provides the standard set of controls (CheckBox, CommandButton, ComboBox, Label, TextBox, …) and the form infrastructure that hosts them.

## Classes

### Non-Controls

- [App](App) -- singleton wrapping the running application's identity, version metadata, and process-level state
- [Clipboard](Clipboard) -- singleton wrapper around the system clipboard for inter-application copy and paste
- [Global](Global) -- the application's app object — singleton whose members (**App**, **Screen**, **Clipboard**, **Forms**, …) are reachable without qualification
- [Printer](Printer) -- drawing-surface wrapper around one Windows printer device, recording graphics calls into a spooled print job
- [Printers](Printers) -- read-only collection of every printer installed on the system
- [Screen](Screen) -- singleton wrapping the primary display's metrics, font list, active form and control, and application-wide mouse pointer

### Controls

- [CheckBox](CheckBox) -- Win32 native two- or three-state check-box with a caption and optional keyboard mnemonic
- [CheckMark](CheckMark) -- windowless scalable check glyph with no caption or focus — a check-box rendered at any size
- [ComboBox](ComboBox) -- Win32 native edit field combined with a drop-down list of items
- [CommandButton](CommandButton) -- Win32 native push-button that triggers an action when clicked
- [Data](Data) -- Win32 native control that opens a DAO database and exposes a bound recordset to other controls
- [DirListBox](DirListBox) -- Win32 native list of a directory's ancestors and immediate subdirectories
- [DriveListBox](DriveListBox) -- Win32 native drop-down combo auto-populated with the system's drives
- [FileListBox](FileListBox) -- Win32 native list of files in a directory, filtered by pattern and attributes
- [Form](Form) -- top-level Win32 window that hosts the controls, menus, and drawing surface of a single user interface
- [Frame](Frame) -- Win32 native captioned container that groups controls and forms an option-button group
- [HScrollBar](HScrollBar) -- Win32 native stand-alone horizontal scroll bar
- [Image](Image) -- windowless lightweight picture display — the cheap alternative to **PictureBox**
- [Label](Label) -- windowless lightweight control for displaying read-only text and keyboard-mnemonic anchors
- [Line](Line) -- windowless lightweight control that draws a single straight line segment between two endpoints
- [ListBox](ListBox) -- Win32 native vertically-scrolling list of items, single- or multi-select
- [MDIForm](MDIForm) -- top-level window that hosts an MDI client area for **Form** instances marked as MDI children
- [Menu](Menu) -- a single item — top-level entry, sub-menu entry, or separator — in a Win32 native menu
- [MultiFrame](MultiFrame) -- layout container that arranges **Frame** controls in a horizontal or vertical strip
- [OLE](OLE) -- container that hosts a linked or embedded OLE Automation object (VB6 compatibility stub — mostly unimplemented)
- [OptionButton](OptionButton) -- Win32 native round selector, mutually exclusive within its container
- [PictureBox](PictureBox) -- Win32 native picture display, drawing surface, and control container combined
- [PropertyPage](PropertyPage) -- container backing a single tab of a COM property-page dialog
- [QRCode](QRCode) -- windowless lightweight control that renders a QR code generated from its payload
- [Report](Report) -- top-level window specialised for rendering the print preview of a banded recordset report
- [Shape](Shape) -- windowless lightweight control that draws one of a fixed set of geometric primitives
- [TextBox](TextBox) -- Win32 native edit control for single- or multi-line text entry
- [Timer](Timer) -- non-visual control that raises a **Timer** event at a programmable interval
- [UserControl](UserControl) -- base class for designing a reusable ActiveX control
- [VScrollBar](VScrollBar) -- Win32 native stand-alone vertical scroll bar
