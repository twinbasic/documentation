---
title: UnattendedApp
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/UnattendedApp
has_toc: false
---
# UnattendedApp
{: .no_toc }

Returns **True** if the application is running in unattended mode, where no user-interface interaction is expected. Read-only.

Syntax: *object*.**UnattendedApp**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

In VB6, **UnattendedApp** returns **True** when the project was compiled as an unattended ActiveX server---one that is configured to run without any visible windows or interactive dialogs. In that mode the application must not display message boxes or modal forms; any attempt to do so either fails silently or raises an error. Code that might otherwise present a dialog should check this property first and substitute a non-interactive path---writing to a log, raising an error, or returning a default value---when the property is **True**.

> [!NOTE]
>
> **UnattendedApp** is not yet implemented in twinBASIC. Reading the property always returns **False**.

### See Also

- [NonModalAllowed](NonModalAllowed) property
- [StartMode](StartMode) property
- [TaskVisible](TaskVisible) property
