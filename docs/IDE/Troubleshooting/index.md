---
title: When something goes wrong
parent: IDE
nav_order: 10
permalink: /tB/IDE/Troubleshooting/
has_toc: false
index:
  - troubleshooting
  - crash
  - something goes wrong
index_also:
  - problems
---

# When something goes wrong

The IDE is a web page that runs inside a native window, and it does no compiling itself. It starts a separate **compiler** process and talks to it over four connections. Most of what goes wrong is one of those connections failing, a file the IDE needs being gone, or a save that cannot write. This chapter says what each kind of failure looks like, what the IDE does about it, and what to do.

The IDE keeps no log file of its own, and it shows no crash dialog. What it has to say goes to three places: a line in the **DEBUG CONSOLE**, a floating message box above the status bar, or a dialog. Many failures leave only one console line.

## What you see

| What you see | Where to look |
|---|---|
| **tB Services: UNAVAILABLE** or **LIMITED** with a project open, and it does not change back | [Compiler services](Compiler-Services#the-services-badge) |
| A console line `restarting from MEMORY [...]` that you did not ask for | [A crash](Compiler-Services#a-crash) |
| The floating message **Compiler crash loop detected.  Restarting in SAFE mode.**, or a box about **SafeMode** | [The crash loop](Compiler-Services#the-crash-loop) and [Safe Mode](Compiler-Services#safe-mode) |
| The build box reads **safeMode**, **Build** does nothing, or **Start** never ends | [Safe Mode](Compiler-Services#safe-mode) |
| **Please wait...** covers the IDE and does not go away, or a box titled **shutdown** | [A linked package's missing file](Compiler-Services#a-linked-packages-missing-file) |
| A box says the IDE **timed out** | [When the compiler does not answer](Compiler-Services#when-the-compiler-does-not-answer) |
| An alert says **save project failed** | [A save that fails](Saving#a-save-that-fails) |
| The title bar names a file you did not open, after a failed **Save As** | [A failed Save As](Saving#a-failed-save-as) |
| The IDE ended, and the edits since your last save are gone | [No autosave and no recovery](Saving#no-autosave-and-no-recovery) |
| A red `NATIVE EXCEPTION` line in the **DEBUG CONSOLE** | [Native exceptions](Diagnostic-Tools#native-exceptions) |
| `IDE internal error:` in the console, or an alert titled **IDE startup failure** | [IDE internal errors](Diagnostic-Tools#ide-internal-errors) |
| `command failed:` in the console | [A command that fails](Diagnostic-Tools#a-command-that-fails) |
| An add-in did not load, or you need the project to load without its add-ins | [Add-ins that fail to load](Diagnostic-Tools#add-ins-that-fail-to-load) |
| A box at start-up: **ERROR: failed to load the twinBASIC DLL:**, **failed to load the twinBASIC EXE:**, or **shutdown** | [A damaged install](Missing-Files#a-damaged-install) |
| A box about the **WebView2 control** | [The WebView2 runtime](Missing-Files#the-webview2-runtime) |
| **Licence Problem!**, **Invalid licence key.  Please try again.**, or **[BUILD] failed due to licence error.  Please try again.** | [The licence](Missing-Files#the-licence) |
| **Failed to connect to the online package server.** | [The package server](Missing-Files#the-package-server) |
| You want the IDE's options back to their defaults | [Where the IDE keeps its settings](Missing-Files#where-the-ide-keeps-its-settings) |
| A project will not open: **Failed to load the project**, or the box titled **bad file format** | [When a project will not open](../Starting/Opening-Projects#when-a-project-will-not-open) |
| A compile error that says **PLEASE REPORT THIS ERROR** | [When the project does not compile](../Debugging/Running#when-the-project-does-not-compile) |
| A paused program ends in a native access violation after **Break** | [Break](../Debugging/Running#break) |
| A run-time error panel under a line of code | [Breakpoints and stepping](../Debugging/Breakpoints-and-Stepping) |

## The pages of this chapter

- [**Compiler services**](Compiler-Services) --- the services badge and every state it reads, what a compiler crash looks like, **Restart the compiler** and what it keeps, the crash loop, Safe Mode, and the compiler that does not answer or cannot be reached.
- [**Saving**](Saving) --- a save that fails, the failed **Save As**, what the IDE keeps of a project outside its file, and why nothing recovers unsaved edits.
- [**Diagnostic tools**](Diagnostic-Tools) --- the lines the **DEBUG CONSOLE** writes when something fails, TRACE mode, DevTools, the floating message boxes, errors in the IDE's own code, and automatic error reporting.
- [**Missing files and the install**](Missing-Files) --- the boxes of a damaged install, the licence and the package server when they fail, the folders the IDE uses, and how to put the IDE's options back.

## Reporting a problem

The IDE has no **Report this** button and no report file. To report a problem with twinBASIC, open an issue on [the twinBASIC repository on GitHub](https://github.com/twinbasic/twinbasic/issues), or write in the `#bugs` channel of the Discord server. The [FAQ](../../../FAQ#bug-reporting) says what to include. The GitHub icon in the status bar and **Help → Help & Support (GitHub repository)...** open the repository's front page, not the form for a new issue.

## What the IDE does not provide

So that you do not look for them:

- A log file, a crash dump or a recovery file.
- An automatic save or a backup. See [No autosave and no recovery](Saving#no-autosave-and-no-recovery).
- A command or a menu item that resets every setting. The one reset is a switch on the IDE's command line, and it resets the IDE Options only. See [Where the IDE keeps its settings](Missing-Files#where-the-ide-keeps-its-settings).
- A way to start the IDE in a safe state. Safe Mode is an entry of the build configuration box, and it applies to a project that is open.
- A watchdog on the compiler. The IDE has no state for a compiler that is not responding, and no way to cancel a long operation other than the compiler's own **Stop** and a restart.
- A key for **Restart the compiler**, for TRACE mode or for DevTools, and a menu item or a button for DevTools.
- A click on the services badge. Only the licence badge, the links, the **PROCESS** boxes and the line and column box respond to a click.

## See Also

- [Status Bar](../Reference/StatusBar) -- the boxes along the bottom of the window
- [Opening projects](../Starting/Opening-Projects) -- what happens as a project loads, and when one will not open
- [Running and debugging](../Debugging/) -- the run-time error panel, **Break**, and what ends a run
- [Customising the IDE](../Customising/) -- the IDE Options and where the IDE keeps its settings
