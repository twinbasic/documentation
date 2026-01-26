---
title: GetSetting
parent: Interaction Module
permalink: /tB/Modules/Interaction/GetSetting
redirect_from:
-  /tB/Core/GetSetting
---

# GetSetting
{: .no_toc }

Returns a string key setting value from an application's entry in the Windows registry. <!-- or (on the Macintosh) information in the application's initialization file. -->

Syntax: **GetSetting(** *appname* **,** *section* **,** *key* [ **,** *default* ] **)**

*appname* 

: String expression containing the name of the application or project whose key setting is requested. <!-- On the Macintosh, this is the filename of the initialization file in the Preferences folder in the System folder.-->

*section*

:  String expression containing the name of the ection where the key setting is found.

*key*

:  String expression containing the name of the key setting to return.

*default*

: *optional* Variant expression containing the value to return if no value is set in the key setting. If omitted, *default* is assumed to be a zero-length string ("").

If any of the items named in the **GetSetting** arguments don't exist, **GetSetting** returns the value of *default*.

The root of these registry settings is: `Computer\HKEY_CURRENT_USER\Software\VB and VBA Program Settings`.

### Example

This example first uses the [**SaveSetting**](SaveSetting) statement to make entries in the Windows registry for the application specified as *appname*, and then uses the **GetSetting** function to display one of the settings. Because the *default* argument is specified, some value is guaranteed to be returned. Note that *section* names can't be retrieved with **GetSetting**. Finally, the [**DeleteSetting**](DeleteSetting) statement removes all the application's entries.

```vb
' Variant to hold 2-dimensional array returned by GetSetting.
Dim MySettings As Variant
' Place some settings in the registry.
SaveSetting "MyApp","Startup", "Top", 75
SaveSetting "MyApp","Startup", "Left", 50

Debug.Print GetSetting(appname := "MyApp", section := "Startup", _
                       key := "Left", default := "25")

DeleteSetting "MyApp", "Startup"
```
{% include VBA-Attribution.md %}