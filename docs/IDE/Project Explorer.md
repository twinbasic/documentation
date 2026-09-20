---
title: Project Explorer
parent: IDE
# nav_order: 2
permalink: /tB/IDE/Project/Explorer
---

# Project Explorer

![The PROJECT EXPLORER panel with no project open: its title bar carries only a drag grip and a close button, and the body below it is empty.](Images/ProjectExplorer.png)
![The same panel with SampleProject loaded, its root node expanded over six yellow folders, each with a plus box for expanding it: ImportedTypeLibraries, Miscellaneous, Packages, References, Resources and Sources, the last of them selected.](Images/ProjectExplorer_Sample.png)

![A small yellow folder icon](Images/Folder.png) ImportedTypeLibraries  
![A small yellow folder icon](Images/Folder.png) Miscellaneous  
![A small yellow folder icon](Images/Folder.png) Packages  
![A small yellow folder icon](Images/Folder.png) References  
![A small yellow folder icon](Images/Folder.png) Resources  
![A small yellow folder icon](Images/Folder.png) Sources  

When a Project is open contextual icons will appear.

![The PROJECT EXPLORER title bar once a project is open, with four buttons at its right: a settings gear, a toggle file view icon of two overlapping documents, a plus for adding items, and the panel close button.](Images/ProjectExplorer_Header.png)

## ![](Images/Settings.png) Project Settings

- [Info](Settings)

## ![](Images/Toggle.png) Toggle file view (<kbd>CTRL</kbd> + <kbd>R</kbd>)


## ![](Images/Add.png) Add...

Same as Right-Click

## Right-Click - Add

![The Project Explorer context menu with its Add submenu open alongside it. The submenu runs from Add Folder through the Windows Form, MDI Form, UserControl, PropertyPage and Report entries, the CustomControls form, the .TWIN module and class, the .BAS module and .CLS class, Add Other File, Import, and three Add Resource lines. The menu behind it lists Cut, Copy, Paste, Copy Path, View As JSON, View As Markdown Preview, Rename, Export and Delete Permanently, with Cut, Copy, Paste and the two View As entries greyed out.](Images/RightClick-Add.png)

- ![](Images/Folder.png) Add Folder
- ![](Images/tB-Green.png) Add Windows Form
- ![](Images/tB-Green.png) Add Windows MDI Form
- ![](Images/tB-Green.png) Add Windows UserControl
- ![](Images/tB-Green.png) Add Windows PropertyPage
- ![](Images/tB-Green.png) Add Windows Report

---

- ![](Images/tB-Green.png) Add CustomControls Form

---

- ![](Images/tB-Red.png) Add Module (.TWIN supporting Unicode)
- ![](Images/tB-Red.png) Add Class (.TWIN supporting Unicode)

---

- ![](Images/tB-Blue.png) Add Module (.BAS)
- ![](Images/tB-Orange.png) Add Class (.CLS)

---

- ![](Images/File-Green.png) Add Other File

---

- ![](Images/File-Green.png) Import

---

- Add Resource: Visual Styles Manifest
- Add Resource: String Table
- Add Resource: MESSAGETABLE

## ![](Images/Folder.png) Folder
{: #folder }

## ![](Images/tB-Green.png) Windows Form
{: #windows-form }

[tbForm](Editor/Form)

## ![](Images/tB-Green.png) Windows MDI Form
{: #windows-mdi-form }

## ![](Images/UserControl.png) Windows UserControl
{: #windows-usercontrol }

## ![](Images/tB-Green.png) Windows PropertyPage
{: #windows-propertypage }

## ![](Images/tB-Green.png) Windows Report
{: #windows-report }

[tbReport](Editor/Report)

## ![](Images/tB-Green.png) CustomControls Forms
{: #customcontrols-forms }

![A twinBASIC message box headed Package needed: CustomControls, saying that a reference to the CustomControls package must be added to the project first and that the compiler will be restarted once it is, above an Add CustomControls package button and a Cancel button.](Images/RightClick-Add-CustomControlsForm-Popup.png)

## ![](Images/tB-Red.png) Module
{: #module }

## ![](Images/tB-Red.png) Class
{: #class }

## ![](Images/File-Green.png) Other File
{: #other-file }

## ![](Images/File-Green.png) Import
{: #import }

## Resource: Visual Styles Manifest

See ![A small yellow folder icon](Images/Folder.png) `/.../Resources/MANIFEST/#1.xml`

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

See ![A small yellow folder icon](Images/Folder.png) `/.../Resources/STRING/Strings.json`

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

See ![A small yellow folder icon](Images/Folder.png) `/.../Resources/MESSAGETABLE/Strings.json`

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
