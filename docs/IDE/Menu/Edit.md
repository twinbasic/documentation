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

![The Edit menu open with every command greyed out. Its groups run from Undo and Redo through the clipboard commands, Find, Replace and Find In Project, the indent and format commands, the Quick Find group, the fold and unfold commands, and finally Go To Line/Column and four Transform To case commands. Most entries show a keyboard shortcut at the right.](Images/Menu_Edit.png){:width="297" height="748"}

The picture shows the menu with nothing in focus. The commands act on the code editor, so which ones are available depends on what has the focus. While the code editor has the focus, **Paste As Comment** also appears, between **Paste** and **Delete**, and no command is greyed out. While the form designer has the focus, **Paste As Comment** is missing and the text commands, from **Cut** and **Copy** to the **Transform To** items, are greyed out.

<!-- SHOT code-edit-menu-editor: the Edit menu open while a code editor has the focus, with Paste As Comment visible between Paste and Delete and nothing greyed out -->

## Undo and the clipboard

**Undo** (<kbd>Ctrl</kbd>+<kbd>Z</kbd>) and **Redo** (<kbd>Ctrl</kbd>+<kbd>Y</kbd>)
: Step back and forward through the changes to the file. There is no second key for Redo. See [Undo and redo](../../Code/Editor#undo-and-redo).

**Cut**, **Copy** and **Paste**
: The editor's own clipboard commands, with the keys <kbd>Shift</kbd>+<kbd>Delete</kbd>, <kbd>Ctrl</kbd>+<kbd>Insert</kbd> and <kbd>Ctrl</kbd>+<kbd>V</kbd> as well as the usual ones. **Paste** re-indents the text to the code around it. See [Copy, cut and paste](../../Code/Editor#copy-cut-and-paste).

**Paste As Comment** (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd>)
: Pastes the clipboard text with `' ` before each line that is not blank.

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
