---
title: NonModalAllowed
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/NonModalAllowed
has_toc: false
---
# NonModalAllowed
{: .no_toc }

Returns **True** if the application is permitted to display non-modal forms, or **False** if non-modal forms are not allowed. Read-only.

Syntax: *object*.**NonModalAllowed**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

In VB6, **NonModalAllowed** returns **False** when the application is running as an ActiveX server in unattended mode, where displaying a non-modal form would be inappropriate. In all other execution contexts it returns **True**. Code that creates non-modal forms should check this property before calling `Show 0`, and fall back to a modal form or skip the display entirely when the property is **False**.

> [!NOTE]
>
> **NonModalAllowed** is not yet implemented in twinBASIC. Reading the property always returns **False**.

### See Also

- [UnattendedApp](UnattendedApp) property
- [StartMode](StartMode) property
