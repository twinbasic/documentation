---
title: Title Bar
parent: IDE Reference
grand_parent: IDE
nav_order: 12
permalink: /tB/IDE/Reference/TitleBar
---

# Title Bar

The title bar runs along the top of the IDE window. It holds the [menus](Menu), the project's name, a badge that appears when the IDE runs as an administrator, and the window's buttons.

## The title

The title is the name of the project's file, without its folder, then ` - twinBASIC` and the IDE's version in brackets. A bullet before the name means the project has unsaved changes. A project that was never saved is called `Unsaved.twinproj`. Hold the pointer over the title to see the full path of the file. The title is empty when no project is open. The window's own title, the one Windows shows for the window, is the same text.

Double-click the title to maximise the window, or to restore it when it is maximised. To move the window, press the mouse button on the title and hold it for about a quarter of a second, then drag. A shorter press does nothing.

## The ADMIN badge

The word **ADMIN** in orange, after the title, means that the IDE was started with administrator rights (*Run as administrator*). Hold the pointer over it for the tip *The IDE is running in elevated mode*. Nothing shows when the IDE is not elevated.

The badge matters for a project that registers its DLL in the machine-wide part of the registry, which only an administrator can write: an IDE that is not elevated opens a warning box as such a project loads, and the registration fails during the build. See [The warning at the machine-wide registry](../Building/ActiveX-Registration#the-warning-at-the-machine-wide-registry).

## The window buttons

The three buttons at the right-hand end minimise, maximise or restore, and close the window. Their tips are *Minimize Window*, *Maximize/Restore Window* and *Close twinBASIC*.

**Minimize**
: Minimises the IDE window, and the IDE's tool windows with it.

**Maximize** or **Restore**
: Maximises the window, or restores it when it is maximised. The button's picture shows which of the two it will do.

**Close**
: Does what **Exit** on the [File menu](Menu/File) does. When the project has unsaved changes, it asks first whether to save, with the buttons **Save**, **Discard Changes** and **Cancel**. See [Close Project and Exit](../Projects/Saving-and-Exporting#close-project-and-exit).

## The Windows title bar

The option **Show real OS titlebar** in the [IDE Options](../Customising/IDE-Options#window-and-status-bar) gives the window the title bar of Windows instead of the title and the three buttons above. The change takes effect the next time the IDE starts. The **ADMIN** badge stays.

## See Also

- [Menu](Menu) -- the menus in the title bar
- [Toolbar](Toolbar) -- the buttons under the menu bar
- [Status Bar](StatusBar) -- the strip along the bottom of the window
