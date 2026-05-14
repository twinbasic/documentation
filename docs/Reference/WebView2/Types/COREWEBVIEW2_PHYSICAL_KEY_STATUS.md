---
title: COREWEBVIEW2_PHYSICAL_KEY_STATUS
parent: Types
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS
---
# COREWEBVIEW2_PHYSICAL_KEY_STATUS
{: .no_toc }

The bit-fields the Win32 `WM_KEYDOWN` / `WM_KEYUP` message family packs into its `lParam`, decoded into a record. The control reads the runtime's `COREWEBVIEW2_PHYSICAL_KEY_STATUS` structure on each accelerator keystroke and distributes it across individual arguments of the [**AcceleratorKeyPressed**](../WebView2/#acceleratorkeypressed) event — application code does not normally create instances of this type directly.

```tb
Public Type COREWEBVIEW2_PHYSICAL_KEY_STATUS
    RepeatCount As Long
    ScanCode As Long
    IsExtendedKey As Long
    IsMenuKeyDown As Long
    WasKeyDown As Long
    IsKeyReleased As Long
End Type
```

## Members

*RepeatCount*
: How many times the keystroke is auto-repeated as the message is held in the queue.

*ScanCode*
: The hardware scan code of the pressed key.

*IsExtendedKey*
: Non-zero when the key is one of the *extended* keys — right-hand **Alt** / **Ctrl**, the arrow / **Home** / **End** / **Page Up** / **Page Down** / **Insert** / **Delete** block, **NumLock**, and the numeric-keypad **Enter** and **/**.

*IsMenuKeyDown*
: Non-zero when **Alt** was held while the message was generated.

*WasKeyDown*
: Non-zero when the key was already down before this message — distinguishes the initial keystroke from subsequent auto-repeats.

*IsKeyReleased*
: Non-zero on the transition message reporting the key going up; zero on key-down messages.

### See Also

- [AcceleratorKeyPressed](../WebView2/#acceleratorkeypressed)
- [wv2KeyEventKind](../Enumerations/wv2KeyEventKind)
