---
title: Build configuration
parent: Building
grand_parent: IDE
nav_order: 2
permalink: /tB/IDE/Building/Build-Configuration
index:
  - win32
  - win64
  - safe mode
  - 32-bit
  - 64-bit
  - target architecture
---

# Build configuration

The box to the left of the toolbar's build buttons chooses the architecture that the project is compiled for, and starts the compiler in safe mode. It is the only build setting that is a choice of the IDE and not a setting of the project.

![The IDE toolbar with a project open but not running.](../Images/Toolbar_2.png){:width="1228" height="35"}

The box is a drop-down list with three entries, and its tooltip is **Choose a build configuration**.

**win32**
: Compiles a 32-bit program.

**win64**
: Compiles a 64-bit program. See [Project Types](../../../Features/Project-Configuration/Project-Types#calling-a-standard-dll-from-vba-or-excel) for a DLL called from VBA or Excel.

**safeMode**
: Opens the project without the compiler. See [Safe mode](#safe-mode).

<!-- SHOT building-config-box: a saved project open, the build configuration box with its list open over the toolbar, win32 selected and win64 and safeMode below it. Why: the list is the whole of the chapter's "configuration", and the page describes three entries a reader can count in a glance. -->

There are no **Debug** and **Release** entries, and none for AnyCPU or ARM. The split between the program that runs in the IDE and the program that a build writes is made in [Project Settings](../Project-Settings), by two sets of options: [*Compiler Options (BUILD)*](../Project-Settings#compiler-options-build) for **Build** and [*Compiler Options (DEBUG)*](../Project-Settings#compiler-options-debug) for **Start**.

## Changing the architecture

<kbd>Ctrl</kbd>+<kbd>F1</kbd> chooses **win64** and <kbd>Ctrl</kbd>+<kbd>F2</kbd> chooses **win32**. They do nothing when the box already shows the entry. [Manage Keyboard Shortcuts](../Customising/Keyboard-Shortcuts) can change them.

A change restarts the compiler as a program of the other architecture. The IDE does not ask first. A program that is running or paused is ended at once. While the new compiler loads the project, a box that says **Please wait...** covers the IDE, for about ten seconds in a small project. Then:

- the **CALL STACK**, **VARIABLES**, **WATCHES** and **HISTORY** panels and the list of running programs are empty;
- the **DIAGNOSTICS** rows are cleared;
- every open form designer shows the [RESYNC](../Forms/Previewing#resync) treatment, as it does after any restart of the compiler.

With no project open, nothing restarts: the box only sets what the next project will use.

## What the choice changes

- **The file.** A **win32** build writes a 32-bit file and a **win64** build a 64-bit one. `${Architecture}` in the [*Build Output Path*](../Project-Settings#build-output-path) is `win32` or `win64`, and `${Bitness}` is `32` or `64`. The default path puts `${Architecture}` in the file name, so the two builds sit side by side.
- **The code.** `#If Win64` is true in **win64** and false in **win32**, and `LongPtr` is 8 bytes in **win64**. The editor treats a branch of an `#If Win64` block as active or greys it out to match. [Compiler Constants](../../../Reference/Compiler-Constants#appearance) shows the same code in both modes.
- **The program that runs in the IDE.** **Start** (<kbd>F5</kbd>) and **Run Or Preview** (<kbd>F6</kbd>) run the project in the compiler process, so a **win64** run is a 64-bit program. See [Running](../Debugging/Running#what-start-runs).

Two other settings of the project decide which compiler program runs it: [*Large Address Aware (LAA)*](../Project-Settings#large-address-aware-laa) and [*Data Execution Prevention Aware (DEP)*](../Project-Settings#data-execution-prevention-aware-dep). When the project's settings do not match the compiler that is running, the IDE starts a compiler that does, and loads the project in it. The built file follows the same two settings.

## Where the choice is kept

The IDE keeps the choice for each project, under the path of its `.twinproj` file, in its own settings (the `targetArchitectureMemory` value; see [where the IDE keeps its settings](../Customising/#where-the-ide-keeps-its-settings)). It is not in the project: the `Settings` file does not hold it, and a copy of the project on another machine starts with the box as that machine's IDE shows it.

When you open a project from its file, from **Open Recent** or from the command line, the IDE sets the box to the remembered choice before the project loads. A project with no remembered choice leaves the box as it is. A project made from a template, a sample or a folder reads no choice, and a project imported from a VB6 project starts as **win32**. A project that was never saved has no path, so its choice lasts for the session.

## Safe mode

**safeMode** opens the project's files without starting the compiler's services. It gives access to the project's files when the compiler's services get in the way, for example when the compiler keeps crashing. After a project loads in safe mode, a box explains it, in these words: **SafeMode is designed to give you access to the file system of your project, without starting all of the associated compiler services. Use this mode to investigate / fix / recover your code before saving and restarting in normal mode.** Choose **OK**.

<!-- SHOT building-safe-mode-box: a saved project, the box set to safeMode with the keyboard (Down twice from win32), the modal box with its text and OK. Why: the box is the only sign that the IDE is in safe mode. -->

In safe mode:

- **Build** and **Clean** look available and do nothing. No line is written and no box opens.
- The DIAGNOSTICS rows are not cleared, and the form designer's **RESYNC** button answers **Can't resync the form designer in Safe Mode**.
- The choice is not remembered, and no remembered choice is read when a project opens.

The IDE switches to safe mode on its own when it has restarted the compiler more than three times in 60 seconds. It says **Compiler crash loop detected.  Restarting in SAFE mode.**

## Restart the compiler

The toolbar button **Restart the compiler** and **Tools → Restart the compiler** end the compiler and start a new one, for the architecture the box shows. With <kbd>Alt</kbd> held, the button also restarts the process that caches LLVM code. [Running](../Debugging/Running#restarting-the-compiler) describes what a restart does to a running program.

## See Also

- [Toolbar](../Reference/Toolbar#build-configuration) -- the box among the other buttons
- [Build and Clean](Build-and-Clean) -- the commands that use the choice
- [What a build writes](Build-Output) -- the name of the file for each choice
- [64-bit](../../../Features/64bit) -- writing code for both architectures
- [Project Settings](../Project-Settings) -- *Compiler Options*, *Large Address Aware* and *Data Execution Prevention Aware*
