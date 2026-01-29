---
title: Unicode Support
parent: Standard Library
nav_order: 1
---

# Unicode Support

twinBASIC provides full Unicode support throughout the language and runtime.

## Native Unicode Functions

Native functions that take string arguments, such as `MsgBox` and FileSystem functions (e.g. `Open`, `Dir`, `Mkdir`, `Kill`, and `RmDir`) now support Unicode. Additionally, .twin files make this easy to use as the editor supports Unicode as well. So you can paste a Unicode string in the editor, see it appear correctly, then have the same string correctly displayed by tB functions and controls.

## Unicode in Controls

All tB-implemented controls support Unicode, both in the code editor and when displayed.

> [!IMPORTANT]
> If you subclass controls, note that this means you will receive the Unicode (W) version of window messages, e.g. ListViews will send `LVN_GETDISPINFOW (LVN_FIRST - 77)` instead of `LVN_GETDISPINFOA (LVN_FIRST - 50)`.

## String Conversion

`StrConv()` now has `vbUTF8` / `vbFromUTF8` options for UTF-8 string conversion.
