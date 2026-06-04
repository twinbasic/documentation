---
title: StartMode
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/StartMode
has_toc: false
---
# StartMode
{: .no_toc }

Returns an **Integer** indicating how the application was started. Read-only.

Syntax: *object*.**StartMode**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

In VB6, **StartMode** returns `0` (**vbSModeStandalone**) when the application was launched as a standalone executable, or `1` (**vbSModeAutomation**) when it was started as an ActiveX Automation server by an external client. Code in ActiveX DLL or EXE projects uses this value to determine whether a visible user interface should be shown.

> [!NOTE]
>
> **StartMode** is not yet implemented in twinBASIC. Reading the property always returns `0`.

### See Also

- [UnattendedApp](UnattendedApp) property
- [NonModalAllowed](NonModalAllowed) property
- [TaskVisible](TaskVisible) property
