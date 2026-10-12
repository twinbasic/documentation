---
title: File
parent: Menu
grand_parent: IDE Reference
nav_order: 1
permalink: /tB/IDE/Reference/Menu/File
redirect_from:
  - /tB/IDE/Project/Menu/File
---

# File Menu

The File menu holds the commands that open, save, close, export and build a project. [Saving and exporting](../../Projects/Saving-and-Exporting) explains the first four.

![The File menu open below the menu bar with no project loaded, in five groups divided by lines. New Project, Open Project, Open Recent and Exit are available, and every other item is greyed out. Each item has an icon except Open Recent and Close Project, and five show a key at the right: Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+E and Alt+F4.](Images/Menu_File.png){:width="190" height="337"}

The commands from **Close Project** to **Clean** work on the open project, and are greyed out when none is open.

## Open and close

**New Project...** (<kbd>Ctrl</kbd>+<kbd>N</kbd>) and **Open Recent...**
: Open the **New / Open Project** dialog, on its **New** tab and on its **Recent** tab. Nothing is closed until you press **Open** in it. See [New Project](../../Project/New) and [Open a project](../../Projects/Saving-and-Exporting#open-a-project).

**Open Project...** (<kbd>Ctrl</kbd>+<kbd>O</kbd>)
: Opens a project file, or a `.vbp` file, which is imported as a new project. See [Open a project](../../Projects/Saving-and-Exporting#open-a-project).

**Close Project**
: Closes the project, after a question if it has unsaved changes. It has no key. See [Close Project and Exit](../../Projects/Saving-and-Exporting#close-project-and-exit).

**Exit** (<kbd>Alt</kbd>+<kbd>F4</kbd>)
: Closes the project, after the same question, and ends the IDE.

## Save

**Save Project** (<kbd>Ctrl</kbd>+<kbd>S</kbd>)
: Saves the whole project, with every open editor. For a project with no file, it asks for one first. See [Save Project](../../Projects/Saving-and-Exporting#save-project).

**Save Project As...**
: Saves the project to a file that you choose, and keeps that file as the project's. It has no key. See [Save Project As](../../Projects/Saving-and-Exporting#save-project-as).

**Save Current Document**
: Is always greyed out, and has no key. The IDE saves the whole project, not one file.

## Export

**Export Project...** (<kbd>Ctrl</kbd>+<kbd>E</kbd>)
: Writes the project out to a folder as separate files, after it deletes everything in that folder. See [Export Project](../../Projects/Saving-and-Exporting#export-project), and read its warning first.

## Build and Clean
{: #build }

**Build**
: Compiles the project into the file that the [*Build Output Path*](../../Project-Settings#build-output-path) setting names. The project templates set it to `${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}`, a file in a `Build` folder beside the `.twinproj`. `${Architecture}` is `win32` or `win64`, as chosen in the [build configuration](../Toolbar#build-configuration) box on the toolbar. It has no key.

**Clean**
: Deregisters the previously built DLL, if there is one, and deletes the previous build file. It has no key.
