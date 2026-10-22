---
title: DeleteSetting
parent: Interaction Module
permalink: /tB/Modules/Interaction/DeleteSetting
redirect_from:
-  /tB/Core/DeleteSetting
vba_attribution: true
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


The root of these registry settings is: `Computer\HKEY_CURRENT_USER\Software\VB and VBA Program Settings`.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
## Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | the application, section or key named does not exist, or *appname* or *section* is a zero-length string |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | an argument is **Null** |

> [!NOTE] BETA 1010
> When the application, section or key named does not exist, or *appname* or *section* is a zero-length string, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

## Example

The following example first uses the [**SaveSetting**](SaveSetting) statement to make entries in the Windows registry for the application, and then uses the **DeleteSetting** statement to remove them. Because no *key* argument is specified, the whole section is deleted, including the section name and all its keys.

```tb check_build
' Place some settings in the registry. 
SaveSetting appname := "MyApp", section := "Startup", _ 
 key := "Top", setting := 75 
SaveSetting "MyApp", "Startup", "Left", 50 
' Remove section and all its settings from registry. 
DeleteSetting "MyApp", "Startup"
```