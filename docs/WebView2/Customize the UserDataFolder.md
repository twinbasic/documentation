---
title: Customize the UserDataFolder 
parent: WebView2
nav_order: 2
permalink: /WebView2/Customize-UserDataFolder/
---

# Customize the UserDataFolder 

At runtime, WebView2 needs a working folder for storing data used during the session. &nbsp;By default, a folder will be created in the same folder as your executable file, called `<FileName>.WebView2` (e.g. `MyApp.Exe.WebView2`). &nbsp;If this folder cannot be created, the WebView2 control will not work (you can catch the controls Error event to determine this at runtime).

This default behaviour is not always appropriate. &nbsp;For example, if you're creating an Addin for Microsoft Access, then you almost certainly will not be allowed to create a folder called `MSACCESS.EXE.WebView2` in the Office sub folder of your systems Program Files folder.

It is HIGHLY recommended that you override the default behaviour, and instead provide a path that is considered to be safe to use for storing such data.  To override the UserDataFolder path at runtime, handle the Create event of the WebView2 control. &nbsp;See the example in `Sample 9.  ActiveX Control WebView2 + Monaco` here, where we use the `%APPDATA%\Local` system path:

<img src="https://twinbasic.com/images/wiki/tbWebView2CreateEvent.png" alt="Create Package" width="80%">
<br>
<br>

Set the `EnvironmentOptions.UserDataFolder` property to a string containing the output path to use (folder will be created if necessary).