---
title: Registration Options
parent: Project Configuration
nav_order: 3
---

# Registration Options

## Registration Location

Register ActiveX builds to `HKEY_LOCAL_MACHINE` or `HKEY_CURRENT_USER` option. While modern applications use `HKEY_CURRENT_USER`, for VBx compatibility components must be registered to `HKEY_LOCAL_MACHINE`. Note that this requires running as admin when registering.

## Build-Time Registration

Registration at build time is optional. tB provides the Project: Register DLL after build option so you can disable automatic registration, if for example you wanted to move the file first.
