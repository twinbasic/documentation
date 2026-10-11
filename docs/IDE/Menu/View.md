---
title: View
parent: Menu
grand_parent: IDE Reference
nav_order: 3
permalink: /tB/IDE/Reference/Menu/View
redirect_from:
  - /tB/IDE/Project/Menu/View
---

# View Menu

The View menu switches between a file's code and its designer, moves around the code, changes the zoom, and shows the panels of the IDE.

![The View menu open. The upper commands --- Code Editor, Object Designer, Definition, Last Position, Object Browser, Zoom In and Zoom Out --- are greyed out. Below them the seventeen panel names from EDITOR down to MEMORY 1 are all available, each beside its own icon, with CTRL+L against CALL STACK and CTRL+G against DEBUG CONSOLE.](Images/Menu_View.png){:width="218" height="626"}

The picture shows the menu with nothing in focus. The upper commands depend on what has the focus; the panel names are always available.

<!-- SHOT code-view-menu-editor: the View menu open while a code editor has the focus, showing Code Editor greyed, Object Designer, Definition, Last Position, Object Browser greyed, and Increase Font Size and Decrease Font Size with their keys -->

## Code and designer

**Code Editor**
: Shows the code of the current form or control. It is greyed out while the code has the focus.

**Object Designer** (<kbd>Shift</kbd>+<kbd>F7</kbd>)
: Shows the designer of the current form or control.

## Navigation

**Definition** (<kbd>F12</kbd> or <kbd>Shift</kbd>+<kbd>F2</kbd>)
: Goes to where the name at the caret is declared. See [Go To Definition](../../Code/Navigating#go-to-definition).

**Last Position** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F2</kbd>)
: Goes back to the place the caret was before. See [Last Position](../../Code/Navigating#last-position).

**Object Browser**
: Always greyed out. It has no function.

## Zoom

While the code editor has the focus, the menu shows **Increase Font Size** (<kbd>Ctrl</kbd>+<kbd>+</kbd>) and **Decrease Font Size** (<kbd>Ctrl</kbd>+<kbd>-</kbd>) in place of the zoom commands. They change the editor's font by 1px and save the new size at once. See [Word wrap and zoom](../../Code/Editor#word-wrap-and-zoom).

While the form designer has the focus, the menu shows **Zoom In** and **Zoom Out**, which scale the form designer.

## Panels

The last seventeen items show a panel. A panel that is in no layout in use comes up floating. See [Show, hide and focus a panel](../../Customising/Panel-Layouts#show-hide-and-focus-a-panel).

**EDITOR**
: The code editor. See [Writing code](../../Code/).

**PROJECT EXPLORER**
: The files and objects of the project. See [Project Explorer](../../Project/Explorer).

**OPEN EDITORS**, **HISTORY** and **OUTLINE**
: The open files, the places where you edited, and the symbols of the current file. See [Navigating](../../Code/Navigating).

**CALL STACK** (<kbd>Ctrl</kbd>+<kbd>L</kbd>), **VARIABLES**, **WATCHES**, **DEBUG CONSOLE** (<kbd>Ctrl</kbd>+<kbd>G</kbd>) and **MEMORY 1**
: The debugging panels: the chain of calls, the variables in scope, your watch expressions, the program's output and commands, and raw memory. See [Call Stack](../../Project/CallStack), [Variables](../../Project/Variables), [Watches](../../Project/Watches), [Debug Console](../../Project/DebugConsole) and [Memory](../../Project/Memory).

**DIAGNOSTICS**
: The errors and warnings of the project. See [Diagnostics](../../Code/Diagnostics).

**FIND / REPLACE**
: The search panel. See [Finding](../../Code/Finding).

**PACKAGE PUBLISHING**
: The details of a project built as a package. See [Package Publishing](../../Project/PackagePublishing).

**TOOLBAR**
: The row of buttons under the menu. See [Toolbar](../Toolbar).

**TOOLBOX** and **PROPERTIES**
: The controls you can place on a form, and the properties of the selected one. See [Toolbox](../../Project/Toolbox) and [Properties](../../Project/Properties).

**WEBPAGE**
: A web browser pane inside the IDE. See [Webpage](../../Project/Webpage).
