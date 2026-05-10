---
title: GetInheritedOwner
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetInheritedOwner
---
# GetInheritedOwner
{: .no_toc }

Returns the inherited owner object of a control.

Syntax: **GetInheritedOwner(** *Value* **)** **As Object**

*Value*
: *required* **Object**. The control whose inherited owner is wanted.

For controls that participate in a control-container hierarchy, the inherited owner is the topmost owning object that supplies ambient settings — typically the form. Returns **Nothing** when no inherited owner is set.

