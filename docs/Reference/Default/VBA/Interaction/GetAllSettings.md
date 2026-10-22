---
title: GetAllSettings
parent: Interaction Module
permalink: /tB/Modules/Interaction/GetAllSettings
redirect_from:
-  /tB/Core/GetAllSettings
vba_attribution: true
---
# GetAllSettings
{: .no_toc }

Returns every key and its value in a section of an application's entry in the Windows registry. <!-- or (on the Macintosh) information in the application's initialization file. -->

Syntax: **GetAllSettings(** *appname* **,** *section* **)**

*appname*
: *required* String expression containing the name of the application or project whose key settings are requested. <!-- On the Macintosh, this is the filename of the initialization file in the Preferences folder in the System folder. -->

*section*
: *required* String expression containing the name of the section whose key settings are requested.

Returns a **Variant** whose contents are a two-dimensional array of strings: each row holds one key and its value, in columns 0 and 1 respectively. **GetAllSettings** returns an uninitialized **Variant** if either *appname* or *section* does not exist.

The root of these registry settings is: `Computer\HKEY_CURRENT_USER\Software\VB and VBA Program Settings`.

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *appname* or *section* is a zero-length string |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *appname* or *section* is **Null** |

> [!NOTE] BETA 1010
> When *appname* or *section* is a zero-length string, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example first uses [**SaveSetting**](SaveSetting) to make entries in the Windows registry for the application, then uses **GetAllSettings** to display every key/value in a section, and finally uses [**DeleteSetting**](DeleteSetting) to remove the application's entries. Note that the *appname* and *section* names themselves are not retrieved.

```tb check_build
' Place some settings in the registry.
SaveSetting AppName := "MyApp", Section := "Startup", _
            Key := "Top", Setting := "75"
SaveSetting "MyApp", "Startup", "Left", "50"

' Retrieve them.
Dim MySettings As Variant, IntSettings As Long
MySettings = GetAllSettings(AppName := "MyApp", Section := "Startup")
For IntSettings = LBound(MySettings, 1) To UBound(MySettings, 1)
    Debug.Print MySettings(IntSettings, 0), MySettings(IntSettings, 1)
Next IntSettings

DeleteSetting "MyApp", "Startup"
```

### See Also

- [DeleteSetting](DeleteSetting) statement
- [GetSetting](GetSetting) function
- [SaveSetting](SaveSetting) statement
