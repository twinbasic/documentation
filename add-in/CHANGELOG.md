# Changelog

What changed in the twinBASIC Documentation Help add-in, newest first. The version is the
DLL's (its file properties show it). The documentation the add-in shows and its index of
symbols change with every build of the documentation and are not listed here.

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
