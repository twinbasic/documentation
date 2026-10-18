---
title: Building
parent: IDE
nav_order: 7
permalink: /tB/IDE/Building/
has_toc: false
index_also:
  - build
index:
  - make an exe
  - compile to a file
---

# Building

A build turns the project into a file: an executable, a DLL, an ActiveX control or a package. The IDE does not compile anything itself. It asks the compiler to build, and shows the compiler's log in the **DEBUG CONSOLE**.

- [**Build and Clean**](Build-and-Clean) --- the two commands, the question for a project with no file, what the console prints, and what to do when a build fails or cannot replace the old file.
- [**Build configuration**](Build-Configuration) --- the box on the toolbar: 32-bit, 64-bit and safe mode, and what a change does.
- [**What a build writes**](Build-Output) --- the file, its path and name, the version numbers, the Fusion host, the **Open Build Output Folder** command, and what each project type produces.
- [**ActiveX registration**](ActiveX-Registration) --- how an ActiveX DLL or control is registered after a build, the warning for the machine-wide registry, and how Clean takes it away.
- [**LLVM in the IDE**](LLVM-in-the-IDE) --- the progress box, the licence banners, and the cache.
- [**Package Publishing**](Package-Publishing) --- the pane that sets a package's details, and the button that publishes it.

The commands are listed by menu in the [File menu](../Reference/Menu/File#build) and [Project menu](../Reference/Menu/Project) reference pages, and as buttons in the [Toolbar](../Reference/Toolbar).

## What the IDE offers

The IDE has two build commands, **Build** and **Clean**. They are in the **File** menu and on the toolbar, and a project must be open. Neither has a key.

| Command | Where | Key |
|---|---|---|
| **Build** | **File → Build**; the toolbar button **Build** | none |
| **Clean** | **File → Clean**; the toolbar button **Clean (deregister & delete build)** | none |
| Build configuration | The box to the left of the toolbar's build buttons | <kbd>Ctrl</kbd>+<kbd>F1</kbd> chooses **win64**, <kbd>Ctrl</kbd>+<kbd>F2</kbd> chooses **win32** |
| **Restart the compiler** | The toolbar button; **Tools → Restart the compiler** | none |
| Build the Fusion host | No menu item and no button | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> |

[Manage Keyboard Shortcuts](../Customising/Keyboard-Shortcuts) can give **Build** and **Clean** keys of their own.

The IDE has no **Rebuild**, no **Build All** and no choice between an incremental and a full build. It has no **Debug** and **Release** configurations: the only configuration is the architecture, and the pair of *Compiler Options* in [Project Settings](../Project-Settings#compiler-options-build) is the nearest thing to the split. It has no setting for signing the built file, and no menu command or key that runs the built file: the console's **Launch EXE** link does. A signing tool is run from a procedure with the [**RunAfterBuild**](../../Core/Attributes#runafterbuild) attribute, and [**App.LastBuildPath**](../../Packages/AppGlobalClassObject/_App/LastBuildPath) says where the file is.

The build log is the **DEBUG CONSOLE**. The IDE writes no log file, and the console ends a build with a line for the file, not with a summary such as "Build succeeded".

## What a build does not do

- **It does not save.** The compiler builds the project as the IDE holds it, with every edit you have made, saved or not. The `.twinproj` file is not written, and the open editors are not saved. [Build and Clean](Build-and-Clean#unsaved-changes) has the details.
- **It does not run the program.** **Start** (<kbd>F5</kbd>) runs the project inside the compiler, without a built file. See [Running](../Debugging/Running#what-start-runs). To run the built file, use the **Launch EXE** link that the console shows after the build, or open the file's folder and start it as any other program. A file that you start from Windows Explorer has no **PROCESS** box in the status bar, which lists only programs that your program starts. See [Running](../Debugging/Running#programs-that-your-program-starts).

## See Also

- [Project Settings](../Project-Settings) -- *Build Type*, *Build Output Path*, the version numbers and the other settings of a build
- [Project Types](../../../Features/Project-Configuration/Project-Types) -- Standard DLLs, console programs, services and drivers
- [Running and debugging](../Debugging/) -- running a project in the IDE
- [Toolbar](../Reference/Toolbar) -- the buttons of the toolbar
