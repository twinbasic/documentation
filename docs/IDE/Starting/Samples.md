---
title: Samples
parent: Starting a project
grand_parent: IDE
nav_order: 5
permalink: /tB/IDE/Starting/Samples
index:
  - sample projects
  - samples
  - example projects
---

# Samples

The IDE ships with 26 sample projects, in the **Samples** section of the [**New / Open Project**](New-Project) dialog. This page says how a sample opens, what each one shows, and what it needs before it runs.

![The New / Open Project dialog on its Samples section: two columns of sample cards named without their numbers, the first, Reports (Experimental), selected, then HelloWorld, WebView2 Examples, Chromium Embedded Framework Examples, GetIPAddresses and MyCodeLibrary.](../Images/New_Project_Samples.png){:width="970" height="728"}

## How a sample opens

A sample opens like a template. Double-click its card, or select it and press **Open**. The **New Project Options** box opens first. **Continue** makes the sample as a new project, unsaved, in memory. The first save asks for a file name, and the sample on disk stays as it is. See [What a new project is](New-Project#what-a-new-project-is).

The box's rows apply to a sample too. The **Project Name** starts as the sample's own project name, such as `HelloWorldProject` for **HelloWorld**, and **Continue** sets the project's name, description and application title to the text of the box. The **Include Common Controls** row shows for the samples that reference WinNativeForms and not WinNativeCommonCtls yet, and **Visual Styles** does not show for a sample that has a manifest already, such as **TreeView + ListView + ImageList**. See [New Project Options](New-Project#new-project-options).

A card shows the sample's name without its number, and the cards are in the order of the numbers. The numbering is the IDE's own: **1a** and **1b** follow **1**, and **10** follows **9**. The documentation names a sample by its number, as in *Sample 6*, so the table below gives both.

## Where a sample builds

**Samples 10 to 16 build into the IDE's own folder.** Their *Build Output Path* is `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}`, so a build of one installs the add-in in the folder of the running IDE, as `addins\win32` or `addins\win64`. It loads at the next start of the IDE. Holding <kbd>Shift</kbd> while a project loads stops add-ins loading; see [Opening projects](Opening-Projects#what-happens-as-a-project-loads). [Add Ins](../AddIns/) describes add-ins.

The other samples build into a `Build` folder beside the project's file, once the project is saved.

## The samples

| Sample | Project type | What it shows | Where the documentation uses it |
|---|---|---|---|
| **0.** Reports (Experimental) | Standard EXE | A form that opens two [reports](../../Packages/VB/Report/). One takes its rows from an ADODB recordset made in memory, the other from a class that implements **ITbRecordset** | none |
| **1.** HelloWorld | Standard EXE | The smallest program: a `Sub Main` that shows a message box | none |
| **1a.** WebView2 Examples | Standard EXE | Four forms on the WebView2 control: a browser with a log of its events, a local web page that exchanges calls with twinBASIC, the Monaco editor with a live preview, and a Markdown preview. Uses the WebView2 package | the [WebView2 tutorials](../../../Tutorials/WebView2/) |
| **1b.** Chromium Embedded Framework Examples | Standard EXE | The same four forms on the **CefBrowser** control. Uses the CEF package | the [CEF tutorials](../../../Tutorials/CEF/) |
| **2.** GetIPAddresses | Standard EXE | Calls the Windows API through **Declare**, and shows the machine's IPv4 addresses in a message box | none |
| **3.** MyCodeLibrary | ActiveX DLL | A COM class with one method, for a host such as VBA to call | none |
| **4.** MyVBEAddin (NEW with ToolWindow) | ActiveX DLL | An add-in for the VBA editor: a tool window made from a user control, and an item on the editor's **Add-Ins** menu that shows or hides it. References the Microsoft Add-In Designer and the VBA Extensibility 5.3 type libraries | the [FAQ on add-ins](../../../FAQ#addins) |
| **5.** MyCOMAddin | ActiveX DLL | A COM add-in for Excel and Access: a ribbon tab, *twinBASIC Test*, with a button that shows a message box. References the Microsoft Add-In Designer and the Office 16.0 object library | the [FAQ on add-ins](../../../FAQ#addins) |
| **6.** CustomControls | Standard EXE | Ten forms, each opening the next, on the controls of the CustomControls package: anchoring, borders and corners, buttons, a data grid, docking, fill patterns, a slider, text boxes and text rendering | the [CustomControls tutorial](../../../Tutorials/CustomControls/) |
| **7.** Package | Package TWINPACK | The smallest package: a class and a module, each with a `Show` method | [Creating a TWINPACK Package](../../../Features/Packages/Creating-TWINPACK) |
| **8.** FilePropertyViewer (CustomControls) | Standard EXE | A form that asks for a file and lists its properties in a grid. Uses the CustomControls package and the [FileProps](../../Packages/Contributed/FileProps/) package | none |
| **9.** ActiveX Control WebView2 + Monaco | ActiveX Control | A control for other programs to host. It holds the Monaco editor in a WebView2, with two events and two methods that read and set the text. Uses the WebView2 package | the WebView2 tutorial on the user data folder |
| **10.** twinBASIC IDE Addin | Standard DLL | Two toolbar buttons and a tool window of buttons that call the **Host** object: the project, the DEBUG CONSOLE and the active editor | [Add Ins](../AddIns/), the [FAQ on add-ins](../../../FAQ#addins) and the [tbIDE reference](../../Packages/tbIDE/) |
| **11.** twinBASIC IDE Addin (Chart) | Standard DLL | A line chart in a tool window, which an **AddinTimer** updates every half second with random numbers | the tbIDE reference |
| **12.** twinBASIC IDE Addin (Monaco) | Standard DLL | A Monaco editor in a tool window. Each change prints the text to the DEBUG CONSOLE | the tbIDE reference |
| **13.** twinBASIC IDE Addin (ListView) | Standard DLL | A list in a tool window, with rows of HTML, icons from a style sheet in the project, and a text box in one row. Clicks and key presses reach twinBASIC as events | the tbIDE reference |
| **14.** twinBASIC IDE Addin (VirtualListView) | Standard DLL | A list of 5 million rows in a tool window, which asks twinBASIC for the HTML of a row only when it needs the row | the tbIDE reference |
| **15.** twinBASIC IDE Addin (GlobalSearch) | Standard DLL | The project of the [Global Search](../AddIns/GlobalSearch) add-in that ships with the IDE: a search of the project's files in a tool window, where a click opens a match | the tbIDE reference |
| **16.** twinBASIC IDE Addin (TODO Widgets demo) | Standard DLL | Two toolbar buttons that add a TODO note as a widget inside the code editor and list the notes in a tool window. The notes are saved in the project | none |
| **17.** Static Library Example (SQLITE3) | Standard EXE | Links SQLite into the EXE from `.obj` files, so that the EXE needs no DLL. It makes a database in memory, adds three rows and shows each in a message box | [Static Linking](../../../Features/Advanced/Static-Linking) |
| **18.** Static Library Example (libdeflate) | Standard EXE | Links libdeflate into the EXE from `.a` files in the same way. It compresses a string and expands it again, and prints the bytes to the DEBUG CONSOLE | [Static Linking](../../../Features/Advanced/Static-Linking) |
| **19.** MDI Forms | Standard EXE | An MDI form with red and blue child forms. Its **File** menu adds a child, and its **Window** menu arranges and lists them | none |
| **20.** TreeView + ListView + ImageList | Standard EXE | A form of buttons that fill and clear a TreeView and a ListView, change their icons from an ImageList and switch the ListView's views. Uses the WinNativeCommonCtls package | none |
| **21.** Windows Service Simple Example | Standard EXE | A Windows service that runs for 15 seconds, in an EXE that installs itself. Uses the WinServicesLib package | none |
| **22.** Windows Service Complex Example (inc Event Logging and IPC) | Standard EXE | Two services in one process, which write to the event log and answer requests over named pipes, and a form that installs, starts, stops and queries them. Uses the WinServicesLib, WinEventLogLib and WinNamedPipesLib packages | none |
| **23.** OOP Inheritance Example (Animals) | Standard EXE | A small class hierarchy that prints to the DEBUG CONSOLE, with **Inherits**, **Protected**, **Overridable**, **Overrides** and an inherited event | [Inheritance](../../../Features/Language/Inheritance) |

Samples 10 to 16 use the [tbIDE](../../Packages/tbIDE/) package, and its reference uses Samples 10 to 15 as its examples.

## Before you run a sample

Most samples run with **Start** (<kbd>F5</kbd>) as they are. These need something more.

**Samples 3, 4, 5, 7 and 9 to 16 are not programs.** Each makes a DLL, a control or a package, so **Start** has nothing to run and ends with a compile error in the console. Build them instead:

- A build of Sample 3, 4, 5 or 9 [registers the file](../Building/ActiveX-Registration) for the current user, and **Clean** removes the registration. The file must match the program that loads it: for 64-bit Office, choose **win64** in the [build box](../Building/Build-Configuration).
- The registration of Sample 4 adds it to the VBA editor, and the registration of Sample 5 adds it to Excel and to Access. Each then loads when that program starts.
- Samples 10 to 16 install themselves in the IDE, as [Where a sample builds](#where-a-sample-builds) describes.

**Sample 23 has no `Main`,** so **Start** ends with a compile error there too. Open `Main.twin`, put the caret inside `Sub DemoAnimals` and press <kbd>F6</kbd>. See [Run Or Preview](../Debugging/Running#run-or-preview).

**Samples 1a, 1b and 9 use a browser engine.** Samples 1a and 9 need the WebView2 Runtime. Sample 1b needs the CEF runtime, which is a separate download: see [Runtime files](../../Packages/CEF/#runtime-files). The first form of Samples 1a and 1b opens a web site, so it needs a network connection. Samples 1a and 1b make the folders `tbVirtualHostDemo` and `tbMonacoDemo` in your Documents folder, and Sample 9 makes `tbMonacoActiveXDemo` in your local application data folder. These folders stay after the sample ends.

**Samples 21 and 22 install Windows services,** which needs administrator rights, so they do it only from a built EXE that you start with **Run as administrator**:

- Sample 21 only shows a message box in the IDE. The built EXE offers to install the service, `TBSERVICE000`, which then starts on demand. The sample has no command that removes it. To remove it, run `sc delete TBSERVICE000` from a command prompt started as administrator.
- Sample 22 opens its form in the IDE too, but **Install** refuses there. Its **Uninstall** buttons remove the services. **Launch in-process named pipe server** needs no service, so you can try the form's named pipes without installing anything.

## See Also

- [New Project](New-Project) -- the dialog, and **New Project Options**
- [What Start runs](../Debugging/Running#what-start-runs) -- the startup object, and what **Start** does without one
- [Add Ins](../AddIns/) -- the add-in samples, 10 to 16
