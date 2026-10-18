---
title: ActiveX Registration
parent: Project Configuration
nav_order: 3
permalink: /Features/Project-Configuration/ActiveX-Registration
index:
  - register a COM dll
  - register COM dll
  - register a dll
  - register dll
---

# ActiveX Registration Options

## Registration Location

Register ActiveX builds to `HKEY_LOCAL_MACHINE` or `HKEY_CURRENT_USER` option. While modern applications use `HKEY_CURRENT_USER`, for VBx compatibility components must be registered to `HKEY_LOCAL_MACHINE`. Note that this requires running as admin when registering.

## Build-Time Registration

Registration at build time is optional. The *Register DLL after build* setting in [Project Settings](../../tB/IDE/Project-Settings#register-dll-after-build) lets you disable automatic registration, if for example you wanted to move the file first.

[ActiveX registration](../../tB/IDE/Building/ActiveX-Registration) describes what the IDE shows when a build registers a DLL, the warning for a project that registers to `HKEY_LOCAL_MACHINE`, and what **Clean** removes.
