---
title: UIDead
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/UIDead
---
# UIDead
{: .no_toc }

Returns whether the user interface is currently non-responsive, as a **Boolean**. Read-only.

Syntax: *object*.**UIDead**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

The host sets **UIDead** to **True** when the application is in a state where it cannot meaningfully respond to user input --- most commonly while execution is paused inside the debugger, but also during long modal operations. While **UIDead** is **True** a control should suppress animations, hover effects, and any input it would otherwise process, since the host's main thread cannot deliver a useful follow-up.

### See Also

- [UserMode](UserMode) property
