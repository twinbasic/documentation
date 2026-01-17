---
title: Project Explorer
parent: IDE
# nav_order: 2
permalink: /tB/IDE/Project/Explorer
---

# Project Explorer

![Project Explorer](Images/ProjectExplorer.png "Project Explorer")
![Project Explorer Sample](Images/ProjectExplorer_Sample.png "Project Explorer Sample")

![Folder](Images/Folder.png "Folder") ImportedTypeLibraries  
![Folder](Images/Folder.png "Folder") Miscellaneous  
![Folder](Images/Folder.png "Folder") Packages  
  <!-- ![Folder](Images/Folder.png "Folder") VB   -->
  <!-- ![Folder](Images/Folder.png "Folder") VBA   -->
  <!-- ![Folder](Images/Folder.png "Folder") VBComDlg   -->
  <!-- ![Folder](Images/Folder.png "Folder") VBRUN   -->
  <!-- ![Folder](Images/Folder.png "Folder") WinNativeCommonCtls   -->
![Folder](Images/Folder.png "Folder") References  
![Folder](Images/Folder.png "Folder") Resources  
![Folder](Images/Folder.png "Folder") Sources  

When a Project is open contextual icons will appear.

![Project Explorer Header](Images/ProjectExplorer_Header.png "Project Explorer Header")

## Project Settings

![Settings](Images/Settings.png "Settings")

- [Info](/tB/IDE/Project/Settings)

## Toggle file view (<kbd>CTRL</kbd> + <kbd>R</kbd>)

![Toggle](Images/Toggle.png "Toggle")

## Add...

![Add](Images/Add.png "Add")

Same as Right-Click

> [!NOTE]
>
>  TODO: Add each Menu item.

## Right-Click - Add

![Right-Click Add](Images/RightClick-Add.png "Right-Click Add")

- ![Folder](Images/Folder.png "Folder") Add Folder
- ![](Images/tb-Green.png "") Add Windows Form
- ![](Images/tb-Green.png "") Add Windows MDI Form
- ![](Images/tb-Green.png "") Add Windows UserControl
- ![](Images/tb-Green.png "") Add Windows PropertyPage
- ![](Images/tb-Green.png "") Add Windows Report
- ---
- ![](Images/tb-Green.png "") Add CustomControls Form
- ---
- ![Module](Images/tb-Red.png "Module") Add Module (.TWIN supporting Unicode)
- ![Class](Images/tb-Red.png "Class") Add Class (.TWIN supporting Unicode)
- ---
- ![Module](Images/tb-Blue.png "Module (BAS)") Add Module (.BAS)
- ![Class](Images/tb-Orange.png "Class (CLS)") Add Class (.CLS)
- ---
- ![File](Images/File-Green.png "File") Add Other File
- ---
- ![File](Images/File-Green.png "File") Import
- ---
- Add Resource: Visual Styles Manifest
- Add Resource: String Table
- Add Resource: MESSAGETABLE

## Folder

![Folder](Images/Folder.png "Folder")

## Windows Form

- ![](Images/tb-Green.png "") [tbForm](/tB/IDE/Project/Editor/Form)

## Windows MDI Form

![](Images/tb-Green.png "")

## Windows UserControl

![UserControl](Images/UserControl.png "UserControl")

## Windows PropertyPage

![](Images/tb-Green.png "")

## Windows Report

- ![](Images/tb-Green.png "") [tbReport](/tB/IDE/Project/Editor/Report)

## CustomControls Forms

![](Images/tb-Green.png "")

![Add CustomControls Form Popup](Images/RightClick-Add-CustomControlsForm-Popup.png "Add CustomControls Form Popup")

## Module

![Module](Images/tb-Red.png "Module")

## Class

![Class](Images/tb-Red.png "Class")

## Other File

![File](Images/File-Green.png "File")

## Import

![File](Images/File-Green.png "File")

## Resource: Visual Styles Manifest

See ![Folder](Images/Folder.png "Folder") `/.../Resources/MANIFEST/#1.xml`

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
   <assemblyIdentity
      type="win32"
      processorArchitecture="*"
      name="My_twinBASIC_Application"
      version="1.0.0.0"
   />
   <description>Application description here</description>
   <dependency>
      <dependentAssembly>
         <assemblyIdentity
            type="win32"
            processorArchitecture="*"
            name="Microsoft.Windows.Common-Controls"
            version="6.0.0.0"
            publicKeyToken="6595b64144ccf1df"
            language="*"
         />
      </dependentAssembly>
   </dependency>
</assembly>
```

## Resource: String Table

See ![Folder](Images/Folder.png "Folder") `/.../Resources/STRING/Strings.json`

```json
[
    {
        "id": 101,
        "name": "MyLocalizedString1",
        "LCID_0000": "This is my NEUTRAL text for MyLocalizedString1",
        "LCID_0409": "This is my USA text for MyLocalizedString1",
        "LCID_0407": "This is my GERMAN text for MyLocalizedString1",
        "LCID_0809": "This is my UK text for MyLocalizedString1"
    },
    {
        "id": 102,
        "name": "MyLocalizedString2",
        "LCID_0000": "This is my NEUTRAL text for MyLocalizedString2",
        "LCID_0409": "This is my USA text for MyLocalizedString2",
        "LCID_0407": "This is my GERMAN text for MyLocalizedString2",
        "LCID_0809": "This is my UK text for MyLocalizedString2"
    }
]
```

## Resource: MESSAGETABLE

See ![Folder](Images/Folder.png "Folder") `/.../Resources/MESSAGETABLE/Strings.json`

```json
{
    "events": 
    [
        {
            "id": -1073610751,
            "name": "service_started",
            "LCID_0000": "%1 service started"
        },
        {
            "id": -1073610750,
            "name": "service_startup_failed",
            "LCID_0000": "%1 service startup failed"
        },
        {
            "id": -1073610749,
            "name": "service_ended",
            "LCID_0000": "%1 service ended"
        },
        {
            "id": -1073610748,
            "name": "service_stopping",
            "LCID_0000": "%1 service stopping"
        }
    ],
    "categories": 
    [
        {
            "id": 1,
            "name": "status_changed",
            "LCID_0000": "Status Changed"
        }
    ]
}
```
