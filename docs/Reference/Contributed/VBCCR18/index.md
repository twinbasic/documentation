---
title: VBCCR18 Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - ComCtlsBase
  - Common
  - RichTextBoxBase
  - VirtualComboBase
  - VisualStyles
  - VTableHandle
  - VTableInterfaceConstants
  - ISubclass
indexed_from: 1.8.136.0
permalink: /tB/Packages/Contributed/VBCCR18/
---

# VBCCR18 Package
{: .no_toc }

**Author:** Krool. **Version:** 1.8.136.0. **On GitHub:** [Kr00l/VBCCR](https://github.com/Kr00l/VBCCR)

The **VBCCR18** contributed package provides controls that stand in place of the Microsoft common controls of VB6, Unicode versions of the VB6 intrinsic controls, and controls of Windows that VB6 never had.

The controls are Krool's *VB Common Controls Replacement* library, written in VB6 and published on GitHub as an ActiveX control library, `VBCCR18.OCX`; this package is the same code compiled by twinBASIC, so a project needs no OCX to be registered. Each control is a window of Windows itself, such as the list view or the rich edit control, so it draws and behaves as the same control does in any Windows program. Most members of the Microsoft controls keep their names and meanings. This section documents version 1.8.136.0, published under the MIT licence. The package describes itself as "VB Common Controls Replacement 1.8 Library (Experimental, 32-bit and 64-bit)".

```tb check_build check_run arch=win32,win64
ProgressBar1.Min = 0
ProgressBar1.Max = 200
ProgressBar1.Value = 50
TextBoxW1.Text = ChrW$(&H3A9) & "mega"      ' a Greek capital omega, kept as it is
Debug.Print ProgressBar1.Value; Len(TextBoxW1.Text); AscW(TextBoxW1.Text)
' Output:
'  50  5  937
```

* TOC
{:toc}

## Adding a control to a form

Add the package to the project as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. The **Standard EXE (+VBCCR)** template of the [New Project](../../../IDE/Starting/New-Project) dialog makes a project that references it already. The controls are then in the [Toolbox](../../../IDE/Project/Toolbox): select one and draw it on the form. In code it is named as any other control on the form is, **ProgressBar1** for the first **ProgressBar**.

The controls are those of Windows, and Windows draws them in its current visual style only in a program that has the [visual styles manifest](../../../IDE/Projects/Adding-Files#visual-styles-manifest) among its resources. The **Standard EXE (+VBCCR)** template adds it; in another project, add it before building. In a program built without it the controls are drawn in the classic style, and the two that Windows has only with visual styles, [**CommandLink**](CommandLink#a-program-without-visual-styles) and [**LinkLabel**](LinkLabel/), make no window and show diagonal lines in their place.

Several controls have the name of a control of the [WinNativeCommonCtls](../../WinNativeCommonCtls/) package: **DTPicker**, **ImageList**, **ListView**, **MonthView**, **ProgressBar**, **Slider**, **TreeView** and **UpDown**. In a project that references both packages, a declaration names the package as well: `Dim Bar As VBCCR18.ProgressBar`.

## Controls in place of the VB6 intrinsic controls

Each of these is the VB6 control of the same name without the `W`, with text in Unicode and the features Windows has added to the control since.

- [**CheckBoxW**](CheckBoxW) -- a check box
- [**ComboBoxW**](ComboBoxW) -- a text box with a drop-down list
- [**CommandButtonW**](CommandButtonW) -- a push button, also with a drop-down arrow
- [**FrameW**](FrameW) -- a captioned frame that holds other controls
- [**LabelW**](LabelW) -- text on the form, with no window of its own
- [**ListBoxW**](ListBoxW) -- a list of text items
- [**OptionButtonW**](OptionButtonW) -- an option button
- [**TextBoxW**](TextBoxW) -- a text box of one or several lines

## Controls in place of the Microsoft common controls

| Control | Shows | VB6 library |
|---|---|---|
| [**Animation**](Animation) | a silent AVI clip | `MSCOMCT2.OCX` |
| [**CoolBar**](CoolBar/) | bands that hold other controls, which the user moves and resizes | `COMCT332.OCX` |
| [**DTPicker**](DTPicker) | a date or a time, with a drop-down calendar | `MSCOMCT2.OCX` |
| [**ImageCombo**](ImageCombo/) | a drop-down list whose items have pictures | `MSCOMCTL.OCX` |
| [**ImageList**](ImageList/) | nothing: it holds the pictures other controls show | `MSCOMCTL.OCX` |
| [**ListView**](ListView/) | items as icons, a list, tiles or a report with columns | `MSCOMCTL.OCX` |
| [**MonthView**](MonthView) | a calendar of one or more months | `MSCOMCT2.OCX` |
| [**ProgressBar**](ProgressBar) | progress through a range | `MSCOMCTL.OCX` |
| [**RichTextBox**](RichTextBox/) | formatted text, edited | `RICHTX32.OCX` |
| [**Slider**](Slider) | a value in a range, set by a thumb on a track | `MSCOMCTL.OCX` |
| [**StatusBar**](StatusBar/) | panels of text and pictures along the bottom of a form | `MSCOMCTL.OCX` |
| [**SysInfo**](SysInfo) | nothing: it reports events and facts of the system | `SYSINFO.OCX` |
| [**TabStrip**](TabStrip/) | a row of tabs | `MSCOMCTL.OCX` |
| [**ToolBar**](ToolBar/) | a row of buttons | `MSCOMCTL.OCX` |
| [**TreeView**](TreeView/) | a tree of nodes that expand and collapse | `MSCOMCTL.OCX` |
| [**UpDown**](UpDown) | a pair of arrow buttons that change a value | `MSCOMCT2.OCX` |

The [**CommonDialog**](CommonDialog) class shows the Windows common dialogs, as the CommonDialog control of `COMDLG32.OCX` does. It is a class, not a control: a program makes one with **New**.

## Controls that VB6 does not have

- [**CommandLink**](CommandLink) -- a button with a title, a note under it and an arrow
- [**FontCombo**](FontCombo) -- a drop-down list of the fonts installed
- [**HotKey**](HotKey) -- a box that takes a key combination
- [**IPAddress**](IPAddress) -- a box for an IPv4 address, in four fields
- [**LinkLabel**](LinkLabel/) -- text with links in it
- [**MCIWnd**](MCIWnd) -- a player for sound and video files
- [**Pager**](Pager) -- a control that scrolls another control too large for its place
- [**SpinBox**](SpinBox) -- a text box for a number, with arrow buttons
- [**VirtualCombo**](VirtualCombo) -- a drop-down list whose items the program supplies when they are shown
- [**VListBox**](VListBox) -- a list box whose items the program supplies when they are shown
- [**WindowedLabel**](WindowedLabel) -- text on the form, in a window of its own

## Members that the controls share

Position, size, the font, the mouse and keyboard events, dragging and the other members that nearly every control has are on one page, [Common members](Common), with the enumerations that several controls use. A control's own page lists which of them it has and documents the rest.

The package also has modules, `ComCtlsBase`, `Common`, `RichTextBoxBase`, `VirtualComboBase`, `VisualStyles` and `VTableHandle`, and a class, `ISubclass`, whose procedures and constants a project can reach. They are the controls' own helper code (subclassing, conversions, the in-place activation of a control and the like), and this section does not document them.

## See Also

- [Contributed Packages](../)
- [WinNativeCommonCtls](../../WinNativeCommonCtls/) -- the built-in package whose common controls have the same names
- [VBFLXGRD18](../VBFLXGRD18/) -- Krool's **VBFlexGrid** control, also a package
- [VBComDlg](../VBComDlg/) -- Krool's **CommonDialog** class as a package of its own
- [Controls](../../../Controls#vb6-controls) -- where each VB6 control is in twinBASIC

## Test cases

The statements of this section that name test cases are checked by the cases in [VBCCR18-tests.twinproj](VBCCR18-tests.twinproj), a twinBASIC project. It uses VBCCR18 as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
