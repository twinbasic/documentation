---
title: Modern Controls
parent: GUI Components
nav_order: 4
---

# Control Modernization

tB will eventually replace all built in controls that you're used to, for now the ones available are: CommandButton, TextBox, ComboBox, CheckBox, OptionButton, Label, Frame, PictureBox, Line, Shape, VScrollBar, HScrollBar, Timer, DriveListBox, DirListBox, FileListBox, Image, and Data from the basic set; then, ListView, TreeView, ProgressBar, DTPicker, MonthView, Slider, and UpDown from the Common Controls.

## Key Modernization Features

- **64-bit Support**: Every control can be compiled both as 32bit and 64bit without changing anything.
- **DPI Aware**: They will automatically size correctly when dpi awareness is enabled for your app.
- **Visual Styles**: Controls support Visual Styles per-control. Comctl6 styles can be applied, or not, on a control-by-control basis with the `.VisualStyles` property.

## Alternatives for Unimplemented Controls

The best option is Krool's VBCCR and VBFlexGrid projects. These are now available [from the Package Server](../../Packages/Importing-TWINSERV/) in x64-compatible form, and are also DPI aware and support Visual Styles.

Additionally, the original OCX controls provided by Microsoft will work fine; however, they're mostly 32-bit only. The x64 version of `MSComCtl.ocx` doesn't come with Windows and isn't legally redistributable but if you have Office 64bit, it works in tB.
