---
title: VBRUN Package
parent: Packages
grand_parent: Reference Section
nav_order: 3
permalink: /tB/Packages/VBRUN/
has_toc: false
---

# VBRUN Package

The VBRUN built-in package collects twinBASIC's runtime-only types: the ambient, asynchronous, and error-handling objects the runtime hands to controls and event handlers; the collection wrappers it exposes on **UserControl** and on data-source classes; the clipboard / OLE drag-and-drop container; the **PropertyBag** persistence helper used by **UserControl** save and load; and the enumerations that classic VB6 forms, intrinsic controls, and runtime services use to spell out their option values.

## Classes

- [AmbientProperties](AmbientProperties) -- read-only object describing the host container's appearance, locale, and design / run-time mode for an embedded control
- [AsyncProperty](AsyncProperty) -- event-argument object that identifies an asynchronous **UserControl.AsyncRead** request and carries the resulting value
- [ContainedControls](ContainedControls) -- read-only collection of the controls a consumer placed inside a control-container **UserControl**
- [DataMembers](DataMembers) -- collection of named data-source members advertised at design time to data-binding consumers
- [DataObject](DataObject) -- clipboard / OLE drag-and-drop container that holds one payload in multiple clipboard formats
- [ErrorCallstack](ErrorCallstack) -- snapshot of the call stack at the moment a run-time error was raised, exposed as a sequence of [**ErrorStackFrame**](ErrorStackFrame) items
- [ErrorContext](ErrorContext) -- structured error object — number, description, source, help, OS error, state, and call stack
- [ErrorStackFrame](ErrorStackFrame) -- single procedure on an [**ErrorCallstack**](ErrorCallstack) — its project, module, and procedure names
- [Hyperlink](Hyperlink) -- runtime hand-off for browser-style navigation; controls call **UserControl.Hyperlink.NavigateTo** to ask the host to load a target
- [ParentControls](ParentControls) -- collection of the **UserControl**'s siblings in its container, optionally wrapped in their host **Extender**
- [PropertyBag](PropertyBag) -- creatable key / value store for persisting an object's state — used by **UserControl** save / load and serialisable as a single byte array

## Modules

- [Constants](Constants) -- enumerations used by classic VB6 forms, intrinsic controls, and runtime services — colours, mouse pointers, key codes, drag/drop states, OLE container behaviour, printer setup values, …
