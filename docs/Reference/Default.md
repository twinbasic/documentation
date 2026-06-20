---
title: Default Packages
parent: Packages
nav_order: 1
permalink: /tB/Packages/Default/
has_toc: false
---

# Default Packages

These packages are included in every twinBASIC project by default. While they are included by default, the user always has the option of un-referencing them. E.g. a command-line application may not need the [VB Package](../VB/).

- [VB Package](../VB/) -- standard controls (**CheckBox**, **CommandButton**, **TextBox**, …), forms, and the application-level singletons (**App**, **Screen**, **Clipboard**, **Printer**, …)
- [VBA Package](../VBA) -- the standard runtime library -- **MsgBox**, **CStr**, **Mid**, **Format**, … grouped into modules, plus the **Collection** and **Err** intrinsics and twinBASIC's runtime expression engine
- [VBRUN Package](../VBRUN/) -- runtime-only types -- ambient properties, asynchronous-read state, structured error context, the **PropertyBag**, the clipboard / drag-and-drop container, and the enumerations used by classic VB6 forms and controls
