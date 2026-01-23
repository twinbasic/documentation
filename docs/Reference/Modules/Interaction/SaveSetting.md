---
title: SaveSetting
parent: Interaction Module
permalink: /tB/Modules/Interaction/SaveSetting
redirect_from:
-  /tB/Core/SaveSetting
---

# SaveSetting
{: .no-toc }

Saves or creates an application entry in the application's entry in the Windows registry. <!-- or (on the Macintosh) information in the application's initialization file. -->

Syntax: **SaveSetting** *appname*, *section*, *key*, *setting*

*appname*

: String expression containing the name of the application or project to which the setting applies. On the Macintosh, this is the filename of the initialization file in the Preferences folder in the System folder.

*section*

: String expression containing the name of the section where the key setting is being saved.

*key*

: String expression containing the name of the key setting being saved.

*setting*

: String expression containing the value that key is being set to.

An error occurs if the key setting can't be saved for any reason.

The root of these registry settings is: `Computer\HKEY_CURRENT_USER\Software\VB and VBA Program Settings`.

### Example

The following example first uses the **SaveSetting** statement to make entries in the Windows registry for the application, and then uses the [**DeleteSetting**](DeleteSetting) statement to remove them.

```vb
' Place some settings in the registry. 
SaveSetting appname := "MyApp", section := "Startup", _ 
 key := "Top", setting := 75 
SaveSetting "MyApp","Startup", "Left", 50 
' Remove section and all its settings from registry. 
DeleteSetting "MyApp", "Startup" 
```

{% include VBA-Attribution.md %}
