---
title: GetShortcutTextByEnum
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetShortcutTextByEnum
---
# GetShortcutTextByEnum
{: .no_toc }

Returns the localised display text for a built-in keyboard shortcut, given its enumeration ID.

Syntax: **GetShortcutTextByEnum(** *ShortcutEnumId* **)** **As String**

*ShortcutEnumId*
: *required* **Long**. The numeric identifier of the shortcut, as used by the **Shortcut** property of menu and toolbar items.

The returned string is the user-facing label for the shortcut --- e.g. `"Ctrl+S"`, `"Ctrl+Shift+P"`, `"F5"` --- formatted in the system UI language. Returns an empty string for an unknown identifier.

### See Also

- [RuntimeCreateGetMessageHook](RuntimeCreateGetMessageHook) function
