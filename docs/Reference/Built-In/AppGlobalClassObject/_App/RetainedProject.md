---
title: RetainedProject
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/RetainedProject
has_toc: false
---
# RetainedProject
{: .no_toc }

Returns **True** if the project is retained in memory after all its externally-created objects have been released. Read-only.

Syntax: *object*.**RetainedProject**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**RetainedProject** reflects the **Retained In Memory** setting from the project's component properties. When **True**, the runtime does not unload the project when the last externally-created object goes out of scope; the project stays loaded until the application exits. When **False**, the runtime unloads the project as soon as no external object references remain.

This property is meaningful only for ActiveX EXE projects acting as out-of-process COM servers. For standard executables and DLLs it returns **False**.

> [!NOTE]
>
> **RetainedProject** is not yet implemented in twinBASIC. Reading the property always returns **False**.

### See Also

- [StartMode](StartMode) property
- [TaskVisible](TaskVisible) property
