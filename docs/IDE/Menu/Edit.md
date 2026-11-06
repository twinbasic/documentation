---
title: Edit
parent: Menu
grand_parent: IDE Reference
nav_order: 2
permalink: /tB/IDE/Reference/Menu/Edit
redirect_from:
  - /tB/IDE/Project/Menu/Edit
---

# Edit Menu

The Edit menu holds the commands that change and search text. [Writing code](../../Code/) explains them.

![The Edit menu open while the code editor has the focus, with no command greyed out. Its groups run from Undo and Redo through the clipboard commands, with Paste As Comment between Paste and Delete, then Find, Replace and Find In Project, the indent and format commands, the Quick Find group, the fold and unfold commands, and finally Go To Line/Column and four Transform To case commands. Most entries show a keyboard shortcut at the right.](Images/Menu_Edit.png){:width="298" height="771"}

The picture shows the menu while the code editor has the focus. Most commands act on the code editor, so which ones are available depends on what has the focus.

Seven items are two commands each: **Undo**, **Redo**, **Cut**, **Copy**, **Paste**, **Delete** and **Select All**. One command is for the code editor and one is for the [form designer](../../Forms/Controls), and the menu shows the one that fits. While the code editor has the focus, they edit text. While the form designer, or the **PROPERTIES** pane, has the focus, they work on controls:

- **Undo**, **Redo**, **Paste** and **Select All** are available while a form is open in the designer.
- **Cut**, **Copy** and **Delete** are available only while at least one control is selected. The form alone does not count as a selected control.
- A key pressed in the **PROPERTIES** pane does not run them, because the key goes to the property box. The menu item does.

When none of the code editor, the designer and the **PROPERTIES** pane has the focus, these seven items are greyed out. **Paste As Comment** is missing whenever the code editor does not have the focus. Every other item of the menu, from **Find...** to the **Transform To** items, is a code editor command: it is greyed out while the form designer has the focus, and with nothing in focus. The one exception is **Find In Project...**, which is available whenever a project is loaded.

## Undo and the clipboard

**Undo** (<kbd>Ctrl</kbd>+<kbd>Z</kbd>) and **Redo** (<kbd>Ctrl</kbd>+<kbd>Y</kbd>)
: Step back and forward through the changes to the file. There is no second key for Redo. See [Undo and redo](../../Code/Editor#undo-and-redo).

**Cut**, **Copy** and **Paste**
: The editor's own clipboard commands, with the keys <kbd>Shift</kbd>+<kbd>Delete</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd> as well as the usual ones. **Paste** re-indents the text to the code around it. See [Copy, cut and paste](../../Code/Editor#copy-cut-and-paste).

**Paste As Comment** (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd>)
: Pastes the clipboard text with `' ` before each line that is not blank.

**Delete** (<kbd>Delete</kbd>)
: In the code editor, deletes the selected text, or the character after the caret when nothing is selected. In the form designer, deletes the selected controls, and the controls inside any container among them. It is greyed out when no control is selected. See [Copy, cut, paste and delete](../../Forms/Controls#copy-cut-paste-and-delete).

**Select All** (<kbd>Ctrl</kbd>+<kbd>A</kbd>)
: In the code editor, selects the whole file. In the form designer, selects every control on the form, including those inside containers, but not the form itself. See [Select controls](../../Forms/Controls#select-controls).

## Find and replace

**Find...** (<kbd>Ctrl</kbd>+<kbd>F</kbd>) and **Replace...** (<kbd>Ctrl</kbd>+<kbd>H</kbd>)
: Both open the **FIND / REPLACE** panel and fill it with the word at the caret. See [Finding](../../Code/Finding).

**Find In Project...** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>)
: Opens the same panel with **Current Project** ticked. It has no list of results. See [Search the whole project](../../Code/Finding#search-the-whole-project).

**Quick Find...** (<kbd>Alt</kbd>+<kbd>F</kbd>), **Quick Replace...** (<kbd>Alt</kbd>+<kbd>H</kbd>) and **Select All Matches** (<kbd>Alt</kbd>+<kbd>A</kbd>)
: Search the current file with a small box over the code, and give a cursor to every match. Their names are in English whatever the IDE language is. See [Quick Find](../../Code/Finding#quick-find).

## Indent and format

**Indent** (<kbd>Ctrl</kbd>+<kbd>]</kbd>) and **Outdent** (<kbd>Ctrl</kbd>+<kbd>[</kbd>)
: Move the selected lines one level in or out. See [Indent and outdent](../../Code/Editor#indent-and-outdent).

**Format Selection** and **Format Document**
: Re-indent the selection or the file, four spaces to a level. They have no keys. See [Format the code](../../Code/Editor#format-the-code).

## Fold and unfold

**Fold** (<kbd>Ctrl</kbd>+<kbd>{</kbd>) and **Unfold** (<kbd>Ctrl</kbd>+<kbd>}</kbd>)
: Fold and unfold the block at the caret.

**Fold Procedures** (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Left</kbd>) and **Unfold Procedures** (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Right</kbd>)
: Fold or unfold every procedure except the one the caret is in.

**Fold All** and **Unfold All**
: Fold or unfold every block in the file. These two have no keys. See [Folding](../../Code/Editor#folding).

## Go to and transform

**Go To Line/Column...**
: Opens a box that takes a line number, or `line:column`. It has no key. See [Go to a line](../../Code/Navigating#go-to-a-line).

**Transform To Uppercase**, **Transform To Lowercase**, **Transform To Titlecase** and **Transform To Snakecase**
: Change the case of the selected text. They have no keys. See [Change case](../../Code/Editor#change-case).
