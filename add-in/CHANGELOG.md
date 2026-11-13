# Changelog

What changed in the twinBASIC Documentation Help add-in, newest first. The version is the
DLL's (its file properties show it). The documentation the add-in shows and its index of
symbols change with every build of the documentation and are not listed here.

## 1.4.0 (2026-11-13)

- **Each panel layout keeps where the help is**: in its pane, or in its own window and where that
  window is on the screen. **Save Current Panel Layout As** records where the help is now, and
  choosing a layout puts the help back there, detaching it, attaching it or moving its window. A
  layout saved before, and a built-in one, leave the help where it is.
- In **Manage Panel Layouts**, the help's panel has a box, **With the Help Add-In**: *In this
  panel* or *In its own window* for the layout, and the window's place on the screen. The window
  is drawn in the picture too. Choosing *In this panel* for a layout whose help is in its own
  window floats the pane where the window was, inside the IDE window. **Use the current
  arrangement** takes where the help is now as well. **Save Changes** keeps the choice and forgets
  the layouts deleted in the dialog; Cancel keeps nothing.
- Choosing a layout no longer loses the help's pane when it floats or is docked: the IDE took it
  out of the window without closing it, so the pane did not come back until the compiler
  restarted. The tool windows of other add-ins come back too. A pane the layout floats keeps the
  layout's size when it is shown, and while the help is in its own window, the pane no longer
  shows in the layout beside the window.

## 1.3.0 (2026-11-12)

- **Window > Panel Layouts > Manage Panel Layouts** shows each layout as a picture of the IDE
  window, at the IDE's own proportions, in place of its text: a tile for every docked panel, in
  its groups, and every floating panel over them. Clicking a tile or a group shows a box beside
  the picture where its size, its direction (side by side, or one above another) and its place
  among its neighbours are changed, and where a panel is floated, docked again or taken out of the
  layout. Splitters and floating panels are dragged. A panel the layout lacks, the tool window of
  a loaded add-in included, is docked by clicking it and then an edge of a tile. **Use the current
  arrangement** replaces the layout with the panels as the IDE shows them now. A layout with no
  Editor, a panel in it twice, or an id that is not a panel is marked as a problem. The **JSON**
  button shows the layout's text; Save Changes and Cancel are the IDE's.
- The settings panel has a new box, ticked by default: **Panel layout editor**. Unticking it gives
  Manage Panel Layouts its text back, at once.

## 1.2.0 (2026-11-12)

- **Window > Keyboard Shortcuts > Manage Keyboard Shortcuts** shows each group as a table of
  every command of the IDE, with its keys and a line on what it does, in place of the IDE's
  *Keyboard editor coming soon*. A row shows the keys earlier groups give the command, the keys
  this group adds or removes, and when a later group changes them again. Clicking a row of a
  group of your own opens its editor: press a key to bind it, choose whether the group keeps the
  earlier keys or replaces them, and when the key runs (when pressed, also while held, or when
  released). The table finds commands by name, description or key, or by the key you press, and
  marks a key that another command also has, and one that can never run. The **JSON** button at
  the bottom shows the group's text, as the IDE's own pane does; Save Changes and Cancel are the
  IDE's. The dialog's text no longer ends with the line promising a proper editor. The table
  looks like the rest of the IDE: its buttons are the dialog's own, in the shape the theme gives
  them (rounded in Aurora, square in Dark and Light), and its other controls, headings and notes
  are those of the IDE's options and Project Settings.
- The settings panel has a new box, ticked by default: **Keyboard shortcut editor**. Unticking it
  gives Manage Keyboard Shortcuts its own pane and text back, at once.

## 1.1.0 (2026-10-21)

- Ctrl+F finds text in the editors of **Window > Keyboard Shortcuts > Manage Keyboard
  Shortcuts** and of **Manage Panel Layouts**. Enter or F3 goes to the next match,
  Shift+Enter or Shift+F3 to the one before (F3 also with the find box closed), Ctrl+F3 and
  Ctrl+Shift+F3 search for the selection or the word at the caret without opening the box,
  and Esc closes the find box and leaves the dialog open. The text scrolls to each match.
- The settings panel has two new boxes, both ticked by default: **Ctrl and Alt shortcuts of
  add-ins** (the 1.0.0 fix) and **Find in the shortcut editors** (the Ctrl+F above). Unticking
  one turns that feature off at once.

## 1.0.0 (2026-10-20)

- Other add-ins' keyboard shortcuts that include Ctrl or Alt now work while this add-in is
  loaded. The IDE on its own does not run them.
- The help window's text follows the IDE's font size (**Tools > IDE Options**, *IDE Font
  Size*), as the IDE's own panels do, also when the size is changed while the window is open.

## Before version numbers

### 2026-10-18

- F1 on a data type in a declaration, such as `As String`, opens the data type; on
  `String(` it opens the **String** function.

### 2026-10-16

- The help pane, the first time it floats, fits a small IDE window: at most 480 by 640
  pixels, and never more than 85% of the IDE's width or height.

### 2026-10-15

- Offline help: a page or file that the add-in's own copy of the documentation leaves out
  (videos, downloads, the documentation's development pages) opens from the website.

### 2026-10-09

- A line between the search results and the page, in the pane and in the help window.

### 2026-10-07

- **Detach**: the help pane moves into a window of its own, which can go to another monitor.
  **Attach** brings it back; closing the window hides it until the next F1. With the IDE's
  **Show real OS titlebar** option, the window has an ordinary Windows title bar.
- A settings panel, opened with the gear: **Hover help** and **All packages**.
- The add-in offers only the pages of the packages the project references, unless **All
  packages** is ticked.
- Hover help shows the links to a name's pages as the first line of the IDE's own mouse
  hover, such as *Help: MsgBox function (VBA.Interaction)*.

### 2026-10-06

- **Hover help**: links to the pages of the name under the mouse, in the IDE's hover.
  Off by default.
- The search results list is as tall as its rows, up to about a third of the pane, and
  clearing the search box hides it.

### 2026-10-05

- Offline help: when the add-in is built with the documentation's archive, it shows the
  pages from that copy, with no internet connection.

### 2026-10-04

- First release. F1 opens the documentation page for the name under the cursor, in the
  **TWINBASIC HELP** tool window, with a search box over the documentation's index.
- F1 asks the compiler where a name is declared, so it tells apart names spelled the same
  (`c.Add` on a **Collection** opens **Collection.Add**).
- F1 on a name with no page, such as your own procedure, shows its declaration and its
  `[Description]`.
- The pages follow the IDE's dark or light theme, and show without the website's
  navigation.
