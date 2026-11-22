---
title: ICO Designer
parent: Add Ins
nav_order: 4
permalink: /tB/IDE/AddIns/IcoEditor
index:
  - icon editor
  - ico editor
  - edit an icon
---

# ICO Designer

Draws and edits Windows icon files, `.ico`, at seven sizes. The add-in ships with the IDE, in the install's `addins\win32` and `addins\win64` folders, so there is nothing to install. Its source is [Sample 25](../Starting/Samples#the-samples). The **Add-Ins** menu lists it as *ICO Editor*.

## Opening a file

A file whose extension is `.ico` or `.cur` opens in the ICO Designer when you double-click it in the **Project Explorer**, such as an icon in the project's `Resources\ICON` folder. It opens in a tab of its own, like a code file.

<!-- test: bug ico-designer-cur-unreadable, lane addin:ico-cur -->
> [!NOTE] BETA 1045
> A cursor file, `.cur`, opens in the ICO Designer but shows nothing: the status line reads *Unsupported/corrupt ICO: click New icon to replace it.* The designer reads icons only. Do not click **New** in that tab unless you want the cursor replaced: it makes an icon, which saving writes over the cursor, without its hotspot.

An icon file holds one picture for each size. The designer works with seven sizes, each a square: 16, 24, 32, 48, 64, 128 and 256 pixels. When a file opens, the designer shows its largest picture. A picture of another size in the file, such as 20 or 96 pixels, is not shown, and neither is a second picture of a size the designer already has.

![The ICO Designer tab for Badge.ico, with the TOOLBOX beside it listing the drawing tools and Pencil chosen. The designer shows the 48 by 48 picture, a blue disc with a white ring and an orange centre, zoomed to 8 times on a grid of pixels. On the right are the size buttons, 16, 32 and 48 ticked and the others marked with a circle, the previews and the palette. The status line reads 48 × 48, Original: 48×48, Zoom: 8×, Tool: Pencil, Grid: On, Undo: 0 / Redo: 0, Pencil selected.](Images/IcoEditor.png){:width="1009" height="585"}

## Sizes

A row of buttons above the picture chooses the size you see and edit. A size the file has is marked with a tick. A size it lacks is marked with a circle: the designer shows a preview of it, made by scaling the nearest size the file has, and the preview is not saved. Drawing on a preview adds that size to the icon.

**Tools → Copy to all** scales the picture you see to every other size and adds them all to the icon. **Tools → Resample from** *n*×*n* replaces the picture you see with the picture of size *n*, scaled. The size *n* must be one the icon has.

Beside the picture are previews of it at 16, 24, 32, 48, 64 and 128 pixels, and one at a large size.

## Drawing

The tools are in the IDE's **TOOLBOX** while the designer's tab is active:

**Pencil**, **Eraser**
: Set or clear one pixel at a time. The eraser makes the pixel transparent.

**Flood fill**
: Fills the area of one colour that you click, with the new colour.

**Eyedropper**
: Takes the colour of the pixel you click, as the foreground colour, or as the background colour with the right mouse button.

**Line**, **Rectangle**, **Ellipse**, **Filled rectangle**, **Filled ellipse**
: Draw a shape from the point where you press the mouse button to the point where you release it.

**Linear gradient**
: Fills the picture with a gradient along the line you drag, from the foreground colour to the background colour, or the other way with the right mouse button.

**Replace colour**
: Replaces every pixel of the colour you click with the new colour.

**Selection / move** and **Lasso selection**
: Select a rectangle, or an area of any shape. Drag the selection to move it. A drag with the right mouse button, or with <kbd>Ctrl</kbd> held, copies it instead.

The left mouse button draws in the foreground colour and the right button in the background colour. Choose either from the palette of 32 colours, one of which is **Transparent**, from the colour picker, or by typing up to six hexadecimal digits, `#RRGGBB`, into the box beside it. The **Opacity** slider sets how transparent the colour is.

The header holds **New**, **Clear**, the **Tools** menu, **Undo**, **Redo**, the zoom buttons and a button that shows or hides the grid of pixels. Zoom goes from 1× to 64×, up to a picture 8,192 pixels wide. Hold a zoom button down to zoom further.

**New** asks *Create a new blank icon?* and makes an icon with one empty picture of the size you see. It discards the undo history.

**Undo** and **Redo** keep 32 steps. They have no keys. The only key the designer uses is <kbd>Delete</kbd>, which deletes the selected pixels.

## The Tools menu

Besides **Copy to all** and **Resample from**, the **Tools** menu flips the picture horizontally or vertically, rotates it 90° either way, moves it one pixel left, right, up or down, and inverts its colours, keeping their transparency. It also deletes the selected pixels, duplicates the selection one pixel down and to the right, and clears the selection.

## What is saved

Each change goes into the project at once, so the tab is marked as changed, and the file on disk changes when you save the project. The designer writes an `.ico` file with one 32-bit picture, with a transparency mask, for each size that has a tick. The 256-pixel picture is stored uncompressed, not as PNG.

So a file the designer has edited keeps only the sizes with a tick. Pictures of other sizes, second pictures of a size, and PNG compression in the original file are gone after the first change. Undo back to where the file was saved writes the file's original bytes again.

## See Also

- [Add Ins](.) -- how add-ins are installed and loaded
- [Samples](../Starting/Samples) -- Sample 25, the add-in's project
- [Designers](../../Packages/tbIDE/Designers) -- the add-in API that adds an editor for a kind of file
