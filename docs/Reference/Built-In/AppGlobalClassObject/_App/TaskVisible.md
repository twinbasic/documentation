---
title: TaskVisible
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/TaskVisible
has_toc: false
---
# TaskVisible
{: .no_toc }

Gets or sets whether the application appears in the Windows taskbar and the task list.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **Boolean** indicating whether the application is visible in the Windows taskbar and task list.

Syntax: *object*.**TaskVisible**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets whether the application appears in the Windows taskbar and task list.

Syntax: *object*.**TaskVisible** **=** *value*

*value*
: A **Boolean**. **True** to show the application in the taskbar and task list; **False** to hide it.

In VB6, setting **TaskVisible** to **False** hides the application from the Windows taskbar and the Alt+Tab task list. This is typically used for out-of-process ActiveX EXE servers that run in the background without a user interface. A server that presents no windows of its own should set **TaskVisible** to **False** so that it does not appear as an idle entry in the taskbar.

### See Also

- [StartMode](StartMode) property
- [UnattendedApp](UnattendedApp) property
- [RetainedProject](RetainedProject) property
