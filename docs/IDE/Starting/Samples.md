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

The IDE ships with 26 sample projects, in the **Samples** section of the [**New / Open Project**](New-Project) dialog. This page says how a sample opens, and what each one is.

![The New / Open Project dialog on its Samples section: two columns of sample cards named without their numbers, the first, Reports (Experimental), selected, then HelloWorld, WebView2 Examples, Chromium Embedded Framework Examples, GetIPAddresses and MyCodeLibrary.](../Images/New_Project_Samples.png){:width="970" height="728"}

## How a sample opens

A sample opens like a template. Double-click its card, or select it and press **Open**. The **New Project Options** box opens first. **Continue** makes the sample as a new project, unsaved, in memory. The first save asks for a file name, and the sample on disk stays as it is. See [What a new project is](New-Project#what-a-new-project-is).

The box's rows apply to a sample too. The **Project Name** starts as the sample's own project name, such as `HelloWorldProject` for **HelloWorld**, and **Continue** sets the project's name, description and application title to the text of the box. The **Include Common Controls** row shows for the samples that reference WinNativeForms and not WinNativeCommonCtls yet, and **Visual Styles** does not show for a sample that has a manifest already, such as **TreeView + ListView + ImageList**. See [New Project Options](New-Project#new-project-options).

A card shows the sample's name without its number, and the cards are in the order of the numbers. The numbering is the IDE's own: **1a** and **1b** follow **1**, and **10** follows **9**. The documentation names a sample by its number, as in *Sample 6*, so the table below gives both.

## Where a sample builds

**Samples 10 to 16 build into the IDE's own folder.** Their *Build Output Path* is `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}`, so a build of one installs the add-in in the folder of the running IDE, as `addins\win32` or `addins\win64`. It loads at the next start of the IDE. Holding <kbd>Shift</kbd> while a project loads stops add-ins loading; see [Opening projects](Opening-Projects#what-happens-as-a-project-loads). [Add Ins](../AddIns/) describes add-ins.

The other samples build into a `Build` folder beside the project's file, once the project is saved.

## The samples

| Sample | Project type | What it holds | Where the documentation uses it |
|---|---|---|---|
| **0.** Reports (Experimental) | Standard EXE | Startup form `MainForm`; 9 files: one form and two reports | none |
| **1.** HelloWorld | Standard EXE | Starts at `Sub Main`; 3 files | none |
| **1a.** WebView2 Examples | Standard EXE | Startup form `MainForm`; 44 files: HTML, JavaScript, CSS and fonts; the WebView2 package | the [WebView2 tutorials](../../../Tutorials/WebView2/) |
| **1b.** Chromium Embedded Framework Examples | Standard EXE | Startup form `MainForm`; 45 files; the CEF package and WinNativeCommonCtls | the [CEF tutorials](../../../Tutorials/CEF/) |
| **2.** GetIPAddresses | Standard EXE | No startup object; 3 files | none |
| **3.** MyCodeLibrary | ActiveX DLL | 3 files | none |
| **4.** MyVBEAddin (NEW with ToolWindow) | ActiveX DLL | 6 files; references the Microsoft Add-In Designer and the VBA Extensibility 5.3 type libraries | the [FAQ on add-ins](../../../FAQ#addins) |
| **5.** MyCOMAddin | ActiveX DLL | 4 files; references the Microsoft Add-In Designer and the Office 16.0 object library | the [FAQ on add-ins](../../../FAQ#addins) |
| **6.** CustomControls | Standard EXE | Starts at `HelloWorld`; 22 files; the CustomControls package | the [CustomControls tutorial](../../../Tutorials/CustomControls/) |
| **7.** Package | Package TWINPACK | 6 files | [Creating a TWINPACK Package](../../../Features/Packages/Creating-TWINPACK) |
| **8.** FilePropertyViewer (CustomControls) | Standard EXE | Starts at `Sub Main`; 5 files; the CustomControls package and FileProps | none |
| **9.** ActiveX Control WebView2 + Monaco | ActiveX Control | 30 files; the WebView2 package | the WebView2 tutorial on the user data folder |
| **10.** twinBASIC IDE Addin | Standard DLL | 3 files; the tbIDE package | [Add Ins](../AddIns/), the [FAQ on add-ins](../../../FAQ#addins) and the [tbIDE reference](../../Packages/tbIDE/) |
| **11.** twinBASIC IDE Addin (Chart) | Standard DLL | 3 files; the tbIDE package | the tbIDE reference |
| **12.** twinBASIC IDE Addin (Monaco) | Standard DLL | 3 files; the tbIDE package | the tbIDE reference |
| **13.** twinBASIC IDE Addin (ListView) | Standard DLL | 4 files; the tbIDE package | the tbIDE reference |
| **14.** twinBASIC IDE Addin (VirtualListView) | Standard DLL | 4 files; the tbIDE package | the tbIDE reference |
| **15.** twinBASIC IDE Addin (GlobalSearch) | Standard DLL | 3 files; the tbIDE package | the tbIDE reference |
| **16.** twinBASIC IDE Addin (TODO Widgets demo) | Standard DLL | 10 files; the tbIDE package | none |
| **17.** Static Library Example (SQLITE3) | Standard EXE | Starts at `Sub Main`; 6 `.obj` files; embeds the ArrayListLib package | [Static Linking](../../../Features/Advanced/Static-Linking) |
| **18.** Static Library Example (libdeflate) | Standard EXE | Starts at `Sub Main`; 5 `.a` files | [Static Linking](../../../Features/Advanced/Static-Linking) |
| **19.** MDI Forms | Standard EXE | Startup form `MyMDIForm`; 9 files | none |
| **20.** TreeView + ListView + ImageList | Standard EXE | Startup form `Form1`; 5 files; WinNativeCommonCtls | none |
| **21.** Windows Service Simple Example | Standard EXE | Starts at `Sub Main`; 6 files; the WinServicesLib package | none |
| **22.** Windows Service Complex Example (inc Event Logging and IPC) | Standard EXE | Starts at `Sub Main`; 14 files; the WinServicesLib, WinEventLogLib and WinNamedPipesLib packages | none |
| **23.** OOP Inheritance Example (Animals) | Standard EXE | No startup object; 7 files; embeds the VBA and VBRUN packages | [Inheritance](../../../Features/Language/Inheritance) |

A file count is the number of files of the sample's own, not counting the packages it embeds. The [tbIDE reference](../../Packages/tbIDE/) uses Samples 10 to 15 as its examples.

## See Also

- [New Project](New-Project) -- the dialog, and **New Project Options**
- [Add Ins](../AddIns/) -- the add-in samples, 10 to 16
