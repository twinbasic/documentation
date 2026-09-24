---
title: KeyboardShortcuts
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/KeyboardShortcuts
has_toc: false
---

# KeyboardShortcuts class
{: .no_toc }

The IDE's keyboard-shortcut registry --- reached through [**Host.KeyboardShortcuts**](Host#keyboardshortcuts). Call [**Add**](#add) to bind a key combination to a callback. There is no removal API; the registration is released when the addin is unloaded.

```tb hidden
' Context for the sample below: the flag the addin toggles, which belongs to the
' addin rather than to the IDE API.
Public debugMode As Boolean
```

```tb check_build
Private Sub Host_OnProjectLoaded()
    Host.KeyboardShortcuts.Add "{SHIFT}F12", AddressOf ToggleDebugMode
End Sub

Private Sub ToggleDebugMode()
    debugMode = Not debugMode
    Host.DebugConsole.PrintText "Debug mode " & If(debugMode, "ON", "OFF")
End Sub
```

The shortcut fires when the key is released, wherever the focus is in the IDE's window --- in the code editor, in the DEBUG CONSOLE, or on nothing at all --- except while a dialog or the rename box is open. If the IDE has a command of its own on the same key, that command runs as well: F1, for one, also expands or collapses the signature help while it is showing. Shift+F12 has no command in the IDE's default keymap.

> [!NOTE]
> In BETA 983, a shortcut that includes `{CTRL}` or `{ALT}` does not fire when the user presses it. The IDE matches an add-in's shortcut when the key is released, against a press of the same key less than half a second earlier, and it does not record a key pressed while Ctrl or Alt is held down. Such a shortcut fires only if the same key was also pressed on its own within that half second. Use a function key, alone or with `{SHIFT}`.

## Methods

### Add
{: .no_toc }

Registers a new keyboard shortcut.

Syntax: *keyboardShortcuts*.**Add** *keyString*, *Callback*

*keyString*
: *required* A **String** naming the key, after any of the prefixes `{CTRL}`, `{SHIFT}` and `{ALT}`. The prefixes must come in that order: the IDE builds the string it compares in that order, so `"{SHIFT}{CTRL}d"` never matches. **Add** converts the string to lower case and removes its spaces, so `"{SHIFT}F12"` and `"{shift} f12"` are the same shortcut. A letter names the key that types it on a US keyboard, whatever the active layout. Any other key is named as the browser names it --- `f1`, `enter`, `escape` --- and a key pressed with Shift by the character it types, so Shift+1 is `"{SHIFT}!"` on a US layout.

  | Example            | Combination       | Fires in BETA 983 |
  |--------------------|-------------------|-------------------|
  | `"f1"`             | F1                | yes               |
  | `"{SHIFT}F12"`     | Shift + F12       | yes               |
  | `"{SHIFT}d"`       | Shift + D         | yes               |
  | `"d"`              | D                 | yes, and also each time a *d* is typed |
  | `"{CTRL}d"`        | Ctrl + D          | no --- see the note above |
  | `"{CTRL}{SHIFT}d"` | Ctrl + Shift + D  | no                |
  | `"{ALT}f"`         | Alt + F           | no                |

*Callback*
: *required* The callback. Pass `AddressOf` a sub of signature `Sub()` (no arguments). **LongPtr**.

A shortcut on a key that types a character fires each time that character is typed, in the code editor as anywhere else, and the character is typed as well. That rules out plain letters for most add-ins; a function key does not have the problem.

The callback runs inside the compiler's process, as all of an add-in's code does.
