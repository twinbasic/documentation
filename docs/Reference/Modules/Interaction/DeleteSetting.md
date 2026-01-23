---
title: DeleteSetting
parent: Interaction Module
permalink: /tB/Modules/Interaction/DeleteSetting
redirect_from:
-  /tB/Core/DeleteSetting
---
# DeleteSetting
{: .no_toc }

Deletes a section or key setting from an application's entry in the Windows registry. <!-- or (on MacOS or Linux) information in the application's configuration file. -->

Syntax: **DeleteSetting** *appname*, *section*, [ *key* ]

*appname*

: The name of the application or project whose registry settings are to be deleted. <!-- On the Macintosh, this is the filename of the initialization file in the Preferences folder in the System folder. -->

*section*

: *optional* The name of the section within the *appname* entry. If omitted, the entire *appname* section, including all keys within, is deleted.

*key*

: *optional* The name of the key to delete within the specified *section*. If omitted, the entire **section** and all keys within are deleted.

A run-time error occurs if you attempt to use the **DeleteSetting** statement on a non-existent *appname*, *section* or *key*.

The root of these registry settings is: `Computer\HKEY_CURRENT_USER\Software\VB and VBA Program Settings`.

## Example

The following example first uses the [**SaveSetting**](SaveSetting) statement to make entries in the Windows registry for the application, and then uses the **DeleteSetting** statement to remove them. Because no *key* argument is specified, the whole section is deleted, including the section name and all its keys.

```vb
' Place some settings in the registry. 
SaveSetting appname := "MyApp", section := "Startup", _ 
 key := "Top", setting := 75 
SaveSetting "MyApp", "Startup", "Left", 50 
' Remove section and all its settings from registry. 
DeleteSetting "MyApp", "Startup"
```

{% include VBA-Attribution.md %}