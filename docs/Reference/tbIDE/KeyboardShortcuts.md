---
title: KeyboardShortcuts
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/KeyboardShortcuts
has_toc: false
---

# KeyboardShortcuts class
{: .no_toc }

The IDE's keyboard-shortcut registry — reached through [**Host.KeyboardShortcuts**](Host#keyboardshortcuts). Call [**Add**](#add) to bind a key combination to a callback. There is no removal API; the registration is released when the addin is unloaded.

```tb
Private Sub Host_OnProjectLoaded()
    Host.KeyboardShortcuts.Add "{CTRL}{SHIFT}d", AddressOf ToggleDebugMode
End Sub

Private Sub ToggleDebugMode()
    debugMode = Not debugMode
    Host.DebugConsole.PrintText "Debug mode " & If(debugMode, "ON", "OFF")
End Sub
```

The shortcut is global to the IDE and fires regardless of which pane has focus, as long as the IDE itself has the OS-level focus. The callback runs on the IDE's UI thread.

## Methods

### Add
{: .no_toc }

Registers a new keyboard shortcut.

Syntax: *keyboardShortcuts*.**Add** *keyString*, *Callback*

*keyString*
: *required* The key combination, as a **String**. The literal key character is preceded by zero or more modifier prefixes from the set `{CTRL}`, `{SHIFT}`, `{ALT}`. The prefixes are case-insensitive; the trailing key character matches the same key the user would press.

  | Example         | Combination               |
  |-----------------|---------------------------|
  | `"{CTRL}d"`     | Ctrl + D                  |
  | `"{CTRL}{SHIFT}d"` | Ctrl + Shift + D       |
  | `"{ALT}f"`      | Alt + F                   |
  | `"f1"`          | F1 (no modifier)          |

*Callback*
: *required* The callback. Pass `AddressOf` a sub of signature `Sub()` (no arguments). **LongPtr**.

The callback runs on the IDE's UI thread. Long-running work inside the callback will block the IDE until it returns — keep the callback short and offload heavy work to a background mechanism when needed.
